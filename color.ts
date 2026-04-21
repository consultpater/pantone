import { converter, formatHex, wcagContrast } from "culori";
import type { HueFamily, PantoneColor } from "../types";

/* -------------------------------------------------------------------------
 * color.ts
 *
 * Thin wrappers around culori for the things the UI needs:
 *   - hex <-> hsl/rgb/cmyk conversion
 *   - hue-family classification (matching scripts/build-colors.ts exactly)
 *   - WCAG contrast + best-ink picker
 *   - harmony generators (complementary / analogous / triadic)
 *   - sRGB gamut guard (Pantone often drifts out of display-reproducible
 *     colors, so we surface that honestly in the detail view).
 * -------------------------------------------------------------------------*/

const toHsl = converter("hsl");
const toRgb = converter("rgb");
const toLab = converter("lab");

export interface Hsl {
  h: number;
  s: number; // 0-100
  l: number; // 0-100
}

export interface Rgb {
  r: number; // 0-255
  g: number; // 0-255
  b: number; // 0-255
}

export interface Cmyk {
  c: number; // 0-100
  m: number; // 0-100
  y: number; // 0-100
  k: number; // 0-100
}

/* -------------------- Conversions -------------------- */

export function hexToHsl(hex: string): Hsl {
  const hsl = toHsl(hex);
  const h = hsl?.h ?? 0;
  return {
    h: ((h % 360) + 360) % 360,
    s: Math.round((hsl?.s ?? 0) * 1000) / 10,
    l: Math.round((hsl?.l ?? 0) * 1000) / 10,
  };
}

export function hexToRgb(hex: string): Rgb {
  const rgb = toRgb(hex);
  return {
    r: Math.round((rgb?.r ?? 0) * 255),
    g: Math.round((rgb?.g ?? 0) * 255),
    b: Math.round((rgb?.b ?? 0) * 255),
  };
}

/**
 * Straightforward naive CMYK from sRGB. Pantone -> CMYK has no one true
 * answer (depends on profile, paper, ink set), so we label this as an
 * "approximation" in the UI.
 */
export function hexToCmyk(hex: string): Cmyk {
  const { r, g, b } = hexToRgb(hex);
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const k = 1 - Math.max(rn, gn, bn);
  if (k >= 0.9999) return { c: 0, m: 0, y: 0, k: 100 };
  const c = (1 - rn - k) / (1 - k);
  const m = (1 - gn - k) / (1 - k);
  const y = (1 - bn - k) / (1 - k);
  return {
    c: Math.round(c * 100),
    m: Math.round(m * 100),
    y: Math.round(y * 100),
    k: Math.round(k * 100),
  };
}

/* -------------------- Family classification -------------------- */

/**
 * This *must* match scripts/build-colors.ts exactly. The pipeline writes the
 * result into colors.json; the UI reads it. We keep this function exported
 * for the unit tests (and for any ad-hoc re-classification in the browser).
 */
export function classify(hex: string): {
  family: HueFamily;
  hue: number;
  saturation: number;
  lightness: number;
} {
  const { h, s, l } = hexToHsl(hex);
  if (s <= 12) {
    if (l >= 20 && l <= 85) {
      return { family: "neutral", hue: h, saturation: s, lightness: l };
    }
    return { family: "black-white", hue: h, saturation: s, lightness: l };
  }
  let family: HueFamily = "neutral";
  if (h < 15 || h >= 345) family = "red";
  else if (h < 45) family = "orange";
  else if (h < 65) family = "yellow";
  else if (h < 165) family = "green";
  else if (h < 195) family = "cyan";
  else if (h < 250) family = "blue";
  else if (h < 290) family = "purple";
  else if (h < 345) family = "pink";
  return { family, hue: h, saturation: s, lightness: l };
}

/* -------------------- Contrast + ink picker -------------------- */

export const INK_DARK = "#1A1A1A";
export const INK_LIGHT = "#FAFAF7";

/** WCAG 2.1 contrast ratio between two hex colors (1 to 21). */
export function contrast(a: string, b: string): number {
  return wcagContrast(a, b) ?? 1;
}

/**
 * Picks dark or light ink (from our editorial palette) based on whichever
 * has better contrast against the swatch. Ties -> dark.
 */
export function bestInk(swatchHex: string): string {
  const cDark = contrast(swatchHex, INK_DARK);
  const cLight = contrast(swatchHex, INK_LIGHT);
  return cLight > cDark ? INK_LIGHT : INK_DARK;
}

/* -------------------- Harmonies -------------------- */

function rotateHue(hex: string, deltaDeg: number): string {
  const hsl = toHsl(hex);
  if (!hsl) return hex;
  const h = ((hsl.h ?? 0) + deltaDeg + 360) % 360;
  return formatHex({ mode: "hsl", h, s: hsl.s, l: hsl.l })!.toUpperCase();
}

export function complementary(hex: string): string {
  return rotateHue(hex, 180);
}

export function analogous(hex: string): [string, string] {
  return [rotateHue(hex, -30), rotateHue(hex, 30)];
}

export function triadic(hex: string): [string, string] {
  return [rotateHue(hex, 120), rotateHue(hex, 240)];
}

export interface Harmonies {
  complementary: string;
  analogous: [string, string];
  triadic: [string, string];
}

export function harmonies(hex: string): Harmonies {
  return {
    complementary: complementary(hex),
    analogous: analogous(hex),
    triadic: triadic(hex),
  };
}

/* -------------------- sRGB gamut check -------------------- *
 * Pantone inks live in a wider space than sRGB. We use a cheap heuristic:
 * if the color's Lab chroma is >95 AND saturation is maxed in sRGB, it
 * likely clips. Culori can check out-of-gamut more formally but this is
 * good enough for a display note.
 * -------------------------------------------------------------------------*/
export function gamutNote(hex: string): "in-gamut" | "near-edge" | "likely-clipped" {
  const lab = toLab(hex);
  const chroma = Math.hypot(lab?.a ?? 0, lab?.b ?? 0);
  const rgb = toRgb(hex);
  const max = Math.max(rgb?.r ?? 0, rgb?.g ?? 0, rgb?.b ?? 0);
  const min = Math.min(rgb?.r ?? 0, rgb?.g ?? 0, rgb?.b ?? 0);
  if (chroma > 95 && (max >= 0.995 || min <= 0.005)) return "likely-clipped";
  if (chroma > 75) return "near-edge";
  return "in-gamut";
}

/* -------------------- Display helpers -------------------- */

export function hslString(hex: string): string {
  const { h, s, l } = hexToHsl(hex);
  return `hsl(${Math.round(h)}, ${Math.round(s)}%, ${Math.round(l)}%)`;
}

export function rgbString(hex: string): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgb(${r}, ${g}, ${b})`;
}

export function cmykString(hex: string): string {
  const { c, m, y, k } = hexToCmyk(hex);
  return `cmyk(${c}%, ${m}%, ${y}%, ${k}%)`;
}

/* -------------------- Primary display label -------------------- */

/** Returns the label to show as the title on a card: name if present, else code. */
export function titleFor(c: PantoneColor): string {
  return c.name ?? c.code;
}
