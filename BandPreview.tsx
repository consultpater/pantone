import { memo, useMemo } from "react";
import type { PantoneColor } from "../types";

/**
 * A 30-swatch strip that previews a family in its section header.
 * We sample evenly across the (already hue-sorted) members so the strip
 * reads as a gradient of that family's range.
 */
interface BandPreviewProps {
  colors: PantoneColor[];
  count?: number;
  className?: string;
}

function pickSamples(colors: PantoneColor[], count: number): PantoneColor[] {
  if (colors.length <= count) return colors;
  const out: PantoneColor[] = [];
  const step = colors.length / count;
  for (let i = 0; i < count; i++) {
    out.push(colors[Math.floor(i * step)]);
  }
  return out;
}

function BandPreviewImpl({ colors, count = 30, className }: BandPreviewProps) {
  const samples = useMemo(() => pickSamples(colors, count), [colors, count]);
  return (
    <div
      className={["flex h-4 w-full max-w-[260px] min-w-[160px] overflow-hidden rounded-xs", className]
        .filter(Boolean)
        .join(" ")}
      aria-hidden="true"
    >
      {samples.map((c, i) => (
        <span
          key={`${c.code}-${i}`}
          className="block h-full flex-1"
          style={{ backgroundColor: c.hex }}
        />
      ))}
    </div>
  );
}

const BandPreview = memo(BandPreviewImpl);
export default BandPreview;
