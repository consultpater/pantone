# Pantone Gallery

A hue-grouped, collapsible gallery of the full Pantone color library — TCX,
TPG, Formula Guide Coated, and Uncoated — organized like a physical swatch
book.

- ~5,000 swatches across four Pantone systems
- Ten collapsible hue sections, spectrum-ordered (red → orange → yellow →
  green → cyan → blue → purple → pink → neutral → black-white)
- Search auto-expands sections with matches, collapses the rest
- Color-of-the-Year hero with the full 25-year strip
- Detail modal with specs, WCAG contrast, harmonies, gamut note
- Keyboard: `/` focuses search, `Esc` clears/closes, `[` `]` cycle sections,
  `←` `→` cycle siblings inside the detail modal
- URL state (`?color=…&system=TCX&q=mocha`) — any view is shareable

## Stack

- Vite + React 18 + TypeScript
- Tailwind CSS v4 (via the `@tailwindcss/vite` plugin) with a custom theme
- Framer Motion for the modal shared-layout transition and section collapse
- `culori` for color math (HSL/CMYK conversion, WCAG contrast, harmonies)
- `fuse.js` for fuzzy search
- `@fontsource/inter` + `@fontsource/jetbrains-mono` (offline fonts)
- Vitest for the color + sort unit tests

## Getting started

```bash
npm install
npm run dev      # http://localhost:5173
```

The full `src/data/colors.json` is committed so the app runs immediately
after `npm install`. To re-ingest the upstream datasets:

```bash
npm run build:colors
```

Run the unit tests:

```bash
npm test
```

Production build:

```bash
npm run build
npm run preview
```

## Architecture

```
src/
  data/colors.json                 # 5,020 entries, ~100 KB gzipped
  lib/
    color.ts                       # culori wrappers, classify, contrast, harmonies
    sort.ts                        # hue/lightness/name/code comparators
    url-state.ts                   # history.pushState reducer
  components/
    App.tsx                        # reducer + global keyboard
    HeroSwatch.tsx                 # COTY feature + 25-year strip
    FilterBar.tsx                  # sticky search, sort, system, expand-all
    HueSection.tsx                 # collapsible band + intra-section windowing
    SwatchCard.tsx                 # grid card with copy-hex on hover
    SwatchDetail.tsx               # modal with specs, contrast, harmonies
    BandPreview.tsx                # 30-swatch strip in section headers
scripts/
  build-colors.ts                  # data pipeline (fetch, normalize, dedupe)
```

### Why hue sections instead of a flat virtualized grid?

At 5,000 cards, a flat grid is too much DOM to render eagerly and too flat to
navigate visually. Collapsible hue sections mean:

- Initial render is ~10 section headers (~60 DOM nodes) — loads instantly.
- Only expanded sections render their grid. Typically 1–3 open at a time.
- Large families (Blues · 643, Oranges · 995) use lightweight *intra*-section
  windowing — first 200 cards eagerly, more as you scroll.

### Hue family classification

Applied in both `scripts/build-colors.ts` and `src/lib/color.ts` (kept in
sync; the test suite pins the boundaries):

- Saturation ≤ 12% and lightness 20–85 → `neutral`
- Saturation ≤ 12% outside that → `black-white`
- Otherwise by hue angle:
  - 0–15 / 345–360 → `red`
  - 15–45 → `orange`
  - 45–65 → `yellow`
  - 65–165 → `green`
  - 165–195 → `cyan`
  - 195–250 → `blue`
  - 250–290 → `purple`
  - 290–345 → `pink`

### Performance budget

- Initial paint target: hero + 10 collapsed headers (~60 DOM nodes) < 1 s.
- First section expansion < 200 ms via the windowed initial slice.
- `colors.json` ~650 KB raw → ~100 KB gzipped (within the 150–250 KB
  budget). If it outgrows that, drop `saturation` from the JSON and compute
  it on demand in `color.ts`.

## Data sources

Community-maintained hex approximations:

- `Margaret2/pantone-colors` — 2,310 named TCX-style colors
- `brettapeters/pantones` — 1,341 Formula Guide Coated + 1,341 Uncoated
- Plus the 25 Pantone Colors of the Year (2000–2025, public record) added
  at merge time as hero content

Color names are trademarks of Pantone LLC. This is an unofficial
visualization of publicly available hex approximations. Screen colors are
approximate and should not be used for print color matching.
