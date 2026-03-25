import Link from 'next/link'

export function Footer() {
  return (
    <footer className="border-t border-[#E8E8E8] py-8 mt-24">
      <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-[#888888]">
        <Link href="/" className="font-semibold tracking-tight text-[#252525]">
          Tour<span className="text-[#FD6A2F]">Aligner</span>
        </Link>
        <span>&copy; {new Date().getFullYear()} TourAligner. All rights reserved.</span>
      </div>
    </footer>
  )
}
