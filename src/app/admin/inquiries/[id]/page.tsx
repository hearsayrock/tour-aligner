import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { InquiryStatus } from '@/types/database'

export const metadata = { title: 'Admin — Legacy Inquiry' }

const STATUS_BADGE: Record<InquiryStatus, { label: string; className: string }> = {
  pending:   { label: 'Pending',   className: 'text-yellow-600 bg-yellow-50 border-yellow-200' },
  accepted:  { label: 'Accepted',  className: 'text-brand-2 bg-brand-2/10 border-brand-2/20' },
  declined:  { label: 'Declined',  className: 'text-red-500 bg-red-50 border-red-200' },
  cancelled: { label: 'Cancelled', className: 'text-muted bg-surface-2 border-border' },
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function fmtDateTime(s: string) {
  return new Date(s).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  })
}

export default async function AdminInquiryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: inq } = await supabase
    .from('booking_inquiries')
    .select('*, bands(id, name, slug, user_id), venues(id, name, slug, claimed_by_user_id)')
    .eq('id', id)
    .single()

  if (!inq) return notFound()

  const row = inq as typeof inq & {
    bands: { id: string; name: string; slug: string; user_id: string } | null
    venues: { id: string; name: string; slug: string; claimed_by_user_id: string | null } | null
  }

  const badge = STATUS_BADGE[row.status]

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <Link href="/admin/inquiries" className="text-sm text-muted hover:text-ink transition-colors">
        ← Legacy Inquiries
      </Link>

      <div className="flex items-start justify-between mt-4 mb-6">
        <h1 className="text-xl font-bold text-ink">Legacy Inquiry</h1>
        <span className={`text-xs font-medium px-2 py-1 rounded border ${badge.className}`}>
          {badge.label}
        </span>
      </div>

      <div className="mb-6 rounded-xl border border-border bg-surface px-4 py-3">
        <p className="text-sm text-text-secondary">
          This is an archived inquiry record. Current conversations are in Chats, and booking details are in Backstage.
        </p>
      </div>

      <div className="bg-surface border border-border rounded-xl p-5 space-y-5 mb-6">
        {/* Band */}
        <div>
          <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-1">Band</p>
          {row.bands ? (
            <Link href={`/admin/bands/${row.bands.id}`} className="text-sm text-brand-text hover:underline">
              {row.bands.name}
            </Link>
          ) : <p className="text-sm text-ink">—</p>}
        </div>

        {/* Venue */}
        <div>
          <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-1">Venue</p>
          {row.venues ? (
            <Link href={`/admin/venues/${row.venues.id}`} className="text-sm text-brand-text hover:underline">
              {row.venues.name}
            </Link>
          ) : <p className="text-sm text-ink">—</p>}
        </div>

        {/* Date */}
        <div>
          <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-1">Requested date</p>
          <p className="text-sm text-ink">{fmtDate(row.requested_date)}</p>
        </div>

        {/* Expected draw */}
        {row.expected_draw != null && (
          <div>
            <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-1">Expected draw</p>
            <p className="text-sm text-ink">{row.expected_draw.toLocaleString()}</p>
          </div>
        )}

        {/* Message */}
        <div>
          <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-1">Message</p>
          <p className="text-sm text-ink whitespace-pre-wrap">{row.message}</p>
        </div>

        {/* Response */}
        {row.response_message && (
          <div>
            <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-1">Response</p>
            <p className="text-sm text-ink whitespace-pre-wrap">{row.response_message}</p>
          </div>
        )}
      </div>

      {/* Timestamps */}
      <div className="text-xs text-muted space-y-1">
        <p>Submitted {fmtDateTime(row.created_at)}</p>
        {row.responded_at && <p>Responded {fmtDateTime(row.responded_at)}</p>}
      </div>
    </div>
  )
}
