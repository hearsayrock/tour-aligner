'use client'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { buttonBaseClass, inputClass } from '@/components/ui/primitives'
import { THEME_PRESETS, getPreset } from '@/lib/studio/presets'
import { createStudioArtist, studioWrite } from '@/app/actions/studio'
import { uploadStudioPhoto } from '@/lib/studio/upload'
import {
  musicServices,
  spotifyEmbed,
  urlValue,
  type Changes,
  type MusicService,
} from '@/lib/studio/model'
import { StudioSheet } from './StudioSheet'
import './studio.css'
export function ArtistSetup({ returnTo }: { returnTo: string | null }) {
  const router = useRouter(),
    [step, setStep] = useState(1),
    [name, setName] = useState(''),
    [type, setType] = useState('band'),
    [city, setCity] = useState(''),
    [region, setRegion] = useState('')
  const [preset, setPreset] = useState('basement'),
    [service, setService] = useState<MusicService>('spotify_url'),
    [url, setUrl] = useState(''),
    [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [id] = useState(() => crypto.randomUUID()),
    [created, setCreated] = useState('')
  const [previewOpen, setPreviewOpen] = useState(false),
    [localCover, setLocalCover] = useState('')
  useEffect(
    () => () => {
      if (localCover) URL.revokeObjectURL(localCover)
    },
    [localCover]
  )
  const palette = getPreset(preset)
  const poster = (
    <figure
      className="setup-poster"
      style={{ backgroundColor: palette.theme.background, color: palette.theme.text }}
    >
      <Image src={localCover || palette.heroArt} unoptimized fill alt="" className="object-cover" />
      <figcaption style={{ backgroundColor: palette.theme.background }}>
        <small className="font-ds-mono uppercase">{type === 'solo' ? 'Solo artist' : 'Band'}</small>
        <strong className="block break-words font-ds-display text-6xl leading-none font-extrabold uppercase">
          {name || 'Artist name'}
        </strong>
        <span>{[city, region].filter(Boolean).join(', ')}</span>
      </figcaption>
    </figure>
  )
  async function next(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (step < 3) {
      setStep(step + 1)
      return
    }
    if (url.trim() && !urlValue(url.trim())) {
      setError('Enter a complete music link.')
      return
    }
    setBusy(true)
    try {
      const patch: Changes = {
        look: { preset, ...(url.trim() && { musicSource: service }) },
        fields: {
          artist_type: type,
          location_city: city.trim(),
          location_state: region.trim(),
          [service]: url.trim(),
          ...(service === 'spotify_url' && spotifyEmbed(url.trim())
            ? { featured_track_url: url.trim() }
            : {}),
        },
      }
      const result = created ? { slug: created } : await createStudioArtist(id, name.trim(), patch)
      if (!result.slug)
        throw Error(('error' in result && result.error) || 'Could not create this artist.')
      setCreated(result.slug)
      if (file) {
        const cover = await uploadStudioPhoto(file, 'artist', id)
        const saved = await studioWrite('artist', id, 1, 'save', {
          ...patch,
          look: { ...patch.look, cover },
        })
        if (saved.error) throw Error(saved.error)
      }
      router.push(returnTo || '/bands/' + result.slug + '?edit=1')
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not finish setup.')
      setBusy(false)
    }
  }
  return (
    <main data-theme="cream" className="min-h-svh bg-page px-5 py-8 text-ink">
      <div className="mx-auto max-w-6xl">
        <Image
          src="/touraligner/brand/touraligner-logo-dark.svg"
          alt="TourAligner"
          width={140}
          height={39}
        />
        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)]">
          <form
            className="mt-8 space-y-6 rounded-ds-3xl border border-edge bg-surface p-6 shadow-hard sm:p-10"
            onSubmit={next}
          >
            <p className="font-ds-mono text-xs uppercase">Artist setup · {step} of 3</p>
            <h1 className="font-ds-display text-5xl leading-none font-extrabold uppercase">
              {['Who’s on stage?', 'Pick a look', 'Got music online?'][step - 1]}
            </h1>
            <fieldset disabled={busy || !!created} className="studio-fields">
              {step === 1 ? (
                <>
                  <label>
                    Artist name
                    <input
                      required
                      maxLength={160}
                      className={inputClass}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </label>
                  <p className="text-sm">Your artist name and public address are locked after setup.</p>
                  <label>
                    Artist type
                    <select
                      className={inputClass}
                      value={type}
                      onChange={(e) => setType(e.target.value)}
                    >
                      <option value="band">Band</option>
                      <option value="solo">Solo artist</option>
                    </select>
                  </label>
                  <label>
                    City
                    <input
                      className={inputClass}
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                    />
                  </label>
                  <label>
                    State
                    <input
                      className={inputClass}
                      value={region}
                      onChange={(e) => setRegion(e.target.value)}
                    />
                  </label>
                </>
              ) : step === 2 ? (
                <>
                  <div className="studio-picks">
                    {THEME_PRESETS.map((p) => (
                      <button
                        type="button"
                        key={p.id}
                        aria-pressed={preset === p.id}
                        onClick={() => setPreset(p.id)}
                      >
                        <span
                          className="preset-swatch"
                          style={{ backgroundImage: 'url(' + p.heroArt + ')' }}
                        />
                        {p.label}
                      </button>
                    ))}
                  </div>
                  <label>
                    Cover photo (optional)
                    <input
                      className={inputClass}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={(e) => {
                        const photo = e.target.files?.[0] ?? null
                        setFile(photo)
                        setLocalCover(photo ? URL.createObjectURL(photo) : '')
                      }}
                    />
                  </label>
                </>
              ) : (
                <>
                  <label>
                    Music service
                    <select
                      className={inputClass}
                      value={service}
                      onChange={(e) => setService(e.target.value as MusicService)}
                    >
                      {Object.entries(musicServices).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Music link (optional)
                    <input
                      type="url"
                      className={inputClass}
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                    />
                  </label>
                </>
              )}
            </fieldset>
            {error && <p role="alert">{error}</p>}
            {created && error && (
              <button
                type="button"
                onClick={() => router.push(returnTo || '/bands/' + created + '?edit=1')}
              >
                Continue without photo
              </button>
            )}
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                className={buttonBaseClass('secondary') + ' lg:hidden'}
                onClick={() => setPreviewOpen(true)}
              >
                Preview
              </button>
              {step > 1 && !created && (
                <button
                  type="button"
                  className={buttonBaseClass('secondary')}
                  disabled={busy}
                  onClick={() => setStep(step - 1)}
                >
                  Back
                </button>
              )}
              <button className={buttonBaseClass()} disabled={busy || (step === 1 && !name.trim())}>
                {busy ? 'Saving…' : step === 3 ? 'Create artist profile' : 'Continue'}
              </button>
            </div>
          </form>
          <aside className="mt-8 hidden lg:block" aria-label="Live profile preview">
            {poster}
          </aside>
        </div>
        {previewOpen && (
          <StudioSheet title="Preview" close={() => setPreviewOpen(false)}>
            {poster}
          </StudioSheet>
        )}
      </div>
    </main>
  )
}
