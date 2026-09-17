export const PROFILE_PAGE_SPANS = [4, 6, 8, 12] as const

export type ProfilePageSpan = (typeof PROFILE_PAGE_SPANS)[number]

export type ProfilePageHeroConfig = {
  height: 'compact' | 'standard' | 'cinematic'
  alignment: 'left' | 'center'
}

export type ProfilePageLayoutItem<SectionId extends string = string> = {
  sectionId: SectionId
  /** Reading and mobile stacking order, independent of desktop placement. */
  order: number
  span: ProfilePageSpan
  visible: boolean
  variant: string
  desktop?: ProfilePagePlacement
}

export type ProfilePagePlacement = {
  /** Optional desktop height; content can grow beyond it. Mobile remains automatic. */
  height?: number
  /** Fractions of canvas width plus one gutter; width includes that gutter. */
  x: number
  width: number
  /** Preferred vertical position in CSS pixels; content collisions reflow below it. */
  y: number
}

export type ProfilePageLayout<SectionId extends string = string> = {
  schemaVersion: 1 | 2
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
    schemaVersion: 2,
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

    const desktop = normalizeProfilePagePlacement(raw?.desktop)
    return {
      sectionId: definition.sectionId,
      order,
      span: nearestAllowedSpan(raw?.span, definition),
      visible: definition.required ? true : raw?.visible !== false,
      variant: raw && typeof raw.variant === 'string' && raw.variant.trim()
        ? raw.variant
        : definition.defaultVariant,
      ...(desktop ? { desktop } : {}),
    }
  })

  sections.sort((a, b) => a.order - b.order || (
    definitions.findIndex((definition) => definition.sectionId === a.sectionId)
      - definitions.findIndex((definition) => definition.sectionId === b.sectionId)
  ))

  return {
    schemaVersion: value.schemaVersion === 2 || sections.some((section) => section.desktop) ? 2 : 1,
    hero,
    sections: sections.map((section, order) => ({ ...section, order })),
  }
}

export function normalizeProfilePagePlacement(value: unknown): ProfilePagePlacement | undefined {
  if (!isRecord(value) || ![value.x, value.y, value.width].every((number) => typeof number === 'number' && Number.isFinite(number))) return
  const width = Math.min(1, Math.max(0.1, value.width as number))
  return {
    x: Math.min(1 - width, Math.max(0, value.x as number)),
    y: Math.min(100000, Math.max(0, value.y as number)),
    width,
    ...(typeof value.height === 'number' && Number.isFinite(value.height) ? { height: Math.min(100000, Math.max(80, value.height)) } : {}),
  }
}

export function profilePageLayoutsEqual<SectionId extends string>(
  left: ProfilePageLayout<SectionId>,
  right: ProfilePageLayout<SectionId>
) {
  return JSON.stringify(left) === JSON.stringify(right)
}
