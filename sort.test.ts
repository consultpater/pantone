import { describe, it, expect } from "vitest";
import { sortColors, compareCode } from "./sort";
import type { PantoneColor } from "../types";

const mk = (over: Partial<PantoneColor>): PantoneColor => ({
  code: "TEST",
  name: null,
  hex: "#000000",
  system: "TCX",
  family: "red",
  hue: 0,
  saturation: 50,
  lightness: 50,
  ...over,
});

describe("sortColors", () => {
  const sample: PantoneColor[] = [
    mk({ code: "B", name: "Bravo", hue: 200, lightness: 60 }),
    mk({ code: "A", name: "alpha", hue: 100, lightness: 20 }),
    mk({ code: "C", name: "Charlie", hue: 50, lightness: 80 }),
  ];

  it("sorts by hue ascending", () => {
    const r = sortColors(sample, "hue").map((c) => c.hue);
    expect(r).toEqual([50, 100, 200]);
  });

  it("sorts by lightness ascending", () => {
    const r = sortColors(sample, "lightness").map((c) => c.lightness);
    expect(r).toEqual([20, 60, 80]);
  });

  it("sorts by name case-insensitively", () => {
    const r = sortColors(sample, "name").map((c) => c.name);
    expect(r).toEqual(["alpha", "Bravo", "Charlie"]);
  });
});

describe("compareCode — natural number order", () => {
  it("sorts 100 C before 1000 C", () => {
    const a = mk({ code: "100 C" });
    const b = mk({ code: "1000 C" });
    expect(compareCode(a, b)).toBeLessThan(0);
  });

  it("sorts 18-1750 TCX before 19-1664 TCX", () => {
    const a = mk({ code: "18-1750 TCX" });
    const b = mk({ code: "19-1664 TCX" });
    expect(compareCode(a, b)).toBeLessThan(0);
  });
});
