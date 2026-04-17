'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { updatePassword } from '@/app/actions/profile'
import type { Profile } from '@/types/database'

interface AccountSettingsProps {
  profile: Profile
  userId: string
}

// ── Toggle switch ────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200 focus-visible:outline-none ${
        checked ? 'bg-[#FD6A2F]' : 'bg-[#DDDDDD]'
      }`}
    >
      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
        checked ? 'translate-x-[18px]' : 'translate-x-[3px]'
      }`} />
    </button>
  )
}

// ── Section wrapper ──────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white border border-[#E8E8E8] rounded-xl divide-y divide-[#F0F0F0]">
      <div className="px-6 py-4">
        <h2 className="text-xs font-semibold text-[#888888] uppercase tracking-widest">{title}</h2>
      </div>
      {children}
    </section>
  )
}

// ── Setting row ──────────────────────────────────────────────

function SettingRow({ label, description, children }: {
  label: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-6 px-6 py-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-[#252525]">{label}</p>
        {description && <p className="text-xs text-[#888888] mt-0.5">{description}</p>}
      </div>
      {children}
    </div>
  )
}

// ── Saved flash ──────────────────────────────────────────────

function useSavedFlash() {
  const [saved, setSaved] = useState(false)
  function flash() {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }
  return { saved, flash }
}

// ── Main component ───────────────────────────────────────────

export function AccountSettings({ profile, userId }: AccountSettingsProps) {
  const supabase = createClient()

  // Notification state
  const [notifNewInquiry, setNotifNewInquiry] = useState(profile.notif_new_inquiry)
  const [notifResponse, setNotifResponse] = useState(profile.notif_inquiry_response)
  const [notifMarketing, setNotifMarketing] = useState(profile.notif_marketing)
  const notifFlash = useSavedFlash()

  // Communication state
  const [preferredContact, setPreferredContact] = useState<'email' | 'phone'>(profile.preferred_contact)
  const commFlash = useSavedFlash()

  // Password state
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState(false)

  async function saveNotifications(updates: Partial<Pick<Profile, 'notif_new_inquiry' | 'notif_inquiry_response' | 'notif_marketing'>>) {
    await supabase.from('profiles').update(updates).eq('id', userId)
    notifFlash.flash()
  }

  async function savePreferredContact(value: 'email' | 'phone') {
    setPreferredContact(value)
    await supabase.from('profiles').update({ preferred_contact: value }).eq('id', userId)
    commFlash.flash()
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPasswordError(null)
    setPasswordSuccess(false)
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.')
      return
    }
    setPasswordLoading(true)
    const { error } = await updatePassword(newPassword)
    setPasswordLoading(false)
    if (error) {
      setPasswordError(error)
    } else {
      setPasswordSuccess(true)
      setNewPassword('')
      setConfirmPassword('')
    }
  }

  const inputClass = 'w-full bg-[#F5F5F5] border border-[#E8E8E8] rounded-lg px-3 py-2.5 text-sm placeholder-[#AAAAAA] focus:outline-none focus:border-[#FD6A2F] transition-colors'

  return (
    <div className="max-w-xl mx-auto px-6 py-10 space-y-6">
      <h1 className="text-2xl font-bold">Account Settings</h1>

      {/* Notifications */}
      <Section title="Notifications">
        <SettingRow
          label="New contact request"
          description="Get notified when an artist or venue reaches out in your inbox"
        >
          <Toggle
            checked={notifNewInquiry}
            onChange={(v) => { setNotifNewInquiry(v); saveNotifications({ notif_new_inquiry: v }) }}
          />
        </SettingRow>
        <SettingRow
          label="Inbox activity"
          description="Get notified when a request is accepted or a new message arrives"
        >
          <Toggle
            checked={notifResponse}
            onChange={(v) => { setNotifResponse(v); saveNotifications({ notif_inquiry_response: v }) }}
          />
        </SettingRow>
        <SettingRow
          label="Marketing & updates"
          description="Occasional product news and tips from TourAligner"
        >
          <Toggle
            checked={notifMarketing}
            onChange={(v) => { setNotifMarketing(v); saveNotifications({ notif_marketing: v }) }}
          />
        </SettingRow>
        {notifFlash.saved && (
          <div className="px-6 pb-3">
            <p className="text-xs text-[#00bba5]">Saved</p>
          </div>
        )}
      </Section>

      {/* Communication preferences */}
      <Section title="Default Communication">
        <SettingRow
          label="Preferred contact method"
          description="How venues and artists should reach you"
        >
          <div className="flex rounded-lg overflow-hidden border border-[#E8E8E8] shrink-0">
            {(['email', 'phone'] as const).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => savePreferredContact(opt)}
                className={`text-sm px-3 py-1.5 capitalize transition-colors ${
                  preferredContact === opt
                    ? 'bg-[#FD6A2F] text-white font-medium'
                    : 'bg-[#F5F5F5] text-[#777777] hover:text-[#252525]'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </SettingRow>
        {commFlash.saved && (
          <div className="px-6 pb-3">
            <p className="text-xs text-[#00bba5]">Saved</p>
          </div>
        )}
      </Section>

      {/* Billing */}
      <Section title="Billing & Subscription">
        <div className="px-6 py-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-[#252525]">Free plan</p>
            <p className="text-xs text-[#888888] mt-0.5">Billing and paid plans coming soon.</p>
          </div>
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-[#F5F5F5] border border-[#E8E8E8] text-[#888888] shrink-0">
            Free
          </span>
        </div>
      </Section>

      {/* Password */}
      <Section title="Password">
        <form onSubmit={handlePasswordSubmit} className="px-6 py-5 space-y-3">
          <div>
            <label className="block text-sm text-[#777777] mb-1.5">New password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={inputClass}
              placeholder="At least 8 characters"
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="block text-sm text-[#777777] mb-1.5">Confirm new password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={inputClass}
              placeholder="Repeat new password"
              autoComplete="new-password"
            />
          </div>
          {passwordError && (
            <p className="text-xs text-red-400">{passwordError}</p>
          )}
          {passwordSuccess && (
            <p className="text-xs text-[#00bba5]">Password updated successfully.</p>
          )}
          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={passwordLoading || !newPassword}
              className="bg-[#FD6A2F] text-white font-semibold rounded-lg px-5 py-2 text-sm hover:bg-[#E55A22] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {passwordLoading ? 'Updating…' : 'Update password'}
            </button>
          </div>
        </form>
      </Section>
    </div>
  )
}
