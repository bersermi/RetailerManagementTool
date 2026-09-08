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

**That changes next.** The database build finished on 2026-09-05, a long interview
about screens ran on 2026-09-07, and the first app code is the very next task. The
interview is worth knowing about, because it is the reason three more database
changes appeared after the database was declared finished — see *Where we are*.

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

⚠️ **One line of that prompt is about to stop meaning what it says.** *"`supabase db
reset` and CI"* is the right test for a database task and the wrong one for a screen:
an app task runs no migration, and until step 5a adds a third check, no automated
check watches app files at all. From 5a onward the question to ask is not *"was CI
green?"* but **"which check looked at the code you just wrote?"** — and a session that
cannot name one has not verified anything.

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

**Set your expectations before you open it.** The map now holds **1,084 boxes**, and
unlike when this section was first written, **the database is in it**: tables,
functions, triggers, views and the CTEs inside queries, each with a file and a line
number. `graphify explain "batch_balance"` works today. *(Both this file and
`CLAUDE.md` carried much smaller counts — 92 and 437 — for weeks after they stopped
being true. Counts in prose go stale; that is what they do.)*

⚠️ **One thing is still missing and it is the one that matters most on this
project: `CREATE POLICY` is not indexed.** The forty-one row-level-security policies —
`sale_line_select`, `provider_update` and the rest — resolve to nothing in the map.
For anything about who can see what, the migrations have to be read directly, or the
database asked. Everything else in SQL, the map answers first.

It is still a map of **where** things are, never of what they mean: there is no
summary layer, because that needs an API key nobody has set.

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

**Twenty-one tables, four views, twenty-eight functions and forty-one security
policies.** `unit` is the reference list of grams and kilos; the rest are the real
model. The four views are the reports — `product_margin_daily`,
`product_velocity_daily`, `product_waste_daily` and `provider_price_memory` — and the
functions are the write operations plus their helpers.

⚠️ **One of those views is known to be wrong for a butcher or a chicken shop**, and it
was the interview on 2026-09-07 that found it, not a test. `product_margin_daily`
works out profit from the cost of the exact goods that left the shelf — which is
correct for a can of beans and nonsense for a shop that buys whole chickens and sells
breasts. It is being replaced. See *Where we are*.

**The tables are no longer empty.** `supabase db reset` loads invented shop data
afterwards, from three files listed in order in `supabase/config.toml` — a skeleton,
then deliveries, then consumption — because you cannot deliver stock into a catalog
that does not exist. What a test suite creates on top of that is still wiped before
the next suite runs.

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
| `docs/adr/ADR-035` | The architecture. 1,454 lines deciding how everything works — amended since it was written, always on your instruction | Changes only by deliberate decision — yours |
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
| 2 | Three business questions — *the design gate* | **Done** |
| 3 | Automated tests | **Done** — 16 suites, 1,080 checks |
| 4 | The write operations (sell, buy, waste, void) | **Done** — all six |
| 4.5 | What happens when a write fails | **Done** |
| — | **The screens interview** — two rounds, 2026-09-07 | **Done** — eight of twelve subjects |
| **4.6** | **Three database changes the interview uncovered** | **Open** — one of them blocks a screen |
| **5a** | **App foundations** — the first app code in the project | ⬅️ **NEXT** |
| 5b–5h | The actual screens | After 5a |
| 6–7 | Beyond the pilot | Later |

### The thing to understand about step 4.6

Between 4.5 finishing and 5a starting, this plan said in as many words that *the
database is complete* and that *the screens ship no database changes at all*.

**Both sentences were wrong, and what proved it was asking you questions about
buttons.** Not a test, not the automated referee, not Claude re-reading the schema.
Three examples of what came out of an interview that was nominally about screens:

- **There is no way for a second person to join a shop.** The table that holds
  invitations exists. The two functions that would create and accept an invitation
  were assigned to a numbered file back in the early days, that file ended up
  containing something else, and **they were never written.** Nothing caught it,
  because a table nobody calls breaks no test. Your employee cannot get into the app.
- **Only the owner can recover a failed sale.** You said the person standing in the
  shop must be able to fix it, and in both pilot shops that is often not you.
- **The profit report is wrong for two of the four shop types** — the chicken-shop
  problem described above.

⚠️ **This is the single most useful thing to take from this handbook.** The tests
prove the database is consistent with itself. They cannot prove it matches a real
shop, and no amount of green ticks will ever start doing so. **That gap closes only
when someone asks you, and you answer from the shop rather than from the plan.**

### What was decided in that interview

Roughly thirty constraints, all in [`docs/PLAN.md`](PLAN.md) under *Step 5*, each
one traceable to the question that produced it. The ones that changed the shape of
the work: the two pilot shops are **two separate businesses, two people each, either
often alone**; they are on **their own iPhones and Android phones**, so the app must
be built for both; **you are building the first catalog yourself** but leaving it
deliberately incomplete; **stock is never shown while selling or buying**; and the
app **admits it is offline quietly and never blocks a sale.**

### Tooling — reviewed 2026-09-07, now that 5a is next

None of the four is installed. Checked directly: **no MCP servers configured, no
plugins enabled.**

| | Verdict |
|---|---|
| **context7** | ✅ **Worth installing now, and it is the only one with a clear case.** It feeds Claude current documentation for outside libraries. The app uses Expo, whose interfaces change fast, and Claude's own knowledge has a cutoff date. Confidently-wrong code against a library that changed last month is precisely the failure this handbook warns about, and this is the cheapest guard against it |
| **`/using-superpowers`** | ❓ Not installed, and **Claude could not say what it does** beyond recognising the name as a Claude Code plugin. It declined to describe it rather than guess — which is the behaviour you want. Worth telling it where you saw it recommended |
| **Headroom** | ❓ **Still unidentified**, exactly as this section said weeks ago. Cannot be folded in until someone says what it is |
| **ECC** | ❓ **Still unidentified.** Same |

**What step 5a actually needs** is short and unexciting: Expo (already reachable, no
install), the Supabase client library, and the app added to the project's existing
workspace list. **The build tool for putting an app on the app stores is deliberately
not installed** — you deferred paying for store accounts until the pilot is ready, and
until then it builds straight onto your own iPhone from your own Mac.

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

### That gap is now closed — and a different one has opened

**This section used to say the opposite**, and it stayed wrong for weeks: it told you
GitHub's login had never been completed and that nobody had ever seen a check result.
That was true when written. It is not true now — the login is done, and both checks
have been read by name in the job log on every merge since. **A handbook that tells
you your safety net is switched off, when it is on, is worse than one that says
nothing.**

⚠️ **The new gap is that the safety net does not reach the app.** The two automated
checks are wired to fire only when the database files or the money package change.
**Neither one watches an app directory, because there has never been one.** So from
the first screen onward, *"a green run confirmed it"* would quietly mean *"both checks
correctly decided they had nothing to do."*

This is written into the plan as part of step 5a rather than left as a good
intention: **5a is not finished until a third check exists that watches the app.**
If a session ever tells you 5a is done and cannot name that check, that is the thing
to push back on.

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

### The open decisions right now

All recorded in [`docs/PLAN.md`](PLAN.md); these are the ones that are yours.

1. **How a second person joins a shop.** An invitation you send, or a code they type
   and you approve? You asked for **both** — an invitation counting as an approval
   granted in advance. That is the one piece of modelling worth arguing about
   **before** it is built rather than after, because it is a database change and
   those are dear to reverse once merged.
2. **Whether anyone may change a price.** Today's answer is yes, anyone — and prices
   changed at the counter **stick**. So an employee giving one customer a discount
   quietly rewrites the shop's price for everyone after. You took that knowingly and
   for now; it is a screen, so it costs nothing to change your mind.
3. **Four subjects the interview never reached**, two of which block a screen:
   what happens **after** a sale is finished (receipt? change?), what **undoing a
   mistake** looks like, expiry dates when a delivery arrives, and **which three
   numbers** you want to see daily. That last one decides the shape of the
   replacement profit report, so it is worth doing before that gets written.

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

⚠️ **This paragraph used to describe an approval step that no longer exists, and it
contradicted `CLAUDE.md` for weeks.** Two things were settled on 2026-08-17, hours
apart, and this file kept the first one: an approval gate was agreed in the morning
and **replaced by automated merging** the same day. The rule now is that Claude
pushes, opens the pull request, waits, **reads the job log rather than the green
tick**, and merges without asking — migrations included.

Two things did **not** change, and they are what the gate was really for:

- **Never merge red, and never merge on a green tick alone.** A tick is also what a
  silently skipped check looks like. The checks get confirmed by name.
- **Every decision made on your behalf gets reported** — in the closing message and
  in the pull request. Removing the checkpoint removed the approval, not the
  obligation to tell you.

Saying *no*, or *not yet, I want to read it first*, is still always available and
still costs nothing. It is just no longer the default, and after a merge a modelling
choice you want back costs a new migration rather than an edit.

**Context / clearing context** — everything Claude can currently see. It fills up,
costs money, and degrades. Clearing starts fresh, which is safe here because the
plan lives in files.

**RPC** — a database function the app calls to do something: record a sale, void a
transaction. Coming at step 4.

**Seed data** — realistic fake shop data used to test the design before real shops
exist.
