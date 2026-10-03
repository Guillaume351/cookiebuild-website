import { gzipSync } from "node:zlib";
import { encodeBuildCells } from "../../server/buildbattle/payload";

/** A small plot (27 × 23 × 27) with a house, a tree, flowers and a pond. */
export function fixtureBuildPayloadJson() {
  const size: [number, number, number] = [27, 23, 27];
  const palette = [
    "minecraft:air",
    "minecraft:grass_block[snowy=false]",
    "minecraft:oak_planks",
    "minecraft:glass",
    "minecraft:red_concrete",
    "minecraft:oak_log[axis=y]",
    "minecraft:oak_leaves[distance=1,persistent=true,waterlogged=false]",
    "minecraft:poppy",
    "minecraft:water[level=0]",
    "minecraft:stone_brick_stairs[facing=north,half=bottom,shape=straight,waterlogged=false]",
    "minecraft:white_wool",
    "minecraft:oak_slab[type=bottom,waterlogged=false]",
    "minecraft:torch",
    "minecraft:cobblestone",
  ];
  const [sx, sy, sz] = size;
  const cells = new Uint16Array(sx * sy * sz);
  const set = (x: number, y: number, z: number, value: number) => {
    if (x < 0 || y < 0 || z < 0 || x >= sx || y >= sy || z >= sz) return;
    cells[x + z * sx + y * sx * sz] = value;
  };
  for (let x = 0; x < sx; x += 1) for (let z = 0; z < sz; z += 1) set(x, 0, z, 1);
  // House 9 × 7 with walls, windows and a red roof.
  for (let y = 1; y <= 5; y += 1) {
    for (let x = 4; x <= 12; x += 1) {
      for (let z = 4; z <= 10; z += 1) {
        const wall = x === 4 || x === 12 || z === 4 || z === 10;
        if (!wall) continue;
        const corner = (x === 4 || x === 12) && (z === 4 || z === 10);
        const window = !corner && y >= 2 && y <= 3 && (x === 7 || x === 9 || z === 7);
        set(x, y, z, corner ? 5 : window ? 3 : 2);
      }
    }
  }
  for (let layer = 0; layer < 5; layer += 1) {
    for (let x = 3 + layer; x <= 13 - layer; x += 1) {
      for (let z = 3; z <= 11; z += 1) set(x, 6 + layer, z, layer === 4 ? 10 : 4);
    }
  }
  // Tree.
  for (let y = 1; y <= 6; y += 1) set(19, y, 18, 5);
  for (let x = 17; x <= 21; x += 1) {
    for (let z = 16; z <= 20; z += 1) {
      for (let y = 5; y <= 8; y += 1) {
        if (Math.abs(x - 19) + Math.abs(z - 18) + Math.abs(y - 7) <= 4 && !(x === 19 && z === 18 && y <= 6)) set(x, y, z, 6);
      }
    }
  }
  // Pond, path and decorations.
  for (let x = 16; x <= 22; x += 1) for (let z = 4; z <= 9; z += 1) set(x, 0, z, 8);
  for (let x = 15; x <= 23; x += 1) { set(x, 1, 3, 9); set(x, 1, 10, 13); }
  for (let z = 11; z <= 26; z += 1) set(8, 1, z, 11);
  for (const [x, z] of [[2, 14], [5, 17], [12, 20], [24, 24], [14, 14]]) set(x!, 1, z!, 7);
  set(3, 1, 3, 12);
  const payload = { v: 1, size, palette, blocks: encodeBuildCells(cells) };
  return payload;
}

export function fixtureBuildPayloadGzip() {
  return gzipSync(Buffer.from(JSON.stringify(fixtureBuildPayloadJson())));
}
