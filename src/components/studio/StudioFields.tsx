'use client'
import { StudioPhotoLibrary } from './StudioPhotoLibrary'
import { useState } from 'react'
import { ARTIST_FONTS } from '@/lib/studio/fonts'
import { THEME_PRESETS } from '@/lib/studio/presets'
import {
  fieldGroups,
  labels,
  layouts,
  pageTabs,
  tabNames,
  type StudioDoc,
  type StudioKind,
  type Look,
} from '@/lib/studio/model'
import { uploadStudioPhoto } from '@/lib/studio/upload'
import { ArtistSongsEditor } from './ArtistSongsEditor'
import {
  createProfilePageBlock,
  PROFILE_PAGE_BLOCK_REGISTRY,
  type GalleryBlockContent,
} from '@/components/profile-page/blocks/profile-page-blocks'
import { ArtistPageBlockInspector } from '@/components/profile-page/artist/ArtistPageBlockEditor'
import { inputClass, buttonBaseClass } from '@/components/ui/primitives'
const choices: Record<string, string[]> = {
  artist_type: ['solo', 'band'],
  touring_radius: ['local', 'regional', 'national', 'international'],
  age_requirement: ['all_ages', '18_plus', '21_plus'],
  is_public: ['true', 'false'],
}
export function settingsTabs(kind: StudioKind) {
  const fields = kind === 'artist' ? ['Links'] : [...Object.keys(fieldGroups[kind]), 'Genres']
  return ['Pages', 'Look', 'Layout', 'Fonts', ...fields]
}
const sectionFields: Record<string, string[]> = {
  Tagline: ['tagline'],
  Description: ['description'],
  Details: ['artist_type', 'location_city', 'location_state', 'touring_radius', 'set_length_min'],
  Members: ['members'],
}
type Props = {
  kind: StudioKind
  id: string
  name: string
  doc: StudioDoc
  panel: string
  setPanel: (p: string) => void
  genres: { id: string; name: string }[]
  change: (fn: (d: StudioDoc) => StudioDoc) => void
  uploading: (b: boolean) => void
}
export function StudioFields({
  kind,
  id,
  name,
  doc,
  panel,
  setPanel,
  genres,
  change,
  uploading,
}: Props) {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  function look(p: Partial<Look>) {
    change((d) => ({ ...d, look: { ...d.look, ...p } }))
  }
  async function photos(files: File[], done: (urls: string[]) => void, size: number) {
    setBusy(true)
    uploading(true)
    setError('')
    try {
      const urls = []
      for (const f of files) urls.push(await uploadStudioPhoto(f, kind, id, size))
      done(urls)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not upload photo.')
    } finally {
      setBusy(false)
      uploading(false)
    }
  }
  function moveBlock(index: number, step: number) {
    change((d) => {
      const blocks = [...d.blocks]
      const [moved] = blocks.splice(index, 1)
      blocks.splice(index + step, 0, moved)
      return { ...d, blocks }
    })
  }
  const artist = kind === 'artist'
  const categories = settingsTabs(kind)
  let content
  if (panel === 'Pages')
    content = pageTabs[kind].map((t) => (
      <label key={t} className="studio-page-switch">
        <span>
          <strong>{tabNames[t]}</strong>
          {t === 'home' && <small>Always on</small>}
        </span>
        <input
          type="checkbox"
          checked={doc.look.tabs.includes(t)}
          disabled={t === 'home'}
          onChange={(e) =>
            look({
              tabs: e.target.checked ? [...doc.look.tabs, t] : doc.look.tabs.filter((x) => x !== t),
            })
          }
        />
      </label>
    ))
  else if (panel === 'Layout')
    content = (
      <>
        <div
          className="studio-layout-preview"
          data-placement={doc.look.layout}
          style={{
            backgroundImage:
              'url(' +
              JSON.stringify(
                doc.look.cover || THEME_PRESETS.find((p) => p.id === doc.look.preset)?.heroArt
              ) +
              ')',
          }}
        >
          <strong>{kind === 'event' ? doc.fields.title : name}</strong>
        </div>
        <p>Choose where your photo and {kind === 'event' ? 'title' : 'name'} sit on Home.</p>
        <div className="studio-picks">
          {layouts.map((l) => (
            <button aria-pressed={doc.look.layout === l} key={l} onClick={() => look({ layout: l })}>
              <span className={'layout-swatch ' + l} aria-hidden>
                <i />
              </span>
              {l}
            </button>
          ))}
        </div>
      </>
    )
  else if (panel === 'Fonts')
    content = (['name', 'heading', 'body'] as const).map((key) => (
      <label key={key}>
        {key === 'name' ? 'Name' : key === 'heading' ? 'Headings' : 'Body text'}
        <select
          className={inputClass}
          value={doc.look.fonts[key] ?? doc.look.fonts.heading}
          onChange={(e) => look({ fonts: { ...doc.look.fonts, [key]: e.target.value } })}
        >
          {ARTIST_FONTS.filter((f) => key !== 'body' || f.body).map((f) => (
            <option key={f.id} value={f.id}>
              {f.label}
            </option>
          ))}
        </select>
      </label>
    ))
  else if (panel === 'Look')
    content = (
      <>
        <div className="studio-picks">
          {THEME_PRESETS.map((p) => (
            <button
              key={p.id}
              aria-pressed={p.id === doc.look.preset}
              onClick={() => look({ preset: p.id, accent: '' })}
            >
              <span className="preset-swatch" style={{ backgroundImage: 'url(' + p.heroArt + ')' }} />
              {p.label}
            </button>
          ))}
        </div>
        <label>
          Accent color
          <input
            type="color"
            value={doc.look.accent || THEME_PRESETS.find((p) => p.id === doc.look.preset)!.theme.accent}
            onChange={(e) => look({ accent: e.target.value })}
          />
        </label>
        {(['cover', 'avatar'] as const).map((key) => (
          <div key={key} className="studio-photo-field">
            <label>
              {key === 'cover' ? 'Cover photo' : 'Profile photo'}
              <input
                className={inputClass}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                aria-describedby={key === 'cover' ? 'studio-cover-help' : undefined}
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f)
                    void photos([f], (urls) => look({ [key]: urls[0] }), key === 'avatar' ? 400 : 1600)
                }}
              />
            </label>
            {doc.look[key] && <button onClick={() => look({ [key]: '' })}>Remove {key}</button>}
            {key === 'cover' && (
              <>
                <p id="studio-cover-help" className="text-sm text-text-secondary">
                  Background for every tab. A theme overlay keeps text readable.
                </p>
                <label htmlFor="studio-cover-opacity">
                  <span className="studio-range-label">
                    Cover photo opacity
                    <output htmlFor="studio-cover-opacity" aria-hidden="true">
                      {doc.look.coverOpacity}%
                    </output>
                  </span>
                  <input
                    id="studio-cover-opacity"
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={doc.look.coverOpacity}
                    aria-valuetext={doc.look.coverOpacity + '%'}
                    onChange={(e) => look({ coverOpacity: Number(e.target.value) })}
                  />
                </label>
              </>
            )}
          </div>
        ))}
        <StudioPhotoLibrary kind={kind} id={id} choose={(slot, url) => look({ [slot]: url })} />
        <label>
          Photo position
          <select
            className={inputClass}
            value={doc.look.focus}
            onChange={(e) => look({ focus: e.target.value })}
          >
            {['top', 'center', 'bottom'].map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <label>
          Photo treatment
          <select
            className={inputClass}
            value={doc.look.treatment}
            onChange={(e) => look({ treatment: e.target.value })}
          >
            {['natural', 'mono', 'tinted'].map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
      </>
    )
  else if (panel === 'Genres')
    content = genres.map((g) => (
      <label key={g.id} className="studio-check">
        <input
          type="checkbox"
          checked={doc.genres.includes(g.id)}
          onChange={(e) =>
            change((d) => ({
              ...d,
              genres: e.target.checked ? [...d.genres, g.id] : d.genres.filter((x) => x !== g.id),
            }))
          }
        />
        {g.name}
      </label>
    ))
  else if (panel === 'Shows' || panel === 'Lyrics') {
    const isShow = panel === 'Shows',
      key = isShow ? 'shows' : 'lyrics'
    const update = (rowId: string, field: string, value: string) =>
      change((d) => ({
        ...d,
        [key]: d[key].map((r) => (r.id === rowId ? { ...r, [field]: value } : r)),
      }))
    content = (
      <>
        {doc[key].map((row) => (
          <fieldset key={row.id} className="studio-group">
            {Object.entries(row)
              .filter(([k]) => k !== 'id')
              .map(([field, value]) => (
                <label key={field}>
                  {
                    {
                      date: 'Show date',
                      venue: 'Venue',
                      city: 'City',
                      state: 'State',
                      url: 'Ticket link',
                      title: 'Song title',
                      body: 'Lyrics',
                    }[field]
                  }
                  {field === 'body' ? (
                    <textarea
                      className={inputClass}
                      rows={7}
                      value={value}
                      onChange={(e) => update(row.id, field, e.target.value)}
                    />
                  ) : (
                    <input
                      className={inputClass}
                      type={field === 'date' ? 'date' : field === 'url' ? 'url' : 'text'}
                      value={value}
                      onChange={(e) => update(row.id, field, e.target.value)}
                    />
                  )}
                </label>
              ))}
            <button
              onClick={() => change((d) => ({ ...d, [key]: d[key].filter((r) => r.id !== row.id) }))}
            >
              Remove {isShow ? 'show' : 'song'}
            </button>
          </fieldset>
        ))}
        <button
          className={buttonBaseClass('secondary')}
          onClick={() =>
            change((d) => ({
              ...d,
              [key]: [
                ...d[key],
                isShow
                  ? { id: crypto.randomUUID(), date: '', venue: '', city: '', state: '', url: '' }
                  : { id: crypto.randomUUID(), title: '', body: '' },
              ],
            }))
          }
        >
          Add {isShow ? 'show' : 'song'}
        </button>
      </>
    )
  } else if (panel === 'Sections')
    content = (
      <>
        <div className="studio-menu">
          {doc.blocks.map((b, index) => (
            <div key={b.id} className="flex gap-2">
              <button className="flex-1" onClick={() => setPanel('block:' + b.id)}>
                {('heading' in b.content && b.content.heading) ||
                  PROFILE_PAGE_BLOCK_REGISTRY.find((r) => r.type === b.blockType)?.label}{' '}
                ↗
              </button>
              <button
                disabled={index === 0}
                aria-label="Move section up"
                onClick={() => moveBlock(index, -1)}
              >
                ↑
              </button>
              <button
                disabled={index === doc.blocks.length - 1}
                aria-label="Move section down"
                onClick={() => moveBlock(index, 1)}
              >
                ↓
              </button>
            </div>
          ))}
        </div>
        <h3>Add section</h3>
        <div className="studio-picks">
          {PROFILE_PAGE_BLOCK_REGISTRY.map((r) => (
            <button
              key={r.type}
              onClick={() => {
                const block = createProfilePageBlock(r.type)
                change((d) => ({ ...d, blocks: [...d.blocks, block] }))
                setPanel('block:' + block.id)
              }}
            >
              {r.label}
            </button>
          ))}
        </div>
      </>
    )
  else if (panel.startsWith('block:')) {
    const b = doc.blocks.find((row) => row.id === panel.slice(6))
    if (b)
      content = (
        <ArtistPageBlockInspector
          block={b}
          hideClose
          onClose={() => setPanel('Sections')}
          onChange={(next) =>
            change((d) => ({ ...d, blocks: d.blocks.map((r) => (r.id === b.id ? next : r)) }))
          }
          onDelete={() => {
            change((d) => ({ ...d, blocks: d.blocks.filter((r) => r.id !== b.id) }))
            setPanel('Sections')
          }}
          onDuplicate={() => {
            const next = { ...b, id: crypto.randomUUID() }
            change((d) => ({ ...d, blocks: [...d.blocks, next] }))
            setPanel('block:' + next.id)
          }}
          onChooseImages={(files, target) =>
            void photos(
              files,
              (urls) =>
                change((d) => ({
                  ...d,
                  blocks: d.blocks.map((r) =>
                    r.id !== b.id
                      ? r
                      : {
                          ...r,
                          content:
                            target === 'custom'
                              ? { ...r.content, imageUrl: urls[0] }
                              : {
                                  ...r.content,
                                  images: [
                                    ...(r.content as GalleryBlockContent).images,
                                    ...urls.map((url) => ({ id: crypto.randomUUID(), url, alt: '' })),
                                  ],
                                },
                        }
                  ),
                })),
              900
            )
          }
        />
      )
  } else if (artist && panel === 'Story')
    content = (
      <label>
        Story
        <textarea
          className={inputClass}
          rows={8}
          maxLength={30000}
          value={doc.look.story ?? ''}
          onChange={(e) => look({ story: e.target.value })}
        />
      </label>
    )
  else if (artist && panel === 'Music') content = <ArtistSongsEditor doc={doc} change={change} />
  else
    content = (
      <>
        {panel === 'Identity' && (
          <label>
            Artist name
            <input className={inputClass} value={name} disabled />
          </label>
        )}
        {((artist && sectionFields[panel]) || fieldGroups[kind][panel] || []).map((key) => {
          const value = doc.fields[key] ?? ''
          const set = (v: string) => change((d) => ({ ...d, fields: { ...d.fields, [key]: v } }))
          return (
            <label key={key}>
              {labels[key]}
              {choices[key] ? (
                <select
                  aria-label={labels[key]}
                  className={inputClass}
                  value={value}
                  onChange={(e) => set(e.target.value)}
                >
                  {key !== 'is_public' && <option value="">Choose</option>}
                  {choices[key].map((v) => (
                    <option key={v} value={v}>
                      {v === 'true' ? 'Public' : v === 'false' ? 'Private' : v.replaceAll('_', ' ')}
                    </option>
                  ))}
                </select>
              ) : ['description', 'members', 'artist_need_description'].includes(key) ? (
                <textarea
                  aria-label={labels[key]}
                  className={inputClass}
                  rows={5}
                  value={value}
                  onChange={(e) => set(e.target.value)}
                />
              ) : (
                <input
                  aria-label={labels[key]}
                  className={inputClass}
                  value={value}
                  type={
                    key.endsWith('_url')
                      ? 'url'
                      : key === 'event_date'
                        ? 'date'
                        : key === 'start_time'
                          ? 'time'
                          : key === 'booking_email'
                            ? 'email'
                            : 'text'
                  }
                  onChange={(e) => set(e.target.value)}
                />
              )}
            </label>
          )
        })}
      </>
    )
  return (
    <fieldset className="studio-fields" disabled={busy}>
      {categories.includes(panel) && (
        <nav className="studio-settings-tabs" aria-label="Settings categories">
          {categories.map((tab) => (
            <button type="button" key={tab} aria-pressed={panel === tab} onClick={() => setPanel(tab)}>
              {tab}
            </button>
          ))}
        </nav>
      )}
      {panel === 'Sections' && (
        <button className="text-left text-sm font-semibold" onClick={() => setPanel('Pages')}>
          ← Settings
        </button>
      )}
      {panel.startsWith('block:') && kind !== 'event' && (
        <button
          type="button"
          className="text-left text-sm font-semibold"
          onClick={() => setPanel('Sections')}
        >
          ← Sections
        </button>
      )}
      {content}
      {kind !== 'event' && panel === 'Pages' && (
        <button className={buttonBaseClass('secondary')} onClick={() => setPanel('Sections')}>
          Edit sections
        </button>
      )}
      {busy && <p role="status">Uploading photo…</p>}
      {error && <p role="alert">{error}</p>}
    </fieldset>
  )
}
