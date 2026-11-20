// Generate the app theme from the designer’s token export.
import { readFileSync, writeFileSync } from "node:fs";

const tokens = JSON.parse(readFileSync(new URL("../design-system/tokens.json", import.meta.url), "utf8"));
const PREFIX = "--tads-";
const first = tokens.color.themes[0].id;
const themes = tokens.color.themes.map((t) => t.id);
const colorBlock = (theme) => tokens.color.tokens
  .filter((t) => theme === first || (typeof t.value === "object" && t.value[theme]))
  .map((t) => `  ${PREFIX}${t.name}: ${typeof t.value === "string" ? t.value : t.value[theme] ?? t.value[first]};`);
const shadowBlock = (theme) => tokens.shadow.tokens
  .filter((t) => theme === first || (typeof t.value === "object" && t.value[theme]))
  .map((t) => `  ${PREFIX}${t.name}: ${pick2(t.value, theme)};`);
const pick2 = (v, theme) => (typeof v === "string" ? v : v[theme] ?? v[first]);

const rootLines = [
  ...colorBlock(first),
  ...shadowBlock(first),
  ...["radius", "spacing"].flatMap((group) => tokens[group].tokens.map((t) => `  ${PREFIX}${t.name}: ${t.value};`)),
  ...Object.entries(tokens.type.families).map(([k, v]) => `  ${PREFIX}font-${k}: ${v};`),
];
const themeBlocks = themes.slice(1).map((id) => `[data-theme="${id}"] {\n${[...colorBlock(id), ...shadowBlock(id)].join("\n")}\n}`);

const tw = [
  ...tokens.color.tokens.map((t) => `  --color-${t.name}: var(${PREFIX}${t.name});`),
  // Radii get a "ds-" prefix (rounded-ds-2xl) so importing this file does NOT change the app's existing rounded-lg, rounded-2xl and so on.
  ...tokens.radius.tokens.map((t) => `  --radius-ds-${t.name.replace(/^radius-/, "")}: var(${PREFIX}${t.name});`),
  ...tokens.shadow.tokens.map((t) => `  --shadow-${t.name.replace(/^shadow-/, "")}: var(${PREFIX}${t.name});`),
  // Fonts get a "ds-" prefix too (font-ds-display), so old screens keep their current fonts until the app-wide rollout.
  // The next/font variables come first; the layout must define --font-figtree, --font-barlow-condensed, --font-jetbrains-mono.
  `  --font-ds-sans: var(--font-figtree), var(${PREFIX}font-sans);`,
  `  --font-ds-display: var(--font-barlow-condensed), var(${PREFIX}font-display);`,
  `  --font-ds-mono: var(--font-jetbrains-mono), var(${PREFIX}font-mono);`,
];

const appCss = `/* GENERATED from design-system/tokens.json (${tokens.name} design system, synced ${tokens.meta?.synced}). Do not edit by hand.
   Run \`npm run ds:sync\` after updating tokens.json.

   How to use it in the real app:
   - Import this file once, after \`@import "tailwindcss"\`.
   - Never write a hex value for a TourAligner colour in app code. Use a token: a Tailwind utility (bg-page, text-ink,
     border-border, bg-brand) or var(${PREFIX}ink) in CSS.
   - Switch grounds with data-theme="cream" or data-theme="cocoa" on a container. Every semantic token follows. */

:root, [data-theme="${first}"] {
${rootLines.join("\n")}
}

${themeBlocks.join("\n\n")}

@theme inline {
${tw.join("\n")}
}
`;
writeFileSync(new URL("../design-system/tokens.app.css", import.meta.url), appCss);
console.log(`Wrote design-system/tokens.app.css (${themes.length} themes).`);
