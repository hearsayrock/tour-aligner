import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { deactivateBand } from '@/lib/admin/actions'
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

export default async function AdminBandDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: band }, { data: inquiries }] = await Promise.all([
    supabase
      .from('bands')
      .select('*, profiles(id, email, full_name)')
      .eq('id', id)
      .single(),
    supabase
      .from('booking_inquiries')
      .select('id, requested_date, status, created_at, venues(id, name)')
      .eq('band_id', id)
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  if (!band) return notFound()

  const b = band as typeof band & { profiles: { id: string; email: string | null; full_name: string | null } | null }
  const toggleActive = deactivateBand.bind(null, id, !b.is_active)

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <Link href="/admin/bands" className="text-sm text-[#888888] hover:text-[#252525] transition-colors">
        ← Bands
      </Link>

      <div className="flex items-start justify-between mt-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-[#252525]">{b.name}</h1>
          <p className="text-sm text-[#888888] mt-0.5">/{b.slug}</p>
        </div>
        {!b.is_active && (
          <span className="text-xs px-2 py-0.5 rounded border bg-[#F5F5F5] text-[#888888] border-[#E8E8E8]">
            Inactive
          </span>
        )}
      </div>

      {/* Details */}
      <div className="bg-[#FFFFFF] border border-[#E8E8E8] rounded-xl p-5 grid grid-cols-2 gap-5 mb-6">
        <div>
          <p className="text-xs font-semibold text-[#888888] uppercase tracking-wider mb-1">Owner</p>
          {b.profiles ? (
            <Link href={`/admin/users/${b.profiles.id}`} className="text-sm text-[#FD6A2F] hover:underline">
              {b.profiles.email ?? b.profiles.full_name ?? '—'}
            </Link>
          ) : (
            <p className="text-sm text-[#252525]">—</p>
          )}
        </div>
        <Field label="Location" value={b.location_city && b.location_state ? `${b.location_city}, ${b.location_state}` : null} />
        <Field label="Artist type" value={b.artist_type} />
        <Field label="Touring radius" value={b.touring_radius} />
        <Field label="Created" value={fmtDate(b.created_at)} />
        <Field label="Set length" value={b.set_length_min ? `${b.set_length_min} min` : null} />
      </div>

      {/* Actions */}
      <div className="bg-[#FFFFFF] border border-[#E8E8E8] rounded-xl p-5 mb-6">
        <h2 className="text-sm font-semibold text-[#252525] mb-3">Actions</h2>
        <div className="flex items-center gap-3">
          <form action={toggleActive}>
            <button
              type="submit"
              className={`text-sm font-semibold px-4 py-2 rounded-lg border transition-colors ${
                b.is_active
                  ? 'border-red-200 text-red-500 bg-red-50 hover:bg-red-100'
                  : 'border-[#E8E8E8] text-[#252525] hover:bg-[#F5F5F5]'
              }`}
            >
              {b.is_active ? 'Deactivate band' : 'Reactivate band'}
            </button>
          </form>
          <Link
            href={`/bands/${b.slug}`}
            target="_blank"
            className="text-sm text-[#888888] hover:text-[#252525] transition-colors"
          >
            View public profile ↗
          </Link>
        </div>
      </div>

      {/* Inquiries */}
      <div>
        <h2 className="text-sm font-semibold text-[#888888] uppercase tracking-widest mb-3">
          Inquiries ({inquiries?.length ?? 0})
        </h2>
        {(inquiries ?? []).length > 0 ? (
          <div className="bg-[#FFFFFF] border border-[#E8E8E8] rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#E8E8E8]">
                  <th className="text-left text-xs font-semibold text-[#888888] uppercase tracking-wider px-4 py-3">Venue</th>
                  <th className="text-left text-xs font-semibold text-[#888888] uppercase tracking-wider px-4 py-3">Date</th>
                  <th className="text-left text-xs font-semibold text-[#888888] uppercase tracking-wider px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {(inquiries ?? []).map((inq) => {
                  const row = inq as typeof inq & { venues: { id: string; name: string } | null }
                  const badge = STATUS_BADGE[row.status]
                  return (
                    <tr key={row.id} className="border-b border-[#E8E8E8] last:border-0 hover:bg-[#F5F5F5] transition-colors">
                      <td className="px-4 py-3">
                        {row.venues ? (
                          <Link href={`/admin/venues/${row.venues.id}`} className="text-sm text-[#FD6A2F] hover:underline">
                            {row.venues.name}
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
          <p className="text-sm text-[#888888]">No inquiries.</p>
        )}
      </div>
    </div>
  )
}
