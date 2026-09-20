# Archived status log — the 2026-09-19 working day

⚠️ **THIS IS PART OF THE PLAN, NOT A BACKUP OF IT**, and it is **closed, not wrong**
— the same distinction as [`steps-0-to-4.5.md`](steps-0-to-4.5.md) and
[`status-log-through-2026-09-18.md`](status-log-through-2026-09-18.md), and the
opposite of `archive/power-platform/`, which describes a system nobody is building.
Every entry here was true when it was written and still describes this system.

Cut out of `## Position` in `docs/PLAN.md` on 2026-09-20, the **second** cut of that
section in two days. **Nothing was edited, summarised or reordered** — these are the
original lines in their original order, and the split was verified by rebuilding the
source file and confirming it came back **byte-identical**.

## Why there is a second file rather than one bigger one

⚠️ **THE 2026-09-18 ARCHIVE WAS NOT RENAMED, AND THAT IS DELIBERATE.** The obvious
move was to append these entries to it and call the result
`status-log-through-2026-09-19.md`. That name is referenced in five places —
`CLAUDE.md`, `docs/HANDBOOK.md`, twice in `docs/PLAN.md`'s navigation, and inside the
archive itself — and **one of those references is a historical statement that would
become false**: `docs/PLAN.md` records that the 2026-09-20 cut moved *"4,576 lines to
`status-log-through-2026-09-18.md`"*, which was true and must stay true. Renaming to
tidy the shelf would have meant editing the record of what happened.

⚠️ **`plan-corpus.sh` globs `docs/plan/archive/*.md`**, so a new file needs no wiring
at all — it is picked up by every split guard the moment it exists. The scheme going
forward is one file per cut, named for the working day it holds.

## What this file holds

The whole of the **2026-09-19** working day, reverse-chronological as it was in
`## Position`: the plan split and the seven split guards becoming one engine,
`5b-iii-d`'s sizing, `5b-iii-c`, `5b-iii-b`, `5b-iii-a`, `5b.8-iii-b`,
`5b.8-iii-a` and `5b.8-iii`'s sizing.

⚠️ **To search the whole plan, live and archived, in one command:**

```
grep -n '<task-id>' "$(bash docs/checks/plan-corpus.sh)"
```

---

✅✅ **THE PLAN WAS SPLIT AND THE SEVEN SPLIT GUARDS BECAME ONE ENGINE, 2026-09-19 — AND
`5b-iii-d-1` REMAINS THE WORK IN FRONT.** ⚠️ **No product code was written and no migration
was applied.** This session was taken on the owner's instruction after a measurement, not
from the build order, and its whole output is process: one engine, seven specs, one
falsifier, one corpus assembler, an archive, and a handbook section.

⚠️⚠️ **WHAT THE MEASUREMENT FOUND.** Over the previous fourteen sessions this repository
added **6,456 lines of process** (plan prose + `docs/checks/`) against **4,124 lines of
product** (app, packages, migrations, pgTAP) — and **six of those fourteen shipped no
product at all**, four of them being sizing sessions whose entire output was deciding how to
divide a task. `docs/checks/` had grown to **1.7× the size of the app it guards**. The
rigour was aimed at a failure with no customer impact: *the plan document becoming
internally inconsistent*.

**What changed, and what deliberately did not:**

| | Before | After |
|---|---|---|
| `docs/PLAN.md` | 14,998 lines / ~313k tokens — **larger than a context window** | 8,779 lines; Steps 0–4.5 moved to `docs/plan/archive/`, **unedited** |
| Split guards | 7 scripts, 2,043 lines, one per generation | 1 engine + 7 specs, 204 lines of spec |
| Their falsifiers | 7 harnesses, 1,858 lines, ~90 fixtures total | 1 harness, **342 fixtures generated from the specs** |
| `docs/checks/*.sh` | 13,412 lines | 9,511 lines |

⚠️ **THE SPLIT OF THE PLAN IS PROVABLY LOSSLESS.** The original file was rebuilt from the
working plan and the archive and compared against `HEAD` — **byte-identical**. Nothing was
summarised, reordered or dropped.

⚠️⚠️ **TWO DEFECTS THE COPYING HAD HIDDEN, BOTH NOW FIXED IN ONE PLACE.**
**`5b-split-coverage.sh` HAD NO ANTI-VACUITY GUARD** — it ended on `fails == 0` alone, so a
run that skipped every assertion reported success. Rule 4 of this repository, absent for 24
days from the guard over the **largest** split, while the other six had it. And the
**`IFS='|'` truncation trap bit three separate writers**, each of whom "fixed" it by adding
a comment telling the next one not to; the engine now **counts the fields** and names the
trap (assertion 0, fixture `E1`).

⚠️ **NOTHING WAS DROPPED FROM WHAT THE GUARDS ASSERT.** All **71 deliverables** across the
seven splits, and all **twelve sentences that carry a ruling**, were transcribed into the
specs and are checked. `5a-split-coverage.sh` and `4.6a-split-coverage.sh` were **kept as
they are** — `5a` guards four nested generations in a different shape, and `4.6a` asserts
over migration numbering, `supabase/README.md` and ADR-035, which are product facts rather
than plan prose.

⚠️⚠️ **THE ARCHIVE IS A CHECK INPUT, WHICH IS THE THING MOST LIKELY TO BREAK LATER.**
`docs/checks/plan-corpus.sh` assembles this file plus `docs/plan/archive/` and every split
guard reads that, so an archived row still resolves. It works only because every plan lookup
here is **content-addressed** (`| **task** |`) and never by line number. ⚠️ **The corpus is
in `app.yml`'s path filter** — if it were not, an edit to an archived row would run no
guard, which is the day-dead failure `conventions-gate-falsify.sh` already paid for once.
⚠️ **`plan-handover.sh` and `handbook-agreement.sh` deliberately still read the LIVE plan
only**: they assert *exactly one* next task and *one* decisions block, and an archived copy
would read as a second one.

**DECISIONS TAKEN ON THE OWNER'S BEHALF, all cheap to reverse — no migration, no seed:**

| Decision | Why | Reversal |
|---|---|---|
| Steps 3, 4 and 4.5 archived although their headings carry **no `✅`** | They are densely complete inside — **41, 50 and 31** completion marks. Steps 0–2 had the tick | Move the section back; the archive header says how |
| Step 4.6 and Step 5 **kept live** | 4.6's rows are read by an active CI guard and 5 is the current step | — |
| The seven falsifiers became **one** rather than being deleted | Deleting them was the instruction's letter; one harness over the shared engine is **stronger** — 335 generated fixtures against every deliverable, not ~90 hand-picked | — |
| Fixtures run against a **rows-only projection** of the corpus | The engine reads only `grep "^|"`, so it is exact, not approximate — and fixture `E0` refuses unless full corpus and projection give **identical** output. With the row cache the sweep runs in **1:27**, against 5:04 before | — |
| `5a-` and `4.6a-split-coverage.sh` switched to read the **corpus** | They do pure id lookups; on the next archive they would otherwise fail for an unrelated reason | One line each |

⚠️ **WHAT IS STILL OVERSIZED, AND IS NOT MINE TO CUT.** `## Position` is **5,414 lines** —
the largest single thing a session now reads, and mostly accumulated strikethrough history
of decisions already ruled. ⚠️ **It also contains at least one paragraph duplicated verbatim
inside a single line** (the *"what are the Números questions?"* run appears twice). Trimming
it means editing the owner's own record of his reasoning, so it is **parked for him**, not
taken.


✅✅ **`5b-iii-d` WAS SIZED ON THE DAY IT WAS TAKEN, 2026-09-19 — IT IS AN `L`, NOT THE
`M/L` THIS FILE CARRIED, AND IT SPLITS IN TWO. `5b-iii-d-1` IS THE NEXT TASK.** Nothing
was built. This session is a sizing session and its whole output is a sizing section, three
table rows, two handbook rows, one guard and its harness — the shape `a2a17a2` and `a586c52`
already record.

#### ⚠️⚠️ ITS OWN GATE CELL ORDERED THIS AND WAS RIGHT — THE SECOND TIME IN ONE DAY

`5b-iii`'s cell predicted its own re-size on 2026-09-19 and this child's cell predicted this
one **in the same edit**: *"it carries a badge, a list and a picker, and `4e`, `4.6a`, `5b.8`
and `5b.8-iii` each record a deferred half arriving bigger than it left."* ⚠️ **A gate cell
has now correctly predicted a re-size three times running** — `5b.8-iii`, `5b-iii`, and this
— which is three times the sentence was worth more than the letter beside it.

#### The measurement, because the letter is the thing in dispute

⚠️ **The `M/L` was given to this row by the split that created it hours earlier, and that
split never measured the screen — it measured the SEAM.** The house ruler is the last five
commits and it is not ambiguous:

| Commit | Insertions / files | What it bought |
|---|---|---|
| `02c881b` — `5b-iii-b` | **1,782** / 14 | one api module (347), **80 lines added to a screen that already existed**, hooks, strings, 289 lines of Vitest, a 429-line contract check and a 237-line harness |
| `d5a45a9` — `5b.8-iii-b` | **1,776** / 14 | the same shape, one screen over |
| `2b4fdce` — `5b-iii-c` | **1,216** / 6 | one migration and its 881-line suite |
| `a2a17a2` — `5b-iii`'s split | **818** / 5 | a sizing section, four table rows, one guard and its harness |
| `a586c52` — `5b.8-iii`'s split | **642** / 5 | the same |

⚠️⚠️ **THE PHRASE THAT DECIDES IT IS "ADDED TO A SCREEN THAT ALREADY EXISTED".** The two
largest client sessions this repository has ever shipped **both edited an existing screen**,
and each spent about 80 lines doing it. **This task has no screen to edit.** The approval
surface is a new file, and the two new screen files on disk are `bienvenida.tsx` at 358 lines
and `ajustes.tsx` at 992. Add a badge on a **second** screen and a multi-select picker with a
refusal rule in front of it, and the estimate is **~2,500 insertions over ~15 files — about
1.4× the largest client session on file.** That is not an `M/L` wearing a bigger letter. It
is two sittings.

⚠️ **AND THE TWO RISKIEST THINGS IN IT ARE BOTH IN THE SAME HALF.** `approve_request` is the
only write in this task and it writes `workspace_member` **and** `member_location`; `D8`'s
fence is a screen decision **no test in this repository can see**, because §2.11 keeps
rendering out of scope and there is therefore no suite that would notice a picker quietly
defaulting to empty. Kept whole, both of those land in the same sitting as a notification
badge.

#### The seam, and each piece is falsifiable by ONE instrument

| | Takes | Why the line is here |
|---|---|---|
| `5b-iii-d-1` | The badge, the approval screen, and the queue it renders — **and it writes NOTHING** | Every claim in it is falsifiable by one contract check driving the queue read over real HTTP, with no row changed anywhere. The ruling of 2026-09-19 is a rendering decision, and this is the half that can be **looked at on a phone** the day it ships |
| `5b-iii-d-2` | The act, the picker, and the fence that refuses to be empty | **The only write, and the only decision no instrument here can see.** It gets its own sitting for the reason `5b-iii-a` and `5b-iii-c` each got one: the thing that cannot be measured should not share a session with three things that can |

⚠️ **IT IS THE READ-THEN-WRITE SEAM, REUSED RATHER THAN INVENTED.** `5b-ii` was split on it —
`5b-ii-a` was the sheet *"and everything on it that only reads"* and `5b-ii-b` was the push —
and `5b-iii` one level up alternates on the same principle. ⚠️ **Neither child ships a
migration**: every function either of them calls is applied already, `0029` and `0037`.

#### Four alternative seams considered and refused

- **The badge alone as a child.** Refused on size: it is an icon and a count. Worse, the
  screen it opens would not exist yet — so it would be a control that opens nothing — and it
  needs the same queue read `5b-iii-d-1` already drives, so it would ship a **second contract
  check over one RPC.** Two checks driving one call is how a vacuous green gets written.
- **The screen shell first — badge, list AND picker — then wire the act on.** ⚠️⚠️ **Refused,
  and this is the dangerous one.** The fence is the ONLY reason that picker exists. A sitting
  that renders it without the write is a sitting in which **nothing can go red if it defaults
  to empty**, and §2.11 has already removed the instrument that would otherwise notice. This
  seam would take the one decision in the task that no machine here can check and put it in
  the half where it is invisible.
- **Three ways: badge / queue / act.** Refused: the badge and the queue share one read and
  one contract check, so splitting them buys a third session and a duplicated instrument.
- **Keep it whole, and take the `M/L` as written.** Refused on the measurement above, and on
  a gate cell that ordered this re-size before a line of the row was taken.

#### ⚠️ Three decisions taken on the owner's behalf, and the second is the one to look at

| | Decision | Why, and what reversing costs |
|---|---|---|
| **1** | **The seam above, and `5b-iii-d` stops being takeable** | A sizing judgement, which the working agreement makes the session's job; the four alternatives and why each loses are above. **Reversed by one plan edit** — nothing renumbers, because neither child ships a migration and not a line of either has been written |
| **2** | ⚠️⚠️ **THE FENCE GOES WITH THE WRITE, NOT WITH THE PICKER'S PIXELS** | The obvious reading is that a picker is a rendering concern and belongs with the list. It is not: the fence is a **refusal**, `approve_request` already raises `22023` for it (`0029:415`), and the client half exists to say so in Spanish before the call is made. Splitting the control from its only rule is the refused seam above, and it is refused because §2.11 leaves nothing able to see the difference. **Reversed by one plan edit today; never by a migration, since neither child ships one** |
| **3** | **`5b-iii-d-2` IS BLOCKED ON `5b-iii-d-1`, and it is the only edge inside this split** | The approve button has to sit on a row, and `5b-iii-d-1` is what draws the row. Building the act first means building a control against a list that does not exist — the same argument `5b-iii`'s own decision 5 made one level up, one level down. **Reversed by one plan edit** |

#### The guard, and what it does not do

`docs/checks/5b-iii-d-split-coverage.sh` is the **seventh generation** of a guard that now
watches seven splits. It asserts the parent row and both children exist, that each child is
stated **exactly once**, that the parent still promises all **four** deliverables, that each
lands in exactly one child and the assigned one, that the silent-write failure survives in
the child that ships the fence, that the ruling of 2026-09-19 survives in the child that
renders the row, that **neither child claims a migration**, and that the parent says it is
**no longer takeable**. Fourteen fixtures in `5b-iii-d-split-coverage-falsify.sh` say it can
still fail on each.

⚠️⚠️ **THE PREFIX CHAIN IS NOW FOUR DEEP AND THIS IS THE WORST IT HAS BEEN: `5b-i` ⊂
`5b-iii` ⊂ `5b-iii-d` ⊂ `5b-iii-d-1`.** Every matcher here takes `| **<task>** |`
**including the closing pipe**, inherited from the sixth generation for exactly this reason.
⚠️ **It is also what leaves the SIXTH-generation guard unmoved by the two new rows** —
`| **5b-iii-d** |` cannot match inside `| **5b-iii-d-1** |` — and fixture `P1` says so by
running that guard against the split tree, rather than a sentence here claiming it.

⚠️ **It cannot tell a good split from a bad one.** It cannot see whether `5b-iii-d-1` is
buildable in one session, and **it cannot see an empty picker** — that is precisely the
instrument §2.11 removed, and it is why decision 2 above is written down instead of tested.
✅✅ **`5b-iii-c` IS DONE AS OF 2026-09-19 — `0037` IS APPLIED, AND THE NAME THE APPROVER IS
OWED IS READABLE BY THE ONE PERSON WHO CAN ACT ON IT. `5b-iii-d` IS THE NEXT TASK.**
`pending_access_requests(uuid)` returns the live pending requests for one shop — id, email,
**requester name**, role, requested-at, expires-at — through `auth_full_name(requested_by)`,
which is granted to nobody and is reachable only from a definer body. It is that function's
**fifth caller and the first that is not a membership writer.**

**Evidence: `supabase/tests/0037_pending_access_requests.sql`, 38 behavioural checks, all
green; EIGHTEEN falsifications, eighteen red against a green control; all 24 suites in
`supabase/tests/` green on one reset (0037's 38 among 1 474 checks), all 7 pgTAP suites green
(779 assertions), all 11 files in `supabase/checks/` green.** ⚠️ **The pgTAP and behavioural
directories were run on separate resets**, because `_cleanup.sql` truncates the tables pgTAP
reads — a first attempt ran them in one session and reported 12 `not ok` lines that were the
harness, not the schema.

#### ⚠️⚠️ THE CLAIM THE WHOLE TASK RESTS ON WAS MEASURED, NOT READ

`5b-iii-c`'s row says the email is already reachable from a phone and the name is on no table
this caller may select. That was read out of migration files, which §9 says is not evidence.
Check 6.1 SELECTS the request row and its address as a **manager**, under `set role
authenticated`, and gets both. 6.2 looks for the requester's `workspace_member` row and finds
**not a row she is refused — a row that does not exist**, because `approve_request` has not
run. 6.3 has the owner herself refused `42501` calling `auth_full_name` directly. The three
together are why this is a migration and not a select.

#### ⚠️⚠️ TWO DECISIONS TAKEN ON THE OWNER'S BEHALF, AND BOTH FREEZE WHEN THIS MERGES

**1. THE FENCE IS `owner`, NOT `manager`.** The ruling of 2026-09-19 means a person's name
reaches somebody who has not admitted her to the shop; what this migration decided is HOW
MANY such people there are, and the answer is *exactly the ones who can act*.
`approve_request` is owner-fenced (`0029` decision 6), so a manager-level read hands her a
queue of strangers' names she cannot do anything about. ⚠️ **The bill is measured rather than
described — check 3.2: a manager of this shop, who may select these very rows and their email
addresses, reads an EMPTY queue.** It is the reversible direction: widening is one predicate
in a `create or replace`, and narrowing after a manager's screen depends on it takes a feature
away from somebody using it.

**2. A NON-OWNER READS ZERO ROWS RATHER THAN BEING REFUSED.** The obvious spelling is
`plpgsql` with a `42501` raise, which is what `approve_request` does one function over — and
`42501` is already carrying two meanings on this path, with the question of whether to mint a
code for the third **parked in front of the owner right now**. A read that refused would have
made it a FOURTH. A list has a refusal that costs nothing to say. ⚠️ **Check 1.6 pins it:** the
applied body carries no raise site at all, so a later session that "improves" this lands red
and has to read why.

#### ⚠️⚠️ THE FALSIFICATION ROUND CHANGED THE SUITE TWICE, AND BOTH ARE SHAPES ALREADY ON FILE

**`F6` deleted `superseded_at is null` and NOTHING WENT RED.** The only superseded request in
the fixture had been aged in order to become superseded, so `expires_at > now()` was already
excluding it — **two filters that cannot be told apart, and one of them provably doing
nothing.** Check 4.6 now holds a row that is superseded and **not** expired. ⚠️ It is written
by hand and says so: `supersede_expired_invite` only touches lapsed rows and `create_invite`
refuses a live pending request with `TD004`, so **nothing in the applied schema can produce
that row today** — the check defends the filter against the day something can, which is the
honest form of the alternative (delete the filter, and re-derive it later from an incident).

**`F12` made the function `security invoker`**, which cannot reach `auth_full_name` and
therefore raises — **aborting the file under `ON_ERROR_STOP` after 1.2 had already recorded
its FAIL, so the report never printed.** That is the aborted-suite shape `0035` and `0036`
each recorded, met again by the next suite written. The four queue readers now catch and
return `-1` or `<REFUSED …>`, which is neither zero nor empty and cannot be mistaken for a
fence holding. ⚠️ **And `F15`, the overload fixture, aborted on a bare scalar subquery in check
1.6** — the exact rule `0035` 1.2 wrote down, broken four checks later in the file that cited
it. It aggregates now, and `F15` lands on 1.3, the check written for it.

#### ⚠️ AND A HARNESS CAUGHT SOMETHING ITS OWN GUARD COULD NOT SEE

`handbook-agreement.sh` went green on this session's first handbook edit and
`handbook-agreement-falsify.sh` went **red on six of eleven fixtures**. The marker moved onto
the next row as *"this is where the next piece of work is**.**"* — a full stop inside the bold
— and the guard greps the phrase without its closing `**`, so it could not tell. The HARNESS
anchors on the exact marker, so **three fixtures could no longer place their defect and
reported setup failures**, which is a guard quietly losing three of the things it tests for
while still printing success. ⚠️ **This is `5b-iii-b`'s finding applied one step earlier**: a
session that edits a file a guard reads must run that guard's HARNESS, not only the guard —
and here the harness was the only instrument that could see it.

#### ⚠️ WHAT IT DOES NOT DO

It ships **no screen and nothing calls it**: `app/` is untouched in this commit. That is the
same half loop `0034` and `0035` merged with, and it is safe for the same reason — this half
is falsifiable with no phone in the room. ⚠️ **`5b-iii-d` re-sizes on the day it is taken**,
which its own gate cell already orders: it carries a badge, a list and a picker, and four rows
in this file record a deferred half arriving bigger than it left.


✅✅ **`5b-iii-b` IS DONE AS OF 2026-09-19 — THE JOINER CAN ASK, AND SHE CAN SEE THAT SHE
ASKED. `5b-iii-c` IS THE NEXT TASK.** One box on the landing now opens two doors: sixteen
characters still go to `redeem_invite`, eight now go to `request_access`, and
`classifyCredential` — which has been able to tell them apart since `5b-ii-b-2` — finally
has somewhere to send both answers. The pending state comes back through
`my_access_requests`, which is `S3` working as designed: the same joiner selecting
`workspace_invite` directly gets **zero rows**, measured against a live database rather
than argued from the policy text.

**Evidence: `docs/checks/5b-iii-b-request-contract.sh`, 11 assertion groups over real HTTP
against a reset database with four real people and two shops, all green; its falsify
harness at 10 fixtures (9 red, 1 control green); `app/test/api-requests.test.ts` inside 389
passing Vitest tests, up from 364; `tsc --noEmit` clean.** ⚠️ **The check drives the `D7`
absorb for real** — a person invited by email who types the SHOP code comes back `joined`
and can read `workspace` a moment later — which is the branch no Vitest assertion can reach
and the reason `useRequestAccess` invalidates the membership read on **every** success.

#### ⚠️⚠️ THE DECISION TAKEN ON THE OWNER'S BEHALF, AND IT IS THE SAME SHAPE `0036` JUST RETIRED

**`request_access` refuses an unknown code with `42501`, and `42501` is also what an absent
session looks like.** `@/api/errors` has mapped it app-wide to *"tu sesión se cerró"* since
`5b-i`; `0029`'s own decision 10 took the collision deliberately — *"`42501` keeps its one
meaning, 'this is not yours', and covers the code that resolves to nothing"* — and that
reading is coherent **inside the database** and incoherent **at the client**. So this screen
had to choose, and **it reads `42501` as the CODE**, on the same argument `5b-ii-b-2` used
one RPC over: `/bienvenida` sits behind `guard.ts`, so a caller here has a session. The
wrong guess costs one confusing sentence and the next launch corrects it; the other way
round leaves a person who mistyped eight characters signing in again, landing back here,
and getting the same sentence forever.

⚠️ **IT IS MEASURED, NOT ASSUMED.** Assertion 9 of the contract check drives an anonymous
caller AND a nonsense code and compares the two answers **to each other** as well as to the
app's own constant — so the screen-local reading is a judgement about who is standing there
rather than somebody not having noticed. ⚠️⚠️ **AND THE ASSERTION IS WRITTEN TO TURN OVER:
the day a SQLSTATE is minted for the unknown code it goes RED on a correct tree**, and is
replaced by its opposite in the pass that deletes `UNKNOWN_CODE` from the app. Fixture `V7`
is that day, simulated. A marker and the assertion that drives it retire together —
`5b-iii-a`'s rule, applied forward this time instead of backward.

⚠️ **This is the THIRD `42501` overload found on this path and the second still live.** The
question it raises is parked in the decisions block above, **and it deliberately blocks
nothing**: the plan's own sizing already refused folding an unrelated SQLSTATE into the name
read's migration — *"they are not the same subject… one migration over two unrelated
functions is harder to falsify and harder to revert"* — so the mint belongs in a task of its
own, not in the one that is next.

#### ⚠️ THE ONE CLIENT REFUSAL THAT RETIRED, AND ITS ASSERTION WENT WITH IT

`checkCredential`'s `'workspaceCode'` branch, `ES.join.issues.workspaceCode` and the Vitest
assertion that pinned it are **all three deleted in this pass** — the arrangement `5b-ii-b-2`
wrote down for this task by name. Eight characters used to produce *"ese es el código de la
tienda, pídele a esa persona que te invite a ti"*, a sentence that existed only because this
app could not spend a join code. ✅ **A new assertion replaces it in the same file**, saying
the string is **gone from `ES` rather than merely unreachable** — an orphaned sentence is
what gets re-wired by somebody reading the strings file and assuming it is still live.

#### ⚠️ THE HARNESS FOUND A WEAKNESS IN THE CHECK, AND IT IS A SHAPE ALREADY ON FILE

Fixture `V1` renames the RPC and was expected to be caught by assertion 2 — the probe that
sends a deliberately wrong ARGUMENT name and expects `PGRST202`. It is not: **a renamed
function answers `PGRST202` too**, because it does not exist at all, so assertion 2 goes
**green on a broken app**. That is the vacuous-green family this repository keeps recording —
*a probe whose expected answer has two causes, only one of which it is testing.* ⚠️ **It is
not a hole**: assertion 4 calls the RPC properly and is red, and `V1`'s needle now names
assertion 4's message. **The fixture was left pointing at the real defect and the weakness
written down, rather than the fixture being quietly reworded to match** — which is how it
would have become a green nobody could account for later.


✅✅ **`5b-iii-a` IS DONE AS OF 2026-09-19 — `0036` IS APPLIED, AND NO MODULE IN THIS APP
MATCHES A SERVER'S PROSE ANY MORE. `5b-iii-b` IS THE NEXT TASK.** `TD004` is the refusal
that has a next step — somebody has already ASKED to join, so the answer is
`approve_request` and not a second invite — and `TD005` is a token that will never work.
`ALREADY_REQUESTED_MARKER` is deleted, `REDEEM_REFUSALS` is re-keyed off `42501`, and the
two contract-check assertions that made those two arrangements safe were retired in the
same pass, which is what this row's own cell had been promising since 2026-09-18.

**Evidence: `supabase/tests/0036_invite_refusal_codes.sql`, 29 behavioural checks against a
reset database, all green; `docs/checks/5b-ii-b-1-invite-contract.sh` and
`docs/checks/5b-ii-b-2-redeem-contract.sh`, 9 assertion groups each over real HTTP, both
green with the new assertions; their two falsify harnesses at 10 fixtures each (9 red, 1
deliberately green); `app/test/api-invites.test.ts` and `app/test/api-redeem.test.ts` inside
364 passing Vitest tests; `tsc --noEmit` clean.** THIRTEEN falsifications were run against
the migration and **all thirteen landed red**. ⚠️ **And all 23 suites in `supabase/tests/` were
run, not just this one — 1,478 checks, 0 red.** That sweep is what found the defect below.

#### ⚠️⚠️ THE DECISION TAKEN ON THE OWNER'S BEHALF, AND IT IS APPEND-ONLY NOW

**`TD005` covers BOTH of `redeem_invite`'s token refusals — an unknown token AND one
somebody else has already spent — and this row named only the first.** Minting for the
first alone would have left the second on `42501`, the client would still have needed
`'42501': 'spent'` in its table, and **the overload this task exists to retire would have
survived the task that was supposed to retire it.** `0028`'s own decision 11 already treats
them as ONE meaning — *"42501 keeps its one meaning, 'this is not yours': an unknown token,
and a token somebody else has already spent"* — and `@/api/redeem` has always given both the
same sentence, because her next step is identical: ask for another code. ⚠️ **Reversing it
is a fix-forward migration, not an edit to an unmerged file.** If the owner wants the two
told apart on screen, that is `TD006` and a second sentence in `ES.join.errors`.

⚠️ **Two things were deliberately LEFT on their old codes, and both are load-bearing.** The
`42501` on `redeem_invite`'s authentication guard stays, which is the point rather than an
omission: after `0036`, `42501` from that function means ONE thing — *"sign in again"* —
which is what `@/api/errors` has always mapped it to app-wide. And the four other `22023`s
in `create_invite` stay, because a bad payload is one meaning reached four ways, which is
`4d-i`'s reuse rule working rather than an exception to it.

#### ⚠️⚠️ THIS MIGRATION SHIPPED A SILENT REVERSION AND ITS OWN SUITE DID NOT SEE IT

**Read this one.** `create or replace` needs the whole function, so the whole function is
transcribed — and **`redeem_invite` had been replaced once since `0028`, by `0034`**, which
added `display_name = coalesce(display_name, auth_full_name(…))` so an invitee ARRIVES
NAMED. The first writing of `0036` transcribed `0028`, and **silently reverted the owner's
ruling of 2026-09-18 in one of the four places it lives.**

⚠️ **Every check in `0036`'s own suite stayed green**, including the transcription guard
written for exactly this class of defect — because that guard watches `create_invite`'s four
surviving `22023`s and knew nothing about a line a LATER migration had added. What went red
was **`supabase/tests/0034` check 2.2 (*"the invitee arrives named"*) and `0035` checks
3.4/3.5**, one directory sweep later. ✅ **That is the argument for running the whole
directory rather than the file you just touched**, and it is why this session ran all 23.

✅ Fixed by transcribing `0034`'s body. **Check 2.6 now re-performs `0035` 6.2's rule inside
`0036`'s own suite**, so the next `create or replace` of either function lands red in its own
file rather than in a sibling's, and `F13` says it can. ⚠️ **The rule this wrote down, for
whoever writes the next `create or replace`: transcribe from the LATEST replacement, not from
the migration that first created the function.** `create_invite` has only ever been `0028`'s;
`redeem_invite` has not been `0028`'s since 2026-09-18.

#### ⚠️ TWO MORE FALSIFICATIONS CHANGED THE SUITE RATHER THAN THE MIGRATION, and both are shapes already on file

**The first is the dangerous one.** Forcing `redeem_invite`'s idempotent branch false made
check 3.3 RAISE inside a bare statement — which **ABORTS the file under `ON_ERROR_STOP`, so
the suite printed no FAIL rows at all** and scored zero red. That is exactly what `0035`
recorded ("an aborted suite prints no FAIL rows, which this repository has already recorded
scoring GREEN one level up"), met again by the next suite written. 3.3 now goes through a
catching helper and the fixture lands red on the check written for it.

**The second is the `S4` family, in a new costume.** The fixture for the restated comments
replaced them with text reading *"the 0028 text, which names no TD004"* — **which contains
the literal string `TD004` the assertion looks for**, so the check stayed green correctly
and the harness reported a guard that could not see its defect. A fixture that does not land
the defect accuses a working check. Fixed by writing replacement prose that does not quote
the marker.

#### ⚠️⚠️ CI CAUGHT A SECOND FIXTURE PINNED TO A MOMENT — `X2`, AND IT WOULD HAVE FIRED THREE TIMES

`5b-iii-split-coverage-falsify.sh`'s `X2` is a CROSS-GUARD fixture: it runs
`plan-handover.sh` against the tree and asserts the next-task marker moved cleanly onto a
child. Its first spelling hard-coded **`agree on 5b-iii-a`** — true on the day the split
landed, and **false the moment `5b-iii-a` closed and the marker moved to `5b-iii-b`.** It
went red in CI on a correct tree.

⚠️ **Bumping the string to `5b-iii-b` would have been the wrong fix**: it fires again at
`b`→`c` and at `c`→`d`, three red runs on three correct trees, which is how a harness gets
edited away by whoever meets it next. The claim was never *"the marker is on `a`"* — it is
**"the marker is on exactly one of THIS SPLIT'S FOUR CHILDREN, and the status log names the
same one"**. `X2` now reads the task name out of `plan-handover`'s own agreement line and
tests it for membership, so the two instruments are compared to each other rather than both
to a constant written here. **Falsified both ways: the marker on `5b-iii-c` is green (a
child), the marker back on the parent `5b-iii` is red.**

⚠️ **AND THIS SESSION'S VERIFICATION GAP IS THE FINDING, NOT THE FIXTURE.** It ran
`5b-iii-split-coverage.sh` and not its harness. **Every `docs/checks/*-falsify.sh` was run
after the repair — all fifteen green** — and a session that edits `docs/PLAN.md` should run
the harnesses of the guards that read it, not only the guards.

#### ⚠️ The two contract-check assertions did not disappear — they were TURNED OVER

Both files had written down, in their own headers, that the assertion retires when the code
lands. Neither was deleted. `5b-ii-b-1` assertion 8 now drives TWO refusals — the approval
one, which must be `TD004`, and a malformed address in the same body, which must still be
`22023` — so it says the codes have **come apart** rather than merely that one of them
fired, and it is strictly stronger than the marker assertion it replaces. `5b-ii-b-2`
assertion 9 used to prove the overload was REAL; it now proves it is GONE, against a live
database, comparing an anonymous caller's code to a dead token's. Each gained a falsify
fixture (`S9`, `U9`) so neither is a green nobody has shown can fail.

⚠️ **`supabase/tests/_cleanup.sql` gained three helper drops** (`_state`, `_pair`,
`_differs`, and `_verdict` after the 3.3 fix), on the day the suite lands, which is the rule
`4f` wrote. This session paid the hour that rule predicts anyway: the second run died on
*"function _state already exists"* instead of on anything real.

⚠️ **`supabase/README.md`'s `0028` row said `42501` for unknown-or-already-spent and that is
now false.** It is amended in place rather than left to rot — the sixth stale-copy defect
this file keeps a count of — and it says which migration moved it.


✅✅ **`5b-iii` IS SIZED `XL` AND SPLIT FOUR WAYS AS OF 2026-09-19, BEFORE A LINE OF IT WAS WRITTEN — AND `5b-iii-a` IS THE NEXT TASK.** ⚠️ **No migration and no app code was written in
this session and none should have been**: `supabase/migrations/` and `app/src/` are untouched, and
this section, five table rows, one new guard, its harness, five handbook rows and the two `app.yml`
steps that run them are the whole of it. **It is the fifth row in this file to be split before it
was taken, the third carrying a migration, and the FIRST to carry two.**

#### ⚠️⚠️ Why it is an `XL` and not the `M/L` the row carried — and the ruler is nine commits, not a feeling

The row's own gate cell has said *"RE-SIZE IT ON THE DAY IT IS TAKEN — IT GREW ON 2026-09-18 AND
AGAIN ON 2026-09-19, BOTH TIMES BEFORE IT WAS TAKEN"* since the day it grew the second time. It was
taken today, and it arrived bigger than both of those readings. **The `M/L` predates both rulings
that are now inside it.**

The house ruler, read off `main` rather than estimated:

| | Commit | What one session looks like |
|---|---|---|
| **A build session** | `8bf3b3e` **1,056** insertions / 7 files | one migration (`0035`), its pgTAP suite, the README numbering entry |
| | `26a53de` **1,670** / 9 | one migration (`0034`), its suite, the paperwork it made false |
| | `ff61122` **1,610** / 12 | one screen, one api module, one contract check and its harness — **no migration** |
| | `d5a45a9` **1,776** / 14 | one screen, one api module, two overloaded SQLSTATEs mapped, a contract check and its harness — **no migration** |
| **A split session** | `a586c52` **642** / 5, `47009ed` **811** / 5, `ee33742` **691** / 5 | a sizing section, the table rows, one guard and its harness |

⚠️⚠️ **`5b-iii` AS ITS ROW DESCRIBES IT IS FOUR OF THE FIRST FOUR.** It ships **two migrations**
with a suite each — the shape of `8bf3b3e` and `26a53de` — **and** two screen halves with their api
modules, contract checks and harnesses — the shape of `ff61122` and `d5a45a9`. Against the house
ruler that is not an `L` wearing a bigger letter; it is **four sessions in one row**, and the two
riskiest things in it (a migration under an automated merge, and a screen decision no test in this
repository can see) would land in the same sitting.

⚠️ **AND IT IS THE FIRST TASK HERE TO CARRY TWO UNWRITTEN MIGRATIONS AT ONCE.** `5b.8` carried one.
`4.6a` carried three and was split three ways for exactly that reason, one migration per child — the
precedent this split follows rather than invents.

#### The seam, and each piece is falsifiable by ONE instrument

| | Takes | Why the line is here |
|---|---|---|
| `5b-iii-a` | The two SQLSTATEs, one migration, the pgTAP suite, and the two prose markers the client matches on today — each retired **with** the assertion that drives it | **The only piece nothing else in the split waits on**, and the only one the owner has already ruled into this step by name. It is a correction to two APPLIED functions, and the whole of it can be falsified with no client in the room |
| `5b-iii-b` | The join-by-code screen, `request_access`, and the pending state through `my_access_requests` | **The joiner's whole half, and it ships no migration** — every function it calls was frozen when `0029` merged. ⚠️ It is a **half loop** and the row says so: she asks, she sees a pending state, and nobody can let her in yet |
| `5b-iii-c` | The `security definer` read that returns a requester's NAME, one migration, its suite | **The ruling of 2026-09-19 has a database half and nothing has built it.** The email is selectable and the name is on no table this caller may read, so this is a migration — and it is the piece where the trade the owner took freezes |
| `5b-iii-d` | The badge, the approval screen, `approve_request`, the location picker and `D8`'s fence | **The row that shuts the loop**, and the only one that needs a sibling: it renders what `5b-iii-c` returns. It ships no migration |

⚠️ **TWO DATABASE CHILDREN AND TWO CLIENT CHILDREN, ALTERNATING, AND THAT IS THE WHOLE SEAM.** `a`
and `c` are falsifiable by pgTAP with no phone in the room; `b` and `d` ship no migration at all. It
is the same line `5b.8` was split on and `5b.8-iii` after it — **reused rather than invented**, which
is the argument for it.

#### Four alternative seams considered and refused

- **Three ways: fold `5b-iii-c` into `5b-iii-d`**, so the name read ships with the screen that
  renders it. Refused on size: that child would then be a migration, a suite, a badge, a list and a
  picker — which is `5b.8-iii`'s exact mistake, re-made four rows later, and that one was split on
  the day it was taken.
- **Three ways: fold the two SQLSTATEs into `5b-iii-c`'s migration**, so there is one migration
  instead of two. Refused: they are not the same subject. The codes correct `0028`'s and the
  redemption RPC's refusals; the read serves the approval. One migration over two unrelated
  functions is harder to falsify and harder to revert, and **`5b-iii-a` is the piece with a
  standing owner ruling behind it** — burying it inside another task's migration is how a ruling
  becomes a detail.
- **Two ways: the database, then everything client.** Refused for the reason `5b.8`'s sizing already
  records — the client half would carry two screens, a badge, two api modules and two contract-check
  pairs, which is the `XL` being split wearing a smaller number.
- **Keep it whole and defer the SQLSTATE fix to `5c` or later.** Refused: the owner ruled it into
  this step on 2026-09-18 and gave the reason — it is **cheap now and dearer once a second caller
  depends on the prose**. Deferring it makes his own ruling false, and every day it waits is another
  day two clients match on a sentence in a server error message.

#### ⚠️ Five decisions taken on the owner's behalf, and the second is the one to look at

| | Decision | Why, and what reversing costs |
|---|---|---|
| **1** | **The seam above, and `5b-iii` stops being takeable** | A sizing judgement, which the working agreement makes the session's job. The four alternatives and why each loses are above. **Reversed by one plan edit** — nothing renumbers, because no migration has been written |
| **2** | ⚠️⚠️ **THE TWO NEW SQLSTATEs ARE `TD004` AND `TD005`, AND THEY ARE THE FIRST THING IN THIS SPLIT THAT FREEZES** | `TD001`–`TD003` are taken. The row says to confirm the numbering against `supabase/README.md` on the day rather than trusting the sentence — but the SHAPE is decided here: **a code of its own, not a `detail` field and not a longer message.** ⚠️ The alternative the client uses today — matching a marker in the server's prose — is the thing being retired, and it is retired because a message is not a contract. **Reversed by one plan edit today; by a fix-forward migration once the client branches on the code** |
| **3** | **The migration order is `a` then `c`, and neither reserves a number** | `5b.8`'s decision 4 already records that a reserved number that was never written has happened twice here. Each child takes whatever is free on the day it is taken. **Reversed by moving one function** |
| **4** | ⚠️ **`5b-iii-b` IS NOT BLOCKED ON `5b-iii-a` and the row says so** | The refusal `a` re-codes belongs to the PUSH path's minting RPC, which the join screen never calls. Putting the migration first is a habit, not a dependency, and stating it wrongly would idle a takeable task. **Reversed by one plan edit** |
| **5** | ⚠️ **`5b-iii-d` IS BLOCKED ON `5b-iii-c`, and it is the only edge inside this split** | The approval row renders a name that is on no table a screen may select. Building `d` first means building it against a read that does not exist — which is `R12` facing the other way, and `5b.8`'s refused seam records the same argument. **Reversed by one plan edit** |

#### The guard, and what it does not do

`docs/checks/5b-iii-split-coverage.sh` is the **sixth generation** of a guard that now watches six
splits. It asserts the parent row and all four children exist, that each child is stated **exactly
once**, that the parent still promises each of the **twelve** deliverables, that each lands in
exactly one child and the assigned one, that the marker-and-assertion rule survives in the child
that ships it, that the refusal of a name column on the request row survives in the child that would
otherwise write it, that `D8`'s silent failure survives in the child that renders the picker, and
that the parent says it is **no longer takeable**. **Sixteen fixtures** in
`5b-iii-split-coverage-falsify.sh` say it can still fail on each.

#### ⚠️ One fixture was GREEN FOR THE WRONG REASON, and it is the shape that reads as a loosened guard

`S4` asks whether the guard sees a deliverable claimed by TWO children. Its first spelling added the
location picker to **`5b-iii-d`** — **the row that already owns it** — so one child still owned it,
the guard stayed green correctly, and the harness reported *"the guard cannot see this defect"*.
⚠️ **A fixture that edits the OWNING row is not testing double ownership at all**, and its failure
accuses a guard that is working. ✅ Fixed by mutating the other child, and the reason is written into
the fixture so the next person who copies this harness does not repeat it. **It is the same family as
the four `Y2`-shaped defects this directory already records: the mutation must land where the defect
would actually be.**

⚠️ **It cannot tell a good split from a bad one.** It cannot see whether `5b-iii-a` is buildable in
one session, and it cannot see whether `TD004`/`TD005` are still free — that is a claim about
applied SQL, and the instrument for it is the pgTAP suite each migration child ships.

⚠️⚠️ **AND THE PREFIX TRAP IS THE WORST INSTANCE YET IN THIS DIRECTORY: `5b-i` IS A PREFIX OF
`5b-iii`, WHICH IS A PREFIX OF ALL FOUR CHILDREN.** Every matcher here takes `| **<task>** |`
**including the closing pipe**, which is what separates them — inherited from the fifth generation,
and fixture `S1` is what says it still holds rather than assuming it. ⚠️ **`X1` and `X2` are
cross-guard fixtures**: `5b-split-coverage.sh` routes five deliverables to the parent row and
`plan-handover.sh` reads the next-task marker, and both are run against this tree to prove four new
rows did not move what they see.


✅✅ **`5b.8-iii-b` IS DONE AS OF 2026-09-19 — A PERSON CAN FIX HER OWN NAME ON A SCREEN,
A CASHIER CAN TOO, AND `5b-iii` IS THE NEXT TASK.** `Tu nombre` is a section on
`app/src/app/ajustes.tsx` that every member sees, whatever their role — which is the
opposite of the two sections beside it, and the whole point: the roster and the invite form
are manager-and-above, and **the person whose Google account arrived as ONE WORD is most
often the cashier who can see neither.** It shipped **no migration**, as its row promised.

**Evidence: `docs/checks/5b.8-iii-b-name-contract.sh`, 8 assertion groups against a reset
database over HTTP with three real people — and TEN falsifications, nine red.** ⚠️ **Not a
green tick**: every call goes through PostgREST under a real `authenticated` JWT with the
PUBLISHABLE key, because the secret key bypasses RLS and the one assertion this whole task
exists for would then pass vacuously. The app suite is **363 assertions over 20 files**, 28
of them new, and `conventions-gate.sh` is green over 38 source files.

#### ⚠️⚠️ THE ASSERTION THE TASK RESTS ON, MEASURED RATHER THAN QUOTED

The argument for `0035` was that `workspace_member_update` (`0001:532`) is owner-only, so a
cashier cannot edit the row that describes her. `0035`'s own pgTAP suite measured that under
`set role authenticated`. What NOTHING had measured is the other half — **that she can now do
it through the app's own wrapper, over HTTP, as herself.** Assertion 8 seats a real staff
member by minting an invite and redeeming it, then has her rename herself and reads her role
back. ⚠️ **A `security definer` function narrowed by a later migration would leave all 363
Vitest assertions green**, and §2.11 refuses the rendering suite that would notice the
section missing.

#### ⚠️⚠️ ONE SQLSTATE, TWO REFUSALS, AND THE DISTINCTION THE PLAN ROW ASKED FOR

`5b.8-iii-a`'s entry below named this as this task's job: *"sign in again"* is not *"this is
not your shop."* ⚠️ **Both are `42501`.** `0035` raises `insufficient_privilege` for an
unauthenticated caller AND for a caller who is not an active member, and PostgREST raises it
a third time for a caller with no grant. There is no distinguishing SQLSTATE, so
`@/api/displayName` matches **a marker in the server's prose** — `NOT_A_MEMBER_MARKER` —
which is normally a defect here and is exactly the compromise `@/api/invites` made one task
earlier. ⚠️ **The default goes to the SESSION sentence deliberately**: guessing wrong that way
costs one confusing sentence the next launch corrects, and guessing wrong the other way tells
somebody standing behind her own till that she has been removed from it. ✅ **Assertion 7
drives that refusal for real and goes red if the wording moves. THE MARKER AND THAT ASSERTION
RETIRE TOGETHER** the day the refusal gets a SQLSTATE of its own — which is a migration, and
`app/**` ships none.

⚠️ **`23514` IS OVERLOADED TOO, AND THIS ONE WAS NEARLY MISSED.** `@/api/errors` maps it
app-wide to *"Escribe el nombre de tu **tienda**"* — `0027` raises it on a blank SHOP name.
`0035` raises the same code on a blank PERSON's name, so the app-wide sentence would have told
a cashier to write her shop's name on a screen about herself. Both overloads are mapped in
`@/api/displayName` and asserted in `app/test/api-display-name.test.ts`.

#### ⚠️ A DEFECT THE HARNESS FOUND IN THE CHECK, AND IT IS THE FOURTH OF ITS SHAPE

The staff fixture's `create_invite` body was inlined inside three levels of command
substitution. Bash mangled it, PostgREST answered `PGRST102 — Empty or invalid json`, and
assertion 8 reported *"could not seat a staff member"*. **RED FOR THE WRONG REASON**, which
reads as the check being broken rather than the app being wrong — and `5b.7`'s check had
already written the rule down: *"a request body is built into a variable first."* ✅ Fixed,
and the check now fails loudly if the invite cannot be minted at all, so a future instance
cannot hide inside assertion 8.

#### ⚠️⚠️ AND A SECOND CHECK WENT RED ON A TREE WITH NOTHING WRONG WITH IT — THE FOURTH TIME THIS HARNESS HAS

`handbook-agreement-falsify.sh` died at SETUP — *"could not read the marked row and the one
after it"* — the moment this task closed. Its `H9` fixture needs a second handbook row to
plant a competing marker in, and it took **the row after the marked one**. Closing
`5b.8-iii-b` moved the marker onto the LAST task row in that table, and the row after it is
the catch-all `| 5d–5h | The rest of the screens | After 5b |` — three plain words with no
bold run to anchor on. ⚠️⚠️ **Its own header already records THREE earlier instances of
exactly this** — a fixture that named a task, one that named a row's punctuation, one that
named a row's current state — under the rule *"a harness reads the file the way the guard
reads it, and asserts nothing about what the file happens to say today."* **The fourth
instance is that it assumed a row FOLLOWS the marked one at all.**

✅ **Fixed: it now searches for the nearest OTHER row that `mutate_row` can reach** — down
first, then up — requiring a bold id that starts with a digit and appears exactly once, and
skipping any row already carrying the marker. ⚠️ **The cheap fix was to bold something in the
`5d–5h` row so the harness could find an anchor**, which is the file bending to the check —
the inverse rule this repository has written down twice, and the one that block already
refuses one paragraph above where it broke.

#### ⚠️ Decisions taken on the owner's behalf — and the first was RULED THE SAME DAY

1. ✅✅ **THE SECTION IS NOT FENCED BY ROLE — every member sees `Tu nombre`. FLAGGED AS A
   DECISION TAKEN ON THE OWNER'S BEHALF AND RULED BY HIM ON 2026-09-19, IN THE CLOSING
   MESSAGE OF THE SESSION THAT TOOK IT: *"everybody is right, keep it."*** ⚠️ **That is the
   working agreement's obligation paying for itself inside one session** — the merge is
   automated, so the report is the only checkpoint left, and this is the shape it exists for:
   a call that was cheap to reverse the day it was made (one predicate) and that decides who
   the whole task was for. The plan row had already said the roster is manager-and-above
   *"while this is for everybody"*, so the session built that sentence rather than inventing
   one — **and it still asked, because a row's phrasing is not a ruling.** ⚠️ **It is now a
   ruling and the code says so**, in `@/strings`'s `myName` block and in `ajustes.tsx`'s
   `MiNombre` header, where the argument for the fence lives and where the next session will
   read it.
2. **It is a NEW `src/api/` module, `displayName.ts`, rather than three functions added to
   `members.ts`.** That file's header says *"NOTHING HERE WRITES A MEMBERSHIP"* — the seam
   `5b-ii` was split on — and this writes one. ⚠️ **What IS borrowed is `nonBlank`, imported
   rather than restated**, because `0035`'s own comment refuses two normalisers for one
   column. **Cheap to reverse.**
3. **`nameOf` inherits `roleOf`'s blind spot and does not fix it.** `MEMBER_COLUMNS` does not
   read `workspace_id`, so neither can tell one shop's membership from another's. ⚠️ **That is
   pre-existing and wider than this task** — `rosterFrom` would already mix two shops' people
   into one list — and every real user has one shop (`0001:317`). **The repair is one column
   and a filter, not a migration.**
4. **No length limit on a name.** `display_name` is `text` with a not-blank CHECK and nothing
   else, so a client rule stricter than the database refuses a name Postgres would have
   stored — and every suite here would agree with it, because the app and its tests would be
   wrong together. A name too long for a roster row wraps; that is `R9`, not a refusal.

⚠️ **AND THE WORKSPACE-SCOPING BILL `5b.8-iii-a` FLAGGED IS NOW VISIBLE TO A PERSON.**
`ES.myName.hint` reads *"Así te ven los demás **en esta tienda**"*, which is the only honest
way to say "one shop" to somebody who does not do book-keeping. **If the fan-out is wanted
instead, that sentence changes with the migration** — it is asserted, so it cannot be
forgotten.

✅✅ **`5b.8-iii-a` IS DONE AS OF 2026-09-19 — `0035` IS APPLIED, A PERSON CAN FIX HER OWN
NAME, AND `5b.8-iii-b` IS THE NEXT TASK.** `set_my_display_name(uuid, text)` is a
`security definer` RPC that writes ONE column of ONE row — the caller's own active
membership in the workspace she names — and there is **no argument that could name anybody
else**. It is the FIFTH writer of `workspace_member.display_name` and the only one allowed
to overwrite a non-null name, which is the owner's ruling of 2026-09-18 — *"keep what they
typed"* — being honoured rather than bent: the rule exists to protect a correction a person
made about herself, and this is her making it.

**Evidence: `supabase/tests/0035_set_my_display_name.sql`, 38 behavioural checks, all green
against a full `supabase db reset` — and SIXTEEN falsifications, FIFTEEN red.** ⚠️ **Not a
green tick**: every call and every refusal runs under `set role authenticated`, because as
the superuser RLS is bypassed and the fence this task exists to route around would pass
vacuously. The whole `db.yml` loop was re-run locally besides — 7 pgTAP suites (779
assertions), 11 seed-check files, 22 behavioural suites — and nothing that was green went
red, including `0034`'s writer census and `0033`'s check 32.

#### ⚠️⚠️ THE MEASUREMENT THE WHOLE TASK RESTS ON, TAKEN RATHER THAN QUOTED

The argument for an RPC is that `workspace_member_update` (`0001:532`) is
`has_role(workspace_id, 'owner')`, so a manager cannot edit the row that describes her.
**That was read out of a migration file, which §9 says is not evidence.** Check 5.2 measures
it: a manager, under `set role authenticated`, updating her own `display_name` directly —
**zero rows moved**. 5.3 is the same person reaching for `role` — **zero rows**. And 2.5 is
the control that stops 5.2 passing for the wrong reason: the SAME manager, the SAME row,
through the function, is renamed. **An update that is refused and an update that matched
nothing look identical from a row count; the pair is what says which happened.**

#### ⚠️⚠️ TWO FALSIFICATIONS CHANGED THE SUITE RATHER THAN THE MIGRATION, AND BOTH WERE THE CHECK BEING WEAKER THAN IT READ

* **The `auth.uid() is null` guard was unfalsifiable.** Deleting it turned NOTHING red — an
  unauthenticated caller matches no row and falls out of the same `42501` as a non-member.
  ✅ Check 4.10 now asserts the MESSAGE, not the state alone, and **that is also the
  distinction `5b.8-iii-b` has to show a person**: *"sign in again"* is not *"this is not
  your shop."*
* ⚠️⚠️ **The overload mutation ABORTED the file instead of failing a check.** Checks 1.2
  and 1.4 used scalar subqueries over `pg_proc`, so a second function of the same name
  raised *"more than one row returned by a subquery"* — and **1.3, the check written for
  exactly that defect, never got to record a FAIL.** An aborted suite prints no FAIL rows,
  which is the shape `0034`'s own harness recorded scoring GREEN one level up. ✅ Both now
  aggregate, **condition and DETAIL alike** — the detail column is as capable of killing a
  file as the condition is — and the overload lands on 1.3 where it belongs.

#### ⚠️ The sixteenth is GREEN, and it is recorded rather than hidden

Deleting the restated `comment on column` turns nothing red. **A comment is not reachable
from a behavioural assertion**, and the restatement is there because `0034` wrote the write
rule on the column as an unqualified sentence that section 1 of `0035` makes incomplete.
Nothing in this repository can hold that; it is held by a diff and by this paragraph.

#### ⚠️ Decisions taken on the owner's behalf, and the first is the expensive one

1. ⚠️⚠️ **`set_my_display_name` IS WORKSPACE-SCOPED — it fixes the name in ONE shop.** This
   was flagged when the row was split and it is now **applied**, which is the moment it
   freezes: the signature is deployed. **The bill is measured rather than described** —
   check 3.5: the same person in two shops fixes her name in one, and the other still holds
   the old one, and she is not told. It costs nothing today (every real user has one shop)
   and it is the reversible direction. **Say so if the fan-out is wanted instead: it is a
   fix-forward migration now, not a plan edit.**
2. **It returns the STORED (trimmed) name rather than `void`.** `5b.8-iii-b` renders what
   came back instead of what it sent, so a screen cannot diverge from the database by a
   space nobody can see. Cheap to change.
3. **ADR-035 §2.3 was amended in the same pass** — the paperwork with the schema, §9's rule
   pointed at the ADR. ⚠️ **Nothing in it became FALSE**, which is why the amendment is
   additive: §2.3 already promised *"a correction a person made about themselves"* and named
   no way to make one. It now names the function and, in one line, why it is not the policy
   anybody would reach for first.

#### ⚠️ What it does NOT do, and it is the whole of what a person can see

**Nothing.** `0035` ships no screen and nothing calls it. The gap `5b.8-ii` opened — a
Google account that arrived as one word, on the roster, unfixable — is repairable in the
database and **still not repairable by a person** until `5b.8-iii-b` merges. That is the
same half-loop `0034` shipped with, drawn on the same seam, and it is why the split guard
insists the second child claims no migration.


⚠️⚠️ **`5b.8-iii` IS SIZED `L` AND SPLIT IN TWO AS OF 2026-09-19, BEFORE A LINE OF IT WAS
WRITTEN — AND `5b.8-iii-a` IS THE NEXT TASK.** ⚠️ **No migration and no app code was written in
this session and none should have been**: `supabase/migrations/` and `app/src/` are untouched, and
this section, three table rows, one new guard, its harness and the two `app.yml` steps that run
them are the whole of it. **It is the fourth row in this file to be split before it was taken, and
the second one carrying a migration.**

#### ⚠️⚠️ Why it is an `L` and not the `M` the row carried — and the ruler is two commits, not a feeling

`5b.8` was split three ways precisely so a migration and a screen would not land in one session.
Both halves are now on `main` and each was a full session:

* **`5b.8-i`** — 1,670 insertions across 9 files. One migration (`0034`, 781 lines), one pgTAP
  suite (604 lines), the README numbering entry.
* **`5b.8-ii`** — 893 insertions across 15 files. One api module change, one screen, one app test,
  one contract check and its harness.

⚠️⚠️ **`5b.8-iii` AS ITS ROW DESCRIBES IT IS BOTH OF THOSE.** It ships a `security definer` RPC and
a pgTAP suite over it — the shape of `5b.8-i` — **and** a control on `ajustes.tsx` with its api
call, its strings, its app test and its contract-check pair — the shape of `5b.8-ii`. Against the
house ruler (`5b-ii-a`, an `M`, **`b082e83` — 2,288 insertions across 20 files**) the sum is over
it, and it is over it in **two different actors**: the database and the client. **That is the seam,
and it is the same one `5b.8` itself was split on** — which is the argument for reusing it rather
than inventing one.

⚠️ **THE GATE CELL ORDERED THIS.** `5b.8-iii`'s own right-hand cell has said *"IF IT IS DEFERRED,
RE-SIZE IT ON THE DAY IT IS TAKEN"* since 2026-09-18, naming `4e`, `4.6a` and `5b.8` as the three
rows that record a deferred half arriving bigger than it left. It was deferred past `5b-iii`'s
block, it was taken today, and it arrived bigger. **The cell was right.**

#### ⚠️⚠️ One decision taken on the owner's behalf, and it is the cheap-now-expensive-later kind

**`set_my_display_name` IS WORKSPACE-SCOPED — it takes `p_workspace_id` and fixes the name in ONE
shop.** `my_workspaces()` returns `setof uuid` and `0001:317` says many-workspaces-per-user *"works
from day one even though every real user has exactly one"*, so the alternative — one call that
rewrites every membership row the caller owns — is a write that crosses a tenant boundary, in the
one place this schema spends all its effort not crossing. **It costs nothing today** (every real
user has one shop) **and it is the reversible direction**: a scoped call can later fan out over
`my_workspaces()`; an unscoped write that has already run cannot be un-run. ⚠️ **What it buys the
owner a bill for later**: the day somebody genuinely runs two shops, fixing her name in one leaves
it wrong in the other, and she is not told. **Flagged here rather than assumed silently — say so if
the fan-out is wanted instead, and it is one plan edit today and a fix-forward migration after.**


