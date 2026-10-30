# Token usage of the Solar System Explorer project

Figures come from the local Claude Code transcripts (`~/.claude/projects/...`), where every API call records its token usage and model. Re-run the report at any time with `node scripts/token-stats.mjs`.

- **Snapshot taken:** 2026-10-30 02:22 UTC (09:22 in Vietnam, UTC+7).
- **Scope:** 70 transcripts = 2 controller sessions + 68 subagents (tasks 1 to 32, the added task 28b, and the builder check of the spec).
- **Elapsed time:** from 12:44 on 29 Oct to 09:22 on 30 Oct (about 20 h 38 min), including waits for CI, waits for usage limits and the time the user was away. Plan execution ran from 15:12 on 29 Oct until the last PR (#33) merged at 06:54 on 30 Oct (about 15 h 42 min).

## 1. Overview

| Metric                                                  |       Value |
| ------------------------------------------------------- | ----------: |
| API calls                                               |       1,620 |
| Fresh input (not cached)                                |       3,610 |
| Cache write                                             |   6,747,728 |
| Cache read                                              | 172,449,341 |
| **Output (tokens written by the models)**               |   **1,233,316** |
| Context processed (input + cache write + cache read)    | 179,200,679 |
| Newly produced tokens (input + cache write + output)    |   7,984,654 |

How to read this: every API call re-reads the whole conversation, so "context processed" is huge, but 96.2% of it is cache reads (repeated context, normally billed far below regular input). The figures that best reflect the real work are **output, about 1.23 million tokens**, and the **newly produced tokens, about 8.0 million**.

## 2. Per model

| Model     | API calls | Fresh input | Cache write | Cache read  | Output        | % of output |
| --------- | --------: | ----------: | ----------: | ----------: | ------------: | ----------: |
| Sonnet    |       991 |       2,258 |   4,162,505 | 108,220,978 |       627,217 |       50.9% |
| Opus      |       570 |       1,232 |   2,449,619 |  60,932,909 |       568,785 |       46.1% |
| Haiku     |        59 |         120 |     135,604 |   3,295,454 |        37,314 |        3.0% |
| **Total** | **1,620** |   **3,610** | **6,747,728** | **172,449,341** | **1,233,316** |        100% |

By context processed: Sonnet 62.7%, Opus 35.4%, Haiku 1.9%.

## 3. Per role

| Role                                   | Agents | API calls | Context processed |  Output |
| -------------------------------------- | -----: | --------: | ----------------: | ------: |
| Controller sessions (2 sessions)       |      2 |       369 |        70,543,298 | 314,737 |
| implementer-heavy (Opus)               |     11 |       438 |        48,719,118 | 393,075 |
| implementer (Sonnet)                   |     16 |       492 |        39,946,233 | 281,351 |
| final-reviewer (Opus, task 32)         |      1 |        65 |         7,526,717 |  37,499 |
| reviewer (Sonnet)                      |     30 |       142 |         6,518,375 | 113,347 |
| implementer-light (Haiku)              |      2 |        59 |         3,431,178 |  37,314 |
| general-purpose (7 Sonnet, 1 Opus)     |      8 |        55 |         2,515,760 |  55,993 |

Notes: the implementer-heavy row includes one agent without metadata (the task 16 implementer: 9 calls, 712,064 context, 5,651 output). The controller sessions split into an Opus phase (brainstorm, spec, plan: 63 calls, 6,948,102 context, 134,514 output) and a Sonnet phase (orchestrating execution: 306 calls, 63,595,196 context, 180,223 output).

## 4. Per task (subagents only)

| Task                 | Agents | API calls | Context processed |  Output | Models        |
| -------------------- | -----: | --------: | ----------------: | ------: | ------------- |
| Builder check (spec) |      1 |         4 |           189,823 |   3,697 | Opus          |
| T1                   |      2 |        17 |           804,424 |  17,002 | Sonnet        |
| T2                   |      2 |        13 |           560,957 |  10,363 | Sonnet        |
| T3                   |      2 |        14 |           698,033 |  18,782 | Sonnet        |
| T4                   |      2 |        10 |           384,358 |   9,442 | Sonnet        |
| T5                   |      2 |        10 |           376,597 |   8,631 | Sonnet        |
| T6                   |      2 |        25 |         1,350,249 |  27,876 | Sonnet, Opus  |
| T7                   |      2 |        28 |         1,840,432 |  30,217 | Sonnet, Opus  |
| T8                   |      2 |        10 |           385,001 |   9,317 | Sonnet        |
| T9                   |      2 |        10 |           357,985 |   6,167 | Sonnet        |
| T10                  |      2 |        13 |           615,524 |  15,479 | Opus, Sonnet  |
| T11                  |      2 |        11 |           418,574 |   8,200 | Sonnet        |
| T12                  |      2 |        16 |           725,008 |  12,843 | Sonnet        |
| T13                  |      2 |        14 |           590,260 |  11,752 | Sonnet        |
| T14                  |      2 |        53 |         3,206,938 |  32,197 | Sonnet, Haiku |
| T15                  |      3 |        32 |         1,994,441 |  36,779 | Sonnet        |
| T16                  |      3 |        39 |         2,451,794 |  23,073 | Opus, Sonnet  |
| T17                  |      2 |        18 |           980,773 |  24,550 | Sonnet        |
| T18                  |      3 |        58 |         5,015,915 |  43,449 | Sonnet, Opus  |
| T19                  |      2 |        17 |           791,418 |  11,282 | Sonnet        |
| T20                  |      2 |        25 |         1,360,416 |  16,001 | Sonnet        |
| T21                  |      2 |        55 |         5,598,789 |  42,904 | Sonnet, Opus  |
| T22                  |      2 |       146 |        14,259,359 |  42,073 | Sonnet        |
| T23                  |      2 |        67 |         5,308,247 |  32,032 | Sonnet        |
| T24                  |      2 |       101 |         9,708,439 |  42,956 | Sonnet        |
| T25                  |      2 |        36 |         2,509,726 |  37,157 | Sonnet, Opus  |
| T26                  |      2 |        75 |         9,366,805 |  73,855 | Sonnet, Opus  |
| T27                  |      2 |        20 |         1,006,477 |  15,361 | Sonnet        |
| T28                  |      2 |        46 |         3,282,508 |  29,761 | Sonnet        |
| T28b (added)         |      2 |       119 |        18,982,970 | 110,426 | Sonnet, Opus  |
| T29                  |      2 |        42 |         3,360,023 |  35,307 | Opus, Sonnet  |
| T30                  |      1 |        10 |           457,267 |   7,428 | Haiku         |
| T31                  |      2 |        32 |         2,191,134 |  34,721 | Sonnet        |
| T32                  |      1 |        65 |         7,526,717 |  37,499 | Opus          |
| **Total (subagents)**|   **68** |  **1,251** |     **108,657,381** | **918,579** |               |

The "Models" column lists every model that appears in the task (the author and the reviewer can differ). Most tasks have 2 agents, an implementer and a reviewer; fix rounds resumed the same agent, so they add calls but not agents.

## 5. Observations

- **Five most expensive tasks by context:** T28b (19.0 M), T22 (14.3 M), T24 (9.7 M), T26 (9.4 M) and T32 (7.5 M). Together they are 55% of the subagent context. The common cause is repeated e2e runs (WebGL on software rendering is slow and times out) and several fix rounds.
- **T28b was not in the original plan.** The screenshot review in task 28 showed planets as 1-2 px dots, overlapping labels and no Milky Way band. Fixing these four visual problems cost 19.0 M context and 110 K output, and was the biggest visual improvement of the project.
- **The controller sessions use about 39% of the context (70.5 M) but only 25.5% of the output**, because every turn re-reads a long conversation. Ways to reduce it: keep the controller context short, compact early, and push heavy work to subagents (as was done).
- **Model allocation worked as intended:** Sonnet and Haiku produced 53.9% of the output. Opus (46.1%) was mostly brainstorm, spec and plan (134 K output), the hard tasks (implementer-heavy, 393 K) and the final review. Reviewers (Sonnet) used only 113 K output (9.2%) yet caught real defects, for example high-resolution textures loading for a planet the camera never reached, the "not to scale" note hidden behind the phone sheet, and an opaque white cloud layer covering Earth.
- **Caching works well:** 96.2% of the context was cache reads, and fresh input was only 3,610 tokens.

## 6. Limits of these numbers

- Only model replies recorded in the transcripts are counted. These may **not** include summarisation calls made when the context is compacted, calls of the auto-mode permission classifier (the transcripts carry a `serverClassifierRequest` id but no token counts), or external tools such as CI and Pages (which use no tokens).
- The controller session is still running, so its figures grow slightly if you re-run the script (producing this report added a few calls).
- Streaming can write the same message several times; the script deduplicates by message id and keeps the entry with the largest output.
- Subagent runs interrupted by a usage limit (for example task 31, which was resumed) are counted in full.
- The `subagent_tokens` value shown in each subagent completion notice is a different, smaller measure and is not used here.

## 7. Converting to cost

No price list for these models was available, so no money figure is given. Take your current prices and compute it per model from section 2:

```
cost = fresh_input x input_price + cache_write x cache_write_price
     + cache_read x cache_read_price + output x output_price
```

Sum the three models. Cache reads are usually priced far below regular input, and cache writes can differ by cache lifetime (5 minutes or 1 hour).
