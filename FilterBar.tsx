import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import type { PantoneSystem, SortMode } from "../types";

interface FilterBarProps {
  query: string;
  system: PantoneSystem | "ALL";
  sort: SortMode;
  total: number;
  resultsCount: number;
  onQuery: (q: string) => void;
  onSystem: (s: PantoneSystem | "ALL") => void;
  onSort: (s: SortMode) => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  searchInputRef?: React.RefObject<HTMLInputElement>;
}

const SYSTEMS: Array<PantoneSystem | "ALL"> = [
  "ALL",
  "TCX",
  "TPG",
  "Coated",
  "Uncoated",
];

const SORT_LABEL: Record<SortMode, string> = {
  hue: "Hue within band",
  lightness: "Lightness",
  name: "Name",
  code: "Code",
};

export default function FilterBar({
  query,
  system,
  sort,
  total,
  resultsCount,
  onQuery,
  onSystem,
  onSort,
  onExpandAll,
  onCollapseAll,
  searchInputRef,
}: FilterBarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const localRef = useRef<HTMLInputElement>(null);
  const ref = searchInputRef ?? localRef;

  // Close the mobile sheet on Esc.
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  return (
    <div className="sticky top-0 z-40 bg-paper/92 backdrop-blur border-b border-rule">
      <div className="mx-auto max-w-[1480px] px-4 md:px-8 py-3 flex items-center gap-3">
        {/* Wordmark */}
        <a
          href="#top"
          className="font-display font-semibold text-lg leading-none tracking-tight mr-2 hidden sm:block"
        >
          Pantone<span className="text-muted">·Gallery</span>
        </a>

        {/* Search */}
        <div className="relative flex-1 max-w-[520px]">
          <input
            ref={ref}
            type="search"
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="Search by name or code  /"
            aria-label="Search colors"
            className="w-full h-9 px-3 pr-10 bg-card border border-rule rounded-sm font-mono text-sm placeholder:text-muted-soft focus:outline-none focus:border-ink"
          />
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 mono-caps text-xxs text-muted-soft">
            <kbd className="kbd">/</kbd>
          </span>
        </div>

        {/* Results pill */}
        <span className="hidden md:inline mono-caps text-xxs text-muted whitespace-nowrap">
          {resultsCount.toLocaleString()} / {total.toLocaleString()}
        </span>

        {/* Desktop controls */}
        <div className="hidden md:flex items-center gap-2 ml-auto">
          <Select
            label="System"
            value={system}
            onChange={(v) => onSystem(v as PantoneSystem | "ALL")}
            options={SYSTEMS.map((s) => ({
              value: s,
              label: s === "ALL" ? "All systems" : s,
            }))}
          />
          <Select
            label="Sort"
            value={sort}
            onChange={(v) => onSort(v as SortMode)}
            options={(Object.keys(SORT_LABEL) as SortMode[]).map((s) => ({
              value: s,
              label: SORT_LABEL[s],
            }))}
          />
          <div className="hairline-soft h-6 w-px bg-rule" />
          <button
            type="button"
            onClick={onExpandAll}
            className="mono-caps text-xxs text-muted hover:text-ink"
          >
            Expand all
          </button>
          <button
            type="button"
            onClick={onCollapseAll}
            className="mono-caps text-xxs text-muted hover:text-ink"
          >
            Collapse all
          </button>
        </div>

        {/* Mobile trigger */}
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="md:hidden ml-auto mono-caps text-xxs px-2 py-1.5 border border-rule rounded-sm"
          aria-label="Filters"
        >
          Filters
        </button>
      </div>

      {/* Mobile sheet — portaled so it escapes the sticky FilterBar's
          backdrop-filter containing block (which would otherwise trap a
          position:fixed child to the FilterBar's own box). */}
      {createPortal(
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-50 bg-ink/40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              className="fixed right-0 top-0 bottom-0 z-50 w-[88%] max-w-[360px] bg-card p-6 shadow-modal flex flex-col gap-5"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-display font-semibold text-xl">Filters</h3>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="mono-caps text-xxs text-muted"
                >
                  Close
                </button>
              </div>
              <div className="flex flex-col gap-3">
                <Select
                  label="System"
                  value={system}
                  onChange={(v) => onSystem(v as PantoneSystem | "ALL")}
                  options={SYSTEMS.map((s) => ({
                    value: s,
                    label: s === "ALL" ? "All systems" : s,
                  }))}
                  block
                />
                <Select
                  label="Sort"
                  value={sort}
                  onChange={(v) => onSort(v as SortMode)}
                  options={(Object.keys(SORT_LABEL) as SortMode[]).map((s) => ({
                    value: s,
                    label: SORT_LABEL[s],
                  }))}
                  block
                />
                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      onExpandAll();
                      setMobileOpen(false);
                    }}
                    className="flex-1 mono-caps text-xxs px-3 py-2 border border-rule rounded-sm"
                  >
                    Expand all
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onCollapseAll();
                      setMobileOpen(false);
                    }}
                    className="flex-1 mono-caps text-xxs px-3 py-2 border border-rule rounded-sm"
                  >
                    Collapse all
                  </button>
                </div>
              </div>
              <div className="mt-auto mono-caps text-xxs text-muted">
                {resultsCount.toLocaleString()} / {total.toLocaleString()}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>,
      document.body
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

interface SelectProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  block?: boolean;
}

function Select({ label, value, onChange, options, block }: SelectProps) {
  return (
    <label className={["flex items-center gap-2", block ? "w-full" : ""].join(" ")}>
      <span className="mono-caps text-xxs text-muted whitespace-nowrap">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={[
          "h-8 px-2 pr-7 font-mono text-xs bg-card border border-rule rounded-sm appearance-none focus:outline-none focus:border-ink",
          block ? "w-full" : "",
        ].join(" ")}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 6'><path d='M0 0l5 6 5-6z' fill='%236e6b63'/></svg>\")",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 8px center",
          backgroundSize: "8px 6px",
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
