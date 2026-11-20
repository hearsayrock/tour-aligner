import { notFound } from 'next/navigation'
import { ArtistCalendarWorkspace } from '@/components/calendar/ArtistCalendarWorkspace'
import { PageHeader } from '@/components/ui/primitives'
import type { CalendarActivity, CalendarDayMarker } from '@/lib/calendar-activity'

export const metadata = { title: 'Calendar preview', robots: { index: false } }

export default function CalendarReviewPage() {
  if (process.env.NODE_ENV !== 'development') notFound()

  const activitiesByDate: Record<string, CalendarActivity[]> = {
    '2026-11-20': [{ id: 'sample-show', kind: 'show', title: 'Friday showcase', subtitle: 'Salt Lake City, UT', tone: 'default', statusLabel: 'Saved show' }],
    '2026-11-24': [{ id: 'sample-invite', kind: 'event', title: 'Acoustic night', tone: 'warning', statusLabel: 'Invited' }],
    '2026-11-30': [{ id: 'sample-event', kind: 'event', title: 'Punk and Ska night', subtitle: 'The Beehive', tone: 'success', statusLabel: 'Accepted' }],
  }
  const markersByDate: Record<string, CalendarDayMarker[]> = Object.fromEntries(
    Object.entries(activitiesByDate).map(([date, activities]) => [date, activities.map((item) => ({
      id: item.id, tone: item.tone, label: item.title, shortLabel: item.statusLabel || item.title,
    }))])
  )

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader title="Artist calendar" description="Preview with example dates for November 2026." />
      <ArtistCalendarWorkspace todayIso="2026-11-20" activitiesByDate={activitiesByDate} markersByDate={markersByDate} />
    </main>
  )
}
