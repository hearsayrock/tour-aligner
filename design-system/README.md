TourAligner is the booking platform for live shows, built for DIY artists, bands, agents, managers and venues. The look is **professional punk, turned down a notch**: a clean modern product with a little gig-poster attitude. Big condensed all-caps headlines, crisp 1.5px lines, small hard offset shadows on hover and on the one featured card, pill buttons with arrows, and a vivid orange held against a muted, warm palette of cream, cocoa, terracotta and sage.

## Content fundamentals

- Write like a sharp person in the music scene talking to peers: witty, a little sassy, never a corporate booking tool trying to sound cool. Sass goes at the broken process, never at the artist, the draw or the venue.
- The founders' own lines are the reference: "The problem with the current booking system is that there is no system." "Look, know, play the show." "Myspace the hell out of your personal public page." "Spill the tea on what's broken." Deck lines in the same spirit: "Who is easier to convince?" "Needed a Ricky."
- Take a position, say what the product holds or does with concrete nouns, then stop. No stacked benefits, no reassuring punchline after the point lands.
- Use scene vocabulary where it carries meaning: the bill, doors open, set the stage, stage plot, room capacity, availability, tour dates.
- Landing, deck and campaign copy gets swagger. Product UI and onboarding stay plain and direct: labels name the field, buttons name the action in two to four words, empty states say what is missing and offer the next step. Errors, cancellations and booking details get accuracy and respect, no jokes.
- Never use an em dash. Never promise bookings, venue replies, dates or features that are not live. Mild profanity only when it earns its place.
- Casing: sentence case for body copy and field labels. Hero headlines, page titles, buttons, badges and eyebrows are uppercase; card and panel headings, field labels and body copy stay sentence case, set by the `display-*`, `button-*` and Labels styles (type them in sentence case and let CSS uppercase them). The product is written "TourAligner", one word.

## Visual foundations

- **Attitude.** Pro, not messy. Punk shows up as scale, contrast and the occasional hard edge: oversized condensed headlines flush left, 1.5px `edge` lines on buttons, a small hard shadow on hover, one loud colour. Everything else (cards, fields, lists, forms) stays calm and close to the current product. It never shows up as distressed textures, torn paper, stencil fonts or random rotation.
- **Colour.** Three grounds. Light (`page` `#FAFAFA`) is the app. Cream (`cream`, theme "Cream") is the paper for decks and marketing. Cocoa (`cocoa`, theme "Cocoa") is the dark ground for hero bands, decks and dark mode. Set `data-theme="cream"` or `"cocoa"` on a container to switch; every semantic token (`page`, `surface`, `ink`, `edge`, `text-*`, `border*`, `brand-text`) follows.
- **The accents.** `brand` orange stays the vivid heart: primary buttons, logo, one big moment per screen. Beside it use the muted warm set: `terracotta` for second-tier blocks and chart fills, `peach` for orange on cocoa, `rust` for emphasis text on cream, `sage` and `sage-light` as the cool counterweight (confirmed, positive, chart slice), `sand` and `sand-light` for quiet slices and hairlines. Rule of thumb: one `brand` per view, the rest of the colour comes from the muted set.
- **Labels on fills.** `brand`, `terracotta` and `sage` fills take `on-brand` (ink), never white. `danger` takes `on-danger` (white). Small orange text on light grounds is `brand-text`; on cocoa it is `brand-text` (it flips to peach) or `peach`.
- **Charts.** Order slices light to dark and highlight one: `sand-light`, `sand`, `sage`, then `terracotta` or `rust` for the story. Big numbers in `display-xl` over a `body` caption; the highlighted figure takes `rust` on cream and `peach` on cocoa.
- **Type.** Barlow Condensed 800 uppercase (`display`) for hero headlines, page titles and every button, with line-height .84 to .9 and flush-left alignment. Figtree (`sans`) for all body copy and fields. JetBrains Mono (`mono`) for eyebrows, captions and badge labels, uppercase with wide tracking. No serif; the slide deck's chunky serif headlines are a deck-only flourish and not part of the product system.
- **Lines and shadows.** Buttons carry a 1.5px `edge` border. Hover lifts a button 2px up and left and drops the 4px `shadow-hard` behind it; press snaps flat. At most one featured card per view gets a 1.5px `edge` border and `shadow-hard`. Normal cards stay quiet: a 1px `border` hairline and no shadow, or `shadow-card`. No blurred glows, no gradients.
- **Radii.** Every button, badge and pill is `radius-full`. Cards `radius-2xl` (20px), feature panels `radius-3xl` (28px), fields `radius-lg` (10px). Never the old semi-rounded 12px button.
- **Focus.** A 3px solid `edge` ring offset 4px on buttons; fields lift 2px with `shadow-hard-sm` and an `edge` border. `edge` is ink on light and cream on cocoa, at least 11:1 on its grounds.
- **Spacing and layout.** 4px scale. Buttons 48px high (58 large, 38 small), fields 50px, cards pad 24px. Headlines sit tight to their eyebrow (10px) and loose from body (16 to 24px). Desktop app: fixed 15rem sidebar (5rem collapsed), content on `page` in cards; single column below 1024px.
- **Imagery.** Full-bleed crowd and stage photography under an `ink-black` overlay for marketing. Product screens use the artist's or venue's own cover.
- **Motion.** Snappy: 120ms transform and shadow on controls (2px lift), a 200ms sidebar slide, a spinning microphone for processing. Everything stops under `prefers-reduced-motion`.

## Iconography

Icons come from Lucide (`lucide-react`): outline, rounded caps and joins, 2px stroke at 16 to 20px, `ink` or `text-subtle` colour. The one custom glyph is the button arrow: a 2.6px line with an open chevron head and round caps, 22px beside large and default labels, 18px beside small ones. It nudges 3px right on hover. No emoji, no filled glyphs.

## Logos and assets

- The mark is a map pin holding five shapes: a small grey dot, a short bar, a tall orange bar, a mid orange bar, a large orange dot, an equalizer in a pin. `assets/Logos/touraligner-mark.svg` is the vector on light grounds; `touraligner-mark-dark.svg` is the version for dark grounds (near-black pin, white shapes). `touraligner-logo.svg` is the full lockup with "Tour" in dark grey and "Aligner" in `brand`; `touraligner-logo.png` is its raster.
- To make the mark loud (covers, slides, posters) blow up the five shapes themselves, keep their order and proportions, colour them from the palette, and let the pin ring crop off the edge. Do not invent extra bars.
- Use the lockup on light and cream grounds only. On cocoa use the dark mark with the "TourAligner" text wordmark in `display-hero` cream.
- `assets/Imagery/` holds two marketing hero photographs. Overlay with `ink-black` before setting white display type on them.

## Components

Previews are hand-written for this look; the old `primitives.tsx` helpers (Button, Card, Badge, input, PageHeader, EmptyState) are the production targets and need the new classes ported. The consumer supplies label text, container width and `href` for links. Reuse them instead of re-styling a div.

## Not synced

- Button labels are centred with `text-box: trim-both cap alphabetic` (exact in current Chrome and Safari), with a metric-based nudge as the fallback elsewhere.
- Components are static previews, not a built bundle; the feature components (profile studio, booking, inbox, calendar) are not included. The production app still ships the old 12px-radius buttons, Inter and white-on-orange labels until `primitives.tsx` is updated to match.
- Barlow Condensed, Figtree and JetBrains Mono load from Google Fonts; no font files are in the repository, so `type.fonts` is empty. Figtree and JetBrains Mono are new here (Figtree approximates the deck's body face and JetBrains Mono the reference labels).
- Cream and Cocoa themes define the core semantic tokens only; status badge tints (`success-*`, `warning-*`, `info-*`) are Light values in every theme. The deck's serif headline face is not included.
- Muted palette hex values were sampled by eye from the deck screenshots, not from the source file; check `cocoa`, `cream`, `terracotta`, `sage`, `rust` against the deck's exact values.
