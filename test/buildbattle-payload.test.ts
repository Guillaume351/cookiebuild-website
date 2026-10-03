import { gzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import {
  blockName,
  blockState,
  BuildPayloadError,
  cellIndex,
  decodeBuildPayload,
  encodeBuildCells,
  parseBuildPayload,
} from "../server/buildbattle/payload";
import { fixtureBuildPayloadGzip, fixtureBuildPayloadJson } from "./fixtures/buildbattle-fixture";

const gzipJson = (value: unknown) => gzipSync(Buffer.from(JSON.stringify(value)));

describe("Build Battle payload decoding", () => {
  it("decodes the contract format (x fastest, then z, then y)", () => {
    const payload = decodeBuildPayload(fixtureBuildPayloadGzip());
    expect(payload.size).toEqual([27, 23, 27]);
    expect(payload.cells).toHaveLength(27 * 23 * 27);
    expect(payload.palette[0]).toBe("minecraft:air");
    // Floor at y = 0 is grass except the pond; the house corner log is at (4, 1, 4).
    expect(payload.palette[payload.cells[cellIndex(payload.size, 0, 0, 0)]!]).toBe("minecraft:grass_block[snowy=false]");
    expect(payload.palette[payload.cells[cellIndex(payload.size, 16, 0, 4)]!]).toBe("minecraft:water[level=0]");
    expect(payload.palette[payload.cells[cellIndex(payload.size, 4, 1, 4)]!]).toBe("minecraft:oak_log[axis=y]");
    expect(payload.palette[payload.cells[cellIndex(payload.size, 0, 22, 0)]!]).toBe("minecraft:air");
  });

  it("round-trips the run-length encoding", () => {
    const cells = [0, 0, 0, 2, 2, 1, 0, 0, 3];
    expect(encodeBuildCells(cells)).toEqual([0, 3, 2, 2, 1, 1, 0, 2, 3, 1]);
    const parsed = parseBuildPayload({
      v: 1,
      size: [3, 1, 3],
      palette: ["minecraft:air", "minecraft:stone", "minecraft:dirt", "minecraft:sand"],
      blocks: encodeBuildCells(cells),
    });
    expect([...parsed.cells]).toEqual(cells);
  });

  it.each([
    ["unsupported version", { ...fixtureBuildPayloadJson(), v: 2 }],
    ["missing air at palette[0]", { v: 1, size: [1, 1, 1], palette: ["minecraft:stone"], blocks: [0, 1] }],
    ["runs shorter than the volume", { v: 1, size: [2, 1, 1], palette: ["minecraft:air"], blocks: [0, 1] }],
    ["runs longer than the volume", { v: 1, size: [1, 1, 1], palette: ["minecraft:air"], blocks: [0, 2] }],
    ["palette index out of range", { v: 1, size: [1, 1, 1], palette: ["minecraft:air"], blocks: [1, 1] }],
    ["zero-length run", { v: 1, size: [1, 1, 1], palette: ["minecraft:air"], blocks: [0, 0, 0, 1] }],
    ["odd blocks array", { v: 1, size: [1, 1, 1], palette: ["minecraft:air"], blocks: [0] }],
    ["oversized axis", { v: 1, size: [65, 1, 1], palette: ["minecraft:air"], blocks: [0, 65] }],
    ["non-string palette entry", { v: 1, size: [1, 1, 1], palette: ["minecraft:air", 3], blocks: [0, 1] }],
  ])("rejects %s", (_label, value) => {
    expect(() => decodeBuildPayload(gzipJson(value))).toThrow(BuildPayloadError);
  });

  it("rejects non-gzip data, oversized stored blobs and decompression bombs", () => {
    expect(() => decodeBuildPayload(Buffer.from("{\"v\":1}"))).toThrow(BuildPayloadError);
    expect(() => decodeBuildPayload(new Uint8Array(512 * 1024 + 1))).toThrow(/512 KiB/);
    const bomb = gzipSync(Buffer.alloc(9 * 1024 * 1024, 0x20));
    expect(bomb.byteLength).toBeLessThan(512 * 1024);
    expect(() => decodeBuildPayload(bomb)).toThrow(/too large/);
  });

  it("parses palette entries", () => {
    expect(blockName("minecraft:oak_stairs[facing=north,half=bottom]")).toBe("oak_stairs");
    expect(blockName("stone")).toBe("stone");
    expect(blockState("minecraft:oak_slab[type=top,waterlogged=false]")).toEqual({ type: "top", waterlogged: "false" });
    expect(blockState("minecraft:stone")).toEqual({});
  });
});
