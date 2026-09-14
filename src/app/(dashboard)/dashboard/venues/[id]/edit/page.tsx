import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export const metadata = { title: 'Edit Venue' }

export default async function EditVenuePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return redirect('/login')
  const { data: venue } = await supabase.from('venues').select('slug').eq('id', id).eq('claimed_by_user_id', user.id).single()
  if (!venue) return notFound()
  redirect(`/venues/${venue.slug}?edit=1`)
}
