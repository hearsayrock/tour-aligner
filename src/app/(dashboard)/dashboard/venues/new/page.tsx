import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { VenueCreateForm } from '@/components/venues/VenueCreateForm'

export const metadata = { title: 'Add a Venue' }

export default async function NewVenuePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: genres } = await supabase
    .from('genres')
    .select('*')
    .order('name')

  return <VenueCreateForm userId={user.id} genres={genres ?? []} />
}
