import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import OnboardingWizard from './OnboardingWizard'

export default async function OnboardingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('primary_role, full_name')
    .eq('id', user.id)
    .single()

  // Already onboarded — skip ahead
  if (profile?.primary_role) redirect('/dashboard')

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
