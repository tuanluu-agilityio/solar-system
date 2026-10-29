#!/usr/bin/env node
// Load-budget check (spec section 6, plan Task 29). Run after `npm run build`.
//   JS budget:       gzip size of dist/**/*.js                              <= 800 KB
//   Initial payload: JS + CSS + index.html + JSON manifests (gzip)
//                    + every textures/low/* file + the low sky (as served)  <= 8 MB
// High-res textures, the 4096 sky and narration mp3 files load lazily and are not counted.
// Usage: node scripts/check-budget.mjs [--dist <dir>]   Exit code 1 when over budget.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { gzipSync } from 'node:zlib';

const KB = 1024;
const MB = 1024 * KB;
const JS_BUDGET = 800 * KB;
const INITIAL_BUDGET = 8 * MB;

function parseDist(argv) {
  const i = argv.indexOf('--dist');
  return resolve(i >= 0 && argv[i + 1] ? argv[i + 1] : 'dist');
}

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.isFile()) out.push(full);
  }
  return out;
}

const gzipBytes = (file) => gzipSync(readFileSync(file), { level: 9 }).length;
const rawBytes = (file) => statSync(file).size;
const fmt = (n) => (n >= MB ? `${(n / MB).toFixed(2)} MB` : `${(n / KB).toFixed(1)} KB`);

function main() {
  const dist = parseDist(process.argv.slice(2));
  if (!existsSync(join(dist, 'index.html'))) {
    console.error(`check-budget: no build found at ${dist}. Run \`npm run build\` first.`);
    return 1;
  }
  const rel = (f) => relative(dist, f).split(sep).join('/');
  const files = walk(dist);

  /** @type {{file: string, kind: string, bytes: number}[]} */
  const rows = [];
  for (const f of files) {
    const r = rel(f);
    if (r.endsWith('.js')) rows.push({ file: r, kind: 'js (gzip)', bytes: gzipBytes(f) });
  }
  for (const f of files) {
    const r = rel(f);
    if (r.endsWith('.css') || r === 'index.html') {
      rows.push({ file: r, kind: 'gzip', bytes: gzipBytes(f) });
    }
  }
  // Manifests fetched at boot (textures always; narration manifest by the tour controller).
  for (const r of ['textures/manifest.json', 'audio/narration/manifest.json']) {
    const f = join(dist, r);
    if (existsSync(f)) rows.push({ file: r, kind: 'gzip', bytes: gzipBytes(f) });
  }

  // Low texture set: everything under textures/low plus every `low` manifest entry (the sky).
  const textures = new Set();
  const lowDir = join(dist, 'textures', 'low');
  if (existsSync(lowDir)) for (const f of walk(lowDir)) textures.add(rel(f));
  const manifestFile = join(dist, 'textures', 'manifest.json');
  if (existsSync(manifestFile)) {
    const manifest = JSON.parse(readFileSync(manifestFile, 'utf8'));
    for (const path of Object.values(manifest.low ?? {})) textures.add(String(path));
  }
  for (const r of [...textures].sort()) {
    const f = join(dist, ...r.split('/'));
    if (!existsSync(f)) {
      console.error(`check-budget: manifest entry ${r} is missing from the build.`);
      return 1;
    }
    rows.push({ file: r, kind: 'webp', bytes: rawBytes(f) });
  }

  const jsTotal = rows.filter((r) => r.kind === 'js (gzip)').reduce((s, r) => s + r.bytes, 0);
  const initialTotal = rows.reduce((s, r) => s + r.bytes, 0);

  const width = Math.max(...rows.map((r) => r.file.length), 30);
  console.log(`${'File'.padEnd(width)}  ${'Kind'.padEnd(10)}  ${'Size'.padStart(10)}`);
  console.log('-'.repeat(width + 24));
  for (const r of rows) {
    console.log(`${r.file.padEnd(width)}  ${r.kind.padEnd(10)}  ${fmt(r.bytes).padStart(10)}`);
  }
  console.log('-'.repeat(width + 24));

  const jsOk = jsTotal <= JS_BUDGET;
  const initialOk = initialTotal <= INITIAL_BUDGET;
  const line = (name, used, limit, ok) =>
    `${name.padEnd(18)} ${fmt(used).padStart(10)} / ${fmt(limit).padStart(9)}  ` +
    `(${((used / limit) * 100).toFixed(1)}%)  ${ok ? 'PASS' : 'FAIL'}`;
  console.log(line('JS (gzip)', jsTotal, JS_BUDGET, jsOk));
  console.log(line('Initial payload', initialTotal, INITIAL_BUDGET, initialOk));
  return jsOk && initialOk ? 0 : 1;
}

process.exitCode = main();
