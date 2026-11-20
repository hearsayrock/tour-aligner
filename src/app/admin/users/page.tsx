import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export const metadata = { title: 'Admin — Users' }

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default async function AdminUsersPage() {
  const supabase = await createClient()

  const { data: users } = await supabase
    .from('profiles')
    .select('id, email, full_name, is_suspended, is_admin, created_at')
    .order('created_at', { ascending: false })

  return (
    <div className="px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-ink">Users</h1>
        <span className="text-sm text-muted">{users?.length ?? 0} total</span>
      </div>

      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left text-xs font-semibold text-muted uppercase tracking-wider px-4 py-3">Email</th>
              <th className="text-left text-xs font-semibold text-muted uppercase tracking-wider px-4 py-3">Name</th>
              <th className="text-left text-xs font-semibold text-muted uppercase tracking-wider px-4 py-3">Joined</th>
              <th className="text-left text-xs font-semibold text-muted uppercase tracking-wider px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {(users ?? []).map((user) => (
              <tr key={user.id} className="border-b border-border last:border-0 hover:bg-surface-2 transition-colors">
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/users/${user.id}`}
                    className="text-sm text-brand-text hover:underline"
                  >
                    {user.email ?? '—'}
                  </Link>
                </td>
                <td className="px-4 py-3 text-sm text-ink">{user.full_name ?? '—'}</td>
                <td className="px-4 py-3 text-sm text-muted">{fmtDate(user.created_at)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {user.is_suspended && (
                      <span className="text-xs px-2 py-0.5 rounded border bg-red-50 text-red-500 border-red-200">
                        Suspended
                      </span>
                    )}
                    {user.is_admin && (
                      <span className="text-xs px-2 py-0.5 rounded border bg-brand/10 text-brand-text border-brand/20">
                        Admin
                      </span>
                    )}
                    {!user.is_suspended && !user.is_admin && (
                      <span className="text-xs text-muted">Active</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {(users ?? []).length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-muted">No users found.</p>
        )}
      </div>
    </div>
  )
}
