import type { CSSProperties, ReactNode } from 'react'
import { ProfilePageCanvas } from '@/components/profile-page/ProfilePageCanvas'
import { saveVenuePageCustomization } from '@/app/actions/venue-page'
import type { Genre, Venue } from '@/types/database'
import { blockSectionId, createBlockDefinition, ProfilePageBlockView, type ProfilePageBlockDraft } from '@/components/profile-page/blocks/profile-page-blocks'
import { VenuePageHero } from '@/components/profile-page/venue/VenuePageHero'
import { createVenuePageSections } from '@/components/profile-page/venue/VenuePageSections'
import { getVenueProfileAppearance, parseVenueProfileTheme, VENUE_PAGE_SECTION_DEFINITIONS } from '@/components/profile-page/venue/venue-page-config'
import { VenuePageVisualEditor } from '@/components/profile-page/venue/VenuePageVisualEditor'

type FrameStyle = CSSProperties & { '--profile-accent': string; '--profile-button-radius': string }
function versioned(url: string | null, version: string) { if (!url) return null; return `${url}${url.includes('?') ? '&' : '?'}v=${encodeURIComponent(version)}` }

export function VenuePageCanvas({ venue, genreNames, selectedGenreIds, availableGenres, blocks, isOwner, isEditing, hasViewer, availabilityContent, privateChatContent, profileManagementContent }: {
  venue: Venue
  genreNames: string[]
  selectedGenreIds: string[]
  availableGenres: Pick<Genre, 'id' | 'name'>[]
  blocks: ProfilePageBlockDraft[]
  isOwner: boolean
  isEditing: boolean
  hasViewer: boolean
  availabilityContent?: ReactNode
  privateChatContent?: ReactNode
  profileManagementContent?: ReactNode
}) {
  const definitions = blocks.map((block, index) => createBlockDefinition(block, VENUE_PAGE_SECTION_DEFINITIONS.length + index))
  const theme = parseVenueProfileTheme(venue.profile_theme, definitions)
  const coverImage = versioned(venue.cover_photo_url, venue.updated_at)
  const profileImage = versioned(venue.profile_photo_url, venue.updated_at)
  const wallpaperImage = versioned(venue.profile_background_url, venue.updated_at)
  const pageBackground = theme.background === 'night' ? '#17151B' : theme.background === 'mist' ? '#EDF7F6' : '#F7F4EE'
  const base = theme.background === 'night' ? '23,21,27' : theme.background === 'mist' ? '237,247,246' : '247,244,238'
  const overlay = 1 - theme.wallpaperOpacity / 100
  const style: FrameStyle = { ...(wallpaperImage ? { backgroundImage: `linear-gradient(rgba(${base},${overlay}), rgba(${base},${overlay})), url("${wallpaperImage}")`, backgroundSize: 'cover', backgroundAttachment: 'fixed' } : { backgroundColor: pageBackground }), '--profile-accent': theme.accent, '--profile-button-radius': theme.buttonStyle === 'pill' ? '9999px' : theme.buttonStyle === 'square' ? '0.375rem' : '1rem' }
  if (isOwner && isEditing) return <VenuePageVisualEditor venue={venue} selectedGenreIds={selectedGenreIds} availableGenres={availableGenres} initialBlocks={blocks} initialTheme={theme} initialCoverImage={coverImage} initialProfileImage={profileImage} initialWallpaperImage={wallpaperImage} exitHref={`/venues/${venue.slug}`} saveAction={saveVenuePageCustomization.bind(null, venue.id)} />
  const sections = [...createVenuePageSections({ venue, isOwner, isEditing, availabilityContent, privateChatContent, profileManagementContent }), ...blocks.map((block) => ({ sectionId: blockSectionId(block.id), content: <ProfilePageBlockView block={block} /> }))]
  return <ProfilePageCanvas layout={theme.layout} hero={<VenuePageHero venue={venue} genreNames={genreNames} isOwner={isOwner} isEditing={isEditing} appearance={getVenueProfileAppearance(theme)} coverImage={coverImage ?? '/concert-hero.jpg'} profileImage={profileImage} />} sections={sections} className={hasViewer ? '' : 'pt-16'} style={style} />
}
