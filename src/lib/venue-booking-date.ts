import type { VenueBookingDate } from '@/types/database'

export type VenueShowType = NonNullable<VenueBookingDate['show_type']>

export const VENUE_SHOW_TYPE_OPTIONS: Array<{ value: VenueShowType; label: string; description: string }> = [
  { value: 'open_bill', label: 'Open bill', description: 'Still shaping the lineup and open to good fits.' },
  { value: 'touring_package', label: 'Touring package', description: 'Anchored around a routed package or tour stop.' },
  { value: 'local_showcase', label: 'Local showcase', description: 'Built around several local or regional acts.' },
  { value: 'festival', label: 'Festival', description: 'Part of a larger event or multi-stage format.' },
  { value: 'private_event', label: 'Private event', description: 'Closed or invite-only event context.' },
  { value: 'special_event', label: 'Special event', description: 'Anything that needs a little more context than a normal bill.' },
]

export function getVenueShowTypeLabel(showType: VenueBookingDate['show_type']) {
  return VENUE_SHOW_TYPE_OPTIONS.find((option) => option.value === showType)?.label ?? null
}

type GenreSourceBooking = {
  venue_booking_date_id: string
  status: 'confirmed' | 'cancellation_requested' | 'cancelled'
  bands?:
    | {
        band_genres?: Array<{ genres?: Array<{ name: string | null }> | { name: string | null } | null }> | null
      }
    | Array<{
        band_genres?: Array<{ genres?: Array<{ name: string | null }> | { name: string | null } | null }> | null
      } | null>
    | null
}

export function buildVenueDateGenreFocusMap(bookings: GenreSourceBooking[]) {
  const countsByDate = new Map<string, Map<string, number>>()

  for (const booking of bookings) {
    if (booking.status !== 'confirmed' && booking.status !== 'cancellation_requested') continue

    const bandRecord = Array.isArray(booking.bands) ? booking.bands[0] ?? null : booking.bands ?? null
    const uniqueGenres = new Set(
      (bandRecord?.band_genres ?? [])
        .flatMap((entry) => (Array.isArray(entry.genres) ? entry.genres : entry.genres ? [entry.genres] : []))
        .map((genre) => genre.name?.trim() ?? null)
        .filter((value): value is string => !!value)
    )

    if (uniqueGenres.size === 0) continue

    const dateCounts = countsByDate.get(booking.venue_booking_date_id) ?? new Map<string, number>()

    for (const genre of uniqueGenres) {
      dateCounts.set(genre, (dateCounts.get(genre) ?? 0) + 1)
    }

    countsByDate.set(booking.venue_booking_date_id, dateCounts)
  }

  const labelByDate = new Map<string, string>()

  for (const [dateId, counts] of countsByDate) {
    const rankedGenres = [...counts.entries()]
      .sort((a, b) => (b[1] - a[1]) || a[0].localeCompare(b[0]))
      .slice(0, 2)
      .map(([genre]) => genre.toLowerCase())

    if (rankedGenres.length === 1) {
      labelByDate.set(dateId, `${rankedGenres[0]} leaning`)
    } else if (rankedGenres.length >= 2) {
      labelByDate.set(dateId, `${rankedGenres[0]} / ${rankedGenres[1]} leaning`)
    }
  }

  return labelByDate
}

export function getEffectiveVenueDateGenreFocus(
  overrideGenreFocus: string | null | undefined,
  automatedGenreFocus: string | null | undefined
) {
  return overrideGenreFocus?.trim() || automatedGenreFocus || null
}

function normalizeGenreLabel(value: string) {
  return value.trim().toLowerCase()
}

function extractGenreCandidates(label: string | null | undefined) {
  if (!label) return []

  return label
    .toLowerCase()
    .replace(/\s+leaning$/i, '')
    .split(/[\/,]/)
    .map((part) => part.trim())
    .filter(Boolean)
}

export function getGenreOverlapMatches(bandGenres: string[], candidateGenres: string[]) {
  const normalizedBandGenres = bandGenres.map(normalizeGenreLabel)
  const normalizedCandidates = candidateGenres.map(normalizeGenreLabel)

  return normalizedBandGenres.filter((genre) =>
    normalizedCandidates.some(
      (candidate) =>
        genre === candidate || genre.includes(candidate) || candidate.includes(genre)
    )
  )
}

export function extractGenreFocusCandidates(label: string | null | undefined) {
  return extractGenreCandidates(label)
}

export function getVenueDateGenreFit(args: {
  bandGenres: string[]
  effectiveGenreFocus?: string | null
}) {
  const matches = getGenreOverlapMatches(
    args.bandGenres,
    extractGenreCandidates(args.effectiveGenreFocus)
  )

  if (matches.length > 0 && args.effectiveGenreFocus) {
    return {
      tone: 'positive' as const,
      title: 'Genre fit looks promising',
      body: `This date currently leans ${args.effectiveGenreFocus}, and your band overlaps with that lane.`,
    }
  }

  if (args.effectiveGenreFocus) {
    return {
      tone: 'neutral' as const,
      title: 'Current date vibe',
      body: `This date currently leans ${args.effectiveGenreFocus}. If your sound fits that world, call it out in your note.`,
    }
  }

  return null
}
