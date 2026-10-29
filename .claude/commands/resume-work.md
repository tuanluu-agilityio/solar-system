---
description: Resume the Solar System Explorer run after an interruption
---

Resume the plan run. Follow `AGENTS.md` and the plan's "How this plan is executed".

1. Read the session-start summary above, or run `node .claude/hooks/session-start.mjs`.
2. Reconcile in-flight work:
   - Run `git worktree list`, `gh pr list --state open`, and `git branch --no-merged origin/main`.
   - For each in-flight task, find its flow step: no PR means step 3 (verify); PR open with failing or pending checks means step 7 (CI); PR green means step 8 (merge).
   - For uncommitted changes in a worktree: commit them if that task's tests pass; otherwise `git stash push -m "t<NN>-partial"` and redo the task's implementation step.
3. Continue with the Wave Plan (respect dependencies and the limit of 3 parallel implementers) using superpowers:subagent-driven-development. The first unticked task of the earliest unfinished wave is current.

Never ask the user; log `DECISION:` lines instead.
