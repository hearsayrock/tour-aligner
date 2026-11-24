import {
  isMusicService,
  musicServiceKeys,
  musicServices,
  spotifyEmbed,
  urlValue,
  type ArtistSong,
  type MusicService,
  type StudioDoc,
} from './model'

export function listeningLinks(song: ArtistSong) {
  return musicServiceKeys
    .map((key) => ({
      key,
      label: musicServices[key],
      url:
        urlValue(song.links[key]) || (key === 'bandcamp_url' ? bandcampEmbed(song.bandcampPlayer) : ''),
    }))
    .filter((link) => link.url)
}

export function bandcampEmbed(value = '') {
  // Preserve the official player IDs. Artist-supplied HTML never reaches the page.
  const src = value.trim().match(/^<iframe\b[^>]*?\ssrc=["']([^"']+)["']/i)?.[1] ?? value
  const path = urlValue(src).match(/^https:\/\/bandcamp\.com\/EmbeddedPlayer\/([^?#]+)/)?.[1]
  const track = path?.match(/(?:^|\/)track=(\d+)(?:\/|$)/)?.[1]
  if (!track) return ''
  const album = path?.match(/(?:^|\/)album=(\d+)(?:\/|$)/)?.[1]
  const item = album ? 'album=' + album + '/track=' + track : 'track=' + track
  return 'https://bandcamp.com/EmbeddedPlayer/' + item + '/size=small/transparent=true/'
}

export function songEmbed(song: ArtistSong, source: MusicService) {
  if (song.kind === 'spotify-embed' && source !== 'spotify_url') return ''
  const link = urlValue(song.links[source])
  if (source === 'bandcamp_url') return bandcampEmbed(song.bandcampPlayer) || bandcampEmbed(link)
  if (!link) return ''
  if (source === 'spotify_url') {
    const src = spotifyEmbed(link)
    return song.kind === 'spotify-embed' || src.includes('/embed/track/') ? src : ''
  }
  const url = new URL(link)
  const host = url.hostname
  if (
    source === 'apple_music_url' &&
    ['music.apple.com', 'geo.music.apple.com', 'embed.music.apple.com'].includes(host)
  ) {
    const path = url.pathname.match(/^\/[a-z]{2}\/(song|album)\/(?:[^/]+\/)?\d+\/?$/)
    if (!path) return ''
    const id = url.searchParams.get('i') ?? ''
    if (path[1] === 'album' && !/^\d+$/.test(id)) return ''
    return 'https://embed.music.apple.com' + url.pathname + (path[1] === 'album' ? '?i=' + id : '')
  }
  if (
    source === 'soundcloud_url' &&
    ['soundcloud.com', 'www.soundcloud.com', 'm.soundcloud.com'].includes(host)
  ) {
    if (
      !/^\/[\w-]+\/[\w-]+\/?$/.test(url.pathname) ||
      /^\/(?:discover|charts|search|you|stations)\//.test(url.pathname)
    )
      return ''
    return (
      'https://w.soundcloud.com/player/?url=' +
      encodeURIComponent('https://soundcloud.com' + url.pathname)
    )
  }
  if (source === 'youtube_url') {
    let id: string | null | undefined
    if (host === 'youtu.be') id = url.pathname.slice(1)
    if (
      [
        'youtube.com',
        'www.youtube.com',
        'music.youtube.com',
        'm.youtube.com',
        'www.youtube-nocookie.com',
      ].includes(host)
    ) {
      id =
        url.pathname === '/watch'
          ? url.searchParams.get('v')
          : url.pathname.match(/^\/(?:embed|shorts|live)\/([^/]+)\/?$/)?.[1]
    }
    if (id && /^[\w-]{11}$/.test(id)) return 'https://www.youtube-nocookie.com/embed/' + id
  }
  return ''
}

export function spotifyLinkFromPaste(value: string) {
  const src = value.trim().match(/^<iframe\b[^>]*?\ssrc\s*=\s*["']([^"']+)["']/i)?.[1]
  if (!src) return value
  const embed = spotifyEmbed(src.replaceAll('&amp;', '&'))
  return embed ? embed.replace('/embed/', '/') : value
}

export function playableServices(song: ArtistSong) {
  return musicServiceKeys.filter((key) => songEmbed(song, key))
}

export type PlayerSong = ArtistSong & { embed: string; source: MusicService }

export function musicLibrary(doc: StudioDoc) {
  const items = doc.look.songs ?? []
  if (Array.isArray(doc.look.featuredMusic)) return { items, featured: doc.look.featuredMusic }

  // Older pages used a single service and only played the profile link when its song queue was empty.
  const songs = items.filter((song) => song.title.trim() && listeningLinks(song).length)
  const profile: ArtistSong = {
    id: 'featured',
    title: 'Featured music',
    links: Object.fromEntries(musicServiceKeys.map((key) => [key, doc.fields[key]])),
  }
  const spotify = spotifyEmbed(doc.fields.featured_track_url)
  if (spotify) profile.links.spotify_url = doc.fields.featured_track_url
  const source = isMusicService(doc.look.musicSource)
    ? doc.look.musicSource
    : (musicServiceKeys.find((key) => songs.some((song) => songEmbed(song, key))) ??
      musicServiceKeys.find((key) => songEmbed(profile, key) || (key === 'spotify_url' && spotify)) ??
      'spotify_url')
  const featured = songs.filter((song) => songEmbed(song, source)).map((song) => song.id)
  const library = items.map((song) =>
    featured.includes(song.id) ? { ...song, playFrom: source } : song
  )
  if (spotify) {
    const entity = spotify.split('?')[0]
    let item = songs.find((song) => songEmbed(song, 'spotify_url').split('?')[0] === entity)
    if (!item) {
      const type = new URL(spotify).pathname.split('/')[2]
      item = {
        id: 'featured-spotify',
        title: type === 'artist' ? 'Spotify top tracks' : 'Spotify ' + type,
        kind: type === 'track' ? undefined : 'spotify-embed',
        links: { spotify_url: doc.fields.featured_track_url },
      }
      library.push(item)
    }
    if (!featured.length && source === 'spotify_url') featured.push(item.id)
  } else if (
    urlValue(doc.fields.featured_track_url) &&
    doc.fields.featured_track_url !== doc.fields.spotify_url
  ) {
    // An old short link can still be listed even when it cannot supply an embed.
    library.push({
      id: 'featured-spotify',
      title: 'Featured music',
      links: { spotify_url: doc.fields.featured_track_url },
    })
  }
  if (!featured.length && songEmbed(profile, source)) {
    library.push({ ...profile, playFrom: source, links: { [source]: profile.links[source] } })
    featured.push(profile.id)
  }
  return { items: library, featured }
}

export function artistMusic(doc: StudioDoc) {
  const { items, featured } = musicLibrary(doc)
  const songs = items.filter((song) => song.title.trim() && listeningLinks(song).length)
  const queue: PlayerSong[] = []
  for (const song of songs) {
    if (!featured.includes(song.id)) continue
    const services = playableServices(song)
    const source = song.playFrom && services.includes(song.playFrom) ? song.playFrom : services[0]
    if (source) queue.push({ ...song, source, embed: songEmbed(song, source) })
  }
  return { songs, queue }
}
