'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  archiveContactThread,
  blockContactThread,
  cancelConfirmedBooking,
  confirmContactBooking,
  requestBookingCancellation,
  requestContact,
  resolveBookingCancellation,
  respondToContactRequest,
  unarchiveContactThread,
  unblockContactThread,
  updateThreadWorkingDate,
} from '@/app/actions/contact'
import { BOOKING_STATUS_LABELS, formatShowDate, type ThreadBookingSummary } from '@/lib/contact'
import type { ContactThreadStatus, ConversationSide } from '@/types/database'

interface ActionProps {
  threadId: string
  bandId: string
  venueId: string
  status: ContactThreadStatus
  viewerSide: ConversationSide
  requestedBySide: ConversationSide | null
  blockedBySide: ConversationSide | null
  workingDate: string | null
  defaultBillCap: number
  bookings: ThreadBookingSummary[]
  bookingCountByDateId: Record<string, number>
}

interface BlockProps {
  threadId: string
  status: ContactThreadStatus
  viewerSide: ConversationSide
  blockedBySide: ConversationSide | null
}

export function ArchiveThreadControl({
  threadId,
  archived,
}: {
  threadId: string
  archived: boolean
}) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function run(task: () => Promise<{ error?: string }>) {
    setError(null)

    startTransition(async () => {
      const result = await task()
      if (result.error) {
        setError(result.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => run(() => (archived ? unarchiveContactThread(threadId) : archiveContactThread(threadId)))}
        disabled={isPending}
        className="inline-flex items-center rounded-lg border border-[#E8E8E8] bg-white px-3 py-2 text-sm font-medium text-[#252525] transition-colors hover:border-[#CCCCCC] disabled:opacity-50"
      >
        {isPending ? (archived ? 'Unarchiving…' : 'Archiving…') : archived ? 'Unarchive' : 'Archive'}
      </button>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  )
}

type BookingModal = 'confirm' | 'request-cancel' | 'cancel' | null

function Modal({
  title,
  description,
  children,
  onClose,
}: {
  title: string
  description?: string
  children: React.ReactNode
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <button
        type="button"
        aria-label="Close modal"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-[#E8E8E8] bg-white p-6 shadow-2xl">
        <h2 className="text-lg font-semibold text-[#252525]">{title}</h2>
        {description && <p className="mt-2 text-sm text-[#777777]">{description}</p>}
        <div className="mt-5">{children}</div>
      </div>
    </div>
  )
}

function RecommendedTag() {
  return (
    <span className="inline-flex rounded-full border border-[#E8E8E8] bg-[#FAFAFA] px-2 py-0.5 text-[11px] font-medium text-[#777777]">
      Recommended
    </span>
  )
}

function BookingBadge({ status }: { status: ThreadBookingSummary['status'] }) {
  const styles = {
    confirmed: 'text-[#14584E] bg-[#F3FBF8] border-[#CBEAE2]',
    cancellation_requested: 'text-[#8A5A12] bg-[#FFF7E8] border-[#F2D7A6]',
    cancelled: 'text-[#666666] bg-[#F5F5F5] border-[#E8E8E8]',
  } as const

  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${styles[status]}`}>
      {BOOKING_STATUS_LABELS[status]}
    </span>
  )
}

export function BlockContactControl({
  threadId,
  status,
  viewerSide,
  blockedBySide,
}: BlockProps) {
  const router = useRouter()
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const canBlock = status === 'accepted'
  const canUnblock = status === 'blocked' && blockedBySide === viewerSide

  if (!canBlock && !canUnblock) return null

  function run(task: () => Promise<{ error?: string }>, onSuccess?: () => void) {
    setError(null)

    startTransition(async () => {
      const result = await task()

      if (result.error) {
        setError(result.error)
        return
      }

      onSuccess?.()
      setNote('')
      router.refresh()
    })
  }

  return (
    <>
      {canBlock && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="inline-flex items-center rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-100"
        >
          Block contact
        </button>
      )}

      {canUnblock && (
        <button
          type="button"
          onClick={() => run(() => unblockContactThread(threadId))}
          disabled={isPending}
          className="inline-flex items-center rounded-lg border border-[#E8E8E8] bg-white px-3 py-2 text-sm font-medium text-[#252525] transition-colors hover:border-[#CCCCCC] disabled:opacity-50"
        >
          Unblock contact
        </button>
      )}

      {isOpen && (
        <Modal
          title="Block contact?"
          description="This will stop future requests and messages in this conversation. You can add an optional note for the thread history."
          onClose={() => {
            setIsOpen(false)
            setError(null)
          }}
        >
          <div className="space-y-4">
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={4}
              placeholder="Optional note"
              className="w-full resize-none rounded-xl border border-[#E8E8E8] bg-[#F5F5F5] px-4 py-3 text-sm placeholder-[#AAAAAA] transition-colors focus:outline-none focus:border-[#FD6A2F]"
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false)
                  setError(null)
                }}
                className="rounded-lg px-3 py-2 text-sm text-[#777777] transition-colors hover:text-[#252525]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() =>
                  run(() => blockContactThread(threadId, note), () => {
                    setIsOpen(false)
                    setError(null)
                  })
                }
                disabled={isPending}
                className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-100 disabled:opacity-50"
              >
                {isPending ? 'Blocking…' : 'Block contact'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}

export function InboxThreadActions({
  threadId,
  bandId,
  venueId,
  status,
  viewerSide,
  requestedBySide,
  blockedBySide,
  workingDate,
  defaultBillCap,
  bookings,
  bookingCountByDateId,
}: ActionProps) {
  const router = useRouter()
  const [note, setNote] = useState('')
  const [modalNote, setModalNote] = useState('')
  const [workingDateDraft, setWorkingDateDraft] = useState(workingDate ?? '')
  const [confirmDate, setConfirmDate] = useState(workingDate ?? '')
  const [billCap, setBillCap] = useState(String(defaultBillCap))
  const [closeBill, setCloseBill] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeModal, setActiveModal] = useState<BookingModal>(null)
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const selectedBooking =
    selectedBookingId ? bookings.find((booking) => booking.id === selectedBookingId) ?? null : null
  const isIncomingPending = status === 'pending' && requestedBySide !== viewerSide
  const isOutgoingPending = status === 'pending' && requestedBySide === viewerSide
  const canUnblock = status === 'blocked' && blockedBySide === viewerSide
  const hasPendingCancellation = bookings.some((booking) => booking.status === 'cancellation_requested')
  const canSetWorkingDate = status === 'accepted' && !hasPendingCancellation
  const canConfirmBooking = status === 'accepted' && viewerSide === 'venue' && !hasPendingCancellation

  const bannerText = useMemo(() => {
    if (isIncomingPending) return 'This contact request is waiting for your response.'
    if (isOutgoingPending) return 'Your contact request is pending.'
    if (status === 'declined') return 'This request was declined. You can send a new request when you are ready.'
    if (canUnblock) return 'You blocked this contact. Unblock to allow future requests or messages.'
    if (status === 'blocked') return 'This conversation is blocked.'
    if (hasPendingCancellation && viewerSide === 'venue') {
      return 'There is a booking cancellation request waiting on this thread.'
    }
    return ''
  }, [canUnblock, hasPendingCancellation, isIncomingPending, isOutgoingPending, status, viewerSide])

  function resetModal() {
    setActiveModal(null)
    setSelectedBookingId(null)
    setModalNote('')
  }

  function runAction(task: () => Promise<{ error?: string }>, onSuccess?: () => void) {
    setError(null)

    startTransition(async () => {
      const result = await task()

      if (result.error) {
        setError(result.error)
        return
      }

      setNote('')
      onSuccess?.()
      resetModal()
      router.refresh()
    })
  }

  const sortedBookings = [...bookings].sort((a, b) => a.show_date.localeCompare(b.show_date))

  return (
    <div className="space-y-4">
      {bannerText && (
        <div className="rounded-xl border border-[#E8E8E8] bg-[#FAFAFA] px-4 py-3 text-sm text-[#666666]">
          {bannerText}
        </div>
      )}

      {isIncomingPending && (
        <div className="space-y-3">
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={3}
            placeholder="Optional note"
            className="w-full resize-none rounded-xl border border-[#E8E8E8] bg-[#F5F5F5] px-4 py-3 text-sm placeholder-[#AAAAAA] transition-colors focus:outline-none focus:border-[#FD6A2F]"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => runAction(() => respondToContactRequest(threadId, 'accept', note))}
              disabled={isPending}
              className="rounded-lg bg-[#FD6A2F] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#E55A22] disabled:opacity-50"
            >
              Accept
            </button>
            <button
              type="button"
              onClick={() => runAction(() => respondToContactRequest(threadId, 'decline_retry_later', note))}
              disabled={isPending}
              className="rounded-lg border border-[#E8E8E8] bg-[#F5F5F5] px-4 py-2 text-sm font-medium text-[#555555] transition-colors hover:border-[#CCCCCC] disabled:opacity-50"
            >
              Decline for now
            </button>
            <button
              type="button"
              onClick={() => runAction(() => respondToContactRequest(threadId, 'decline_and_block', note))}
              disabled={isPending}
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-100 disabled:opacity-50"
            >
              Decline and block
            </button>
          </div>
        </div>
      )}

      {status === 'declined' && (
        <div className="space-y-3">
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={3}
            placeholder="Send a new intro note to reopen this conversation"
            className="w-full resize-none rounded-xl border border-[#E8E8E8] bg-[#F5F5F5] px-4 py-3 text-sm placeholder-[#AAAAAA] transition-colors focus:outline-none focus:border-[#FD6A2F]"
          />
          <button
            type="button"
            onClick={() =>
              runAction(() =>
                requestContact({
                  bandId,
                  venueId,
                  initiatorSide: viewerSide,
                  message: note,
                })
              )
            }
            disabled={isPending || !note.trim()}
            className="rounded-lg bg-[#FD6A2F] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#E55A22] disabled:opacity-50"
          >
            Send new request
          </button>
        </div>
      )}

      {status === 'accepted' && (
        <section className="rounded-2xl border border-[#E8E8E8] bg-[#FCFCFC] p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#888888]">Current booking</p>
          <h2 className="mt-2 text-lg font-semibold text-[#252525]">
            {workingDate ? formatShowDate(workingDate) : 'Set a working date'}
          </h2>
          <p className="mt-1 text-sm text-[#777777]">
            Use the working date to line up the next show you are discussing in this thread.
          </p>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="sm:max-w-[220px]">
              <label className="mb-1.5 block text-sm text-[#777777]">Working date</label>
              <input
                type="date"
                value={workingDateDraft}
                onChange={(event) => {
                  const value = event.target.value
                  setWorkingDateDraft(value)
                  setConfirmDate(value)
                }}
                className="w-full rounded-xl border border-[#E8E8E8] bg-white px-3 py-2.5 text-sm transition-colors focus:outline-none focus:border-[#FD6A2F]"
              />
            </div>

            {canSetWorkingDate && (
              <button
                type="button"
                onClick={() =>
                  runAction(
                    () => updateThreadWorkingDate(threadId, workingDateDraft || null),
                    () => setConfirmDate(workingDateDraft)
                  )
                }
                disabled={isPending}
                className="rounded-lg border border-[#E8E8E8] bg-white px-4 py-2.5 text-sm font-medium text-[#252525] transition-colors hover:border-[#CCCCCC] disabled:opacity-50"
              >
                {workingDate ? 'Update date' : 'Save date'}
              </button>
            )}

            {canConfirmBooking && (
              <button
                type="button"
                onClick={() => setActiveModal('confirm')}
                disabled={!confirmDate}
                className="rounded-lg bg-[#0C7C71] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0A695F] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Confirm booking
              </button>
            )}
          </div>
        </section>
      )}

      {sortedBookings.length > 0 && (
        <section className="rounded-2xl border border-[#E8E8E8] bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-[#888888]">Confirmed bookings</p>
              <p className="mt-1 text-sm text-[#777777]">
                Keep all confirmed and past dates together in one relationship thread.
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {sortedBookings.map((booking) => {
              const bookingCount = booking.venue_booking_dates?.id
                ? bookingCountByDateId[booking.venue_booking_dates.id] ?? 0
                : 0
              const canRequestCancellation = booking.status === 'confirmed' && viewerSide === 'band'
              const canKeepBooking = booking.status === 'cancellation_requested' && viewerSide === 'venue'
              const canCancelBooking =
                (booking.status === 'confirmed' || booking.status === 'cancellation_requested') &&
                viewerSide === 'venue'

              return (
                <div
                  key={booking.id}
                  className="rounded-xl border border-[#E8E8E8] bg-[#FCFCFC] px-4 py-4"
                >
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-semibold text-[#252525]">
                          {formatShowDate(booking.show_date)}
                        </h3>
                        <BookingBadge status={booking.status} />
                      </div>
                      {booking.venue_booking_dates && booking.status !== 'cancelled' && (
                        <p className="mt-2 text-sm text-[#666666]">
                          {bookingCount} of {booking.venue_booking_dates.bill_cap} filled
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {canRequestCancellation && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedBookingId(booking.id)
                            setActiveModal('request-cancel')
                          }}
                          className="rounded-lg border border-[#E8E8E8] bg-white px-4 py-2 text-sm font-medium text-[#252525] transition-colors hover:border-[#CCCCCC]"
                        >
                          Request cancellation
                        </button>
                      )}

                      {canKeepBooking && (
                        <button
                          type="button"
                          onClick={() => runAction(() => resolveBookingCancellation(booking.id, 'keep', ''))}
                          disabled={isPending}
                          className="rounded-lg border border-[#E8E8E8] bg-white px-4 py-2 text-sm font-medium text-[#252525] transition-colors hover:border-[#CCCCCC] disabled:opacity-50"
                        >
                          Keep booking
                        </button>
                      )}

                      {canCancelBooking && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedBookingId(booking.id)
                            setActiveModal('cancel')
                          }}
                          className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-100"
                        >
                          Cancel booking
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}

      {activeModal === 'confirm' && (
        <Modal
          title="Confirm booking"
          description="This will turn the working date into a confirmed show and make it available for public artist pages and the venue calendar."
          onClose={resetModal}
        >
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm text-[#777777]">Show date</label>
              <input
                type="date"
                value={confirmDate}
                onChange={(event) => setConfirmDate(event.target.value)}
                className="w-full rounded-xl border border-[#E8E8E8] bg-[#F5F5F5] px-4 py-3 text-sm transition-colors focus:outline-none focus:border-[#FD6A2F]"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm text-[#777777]">Bill cap for this date</label>
              <input
                type="number"
                min={1}
                value={billCap}
                onChange={(event) => setBillCap(event.target.value)}
                className="w-full rounded-xl border border-[#E8E8E8] bg-[#F5F5F5] px-4 py-3 text-sm transition-colors focus:outline-none focus:border-[#FD6A2F]"
              />
            </div>

            <label className="flex items-start gap-3 rounded-xl border border-[#E8E8E8] bg-[#FAFAFA] px-4 py-3">
              <input
                type="checkbox"
                checked={closeBill}
                onChange={(event) => setCloseBill(event.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-[#CCCCCC] text-[#FD6A2F] focus:ring-[#FD6A2F]"
              />
              <span>
                <span className="block text-sm font-medium text-[#252525]">Close this bill after confirming</span>
                <span className="mt-0.5 block text-xs text-[#888888]">
                  Use this when the lineup is full or you do not want to add more bands to the date.
                </span>
              </span>
            </label>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={resetModal}
                className="rounded-lg px-3 py-2 text-sm text-[#777777] transition-colors hover:text-[#252525]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() =>
                  runAction(
                    () =>
                      confirmContactBooking({
                        threadId,
                        showDate: confirmDate || null,
                        billCap: billCap ? parseInt(billCap, 10) : null,
                        closeBill,
                      })
                  )
                }
                disabled={isPending || !confirmDate}
                className="rounded-lg bg-[#0C7C71] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#0A695F] disabled:opacity-50"
              >
                {isPending ? 'Confirming…' : 'Confirm booking'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {activeModal === 'request-cancel' && selectedBooking && (
        <Modal
          title="Request cancellation"
          description={`This sends the venue a cancellation request for ${formatShowDate(selectedBooking.show_date)}.`}
          onClose={resetModal}
        >
          <div className="space-y-4">
            <div>
              <div className="mb-1.5 flex items-center gap-2">
                <label className="block text-sm text-[#777777]">Add a note</label>
                <RecommendedTag />
              </div>
              <textarea
                value={modalNote}
                onChange={(event) => setModalNote(event.target.value)}
                rows={4}
                placeholder="Let them know what changed."
                className="w-full resize-none rounded-xl border border-[#E8E8E8] bg-[#F5F5F5] px-4 py-3 text-sm placeholder-[#AAAAAA] transition-colors focus:outline-none focus:border-[#FD6A2F]"
              />
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={resetModal}
                className="rounded-lg px-3 py-2 text-sm text-[#777777] transition-colors hover:text-[#252525]"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => runAction(() => requestBookingCancellation(selectedBooking.id, modalNote))}
                disabled={isPending}
                className="rounded-lg border border-[#E8E8E8] bg-white px-4 py-2 text-sm font-medium text-[#252525] transition-colors hover:border-[#CCCCCC] disabled:opacity-50"
              >
                {isPending ? 'Sending…' : 'Request cancellation'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {activeModal === 'cancel' && selectedBooking && (
        <Modal
          title="Cancel booking"
          description={`This will cancel the booking for ${formatShowDate(selectedBooking.show_date)}.`}
          onClose={resetModal}
        >
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm text-[#777777]">Add a note (optional)</label>
              <textarea
                value={modalNote}
                onChange={(event) => setModalNote(event.target.value)}
                rows={4}
                placeholder="Optional note"
                className="w-full resize-none rounded-xl border border-[#E8E8E8] bg-[#F5F5F5] px-4 py-3 text-sm placeholder-[#AAAAAA] transition-colors focus:outline-none focus:border-[#FD6A2F]"
              />
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={resetModal}
                className="rounded-lg px-3 py-2 text-sm text-[#777777] transition-colors hover:text-[#252525]"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() =>
                  runAction(() =>
                    selectedBooking.status === 'cancellation_requested'
                      ? resolveBookingCancellation(selectedBooking.id, 'cancel', modalNote)
                      : cancelConfirmedBooking(selectedBooking.id, modalNote)
                  )
                }
                disabled={isPending}
                className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-100 disabled:opacity-50"
              >
                {isPending ? 'Cancelling…' : 'Cancel booking'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
