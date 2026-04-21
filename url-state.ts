import type { HueFamily, PantoneSystem } from "../types";

/* -------------------------------------------------------------------------
 * url-state.ts — a tiny shareable-URL reducer. Supports:
 *   ?color=17-1230-TCX
 *   ?family=red
 *   ?system=TCX
 *   ?q=mocha
 * No router library — just history.pushState + a subscribe callback.
 * -------------------------------------------------------------------------*/

export interface UrlState {
  color?: string;
  family?: HueFamily;
  system?: PantoneSystem;
  q?: string;
}

export function readState(): UrlState {
  if (typeof window === "undefined") return {};
  const params = new URLSearchParams(window.location.search);
  const color = params.get("color") || undefined;
  const family = (params.get("family") as HueFamily | null) || undefined;
  const system = (params.get("system") as PantoneSystem | null) || undefined;
  const q = params.get("q") || undefined;
  return {
    color: color ? decodeColorCode(color) : undefined,
    family,
    system,
    q,
  };
}

export function writeState(next: UrlState, { replace = false } = {}) {
  const params = new URLSearchParams();
  if (next.color) params.set("color", encodeColorCode(next.color));
  if (next.family) params.set("family", next.family);
  if (next.system) params.set("system", next.system);
  if (next.q) params.set("q", next.q);
  const qs = params.toString();
  const url = qs ? `?${qs}` : window.location.pathname;
  if (replace) window.history.replaceState(null, "", url);
  else window.history.pushState(null, "", url);
}

/**
 * URL-safe color code. We swap spaces for underscores so internal hyphens
 * (e.g. "17-1230") survive untouched.
 *   "17-1230 TCX"   <-> "17-1230_TCX"
 *   "Cool Gray 1 C" <-> "Cool_Gray_1_C"
 *   "Mocha Mousse"  <-> "Mocha_Mousse"
 */
export function encodeColorCode(code: string): string {
  return code.trim().replace(/\s+/g, "_");
}

export function decodeColorCode(code: string): string {
  return code.replace(/_+/g, " ").trim();
}

/** Subscribe to popstate (back/forward). Returns an unsubscribe. */
export function onUrlChange(cb: () => void): () => void {
  const handler = () => cb();
  window.addEventListener("popstate", handler);
  return () => window.removeEventListener("popstate", handler);
}
