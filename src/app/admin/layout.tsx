import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { AdminNav } from './_components/AdminNav'

export const metadata = { title: 'Admin' }

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profile }, { count: pendingClaimsCount }] = await Promise.all([
    supabase.from('profiles').select('is_admin').eq('id', user.id).single(),
    supabase.from('venue_claims').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
  ])

  if (!profile?.is_admin) redirect('/dashboard')

  return (
    <div className="flex h-screen bg-[#FAFAFA] overflow-hidden">
      {/* Sidebar */}
      <aside className="w-48 shrink-0 bg-[#FFFFFF] border-r border-[#E8E8E8] flex flex-col">
        <div className="px-4 py-4 border-b border-[#E8E8E8]">
          <p className="text-[10px] font-bold text-[#888888] uppercase tracking-widest">TourAligner</p>
          <p className="text-base font-bold text-[#252525] mt-0.5">Admin</p>
        </div>

        <AdminNav pendingClaims={(pendingClaimsCount ?? 0) > 0} />

        <div className="px-2 py-4 border-t border-[#E8E8E8]">
          <Link
            href="/dashboard"
            className="block px-3 py-2 rounded-lg text-sm text-[#888888] hover:bg-[#F5F5F5] hover:text-[#252525] transition-colors"
          >
            ← Dashboard
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
