import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { approveVenueClaim, rejectVenueClaim } from '@/lib/admin/actions'
import type { ClaimStatus } from '@/types/database'

export const metadata = { title: 'Admin — Claims' }

const CLAIM_BADGE: Record<ClaimStatus, { label: string; className: string }> = {
  pending:  { label: 'Pending',  className: 'text-yellow-600 bg-yellow-50 border-yellow-200' },
  approved: { label: 'Approved', className: 'text-brand-2 bg-brand-2/10 border-brand-2/20' },
  rejected: { label: 'Rejected', className: 'text-red-500 bg-red-50 border-red-200' },
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const STATUSES: ClaimStatus[] = ['pending', 'approved']

export default async function AdminClaimsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status } = await searchParams
  const activeStatus: ClaimStatus = STATUSES.includes(status as ClaimStatus)
    ? (status as ClaimStatus)
    : 'pending'

  const supabase = await createClient()

  const { data: claims } = await supabase
    .from('venue_claims')
    .select('id, status, created_at, venues(id, name, slug), profiles(id, email, full_name)')
    .eq('status', activeStatus)
    .order('created_at', { ascending: false })

  return (
    <div className="px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-ink">Venue Claims</h1>
        <span className="text-sm text-muted">{claims?.length ?? 0} shown</span>
      </div>

      {/* Status tabs */}
      <div className="flex items-center gap-2 mb-5">
        {STATUSES.map((s) => (
          <Link
            key={s}
            href={`/admin/claims?status=${s}`}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors capitalize ${
              activeStatus === s
                ? 'bg-cocoa text-white border-edge'
                : 'text-muted border-border hover:border-border-strong'
            }`}
          >
            {s}
          </Link>
        ))}
      </div>

      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left text-xs font-semibold text-muted uppercase tracking-wider px-4 py-3">Venue</th>
              <th className="text-left text-xs font-semibold text-muted uppercase tracking-wider px-4 py-3">Claimed by</th>
              <th className="text-left text-xs font-semibold text-muted uppercase tracking-wider px-4 py-3">Submitted</th>
              <th className="text-left text-xs font-semibold text-muted uppercase tracking-wider px-4 py-3">Status</th>
              {activeStatus === 'pending' && (
                <th className="text-left text-xs font-semibold text-muted uppercase tracking-wider px-4 py-3">Actions</th>
              )}
              {activeStatus === 'approved' && (
                <th className="text-left text-xs font-semibold text-muted uppercase tracking-wider px-4 py-3">Actions</th>
              )}
            </tr>
          </thead>
          <tbody>
            {(claims ?? []).map((claim) => {
              const row = claim as typeof claim & {
                venues: { id: string; name: string; slug: string } | null
                profiles: { id: string; email: string | null; full_name: string | null } | null
              }
              const badge = CLAIM_BADGE[row.status]
              const approveFn = approveVenueClaim.bind(null, row.id)
              const rejectFn = row.venues
                ? rejectVenueClaim.bind(null, row.id, row.venues.id)
                : null

              return (
                <tr key={row.id} className="border-b border-border last:border-0 hover:bg-surface-2 transition-colors">
                  <td className="px-4 py-3">
                    {row.venues ? (
                      <Link href={`/admin/venues/${row.venues.id}`} className="text-sm text-brand-text hover:underline">
                        {row.venues.name}
                      </Link>
                    ) : <span className="text-sm text-muted">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {row.profiles ? (
                      <Link href={`/admin/users/${row.profiles.id}`} className="text-sm text-muted hover:text-ink transition-colors">
                        {row.profiles.email ?? row.profiles.full_name ?? '—'}
                      </Link>
                    ) : <span className="text-sm text-muted">—</span>}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted">{fmtDate(row.created_at)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded border ${badge.className}`}>
                      {badge.label}
                    </span>
                  </td>
                  {activeStatus === 'pending' && (
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <form action={approveFn}>
                          <button
                            type="submit"
                            className="text-xs font-semibold text-brand-2 hover:underline"
                          >
                            Approve
                          </button>
                        </form>
                        {rejectFn && (
                          <form action={rejectFn}>
                            <button
                              type="submit"
                              className="text-xs font-semibold text-red-500 hover:underline"
                            >
                              Reject
                            </button>
                          </form>
                        )}
                      </div>
                    </td>
                  )}
                  {activeStatus === 'approved' && (
                    <td className="px-4 py-3">
                      {rejectFn && (
                        <form action={rejectFn}>
                          <button
                            type="submit"
                            className="text-xs font-semibold text-red-500 hover:underline"
                          >
                            Revoke
                          </button>
                        </form>
                      )}
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
        {(claims ?? []).length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-muted">
            No {activeStatus} claims.
          </p>
        )}
      </div>
    </div>
  )
}
