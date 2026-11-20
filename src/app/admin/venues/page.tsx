import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export const metadata = { title: 'Admin — Venues' }

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default async function AdminVenuesPage() {
  const supabase = await createClient()

  const { data: venues } = await supabase
    .from('venues')
    .select('id, name, slug, location_city, location_state, is_active, is_unlisted, claimed_by_user_id, created_at, profiles(id, email, full_name)')
    .order('name')

  return (
    <div className="px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-ink">Venues</h1>
        <span className="text-sm text-muted">{venues?.length ?? 0} total</span>
      </div>

      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left text-xs font-semibold text-muted uppercase tracking-wider px-4 py-3">Name</th>
              <th className="text-left text-xs font-semibold text-muted uppercase tracking-wider px-4 py-3">Location</th>
              <th className="text-left text-xs font-semibold text-muted uppercase tracking-wider px-4 py-3">Claimed by</th>
              <th className="text-left text-xs font-semibold text-muted uppercase tracking-wider px-4 py-3">Created</th>
              <th className="text-left text-xs font-semibold text-muted uppercase tracking-wider px-4 py-3">Flags</th>
            </tr>
          </thead>
          <tbody>
            {(venues ?? []).map((venue) => {
              const v = venue as typeof venue & { profiles: { id: string; email: string | null; full_name: string | null } | null }
              return (
                <tr key={v.id} className="border-b border-border last:border-0 hover:bg-surface-2 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/admin/venues/${v.id}`} className="text-sm text-brand-text hover:underline">
                      {v.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted">
                    {v.location_city}, {v.location_state}
                  </td>
                  <td className="px-4 py-3">
                    {v.profiles ? (
                      <Link href={`/admin/users/${v.profiles.id}`} className="text-sm text-muted hover:text-ink transition-colors">
                        {v.profiles.email ?? v.profiles.full_name ?? '—'}
                      </Link>
                    ) : (
                      <span className="text-sm text-muted">Unclaimed</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted">{fmtDate(v.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {!v.is_active && (
                        <span className="text-xs px-2 py-0.5 rounded border bg-surface-2 text-muted border-border">
                          Inactive
                        </span>
                      )}
                      {v.is_unlisted && (
                        <span className="text-xs px-2 py-0.5 rounded border bg-yellow-50 text-yellow-600 border-yellow-200">
                          Unlisted
                        </span>
                      )}
                      {v.is_active && !v.is_unlisted && (
                        <span className="text-xs text-muted">—</span>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {(venues ?? []).length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-muted">No venues found.</p>
        )}
      </div>
    </div>
  )
}
