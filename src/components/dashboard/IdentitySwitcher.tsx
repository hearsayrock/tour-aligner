'use client'

import { useRef, useState, useEffect, useTransition } from 'react'
import { ChevronDown } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { setActiveIdentity } from '@/app/actions/profile'
import { identityValue, type ActiveIdentity, type ManagedIdentity } from '@/lib/managed-identity'

function activeLabel(activeIdentity: ActiveIdentity) {
  if (activeIdentity.kind === 'all') return 'All profiles'
  return activeIdentity.name
}

export function IdentitySwitcher({
  activeIdentity,
  identities,
  className = '',
}: {
  activeIdentity: ActiveIdentity
  identities: ManagedIdentity[]
  className?: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  if (identities.length < 2) return null

  function select(value: string) {
    setOpen(false)
    startTransition(async () => {
      const result = await setActiveIdentity(value)
      if (!result.error) router.refresh()
    })
  }

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={isPending}
        className={`flex items-center gap-1 text-sm px-3 py-1.5 rounded-md transition-colors disabled:opacity-50 ${
          open ? 'text-[#252525]' : 'text-[#888888] hover:text-[#252525]'
        }`}
      >
        <span className="max-w-[140px] truncate">{activeLabel(activeIdentity)}</span>
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-[calc(100%+4px)] right-0 z-50 w-48 bg-white border border-[#E8E8E8] rounded-xl shadow-lg overflow-hidden">
          <div className="py-1">
            <button
              type="button"
              onClick={() => select('all')}
              className="block w-full text-left text-sm px-4 py-2.5 text-[#333333] hover:bg-[#F5F5F5] transition-colors"
            >
              All profiles
            </button>
            {identities.map((identity) => (
              <button
                key={`${identity.kind}:${identity.id}`}
                type="button"
                onClick={() => select(identityValue(identity))}
                className="block w-full text-left text-sm px-4 py-2.5 text-[#333333] hover:bg-[#F5F5F5] transition-colors"
              >
                {identity.name}
                <span className="ml-1.5 text-xs text-[#AAAAAA]">
                  {identity.kind === 'band' ? 'Artist' : 'Venue'}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
