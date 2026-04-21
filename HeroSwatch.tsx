import { useMemo } from "react";
import type { PantoneColor } from "../types";
import { bestInk, INK_DARK, titleFor } from "../lib/color";

interface HeroSwatchProps {
  colors: PantoneColor[]; // full dataset
  focusYear?: number;
  onFocusYear: (year: number) => void;
  onOpen: (c: PantoneColor) => void;
}

/* A curated blurb library, one sentence per COTY. Public-record names, our
 * copy. Kept terse so the overlay reads at a glance. */
const BLURBS: Record<number, string> = {
  2000: "A serene, open sky — a millennial beginning.",
  2001: "A rosy, dramatic pink that closed the century's romance.",
  2002: "A confident scarlet that anchored the post-2001 mood.",
  2003: "A translucent warm-weather escape.",
  2004: "A vivid orange that refused subtlety.",
  2005: "A poised ocean tone between green and blue.",
  2006: "A quiet beach-combed neutral.",
  2007: "A spicy, grown-up red with depth.",
  2008: "A composed violet-blue with romantic weight.",
  2009: "An optimistic yellow in a recessionary year.",
  2010: "A tropical, restorative turquoise.",
  2011: "A bright, reviving pink named for a flower.",
  2012: "A warm, sociable orange — courage in hue form.",
  2013: "A lush, growth-forward jewel green.",
  2014: "A mauve-leaning violet with confidence.",
  2015: "A fortified wine-red with earthiness.",
  2016: "A warm, tender blush in a conversation of two tones.",
  2017: "A fresh, leafy green signaling renewal.",
  2018: "A meditative violet with cosmic gravitas.",
  2019: "An energetic, sociable coral.",
  2020: "A timeless, calming blue for a turbulent year.",
  2021: "A pairing of strength and warmth — gray with sunlight.",
  2022: "A playful periwinkle, novel and electric.",
  2023: "A vibrant, unconventional crimson.",
  2024: "A tender, cocooning peach.",
  2025: "A warm, suede-like brown — grounded and sustaining.",
};

export default function HeroSwatch({ colors, focusYear, onFocusYear, onOpen }: HeroSwatchProps) {
  const coty = useMemo(
    () =>
      colors
        .filter((c) => c.year != null)
        .sort((a, b) => (a.year! - b.year!)),
    [colors]
  );

  const featured = useMemo(() => {
    const wanted = focusYear ?? 2025;
    return (
      coty.find((c) => c.year === wanted) ||
      coty[coty.length - 1] ||
      colors[0]
    );
  }, [coty, colors, focusYear]);

  if (!featured) return null;

  const ink = bestInk(featured.hex);
  const blurb = BLURBS[featured.year!] ?? "";

  return (
    <header id="top" className="border-b border-rule">
      {/* Editorial lede above the big block */}
      <div className="mx-auto max-w-[1480px] px-4 md:px-8 pt-10 md:pt-14 pb-6 md:pb-8">
        <div className="mono-caps text-xxs text-muted">The full library · hue by hue</div>
        <h1 className="font-display font-semibold text-4xl md:text-7xl leading-[0.95] tracking-tight mt-3 max-w-[18ch]">
          The Pantone
          <br />
          <span className="text-muted">library,</span> every swatch.
        </h1>
        <p className="mt-5 max-w-[56ch] text-base md:text-lg text-ink/80">
          A hue-grouped, collapsible gallery of the full Pantone color system — TCX, TPG,
          Formula Guide Coated, and Uncoated. Similar tones cluster inside each band the
          way they do when you're flipping through a physical swatch book.
        </p>
      </div>

      {/* Hero block — current Color of the Year */}
      <section
        className="relative w-full h-[40vh] min-h-[340px] md:min-h-[420px] cursor-pointer"
        style={{ backgroundColor: featured.hex }}
        onClick={() => onOpen(featured)}
      >
        <div
          className="absolute left-6 md:left-8 bottom-6 md:bottom-8 pr-6 max-w-[52ch]"
          style={{ color: ink }}
        >
          <div className="mono-caps text-xxs opacity-80">
            Pantone Color of the Year · {featured.year}
          </div>
          <div className="font-display font-semibold text-5xl md:text-7xl leading-none tracking-tight mt-2">
            {titleFor(featured)}
          </div>
          <div className="mono-caps text-xs mt-4 opacity-80">{featured.code}</div>
          {blurb && (
            <p className="text-base md:text-lg mt-4 leading-snug opacity-90">{blurb}</p>
          )}
        </div>
      </section>

      {/* COTY strip */}
      <div className="mx-auto max-w-[1480px] px-4 md:px-8 py-5 overflow-x-auto">
        <div className="flex items-stretch gap-0 min-w-max">
          {coty.map((c) => {
            const active = featured.code === c.code;
            return (
              <button
                key={`${c.year}-${c.code}`}
                type="button"
                onClick={() => onFocusYear(c.year!)}
                className={[
                  "group flex flex-col items-start min-w-[72px] border-t-2",
                  active ? "border-ink" : "border-transparent hover:border-ink/40",
                  "px-2 pt-3 pb-1 transition-colors",
                ].join(" ")}
                aria-label={`${c.year} ${titleFor(c)}`}
              >
                <span
                  className="block w-full h-8 rounded-xs shadow-card"
                  style={{ backgroundColor: c.hex }}
                />
                <span
                  className="mono-caps text-xxs mt-2"
                  style={{ color: active ? INK_DARK : undefined }}
                >
                  {c.year}
                </span>
                <span className="font-mono text-xxs text-muted truncate max-w-[68px]">
                  {titleFor(c)}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}
