/* -------------------------------------------------------------------------
 * scripts/build-colors.ts
 *
 * Fetches three community-maintained Pantone datasets, normalizes them,
 * classifies each color into a hue family, dedupes by code, and emits a
 * single `src/data/colors.json` suitable for shipping with the client.
 *
 * Run with:  npm run build:colors
 * --------------------------------------------------------------------------*/
import { writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { converter, formatHex } from "culori";

type System = "TCX" | "TPG" | "Coated" | "Uncoated";
type HueFamily =
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

interface BuildEntry {
  code: string;
  name: string | null;
  hex: string;
  system: System;
  family: HueFamily;
  hue: number;
  saturation: number;
  lightness: number;
  year?: number;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const OUT = resolve(__dirname, "..", "src", "data", "colors.json");

/* ------------------------------ Data sources ----------------------------- */

const SOURCES = {
  named:
    "https://raw.githubusercontent.com/Margaret2/pantone-colors/master/pantone-colors.json",
  coated:
    "https://raw.githubusercontent.com/brettapeters/pantones/master/pantone-coated.json",
  uncoated:
    "https://raw.githubusercontent.com/brettapeters/pantones/master/pantone-uncoated.json",
};

/* ------------------- 25 Colors of the Year, 2000–2025 -------------------- *
 * Public record. We hardcode the pairing (code → year) and the script will
 * attach the `year` field to matching entries at merge time.
 * -------------------------------------------------------------------------*/
const COTY: { year: number; code: string; name: string; hex: string }[] = [
  { year: 2000, code: "15-4020 TCX", name: "Cerulean", hex: "#9BB7D4" },
  { year: 2001, code: "17-1456 TCX", name: "Fuchsia Rose", hex: "#C74375" },
  { year: 2002, code: "14-1106 TCX", name: "True Red", hex: "#BF1932" },
  { year: 2003, code: "14-4811 TCX", name: "Aqua Sky", hex: "#7BC4C4" },
  { year: 2004, code: "17-1456 TCX", name: "Tigerlily", hex: "#E2583E" },
  { year: 2005, code: "15-5217 TCX", name: "Blue Turquoise", hex: "#53B0AE" },
  { year: 2006, code: "13-1106 TCX", name: "Sand Dollar", hex: "#DECDBE" },
  { year: 2007, code: "19-1557 TCX", name: "Chili Pepper", hex: "#9B1B30" },
  { year: 2008, code: "18-3943 TCX", name: "Blue Iris", hex: "#5A5B9F" },
  { year: 2009, code: "14-0848 TCX", name: "Mimosa", hex: "#F0C05A" },
  { year: 2010, code: "15-5519 TCX", name: "Turquoise", hex: "#45B5AA" },
  { year: 2011, code: "18-2120 TCX", name: "Honeysuckle", hex: "#D94F70" },
  { year: 2012, code: "17-1463 TCX", name: "Tangerine Tango", hex: "#DD4124" },
  { year: 2013, code: "17-5641 TCX", name: "Emerald", hex: "#009473" },
  { year: 2014, code: "18-3224 TCX", name: "Radiant Orchid", hex: "#B163A3" },
  { year: 2015, code: "18-1438 TCX", name: "Marsala", hex: "#955251" },
  { year: 2016, code: "13-1520 TCX", name: "Rose Quartz", hex: "#F7CAC9" },
  { year: 2017, code: "15-0343 TCX", name: "Greenery", hex: "#88B04B" },
  { year: 2018, code: "18-3838 TCX", name: "Ultra Violet", hex: "#5F4B8B" },
  { year: 2019, code: "16-1546 TCX", name: "Living Coral", hex: "#FF6F61" },
  { year: 2020, code: "19-4052 TCX", name: "Classic Blue", hex: "#0F4C81" },
  { year: 2021, code: "17-5104 TCX", name: "Ultimate Gray", hex: "#939597" },
  { year: 2021, code: "13-0647 TCX", name: "Illuminating", hex: "#F5DF4D" },
  { year: 2022, code: "17-3938 TCX", name: "Very Peri", hex: "#6667AB" },
  { year: 2023, code: "18-1750 TCX", name: "Viva Magenta", hex: "#BE3455" },
  { year: 2024, code: "13-1023 TCX", name: "Peach Fuzz", hex: "#FFBE98" },
  { year: 2025, code: "17-1230 TCX", name: "Mocha Mousse", hex: "#A47864" },
];

/* ----------------------------- Color math -------------------------------- */

const toHsl = converter("hsl");

function classify(hex: string): {
  family: HueFamily;
  hue: number;
  saturation: number;
  lightness: number;
} {
  const hsl = toHsl(hex);
  const hRaw = hsl?.h ?? 0;
  const s = (hsl?.s ?? 0) * 100;
  const l = (hsl?.l ?? 0) * 100;
  const h = ((hRaw % 360) + 360) % 360;

  // low saturation -> neutral vs black-white
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

function cleanHex(raw: string): string | null {
  if (!raw) return null;
  let s = raw.trim().toLowerCase();
  if (!s.startsWith("#")) s = "#" + s;
  // Expand 3-digit shorthand if necessary.
  if (/^#[0-9a-f]{3}$/.test(s)) {
    s = "#" + s[1] + s[1] + s[2] + s[2] + s[3] + s[3];
  }
  if (!/^#[0-9a-f]{6}$/.test(s)) return null;
  // Normalize via culori (also validates).
  const formatted = formatHex(s);
  return formatted ? formatted.toUpperCase() : null;
}

/* --------------------------- Code normalization -------------------------- */

function normalizeCode(raw: string, system: System): string {
  let s = raw.trim().toUpperCase();
  // Fold whitespace.
  s = s.replace(/\s+/g, " ");
  // Some datasets prefix with "PANTONE" — drop it.
  s = s.replace(/^PANTONE\s+/, "");
  // Ensure a trailing system marker for non-TCX guides.
  if (system === "Coated" && !/\b(C|CP)$/.test(s)) s = `${s} C`;
  if (system === "Uncoated" && !/\bU$/.test(s)) s = `${s} U`;
  if (system === "TCX" && !/\bTCX$/.test(s) && /\d+-\d+/.test(s)) s = `${s} TCX`;
  if (system === "TPG" && !/\bTPG$/.test(s) && /\d+-\d+/.test(s)) s = `${s} TPG`;
  return s;
}

/* ------------------------------ Fetch helpers ---------------------------- */

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}

/* ---------------------- Parse each dataset shape ------------------------- *
 * Margaret2/pantone-colors.json:
 *   { names: string[], values: string[] }   // slug names + hexes
 *   These are Pantone TCX-style named colors WITHOUT numeric codes.
 *   We humanize the slug for both the display name and the "code" field.
 *
 * brettapeters/pantone-coated.json:
 *   Array<{ pantone: "100-c", hex: "#f6eb61" }>
 *
 * brettapeters/pantone-uncoated.json:
 *   Array<{ pantone: "100-u", hex: "#fef380" }>
 *
 * Some releases nest under `{ colors: [...] }`, so we're defensive below.
 * -------------------------------------------------------------------------*/

type NamedShape = { names: string[]; values: string[] };
type FormulaShape = { pantone?: string; name?: string; code?: string; hex: string };

function humanize(slug: string): string {
  return slug
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function parseNamedDataset(raw: unknown): BuildEntry[] {
  const obj = raw as NamedShape;
  if (!obj?.names || !obj?.values) return [];
  const out: BuildEntry[] = [];
  const n = Math.min(obj.names.length, obj.values.length);
  for (let i = 0; i < n; i++) {
    const slug = obj.names[i]?.trim();
    const hex = cleanHex(obj.values[i]);
    if (!slug || !hex) continue;

    const display = humanize(slug);
    // TCX naming style — no numeric code in source data, so we use the
    // humanized name itself as the code for uniqueness + display.
    const code = display;
    const { family, hue, saturation, lightness } = classify(hex);
    out.push({
      code,
      name: display,
      hex,
      system: "TCX",
      family,
      hue,
      saturation,
      lightness,
    });
  }
  return out;
}

/** Formula Guide parser (coated + uncoated, same shape). */
function parseFormulaDataset(raw: unknown, system: System): BuildEntry[] {
  const arr: FormulaShape[] = Array.isArray(raw)
    ? (raw as FormulaShape[])
    : ((raw as { colors?: FormulaShape[] })?.colors ?? []);
  const out: BuildEntry[] = [];
  const suffix = system === "Coated" ? "C" : "U";

  for (const entry of arr) {
    const hex = cleanHex(entry.hex);
    if (!hex) continue;
    const rawCode = entry.pantone ?? entry.code ?? entry.name ?? "";
    if (!rawCode) continue;

    // "100-c" -> "100 C", "7401-c" -> "7401 C", "cool-gray-1-c" -> "Cool Gray 1 C"
    let body = rawCode.trim().toLowerCase();
    body = body.replace(/-(c|cp|u)$/i, "");
    // Split into tokens; title-case non-numeric; preserve numeric.
    const parts = body.split(/-+/).filter(Boolean).map((tok) =>
      /^\d+$/.test(tok) ? tok : tok[0].toUpperCase() + tok.slice(1)
    );
    const code = `${parts.join(" ")} ${suffix}`.replace(/\s+/g, " ").trim();

    const { family, hue, saturation, lightness } = classify(hex);
    out.push({
      code,
      name: null, // Formula Guide entries have no names.
      hex,
      system,
      family,
      hue,
      saturation,
      lightness,
    });
  }
  return out;
}

/* ----------------------------- Main routine ------------------------------ */

async function main() {
  console.log("Fetching Pantone datasets...");
  const [namedRaw, coatedRaw, uncoatedRaw] = await Promise.all([
    fetchJson<unknown>(SOURCES.named),
    fetchJson<unknown>(SOURCES.coated),
    fetchJson<unknown>(SOURCES.uncoated),
  ]);

  const named = parseNamedDataset(namedRaw);
  const coated = parseFormulaDataset(coatedRaw, "Coated");
  const uncoated = parseFormulaDataset(uncoatedRaw, "Uncoated");

  console.log(
    `  named(TCX/TPG): ${named.length}, coated: ${coated.length}, uncoated: ${uncoated.length}`
  );

  // Merge, preferring first occurrence (named dataset first).
  const byKey = new Map<string, BuildEntry>();
  const push = (e: BuildEntry) => {
    const key = e.code.toUpperCase();
    if (!byKey.has(key)) byKey.set(key, e);
  };
  named.forEach(push);
  coated.forEach(push);
  uncoated.forEach(push);

  // Attach year to COTY entries. Keys match on code.
  for (const c of COTY) {
    const key = c.code.toUpperCase();
    const existing = byKey.get(key);
    const hex = cleanHex(c.hex)!;
    const { family, hue, saturation, lightness } = classify(hex);
    if (existing) {
      existing.year = c.year;
      // Prefer the COTY hex as canonical if they disagree heavily.
      if (existing.hex.toUpperCase() !== hex) {
        existing.hex = hex;
        existing.family = family;
        existing.hue = hue;
        existing.saturation = saturation;
        existing.lightness = lightness;
      }
      if (!existing.name) existing.name = c.name;
    } else {
      byKey.set(key, {
        code: c.code,
        name: c.name,
        hex,
        system: "TCX",
        family,
        hue,
        saturation,
        lightness,
        year: c.year,
      });
    }
  }

  const all = [...byKey.values()];

  // Stable sort: family spectrum → hue → lightness.
  const FAMILY_ORDER = [
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
  all.sort((a, b) => {
    const fa = FAMILY_ORDER.indexOf(a.family);
    const fb = FAMILY_ORDER.indexOf(b.family);
    if (fa !== fb) return fa - fb;
    if (a.hue !== b.hue) return a.hue - b.hue;
    return a.lightness - b.lightness;
  });

  // Round numeric fields for compact JSON.
  const rounded = all.map((e) => ({
    code: e.code,
    name: e.name,
    hex: e.hex,
    system: e.system,
    family: e.family,
    hue: Math.round(e.hue * 10) / 10,
    saturation: Math.round(e.saturation * 10) / 10,
    lightness: Math.round(e.lightness * 10) / 10,
    ...(e.year ? { year: e.year } : {}),
  }));

  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify(rounded), "utf8");

  // Summary.
  const byFamily = rounded.reduce<Record<string, number>>((acc, c) => {
    acc[c.family] = (acc[c.family] || 0) + 1;
    return acc;
  }, {});
  console.log("\nWrote", OUT);
  console.log("Total:", rounded.length);
  console.log("By family:", byFamily);
  console.log(
    "COTY entries tagged:",
    rounded.filter((c) => c.year != null).length
  );
}

main().catch((err) => {
  console.error("build-colors failed:", err);
  process.exit(1);
});
