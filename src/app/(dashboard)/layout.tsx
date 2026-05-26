import { AppNav } from '@/components/layout/AppNav'
import { Footer } from '@/components/marketing/Footer'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    return (
      <div className="min-h-screen bg-[#F7F7F5]">
        <AppNav />
        <main className="min-h-screen pb-24 lg:pl-72 lg:pb-0">
          {children}
        </main>
      </div>
    )
  }

  // Public pages inside this route group (e.g. /venues) get the marketing shell
  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <AppNav />
      <main className="pt-14">{children}</main>
      <Footer />
    </div>
  )
}
