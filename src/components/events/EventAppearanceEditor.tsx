'use client'

import { useEffect, useRef, useState } from 'react'
import { Type, X } from 'lucide-react'
import { updateEventAppearance } from '@/app/actions/events'
import { createEventPageSections, eventFrameStyle, EventPageHero, type EventOverviewData } from '@/components/events/EventOverview'
import { EVENT_PAGE_SECTIONS, type EventPageSectionId } from '@/components/events/event-page-config'
import { ProfileAccentField, ProfileImageField } from '@/components/profile-page/ProfileAppearanceFields'
import { ProfilePageLayoutEditor } from '@/components/profile-page/ProfilePageLayoutEditor'
import type { ProfilePageLayout } from '@/components/profile-page/profile-page-types'
import { inputClass, labelClass } from '@/components/ui/primitives'
import { createClient } from '@/lib/supabase/client'

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

export function EventAppearanceEditor({
  eventId, eventHref, event, layout, coverPath, backgroundPath, backgroundUrl, backgroundColor,
  backgroundOpacity, inheritedAccent, accentOverride, isPublic,
}: {
  eventId: string
  eventHref: string
  event: EventOverviewData
  layout: ProfilePageLayout<EventPageSectionId>
  coverPath: string | null
  backgroundPath: string | null
  backgroundUrl: string | null
  backgroundColor: string
  backgroundOpacity: number
  inheritedAccent: string
  accentOverride: string | null
  isPublic: boolean
}) {
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
  const [panel, setPanel] = useState<'appearance' | 'content' | null>(null)
  const uploadedPaths = useRef(new WeakMap<File, string>())
  const externalDirty = draft.title !== saved.title || draft.description !== saved.description ||
    draft.accent !== saved.accent || draft.backgroundColor !== saved.backgroundColor ||
    draft.backgroundOpacity !== saved.backgroundOpacity || draft.published !== saved.published ||
    draft.header !== saved.header || draft.background !== saved.background

  const headerUrl = draft.header.url
  const wallpaperUrl = draft.background.url
  useEffect(() => () => { if (headerUrl?.startsWith('blob:')) URL.revokeObjectURL(headerUrl) }, [headerUrl])
  useEffect(() => () => { if (wallpaperUrl?.startsWith('blob:')) URL.revokeObjectURL(wallpaperUrl) }, [wallpaperUrl])

  function update(updates: Partial<EventDraft>) {
    setDraft((current) => ({ ...current, ...updates }))
  }

  async function upload(image: ImageEdit) {
    if (!image.file) return image.path
    const uploadedPath = uploadedPaths.current.get(image.file)
    if (uploadedPath) return uploadedPath

    const path = eventId + '/' + crypto.randomUUID() + '.jpg'
    const { error } = await createClient().storage.from('event-covers').upload(path, image.file, {
      contentType: 'image/jpeg',
    })
    if (error) throw error
    uploadedPaths.current.set(image.file, path)
    return path
  }

  async function save(pageLayout: ProfilePageLayout<EventPageSectionId>) {
    if (!draft.title.trim() || !draft.description.trim()) return { error: 'Enter a title and event description.' }
    if ([draft.header, draft.background].some((image) => (image.file?.size ?? 0) > MAX_IMAGE_BYTES)) {
      return { error: 'Choose images under 5 MB each.' }
    }

    let coverPath: string | null
    let backgroundPath: string | null
    try {
      [coverPath, backgroundPath] = await Promise.all([upload(draft.header), upload(draft.background)])
    } catch {
      return { error: 'Could not upload your event images. Try again.' }
    }

    const result = await updateEventAppearance({
      eventId,
      title: draft.title,
      description: draft.description,
      accent: draft.accent,
      coverPath,
      backgroundPath,
      backgroundColor: draft.backgroundColor,
      backgroundOpacity: draft.backgroundOpacity,
      pageLayout,
      isPublic: draft.published,
    })
    if (!result.error) setSaved(draft)
    return result
  }

  const accent = draft.accent ?? inheritedAccent
  const previewEvent = { ...event, title: draft.title, description: draft.description, accent, cover: headerUrl }
  const inspector = (
    <div className="space-y-6 p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-[#252525]">{panel === 'content' ? 'Event content' : 'Event appearance'}</h2>
        <button type="button" onClick={() => setPanel(null)} aria-label="Close editor panel" className="grid size-10 place-items-center rounded-lg hover:bg-black/5">
          <X className="size-4" />
        </button>
      </div>
      {panel === 'content' ? (
        <>
          <label className="block">
            <span className={labelClass}>Title</span>
            <input value={draft.title} onChange={(event) => update({ title: event.target.value })} className={inputClass} />
          </label>
          <label className="block">
            <span className={labelClass}>Event description</span>
            <textarea value={draft.description} onChange={(event) => update({ description: event.target.value })} rows={5} className={inputClass + ' resize-y'} />
          </label>
          <label className="flex items-center gap-2 text-sm font-semibold text-[#252525]">
            <input type="checkbox" checked={draft.published} onChange={(event) => update({ published: event.target.checked })} />
            Publish event page
          </label>
          <p className="text-sm text-[#666666]">Saving with this checked lets anyone open the event link.</p>
        </>
      ) : (
        <>
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
        </>
      )}
    </div>
  )

  return (
    <ProfilePageLayoutEditor
      initialLayout={layout}
      definitions={EVENT_PAGE_SECTIONS}
      sections={createEventPageSections(previewEvent, true)}
      hero={<EventPageHero event={previewEvent} />}
      style={eventFrameStyle(draft.backgroundColor, wallpaperUrl, draft.backgroundOpacity)}
      exitHref={eventHref}
      exitLabel="Exit event studio"
      editDetailsHref={eventHref}
      saveAction={save}
      externalDirty={externalDirty}
      inspector={inspector}
      inspectorOpen={panel !== null}
      onOpenInspector={() => setPanel(panel === 'appearance' ? null : 'appearance')}
      inspectorLabel="Appearance"
      editableSectionIds={['description']}
      onEditSection={() => setPanel('content')}
      toolbarActions={(
        <button
          type="button"
          onClick={() => setPanel(panel === 'content' ? null : 'content')}
          className="flex min-h-10 items-center gap-2 rounded-lg px-3 text-xs font-semibold text-white/70 hover:bg-white/10 hover:text-white"
        >
          <Type className="size-4" />Content
        </button>
      )}
    />
  )
}
