// Token usage report for a Claude Code project, built from the local transcripts.
//
// Usage: node scripts/token-stats.mjs [projectDir]
//   projectDir defaults to ~/.claude/projects/<this repo path with separators replaced by "-">.
//
// Each assistant message in a transcript carries a `usage` block. Streaming writes the same message
// id several times, so entries are deduplicated by message id (the one with the most output wins).
// Main-session transcripts and every subagent transcript below `subagents/` are included.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, join, resolve } from 'node:path';

const MODEL_LABEL = {
  'claude-opus-5-5': 'Opus',
  'claude-sonnet-5-5': 'Sonnet',
  'claude-haiku-5-5': 'Haiku',
};

const emptyUsage = () => ({ input: 0, cacheWrite: 0, cacheRead: 0, output: 0, calls: 0 });

function addUsage(total, u) {
  total.input += u.input_tokens ?? 0;
  total.cacheWrite += u.cache_creation_input_tokens ?? 0;
  total.cacheRead += u.cache_read_input_tokens ?? 0;
  total.output += u.output_tokens ?? 0;
  total.calls += 1;
}

function mergeUsage(into, from) {
  for (const key of Object.keys(emptyUsage())) into[key] += from[key];
}

function defaultProjectDir() {
  const slug = resolve(process.cwd()).replace(/[:\\/ ]/g, '-');
  return join(homedir(), '.claude', 'projects', slug);
}

function findTranscripts(dir, found = []) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) findTranscripts(path, found);
    else if (path.endsWith('.jsonl')) found.push(path);
  }
  return found;
}

function readTranscript(path) {
  const metaPath = path.replace(/\.jsonl$/, '.meta.json');
  const meta = existsSync(metaPath) ? JSON.parse(readFileSync(metaPath, 'utf8')) : {};
  const byMessage = new Map();
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    if (!line) continue;
    let entry;
    try {
      entry = JSON.parse(line);
    } catch {
      continue;
    }
    const message = entry.message;
    if (entry.type !== 'assistant' || !message?.usage || !message.model) continue;
    if (message.model === '<synthetic>') continue;
    const key = message.id ?? entry.uuid;
    const known = byMessage.get(key);
    if (!known || (message.usage.output_tokens ?? 0) >= (known.usage.output_tokens ?? 0)) {
      byMessage.set(key, { usage: message.usage, model: message.model });
    }
  }
  const perModel = {};
  const total = emptyUsage();
  for (const { usage, model } of byMessage.values()) {
    perModel[model] ??= emptyUsage();
    addUsage(perModel[model], usage);
    addUsage(total, usage);
  }
  return {
    id: basename(path, '.jsonl'),
    isSubagent: path.includes('subagents'),
    meta,
    perModel,
    total,
  };
}

function taskOf(transcript) {
  const description = transcript.meta.description ?? '';
  const match = description.match(/Task\s*(\d+b?)/i) ?? description.match(/\bT(\d+b?)\b/i);
  return match ? `T${match[1].replace(/^0+/, '')}` : description || '(no description)';
}

const fmt = (n) => n.toLocaleString('en-US');
const context = (u) => u.input + u.cacheWrite + u.cacheRead;

function printTable(title, rows) {
  console.log(`\n## ${title}\n`);
  console.log('| Group | Agents | API calls | Context processed | Output |');
  console.log('|---|---:|---:|---:|---:|');
  for (const [name, row] of rows) {
    console.log(
      `| ${name} | ${row.n} | ${fmt(row.calls)} | ${fmt(context(row))} | ${fmt(row.output)} |`,
    );
  }
}

function group(transcripts, keyOf) {
  const groups = new Map();
  for (const t of transcripts) {
    const key = keyOf(t);
    const row = groups.get(key) ?? { ...emptyUsage(), n: 0 };
    mergeUsage(row, t.total);
    row.n += 1;
    groups.set(key, row);
  }
  return groups;
}

const projectDir = process.argv[2] ? resolve(process.argv[2]) : defaultProjectDir();
if (!existsSync(projectDir)) {
  console.error(`No transcripts at ${projectDir}`);
  process.exit(1);
}

const transcripts = findTranscripts(projectDir).map(readTranscript);
const total = emptyUsage();
const perModel = {};
for (const t of transcripts) {
  mergeUsage(total, t.total);
  for (const [model, usage] of Object.entries(t.perModel)) {
    perModel[model] ??= emptyUsage();
    mergeUsage(perModel[model], usage);
  }
}

console.log(`# Token usage for ${projectDir}`);
console.log(
  `\nTranscripts: ${transcripts.length} (${transcripts.filter((t) => !t.isSubagent).length} sessions, ${transcripts.filter((t) => t.isSubagent).length} subagents)`,
);
console.log('\n## Totals per model\n');
console.log('| Model | API calls | Fresh input | Cache write | Cache read | Output |');
console.log('|---|---:|---:|---:|---:|---:|');
for (const [model, u] of Object.entries(perModel)) {
  console.log(
    `| ${MODEL_LABEL[model] ?? model} | ${fmt(u.calls)} | ${fmt(u.input)} | ${fmt(u.cacheWrite)} | ${fmt(u.cacheRead)} | ${fmt(u.output)} |`,
  );
}
console.log(
  `| **All** | **${fmt(total.calls)}** | **${fmt(total.input)}** | **${fmt(total.cacheWrite)}** | **${fmt(total.cacheRead)}** | **${fmt(total.output)}** |`,
);

printTable(
  'Per agent type',
  [
    ...group(transcripts, (t) =>
      t.isSubagent ? (t.meta.agentType ?? 'unknown') : 'controller session',
    ),
  ].sort((a, b) => context(b[1]) - context(a[1])),
);
printTable(
  'Per task (subagents only)',
  [
    ...group(
      transcripts.filter((t) => t.isSubagent),
      taskOf,
    ),
  ].sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true })),
);
