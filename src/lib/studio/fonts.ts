/**
 * FLUTTER HANDOFF: artist font catalogue
 * Flutter equivalent: lib/domain/artist_profile/artist_fonts.dart (+ the google_fonts package for loading)
 *
 * The fonts an artist can pick for their page. A curated list of free Google Fonts, not the whole catalogue, so every
 * choice is fast, legible and fits the hero. Artist fonts are DATA (like artist colours): they only style the artist's
 * own content (the band name, page headings and body copy). TourAligner's own pieces (buttons, tab pills, the logo)
 * keep the design system's fonts.
 *
 * Each entry carries a few typesetting facts so any font behaves on the page:
 *  - weight:    the weight to use for headings (single-weight display faces use 400, never a faked bold)
 *  - uppercase: whether headings default to all caps (blackletter and script read badly in caps)
 *  - leading:   line height for big display text (tall or spiky faces need more room than Barlow's 0.84)
 *  - width:     how wide the face runs compared with Barlow Condensed, so the band name can still fill the hero
 */
export type ArtistFonts = { heading: string; body: string; name?: string }

export type FontGroup = 'Clean' | 'Poster' | 'Serif' | 'Retro' | 'Handmade' | 'Heavy'

export interface ArtistFont {
  id: string
  label: string
  group: FontGroup
  /** CSS font-family stack. */
  family: string
  /** Google Fonts css2 family spec (e.g. "Bebas+Neue" or "DM+Sans:wght@400;600;800"). Omitted for fonts the app already loads. */
  google?: string
  /** CSS variable already providing this font (loaded by the route layout), instead of a Google request. */
  builtinVar?: string
  weight: number
  uppercase: boolean
  leading: number
  /** Width relative to Barlow Condensed 800 (1 = same). */
  width: number
  /** Good for paragraphs: has regular and bold weights and reads well small. */
  body?: boolean
  /** One short line shown beside the font in the picker. */
  note?: string
}

const sans = 'system-ui, -apple-system, "Segoe UI", sans-serif'
const serif = 'Georgia, "Times New Roman", serif'
const display = '"Arial Narrow", Impact, sans-serif'

export const ARTIST_FONTS: ArtistFont[] = [
  // Clean: calm, readable, good for body copy.
  {
    id: 'figtree',
    label: 'Figtree',
    group: 'Clean',
    family: `"Figtree", ${sans}`,
    builtinVar: '--font-figtree',
    weight: 800,
    uppercase: false,
    leading: 0.95,
    width: 1.12,
    body: true,
    note: "TourAligner's own body face",
  },
  {
    id: 'dm-sans',
    label: 'DM Sans',
    group: 'Clean',
    family: `"DM Sans", ${sans}`,
    google: 'DM+Sans:wght@400;600;700;800',
    weight: 800,
    uppercase: false,
    leading: 0.95,
    width: 1.18,
    body: true,
  },
  {
    id: 'inter',
    label: 'Inter',
    group: 'Clean',
    family: `"Inter", ${sans}`,
    google: 'Inter:wght@400;600;700;800',
    weight: 800,
    uppercase: false,
    leading: 0.95,
    width: 1.2,
    body: true,
  },
  {
    id: 'space-grotesk',
    label: 'Space Grotesk',
    group: 'Clean',
    family: `"Space Grotesk", ${sans}`,
    google: 'Space+Grotesk:wght@400;600;700',
    weight: 700,
    uppercase: false,
    leading: 0.95,
    width: 1.16,
    body: true,
    note: 'Techy, a little odd',
  },
  {
    id: 'space-mono',
    label: 'Space Mono',
    group: 'Clean',
    family: `"Space Mono", ui-monospace, Menlo, monospace`,
    google: 'Space+Mono:wght@400;700',
    weight: 700,
    uppercase: false,
    leading: 1,
    width: 1.27,
    body: true,
    note: 'Typewriter-ish mono',
  },

  // Poster: tall, condensed, loud.
  {
    id: 'barlow-condensed',
    label: 'Barlow Condensed',
    group: 'Poster',
    family: `"Barlow Condensed", ${display}`,
    builtinVar: '--font-barlow-condensed',
    weight: 800,
    uppercase: true,
    leading: 0.84,
    width: 1,
    note: 'The TourAligner default',
  },
  {
    id: 'bebas-neue',
    label: 'Bebas Neue',
    group: 'Poster',
    family: `"Bebas Neue", ${display}`,
    google: 'Bebas+Neue',
    weight: 400,
    uppercase: true,
    leading: 0.9,
    width: 0.82,
    note: 'Classic gig poster',
  },
  {
    id: 'anton',
    label: 'Anton',
    group: 'Poster',
    family: `"Anton", ${display}`,
    google: 'Anton',
    weight: 400,
    uppercase: true,
    leading: 0.92,
    width: 0.98,
    note: 'Heavy and tall',
  },
  {
    id: 'oswald',
    label: 'Oswald',
    group: 'Poster',
    family: `"Oswald", ${display}`,
    google: 'Oswald:wght@700',
    weight: 700,
    uppercase: true,
    leading: 0.95,
    width: 1.11,
  },
  {
    id: 'big-shoulders',
    label: 'Big Shoulders',
    group: 'Poster',
    family: `"Big Shoulders Display", ${display}`,
    google: 'Big+Shoulders+Display:wght@800',
    weight: 800,
    uppercase: true,
    leading: 0.88,
    width: 0.93,
    note: 'Industrial, Chicago',
  },
  {
    id: 'archivo-black',
    label: 'Archivo Black',
    group: 'Poster',
    family: `"Archivo Black", ${sans}`,
    google: 'Archivo+Black',
    weight: 400,
    uppercase: true,
    leading: 0.92,
    width: 1.6,
    note: 'Wide and blunt',
  },
  {
    id: 'staatliches',
    label: 'Staatliches',
    group: 'Poster',
    family: `"Staatliches", ${display}`,
    google: 'Staatliches',
    weight: 400,
    uppercase: true,
    leading: 0.95,
    width: 0.92,
    note: 'Rounded corners, all caps',
  },

  // Serif: editorial and moody.
  {
    id: 'playfair',
    label: 'Playfair Display',
    group: 'Serif',
    family: `"Playfair Display", ${serif}`,
    google: 'Playfair+Display:wght@400;600;800',
    weight: 800,
    uppercase: false,
    leading: 0.98,
    width: 1.14,
    body: true,
    note: 'Elegant, high contrast',
  },
  {
    id: 'dm-serif',
    label: 'DM Serif Display',
    group: 'Serif',
    family: `"DM Serif Display", ${serif}`,
    google: 'DM+Serif+Display',
    weight: 400,
    uppercase: false,
    leading: 0.98,
    width: 1.04,
  },
  {
    id: 'abril',
    label: 'Abril Fatface',
    group: 'Serif',
    family: `"Abril Fatface", ${serif}`,
    google: 'Abril+Fatface',
    weight: 400,
    uppercase: false,
    leading: 0.98,
    width: 1.1,
    note: 'Fat and fancy',
  },

  // Retro: slabs and shouty shapes.
  {
    id: 'alfa-slab',
    label: 'Alfa Slab One',
    group: 'Retro',
    family: `"Alfa Slab One", ${serif}`,
    google: 'Alfa+Slab+One',
    weight: 400,
    uppercase: true,
    leading: 0.95,
    width: 1.63,
    note: 'Old-school slab',
  },
  {
    id: 'bungee',
    label: 'Bungee',
    group: 'Retro',
    family: `"Bungee", ${sans}`,
    google: 'Bungee',
    weight: 400,
    uppercase: true,
    leading: 0.95,
    width: 1.48,
    note: 'Sign-painter blocks',
  },

  // Handmade: scrawled, typed, stencilled.
  {
    id: 'permanent-marker',
    label: 'Permanent Marker',
    group: 'Handmade',
    family: `"Permanent Marker", cursive`,
    google: 'Permanent+Marker',
    weight: 400,
    uppercase: true,
    leading: 1,
    width: 1.38,
    note: 'Sharpie on a flyer',
  },
  {
    id: 'special-elite',
    label: 'Special Elite',
    group: 'Handmade',
    family: `"Special Elite", "Courier New", monospace`,
    google: 'Special+Elite',
    weight: 400,
    uppercase: true,
    leading: 1,
    width: 1.27,
    note: 'Typewriter zine',
  },
  {
    id: 'rock-salt',
    label: 'Rock Salt',
    group: 'Handmade',
    family: `"Rock Salt", cursive`,
    google: 'Rock+Salt',
    weight: 400,
    uppercase: false,
    leading: 1.1,
    width: 1.49,
    note: 'Scrawled handwriting',
  },
  {
    id: 'black-ops',
    label: 'Black Ops One',
    group: 'Handmade',
    family: `"Black Ops One", ${display}`,
    google: 'Black+Ops+One',
    weight: 400,
    uppercase: true,
    leading: 0.95,
    width: 1.47,
    note: 'Army stencil',
  },

  // Heavy: for loud bands.
  {
    id: 'metal-mania',
    label: 'Metal Mania',
    group: 'Heavy',
    family: `"Metal Mania", ${display}`,
    google: 'Metal+Mania',
    weight: 400,
    uppercase: false,
    leading: 1.02,
    width: 0.91,
    note: 'Thorny. Death metal logo energy',
  },
  {
    id: 'pirata-one',
    label: 'Pirata One',
    group: 'Heavy',
    family: `"Pirata One", ${serif}`,
    google: 'Pirata+One',
    weight: 400,
    uppercase: false,
    leading: 1,
    width: 0.81,
    note: 'Blackletter, old-school lettering',
  },
  {
    id: 'rubik-distressed',
    label: 'Rubik Distressed',
    group: 'Heavy',
    family: `"Rubik Distressed", ${sans}`,
    google: 'Rubik+Distressed',
    weight: 400,
    uppercase: true,
    leading: 0.95,
    width: 1.48,
    note: 'Cracked and worn',
  },
  {
    id: 'rubik-dirt',
    label: 'Rubik Dirt',
    group: 'Heavy',
    family: `"Rubik Dirt", ${sans}`,
    google: 'Rubik+Dirt',
    weight: 400,
    uppercase: true,
    leading: 0.95,
    width: 1.48,
    note: 'Grimy, photocopied',
  },
]

export const FONT_GROUPS: FontGroup[] = ['Clean', 'Poster', 'Serif', 'Retro', 'Handmade', 'Heavy']

export const DEFAULT_FONTS: ArtistFonts = { heading: 'barlow-condensed', body: 'figtree' }

const BY_ID = new Map(ARTIST_FONTS.map((font) => [font.id, font]))

export function getFont(id: string | undefined, fallback: string): ArtistFont {
  return BY_ID.get(id ?? '') ?? (BY_ID.get(fallback) as ArtistFont)
}

/** The three fonts an artist page uses. The band name follows the headings unless the artist picked its own. */
export function resolveFonts(fonts: ArtistFonts | undefined): {
  heading: ArtistFont
  body: ArtistFont
  name: ArtistFont
} {
  const heading = getFont(fonts?.heading, DEFAULT_FONTS.heading)
  const body = getFont(fonts?.body, DEFAULT_FONTS.body)
  const name = fonts?.name ? getFont(fonts.name, heading.id) : heading
  return { heading, body, name }
}

export function fontStack(font: ArtistFont): string {
  return font.builtinVar ? `var(${font.builtinVar}), ${font.family}` : font.family
}

/** Google Fonts stylesheet URL for the given fonts (built-in fonts are skipped: the layout already loads them). */
export function googleFontsHref(fonts: ArtistFont[]): string | null {
  const specs = Array.from(
    new Set(fonts.filter((font) => font.google).map((font) => font.google as string))
  )
  if (specs.length === 0) return null
  return `https://fonts.googleapis.com/css2?${specs.map((spec) => `family=${spec}`).join('&')}&display=swap`
}
