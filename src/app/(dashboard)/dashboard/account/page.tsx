import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AccountPage } from '@/components/profile/AccountPage'

export const metadata = { title: 'Account' }

export default async function AccountPageRoute() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return redirect('/login')

  const [profileResult, bandsResult, venuesResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single(),
    supabase
      .from('bands')
      .select('id')
      .eq('user_id', user.id)
      .limit(1),
    supabase
      .from('venues')
      .select('id')
      .eq('claimed_by_user_id', user.id)
      .limit(1),
  ])

  const profile = profileResult.data
  const hasManagedProfile = Boolean(bandsResult.data?.length || venuesResult.data?.length)

  if (!profile) return redirect('/dashboard')

  return (
    <AccountPage
      profile={profile}
      email={user.email ?? ''}
      userId={user.id}
      hasManagedProfile={hasManagedProfile}
      isAdmin={profile.is_admin}
    />
  )
}
