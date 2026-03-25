import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { InquiryActions } from '@/components/inquiries/InquiryActions'
import type { InquiryStatus } from '@/types/database'

export const metadata = { title: 'Inquiries' }

const STATUS_BADGE: Record<InquiryStatus, { label: string; className: string }> = {
  pending:   { label: 'Pending',   className: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20' },
  accepted:  { label: 'Accepted',  className: 'text-[#00bba5] bg-[#00bba5]/10 border-[#00bba5]/20' },
  declined:  { label: 'Declined',  className: 'text-red-400 bg-red-400/10 border-red-400/20' },
  cancelled: { label: 'Cancelled', className: 'text-[#CCCCCC] bg-[#F5F5F5] border-[#E8E8E8]' },
}

function StatusBadge({ status }: { status: InquiryStatus }) {
  const { label, className } = STATUS_BADGE[status]
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded border ${className}`}>
      {label}
    </span>
  )
}

function formatDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

type InquiryWithJoins = {
  id: string
  requested_date: string
  message: string
  expected_draw: number | null
  status: InquiryStatus
  response_message: string | null
  responded_at: string | null
  created_at: string
  bands: { id: string; name: string; slug: string } | null
  venues: { id: string; name: string; slug: string; location_city: string; location_state: string } | null
}

export default async function InquiriesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch user's band IDs and venue IDs in parallel
  const [{ data: userBands }, { data: userVenues }] = await Promise.all([
    supabase.from('bands').select('id').eq('user_id', user.id),
    supabase.from('venues').select('id').eq('claimed_by_user_id', user.id),
  ])

  const userBandIds = (userBands ?? []).map((b) => b.id)
  const userVenueIds = (userVenues ?? []).map((v) => v.id)

  // Fetch all inquiries visible to this user (RLS handles access control)
  const { data: allInquiries } = await supabase
    .from('booking_inquiries')
    .select(`
      id, requested_date, message, expected_draw,
      status, response_message, responded_at, created_at,
      bands (id, name, slug),
      venues (id, name, slug, location_city, location_state)
    `)
    .order('created_at', { ascending: false })

  const inquiries = (allInquiries ?? []) as InquiryWithJoins[]

  const sentInquiries = inquiries.filter(
    (i) => i.bands && userBandIds.includes(i.bands.id)
  )
  const receivedInquiries = inquiries.filter(
    (i) => i.venues && userVenueIds.includes(i.venues.id)
  )

  const hasSent = sentInquiries.length > 0
  const hasReceived = receivedInquiries.length > 0
  const hasAnything = hasSent || hasReceived

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-bold mb-8">Inquiries</h1>

      {!hasAnything && (
        <div className="bg-[#FFFFFF] border border-[#E8E8E8] rounded-xl p-12 text-center">
          <p className="text-[#888888] mb-4">No inquiries yet.</p>
          <Link
            href="/dashboard/venues"
            className="inline-block bg-[#FD6A2F] text-white text-sm font-semibold rounded-lg px-5 py-2.5 hover:bg-[#E55A22] transition-colors"
          >
            Browse venues
          </Link>
        </div>
      )}

      {/* Received (venue owner view) */}
      {hasReceived && (
        <section className="mb-12">
          <h2 className="text-sm font-semibold text-[#888888] uppercase tracking-widest mb-4">
            Received
          </h2>
          <div className="space-y-4">
            {receivedInquiries.map((inquiry) => (
              <div
                key={inquiry.id}
                className="bg-[#FFFFFF] border border-[#E8E8E8] rounded-xl p-5"
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="min-w-0">
                    <p className="font-semibold">
                      {inquiry.bands?.name ?? 'Unknown band'}
                    </p>
                    <p className="text-sm text-[#888888] mt-0.5">
                      {inquiry.venues?.name} · {formatDate(inquiry.requested_date)}
                      {inquiry.expected_draw != null && ` · ~${inquiry.expected_draw} expected`}
                    </p>
                  </div>
                  <StatusBadge status={inquiry.status} />
                </div>

                <p className="text-sm text-[#252525] mt-3 leading-relaxed">{inquiry.message}</p>

                {inquiry.response_message && (
                  <p className="text-sm text-[#888888] mt-2 italic">
                    Your response: &ldquo;{inquiry.response_message}&rdquo;
                  </p>
                )}

                <InquiryActions
                  inquiryId={inquiry.id}
                  role="venue"
                  status={inquiry.status}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Sent (band owner view) */}
      {hasSent && (
        <section>
          <h2 className="text-sm font-semibold text-[#888888] uppercase tracking-widest mb-4">
            Sent
          </h2>
          <div className="space-y-4">
            {sentInquiries.map((inquiry) => (
              <div
                key={inquiry.id}
                className="bg-[#FFFFFF] border border-[#E8E8E8] rounded-xl p-5"
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="min-w-0">
                    <p className="font-semibold">
                      {inquiry.venues ? (
                        <Link
                          href={`/venues/${inquiry.venues.slug}`}
                          className="hover:text-[#FD6A2F] transition-colors"
                        >
                          {inquiry.venues.name}
                        </Link>
                      ) : (
                        'Unknown venue'
                      )}
                    </p>
                    <p className="text-sm text-[#888888] mt-0.5">
                      {inquiry.venues
                        ? `${inquiry.venues.location_city}, ${inquiry.venues.location_state} · `
                        : ''}
                      {formatDate(inquiry.requested_date)}
                      {inquiry.bands && (
                        <> · as <span className="text-[#777777]">{inquiry.bands.name}</span></>
                      )}
                    </p>
                  </div>
                  <StatusBadge status={inquiry.status} />
                </div>

                <p className="text-sm text-[#777777] mt-3 leading-relaxed line-clamp-2">
                  {inquiry.message}
                </p>

                {inquiry.response_message && (
                  <div className="mt-3 bg-[#F5F5F5] border border-[#E8E8E8] rounded-lg px-4 py-3">
                    <p className="text-xs text-[#888888] mb-1">Venue response</p>
                    <p className="text-sm text-[#252525]">{inquiry.response_message}</p>
                  </div>
                )}

                <InquiryActions
                  inquiryId={inquiry.id}
                  role="band"
                  status={inquiry.status}
                />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
