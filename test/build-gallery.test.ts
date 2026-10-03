import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  BuildPayloadError,
  buildDetailPath,
  buildListQuery,
  decodeBuildPayload,
  encodeBuildPayload,
  isBuildShortCode,
  parseBlockState,
  voxelIndex,
} from "../utils/build-gallery";
import { resolveBlockAppearance, type TextureLookup } from "../utils/build-block-model";
import { buildMeshData } from "../utils/build-mesher";
import { createMockBuildPayload, mockBuildPage } from "../utils/build-gallery-mock";
import { BUILD_GALLERY_COPY } from "../utils/build-gallery-copy";
import { SITE_COPY } from "../utils/site-copy";
import { LOCALIZED_MARKETING_PATHS, SITE_LOCALES, localizedSitePath, stripSiteLocale, switchSiteLocalePath } from "../utils/site-locales";

const readSource = (path: string) => readFile(new URL(path, import.meta.url), "utf8");

function fakeLookup(names: string[], colors: Record<string, [number, number, number, number]> = {}): TextureLookup {
  const set = new Set(names.map((name) => `minecraft:block/${name}`));
  return {
    has: (path) => set.has(path),
    color: (path) => colors[path.replace("minecraft:block/", "")] ?? (set.has(path) ? [0.5, 0.5, 0.5, 1] : undefined),
  };
}

const LOOKUP = fakeLookup([
  "oak_planks", "oak_log", "oak_log_top", "grass_block_top", "grass_block_side", "dirt", "glass", "red_stained_glass",
  "oak_leaves", "poppy", "tall_grass_top", "tall_grass_bottom", "stone_bricks", "sandstone", "sandstone_top", "sandstone_bottom",
  "white_wool", "glass_pane_top", "oak_door_bottom", "oak_door_top", "torch", "furnace_front", "furnace_side", "furnace_top",
  "smooth_stone", "smooth_stone_slab_side", "water_still",
], { glass: [0.7, 0.8, 0.9, 0.25] });

describe("build payload decoder", () => {
  it("expands the run-length palette indices in x, then z, then y order", () => {
    const payload = {
      v: 1,
      size: [2, 2, 3],
      palette: ["minecraft:air", "minecraft:stone", "minecraft:oak_planks"],
      // 12 voxels: 1 stone, 2 air, 3 planks, 6 air
      blocks: [1, 1, 0, 2, 2, 3, 0, 6],
    };
    const build = decodeBuildPayload(payload);
    expect(build.size).toEqual([2, 2, 3]);
    expect(build.blockCount).toBe(4);
    expect(Array.from(build.voxels)).toEqual([1, 0, 0, 2, 2, 2, 0, 0, 0, 0, 0, 0]);
    // index = x + z*sx + y*sx*sz: voxel (x=1, y=0, z=1) is the 4th entry.
    expect(build.voxels[voxelIndex(build.size, 1, 0, 1)]).toBe(2);
    expect(build.voxels[voxelIndex(build.size, 1, 0, 2)]).toBe(2);
    expect(build.voxels[voxelIndex(build.size, 0, 1, 0)]).toBe(0);
  });

  it("round-trips through the encoder used by fixtures", () => {
    const payload = createMockBuildPayload(3);
    const build = decodeBuildPayload(JSON.parse(JSON.stringify(payload)));
    expect(encodeBuildPayload(build.size, build.palette, build.voxels)).toEqual(payload);
    expect(build.blockCount).toBeGreaterThan(500);
    expect(build.blockCount).toBeLessThanOrEqual(27 * 23 * 27);
  });

  it.each([
    [{ v: 2, size: [1, 1, 1], palette: ["minecraft:air"], blocks: [0, 1] }, /version/],
    [{ v: 1, size: [1, 1], palette: ["minecraft:air"], blocks: [0, 1] }, /size/],
    [{ v: 1, size: [1, 1, 1], palette: ["minecraft:stone"], blocks: [0, 1] }, /air/],
    [{ v: 1, size: [1, 1, 2], palette: ["minecraft:air"], blocks: [0, 1] }, /covers 1 of 2/],
    [{ v: 1, size: [1, 1, 1], palette: ["minecraft:air"], blocks: [0, 2] }, /overflows/],
    [{ v: 1, size: [1, 1, 1], palette: ["minecraft:air"], blocks: [3, 1] }, /out of range/],
    [{ v: 1, size: [1, 1, 1], palette: ["minecraft:air"], blocks: [0, 0] }, /run length/],
    [{ v: 1, size: [1, 1, 1], palette: ["minecraft:air"], blocks: [0] }, /run-length/],
    [null, /object/],
  ])("rejects malformed payloads (%#)", (payload, message) => {
    expect(() => decodeBuildPayload(payload)).toThrow(BuildPayloadError);
    expect(() => decodeBuildPayload(payload)).toThrow(message);
  });

  it("parses block states with and without properties", () => {
    expect(parseBlockState("minecraft:oak_stairs[facing=north,half=bottom,shape=straight]")).toEqual({
      id: "minecraft:oak_stairs",
      name: "oak_stairs",
      props: { facing: "north", half: "bottom", shape: "straight" },
    });
    expect(parseBlockState("stone")).toEqual({ id: "minecraft:stone", name: "stone", props: {} });
  });
});

describe("block face mapping", () => {
  it("maps plain names, logs (with axis) and grass faces to BlueMap textures", () => {
    const planks = resolveBlockAppearance("minecraft:oak_planks", LOOKUP)!;
    expect(planks.render).toBe("opaque");
    expect(planks.solidFaces).toHaveLength(6);
    expect(planks.boxes[0]!.faces.up).toBe("minecraft:block/oak_planks");

    const log = resolveBlockAppearance("minecraft:oak_log[axis=y]", LOOKUP)!;
    expect(log.boxes[0]!.faces).toMatchObject({ up: "minecraft:block/oak_log_top", north: "minecraft:block/oak_log" });
    const sideways = resolveBlockAppearance("minecraft:oak_log[axis=x]", LOOKUP)!;
    expect(sideways.boxes[0]!.faces).toMatchObject({ east: "minecraft:block/oak_log_top", up: "minecraft:block/oak_log" });

    const grass = resolveBlockAppearance("minecraft:grass_block[snowy=false]", LOOKUP)!;
    expect(grass.boxes[0]!.faces).toMatchObject({ up: "minecraft:block/grass_block_top", north: "minecraft:block/grass_block_side", down: "minecraft:block/dirt" });
    expect(grass.tintTextures).toEqual(["minecraft:block/grass_block_top"]);

    const sandstone = resolveBlockAppearance("minecraft:sandstone", LOOKUP)!;
    expect(sandstone.boxes[0]!.faces).toMatchObject({ up: "minecraft:block/sandstone_top", down: "minecraft:block/sandstone_bottom", south: "minecraft:block/sandstone" });

    const furnace = resolveBlockAppearance("minecraft:furnace[facing=east,lit=false]", LOOKUP)!;
    expect(furnace.boxes[0]!.faces).toMatchObject({ east: "minecraft:block/furnace_front", west: "minecraft:block/furnace_side" });
  });

  it("approximates slabs, stairs, fences, panes, doors and carpets", () => {
    const bottom = resolveBlockAppearance("minecraft:stone_brick_slab[type=bottom]", LOOKUP)!;
    expect(bottom.boxes[0]).toMatchObject({ from: [0, 0, 0], to: [1, 0.5, 1] });
    expect(bottom.boxes[0]!.faces.up).toBe("minecraft:block/stone_bricks");
    expect(bottom.solidFaces).toEqual(["down"]);
    expect(resolveBlockAppearance("minecraft:stone_brick_slab[type=top]", LOOKUP)!.boxes[0]).toMatchObject({ from: [0, 0.5, 0], to: [1, 1, 1] });
    expect(resolveBlockAppearance("minecraft:stone_brick_slab[type=double]", LOOKUP)!.solidFaces).toHaveLength(6);
    expect(resolveBlockAppearance("minecraft:smooth_stone_slab[type=bottom]", LOOKUP)!.boxes[0]!.faces.north).toBe("minecraft:block/smooth_stone_slab_side");

    const stairs = resolveBlockAppearance("minecraft:oak_stairs[facing=north,half=bottom,shape=straight]", LOOKUP)!;
    expect(stairs.boxes).toHaveLength(2);
    expect(stairs.boxes[1]).toMatchObject({ from: [0, 0.5, 0], to: [1, 1, 0.5] });
    expect(stairs.boxes[0]!.faces.north).toBe("minecraft:block/oak_planks");
    expect(stairs.solidFaces).toEqual(["down", "north"]);

    const fence = resolveBlockAppearance("minecraft:oak_fence[east=true,north=false,south=false,west=false]", LOOKUP)!;
    expect(fence.boxes).toHaveLength(3); // post + 2 rails towards east

    const pane = resolveBlockAppearance("minecraft:glass_pane[east=true,north=false,south=false,west=true]", LOOKUP)!;
    expect(pane.boxes).toHaveLength(3);
    expect(pane.render).toBe("cutout");
    expect(pane.boxes[0]!.faces.north).toBe("minecraft:block/glass");

    const door = resolveBlockAppearance("minecraft:oak_door[facing=south,half=upper]", LOOKUP)!;
    expect(door.boxes[0]!.faces.south).toBe("minecraft:block/oak_door_top");
    expect(door.boxes[0]!.to[2]! - door.boxes[0]!.from[2]!).toBeCloseTo(3 / 16);

    const carpet = resolveBlockAppearance("minecraft:white_carpet", LOOKUP)!;
    expect(carpet.boxes[0]!.to[1]).toBeCloseTo(1 / 16);
    expect(carpet.boxes[0]!.faces.up).toBe("minecraft:block/white_wool");
  });

  it("uses crossed quads for plants and transparent classes for glass, leaves and water", () => {
    const poppy = resolveBlockAppearance("minecraft:poppy", LOOKUP)!;
    expect(poppy.boxes).toHaveLength(0);
    expect(poppy.crosses[0]!.texture).toBe("minecraft:block/poppy");
    expect(poppy.render).toBe("cutout");
    expect(resolveBlockAppearance("minecraft:tall_grass[half=upper]", LOOKUP)!.crosses[0]!.texture).toBe("minecraft:block/tall_grass_top");
    expect(resolveBlockAppearance("minecraft:torch", LOOKUP)!.crosses[0]!.texture).toBe("minecraft:block/torch");
    expect(resolveBlockAppearance("minecraft:wall_torch[facing=north]", LOOKUP)!.crosses[0]!.texture).toBe("minecraft:block/torch");

    const glass = resolveBlockAppearance("minecraft:glass", LOOKUP)!;
    expect(glass).toMatchObject({ render: "cutout", cullSame: true, solidFaces: [] });
    expect(resolveBlockAppearance("minecraft:red_stained_glass", LOOKUP)!.render).toBe("translucent");
    const leaves = resolveBlockAppearance("minecraft:oak_leaves[persistent=true]", LOOKUP)!;
    expect(leaves.render).toBe("cutout");
    expect(leaves.tint).not.toBeNull();
    expect(resolveBlockAppearance("minecraft:water[level=0]", LOOKUP)!.render).toBe("translucent");
  });

  it("returns null for air and a fallback colour for unknown blocks", () => {
    expect(resolveBlockAppearance("minecraft:air", LOOKUP)).toBeNull();
    expect(resolveBlockAppearance("minecraft:cave_air", LOOKUP)).toBeNull();
    const unknown = resolveBlockAppearance("minecraft:mystery_block_from_2030", LOOKUP)!;
    expect(unknown.boxes[0]!.faces.up).toBeNull();
    expect(unknown.fallbackColor).toEqual([0.62, 0.62, 0.62]);
    const head = resolveBlockAppearance("minecraft:player_head[rotation=0]", LOOKUP)!;
    expect(head.boxes[0]!.faces.up).toBeNull();
    expect(head.fallbackColor).not.toEqual([0.62, 0.62, 0.62]);
  });

  it("resolves textures for every block of the fixture build with the real BlueMap texture list", async () => {
    const entries = JSON.parse(await readSource("../public/map-viewer/maps/buildbattles_legacy_buildbattles/textures.json")) as { resourcePath: string; color: [number, number, number, number] }[];
    const index = new Map(entries.map((entry) => [entry.resourcePath, entry.color]));
    const lookup: TextureLookup = { has: (path) => index.has(path), color: (path) => index.get(path) };
    const payload = createMockBuildPayload();
    for (const state of payload.palette) {
      const appearance = resolveBlockAppearance(state, lookup);
      if (state === "minecraft:air") {
        expect(appearance).toBeNull();
        continue;
      }
      const textures = [...appearance!.boxes.flatMap((part) => Object.values(part.faces)), ...appearance!.crosses.map((cross) => cross.texture)];
      if (/some_future_block|player_head/.test(state)) expect(textures.every((texture) => texture === null)).toBe(true);
      else expect(textures.every((texture) => texture !== null && index.has(texture)), state).toBe(true);
    }
    for (const state of ["minecraft:quartz_stairs[facing=east,half=top]", "minecraft:cobblestone_wall[north=low,up=true]", "minecraft:bricks", "minecraft:blue_stained_glass_pane[east=true]", "minecraft:spruce_log[axis=z]", "minecraft:jack_o_lantern[facing=north]", "minecraft:white_concrete", "minecraft:wheat[age=7]", "minecraft:sunflower[half=lower]", "minecraft:red_carpet", "minecraft:oak_trapdoor[half=bottom,open=false]"]) {
      const appearance = resolveBlockAppearance(state, lookup)!;
      const textures = [...appearance.boxes.flatMap((part) => Object.values(part.faces)), ...appearance.crosses.map((cross) => cross.texture)];
      expect(textures.length, state).toBeGreaterThan(0);
      expect(textures.every((texture) => texture !== null), state).toBe(true);
    }
  });
});

describe("build mesher", () => {
  const uv = () => [0, 0, 1, 1] as [number, number, number, number];
  const mesh = (size: [number, number, number], palette: string[], voxels: number[]) => {
    const build = decodeBuildPayload(encodeBuildPayload(size, palette, voxels));
    return buildMeshData(build, palette.map((state) => resolveBlockAppearance(state, LOOKUP)), uv);
  };

  it("culls faces hidden between opaque cubes", () => {
    expect(mesh([1, 1, 1], ["minecraft:air", "minecraft:oak_planks"], [1]).opaque.quadCount).toBe(6);
    expect(mesh([2, 1, 1], ["minecraft:air", "minecraft:oak_planks"], [1, 1]).opaque.quadCount).toBe(10);
    // 3x3x3 solid cube: only the 54 outer faces remain.
    expect(mesh([3, 3, 3], ["minecraft:air", "minecraft:oak_planks"], Array(27).fill(1)).opaque.quadCount).toBe(54);
  });

  it("culls same-block glass faces but keeps faces next to partial blocks", () => {
    expect(mesh([2, 1, 1], ["minecraft:air", "minecraft:glass"], [1, 1]).cutout.quadCount).toBe(10);
    // A bottom slab above a cube: the cube's top and the slab's bottom touch fully and are both hidden.
    const slabOnCube = mesh([1, 2, 1], ["minecraft:air", "minecraft:oak_planks", "minecraft:stone_brick_slab[type=bottom]"], [1, 2]);
    expect(slabOnCube.opaque.quadCount).toBe(10);
    // A top slab above a cube leaves a gap: nothing is hidden.
    const topSlab = mesh([1, 2, 1], ["minecraft:air", "minecraft:oak_planks", "minecraft:stone_brick_slab[type=top]"], [1, 2]);
    expect(topSlab.opaque.quadCount).toBe(12);
  });

  it("emits indexed quads with colours and uvs, splitting render classes", () => {
    const data = mesh([3, 1, 1], ["minecraft:air", "minecraft:oak_planks", "minecraft:poppy", "minecraft:red_stained_glass"], [1, 2, 3]);
    expect(data.cutout.quadCount).toBe(2);
    expect(data.translucent.quadCount).toBe(6);
    expect(data.opaque.positions).toHaveLength(data.opaque.quadCount * 12);
    expect(data.opaque.uvs).toHaveLength(data.opaque.quadCount * 8);
    expect(data.opaque.colors).toHaveLength(data.opaque.quadCount * 12);
    expect(data.opaque.indices).toHaveLength(data.opaque.quadCount * 6);
    expect(Math.max(...data.opaque.colors)).toBeLessThanOrEqual(1);
  });

  it("meshes a full 27x23x27 plot quickly and with bounded geometry", () => {
    const size: [number, number, number] = [27, 23, 27];
    const voxels = Array.from({ length: 27 * 23 * 27 }, (_, i) => ((i * 7919) % 3 === 0 ? 1 : 0));
    const start = performance.now();
    const data = mesh(size, ["minecraft:air", "minecraft:oak_planks"], voxels);
    expect(performance.now() - start).toBeLessThan(2_000);
    expect(data.opaque.quadCount).toBeLessThanOrEqual(voxels.filter(Boolean).length * 6);
  });
});

describe("gallery routes, copy and fixtures", () => {
  it("localizes the gallery slug like /fr/rejoindre", () => {
    expect(LOCALIZED_MARKETING_PATHS).toContain("/builds");
    expect(localizedSitePath("/builds", "fr")).toBe("/fr/galerie");
    expect(localizedSitePath("/builds", "en")).toBe("/builds");
    expect(localizedSitePath("/builds", "pt-BR")).toBe("/pt-br/builds");
    expect(buildDetailPath("Ab12Cd34", "fr")).toBe("/fr/galerie/Ab12Cd34");
    expect(buildDetailPath("Ab12Cd34", "de")).toBe("/de/builds/Ab12Cd34");
    expect(stripSiteLocale("/fr/galerie/Ab12Cd34")).toBe("/builds/Ab12Cd34");
    expect(switchSiteLocalePath("/fr/galerie/Ab12Cd34", "es")).toBe("/es/builds/Ab12Cd34");
    expect(switchSiteLocalePath("/builds/Ab12Cd34/embed", "fr")).toBe("/fr/galerie/Ab12Cd34/embed");
  });

  it("declares page aliases for every locale", async () => {
    const pages = {
      "../pages/builds/index.vue": "",
      "../pages/builds/[code]/index.vue": "/:code",
      "../pages/builds/[code]/embed.vue": "/:code/embed",
    };
    for (const [file, suffix] of Object.entries(pages)) {
      const source = await readSource(file);
      for (const locale of SITE_LOCALES.filter((entry) => entry.pathSegment)) {
        expect(source, `${file} ${locale.code}`).toContain(`"${localizedSitePath("/builds", locale.code)}${suffix}"`);
      }
    }
    expect(await readSource("../pages/builds/[code]/index.vue")).toContain('robots: "noindex, follow"');
  });

  it("maps tabs to the list API and validates short codes", () => {
    expect(buildListQuery("week")).toEqual({ sort: "top", period: "week" });
    expect(buildListQuery("all")).toEqual({ sort: "top", period: "all" });
    expect(buildListQuery("recent")).toEqual({ sort: "recent" });
    expect(isBuildShortCode("Ab12Cd34")).toBe(true);
    expect(isBuildShortCode("../etc")).toBe(false);
    expect(isBuildShortCode("x")).toBe(false);
  });

  it("has complete copy in every locale, with French using tu", () => {
    for (const locale of SITE_LOCALES) {
      const copy = BUILD_GALLERY_COPY[locale.code];
      expect(Object.keys(copy.tabs)).toEqual(["week", "month", "all", "recent"]);
      expect(Object.keys(copy.detail.reasons)).toEqual(["offensive", "inappropriate", "other"]);
      expect(copy.title.trim()).not.toBe("");
      expect(copy.detail.moreFrom("Steve")).toContain("Steve");
      expect(copy.likes(2, "2")).toContain("2");
      expect(SITE_COPY[locale.code].navigation.builds.trim()).not.toBe("");
    }
    const french = JSON.stringify(BUILD_GALLERY_COPY.fr) + Object.values(BUILD_GALLERY_COPY.fr.detail).map((value) => (typeof value === "function" ? value("A", "B") : "")).join(" ");
    expect(french).not.toMatch(/\bvous\b|\bvotre\b|\bvos\b/i);
    expect(BUILD_GALLERY_COPY.fr.tabs).toEqual({ week: "Best of semaine", month: "Best of du mois", all: "Tout temps", recent: "Récentes" });
    expect(BUILD_GALLERY_COPY.fr.detail.moreFrom("Steve")).toBe("Autres constructions de Steve");
  });

  it("serves paginated mock pages for local development", () => {
    const first = mockBuildPage({ sort: "top", period: "all", limit: 24 });
    expect(first.items).toHaveLength(24);
    expect(first.nextCursor).toBe("24");
    const second = mockBuildPage({ sort: "top", period: "all", limit: 24, cursor: first.nextCursor });
    expect(second.items).toHaveLength(16);
    expect(second.nextCursor).toBeNull();
    expect(first.items[0]!.likeCount).toBeGreaterThanOrEqual(first.items[1]!.likeCount);
  });
});
