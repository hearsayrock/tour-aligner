'use client'

import Link from 'next/link'
import { FormEvent, useId, useState, useTransition } from 'react'
import { createPortal } from 'react-dom'
import { ArrowRight, CheckCircle2, Loader2, Music2, X } from 'lucide-react'
import { joinArtistWaitlist } from '@/app/actions/waitlist'
import { cx } from '@/components/ui/primitives'

type WaitlistButtonProps = {
  label?: string
  className?: string
  icon?: boolean
  onOpenChange?: (open: boolean) => void
}

const successMessage =
  "Got it! We'll let you know when your tour is ready to be aligned. In the meantime, feel free to create an account and build your artist profile out!"

export function WaitlistButton({
  label = 'Join Wait List',
  className,
  icon = false,
  onOpenChange,
}: WaitlistButtonProps) {
  const [open, setOpen] = useState(false)
  const [joined, setJoined] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const emailId = useId()
  const gripeId = useId()
  const modalRoot = typeof document === 'undefined' ? null : document.body

  function setModalOpen(nextOpen: boolean) {
    setOpen(nextOpen)
    onOpenChange?.(nextOpen)

    if (!nextOpen) {
      setError(null)
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    const formData = new FormData(event.currentTarget)
    const email = String(formData.get('email') || '')
    const bookingProcessGripe = String(formData.get('bookingProcessGripe') || '')

    startTransition(async () => {
      const result = await joinArtistWaitlist({ email, bookingProcessGripe })

      if (!result.ok) {
        setError(result.message)
        return
      }

      setJoined(true)
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setJoined(false)
          setModalOpen(true)
        }}
        className={cx(
          'inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#FD6A2F] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#E55A22] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FD6A2F] focus-visible:ring-offset-2',
          className
        )}
      >
        {label}
        {icon && <ArrowRight size={16} />}
      </button>

      {open && modalRoot && createPortal((
        <div
          className="fixed inset-0 z-[90] flex min-h-dvh items-center justify-center overflow-y-auto bg-black/58 px-4 py-8 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="artist-waitlist-title"
        >
          <div className="relative my-auto w-full max-w-lg rounded-[24px] border border-[#E6DFD3] bg-white p-6 text-[#181818] shadow-[0_28px_80px_rgba(0,0,0,0.28)] sm:p-7">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full text-[#777777] transition-colors hover:bg-[#F2F2F2] hover:text-[#252525]"
              aria-label="Close waitlist form"
            >
              <X size={18} />
            </button>

            {joined ? (
              <div className="pr-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F3FBF8] text-[#0C7C71]">
                  <CheckCircle2 size={23} />
                </div>
                <h2
                  id="artist-waitlist-title"
                  className="mt-5 text-2xl font-semibold tracking-tight text-[#111111]"
                >
                  You are on the list.
                </h2>
                <p className="mt-3 text-sm leading-7 text-[#5E656C]">{successMessage}</p>
                <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                  <Link
                    href="/signup"
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#FD6A2F] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#E55A22]"
                  >
                    Create artist profile
                    <ArrowRight size={16} />
                  </Link>
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#E2E2E2] bg-white px-5 py-3 text-sm font-semibold text-[#252525] transition hover:bg-[#F6F6F6]"
                  >
                    Back to landing page
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FFF3EE] text-[#FD6A2F]">
                  <Music2 size={22} />
                </div>
                <h2
                  id="artist-waitlist-title"
                  className="mt-5 text-2xl font-semibold tracking-tight text-[#111111]"
                >
                  Get first access to TourAligner.
                </h2>
                <p className="mt-3 text-sm leading-7 text-[#5E656C]">
                  Tell us where to send your invite and what part of booking shows needs to
                  get easier first.
                </p>

                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                  <div>
                    <label htmlFor={emailId} className="mb-1.5 block text-sm font-medium text-[#424242]">
                      Email Address
                    </label>
                    <input
                      id={emailId}
                      name="email"
                      type="email"
                      required
                      autoComplete="email"
                      className="w-full rounded-xl border border-[#DADADA] bg-[#F8F8F8] px-4 py-3 text-sm text-[#252525] outline-none transition focus:border-[#FD6A2F] focus:bg-white focus:ring-2 focus:ring-[#FD6A2F]/15"
                    />
                  </div>

                  <div>
                    <label htmlFor={gripeId} className="mb-1.5 block text-sm font-medium text-[#424242]">
                      Tell us the biggest gripe you have with the booking process. <span className="text-[#8B8B8B]">(optional)</span>
                    </label>
                    <textarea
                      id={gripeId}
                      name="bookingProcessGripe"
                      rows={4}
                      className="w-full resize-none rounded-xl border border-[#DADADA] bg-[#F8F8F8] px-4 py-3 text-sm text-[#252525] outline-none transition focus:border-[#FD6A2F] focus:bg-white focus:ring-2 focus:ring-[#FD6A2F]/15"
                    />
                  </div>

                  {error && (
                    <p className="rounded-xl border border-[#F3C6C6] bg-[#FFF1F1] px-4 py-3 text-sm text-[#9D2020]">
                      {error}
                    </p>
                  )}

                  <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={() => setModalOpen(false)}
                      className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#E2E2E2] bg-white px-5 py-3 text-sm font-semibold text-[#252525] transition hover:bg-[#F6F6F6]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isPending}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#FD6A2F] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#E55A22] disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {isPending && <Loader2 size={16} className="animate-spin" />}
                      Join Wait List
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      ), modalRoot)}
    </>
  )
}
