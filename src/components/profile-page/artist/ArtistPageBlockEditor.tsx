'use client'

import { useRef, type ChangeEvent } from 'react'
import Image from 'next/image'
import { Copy, ImagePlus, Layers3, Plus, Trash2, X } from 'lucide-react'
import {
  PROFILE_PAGE_BLOCK_REGISTRY,
  registryEntry,
  type BookingCtaBlockContent,
  type CustomBlockContent,
  type DividerBlockContent,
  type GalleryBlockContent,
  type ProfilePageBlockDraft,
  type QuoteBlockContent,
  type VideoBlockContent,
} from '@/components/profile-page/blocks/profile-page-blocks'

const fieldClass = 'mt-2 min-h-11 w-full rounded-xl border border-[#DDD5CE] bg-white px-3 text-sm text-[#333333] outline-none transition focus:border-[#FD6A2F] focus:ring-2 focus:ring-[#FD6A2F]/15'
const labelClass = 'block text-sm font-semibold text-[#444444]'

export function ArtistPageBlockPicker({ onAdd, onClose }: { onAdd: (type: ProfilePageBlockDraft['blockType']) => void; onClose: () => void }) {
  return (
    <div className="p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[#A24A22]"><Layers3 className="h-4 w-4" /> Add block</p><h2 className="mt-2 text-xl font-semibold tracking-tight text-[#171717]">What belongs on this page?</h2><p className="mt-1 text-sm leading-6 text-[#777777]">Choose a TourAligner block. You can move, resize, duplicate, or remove it afterward.</p></div>
        <button type="button" onClick={onClose} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[#777777] hover:bg-[#F2EEE9]" aria-label="Close block picker"><X className="h-4 w-4" /></button>
      </div>
      <div className="mt-7 grid gap-3">
        {PROFILE_PAGE_BLOCK_REGISTRY.map(({ type, label, description, icon: Icon }) => (
          <button key={type} type="button" onClick={() => onAdd(type)} className="group flex min-h-20 items-center gap-4 rounded-2xl border border-[#E4DDD6] bg-white p-4 text-left transition hover:border-[#FD6A2F] hover:shadow-[0_10px_30px_rgba(45,30,20,0.08)]">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#FFF1E9] text-[#D95520] group-hover:bg-[#FD6A2F] group-hover:text-white"><Icon className="h-5 w-5" /></span>
            <span><span className="block text-sm font-bold text-[#252525]">{label}</span><span className="mt-1 block text-xs leading-5 text-[#777777]">{description}</span></span>
            <Plus className="ml-auto h-4 w-4 shrink-0 text-[#A49A92]" />
          </button>
        ))}
      </div>
    </div>
  )
}

export function ArtistPageBlockInspector({
  block,
  onChange,
  onChooseImages,
  onDuplicate,
  onDelete,
  onClose,
}: {
  block: ProfilePageBlockDraft
  onChange: (block: ProfilePageBlockDraft) => void
  onChooseImages: (files: File[], target: 'custom' | 'gallery') => void
  onDuplicate: () => void
  onDelete: () => void
  onClose: () => void
}) {
  const imageInput = useRef<HTMLInputElement | null>(null)
  const registry = registryEntry(block.blockType)
  const updateContent = (updates: Record<string, unknown>) => onChange({ ...block, content: { ...block.content, ...updates } as ProfilePageBlockDraft['content'] })
  const chooseImages = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''
    if (files.length) onChooseImages(files, block.blockType === 'gallery' ? 'gallery' : 'custom')
  }

  return (
    <div className="p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#A24A22]">Edit block</p><h2 className="mt-2 text-xl font-semibold tracking-tight text-[#171717]">{registry.label}</h2><p className="mt-1 text-sm leading-6 text-[#777777]">{registry.description}</p></div>
        <button type="button" onClick={onClose} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[#777777] hover:bg-[#F2EEE9]" aria-label="Close block editor"><X className="h-4 w-4" /></button>
      </div>

      <div className="mt-7 space-y-5">
        {block.blockType === 'custom' && (() => {
          const content = block.content as CustomBlockContent
          return <><label className={labelClass}>Eyebrow<input value={content.eyebrow} onChange={(event) => updateContent({ eyebrow: event.target.value })} maxLength={80} className={fieldClass} /></label><label className={labelClass}>Heading<input value={content.heading} onChange={(event) => updateContent({ heading: event.target.value })} maxLength={160} className={fieldClass} /></label><label className={labelClass}>Body<textarea value={content.body} onChange={(event) => updateContent({ body: event.target.value })} maxLength={10000} rows={8} className={`${fieldClass} py-3 leading-6`} /></label><div><p className={labelClass}>Image</p>{content.imageUrl && <div className="relative mt-2 aspect-[16/9] overflow-hidden rounded-2xl bg-[#EEE8E1]"><Image src={content.imageUrl} alt={content.imageAlt} fill unoptimized className="object-cover" /></div>}<div className="mt-2 flex gap-2"><button type="button" onClick={() => imageInput.current?.click()} className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-[#D7CEC6] text-xs font-semibold"><ImagePlus className="h-4 w-4" /> {content.imageUrl ? 'Replace image' : 'Add image'}</button>{content.imageUrl && <button type="button" onClick={() => updateContent({ imageUrl: '', imageAlt: '' })} className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#E8CFC8] text-[#9B3D2C]" aria-label="Remove image"><Trash2 className="h-4 w-4" /></button>}</div><label className={`${labelClass} mt-3`}>Image description<input value={content.imageAlt} onChange={(event) => updateContent({ imageAlt: event.target.value })} maxLength={240} className={fieldClass} /></label></div><div className="grid grid-cols-2 gap-3"><label className={labelClass}>Button label<input value={content.buttonLabel} onChange={(event) => updateContent({ buttonLabel: event.target.value })} maxLength={80} className={fieldClass} /></label><label className={labelClass}>Button URL<input type="url" value={content.buttonUrl} onChange={(event) => updateContent({ buttonUrl: event.target.value })} placeholder="https://..." className={fieldClass} /></label></div></>
        })()}

        {block.blockType === 'gallery' && (() => {
          const content = block.content as GalleryBlockContent
          return <><label className={labelClass}>Heading<input value={content.heading} onChange={(event) => updateContent({ heading: event.target.value })} maxLength={160} className={fieldClass} /></label><input ref={imageInput} type="file" accept="image/*" multiple className="hidden" onChange={chooseImages} /><button type="button" onClick={() => imageInput.current?.click()} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[#CFC5BD] text-xs font-semibold text-[#655B54] hover:border-[#FD6A2F]"><ImagePlus className="h-4 w-4" /> Add photos</button><div className="space-y-3">{content.images.map((image, index) => <div key={image.id} className="flex gap-3 rounded-2xl border border-[#E5DED8] p-3"><div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-[#EEE8E1]"><Image src={image.url} alt="" fill unoptimized className="object-cover" /></div><div className="min-w-0 flex-1"><input value={image.alt} onChange={(event) => updateContent({ images: content.images.map((item, itemIndex) => itemIndex === index ? { ...item, alt: event.target.value } : item) })} placeholder="Image description" maxLength={240} className="min-h-9 w-full rounded-lg border border-[#DDD5CE] px-2 text-xs" /><button type="button" onClick={() => updateContent({ images: content.images.filter((_, itemIndex) => itemIndex !== index) })} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#9B3D2C]"><Trash2 className="h-3.5 w-3.5" /> Remove</button></div></div>)}</div></>
        })()}

        {block.blockType === 'video' && (() => { const content = block.content as VideoBlockContent; return <><label className={labelClass}>Heading<input value={content.heading} onChange={(event) => updateContent({ heading: event.target.value })} maxLength={160} className={fieldClass} /></label><label className={labelClass}>YouTube or Vimeo URL<input type="url" value={content.url} onChange={(event) => updateContent({ url: event.target.value })} placeholder="https://youtube.com/watch?v=..." className={fieldClass} /></label><label className={labelClass}>Caption<textarea value={content.caption} onChange={(event) => updateContent({ caption: event.target.value })} maxLength={500} rows={4} className={`${fieldClass} py-3`} /></label></> })()}
        {block.blockType === 'quote' && (() => { const content = block.content as QuoteBlockContent; return <><label className={labelClass}>Quote<textarea value={content.quote} onChange={(event) => updateContent({ quote: event.target.value })} maxLength={1000} rows={6} className={`${fieldClass} py-3`} /></label><label className={labelClass}>Attribution<input value={content.attribution} onChange={(event) => updateContent({ attribution: event.target.value })} maxLength={160} placeholder="Person or publication" className={fieldClass} /></label><label className={labelClass}>Source<input value={content.source} onChange={(event) => updateContent({ source: event.target.value })} maxLength={160} placeholder="Optional context" className={fieldClass} /></label></> })()}
        {block.blockType === 'booking_cta' && (() => { const content = block.content as BookingCtaBlockContent; return <><div className="rounded-2xl bg-[#FFF4ED] p-4 text-xs leading-5 text-[#7B4A32]">This button uses TourAligner&apos;s booking destination. Artists control the words, not the action.</div><label className={labelClass}>Heading<input value={content.heading} onChange={(event) => updateContent({ heading: event.target.value })} maxLength={160} className={fieldClass} /></label><label className={labelClass}>Supporting text<textarea value={content.body} onChange={(event) => updateContent({ body: event.target.value })} maxLength={1000} rows={5} className={`${fieldClass} py-3`} /></label><label className={labelClass}>Button label<input value={content.buttonLabel} onChange={(event) => updateContent({ buttonLabel: event.target.value })} maxLength={80} className={fieldClass} /></label></> })()}
        {block.blockType === 'divider' && (() => { const content = block.content as DividerBlockContent; return <label className={labelClass}>Optional label<input value={content.label} onChange={(event) => updateContent({ label: event.target.value })} maxLength={80} className={fieldClass} /></label> })()}

        <div className="border-t border-[#EAE3DD] pt-6"><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#A24A22]">Style</p><div className="mt-3 grid grid-cols-3 gap-2">{registry.variants.map((variant) => <button key={variant.value} type="button" onClick={() => onChange({ ...block, settings: { ...block.settings, variant: variant.value } })} className={`min-h-10 rounded-xl border px-2 text-xs font-semibold ${block.settings.variant === variant.value ? 'border-[#252525] bg-[#252525] text-white' : 'border-[#E5DED8] text-[#655B54]'}`}>{variant.label}</button>)}</div>{block.blockType !== 'divider' && <><p className="mt-5 text-sm font-semibold text-[#444444]">Alignment</p><div className="mt-2 grid grid-cols-2 gap-2">{(['left', 'center'] as const).map((alignment) => <button key={alignment} type="button" onClick={() => onChange({ ...block, settings: { ...block.settings, alignment } })} className={`min-h-10 rounded-xl border text-xs font-semibold capitalize ${block.settings.alignment === alignment ? 'border-[#252525] bg-[#252525] text-white' : 'border-[#E5DED8] text-[#655B54]'}`}>{alignment}</button>)}</div></>}{block.blockType === 'custom' && <><p className="mt-5 text-sm font-semibold text-[#444444]">Image position</p><div className="mt-2 grid grid-cols-2 gap-2">{(['left', 'right'] as const).map((imagePosition) => <button key={imagePosition} type="button" onClick={() => onChange({ ...block, settings: { ...block.settings, imagePosition } })} className={`min-h-10 rounded-xl border text-xs font-semibold capitalize ${block.settings.imagePosition === imagePosition ? 'border-[#252525] bg-[#252525] text-white' : 'border-[#E5DED8] text-[#655B54]'}`}>{imagePosition}</button>)}</div></>}</div>
      </div>

      {block.blockType === 'custom' && <input ref={imageInput} type="file" accept="image/*" className="hidden" onChange={chooseImages} />}
      <div className="mt-8 grid grid-cols-2 gap-2 border-t border-[#EAE3DD] pt-6"><button type="button" onClick={onDuplicate} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#DCD3CC] text-xs font-semibold text-[#655B54]"><Copy className="h-4 w-4" /> Duplicate</button><button type="button" onClick={onDelete} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#E7CBC4] text-xs font-semibold text-[#9B3D2C]"><Trash2 className="h-4 w-4" /> Remove</button></div>
    </div>
  )
}
