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
        <h1 className="text-xl font-bold text-[#252525]">Venues</h1>
        <span className="text-sm text-[#888888]">{venues?.length ?? 0} total</span>
      </div>

      <div className="bg-[#FFFFFF] border border-[#E8E8E8] rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#E8E8E8]">
              <th className="text-left text-xs font-semibold text-[#888888] uppercase tracking-wider px-4 py-3">Name</th>
              <th className="text-left text-xs font-semibold text-[#888888] uppercase tracking-wider px-4 py-3">Location</th>
              <th className="text-left text-xs font-semibold text-[#888888] uppercase tracking-wider px-4 py-3">Claimed by</th>
              <th className="text-left text-xs font-semibold text-[#888888] uppercase tracking-wider px-4 py-3">Created</th>
              <th className="text-left text-xs font-semibold text-[#888888] uppercase tracking-wider px-4 py-3">Flags</th>
            </tr>
          </thead>
          <tbody>
            {(venues ?? []).map((venue) => {
              const v = venue as typeof venue & { profiles: { id: string; email: string | null; full_name: string | null } | null }
              return (
                <tr key={v.id} className="border-b border-[#E8E8E8] last:border-0 hover:bg-[#F5F5F5] transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/admin/venues/${v.id}`} className="text-sm text-[#FD6A2F] hover:underline">
                      {v.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-[#888888]">
                    {v.location_city}, {v.location_state}
                  </td>
                  <td className="px-4 py-3">
                    {v.profiles ? (
                      <Link href={`/admin/users/${v.profiles.id}`} className="text-sm text-[#888888] hover:text-[#252525] transition-colors">
                        {v.profiles.email ?? v.profiles.full_name ?? '—'}
                      </Link>
                    ) : (
                      <span className="text-sm text-[#888888]">Unclaimed</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-[#888888]">{fmtDate(v.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
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
                      {v.is_active && !v.is_unlisted && (
                        <span className="text-xs text-[#888888]">—</span>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {(venues ?? []).length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-[#888888]">No venues found.</p>
        )}
      </div>
    </div>
  )
}
