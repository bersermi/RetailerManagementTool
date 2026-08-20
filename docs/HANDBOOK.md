# Tienda Handbook

How to work with Claude on this project: what is set up and why, what is coming
later, the one prompt you will use most, and — most importantly — where Claude is
likely to be wrong and how you would catch it.

Written for the project owner, who is not a developer. The live build state is
always [`docs/PLAN.md`](PLAN.md); if this file and the plan disagree, the plan is
right and this file is out of date.

---

## What you are building

A retail management app for small shops in Mexico — buying, selling, catalog,
suppliers, waste, and reports.

The important design idea is that stock is a **ledger**, like a bank statement.
Nothing is ever edited or erased. If a sale was wrong, you do not fix the sale —
you add a correcting entry, the way a bank posts a refund rather than pretending
the charge never happened. That is why the database is built the way it is, and it
is the single idea worth carrying in your head.

Right now the project is **all database, no app**. There is no screen to look at
yet. That is deliberate and it is the plan working, not the plan stalling —
ADR-035 is emphatic that screens built on an unproven schema is exactly how the
previous attempt failed.

---

## How a working session goes

One task per session. You paste the prompt, Claude does the work, and the session
ends with what is next and what you need to decide. Then you clear the
conversation and go again.

### Your main prompt

```
Read docs/PLAN.md and take the next open task.

Before starting, estimate difficulty. If it's large, split it in docs/PLAN.md
first and take only the first piece — I'd rather resume cleanly than lose
half-finished work to a context clear or a usage limit.

Use graphify to orient before reading files. ADR-035 is authoritative: if the
plan and the ADR disagree, stop and tell me rather than guessing.

When done, verify it properly — `supabase db reset` and CI, not "the file
exists" — then update the status in docs/PLAN.md and commit.

Finish by telling me what's next and what decision you need from me.
```

The last line keeps you in charge: every session ends with Claude asking rather
than assuming. If a session ever ends without telling you what was decided on your
behalf, that is a bug in how it is working — say so.

### Why clearing the conversation is safe

Long conversations cost more and get less reliable, not more. Clearing is good
practice. It only works because the important things live in files rather than in
Claude's memory: `docs/PLAN.md` says where we are, `CLAUDE.md` tells a fresh
session the rules, and ADR-035 holds every decision. A cleared session reads those
and picks up.

---

## What is set up, and what each piece does for you

### Graphify — a searchable map of the project

Reads the documents and builds a map of how everything connects, so Claude can
find the relevant paragraph without opening twenty files. That directly saves
money: opening files costs tokens, and tokens are what you pay for. When the old
Power Platform material was archived, the map shrank from 1,285 entries to 54 —
every search is now roughly twenty times cheaper.

It nudges automatically: when Claude tries to read a file, a reminder fires
telling it to check the map first. Those reminders appear in the transcript. That
is the system working.

### OrbStack + Supabase CLI — a real database on your Mac

Supabase is the database service the finished app will use. The CLI runs a
complete copy on your laptop so work can be tested for real instead of guessed at.
OrbStack is the engine underneath that makes that possible.

You rarely touch these. Worth knowing: `supabase stop` shuts the database down
when you are done, `supabase start` brings it back. It uses memory while running.

### Git hooks — automatic housekeeping

Small scripts that fire automatically. Committing on the main branch rebuilds the
project map so it never goes stale. They are switched off on other branches
deliberately, because rebuilding on every experiment would be noise.

One of them opens a draft pull request on GitHub when a session ends on a side
branch, and pushes to an existing one. **This is live** — GitHub is logged in, and
it is what prints `Stop says: Pushed N commit(s) to existing PR…` at the end of a
session. That N is the branch's total lead over `main`, not what the session just
did, so it repeats unchanged every turn until the branch is merged.

### GitHub Actions — an independent referee

Every push makes GitHub build a fresh database from scratch, apply all our database
changes to it, and then run every test suite against the result. If anything is
broken, it goes red.

This is the most important safety net in the project and it **is working** — it has
been green on every migration since it merged. A run takes about three minutes.

### Auto mode — fewer interruptions

Instead of asking permission for each command, a safety classifier approves
routine ones automatically. It is now the default in every project. If it is ever
unavailable, Claude Code quietly falls back to asking — it cannot lock you out.

---

## Looking at things yourself

Two things you can open without asking Claude: the project map, and the database.

### Opening the project map

```bash
open graphify-out/graph.html
```

That is the interactive map — boxes you can drag, click and search. It refreshes
itself when you commit or switch branches on `main`; to force it, run
`graphify update .`.

**Set your expectations before you open it.** Right now the map holds 92 boxes and
**84 of them are headings out of the Markdown documents** — this handbook, the ADR,
the plan, the two READMEs. There is **no database schema in it at all**, because
graphify has no SQL parser and this project is currently all SQL. So today it is a
map of *what has been written down*, not of *what has been built*. It becomes a map
of the app itself when React Native code arrives at step 5a.

That is worth knowing so you do not go looking for `stock_movement` in there and
conclude something is broken.

Two other views of the same thing:

| What | Command |
|------|---------|
| The same map as plain text | `open graphify-out/GRAPH_REPORT.md` |
| Ask it a question | `graphify query "how does allocation work"` |
| Explain one heading | `graphify explain "Traps in step 1"` |
| How are two things connected | `graphify path "Build plan" "Traps in step 1"` |

Those names have to be headings that exist in the documents. Asking
`graphify explain "batch_balance"` returns *"No node matching found"* — not a fault,
just the same point again: the tables are not in the map.

Ignore `GRAPH_TREE.html` — it is left over from an earlier build and is not being
regenerated.

### Opening the database

Three ways. Pick the first one unless you are in a hurry.

**1. Supabase Studio — a web page, and by far the easiest.**

Studio is **not running right now**: the database was last started with a reduced
set of services to make migration work faster. Bring the full set back:

```bash
supabase stop
supabase start
```

Then open **http://127.0.0.1:54323**. *Table Editor* on the left browses rows;
*SQL Editor* runs queries. Nothing you do there can affect anyone else — this
database lives only on your Mac.

**2. The terminal, with nothing to install.**

`psql` is not installed on your Mac, but there is one inside the database
container, so you can borrow it:

```bash
docker exec -it supabase_db_RetailerManagementTool psql -U postgres
```

| Type this | To see |
|-----------|--------|
| `\dt` | every table |
| `\d stock_movement` | one table's columns, constraints and indexes |
| `\dv` | views |
| `\df` | functions |
| `\du` | roles |
| `\q` | quit |

**3. A desktop app** — TablePlus, Postico, DBeaver, pgAdmin. Connect with:

| Field | Value |
|-------|-------|
| Host | `127.0.0.1` |
| Port | `54322` |
| Database | `postgres` |
| User | `postgres` |
| Password | `postgres` |

### What you will find in there

Twenty-one tables and **no views yet** — the first view arrives with task 1.4. Of
those twenty-one, `_verify` is test scaffolding and `unit` is the reference list of
grams and kilos; the other nineteen are the real model.

The tables are usually **empty**. Data only appears while a test suite is running,
and the cleanup wipes it before the next one. Real sample data arrives at task 1.6.

### The one warning that matters

**Connecting as `postgres` bypasses row-level security.** You will see every
workspace's rows at once, and every cost column, because that account is exempt
from the rules that protect one shop's data from another's.

**That is not what a cashier sees.** So if you ever open Studio, see both stores'
takings, and conclude the isolation is broken — it isn't; you are simply looking
through the one account the rules do not apply to. The reverse is the real danger,
and it is why `supabase/README.md` insists isolation is only ever tested under
`set role authenticated`: checked as `postgres`, an isolation test passes without
testing anything.

If you want to see what a real staff member sees, that is exactly what the RLS
sections of the test suites do — `supabase/tests/0004_inventory.sql` is the clearest
example.

---

## The four documents that matter

| File | What it is | Who maintains it |
|------|-----------|------------------|
| `docs/PLAN.md` | Where the build is. Next task, what "done" means, what is unresolved | Claude updates it as tasks close |
| `docs/adr/ADR-035` | The architecture. 1,177 lines deciding how everything works | Changes only by deliberate decision — yours |
| `CLAUDE.md` | Rules a fresh session reads automatically. Written for Claude, not you | Claude maintains it |
| `archive/power-platform/` | The abandoned first attempt. Kept for its reasoning only | Frozen — never cite it as current |

There is a strict order of authority: **ADR-035 wins over everything.** If the
plan and the architecture disagree, the plan is the bug, and Claude is instructed
to stop and ask rather than pick a side.

---

## Where we are, and what comes later

| Step | What | State |
|------|------|-------|
| 0 | A database you can actually run | **Done** |
| 1 | The database tables and realistic fake data | **Done** |
| 2 | Three business questions — *the design gate* | **In progress** — 1 of 3. *What made me money* is answered and the schema passed |
| 3 | Automated tests | Later |
| 4 | The write operations (sell, buy, waste, void) | Later |
| 4.5 | What happens when a write fails | Later |
| 5a | App foundations — *the hiring gate* | Later |
| 5b–7 | The actual screens | Later |

### Step 2 is the one to care about

It asks three questions of the fake data: what made me money, what am I throwing
away, what stopped selling. If answering them turns out to be tortuous, the
database design is wrong — and you find that out in week two, with nothing built
on top of it. It is the cheapest moment in the whole project to discover a
mistake. Do not let it get rushed.

### Tooling deliberately not installed

context7, `/using-superpowers`, Headroom and ECC help write *app* code, and there
is no app yet. They become genuinely useful around step 5a. Headroom and ECC are
still unidentified — they need explaining before they can be folded in.

---

## Where Claude is likely to be wrong

This is the section worth re-reading. Claude is fluent and confident in a way that
does not correlate with being right, and you are not in a position to catch
technical errors by inspection.

### The failure mode to know about

**Claude states conclusions from commands whose failure it did not check.** This
happened four times in the session that set this project up:

- Claimed two settings options "do not exist." The search command had silently
  searched nothing.
- Claimed a database file was missing a critical column, and called fixing it the
  top priority. The command behind that had failed silently. The column was there
  all along.
- Diagnosed a broken automation. It was not broken — the file was on a different
  branch.
- Quoted a project plan as current. It had been superseded months earlier.

Each was stated with the same confidence as things that had actually been
verified. There is no tone difference for you to detect.

### What actually protects you

Not your ability to review code — it is the project's rule that **a file is not
evidence; a green CI run is**. That rule exists because the previous attempt
collapsed exactly this way: four architecture documents describing database tables
that were never created, discovered only after a module shipped on top of them.

The protection is mechanical, not human. When Claude says something works, the
question that costs you nothing is: *did a machine other than you confirm that?*

### Right now, the answer is no

Two database migrations are committed and pushed on the strength of local testing
only. GitHub's independent check has run three times and **nobody has seen a
single result**, because `gh auth login` was never completed.

That is the one loose end in the setup, and it is the exact gap this repo was
restructured to close. Finishing that login is the highest-value five minutes
available.

### Other things to watch

- **Claude's memory goes stale.** It keeps notes between sessions. One was two days
  old and wrong, and got acted on instead of the actual files being checked. Notes
  describe the moment they were written, not today.
- **Small decisions get made silently.** Building the catalog, Claude chose who can
  edit products, whether accented spellings count as different products, and a
  Spanish name shop staff will see on screen. All reasonable, none asked about.
  Those choices are now listed at the end of each task — read that list.
- **Scope creep looks like helpfulness.** If a session wanders from the task in
  `docs/PLAN.md`, pull it back. The plan exists so drift is visible.
- **Pushing is public.** Committing is local and private; pushing sends work to
  GitHub. Expect to be asked first, every time.

---

## What only you can decide

Not technical questions, which is exactly why they are yours.

- **Anything an operator sees or types.** Spanish wording, what a cashier may
  change, how many taps a sale takes.
- **What the business will need.** The second store, staff moving between shops,
  whether the two stores price differently. These change the database shape and
  are painful to retrofit.
- **When something is good enough to stop.** Claude will keep finding improvements
  indefinitely.
- **Whether to trust a piece of work.** Ask how it was verified. "It applied
  cleanly locally" and "the independent check passed" are very different answers.

### One open decision right now

Recorded in [`docs/PLAN.md`](PLAN.md). Generating three months of realistic fake
sales needs a rule for which stock gets sold first — oldest expiry date first.
That rule will later be written properly for the real app. The recommendation is
to write it **once**, now, and have both use it, so the fake data behaves like the
real system will. The alternative is faster and risks testing the design against
data the real app would never produce.

---

## Small glossary

**Migration** — one numbered file of database changes. Once applied they are never
edited; you add a new one that corrects the old. Same principle as the ledger.

**RLS (row-level security)** — the database rule that one shop can never see
another shop's data. Enforced by the database itself, not by app code, so a bug in
a screen cannot leak it.

**Commit / push** — commit saves a checkpoint on your machine; push sends those
checkpoints to GitHub, where they are backed up and where automated checks run.

**CI** — continuous integration, the automated check that runs on GitHub after
every push. The independent referee.

**Branch** — a parallel copy of the project for work in progress. `main` is the
real one.

**Pull request (PR)** — a request to fold a branch back into `main`, with the
changes laid out for reading and CI's verdict attached. It is where the work is
reviewed, not where it takes effect.

**Merge** — accepting that request: the branch's commits are copied into `main`,
which becomes the version that includes them. The branch has then served its
purpose. **Merging touches no database and deploys nothing** — it only changes
which version of the files `main` points at. The work goes onto a branch first so
that `main` only ever contains what CI has already passed.

Merging a migration needs the schema owner's approval — which is a decision, not a
keystroke. Claude opens the pull request, reports CI's verdict, and asks; you answer;
Claude merges. Settled 2026-08-17.

Saying *no*, or *not yet, I want to read it first*, is always available and costs
nothing: the branch sits there until you say otherwise, and nothing is deployed
either way.

**Context / clearing context** — everything Claude can currently see. It fills up,
costs money, and degrades. Clearing starts fresh, which is safe here because the
plan lives in files.

**RPC** — a database function the app calls to do something: record a sale, void a
transaction. Coming at step 4.

**Seed data** — realistic fake shop data used to test the design before real shops
exist.
