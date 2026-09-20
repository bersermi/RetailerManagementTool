# Archived status log — 2026-09-18 and earlier

⚠️ **THIS IS PART OF THE PLAN, NOT A BACKUP OF IT**, and it is **closed, not wrong**
— the same distinction as [`steps-0-to-4.5.md`](steps-0-to-4.5.md), and the opposite
of `archive/power-platform/`, which describes a system nobody is building. Every
entry here was true when it was written and still describes this system.

Cut out of `## Position` in `docs/PLAN.md` on 2026-09-20. **Nothing was edited,
summarised or reordered** — these are the original lines in their original order,
and the split was verified by rebuilding the source file and confirming it came
back **byte-identical**.

## Why Position had to be cut at all

`## Position` had reached **5,484 lines** and was the largest single thing a session
read — larger than the whole of Step 5. It is the section the working prompt sends
every session to FIRST, so its size was a tax on every session, paid before any work
began. Almost all of it was the **status log**: a reverse-chronological narrative
entry per closed task, forty of them, growing by one or two every session and never
shrinking.

⚠️ **The two blocks that carry live obligations did NOT move and never should.**
`### ⛔ DECISIONS OWED BY THE OWNER` and `### ⏳ DATES OWED` stay in `docs/PLAN.md`,
because `docs/checks/plan-handover.sh` requires **exactly one** of each **in the live
plan** and a second copy anywhere it reads would be a second home for one claim —
which is the defect this repository has had six of.

## What is in here

Status-log entries for **2026-09-18 and earlier**, back to 2026-09-04: the whole of
`5b.8`, `5b-ii`, `5b.7`, `5b.5`, `5b.6`, `5b-i`, `5b`, `4.6a`/`4.6b`/`4.6c`, the
`5a-iv` device readings, and the Step 4/4.5 closures — with every owner ruling
recorded on the day it was made.

⚠️ **The rulings are the part worth knowing is here.** A decision about what a screen
renders has no constraint, grant or policy to live in (§2.11 keeps rendering out of
scope), so for several of them **the plan is the only record that exists**. They are
also transcribed into `docs/checks/specs/*.split` as deliverables, which is where a
machine can see them — but the reasoning behind each one is only here.

## How to find something in here

**Do not page through it.** In order of cost:

1. **`graphify query "<question>"`** — the archive is indexed, and results carry
   their file, so an answer sourced from `docs/plan/archive/` is by construction
   about CLOSED work. Check the file name before citing it as current.
2. **`grep -n '<task-id>' docs/plan/archive/status-log-through-2026-09-18.md`** — the
   entries are titled `✅✅ **<task> IS DONE AS OF <date>**`.
3. **`bash docs/checks/plan-corpus.sh`** — assembles the live plan plus this
   directory into one file, which is what every split guard already reads. A task
   row resolves from here exactly as it did before the cut.

## If a closed task reopens

Same rule as the other archive, and the guards enforce it: **move the entry, never
copy it.** Two homes for one claim is the defect. Cut from here, paste into
`docs/PLAN.md`, say why and on what date, then run
`bash docs/checks/split-coverage.sh --all` — a duplicated row fails on *"row appears
2 times"*, which reads the corpus and therefore sees both copies.

⚠️ **A schema change in reopened work is a fix-forward migration** with the next free
number. Migrations are append-only once applied; moving text between two Markdown
files cannot un-apply anything already deployed.

---

✅✅ **`5b.8-ii` IS DONE AS OF 2026-09-18 — THE ROSTER SHOWS THE NAME, THE
2026-09-14 EMAIL RULING IS SUPERSEDED ON A SCREEN, AND `5b.8-iii` IS THE NEXT TASK.** `rosterFrom` has a fourth identity rung — *you*, then the **name** on the
membership, then the email off the invite, then the role — and `MEMBER_COLUMNS`
asks for `display_name`, which is the line that ended `0034`'s own closing
sentence, *"NOTHING READS THE COLUMN"*. ⚠️ **No migration**, which is what made
this the safe place to move a sentinel two guards depend on.

**Evidence: `docs/checks/5b-ii-a-roster-contract.sh`, now NINE assertion groups,
all green against a full `supabase db reset` — and its harness raised from eight
fixtures to ELEVEN, 8 red and 3 green.** ⚠️ **Not a green tick**: the two new
groups are round trips over HTTP under `set role authenticated`, and the two new
red fixtures include one that edits an applied POLICY.

#### ⚠️⚠️ THE ROW SAID IT RETIRED TWO SENTINELS. MEASURING THE SECOND IS WHAT STOPPED IT

This task's row named both halves of the 2026-09-14 ruling and called itself
*"the child that retires the sentinels"*. **One half was superseded and the other
was measured and left standing**, and the difference is not a nuance:

* **The member list.** `workspace_member.display_name` is on the row the roster
  already reads. `5b-split-coverage.sh` and `5b-ii-split-coverage.sh` now route
  *"identified by the NAME"* where they routed *"identified by EMAIL"* —
  **replaced, not deleted**, because a decision about what a screen renders still
  has no constraint, grant or policy to live in, which is the whole argument for
  the sentinel being there.
* ⚠️⚠️ **The approval row. STILL TRUE, ON A REASON THAT REPLACED THE ONE IT WAS
  RULED ON.** A pending request is a `workspace_invite` row with `requested_by`
  set (`0029:296`), and the person asking **has no `workspace_member` row at all**
  until `approve_request` writes one (`0029:455`). So no membership carries their
  name while the approver is looking. **`T1` died; the outcome did not.** Retiring
  this sentinel because its twin was retired would have deleted a live guard over
  the operative rule for a screen that has not been built yet — and the guard is
  the only thing holding it, because §2.11 bans the rendering suite that would
  otherwise catch a name appearing.

⚠️ **A DECISION IS PARKED IN FRONT OF `5b-iii` RATHER THAN TAKEN HERE**: a name
IS now reachable for a requester, through `public.auth_full_name(requested_by)`
(`0034:122`). Whether the approver should see one is the owner's, it is cheap
today and a second pass over a suited screen later, and it is in the decisions
block above.

#### ✅✅ RULED 2026-09-19 — THE EMAIL IS THE HEADER AND THE NAME IS THE SUBTITLE

The owner's words: ***"Show the Email as a Header and the Name as a subtitle of
the request."*** ⚠️⚠️ **AND THE ANSWER WAS NEITHER OF THE TWO A SESSION WOULD
HAVE REACHED ON ITS OWN**, which is the whole case for parking it. The brief
above put it as *email, or name?* — leave the 2026-09-14 ruling standing, or
supersede it the way its twin had been superseded that morning. **He took both,
in a stated order**, and the order carries the argument: the email is what you
VERIFY against what somebody read out to you over WhatsApp, and the name is what
stops you approving the wrong one.

⚠️ **THE SENTINEL LASTED ONE DAY AND MOVED AGAIN, IN THE COMMIT THAT RECORDED THE
RULING.** `5b-split-coverage.sh` now routes *"EMAIL as the header"* to `5b-iii`
where it routed *"approver sees an EMAIL"*, and `Y10` — written the day before to
protect the sentence that was left standing — follows the guard's new wording.
**Both halves of the 2026-09-14 ruling are now superseded, on different days, by
different arguments, and neither was retired by analogy with the other.**

⚠️⚠️ **WHAT IT COSTS `5b-iii`, NAMED SO THE SIZING DOES NOT REDISCOVER IT.** The
email is already reachable — a manager may select the request row (`0002:563`) —
and **the name is not**: the requester has no membership until the approval RPC
writes one. So the approval read becomes a `security definer` function with a
suite and falsifications of its own, on a row that already says *re-size it on the
day it is taken*. ✅ **A definer read is recommended over a name column on the
request row**, because that table also holds push-path invites whose invitee may
have no account at all — a column meaning one thing for a request and nothing for
an invite is the shape this repository has twice recorded going wrong — and
because a read stays current when somebody later corrects their own name.

⚠️ **AND THE TRADE IS RECORDED RATHER THAN LEFT IMPLICIT: a person's name now
reaches somebody who has not admitted them to the shop**, on the strength of them
having typed the code. That was the argument against, it is in the brief, and he
ruled anyway. ⚠️ **A missing name is silent** — the metadata is nullable, so the
row is the email and nothing under it, which is the ladder's own floor and not an
edge case anybody is told about.

#### ⚠️ Three claims in the tree went false the moment the read changed

None of them is in a file this task's row named, and all three are the paperwork
kind that goes stale silently:

* `app/src/api/members.ts`'s header — *"a staff caller reads the roster and can
  identify NOBODY on it"*. The row already knew about this one and routed it
  here. ✅ Corrected, with `0034`'s section-7 measurement quoted beside it.
* `canSeeRoster`'s own doc comment, which gave **that same dead sentence as the
  REASON for the manager fence**. ⚠️ The fence is right and its argument was not:
  it now rests on the half of the asymmetry that did not move — this sheet
  carries the invite button, and `workspace_invite` is manager-and-above.
  `ajustes.tsx`'s header carried a third copy of the same argument.
* `src/strings.ts` — *"NO NAME APPEARS ANYWHERE HERE, AND THAT IS A RULING"*.
  Still no name in that file, now for a different reason: a name is DATA and
  never a string, so there is nothing there to translate.

#### ⚠️⚠️ AND THE HARNESS CAUGHT THE TENTH INSTANCE OF THE OLDEST RULE HERE

A sentence written into `5b-iii`'s row for this entry spelled `C11.8` a second
time — in prose explaining the parked decision. `5b-split-coverage.sh` stayed
**green**, because it only needs the deliverable in exactly one child and it was.
**`5b-split-coverage-falsify.sh` went red**: fixture `Y2` removes that badge from
`5b-iii` to prove the guard sees a misrouting, and with a second copy in the row
the guard reported *"owned by neither"* instead — red for the wrong reason, on a
fixture that had nothing to do with this task. ⚠️ **The tenth instance of *never
spell a check's sentinel in the file it reads*, and the first one caught by a
HARNESS rather than by a check.** The sentence was reworded; `Y2` behaves again.

#### ✅ Both harnesses moved with their guards, and one of them had no floor

⚠️ **The replaced sentinel had never had a fixture of its own** — in either
harness. It was covered only by the generic dropped/misrouted shapes, which means
nothing had ever proved either guard could fail on that entry, and **replacing an
unfalsified assertion with another unfalsified assertion is a retirement resting
on nothing**. ✅ `Z9` and `Y9` now falsify the new wording; ✅ **`Y10` falsifies
the half that was NOT retired**, which is the foreseeable mistake — a session
that reads *"the EMAIL ruling was retired"* and deletes both.

⚠️⚠️ **AND `5b-split-coverage-falsify.sh` HAD NO ANTI-VACUITY FLOOR AT ALL.** It
reports success on `fails == 0`, which is also what a harness that stopped
running fixtures prints — rule 4 of this repository, missing from the one file
whose entire job is rule 4, and the exact shape that left
`conventions-gate-falsify.sh` dead for a day with both scripts still green. ✅ It
now refuses to pass on fewer than eleven.

#### ✅ What this does NOT do, stated so it is not mistaken for covered

⚠️ **Nothing here can see the roster on a phone.** §2.11 refuses suites over
rendering, so that `Miembro` puts the name on the first line and the role
underneath it is the owner's own eye, as ever. What IS measured is that the
database hands a real session the name, and that the ladder picks the right rung
from the rows it is handed.

⚠️ **AND NOTHING CAN FIX A WRONG NAME YET.** `workspace_member_update` is
owner-only (`0001:532`), so a Google account that arrived as one word now shows
that one word to everyone and its owner cannot change it. That is `5b.8-iii`, it
is the next task, and it is the half `5b.7` shipped on the promise of.


✅✅ **`5b.8-i` IS DONE AS OF 2026-09-18 — `0034` IS APPLIED, EVERY WAY INTO A SHOP
STORES A NAME, AND `5b.8-ii` IS THE NEXT TASK.** `workspace_member.display_name` exists
on the table a phone can already select, and **all four** applied membership writers fill
it from `auth.users.raw_user_meta_data ->> 'full_name'` — the key `5b.7` shipped and the
key Google's provider already used. ⚠️ **Nothing displays it**, which is the half loop the
split named out loud: the roster is `5b.8-ii` and the self-edit is `5b.8-iii`.

**Evidence: `supabase/tests/0034_member_display_name.sql`, 31 behavioural checks, all
green against a full `supabase db reset` — and SIXTEEN falsifications, fifteen of them
red.** ⚠️ **Not a green tick**: the whole local gate was run by name — seven pgTAP suites,
eleven seed checks and twenty-one fixture suites, `1 262` behavioural checks in total —
because this migration replaces four functions that three existing suites assert over.

#### ⚠️⚠️ The row named two membership writers and the applied schema has four

`R1` and `R2`, found by reading `0029` rather than this file: `request_access` writes a
membership inside `D7`'s fast path — somebody already invited who types the shop **code**
instead of the token — and `approve_request` writes one too, and **is `5b-iii`'s own
RPC**. Both are in `0034`. Shipping the two the row named would have meant every person
joining by the pull path arrives nameless, and the repair is a fix-forward migration
**plus a second backfill over the rows made in between**.

⚠️⚠️ **AND THE FOURTH WRITER BROKE THE ROW'S OWN PHRASING.** It says the name comes
*"from the caller's own `raw_user_meta_data`"*. That is true of three writers and would
be a **bug** in `approve_request`, where the caller is the OWNER approving and the
membership belongs to the JOINER — the one place in this schema where those are different
people, which is the same asymmetry `D4` renamed a column for. `0034` reads it off
`requested_by`. **Check 2.5 is the one that would catch the other reading**: 2.4 asserts
a name is present and would have passed on the approver's name, because it is a name and
it is not null.

#### ⚠️ A guard that had been true since 2026-09-14 went red, in a file nobody had looked at

`R6` named `supabase/README.md`'s prose — *"no human name for `created_by` exists anywhere
in this schema, because … `workspace_member` carries no name column"* — and did not know
**the claim had a machine-readable twin**: `supabase/checks/0033_transaction_export.sql`
check 32 asserts it over the seed, and it went **red on the first full gate run after the
column landed**, by name.

✅ **Re-cut, not bumped** — `0032`'s recorded lesson one migration earlier. The claim it
carries is still true and is now **stronger**: the month export names nobody while a name
sits **one join away**, so it asserts a property of the VIEW (it reads neither
`auth.users` nor `workspace_member`, and carries no person-shaped column) and stays red on
exactly the change the sentence forbids. ⚠️ **Falsified both ways**: joining
`workspace_member` for a name → red; dropping `display_name` → red, because the *reason*
must stay current too. ⚠️ **The first re-cut was itself wrong** — it banned any column
matching `%name%`, and this view carries four (`location_name`, `provider_name`,
`variant_name`, `family_name`), none of them a person. **A check that goes red on a
correct tree is the failure mode this repository records most**, and it was caught by
running the gate rather than by reading the file.

#### ⚠️⚠️ The falsification harness had the defect it exists to find

Its first version scored a fixture GREEN because the suite **aborted before its report**
and printed no `FAIL` rows — *a check that did not run is indistinguishable from a check
that passed*, one level up from where this file usually records it. ⚠️ **A second harness
defect came first and was worse**: it restored between fixtures with `create or replace`
against the live catalog, `git checkout` on files git had never seen, and **four fixtures
reported failures belonging to the fixture before them.** Both are fixed — every fixture
now mutates a FILE and runs a full `supabase db reset`, and a run that does not reach its
report is scored **red**.

#### ⚠️⚠️ And the handbook guard — one day old — fired for real, then its harness went stale

`handbook-agreement.sh` shipped on 2026-09-17 and went **red on this session's first
run**: the plan said `5b.8-i` was done and `docs/HANDBOOK.md` still called it the next
piece of work. ✅ **That is the guard doing exactly the job it was written for**, one day
after it was written, and the file the owner actually reads was corrected instead of
drifting — which is what it cost `5b-ii-b-2` four days.

⚠️⚠️ **THEN ITS OWN HARNESS FAILED, AND THE REASON GENERALISES.** Three of
`handbook-agreement-falsify.sh`'s eleven fixtures edit *the row that carries the handbook's
next-work marker*, and they found that row by **spelling `5b.8-i`** — true the day the
guard shipped. The moment the marker moved one row they reported *"anchor not present"*.
The harness refused to score a failed setup as a pass, which is the half that worked; the
half that did not is that **a fixture pinned to a task NAME needs hand-repair on the day
of every task closure between here and step 6**, and it goes stale in the direction that
costs a session an hour with nothing actually wrong. ✅ **Fixed by discovering the marked
row and the row after it the way the GUARD reads them** — the three fixtures now name no
task at all. **All eleven behave as recorded again.**

⚠️ **This is a fifth instance of the rule about prose and checks, pointing the other way**:
the earlier four were *never spell a check's sentinel in the file it reads*. This one is
**never spell the file's moving parts in the check's harness.**

#### ✅ Twelve red, and the thirteenth is green and is recorded rather than hidden

⚠️ **`F13` — deleting the migration's backfill statement turns NOTHING red.** The
backfill runs over **zero rows in CI** (`db reset` applies migrations before the seed, as
`0027`'s did), and a statement over zero rows leaves no trace any assertion can read;
section 5 of the suite re-performs a **copy** of it, so the copy is what the falsification
reaches. **What IS falsifiable**: the write rule inside it (`F12`, `where display_name is
null` removed → red) and the guarantee itself (5.1–5.4). **What no check in this
repository can see is the statement's presence in the file** — that is a one-line reading
in a diff, and it is named here so it is not mistaken for covered. This is the same shape
`0033` recorded when one of its ten falsifications came back green.

#### ✅✅ RULED 2026-09-18, AFTER THE WORK MERGED — THE NAME IS MEMBER-LEVEL, ON PURPOSE

The session raised it and the owner answered *"do as you recommend"*, so it is recorded as
**his ruling taken by delegation** rather than as a call made quietly on his behalf — the
distinction this block exists for.

⚠️⚠️ **THE QUESTION WAS SHARPER THAN IT FIRST LOOKED, AND MEASURING IT IS WHAT SHARPENED
IT.** `0034` moves no policy, so nothing in its diff says who the column reaches. But
`workspace_member_select` (`0001:532`) admits **any active member**, while the roster SHEET
is manager-and-above by the ruling of the same date (`canSeeRoster`, `app/src/api/members.ts`).
**Before `0034` that gap was harmless**: `members.ts` says in its own comment that a staff
caller reading this table *"can identify NOBODY on it"*. **After `0034`, the same read
carries names. The gap did not move — what travels through it did.**

✅ **Measured, not argued**, under `set role authenticated`: a cashier reads **every name in
her own shop, the owner's among them**, and **zero rows from another shop**.

**The ruling: leave it.** ⚠️ **There is no cheap fence.** Postgres has no column-level RLS,
so the three moves available are (a) a **column GRANT**, which ADR §2.7 argues against **by
name** — `supabase gen types` still emits the column, so a staff read compiles clean and
fails at runtime in front of a customer; (b) a **second view**, which is a second copy of
the roster and this repository's most-recorded defect; (c) **narrowing
`workspace_member_select`**, which is the read behind every member's own role lookup and
`rosterFrom`'s join. All three are a migration with blast radius, bought to hide a
coworker's first name from somebody standing at the same counter who can ask.
**The boundary that carries the weight is the tenant one, and it holds.**

✅ **So it is PINNED rather than fenced.** Section 7 of `supabase/tests/0034` is three
checks — the cashier reads the names (7.1), reads nothing across the tenant line (7.2), and
`workspace_member` still has exactly ONE select policy with its original predicate (7.3),
read out of `pg_policies` rather than out of the migration. ⚠️ **Falsified three ways**:
narrowing the policy to manager → red; widening it to `true` → red; dropping it → red. **A
later session that moves that policy is then making a visible decision instead of a quiet
one**, which is the only thing prose could not buy.

⚠️ **ROUTED TO `5b.8-ii`, NOT FIXED HERE**: `app/src/api/members.ts`'s comment — *"a staff
caller reads the roster and can identify NOBODY on it"* — is still true of what the APP
asks for (`MEMBER_COLUMNS` has no name in it) and is no longer true of the POLICY. **That
file is the one `5b.8-ii` edits**, and `5b.8-i` ships no client code; correcting it here
would break the seam the split was made on. It is named in that row so the next session
does not have to re-derive it.

#### ⚠️ Six decisions taken on the owner's behalf, and the second is the one to look at

| | Decision | Why, and what reversing costs |
|---|---|---|
| **1** | ⚠️⚠️ **`approve_request` reads the name off `requested_by`, not `auth.uid()`** | The row said *"the caller's own"*. Following it literally stamps the approver's name onto everybody she approves, and the roster then shows one person four times. **Reversed by one word — and after anyone has joined by the pull path, also by a repair over their rows** |
| **2** | ⚠️⚠️ **ONE READER OF `auth.users`, `auth_full_name(uuid)`, RATHER THAN THE EXPRESSION COPIED INTO FOUR BODIES** | Four copies of one rule is this repository's most-recorded defect wearing SQL: the day the key or the normalisation changes, three of them get edited. It is `security definer`, granted to **nobody**, asserted from `pg_proc.proacl` (check 1.6) — but it IS a new function over `auth.users` that the row did not name, which is why it is flagged rather than mentioned. **Reversed by inlining it into four bodies, which after `0034` is a migration** |
| **3** | **The column is NULLABLE, with a not-blank CHECK** | An account whose provider returned nothing must still be ADMITTED, and `5b-ii-a`'s ladder already falls back to the role. `''` is the state that breaks that ladder silently — a name that is present and renders as a gap — so it is refused by a constraint rather than by four function bodies. **Reversed by a migration** |
| **4** | **The four `comment on function` blocks were left alone** | None of them becomes FALSE — they say these functions write `workspace_member`, which is still exactly what they do. A fifth copy of the write rule is a fifth copy to keep true; it lives on the column's own comment and in `0034`'s header. **Reversed by a `comment on`, which is cheap** |
| **5** | ⚠️ **Check 1.9 asserts that EXACTLY FOUR functions in `public` insert `workspace_member`** | `5b.8-split-coverage.sh` says in its own prose that it cannot see a fifth writer appearing, because it reads this file and a function is not in it. 1.9 reads `pg_proc.prosrc` instead, so **a fifth writer lands red on the day it is written** — which is the only instrument that would have found `R1` and `R2` three tasks earlier. ⚠️ It is a regex over a function body and will go red on a legitimate fifth writer too; that is the intended cost. **Reversed by deleting one check** |
| **6** | **`supabase/tests/_cleanup.sql` gains drops for `_name` and `_role`** | The rule `4f` wrote and every suite since has followed: a helper a suite creates goes in that file **on the day the suite lands**, because the suite's own drop is unreachable in exactly the case that matters — an abort. It cost this session one run to relearn. **Reversed by two lines** |

⚠️ **AND ONE CORRECTION TO A ROW RATHER THAN A DECISION**: the `5b.8` row said `ADR-035
§2.7` describes `workspace_member`'s columns. **It does not — §2.3 does**, and §2.7
describes `workspace_invite`'s. The ADR wins, the row is corrected, and **nothing about
what was built changed**: the same three sentences are amended either way, and all three
were amended in this pass. ⚠️ `create_invite` *"under normal RLS"* was **never** true of
the applied schema — it has been `security definer` with a manager fence in its body since
`0028` — so that sentence is struck rather than updated.

✅✅ **RULED BY THE OWNER 2026-09-17 — *"`Quitar` doesn't get an Undo."* NO UNDO, AND NO
CONFIRMATION DIALOG EITHER.** Removing a line from the carrito is immediate and final, and the
recovery is the one already on screen: **re-adding the item is two taps on the list behind the
sheet.** ⚠️ **It is the option that ships nothing**, and it is the model's recommendation taken as
recommended — the two alternatives were a **timed** *Deshacer*, which fails exactly the users
C3.18 exists for, and a confirmation on every removal, which is the book-keeping the owner's own
rule refuses to hand a shopkeeper. ✅ **`Vaciar carrito` keeps its confirmation** and is untouched
by this: emptying the whole basket is a different act from removing one line, and it is the one
the owner asked to guard.

⚠️⚠️ **AND THE RULING EXPOSED THAT THE QUESTION HAD BEEN PARKED AGAINST THE WRONG TASK.** It was
filed as blocking **`5h`**. `5h` is *Vender* — `price_list` prefill, the `$0.00` amber path, the
50-centavo ceiling, `record_sale`. **The carrito, its rows and the `Quitar` control are `5f`**, the
shared transaction screen, which is where *basket sheet* is actually listed. ⚠️ **No damage,
because it was ruled before either task was taken** — but it is this repository's own recorded
defect wearing a new hat: **a row describing work it does not do.** Had it gone unanswered, the
`5f` session would have built the carrito **without ever seeing the open question**, and `5h`
would have carried a decision about a control it does not own. ✅ **The ruling is written into the
`5f` row**, where the person who builds it will be standing.

⚠️⚠️ ~~**THE NÚMEROS QUESTIONS ARE HALF-ANSWERED, AND IT IS THE EXPENSIVE HALF — 2026-09-17.**~~
**SUPERSEDED 2026-09-18 BY THE OWNER'S OWN READING OF WHAT HE HAD SAID: *"I decided it's not
about how it looks since we were making style corrections at that time."*** The clause was
about the aesthetic round, and this entry inferred a reopened área 9 and a fix-forward
migration from it. ⚠️ **Kept rather than deleted, because it is the clearest example in this
file of the model reading a decision INTO a remark** — and the correction cost one message.
The entry below is left exactly as it was written:**
*"Not about how it looks."* That settles which KIND they are and nothing else: they are about
**what Números measures**, so **área 9 reopens**, `0031`–`0033` are already applied against its
answers, and a change there is a **fix-forward migration**. ⚠️ **The row stays in the decisions
block** because the questions themselves are still unstated and only the owner has them. **It
blocks nothing takeable today.**

✅✅✅ **ÁREA 9 IS CLOSED AND THE DECISIONS BLOCK IS EMPTY — RULED BY THE OWNER 2026-09-18.**
*"I decided it's not about how it looks since we were making style corrections at that time, we
have already set the measures and would stick to see the Números screen in our Pilot and
enhancing anything needed later."*

⚠️⚠️ **THE HALF-ANSWER OF 2026-09-17 WAS CONTEXT, NOT A CLUE, AND THIS SESSION HAD READ IT THE
EXPENSIVE WAY.** *"Not about how it looks"* was said during the aesthetic round, about the
aesthetic round. The plan turned it into *"so they are about what Números MEASURES, which
reopens área 9"* — **a whole reopened area, `0031`–`0033` put back in play, and a fix-forward
migration anticipated — inferred from one clause spoken about something else.** ✅ **Nothing
reopens. The measures are the ones already ruled and already applied.**

**What this settles, concretely:**

- ✅ **The `A3` ruling of 2026-09-14 STANDS** — *"we won't derive the profit so let's ignore
  margins for now. I'd rather just show total revenue."*
- ✅ **`0031`, `0032` and `0033` STAND AS APPLIED.** No fix-forward migration, and **no ADR
  §2.9 amendment is owed** — the section already describes what shipped.
- ✅ **The Números screen is UNBLOCKED** and is built against the applied views: gross revenue
  on `product_velocity_daily`, purchases per variant and family per day, price over time, the
  month export, and velocity as quantity.
- ✅ **The enhancement loop is the PILOT, not another interview.** He will look at a real
  screen in a real shop and say what is missing. That is the cheapest possible instrument for
  a question CI provably cannot answer — *"is this the number a shopkeeper wanted?"*

#### ⚠️⚠️ One consequence of this ruling that the builder of that screen must meet, carried here rather than discovered there

⚠️ **The ruling settles WHICH measures. It does not repair a measure the brief already
recorded as broken, and one of them still is.** Área 9's brief (2026-09-13) found that **two**
of §2.9's three questions fail under **C8.6** — the despiece, which is the pilot's main product
line. Question 1 (*what made me money?*) was answered by `A3`: **we do not derive profit**, so
`0009` is orphaned-but-applied and nothing renders it. ⚠️⚠️ **Question 2 was never separately
ruled on, because the ruling that followed was about PROFIT and this is a different number:**
`product_waste_daily` (`0011`/`0012`) costs waste from `unit_cost_net_per_base` **on the
movement**, which is **zero for a shortfall lot** — so throwing away `Pechuga` costs **$0** —
and the rate's denominator is purchases *of that product*, also zero, because you buy whole
birds. **The headline is 0 over 0.**

✅ **So the constraint on the screen, and it is an implementation of his ruling rather than a
reopening of it: Números and Desperdicio SHOW WASTE AS QUANTITY AND NOT AS COST OR AS A RATE,
until something fixes `0011`.** Quantity is intact for `0013`'s own stated reason — *"there is
no cost column for it to fail open on."* ⚠️ **The alternative is a screen that tells a
shopkeeper her waste cost her nothing**, which is the one thing worse than not showing the
number: *"enhance it later"* works on a number that is missing, and does not work on a number
she has already believed. ⚠️ **This is written into `4.6c`'s gate cell too**, which is the row
that names the Números screens, so the session that builds them meets it rather than finds it.

#### ✅ And the second ruling of the same message — *"do as you think better"*

The `42501` overload routing **stands as shipped**: it is a deliverable of `5b-iii`, beside the
`22023` fix he ruled there on 2026-09-18, to be fixed in one pass over one flow. ⚠️ **It is an
owner-CONFIRMED decision now rather than one taken on his behalf**, which matters only in that
nothing re-offers it next session.

✅✅ **THE HANDBOOK HAS A GUARD AS OF 2026-09-18, ON THE OWNER'S INSTRUCTION — *"if you
think a guard is needed for HANDBOOK implement it."*** `docs/checks/handbook-agreement.sh`,
five assertion groups, eleven fixtures in its harness, wired into `app.yml` **together with
`docs/HANDBOOK.md` as a triggering path** — and that second half is the whole point: a guard
whose filter names only one of its two inputs does not run on a handbook-only edit, which is
the exact shape of every staleness it exists to catch.

#### ⚠️⚠️ Why the owner's file needed one, and why it is not a second status board

⚠️ **Every other check in `docs/checks/` reads `docs/PLAN.md`** — `plan-handover.sh` and all
four split guards. **The handbook was the one document a PERSON acts on and no machine ever
looked at.** ⚠️ **The gap is asymmetric, and that is the argument**: a stale plan row is found
by the next session, which reads it first and reads it critically; **a stale handbook row is
found by the owner, who has no way to know it is stale** — it is the only account of the
project he is given.

✅ **It asserts AGREEMENT and never judges the plan**, which is what keeps it clear of
`plan-handover.sh`'s assertion 5 — *no second status board.* Nothing is copied; two files are
required to say the same thing about five questions: **does every task the handbook names
exist; is "done" the same word in both; is a split parent described as split; does the
decisions block agree; and do both files point at the same next piece of work.**

#### ⚠️⚠️ It found THREE more stale rows while being written, and SIX is the running total

The three corrected on 2026-09-18 are recorded above. **The guard's first runs found three
more, none of which any person had noticed:**

- ⚠️⚠️ **`5b-ii` and `5b-ii-b` were FINISHED and the handbook never said so.** Both are split
  parents; every leaf under them closed on 2026-09-18. Their rows said *"split in two"* and
  stopped there — so the owner's file described two live divisions of work that were in fact
  complete. **Found by the recursive child walk, which is the only assertion here that could
  see it.**
- ⚠️ **`5a-ii` stated its completion without the tick** every one of its eight siblings
  carries. ✅ **The guard was LOOSENED rather than the file edited** — it matches the claim
  (*"Done <date>"*), not the decoration — and then the row was given its tick anyway, for the
  person reading it. **A check that goes red over an emoji is a check somebody deletes.**

#### ⚠️⚠️ AND THE AUTHOR OF THE GUARD HAD ALREADY COMMITTED THE DEFECT IT CATCHES

Closing `5b-ii-b-2`'s row three hours earlier **removed the only next-work marker in the file
and put none back.** For one merged commit `docs/HANDBOOK.md` did not say where the project
was — which is most of what the owner opens it for. ⚠️ **Nothing found it but the check**, and
it is fixture `H8`. ✅ **Fixed by adding the three `5b.8` children to the handbook in his
language**, `5b.8-i` carrying the marker.

#### ⚠️⚠️ Three wrong versions, each RED ON A CORRECT TREE, and the cheap fix was the wrong one every time

| | What it demanded | Why it was wrong |
|---|---|---|
| **v1** | A ✅ on a handbook *Done* row | One row of nine spells it without the tick. **The claim was true; the decoration differed** |
| **v2** | The done-claim in the plan's build-order ROW | ⚠️ **`5a-i`'s row never restates it** — the STATUS LOG carries *"`5a-i` IS DONE AS OF 2026-09-07"* and that is the whole record |
| **v3** | A one-level child walk | ⚠️⚠️ **`5b-ii` sits above `5b-ii-b`, which is itself a split parent with no claim of its own** — so every leaf had shipped and the walk still said unfinished |

⚠️⚠️ **EVERY ONE OF THOSE WOULD HAVE BEEN "FIXED" BY EDITING THE HANDBOOK TO SUIT THE SCRIPT** —
degrading the file the owner reads to make a check go quiet, which is the inverse of what it is
for. **The three shapes of "the plan says it is done" are now written into the check itself**,
and `H10` holds v3's lesson: it un-dones ONE grandchild and requires the whole chain above it
to stop counting as finished. **If the walk ever stops recursing, `H10` goes green while the
control still passes** — which is exactly how a check rots into a no-op.

#### ⚠️ What it cannot see, and it is the honest half

It compares two files. **It cannot see a row the owner would want that neither file has**, it
cannot judge whether an explanation is any good, and it cannot tell a true sentence from a
well-formed one. ⚠️ **The staleness it catches is the kind with a machine-readable twin**; the
kind without one is still held by a session reading both files, and always will be.

✅✅ **`5b.8` IS SIZED `L` AND SPLIT THREE WAYS AS OF 2026-09-18, BEFORE A LINE OF IT WAS
WRITTEN — AND `5b.8-i` IS THE NEXT TASK.** ⚠️ **No migration and no app code was written in
this session and none should have been**: `supabase/migrations/` and `app/src/` are untouched,
and this section, four table rows, one new guard, its harness and the two `app.yml` steps that
run them are the whole of it. **It is the seventh row in this file to be sized smaller than it
was, and the FIRST one carrying a migration** — which is why its own row has been saying
*"re-size it first and expect it to split"* since 2026-09-14, and why the split is worth more
here than it was on any of the six before it: **a migration merged automatically is a
modelling choice deployed rather than reviewed.**

#### ⚠️⚠️ Why it is an `L` and not the `M/L` the row carried — and the ruler is a commit, not a feeling

`5b-ii-a` was an `M`, and its diff is on `main`: **`b082e83` — 2,288 insertions across 20
files**, one contract module, one screen, one actor, one contract check and its harness. That
is what an `M` has cost here most recently, so it is the ruler. Against it, `5b.8` as the row
describes it **plus the three writers reading the applied schema added**:

| | `5b-ii-a`, the `M` that shipped | `5b.8`, as its row describes it |
|---|---|---|
| Migrations | **none** | **two** — the column and its writers, then the self-edit RPC |
| pgTAP suites | none | **two**, each with its own falsifications |
| Applied functions rewritten | none | **four**, in three different migrations |
| Contract modules touched | one — `members.ts` | **two**, plus a new mutation and its hook |
| Screens touched | one | one, and it gains its first WRITE |
| ADR sections amended | none | **two** — §2.3 and §2.7, three sentences |
| Split guards whose sentinels change | none | **two**, plus both their harnesses |
| Backfills over `auth.users` | none | **one**, and it is one-shot and unrepeatable |

⚠️ **The `M/L` was written on 2026-09-14 against three nouns** — a column, a backfill, a
roster read. **It has grown three times since, twice on 2026-09-18 before it was taken**, and
this session found three more. ⚠️ **`4e`, `4.6a`, `5a-iv`, `5a-iv-c`, `5b-ii` and `5b-ii-b`
were every one of them sized smaller than they were**, corrected on the day they were picked
up rather than the day they were written. **This is the seventh, and the first with a
migration in it** — so it is the first where being wrong about the size is deployed rather
than reviewed.

#### ⚠️⚠️ Six things found by reading the applied schema, and the first two are membership writers the row never knew it owed

**`R1` — `request_access` WRITES A MEMBERSHIP, AND THE ROW NAMES TWO WRITERS OUT OF FOUR.**
`0029:256`, inside the `D7` fast path: *"someone already invited who then types the code is
simply let in, and is told none of it."* It runs `insert into public.workspace_member
(workspace_id, user_id, role)` — the same three columns as the two writers the row DOES name.
⚠️ **So a person who was invited by email, and who types the shop code instead of the token,
joins with no name at all** while the person beside her who used the token has one. **Two
people, one shop, one of them nameless, and nothing in the roster can explain why.**

**`R2` — `approve_request` WRITES ONE TOO, AND IT IS `5b-iii`'s OWN RPC.** `0029:455`, the
same three columns. ⚠️⚠️ **This is the finding that matters, because of the ORDERING the row
already insists on twice.** `5b.8` must land **before** `5b-iii`, and `5b-iii` is the task
that builds the approval screen — so shipping the column without this writer means `5b-iii`
ships a screen on which **every person who joins by the pull path arrives nameless**, and the
fix is a fix-forward migration plus a second backfill run over the rows made in between.
**The whole argument for the ordering is defeated by the two writers the ordering never
counted.**

**`R3` — THE RULING THE TASK RETIRES DIES IN THE CHILD THAT DISPLAYS THE NAME, NOT THE ONE
THAT STORES IT.** Two split guards hold the 2026-09-14 EMAIL ruling as a deliverable —
`5b-split-coverage.sh:141` routes *"identified by EMAIL"* to `5b-ii` and *"approver sees an
EMAIL"* to `5b-iii`; `5b-ii-split-coverage.sh:135` routes the first to `5b-ii-a`. The row
says they stay *"until it does"*, and this session had to answer **which child is `it`**.
⚠️ **It is not the migration.** A stored column changes nothing a person sees, and retiring
the sentinel the moment the column exists would leave both guards asserting a rule that is
neither true nor superseded for as long as the middle child takes. **It is the child that
puts the name on the sheet**, and it is written into that row so the next session does not
have to re-derive it.

**`R4` — `display_name` ALREADY MEANS THE SHOP, INSIDE THE BODY OF ONE OF THE FOUR WRITERS.**
`workspace.display_name` is the shop's name (`0027:418`), and `onboard_workspace`'s own
parameter is `p_display_name` — so after this migration that function body holds **two
different `display_name`s, one for a shop and one for a person**, three lines apart. ⚠️ **The
column name stays** — it is the one the row instructs and it is right on `workspace_member` —
and the mitigation is a local variable named for the person, not a rename. **Named here so it
is met rather than discovered.**

**`R5` — THREE OF THE FOUR WRITERS HAVE AN `UPDATE` BRANCH, AND WHAT IT DOES TO AN EDITED NAME
IS A MODELLING CHOICE THE MIGRATION BAKES IN.** `redeem_invite` (`0028:520`), `request_access`
(`0029:252`) and `approve_request` (`0029:451`) all do *"if the member row exists, update role
and `is_active`"* rather than insert. ⚠️ **If that branch also refreshes the name from
`raw_user_meta_data`, then a person who corrects their own name through the third child and is
later re-invited silently loses the correction** — and the app has overwritten a person's own
answer with Google's. **Decided below, and it is the one the seed bakes in.**

**`R6` — AND IT MAKES A TENTH STALE COPY, IN A FILE THAT DESCRIBES APPLIED SCHEMA.**
`supabase/README.md`'s `0033` entry says in terms that *"no human name for `created_by` exists
anywhere in this schema, because §2.7 never exposes `auth.users` and `workspace_member` carries
no name column."* ⚠️ **The clause is load-bearing prose about why the month export has no
name column**, and the moment the column lands it is false. It is one sentence, in the file
the migration is being added to anyway.

#### ⚠️⚠️ AND ONE PLACE WHERE THE PLAN AND THE ADR DISAGREE — REPORTED, NOT GUESSED

⚠️ **`5b.8`'s row says `ADR-035 §2.7` *"describes `workspace_member`'s columns"*. IT DOES
NOT.** §2.7 describes `workspace_invite`'s columns (line 1055). **`workspace_member`'s columns
are in §2.3's data-model table, at line 358** — `user_id` → `auth.users`, `role`, `is_active`.
§2.7 is right about the other two sentences: *"`auth.users` is never exposed to anyone"*
(line 1061) and the `create_invite` *"under normal RLS"* spelling (line 1057) are both there.

✅ **The ADR wins and this file is the bug**, which is the rule, and **nothing about what gets
built changes** — the same three sentences are amended either way. ⚠️ **What changes is the
row's own argument for keeping them together**: *"three amendments to one section are one
deliberate pass and not three"* is **two sections, not one**. The pass is still worth taking
once, so the routing is unchanged and the row is corrected instead. **It is flagged here
rather than fixed silently because the instruction that folded the third amendment in was the
owner's, and it named §2.7.**

#### The seam, and each piece is a closed loop somebody can actually use

| | Takes | Why the line is here |
|---|---|---|
| `5b.8-i` | The column, **all four** writers, the backfill, the pgTAP suite and its falsifications, and the paperwork the schema makes false | **Everything that has to be true before any screen can be honest**, and it is one migration over one table. A name is stored for every path into a shop that exists — which is a claim pgTAP can make end to end, with no client at all |
| `5b.8-ii` | The roster READS it: `MEMBER_COLUMNS`, the fourth identity case in `rosterFrom`, the contract check and harness, and the two split guards whose sentinels this retires | **The task that makes the 2026-09-14 ruling actually superseded** (`R3`), and the only one that does. It ships **no migration**, which is what makes it the safe place to move a sentinel two guards depend on |
| `5b.8-iii` | `set_my_display_name`, its migration, and the control on the sheet `5b-ii-a` built | **A person fixes their own name**, which is the half `5b.7` deliberately left here — and it is a `security definer` RPC with its own refusals, so it needs its own suite and the screen that calls it in the same pass |

⚠️⚠️ **THE HALF LOOP IS NAMED RATHER THAN HIDDEN, AND IT IS THE TRADE `5b.7` ALREADY TOOK ON
THIS EXACT FEATURE.** After `5b.8-i` every membership carries a name and **nothing displays
it** — which is word for word what `5b.7`'s own row says about the column it filled
(*"NOTHING DISPLAYS IT YET"*). ✅ **What makes it safe is that the first child is
independently FALSIFIABLE**: four writers each producing a named member, a backfill leaving
no null behind, and a person with empty metadata still arriving is every one of them an
assertion a pgTAP suite makes without a phone in the room.

#### Three alternative seams considered and refused

- **Two children — the migration, then everything client.** Refused on size, not on shape:
  the client half would then carry a second migration (`set_my_display_name`), a screen's
  first write, a contract check, two split guards and two harnesses, which is the `L` being
  split wearing a smaller number. ⚠️ **It also puts a migration in the child that moves the
  sentinels**, and those are the two riskiest things in this task sharing one session.
- **Fold `set_my_display_name` into the first child's migration**, so there is one migration
  and one suite. Refused: it ships **an RPC nothing calls**, which is `5b`'s own recorded
  defect — *"a screen with no call is a deliverable no check in this repository can see"* —
  facing the other way, and `5b.5` has since written it down as `R12`. The RPC goes with the
  control that calls it.
- **Keep it an `M/L` and move the self-edit to `5h.5` or later.** Refused: it is the only
  repair path for a Google account that arrived as one word, and `5b.7` shipped **on the
  promise that this repair exists** — its row says the correction *"is an editable own-name
  field on the sheet `5b-ii-a` built, and it is `5b.8`'s."* Deferring it makes `5b.7`'s
  closing argument false.

#### ⚠️ Six decisions taken on the owner's behalf, and the third is the one to look at

| | Decision | Why, and what reversing costs |
|---|---|---|
| **1** | **The seam above, and `5b.8` stops being takeable** | A sizing judgement, which the working agreement makes the session's job. The three alternatives and why each loses are above. **Reversed by one plan edit** — nothing renumbers, because no migration has been written |
| **2** | ⚠️⚠️ **`R1` AND `R2` ARE IN, IN THE FIRST CHILD: ALL FOUR WRITERS IN ONE MIGRATION** | The row named two. **The applied schema has four**, and two of them are the pull path `5b-iii` builds next. Writing two now and two later is a fix-forward migration **plus a second backfill over the rows made in between**, and the ordering argument the row states twice exists precisely to stop that. ⚠️ **It is the cheapest correction available today and the dearest on the list once `0034` is applied.** **Reversed by one plan edit today; by a migration tomorrow** |
| **3** | ✅✅ **RULED BY THE OWNER 2026-09-18 — *"keep what they typed."* IT IS AN INSTRUCTION NOW AND NOT A CALL TAKEN ON HIS BEHALF.** ⚠️⚠️ **`R5`: THE NAME IS WRITTEN ON `INSERT`, AND ON `UPDATE` ONLY WHERE THE STORED VALUE IS NULL.** A re-invite never overwrites a name a person has already corrected | **THIS IS THE ONE THE MIGRATION BAKES IN.** The alternative — refresh from `raw_user_meta_data` every time — means the app silently replaces a person's own answer with Google's, on an event she did not trigger and is not told about, and the owner's standing rule is that we never hand a shopkeeper an internal state to reason about. ⚠️ **`coalesce` is the whole of it in SQL and the argument is the expensive part.** ⚠️⚠️ **Flagged loudly because it is a WRITE RULE inside four applied functions**: reversing it after `0034` is a fix-forward migration, and reversing it after anyone has corrected a name cannot restore what was overwritten. **Reversed by one word today** |
| **4** | **`set_my_display_name` takes the next free number in the THIRD child, not a slot in `0034`** | The refused seam above, and `R12`. ⚠️ **It also keeps the numbering honest**: `0034` as the tree stands, and the third child takes whatever is free when it is taken rather than reserving `0035` — this file has twice recorded a reserved number that was never written. **Reversed by moving one function** |
| **5** | ⚠️ **`R3`: the two split guards' sentinels are retired by the SECOND child, and the first child must not touch them** | The row's rule is *"until it does, they stay exactly as they are"*, and this answers which *it*. A guard asserting a rule that is not yet true goes red on a correct tree and gets deleted; one asserting a rule superseded on paper is caught by the row that names it. The name is not on a screen until the second child. **Reversed by one plan edit** |
| **6** | **`R4`: the column keeps the name `display_name`**, and the collision inside `onboard_workspace` is mitigated by a local variable name | It is the name the row instructs and it is the right one on `workspace_member`; renaming to avoid a collision in one function body would leave two names for one concept across two tables. **Reversed by a column rename, which after `0034` is a migration** |

#### The guard, and what it does not do

`docs/checks/5b.8-split-coverage.sh` is `5b-ii-b-split-coverage.sh` pointed at a fourth
generation. It asserts the parent row and all three children exist, that each child is stated
**exactly once**, that the parent still promises each of the **fourteen** deliverables — eight
the row's own, six from `R1`–`R6` — that each lands in exactly one child and the assigned one,
that `R5`'s write rule is still written into the child that ships it, that `R3`'s sentinel
routing is still written into the child that owns it, and that the parent says it is **no
longer takeable**. Ten fixtures in `5b.8-split-coverage-falsify.sh` say it can still fail on
each.

⚠️ **It cannot tell a good split from a bad one.** It cannot see whether `5b.8-i` is buildable
in one session, and it cannot see a fifth membership writer appearing in `0034` — only that
the row does not fail to CLAIM the four that exist. ⚠️ **And it cannot see `R1`, `R2`, `R4` or
`R5` in the schema at all**, because those are claims about applied SQL rather than about this
file; the instrument for them is the pgTAP suite `5b.8-i` ships, which is the same division
`5b-i` drew, `5b.7` repeated and `5b-ii-b` inherited.

⚠️⚠️ **AND IT CARRIES A TRAP WORSE THAN THE THIRD GENERATION'S: `5b.8-i` IS A PREFIX OF BOTH
ITS SIBLINGS.** `5b-ii-b` was a prefix of one child; here `| **5b.8-i** |` would match inside
`| **5b.8-ii** |` and `| **5b.8-iii** |` under any matcher that does not take the closing
pipe. Both the guard and the harness match `| **<task>** |` **including it**, which is
inherited and is the reason the three older guards are untouched by four new rows existing.
⚠️ **And `5b.8` is the first task name in this directory containing a `.`** — a regex
metacharacter. The row matcher is `grep -F` and is safe; **every deliverable regex in the list
was checked for it by hand**, and the harness's control fixture is what says the older three
guards still pass with these rows present.

#### Ten fixtures, run before this was pushed

⚠️ **Every mutation is scoped to ONE table row, by name, rather than to a phrase** — `Y2`'s
lesson inherited twice over: with four rows sharing a prefix and a parent that promises every
deliverable, an edit anchored on a phrase lands in whichever row grep reached first.

| | Break | Result |
|---|---|---|
| **S0** | The tree as committed | 🟢 — the control, and what says the baseline is not already red |
| **S1** | `5b.8-iii`'s row deleted | 🔴 *"no table row for 5b.8-iii"* |
| **S2** | ⚠️⚠️ **`approve_request` (`R2`) MOVED into `5b.8-ii`** — the plausible real mistake, because the approval is the screen half of a task and the client child is where screen halves live | 🔴 *"this split assigned it to 5b.8-i"* |
| **S3** | ⚠️⚠️ **`request_access` (`R1`) named by NO child** — the shape this whole sizing exists to prevent, and the one that reaches a pilot as two people in one shop and one of them nameless | 🔴 *"in the parent row and in NO child"* |
| **S4** | ⚠️⚠️ **The backfill struck from the PARENT row** | 🔴 *"no longer named in the parent 5b.8 row"* — **the edit that makes a coverage check vacuous rather than red**, which is this repository's most-recorded check defect |
| **S5** | `5b.8-ii`'s row stated twice | 🔴 *"row appears 2 times"* — `5a-iv`'s sub-split defect exactly |
| **S6** | ⚠️⚠️ **`R5`'s write rule deleted from `5b.8-i`** | 🔴 — the decision guard, and the one that guards a rule inside four applied functions. Nothing in this repository can see a `coalesce` that is not there yet |
| **S7** | ⚠️ **`R3`'s sentinel routing deleted from `5b.8-ii`** | 🔴 — the second decision guard. Two split guards depend on which child moves them, and no check can read an intention |
| **S8** | The parent stops saying it is not takeable | 🔴 *"does not say it is no longer takeable"* — `plan-handover.sh`'s `V4`, one level down |
| **S9** | `5b.8-ii` **also** claims the backfill, a COPY and not a move | 🔴 *"owned by neither"* — nothing is dropped, which is why a check that only counted homes would pass, and two tasks now each assume the other has it |

#### ⚠️⚠️ And the first run of `plan-handover.sh` was RED, on this file and not on the code — the TWELFTH instance

The parent row recorded its own history by **striking** the sentence that had made it the next
task: `~~THIS IS THE NEXT TASK, AS OF 2026-09-18.~~`. ⚠️ **A strikethrough is a rendering, and
`plan-handover.sh` reads the raw line** — `grep "^| .*THIS IS THE NEXT TASK"` — so the parent
and the child both claimed the marker and the check refused the split with *"2 table rows claim
to be the next task."* ✅ **The check was right and the prose was wrong**, which is the cheaper
half of the rule and the half that keeps being forgotten.

⚠️ **It is the TWELFTH recorded instance of *never spell a check's sentinel in the file it
reads***, the eleventh was four rows ago in `5b-ii-b-2`, and **neither the rule as written nor
the eleven instances before it covers this variant: SPELLING IT IN ORDER TO SAY IT IS NO LONGER
TRUE.** Every earlier instance was a row describing work, a comment describing a constraint, or
a falsification table describing a fixture. This one is a row describing **its own past**, which
is the one use of a sentinel that reads as obviously safe. ✅ **Fixed by striking the sentence in
lower case and saying why in the row itself**, so the next session that wants to record a
demotion has the answer beside the thing it is tempted to copy.

#### ⚠️ And `docs/HANDBOOK.md` was three rows stale before this session touched it — again

The owner-facing file, and **the second time in four days it has gone stale in exactly this
way**. ⚠️ **`5b-ii-b-2`'s row still said *"this is where the next piece of work is"*** four
days after it closed; **`5b.8`'s described a task that no longer exists as one**; and
⚠️⚠️ **a row headed *"One thing is waiting on YOU"* was still asking for the
Números questions, which were RULED on 2026-09-18** — the same ruling that emptied the
decisions block in this file. ✅ **All three corrected here.**

⚠️ **Only the middle one is this session's doing.** The other two were stale before it
started, and **nothing in CI can see any of them**: `plan-handover.sh` reads `docs/PLAN.md`
and the three split guards read table rows in it, so the HANDBOOK is the one document in this
repository that the owner reads and no check does. ⚠️ **That is worth a guard and it is not
this task's** — recorded here so the argument exists when somebody has a session to spend on
it. **The cheap half of the rule holds meanwhile: a session that closes a task edits both
files, and a session that splits one edits both.**

✅✅✅ **`5b-ii-b-2` IS DONE AS OF 2026-09-18 — A SECOND PERSON CAN SPEND A CODE, THE LOOP
`5b-ii` PROMISED IS SHUT, AND `5b.8` IS THE NEXT TASK.** An owner invites, a second person on
a second phone types sixteen characters into one box on the landing, `0028` writes her
membership and her two `member_location` rows, and `guard.ts` moves her to Inicio the moment
the membership read comes back — which is `5b-i`'s recorded rule that a screen never holds a
second opinion about navigation. ⚠️ **No migration, no schema, no policy** — `0028` has been
applied since 2026-09-13 and this task wraps it.

**Shipped:** `app/src/api/redeem.ts`, the fourth contract module on the pure side of
`src/api/` and the first to carry a NORMALISER; one wrapper in `calls.ts` and one hook; the
second half of `(onboarding)/bienvenida.tsx`; eleven new strings; **28 new Vitest assertions —
325 passing, up from 297**; and **`docs/checks/5b-ii-b-2-redeem-contract.sh`**, nine assertion
groups over a reset database with three real people, one shop and two stores, wired into
`db.yml` on the same commit that created it.

#### ⚠️⚠️ The assertion this task is really about is a NUMBER, and nothing in `app/` can check it

The landing screen has **one box**, and the app decides which RPC to call by **measuring what
she typed**. That is `P2`'s decision, and it is sound only while `generate_invite_token` mints
sixteen and `workspace_code_shape` admits eight. ⚠️ **`app/test/api-redeem.test.ts` pins the
two constants against themselves and would stay green if either moved** — §2.11 refuses the
rendering suite that would catch a person being sent down the wrong path, and a length is not
a string a gate can grep for meaning.

✅ **So the check mints a REAL token and reads a REAL shop's code and measures both against the
app's own two constants**, and it also pins the ALPHABET — because "normalise, then measure,
then send" is only safe while normalising a minted token is the IDENTITY. A token carrying a
lower-case letter, or an `I`, would be silently rewritten on the way out and would not match
its own hash. ⚠️ Fixtures `U3` and `U4` mutate each length in turn; `U4` is the one that
matters more, because `CODE_LENGTH` belongs to a branch **this task did not build** and is
therefore the one a later session edits with nothing visibly going wrong.

#### ⚠️⚠️ Found in this task — `redeem_invite` RAISES `42501` FOR A BAD CODE, AND SO DOES AN ABSENT SESSION

`@/api/errors` maps `42501` app-wide to *"tu sesión se cerró. Entra de nuevo"*, because the
grant is to `authenticated` and that is what PostgREST answers a caller with no JWT.
`redeem_invite` raises **the same code** from its own body for a token that is not valid or has
already been spent. ⚠️ **They are genuinely the same code, and assertion 9 of the new check
proves it rather than assuming it**: it drives the RPC anonymously and gets `42501` back.

✅ **On this screen it is read as the CODE**, and the reason is who is standing there:
`/bienvenida` sits behind `guard.ts`, which sends a person with no session to `/entrar`, so a
caller here has one. **The rare wrong guess costs her a confusing sentence and the next launch
corrects it. The other way round costs her a correct sentence about a session while she signs
in again and retypes a dead code forever.** ⚠️ **The honest fix is a SQLSTATE of its own, which
is a migration, and `app/**` ships none** — ROUTED TO `5b-iii` **by analogy with the owner's
ruling of the same morning** about `0028`'s other overload, and written into that row rather
than left in this log. ⚠️ **It is the SECOND time in two days that one SQLSTATE has been found
carrying two meanings in `0028`'s path**, which is worth saying out loud: the migration mints
`TD003` freely and reaches for a built-in code everywhere else.

#### ⚠️ Three decisions taken on the owner's behalf, and the second is the one to look at

| | Decision | Why, and what reversing costs |
|---|---|---|
| **1** | **The `42501` routing above — into `5b-iii`, as a deliverable of that row rather than a question in this log** | It is the same shape as the `22023` overload he ruled on that morning, in the same migration, fixed in the same pass, on the task that owns the screen either message points at. Parking it as a question would have re-offered a decision he has already made once. **Reversed by one plan edit**, and the code costs nothing either way — the app's screen-local mapping is four lines |
| **2** | ⚠️⚠️ **AN EIGHT-CHARACTER JOIN CODE IS RECOGNISED AND NAMED, NOT REFUSED AS MALFORMED.** She is told *"ese es el código de la tienda — pídele a esa persona que te invite a ti"* | **It is not hypothetical: Ajustes has shipped `Compartir código` since `5b-ii-a`**, so an owner can hand out an eight-character code TODAY and the person holding it lands on exactly this box. `request_access` is `5b-iii`'s, so this app cannot spend it. ⚠️ The alternative is *"ese código no se ve bien"*, which is **this app calling a correct code wrong** and leaving her retyping it. ⚠️ The sentence names HER next step and not our missing screen, which is the owner's own standing rule. **`5b-iii` deletes this branch and its string**, and reversing it now is deleting one string |
| **3** | **The joining half goes BELOW the create-a-shop half, under a rule** | The first launch of this app in any shop is the owner creating it; a joiner arrives afterwards and is looking for somewhere to put a code, which a section headed *"¿Te invitaron a una tienda?"* is. Reversing it puts a box she cannot fill in front of every founding owner. ⚠️ **No check can see this** (`R9`) — it is the owner's phone, and it is one `<View>` move |

#### ⚠️ And it disarmed a fixture in a harness one directory away, which the harness caught and no person did

`conventions-gate-falsify.sh`'s `F22` inserted a `@/lib/supabase` import above the line
`import { useOnboardWorkspace } from '@/api/hooks';` in `bienvenida.tsx`. **This task added a
second hook to that very line**, the anchor stopped matching, `sedi` edited nothing, and the
fixture reported ⚠️ *FIXTURE EDITED NOTHING — proves nothing.* ⚠️⚠️ **It is the FIFTH time in
this repository that ordinary work one file away has disarmed a fixture**, and the third found
by RUNNING a harness rather than by reading it. ✅ **Fixed by re-anchoring on the part of the
line the next task has no reason to touch** — the module it imports FROM, not the names it
imports — and all thirty fixtures behave again. **The rule this one adds to `F9`'s: a screen's
import LIST grows every time the screen does; the module it imports from does not.**

#### ⚠️⚠️ And the FIRST CI run was red, on the plan and not on the code — the eleventh instance

`docs/checks/5b-split-coverage.sh` went red with *"`redeem_invite` appears in `5b-ii` `5b-iii`
— owned by neither."* The routing paragraph added to `5b-iii`'s row above **spelled the RPC's
name**, and that name is a sentinel `5b-ii` owns. ⚠️ **It is the ELEVENTH instance of *never
spell a check's sentinel in the file it reads*** — and the new part is WHY it survived the
local run: **the three split guards were run BEFORE that paragraph was written and only the
narrowest of them was re-run after.** A guard that was green an edit ago is not a guard that is
green. ✅ **Fixed by naming the RPC as *"the redemption RPC — `5b-ii-b-2`'s"* instead**, and all
three guards plus their harnesses re-run together.

⚠️ **This is what "never merge on a green tick alone" buys**, from the other side: the tick was
never green, the job log named the row and the sentinel in one sentence, and the defect was in
the plan rather than in anything a person would have felt.

#### The nine fixtures, run before this was pushed

| | Break | Result |
|---|---|---|
| **U0** | The tree as committed | 🟢 — the control, and what says all THREE copied modules were copied |
| **U1** | The RPC renamed in the app | 🔴 *"the name this app sends — did not redeem"* |
| **U2** | ⚠️ **`p_token` renamed in the app's own interface** — a 404 the typecheck, the suite and the bundler all pass over | 🔴 same message, and it is what proves assertion 2 reads the app rather than a name typed in the check |
| **U3** | ⚠️⚠️ **`TOKEN_LENGTH` moved to 20** | 🔴 *"the length rule the landing screen decides by no longer holds"* |
| **U4** | ⚠️⚠️ **`CODE_LENGTH` moved to 9** — the branch this task did not build, and therefore the one a later session edits blind | 🔴 *"a real shop code is 8 characters and the app measures 9"* |
| **U5** | The expiry SQLSTATE drifts off `TD003` | 🔴 — the sentence *"pídele uno nuevo"* is the only one that gets her a working code |
| **U6** | The argument interface renamed away | 🔴 *"could not read the redemption contract"* — the vacuity guard |
| **U7** | ⚠️ **A caller who should be refused is not** (probe) | 🔴 *"was not refused 42501"* |
| **U8** | ⚠️ **The idempotent second tap is refused instead of answered** (probe) | 🔴 — the ordinary case on a connection the pilot store loses routinely |

⚠️ **`U7` and `U8` mutate the PROBE and not the app**, because **no line in `app/` can make
Postgres admit a stranger or stop being idempotent** — `5b.7`'s `Y6` arrangement and its
argument: *a fixture nobody can write is an assertion nobody has shown can fail.* ⚠️ **And no
fixture resets the database**, which is the sibling harness's recorded lesson: nine resets ran
it past `db.yml`'s fifteen-minute cap and the step was CANCELLED, which is neither a pass nor a
failure and the worst of the three to merge on. Measured here: the check takes two seconds and
the harness seventeen.

⚠️ **What no check in this repository can see, named rather than left to be discovered** (`R9`):
that ONE box is rendered and not two, that the rule separates the two halves, and that the
guard actually moves her off this screen once the membership read lands. That is the owner's
own phone.

✅✅ **RULED BY THE OWNER 2026-09-18 — *"put the SQLSTATE fix in 5b-iii"*. THE `22023`
OVERLOAD IS A DELIVERABLE OF `5b-iii` NOW, AND `5b-ii-b-2` IS THE NEXT TASK, UNCHANGED.**
`5b-ii-b-1`'s closing message offered the routing as a question; it is an instruction now, and
the row carries the migration rather than the status log carrying a suggestion.

**What was asked.** `0028` raises `22023` for **five** different refusals: a blank address, a
malformed address, a location that is not this shop's, a staff invite naming none, and *"has
already requested access — approve the request instead"*. ⚠️ **The first four are refused on
the phone before a call is made. The fifth cannot be** — only the database knows somebody has
already asked — **and it is the one refusal whose next step is a screen**, the approval screen
`5b-iii` builds.

⚠️ **Until the code exists, the app matches a MARKER IN THE SERVER'S PROSE.** That is normally
a defect here and is safe in exactly one arrangement, which is the one shipped:
`docs/checks/5b-ii-b-1-invite-contract.sh` drives that refusal for real and goes red if the
wording moves, so a reworded migration is named rather than silent. ✅ **The fix is a SQLSTATE
of its own**, in the shape `TD001` (`4b-i`) and `TD003` (`0021`, reused by `0028`) were minted,
**with the marker and its assertion retired in the same pass** — a rule asserted after it has
been superseded is worse than one asserted before, which is `5b.8`'s recorded argument about
the two split guards.

⚠️⚠️ **AND IT MAKES `5b-iii` BIGGER BEFORE IT IS TAKEN, WHICH IS WRITTEN INTO ITS ROW RATHER
THAN LEFT TO BE MET.** That row's `M/L` was written on 2026-09-07 against two RPCs, a badge and
a picker. It now also carries **a migration, a pgTAP suite and its falsifications**, plus the
retirement of a client contract and its check. **`4e`, `4.6a`, `5a-iv` and `5b.8` all record
that a deferred half needs re-sizing on the day it is picked up**; this is the fifth row to
carry that instruction, and the second to carry it because a later task handed it work.

⚠️ **Nothing in the app or the schema moves today.** The marker still matches, the check still
asserts it, and `5b-ii-b-2` is unaffected — it wraps the redemption RPC, which raises `TD003`
and `42501` and never this code.

✅✅ **`5b-ii-b-1` IS DONE AS OF 2026-09-18 — AN OWNER CAN INVITE SOMEBODY, AND THE CODE
EXISTS ON ONE SCREEN FOR ONE MOMENT. `5b-ii-b-2` IS THE NEXT TASK.** The push half of the
invite path is built on the sheet `5b-ii-a` shipped: a form, a role, a store picker that
appears only above one store, and a card carrying sixteen characters that no read will ever
recover. ⚠️ **No migration, no schema, no policy** — `0028` has been applied since
2026-09-13 and this task wraps it.

**Shipped:** `app/src/api/invites.ts`, the third contract module on the pure side of
`src/api/`; `app/src/format/date.ts`, the second thing this app renders that has a right
answer; two wrappers in `calls.ts` and two hooks; the form, the picker and the token card on
Ajustes; eleven new strings and a month table; **71 new Vitest assertions — 297 passing, up
from 226**; and **`docs/checks/5b-ii-b-1-invite-contract.sh`**, nine assertion groups over a
reset database with three real people and two stores, wired into `db.yml` on the same commit
that created it.

#### ⚠️⚠️ The assertion this task is really about is one no suite in this repository can reach

`0028`'s comment says *"THE TOKEN IS IN THIS RESULT AND NOWHERE ELSE, EVER"*. That is a claim
about a **stored row**, and every assertion in `app/test/api-invites.test.ts` would stay green
if it were false: the app would be sending correctly, parsing correctly, rendering correctly,
and the secret would **also** be sitting in a column any manager can read.

✅ **So the check mints a real token and then goes looking for the plaintext**, as a caller who
may read `workspace_invite`, with `select=*` — a reader that would find it. It also pins that
the token is sixteen Crockford characters and that `expires_at` is between six and eight days
out, which is `D3`'s seven days measured rather than recalled. ⚠️ **Its fixture `S7` mutates
the PROBE and not the app**, because **no line in `app/` can make Postgres store a plaintext
token** — `5b.7`'s `Y6` arrangement and its argument: *a fixture nobody can write is an
assertion nobody has shown can fail.*

#### ⚠️ `P1` measured, and the policy is not shaped like the others

The picker needed a read no line in this app performed. It is built, and the measurement the
sizing asked for came back as the sizing guessed — which is worth recording because it could
have gone the other way:

| | |
|---|---|
| `location_select` (`0001:506`) | `id in (select public.my_locations())` — scoped by LOCATION, not by workspace |
| `my_locations()` (`0001:332`) | every **active** location in the workspace when `wm.role >= 'manager'`; explicit `member_location` rows below that |

✅ **So a manager gets the whole list by role**, and the check asserts it against a two-store
shop rather than against the function's comment. ⚠️⚠️ **AND THE COLUMN LIST IS SHORTER THAN
THE ROSTER'S, WHICH IS THE OPPOSITE DECISION ONE MODULE OVER AND IS RIGHT FOR A MEASURED
REASON.** `workspace_member_select` does not filter `is_active`, so `members.ts` must read that
column and `rosterFrom` drops the row. `my_locations()` filters it **inside the function**, so
an inactive location never comes back at all and reading the column would ship a value that is
`true` on every row this app can ever see. ✅ **The omission is asserted off the WIRE** — the
check reads the table twice, `select=*` to prove the policy *would* hand `is_active` over and
the app's own list to prove it does not take it, which is `5b-ii-a`'s arrangement for
`token_hash`.

#### ⚠️⚠️ Found in this task — `0028` RAISES ONE SQLSTATE FOR FIVE DIFFERENT REFUSALS, AND ONE OF THEM NEEDED ITS OWN SENTENCE

`22023` covers a blank address, a malformed address, a location that is not this shop's, a
staff invite with no location — and *"has already requested access — approve the request
instead"*. **The first four are refused locally by `checkInvite` before a call is made.** The
fifth cannot be: only the database knows, and it is the one refusal with a next step, on a
screen `5b-iii` builds.

⚠️ **There is no code to tell it apart by**, so the app matches a marker in the server's prose
— which is normally a defect here and is safe in exactly one arrangement: **the marker is
asserted against the live database.** The check drives that refusal for real, through
`request_access`, and goes red if the message stops containing the string the app exports.
✅ **So a reworded migration is red and named rather than silently costing the sentence.**

⚠️⚠️ **THE HONEST FIX IS A SQLSTATE OF ITS OWN — `TD001` AND `TD003` ARE CODES THIS PROJECT HAS
MINTED BEFORE — AND THAT IS A MIGRATION THIS TASK DOES NOT SHIP.** Routed to `5b-iii`, which
owns `approve_request` and is the screen the sentence points at. **It is cheap there and
dearer once a second caller depends on the prose.**

#### ⚠️ Three decisions taken on the owner's behalf, and the first is the one to look at

| | Decision | Why, and what reversing costs |
|---|---|---|
| **1** | ⚠️⚠️ **THE ROLE PICKER OFFERS `Encargado` AND `Empleado`, AND NEVER `Dueño` — WHICH `0028` WOULD ALLOW.** Its decision 9 is *"a manager may not mint an owner"*, so an **owner may** | A second owner is not a thing either pilot shop needs — C11.2 makes the second person a manager — and it is the one invite that can hand the shop away by mistap. **The schema keeps the capability and the screen declines to surface it**, which is the cheaper direction to be wrong in. ⚠️ **A consequence named rather than discovered: `0028`'s owner-fence is now unreachable from this app**, so nothing here can make it fire and `0028`'s own suite is what proves it still holds. **Reversed by one entry in `INVITABLE_ROLES`** |
| **2** | **The date is rendered from a month table, not from `Intl.DateTimeFormat`** | `mxn.ts` records that `Intl.NumberFormat.formatToParts` **crashed this app on launch** on the owner's iPhone 15 — twenty-six green node assertions and an uncaught `TypeError` on Hermes. `DateTimeFormat` is the same family and a node suite would say exactly as little about it. ⚠️ **It costs the property `mxn.ts` fought for** — the shape stays an assertion rather than a measurement of ICU — and nothing about a date is fixed by a C-constraint, so there is no claim to keep honest. **Reversed by one function, and it is measurable on the phone in a minute** |
| **3** | **No year and no time on the expiry, and `null` rather than a broken sentence** | An invite lives seven days, so the year is a word that is wrong to read aloud fifty-one weeks out of fifty-two; the time invites a shopkeeper to cut fine a value she cannot act on precisely. **The date rounds the safe way**: the code dies partway through the day named, never after it. ⚠️ **A date it cannot parse omits the line entirely** — *"expira el NaN de undefined"* is the app visibly broken in front of the one person who cannot tell whether the rest of it worked. **Reversed by one format string** |

#### ⚠️⚠️ Five defects in this session's own instruments, none in the app, and only one was found by reading

⚠️ **All five were in a CHECK or a plan row, not in the app.** The app's code was right the first time;
what took the work was making the evidence real.

1. ⚠️⚠️ **ASSERTION 2 WAS A TAUTOLOGY ON ITS FIRST WRITING.** It READ the four `p_` names out of
   the app — and then called the RPC with a body whose keys were **typed into the check**. So it
   asserted that names the check spelled matched names the database had, and the app was not in
   the loop at all. **`5b-i` had already recorded the shape of the fix** — build the body from
   the read names, matched on a semantic substring, so the prefix under test is never retyped —
   and this file did not take its own sister's advice until it was read back. ✅ **Fixed, and
   `S2` is the fixture that would now catch it.**
2. ⚠️⚠️ **AN ASSERTION THAT COULD NOT FAIL, FOUND BY ITS OWN FIXTURE GOING GREEN.** Assertion 3
   refused *"columns the app did not ask for"* — which, with an explicit `select=`, PostgREST can
   never return. `S4` was written to make it fire, stayed green, and that is what said the branch
   was unfalsifiable. ✅ **Rewritten to read the table twice**, which turns the `is_active`
   omission into something measured off the wire instead of off a source string.
3. ⚠️⚠️ **AN APOSTROPHE IN A COMMENT BROKE THE WHOLE SCRIPT, AND ONLY WHEN IT WAS EXTENDED.**
   `VERDICT="$(python3 - … <<'PY' … PY )"` — a heredoc inside a command substitution. **Bash
   scans for the closing `)` tracking quotes, and it does not know the heredoc body is quoted**,
   so `app's` and `policy's` each opened a single quote that never closed and swallowed the rest
   of the file. Symptom: `unexpected EOF`, reported 250 lines later, on a script that had run
   green minutes before. ⚠️ **The rule this adds, and it is new here: NEVER PUT AN APOSTROPHE
   INSIDE A HEREDOC THAT SITS IN A COMMAND SUBSTITUTION — not even in a comment.** The two older
   `VERDICT` blocks in this same file were safe by luck.

#### ⚠️⚠️ And a FIFTH, found by CI rather than by anything here — a comment that asserted a constraint nobody had tested

⚠️ **`db.yml` CANCELLED THE HARNESS STEP AT THE FIFTEEN-MINUTE JOB CAP**, and a cancelled step
is neither a pass nor a failure — **the worst of the three states to merge on**, because the
tick next to the run says nothing at all about it.

The harness reset the database **once per fixture**, nine times. Its own comment said why:
*"`0028`'s one-pending-invite index means a second run against a dirty database refuses for a
reason that has nothing to do with the fixture."* ⚠️⚠️ **That was asserted when the file was
written and never tested, and it is FALSE.** Every invocation of the check mints a new
workspace and new addresses off `$STAMP` — `$$` plus the clock — and
`workspace_invite_one_pending_idx` is partial on `(workspace_id, email)`, so two runs cannot
collide by construction.

| | |
|---|---|
| With nine resets | **six minutes and still running** when the cap cancelled it |
| With none | ✅ **sixteen seconds, all nine fixtures behaving identically** |

✅ **The resets are gone and the comment now says what is true**, including that it was wrong.
⚠️ **The rule is the owner's own, and it is in this model's standing notes: MEASURE BEFORE
DESIGNING AROUND A LIMIT.** A constraint written into a comment reads exactly like a measured
one six months later, and this one bought a defended six minutes against a cost that did not
exist. **The check itself takes two seconds.**

#### ⚠️ And a fourth, found by the SPLIT guard's harness while this row was being closed

⚠️⚠️ **THE ELEVENTH INSTANCE OF *NEVER SPELL A CHECK'S SENTINEL IN THE FILE IT READS*, AND THIS
TIME IT IS THE VARIANT `5b-iii`'s ROW ALREADY WARNS ABOUT: SPELLING IT TWICE.** Closing this
task rewrote `5b-ii-b-2`'s gate cell to say the contract check *"already drives `redeem_invite`
as a fixture"* — true, useful, and the second time that word appears in that row. ⚠️ **Nothing
went red about the plan**: the guard only asks that each deliverable land in exactly one child,
and it still did. **What broke was the FIXTURE.** `Q2` proves a *misrouted* deliverable is
caught by MOVING `redeem_invite` from one child to the other; with the word written twice, the
move left a copy behind and the guard reported *"owned by neither"* — a real defect, but `Q8`'s,
not `Q2`'s. **A fixture that is red for the wrong reason is a coincidence, not a
falsification**, and the harness said so within seconds. ✅ **The sentence was changed, not the
check** — the cheaper half of the rule, and the half this repository has now recorded is the one
that keeps being forgotten.

#### Nine fixtures, run before this was pushed

⚠️ **`S7` AND `S8` MUTATE THE PROBE AND NOT THE APP**, and they are the two that matter most:
no line of TypeScript can make Postgres store a plaintext token or drop its own fence, so
pointing the probe at a world where those are false is the only way to show the assertions can
go red. That is `5b.7`'s `Y6` arrangement, named again because it keeps being the shape the
most important assertions need.

| | Break | Result |
|---|---|---|
| **S0** | The tree as committed | 🟢 — the control, and what says both read modules were copied |
| **S1** | The RPC renamed in the app | 🔴 *"the names this app sends — was refused"* |
| **S2** | ⚠️⚠️ **`p_workspace_id` renamed in the app's own interface** | 🔴 — the defect the file exists for, and the fixture that proves assertion 2 now reads the app rather than itself |
| **S3** | A `location` column renamed | 🔴 *"does not answer the app's column list"* |
| **S4** | ⚠️ **The app reads `is_active`** | 🔴 *"now carries is_active"* — and its FIRST spelling stayed green, which is how defect 2 above was found |
| **S5** | The marker no longer matches what `0028` raises | 🔴 — the assertion that keeps a prose match honest |
| **S6** | The argument interface renamed away | 🔴 *"could not read the invite contract"* — the vacuity guard |
| **S7** | ⚠️⚠️ **The plaintext token is in the table** | 🔴 *"THE PLAINTEXT TOKEN IS IN THE TABLE"* — the assertion the whole task turns on |
| **S8** | ⚠️ **A caller who should be refused is not** | 🔴 *"was not refused 42501"* — the fence in the body |

#### What `5b-ii-b-1` did NOT do, deliberately

- ⚠️ **Nothing can spend the code.** `redeem_invite` is `5b-ii-b-2`'s, and the half loop was
  named in the sizing rather than discovered here: an owner can mint a code and read it aloud,
  and this app cannot yet accept it back.
- ⚠️ **No pending invite is listed anywhere.** `rosterFrom` drops them — `accepted_by` is null
  until redemption — so an owner who invites three people sees no trace of it on the sheet. **It
  is not a gap this task closed and it is the obvious next question**, routed with the rest of
  the roster's shape to `5b.8`, which is already opening that read.
- ⚠️ **The token is never stored on the phone.** Not in Query, not in `lib/store.ts`. It is
  screen state for as long as the screen is open, because a token in this phone's SQLite is a
  token that outlives the reason it was minted.
- ⚠️ **Nothing was retrofitted on the sheet.** The roster, the join code and the density switch
  are untouched.

✅✅ **RULED BY THE OWNER 2026-09-18 — *"fold it into 5b.8"*. THE ADR §2.7 AMENDMENT IS A
DELIVERABLE OF `5b.8` NOW AND NOT A QUESTION, AND `5b-ii-b-1` IS THE NEXT TASK, UNCHANGED.**
The decision was parked by `5b-ii-b`'s sizing that morning and ruled the same day, which is
the seventh time in two days this block has done the job it exists for.

**What was asked.** ADR-035 §2.7's push paragraph says an owner or manager *"calls
`create_invite(...)` under normal RLS"*. The applied function is `security definer` with the
manager fence in its body, and **it had to be**: `D3′` orders the creating RPC to supersede an
expired pending row, that is an UPDATE, and `0002:594` grants `authenticated` select, insert
and delete on `workspace_invite` and **not update** — so the invoker-rights spelling dies
`42501` before any policy is consulted, and granting UPDATE to fix it makes the missing policy
a silent no-op and hands back `D3′`'s own bug wearing the costume of its cure. ✅ **`0028`'s
suite asserts both halves** (checks `8.2`, `8.3`).

**What changed here.** The row left the decisions block and the sentence became a deliverable
on `5b.8`, beside the two §2.7 amendments that task already owed — `workspace_member`'s
columns, and *"`auth.users` is never exposed"*. ⚠️ **Three amendments to one section are one
deliberate pass, not three**, which is the whole of the owner's ruling and the reason the
recommendation was to fold rather than to spend a session.

⚠️ **NOTHING IN THE SCHEMA OR THE APP MOVES, AND THAT IS WHY THIS WAS SAFE TO DEFER.** The
client contract is identical under either spelling — a non-manager is refused `42501` either
way — so no code is written against the outcome and nothing merged against a guess. ⚠️ **What
it cost while it stood** is that `CLAUDE.md`'s rule *"if anything disagrees with the ADR, the
ADR wins"* pointed at a sentence the database had already refused, and it had pointed there
since 2026-09-13. **It is the ninth stale copy, and it is the first one whose fix has a date
on it rather than a hope.**

⚠️ **`5b.8` HAS NOW GROWN TWICE BEFORE BEING TAKEN**, both times on 2026-09-18: the self-edit
RPC and its control, from one grep of an applied policy, and this. ⚠️ **Its row already says
to re-size it on the day it is taken**, and both are named in it so that the re-size counts
them rather than discovering them.

✅✅ **`5b-ii-b` IS SIZED `L` AND SPLIT IN TWO AS OF 2026-09-18, BEFORE A LINE OF IT WAS
WRITTEN — AND `5b-ii-b-1` IS THE NEXT TASK.** ⚠️ **No app code was written in this session
and none should have been**: `app/src/` and `supabase/migrations/` are untouched, and this
section, three table rows, one new guard, its harness and the two `app.yml` steps that run
them are the whole of it. It is `5b-ii`'s own split made one level further down, on the same
argument — **the cheapest moment to be wrong about the shape of two screens is now, in a
file, rather than after one of them exists.**

#### ⚠️⚠️ Why it is an `L` and not the `M` the row carried — and the calibration is a commit, not a feeling

`5b-ii-a` was an `M`, it closed six days into this step, and its diff is on `main`:
**`b082e83` — 2,288 insertions across 20 files**, one contract module, one screen, one actor,
one contract check and its harness. That is what an `M` has cost here most recently, so it is
the ruler. Against it, `5b-ii-b` as the row describes it:

| | `5b-ii-a`, the `M` that shipped | `5b-ii-b`, as its row describes it |
|---|---|---|
| Contract modules | one — `members.ts` | **two** — the two invite RPCs, and the `location` read the picker needs |
| Screens touched | one | **two, in two route groups** — the sheet, and the landing |
| Actors | one | **two**, and the second is on a second device |
| Table reads new to this app | two | **one more**, and its policy is not scoped the way any existing one is |
| `security definer` RPCs wrapped | none | **two** |
| Contract check | one actor, one round trip | **two actors**, and the second half cannot run until the first has minted a token |
| New primitives | the device store | **a date formatter**, which does not exist |

⚠️ **The `M` was written on 2026-09-14 against three nouns on the row** — `create_invite`,
the location, `redeem_invite` — **and it has been carried unexamined through four sessions
since, including the one that split its own parent.** Nothing was wrong with it as a first
guess. It was never re-measured, and `5b.8`'s row already carries the rule this session is
obeying: *"re-size it on the day it is taken."* ⚠️ **`4e`, `4.6a`, `5a-iv`, `5a-iv-c` and
`5b-ii` were all sized smaller than they were**, every one of them corrected on the day it
was picked up rather than on the day it was written, and this is the sixth.

#### ⚠️⚠️ Four things found by reading the applied schema, three of which the row does not own

**`P1` — THE PICKER NEEDS A READ NO LINE IN `app/` PERFORMS, AND ITS POLICY IS NOT SCOPED LIKE
ANY OTHER READ IN THIS APP.** ⚠️ **This one is not new and that is the finding**: `N1` named
it in passing six days ago — *"and a `location` read the app does not have"* — inside the
prose of a finding, and **it never became a deliverable, a row, or a line any guard reads.**
Measured today: nothing under `app/src/` selects from `location` at all. `workspace.ts` reads
`workspace`; `members.ts` reads `workspace_member` and `workspace_invite`; that is every read
this app has. ⚠️⚠️ **And `location_select` (`0001:506`) is `id in (select
public.my_locations())` — scoped by LOCATION, not by workspace** — its own comment saying why:
*"a cashier assigned to one store has no business enumerating the other."* Every other read
here is workspace-scoped. So what a manager is offered in the picker arrives by **role**
through `my_locations()` (`0002:377`), and that is a claim to measure against a live database
rather than to read off a policy. **It is `P1` and not `N1` because a deliverable inside a
paragraph is the exact defect this repository has now recorded fourteen times.**

**`P2` — AN INVITE TOKEN AND A JOIN CODE ARE THE SAME ALPHABET AND THE SAME NORMALISER, AND
ONLY LENGTH TELLS THEM APART.** `generate_invite_token` (`0028`) draws **sixteen** characters
from `0123456789ABCDEFGHJKMNPQRSTVWXYZ`, and its own comment says the choice was deliberate:
*"the same alphabet as the join code (`D5`) … read aloud over WhatsApp by the same person, in
the same conditions."* `hash_invite_token` then normalises through **`normalize_workspace_code`
— the join code's own normaliser** — and explains that the normaliser sits inside the hash so
the creating and redeeming halves cannot disagree. ⚠️ **So the landing screen will carry two
credentials that differ only in length: eight for a code, sixteen for a token.** `5b-iii`
builds the code half. **A person holding one of them has no way to know which kind they were
sent**, which means the screen cannot ask them. ⚠️ **Decided below, and it is the cheap-now
call of this sizing.** ✅ **AND THE DECISION'S PRECONDITION IS MEASURED RATHER THAN ASSUMED**,
because *"only length tells them apart"* is worthless if normalising can change a length:
`normalize_workspace_code` (`0027:175`) is `translate(upper(regexp_replace(…, '[^0-9A-Za-z]',
'', 'g')), 'ILO', '110')` — the regex removes only separators, and `upper` and `translate` are
both **1:1**. So it is **length-preserving on alphanumerics**, the column is
`check (code ~ '^[0-9ABCDEFGHJKMNPQRSTVWXYZ]{8}$')` (`0027:221`) and the token is sixteen by
construction: **a normalised credential is exactly 8 or exactly 16, and the two cannot
collide.** Anything else is refused before a call is made.

**`P3` — `create_invite` ANSWERS WITH TWO FACTS ABOUT AN INVITE THAT IS NOW DEAD, AND NOTHING
ON THE ROW SAYS WHAT THE SCREEN DOES WITH THEM.** `replaced_pending` and `superseded_count`.
`0028`'s decision 6 **replaces** a live pending invite for the same address, deliberately —
*"send it again is what a shop does and refusing costs a human step"* — and supersedes expired
ones through `D3′`'s helper. ⚠️⚠️ **So an owner who invites `ana@…` twice has handed out two
codes and the first one has stopped working**, and whoever is holding it gets `TD003` on the
sibling screen, a week later, with no way to tell that from the app being broken. **It is the
only finding here that a shopkeeper would experience as a defect**, and the app's one chance
to say so is the moment it happens.

**`P4` — THE TOKEN SCREEN HAS TO SAY WHEN THE CODE DIES, AND THIS APP CANNOT FORMAT A DATE.**
`create_invite` returns `expires_at`; the seven-day window is `D3`'s, it is the database's and
not the client's, and a code with no date beside it is one the owner cannot answer a question
about. ⚠️ **`app/src/format/` holds `mxn.ts` and nothing else.** A date is the second thing
this app renders that has a right answer and a wrong one, so `5a-ii`'s argument for putting
money in a module with a suite applies to it unchanged — §2.11 admits a unit test exactly
where it *"pins a value a customer sees"*, and a date rendered inside a screen is a value no
suite can reach.

#### The seam, and what each piece is

| | Takes | Why the line is here |
|---|---|---|
| `5b-ii-b-1` | `create_invite`, the picker and the read behind it, the token shown once, its expiry, and what a replaced code costs | **Everything the inviting half touches, and ONE actor on ONE device.** It arrives at a surface that already exists and adds a control to it. All three of the findings that need building — `P1`, `P3`, `P4` — are the push path's, and none of them is visible from the other side |
| `5b-ii-b-2` | `redeem_invite`, the landing entry, and the three refusals `0028` mints | **The second actor, the second device, and the loop that closes.** Its one finding is `P2`, which is a question about a screen the sibling never opens — and about a screen `5b-iii` opens next |

⚠️⚠️ **THE LOOP SPANS THE TWO CHILDREN AND THE FIRST ONE IS A HALF LOOP, WHICH IS A COST AND
IS NAMED RATHER THAN HIDDEN.** After `5b-ii-b-1` an owner can mint a code and read it aloud
and nothing in this app can spend it. **That is the same trade `5b-ii`'s own split took** —
its parent row says *"a closed loop across the two children"* — and it is taken again for the
same reason: the alternative seams all put both actors in one task, which is the `L` being
split. ✅ **What makes the half loop safe is that the first half is independently FALSIFIABLE**:
a token minted, a hash stored, the plaintext absent from the table, and a staff invite refused
without a location are all assertions a one-actor round trip can make.

#### Three alternative seams considered and refused

- **By RPC only** — both wrappers, args and hooks in one piece; both screens in the other.
  Refused: it is the data-layer-first seam **the parent already refused for a stated reason**
  — *"a typed module nothing calls"* is the same defect as a screen with no call, facing the
  other way — and `5b.5` has since written that pattern down as `R12`.
- **Keep it an `M` and move the picker to `5b-iii`**, which owns `D8` and needs a picker
  anyway. Refused: `0028:291` raises `22023` without a location, so `create_invite` **could
  not issue a staff invite at all** in its own task — the task would ship an RPC it cannot
  call correctly — and the row already rules the other way (*"`D8`'s ARGUMENT, not `D8`"*).
- **Keep it an `M` and cut the contract check to one actor.** Refused: `5b-i`'s own finding is
  that a wrong `p_` name is a **404 the typecheck, the suite and the bundler all pass over**,
  and redemption's entire risk is the hop between two devices. ⚠️ **Cutting the check to fit
  the size is sizing the evidence to the estimate**, which is the one move this repository's
  founding rule exists to refuse.

#### ⚠️ Four decisions taken on the owner's behalf, and the second is the one to look at

| | Decision | Why, and what reversing costs |
|---|---|---|
| **1** | **The seam above, and `5b-ii-b` stops being takeable** | A sizing judgement, which the working agreement makes the session's job. The three alternatives and why each loses are above. **Reversed by one plan edit** — nothing after it renumbers, because neither child ships a migration and no app code exists for either |
| **2** | ⚠️⚠️ **`P2`: ONE BOX ON THE LANDING, NOT TWO, AND IT DECIDES BY LENGTH.** Eight characters is a join code and goes to `5b-iii`'s path; sixteen is an invite token and goes to `redeem_invite` | **Two labelled boxes ask a shopkeeper which KIND of credential she was sent, and she cannot know** — the sender typed it into WhatsApp with no label on it. That is the app handing a person an internal state, which is the owner's own standing rule, and it is `N3`'s argument arriving on a different screen. ⚠️ **The alphabet makes it safe**: `normalize_workspace_code` strips the grouping for both, the two lengths cannot collide, and anything that is neither length is refused before a call is made. ⚠️⚠️ **It is cheap today and a retrofit the moment either screen exists**, and `5b-iii` is the second of them — **flagged for that reason and not because it is close.** **Reversed by one screen edit while neither screen exists** |
| **3** | **`P3`: the screen says a previous code was replaced, in one sentence, with no dialog and no confirmation** | The alternative is a confirmation in front of *"invite this person again"*, which is book-keeping handed to a shopkeeper, and the owner's tie-break is the option that adds no human step. ⚠️ **Saying nothing was refused**: the old code silently stops working and the person holding it cannot tell that from a broken app. **Reversed by deleting one string** |
| **4** | **`P4`: the date formatter goes in `src/format/` beside `mxn.ts`, with a suite** | `5a-ii`'s argument unchanged — a value a customer sees belongs where a test can reach it, and §2.11 admits exactly that test. The alternative is `toLocaleDateString` inline in a screen, which no suite in this repository can load. **Reversed by inlining it**, and it would then be unfalsifiable |

#### The guard, and what it does not do

`docs/checks/5b-ii-b-split-coverage.sh` is `5b-ii-split-coverage.sh` pointed one level down
again. It asserts the parent row and both children exist, that each child is stated **exactly
once**, that the parent still promises each of the **eight** deliverables — three the row's
own, one from `N1`, and four from `P1`–`P4` — that each lands in exactly one child and
the assigned one, that `P2`'s length rule is still written into the child that renders it, and
that the parent says it is **no longer takeable**. Nine fixtures in
`5b-ii-b-split-coverage-falsify.sh` say it can still fail on each.

⚠️ **It cannot tell a good split from a bad one.** It cannot see whether `5b-ii-b-1` is really
buildable in one session, and it cannot see a redemption appearing in it — only that the row
does not CLAIM one. ⚠️ **And it cannot see `P1` at all**, because that is a claim about a
policy and a live database rather than about this file; the instrument for it is the contract
check `5b-ii-b-1` ships, which is the same division `5b-i` drew and `5b.7` repeated.

#### Nine fixtures, run before this was pushed

⚠️ **Every mutation is scoped to ONE table row, by name, rather than to a phrase** — `Y2`'s
lesson inherited: its first spelling anchored an insert on a phrase the PARENT row also
carried, the edit landed in the parent, which already promised it, and the guard reported a
DROPPED deliverable instead of a MISROUTED one. **A fixture that is red for the wrong reason
is not a falsification, it is a coincidence.**

⚠️⚠️ **AND THIS HARNESS HAS A TRAP THE TWO OLDER ONES DID NOT: THREE OF THE TASK NAMES ARE
PREFIXES OF EACH OTHER.** `5b-ii-b` is a prefix of `5b-ii-b-1`. Both the guard and the harness
match `| **<task>** |` **including the closing pipe**, which is what keeps the parent's
mutation off the child's row — and it is also why the two older guards are untouched by these
rows existing at all, which `Q0` and the two older harnesses re-running green together are the
evidence for.

| | Break | Result |
|---|---|---|
| **Q0** | The tree as committed | 🟢 — the control, and the thing that says the baseline is not already red |
| **Q1** | `5b-ii-b-2`'s row deleted | 🔴 *"no table row for 5b-ii-b-2"* |
| **Q2** | ⚠️⚠️ **`redeem_invite` MOVED into `5b-ii-b-1`** — the commonest real mistake, and the one the seam exists to make visible: a session that has just wrapped `create_invite` finds the other RPC one screen below it in `0028` and takes it too | 🔴 *"this split assigned it to 5b-ii-b-2"* |
| **Q3** | The **date formatter** (`P4`) named by neither child | 🔴 *"in the parent row and in NO child"* — the shape `P1` spent six days in |
| **Q4** | ⚠️⚠️ **The `location_select` read (`P1`) struck from the PARENT row** | 🔴 *"no longer named in the parent 5b-ii-b row"* — **the edit that makes a coverage check vacuous rather than red**, which is this repository's most-recorded check defect |
| **Q5** | `5b-ii-b-1`'s row stated twice | 🔴 *"row appears 2 times"* — `5a-iv`'s sub-split defect exactly |
| **Q6** | ⚠️ **`P2`'s length rule deleted from `5b-ii-b-2`** | 🔴 — the decision guard. §2.11 bans the rendering suite that would catch two boxes appearing, so this row is the only thing holding it |
| **Q7** | The parent stops saying it is not takeable | 🔴 *"does not say it is no longer takeable"* — `plan-handover.sh`'s `V4`, one level down |
| **Q8** | `5b-ii-b-1` **also** claims `redeem_invite`, a COPY and not a move | 🔴 *"owned by neither"* — nothing is dropped, which is why a check that only counted homes would pass, and two tasks now each assume the other has it |

⚠️ **`Q2` and `Q8` are the same edit told apart by whether the sibling keeps the deliverable**,
and they were written as one fixture first. The MISROUTED branch is reached only when a
deliverable LEAVES its owner; the *"owned by neither"* branch only when it does not. **One
fixture could not reach both, and the harness is what said so.**

#### ⚠️ Two things this session corrected in its own work, found by re-running rather than by reading

- ⚠️ **`Q4`'s first spelling could never have fired.** Its anchor carried a newline, and a
  build-order row is one line — so the mutation always failed, the `||` fallback always ran,
  and the fixture was green for a reason that had nothing to do with what it asserts. **A
  fixture whose setup silently fails is the `conventions-gate-falsify.sh` failure in
  miniature**, and it was caught by reading the script back rather than by the harness, which
  reported nine passes throughout.
- ⚠️ **`Q6`'s needle matched the wrong sentence.** It looked for *"told apart"*, which appears
  in the guard's **success** message as well as its failure. `fixture()` checks the exit code
  before the needle, so it could not have passed a green run — but it would have accepted a
  red one that failed for any other reason. **Tightened to a phrase only the failure prints.**

✅✅ **`5b.7` IS DONE AS OF 2026-09-18 — A PERSON'S NAME IS COLLECTED AT SIGN-UP AND
STORED, NOTHING DISPLAYS IT YET, AND `5b-ii-b` IS THE NEXT TASK.** The event-shaped
deadline is closed: from this commit, an email sign-up sends `Nombre` and `Apellido`
joined into `raw_user_meta_data.full_name`, under the key Google's provider already
writes. ⚠️ **No migration, no schema, no list** — `5b.8` still owns every one of those,
and the 2026-09-14 email-only ruling still stands everywhere it has not been replaced.

**Shipped:** the two required fields on the sign-up half of `(auth)/entrar.tsx`;
`checkSignUp` and `joinName` in `@/auth/credentials` with the exported `FULL_NAME_KEY`;
`signUp`'s two new arguments and its `options.data` in `AuthProvider`; four new strings
and two new error keys; **11 new Vitest assertions (226 passing, up from 215)**; and
**`docs/checks/5b.7-signup-name-contract.sh`** with its seven fixtures, wired into
`db.yml` on the same commit that created it.

#### ⚠️⚠️ The screen had no halves, and the plan row said the fields go on one of them

`5b.7`'s row says the two fields belong *"on the sign-up half of `(auth)/entrar.tsx`
only, and NEVER on sign-in, where nobody types their name to come back."* ⚠️ **That
screen had no halves.** `5a-iii-a` built it as **one pair of fields under two buttons** —
`Entrar` and `Crear cuenta` — and its header records that shape as a decision: *"rather
than two screens with a link between them."* So the row could not be obeyed as written
without deciding something the row does not state.

**The option that changes nothing was considered first and refused.** Render both boxes
always and let only `signUp` read them: it satisfies "never *sent* on sign-in" and fails
"never *shown*". ⚠️ **Two boxes a returning shopkeeper has to know to leave empty is
book-keeping handed to a shopkeeper**, which is the owner's own standing rule, on the
first screen an elder user ever sees.

✅ **`creating` is a screen-local boolean, and the copy for it was already written.**
`ES.auth.toSignUp` / `toSignIn` were added at `5a-iii-a` for a shape that never shipped
and have been **dead strings ever since** — no reader, in any file. They are the switch
now. ⚠️ **It is not a navigation state**: `guard.ts` is untouched, which is what kept the
task an `S` after the `L`-sized alternative the split had already refused.

#### ⚠️ Three decisions taken on the owner's behalf, and the first is the one to look at

| | Decision | Why, and what reversing costs |
|---|---|---|
| **1** | ⚠️⚠️ **THE SCREEN NOW HAS A MODE, WHICH NARROWS `5a-iii-a`'s TWO-BUTTON DECISION.** One primary button whose word and action follow `creating`, plus a link to the other half. It is still ONE screen and one route — the half of that decision that was about not building two screens is untouched — but the two buttons are no longer both on screen at once | The alternative shows a returning person two boxes that are not theirs to fill. ⚠️ **It costs a new person ONE TAP** — the link, before the form — and it saves every returning person two fields every morning for the life of the app. **Reversed by one plan edit and about thirty lines**, and it is worth reversing NOW rather than after the pilot has a habit |
| **2** | **The default half is `Entrar`, not `Crear cuenta`** | Frequency: an account is created once and entered every morning. ⚠️ **It is the half the screen already opened on**, so a returning pilot user sees exactly what they saw yesterday. **Reversed by one initial value** |
| **3** | **The name is refused AFTER the address and the password, and the boxes sit BELOW them** | So the first refusal a person reads names the topmost empty box. The shared fields also stay where a returning eye expects them across a switch. **Reversed by moving two blocks** |

#### ⚠️⚠️ The round trip was the point, and it is the hop nothing here could see

§9's rule is why this task shipped a check rather than a file: **that GoTrue writes
`options.data` into `raw_user_meta_data` and KEEPS it there is a claim about somebody
else's system.** ⚠️ **And the failure is silent and irrecoverable.** `signUp` does not
reject an unknown option and does not reject a missing one — the account is created, the
shopkeeper reaches her shop, nothing goes red, and the name is simply not there.
`5b.8`'s backfill then reads an empty column for everyone who joined in between, and
**they cannot be asked again**: there is no screen that asks, and nothing to derive a
name from.

`5b.7-signup-name-contract.sh` signs a person up with **accents and two surnames**
(`María del Carmen Rodríguez Gómez`), then **signs them back in on a second request that
never saw the first one's body** and reads the same string off `/auth/v1/user`. That
second read is the one that separates *"the response echoed what we sent"* from *"the row
holds it"* — and the row is what `5b.8` migrates against. ⚠️ **A third assertion runs
every time as the control**: a second person signs up with no metadata and must have no
`full_name`, because on a server that invented the field both of the others would be
green and mean nothing.

⚠️ **One string in that check is deliberately NOT read from the app: `full_name` itself.**
Every other contract check here reads the app's own spelling rather than carrying a second
copy, and this one reads it too — and then asserts it equals a literal, because **that key
is Google's and not ours.** Reading it from the app on both sides would let the app rename
itself into agreement with nothing at all.

#### ⚠️ Found in this task — THE CONVENTIONS GATE READS JSX COMMENTS AS CODE

R4 went **red on a file that obeys it**. The gate strips full-line comments before applying
any rule — its header says why, at length — and the stripper recognises `//`, `*` and `/*`
at the start of a line. ⚠️ **A `{/* … */}` block inside JSX starts with none of those**, and
its continuation lines are bare indented prose. So a Spanish *example* quoted in a JSX
comment — a customer's name, there to explain why the code does **not** split on spaces —
was reported as a Spanish literal outside `src/strings.ts`. **This is the exact failure the
gate's own header warns about**, reached by the one comment syntax it did not enumerate, and
`entrar.tsx` is the first screen to write Spanish prose in a JSX comment.

✅ **Nothing was loosened.** The comment was reworded and the reason moved to
`@/auth/credentials`, which is the cheaper half of *never spell a check's sentinel in the
file it reads* — the half recorded on 2026-09-14 as the one that keeps being forgotten.
⚠️ **The miss is written into R4's own "what the check misses" paragraph**, where the page
already states its blind spots, and **widening the stripper is routed to the next task that
touches either file**, because it is a change to a gate and needs a fixture in
`conventions-gate-falsify.sh`.

#### ⚠️ Found in this task — THE CHECK'S FIRST RUN WAS RED FOR THE WRONG REASON, FOR THE THIRD TIME

The control assertion printed **`bad_json`** where it owed *"the field was absent"*. Its
request body was written inline inside three levels of command substitution —
`stash "$( api … "{\"email\"…}" )"` — and bash handed GoTrue a mangled body. ⚠️ **It would
have discredited the one assertion that keeps the other two honest**, and it is the **third**
contract check in this repository to be red for the wrong reason on its first run: `5b-i`'s
argument reader recognised an argument by the prefix it existed to test, and
`5b-ii-a`'s verdict pasted a response body into a Python literal. ✅ **The body is built into
a variable first**, and the reason is written beside it.

#### Seven falsifications, run before this was pushed

⚠️ **`Y6` mutates the CHECK and not the app**, for the reason `5b-ii-a`'s `G5` gives about
the policy it loosens: **no line in `app/` can make GoTrue lose what it was given**, so
silencing the probe is the only way to show that the two assertions reading the wire can go
red at all. A fixture nobody can write is an assertion nobody has shown can fail.

| | Break | Result |
|---|---|---|
| **Y0** | The tree as committed | 🟢 — the control |
| **Y1** | ⚠️⚠️ `FULL_NAME_KEY` "tidied" to `fullName` | 🔴 *"the app stores the name under 'fullName'"* — and **nothing else in the repository can see this**: the app writes it, the app reads it, the round trip is green, and it is wrong only against Google |
| **Y2** | The key no longer exported | 🔴 *"could not read FULL_NAME_KEY"* — the vacuity guard |
| **Y3** | `signUp` called with no `options` | 🔴 *"the name is not being sent"* — the silent one: a valid call, a valid account, no name |
| **Y4** | `options` present, `data` renamed | 🔴 *"sends `options` but not `options.data`"* |
| **Y5** | Sent inside `data`, under `apodo` | 🔴 *"not under the key it exports"* |
| **Y6** | ⚠️ **The probe stops sending the name** | 🔴 *"the name did not survive signUp"* |

#### What `5b.7` did NOT do, deliberately

- ⚠️ **Nothing displays the name.** No column, no migration, no roster change, no ADR
  amendment. All of it is `5b.8`, and separating them is the whole point of the split.
- ⚠️ **The two split guards were NOT touched.** They hold the 2026-09-14 ruling as a
  deliverable and it is superseded on paper and not yet in the schema. `5b.8` changes them,
  and nothing before it may.
- ⚠️ **Google is still UNMEASURED on this project.** That its provider writes `full_name` by
  default is documented and is not tested here — local Google OAuth needs real credentials.
  **One glance at `user_metadata` on the next real Google sign-in on the phone settles it**,
  and that is a look, not a task. If it turns out false, every Google account also needs the
  Ajustes field `5b.8` is already building, and nothing else changes.
- ⚠️ **No rule about what a name may contain**, beyond "neither box is blank". Not a length,
  not a character set, not a capitalisation. `ANA de la Cruz` is stored as typed.

✅✅ **INSTRUCTED BY THE OWNER 2026-09-18 — *"let's include the Name at Sign-in: Nombre y
Apellido."* SIZED `L`, SPLIT IN TWO BEFORE A LINE WAS WRITTEN, AND `5b.7` IS THE NEXT TASK.**
⚠️ **This supersedes the no-name half of his own ruling of 2026-09-14**, and it is worth being
exact about why, because the ruling was not wrong: it was made on the finding *"no table in
this schema carries a human name"*, which is still true — and **nobody had noticed that
Google's provider hands us one at sign-in and this app drops it on the floor.** He ruled on a
narrower question than the one he asked today. ⚠️ **The email-only half of that ruling
survives everywhere it has not yet been replaced**, and `5b.8` is the only task allowed to
replace it.

#### ⚠️⚠️ Why it is an `L`, and why the seam is where the DEADLINE is rather than where the work divides evenly

Counting what has to exist before one name reaches one screen: a field on the sign-up half of
one route; a third rule in `checkCredentials`; a metadata key chosen to match the one Google
already writes; **a migration** adding a column to `workspace_member` plus two `security
definer` functions writing it and a backfill for rows that exist; a pgTAP suite and its
falsifications; a fourth identity case in `rosterFrom`; a column on the roster's read; the
contract check and its harness extended; **an ADR §2.7 amendment**, because that section both
lists that table's columns and says `auth.users` is never exposed; and the retirement of a
ruling held as a deliverable by two split guards across three rows.

⚠️ **The two halves have DIFFERENT DEADLINES, and that is the seam.** `5b.7` — collect and
store — has an irrecoverable one: **the pilot's first email sign-up.** `signUp` sends an
address and a password and nothing else, so a person who creates an account before it ships
has no name in any system, cannot be backfilled from anything, and can only be asked through
a screen that does not exist. `5b.8` — display it — has no deadline at all: it reads whatever
has accumulated, whenever it is taken. ⚠️ **Splitting on size would have put the migration
next and left the bleeding open for a session longer.**

⚠️ **Google sign-ins are ALREADY safe and cost nothing to wait on** — the provider's default
scopes store a name whether or not anything reads it. ⚠️⚠️ **That is the DOCUMENTED default
and it has NOT been measured on this project**, which matters because the whole "deferral is
free for Google" argument rests on it. Local Google OAuth needs real credentials, so it is not
cheaply testable here — **one glance at `user_metadata` on the next real Google sign-in on the
phone settles it**, and that is a look, not a task. ⚠️ If it turns out false, `5b.7`'s deadline
applies to every sign-up rather than half of them, and nothing else about the split changes.

#### Two seams considered and refused

- **The migration first, then the screens.** Refused by `5b`'s own recorded argument, which
  this session did not have to re-derive: *"a screen with no call is a deliverable no check in
  this repository can see"*, and the inverse — a column nothing writes — is the same defect
  facing the other way. It also inverts the deadline: the urgent half would go second.
- **All of it as one `L`.** Refused by the working agreement. It carries a migration, and a
  migration merged automatically is a modelling choice deployed rather than reviewed — which
  is exactly the kind of task this file requires to be sized before it is written.

#### ⚠️⚠️ RULED THE SAME DAY — *"we need to ask for at least one nombre and one apellido"* — AND THE ANSWER FOR THE OTHER WAY IN IS *"YOU CANNOT"*

The rule is enforceable exactly where this app asks, and nowhere else. **Google hands over one
STRING, not two fields**, and there is no form to put a rule on. ⚠️ **An account with no
surname is legitimate** — that field is optional in most locales — so `Ana` can and will
arrive. The requirement therefore holds for one of the two ways in, and pretending otherwise
would be the plan promising something the schema cannot deliver.

**Two fields, not a word count.** `Nombre` and `Apellido` as separate required inputs, rather
than a rule about spaces in one box. A split-on-space heuristic is a decision about how a
Spanish name is SHAPED, and Spanish routinely carries two surnames: `María del Carmen
Rodríguez Gómez` breaks every such rule anyone would write. Two boxes make the requirement
structural and assert nothing about what goes in either. ⚠️ **Stored as one joined string**,
because that is the shape the other way in already delivers — one column, one reader.

**Three ways to handle a one-word Google name, and the third is taken:**

- **Block them** — a screen between the button and the shop. It turns one tap into one tap and
  a form, which is most of what that button is for, and it needs a FOURTH navigation state in
  `guard.ts`. It would push `5b.7` from `S` to `M`. Refused.
- **Ask everybody and ignore what Google sent.** Uniform, and pays the same cost always
  instead of sometimes. Refused for the same reason, one step further.
- ✅ **Take it as-is, and let a person fix their own name on the sheet `5b-ii-a` built.** No
  step at sign-in for anyone; the surface already exists; and people want to correct a typo or
  a changed name whether or not Google was stingy. ⚠️ **It moves work into `5b.8`**, which is
  the task that has a migration in it anyway.

#### ⚠️⚠️ And ONE GREP OF AN APPLIED POLICY MADE `5b.8` BIGGER BEFORE IT WAS TAKEN

`workspace_member_update` (`0001:532`) is `has_role(workspace_id, 'owner')` — **owner-only**.
So the moment the name lives on `workspace_member` — and it must, because that is the table
another person's phone can read — **the person it describes cannot edit it.** A manager who
signed in with Google under one word is stuck with it for ever.

⚠️⚠️ **AND THE OBVIOUS FIX IS A TRAP THAT MUST BE WRITTEN DOWN BEFORE SOMEBODY REACHES FOR
IT.** A *"you may update your own row"* policy looks like one line and is not: **RLS filters
ROWS, NOT COLUMNS** — the same sentence §2.7 already spends a paragraph on about `cost` — so
that policy would also let the person **change their own `role`**. The tenancy wall opened to
buy a text field, by an edit that reads as a courtesy. ✅ **A `security definer` RPC touching
that one column is the shape**, and it is now `5b.8`'s rather than a discovery waiting for
whoever takes it.

#### ⚠️ Three decisions taken on the owner's behalf, and the first is the one to look at

| | Decision | Why, and what it costs to reverse |
|---|---|---|
| **1** | ~~⚠️⚠️ **`Nombre y Apellido` IS THE LABEL, NOT THE VALIDATION. A single word is accepted.**~~ ✅✅ **OVERRULED BY THE OWNER THE SAME DAY — *"we need to ask for at least one nombre and one apellido."* IT IS THE VALIDATION, AND IT IS TWO FIELDS RATHER THAN A WORD COUNT.** ⚠️ **The reasoning below is kept, struck, because half of it survived**: the argument against policing a name is why the rule is TWO REQUIRED BOXES and not a rule about spaces — a split-on-space heuristic decides what a Spanish name may look like, and Spanish routinely carries two surnames. Two boxes make the requirement structural and say nothing about what goes in them. ~~He named the field, not the rule.~~ Refusing one word would be this app deciding what a person may be called — the decision `checkShopName` already refused about shops, in the same words: *"every other name is somebody's real shop."* Mononyms exist, and so does a shopkeeper who types `Mary`. **The only refusal is blank.** ⚠️ It means the field's promise is softer than its label, which is the honest trade. **Reversed by one predicate** |
| **2** | **`5b.7` displaces `5b-ii-b` as the next task**, which he left to this session — *"whenever is better to do it."* | It is an `S`, it ships no migration, and it is the only row in this file whose cost is paid by WAITING rather than by working. `5b-ii-b` loses a session and nothing else: a column added elsewhere does not touch its token flow or its argument names. **Reversed by one plan edit** |
| **3** | **`5b.8` goes after `5b-ii-b` and before `5b-iii`, rather than straight after `5b.7`.** | After `5b-ii-b` because that task wraps the RPC this one edits, and one pass over a settled flow beats two. **Before `5b-iii`** because that screen is built against the ruling `5b.8` retires. ⚠️ **That ordering is load-bearing and is the reason the row says so twice** |

⚠️ **The guards were deliberately NOT updated today.** Two split guards hold the 2026-09-14
ruling as a deliverable, and it is superseded on paper and not yet in the schema. **A guard
asserting a rule that is not yet true is worse than one asserting a rule that has been
overturned on paper** — the first goes red on a correct tree and gets deleted; the second is
caught by the row that names it. `5b.8` changes them, and nothing before it may.

✅✅ **`5b-ii-a` IS DONE AS OF 2026-09-18 — AJUSTES EXISTS, IT IS THE FIRST COLOURED
SCREEN IN THIS APP, AND `5b-ii-b` IS THE NEXT TASK.** Install, sign in, open the sheet on
top of Inicio: the shop and how it answered C1.7, the join code in two groups of four with
a share button, who is in the shop, the text size — and it goes back where it came from.
⚠️ **No migration and no membership write**, which is the seam the split of this morning was
made on: `app/src/api/members.ts` reads two tables and writes nothing, and `create_invite`
and `redeem_invite` arrive at a sheet that now exists.

**Shipped:** `src/app/ajustes.tsx`, the app's first `presentation: 'modal'` route and the
first consumer of `5b.6`'s palette; `src/api/members.ts` — the two column lists, the join
PostgREST refuses to do, and the owner's fence as a function; three hooks;
`src/theme/densityMemory.ts`; `src/lib/store.ts`; 42 new Vitest assertions over two new
suites (**215 passing, up from 173**); and **`docs/checks/5b-ii-a-roster-contract.sh`** with
its eight fixtures. ⚠️ **Inicio's two temporary blocks are deleted**, which `5a-ii` named
this task to do and `5a-iii-b` waited on before it would persist anything.

#### ⚠️⚠️ The new check asks the database whether the OWNER'S RULING is still the right ruling, and nothing else here could

`5b-i-api-contract.sh` asks whether the applied schema answers to what the app sends.
`5b-ii-a-roster-contract.sh` does that for two more column lists — and then does something
no other check in this repository does: **it re-measures the fact a RULING was made on.**
*"Manager-and-above is right"* was ruled because `workspace_invite_select` is
`has_role(workspace_id, 'manager')` (`0002:563`) while `workspace_member_select` admits any
member (`0001:524`). ⚠️ **If a later migration loosens the invite policy, the fence in the
client becomes a section this app hides for no reason — AND NOTHING WOULD GO RED, because a
policy that allows MORE breaks no test.** Assertion 5 signs up three real people in three
real roles and checks that a staff caller still reads the roster and **zero** invites, both
`200`. ⚠️ **A hidden row is `200 []`, never `403`**, which is exactly why the fence is a
decision taken before the call rather than an error handler.

⚠️⚠️ **AND ITS HARNESS CONTAINS THE FIRST FIXTURE IN THIS REPOSITORY THAT EDITS THE
DATABASE RATHER THAN A FILE.** That assertion cannot be falsified by mutating TypeScript —
there is no line in the app that makes a policy permissive. `G5` loosens
`workspace_invite_select` in place, runs the check, expects the ruling's assertion to go red,
and puts the policy back; the restore is trapped on every exit path **and then asserted by a
second green run**, because a harness that silently left a loosened policy behind would have
done more damage than the defect it was hunting. ⚠️ **A fixture nobody can write is an
assertion nobody has shown can fail**, and that was the state of assertion 5 for the ninety
minutes between writing it and writing `G5`.

#### ⚠️⚠️ The harness found a real defect in the check on its first run — and a second one in a fixture six days old

**In the check:** three fixtures came back RED FOR THE WRONG REASON. A PostgREST `400`
quotes the column it thinks you meant — *"Perhaps you meant to reference the column
`\"workspace_member.role\"`"* — and that body was being interpolated into a Python literal,
where the escaped quotes were unescaped before `json.loads` ever saw them. The check said
**"unreadable: Expecting ',' delimiter"** where it owed the renamed column's name.
⚠️ **It reads as the check being broken rather than the app being wrong, which is what gets a
check deleted** — and it is the same family as the defect `5b-i-api-contract-falsify.sh`
found in its own sister on ITS first run. ✅ **Response bodies are now written to files and
passed as paths; nothing is ever pasted into source.** Two verdict scripts also returned an
EMPTY string on a `KeyError` — a `FAIL:` with nothing after it — and now name the missing
column instead.

**In a fixture:** ⚠️ **`conventions-gate-falsify.sh`'s `F18` was DEAD, and this task killed
it.** It anchored on a layout pair in `(tabs)/index.tsx` — `alignItems: 'center',
justifyContent: 'center'` — which this task's rewrite of Inicio broke apart, so the `sed`
matched nothing and the fixture reported *"EDITED NOTHING"*. **THIRD INSTANCE in that one
harness**: `F10` and `F12` went the same way, and the per-fixture anti-vacuity diff is the
only reason any of the three was noticed rather than counted as evidence. ✅ **Re-anchored on
the violation itself inverted** — `backgroundColor: PALETTE.fondo` replaced by a named colour
— which can only stop applying on a screen that has stopped reading the palette, and `R11`
would already be shouting about that.

⚠️⚠️ **AND THE SENTINEL RULE WAS BROKEN A THIRD TIME IN THREE SESSIONS — THE NINTH
INSTANCE, AND THE FIRST ONE THAT DISARMED A FIXTURE RATHER THAN FIRING A CHECK.** The
closing sentence written into `5b-ii-a`'s row listed what the task shipped, and that list
named one of the eight things `5b-ii-split-coverage.sh` recognises that row by. Nothing went
red: the guard stayed green and `Z3` — the fixture whose whole job is to make that
deliverable homeless — **could no longer make it homeless**, because the word survived
elsewhere in the row. It reported the guard passing on a broken tree, which is the vacuous
green the harness exists to catch, and it was caught by running the harness rather than by
reading. ✅ **The SENTENCE was changed, not the check**, and the row now says why it does not
list its own files. ⚠️ **The eight earlier instances all had the check going red or the guard
going wrong; this one made a FIXTURE lie**, which is a quieter failure and reachable by any
session that adds a sentence to a row a guard reads.

#### ⚠️ Four decisions taken on the owner's behalf, and the first is the one to look at

| | Decision | Why, and what it costs to reverse |
|---|---|---|
| **1** | ⚠️⚠️ **A MEMBER WHOSE EMAIL THIS APP CANNOT RECOVER IS NAMED BY THEIR ROLE — *Dueño* — AND NOT LEFT BLANK.** | `T2` said the founding owner has no invite row; the sizing did not say what his row should then SAY. **It is reached in the pilot on day one**: C11.2 makes the second person a manager, she opens Ajustes, and the owner's row is the one with nothing in it. A blank row is the app showing a shopkeeper an internal state, which the owner's own rule refuses. ⚠️ **It is the ruling of 2026-09-14 extended, not bent** — still no NAME anywhere, and no migration to add one. **Reversed by one branch in `rosterFrom`** |
| **2** | **`src/lib/store.ts` — one device store, where there were about to be two.** | The density switch needed the same lazy accessor and the same try/catch `lastScreen.ts` has had since `5a-iii-b`. The alternatives were a second copy (the defect recorded thirteen times here) or `@/theme` importing `@/navigation` to remember what a phone is. `RouteMemory` survives as a type alias so `last-screen.test.ts` reads unchanged — **23 assertions, untouched and still green.** **Reversed by inlining it back** |
| **3** | **`ES.members.shareMessage` is a FUNCTION, and `src/strings.ts` says it holds flat literals.** | The alternative puts the sentence's GRAMMAR — word order, where the code sits relative to the shop's name — in `@/api/members`, and grammar is exactly what a second language would have to change. A template still fails the typecheck on a missing key, which is the whole benefit that file has before there is an i18n runtime. **Reversed by two string fragments** |
| **4** | **The way into Ajustes is a button in the middle of the placeholder Inicio.** | §2.8's Inicio, as área 13 amended it, puts Ajustes with the rows to Productos and Proveedores — and that screen is `5d`. The alternative was a `headerRight` icon, refused because **C12.1 forbids an icon with no word** and a header corner has no room for one. **Reversed by `5d`, which has to place it properly anyway** |

⚠️ **What no check here can see, named rather than left to be found (`R9`):** that the sheet
is legible. `R11` proves no colour is a literal and says nothing about whether amber on cream
can be read across a counter — área 13's own recorded limit, and the eye is the owner's.
⚠️ **Nor that the density survives a cold start**: a suite that never stops running cannot
demonstrate persistence. `app/test/density-memory.test.ts` pins what is written and what a
later read makes of it; the rest is the phone, and it is the same instrument `5a-iv-d` is
already holding for C1.4.

✅✅ **RULED BY THE OWNER 2026-09-18 — *"manager-and-above is right."* THE ROSTER IS FENCED,
AND `5b-ii-a` IS UNCHANGED.** The sizing below took this on his behalf the same morning and
flagged it as the one thing it most wanted looked at; he confirmed it within the day, so the
`5b-ii-a` row now records a **ruling** rather than a call. **A staff member opening Ajustes
sees the shop and their own settings, and no list of people.** ⚠️ **The measurement is `N3`
below and it is the whole argument**: `workspace_invite` is readable at `manager`
(`0002:563`) while `workspace_member` is readable by any member (`0001:524`), so a staff
caller can read the roster and identify nobody on it — the alternative was a list whose every
row but their own is blank, which is the app handing a shopkeeper an internal state.
✅ **Nothing else moves**: no schema, no app code, no migration, and the deliverable list is
the same eight. `docs/checks/5b-ii-split-coverage.sh` already held this sentence as a decision
and now holds it as a ruling — **the check did not change, only what it is protecting.**

✅✅ **`5b-ii` IS SIZED `L` AND SPLIT IN TWO AS OF 2026-09-18, BEFORE A LINE OF IT WAS
WRITTEN — AND `5b-ii-a` IS THE NEXT TASK.** ⚠️ **No app code was written in this session and
none should have been**: `app/src/` and `supabase/migrations/` are untouched, and this
section, three table rows, one new guard, its harness, the two `app.yml` steps that run them,
and the *"where we are"* rows in `docs/HANDBOOK.md` — three of which were already stale before
this session opened the file — are the whole of it. It is `5b`'s own argument one level down — **the
cheapest moment to be wrong about the shape of two screens is now, in a file, rather than
after one of them exists.**

#### ⚠️⚠️ Why it is an `L` and not the `M/L` the row carried — five deliverables, twelve things to build

The row names five: **Ajustes**, the **join code** and its share, **member management**,
**`create_invite`**, **`redeem_invite`**. Counting what has to exist before a second person is
standing in the shop with the app open:

1. **The app's first non-tab surface.** §2.8 fixed Ajustes as a sheet. There is no modal
   route, no presentation option and no sheet anywhere in thirty source files.
2. **An entry point to it**, from a Home screen that is still `Pendiente` scaffolding.
3. **The first screen that adopts the palette.** `5b.6` shipped eleven roles with **no
   consumer**, and `R11` refuses a colour literal — so every colour decision on these
   surfaces is made for the first time, under a rule nothing has been held by yet.
4. **Two reads the app has never done**, and they are two because PostgREST cannot do it in
   one — see `N4`.
5. **The member list itself**, with three identity cases and not the one the row describes —
   see `N3`.
6. **The join code and a `Share` sheet**, the app's first hand-off to another application.
7. **`create_invite`** — four arguments, one of them an array, one of them conditional on the
   role — and a **token rendered once and never recoverable**, which is a screen state this
   app has no shape for.
8. **A location for a staff invite**, which `0028` refuses to do without — see `N1`.
9. **`redeem_invite`**, off the landing `5b-i` built, which is a second actor on a second
   device.
10. **The density switch and its persistence**, parked on this sheet by `5a-iii-b` and
    carried in no deliverable list until today — see `N2`.
11. **The contract check.** `5b-i`'s own record is that a wrong `p_` name is a **404 that the
    typecheck, the suite and the bundler all pass over**; that argument covers two more RPCs
    and five more argument names here.
12. **The Spanish copy** for all of it, including the two error branches `0028` raises by
    workflow code (`TD003`) rather than by constraint.

⚠️ **`5b-i` was an `M` and shipped five `src/api/` modules, one screen, one route group and
one contract check.** This is two surfaces, two definer RPCs, two actors, a share sheet, a
device setting and the first palette adoption. **The `M/L` was written on 2026-09-14 against
the five nouns on the row, and four of the twelve above were not visible from it.**

#### ⚠️⚠️ Four things found by reading the applied schema and this file's own notes, not the row

**`N1` — A `staff` INVITE CANNOT BE CREATED WITHOUT A LOCATION, AND NOTHING ON THE ROW SAYS
SO.** `0028:291` raises `22023` — *"a staff invite must name at least one location"* — and
`4.6a-ii`'s decision 4 records why it is there and why it is **`D8`'s argument rather than
`D8`**. The split of 2026-09-14 assigned the picker to the other child, which owns `D8`
itself. ⚠️ **So the push path needs its own**, and a `location` read the app does not have.
✅ **C1.5 makes it free for the pilot**: the two shops are one location each, created by
`onboard_workspace`, so nothing is asked when there is one. **The picker appears only when a
shop has more than one, and it refuses to be empty** — the same predicate `D8` puts on
approval, one task earlier. ⚠️ **Whether that picker and `5b-iii`'s approval picker are ONE
component is `5h.5`'s business, not this split's**, and naming it here is what stops them
being two by accident.

**`N2` — THE DENSITY SWITCH HAS BEEN PARKED ON THIS SHEET SINCE `5a-iii-b` AND IS IN NO
DELIVERABLE LIST.** That task's own closing notes say the mode is a **device** setting
(`5a-ii`'s decision 4), that the storage engine now exists, and that *"the surface that sets
it is `5b`'s Ajustes"* — then deliberately did not build it, because *"persisting it behind a
placeholder switch would put the write in the file that gets deleted."* ⚠️ **It was correct to
defer and nobody wrote it down where a guard could see it.** C3.18 is the constraint; the
scale is `5a-ii`'s and shipped; the control is this sheet's and has no home. ✅ **It is now a
deliverable of `5b-ii-a`**, and that is scope this row did not carry — flagged below.

**`N3` — ⚠️⚠️ THE EMAIL RULING HAS A THIRD CASE, AND IT IS THE ONE A PILOT WOULD MEET LAST
AND TRUST LEAST.** The ruling of 2026-09-14 is *"identified by EMAIL, recovered from
`workspace_invite`, with the caller's own row labelled Tú"*, and `T2` already recorded that
the founding owner has no invite row. **Measured today, from `0002:563`:
`workspace_invite_select` is `has_role(workspace_id, 'manager')`** — its own comment says *"the
row carries an email address and a token hash, and staff have no reason to enumerate
either"* — while `workspace_member_select` (`0001:524`) admits **any member of the
workspace**. So the roster is readable by staff and the identities on it are not. There are
three cases, not one:

| Who is looking | At whose row | What comes back |
|---|---|---|
| anyone | their own | *Tú*, with no lookup — `T2`'s answer, and it still holds |
| a manager or owner | someone who joined by invite | the email, as ruled |
| ⚠️⚠️ **a staff member** | **any row but their own** | **nothing at all** — and a manager looking at the founding owner gets nothing either, which is `T2` |

⚠️ **A roster of blank rows is a screen inventing a state the schema deliberately refuses.**
The decision taken is below and it is the one this session most wants looked at.

**`N4` — THE JOIN IS DONE IN TYPESCRIPT, AND POSTGREST CANNOT DO IT AT ALL.** The instinct is
`select=*,workspace_invite(email)`. **There is no foreign key between `workspace_member` and
`workspace_invite`** — `workspace_invite.accepted_by` and `workspace_member.user_id` both
reference `auth.users`, which §2.7 never exposes — so PostgREST has no relationship to embed
and returns `PGRST200`. ⚠️ **Two reads, joined on `accepted_by = user_id` in the client**,
which is why the member list is a data-layer task and not a list component.

#### The seam, and what each piece is

| | Takes | Why the line is here |
|---|---|---|
| `5b-ii-a` | Ajustes as a surface, the density switch, the roster, the join code and its share | **Everything that READS, and nothing that writes a membership.** It is the piece that has to solve *"what is a sheet in this app"* and *"what does a screen look like"* — the first palette consumer and the first non-tab route — and it is a closed loop on its own: an owner opens Ajustes, sees who is in the shop, shares the code, and sets his own text size |
| `5b-ii-b` | `create_invite` and its token, the location a staff invite must name, `redeem_invite` | **Both membership writes, and both actors.** It is the closed loop the parent row describes — an owner invites, a second person redeems, and there are two people in the shop — and it arrives at a sheet that already exists, so it adds a control and a flow rather than inventing a surface |

⚠️ **The invariant is statable in one line and that is the point: `5b-ii-a` ships no
membership write.** Not *"mostly reads"* — none. That is what makes the seam checkable rather
than a matter of taste, and it is what the guard below asserts.

#### Three alternative seams considered and refused

- **The surface first, then everything with a person in it** — Ajustes, density, code and
  share in one piece; roster, invites and redemption in the other. Refused: the second piece
  is an `M/L` again, which is the defect being fixed, and it is `4e`'s and `4.6a`'s recorded
  mistake — the second half needs splitting on the day it is taken.
- **Split by PERSON**: everything the owner sees, then the joiner's screen. Refused: the
  joiner's half is one screen and one RPC, an `S`, and the owner's half is then the whole `L`
  minus a text field. A split that moves a tenth of the work is a renumbering, not a split.
- **The data layer first, then the screens.** Refused by the parent's own argument, which this
  session did not have to re-derive: *"a screen with no call is a deliverable no check in this
  repository can see"*, §2.11 bans rendering suites, and the inverse — a typed module nothing
  calls — is the same defect facing the other way. `5b-i` shipped its layer and its screen
  together and that is the pattern `5b.5` has now written down.

#### ⚠️ Four decisions taken on the owner's behalf, and the second is the one to look at

| | Decision | Why, and what it costs to reverse |
|---|---|---|
| **1** | **The seam above**, and `5b-ii` stops being takeable | A sizing judgement, which is the session's job under the working agreement. The three alternatives and why each loses are written out above. **Reversed by one plan edit** — nothing after `5b-ii` renumbers, because these children ship no migration |
| **2** | ⚠️⚠️ **THE ROSTER IS MANAGER-AND-ABOVE. A STAFF MEMBER OPENING AJUSTES SEES THE SHOP AND THEIR OWN SETTINGS, AND NO LIST OF PEOPLE.** | `N3` is the measurement. The alternative is a list whose every row but one is blank, which is this app deciding to show a shopkeeper an internal state — the thing the owner's own rule refuses. **The database already made this call and wrote its reason in the migration** (*"staff have no reason to enumerate either"*, `0002:561`); rendering the section anyway would be the client disagreeing with a policy it cannot win against. ⚠️ **It is a decision about what a screen RENDERS, so it has no constraint to live in** — it is held by the guard below, in the shape the ruling of 2026-09-14 is held. **Reversed by one predicate**, today or after the screen exists. ✅✅ **CONFIRMED BY THE OWNER THE SAME DAY — *"manager-and-above is right."* It is a RULING now**, and the only one of the four here that stopped being the session's call |
| **3** | **The density switch is `5b-ii-a`'s, and that is scope the row did not carry.** | `N2`. The alternative is a fifteenth homeless deliverable, and the reason `5a-iii-b` gave for deferring it — *"the file that gets deleted"* — stops applying the moment Ajustes is real. ⚠️ **It is the only thing here that makes the task BIGGER**, and it is named rather than absorbed. **Reversed by one plan edit**, and it would then need a home |
| **4** | **Nothing is asked when a shop has one location; the picker appears only above one.** | `N1`, and C1.5 says the pilot never sees it. The owner's tie-break is the option that adds no human step, and asking a one-store shopkeeper which store is the question with no right answer `5b-i` already refused about the location's NAME. **Reversed by always showing it** |

#### The guard, and what it does not do

`docs/checks/5b-ii-split-coverage.sh` is `5b-split-coverage.sh` pointed one level down. It
asserts the parent row and both children exist, that each child is stated **exactly once**,
that the parent still promises each of the **eight** deliverables — five of them the row's
own, three added by `N1`, `N2` and the 2026-09-14 ruling — that each lands in exactly one
child and the assigned one, that the roster's manager fence is still written down, and that
the parent says it is **no longer takeable**.

⚠️ **It cannot tell a good split from a bad one.** It cannot see whether `5b-ii-a` is really
buildable in a session, and it cannot see a membership write appearing in it — only that the
row does not CLAIM one. ⚠️ **And nothing here can see the palette being used well**: `R11`
proves no colour is a literal and says nothing about whether the result is legible, which is
área 13's own recorded limit and why the eye that checks it is the owner's.

**Nine fixtures over the guard itself** (`5b-ii-split-coverage-falsify.sh`), each mutating a
copy of this file and matching the MESSAGE rather than the exit code, for the reason its
sister harness paid for: *a fixture that is red for the wrong reason is not a falsification,
it is a coincidence.*

| Fixture | The edit | Result |
|---|---|---|
| **Z0** | the control, unedited | 🟢 — a harness whose baseline is red runs no fixture at all |
| **Z1** | `5b-ii-b`'s row deleted | 🔴 *"no table row for 5b-ii-b"* |
| **Z2** | ⚠️⚠️ **`create_invite` moved into `5b-ii-a`** — the commonest real mistake, a session that has just built the roster finding the invite button one line away | 🔴 *"this split assigned it to 5b-ii-b"* |
| **Z3** | the density switch in no child | 🔴 *"in the parent row and in NO child"* — `N2`'s whole point, since it was homeless for six days already |
| **Z4** | ⚠️⚠️ the join code struck from the PARENT row | 🔴 *"no longer named in the parent 5b-ii row"* — the edit that makes a coverage check **vacuous** rather than red, which is this repository's most-recorded check defect |
| **Z5** | `5b-ii-a`'s row stated twice | 🔴 — `5a-iv`'s sub-split defect, which cost an hour of two simultaneous routings |
| **Z6** | ⚠️ **the roster's manager fence deleted from `5b-ii-a`** | 🔴 — the fixture that guards a DECISION rather than a deliverable, and the decision is `N3`'s |
| **Z7** | the parent row stops saying it is not takeable | 🔴 — `plan-handover.sh`'s `V4` is the record of what that costs |
| **Z8** | ⚠️ `5b-ii-a` **also** claims `redeem_invite`, which `5b-ii-b` still ships | 🔴 *"owned by neither"* — `Y8`'s shape, and nothing is DROPPED, which is why a check that only counted homes would pass |

⚠️⚠️ **`Z2` WAS RED FOR THE WRONG REASON ON ITS FIRST RUN, AND THAT IS WHY `Z8` EXISTS.** It
was written as a COPY — `create_invite` added to `5b-ii-a` and left in `5b-ii-b` — so the
guard reported *"owned by neither"*, which is a real defect and not the one the fixture is
named for. **The MISROUTED branch is only reached when a deliverable leaves its owner, and it
was untested until the harness said so.** ✅ `Z2` is now a genuine move and `Z8` covers the
branch it had been hitting by accident. ⚠️ **This is `Y2`'s lesson arriving one variant over**,
and it is the second time in two splits that the fixture, not the guard, was the thing that
was wrong.

⚠️⚠️ **AND THE SENTINEL RULE WAS BROKEN WHILE THIS SPLIT WAS BEING WRITTEN — THE EIGHTH
INSTANCE, CAUGHT IN SECONDS BY A CHECK RATHER THAN IN DAYS BY A PERSON.** The new `5b-ii` gate
cell named the data layer by its path while explaining that the row deliberately does not name
it, and `5b-split-coverage.sh` went red with *"owned by neither"* on the sentence that had just
been typed. ✅ **The SENTENCE was changed, not the check** — the cheaper half of *never spell a
check's sentinel in the file it reads*, and the half this file records as the one that keeps
being forgotten. ⚠️ **The row's own text had warned about exactly this, one clause earlier.**

⚠️ **The parent `5b` guard is untouched and still green at 15/15.** Its deliverable list reads
`5b-i`, `5b-ii` and `5b-iii` only, and the three rows it reads still name everything they
named yesterday — a grandchild row is invisible to it by construction, which is the property
that let `4.6a` be split without rewriting `5a`'s guard.

#### ⚠️ And `docs/HANDBOOK.md` was three rows stale before this session touched it

Its *"where we are"* table still said `5b.6` was *"where the next piece of work is"* — closed
2026-09-17 — and `5b.5` was *"after `5b.6`"*, closed 2026-09-18. ⚠️ **Neither session updated
it**, and `plan-handover.sh` cannot see it: that check reads `docs/PLAN.md` and nothing else.
**This is the thirteenth stale-copy defect recorded here and the second time the HANDBOOK is
the copy that went quiet** — `#76` was the first. ✅ **Fixed in the same commit**, and named
rather than tidied away silently, because the interesting part is that two consecutive
sessions closed a task and left the non-developer's page saying it was next.

⚠️⚠️ **AND THE REASON IS STRUCTURAL, NOT CARELESSNESS: NOTHING READS `docs/HANDBOOK.md`.**
`plan-handover.sh` reads `docs/PLAN.md` and stops there; `conventions-gate.sh` reads
`docs/CONVENTIONS.md` and `app/`; `app.yml`'s `paths:` filter names both of those pages and
not this one. **The one page written for the person who cannot read the others is the only
page in `docs/` with no instrument over it at all.** ⚠️ **Deliberately not fixed here** — a
guard over it is its own task with its own fixtures, and inventing one inside a sizing
session is the shape this file refuses. **It is named so the next interstitial has somewhere
to start**, and because the count above will otherwise keep going up for the same reason.

✅✅ **RULED BY THE OWNER 2026-09-18 — *"amend ADR-035 §3 to say 5h.5."* THE ADR NOW SAYS THE
OBLIGATION TAKES TWO PASSES, AND `5b-ii` IS THE NEXT TASK, UNCHANGED.** §3 named the
`src/api/` **and** `src/ui/` conventions together at `5b.5`; `5b.5` wrote the first half and
could not write the second, because `app/src/ui/` did not exist. **§3 now carries a `5b.5.`
entry for `src/api/` and a `5h.5.` entry for `src/ui/`**, each with the reason, plus an
amendment note on step `5a` and a dated revision entry. ~~`5b-ii` is the next task,
unchanged.~~ ⚠️ **`5b-ii` was sized `L` and split in two later the same day — see the entry
above; `5b-ii-a` is what gets taken, and this ruling is unaffected by the split.**
⚠️ **No schema, no app code, and nothing was built against the old wording** — the plan made the split on 2026-09-18 and
flagged it as owed here rather than letting §3 read as though a closed task still owed
something it never delivered.

⚠️ **§2.10's ONE-LINE COPY OF THE SAME CLAIM WAS AMENDED TOO, AND THAT IS A DECISION TAKEN
ON THE OWNER'S BEHALF.** He named §3. §2.10's *"the conventions describing them are written
at `5b.5`"* is the same sentence one section away, and leaving it would have manufactured the
eighth stale copy in this repository **in the act of fixing the seventh**. ⚠️ **It is the
smaller of the two edits and it is flagged because it was not asked for.** **Reversed by one
sentence.**

⚠️⚠️ **AND ASSERTION `0c` — THE ONE THAT READS THE ADR — HAD NO FIXTURE AND HAD NEVER HAD
ONE, IN THE SEVEN DAYS SINCE IT WAS WRITTEN.** The only thing exercising it was the harness's
BASELINE, which is not a falsification: a green baseline says the check passes on a correct
tree, and so does a check that reads nothing. **That is exactly how it was found dead on
2026-09-14** — the harness had never copied `docs/adr/` and every fixture in the file had
silently stopped running. ✅ **`F28`, `F29` and `F30` are its first three.**

⚠️⚠️ **AND THE FIRST RUN OF THEM SAID *"FIXTURE EDITED NOTHING"* — THE SAME DEFECT ONE LAYER
IN.** The harness's per-fixture anti-vacuity guard diffs the tree to prove a fixture broke
something, and **it diffed five inputs while the gate reads six**: `docs/adr/` was copied in
2026-09-14 and never added to that list, so an ADR-only fixture edited the file correctly and
was reported as proving nothing. ⚠️ **The 2026-09-14 lesson was *"an assertion and the thing
that falsifies it read the same set of files"*, and the harness obeyed it at the COPY step and
not at the CHECK step.** ✅ Fixed, and the rule is written beside the list: **that list and
the gate's inputs are the same set, and a fixture that edits each one is what keeps them so.**

⚠️ **Assertion `0c` no longer greps the literal `5b.5` either.** `5b.5` is a closed task this
ADR will name in its revision log for ever, so the literal would have passed while the LIVE
deferral — `5h.5` — could have been dropped from §3 with nothing going red. It now asserts the
ADR names **the task the page defers to**, which is the same repair `0b` got hours earlier and
the sixth instance of *a check pinned to the thing that moves*.

**The three fixtures assertion `0c` never had** (`conventions-gate-falsify.sh`):

| Fixture | The edit | Result |
|---|---|---|
| **F28** | The ADR stops naming the task the page defers to | 🔴 *"docs/CONVENTIONS.md defers a convention to '5h.5' and ADR-035 does not mention it"* |
| **F29** | ⚠️ Step `5a`'s DELIVERABLE LIST claims `src/api/` back — the exact reversion a session obeying *"the ADR wins"* would make | 🔴 `0c` |
| **F30** | ⚠️⚠️ The amendment marker deleted. Without it the region `0c` reads is the whole block, and the guard finds the words in the note that records the fix — **the trap `0c` shipped with in 2026-09-13 and the reason it bounds its region** | 🔴 `0c` |

**Thirty fixtures, all behaving (29 red, 1 deliberately green); sixteen assertion groups; 173
assertions unchanged.**

✅✅ **`5b.5` IS DONE AS OF 2026-09-18 — THE `src/api/` CONVENTIONS ARE WRITTEN, AND `5b-ii` IS THE NEXT TASK.**
`docs/CONVENTIONS.md` gained **`R12`** (a route reaches Postgres through a hook, or not at
all) and **`R13`** (an RPC's name, its `p_` arguments and its columns are written once, in a
module the suite can read), both read by `docs/checks/conventions-gate.sh`; a row in **`R3`**
for the `workspace.ts` / `calls.ts` pair; a second instance named in **`R4`**; and `src/api/`
in the file-layout tree, which had never listed it. **Sixteen assertion groups, twenty-seven
fixtures, 173 assertions still passing, no app code and no migration.** ~~And `5b-ii` is the
next task.~~ ⚠️ **It was, for a few hours: `5b-ii` was sized `L` and split in two on
2026-09-18 and `5b-ii-a` is the next task — see the entry above.**

⚠️⚠️ **THE `src/ui/` HALF WAS NOT WRITTEN AND IS NOT PRETENDED TO BE. IT MOVED TO A NEW ROW,
`5h.5`, AND THAT IS THE DECISION THIS SESSION MOST WANTS LOOKED AT.** `app/src/ui/` does not
exist — measured, not assumed: thirty source files, and the only shared component is
`src/scaffolding/Pendiente.tsx`, which exists to say a screen is not built yet. ADR-035 §3
names `5b.5` as *"the `src/api/` and `src/ui/` conventions"*, so half of a row this file
marks DONE has moved. ⚠️ **The alternative was to write the `src/ui/` rules today, against
nothing** — which is the exact thing the owner refused on 2026-09-13 (*"rather than ten
primitives guessed at against screens nobody has drawn"*) — **or to leave `5b.5` open and
unstartable until `5h`**, which parks a row nobody can take in front of the one task per
session. ✅ **ADR-035 §2.10's own words are why this is an upholding rather than a bend:**
*"the claim here is about ORDER RELATIVE TO STEP 6, not about the letter."* `5h.5` is after
the last task that builds a primitive and before step 6. ⚠️ **Whether the ADR's §3 line
should be amended to SAY that is parked in the decisions block** — it is a record, not a
blocker, and it is cheap today.

⚠️⚠️ **THE VERIFICATION THAT MATTERS IS `conventions-gate-falsify.sh`, AND IT FOUND A DEAD
FIXTURE ON THE FIRST RUN — THE FOURTH STALE MECHANISM IN THAT ONE FILE.** The gate printing
*"all 16 assertion groups passed"* is the same sentence it prints having stopped reading the
files. So the check that looked at `R12` and `R13` is the harness that turns them red on
purpose: **`F22`** a route importing the client, **`F23`** a route importing the wrapper past
the hook, **`F24`** the RPC's name typed at the call site, **`F25`** the `p_` names typed at
the call site — *the half a named constant does not cover* — **`F26`** `select('*')`, and
**`F27`** the page and the plan naming different tasks. **Twenty-seven fixtures, all behaving
(26 red, 1 deliberately green).**

⚠️⚠️ **FINDING 1 — `F20` WENT VACUOUS, AND THE TASK THAT DISARMED IT IS THIS ONE.** `F20`
proves assertion `0d` can see the page's quick-start line forget a rule. It did that by
spelling the whole line out and re-writing it one rule shorter — so **this task adding `R12`
and `R13` to that line left its `sed` matching nothing**, and the harness printed *"FIXTURE
EDITED NOTHING — proves nothing"* rather than a false green, which is the per-fixture
anti-vacuity guard doing precisely its job. ⚠️ **After `F9`'s LINE NUMBER, `F10`'s RULE NAME
and `F12`'s FILE COUNT, this one was pinned to a LITERAL COPY OF THE LINE IT PROTECTS.**
✅ **Re-anchored to drop the last rule token on the line, whatever it is named.**

⚠️⚠️ **FINDING 2 — `F10` WAS STALE AGAIN, FOR THE THIRD TIME, AND ITS OWN COMMENT CALLED THE
NAME IT USED *"deliberately absurd"*.** It mutated the page by inventing **`R12`** — and this
task made `R12` and `R13` real four days after that comment was written. The name was not
absurd; it was next. ✅ **The fixture now COMPUTES the number one past the page's highest**,
so there is no number left for the codebase to claim out from under it. **The expiry date is
removed rather than postponed**, which is what the two previous repairs did.

⚠️⚠️ **AND ASSERTION `0b` WOULD HAVE GONE GREEN ON THIS VERY EDIT WHILE ASSERTING NOTHING.**
It carried the two literals `5b.5` and the page's exact sentence about it. This task changed
the page's sentence (PAGE_DEFERS → false) and closed the row (PLAN_OPEN → false), and **false
on both sides is that check's *"nothing is owed, and that is correct"* branch.** It would have
reported success on the deferral that had just moved. ✅ **Rewritten to READ the task id from
the page's heading and from the plan's rows and compare them**, so the next move is checked
too; `F14`, `F15` and `F27` cover its three failure branches. ⚠️ **This is the fifth time in
this repository that a check's sentinel was the thing that moved.**

⚠️⚠️ **FIVE DECISIONS TAKEN ON THE OWNER'S BEHALF. THE FIRST IS THE ONE THAT CHANGES SOMETHING
HE RULED ON, AND IT IS FLAGGED LOUDLY FOR THAT REASON.**

| | Decision | Why, and what it costs to reverse |
|---|---|---|
| **1** | ⚠️⚠️ **`5b.5` IS CLOSED HAVING WRITTEN HALF ITS STATED SCOPE; THE `src/ui/` HALF IS NOW `5h.5`.** | The argument is above and in the new row. ⚠️ **It disagrees with the LETTER of ADR-035 §3**, which names both halves at `5b.5`, and agrees with §2.10's own reading of what that claim is about. **Reversed by one plan edit today**; after `5d` it is reversed by writing primitive conventions against primitives that exist, which is not a reversal at all |
| **2** | ⚠️ **Assertion `0b` rewritten, not just re-pointed.** | Re-pointing it at `5h.5` was two literals and ten seconds. It would have gone stale the next time the deferral moves, and it had just been shown to go SILENTLY stale rather than red. **Reversed by restoring two greps** |
| **3** | **`R12` bans a route importing `@/api/calls`, `@/api/errors` or `@/lib/supabase`, and NOT `@/api/workspace`.** | `checkShopName` is a screen's business and `bienvenida.tsx` already calls it. The ban is on the modules that TALK and the module that decides what a failure MEANS. **Reversed by one token in the gate** |
| **4** | **The gate watches the SCREEN side of the boundary; the suite keeps the inner side.** | `app/test/auth-errors.test.ts` already pins *"the library has exactly one caller"* as an equality. Repeating it in the gate is two copies of one claim, which is the defect this file exists for. ⚠️ **The page says which instrument holds which half**, because *"checked by a suite"* and *"checked by a person"* look identical from a `**Checked by:**` line |
| **5** | ⚠️ **`R13` also bans `select('*')`, which is not about the `p_` trap.** | It rode along because it is the same sentence — *the shape of the row is written once, beside the RPC* — and the same file. It ships every column to a phone, including ones a later migration adds for a report the screen may not see. **Reversed by deleting one alternation** |

**The six fixtures added at `5b.5`** (`conventions-gate-falsify.sh`), plus the two repaired:

| Fixture | The edit | Result |
|---|---|---|
| **F22** | A route imports `@/lib/supabase`, one line above the hook it should have used | 🔴 `R12` |
| **F23** | A route imports the wrapper `@/api/calls` directly — the tidier-looking version of the same defect | 🔴 `R12` |
| **F24** | The RPC's name typed at the call site instead of the contract's constant | 🔴 `R13` |
| **F25** | ⚠️ The `p_` argument names typed at the call site, **keeping** the named constant — the half a constant does not cover, and the half that is a 404 rather than a type error | 🔴 `R13` |
| **F26** | `select('*')` in place of the named column list | 🔴 `R13` |
| **F27** | The page defers to one task and the plan owes another — assertion `0b`'s third branch, which the hardcoded spelling could not have had | 🔴 `0b` |
| **F20** | ⚠️⚠️ **Repaired.** It spelled out the page's quick-start line, so this task adding two rules to that line left its `sed` matching nothing | ⚠️ *edited nothing* → 🔴 once re-anchored to drop the last rule token, whatever it is called |
| **F10** | ⚠️⚠️ **Repaired, third time.** Its mutation invented `R12`, a name its own comment called *"deliberately absurd"*, and this task made `R12` real | 🟢 (wrongly) → 🔴 once it computes the number one past the page's highest |

⚠️ **WHAT NO CHECK CAN SEE HERE, NAMED RATHER THAN LEFT TO BE DISCOVERED.** `R12` proves no
route reaches past the hooks; it cannot prove the hook is the RIGHT one, and it cannot see a
second wrapper that returns `{ data, error }` instead of throwing — the habit TanStack Query's
`isError` actually depends on. That is prose in `R12`, and the first person to write a second
wrapper is the eye that checks it. **`5b-ii` is that person.**

✅✅ **`5b.6` IS DONE AS OF 2026-09-17 — THE APP HAS COLOUR, A MACHINE READS IT, AND `5b.5` IS
THE NEXT TASK.** `app/src/theme/palette.ts` holds the eleven roles as a typed record beside
`density.ts`; `R11` in `docs/checks/conventions-gate.sh` refuses a colour literal anywhere else in
`app/src/`; `conventions-gate-falsify.sh` now runs **twenty-one fixtures, all behaving** (20 red, 1
deliberately green) — **and it runs in CI for the first time**, which it never has. **No migration,
no screen, and not one component adopting the palette** — that
is `5b-ii`, and `5d` is the deadline. **The app is thirty source files and fourteen suites; 173
assertions pass, up from 166.**

⚠️⚠️ **THE VERIFICATION THAT MATTERS IS NOT THE SUITE, AND IT IS NOT THE GATE GOING GREEN EITHER.
IT IS `conventions-gate-falsify.sh`, AND IT FOUND TWO DEAD FIXTURES ON THE FIRST RUN.** A gate that
prints *"all 14 assertion groups passed"* prints the same sentence when it has stopped reading the
files, which is this repository's rule 4. So the check that looked at `R11` is the harness that
turns it red on purpose — `F17` a hex typed into a screen, `F18` the word `'white'`, which carries
no hex at all and is the spelling a person reaches for first, `F19` a colour put in
`theme/density.ts` to prove the exemption is ONE FILE and not a directory. **And `F13`, the green
one, now names a hex and a `color:` in a comment**: a guard that fires on the prose explaining a
trap makes deleting the prose the cheapest way to green.

⚠️⚠️ **FINDING 1 — `F12` WENT GREEN, AND THE TASK THAT DISARMED IT IS THIS ONE. THIRD STALE FIXTURE
IN THAT FILE, THIRD DIFFERENT MECHANISM.** `F12` proves the gate's anti-vacuity floor (`SRC_N < 10`)
can fire; it did so by deleting the **last twenty** of twenty-nine source files, leaving nine.
`palette.ts` made it thirty. **Thirty minus twenty is ten, ten is not fewer than ten**, the floor did
not fire, and the fixture reported success having proved that the guard against silent green is
still... green. ⚠️ **After `F9`'s LINE NUMBER and `F10`'s RULE NAME, this one was pinned to a FILE
COUNT** — and the task that breaks a count-pinned fixture is any task that adds a file, which is most
of them. ✅ **Re-anchored to `tail -n +4`**: keep the first three, whatever the tree grows to.

⚠️⚠️ **FINDING 2 — `F10` HAD GONE STALE AGAIN, BY THE MECHANISM ITS OWN COMMENT PREDICTED, AND
NOBODY WAS WATCHING FOR IT.** `F10` proves assertion 0 can see a rule added to the page and not to
the script. Its first spelling invented an `R10`; `R10` became real on 2026-09-13 and the fixture
started adding a duplicate heading that `sort -u` collapsed, going green while claiming to prove the
opposite. It was then rewritten to say **`R11`** — a name that `conventions-gate-falsify.sh`'s own
header was at that moment forecasting as *"already expected at `5b.5`"*. **This task made `R11`
real.** ✅ It now invents `R12`, and the lesson recorded is not *"pick a higher number"*: **a fixture
whose mutation is a name the codebase is expected to claim has an expiry date nobody wrote down.**

⚠️⚠️ **FINDING 3 — THE PAGE'S OWN SUMMARY OF ITSELF WAS STALE IN TWO PLACES, AND NOTHING READ IT.**
`docs/CONVENTIONS.md` said *"Nine rules; seven of them are read by a machine"* (it was ten and eight,
stale since `R10`), and its `bash docs/checks/conventions-gate.sh   # reads R1, R2, R4–R8` line had
**never** mentioned `R10`. Assertion 0 reads each rule's own heading and its *"Checked by:"* line —
it had never read **the page's summary of itself**, which is the part a junior who does not scroll
takes as the answer. ✅ **The English count is DELETED rather than corrected** — a number no machine
reads goes stale on the next rule — **and the list is now machine-read by new assertion `0d`**, with
fixtures `F20` and `F21`. ⚠️ A new assertion with no fixture is a rule nobody has shown can fail,
which is that harness's own sentence.

⚠️⚠️ **AND THE GATE'S ANTI-VACUITY FLOOR HAD ONE FREE DELETION IN IT.** `note_expected` read `11`
while **twelve** groups ran. A floor one below the truth lets a group be deleted with nothing going
red. ✅ Set to the real number, `14`, in the same pass that added two.

⚠️⚠️ **SIX DECISIONS TAKEN ON THE OWNER'S BEHALF. THE FIRST IS THE ONLY ONE THAT CHANGES SOMETHING
HE LOOKED AT, AND IT IS FLAGGED LOUDLY BECAUSE IT DISAGREES WITH THE CANVAS HE RULED ON.**

| | Decision | Why, and what it costs to reverse |
|---|---|---|
| **1** | ⚠️⚠️ **`atención` SHIPPED AS `#9A5A09`, NOT THE CANVAS'S `#A8620A`.** | **Measured, not preferred.** The drawn amber is **4.25:1 on `atenciónSuave`** — below WCAG AA's 4.5:1 for normal text, **on the exact pairing the role exists for**: amber words on the amber row. It also missed on `banda` (4.22) and `acción suave` (4.08). The shipped value is the **same hue (33.4°) and the same saturation**, three steps darker, and clears 4.5:1 on every ground with 4.69 at worst. ⚠️ **The canvas is outside this repository and cannot be updated**, so the eleven-role table above is now the record and carries the strike-through. **Reversed by one hex and one test constant** |
| **2** | **A test file at all — `app/test/palette.test.ts`, seven assertions.** | §2.11 allows a test that pins *"a value a customer sees"* and refuses suites over rendering. The contrast matrix is arithmetic over a table; nothing is rendered and no component is imported. It is `density.test.ts`'s argument, and finding 1 above is what it bought: the failure was found by running it |
| **3** | **`R11` scans `app/src/` only, not `app/test/`** | The gate's other literal rule, `R6`, does the same. A test that asserts a colour must be able to name one |
| **4** | ⚠️ **Assertion `0d` is new and was not in the row's definition.** | It is finding 3's fix. The row bought *"`R11`, with its fixtures"*; this is twenty lines and two fixtures more, and it closes a stale-claim class this task hit twice in one sitting. **Reversed by deleting one block and two fixtures** |
| **5** | ⚠️⚠️ **`conventions-gate-falsify.sh` NOW RUNS IN `app.yml`, AND IT NEVER HAD.** | Two other falsification harnesses were already wired in; **the repository's only committed harness for a STANDING gate was hand-run by whichever session remembered.** That is the sentence `app.yml` already carries about the two plan guards. ⚠️ **It is not hypothetical**: both of this task's dead fixtures were found by running it by hand, and it had previously spent a day dead. It writes nothing, needs no node, and costs seconds. **Reversed by deleting one step and one path** |
| **6** | ⚠️ **`5b.5` IS THE NEXT TASK, RATHER THAN RESUMING AT `5b-ii`.** | `5b.6` was inserted ahead of `5b-ii` so that screen would not invent colours; with the palette shipped, `5b-ii` is takeable again. But **`5b.5`'s own gate argues for now** — *"one consumer to reconcile instead of three"* — and `5b-ii` plus `5b-iii` are the other two. **Reversed by one plan edit** |

⚠️ **AND TWO THINGS ABOUT THE PALETTE ARE MEASURED, RECORDED AND DELIBERATELY NOT REPAIRED.**

- **`banda` and `atención suave` are TWO CHANNEL STEPS APART** — for a shopkeeper they are the same
  cream. They never abut today (one is the header, the other a list row), so it is not a defect; it
  is the sharpest argument there is for *no state announced by colour alone*.
- ⚠️⚠️ **`acción` and `atención` are 1.18:1 APART IN LUMINANCE.** Green-acts and amber-warns are
  carried **entirely by hue**, and hue is the channel roughly one man in twelve does not have. **A
  test asserts this weakness on purpose**, with the reasoning next to it, so that nobody later
  "fixes" the palette into a false sense of safety and drops the word. ⚠️ It is **not** repaired by
  darkening one of them: both already clear 4.5:1 on every ground, a monochrome viewer would still
  be guessing, and **the word is the fix and the word is free.** ⚠️ This is also how the third
  assertion in that file was written: a threshold **I invented** (*"the state colours are 1.2:1
  apart"*) went red, and the instrument was wrong, not the palette — luminance does not measure hue.

⚠️ **WHAT NO CHECK CAN SEE, NAMED RATHER THAN LEFT TO BE DISCOVERED.** `R11` proves every colour
comes from `palette.ts`. It cannot prove the RIGHT role was picked — `error` on a *cobrar* button is
green to this gate — and it cannot see the rule the whole round turns on, *never colour alone*,
because §2.11 bans the suite that would render a screen. That is `R9`'s shape, and it is why the
palette's header, `R11` on the page and ADR-035 §2.11 all carry the sentence in prose. **The first
screen to adopt a colour is `5b-ii`'s, and the eye that checks it is the owner's.**

✅✅✅ **ÁREA 13 — THE AESTHETIC ROUND — IS RULED AS OF 2026-09-17, AND ~~`5b.6` IS THE NEXT TASK~~ — `5b.6` WAS TAKEN AND CLOSED THE SAME DAY; SEE THE ENTRY ABOVE.**
The owner called it on 2026-09-15 (*"we need to make authoritative the simplicity and efficiency of
the aesthetic aspect… we won't have a big UX/UI team"*), chose **canvas first, then the interview**,
and settled it over three rounds of drawings rather than a questionnaire. **Direction B — Mercado —
is the app.** ⚠️ **No app code and no schema in this session**: this entry, an ADR amendment, two
annotated constraints, one new task row and two parked decisions are the whole of it.

📐 **THE CANVAS IS THE RECORD AND IT IS NOT IN THIS REPOSITORY — the link is the only copy:**
**`https://claude.ai/code/artifact/5d0fe2fd-3e7c-448a-a27d-4c0f2fe99127`**
Two pages. **Wera** holds the system sheet, the tab-to-card transition in three frames, and six
screens (Inicio, the Vender carrito, the vaciar confirmation, Productos, Familia, Números).
**Descartadas** holds the two rejected directions, kept on purpose as the record of the choice.
⚠️ **A session that cannot open that link has the eleven colour roles below and nothing else** —
which is why they are written out here rather than pointed at.

#### ⚠️⚠️ WHY THIS ROUND HAPPENED AT ALL, AND IT IS THE FINDING THAT MATTERS MOST

**The client reached `5b-i` with no palette, no motion rule and NO COLOUR ANYWHERE.** Measured, not
assumed: twenty-nine source files, zero `backgroundColor`, zero `color:` — every screen was default
text on a default ground. §2.11 had settled navigation, server state, money and strings **and had
never settled what the app looks like**; the UI/UX grill of 2026-09-07 covered twelve areas and
**aesthetics was not one of them**; `density.ts` says in its own header *"THIS FILE HAS NO COLOURS
AND NO FONTS"*. ⚠️ **The only colour decision in the project was C3.17's amber**, taken on the
owner's behalf, with no token behind it. **This was a hole, not a deferral**, and `5d` — the first
screen of the four §3 was talking about — is where it would have set.

#### The direction, and what the other two would have bought

Three directions were drawn over the **same** Vender basket, same data, the exact tokens out of
`density.ts`, differing on one question: **what tells the shopkeeper a row needs attention?**

| | Carries meaning with | Chosen? |
|---|---|---|
| **A — Papel** | **Weight and air.** Six roles, cheapest to render and to extend, closest to what the app already looked like | ❌ Almost nothing announced itself as tappable, and the counter needs that |
| **B — Mercado** | **Hue.** Green acts, amber warns, red destroys. Eleven roles | ✅ **Five more tokens than A, and they buy unmistakable affordance** |
| **C — Etiqueta** | **Structure.** 2 px rules, money in a boxed cell, state as a filled tag | ❌ Best under glare and for failing colour vision — but at *Letra grande* the borders ate the screen |

⚠️ **C's argument survived as a RULE rather than as a direction**, and it is the one worth keeping:
**no state is ever announced by colour alone.** Amber on its own is a weak signal for ageing eyes in
a badly-lit shop, which is the exact population C3.18 exists for — so every state carries colour
**and** a word, or colour **and** a border. It is also the only aesthetic decision here a machine
can check, which is why it becomes `R11` and not a paragraph.

#### The eleven roles, written out because the link may not open

| Role | Value | Its one job |
|---|---|---|
| fondo | `#FFFCF6` | the ground of every screen |
| superficie | `#FFFFFF` | lists, cards, sheets |
| banda | `#FBF0DE` | the screen header |
| tinta | `#201D16` | all primary text |
| tinta apagada | `#6F675A` | units and secondary labels |
| línea | `#E7E0D2` | 1 px separators |
| acción | `#1C6B4B` | cobrar, recibir, the active tab |
| acción suave | `#E6F0EA` | the resting fill of an action |
| atención | ~~`#A8620A`~~ **`#9A5A09`** | falta precio and `$0.00` — **C3.17, and nothing else**. ⚠️ **The canvas value was 4.25:1 on its own ground and was darkened at `5b.6`** — same hue, same saturation; see that entry |
| atención suave | `#FCF1DE` | the ground of a row needing attention |
| error | `#A32218` | `Quitar`, cancelling a sale, merma |

**Type is the operating system's own face** — no download, no layout shift on first paint, native
numerals. The pilot store spends its day without signal, and two of its four phones are low-end
Android; a brand face is a download and a reflow for a shop that cannot afford either.

#### ⚠️⚠️ TWO THINGS THAT WERE ALREADY WRITTEN DOWN ARE NOW DIFFERENT, AND BOTH ARE AMENDED IN PLACE

**`C8.13` — `Productos` is no longer family-first.** It listed a **grid of family tiles**; the owner
ruled on 2026-09-15 that it is a **flat list of every VARIANT**, and that tapping one opens the
family **with that variant preselected**. ⚠️ **It is arguably more consistent than what it
replaces** — C3.1 already flattens the transaction screens, so the whole app now flattens and the
family structure appears in exactly one place on purpose — **but it overwrites an interview answer
and is recorded as that**, not as a detail. The constraint's own bullet is annotated rather than
rewritten, the shape C11.8's ruling used.

**ADR-035 §2.8's Home row said *"No nav panel here — redundant"*, and Inicio is now partly one.**
The owner ruled that Vender, Comprar and Desperdicio are reachable **directly from Inicio**, and
Productos and Proveedores live there too. ⚠️ **The ADR was amended rather than reinterpreted**
(2026-09-17), because CLAUDE.md says the ADR wins and a design that quietly disagrees with it is
**the design that is the bug**. **The sentence's intent survives**: the day's takings and the
48-hour expiries stay **above** anything tappable, so Inicio still informs before it navigates.
⚠️ **`app/src/navigation/tabs.ts` carried the same claim in a comment** — a third copy, found by
grep rather than by memory, and updated in the same commit.

#### What the owner ruled, in his words

| | Ruling |
|---|---|
| **1** | *"Let's go full B."* |
| **2** | The carrito: **tapping the scrim continues selling**, so the header control becomes **`Vaciar carrito`** with **a small confirmation screen**. |
| **3** | The collapsed rows, the in-place controls and **`Quitar` instead of a swipe** are approved as drawn. |
| **4** | `Productos` is **good for the pilot**; the preselected variant shows **no legend**. |
| **5** | **Inicio was off**: bigger buttons that invite a tap, an easy animation that *"keeps the app live"*, and Vender / Comprar / Desperdicio reachable from it. |
| **6** | Explore **the tabs becoming buttons on Inicio and buttons becoming tabs elsewhere** — drawn in three frames on the canvas. |
| **7** | The **tab bar stays at four**; Productos and Proveedores are entered from Inicio. **This resolves C12.1's tension** — five icon-plus-word tabs do not fit 390 px, and the fifth tab `lastScreen.ts` anticipated is now not happening. |
| **8** | **The product-images build is deferred** (2026-09-15) — see its own block below. |

#### ⚠️ Nine decisions taken on the owner's behalf, and none is expensive to reverse

| | Decision | Why it was taken rather than asked |
|---|---|---|
| **1** | **The eleven roles and their exact values** | He ruled the direction; the hex is the sizing work that follows a ruling |
| **2** | ⚠️ **No state announced by colour alone** — the rule borrowed from direction C | The users are old and the shop is bright. It is the one rule here a machine can enforce, and it becomes `R11` |
| **3** | **The operating system's own font, no webfont** | Stated above: a download and a reflow the pilot cannot afford |
| **4** | **`error` became the eleventh role, for `Quitar`** | Removing a line is the only destructive act on that screen; giving it the same green as `+` would be the system lying about what the button does |
| **5** | **The preselected variant is marked three ways** — tint, border, check | Rule 2 applied to itself: if colour alone cannot announce a state it cannot announce a selection |
| **6** | **Vender gets the large card; Comprar and Desperdicio share the row below** | §2.8 already calls Vender the dominant loop. Three equal cards would be the layout lying about the day |
| **7** | **Only the tab items morph.** Productos and Proveedores are deliberately a different shape on Inicio | The geometry teaches the navigation model instead of the user having to learn it |
| **8** | **The entrance is staggered ~70 ms, the press is 3 %, and the tapped card leaves first and lands last** | One orchestrated reveal beats scattered micro-interactions, and the eye needs one thing to follow rather than three moving at once |
| **9** | ⚠️ **`5b.5` now also waits on `5b.6`** | So the conventions page describes `src/api/` **and** the palette in ONE pass instead of being opened twice. **It upholds his ruling of 2026-09-13 rather than bending it** — *"described once `5b` has produced a real one"* — and it is the second time that row has been re-pointed. **Reversed by one plan edit** |

#### ⚠️ What no check in this repository can see, and what will hold instead

§2.11 bans rendering suites, so **nothing will ever turn red because a screen got ugly.** Of
everything above, exactly one thing is machine-checkable — *no colour literal outside the palette* —
and it ships as **`R11`** in `5b.6`, with fixtures in `conventions-gate-falsify.sh`, the shape `R6`
already has for sizes. ⚠️ **Everything else is held by this entry and by the canvas**, which is a
weaker instrument than this repository normally accepts and is said out loud rather than papered
over. ⚠️ **And one behaviour needs a phone, not an argument**: the morph runs on **every** move to
and from Inicio, the commonest navigation in the app. Charming on day one, possibly slow by day ten.
**Measure it on the owner's own device before `5d`** — the rule this project already paid for twice.

✅✅✅ **`5b-i` IS DONE AS OF 2026-09-14 — a shop can be created from the phone, `src/api/`
exists, and `5b-ii` IS THE NEXT TASK.** Install, sign in, name the shop, answer C1.7, land on
Inicio. **No migration** — `0027`'s `onboard_workspace` has been applied since 2026-09-13 and
this task is the first thing that ever calls it. **The app is twenty-nine source files and
thirteen suites; 166 assertions pass, up from 146.**

⚠️⚠️ **THE VERIFICATION THAT MATTERS IS NOT THE VITEST RUN, AND SAYING WHY IS THE POINT OF
THIS ENTRY.** PostgREST resolves an RPC **by its parameter names**. Send `display_name` where
`0027` declared `p_display_name` and the call does not fail — **the function is not FOUND**:
`{"code":"PGRST202"}`, HTTP 404. **The typecheck passes, the suite passes, the bundle
builds**, and the first thing that notices is a shopkeeper who cannot create her shop, on the
one screen every other screen in `5b` is behind. Nothing in TypeScript has ever read `0027`.
✅ **So `docs/checks/5b-i-api-contract.sh` posts the app's own strings — read out of
`app/src/api/workspace.ts`, never retyped — to a reset database over HTTP and reads what comes
back.** Six assertion groups, all green: the empty read that IS the landing state, the RPC
answering to the three argument names, one row with every column asked for, **C1.7 carried as
`false` and not defaulted**, the first location named after the shop, and a blank name refused
as `23514`.

⚠️⚠️ **AND ITS OWN FALSIFICATION HARNESS FOUND A DEFECT IN IT ON THE FIRST RUN, IN THE ONE
LINE THAT MATTERS.** The check read the argument names with
`sed -n 's/^  readonly \(p_[a-z_]*\):.*/\1/p'` — **it recognised an argument by the very
prefix it exists to test.** So fixture `Z1`, which drops the prefix, made it report *"could not
read the contract"* instead of the `PGRST202` it is for: **red, and for the wrong reason** —
the worse kind, because it reads as the check being broken rather than the app being wrong,
and that is what gets a check deleted. ✅ **Fixed to read the `OnboardArgs` block, BOUNDED**,
which is `plan-handover.sh`'s own lesson applied by the next script written. **Six fixtures,
all matching the MESSAGE and not the exit code.**

⚠️ **IT RUNS IN `db.yml`, NOT `app.yml`, AND THAT IS THE FIRST TIME A SCHEMA WORKFLOW HAS
WATCHED A FILE UNDER `app/`.** The evidence it needs is a reset database with PostgREST and
GoTrue standing in front of it, which `db.yml` already has; so `app/src/api/**` is now in that
workflow's `paths:` filter. **Two files, one claim** — the argument that put `cases.json` there
and `docs/CONVENTIONS.md` in `app.yml`.

⚠️⚠️ **SEVEN DECISIONS TAKEN ON THE OWNER'S BEHALF, AND THE FIRST IS THE ONLY EXPENSIVE ONE.**

| | Decision | Why, and what it costs to reverse |
|---|---|---|
| **1** | ⚠️⚠️ **TanStack Query is installed and is now the app's server-state layer.** | **ADR-035 §2.11 names it — *"TanStack Query, exclusively"* — and the plan had never scheduled it.** This is the first server read this app has ever done, so it is the cheapest moment there will ever be; the alternative was `5b-ii` and `5b-iii` each inventing a read and `5b.5` then documenting a pattern the ADR does not describe. ⚠️ **Reversing it after `5b` costs three call sites, not one** |
| **2** | **Onboarding asks for ONE name, not two.** | `onboard_workspace` names the first location after the shop when passed `null` — **measured against the applied schema, not assumed** (the store came back called *Contrato 5b-i*). A one-store shop being asked a second name for the same building is a question with no right answer. The wrapper still takes the argument |
| **3** | **C1.7 defaults to *yes*, and the screen carries a one-line hint the ADR did not write** — *"Es el precio de la etiqueta, el que paga el cliente."* | The column is `default true` (`0001`) and almost every shop is. A default matching the common case is the one a person who does not read the question gets right by not answering it. ⚠️ **The hint is mine, not his** — the question itself is §2.8's wording, quoted |
| **4** | **The landing is `/bienvenida`, in a third route group `(onboarding)`.** | `guard.ts` now answers *which of three rooms* rather than *which side of the door*. `5b-iii`'s joiner lands here too — signed in, belonging to nowhere, is the same state whether they are about to create a shop or ask to join one |
| **5** | **The membership read is a `select` on `workspace`, not on `workspace_member`.** | `workspace_select` is `id in (select public.my_workspaces())`, so the table already answers the question and **an empty array IS the no-workspace state**. Reading the membership table needs a second policy hop to say the same thing |
| **6** | ⚠️ **C1.3's restore now requires an ESTABLISHED shop, which changes a `5a-iii-b` rule.** | Every route in `RESTORABLE_ROUTES` is a tab of a shop. Without it, a person who signed up last night is restored to Vender for one frame on the way to the landing — **and that frame spends the launch's one and only restore** |
| **7** | **`db.yml` now watches `app/src/api/**`.** | Stated above. It costs a `supabase start` on commits that touch the data layer |

⚠️⚠️ **AND RUNNING THE STANDING GUARDS AFTERWARDS FOUND TWO MORE THINGS, BOTH IN CHECKS
RATHER THAN IN CODE.** `5b-split-coverage.sh` went **red on a sentence written ten minutes
earlier**: the gate cell added to `5b-ii` said what `5b-i` had left for it and spelled a
deliverable that row does not own — **the seventh instance of *never spell a check's sentinel
in the file it reads***, and the second where the sentinel was spelled by prose describing a
legitimate hand-over. ✅ **The sentence was changed, not the check.** And
`conventions-gate-falsify.sh`'s fixture `F9` — *"a module's header block deleted"* — **went
GREEN while claiming to prove R8 can fail.** It deleted `guard.ts`'s first twenty-five lines
because that is where the header ended when the fixture was written; this task added a
paragraph to that header, the fence moved past line 25, and the deletion left a header
standing. ⚠️ **A fixture pinned to a LINE NUMBER of a file other tasks edit has an expiry date
nobody wrote down** — the same family as the stale `F10` that file already records. ✅ **Re-anchored to the fence itself. Sixteen fixtures, all behaving.**

⚠️ **WHAT NO CHECK IN THIS REPOSITORY CAN SEE, NAMED RATHER THAN LEFT TO BE DISCOVERED.**
§2.11 bans rendering suites, so **that `bienvenida.tsx` calls the contract the other two
checks agree about is the owner's own phone**, and it joins the list `5a-iv` already carries.
⚠️ **And one behaviour is deliberately unpolished**: between signing in and the membership read
returning, the guard moves nobody — correct, and on a bad connection it is a sign-in screen
that sits there looking idle. **A spinner for that state is rendering, and rendering is `5c`'s
and the phone's.**


✅✅ **RULED BY THE OWNER 2026-09-14, HOURS AFTER `5b` WAS SPLIT — *"EMAIL ONLY."* THE MEMBER
SCREEN SHOWS AN EMAIL AND NEVER A NAME, AND NO MIGRATION IS ADDED TO MAKE ONE.** The decision
`5b`'s sizing raised — *C11.8 asks for the requester's NAME and no table in this schema carries
one* — is answered, and it is answered with the option that **ships nothing**: the email is
recovered from `workspace_invite`, the caller's own row is labelled *Tú*, and
`auth.users.raw_user_meta_data` stays where §2.7 put it. ⚠️ **`5b-ii` and `5b-iii` are
unblocked, the decisions block is empty again, and it is the fifth decision parked and cleared
in that block on one date.**

⚠️⚠️ **C11.8 IS NOW PARTLY UNMET BY RULING RATHER THAN BY OVERSIGHT, AND THAT DISTINCTION IS
THE WHOLE VALUE OF HAVING ASKED.** His own sentence was *"the owner sees the requester's name,
email and the role asked for — enough not to approve the wrong Juan."* **One of those three is
not buildable** (`T1`), and he has now decided that the remaining two are enough rather than a
session deciding it quietly at three in the morning. ✅ **The constraint's bullet is annotated
in place rather than rewritten**, because what it asked for is the record of what he wanted and
the ruling is the record of what he settled for.

⚠️⚠️ **NOTHING BUT THE SPLIT GUARD CAN HOLD IT, AND THAT IS A NEW SHAPE HERE.** `4.6b`'s ruling
established that *a decision that a thing STAYS AS IT IS has no constraint, grant or policy to
live in* — and this one is worse: **it is a decision about what a screen RENDERS.** There is no
column to assert, no policy to read, and **§2.11 bans the rendering suite that would otherwise
notice a name appearing**. So the ruling is carried as **two DELIVERABLES** in
`5b-split-coverage.sh` — *the member row is identified by EMAIL* (`5b-ii`) and *the approver
sees an EMAIL* (`5b-iii`) — which makes a session that re-adds a name delete a line from a plan
row to do it. ⚠️ **Two entries and not one, because they are two screens**, and C11.8's own
sentence is about the second.

⚠️ **AND TEACHING THE GUARD THE RULING BROKE ONE OF ITS OWN FIXTURES, WHICH IS HOW THE WORDING
GOT FIXED.** The sentence added to `5b-iii` spelled the constraint a second time in a row that
already owned it — harmless on the real file, and it made fixture `Y2` ambiguous: with one
mention removed by the mutation the other stayed, so the guard reported *"owned by neither"*
instead of *"assigned to `5b-iii`"*. ✅ **The SENTENCE was changed, not the check** — the
cheaper half of *never spell a check's sentinel in the file it reads*, and the half this file
records as the one that keeps being forgotten. **Sixth instance, and the first where the
sentinel was spelled by a row that legitimately owned it.**

✅ **Nothing else moves.** No schema, no migration, no app code — `5b-i` was takeable before
this ruling and is takeable now, unchanged.

✅✅ **`5b` IS SIZED `L` AND SPLIT THREE WAYS AS OF 2026-09-14, BEFORE A LINE OF CLIENT CODE
WAS WRITTEN — AND `5b-i` IS THE NEXT TASK.** ⚠️ **No app code was written in this session and
none should have been**: `supabase/migrations/` and `app/src/` are untouched by the split, and
this section, four table rows, one parked decision and one new guard are the whole of it. That
is deliberate and it is `4.6a`'s argument repeated one step up — **the cheapest moment to be
wrong about the shape of three screens is now, in a file, rather than after one of them
exists.**

⚠️⚠️ **WHY IT IS AN `L` AND NOT THE `M/L` THE ROW CARRIED.** Counting what has to exist before
a second person can be standing in the shop with the app open: **two RPC-backed flows that
have never had a screen** (push and pull), **three screens and a sheet that do not exist**
(onboarding, Ajustes, join-by-code, and the approval surface), **one navigation state
`guard.ts` does not have** (signed in, belongs to no workspace), **the app's first non-tab
surface** — §2.8 fixed Ajustes as a sheet — **a badge on a Home screen that is still
`Pendiente` scaffolding**, and **`src/api/`, which does not exist at all.** The app today is
twenty-three source files: an auth shell, four tab stubs, a density theme and a money
formatter. **There is no data layer.** Every step-4 task that was one function was an `M`;
this is six RPCs, four surfaces and the layer they are all called through.

⚠️ **The paragraph above is the reading ON THE DAY OF THE SIZING and is left as it was** —
the same call this section makes about the `13` a few paragraphs down. **`5b-i` closed on
2026-09-14**: `src/api/` exists, there is a data layer, and the app is **twenty-nine** source
files. The sentence describes what was in front of the sizing, not what is in front of you.

#### The seam, and each piece is a closed loop somebody can actually use

| | Takes | Why the line is here |
|---|---|---|
| `5b-i` | `onboard_workspace`, C1.7's IVA question, the no-workspace landing, `src/api/` | **Everything else in `5b` needs a workspace to exist**, and nothing else can be built until something can create one. It is also the only piece that introduces a navigation state, and the only one that cannot be done as an addition to a screen that already exists |
| `5b-ii` | Ajustes, the code and its share, member management, `create_invite`, `redeem_invite` | The PUSH path, **which ADR-035 has described since it was written and this client has never had**. A closed loop on its own: an owner invites and an invitee redeems with nothing from `5b-iii` present |
| `5b-iii` | `request_access`, `my_access_requests`, `approve_request`, the location picker, C11.8's badge | C11.5's **pull**, which is the half the owner changed his mind about. It depends on `5b-i` and on **nothing in `5b-ii`** — a request absorbs an invite ROW (`D7`), never a function |

⚠️ **`D7` is the only coupling between the two paths and it points at the table**, which is
exactly what let `4.6a` put the pull path third and still finish it. **The client seam is the
server seam, one layer up**, and that is not a coincidence — it is the reason the three
migrations were cut where they were.

**Three alternative seams were considered and refused:**

- **Onboarding, then "all of membership".** Refused: *all of membership* is both paths, two
  screens, a sheet, a badge and a location picker. That is an `L` again, and it is `4e`'s and
  `4.6a`'s recorded mistake — the second piece would need splitting on the day it was taken.
- **All the screens first, then all the wiring.** Refused: **a screen with no call is a
  deliverable no check in this repository can see.** §2.11 bans rendering suites, `5a-ii`'s
  own tab bar exists as a data table precisely because of that, and a task whose entire output
  is unverifiable JSX is the shape `5a` spent four sub-tasks learning to avoid.
- **Split by PERSON — everything the owner sees, then everything the joiner sees.** Refused:
  the joiner's half of push (`redeem_invite`) and of pull (`request_access`) are **one screen
  in two states**, so this seam has one task building half a screen and another finishing it.
  That is `5a-iv`'s sub-split defect — one deliverable stated in two places — which this file
  has already paid for once.

#### ⚠️⚠️ Two things found by opening the applied schema instead of the row that describes it

**`T1` — C11.8 ASKS FOR A NAME AND NOTHING IN THIS SCHEMA HAS ONE. It is parked as an owner
decision and it blocks two of the three children.** `workspace_member` carries `user_id`,
`role` and `is_active` — no name, no email. §2.7 never exposes `auth.users`. The full brief is
in the decisions block at the top of this file, which is where a session that has read nothing
else will find it. ⚠️ **It is the same gap `4.6c-iii` named hours earlier from the export
side** — `transaction_export.created_by` is a raw uuid for exactly this reason — **and two
tasks hitting one missing column on the same day is what says it is a real hole rather than a
screen's inconvenience.**

**`T2` — THE FOUNDING OWNER HAS NO INVITE ROW, so the obvious repair for `T1` does not cover
him.** The instinct on reading `T1` is *"join `workspace_member` back to `workspace_invite` on
`accepted_by` and take the email from there"*. ⚠️ **Measured: all six members in the seed have
no such row**, because `onboard_workspace` inserts the membership directly and writes no
invite. So that join returns **nothing at all** for the one person guaranteed to be looking at
the screen. ✅ **The recommendation in the decisions block survives it** — the founding owner
is the CALLER, so his row is labelled *Tú* without a lookup — **but it survives it by design
rather than by luck, and the next person to reach for that join should know it returns zero.**

#### ⚠️ Two decisions taken on the owner's behalf in the sizing, both cheap and both named

| | Decision | Why it was taken rather than asked |
|---|---|---|
| **1** | **The seam above**: a shop, then push, then pull | A sizing judgement, which is the session's job. The three alternatives and why each loses are written out above |
| **2** | **`5b.5` now gates on `5b-i` closing rather than on all of `5b`** | `5b-i` is the task that CREATES `src/api/`; `5b-ii` and `5b-iii` are its first two consumers. The owner's ruling of 2026-09-13 said the pattern is described *"once `5b` has produced a real one"* — **`5b-i` is where a real one appears**, so this upholds the ruling rather than bending it, and it is cheaper: one consumer to reconcile instead of three that each invented their own. ⚠️ **Reversed by one plan edit** while `5b-i` is still open |

#### The guard, and what it does not do

`docs/checks/5b-split-coverage.sh` asserts the four rows exist, that each child is stated
**exactly once**, and that **all fifteen deliverables the parent promises land in exactly one
child, the assigned one** — thirteen from the split itself and **two added by the owner's
ruling of 2026-09-14, because a decision about what a screen RENDERS has no constraint, grant
or policy to live in and this guard is the only thing that can hold it** — the shape `4.6a-split-coverage.sh` uses, for the reason that file
records: `5a-iv`'s sub-split was stated in two tables and the guard read the wrong one.
⚠️ **It cannot tell a good split from a bad one**, only that nothing the parent promises has
fallen between two children that each assume the other has it. Nine fixtures prove it can
still fail.

⚠️ **AND IT CORRECTED THIS SECTION ON ITS FIRST RUN, WHICH IS A SMALL VERSION OF THE WHOLE
POINT.** The prose above said *twelve* deliverables and the list holds **thirteen** — a count
in a paragraph disagreeing with the list beside it, written and read within the same hour.
**This file has recorded eleven stale-copy defects and had just written its twelfth**; the
guard printed `13/13` and the paragraph said twelve, so it was caught before the commit rather
than in four days by a person. ⚠️ **The list is FIFTEEN now** — the owner's ruling of 2026-09-14
added two — and the `13` above is left as the reading it was at the time rather than corrected
into a number that was never printed.

**Nine fixtures over the guard itself** (`5b-split-coverage-falsify.sh`), each mutating a copy
of this file and matching the MESSAGE rather than the exit code:

| Fixture | The edit | Result |
|---|---|---|
| **Y0** | the control, unedited | 🟢 — a harness whose baseline is red runs no fixture at all, which is how `conventions-gate-falsify.sh` spent a day dead |
| **Y1** | `5b-iii`'s row deleted | 🔴 *"no table row for 5b-iii"* |
| **Y2** | ⚠️ **C11.8's badge moved from `5b-iii` into `5b-ii`** | 🔴 *"this split assigned it to 5b-iii"* — the commonest real mistake: a session in Ajustes finds the badge convenient and takes it, and the pull path is left with no surface |
| **Y3** | C11.7's share button in no child | 🔴 *"in the parent row and in NO child"* |
| **Y4** | ⚠️⚠️ **`src/api/` struck from the PARENT row** | 🔴 *"no longer named in the parent 5b row"* — the edit that makes a coverage check **vacuous** rather than red, which is this repository's most-recorded check defect |
| **Y5** | `5b-ii`'s row stated twice | 🔴 — `5a-iv`'s sub-split defect exactly |
| **Y6** | ⚠️ **`5b.5` re-pointed back at the whole of `5b`** | 🔴 — the fixture that guards a DECISION rather than a deliverable |
| **Y7** | the parent row stops saying it is not takeable | 🔴 — `plan-handover.sh`'s `V4` is the record of what that costs |
| **Y8** | `5b-iii` also claims `create_invite` | 🔴 *"owned by neither"* — a row describing work it does not do is how `4.6b`'s scope disagreed with `4.5c-ii`'s for four days |

⚠️⚠️ **TWO OF THE NINE WERE RED FOR THE WRONG REASON ON THEIR FIRST RUN, AND THE HARNESS SAID
SO RATHER THAN COUNTING THEM.** `Y2` anchored its insert on a phrase the **parent** row also
carries, so the badge landed in the parent — which already promises it — and the guard reported
a *dropped* deliverable instead of a *misrouted* one. `Y4` wrote `` `src/api/` `` inside double
quotes in bash, so the backticks **ran as a command** and the fixture died on *"No such file or
directory"* having tested nothing. ✅ **Both were caught because this harness matches the
message and not the exit code** — the rule a sister harness paid for: *"a fixture that is red
for the wrong reason is not a falsification, it is a coincidence."*

⚠️ **NO RENUMBERING, AND THAT IS WORTH ONE LINE.** `4.6a`'s split cost one because its pieces
each ship an append-only migration. **`5b`'s children ship none** — every RPC they call is
already applied — so the letters are free and nothing after `5b` moves.

✅✅✅ **`4.6c-iii` IS DONE AS OF 2026-09-14 — `0033` IS APPLIED, `4.6c` IS COMPLETE, **STEP
4.6 IS CLOSED**, AND `5b` IS THE NEXT TASK.** `transaction_export` exists: every sale,
delivery and write-off, **one row per LINE**, three kinds in one shape, with the month a
`where` clause on `day`. **42 behavioural checks in
`supabase/checks/0033_transaction_export.sql`, three applied check files re-signed, and ten
falsifications against a green control.**

⚠️⚠️ **THE DATABASE BUILD HAS NO OPEN TASK AS OF 2026-09-14.** `0001`–`0033`, thirty-three
migrations, and step 4.6 — *"the step that did not exist before 2026-09-07 and whose existence
is the main result of the UI/UX grill-me"* — has no unapplied number left. ⚠️ **Dated rather
than called finished, and deliberately.** This repository has said *"the database is complete"*
once before, on 2026-09-05, and **both sentences saying it were false within two days**: step
4.6 exists because asking the owner about CONTROLS found two more views and a fence. `supabase/
README.md` carries a guard that refuses the undated form of this claim, and it fired on this
session's first draft of that file's own `0033` row. **The plan's own copy is dated for the
same reason.** The property worth protecting is narrower and is still true: **steps 5–7 ship no
migration**, which is what `4.6` was numbered separately to keep.

⚠️⚠️ **ONE FENCE, AND IT HAD TO BE WRITTEN DOWN — WHICH IS THE OPPOSITE CALL TO `4.6c-ii`'S,
ONE MIGRATION EARLIER.** The row said *"three tables with three different shapes"*; the fences
turned out to be **three different combinations**, measured from `pg_policies` rather than
assumed:

| | Fence |
|---|---|
| `sale`, `sale_line` | member-level — a cashier must see her own till |
| `waste` (the HEADER) | **member-level** — the header is not the cost |
| `waste_line` | **manager** — it carries `unit_cost_net_per_base` |
| `purchase`, `purchase_line` | **manager** — this is what the business pays |

✅✅ **SO THE DECISION WAS PRICED RATHER THAN ARGUED: THE UNFENCED VIEW WAS BUILT INSIDE THE
CHECK FILE AND READ AS THE CASHIER.** Under inheritance alone her *"all transactions and
waste"* download is **1 040 rows of ONE kind and $65 549.43** — every delivery and every
write-off silently absent. **A partial export is worse than no export**: it is a document
somebody reconciles against a notebook, and the app loses that argument while being right. So
`0009`'s predicate, for `0009`'s stated reason — a member-level half left standing when the
gated half disappears — and **a staff caller reads ZERO ROWS. Complete, or nothing.**

⚠️ **`4.6c-ii` WENT THE OTHER WAY AND THE TWO ARE NOT IN TENSION.** There a predicate would
have hidden a number the same cashier computes from two columns she is granted — a fence
anyone defeats with a calculator. Here its ABSENCE does not hide anything: it **manufactures a
misleading document**. The test is not *"is this row cost"* but *"does the view tell the truth
to a caller RLS has filtered"*, and one view is a number while the other is a record of what
happened.

⚠️⚠️ **THE GUARD `0031` REBUILT ONE MIGRATION EARLIER FIRED FOR REAL, ON THE FIRST DAY IT
COULD.** `0011`'s analytics-view assertion used to count a hardcoded list of three, which
`4.6c-i` found *"claimed in its own comment to catch a fourth analytics view and did not"* —
and rebuilt to DISCOVER the population from the catalogue, recording that *"a FIFTH view fails
on the day it lands"*. **`0033` is the fifth. It went red, named `transaction_export`, and did
it before that view had ever been examined for a hardcoded timezone.** ✅ **This is the first
guard in this repository to catch the thing it was built for on its first opportunity**, and
it cost the session nothing but a re-signing.

⚠️⚠️ **AND `0032`'S CHECK WAS RE-CUT RATHER THAN BUMPED, WHICH IS THE ONE THING IN THIS TASK
THAT COULD HAVE QUIETLY COST A RULING.** It held *"leave it on the two views"* as a **count of
the views in `public`** (= 5). `0033` added one, it went red, **and the cheap repair — 5 to 6 —
would have handed the ruling away**: with a bare count, a later session splitting the price
into a view of its own passes by bumping the number again. ✅ **It now asserts the ruling as a
PROPERTY**: the eight price-over-time columns live on those two views and **no other view
carries one**. That survives an unrelated view landing and goes red on exactly the change the
ruling forbids. ⚠️ **A count is not a claim; it is a proxy for one, and the day the proxy
breaks is the day somebody chooses whether to keep the claim.**

⚠️⚠️ **AND THIS FILE'S OWN LAST CHECK CAUGHT THE FIRST DRAFT THROWING AWAY TWO OF ITS RESULTS
— A NEW MEMBER OF THE FAMILY, AND IT FIRED ON THE FIRST RUN.** The counterfactual block was
wrapped in `begin … rollback` to clean up its temporary view, and **the rollback discarded the
two `chk()` rows the block had just written** — `chk()` is an INSERT like any other. The
sequence stood at 39 and the table held 37: two checks ran, PASSED, and were thrown away, and
the suite would have reported *"all 38 passed"* **with its loudest measurement missing and not
one FAIL**. ⚠️ **It is not a green check that stopped measuring its claim — it is a check
whose RESULT never landed**, which no assertion about the schema could ever see. Caught by the
`did not throw away any of its own results` line every file in this directory carries.

**Four decisions taken on his behalf, all cheap to reverse and all named here:**

- **The grain is the LINE, not the document.** *"Breakdown"* means the product, and a
  document-grain export carries the money and loses it. ⚠️ **Document totals are deliberately
  NOT columns**: `sum(line_net) = total_net` exactly (`0003` rounds the lines, never the
  document — 0 mismatches over 1 086 documents), and a total repeated on each of its rows is
  how a spreadsheet multiplies it by the line count
- **No signed, normalised or totalled money column.** Money leaving the till on a delivery,
  arriving on a sale and lost on a write-off are three directions; `kind` carries it. A column
  that summed them would invent exactly the accounting convention `A3` cancelled
- **Reversals are IN and FLAGGED, not excluded.** ⚠️ **The cross-month case is real in this
  seed rather than hypothetical: one delivery reversal lands 9 days and a calendar MONTH after
  the document it cancels**, so a month holding one half does not net out. `0031`'s finding,
  at document grain
- **A view and not a function taking a month.** The caller filters on `day`; a period baked
  into the schema is a migration every time he wants a different one — `B5` and `A2`

⚠️ **What is NOT in the file, and two of the three CANNOT be.** **Transfers and stock
adjustments have no document at all** — §2.4 gives a transfer none, which is `0025`'s own
reason for `replay_result` naming a transfer id, and an adjustment has none either. **30
movements in the seed, measured, that this export can never carry**, and that is a table which
does not exist rather than an omission. ⚠️ **And no human name for `created_by` exists anywhere
in this schema**: §2.7 never exposes `auth.users` and `workspace_member` carries `user_id`,
`role` and `is_active` with no name column. **The export can say WHETHER two rows are the same
person and never WHO.** Named as a gap, the way `0014` names a delisting.

⚠️⚠️ **TWO THINGS THIS SEED CANNOT FALSIFY, AND THE FIRST IS SHARPER THAN IT LOOKED.** It is
not merely that **not one row is `recorded_offline`** — it is that **`recorded_at` EQUALS
`occurred_at` on all 3 448 rows**, so *no behavioural check in the file can tell the two
apart*. `G4` proved it by swapping the day's source and turning nothing red, reconciliation
included. ✅ **The claim is now held STRUCTURALLY** — the view body is asserted to bucket
`occurred_at` and never `recorded_at` — and the pinned check says out loud that the structural
one is carrying it until a seed contains an offline document. ⚠️ **A behavioural check over a
fixture where two columns are equal is not a weak check, it is not a check at all**, and only
a falsification could say so. The second gap: **no document carries two lines for the same
variant**, so nothing here can tell a per-line export from a per-variant one. Both go red the
day the seed changes.

**Ten falsifications against a green control**, each mutating the migration, re-applying it and
running `0033`'s checks — and `0011`'s, `0031`'s and `0032`'s where the mutation could reach
them. ⚠️⚠️ **One of them came back GREEN and was the most valuable of the ten** — see `G4`:

| Fixture | The mutation | Result |
|---|---|---|
| **G1** | the fence removed from the body entirely | 🔴 — the cashier reads the sale half, which is the whole argument |
| **G2** | the `row_security_active` half dropped | 🔴 — the fence closes on the superuser and `service_role` too, and §2.9's nightly job would have materialised zero rows onto a dashboard nobody would question |
| **G3** | the `provider` join made INNER | 🔴 — 2 400 of 3 448 rows are not a delivery and would vanish entirely rather than lose a column |
| **G4** | ⚠️⚠️ **the day taken from `recorded_at` instead of `occurred_at`** | 🟢 **GREEN — AND IT FOUND THE HOLE THE REVIEW MISSED.** `recorded_at = occurred_at` on all 3 448 rows, because no row is `recorded_offline`, so **every behavioural assertion about the day is vacuous on this axis** — the day-for-day reconciliation included. The exact §2.6 confusion `0010` exists because of, and it passed. ✅ Closed by a STRUCTURAL assertion on the view body; 🔴 on re-run |
| **G5** | the day bucketed in a hardcoded zone | 🔴 in `0033` **and in `0011`**, which is the assertion that exists for exactly this |
| **G6** | the waste leg dropped from the union | 🔴 |
| **G7** | `line_gross` re-derived from `tax_rate` instead of the stored `tax_amount` | 🔴 |
| **G8** | `is_reversal` inverted | 🔴 |
| **G9** | an `ORDER BY` added to the view | 🔴 |
| **G10** | ⚠️⚠️ **the price split out into a view of its own — the owner's ruling of 2026-09-14 undone** | 🔴 **in `0032`**, which is the fixture that proves the re-cut ruling check can still go red. Under the count it replaced, this fixture would have passed |

✅✅ **RULED BY THE OWNER 2026-09-14, THE SAME DAY `0032` MERGED — *"leave it on the two
views."* THE DECISION BELOW WAS TAKEN ON HIS BEHALF AND IS NOW HIS.** Nothing changes in the
schema and nothing is owed; what changes is that a later session **splitting the price into a
view of its own is UNDOING A RULING, not tidying a judgement call.** ⚠️ **It is the third
time in two days that a decision reported in a closing message was ruled before it could go
stale**, which is what reporting them by name is for — and the second consecutive `4.6c`
child where the owner upheld the smaller shape.

⚠️ **NOTHING BUT THE CHECKS CAN HOLD IT, exactly as `4.6b`'s ruling found.** The ruling is
that a thing STAYS AS IT IS, and a change that is not made has no constraint, grant or policy
to live in. `0032`'s section 2 — *"`0032` created NO view, NO table, NO function, NO policy
and NO column on a table"* and *"the two views it replaced are the two that already owned each
side of the ledger"* — was written as a description and **now holds a decision**. A fifth view
appearing in `public` turns it red, and `0011`'s completeness assertion turns red beside it.

⚠️ **AND THE REVERSIBILITY IS NOW INSURANCE RATHER THAN AN OPEN QUESTION.** `5d`'s price card
may be written against `product_purchases_daily.purchase_price_*` and
`product_velocity_daily.sale_price_*` **without hedging** — two queries, one per side, which
is the same shape any buy-against-sell comparison in this schema already takes.

✅✅ **`4.6c-ii` IS DONE AS OF 2026-09-14 — `0032` IS APPLIED, AND `4.6c-iii` IS THE NEXT TASK.**
Price over time exists on both sides of the ledger: `purchase_price_net` / `_gross` /
`_last_net` / `_last_gross` on `product_purchases_daily`, and `sale_price_*` on
`product_velocity_daily`. **48 behavioural checks in
`supabase/checks/0032_price_over_time.sql`, four claims re-cut in `0031` and `0013` without
either count changing — 47 and 49 — and twelve falsifications against a green control.**

⚠️⚠️ **`0032` SHIPS NO NEW VIEW, AND THREE COPIES OF THIS FILE SAID IT WOULD NEED ONE.** The
`N3` row below says *"Needs a view, and it is the largest piece"*; the `4.6c` split table and
`supabase/README.md`'s planned `0032` entry say the same. **All three were written
2026-09-13, and `product_purchases_daily` was created by `0031` on 2026-09-14 — the day
before this task was taken.** Between it and `product_velocity_daily`, every column a price
needs except the price was already standing at the right grain: the quantity, the net, the
gross, the family, the catalog name and the store's own trading day. **A new view would have
been two supersets of two applied views**, and `N1`'s ruling of 2026-09-14 refused that exact
shape one day earlier — *"a second view returning revenue beside the first would be two
answers to one question."* ⚠️ **This is the eleventh stale-copy defect and the second in two
days where the stale copy was the plan describing its own task**; `4.6c-i`'s was the same
shape — a premise that stopped being true between the writing and the taking.

⚠️⚠️ **AND THE FENCE — WHICH `B7` PUT AT MANAGER AND THE `4.6c-ii` ROW CALLED A PRECEDENT TO
MATCH — FELL OUT OF §2.7 WITHOUT A PREDICATE BEING WRITTEN.** `B7` says *"`N2` and `N3` carry
cost, so they are manager-and-above"*. **Half of that is right.** A purchase price **is**
cost, and §2.7's capability table puts *See cost and margin* at manager. A sale price is
revenue over quantity, and the same table puts *See quantity sold and revenue (Números)* at
**staff**. So the purchase price lands on the manager-gated view and the sale price on the
member-level one, **each inheriting the fence that already governs it, with no `has_role`
written, moved or removed anywhere in the migration.**

⚠️⚠️ **ONE COMBINED PRICE VIEW WOULD HAVE HAD `0009`'S EXACT SHAPE AND `0009`'S EXACT NEED
FOR A PREDICATE IN ITS BODY** — a manager-gated half beside a member-level half, which
`0031`'s own header names as the only reason `0009` writes one. **And that predicate would
have guarded nothing**: a cashier reads `sale_line.unit_price_net_per_base` directly (`0003`
— *"a sale line carries a price, not a cost"*) and `revenue_net ÷ qty_base_sold` off the
velocity view since `0013`. A fence anyone defeats with a calculator, bought at the price of
a second weaker copy of a fence RLS already holds. **Measured under `set role authenticated`:
the cashier reads 1 004 sale prices in her own store and ZERO rows of the purchases view; the
manager reads 863 purchase buckets with a price on every one; the other workspace's owner
reads not one row of either.**

⚠️⚠️ **`price_list` IS NOT EMPTY, AND `N3` SAYS IN BOLD THAT IT IS.** It holds **390 rows over
341 variants**, with `effective_from`, `effective_to`, a generated `daterange` and a
no-overlap exclusion constraint — **structurally a price history**, and it covers **every**
sale bucket in the seed. ⚠️ **The conclusion is unchanged and the reason is now much
stronger**, because ADR-035 §2.9 gave the true one all along: *"that table holds the INTENDED
price"*. **Measured: the intended price and the price the till actually charged disagree in
1 050 of 2 139 buckets.** A price card built on `price_list` would disagree with the receipt
about half the time. ⚠️⚠️ **THIS IS THE THIRD TIME IN THREE DAYS THAT THE PLAN'S REASON FOR A
DESIGN WAS FALSE WHILE THE ADR'S WAS TRUE** — `4.6c-i`'s fence, `4.6c-ii`'s missing view, and
now this. **`CLAUDE.md` says the ADR wins; the cheap habit it keeps buying is to read §2.9's
own sentence before believing the plan's paraphrase of it.**

⚠️⚠️ **THREE APPLIED CHECKS WOULD HAVE STAYED GREEN WHILE THEIR CLAIMS DIED — THE SIXTH
INSTANCE HERE AND THE FIRST CAUGHT BEFORE THE MIGRATION SHIPPED.** `0013`'s *"the view ships
no rate column at all"* and `0031`'s *"still ships no rate, ratio or average column, and
still divides nothing"* and *"every MEASURE is additive"* each test a **list of column
NAMES** — `%rate%`, `%avg%`, `%ratio%` — and **not one of the eight new columns contains any
of those strings.** ✅ **Measured rather than argued: `0032` was applied and the whole of
`supabase/checks/` was run unchanged. Only the column COUNT went red.** The three are re-cut
to assert **arithmetic instead of spelling** — *each view body contains exactly two division
operators and both divide by `nullif()` of the row's own quantity* — which keeps `0013`'s
real rule and admits the one price that does not break it.

⚠️ **THE RULE THOSE CHECKS WERE REACHING FOR SURVIVES, CORRECTLY SCOPED, AND IT IS WHAT MADE
THE DESIGN LEGAL.** `0013`'s refusal is written beside its own check: *"per calendar day
11.786939 vs per traded day 14.554465 — the view ships both denominators and divides
neither."* **The refusal is about a denominator that is a JUDGEMENT CALL.** A unit price has
exactly one defensible denominator, it sits on the same row, and that is also what separates
it from the delivery count `0031` refused: **a price is exactly recoverable at any grain from
two additive columns beside it; `count(distinct purchase_id)` is recoverable from nothing.**

**Four smaller calls made on his behalf, all cheap to reverse and all named here:**

- **Two prices per side, not one.** The EFFECTIVE price (money ÷ quantity) is the one that
  charts and the only one that rolls up; the TYPED price (`unit_price_net_per_base` off the
  day's last line) is the price as a **state** — *what am I charging now*, *what did I last
  pay* — which an average cannot answer and which is what §2.9's row actually asks. ⚠️ **They
  disagree in 736 of 1 048 purchase buckets that hold exactly ONE line**, because `line_net`
  is already rounded to the centavo (§2.5) and the typed price is not: one is the price
  CHARGED, the other the price MEANT
- **Gross beside net on both, by the `N1` ruling applied to a price.** The typed gross uses
  the **line's own snapshot `tax_rate`** (`0003`), never the variant's current one
- **No min, no max, and no trailing price column.** A trailing price is
  `trailing_revenue_net ÷ trailing_qty_base` and both are already on the row; min/max is a
  diagnostic nobody asked for, and on the purchase side the seed cannot tell it from the mean
- **`nullif` in the view rather than in every client, and it is not defensive coding.** ⚠️
  **Ten sale buckets in the seed net to exactly zero quantity** — a sale rung up and voided
  inside §2.6's 15-minute window — so a client dividing for itself raises `division_by_zero`
  on data the pilot makes in its first week. **Ten variant-MONTHS of purchases do the same at
  the rollup grain**, which is why the view comment's rollup instruction carries `nullif` too

⚠️ **One thing this seed cannot falsify, pinned rather than papered over, and it is `0031`'s
gap from the other side.** Every purchase variant-day bucket holds **exactly one line**, so
min, max, last and the mean coincide and mutating the purchases-side pick to `max` turns
**nothing** red. The precondition is pinned instead. ✅ **The SALE side does not have the
gap** — 56 buckets carry more than one distinct price, and the pick differs from `max` in 33
of them and from `min` in 23 — **so the ordering is a real assertion exactly once, and the
division of labour is stated.** ⚠️ **A second gap, newly created and named: no two sale
documents in this seed share an `occurred_at`, so the `created_at`/`id` tiebreak is
untested.** A real till writes several sales into one second. Pinned by a check that goes red
the day one ties.

⚠️ **A price does not roll up over PRODUCTS, and both view comments say so.** Every other
measure on these two views is a `group by` away from a family number. A family mixes base
units (§2.5 — six families in the seed do), so `sum(money) ÷ sum(quantity)` across one
divides pesos by a total of kilos and pieces. **Over TIME it rolls up exactly: sum the two
additive columns beside it and divide once, never average the daily prices** — that weights
by days instead of by quantity, and the check measures the difference rather than asserting
it.

**Twelve falsifications against a green control**, each mutating the migration, re-applying it
and running `0032`'s, `0031`'s and `0013`'s check files:

| Fixture | The mutation | Result |
|---|---|---|
| **F1** | `nullif()` removed from the effective sale price | 🔴 **the suite CRASHED — `division by zero`**, on the ten cancelled buckets. The strongest possible statement of why it is in the view |
| **F2** | the last-price pick ordered `asc` — the FIRST sale of the day | 🔴 three checks, led by the independent lateral recomputation |
| **F3** | ⚠️⚠️ **the `id` tiebreak dropped from ONE of the two picks** | 🟢 **GREEN ON THE FIRST RUN — AND IT WAS THE CHECK THAT WAS WRONG.** The assertion used `~*`, which asks only whether the ordering appears *somewhere*, so the untouched second pick kept it matching. **That is the drift case exactly**: a net and a gross ordered differently come off DIFFERENT LINES, and the view reports a price carrying somebody else's tax. ✅ Re-cut to COUNT the ordering — 🔴 on re-run |
| **F4** | purchases: the last-price pick replaced by `max` | 🟢 **GREEN BY DESIGN, AND IT IS THE PINNED GAP.** Every purchase bucket in this seed holds exactly one line, so `max`, `min`, `last` and the mean coincide. A check pins the precondition, not the absence |
| **F5** | velocity: the same mutation, `last` → `max` | 🔴 — the sale side HAS depth (56 buckets, 33 differing from `max`), which is why the gap above is survivable |
| **F6** | the typed gross grossed up by a hardcoded `1.16` instead of the line's own `tax_rate` | 🔴 — the seed carries 0% lines, and they are what catch it |
| **F7** | the typed price `coalesce`d to 0 on spine days | 🔴 three checks. A quiet day would have rendered as a 100% discount |
| **F8** | the effective price as the unweighted MEAN of the typed prices | 🔴 three checks — including the one asserting a price is recoverable from the two columns beside it |
| **F9** | the effective gross price divides by `revenue_net` instead of the quantity | 🔴 — and by the *exactly two divisions, both by `nullif()` of the row's own quantity* check, which is the re-cut rule doing its job |
| **F10** | ⚠️⚠️ **a THIRD division appended — a trailing average over `trailing_days`** | 🔴 **in `0032`, in `0031` AND in `0013`.** This is the fixture that matters: it proves the three re-cut checks CAN go red, which the versions they replaced could not |
| **F11** | the effective price `round()`ed to the centavo inside the view | 🔴 in `0032` and `0031` |
| **F12** | a `has_role(manager)` predicate added to the purchases view | 🔴 in `0032` and `0031` — a second copy of a fence RLS already holds, and it fails closed on the superuser it was never meant to see |

⚠️ **What `0032` did NOT do, deliberately.** It created no view, no table, no function, no
policy and no column on a table; it moved no fence and no grant; and it did not touch `0009`,
`0011` or `0030`. **The whole of it is undone by one more `create or replace`.**


✅✅ **`4.6c-i` IS DONE AS OF 2026-09-14 — `0031` IS APPLIED, AND `4.6c-ii` IS THE NEXT TASK.**
`product_purchases_daily` exists, revenue is GROSS with net beside it, `0009` says out loud
what it gets wrong, and `0030`'s one stale sentence is corrected. **47 behavioural checks in
`supabase/checks/0031_purchases_and_gross_revenue.sql`, `0011`'s re-signed from 56 to 57, and
twelve falsifications against a green control.**

⚠️⚠️ **THE "FIRST DESIGN PROBLEM" THIS FILE PUT AT THE TOP OF THE TASK DOES NOT EXIST, AND
THAT IS THE MAIN FINDING.** Three copies — the `N1` row, the `4.6c-i` row and
`supabase/README.md`'s planned list — all said the tax gross revenue needs *"lives today only
in the manager-only `product_margin_daily`, so reaching it without widening that fence is this
task's first design problem."* **That is true of the VIEWS and false of the COLUMNS.**
`product_margin_daily.tax_collected` is `sum(sale_line.tax_amount)`, and `sale_line_select`
(`0003`) carries **no `has_role`** — its own comment says why: *"a sale line carries a price,
not a cost."* Asked of the database under `set role authenticated` as `caja.centro`: she reads
**1 040 sale lines carrying $4 826.96 of tax** and **0 rows** of `product_margin_daily`.
**Gross revenue cost no policy, no `security definer`, no widening and no migration beyond the
view body.** ⚠️ **The three copies are struck in place rather than deleted**, because what they
got wrong is worth more than what they got right: a fence on a VIEW was read as a fence on the
COLUMN underneath it, by three files, for a week.

✅✅ **RULED BY THE OWNER 2026-09-14, THE SAME DAY `0031` MERGED — *"leave gross revenue on the
velocity view."* THE DECISION BELOW WAS TAKEN ON HIS BEHALF AND IS NOW HIS.** Nothing changes
in the schema and nothing is owed; what changes is that a later session widening or splitting
this view is **undoing a ruling**, not tidying a judgement call. ⚠️ **It is the second time in
two days that a decision reported in a closing message was ruled before it could go stale**,
which is what reporting them by name is for.

⚠️⚠️ **AND THE RULING FOUND SOMETHING: ADR-035 HAD ALREADY SAID IT, AND THIS FILE CALLED IT AN
OPEN DESIGN PROBLEM.** §2.9's amended question table, written on 2026-09-14 hours before
`4.6c-i` was taken, says of `product_velocity_daily` in terms: ***"`product_velocity_daily`
(`0013`/`0014`) is the view behind row 1"*** — row 1 being *"quantity sold and GROSS revenue,
per variant and per family, daily."* **`CLAUDE.md` says the ADR wins, and the ADR had already
ruled.** The session read the plan's `N1`/`N2` rows and the `4.6c-i` row and did not read
§2.9's table, so it re-derived an answer that was already authoritative and reported it as a
judgement call. ⚠️ **The call was right and the process was wrong**, and the cheap lesson is
the one this repository keeps paying for: **when the plan says a question is open, check
whether the ADR has already closed it** — that is the tenth stale-copy defect, and the first
where the stale copy was the plan describing its own task as harder than it was. ✅ **No ADR
amendment is owed. The ADR is already correct about this.**

⚠️⚠️ **THE DECISION, AS IT WAS TAKEN AND NOW AS IT IS RULED: GROSS REVENUE LANDS ON
`product_velocity_daily` BY `create or replace`, NOT IN A NEW VIEW.** `B1` ruled *"a NEW view, leave `0009` untouched"* — but that was about the
**margin** view, which is broken under C8.6 and is being replaced by nothing. The velocity view
is the opposite case: this file's own table calls it *"intact, and for a stated reason"*, it is
already the staff-readable home of quantity-and-revenue, it already carries `family_id` on
every row, and `0014` established that it is amended by `create or replace`. **A second view
returning revenue beside the first would be two answers to `A6`'s question 2 differing only by
tax** — and the second copy going stale is this repository's most-recorded defect, nine times
over. ⚠️ **It is cheap to reverse and that is why it was taken rather than parked**: one
`create or replace` undoes the whole of it, nothing here is a table, a column or a policy, and
the seed writes no data against it. ~~**If the owner wants a separate revenue view, say so and
it costs one migration.**~~ — **HE RULED: LEAVE IT. The reversibility is now insurance rather
than an open question**, and `5d`'s charts may be written against this view without hedging.

**Four smaller calls made on his behalf, all cheap to reverse and all named here:**

- **Purchases carry `tax_paid` and `purchases_gross`, not just net.** `N1` ruled on revenue; the
  same argument applies to the invoice he is holding. ⚠️ **Deliberately NOT one `tax` column
  across both sides** — these are IVA acreditable and trasladado and somebody would eventually
  sum them. ⚠️⚠️ **Neither is a declaration figure**, and both comments say so: CFDI is out of
  scope and a reversal moves the number in the month it was RECORDED
- **The grain is variant-day and there is no provider dimension.** It matches the three existing
  daily views exactly, so a family rollup is a `group by` and nothing else. Purchases *by
  provider* is a different question and `provider_price_memory` (`0008`) is already its home
- **No delivery-count column**, because `count(distinct purchase_id)` is **not additive across a
  rollup** — one delivery appears on every variant row of its day. Every measure in the new
  view is additive, which is a property worth keeping whole
- **No day spine, unlike `0014`.** Nothing records a delivery that was DUE and did not arrive,
  so every zero a spine produced would be a claim nobody can back

⚠️⚠️ **AND A GUARD SAID IN ITS OWN COMMENT THAT IT WOULD CATCH THIS AND DID NOT — THE FIFTH
"GREEN CHECK THAT STOPPED MEASURING ITS OWN CLAIM."** `0011`'s timezone guard reads: *"The list
is spelled out rather than discovered, so that ADDING a fourth analytics view without adding it
here fails the count instead of passing silently — which is exactly the failure mode this check
exists for."* **Its count is a count of the LIST, not of the schema.** Measured: `0031` was
applied and all eight files in `supabase/checks/` passed, green, with an unexamined analytics
view standing. ✅ **Fixed by making the claim TRUE rather than by deleting it** — the spelled-out
list stays and gains a completeness assertion discovered from the catalogue, so a FIFTH view
fails on the day it lands (falsified: `F10` red with a fifth view, `F10b` green when it is
dropped). ⚠️ **Its own first run then reported the scaffolding it stands on** — this file's
`public._waste_inner` — so harness objects are excluded by the `_*` convention the rest of the
repository already uses for files.

⚠️⚠️ **AND THE MIGRATION'S FIRST DRAFT SPELLED A CHECK'S SENTINEL IN THE TEXT THE CHECK READS,
FOR THE FIFTH TIME IN THIS REPOSITORY.** The check asserting `0030`'s stale clause is GONE found
it inside the paragraph explaining that it had gone, because the correction quoted the sentence
it corrected. ✅ **The SENTENCE was changed, not the check** — which 4.6b's ruling named as the
cheaper half and the half that keeps being forgotten — and both files now carry a `do not
re-introduce the quotation` note beside it. ⚠️ **This one cost nothing because the check's own
first run caught it**, which is the difference between this instance and the four before it.

⚠️ **What `0031` did NOT do, deliberately.** It did not touch `0009`'s body (`B1` stands — a
`comment on view` and nothing else), it did not edit `0030`'s migration file (a function comment
is applied schema and migrations are append-only), and **it did not move one fence**: a check
asserts `replay_failed_write` is still `manager` and `failed_write_select` is still owner-only,
because a migration that rewrites a comment ABOUT a policy is exactly where somebody would later
tidy the policy too.

⚠️⚠️ **AND RUNNING THE GUARDS AFTER THE RULING FOUND A FALSIFICATION HARNESS THAT HAD BEEN
DEAD SINCE 2026-09-13 — SIXTEEN FIXTURES, NONE OF THEM RUNNING, NOTHING RED ANYWHERE.**
`conventions-gate-falsify.sh` builds a fixture tree by copying `docs/CONVENTIONS.md`,
`docs/PLAN.md`, the gate and `app/src` + `app/test` into a temp directory. ⚠️ **It never
copied `docs/adr/`** — and `conventions-gate.sh` gained a **tenth assertion group** on
2026-09-13, when ADR-035 §3 was amended to carry the `5b.5` deferral as its third copy, which
**reads the ADR**. In the fixture tree that file does not exist, so the gate failed, the
**baseline went red, and the harness refuses to run a single fixture when the baseline is
red.** Both scripts still existed, both were still invoked, and `conventions-gate.sh` itself
still passed on the real tree. **Nothing was red anywhere and every falsification of it had
silently stopped running, for a day.**

⚠️ **IT IS `Z5`'S DEFECT FROM THE SAME DIRECTION, AND THE RE-SCOPE THAT RECORDED `Z5` DID NOT
COVER IT.** `Z5` was *"not an edit to the check, but an edit to the FILE THE CHECK READS"*.
This is one step further out: **a check that started reading a NEW file the harness was never
told about.** The rule that covers both: **when an assertion gains a new input, the thing that
falsifies it gains the same input** — and nothing enforces that but running the falsify script
and reading its first line.

✅ **Fixed: `mk()` copies the whole of `docs/adr/`, not one file, so the next assertion group
to read an ADR does not repeat this. 16 fixtures now run — 15 red as recorded, `F13` green as
recorded.** ⚠️ **One gap left named rather than closed**: the tenth group now EXECUTES on the
baseline, but this harness carries no fixture proving it can go red. `U1`–`U3` were run by hand
when the group was written and are recorded above under the ADR-disagreement section; folding
them into this harness is a small task nobody has taken.

⚠️ **One thing this seed cannot falsify, pinned rather than papered over.** Every purchase
variant-day bucket holds **exactly one line** — 1 048 lines in 1 048 buckets — so mutating
`sum(pl.line_net)` to `min` or `max` changes nothing and turns no check red. Confirmed by
mutation, not assumed. The precondition is pinned instead, so the day a delivery splits a variant
across two lines the check goes red and someone reads the paragraph. ✅ **The SALE side does not
have that gap** (2 263 lines in 2 139 buckets, up to three deep), so `sum(sl.tax_amount)` is a
real assertion — the division of labour, stated.

✅✅ **THREE RULINGS, 2026-09-14 — GROSS REVENUE, THE CASHIER KEEPS HER VIEW, AND ADR-035 IS
AMENDED. THE DECISIONS BLOCK IS NOW EMPTY.** All three were raised by the área 9 ruling hours
earlier and all three are closed before any of them could go stale.

- **Revenue is GROSS of IVA**, net beside it. `prices_include_tax` defaults true, so the price
  typed into the catalog already contains the tax and gross is what reconciles against the
  cash in the till. ⚠️ **`product_velocity_daily` carries `revenue_net` and no tax column**, so
  this is not free: `4.6c-i` has to reach the tax that today lives only in the manager-only
  `product_margin_daily`. **It is now that view's first design problem rather than a surprise
  in the middle of writing it.**
- **A cashier keeps seeing quantity and revenue.** ⚠️ **Ruled rather than inherited, which is
  the point**: she could already, and nobody had decided it — `product_velocity_daily` carries
  no cost and grants `select` to `authenticated`. **ADR-035 §2.7's capability table now carries
  a row of its own for it**, so the next person to read the fence sees a decision instead of an
  omission.
- ✅✅ **ADR-035 §2.9 IS AMENDED on his instruction** — the first question is **retired, not
  re-measured** — so `CLAUDE.md`'s *"the ADR wins"* now points a cleared session at the
  numbers he actually asked for. ⚠️ **This is what the third decision was for**: the plan had
  been right and the ADR had been authoritative, and they disagreed.

⚠️ **Two older ADR sentences point at the retired question and are deliberately NOT rewritten**
— §2.5's reason for a per-line net cites margin-by-product (the requirement stands, the example
moved, and one clause was corrected), and §3 step 2's gate text describes a step that **closed
in August**. **Completed history is left as the record of what was actually done.**

✅✅ **RULED BY THE OWNER 2026-09-14 — THE DEVICE REMEMBERS ITS OWN FAILURE, AND NEITHER
MIGRATION IS WRITTEN.** The decision `4.6b` raised hours earlier — *can a manager see the
dead letter she is allowed to replay?* — is answered, and the answer is **neither of the two
options the brief was written to choose between.** ⚠️⚠️ **`failed_write_select` STAYS
`owner`-ONLY, PERMANENTLY AS FAR AS THIS PLAN IS CONCERNED**, and `5c`'s dead-letter banner
is driven by the device's own outbox.

⚠️⚠️ **THE PREMISE OF BOTH OPTIONS WAS WRONG, AND THAT IS THE FINDING. C11.4 SAYS *"FIX"*,
NOT *"BROWSE"*.** `replay_failed_write` takes an id, and **the device already has it**:
`5c` ships client-generated document uuids for §2.6 idempotency, and `0024` decision 7 makes
`failed_write.id` **be** that uuid. The client therefore knows the id of its own failed write
**before it ever calls the server**, so the banner needs no server read at all. **Both parked
options were answers to a question C11.4 never asked.**

✅ **AND IT MEANS `4.6b` WAS EXACTLY SUFFICIENT, NOT MERELY DEFENSIBLE.** The only thing
standing between the manager and C11.4 was the `TD003` refusal. She now clears the fence and
replays with an id her own device holds. **The blindness `0030` flagged is real and blocks
nothing.**

**Why the two parked options lost, in the owner's terms:**

- **(a) loosen `failed_write_select` to `manager` — REFUSED.** ⚠️ **The cheap version buys
  nothing and the useful version breaks two rulings.** Used only to count rows it shows
  exactly what (b) shows, having taken a permanent policy risk for free; used to render a
  LIST it must rebuild the receipt client-side from `payload` — variant uuids, base-unit
  quantities — which `0024` decision 6 says **is never validated**, so it may name a deleted
  variant or a unit that no longer resolves. **The screen that most needs to render reliably
  would be built on the only data in the schema with no integrity guarantee**, and what it
  renders when that fails is `42501`. It also contradicts **C10.5** — *"a rejected queued
  write is NEVER shown to the shopkeeper… it must stay in our side for analytics"* — and
  ends §2.8's *"dead letters go to the operator of this system"* at the fence level, which
  is a boundary that costs a policy migration **plus whatever client shipped against it** to
  put back.
- **(b) `my_failed_writes()`, a `security definer` read — NOT WRONG, JUST UNNECESSARY.** It
  was the recommendation and it survives as the fallback: §2.8 intact, a count and a peso
  figure, the precedent `my_access_requests()` (`0029`) already set. **It loses only because
  (c) produces the identical screen for no migration at all.** ⚠️ **Recorded rather than
  deleted**: if the device-local path turns out not to cover the pilot, this is the answer,
  already argued.

⚠️ **WHAT (c) DOES NOT COVER, ACCEPTED DELIBERATELY.** It is per-device and lost on a
reinstall, and it does not show a failure that happened on the OTHER person's phone. **Both
fall back to HAND RECOVERY BY US**, which is the ruling of 2026-09-05 and which already says
that is permanently the answer while the pile is a trickle. ⚠️⚠️ **AND IT IS MEASURED RATHER
THAN ASSUMED**: §2.10's nightly check prices the pile for free, so the pilot answers this
within weeks. **If it stops being a trickle, this file's own recorded reading is that
something upstream is broken and worth fixing at the SOURCE — not that it is time to build
recovery tooling.**

✅ **NO ADR AMENDMENT IS OWED, AND THAT IS THE FIRST TIME IN FOUR RULINGS.** The three of
2026-09-14 that preceded it needed §2.7 and §2.9 changed. This one **upholds** §2.8 and
C10.5 rather than bending either, so ADR-035 is already correct about it. ⚠️ **Nothing here
is a schema change**, which is why it costs nothing to reverse if the pilot disagrees — the
opposite of both options it replaced.

⚠️⚠️ **ONE COPY LAGS THIS RULING ON PURPOSE AND IS NAMED RATHER THAN EDITED: `0030`'s
`comment on function`.** It says the blindness is *"owed to step `5c`'s dead-letter
banner"*, which stopped being true the moment this was ruled. **A function comment is
APPLIED SCHEMA, and migrations are append-only** — so it is NOT edited in place, and the
migration file is left exactly as CI applied it. ✅ **Fold the one-line `comment on function`
correction into `0031`**, which `4.6c-i` ships anyway, so it costs nothing. ⚠️ **Every other
copy was re-signed in this commit**: `0030` checks 2.1 and 3.3, `0026` check 2.2b, the 4.6b
section, the `5c` row and `supabase/README.md` — because *"the copy nobody checks is the copy
that goes stale"* has been this repository's most-recorded defect, nine times.

⚠️⚠️ **AND THE THREE CHECKS CHANGED MEANING WITHOUT CHANGING ONE LINE OF SQL.** They were
written as *"this is expected to go red one day"* — a placeholder waiting for a decision.
**They now HOLD a decision**, and their labels say so, which is exactly what `0028`'s `6.9`
and `6.10` had to do for the redemption ruling: **a later session widening
`failed_write_select` is undoing the owner's ruling of 2026-09-14, not hardening a fence.**
⚠️ **Nothing but these checks can hold it** — the ruling is that a policy stays as it is, and
a change that is not made has no constraint, grant or policy to live in.

✅✅ **`4.6b` IS DONE AS OF 2026-09-14 — `0030` IS APPLIED, AND `4.6c-i` IS THE NEXT TASK.**
`replay_failed_write` is fenced at **`manager`**, one notch down from `owner`, which is what
C11.4 asked for and what `0026`'s own header named as the exit: *"loosening this to `manager`
is a `create or replace` in a new migration."* **18 behavioural checks in
`supabase/tests/0030_replay_manager_fence.sql`, `0026`'s re-signed from 86 to 88, and ten
falsifications against a green control.** The body is `0026`'s, copied verbatim — the diff
against it is two hunks, `create function` → `create or replace function` and the fence.

⚠️⚠️ **ONE DECISION IS OWED AND IT IS PARKED IN THE BLOCK ABOVE: `0030` LEFT A MANAGER ABLE
TO REPLAY A DEAD LETTER SHE CANNOT SEE.** `failed_write_select` is still `owner`-only
(`0024` decision 8) and this migration did not touch it. **That was a scope call, and it is
the one thing in this task worth the owner's minutes**, so it is written out in full in the
decisions table rather than buried here. ⚠️ **Three checks hold the state** — `0030` 2.1 and
3.3 and `0026` 2.2b — and **2.1 is written to GO RED** the day somebody widens the policy,
so the change cannot be made silently.

⚠️⚠️ **AND THE SCOPE WAS A GENUINE DISAGREEMENT BETWEEN TWO COPIES, NOT A JUDGEMENT CALL IN
A VACUUM — THE NINTH STALE-COPY DEFECT, AND THE FIRST WHERE THE STALE COPY WAS THE MORE
CAUTIOUS ONE.** `4.5c-ii`'s section, written 2026-09-05 when the fence was set, says:
*"Recorded for whoever proposes it later: it is TWO changes, the fence AND `failed_write`'s
SELECT policy, or the manager replays blind."* Three later copies — the `4.6b` row, the
`4.6b` section (*"one notch"*, *"the recorders' own `manager` fence is untouched"*) and
`supabase/README.md`'s planned list — all say ONE change. **C11.4 is the ruling and it is
about who may CALL the function**; nothing has ever ruled on who may READ the table.
⚠️ **So the minority copy won on the CONSEQUENCE and lost on the SCOPE**, and both halves
are now recorded: the migration ships one notch, and the blindness it predicted is a pinned
check plus an owner decision. **A migration that merges automatically does not get widened
on the strength of a sentence four days older than the ruling.**

⚠️ **`supabase/README.md`'s `0026` ROW WAS A STALE COPY THE MOMENT `0030` APPLIED** — it
said in bold *"FENCED AT `owner`, TIGHTER THAN THE MARKER'S `manager`"*. ✅ **Struck and
dated in place rather than deleted**, because it is the argument `0030` had to answer — and
the answer is uncomfortable: **`0030` did not refute it, it accepted it and moved the fence
anyway**, on the owner's instruction. The struck sentence now describes the live schema.

⚠️⚠️ **A FALSIFICATION CHANGED THE SUITE'S SHAPE, WHICH IS THE POINT OF RUNNING THEM.** Two
findings, neither visible from a green run:

- **The first spelling of the manager/owner checks called the RPC inline inside
  `select chk(...)`.** Under `F1` — the fence reverted to `owner` — that call RAISES, and
  under `ON_ERROR_STOP` psql killed the whole file at that statement. **A genuine red that
  printed no report table, ran none of the checks below it, and named a sqlstate instead of
  a claim.** ✅ Both now use `chk_json`, which traps and records, so the rest of the ladder
  still runs. **The difference between a suite that fails and a suite that says what failed.**
- ⚠️⚠️ **`_src()` DIED ON THE ONE DEFECT IT EXISTS TO CATCH.** It was a scalar subquery on
  `proname`; under `F2` — an OVERLOAD rather than a replacement, the worst thing
  `create or replace` can do — it returned two rows and raised *"more than one row returned
  by a subquery"*, **killing the file before check 1.1 could report the overload**. ✅ Every
  `§1` claim now aggregates (`bool_and`, `string_agg`), which is both survivable and the
  stronger sentence — *"…of EVERY `replay_failed_write` in the catalog"* — so an overload
  carrying the old owner fence turns 1.3 red as well as 1.1. **A suite that dies on the
  defect it is written to name has not caught it.**

⚠️ **AND `0026`'s SECTION 2 GAINED A RUNG THAT COULD NOT BE WRITTEN BEFORE `0030`.** The old
pair was *manager refused / owner succeeds*. It is now a four-rung ladder on one row —
cashier refused → manager REPLAYS → manager still cannot read it (2.2b) → owner reaches the
idempotency branch → **cashier refused AGAIN on the now-replayed row (2.3b)**. 2.3b is the
new one and it is not decoration: the already-replayed branch RETURNS rather than raises, so
a fence sitting below it would hand a cashier a cheerful `already_replayed: true` on every
recovered row. **A privilege escalation visible only after a successful replay**, which the
old pair could never reach. Falsified by `F9`, which moves the fence below that branch and
turns 2.3b red while `0030`'s own suite stays green — the division of labour, stated.

⚠️ **`0026`'s 2.3 ALSO HAD TO BE RE-CUT RATHER THAN KEPT.** It read *"the OWNER succeeds on
the same row"*, and with the manager replaying first that call now lands on the idempotency
branch — so a plain `chk_succeeds` would have passed **without asserting anything about the
fence**, which is this repository's recorded *"green check that stopped measuring its own
claim"* arriving for the fourth time. It asserts the branch instead.

⚠️ **ONE LOCAL-HARNESS TRAP, ALREADY DOCUMENTED IN `_cleanup.sql` AND HIT ANYWAY.** An
aborted first run left a three-argument `_pl` standing, and the next run died on *"function
is not unique"* rather than on the defect. ✅ `0030`'s suite now creates `_pl` at **`0026`'s
exact four-argument signature, defaults included** — the fourth argument is never passed —
so it REPLACES the older helper instead of sitting beside it, which is the rule that file
states in its own words. `_src` is registered there too, on the day the suite lands.

✅✅ **`4.6a-iii` IS DONE AS OF 2026-09-14 — `0029` IS APPLIED, `4.6a` IS COMPLETE, AND `4.6b` IS THE NEXT TASK.**
The pull path exists: `request_access(code)`, `approve_request(id, location_ids)` and
`my_access_requests()`. **Register #9's `D6`, `D7` and `D8` are now frozen**, which closes the
last of the eight. **67 behavioural checks in `supabase/tests/0029_request_path.sql`, thirteen
falsifications against a green control** — and the membership flow the amendment of 2026-09-13
described is, for the first time, a thing the database can actually do end to end.

⚠️⚠️ **IT ADDS A COLUMN, AND THE SPLIT SAID `0027` WAS THE ONE THAT DOES THAT.**
`workspace_invite.requested_by`, nullable, present exactly on the request path. `D4` says
`accepted_by` is *"who actually joined"*, and a request row names its person by EMAIL — so
without the column, approval has to resolve that string back to an account, which is a **second
identity mechanism for one column** and fails outright if the person changed their address
between asking and being approved. `D4` was renamed precisely because one column meaning two
things reads as correct until somebody asks who a row is about. It also decides
`my_access_requests()`, which is keyed on `requested_by = auth.uid()` rather than on the
caller's mutable email.

⚠️⚠️ **AND RE-SIGNING THE SUITES IT BROKE FOUND SOMETHING WORSE THAN THE BREAKAGE.** The new
CHECK turned two of `0027`'s fixtures red — the `S1` shape, predicted in the migration header
rather than discovered. **But three NEIGHBOURING checks stayed GREEN while silently changing
what they measured**: `6.5`, `6.6` and `6.8` are `chk_raises … '23514'`, and a request row with
no `requested_by` now raises `23514` **from the new constraint instead of the one those checks
are about**. Left alone they would have asserted nothing about `D1` or `D2` and reported PASS
for ever. ✅ **All five fixtures were re-signed, not the two that failed** — and the fix is
verified by dropping the new constraint and re-running `0027`, where `6.5`/`6.6`/`6.8` still
pass, which is what says `workspace_invite_source_consistent` is the thing refusing them.
⚠️ **This is the THIRD time in this repository that a check was found measuring something
adjacent to its claim**, and the first where a MIGRATION made it happen to a suite that was
already green.

⚠️ **A LOCAL HARNESS REPORTED `exit=0` FOR A SUITE THAT HAD JUST FAILED**, and the missing
*"all N checks passed"* line is what caught it — the same shape as `3.6a`'s *"a green tick is
also what a step that ran nothing looks like"*, arriving in this session's own scratch script
rather than in CI. **The count line, not the exit code, is what a suite's own run means.**

✅✅ **`4.6a-ii` IS DONE AS OF 2026-09-13 — `0028` IS APPLIED, AND `4.6a-iii` IS THE NEXT TASK.**
The push path exists: `create_invite` and `redeem_invite`, the two functions `0002:362`
assigned to `0005` and `0005` never wrote, so ADR-035 has described this flow since it was
written and no migration had ever shipped it. **77 behavioural checks in
`supabase/tests/0028_invite_path.sql`, eleven falsifications against a green control**, and
the first membership this database has ever written for somebody who did not create the
workspace.

✅✅ **AND THE ONE DECISION THAT WAS OFFERED BACK IS RULED, HOURS LATER AND BEFORE `0029`
EXISTS — the owner said *"do what you recommend"* on 2026-09-13, which is the recommendation
below: `redeem_invite` DOES NOT REQUIRE THE CALLER'S SIGNED-IN ADDRESS TO MATCH THE
INVITE'S.** ⚠️ **The behaviour does not change — it is what `0028` merged with** — so the
ruling costs no migration, which is the cheapest a decision of this kind ever gets. The
token is the credential — unguessable, single-use, seven days old at most, and delivered by
the owner to the person the owner chose. An address check would add a second factor and would
also refuse the ordinary case this pilot is about to meet: **`5a-iv-c-3` signs the shopkeeper
in with GOOGLE**, and the address Google returns is not necessarily the one the owner typed
into the invite screen. That refusal is silent from the joiner's side and looks like a broken
app. **`accepted_by` records who actually joined (`D4`), so the difference is kept rather than
lost.** ⚠️⚠️ **AND NOTHING BUT A TEST CAN HOLD IT**, which is why it is written up rather
than filed: the ruling is that redemption does **not** compare two values, and an absent
comparison has no constraint, no grant and no policy to live in. **Checks `6.9` and `6.10`
are the entire guard**, and their labels now name the ruling rather than the behaviour — so a
later session adding the email check that looks like a hardening is told whose decision it is
undoing. ⚠️⚠️ **AND THE GUARD DID NOT FIRE WHERE IT WAS DOCUMENTED UNTIL A FIXTURE WAS
RE-SIGNED.** Re-running **`F11`** against the renamed checks aborted the suite at `5.9`,
three sections early, because that section's manager invite was addressed to somebody other
than the user who redeems it — an INCIDENTAL second test of the ruling, in a check written
about something else. ✅ **`3.18`'s fixture now carries that user's own address**, the
reversal lands on `6.9`/`6.10`, and the message a future session reads is the one naming the
decision. **A check that names a ruling is worth nothing if a fixture three sections above it
stops the run first.**

⚠️⚠️ **AND §2.7's OWN SENTENCE ABOUT THIS FUNCTION IS WRONG — *"an owner or manager calls
`create_invite(...)` under normal RLS"*.** It predates its own amendment, and `D3′` is what
overtakes it: the creating RPC must SUPERSEDE an expired pending row, superseding is an
UPDATE, and `0002:576` says in terms that `workspace_invite` has **no update policy**.
⚠️ **The suite asked the database rather than the file, and the answer was harder than the
migration's first draft claimed**: `0002:594` never granted UPDATE to `authenticated` either,
so an owner's UPDATE is refused `42501` and never reaches a policy at all. **The invoker
spelling would have died on the supersede — and the obvious fix for that error is to grant
UPDATE, after which the missing policy makes it a silent no-op and `D3′`'s bug returns wearing
the costume of its own cure.** So `create_invite` is `security definer` with the fence in the
body, which is where `0021`, `0022`, `0025` and `0026` already keep theirs, and it is the same
predicate the policy carries. ⚠️ **`0027`'s own grant comment already named this function as
one of the definer bodies that call its helper** — the ADR sentence is the stale copy, not the
migration. **It is NAMED here rather than quietly edited into the ADR**: the ADR is amended by
the owner's deliberate decision, and a task is not one.

⚠️ **THE SIGNATURE GAINED AN ARGUMENT THE PLAN'S SKETCH DID NOT HAVE.** This file's row said
`create_invite(email, role, location_ids)`; it ships as
`create_invite(workspace_id, email, role, location_ids)`. Deriving the workspace from the
caller is a different claim, and §2.7 refuses it in advance — *"many workspaces per user works
from day one … retrofitting that later would touch every screen."* A three-argument spelling
is that retrofit, pre-written.

✅✅ **`4.6a-i` IS DONE AS OF 2026-09-13 — `0027` IS APPLIED, AND `4.6a-ii` IS THE NEXT TASK.**
The membership shape landed: `workspace.code` (**`D5`**), `workspace_invite` re-shaped
(**`D1`**, **`D2`**, **`D4`** — the first column rename in this schema), the **`D3′`**
supersede helper, the backfill, `onboard_workspace` replaced a third time, and pgTAP `02`,
`03` and `04` re-signed because the rename breaks their INSERT. **64 behavioural checks in
`supabase/tests/0027_membership_shape.sql`, eleven falsifications against a green control.**

⚠️⚠️ **ONE THING NEEDS THE OWNER'S EYE, AND IT IS CHEAP ONLY UNTIL `0028` MERGES: §2.7's
`D1` AND `D4` CONTRADICT EACH OTHER, AND `0027` CHOSE `D4`.** `D1` says `decided_by` is
present *"exactly when `source = 'invite'`"*; `D4` says it is also set *"at approval for a
request"*. **An approved request has a decider on a `request` row, so no constraint
satisfies both.** The migration keeps `D4` — because `D4` exists so that *"who approved this
membership"* has an answer, and the request path is the only path where approval is a
separate act — and preserves `D1`'s reason, which is about the row **at creation**, by
checking `(decided_by is not null) = (accepted_at is not null)` on a request. **The full
argument, the pair of checks that hold it and the falsification that breaks it are in
`4.6a-i`'s done section.**

⚠️ **AND THE GATE ABOVE `4.6a` WAS STALE WHEN THIS TASK WAS TAKEN.** The READ-FIRST block
still said decision register #9 was *"STILL OWED AND STILL BLOCKING"* hours after ADR-035
had been amended to carry C11.5/C11.6 — **the eighth stale copy recorded here, and the first
where the stale copy was a gate**. The ADR won, as `CLAUDE.md` says it must. ⚠️ **No guard
reads that block**, which is how it survived.

✅✅ **`4.6a` IS SIZED AND SPLIT AS OF 2026-09-13, BEFORE A LINE OF IT WAS WRITTEN — IT IS AN
`L`, IT BECOMES THREE `M`s, AND `4.6a-i` IS THE NEXT TASK.** The row said *size and split it
before writing a line*; this is that, and **nothing else — `0027` does not exist yet.** The
seam is the two ways in, with the schema landing alone: **`4.6a-i`** is `0027`, the table and
the column nobody has; **`4.6a-ii`** is `0028`, the PUSH path `create_invite` /
`redeem_invite` that `0002` assigned to `0005` and `0005` never wrote; **`4.6a-iii`** is
`0029`, the PULL path C11.5 asked for. ⚠️ **The split COSTS A RENUMBERING — `4.6b` becomes
`0030`, `4.6c` becomes `0031`** — the third in this repository, for `4d`'s reason exactly:
three tasks that each merge on their own green run cannot share one unapplied file.

⚠️⚠️ **AND `supabase/README.md` — WHICH CALLS ITSELF THE AUTHORITY ON NUMBERING — DID NOT
KNOW STEP 4.6 EXISTED. THAT IS A SEVENTH STALE COPY, AND THIS SESSION HAD TO HAND OUT THE
NUMBERS IT WAS WRONG ABOUT.** It said `0026` was *"the LAST migration in the database build"*
and that *"nothing is downstream of it, because steps 5–7 are the client and ship none"* —
**true when it was written on 2026-09-05, false since 2026-09-07**, when the UI/UX grill
created step 4.6 and three migrations with it. ✅ **Corrected in both places, and the
correction is now GUARDED rather than trusted**: the new split check reads `0027`–`0031` out
of that file and fails if it slips back to claiming the schema is finished. ⚠️ **Nothing
could have caught it** — the six recorded stale-copy defects are all inside `docs/PLAN.md`,
`HANDBOOK.md`, `README.md` and `CONVENTIONS.md`, and no check had ever read
`supabase/README.md` at all.

⚠️⚠️ **FOUR THINGS WERE FOUND BY OPENING APPLIED SQL RATHER THAN THE RECORD OF IT, AND THE
FIRST TURNS THREE GREEN SUITES RED.** `D4`'s rename of `invited_by` breaks the invite fixture
in `02`, `03` and `04` — all three INSERT it by name (`02:106`, `03:256`, `04:363`) — so they
fail in **setup**, which `4c-ii` already recorded as the failure that reports zero failing
tests. **Re-signing them is inside `4.6a-i`.** ⚠️ **The second reversed an instinct**: two
earlier findings (`3.2a`, `4.5b`) say an empty tenant table should be seeded, but `02`'s `F9`
**asserts** this one is empty in the seed and says a future seed populating it turns red on
purpose — **so `0027` touches no seed file.** ⚠️ **The third is a hole in `5b`**: a joiner
cannot read the request they just made, and no policy will ever let them, because
`workspace_invite_select` is manager-and-above and a non-member has no role at all — so
`4.6a-iii` ships a status read, or the join screen has nothing to draw and the next session
reaches for the select policy `D6` forbids. ⚠️⚠️ **The fourth is a privilege escalation, and
it is `D7`'s**: *"entering the code accepts a pending invite for that email"* is safe only
while the joiner can choose **neither** the email **nor** the role. `request_access`
therefore takes **no email argument** — it reads the caller's own inside the definer body —
and **the absorbed invite's role wins over the requested one**, silently.

⚠️ **SEVEN DECISIONS WERE TAKEN ON THE OWNER'S BEHALF**, all seven listed in `4.6a`'s sizing
section with their reasoning. ✅✅ **AND THE ONE THAT WAS OFFERED BACK IS RULED: the owner said
*"keep the status read"* on 2026-09-13, hours after the split merged** — so `my_access_requests()`
is a deliverable of `4.6a-iii` by decision rather than by a sizing session's judgement. ✅ **It is
now NAMED in both the parent row and the child row, and the split guard carries a thirteenth
deliverable so it cannot quietly vanish** — which is the whole difference between a decision
recorded and a decision held. ✅ **One new guard,
`docs/checks/4.6a-split-coverage.sh`, falsified against eight fixtures and wired into
`app.yml`** beside the other two plan guards — it is the first check in this repository that
reads `supabase/README.md`.

⚠️ **AND `docs/HANDBOOK.md` STILL SAID STEP 4.6 COULD NOT START UNTIL THE ADR WAS AMENDED**
— false for one day, and it is the file a non-developer reads first. ✅ **Struck and dated,
along with two more of its cells**: step 4.6's row now records the split and says which of the
two remaining gates is still the owner's (área 9), and `5a-iv`'s *"this is where the build
is"* arrow is replaced by what is actually true — **that piece is waiting on a calendar**
(2026-09-20 re-deploy, 2026-09-21 and 2026-10-13 readings), while the takeable work moved to
step 4.6. ⚠️ **No check reads `docs/HANDBOOK.md`**, which is how `#76` happened and is why
this one was found by reading rather than by a run.

✅✅ **THE ADR IS AMENDED — the owner instructed it on 2026-09-13 and ADR-035 carries it**
(§2.7 and §8, revision entry **third of that date**). ~~⚠️ **ONE LINE OF ADR TEXT NOW LAGS
THE SPLIT, AND IT IS NAMED RATHER THAN QUIETLY EDITED.**~~ §2.7 said register #9's rulings
*"freeze when `0027` merges"*; they freeze across **`0027`–`0029`** — `D1`/`D2`/`D4`/`D5` at
`0027`, `D3′`'s helper at `0027` with its callers in `0028` and `0029`, and `D6`/`D7`/`D8` at
`0029`, **so three of the eight stay revisable for two migrations longer than the rest.**
⚠️ **The claim was right and the number was one of three**, which is the error that reads as
correct forever: nothing in the sentence looks wrong unless you know how many files the task
became. **It was named here rather than edited there** because the ADR is amended by
deliberate decision and a sizing session is not one — and then it was ruled on within hours.

✅✅ **AND THE CLAIM IS NOW GUARDED ACROSS THREE FILES, WHICH IT WAS NOT WHEN THE ADR WAS
THE ONLY COPY THAT WAS WRONG.** `4.6a-split-coverage.sh` reads `docs/PLAN.md`,
`supabase/README.md` **and ADR-035**, and asserts all three agree on which task owns
`0027`–`0031`. ⚠️⚠️ **ITS FIRST SPELLING OF THE ADR ASSERTION READ THE WRONG COPY AND A
FIXTURE CAUGHT IT** — it flattened the document and matched each number within eighty
characters of its task name, which §8's checklist and the revision entry both satisfy 1,500
lines from §2.7, so striking `4.6a-iii` out of §2.7's own table stayed **green**. ✅ **It now
reads that table's rows at column 0**, which is the same fix three scripts took on
2026-09-13 and the anti-vacuity case for free: deleting the table removes the rows the loop
requires, not merely the sentence the next check bans. **That is the SECOND time in this
file's short life that it measured something adjacent to its claim, and both times a
falsification is what said so.**

⚠️⚠️ **A SIXTH STALE COPY, FOUND BY THE OWNER ON 2026-09-13 BY READING — AND FIXING IT
PRODUCED A SEVENTH, INSIDE THE FIX.** `## Position` carried a second status table 960
lines below its own header: `5a … Not started` with **six of eight sub-tasks done**,
`4.5 … UNDER WAY` where the same section's header said steps 1–4.5 were **all closed**,
and **no row for step 4.6 at all**. ⚠️ **No instrument here could see it** — `plan-handover.sh`
reads rows carrying its next-task sentinel, `5a-split-coverage.sh` reads bold sub-task
rows; a status row of the shape this table used matched neither. ✅ **The status column is
REMOVED rather than corrected** — `#76`'s shape — so the table is a map and status lives
in exactly two guarded places. ✅ **`plan-handover.sh` assertion 5 now refuses a second
status board**, falsified against the exact row the owner spotted.

⚠️⚠️ **AND THE PARAGRAPH EXPLAINING ALL THAT BROKE `5a-split-coverage.sh`.** It quoted the
row pattern verbatim — the literal `| **5a-i** |` — 8,000 lines above the real table.
`row()` was `grep -m1`, unanchored, first hit wins, so it read the PROSE and reported
**four of `5a-i`'s deliverables as dropped by the split.** ⚠️⚠️ **AND THEN IT HAPPENED A
THIRD TIME, IN THIS VERY PARAGRAPH**: the sentence naming `plan-handover.sh`'s next-task
sentinel contained that sentinel, so assertion 2 read this write-up instead of the status
log. ✅ **THE RULE, WRITTEN DOWN IN BOTH SCRIPTS: never quote a check's sentinel string
verbatim in the file that check reads.** Describe it; do not spell it. ✅ **The row readers now require
column 0**: a table row starts there and prose quoting one never does. ⚠️ **This is the
same shape as `conventions-gate.sh`'s comment-stripping trap, hit the same day, in a
different file: A GUARD THAT READS THE SENTENCE EXPLAINING THE DEFECT REPORTS THE DEFECT.**
Twice in one day is not a coincidence — **prose about a check is input to that check**,
and neither script had been written with that in mind.

✅✅ **ÁREA 9's BRIEF IS WRITTEN AS OF 2026-09-13, AND IT FOUND THAT TWO OF THE THREE
NÚMEROS QUESTIONS ARE BROKEN, NOT ONE.** The decisions-owed block's last row now points at a
written brief instead of an offer to write one. ⚠️ **It is still OPEN — it is a brief, not a
ruling.**

⚠️⚠️ **F2 HAS A TWIN, AND IT WAS FOUND THE SAME WAY F2 WAS: BY READING THE OTHER VIEWS
INSTEAD OF TRUSTING THE RECORD OF THEM.** `F2` said question 1 was broken under C8.6.
**Question 2 is broken identically**: `product_waste_daily` costs waste from
`unit_cost_net_per_base` on the movement — **zero for a shortfall lot** — so throwing away
`Pechuga` costs **$0**, and the rate's denominator is purchases of `Pechuga`, which is
**also zero** because you buy whole birds. ✅ **Question 3 is intact and says so itself**:
velocity is quantity only, and `0013`'s header already records *"there is no cost column for
it to fail open on."* ⚠️⚠️ **`4.6c` was therefore scoped to fix one of two, on the pilot's
MAIN product line** — whether one view answers both is `B4`, and `B4` waits on `A4`.

⚠️⚠️ **THE BRIEF HAS TWO HALVES THAT TAKE DIFFERENT KINDS OF ANSWER, AND THAT IS THE
DELIBERATE DIFFERENCE FROM REGISTER #9.** `A1`–`A6` are **shop truth and carry NO
recommendation**, because the grill-me rule is *ask, do not propose* and a proposal there is
a guess about a shop nobody here stands in — **CI can prove a view is consistent and can
never prove it is the number a shopkeeper wanted.** `B1`–`B8` are engineering and carry a
recommendation each, in register #9's shape.
⚠️ **`A5` is asked because ADR-035 §4 told us to**: its risk row says *"owner doesn't open
Números unprompted in week two → the three questions are the wrong three. Ask what they
checked instead."* **That question is now asked before the pilot rather than after it.**
⚠️⚠️ **And `A3` can invalidate half of Part B**: if the number is wanted **per piece**, no
view solves it, because C8.6 means a piece's cost is **not derivable from anything the
ledger stores** — the conversation would become whether to model the despiece at all, which
is far larger than `4.6c`.

✅✅ **THE OPEN ITEMS WERE PUT IN ORDER ON 2026-09-13, AND THE FINDING IS THAT THIS FILE HAD
THREE KINDS OF OWED THING AND HOMES FOR ONLY ONE.** The owner asked for the backlog to be
made legible to the standing prompt rather than to a person who was here. Sorted:

| What is owed | Where it lived | Where it lives now |
|---|---|---|
| **A decision** | ⛔ the decisions-owed block, guarded, re-offered every session | unchanged — **one row left**, area 9 |
| **A task** | the build-order tables + exactly one next-task marker, guarded | unchanged — **`4.6a`** |
| ⚠️⚠️ **A DATE** | **nowhere. Three live ones, held by prose and a memory file** | ✅ **`⏳ DATES OWED`, and `plan-handover.sh` assertion 9** |
| ⚠️⚠️ **A FINDING THAT IMPLIES FUTURE WORK** | **nowhere — three floating paragraphs saying *"routed to 5i"* and *"candidate task"*** | ✅ **real rows: `5c.5`, and two additions to `5i`** |

⚠️⚠️ **THE PATTERN IS THE POINT: WHENEVER A SESSION FINDS SOMETHING IT CANNOT DO NOW, IT
WRITES A PARAGRAPH — AND THIS REPOSITORY HAS SIX RECORDED STALE-COPY DEFECTS PROVING
PARAGRAPHS DO NOT SURVIVE.** Decisions got a guarded home after one went stale; tasks always
had one. Dates and findings never did, and both had already accumulated three.

✅ **`⏳ DATES OWED` has teeth the decisions block deliberately lacks: `plan-handover.sh`
FAILS once a due date is in the past and its row is unanswered, which blocks every merge.**
⚠️ **A guard that can stop all work is the shape that refused `4.6a` earlier the same day**,
so two things bound it: the exit is a sentence in the Done cell, and it fires only on dates
**strictly before** today in UTC, so a due-today row is never a timezone false red.
✅ **Falsified `X1`/`X2`/`X3`** — past-due unanswered 🔴, answered 🟢, block deleted 🔴.
✅ **And it BOUNDS THE REGION IT READS from its first line**, which is assertion 7c's lesson
applied the day it was learned rather than after the next incident.

✅ **`5c.5` is the flaky-network refresh reading**, sized `S`, ungated, needing no calendar —
**this is where C1.4's real risk moved** once the session config was read. ✅ **`5i` gained
the two pilot-day INSTALL findings** — Auto Blocker refusing a sideload, and the debug
keystore that cannot update into a real one — neither of which is about sign-in, which is
why neither had a home in a row about Facebook.
⚠️ **The prose that called these *"not yet placed"* is struck rather than deleted**: the
reasoning is worth keeping, the claim is not, and leaving both is how a seventh stale copy
would have been born in the same commit that fixed six.

✅✅ **DECISION REGISTER #9 IS RULED AS OF 2026-09-13 — ALL EIGHT TAKEN AS RECOMMENDED,
ADR-035 IS AMENDED, AND ~~`4.6a` IS THE NEXT TASK~~ — `4.6a` WAS SIZED AND SPLIT LATER THE
SAME DAY AND `4.6a-i` IS.** The membership flow is settled: **the
joiner enters a workspace code, requests access, and is approved; an owner's invite is a
request that arrives pre-approved. Both paths, one table** (C11.5 / C11.6). **The
decisions-owed block now holds ONE row — area 9 — and the build is no longer
decision-blocked.**

⚠️⚠️ **THREE OF THE EIGHT DID NOT EXIST WHEN THE BRIEF WAS WRITTEN, AND ONE OF THEM IS A
DEFECT IN THE BRIEF'S OWN REASONING.** `0002_catalog.sql:370` was opened line by line before
the rulings were put, rather than the summary being trusted. **All four collisions were
confirmed exactly as briefed** — and then:
⚠️⚠️ **`D3` WAS WRONG ABOUT ITS OWN CONSEQUENCE. It said an expired request *"costs the
joiner one tap to re-ask"*; in fact they can NEVER ask again.**
`workspace_invite_one_pending_idx` is partial on `accepted_at is null`, and an expired row
still satisfies that — **so it holds the slot permanently**, and re-requesting, or
re-inviting anyone whose invite lapsed, is refused by a unique violation. ⚠️ **It cannot be
fixed in the index**: `now()` is not `immutable` and may not appear in an index predicate.
✅ **Ruled: keep the expiry, and make the creating RPC supersede the stale row.**
✅ **`D7` — the two paths can collide on one person**, and the request path now **absorbs**
a pending invite instead of erroring. ✅ **`D8` — the approval RPC takes `location_ids` and
refuses an empty array for staff**, because `member_location` + RLS means an approved staff
member with no locations has every write refused **with no message at all**.
⚠️ **`D8` is the one that would have reached a shop**: it is invisible to every test that
runs as a manager or owner, and to the joiner it is indistinguishable from a broken app.

✅ **ADR-035 §2.7 and decision register #9 both carry the ruling**, with a revision entry
dated 2026-09-13 — **the second entry that date**. ⚠️ **That mattered more than usual
here**: `CLAUDE.md` tells a fresh session *"the ADR wins"*, `4.6a` is a migration, and
migrations merge automatically — so a session reading the unamended ADR would have written
the **inverse** flow and deployed it. ✅ **§8's follow-up checklist is corrected too**: it
listed `create_invite` / `redeem_invite` as an unticked box without saying they had been
**assigned to `0005` and never written**, which is why §2.7 has always described functions
that do not exist.

✅✅ **DONE THE SAME DAY — the split is the entry above, and `4.6a-i` / `4.6a-ii` /
`4.6a-iii` are in the step 4.6 table. The paragraph below is kept as the argument that
produced it.** ⚠️⚠️ **`4.6a` IS AN `L` AND MUST BE SIZED AND SPLIT BEFORE A LINE IS WRITTEN.** It carries
`0027` **and three or four RPCs that do not exist** — `create_invite`, `redeem_invite`, the
request path and its approval — and `0027` is append-only and merges without review. **The
row says so; do not skip it.** ⚠️ **Everything the eight rulings decided freezes the moment
`0027` merges**, and each becomes a fix-forward migration rather than an edit.

✅✅ **BUILT THE SAME DAY — see `## Position`'s `⏳ DATES OWED` block and
`plan-handover.sh` assertion 9. The paragraph below is kept as the argument that produced
it.** ~~⚠️ **A GAP WORTH NAMING, NOT YET BUILT: THERE IS A DECISIONS-OWED BLOCK AND NOTHING
EQUIVALENT FOR DATES.**~~ Three are now live — the iPhone re-deploy before
`2026-09-20T06:19:32Z`, the day-8 reading on **2026-09-21**, and the day-30 reading on
**2026-10-13** — and they are held only by table cells and this log. ⚠️ **That is precisely
the shape the decisions block was invented for**: a thing nobody has to remember, re-offered
every session. **Not built here, because it would change `plan-handover.sh`'s invariants and
this session did not size that.**

✅✅ **`5a-iv-d`'s SESSION CONFIGURATION WAS READ ON 2026-09-13, AND IT ANSWERED IN THIRTY
SECONDS THE HALF THAT EIGHT DAYS WAS NEVER GOING TO REACH.** The eight-day reading was
designed around **Google's** 7-day test-user clock and **had never considered Supabase's
own session settings** — which are the things that would actually bound a session, and
which `GET /auth/v1/settings` does not expose (32 fields, none of them about sessions;
checked, not assumed).

| Setting | Value | What it means |
|---|---|---|
| **Time-box user sessions** | `0` | disabled — **no hard maximum session age** |
| **Inactivity timeout** | `0` | disabled — **a session does not die from disuse** |
| **Detect and revoke compromised refresh tokens** | **On** | a replayed refresh token revokes the whole session family |
| **Refresh-token reuse interval** | `10s` | the default tolerance for a replay |

✅ **SO C1.4 IS NOT CONTRADICTED BY CONFIGURATION — nothing on the project is set to expire
a session.** ⚠️ **This is a REPORT, not a measurement**, in the same standing this file
already gives the Supabase redirect allow-list: the anon key cannot read these values, no
check here can, and the owner read them off the dashboard on 2026-09-13. **Do not upgrade
it to a measurement later by forgetting where it came from.**

⚠️⚠️ **AND THE RISK MOVED. THE ONE SETTING THAT IS ON IS THE ONE THAT CAN SIGN A SHOPKEEPER
OUT, AND IT IS AIMED SQUARELY AT THIS PILOT.** Reuse detection revokes a session family when
a refresh token is presented twice outside the 10-second interval. ✅ **The common cause is
already handled and that was checked in the library rather than worried about**: `auth-js`
**single-flights** refreshes (`refreshingDeferred` plus a commit guard in
`_callRefreshToken`) and retries only on network-class errors, so two parts of the app
cannot race each other into a replay. ⚠️⚠️ **The residual case is a LOST RESPONSE: the
server processes the refresh, the reply never arrives over a bad connection, and the client
retries the same token. Inside 10s that is forgiven; outside it, the session is revoked and
the person is signed out for no reason they can see.** **The pilot store is offline a lot —
that is not a hypothetical there.**
⚠️ **NOT MEASURED, AND DELIBERATELY NOT DESIGNED AROUND.** Turning reuse detection off would
remove an alarm rather than answer it. **The test this deserves is a flaky-network refresh,
which needs no calendar at all** — ✅ **now a real row, `5c.5`, promoted out of prose the
same day.**

✅✅ **A SECOND, CLOCK-FREE INSTRUMENT FOR `5a-iv-d` WAS SEALED 2026-09-13 AT 18:23 CST.**
A dedicated AVD, **`wera-reading-5a-iv-d`**, signed in with Google and powered down.
⚠️ **It is a SEPARATE AVD from `wera-android-36` on purpose, and that is not tidiness**:
opening the app refreshes the token and restarts the clock, so a design session three days
from now would silently destroy the measurement. **`wera-android-36` is the one to open for
design and testing; this one is not to be booted until the reading.**
✅ **The instrument was seal-tested before being trusted** — force-stopped to a dead pid,
relaunched, still on Inicio — so the session is known to be on disk rather than assumed.
✅ **It uses a DIFFERENT Google account from the iPhone**, at the owner's initiative, so the
two instruments have independent blast radii. ⚠️ **That matters precisely because reuse
detection is on**: one account would have made a revocation capable of killing both readings
at once, and two correlated instruments are one instrument.
⚠️ **Its value is that it has NO PROVISIONING CLOCK.** The iPhone remains the primary
reading, and its free profile expires `2026-09-20T06:19:32Z` — *before* day 8 — so if that
re-deploy is fumbled, or Wera is opened by accident, **this emulator still answers.**

⚠️⚠️ **DECIDED ON THE OWNER'S BEHALF, HE HAVING DELEGATED IT: THE 21st IS CHECKPOINT ONE,
NOT THE ANSWER, AND THERE IS A SECOND LOOK ON 2026-10-13 (DAY 30).** C1.4 claims persistence
*"until an explicit log-out"*, which is unbounded; eight days could only ever **fail to
disprove** it, and with time-box and inactivity both at `0` the idle scenario is now the
*least* likely way this breaks. Both devices are sealed already, so day 30 costs a glance.
⚠️ **The shop-truth question behind it was put and was delegated rather than answered** —
*is any pilot device plausibly untouched for a week?* If the answer is ever *no*, the idle
reading is measuring a situation the pilot never reaches and the flaky-network test is the
whole of the risk.

✅✅ **PLACED THE SAME DAY AS `5c.5`, SIZED `S` — this paragraph is kept only for the
reasoning. ⚠️ It is no longer a candidate and must not be re-added as one.**
~~⚠️ **CANDIDATE TASK, NOT YET SIZED OR PLACED: the flaky-network refresh test.**~~ Put the app
on a device with a live session, force a refresh across a connection that drops **after the
request and before the reply**, and see whether the session survives. It is the reading that
matches C10.1/C10.2's world and the offline write path of `5c`, it needs **no calendar**, and
as of today nothing in this plan owns it. ⚠️ **It belongs near `5c`, not in `5a`** — but it
is written here because the evidence that motivates it was gathered here and would otherwise
be lost.

✅✅ **`5a-iv-c-3` IS DONE AS OF 2026-09-13 — THE EVENING WAS HELD A DAY EARLY, ALL SIX
READINGS WERE TAKEN, AND `5a-iv-d` IS THE NEXT TASK.** A **Samsung Galaxy Z Flip 8**
(SM-F776B, **Android 17 / One UI 9.0**, `arm64-v8a`) arrived in the owner's hands, so the
sitting was held immediately rather than booked — **`5a-iv-c-2` had closed hours earlier,
which is the only reason this was a sitting and not a setup.** That was the entire argument
of the three-way split, and it is the first time this repository has been able to check it.
`docs/checks/5a-iv-c-3-runsheet.md` is now a **filled-in record**, not a plan.

⚠️⚠️ **THE FINDING IS `A5`, AND IT IS A DEFECT NO iOS TESTING COULD EVER HAVE FOUND:
GOOGLE SIGN-IN SUCCEEDED AND LEFT THE SHOPKEEPER ON A NOT-FOUND PAGE.** *"Unmatched Route —
Page could not be found"*, **in English, quoting the PKCE code**, after an authentication
that had worked: tapping *Go back* landed on Inicio, signed in. ✅ **On Android the redirect
is delivered TWICE** — `openAuthSessionAsync` consumes it *and* Chrome dispatches an
ordinary `VIEW` intent into `MainActivity`, so Expo Router navigated to `/auth/callback`,
which did not exist. **iOS never does this**: `ASWebAuthenticationSession` eats the
redirect. ⚠️ **THIRD PLATFORM-ASYMMETRY FINDING IN ONE DAY** — after `formatToParts` and the
device locale — and the first one in a subsystem that is not `Intl`. ⚠️ **And the guard
could not have rescued it**: `groupOf` returns `null` outside `(auth)`/`(tabs)` and
`redirectFor` returns `null` for a signed-in person on a `null` group, so *stranded* is the
correct reading of those two pure functions.
✅✅ **FIXED AND RE-VERIFIED ON THE SAME PHONE BEFORE IT WENT BACK** — `app/src/app/auth/
callback.tsx`, a route at the path `OAUTH_REDIRECT_URI` already names, redirecting from an
effect (`_layout.tsx`'s deliberate idiom, because redirecting during a render is a
navigation during a render). The second round trip landed **straight on Inicio**;
`grep "Unmatched Route"` over the evening's 15.6 MB log reads **0**, as does every JS
exception. ⚠️ **The widened-guard fix was REFUSED**: it would make every unknown deep link
bounce a signed-in person home — a change to the rule governing every screen, to fix one URL.
⚠️ **§2.10/§2.11 refuse suites over navigation, so the new test pins the STRING, not the
behaviour** — move the route out from under the constant and it goes red (falsified). The
behaviour was measured on a phone, once. **That is `R9`'s shape and the file says so.**

⚠️⚠️ **AND THE EVENING FOUND THIS REPOSITORY'S FIRST MISLEADING *RED*.** Seven shapes of
misleading green are recorded above; `5a-iv-c-2`'s check produced the opposite twice in four
minutes, and **on a borrowed evening a false red is the dearer of the two** — it spends a
resource that cannot be re-booked chasing a defect that is not there, and the rational
response to it is to stop believing the check. Once the phone was **dreaming**
(`mWakefulness=Dreaming`), once the **secure keyguard** was up (`mCurrentFocus=Window{Bouncer}`)
— and `uiautomator dump` returned SystemUI's lock screen while the check printed its crash
message about a healthy build. ⚠️ **An emulator never dreams and never locks**, so neither
state could exist before the check left the emulator. ✅ **A sixteenth assertion now asks
whether the instrument CAN LOOK before it is allowed a verdict**, falsified both ways.
⚠️⚠️ **AND THE FIRST SPELLING OF THAT FIX SOFTENED A REAL CRASH** — a dead process has no
dump either, so `can_look` went false and the not-a-verdict message printed over exactly the
defect the file exists to catch. **Caught by re-running the crash fixture after writing the
fix**, which is the only reason it is not in the committed version. A dead process is now
its own case.

✅✅ **THE OTHER FIVE READINGS, ALL GREEN.** **A1** — 15/15 on the phone itself.
**A2** — ⚠️ **`R10` and C12.2 hold BYTE FOR BYTE on real silicon**: `$1,234.50` =
`24 31 2c 32 33 34 2e 35 30`, `$1,000,000` with two separators and centavos hidden at zero,
`$0.99`; asked `es-MX`, **got `es-MX`**. **A3** — all four words drawn under their icons,
read out of the view hierarchy rather than off a photograph. **A6** — force-stopped to a
dead pid, relaunched, **came back on Vender**, which proves **C1.3** and **C1.4** at once.
✅ **A4 — the owner's words, written down on the night: *"letters look big enough."***
⚠️ **It is a SECOND judgement by the SAME person, not a second person's judgement**, and the
honest reading is that C3.18 now has two data points from one pair of eyes.

⚠️⚠️ **A PILOT-DAY FINDING THAT IS NOT ABOUT CODE, AND NOTHING HERE KNEW IT: SAMSUNG'S
AUTO BLOCKER HOLDS THE USB-DEBUGGING TOGGLE SHUT, AND CAN REFUSE `adb install`.** The switch
reads ***"Bloqueado por Bloqueador Automático"*** — a message that names the blocker and not
the fix. ⚠️ **C1.1 puts a Samsung among the four pilot devices and there is no Play listing
until `5i`, so the pilot is installed by SIDELOADING** — which means this setting can block
the install itself, in a shop, with a queue. It belongs with `5i`'s pilot-day work beside the
debug-keystore note. ⚠️ **The run sheet's `P2` path was also wrong for a Samsung** — One UI
nests Build number under *Información de software* — and that cost the first ten minutes.
Both corrected **from the device**, not from memory.

⚠️⚠️ **AND THE HANDOVER FACT THAT MATTERS MOST: `5a` IS NOW DONE EXCEPT FOR A CALENDAR, AND
THE BUILD IS DECISION-BLOCKED RATHER THAN WORK-BLOCKED.** `5a-iv-d` is a **date**
(2026-09-21), not work. **`5b` is gated on `4.6a`, and `4.6a` is gated on decision register
#9, which is still open.** So a session that clears its context tomorrow has no code to
write until the owner rules. ⚠️ **That is not a scheduling accident — it is the decisions-owed
block doing its job**, and it is why `plan-handover.sh` refuses to let a blocked task be
marked as next.

✅✅ **`5a-iv-c-2` IS DONE AS OF 2026-09-13 — THE APP RUNS ON ANDROID, AND `5a-iv-c-3` IS THE NEXT TASK.**
A `Release` APK from `expo prebuild -p android` + `./gradlew assembleRelease` (cold build,
**10m51s**, 107 MB universal, four ABIs), installed on the API-36 emulator, launched, and
**the sign-in screen read back out of the running app's view hierarchy.**
`docs/checks/5a-iv-c-2-rehearsal.sh` reads **15/15**, six falsifications.
✅ **Decision register #13's emulator smoke test is discharged, literally**, and the APK is
copied to `~/wera-release-2026-09-13.apk` so the borrowed evening does not begin with an
eleven-minute rebuild.

⚠️⚠️ **THE FINDING INVERTS WHAT THIS FILE PREDICTED, AND IT IS THE MORE USEFUL ANSWER:
`Intl.NumberFormat.prototype.formatToParts` IS A FUNCTION ON ANDROID HERMES.** The name
that terminated the app on the owner's iPhone hours earlier is simply *there* on the other
platform. This row expected Android to be the stricter runtime; it is the looser one.
✅ **Hermes takes ECMA-402 from the HOST — Foundation on iOS, ICU on Android — so the
surface is a property of the PLATFORM, not of the engine, and two devices both running
"Hermes" do not agree about what exists.**
⚠️⚠️ **SO `R10` IS NOW WRITTEN AS AN INTERSECTION OF THE PLATFORMS THE PILOT SHIPS TO, AND
THAT IS THE DURABLE CHANGE THIS TASK BOUGHT.** ⚠️⚠️ **Had Android been measured FIRST,
`formatToParts` would have read as present and correct and the crash would have shipped to
the iPhone half of the pilot** — C1.1 puts an iPhone 11 and an iPhone 15 among the four
devices. *One green device is one of two, not a measurement.* Recorded in
`docs/CONVENTIONS.md` R10 with the code points and in `conventions-gate.sh`'s own prose,
which said *"`formatToParts` is simply not there"* and was true of one platform.
✅ **`format` and `resolvedOptions` now have evidence on BOTH runtimes**, and **C12.2 holds
byte-for-byte on each**: `$1.00`, `-$1.00`, `$1,234.50`, `formatMXN(0)` → `$0`,
`formatMXN(-99)` → `-$0.99`. No `MX$`, no `U+00A0`, no comma decimal — read as code points
off the device, because a non-breaking space and a space are the same pixel.
⚠️ **`Intl.PluralRules` IS `undefined` on Android** (`new Intl.PluralRules(…)` → *"undefined
cannot be used as a constructor"*), which is what falsification `C1` below is built from —
**the check was falsified with the defect the runtime under test actually has**, not with
the iOS one.

⚠️⚠️ **AND HOW THAT READING WAS TAKEN IS ITSELF A LIMIT WORTH WRITING DOWN: THE ONLY SCREEN
THAT RENDERS MONEY IS INICIO, AND IT IS BEHIND THE AUTH GUARD.** `readShape()` no longer
throws on a thin ICU — it falls back — so a wrong es-MX shape on Android would have been
**silent**: app launches, sign-in screen draws, 15/15 green. The figures above came from a
**throwaway probe build** that put the code points on the sign-in screen, read with
`uiautomator dump`, then reverted; **nothing of it is committed.** ⚠️ **The check says so in
its own header rather than leaving it to be discovered**, and the repeatable version of this
assertion arrives the moment `5b` puts a peso amount on a screen a signed-out device
reaches. **Until then it is a dated measurement, not a guard.**

⚠️ **A second, smaller finding, and it is about the check rather than the app.** Its Hermes
assertion first expected the magic bytes `c6 1f bc 03 c1 03 bc 1f`, transcribed from
memory. **The real header is `c6 1f bc 03 c1 03 19 1f`**, and the first spelling was
therefore **red against a perfectly good bytecode bundle** — the one kind of red that gets
"fixed" by deleting the assertion. Read off the artefact instead, and the constant carries
the note.

⚠️ **Nothing in `app/` changed, and `android/` is generated and untracked** (asserted, not
assumed: `git ls-files app/android` is empty). ⚠️ **The Release build signs with the DEBUG
KEYSTORE** — Expo's template default, fine for a rehearsal and for a sideloaded evening, and
**not** what a Play listing takes; that belongs with `5i`'s pilot-day work and is written
down here because nothing else in this repository says it yet.

✅✅ **`5a-iv-a` IS DONE AS OF 2026-09-13 — THE APP RAN ON A PHONE FOR THE FIRST TIME, AND IT CRASHED.**
⚠️⚠️ **THE FINDING IS THE BIGGEST ONE THIS PROJECT HAS HAD: `Intl.NumberFormat.prototype.formatToParts`
DOES NOT EXIST ON HERMES, AND `formatMXN` USED IT.** `TypeError: undefined is not a function`,
an uncaught JS exception, process terminated on the splash — the very first time any
build of this app was run on a device. ⚠️⚠️ **The twenty-six assertions over `formatMXN`
were green throughout, and still are: they run under node, which ships full ICU.**
✅ **The footnote this repository's founding rule needed: *a green CI run is evidence about
the runtime CI used*, and node is not the runtime the shopkeeper holds.** ⚠️ `env.ts` had
already written that warning down — *"HAND-ROLLED, AND THE REASON IS THE TWO RUNTIMES"*,
about `atob` — and `formatToParts` was written in the same step. **Writing the warning is
not the same as taking it.** ✅ **Fixed, measured on the device, and now guarded by a new
`R10`** in `docs/CONVENTIONS.md` + `conventions-gate.sh`: `Intl` in the client is an
ALLOW-LIST of what has been run on a phone (`format`, `resolvedOptions`), because the
banned names are *unmeasured*, not *known missing*.
✅✅ **THE DAY-0 PRE-CHECK PASSED — `5a-iv-d` IS FREE. NO $99.** Signed in, killed,
re-deployed (bundle container UUID changed, so a genuine fresh install of the binary),
reopened: **still signed in.** The data container survives an upgrade install, which was
a claim about Apple's system and is now a measurement.
⚠️⚠️ **DAY 0 IS 2026-09-13; THE EIGHT-DAY READING IS DUE 2026-09-21; THE PROFILE EXPIRES
`2026-09-20T06:19:32Z`, WHICH IS BEFORE IT.** Re-deploy first, then open and look.
✅ **Five of six readings taken** — C12.1's four words are drawn (*Inicio, Vender,
Comprar, Desperdicio*), the guard lands on the sign-in screen with no splash hang, C1.3
restores Vender **and** Comprar, and **the Supabase redirect allow-list PASSES — the app
came back on its own.** That last one is the only measurement this project will ever have
of it; the gate script read 15/15 across the dashboard change because it cannot see it.
⚠️ **Google's *"unverified app"* interstitial did not appear**, and the owner judged it a
non-issue for the pilot. ✅✅ **C3.18's OPINION HALF IS ANSWERED AS OF 2026-09-13 — *"the letter sizes are big
enough."*** The owner's own words, and they close the **sixth and last** of the readings
`5a-iv` was the sole instrument for. ✅ **The density scale shipped at `5a-ii` stands as
built; no re-scaling is owed, and `5d`'s screens may size against it.** ⚠️ **It is a
judgement, not a measurement, and it is written down as one** — one person, on one phone,
in one room, answering *"does 76pt read as big behind a counter"* without a counter.
⚠️ **The over-fifty question was not separately put**, and the honest reading of the
answer is that the owner did not think it worth putting. ✅ **If a pilot cashier ever says
otherwise, that is new evidence and not a contradiction** — the scale is a constant in one
file, which is why this was cheap to settle and stays cheap to revisit.
⚠️⚠️ **AND THREE SEPARATE INSTRUMENT DEFECTS COST THE FIRST HOUR**, all now fixed in
`5a-iv-a-preflight.sh` (15 assertions, up from 14) and the run sheet: the preflight printed
`devicectl`'s CoreDevice UUID where the build command wants a device UDID; `expo run:ios`
cannot create a free team's first provisioning profile because it never passes
`-allowProvisioningUpdates`; and its installer fails `InvalidHostID` on this Mac+phone pair
where `devicectl install` goes straight through. ⚠️ **`14/14 — this Mac can build, sign and
install` was not a supported claim**: it rested on a Release-on-SIMULATOR build, which needs
no provisioning at all. The same shape `#75` recorded, in the file `#75` wrote.
✅✅ **FOUR RULINGS FROM THE OWNER, 2026-09-13 (SECOND SITTING) — AND THREE OF THEM CLOSE
THINGS THAT HAVE BEEN OPEN SINCE THE GRILL-ME OF 2026-09-07.**
✅✅ **1. ADR-035 IS AMENDED — §3's build-order step `5a` and §2.10's closing paragraph**,
revision entry dated 2026-09-13. **The last of the four plan-vs-ADR disagreements is
closed, and there is no longer any gap for a literal reading of *"the ADR wins"* to fall
into.** ⚠️ **It was not the one-line tidy it was billed as.** `src/api/` and `src/ui/`
moved to `5d`–`5h` with **`5b.5`** carrying their obligation, the outbox moved to `5c`, and
⚠️⚠️ **TWO DELIVERABLES WERE STRUCK RATHER THAN MOVED** — *"session persistence on a shared
till device"* and *"how the client resolves its `location_id"`* both rest on a shared till,
and **C1.5/C1.1 established the pilot has none; the staff use personal phones.** A
deliverable whose premise is false is withdrawn, not deferred, and neither file had ever
said so.
✅✅ **2. C3.18's OPINION HALF IS ANSWERED — *"the letter sizes are big enough."*** That is
the **sixth and last** of the readings `5a-iv` was the sole instrument for, and it means
**`5a-iv-a` is now fully closed rather than closed-but-one.** The density scale from
`5a-ii` stands as built.
⚠️⚠️ **3b. AND THE BRIEF FOR #9 IS WRITTEN, WITH A FINDING: THE COLLISION COUNT WAS ONE AND
IT IS FOUR.** `0002_catalog.sql:370` was opened rather than trusted, and **`token_hash`,
`expires_at` and `accepted_by` all collide with a self-request too** — none of the three
appeared anywhere in this file before 2026-09-13. ⚠️ **The worst is `accepted_by`, which
means the INVITEE on one path and the OWNER on the other**: not a missing column, a
**semantic overload that reads as correct** until someone asks who approved a membership.
✅ **Six decisions, `D1`–`D6`, each with a recommendation and its reasoning**, in `4.6a`'s
section below — written so the owner rules rather than designs. ~~**All of it freezes when
`0027` merges.**~~ ⚠️ **Corrected 2026-09-13 with the split and the ADR amendment: it
freezes across `0027`–`0029`**, each ruling when its own migration merges.
⚠️ **3. Decision register #9 was re-described at the owner's request and remains OPEN** —
it is now the **single open decision in this file**. One sentence: *the ADR says the owner
pushes an invite; the owner said the joiner pulls with a code; he wants both.* It still
blocks `4.6a`, and the write-up is in the READ FIRST section.
⚠️⚠️ **4. `5a-iv-c-3` IS ARRANGED, AND THAT PUT `5a-iv-c-2` ON A DEADLINE IT DID NOT HAVE
THIS MORNING.** ✅✅ **MET THE SAME DAY — `5a-iv-c-2` CLOSED 2026-09-13, so the deadline
below is DISCHARGED and is kept only as the argument that made it urgent.** ⚠️⚠️ **The date
is a REFERENCE, NOT A GATE — the evening may happen TODAY**, and 2026-09-14 is only the
expectation; it was therefore right to ~~treat `5a-iv-c-2` as due now rather than due
tomorrow~~ and it is now built. The rehearsal was sized as ungated and *"on no critical
path"* — true when the evening was unbooked, **false once it was booked.** ⚠️ **If the evening arrives first, defer it**: an
evening spent on setup is the one resource this task cannot re-book. ⚠️ **The split's whole
argument was that a borrowed evening is a sitting and not a setup**, and the rehearsal is
the only thing standing between the two. ⚠️ **A human step is owed on hardware that is not
the owner's**: USB debugging via Developer Options, arranged **before** the evening rather
than discovered during it — `docs/checks/5a-iv-c-3-runsheet.md`.

✅✅ **`5a-iv-c-1` IS DONE AS OF 2026-09-13 — this Mac can build for Android and run what
it builds, and `5a-iv-c-2` IS THE NEXT TASK.** JDK 17, the SDK, `adb`, build-tools 36.1.0,
platform 36, and an **`arm64-v8a`** AVD. `docs/checks/5a-iv-c-toolchain.sh` reads **14/14**,
and the last three of those are a **booted** emulator: `adb` sees it, it reaches
`sys.boot_completed=1`, and **its ABI is read off the running device with `getprop`** rather
than inferred from the name of the image that was downloaded.
⚠️⚠️ **AND THE CHECK'S FIRST SPELLING WAS A SEVENTH SHAPE OF MISLEADING GREEN, CAUGHT BY ITS
OWN FALSIFICATION.** It asserted that a shell nobody configured can find the SDK — and it
asked by spawning `zsh -c` and printing `$ANDROID_HOME`. **A child shell inherits its
parent's environment**, so it printed the value the script already had and never consulted a
startup file at all. Fixture `T1` hid every startup file behind an empty `ZDOTDIR` and **the
assertion stayed green.** ✅ Fixed with `env -u`, which makes the startup file the only way
the variables can come back. ⚠️ **It would have passed for exactly one person — whoever was
still in the shell that installed the SDK** — and reported nothing for a fresh terminal
tomorrow. Same family as `#75`'s simulator build: *an assertion that passes while measuring
something adjacent to its own claim.*
⚠️ **A second finding, and it is why the exports are in `~/.zshenv` and not `~/.zshrc`**,
which is what Android's own documentation says. `zsh` sources `.zshrc` for **interactive**
shells; `-l` makes a shell a *login* shell, which is a different thing. The first
arrangement was correct, the first test of it read `zsh -lc`, and **a correct machine
reported nothing installed.** ✅ **The stricter home was chosen over the looser test**:
`.zshenv` is read by every `zsh`, including the plain `zsh -c` that a build tool or an agent
session spawns — which is the case that actually matters and the one `.zshrc` would have
missed silently.
⚠️ **Nothing in this repository changed except `docs/`** — the toolchain lives on the
machine, and `docs/checks/5a-iv-c-toolchain.sh` is the only record of it. ⚠️ **It cannot run
in CI** (no SDK on a runner, and booting an emulator needs virtualisation a runner does not
offer), so it has `5a-iv-a-preflight.sh`'s standing: not evidence in the sense of §9, but
the local instrument for a surface with no file in this repository.

⚠️⚠️ **`5a-iv-c` WAS RE-SIZED 2026-09-13 BEFORE IT WAS TAKEN — IT IS AN `L`, NOT THE `S/M`
THIS FILE CARRIED, AND IT SPLITS THREE WAYS. `5a-iv-c-1` IS THE NEXT TASK.**
⚠️ **The re-size was a MEASUREMENT of this Mac, not a guess**, because that is the one
lesson `5a-iv-a` cost an hour to learn: *"nothing else blocks it"* had been written about
the Mac without looking at it. Looked at, on 2026-09-13: **no Android Studio, no SDK, no
`adb`, and — the one nobody had named — NO JDK OF ANY KIND.** `java -version` reports
*"Unable to locate a Java Runtime."* ⚠️ **`@react-native/gradle-plugin` pins AGP `8.12.0`
and Kotlin `2.1.20`, so the floor is JDK 17**, and that is a fourth download nobody had
counted. Roughly **4–5 GB across five independent installers**, then a cold Gradle build,
is not an `S/M`.
✅ **The three pieces, and the seam is what each one can be WRONG about:**
**`5a-iv-c-1`** the toolchain — JDK, SDK, `adb`, an emulator that boots, and nothing from
this repository involved; **`5a-iv-c-2`** the Release rehearsal — `expo prebuild`, an APK,
installed and launched, which is register #13's emulator smoke test and the first thing
that can be wrong about *the app*; **`5a-iv-c-3`** the borrowed evening on C1.1's real
Oppo and Samsung, which is the only piece the scheduling gate binds.
⚠️⚠️ **`5a-iv-c-2` IS WHERE A REAL FINDING IS LIKELY, AND IT IS `R10` AGAIN.** `R10` says
`Intl` in the client is an allow-list of *"what has been measured on a phone"* — and every
word of that measurement was taken on **iOS Hermes**, on 2026-09-13. Android Hermes is a
**different ECMA-402 backing implementation**, so `format()` working on an iPhone is not
evidence about an Oppo. **The rule is right and its evidence covers one of the two
runtimes the pilot ships to.** `5a-iv-c-2` is the first instrument that can say.

✅ **`5a-iv-a`'s argument is why the toolchain half runs ahead of the evening at all**: its
Mac half *was* prepared in advance and the evening still lost an hour to three things
nobody had measured. Preparing it did not make the preparation sufficient — it made the
hour visible.

✅✅ **TWO RULINGS FROM THE OWNER, 2026-09-13 — *"keep it in docs/, and do the second
pass after 5b."*** Both close questions `5a-iv-b` raised the day before.
✅ **`docs/CONVENTIONS.md` stays where it is** — the path is settled and may be cited.
✅✅ **AND THE FOURTH ROW OF THE PLAN-VS-ADR TABLE IS CLOSED.** `src/api/` and
`src/ui/` **stay spread across `5d`–`5h`**; §3's reason for wanting them in `5a` —
*"step 6's four screens are supposed to arrive to a pattern"* — is honoured by a new
**`5b.5`**, the second pass of `CONVENTIONS.md`, run once `5b` has produced a real
pattern rather than ten primitives guessed at against undrawn screens. ⚠️ **`5b.5` is
load-bearing, not a tidy-up: skip it and §3's argument is what was dropped.**
⚠️ **The page now says so itself, and `conventions-gate.sh` grew a tenth assertion
group that fails if the page and the `5b.5` row stop agreeing** — a deferral is the
most perishable kind of claim there is, and this repository has five stale copies in
its history to prove it. `docs/PLAN.md` joined `app.yml`'s `paths:` filter for the
same reason.
⚠️ **ONE ADR EDIT IS NOW OWED AND IT IS SMALL**: ADR-035 §3 still lists `src/api/` and
`src/ui/` under step `5a` in its own words. **The ruling above supersedes it**, but a
session obeying *"the ADR wins"* literally would re-open it — see the READ FIRST
section. ⚠️⚠️ **Decision register #9 is still unamended and still blocks `4.6a`.**

✅✅ **`5a-iv-b` IS DONE AS OF 2026-09-12 — `docs/CONVENTIONS.md`, the page §3 gates
hiring on.** Nine rules read out of `app/src` rather than proposed for it; seven of
them enforced by `docs/checks/conventions-gate.sh`, now a fourth step in `app.yml`,
with the page and the script **asserted to agree about which two a machine cannot
read.** ⚠️ **Taken out of order** — `5a-iv-a` is still open and unchanged below; it is
blocked on an Apple ID only the owner can type, and `5a-iv-b` was put in this split
precisely as the piece that needs no hardware.
⚠️⚠️ **ITS FINDING IS THAT `README.md` HAS SAID *"THE CLIENT DOES NOT EXIST YET"* SINCE
KICK-OFF — the fifth instance in three days of a claim only being as true as the copy
the reader opens, and the first one on the FIRST FILE ANYBODY OPENS.** `#76` corrected
`HANDBOOK.md` the day before and did not look at the README. ✅ Both it and
`app/README.md` are corrected, in `#76`'s shape: they say where the build is and
deliberately defer *which piece is next* to this file.
⚠️ **A second finding: `R1` was false the moment it was written.** Five test files
still imported `../src/…` while six written since `5a-iii` used `@/` — the same module
imported both ways in two suites. Three days of drift, invisible to reading, found by
trying to state the rule. ✅ Normalised; 132 assertions still green.
⚠️⚠️ **And a trap inside the check itself: a guard that greps for a banned token reads
the COMMENT WARNING ABOUT IT first**, so the first spelling was red on the files that
got it right — which would have made deleting the explanation the cheapest way to
green. ✅ Comments are stripped, and **`F13` is the only falsification in this
repository whose expected result is green.**

**STEPS 1, 2, 3, 4 AND 4.5 ARE ALL CLOSED. ⚠️⚠️ THE DATABASE IS *NOT* COMPLETE — THE
UI/UX GRILL-ME OF 2026-09-07 REOPENED IT, AND THE THREE OWED MIGRATIONS ARE THE NEW
STEP 4.6.** Step 5 — the client — is sized `XL` and split into `5a`–`5h`, and
**`5a` WAS ITSELF SIZED `L` AND SPLIT FOUR WAYS ON 2026-09-07, BEFORE A LINE OF APP CODE
WAS WRITTEN.** ⚠️⚠️ ✅✅ **`5a-i` AND `5a-ii` ARE BOTH DONE AS OF 2026-09-07.** `5a-i` was
the first app code in this repository and the first CI run that ever looked at it —
`app/` is an Expo SDK 57 project registered as `@tienda/app`, the fourth workspace
entry, and `.github/workflows/app.yml` is the third workflow; its finding was that a
stale `node_modules` makes the workspace-wiring assertion vacuous, the fifth shape of
misleading green here and the first one that only `npm ci` can see.
✅✅ **`5a-ii` SHIPPED THE DENSITY SCALE (C3.18), THE MONEY FORMATTER (C12.2) AND THE
ICONS-PLUS-WORDS TAB SHELL (C12.1)** — 48 assertions over four suites, up from three,
so `app.yml`'s test half has now earned its place.
⚠️⚠️ **ITS FINDING IS THAT C12.1's OTHER HALF IS THE FIRST DELIVERABLE HERE THAT NO
CHECK CAN SEE**: falsification F14 set `tabBarShowLabel: false` — icons alone, the one
thing C12.1 forbids — and nothing turned red, because §2.10/§2.11 (amended by the owner
on 2026-09-07 to allow a test that **pins a value a customer sees or the ledger
stores**) still refuse suites over rendering and navigation, and *"the label is drawn"*
is a rendering claim. **That makes `5a-iv`, the device run, the only instrument that
will ever look at it.** ⚠️ A second finding, F9, is a **sixth** shape of misleading
green: an assertion that ran, passed, and could not distinguish the defect its own
comment named. Both are written up under `5a-ii` below.
✅ **`5a-iv` WAS RE-SIZED 2026-09-11 — it is an `L`, not the `S/M` this file carried,
and it splits four ways.** ~~`5a-iv-a` is the next task~~ — **taken and closed 2026-09-13;
see the entry at the top of this section.**
⚠️⚠️ **The finding: TWO INDEPENDENT SEVEN-DAY CLOCKS** — Google's test-user token expiry
and a free Apple ID's 7-day provisioning profile — **and C1.4's reading is at day eight.**
⚠️ **CORRECTED 2026-09-12: the clocks are real and the conclusion drawn from them was
not.** The original call moved the reading to Android; that gated it on hardware the plan
never records the owner owning, and it treated a ceiling as fatal without measuring it.
✅ **The reading stays on the owner's iPhone 15, and `5a-iv-a`'s FIRST STEP is a
five-minute pre-check** — sign in, re-deploy, open, *still signed in?* — because an
expired profile stops the app launching and does not touch the SQLite file the session
lives in. **That one answer decides whether the $99 is needed at all.**
✅✅ **THE MAC HALF OF `5a-iv-a` WAS PREPARED 2026-09-12, AND IT FOUND THAT THE GATE CELL
WAS FALSE IN FOUR MEASURED WAYS.** *"Nothing else blocks it"* had been written without
looking at the machine: `xcode-select` pointed at the Command Line Tools while Xcode 26.6
sat unused in `/Applications`, CocoaPods was absent, no native project had ever been
generated, and the keychain held **zero code-signing identities**. Three were cleared the
same day, and the app's native side compiled for the first time — `** BUILD SUCCEEDED **`,
with a 3.4 MB embedded bundle. ⚠️ **The fourth is the owner's and cannot be delegated: an
Apple ID typed into Xcode.** ⚠️ **Where exactly the seven-day clock starts was NOT
measured** — a free personal team's provisioning profile is created when Xcode signs a
build, and its certificate when the Apple ID is added, and this session held neither. It
does not change the instruction, because both happen minutes apart in one sitting, which
is where the run sheet puts the pre-check.
⚠️⚠️ **AND THE PREPARATION FOUND THE ONE THAT WOULD HAVE VOIDED THE EIGHT-DAY READING
WITHOUT SAYING SO: `npx expo run:ios` DEFAULTS TO `Debug`, AND A DEBUG BUILD CONTAINS NO
JAVASCRIPT** — `AppDelegate.swift` asks Metro for it, so the app **cannot launch with the
Mac out of the room**. On day 8 that returns a red screen about a development server, not
a reading. ✅ **`--configuration Release` is mandatory**, and
`docs/checks/5a-iv-a-preflight.sh` (14 assertions, 13 green, 7 falsifications) pins the
*reason* rather than the command. ✅ **`docs/checks/5a-iv-a-runsheet.md` is the sitting
itself, as a form with boxes** — four of the six readings are opinions, and an opinion not
written down at the time becomes a memory of one.
✅✅ **`5a-iii-b` IS DONE AS OF 2026-09-11 — Google and C1.3's last screen.** 132 assertions, 15 falsifications, all red,
plus three over the gate. ✅ **THE GATE IS CLOSED AS OF 2026-09-12 — the owner added
`mx.bserafin.wera://**` to the Supabase dashboard's Redirect URLs.** ⚠️⚠️ **AND NO CHECK
IN THIS REPOSITORY CAN CONFIRM IT, WHICH IS WHY IT IS WRITTEN HERE** — an assertion over
it was written, measured and deleted, because `/auth/v1/authorize` returns the same 302
for the right redirect and for `evil.example.com`, and `/auth/v1/settings` exposes
thirty-two fields of which none is the allow-list. ✅ **The gate script was re-run after
the change and still read 15/15 — it did not notice, which is the proof the deleted
assertion deserved deleting.** ⚠️ **So this row is a REPORT, not a measurement**, and
`5a-iv-a` is the first thing that can actually tell. ⚠️ **Site URL is `http://localhost:3000`
and stays there** — the owner has no domain yet, nothing in this flow reads it, and a
failed allow-list match therefore lands on a visible "cannot connect" page in the
sign-in sheet rather than a plausible one. ⚠️⚠️ **The other one that matters
is `flowType: 'pkce'`** — supabase-js defaults to `implicit`, which would have sent a
non-expiring refresh token back through a custom URL scheme any app on the phone may
claim. ✅ **The gate now also watches the GOOGLE CLOUD console**, the half it was never
looking at.
✅✅ **`5a-iii-a` IS DONE AS OF 2026-09-11 — the app now has a session.** 90 assertions, 15 falsifications,
all red. ⚠️⚠️ **The one that matters is `app/src/lib/env.ts`: a `service_role` key in the
client BYPASSES RLS, and the wrong key does not fail — it works, unfiltered.** Both
spellings are refused, including the legacy JWT whose text contains no such word and
which a grep therefore cannot see. ✅ **F9's defect is now impossible rather than
caught**: `errors.ts` maps codes to KEYS of `ES`, so a sentence typed in place is
`TS2322`. ⚠️⚠️ **AND `5a-iv` NEEDS RE-SIZING BEFORE IT IS TAKEN** — written up as a
`S/M` device build, it is now the **sole instrument for SIX deliverables across four
tasks** (✅ **re-sized to an `L` and split four ways on 2026-09-11 — see the section
above**) — C12.1 and C3.18's numbers from `5a-ii`, the guard's redirect and C1.4's
persistence from `5a-iii-a`, and the Supabase redirect allow-list plus Google's
*"unverified app"* interstitial from `5a-iii-b`.
✅✅ **`5a-iii`'s GATE IS FULLY CLEARED AS OF 2026-09-11, AND `5a-iii` WAS THEN SIZED AN
`L` AND SPLIT IN TWO — ~~`5a-iii-a` IS THE NEXT TASK~~ (taken and closed the same
day; see the entry above).** ⚠️⚠️ **The shape of the step
changed the same day: FACEBOOK IS DEFERRED TO THE NEW `5i`, and the v1 pilot signs in
with Google or email.** ✅ **The gate was closed by MEASUREMENT, not by report** — a live
`GET /auth/v1/settings` against the project, which found two things a file could not:
Google was **not** enabled on the Supabase side after the Google console was built, and
email confirmation was still **on**. Both now verified from the endpoint. ✅ The consent
screen stays in *Testing* with the pilot accounts as test users, which is sufficient to
sign in and is **not** what publishing gates. ✅ **The app is named `Wera`** (the repo and
the `@tienda/*` packages deliberately stay `tienda` — internal names no user sees), and
the bundle id is **`mx.bserafin.wera`**. ⚠️ **The bundle id is provisional and its real
deadline is earlier than submission**: changing it makes the app a *different app* to the
OS, so a phone holding `5c`'s outbox or a session loses them. Free today; not free once a
pilot shop is using it. ⚠️ **`5i`'s real cost is not code — it is ONE PUBLIC `aviso de privacidad`
PAGE**, which Facebook Live mode, Google publishing and LFPDPPP all require, is owed to
two consoles and one law, and until 2026-09-11 was written down in none of them. It
blocks **pilot day**, not `5a-iii`. ⚠️ **The finding of that session is that
`docs/checks/5a-split-coverage.sh` stayed GREEN across the edit** — `C1.4` names three
providers and the check counted it as one atom, so a deliverable one third of which had
changed tasks still read 10/10. **Four ADR conflicts are recorded in total; two remain
open**, both `4.6a`'s.
Read *THE PLAN NOW DISAGREES WITH ADR-035* under step 4.6 first. The log below
is newest-first; what follows this paragraph is the history that got here, kept
because every entry names a decision someone may need to overturn.

**STEP 1 IS CLOSED. STEP 2 — the three Insight queries, the design gate — IS CLOSED.
STEP 3 — THE TEST SUITES — IS CLOSED AS OF 2026-09-02. STEP 4, THE WRITE SURFACE OF
§2.6, WAS SPLIT INTO 4a–4f ON 2026-09-03, BEFORE ANY OF IT WAS WRITTEN, AND CLOSED
2026-09-05.
**4a — RECEIPT COMPLETENESS, `0015` — IS DONE AS OF 2026-09-03. `4b`, `record_sale`,
WAS SIZED AGAINST §2.6 THE SAME DAY AND SPLIT INTO 4b-i / 4b-ii**, on nearly the seam
this file named in advance — the function is WHOLE in `0016` and 4b-ii is evidence, not
schema. ⚠️ **The tidier seam — document in one migration, ledger in the next — was
REFUSED**, because it puts a `record_sale` on `main` that sells goods and moves no
stock, and §2.4's invariant cannot see that. Reasoning under *Settled in sizing 4b*.
✅ **4b-i — `record_sale`, `0016` — IS DONE AS OF 2026-09-03.** 63 behavioural
checks, eleven falsifications, and §2.10's location-isolation
WRITE half is closed — the first row of §2.10 that step 3 could not write and step 4
now has. ⚠️⚠️ **TWO OF THE ELEVEN FALSIFICATIONS FOUND DEFECTS IN THE SUITE RATHER
THAN IN THE FUNCTION**, and the second is the more serious: `where not passed` in the
report block of EVERY behavioural suite does not count a check whose condition was
NULL, so a file could print a `FAIL` row and exit 0 on *"all N checks passed"*. That is
the THIRD way a failing suite exits 0 in this repository, after 3.3's disarmed pgTAP
exception and 3.6a's empty Vitest workspace. Closed in all six suites on the same
commit. ⚠️ **The first is why: a cashier writes a ledger they CANNOT READ** —
`stock_movement_select` is gated on manager — so two checks written inside
`set local role authenticated` were claims about visibility, not about writes.
⚠️⚠️ **ONE DECISION IS CHEAP NOW AND DEAR LATER AND NEEDS THE OWNER: `TD001`**, a new
application SQLSTATE for §2.6's *"same id, different lines"*. Nothing consumes it yet;
the moment a client branches on it, changing it costs a coordinated release. Findings
below.
✅ **4d IS DONE — BOTH HALVES — AS OF 2026-09-04.** `0018` `record_purchase` (82
checks, ten falsifications) and `0019` `record_waste` (67 checks, ten
falsifications). **Four of step 4's six functions are now applied.**
⚠️⚠️ **`4e` WAS SIZED AGAINST §2.6 ON 2026-09-04 AND SPLIT INTO `4e-i`
(`record_transfer`, `0020`) AND `4e-ii` (`void_transaction`, `0021`), BEFORE ANY OF IT
WAS WRITTEN.** It is an `L`, not the `M` the step-4 table estimated, and the seam is
4d's — two whole functions cannot share one unapplied migration across two sessions.
**That cost a SECOND renumbering: 4f to `0022`, the failure path to `0023`**, free
today and fixed the moment `0020` is green. ⚠️ **4e reserves exactly two numbers and no
more**: if `void_transaction` overflows one session the overflow takes 4b-ii's
test-breadth seam and ships no migration, decided now so a third renumbering never
arises. Reasoning and the before/after table under *Settled in sizing 4e*.
⚠️⚠️ **ONE DECISION WAS MADE ON THE OWNER'S BEHALF IN THE SIZING: the transfer's
idempotency hash is RECOMPUTED from the movements, not stored.** A transfer has no
document table (§2.4, deliberately), so there is no header to carry `payload_hash` —
and the cheap answer, matching on `transfer_group_id` alone, cannot raise `TD001` and
would make the transfer the one RPC whose idempotency contract is weaker than the other
three's. Reasoning under *Decided in sizing 4e*.
✅ **4e-i — `record_transfer`, `0020` — IS DONE AS OF 2026-09-04 AND MERGED (#47) 2026-09-05, AND `4e-ii`
(`void_transaction`, `0021`) IS THE NEXT TASK.** 76 behavioural checks and TWELVE
falsifications; **five of step 4's six functions are now applied.**
⚠️⚠️ **ITS HEADLINE FINDING IS A HOLE IN THE SUITE, NOT IN THE FUNCTION: F8 pointed the
enforcement block at the DESTINATION'S shelf instead of the origin's and NOT ONE of 74
checks went red.** Every enforced case in the file was short at BOTH stores, so the two
readings agreed — and a destination is EXPECTED to be empty, so that error would have
refused every FIRST shipment to a new store. Checks 6.7 and 6.8 close it and F8 now
kills the file. ⚠️⚠️ **AND A SECOND OWED ROW THAT DID NOT EXIST BEFORE THIS TASK:
§2.6's third idempotency row rests ENTIRELY on an advisory lock here**, because
`transfer_group_id` is a plain column that cannot be unique — and **F9 deleted that lock
and turned NOTHING red**. A concurrently re-sent transfer is unproved on `main` today;
`supabase/vitest/test/idempotency.test.ts` is the home for it and **the owner's call is
whose task it belongs to**. ⚠️ **ONE DECISION IS CHEAP NOW AND DEAR LATER AND NEEDS THE
OWNER: the default denomination is `sell_unit_code`**, and 4d-ii's direction rule did
not decide it — a transfer moves stock BOTH ways, so the rule is silent for the first
time. F5 is what getting it wrong looks like: ten times the stock, applying clean.
Findings below.

✅✅ **4e-ii-a — `void_transaction`, `0021` — IS DONE AS OF 2026-09-04, AND WITH IT
ALL SIX OF STEP 4's FUNCTIONS ARE APPLIED.** 64 behavioural checks and SIXTEEN
falsifications; the gate now runs **eleven suites and 637 checks** plus 29
two-connection assertions. **`4e-ii-b` (test breadth, NO migration) IS THE NEXT
TASK**, and after it only `4f` (`adjust_stock`, `0022`) remains in step 4.
⚠️⚠️ **F2 IS THE HEADLINE AND IT IS A CLEAN ONE: forcing the window basis back to
`occurred_at` — the exact rule the owner's amendment replaced — turns check 7.2 RED
AND NOTHING ELSE.** The amendment is the only reading the suite admits.
⚠️⚠️ **F12 FOUND A REAL HOLE IN THE SUITE: the location wall is written out THREE
TIMES, once per document kind, and section 2 watched only the `purchase` copy** —
deleting the scoping from the `sale` or `waste` lookup turned NOTHING red until
2.4b and 2.4c were written. The same shape as 4e-i's F8: a branch nobody looked at.
✅⚠️ **THE QUESTION F6 RAISED IS ALREADY CLOSED — THE OWNER SETTLED IT THE SAME DAY:
A REPLAYED WRITE IS EXEMPT FROM THE OFFLINE BASIS**, so a replayed sale never carries a
fresh fifteen minutes of staff self-service void; its window reads `occurred_at`.
⚠️ **Decided on a PRINCIPLE the owner gave rather than case by case** — *"whatever
implies less responsibility to the owner or personnel, if it can be addressed purely on
our side"* — and the exemption is the side that adds NO step for anyone: the only person
realistically standing over a freshly replayed sale is the manager or owner who just
replayed it, and they are unfenced anyway. **ADR-035 §2.6 was amended a second time** to
carry it. ⚠️⚠️ **STEP 4.5 OWES A MARKER, NOT JUST A CHECK** — nothing distinguishes a
replayed document today, so `0021` cannot enforce this and does not pretend to.
⚠️⚠️ **F6 — the basis forced to `recorded_at` for EVERY write —
turned nothing red, AND NOTHING IN THE DATABASE CAN TURN RED FOR IT TODAY.** §2.6
overrides `occurred_at` with now() online, so no online document exists where the two
differ; **the first that will is a REPLAYED one**, and `replay_failed_write` ships in
step 4.5. Half of `0021`'s `case` is unfalsifiable until then, and **4.5 is where the
check belongs** — it is NOT one of §2.10's nine.
⚠️⚠️ **A SIXTH SHAPE OF MISLEADING GREEN, FIXED IN `_cleanup.sql` RATHER THAN IN ONE
SUITE**: a suite that ABORTS never reaches its own `drop function`, so its helper
survives into the NEXT suite of the same CI job and every one after it dies on
"function already exists" instead of on its own defect. Five falsifications in a row
reported the harness error rather than the defect they injected before this was found.
`_cleanup.sql`'s own header had predicted exactly this gap and asked for the fix.

✅✅✅ **4.5c-ii — `replay_failed_write`, `0026` — IS DONE AS OF 2026-09-05, AND
WITH IT STEP 4.5 IS CLOSED, THE DATABASE BUILD IS COMPLETE, AND ALL NINE OF
§2.10's ROWS ARE WRITTEN.** 86 behavioural checks and TWENTY-FOUR falsifications;
the gate now runs **sixteen suites and 1,080 checks**, 7 pgTAP files, 8 seed-check
files and 29 two-connection assertions. **ADR-035 §3's *"do not build screens
before this passes"* is satisfied as of this commit — step 5 is the client, and
steps 5–7 ship no migration at all.**
⚠️⚠️ **THE HEADLINE IS THAT §2.6 NAMES THE WRONG INSTRUMENT AND `0004` NAMES THE
RIGHT ONE.** §2.6 routes the downgrade through `adjust_stock_delta`, so undoing it
reads as the same call with the sign flipped — and that call's positive branch
**opens a ZERO-COST LOT** for anything it cannot repay to a negative lot. A
downgrade that took a lot from 10 to 7 drove nothing negative, so the "obvious"
compensation invents a phantom lot at 100% margin and leaves it standing: the
shelf right, the cost history fiction, which is §2.6's complaint about the
downgrade reintroduced by the cure. The compensation is instead a **reversal
movement per downgrade movement** — `0004`'s `reversal_of_movement_id`, whose own
comment names `replay_failed_write` while explaining why it exists. **F2 turns
eight red and every balance check in the file still passes.**
⚠️⚠️ **AND §2.6's "CLAMPED AT CAPTURE" IS NOT TRUE OF THE APPLIED TABLE.**
`failed_write` has no `occurred_at` column — it stores the client's raw payload,
which `record_failed_write` never validates — so a till whose clock says **2099**
would have replayed a sale dated 2099, a figure no ordinary path in this database
can write. `0026` recomputes the timestamp the original call WOULD have written,
evaluated at `failed_at` rather than `now()`: online → `failed_at`, offline →
clamped to `[failed_at − 72h, failed_at]`. Still the exemption — nothing moves to
the moment of recovery — but no longer a hole.
✅ **THE ACCESS DECISION IS CLOSED BY THE OWNER, 2026-09-05, IN THE SESSION THAT
RAISED IT: REPLAY IS FENCED AT `owner`, AND IT STAYS THERE.** Tighter than the
marker's `manager` (`0025`), and the reason is `0024` decision 8: §2.6's replayer
*"has already reviewed the dead-letter row"*, and only an owner may read one. The
loosening path is recorded rather than taken — **it would be TWO changes, the
fence AND `failed_write`'s SELECT policy**, because a manager who can replay but
not read is pressing a button on a row they cannot see.
⚠️✅ **AND A GAP THAT IS NOT SCHEMA — §2.8 LANDS DEAD LETTERS WITH THE VENDOR AND
NO VENDOR CAN REACH THEM — CLOSED BY THE OWNER THE SAME DAY, BY BUILDING NOTHING.**
Every function on this surface reads `auth.uid()` and a `service_role` process has
none, so the failure path as built is triggerable only from inside the shop. **The
fix proposed was an owner-only recovery screen; the owner REFUSED it and the reason
is who the users are** — small shopkeepers who do not do book-keeping and should
never be handed a list of failed writes to reason about. **A dead letter is
recovered BY US, BY HAND, in one call, and the shop never learns it happened.**
§2.10's nightly check prices the pile for free, so the volume decides whether this
ever reopens — and if it turns out to be routine, that is a bug upstream rather
than a case for tooling. ⚠️⚠️ **THE FRAMING BINDS STEPS 5–7 AND MATTERS MORE THERE
THAN HERE**: do not surface internal state to a shopkeeper, prefer a default over a
setting, and when something rare goes wrong the answer is usually that we handle it
rather than that we build them a control for it. Written out under *the vendor
cannot reach the pile*.
⚠️ **THREE FALSIFICATIONS WERE GREEN AND TWO WERE HOLES THIS SUITE COULD CLOSE** —
including `recorded_offline => true`, `0025`'s explicitly refused shortcut, which
silently disables the availability check that is the only thing able to see the
compensate-then-re-run order at all.

✅✅ **AND THE LAST UNWATCHED GUARD IN THE BACK END IS CLOSED, 2026-09-05:
`supabase/vitest/test/transfer-resend-race.test.ts`.** Owed since 4e-i and
unassigned until the owner said to decide it and build it. `record_transfer` is the
one function on the write surface with **no primary key to collide on** — §2.4
gives a transfer no document — so its idempotency rests entirely on an advisory
lock, and 4e-i's F9 deleted that lock and turned **none** of `0020`'s 76 checks
red. Three races, twelve assertions, on the two-connection harness. ⚠️⚠️ **F9 NOW
TURNS SIX RED**, and the numbers say the harm plainly: four movements instead of
two, **eight units gone instead of four**, `already_recorded: false`, and a second
DIFFERENT van accepted with no `TD001`. ⚠️ **The anti-vacuity guard stays GREEN
under that mutation and the file says so** — without the advisory lock the second
session still blocks, one statement later, on the allocator's row lock, so
`pg_blocking_pids` proves the race and only the COUNTS prove the lock. ⚠️⚠️ **And
§2.4's invariant stays green too, deliberately asserted and labelled**: a van that
shipped twice is an internally consistent ledger, which is why the nightly check
can never see this and why it needed two connections.

**The gate now runs 16 psql suites and 1,080 checks, 7 pgTAP files, 8 seed-check
files and 41 two-connection assertions.**

✅✅ **THE UI/UX GRILL-ME HAPPENED 2026-09-07 AND AREAS 3 AND 8 — THE TWO THAT COULD
SINK THE PILOT — ARE ANSWERED. STEP 5 IS SIZED AT `XL` AND SPLIT INTO `5a`–`5f`
BEHIND TWO GATES; `5a` (the Expo project, auth, tenancy, and the two density modes)
IS THE NEXT TASK.** Thirty-two constraints written up under *Step 5 — the client*,
each traced to the question it came from. ⚠️ **TEN OF THE TWELVE AREAS WERE NOT
ASKED**, and two of them are load-bearing: **area 5 (finishing a sale) blocks the
back half of `5f`**, and **area 10 (offline) is not in the split at all** — the
failure path `0024`–`0026` is built and nothing consumes it.
⚠️⚠️ **THE HEADLINE FINDING IS NOT A SCREEN, IT IS A REPORT THAT DOES NOT EXIST:
`product_margin_daily` (`0009`) DOES NOT COMPUTE THE MARGIN THE OWNER DESCRIBED.**
A pollería buys `Pollo entero` and sells `Pechuga`, and `0009` is COGS-from-the-lot
-consumed — so the pieces sell against a zero-cost shortfall lot at **100 % margin**
while the whole bird's cost **never enters COGS at all**, and rolling up by family
does not rescue it. What was asked for is purchases-in against sales-out per family.
**That is a view, so it is a migration** — the first thing since 2026-09-05 that
would reopen a schema this file has been calling complete.
✅ **AND THE THING THAT MADE THE POLLERÍA REPRESENTABLE AT ALL WAS ALREADY BUILT:
`allocate_fefo` allocates a shortfall rather than raising (`0005:220`)**, so selling
a piece that was never purchased opens a cost-0 lot instead of failing at the
counter. **The despiece needs no new operation.** ⚠️ Its price is that enforcement
must stay off forever in the pilot (C8.8), and `price_unit_code`,
`purchase_unit_code` and `pack_size` are now settled as **one consumer, none and
none** respectively.
⚠️ **ONE DECISION WAS TAKEN ON THE OWNER'S BEHALF — the missing/zero-price
highlight** (amber on the row, count badge on the sticky `Total`, slide blocked, no
modal). Client-side only; it costs one screen to reverse.

⚠️⚠️ **ROUND TWO RAN THE SAME DAY, BEFORE `5a` WAS WRITTEN, AND IT REOPENED THE
SCHEMA — WHICH IS THE MAIN RESULT OF THE WHOLE GRILL-ME.** Areas **1, 10, 11 and
12**, taken because `5a` is the task **most** exposed to the unasked areas, not the
least: auth rests on 1 and 11, the offline client stub rests entirely on 10, the
density scale on 12. **Round one's sizing had claimed the opposite in as many words,
and was wrong.** ⚠️⚠️ **THREE OWED MIGRATIONS CAME OUT OF IT — the new STEP 4.6 —
and the largest is that THE MEMBERSHIP FLOW HAS NO FUNCTIONS AT ALL.**
`create_invite` and `redeem_invite` were assigned to `0005` (`0002:362`), **`0005` is
the allocation migration, and they were never written**; ADR-035 §1400 still carries
them as an unticked box while §1424 lists the flow as shipped. **The row shipped; the
flow never did**, and nothing caught it because a table with no callers breaks no
test. ⚠️ **And the owner wants the INVERSE of the flow that table models**: a joiner
enters a workspace **code** — a column `workspace` does not have — and **requests**
access, with an owner's invite counting as *a request that arrives pre-approved*.
⚠️ **The second migration is one notch and `0026` predicted it**:
`replay_failed_write` loosens from `owner` to `manager`, because the person standing
alone in the shop must be able to fix a failed write and the family member is a
manager. **The third is F2's family margin view, and it is GATED on area 9.**
⚠️ **The 50-CENTAVO CEILING was the scare and it came to nothing**: had it been a
ledger rule it would have changed ADR-035's decision register #3, `packages/money`,
the SQL half and `cases.json`. **It is DISPLAY-ONLY, on the Vender basket total
alone** — decision #3 stands untouched, and the accepted cost is that the drawer and
the ledger disagree by up to 49 centavos a sale.
⚠️ **The pilot is TWO WORKSPACES, TWO OWNERS, TWO PEOPLE EACH, ON THEIR OWN iOS *AND*
ANDROID PHONES** — so `5a` needs **no location picker**, and the Android-only
assumption is dead. **Four areas remain unasked; only 5, 6 and 9 gate anything.**

✅✅ **4.5c-i — THE REPLAY MARKER AND THE VOID EXEMPTION, `0025` — IS DONE AS OF
2026-09-05, AND `4.5c-ii` (`replay_failed_write`, `0026`) WAS THE LAST TASK IN THE
DATABASE BUILD.** 84 behavioural checks and TWENTY-ONE falsifications, twenty of
which turn something red; the gate now runs **fifteen suites and 994 checks**, 7
pgTAP files, 8 seed-check files and 29 two-connection assertions. **§2.10's
`occurred_at` half of the REPLAY row is closed, and so is the window-basis check
`0021` has owed since 4e-ii-a** — half of its `case` was unfalsifiable because
nothing distinguished a replayed document, and F11 (the exemption removed) now
turns three red.
⚠️⚠️ **THE HEADLINE FINDING IS ABOUT READING THE SCHEMA, NOT ABOUT THE FEATURE:
THE LIVE BODY OF A FUNCTION IS NOT IN THE MIGRATION THAT NAMED IT.** `0025`
carries four applied functions forward, and the first draft took `record_sale`
from `0016` — the file named after it. **Its live body is `0017`'s**, which added
the availability check, so shipping `0016`'s text would have **silently reverted
4c-i while `supabase db reset` stayed green**. Caught before it applied; the rule
is to grep every migration for a later `create or replace` before carrying a
function forward, and `record_sale` was the only one of the five that had one.
✅ **The four bodies were then patched PROGRAMMATICALLY from the applied source
and diffed** — every removed line is one of the intended edit sites and nothing
else, which is what makes a 2,700-line migration reviewable.
⚠️⚠️ **AND THE EXEMPTION IS REACHABLE ONLY AFTER A DEMOTION**, which is §2.6's own
argument arriving as a fact rather than a defect: `void_transaction` fences staff
on OWN DOCUMENT before the window, and only a manager may record a replay, so the
author of every replayed document is someone who skips the window entirely. The
suite records the replays as a manager, **demotes them to staff, and then voids**
— without which section 8 would have been a check about the wrong branch wearing
the exemption's label.
⚠️ **SIX DECISIONS WERE TAKEN ON THE OWNER'S BEHALF and the FIRST is the one most
worth overturning early: the marker is `replay_of_failed_write_id`, a FOREIGN KEY
to `failed_write`, NOT a boolean.** It is a column on three **append-only**
tables, so it is a fix-forward migration today and a coordinated release once a
client reads it. F16 is the argument: drop the FK and **six** checks go red, only
two about the constraint — the forged marker in 1.9 then LANDS and both
population checks fail behind it. **A boolean would have turned two red and never
noticed the forgery.** The other five, and the two shortcuts refused, are under
*Settled in sizing 4.5c* and in `0025`'s header.
⚠️ **F15 IS CAUGHT ONLY BY ABORT**, and it names something true of every suite in
this repository: **a suite's FIXTURE is unasserted code**. Owed row, written up.

⚠️⚠️ **4.5c WAS RE-SIZED ON 2026-09-05, BEFORE ANY OF IT WAS WRITTEN, AND IT IS AN
`L` RATHER THAN THE `M/L` THE SPLIT TABLE ESTIMATED: IT SPLITS INTO `4.5c-i` (THE
REPLAY MARKER AND THE EXEMPTION, `0025`) AND `4.5c-ii` (`replay_failed_write`,
`0026`).** The seam is **forced, not chosen**, and it took two facts read out of
applied migrations rather than assumed. **(1) `transaction_document_is_immutable()`
(`0003:45`) raises on EVERY update with no column exemption**, so a replayed
document cannot be stamped after the fact — the marker has to be written by the
INSERT, and the only things that insert a header are the three recorders.
**(2) `record_sale` (`0016:168`), `record_purchase` and `record_waste` compute
`occurred_at` in exactly two branches and NEITHER preserves a stored one** — online
overrides to `now()`, offline clamps to `[now() − 72h, now()]`. §2.6's replay
exemption requires preservation *verbatim*, so the online branch is the re-dating
harm exactly and the offline branch is the same harm with a 72-hour fuse, firing on
precisely the old dead letters nobody re-reads. ⚠️ **So the marker is not a column,
it is a third timestamp branch in three applied functions**, and
`replay_failed_write` cannot be written until they offer it. Same forced order as
4.5a → 4.5b, found the same way. ✅ **No renumbering** — `0026` is handed out at the
end and nothing is downstream — but it **renamed the pre-committed overflow seam** to
`4.5c-i-b` / `4.5c-ii-b`. ⚠️⚠️ **ONE DECISION IS CHEAP NOW AND DEAR LATER AND IT IS
THE OWNER'S: the marker's SHAPE.** Recommendation, taken so `0025` could be written:
**`replay_of_failed_write_id uuid references failed_write (id)`, not a boolean** — the
audit link §2.10 wants, unforgeable by construction, and it is a column on three
**append-only** tables, so adding the link beside a boolean later is the dear
direction. ⚠️ **Two shortcuts were considered and REFUSED** — `recorded_offline =>
true` on the replay call, and a `set local` GUC read by a `before insert` trigger —
and both are written up so they are not re-proposed. Reasoning under *Settled in
sizing 4.5c*.

✅✅ **4.5b — `failed_write` AND `record_failed_write`, `0024` — IS DONE AS OF
2026-09-05.** 79 behavioural checks and TWENTY-TWO
falsifications, **every one of which turns something red**; the gate now runs
**fourteen suites and 910 checks**, 7 pgTAP files, 8 seed-check files and 29
two-connection assertions. **§2.10's FAILURE-PATH ROW IS CLOSED** — owed since step
3, and the eighth of its nine rows to land.
⚠️⚠️ **ADR-035 §2.6 WAS AMENDED TWICE, BOTH ON THE OWNER'S EXPLICIT INSTRUCTION.**
**(1) The downgrade link is REVERSED**: `stock_movement.failed_write_id`, a real
foreign key, rather than `failed_write.adjustment_movement_id`. Singular could not
describe a downgrade — one line spanning two lots writes two movements by itself —
and the FK is the only shape that makes §2.6's *"the link is not optional"* a
CONSTRAINT rather than a sentence. **F11 (the link not passed) turns 28 checks red.**
⚠️ `0004:320`'s comment now asserts the opposite and cannot be edited; the column
comment says so. **(2) Only `sale` and `waste` are DOWNGRADED**; a rejected
`purchase` or `transfer` dead-letters and the ledger is not touched. A rejected
purchase leaves stock ON the shelf with a manager holding the delivery note, and an
auto-upgrade would open a zero-cost lot and then DOUBLE the shelf when Comprar
records it properly. Section 5 is the PAIR that proves it: same variant, same
quantity, same store — the sale downgrades and the purchase does not.
⚠️⚠️ **THREE FALSIFICATIONS WERE GREEN ON THE FIRST PASS AND ALL THREE WERE HOLES IN
THE SUITE, NOT IN THE FUNCTION** — including one where the suite's own label claimed
a guard was reachable that nothing had tested. The common shape: **a check that
watches only the OUTCOME cannot see a guard whose removal produces the same outcome
by a slower path.**
⚠️⚠️ **AND THE ISOLATION SUITES CAUGHT SOMETHING NOTHING ELSE COULD: a new tenant
table is born INVISIBLE to them.** `02` and `03` both went red naming
`failed_write` — *"every tenant table held rows in BOTH workspaces when it was
measured"* — because nothing seeds it. `01_rls_coverage` had already passed, since
its plan is computed and structural coverage arrives free. **Non-vacuity does not.**

✅✅✅ **4f MERGED (#53) 2026-09-05 AND BUILD STEP 4 IS CLOSED. STEP 4.5 — THE FAILURE
PATH — WAS SIZED AGAINST §2.6 AND §3 THE SAME DAY AND SPLIT INTO `4.5a` / `4.5b` /
`4.5c`, BEFORE ANY OF IT WAS WRITTEN.** It is an `XL`: three functions plus the first
new table in `public` since `0004`, where every one of step 4's six functions was a
one-session `M`. ✅ **AND THE SPLIT COST NO RENUMBERING — THE FIRST ONE THAT DID
NOT.** 4d and 4e each moved reserved numbers; nothing is downstream of step 4.5,
because steps 5–7 are the client and ship no migration at all. `0023`, `0024`, `0025`
were handed out at the end of the sequence and no later task moved.
✅ **4.5a — `adjust_stock_delta`, `0023` — IS DONE AS OF 2026-09-05, AND `4.5b`
(`failed_write` + `record_failed_write`, `0024`) IS THE NEXT TASK.** 81 behavioural
checks and TWENTY falsifications; the gate now runs **thirteen suites and 831
checks**, 7 pgTAP files, 8 seed-check files and 29 two-connection assertions.
⚠️⚠️ **THE HEADLINE IS AN ACCESS DECISION TAKEN ON THE OWNER'S BEHALF, AND IT IS THE
ONE MOST WORTH OVERTURNING EARLY IF IT IS WRONG: `adjust_stock_delta` IS GRANTED TO
NOBODY.** It is the only one of §2.6's ten write-surface functions that `authenticated`
cannot call. The two readings collide and there is no third — §2.7 fences stock
adjustment at **manager** and `0022` enforces that with `TD003`, so granting this
function unfenced would hand every cashier the same capability with a different sign;
but `record_failed_write` **must** work for the cashier whose sale was just rejected
(§2.6's *one deliberate exception*) and its downgrade **must** run through this
function (§2.10's review checklist names it), so a manager fence inside the body would
refuse the failure path in its ordinary case. Granting nothing satisfies both, and it
is deliberately **the cheap direction to reverse**: adding a grant later is one line,
removing one after a client ships against it is a coordinated release. **F3 — the
grant added — turns five checks red.**
⚠️⚠️ **AND 4f's `note` FINDING HAPPENED AGAIN, IN THE VERY NEXT MIGRATION: `reason`
WAS IN §2.6's SIGNATURE AND IN NO TABLE.** It cannot be `stock_movement.reason`, which
is the `movement_reason` enum and is `'adjustment'` for every row this function writes.
`0023` adds an `adjustment_reason` enum and a nullable `stock_movement.adjustment_reason`
column, fix-forward. ⚠️ **The enum ships two values and this migration writes one** —
`physical_count` exists for the day `adjust_stock` is replaced to stamp it, which
`0023` does NOT do, so `adjust_stock`'s movements carry NULL and **check 10.4 asserts
that gap rather than hiding it**.
⚠️⚠️ **ONE QUESTION IS OPEN AND IT BLOCKS NOTHING YET, BUT IT IS 4.5b's FIRST
DECISION: §2.6's `adjustment_movement_id` IS SINGULAR AND A DOWNGRADE IS NOT.**
`adjust_stock_delta` takes one `variant_id`; a rejected sale has lines, and one line
spanning two lots writes two movements on its own. The ADR's own next sentence says
the link *"is not optional… without it the downgrade and any later replay would each
remove the same units"*, so it must be complete rather than representative.
**Recommendation, cheap to overturn now: `failed_write` carries an
`adjustment_group_id`, exactly as `record_transfer` carries `transfer_group_id` for
the identical reason.** ⚠️ **That amends §2.6**, which is why it is flagged before
4.5b rather than inside it. Reasoning under *Found while sizing step 4.5*.
⚠️ **F20 REPORTED `ABORTED` RATHER THAN `RED` UNTIL A FIXTURE CHANGED**, and it is the
first live use of the distinction 4f built: a `chk_raises` whose granted side would
violate a **deferred** constraint cannot report its own failure, because the
constraint fires after the block that catches. ⚠️ **F17 — the lock deleted — turns
nothing red and cannot today**, and it is 4f's owed row rather than a new one, though
the race here is a different one: two concurrent credits repaying one debt.

✅✅✅ **4f — `adjust_stock`, `0022` — IS DONE AS OF 2026-09-05, AND WITH IT
**BUILD STEP 4 IS CLOSED**: all six functions of ADR-035 §2.6's step-4 write surface
are applied, with `0015`'s constraint under them. 82 behavioural checks and SEVENTEEN
falsifications; the gate now runs **twelve suites and 750 checks**, 7 pgTAP files, 8
seed-check files and 29 two-connection assertions. **The next task is step 4.5 —
`0023`, the failure path.**
⚠️⚠️ **THE HEADLINE IS A SCHEMA CHANGE THE ADR FORCED, AND IT IS THE ONLY STEP-4
MIGRATION THAT TOUCHES A TABLE: `note` WAS IN §2.6's SIGNATURE AND IN NO TABLE IN THIS
DATABASE.** Grepped, not assumed — four occurrences of the word across all applied
migrations, every one a comment, including `0004:332` asserting it as fact (*"An
adjustment answers to nothing but its own note"*) while writing the constraint that
depends on it. `0022` adds `stock_movement.note text` fix-forward. **A document table
was considered and REFUSED**: `stock_movement_source_agrees` requires all four document
ids NULL for reason `adjustment`, so a table would mean altering an applied constraint
to admit a fifth id, plus a table, RLS, policies and grants — where the ADR's own
constraint says an adjustment has no document.
⚠️⚠️ **A COUNT UP REPAYS NEGATIVE LOTS BEFORE IT OPENS A NEW ONE, at each lot's own
cost, and this is the decision most worth reversing early if it is wrong.** `0004:429`
names this function as how a negative balance gets RESOLVED. Without the repayment the
totals are still right and the overdrawn lot sits at -5 **forever** — `allocate_fefo()`
reads only `remaining_base > 0`, so no sale, waste or transfer ever touches it again.
F5 (repay loop deleted) turns **nine** checks red; F6 (repay at zero cost rather than
the lot's) turns **two**, and 6.3 is the only check in the file that can tell a
zero-cost repayment from a correct one.
⚠️⚠️ **TWO FALSIFICATIONS TURNED NOTHING RED ON THE FIRST 78 CHECKS AND BOTH WERE
CLOSED BY WRITING MORE FIXTURE, NOT MORE ASSERTIONS.** F17 reversed the repayment
loop's FEFO ordering: green, because every variant in the file carried exactly ONE
overdrawn lot and an order over one row is not an order. ⚠️ **Making it observable took
arranging**: whenever the balance is negative, `counted_base >= 0` forces the delta to
cover the WHOLE debt and both lots reach zero however the loop is written. The new
subject therefore holds a POSITIVE lot beside two debts, so a small count is a PARTIAL
repayment and only the first lot in the order moves. Sections 6.9–6.11, and F17 now
turns two red. 4e-ii-b's rule 5 arriving again: a per-lot claim needs a multi-lot
subject.
⚠️⚠️ **A SEVENTH SHAPE OF MISLEADING GREEN, AND IT IS THE SIXTH ONE REPEATING BECAUSE
THE FIX WAS NEVER GENERALISED.** `0022` defines `chk_json` — the same catch-and-record
mirror of `chk_raises` that 4e-ii-a added `chk_succeeds` for — and `_cleanup.sql` did
not know about it, so five falsifications in a row reported *"function chk_json already
exists"* rather than the defect they injected. **A mutation that turns nothing red and
a mutation whose suite never ran are indistinguishable from the outside**, which is why
this cost the same hour twice. Fixed in `_cleanup.sql` for `chk_json`, `_adj`, `_bal`
and the four-argument `_pl`, and the rule is now written there: **every helper a suite
creates belongs in that block on the day the suite lands**, because the suite's own
`drop` is unreachable in exactly the case that matters. ⚠️ **The falsification harness
was also fixed to report ABORTED separately from RED=0** — it had been reporting the
first as the second.
⚠️⚠️ **4b-ii's "COUNTED, NOT READ" RULE WAS BINDING ON THIS TASK AND THE FIRST DRAFT
BROKE IT IN EIGHT PLACES.** F2 (the role fence deleted) let the cashier's calls succeed,
which gave a second row to a scalar subquery reading `(select qty_base from
stock_movement where …)`, and the file died with *"more than one row returned by a
subquery"* — **RED=0, reported as "the defect turned nothing red"**. Every such read is
now `count(*) … = 1` asserting the value AND the cardinality together, and F2 turns
eight red.
⚠️ **F11 WAS RED ONLY BY ABORT, AND THAT WAS FIXED RATHER THAN RECORDED.** Copying
`0018`'s "rounds to zero" gate in makes a count of zero raise — and 6.7 was a bare
`\gset` call, so the exception escaped and the file died with no report. 6.7 now goes
through `chk_json` and asserts against the database instead of the returned jsonb; F11
turns five red. ⚠️ **The other bare `\gset` calls remain and the trade is deliberate**:
they are what lets sections 4, 5, 6 and 8 assert the RETURN SHAPE, and a defect that
makes one of them raise is still red, just not in the shape a reviewer expects.
⚠️⚠️ **F14 — THE `for update` DELETED — TURNS NOTHING RED, AND CANNOT TODAY.** 4c-i's
F6 and 4e-i's F9 in a fourth language: one connection cannot block on its own lock.
**A count racing a sale, and two managers counting one shelf, are unproved on `main`.**
This is a NEW OWED ROW and it is NOT one of §2.10's nine — see the owed-rows note.

✅✅ **4e-ii-b — TEST BREADTH OVER `void_transaction` — IS DONE AS OF 2026-09-04,
AND `4f` (`adjust_stock`, `0022`) IS THE LAST TASK IN STEP 4.** `supabase/tests/0021`
goes 64 → 95 checks and TWENTY falsifications; the gate now runs **eleven suites and
668 checks** plus 29 two-connection assertions. **No migration was written and no
defect was found in `0021`.**
⚠️⚠️ **THE HEADLINE IS A NUMBER: ELEVEN OF THE TWENTY MUTATIONS TURNED NOTHING RED
ON THE 64 CHECKS THAT STOOD BEFORE THIS TASK.** Every one of them applies cleanly,
and each is a thing `0021` does correctly that nothing was watching. The shape is
the one F12 named and did not finish — **the lookup and the inserts are written
THREE TIMES, once per document kind** — and sections 3, 4 and 5 divided the
properties BETWEEN the kinds rather than asserting each on all three.
⚠️⚠️ **AND ONE OF THE 64 COULD NOT FAIL AT ALL. 3.12 read `a > b or a >= b`, which
is `a >= b`**, so a void back-dated to the original's `occurred_at` — the exact
defect its label names — PASSED IT. That is not argued, it is measured: the mutation
was re-run against a copy of the file carrying 4e-ii-a's 3.12 and no 11.6, and all
64 checks passed. **A seventh shape of misleading green, and the first that is a
tautology rather than a harness fault.**
⚠️⚠️ **A REFUSAL CANNOT WATCH THE COLUMN IT REFUSES ON**, which is why section 12
is made entirely of GRANTS. Drop `created_by` from the waste lookup and `v_creator`
is null, `null is distinct from v_user` is still true, and 6.2 — the ownership
refusal — still passes.
⚠️⚠️ **THE MULTI-LOT VOID WAS UNWATCHED.** Every document sections 3 to 5 void drew
from exactly ONE lot, so "back to the lots it came from" and "back to A lot" are the
same sentence there: a void that returned every unit to one lot per variant leaves
3.9, 3.11, 4.3 and 5.4 green.
⚠️ **THREE OF THIS TASK'S OWN CHECKS WERE VACUOUS WHEN FIRST WRITTEN** — a tax arm
over zero-rated write-offs, an expiry arm over null dates, and an offline-flag check
whose two originals were both recorded ONLINE. All three were caught by falsification
rather than by review, and each now asserts its subject is non-trivial first.
⚠️ **ONE FIXTURE ASSUMPTION IS WORTH THE OWNER'S EYE AND IS NOT A CONTRADICTION:
the cashier records a delivery.** §2.7's capability table grants it — *"Record sale,
purchase, waste — staff ● assigned locations"* — and it is the only witness for the
purchase branch's ownership read. What the shop would do is a Comprar workflow
question, not this function's.

✅⚠️⚠️ **4e-ii IS SIZED AND UNBLOCKED, 2026-09-04, AND CLOSING IT AMENDED THE ADR.**
Sizing turned up the first plan/ADR disagreement of step 4 that was about BEHAVIOUR
rather than a migration number: this file's *done when* said *"§2.7's void window is
enforced in the body"*, and **§2.7's roles table says the window is a ROLE BOUNDARY, NOT
A DEADLINE** — staff void their OWN inside 15 minutes, **manager and owner void ANY
transaction, ANY TIME**. Written as this file had it, `0021` would have refused a
manager's void of a 21-minute-old sale and made §2.6's replayed sale permanently
uncorrectable. **The owner confirmed §2.7's reading.**
⚠️⚠️ **AND THE SECOND ANSWER CHANGED ADR-035 ITSELF, WHICH IS A FIRST FOR STEP 4.** §2.6
said the void window reads `occurred_at`; on a queued OFFLINE sale that is the client's
clamped time, so a 09:00 sale flushed at 14:00 lands five hours past its own window and
the cashier cannot fix their own slip. **The owner: *"the store is offline a lot, use
`recorded_at` for offline writes."*** §2.6 and §2.7 were **amended on the decision
maker's instruction** rather than implemented around. ⚠️ **Daily totals still read
`occurred_at`** and were deliberately left alone. ⚠️ **`TD003` for a refused void was
taken ON THE OWNER'S BEHALF** — cheap now, a coordinated release later.
⚠️ **4e-ii is ALSO an `L`** and was split into 4e-ii-a / 4e-ii-b on the seam 4e
pre-committed — **`0022` and `0023` DO NOT MOVE.** All of it under *CLOSED BY THE OWNER —
the void fence* and *Settled in sizing 4e-ii* below.

⚠️⚠️ **THE QUESTION 4c-i LEFT OPEN IS CLOSED. THE OWNER SETTLED IT 2026-09-04:
`record_waste` GETS NO AVAILABILITY CHECK AND RECORDS UNCONDITIONALLY** — the
loss already happened, and refusing a write-off because the shelf already reads
zero discards the only record that the stock ever existed. `supabase/tests/0019`
section 6 is that decision made falsifiable, and its PAIR is the argument: same
variant, same store, same quantity, enforcement ON — the SALE is refused with
`TD002` and the WRITE-OFF is recorded, so nothing but the document kind can
explain the difference.

⚠️ **READ *Found in 4d-i* BEFORE WRITING ANOTHER SUITE.** A verdict recorded
inside a transaction that ends in `rollback` VANISHES from the report rather than
failing, and 4d-i lost eighteen checks to it while reporting a clean pass. Both
4d suites now end their refusal blocks in `commit` and assert their own check
count against a literal. ⚠️⚠️ **`4d` WAS RE-SIZED
`L` AND SPLIT INTO `4d-i` (`record_purchase`, `0018`) AND `4d-ii` (`record_waste`,
`0019`) ON 2026-09-04, BEFORE ANY OF IT WAS WRITTEN** — and unlike the 4b and 4c
splits **this one moved migration numbers**: 4e to `0020`, 4f to `0021`, the failure
path to `0022`. That is free today and fixed the moment `0019` is green. Reasoning and
the full before/after table under *Settled in sizing 4d*. 4c-ii shipped no migration,
by the split:
`supabase/vitest/` goes from two suites to three and from 16 tests to 29, and
**ADR-035 §2.10's concurrency row is CLOSED** — both clauses, after 3.7a carried the
idempotency half alone since 2026-09-01. ⚠️⚠️ **ITS HEADLINE FINDING IS THAT §2.10's
CLAUSE, WORDED LITERALLY, IS NOT THE WHOLE PROPERTY.** *"Two sessions, last unit,
enforcement on → exactly one succeeds"* is ALSO satisfied by a path that refuses every
concurrent second sale whether or not the shelf could serve it — which is what `for
update **skip locked**` produces, one word from what `0017` ships and the idiom a
reviewer reaches for around a contended row. **Falsification W-F5 applies it and all
four of the last-unit race's outcome assertions stay GREEN**; what catches it is a
SECOND race with two units on the shelf, where both tills must be served. A one-race
suite would have merged it, and `0017`'s 35 single-connection checks are green under it
too. ⚠️⚠️ **AND A FIFTH SHAPE OF VACUOUS GREEN: a Vitest suite that dies in `beforeAll`
reports `numFailedTests: 0`** with the full `numTotalTests` — so two of `db.yml`'s
three guards on that step wave it through and only `if (!r.success)` catches it. Said
at that line in the workflow now. ✅ **The anti-vacuity guard was itself falsified**:
W-F4 makes the race not race and NINE of the thirteen tests stay green. **No defect was
found in `0017`** — it stands exactly as it merged, and no migration was written.
✅ **4c-i — THE AVAILABILITY CHECK, `0017` — IS DONE AS OF 2026-09-03.** 4c was sized against §2.6 and §2.10 the same day and **split into
4c-i / 4c-ii** — it is an `L`, not the `M` the step-4 table estimated, and the seam is
4b-ii's: the function is whole in `0017` and 4c-ii is §2.10's concurrency clause in a
second language. 35 behavioural checks, 9 over the seed, **eight falsifications on the
function and three on the seed check**. ⚠️⚠️ **ITS HEADLINE FINDING IS A PREDICTION
THIS FILE GOT WRONG: `0016` CHECK 6.2 DID NOT GO RED.** *Decided in 4b-ii* said that
when 4c landed "an oversale is refused and check 6.2 goes red — that is the correct
outcome and 4c-i owns the edit". It does not, and nothing was edited: 6.2 sells a
variant that never opts in, and §2.6 ships v1 with open mode always on, so `0017`
resolves enforcement to false for it and the oversale records exactly as before.
`supabase/tests/0016` is UNCHANGED by this task and still reports all 89. The
prediction assumed 4c would switch enforcement on; "built, dormant" means it does not.
⚠️⚠️ **F6 IS THE FALSIFICATION THAT MATTERS AND IT WENT NOWHERE: deleting the
enforcement `for update` turns NOT ONE of the 35 checks red.** That is the measured
case for 4c-ii rather than an argument for it — a single connection cannot see a lock,
and §2.10's concurrency row stays owed. ⚠️⚠️ **A SECOND APPLICATION SQLSTATE NEEDS THE
OWNER ALONGSIDE `TD001`: `TD002`**, *not enough stock*. Nothing consumes it yet; the
moment a till branches on it, changing it costs a coordinated release. ⚠️ **AND 4b-i's
VACUOUS-GREEN FIX HAD STOPPED AT `supabase/tests/`** — all SEVEN files in
`supabase/checks/` still carried `where not passed`, at two guard sites each. Closed in
all seven on this commit; no counts changed. Findings below.
✅ **4b-ii — THE ARITHMETIC AND ALLOCATION BREADTH OF THE SAME FUNCTION — IS DONE AS
OF 2026-09-03.** No migration, by the split: the suite goes
from 63 checks to **89**, and seven falsifications were run by hand. ✅ **IT FOUND NO
DEFECT IN `record_sale`** — `0016` stands exactly as it merged, and nothing is folded
into 4c's `create or replace`. What it found is in the SUITE and in what the suite
could not previously see: a line that spans two lots, both shortfall branches that
leave the adjustment lot alone, mixed rates in one document, and the residual identity
asserted over every line in the database rather than over one hand-checked sale.
⚠️⚠️ **CHECK 6.2 PINS BEHAVIOUR 4c IS GOING TO CHANGE ON PURPOSE, AND IT IS THE ONE
THING TO CARRY OUT OF THIS TASK**: today an oversale RECORDS and the debt shows as a
negative `batch_balance`, because §2.6's availability check is dormant until 4c. The
check asserts that, so 4c will turn it red — which is the point, and is why it is
named here rather than discovered as a broken test. ⚠️ **A fourth shape of
badly-shaped red was found too**: a bare scalar subquery check DIES on `21000` instead
of printing a FAIL row when a defect splits one line into two. Section 6 is counted
rather than read; sections 1–5 are not, and the reason is stated. Findings below.
✅ **4a shipped the rule before the functions that have to satisfy it**, which is what
the ordering argument was for: three `deferrable initially deferred` constraint
triggers, 30 behavioural checks, 10 over the seed and six falsifications run by hand.
⚠️ **AND IT IS THE FIRST TASK IN THIS BUILD THAT CHANGED FILES OUTSIDE ITS OWN** — a
fixture in `supabase/tests/0004_inventory.sql` and two lines in
`supabase/pgtap/06`, both because the new rule is real. Findings below. ✅ **The numbering is settled: the
pieces take `0015`–`0021` and the `0006` / `0007` reservation is retired** (owner,
2026-09-03), which DELETES the five-versus-six-argument `allocate_fefo` trap
`supabase/README.md` has carried since `0010` rather than documenting it a second
time. ⚠️ **"Do not build screens before this
passes" is NOT satisfied by step 3 alone** — three of ADR-035 §2.10's nine rows need
tables steps 4 and 4.5 create, and they are named under *What step 3 does NOT ship*
rather than quietly counted as done.
**Step 3 was split into 3.1 / 3.2a / 3.2b / 3.3 / 3.4 / 3.5 / 3.6 / 3.7 on 2026-08-22**,
**and 3.6 split again into 3.6a / 3.6b on 2026-09-01**, also before it was written,
before any of it was written — nine suites over two languages is the largest thing left
before the RPCs. See *Step 3* below. **3.1 — the pgTAP harness and the structural
RLS-coverage suite — is done.** ⚠️ **Three of ADR-035 §2.10's nine suites cannot be
written in step 3 at all** — failure path, replay, and the `record_sale` half of
location isolation all need tables and functions that steps 4 and 4.5 create, and §3
already files them there. Named in *What step 3 does NOT ship* so they are not lost.
**3.2a — RLS isolation on reads — is done**, and it is the first suite in this repo to
make the tenant claim by reading rows rather than catalogs: 106 tests, both directions,
every tenant table, under `set role authenticated`. ⚠️ **It writes a fixture and rolls
it back**, because `workspace_invite` is the one tenant table the seed leaves empty and
an isolation claim over zero rows is a claim about nothing. Decision below.
**3.3 — LOCATION ISOLATION ON READS — IS DONE**: 84 tests and twelve falsifications,
and it is the first suite to measure the STORE wall rather than the tenant one — both
actors inside one workspace, so the tenant wall is held open and every refusal it
measures is the store wall or it is nothing. ⚠️ **Its central finding is that the ten
location policies split 5/5, and the halves need different actors** — five are also
gated on `has_role(…, 'manager')`, so a cashier's zero there is a ROLE refusal and
proves nothing about locations, while nobody who clears that gate is location-restricted
at all. ⚠️ **The second five are observable only by CLOSING A STORE**: `my_locations()`
excludes inactive locations and the workspace predicate beside it does not, so
`is_active` is the one lever the location clause answers to and the tenant clause
ignores. Closing one store is what makes those five policies testable, and it proves the
fail-closed rule too — the stranded cashier sees nothing rather than everything.
⚠️⚠️ **3.3 ALSO FOUND A HOLE IN THE pgTAP HARNESS, AND IT WAS NEVER 3.3'S ALONE** —
`finish(exception_on_failure := true)` is DISARMED by a plan that does not match the
number of tests run, so a suite can print `not ok` and exit 0. That is the vacuous green
ADR-035 §9 refuses, it applies to 01, 02, 03 and 04 exactly as much as to 05, and it is
now closed in CI for all five. Findings below.
**3.4 — THE LEDGER INVARIANT OVER RANDOMISED SEQUENCES — IS DONE**: 99 tests and thirteen
falsifications, and it is the first suite whose subject is arithmetic rather than access —
400 generated writes on top of the seed, through the real allocators, measured after every
run and per location. ⚠️ **Its finding is a LIMIT OF §2.4 ITSELF, not of the suite**:
deleting the receipt movement from a purchase — a real defect — leaves every §2.4
assertion GREEN, because an empty lot agrees with its empty movement set. The invariant
sees a movement that was never *projected*, never one that was never *made*. ✅ **SETTLED
2026-08-26 — it becomes a deferred constraint in `0006`**, not a step-3 suite and not a
task of its own; the predicate is specified and verified under *What step 3 does NOT
ship*. ⚠️ **3.4 also found that the per-file plan guard 3.3
shipped in 05 was itself wrong** — it compared the file's own arithmetic instead of
pgTAP's number, so `plan(planned + 1)` sailed through it. Corrected, and now carried by
all six suites, which discharges 3.3's instruction about 01–04. Findings below.
**3.5 — MONEY AND UNITS — IS DONE**: 155 tests and eighteen falsifications, and it is
the first suite that is openly half specification — because rules 2–4 of ADR-035 §2.5
have no SQL implementation to test yet. The tax split is `0006`, and step 3 ships no
migration. What IS real: rule 1 as a build failure (**no float column anywhere in
`public`**, plus a scale check per money column), rule 5 over all 1 086 seeded
documents, the residual identity over all 3 448 seeded lines, and §2.10's kilogram
sentence run as ten tickets through the real `allocate_fefo()` to a balance of exactly
zero.
✅ **THE ONE DECISION IT OPENED IS ALREADY CLOSED — SETTLED BY THE OWNER 2026-08-26,
SHIPPED 2026-08-27.** 3.5 found that the seed computes a delivery line net-first with
`tax = round(net × rate)`, which §2.5 rule 4 appears to forbid, while a sale line is
gross-first with tax as the residual — and the sentence above rule 2 says supplier
invoices break tax out, so the seed was defensible. **The owner took reading 3:
direction follows the document, tax stays the residual on both.** ADR-035 §2.5 rules
2–4 are the files that moved. ⚠️ **And the wording this plan first gave that reading
was CIRCULAR** — it re-derived the forbidden `round(net × rate)` and called it a
residual; corrected below, and recorded rather than quietly fixed. ✅ **It cost
nothing: on a net-first line the two spellings are provably the same number, so all
1 048 seeded delivery lines already satisfy it** (F17). No migration, no seed change.
Six buy-side cases and two fixed tests now assert it — 07 stands at **181 tests and
twenty-five falsifications**.
⚠️⚠️ **3.5 ALSO FOUND THAT §2.5 ASKS `cases.json` FOR A HALF-CENTAVO BOUNDARY THAT
CANNOT EXIST** — `gross/1.16` never lands on one, provably and by exhaustion, so the
rule-6 tie-break is reachable only at `round(unit_gross × qty)`. That is a correction to
§2.5's description of `cases.json` and it is binding on 3.6.
⚠️ **And `round(float8)` is banker's while `round(numeric)` is half-up**, which makes
rule 1 the precondition for rule 6 rather than hygiene — with a JavaScript corollary for
3.6: `Math.round` is half-up toward +∞, and **M8, the reversal case, is the only one of
the fifteen that catches it.**
**3.7b — THE `.sh`, AND THE LAST TASK IN STEP 3 — IS DONE, AND THE DECISION WAS TO
PORT AND RETIRE**: `supabase/tests/0005_allocation_concurrency.sh` is deleted, its
claim is 7 Vitest tests in `supabase/vitest/test/allocation-race.test.ts`, and the
workspace stands at 16. **Five falsifications, all five run LOCALLY** — which is the
argument that decided it ([CI green on PR #37](https://github.com/bersermi/RetailerManagementTool/actions/runs/33672536563), read from the job log: *16
two-connection assertions*, and the 39 / 54 / 55 / 46 the retired `.sh` left behind it
unchanged): the `.sh` needed `psql`, the schema owner's machine has
none, and a suite about `allocate_fefo()` that only CI can run is a suite nobody
consults while changing `allocate_fefo()`. **Step 4 changes it next.** ✅ **The port
made one assertion STRONGER, and that was not foreseen when 3.7 was written**: the
`.sh` could see only that its second backend sat in *some* lock wait — true whether or
not the locking clause was there, which its own header admits and which let an early
draft pass green with the clause deleted. Two separate round trips let the wait be
observed **while only the allocation `select` is outstanding**, so deleting
`for update of bb` now returns an EMPTY `pg_blocking_pids()` and turns three of the
seven red (W1). ⚠️ **The `.sh`'s own discriminator is kept** — which lot session 2
ends up with — because a block observed in the right place is still not the property;
re-reading after it is. ⚠️ **It is NOT §2.10's concurrency row**, it is task 1.3b's,
and the two assert OPPOSITE outcomes: §2.10's enforcement clause refuses the loser,
the allocator makes the loser wait and take the next lot. Three files say so. ⚠️ **A
cost was taken, not avoided: 3.7a's V6 is weaker.** With two files in the workspace,
deleting one no longer trips "No test files found". Findings below.
**3.6b — THE ONE DATA FILE — IS DONE, AND §2.10's PAIRED-ARITHMETIC ROW IS NOW
TRUE**: 07 builds its case tables from `packages/money/cases.json` with
`jsonb_array_elements`, the hand-written fork 3.5 declared is deleted, and the suite
stands at **192 tests** with F19–F21 added. ✅ **The claim was proved rather than
asserted**: one value edited in the data file turns BOTH suites red, three times over.
✅ **M10 and M11 shipped on the owner's decision** (2026-09-01) and close 3.6a's two
findings — the table can now fail for a float, and rule 4 no longer rests on M9 alone.
⚠️ **`pg_read_file()` could not be used and this is the constraint to remember**: it
runs in the SERVER, and the server is a container with no view of the repository. psql
reads the file CLIENT-SIDE, relative to the working directory — which made
`packages/money/cases.json` an input to `db.yml` and its `paths:` filter a correctness
concern rather than a speed one. ⚠️ **One measurement is worth carrying forward**:
neither tax step can disagree with float arithmetic, on either side, over every value
from one centavo to $20 000 — so the multiplication is the only place ANY of the three
discriminator groups can live. Findings below.
**3.6a — `packages/money`, `cases.json` AND THE VITEST HALF — IS DONE**: 105 tests and
thirteen falsifications, and it is the first TypeScript, the first `package.json` and
the first CI workflow that is not `db.yml`. All twenty-one cases were lifted from 07
**by id**, every literal verified identical mechanically, and every expectation
re-derived in Postgres `numeric` against a fresh reset — so the data file already is
the shared truth and 3.6b is a re-point, not a re-derivation. ⚠️ **It is HALF of
§2.10's sentence and the files say so**: until 3.6b moves 07 onto the same file, the
fork 3.5 declared is still a fork and the Vitest green is not yet the paired-arithmetic
claim. ⚠️⚠️ **Its finding is a LIMIT OF `cases.json` ITSELF, the same shape as 3.4's
limit of §2.4** — no case in the table can fail for a float, because its four
boundaries are ties IEEE754 holds exactly, while 436 shop-sized lines that WOULD catch
one sit outside it. Recorded, not patched: a new case has to land in both readers on
one commit, which is 3.6b. ⚠️ **Rule 4 on the sell side rests on exactly one case
(M9)** where the seed measures it over 118 lines. ✅ **Vitest cannot go vacuously
green — but `npm run test --workspaces --if-present` can**, so the workflow names the
workspace and asserts the count. Findings below.
**3.2b was split into 3.2b-i / 3.2b-ii on 2026-08-22, and BOTH ARE NOW DONE** — 151
tests and twelve falsifications for the first, 43 tests and twelve falsifications for
the second. ⚠️ **Two of 3.2b-i's falsifications found holes in the suite rather than in
the schema**, and the finding is that **the tenant wall on writes is held by the
`_select` policies**: Postgres reads a row before it updates it, so a leak in a write
policy is invisible from across the wall. The write policies are only observable from a
staff user inside its own workspace. ⚠️ **3.2b-ii is the exception to that, and it is
the good news**: an INSERT reads no existing row, so nothing shadows the eight
`_insert` policies and a cross-tenant insert is refused *by them* — opening
`provider_insert` to `with check (true)` turns the new suite red where the same
experiment on `provider_update` left the whole of 3.2b-i green. **The writing half of
ADR-035 §2.10's second row is now complete.** Findings below. ⚠️ **§2.10's `tenant_isolation`
naming disagreement, open since 3.1, is CLOSED** — the owner took the cheap side and
ADR-035 §2.7 and §2.10 are the files that moved. No schema change.
Tasks 1.1, 1.2, 1.3a, 1.3b, 1.4, 1.5, 1.6a, 1.6b, 1.6c, 1.7 and 1.8 are all done.
**Step 2 was split into 2.1 / 2.2 / 2.3 on 2026-08-20**, before any of it was written —
one task per question, because the three read three different corners of the ledger.
**2.1 — margin by product — 2.2 — waste as a share of purchases — 2.4 — the shop
timezone — and 2.3 — velocity against a trailing average — are all done.**
**⚠️ THE GATE'S VERDICT IS A PASS, THREE OF THREE**: ADR-035 §2.9's three questions
are each answerable in one statement over the applied schema, and no schema change is
owed to any of them. See *Step 2* below. **2.2 found that the division at the end of a
waste report fails three ways and not one** — recorded, not patched, because it is a
property of the ledger rather than a defect. **The timezone finding 2.1 raised and 2.2
doubled is FIXED**: `location.timezone` is a column, all three views read it, and the
day boundary is testable for the first time.

✅ **2.3's finding is FIXED, and it needed no schema change** — `0014`, task 2.5, done
2026-08-22. The velocity spine now starts at the earlier of a pair's first sale and its
first **stock receipt**, so all 71 delivered-and-never-sold pairs are reported and the
shop can be told "*Pepino* has been on your shelf 63 days and has never once sold".
⚠️ **2.3 prescribed a new table and was wrong to**: ADR-035 §2.9 settled on 2026-08-14
that *"stock is already per location, which covers 'we don't carry that here'"*, and it
was right. **No schema change is owed anywhere in step 2.** See *Fixed in 2.5* below.

⚠️ **One adjacent fact is genuinely unrecorded and is the owner's call: DELISTING.**
"When did we start carrying this" is answerable from the ledger; "when did we decide to
stop" is an intention, and the ledger records events.
**1.6 was split into 1.6a / 1.6b / 1.6c on 2026-08-18** with the owner's approval,
before any of it was written — it was the last **L** in step 1. The nineteen tables
of ADR-035 §2.3 that step 1 owed are applied, the seed writes three months of two
shops through the real allocator, and **the §2.4 invariant is asserted in CI over
that seed** rather than only over a fixture.
**Both findings the seed turned up are now fixed.** The owner's instruction on
2026-08-19 was to fix them immediately rather than fold them into the RPC migration, and
`0010` (task 1.8, below) is that fix: the allocators take the moment an event happened
instead of the moment it was written, and purchase-price memory decides its prefill from
the data instead of from a uuid. ⚠️ **This paragraph is STEP 1 AND 2's, and it is kept
because `0010` is still the fix it describes.** Its claim was *"every finding in this
file is now closed"*, true when written on 2026-08-27 and **not a standing claim** —
findings since then are recorded per task, and the open ones are in the status log at
the top of this section.
~~**Every open decision in this file is closed again**~~ — **true on 2026-08-27, false on 2026-09-07, and ALMOST true again on 2026-09-13**: C3.18's opinion half closed that day (*"the letter sizes are big enough"*), leaving **register #9 as the single open decision in this file.** The sentence is kept only for what follows it, which is still accurate: the purchase-side rounding direction 3.5 found was settled by the owner on 2026-08-26 and shipped the next day. Two
modelling choices made while building 1.3b, and three from 1.4, are listed below and
are the owner's to confirm or overturn. A fourth from 1.4 — who gets the purchase
price prefill — was **confirmed on 2026-08-18** and is closed. All five that remain
open are function bodies or a view definition, so revising any of them is a
`create or replace` in a new migration with no data to migrate — see the corrected
deadline under *Confirmed by the owner* below.

⚠️⚠️ **THIS TABLE CARRIES NO STATUS, AND THAT IS DELIBERATE AS OF 2026-09-13.** It used
to, and it was **the sixth instance** of this repository's recurring defect — *a claim is
only as true as the copy the reader happens to open*. It said `5a … Not started` when six
of `5a`'s eight sub-tasks were done, `4.5 … UNDER WAY` when the header of this very
section said steps 1–4.5 were all closed, and **it had no row for step 4.6 at all**.
⚠️ **No check in this repository could see any of that**: `plan-handover.sh` reads rows
marked *THIS IS THE NEXT TASK*, and `5a-split-coverage.sh` reads rows whose first cell
is a bold sub-task name. A row spelled `| 5a | … | Not started |` matched neither.

✅ **So the duplicate is REMOVED rather than guarded**, which is the shape `#76` chose for
`HANDBOOK.md`. **Status lives in exactly two places**: the status log at the top of this
section, and each step's own section below. This is a map, not a status board.

| Step | What |
|------|------|
| 0 | A Postgres you can actually run |
| 1 | Migrations and seed script |
| 2 | The three Insight queries — *the design gate* |
| 3 | Test suites (pgTAP, Vitest) |
| 4 | RPCs — the write surface of §2.6 |
| 4.5 | The failure path |
| 4.6 | ⚠️ **What the UI/UX grill reopened** — **seven** migrations, `0027`–`0033`, since `4.6a` was split three ways on 2026-09-13 and `4.6c` was re-scoped and split three ways on 2026-09-14. ✅✅ **ALL SEVEN ARE APPLIED** (`0027`–`0033`) **AND STEP 4.6 IS CLOSED, 2026-09-14.** Did not exist before 2026-09-07 |
| 5a | Client foundation — **hiring gate** |
| 5b | Vender and Home |
| 5b.5 | ⚠️ `CONVENTIONS.md`, second pass — ruled by the owner 2026-09-13 |
| 5c–5i | Offline, Productos, the transaction screen, Comprar, Vender, Facebook |
| 6 | Comprar, Desperdicio, Catálogo, Proveedores |
| 7 | Números |

Steps 0–4.5 are the whole system; 5–7 are windows onto it (ADR-035 §3).

---

