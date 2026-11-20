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
        <h1 className="text-xl font-bold text-ink">Bands</h1>
        <span className="text-sm text-muted">{bands?.length ?? 0} total</span>
      </div>

      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left text-xs font-semibold text-muted uppercase tracking-wider px-4 py-3">Name</th>
              <th className="text-left text-xs font-semibold text-muted uppercase tracking-wider px-4 py-3">Owner</th>
              <th className="text-left text-xs font-semibold text-muted uppercase tracking-wider px-4 py-3">Location</th>
              <th className="text-left text-xs font-semibold text-muted uppercase tracking-wider px-4 py-3">Created</th>
              <th className="text-left text-xs font-semibold text-muted uppercase tracking-wider px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {(bands ?? []).map((band) => {
              const b = band as typeof band & { profiles: { id: string; email: string | null; full_name: string | null } | null }
              return (
                <tr key={b.id} className="border-b border-border last:border-0 hover:bg-surface-2 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/admin/bands/${b.id}`} className="text-sm text-brand-text hover:underline">
                      {b.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    {b.profiles ? (
                      <Link href={`/admin/users/${b.profiles.id}`} className="text-sm text-muted hover:text-ink transition-colors">
                        {b.profiles.email ?? b.profiles.full_name ?? '—'}
                      </Link>
                    ) : (
                      <span className="text-sm text-muted">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted">
                    {b.location_city && b.location_state ? `${b.location_city}, ${b.location_state}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted">{fmtDate(b.created_at)}</td>
                  <td className="px-4 py-3">
                    {b.is_active ? (
                      <span className="text-xs text-muted">Active</span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded border bg-surface-2 text-muted border-border">
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
          <p className="px-4 py-8 text-center text-sm text-muted">No bands found.</p>
        )}
      </div>
    </div>
  )
}
