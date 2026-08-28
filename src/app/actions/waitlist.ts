'use server'

import { createClient } from '@/lib/supabase/server'
import { sendWaitlistConfirmation } from '@/lib/waitlist-email'

export type WaitlistActionResult =
  | { ok: true }
  | { ok: false; message: string }

export async function joinArtistWaitlist(input: {
  email: string
  bookingProcessGripe?: string
}): Promise<WaitlistActionResult> {
  const email = input.email.trim().toLowerCase()
  const bookingProcessGripe = input.bookingProcessGripe?.trim() || null

  if (!email) {
    return { ok: false, message: 'Add your email address so we know where to send the invite.' }
  }

  const emailLooksValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

  if (!emailLooksValid) {
    return { ok: false, message: 'That email address does not look quite right.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.from('artist_waitlist_entries').insert({
    email,
    booking_process_gripe: bookingProcessGripe,
  })

  if (error) {
    if (error.code === '23505') {
      return {
        ok: false,
        message: "Whoa! We love the tenacity but you're already on the waiting list.",
      }
    }

    console.error('Failed to join artist waitlist', error)
    return {
      ok: false,
      message: 'We could not save that just now. Give it another try in a moment.',
    }
  }

  await sendWaitlistConfirmation(email)

  return { ok: true }
}
