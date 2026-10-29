'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { UserCheck, UserPlus } from 'lucide-react'
import { setArtistFollow } from '@/app/actions/artist-network'
import { PrivateChatRequestButton } from '@/components/private-chat/PrivateChatRequestButton'
import { buttonBaseClass } from '@/components/ui/primitives'
import type { ManagedIdentity } from '@/lib/managed-identity'

export function ArtistConnectionActions({ identity, targetId, targetName, following, followsYou = false, followAvailable = true }: {
  identity: ManagedIdentity
  targetId: string
  targetName: string
  following: boolean
  followsYou?: boolean
  followAvailable?: boolean
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  if (identity.kind === 'band' && identity.id === targetId) return null

  return (
    <div className="space-y-2">
      {followsYou && <p className="text-xs font-semibold text-[#A84216]">{following ? 'Following each other' : 'Follows you'}</p>}
      <div className="flex flex-wrap gap-2">
        {identity.kind === 'band' && (
          <button type="button" aria-pressed={following} aria-label={`${following ? 'Unfollow' : 'Follow'} ${targetName}`} disabled={isPending || !followAvailable} className={buttonBaseClass(following ? 'secondary' : 'primary')} onClick={() => {
            setError(null)
            startTransition(async () => {
              const result = await setArtistFollow(identity.id, targetId, !following)
              if (result.error) setError(result.error)
              else router.refresh()
            })
          }}>
            {following ? <UserCheck className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
            {isPending ? 'Saving...' : following ? 'Following' : 'Follow'}
          </button>
        )}
        <PrivateChatRequestButton senderIdentity={identity} targetKind="band" targetId={targetId} targetName={targetName} />
      </div>
      {!followAvailable && identity.kind === 'band' && <p className="text-xs text-[#777777]">Following is temporarily unavailable.</p>}
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
