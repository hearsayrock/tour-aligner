import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { applyChanges, initialDocument, type ArtistSong } from './model'
import { artistMusic, listeningLinks, musicLibrary, spotifyLinkFromPaste } from './songs'

const spotifyArtist = 'https://open.spotify.com/artist/1eqSgAQpv9g4IxCjaSj1CI'
const sunday: ArtistSong = {
  id: 'a0000000-0000-4000-8000-000000000001',
  title: 'Sunday Afternoon',
  links: { bandcamp_url: 'https://yellow5.bandcamp.com/track/sunday-afternoon' },
  bandcampPlayer: 'https://bandcamp.com/EmbeddedPlayer/track=1234/size=small/transparent=true/',
}
const oldPage = initialDocument('artist', {
  featured_track_url: spotifyArtist,
  profile_theme: { studio: { songs: [sunday], musicSource: 'bandcamp_url' } },
})

test('unfeaturing a legacy song preserves its public listing and listening links', () => {
  const { items, featured } = musicLibrary(oldPage)
  assert.deepEqual(featured, [sunday.id])
  const artist = items.find((item) => item.kind === 'spotify-embed')!
  const draft = applyChanges(oldPage, { look: { songs: items, featuredMusic: [artist.id] } })
  const { songs, queue } = artistMusic(draft)
  assert.deepEqual(listeningLinks(songs.find((item) => item.id === sunday.id)!), [
    { key: 'bandcamp_url', label: 'Bandcamp', url: sunday.links.bandcamp_url },
  ])
  assert.deepEqual(
    queue.map((item) => item.id),
    [artist.id]
  )
  assert.equal(queue[0].embed, spotifyArtist.replace('/artist/', '/embed/artist/'))
})

test('publishing an empty selection or removing all items suppresses the legacy player fallback', () => {
  const { items } = musicLibrary(oldPage)
  for (const songs of [items, []]) {
    const published = initialDocument('artist', {
      featured_track_url: spotifyArtist,
      profile_theme: { studio: { songs, featuredMusic: [], musicSource: 'spotify_url' } },
    })
    assert.equal(artistMusic(published).songs.length, songs.length)
    assert.deepEqual(artistMusic(published).queue, [])
  }
})

test('a mixed-provider queue follows song order even when featured in reverse order', () => {
  const { items } = musicLibrary(oldPage)
  const songs = items.map((item) =>
    item.id === sunday.id
      ? {
          ...item,
          links: { ...item.links, spotify_url: 'https://open.spotify.com/track/abc123' },
        }
      : item
  )
  const draft = applyChanges(oldPage, {
    look: { songs, featuredMusic: songs.map((item) => item.id).reverse() },
  })
  assert.deepEqual(
    artistMusic(draft).queue.map((item) => item.source),
    ['bandcamp_url', 'spotify_url']
  )
  const changed = applyChanges(draft, {
    look: { songs: songs.map((item) => ({ ...item, playFrom: 'spotify_url' })) },
  })
  assert.match(artistMusic(changed).queue[0].embed, /\/embed\/track\/abc123$/)
})

test('Spotify iframe paste keeps the official link and color choice', () => {
  const src = spotifyArtist.replace('/artist/', '/embed/artist/') + '?utm_source=generator&amp;theme=0'
  assert.equal(
    spotifyLinkFromPaste('<iframe src="' + src + '" height="352"></iframe>'),
    spotifyArtist + '?theme=0'
  )
})
