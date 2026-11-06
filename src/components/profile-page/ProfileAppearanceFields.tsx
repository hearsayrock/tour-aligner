'use client'

import { useRef, useState, type ChangeEvent } from 'react'
import Image from 'next/image'
import { Upload } from 'lucide-react'
import { ImageCropModal } from '@/components/ui/ImageCropModal'

export function ProfileImageField({
  label, description, value, previewUrl, removed, aspect, aspectClass, onChange, onRemove,
}: {
  label: string
  description: string
  value: string | null
  previewUrl: string | null
  removed: boolean
  aspect: number
  aspectClass: string
  onChange: (file: File, preview: string) => void
  onRemove: () => void
}) {
  const input = useRef<HTMLInputElement | null>(null)
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const displayed = removed ? null : previewUrl ?? value

  function choose(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (file) setCropSrc(URL.createObjectURL(file))
  }

  function closeCrop() {
    if (cropSrc) URL.revokeObjectURL(cropSrc)
    setCropSrc(null)
  }

  return (
    <div>
      {cropSrc && (
        <ImageCropModal
          src={cropSrc}
          aspect={aspect}
          onComplete={(file, preview) => { closeCrop(); onChange(file, preview) }}
          onCancel={closeCrop}
        />
      )}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[#444444]">{label}</p>
          <p className="mt-1 text-xs leading-5 text-[#888888]">{description}</p>
        </div>
        {displayed && <button type="button" onClick={onRemove} className="text-xs font-semibold text-[#9B3D2C]">Remove</button>}
      </div>
      <button
        type="button"
        aria-label={label}
        onClick={() => input.current?.click()}
        className={aspectClass + ' relative mt-3 flex w-full overflow-hidden rounded-2xl border border-dashed border-[#D8CFC7] bg-[#F8F5F1]'}
      >
        {displayed ? <Image src={displayed} alt="" fill unoptimized className="object-cover" /> : (
          <span className="m-auto flex items-center gap-2 text-xs font-semibold text-[#777777]">
            <Upload className="h-4 w-4" />Upload image
          </span>
        )}
      </button>
      <input ref={input} type="file" accept="image/*" className="hidden" onChange={choose} />
    </div>
  )
}

export function ProfileAccentField({ label = 'Accent color', value, onChange, className = '' }: {
  label?: string
  value: string
  onChange: (value: string) => void
  className?: string
}) {
  return (
    <label className={'block text-sm font-semibold text-[#444444] ' + className}>
      {label}
      <input type="color" value={value} onChange={(event) => onChange(event.target.value.toUpperCase())} className="mt-2 h-11 w-full" />
    </label>
  )
}
