import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function InboxThreadDispatchPage({
  params,
}: {
  params: Promise<{ threadId: string }>
}) {
  const { threadId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return redirect('/login')

  const [{ data: privateThread }, { data: bookingThread }] = await Promise.all([
    supabase.from('private_chat_threads').select('id').eq('id', threadId).maybeSingle(),
    supabase.from('contact_threads').select('id').eq('id', threadId).maybeSingle(),
  ])

  if (privateThread) return redirect(`/dashboard/inbox/private/${threadId}`)
  if (bookingThread) return redirect(`/dashboard/inbox/bookings/${threadId}`)

  return redirect('/dashboard/inbox')
}
