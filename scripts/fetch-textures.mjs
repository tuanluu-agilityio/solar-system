// Downloads Solar System Scope textures, converts them to WebP (low + high sets)
// and writes public/textures/manifest.json. Idempotent; source files are cached.
import { existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CACHE = resolve(ROOT, '.cache/textures-src');
const OUT = resolve(ROOT, 'public/textures');
const BASE_URL = 'https://www.solarsystemscope.com/textures/download/';
const QUALITY = 82;
const RETRIES = 3;

// key -> source file. `kind` selects special handling; `native` caps both sets at the source size.
const SOURCES = [
  { key: 'sun', file: '8k_sun.jpg' },
  { key: 'mercury', file: '8k_mercury.jpg' },
  { key: 'venus_surface', file: '8k_venus_surface.jpg' },
  { key: 'venus_atmosphere', file: '4k_venus_atmosphere.jpg' },
  { key: 'earth_day', file: '8k_earth_daymap.jpg' },
  { key: 'earth_night', file: '8k_earth_nightmap.jpg' },
  { key: 'earth_clouds', file: '8k_earth_clouds.jpg', kind: 'clouds' },
  { key: 'moon', file: '8k_moon.jpg' },
  { key: 'mars', file: '8k_mars.jpg' },
  { key: 'jupiter', file: '8k_jupiter.jpg' },
  { key: 'saturn', file: '8k_saturn.jpg' },
  { key: 'saturn_ring', file: '8k_saturn_ring_alpha.png', kind: 'ring' },
  { key: 'uranus', file: '2k_uranus.jpg' },
  { key: 'neptune', file: '2k_neptune.jpg' },
  { key: 'sky', file: '8k_stars_milky_way.jpg', kind: 'sky' },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function download(file) {
  const dest = resolve(CACHE, file);
  if (existsSync(dest) && statSync(dest).size > 0) return dest;
  let lastErr;
  for (let attempt = 1; attempt <= RETRIES; attempt++) {
    try {
      const res = await fetch(BASE_URL + file, {
        headers: { 'User-Agent': 'Mozilla/5.0 solar-system-explorer texture fetch' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
      console.log(`downloaded ${file}`);
      return dest;
    } catch (err) {
      lastErr = err;
      console.warn(`attempt ${attempt}/${RETRIES} failed for ${file}: ${err.message}`);
      await sleep(1000 * attempt);
    }
  }
  throw new Error(`could not download ${file}: ${lastErr?.message}`);
}

async function toWebp(pipeline, outPath) {
  await pipeline.webp({ quality: QUALITY, alphaQuality: 90 }).toFile(outPath);
  return statSync(outPath).size;
}

async function cloudsBuffer(src) {
  // White clouds on transparent: luminance becomes alpha.
  const { data, info } = await sharp(src).greyscale().raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

async function cloudsPipeline(src, width) {
  const { data, width: w, height: h } = await cloudsBuffer(src);
  const rgba = Buffer.alloc(w * h * 4, 255);
  for (let i = 0; i < w * h; i++) rgba[i * 4 + 3] = data[i];
  return sharp(rgba, { raw: { width: w, height: h, channels: 4 } }).resize({
    width: Math.min(width, w),
  });
}

// Procedural Pluto: tan base, reddish equatorial band, light heart patch near lon 180 deg.
async function plutoPipeline() {
  const W = 2048;
  const H = 1024;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <filter id="n" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.006 0.012" numOctaves="6" seed="7" result="t"/>
      <feColorMatrix in="t" type="matrix" values="0 0 0 0 0.25  0 0 0 0 0.18  0 0 0 0 0.12  0 0 0 -1.4 1.1"/>
    </filter>
    <filter id="blur"><feGaussianBlur stdDeviation="14"/></filter>
    <linearGradient id="band" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#6b3a2a" stop-opacity="0"/>
      <stop offset="0.5" stop-color="#6b3a2a" stop-opacity="0.75"/>
      <stop offset="1" stop-color="#6b3a2a" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="#c9b08f"/>
  <rect y="${H * 0.34}" width="${W}" height="${H * 0.32}" fill="url(#band)" filter="url(#blur)"/>
  <path filter="url(#blur)" fill="#f1e6d2" fill-opacity="0.92"
    d="M${W / 2} ${H * 0.58} C${W / 2 - 150} ${H * 0.4} ${W / 2 - 150} ${H * 0.3} ${W / 2 - 70} ${H * 0.3}
       C${W / 2 - 25} ${H * 0.3} ${W / 2} ${H * 0.36} ${W / 2} ${H * 0.4}
       C${W / 2} ${H * 0.36} ${W / 2 + 25} ${H * 0.3} ${W / 2 + 70} ${H * 0.3}
       C${W / 2 + 150} ${H * 0.3} ${W / 2 + 150} ${H * 0.4} ${W / 2} ${H * 0.58} Z"/>
  <rect width="${W}" height="${H}" filter="url(#n)" opacity="0.55"/>
</svg>`;
  return sharp(Buffer.from(svg)).removeAlpha();
}

async function main() {
  mkdirSync(CACHE, { recursive: true });
  for (const set of ['low', 'high']) mkdirSync(resolve(OUT, set), { recursive: true });

  const manifest = { low: {}, high: {} };
  const sizes = { low: 0, high: 0 };
  const record = (set, key, bytes) => {
    manifest[set][key] = `textures/${set}/${key}.webp`;
    sizes[set] += bytes;
    console.log(`  ${set}/${key}.webp ${(bytes / 1024).toFixed(0)} KB`);
  };

  for (const s of SOURCES) {
    const src = await download(s.file);
    const meta = await sharp(src).metadata();
    const srcW = meta.width ?? 0;

    if (s.kind === 'ring') {
      for (const set of ['low', 'high']) {
        const out = resolve(OUT, set, `${s.key}.webp`);
        record(set, s.key, await toWebp(sharp(src).resize({ width: 2048 }), out));
      }
    } else if (s.kind === 'sky') {
      const low = resolve(OUT, 'low/sky_2048.webp');
      record('low', 'sky_2048', await toWebp(sharp(src).resize(2048, 1024), low));
      const high = resolve(OUT, 'high/sky_4096.webp');
      record('high', 'sky_4096', await toWebp(sharp(src).resize(4096, 2048), high));
    } else {
      for (const [set, width] of [
        ['low', 2048],
        ['high', 4096],
      ]) {
        const out = resolve(OUT, set, `${s.key}.webp`);
        const w = Math.min(width, srcW); // never upscale
        const pipe =
          s.kind === 'clouds'
            ? await cloudsPipeline(src, w)
            : sharp(src).resize({ width: w, withoutEnlargement: true });
        record(set, s.key, await toWebp(pipe, out));
      }
    }
  }

  // Pluto: same procedural file for both sets.
  const plutoLow = resolve(OUT, 'low/pluto.webp');
  record('low', 'pluto', await toWebp(await plutoPipeline(), plutoLow));
  const plutoHigh = resolve(OUT, 'high/pluto.webp');
  record('high', 'pluto', await toWebp(await plutoPipeline(), plutoHigh));

  const ordered = (set) =>
    Object.fromEntries(Object.entries(set).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(
    resolve(OUT, 'manifest.json'),
    JSON.stringify({ low: ordered(manifest.low), high: ordered(manifest.high) }, null, 2) + '\n',
  );
  console.log(
    `\nTotal low: ${(sizes.low / 1048576).toFixed(2)} MB, high: ${(sizes.high / 1048576).toFixed(2)} MB`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
