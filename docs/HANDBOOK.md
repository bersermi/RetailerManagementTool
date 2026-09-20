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

For most of this project there was **no app at all** — only a database. That was
deliberate and it was the plan working, not the plan stalling: ADR-035 is emphatic
that screens built on an unproven schema is exactly how the previous attempt failed.

**That changed on 2026-09-07.** The database build finished on 2026-09-05, a long
interview about screens ran two days later, and the first app code landed the same
day. There is now an app, and it has a way in: sign-in by email address or with
Google, a session meant to survive until you log out, and a rule that reopens it on
the screen you were last on.

⚠️ **"Meant to" is doing real work in that sentence, and it is the honest word.**
Those parts are written and checked by machine as far as a machine can reach — but
**nobody has yet watched the app do any of it on a phone.** That is the next task,
and it is yours rather than Claude's. ⚠️ **Everything behind the door is still a
placeholder**: the four tabs are real tabs with nothing in them yet, and the screens
themselves are `5b` onwards.

The interview is worth knowing about, because it is the reason three more database
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

Respect the gates in the plan — some tasks are blocked on questions I have
not answered yet, and one is blocked on an ADR amendment I owe you.

When done, verify it properly and name the check that looked at it — not
"the file exists", and not a green tick on a run that had nothing to do.

Finish by telling me what's next and what decision you need from me.
```

⚠️ **The verification line changed on 2026-09-07, and it is worth knowing why.** It
used to say *"`supabase db reset` and CI"*. That is the right test for a database task
and the wrong one for a screen: an app task runs no migration, and until step 5a adds a
third automated check, **no check watches app files at all**. So the question is no
longer *"was CI green?"* but **"which check looked at the code you just wrote?"** — and
a session that cannot name one has not verified anything.

⚠️ **The gates line is new too.** The plan now contains tasks that are deliberately
blocked: some on questions the interview never reached, and one on an amendment to
ADR-035 that only you can make. Without that line a session will cheerfully take a
blocked task and build it on a guess.

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

**Set your expectations before you open it.** The map now holds **over a thousand
boxes**, and unlike when this section was first written, **the database is in it**:
tables, functions, triggers, views and the CTEs inside queries, each with a file and
a line number. `graphify explain "batch_balance"` works today.

⚠️ **Do not trust a count written in any document, including this sentence.** This
file said 92 for weeks and `CLAUDE.md` said 437; both were replaced with 1,084 on
2026-09-07 and **that number was wrong within the hour**, because merging the very
commit that wrote it added twenty-five boxes. The map rebuilds itself on every commit
to `main`. If you want the real figure, ask the map, not the prose.

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
| `docs/plan/archive/` | **Closed** parts of the plan — finished steps, and status-log entries older than the current working day. Still part of the plan | Claude moves things here when `plan-handover.sh` says the file is too big |
| `archive/power-platform/` | The abandoned first attempt. Kept for its reasoning only | Frozen — never cite it as current |

There is a strict order of authority: **ADR-035 wins over everything.** If the
plan and the architecture disagree, the plan is the bug, and Claude is instructed
to stop and ask rather than pick a side.

### ⚠️ Two archives, and they mean opposite things

**`archive/power-platform/` is WRONG.** It describes a system nobody is building,
four of its ADRs are provably false, and citing it as current is a defect.

**`docs/plan/archive/` is CLOSED, and still true.** On 2026-09-19 `docs/PLAN.md`
reached 14,998 lines — about 313,000 tokens, **larger than a context window**. No
session could read it; every session grepped it instead, and paid for the grepping.
It was cut in two passes, both **unedited and in original order**, and both verified
by rebuilding the source file and confirming it came back **byte-identical**:

| File | What moved | Lines |
|---|---|---|
| `steps-0-to-4.5.md` | Steps 0–4.5, all closed | 6,361 |
| `status-log-through-2026-09-18.md` | Status-log entries for 2026-09-18 and earlier | 4,576 |

`docs/PLAN.md` went **14,998 → 4,298 lines**, and `## Position` — the section your
prompt sends every session to *first* — went **5,484 → 933**.

⚠️ **It cannot grow back quietly.** `plan-handover.sh` now fails when `docs/PLAN.md`
passes 6,000 lines or `## Position` passes 1,400, and the failure names the remedy.
Position reached 5,484 at one or two status-log entries a session, and **nobody ever
decided to let it** — that is precisely the kind of drift a check exists for.

⚠️ **The `⛔ DECISIONS OWED` and `⏳ DATES OWED` blocks never move.** The same check
requires exactly one of each in the live plan; a copy in the archive would be a
second home for one claim.

### ⚠️ When a task is too big, add a SPEC — do not write a new guard

This is the one procedure that changed, and the one most likely to go wrong, because
the old way had been done seven times and reads like the house style.

**Before 2026-09-19**, splitting a task meant writing a ~290-line bash guard plus a
~265-line falsification harness, bespoke to that split, and wiring both into
`app.yml`. Seven of those were written. They were copies of each other, and two
defects rode along in the copying: one of the seven had **lost its anti-vacuity
guard** entirely — it reported success on a run that asserted nothing — and the same
`|`-in-a-regex trap caught three separate writers.

**Now**: add one file, `docs/checks/specs/<task>.split`, listing the parent, the
children, each deliverable and who owns it, and any sentence a row must keep. That
is ~30 lines of data. `app.yml` already matches `docs/checks/specs/**`, so **there
is nothing to wire** — which also removes the failure that cost a day once, where a
guard existed but no workflow ran it.

Run `bash docs/checks/split-coverage.sh --all` and
`bash docs/checks/split-coverage-falsify.sh` (add `--quick` for a fast local loop).
The falsifier **generates its fixtures from your spec**, so a new split gets the full
battery — parent row gone, child gone, child stated twice, deliverable dropped,
claimed by two, moved to the wrong child — without you writing any of them.

⚠️ **If a session ever starts writing `<task>-split-coverage.sh`, that is the bug.**

### You do not have to fetch anything back to read it

⚠️ **The checks still see the archived rows.** `docs/checks/plan-corpus.sh`
assembles `docs/PLAN.md` plus everything in `docs/plan/archive/` into one file, and
the plan guards read *that*. So a task row keeps working after its step is
archived. Run `bash docs/checks/plan-corpus.sh --list` to see what it assembles.

This works only because of a property the repository already had by luck: every
plan check finds its row by **content** — `| **5b-iii-d** |` — and never by line
number. Had one check counted lines, archiving would have been impossible.

⚠️ **Not every check reads the corpus, and the difference is deliberate:**

| Check | Reads | Why |
|---|---|---|
| `split-coverage.sh` (all 7 splits), `5a-`, `4.6a-` | the **corpus** | They look up specific task ids. An archived row must still resolve |
| `plan-handover.sh`, `handbook-agreement.sh` | the **live plan only** | They assert there is *exactly one* next task and *one* decisions block. An archived copy would read as a second one and they would refuse a correct plan |

### If a closed step genuinely reopens

Reading it is not "getting it back" — just read the file. **Move a section back
into `docs/PLAN.md` only when work has actually restarted**, and then:

1. **Move it, never copy it.** Two homes for one claim is how six of this
   repository's seven stale-copy defects happened. Cut from the archive, paste
   into the plan.
2. **Say in the row why it reopened, and on what date.**
3. **Re-run `bash docs/checks/split-coverage.sh --all`.** If you copied instead of
   moved, *"row appears 2 times"* catches it — that assertion reads the corpus, so
   it sees both copies. This is the safety net for exactly this move.
4. **If the reopened work changes the schema, it is a new numbered migration.**
   Migrations are append-only once applied. Moving text between two Markdown files
   cannot un-apply anything that is already deployed.

⚠️ **Whether a step is closed enough to archive is a judgement, and Claude should
say so in the session that makes it.** Steps 0, 1 and 2 carried a `✅` in their own
headings; 3, 4 and 4.5 did not, and were archived on the evidence of 41, 50 and 31
completion marks inside them. That is a decision made on your behalf — the kind the
working agreement says must be reported by name.

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
| **4.6** | **Three database changes the interview uncovered** — ⚠️ **seven migration files, since the membership one was split three ways and the Números one three ways again** | ✅ **Done 2026-09-14 — `0027`–`0033`, and with it THE DATABASE BUILD HAS NO OPEN TASK.** Both decisions this row used to be waiting on were ruled the same day, including the Números questions (área 9) |
| **5a** | **App foundations** — the first app code in the project | **Split into four on 2026-09-07**, before any of it was written |
| **5a-i** | The empty app, and the automated check that watches it | **Done 2026-09-07** — and it is the first app code in the project |
| **5a-ii** | Text size and money formatting | ✅ **Done 2026-09-07** |
| **5a-iii** | Sign-in — email, then Google, and reopening on the last screen | **Done 2026-09-11** — split in two on the day it was taken, both halves closed |
| **5a-iv** | **Running it on your own phone** | **Split into four on 2026-09-11** — ⚠️ **the last piece is now waiting on a CALENDAR, not on a person: the readings fall on 2026-09-21 and 2026-10-13, and opening either app early restarts the clock.** ⚠️ **Re-deploy to the iPhone before 2026-09-20** or the free profile expires and day 8 shows a red screen instead of an answer. Both dates are in `docs/PLAN.md`'s dates block, which fails the automated check once one of them passes unanswered. **Meanwhile the takeable work has moved on to step 5b**, which needs nothing from you. The Mac was prepared on 2026-09-12, but signing needs your Apple ID, and five of the six readings are things only a person holding the phone can see. ⚠️ **Which piece is next is `docs/PLAN.md`'s to say, not this file's** — it is named there once, and `docs/checks/plan-handover.sh` is what keeps it named once |
| **5b** | **Onboarding and membership** — creating a shop, and getting a second person into it | ✅ **Done 2026-09-20** — **every piece under it has closed.** You can create a shop, read out its code, invite somebody by name, and let in somebody who asks — all from the app. **Split into three on 2026-09-14**, before any of it was written |
| **5b-i** | Creating the shop: its name, the IVA question, and the app's first data layer | ✅ **Done 2026-09-14** — install, sign in, name the shop, land on Inicio |
| **—** | **The look of the app** — three directions drawn, you picked one | ✅ **Ruled 2026-09-17.** The canvas is at `claude.ai/code/artifact/5d0fe2fd-3e7c-448a-a27d-4c0f2fe99127` and it is the only copy |
| **5b.6** | **The colours, written down as code plus a check that enforces them** | ✅ **Done 2026-09-17** — eleven named colours and a check that refuses any other |
| **5b.5** | The conventions page, second pass | ✅ **Done 2026-09-18** — it describes the data layer; the shared-components half moved to `5h.5`, once there are some |
| **5b-ii** | **Ajustes, the join code, and inviting someone** | ✅ **Done 2026-09-18** — split in two before any of it was written, because it was bigger than the file said, and **every piece under it has since closed** |
| **5b-ii-a** | **The Ajustes sheet: who is in the shop, the join code, and text size** | ✅ **Done 2026-09-18** — the sheet opens on top of whatever you were doing, shows the shop, the code with a share button, who is in the shop and the text size, and closes back where it came from. The text size is now remembered by the phone. ✅ **Your ruling of 2026-09-18 is built in**: a staff member does not see the list of people — the database will not tell the app who they are, so the list would be blank rows |
| **5b-ii-b** | **Inviting someone, and them joining** | ✅ **Done 2026-09-18** — **both halves closed the same day**, and the loop is shut: you invite somebody and they can actually get in. It was split in two before any of it was written — it was bigger than the file said, the same way `5b-ii` was six days earlier. ⚠️ **Nothing was cut**: the two halves below are the same work, in the order a shop would actually do it |
| **5b-ii-b-1** | **Inviting someone: the button, and the code you read out** | ✅ **Done 2026-09-18** — open Ajustes, tap *Invitar a alguien*, type their correo, choose **Encargado** or **Empleado**, and the app gives you a sixteen-character code to send over WhatsApp. ⚠️ **The code is shown once and we never store it** — only a scrambled copy we check against — and a real check now proves it is nowhere in the database. If you lose it you invite again, which takes one tap. ✅ **You are told plainly when inviting the same person twice kills the first code.** ⚠️ **In a one-store shop nothing asks which store** — both your shops are one store, so that question never appears. ⚠️ **Nobody can USE the code yet** — that is the next row |
| **5b-ii-b-2** | **Them joining: typing the code on their own phone** | ✅ **Done 2026-09-18** — and the loop is shut: you invite somebody and they can actually get in. The second person installs the app, signs in, types the code, and is in your shop. ⚠️ **One decision here is worth a look** and it is written up in the plan: the code you send them is sixteen characters and the shop's own join code is eight, and they look identical otherwise — so the app will use ONE box and tell them apart by length, rather than asking a person which kind of code they were sent, which they have no way to know |
| **5b.7** | **Asking people their name when they create their account** | ✅ **Done 2026-09-18** — the sign-up form now asks for a **nombre** and an **apellido**, both required, and stores them. ⚠️ **The deadline it was racing is closed**: anybody who signs up from now on has a name stored. ✅ **Your ruling of 2026-09-18 is built in** — two boxes, not a word count, because Spanish names routinely carry two surnames. ⚠️ **Nothing shows the name yet**; that is `5b.8`. ⚠️ **People signing in with Google are taken as they come** — Google sends one line of text and some accounts genuinely have no surname — and `5b.8` gives them a way to fix their own name in Ajustes |
| **5b.8** | **Showing the name in the list of people** | ✅ **Done 2026-09-19** — **every piece under it has since closed**, and a name now travels the whole way: it is stored wherever a person joined from, it shows in the list of people, and the person it belongs to can fix it. **Split into three on 2026-09-18**, before any of it was written — it was bigger than the file said, the same way `5b-ii` and `5b-ii-b` were. ⚠️⚠️ **And the sizing found TWO MORE PLACES A PERSON JOINS YOUR SHOP than the plan knew about** — somebody who was invited but types the shop code instead, and somebody you approve from a request. **Without them, half the people joining would arrive with no name and nothing in the app could explain why.** Both are now in the first piece. ⚠️ **One thing here is worth a look and it is written up in the plan**: if somebody fixes their own name and is later re-invited, the app KEEPS what they typed rather than replacing it with what Google sent. That is a rule inside the database, and changing it later cannot recover a name already overwritten. ⚠️ **The first piece stores the name and shows it nowhere** — the same trade `5b.7` took — and the second piece is what puts it on the screen. ⚠️ **It also carries three corrections to the architecture document**, the third added by your ruling of 2026-09-18 — one pass over that section instead of three. This is the database change, and it is what makes your own row say your name instead of *Dueño*. It is also what retires your no-names ruling of 2026-09-14 — you overturned it on 2026-09-18, and this is the task that carries it through. ⚠️ **It grew the same day, from one look at the database**: as things stand only a shop's OWNER may edit a membership row, so without extra work a person could never correct their own name. Fixing that properly needs care — the naive version would also let someone promote themselves to owner |
| **5b.8-i** | **Storing everybody's name, wherever they joined from** | ✅ **Done 2026-09-18** — the database change shipped and nothing was waiting on you for it. It was the database change: every way a person can end up in your shop starts recording the name they signed up with. ⚠️ **Nothing shows it yet** — that is the next piece — and it is deliberate: storing it and showing it are two jobs, and doing them together is how the file said this was one task when it was three. ✅ **Your ruling of 2026-09-18 is built into it** — *"keep what they typed"* — so if somebody fixes their own name and you later invite them again, **the app keeps their version** instead of overwriting it with whatever Google sent. ⚠️ **That one is worth knowing because it cannot be undone later**: changing it now is a new database change, and any name already overwritten would simply be gone. ⚠️⚠️ **ONE THING THE file SAID AND THE DATABASE DISAGREED WITH, and it is the kind you would want told**: the plan listed **two** places a person can join your shop, and the database actually has **four**. The two it had missed are the ones where somebody you invited by email types the **shop code** instead of the emailed code, and the one where **you approve** somebody who asked to join. Both are in. Had they been left out, those people would have shown up in your list with **no name at all**, standing next to people who had one, with nothing on the screen to explain why. ✅✅ **AND ONE THING YOU RULED ON AFTERWARDS, WHICH IS WORTH KNOWING IN PLAIN TERMS: everybody who works in your shop can see everybody else's name.** The *list of people* screen is still only for you and your managers — a cashier never sees that screen — but the name itself is not hidden from her by the database, and hiding it would have meant a risky change to the rule that decides what anyone in your shop can read at all. ⚠️ **What does NOT travel is anything about their account** — not their email, not their password, nothing — **and nobody outside your shop can see any of it.** That last part was measured, not assumed |
| **5b.8-ii** | **Showing the name in the list of people** | ✅ **Done 2026-09-18** — the Ajustes list stops saying *Dueño* and *Encargado* where it can say a person's name instead, and nothing was waiting on you for it. ⚠️ **Your no-names ruling of 2026-09-14 is now properly retired** — you overturned it on 2026-09-18, and a name was not really on screen until this shipped. ✅✅ **THE ONE THING THAT WAS WAITING ON YOU HERE IS ANSWERED, 2026-09-19.** The *other* half of that old ruling was about the screen where **you approve somebody who asked to join**, and that name genuinely was not there to show — somebody who has only ASKED to join is not in your shop yet, so no row of theirs carries one. **You ruled: show the email as the header and the name underneath.** ⚠️ **That grows the approval task**: the name has to be fetched deliberately, which is a small database function with its own tests, and the plan says so on that row. ⚠️ **And nobody can fix a wrong name yet** — a Google account that came through as one word now shows that one word to everyone in the shop, and only you as owner could change it. That is the next row |
| **5b.8-iii** | **Letting somebody fix their own name** | ✅ **Done 2026-09-19** — **both halves closed the same day**, so a name that came through wrong is repairable by the person it describes. **Split in two on 2026-09-19**, before any of it was written — it was two jobs wearing one name, the same way `5b.8` itself was. ⚠️ **Nothing is waiting on you for either half.** The file had it down as one sitting; measured against the two jobs that just shipped, it was a database change AND a screen change, and those have been separate sittings every time in this project. The two rows below are the halves |
| **5b.8-iii-a** | **Letting somebody fix their own name: the plumbing** | ✅ **Done 2026-09-19** — the plumbing is in and nothing was waiting on you for it. **Nobody sees anything change yet**, which is what this half was for: it is the part underneath that makes the next row possible, and **the box you type into is the next row**. ⚠️ **So the gap is still there for a person**: a name that came through as one word is now repairable by the app and not yet by a person. ⚠️ **It exists because of a real gap**: as the database stands today only a shop's OWNER may change a membership row, so an **Encargado** or **Empleado** who signed in with Google and came through as one word could never correct it. ⚠️ **The obvious fix would also let them promote themselves to owner** — the rule that decides who may change a row cannot tell one COLUMN from another — so it is done instead as one narrow operation that touches the name and nothing else. ⚠️⚠️ **One call I made for you, and it is no longer free to change — it shipped**: fixing your name fixes it in THAT shop. If somebody ever runs two shops, they would fix it twice, **and nothing would tell them the other one is still wrong** — which is now measured rather than predicted, by a test that does exactly that and reads both shops back. Everyone has one shop today, and doing it the other way means a single tap writing into shops the app is otherwise very careful to keep apart. **Say the word if you would rather it fixed both, and it becomes a new database change rather than an edit** |
| **5b.8-iii-b** | **The box you actually type your name into** | ✅ **Done 2026-09-19** — and nothing was waiting on you for it. Open **Ajustes** and there is a new **Tu nombre** section: it shows the name the shop sees for you, and *Cambiar mi nombre* opens a box already filled in with what is there, so a name that came through as one word needs the second word typed and nothing else. ✅✅ **Everybody gets it, including an Empleado — and that is your ruling of 2026-09-19, not an assumption**: *"everybody is right, keep it."* It was built that way, flagged for you, and answered the same day. Why it mattered: the list of people and the invite button are both **Encargado-and-above**, so a cashier can see neither, and she is the person most likely to have come through from Google as one word. ⚠️ **It fixes your name in THIS shop**, and the app says so underneath the box — *"Así te ven los demás en esta tienda"* — which is the call flagged on the row above, now visible to the person rather than only in the file. ⚠️ **It shipped no database change**, exactly as the row promised, and the list of people redraws the moment you save |
| **5b-iii** | **Someone asks to join, and you approve them** | ✅ **Done 2026-09-20** — **all four pieces have now shipped, and the thing this row describes works end to end**: they type your code, you get a bell, you tap, they are in. ⚠️⚠️ **Split into FOUR on 2026-09-19**, before any of it was written — and it is the biggest thing this project has split so far. ⚠️ **Nothing is waiting on you for any of it**; you ruled on it on 2026-09-19 and that ruling is built into the rows below. **This row is no longer a job somebody picks up** — the four under it are. Why it split: as written it was **two database changes AND two screens**, and measured against the last nine pieces of work that is four sittings, not one. ⚠️ **The file had it down as one.** It had grown twice without anybody starting it — once when you ruled that the approval shows the name, which needs a small database function to fetch it, and once when you ruled a database fix into it — and the row still carried the size it was given before either. The four rows below are the halves, in the order they should be taken |
| **5b-iii-a** | **Two error messages that need a code of their own** | ✅ **Done 2026-09-19** — your ruling of 2026-09-18, *"put the SQLSTATE fix in 5b-iii"*, is built. In plain terms: when the app asks the database to do something and it refuses, the database sends back a short code saying WHY. Two refusals had no code of their own, so the app recognised them by **reading the English sentence in the error** — *this person already asked to join*, and *that code is not valid*. Both now have a code, and the app reads the code. ⚠️ **You will see nothing change**, which is what this row was: no new screen, no new button, and the wording a shopkeeper reads is identical. ⚠️⚠️ **ONE DECISION WAS TAKEN FOR YOU AND IT IS WORTH A MINUTE, because it is now permanent.** *"That code is not valid"* and *"somebody else already used that code"* were **given the SAME new code, not two.** The reason is that the app has always given both the same sentence — whichever way the code is dead, the person holding it has to ask you for another one, so there is nothing different for them to do. **If you want those two told apart on screen, say so and it is a new, small piece of work** — it cannot be undone by editing, only by adding. ⚠️ **A second thing was deliberately left alone**: *"your session ended"* keeps the code it always had, which is the whole point — it used to share a code with *"that code is dead"*, and the join screen had to guess which had happened. It no longer guesses |
| **5b-iii-b** | **Someone types your shop's code and asks to be let in** | ✅ **Done 2026-09-19**, and **one thing is now waiting on you** — see the row at the bottom. It works end to end on their side: they install the app, sign in, type the code you read out, and the app tells them it has been sent and is waiting. ⚠️ **The one box now takes BOTH kinds of code.** Before today, somebody who typed your SHOP code into that box was told *"that's the shop's code, ask them to invite you"* — because the app could not yet act on it. It can now, and that sentence is gone. **Their half of it.** They install the app, sign in, type the code you read out, and the app tells them it has been sent and is waiting. ⚠️ **It is deliberately HALF the loop** — they can ask, and nobody can let them in until the two rows below ship. That is the same shape as the last two database changes, which stored a name before anything displayed it, and it is how work stays reviewable. ⚠️ **It adds no database change** — everything it calls was built and tested back in September. ⚠️ **One detail worth knowing**: asking twice does nothing bad. A second tap on a bad connection, or asking again the next morning, shows them the same pending request rather than an error |
| **5b-iii-c** | **Fetching the name of the person asking** | ✅ **Done 2026-09-19**, and nothing is waiting on you for it. **Your ruling of 2026-09-19 now has its database half.** You asked for the approval to show the **email as the heading and the name underneath**. The email is already there to read; **the name is not** — somebody who has only ASKED to join is not yet a member of the shop, so there is no membership row of theirs carrying a name. This adds one small, narrow database function that fetches it. ⚠️ **It changes nothing you can see**, the same way `5b.8-iii-a` did — the screen that shows it is the row below. ⚠️⚠️ **One consequence of your ruling, recorded so it is not a surprise later: their name reaches you BEFORE you have let them into the shop**, on the strength of them having typed your code. That was the argument against it and you ruled anyway; **it is permanent as of today.** ⚠️ **The obvious cheaper way was refused**: storing the name on the request itself would leave a field that means something for one kind of request and nothing for the other. ⚠️⚠️ **TWO THINGS WERE DECIDED FOR YOU AND THEY ARE BOTH PERMANENT NOW.** **First: only the OWNER can read these names — a Gerente cannot.** A manager cannot let anybody in (that has been owner-only since the approval was built), so showing her a list of strangers' names she can do nothing about seemed the wrong trade. It can be opened up later with a one-line change; taking it back from somebody already using it is the harder direction, which is why it went this way round. **Second: somebody who is not the owner sees an EMPTY list rather than an error message** — say so if you would rather it complained, but the reason is the error code below: it already means two different things and a third would have made it worse |
| **5b-iii-d** | **The bell on the home screen, and letting them in** | ✅ **Done 2026-09-20** — **both halves closed the day after it split**, and nothing is waiting on you. ⚠️⚠️ **Split in two on 2026-09-19, the day it was picked up and before any of it was written** — **this row is no longer a job somebody takes**, the two under it are. ⚠️ **Nothing about it is waiting on you.** Why it split: the file had it down as one sitting, and measured against the last five pieces of work it is about **one and a half times the biggest screen job this project has ever done**. The reason is simple once you see it — the last two screen jobs both **changed a screen that already existed**, and this one has to build a new screen from nothing, put a bell on a second screen, and add a store-chooser with a rule attached. ⚠️ **The row's own note said to re-measure it on the day it was taken, and that note has now been right three times running.** ⚠️ **Neither half adds a database change** — everything both of them call was built and tested already |
| **5b-iii-d-1** | **The bell, and the list of people waiting** | ✅ **Done 2026-09-20** — open the app as yourself and there is a bell on Inicio with a number beside it; tap it and you see who is waiting. ⚠️ **You can see who is asking; you cannot let them in yet** — that is the next piece of work, and the screen says so in a sentence rather than leaving you to wonder where the button is. A notifications bell on Inicio with a count on it, and the list behind it: one entry per person waiting, showing the **email as the heading and their name underneath** — your ruling of 2026-09-19 — plus whether they asked to be a Gerente or an Empleado, and how long they have been waiting. ⚠️ **It is deliberately half the job**, the same way the last three pieces were: nothing on this screen changes anything yet, which is what makes it something you can look at and correct before the part that admits people is built on top of it. ⚠️ **If somebody's name is missing it just shows the address** — some accounts have no name stored, and that is handled quietly rather than explained to you. ⚠️ **Only you see the bell.** A Gerente sees an empty list rather than an error, which is how the name lookup was built yesterday and is not a mistake. ⚠️ **It adds no database change**, and every claim in it can be checked against a real database before you ever open the app |
| **5b-iii-d-2** | **The button that admits them** | ✅ **Done 2026-09-20** — **and the loop is shut: somebody can now ask to join your shop and you can let them in, from your own phone, without anybody touching a database.** Open the bell, tap **Dejar entrar** beside the address, confirm, and they are gone from the list and inside the shop. ⚠️ **It asks you to confirm — two taps, not one — and that was a decision taken for you.** There is no *Quitar* yet, so a mis-tap would put a stranger in your shop with nothing in the app able to remove them; say the word and it goes back to one tap. ⚠️ **In a one-store shop you are never asked which store** — there is only one answer, so the app fills it in. ⚠️⚠️ **One thing worth knowing and it may be worth changing: you cannot admit somebody as a Gerente through this screen.** Everybody who types your shop code arrives as an Empleado, because the app never asks them what they want to be — asking would let somebody claim a role you never offered. To make somebody a Gerente you invite them by name instead, which you could already do. ⚠️ **Tapping approve twice is safe**, as promised below. ⚠️ **It added no database change.** ⚠️ **This row carried the next-work marker until today and the marker is DELETED rather than struck through** — `handbook-agreement.sh` reads the raw line, and a strikethrough is only a rendering. **The other half, and it is the one worth reading twice.** The approve button itself, the **choice of which store an Empleado works in**, and what the screen says when it cannot go through — the request expired, somebody else already dealt with it, or the store picked is not yours. ⚠️⚠️ **Admitting an Empleado makes you choose a store, and it refuses to be left empty.** That is not fussiness: staff can only record things where they have been placed, so an employee admitted with nowhere attached opens the app and **every single thing they try to save is refused with no message at all** — which to the person holding the phone looks exactly like the app being broken. ⚠️⚠️ **This is why it got a sitting of its own.** That rule is the one thing in this whole job that **no automatic test here can check** — this project deliberately does not test what screens look like — so putting it in the same sitting as a bell and a list would have meant the riskiest part shipping with nothing able to catch it. ⚠️ **Tapping approve twice is safe** — the database already treats the second tap as "already done" rather than an error. ⚠️ **It adds no database change** |
| **5c** | **Working with no signal** | ⚠️ **This is where the next piece of work is** — and nothing about it is waiting on you *yet*. ⚠️ **`5c.5` went first and handed it a number: a dropped connection costs up to 90 seconds before the app retries.** ⚠️⚠️ **It is a big one, so the session that picks it up will spend its time cutting it into pieces before writing anything** — the same thing that happened to `5b`, `5b-iii` and `5b-iii-d`, each of which turned out to be two to four sittings once measured. **What it is:** the shop loses its connection routinely, and today that means a sale simply fails. This is the work that lets the app hold what you did, tell you quietly that there is no signal, and send it when the signal comes back — plus the small banner that says something never went through, showing a count and a peso figure and never a list. ⚠️ **There is a smaller, separate job beside it (`5c.5`) that is a MEASUREMENT rather than a build**: does staying signed in survive losing the connection at exactly the wrong moment? It takes one sitting and it would tell us whether the sign-in promise is real. **If you would rather that answer first, say so** — it is a one-word reorder |
| **5c.5** | **Does staying signed in survive a dropped connection at the worst moment?** | ✅ **Done 2026-09-20 — and the answer is YES.** **You reordered it ahead of `5c` and it was worth doing.** ⚠️⚠️ **The fear we had written down turns out to be wrong, and wrong for a reason nobody guessed.** We thought: the ten-second grace period is what saves you, so an outage longer than ten seconds signs you out. **It is not the grace period at all.** Supabase only rejects an old ticket once the *replacement has actually been used* — and if the phone never received the replacement, it never uses it. So the old ticket keeps working, and when the signal comes back the phone is handed **the very ticket it missed**. We tested this for real: a dropped connection, the reply destroyed after the server had already committed, and the phone still signed in on the other side. ⚠️ **One thing we did NOT know before, and it costs something:** after a failed attempt the app waits **up to 90 seconds** before trying again — 30 seconds of quick retries, then a 60-second cooling-off. **Nobody gets signed out because of it**, but it means the app does not spring back the instant the signal does, and it is the number `5c` now has to be built around. ⚠️ **This was measured against the local copy of Supabase, not the live one** — the live project's settings are still something you read off the dashboard rather than something we tested, and that distinction is kept on purpose | ⚠️ **It is a MEASUREMENT, not a build** — one sitting, and what it produces is an answer rather than a screen. **The question:** every hour the app quietly swaps its sign-in ticket for a fresh one. If the shop's connection drops in the half-second *after* the server has issued the new ticket but *before* the phone receives it, the phone still holds the old one and tries again. Supabase forgives that for ten seconds; after that it treats the old ticket as stolen and **signs the person out of every device, with no explanation.** ⚠️ **The pilot shop is offline a lot, so this is not hypothetical** — and if the answer is bad, it changes how `5c` has to be built |
| 5d–5h | The rest of the screens | After 5c |
| **—** | ⚠️⚠️ **ONE THING IS WAITING ON YOU, AND IT BLOCKS NOTHING** | ⚠️⚠️ **Should we give "that code isn't a shop" its own error number?** Right now the database answers a wrong shop code with the SAME number it uses for *"you're signed out"* — so the app has to guess which happened, and it guesses "wrong code", because that screen can only be reached by somebody who IS signed in. **My recommendation: yes, fix it, as its own small piece of work after the next one.** It is the exact same problem you already ruled on for the other code box on 2026-09-18 — *"cheap now, dearer later"* — and it was worth fixing then. ⚠️ **What saying no costs you:** somebody whose sign-in quietly expires while they are on that screen is told to re-check a code that was fine. Reopening the app puts them right. That is the whole of it, which is why nothing is held up waiting for your answer. ⚠️ **It must not be bundled into the next piece of work** — that one is a different database function, and this project has already recorded why two unrelated fixes in one database change are harder to undo. ⚠️ **The app already has a test that goes RED the day this is fixed**, so it cannot be quietly forgotten. |
| **—** | ✅ **Nothing ELSE is waiting on YOU** | ✅✅ **Ruled 2026-09-19 — the approval screen shows the EMAIL as the header and the NAME underneath it.** Your words: *"Show the Email as a Header and the Name as a subtitle of the request."* ⚠️ **It is the opposite way round from the list of people**, where the name is on top and the role underneath — deliberately: on that list you already know everybody, and on an approval you are checking a stranger against an address somebody read out to you, so the address is the thing you are matching and the name is what keeps you from letting in the wrong person. ⚠️ **If that person has no name stored, the row is just their email** and nothing underneath; you are not told why. ✅✅ **Ruled 2026-09-18 — área 9 is CLOSED and nothing is owed there.** Your words: *"we have already set the measures and would stick to see the Números screen in our Pilot and enhancing anything needed later."* ⚠️ **The earlier reading of this was wrong and the plan says so**: *"not about how it looks"* was said during the styling round, about the styling round, and the plan had turned it into a reopened área 9 and an expected migration. **Nothing reopens.** ✅ The undo question was answered the same day: **no undo.** ✅ **The paperwork fix of 2026-09-18 is settled too** — you said to fold it into `5b.8`, and it now rides with that task's first piece. ⚠️ **The block in `docs/PLAN.md` stays even when it is empty**, because it is the only thing that guarantees the next question gets put back in front of you |
| 6–7 | Beyond the pilot | Later |

### ✅ The decision you made on 2026-09-07, and what it bought

*(Kept because the reasoning is the useful part, and because this is the first time an
architecture document was amended to let a check do more rather than less.)*

~~Step 4.6 needs an amendment to ADR-035 before it can start~~ — ✅ **it got it on
2026-09-13, when you ruled on the membership flow; step 4.6's first task is unblocked,
sized and split.** The sentence is struck rather than deleted because what follows it is
the argument you accepted, and that is still worth reading.
**Sizing `5a` on 2026-09-07 found a second one, and this one blocks the very next
task.**

The rule this whole project rests on is *a file is not evidence; a green automated run
is.* Right now **no automated check looks at app code**, because neither of the two
existing ones is pointed at an app folder — there has never been one. So the first app
task has to add a third check. That was already written down as part of the job.

**The problem is what that check should do.** The architecture document, in the table
that fixes the client stack, says client-side tests are *skipped* — the reasoning being
that a test suite over buttons and layouts is a poor use of a small team when the
correctness that matters lives in the database. The build plan, written later, says the
new check should run **typecheck and unit tests**. Neither document mentions the other,
so nobody chose between them.

**It matters because of what the check is being asked to prove.** A *typecheck* only
asks "does this code make sense to the compiler" — it will never notice that the app
charges the wrong amount. A *unit test* can. The one piece of app code where that
distinction is real is the money formatter and the two text-size modes, which is the
task right after this one.

**You ruled: amend it, run both.** The architecture document now says a unit test is
allowed where it pins a **value** — a price, a conversion, a saved record — and is still
refused over how things look and where they sit on screen. What follows is the argument
you accepted, left in place.

**The recommendation was: run both, and read the architecture document's reasoning rather
than its one-word summary.** It rejects *broad* testing over a thin UI — and it is
right to. It does not reject four assertions over a pure function that decides what a
customer sees as the price. Those are the only tests I would write in step 5, they cost
minutes, and without them the new check's green tick means only *"it compiled"* — which
is the exact class of reassurance this project was rebuilt to stop trusting.

⚠️ **Either answer was fine and neither was expensive. What would have been expensive is
guessing**, because the check is filtered to the folders it watches, and a filter added
after the fact was wrong for every commit that merged before it.

#### ⚠️ And the first thing that check caught was not in the app

The new check's first job was to prove the app can reach the money code — the part of
the project that decides what a customer is charged. **On the development machine that
test passed even when the connection was deliberately broken.** The reason is dull and
worth knowing: once the packages have been linked on disk once, they stay linked, and
nothing rechecks the paperwork. The build server starts from nothing every time, so it
caught it immediately.

**The lesson, in one line: a test passing on the developer's laptop is evidence about
the code and not about the plumbing.** This is the fifth distinct way this project has
found a test reporting success while checking nothing, and four of the five were found
by deliberately breaking something to watch it fail.

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

**One of the four is now installed.** At the time of the review none were — checked
directly, no MCP servers configured and no plugins enabled — and `context7` was added
on the strength of it. *(This paragraph still said "none of the four" on 2026-09-07,
two lines above a table saying otherwise; corrected while sizing `5a`.)*

| | Verdict |
|---|---|
| **context7** | ✅ **Installed 2026-09-07, and it was the only one with a clear case.** It feeds Claude current documentation for outside libraries. The app uses Expo, whose interfaces change fast, and Claude's own knowledge has a cutoff date. Confidently-wrong code against a library that changed last month is precisely the failure this handbook warns about, and this is the cheapest guard against it. Connected keyless; a free key at context7.com raises the rate limits if it ever matters |
| **superpowers** | ⏸️ **Identified, and deliberately NOT installed yet — revisit at 5f.** See below |
| **Headroom** | ❓ **Still unidentified.** Cannot be folded in until someone says what it is |
| **ECC** | ❓ **Still unidentified.** Same |

#### Why superpowers is on hold rather than installed

It is real and well-made — an MIT-licensed skills framework by Jesse Vincent and Prime
Radiant, adding test-driven development, systematic debugging, planning, code review
and git-branch workflows that switch themselves on during a session. Installed with
`/plugin install superpowers@claude-plugins-official`.

Three reasons it is not being added today:

1. **This project's method is already stricter and more specific.** Superpowers brings
   ordinary test-driven development. This repository does something harder:
   **falsification** — write the check, then deliberately break the thing it guards and
   confirm something turns red. That practice has found **six separate ways a test file
   could report success while failing**, and on several tasks the damage it found was in
   the *tests* rather than in the code. A general framework does not do that, and
   layering one on top risks diluting the thing that is working.
2. **Two sets of instructions competing is a real cost.** Its skills activate on their
   own. `CLAUDE.md` says *one task per session, taken from the plan, sized and split
   before any code is written* — and that rule is the reason this build survives being
   interrupted. A planning skill that fires by itself is exactly what pulls a session
   off it.
3. **Context is money**, which is the same reason the project map exists. A resident
   skills library costs tokens in every session. That cost could not be measured
   without installing it first.

**Where it would earn its place: task 5f**, the biggest screen in the plan — the first
piece of work large enough that its own shape is a risk. Worth asking again there.

⚠️ If you do install it: **it reports telemetry by default.** Setting
`SUPERPOWERS_DISABLE_TELEMETRY` turns that off. The honest way to judge it is to
install it, run `claude plugin details superpowers@claude-plugins-official` to see what
it costs per session, and `claude plugin disable` it if that is more than it is worth.

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
