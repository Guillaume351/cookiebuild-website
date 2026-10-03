import { crc32, deflateSync } from "node:zlib";

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function chunk(type: string, data: Buffer) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const typeAndData = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData) >>> 0);
  return Buffer.concat([length, typeAndData, crc]);
}

/** Encodes an 8-bit RGB buffer (width*height*3 bytes) as a PNG, in pure JS (node:zlib). */
export function encodePngRgb(width: number, height: number, rgb: Uint8Array, level = 6) {
  if (rgb.length !== width * height * 3) throw new Error("RGB buffer size does not match the image size");
  const stride = width * 3;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (stride + 1);
    const source = y * stride;
    // "Sub" filter: smooth gradients and flat faces compress well.
    raw[rowStart] = 1;
    for (let x = 0; x < stride; x += 1) {
      const left = x >= 3 ? rgb[source + x - 3]! : 0;
      raw[rowStart + 1 + x] = (rgb[source + x]! - left) & 0xff;
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bit depth
  header[9] = 2; // color type: truecolor RGB
  header[10] = 0;
  header[11] = 0;
  header[12] = 0;
  return Buffer.concat([
    SIGNATURE,
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw, { level })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/** Reads width and height from a PNG header (used by tests and sanity checks). */
export function pngDimensions(png: Uint8Array) {
  const buffer = Buffer.from(png.buffer, png.byteOffset, png.byteLength);
  if (buffer.length < 24 || !buffer.subarray(0, 8).equals(SIGNATURE)) return null;
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}
