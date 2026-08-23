# Tienda — retail management tool

Multi-tenant retail operations for small Mexican retailers. Postgres (Supabase) +
React Native (Expo). MXN, IVA, LFPDPPP — not GDPR, CFDI out of scope.

**Read these two files before anything else:**

| File | Authority |
|------|-----------|
| [`docs/PLAN.md`](docs/PLAN.md) | Where the build is. Which step is next, what "done" means, what is unresolved |
| [`docs/adr/ADR-035`](docs/adr/ADR-035-target-architecture-postgres-react-native.md) | The architecture. **If anything disagrees with the ADR, the ADR wins and the other file is the bug** |

## What this is not

There is no React Native code yet — do not assume `.tsx`, hooks, or a package
manifest. The build is at the database layer (see `docs/PLAN.md`).

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

One task per session, taken from `docs/PLAN.md`. Estimate difficulty first; if the
task is large, split it in the plan before writing code, so the work survives a
context clear or a usage limit. Update `docs/PLAN.md` when a task closes.

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

This project has a knowledge graph at graphify-out/ — 437 nodes over Markdown, SQL and
shell, with community structure and cross-file relationships.

⚠️ **There are no god nodes and no semantic layer** (checked 2026-08-23). Every node is
`_origin: ast`; the LLM extraction pass has never run because no `GEMINI_API_KEY` /
`GOOGLE_API_KEY` is set, and `graphify-out/wiki/` does not exist. Community *names* come
from each cluster's hub node, not from a model — `graphify label` would need a key. So
treat the graph as a structural index, not a summarised one: it reliably tells you
**where** something is, and never tells you what it means.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost). Commits, merges and branch switches do this automatically on main/master via the git hooks; run it by hand for uncommitted work or on other branches.
- Every subagent prompt that involves code exploration must repeat these rules — subagents do not inherit them.
- **SQL IS indexed** (corrected 2026-08-23). This line used to read "graphify has no SQL
  parser", which was never true — the parser is an optional extra, `tree_sitter_sql`,
  and it simply was not installed. It is now, and all 32 `.sql` files contribute:
  tables, functions, triggers, views and CTEs, each with a file and line. The graph
  went from 177 nodes to 437, and code nodes from 8 to 268.
- ⚠️ **`CREATE POLICY` is still NOT indexed**, and on this project that is the gap that
  matters — forty policies are the subject of most current work. Policy names
  (`sale_line_select`, `provider_update`) resolve to nothing in the graph. **For RLS
  policy questions, read `supabase/migrations/**` directly, or ask the database.**
  Everything else in SQL, query first.
