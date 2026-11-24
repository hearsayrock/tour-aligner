'use client'

import { useLayoutEffect, useRef } from 'react'
import type { MusicService } from '@/lib/studio/model'

interface YouTubePlayer {
  playVideo(): void
  destroy(): void
}

interface YouTubeApi {
  Player: new (
    frame: HTMLIFrameElement,
    options: {
      events: {
        onReady(event: { target: YouTubePlayer }): void
        onStateChange(event: { data: number }): void
      }
    }
  ) => YouTubePlayer
  PlayerState: { ENDED: number }
}

interface SoundCloudWidget {
  bind(event: string, listener: () => void): void
  unbind(event: string): void
  play(): void
}

interface SoundCloudApi {
  Widget: {
    (frame: HTMLIFrameElement): SoundCloudWidget
    Events: { READY: string; FINISH: string }
  }
}

declare global {
  interface Window {
    YT?: YouTubeApi
    onYouTubeIframeAPIReady?: () => void
    SC?: SoundCloudApi
  }
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = src
    script.onload = () => resolve()
    script.onerror = () => {
      script.remove()
      reject(new Error('Could not load ' + src))
    }
    document.head.appendChild(script)
  })
}

let youtube: Promise<YouTubeApi> | undefined
function loadYouTube() {
  if (window.YT?.Player) return Promise.resolve(window.YT)
  return (youtube ??= new Promise<YouTubeApi>((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      window.onYouTubeIframeAPIReady = previous
      resolve(window.YT!)
      previous?.()
    }
    loadScript('https://www.youtube.com/iframe_api').catch((error) => {
      window.onYouTubeIframeAPIReady = previous
      youtube = undefined
      reject(error)
    })
  }))
}

let soundcloud: Promise<void> | undefined
async function loadSoundCloud() {
  if (!window.SC?.Widget) {
    await (soundcloud ??= loadScript('https://w.soundcloud.com/player/api.js').catch((error) => {
      soundcloud = undefined
      throw error
    }))
  }
  return window.SC!
}

const permissions = 'autoplay; encrypted-media; fullscreen; picture-in-picture'

export function ArtistSongPlayer({
  src,
  title,
  source,
  autoplay,
  onFinished,
}: {
  src: string
  title: string
  source: MusicService
  autoplay: boolean
  onFinished: () => void
}) {
  const host = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    if (!host.current) return

    // The YouTube API can remove its iframe on destroy. Let the effect own that DOM node.
    const frame = document.createElement('iframe')
    const url = new URL(src)
    if (source === 'youtube_url') {
      url.searchParams.set('enablejsapi', '1')
      url.searchParams.set('origin', window.location.origin)
      url.searchParams.set('playsinline', '1')
    }
    frame.title = title
    frame.className = 'artist-service-player'
    frame.allow = permissions
    frame.allowFullscreen = true
    // SoundCloud sends READY once. Its SDK must be listening before the iframe navigates.
    if (source !== 'soundcloud_url') frame.src = url.href
    host.current.appendChild(frame)

    let active = true
    let disconnect: (() => void) | undefined
    async function connect() {
      if (source === 'youtube_url') {
        const api = await loadYouTube()
        if (!active) return
        const player = new api.Player(frame, {
          events: {
            onReady: ({ target }) => {
              if (active && autoplay) target.playVideo()
            },
            onStateChange: ({ data }) => {
              if (active && data === api.PlayerState.ENDED) onFinished()
            },
          },
        })
        disconnect = () => player.destroy()
      } else if (source === 'soundcloud_url') {
        const { Widget } = await loadSoundCloud()
        if (!active) return
        frame.src = url.href
        const widget = Widget(frame)
        widget.bind(Widget.Events.FINISH, () => {
          if (active) onFinished()
        })
        widget.bind(Widget.Events.READY, () => {
          if (active && autoplay) widget.play()
        })
        disconnect = () => {
          widget.unbind(Widget.Events.FINISH)
          widget.unbind(Widget.Events.READY)
        }
      }
    }
    // Native controls remain available when a visitor blocks the provider script.
    void connect().catch(() => {
      if (active && !frame.hasAttribute('src')) frame.src = url.href
    })
    return () => {
      active = false
      disconnect?.()
      frame.remove()
    }
  }, [src, title, source, autoplay, onFinished])

  return <div className="contents" ref={host} />
}
