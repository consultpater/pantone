import { describe, it, expect } from "vitest";
import {
  bestInk,
  classify,
  cmykString,
  complementary,
  contrast,
  gamutNote,
  harmonies,
  hexToCmyk,
  hexToHsl,
  hexToRgb,
  hslString,
  INK_DARK,
  INK_LIGHT,
} from "./color";

/* ------------------------- Classification ------------------------- */
describe("classify() — family boundaries", () => {
  it("reds wrap at 0/360 and bite into the magenta edge", () => {
    expect(classify("#FF0000").family).toBe("red"); // h=0
    // h ≈ 345.7 — sits just inside the red wrap-around (>= 345)
    expect(classify("#BE3455").family).toBe("red"); // Viva Magenta
    // Rose Quartz h≈1.3 also falls in red.
    expect(classify("#F7CAC9").family).toBe("red");
  });

  it("orange covers 15–45", () => {
    expect(classify("#FF7F00").family).toBe("orange");
    expect(classify("#D98736").family).toBe("orange");
    expect(classify("#A47864").family).toBe("orange"); // Mocha Mousse, h≈18.7
  });

  it("yellows sit in 45–65", () => {
    expect(classify("#F5DF4D").family).toBe("yellow");
    expect(classify("#FFEE00").family).toBe("yellow");
  });

  it("greens are a wide band 65–165", () => {
    expect(classify("#88B04B").family).toBe("green"); // Greenery h≈80
    expect(classify("#00FF00").family).toBe("green"); // pure green h=120
    expect(classify("#2E8B57").family).toBe("green"); // sea green h≈146
  });

  it("cyans sit between green and blue (165–195)", () => {
    expect(classify("#45B5AA").family).toBe("cyan"); // Turquoise
    expect(classify("#7BC4C4").family).toBe("cyan"); // Aqua Sky
    // Emerald #009473 lands at h≈166.6, just inside the cyan side —
    // pin the boundary so nobody silently drifts it.
    expect(classify("#009473").family).toBe("cyan");
  });

  it("blues cover 195–250", () => {
    expect(classify("#0F4C81").family).toBe("blue"); // Classic Blue h≈208
    expect(classify("#6667AB").family).toBe("blue"); // Very Peri h≈239
  });

  it("purples cover 250–290", () => {
    expect(classify("#5F4B8B").family).toBe("purple"); // Ultra Violet h≈259
  });

  it("pinks sit at 290–345 (strictly < 345)", () => {
    expect(classify("#C74375").family).toBe("pink"); // Fuchsia Rose h≈336
    expect(classify("#FF0055").family).toBe("pink"); // h≈340
  });

  it("neutrals are low saturation, mid lightness", () => {
    expect(classify("#939597").family).toBe("neutral"); // Ultimate Gray
    expect(classify("#B4B8B6").family).toBe("neutral");
  });

  it("black-white sits at low saturation, extreme lightness", () => {
    expect(classify("#000000").family).toBe("black-white");
    expect(classify("#FFFFFF").family).toBe("black-white");
    expect(classify("#2A2B2D").family).toBe("black-white"); // Tap Shoe
  });

  it("boundary: saturation=12% exactly is still neutral/bw", () => {
    // 12% saturation exact is a tight boundary; the pipeline uses `<= 12`.
    const { family } = classify("#BDB8AE");
    expect(["neutral", "black-white"]).toContain(family);
  });
});

/* ------------------------- Contrast + ink ------------------------- */
describe("contrast + bestInk", () => {
  it("white ↔ black ≈ 21:1", () => {
    expect(contrast("#FFFFFF", "#000000")).toBeGreaterThan(20);
  });

  it("INK_DARK beats INK_LIGHT on pale backgrounds", () => {
    expect(bestInk("#FFEE00")).toBe(INK_DARK);
    expect(bestInk("#F7CAC9")).toBe(INK_DARK);
  });

  it("INK_LIGHT beats INK_DARK on dark swatches", () => {
    expect(bestInk("#0F4C81")).toBe(INK_LIGHT);
    expect(bestInk("#1A1A1A")).toBe(INK_LIGHT);
  });
});

/* ------------------------- Conversions ------------------------- */
describe("hex conversions", () => {
  it("hexToHsl red is h≈0", () => {
    const hsl = hexToHsl("#FF0000");
    expect(hsl.h).toBeLessThan(1);
    expect(hsl.s).toBeCloseTo(100, 0);
  });

  it("hexToRgb is [0..255]", () => {
    const rgb = hexToRgb("#336699");
    expect(rgb).toEqual({ r: 51, g: 102, b: 153 });
  });

  it("hexToCmyk for pure red ≈ (0,100,100,0)", () => {
    const c = hexToCmyk("#FF0000");
    expect(c.c).toBe(0);
    expect(c.m).toBe(100);
    expect(c.y).toBe(100);
    expect(c.k).toBe(0);
  });

  it("hexToCmyk for pure black is all K", () => {
    const c = hexToCmyk("#000000");
    expect(c.k).toBe(100);
  });

  it("string formatters are well-formed", () => {
    expect(hslString("#FF0000")).toMatch(/^hsl\(/);
    expect(cmykString("#336699")).toMatch(/^cmyk\(/);
  });
});

/* ------------------------- Harmonies ------------------------- */
describe("harmonies", () => {
  it("complementary is 180° opposite", () => {
    const h = complementary("#FF0000"); // red -> cyan-ish
    expect(classify(h).family).toBe("cyan");
  });

  it("harmonies returns three legs", () => {
    const h = harmonies("#BE3455");
    expect(h.complementary).toMatch(/^#[0-9A-F]{6}$/);
    expect(h.analogous).toHaveLength(2);
    expect(h.triadic).toHaveLength(2);
  });
});

/* ------------------------- Gamut note ------------------------- */
describe("gamutNote", () => {
  it("pure saturated red clips or sits near edge", () => {
    expect(["near-edge", "likely-clipped"]).toContain(gamutNote("#FF0000"));
  });

  it("mid-chroma neutrals are in-gamut", () => {
    expect(gamutNote("#A47864")).toBe("in-gamut");
  });
});
