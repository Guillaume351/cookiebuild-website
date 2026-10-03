import { writeFileSync } from "node:fs";
import { inflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { blockStyle } from "../server/buildbattle/block-colors";
import { fontTokens, isFontRenderable, normalizeFontText } from "../server/buildbattle/bitmap-font";
import { OG_HEIGHT, OG_WIDTH, renderBuildCard } from "../server/buildbattle/og-render";
import { decodeBuildPayload } from "../server/buildbattle/payload";
import { pngDimensions } from "../server/buildbattle/png";
import { fixtureBuildPayloadGzip } from "./fixtures/buildbattle-fixture";

describe("Build Battle share card renderer", () => {
  it("renders a 1200×630 PNG from a small fixture in pure JS", () => {
    const payload = decodeBuildPayload(fixtureBuildPayloadGzip());
    const started = performance.now();
    const png = renderBuildCard({
      payload,
      theme: "Fête foraine d’été",
      fallbackTheme: "Summer",
      playerName: "Cookie_Fan42",
      likeCount: 17,
      locale: "fr",
    });
    const elapsed = performance.now() - started;
    if (process.env.BB_OG_PREVIEW) writeFileSync(process.env.BB_OG_PREVIEW, png);
    expect(pngDimensions(png)).toEqual({ width: OG_WIDTH, height: OG_HEIGHT });
    expect(png.length).toBeGreaterThan(5_000);
    expect(png.length).toBeLessThan(600_000);
    expect(elapsed).toBeLessThan(5_000);

    // IDAT decompresses to (1 filter byte + RGB row) per line.
    const idatStart = png.indexOf(Buffer.from("IDAT")) + 4;
    const idatLength = png.readUInt32BE(idatStart - 8);
    const raw = inflateSync(png.subarray(idatStart, idatStart + idatLength));
    expect(raw.length).toBe((OG_WIDTH * 3 + 1) * OG_HEIGHT);
  });

  it("renders an empty plot without failing", () => {
    const payload = { size: [27, 23, 27] as [number, number, number], palette: ["minecraft:air"], cells: new Uint16Array(27 * 23 * 27) };
    const png = renderBuildCard({ payload, theme: "Farm", fallbackTheme: "Farm", playerName: null, likeCount: 0 });
    expect(pngDimensions(png)).toEqual({ width: OG_WIDTH, height: OG_HEIGHT });
  });

  it("derives face colors from the map viewer textures", () => {
    const planks = blockStyle("minecraft:oak_planks");
    expect(planks.shape).toBe("cube");
    expect(planks.occludes).toBe(true);
    expect(planks.top).not.toBe(0x9a9a9a);
    // Stairs, slabs and walls reuse their base material.
    expect(blockStyle("minecraft:stone_brick_stairs[facing=north]").top).toBe(blockStyle("minecraft:stone_bricks").top);
    expect(blockStyle("minecraft:oak_slab[type=bottom]").shape).toBe("bottom-slab");
    expect(blockStyle("minecraft:oak_slab[type=double]").shape).toBe("cube");
    // Grass and leaves are tinted green; glass is translucent and does not hide neighbors.
    const grass = blockStyle("minecraft:grass_block[snowy=false]").top;
    expect((grass >>> 8) & 0xff).toBeGreaterThan((grass >>> 16) & 0xff);
    const glass = blockStyle("minecraft:glass");
    expect(glass.alpha).toBeLessThan(1);
    expect(glass.occludes).toBe(false);
    expect(blockStyle("minecraft:air").shape).toBe("none");
    expect(blockStyle("minecraft:poppy").shape).toBe("small");
    expect(blockStyle("minecraft:white_carpet").shape).toBe("thin");
  });

  it("draws Latin text and falls back for scripts without glyphs", () => {
    expect(normalizeFontText("Été")).toBe("ETE");
    expect(fontTokens("Été")).toEqual([
      { char: "E", mark: "\u0301" },
      { char: "T", mark: null },
      { char: "E", mark: "\u0301" },
    ]);
    expect(isFontRenderable("Самолет")).toBe(false);
    expect(normalizeFontText("a€b")).toBe("A?B");
  });
});
