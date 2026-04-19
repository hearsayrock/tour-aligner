import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { InquiryStatus } from '@/types/database'

export const metadata = { title: 'Admin — Legacy Inquiries' }

const STATUS_BADGE: Record<InquiryStatus, { label: string; className: string }> = {
  pending:   { label: 'Pending',   className: 'text-yellow-600 bg-yellow-50 border-yellow-200' },
  accepted:  { label: 'Accepted',  className: 'text-[#00bba5] bg-[#00bba5]/10 border-[#00bba5]/20' },
  declined:  { label: 'Declined',  className: 'text-red-500 bg-red-50 border-red-200' },
  cancelled: { label: 'Cancelled', className: 'text-[#888888] bg-[#F5F5F5] border-[#E8E8E8]' },
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const STATUSES: InquiryStatus[] = ['pending', 'accepted', 'declined', 'cancelled']

export default async function AdminInquiriesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status } = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('booking_inquiries')
    .select('id, requested_date, status, message, created_at, bands(id, name), venues(id, name)')
    .order('created_at', { ascending: false })

  if (status && STATUSES.includes(status as InquiryStatus)) {
    query = query.eq('status', status)
  }

  const { data: inquiries } = await query

  return (
    <div className="px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-[#252525]">Legacy Inquiries</h1>
        <span className="text-sm text-[#888888]">{inquiries?.length ?? 0} shown</span>
      </div>

      <div className="mb-5 rounded-xl border border-[#E8E8E8] bg-[#F8F8F8] px-4 py-3">
        <p className="text-sm text-[#666666]">
          These records are from the pre-inbox inquiry system. Active outreach now lives in inbox
          threads and bookings.
        </p>
      </div>

      {/* Status filter */}
      <div className="flex items-center gap-2 mb-5">
        <Link
          href="/admin/inquiries"
          className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
            !status
              ? 'bg-[#252525] text-white border-[#252525]'
              : 'text-[#888888] border-[#E8E8E8] hover:border-[#CCCCCC]'
          }`}
        >
          All
        </Link>
        {STATUSES.map((s) => (
          <Link
            key={s}
            href={`/admin/inquiries?status=${s}`}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors capitalize ${
              status === s
                ? 'bg-[#252525] text-white border-[#252525]'
                : 'text-[#888888] border-[#E8E8E8] hover:border-[#CCCCCC]'
            }`}
          >
            {s}
          </Link>
        ))}
      </div>

      <div className="bg-[#FFFFFF] border border-[#E8E8E8] rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#E8E8E8]">
              <th className="text-left text-xs font-semibold text-[#888888] uppercase tracking-wider px-4 py-3">Band</th>
              <th className="text-left text-xs font-semibold text-[#888888] uppercase tracking-wider px-4 py-3">Venue</th>
              <th className="text-left text-xs font-semibold text-[#888888] uppercase tracking-wider px-4 py-3">Date</th>
              <th className="text-left text-xs font-semibold text-[#888888] uppercase tracking-wider px-4 py-3">Status</th>
              <th className="text-left text-xs font-semibold text-[#888888] uppercase tracking-wider px-4 py-3">Submitted</th>
            </tr>
          </thead>
          <tbody>
            {(inquiries ?? []).map((inq) => {
              const row = inq as typeof inq & {
                bands: { id: string; name: string } | null
                venues: { id: string; name: string } | null
              }
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
                  <td className="px-4 py-3">
                    {row.venues ? (
                      <Link href={`/admin/venues/${row.venues.id}`} className="text-sm text-[#FD6A2F] hover:underline">
                        {row.venues.name}
                      </Link>
                    ) : <span className="text-sm text-[#888888]">—</span>}
                  </td>
                  <td className="px-4 py-3 text-sm text-[#888888]">{fmtDate(row.requested_date)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded border ${badge.className}`}>
                      {badge.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/inquiries/${row.id}`} className="text-sm text-[#888888] hover:text-[#252525] transition-colors">
                      {fmtDate(row.created_at)}
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {(inquiries ?? []).length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-[#888888]">No legacy inquiries found.</p>
        )}
      </div>
    </div>
  )
}
