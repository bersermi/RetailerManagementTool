# Tienda — retail management tool

Multi-tenant retail operations for small Mexican retailers. Postgres (Supabase) +
React Native (Expo). MXN, IVA, LFPDPPP — not GDPR, CFDI out of scope.

**Read these before anything else:**

| File | Authority |
|------|-----------|
| [`docs/PLAN.md`](docs/PLAN.md) | Where the build is. Which step is next, what "done" means, what is unresolved. ⚠️ **Read `## Position` first — it holds the two blocks that carry live obligations**, and the status log for the current day sits there too |
| [`docs/adr/ADR-035`](docs/adr/ADR-035-target-architecture-postgres-react-native.md) | The architecture. **If anything disagrees with the ADR, the ADR wins and the other file is the bug** |
| [`docs/HANDBOOK.md`](docs/HANDBOOK.md) | ⚠️ **The file the OWNER reads** — so a task that closes usually edits it too. `docs/checks/handbook-agreement.sh` holds it in agreement with the plan on five things (done, split, next, and whether anything is waiting on him) and **never judges the plan.** A stale plan row is caught by the next session; a stale handbook row is caught by the owner, who has no way to know |

**Orient in one command.** It names the next task, prints the plan's size, and reports the
state of every live obligation — 11 assertions rather than a summary:

```
bash docs/checks/plan-handover.sh
```

⚠️⚠️ **NEVER WRITE THE NEXT TASK ID INTO THIS FILE.** `plan-handover.sh` refuses a second
status board, and a task id here is exactly that — it would be one more claim nothing checks
(see below), going stale the day the task closes.

## The plan is ten files, and only one of them is live

⚠️ **`docs/PLAN.md` is the LIVE plan and the only one you edit.** On 2026-09-19 it had
reached 14,998 lines / ~313k tokens — **larger than a context window** — so closed work
moved to `docs/plan/archive/`, unedited and verified byte-identical on reconstruction.
⚠️ **This heading said *three files* until 2026-09-25, while the table under it listed
ten** — the same defect as the two missing rows below, in the line a cleared session
reads first:

| File | Status | Edit it? |
|---|---|---|
| `docs/PLAN.md` | **LIVE** — `## Position` (the two obligation blocks and the current day's status log), the ADR-disagreement gate, Step 4.6, **Step 5 — the client, which is the live step** — then 5R, 6, 7, 5P and *The other edges*, and the working agreement | Yes |
| `docs/plan/archive/steps-0-to-4.5.md` | Closed steps 0–4.5 | Only to move a section back |
| `docs/plan/archive/status-log-through-2026-09-18.md` | Status-log entries for 2026-09-18 and earlier | Only to move an entry back |
| `docs/plan/archive/status-log-2026-09-19.md` | The whole 2026-09-19 working day | Only to move an entry back |
| `docs/plan/archive/status-log-2026-09-20.md` | The whole 2026-09-20 working day | Only to move an entry back |
| `docs/plan/archive/status-log-2026-09-21.md` | The whole 2026-09-21 working day — the `5a-iv-d` day-8 reading | Only to move an entry back |
| `docs/plan/archive/status-log-2026-09-22.md` | **The 2026-09-22 working day, FIRST CUT** — ⚠️ the first archive taken from a day still running, because there was no older day left to take. **A later session APPENDS to it; never a second file for the same date** | Only to move an entry back, or to append a later cut of the same day |
| `docs/plan/archive/status-log-2026-09-23.md` | The whole 2026-09-23 working day | Only to move an entry back |
| `docs/plan/archive/status-log-2026-09-24.md` | **The 2026-09-24 working day** — the second file ever opened for a day still running, and the busiest day this project had had at the time (2026-09-25 has since passed it). ⚠️ **SEVEN cuts have been appended to it** — the seventh on 2026-09-25, when `5g-iii` found that `5g.5` and `5g-i` had been left in the live plan by all six earlier cuts, which is the rule above being obeyed | Only to move an entry back, or to append a later cut of the same day |
| `docs/plan/archive/status-log-2026-09-25.md` | **The 2026-09-25 working day, FIRST CUT** — the busiest day this project has had. The cut holds its first four entries and the 23rd–26th owner rulings, including the first migration to widen a cost fence and the day `Comprar` shipped. ⚠️ **The third file ever opened for a day still running — and the day RAN ON PAST THE CUT**: `5g-iii-a`, the parked `R9` reading and the 27th and 28th rulings stand in the LIVE plan and belong in a later cut of THIS file | Only to move an entry back, or to append a later cut of the same day |

⚠️⚠️ **THIS TABLE IS READ BY NO CHECK, AND ON 2026-09-25 IT WAS MISSING TWO FILES** —
`status-log-2026-09-23.md` and `status-log-2026-09-24.md`, both of which had existed for a
day. **`5g-ii` found it by listing the directory and comparing.** The rows are added above;
the lesson is that **the only thing keeping this table true is somebody looking**, so list
`docs/plan/archive/` when you cite it.

⚠️⚠️ **AND NOTHING CHECKS THIS FILE AT ALL — MEASURED 2026-09-25.** `CLAUDE.md` appears in
`docs/checks/` exactly three times and every one of them is inside a COMMENT or a failure
message; no check parses it, and no workflow `paths:` filter names it. **So every number in
this file decays silently.** That is why the counts below now say *when they were measured*
and name the one-liner that re-measures them — a stale number in the file every session
reads first is this repository's most-repeated defect.

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

⚠️ **`plan-handover.sh` caps the size** — `docs/PLAN.md` at 6,000 lines and `## Position`
at 1,400 — and names the remedy in the failure. **Measured 2026-09-25: 5,267 lines total,
1,110 in Position, all 11 assertion groups green** (`bash docs/checks/plan-handover.sh`
prints both numbers and the next task id). Position reached 5,484 lines at one or two
status-log entries per session, with nobody deciding to; **seventeen cuts have now been
taken across those nine archive files, thirteen of them by a session that wanted to be
writing something else.** ⚠️ **The cap is the SECOND assertion numbered 7 in that script** —
there are two, so `grep -n READABLE docs/checks/plan-handover.sh` finds it and the number
does not.

⚠️ **Never archive the `⛔ DECISIONS OWED` or `⏳ DATES OWED` blocks**: the same check
requires exactly one of each in the LIVE plan.

⚠️⚠️ **AND THE DECISIONS BLOCK CAN LOSE A QUESTION WITH NOTHING GOING RED — IT DID, ON
2026-09-25.** Área 6 (*Mistakes* — the undo) was struck out of its own table on 2026-09-21
with the words *"read it there, not here"* and was never written into the block; the block
then emptied for the thirteenth time and took the question with it. `plan-handover.sh`
asserts the block exists, is singular, and that every row names what it blocks — **there is
no check that a question which belongs in it is present, because there is no list of what
belongs.** ⚠️ **So a gate cell saying *see the decisions block* must be READ against the
block.** It was found by a session about to mark the gated task as next, which is the only
thing that has ever found it.

⚠️ **A *Blocks* cell is MACHINE-READ.** Assertion 7c pulls every `[0-9][0-9a-z.-]*` out of
it, so prose naming another task id in that cell makes the guard refuse a legitimate next
task — three instances so far, the third one a warning sentence committing the defect it
described. **Ids only in that column; the reasoning goes in the column no check parses.**

## What this is not

~~There is no React Native code yet~~ — ⚠️ **FALSE SINCE `5a-i`, CORRECTED 2026-09-22, AND
IT HAD GONE ON MISLEADING THE ONE FILE EVERY SESSION READS FIRST.** `app/` is a real Expo
app and the fourth workspace (`@tienda/app`). **Measured 2026-09-25:**

- **16 screens** under `app/src/app/` — four tabs (Inicio, Comprar, Vender, Desperdicio)
  plus `productos.tsx`, `producto/[id]`, `producto/nuevo`, `familia/[id]`, `costos/[id]`,
  `ajustes`, `solicitudes`, `entrar`, `bienvenida` and `auth/callback`.
- **21 modules in `app/src/api/`** — the data layer, each one a claim about the applied
  schema (which is why `db.yml` watches it; see below).
- A palette and a density scale in `app/src/theme/`, a cart in `app/src/cart/`, an outbox
  in `app/src/offline/`, and **a PDF this app hands a shopkeeper** in `app/src/export/`.
- **A Vitest suite of 1,119 cases across 40 files** in `app/test/` (~2,020 `expect(`
  calls). ⚠️ This file said *"nearly 700 assertions"* until 2026-09-25.

⚠️ **`app/ios/` exists too and is NOT committed** — it is generated by `expo prebuild` and
gitignored, which is why no workflow compiles it.

⚠️ **What is still true and still matters:** `docs/CONVENTIONS.md` governs how a file in
`app/` is written, and `R2` keeps the suite in `app/test/` as `.ts` reaching no component.
⚠️⚠️ **`app/src/ui/` NOW EXISTS AND `5h.5` STILL OWNS IT.** Six primitives — `Buscador`,
`Cantidad`, `Deslizador`, `Separador`, `TecladoListo`, `Vacio` — were built across `5d`–`5g`
**with no written rule**, and `5h.5`, the row that writes one, is gated on `5h`, which is
gated on área 6 in ⛔ DECISIONS OWED. **So every session that ships a primitive while that
question sits adds to a directory whose conventions nobody has ruled on**, and `5h.5`'s own
row calls itself *"the last moment this is cheap"*.

⚠️ ~~Neither CI workflow watches an app directory~~ — **THERE ARE THREE WORKFLOW FILES AND
`app.yml` SHIPPED WITH `5a-i`.** ⚠️⚠️ **AND AS OF 2026-09-25 THEY ARE SIX JOB DEFINITIONS
THAT RENDER AS EIGHT NAMES IN THE LOG — WHICH IS WHAT *"confirm the checks by name in the
log"* NOW MEANS.** Counted off a real run rather than off the YAML (the merge of #213, runs
`36172686917` / `36172686952` / `36172687093`, all eight green): `money.yml`'s single job is
**matrixed**, so it appears twice, and a count taken from `jobs:` keys alone is short by one.

| Workflow | Fires on | Job names in the log |
|---|---|---|
| `app.yml` | `app/**`, `packages/money/**`, `docs/PLAN.md`, `docs/plan/archive/**`, `docs/CONVENTIONS.md`, `docs/HANDBOOK.md`, ADR-035, and each plan/handbook guard by name | `app (node 22)` — typecheck, Vitest, conventions gate — **and** `the documents still agree (plan + handbook)`. ⚠️⚠️ **SPLIT 2026-09-25 BECAUSE IT WAS TIMING OUT.** The seam is free because no document guard needs `node_modules`, and the two halves fail for different reasons: *the code is wrong* vs *the documents disagree with each other* |
| `db.yml` | `supabase/**`, **`app/src/api/`**, `app/src/auth/`, `packages/money/cases.json`, and every contract check and falsifier by name | four: `supabase db reset`, `the app's data layer against a real database`, `session survives a lost refresh reply`, `the catalog write, and the manager fence on it`. ⚠️ **The biggest job was split by `5R-g`** |
| `money.yml` | `packages/**` | one job, matrixed: `packages/money (node 22)` and `(node 24)` |

⚠️⚠️ **`db.yml` IS NOT ONLY `supabase/**`**, because a module in `app/src/api/` is a claim
about the applied schema — which is why editing `app/src/api/catalog.ts` runs the live-HTTP
contract checks against a real database. ⚠️ **A red `db.yml` whose steps read `skipped`
after "Start Postgres" is a registry throttle and not a migration defect** — check that
before chasing the SQL.

⚠️⚠️ **WHAT NO WORKFLOW DOES IS COMPILE THE APP.** That gap is real, it cost this project a
day on 2026-09-22, and a native dependency swap stays green until a Mac builds it.

⚠️⚠️ **THE OTHER GAP FROM THAT DAY IS CLOSED BUT DELIBERATELY NOT AUTOMATED. `5R-f` (done
2026-09-24) SHIPPED A CHECK THAT IS IN NO WORKFLOW ON PURPOSE**: `supabase migration list
--linked` needs an **account-wide** access token — there is no project-scoped one — so a
repository secret would hand every workflow run the owner's whole Supabase account to guard
against a forgotten `db push`. **A person runs it, or nobody does:**

```
supabase db push                            # applies what the remote is missing
bash docs/checks/5R-f-schema-deployed.sh    # proves it actually landed
```

⚠️⚠️⚠️ **AND IT IS RED RIGHT NOW — RUN 2026-09-25, 5 OF 6 GROUPS GREEN: `0039` AND `0040`
MERGED HERE AND WERE NEVER APPLIED TO `hweutzjhzvioswnjzqki`.** The hosted project the
owner's phone signs in to carries **36 of the 38** migrations, so **`Genérico` and the
widened purchase fence are not on his phone.** ⚠️ **36 of 38, not 38 of 40** — this line
said the latter for an hour, and both numbers were wrong the same way: the file count is
**38** because `0006` and `0007` are permanent holes, so *"38 files"* and *"numbered up to
0040"* are both true and are not the same number. This is 2026-09-22's shape again — caught this time
by the guard instead of by him tapping Productos. **Do not reason about deployed behaviour
until those two commands have been run.**

`archive/power-platform/` holds a Power Apps Canvas + Dataverse era that stopped on
2026-08-14. **Nothing there describes the system being built**, four of its ADRs are
provably false, and it is excluded from the knowledge graph via `.graphifyignore`.
Never cite it as current. Read it only for history, and say so when you do.

## Rules that are not negotiable

- **A file is not evidence; a green CI run is.** Every schema claim must trace to a
  migration CI has applied (ADR-035 §9). This repo exists in its current form because
  the last one recorded decisions that were never deployed.
- ⚠️⚠️ **AND A GREEN CI RUN IS NOT A DEPLOY.** Every check builds its own Postgres,
  asserts against it and deletes it. The one database a phone talks to is reached only
  by `supabase db push`, by hand — see the two commands above, and `supabase/README.md`'s
  *Deploying* section. **Say which of the three you have evidence about: the schema, the
  code, or the shop.**
- **Migrations are append-only once applied.** Fix forward with a new numbered
  migration. Numbering is fixed in [`supabase/README.md`](supabase/README.md).
  **Measured 2026-09-25: 38 files, `0040` the highest, so the next is `0041`** — `0006`
  and `0007` are permanent holes (`supabase/README.md` settles why), so never infer the
  count from the highest number (`ls supabase/migrations/*.sql | wc -l`).
- **RLS is bypassed by the `postgres` superuser.** Any isolation check run as
  superuser passes vacuously. Test under `set role authenticated`.
- ⚠️ **An RLS *UPDATE* refusal arrives as a 200 with zero rows**, not as a 403 — the row
  goes invisible rather than forbidden, and `.single()` is what surfaces it (PGRST116).
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

⚠️⚠️ **AND MERGING IS NOT DEPLOYING — THIS IS THE STEP THAT GETS DROPPED.** A migration
that merges green exists in CI's throwaway Postgres and nowhere else. **On 2026-09-25 two
merged migrations were sitting undeployed**, which is the 2026-09-22 failure in miniature.
So a session that merges a migration owes a `supabase db push` and a green
`docs/checks/5R-f-schema-deployed.sh` — or it owes the owner a sentence saying it did not
deploy and why.

Local database: `supabase start` then `supabase db reset`. Add
`-x realtime,storage-api,imgproxy,kong,mailpit,postgrest,postgres-meta,studio,edge-runtime,logflare,vector,supavisor`
to bring up only what a migration reset needs.

## graphify

This project has a knowledge graph at graphify-out/ over Markdown, SQL and shell, with
community structure and cross-file relationships. ⚠️ **Do not quote a node count from this
file** — it moves on every commit to `main`, it has been stale twice, and until 2026-09-25
this line said *"a thousand-odd nodes"* while the graph carried about three times that.
Read it from `graphify-out/graph.json` if it matters.

⚠️ **There are no god nodes and no semantic layer** — re-checked 2026-09-25:
`graphify-out/wiki/` still does not exist (the directory holds dated snapshots,
`graph.json`, `graph.html`, `GRAPH_REPORT.md` and a cache, and nothing else). Every node is
`_origin: ast`; the LLM extraction pass has never run because no `GEMINI_API_KEY` /
`GOOGLE_API_KEY` is set. Community *names* come from each cluster's hub node, not from a
model — `graphify label` would need a key. So treat the graph as a structural index, not a
summarised one: it reliably tells you **where** something is, and never tells you what it
means.

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
- ⚠️ **`create policy` is still NOT indexed** — re-checked 2026-09-25: querying a policy
  name returns the falsifier that mutates it and the README section that describes the
  shape, never the policy. On this project that is the gap that matters: **41 policies** are
  the subject of most current work, and names like `sale_line_select` or `provider_update`
  resolve to nothing. **For RLS policy questions, read `supabase/migrations/**` directly, or
  ask the database.** ⚠️⚠️ **AND GREP CASE-INSENSITIVELY: all 41 are written lower-case, so
  `grep -rn 'CREATE POLICY' supabase/migrations/` returns ZERO** — a silent, confident
  *there are no policies here*. Everything else in SQL, query first.
