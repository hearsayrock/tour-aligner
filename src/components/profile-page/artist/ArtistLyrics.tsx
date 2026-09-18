'use client'

import { useId, useState } from 'react'
import type { ArtistPageLyric } from './ArtistPageSections'

export function ArtistLyrics({ lyrics }: { lyrics: ArtistPageLyric[] }) {
  const id = useId()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = lyrics.find((lyric) => lyric.id === selectedId) ?? lyrics[0]

  return (
    <section data-profile-scroll-card className="flex h-full min-h-0 flex-col rounded-[28px] border border-[#E6DFD3] bg-white p-6 shadow-[0_18px_42px_rgba(17,17,17,0.05)] sm:p-8">
      <div className="mb-6 shrink-0">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--profile-accent)]">Words</p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-[#111111]">Lyrics</h2>
      </div>
      <div role="tablist" aria-label="Songs" className="mb-4 flex shrink-0 flex-wrap gap-x-5 gap-y-1 border-b border-[#E6DFD3]">
        {lyrics.map((lyric, index) => (
          <button key={lyric.id} id={`${id}-tab-${index}`} type="button" role="tab" aria-selected={selected?.id === lyric.id}
            aria-controls={`${id}-panel`} tabIndex={selected?.id === lyric.id ? 0 : -1}
            onClick={() => setSelectedId(lyric.id)}
            onKeyDown={(event) => {
              if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
              event.preventDefault()
              const next = event.key === 'Home' ? 0 : event.key === 'End' ? lyrics.length - 1
                : (index + (event.key === 'ArrowRight' ? 1 : -1) + lyrics.length) % lyrics.length
              setSelectedId(lyrics[next].id)
              document.getElementById(`${id}-tab-${next}`)?.focus()
            }}
            className={`border-b-2 py-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-[var(--profile-accent)] ${selected?.id === lyric.id ? 'border-[var(--profile-accent)] font-semibold text-[#252525]' : 'border-transparent text-[#777777] hover:text-[#252525]'}`}>
            {lyric.title}
          </button>
        ))}
      </div>
      <div key={selected?.id} id={`${id}-panel`} role="tabpanel" aria-labelledby={selected ? `${id}-tab-${lyrics.indexOf(selected)}` : undefined}
        tabIndex={0} data-profile-scroll-viewport className="profile-lyrics-scroll min-h-24 flex-1 overflow-y-auto overscroll-contain pr-3 focus-visible:outline-2 focus-visible:outline-[var(--profile-accent)]">
        <p className="whitespace-pre-wrap text-sm leading-7 text-[#555555]">{selected?.body}</p>
      </div>
      <div aria-hidden="true" className="hidden" data-profile-width-content>
        {lyrics.map((lyric) => <p key={lyric.id} className="whitespace-pre text-sm leading-7">{lyric.body}</p>)}
      </div>
    </section>
  )
}
