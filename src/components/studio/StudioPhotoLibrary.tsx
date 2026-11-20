'use client'

import { useState } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { mediaPattern, type StudioKind } from '@/lib/studio/model'

type Slot = 'cover' | 'avatar' | 'wallpaper'

export function StudioPhotoLibrary({
  kind,
  id,
  choose,
}: {
  kind: StudioKind
  id: string
  choose: (slot: Slot, url: string) => void
}) {
  const [urls, setUrls] = useState<string[]>([])
  const [slot, setSlot] = useState<Slot>('cover')
  const [open, setOpen] = useState(false),
    [loading, setLoading] = useState(false),
    [more, setMore] = useState(true)
  const [error, setError] = useState(''),
    [offset, setOffset] = useState(0)
  async function load(start: number) {
    setLoading(true)
    setError('')
    try {
      const prefix = kind + '/' + id
      const { data, error } = await createClient()
        .storage.from('studio-media')
        .list(prefix, { offset: start, limit: 18, sortBy: { column: 'created_at', order: 'desc' } })
      if (error) throw error
      const page = (data ?? [])
        .map((file) => '/studio-media/' + prefix + '/' + file.name)
        .filter((url) => mediaPattern.test(url))
      setUrls((previous) => (start ? [...previous, ...page] : page))
      setOffset(start + (data ?? []).length)
      setMore(data?.length === 18)
    } catch {
      setError('Could not load photos. Try again.')
    } finally {
      setLoading(false)
    }
  }
  return (
    <div className="studio-group">
      <button
        aria-expanded={open}
        onClick={() => {
          setOpen(!open)
          if (!open) void load(0)
        }}
      >
        Previously uploaded photos
      </button>
      {open && (
        <div className="studio-fields mt-3">
          <label>
            Use photo as
            <select value={slot} onChange={(e) => setSlot(e.target.value as Slot)}>
              <option value="cover">Cover photo</option>
              <option value="avatar">Profile photo</option>
              <option value="wallpaper">Wallpaper</option>
            </select>
          </label>
          <div className="grid grid-cols-3 gap-2">
            {urls.map((url, index) => (
              <button
                key={url}
                aria-label={'Use photo ' + (index + 1)}
                onClick={() => choose(slot, url)}
              >
                <Image
                  alt=""
                  src={url}
                  unoptimized
                  width={120}
                  height={90}
                  className="aspect-[4/3] w-full rounded-ds-lg object-cover"
                />
              </button>
            ))}
          </div>
          {!loading && !urls.length && !error && <p>No uploaded photos yet.</p>}
          {error && <p role="alert">{error}</p>}
          {(more || error) && (
            <button disabled={loading} onClick={() => void load(offset)}>
              {loading ? 'Loading photos…' : error ? 'Retry' : 'More photos'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
