import { BB_TEXTURE_COLORS_ENCODED } from "./block-colors.generated";
import { blockName, blockState } from "./payload";

/** How a block is drawn on the isometric share card. */
export type BlockShape = "none" | "cube" | "bottom-slab" | "top-slab" | "thin" | "small";

export interface BlockStyle {
  shape: BlockShape;
  /** 0xRRGGBB colors of the top and side faces. */
  top: number;
  side: number;
  /** 1 = opaque; lower values are alpha-blended (glass, water, ice). */
  alpha: number;
  /** Full opaque cube: hides the faces of its neighbors that touch it. */
  occludes: boolean;
}

let textureColors: Map<string, number> | null = null;

/** Lazily decodes the generated texture -> 0xRRGGBBAA map. */
export function textureColorMap() {
  if (textureColors) return textureColors;
  textureColors = new Map();
  for (const pair of BB_TEXTURE_COLORS_ENCODED.split(";")) {
    const separator = pair.indexOf("=");
    if (separator > 0) textureColors.set(pair.slice(0, separator), Number.parseInt(pair.slice(separator + 1), 16) >>> 0);
  }
  return textureColors;
}

const INVISIBLE = new Set(["air", "cave_air", "void_air", "barrier", "light", "structure_void", "moving_piston"]);

const GRASS_TINT = 0x91bd59;
const FOLIAGE_TINT = 0x77ab2f;
const TINTS: Array<[RegExp, number]> = [
  [/^(short_grass|grass|tall_grass|fern|large_fern|potted_fern)$/, GRASS_TINT],
  [/^birch_leaves$/, 0x80a755],
  [/^spruce_leaves$/, 0x619961],
  [/^(oak|jungle|acacia|dark_oak|mangrove)_leaves$/, FOLIAGE_TINT],
  [/^(vine|lily_pad)$/, FOLIAGE_TINT],
  [/^(water|water_cauldron|bubble_column)$/, 0x3f76e4],
  [/^redstone_wire$/, 0xc81e1e],
  [/^(melon_stem|pumpkin_stem|attached_melon_stem|attached_pumpkin_stem)$/, 0x8ac043],
];

const FALLBACK_COLOR = 0x9a9a9a;

const THIN = /(_carpet|_pressure_plate|^rail|_rail|^redstone_wire|^lily_pad|^repeater|^comparator|^pink_petals|^leaf_litter|^wildflowers|^tripwire$|^snow$)/;
const SMALL = /(torch|lantern|candle|_button$|^lever$|_sign$|_banner$|_head$|_skull$|^flower_pot|^potted_|_fence$|_fence_gate$|^ladder$|^vine$|^chain$|^end_rod$|^lightning_rod$|^bell$|_coral$|_coral_fan$|^sea_pickle$|^scaffolding$|^cobweb$|^tripwire_hook$|^brewing_stand$|_bars$|^iron_chain$|_chain$|^pointed_dripstone$|^amethyst_cluster$|_bud$|^item_frame$|^glow_item_frame$|^painting$)/;
const TRANSLUCENT = /(glass|^ice$|^frosted_ice$|^water$|^bubble_column$|^slime_block$|^honey_block$)/;

function derivedBases(name: string): string[] {
  const bases = [name];
  const add = (value: string) => {
    if (value && !bases.includes(value)) bases.push(value);
  };
  for (const prefix of ["waxed_", "infested_", "potted_"]) {
    if (name.startsWith(prefix)) add(name.slice(prefix.length));
  }
  if (name.startsWith("potted_")) add("flower_pot");
  const rewrites: Array<[RegExp, string]> = [
    [/_wall_hanging_sign$|_hanging_sign$|_wall_sign$|_sign$/, "_planks"],
    [/_stained_glass_pane$/, "_stained_glass"],
    [/^glass_pane$/, "glass"],
    [/_wall_torch$/, "_torch"],
    [/^wall_torch$/, "torch"],
    [/_wood$/, "_log"],
    [/_hyphae$/, "_stem"],
    [/^moss_carpet$/, "moss_block"],
    [/_carpet$/, "_wool"],
    [/_wall_banner$|_banner$|_bed$/, "_wool"],
    [/_stairs$|_slab$|_wall$|_fence_gate$|_fence$|_pressure_plate$|_button$/, ""],
    [/^smooth_quartz$/, "quartz_block"],
    [/^smooth_sandstone$/, "sandstone"],
    [/^smooth_red_sandstone$/, "red_sandstone"],
    [/^petrified_oak$/, "oak"],
    [/_wall_head$|_head$|_wall_skull$|_skull$/, "_wool"],
    [/^water$/, "water_still"],
    [/^lava$/, "lava_still"],
    [/^bubble_column$/, "water_still"],
    [/^dirt_path$/, "dirt_path_top"],
    [/^snow$/, "snow"],
    [/^chest$|^trapped_chest$/, "oak_planks"],
    [/^ender_chest$/, "obsidian"],
    [/^tall_grass$/, "tall_grass_bottom"],
    [/^large_fern$/, "large_fern_bottom"],
    [/_shulker_box$/, "_shulker_box"],
    [/^(.*)_door$/, "$1_door_bottom"],
  ];
  for (let pass = 0; pass < 2; pass += 1) {
    for (const base of [...bases]) {
      for (const [pattern, replacement] of rewrites) {
        if (pattern.test(base)) add(base.replace(pattern, replacement));
      }
    }
  }
  for (const base of [...bases]) {
    add(`${base}s`); // brick -> bricks, stone_brick -> stone_bricks
    add(`${base}_planks`); // oak -> oak_planks
    add(`${base}_block`); // quartz -> quartz_block, purpur -> purpur_block
    if (base.endsWith("_brick")) add(`${base}s`);
  }
  return bases;
}

function lookupTexture(name: string, face: "top" | "side"): number | null {
  const colors = textureColorMap();
  for (const base of derivedBases(name)) {
    const candidates = face === "top"
      ? [`${base}_top`, base, `${base}_side`, `${base}_front`, `${base}_bottom`, `${base}_still`, `${base}_stage7`, `${base}_stage3`, `${base}_stage0`]
      : [`${base}_side`, base, `${base}_front`, `${base}_top`, `${base}_bottom`, `${base}_still`, `${base}_stage7`, `${base}_stage3`, `${base}_stage0`];
    for (const candidate of candidates) {
      const color = colors.get(candidate);
      if (color !== undefined) return color;
    }
  }
  return null;
}

function multiply(color: number, tint: number) {
  const r = Math.round((((color >>> 16) & 0xff) * ((tint >>> 16) & 0xff)) / 255);
  const g = Math.round((((color >>> 8) & 0xff) * ((tint >>> 8) & 0xff)) / 255);
  const b = Math.round(((color & 0xff) * (tint & 0xff)) / 255);
  return (r << 16) | (g << 8) | b;
}

function shapeOf(name: string, state: Record<string, string>, alpha: number): BlockShape {
  if (name.endsWith("_slab")) {
    if (state.type === "double") return "cube";
    return state.type === "top" ? "top-slab" : "bottom-slab";
  }
  if (name === "snow") {
    const layers = Number(state.layers ?? 1);
    return layers >= 8 ? "cube" : layers >= 4 ? "bottom-slab" : "thin";
  }
  if (name.endsWith("_trapdoor")) {
    if (state.open === "true") return "small";
    return state.half === "top" ? "top-slab" : "thin";
  }
  if (name === "daylight_detector" || name.endsWith("_bed") || name === "stonecutter") return "bottom-slab";
  if (THIN.test(name)) return "thin";
  if (SMALL.test(name)) return "small";
  if (TRANSLUCENT.test(name) || name.endsWith("_leaves")) return "cube";
  // Plants, flowers, saplings, crops: textures with mostly transparent pixels.
  if (alpha < 0.6) return "small";
  return "cube";
}

const styleCache = new Map<string, BlockStyle>();

/** Drawing style of one palette entry (BlockData string), memoized. */
export function blockStyle(entry: string): BlockStyle {
  const cached = styleCache.get(entry);
  if (cached) return cached;
  const name = blockName(entry);
  let style: BlockStyle;
  if (INVISIBLE.has(name)) {
    style = { shape: "none", top: 0, side: 0, alpha: 0, occludes: false };
  } else {
    const topRaw = lookupTexture(name, "top");
    const sideRaw = lookupTexture(name, "side") ?? topRaw;
    const textureAlpha = ((topRaw ?? sideRaw ?? 0xff) & 0xff) / 255;
    let top = topRaw === null ? FALLBACK_COLOR : topRaw >>> 8;
    let side = sideRaw === null ? top : sideRaw >>> 8;
    const tint = TINTS.find(([pattern]) => pattern.test(name))?.[1];
    if (tint !== undefined) {
      top = multiply(top, tint);
      // Grass blocks only have a tinted top; their sides are mostly dirt.
      if (name !== "grass_block") side = multiply(side, tint);
    }
    if (name === "grass_block") top = multiply(lookupTexture("grass_block_top", "top")! >>> 8, GRASS_TINT);
    const shape = shapeOf(name, blockState(entry), textureAlpha);
    const translucent = TRANSLUCENT.test(name);
    const alpha = translucent ? Math.min(0.75, Math.max(0.45, textureAlpha + 0.2)) : 1;
    style = { shape, top, side, alpha, occludes: shape === "cube" && !translucent };
  }
  if (styleCache.size > 20_000) styleCache.clear();
  styleCache.set(entry, style);
  return style;
}
