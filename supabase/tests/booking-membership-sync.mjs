// Run with: node supabase/tests/booking-membership-sync.mjs <path-to-pglite-module>
// PGlite is installed outside this repository. Never connects to Supabase.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { pathToFileURL } from 'node:url'
const { PGlite } = await import(pathToFileURL(process.argv[2]).href)
const db = new PGlite()
await db.exec(fs.readFileSync(new URL('./booking-membership-sync-fixture.sql', import.meta.url), 'utf8'))
const band = '00000000-0000-0000-0000-000000000002'
const event = '00000000-0000-0000-0000-000000000010'
await db.exec(`insert into event_artist_memberships(event_id,band_id,status,source)
  values('${event}','${band}','accepted','invitation')`)
await db.exec(fs.readFileSync(new URL('../migrations/20260918040239_synchronize_event_memberships_and_bookings.sql', import.meta.url), 'utf8'))
const rows = async sql => (await db.query(sql)).rows
const scalar = async sql => Object.values((await rows(sql))[0])[0]
const booking = async () => (await rows(`select *,show_date::text as show_date from bookings where event_id='${event}' and band_id='${band}' and status <> 'cancelled'`))[0]
assert.equal(await scalar('select count(*)::int from bookings'), 1)
assert.equal((await booking()).thread_id, null)
assert.equal((await booking()).status, 'confirmed')
await db.exec(`update event_artist_memberships set accepted_at=now() where event_id='${event}'`)
assert.equal(await scalar('select count(*)::int from bookings'), 1, 'repeated acceptance is idempotent')
await db.exec(`update event_artist_memberships set status='removal_requested' where event_id='${event}'`)
assert.equal((await booking()).status, 'cancellation_requested')
await db.exec(`update bookings set status='confirmed' where event_id='${event}'`)
assert.equal(await scalar(`select status from event_artist_memberships where event_id='${event}'`), 'accepted')
await db.exec(`update events set event_date=current_date+31 where id='${event}'`)
assert.equal((await booking()).show_date, await scalar('select (current_date+31)::text'))
await db.exec(`insert into venue_booking_dates(venue_id,show_date,bill_cap,is_unavailable)
  values('00000000-0000-0000-0000-000000000001',current_date+32,4,true)`)
await assert.rejects(db.exec(`update events set event_date=current_date+32 where id='${event}'`), /unavailable/)
assert.equal((await booking()).show_date, await scalar('select (current_date+31)::text'))
assert.equal(await scalar(`select event_date::text from events where id='${event}'`), (await booking()).show_date)
await db.exec(`update bookings set status='cancelled', cancelled_at=now() where event_id='${event}'`)
assert.equal(await scalar(`select status from event_artist_memberships where event_id='${event}'`), 'removed')
await db.exec(`update event_artist_memberships set status='accepted' where event_id='${event}'`)
assert.equal(await scalar('select count(*)::int from bookings'), 2, 'rebooking preserves cancelled history')
await db.exec(`update events set status='cancelled' where id='${event}'`)
assert.equal(await booking(), undefined)
assert.equal(await scalar(`select status from event_artist_memberships where event_id='${event}'`), 'removed')
await assert.rejects(db.exec(`update event_artist_memberships set status='accepted' where event_id='${event}'`), /cancelled event/)
await assert.rejects(db.exec(`select confirm_contact_booking('00000000-0000-0000-0000-000000000020',current_date+31,4,false)`), /cancelled event/)
await db.exec(`select confirm_contact_booking('00000000-0000-0000-0000-000000000020',current_date+40,2,false)`)
assert.equal(await scalar(`select count(*)::int from bookings where thread_id='00000000-0000-0000-0000-000000000020'`), 1)
const inboxEvent = await scalar(`select event_id from bookings where thread_id='00000000-0000-0000-0000-000000000020'`)
assert.equal(await scalar(`select count(*)::int from event_artist_memberships where event_id='${inboxEvent}' and status='accepted'`), 1)
await assert.rejects(db.exec(`select confirm_contact_booking('00000000-0000-0000-0000-000000000020',current_date+40,2,false)`), /already booked/)
await db.exec(`delete from contact_threads where id='00000000-0000-0000-0000-000000000020'`)
assert.equal(await scalar(`select count(*)::int from bookings where event_id='${inboxEvent}' and thread_id is null`), 1, 'conversation deletion preserves commitment')
await db.exec(`alter table event_artist_memberships enable row level security;
  grant usage on schema public to anon; grant select on event_artist_memberships,events to anon;
  set role anon`)
assert.equal(await scalar('select count(*)::int from event_artist_memberships'), 0)
assert.equal((await rows(`select * from get_public_event_lineup('${inboxEvent}')`)).length, 0)
await assert.rejects(db.query("select sync_event_membership_booking('00000000-0000-0000-0000-000000000000')"), /permission denied/)
await db.exec('reset role')
await db.exec(`update events set is_public=true,lineup_published=true where id='${inboxEvent}'; set role anon`)
assert.equal(await scalar('select count(*)::int from event_artist_memberships'), 0, 'private membership rows remain inaccessible')
const publicArtists = await rows(`select * from get_public_event_lineup('${inboxEvent}')`)
assert.equal(publicArtists.length, 1)
assert.deepEqual(Object.keys(publicArtists[0]), ['membership_id', 'band_id', 'artist_name', 'artist_slug'])
await db.exec('reset role')

// Exercise the existing artist RPCs rather than only updating statuses directly.
const loadFunction = async (file, name) => {
  const sql = fs.readFileSync(new URL(file, import.meta.url), 'utf8')
  const start = sql.indexOf(`create or replace function public.${name}(`)
  const end = sql.indexOf('$$;', start) + 3
  await db.exec(sql.slice(start, end))
}
await loadFunction('../migrations/20260523135413_mark_accept_invite_messages_system.sql', 'accept_event_invite')
await loadFunction('../migrations/20260522172523_event_backstage_schema.sql', 'request_event_removal')
const secondBand = '00000000-0000-0000-0000-000000000003'
await db.exec(`insert into bands(id,user_id,name,slug) values('${secondBand}',
  '00000000-0000-0000-0000-000000000097','Second Artist','second-artist');
  insert into event_artist_memberships(event_id,band_id,status,source)
  values('${inboxEvent}','${secondBand}','invited','invitation');
  set request.jwt.claim.sub='00000000-0000-0000-0000-000000000097'`)
const invite = await scalar(`select id from event_artist_memberships where band_id='${secondBand}'`)
assert.equal(await scalar('select count(*)::int from bookings'), 3, 'an invitation alone creates no booking')
await db.exec(`select accept_event_invite('${invite}')`)
assert.equal(await scalar(`select count(*)::int from bookings where band_id='${secondBand}' and status='confirmed'`), 1)
await db.exec(`select request_event_removal('${invite}','Test note')`)
assert.equal(await scalar(`select status from bookings where band_id='${secondBand}'`), 'cancellation_requested')
assert.equal((await rows(`select * from get_public_event_lineup('${inboxEvent}')`)).length, 2, 'pending cancellation keeps the published lineup')
await db.exec(`update event_artist_memberships set status='accepted' where id='${invite}'; reset request.jwt.claim.sub`)

// The date lock and shared cap protect both entry paths, with atomic failure.
const thirdBand = '00000000-0000-0000-0000-000000000004'
await db.exec(`insert into bands(id,user_id,name,slug) values('${thirdBand}',
  '00000000-0000-0000-0000-000000000096','Third Artist','third-artist')`)
await assert.rejects(db.exec(`insert into event_artist_memberships(event_id,band_id,status,source)
  values('${inboxEvent}','${thirdBand}','accepted','manual')`), /bill cap/)
assert.equal(await scalar(`select count(*)::int from event_artist_memberships where band_id='${thirdBand}'`), 0)
await db.exec(`insert into venue_booking_dates(venue_id,show_date,bill_cap)
  values('00000000-0000-0000-0000-000000000001',current_date+41,1)`)
await assert.rejects(db.exec(`update events set event_date=current_date+41 where id='${inboxEvent}'`), /bill cap/)
assert.equal(await scalar(`select event_date::text from events where id='${inboxEvent}'`), await scalar('select (current_date+40)::text'))
assert.equal(await scalar(`select count(*)::int from bookings where event_id='${inboxEvent}' and show_date=current_date+40`), 2)
await db.exec(`delete from events where id='${inboxEvent}'`)
assert.equal(await scalar(`select count(*)::int from bookings where status<>'cancelled'`), 0, 'event deletion cancels ledger rows')
await db.exec(fs.readFileSync(new URL('../rollback/20260918040239_synchronize_event_memberships_and_bookings_rollback.sql', import.meta.url), 'utf8'))
assert.equal(await scalar('select count(*)::int from bookings'), 4)
await db.close()

// Old Inbox rows can predate the explicit event link. Backfill must link them
// without duplicating them, dropping a request, or resurrecting a cancellation.
for (const status of ['confirmed', 'cancellation_requested', 'cancelled']) {
  const legacyDb = new PGlite()
  await legacyDb.exec(fs.readFileSync(new URL('./booking-membership-sync-fixture.sql', import.meta.url), 'utf8'))
  await legacyDb.exec(`insert into venue_booking_dates(id,venue_id,show_date,bill_cap,is_closed_to_more_bands)
    values('00000000-0000-0000-0000-000000000030','00000000-0000-0000-0000-000000000001',current_date+30,1,true);
    insert into event_artist_memberships(event_id,band_id,status,source,accepted_at)
    values('${event}','${band}','accepted','manual',now()-interval '1 hour');
    insert into bookings(thread_id,band_id,venue_id,show_date,venue_booking_date_id,status,
      cancellation_requested_at,cancelled_at)
    values('00000000-0000-0000-0000-000000000020','${band}',
      '00000000-0000-0000-0000-000000000001',current_date+30,
      '00000000-0000-0000-0000-000000000030','${status}',
      case when '${status}'='cancellation_requested' then now() end,
      case when '${status}'='cancelled' then now() end)`)
  await legacyDb.exec(fs.readFileSync(new URL('../migrations/20260918040239_synchronize_event_memberships_and_bookings.sql', import.meta.url), 'utf8'))
  const legacyRows = (await legacyDb.query('select status,event_id from bookings')).rows
  assert.equal(legacyRows.length, 1)
  assert.equal(legacyRows[0].status, status)
  if (status !== 'cancelled') assert.equal(legacyRows[0].event_id, event)
  const membershipStatus = (await legacyDb.query('select status from event_artist_memberships')).rows[0].status
  assert.equal(membershipStatus, status === 'confirmed' ? 'accepted' : status === 'cancelled' ? 'removed' : 'removal_requested')
  await legacyDb.close()
}
console.log('PASS: backfill, idempotence, both confirmation paths, date changes, cancellation, public lineup, conversation deletion, rollback')
