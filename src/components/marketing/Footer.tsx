import Link from 'next/link'
import { WaitlistButton } from '@/components/marketing/WaitlistButton'

const socialLinks = [
  { label: 'Instagram', href: 'https://www.instagram.com/touraligner/' },
  { label: 'TikTok', href: 'https://www.tiktok.com/@touraligner' },
  { label: 'Facebook', href: 'https://www.facebook.com/profile.php?id=61590592556263' },
  { label: 'Threads', href: 'https://www.threads.com/@touraligner' },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/company/tour-aligner' },
]

const footerLinkClass = 'text-sm text-white/68 transition-colors hover:text-white'

export function Footer() {
  return (
    <footer className="bg-[#111111] text-white">
      <div className="mx-auto max-w-7xl px-6 py-12 sm:py-14 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          <div className="max-w-lg">
            <Link
              href="/"
              className="inline-flex font-[var(--font-barlow)] text-2xl font-black uppercase tracking-[-0.02em] text-white"
            >
              Tour<span className="text-[#FD6A2F]">Aligner</span>
            </Link>
            <p className="mt-4 max-w-md text-sm leading-7 text-white/58 sm:text-base">
              Stronger artist profiles and a cleaner way to route tours, connect with venues,
              and book live shows.
            </p>
          </div>

          <nav
            aria-label="Footer navigation"
            className="grid grid-cols-2 gap-x-8 gap-y-8 sm:grid-cols-3"
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/50">
                Explore
              </p>
              <div className="mt-4 flex flex-col items-start gap-3">
                <Link href="/#product" className={footerLinkClass}>
                  Why TourAligner
                </Link>
                <Link href="/#workflow" className={footerLinkClass}>
                  How it works
                </Link>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/50">
                Built for
              </p>
              <div className="mt-4 flex flex-col items-start gap-3">
                <Link href="/#audiences" className={footerLinkClass}>
                  Artists and teams
                </Link>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/50">
                Access
              </p>
              <div className="mt-4 flex flex-col items-start gap-3">
                <WaitlistButton
                  label="Join waitlist"
                  className="!min-h-0 !justify-start !rounded-none !bg-transparent !px-0 !py-0 !font-normal !text-white/68 hover:!bg-transparent hover:!text-white focus-visible:!ring-offset-[#111111]"
                />
                <Link href="/login" className={footerLinkClass}>
                  Sign in
                </Link>
              </div>
            </div>
          </nav>
        </div>

        <div className="mt-10 flex flex-col gap-5 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2.5">
            <span className="text-xs font-semibold uppercase tracking-[0.22em] text-white/50">
              Follow
            </span>
            {socialLinks.map((social) => (
              <a
                key={social.label}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                className={footerLinkClass}
              >
                {social.label}
              </a>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-white/50">
            <span>&copy; {new Date().getFullYear()} TourAligner</span>
            <span aria-hidden="true" className="text-white/20">
              •
            </span>
            <Link href="/terms" className="transition-colors hover:text-white/75">
              Terms &amp; Conditions
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
