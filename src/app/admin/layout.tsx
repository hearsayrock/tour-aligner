import { redirect } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { EnvironmentBadge } from '@/components/layout/EnvironmentBadge'
import { createClient } from '@/lib/supabase/server'
import { isStagingEnvironment } from '@/lib/deployment-environment'
import { AdminNav } from './_components/AdminNav'

export const metadata = { title: 'Admin' }

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const showStagingBadge = isStagingEnvironment()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return redirect('/login')

  const [{ data: profile }, { count: pendingClaimsCount }] = await Promise.all([
    supabase.from('profiles').select('is_admin').eq('id', user.id).single(),
    supabase.from('venue_claims').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
  ])

  if (!profile?.is_admin) return redirect('/dashboard')

  return (
    <div data-theme="cream" className="flex min-h-dvh flex-col bg-surface lg:h-dvh lg:flex-row lg:overflow-hidden">
      {/* Sidebar */}
      <aside data-theme="cocoa" className="flex shrink-0 flex-col bg-page text-ink lg:w-60">
        <div className="flex items-center justify-between gap-4 border-b border-border px-4 py-3 lg:block lg:px-5 lg:py-6">
          <div className="flex items-center gap-2">
            <Image src="/touraligner/brand/touraligner-logo-light.svg" alt="TourAligner" width={128} height={35}/>
            {showStagingBadge && <EnvironmentBadge />}
          </div>
          <p className="font-ds-display text-3xl font-bold uppercase text-ink lg:mt-4">Admin</p>
        </div>

        <AdminNav pendingClaims={(pendingClaimsCount ?? 0) > 0} />

        <div className="border-t border-border px-2 lg:py-4">
          <Link
            href="/dashboard"
            className="block px-3 py-2 rounded-lg text-sm text-muted hover:bg-surface-2 hover:text-ink transition-colors"
          >
            ← Dashboard
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="min-w-0 flex-1 lg:overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
