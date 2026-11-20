import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { deactivateBand } from '@/lib/admin/actions'
import type { InquiryStatus } from '@/types/database'

const STATUS_BADGE: Record<InquiryStatus, { label: string; className: string }> = {
  pending:   { label: 'Pending',   className: 'text-yellow-600 bg-yellow-50 border-yellow-200' },
  accepted:  { label: 'Accepted',  className: 'text-brand-2 bg-brand-2/10 border-brand-2/20' },
  declined:  { label: 'Declined',  className: 'text-red-500 bg-red-50 border-red-200' },
  cancelled: { label: 'Cancelled', className: 'text-muted bg-surface-2 border-border' },
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-1">{label}</p>
      <p className="text-sm text-ink">{value ?? '—'}</p>
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
      <Link href="/admin/bands" className="text-sm text-muted hover:text-ink transition-colors">
        ← Bands
      </Link>

      <div className="flex items-start justify-between mt-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-ink">{b.name}</h1>
          <p className="text-sm text-muted mt-0.5">/{b.slug}</p>
        </div>
        {!b.is_active && (
          <span className="text-xs px-2 py-0.5 rounded border bg-surface-2 text-muted border-border">
            Inactive
          </span>
        )}
      </div>

      {/* Details */}
      <div className="bg-surface border border-border rounded-xl p-5 grid grid-cols-2 gap-5 mb-6">
        <div>
          <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-1">Owner</p>
          {b.profiles ? (
            <Link href={`/admin/users/${b.profiles.id}`} className="text-sm text-brand-text hover:underline">
              {b.profiles.email ?? b.profiles.full_name ?? '—'}
            </Link>
          ) : (
            <p className="text-sm text-ink">—</p>
          )}
        </div>
        <Field label="Location" value={b.location_city && b.location_state ? `${b.location_city}, ${b.location_state}` : null} />
        <Field label="Artist type" value={b.artist_type} />
        <Field label="Touring radius" value={b.touring_radius} />
        <Field label="Created" value={fmtDate(b.created_at)} />
        <Field label="Set length" value={b.set_length_min ? `${b.set_length_min} min` : null} />
      </div>

      {/* Actions */}
      <div className="bg-surface border border-border rounded-xl p-5 mb-6">
        <h2 className="text-sm font-semibold text-ink mb-3">Actions</h2>
        <div className="flex items-center gap-3">
          <form action={toggleActive}>
            <button
              type="submit"
              className={`text-sm font-semibold px-4 py-2 rounded-lg border transition-colors ${
                b.is_active
                  ? 'border-red-200 text-red-500 bg-red-50 hover:bg-red-100'
                  : 'border-border text-ink hover:bg-surface-2'
              }`}
            >
              {b.is_active ? 'Deactivate band' : 'Reactivate band'}
            </button>
          </form>
          <Link
            href={`/bands/${b.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-muted hover:text-ink transition-colors"
          >
            View public profile ↗
          </Link>
        </div>
      </div>

      {/* Legacy inquiries */}
      <div>
        <h2 className="text-sm font-semibold text-muted uppercase tracking-widest mb-3">
          Legacy Inquiries ({inquiries?.length ?? 0})
        </h2>
        {(inquiries ?? []).length > 0 ? (
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-xs font-semibold text-muted uppercase tracking-wider px-4 py-3">Venue</th>
                  <th className="text-left text-xs font-semibold text-muted uppercase tracking-wider px-4 py-3">Date</th>
                  <th className="text-left text-xs font-semibold text-muted uppercase tracking-wider px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {(inquiries ?? []).map((inq) => {
                  const row = inq as typeof inq & { venues: { id: string; name: string } | null }
                  const badge = STATUS_BADGE[row.status]
                  return (
                    <tr key={row.id} className="border-b border-border last:border-0 hover:bg-surface-2 transition-colors">
                      <td className="px-4 py-3">
                        {row.venues ? (
                          <Link href={`/admin/venues/${row.venues.id}`} className="text-sm text-brand-text hover:underline">
                            {row.venues.name}
                          </Link>
                        ) : <span className="text-sm text-muted">—</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted">{fmtDate(row.requested_date)}</td>
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
          <p className="text-sm text-muted">No legacy inquiries.</p>
        )}
      </div>
    </div>
  )
}
