import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { NavAccountMenu } from '@/components/ui/NavAccountMenu'
import { SignedOutMobileMenu } from '@/components/marketing/SignedOutMobileMenu'

export async function Navbar() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-black/5 bg-white/75 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:px-8">
        <Link href={user ? '/dashboard' : '/'} className="flex items-center">
          <Image src="/logo.png" alt="TourAligner" width={140} height={36} priority />
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
            Who it's for
          </Link>
          <Link
            href="/venues"
            className="px-3 py-2 text-sm text-[#252525]/70 transition-colors hover:text-[#252525]"
          >
            Venues
          </Link>

          {user ? (
            <NavAccountMenu />
          ) : (
            <>
              <Link
                href="/login"
                className="px-3 py-2 text-sm text-[#252525]/70 transition-colors hover:text-[#252525]"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="rounded-xl bg-[#FD6A2F] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#E55A22]"
              >
                Start free
              </Link>
            </>
          )}
        </nav>

        {!user && <SignedOutMobileMenu />}
      </div>
    </header>
  )
}
