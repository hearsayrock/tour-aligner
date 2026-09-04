import { AppNav } from '@/components/layout/AppNav'
import { Footer } from '@/components/marketing/Footer'
import { createClient } from '@/lib/supabase/server'
import { getServerTimingStart, logServerTiming } from '@/lib/performance'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const startedAt = getServerTimingStart()
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const userId = session?.user.id ?? null
  logServerTiming('dashboard layout', { session: getServerTimingStart() - startedAt })

  if (userId) {
    return (
      <div className="app-shell-layout min-h-screen bg-[#F7F7F5]">
        <AppNav userId={userId} />
        <main className="app-shell-main min-h-screen">
          {children}
        </main>
      </div>
    )
  }

  // Public pages inside this route group (e.g. /venues) get the marketing shell
  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <AppNav userId={userId} />
      <main className="pt-14">{children}</main>
      <Footer />
    </div>
  )
}
