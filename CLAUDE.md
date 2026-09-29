# Tienda — retail management tool

Multi-tenant retail operations for small Mexican retailers. Postgres (Supabase) +
React Native (Expo). MXN, IVA, LFPDPPP — not GDPR, CFDI out of scope. The app is
named **Wera**; the repo and `@tienda/*` packages stay Tienda.

**Read these before anything else:**

| File | Authority |
|------|-----------|
| [`docs/PLAN.md`](docs/PLAN.md) | Where the build is. **Read `## Position` first** — the two obligation blocks and today's status log |
| [`docs/adr/ADR-035`](docs/adr/ADR-035-target-architecture-postgres-react-native.md) | The architecture. **If anything disagrees with the ADR, the ADR wins and the other file is the bug** |
| [`docs/HANDBOOK.md`](docs/HANDBOOK.md) | **The file the owner reads** — a task that closes usually edits it too. `handbook-agreement.sh` holds it to the plan on done, split, next and whether anything waits on him |
| [`app/CLAUDE.md`](app/CLAUDE.md) | Rules for `app/` — loads when a session touches it |

**Orient in one command** — the next task, the plan's size, and every live obligation:

```
bash docs/checks/plan-handover.sh
```

⚠️ **Never write the next task id, or any count, into this file.** Nothing checks this file,
so every number in it decays silently. Where a number matters, the command that measures it
is given instead.

## The plan

- **`docs/PLAN.md` is the only plan file you edit.** Closed work is MOVED, unedited, to
  `docs/plan/archive/` (`ls` it — never trust a list of it). The status log is archived **one
  working day per file**: a later cut of the same day APPENDS; never a second file for one
  date, never a rename. `docs/plan/archive/handbook/` sits outside the corpus glob on purpose.
- **Search live + archive in one command:** `grep -n '<task-id>' "$(bash docs/checks/plan-corpus.sh)"`.
  Lookups are content-addressed (`| **task** |`), never by line number.
- **Move, never copy.** Two homes for one claim is this repo's most repeated defect, and
  nothing checks for it since the split guards were retired — grep the corpus before and after.
- `plan-handover.sh` caps `docs/PLAN.md` at 6,000 lines and `## Position` at 1,400 and prints
  both. Before a cut, ask *is this block indexed anywhere else?* — a line range is not a
  semantic boundary.
- **Never archive `⛔ DECISIONS OWED` or `⏳ DATES OWED`** — exactly one of each must stay live.
- **The decisions block can lose a question with nothing going red.** A gate cell saying *see
  the decisions block* must be read against the block.
- **A *Blocks* cell is machine-read:** ids only, never an id alone (add a few digit-free
  words), and it must name a row genuinely downstream — a decision naming the next task
  blocks it.
- **Closed is not wrong.** `docs/plan/archive/` is this system's own history, and for several
  screen rulings the only record. `archive/power-platform/` is a system nobody is building —
  never cite it as current; say so when you read it for history.

## CI, and what a green run means

Three workflows. **List every job by name** (count `money.yml`'s twice — it is matrixed):

```
ruby -ryaml -e 'Dir[".github/workflows/*.yml"].sort.each{|f| YAML.load_file(f)["jobs"].each{|k,v| puts "#{File.basename f}  #{v["name"]||k}"}}'
```

| Workflow | Fires on |
|---|---|
| `app.yml` | `app/**`, `packages/money/**`, root `package*.json`, the plan, handbook, conventions page, ADR-035 and their checks. Two jobs: the app (typecheck, Vitest, conventions gate) and *the documents still agree* |
| `db.yml` | `supabase/**`, **`app/src/api/`**, `app/src/auth/`, `app/src/lib/supabase.ts`, `app/src/cart/cart.ts`, `packages/money/cases.json`, root `package*.json`, and each contract check by name — a module in `app/src/api/` is a claim about the applied schema |
| `money.yml` | `packages/**` and root `package*.json` |

Adding a dependency moves the root lockfile, so it fires all three.

- **The number to check a log against is the jobs that COULD fire for the paths changed** —
  each workflow has its own `paths:` filter, and an absent job is not a skipped one.
- A red `db.yml` whose steps read `skipped` after *Start Postgres* is a **registry throttle**,
  not a migration defect. **A cancelled job is not a failed assertion** — `gh pr checks`
  prints *fail* for both.
- **No workflow compiles the native app.** A native dependency swap stays green until a Mac
  builds it.

## Rules that are not negotiable

- **A file is not evidence; a green CI run is.** Every schema claim traces to a migration CI
  has applied (ADR-035 §9).
- **A green CI run is not a deploy.** Each check builds and deletes its own Postgres; the
  database a phone talks to is reached only by hand. **Say which you have evidence about: the
  schema, the code, or the shop.**
- **Deploying** — in no workflow on purpose, because the only token is account-wide:

  ```
  supabase db push                            # applies what the remote is missing
  bash docs/checks/5R-f-schema-deployed.sh    # proves it landed — compares version numbers, not schema
  ```
- **Migrations are append-only once applied.** Fix forward with a new numbered migration;
  numbering is fixed in [`supabase/README.md`](supabase/README.md). The newest is
  `ls supabase/migrations/*.sql | tail -1`. `0006` and `0007` are permanent holes, so never
  infer the count from the highest number. Every migration has a row in that README's table
  (nothing checks it) — match the backticked filename anywhere in the line, because two rows
  are wrapped in links.
- **RLS is bypassed by the `postgres` superuser.** An isolation check run as superuser passes
  vacuously — test under `set role authenticated`.
- **A view is invisible to the RLS guard** (`01_rls_coverage.sql` joins `relkind = 'r'`).
  ADR-035 §2.7 keys invoker vs definer on where the fence is; `waste_reason_line` is the only
  `security definer` view and `supabase/tests/0041_waste_reason_line.sql` asserts it, so a
  second needs a ruling.
- **An RLS UPDATE refusal is a 200 with zero rows**, not a 403 — `.single()` surfaces it
  (PGRST116).
- **Never edit `graphify-out/`** — it is generated.

## Domain vocabulary

Spanish module names are the domain language, not a translation layer: Comprar (buy),
Vender (sell), Productos (catalog), Proveedores (providers), Desperdicio (waste), Números
(reports). `workspace` is the tenant; `location` is the store — they are not the same thing,
and conflating them is a one-way door (ADR-035 §2.3).

## Working agreement

One task per session, taken from `docs/PLAN.md`. **Estimate difficulty first and write down
what the estimate found.** Update `docs/PLAN.md` (and usually the handbook) when a task closes.

- **`M` and `L` are one sitting; `XL` splits on size** (owner, 2026-09-24). A split at `M`/`L`
  must name a non-size reason in its row: half is gated on an owner decision, the row carries
  two failure classes one of which is invisible here, or the deferral test separates
  look-questions not yet answerable. Full argument: the plan's `## Working agreement`.
- **Merging is automated.** Push, open the PR, wait for CI, **read the job log**, and on green
  run `gh pr merge` without asking — migrations included.
- **Never merge red, and never on a green tick alone** — a tick is also what a silently
  skipped step looks like. Confirm the checks by name in the log.
- **Report every decision made on the owner's behalf**, in the closing message and the PR body.
  Flag loudly the ones cheap now and expensive later — anything a migration or the seed bakes in.
- **Merging is not deploying.** A session that merges a migration owes `supabase db push` and
  a green `5R-f-schema-deployed.sh`, or a sentence to the owner saying why not.

Local database: `supabase start` then `supabase db reset`. Add
`-x realtime,storage-api,imgproxy,kong,mailpit,postgrest,postgres-meta,studio,edge-runtime,logflare,vector,supavisor`
to bring up only what a migration reset needs.

## graphify

A knowledge graph lives in `graphify-out/` over Markdown, SQL and shell. It is **AST-only** —
no semantic layer, since no `GEMINI_API_KEY` / `GOOGLE_API_KEY` is set — so it tells you
**where** something is, never what it means. Read the node count from `graphify-out/graph.json`
if it matters; never quote one here.

- For codebase questions, first run `graphify query "<question>"`; `graphify path "<A>" "<B>"`
  for relationships, `graphify explain "<concept>"` for a concept. If `graphify-out/wiki/index.md`
  exists, use it for navigation. Read `graphify-out/GRAPH_REPORT.md` only for broad review.
- **For what was DECIDED, grep the corpus**, not the graph.
- `docs/plan/archive/` is indexed; `archive/power-platform/` is not. The `.graphifyignore` rule
  is `/archive/` **with a leading slash** — a bare `archive/` silently drops `docs/plan/archive/`.
  Check a result's `src=` before citing it as current.
- SQL is indexed (tables, functions, triggers, views, CTEs). **`create policy` is not** — read
  `supabase/migrations/` or ask the database, and **grep case-insensitively**: every policy is
  written lower-case, so `grep 'CREATE POLICY'` returns nothing.
- After modifying code, run `graphify update .` (the git hooks do it on `main`).
- Every subagent prompt that involves code exploration must repeat these rules.
