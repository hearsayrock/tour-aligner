'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { StudioSheet } from './StudioSheet'
import { buttonBaseClass, inputClass } from '@/components/ui/primitives'
import { requestPrivateChat, sendPrivateChatMessage } from '@/app/actions/private-chat'
import { openChatDock } from '@/lib/chat-dock-events'
import { prepareDockChat } from '@/app/actions/chat-dock'
import { setActiveIdentity } from '@/app/actions/profile'
import { identityValue, type ManagedIdentity } from '@/lib/managed-identity'
export type InquiryProps = {
  signedIn: boolean
  profiles: ManagedIdentity[]
  active: string
  open: boolean
  date: string
}
export function StudioInquiry(
  p: InquiryProps & {
    name: string
    id: string
    href: string
    setDate: (d: string) => void
    close: () => void
  }
) {
  const [sender, setSender] = useState(p.active),
    [message, setMessage] = useState(''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false)
  const router = useRouter()
  const dest = p.href + '?inquire=1' + (p.date ? '&date=' + encodeURIComponent(p.date) : '')
  const query = '?redirectTo=' + encodeURIComponent(dest)
  const profile = p.profiles.find((x) => identityValue(x) === sender)
  async function send() {
    if (!profile || !message.trim()) return
    setBusy(true)
    setError('')
    try {
      if (sender !== p.active) {
        const r = await setActiveIdentity(sender)
        if (r.error) throw Error(r.error)
      }
      const body =
        (p.date ? 'Booking inquiry for ' + p.date : 'Booking inquiry') + '\n\n' + message.trim()
      const result = await requestPrivateChat({
        senderKind: profile.kind,
        senderId: profile.id,
        recipientKind: 'band',
        recipientId: p.id,
        message: body,
      })
      if (!result.success || !result.threadId)
        throw Error(result.error || 'Could not send this inquiry.')
      if (result.action === 'existing') {
        const r = await sendPrivateChatMessage(result.threadId, profile.kind, profile.id, body)
        if (!r.success) throw Error(r.error || 'Could not send this message.')
      } else if (result.action === 'incoming_pending') {
        setError('Review the incoming request in Chats before sending.')
        return
      }
      const target = await prepareDockChat(sender, 'band', p.id)
      p.close()
      if (target.data) {
        openChatDock({ scope: sender, ...target.data, threadId: result.threadId })
        router.refresh()
      } else router.push('/dashboard/profiles?chat=' + result.threadId)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send this inquiry.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <StudioSheet title={'Book ' + p.name} close={p.close}>
      <div className="studio-fields">
        <label>
          Requested date (optional)
          <input
            className={inputClass}
            type="date"
            value={p.date}
            onChange={(e) => p.setDate(e.target.value)}
          />
        </label>
        {!p.signedIn ? (
          <>
            <p>Sign in or join TourAligner to send a booking inquiry.</p>
            <Link className={buttonBaseClass()} href={'/login' + query}>
              Sign in
            </Link>
            <Link className={buttonBaseClass('secondary')} href={'/signup' + query}>
              Join TourAligner
            </Link>
          </>
        ) : !p.profiles.length ? (
          <>
            <p>Create an artist profile to send your inquiry.</p>
            <Link className={buttonBaseClass()} href={'/onboarding' + query}>
              Set up artist profile
            </Link>
          </>
        ) : (
          <>
            <label>
              Send as
              <select className={inputClass} value={sender} onChange={(e) => setSender(e.target.value)}>
                <option value="all">Choose a profile</option>
                {p.profiles.map((i) => (
                  <option key={identityValue(i)} value={identityValue(i)}>
                    {i.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Message
              <textarea
                className={inputClass}
                rows={5}
                value={message}
                maxLength={1800}
                onChange={(e) => setMessage(e.target.value)}
              />
            </label>
            <p className="text-sm">The date stays open until a booking is confirmed.</p>
            <button
              className={buttonBaseClass()}
              disabled={!profile || !message.trim() || busy}
              onClick={() => void send()}
            >
              {busy ? 'Sending…' : 'Send inquiry'}
            </button>
          </>
        )}
        {error && <p role="alert">{error}</p>}
      </div>
    </StudioSheet>
  )
}
