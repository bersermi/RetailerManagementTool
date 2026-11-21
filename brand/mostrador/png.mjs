// ============================================================================
// A PNG, READ TO ITS PIXELS AND WRITTEN BACK — with Node alone, for
// brand/render-mostrador.sh (the crop) and brand/mostrador/objetos.mjs (the check).
//
// Reads what Chrome writes: 8 bits a channel, truecolour with alpha (colour
// type 6) or without (2), not interlaced. Anything else is refused by name
// rather than read wrong. Writes 8-bit RGBA. No dependency: zlib is Node's.
//
//   node brand/mostrador/png.mjs recortar <in.png> <out.png> <width> <height>
//     keeps the top-left <width> x <height> pixels. ⚠️ Not `sips -c`: its
//     `--cropOffset 0 0` is taken as no offset at all and it crops the middle,
//     measured 2026-11-21 (every picture came out empty).
// ============================================================================

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { deflateSync, inflateSync } from 'node:zlib';

const SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

/** `{ width, height, rgba }` — `rgba` four bytes a pixel, row by row. */
export function readPng(path) {
  const file = readFileSync(path);
  if (!file.subarray(0, 8).equals(SIGNATURE)) throw new Error(`${path} is not a PNG`);
  let at = 8;
  let width = 0;
  let height = 0;
  let colourType = -1;
  const data = [];
  while (at < file.length) {
    const length = file.readUInt32BE(at);
    const type = file.toString('latin1', at + 4, at + 8);
    const body = file.subarray(at + 8, at + 8 + length);
    if (type === 'IHDR') {
      width = body.readUInt32BE(0);
      height = body.readUInt32BE(4);
      const depth = body[8];
      colourType = body[9];
      const interlace = body[12];
      if (depth !== 8 || (colourType !== 6 && colourType !== 2) || interlace !== 0) {
        throw new Error(`${path}: depth ${depth}, colour type ${colourType}, interlace ${interlace} — only 8-bit RGB(A), not interlaced`);
      }
    } else if (type === 'IDAT') {
      data.push(body);
    } else if (type === 'IEND') {
      break;
    }
    at += 12 + length;
  }
  const channels = colourType === 6 ? 4 : 3;
  const raw = inflateSync(Buffer.concat(data));
  const stride = width * channels;
  const out = Buffer.alloc(width * height * channels);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const row = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? out[y * stride + x - channels] : 0;
      const b = y > 0 ? out[(y - 1) * stride + x] : 0;
      const c = x >= channels && y > 0 ? out[(y - 1) * stride + x - channels] : 0;
      let v = row[x];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      } else if (filter !== 0) throw new Error(`${path}: unknown filter ${filter} on row ${y}`);
      out[y * stride + x] = v & 255;
    }
  }
  if (channels === 4) return { width, height, rgba: out };
  const rgba = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    out.copy(rgba, i * 4, i * 3, i * 3 + 3);
    rgba[i * 4 + 3] = 255;
  }
  return { width, height, rgba };
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(bytes) {
  let c = 0xffffffff;
  for (const b of bytes) c = CRC_TABLE[(c ^ b) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, body) {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(body.length, 0);
  head.write(type, 4, 'latin1');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), body])), 0);
  return Buffer.concat([head, body, crc]);
}

/** Writes `{ width, height, rgba }` as an 8-bit RGBA PNG, every row unfiltered. */
export function writePng(path, { width, height, rgba }) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const raw = Buffer.alloc(height * (width * 4 + 1));
  for (let y = 0; y < height; y++) rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  writeFileSync(path, Buffer.concat([SIGNATURE, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]));
}

/** The top-left `width` x `height` pixels of a picture. */
export function crop(picture, width, height) {
  if (width > picture.width || height > picture.height) {
    throw new Error(`cannot keep ${width} x ${height} of a ${picture.width} x ${picture.height} picture`);
  }
  const rgba = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++) picture.rgba.copy(rgba, y * width * 4, y * picture.width * 4, y * picture.width * 4 + width * 4);
  return { width, height, rgba };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [verb, from, to, w, h] = process.argv.slice(2);
  if (verb !== 'recortar' || !from || !to || !(Number(w) > 0) || !(Number(h) > 0)) {
    console.error('usage: node brand/mostrador/png.mjs recortar <in.png> <out.png> <width> <height>');
    process.exit(2);
  }
  writePng(to, crop(readPng(from), Number(w), Number(h)));
}
