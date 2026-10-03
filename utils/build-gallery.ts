import { localizedSitePath, type SiteLocaleCode } from "./site-locales";

/** Public build card returned by GET /api/builds (contract §3). */
export interface BuildSummary {
  id: string;
  shortCode: string;
  playerName: string;
  theme: string;
  themeKey: string;
  outcome: "judged" | "solo" | "forfeit" | string;
  placement: number | null;
  builders: number;
  blockCount: number;
  size: [number, number, number];
  likeCount: number;
  createdAt: string;
  url: string;
  ogImageUrl: string;
}

export interface BuildDetail extends BuildSummary {
  liked: boolean;
}

export interface BuildPage {
  items: BuildSummary[];
  nextCursor: string | null;
}

export type BuildGalleryTab = "week" | "month" | "all" | "recent";
export const BUILD_GALLERY_TABS: readonly BuildGalleryTab[] = ["week", "month", "all", "recent"];
export type BuildReportReason = "offensive" | "inappropriate" | "other";
export const BUILD_REPORT_REASONS: readonly BuildReportReason[] = ["offensive", "inappropriate", "other"];

export function isBuildGalleryTab(value: unknown): value is BuildGalleryTab {
  return typeof value === "string" && (BUILD_GALLERY_TABS as readonly string[]).includes(value);
}

/** Maps a gallery tab to the list API query (sort + period). */
export function buildListQuery(tab: BuildGalleryTab): { sort: "top" | "recent"; period?: "week" | "month" | "all" } {
  return tab === "recent" ? { sort: "recent" } : { sort: "top", period: tab };
}

/** Short codes are 8-char base62 (the column allows up to 10). */
export function isBuildShortCode(value: unknown): value is string {
  return typeof value === "string" && /^[0-9A-Za-z]{4,10}$/.test(value);
}

export const BUILD_GALLERY_PATH = "/builds";

export function buildDetailPath(shortCode: string, locale: SiteLocaleCode) {
  return localizedSitePath(`${BUILD_GALLERY_PATH}/${shortCode}`, locale);
}

export function buildApiPath(shortCode: string, suffix = "") {
  return `/api/builds/${encodeURIComponent(shortCode)}${suffix}`;
}

// ---------------------------------------------------------------------------
// Block payload (contract §1)
// ---------------------------------------------------------------------------

export interface BuildBlocksPayload {
  v: number;
  size: [number, number, number];
  palette: string[];
  blocks: number[];
}

export interface DecodedBuild {
  size: [number, number, number];
  palette: string[];
  /** Palette index per voxel, index = x + z*sx + y*sx*sz. */
  voxels: Uint16Array;
  /** Number of non-air voxels. */
  blockCount: number;
}

export class BuildPayloadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BuildPayloadError";
  }
}

const MAX_AXIS = 128;
const MAX_PALETTE = 4096;

/** Decodes and validates the RLE palette payload. Throws BuildPayloadError. */
export function decodeBuildPayload(raw: unknown): DecodedBuild {
  if (!raw || typeof raw !== "object") throw new BuildPayloadError("payload is not an object");
  const payload = raw as Partial<BuildBlocksPayload>;
  if (payload.v !== 1) throw new BuildPayloadError(`unsupported payload version ${String(payload.v)}`);
  const size = payload.size;
  if (!Array.isArray(size) || size.length !== 3 || !size.every((n) => Number.isInteger(n) && n > 0 && n <= MAX_AXIS)) {
    throw new BuildPayloadError("invalid size");
  }
  const palette = payload.palette;
  if (!Array.isArray(palette) || palette.length === 0 || palette.length > MAX_PALETTE || !palette.every((p) => typeof p === "string")) {
    throw new BuildPayloadError("invalid palette");
  }
  if (parseBlockState(palette[0]!).name !== "air") throw new BuildPayloadError("palette[0] must be air");
  const blocks = payload.blocks;
  if (!Array.isArray(blocks) || blocks.length % 2 !== 0) throw new BuildPayloadError("invalid run-length data");

  const [sx, sy, sz] = size as [number, number, number];
  const total = sx * sy * sz;
  const voxels = new Uint16Array(total);
  const airIndices = new Set<number>();
  palette.forEach((entry, index) => {
    if (isAirName(parseBlockState(entry).name)) airIndices.add(index);
  });
  let cursor = 0;
  let blockCount = 0;
  for (let i = 0; i < blocks.length; i += 2) {
    const index = blocks[i];
    const run = blocks[i + 1];
    if (!Number.isInteger(index) || index! < 0 || index! >= palette.length) throw new BuildPayloadError(`palette index out of range at ${i}`);
    if (!Number.isInteger(run) || run! <= 0) throw new BuildPayloadError(`invalid run length at ${i + 1}`);
    if (cursor + run! > total) throw new BuildPayloadError("run-length data overflows the build volume");
    if (index !== 0) voxels.fill(index!, cursor, cursor + run!);
    if (!airIndices.has(index!)) blockCount += run!;
    cursor += run!;
  }
  if (cursor !== total) throw new BuildPayloadError(`run-length data covers ${cursor} of ${total} voxels`);
  return { size: [sx, sy, sz], palette: palette as string[], voxels, blockCount };
}

/** Encodes voxels back to the contract format (used by fixtures and tests). */
export function encodeBuildPayload(size: [number, number, number], palette: string[], voxels: ArrayLike<number>): BuildBlocksPayload {
  const blocks: number[] = [];
  let current = voxels[0] ?? 0;
  let run = 0;
  for (let i = 0; i < voxels.length; i += 1) {
    if (voxels[i] === current) {
      run += 1;
    } else {
      blocks.push(current, run);
      current = voxels[i]!;
      run = 1;
    }
  }
  if (run > 0) blocks.push(current, run);
  return { v: 1, size, palette, blocks };
}

export function voxelIndex(size: readonly [number, number, number], x: number, y: number, z: number) {
  return x + z * size[0] + y * size[0] * size[2];
}

export interface BlockState {
  /** Namespaced id, e.g. "minecraft:oak_stairs". */
  id: string;
  /** Id without namespace, e.g. "oak_stairs". */
  name: string;
  props: Record<string, string>;
}

/** Parses BlockData.getAsString(), e.g. "minecraft:oak_stairs[facing=north,half=bottom]". */
export function parseBlockState(value: string): BlockState {
  const trimmed = value.trim();
  const bracket = trimmed.indexOf("[");
  const id = (bracket === -1 ? trimmed : trimmed.slice(0, bracket)).toLowerCase();
  const props: Record<string, string> = {};
  if (bracket !== -1) {
    const body = trimmed.slice(bracket + 1, trimmed.endsWith("]") ? -1 : undefined);
    for (const pair of body.split(",")) {
      const eq = pair.indexOf("=");
      if (eq > 0) props[pair.slice(0, eq).trim()] = pair.slice(eq + 1).trim();
    }
  }
  const colon = id.indexOf(":");
  return { id: colon === -1 ? `minecraft:${id}` : id, name: colon === -1 ? id : id.slice(colon + 1), props };
}

export function isAirName(name: string) {
  return name === "air" || name === "cave_air" || name === "void_air" || name === "structure_void" || name === "barrier" || name === "light";
}
