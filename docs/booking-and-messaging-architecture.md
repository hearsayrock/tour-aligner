# Booking And Messaging Architecture

This note is the current source of truth for how TourAligner should think about inquiries, conversations, and eventual bookings.

It exists because the app currently has two overlapping concepts:

- `booking_inquiries`
- `contact_threads` / `contact_messages`

Those concepts are related, but they are not the same thing.

## Short Version

- `contact_threads` are the communication channel between one band and one venue.
- `contact_messages` are the messages inside that channel.
- `booking_inquiries` are the structured booking objects tied to dates, status, and eventual booking intent.

The app is currently messaging-first in the UI, but booking still needs a stronger structured lifecycle.

## Current State

### Messaging layer

The inbox system is powered by:

- `contact_threads`
- `contact_messages`
- Supabase RPC functions like `request_contact`, `respond_to_contact_request`, `send_contact_message`, and `mark_contact_thread_read`

This layer currently handles:

- first contact
- accept / decline / block behavior
- ongoing conversation
- unread/read tracking
- realtime inbox refresh

This is the app's main day-to-day workflow today.

### Structured booking layer

`booking_inquiries` still exists and is not purely dead code.

It currently stores things like:

- `band_id`
- `venue_id`
- `requested_date`
- `message`
- `expected_draw`
- `status`
- `response_message`

This is closer to a real booking object than a freeform thread, but it is not yet the app's primary UX.

### Why the model feels blurry

The product evolved from inquiry-based outreach toward a richer inbox system. That means:

- some legacy flows still read from `booking_inquiries`
- the inbox is where real interaction now happens
- there is still no final confirmed booking state

So today the app has a strong conversation model but an incomplete booking model.

## Canonical Intent

The intended direction should be:

### `contact_threads`

Use this as the relationship and communication layer.

One thread represents:

- one band
- one venue
- one ongoing communication channel between them

Threads answer:

- have these two parties connected before?
- is contact pending, active, declined, or blocked?
- what messages have they exchanged?

Threads should not be the only source of truth for booking state.

### `booking_inquiries`

Use this as the structured booking request layer.

An inquiry represents a concrete booking attempt or opportunity, not just a conversation.

An inquiry should eventually answer:

- what date or date range is being discussed?
- who initiated the booking ask?
- what is the current booking status?
- was it declined, accepted in principle, confirmed, or cancelled?

### Relationship between them

The cleanest model is:

- one `contact_thread` can exist without any `booking_inquiries`
- one `contact_thread` can contain multiple `booking_inquiries` over time
- `booking_inquiries` belong conceptually to a `contact_thread`, even if the schema does not fully express that yet

That means messaging persists as the relationship layer while structured booking objects come and go inside that relationship.

## Recommended Product Semantics

### Contact flow

Use the inbox system when one side wants to start talking.

That covers:

- artist reaching out to a venue
- venue reaching out to an artist
- screening whether the fit is real
- discussing basics before a concrete booking request is finalized

### Booking flow

Use `booking_inquiries` when the conversation becomes a real booking request.

That covers:

- proposed date
- proposed terms or details
- structured response state
- future booking confirmation

## Status Guidance

### Thread statuses

Current thread statuses:

- `pending`
- `accepted`
- `declined`
- `blocked`

Interpretation:

- `pending` = one side requested contact, waiting on the other side
- `accepted` = communication channel is open
- `declined` = contact was declined, but future re-contact may still happen
- `blocked` = future contact is intentionally blocked

These are relationship statuses, not booking statuses.

### Inquiry statuses

Current inquiry statuses:

- `pending`
- `accepted`
- `declined`
- `cancelled`

These are not expressive enough long term.

The likely future direction should be something like:

- `draft`
- `sent`
- `in_discussion`
- `accepted`
- `declined`
- `confirmed`
- `cancelled`

Important distinction:

- `accepted` should mean "this inquiry is moving forward"
- `confirmed` should mean "this show is booked"

That distinction matters because a conversation can be positive without the show actually being locked in.

## What Should Be Public

Public profile pages should not depend on private booking records where possible.

### Bands

Band profiles should be public and readable by signed-out visitors.

### Upcoming shows

Public upcoming shows should not rely on `booking_inquiries` long term.

Reasons:

- inquiries are not the same thing as confirmed shows
- inquiry visibility is naturally private
- public show data needs a cleaner public source

The better public-facing source is likely:

- `band_show_dates`, or
- a future dedicated `bookings` table, if bookings become richer than simple dates

## Current Guardrails For Future Work

When changing this area, follow these rules:

1. Do not treat `contact_threads` as a substitute for structured booking data.
2. Do not treat `booking_inquiries` as just chat metadata.
3. Do not use private inquiry records as the long-term public show source.
4. Keep relationship state and booking state conceptually separate.
5. Prefer adding explicit states like `confirmed` over overloading `accepted`.

## Suggested Next Steps

### Near term

- keep the inbox as the primary outreach UI
- stop using `booking_inquiries` as the public upcoming-show source
- document in code where `booking_inquiries` are still intentionally used

### Medium term

- link `booking_inquiries` more explicitly to `contact_threads`
- design a clear "create booking request from conversation" UX
- define what fields are required before an inquiry becomes confirmable

### Later

- add a true confirmed booking model
- decide whether confirmed shows should live in `band_show_dates`, `bookings`, or both
- add automated coverage around inquiry lifecycle and permissions

## Decision Summary

If there is ever a question about which system should own what:

- conversation belongs to `contact_threads`
- booking intent belongs to `booking_inquiries`
- public show history belongs to a public show/bookings source, not the inbox
