import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { VenueEditForm } from '@/components/venues/VenueEditForm'

export const metadata = { title: 'Edit Venue' }

export default async function EditVenuePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return redirect('/login')

  const [{ data: venue }, { data: genres }, { data: rawVenueGenres }] = await Promise.all([
    supabase
      .from('venues')
      .select('*')
      .eq('id', id)
      .eq('claimed_by_user_id', user.id)
      .single(),
    supabase.from('genres').select('*').order('name'),
    supabase.from('venue_genres').select('genre_id').eq('venue_id', id),
  ])
  const venueGenres = rawVenueGenres as { genre_id: string }[] | null

  if (!venue) return notFound()

  return (
    <VenueEditForm
      venue={venue}
      genres={genres ?? []}
      selectedGenreIds={(venueGenres ?? []).map((g) => g.genre_id)}
      calendarHref={`/dashboard/calendar?profile=venue:${venue.id}`}
    />
  )
}
