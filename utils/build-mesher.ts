/**
 * Turns a decoded build into a handful of merged vertex buffers (one per
 * render class) with hidden-face culling. Pure: no three.js, no DOM.
 * Shading is baked per face direction (Minecraft-like), so the viewer can use
 * unlit materials — cheap enough for ~17k blocks on mid-range phones.
 */
import type { DecodedBuild } from "./build-gallery";
import { FACE_DIRS, OPPOSITE_FACE, type BlockAppearance, type FaceDir, type RenderClass, type Rgb } from "./build-block-model";

export interface MeshBuffers {
  positions: Float32Array;
  uvs: Float32Array;
  colors: Float32Array;
  indices: Uint32Array;
  quadCount: number;
}

export type BuildMeshData = Record<RenderClass, MeshBuffers>;

/** Atlas rectangle [u0, v0, u1, v1] for a texture, or the white tile for null. */
export type UvLookup = (texture: string | null) => [number, number, number, number];

const SHADE: Record<FaceDir, number> = { up: 1, down: 0.5, north: 0.8, south: 0.8, east: 0.62, west: 0.62 };
const CROSS_SHADE = 0.9;
const NEIGHBOUR: Record<FaceDir, [number, number, number]> = {
  up: [0, 1, 0], down: [0, -1, 0], north: [0, 0, -1], south: [0, 0, 1], east: [1, 0, 0], west: [-1, 0, 0],
};

class Growable {
  data: Float32Array;
  length = 0;
  constructor(capacity: number) { this.data = new Float32Array(capacity); }
  push(...values: number[]) {
    if (this.length + values.length > this.data.length) {
      const next = new Float32Array(Math.max(this.data.length * 2, this.length + values.length));
      next.set(this.data);
      this.data = next;
    }
    for (const value of values) this.data[this.length++] = value;
  }
  result() { return this.data.slice(0, this.length); }
}

class MeshBuilder {
  positions = new Growable(4096);
  uvs = new Growable(2048);
  colors = new Growable(4096);
  quads = 0;

  /** Adds a quad (4 corners counter-clockwise seen from the front) with per-corner local UVs. */
  quad(corners: number[], localUv: number[], rect: [number, number, number, number], color: Rgb) {
    const [u0, v0, u1, v1] = rect;
    for (let i = 0; i < 4; i += 1) {
      this.positions.push(corners[i * 3]!, corners[i * 3 + 1]!, corners[i * 3 + 2]!);
      this.uvs.push(u0 + (u1 - u0) * localUv[i * 2]!, v0 + (v1 - v0) * localUv[i * 2 + 1]!);
      this.colors.push(color[0], color[1], color[2]);
    }
    this.quads += 1;
  }

  result(): MeshBuffers {
    const indices = new Uint32Array(this.quads * 6);
    for (let q = 0; q < this.quads; q += 1) {
      const base = q * 4;
      indices.set([base, base + 1, base + 2, base, base + 2, base + 3], q * 6);
    }
    return { positions: this.positions.result(), uvs: this.uvs.result(), colors: this.colors.result(), indices, quadCount: this.quads };
  }
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/** Corners (block-local, CCW from outside) and texture-space UVs of a box face. */
export function boxFace(dir: FaceDir, from: readonly number[], to: readonly number[]) {
  const [x0, y0, z0] = from as [number, number, number];
  const [x1, y1, z1] = to as [number, number, number];
  let corners: number[];
  let uv: number[];
  switch (dir) {
    case "up":
      corners = [x0, y1, z1, x1, y1, z1, x1, y1, z0, x0, y1, z0];
      uv = [x0, 1 - z1, x1, 1 - z1, x1, 1 - z0, x0, 1 - z0];
      break;
    case "down":
      corners = [x0, y0, z0, x1, y0, z0, x1, y0, z1, x0, y0, z1];
      uv = [x0, 1 - z0, x1, 1 - z0, x1, 1 - z1, x0, 1 - z1];
      break;
    case "north":
      corners = [x1, y0, z0, x0, y0, z0, x0, y1, z0, x1, y1, z0];
      uv = [1 - x1, y0, 1 - x0, y0, 1 - x0, y1, 1 - x1, y1];
      break;
    case "south":
      corners = [x0, y0, z1, x1, y0, z1, x1, y1, z1, x0, y1, z1];
      uv = [x0, y0, x1, y0, x1, y1, x0, y1];
      break;
    case "west":
      corners = [x0, y0, z0, x0, y0, z1, x0, y1, z1, x0, y1, z0];
      uv = [z0, y0, z1, y0, z1, y1, z0, y1];
      break;
    default: // east
      corners = [x1, y0, z1, x1, y0, z0, x1, y1, z0, x1, y1, z1];
      uv = [1 - z1, y0, 1 - z0, y0, 1 - z0, y1, 1 - z1, y1];
  }
  return { corners, uv: uv.map(clamp01) };
}

/** True when the face lies on the block boundary in its own direction. */
function onBoundary(dir: FaceDir, from: readonly number[], to: readonly number[]) {
  switch (dir) {
    case "up": return to[1]! >= 1;
    case "down": return from[1]! <= 0;
    case "north": return from[2]! <= 0;
    case "south": return to[2]! >= 1;
    case "east": return to[0]! >= 1;
    default: return from[0]! <= 0;
  }
}

function faceColor(appearance: BlockAppearance, texture: string | null, shade: number): Rgb {
  const base: Rgb = texture === null
    ? appearance.fallbackColor
    : appearance.tint && appearance.tintTextures.includes(texture) ? appearance.tint : [1, 1, 1];
  return [base[0] * shade, base[1] * shade, base[2] * shade];
}

/**
 * Builds merged geometry. `appearances[i]` is the model of palette entry i
 * (null for air). Coordinates are in blocks, origin at the build's corner.
 */
export function buildMeshData(build: DecodedBuild, appearances: (BlockAppearance | null)[], uvOf: UvLookup): BuildMeshData {
  const builders: Record<RenderClass, MeshBuilder> = { opaque: new MeshBuilder(), cutout: new MeshBuilder(), translucent: new MeshBuilder() };
  const [sx, sy, sz] = build.size;
  const { voxels } = build;
  const solid = appearances.map((appearance) => new Set(appearance?.solidFaces ?? []));

  const neighbourAt = (x: number, y: number, z: number) => {
    if (x < 0 || y < 0 || z < 0 || x >= sx || y >= sy || z >= sz) return 0;
    return voxels[x + z * sx + y * sx * sz]!;
  };

  for (let y = 0; y < sy; y += 1) {
    for (let z = 0; z < sz; z += 1) {
      for (let x = 0; x < sx; x += 1) {
        const paletteIndex = voxels[x + z * sx + y * sx * sz]!;
        const appearance = appearances[paletteIndex];
        if (!appearance) continue;
        const builder = builders[appearance.render];

        for (const part of appearance.boxes) {
          for (const dir of FACE_DIRS) {
            if (!(dir in part.faces)) continue;
            if (onBoundary(dir, part.from, part.to)) {
              const [dx, dy, dz] = NEIGHBOUR[dir];
              const neighbourIndex = neighbourAt(x + dx, y + dy, z + dz);
              const neighbour = appearances[neighbourIndex];
              if (neighbour) {
                if (solid[neighbourIndex]!.has(OPPOSITE_FACE[dir])) continue;
                if (appearance.cullSame && neighbour.name === appearance.name) continue;
              }
            }
            const texture = part.faces[dir] ?? null;
            const { corners, uv } = boxFace(dir, part.from, part.to);
            for (let i = 0; i < 12; i += 3) {
              corners[i]! += x;
              corners[i + 1]! += y;
              corners[i + 2]! += z;
            }
            builder.quad(corners, uv, uvOf(texture), faceColor(appearance, texture, SHADE[dir]));
          }
        }

        for (const cross of appearance.crosses) {
          const a = cross.inset;
          const b = 1 - cross.inset;
          const color = faceColor(appearance, cross.texture, CROSS_SHADE);
          const rect = uvOf(cross.texture);
          const uv = [0, 0, 1, 0, 1, 1, 0, 1];
          const y0 = y + cross.y0;
          const y1 = y + cross.y1;
          builder.quad([x + a, y0, z + a, x + b, y0, z + b, x + b, y1, z + b, x + a, y1, z + a], uv, rect, color);
          builder.quad([x + a, y0, z + b, x + b, y0, z + a, x + b, y1, z + a, x + a, y1, z + b], uv, rect, color);
        }
      }
    }
  }

  return { opaque: builders.opaque.result(), cutout: builders.cutout.result(), translucent: builders.translucent.result() };
}
