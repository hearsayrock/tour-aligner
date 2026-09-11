export const PROFILE_PAGE_SPANS = [4, 6, 8, 12] as const

export type ProfilePageSpan = (typeof PROFILE_PAGE_SPANS)[number]

export type ProfilePageHeroConfig = {
  height: 'compact' | 'standard' | 'cinematic'
  alignment: 'left' | 'center'
}

export type ProfilePageLayoutItem<SectionId extends string = string> = {
  sectionId: SectionId
  order: number
  span: ProfilePageSpan
  visible: boolean
  variant: string
}

export type ProfilePageLayout<SectionId extends string = string> = {
  schemaVersion: 1
  hero: ProfilePageHeroConfig
  sections: ProfilePageLayoutItem<SectionId>[]
}

export type ProfilePageSectionDefinition<SectionId extends string = string> = {
  sectionId: SectionId
  label: string
  description: string
  defaultOrder: number
  defaultSpan: ProfilePageSpan
  allowedSpans: readonly ProfilePageSpan[]
  defaultVariant: string
  required?: boolean
}

export type ProfilePageSectionContent<SectionId extends string = string> = {
  sectionId: SectionId
  content: React.ReactNode
}

const DEFAULT_HERO: ProfilePageHeroConfig = {
  height: 'standard',
  alignment: 'left',
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function nearestAllowedSpan(
  value: unknown,
  definition: ProfilePageSectionDefinition<string>
): ProfilePageSpan {
  if (typeof value !== 'number' || !Number.isFinite(value)) return definition.defaultSpan
  return definition.allowedSpans.reduce((nearest, span) => (
    Math.abs(span - value) < Math.abs(nearest - value) ? span : nearest
  ), definition.defaultSpan)
}

export function createDefaultProfilePageLayout<SectionId extends string>(
  definitions: readonly ProfilePageSectionDefinition<SectionId>[]
): ProfilePageLayout<SectionId> {
  return {
    schemaVersion: 1,
    hero: { ...DEFAULT_HERO },
    sections: definitions
      .map((definition) => ({
        sectionId: definition.sectionId,
        order: definition.defaultOrder,
        span: definition.defaultSpan,
        visible: true,
        variant: definition.defaultVariant,
      }))
      .sort((a, b) => a.order - b.order),
  }
}

export function normalizeProfilePageLayout<SectionId extends string>(
  value: unknown,
  definitions: readonly ProfilePageSectionDefinition<SectionId>[]
): ProfilePageLayout<SectionId> {
  const fallback = createDefaultProfilePageLayout(definitions)
  if (!isRecord(value)) return fallback

  const rawHero = isRecord(value.hero) ? value.hero : {}
  const hero: ProfilePageHeroConfig = {
    height: rawHero.height === 'compact' || rawHero.height === 'cinematic' || rawHero.height === 'standard'
      ? rawHero.height
      : fallback.hero.height,
    alignment: rawHero.alignment === 'center' || rawHero.alignment === 'left'
      ? rawHero.alignment
      : fallback.hero.alignment,
  }

  const rawSections = Array.isArray(value.sections) ? value.sections : []
  const rawById = new Map<string, Record<string, unknown>>()
  rawSections.forEach((section) => {
    if (!isRecord(section) || typeof section.sectionId !== 'string' || rawById.has(section.sectionId)) return
    rawById.set(section.sectionId, section)
  })

  const sections = definitions.map((definition) => {
    const raw = rawById.get(definition.sectionId)
    const order = raw && typeof raw.order === 'number' && Number.isFinite(raw.order)
      ? raw.order
      : definition.defaultOrder

    return {
      sectionId: definition.sectionId,
      order,
      span: nearestAllowedSpan(raw?.span, definition),
      visible: definition.required ? true : raw?.visible !== false,
      variant: raw && typeof raw.variant === 'string' && raw.variant.trim()
        ? raw.variant
        : definition.defaultVariant,
    }
  })

  sections.sort((a, b) => a.order - b.order || (
    definitions.findIndex((definition) => definition.sectionId === a.sectionId)
      - definitions.findIndex((definition) => definition.sectionId === b.sectionId)
  ))

  return {
    schemaVersion: 1,
    hero,
    sections: sections.map((section, order) => ({ ...section, order })),
  }
}

export function profilePageLayoutsEqual<SectionId extends string>(
  left: ProfilePageLayout<SectionId>,
  right: ProfilePageLayout<SectionId>
) {
  return JSON.stringify(left) === JSON.stringify(right)
}
