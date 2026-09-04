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
  const { data: { session } } = await supabase.auth.getSession()
  const userId = session?.user.id ?? null

  return (
    <MarketingRouteShell
      isSignedIn={!!userId}
      marketingNav={<Navbar userId={userId} />}
      appNav={userId ? <AppNav userId={userId} /> : null}
      footer={<Footer />}
    >
      {children}
    </MarketingRouteShell>
  )
}
