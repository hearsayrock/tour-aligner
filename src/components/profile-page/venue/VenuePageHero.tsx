import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, LayoutDashboard, MapPin, Music2 } from 'lucide-react'
import { Badge, ButtonLink } from '@/components/ui/primitives'
import type { Venue } from '@/types/database'
import type { VenueProfileAppearance } from '@/components/profile-page/venue/venue-page-config'

const AGE_LABELS: Record<string, string> = { all_ages: 'All ages', '18_plus': '18+', '21_plus': '21+' }

export function VenuePageHero({ venue, genreNames, isOwner, isEditing, appearance, coverImage, profileImage, editAppearanceControl, editContentControl }: {
  venue: Venue
  genreNames: string[]
  isOwner: boolean
  isEditing: boolean
  appearance: VenueProfileAppearance
  coverImage: string
  profileImage: string | null
  editAppearanceControl?: React.ReactNode
  editContentControl?: React.ReactNode
}) {
  const location = [venue.location_city, venue.location_state].filter(Boolean).join(', ')
  return (
    <section className="artist-page-hero relative overflow-hidden border-b border-[#1F1F1F] bg-[#111111] text-white">
      <Image src={coverImage} alt="" fill priority className="object-cover object-center opacity-45" sizes="100vw" unoptimized={coverImage.startsWith('blob:')} />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,8,8,0.42)_0%,rgba(8,8,8,0.82)_100%)]" />
      <div className="absolute inset-0" style={{ background: `radial-gradient(circle at 16% 14%, ${appearance.accent}66, transparent 28%), radial-gradient(circle at 82% 18%, rgba(14,116,144,0.18), transparent 24%)` }} />
      <div className="artist-page-hero-inner relative mx-auto max-w-7xl px-6 py-12 sm:py-16 lg:px-8 lg:py-20">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/venues" className="inline-flex min-h-9 items-center gap-2 text-sm font-semibold text-white/72 hover:text-white"><ArrowLeft className="h-4 w-4" />Venue directory</Link>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {editContentControl}{editAppearanceControl}
            {isOwner && !isEditing && <ButtonLink href={`/venues/${venue.slug}?edit=1`} tone="secondary" className="border-white/20 bg-white/10 text-white hover:border-white/35 hover:bg-white/20"><LayoutDashboard className="h-4 w-4" />Arrange page</ButtonLink>}
          </div>
        </div>
        <div className="artist-page-hero-layout mt-9 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
          <div className="artist-page-hero-main max-w-4xl">
            <div className="artist-page-hero-badges flex flex-wrap items-center gap-2">
              <Badge tone="brand" className="border-white/15 bg-white/10 text-white"><Music2 className="h-3.5 w-3.5" />{genreNames[0] ?? 'Live music'}</Badge>
              {isOwner && <Badge tone="success"><CheckCircle2 className="h-3.5 w-3.5" />Managed by this Account</Badge>}
            </div>
            <div className="artist-page-identity mt-5 flex flex-col gap-5 sm:flex-row sm:items-end">
              {profileImage && <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-3xl border border-white/20 bg-white/10 shadow-[0_18px_40px_rgba(0,0,0,0.24)] sm:h-28 sm:w-28"><Image src={profileImage} alt={`${venue.name} profile image`} fill className="object-cover" sizes="112px" unoptimized={profileImage.startsWith('blob:')} /></div>}
              <h1 className="artist-page-name font-[var(--font-barlow)] text-5xl font-black uppercase leading-[0.92] text-white sm:text-6xl lg:text-7xl">{venue.name}</h1>
            </div>
            <p className="artist-page-location mt-5 flex max-w-2xl items-start gap-2 text-base leading-7 text-white/78 sm:text-lg"><MapPin className="mt-1 h-5 w-5 shrink-0 text-[var(--profile-accent)]" /><span>{location}</span></p>
            {venue.description && <p className="mt-6 max-w-3xl text-base leading-8 text-white/82 sm:text-lg">{venue.description}</p>}
            {genreNames.length > 0 && <div className="artist-page-genres mt-7 flex flex-wrap gap-2">{genreNames.map((name) => <span key={name} className="inline-flex min-h-8 items-center rounded-full border border-white/12 bg-white/10 px-3 text-xs font-semibold text-white/84">{name}</span>)}</div>}
          </div>
          <div className="artist-page-facts rounded-[28px] border border-white/12 bg-black/36 p-5 text-left shadow-[0_22px_54px_rgba(0,0,0,0.24)] backdrop-blur-md">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#F6B293]">Venue facts</p>
            <div className="mt-5 grid gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/54">Capacity</p><p className="mt-1 text-2xl font-semibold text-white">{venue.capacity?.toLocaleString() ?? 'Not listed'}</p></div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                <div className="rounded-2xl border border-white/10 bg-white/[0.07] px-4 py-3"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/54">Age policy</p><p className="mt-1 text-sm font-semibold text-white">{venue.age_requirement ? AGE_LABELS[venue.age_requirement] : 'Not listed'}</p></div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.07] px-4 py-3"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/54">Default bill</p><p className="mt-1 text-sm font-semibold text-white">{venue.default_bill_cap} act{venue.default_bill_cap === 1 ? '' : 's'}</p></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
