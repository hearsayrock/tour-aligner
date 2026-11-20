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
          'inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-brand px-4 py-2 text-sm font-bold text-on-brand transition-colors hover:bg-brand-dim focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2',
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
          <div className="relative my-auto w-full max-w-lg rounded-[24px] border border-border bg-white p-6 text-ink-strong shadow-[0_28px_80px_rgba(0,0,0,0.28)] sm:p-7">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-surface-2 hover:text-ink"
              aria-label="Close waitlist form"
            >
              <X size={18} />
            </button>

            {joined ? (
              <div className="pr-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-success-tint text-success">
                  <CheckCircle2 size={23} />
                </div>
                <h2
                  id="artist-waitlist-title"
                  className="mt-5 text-2xl font-semibold tracking-tight text-ink-black"
                >
                  You are on the list.
                </h2>
                <p className="mt-3 text-sm leading-7 text-text-secondary">{successMessage}</p>
                <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                  <Link
                    href="/signup"
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-on-brand transition hover:bg-brand-dim"
                  >
                    Create artist profile
                    <ArrowRight size={16} />
                  </Link>
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border bg-white px-5 py-3 text-sm font-semibold text-ink transition hover:bg-surface"
                  >
                    Back to landing page
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-tint text-brand-text">
                  <Music2 size={22} />
                </div>
                <h2
                  id="artist-waitlist-title"
                  className="mt-5 text-2xl font-semibold tracking-tight text-ink-black"
                >
                  Get first access to TourAligner.
                </h2>
                <p className="mt-3 text-sm leading-7 text-text-secondary">
                  Tell us where to send your invite and what part of booking shows needs to
                  get easier first.
                </p>

                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                  <div>
                    <label htmlFor={emailId} className="mb-1.5 block text-sm font-medium text-ink">
                      Email Address
                    </label>
                    <input
                      id={emailId}
                      name="email"
                      type="email"
                      required
                      autoComplete="email"
                      className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-ink outline-none transition focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/15"
                    />
                  </div>

                  <div>
                    <label htmlFor={gripeId} className="mb-1.5 block text-sm font-medium text-ink">
                      Tell us the biggest gripe you have with the booking process. <span className="text-text-subtle">(optional)</span>
                    </label>
                    <textarea
                      id={gripeId}
                      name="bookingProcessGripe"
                      rows={4}
                      className="w-full resize-none rounded-xl border border-border bg-surface px-4 py-3 text-sm text-ink outline-none transition focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/15"
                    />
                  </div>

                  {error && (
                    <p className="rounded-xl border border-danger-border bg-danger-tint px-4 py-3 text-sm text-danger-text">
                      {error}
                    </p>
                  )}

                  <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={() => setModalOpen(false)}
                      className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border bg-white px-5 py-3 text-sm font-semibold text-ink transition hover:bg-surface"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isPending}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-on-brand transition hover:bg-brand-dim disabled:cursor-not-allowed disabled:opacity-70"
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
