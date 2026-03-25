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
        <h1 className="text-xl font-bold text-[#252525]">Users</h1>
        <span className="text-sm text-[#888888]">{users?.length ?? 0} total</span>
      </div>

      <div className="bg-[#FFFFFF] border border-[#E8E8E8] rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#E8E8E8]">
              <th className="text-left text-xs font-semibold text-[#888888] uppercase tracking-wider px-4 py-3">Email</th>
              <th className="text-left text-xs font-semibold text-[#888888] uppercase tracking-wider px-4 py-3">Name</th>
              <th className="text-left text-xs font-semibold text-[#888888] uppercase tracking-wider px-4 py-3">Joined</th>
              <th className="text-left text-xs font-semibold text-[#888888] uppercase tracking-wider px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {(users ?? []).map((user) => (
              <tr key={user.id} className="border-b border-[#E8E8E8] last:border-0 hover:bg-[#F5F5F5] transition-colors">
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/users/${user.id}`}
                    className="text-sm text-[#FD6A2F] hover:underline"
                  >
                    {user.email ?? '—'}
                  </Link>
                </td>
                <td className="px-4 py-3 text-sm text-[#252525]">{user.full_name ?? '—'}</td>
                <td className="px-4 py-3 text-sm text-[#888888]">{fmtDate(user.created_at)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {user.is_suspended && (
                      <span className="text-xs px-2 py-0.5 rounded border bg-red-50 text-red-500 border-red-200">
                        Suspended
                      </span>
                    )}
                    {user.is_admin && (
                      <span className="text-xs px-2 py-0.5 rounded border bg-[#FD6A2F]/10 text-[#FD6A2F] border-[#FD6A2F]/20">
                        Admin
                      </span>
                    )}
                    {!user.is_suspended && !user.is_admin && (
                      <span className="text-xs text-[#888888]">Active</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {(users ?? []).length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-[#888888]">No users found.</p>
        )}
      </div>
    </div>
  )
}
