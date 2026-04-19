import Image from 'next/image'
import Link from 'next/link'
import type { Metadata } from 'next'
import {
  ArrowRight,
  CalendarRange,
  CheckCircle2,
  ChevronRight,
  Compass,
  Inbox,
  Radar,
  Sparkles,
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'TourAligner',
  description:
    'TourAligner is a modern booking platform for artists, venues, and booking teams. Discover the right rooms, match with the right dates, manage inquiries, and keep bookings moving in one place.',
}

const pillars = [
  {
    icon: Compass,
    title: 'Find the right room and the right date',
    body: 'See more than a venue list. TourAligner helps you evaluate fit, availability, and what kind of night a room is actually booking.',
  },
  {
    icon: Inbox,
    title: 'Keep booking conversations in one place',
    body: 'Move inquiries, replies, working dates, and confirmed bookings out of scattered email threads and into a cleaner shared workflow.',
  },
  {
    icon: CalendarRange,
    title: 'Keep calendars clean',
    body: 'Venues can manage availability, bill caps, confirmed dates, and requests without losing track of what is still in play.',
  },
  {
    icon: Radar,
    title: 'Useful whether you book direct or with a team',
    body: 'Artists, venues, agents, and managers can all use the same system without changing how they actually work.',
  },
]

const workflow = [
  {
    step: 'Discover',
    body: 'Find rooms that make sense.',
  },
  {
    step: 'Inquire',
    body: 'Reach out without the usual DM roulette.',
  },
  {
    step: 'Respond',
    body: 'Keep the conversation in one place.',
  },
  {
    step: 'Book',
    body: 'Lock in the date and move on.',
  },
]

const audiences = [
  {
    title: 'Artists',
    body: 'Send better inquiries, stop guessing which rooms are worth the time, and keep active dates organized while you build a route.',
  },
  {
    title: 'Venues',
    body: 'Review incoming requests with more context, keep the calendar cleaner, and manage booking flow without living in your inbox.',
  },
  {
    title: 'Agents and managers',
    body: 'Work multiple artists from one system, keep booking motion visible, and manage outreach without the usual spreadsheet sprawl.',
  },
]

function Hero() {
  return (
    <section className="relative flex min-h-screen items-end overflow-hidden border-b border-[#2A2A2A] pt-24 sm:pt-28">
      <Image
        src="/concert-hero.jpg"
        alt="Live band performing on stage in front of a crowd"
        fill
        priority
        className="object-cover object-center"
        sizes="100vw"
      />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,8,8,0.34)_0%,rgba(8,8,8,0.56)_42%,rgba(8,8,8,0.84)_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(253,106,47,0.18),_transparent_28%),radial-gradient(circle_at_82%_22%,_rgba(14,116,144,0.16),_transparent_24%)]" />

      <div className="relative mx-auto grid w-full max-w-7xl gap-10 px-6 pb-10 sm:pb-12 lg:grid-cols-[0.95fr_1.05fr] lg:items-end lg:px-8 lg:pb-14">
        <div className="max-w-3xl rounded-[28px] border border-white/10 bg-black/28 p-6 text-white backdrop-blur-md sm:p-8 lg:p-9">
          <h1 className="font-[var(--font-barlow)] text-5xl font-black uppercase leading-[0.92] tracking-[-0.04em] text-white sm:text-6xl lg:text-[5.1rem]">
            A better way to book live shows.
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-white/82 sm:text-xl">
            TourAligner brings artists, venues, agents, and managers into one cleaner
            booking workflow.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#FD6A2F] px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-[#E55A22]"
            >
              Start free
              <ArrowRight size={16} />
            </Link>
            <Link
              href="/venues"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-white/14"
            >
              Browse venues
              <ChevronRight size={16} />
            </Link>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {[
              'Built for artists, venues, and booking teams',
              'Better fit between rooms, dates, and artists',
              'One workflow from first inquiry to confirmed show',
            ].map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-white/10 bg-white/10 px-4 py-4 text-sm leading-6 text-white/86 shadow-[0_12px_28px_rgba(0,0,0,0.14)] backdrop-blur-sm"
              >
                <div className="mb-2 flex items-center gap-2 text-[#FD6A2F]">
                  <CheckCircle2 size={15} />
                </div>
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="relative lg:pl-8">
          <div className="mx-auto w-full max-w-[620px]">
            <div className="rounded-[28px] border border-white/12 bg-black/44 p-4 text-white shadow-[0_28px_80px_rgba(0,0,0,0.26)] backdrop-blur-md">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#F6B293]">
                Booking inbox
              </p>
              <div className="mt-3 rounded-2xl border border-white/10 bg-white/8 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">Higher Law ↔ Test Venue</p>
                    <p className="mt-1 text-xs text-white/70">
                      Suggested date: May 14 · Working date is active
                    </p>
                  </div>
                  <span className="rounded-full bg-[#0E7490]/20 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8DDAEF]">
                    In discussion
                  </span>
                </div>
              </div>
            </div>

            <div className="-mt-2 ml-auto w-full max-w-[360px] rounded-[24px] border border-[#17343A] bg-[#091315]/94 p-4 text-white shadow-[0_20px_45px_rgba(0,0,0,0.28)] backdrop-blur-md">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#79D7CC]">
                Venue calendar
              </p>
              <h3 className="mt-2 text-lg font-semibold">Right room. Right date.</h3>
              <div className="mt-4 space-y-2">
                {[
                  ['May 14', 'Open · indie / psych leaning'],
                  ['May 18', '1 / 4 filled'],
                  ['May 24', 'All booked up'],
                ].map(([date, note]) => (
                  <div
                    key={date}
                    className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5"
                  >
                    <span className="text-sm font-medium">{date}</span>
                    <span className="text-xs text-white/70">{note}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function Pillars() {
  return (
    <section id="product" className="bg-white py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="max-w-6xl">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#A24A22]">
            Why it works
          </p>
          <h2 className="mt-4 max-w-5xl text-2xl font-semibold tracking-tight text-[#111111] sm:text-4xl">
            TourAligner is built for the people sending the inquiry, reviewing the
            request, and managing the calendar on the other side.
          </h2>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {pillars.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="rounded-[24px] border border-[#ECE7DE] bg-[#FBFAF7] p-6 shadow-[0_16px_36px_rgba(17,17,17,0.04)]"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#FD6A2F] text-white">
                <Icon size={19} />
              </div>
              <h3 className="mt-5 text-xl font-semibold text-[#111111]">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-[#5E656C]">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function WorkflowSection() {
  return (
    <section
      id="workflow"
      className="border-y border-[#1E1E1E] bg-[linear-gradient(180deg,#111111_0%,#181818_100%)] py-20 text-white sm:py-24"
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[0.88fr_1.12fr] lg:items-start">
        <div className="max-w-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#F6B293]">
            How it works
          </p>
          <h2 className="mt-4 font-[var(--font-barlow)] text-4xl font-black uppercase leading-[0.95] tracking-[-0.03em] text-white sm:text-5xl">
            Find the room. Send the inquiry. Book the show.
          </h2>
          <p className="mt-5 text-base leading-8 text-white/72 sm:text-lg">
            TourAligner gives artists, agents, and venues a cleaner way to connect than
            hoping an Instagram message gets seen.
          </p>
        </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {workflow.map((item, index) => (
              <div
                key={item.step}
                className="rounded-[24px] border border-white/10 bg-white/5 p-5 shadow-[0_18px_36px_rgba(0,0,0,0.18)]"
              >
                <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#8DDAEF]">
                  0{index + 1}
                </div>
                <h3 className="mt-3 text-xl font-semibold text-white">{item.step}</h3>
                <p className="mt-3 text-sm leading-6 text-white/68">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function AudienceSection() {
  return (
    <section id="audiences" className="bg-[#F7F4EE] py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="max-w-6xl">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#A24A22]">
            Who it's for
          </p>
          <h2 className="mt-4 max-w-5xl text-3xl font-semibold tracking-tight text-[#111111] sm:text-5xl">
            Built for artists, venues, and booking teams.
          </h2>
        </div>

        <div className="mt-12 grid gap-6 xl:grid-cols-3">
          {audiences.map((audience) => (
            <div
              key={audience.title}
              className="rounded-[26px] border border-[#E6DFD3] bg-white p-7 shadow-[0_18px_40px_rgba(17,17,17,0.05)]"
            >
              <h3 className="text-2xl font-semibold tracking-tight text-[#111111]">
                {audience.title}
              </h3>
              <p className="mt-4 text-sm leading-7 text-[#5E656C]">{audience.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function FinalCta() {
  return (
    <section className="bg-white pb-24 pt-20 sm:pb-28 sm:pt-16">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-[32px] border border-[#2A2A2A] bg-[#111111] px-6 py-12 text-white shadow-[0_28px_80px_rgba(17,17,17,0.14)] sm:px-10 sm:py-14">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(253,106,47,0.22),_transparent_28%),radial-gradient(circle_at_85%_15%,_rgba(14,116,144,0.16),_transparent_22%)]" />
          <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#F6B293]">
                Ready when you are
              </p>
              <h2 className="mt-4 font-[var(--font-barlow)] text-4xl font-black uppercase leading-[0.95] tracking-[-0.03em] text-white sm:text-5xl">
                Built to make booking shows a whole lot easier.
              </h2>
              <p className="mt-5 max-w-2xl text-base leading-8 text-white/74 sm:text-lg">
                Create an account, explore venues, and start working from a booking system
                that feels more streamlined than the old way because it is.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#FD6A2F] px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-[#E55A22]"
              >
                Create your account
                <ArrowRight size={16} />
              </Link>
              <Link
                href="/venues"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/14 bg-white/6 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Browse venues
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default function HomePage() {
  return (
    <>
      <Hero />
      <Pillars />
      <WorkflowSection />
      <AudienceSection />
      <FinalCta />
    </>
  )
}
