'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, Music2, X } from 'lucide-react'
import { setActiveIdentity } from '@/app/actions/profile'
import { identityValue, type ManagedIdentity } from '@/lib/managed-identity'
import { ProcessingOverlay } from '@/components/ui/ProcessingOverlay'

export function ProfileSelectionModal({
  title,
  body,
  identities,
}: {
  title: string
  body: string
  identities: ManagedIdentity[]
}) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function selectIdentity(identity: ManagedIdentity) {
    setError(null)
    startTransition(async () => {
      const result = await setActiveIdentity(identityValue(identity))
      if (result.error) {
        setError(result.error)
        return
      }
      router.refresh()
    })
  }

  function cancel() {
    router.push('/dashboard')
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/35 px-4 py-6">
      {isPending && <ProcessingOverlay />}
      <button
        type="button"
        aria-label="Return to dashboard"
        onClick={cancel}
        className="absolute inset-0 cursor-default"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-selection-title"
        className="relative w-full max-w-md rounded-2xl border border-border bg-white p-6 shadow-xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="profile-selection-title" className="text-lg font-semibold text-ink">
              {title}
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-text-secondary">{body}</p>
          </div>
          <button
            type="button"
            onClick={cancel}
            aria-label="Cancel and return to dashboard"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 space-y-2">
          {identities.map((identity) => {
            const Icon = identity.kind === 'band' ? Music2 : Building2

            return (
              <button
                key={`${identity.kind}:${identity.id}`}
                type="button"
                onClick={() => selectIdentity(identity)}
                disabled={isPending}
                className="flex w-full items-center gap-3 rounded-xl border border-border bg-page px-4 py-3 text-left transition-colors hover:border-border-strong hover:bg-white disabled:opacity-50"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-white text-brand-text">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-ink">{identity.name}</span>
                  <span className="block text-xs text-muted">{identity.kind === 'band' ? 'Artist profile' : 'Venue profile'}</span>
                </span>
              </button>
            )
          })}
        </div>

        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={cancel}
            className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-border-strong hover:bg-surface-2"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
