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
    <header className="fixed inset-x-0 top-0 z-50 border-b border-black/5 bg-white/75 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:px-8">
        <Link href={userId ? '/dashboard' : '/'} className="flex items-center gap-2">
          <Image src="/logo.png" alt="TourAligner" width={140} height={36} priority />
          {showStagingBadge && <EnvironmentBadge />}
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          <Link
            href="/#product"
            className="px-3 py-2 text-sm text-[#252525]/70 transition-colors hover:text-[#252525]"
          >
            Why
          </Link>
          <Link
            href="/#workflow"
            className="px-3 py-2 text-sm text-[#252525]/70 transition-colors hover:text-[#252525]"
          >
            How it works
          </Link>
          <Link
            href="/#audiences"
            className="px-3 py-2 text-sm text-[#252525]/70 transition-colors hover:text-[#252525]"
          >
            Who it&apos;s for
          </Link>

          {userId ? (
            <NavAccountMenu />
          ) : (
            <>
              <Link
                href="/login"
                className="px-3 py-2 text-sm text-[#252525]/70 transition-colors hover:text-[#252525]"
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
