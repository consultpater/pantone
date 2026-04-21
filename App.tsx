import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import Fuse from "fuse.js";
import raw from "../data/colors.json";
import type { HueFamily, PantoneColor, PantoneSystem, SortMode } from "../types";
import { FAMILIES, FAMILY_ORDER } from "../types";
import { sortColors } from "../lib/sort";
import { onUrlChange, readState, writeState } from "../lib/url-state";
import FilterBar from "./FilterBar";
import HeroSwatch from "./HeroSwatch";
import HueSection from "./HueSection";
import SwatchDetail from "./SwatchDetail";

/* ------------------------------------------------------------------
 * App.tsx
 *
 * Owns the reducer that coordinates:
 *   - query, sort, system filter, section-expand state, focused color
 *   - URL sync (history.pushState)
 *   - keyboard shortcuts (/, Esc, [, ])
 *   - search-driven auto-expand of matching sections
 * ------------------------------------------------------------------*/

const colors = raw as PantoneColor[];

/* ---------- State shape ---------- */

interface State {
  query: string;
  system: PantoneSystem | "ALL";
  sort: SortMode;
  expanded: Record<HueFamily, boolean>;
  openCode: string | null;
  heroYear: number | undefined;
}

type Action =
  | { type: "query"; q: string }
  | { type: "system"; s: PantoneSystem | "ALL" }
  | { type: "sort"; s: SortMode }
  | { type: "toggle"; family: HueFamily }
  | { type: "expand-all" }
  | { type: "collapse-all" }
  | { type: "open"; code: string }
  | { type: "close" }
  | { type: "focus-year"; year: number }
  | { type: "set-expanded"; value: Record<HueFamily, boolean> };

function allCollapsed(): Record<HueFamily, boolean> {
  return FAMILY_ORDER.reduce(
    (acc, f) => ({ ...acc, [f]: false }),
    {} as Record<HueFamily, boolean>
  );
}
function allExpanded(): Record<HueFamily, boolean> {
  return FAMILY_ORDER.reduce(
    (acc, f) => ({ ...acc, [f]: true }),
    {} as Record<HueFamily, boolean>
  );
}

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case "query":
      return { ...s, query: a.q };
    case "system":
      return { ...s, system: a.s };
    case "sort":
      return { ...s, sort: a.s };
    case "toggle":
      return { ...s, expanded: { ...s.expanded, [a.family]: !s.expanded[a.family] } };
    case "expand-all":
      return { ...s, expanded: allExpanded() };
    case "collapse-all":
      return { ...s, expanded: allCollapsed() };
    case "set-expanded":
      return { ...s, expanded: a.value };
    case "open":
      return { ...s, openCode: a.code };
    case "close":
      return { ...s, openCode: null };
    case "focus-year":
      return { ...s, heroYear: a.year };
  }
}

/* ---------- Initial state from URL ---------- */
function initFromUrl(): State {
  const u = readState();
  const expanded = allCollapsed();
  if (u.family && expanded[u.family] !== undefined) expanded[u.family] = true;
  return {
    query: u.q ?? "",
    system: u.system ?? "ALL",
    sort: "hue",
    expanded,
    openCode: u.color ?? null,
    heroYear: undefined,
  };
}

/* ================================================================= */

export default function App() {
  const [state, dispatch] = useReducer(reducer, undefined, initFromUrl);
  const searchRef = useRef<HTMLInputElement>(null);

  /* ---------- Filter by system ---------- */
  const bySystem = useMemo(() => {
    if (state.system === "ALL") return colors;
    return colors.filter((c) => c.system === state.system);
  }, [state.system]);

  /* ---------- Fuse (lazy-built) ---------- */
  const fuse = useMemo(
    () =>
      new Fuse(bySystem, {
        keys: [
          { name: "name", weight: 0.65 },
          { name: "code", weight: 0.35 },
        ],
        threshold: 0.32,
        ignoreLocation: true,
        minMatchCharLength: 2,
      }),
    [bySystem]
  );

  /* ---------- Search match set ---------- */
  const { matchedCodes, searchMatches } = useMemo(() => {
    const q = state.query.trim();
    if (!q) return { matchedCodes: null as Set<string> | null, searchMatches: null as PantoneColor[] | null };
    const results = fuse.search(q, { limit: 5000 }).map((r) => r.item);
    return {
      matchedCodes: new Set(results.map((c) => c.code)),
      searchMatches: results,
    };
  }, [fuse, state.query]);

  /* ---------- Group by family (then sort within) ---------- */
  const grouped = useMemo(() => {
    const base = matchedCodes ? bySystem.filter((c) => matchedCodes.has(c.code)) : bySystem;
    const map = new Map<HueFamily, PantoneColor[]>();
    for (const f of FAMILY_ORDER) map.set(f, []);
    for (const c of base) map.get(c.family)!.push(c);
    const sortedMap = new Map<HueFamily, PantoneColor[]>();
    for (const f of FAMILY_ORDER) {
      sortedMap.set(f, sortColors(map.get(f) ?? [], state.sort));
    }
    return sortedMap;
  }, [bySystem, matchedCodes, state.sort]);

  /* All colors per family, not just matches — for the band preview + count */
  const familyAll = useMemo(() => {
    const map = new Map<HueFamily, PantoneColor[]>();
    for (const f of FAMILY_ORDER) map.set(f, []);
    for (const c of bySystem) map.get(c.family)!.push(c);
    const sortedMap = new Map<HueFamily, PantoneColor[]>();
    for (const f of FAMILY_ORDER) {
      sortedMap.set(f, sortColors(map.get(f) ?? [], state.sort));
    }
    return sortedMap;
  }, [bySystem, state.sort]);

  /* ---------- Auto-expand sections matching a query ---------- */
  useEffect(() => {
    if (!state.query.trim()) return;
    // Which families have matches?
    const next = allCollapsed();
    for (const f of FAMILY_ORDER) {
      if ((grouped.get(f)?.length ?? 0) > 0) next[f] = true;
    }
    dispatch({ type: "set-expanded", value: next });
  }, [state.query, grouped]);

  /* ---------- URL sync ---------- */
  useEffect(() => {
    writeState(
      {
        color: state.openCode ?? undefined,
        system: state.system === "ALL" ? undefined : state.system,
        q: state.query || undefined,
      },
      { replace: true }
    );
  }, [state.openCode, state.system, state.query]);

  useEffect(() => {
    return onUrlChange(() => {
      const u = readState();
      dispatch({ type: "query", q: u.q ?? "" });
      dispatch({ type: "system", s: u.system ?? "ALL" });
      if (u.color) dispatch({ type: "open", code: u.color });
      else dispatch({ type: "close" });
    });
  }, []);

  /* ---------- Keyboard shortcuts ---------- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTyping =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.getAttribute("contenteditable") === "true");

      if (e.key === "/" && !isTyping) {
        e.preventDefault();
        searchRef.current?.focus();
      } else if (e.key === "Escape") {
        if (state.openCode) {
          dispatch({ type: "close" });
        } else if (state.query) {
          dispatch({ type: "query", q: "" });
        } else if (isTyping) {
          (target as HTMLInputElement).blur();
        }
      } else if (!isTyping && (e.key === "[" || e.key === "]")) {
        const order = FAMILY_ORDER;
        const firstExpanded = order.find((f) => state.expanded[f]);
        const idx = firstExpanded ? order.indexOf(firstExpanded) : -1;
        const nextIdx =
          e.key === "]"
            ? (idx + 1 + order.length) % order.length
            : (idx - 1 + order.length) % order.length;
        const target2 = order[Math.max(0, nextIdx)];
        const next = allCollapsed();
        next[target2] = true;
        dispatch({ type: "set-expanded", value: next });
        // Scroll that section into view.
        window.requestAnimationFrame(() => {
          const el = document.getElementById(`hue-${target2}`);
          el?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state.expanded, state.openCode, state.query]);

  /* ---------- Open-color lookup ---------- */
  const openColor: PantoneColor | null = useMemo(() => {
    if (!state.openCode) return null;
    return colors.find((c) => c.code === state.openCode) ?? null;
  }, [state.openCode]);

  const openSiblings: PantoneColor[] = useMemo(() => {
    if (!openColor) return [];
    return familyAll.get(openColor.family) ?? [];
  }, [openColor, familyAll]);

  /* ---------- Total result count for pill ---------- */
  const totalCount = colors.length;
  const visibleCount =
    matchedCodes != null
      ? (searchMatches?.length ?? 0)
      : bySystem.length;

  /* ---------- Handlers ---------- */
  const onToggleSection = useCallback(
    (id: string) => dispatch({ type: "toggle", family: id as HueFamily }),
    []
  );

  const onOpenColor = useCallback((c: PantoneColor) => {
    dispatch({ type: "open", code: c.code });
  }, []);

  const onNavigateDetail = useCallback((c: PantoneColor) => {
    dispatch({ type: "open", code: c.code });
  }, []);

  const onCloseDetail = useCallback(() => dispatch({ type: "close" }), []);

  const onFocusYear = useCallback((y: number) => dispatch({ type: "focus-year", year: y }), []);

  return (
    <div className="min-h-screen bg-paper text-ink">
      <HeroSwatch
        colors={colors}
        focusYear={state.heroYear}
        onFocusYear={onFocusYear}
        onOpen={onOpenColor}
      />

      <FilterBar
        query={state.query}
        system={state.system}
        sort={state.sort}
        total={totalCount}
        resultsCount={visibleCount}
        onQuery={(q) => dispatch({ type: "query", q })}
        onSystem={(s) => dispatch({ type: "system", s })}
        onSort={(s) => dispatch({ type: "sort", s })}
        onExpandAll={() => dispatch({ type: "expand-all" })}
        onCollapseAll={() => dispatch({ type: "collapse-all" })}
        searchInputRef={searchRef}
      />

      <main className="mx-auto max-w-[1480px]">
        {FAMILY_ORDER.map((f) => {
          const all = familyAll.get(f) ?? [];
          if (all.length === 0) return null;
          const matches = matchedCodes ? grouped.get(f) ?? [] : undefined;
          const renderList = matches ?? all;
          return (
            <HueSection
              key={f}
              anchorId={`hue-${f}`}
              family={FAMILIES[f]}
              colors={renderList}
              fullCount={all.length}
              matchCount={matches ? matches.length : undefined}
              bandColors={all}
              expanded={state.expanded[f]}
              onToggle={onToggleSection}
              onOpen={onOpenColor}
              matchedCodes={matchedCodes ?? undefined}
            />
          );
        })}

        {matchedCodes && visibleCount === 0 && (
          <div className="py-20 text-center text-muted">
            <div className="mono-caps text-xxs mb-2">No matches</div>
            <div className="font-display text-2xl">
              Nothing in the library matches &ldquo;{state.query}&rdquo;.
            </div>
          </div>
        )}
      </main>

      <footer className="mt-16 border-t border-rule">
        <div className="mx-auto max-w-[1480px] px-4 md:px-8 py-10 flex flex-col md:flex-row gap-6 md:items-end md:justify-between">
          <div>
            <div className="font-display font-semibold text-2xl leading-tight">
              Pantone Gallery
            </div>
            <div className="mono-caps text-xxs text-muted mt-1">
              An unofficial visualization · {colors.length.toLocaleString()} swatches
            </div>
          </div>
          <p className="max-w-[56ch] text-sm text-muted leading-relaxed">
            Color names are trademarks of Pantone LLC. This is an unofficial
            visualization of publicly available hex approximations. Screen colors
            are approximate and should not be used for print color matching.
          </p>
        </div>
      </footer>

      <SwatchDetail
        color={openColor}
        siblings={openSiblings}
        onClose={onCloseDetail}
        onNavigate={onNavigateDetail}
      />
    </div>
  );
}
