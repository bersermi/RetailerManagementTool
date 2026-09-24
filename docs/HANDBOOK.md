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

Before starting, estimate difficulty and write down what the estimate found.
An M or an L is one sitting — build the whole row. Split only an XL, or a row
that is gated, or one whose mistakes would be invisible in half of it.

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
It was cut in three passes, all **unedited and in original order**, and each verified
by rebuilding the source file and confirming it came back **byte-identical**:

| File | What moved | Lines |
|---|---|---|
| `steps-0-to-4.5.md` | Steps 0–4.5, all closed | 6,361 |
| `status-log-through-2026-09-18.md` | Status-log entries for 2026-09-18 and earlier | 4,576 |
| `status-log-2026-09-19.md` | The whole 2026-09-19 working day | 790 |

`docs/PLAN.md` went **14,998 → 3,874 lines**, and `## Position` — the section your
prompt sends every session to *first* — went **5,484 → 509**.

⚠️ **The third cut was called by the size check rather than by anybody noticing.**
Position had climbed back to 1,241 of its 1,400 limit within two days of the first
cut — the same rate that took it to 5,484 in the first place — so the check caught
early what had previously been caught late. **Nothing was summarised or deleted**;
it moved.

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
| **5a-iv** | **Running it on your own phone** | **Split into four on 2026-09-11** — ⚠️ **the last piece is now waiting on a CALENDAR, not on a person: the readings fall on 2026-09-21 and 2026-10-13, and opening either app early restarts the clock.** ✅ **The iPhone was re-deployed on 2026-09-20 and the app was NOT opened** — the free profile had already expired that morning, so the app on your phone would have refused to launch tomorrow. It now runs to **2026-09-27**. ⚠️ **Tomorrow's reading is safe and that was checked rather than assumed**: the phone shows no Wera process (it was never opened) and the file holding your sign-in still carries its 13 September timestamp. ⚠️⚠️ **But a free profile only lasts seven days, and the 2026-10-13 reading is sixteen days out** — so the phone needs re-deploying again before **2026-09-27**, and at least once more after that. It is in the dates block. ⚠️ **The Android one needs none of this**: it has no profile to expire, which is why it was sealed as a second instrument. Both dates are in `docs/PLAN.md`'s dates block, which fails the automated check once one of them passes unanswered. **Meanwhile the takeable work has moved on to step 5b**, which needs nothing from you. The Mac was prepared on 2026-09-12, but signing needs your Apple ID, and five of the six readings are things only a person holding the phone can see. ⚠️ **Which piece is next is `docs/PLAN.md`'s to say, not this file's** — it is named there once, and `docs/checks/plan-handover.sh` is what keeps it named once ⚠️⚠️ **CHANGED BY YOU ON 22 SEPTEMBER, AND IT IS WORTH KNOWING WHAT IT COST: *"override anything related to the 30 day session check, I want to keep working from my device."*** Your iPhone has stopped being a sealed instrument and gone back to being a phone you use — which is what you wanted, and it is the right trade now that there is a screen worth looking at. **The price is the October reading on that phone**: every time you open the app it refreshes your sign-in, so it can no longer tell us how long a session survives untouched. ✅ **The measurement is not lost** — the spare Android emulator was sealed in September for exactly this, on a different Google account, and it still answers the question on 13 October. ✅ **And the eight-day answer is already in hand and unaffected: it stayed signed in.** ⚠️ **What still holds for you is the date, not the reason:** the free Apple signature on that build runs out at **27 September, ~08:22 your time**, and the app simply stops opening. Rebuilding it is a fifteen-minute job on the Mac and it needs doing about every seven days while you are using it this way. |
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
| **5b.9** | **Giving "that code isn't a shop" its own error number** | ✅✅ **Done 22 September**, and nothing was waiting on you for it. **In plain terms: somebody typing a wrong shop code and somebody whose sign-in quietly expired used to get the SAME answer from the database, so the app had to guess which had happened. It guessed "wrong code". It no longer guesses — each now has its own number.** ⚠️ **You will see nothing change**, with one exception: the person whose sign-in lapsed while she was on the join screen is now told her sign-in ended, which is what happened, instead of being told to re-check eight characters that were fine. **That is the whole of the visible difference.** ⚠️⚠️ **It finished by breaking FIVE of our own tests on purpose, which is four more than expected** — each one had been written, on the day the muddle was noticed, to go red the day somebody fixed it. **That is the cheapest proof there is that it actually landed**, and four of the five were found only because we run every database test rather than just the ones for the file we touched. ⚠️ **One decision was taken for you and it is now permanent**: *"that code isn't a shop"* and *"that shop has been switched off"* share the new number rather than getting one each. The database already gave them the same sentence on purpose, and the person's next step is the same either way — re-read the code. **If you want those two told apart, say so and it is a new, small job**; it cannot be undone by editing, only by adding. ~~This was the row the work was at, and nothing was waiting on you for it. Ruled by you on 22 September and queued deliberately behind the two rows below — which are now both done — it is the only job left in this stretch that changes the database.~~ ⚠️ **The struck sentence is reworded rather than quoted, deliberately: `docs/checks/handbook-agreement.sh` COUNTS the phrase that marks the next job, so quoting it here — even inside a strikethrough — makes two rows claim to be next and the guard refuses the file. That is *never spell a check's sentinel in the file it reads*, which this repository has now recorded five times.** **What it fixes:** somebody typing a wrong shop code and somebody whose sign-in quietly expired get the **same answer** from the database today, so the app has to guess which happened. It guesses "wrong code", which is right nearly always and wrong for the person whose sign-in lapsed mid-screen — she is told to re-check eight characters that were fine, and reopening the app puts her right. ⚠️ **That is the whole of it**, which is why nothing was ever held up waiting for your answer. ⚠️ **It is the third time we have done exactly this** and the last one was eleven days ago, for the invite box; the reason is the one you gave then — **cheap now, dearer once something else starts depending on the muddle.** ⚠️⚠️ **It finishes by breaking one of our own tests on purpose**: there is already a check asserting the two are indistinguishable, so the fix turns it red and we rewrite it. That is the cheapest proof there is that it actually landed |
| **5b-iii** | **Someone asks to join, and you approve them** | ✅ **Done 2026-09-20** — **all four pieces have now shipped, and the thing this row describes works end to end**: they type your code, you get a bell, you tap, they are in. ⚠️⚠️ **Split into FOUR on 2026-09-19**, before any of it was written — and it is the biggest thing this project has split so far. ⚠️ **Nothing is waiting on you for any of it**; you ruled on it on 2026-09-19 and that ruling is built into the rows below. **This row is no longer a job somebody picks up** — the four under it are. Why it split: as written it was **two database changes AND two screens**, and measured against the last nine pieces of work that is four sittings, not one. ⚠️ **The file had it down as one.** It had grown twice without anybody starting it — once when you ruled that the approval shows the name, which needs a small database function to fetch it, and once when you ruled a database fix into it — and the row still carried the size it was given before either. The four rows below are the halves, in the order they should be taken |
| **5b-iii-a** | **Two error messages that need a code of their own** | ✅ **Done 2026-09-19** — your ruling of 2026-09-18, *"put the SQLSTATE fix in 5b-iii"*, is built. In plain terms: when the app asks the database to do something and it refuses, the database sends back a short code saying WHY. Two refusals had no code of their own, so the app recognised them by **reading the English sentence in the error** — *this person already asked to join*, and *that code is not valid*. Both now have a code, and the app reads the code. ⚠️ **You will see nothing change**, which is what this row was: no new screen, no new button, and the wording a shopkeeper reads is identical. ⚠️⚠️ **ONE DECISION WAS TAKEN FOR YOU AND IT IS WORTH A MINUTE, because it is now permanent.** *"That code is not valid"* and *"somebody else already used that code"* were **given the SAME new code, not two.** The reason is that the app has always given both the same sentence — whichever way the code is dead, the person holding it has to ask you for another one, so there is nothing different for them to do. **If you want those two told apart on screen, say so and it is a new, small piece of work** — it cannot be undone by editing, only by adding. ⚠️ **A second thing was deliberately left alone**: *"your session ended"* keeps the code it always had, which is the whole point — it used to share a code with *"that code is dead"*, and the join screen had to guess which had happened. It no longer guesses |
| **5b-iii-b** | **Someone types your shop's code and asks to be let in** | ✅ **Done 2026-09-19**, and **one thing is now waiting on you** — see the row at the bottom. It works end to end on their side: they install the app, sign in, type the code you read out, and the app tells them it has been sent and is waiting. ⚠️ **The one box now takes BOTH kinds of code.** Before today, somebody who typed your SHOP code into that box was told *"that's the shop's code, ask them to invite you"* — because the app could not yet act on it. It can now, and that sentence is gone. **Their half of it.** They install the app, sign in, type the code you read out, and the app tells them it has been sent and is waiting. ⚠️ **It is deliberately HALF the loop** — they can ask, and nobody can let them in until the two rows below ship. That is the same shape as the last two database changes, which stored a name before anything displayed it, and it is how work stays reviewable. ⚠️ **It adds no database change** — everything it calls was built and tested back in September. ⚠️ **One detail worth knowing**: asking twice does nothing bad. A second tap on a bad connection, or asking again the next morning, shows them the same pending request rather than an error |
| **5b-iii-c** | **Fetching the name of the person asking** | ✅ **Done 2026-09-19**, and nothing is waiting on you for it. **Your ruling of 2026-09-19 now has its database half.** You asked for the approval to show the **email as the heading and the name underneath**. The email is already there to read; **the name is not** — somebody who has only ASKED to join is not yet a member of the shop, so there is no membership row of theirs carrying a name. This adds one small, narrow database function that fetches it. ⚠️ **It changes nothing you can see**, the same way `5b.8-iii-a` did — the screen that shows it is the row below. ⚠️⚠️ **One consequence of your ruling, recorded so it is not a surprise later: their name reaches you BEFORE you have let them into the shop**, on the strength of them having typed your code. That was the argument against it and you ruled anyway; **it is permanent as of today.** ⚠️ **The obvious cheaper way was refused**: storing the name on the request itself would leave a field that means something for one kind of request and nothing for the other. ⚠️⚠️ **TWO THINGS WERE DECIDED FOR YOU AND THEY ARE BOTH PERMANENT NOW.** **First: only the OWNER can read these names — a Gerente cannot.** A manager cannot let anybody in (that has been owner-only since the approval was built), so showing her a list of strangers' names she can do nothing about seemed the wrong trade. It can be opened up later with a one-line change; taking it back from somebody already using it is the harder direction, which is why it went this way round. **Second: somebody who is not the owner sees an EMPTY list rather than an error message** — say so if you would rather it complained, but the reason is the error code below: it already means two different things and a third would have made it worse |
| **5b-iii-d** | **The bell on the home screen, and letting them in** | ✅ **Done 2026-09-20** — **both halves closed the day after it split**, and nothing is waiting on you. ⚠️⚠️ **Split in two on 2026-09-19, the day it was picked up and before any of it was written** — **this row is no longer a job somebody takes**, the two under it are. ⚠️ **Nothing about it is waiting on you.** Why it split: the file had it down as one sitting, and measured against the last five pieces of work it is about **one and a half times the biggest screen job this project has ever done**. The reason is simple once you see it — the last two screen jobs both **changed a screen that already existed**, and this one has to build a new screen from nothing, put a bell on a second screen, and add a store-chooser with a rule attached. ⚠️ **The row's own note said to re-measure it on the day it was taken, and that note has now been right three times running.** ⚠️ **Neither half adds a database change** — everything both of them call was built and tested already |
| **5b-iii-d-1** | **The bell, and the list of people waiting** | ✅ **Done 2026-09-20** — open the app as yourself and there is a bell on Inicio with a number beside it; tap it and you see who is waiting. ⚠️ **You can see who is asking; you cannot let them in yet** — that is the next piece of work, and the screen says so in a sentence rather than leaving you to wonder where the button is. A notifications bell on Inicio with a count on it, and the list behind it: one entry per person waiting, showing the **email as the heading and their name underneath** — your ruling of 2026-09-19 — plus whether they asked to be a Gerente or an Empleado, and how long they have been waiting. ⚠️ **It is deliberately half the job**, the same way the last three pieces were: nothing on this screen changes anything yet, which is what makes it something you can look at and correct before the part that admits people is built on top of it. ⚠️ **If somebody's name is missing it just shows the address** — some accounts have no name stored, and that is handled quietly rather than explained to you. ⚠️ **Only you see the bell.** A Gerente sees an empty list rather than an error, which is how the name lookup was built yesterday and is not a mistake. ⚠️ **It adds no database change**, and every claim in it can be checked against a real database before you ever open the app |
| **5b-iii-d-2** | **The button that admits them** | ✅ **Done 2026-09-20** — **and the loop is shut: somebody can now ask to join your shop and you can let them in, from your own phone, without anybody touching a database.** Open the bell, tap **Dejar entrar** beside the address, confirm, and they are gone from the list and inside the shop. ⚠️ **It asks you to confirm — two taps, not one — and that was a decision taken for you.** There is no *Quitar* yet, so a mis-tap would put a stranger in your shop with nothing in the app able to remove them; say the word and it goes back to one tap. ⚠️ **In a one-store shop you are never asked which store** — there is only one answer, so the app fills it in. ⚠️⚠️ **One thing worth knowing and it may be worth changing: you cannot admit somebody as a Gerente through this screen.** Everybody who types your shop code arrives as an Empleado, because the app never asks them what they want to be — asking would let somebody claim a role you never offered. To make somebody a Gerente you invite them by name instead, which you could already do. ⚠️ **Tapping approve twice is safe**, as promised below. ⚠️ **It added no database change.** ⚠️ **This row carried the next-work marker until today and the marker is DELETED rather than struck through** — `handbook-agreement.sh` reads the raw line, and a strikethrough is only a rendering. **The other half, and it is the one worth reading twice.** The approve button itself, the **choice of which store an Empleado works in**, and what the screen says when it cannot go through — the request expired, somebody else already dealt with it, or the store picked is not yours. ⚠️⚠️ **Admitting an Empleado makes you choose a store, and it refuses to be left empty.** That is not fussiness: staff can only record things where they have been placed, so an employee admitted with nowhere attached opens the app and **every single thing they try to save is refused with no message at all** — which to the person holding the phone looks exactly like the app being broken. ⚠️⚠️ **This is why it got a sitting of its own.** That rule is the one thing in this whole job that **no automatic test here can check** — this project deliberately does not test what screens look like — so putting it in the same sitting as a bell and a list would have meant the riskiest part shipping with nothing able to catch it. ⚠️ **Tapping approve twice is safe** — the database already treats the second tap as "already done" rather than an error. ⚠️ **It adds no database change** |
| **5c** | **Working with no signal** | ✅✅ **Done 22 September — all four pieces. The app now works with no signal, from the sale you ring up to the banner that says one never went through.** ⚠️⚠️ **Split into FOUR on 2026-09-20, before any of it was written — so this row is no longer a job somebody takes; the four under it are.** It was down as one big job and it is four: it turned out to be fourteen separate promises, and they break in four unrelated ways. **What the whole of it is for:** the shop loses its connection routinely, and today that means a sale simply fails. This is the work that lets the app hold what you did, tell you quietly that there is no signal, and send it when the signal comes back — plus the small banner saying something never went through, a count and a peso figure and never a list. ⚠️ **Nothing about it is waiting on you.** ⚠️⚠️ **One thing you should know before it starts, because you will notice it:** the first three pieces change **nothing you can see on your phone**. They are the part underneath — the app has no sale screen yet, so there is nothing for the queue to hold until `5f`–`5h` are built — and the fourth piece is where it becomes visible. **If you would rather see something on the phone sooner, that is a one-sentence reorder and it is yours to make** |
| **5c-i** | **Somewhere safe to put a sale when there is no signal** | ✅ **Done 2026-09-20 — and nothing was waiting on you for it.** The app now has its own small filing drawer on the phone: a sale can go into it the instant somebody slides, with its own permanent ticket number, and sit there. **Nothing sends it yet** — that is the next row. ⚠️ **You will see nothing change, and that was predicted before it was built rather than discovered after**: there is no sale screen yet to put anything in the drawer. ⚠️ **The ticket number is the part that matters**: it lets the app send the same sale five times without the shop ever being charged twice, which is what makes retrying safe instead of frightening. ⚠️⚠️ **One thing was found while building it that would have been expensive later.** The database already decided, a fortnight ago, exactly what shape a saved-up sale has to be written in — because the tool that puts a lost sale back reads that shape directly. Writing it the obvious other way would have worked perfectly right up until the first time we tried to recover somebody's sale, and fixing it then would have meant a database change rather than an edit. ⚠️ **It added one small library** (for generating the ticket numbers — the phone has no built-in way, which was checked rather than assumed), so the next re-deploy to your iPhone, already booked for 27 September, is the first build that carries it |
| **5c-ii** | **Sending what the drawer is holding, when the signal comes back** | ✅✅ **Done 22 September — both halves closed, and nothing was waiting on you for either.** The app can now empty the drawer AND knows when to. ⚠️ **This row was SPLIT IN TWO on 20 September, before any of it was written, and it is no longer a job somebody picks up** — the two rows below it are. ⚠️ **Nothing about it is waiting on you.** Why it split: it is really two jobs — *what happens when the app empties the drawer* and *what tells it the signal is back* — and the second one **could not be started that day at all**. Choosing how the app detects the signal is a measurement on a real iPhone and a real Android, and your iPhone is currently holding the eight-day sign-in reading due 21 September; opening the app restarts that clock. ⚠️ **So doing the whole row in one sitting meant either guessing that choice from two websites or spending your reading on it.** Splitting cost neither |
| **5c-ii-a** | **Emptying the drawer** | ✅ **Done 20 September — and nothing was waiting on you for it.** The app can now take a saved-up sale out of the drawer and send it, oldest first, one at a time, never two at once, and put it back if it does not go through. ⚠️ **You will still see nothing change**: there is no sale screen yet to put anything in the drawer. ⚠️⚠️ **The thing worth knowing is the one decision that decides which DAY a sale counts on in your reports**: a sale is marked *“recorded with no signal”* when it did not get through on the first try — not when the phone thought it had no signal. A phone can be wrong about having signal; it cannot be wrong about whether the sale got through. ⚠️⚠️ **And one thing was found while building it that would have been expensive and invisible.** If the app sends a saved-up sale without also sending the time it happened, the database quietly stamps it with the time it ARRIVED — no error, nothing to notice — so a 9am sale emptied at 2pm would count on the wrong part of the day. The drawer already knows the real time, so it is always sent, and there is now a check that fails the day that stops being true. ⚠️ **One decision that costs something, and it is deliberate:** if one sale will not go through, the app stops and does not try the ones behind it — that keeps them in the order they happened, which the books depend on. The cost is that one permanently stuck sale holds up the rest, and **the very next row is what fixes that** |
| **5c-ii-b** | **Noticing that the signal came back** | ✅✅ **Done 22 September — both halves closed on the same day, and nothing was waiting on you for either.** ⚠️ **This row was SPLIT IN TWO on 22 September, before any of it was written, and it is no longer a job somebody takes — the two under it are.** It was one job on paper and two in practice: **finding out** how the phone answers *"am I online?"*, and then **writing the code** that acts on the answer. ⚠️ **The reason to separate them is not tidiness.** Finding out means installing a piece of the phone's own machinery and rebuilding the app from scratch on an iPhone and an Android — the better part of an afternoon before a single number comes back — and the code cannot honestly be written until it does, because **the answer decides what the code is holding**: just *"online or not"*, or *"online, and it is mobile data"*. Doing both in one go risks losing the measurement and the code together |
| **5c-ii-b-1** | **Asking the phone how it knows** | ✅✅ **Done 22 September — and nothing was waiting on you for it.** There were two ways to ask a phone whether it has a connection, and both were tried, on both kinds of phone, with the connection actually pulled rather than read about. ⚠️⚠️ **It was expected to be a close call and it was not.** On the iPhone, when the connection came back, **one of the two libraries never noticed** — it was still insisting the phone was offline nearly a minute later, while the other had it right within five seconds. The one that got it wrong is gone from the app; the one that got it right stays. **Had we picked by reading documentation, there was a real chance of picking the one that leaves a shop's saved-up sales sitting there.** ⚠️ **One thing it found that you should know about**, because it affects what the next job builds: even the library that won **missed the reconnection once out of twice** when asked to announce it — but answered correctly every time it was *asked directly*. So the app will ask as well as listen, rather than trusting an announcement that may not come. ✅ **And the wifi-versus-mobile-data question is settled: it does not matter for now**, so your phone was not needed after all |
| **5c-ii-b-2** | **Sending the drawer's contents the moment the signal returns** | ✅✅ **Done 22 September — and nothing was waiting on you for it.** **A sale rung up with no signal now leaves the phone by itself.** Until today the app could fill the drawer and could empty it, and nothing ever told it to — the machinery that empties it had been sitting there since Saturday with no caller. ⚠️ **You still see nothing change**, for the same reason as the last four rows: there is no sale screen yet to put anything in the drawer. ⚠️⚠️ **The one number worth knowing is a minute and fifty seconds.** When the signal comes back the app tries **immediately**, then again after 5 seconds, 20 seconds, 50 seconds and **110 seconds**. That last one is the point: `5c.5` measured that after a dropped connection the app's sign-in machinery can keep answering *"no"* from memory, **without even trying the network**, for up to a minute and a half. So an app that gave up at 50 seconds would leave a shop's saved-up sales sitting on a connection that works perfectly. The timing is built to step over that, and the test fails if somebody shortens it. ⚠️ **The flicker is ignored, as that row promised**: the phone must claim to be offline for a full **two seconds** before the app believes it — about six times the longest flicker measured — and coming back is believed instantly, because trying too early is free and trying too late is a drawer nobody empties. ⚠️⚠️ **And it asks as well as listens, which is yesterday's finding paying for itself.** While the app thinks it is offline it re-asks the phone every five seconds; while it thinks it is online it costs nothing at all. That asymmetry is not caution — the announcement was reliable when the signal DROPPED on both phones, and unreliable when it came BACK, which is the only moment the asking is needed. ⚠️ **Your ruling of 22 September is written in**: it writes the architecture document's connectivity line, with the limits of the test on it. One place in the app knows whether there is a connection, and everything else asks *it* rather than asking the phone separately — otherwise the little *"no internet"* notice and the sending machinery can end up disagreeing about the same moment. Then: send what is saved up when the signal returns, send it when the app is brought back to the foreground, and **do not retry faster than is useful** — `5c.5` measured that a dropped connection can cost the app up to a minute and a half before it can genuinely try again, so that is the number the timing is built around instead of a guess. ⚠️ **It also has to ignore a flicker**: walking from the counter to the door swaps wifi for mobile data, and for a fraction of a second both libraries claim the phone is offline. **Un-ignored, that flashes a "no internet" notice at a shopkeeper who never lost anything** — and it is. ⚠️ **Seven things were decided for you here and every one is a one-line change to undo** — no database change, no new table, nothing that gets harder to reverse later. The two worth naming: **the app only tries to send while somebody is signed in** (otherwise it spends the whole retry sequence being told to sign in), and **the drawer is emptied on the way back into the app too**, not only when the signal returns — a phone that sat in a pocket all afternoon with perfect signal never "reconnects", so nothing else would have triggered it |
| **5c-iii** | **What to do with a sale that will never go through** | ✅ **Done 2026-09-20 — and nothing was waiting on you for it.** Some failures never fix themselves — the goods left the shelf, the money is in the drawer, and the database will refuse that sale forever. ⚠️ **This is the piece that tells the two apart** and, for a sale or a write-off, takes the stock off the shelf anyway so the count on the screen matches the shop. ⚠️⚠️ **It is the one piece that can make the books differ from what was typed, and that is on purpose and was your call**: the stock stays right, the sale does not become a sale, and nobody at the counter is told — it lands on our side, for us to put back by hand. A delivery is left alone, because the boxes are still there and somebody will enter them properly. ⚠️⚠️ **Two things were MEASURED against the real database rather than reasoned about, and both would have been got wrong by thinking carefully.** The first: *"not enough stock"* looks like the most permanent refusal there is, and it **fixes itself on the very next try** — the app marks a second attempt as *"sent with no signal"*, and the stock check is deliberately skipped on those. Treating it as permanent would have taken the stock off the shelf for a sale that was about to be recorded in full, and the money would have vanished from your reports. The second: the refusal that means *"you may no longer sell at that store"* is the **same code** the app shows as *"your session ended"* everywhere else — and if the app had confused them, then the first time a phone's sign-in went stale in a shop with no signal, **every saved-up sale on it would have been written off at once**. They turn out to be different codes on the wire, and there is now a check that fails the day that stops being true. ⚠️ **The rule underneath everything here is deliberately cautious: if the app does not recognise a refusal, it keeps trying.** A sale kept trying is still on the phone, whole; a sale written off by mistake is not |
| **5c-iv** | **The three things you actually see** | ✅✅ **Done 22 September — both halves.** ⚠️ **This row was SPLIT IN TWO on 22 September, before any of it was written, and it is no longer a job somebody takes — the two under it are.** ⚠️ **Nothing about it is waiting on you.** Why it split: the three things are really **two jobs that share nothing but a corner of the screen**. Two of them draw **whether there is a signal** — that is one thing the app already knows, and drawing it is mostly a matter of taste and restraint. The third draws **money that never got recorded**, which means adding up pesos on the phone, getting the same answer the database would, and showing it only to you and your managers. ⚠️⚠️ **And the real reason: no automatic check in this project can look at either of them** — we deliberately do not test what screens look like — **so both come to your phone, and two things you can look at and correct separately beat one you have to take or leave.** ⚠️ **It is the last of the four, and the only one you can see.** ~~Now buildable, and deliberately NOT next~~ — the two things it draws that depend on the app knowing whether it has a signal got that yesterday, and the third, the count of anything that never went through, got its rows on 20 September. The quiet *Sin conexión a internet* notice — small, easy to dismiss, never in the way; the message that fades by itself when the signal returns, saying your last operations are saved and never saying how many; and the small banner for anything that never went through, showing a count and a peso figure. ⚠️ **This is the only piece of the four you can see**, and ⚠️⚠️ **it is also the only one no automatic check in the project can look at** — we deliberately do not test what screens look like — so this one comes to your phone before it is called done. ⚠️ **One thing decided for you, easily changed:** the banner is for you and your managers, not for whoever is on the till. It is money that did not get recorded, and that is already manager-level everywhere else in the app |
| **5c-iv-a** | **The little "no internet" sign, and the message that says it went through** | ✅✅ **Done 22 September — and nothing was waiting on you for it.** ⚠️⚠️ **This is the first thing in the whole project you can actually SEE about being offline**, and it needs your eyes: **no automatic check here can tell whether it is small enough, quiet enough, or in the wrong corner.** Everything below is what we could prove; how it looks is for your phone. **Two small things, and the whole job is restraint.** A **small, quiet mark** somewhere out of the way saying *Sin conexión a internet* — it never blocks anything, never interrupts, and can be brushed away with a tap; it comes back on the next screen, which is deliberate, because a shop that dismissed it once should still be told tomorrow. Then, when the signal returns, **one message that fades by itself**: *Tus últimas operaciones ya se guardaron.* ⚠️ **It does not say how many**, and that is on purpose — a number is the app talking about its own plumbing to somebody who just wants to know it is fine. ⚠️ **One place in the app knows whether there is a signal and this asks that place**, never the phone directly — otherwise this mark and the sending machinery can end up disagreeing about the same moment. ⚠️⚠️ **And the fading is done the one way that is cheap on a slow phone**: two of your four pilot phones are low-end Androids, and there are exactly two kinds of animation those handle well. ⚠️ **No check here can look at any of it**, so it comes to your phone. ⚠️ **It adds nothing to the database** ⚠️⚠️ **The one rule worth your attention, because getting it wrong would have been invisible: brushing the sign away lasts for ONE SCREEN, not for the day.** A shop that dismissed it at 9am would otherwise still be dismissed at 4pm, and the only thing the sign exists for is a shopkeeper who does not know. ⚠️ **And the "all saved" message never appears when you simply open the app** — only when you were offline and the signal actually came back. Otherwise it would reassure you about something you never saw go wrong, every single time you opened it. ⚠️ **Five small things were decided for you**, all one-line changes to undo; the one you might disagree with is that the sign is **grey and quiet, not orange**. Your shop is offline a good part of the day, and a warning colour on something that is true half the time stops being a warning — it just teaches people to ignore orange. The words do the work instead |
| **5c-iv-b** | **Money that never got recorded, counted on the phone** | ✅✅ **Done 22 September — and with it, all of the offline work.** ⚠️⚠️ **Unlike the one above it, you CANNOT look at this one yet, and that is worth knowing before you go looking.** The banner only appears when something has actually failed to send — and nothing in the app can put anything in the queue until the **selling screen** is built, so on your phone today the queue is always empty and the banner never shows. ⚠️ **You ruled on 22 September that work like this should wait until there is something to look at**; this one was already built when you said so, and it is finished, checked and harmless, so it stays. **The three things only your eyes can settle — where it sits, how big it is, and the words on it — now ride along with the selling screen**, where you will be able to see it on a real phone. ⚠️ **It is the last piece of the offline work** and it was the one you called *"not a priority at this point"*, so it came last by your own ordering. **What it is:** a small banner showing **how many** operations never went through and **how many pesos** they came to. ⚠️⚠️ **The one thing worth your attention, because getting it wrong would have been invisible: when we cannot work out what an operation was worth, we show the COUNT and leave the pesos off — we never show a smaller number.** A total that quietly skips what it could not read looks exactly like a correct one, and you would have no way to tell. **How many is always right; how much is either right or absent.** ⚠️ **Tapping it puts it away until the number CHANGES** — a fourth failure says so again. It does not come back on every screen the way the "no internet" sign does, and that is deliberate: this one does not go away on its own, so re-offering it constantly would be nagging you about something only we can fix. ⚠️ **Six small things were decided for you**, each a one-line change to undo; the one you might disagree with is that a purchase is counted at the price on the supplier's invoice **before tax**, and a sale at what the customer actually paid — each document at the figure printed on it. ⚠️⚠️ **Never a list, and never an error message** — a list of failures is our problem handed to you, and that was your ruling on 14 September. ⚠️ **It asks the database nothing**: the phone that failed already holds everything needed, which is what lets it work on a phone with no signal — the only phone that would ever have anything to show. ⚠️⚠️ **The pesos are added up on the phone and must agree with what the database would say**, which is the part with real arithmetic in it and the reason this half is separate. ⚠️ **Only you and your managers see it**, decided when `5c` was sized rather than asked: it is money that did not get recorded, and that is manager-level everywhere else in the app. ⚠️ **Putting those operations back is still ours to do by hand**, one at a time — there is no button for it and there does not need to be. ⚠️ **It adds nothing to the database** |
| **5c.5** | **Does staying signed in survive a dropped connection at the worst moment?** | ✅ **Done 2026-09-20 — and the answer is YES.** **You reordered it ahead of `5c` and it was worth doing.** ⚠️⚠️ **The fear we had written down turns out to be wrong, and wrong for a reason nobody guessed.** We thought: the ten-second grace period is what saves you, so an outage longer than ten seconds signs you out. **It is not the grace period at all.** Supabase only rejects an old ticket once the *replacement has actually been used* — and if the phone never received the replacement, it never uses it. So the old ticket keeps working, and when the signal comes back the phone is handed **the very ticket it missed**. We tested this for real: a dropped connection, the reply destroyed after the server had already committed, and the phone still signed in on the other side. ⚠️ **One thing we did NOT know before, and it costs something:** after a failed attempt the app waits **up to 90 seconds** before trying again — 30 seconds of quick retries, then a 60-second cooling-off. **Nobody gets signed out because of it**, but it means the app does not spring back the instant the signal does, and it is the number `5c` now has to be built around. ⚠️ **This was measured against the local copy of Supabase, not the live one** — the live project's settings are still something you read off the dashboard rather than something we tested, and that distinction is kept on purpose | ⚠️ **It is a MEASUREMENT, not a build** — one sitting, and what it produces is an answer rather than a screen. **The question:** every hour the app quietly swaps its sign-in ticket for a fresh one. If the shop's connection drops in the half-second *after* the server has issued the new ticket but *before* the phone receives it, the phone still holds the old one and tries again. Supabase forgives that for ten seconds; after that it treats the old ticket as stolen and **signs the person out of every device, with no explanation.** ⚠️ **The pilot shop is offline a lot, so this is not hypothetical** — and if the answer is bad, it changes how `5c` has to be built |
| **5d** | **The Productos screen — seeing what you sell** | ✅✅ **Done 22 September — all four pieces. You can see everything you sell, open a product and see its family, and the home screen is finally the screen it was supposed to be.** ⚠️⚠️ **SPLIT INTO FOUR on 22 September, before any of it was written — it is no longer a job somebody takes, the four under it are.** ⚠️ **Nothing was waiting on you when it was split; one thing is now, and it touches only the LAST of the four.** **Why it split, and the size was the smaller reason:** the description in the plan was written before you changed your mind, and it had gone quietly wrong in two ways. **It promised a grid of product-family tiles** — and on 15 September you replaced that with a flat list of every product, which is what is now being built; a session taking the job at face value would have built the screen you threw away. **And it never mentioned the home screen at all**, even though two other places in the project say this job is where the home screen finally gets built properly. ⚠️⚠️ **The other reason is the one you already know: no automatic check in this project can look at a screen.** Three of these four end on your phone and nothing here will ever tell us they are wrong — so the first piece is deliberately the one with a right answer in it, and the three you have to LOOK at are separate, small, and correctable one at a time. **Reading only — nothing on any of it changes anything yet** |
| **5d-i** | **Teaching the app to read your catalog** | ✅✅ **Done 22 September — and nothing was waiting on you for it.** ⚠️⚠️ **There is nothing to look at, and that is what this piece was for.** The app had never once read your products, your prices or the units you sell in; now it can, and it still draws nothing — the screen is the next piece. ⚠️ **The one thing worth your attention, because getting it wrong would have been invisible:** prices come back from the database as TEXT rather than as numbers. A price like *3.5 centavos a gram* cannot be held exactly by a computer's ordinary number — it becomes *35.000000000000004 pesos a kilo* — so the app refuses to work from one at all. Had we taken the ordinary route, every single price in Productos would have shown a dash, and every test we have would still have passed. ⚠️ **A second thing decided for you, and it is one line to undo:** two of your own instructions disagreed. In the interview you wrote prices as *$35.00 / kg*, and you also said centavos should be hidden when they are zero. **We followed the second**, so a kilo of chicken reads **$35 / kg** and a price with centavos reads **$35.50 / kg**. ⚠️ **And searching now ignores accents**: typing *platano* finds *Plátano*, which the database itself asked us to do at search time. ⚠️ **It adds nothing to the database** ⚠️⚠️ **There is nothing to look at when it is done, and that is the point.** The app has never once read your products, your prices or the units you sell in — four tables in the database that no line of app code has ever touched. This teaches it to, and it stops there: no screen, no buttons, nothing on a phone. **What it actually decides**, and each of these is a thing a machine can check: **which price is today's** — prices are stored with the dates they apply between, so *the* price is a choice and not a column; **the peso figure itself**, worked out from how a product is priced (per kilo, per quarter, per piece) rather than assumed; **that a price is never shown without its unit** — *$35.00 / kg*, never a bare *$35.00*, which is a mistake the old Power Apps screen actually made; **that a product with no price shows a dash, never $0.00**, because those are different facts and only one of them is safe to sell at; and **the two letters** an un-photographed product shows instead of a picture. ⚠️ **It ends with a check that talks to a real database over the network**, which is the only way to catch a column name that stopped being true — the ordinary tests cannot see that and never could |
| **5d-ii** | **The Productos list — everything you sell, in one scrolling list** | ✅✅ **Done 22 September — and this is the first one that needs your EYES rather than your answer.** ⚠️⚠️ **Nothing we have can tell us whether it looks right**: we deliberately do not test what screens look like, so on this one there is no check anywhere that would go red if the list were unreadable across a counter. **What to look at when you open it:** can you read a row at arm's length; is the search box where your thumb lands; do the two letters on a product without a photo look like a product rather than a badge; and in *Letra grande*, is there still room for the price beside a long name. ⚠️ **One thing decided for you and worth a second look later:** a product with **no price shows a dash, in grey — not in amber.** Amber is reserved for a missing price that is BLOCKING a sale, where the fix is one tap away; here nothing can be fixed yet, and a hundred amber rows nobody can act on is an alarm that teaches people to ignore amber. **When the edit screen exists, tell me if you want them amber.** ⚠️ **Tapping a row does nothing yet, on purpose** — the next piece opens the family behind it, and a button that looks alive and silently refuses is worse than one that is plainly not built. ⚠️ **It changes nothing in the database.** Every product variant, one line each, with its price beside it and a search box on top — **the flat list you asked for on 15 September**, not the grid of family tiles the plan used to promise. Products without a photo show their initials and look finished, because they are: **getting the picture onto them is our chore, not yours.** ⚠️ **The way in is a row on the home screen, not a fifth tab** — five tabs with words under them do not fit across a phone, which you settled in September. ⚠️ **Only your eyes can judge this one** |
| **5d-iii** | **Opening a product — the family behind it** | ✅✅ **Done 22 September — and this one needs your EYES, not your answer.** Tap a product and its family opens with that product already selected, **and no label explaining that it is** — your ruling, and the one place in the whole app where the family-and-variants structure is visible at all. Its brothers are listed under it with their prices, and the three buttons — *Agregar Variante*, *Costos*, *Editar* — **are there and do nothing yet**, on purpose: every one of them writes, and writing is the next job. **A button that looks alive and silently refuses is worse than one that is plainly not built.** ⚠️ **Only your eyes can judge this one** ⚠️⚠️ **What to look at when you open it, because nothing we have can tell us:** the product you tapped is marked with a **green line down its left edge** and a heavier name — **no word, no tick**, which is exactly what you ruled — so the question is whether that reads as *this is the one I tapped* or as a warning. And whether the three buttons look **deliberately not-built** rather than broken: they are grey, they do not press, and one line underneath says so in words. ⚠️ **Two things decided for you, both a line to undo:** tapping one of the *other* sizes in the family does **nothing** — there is nothing for a selection to do until the edit screen exists — and a product opened by a broken link shows the family with **nothing marked** rather than guessing at the first row. ⚠️ **It changes nothing in the database.** ✅✅ **YOU LOOKED, ON 22 SEPTEMBER, AND ALL THREE ANSWERS WERE YES:** the green line reads as the item selected, the three grey buttons read as not-built, and a six-variant family still fits in *Letra grande*. **That is the first piece of work in this project whose only judge was your eyes and which you have actually judged** — the three choices behind it are now yours rather than mine. ⚠️ **One question is still open and deliberately parked:** whether a product with no price should be grey or amber. Your *Chayote* has no price on purpose, so it will be there to look at when the edit screen exists. |
| **5d-iv** | **The home screen, finally built properly** | ✅✅ **Done 22 September — both halves.** ⚠️ **SPLIT IN TWO on 22 September, before a line of it was written — the two halves are below.** It turned out to be two different jobs wearing one name. The top of the home screen shows **what the shop took today**, and *asking the database that question* is something this app has never once done — it knows who works here and what you sell, and it has never asked what you SOLD. That half has a right answer a machine can check. **Laying the screen out** — what sits above what, how big the cards are, where the bell goes — has no right answer any machine here can check, and only your eyes can judge it. Keeping them together meant the half nothing can see riding in on the back of the half only you can. ⚠️ **Nothing is waiting on you** — you answered the *expiring within 48 hours* question on 22 September (*"let's drop it for the pilot"*), so that panel is **not being built**: it had nothing to put in it. |
| **5d-iv-a** | **Asking the shop what it took today** | ✅✅ **Done 22 September.** No screen at all — this was the question underneath the screen: *how much has this shop taken today, and how many sales stand behind it.* ⚠️ **Three things were decided for you here, and all three are cheap to change because nothing is stored — it is arithmetic on the phone:** **(1)** the figure is the money **including IVA**, which is what matches the cash in the till — your own ruling from 14 September. **(2)** a sale you **undo does not count**: the database keeps both the sale and the undoing, so counting them plainly would tell you *2 ventas* on a morning you rang one up and cancelled it. **(3)** *today* runs from **midnight where the phone is**, not midnight in London — and not, for now, midnight where the SHOP is. Those last two are the same thing for every shop you have, because the phone is in the shop; they would differ for a store in Hermosillo run from Guadalajara, and fixing that needs a measurement on a real iPhone first, which is written down rather than guessed at. ⚠️ **It changes nothing in the database.** ⚠️ **And you will see $0.00 when it is drawn** — nothing in this app can record a sale until Vender is built, so the shop has no sales to count yet. That is honest, not broken. ⚠️⚠️ **One thing turned up that is worth knowing, because it cost this project a day in September:** the neat way to do *midnight where the shop is* needs a piece of the phone's date machinery that **crashed this app on your iPhone on 13 September** and has never been tested since. So we did not use it. Midnight where the PHONE is, is the same thing for every shop you have — and the day it is not, somebody measures on a real phone first. ⚠️ **And one more, before Vender makes it visible:** a sale rung up with no signal sits on the phone until the signal comes back, so the home screen can honestly show **less** than you remember taking. That is a question for the day the till works. |
| **5d-iv-b** | **Laying the home screen out** | ✅✅ **Done 22 September — and this one needs your EYES, not your answer.** Today's takings and today's count at the top — **above anything you can tap**, which is the one rule the architecture kept when it let the home screen become a way into everything else — then Vender, Comprar and Desperdicio as big cards, then the rows into Productos and Proveedores, and the settings and the bell put where they belong instead of floating in the middle of a placeholder. ⚠️ **The home screen is also the one screen that carries the "something did not save" notice**, which you settled on 22 September, so it needs room at the top for it. ⚠️ **It also deletes the fake number you can see right now:** the $11.60 on your home screen today is a test figure, not your shop. ⚠️ **Only your eyes can judge this one** — and **one question about it cannot be asked yet and is deliberately being held back**: until Vender exists, the top of the screen will read **$0.00 and 0 ventas** on every phone, so *does a zero there read as a quiet morning or as a broken app?* is a question for the day the till works, not for today. ⚠️⚠️ **WHAT TO LOOK AT WHEN YOU OPEN IT, because nothing we have can tell us:** is the money at the top readable across the counter; do three big cards and two rows still fit above the tab bar in *Letra grande*, or do you have to scroll; and — the one worth the most — **there is a deliberate gap at the very top of the screen, and it is not a mistake.** It is being held empty for the *something did not save* notice, which appears on this screen and nowhere else. **Nothing will ever put a notice there until the till exists**, so until then you are looking at an empty space and the question is whether it reads as deliberate or as a hole. ⚠️ **Three things decided for you, each one line to undo:** **Proveedores is on the screen and is greyed out** — the screen behind it is not built, and a door that looks alive and opens onto nothing is worse than one that is plainly not built, which is the same call you agreed with on the family screen. **The gap at the top is always there** rather than appearing when a notice does, because a number that jumps down while you are reading it is worse than a gap you get used to. And **if the app cannot read one of your sales, it shows no total at all rather than a smaller one** — a wrong number you would carry to your till is the one thing worse than no number. |
| **5e** | **Adding and editing products** | ✅✅ **Done 23 September — all three pieces. You can make a product on your phone and you can change one.** ⚠️ **SPLIT IN THREE on 22 September, before a line of it was written — the three pieces are below.** It is the first job in the whole app that CHANGES something rather than showing it; up to now everything built reads. Measuring it first was its own instruction, and it turned out to be three jobs wearing one name: **the writing itself** (no screen), **the form for a new product**, and **the form for one that already exists**. ⚠️ **Two things were found that were not written down anywhere.** The `Costos` button we drew dead on the family screen yesterday belongs to this job — and **nobody had ever said what it should show** — you answered that the same day: it stays dead until Comprar, which is the job that could give it something to show. And *Editar* turned out to mean the tax rate, the pack size and retiring a product, none of which this job had listed. ⚠️ **The thing worth knowing before any of it starts:** adding or changing a product is a **manager's** job in the database, so a cashier is refused — and refused SILENTLY. Part of this work is making sure she is never shown a button she cannot use. |
| **5e-i** | **Teaching the app to WRITE a product** | ✅✅ **Done 22 September.** Like the catalog read before it, **there is nothing to look at.** It is the part underneath both forms: turning *a name, a family, one unit, one price* into the three rows the database actually wants, and turning the two refusals a shopkeeper can hit into sentences instead of error codes. ⚠️⚠️ **It is also the ONLY piece of this job that any check we own can look at — and the thing it checks is the manager fence.** Nothing we run has ever read a security rule; this ends with a test that signs in as a real cashier against a real database and proves she is refused. If that rule is ever loosened by accident, this is the only thing in the repository that goes red. ⚠️ **One thing decided for you, and it is free to reverse:** *Agregar* will need a connection and will say so, rather than saving your product for later. A product created with no signal carries an identity the server has never seen, and the first sale of it would fail too — one refused form beats a day of sales quietly failing behind it. ✅✅ **AND THE FENCE NOW HAS ITS TEST, WHICH IS THE PART WORTH KNOWING.** A real cashier is signed in against a real database and refused on all three tables — and the test was then DELIBERATELY BROKEN five ways to prove it still notices: each of the two security rules was loosened in turn, and both times it went red and said so. It is the only thing in the repository that can. ⚠️ **THREE MORE THINGS WERE DECIDED FOR YOU, and all three are cheap to change — nothing is stored and no migration was written:** **(1)** a price you set when you create a product is **the price for the whole shop**, not for one store. Both your shops have one store each, so today these are the same thing; the day a shop has two, we ask you. ~~**(2)** the price is required~~ — ⚠️⚠️ **YOU OVERRULED THIS THE SAME DAY, AND IT IS BUILT: a product can now be added with no price at all, and we tell him he is doing it.** The words are yours, tightened: *"Este producto no tendrá precio. Cuando lo compres o lo vendas tendrás que ponerle uno."* It says what it will cost him at the counter rather than repeating what he just typed — because you already ruled that a sale cannot be rung up without a price, so Vender and Comprar will both stop and ask. ⚠️ **A product with no price is not a product priced at zero**, and the app keeps them apart: zero is a price you set and sell at, no price is a question nobody has answered, and they look different on the shelf. ✅✅ **AND YOU SETTLED WHERE IT APPEARS THE SAME AFTERNOON: a line under the empty price box, with NO EXTRA TAP** — not a box he has to dismiss. ⚠️ **It also settled something nobody had asked about: WHEN it appears.** The price box starts empty, so a message tied only to emptiness would be on screen before he types a single letter — a warning about a product that does not exist yet, every single time, which is how a person learns to ignore it. It appears the moment the rest of the product is ready to save and the price is the only thing missing, which is when the sentence becomes true. **(3)** the price starts **today**, on the phone's own day, so a product made this morning is priced this morning rather than tomorrow. ⚠️ **Two things the database told us that we had wrong.** A cashier refused would have been shown *"your session ended, sign in again"* — a loop she could never get out of. And a product with a blank name would have told her **to name her shop**. Both are fixed, and both were found by asking the real database rather than by remembering. |
| **5e-ii** | **Agregar — the four-field form** | ✅✅ **Done 22 September — the app can now make a product, and you can do it from your phone.** A name, a family, one unit, one price, and nothing else: the shortest form that makes a product you can sell today. ⚠️ **It matters more than it sounds**, because you are seeding the catalog deliberately short so the shopkeeper makes some himself — so this form is where the first product HE creates gets made, with nobody watching. The app proposes a family from what he types and he can overrule it, or make a new family on the spot. ⚠️ **Two of the three ways in get built here** — from the Productos list, and from inside a family you already have open. The third is a shortcut from the selling and buying screens, and those screens do not exist yet, so it goes with them. ⚠️ **This one needs your EYES, not your answer** — nothing we own can say whether a form reads well at a counter. ✅✅ **THE TWO PRICE QUESTIONS ARE BOTH ANSWERED AND THIS JOB CARRIES NEITHER.** A product can be added with no price, and the message is a **line under the empty price box with no extra tap** — both your rulings of 22 September. The sentence, the saving and the moment the line appears are all built; **this job draws it and decides nothing**. ✅✅ **YOU LOOKED AT IT ON 23 SEPTEMBER AND CHANGED FOUR THINGS, AND ONE SENTENCE COVERS ALL FOUR: a proposal must not look like a decision already made.** You said it about the family box and the price box; the **Agregar** button was the same mistake one screen over. All four are built.

⚠️⚠️ **(1) THE `Agregar` BUTTON IS GONE, AND THE SEARCH DOES ITS JOB.** You type a name into Productos; while anything matches you are looking at what the shop already sells; and only when nothing matches does what you typed appear as a row with **Crear Nuevo Producto** under it, opening the form with the name already filled in. **The point is fewer near-duplicates, not fewer buttons** — a button at the top can be tapped without ever reading the list. ⚠️ It is also closer to what you told us in the interview than the button was: *"from Productos, type the name"* is now literally the gesture.

⚠️⚠️ **(2) THE FAMILY MIRRORS THE PRODUCT INSTEAD OF GUESSING.** It used to search your families and quietly attach the new product to one of them. Now it shows the product's own name, in grey, as a hint — and if you want an existing family you go looking for it, in a search that puts the shorter, exact match at the top. Your three cases are the three the form supports, in your order: take what it mirrored, type a new family, or find the one you already have.

⚠️⚠️ **(3) THE UNIT AND THE FAMILY KEEP EACH OTHER HONEST.** Pick an existing family and its unit is chosen for you. Pick a unit that family cannot have and **the family lets go**, back to mirroring the product, with your sentence underneath: *una familia de productos debe tener la misma unidad de medida* — which then fades. ⚠️ **One judgement call is inside this and it is the one thing here you may want to overrule:** your banner says *the same unit*, and what you told us in the interview was that a family's products *"all share kg/gr"* — which is two units but one **kind** of measurement. We built the second reading, so **250g inside a family sold by the kilo is fine** and only litres or pieces let the family go. The strict reading would have broken a chicken shop pricing menudencias per 100g.

⚠️⚠️ **(4) THE CONFIRMATION IS NOW THE CATALOG ITSELF.** Save, and you land back on Productos with the new product **scrolled into view in its alphabetical place, blinking three times**. No line, no badge, no colour — you asked for nothing else, and the two sentences the form used to show after a save are gone.

⚠️ **AND YOUR REWRITE OF THE PRICE LINE FIXED A FACT, NOT JUST THE WORDS.** The old one said *"cuando lo compres o lo vendas"*. **Buying never needed this price** — we checked the database rather than remembering: a purchase carries its own cost, typed at the time. Only selling stops and asks. Your sentence names only selling, so it is now true as well as shorter.

✅✅ **AND YOU SENT A SECOND ROUND OF NOTES THE SAME DAY. ALL FIVE ARE BUILT, AND ONE OF THEM WAS A REAL BUG.**

⚠️⚠️ **THE BANNER GENUINELY WAS NOT SHOWING, AND YOU WERE RIGHT ABOUT WHY.** It was being started a fraction too early — before the line existed on screen — and the phone silently dropped it. No error, no warning, nothing: a whole class of animation bug that nothing we run can see, because none of our tests look at a screen. **Fixed, and your instruction fixed the design too:** it now flashes for a second on the form and then **the same sentence waits for you on the catalog and does not fade**, with a *Entendido* to clear it. ⚠️ Worth saying plainly: we had argued in writing that the banner should stay up for over two seconds so it could be read. **That argument was right and the design was wrong** — the form is about to vanish, so no length would have helped. Moving it was the better answer.

⚠️ **The family list now closes when the keyboard does** — either you picked one or you are keeping what it mirrored, and both mean the question is done.

⚠️ **`Nombre` now says *Escribe el nombre del producto*.** The old *Pechuga sin hueso* taught something real, and that was exactly its problem: a real product name sitting in the box looks like a product name somebody typed.

⚠️⚠️ **EVERY KEYBOARD NOW HAS A WAY OFF IT.** The return key says **Listo** and closes it, on the product search, the name, and the family search. ⚠️ The search key used to say *Buscar*, which promised something that had already happened — that list filters as you type. ⚠️⚠️ **The price box is the exception and it is worth knowing why:** the number pad draws no return key at all, on either phone, and we cannot drop it because your prices have a decimal point in them. **On the iPhone we added a small bar above the pad with *Listo* on it; on Android the phone's own keyboard has a dismiss control.** So both work, by two different routes — if one ever feels wrong and the other fine, that is why. **And the keyboard is dismissed when you land back on the catalog**, so nothing covers the product that blinks.

✅ **EMPTY CATALOG: CLOSED.** You said a default catalog will always be there, so there is nothing to fix. **That is a fact about the pilot we did not have** — it also means the shop is never handed a blank screen with no way in.

⚠️⚠️ **AND THE SELLING QUANTITY IS WRITTEN DOWN FOR THE SCREEN THAT WILL BUILD IT, NOT BUILT HERE — which is what you asked for.** Your example: a product at **$45 per 250g**, where the stepper goes 250 → 500 → 750 → 1000 and you can still tap and type **288g**. ⚠️ **We checked the database rather than assuming, and it needs no change at all:** a sale line already stores the quantity you keyed, the unit you keyed it in, and the converted amount as three separate things, and the price is held to six decimals — so 288g of that product is **$51.84, exact to the centavo**. ⚠️ **The one thing `Agregar` had to get right for this is that it stores the price per gram rather than per 250g, and it does** — which is why none of this will need Agregar changed when Vender is built.

✅✅ **AND YOU FOUND TWO MORE THINGS ON THE PHONE. BOTH FIXED.**

⚠️⚠️ **THE KEYBOARD STAYING UP WAS NOT WHAT IT LOOKED LIKE.** Both screens were already telling it to go. The real cause: **the search box on Productos never gave up focus.** You type a name there, the form opens on top, and Productos is still sitting underneath with the cursor in its search box — so when the form closes, the phone helpfully brings that keyboard back, after everything we did to dismiss it. **Telling a keyboard to hide while its box still has the cursor is a keyboard that comes back.** Now the box lets go of the cursor before the form opens, and again when you land back.

⚠️⚠️ **THE BANNER AT THE TOP OF THE CATALOG IS GONE** — added yesterday on your instruction, removed today on your instruction, and you were right that it was appearing when nothing had happened. ⚠️ **Being straight about what we know:** we could not prove exactly why the phone kept showing it, so it is removed rather than explained. **One fault we can name for certain:** dismissing it never stuck — the next product you created brought it back, whether or not anything had been released. Removing it removes the whole family of problem.

✅ **THE BANNER IS PARKED AND NOTHING IS WAITING ON YOU FOR IT** — you said to skip it, so we have. For the record only, in case you come back to it: the one-second flash on the form is now the only place that sentence appears, and lengthening it is one number.

⚠️ **WHAT STILL NEEDS YOUR EYES:** does a grey hint read as *a suggestion you can change*, or just as faint text? Does the family search find what you mean? Is the *Listo* bar above the number pad where your thumb expects it? Does the blink read as *this is the one you just made*, or as the screen glitching? ⚠️⚠️ **ONE THING WE FOUND BY ASKING THE DATABASE RATHER THAN TRUSTING A NOTE, AND IT WOULD HAVE BITTEN YOU.** You told us a family is one thing measured one way — chicken in kilos, milk in litres, eggs by the piece — and the database turned out **not to enforce that at all**. Nothing stopped a new chicken variant being priced *per litre*. The form now only offers you the units the rest of that family already uses, so the rule holds because the screen holds it. ⚠️ **Three more things decided for you, all cheap to change:** the form stays open after a save and keeps the family and the unit, because you will be adding several in a row; the unit list is shortened by the family, and when only one unit is possible it is simply chosen; and the form waits for the product list to load before it opens, because every family question is answered out of it. |
| **5e-iii** | **Editar — changing a product you already have** | ✅✅ **Done 23 September — both halves, on the day the second was unblocked.** ⚠️⚠️ **This job was SPLIT IN TWO on 23 September, before any of it was written, and the split is described in the two rows below.** Sizing it first is the working habit that has now found something nine times in a row, and this time it found two. **The first:** changing a price is really *two* changes to the database that have to happen in the right order, and if the second one fails the product is left **priced yesterday and with no price today** — mid-morning, by somebody who was CORRECTING a price rather than removing one. That is worth building with its own test rather than inside a form. **The second is a question for you and it is in the waiting-on-you row below.** ⚠️ **What the whole job still is:** renaming a product, **changing its price**, setting the tax rate and pack size, and retiring one you no longer sell. ⚠️ **Retiring a product hides it; nothing is ever deleted**, because the sales behind it still have to add up. ⚠️ **Neither half changes the database.** |
| **5e-iii-a** | **The price change itself, with nothing to look at** | ✅ **Done 23 September — and there is nothing new on your phone, which is what it said it would be.** The app now knows how to change a price correctly, including the awkward case, and every rule it follows was checked against a real database rather than reasoned about. ⚠️⚠️ **And it found something worth knowing, by asking rather than assuming.** We had written down that only a Gerente or the owner may change a product — true. What nobody knew is **what an Empleado actually sees when she tries: nothing at all.** The database does not say no, it simply pretends the product is not there, and the app would have shown her *listo* over a price that never moved. **That is now caught and she is told plainly**, and there is a test that goes red the day the database stops behaving that way. ⚠️ **The awkward case, since it is the whole reason this got its own sitting:** prices are stored with dates, so the ordinary change ends today's price and starts a new one — **and the old one must end before the new one starts**, or the database sees two prices for one day and refuses. Correcting a price a SECOND time in one day cannot work that way at all and overwrites instead. ⚠️⚠️ **And if the second step fails, your product is left with NO price** — for a few seconds, in the middle of a morning, put there by somebody who was fixing a price rather than removing one. The app now says exactly that instead of *no se pudo guardar*, which would have sent you away thinking the old price still stood. ⚠️ **It changed no database.** ⚠️ **It was where the next piece of work was until today, and that marker is DELETED rather than struck through** — the check reads the raw line, and a strikethrough is only a rendering. **The original description follows.** It was **nothing new on your phone when it lands**, which is deliberate and is the same shape as the job that came before `Agregar`. It is the rules the edit form will obey, written where a real database can be asked whether they are right. ⚠️⚠️ **Why changing a price is harder than it looks:** prices are stored **with dates**. The ordinary change ends today's price and starts a new one — two steps, and **the old one must end before the new one starts**, or the database sees two prices for the same day and refuses. **Correcting a price a SECOND time on the same day cannot work that way at all** and has to overwrite instead. A form that only knew the ordinary way would work all day and fail the second time you fixed a price, which is exactly when you would be watching it. ⚠️ **And a product with no price yet is a third case** — you ruled on 22 September that one may be created that way, so this is what finally gives it a price. ⚠️⚠️ **The one thing here that nothing else in the project can check:** only a **Gerente or owner** may change any of this, and that rule lives in the database rather than in the app — so this job ships a test that signs in **as an Empleado** and proves she is turned away. ⚠️ **It changes no database.** |
| **5e-iii-b** | **Editar — the screen you will actually touch** | ✅✅ **Done 23 September — you can now change a product from your phone, and `5e` is finished.** Open a product from Productos, tap a variant, and *Editar* is there: rename it, change the price, set the IVA and the pieces-per-package once, or retire it. ⚠️ **An Empleado never sees the button at all**, which is how the *make a product* screen already works and is what your ruling of 23 September settled. ⚠️⚠️ **THE GREY DASH IS NOW AMBER, BUT ONLY WHERE YOU CAN DO SOMETHING ABOUT IT.** A product with no price shows an **amber** figure on the family screen for you and your Gerentes — because *Editar* is right there — and stays **grey** for an Empleado, who can never set a price. ⚠️ **It stays grey on the main Productos list for everybody**, and that was decided rather than forgotten: you are seeding the catalog deliberately short, so a hundred-row list would open amber on most of its rows for the first week, and an alarm on a hundred rows is one nobody can switch off. **Say the word if you would rather see it there too — it is one line.** ⚠️ **The stock-enforcement switch is never on the form**, as you ruled. ⚠️ **`Costos` stays exactly as it is**, drawn and plainly not working, per your ruling of 22 September. ⚠️ **It changed no database.** ⚠️⚠️ **EVERY BOX STARTS EMPTY EXCEPT THE NAME, AND THAT IS YOUR OWN RULING APPLIED TO A SECOND SCREEN** — *a suggestion must not look like a decision already made*. An empty box means *leave this alone*; what the product holds today is printed **next to** the box, never inside it, so it cannot be mistaken for something somebody typed. ⚠️⚠️ **ONE THING IS NOW WAITING ON YOU AND IT IS AT THE BOTTOM OF THIS TABLE**: retiring a product works, and **nothing in the app can bring it back**. The app says so before you tap. ⚠️ **WHAT STILL NEEDS YOUR EYES:** does *Actual: $35.00 / kg* beside an empty box read as *this is what it is now*, or as something that failed to load? Does one amber price among six read as *price this*, or as *something is broken*? Is landing back on the family screen enough of a *saved*, or should the row you changed blink the way a new product does? Do four fields and a retire button fit one screen at the big text size? And does a row that highlights under your thumb and goes nowhere read as *selected*, or as a link that did not work? |
| **5f** | **Vender — the screen your shop will spend all day on** | ⚠️⚠️ **THIS JOB WAS SPLIT FOUR WAYS on 24 September, before any of it was written, and the four pieces are the rows below.** It said itself that it would have to be — *"a product list, a quantity stepper, a basket, a slide-to-finish, a price change and a setting, which is not one sitting's work"* — and breaking it up first found **three things nobody had written down**, which is now ten sizings in a row that have found something. ⚠️ **What the whole job is:** the screen your shop spends all day on. A list of everything you sell with a search box, a quantity on each row, a basket, a slide to finish the sale, and the two-tap price change at the counter. ⚠️⚠️ **And it owes you one question when we get there:** can a cashier knock money off **one sale** without touching your price list? Your ruling of 23 September settled who may change the SHOP's prices — you and your Gerentes — and deliberately said nothing about a discount on a single line. **Nobody will guess it.** ⚠️ **The quantity control is already specified — your words, on 22 September** — and it needs no database change, which was measured rather than hoped. |
| **5f-i** | **The basket itself, before anything is drawn** | ✅✅ **Done 24 September — and there is nothing new on your phone, which is what it said it would be.** The app can now hold a basket, count in your units and work out what it comes to, and every rule it follows is checked. ⚠️⚠️ **AND A CHECK CAUGHT THE FIRST VERSION OF IT, WHICH IS WORTH TELLING YOU ABOUT.** To work out a price when a shop says its prices do NOT include IVA, the app needed the tax rate — so the first attempt fetched the tax rate for **every product, on every screen, on every phone**. A check written back in the catalog work refused it: *a column the app never asks for is a column that never reaches a phone*. **It was right** — no shop of yours needs that branch at all, so the app now asks for the rate only when it is actually on that branch, and **refuses to guess rather than quietly charging the wrong amount**. ⚠️⚠️ **AND THAT FOUND A SECOND ONE: buying must never fall back to your SHELF price.** What you charge and what you paid are different facts; a delivery recorded at your retail price would look perfectly normal and quietly ruin your margins for ever. It now stays blank until Comprar supplies the real figure. ⚠️ **What it does NOT prove**: nothing has yet asked the database whether it accepts a sale. That is in the Vender and Comprar jobs, and it is written down there rather than assumed. ⚠️ **It changed no database.** **The original description follows.** It was **nothing new on your phone when it lands**, which is deliberate and is the same shape as the two jobs that came before *Agregar* and *Editar*. It is the basket as a thing the app remembers, plus the sums. ⚠️⚠️ **THE BASKET HAS TO SURVIVE YOUR PHONE RINGING.** Half a sale keyed in and a call comes through — when you come back, the basket is still there. That is not a detail we invented; it was decided when the app was designed, and **the row for this job had not mentioned it at all.** ⚠️⚠️ **AND THE QUANTITY RULE IS YOUR OWN, FROM 22 September:** *"$45/250gr, when selling he can use the stepper to go 250 → 500 → 750 → 1000. But he can also tap to enter 288gr if needed."* **Tapping `+` counts in the unit you priced it in; typing counts in grams.** The sums for both live here, and they are checked against the database's own arithmetic rather than reasoned about. ⚠️⚠️ **ONE THING WE FOUND, AND IT WOULD HAVE BEEN WRONG SILENTLY AND IN YOUR BOOKS.** The database wants the price **with IVA included** on a sale and **without** on a purchase — and whether the price you typed already includes IVA is the question you answer when you create your shop. **Every shop says yes today**, so the app would have looked right for years and understated the tax the first time somebody said no. It now asks the shop instead of assuming. ⚠️ **It changes no database.** |
| **5f-ii** | **The list and the row — the screen, with nothing committed** | ✅✅ **Done 24 September — the Vender tab is a real screen for the first time, and it is waiting for your eyes.** Open it and you get everything your shop sells in one list with a search box, and **every row carries its own quantity**: the name, the family under it, the price always with its unit (`$35.00 / kg`, never a bare `$35.00`), a `−` and a `+`, and a box you can tap and type into. **A quantity above zero IS the line** — there is no *add to basket* step and no product page in between. At the bottom, a bar that stays put showing **Total**. ⚠️ **Nothing is saved from this screen yet and nothing can be finished on it** — the basket sheet and the slide that completes a sale are the next row. ⚠️ **Your ruling of 24 September is what it is built on**: *"Amend it to say both."* **Every product gets a stepper AND a number pad, one tap apart**, counts included — *fifteen manojos of cilantro is fifteen taps* — and the design document was corrected to say so before a line was written. ⚠️⚠️ **ONE CALL I MADE FOR YOU AND IT IS THE ONE TO LOOK AT ON THE PHONE: WHICH UNIT THE QUANTITY BOX COUNTS IN.** Your own rule gives two examples and they do not follow one pattern. A chicken breast priced **por cuarto** steps `250`, `500`, `750` and the box says **gr**; the same product priced **por kilo** is typed as **0.250 kg**. So the box speaks **grams** for a product priced by the quarter and **kilos** for one priced by the kilo — and nothing in the database says which units are which, so **I wrote the list down**: kg, gr, l, ml and pza are units you measure in; 100 gr, 250 gr, 500 gr, 100 ml and 500 ml are denominations you price in, and a product priced in one of those counts in the base unit. **If a box ever shows you a number in the wrong unit, that list is a two-line change.** ⚠️ **AND ONE THING I DELIBERATELY DID NOT MAKE LOUD EVERYWHERE.** A product with no price shows a dash — and it only turns **amber, with the words *Sin precio* beside it, once you have put a quantity on it.** A shop whose catalog is deliberately short would otherwise open with most of its rows shouting, and an alarm on a hundred rows is an alarm nobody can silence. ⚠️ **What the app DOES about a priceless row is still not decided** — a delivery will be blocked and a sale will be allowed but loud — because those are two different answers and this one list serves both screens. ⚠️ **There is no `...` on the row at all**, rather than a dead one: you ruled the counter discount out of the pilot the same day, and nobody has ever seen that button, so there is nothing to take away. ⚠️ **It changes no database.** |
| **5f-iii** | **The basket sheet and the slide that finishes a sale** | ✅✅ **Done 24 September — both halves.** ⚠️⚠️ **SPLIT IN TWO on 24 September, before any of it was written — it is no longer a job somebody takes, the two under it are.** ⚠️ **Nothing was waiting on you, and nothing is now.** **Why it split:** it is a screen that SHOWS you a basket and a gesture that SAVES one, and only the second of those writes anything. ⚠️⚠️ **The two halves go wrong in completely different ways, and that is the real reason.** If the sheet is wrong you can see it — a wrong row, a missing *are you sure* — and you would tell us in a sentence. **If the saving is wrong you cannot see it at all**: a sale that never gets queued, or gets queued twice, or sits in the queue because nothing told it to send. **Nobody reports a sale they watched an animation confirm.** ⚠️ **And the order is not a preference:** the app is supposed to show you the basket BEFORE you commit it, so building the slide first would put a *finish the sale* control on screen with nothing in front of it. ⚠️ **Neither half changes the database.** |
| **5f-iii-a** | **The basket sheet — seeing what is in the basket before you charge for it** | ✅✅ **Done 24 September — you can open the basket, change a quantity in it, take one line out or empty the lot.** ⚠️ **Nothing is saved yet** — that is the other half. ⚠️ **Tapping *Quitar* removes a line straight away** — no *are you sure*, no undo — which you ruled on 17 September; putting it back is two taps on the list behind. **Emptying the whole basket still asks, and it gets the confirmation animation you asked for on 21 September.** ⚠️⚠️ **The thing worth knowing, and it is about money.** The sheet shows a price on each line and the bar at the bottom shows the total — and a customer adding your lines up by hand has to get the same answer. **Those two numbers now come out of one calculation**, so they cannot drift apart; before this, the total existed and the line prices did not, and the easy way to build the sheet would have been to work them out a second time. ⚠️ **And a product that somebody retires on another phone while your basket is open now shows up in the sheet as a greyed-out line you can remove** — before this it would have silently blocked the whole sale with nothing on screen to act on. ⚠️ **It changes no database.** |
| **5f-iii-b** | **The slide that finishes a sale — and the first thing this app ever saves** | ✅✅✅ **Done 24 September — the app has now saved a sale, and the whole Vender job is finished.** ⚠️⚠️ **Everything built in the *no signal* work had been tested against made-up data until today, because nothing in the app had ever had anything to save.** Finishing a sale is a slide, the track fills under your finger as you asked, and the confirmation plays **the moment you slide, never when the server answers** — so a sale with no signal looks exactly like one with. ⚠️ **One thing found and deliberately left for a later job:** a basket containing a product with no price cannot be sold at all right now — the slide simply is not drawn. Your own rule says a SALE should go through with a warning (only a purchase should be blocked), and the job that owns that rule is `5h`. ⚠️ **It changes no database.** ~~Waiting on you~~ — it draws the slide into the bar at the bottom of Vender, and you asked to settle how that bar is arranged first. See the row above this table. ⚠️⚠️ **THIS IS THE FIRST TIME THIS APP WILL EVER SAVE A SALE** — everything built in the *no signal* work has been tested against made-up data, because nothing in the app has ever had anything to save. **Finishing a sale is a slide and not a tap**, and the second of your two animations from 21 September plays **the moment you slide, never when the server answers** — so a sale with no signal looks exactly like one with, which is the whole point of how this was built. ⚠️ **It also gets you your first look at the little banner for operations that never went through** — until this job there is no way to make one appear on a real phone. ⚠️ **It changes no database.** |
| **5R-f** | **Making sure the database your phone talks to actually has the latest changes in it** | ✅✅ **Done 24 September — and the first thing it did was answer the question: your project IS up to date, all 36 changes are in it.** ⚠️ **It was where the next piece of work was, and that marker is DELETED rather than crossed out** — the check reads the raw line and a crossing-out is only a look. ⚠️⚠️ **What you now have that you did not have this morning: one command that asks your real database what it is carrying and compares it to what the repository has.** Until today nothing did — 22 September was found by you tapping a screen. ⚠️ **One call I made for you, and it is reversible in a sentence: it is a command I run, not something that runs automatically on every change.** Two reasons. **The key it needs would open your whole Supabase account**, not just this one project, and keeping that key in the repository to guard against a forgotten deploy is a bigger risk than the thing it guards. **And its answer is about the world rather than about the change being made** — the moment a database change is merged it would go red until somebody deploys, so it would turn other, unrelated work red for a reason that work did not cause and cannot fix. ⚠️ **That is exactly how people learn to stop reading the results**, which is the one habit the automatic merging depends on. **If you would rather have it automatic, say so and it is a small change.** ⚠️ **A limit worth knowing: it compares the LIST of changes, not the contents of your database.** ⚠️⚠️ **It is the guard that would have caught 22 September**, the morning Productos hung on your phone: every database change had been proven to work, in a throwaway test database, and **none of them had ever been put into the real one.** Nothing went red, because nothing was looking — you found it by tapping a screen. **This adds the check that compares what your project has against what the repository has, and goes red when they differ.** ⚠️ **It changes no database.** |
| **5R-g** | **Making the automatic checks trustworthy again** | ✅✅ **Done 24 September — and it turned out better than described: the checks are not just trustworthy again, they are six minutes faster.** ⚠️ **It was where the next piece of work was, and that marker is DELETED rather than crossed out** — the check reads the raw line. **What was wrong:** one job was doing 15 minutes 41 seconds of work against a 15-minute limit, so whether it passed depended on how busy the machines were that morning — and a killed job is neither a pass nor a fail. ✅ **It is now two jobs that run side by side**, about nine and ten minutes each, so the whole set finishes in **ten minutes instead of nearly sixteen** and the time limit means something again. ⚠️ **I measured it step by step rather than estimating** — that is how I knew which half to move, and it is also how I found that the moved half needed none of the JavaScript setup the old job was carrying. ⚠️ **And I rebuilt the new job's exact shape on this machine before pushing it**, because the risk was a check that quietly relied on something an earlier step had left behind — that would not have shown up by reading the change. All thirteen passed. ⚠️ **It changes no database and nothing you can see on your phone.** ⚠️⚠️ **The problem, found on 22 September: the longest of the automatic checking jobs had been running right up against its own time limit and being KILLED at it — on the main line of work, for hours.** Every step inside it had actually passed; it simply ran out of time about twenty seconds from the end. ⚠️ **A killed job is neither a pass nor a fail**, and the rule we work by says never merge on one — so a time limit firing on a healthy job turns *wait for the checks* into a coin toss, **and the cheap way out of a coin toss is to stop looking.** ⚠️ **The limit was raised as a stopgap and that is not the fix** — it will need raising again every few jobs, because that one job now does eleven database checks back to back. **The fix is to split it in two so they run side by side**, which costs no extra waiting at all. ⚠️ **It changes no database and touches nothing you can see.** ⚠️ **Why this before Comprar:** Comprar is the first screen in a while that will touch the part of the code that sets this very job running, and a job you cannot trust is a bad thing to send a big piece of work through. |
| **5g** | **Comprar — recording what you BUY, and the first thing that knows what anything cost** | ⚠️ **This is where the next piece of work is.** **What it is:** the screen where you record a delivery — pick a provider, put in what arrived and what you paid. ⚠️⚠️ **It is the job that finally wakes `Costos`**, the third button on the family screen that has been visible and plainly dead since 22 September. That was deliberate — *"Leave Costos dead until 5g"* — and the reason it could not work before is simple: **nothing in the app has ever recorded what you PAID for anything**, so there was no answer to show. ⚠️ **The quantity control is the same one you ruled on for selling** — stepper and number pad, one control serving both screens rather than a Vender feature copied across. ⚠️ **The app will remember what a provider charged you last time** and fill it in, and re-price when you change provider. ⚠️ **Unlike selling, a missing price BLOCKS here** — that is your own rule: a sale should go through with a warning, a purchase should not. ⚠️ **And no rounding to 50 centavos on this screen** — that is a selling convenience, not a buying one. ⚠️⚠️ **TWO THINGS COME BACK TO YOU WHEN THIS IS BUILT, and they are noted now rather than sprung on you: what `Costos` should actually SHOW you** — you have never been asked, and until this screen exists there was nothing to ask about — **and whether a cashier can knock money off ONE sale** without changing your price list, which was left open when the price fence was settled on 23 September. |
| **5f-iv** | **The two-tap price change at the counter, and whether it sticks** | ⏸️⏸️ **OUT OF THE PILOT — your ruling of 24 September: *"Let's not do those discount controls part of the pilot yet… Any money 'knock-off' happens in her head and is out of the scope of the app for now."*** **Nothing is built and nothing is drawn** — Vender's rows carry no `...` at all rather than a dead one, because unlike `Costos` you have never seen one there, so there is nothing to take away. ⚠️⚠️ **ONE THING YOUR ANSWER ALSO SETTLED, AND I WANT YOU TO SEE IT RATHER THAN FIND IT:** you had asked for a **setting** that makes a price change last one sale only and reset afterwards. **That setting is the same thing as the discount you just ruled out** — it is a knock-off for one transaction, spelled as a switch instead of a tap — **so it is out too, and the little home-screen banner that existed only to announce it goes with it.** ⚠️ **If you meant to keep the setting and refuse only the per-sale button, that is one sentence and it comes back.** ⚠️ **What has not changed:** a price you change is your shop's price from then on, you change it in *Editar*, and only you and your Gerentes can. ⚠️ **The job is deferred, not deleted** — *"we will need to understand the interactions"* is a condition, and the condition is watching your shop use Vender. Changing a price from the `...` while somebody is standing there, and the setting that decides whether that change **becomes your shop's price** or lasts one sale. ⚠️ **It sticks by default, which is your own decision** — and while the setting is off, the home screen says so, because a price you changed on Monday would otherwise surprise you on Tuesday. ⚠️⚠️ **WHAT IS WAITING ON YOU: can a cashier knock money off ONE sale without touching your price list?** Your ruling of 23 September settled who may change the SHOP's prices — you and your Gerentes — and said nothing about a single line. ⚠️ **This is why the question comes before the button and not after it:** an Empleado tapping a price today is not refused, she is **ignored** — the app says nothing and nothing changes. **Drawing the control before you answer means shipping a button that does nothing.** ⚠️ **It changes no database** — widening who may change prices would be one, and those cannot be quietly undone. |
| **5f.5** | **The *are you sure about that number?* warning** | ⚠️⚠️ **NEW 24 September, and it is written down because the design document REQUIRES it and no job in the plan held it.** *"A cashier meaning 1.5 kg who types 15 produces a transaction that is syntactically perfect, prices plausibly, and silently corrupts stock, margin and waste analytics."* **The app is supposed to flag a quantity or a price roughly three times bigger than usual for that product** — and nothing in the plan or the code has ever done it. ⚠️ **It is a nudge and never a block**, because *precision is the shop's, not ours*: 2 kg when the scale says 2.050 is correct behaviour. ⚠️ **It comes after Comprar**, and not out of tidiness: *what is usual* is worked out from **what you paid**, and nothing in the app has ever recorded a purchase. **A typical price out of an empty table warns about everything or about nothing.** |
| 5g–5h | The rest of the screens | After `5f` — Comprar, Desperdicio |
| **6c** | **Telling your products from ours — and getting delete back** | ⏳ **It held the next-job marker for about four hours on 24 September and handed it straight back**, because your two answers unblocked Vender the same evening. ⚠️ **Still the job that gives you deleting back**, and still waiting on nothing — **say the word and it goes ahead of Vender.** ⚠️⚠️ **New 23 September, and rewritten the same hour when you found the button.** **This is what brings deleting back**, on the products you made and nowhere else. The shop also stops opening empty. It is **a database change**, not a screen — a mark on every product saying where it came from, and a rule in the database itself refusing to remove one of ours rather than just a button we hide. ⚠️ **Recommended after Comprar**, because a catalog you cannot sell or buy through is one nobody can test — **but if the pilot shop should open on a prebuilt catalog, it moves ahead of Vender and that is yours to say.** ⚠️ **Not the spreadsheet import** — that stays where you put it, in the polish after the app is whole. |
| **—** | ✅✅ **Nothing is waiting on YOU** — you cleared it on 24 September, about two hours after you asked for it: ***"We'll go with Option A with the barra"***, plus four more calls from looking at the running app. ⚠️ **All five are built and all five were checked on screen before anything reached your phone.** Three drawn proposals went to you on 24 September, measured at *Letra grande* on your own phone. **The short version: build A — two rows, the summary on top and a full-width slide below.** In the one-row version the slide gets whatever space is left after the total, **so the gesture gets shorter the bigger the sale** — and finishing a sale is a slide rather than a tap precisely so a thumb brushing the screen cannot fire it. In the third the total sits inside the slider, so your hand crosses the number the customer is reading. ⚠️ **It holds up only the slide job; everything else can proceed.** ⚠️ **The previous one was cleared earlier on 24 September**, about half an hour after it was raised: ***"Fix th form and delete and remake them."*** **Both halves, taken as recommended.** ⚠️ **What was wrong:** when you created a product, the app wrote the unit you picked into four columns, one of which is meant to say what the shop's books count it in — grams, millilitres or pieces. For a product priced *por cuarto* it wrote `250 gr` there, and the database refuses to record a sale for a product that disagrees with itself. ✅ **The form is fixed and shipped**: it now writes `gr` there and keeps `250 gr` as the unit you price, buy and sell in. ⚠️⚠️ **AND THE HALF YOU HAVE TO DO YOURSELF, because the app cannot do it yet: you cannot delete a product in the app.** That control is drawn on nothing until the job that records which products are yours (`6c`). So the deletion is a short script — `docs/runbooks/delete-unsellable-products.sql` — that you paste into the Supabase SQL editor. **It shows you the list first, and it ends in `rollback`, which means nothing happens until you change one line to `commit`.** I ran it against a local copy exactly as written: it found the broken products, deleted them and their prices, tidied any family left empty, and then undid all of it. ⚠️ **It is deliberately not a database change** — it repairs one shop's accident once, where a database change would run against every shop for ever. ⚠️ **Only genuinely broken products are touched**: anything priced in `gr`, `ml` or `pza` was always correct, and so was the prebuilt catalog. ~~nothing was waiting on you — you cleared both on 24 September, about four hours after they were raised, and **one of your two answers corrected my reasoning rather than picking between my options.** ⚠️⚠️ **(1) THE QUANTITY CONTROL — *"Amend it to say both."*** Every product gets a stepper and a number pad. **My brief told you nothing was lost by leaving the pad off products sold by the piece, because there is no half a manojo. You pointed out that fifteen manojos is fifteen taps** — the pad is about how many, not about fractions — **and that is now in the design document.** ⚠️ **One thing I did not assume**: the step is already yours to set, because it is whatever unit you priced the product in; if you meant something separate from that, one sentence brings it back. ⚠️⚠️ **(2) NO COUNTER DISCOUNTS IN THE PILOT** — *"any money 'knock-off' happens in her head."* **That also rules out the setting you had asked for** that makes a price change last one sale only: it is the same thing wearing a switch instead of a button. **Flagged rather than quietly absorbed** — if you want the setting kept, say so | ✅✅ **AND THE PRICE-FENCE QUESTION WAS ANSWERED ON 23 September** — you cleared it the morning after you raised it, and the answer you gave made the question cheaper than it looked | ✅✅ **CAN A CASHIER CHANGE A PRICE? ANSWERED 23 September — *"leave the fence as is."* Only you and your Gerentes change prices, and the note that said otherwise is corrected rather than left standing.** ⚠️ **What it means in the shop:** nothing changes — this is what the database has been doing since 26 August, and now the plan says so too. ⚠️⚠️ **What it does NOT settle, and it will come back to you when Vender is built:** whether a cashier can knock $5 off **one sale** without changing your price list at all. That is a different thing from what you just ruled on, and nobody will assume it either way. ⚠️ **What it unblocked:** the *Editar* screen is now clear to build, drawn so an Empleado never sees it — and the grey dash question answers itself, because an amber warning means *you can fix this now* and she cannot. **The original question, kept because it is what you answered:** ~~You said yes. The database has been saying no since 26 August.~~ **Your words, from the interview:** *"We'll perfectionate on the role capabilities, for now let's allow anyone to change the price."* We wrote that down, and we wrote beside it that it was a screen decision only, with nothing in the database depending on it. ⚠️ **That last part is simply wrong.** The database was built so that **only a Gerente or the owner may touch a price**, and an Empleado who tries is refused **silently** — no message, nothing on screen, the tap just does nothing. ⚠️⚠️ **What it means in the shop, which is the part worth reading twice.** You also said a price changed at the counter should STICK — become the shop's new price. Put those two together and a cashier knocking $5 off for a regular **permanently rewrites your price list**. You were shown that trade and took it; what nobody knew was that the database had already refused it for you. ⚠️⚠️ **My recommendation: leave it as the database has it — only you and your Gerentes change prices — and let me re-ask you when we build Vender**, which is the screen where a counter discount actually happens. **Saying yes is a permanent change to the database that cannot be quietly undone; saying nothing costs you nothing and is reversible any day.** ⚠️ **What it is holding up:** only the *Editar* screen, and only one detail of it — whether a missing price shows an amber warning (which means *you can fix this now*) or stays a plain grey dash. For an Empleado it can never be amber, because she cannot fix it. **The piece of work marked next is not waiting on this** | ✅✅ **`Costos` IS ANSWERED — 22 September. Your words: *"Leave Costos dead until 5g."*** **What it means:** the third button on the family screen stays exactly as it is — visible, plainly not working, with *todavía no está lista* under it — right through the product-editing work. ⚠️ **We are not deleting it**, and that was a real choice: a button you have seen and then cannot find reads as the app getting smaller, which is the same reason Proveedores is drawn dead on the home screen rather than removed. ⚠️⚠️ **And the question is not closed, it is MOVED — which is the part worth knowing.** You did not say what `Costos` should show, and you should not have to yet: nothing in the app records what you PAID for anything until Comprar is built, so there is no answer to show. **Comprar's own row now opens by owing that word**, so it comes back to you when it can actually be answered rather than quietly disappearing. | ✅✅ **THE DATABASE IS DEPLOYED — 22 September, and you did it yourself.** You logged in, checked the list and pushed, and the answer to the open question was the better of the two: the app was pointed at the **right** project all along; the database had simply never been created in it. **Checked from here afterwards:** all thirty-eight migrations are on the real project, local and remote identical row for row, and the ten units are really in the table. ⚠️ **Two things you will see and neither is a bug:** the app will ask you to **create your shop**, because no shop exists yet in that project; and then **Productos will be empty**, because nothing in the app can add a product until the next-but-one piece of work. **Tell me and I will load your products directly** so the screen has something real on it. ⚠️ **And a gap you should know about, now written down as work:** nothing we have ever checked whether the database your phone talks to matches the code — that is exactly how this went unnoticed since September. | ✅✅ **BOTH HALVES OF THE HOME-SCREEN QUESTION WERE RULED ON 22 SEPTEMBER, THE DAY IT WAS ASKED.** **First: *"Let's drop it for the pilot then."*** The *expiring within 48 hours* panel is gone — nothing would ever have filled it, since you decided not to capture expiry dates, and the waste report works the same answer out later from what your shop actually records. ⚠️ **The price of that, unchanged:** it needs weeks of records before it can say anything, where a typed date would have worked on day one. **Then: *"Let's keep it Home Only."*** The little banner for operations that never went through now appears on the **home screen and nowhere else** — not on Vender, Comprar or Desperdicio, which are the screens you use mid-sale. ⚠️ **That was a real change to code we had already shipped**, and it is one line: the banner itself did not move, it simply asks which screen it is on. ⚠️ **Brushing it away still lasts until the number changes**, not until you walk away — that survived the change on purpose. ⚠️⚠️ **One thing this does NOT fix, and it is worth knowing:** the promise underneath that banner is that failed operations reach US. **The alert that would tell us is still not built** — it is on the list as due before the pilot ends, and until then the only thing standing in for it is you and me being in the shop~~ |
| **—** | ✅✅ **AND THE ONE FROM 23 September IS ANSWERED, 24 September** | ✅✅ **Ruled: *"Let's follow your recommendation."*** **Everything in a shop when the change ships counts as ours and cannot be deleted; everything created with *Crear Nuevo Producto* afterwards is the shopkeeper's and can be.** ⚠️ **And you made it free**: *"this part here is merely indicative for us to keep progressing on our Front End"* — the products on your phone are scaffolding for looking at screens, so locking them costs nothing. **That is the sort of thing no amount of reading this repository could have told me.** ⚠️⚠️ **WHAT YOU WERE REALLY ASKING — *can we tell them apart at all?* — IS YES**, and it is a small, additive change rather than a rework. Your reason is now written into the job: *each user selects the nature of his shop, imports a set of products, and can look at them offline, and we need the distinction so he cannot delete a product he didn't create.* ⚠️⚠️ **TWO THINGS I FOUND WHILE WRITING IT DOWN, BOTH WORTH KNOWING BEFORE IT IS BUILT.** **(1)** The obvious way to build the lock would also stop you **changing the price or the name** of an imported product — which is the whole point of importing one. It has to be a lock on *removing*, not a lock on *editing*, and those are two different things in the database. **That one would have shipped as a permanent change and been wrong.** **(2)** *Look at them offline* is **not true today** — the app keeps the catalog in memory only, so a shop that closes the app and reopens it with no signal sees nothing. That is written on the job too. |
| **—** | ✅ **AND THE UNDO IS RULED — it blocked nothing then and blocks nothing now** | ✅✅ **Ruled 22 September — the undo gets built.** Your words: *"Let's follow your advice."* **What it means in the shop:** a cashier rings up the wrong thing and taps undo. ⚠️ **Nothing is erased** — the app writes a mirror-image entry that cancels the first, both stay in the books, and the stock goes back to what it was. Any given sale can be undone once. ⚠️⚠️ **The "15 minutes" is about WHO, not a deadline:** a cashier may undo **their own** sale within the window; **you and your managers can undo anything, any time, with no limit.** ⚠️ **And the 15 minutes is a setting you own** — it lives on the shop and only an owner can change it, so the screen reads your number rather than assuming fifteen. ⚠️ It works for purchases and write-offs too, so it is built once and reused. ✅ **You also ruled on 21 September:** nothing prints and nothing shows at the end of a sale (change calculation deferred; you asked instead for **a confirmation animation when a sale completes and another when the basket is emptied**), and **no expiry-date capture** — shelf life gets derived from the pilot's own records instead. ⚠️ **That last one has a cost worth remembering: a derived shelf life needs weeks of write-off records before it tells you anything**, where a typed date would have worked on day one. |

| **—** | ✅ **AND THE ONE FROM 22 SEPTEMBER IS ALREADY ANSWERED** | ✅✅ **Ruled 22 September, within the hour: *"Let's follow your recommendation."*** **The architecture document will name the connectivity library the app uses**, and the next job writes that sentence rather than a job of its own being created for it. **What it means in practice:** ADR-035 is the page that fixes every app-wide choice — how screens are routed, how data is cached, what the colours are — so that nobody working on this later can quietly introduce a second way of doing the same thing. `expo-network` is now one of those choices and it was the only one with no line. ⚠️ **One condition came with it:** the line has to say *how* we know, not just *what* we picked. The test was run on a simulated iPhone that borrows the Mac's internet, so *"the other library never recovered"* is true of that setup and might not be true of a real phone — **and a sentence that states a finding without its limits is how a document goes quietly wrong** |
| **—** | ✅ **AND THE OLDER ONE IS ANSWERED TOO** | ✅✅ **Ruled 22 September: *"Let's follow your recommendation."* Yes — "that code isn't a shop" gets its own error number, as its own small job, after the next two.** It is now a row of its own (`5b.9`) rather than a question, and it is the only open job left in this step that changes the database. ⚠️ **What it fixes:** right now somebody whose sign-in quietly expires while they are on the join screen is told to re-check a code that was fine — the app cannot tell the two apart, so it guesses, and it guesses the commoner one. Reopening the app puts them right, which is why nothing was ever held up by this. ⚠️ **The original question, kept because it is what you answered:** ~~Should we give "that code isn't a shop" its own error number?** Right now the database answers a wrong shop code with the SAME number it uses for *"you're signed out"* — so the app has to guess which happened, and it guesses "wrong code", because that screen can only be reached by somebody who IS signed in. **My recommendation: yes, fix it, as its own small piece of work after the next one.** It is the exact same problem you already ruled on for the other code box on 2026-09-18 — *"cheap now, dearer later"* — and it was worth fixing then. ⚠️ **What saying no costs you:** somebody whose sign-in quietly expires while they are on that screen is told to re-check a code that was fine. Reopening the app puts them right. That is the whole of it, which is why nothing is held up waiting for your answer. ⚠️ **It must not be bundled into the next piece of work** — that one is a different database function, and this project has already recorded why two unrelated fixes in one database change are harder to undo. ⚠️ **The app already has a test that goes RED the day this is fixed**, so it cannot be quietly forgotten.~~ ✅ **That last sentence is now the plan**: the job closes by breaking its own test and rewriting it, which is the cheapest proof there is that the fix actually landed |
| **—** | ✅ **And the one from 19 September is still answered** | ✅✅ **Ruled 2026-09-19 — the approval screen shows the EMAIL as the header and the NAME underneath it.** Your words: *"Show the Email as a Header and the Name as a subtitle of the request."* ⚠️ **It is the opposite way round from the list of people**, where the name is on top and the role underneath — deliberately: on that list you already know everybody, and on an approval you are checking a stranger against an address somebody read out to you, so the address is the thing you are matching and the name is what keeps you from letting in the wrong person. ⚠️ **If that person has no name stored, the row is just their email** and nothing underneath; you are not told why. ✅✅ **Ruled 2026-09-18 — área 9 is CLOSED and nothing is owed there.** Your words: *"we have already set the measures and would stick to see the Números screen in our Pilot and enhancing anything needed later."* ⚠️ **The earlier reading of this was wrong and the plan says so**: *"not about how it looks"* was said during the styling round, about the styling round, and the plan had turned it into a reopened área 9 and an expected migration. **Nothing reopens.** ✅ The undo question was answered the same day: **no undo.** ✅ **The paperwork fix of 2026-09-18 is settled too** — you said to fold it into `5b.8`, and it now rides with that task's first piece. ⚠️ **The block in `docs/PLAN.md` stays even when it is empty**, because it is the only thing that guarantees the next question gets put back in front of you |
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

⚠️⚠️ **REWRITTEN 24 September, because all three questions that used to be listed
here had been ANSWERED — two of them a week earlier — and this section was still
asking them.** That is the defect this repository has now recorded seven of: a claim
that was true when it was written, in the one file you actually read.

**There are two, they are both in the last row of the table above — the one that
says whether anything is with you — and the live list is always the
`⛔ DECISIONS OWED` block in
[`docs/PLAN.md`](PLAN.md)** — which every session reads before it does anything, so
a question parked there is re-offered automatically until you rule on it.

1. **The quantity control: one control or two?** Your words give a weighed product a
   stepper *and* a number pad; the design document says a number pad only. **My
   recommendation is yours, and I correct the document.**
2. **Can a cashier knock money off one sale** without touching your price list?
   **My recommendation is yes, and it is the only price control she is shown.**

⚠️ **What used to be here, and where each answer went:** how a second person joins a
shop — you asked for **both**, and it is built and working; whether anyone may change
a price — **ruled on 23 September**, *"leave the fence as is"*; and the four subjects
the interview never reached — the end of a sale, the undo, expiry dates and the three
daily numbers — **all four ruled between 18 and 22 September**, with the undo built
into the plan and expiry dates dropped for the pilot on your instruction.

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
