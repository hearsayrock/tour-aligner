import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: {
    default: 'TourAligner — Book Smarter. Tour Further.',
    template: '%s | TourAligner',
  },
  description:
    'TourAligner connects independent artists with music venues across the US. Discover venues, send booking inquiries, and manage your tour — no booking agent required.',
  openGraph: {
    siteName: 'TourAligner',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased bg-[#FAFAFA] text-[#252525]`}>
        {children}
      </body>
    </html>
  )
}
