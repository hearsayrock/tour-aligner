'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { ImageCropModal } from '@/components/ui/ImageCropModal'
import { updatePassword } from '@/app/actions/profile'
import type { Profile } from '@/types/database'

// ── Types ────────────────────────────────────────────────────

interface AccountPageProps {
  profile: Profile
  email: string
  userId: string
  hasManagedProfile: boolean
  isAdmin: boolean
}

type Tab = 'personal' | 'settings'

// ── Shared input style ───────────────────────────────────────

const inputClass =
  'w-full bg-surface-2 border border-border rounded-lg px-3 py-2.5 text-sm placeholder-sand-light focus:outline-none focus:border-brand transition-colors'

// ── Toggle ───────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200 focus-visible:outline-none ${
        checked ? 'bg-brand' : 'bg-surface-2'
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
    <section className="bg-white border border-border rounded-xl divide-y divide-border">
      <div className="px-6 py-4">
        <h2 className="text-xs font-semibold text-muted uppercase tracking-widest">{title}</h2>
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
        <p className="text-sm font-medium text-ink">{label}</p>
        {description && <p className="text-xs text-muted mt-0.5">{description}</p>}
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
    setTimeout(() => setSaved(false), 2500)
  }
  return { saved, flash }
}

// ── Role options ─────────────────────────────────────────────

const ROLE_OPTIONS: { value: Profile['primary_role']; label: string; desc: string }[] = [
  { value: 'artist', label: 'Artist',       desc: 'I book gigs for my band or project' },
  { value: 'venue',  label: 'Venue',         desc: 'I manage or book a venue' },
  { value: 'both',   label: 'Both',          desc: 'I do both' },
]

// ── Main component ───────────────────────────────────────────

export function AccountPage({ profile, email, userId, hasManagedProfile, isAdmin }: AccountPageProps) {
  const [activeTab, setActiveTab] = useState<Tab>('personal')
  const personalSaveFlash = useSavedFlash()
  const [personalSaving, setPersonalSaving] = useState(false)

  return (
    <div className="workspace-page">
      <div className="workspace-page-header flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <h1>Account</h1>
          <p className="mt-2 max-w-2xl text-sm text-text-secondary sm:text-base">Set up the personal details that travel with you through every artist profile.</p>
        </div>
        <div className="flex w-fit flex-wrap items-center justify-end gap-3">
          {activeTab === 'personal' && (
            <>
              {personalSaveFlash.saved && (
                <span className="text-sm font-medium text-brand-2">Changes saved</span>
              )}
              <button
                type="submit"
                form="personal-info-form"
                disabled={personalSaving}
                className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-on-brand shadow-sm transition-colors hover:bg-brand-dim disabled:cursor-not-allowed disabled:opacity-50"
              >
                {personalSaving ? 'Saving…' : 'Save changes'}
              </button>
            </>
          )}
          <Link
            href={hasManagedProfile ? (isAdmin ? '/dashboard' : '/dashboard/profiles') : '/onboarding'}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-semibold text-ink shadow-sm transition-colors hover:border-border-strong hover:bg-surface"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5" /><path d="m12 19-7-7 7-7" /></svg>
            {hasManagedProfile ? (isAdmin ? 'Back to dashboard' : 'Your Studios') : 'Continue artist setup'}
          </Link>
        </div>
      </div>

      <div className="mb-8 flex gap-1 border-b border-border">
        {([
          { id: 'personal', label: 'Personal Info' },
          { id: 'settings', label: 'Account Settings' },
        ] as { id: Tab; label: string }[]).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors -mb-px border-b-2 ${
              activeTab === tab.id
                ? 'border-brand text-ink'
                : 'border-transparent text-muted hover:text-ink'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'personal' && (
        <PersonalInfoTab
          profile={profile}
          email={email}
          userId={userId}
          isAdmin={isAdmin}
          onSaved={personalSaveFlash.flash}
          onSavingChange={setPersonalSaving}
        />
      )}
      {activeTab === 'settings' && (
        <AccountSettingsTab profile={profile} userId={userId} />
      )}
    </div>
  )
}

// ── Personal Info Tab ────────────────────────────────────────

function PersonalInfoTab({
  profile,
  email,
  userId,
  isAdmin,
  onSaved,
  onSavingChange,
}: Pick<AccountPageProps, 'profile' | 'email' | 'userId' | 'isAdmin'> & {
  onSaved: () => void
  onSavingChange: (saving: boolean) => void
}) {
  const supabase = createClient()
  const [error, setError] = useState<string | null>(null)

  const [fullName, setFullName] = useState(profile.full_name ?? '')
  const [phone, setPhone] = useState(profile.phone ?? '')
  const [role, setRole] = useState<Profile['primary_role']>(profile.primary_role ?? null)
  const [city, setCity] = useState(profile.location_city ?? '')
  const [state, setState] = useState(profile.location_state ?? '')

  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [removeAvatar, setRemoveAvatar] = useState(false)
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const displayAvatar = avatarPreview ?? (removeAvatar ? null : profile.avatar_url)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setCropSrc(URL.createObjectURL(file))
    e.target.value = ''
  }

  function handleCropComplete(file: File, previewUrl: string) {
    setAvatarFile(file)
    setAvatarPreview(previewUrl)
    setRemoveAvatar(false)
    setCropSrc(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSavingChange(true)
    setError(null)

    let avatarUrl = profile.avatar_url

    if (avatarFile) {
      const ext = avatarFile.name.split('.').pop() ?? 'jpg'
      const path = `${userId}/avatar.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, avatarFile, { upsert: true })
      if (uploadError) {
        setError('Photo upload failed. Your other changes were not saved.')
        onSavingChange(false)
        return
      }
      avatarUrl = supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl
    } else if (removeAvatar) {
      avatarUrl = null
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        full_name: fullName.trim() || null,
        avatar_url: avatarUrl,
        phone: phone.trim() || null,
        primary_role: role,
        location_city: city.trim() || null,
        location_state: state.trim() || null,
      })
      .eq('id', userId)

    onSavingChange(false)

    if (updateError) {
      setError(updateError.message)
      return
    }

    setAvatarFile(null)
    onSaved()
  }

  return (
    <>
      {cropSrc && (
        <ImageCropModal
          src={cropSrc}
          aspect={1}
          onComplete={handleCropComplete}
          onCancel={() => setCropSrc(null)}
        />
      )}
      <form id="personal-info-form" onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[minmax(280px,0.75fr)_minmax(0,1.25fr)]">
        {error && (
          <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400 lg:col-span-2">{error}</p>
        )}

        <aside className="relative min-h-[360px] overflow-hidden rounded-3xl bg-cocoa p-7 text-white shadow-[0_20px_50px_rgba(37,37,37,0.16)] sm:p-8">
          <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full border-[26px] border-brand/50" />
          <div className="absolute bottom-12 right-14 h-3 w-3 rounded-full bg-brand" />
          <div className="absolute bottom-20 right-24 h-2 w-2 rounded-full bg-warning-border" />
          <div className="relative flex h-full flex-col">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-warning-border">Account identity</p>
            <div className="mt-7 flex items-center gap-5">
            <div
              className="group relative h-24 w-24 shrink-0 cursor-pointer overflow-hidden rounded-full border-4 border-white/20 bg-white/10"
              onClick={() => fileInputRef.current?.click()}
            >
              {displayAvatar ? (
                <>
                  <Image src={displayAvatar} alt="Profile photo" fill className="object-cover" sizes="96px" unoptimized={!!avatarPreview} />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                  </div>
                </>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-white/55 group-hover:text-warning-border transition-colors">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                  </svg>
                </div>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">{fullName || 'Your account'}</h2>
              <button type="button" onClick={() => fileInputRef.current?.click()}
                className="mt-1 text-sm font-semibold text-warning-border transition-colors hover:text-white">
                {displayAvatar ? 'Change photo' : 'Upload photo'}
              </button>
              {displayAvatar && (
                <button type="button"
                  onClick={() => { setAvatarFile(null); setAvatarPreview(null); setRemoveAvatar(true) }}
                  className="mt-1 block text-xs text-white/50 transition-colors hover:text-red-300">
                  Remove
                </button>
              )}
            </div>
          </div>
            <p className="mt-7 max-w-sm text-sm leading-relaxed text-white/65">A recognizable photo and clear details help collaborators know who&apos;s behind the artist profile.</p>
            <div className="mt-auto rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.13em] text-warning-border">Artist presence</p>
              <p className="mt-1 text-sm font-medium text-white">Keep every profile feeling ready.</p>
              <p className="mt-1 text-xs leading-relaxed text-white/60">Your account details support every artist profile you build and share.</p>
            </div>
          </div>
        </aside>

        <section className="overflow-hidden rounded-3xl border border-border bg-white shadow-[0_16px_40px_rgba(76,61,53,0.06)]">
          <div className="border-b border-border px-6 py-5 sm:px-8">
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-brand-dim">The essentials</p>
            <h2 className="mt-1 text-xl font-bold text-ink">Personal information</h2>
            <p className="mt-1 text-sm text-text-secondary">Keep your contact details current for the people you work with.</p>
          </div>
          <div className="grid gap-5 p-6 sm:grid-cols-2 sm:p-8">
            <div>
              <label className="block text-sm text-text-secondary mb-1.5">Full name</label>
              <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
                className={inputClass} placeholder="Your name" />
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1.5">Email</label>
              <input type="email" value={email} readOnly
                className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2.5 text-sm text-sand-light cursor-not-allowed" />
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1.5">Phone <span className="text-sand-light">(optional)</span></label>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                className={inputClass} placeholder="+1 (555) 000-0000" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-text-secondary mb-1.5">City</label>
                <input type="text" value={city} onChange={(e) => setCity(e.target.value)}
                  className={inputClass} placeholder="Salt Lake City" />
              </div>
              <div>
                <label className="block text-sm text-text-secondary mb-1.5">State</label>
                <input type="text" value={state} onChange={(e) => setState(e.target.value)}
                  className={inputClass} placeholder="UT" maxLength={2} />
              </div>
            </div>
            <div className="sm:col-span-2">
              <div className="mb-2 flex items-baseline justify-between gap-4">
                <label className="block text-sm text-text-secondary">How do you use TourAligner?</label>
                <span className="text-xs text-sand-light">{isAdmin ? 'You can update this anytime' : 'Venue access is coming soon'}</span>
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
            {ROLE_OPTIONS.map((opt) => {
                const isComingSoon = !isAdmin && opt.value !== 'artist'
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setRole(opt.value)}
                    disabled={isComingSoon}
                    className={`relative w-full text-left rounded-xl border px-4 py-3 transition-all ${
                      isComingSoon
                        ? 'cursor-not-allowed border-border bg-surface text-text-subtle'
                        : role === opt.value
                          ? 'border-brand bg-brand/5'
                          : 'border-border hover:border-border-strong'
                    }`}
                  >
                    {isComingSoon && (
                      <span className="absolute right-3 top-3 rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-text-subtle">Coming soon</span>
                    )}
                    <span className={`block text-sm font-medium ${isComingSoon ? 'text-text-subtle' : role === opt.value ? 'text-brand-text' : 'text-ink'}`}>
                      {opt.label}
                    </span>
                    <span className={isComingSoon ? 'text-xs text-sand-light' : 'text-xs text-muted'}>{opt.desc}</span>
                  </button>
                )
            })}
              </div>
            </div>
          </div>
          <p className="border-t border-border bg-surface px-6 py-4 text-xs text-text-subtle sm:px-8">To change your email, contact support.</p>
        </section>
      </form>
    </>
  )
}

// ── Account Settings Tab ─────────────────────────────────────

function AccountSettingsTab({ profile, userId }: { profile: Profile; userId: string }) {
  const supabase = createClient()

  const [notifNewInquiry, setNotifNewInquiry] = useState(profile.notif_new_inquiry)
  const [notifResponse, setNotifResponse] = useState(profile.notif_inquiry_response)
  const [notifMarketing, setNotifMarketing] = useState(profile.notif_marketing)
  const notifFlash = useSavedFlash()

  const [preferredContact, setPreferredContact] = useState<'email' | 'phone'>(profile.preferred_contact)
  const commFlash = useSavedFlash()

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

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-6">
        {/* Notifications */}
      <Section title="Notifications">
        <SettingRow
          label="New contact request"
          description="Get notified when an artist or venue sends a chat request"
        >
          <Toggle
            checked={notifNewInquiry}
            onChange={(v) => { setNotifNewInquiry(v); saveNotifications({ notif_new_inquiry: v }) }}
          />
        </SettingRow>
        <SettingRow
          label="Chat activity"
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
            <p className="text-xs text-brand-2">Saved</p>
          </div>
        )}
      </Section>

      {/* Communication */}
      <Section title="Default Communication">
        <SettingRow
          label="Preferred contact method"
          description="How venues and artists should reach you"
        >
          <div className="flex rounded-lg overflow-hidden border border-border shrink-0">
            {(['email', 'phone'] as const).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => savePreferredContact(opt)}
                className={`text-sm px-3 py-1.5 capitalize transition-colors ${
                  preferredContact === opt
                    ? 'bg-brand text-on-brand font-medium'
                    : 'bg-surface-2 text-text-secondary hover:text-ink'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </SettingRow>
        {commFlash.saved && (
          <div className="px-6 pb-3">
            <p className="text-xs text-brand-2">Saved</p>
          </div>
        )}
      </Section>
      </div>

      <div className="space-y-6">
      {/* Billing */}
      <Section title="Billing & Subscription">
        <div className="px-6 py-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-ink">Free plan</p>
            <p className="text-xs text-muted mt-0.5">Billing and paid plans coming soon.</p>
          </div>
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-surface-2 border border-border text-muted shrink-0">
            Free
          </span>
        </div>
      </Section>

      {/* Password */}
      <Section title="Password">
        <form onSubmit={handlePasswordSubmit} className="px-6 py-5 space-y-3">
          <div>
            <label className="block text-sm text-text-secondary mb-1.5">New password</label>
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
            <label className="block text-sm text-text-secondary mb-1.5">Confirm new password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={inputClass}
              placeholder="Repeat new password"
              autoComplete="new-password"
            />
          </div>
          {passwordError && <p className="text-xs text-red-400">{passwordError}</p>}
          {passwordSuccess && <p className="text-xs text-brand-2">Password updated successfully.</p>}
          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={passwordLoading || !newPassword}
              className="bg-brand text-on-brand font-semibold rounded-lg px-5 py-2 text-sm hover:bg-brand-dim transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {passwordLoading ? 'Updating…' : 'Update password'}
            </button>
          </div>
        </form>
      </Section>
      </div>
    </div>
  )
}
