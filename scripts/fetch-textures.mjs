// Downloads Solar System Scope textures and USGS moon mosaics, converts them to WebP (low + high sets)
// and writes public/textures/manifest.json. Idempotent; source files are cached.
//   node scripts/fetch-textures.mjs [--only key1,key2]
// `--only` converts just those keys and merges them into the existing manifest, leaving every
// other committed file untouched.
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CACHE = resolve(ROOT, '.cache/textures-src');
const OUT = resolve(ROOT, 'public/textures');
const BASE_URL = 'https://www.solarsystemscope.com/textures/download/';
const USGS_MOSAIC = 'https://planetarymaps.usgs.gov/mosaic/';
const QUALITY = 82;
const RETRIES = 3;

// key -> source file. `kind` selects special handling; `lowWidth` overrides the low-set width
// (the low set is the initial download, so data maps that only refine shading stay small).
// TIFF sources (Earth normal and specular maps) are read by sharp like any other format.
const SOURCES = [
  { key: 'sun', file: '8k_sun.jpg' },
  { key: 'mercury', file: '8k_mercury.jpg' },
  { key: 'venus_surface', file: '8k_venus_surface.jpg' },
  { key: 'venus_atmosphere', file: '4k_venus_atmosphere.jpg' },
  { key: 'earth_day', file: '8k_earth_daymap.jpg' },
  { key: 'earth_night', file: '8k_earth_nightmap.jpg' },
  { key: 'earth_clouds', file: '8k_earth_clouds.jpg', kind: 'clouds' },
  { key: 'earth_normal', file: '8k_earth_normal_map.tif', kind: 'data', lowWidth: 1024 },
  { key: 'earth_specular', file: '8k_earth_specular_map.tif', kind: 'mask', lowWidth: 1024 },
  { key: 'moon', file: '8k_moon.jpg' },
  { key: 'mars', file: '8k_mars.jpg' },
  { key: 'jupiter', file: '8k_jupiter.jpg' },
  { key: 'saturn', file: '8k_saturn.jpg' },
  { key: 'saturn_ring', file: '8k_saturn_ring_alpha.png', kind: 'ring' },
  { key: 'uranus', file: '2k_uranus.jpg' },
  { key: 'neptune', file: '2k_neptune.jpg' },
  { key: 'sky', file: '8k_stars_milky_way.jpg', kind: 'sky' },
  // Moons: USGS Astrogeology global mosaics (public domain, "Use Constraints: None" or "Please
  // cite authors" on each product page; Voyager, Galileo, Cassini and Viking data from NASA's
  // Planetary Data System). Every GeoTIFF below is simple cylindrical, positive east, centred on
  // longitude 0 like the Solar System Scope maps, except Enceladus (0 to 360: `roll` by half).
  // The greyscale mosaics are tinted with a gradient (`palette`, dark to bright) toward the
  // moon's true colour; `nodata` black at the unimaged poles is filled from nearby latitudes.
  // Moon maps load lazily when their planet system is first shown, so the low set stays small.
  {
    key: 'io',
    url: `${USGS_MOSAIC}Io_GalileoSSI-Voyager_Global_Mosaic_ClrMerge_1km.tif`,
    kind: 'mosaic',
    lowWidth: 1024,
  },
  {
    key: 'europa',
    url: `${USGS_MOSAIC}Europa_Voyager_GalileoSSI_global_mosaic_500m.tif`,
    kind: 'mosaic',
    lowWidth: 1024,
    palette: ['#74452f', '#b0927a', '#e0d5c4', '#f7f3ec'],
  },
  {
    key: 'ganymede',
    url: `${USGS_MOSAIC}Ganymede_Voyager_GalileoSSI_global_mosaic_1km.tif`,
    kind: 'mosaic',
    lowWidth: 1024,
    palette: ['#3b332c', '#6f6458', '#a79c8e', '#e2ddd5'],
  },
  {
    key: 'callisto',
    url: `${USGS_MOSAIC}Callisto_Voyager_GalileoSSI_global_mosaic_1km.tif`,
    kind: 'mosaic',
    lowWidth: 1024,
    palette: ['#211d19', '#4a423a', '#7d7268', '#e6e1d8'],
  },
  {
    key: 'enceladus',
    url: `${USGS_MOSAIC}Enceladus_Cassini_mosaic_global_110m.tif`,
    kind: 'mosaic',
    lowWidth: 1024,
    roll: 0.5,
    palette: ['#9eabb4', '#d5dde2', '#f4f7f9', '#ffffff'],
  },
  {
    // Titan's surface at 938 nm, seen through the haze: tinted toward the orange smog.
    key: 'titan',
    url: `${USGS_MOSAIC}Titan_ISS_P19658_Mosaic_Global_4km.tif`,
    kind: 'mosaic',
    lowWidth: 1024,
    palette: ['#4a2c14', '#8a5a2c', '#c08a50', '#e2b47a'],
  },
  {
    key: 'phobos',
    url: `${USGS_MOSAIC}Phobos_Viking_Mosaic_40ppd_DLRcontrol.tif`,
    kind: 'mosaic',
    lowWidth: 1024,
    palette: ['#2b2622', '#5a514a', '#8c8178', '#b9aea2'],
  },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Cached source file of an entry: `file` from Solar System Scope, or the last part of `url`. */
function sourceOf(s) {
  if (s.url) return { file: s.url.slice(s.url.lastIndexOf('/') + 1), url: s.url };
  return { file: s.file, url: BASE_URL + s.file };
}

async function download(s) {
  const { file, url } = sourceOf(s);
  const dest = resolve(CACHE, file);
  if (existsSync(dest) && statSync(dest).size > 0) return dest;
  let lastErr;
  for (let attempt = 1; attempt <= RETRIES; attempt++) {
    try {
      const res = await fetch(url, {
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

/** Pixel values at or below this are a mosaic's `nodata` (unimaged) black. */
const NODATA_MAX = 4;
/** Imaged pixels this close (vertically) to nodata are treated as nodata too. */
const NODATA_EDGE = 3;

function hexRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** 256-entry RGB lookup through evenly spaced colour stops. */
function paletteLut(stops) {
  const rgb = stops.map(hexRgb);
  const lut = new Uint8Array(256 * 3);
  for (let v = 0; v < 256; v++) {
    const x = (v / 255) * (rgb.length - 1);
    const i = Math.min(rgb.length - 2, Math.floor(x));
    const f = x - i;
    for (let c = 0; c < 3; c++) {
      lut[v * 3 + c] = Math.round(rgb[i][c] * (1 - f) + rgb[i + 1][c] * f);
    }
  }
  return lut;
}

/**
 * A USGS global mosaic resized to `width` x `width / 2`: rolled in longitude if needed, the
 * unimaged polar caps filled from the nearest imaged latitude of the same column (then smoothed
 * along the row so no streaks show), and greyscale mosaics stretched between their 1st and 99th
 * percentile and tinted through `palette`.
 */
async function mosaicPipeline(src, width, s) {
  const w = width;
  const h = width / 2;
  // Greyscale mosaics stay one channel (sharp would otherwise expand them to sRGB).
  const img = sharp(src, { limitInputPixels: false }).resize(w, h, { fit: 'fill' });
  const { data, info } = await (s.palette ? img.toColourspace('b-w') : img)
    .raw()
    .toBuffer({ resolveWithObject: true });
  const ch = info.channels;
  const shift = Math.round((s.roll ?? 0) * w);
  const px = Buffer.alloc(w * h * ch);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const from = (y * w + ((x + shift) % w)) * ch;
      data.copy(px, (y * w + x) * ch, from, from + ch);
    }
  }
  const valid = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    let m = 0;
    for (let c = 0; c < ch; c++) m = Math.max(m, px[i * ch + c]);
    valid[i] = m > NODATA_MAX ? 1 : 0;
  }
  // Resizing blends the black into the imaged edge: drop a few pixels next to any nodata.
  const edge = new Uint8Array(valid);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (valid[y * w + x]) continue;
      for (let k = -NODATA_EDGE; k <= NODATA_EDGE; k++) {
        const yy = y + k;
        if (yy >= 0 && yy < h) edge[yy * w + x] = 0;
      }
    }
  }
  valid.set(edge);
  // Fill each column's unimaged pixels from its nearest imaged pixel.
  const filled = new Uint8Array(w * h);
  for (let x = 0; x < w; x++) {
    let last = -1;
    const near = new Int32Array(h).fill(-1);
    for (let y = 0; y < h; y++) {
      if (valid[y * w + x]) last = y;
      near[y] = last;
    }
    let next = -1;
    for (let y = h - 1; y >= 0; y--) {
      if (valid[y * w + x]) next = y;
      else {
        const a = near[y];
        const pick = a < 0 ? next : next < 0 ? a : y - a <= next - y ? a : next;
        if (pick >= 0) {
          px.copy(px, (y * w + x) * ch, (pick * w + x) * ch, (pick * w + x) * ch + ch);
          filled[y * w + x] = 1;
        }
      }
    }
  }
  // Smooth the filled pixels along their row (wrapping in longitude).
  const R = Math.max(4, Math.round(w / 24));
  for (let y = 0; y < h; y++) {
    const row = px.subarray(y * w * ch, (y + 1) * w * ch);
    const copy = Buffer.from(row);
    for (let x = 0; x < w; x++) {
      if (!filled[y * w + x]) continue;
      for (let c = 0; c < ch; c++) {
        let sum = 0;
        for (let k = -R; k <= R; k++) sum += copy[((((x + k) % w) + w) % w) * ch + c];
        row[x * ch + c] = Math.round(sum / (2 * R + 1));
      }
    }
  }
  if (!s.palette || ch !== 1) {
    return sharp(px, { raw: { width: w, height: h, channels: ch } }).removeAlpha();
  }
  const hist = new Uint32Array(256);
  for (let i = 0; i < w * h; i++) if (valid[i]) hist[px[i]]++;
  const total = hist.reduce((a, b) => a + b, 0);
  const pct = (p) => {
    let acc = 0;
    for (let v = 0; v < 256; v++) {
      acc += hist[v];
      if (acc >= total * p) return v;
    }
    return 255;
  };
  const lo = pct(0.01);
  const hi = Math.max(lo + 1, pct(0.99));
  const lut = paletteLut(s.palette);
  const rgb = Buffer.alloc(w * h * 3);
  for (let i = 0; i < w * h; i++) {
    const v = Math.round(Math.min(1, Math.max(0, (px[i] - lo) / (hi - lo))) * 255);
    rgb[i * 3] = lut[v * 3];
    rgb[i * 3 + 1] = lut[v * 3 + 1];
    rgb[i * 3 + 2] = lut[v * 3 + 2];
  }
  return sharp(rgb, { raw: { width: w, height: h, channels: 3 } });
}

// Procedural Deimos: no public-domain global map of Deimos exists (Viking and Mars Express saw
// only parts of it). Dark grey-brown dust, softened by its thick regolith, with a few shallow
// craters; same generator for both sets.
async function deimosPipeline() {
  const W = 1024;
  const H = 512;
  // Seeded crater list (x, y, r in px): the map never changes between runs.
  let seed = 1877;
  const rand = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  let craters = '';
  for (let i = 0; i < 70; i++) {
    const x = rand() * W;
    const y = H * (0.12 + 0.76 * rand());
    // Mostly small craters, a few larger ones (all softened by the dust blanket).
    const r = 3 + 30 * rand() ** 3;
    craters += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="url(#crater)"/>`;
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <filter id="n" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.012 0.024" numOctaves="5" seed="11" stitchTiles="stitch" result="t"/>
      <feColorMatrix in="t" type="matrix" values="0 0 0 0 0.36  0 0 0 0 0.32  0 0 0 0 0.28  0 0 0 -1.3 1.0"/>
    </filter>
    <radialGradient id="crater">
      <stop offset="0" stop-color="#4d4540" stop-opacity="0.35"/>
      <stop offset="0.7" stop-color="#5c534c" stop-opacity="0.2"/>
      <stop offset="0.88" stop-color="#a1968a" stop-opacity="0.25"/>
      <stop offset="1" stop-color="#a1968a" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="#857a6f"/>
  <rect width="${W}" height="${H}" filter="url(#n)" opacity="0.6"/>
  ${craters}
</svg>`;
  return sharp(Buffer.from(svg)).removeAlpha();
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

function onlyKeys() {
  const i = process.argv.indexOf('--only');
  if (i < 0) return null;
  return new Set(
    String(process.argv[i + 1] ?? '')
      .split(',')
      .filter(Boolean),
  );
}

function readManifest() {
  const path = resolve(OUT, 'manifest.json');
  if (!existsSync(path)) return { low: {}, high: {} };
  return JSON.parse(readFileSync(path, 'utf8'));
}

async function main() {
  mkdirSync(CACHE, { recursive: true });
  for (const set of ['low', 'high']) mkdirSync(resolve(OUT, set), { recursive: true });

  const only = onlyKeys();
  const manifest = only ? readManifest() : { low: {}, high: {} };
  const sizes = { low: 0, high: 0 };
  const record = (set, key, bytes) => {
    manifest[set][key] = `textures/${set}/${key}.webp`;
    sizes[set] += bytes;
    console.log(`  ${set}/${key}.webp ${(bytes / 1024).toFixed(0)} KB`);
  };

  for (const s of SOURCES) {
    if (only && !only.has(s.key)) continue;
    const src = await download(s);
    const meta = await sharp(src, { limitInputPixels: false }).metadata();
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
        ['low', s.lowWidth ?? 2048],
        ['high', 4096],
      ]) {
        const out = resolve(OUT, set, `${s.key}.webp`);
        const w = Math.min(width, srcW); // never upscale
        let pipe;
        if (s.kind === 'clouds') pipe = await cloudsPipeline(src, w);
        else if (s.kind === 'mosaic') pipe = await mosaicPipeline(src, w, s);
        else if (s.kind === 'mask') {
          // Single-channel mask (ocean = white): greyscale keeps the WebP small.
          pipe = sharp(src).greyscale().resize({ width: w, withoutEnlargement: true });
        } else pipe = sharp(src).resize({ width: w, withoutEnlargement: true });
        record(set, s.key, await toWebp(pipe, out));
      }
    }
  }

  // Pluto and Deimos: the same procedural file for both sets.
  for (const [key, pipeline] of [
    ['pluto', plutoPipeline],
    ['deimos', deimosPipeline],
  ]) {
    if (only && !only.has(key)) continue;
    for (const set of ['low', 'high']) {
      record(set, key, await toWebp(await pipeline(), resolve(OUT, set, `${key}.webp`)));
    }
  }

  writeManifest(manifest, sizes);
}

function writeManifest(manifest, sizes) {
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
