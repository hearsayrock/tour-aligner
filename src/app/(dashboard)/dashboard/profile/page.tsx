import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'

export const metadata = { title: 'My Profile' }

const ROLE_LABELS = {
  artist: 'Artist',
  venue: 'Venue Manager',
  both: 'Artist & Venue',
}

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return redirect('/login')

  type ProfileRow = { full_name: string | null; avatar_url: string | null; primary_role: 'artist' | 'venue' | 'both' | null; phone: string | null; location_city: string | null; location_state: string | null }
  const { data: rawProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()
  const profile = rawProfile as ProfileRow | null

  const name = profile?.full_name ?? user.email?.split('@')[0] ?? 'Your profile'
  const initials = name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()

  return (
    <div className="max-w-xl mx-auto px-6 py-10">
      {/* Header row */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">My Profile</h1>
        <Link
          href="/dashboard/profile/edit"
          className="text-sm font-medium bg-[#F5F5F5] border border-[#E8E8E8] rounded-lg px-4 py-2 hover:border-[#CCCCCC] transition-colors"
        >
          Edit profile
        </Link>
      </div>

      {/* Avatar + name */}
      <div className="flex items-center gap-5 mb-8">
        <div className="relative w-20 h-20 rounded-full overflow-hidden bg-[#F0F0F0] border border-[#E8E8E8] shrink-0">
          {profile?.avatar_url ? (
            <Image src={profile.avatar_url} alt={name} fill className="object-cover" sizes="80px" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-[#AAAAAA] text-xl font-semibold">
              {initials}
            </div>
          )}
        </div>
        <div>
          <h2 className="text-xl font-bold text-[#252525]">{name}</h2>
          {profile?.primary_role && (
            <span className="inline-block text-xs font-medium px-2.5 py-1 rounded-full bg-[#FD6A2F]/10 text-[#FD6A2F] border border-[#FD6A2F]/20 mt-1">
              {ROLE_LABELS[profile.primary_role]}
            </span>
          )}
        </div>
      </div>

      {/* Info card */}
      <div className="bg-white border border-[#E8E8E8] rounded-xl divide-y divide-[#F0F0F0]">
        <InfoRow label="Email" value={user.email ?? '—'} />
        <InfoRow label="Phone" value={profile?.phone ?? '—'} />
        <InfoRow
          label="Location"
          value={
            profile?.location_city && profile?.location_state
              ? `${profile.location_city}, ${profile.location_state}`
              : profile?.location_city || profile?.location_state || '—'
          }
        />
      </div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-4 px-5 py-4">
      <span className="text-sm text-[#888888] w-20 shrink-0">{label}</span>
      <span className="text-sm text-[#252525]">{value}</span>
    </div>
  )
}
