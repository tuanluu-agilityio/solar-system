#!/usr/bin/env node
// Labels a pull request by how much of its change was written by AI (.github/workflows/ai-label.yml).
//   agent-authors  AI share > 70%, or any commit authored by an AI agent account (Copilot, claude[bot], ...)
//   agent-assist   AI share 50% to 70%
//   agent-unused   AI share < 50%
// AI share = changed lines (additions + deletions) in AI commits / changed lines in all commits.
// A commit counts as AI when its author is an AI agent, or its message carries an AI trailer
// (`Co-Authored-By: Claude ...`, `Generated with [Claude Code]`, ...). Merge commits and lockfiles are skipped.
// Usage:
//   GITHUB_TOKEN=... REPO=owner/name PR_NUMBER=12 node scripts/ai-label.mjs   (labels the PR)
//   add --dry-run to print the result without labelling
//   node scripts/ai-label.mjs --commits <file.json>   (offline: prints the result; used by tests)
//     file.json: [{ sha, authorLogin, authorName, authorEmail, message, parents, additions, deletions }]
import { appendFileSync, readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export const LABELS = {
  authors: {
    name: 'agent-authors',
    color: 'b60205',
    description: 'Over 70% of the change is AI-written',
  },
  assist: {
    name: 'agent-assist',
    color: 'fbca04',
    description: '50% to 70% of the change is AI-written',
  },
  unused: {
    name: 'agent-unused',
    color: '0e8a16',
    description: 'Under 50% of the change is AI-written',
  },
};
const AUTHORS_ABOVE = 70;
const ASSIST_FROM = 50;

const AI_NAME = String.raw`(copilot|claude|anthropic|openai|codex|chatgpt|gpt-?\d|gemini|devin|cursor|jules|codewhisperer|amazon q|aider|windsurf|sweep)`;
const AI_WORD = new RegExp(`\\b${AI_NAME}\\b`, 'i');
const AI_TRAILER = new RegExp(
  `^\\s*((co-authored-by|generated-by|assisted-by)\\s*:.*\\b${AI_NAME}\\b|.*generated (with|by) .*\\b${AI_NAME}\\b)`,
  'im',
);
const IGNORED_FILE = /(^|\/)(package-lock\.json|npm-shrinkwrap\.json|yarn\.lock|pnpm-lock\.yaml)$/;

/** True when the commit author is an AI agent account rather than a human using an assistant. */
export function isAgentAuthored(c) {
  return [c.authorLogin, c.authorName, c.authorEmail].some((v) => v && AI_WORD.test(v));
}

export function isAiCommit(c) {
  return isAgentAuthored(c) || AI_TRAILER.test(c.message ?? '');
}

export function classify(commits) {
  const counted = commits.filter((c) => (c.parents ?? 1) <= 1);
  let total = 0;
  let ai = 0;
  for (const c of counted) {
    const lines = (c.additions ?? 0) + (c.deletions ?? 0);
    total += lines;
    if (isAiCommit(c)) ai += lines;
  }
  // A PR with no counted lines (empty or lockfile-only) falls back to the share of AI commits.
  const share =
    total > 0
      ? (ai / total) * 100
      : counted.length > 0
        ? (counted.filter(isAiCommit).length / counted.length) * 100
        : 0;
  const agentCommit = counted.some(isAgentAuthored);
  const key =
    agentCommit || share > AUTHORS_ABOVE ? 'authors' : share >= ASSIST_FROM ? 'assist' : 'unused';
  return {
    label: LABELS[key].name,
    share: Math.round(share * 10) / 10,
    aiLines: ai,
    totalLines: total,
    agentCommit,
  };
}

async function api(path, init = {}) {
  const res = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      accept: 'application/vnd.github+json',
      authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      'x-github-api-version': '2022-11-28',
      ...(init.body ? { 'content-type': 'application/json' } : {}),
    },
  });
  if (!res.ok && res.status !== 404 && res.status !== 422) {
    throw new Error(`${init.method ?? 'GET'} ${path}: ${res.status} ${await res.text()}`);
  }
  return res.status === 204 ? null : { status: res.status, body: await res.json() };
}

async function fetchCommits(repo, pr) {
  const list = [];
  for (let page = 1; ; page++) {
    const { body } = await api(`/repos/${repo}/pulls/${pr}/commits?per_page=100&page=${page}`);
    list.push(...body);
    if (body.length < 100) break;
  }
  const out = [];
  for (const item of list) {
    const { body: detail } = await api(`/repos/${repo}/commits/${item.sha}`);
    const files = (detail.files ?? []).filter((f) => !IGNORED_FILE.test(f.filename));
    out.push({
      sha: item.sha,
      authorLogin: item.author?.login,
      authorName: item.commit.author?.name,
      authorEmail: item.commit.author?.email,
      message: item.commit.message,
      parents: item.parents.length,
      additions: files.reduce((s, f) => s + f.additions, 0),
      deletions: files.reduce((s, f) => s + f.deletions, 0),
    });
  }
  return out;
}

async function applyLabel(repo, pr, label) {
  for (const l of Object.values(LABELS)) {
    // 422 means the label already exists.
    await api(`/repos/${repo}/labels`, { method: 'POST', body: JSON.stringify(l) });
  }
  for (const l of Object.values(LABELS)) {
    if (l.name !== label) {
      await api(`/repos/${repo}/issues/${pr}/labels/${encodeURIComponent(l.name)}`, {
        method: 'DELETE',
      });
    }
  }
  await api(`/repos/${repo}/issues/${pr}/labels`, {
    method: 'POST',
    body: JSON.stringify({ labels: [label] }),
  });
}

function report(result, commits) {
  const lines = [
    `### AI label: \`${result.label}\``,
    `AI share ${result.share}% (${result.aiLines} of ${result.totalLines} changed lines)` +
      (result.agentCommit ? ', includes a commit authored by an AI agent' : ''),
    '',
    '| Commit | Author | AI | Lines |',
    '| --- | --- | --- | --- |',
    ...commits.map(
      (c) =>
        `| ${c.sha.slice(0, 7)} | ${c.authorLogin ?? c.authorName} | ` +
        `${isAgentAuthored(c) ? 'agent' : isAiCommit(c) ? 'assisted' : 'no'} | ${c.additions + c.deletions} |`,
    ),
  ].join('\n');
  console.log(lines);
  if (process.env.GITHUB_STEP_SUMMARY)
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${lines}\n`);
}

async function main(argv) {
  const i = argv.indexOf('--commits');
  if (i >= 0) {
    const commits = JSON.parse(readFileSync(argv[i + 1], 'utf8'));
    console.log(JSON.stringify(classify(commits)));
    return 0;
  }
  const { GITHUB_TOKEN, REPO, PR_NUMBER } = process.env;
  if (!GITHUB_TOKEN || !REPO || !PR_NUMBER) {
    console.error('ai-label: set GITHUB_TOKEN, REPO and PR_NUMBER, or pass --commits <file.json>.');
    return 1;
  }
  const commits = await fetchCommits(REPO, PR_NUMBER);
  const result = classify(commits);
  report(result, commits);
  if (!argv.includes('--dry-run')) await applyLabel(REPO, PR_NUMBER, result.label);
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await main(process.argv.slice(2));
}
