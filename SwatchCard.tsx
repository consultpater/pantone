import { memo, useState } from "react";
import { motion } from "framer-motion";
import type { PantoneColor } from "../types";
import { bestInk } from "../lib/color";

interface SwatchCardProps {
  color: PantoneColor;
  onOpen: (c: PantoneColor) => void;
  /** Highlight ring when this card matches the active search. */
  highlight?: boolean;
}

function SwatchCardImpl({ color, onOpen, highlight }: SwatchCardProps) {
  const [copied, setCopied] = useState(false);
  const ink = bestInk(color.hex);
  const hasName = color.name != null;

  const copyHex = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(color.hex);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1100);
    } catch {
      // Ignore — clipboard API can reject for security reasons.
    }
  };

  return (
    <motion.button
      layoutId={`swatch-${color.code}`}
      type="button"
      onClick={() => onOpen(color)}
      className={[
        "group relative flex flex-col text-left bg-card overflow-hidden",
        "rounded-sm shadow-card transition-shadow duration-150",
        "hover:shadow-hover focus-visible:shadow-hover",
        "aspect-[3/4]",
        highlight ? "ring-2 ring-ink/90" : "",
      ].join(" ")}
      aria-label={`${hasName ? color.name + ", " : ""}${color.code}, ${color.hex}`}
      data-color-code={color.code}
    >
      {/* Color field — ~75% of card */}
      <div
        className="relative w-full flex-[3] min-h-0"
        style={{ backgroundColor: color.hex }}
      >
        {/* COTY badge */}
        {color.year != null && (
          <span
            className="absolute top-1.5 left-1.5 mono-caps text-xxs px-1.5 py-0.5 rounded-xs"
            style={{
              color: ink,
              background:
                ink === "#1A1A1A" ? "rgba(250,250,247,0.72)" : "rgba(26,26,26,0.68)",
            }}
          >
            COTY {color.year}
          </span>
        )}

        {/* Copy button — hover reveal */}
        <span
          role="button"
          tabIndex={-1}
          onClick={copyHex}
          className={[
            "absolute right-1.5 top-1.5 mono-caps text-xxs px-1.5 py-0.5 rounded-xs",
            "opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity",
            "cursor-copy",
          ].join(" ")}
          style={{
            color: ink,
            background:
              ink === "#1A1A1A" ? "rgba(250,250,247,0.85)" : "rgba(26,26,26,0.78)",
          }}
          aria-label={`Copy ${color.hex}`}
        >
          {copied ? "Copied" : "Copy"}
        </span>
      </div>

      {/* Spec strip */}
      <div className="flex-[1] min-h-0 px-2.5 py-2 flex flex-col justify-center gap-0.5 bg-card">
        {hasName ? (
          <>
            <div className="text-sm leading-tight font-medium text-ink truncate">
              {color.name}
            </div>
            <div className="mono-caps text-xxs text-muted truncate">
              {color.code}
            </div>
          </>
        ) : (
          <div className="mono-caps text-xs text-ink truncate">{color.code}</div>
        )}
        <div className="font-mono text-xxs text-muted-soft truncate">
          {color.hex}
        </div>
      </div>
    </motion.button>
  );
}

const SwatchCard = memo(SwatchCardImpl);
export default SwatchCard;
