'use client'
import { useCallback, useImperativeHandle, useState, type Ref } from 'react'
import { ChevronDown, ChevronUp, ExternalLink, ListMusic, SkipBack, SkipForward } from 'lucide-react'
import { listeningLinks, type PlayerSong } from '@/lib/studio/songs'
import { musicServices, type MusicService } from '@/lib/studio/model'
import { StudioSheet } from './StudioSheet'
import { ArtistSongPlayer } from './ArtistSongPlayer'
import { buttonBaseClass } from '@/components/ui/primitives'

const icons: Record<MusicService, string> = {
  spotify_url: 'spotify',
  apple_music_url: 'applemusic',
  bandcamp_url: 'bandcamp',
  youtube_url: 'youtube',
  soundcloud_url: 'soundcloud',
}

function ServiceIcon({ service }: { service: MusicService }) {
  return (
    <span
      aria-hidden="true"
      className="artist-service-icon"
      style={{ maskImage: 'url(/touraligner/music/' + icons[service] + '.svg)' }}
    />
  )
}

export default function ArtistMusicBar({
  songs,
  controller,
}: {
  songs: PlayerSong[]
  controller: Ref<{ choose: (id: string) => void }>
}) {
  const [selection, setSelection] = useState({ index: 0, autoplay: false })
  const [expanded, setExpanded] = useState(true)
  const [options, setOptions] = useState(false)
  const song = songs[selection.index]
  const source = song.source
  const links = listeningLinks(song)
  const service = musicServices[source]

  function choose(id: string) {
    const index = songs.findIndex((item) => item.id === id)
    if (index < 0) return
    setSelection({ index, autoplay: true })
    setExpanded(true)
    setOptions(false)
  }
  function skip(step: number) {
    setSelection((current) => ({
      index: (current.index + step + songs.length) % songs.length,
      autoplay: expanded,
    }))
  }
  const finished = useCallback(() => {
    // A late or duplicate finish must belong to the selection that is still playing.
    setSelection((current) =>
      current === selection ? { index: (current.index + 1) % songs.length, autoplay: true } : current
    )
  }, [selection, songs.length])

  function togglePlayer() {
    setExpanded(!expanded)
    setSelection((current) => ({ index: current.index, autoplay: false }))
  }
  useImperativeHandle(controller, () => ({ choose }))
  return (
    <>
      <aside
        className="artist-dock"
        aria-label="Artist music player"
        data-music-source={source}
        data-spotify-collection={
          (song.kind === 'spotify-embed' && !song.embed.includes('/embed/track/')) || undefined
        }
      >
        <div className="artist-dock-controls">
          <button
            className="artist-now"
            onClick={togglePlayer}
            aria-label={(expanded ? 'Close ' : 'Open ') + service + ' player'}
            aria-expanded={expanded}
          >
            <ServiceIcon service={source} />
            <span>
              <strong>{song.title}</strong>
              <small>{service}</small>
            </span>
            {expanded ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </button>
          <div className="artist-transport">
            {songs.length > 1 && (
              <>
                <button aria-label="Previous featured item" onClick={() => skip(-1)}>
                  <SkipBack size={18} />
                </button>
                <button aria-label="Next featured item" onClick={() => skip(1)}>
                  <SkipForward size={18} />
                </button>
              </>
            )}
            <button aria-label="Featured music and listening links" onClick={() => setOptions(true)}>
              <ListMusic size={20} />
            </button>
          </div>
        </div>
        {expanded && (
          <ArtistSongPlayer
            title={song.title + ' on ' + service}
            src={song.embed}
            source={source}
            autoplay={selection.autoplay}
            onFinished={finished}
          />
        )}
        <div className="artist-other-services">
          {links
            .filter((link) => link.key !== source)
            .map((link) => (
              <a
                key={link.key}
                href={link.url}
                target="_blank"
                rel="noreferrer"
                title={'Open on ' + link.label}
                aria-label={'Open ' + song.title + ' on ' + link.label}
              >
                <ServiceIcon service={link.key} />
              </a>
            ))}
        </div>
      </aside>
      {options && (
        <StudioSheet title={song.title} close={() => setOptions(false)}>
          <div className="studio-fields">
            {links.map((link) => (
              <a
                key={link.key}
                className={buttonBaseClass('secondary')}
                href={link.url}
                target="_blank"
                rel="noreferrer"
              >
                <ServiceIcon service={link.key} />
                {link.label}
                <ExternalLink size={16} />
              </a>
            ))}
            {songs.length > 1 && (
              <div className="studio-menu" aria-label="Featured music">
                {songs.map(({ id, title }) => (
                  <button key={id} aria-pressed={id === song.id} onClick={() => choose(id)}>
                    {title}
                  </button>
                ))}
              </div>
            )}
          </div>
        </StudioSheet>
      )}
    </>
  )
}
