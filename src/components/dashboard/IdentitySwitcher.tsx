'use client'

import { useRef, useState, useEffect, useTransition } from 'react'
import { ChevronDown, Mic2, MapPin, Users } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { setActiveIdentity } from '@/app/actions/profile'
import { identityValue, type ActiveIdentity, type ManagedIdentity } from '@/lib/managed-identity'
import { ProcessingOverlay } from '@/components/ui/ProcessingOverlay'

function activeLabel(activeIdentity: ActiveIdentity, allowAll: boolean) {
  if (activeIdentity.kind === 'all') return allowAll ? 'All profiles' : 'Select profile'
  return activeIdentity.name
}

export function IdentitySwitcher({
  activeIdentity,
  identities,
  className = '',
  allowAll = true,
}: {
  activeIdentity: ActiveIdentity
  identities: ManagedIdentity[]
  className?: string
  allowAll?: boolean
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
      {isPending && <ProcessingOverlay />}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={isPending}
        className={`flex min-h-10 w-full items-center justify-between gap-2 rounded-xl border border-[#E6E6E6] bg-white px-3 text-sm font-semibold transition-colors disabled:opacity-50 ${
          open ? 'text-[#252525]' : 'text-[#555555] hover:border-[#CCCCCC] hover:text-[#252525]'
        }`}
      >
        <span className="flex min-w-0 items-center gap-2">
          {activeIdentity.kind === 'all' ? (
            <Users className="h-4 w-4 shrink-0 text-[#FD6A2F]" />
          ) : activeIdentity.kind === 'band' ? (
            <Mic2 className="h-4 w-4 shrink-0 text-[#FD6A2F]" />
          ) : (
            <MapPin className="h-4 w-4 shrink-0 text-[#FD6A2F]" />
          )}
          <span className="max-w-[150px] truncate">{activeLabel(activeIdentity, allowAll)}</span>
        </span>
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-[calc(100%+6px)] right-0 z-50 w-56 overflow-hidden rounded-xl border border-[#E8E8E8] bg-white shadow-lg">
          <div className="py-1">
            {allowAll && (
              <button
                type="button"
                onClick={() => select('all')}
                className="flex min-h-10 w-full items-center gap-2 px-4 text-left text-sm text-[#333333] transition-colors hover:bg-[#F5F5F5]"
              >
                <Users className="h-4 w-4 text-[#888888]" />
                All profiles
              </button>
            )}
            {identities.map((identity) => (
              <button
                key={`${identity.kind}:${identity.id}`}
                type="button"
                onClick={() => select(identityValue(identity))}
                className="flex min-h-10 w-full items-center gap-2 px-4 text-left text-sm text-[#333333] transition-colors hover:bg-[#F5F5F5]"
              >
                {identity.kind === 'band' ? <Mic2 className="h-4 w-4 text-[#888888]" /> : <MapPin className="h-4 w-4 text-[#888888]" />}
                <span className="min-w-0 flex-1 truncate">{identity.name}</span>
                <span className="text-xs text-[#AAAAAA]">{identity.kind === 'band' ? 'Artist' : 'Venue'}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
