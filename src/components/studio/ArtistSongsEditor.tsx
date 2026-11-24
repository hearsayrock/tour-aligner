'use client'
import { useState } from 'react'
import {
  musicServiceKeys,
  musicServices,
  type ArtistSong,
  type MusicService,
  type StudioDoc,
} from '@/lib/studio/model'
import {
  bandcampEmbed,
  listeningLinks,
  musicLibrary,
  playableServices,
  spotifyLinkFromPaste,
} from '@/lib/studio/songs'
import { inputClass, buttonBaseClass } from '@/components/ui/primitives'

type Library = ReturnType<typeof musicLibrary>

export function ArtistSongsEditor({
  doc,
  change,
}: {
  doc: StudioDoc
  change: (fn: (doc: StudioDoc) => StudioDoc) => void
}) {
  const [openId, setOpenId] = useState('')
  const { items, featured } = musicLibrary(doc)

  function update(fn: (library: Library) => Library, fields?: Record<string, string>) {
    change((d) => {
      const library = fn(musicLibrary(d))
      return {
        ...d,
        fields: fields ? { ...d.fields, ...fields } : d.fields,
        look: { ...d.look, songs: library.items, featuredMusic: library.featured },
      }
    })
  }
  function edit(id: string, fn: (song: ArtistSong) => ArtistSong) {
    update((library) => ({
      ...library,
      items: library.items.map((item) => (item.id === id ? fn(item) : item)),
    }))
  }
  function add(kind?: ArtistSong['kind']) {
    const item: ArtistSong = { id: crypto.randomUUID(), title: '', links: {}, kind }
    update((library) => ({ ...library, items: [...library.items, item] }))
    setOpenId(item.id)
  }
  function remove(id: string) {
    update((library) => ({
      items: library.items.filter((item) => item.id !== id),
      featured: library.featured.filter((selected) => selected !== id),
    }))
    setOpenId('')
  }
  function setLink(id: string, service: MusicService, value: string) {
    edit(id, (song) => ({ ...song, links: { ...song.links, [service]: value } }))
  }
  function setBandcampPlayer(id: string, value: string) {
    const player = bandcampEmbed(value)
    const href = player && value.match(/<a\b[^>]*?\shref=["'](https?:\/\/[^"']+)["']/i)?.[1]
    edit(id, (song) => ({
      ...song,
      bandcampPlayer: player || value,
      links: href && !song.links.bandcamp_url ? { ...song.links, bandcamp_url: href } : song.links,
    }))
  }

  return (
    <div className="studio-fields">
      {items.map((song) => {
        const embed = song.kind === 'spotify-embed'
        const services = playableServices(song)
        const checked = featured.includes(song.id)
        const expanded = openId === song.id
        const source = song.playFrom && services.includes(song.playFrom) ? song.playFrom : services[0]
        return (
          <fieldset className="studio-group" key={song.id}>
            <legend>{song.title || (embed ? 'New Spotify embed' : 'New song')}</legend>
            {!expanded && (
              <small>
                {listeningLinks(song)
                  .map((link) => link.label)
                  .join(' · ')}
              </small>
            )}
            <label className="studio-check">
              <input
                type="checkbox"
                checked={checked}
                disabled={!checked && !source}
                onChange={(event) => {
                  const selected = event.target.checked
                  update((library) => ({
                    ...library,
                    featured: selected
                      ? [...library.featured, song.id]
                      : library.featured.filter((id) => id !== song.id),
                  }))
                }}
              />
              Feature in Music Player
            </label>
            {!source && (
              <small>
                {embed
                  ? 'Add a Spotify link or embed code to feature this item.'
                  : 'Add a playable song link or a Bandcamp track embed to feature this song.'}
              </small>
            )}
            {checked && services.length > 1 && (
              <label>
                Plays from
                <select
                  className={inputClass}
                  value={source}
                  onChange={(event) =>
                    edit(song.id, (item) => ({ ...item, playFrom: event.target.value as MusicService }))
                  }
                >
                  {services.map((key) => (
                    <option key={key} value={key}>
                      {musicServices[key]}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <button
              type="button"
              className={buttonBaseClass('secondary')}
              aria-expanded={expanded}
              onClick={() => setOpenId(expanded ? '' : song.id)}
            >
              {expanded ? 'Close details' : embed ? 'Edit embed' : 'Edit song'}
            </button>
            {expanded && (
              <>
                <label>
                  {embed ? 'Display name' : 'Song title'}
                  <input
                    className={inputClass}
                    maxLength={160}
                    value={song.title}
                    onChange={(event) =>
                      edit(song.id, (item) => ({ ...item, title: event.target.value }))
                    }
                  />
                </label>
                {embed ? (
                  <label>
                    Spotify link or embed code
                    <input
                      className={inputClass}
                      maxLength={2048}
                      value={song.links.spotify_url ?? ''}
                      onChange={(event) =>
                        setLink(song.id, 'spotify_url', spotifyLinkFromPaste(event.target.value))
                      }
                    />
                  </label>
                ) : (
                  <>
                    {musicServiceKeys.map((key) => (
                      <label key={key}>
                        {musicServices[key]} link
                        <input
                          type="url"
                          className={inputClass}
                          maxLength={2048}
                          value={song.links[key] ?? ''}
                          onChange={(event) => setLink(song.id, key, event.target.value)}
                        />
                      </label>
                    ))}
                    <label>
                      Bandcamp track player
                      <small>Paste the track’s embed code from Bandcamp’s Share/Embed menu.</small>
                      <input
                        className={inputClass}
                        maxLength={2048}
                        value={song.bandcampPlayer ?? ''}
                        onChange={(event) => setBandcampPlayer(song.id, event.target.value.trim())}
                      />
                    </label>
                  </>
                )}
                <button type="button" onClick={() => remove(song.id)}>
                  {embed ? 'Remove embed' : 'Remove song'}
                </button>
              </>
            )}
          </fieldset>
        )
      })}
      <div className="flex flex-wrap gap-2">
        <button type="button" className={buttonBaseClass('secondary')} onClick={() => add()}>
          Add song
        </button>
        <button
          type="button"
          className={buttonBaseClass('secondary')}
          onClick={() => add('spotify-embed')}
        >
          Add Spotify embed
        </button>
      </div>
      <details>
        <summary>Listen elsewhere</summary>
        <div className="studio-fields">
          {musicServiceKeys.map((key) => (
            <label key={key}>
              {musicServices[key]} profile link
              <input
                type="url"
                className={inputClass}
                value={doc.fields[key] ?? ''}
                onChange={(event) => update((library) => library, { [key]: event.target.value })}
              />
            </label>
          ))}
        </div>
      </details>
    </div>
  )
}
