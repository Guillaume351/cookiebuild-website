/**
 * Local-development fixtures for the Build Battle gallery front-end.
 * Only loaded (dynamic import) when the server runs with
 * COOKIEBUILD_BUILD_GALLERY_MOCK=1, so the pages and the 3D viewer can be
 * rendered without a database or the backend API. Also used by unit tests.
 */
import { encodeBuildPayload, voxelIndex, type BuildBlocksPayload, type BuildDetail, type BuildPage, type BuildSummary } from "./build-gallery";

const SIZE: [number, number, number] = [27, 23, 27];
const THEMES: [string, string][] = [
  ["farm", "Farm"], ["castle", "Castle"], ["pirate_ship", "Pirate ship"], ["treehouse", "Treehouse"],
  ["volcano", "Volcano"], ["lighthouse", "Lighthouse"], ["candy_shop", "Candy shop"], ["space_station", "Space station"],
];
const PLAYERS = ["CookieMaster", "Lunaa_", "BlockyBen", "xX_Creeper_Xx", "PixelPaul", "Zoé_Builds", "Steve2014", "Mira"];

/** Procedural little house with a garden: exercises cubes, slabs, stairs, panes, plants, fences, water, leaves and logs. */
export function createMockBuildPayload(seed = 0): BuildBlocksPayload {
  const palette = [
    "minecraft:air",
    "minecraft:grass_block[snowy=false]",
    "minecraft:oak_planks",
    "minecraft:oak_log[axis=y]",
    "minecraft:glass_pane[east=true,north=false,south=false,waterlogged=false,west=true]",
    "minecraft:spruce_stairs[facing=north,half=bottom,shape=straight,waterlogged=false]",
    "minecraft:spruce_stairs[facing=south,half=bottom,shape=straight,waterlogged=false]",
    "minecraft:spruce_slab[type=bottom,waterlogged=false]",
    "minecraft:oak_door[facing=south,half=lower,hinge=left,open=false,powered=false]",
    "minecraft:oak_door[facing=south,half=upper,hinge=left,open=false,powered=false]",
    "minecraft:poppy",
    "minecraft:dandelion",
    "minecraft:oak_fence[east=true,north=false,south=false,waterlogged=false,west=true]",
    "minecraft:water[level=0]",
    "minecraft:oak_leaves[distance=1,persistent=true,waterlogged=false]",
    "minecraft:cobblestone",
    "minecraft:torch",
    "minecraft:short_grass",
    "minecraft:white_stained_glass",
    seed % 2 ? "minecraft:red_wool" : "minecraft:blue_wool",
    "minecraft:player_head[rotation=0]",
    "minecraft:some_future_block",
  ];
  const voxels = new Uint16Array(SIZE[0] * SIZE[1] * SIZE[2]);
  const set = (x: number, y: number, z: number, index: number) => {
    if (x < 0 || y < 0 || z < 0 || x >= SIZE[0] || y >= SIZE[1] || z >= SIZE[2]) return;
    voxels[voxelIndex(SIZE, x, y, z)] = index;
  };

  // Floor.
  for (let x = 0; x < 27; x += 1) for (let z = 0; z < 27; z += 1) set(x, 0, z, 1);
  // House walls 9x9 from (4,1,4), 5 high.
  for (let y = 1; y <= 5; y += 1) {
    for (let i = 4; i <= 12; i += 1) {
      for (const [x, z] of [[i, 4], [i, 12], [4, i], [12, i]] as const) {
        const corner = (x === 4 || x === 12) && (z === 4 || z === 12);
        set(x, y, z, corner ? 3 : y === 1 ? 15 : 2);
      }
    }
  }
  // Windows and door.
  for (const x of [6, 7, 9, 10]) set(x, 3, 4, 4);
  set(8, 1, 12, 8);
  set(8, 2, 12, 9);
  set(8, 3, 13, 16);
  // Roof: stairs on both sides, slab ridge.
  for (let step = 0; step < 5; step += 1) {
    for (let x = 3; x <= 13; x += 1) {
      set(x, 6 + step, 3 + step, 6);
      set(x, 6 + step, 13 - step, 5);
    }
  }
  for (let step = 0; step < 5; step += 1) {
    for (let x = 3; x <= 13; x += 1) {
      for (let z = 4 + step; z <= 12 - step; z += 1) if (z !== 3 + step && z !== 13 - step) set(x, 6 + step, z, 0);
    }
    for (let z = 4 + step; z <= 12 - step; z += 1) {
      set(4, 6 + step, z, 2);
      set(12, 6 + step, z, 2);
    }
  }
  for (let x = 3; x <= 13; x += 1) set(x, 10, 8, 7);
  // Tree.
  for (let y = 1; y <= 6; y += 1) set(20, y, 20, 3);
  for (let x = 18; x <= 22; x += 1) for (let z = 18; z <= 22; z += 1) for (let y = 5; y <= 8; y += 1) {
    if (Math.abs(x - 20) + Math.abs(z - 20) + Math.max(0, y - 6) <= 4 && !(x === 20 && z === 20 && y <= 6)) set(x, y, z, 14);
  }
  // Pond, fence, flowers, grass.
  for (let x = 17; x <= 23; x += 1) for (let z = 4; z <= 9; z += 1) set(x, 0, z, 13);
  for (let x = 2; x <= 24; x += 1) set(x, 1, 25, 12);
  for (const [x, z, flower] of [[6, 15, 10], [7, 17, 11], [10, 16, 10], [14, 19, 11], [3, 20, 17], [5, 22, 17], [12, 22, 17]] as const) set(x, 1, z, flower);
  // Glass statue + wool block + head + unknown block (fallback colour).
  for (let y = 1; y <= 3; y += 1) set(15 + (seed % 3), y, 15, 18);
  set(22, 1, 14, 19);
  set(22, 2, 14, 20);
  set(24, 1, 14, 21);
  return encodeBuildPayload(SIZE, palette, voxels);
}

function mockSummary(index: number): BuildSummary {
  const [themeKey, theme] = THEMES[index % THEMES.length]!;
  const shortCode = `Mock${String(index).padStart(4, "0")}`;
  const outcome = index % 5 === 4 ? "solo" : "judged";
  return {
    id: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
    shortCode,
    playerName: PLAYERS[index % PLAYERS.length]!,
    theme,
    themeKey,
    outcome,
    placement: outcome === "solo" ? null : (index % 4) + 1,
    builders: outcome === "solo" ? 1 : 4,
    blockCount: 1200 + index * 37,
    size: SIZE,
    likeCount: Math.max(0, 140 - index * 3),
    createdAt: new Date(Date.UTC(2026, 9, 3, 18) - index * 3_600_000 * 7).toISOString(),
    url: `https://www.cookie-build.com/builds/${shortCode}`,
    ogImageUrl: "/maps/buildbattles-legacy-buildbattles.webp",
  };
}

export const MOCK_BUILDS: BuildSummary[] = Array.from({ length: 40 }, (_, index) => mockSummary(index));

export function mockBuildPage(query: { sort?: string; period?: string; cursor?: string | null; limit?: number; player?: string }): BuildPage {
  const limit = Math.min(48, Math.max(1, query.limit ?? 24));
  let items = [...MOCK_BUILDS];
  if (query.player) items = items.filter((item) => item.playerName.toLowerCase() === query.player!.toLowerCase());
  if (query.sort === "recent") items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  else items.sort((a, b) => b.likeCount - a.likeCount);
  if (query.period === "week") items = items.slice(0, 10);
  if (query.period === "month") items = items.slice(0, 30);
  const start = Number.parseInt(query.cursor ?? "0", 10) || 0;
  const page = items.slice(start, start + limit);
  return { items: page, nextCursor: start + limit < items.length ? String(start + limit) : null };
}

export function mockBuildDetail(shortCode: string): BuildDetail | null {
  const build = MOCK_BUILDS.find((item) => item.shortCode === shortCode);
  return build ? { ...build, liked: false } : null;
}
