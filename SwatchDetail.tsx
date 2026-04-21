import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { PantoneColor } from "../types";
import {
  bestInk,
  cmykString,
  contrast,
  gamutNote,
  harmonies,
  hexToCmyk,
  hexToHsl,
  hexToRgb,
  INK_DARK,
  INK_LIGHT,
  titleFor,
} from "../lib/color";

interface SwatchDetailProps {
  color: PantoneColor | null;
  siblings: PantoneColor[];
  onClose: () => void;
  onNavigate: (c: PantoneColor) => void;
}

export default function SwatchDetail({
  color,
  siblings,
  onClose,
  onNavigate,
}: SwatchDetailProps) {
  // Arrow keys → prev/next within family siblings.
  const siblingIndex = useMemo(() => {
    if (!color) return -1;
    return siblings.findIndex((s) => s.code === color.code);
  }, [color, siblings]);

  const go = useCallback(
    (delta: number) => {
      if (siblingIndex < 0) return;
      const next = siblings[(siblingIndex + delta + siblings.length) % siblings.length];
      if (next) onNavigate(next);
    },
    [siblingIndex, siblings, onNavigate]
  );

  useEffect(() => {
    if (!color) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [color, onClose, go]);

  return (
    <AnimatePresence>
      {color && (
        <DetailInner
          color={color}
          onClose={onClose}
          siblingCount={siblings.length}
          siblingIndex={siblingIndex}
        />
      )}
    </AnimatePresence>
  );
}

interface DetailInnerProps {
  color: PantoneColor;
  onClose: () => void;
  siblingCount: number;
  siblingIndex: number;
}

function DetailInner({
  color,
  onClose,
  siblingCount,
  siblingIndex,
}: DetailInnerProps) {
  const rgb = hexToRgb(color.hex);
  const hsl = hexToHsl(color.hex);
  const cmyk = hexToCmyk(color.hex);
  const h = harmonies(color.hex);
  const gamut = gamutNote(color.hex);
  const ink = bestInk(color.hex);
  const [copied, setCopied] = useState<string | null>(null);

  const copy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      window.setTimeout(() => setCopied(null), 1100);
    } catch {
      /* noop */
    }
  };

  const harmonyChip = (hex: string, label: string) => {
    const isCopied = copied === `h:${hex}`;
    return (
      <button
        key={hex + label}
        type="button"
        onClick={() => copy(hex, `h:${hex}`)}
        className="flex flex-col items-start gap-1"
        title={`${label} · ${hex} · click to copy`}
      >
        <span
          className="block w-full h-10 rounded-xs shadow-card"
          style={{ backgroundColor: hex }}
        />
        <span className="mono-caps text-xxs text-muted">{label}</span>
        <span className="font-mono text-xxs text-ink">
          {isCopied ? "Copied" : hex}
        </span>
      </button>
    );
  };

  return (
    <>
      {/* Backdrop */}
      <motion.div
        className="fixed inset-0 z-50 bg-ink/45"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.16 }}
        onClick={onClose}
      />

      {/* Panel */}
      <motion.div
        className="fixed inset-0 z-50 flex items-stretch justify-center p-0 md:p-8 pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          layoutId={`swatch-${color.code}`}
          className="pointer-events-auto relative flex flex-col md:flex-row bg-card w-full max-w-[1180px] rounded-sm shadow-modal overflow-hidden"
          transition={{ type: "spring", bounce: 0.12, duration: 0.42 }}
        >
          {/* LEFT — full-bleed color */}
          <div
            className="relative w-full md:w-1/2 min-h-[38vh] md:min-h-[72vh]"
            style={{ backgroundColor: color.hex }}
          >
            {color.year != null && (
              <span
                className="absolute top-4 left-4 mono-caps text-xxs px-2 py-1 rounded-xs"
                style={{
                  color: ink,
                  background:
                    ink === INK_DARK ? "rgba(250,250,247,0.78)" : "rgba(26,26,26,0.7)",
                }}
              >
                Pantone Color of the Year · {color.year}
              </span>
            )}
            <div
              className="absolute left-6 bottom-6 md:left-8 md:bottom-8 pr-8 max-w-[520px]"
              style={{ color: ink }}
            >
              <div className="mono-caps text-xxs opacity-80">{color.system}</div>
              <h2 className="font-display font-semibold text-4xl md:text-5xl leading-none tracking-tight mt-2">
                {titleFor(color)}
              </h2>
              <div className="mono-caps text-xs opacity-85 mt-3">{color.code}</div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 mono-caps text-xxs px-2 py-1 rounded-xs"
              style={{
                color: ink,
                background:
                  ink === INK_DARK ? "rgba(250,250,247,0.78)" : "rgba(26,26,26,0.7)",
              }}
              aria-label="Close detail"
            >
              Close · Esc
            </button>
          </div>

          {/* RIGHT — spec sheet */}
          <div className="w-full md:w-1/2 p-6 md:p-10 flex flex-col gap-8 overflow-y-auto max-h-[78vh] md:max-h-[88vh]">
            {/* Spec grid */}
            <div>
              <SectionHeader>Spec</SectionHeader>
              <dl className="grid grid-cols-[88px_1fr] gap-y-2 gap-x-4 text-sm">
                <SpecRow
                  label="HEX"
                  value={color.hex}
                  onCopy={() => copy(color.hex, "hex")}
                  copied={copied === "hex"}
                />
                <SpecRow
                  label="RGB"
                  value={`${rgb.r}, ${rgb.g}, ${rgb.b}`}
                  onCopy={() => copy(`rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`, "rgb")}
                  copied={copied === "rgb"}
                />
                <SpecRow
                  label="HSL"
                  value={`${Math.round(hsl.h)}°, ${Math.round(hsl.s)}%, ${Math.round(hsl.l)}%`}
                  onCopy={() => copy(`hsl(${Math.round(hsl.h)}, ${Math.round(hsl.s)}%, ${Math.round(hsl.l)}%)`, "hsl")}
                  copied={copied === "hsl"}
                />
                <SpecRow
                  label="CMYK"
                  value={`${cmyk.c} · ${cmyk.m} · ${cmyk.y} · ${cmyk.k}`}
                  onCopy={() => copy(cmykString(color.hex), "cmyk")}
                  copied={copied === "cmyk"}
                  hint="approximation"
                />
                <SpecRow
                  label="Family"
                  value={color.family.replace("-", " & ")}
                />
                <SpecRow
                  label="Gamut"
                  value={
                    gamut === "in-gamut"
                      ? "Within sRGB"
                      : gamut === "near-edge"
                        ? "Near sRGB edge"
                        : "Likely clipped in sRGB"
                  }
                />
              </dl>
            </div>

            {/* Contrast */}
            <div>
              <SectionHeader>Contrast</SectionHeader>
              <div className="grid grid-cols-2 gap-3">
                <ContrastTile base={color.hex} ink={INK_DARK} label="vs #1A1A1A" />
                <ContrastTile base={color.hex} ink={INK_LIGHT} label="vs #FAFAF7" />
              </div>
            </div>

            {/* Harmonies */}
            <div>
              <SectionHeader>Harmonies</SectionHeader>
              <div className="grid grid-cols-5 gap-3">
                {harmonyChip(h.complementary, "Complement")}
                {harmonyChip(h.analogous[0], "Analog −30°")}
                {harmonyChip(h.analogous[1], "Analog +30°")}
                {harmonyChip(h.triadic[0], "Triad +120°")}
                {harmonyChip(h.triadic[1], "Triad +240°")}
              </div>
              <p className="text-xs text-muted mt-2">
                Harmonies are computed in HSL from the screen hex and are for visual
                reference only; they are not Pantone-matched.
              </p>
            </div>

            {/* Sibling nav */}
            {siblingCount > 1 && (
              <div className="mt-auto pt-4 border-t border-rule flex items-center justify-between mono-caps text-xxs text-muted">
                <span>
                  {siblingIndex + 1} / {siblingCount} in {color.family.replace("-", " & ")}
                </span>
                <span className="flex items-center gap-2">
                  Use <kbd className="kbd">←</kbd> <kbd className="kbd">→</kbd> to navigate
                </span>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </>
  );
}

/* -------- small visual pieces -------- */

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mono-caps text-xxs text-muted mb-3 border-b border-rule pb-1.5">
      {children}
    </h3>
  );
}

function SpecRow({
  label,
  value,
  onCopy,
  copied,
  hint,
}: {
  label: string;
  value: string;
  onCopy?: () => void;
  copied?: boolean;
  hint?: string;
}) {
  return (
    <>
      <dt className="mono-caps text-xxs text-muted self-center">{label}</dt>
      <dd className="font-mono text-sm text-ink flex items-center gap-2">
        <span>{value}</span>
        {hint && <span className="mono-caps text-xxs text-muted-soft">({hint})</span>}
        {onCopy && (
          <button
            type="button"
            onClick={onCopy}
            className="ml-auto mono-caps text-xxs text-muted hover:text-ink"
          >
            {copied ? "Copied" : "Copy"}
          </button>
        )}
      </dd>
    </>
  );
}

function ContrastTile({
  base,
  ink,
  label,
}: {
  base: string;
  ink: string;
  label: string;
}) {
  const ratio = contrast(base, ink);
  const pass = {
    aa: ratio >= 4.5,
    aaa: ratio >= 7,
    aaLarge: ratio >= 3,
  };
  return (
    <div className="rounded-xs border border-rule overflow-hidden">
      <div
        className="p-3 h-20 flex items-end"
        style={{ backgroundColor: base, color: ink }}
      >
        <span className="font-display font-semibold text-lg leading-none">Aa</span>
      </div>
      <div className="px-3 py-2 flex flex-col gap-0.5 bg-paper-deep/60">
        <div className="mono-caps text-xxs text-muted">{label}</div>
        <div className="font-mono text-sm text-ink">
          {ratio.toFixed(2)}:1
        </div>
        <div className="mono-caps text-xxs text-muted">
          {pass.aaa ? "AAA" : pass.aa ? "AA" : pass.aaLarge ? "AA large" : "Fail"}
        </div>
      </div>
    </div>
  );
}
