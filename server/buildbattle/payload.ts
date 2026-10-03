import { gunzipSync } from "node:zlib";

/**
 * Build Battle capture payload (contract section 1), stored gzip-compressed in
 * buildbattle_builds.data:
 *   { v: 1, size: [sx, sy, sz], palette: ["minecraft:air", ...], blocks: [index, run, index, run, ...] }
 * Cells are ordered x-fastest, then z, then y: index = x + z*sx + y*sx*sz.
 */
export interface BuildPayload {
  size: [number, number, number];
  palette: string[];
  /** One palette index per cell, in contract order. */
  cells: Uint16Array;
}

export const BUILD_PAYLOAD_LIMITS = {
  /** Stored (compressed) bytes accepted by the contract. */
  maxCompressedBytes: 512 * 1024,
  /** Decompressed JSON bound (zip-bomb guard). */
  maxJsonBytes: 8 * 1024 * 1024,
  maxAxis: 64,
  maxPaletteEntries: 4_096,
  maxPaletteEntryLength: 256,
} as const;

export class BuildPayloadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BuildPayloadError";
  }
}

function fail(message: string): never {
  throw new BuildPayloadError(message);
}

export function cellIndex(size: readonly [number, number, number], x: number, y: number, z: number) {
  return x + z * size[0] + y * size[0] * size[2];
}

/** Validates an already-parsed payload object and expands its run-length encoding. */
export function parseBuildPayload(value: unknown): BuildPayload {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail("payload must be an object");
  const payload = value as Record<string, unknown>;
  if (payload.v !== 1) fail("unsupported payload version");

  const size = payload.size;
  if (!Array.isArray(size) || size.length !== 3) fail("size must have three axes");
  for (const axis of size) {
    if (!Number.isInteger(axis) || axis < 1 || axis > BUILD_PAYLOAD_LIMITS.maxAxis) fail("invalid size axis");
  }
  const [sx, sy, sz] = size as [number, number, number];
  const volume = sx * sy * sz;

  const palette = payload.palette;
  if (!Array.isArray(palette) || palette.length < 1 || palette.length > BUILD_PAYLOAD_LIMITS.maxPaletteEntries) {
    fail("invalid palette");
  }
  for (const entry of palette) {
    if (typeof entry !== "string" || !entry || entry.length > BUILD_PAYLOAD_LIMITS.maxPaletteEntryLength) {
      fail("invalid palette entry");
    }
  }
  if (palette[0] !== "minecraft:air") fail("palette[0] must be minecraft:air");

  const blocks = payload.blocks;
  if (!Array.isArray(blocks) || blocks.length % 2 !== 0) fail("blocks must be index/run pairs");
  const cells = new Uint16Array(volume);
  let cursor = 0;
  for (let index = 0; index < blocks.length; index += 2) {
    const paletteIndex = blocks[index];
    const run = blocks[index + 1];
    if (!Number.isInteger(paletteIndex) || paletteIndex < 0 || paletteIndex >= palette.length) {
      fail("palette index out of range");
    }
    if (!Number.isInteger(run) || run < 1 || cursor + run > volume) fail("invalid run length");
    if (paletteIndex !== 0) cells.fill(paletteIndex, cursor, cursor + run);
    cursor += run;
  }
  if (cursor !== volume) fail("runs do not cover the build volume");
  return { size: [sx, sy, sz], palette: palette as string[], cells };
}

/** Gunzips (bounded), parses and validates a stored payload. */
export function decodeBuildPayload(data: Uint8Array): BuildPayload {
  if (data.byteLength > BUILD_PAYLOAD_LIMITS.maxCompressedBytes) fail("payload exceeds 512 KiB");
  let json: Buffer;
  try {
    json = gunzipSync(data, { maxOutputLength: BUILD_PAYLOAD_LIMITS.maxJsonBytes });
  } catch {
    fail("payload is not valid gzip or is too large");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(json.toString("utf8"));
  } catch {
    fail("payload is not valid JSON");
  }
  return parseBuildPayload(parsed);
}

/** Inverse of the run-length decoding, used by tests and fixtures. */
export function encodeBuildCells(cells: ArrayLike<number>) {
  const blocks: number[] = [];
  for (let index = 0; index < cells.length;) {
    const value = cells[index]!;
    let run = 1;
    while (index + run < cells.length && cells[index + run] === value) run += 1;
    blocks.push(value, run);
    index += run;
  }
  return blocks;
}

/** Strips the namespace and block state: "minecraft:oak_stairs[facing=north]" -> "oak_stairs". */
export function blockName(entry: string) {
  const withoutState = entry.split("[", 1)[0]!;
  const colon = withoutState.indexOf(":");
  return (colon >= 0 ? withoutState.slice(colon + 1) : withoutState).toLowerCase();
}

/** Parses the "[key=value,...]" block state of a palette entry. */
export function blockState(entry: string): Record<string, string> {
  const start = entry.indexOf("[");
  if (start < 0 || !entry.endsWith("]")) return {};
  const state: Record<string, string> = {};
  for (const pair of entry.slice(start + 1, -1).split(",")) {
    const [key, value] = pair.split("=", 2);
    if (key && value !== undefined) state[key.trim()] = value.trim();
  }
  return state;
}
