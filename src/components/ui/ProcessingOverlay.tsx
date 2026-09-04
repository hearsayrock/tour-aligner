'use client'

import Image from 'next/image'

export function ProcessingOverlay({
  className = '',
}: {
  className?: string
}) {
  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-[#F3F3F3]/62 backdrop-blur-[1px] ${className}`}
      role="status"
      aria-live="polite"
      aria-label="Loading"
    >
      <Image
        src="/branding/loading-microphone.png"
        className="h-28 w-28 animate-processing-spin drop-shadow-[0_10px_18px_rgba(202,108,41,0.28)]"
        width={112}
        height={112}
        alt=""
        aria-hidden="true"
      />
    </div>
  )
}
