# Tienda — retail management tool

Multi-tenant retail operations for small Mexican retailers. Postgres (Supabase) +
React Native (Expo). MXN, IVA, LFPDPPP — not GDPR, CFDI out of scope.

**Read these two files before anything else:**

| File | Authority |
|------|-----------|
| [`docs/PLAN.md`](docs/PLAN.md) | Where the build is. Which step is next, what "done" means, what is unresolved. ⚠️ **Read `## Position` first — it holds the two blocks that carry live obligations** |
| [`docs/adr/ADR-035`](docs/adr/ADR-035-target-architecture-postgres-react-native.md) | The architecture. **If anything disagrees with the ADR, the ADR wins and the other file is the bug** |

## The plan is three files, and only one of them is live

⚠️ **`docs/PLAN.md` is the LIVE plan and the only one you edit.** On 2026-09-19 it had
reached 14,998 lines / ~313k tokens — **larger than a context window** — so closed work
moved to `docs/plan/archive/`, unedited and verified byte-identical on reconstruction:

| File | Status | Edit it? |
|---|---|---|
| `docs/PLAN.md` | **LIVE** — Position, the ADR-disagreement gate, Steps 4.6 and 5, working agreement | Yes |
| `docs/plan/archive/steps-0-to-4.5.md` | Closed steps 0–4.5 | Only to move a section back |
| `docs/plan/archive/status-log-through-2026-09-18.md` | Status-log entries for 2026-09-18 and earlier | Only to move an entry back |
| `docs/plan/archive/status-log-2026-09-19.md` | The whole 2026-09-19 working day | Only to move an entry back |
| `docs/plan/archive/status-log-2026-09-20.md` | The whole 2026-09-20 working day | Only to move an entry back |
| `docs/plan/archive/status-log-2026-09-21.md` | The whole 2026-09-21 working day — the `5a-iv-d` day-8 reading | Only to move an entry back |
| `docs/plan/archive/status-log-2026-09-22.md` | **The 2026-09-22 working day, FIRST CUT** — ⚠️ the first archive taken from a day still running, because there was no older day left to take. **A later session APPENDS to it; never a second file for the same date** | Only to move an entry back, or to append a later cut of the same day |
| `docs/plan/archive/status-log-2026-09-23.md` | The whole 2026-09-23 working day | Only to move an entry back |
| `docs/plan/archive/status-log-2026-09-24.md` | **The 2026-09-24 working day** — the second file ever opened for a day still running, and the one this project's busiest day went out in. ⚠️ **Six cuts have been appended to it**, which is the rule above being obeyed | Only to move an entry back, or to append a later cut of the same day |

⚠️⚠️ **THIS TABLE IS READ BY NO CHECK, AND ON 2026-09-25 IT WAS MISSING TWO FILES** —
`status-log-2026-09-23.md` and `status-log-2026-09-24.md`, both of which had existed for a
day. **`5g-ii` found it by listing the directory and comparing.** The rows are added above;
the lesson is that **the only thing keeping this table true is somebody looking**, so list
`docs/plan/archive/` when you cite it.

⚠️ **The status log is archived ONE WORKING DAY PER FILE** and there will be more of
them. `plan-corpus.sh` globs `docs/plan/archive/*.md`, so a new one needs no wiring —
**never rename an existing archive to absorb a new cut**: the plan's own history names
these files, and renaming for tidiness makes a recorded statement false.

⚠️⚠️ **CLOSED IS NOT WRONG, AND THE TWO KINDS OF ARCHIVE ARE OPPOSITES.** `archive/power-platform/`
describes a system nobody is building and must never be cited as current.
`docs/plan/archive/` is **this** system's own history — every line was true when written,
and for several owner rulings about what a screen renders **it is the only record that
exists**, because §2.11 keeps rendering out of scope so there is no constraint, grant or
policy to hold them.

**To search the whole plan, live and archived, in one command:**

```
grep -n '<task-id>' "$(bash docs/checks/plan-corpus.sh)"
```

`plan-corpus.sh` assembles live + archive into one file, and it is what every split guard
already reads — so a task row resolves from the archive exactly as it did before the cut.
Every plan lookup here is **content-addressed** (`| **task** |`), never by line number,
which is the property that made archiving possible at all.

⚠️ **Moving something back is a MOVE, never a copy.** Two homes for one claim is the
defect this repository has had six of; `split-coverage.sh` fails on *"row appears 2
times"*, and it reads the corpus, so it sees both copies.

⚠️ **`plan-handover.sh` assertion 7 caps the size** — `docs/PLAN.md` at 6,000 lines and
`## Position` at 1,400 — and names the remedy in the failure. Position reached 5,484 lines
at one or two status-log entries per session, with nobody deciding to. ⚠️ **Never archive
the `⛔ DECISIONS OWED` or `⏳ DATES OWED` blocks**: the same check requires exactly one of
each in the LIVE plan.

## What this is not

~~There is no React Native code yet~~ — ⚠️ **FALSE SINCE `5a-i`, CORRECTED 2026-09-22, AND
IT HAD GONE ON MISLEADING THE ONE FILE EVERY SESSION READS FIRST.** `app/` is a real Expo
app and the fourth workspace (`@tienda/app`): screens under `app/src/app/` including
`productos.tsx` and `familia/[id].tsx`, a data layer in `app/src/api/`, a palette and a
density scale in `app/src/theme/`, and **a Vitest suite of nearly 700 assertions** in
`app/test/`. ⚠️ **`app/ios/` exists too and is NOT committed** — it is generated by
`expo prebuild` and gitignored, which is why no workflow compiles it (see `5R-f`).
⚠️ **What is still true and still matters:** `docs/CONVENTIONS.md` governs how a file in
`app/` is written, `R2` keeps the suite in `app/test/` as `.ts` reaching no component, and
`5h.5` — not a session inventing one — owns `src/ui/`.

⚠️ ~~Neither CI workflow watches an app directory~~ — **THERE ARE THREE WORKFLOWS AND
`app.yml` SHIPPED WITH `5a-i`.** `app.yml` fires on `app/**` and runs the typecheck, the
Vitest suite, the conventions gate and every plan and handbook guard; `money.yml` fires on
`packages/**`. ⚠️⚠️ **And `db.yml` is NOT only `supabase/**`: it also watches
`app/src/api/**`**, because a module there is a claim about the applied schema — which is
why editing `app/src/api/catalog.ts` runs the live-HTTP contract checks against a real
database. ⚠️⚠️ **What no workflow does is compile the app or check the deployed database**;
both gaps are real, both cost this project a day on 2026-09-22, and the second is `5R-f`.

`archive/power-platform/` holds a Power Apps Canvas + Dataverse era that stopped on
2026-08-14. **Nothing there describes the system being built**, four of its ADRs are
provably false, and it is excluded from the knowledge graph via `.graphifyignore`.
Never cite it as current. Read it only for history, and say so when you do.

## Rules that are not negotiable

- **A file is not evidence; a green CI run is.** Every schema claim must trace to a
  migration CI has applied (ADR-035 §9). This repo exists in its current form because
  the last one recorded decisions that were never deployed.
- **Migrations are append-only once applied.** Fix forward with a new numbered
  migration. Numbering is fixed in [`supabase/README.md`](supabase/README.md).
- **RLS is bypassed by the `postgres` superuser.** Any isolation check run as
  superuser passes vacuously. Test under `set role authenticated`.
- **Never edit `graphify-out/`** — it is generated.

## Domain vocabulary

Spanish module names are the domain language, not a translation layer: Comprar
(buy), Vender (sell), Productos (catalog), Proveedores (providers), Desperdicio
(waste), Números (reports). `workspace` is the tenant; `location` is the store —
they are not the same thing, and conflating them is a one-way door (ADR-035 §2.3).

## Working agreement

One task per session, taken from `docs/PLAN.md`. **Estimate difficulty first and
write down what the estimate found** — that is the half that has repeatedly paid for
itself, and it is not the same thing as splitting. Update `docs/PLAN.md` when a task
closes.

⚠️⚠️ **AMENDED BY THE OWNER 2026-09-24 — AN `M` OR AN `L` IS ONE SITTING:** *"if a
task is M or L, let's do it at once, we have enough usage and space to do it."*
**`XL` still splits on size; `M` and `L` do not.** The old rule's stated reason was
*"so the work survives a context clear or a usage limit"* — a budget, and the budget
changed.

⚠️ **A split at `M` or `L` is now the exception and must name a reason that is NOT
size, in its own row:** (1) half the row is **gated** on a decision or an ADR
amendment the owner owes and the other half is not; (2) the row carries **two failure
classes** and one of them is invisible here — the ledger or the queue — so one row
would let the unseen half ride in on the back of the one a person can look at; or
(3) the plan's **deferral test** (both halves yes) separates look-questions that
cannot be answered yet. **Anything else is the old rule asking to come back.** The
full argument is in `docs/PLAN.md`'s `## Working agreement`.

**Merging is automated** (settled 2026-08-17, replacing the approval gate agreed
earlier the same day). Push the branch, open the PR, wait for CI, **read the job
log** — not the tick — and on green run `gh pr merge` without asking. This covers
migrations too; the owner took that trade knowing what it costs.

Two things did not change, and they are what the gate was really for:

- **Never merge red, and never merge on a green tick alone.** A tick is also what a
  silently skipped test step looks like. Confirm the checks by name in the log.
- **Report every decision made on the owner's behalf**, in the closing message of
  the session that made it and in the PR body. Removing the checkpoint removed the
  approval, not the obligation to say what was decided. It also made reversal
  dearer: a modelling choice questioned after the merge is a fix-forward migration,
  not an edit to an unmerged file. So flag the ones that are cheap now and expensive
  later — anything the seed will bake in — loudly and by name.

Local database: `supabase start` then `supabase db reset`. Add
`-x realtime,storage-api,imgproxy,kong,mailpit,postgrest,postgres-meta,studio,edge-runtime,logflare,vector,supavisor`
to bring up only what a migration reset needs.

## graphify

This project has a knowledge graph at graphify-out/ — a thousand-odd nodes over Markdown, SQL and
shell, with community structure and cross-file relationships. ⚠️ **Do not quote a node
count from this file** — it moves on every commit to `main` and has been stale twice
already. Read it from `graphify-out/graph.json` if it matters.

⚠️ **There are no god nodes and no semantic layer** (checked 2026-09-07 — `graphify-out/wiki/` still does not exist). Every node is
`_origin: ast`; the LLM extraction pass has never run because no `GEMINI_API_KEY` /
`GOOGLE_API_KEY` is set, and `graphify-out/wiki/` does not exist. Community *names* come
from each cluster's hub node, not from a model — `graphify label` would need a key. So
treat the graph as a structural index, not a summarised one: it reliably tells you
**where** something is, and never tells you what it means.

Rules:
- ⚠️⚠️ **`docs/plan/archive/` IS INDEXED; `archive/power-platform/` IS NOT.** The
  `.graphifyignore` rule is `/archive/` **with a leading slash** — without it, a bare
  `archive/` matches any directory of that name at any depth, and on 2026-09-19 it
  silently swallowed `docs/plan/archive/`, dropping ~9,200 lines of closed-but-true plan
  history out of the graph with nothing going red. An over-matching ignore rule produces
  a smaller graph, not an error. **A result's `src=` tells you which archive it came
  from — check it before citing anything as current.**
- ⚠️ **The graph is weak for "what did we DECIDE about X".** It is AST-only with no
  semantic layer, so it reliably finds *where* a file or symbol is and cannot tell you
  what a plan paragraph means. For decisions and rulings, search the corpus directly:
  `grep -n '<term>' "$(bash docs/checks/plan-corpus.sh)"`. Query the graph for code, SQL,
  scripts and file locations, where it is genuinely fast.
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost). Commits, merges and branch switches do this automatically on main/master via the git hooks; run it by hand for uncommitted work or on other branches.
- Every subagent prompt that involves code exploration must repeat these rules — subagents do not inherit them.
- **SQL IS indexed**: tables, functions, triggers, views and CTEs, each with a file
  and line.
- ⚠️ **`CREATE POLICY` is still NOT indexed**, and on this project that is the gap that
  matters — forty-one policies are the subject of most current work. Policy names
  (`sale_line_select`, `provider_update`) resolve to nothing in the graph. **For RLS
  policy questions, read `supabase/migrations/**` directly, or ask the database.**
  Everything else in SQL, query first.
