import type { Metadata } from 'next'
import { Suspense } from 'react'
import { Figtree, Barlow_Condensed, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { NavigationProcessingOverlay } from '@/components/ui/NavigationProcessingOverlay'
import { ChatDockHost } from '@/components/chat-dock/ChatDockHost'

const figtree = Figtree({
  subsets: ['latin'],
  variable: '--font-figtree',
})

const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
})

const barlowCondensed = Barlow_Condensed({
  weight: ['600', '700', '800', '900'],
  subsets: ['latin'],
  variable: '--font-barlow-condensed',
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
      <body className={`${figtree.variable} ${mono.variable} ${barlowCondensed.variable} font-sans antialiased bg-page text-ink`}>
        <Suspense fallback={null}>
          <NavigationProcessingOverlay />
        </Suspense>
        {children}
        <Suspense fallback={null}>
          <ChatDockHost />
        </Suspense>
      </body>
    </html>
  )
}
