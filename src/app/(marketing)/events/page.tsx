import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatEventDate, getAcceptedMemberships, getOpenArtistNeed } from '@/lib/events'
import type { Event, EventArtistMembership } from '@/types/database'

export const metadata = {
  title: 'Available Events',
  description: 'Find public Events looking for artists on TourAligner.',
}

type PublicEvent = Event & {
  venues: {
    name: string
    slug: string
    location_city: string
    location_state: string
  } | null
  event_genres: Array<{ genres: { id: string; name: string } | null }> | null
  event_artist_memberships: Array<Pick<EventArtistMembership, 'status'>> | null
}

export default async function EventsPage({
  searchParams,
}: {
  searchParams?: Promise<{ genre?: string }>
}) {
  const supabase = await createClient()
  const params = (await searchParams) ?? {}
  const [{ data: genres }, eventIdResult] = await Promise.all([
    supabase.from('genres').select('id, name').order('name'),
    params.genre
      ? supabase.from('event_genres').select('event_id').eq('genre_id', params.genre)
      : Promise.resolve({ data: null }),
  ])

  const matchingEventIds = params.genre
    ? ((eventIdResult.data ?? []) as Array<{ event_id: string }>).map((row) => row.event_id)
    : null

  let query = supabase
    .from('events')
    .select(`
      *,
      venues(name, slug, location_city, location_state),
      event_genres(genres(id, name)),
      event_artist_memberships(status)
    `)
    .eq('is_public', true)
    .eq('is_accepting_artists', true)
    .in('status', ['draft', 'active'])
    .order('event_date', { ascending: true })

  if (matchingEventIds) {
    query = matchingEventIds.length > 0 ? query.in('id', matchingEventIds) : query.eq('id', '00000000-0000-0000-0000-000000000000')
  }

  const { data: rawEvents } = await query
  const events = (rawEvents ?? []) as unknown as PublicEvent[]

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#252525]">Available Events</h1>
          <p className="mt-1 text-sm text-[#888888]">Public Events where venues are looking for artists.</p>
        </div>
        <form>
          <select
            name="genre"
            defaultValue={params.genre ?? ''}
            className="rounded-xl border border-[#E8E8E8] bg-white px-3 py-2.5 text-sm focus:outline-none focus:border-[#FD6A2F]"
          >
            <option value="">All genres</option>
            {(genres ?? []).map((genre) => (
              <option key={genre.id} value={genre.id}>{genre.name}</option>
            ))}
          </select>
          <button className="ml-2 rounded-xl border border-[#E8E8E8] bg-white px-3 py-2.5 text-sm font-medium text-[#252525]">
            Filter
          </button>
        </form>
      </div>

      {events.length === 0 ? (
        <div className="rounded-2xl border border-[#E8E8E8] bg-white p-12 text-center">
          <p className="text-sm text-[#888888]">No available Events match this view yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {events.map((event) => {
            const acceptedCount = getAcceptedMemberships(event.event_artist_memberships ?? []).length
            const openNeed = getOpenArtistNeed(event, event.event_artist_memberships ?? [])
            const genreNames = (event.event_genres ?? []).map((entry) => entry.genres?.name).filter(Boolean)

            return (
              <Link
                key={event.id}
                href={`/events/${event.slug}`}
                className="block rounded-2xl border border-[#E8E8E8] bg-white p-5 transition-colors hover:border-[#CCCCCC]"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold text-[#252525]">{event.title}</h2>
                    <p className="mt-1 text-sm text-[#777777]">
                      {event.venues?.name ?? 'Unknown venue'} · {formatEventDate(event)}
                    </p>
                    <p className="mt-1 text-sm text-[#888888]">
                      {event.venues ? [event.venues.location_city, event.venues.location_state].filter(Boolean).join(', ') : ''}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {genreNames.map((genre) => (
                        <span key={genre} className="rounded-full border border-[#E8E8E8] px-2 py-0.5 text-xs text-[#555555]">
                          {genre}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-xl border border-[#E8E8E8] bg-[#FCFCFC] px-4 py-3 text-right text-sm">
                    <p className="font-semibold text-[#252525]">{acceptedCount}/{event.needed_artist_count} artists</p>
                    <p className={openNeed <= 0 ? 'mt-1 text-xs text-[#8A5A12]' : 'mt-1 text-xs text-[#777777]'}>
                      {openNeed <= 0 ? 'Needed count reached' : `${openNeed} open need${openNeed === 1 ? '' : 's'}`}
                    </p>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
