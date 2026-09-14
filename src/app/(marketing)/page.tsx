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
    title: 'Start with a profile that hits harder',
    body: 'Show off your vibe and define your brand. Start booking conversations off right with vital info already locked in.',
  },
  {
    icon: Inbox,
    title: 'Spill the tea on what\'s broken',
    body: 'Tell us what wastes your time or makes booking harder than it should be. We’re building around that.',
  },
  {
    icon: CalendarRange,
    title: 'Get ahead of booking chaos',
    body: 'Join early, build your profile, and be ready when venues come knocking.',
  },
  {
    icon: Radar,
    title: 'Built for DIY artists and venues',
    body: 'Solo artists, bands, agents, and venues are all welcome.',
  },
]

const workflow = [
  {
    step: 'Join',
    body: 'Get on the waitlist and have front row tickets when we launch.',
  },
  {
    step: 'Create',
    body: 'Create an account and start building out your artist profile.',
  },
  {
    step: 'Prepare',
    body: 'Set your tone and vibe. Myspace the hell out of your personal public page.',
  },
  {
    step: 'Launch',
    body: 'Doors open, profile\'s tight, and you\'re first in line.',
  },
]

const audiences = [
  {
    title: 'Artists',
    body: 'Build a profile with your music, socials, draw, show history, and booking details so venues can quickly see who you are and whether you fit.',
  },
  {
    title: 'Venues',
    body: 'Keep your room details, capacity, availability, booking preferences, and show info organized so artists know what you need before they reach out.',
  },
  {
    title: 'Bands',
    body: 'Bands can capture stage-plot, links, show history, tour plans, and booking details together so everyone is working from the same information.',
  },
]

function Hero() {
  return (
    <section className="relative flex min-h-screen items-end overflow-hidden border-b border-[#2A2A2A] pt-24 sm:pt-28 lg:items-start lg:pt-[clamp(8rem,calc(100svh-36rem),23rem)]">
      <Image
        src="/landing-hero-crowd.jpg"
        alt="Concert crowd raising their hands toward a lit stage"
        fill
        priority
        className="object-cover object-center"
        sizes="100vw"
      />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,8,8,0.34)_0%,rgba(8,8,8,0.56)_42%,rgba(8,8,8,0.84)_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(253,106,47,0.18),_transparent_28%),radial-gradient(circle_at_82%_22%,_rgba(14,116,144,0.16),_transparent_24%)]" />

      <div className="relative mx-auto w-full max-w-[clamp(80rem,64vw,144rem)] px-6 pb-10 sm:pb-12 lg:px-8 lg:pb-[clamp(3.5rem,5svh,6rem)]">
        <div className="rounded-[28px] border border-white/10 bg-black/28 p-6 text-white backdrop-blur-md sm:p-8 lg:rounded-[clamp(1.75rem,1.5vw,2.5rem)] lg:p-[clamp(2.25rem,min(1.8vw,3.4svh),3.5rem)]">
          <h1 className="font-[var(--font-barlow)] text-5xl font-black uppercase leading-[0.92] tracking-[-0.04em] text-white sm:text-6xl lg:text-[clamp(5.1rem,min(4.25vw,7.5svh),7.5rem)]">
            Create your profile 
            <br/>
            Get ready for tour
          </h1>

          <p className="mt-6 max-w-4xl text-lg leading-8 text-white/82 sm:text-xl lg:mt-[clamp(1.5rem,2.3svh,2.5rem)] lg:max-w-[clamp(56rem,48vw,76rem)] lg:text-[clamp(1.25rem,min(1.05vw,1.85svh),1.625rem)] lg:leading-[1.6]">
            The problem with the current booking system is that there is no system.  With TourAligner your profile, venues, dates and messages are all in one place. Look, know, play the show.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row lg:mt-[clamp(2rem,3svh,3rem)]">
            <WaitlistButton
              label="Join Wait List"
              icon
              className="min-h-[52px] px-6 py-3.5 lg:min-h-[clamp(3.25rem,5svh,4rem)] lg:px-[clamp(1.5rem,1.5vw,2.25rem)] lg:py-[clamp(0.875rem,1.3svh,1.125rem)] lg:text-[clamp(0.875rem,0.75vw,1.125rem)]"
            />
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-3 lg:mt-[clamp(2rem,3svh,3rem)] lg:gap-[clamp(0.75rem,0.8vw,1.25rem)]">
            {[
              'Early access for independent artists',
              'Build your artist profile before launch',
              'Torch the DM booking grind',
            ].map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-white/10 bg-white/10 px-4 py-4 text-sm leading-6 text-white/86 shadow-[0_12px_28px_rgba(0,0,0,0.14)] backdrop-blur-sm lg:rounded-[clamp(1rem,1vw,1.5rem)] lg:p-[clamp(1rem,min(1vw,1.9svh),1.5rem)] lg:text-[clamp(0.875rem,min(0.75vw,1.3svh),1.125rem)] lg:leading-[1.7]"
              >
                <div className="mb-2 flex items-center gap-2 text-[#FD6A2F]">
                  <CheckCircle2 size={15} />
                </div>
                {item}
              </div>
            ))}
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
            Independent artists are doing more than making music. They’re chasing replies, sharing links, proving they belong on the bill, and trying to turn momentum into booked dates.
          </h2>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {pillars.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="rounded-[24px] border border-[#ECE7DE] bg-[#FBFAF7] p-6 shadow-[0_16px_36px_rgba(17,17,17,0.04)]"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#c4682f] text-white">
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
            Join early<br/>Build the profile<br/>Set the stage
          </h2>
          <p className="mt-5 text-base leading-8 text-white/72 sm:text-lg">
            Artists and venues both deal with the same booking mess from different sides. Join early, build your profile, and tell us what slows things down.
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
              
              <h2 className="mt-4 font-[var(--font-barlow)] text-4xl font-black uppercase leading-[0.95] tracking-[-0.03em] text-white sm:text-5xl">
                Practice up<br/>Set the stage<br/>The next tour starts soon
              </h2>
              
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
