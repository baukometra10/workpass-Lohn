import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dir = path.join(root, "icons");
fs.mkdirSync(dir, { recursive: true });

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeB = Buffer.from(type);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeB, data])));
  return Buffer.concat([len, typeB, data, crc]);
}

function png(size, r = 29, g = 78, b = 216) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    const row = y * (size * 4 + 1);
    raw[row] = 0;
    for (let x = 0; x < size; x++) {
      const i = row + 1 + x * 4;
      const cx = x - size / 2;
      const cy = y - size / 2;
      const d = Math.sqrt(cx * cx + cy * cy);
      const inCircle = d < size * 0.38;
      const inRing = d < size * 0.42 && d > size * 0.3;
      if (inRing || (inCircle && d < size * 0.12)) {
        raw[i] = 255;
        raw[i + 1] = 255;
        raw[i + 2] = 255;
        raw[i + 3] = 255;
      } else if (inCircle) {
        raw[i] = 93;
        raw[i + 1] = 180;
        raw[i + 2] = 255;
        raw[i + 3] = 255;
      } else {
        raw[i] = r;
        raw[i + 1] = g;
        raw[i + 2] = b;
        raw[i + 3] = 255;
      }
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

fs.writeFileSync(path.join(dir, "icon-192.png"), png(192));
fs.writeFileSync(path.join(dir, "icon-512.png"), png(512));
fs.writeFileSync(
  path.join(dir, "icon.svg"),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#5db4ff"/><stop offset="1" stop-color="#1d4ed8"/></linearGradient></defs><rect width="128" height="128" rx="28" fill="url(#g)"/><circle cx="64" cy="64" r="28" fill="none" stroke="#fff" stroke-width="8"/><circle cx="64" cy="64" r="10" fill="#fff"/></svg>`
);
console.log("PWA icons written to", dir);
