'use client'

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
      <svg
        viewBox="0 0 120 120"
        className="h-28 w-28 animate-processing-spin text-[#FD6A2F] drop-shadow-[0_10px_18px_rgba(253,106,47,0.28)]"
        fill="none"
        aria-hidden="true"
      >
        <defs>
          <clipPath id="mic-grille">
            <rect x="42" y="10" width="36" height="42" rx="18" />
          </clipPath>
        </defs>
        <g transform="rotate(-42 60 60)">
          <rect x="42" y="10" width="36" height="42" rx="18" fill="currentColor" />
          <g clipPath="url(#mic-grille)" stroke="#FFF8F4" strokeLinecap="round" strokeWidth="3" opacity="0.92">
            <path d="M34 19h52M34 28h52M34 37h52M34 46h52" />
            <path d="M43 2v58M53 2v58M63 2v58M73 2v58" />
          </g>
          <rect x="37" y="49" width="46" height="10" rx="2" fill="#D95729" />
          <path d="M43 59h34v42a8 8 0 0 1-8 8H51a8 8 0 0 1-8-8V59Z" fill="currentColor" />
          <path d="M43 67h34" stroke="#FFF8F4" strokeWidth="3" opacity="0.55" />
        </g>
      </svg>
    </div>
  )
}
