// Prints a short "where were we" summary at session start. No dependencies; never fails.
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const out = [];
const say = (s) => out.push(s);
const sh = (cmd) => {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 8000 }).trim();
  } catch {
    return '';
  }
};
const safe = (fn) => {
  try {
    fn();
  } catch {
    /* ignore */
  }
};
const listFiles = (dir) =>
  readdirSync(dir)
    .map((f) => join(dir, f))
    .filter((p) => statSync(p).isFile())
    .map((p) => ({ p, t: statSync(p).mtimeMs }))
    .sort((a, b) => b.t - a.t);

let planPath = '';
safe(() => {
  const dir = 'docs/superpowers/plans';
  if (!existsSync(dir)) return;
  const files = listFiles(dir).filter((f) => f.p.endsWith('.md'));
  if (!files.length) return;
  planPath = files[0].p.replace(/\\/g, '/');
  say(`Plan: ${planPath}`);
});

safe(() => {
  if (!planPath) return;
  const lines = readFileSync(planPath, 'utf8').split(/\r?\n/);
  let current = null;
  for (const line of lines) {
    if (/^### Task \d+/.test(line)) current = line;
    else if (current && /^\s*- \[ \]/.test(line)) {
      say(`Current: ${current.replace(/^### /, '')}`);
      return;
    }
  }
  say('Current: all tasks ticked');
});

safe(() => {
  const dir = 'docs/progress';
  if (!existsSync(dir)) return;
  const files = listFiles(dir)
    .filter((f) => f.p.endsWith('.md') && !f.p.endsWith('README.md'))
    .slice(0, 5);
  if (files.length) say('Recent progress:');
  for (const f of files) {
    const head = readFileSync(f.p, 'utf8').split(/\r?\n/).filter(Boolean).slice(0, 3);
    say(`- ${f.p.replace(/\\/g, '/')}: ${head.join(' | ')}`);
  }
});

safe(() => {
  const raw = sh('gh pr list --state open --json number,headRefName,title');
  if (!raw) return;
  const prs = JSON.parse(raw);
  if (prs.length) say('Open PRs:');
  for (const pr of prs) say(`- #${pr.number} ${pr.headRefName}: ${pr.title}`);
});

safe(() => {
  const wt = sh('git worktree list');
  if (wt) say(`Worktrees:\n${wt}`);
});

safe(() => {
  const f = 'docs/KNOWN_ISSUES.md';
  if (!existsSync(f)) return;
  const open = readFileSync(f, 'utf8')
    .split(/\r?\n/)
    .filter((l) => l.startsWith('## ') && !/\(resolved\)/i.test(l));
  if (open.length) say('Open known issues:');
  for (const l of open) say(`- ${l.slice(3)}`);
});

safe(() => {
  say(`Branch: ${sh('git branch --show-current') || '(unknown)'}`);
  const st = sh('git status --porcelain').split(/\r?\n/).filter(Boolean).slice(0, 10);
  if (st.length) say(`Status:\n${st.join('\n')}`);
});

console.log(out.join('\n').split('\n').slice(0, 40).join('\n'));
process.exit(0);
