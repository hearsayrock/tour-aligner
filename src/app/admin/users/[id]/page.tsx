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
      <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-1">{label}</p>
      <p className="text-sm text-ink">{value}</p>
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

  if (!profile) return notFound()

  const toggleSuspend = suspendUser.bind(null, id, !profile.is_suspended)

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <Link href="/admin/users" className="text-sm text-muted hover:text-ink transition-colors">
        ← Users
      </Link>

      <div className="flex items-start justify-between mt-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-ink">{profile.full_name ?? profile.email ?? 'Unknown user'}</h1>
          <p className="text-sm text-muted mt-0.5">{profile.email ?? '—'}</p>
        </div>
        <div className="flex items-center gap-2">
          {profile.is_admin && (
            <span className="text-xs px-2 py-0.5 rounded border bg-brand/10 text-brand-text border-brand/20">
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
      <div className="bg-surface border border-border rounded-xl p-5 grid grid-cols-2 gap-5 mb-6">
        <Field label="Email" value={profile.email ?? '—'} />
        <Field label="Phone" value={profile.phone ?? '—'} />
        <Field label="Role" value={profile.primary_role ?? '—'} />
        <Field label="Joined" value={fmtDate(profile.created_at)} />
      </div>

      {/* Actions */}
      {!profile.is_admin && (
        <div className="bg-surface border border-border rounded-xl p-5 mb-6">
          <h2 className="text-sm font-semibold text-ink mb-3">Actions</h2>
          <form action={toggleSuspend}>
            <button
              type="submit"
              className={`text-sm font-semibold px-4 py-2 rounded-lg border transition-colors ${
                profile.is_suspended
                  ? 'border-border text-ink hover:bg-surface-2'
                  : 'border-red-200 text-red-500 bg-red-50 hover:bg-red-100'
              }`}
            >
              {profile.is_suspended ? 'Unsuspend user' : 'Suspend user'}
            </button>
          </form>
          <p className="text-xs text-muted mt-2">
            To permanently delete a user, use the Supabase dashboard.
          </p>
        </div>
      )}

      {/* Bands */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-muted uppercase tracking-widest mb-3">
          Bands ({bands?.length ?? 0})
        </h2>
        {(bands ?? []).length > 0 ? (
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            {(bands ?? []).map((band, i) => (
              <div
                key={band.id}
                className={`flex items-center justify-between px-4 py-3 ${
                  i > 0 ? 'border-t border-border' : ''
                }`}
              >
                <Link href={`/admin/bands/${band.id}`} className="text-sm text-brand-text hover:underline">
                  {band.name}
                </Link>
                <div className="flex items-center gap-3">
                  {!band.is_active && (
                    <span className="text-xs text-muted">Inactive</span>
                  )}
                  <span className="text-xs text-muted">{fmtDate(band.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted">No bands.</p>
        )}
      </div>

      {/* Venues */}
      <div>
        <h2 className="text-sm font-semibold text-muted uppercase tracking-widest mb-3">
          Claimed venues ({venues?.length ?? 0})
        </h2>
        {(venues ?? []).length > 0 ? (
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            {(venues ?? []).map((venue, i) => (
              <div
                key={venue.id}
                className={`flex items-center justify-between px-4 py-3 ${
                  i > 0 ? 'border-t border-border' : ''
                }`}
              >
                <div>
                  <Link href={`/admin/venues/${venue.id}`} className="text-sm text-brand-text hover:underline">
                    {venue.name}
                  </Link>
                  <p className="text-xs text-muted">
                    {venue.location_city}, {venue.location_state}
                  </p>
                </div>
                {!venue.is_active && (
                  <span className="text-xs text-muted">Inactive</span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted">No claimed venues.</p>
        )}
      </div>
    </div>
  )
}
