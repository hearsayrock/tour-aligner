import { notFound, redirect } from 'next/navigation'
import { eventBackstageHref } from '@/lib/events'
import { createClient } from '@/lib/supabase/server'

export default async function BackstageDetailPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirectTo=' + encodeURIComponent('/dashboard/backstage/' + eventId))

  const { data: event } = await supabase.from('events').select('slug').eq('id', eventId).maybeSingle()
  if (!event) notFound()
  redirect(eventBackstageHref(event.slug))
}
