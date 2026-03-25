import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export const metadata = { title: 'Admin — Search' }

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default async function AdminSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const query = q?.trim() ?? ''

  const supabase = await createClient()

  const [users, bands, venues, inquiries] = query
    ? await Promise.all([
        supabase
          .from('profiles')
          .select('id, email, full_name, is_suspended, created_at')
          .or(`email.ilike.%${query}%,full_name.ilike.%${query}%`)
          .limit(10),
        supabase
          .from('bands')
          .select('id, name, slug, is_active, created_at')
          .ilike('name', `%${query}%`)
          .limit(10),
        supabase
          .from('venues')
          .select('id, name, slug, location_city, location_state, is_active, claimed_by_user_id, created_at')
          .or(`name.ilike.%${query}%,location_city.ilike.%${query}%`)
          .limit(10),
        supabase
          .from('booking_inquiries')
          .select('id, message, status, requested_date, created_at, bands(name), venues(name)')
          .ilike('message', `%${query}%`)
          .limit(10),
      ])
    : [{ data: null }, { data: null }, { data: null }, { data: null }]

  const hasResults =
    (users.data?.length ?? 0) +
    (bands.data?.length ?? 0) +
    (venues.data?.length ?? 0) +
    (inquiries.data?.length ?? 0) > 0

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <h1 className="text-xl font-bold text-[#252525] mb-6">Search</h1>

      <form method="GET">
        <div className="flex gap-2">
          <input
            name="q"
            defaultValue={query}
            placeholder="Search users, bands, venues, inquiries…"
            autoFocus
            className="flex-1 bg-[#F5F5F5] border border-[#E8E8E8] rounded-lg px-4 py-2.5 text-sm text-[#252525] placeholder-[#888888] focus:outline-none focus:border-[#FD6A2F] transition-colors"
          />
          <button
            type="submit"
            className="bg-[#FD6A2F] text-white text-sm font-semibold px-4 py-2.5 rounded-lg hover:bg-[#E55A22] transition-colors"
          >
            Search
          </button>
        </div>
      </form>

      {query && !hasResults && (
        <p className="mt-8 text-sm text-[#888888]">No results for &ldquo;{query}&rdquo;</p>
      )}

      {query && hasResults && (
        <div className="mt-8 space-y-8">
          {/* Users */}
          {(users.data?.length ?? 0) > 0 && (
            <section>
              <h2 className="text-xs font-semibold text-[#888888] uppercase tracking-widest mb-3">
                Users ({users.data!.length})
              </h2>
              <div className="bg-[#FFFFFF] border border-[#E8E8E8] rounded-xl overflow-hidden">
                {users.data!.map((u, i) => (
                  <Link
                    key={u.id}
                    href={`/admin/users/${u.id}`}
                    className={`flex items-center justify-between px-4 py-3 hover:bg-[#F5F5F5] transition-colors ${
                      i > 0 ? 'border-t border-[#E8E8E8]' : ''
                    }`}
                  >
                    <div>
                      <p className="text-sm font-medium text-[#252525]">{u.email ?? '—'}</p>
                      <p className="text-xs text-[#888888]">{u.full_name ?? 'No name'} · {fmtDate(u.created_at)}</p>
                    </div>
                    {u.is_suspended && (
                      <span className="text-xs px-2 py-0.5 rounded border bg-red-50 text-red-500 border-red-200">
                        Suspended
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Bands */}
          {(bands.data?.length ?? 0) > 0 && (
            <section>
              <h2 className="text-xs font-semibold text-[#888888] uppercase tracking-widest mb-3">
                Bands ({bands.data!.length})
              </h2>
              <div className="bg-[#FFFFFF] border border-[#E8E8E8] rounded-xl overflow-hidden">
                {bands.data!.map((b, i) => (
                  <Link
                    key={b.id}
                    href={`/admin/bands/${b.id}`}
                    className={`flex items-center justify-between px-4 py-3 hover:bg-[#F5F5F5] transition-colors ${
                      i > 0 ? 'border-t border-[#E8E8E8]' : ''
                    }`}
                  >
                    <div>
                      <p className="text-sm font-medium text-[#252525]">{b.name}</p>
                      <p className="text-xs text-[#888888]">{fmtDate(b.created_at)}</p>
                    </div>
                    {!b.is_active && (
                      <span className="text-xs px-2 py-0.5 rounded border bg-[#F5F5F5] text-[#888888] border-[#E8E8E8]">
                        Inactive
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Venues */}
          {(venues.data?.length ?? 0) > 0 && (
            <section>
              <h2 className="text-xs font-semibold text-[#888888] uppercase tracking-widest mb-3">
                Venues ({venues.data!.length})
              </h2>
              <div className="bg-[#FFFFFF] border border-[#E8E8E8] rounded-xl overflow-hidden">
                {venues.data!.map((v, i) => (
                  <Link
                    key={v.id}
                    href={`/admin/venues/${v.id}`}
                    className={`flex items-center justify-between px-4 py-3 hover:bg-[#F5F5F5] transition-colors ${
                      i > 0 ? 'border-t border-[#E8E8E8]' : ''
                    }`}
                  >
                    <div>
                      <p className="text-sm font-medium text-[#252525]">{v.name}</p>
                      <p className="text-xs text-[#888888]">
                        {v.location_city}, {v.location_state} ·{' '}
                        {v.claimed_by_user_id ? 'Claimed' : 'Unclaimed'}
                      </p>
                    </div>
                    {!v.is_active && (
                      <span className="text-xs px-2 py-0.5 rounded border bg-[#F5F5F5] text-[#888888] border-[#E8E8E8]">
                        Inactive
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Inquiries */}
          {(inquiries.data?.length ?? 0) > 0 && (
            <section>
              <h2 className="text-xs font-semibold text-[#888888] uppercase tracking-widest mb-3">
                Inquiries ({inquiries.data!.length})
              </h2>
              <div className="bg-[#FFFFFF] border border-[#E8E8E8] rounded-xl overflow-hidden">
                {inquiries.data!.map((inq, i) => {
                  const row = inq as typeof inq & {
                    bands: { name: string } | null
                    venues: { name: string } | null
                  }
                  return (
                    <Link
                      key={row.id}
                      href={`/admin/inquiries/${row.id}`}
                      className={`flex items-center justify-between px-4 py-3 hover:bg-[#F5F5F5] transition-colors ${
                        i > 0 ? 'border-t border-[#E8E8E8]' : ''
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[#252525]">
                          {row.bands?.name ?? '—'} → {row.venues?.name ?? '—'}
                        </p>
                        <p className="text-xs text-[#888888] truncate">{row.message}</p>
                      </div>
                      <span className="ml-3 shrink-0 text-xs text-[#888888] capitalize">{row.status}</span>
                    </Link>
                  )
                })}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
