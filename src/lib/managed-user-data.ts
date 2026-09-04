import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { getServerTimingStart, logServerTiming, measureServerOperation } from '@/lib/performance'

type ManagedProfile = {
  full_name: string | null
  is_admin: boolean
}

export type ManagedBand = {
  id: string
  name: string
  slug: string
}

export type ManagedVenue = {
  id: string
  name: string
  slug: string
}

export const getManagedUserData = cache(async (userId: string) => {
  const startedAt = getServerTimingStart()
  const supabase = await createClient()
  const [profileQuery, bandsQuery, venuesQuery] = await Promise.all([
    measureServerOperation(supabase.from('profiles').select('full_name, is_admin').eq('id', userId).single()),
    measureServerOperation(supabase.from('bands').select('id, name, slug').eq('user_id', userId).eq('is_active', true).order('name')),
    measureServerOperation(supabase.from('venues').select('id, name, slug').eq('claimed_by_user_id', userId).eq('is_active', true).order('name')),
  ])

  logServerTiming('managed user data', {
    profile: profileQuery.duration,
    bands: bandsQuery.duration,
    venues: venuesQuery.duration,
    total: getServerTimingStart() - startedAt,
  })

  return {
    profile: profileQuery.value.data as ManagedProfile | null,
    bands: (bandsQuery.value.data ?? []) as ManagedBand[],
    venues: (venuesQuery.value.data ?? []) as ManagedVenue[],
  }
})
