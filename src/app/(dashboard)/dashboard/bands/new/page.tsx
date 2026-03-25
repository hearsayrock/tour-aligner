import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BandForm } from '@/components/bands/BandForm'

export const metadata = { title: 'Add a Band' }

export default async function NewBandPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return redirect('/login')

  const { data: genres } = await supabase
    .from('genres')
    .select('*')
    .order('name')

  return (
    <BandForm
      mode="create"
      userId={user.id}
      genres={genres ?? []}
    />
  )
}
