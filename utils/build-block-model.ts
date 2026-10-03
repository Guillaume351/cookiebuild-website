/**
 * Maps a Minecraft block state (BlockData.getAsString()) to a lightweight
 * render model for the Build Battle gallery viewer: a few axis-aligned boxes
 * and/or crossed quads, with one texture per face taken from BlueMap's
 * textures.json ("minecraft:block/<name>"). This is a heuristic
 * approximation of Minecraft's block models, tuned for builds, not a full
 * model loader. Pure functions: no three.js, no DOM (unit-tested).
 */
import { isAirName, parseBlockState, type BlockState } from "./build-gallery";

export type FaceDir = "up" | "down" | "north" | "south" | "east" | "west";
export const FACE_DIRS: readonly FaceDir[] = ["up", "down", "north", "south", "east", "west"];
export const OPPOSITE_FACE: Record<FaceDir, FaceDir> = {
  up: "down", down: "up", north: "south", south: "north", east: "west", west: "east",
};

export type RenderClass = "opaque" | "cutout" | "translucent";
export type Rgb = [number, number, number];

export interface BoxPart {
  from: [number, number, number];
  to: [number, number, number];
  /** Texture per face (full resource path) — null means "fallback colour"; a missing key means the face is not drawn. */
  faces: Partial<Record<FaceDir, string | null>>;
}

export interface CrossPart {
  texture: string | null;
  /** Horizontal inset from the block edge (0 = full diagonal). */
  inset: number;
  y0: number;
  y1: number;
}

export interface BlockAppearance {
  name: string;
  render: RenderClass;
  boxes: BoxPart[];
  crosses: CrossPart[];
  /** Faces that fully cover the block boundary with opaque pixels (hide the neighbour's touching face). */
  solidFaces: FaceDir[];
  /** Hide faces touching a neighbour of the same block name (glass, water, ice). */
  cullSame: boolean;
  /** Multiplier applied to faces whose texture is listed in tintTextures (biome colours). */
  tint: Rgb | null;
  tintTextures: string[];
  /** Colour used for faces without texture. */
  fallbackColor: Rgb;
}

export interface TextureLookup {
  has(path: string): boolean;
  /** Average texture colour (BlueMap `color`, rgba 0..1), when known. */
  color?(path: string): [number, number, number, number] | undefined;
}

export const NEUTRAL_COLOR: Rgb = [0.62, 0.62, 0.62];

const TINT = {
  grass: [0.569, 0.741, 0.349] as Rgb, // #91BD59 (plains)
  foliage: [0.467, 0.671, 0.184] as Rgb, // #77AB2F
  birch: [0.502, 0.655, 0.333] as Rgb, // #80A755
  spruce: [0.380, 0.600, 0.380] as Rgb, // #619961
  mangrove: [0.573, 0.776, 0.282] as Rgb, // #92C648
  water: [0.247, 0.463, 0.894] as Rgb, // #3F76E4
  lilyPad: [0.125, 0.502, 0.188] as Rgb, // #208030
  redstone: [0.85, 0.1, 0.05] as Rgb,
};

const WOODS = ["oak", "spruce", "birch", "jungle", "acacia", "dark_oak", "mangrove", "cherry", "pale_oak", "bamboo", "crimson", "warped"];
const COLORS = ["white", "orange", "magenta", "light_blue", "yellow", "lime", "pink", "gray", "light_gray", "cyan", "purple", "blue", "brown", "green", "red", "black"];

const tex = (name: string) => `minecraft:block/${name}`;
const S = 1 / 16;

/** Material specials that do not follow the "<base>", "<base>s", "<base>_planks", "<base>_block" rule. */
const BASE_ALIASES: Record<string, string> = {
  smooth_quartz: "quartz_block_bottom",
  smooth_sandstone: "sandstone_top",
  smooth_red_sandstone: "red_sandstone_top",
  petrified_oak: "oak_planks",
  heavy_weighted: "iron_block",
  light_weighted: "gold_block",
  moss: "moss_block",
  pale_moss: "pale_moss_block",
  snow: "snow",
  quartz: "quartz_block",
  purpur: "purpur_block",
  nether_brick: "nether_bricks",
  red_nether_brick: "red_nether_bricks",
};

const CROSS_NAMES = new Set([
  "short_grass", "grass", "fern", "dead_bush", "short_dry_grass", "tall_dry_grass", "bush", "cobweb", "sugar_cane", "bamboo_sapling",
  "dandelion", "poppy", "blue_orchid", "allium", "azure_bluet", "red_tulip", "orange_tulip", "white_tulip", "pink_tulip",
  "oxeye_daisy", "cornflower", "lily_of_the_valley", "wither_rose", "torchflower", "open_eyeblossom", "closed_eyeblossom",
  "brown_mushroom", "red_mushroom", "crimson_fungus", "warped_fungus", "crimson_roots", "warped_roots", "nether_sprouts",
  "seagrass", "kelp", "kelp_plant", "twisting_vines", "twisting_vines_plant", "weeping_vines", "weeping_vines_plant",
  "hanging_roots", "chain", "iron_chain", "lightning_rod", "end_rod", "brewing_stand", "small_dripleaf", "spore_blossom",
  "amethyst_cluster", "large_amethyst_bud", "medium_amethyst_bud", "small_amethyst_bud", "pointed_dripstone",
  "glow_berries", "cave_vines", "cave_vines_plant", "firefly_bush", "cactus_flower", "wildflowers", "pink_petals", "leaf_litter",
]);
const DOUBLE_PLANTS = new Set(["tall_grass", "large_fern", "sunflower", "lilac", "rose_bush", "peony", "pitcher_plant", "tall_seagrass", "small_dripleaf"]);
const CROPS: Record<string, string> = {
  wheat: "wheat_stage", carrots: "carrots_stage", potatoes: "potatoes_stage", beetroots: "beetroots_stage",
  nether_wart: "nether_wart_stage", sweet_berry_bush: "sweet_berry_bush_stage", torchflower_crop: "torchflower_crop_stage",
  pitcher_crop: "pitcher_crop_top_stage", melon_stem: "melon_stem", pumpkin_stem: "pumpkin_stem",
};
const TINTED_CROSS = new Set(["short_grass", "grass", "fern", "tall_grass", "large_fern", "sugar_cane_unused"]);
const PLANT_PATTERN = /(sapling|_tulip|_orchid|_flower|_bud$|_cluster$|_propagule$|mushroom$|_roots$|_coral$|_coral_fan$|_fan$|torch$|vines?_plant$|_bush$)/;

const HEIGHTS: Record<string, number> = {
  enchanting_table: 12 * S, end_portal_frame: 13 * S, daylight_detector: 6 * S, stonecutter: 9 * S,
  farmland: 15 * S, dirt_path: 15 * S, campfire: 7 * S, soul_campfire: 7 * S, sculk_sensor: 8 * S,
  calibrated_sculk_sensor: 8 * S, sculk_shrieker: 8 * S, cake: 8 * S,
};

const HEAD_COLORS: Record<string, Rgb> = {
  player: [0.42, 0.29, 0.2], skeleton: [0.8, 0.8, 0.78], wither_skeleton: [0.2, 0.2, 0.2], zombie: [0.3, 0.5, 0.3],
  creeper: [0.35, 0.65, 0.3], dragon: [0.1, 0.1, 0.12], piglin: [0.88, 0.6, 0.55],
};

function firstExisting(lookup: TextureLookup, names: (string | null | undefined)[]): string | null {
  for (const name of names) if (name && lookup.has(tex(name))) return tex(name);
  return null;
}

interface CubeTextures { up: string | null; down: string | null; side: string | null }

/** Resolves top/bottom/side textures for the first candidate base name that has any texture. */
function cubeTextures(lookup: TextureLookup, candidates: string[]): CubeTextures | null {
  for (const n of candidates) {
    const side = firstExisting(lookup, [`${n}_side`, n]);
    const up = firstExisting(lookup, [`${n}_top`, `${n}_end`, n]);
    if (!side && !up) continue;
    const down = firstExisting(lookup, [`${n}_bottom`, `${n}_top`, `${n}_end`, n]);
    return { up: up ?? side, down: down ?? up ?? side, side: side ?? up };
  }
  return null;
}

/** Texture candidates for the material of slabs, stairs, walls, fences, plates… */
function materialCandidates(base: string): string[] {
  const unwaxed = base.replace(/^waxed_/, "");
  const alias = BASE_ALIASES[unwaxed];
  const list = alias ? [alias] : [];
  if (WOODS.includes(unwaxed)) list.push(`${unwaxed}_planks`);
  list.push(unwaxed, `${unwaxed}s`, `${unwaxed}_planks`, `${unwaxed}_block`, `${unwaxed}_wool`);
  return list;
}

function materialTextures(lookup: TextureLookup, base: string): CubeTextures | null {
  return cubeTextures(lookup, materialCandidates(base));
}

const full = (faces: CubeTextures | null): Partial<Record<FaceDir, string | null>> => ({
  up: faces?.up ?? null,
  down: faces?.down ?? null,
  north: faces?.side ?? null,
  south: faces?.side ?? null,
  east: faces?.side ?? null,
  west: faces?.side ?? null,
});

function box(from: [number, number, number], to: [number, number, number], faces: Partial<Record<FaceDir, string | null>>): BoxPart {
  return { from, to, faces };
}

function horizontalFacing(props: Record<string, string>): "north" | "south" | "east" | "west" {
  const facing = props.facing;
  return facing === "south" || facing === "east" || facing === "west" ? facing : "north";
}

/** A thin box against the wall opposite to `facing` (ladders, wall signs, buttons…). */
function wallBox(facing: string, thickness: number, y0: number, y1: number, width = 1, faces: Partial<Record<FaceDir, string | null>> = {}): BoxPart {
  const a = (1 - width) / 2;
  const b = 1 - a;
  switch (facing) {
    case "south": return box([a, y0, 0], [b, y1, thickness], faces);
    case "east": return box([0, y0, a], [thickness, y1, b], faces);
    case "west": return box([1 - thickness, y0, a], [1, y1, b], faces);
    default: return box([a, y0, 1 - thickness], [b, y1, 1], faces);
  }
}

function connected(value: string | undefined) {
  return value !== undefined && value !== "false" && value !== "none";
}

function woodOf(name: string): string | null {
  const unwaxed = name.replace(/^waxed_/, "");
  return [...WOODS].sort((a, b) => b.length - a.length).find((wood) => unwaxed.startsWith(`${wood}_`)) ?? null;
}

function colorOf(name: string): string | null {
  return [...COLORS].sort((a, b) => b.length - a.length).find((color) => name.startsWith(`${color}_`)) ?? null;
}

function leafTint(name: string): Rgb | null {
  if (name.startsWith("birch")) return TINT.birch;
  if (name.startsWith("spruce")) return TINT.spruce;
  if (name.startsWith("mangrove")) return TINT.mangrove;
  if (/^(oak|jungle|acacia|dark_oak)_leaves$/.test(name)) return TINT.foliage;
  return null; // cherry, azalea, pale oak… are not biome-tinted
}

interface Draft extends Partial<BlockAppearance> { boxes: BoxPart[] }

function finalize(name: string, lookup: TextureLookup, draft: Draft): BlockAppearance {
  const faceTextures = draft.boxes.flatMap((part) => Object.values(part.faces)).concat((draft.crosses ?? []).map((cross) => cross.texture));
  const firstTexture = faceTextures.find((value): value is string => Boolean(value));
  const average = firstTexture ? lookup.color?.(firstTexture) : undefined;
  return {
    name,
    render: draft.render ?? "opaque",
    boxes: draft.boxes,
    crosses: draft.crosses ?? [],
    solidFaces: draft.solidFaces ?? [],
    cullSame: draft.cullSame ?? false,
    tint: draft.tint ?? null,
    tintTextures: draft.tintTextures ?? [],
    fallbackColor: draft.fallbackColor ?? (average ? [average[0], average[1], average[2]] : NEUTRAL_COLOR),
  };
}

const ALL_FACES: FaceDir[] = [...FACE_DIRS];

function isTransparentTexture(lookup: TextureLookup, path: string | null) {
  if (!path) return false;
  const color = lookup.color?.(path);
  return color !== undefined && color[3] < 0.99;
}

/** Resolves how a block state is drawn. Returns null for air-like blocks. */
export function resolveBlockAppearance(stateString: string, lookup: TextureLookup): BlockAppearance | null {
  const state = parseBlockState(stateString);
  const { name } = state;
  if (isAirName(name)) return null;
  return finalize(name, lookup, resolveDraft(state, lookup));
}

function resolveDraft(state: BlockState, lookup: TextureLookup): Draft {
  const { name, props } = state;

  // --- liquids, glass and other see-through cubes ---------------------------
  if (name === "water" || name === "bubble_column") {
    const t = firstExisting(lookup, ["water_still"]);
    return { boxes: [box([0, 0, 0], [1, 14 * S, 1], full({ up: t, down: t, side: t }))], render: "translucent", cullSame: true, tint: TINT.water, tintTextures: t ? [t] : [], fallbackColor: TINT.water };
  }
  if (name === "lava") {
    const t = firstExisting(lookup, ["lava_still"]);
    return { boxes: [box([0, 0, 0], [1, 14 * S, 1], full({ up: t, down: t, side: t }))], cullSame: true, fallbackColor: [0.83, 0.35, 0.07] };
  }
  if (name.endsWith("_glass_pane") || name === "glass_pane" || name === "iron_bars") {
    const glass = name === "iron_bars" ? firstExisting(lookup, ["iron_bars"]) : firstExisting(lookup, [name.replace(/_pane$/, "")]);
    const edge = firstExisting(lookup, [`${name}_top`]) ?? glass;
    const faces = { up: edge, down: edge, north: glass, south: glass, east: glass, west: glass };
    const lo = 7 * S;
    const hi = 9 * S;
    const boxes = [box([lo, 0, lo], [hi, 1, hi], faces)];
    if (connected(props.north)) boxes.push(box([lo, 0, 0], [hi, 1, lo], faces));
    if (connected(props.south)) boxes.push(box([lo, 0, hi], [hi, 1, 1], faces));
    if (connected(props.west)) boxes.push(box([0, 0, lo], [lo, 1, hi], faces));
    if (connected(props.east)) boxes.push(box([hi, 0, lo], [1, 1, hi], faces));
    return { boxes, render: name === "glass_pane" || name === "iron_bars" ? "cutout" : "translucent" };
  }
  if (name === "glass" || name.endsWith("_stained_glass") || name === "tinted_glass") {
    const t = firstExisting(lookup, [name]);
    return { boxes: [box([0, 0, 0], [1, 1, 1], full({ up: t, down: t, side: t }))], render: name === "glass" ? "cutout" : "translucent", cullSame: true };
  }
  if (name === "ice" || name === "slime_block" || name === "honey_block" || name === "frosted_ice") {
    const faces = cubeTextures(lookup, [name]);
    return { boxes: [box([0, 0, 0], [1, 1, 1], full(faces))], render: "translucent", cullSame: true };
  }
  if (name.endsWith("_leaves")) {
    const t = firstExisting(lookup, [name]);
    const tint = leafTint(name);
    return { boxes: [box([0, 0, 0], [1, 1, 1], full({ up: t, down: t, side: t }))], render: "cutout", tint, tintTextures: tint && t ? [t] : [], fallbackColor: tint ?? undefined };
  }

  // --- plants (crossed quads) ---------------------------------------------------
  if (DOUBLE_PLANTS.has(name)) {
    const upper = props.half === "upper";
    const t = firstExisting(lookup, upper ? [`${name}_top`, `${name}_front`, name] : [`${name}_bottom`, name]);
    const tinted = TINTED_CROSS.has(name);
    return { boxes: [], crosses: [{ texture: t, inset: 0, y0: 0, y1: 1 }], render: "cutout", tint: tinted ? TINT.grass : null, tintTextures: tinted && t ? [t] : [] };
  }
  if (name in CROPS) {
    const prefix = CROPS[name]!;
    const age = Number.parseInt(props.age ?? "0", 10) || 0;
    const stages = [age, 7, 3, 2, 1, 0].map((stage) => `${prefix}${stage}`);
    const t = firstExisting(lookup, [...stages, prefix, name]);
    return { boxes: [], crosses: [{ texture: t, inset: 0, y0: 0, y1: 1 }], render: "cutout" };
  }
  if (name.endsWith("torch")) {
    const base = name.replace("_wall_torch", "_torch").replace(/^wall_torch$/, "torch");
    const t = firstExisting(lookup, [base, "torch"]);
    return { boxes: [], crosses: [{ texture: t, inset: 0.3, y0: 0, y1: 1 }], render: "cutout", fallbackColor: [1, 0.8, 0.3] };
  }
  if (name.startsWith("potted_") || name === "flower_pot") {
    const pot = firstExisting(lookup, ["flower_pot"]);
    const plant = name.startsWith("potted_") ? name.slice("potted_".length) : null;
    const plantTexture = plant ? firstExisting(lookup, [plant, `${plant}_top`, `${plant}_side`]) : null;
    return {
      boxes: [box([5 * S, 0, 5 * S], [11 * S, 6 * S, 11 * S], full({ up: firstExisting(lookup, ["dirt"]) ?? pot, down: pot, side: pot }))],
      crosses: plant ? [{ texture: plantTexture, inset: 0.2, y0: 4 * S, y1: 1 }] : [],
      render: "cutout",
      fallbackColor: [0.49, 0.27, 0.21],
    };
  }
  if (CROSS_NAMES.has(name) || (PLANT_PATTERN.test(name) && !name.endsWith("mangrove_roots")) || (name.endsWith("_candle") || name === "candle")) {
    const t = firstExisting(lookup, [name, `${name}_stage0`, `${name}_top`, name.replace(/_plant$/, ""), `${name.replace(/_plant$/, "")}_plant`]);
    const tinted = TINTED_CROSS.has(name);
    const small = name.endsWith("candle");
    return { boxes: [], crosses: [{ texture: t, inset: small ? 0.3 : 0, y0: 0, y1: small ? 0.5 : 1 }], render: "cutout", tint: tinted ? TINT.grass : null, tintTextures: tinted && t ? [t] : [] };
  }
  if (name === "vine" || name === "glow_lichen" || name === "sculk_vein" || name === "resin_clump") {
    const t = firstExisting(lookup, [name]);
    const faces = full({ up: t, down: t, side: t });
    const boxes: BoxPart[] = [];
    if (connected(props.north)) boxes.push(box([0, 0, 0], [1, 1, S / 4], faces));
    if (connected(props.south)) boxes.push(box([0, 0, 1 - S / 4], [1, 1, 1], faces));
    if (connected(props.west)) boxes.push(box([0, 0, 0], [S / 4, 1, 1], faces));
    if (connected(props.east)) boxes.push(box([1 - S / 4, 0, 0], [1, 1, 1], faces));
    if (connected(props.up)) boxes.push(box([0, 1 - S / 4, 0], [1, 1, 1], faces));
    if (connected(props.down)) boxes.push(box([0, 0, 0], [1, S / 4, 1], faces));
    if (boxes.length === 0) boxes.push(box([0, 0, 1 - S / 4], [1, 1, 1], faces));
    const tinted = name === "vine";
    return { boxes, render: "cutout", tint: tinted ? TINT.foliage : null, tintTextures: tinted && t ? [t] : [] };
  }
  if (name === "lily_pad") {
    const t = firstExisting(lookup, ["lily_pad"]);
    return { boxes: [box([0, 0, 0], [1, S / 4, 1], { up: t, down: t })], render: "cutout", tint: TINT.lilyPad, tintTextures: t ? [t] : [] };
  }
  if (name === "cactus") {
    const faces = cubeTextures(lookup, ["cactus"]);
    return { boxes: [box([S, 0, S], [15 * S, 1, 15 * S], full(faces))], render: "cutout" };
  }

  // --- partial shapes built from a base material --------------------------------
  if (name.endsWith("_slab")) {
    const material = materialTextures(lookup, name.slice(0, -"_slab".length));
    const side = name === "smooth_stone_slab" ? firstExisting(lookup, ["smooth_stone_slab_side"]) ?? material?.side ?? null : material?.side ?? null;
    const faces = full(material ? { ...material, side } : null);
    if (props.type === "double") return { boxes: [box([0, 0, 0], [1, 1, 1], faces)], solidFaces: ALL_FACES };
    const top = props.type === "top";
    return { boxes: [box([0, top ? 0.5 : 0, 0], [1, top ? 1 : 0.5, 1], faces)], solidFaces: [top ? "up" : "down"] };
  }
  if (name.endsWith("_stairs")) {
    const faces = full(materialTextures(lookup, name.slice(0, -"_stairs".length)));
    const top = props.half === "top";
    const facing = horizontalFacing(props);
    const [y0, y1] = top ? [0.5, 1] : [0, 0.5];
    const [s0, s1] = top ? [0, 0.5] : [0.5, 1];
    const step = { ...faces };
    delete step[top ? "up" : "down"];
    const back: Record<string, [[number, number, number], [number, number, number]]> = {
      north: [[0, s0, 0], [1, s1, 0.5]],
      south: [[0, s0, 0.5], [1, s1, 1]],
      west: [[0, s0, 0], [0.5, s1, 1]],
      east: [[0.5, s0, 0], [1, s1, 1]],
    };
    const [from, to] = back[facing]!;
    return { boxes: [box([0, y0, 0], [1, y1, 1], faces), box(from, to, step)], solidFaces: [top ? "up" : "down", facing] };
  }
  if (name.endsWith("_fence") && !name.endsWith("_fence_gate")) {
    const faces = full(materialTextures(lookup, name.slice(0, -"_fence".length)));
    const boxes = [box([6 * S, 0, 6 * S], [10 * S, 1, 10 * S], faces)];
    for (const [y0, y1] of [[6 * S, 9 * S], [12 * S, 15 * S]] as const) {
      if (connected(props.north)) boxes.push(box([7 * S, y0, 0], [9 * S, y1, 6 * S], faces));
      if (connected(props.south)) boxes.push(box([7 * S, y0, 10 * S], [9 * S, y1, 1], faces));
      if (connected(props.west)) boxes.push(box([0, y0, 7 * S], [6 * S, y1, 9 * S], faces));
      if (connected(props.east)) boxes.push(box([10 * S, y0, 7 * S], [1, y1, 9 * S], faces));
    }
    return { boxes };
  }
  if (name.endsWith("_fence_gate")) {
    const faces = full(materialTextures(lookup, name.slice(0, -"_fence_gate".length)));
    const facing = horizontalFacing(props);
    const alongX = facing === "north" || facing === "south";
    const open = props.open === "true";
    const boxes = alongX
      ? [box([0, 5 * S, 7 * S], [2 * S, 1, 9 * S], faces), box([14 * S, 5 * S, 7 * S], [1, 1, 9 * S], faces)]
      : [box([7 * S, 5 * S, 0], [9 * S, 1, 2 * S], faces), box([7 * S, 5 * S, 14 * S], [9 * S, 1, 1], faces)];
    if (!open) {
      boxes.push(alongX ? box([2 * S, 6 * S, 7 * S], [14 * S, 15 * S, 9 * S], faces) : box([7 * S, 6 * S, 2 * S], [9 * S, 15 * S, 14 * S], faces));
    }
    return { boxes };
  }
  if (name.endsWith("_wall") && !/_(sign|banner|torch|head|skull|fan|hanging_sign)$/.test(name.replace(/_wall$/, "")) && !name.includes("_wall_")) {
    const faces = full(materialTextures(lookup, name.slice(0, -"_wall".length)));
    const boxes = [box([4 * S, 0, 4 * S], [12 * S, 1, 12 * S], faces)];
    const height = (value: string | undefined) => (value === "tall" ? 1 : 14 * S);
    if (connected(props.north)) boxes.push(box([5 * S, 0, 0], [11 * S, height(props.north), 4 * S], faces));
    if (connected(props.south)) boxes.push(box([5 * S, 0, 12 * S], [11 * S, height(props.south), 1], faces));
    if (connected(props.west)) boxes.push(box([0, 0, 5 * S], [4 * S, height(props.west), 11 * S], faces));
    if (connected(props.east)) boxes.push(box([12 * S, 0, 5 * S], [1, height(props.east), 11 * S], faces));
    return { boxes, solidFaces: ["down"] };
  }
  if (name.endsWith("_carpet")) {
    const material = materialTextures(lookup, name.slice(0, -"_carpet".length));
    return { boxes: [box([0, 0, 0], [1, S, 1], full(material))], solidFaces: ["down"] };
  }
  if (name.endsWith("_pressure_plate")) {
    const material = materialTextures(lookup, name.slice(0, -"_pressure_plate".length));
    return { boxes: [box([S, 0, S], [15 * S, S, 15 * S], full(material))] };
  }
  if (name === "snow") {
    const layers = Math.min(8, Math.max(1, Number.parseInt(props.layers ?? "1", 10) || 1));
    const t = firstExisting(lookup, ["snow"]);
    return { boxes: [box([0, 0, 0], [1, layers * 2 * S, 1], full({ up: t, down: t, side: t }))], solidFaces: layers === 8 ? ALL_FACES : ["down"], fallbackColor: [0.97, 0.99, 1] };
  }
  if (name.endsWith("_trapdoor")) {
    const t = firstExisting(lookup, [name]);
    const faces = full({ up: t, down: t, side: t });
    if (props.open === "true") return { boxes: [wallBox(horizontalFacing(props), 3 * S, 0, 1, 1, faces)], render: "cutout" };
    const top = props.half === "top";
    return { boxes: [box([0, top ? 13 * S : 0, 0], [1, top ? 1 : 3 * S, 1], faces)], render: "cutout" };
  }
  if (name.endsWith("_door")) {
    const upper = props.half === "upper";
    const t = firstExisting(lookup, [upper ? `${name}_top` : `${name}_bottom`, name]);
    const facing = horizontalFacing(props);
    // A closed door sits on the side opposite to where it faces.
    const opposite = OPPOSITE_FACE[facing] as "north" | "south" | "east" | "west";
    return { boxes: [wallBox(opposite, 3 * S, 0, 1, 1, full({ up: t, down: t, side: t }))], render: "cutout" };
  }
  if (name.endsWith("_bed")) {
    const color = colorOf(name) ?? "red";
    const wool = firstExisting(lookup, [`${color}_wool`]);
    const planks = firstExisting(lookup, ["oak_planks"]);
    return { boxes: [box([0, 3 * S, 0], [1, 9 * S, 1], { up: wool, north: wool, south: wool, east: wool, west: wool, down: planks })] };
  }
  if (name.endsWith("_banner")) {
    const color = colorOf(name) ?? "white";
    const wool = firstExisting(lookup, [`${color}_wool`]);
    const faces = full({ up: wool, down: wool, side: wool });
    if (name.endsWith("_wall_banner")) return { boxes: [wallBox(horizontalFacing(props), 2 * S, -14 * S, 1, 14 * S, faces)] };
    return { boxes: [box([S, 2 * S, 7 * S], [15 * S, 2, 9 * S], faces)] };
  }
  if (name.endsWith("_sign")) {
    const wood = woodOf(name) ?? "oak";
    const planks = firstExisting(lookup, [`${wood}_planks`, "oak_planks"]);
    const faces = full({ up: planks, down: planks, side: planks });
    if (name.endsWith("_wall_sign") || name.endsWith("_wall_hanging_sign")) return { boxes: [wallBox(horizontalFacing(props), 2 * S, 4 * S, 12 * S, 1, faces)] };
    if (name.endsWith("_hanging_sign")) return { boxes: [box([S, 0, 7 * S], [15 * S, 10 * S, 9 * S], faces)] };
    return { boxes: [box([0, 7 * S, 7 * S], [1, 15 * S, 9 * S], faces), box([7 * S, 0, 7 * S], [9 * S, 7 * S, 9 * S], faces)] };
  }
  if (name.endsWith("_head") || name.endsWith("_skull")) {
    const kind = name.replace(/_wall_(head|skull)$/, "").replace(/_(head|skull)$/, "");
    const color = HEAD_COLORS[kind] ?? HEAD_COLORS.player!;
    const faces = full(null);
    const wall = name.includes("_wall_");
    return { boxes: [wall ? wallBox(horizontalFacing(props), 8 * S, 4 * S, 12 * S, 0.5, faces) : box([4 * S, 0, 4 * S], [12 * S, 8 * S, 12 * S], faces)], fallbackColor: color };
  }
  if (name === "chest" || name === "trapped_chest" || name === "ender_chest" || name.endsWith("copper_chest")) {
    const color: Rgb = name === "ender_chest" ? [0.12, 0.2, 0.2] : name.includes("copper") ? [0.75, 0.45, 0.32] : [0.64, 0.45, 0.21];
    return { boxes: [box([S, 0, S], [15 * S, 14 * S, 15 * S], full(null))], fallbackColor: color, solidFaces: ["down"] };
  }
  if (name.endsWith("_button") || name === "lever") {
    const material = name === "lever" ? firstExisting(lookup, ["cobblestone"]) : materialTextures(lookup, name.slice(0, -"_button".length))?.side ?? null;
    const faces = full({ up: material, down: material, side: material });
    if (props.face === "floor") return { boxes: [box([5 * S, 0, 6 * S], [11 * S, 2 * S, 10 * S], faces)] };
    if (props.face === "ceiling") return { boxes: [box([5 * S, 14 * S, 6 * S], [11 * S, 1, 10 * S], faces)] };
    return { boxes: [wallBox(horizontalFacing(props), 2 * S, 6 * S, 10 * S, 6 * S, faces)] };
  }
  if (name === "ladder") {
    const t = firstExisting(lookup, ["ladder"]);
    return { boxes: [wallBox(horizontalFacing(props), S, 0, 1, 1, full({ up: t, down: t, side: t }))], render: "cutout" };
  }
  if (name.endsWith("rail")) {
    const powered = props.powered === "true";
    const t = firstExisting(lookup, [powered ? `${name}_on` : name, name, "rail"]);
    return { boxes: [box([0, 0, 0], [1, S, 1], { up: t, down: t })], render: "cutout" };
  }
  if (name === "redstone_wire") {
    const t = firstExisting(lookup, ["redstone_dust_dot"]);
    return { boxes: [box([0, 0, 0], [1, S / 4, 1], { up: t })], render: "cutout", tint: TINT.redstone, tintTextures: t ? [t] : [], fallbackColor: TINT.redstone };
  }
  if (name === "lantern" || name === "soul_lantern") {
    const t = firstExisting(lookup, [name]);
    const hanging = props.hanging === "true";
    return { boxes: [box([5 * S, hanging ? S : 0, 5 * S], [11 * S, hanging ? 10 * S : 9 * S, 11 * S], full({ up: t, down: t, side: t }))], render: "cutout", fallbackColor: [0.9, 0.7, 0.3] };
  }
  if (name === "bell" || name === "conduit" || name === "turtle_egg" || name === "sea_pickle" || name === "frogspawn" || name === "decorated_pot") {
    const faces = full(cubeTextures(lookup, [name, `${name}_side`, "bell_bottom"]));
    const size = name === "decorated_pot" ? [S, 1] : [5 * S, 8 * S];
    return { boxes: [box([size[0]!, 0, size[0]!], [1 - size[0]!, size[1]!, 1 - size[0]!], faces)], render: "cutout" };
  }

  // --- full cubes (with orientation) ------------------------------------------------
  return resolveCube(state, lookup);
}

const FRONT_FACING_BLOCKS = /^(furnace|blast_furnace|smoker|dispenser|dropper|observer|carved_pumpkin|jack_o_lantern|loom|beehive|bee_nest|crafter|chiseled_bookshelf|barrel|piston|sticky_piston|respawn_anchor|command_block|chain_command_block|repeating_command_block)$/;

const CUBE_SPECIALS: Record<string, { up?: string[]; down?: string[]; side?: string[]; front?: string[] }> = {
  grass_block: { up: ["grass_block_top"], down: ["dirt"], side: ["grass_block_side"] },
  mycelium: { up: ["mycelium_top"], down: ["dirt"], side: ["mycelium_side"] },
  podzol: { up: ["podzol_top"], down: ["dirt"], side: ["podzol_side"] },
  dirt_path: { up: ["dirt_path_top"], down: ["dirt"], side: ["dirt_path_side"] },
  farmland: { up: ["farmland_moist", "farmland"], down: ["dirt"], side: ["dirt"] },
  bookshelf: { up: ["oak_planks"], down: ["oak_planks"], side: ["bookshelf"] },
  crafting_table: { up: ["crafting_table_top"], down: ["oak_planks"], side: ["crafting_table_side", "crafting_table_front"] },
  carved_pumpkin: { up: ["pumpkin_top"], down: ["pumpkin_top"], side: ["pumpkin_side"], front: ["carved_pumpkin"] },
  jack_o_lantern: { up: ["pumpkin_top"], down: ["pumpkin_top"], side: ["pumpkin_side"], front: ["jack_o_lantern"] },
  snow_block: { up: ["snow"], down: ["snow"], side: ["snow"] },
  quartz_block: { up: ["quartz_block_top"], down: ["quartz_block_bottom", "quartz_block_top"], side: ["quartz_block_side"] },
  smooth_quartz: { up: ["quartz_block_bottom"], down: ["quartz_block_bottom"], side: ["quartz_block_bottom"] },
  smooth_sandstone: { up: ["sandstone_top"], down: ["sandstone_top"], side: ["sandstone_top"] },
  smooth_red_sandstone: { up: ["red_sandstone_top"], down: ["red_sandstone_top"], side: ["red_sandstone_top"] },
  enchanting_table: { up: ["enchanting_table_top"], down: ["enchanting_table_bottom"], side: ["enchanting_table_side"] },
  campfire: { up: ["campfire_log_lit", "campfire_log"], down: ["campfire_log"], side: ["campfire_log"] },
  soul_campfire: { up: ["soul_campfire_log_lit", "campfire_log"], down: ["campfire_log"], side: ["campfire_log"] },
  cake: { up: ["cake_top"], down: ["cake_bottom"], side: ["cake_side"] },
};

function resolveCube(state: BlockState, lookup: TextureLookup): Draft {
  const { name, props } = state;
  const special = CUBE_SPECIALS[name];
  let faces: CubeTextures | null;
  if (special) {
    faces = {
      up: firstExisting(lookup, special.up ?? []),
      down: firstExisting(lookup, special.down ?? special.up ?? []),
      side: firstExisting(lookup, special.side ?? []),
    };
  } else if (/_(wood|hyphae)$/.test(name)) {
    const log = name.replace(/_wood$/, "_log").replace(/_hyphae$/, "_stem");
    const t = firstExisting(lookup, [log]);
    faces = { up: t, down: t, side: t };
  } else {
    faces = cubeTextures(lookup, [name, name.replace(/^waxed_/, ""), name.replace(/^infested_/, ""), `${name}_block`]);
  }

  const result: Partial<Record<FaceDir, string | null>> = full(faces);
  let tint: Rgb | null = null;
  let tintTextures: string[] = [];
  if (name === "grass_block") {
    if (props.snowy === "true") {
      result.up = firstExisting(lookup, ["snow"]);
      for (const dir of ["north", "south", "east", "west"] as const) result[dir] = firstExisting(lookup, ["grass_block_snow"]) ?? result[dir]!;
    } else if (result.up) {
      tint = TINT.grass;
      tintTextures = [result.up];
    }
  }

  // Pillars (logs, basalt, quartz pillars…) rotate their end texture with `axis`.
  if (props.axis === "x" || props.axis === "z") {
    const end = result.up ?? null;
    const side = result.north ?? null;
    if (props.axis === "x") Object.assign(result, { east: end, west: end, up: side, down: side });
    else Object.assign(result, { north: end, south: end, up: side, down: side });
  }

  // Front textures (furnaces, pumpkins, observers…).
  const facing = props.facing;
  if (facing && FRONT_FACING_BLOCKS.test(name)) {
    const lit = props.lit === "true";
    const front = firstExisting(lookup, [...(special?.front ?? []), lit ? `${name}_front_on` : "", `${name}_front`, name === "barrel" ? (props.open === "true" ? "barrel_top_open" : "barrel_top") : "", name.includes("piston") ? "piston_top" : ""]);
    if (front && (facing === "north" || facing === "south" || facing === "east" || facing === "west" || facing === "up" || facing === "down")) {
      result[facing as FaceDir] = front;
      if (name === "barrel" && (facing === "north" || facing === "south" || facing === "east" || facing === "west")) {
        const bottom = firstExisting(lookup, ["barrel_bottom"]);
        result[OPPOSITE_FACE[facing]] = bottom;
        const side = firstExisting(lookup, ["barrel_side"]);
        result.up = side;
        result.down = side;
      }
    }
  }

  const height = HEIGHTS[name] ?? 1;
  const inset = name === "cake" ? S : 0;
  const textures = Object.values(result).filter((value): value is string => Boolean(value));
  const seeThrough = textures.some((path) => isTransparentTexture(lookup, path));
  const isFull = height === 1 && inset === 0;
  return {
    boxes: [box([inset, 0, inset], [1 - inset, height, 1 - inset], result)],
    render: seeThrough ? "cutout" : "opaque",
    solidFaces: seeThrough ? [] : isFull ? ALL_FACES : ["down"],
    tint,
    tintTextures,
  };
}
