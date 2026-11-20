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
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowUpRight, Eye, Pencil, Settings, Share2, Smartphone, Monitor } from 'lucide-react'
import { ShowCalendar } from './ShowCalendar'
import { StudioSheet } from './StudioSheet'
import { StudioFields } from './StudioFields'
import { StudioInquiry, type InquiryProps } from './StudioInquiry'
import { buttonBaseClass } from '@/components/ui/primitives'
import {
  ProfilePageBlockView,
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
  spotifyEmbed,
  labels,
  musicServices,
  socialServices,
  type Changes,
  type StudioKind,
  type StudioDoc,
  type Show,
  type StudioTab,
} from '@/lib/studio/model'
import { fontStack, googleFontsHref, resolveFonts } from '@/lib/studio/fonts'
import { getPreset } from '@/lib/studio/presets'
import { studioWrite } from '@/app/actions/studio'
import './studio.css'

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
  dates?: Show[]
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
  const [doc, setDoc] = useState(() => applyChanges(p.base, p.draft?.changes ?? {}))
  const current = useRef(doc),
    saved = useRef(doc),
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
  const [booking, setBooking] = useState(Boolean(p.inquiry?.open)),
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
  const title = p.kind === 'event' ? f.title : p.name
  const place = p.location || [f.location_city, f.location_state].filter(Boolean).join(', ')
  const musicLinks = Object.entries(musicServices).filter(([key]) => !!urlValue(f[key]))
  const social = Object.entries(socialServices).filter(([key]) => !!urlValue(f[key]))
  const embed = spotifyEmbed(f.featured_track_url)
  const videos = doc.blocks.filter(
    (b) => b.blockType === 'video' && 'url' in b.content && videoEmbedUrl(b.content.url)
  )
  const hasMusic = !!embed || !!musicLinks.length || !!videos.length
  const tabs = pageTabs[p.kind].filter(
    (t) => edit || (look.tabs.includes(t) && (t !== 'music' || hasMusic) && (t !== 'lineup' || p.lineup))
  )
  const tab: StudioTab = tabs.find((t) => t === hash) ?? 'home'
  const dates = [...doc.shows, ...(p.dates ?? [])].sort((a, b) => a.date.localeCompare(b.date))
  const today = new Date().toISOString().slice(0, 10),
    upcoming = dates.filter((s) => s.date >= today),
    past = dates.filter((s) => s.date < today).reverse()
  function change(fn: (d: StudioDoc) => StudioDoc) {
    const next = fn(current.current)
    current.current = next
    setDoc(next)
    setStatus('Saving draft…')
    setError('')
  }
  function flush() {
    const task = async () => {
      const snapshot = current.current
      if (snapshot === saved.current) return true
      try {
        const r = await studioWrite(p.kind, p.id, rev.current, 'save', changedValues(base, snapshot))
        if (r.error || r.revision == null) throw Error(r.error || 'Could not save draft.')
        rev.current = r.revision
        saved.current = snapshot
        setStatus('Draft saved')
        return true
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not save draft.')
        setStatus('Unsaved changes')
        return false
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
    if (!draft || doc === saved.current) return
    const timer = setTimeout(() => {
      if (!finishing.current) void saveRef.current()
    }, 550)
    return () => clearTimeout(timer)
  }, [doc, draft])
  useEffect(() => {
    if (!draft) return
    const leave = (e: BeforeUnloadEvent) => {
      if (current.current !== saved.current) {
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
  }
  function editButton(target: string, label: string) {
    return edit ? (
      <button className="studio-edit" onClick={() => setPanel(target)}>
        <Pencil size={13} />
        {label}
      </button>
    ) : null
  }
  const idea = !look.cover
    ? { panel: 'Look', label: 'Add a cover photo' }
    : !f.description
      ? { panel: p.kind === 'event' ? 'Details' : 'About', label: 'Add a description' }
      : p.kind === 'artist' && !hasMusic
        ? { panel: 'Music', label: 'Add a music link' }
        : null
  const showBook = !!p.inquiry && (!p.owner || draft)
  const bookButton = showBook ? (
    <button className={buttonBaseClass()} disabled={p.owner} onClick={() => setBooking(true)}>
      Book {p.name}
      <ArrowUpRight size={16} />
    </button>
  ) : null
  const renderList = (list: Show[]) =>
    list.map((s) => (
      <article className="studio-show" key={s.id}>
        <time dateTime={s.date}>{niceDate(s.date)}</time>
        <div>
          <strong>{s.venue}</strong>
          <p>{[s.city, s.state].filter(Boolean).join(', ')}</p>
        </div>
        {urlValue(s.url) && (
          <a href={urlValue(s.url)} target="_blank" rel="noreferrer">
            Tickets ↗
          </a>
        )}
      </article>
    ))
  const renderLinks = (links: [string, string][]) =>
    links.map(([key, label]) => (
      <a key={key} className="studio-link" href={urlValue(f[key])} target="_blank" rel="noreferrer">
        {label}
        <ArrowUpRight size={15} />
      </a>
    ))
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
    '--ta-case': fonts.name.uppercase ? 'uppercase' : 'none',
    '--ta-focus': look.focus,
    '--ta-fit':
      Math.min(
        20,
        138 / Math.max(...(title || p.name).split(/\s+/).map((w) => w.length), 1) / fonts.name.width
      ) + 'cqw',
  } as CSSProperties
  return (
    <div className="studio-root" data-editing={draft || undefined}>
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
          <button onClick={() => setPanel('Settings')}>
            <Settings />
            Settings
          </button>
          <span role="status">{status || 'Private draft'}</span>
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
      )}
      {error && (
        <div role="alert" className="studio-error">
          {error} <button onClick={() => void flush()}>Retry save</button>
        </div>
      )}
      <div className={'studio-frame' + (phone && draft ? ' studio-phone' : '')} style={variables}>
        <div
          className="studio-canvas"
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
          {tab === 'home' ? (
            <section className="studio-hero">
              <div className="studio-art" data-treatment={look.treatment}>
                <Image src={cover} unoptimized fill sizes="100vw" alt="" priority />
              </div>
              <div className="studio-hero-body">
                <div className="studio-story">
                  {editButton('Look', 'Change photo')}
                  {look.avatar && (
                    <Image
                      unoptimized
                      className="studio-avatar"
                      width={68}
                      height={68}
                      alt=""
                      src={look.avatar}
                    />
                  )}
                  <p className="studio-kicker">
                    {p.kind === 'artist'
                      ? f.artist_type === 'solo'
                        ? 'Solo artist'
                        : 'Artist'
                      : p.kind === 'venue'
                        ? 'Venue'
                        : f.event_date
                          ? niceDate(f.event_date)
                          : 'Event'}
                  </p>
                  <h1>
                    {edit ? (
                      <button
                        className="studio-title-target"
                        aria-label="Edit profile details"
                        onClick={() =>
                          setPanel(
                            p.kind === 'artist' ? 'Identity' : p.kind === 'event' ? 'Details' : 'About'
                          )
                        }
                      >
                        {title}
                        <Pencil size={20} />
                      </button>
                    ) : (
                      title
                    )}
                  </h1>
                  {f.tagline && <p className="studio-tagline">{f.tagline}</p>}
                  {place && <p>{place}</p>}
                  <ul className="studio-chips">
                    {p.genres
                      .filter((g) => doc.genres.includes(g.id))
                      .map((g) => (
                        <li key={g.id}>{g.name}</li>
                      ))}
                  </ul>
                  {editButton('Genres', 'Genres')}
                  {p.kind === 'artist' && look.tabs.includes('shows') && upcoming[0] && (
                    <button className="studio-mobile-next" onClick={() => pick('shows')}>
                      <small>Next show</small>
                      <strong>{upcoming[0].venue}</strong>
                      {niceDate(upcoming[0].date)}
                    </button>
                  )}
                  <div className="studio-actions">
                    {bookButton}
                    {!draft && p.actions}
                  </div>
                </div>
                <aside className="studio-facts">
                  {p.kind === 'artist' && look.tabs.includes('shows') && upcoming[0] && (
                    <button className="studio-fact" onClick={() => pick('shows')}>
                      <small>Next show</small>
                      <strong>{upcoming[0].venue}</strong>
                      {niceDate(upcoming[0].date)}
                    </button>
                  )}
                  {p.kind === 'artist' && look.tabs.includes('music') && musicLinks.length > 0 && (
                    <div className="studio-fact">
                      <small>Listen</small>
                      {renderLinks(musicLinks)}
                    </div>
                  )}
                  {social.length > 0 && (
                    <div className="studio-fact">
                      <small>Find {p.kind === 'artist' ? 'the artist' : 'the venue'}</small>
                      {renderLinks(social)}
                    </div>
                  )}
                  {p.kind === 'event' && (
                    <div className="studio-fact">
                      <small>Show details</small>
                      <strong>{f.event_date && niceDate(f.event_date)}</strong>
                      {f.start_time?.slice(0, 5)}
                      {place && <p>{place}</p>}
                    </div>
                  )}
                  {p.kind === 'venue' && (
                    <div className="studio-fact">
                      <small>Room details</small>
                      <strong>{place || p.name}</strong>
                      {f.capacity && <p>{f.capacity} capacity</p>}
                    </div>
                  )}
                  {edit && (
                    <div className="studio-fact">
                      <small>Edit page</small>
                      {editButton(
                        p.kind === 'artist' ? 'Music' : 'Settings',
                        p.kind === 'artist' ? 'Edit music' : 'Page settings'
                      )}
                      {editButton('Look', 'Edit look')}
                    </div>
                  )}
                </aside>
              </div>
            </section>
          ) : (
            <section
              className="studio-page"
              style={
                look.wallpaper
                  ? {
                      backgroundImage:
                        'linear-gradient(var(--ta-veil),var(--ta-veil)),url(' +
                        JSON.stringify(look.wallpaper) +
                        ')',
                    }
                  : undefined
              }
            >
              <p className="studio-kicker">{title}</p>
              <h2>{tabNames[tab]}</h2>
              {tab === 'music' && (
                <>
                  {editButton('Music', 'Edit music')}
                  {embed && (
                    <iframe
                      title="Featured music on Spotify"
                      src={embed}
                      width="100%"
                      height="152"
                      allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
                      className="mt-4 rounded-ds-xl border-0"
                    />
                  )}
                  {renderLinks(musicLinks)}
                  {videos.map((b) => (
                    <ProfilePageBlockView key={b.id} block={b} />
                  ))}
                  {editButton('Sections', 'Edit music videos')}
                </>
              )}
              {tab === 'shows' && (
                <>
                  {editButton('Shows', 'Edit manual shows')}
                  <ShowCalendar
                    today={today}
                    dates={dates}
                    select={
                      showBook && !p.owner
                        ? (value) => {
                            setDate(value)
                            setBooking(true)
                          }
                        : undefined
                    }
                  />
                  <h3>Upcoming shows</h3>
                  {upcoming.length ? renderList(upcoming) : <p>No upcoming shows listed.</p>}
                  {past.length > 0 && (
                    <>
                      <h3>Past shows</h3>
                      {renderList(past)}
                    </>
                  )}
                </>
              )}
              {tab === 'lineup' && p.lineup}
              {tab === 'availability' && (
                <div data-theme="light" className="studio-business">
                  {p.availability}
                </div>
              )}
              {tab === 'about' && (
                <>
                  {editButton(p.kind === 'event' ? 'Details' : 'About', 'Edit details')}
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
                  {renderLinks(social)}
                  {p.aboutExtras}
                  {doc.lyrics.map((l) => (
                    <details key={l.id}>
                      <summary>{l.title}</summary>
                      <p className="whitespace-pre-wrap">{l.body}</p>
                    </details>
                  ))}
                  {p.kind === 'artist' && editButton('Lyrics', 'Edit lyrics')}
                  <div data-theme="light" className="studio-blocks">
                    {doc.blocks
                      .filter(
                        (b) =>
                          (p.kind !== 'artist' || b.blockType !== 'video') &&
                          (edit || !('images' in b.content) || b.content.images.length > 0)
                      )
                      .map((b) => (
                        <div key={b.id}>
                          {editButton('block:' + b.id, 'Edit section')}
                          <ProfilePageBlockView
                            block={b}
                            bookingAction={bookButton}
                            onPhoto={setPhoto}
                          />
                        </div>
                      ))}
                  </div>
                  {p.kind !== 'event' && editButton('Sections', 'Edit sections')}
                </>
              )}
            </section>
          )}
        </div>
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
      {booking && p.inquiry && (
        <StudioInquiry
          {...p.inquiry}
          id={p.id}
          name={p.name}
          href={p.href}
          date={date}
          setDate={setDate}
          close={() => setBooking(false)}
        />
      )}
      {panel && (
        <StudioSheet
          title={panel.startsWith('block:') ? 'Edit section' : panel}
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
              <button onClick={() => setPanel('Discard draft')}>Discard draft</button>
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
        </StudioSheet>
      )}
    </div>
  )
}
