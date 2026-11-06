import type { ProfilePageSectionDefinition } from '@/components/profile-page/profile-page-types'
import { normalizeProfilePageLayout } from '@/components/profile-page/profile-page-types'

export type EventPageSectionId = 'description' | 'capacity' | 'lineup' | 'artist-call'

export const EVENT_PAGE_SECTIONS: readonly ProfilePageSectionDefinition<EventPageSectionId>[] = [
  { sectionId: 'description', label: 'Event description', description: 'What the show is about.', defaultOrder: 0, defaultSpan: 8, allowedSpans: [4, 6, 8, 12], defaultVariant: 'card', required: true },
  { sectionId: 'capacity', label: 'Capacity', description: 'How many people the event can hold.', defaultOrder: 1, defaultSpan: 4, allowedSpans: [4, 6, 8, 12], defaultVariant: 'card' },
  { sectionId: 'lineup', label: 'Lineup', description: 'The artists announced for the show.', defaultOrder: 2, defaultSpan: 8, allowedSpans: [4, 6, 8, 12], defaultVariant: 'card' },
  { sectionId: 'artist-call', label: 'Artists needed', description: 'What the venue is looking for on the bill.', defaultOrder: 3, defaultSpan: 4, allowedSpans: [4, 6, 8, 12], defaultVariant: 'card' },
]

export const DEFAULT_EVENT_BACKGROUND_COLOR = '#F7F4EE'
export const DEFAULT_EVENT_BACKGROUND_OPACITY = 40

export function normalizeEventPageLayout(value: unknown) {
  return normalizeProfilePageLayout(value, EVENT_PAGE_SECTIONS)
}
