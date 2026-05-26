import { AppNav } from '@/components/layout/AppNav'
import { Footer } from '@/components/marketing/Footer'
import { MarketingRouteShell } from '@/components/marketing/MarketingRouteShell'
import { Navbar } from '@/components/marketing/Navbar'
import { createClient } from '@/lib/supabase/server'

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <MarketingRouteShell
      isSignedIn={!!user}
      marketingNav={<Navbar />}
      appNav={user ? <AppNav /> : null}
      footer={<Footer />}
    >
      {children}
    </MarketingRouteShell>
  )
}
