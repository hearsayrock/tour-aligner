import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ArtistSetup } from '@/components/studio/ArtistSetup'
import { inquiryReturn } from '@/lib/studio/return-path'
export const metadata = { title: 'Add artist' }
export default async function NewArtist({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string }>
}) {
  const db = await createClient()
  const {
    data: { user },
  } = await db.auth.getUser()
  if (!user) redirect('/login')
  return <ArtistSetup returnTo={inquiryReturn((await searchParams).redirectTo)} />
}
