import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export const metadata = { title: 'Admin — Bands' }

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default async function AdminBandsPage() {
  const supabase = await createClient()

  const { data: bands } = await supabase
    .from('bands')
    .select('id, name, slug, location_city, location_state, is_active, created_at, profiles(id, email, full_name)')
    .order('created_at', { ascending: false })

  return (
    <div className="px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-[#252525]">Bands</h1>
        <span className="text-sm text-[#888888]">{bands?.length ?? 0} total</span>
      </div>

      <div className="bg-[#FFFFFF] border border-[#E8E8E8] rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#E8E8E8]">
              <th className="text-left text-xs font-semibold text-[#888888] uppercase tracking-wider px-4 py-3">Name</th>
              <th className="text-left text-xs font-semibold text-[#888888] uppercase tracking-wider px-4 py-3">Owner</th>
              <th className="text-left text-xs font-semibold text-[#888888] uppercase tracking-wider px-4 py-3">Location</th>
              <th className="text-left text-xs font-semibold text-[#888888] uppercase tracking-wider px-4 py-3">Created</th>
              <th className="text-left text-xs font-semibold text-[#888888] uppercase tracking-wider px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {(bands ?? []).map((band) => {
              const b = band as typeof band & { profiles: { id: string; email: string | null; full_name: string | null } | null }
              return (
                <tr key={b.id} className="border-b border-[#E8E8E8] last:border-0 hover:bg-[#F5F5F5] transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/admin/bands/${b.id}`} className="text-sm text-[#FD6A2F] hover:underline">
                      {b.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    {b.profiles ? (
                      <Link href={`/admin/users/${b.profiles.id}`} className="text-sm text-[#888888] hover:text-[#252525] transition-colors">
                        {b.profiles.email ?? b.profiles.full_name ?? '—'}
                      </Link>
                    ) : (
                      <span className="text-sm text-[#888888]">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-[#888888]">
                    {b.location_city && b.location_state ? `${b.location_city}, ${b.location_state}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-[#888888]">{fmtDate(b.created_at)}</td>
                  <td className="px-4 py-3">
                    {b.is_active ? (
                      <span className="text-xs text-[#888888]">Active</span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded border bg-[#F5F5F5] text-[#888888] border-[#E8E8E8]">
                        Inactive
                      </span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {(bands ?? []).length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-[#888888]">No bands found.</p>
        )}
      </div>
    </div>
  )
}
