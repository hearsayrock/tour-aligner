import type { Metadata } from 'next'
import { Suspense } from 'react'
import { Inter, Barlow_Condensed } from 'next/font/google'
import './globals.css'
import { NavigationProcessingOverlay } from '@/components/ui/NavigationProcessingOverlay'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

const barlowCondensed = Barlow_Condensed({
  weight: ['600', '700', '800', '900'],
  subsets: ['latin'],
  variable: '--font-barlow',
})

export const metadata: Metadata = {
  title: {
    default: 'TourAligner',
    template: '%s | TourAligner',
  },
  description:
    'TourAligner is the modern operating system for booking live shows, built for artists, venues, agents, and managers.',
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
      <body className={`${inter.variable} ${barlowCondensed.variable} font-sans antialiased bg-[#FAFAFA] text-[#252525]`}>
        <Suspense fallback={null}>
          <NavigationProcessingOverlay />
        </Suspense>
        {children}
      </body>
    </html>
  )
}
