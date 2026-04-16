'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'

async function extractEdgeColors(url: string): Promise<{ left: string; right: string }> {
  return new Promise((resolve) => {
    const img = new window.Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        // Sample at a reduced size for performance
        const W = Math.min(img.naturalWidth, 300)
        const H = Math.min(img.naturalHeight, 300)
        const canvas = document.createElement('canvas')
        canvas.width = W
        canvas.height = H
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0, W, H)

        // Average the leftmost and rightmost 8px strips
        const leftData  = ctx.getImageData(0, 0, 8, H).data
        const rightData = ctx.getImageData(W - 8, 0, 8, H).data

        function avg(data: Uint8ClampedArray) {
          let r = 0, g = 0, b = 0
          const n = data.length / 4
          for (let i = 0; i < data.length; i += 4) {
            r += data[i]; g += data[i + 1]; b += data[i + 2]
          }
          // Darken slightly so the wing doesn't look garish
          return `rgb(${Math.round(r / n * 0.85)},${Math.round(g / n * 0.85)},${Math.round(b / n * 0.85)})`
        }

        resolve({ left: avg(leftData), right: avg(rightData) })
      } catch {
        resolve({ left: '#111111', right: '#111111' })
      }
    }
    img.onerror = () => resolve({ left: '#111111', right: '#111111' })
    img.src = url
  })
}

interface Props {
  coverUrl: string
  bandName: string
}

export function CoverBanner({ coverUrl, bandName }: Props) {
  const [leftColor,  setLeftColor]  = useState('#111111')
  const [rightColor, setRightColor] = useState('#111111')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    extractEdgeColors(coverUrl).then(({ left, right }) => {
      setLeftColor(left)
      setRightColor(right)
      setReady(true)
    })
  }, [coverUrl])

  return (
    <div
      className="relative w-full h-[350px] overflow-hidden transition-colors duration-700"
      style={{ background: `linear-gradient(to right, ${leftColor}, ${rightColor})` }}
    >
      {/* Centered image container capped at 976px */}
      <div className="absolute inset-0 max-w-[976px] mx-auto">
        <Image
          src={coverUrl}
          alt={`${bandName} cover photo`}
          fill
          priority
          className="object-cover"
          sizes="976px"
        />
        {/* Subtle gradient feather on each edge so image blends into side wings */}
        {ready && (
          <>
            <div
              className="absolute inset-y-0 left-0 w-24 pointer-events-none"
              style={{ background: `linear-gradient(to right, ${leftColor}dd, transparent)` }}
            />
            <div
              className="absolute inset-y-0 right-0 w-24 pointer-events-none"
              style={{ background: `linear-gradient(to left, ${rightColor}dd, transparent)` }}
            />
          </>
        )}
      </div>
    </div>
  )
}
