'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { ImageCropModal } from '@/components/ui/ImageCropModal'
import { ProcessingOverlay } from '@/components/ui/ProcessingOverlay'
import type { Profile } from '@/types/database'

interface ProfileFormProps {
  profile: Profile
  email: string
  userId: string
}

const inputClass =
  'w-full bg-[#F5F5F5] border border-[#E8E8E8] rounded-lg px-3 py-2.5 text-sm placeholder-[#AAAAAA] focus:outline-none focus:border-[#FD6A2F] transition-colors'

const ROLE_OPTIONS: { value: Profile['primary_role']; label: string; desc: string }[] = [
  { value: 'artist', label: 'Artist', desc: 'I book gigs for my band or project' },
  { value: 'venue',  label: 'Venue',  desc: 'I manage or book a venue' },
  { value: 'both',   label: 'Both',   desc: 'I do both' },
]

export function ProfileForm({ profile, email, userId }: ProfileFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
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
    setLoading(true)
    setError(null)

    const supabase = createClient()
    let avatarUrl = profile.avatar_url

    if (avatarFile) {
      const ext = avatarFile.name.split('.').pop() ?? 'jpg'
      const path = `${userId}/avatar.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, avatarFile, { upsert: true })
      if (uploadError) {
        setError('Photo upload failed. Your other changes were not saved.')
        setLoading(false)
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

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    router.push('/dashboard/profile')
    router.refresh()
  }

  return (
    <>
    {loading && <ProcessingOverlay />}
    {cropSrc && (
      <ImageCropModal
        src={cropSrc}
        aspect={1}
        onComplete={handleCropComplete}
        onCancel={() => setCropSrc(null)}
      />
    )}
    <form onSubmit={handleSubmit} className="max-w-xl mx-auto px-6 py-10 space-y-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Edit profile</h1>
        <button
          type="submit"
          disabled={loading}
          className="bg-[#FD6A2F] text-white font-semibold rounded-lg px-5 py-2 text-sm hover:bg-[#E55A22] transition-colors disabled:opacity-50"
        >
          {loading ? 'Saving…' : 'Save changes'}
        </button>
      </div>

      {error && (
        <p className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg px-4 py-3 text-sm">{error}</p>
      )}

      {/* Avatar */}
      <section>
        <p className="text-xs font-semibold text-[#888888] uppercase tracking-widest mb-4">Profile photo</p>
        <div className="flex items-center gap-5">
          <div
            className="relative w-20 h-20 rounded-full overflow-hidden bg-[#F0F0F0] border-2 border-[#E8E8E8] cursor-pointer group shrink-0"
            onClick={() => fileInputRef.current?.click()}
          >
            {displayAvatar ? (
              <>
                <Image src={displayAvatar} alt="Profile photo" fill className="object-cover" sizes="80px" unoptimized={!!avatarPreview} />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                </div>
              </>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-[#CCCCCC] group-hover:text-[#FD6A2F] transition-colors">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                </svg>
              </div>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
              onChange={handleFileChange} />
          </div>
          <div>
            <button type="button" onClick={() => fileInputRef.current?.click()}
              className="text-sm font-medium text-[#FD6A2F] hover:text-[#E55A22] transition-colors">
              {displayAvatar ? 'Change photo' : 'Upload photo'}
            </button>
            {displayAvatar && (
              <button type="button" onClick={() => { setAvatarFile(null); setAvatarPreview(null); setRemoveAvatar(true) }}
                className="block text-xs text-[#AAAAAA] hover:text-red-400 transition-colors mt-1">
                Remove
              </button>
            )}
            <p className="text-xs text-[#AAAAAA] mt-1">JPG, PNG or WebP</p>
          </div>
        </div>
      </section>

      {/* Basic info */}
      <section className="space-y-4">
        <p className="text-xs font-semibold text-[#888888] uppercase tracking-widest">Basic info</p>
        <div>
          <label className="block text-sm text-[#777777] mb-1.5">Full name</label>
          <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
            className={inputClass} placeholder="Your name" />
        </div>
        <div>
          <label className="block text-sm text-[#777777] mb-1.5">Email</label>
          <input type="email" value={email} readOnly
            className="w-full bg-[#F5F5F5] border border-[#E8E8E8] rounded-lg px-3 py-2.5 text-sm text-[#AAAAAA] cursor-not-allowed" />
          <p className="text-xs text-[#AAAAAA] mt-1">Email can be changed in Account Settings.</p>
        </div>
        <div>
          <label className="block text-sm text-[#777777] mb-1.5">Phone <span className="text-[#AAAAAA]">(optional)</span></label>
          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
            className={inputClass} placeholder="+1 (555) 000-0000" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-[#777777] mb-1.5">City</label>
            <input type="text" value={city} onChange={(e) => setCity(e.target.value)}
              className={inputClass} placeholder="Salt Lake City" />
          </div>
          <div>
            <label className="block text-sm text-[#777777] mb-1.5">State</label>
            <input type="text" value={state} onChange={(e) => setState(e.target.value)}
              className={inputClass} placeholder="UT" maxLength={2} />
          </div>
        </div>
      </section>

      {/* Primary role */}
      <section className="space-y-3">
        <p className="text-xs font-semibold text-[#888888] uppercase tracking-widest">Primary role</p>
        <div className="space-y-2">
          {ROLE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setRole(opt.value)}
              className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
                role === opt.value
                  ? 'border-[#FD6A2F] bg-[#FD6A2F]/5'
                  : 'border-[#E8E8E8] hover:border-[#CCCCCC]'
              }`}
            >
              <span className={`text-sm font-medium block ${role === opt.value ? 'text-[#FD6A2F]' : 'text-[#252525]'}`}>
                {opt.label}
              </span>
              <span className="text-xs text-[#888888]">{opt.desc}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Bottom save */}
      {error && (
        <p className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg px-4 py-3 text-sm">{error}</p>
      )}
      <div className="flex justify-end pb-6">
        <button type="submit" disabled={loading}
          className="bg-[#FD6A2F] text-white font-semibold rounded-lg px-6 py-2.5 text-sm hover:bg-[#E55A22] transition-colors disabled:opacity-50">
          {loading ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </form>
    </>
  )
}
