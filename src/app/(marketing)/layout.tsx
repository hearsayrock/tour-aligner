import { AppNav } from '@/components/layout/AppNav'
import { Footer } from '@/components/marketing/Footer'

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <AppNav />
      <main>{children}</main>
      <Footer />
    </>
  )
}
