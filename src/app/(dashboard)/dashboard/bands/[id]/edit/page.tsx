import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BandForm } from '@/components/bands/BandForm'
import type { Band } from '@/types/database'

export const metadata = { title: 'Edit Band' }

export default async function EditBandPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return redirect('/login')

  const { data: band } = await supabase.from('bands').select('*').eq('id', id).eq('user_id', user.id).single() as { data: Band | null }

  if (!band) return notFound()

  const [{ data: genres }, { data: bandGenres }, { data: showDates }] = await Promise.all([
    supabase.from('genres').select('*').order('name'),
    supabase.from('band_genres').select('genre_id').eq('band_id', id),
    supabase.from('band_show_dates').select('*').eq('band_id', id).order('show_date'),
  ])

  return (
    <BandForm
      mode="edit"
      userId={user.id}
      genres={genres ?? []}
      initial={{
        id: band.id,
        name: band.name,
        tagline: band.tagline ?? '',
        location_city: band.location_city ?? '',
        location_state: band.location_state ?? '',
        description: band.description ?? '',
        touring_radius: band.touring_radius ?? '',
        website_url: band.website_url ?? '',
        instagram_url: band.instagram_url ?? '',
        spotify_url: band.spotify_url ?? '',
        youtube_url: band.youtube_url ?? '',
        bandcamp_url: band.bandcamp_url ?? '',
        apple_music_url: band.apple_music_url ?? '',
        tiktok_url: band.tiktok_url ?? '',
        soundcloud_url: band.soundcloud_url ?? '',
        facebook_url: band.facebook_url ?? '',
        twitter_url: band.twitter_url ?? '',
        members: band.members ?? [],
        profile_photo_url: band.profile_photo_url ?? '',
        cover_photo_url: band.cover_photo_url ?? '',
        artist_type: band.artist_type ?? '',
        set_length_min: band.set_length_min ? String(band.set_length_min) : '',
        selectedGenreIds: (bandGenres ?? []).map((g) => g.genre_id),
        showDates: (showDates ?? []).map((d) => ({
          show_date: d.show_date,
          venue_name: d.venue_name,
          city: d.city,
          state: d.state,
          ticket_url: d.ticket_url ?? '',
        })),
      }}
    />
  )
}
