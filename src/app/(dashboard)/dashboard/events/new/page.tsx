import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { EventCreateForm } from '@/components/events/EventCreateForm'

export const metadata = { title: 'Create Event' }

export default async function NewEventPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return redirect('/login')

  const [{ data: venues }, { data: genres }] = await Promise.all([
    supabase
      .from('venues')
      .select('id, name, capacity')
      .eq('claimed_by_user_id', user.id)
      .eq('is_active', true)
      .order('name'),
    supabase.from('genres').select('*').order('name'),
  ])

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-8">
        <Link href="/dashboard/backstage" className="text-sm text-[#888888] transition-colors hover:text-[#252525]">
          Back to Backstages
        </Link>
        <h1 className="mt-3 text-2xl font-bold text-[#252525]">Create Event</h1>
        <p className="mt-1 text-sm text-[#888888]">
          Create the Event first. TourAligner will create its private Backstage automatically.
        </p>
      </div>

      {(venues ?? []).length > 0 ? (
        <EventCreateForm venues={venues ?? []} genres={genres ?? []} />
      ) : (
        <div className="rounded-2xl border border-[#E8E8E8] bg-white p-10 text-center">
          <p className="text-sm text-[#888888]">Claim a venue before creating an Event.</p>
          <Link href="/dashboard/venues" className="mt-4 inline-block rounded-xl bg-[#FD6A2F] px-5 py-2.5 text-sm font-semibold text-white">
            Manage venues
          </Link>
        </div>
      )}
    </div>
  )
}
