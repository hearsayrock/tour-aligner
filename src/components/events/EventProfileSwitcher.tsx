'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { setActiveIdentity } from '@/app/actions/profile'
import { Card, SectionHeading, buttonBaseClass } from '@/components/ui/primitives'
import { identityValue, type ManagedIdentity } from '@/lib/managed-identity'

export function EventProfileSwitcher({ identities }: { identities: ManagedIdentity[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  return (
    <Card className="p-5">
      <SectionHeading title="Backstage" description="Switch to a profile linked to this event." />
      <div className="flex flex-wrap gap-2">
        {identities.map((identity) => (
          <button
            key={identityValue(identity)}
            type="button"
            disabled={pending}
            className={buttonBaseClass('secondary')}
            onClick={() => startTransition(async () => {
              const result = await setActiveIdentity(identityValue(identity))
              setError(result.error)
              if (!result.error) router.refresh()
            })}
          >
            {identity.name}
          </button>
        ))}
      </div>
      {error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}
    </Card>
  )
}
