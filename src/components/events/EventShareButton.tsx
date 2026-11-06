'use client'

import { useState } from 'react'
import { buttonBaseClass } from '@/components/ui/primitives'

export function EventShareButton({ href }: { href: string }) {
  const [copied, setCopied] = useState(false)
  const [showLink, setShowLink] = useState<string | null>(null)

  async function copyLink() {
    const url = new URL(href, window.location.origin).href
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setShowLink(null)
    } catch {
      setShowLink(url)
    }
  }

  return (
    <div>
      <button type="button" onClick={() => void copyLink()} className={buttonBaseClass('secondary')}>
        {copied ? 'Link copied' : 'Copy event link'}
      </button>
      {showLink && (
        <input aria-label="Event link" value={showLink} readOnly onFocus={(event) => event.target.select()} className="mt-2 w-full rounded border bg-white p-2 text-sm text-[#252525]" />
      )}
    </div>
  )
}
