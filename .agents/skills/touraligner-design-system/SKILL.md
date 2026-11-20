---
name: touraligner-design-system
description: Build or change TourAligner UI (components, pages, layouts, styles) using the design system tokens instead of hard-coded colours, radii, shadows or fonts. Use for any visual work in the app, including new screens, edits to existing screens, and the artist profile. Not for copy (use write-touraligner-content) and not for backend or data work.
---

# TourAligner design system

Read this whole file before writing or changing UI. These are shared project instructions for every agent. Follow explicit task instructions when they override a preference here, but do not skip the token rule.

## The one rule

**Pull every colour, radius, shadow, spacing step and font from the design system tokens. Never type a hex or rgb value for a TourAligner colour in app code.**

The tokens are the single source of truth. They reach the app three ways, and all three read the same values:

| You are writing | Use |
|---|---|
| Tailwind classes | Token utilities: `bg-page`, `bg-surface`, `text-ink`, `text-text-secondary`, `border-border`, `bg-brand text-on-brand`, `rounded-full`, `rounded-ds-2xl`, `shadow-hard` |
| Plain CSS or inline style | `var(--tads-ink)`, `var(--tads-border)`, `var(--tads-radius-2xl)`, `var(--tads-shadow-hard)` |
| Fonts | `font-ds-display` (Barlow Condensed), `font-ds-sans` (Figtree), `font-ds-mono` (JetBrains Mono) |

Where they live: `design-system/tokens.json` is the source. `npm run ds:sync` generates `design-system/tokens.app.css` from it. Never edit the generated file by hand and never edit `tokens.json` to suit one screen. A new or changed token is a design system change: tell the developer and let the designer update the design system.

If the colour you want is not a token, **use the closest token and say so in your summary.** Do not invent a hex. Do not use arbitrary Tailwind values such as `bg-[#FD6A2F]` or `text-[#666]`. Do not use the old palette (`#FD6A2F`, `#888888`, `#E8E8E8` written out as literals): use `bg-brand`, `text-muted`, `border-border`.

Allowed exceptions, each with a one-line comment saying why:
- Third-party brand colours (for example Google and Apple sign-in buttons).
- HTML email templates and other places CSS variables cannot work. Copy the token's value from `tokens.json` and name the token in a comment.
- Colours inside image or SVG files.

## Keep surfaces and tints quiet

This applies to every screen outside the artist profile (dashboard, inbox, calendar, settings, venues, admin, marketing).

- The default ground is `page`. Most things should sit directly on it.
- Use `surface` (a white card or panel) only when a group of content needs to read as one object. Do not wrap every section in a card. Do not nest a `surface` inside a `surface`; separate things with spacing or a `border` hairline instead.
- `surface-2` is for insets inside a card (an input well, a muted badge). It is not a page background.
- At most one featured card per view gets the strong treatment (1.5px `edge` border plus `shadow-hard`). Normal cards use a 1px `border` and no shadow, or `shadow-card`.
- **`brand-tint` is rare.** Use it only for brand badges and one small highlight. Never use it as a large panel, a page band or a card background.
- **`brand` orange is loud.** One `brand` moment per view (usually the primary button). Everything else comes from the muted set (`terracotta`, `peach`, `rust`, `sage`, `sand`) or from neutral tokens.
- No gradients and no blurred glows.

## Build rules that are easy to get wrong

- **Labels on fills.** `brand`, `terracotta` and `sage` fills take `on-brand` (ink), never white. `danger` takes `on-danger` (white).
- **Orange text.** Small orange text is `text-brand-text`, never `text-brand` (it fails contrast on light grounds).
- **Radii.** Every button, badge and pill is fully round (`rounded-full`). Cards are `rounded-ds-2xl` (20px), feature panels `rounded-ds-3xl` (28px), fields `rounded-ds-lg` (10px). The `ds-` prefix is deliberate: the plain `rounded-2xl` and `rounded-lg` still mean Tailwind's own sizes on old screens, so old screens do not shift. Never the old 12px button.
- **Buttons.** Height 48px by default (58 large, 38 small), a 1.5px `edge` border, label in Barlow Condensed 800 uppercase. Hover lifts 2px up and left and shows `shadow-hard`. Reuse the shared Button; do not restyle a `div`.
- **Type.** Barlow Condensed 800 uppercase for page titles and buttons. Figtree for body and fields. JetBrains Mono uppercase for eyebrows and small labels. Body copy, field labels and card headings stay sentence case.
- **Grounds.** `data-theme="cream"` or `"cocoa"` on a container switches every semantic token. Do not hand-pick dark-mode colours.
- **Focus.** Keep the visible focus ring (3px solid `edge`, offset 4px on buttons).
- **Reduced motion.** Hover lifts and transitions stop under `prefers-reduced-motion`.

## The artist profile is different

Everything inside the public artist profile and its editor (`src/components/profile-page/artist/` in the real app, `src/components/touraligner/` in the prototype) uses **two layers**:

- **TourAligner chrome** (buttons, tab pills, sheets' structure, the logo, radii, shadows, fonts for UI) uses the design system tokens.
- **The artist's own expression** (their colours, hero photo, headline font, layout) is **data**. It comes from the artist's saved theme as `--ta-*` CSS variables on the profile root. Never replace those with tokens, and never hard-code an artist colour.

Do not use `--ta-*` variables outside the profile.

## Do not restyle old screens by accident

Rolling the design system through the rest of the app is a planned, separate piece of work. When you build **new** UI or **change** a screen's UI as part of a task, use tokens. When you are only touching an old screen for another reason (a bug, a data change), leave its existing styling alone and mention that it still uses old values. Do not do drive-by restyling.

## Before you finish

1. Search your own diff for hard-coded colours. From the repo root:
   ```bash
   git diff -U0 | grep -nE '#[0-9A-Fa-f]{3,8}\b|\[#|rgba?\('
   ```
   Every hit must be an allowed exception with a comment, or removed.
2. Run `npm run lint` and `npx tsc --noEmit`.
3. Look at the screen at phone width and desktop width.
4. In your summary, list any place you used a nearest-token substitute or an exception.
