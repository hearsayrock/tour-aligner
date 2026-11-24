'use client'

import { useState } from 'react'
import { ArrowUpRight, CalendarPlus, Link2, MessageCircle, Ticket } from 'lucide-react'
import { buttonBaseClass } from '@/components/ui/primitives'
import { urlValue, type Show } from '@/lib/studio/model'
import type { Venue } from '@/types/database'
import { ShowCalendar } from './ShowCalendar'

function downloadShow(show: Show, artist: string) {
  const escape = (text: string) =>
    text
      .replaceAll('\\', '\\\\')
      .replace(/\r\n|\r|\n/g, '\\n')
      .replace(/([,;])/g, '\\$1')
  // A DATE without an end time is a one-day event, including across time zones.
  const contents = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//TourAligner//Shows//EN',
    'BEGIN:VEVENT',
    'UID:' + escape(show.id) + '@touraligner.com',
    'DTSTAMP:' +
      new Date()
        .toISOString()
        .replace(/[-:]/g, '')
        .replace(/\.\d{3}Z$/, 'Z'),
    'DTSTART;VALUE=DATE:' + show.date.replaceAll('-', ''),
    'SUMMARY:' + escape([artist, show.venue].filter(Boolean).join(' at ')),
    'LOCATION:' + escape([show.venue, show.city, show.state].filter(Boolean).join(', ')),
    'END:VEVENT',
    'END:VCALENDAR',
    '',
  ].join('\r\n')
  const url = URL.createObjectURL(new Blob([contents], { type: 'text/calendar;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = show.date + '-' + show.id + '.ics'
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const actionClass = buttonBaseClass('secondary') + ' artist-show-action'
export type ListedShow = Show & { ageRequirement?: Venue['age_requirement'] }
const ageLabels = { all_ages: 'All ages', '18_plus': '18+', '21_plus': '21+' }
const ticker = 'No shows booked ✱ Not even one ✱ The van is resting ✱ Snacks are packed ✱ Ask nicely ✱ '

export function ArtistShows({
  name,
  solo,
  href,
  today,
  upcoming,
  past,
  requestDate,
  message,
}: {
  name: string
  solo: boolean
  href: string
  today: string
  upcoming: ListedShow[]
  past: ListedShow[]
  requestDate?: (date: string) => void
  message?: () => void
}) {
  const [feedback, setFeedback] = useState({ id: '', copied: false })
  async function copyLink(id: string) {
    try {
      await navigator.clipboard.writeText(new URL(href + '#shows', location.origin).href)
      setFeedback({ id, copied: true })
    } catch {
      setFeedback({ id, copied: false })
    }
  }
  function cards(shows: ListedShow[], archived = false) {
    return (
      <ul className="artist-show-list" aria-label={archived ? 'Past shows' : 'Upcoming shows'}>
        {shows.map((s) => {
          const day = new Date(s.date + 'T12:00:00')
          const weekday = day.toLocaleDateString('en-US', { weekday: 'long' })
          const place = [s.city, s.state].filter(Boolean).join(', ')
          const otherYear = s.date.slice(0, 4) !== today.slice(0, 4) ? s.date.slice(0, 4) : ''
          const tickets = urlValue(s.url)
          return (
            <li key={s.id} className="artist-show-card">
              <div className="artist-show-detail">
                <time
                  dateTime={s.date}
                  aria-label={day.toLocaleDateString('en-US', { dateStyle: 'full' })}
                >
                  <small>{day.toLocaleDateString('en-US', { month: 'short' })}</small>
                  <strong>{day.getDate()}</strong>
                </time>
                <div>
                  <h3>{s.venue || 'Venue TBA'}</h3>
                  <p>{[place, weekday, otherYear].filter(Boolean).join(' · ')}</p>
                  {s.ageRequirement && <p>{ageLabels[s.ageRequirement]}</p>}
                </div>
              </div>
              {!archived && (
                <div className="artist-show-actions">
                  {tickets && (
                    <a className={actionClass} href={tickets} target="_blank" rel="noreferrer">
                      <Ticket size={16} /> Tickets
                    </a>
                  )}
                  <button className={actionClass} onClick={() => downloadShow(s, name)}>
                    <CalendarPlus size={16} /> Add to calendar
                  </button>
                  <button className={actionClass} onClick={() => void copyLink(s.id)}>
                    <Link2 size={16} /> Copy link
                  </button>
                  {message && (
                    <button className={actionClass} onClick={message}>
                      <MessageCircle size={16} /> {solo ? 'Message the artist' : 'Message the band'}
                    </button>
                  )}
                  {feedback.id === s.id && (
                    <span role="status">
                      {feedback.copied ? (
                        'Link copied'
                      ) : (
                        <>
                          Select the link to copy it.{' '}
                          <a href={href + '#shows'}>{new URL(href + '#shows', location.origin).href}</a>
                        </>
                      )}
                    </span>
                  )}
                </div>
              )}
            </li>
          )
        })}
      </ul>
    )
  }
  return (
    <div className="artist-shows">
      {upcoming.length ? (
        <>
          <h2>Shows</h2>
          {cards(upcoming)}
        </>
      ) : (
        <>
          <div className="artist-show-poster">
            <h2>
              <span>Nothing </span>
              <span>on the </span>
              <span>calendar.</span>
            </h2>
            <div className="artist-show-sticker" aria-hidden="true">
              <strong>0</strong>
              <span>
                Shows
                <br />
                (allegedly)
              </span>
            </div>
            <p>
              {name} {solo ? 'has' : 'have'} no dates on the books. That’s either a mistake or an
              opportunity, and we know which one we’d pick.
            </p>
          </div>
          <div className="artist-show-ticker" aria-hidden="true">
            {ticker.repeat(8)}
          </div>
          <ShowCalendar today={today} select={requestDate} />
        </>
      )}
      {requestDate && (
        <div className="artist-show-invite">
          <h3>{upcoming.length ? 'Want them in your room?' : name + ' + your venue'}</h3>
          <button className={actionClass} onClick={() => requestDate('')}>
            {upcoming.length ? 'Request a date' : 'Be the venue'} <ArrowUpRight size={16} />
          </button>
        </div>
      )}
      {past.length > 0 && (
        <section className="artist-past-shows">
          <h3>Past shows</h3>
          {cards(past, true)}
        </section>
      )}
    </div>
  )
}
