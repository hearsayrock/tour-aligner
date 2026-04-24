'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { ACTIVE_IDENTITY_COOKIE, parseIdentityValue } from '@/lib/managed-identity'

export async function updatePassword(newPassword: string): Promise<{ error: string | null }> {
  if (newPassword.length < 8) {
    return { error: 'Password must be at least 8 characters.' }
  }
  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  return { error: error?.message ?? null }
}

export async function setActiveIdentity(value: string): Promise<{ error: string | null }> {
  const parsed = parseIdentityValue(value)
  if (!parsed) return { error: 'Invalid profile selection.' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'You must be signed in.' }

  if (parsed.kind !== 'all') {
    const query = parsed.kind === 'band'
      ? supabase.from('bands').select('id').eq('id', parsed.id).eq('user_id', user.id).eq('is_active', true).maybeSingle()
      : supabase.from('venues').select('id').eq('id', parsed.id).eq('claimed_by_user_id', user.id).eq('is_active', true).maybeSingle()

    const { data } = await query
    if (!data) return { error: 'You do not manage that profile.' }
  }

  const cookieStore = await cookies()
  cookieStore.set(ACTIVE_IDENTITY_COOKIE, value, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 180,
  })

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/inbox')

  return { error: null }
}
