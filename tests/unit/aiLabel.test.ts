// @vitest-environment node
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const SCRIPT = resolve(__dirname, '../../scripts/ai-label.mjs');

interface Commit {
  sha?: string;
  authorLogin?: string;
  authorName?: string;
  authorEmail?: string;
  message?: string;
  parents?: number;
  additions: number;
  deletions?: number;
}

let dirs: string[] = [];

afterEach(() => {
  for (const d of dirs) rmSync(d, { recursive: true, force: true });
  dirs = [];
});

const human = (lines: number, message = 'fix: tweak'): Commit => ({
  authorLogin: 'tuanluu',
  authorName: 'Tuan Luu',
  authorEmail: 'tuan.luu@example.com',
  message,
  additions: lines,
});
const assisted = (lines: number): Commit =>
  human(lines, 'feat: add thing\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>');

function run(commits: Commit[]): { label: string; share: number; agentCommit: boolean } {
  const dir = mkdtempSync(join(tmpdir(), 'sse-ailabel-'));
  dirs.push(dir);
  const file = join(dir, 'commits.json');
  writeFileSync(
    file,
    JSON.stringify(commits.map((c, i) => ({ sha: `sha${i}`, parents: 1, deletions: 0, ...c }))),
  );
  const res = spawnSync(process.execPath, [SCRIPT, '--commits', file], { encoding: 'utf8' });
  expect(res.status, res.stderr).toBe(0);
  return JSON.parse(res.stdout);
}

describe('ai-label', () => {
  it('labels agent-authors above 70% AI lines', () => {
    expect(run([assisted(71), human(29)]).label).toBe('agent-authors');
  });

  it('labels agent-assist from 50% to 70%', () => {
    expect(run([assisted(70), human(30)]).label).toBe('agent-assist');
    expect(run([assisted(50), human(50)]).label).toBe('agent-assist');
  });

  it('labels agent-unused below 50%', () => {
    expect(run([assisted(49), human(51)]).label).toBe('agent-unused');
    expect(run([human(10)]).label).toBe('agent-unused');
  });

  it('labels agent-authors when any commit is authored by an AI agent account', () => {
    const copilot: Commit = {
      authorLogin: 'Copilot',
      authorName: 'copilot-swe-agent[bot]',
      message: 'Initial plan',
      additions: 1,
    };
    const result = run([copilot, human(99)]);
    expect(result.label).toBe('agent-authors');
    expect(result.agentCommit).toBe(true);
  });

  it('recognises Generated-with lines and other AI co-authors', () => {
    expect(
      run([human(10, 'feat: x\n\nGenerated with [Claude Code](https://claude.com/claude-code)')])
        .share,
    ).toBe(100);
    expect(
      run([
        human(
          10,
          'feat: x\n\nCo-authored-by: Copilot <175728472+Copilot@users.noreply.github.com>',
        ),
      ]).share,
    ).toBe(100);
  });

  it('ignores merge commits and does not count an AI word in the subject as a trailer', () => {
    const merge: Commit = { ...assisted(1000), parents: 2 };
    expect(run([merge, human(10, 'docs: mention Claude in README')]).label).toBe('agent-unused');
  });
});
