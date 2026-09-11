import type { ReactNode } from 'react'
import Image from 'next/image'
import { ExternalLink, ImageIcon, MessageSquareQuote, Minus, Ticket, Video } from 'lucide-react'
import type { Json, ProfilePageBlock } from '@/types/database'
import type { ProfilePageSectionDefinition } from '@/components/profile-page/profile-page-types'

export type ProfilePageBlockType = ProfilePageBlock['block_type']
export type ProfilePageBlockSectionId = `block:${string}`

export type CustomBlockContent = {
  eyebrow: string
  heading: string
  body: string
  imageUrl: string
  imageAlt: string
  buttonLabel: string
  buttonUrl: string
}

export type GalleryBlockContent = {
  heading: string
  images: { id: string; url: string; alt: string }[]
}

export type VideoBlockContent = { heading: string; url: string; caption: string }
export type QuoteBlockContent = { quote: string; attribution: string; source: string }
export type BookingCtaBlockContent = { heading: string; body: string; buttonLabel: string }
export type DividerBlockContent = { label: string }

export type ProfilePageBlockContent =
  | CustomBlockContent
  | GalleryBlockContent
  | VideoBlockContent
  | QuoteBlockContent
  | BookingCtaBlockContent
  | DividerBlockContent

export type ProfilePageBlockSettings = {
  variant: string
  alignment: 'left' | 'center'
  imagePosition: 'left' | 'right'
  placement?: { order: number; span: 4 | 6 | 8 | 12; visible: boolean }
}

export type ProfilePageBlockDraft = {
  id: string
  blockType: ProfilePageBlockType
  schemaVersion: 1
  content: ProfilePageBlockContent
  settings: ProfilePageBlockSettings
}

export type ProfilePageBlockRegistryEntry = {
  type: ProfilePageBlockType
  label: string
  description: string
  icon: typeof ImageIcon
  defaultSpan: 4 | 6 | 8 | 12
  allowedSpans: readonly (4 | 6 | 8 | 12)[]
  defaultVariant: string
  variants: readonly { value: string; label: string }[]
}

export const PROFILE_PAGE_BLOCK_REGISTRY: readonly ProfilePageBlockRegistryEntry[] = [
  { type: 'custom', label: 'Custom', description: 'Text, an image, and an optional link button.', icon: ImageIcon, defaultSpan: 8, allowedSpans: [6, 8, 12], defaultVariant: 'card', variants: [{ value: 'card', label: 'Card' }, { value: 'split', label: 'Split' }, { value: 'spotlight', label: 'Spotlight' }] },
  { type: 'gallery', label: 'Photo gallery', description: 'A collection of images from the artist.', icon: ImageIcon, defaultSpan: 12, allowedSpans: [8, 12], defaultVariant: 'grid', variants: [{ value: 'grid', label: 'Grid' }, { value: 'mosaic', label: 'Mosaic' }, { value: 'spotlight', label: 'Spotlight' }] },
  { type: 'video', label: 'Video', description: 'A YouTube or Vimeo performance.', icon: Video, defaultSpan: 8, allowedSpans: [6, 8, 12], defaultVariant: 'cinematic', variants: [{ value: 'cinematic', label: 'Cinematic' }, { value: 'card', label: 'Card' }] },
  { type: 'quote', label: 'Press quote', description: 'A review, testimonial, or memorable quote.', icon: MessageSquareQuote, defaultSpan: 6, allowedSpans: [4, 6, 8, 12], defaultVariant: 'editorial', variants: [{ value: 'editorial', label: 'Editorial' }, { value: 'bold', label: 'Bold' }, { value: 'minimal', label: 'Minimal' }] },
  { type: 'booking_cta', label: 'Booking CTA', description: 'A direct path into TourAligner booking.', icon: Ticket, defaultSpan: 6, allowedSpans: [4, 6, 8, 12], defaultVariant: 'accent', variants: [{ value: 'accent', label: 'Accent' }, { value: 'dark', label: 'Dark' }, { value: 'minimal', label: 'Minimal' }] },
  { type: 'divider', label: 'Divider', description: 'Add rhythm and separation between sections.', icon: Minus, defaultSpan: 12, allowedSpans: [6, 8, 12], defaultVariant: 'line', variants: [{ value: 'line', label: 'Line' }, { value: 'label', label: 'Label' }, { value: 'space', label: 'Space' }] },
] as const

const REGISTRY_BY_TYPE = new Map(PROFILE_PAGE_BLOCK_REGISTRY.map((entry) => [entry.type, entry]))

function record(value: Json | undefined): Record<string, Json | undefined> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, Json | undefined> : {}
}

function text(value: Json | undefined, fallback = '') {
  return typeof value === 'string' ? value : fallback
}

export function createProfilePageBlock(type: ProfilePageBlockType): ProfilePageBlockDraft {
  const id = crypto.randomUUID()
  const registry = REGISTRY_BY_TYPE.get(type)!
  const content: Record<ProfilePageBlockType, ProfilePageBlockContent> = {
    custom: { eyebrow: '', heading: 'Custom section', body: '', imageUrl: '', imageAlt: '', buttonLabel: '', buttonUrl: '' },
    gallery: { heading: 'Photo gallery', images: [] },
    video: { heading: 'Featured video', url: '', caption: '' },
    quote: { quote: 'Add a memorable quote.', attribution: '', source: '' },
    booking_cta: { heading: 'Bring us to your stage', body: 'Start a booking conversation with this artist.', buttonLabel: 'Book this artist' },
    divider: { label: '' },
  }
  return { id, blockType: type, schemaVersion: 1, content: content[type], settings: { variant: registry.defaultVariant, alignment: 'left', imagePosition: 'right' } }
}

export function parseProfilePageBlock(row: ProfilePageBlock): ProfilePageBlockDraft | null {
  const source = record(row.content)
  const rawSettings = record(row.settings)
  const rawPlacement = record(rawSettings.placement)
  const registry = REGISTRY_BY_TYPE.get(row.block_type)
  if (!registry) return null
  let content: ProfilePageBlockContent = { label: '' }
  switch (row.block_type) {
    case 'custom':
      content = { eyebrow: text(source.eyebrow), heading: text(source.heading, 'Custom section'), body: text(source.body), imageUrl: text(source.imageUrl), imageAlt: text(source.imageAlt), buttonLabel: text(source.buttonLabel), buttonUrl: text(source.buttonUrl) }
      break
    case 'gallery': {
      const images = Array.isArray(source.images) ? source.images.flatMap((image) => {
        const item = record(image)
        const url = text(item.url)
        return url ? [{ id: text(item.id, crypto.randomUUID()), url, alt: text(item.alt) }] : []
      }) : []
      content = { heading: text(source.heading, 'Photo gallery'), images }
      break
    }
    case 'video': content = { heading: text(source.heading, 'Featured video'), url: text(source.url), caption: text(source.caption) }; break
    case 'quote': content = { quote: text(source.quote, 'Add a memorable quote.'), attribution: text(source.attribution), source: text(source.source) }; break
    case 'booking_cta': content = { heading: text(source.heading, 'Bring us to your stage'), body: text(source.body), buttonLabel: text(source.buttonLabel, 'Book this artist') }; break
    case 'divider': content = { label: text(source.label) }; break
  }
  const variant = text(rawSettings.variant, registry.defaultVariant)
  const draft: ProfilePageBlockDraft = {
    id: row.id,
    blockType: row.block_type,
    schemaVersion: 1,
    content,
    settings: {
      variant: registry.variants.some((item) => item.value === variant) ? variant : registry.defaultVariant,
      alignment: rawSettings.alignment === 'center' ? 'center' : 'left',
      imagePosition: rawSettings.imagePosition === 'left' ? 'left' : 'right',
      ...(typeof rawPlacement.order === 'number' && [4, 6, 8, 12].includes(Number(rawPlacement.span))
        ? { placement: { order: rawPlacement.order, span: Number(rawPlacement.span) as 4 | 6 | 8 | 12, visible: rawPlacement.visible !== false } }
        : {}),
    },
  }
  const normalized = normalizeProfilePageBlockDraft(draft)
  return 'error' in normalized ? null : normalized.value
}

export function blockSectionId(id: string): ProfilePageBlockSectionId {
  return `block:${id}`
}

export function blockIdFromSection(sectionId: string): string | null {
  return sectionId.startsWith('block:') ? sectionId.slice(6) : null
}

export function createBlockDefinition(block: ProfilePageBlockDraft, order: number): ProfilePageSectionDefinition<ProfilePageBlockSectionId> {
  const registry = REGISTRY_BY_TYPE.get(block.blockType)!
  return { sectionId: blockSectionId(block.id), label: registry.label, description: registry.description, defaultOrder: block.settings.placement?.order ?? order, defaultSpan: block.settings.placement?.span ?? registry.defaultSpan, allowedSpans: registry.allowedSpans, defaultVariant: block.settings.variant }
}

export function registryEntry(type: ProfilePageBlockType) {
  return REGISTRY_BY_TYPE.get(type)!
}

function safeUrl(value: unknown, label: string, optional = true): { value: string } | { error: string } {
  const trimmed = typeof value === 'string' ? value.trim().slice(0, 2048) : ''
  if (!trimmed && optional) return { value: '' }
  try {
    const url = new URL(trimmed)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return { error: `${label} must use an http or https URL.` }
    return { value: trimmed }
  } catch { return { error: `${label} must be a complete URL.` } }
}

export function normalizeProfilePageBlockDraft(value: unknown): { value: ProfilePageBlockDraft } | { error: string } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { error: 'A page block was invalid.' }
  const input = value as Partial<ProfilePageBlockDraft>
  if (typeof input.id !== 'string' || !/^[0-9a-f-]{36}$/i.test(input.id)) return { error: 'A page block had an invalid identifier.' }
  const registry = PROFILE_PAGE_BLOCK_REGISTRY.find((entry) => entry.type === input.blockType)
  if (!registry) return { error: 'An unsupported page block was included.' }
  const blockType = registry.type
  const source = input.content && typeof input.content === 'object' && !Array.isArray(input.content) ? input.content as unknown as Record<string, unknown> : {}
  const string = (key: string, max: number, fallback = '') => typeof source[key] === 'string' ? source[key].trim().slice(0, max) : fallback
  let content: ProfilePageBlockContent
  switch (blockType) {
    case 'custom': {
      const image = safeUrl(source.imageUrl, 'Custom block image')
      if ('error' in image) return { error: image.error }
      const button = safeUrl(source.buttonUrl, 'Custom block button')
      if ('error' in button) return { error: button.error }
      const buttonLabel = string('buttonLabel', 80)
      if ((buttonLabel && !button.value) || (!buttonLabel && button.value)) return { error: 'Custom block buttons need both a label and a URL.' }
      content = { eyebrow: string('eyebrow', 80), heading: string('heading', 160, 'Custom section'), body: string('body', 10000), imageUrl: image.value, imageAlt: string('imageAlt', 240), buttonLabel, buttonUrl: button.value }
      break
    }
    case 'gallery': {
      const rawImages = Array.isArray(source.images) ? source.images.slice(0, 24) : []
      const images: GalleryBlockContent['images'] = []
      for (const rawImage of rawImages) {
        if (!rawImage || typeof rawImage !== 'object' || Array.isArray(rawImage)) continue
        const image = rawImage as Record<string, unknown>
        const url = safeUrl(image.url, 'Gallery image', false)
        if ('error' in url) return { error: url.error }
        if (typeof image.id !== 'string' || !/^[0-9a-f-]{36}$/i.test(image.id)) return { error: 'A gallery image had an invalid identifier.' }
        images.push({ id: image.id, url: url.value, alt: typeof image.alt === 'string' ? image.alt.trim().slice(0, 240) : '' })
      }
      content = { heading: string('heading', 160, 'Photo gallery'), images }
      break
    }
    case 'video': {
      const url = safeUrl(source.url, 'Video')
      if ('error' in url) return { error: url.error }
      if (url.value && !/(youtube\.com|youtu\.be|vimeo\.com)/i.test(url.value)) return { error: 'Video blocks currently support YouTube and Vimeo URLs.' }
      content = { heading: string('heading', 160, 'Featured video'), url: url.value, caption: string('caption', 500) }
      break
    }
    case 'quote': content = { quote: string('quote', 1000, 'Add a memorable quote.'), attribution: string('attribution', 160), source: string('source', 160) }; break
    case 'booking_cta': content = { heading: string('heading', 160, 'Bring us to your stage'), body: string('body', 1000), buttonLabel: string('buttonLabel', 80, 'Book this artist') }; break
    case 'divider': content = { label: string('label', 80) }; break
  }
  const rawSettings = input.settings && typeof input.settings === 'object' && !Array.isArray(input.settings) ? input.settings : {} as Partial<ProfilePageBlockSettings>
  const rawPlacement = rawSettings.placement && typeof rawSettings.placement === 'object' && !Array.isArray(rawSettings.placement) ? rawSettings.placement : null
  const placement = rawPlacement && typeof rawPlacement.order === 'number' && [4, 6, 8, 12].includes(Number(rawPlacement.span))
    ? { order: rawPlacement.order, span: Number(rawPlacement.span) as 4 | 6 | 8 | 12, visible: rawPlacement.visible !== false }
    : undefined
  return { value: { id: input.id, blockType, schemaVersion: 1, content, settings: { variant: registry.variants.some((variant) => variant.value === rawSettings.variant) ? rawSettings.variant! : registry.defaultVariant, alignment: rawSettings.alignment === 'center' ? 'center' : 'left', imagePosition: rawSettings.imagePosition === 'left' ? 'left' : 'right', ...(placement ? { placement } : {}) } } }
}

function videoEmbedUrl(value: string): string | null {
  try {
    const url = new URL(value)
    if (url.hostname.includes('youtube.com')) {
      const id = url.searchParams.get('v')
      return id ? `https://www.youtube.com/embed/${id}` : null
    }
    if (url.hostname === 'youtu.be') return `https://www.youtube.com/embed/${url.pathname.slice(1)}`
    if (url.hostname.includes('vimeo.com')) return `https://player.vimeo.com/video/${url.pathname.split('/').filter(Boolean).at(-1)}`
  } catch { return null }
  return null
}

function BlockFrame({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`h-full overflow-hidden rounded-[28px] border border-[#E6DFD3] bg-white shadow-[0_18px_42px_rgba(17,17,17,0.05)] ${className}`}>{children}</section>
}

export function ProfilePageBlockView({ block, bookingAction }: { block: ProfilePageBlockDraft; bookingAction?: ReactNode }) {
  const align = block.settings.alignment === 'center' ? 'text-center items-center' : 'text-left items-start'
  switch (block.blockType) {
    case 'custom': {
      const content = block.content as CustomBlockContent
      const split = block.settings.variant === 'split' && content.imageUrl
      return (
        <BlockFrame className={block.settings.variant === 'spotlight' ? 'bg-[#1C1816] text-white' : ''}>
          <div className={`grid h-full ${split ? 'md:grid-cols-2' : ''}`}>
            {content.imageUrl && <div className={`${split && block.settings.imagePosition === 'right' ? 'md:order-2' : ''} relative min-h-56 bg-[#EEE8E1]`}><Image src={content.imageUrl} alt={content.imageAlt} fill unoptimized className="object-cover" /></div>}
            <div className={`flex flex-col justify-center p-7 sm:p-9 ${align}`}>
              {content.eyebrow && <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--profile-accent)]">{content.eyebrow}</p>}
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">{content.heading}</h2>
              {content.body && <p className={`mt-4 whitespace-pre-wrap text-sm leading-7 ${block.settings.variant === 'spotlight' ? 'text-white/72' : 'text-[#5F5A56]'}`}>{content.body}</p>}
              {content.buttonLabel && content.buttonUrl && <a href={content.buttonUrl} target="_blank" rel="noopener noreferrer" className="artist-page-link-button mt-6 inline-flex min-h-11 items-center gap-2 bg-[var(--profile-accent)] px-5 text-sm font-bold text-white">{content.buttonLabel}<ExternalLink className="h-4 w-4" /></a>}
            </div>
          </div>
        </BlockFrame>
      )
    }
    case 'gallery': {
      const content = block.content as GalleryBlockContent
      const images = content.images
      return <BlockFrame className="p-6 sm:p-8"><h2 className={`text-2xl font-semibold ${block.settings.alignment === 'center' ? 'text-center' : ''}`}>{content.heading}</h2>{images.length ? <div className={`mt-6 grid gap-3 ${block.settings.variant === 'spotlight' ? 'grid-cols-1' : 'grid-cols-2 md:grid-cols-3'}`}>{images.map((image, index) => <div key={image.id} className={`relative overflow-hidden rounded-2xl bg-[#EEE8E1] ${block.settings.variant === 'spotlight' && index === 0 ? 'aspect-[16/8]' : block.settings.variant === 'mosaic' && index % 3 === 0 ? 'row-span-2 min-h-72' : 'aspect-square'}`}><Image src={image.url} alt={image.alt} fill unoptimized className="object-cover" /></div>)}</div> : <div className="mt-6 rounded-2xl border border-dashed border-[#DDD4CC] py-12 text-center text-sm text-[#888078]">Add photos to build this gallery.</div>}</BlockFrame>
    }
    case 'video': {
      const content = block.content as VideoBlockContent
      const embed = videoEmbedUrl(content.url)
      return <BlockFrame className="p-6 sm:p-8"><h2 className={`text-2xl font-semibold ${block.settings.alignment === 'center' ? 'text-center' : ''}`}>{content.heading}</h2>{embed ? <iframe src={embed} title={content.heading} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen className="mt-6 aspect-video w-full rounded-2xl border-0" /> : <div className="mt-6 flex aspect-video items-center justify-center rounded-2xl bg-[#1C1816] text-white/70"><Video className="mr-2 h-5 w-5" /> Add a YouTube or Vimeo URL</div>}{content.caption && <p className="mt-4 text-sm leading-6 text-[#6F6862]">{content.caption}</p>}</BlockFrame>
    }
    case 'quote': {
      const content = block.content as QuoteBlockContent
      return <BlockFrame className={`${block.settings.variant === 'bold' ? 'bg-[var(--profile-accent)] text-white' : ''} p-7 sm:p-9`}><MessageSquareQuote className={`h-8 w-8 ${block.settings.variant === 'bold' ? 'text-white/65' : 'text-[var(--profile-accent)]'}`} /><blockquote className="mt-5 text-xl font-semibold leading-8">“{content.quote}”</blockquote>{(content.attribution || content.source) && <p className={`mt-5 text-sm ${block.settings.variant === 'bold' ? 'text-white/72' : 'text-[#77706A]'}`}>— {[content.attribution, content.source].filter(Boolean).join(', ')}</p>}</BlockFrame>
    }
    case 'booking_cta': {
      const content = block.content as BookingCtaBlockContent
      return <BlockFrame className={`${block.settings.variant === 'dark' ? 'bg-[#1C1816] text-white' : block.settings.variant === 'accent' ? 'bg-[var(--profile-accent)] text-white' : ''} p-7 sm:p-9`}><div className={`flex h-full flex-col justify-center ${align}`}><Ticket className="h-7 w-7" /><h2 className="mt-4 text-2xl font-semibold">{content.heading}</h2>{content.body && <p className={`mt-3 text-sm leading-7 ${block.settings.variant === 'minimal' ? 'text-[#6F6862]' : 'text-white/75'}`}>{content.body}</p>}<div className="mt-6">{bookingAction ?? <span className={`artist-page-link-button inline-flex min-h-11 items-center justify-center px-5 text-sm font-bold ${block.settings.variant === 'minimal' ? 'bg-[#252525] text-white' : 'bg-white text-[#252525]'}`}>{content.buttonLabel}</span>}</div></div></BlockFrame>
    }
    case 'divider': {
      const content = block.content as DividerBlockContent
      if (block.settings.variant === 'space') return <div className="h-20" />
      return <div className="flex h-full min-h-16 items-center gap-4 px-2"><span className="h-px flex-1 bg-[#D8D0C8]" />{block.settings.variant === 'label' && content.label && <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#817870]">{content.label}</span>}<span className="h-px flex-1 bg-[#D8D0C8]" /></div>
    }
  }
}
