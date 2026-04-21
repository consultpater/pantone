import { memo, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { PantoneColor } from "../types";
import { FAMILIES } from "../types";
import BandPreview from "./BandPreview";
import SwatchCard from "./SwatchCard";

interface HueSectionProps {
  family: (typeof FAMILIES)[keyof typeof FAMILIES];
  /** The list to actually render (matches when searching, else all). */
  colors: PantoneColor[];
  /** Full count for the family — for the header badge, independent of search. */
  fullCount: number;
  /** Present only when a search is active; count of matches in this family. */
  matchCount?: number;
  /** Full family (sorted) to drive the band preview, always. */
  bandColors: PantoneColor[];
  expanded: boolean;
  onToggle: (familyId: string) => void;
  onOpen: (c: PantoneColor) => void;
  matchedCodes?: Set<string>;
  anchorId: string;
}

/**
 * Within-section soft windowing. When a family has >500 cards we render the
 * first WINDOW_SIZE eagerly, then extend the window by WINDOW_STEP whenever
 * a sentinel enters the viewport. This keeps "Blues · 643" from blowing up
 * the DOM while still looking instantaneous in practice.
 */
const WINDOW_INITIAL = 200;
const WINDOW_STEP = 200;
const WINDOW_THRESHOLD = 500;

function HueSectionImpl({
  family,
  colors,
  fullCount,
  matchCount,
  bandColors,
  expanded,
  onToggle,
  onOpen,
  matchedCodes,
  anchorId,
}: HueSectionProps) {
  const [windowSize, setWindowSize] = useState(WINDOW_INITIAL);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const count = colors.length;
  const searching = matchCount != null;
  const needsWindowing = count > WINDOW_THRESHOLD;
  const listToRender = useMemo(() => {
    if (!expanded) return [];
    return needsWindowing ? colors.slice(0, windowSize) : colors;
  }, [expanded, colors, needsWindowing, windowSize]);

  // Reset window when section toggles.
  useEffect(() => {
    if (!expanded) setWindowSize(WINDOW_INITIAL);
  }, [expanded]);

  // IntersectionObserver to progressively render the rest.
  useEffect(() => {
    if (!expanded || !needsWindowing) return;
    if (windowSize >= count) return;
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setWindowSize((n) => Math.min(count, n + WINDOW_STEP));
          }
        }
      },
      { rootMargin: "300px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [expanded, needsWindowing, windowSize, count]);

  return (
    <section id={anchorId} className="border-t border-rule/90">
      <button
        type="button"
        onClick={() => onToggle(family.id)}
        className="w-full group text-left flex items-center gap-4 md:gap-6 px-4 md:px-8 py-5 md:py-7 hover:bg-paper-deep/70 transition-colors"
        aria-expanded={expanded}
        aria-controls={`${anchorId}-grid`}
      >
        <span
          className="block w-3 h-3 flex-shrink-0 rounded-xs"
          style={{ backgroundColor: family.accent }}
          aria-hidden="true"
        />
        <h2 className="font-display font-semibold text-2xl md:text-3xl leading-none tracking-tight">
          {family.label}
        </h2>
        <span className="mono-caps text-xxs text-muted">
          {fullCount.toLocaleString()}
          {searching ? (
            <span className="ml-2 text-ink">
              · {matchCount} match{matchCount === 1 ? "" : "es"}
            </span>
          ) : null}
        </span>
        <span className="hidden md:block flex-1 text-sm text-muted truncate pl-2">
          {family.blurb}
        </span>
        <BandPreview colors={bandColors} className="hidden sm:flex" />
        <motion.span
          animate={{ rotate: expanded ? 90 : 0 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="ml-auto sm:ml-0 text-muted font-mono text-lg leading-none w-4 inline-block"
          aria-hidden="true"
        >
          ›
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            id={`${anchorId}-grid`}
            key="grid"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="px-3 md:px-8 pb-10 md:pb-14 pt-2 md:pt-4">
              <div className="grid gap-2 md:gap-3 grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-8">
                {listToRender.map((c) => (
                  <SwatchCard
                    key={c.code}
                    color={c}
                    onOpen={onOpen}
                    highlight={matchedCodes?.has(c.code) ?? false}
                  />
                ))}
              </div>
              {needsWindowing && windowSize < count && (
                <div
                  ref={sentinelRef}
                  className="h-8 mt-6 flex items-center justify-center mono-caps text-xxs text-muted"
                >
                  Loading more · {windowSize} / {count}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

const HueSection = memo(HueSectionImpl);
export default HueSection;
