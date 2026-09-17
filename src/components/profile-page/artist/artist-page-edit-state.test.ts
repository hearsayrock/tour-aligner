import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import type { ArtistPageEditableContent } from './artist-page-config'
// Node's built-in TypeScript runner requires the explicit extension.
// @ts-expect-error TypeScript's bundler resolution omits TypeScript extensions.
import { artistContentFields, mergeArtistContent } from './artist-page-edit-state.ts'

function baseline(): ArtistPageEditableContent {
  return {
    name: 'Artist', tagline: '', description: 'Saved bio', location_city: 'Henderson', location_state: 'NV',
    touring_radius: 'international', artist_type: 'solo', set_length_min: '5', featured_track_url: '',
    website_url: '', instagram_url: '', spotify_url: '', youtube_url: '', bandcamp_url: '', apple_music_url: '',
    tiktok_url: '', soundcloud_url: '', facebook_url: '', twitter_url: '', genre_ids: [], members: [], lyrics: [],
  }
}

test('OK changes the preview draft without updating saved content; reopening and Discard restores saved fields', () => {
  const saved = baseline()
  const editing = { ...saved, set_length_min: '55', description: 'Another block draft' }
  const fields = artistContentFields('details')
  const preview = mergeArtistContent(saved, editing, fields)
  assert.equal(preview.set_length_min, '55')
  assert.equal(saved.set_length_min, '5')
  assert.equal(preview.description, 'Saved bio')
  const reopened = { ...editing, set_length_min: '60' }
  const discarded = mergeArtistContent(reopened, saved, fields)
  assert.equal(discarded.set_length_min, '5')
  assert.equal(discarded.description, 'Another block draft')
})

test('the combined links block restores streaming and social links together without changing other blocks', () => {
  const saved = baseline()
  const draft = { ...saved, spotify_url: 'https://spotify.com/artist/test', instagram_url: 'https://instagram.com/test', description: 'Another draft' }
  const restored = mergeArtistContent(draft, saved, artistContentFields('links'))
  assert.equal(restored.instagram_url, '')
  assert.equal(restored.spotify_url, '')
  assert.equal(restored.description, 'Another draft')
})

test('accepted arrays stay independent of further form edits and become the new saved baseline', () => {
  const saved = baseline()
  const draft = { ...saved, members: ['One member'] }
  const fields = artistContentFields('members')
  const accepted = mergeArtistContent(saved, draft, fields)
  draft.members.push('Unconfirmed member')
  assert.deepEqual(accepted.members, ['One member'])
  const savedAfterSave = structuredClone(accepted)
  const laterDraft = { ...accepted, members: ['Changed after save'] }
  assert.deepEqual(mergeArtistContent(laterDraft, savedAfterSave, fields).members, ['One member'])
})
