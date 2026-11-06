// Run with: node supabase/tests/event-access.mjs <path-to-pglite-module>
// Uses isolated PostgreSQL with the booking fixture and a minimal Storage schema.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const { PGlite } = await import(pathToFileURL(process.argv[2]).href)
const db = new PGlite()
const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')
const rows = async (sql, params) => (await db.query(sql, params)).rows
const value = async (sql, params) => Object.values((await rows(sql, params))[0])[0]
const id = (suffix) => '00000000-0000-0000-0000-0000000000' + suffix

const venue = id('01')
const band = id('02')
const declinedBand = id('03')
const event = id('10')
const otherEvent = id('11')
const thread = id('20')
const venueOwner = id('99')
const artist = id('98')
const otherArtist = id('97')
const outsider = id('96')
const coverPath = event + '/' + id('21') + '.jpg'
const backgroundPath = event + '/' + id('22') + '.jpg'
const imagePaths = [coverPath, backgroundPath]

async function as(role, user, callback) {
  await db.exec('set role ' + role)
  try {
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [user ?? ''])
    await callback()
  } finally {
    await db.exec('reset role; reset request.jwt.claim.sub')
  }
}

try {
  await db.exec(read('./booking-membership-sync-fixture.sql'))
  await db.exec(`
    create or replace function auth.uid() returns uuid language sql as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
    create function public.is_admin() returns boolean language sql as $$ select false $$;
    create table event_genres (event_id uuid references events, genre_id uuid);
    create table backstage_read_states (user_id uuid, event_id uuid);
    create table private_chat_threads (
      participant_one_kind text, participant_one_id uuid,
      participant_two_kind text, participant_two_id uuid, status text
    );
    create schema storage;
    create table storage.buckets (
      id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]
    );
    create table storage.objects (bucket_id text references storage.buckets, name text);
    alter table storage.objects enable row level security;
    grant usage on schema auth, storage to authenticated, anon;
    grant select on storage.objects, events to authenticated, anon;
    grant insert on storage.objects to authenticated;
    grant select on bands, venues, private_chat_threads to authenticated;
    grant select, insert, update on event_artist_memberships to authenticated;
    grant select, insert on backstage_messages to authenticated;
    alter table events enable row level security;
    alter table event_artist_memberships enable row level security;
    alter table backstage_messages enable row level security;
    alter table events add column logistics_load_in text, add column logistics_soundcheck text,
      add column logistics_set_times text, add column logistics_backline text,
      add column logistics_artist_should_bring text, add column logistics_parking_access text;
    alter table event_artist_memberships add column declined_at timestamptz, add column invited_at timestamptz;
    update events set logistics_load_in = 'Side door', logistics_notes = 'Host only' where id = '${event}';
    insert into bands(id, user_id, name, slug) values ('${declinedBand}', '${otherArtist}', 'Other artist', 'other');
    insert into events(id, venue_id, title, slug, event_date, needed_artist_count)
      values ('${otherEvent}', '${venue}', 'Other event', 'other', current_date + 31, 2);
    insert into event_artist_memberships(event_id, band_id, status, source)
      values ('${otherEvent}', '${band}', 'accepted', 'invitation');
    insert into backstage_messages(event_id, body) values ('${event}', 'Private message');
  `)
  await db.exec(read('../migrations/20260522180031_fix_event_rls_recursion.sql'))
  await db.exec(read('../migrations/20260523135413_mark_accept_invite_messages_system.sql'))
  await db.exec(read('../migrations/20260918040239_synchronize_event_memberships_and_bookings.sql'))
  await db.exec(read('../migrations/20261106002217_separate_private_event_logistics.sql'))
  await db.exec(read('../migrations/20261106002220_add_event_page_appearance.sql'))
  await db.exec(read('../migrations/20261106004324_customize_event_page_layout.sql'))

  await as('authenticated', outsider, async () => {
    await assert.rejects(db.query("select invite_artist_to_event($1, $2, 'test')", [event, band]), /event you host/)
    assert.deepEqual(await rows('select * from event_logistics'), [])
    await assert.rejects(db.query("insert into storage.objects values ('event-covers', $1)", [coverPath]), /row-level security/)
  })
  await as('authenticated', venueOwner, async () => {
    assert.equal(await value('select load_in from event_logistics where event_id = $1', [event]), 'Side door')
    await db.query("insert into event_logistics values ($1, 'Back entrance') on conflict (event_id) do update set load_in = excluded.load_in", [event])
    await db.query("insert into storage.objects values ('event-covers', $1), ('event-covers', $2)", imagePaths)
    await db.query("select invite_artist_to_event($1, $2, 'Bring a cab')", [event, band])
    await db.query("select invite_artist_to_event($1, $2, '')", [event, declinedBand])
    await assert.rejects(db.query("select invite_artist_to_event($1, $2, '')", [event, band]), /already has an application/)
  })

  const layout = { schemaVersion: 2, hero: { height: 'cinematic' }, sections: [{ sectionId: 'description', order: 1 }] }
  await db.query(
    "update events set cover_photo_path = $1, background_photo_path = $2, page_layout = $3, page_background_color = '#172130', background_photo_opacity = 35, accent_color = '#AAFF00' where id = $4",
    [...imagePaths, JSON.stringify(layout), event],
  )
  await assert.rejects(db.query('update events set background_photo_path = $1 where id = $2', [backgroundPath, otherEvent]), /check constraint/)
  await assert.rejects(db.query('update events set background_photo_opacity = 101 where id = $1', [event]), /check constraint/)
  const invite = await value('select id from event_artist_memberships where event_id = $1 and band_id = $2', [event, band])
  const decline = await value('select id from event_artist_memberships where event_id = $1 and band_id = $2', [event, declinedBand])
  const sendMessage = () => db.query(
    "insert into backstage_messages(event_id, sender_user_id, sender_kind, sender_band_id, body) values ($1, $2, 'artist', $3, 'hello')",
    [event, artist, band],
  )

  await as('anon', null, async () => {
    assert.deepEqual(await rows('select id from events where id = $1', [event]), [])
    assert.deepEqual(await rows('select name from storage.objects'), [])
    await assert.rejects(db.query('select * from event_logistics'), /permission denied/)
  })
  await as('authenticated', otherArtist, async () => {
    await assert.rejects(db.query('select decline_event_invite($1)', [invite]), /no longer available/)
    await db.query('select decline_event_invite($1)', [decline])
    assert.deepEqual(await rows('select * from event_logistics where event_id = $1', [event]), [])
    assert.deepEqual(await rows('select name from storage.objects'), [])
  })
  await as('authenticated', artist, async () => {
    assert.equal(await value('select invitation_note from event_artist_memberships where id = $1', [invite]), 'Bring a cab')
    assert.equal(await value('select load_in from event_logistics where event_id = $1', [event]), 'Back entrance')
    assert.deepEqual((await rows('select name from storage.objects order by name')).map(({ name }) => name), imagePaths)
    assert.deepEqual(await rows('select body from backstage_messages where event_id = $1', [event]), [])
    await assert.rejects(sendMessage(), /row-level security/, 'acceptance on a different event does not unlock chat')
    assert.deepEqual(await rows("update event_logistics set notes = 'tampered' where event_id = $1 returning notes", [event]), [])
    await db.query('select accept_event_invite($1)', [invite])
    assert.equal(await value('select body from backstage_messages where event_id = $1 and body = $2', [event, 'Private message']), 'Private message')
    await sendMessage()
  })

  await db.query('update events set is_public = true where id = $1', [event])
  await as('anon', null, async () => {
    assert.equal(await value('select title from events where id = $1', [event]), 'Test Event')
    assert.deepEqual(await value('select page_layout from events where id = $1', [event]), layout)
    assert.equal(await value('select page_background_color from events where id = $1', [event]), '#172130')
    assert.deepEqual((await rows('select name from storage.objects order by name')).map(({ name }) => name), imagePaths)
    await assert.rejects(db.query('select logistics_notes from events'), /does not exist/)
    await assert.rejects(db.query('select * from event_logistics'), /permission denied/)
  })
  await as('authenticated', outsider, async () => {
    assert.deepEqual(await rows('select * from event_logistics'), [])
    assert.deepEqual(await rows('select invitation_note from event_artist_memberships'), [])
  })

  await as('authenticated', venueOwner, async () => {
    await db.query('select confirm_contact_booking($1, current_date + 45, 2, false)', [thread])
  })
  assert.match(await value('select notes from event_logistics join events on id = event_id where event_date = current_date + 45'), /Auto-created/)

  await db.exec(read('../rollback/20261106004324_customize_event_page_layout_rollback.sql'))
  await as('anon', null, async () => {
    assert.equal(await value('select name from storage.objects'), coverPath)
    await assert.rejects(db.query('select page_layout from events'), /does not exist/)
  })
  await db.exec(read('../rollback/20261106002217_separate_private_event_logistics_rollback.sql'))
  assert.equal(await value('select logistics_load_in from events where id = $1', [event]), 'Back entrance')
  assert.equal(await value('select logistics_notes from events where id = $1', [event]), 'Host only')
  console.log('Event access, invitation, storage policies, booking creation, and logistics rollback checks passed.')
} finally {
  await db.close()
}
