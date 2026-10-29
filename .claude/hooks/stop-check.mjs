// Informational typecheck gate: runs `npm run typecheck` only when .ts files changed. Never blocks (exit 0).
import { execSync } from 'node:child_process';

const sh = (cmd) => execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 120000 });

try {
  const changed = sh('git diff --name-only HEAD')
    .split(/\r?\n/)
    .filter((f) => /\.tsx?$/.test(f));
  if (changed.length) {
    try {
      sh('npm run typecheck');
    } catch (e) {
      const tail = `${e.stdout ?? ''}${e.stderr ?? ''}`.split(/\r?\n/).filter(Boolean).slice(-15);
      console.log(`stop-check: typecheck FAILED (${changed.length} changed .ts file(s))`);
      console.log(tail.join('\n'));
    }
  }
} catch {
  /* never fail */
}
process.exit(0);
