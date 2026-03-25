'use server'

import { createClient } from '@/lib/supabase/server'

export async function updatePassword(newPassword: string): Promise<{ error: string | null }> {
  if (newPassword.length < 8) {
    return { error: 'Password must be at least 8 characters.' }
  }
  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  return { error: error?.message ?? null }
}
