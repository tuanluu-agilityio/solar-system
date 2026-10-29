# 0001. Record architecture decisions

Status: accepted

## Context
Builders make many choices the spec leaves open. Without a record, later work cannot tell why something is the way it is.

## Decision
Each significant decision gets a short numbered file in `docs/decisions/` named `NNNN-title.md`, with the sections Context, Decision, and Consequences. Small per-task choices go in `docs/progress/t<NN>.md` as `DECISION:` lines.

## Consequences
Decisions stay discoverable and reviewable. Reversing one means writing a new ADR that supersedes the old one.
