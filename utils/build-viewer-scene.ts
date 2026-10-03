/**
 * three.js runtime of the Build Battle viewer. Only ever loaded through a
 * dynamic import from components/BuildViewer.client.vue so three.js stays out
 * of every other page bundle.
 */
import {
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  NearestFilter,
  PerspectiveCamera,
  Scene,
  SRGBColorSpace,
  Spherical,
  Vector3,
  WebGLRenderer,
  type Material,
} from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { DecodedBuild } from "./build-gallery";
import { resolveBlockAppearance, type BlockAppearance, type TextureLookup } from "./build-block-model";
import { buildMeshData, type MeshBuffers } from "./build-mesher";

export const BUILD_TEXTURES_URL = "/map-viewer/maps/buildbattles_legacy_buildbattles/textures.json";

export interface TextureEntry {
  resourcePath: string;
  color: [number, number, number, number];
  halfTransparent: boolean;
  texture: string;
}

export class WebGLUnavailableError extends Error {
  constructor() {
    super("WebGL is not available");
    this.name = "WebGLUnavailableError";
  }
}

let texturesPromise: Promise<Map<string, TextureEntry>> | null = null;

/** Fetches BlueMap's texture list once per page session. */
export function loadTextureIndex(url = BUILD_TEXTURES_URL): Promise<Map<string, TextureEntry>> {
  texturesPromise ??= fetch(url, { credentials: "same-origin" })
    .then((response) => {
      if (!response.ok) throw new Error(`textures.json: HTTP ${response.status}`);
      return response.json() as Promise<TextureEntry[]>;
    })
    .then((entries) => new Map(entries.map((entry) => [entry.resourcePath, entry])))
    .catch((error) => {
      texturesPromise = null;
      throw error;
    });
  return texturesPromise;
}

export function textureLookup(index: Map<string, TextureEntry>): TextureLookup {
  return {
    has: (path) => index.has(path),
    color: (path) => index.get(path)?.color,
  };
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

interface Atlas {
  canvas: HTMLCanvasElement;
  rects: Map<string | null, [number, number, number, number]>;
}

/** Packs the used textures (first animation frame) into one canvas with 1px extruded gutters. */
async function buildAtlas(paths: string[], index: Map<string, TextureEntry>): Promise<Atlas> {
  const images = await Promise.all(paths.map((path) => loadImage(index.get(path)!.texture)));
  const tile = Math.min(64, Math.max(16, ...images.map((image) => image?.naturalWidth ?? 16)));
  const stride = tile + 2;
  const count = paths.length + 1; // + white tile
  const columns = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / columns);
  const canvas = document.createElement("canvas");
  canvas.width = columns * stride;
  canvas.height = rows * stride;
  const context = canvas.getContext("2d")!;
  context.imageSmoothingEnabled = false;
  const rects = new Map<string | null, [number, number, number, number]>();
  const place = (slot: number, key: string | null, draw: (x: number, y: number) => void) => {
    const x = (slot % columns) * stride;
    const y = Math.floor(slot / columns) * stride;
    // Extrude edges first (draw at the 8 neighbouring offsets), then the tile itself.
    for (const [dx, dy] of [[0, 1], [2, 1], [1, 0], [1, 2], [0, 0], [2, 0], [0, 2], [2, 2], [1, 1]] as const) draw(x + dx, y + dy);
    const { width: w, height: h } = canvas;
    rects.set(key, [(x + 1) / w, 1 - (y + 1 + tile) / h, (x + 1 + tile) / w, 1 - (y + 1) / h]);
  };
  place(0, null, (x, y) => {
    context.fillStyle = "#ffffff";
    context.fillRect(x, y, tile, tile);
  });
  paths.forEach((path, i) => {
    const image = images[i];
    if (!image) return;
    const frame = Math.min(image.naturalWidth, image.naturalHeight);
    place(i + 1, path, (x, y) => context.drawImage(image, 0, 0, frame, frame, x, y, tile, tile));
  });
  return { canvas, rects };
}

const srgbToLinear = (value: number) => (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);

function geometryFrom(buffers: MeshBuffers) {
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(buffers.positions, 3));
  geometry.setAttribute("uv", new BufferAttribute(buffers.uvs, 2));
  const colors = buffers.colors.map(srgbToLinear);
  geometry.setAttribute("color", new BufferAttribute(colors, 3));
  geometry.setIndex(new BufferAttribute(buffers.indices, 1));
  geometry.computeBoundingSphere();
  return geometry;
}

export interface BuildViewerOptions {
  container: HTMLElement;
  build: DecodedBuild;
  textures: Map<string, TextureEntry>;
  reducedMotion: boolean;
  onInteract?: () => void;
}

export interface BuildViewerHandle {
  resetView(): void;
  rotateBy(azimuth: number, polar: number): void;
  zoomBy(factor: number): void;
  setAutoRotate(enabled: boolean): void;
  screenshot(): Promise<Blob | null>;
  dispose(): void;
  readonly stats: { quads: number; drawCalls: number };
}

function supportsWebGL() {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

export async function createBuildViewerScene(options: BuildViewerOptions): Promise<BuildViewerHandle> {
  if (!supportsWebGL()) throw new WebGLUnavailableError();
  const { container, build, textures, reducedMotion } = options;

  // 1. Block models and atlas.
  const lookup = textureLookup(textures);
  const appearances: (BlockAppearance | null)[] = build.palette.map((state) => resolveBlockAppearance(state, lookup));
  const used = new Set<string>();
  for (const appearance of appearances) {
    if (!appearance) continue;
    for (const part of appearance.boxes) for (const value of Object.values(part.faces)) if (value) used.add(value);
    for (const cross of appearance.crosses) if (cross.texture) used.add(cross.texture);
  }
  const atlas = await buildAtlas([...used].filter((path) => textures.has(path)), textures);
  const uvOf = (texture: string | null) => atlas.rects.get(texture) ?? atlas.rects.get(null)!;
  const data = buildMeshData(build, appearances, uvOf);

  // 2. Renderer.
  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ antialias: window.devicePixelRatio < 2, alpha: false, powerPreference: "default" });
  } catch {
    throw new WebGLUnavailableError();
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = SRGBColorSpace;
  const canvas = renderer.domElement;
  canvas.style.display = "block";
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.setAttribute("aria-hidden", "true");
  container.appendChild(canvas);

  const scene = new Scene();
  scene.background = new Color(0x1c1917);

  const texture = new CanvasTexture(atlas.canvas);
  texture.magFilter = NearestFilter;
  texture.minFilter = NearestFilter;
  texture.generateMipmaps = false;
  texture.colorSpace = SRGBColorSpace;

  const materials: Material[] = [
    new MeshBasicMaterial({ map: texture, vertexColors: true }),
    new MeshBasicMaterial({ map: texture, vertexColors: true, alphaTest: 0.5, side: DoubleSide }),
    new MeshBasicMaterial({ map: texture, vertexColors: true, transparent: true, depthWrite: false }),
  ];
  const group = new Group();
  const geometries: BufferGeometry[] = [];
  (["opaque", "cutout", "translucent"] as const).forEach((renderClass, i) => {
    const buffers = data[renderClass];
    if (buffers.quadCount === 0) return;
    const geometry = geometryFrom(buffers);
    geometries.push(geometry);
    const mesh = new Mesh(geometry, materials[i]);
    if (renderClass === "translucent") mesh.renderOrder = 1;
    group.add(mesh);
  });

  // Centre on the occupied bounds (plots often leave empty air around the build).
  const [sx, sy, sz] = build.size;
  let min = [sx, sy, sz];
  let max = [0, 0, 0];
  for (let y = 0; y < sy; y += 1) for (let z = 0; z < sz; z += 1) for (let x = 0; x < sx; x += 1) {
    if (appearances[build.voxels[x + z * sx + y * sx * sz]!]) {
      min = [Math.min(min[0]!, x), Math.min(min[1]!, y), Math.min(min[2]!, z)];
      max = [Math.max(max[0]!, x + 1), Math.max(max[1]!, y + 1), Math.max(max[2]!, z + 1)];
    }
  }
  if (max[0]! <= min[0]!) { min = [0, 0, 0]; max = [sx, sy, sz]; }
  const center = new Vector3((min[0]! + max[0]!) / 2, (min[1]! + max[1]!) / 2, (min[2]! + max[2]!) / 2);
  group.position.set(-center.x, -center.y, -center.z);
  scene.add(group);
  const radius = 0.5 * Math.hypot(max[0]! - min[0]!, max[1]! - min[1]!, max[2]! - min[2]!);

  const camera = new PerspectiveCamera(40, 1, 0.1, 1000);
  // Fit the bounding sphere in the narrower of the two FOVs (portrait phones).
  const fitDistance = () => {
    const vertical = (camera.fov * Math.PI) / 180;
    const horizontal = 2 * Math.atan(Math.tan(vertical / 2) * camera.aspect);
    return (Math.max(radius, 2) / Math.sin(Math.min(vertical, horizontal) / 2)) * 0.95;
  };

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = !reducedMotion;
  controls.dampingFactor = 0.08;
  controls.minDistance = Math.max(2, radius * 0.4);
  controls.maxDistance = 1000;
  controls.maxPolarAngle = Math.PI * 0.92;
  controls.autoRotate = !reducedMotion;
  controls.autoRotateSpeed = 1.2;
  controls.target.set(0, 0, 0);

  const applySpherical = (spherical: Spherical) => {
    camera.position.setFromSpherical(spherical).add(controls.target);
    camera.lookAt(controls.target);
  };
  const resetView = () => {
    const distance = fitDistance();
    controls.maxDistance = distance * 3;
    controls.target.set(0, 0, 0);
    applySpherical(new Spherical(distance, Math.PI * 0.36, Math.PI * 0.25));
    controls.update();
    requestRender();
  };

  let dirty = true;
  let frame = 0;
  let visible = true;
  const requestRender = () => {
    dirty = true;
    if (!frame && visible) frame = requestAnimationFrame(tick);
  };
  function tick() {
    frame = 0;
    const changed = controls.update();
    if (changed || dirty) {
      renderer.render(scene, camera);
      dirty = false;
    }
    if (visible && (changed || controls.autoRotate)) frame = requestAnimationFrame(tick);
  }

  controls.addEventListener("change", requestRender);
  controls.addEventListener("start", () => {
    controls.autoRotate = false;
    options.onInteract?.();
  });

  const resize = () => {
    const width = Math.max(1, container.clientWidth);
    const height = Math.max(1, container.clientHeight);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    requestRender();
  };
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);
  const intersectionObserver = new IntersectionObserver((entries) => {
    visible = entries.some((entry) => entry.isIntersecting);
    if (visible) requestRender();
  });
  intersectionObserver.observe(container);

  resize();
  resetView();

  const totalQuads = data.opaque.quadCount + data.cutout.quadCount + data.translucent.quadCount;

  return {
    resetView,
    rotateBy(azimuth, polar) {
      const offset = camera.position.clone().sub(controls.target);
      const spherical = new Spherical().setFromVector3(offset);
      spherical.theta += azimuth;
      spherical.phi = Math.min(controls.maxPolarAngle, Math.max(0.05, spherical.phi + polar));
      controls.autoRotate = false;
      applySpherical(spherical);
      controls.update();
      requestRender();
    },
    zoomBy(factor) {
      const offset = camera.position.clone().sub(controls.target);
      const distance = Math.min(controls.maxDistance, Math.max(controls.minDistance, offset.length() * factor));
      camera.position.copy(controls.target).add(offset.setLength(distance));
      controls.update();
      requestRender();
    },
    setAutoRotate(enabled) {
      controls.autoRotate = enabled && !reducedMotion;
      requestRender();
    },
    screenshot() {
      renderer.render(scene, camera);
      return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), "image/png"));
    },
    dispose() {
      if (frame) cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      controls.dispose();
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => material.dispose());
      texture.dispose();
      renderer.dispose();
      canvas.remove();
    },
    stats: { quads: totalQuads, drawCalls: geometries.length },
  };
}
