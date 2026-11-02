import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { findBackstageForOldBooking, parseRetiredInboxPath } from '@/lib/retired-inbox'

// Compatibility redirects only. Messaging lives in the dock; bookings live in
// Backstage. Preserve bookmarks without retaining an Inbox screen or deleting data.
export default async function RetiredInboxRedirect({ params }: { params: Promise<{ path?: string[] }> }) {
  const target = parseRetiredInboxPath((await params).path ?? [])
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if (!target) redirect('/dashboard/profiles?chats=open')
  const [privateThread, bookings] = await Promise.all([
    target.kind !== 'booking'
      ? supabase.from('private_chat_threads').select('id').eq('id', target.id).maybeSingle()
      : Promise.resolve({ data: null }),
    target.kind !== 'private'
      ? supabase.from('bookings').select('event_id, show_date').eq('thread_id', target.id).not('event_id', 'is', null)
      : Promise.resolve({ data: [] }),
  ])
  if (privateThread.data) redirect(`/dashboard/profiles?chat=${privateThread.data.id}`)
  const eventId = findBackstageForOldBooking(bookings.data ?? [], new Date().toISOString().slice(0, 10))
  redirect(eventId ? `/dashboard/backstage/${eventId}` : '/dashboard/backstage')
}
