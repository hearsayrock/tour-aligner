'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { setActiveIdentity } from '@/app/actions/profile'
import { identityValue, type ActiveIdentity, type ManagedIdentity } from '@/lib/managed-identity'

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
  const activeValue = identityValue(activeIdentity)

  if (identities.length < 2) return null

  return (
    <label className={`flex items-center gap-2 text-xs text-[#777777] ${className}`}>
      <span className="whitespace-nowrap">Acting as</span>
      <select
        value={activeValue}
        disabled={isPending}
        onChange={(event) => {
          const nextValue = event.target.value
          startTransition(async () => {
            const result = await setActiveIdentity(nextValue)
            if (!result.error) router.refresh()
          })
        }}
        className="max-w-[180px] truncate rounded-lg border border-[#E8E8E8] bg-white px-2.5 py-1.5 text-sm text-[#252525] transition-colors focus:outline-none focus:border-[#CCCCCC] disabled:opacity-60"
      >
        <option value="all">All Identities</option>
        {identities.map((identity) => (
          <option key={`${identity.kind}:${identity.id}`} value={identityValue(identity)}>
            {identity.name}
          </option>
        ))}
      </select>
    </label>
  )
}
