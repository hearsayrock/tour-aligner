import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import OnboardingWizard from './OnboardingWizard'

export default async function OnboardingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const [profileResult, bandsResult, venuesResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('full_name')
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

  // Already onboarded — skip ahead
  if (hasManagedProfile) redirect('/dashboard')

  const { data: genres } = await supabase
    .from('genres')
    .select('*')
    .order('name')

  return (
    <OnboardingWizard
      userId={user.id}
      userName={profile?.full_name ?? ''}
      genres={genres ?? []}
    />
  )
}
