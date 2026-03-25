import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AccountSettings } from '@/components/profile/AccountSettings'

export const metadata = { title: 'Account Settings' }

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/dashboard')

  return <AccountSettings profile={profile} userId={user.id} />
}
