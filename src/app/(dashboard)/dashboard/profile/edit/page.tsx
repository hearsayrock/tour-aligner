import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProfileForm } from '@/components/profile/ProfileForm'

export const metadata = { title: 'Edit Profile' }

export default async function EditProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/dashboard')

  return (
    <ProfileForm
      profile={profile}
      email={user.email ?? ''}
      userId={user.id}
    />
  )
}
