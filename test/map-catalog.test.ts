import { describe, expect, it } from "vitest";
import { findMapPreview, mapCatalog, mapViewerUrl, nomadMaps } from "../utils/map-catalog";
import { buildMarketingSitemap } from "../utils/marketing-sitemap";

describe("public world previews", () => {
  it("keeps the unpublished mode distinct from existing game maps", () => {
    expect(nomadMaps).toHaveLength(3);
    expect(nomadMaps.every((map) => map.status === "preview")).toBe(true);
    expect(mapCatalog.filter((map) => map.status === "available")).toHaveLength(18);
    expect(new Set(mapCatalog.map((map) => map.slug)).size).toBe(mapCatalog.length);
    expect(findMapPreview("../../admin")).toBeUndefined();
  });

  it("uses fixed, local viewer snapshots with each world's actual camera centre", () => {
    const sky = findMapPreview("skywars-legacy-1")!;
    expect(mapViewerUrl(sky)).toBe("/map-viewer/index.html#skywars_legacy_1:-1588.2:48.5:-797.4:303:0.78:0.72:0:0:perspective");
    expect(mapViewerUrl(nomadMaps[0]!, true)).toContain("#oasis_v2:0:76:0:342:0:0:0:1:flat");
    for (const map of mapCatalog) {
      expect(map.image).toMatch(/^\/maps\/[a-z0-9-]+\.webp$/);
      expect(mapViewerUrl(map)).toMatch(/^\/map-viewer\/index\.html#/);
      expect(buildMarketingSitemap()).toContain(`/maps/${map.slug}</loc>`);
    }
  });
});
