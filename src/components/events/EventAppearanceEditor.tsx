'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, PencilLine, X } from 'lucide-react'
import { createEvent, updateEventAppearance, type EventStudioDetails } from '@/app/actions/events'
import { createEventPageSections, eventFrameStyle, EventPageHero, type EventOverviewData } from '@/components/events/EventOverview'
import { EVENT_PAGE_SECTIONS, type EventPageSectionId } from '@/components/events/event-page-config'
import { ProfileAccentField, ProfileImageField } from '@/components/profile-page/ProfileAppearanceFields'
import { ProfilePageBlockActions } from '@/components/profile-page/ProfilePageBlockActions'
import { ProfilePageLayoutEditor } from '@/components/profile-page/ProfilePageLayoutEditor'
import { ProfilePagePaneEditor } from '@/components/profile-page/ProfilePagePaneEditor'
import type { ProfilePageLayout } from '@/components/profile-page/profile-page-types'
import { inputClass, labelClass } from '@/components/ui/primitives'
import { formatEventDateLong } from '@/lib/events'
import { createClient } from '@/lib/supabase/client'
import type { Genre } from '@/types/database'
import './event-studio.css'

type ImageEdit = { path: string | null; url: string | null; file?: File }

type EventDraft = {
  title: string
  description: string
  accent: string | null
  backgroundColor: string
  backgroundOpacity: number
  published: boolean
  header: ImageEdit
  background: ImageEdit
}

const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const EDITABLE_SECTION_IDS = EVENT_PAGE_SECTIONS.map(({ sectionId }) => sectionId).filter((id) => id !== 'lineup')
type PaneEdit = { sectionId: EventPageSectionId; draft: EventDraft; details: EventStudioDetails }

export function EventAppearanceEditor({
  eventId, eventHref, venueId, event, layout, coverPath = null, backgroundPath = null, backgroundUrl = null,
  backgroundColor, backgroundOpacity, inheritedAccent, accentOverride = null, isPublic = false,
  initialDetails, availableGenres, existingEvents = [],
}: {
  eventId?: string
  eventHref: string
  venueId: string
  event: EventOverviewData
  layout: ProfilePageLayout<EventPageSectionId>
  coverPath?: string | null
  backgroundPath?: string | null
  backgroundUrl?: string | null
  backgroundColor: string
  backgroundOpacity: number
  inheritedAccent: string
  accentOverride?: string | null
  isPublic?: boolean
  initialDetails: EventStudioDetails
  availableGenres: Pick<Genre, 'id' | 'name'>[]
  existingEvents?: { event_date: string; title: string }[]
}) {
  const router = useRouter()
  const [draft, setDraft] = useState<EventDraft>(() => ({
    title: event.title,
    description: event.description,
    accent: accentOverride,
    backgroundColor,
    backgroundOpacity,
    published: isPublic,
    header: { path: coverPath, url: event.cover },
    background: { path: backgroundPath, url: backgroundUrl },
  }))
  const [saved, setSaved] = useState(draft)
  const [details, setDetails] = useState(initialDetails)
  const [savedDetails, setSavedDetails] = useState(initialDetails)
  const [paneEdit, setPaneEdit] = useState<PaneEdit | null>(null)
  const [appearanceOpen, setAppearanceOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const paneEditorRef = useRef<HTMLDivElement>(null)
  const createdDraft = useRef<{ id: string; slug: string; details: EventStudioDetails } | null>(null)
  const uploadedPaths = useRef(new WeakMap<File, string>())
  const paneId = paneEdit?.sectionId
  const paneDirty = paneEdit !== null && (paneEdit.draft !== draft || paneEdit.details !== details)
  const externalDirty = draft.title !== saved.title || draft.description !== saved.description ||
    draft.accent !== saved.accent || draft.backgroundColor !== saved.backgroundColor ||
    draft.backgroundOpacity !== saved.backgroundOpacity || draft.published !== saved.published ||
    draft.header !== saved.header || draft.background !== saved.background || details !== savedDetails || paneDirty

  const headerUrl = draft.header.url
  const wallpaperUrl = draft.background.url
  useEffect(() => () => { if (headerUrl?.startsWith('blob:')) URL.revokeObjectURL(headerUrl) }, [headerUrl])
  useEffect(() => () => { if (wallpaperUrl?.startsWith('blob:')) URL.revokeObjectURL(wallpaperUrl) }, [wallpaperUrl])
  useEffect(() => {
    const editor = paneEditorRef.current
    if (!paneId || !editor) return
    editor.scrollIntoView({ block: 'nearest' })
    const field = editor.querySelector<HTMLElement>('input, textarea, button[aria-pressed]') ?? editor
    field.focus({ preventScroll: true })
  }, [paneId])

  function update(updates: Partial<EventDraft>) {
    setDraft((current) => ({ ...current, ...updates }))
  }

  function openPane(sectionId: EventPageSectionId) {
    if (saving || sectionId === paneId || (paneDirty && !window.confirm('Discard changes?'))) return
    setAppearanceOpen(false)
    setPaneEdit({ sectionId, draft, details })
  }

  function updatePaneDraft(updates: Partial<EventDraft>) {
    setPaneEdit((current) => current && { ...current, draft: { ...current.draft, ...updates } })
  }

  function updatePaneDetails(updates: Partial<EventStudioDetails>) {
    setPaneEdit((current) => current && { ...current, details: { ...current.details, ...updates } })
  }

  function closePane() {
    if (paneDirty && !window.confirm('Discard changes?')) return
    setPaneEdit(null)
  }

  function acceptPane() {
    if (!paneEdit) return
    setDraft(paneEdit.draft)
    setDetails(paneEdit.details)
    setPaneEdit(null)
  }

  async function upload(image: ImageEdit, id: string) {
    if (!image.file) return image.path
    const uploadedPath = uploadedPaths.current.get(image.file)
    if (uploadedPath) return uploadedPath

    const path = id + '/' + crypto.randomUUID() + '.jpg'
    const { error } = await createClient().storage.from('event-covers').upload(path, image.file, {
      contentType: 'image/jpeg',
    })
    if (error) throw error
    uploadedPaths.current.set(image.file, path)
    return path
  }

  function validate() {
    if (!draft.title.trim() || !details.eventDate || !details.startTime) {
      openPane('details')
      return 'Enter an event title, date, and start time.'
    }
    if (!draft.description.trim()) {
      openPane('description')
      return 'Enter an event description.'
    }
    if (!eventId && details.genreIds.length === 0) {
      openPane('genres')
      return 'Choose at least one event genre.'
    }
    if (!eventId && !details.artistNeedDescription.trim()) {
      openPane('artist-call')
      return 'Describe the artists needed for this event.'
    }
    if (!Number.isInteger(details.attendeeCapacity) || details.attendeeCapacity < 1 ||
        !Number.isInteger(details.neededArtistCount) || details.neededArtistCount < 1) {
      openPane('capacity')
      return 'Attendee capacity and artist cap must be at least 1.'
    }
    if ([draft.header, draft.background].some((image) => (image.file?.size ?? 0) > MAX_IMAGE_BYTES)) {
      setAppearanceOpen(true)
      return 'Choose images under 5 MB each.'
    }
    return null
  }

  async function save(pageLayout: ProfilePageLayout<EventPageSectionId>) {
    const error = validate()
    if (error) return { error }

    setSaving(true)
    try {
      let id = eventId ?? createdDraft.current?.id
      if (!id) {
        const result = await createEvent({ ...details, venueId, title: draft.title, description: draft.description })
        if (!result.eventId || !result.eventSlug || result.error) {
          setAppearanceOpen(false)
          setPaneEdit({ sectionId: 'details', draft, details })
          return { error: result.error ?? 'Could not create your event draft.' }
        }
        id = result.eventId
        createdDraft.current = { id, slug: result.eventSlug, details }
      }

      const [header, background] = await Promise.allSettled([upload(draft.header, id), upload(draft.background, id)])
      if (header.status === 'rejected' || background.status === 'rejected') {
        setAppearanceOpen(true)
        return { error: eventId ? 'Could not upload your event images. Try again.' : 'Your event draft is private. Save again to retry the image upload.' }
      }

      const persistedDetails = createdDraft.current?.details ?? savedDetails
      const result = await updateEventAppearance({
        eventId: id,
        title: draft.title,
        description: draft.description,
        accent: draft.accent,
        coverPath: header.value,
        backgroundPath: background.value,
        backgroundColor: draft.backgroundColor,
        backgroundOpacity: draft.backgroundOpacity,
        pageLayout,
        isPublic: draft.published,
        details: details !== persistedDetails ? {
          eventDate: details.eventDate === persistedDetails.eventDate ? undefined : details.eventDate,
          startTime: details.startTime === persistedDetails.startTime ? undefined : details.startTime,
          attendeeCapacity: details.attendeeCapacity === persistedDetails.attendeeCapacity ? undefined : details.attendeeCapacity,
          neededArtistCount: details.neededArtistCount === persistedDetails.neededArtistCount ? undefined : details.neededArtistCount,
          artistNeedDescription: details.artistNeedDescription === persistedDetails.artistNeedDescription ? undefined : details.artistNeedDescription,
          genreIds: details.genreIds === persistedDetails.genreIds ? undefined : details.genreIds,
        } : undefined,
      })
      if (!result.error) {
        setSaved(draft)
        setSavedDetails(details)
        if (createdDraft.current) router.replace('/events/' + encodeURIComponent(createdDraft.current.slug) + '?edit=1')
      }
      return result
    } finally {
      setSaving(false)
    }
  }

  const accent = draft.accent ?? inheritedAccent
  const previewEvent = {
    ...event,
    title: draft.title.trim() || 'Untitled event',
    description: draft.description,
    date: details.eventDate && details.startTime
      ? formatEventDateLong({ event_date: details.eventDate, start_time: details.startTime })
      : '',
    capacity: details.attendeeCapacity,
    artistNeed: eventId && event.artistNeed === null ? null : details.artistNeedDescription,
    genres: availableGenres.filter((genre) => details.genreIds.includes(genre.id)).map((genre) => genre.name),
    accent,
    cover: headerUrl,
  }
  const paneLabel = EVENT_PAGE_SECTIONS.find(({ sectionId }) => sectionId === paneId)?.label
  const overlappingEvents = existingEvents.filter((existing) => existing.event_date === paneEdit?.details.eventDate)
  const paneEditor = paneEdit && (
    <ProfilePagePaneEditor
      ref={paneEditorRef}
      className="scroll-mt-24"
      aria-label={paneLabel}
      onKeyDown={(event) => {
        if (event.key !== 'Escape' || event.defaultPrevented) return
        event.preventDefault()
        closePane()
      }}
    >
      <fieldset className="min-w-0 space-y-5 p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#A24A22]">Page content</p>
            <h2 className="mt-2 text-xl font-semibold text-[#252525]">{paneLabel}</h2>
          </div>
          <button type="button" onClick={closePane} aria-label="Cancel editing" className="grid size-10 shrink-0 place-items-center rounded-lg hover:bg-black/5">
            <X className="size-4" />
          </button>
        </div>
        {paneId === 'details' && (
          <>
            <label className="block">
              <span className={labelClass}>Event title</span>
              <input value={paneEdit.draft.title} onChange={(event) => updatePaneDraft({ title: event.target.value })} className={inputClass} />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className={labelClass}>Event date</span>
                <input type="date" value={paneEdit.details.eventDate} onChange={(event) => updatePaneDetails({ eventDate: event.target.value })} className={inputClass} />
              </label>
              <label className="block">
                <span className={labelClass}>Show start time</span>
                <input type="time" value={paneEdit.details.startTime.slice(0, 5)} onChange={(event) => updatePaneDetails({ startTime: event.target.value })} className={inputClass} />
              </label>
            </div>
            {overlappingEvents.length > 0 && (
              <p className="text-sm text-[#666666]">Already on the calendar that day. {overlappingEvents.map(({ title }) => title).join(', ')}</p>
            )}
            {eventId ? (
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-[#252525]">
                  <input type="checkbox" checked={paneEdit.draft.published} onChange={(event) => updatePaneDraft({ published: event.target.checked })} />
                  Publish event page
                </label>
                <p className="mt-2 text-sm text-[#666666]">Saving with this checked lets anyone open the event link.</p>
              </div>
            ) : (
              <div className="space-y-2 text-sm text-[#666666]">
                <p>Your first save creates a private draft and its Backstage.</p>
                <Link href={'/dashboard/calendar?profile=venue:' + venueId} className="font-semibold text-[#A84216] hover:underline">
                  Create an event series in Calendar
                </Link>
              </div>
            )}
          </>
        )}
        {paneId === 'description' && (
          <label className="block">
            <span className={labelClass}>Event description</span>
            <textarea value={paneEdit.draft.description} onChange={(event) => updatePaneDraft({ description: event.target.value })} rows={5} className={inputClass + ' resize-y'} />
          </label>
        )}
        {paneId === 'artist-call' && (
          <label className="block">
            <span className={labelClass}>Artists needed</span>
            <textarea value={paneEdit.details.artistNeedDescription} onChange={(event) => updatePaneDetails({ artistNeedDescription: event.target.value })} rows={5} className={inputClass + ' resize-y'} />
          </label>
        )}
        {paneId === 'capacity' && (
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className={labelClass}>Attendee capacity</span>
              <input type="number" min={1} value={paneEdit.details.attendeeCapacity || ''} onChange={(event) => updatePaneDetails({ attendeeCapacity: Number(event.target.value) })} className={inputClass} />
            </label>
            <label className="block">
              <span className={labelClass}>Artist cap</span>
              <input type="number" min={1} value={paneEdit.details.neededArtistCount || ''} onChange={(event) => updatePaneDetails({ neededArtistCount: Number(event.target.value) })} className={inputClass} />
            </label>
          </div>
        )}
        {paneId === 'genres' && (
          <div className="flex flex-wrap gap-2">
            {availableGenres.map((genre) => {
              const ids = paneEdit.details.genreIds
              const selected = ids.includes(genre.id)
              return (
                <button key={genre.id} type="button" aria-pressed={selected}
                  onClick={() => updatePaneDetails({ genreIds: selected ? ids.filter((id) => id !== genre.id) : [...ids, genre.id] })}
                  className="min-h-9 rounded-full border border-[#E8E8E8] px-3 text-xs font-semibold text-[#444444] aria-pressed:border-[#252525] aria-pressed:bg-[#252525] aria-pressed:text-white">
                  {genre.name}
                </button>
              )
            })}
          </div>
        )}
      </fieldset>
      <div className="sticky bottom-0 flex gap-2 border-t border-[#EAE3DD] bg-white px-5 py-4 sm:px-6">
        <button type="button" onClick={() => setPaneEdit(null)} className="min-h-10 flex-1 rounded-xl border border-[#DCD3CC] text-xs font-semibold text-[#655B54]">Discard</button>
        <button type="button" onClick={acceptPane} className="min-h-10 flex-1 rounded-xl bg-[#252525] text-xs font-semibold text-white hover:bg-black">OK</button>
      </div>
    </ProfilePagePaneEditor>
  )

  const appearanceInspector = (
    <fieldset disabled={saving} className="min-w-0 space-y-6 p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-[#252525]">Event appearance</h2>
        <button type="button" onClick={() => setAppearanceOpen(false)} aria-label="Close editor panel" className="grid size-10 place-items-center rounded-lg hover:bg-black/5">
          <X className="size-4" />
        </button>
      </div>
      <ProfileImageField
        label="Header image"
        description="Put the show artwork or a photo at the top of the page."
        value={headerUrl}
        previewUrl={null}
        removed={false}
        aspect={3}
        aspectClass="aspect-[3/1]"
        onChange={(file, url) => update({ header: { file, url, path: null } })}
        onRemove={() => update({ header: { url: null, path: null } })}
      />
      <ProfileImageField
        label="Background image"
        description="This image sits behind the event panes."
        value={wallpaperUrl}
        previewUrl={null}
        removed={false}
        aspect={2}
        aspectClass="aspect-[2/1]"
        onChange={(file, url) => update({ background: { file, url, path: null } })}
        onRemove={() => update({ background: { url: null, path: null } })}
      />
      {wallpaperUrl && (
        <label className="block text-sm font-semibold text-[#444444]">
          Background image visibility {draft.backgroundOpacity}%
          <input
            type="range"
            min="0"
            max="100"
            value={draft.backgroundOpacity}
            onChange={(event) => update({ backgroundOpacity: Number(event.target.value) })}
            className="mt-3 w-full"
          />
        </label>
      )}
      <div>
        <ProfileAccentField value={accent} onChange={(value) => update({ accent: value })} />
        {draft.accent && (
          <button type="button" onClick={() => update({ accent: null })} className="mt-1 text-sm font-semibold text-[#A84216]">
            Use venue color
          </button>
        )}
      </div>
      <ProfileAccentField label="Background color" value={draft.backgroundColor} onChange={(value) => update({ backgroundColor: value })} />
    </fieldset>
  )
  const sections = createEventPageSections(previewEvent, true)

  return (
    <ProfilePageLayoutEditor
      fullScreen
      initialLayout={layout}
      definitions={EVENT_PAGE_SECTIONS}
      sections={sections.map((section) => section.sectionId === paneId ? {
        ...section,
        content: <div className="relative h-full">{section.content}{paneEditor}</div>,
      } : section)}
      hero={(currentLayout) => {
        const hidden = (id: EventPageSectionId) => !currentLayout.sections.some(({ sectionId, visible }) => sectionId === id && visible)
        const hiddenDetails = hidden('details')
        const hiddenGenres = hidden('genres')
        const hiddenPane = paneId && hidden(paneId) ? sections.find(({ sectionId }) => sectionId === paneId) : undefined
        return (
          <>
            <EventPageHero event={previewEvent} layout={currentLayout} actions={(hiddenDetails || hiddenGenres) && (
              <ProfilePageBlockActions label={previewEvent.title}>
                {hiddenDetails && (
                  <button type="button" onClick={() => openPane('details')} className="flex min-h-9 items-center gap-2 rounded-lg px-3 text-xs font-semibold text-[#756B63] hover:bg-black/5">
                    <PencilLine className="h-3 w-3" /> Edit event details
                  </button>
                )}
                {hiddenGenres && (
                  <button type="button" onClick={() => openPane('genres')} className="flex min-h-9 items-center gap-2 rounded-lg px-3 text-xs font-semibold text-[#756B63] hover:bg-black/5">
                    <PencilLine className="h-3 w-3" /> Edit genres
                  </button>
                )}
              </ProfilePageBlockActions>
            )} />
            {hiddenPane && (
              <div className="mx-auto mt-6 max-w-7xl px-6 lg:px-8">
                <div className="relative">{hiddenPane.content}{paneEditor}</div>
              </div>
            )}
          </>
        )
      }}
      style={eventFrameStyle(draft.backgroundColor, wallpaperUrl, draft.backgroundOpacity)}
      exitHref={eventHref}
      exitLabel="Exit event studio"
      editDetailsHref={eventHref}
      saveAction={save}
      saveDisabled={paneEdit !== null}
      externalDirty={externalDirty}
      inspector={appearanceInspector}
      inspectorOpen={appearanceOpen}
      onOpenInspector={() => {
        if (paneDirty && !window.confirm('Discard changes?')) return
        setPaneEdit(null)
        setAppearanceOpen(!appearanceOpen)
      }}
      inspectorLabel="Appearance"
      editableSectionIds={EDITABLE_SECTION_IDS}
      onEditSection={openPane}
      addSectionsLabel="Add pane"
      toolbarActions={eventId && isPublic && (
        <Link href={eventHref} target="_blank" rel="noopener noreferrer" className="flex min-h-10 items-center gap-2 rounded-lg px-3 text-xs font-semibold text-white/70 hover:bg-white/10 hover:text-white">
          <Eye className="size-4" /> View public page
        </Link>
      )}
    />
  )
}
