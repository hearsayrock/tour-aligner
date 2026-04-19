import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { unlistVenue, approveVenueClaim, rejectVenueClaim } from '@/lib/admin/actions'
import type { InquiryStatus } from '@/types/database'

const STATUS_BADGE: Record<InquiryStatus, { label: string; className: string }> = {
  pending:   { label: 'Pending',   className: 'text-yellow-600 bg-yellow-50 border-yellow-200' },
  accepted:  { label: 'Accepted',  className: 'text-[#00bba5] bg-[#00bba5]/10 border-[#00bba5]/20' },
  declined:  { label: 'Declined',  className: 'text-red-500 bg-red-50 border-red-200' },
  cancelled: { label: 'Cancelled', className: 'text-[#888888] bg-[#F5F5F5] border-[#E8E8E8]' },
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold text-[#888888] uppercase tracking-wider mb-1">{label}</p>
      <p className="text-sm text-[#252525]">{value ?? '—'}</p>
    </div>
  )
}

export default async function AdminVenueDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: venue }, { data: inquiries }, { data: claim }] = await Promise.all([
    supabase
      .from('venues')
      .select('*, profiles(id, email, full_name)')
      .eq('id', id)
      .single(),
    supabase
      .from('booking_inquiries')
      .select('id, requested_date, status, created_at, bands(id, name)')
      .eq('venue_id', id)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('venue_claims')
      .select('id, status, created_at, profiles(id, email, full_name)')
      .eq('venue_id', id)
      .maybeSingle(),
  ])

  if (!venue) return notFound()

  const v = venue as typeof venue & { profiles: { id: string; email: string | null; full_name: string | null } | null }
  const claimRow = claim as typeof claim & { profiles: { id: string; email: string | null; full_name: string | null } | null } | null

  const toggleUnlist = unlistVenue.bind(null, id, !v.is_unlisted)
  const approveFn = claimRow ? approveVenueClaim.bind(null, claimRow.id) : null
  const rejectFn = claimRow ? rejectVenueClaim.bind(null, claimRow.id, id) : null

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <Link href="/admin/venues" className="text-sm text-[#888888] hover:text-[#252525] transition-colors">
        ← Venues
      </Link>

      <div className="flex items-start justify-between mt-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-[#252525]">{v.name}</h1>
          <p className="text-sm text-[#888888] mt-0.5">
            {v.location_city}, {v.location_state}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!v.is_active && (
            <span className="text-xs px-2 py-0.5 rounded border bg-[#F5F5F5] text-[#888888] border-[#E8E8E8]">
              Inactive
            </span>
          )}
          {v.is_unlisted && (
            <span className="text-xs px-2 py-0.5 rounded border bg-yellow-50 text-yellow-600 border-yellow-200">
              Unlisted
            </span>
          )}
        </div>
      </div>

      {/* Details */}
      <div className="bg-[#FFFFFF] border border-[#E8E8E8] rounded-xl p-5 grid grid-cols-2 gap-5 mb-6">
        <Field label="Address" value={v.location_address} />
        <Field label="Capacity" value={v.capacity ? v.capacity.toLocaleString() : null} />
        <Field label="Age requirement" value={v.age_requirement?.replace('_', ' ')} />
        <Field label="Booking email" value={v.booking_email} />
        <Field label="Phone" value={v.phone} />
        <Field label="Created" value={fmtDate(v.created_at)} />
      </div>

      {/* Claim info */}
      <div className="bg-[#FFFFFF] border border-[#E8E8E8] rounded-xl p-5 mb-6">
        <h2 className="text-sm font-semibold text-[#252525] mb-3">Ownership</h2>
        {v.profiles ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-[#888888] mb-0.5">Claimed by</p>
              <Link href={`/admin/users/${v.profiles.id}`} className="text-sm text-[#FD6A2F] hover:underline">
                {v.profiles.email ?? v.profiles.full_name ?? '—'}
              </Link>
              {claimRow && (
                <p className="text-xs text-[#888888] mt-0.5">
                  Claimed {fmtDate(claimRow.created_at)}
                </p>
              )}
            </div>
            {rejectFn && (
              <form action={rejectFn}>
                <button
                  type="submit"
                  className="text-sm font-semibold px-4 py-2 rounded-lg border border-red-200 text-red-500 bg-red-50 hover:bg-red-100 transition-colors"
                >
                  Revoke claim
                </button>
              </form>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <p className="text-sm text-[#888888]">Unclaimed</p>
            {claimRow?.status === 'pending' && approveFn && rejectFn && (
              <div className="flex items-center gap-2">
                <p className="text-xs text-[#888888]">Pending claim from {claimRow.profiles?.email ?? '—'}</p>
                <form action={approveFn}>
                  <button type="submit" className="text-xs font-semibold text-[#00bba5] hover:underline">
                    Approve
                  </button>
                </form>
                <form action={rejectFn}>
                  <button type="submit" className="text-xs font-semibold text-red-500 hover:underline">
                    Reject
                  </button>
                </form>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="bg-[#FFFFFF] border border-[#E8E8E8] rounded-xl p-5 mb-6">
        <h2 className="text-sm font-semibold text-[#252525] mb-3">Actions</h2>
        <div className="flex items-center gap-3">
          <form action={toggleUnlist}>
            <button
              type="submit"
              className={`text-sm font-semibold px-4 py-2 rounded-lg border transition-colors ${
                v.is_unlisted
                  ? 'border-[#E8E8E8] text-[#252525] hover:bg-[#F5F5F5]'
                  : 'border-yellow-200 text-yellow-600 bg-yellow-50 hover:bg-yellow-100'
              }`}
            >
              {v.is_unlisted ? 'Re-list venue' : 'Unlist venue'}
            </button>
          </form>
          <Link
            href={`/venues/${v.slug}`}
            target="_blank"
            className="text-sm text-[#888888] hover:text-[#252525] transition-colors"
          >
            View public profile ↗
          </Link>
        </div>
      </div>

      {/* Legacy inquiries */}
      <div>
        <h2 className="text-sm font-semibold text-[#888888] uppercase tracking-widest mb-3">
          Legacy Inquiries ({inquiries?.length ?? 0})
        </h2>
        {(inquiries ?? []).length > 0 ? (
          <div className="bg-[#FFFFFF] border border-[#E8E8E8] rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#E8E8E8]">
                  <th className="text-left text-xs font-semibold text-[#888888] uppercase tracking-wider px-4 py-3">Band</th>
                  <th className="text-left text-xs font-semibold text-[#888888] uppercase tracking-wider px-4 py-3">Date</th>
                  <th className="text-left text-xs font-semibold text-[#888888] uppercase tracking-wider px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {(inquiries ?? []).map((inq) => {
                  const row = inq as typeof inq & { bands: { id: string; name: string } | null }
                  const badge = STATUS_BADGE[row.status]
                  return (
                    <tr key={row.id} className="border-b border-[#E8E8E8] last:border-0 hover:bg-[#F5F5F5] transition-colors">
                      <td className="px-4 py-3">
                        {row.bands ? (
                          <Link href={`/admin/bands/${row.bands.id}`} className="text-sm text-[#FD6A2F] hover:underline">
                            {row.bands.name}
                          </Link>
                        ) : <span className="text-sm text-[#888888]">—</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-[#888888]">{fmtDate(row.requested_date)}</td>
                      <td className="px-4 py-3">
                        <Link href={`/admin/inquiries/${row.id}`}>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded border cursor-pointer ${badge.className}`}>
                            {badge.label}
                          </span>
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-[#888888]">No legacy inquiries.</p>
        )}
      </div>
    </div>
  )
}
