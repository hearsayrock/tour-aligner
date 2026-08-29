import Image from 'next/image'
import type { Metadata } from 'next'
import {
  CalendarRange,
  CheckCircle2,
  Compass,
  Inbox,
  Radar,
} from 'lucide-react'
import { WaitlistButton } from '@/components/marketing/WaitlistButton'

export const metadata: Metadata = {
  title: 'TourAligner',
  description:
    'TourAligner helps independent artists build stronger booking profiles, join the launch waitlist, and get ready for a cleaner way to route tours and book live shows.',
}

const pillars = [
  {
    icon: Compass,
    title: 'Start with an artist profile that works harder',
    body: 'Put your sound, socials, draw, tour radius, and show history in one place so booking conversations start with the right context.',
  },
  {
    icon: Inbox,
    title: 'Tell us what booking keeps breaking',
    body: 'The waitlist is not just a signup form. Your feedback helps shape the tools independent artists need first.',
  },
  {
    icon: CalendarRange,
    title: 'Get ready before the wider launch',
    body: 'Join early, build your artist presence, and be ready when routing, availability, and booking workflows open up at scale.',
  },
  {
    icon: Radar,
    title: 'Built for artists booking direct or with a team',
    body: 'Solo artists, bands, agents, and managers can organize the details that make a booking pitch easier to trust.',
  },
]

const workflow = [
  {
    step: 'Join',
    body: 'Get on the artist waitlist and tell us what should be fixed first.',
  },
  {
    step: 'Create',
    body: 'Create an account and start building out your artist profile.',
  },
  {
    step: 'Prepare',
    body: 'Collect the links, dates, and context that help your pitch land.',
  },
  {
    step: 'Launch',
    body: 'Be ready when the full booking workflow opens for early artists.',
  },
]

const audiences = [
  {
    title: 'Artists',
    body: 'Independent artists can claim early access, shape the roadmap, and start turning scattered booking details into a real profile.',
  },
  {
    title: 'Bands',
    body: 'Bands can keep members, music links, social proof, show history, and tour readiness organized before outreach starts.',
  },
  {
    title: 'Agents and managers',
    body: 'Teams can prepare cleaner artist records now, then move faster when routing and booking tools come online.',
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
            Get your artist profile ready before the tour starts.
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-white/82 sm:text-xl">
            TourAligner is opening first for independent artists who want cleaner booking,
            stronger profiles, and less chaos between the first message and the confirmed show.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <WaitlistButton
              label="Join Wait List"
              icon
              className="min-h-[52px] px-6 py-3.5"
            />
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {[
              'Early access for independent artists',
              'Build your artist profile before launch',
              'Help shape the booking workflow from day one',
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

        <div className="relative lg:pl-12">
          <div className="mx-auto w-full max-w-[460px]">
            <div className="rounded-[22px] border border-white/12 bg-black/38 p-3 text-white shadow-[0_18px_42px_rgba(0,0,0,0.2)] backdrop-blur-md lg:-translate-x-[50px]">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#F6B293]">
                  Inbox
                </p>
                <span className="rounded-full bg-[#0E7490]/20 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8DDAEF]">
                  In discussion
                </span>
              </div>

              <div className="mt-3 rounded-[18px] border border-white/10 bg-[#101010]/88 p-3 shadow-[0_10px_22px_rgba(0,0,0,0.16)]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">Higher Law artist profile</p>
                    <p className="mt-1 text-xs text-white/65">Salt Lake City, UT</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/55">
                      Tour ready
                    </p>
                    <p className="mt-1 text-sm font-medium text-white">Spring 2027</p>
                  </div>
                </div>

                <div className="mt-3 rounded-2xl border border-white/8 bg-white/[0.04] p-2.5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/55">
                        Profile
                      </p>
                      <p className="mt-1 text-sm font-medium text-white">82% complete</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/55">
                        Draw
                      </p>
                      <p className="mt-1 text-sm font-medium text-white">150-250</p>
                    </div>
                  </div>
                </div>

                <div className="mt-3 space-y-2">
                  <div className="mr-8 rounded-[15px] border border-white/8 bg-white/[0.04] px-3 py-2.5">
                    <p className="mb-1 text-[11px] font-medium text-[#8E8E93]">Booking gripe</p>
                    <p className="text-sm leading-relaxed text-white/88">
                      We lose too much time hunting for the right contact and resending the same links.
                    </p>
                  </div>

                  <div className="ml-8 rounded-[15px] bg-[#FD6A2F] px-3 py-2.5 text-white">
                    <p className="mb-1 text-[11px] font-medium text-white/75">TourAligner</p>
                    <p className="text-sm leading-relaxed">
                      Got it. Build the profile now, and we will line up the workflow around artists first.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="-mt-12 ml-auto w-full max-w-[272px] rounded-[20px] border border-[#17343A] bg-[#091315]/94 p-3 text-white shadow-[0_16px_32px_rgba(0,0,0,0.22)] backdrop-blur-md">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#79D7CC]">
                    Artist kit
                  </p>
                  <h3 className="mt-1 text-[15px] font-semibold">Higher Law</h3>
                </div>
                <button
                  type="button"
                  className="rounded-md border border-white/14 px-2.5 py-1.5 text-[11px] font-medium text-white/85"
                >
                  Ready
                </button>
              </div>

              <div className="mt-3 rounded-[18px] border border-white/10 bg-white/[0.04] p-2.5">
                <div className="mb-2.5 flex items-center justify-between">
                  <span className="text-sm font-semibold text-white">Launch prep</span>
                  <div className="flex items-center gap-2 text-lg text-white/70">
                    <span>‹</span>
                    <span>›</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  {[
                    ['Music', 'Links added', 'spotify / bandcamp', 'border-[#CBEAE2] bg-[#F3FBF8] text-[#14584E]'],
                    ['Socials', 'Profile connected', '', 'border-[#CBEAE2] bg-[#F3FBF8] text-[#14584E]'],
                    ['Routing', 'Coming soon', '', 'border-[#F1CABD] bg-[#FFF5F1] text-[#9A4A2C]'],
                  ].map(([date, status, note, styles]) => (
                    <div
                      key={date}
                      className={`rounded-[16px] border px-2.5 py-2 ${styles}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold">{date}</p>
                          <p className="mt-1 text-xs opacity-80">{status}</p>
                        </div>
                        {note ? <span className="text-[11px] opacity-80">{note}</span> : null}
                      </div>
                    </div>
                  ))}
                </div>
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
            TourAligner is starting with independent artists: the people chasing replies,
            sharing links, proving fit, and trying to turn momentum into booked dates.
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
            Join early. Build the profile. Shape what comes next.
          </h2>
          <p className="mt-5 text-base leading-8 text-white/72 sm:text-lg">
            The first launch wave is about artist acquisition and profile building, so the
            booking workflow is grounded in real artist problems from the beginning.
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
            Who it&apos;s for
          </p>
          <h2 className="mt-4 max-w-5xl text-3xl font-semibold tracking-tight text-[#111111] sm:text-5xl">
            Built first for artists getting ready to move.
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
                Get on the list before the next route comes together.
              </h2>
              <p className="mt-5 max-w-2xl text-base leading-8 text-white/74 sm:text-lg">
                Join the artist waitlist, tell us what makes booking painful, then create
                your account and start building the profile venues and booking teams will see.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <WaitlistButton
                label="Join Wait List"
                icon
                className="px-6 py-3.5"
              />
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
