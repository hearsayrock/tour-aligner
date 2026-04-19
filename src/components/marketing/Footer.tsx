import Link from 'next/link'

export function Footer() {
  return (
    <footer className="border-t border-[#E8E8E8] bg-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-12 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
        <div className="max-w-md">
          <Link href="/" className="font-semibold tracking-tight text-[#252525]">
            Tour<span className="text-[#FD6A2F]">Aligner</span>
          </Link>
          <p className="mt-4 text-sm leading-7 text-[#666666]">
            The modern operating system for booking live shows. Built for artists,
            venues, agents, and managers who want a cleaner way to move dates forward.
          </p>
        </div>

        <div className="grid gap-8 sm:grid-cols-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#8A8A8A]">
              Explore
            </p>
            <div className="mt-4 space-y-3 text-sm text-[#555555]">
              <Link href="/#product" className="block transition-colors hover:text-[#111111]">
                Why
              </Link>
              <Link href="/#workflow" className="block transition-colors hover:text-[#111111]">
                How it works
              </Link>
              <Link href="/venues" className="block transition-colors hover:text-[#111111]">
                Venue directory
              </Link>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#8A8A8A]">
              Built for
            </p>
            <div className="mt-4 space-y-3 text-sm text-[#555555]">
              <Link href="/#audiences" className="block transition-colors hover:text-[#111111]">
                Who it's for
              </Link>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#8A8A8A]">
              Access
            </p>
            <div className="mt-4 space-y-3 text-sm text-[#555555]">
              <Link href="/signup" className="block transition-colors hover:text-[#111111]">
                Start free
              </Link>
              <Link href="/login" className="block transition-colors hover:text-[#111111]">
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-[#EEEEEE]">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-5 text-sm text-[#888888] sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <span>&copy; {new Date().getFullYear()} TourAligner. All rights reserved.</span>
          <span>Booking infrastructure for modern live music teams.</span>
        </div>
      </div>
    </footer>
  )
}
