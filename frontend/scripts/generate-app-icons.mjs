// Render the existing MealQ Q mark as small dependency-free PNG app icons.
import { mkdir, writeFile, readFile, copyFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";

const output = fileURLToPath(new URL("../public/icons/", import.meta.url));
await mkdir(output, { recursive: true });
function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) { crc ^= byte; for (let n = 0; n < 8; n++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0); }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const name = Buffer.from(type); const length = Buffer.alloc(4); length.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([name, data])));
  return Buffer.concat([length, name, data, crc]);
}
function isMark(x, y) {
  const outer = ((x - 0.48) / 0.235) ** 2 + ((y - 0.46) / 0.28) ** 2 <= 1;
  const inner = ((x - 0.48) / 0.16) ** 2 + ((y - 0.46) / 0.205) ** 2 < 1;
  const tail = x > 0.5 && x < 0.71 && y > x + 0.015 && y < x + 0.105 && y > 0.59;
  return (outer && !inner) || tail;
}
for (const size of [180, 192, 512]) {
  const raw = Buffer.alloc((size * 3 + 1) * size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let samples = 0;
    for (let sy = 0; sy < 4; sy++) for (let sx = 0; sx < 4; sx++) if (isMark((x + (sx + 0.5) / 4) / size, (y + (sy + 0.5) / 4) / size)) samples++;
    const mix = samples / 16; const index = y * (size * 3 + 1) + 1 + x * 3;
    raw[index] = 255; raw[index + 1] = Math.round(162 + (255 - 162) * mix); raw[index + 2] = Math.round(89 + (255 - 89) * mix);
  }
  const header = Buffer.alloc(13); header.writeUInt32BE(size, 0); header.writeUInt32BE(size, 4); header[8] = 8; header[9] = 2;
  const image = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", header), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
  const target = path.join(output, `mealq-${size}.png`);
  if (existsSync(target)) {
    const previous = await readFile(target); const backup = path.join(os.tmpdir(), `mealq-icon-${size}-${Date.now()}.png`);
    await copyFile(target, backup); if (!previous.equals(await readFile(backup))) throw new Error("App icon backup verification failed");
    console.log(`Previous icon backed up: ${backup}`);
  }
  await writeFile(target, image); console.log(`Generated ${size}x${size} MealQ icon`);
}
