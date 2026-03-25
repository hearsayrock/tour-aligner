'use client'

import { useEffect, useState } from 'react'

export function ScrollIndicator() {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    function handleScroll() {
      setVisible(window.scrollY < 40)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div
      className={`absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center z-10 transition-opacity duration-500 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div className="w-6 h-10 rounded-full border-2 border-white/40 flex items-start justify-center pt-1.5">
        <div className="w-1 h-2 bg-white/70 rounded-full animate-scroll-dot" />
      </div>
    </div>
  )
}
