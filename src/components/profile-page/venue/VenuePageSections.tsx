import type { ComponentType, ReactNode } from 'react'
import { CalendarDays, CheckCircle2, ExternalLink, Globe, Instagram, Mail, MapPin, Music2, PencilLine, Phone, ShieldCheck, Users } from 'lucide-react'
import { Badge, ButtonLink } from '@/components/ui/primitives'
import type { ProfilePageSectionContent } from '@/components/profile-page/profile-page-types'
import type { VenuePageSectionId } from '@/components/profile-page/venue/venue-page-config'
import type { Venue } from '@/types/database'

export type VenueContentSection = 'profile' | 'facts' | 'contact' | 'links'
const AGE_LABELS: Record<string, string> = { all_ages: 'All ages', '18_plus': '18+', '21_plus': '21+' }

function DetailRow({ icon: Icon, label, value }: { icon: ComponentType<{ className?: string }>; label: string; value: ReactNode }) {
  return <div className="flex gap-3"><div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--profile-accent)_10%,white)] text-[var(--profile-accent)]"><Icon className="h-4 w-4" /></div><div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8A8A8A]">{label}</p><div className="mt-1 text-sm leading-6 text-[#2A2A2A]">{value}</div></div></div>
}

function EditButton({ label, onClick }: { label: string; onClick?: () => void }) {
  if (!onClick) return null
  return <button type="button" onClick={onClick} className="inline-flex min-h-9 items-center gap-2 rounded-xl border border-[#DED7D0] bg-white px-3 text-xs font-semibold text-[#5D534C] shadow-sm hover:border-[#BEB4AC]"><PencilLine className="h-3.5 w-3.5" />{label}</button>
}

function Card({ eyebrow, title, action, children }: { eyebrow: string; title: string; action?: ReactNode; children: ReactNode }) {
  return <section className="h-full rounded-[28px] border border-[#E6DFD3] bg-white p-6 shadow-[0_18px_42px_rgba(17,17,17,0.05)] sm:p-8"><div className="mb-6 flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--profile-accent)]">{eyebrow}</p><h2 className="mt-3 text-2xl font-semibold tracking-tight text-[#111111]">{title}</h2></div>{action}</div>{children}</section>
}

export function createVenuePageSections({ venue, isOwner, isEditing, onEditContent, availabilityContent, privateChatContent, profileManagementContent }: {
  venue: Venue
  isOwner: boolean
  isEditing: boolean
  onEditContent?: (section: VenueContentSection) => void
  availabilityContent?: ReactNode
  privateChatContent?: ReactNode
  profileManagementContent?: ReactNode
}): ProfilePageSectionContent<VenuePageSectionId>[] {
  const location = [venue.location_address, [venue.location_city, venue.location_state].filter(Boolean).join(', '), venue.location_zip].filter(Boolean).join(' · ')
  const links = [{ key: 'website_url' as const, label: 'Website', icon: Globe }, { key: 'instagram_url' as const, label: 'Instagram', icon: Instagram }].filter(({ key }) => !!venue[key])
  return [
    { sectionId: 'overview', content: <Card eyebrow="Overview" title="Room profile" action={<EditButton label="Edit room details" onClick={onEditContent ? () => onEditContent('facts') : undefined} />}><div className="grid gap-5 sm:grid-cols-2"><DetailRow icon={MapPin} label="Location" value={location} />{venue.capacity && <DetailRow icon={Users} label="Capacity" value={`${venue.capacity.toLocaleString()} cap`} />}{venue.age_requirement && <DetailRow icon={ShieldCheck} label="Age policy" value={AGE_LABELS[venue.age_requirement]} />}<DetailRow icon={Music2} label="Bill target" value={`${venue.default_bill_cap} act${venue.default_bill_cap === 1 ? '' : 's'} by default`} /></div></Card> },
    { sectionId: 'booking-details', content: <Card eyebrow="Booking" title="Contact details" action={<EditButton label="Edit" onClick={onEditContent ? () => onEditContent('contact') : undefined} />}><div className="space-y-4">{venue.booking_email && <DetailRow icon={Mail} label="Booking email" value={<a href={`mailto:${venue.booking_email}`} className="font-medium text-[var(--profile-accent)] hover:underline">{venue.booking_email}</a>} />}{venue.phone && <DetailRow icon={Phone} label="Phone" value={venue.phone} />}{!venue.booking_email && !venue.phone && <p className="text-sm leading-6 text-[#777777]">Booking contact details have not been listed yet.</p>}</div></Card> },
    { sectionId: 'availability', content: availabilityContent ?? <Card eyebrow="Availability" title="Booking calendar"><div className="rounded-2xl border border-dashed border-[#E4DED4] bg-[#FCFBF8] px-6 py-10 text-center"><CalendarDays className="mx-auto h-6 w-6 text-[var(--profile-accent)]" /><p className="mt-3 text-sm leading-6 text-[#777777]">Set available dates in Calendar Workspace. Visitors will see them here.</p>{isEditing && <ButtonLink href={`/dashboard/calendar?profile=venue:${venue.id}`} tone="secondary" className="mt-4">Open Calendar Workspace</ButtonLink>}</div></Card> },
    { sectionId: 'private-chat', content: privateChatContent ?? <Card eyebrow="Connect" title="Private chat"><p className="text-sm leading-6 text-[#777777]">Visitors with a TourAligner profile can start a private conversation from this section.</p></Card> },
    ...(links.length > 0 || isEditing ? [{ sectionId: 'links' as const, content: <Card eyebrow="Online" title="Venue links" action={<EditButton label="Edit" onClick={onEditContent ? () => onEditContent('links') : undefined} />}><div className="space-y-2">{links.map(({ key, label, icon: Icon }) => <a key={key} href={venue[key] as string} target="_blank" rel="noopener noreferrer" className="artist-page-link-button flex min-h-12 items-center justify-between gap-3 border border-[#EEEEEE] bg-[#FAFAFA] px-4 text-sm font-semibold text-[#252525]"><span className="flex items-center gap-3"><Icon className="h-4 w-4 text-[var(--profile-accent)]" />{label}</span><ExternalLink className="h-4 w-4 text-[#A0A0A0]" /></a>)}{links.length === 0 && <p className="text-sm text-[#777777]">Add a website or Instagram profile.</p>}</div></Card> }] : []),
    { sectionId: 'profile-management', content: profileManagementContent ?? <Card eyebrow="Manage" title="Venue profile">{isOwner ? <><Badge tone="success"><CheckCircle2 className="h-3.5 w-3.5" />You manage this venue</Badge><p className="mt-3 text-sm leading-6 text-[#666666]">Edit the venue info and page design here. Manage dates in Calendar Workspace.</p>{isEditing ? <button type="button" onClick={() => onEditContent?.('profile')} className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#252525] px-4 text-sm font-semibold text-white"><PencilLine className="h-4 w-4" />Edit venue content</button> : <ButtonLink href={`/venues/${venue.slug}?edit=1`} tone="dark" className="mt-5 w-full"><PencilLine className="h-4 w-4" />Edit venue page</ButtonLink>}</> : <p className="text-sm leading-6 text-[#777777]">This public venue profile is managed through TourAligner.</p>}</Card> },
  ]
}
