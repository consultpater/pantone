export type HueFamily =
  | "red"
  | "orange"
  | "yellow"
  | "green"
  | "cyan"
  | "blue"
  | "purple"
  | "pink"
  | "neutral"
  | "black-white";

export type PantoneSystem = "TCX" | "TPG" | "Coated" | "Uncoated";

export interface PantoneColor {
  /** e.g. "18-1750 TCX", "354 C", "354 U" */
  code: string;
  /** e.g. "Mocha Mousse". null for Formula Guide entries without names. */
  name: string | null;
  /** "#BE3455" — always 7-char uppercase. */
  hex: string;
  system: PantoneSystem;
  /** Hue family classification, computed from HSL. */
  family: HueFamily;
  /** 0–100 lightness, computed. */
  lightness: number;
  /** 0–360 hue, computed. */
  hue: number;
  /** Saturation 0-100 (kept for filtering edge cases). */
  saturation: number;
  /** Set only for Colors of the Year. */
  year?: number;
}

export type SortMode = "hue" | "lightness" | "name" | "code";

export interface FamilyMeta {
  id: HueFamily;
  label: string;
  blurb: string;
  /** Used as the subtle dot next to section headers. */
  accent: string;
}

export const FAMILY_ORDER: HueFamily[] = [
  "red",
  "orange",
  "yellow",
  "green",
  "cyan",
  "blue",
  "purple",
  "pink",
  "neutral",
  "black-white",
];

export const FAMILIES: Record<HueFamily, FamilyMeta> = {
  red: {
    id: "red",
    label: "Reds",
    blurb: "Carmines, scarlets, poppies, oxbloods.",
    accent: "#c74b4b",
  },
  orange: {
    id: "orange",
    label: "Oranges",
    blurb: "Terracottas, persimmons, ambers.",
    accent: "#d98736",
  },
  yellow: {
    id: "yellow",
    label: "Yellows",
    blurb: "Chartreuse, mustard, butter, gold.",
    accent: "#d8b534",
  },
  green: {
    id: "green",
    label: "Greens",
    blurb: "Sage, moss, emerald, spruce.",
    accent: "#4a8b3c",
  },
  cyan: {
    id: "cyan",
    label: "Cyans",
    blurb: "Teals, turquoise, glacier, aqua.",
    accent: "#3ca79b",
  },
  blue: {
    id: "blue",
    label: "Blues",
    blurb: "Sky, denim, cobalt, navy, ink.",
    accent: "#345a8b",
  },
  purple: {
    id: "purple",
    label: "Purples",
    blurb: "Lavender, amethyst, plum, violet.",
    accent: "#6b4e8b",
  },
  pink: {
    id: "pink",
    label: "Pinks",
    blurb: "Shell, rose, magenta, fuchsia.",
    accent: "#c66191",
  },
  neutral: {
    id: "neutral",
    label: "Neutrals",
    blurb: "Beiges, taupes, clays, stones.",
    accent: "#8a8478",
  },
  "black-white": {
    id: "black-white",
    label: "Blacks & Whites",
    blurb: "Paper, bone, charcoal, ink.",
    accent: "#2a2a2a",
  },
};
