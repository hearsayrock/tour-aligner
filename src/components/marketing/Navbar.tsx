import Link from 'next/link'
import Image from 'next/image'
import { EnvironmentBadge } from '@/components/layout/EnvironmentBadge'
import { NavAccountMenu } from '@/components/ui/NavAccountMenu'
import { SignedOutMobileMenu } from '@/components/marketing/SignedOutMobileMenu'
import { WaitlistButton } from '@/components/marketing/WaitlistButton'
import { isStagingEnvironment } from '@/lib/deployment-environment'

export function Navbar({ userId }: { userId: string | null }) {
  const showStagingBadge = isStagingEnvironment()

  return (
    <header data-theme="cocoa" className="fixed inset-x-0 top-0 z-50 border-b border-border bg-page text-ink">
      <div className="mx-auto flex h-16 max-w-[110rem] items-center justify-between gap-2 px-4 sm:px-6 lg:px-12">
        <Link href={userId ? '/dashboard' : '/'} className="flex items-center gap-2">
          <Image src="/touraligner/brand/touraligner-logo-light.svg" alt="TourAligner" width={140} height={39} priority />
          {showStagingBadge && <EnvironmentBadge />}
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          <Link
            href="/#product"
            className="px-3 py-2 text-sm font-semibold text-text-secondary transition-colors hover:text-ink"
          >
            Why
          </Link>
          <Link
            href="/#workflow"
            className="px-3 py-2 text-sm font-semibold text-text-secondary transition-colors hover:text-ink"
          >
            How it works
          </Link>
          <Link
            href="/#audiences"
            className="px-3 py-2 text-sm font-semibold text-text-secondary transition-colors hover:text-ink"
          >
            Who it&apos;s for
          </Link>

          {userId ? (
            <NavAccountMenu />
          ) : (
            <>
              <Link
                href="/login"
                className="px-3 py-2 text-sm font-semibold text-text-secondary transition-colors hover:text-ink"
              >
                Sign in
              </Link>
              <WaitlistButton label="Join Wait List" />
            </>
          )}
        </nav>

        <div className="md:hidden">
          {userId ? <NavAccountMenu /> : <SignedOutMobileMenu />}
        </div>
      </div>
    </header>
  )
}
