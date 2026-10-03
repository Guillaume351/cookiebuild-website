import { FONT_HEIGHT, fontMark, fontTokens, glyph, isFontRenderable, textWidth } from "./bitmap-font";
import { blockStyle, type BlockShape, type BlockStyle } from "./block-colors";
import { encodePngRgb } from "./png";
import type { BuildPayload } from "./payload";

/**
 * Pure-JS 1200×630 share card: a face-shaded isometric render of the captured
 * plot on a small "cookie" plate, plus theme, player and likes drawn with the
 * embedded bitmap font. No native dependency (runs on node:24-alpine).
 */
export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

export interface BuildCardInput {
  payload: BuildPayload;
  theme: string;
  /** English theme name used when the localized one has no glyphs (Cyrillic, Devanagari…). */
  fallbackTheme: string;
  playerName: string | null;
  likeCount: number;
  locale?: string | null;
}

class Canvas {
  readonly rgb: Uint8Array;
  constructor(readonly width: number, readonly height: number) {
    this.rgb = new Uint8Array(width * height * 3);
  }

  set(x: number, y: number, color: number) {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return;
    const offset = (y * this.width + x) * 3;
    this.rgb[offset] = (color >>> 16) & 0xff;
    this.rgb[offset + 1] = (color >>> 8) & 0xff;
    this.rgb[offset + 2] = color & 0xff;
  }

  blend(x: number, y: number, color: number, alpha: number) {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return;
    const offset = (y * this.width + x) * 3;
    const inverse = 1 - alpha;
    this.rgb[offset] = Math.round(this.rgb[offset]! * inverse + ((color >>> 16) & 0xff) * alpha);
    this.rgb[offset + 1] = Math.round(this.rgb[offset + 1]! * inverse + ((color >>> 8) & 0xff) * alpha);
    this.rgb[offset + 2] = Math.round(this.rgb[offset + 2]! * inverse + (color & 0xff) * alpha);
  }

  roundedRect(x0: number, y0: number, width: number, height: number, radius: number, color: number, alpha: number) {
    for (let y = y0; y < y0 + height; y += 1) {
      for (let x = x0; x < x0 + width; x += 1) {
        const dx = x < x0 + radius ? x0 + radius - x : x >= x0 + width - radius ? x - (x0 + width - radius - 1) : 0;
        const dy = y < y0 + radius ? y0 + radius - y : y >= y0 + height - radius ? y - (y0 + height - radius - 1) : 0;
        if (dx * dx + dy * dy > radius * radius) continue;
        this.blend(x, y, color, alpha);
      }
    }
  }

  private stampBits(bits: Uint8Array, width: number, x: number, y: number, scale: number, color: number, shadow: boolean) {
    const rows = bits.length / width;
    const offset = Math.max(1, scale >> 1);
    for (const pass of shadow ? [0, 1] : [1]) {
      for (let gy = 0; gy < rows; gy += 1) {
        for (let gx = 0; gx < width; gx += 1) {
          if (!bits[gy * width + gx]) continue;
          for (let sy = 0; sy < scale; sy += 1) {
            for (let sx = 0; sx < scale; sx += 1) {
              const px = x + gx * scale + sx;
              const py = y + gy * scale + sy;
              if (pass === 0) this.blend(px + offset, py + offset, 0x000000, 0.45);
              else this.set(px, py, color);
            }
          }
        }
      }
    }
  }

  /** Draws text with the embedded font; returns the x coordinate after the last glyph. */
  text(value: string, x: number, y: number, scale: number, color: number, shadow = true) {
    let cursor = x;
    for (const token of fontTokens(value)) {
      const { width, bits } = glyph(token.char);
      this.stampBits(bits, width, cursor, y, scale, color, shadow);
      const mark = fontMark(token.mark);
      if (mark) {
        const markX = cursor + Math.floor((width - mark.width) / 2) * scale;
        const markY = mark.below ? y + FONT_HEIGHT * scale : y - 3 * scale;
        this.stampBits(mark.bits, mark.width, markX, markY, scale, color, shadow);
      }
      cursor += (width + 1) * scale;
    }
    return cursor;
  }
}

type Point = [number, number];

/** Pixels covered by a convex polygon, relative to the polygon's coordinate origin. */
interface FaceMask {
  /** Interleaved dx, dy pairs. */
  offsets: Int32Array;
  /** 1 when the pixel lies on the face border (drawn slightly darker). */
  edge: Uint8Array;
}

function rasterizeConvex(points: Point[], overlap = 0.35, edgeWidth = 0.75): FaceMask {
  const cx = points.reduce((sum, [x]) => sum + x, 0) / points.length;
  const cy = points.reduce((sum, [, y]) => sum + y, 0) / points.length;
  const edges = points.map(([x1, y1], index) => {
    const [x2, y2] = points[(index + 1) % points.length]!;
    let nx = -(y2 - y1);
    let ny = x2 - x1;
    const length = Math.hypot(nx, ny) || 1;
    nx /= length;
    ny /= length;
    // Orient the normal toward the polygon's centroid (inside = positive distance).
    if ((cx - x1) * nx + (cy - y1) * ny < 0) {
      nx = -nx;
      ny = -ny;
    }
    return { x1, y1, nx, ny };
  });
  const minX = Math.floor(Math.min(...points.map(([x]) => x))) - 1;
  const maxX = Math.ceil(Math.max(...points.map(([x]) => x))) + 1;
  const minY = Math.floor(Math.min(...points.map(([, y]) => y))) - 1;
  const maxY = Math.ceil(Math.max(...points.map(([, y]) => y))) + 1;
  const offsets: number[] = [];
  const edge: number[] = [];
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const px = x + 0.5;
      const py = y + 0.5;
      let distance = Number.POSITIVE_INFINITY;
      for (const candidate of edges) {
        distance = Math.min(distance, (px - candidate.x1) * candidate.nx + (py - candidate.y1) * candidate.ny);
      }
      if (distance < -overlap) continue;
      offsets.push(x, y);
      edge.push(distance < edgeWidth ? 1 : 0);
    }
  }
  return { offsets: Int32Array.from(offsets), edge: Uint8Array.from(edge) };
}

interface Box { x0: number; x1: number; y0: number; y1: number; z0: number; z1: number }

const SHAPE_BOXES: Record<Exclude<BlockShape, "none">, Box> = {
  cube: { x0: 0, x1: 1, y0: 0, y1: 1, z0: 0, z1: 1 },
  "bottom-slab": { x0: 0, x1: 1, y0: 0, y1: 0.5, z0: 0, z1: 1 },
  "top-slab": { x0: 0, x1: 1, y0: 0.5, y1: 1, z0: 0, z1: 1 },
  thin: { x0: 0, x1: 1, y0: 0, y1: 0.15, z0: 0, z1: 1 },
  small: { x0: 0.28, x1: 0.72, y0: 0, y1: 0.72, z0: 0.28, z1: 0.72 },
};

/** Screen projection (2:1 isometric) of a point in block units, for a half tile width `a`. */
function project(a: number, x: number, y: number, z: number): Point {
  return [(x - z) * a, ((x + z) * a) / 2 - y * a];
}

interface BoxMasks { top: FaceMask; east: FaceMask; south: FaceMask }

function boxMasks(a: number, box: Box, overlap?: number): BoxMasks {
  const { x0, x1, y0, y1, z0, z1 } = box;
  return {
    top: rasterizeConvex([project(a, x0, y1, z0), project(a, x1, y1, z0), project(a, x1, y1, z1), project(a, x0, y1, z1)], overlap),
    east: rasterizeConvex([project(a, x1, y0, z0), project(a, x1, y1, z0), project(a, x1, y1, z1), project(a, x1, y0, z1)], overlap),
    south: rasterizeConvex([project(a, x0, y0, z1), project(a, x1, y0, z1), project(a, x1, y1, z1), project(a, x0, y1, z1)], overlap),
  };
}

const SHADE = { top: 1, south: 0.8, east: 0.62 } as const;
const EDGE_SHADE = 0.84;

function shade(color: number, factor: number) {
  const r = Math.min(255, Math.round(((color >>> 16) & 0xff) * factor));
  const g = Math.min(255, Math.round(((color >>> 8) & 0xff) * factor));
  const b = Math.min(255, Math.round((color & 0xff) * factor));
  return (r << 16) | (g << 8) | b;
}

function jitter(x: number, y: number, z: number) {
  let hash = Math.imul(x * 73_856_093 ^ y * 19_349_663 ^ z * 83_492_791, 0x27d4eb2d);
  hash ^= hash >>> 15;
  return 0.95 + ((hash >>> 0) % 1000) / 10_000;
}

function stamp(canvas: Canvas, mask: FaceMask, ox: number, oy: number, color: number, alpha: number) {
  const { offsets, edge } = mask;
  const edgeColor = shade(color, EDGE_SHADE);
  for (let index = 0, pixel = 0; index < offsets.length; index += 2, pixel += 1) {
    const value = edge[pixel] ? edgeColor : color;
    if (alpha >= 1) canvas.set(ox + offsets[index]!, oy + offsets[index + 1]!, value);
    else canvas.blend(ox + offsets[index]!, oy + offsets[index + 1]!, value, alpha);
  }
}

function paintBackground(canvas: Canvas, glowX: number, glowY: number) {
  const top = [0x1f, 0x18, 0x38];
  const bottom = [0x47, 0x2a, 0x3c];
  const glow = [0xff, 0xb3, 0x5c];
  const radius = 420;
  for (let y = 0; y < canvas.height; y += 1) {
    const t = y / (canvas.height - 1);
    const base = top.map((channel, index) => channel + (bottom[index]! - channel) * t);
    for (let x = 0; x < canvas.width; x += 1) {
      const distance = Math.hypot(x - glowX, (y - glowY) * 1.2) / radius;
      const strength = distance < 1 ? 0.24 * (1 - distance) ** 2 : 0;
      const offset = (y * canvas.width + x) * 3;
      for (let channel = 0; channel < 3; channel += 1) {
        canvas.rgb[offset + channel] = Math.round(base[channel]! * (1 - strength) + glow[channel]! * strength);
      }
    }
  }
}

interface Bounds { minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number }

function occupiedBounds(payload: BuildPayload, styles: BlockStyle[]): Bounds | null {
  const [sx, sy, sz] = payload.size;
  let bounds: Bounds | null = null;
  for (let y = 0; y < sy; y += 1) {
    for (let z = 0; z < sz; z += 1) {
      for (let x = 0; x < sx; x += 1) {
        if (styles[payload.cells[x + z * sx + y * sx * sz]!]!.shape === "none") continue;
        if (!bounds) bounds = { minX: x, maxX: x, minY: y, maxY: y, minZ: z, maxZ: z };
        else {
          bounds.minX = Math.min(bounds.minX, x);
          bounds.maxX = Math.max(bounds.maxX, x);
          bounds.minY = Math.min(bounds.minY, y);
          bounds.maxY = Math.max(bounds.maxY, y);
          bounds.minZ = Math.min(bounds.minZ, z);
          bounds.maxZ = Math.max(bounds.maxZ, z);
        }
      }
    }
  }
  return bounds;
}

const PLATE_DEPTH = 0.45;
const SCENE = { centerX: 400, centerY: 330, maxWidth: 730, maxHeight: 520 } as const;

function renderVoxels(canvas: Canvas, payload: BuildPayload) {
  const [sx, sy, sz] = payload.size;
  const styles = payload.palette.map((entry) => blockStyle(entry));
  const bounds = occupiedBounds(payload, styles) ?? {
    minX: 0, maxX: sx - 1, minY: 0, maxY: 0, minZ: 0, maxZ: sz - 1,
  };
  // The plate spans the whole plot footprint so small builds keep their scale context.
  const plate = { x0: -0.5, x1: sx + 0.5, z0: -0.5, z1: sz + 0.5, y0: bounds.minY - PLATE_DEPTH, y1: bounds.minY };
  const corners: Point[] = [];
  for (const x of [plate.x0, plate.x1]) {
    for (const z of [plate.z0, plate.z1]) {
      for (const y of [plate.y0, Math.max(bounds.maxY + 1, plate.y1)]) corners.push(project(1, x, y, z));
    }
  }
  const minPx = Math.min(...corners.map(([x]) => x));
  const maxPx = Math.max(...corners.map(([x]) => x));
  const minPy = Math.min(...corners.map(([, y]) => y));
  const maxPy = Math.max(...corners.map(([, y]) => y));
  const fit = Math.min(SCENE.maxWidth / (maxPx - minPx), SCENE.maxHeight / (maxPy - minPy));
  const a = Math.max(2, Math.min(40, Math.floor(fit / 2) * 2));
  const originX = Math.round(SCENE.centerX - ((minPx + maxPx) / 2) * a);
  const originY = Math.round(SCENE.centerY - ((minPy + maxPy) / 2) * a);

  // Soft shadow, then the plate (top, south and east sides).
  const shadowMask = rasterizeConvex([
    project(a, plate.x0, plate.y0, plate.z0), project(a, plate.x1, plate.y0, plate.z0),
    project(a, plate.x1, plate.y0, plate.z1), project(a, plate.x0, plate.y0, plate.z1),
  ], 0, 0);
  for (let blur = 3; blur >= 1; blur -= 1) {
    stamp(canvas, { offsets: shadowMask.offsets, edge: new Uint8Array(shadowMask.edge.length) }, originX, originY + blur * 6, 0x000000, 0.12);
  }
  const plateMasks = boxMasks(a, { x0: plate.x0, x1: plate.x1, y0: plate.y0, y1: plate.y1, z0: plate.z0, z1: plate.z1 }, 0);
  stamp(canvas, plateMasks.south, originX, originY, 0x6a4527, 1);
  stamp(canvas, plateMasks.east, originX, originY, 0x4f321b, 1);
  stamp(canvas, plateMasks.top, originX, originY, 0x8a6036, 1);

  const masks = new Map<Exclude<BlockShape, "none">, BoxMasks>();
  const masksFor = (shape: Exclude<BlockShape, "none">) => {
    let value = masks.get(shape);
    if (!value) masks.set(shape, (value = boxMasks(a, SHAPE_BOXES[shape])));
    return value;
  };

  // Painter's order: cells with a smaller x + y + z are behind larger ones.
  const volume = sx * sy * sz;
  const maxSum = sx + sy + sz - 3;
  const counts = new Uint32Array(maxSum + 2);
  for (let index = 0; index < volume; index += 1) {
    if (styles[payload.cells[index]!]!.shape === "none") continue;
    const x = index % sx;
    const z = Math.floor(index / sx) % sz;
    const y = Math.floor(index / (sx * sz));
    counts[x + y + z + 1]! += 1;
  }
  for (let sum = 1; sum < counts.length; sum += 1) counts[sum]! += counts[sum - 1]!;
  const order = new Uint32Array(counts[counts.length - 1]!);
  const fill = counts.slice();
  for (let index = 0; index < volume; index += 1) {
    if (styles[payload.cells[index]!]!.shape === "none") continue;
    const x = index % sx;
    const z = Math.floor(index / sx) % sz;
    const y = Math.floor(index / (sx * sz));
    order[fill[x + y + z]!++] = index;
  }

  const occludes = (x: number, y: number, z: number) =>
    x < sx && y < sy && z < sz && styles[payload.cells[x + z * sx + y * sx * sz]!]!.occludes;

  for (const index of order) {
    const style = styles[payload.cells[index]!]!;
    const x = index % sx;
    const z = Math.floor(index / sx) % sz;
    const y = Math.floor(index / (sx * sz));
    const shape = style.shape as Exclude<BlockShape, "none">;
    const full = shape === "cube";
    const showTop = !full || !occludes(x, y + 1, z);
    const showEast = !full || !occludes(x + 1, y, z);
    const showSouth = !full || !occludes(x, y, z + 1);
    if (!showTop && !showEast && !showSouth) continue;
    const boxMask = masksFor(shape);
    const [dx, dy] = project(a, x, y, z);
    const ox = originX + dx;
    const oy = originY + dy;
    const variation = jitter(x, y, z);
    if (showSouth) stamp(canvas, boxMask.south, ox, oy, shade(style.side, SHADE.south * variation), style.alpha);
    if (showEast) stamp(canvas, boxMask.east, ox, oy, shade(style.side, SHADE.east * variation), style.alpha);
    if (showTop) stamp(canvas, boxMask.top, ox, oy, shade(style.top, SHADE.top * variation), style.alpha);
  }
}

const BY_WORD: Record<string, string> = { fr: "PAR", de: "VON", es: "POR", "pt-BR": "POR", it: "DI" };

function wrapWords(text: string, scale: number, maxWidth: number, maxLines: number) {
  const lines: string[] = [];
  let current = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const candidate = current ? `${current} ${word}` : word;
    if (textWidth(candidate, scale) <= maxWidth || !current) current = candidate;
    else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  if (lines.some((line) => textWidth(line, scale) > maxWidth) || lines.length > maxLines) return null;
  return lines;
}

const PANEL = { x: 790, width: 370 } as const;

/** Background, glow, panel and static labels never change: render them once per process. */
let template: Uint8Array | null = null;
function cardTemplate() {
  if (template) return template;
  const canvas = new Canvas(OG_WIDTH, OG_HEIGHT);
  paintBackground(canvas, SCENE.centerX, SCENE.centerY);
  canvas.roundedRect(PANEL.x, 60, PANEL.width, 510, 28, 0x000000, 0.28);
  canvas.text("BUILD BATTLE", PANEL.x + 32, 100, 3, 0xffb35c, false);
  canvas.text("COOKIE-BUILD.COM", PANEL.x + 32, 530, 3, 0xb9a9d6, false);
  template = canvas.rgb;
  return template;
}

function paintPanel(canvas: Canvas, input: BuildCardInput) {
  const left = PANEL.x + 32;
  const textMax = PANEL.width - 64;

  const themeSource = isFontRenderable(input.theme) ? input.theme : input.fallbackTheme;
  const theme = [...themeSource.trim()].slice(0, 40).join("");
  let themeLines: string[] = [theme];
  let themeScale = 4;
  const themeBlockHeight = 200;
  for (const scale of [8, 7, 6, 5, 4]) {
    const maxLines = Math.min(3, Math.floor(themeBlockHeight / ((FONT_HEIGHT + 5) * scale)));
    const lines = wrapWords(theme, scale, textMax, maxLines);
    if (lines) {
      themeLines = lines;
      themeScale = scale;
      break;
    }
  }
  let y = 165;
  for (const line of themeLines) {
    canvas.text(line, left, y, themeScale, 0xffffff);
    y += (FONT_HEIGHT + 5) * themeScale;
  }

  if (input.playerName) {
    const by = BY_WORD[input.locale ?? ""] ?? "BY";
    const name = [...input.playerName.trim()].slice(0, 20).join("");
    let playerScale = 4;
    while (playerScale > 2 && textWidth(`${by} ${name}`, playerScale) > textMax) playerScale -= 1;
    canvas.text(by, left, y + 6, playerScale, 0xc9b8e8, false);
    canvas.text(name, left + textWidth(`${by} `, playerScale), y + 6, playerScale, 0xffe7c2);
  }

  const likes = String(Math.max(0, Math.trunc(input.likeCount)));
  canvas.text("♥", left, 440, 7, 0xff5a6e);
  canvas.text(likes, left + textWidth("♥ ", 7), 440, 7, 0xffffff);
}

/** Renders the PNG share card of a build. */
export function renderBuildCard(input: BuildCardInput) {
  const canvas = new Canvas(OG_WIDTH, OG_HEIGHT);
  canvas.rgb.set(cardTemplate());
  renderVoxels(canvas, input.payload);
  paintPanel(canvas, input);
  return encodePngRgb(OG_WIDTH, OG_HEIGHT, canvas.rgb);
}
