'use client'
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
  type CSSProperties,
} from 'react'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowUpRight, Eye, Monitor, Pencil, Redo2, Settings, Share2, Smartphone, Undo2,
} from 'lucide-react'
import { ArtistShows, type ListedShow } from './ArtistShows'
import { StudioSheet } from './StudioSheet'
import { StudioFields, settingsTabs } from './StudioFields'
import { ArtistHome } from './ArtistHome'
import { StudioEditSection } from './StudioEditSection'
import { artistMusic, listeningLinks } from '@/lib/studio/songs'
import { StudioInquiry, type InquiryProps } from './StudioInquiry'
import { buttonBaseClass } from '@/components/ui/primitives'
import {
  ProfilePageBlockView,
  createProfilePageBlock,
  videoEmbedUrl,
  type GalleryBlockContent,
} from '@/components/profile-page/blocks/profile-page-blocks'
import {
  applyChanges,
  changedValues,
  studioName,
  pageTabs,
  tabNames,
  urlValue,
  labels,
  musicServices,
  socialServices,
  type Changes,
  type StudioKind,
  type StudioDoc,
  type StudioTab,
} from '@/lib/studio/model'
import { fontStack, googleFontsHref, resolveFonts } from '@/lib/studio/fonts'
import { getPreset } from '@/lib/studio/presets'
import { studioWrite } from '@/app/actions/studio'
import './studio.css'
import './artist-studio.css'

// Keep the visitor's player mounted across profile tabs.
const ArtistMusicBar = dynamic(() => import('./ArtistMusicBar'), { ssr: false })
const historyLimit = 30
type EditHistory = { undo: StudioDoc[]; redo: StudioDoc[] }

interface Props {
  kind: StudioKind
  id: string
  name: string
  href: string
  base: StudioDoc
  genres: { id: string; name: string }[]
  owner: boolean
  draft?: { revision: number; changes: Changes }
  published: boolean
  dates?: ListedShow[]
  location?: string
  availability?: ReactNode
  actions?: ReactNode
  aboutExtras?: ReactNode
  lineup?: ReactNode
  inquiry?: InquiryProps
}
function subscribe(fn: () => void) {
  window.addEventListener('hashchange', fn)
  return () => window.removeEventListener('hashchange', fn)
}
// Choose a readable foreground for the artist's custom accent.
function accentInk(hex: string) {
  const rgb = [1, 3, 5]
    .map((offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255)
    .map((channel) => (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4))
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722 > 0.179
    ? 'var(--tads-ink-black)'
    : 'var(--tads-on-danger)'
}
function niceDate(date: string) {
  const d = new Date(date + 'T12:00:00')
  return isNaN(+d)
    ? date
    : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
export function StudioPage(p: Props) {
  const router = useRouter()
  const [base, setBase] = useState(p.base)
  const player = useRef<{ choose: (id: string) => void }>(null)
  const canvas = useRef<HTMLDivElement>(null)
  const [doc, setDoc] = useState(() => applyChanges(p.base, p.draft?.changes ?? {}))
  const [history, setHistory] = useState<EditHistory>({ undo: [], redo: [] })
  const inputField = useRef<Element | null>(null)
  const lastEditedField = useRef<Element | null>(null)
  const saving = useRef(false)
  const [hasSavedDraft, setHasSavedDraft] = useState(
    () => Object.keys(p.draft?.changes ?? {}).length > 0
  )
  const current = useRef(doc),
    saved = useRef<StudioDoc | null>(doc),
    rev = useRef(p.draft?.revision ?? 0),
    queue = useRef(Promise.resolve(true))
  const [photo, setPhoto] = useState<GalleryBlockContent['images'][number] | null>(null)
  const [panel, setPanel] = useState(''),
    [preview, setPreview] = useState(false),
    [phone, setPhone] = useState(false),
    [working, setWorking] = useState(false),
    [uploading, setUploading] = useState(false)
  const [status, setStatus] = useState(''),
    [error, setError] = useState(''),
    [published, setPublished] = useState(p.published)
  const [contact, setContact] = useState<'booking' | 'message' | null>(p.inquiry?.open || null),
    [date, setDate] = useState(p.inquiry?.date ?? ''),
    [copied, setCopied] = useState('')
  const edit = !!p.draft && !preview
  const draft = !!p.draft
  const hash = useSyncExternalStore(
    subscribe,
    () => location.hash.slice(1),
    () => 'home'
  )
  const f = doc.fields,
    look = doc.look,
    preset = getPreset(look.preset),
    fonts = resolveFonts(look.fonts)
  const fontHref = googleFontsHref([fonts.name, fonts.heading, fonts.body])
  const cover = look.cover || preset.heroArt
  const artwork = (
    <div className="studio-art" data-treatment={look.treatment}>
      <Image src={cover} unoptimized fill sizes="100vw" alt="" priority />
    </div>
  )
  const title = p.kind === 'event' ? f.title : p.name
  const place = p.location || [f.location_city, f.location_state].filter(Boolean).join(', ')
  const musicLinks = Object.entries(musicServices).filter(([key]) => !!urlValue(f[key]))
  const social = Object.entries(socialServices).filter(([key]) => !!urlValue(f[key]))
  const videos = doc.blocks.filter(
    (b) => b.blockType === 'video' && 'url' in b.content && videoEmbedUrl(b.content.url)
  )
  const artist = p.kind === 'artist'
  const members =
    f.members
      ?.split('\n')
      .map((name) => name.trim())
      .filter(Boolean) ?? []
  const gallery = doc.blocks.find((block) => block.blockType === 'gallery')
  const photos = gallery && 'images' in gallery.content ? gallery.content.images : []
  const { songs, queue: playerSongs } = artistMusic(doc)
  const hasDock = artist && playerSongs.length > 0 && (edit || look.tabs.includes('music'))
  const hasMusic = !!songs.length || !!playerSongs.length || !!musicLinks.length || !!videos.length
  const tabs = pageTabs[p.kind].filter(
    (t) => edit || (look.tabs.includes(t) && (t !== 'music' || hasMusic) && (t !== 'lineup' || p.lineup))
  )
  const tab: StudioTab = tabs.find((t) => t === hash) ?? 'home'
  const dates = [...doc.shows, ...(p.dates ?? [])]
    .filter((show) => show.date)
    .sort((a, b) => a.date.localeCompare(b.date))
  const today = new Date().toISOString().slice(0, 10),
    upcoming = dates.filter((s) => s.date >= today),
    past = dates.filter((s) => s.date < today).reverse()
  function updateDraft(next: StudioDoc) {
    current.current = next
    setDoc(next)
    setStatus(next === saved.current && !saving.current ? 'Draft saved' : 'Saving draft…')
    setError('')
  }
  function endFieldEdit() {
    lastEditedField.current = null
  }
  function change(fn: (d: StudioDoc) => StudioDoc) {
    const previous = current.current
    const next = fn(previous)
    const continuing = inputField.current !== null && inputField.current === lastEditedField.current
    if (previous === next) return
    if (!continuing) {
      if (!Object.keys(changedValues(previous, next)).length) return
      setHistory(({ undo }) => ({ undo: [...undo, previous].slice(-historyLimit), redo: [] }))
    }
    lastEditedField.current = inputField.current
    updateDraft(next)
  }
  function stepHistory(direction: keyof EditHistory) {
    const steps = history[direction]
    const next = steps.at(-1)
    if (!next) return
    const opposite = direction === 'undo' ? 'redo' : 'undo'
    setHistory({
      ...history,
      [direction]: steps.slice(0, -1),
      [opposite]: [...history[opposite], current.current],
    })
    endFieldEdit()
    updateDraft(next)
  }
  function flush() {
    const task = async () => {
      const snapshot = current.current
      if (snapshot === saved.current) return true
      try {
        saving.current = true
        const changes = changedValues(base, snapshot)
        const r = await studioWrite(p.kind, p.id, rev.current, 'save', changes)
        if (r.error || r.revision == null) throw Error(r.error || 'Could not save draft.')
        rev.current = r.revision
        saved.current = snapshot
        setHasSavedDraft(Object.keys(changes).length > 0)
        if (current.current === snapshot) {
          setError('')
          setStatus('Draft saved')
        }
        return true
      } catch (e) {
        saved.current = null
        setError(e instanceof Error ? e.message : 'Could not save draft.')
        setStatus('Unsaved changes')
        return false
      } finally {
        saving.current = false
      }
    }
    queue.current = queue.current.then(task, task)
    return queue.current
  }
  const finishing = useRef(false)
  const saveRef = useRef(flush)
  useEffect(() => {
    saveRef.current = flush
  })
  useEffect(() => {
    // Undo can restore the saved snapshot while a newer snapshot is still being written.
    if (!draft || (doc === saved.current && !saving.current)) return
    const timer = setTimeout(() => {
      if (!finishing.current) void saveRef.current()
    }, 550)
    return () => clearTimeout(timer)
  }, [doc, draft])
  useEffect(() => {
    if (!draft) return
    const leave = (e: BeforeUnloadEvent) => {
      if (current.current !== saved.current || saving.current) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', leave)
    return () => window.removeEventListener('beforeunload', leave)
  }, [draft])
  async function finish(op: 'publish' | 'discard') {
    if (finishing.current) return
    finishing.current = true
    setWorking(true)
    setError('')
    try {
      if (op === 'publish' && !(await flush())) return
      await queue.current
      const r = await studioWrite(p.kind, p.id, rev.current, op, {})
      if (r.error || r.revision == null) throw Error(r.error || 'Could not update this page.')
      rev.current = r.revision
      setHasSavedDraft(false)
      setHistory({ undo: [], redo: [] })
      endFieldEdit()
      if (op === 'discard') {
        current.current = base
        saved.current = base
        setDoc(base)
        setStatus('Draft discarded')
      } else {
        setBase(current.current)
        setPublished(p.kind !== 'event' || f.is_public === 'true')
        setStatus('Changes published')
        router.refresh()
      }
      setPanel('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update this page.')
    } finally {
      finishing.current = false
      setWorking(false)
    }
  }
  function pick(t: StudioTab) {
    window.location.assign('#' + t)
    window.scrollTo({ top: 0, behavior: 'instant' })
    if (phone) canvas.current?.scrollTo({ top: 0, behavior: 'instant' })
  }
  function section(target: string, label: string, children: ReactNode) {
    function openSection() {
      if (target === 'new:video' || target === 'new:gallery') {
        const block = createProfilePageBlock(target === 'new:gallery' ? 'gallery' : 'video')
        change((d) => ({ ...d, blocks: [...d.blocks, block] }))
        setPanel('block:' + block.id)
      } else setPanel(target)
    }
    return (
      <StudioEditSection label={label} onEdit={edit ? openSection : undefined}>
        {children}
      </StudioEditSection>
    )
  }
  const idea = !look.cover
    ? { panel: 'Look', label: 'Add a cover photo' }
    : !f.description
      ? { panel: p.kind === 'event' ? 'Details' : 'About', label: 'Add a description' }
      : p.kind === 'artist' && !hasMusic
        ? { panel: 'Music', label: 'Add a music link' }
        : null
  const showBook = !!p.inquiry
  const bookButton = showBook ? (
    <button className={buttonBaseClass()} onClick={() => setContact('booking')}>
      Book {p.name}
      <ArrowUpRight size={16} />
    </button>
  ) : null
  const renderLinks = (links: [string, string][]) =>
    links.map(([key, label]) => (
      <a key={key} className="studio-link" href={urlValue(f[key])} target="_blank" rel="noreferrer">
        {label}
        <ArrowUpRight size={15} />
      </a>
    ))
  const facts = (
    <aside className="studio-facts">
      {artist &&
        look.tabs.includes('shows') &&
        (upcoming[0] || edit) &&
        section(
          'Shows',
          'Edit shows',
          upcoming[0] ? (
            <button className="studio-fact" onClick={() => pick('shows')}>
              <small>Next show</small>
              <strong>{upcoming[0].venue}</strong>
              {niceDate(upcoming[0].date)}
            </button>
          ) : (
            <small>Next show</small>
          )
        )}
      {artist &&
        look.tabs.includes('music') &&
        (hasMusic || edit) &&
        section(
          'Music',
          'Edit music',
          <div className="studio-fact">
            <small>Listen</small>
            {renderLinks(musicLinks)}
            {!musicLinks.length && hasMusic && (
              <button className="studio-link" onClick={() => pick('music')}>
                Music <ArrowUpRight size={15} />
              </button>
            )}
          </div>
        )}
      {artist &&
        look.tabs.includes('about') &&
        (members.length > 0 || edit) &&
        section(
          'Members',
          'Edit members',
          <div className="studio-fact">
            <small>On stage</small>
            <ul className="studio-chips">
              {members.map((member, i) => (
                <li key={i}>{member}</li>
              ))}
            </ul>
          </div>
        )}
      {artist &&
        look.tabs.includes('about') &&
        (photos.length > 0 || edit) &&
        section(
          gallery ? 'block:' + gallery.id : 'new:gallery',
          gallery ? 'Edit photos' : 'Add photos',
          <div className="studio-fact">
            <small>Photos</small>
            <div className="artist-photo-strip">
              {photos.slice(0, 3).map((image, i) => (
                <button
                  key={image.id}
                  aria-label={image.alt || 'View photo ' + (i + 1)}
                  onClick={() => setPhoto(image)}
                >
                  <Image unoptimized src={image.url} alt="" width={90} height={90} />
                </button>
              ))}
            </div>
          </div>
        )}
      {artist &&
        (social.length > 0 || edit) &&
        section(
          'Links',
          'Edit links',
          <div className="studio-fact">
            <small>Find the artist</small>
            {renderLinks(social)}
          </div>
        )}
      {p.kind === 'venue' &&
        (social.length > 0 || edit) &&
        section(
          'Links',
          'Edit links',
          <div className="studio-fact">
            <small>Find the venue</small>
            {renderLinks(social)}
          </div>
        )}
      {p.kind === 'event' &&
        section(
          'Details',
          'Edit details',
          <div className="studio-fact">
            <small>Show details</small>
            <strong>{f.event_date && niceDate(f.event_date)}</strong>
            {f.start_time?.slice(0, 5)}
            {place && <p>{place}</p>}
          </div>
        )}
      {p.kind === 'venue' &&
        section(
          'About',
          'Edit details',
          <div className="studio-fact">
            <small>Room details</small>
            <strong>{place || p.name}</strong>
            {f.capacity && <p>{f.capacity} capacity</p>}
          </div>
        )}
    </aside>
  )
  const detailKeys =
    p.kind === 'event'
      ? [
          'event_date',
          'start_time',
          'attendee_capacity',
          'artist_need_description',
          'needed_artist_count',
        ]
      : p.kind === 'venue'
        ? [
            'location_address',
            'location_zip',
            'capacity',
            'age_requirement',
            'default_bill_cap',
            'booking_email',
            'phone',
          ]
        : ['artist_type', 'touring_radius', 'set_length_min', 'members']
  const shareUrl = () => location.origin + p.href + (tab === 'home' ? '' : '#' + tab)
  const variables = {
    '--ta-bg': preset.theme.background,
    '--ta-surface': preset.theme.surface,
    '--ta-surface-alt': preset.theme.surfaceAlt,
    '--ta-text': preset.theme.text,
    '--ta-muted': preset.theme.textMuted,
    '--ta-accent': look.accent || preset.theme.accent,
    '--ta-on-accent': accentInk(look.accent || preset.theme.accent),
    '--profile-accent': look.accent || preset.theme.accent,
    '--ta-heading': fontStack(fonts.heading),
    '--ta-name': fontStack(fonts.name),
    '--ta-body': fontStack(fonts.body),
    '--ta-name-weight': fonts.name.weight,
    '--ta-heading-weight': fonts.heading.weight,
    '--ta-heading-case': fonts.heading.uppercase ? 'uppercase' : 'none',
    '--ta-heading-width': fonts.heading.width,
    '--ta-heading-leading': fonts.heading.leading,
    '--ta-case': fonts.name.uppercase ? 'uppercase' : 'none',
    '--ta-focus': look.focus,
    '--ta-cover-opacity': look.coverOpacity / 100,
    '--ta-fit':
      Math.min(
        20,
        138 / Math.max(...(title || p.name).split(/\s+/).map((w) => w.length), 1) / fonts.name.width
      ) + 'cqw',
  } as CSSProperties
  return (
    <div
      className="studio-root"
      data-kind={p.kind}
      style={variables}
      data-editing={draft || undefined}
      onChangeCapture={(event) => {
        const field = event.target
        inputField.current =
          field instanceof HTMLTextAreaElement ||
          (field instanceof HTMLInputElement &&
            ['text', 'email', 'url', 'tel', 'number', 'range', 'color'].includes(field.type))
            ? field
            : null
      }}
      onChange={() => {
        inputField.current = null
      }}
      onBlurCapture={endFieldEdit}
      onPointerDownCapture={endFieldEdit}
    >
      {fontHref && <link rel="stylesheet" href={fontHref} precedence="default" />}
      {draft && (
        <div className="studio-toolbar" data-theme="light">
          <strong>
            <span>{studioName[p.kind]}</span>
            <small aria-hidden="true">
              {status === 'Draft saved'
                ? 'Saved'
                : status === 'Unsaved changes'
                  ? 'Unsaved'
                  : status === 'Saving draft…'
                    ? 'Saving…'
                    : 'Draft'}
            </small>
          </strong>
          {edit && idea && (
            <button className="studio-idea" onClick={() => setPanel(idea.panel)}>
              {idea.label}
            </button>
          )}
          <button aria-pressed={preview} onClick={() => setPreview(!preview)}>
            {preview ? <Pencil /> : <Eye />}
            {preview ? 'Edit' : 'Preview'}
          </button>
          <button
            className="studio-device-toggle"
            aria-label={phone ? 'Desktop preview' : 'Phone preview'}
            onClick={() => setPhone(!phone)}
          >
            {phone ? <Monitor /> : <Smartphone />}
          </button>
          <button onClick={() => setPanel('Pages')}>
            <Settings />
            Settings
          </button>
          <span role="status">{status || 'Private draft'}</span>
          <div className="studio-draft-actions">
            <div className="studio-history">
              <button
                type="button"
                aria-label="Undo"
                title="Undo"
                disabled={!history.undo.length || working || uploading}
                onClick={() => stepHistory('undo')}
              >
                <Undo2 aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label="Redo"
                title="Redo"
                disabled={!history.redo.length || working || uploading}
                onClick={() => stepHistory('redo')}
              >
                <Redo2 aria-hidden="true" />
              </button>
            </div>
            {hasSavedDraft && (
              <button disabled={working || uploading} onClick={() => setPanel('Discard draft')}>
                Discard draft
              </button>
            )}
            <button
              disabled={working || uploading}
              className="studio-publish"
              onClick={() => setPanel('Publish')}
            >
              Publish
            </button>
            <button
              disabled={working || uploading}
              onClick={async () => {
                if (await flush())
                  router.push(
                    published
                      ? p.href
                      : p.kind === 'event'
                        ? p.href + '?view=backstage'
                        : '/dashboard/profiles'
                  )
              }}
            >
              Done
            </button>
          </div>
        </div>
      )}
      {error && (
        <div role="alert" className="studio-error">
          {error} <button onClick={() => void flush()}>Retry save</button>
        </div>
      )}
      <div
        className={'studio-frame' + (phone && draft ? ' studio-phone' : '')}
        data-dock={hasDock || undefined}
      >
        <div
          className="studio-canvas"
          ref={canvas}
          data-layout={look.layout}
          data-light={look.preset === 'paper'}
          data-editor={edit}
        >
          <header className="studio-head">
            <Link href="/" aria-label="TourAligner">
              <Image
                src={
                  '/touraligner/brand/touraligner-logo-' +
                  (look.preset === 'paper' ? 'dark' : 'light') +
                  '.svg'
                }
                width={121}
                height={34}
                alt="TourAligner"
              />
            </Link>
            <nav aria-label="Profile pages">
              {tabs.map((t) => (
                <button key={t} aria-current={t === tab ? 'page' : undefined} onClick={() => pick(t)}>
                  {tabNames[t]}
                </button>
              ))}
            </nav>
            <div>
              {p.owner && !draft && (
                <Link className="studio-head-action" href={p.href + '?edit=1'}>
                  Open Studio
                </Link>
              )}
              {published && (
                <button
                  className="studio-head-action"
                  onClick={() => {
                    setCopied('')
                    setPanel('Share')
                  }}
                >
                  Share <Share2 size={14} />
                </button>
              )}
            </div>
          </header>
          {tab === 'home' && artist ? (
            <ArtistHome
              doc={doc}
              name={p.name}
              place={place}
              genres={p.genres.filter((g) => doc.genres.includes(g.id)).map((g) => g.name)}
              artwork={artwork}
              facts={facts}
              actions={
                <>
                  {bookButton}
                  {!draft && p.actions}
                </>
              }
              onEdit={edit ? setPanel : undefined}
            />
          ) : tab === 'home' ? (
            <section className="studio-hero">
              {artwork}
              <div className="studio-hero-body">
                <div className="studio-story">
                  {section(
                    'Look',
                    'Change photo',
                    look.avatar && (
                      <div className="studio-photo-row">
                        <Image
                          unoptimized
                          className="studio-avatar"
                          width={68}
                          height={68}
                          alt=""
                          src={look.avatar}
                        />
                      </div>
                    )
                  )}
                  {section(
                    p.kind === 'event' ? 'Details' : 'About',
                    'Edit profile details',
                    <>
                      <p className="studio-kicker">
                        {p.kind === 'venue' ? 'Venue' : f.event_date ? niceDate(f.event_date) : 'Event'}
                      </p>
                      <h1>{title}</h1>
                      {f.tagline && <p className="studio-tagline">{f.tagline}</p>}
                      {place && <p>{place}</p>}
                    </>
                  )}
                  {section(
                    'Genres',
                    'Edit genres',
                    <div className="studio-genre-row">
                      <ul className="studio-chips">
                        {p.genres
                          .filter((g) => doc.genres.includes(g.id))
                          .map((g) => (
                            <li key={g.id}>{g.name}</li>
                          ))}
                      </ul>
                    </div>
                  )}
                  <div className="studio-actions">
                    {bookButton}
                    {!draft && p.actions}
                  </div>
                </div>
                {facts}
              </div>
            </section>
          ) : (
            <section className="studio-page">
              {artwork}
              <div className="studio-page-body">
                <div className="studio-page-content">
                  <p className="studio-kicker">{title}</p>
                  {tab !== 'shows' && <h2>{tabNames[tab]}</h2>}
                  {tab === 'music' && (
                    <>
                      {(edit || !!songs.length || !!musicLinks.length) &&
                        section(
                          'Music',
                          'Edit music',
                          <div className="artist-song-list">
                            {songs.map((s) => (
                              <article key={s.id}>
                                {playerSongs.some((song) => song.id === s.id) ? (
                                  <button
                                    className="artist-song-title"
                                    aria-label={'Open player for ' + s.title}
                                    onClick={() => player.current?.choose(s.id)}
                                  >
                                    {s.title}
                                  </button>
                                ) : (
                                  <strong>{s.title}</strong>
                                )}
                                {listeningLinks(s).map((link) => (
                                  <a key={link.label} href={link.url} target="_blank" rel="noreferrer">
                                    {link.label} ↗
                                  </a>
                                ))}
                              </article>
                            ))}
                            {!!musicLinks.length && (
                              <div>
                                <h3>Listen elsewhere</h3>
                                {renderLinks(musicLinks)}
                              </div>
                            )}
                            {edit && !songs.length && !musicLinks.length && (
                              <p>Add a song, a Spotify embed, or a listening link.</p>
                            )}
                          </div>
                        )}
                      {videos.map((b) => (
                        <div key={b.id}>
                          {section('block:' + b.id, 'Edit video', <ProfilePageBlockView block={b} />)}
                        </div>
                      ))}
                      {edit && section('new:video', 'Add video', null)}
                    </>
                  )}
                  {tab === 'shows' &&
                    section(
                      'Shows',
                      dates.length ? 'Edit manual shows' : 'Add a show',
                      <ArtistShows
                        name={p.name}
                        solo={f.artist_type === 'solo'}
                        href={p.href}
                        today={today}
                        upcoming={upcoming}
                        past={past}
                        requestDate={showBook ? (value) => {
                          setDate(value)
                          setContact('booking')
                        } : undefined}
                        message={showBook ? () => setContact('message') : undefined}
                      />
                    )}
                  {tab === 'lineup' && p.lineup}
                  {tab === 'availability' && (
                    <div data-theme="light" className="studio-business">
                      {p.availability}
                    </div>
                  )}
                  {tab === 'about' && (
                    <>
                      {artist ? (
                        <>
                          {section(
                            'Description',
                            'Edit description',
                            f.description && <p className="artist-description">{f.description}</p>
                          )}
                          {section(
                            'Story',
                            'Edit story',
                            look.story && <p className="whitespace-pre-line">{look.story}</p>
                          )}
                          {section(
                            'Details',
                            'Edit details',
                            <dl className="studio-details">
                              {[
                                [labels.artist_type, f.artist_type],
                                ['Home base', place],
                                [labels.touring_radius, f.touring_radius],
                                ['Set length', f.set_length_min && f.set_length_min + ' min'],
                              ]
                                .filter(([, v]) => v)
                                .map(([k, v]) => (
                                  <div key={k}>
                                    <dt>{k}</dt>
                                    <dd>{v}</dd>
                                  </div>
                                ))}
                            </dl>
                          )}
                          {section(
                            'Members',
                            'Edit members',
                            members.length > 0 && (
                              <div>
                                <h3>On stage</h3>
                                <ul className="studio-chips">
                                  {members.map((m, i) => (
                                    <li key={i}>{m}</li>
                                  ))}
                                </ul>
                              </div>
                            )
                          )}
                          {section(
                            'Links',
                            'Edit links',
                            social.length > 0 && <div>{renderLinks(social)}</div>
                          )}
                        </>
                      ) : (
                        <>
                          {section(
                            p.kind === 'event' ? 'Details' : 'About',
                            'Edit details',
                            <>
                              {f.description && <p className="studio-description">{f.description}</p>}
                              <dl className="studio-details">
                                {detailKeys
                                  .filter((k) => f[k])
                                  .map((k) => (
                                    <div key={k}>
                                      <dt>{k === 'members' ? 'Members' : labels[k]}</dt>
                                      <dd>{f[k].replaceAll('_', ' ')}</dd>
                                    </div>
                                  ))}
                              </dl>
                            </>
                          )}
                          {p.kind === 'venue' &&
                            (social.length > 0 || edit) &&
                            section('Links', 'Edit links', renderLinks(social))}
                        </>
                      )}
                      {p.aboutExtras}
                      {artist &&
                        section(
                          'Lyrics',
                          'Edit lyrics',
                          doc.lyrics.map((l) => (
                            <details key={l.id}>
                              <summary>{l.title}</summary>
                              <p className="whitespace-pre-wrap">{l.body}</p>
                            </details>
                          ))
                        )}
                      <div data-theme="light" className="studio-blocks">
                        {doc.blocks
                          .filter(
                            (b) =>
                              (p.kind !== 'artist' || b.blockType !== 'video') &&
                              (edit || !('images' in b.content) || b.content.images.length > 0)
                          )
                          .map((b) => (
                            <div key={b.id}>
                              {section(
                                'block:' + b.id,
                                b.blockType === 'gallery' ? 'Edit photos' : 'Edit section',
                                <ProfilePageBlockView
                                  block={b}
                                  bookingAction={bookButton}
                                  onPhoto={setPhoto}
                                />
                              )}
                            </div>
                          ))}
                      </div>
                      {artist &&
                        edit &&
                        !doc.blocks.some((b) => b.blockType === 'gallery') &&
                        section('new:gallery', 'Add photos', null)}
                      {p.kind !== 'event' && edit && section('Sections', 'Add a section', null)}
                    </>
                  )}
                </div>
              </div>
            </section>
          )}
        </div>
        {hasDock && (
          <ArtistMusicBar
            key={p.id + JSON.stringify(playerSongs.map((s) => s.id))}
            controller={player}
            songs={playerSongs}
          />
        )}
      </div>
      {photo && (
        <StudioSheet title="Photo" close={() => setPhoto(null)}>
          <Image
            unoptimized
            src={photo.url}
            alt={photo.alt}
            width={1200}
            height={900}
            className="h-auto w-full rounded-ds-lg"
          />
          {photo.alt && <p className="mt-3">{photo.alt}</p>}
        </StudioSheet>
      )}
      {contact && p.inquiry && (
        <StudioInquiry
          {...p.inquiry}
          mode={contact}
          ownerPreview={p.owner}
          id={p.id}
          name={p.name}
          href={p.href}
          date={date}
          setDate={setDate}
          close={() => setContact(null)}
        />
      )}
      {panel && (
        <StudioSheet
          title={
            artist && panel === 'Music'
              ? 'Edit music'
              : settingsTabs(p.kind).includes(panel)
                ? 'Settings'
                : panel.startsWith('block:')
                  ? 'Edit section'
                  : panel
          }
          close={() => {
            if (!working && !uploading) setPanel('')
          }}
        >
          {error && <p role="alert">{error}</p>}
          {panel === 'Share' ? (
            <div className="studio-fields">
              <input readOnly aria-label="Public link" value={shareUrl()} />
              <button
                className={buttonBaseClass()}
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(shareUrl())
                    setCopied('Link copied')
                  } catch {
                    setCopied('Select the link to copy it.')
                  }
                }}
              >
                Copy link
              </button>
              {typeof navigator.share === 'function' && (
                <button onClick={() => void navigator.share({ title, url: shareUrl() }).catch(() => {})}>
                  Share link
                </button>
              )}
              <a href={'mailto:?body=' + encodeURIComponent(shareUrl())}>Email link</a>
              <a href={'sms:?body=' + encodeURIComponent(shareUrl())}>Text link</a>
              <p role="status">{copied}</p>
            </div>
          ) : panel === 'Publish' ? (
            <div className="studio-fields">
              {p.kind === 'event' && (
                <label className="studio-check">
                  <input
                    type="checkbox"
                    checked={f.is_public === 'true'}
                    onChange={(e) =>
                      change((d) => ({
                        ...d,
                        fields: { ...d.fields, is_public: String(e.target.checked) },
                      }))
                    }
                  />
                  Public event
                </label>
              )}
              <p>
                {p.kind === 'event' && f.is_public !== 'true'
                  ? 'Apply this draft to the private event.'
                  : 'Publish this version for visitors.'}
              </p>
              <button
                className={buttonBaseClass()}
                disabled={working || uploading}
                onClick={() => void finish('publish')}
              >
                Publish changes
              </button>
            </div>
          ) : panel === 'Discard draft' ? (
            <div className="studio-fields">
              <p>Discard your unpublished changes?</p>
              <button
                className={buttonBaseClass('danger')}
                disabled={working}
                onClick={() => void finish('discard')}
              >
                Discard changes
              </button>
            </div>
          ) : (
            draft && (
              <StudioFields
                kind={p.kind}
                id={p.id}
                name={p.name}
                doc={doc}
                panel={panel}
                genres={p.genres}
                change={change}
                setPanel={setPanel}
                uploading={setUploading}
              />
            )
          )}
          {draft && !['Share', 'Publish', 'Discard draft'].includes(panel) && (
            <button
              type="button"
              className={buttonBaseClass() + ' studio-sheet-done'}
              disabled={uploading || working}
              onClick={() => setPanel('')}
            >
              Done
            </button>
          )}
        </StudioSheet>
      )}
    </div>
  )
}
