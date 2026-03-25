'use client'

import { useState } from 'react'
import { respondToInquiry, cancelInquiry } from '@/app/actions/inquiries'
import type { InquiryStatus } from '@/types/database'

interface Props {
  inquiryId: string
  role: 'band' | 'venue'
  status: InquiryStatus
}

export function InquiryActions({ inquiryId, role, status }: Props) {
  const [pending, setPending] = useState<'accept' | 'decline' | 'cancel' | null>(null)
  const [responseMessage, setResponseMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (status !== 'pending') return null

  async function handleRespond(action: 'accepted' | 'declined') {
    setLoading(true)
    setError(null)
    const result = await respondToInquiry(inquiryId, action, responseMessage)
    if (result.error) {
      setError(result.error)
      setLoading(false)
    }
    // On success, the server revalidates the path and the page re-renders
  }

  async function handleCancel() {
    setLoading(true)
    setError(null)
    const result = await cancelInquiry(inquiryId)
    if (result.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  if (role === 'band') {
    if (pending === 'cancel') {
      return (
        <div className="flex items-center gap-2 mt-3">
          <button
            onClick={handleCancel}
            disabled={loading}
            className="text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg px-3 py-1.5 hover:bg-red-500/20 transition-colors disabled:opacity-50"
          >
            {loading ? 'Cancelling…' : 'Confirm cancel'}
          </button>
          <button
            onClick={() => setPending(null)}
            disabled={loading}
            className="text-xs text-[#888888] hover:text-[#252525] transition-colors"
          >
            Never mind
          </button>
          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>
      )
    }

    return (
      <button
        onClick={() => setPending('cancel')}
        className="text-xs text-[#888888] hover:text-red-400 transition-colors mt-3"
      >
        Cancel inquiry
      </button>
    )
  }

  // Venue role
  if (pending === 'accept' || pending === 'decline') {
    const action = pending === 'accept' ? 'accepted' : 'declined'
    return (
      <div className="mt-3 space-y-2">
        <textarea
          value={responseMessage}
          onChange={(e) => setResponseMessage(e.target.value)}
          rows={2}
          placeholder={`Optional note to the band…`}
          className="w-full bg-[#F5F5F5] border border-[#E8E8E8] rounded-lg px-3 py-2 text-sm placeholder-[#AAAAAA] focus:outline-none focus:border-[#FD6A2F] transition-colors resize-none"
        />
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleRespond(action)}
            disabled={loading}
            className={`text-xs font-semibold rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50 ${
              pending === 'accept'
                ? 'bg-[#FD6A2F] text-white hover:bg-[#E55A22]'
                : 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20'
            }`}
          >
            {loading
              ? pending === 'accept' ? 'Accepting…' : 'Declining…'
              : pending === 'accept' ? 'Confirm accept' : 'Confirm decline'}
          </button>
          <button
            onClick={() => { setPending(null); setResponseMessage('') }}
            disabled={loading}
            className="text-xs text-[#888888] hover:text-[#252525] transition-colors"
          >
            Back
          </button>
          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 mt-3">
      <button
        onClick={() => setPending('accept')}
        className="text-xs font-semibold bg-[#FD6A2F] text-white rounded-lg px-3 py-1.5 hover:bg-[#E55A22] transition-colors"
      >
        Accept
      </button>
      <button
        onClick={() => setPending('decline')}
        className="text-xs font-medium bg-[#F5F5F5] border border-[#E8E8E8] text-[#888888] rounded-lg px-3 py-1.5 hover:border-[#CCCCCC] hover:text-[#252525] transition-colors"
      >
        Decline
      </button>
    </div>
  )
}
