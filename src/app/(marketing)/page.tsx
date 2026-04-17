import Image from 'next/image'
import Link from 'next/link'
import { ScrollIndicator } from '@/components/marketing/ScrollIndicator'
import {
  MapPin,
  Zap,
  UserX,
  CalendarCheck,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react'

function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center">
      {/* Full-bleed background image — bleeds under the fixed nav */}
      <Image
        src="/concert-hero.jpg"
        alt="Band performing live on stage in front of a packed crowd"
        fill
        priority
        className="object-cover object-center"
        sizes="100vw"
      />

      {/* Subtle darkening layer to unify the image and help the panel pop */}
      <div className="absolute inset-0 bg-black/20 pointer-events-none" />

      {/* Content — frosted glass panel centered in the viewport */}
      <div className="relative z-10 w-full max-w-xl px-6 text-center">
        <div className="bg-white/80 backdrop-blur-md rounded-2xl px-8 sm:px-12 py-12 shadow-2xl border border-white/60">
          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight leading-tight mb-8 text-[#252525]">
            Book your tour
            <br />
            <span className="text-[#FD6A2F] text-[2.5rem]">without the middleman.</span>
          </h1>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/signup"
              className="w-full sm:w-auto bg-[#FD6A2F] text-white font-semibold rounded-lg px-6 py-3 hover:bg-[#E55A22] transition-colors"
            >
              Get started free
            </Link>
            <Link
              href="/venues"
              className="w-full sm:w-auto border border-[#252525]/20 text-[#252525] font-semibold rounded-lg px-6 py-3 hover:border-[#252525]/40 hover:bg-white/60 transition-colors"
            >
              Browse venues
            </Link>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <ScrollIndicator />
    </section>
  )
}

const FEATURES = [
  {
    icon: MapPin,
    title: 'Find the Right Fit',
    body: 'Discover venues and artists that match your sound, crowd, and vibe—no more blind outreach.',
  },
  {
    icon: Zap,
    title: 'Book Shows Faster',
    body: 'Send contact requests and manage conversations in one place, with clear status and next steps.',
  },
  {
    icon: UserX,
    title: 'Skip the Middleman',
    body: 'Artists can secure gigs and negotiate directly with venues—no agent required.',
  },
  {
    icon: CalendarCheck,
    title: 'Stay Organized',
    body: 'Keep track of contact requests, replies, and active conversations without juggling emails and spreadsheets.',
  },
  {
    icon: ShieldCheck,
    title: 'Build Trust with Verified Profiles',
    body: "Know who you're working with through real profiles, history, and performance data.",
  },
  {
    icon: TrendingUp,
    title: 'Grow Your Reach',
    body: 'Expand into new cities, connect with new partners, and build momentum with every show.',
  },
]

function About() {
  return (
    <section className="bg-white">
      <div className="max-w-5xl mx-auto px-6 py-20">
        {/* Headline + copy */}
        <div className="mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-6">
            About TourAligner
          </h2>
          <p className="text-[#888888] leading-relaxed mb-4">
            TourAligner is a modern booking platform built to connect independent
            artists with venues—without the friction, guesswork, or gatekeeping of
            traditional booking.
          </p>
          <p className="text-[#888888] leading-relaxed">
            We turn messy email chains into a simple, structured workflow—so bands
            can find the right rooms, venues can discover the right talent, and both
            sides can book shows faster and more confidently.
          </p>
        </div>

        {/* Feature list */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-10">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <div key={title}>
              <div className="flex items-center gap-2.5 mb-2">
                <Icon size={22} className="text-[#FD6A2F] shrink-0" strokeWidth={1.75} />
                <h3 className="font-bold text-[#252525]">{title}</h3>
              </div>
              <p className="text-sm text-[#888888] leading-relaxed pl-[34px]">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

const STEPS = [
  {
    number: '01',
    title: 'Find your rooms',
    body: 'Search our directory of independent music venues by location, capacity, and genre. No gatekeepers.',
  },
  {
    number: '02',
    title: 'Request contact',
    body: 'Reach out directly inside the app with a short intro note. No phone tag, no cold emails into the void.',
  },
  {
    number: '03',
    title: 'Start the conversation',
    body: 'Once the other side accepts, continue the conversation in your inbox and work out the details together.',
  },
]

function HowItWorks() {
  return (
    <section className="max-w-5xl mx-auto px-6 py-20">
      <div>
        <h2 className="text-sm font-semibold text-[#FD6A2F] uppercase tracking-widest mb-12 text-center">
          How it works
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          {STEPS.map((step) => (
            <div key={step.number} className="bg-[#FFFFFF] border border-[#E8E8E8] rounded-xl p-6">
              <span className="text-3xl font-bold text-[#CCCCCC]">{step.number}</span>
              <h3 className="text-base font-semibold mt-3 mb-2">{step.title}</h3>
              <p className="text-sm text-[#888888] leading-relaxed">{step.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function CTA() {
  return (
    <section className="max-w-5xl mx-auto px-6 pb-20">
      <div className="bg-[#FFFFFF] border border-[#E8E8E8] rounded-2xl px-8 py-14 text-center">
        <h2 className="text-3xl font-bold tracking-tight mb-3">
          Ready to fill your calendar?
        </h2>
        <p className="text-[#777777] mb-8">
          Create your free account and start reaching venues today.
        </p>
        <Link
          href="/signup"
          className="inline-block bg-[#FD6A2F] text-white font-semibold rounded-lg px-8 py-3 hover:bg-[#E55A22] transition-colors"
        >
          Create free account
        </Link>
      </div>
    </section>
  )
}

export default function HomePage() {
  return (
    <>
      <Hero />
      <About />
      <HowItWorks />
      <CTA />
    </>
  )
}
