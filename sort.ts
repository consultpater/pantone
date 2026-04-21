import type { PantoneColor, SortMode } from "../types";

/* -------------------------------------------------------------------------
 * sort.ts — pluggable comparators used by HueSection and the detail modal's
 * adjacent-color keyboard nav. Sorts are stable (we return 0 on ties so the
 * caller's upstream order is preserved — JavaScript's Array.sort is stable
 * as of ES2019, which is the platform we target).
 * -------------------------------------------------------------------------*/

export function compareHue(a: PantoneColor, b: PantoneColor): number {
  if (a.hue !== b.hue) return a.hue - b.hue;
  return a.lightness - b.lightness;
}

export function compareLightness(a: PantoneColor, b: PantoneColor): number {
  if (a.lightness !== b.lightness) return a.lightness - b.lightness;
  return a.hue - b.hue;
}

export function compareName(a: PantoneColor, b: PantoneColor): number {
  const an = (a.name ?? a.code).toLocaleLowerCase();
  const bn = (b.name ?? b.code).toLocaleLowerCase();
  return an < bn ? -1 : an > bn ? 1 : 0;
}

export function compareCode(a: PantoneColor, b: PantoneColor): number {
  // Natural-ish sort: numeric prefixes ascend by number, not lexicographically.
  const ac = a.code.toLowerCase();
  const bc = b.code.toLowerCase();
  const am = ac.match(/(\d+)/g);
  const bm = bc.match(/(\d+)/g);
  if (am && bm) {
    const len = Math.min(am.length, bm.length);
    for (let i = 0; i < len; i++) {
      const an = parseInt(am[i], 10);
      const bn = parseInt(bm[i], 10);
      if (an !== bn) return an - bn;
    }
  }
  return ac < bc ? -1 : ac > bc ? 1 : 0;
}

export function comparatorFor(mode: SortMode) {
  switch (mode) {
    case "hue":
      return compareHue;
    case "lightness":
      return compareLightness;
    case "name":
      return compareName;
    case "code":
      return compareCode;
  }
}

export function sortColors(list: PantoneColor[], mode: SortMode): PantoneColor[] {
  return [...list].sort(comparatorFor(mode));
}
