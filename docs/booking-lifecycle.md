# Booking Lifecycle: Contact → Booking → Event

Linear: **Booking becomes calendar truth** → *Define canonical lifecycle from contact to booking to event*

This doc defines the intended end-to-end lifecycle from first contact through a
confirmed booking through calendar-visible event/Backstage coordination. It
extends [`booking-and-messaging-architecture.md`](./booking-and-messaging-architecture.md),
which covers `contact_threads` vs. `private_chat_threads` vs. legacy
`booking_inquiries` but predates the Events/Backstage system and does not
address the calendar gap. This doc is the source of truth for the
booking↔event relationship; the older doc remains the source of truth for
messaging/thread semantics.

It documents intended behavior, not current behavior. Section 6 calls out
exactly where today's code diverges.

## 1. The stages

| # | Stage | Table(s) | Who moves it | Visible in |
|---|---|---|---|---|
| 0 | Discovery | `venues`, `events` (public listings) | anyone (signed out OK) | Venue Directory, Events page, **venue profile page + its booking calendar** |
| 1 | First contact | `contact_threads` (`pending`) | either side, via `request_contact` (optionally seeded with a date picked on the venue's own booking calendar — see below) | Inbox |
| 2 | Conversation open | `contact_threads` (`accepted`) | other side accepts | Inbox |
| 3 | Negotiation | `contact_threads.working_date` | either side, via `set_contact_thread_working_date` (or set at stage 1, see below) | Inbox (thread header) |
| 4 | **Confirmed booking** | `bookings` (`confirmed`), `venue_booking_dates` | venue only, via `confirm_contact_booking` | Inbox (system message) |
| 5 | **Event exists** *(proposed, not yet automatic — see §6)* | `events`, `event_artist_memberships` (`accepted`) | system, triggered by stage 4 | **Calendar**, Backstage |
| 6 | Lineup coordination | `event_artist_memberships`, `backstage_messages` | venue + accepted artists | Backstage |
| 7 | Change / cancel | `bookings` (`cancellation_requested`/`cancelled`), `event_artist_memberships` | artist requests, venue resolves | Inbox, Calendar, Backstage |

Stages 0–3 are relationship/negotiation and already work as intended per the
messaging doc. Stages 4–7 are this initiative's focus.

### Two entry paths, one destination

There are two independent ways a booking can start:

- **Inbox path — starts on the venue's own profile page.** This is the
  primary on-ramp, not a secondary one: a venue's public page
  (`/venues/[slug]`) renders a live **booking calendar**
  (`PublicVenueBookingPanel` → `VenueAvailabilityCalendar`) built directly
  from `venue_booking_dates` + `bookings`, showing real fill status per date
  (open / partially filled / capped). An artist picks a date on that
  calendar, which becomes `selectedDate` and is passed straight into the
  "Request contact" form on the same page. Submitting calls `requestContact`
  → the `request_contact` RPC with `p_show_date` set — which writes
  `contact_threads.working_date` **at thread creation**, not later. So for
  this path, stage 1 (first contact) and stage 3 (negotiation/working date)
  are already fused in the UX: the artist commits to a specific date before
  the first message even sends. (A thread can still be started with no date
  attached — `p_show_date` is optional — in which case working date is set
  later via `set_contact_thread_working_date`, the stage-3 path.) From there:
  thread → venue confirms → `bookings` row.
- **Events path**: venue posts an open `events` listing → artist applies →
  venue accepts the `event_artist_memberships` row directly. No
  `contact_threads`/`bookings` row is involved at all today.

**Important asymmetry this surfaces:** the venue profile page's booking
calendar already reads live `bookings` data directly, so it is *not*
affected by the "calendar truth" gap described in §2 — it already reflects
confirmed bookings correctly today. The gap is specific to the *internal*
`/dashboard/calendar`, which reads only `events` + `band_show_dates` and
never `bookings`. Don't "fix" the public venue calendar as part of this
initiative; it isn't broken. The two calendars reading two different sources
of truth for the same underlying fact is itself worth noting as a
pre-existing inconsistency, but the fix path in §2 (guarantee `events`
exists) resolves it by making `events` catch up to what the public calendar
already shows, without touching the public calendar's query.

Both paths are legitimate and should stay — a venue that already knows who
they want doesn't need to post an open call, and a venue with an open slot
shouldn't have to pre-negotiate 1:1 with every applicant. But they currently
produce **different shapes of data** (one produces a `bookings` row with no
`events` row; the other produces an `events`/`event_artist_memberships` row
with no `bookings` row). The canonical model below treats both as valid
front doors into the same back-of-house representation: every act playing a
venue on a given date should end up as an `event_artist_memberships` row on
one `events` row for that date, regardless of which door they came in.

## 2. Canonical source of truth

Per venue+date, three questions need one unambiguous answer each:

- **"Are we booked?"** → `bookings.status` (per band, the relationship
  ledger — confirmed / cancellation_requested / cancelled). This is the
  legal/financial record: it's what a band or venue points to as proof a
  booking exists, and it's what cancellation flows operate on.
- **"What's showing at this venue on this date, and who's on the bill?"**
  → `events` + `event_artist_memberships`. This is the calendar-facing,
  logistics-bearing record. **The internal `/dashboard/calendar` reads only
  from `events`, never from `bookings`, and that should stay true** — do not
  add a second calendar code path there that also reads `bookings`. Fix the
  gap by guaranteeing an `events` row always exists once stage 4 happens, not
  by teaching that calendar a second source of truth. (The public venue
  profile page's booking calendar is a separate surface that already reads
  `bookings` directly today and is out of scope for this change — see the
  entry-paths section above.)
- **"Are these two parties talking, and what did they say?"** →
  `contact_threads`/`contact_messages`, per the messaging doc. Unaffected by
  this initiative.

One `events` row per `(venue_id, event_date)` is the unit the calendar
renders. `event_artist_memberships` is the join between a booked band and
that row. A confirmed `bookings` row and its corresponding
`event_artist_memberships` row are two views of the same fact (this band is
playing this venue on this date) and must be created/cancelled together.

**Recommendation:** add `bookings.event_id` (nullable uuid FK to `events`,
backfilled for existing rows, set atomically inside `confirm_contact_booking`
going forward). This makes the link explicit and queryable instead of
inferring it by joining on `(venue_id, show_date)`, and gives the Inbox
thread UI a direct id to link to Backstage (§5).

## 3. Duplicate prevention

The one-time backfill migration
(`20260522172524_backfill_confirmed_bookings_to_events.sql`) already solved
this once: it keys generated events on
`migrated_booking_group_key = 'venue_booking_date:' || venue_booking_date_id`,
a unique column, so re-running the backfill can't double-create.

The ongoing (non-one-time) version of this logic should reuse the same
shape: before creating an `events` row for a newly-confirmed booking, look
up an existing `events` row for that `venue_booking_date_id` first (whether
it was migrated, auto-created by an earlier booking on the same bill, or
created directly through the Events path) and attach a new
`event_artist_memberships` row to it instead of creating a second `events`
row for the same date. `venue_booking_dates` already enforces one row per
`(venue_id, show_date)` — that's the natural dedupe key; `events` needs an
equivalent guarantee (today it only has the one-time-backfill-specific
`migrated_booking_group_key`, which isn't meant for ongoing use as a
lookup key). Concretely: add a nullable `events.venue_booking_date_id`
(unique, FK) as the ongoing version of that same idea.

## 4. Confirming a booking should produce an event — schema gap

`confirm_contact_booking` today only collects `show_date`, `bill_cap`, and a
close-bill flag (see `InboxThreadActions.tsx` confirm modal). But `events`
has several `NOT NULL` columns the Inbox flow never asks for:
`title`, `slug`, `start_time`, `artist_need_description`, `description`,
`attendee_capacity`, `needed_artist_count`.

The backfill migration already established a precedent for synthesizing all
of these from what's available (venue name, date, `venue.capacity`, bill
cap) — e.g. `title = 'Show at ' || venue.name || ' - ' || date`,
`start_time = 20:00` as a placeholder, `description` = a generic
"needs review" string. **Recommendation:** reuse that exact pattern for
auto-created events going forward (same defaults, same placeholder
language), and treat the resulting event as needing venue follow-up — surface
a "logistics not filled in yet" indicator on the event/Backstage view so the
venue knows to edit start time, capacity, etc. This avoids blocking the
confirm-booking flow behind a bigger form, at the cost of an event that's
technically real but sparse until the venue tidies it up. Flagging this as a
product decision, not something to silently decide in code — the alternative
is asking the venue for start time + capacity at confirm time, which adds a
step to the flow this initiative is trying to streamline.

## 5. Cross-linking in the UI

Once §2–4 hold, each surface should link to its neighbors:

- **Inbox thread** (`InboxThreadActions.tsx`): after confirmation, show a
  "View on Calendar" / "Open Backstage" link using `bookings.event_id`.
- **Backstage** (`backstage/[eventId]`): show a link back to the
  originating `contact_threads` thread for each `event_artist_memberships`
  row that has a linked booking, so a venue mid-logistics conversation can
  jump back to the original negotiation without hunting the Inbox.
- **Calendar**: an event created from a confirmed booking should be visually
  distinguishable from one created directly via the Events/open-call path
  (at minimum, until it has real logistics filled in) — this is what makes
  the auto-creation legible rather than mysterious.

## 6. Sync rules for changes after confirmation (scope: "sync date changes, cancellations, and reschedules")

Today there is no "change the date of a confirmed booking" operation at
all — only cancel-and-restart. Before this can be built, decide whether
reschedule is:

- (a) a genuinely new operation (new RPC, moves `bookings.show_date` and the
  linked `event_artist_memberships`/`events.event_date` together in one
  transaction), or
- (b) modeled as cancel + new booking, which is simpler but loses the
  through-line in the thread/event history and would need the "confirmed
  again" UI to make clear it's the same relationship continuing.

Recommend (a) for a real "reschedule" affordance, since (b) actively fights
the goal of this initiative (booking and event must stay trustworthy and in
sync, and silently modeling a reschedule as two unrelated events undermines
that).

Cancellation already has a two-step flow (`request_booking_cancellation` →
`resolve_booking_cancellation` / `cancel_confirmed_booking`). Whichever RPC
ultimately marks a `bookings` row `cancelled` must, in the same transaction:

- transition the matching `event_artist_memberships` row to `removed` (with
  a system-generated `removal_note` referencing the cancellation), and
- **not** delete or cancel the `events` row itself if other bands are still
  on the bill — only when the cancelled booking was the last active
  membership should the event itself be reconsidered (mark `cancelled`, or
  leave it and let the venue decide — needs a product call, not a technical
  one).

## 7. Instrumentation (scope item)

Because booking confirmation and event creation must be atomic (§2), the
main failure mode to instrument is a `confirm_contact_booking` transaction
that fails partway — e.g. the `events` insert violates a NOT NULL/unique
constraint after the `bookings` insert already succeeded (or vice versa).
Doing both inserts inside the same `security definer` function/transaction
(as `confirm_contact_booking` already does for `bookings` +
`venue_booking_dates`) avoids ever landing in a state where a `bookings` row
exists with no `events`/`event_artist_memberships` counterpart. Any
remaining failure at that point aborts the whole transaction and surfaces as
a normal error to the venue (no booking, no event) rather than a silent
half-state — which is itself the instrumentation: alert on
`confirm_contact_booking` exceptions, since after this change a failure
there should be rare and always worth looking at.

## 8. Explicitly out of scope for this lifecycle (per the initiative)

Discovery/recommendation features, monetization, broader dashboard redesign,
mobile — none of those affect the state machine above and aren't addressed
here.

## 9. Open decisions needing sign-off before implementation

1. §4 — accept sparse auto-generated event details (with a "needs review"
   indicator), or add fields to the confirm-booking modal?
2. §6 — build a real reschedule operation, or accept cancel+recreate?
3. §6 — when the last band cancels off an event, auto-cancel the event or
   leave it for the venue to decide?
4. §2 — add `bookings.event_id` and `events.venue_booking_date_id` as
   described, or infer the link by query instead of storing it? (Recommend
   storing it — it's what makes §5's cross-linking cheap and reliable.)
