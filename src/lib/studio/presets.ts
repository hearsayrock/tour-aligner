// Designer-authored artist palettes are profile data. Product chrome uses the app tokens.
type HeroTreatment = 'natural' | 'mono' | 'tinted'
type Palette = Record<
  'background' | 'surface' | 'surfaceAlt' | 'text' | 'textMuted' | 'accent' | 'onAccent',
  string
>
export interface ThemePreset {
  id: string
  label: string
  blurb: string
  heroArt: string
  theme: Palette
}

const base = '/touraligner/samples'

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'basement',
    label: 'Basement punk',
    blurb: 'Plum black and hot pink',
    heroArt: `${base}/basement.svg`,
    theme: {
      background: '#09060D',
      surface: '#1A1022',
      surfaceAlt: '#2A2033',
      text: '#F6EFF4',
      textMuted: '#B9A8B6',
      accent: '#FF4FB8',
      onAccent: '#1A0B14',
    },
  },
  {
    id: 'neon',
    label: 'Neon night',
    blurb: 'Midnight blue and electric cyan',
    heroArt: `${base}/neon.svg`,
    theme: {
      background: '#060A14',
      surface: '#101A2E',
      surfaceAlt: '#1B2A47',
      text: '#EAF4FF',
      textMuted: '#A5B7D2',
      accent: '#3DE0FF',
      onAccent: '#04141A',
    },
  },
  {
    id: 'desert',
    label: 'Desert gold',
    blurb: 'Dust brown and sunset amber',
    heroArt: `${base}/desert.svg`,
    theme: {
      background: '#1C0F08',
      surface: '#2B1A10',
      surfaceAlt: '#3D2616',
      text: '#FFF1E2',
      textMuted: '#D2B79F',
      accent: '#FFB23F',
      onAccent: '#1E1A17',
    },
  },
  {
    id: 'riot',
    label: 'Riot red',
    blurb: 'Soot black and alarm red',
    heroArt: `${base}/riot.svg`,
    theme: {
      background: '#0C0606',
      surface: '#1E1010',
      surfaceAlt: '#341A1A',
      text: '#FFF0EE',
      textMuted: '#D4AAA6',
      accent: '#FF3B3B',
      onAccent: '#1A0505',
    },
  },
  {
    id: 'mono',
    label: 'Black and white',
    blurb: 'Stark, loud, timeless',
    heroArt: `${base}/mono.svg`,
    theme: {
      background: '#0A0A0A',
      surface: '#181818',
      surfaceAlt: '#262626',
      text: '#F5F5F5',
      textMuted: '#B5B5B5',
      accent: '#F5F5F5',
      onAccent: '#0A0A0A',
    },
  },
  {
    id: 'sunrise',
    label: 'Sunrise',
    blurb: 'Dusky violet and warm gold',
    heroArt: `${base}/sunrise.svg`,
    theme: {
      background: '#120A1E',
      surface: '#201232',
      surfaceAlt: '#33204D',
      text: '#FBF3FF',
      textMuted: '#C4B0D6',
      accent: '#FFC857',
      onAccent: '#1E1A17',
    },
  },
  {
    id: 'paper',
    label: 'Paper',
    blurb: 'Warm cream and rust red',
    heroArt: `${base}/paper.svg`,
    // The one light direction. Ink on cream is 15:1, muted brown is above 6:1, and white on the rust accent is 6:1, and the accent clears 4.8:1 on every surface.
    theme: {
      background: '#F4EFE6',
      surface: '#FFFFFF',
      surfaceAlt: '#EDE5D6',
      text: '#1E1A17',
      textMuted: '#5E5045',
      accent: '#B8301A',
      onAccent: '#FFFFFF',
    },
  },
]

export const HERO_TREATMENTS: { id: HeroTreatment; label: string }[] = [
  { id: 'natural', label: 'Natural' },
  { id: 'mono', label: 'Black and white' },
  { id: 'tinted', label: 'Tinted' },
]

export function getPreset(id: string | undefined): ThemePreset {
  return THEME_PRESETS.find((preset) => preset.id === id) ?? THEME_PRESETS[0]
}

/** Hero artwork choices for "pick a sample". */
export const HERO_SAMPLES = THEME_PRESETS.map((preset) => ({
  id: preset.id,
  label: preset.label,
  src: preset.heroArt,
}))
