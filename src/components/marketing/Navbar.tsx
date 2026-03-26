import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { NavAccountMenu } from '@/components/ui/NavAccountMenu'
import { SignedOutMobileMenu } from '@/components/marketing/SignedOutMobileMenu'

export async function Navbar() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <header className="fixed top-0 inset-x-0 z-50 border-b border-white/30 bg-white/60 backdrop-blur-md">
      <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link href={user ? '/dashboard' : '/'} className="flex items-center">
          <Image src="/logo.png" alt="TourAligner" width={140} height={36} priority />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-2">
          <Link
            href="/venues"
            className="text-sm text-[#252525]/70 hover:text-[#252525] transition-colors px-3 py-1.5"
          >
            Browse venues
          </Link>

          {user ? (
            <NavAccountMenu />
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm text-[#252525]/70 hover:text-[#252525] transition-colors px-3 py-1.5"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="text-sm font-semibold bg-[#FD6A2F] text-white rounded-lg px-4 py-1.5 hover:bg-[#E55A22] transition-colors"
              >
                Get started
              </Link>
            </>
          )}
        </nav>

        {/* Mobile nav — signed-out only */}
        {!user && <SignedOutMobileMenu />}
      </div>
    </header>
  )
}
