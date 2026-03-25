'use client'

import { useState, useCallback } from 'react'
import Cropper from 'react-easy-crop'
import type { Area } from 'react-easy-crop'

interface ImageCropModalProps {
  src: string
  aspect: number
  onComplete: (file: File, previewUrl: string) => void
  onCancel: () => void
}

async function getCroppedBlob(imageSrc: string, pixelCrop: Area): Promise<Blob> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.addEventListener('load', () => resolve(image))
    image.addEventListener('error', reject)
    image.src = imageSrc
  })

  const canvas = document.createElement('canvas')
  canvas.width = pixelCrop.width
  canvas.height = pixelCrop.height
  const ctx = canvas.getContext('2d')!

  ctx.drawImage(
    img,
    pixelCrop.x, pixelCrop.y,
    pixelCrop.width, pixelCrop.height,
    0, 0,
    pixelCrop.width, pixelCrop.height,
  )

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('Canvas is empty'))
    }, 'image/jpeg', 0.92)
  })
}

export function ImageCropModal({ src, aspect, onComplete, onCancel }: ImageCropModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [applying, setApplying] = useState(false)

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels)
  }, [])

  async function handleApply() {
    if (!croppedAreaPixels) return
    setApplying(true)
    const blob = await getCroppedBlob(src, croppedAreaPixels)
    const file = new File([blob], 'photo.jpg', { type: 'image/jpeg' })
    const previewUrl = URL.createObjectURL(blob)
    onComplete(file, previewUrl)
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />

      {/* Modal */}
      <div className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#F0F0F0] flex items-center justify-between">
          <h2 className="text-base font-semibold text-[#252525]">Crop photo</h2>
          <button
            type="button"
            onClick={onCancel}
            className="text-[#AAAAAA] hover:text-[#555555] transition-colors text-xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Crop area */}
        <div className="relative bg-[#111111]" style={{ height: aspect >= 2 ? 220 : 340 }}>
          <Cropper
            image={src}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            showGrid={false}
            style={{
              containerStyle: { borderRadius: 0 },
              cropAreaStyle: {
                border: '2px solid #FD6A2F',
                boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)',
              },
            }}
          />
        </div>

        {/* Zoom slider */}
        <div className="px-6 pt-4 pb-2 flex items-center gap-3">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#AAAAAA" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            <line x1="11" y1="8" x2="11" y2="14" /><line x1="8" y1="11" x2="14" y2="11" />
          </svg>
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="flex-1 accent-[#FD6A2F] h-1 cursor-pointer"
          />
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#AAAAAA" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
        </div>
        <p className="text-center text-xs text-[#AAAAAA] pb-3">Pinch or scroll to zoom · Drag to reposition</p>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-[#F0F0F0] flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="text-sm font-medium text-[#555555] hover:text-[#252525] transition-colors px-4 py-2"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={applying}
            className="bg-[#FD6A2F] text-white font-semibold rounded-lg px-5 py-2 text-sm hover:bg-[#E55A22] transition-colors disabled:opacity-50"
          >
            {applying ? 'Applying…' : 'Apply'}
          </button>
        </div>
      </div>
    </div>
  )
}
