import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export const metadata = { title: 'Edit Artist' }

export default async function EditBandPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return redirect('/login')

  const { data: band } = await supabase
    .from('bands')
    .select('slug')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!band) return notFound()
  redirect(`/bands/${band.slug}?edit=1`)
}
