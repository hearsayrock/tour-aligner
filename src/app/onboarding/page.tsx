import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ArtistSetup } from '@/components/studio/ArtistSetup'
import { inquiryReturn } from '@/lib/studio/return-path'

export default async function OnboardingPage({searchParams}:{searchParams:Promise<{redirectTo?:string}>}) {
  const returnTo=inquiryReturn((await searchParams).redirectTo)
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const userId = session?.user.id

  if (!userId) redirect('/login')

  const [bandsResult, venuesResult] = await Promise.all([
    supabase
      .from('bands')
      .select('id')
      .eq('user_id', userId)
      .limit(1),
    supabase
      .from('venues')
      .select('id')
      .eq('claimed_by_user_id', userId)
      .limit(1),
  ])

  const hasManagedProfile = Boolean(bandsResult.data?.length || venuesResult.data?.length)

  // Already onboarded — skip ahead
  if (hasManagedProfile) redirect(returnTo||'/dashboard')

  return <ArtistSetup returnTo={returnTo}/>
}
