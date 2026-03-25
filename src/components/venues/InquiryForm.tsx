'use client'

import { useState } from 'react'
import type { Band } from '@/types/database'
import { sendInquiry } from '@/app/actions/inquiries'

interface Props {
  venueId: string
  bands: Pick<Band, 'id' | 'name'>[]
}

export function InquiryForm({ venueId, bands }: Props) {
  const [bandId, setBandId] = useState(bands[0]?.id ?? '')
  const [date, setDate] = useState('')
  const [message, setMessage] = useState('')
  const [expectedDraw, setExpectedDraw] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  const today = new Date().toISOString().split('T')[0]

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const result = await sendInquiry({
      venueId,
      bandId,
      requestedDate: date,
      message,
      expectedDraw: expectedDraw ? parseInt(expectedDraw, 10) : null,
    })

    if (result.error) {
      setError(result.error)
      setLoading(false)
      return
    }

    setSent(true)
    setLoading(false)
  }

  if (sent) {
    return (
      <div className="bg-[#FFFFFF] border border-[#E8E8E8] rounded-xl p-6 text-center">
        <p className="font-semibold text-[#00bba5] mb-1">Inquiry sent!</p>
        <p className="text-sm text-[#888888]">
          Track it from your{' '}
          <a href="/dashboard/inquiries" className="text-[#252525] hover:underline">
            inquiries dashboard
          </a>
          .
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {bands.length > 1 && (
        <div>
          <label className="block text-sm text-[#888888] mb-1.5">Booking as</label>
          <select
            value={bandId}
            onChange={(e) => setBandId(e.target.value)}
            className="w-full bg-[#F5F5F5] border border-[#E8E8E8] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#FD6A2F] transition-colors"
          >
            {bands.map((band) => (
              <option key={band.id} value={band.id}>
                {band.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="block text-sm text-[#888888] mb-1.5">Requested date</label>
        <input
          type="date"
          value={date}
          min={today}
          onChange={(e) => setDate(e.target.value)}
          required
          className="w-full bg-[#F5F5F5] border border-[#E8E8E8] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#FD6A2F] transition-colors"
        />
      </div>

      <div>
        <label className="block text-sm text-[#888888] mb-1.5">Message</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
          rows={4}
          placeholder="Tell the venue about your band, your draw, and what you're looking for..."
          className="w-full bg-[#F5F5F5] border border-[#E8E8E8] rounded-lg px-3 py-2.5 text-sm placeholder-[#AAAAAA] focus:outline-none focus:border-[#FD6A2F] transition-colors resize-none"
        />
      </div>

      <div>
        <label className="block text-sm text-[#888888] mb-1.5">
          Expected draw{' '}
          <span className="text-[#CCCCCC]">(optional)</span>
        </label>
        <input
          type="number"
          min="0"
          value={expectedDraw}
          onChange={(e) => setExpectedDraw(e.target.value)}
          placeholder="Estimated attendance"
          className="w-full bg-[#F5F5F5] border border-[#E8E8E8] rounded-lg px-3 py-2.5 text-sm placeholder-[#AAAAAA] focus:outline-none focus:border-[#FD6A2F] transition-colors"
        />
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-[#FD6A2F] text-white font-semibold rounded-lg py-2.5 text-sm hover:bg-[#E55A22] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Sending…' : 'Send inquiry'}
      </button>
    </form>
  )
}
