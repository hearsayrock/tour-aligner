import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { suspendUser } from '@/lib/admin/actions'

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold text-[#888888] uppercase tracking-wider mb-1">{label}</p>
      <p className="text-sm text-[#252525]">{value}</p>
    </div>
  )
}

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: profile }, { data: bands }, { data: venues }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, email, full_name, phone, primary_role, is_admin, is_suspended, created_at')
      .eq('id', id)
      .single(),
    supabase
      .from('bands')
      .select('id, name, slug, is_active, created_at')
      .eq('user_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('venues')
      .select('id, name, slug, location_city, location_state, is_active')
      .eq('claimed_by_user_id', id)
      .order('name'),
  ])

  if (!profile) notFound()

  const toggleSuspend = suspendUser.bind(null, id, !profile.is_suspended)

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <Link href="/admin/users" className="text-sm text-[#888888] hover:text-[#252525] transition-colors">
        ← Users
      </Link>

      <div className="flex items-start justify-between mt-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-[#252525]">{profile.full_name ?? profile.email ?? 'Unknown user'}</h1>
          <p className="text-sm text-[#888888] mt-0.5">{profile.email ?? '—'}</p>
        </div>
        <div className="flex items-center gap-2">
          {profile.is_admin && (
            <span className="text-xs px-2 py-0.5 rounded border bg-[#FD6A2F]/10 text-[#FD6A2F] border-[#FD6A2F]/20">
              Admin
            </span>
          )}
          {profile.is_suspended && (
            <span className="text-xs px-2 py-0.5 rounded border bg-red-50 text-red-500 border-red-200">
              Suspended
            </span>
          )}
        </div>
      </div>

      {/* Details */}
      <div className="bg-[#FFFFFF] border border-[#E8E8E8] rounded-xl p-5 grid grid-cols-2 gap-5 mb-6">
        <Field label="Email" value={profile.email ?? '—'} />
        <Field label="Phone" value={profile.phone ?? '—'} />
        <Field label="Role" value={profile.primary_role ?? '—'} />
        <Field label="Joined" value={fmtDate(profile.created_at)} />
      </div>

      {/* Actions */}
      {!profile.is_admin && (
        <div className="bg-[#FFFFFF] border border-[#E8E8E8] rounded-xl p-5 mb-6">
          <h2 className="text-sm font-semibold text-[#252525] mb-3">Actions</h2>
          <form action={toggleSuspend}>
            <button
              type="submit"
              className={`text-sm font-semibold px-4 py-2 rounded-lg border transition-colors ${
                profile.is_suspended
                  ? 'border-[#E8E8E8] text-[#252525] hover:bg-[#F5F5F5]'
                  : 'border-red-200 text-red-500 bg-red-50 hover:bg-red-100'
              }`}
            >
              {profile.is_suspended ? 'Unsuspend user' : 'Suspend user'}
            </button>
          </form>
          <p className="text-xs text-[#888888] mt-2">
            To permanently delete a user, use the Supabase dashboard.
          </p>
        </div>
      )}

      {/* Bands */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-[#888888] uppercase tracking-widest mb-3">
          Bands ({bands?.length ?? 0})
        </h2>
        {(bands ?? []).length > 0 ? (
          <div className="bg-[#FFFFFF] border border-[#E8E8E8] rounded-xl overflow-hidden">
            {(bands ?? []).map((band, i) => (
              <div
                key={band.id}
                className={`flex items-center justify-between px-4 py-3 ${
                  i > 0 ? 'border-t border-[#E8E8E8]' : ''
                }`}
              >
                <Link href={`/admin/bands/${band.id}`} className="text-sm text-[#FD6A2F] hover:underline">
                  {band.name}
                </Link>
                <div className="flex items-center gap-3">
                  {!band.is_active && (
                    <span className="text-xs text-[#888888]">Inactive</span>
                  )}
                  <span className="text-xs text-[#888888]">{fmtDate(band.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[#888888]">No bands.</p>
        )}
      </div>

      {/* Venues */}
      <div>
        <h2 className="text-sm font-semibold text-[#888888] uppercase tracking-widest mb-3">
          Claimed venues ({venues?.length ?? 0})
        </h2>
        {(venues ?? []).length > 0 ? (
          <div className="bg-[#FFFFFF] border border-[#E8E8E8] rounded-xl overflow-hidden">
            {(venues ?? []).map((venue, i) => (
              <div
                key={venue.id}
                className={`flex items-center justify-between px-4 py-3 ${
                  i > 0 ? 'border-t border-[#E8E8E8]' : ''
                }`}
              >
                <div>
                  <Link href={`/admin/venues/${venue.id}`} className="text-sm text-[#FD6A2F] hover:underline">
                    {venue.name}
                  </Link>
                  <p className="text-xs text-[#888888]">
                    {venue.location_city}, {venue.location_state}
                  </p>
                </div>
                {!venue.is_active && (
                  <span className="text-xs text-[#888888]">Inactive</span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[#888888]">No claimed venues.</p>
        )}
      </div>
    </div>
  )
}
