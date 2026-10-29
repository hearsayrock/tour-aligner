// Run with: node supabase/tests/artist-network.mjs <path-to-pglite-module>
// All data stays in an isolated PostgreSQL runtime. Never connects to Supabase.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { pathToFileURL } from 'node:url'

const { PGlite } = await import(pathToFileURL(process.argv[2]).href)
const db = new PGlite()
const read = path => fs.readFileSync(new URL(path, import.meta.url), 'utf8')
const rows = async (sql, params = []) => (await db.query(sql, params)).rows
const scalar = async (sql, params = []) => Object.values((await rows(sql, params))[0])[0]
const uid = n => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`
const owner = uid(1), otherOwner = uid(2), outsider = uid(3)
const artist = uid(11), strongestMatch = uid(12), partialMatch = uid(13), unrelated = uid(14), inactive = uid(15), secondArtist = uid(16)
const rock = uid(21), punk = uid(22), jazz = uid(23)
const asUser = async user => {
  await db.exec('reset role')
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [user])
  await db.exec('set role authenticated')
}
const directory = (view = 'all', extra = {}) => rows(`select * from public.search_artist_directory($1,$2,$3,$4,$5,$6)`,
  [artist, view, extra.query ?? '', extra.genre ?? null, extra.radius ?? '', extra.type ?? ''])

try {
  await db.exec(`
    create role anon; create role authenticated;
    create schema auth;
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema public, auth to authenticated, anon;
    create table public.profiles (id uuid primary key);
    create table public.bands (
      id uuid primary key, user_id uuid references public.profiles(id), name text,
      is_active boolean default true, touring_radius text, artist_type text
    );
    create table public.venues (id uuid primary key, claimed_by_user_id uuid, name text, is_active boolean default true);
    create table public.band_genres (band_id uuid references public.bands(id) on delete cascade, genre_id uuid, primary key(band_id, genre_id));
    create function public.set_updated_at() returns trigger language plpgsql as
      $$ begin new.updated_at := now(); return new; end $$;
    create publication supabase_realtime;
    grant select on public.profiles, public.bands, public.band_genres, public.venues to authenticated;
    alter table public.bands enable row level security;
    create policy active_artists on public.bands for select to authenticated using (is_active);
    alter table public.band_genres enable row level security;
    create policy readable_genres on public.band_genres for select to authenticated using (true);
    -- Fuzzy matching itself is existing code. Model its ranked result here so the
    -- new directory's filtering/ranking/pagination can be tested independently.
    create function public.search_bands_fuzzy(p_query text) returns table (id uuid, rank real)
      language sql stable as $$ select b.id, 1::real from public.bands b where p_query <> '' and b.name ilike '%' || p_query || '%' $$;
  `)
  await db.query('insert into profiles values ($1),($2),($3)', [owner, otherOwner, outsider])
  for (const [id, userId, name, active, radius, type] of [
    [artist, owner, 'Our Artist', true, 'local', 'band'],
    [strongestMatch, otherOwner, 'Shared Sound', true, 'regional', 'band'],
    [partialMatch, otherOwner, 'Partial Sound', true, 'local', 'solo'],
    [unrelated, outsider, 'Jazz Artist', true, 'national', 'solo'],
    [inactive, otherOwner, 'Inactive Artist', false, 'local', 'band'],
    [secondArtist, owner, 'Second Profile', true, 'local', 'solo'],
  ]) await db.query('insert into bands values ($1,$2,$3,$4,$5,$6)', [id, userId, name, active, radius, type])
  for (const [bandId, genres] of [[artist, [rock, punk]], [strongestMatch, [rock, punk]], [partialMatch, [rock]], [unrelated, [jazz]], [inactive, [rock]]]) {
    for (const genre of genres) await db.query('insert into band_genres values ($1,$2)', [bandId, genre])
  }
  await db.exec(read('../migrations/20261008234710_artist_network_follows.sql'))
  await db.exec(read('../migrations/20260529021447_generic_private_chat_inbox.sql'))
  await db.exec('grant select on private_chat_threads, private_chat_messages to authenticated')
  await asUser(owner)

  assert.deepEqual((await directory('similar')).map(row => [row.band_id, Number(row.shared_genre_count)]), [[strongestMatch, 2], [partialMatch, 1]])
  assert.equal((await directory()).length, 4, 'exclude the selected artist and inactive artists')
  assert.deepEqual((await directory('similar', { query: 'Partial' })).map(row => row.band_id), [partialMatch])
  assert.deepEqual((await directory('similar', { query: 'Sound' })).map(row => row.band_id), [strongestMatch, partialMatch], 'shared genres determine similarity order within search results')
  assert.deepEqual((await directory('similar', { genre: punk })).map(row => row.band_id), [strongestMatch])
  assert.deepEqual((await directory('similar', { radius: 'local', type: 'solo' })).map(row => row.band_id), [partialMatch])
  assert.deepEqual((await rows(`select * from search_artist_directory($1,'similar') limit 1 offset 1`, [artist])).map(row => row.band_id), [partialMatch])
  assert.equal((await rows(`select * from search_artist_directory($1,'similar')`, [secondArtist])).length, 0, 'no fabricated matches for a profile without genres')
  await assert.rejects(rows(`select * from search_artist_directory($1,'following')`, [strongestMatch]), /manage/)
  await assert.rejects(rows(`select * from search_artist_directory(null,'following')`), /profile first/)
  await assert.rejects(directory('invalid'), /Invalid/)

  const follow = (from, to) => db.query('insert into artist_follows(follower_band_id,followed_band_id) values ($1,$2) on conflict do nothing', [from, to])
  await follow(artist, strongestMatch)
  await follow(artist, strongestMatch)
  assert.equal(await scalar('select count(*)::int from artist_follows'), 1, 'idempotent follow')
  assert.deepEqual((await directory('following')).map(row => row.band_id), [strongestMatch])
  await assert.rejects(follow(strongestMatch, artist), /row-level security/)
  await assert.rejects(follow(artist, artist), /no_self_follow/)
  await assert.rejects(follow(artist, inactive), /row-level security/)
  await assert.rejects(follow(inactive, artist), /row-level security/)
  await assert.rejects(db.query('update artist_follows set followed_band_id=$1', [partialMatch]), /permission denied/)

  await asUser(outsider)
  assert.equal(await scalar('select count(*)::int from artist_follows'), 0, 'unrelated users cannot read follows')
  await db.exec('delete from artist_follows')
  await asUser(otherOwner)
  assert.equal(await scalar('select count(*)::int from artist_follows'), 1, 'the followed artist can read the relationship')
  await db.exec('delete from artist_follows')
  assert.equal(await scalar('select count(*)::int from artist_follows'), 1, 'the followed artist cannot delete another artist\'s follow')
  await follow(strongestMatch, artist)
  await asUser(owner)
  assert.deepEqual((await directory('followers')).map(row => row.band_id), [strongestMatch])
  assert.equal(await scalar('select count(*)::int from artist_follows'), 2, 'mutual follows remain separate relationships')
  await db.query('delete from artist_follows where follower_band_id=$1 and followed_band_id=$2', [artist, strongestMatch])
  assert.equal((await directory('following')).length, 0)
  assert.equal((await directory('followers')).length, 1, 'unfollowing does not remove their follow')
  assert.equal((await rows(`select * from search_artist_directory($1,'following')`, [secondArtist])).length, 0, 'relationships are isolated across managed identities')

  // Exercise the existing artist-to-artist chat flow with the new follow table.
  // Even mutual follows must respect approval, participant privacy, and blocking.
  await follow(artist, strongestMatch)
  const requested = await scalar(`select request_private_chat('band',$1,'band',$2,'Hello')`, [artist, strongestMatch])
  const threadId = requested.thread_id
  assert.equal(requested.status, 'pending')
  await assert.rejects(rows(`select send_private_chat_message($1,'band',$2,'Premature')`, [threadId, artist]), /accepted|approved/i)
  await assert.rejects(rows(`select respond_to_private_chat_request($1,'band',$2,'accept',null)`, [threadId, artist]), /receiving profile/i)
  await asUser(otherOwner)
  const accepted = await scalar(`select respond_to_private_chat_request($1,'band',$2,'accept',null)`, [threadId, strongestMatch])
  assert.equal(accepted.status, 'accepted')
  await rows(`select send_private_chat_message($1,'band',$2,'Hello back')`, [threadId, strongestMatch])
  await asUser(owner)
  await rows(`select send_private_chat_message($1,'band',$2,'Let us play a show')`, [threadId, artist])
  await asUser(outsider)
  assert.equal(await scalar('select count(*)::int from private_chat_threads'), 0)
  assert.equal(await scalar('select count(*)::int from private_chat_messages'), 0)
  await assert.rejects(rows(`select send_private_chat_message($1,'band',$2,'Spoofed')`, [threadId, artist]), /own/)
  await asUser(otherOwner)
  await rows(`select block_private_chat_thread($1,'band',$2,null)`, [threadId, strongestMatch])
  await asUser(owner)
  await assert.rejects(rows(`select send_private_chat_message($1,'band',$2,'Blocked')`, [threadId, artist]), /accepted|blocked/i)
  await assert.rejects(rows(`select request_private_chat('band',$1,'band',$2,'Try again')`, [artist, strongestMatch]), /blocked/i)
  await rows(`select archive_private_chat_thread($1,'band',$2)`, [threadId, artist])
  await rows(`select mark_private_chat_read($1,'band',$2)`, [threadId, artist])

  await db.exec('reset role; set role anon')
  await assert.rejects(rows('select * from artist_follows'), /permission denied/)
  await assert.rejects(rows('select * from search_artist_directory()'), /permission denied/)
  await db.exec('reset role')
  await db.query('delete from bands where id=$1', [strongestMatch])
  assert.equal(await scalar('select count(*)::int from artist_follows'), 0, 'artist deletion cleans both directions')
  await db.exec(read('../rollback/20261008234710_artist_network_follows_rollback.sql'))
  assert.equal(await scalar("select to_regclass('public.artist_follows')"), null)
  assert.equal(await scalar("select to_regprocedure('public.search_artist_directory(uuid,text,text,uuid,text,text)')"), null)
  console.log('Artist directory, follow permissions, private chat consent/privacy, and rollback checks passed.')
} finally {
  await db.close()
}
