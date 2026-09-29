# Build plan

The live status of the build. Update this file as steps close — it is the one
place that answers "where are we?" after a context clear.

**Architecture:** [`docs/adr/ADR-035`](adr/ADR-035-target-architecture-postgres-react-native.md).
Where this file and the ADR disagree, the ADR wins and this file is the bug.

**New here, or not a developer?** [`docs/HANDBOOK.md`](HANDBOOK.md) explains the
tooling, the working loop, and where Claude is likely to be wrong.

**Stack:** Postgres (Supabase) + React Native (Expo). Mexico-based small retailers,
MXN, IVA. Spanish module names are the domain vocabulary: Comprar (buy), Vender
(sell), Productos (catalog), Proveedores (providers), Desperdicio (waste),
Números (reports).

**Not the stack:** Power Apps Canvas + Dataverse. That era stopped 2026-08-14 and
lives in [`archive/power-platform/`](../archive/power-platform/README.md), excluded
from the knowledge graph. Nothing there describes the system being built.

---

## Position

### ⛔ DECISIONS OWED BY THE OWNER

⚠️ **THIS BLOCK EXISTS SO NOBODY HAS TO REMEMBER ANYTHING.** Every session reads
`## Position` first, and the working prompt ends by asking what decision is needed — so a
decision parked here is re-offered **every session, automatically**, until it is ruled on.
⚠️ **It is the ONE home for open owner decisions**, and `docs/checks/plan-handover.sh`
refuses a second one, refuses a row that does not say what it blocks, and ⚠️⚠️ **refuses to
let a blocked task be marked as the next task.**

| Decision | Blocks | The brief, already written |
|---|---|---|
| **Retire the split-coverage guards?** Asked by `8b`, 2026-09-29. **Recommendation: yes** — retire `split-coverage.sh`, its falsifier and `specs/`, `5a-split-coverage.sh`, and `4.6a-split-coverage.sh` with its falsifier; keep `plan-handover.sh` and `handbook-agreement.sh`, and retarget the latter's falsifier onto the Step 8 rows so the seven closed `5b` rows can leave the live plan. | `8d` — the housekeeping row, which would carry out the retirement | **The guards that protect only a document from another document**, runtime measured on this Mac 2026-09-29: `split-coverage.sh --all` **6 s** and its falsifier **7 min 20 s** (1,175 fixtures); `5a-split-coverage.sh` **2–3 s**; `4.6a-split-coverage.sh` **1–2 s** and its falsifier **11–21 s**; `handbook-agreement.sh` **under 1 s** and its falsifier **3–7 s**. Two more are MIXED and not candidates: `plan-handover.sh` (1 s — it holds the dates block, which guards real obligations) and `conventions-gate.sh` (6–7 s — mostly app code). **Why retire the split family**: every split it guards (`4.6a`, `5a`, and the 21 in `specs/`) is closed and now archived, so it defends the history of finished work; it is **2,079 lines of shell plus 1,300 of specs**, most of the documents job's time, and it is what forced this cut to keep closed rows live. **Why keep the other two**: they are cheap and they keep the only file the owner reads honest. **Undoing it** is a `git revert`. |

⚠️ **Rulings 1–45 and their briefs moved 2026-09-29 (`8b`) to
[`docs/plan/archive/position-history-through-2026-09-29.md`](plan/archive/position-history-through-2026-09-29.md).**
A decision ruled is removed from the table and its record goes to the status log.

### ⏳ DATES OWED — what a calendar owes, and no person is holding

⚠️⚠️ **THIS BLOCK EXISTS BECAUSE THE DECISIONS BLOCK DID NOT COVER DATES, AND ON 2026-09-13
THERE WERE THREE LIVE ONES HELD ONLY BY PROSE.** A decision waits until someone rules; **a
date passes whether or not anyone looked**, and a missed reading is not recoverable by
trying harder afterwards — it is recoverable only by starting the clock again.

⚠️ **A DATE IS NOT A TASK.** It carries no next-task marker, it is not sized, and it must
never be what a cleared session "takes" — the next task is always in the tables below.

⚠️⚠️ **AND THIS BLOCK HAS TEETH THE DECISIONS BLOCK DOES NOT: `plan-handover.sh` FAILS once
a due date is in the PAST and its row is not ticked.** A red here blocks every merge, which
is deliberate and is the only reason a date survives a context clear — **and the exit is ten
seconds: tick the box and write what was read.** ⚠️ It fires only on dates **strictly
before** today (UTC), so a due-today row is never a false red on a timezone.

| Due | What | Why it cannot simply be moved | Done |
|---|---|---|---|
| **2026-10-04** | ⚠️⚠️ **RE-DEPLOY WERA TO THE IPHONE — THE SUCCESSOR TO THE 2026-09-27 ROW, AND IT NOW CARRIES THE PREREQUISITE THAT ROW DISCOVERED.** Profile `ad8112ec` expires **2026-10-04T14:28:16Z**, and when it does **the app stops launching in his hand** — measured on 2026-09-27, when he said *"I can't open the app in my phone, looks like the profile already expired"* within minutes of the moment. ⚠️⚠️ **THE TWO THINGS THAT MUST BE TRUE BEFORE A RENEWAL CAN WORK, BOTH LEARNED THE EXPENSIVE WAY ON 2026-09-27:** **(1) the build must run ON or AFTER the expiry** — `-allowProvisioningUpdates` REUSES a valid profile and RENEWS only an expired or missing one, which seven early re-deploys demonstrated; and **(2) an Apple ID must be signed into Xcode** (*Xcode → Settings → Accounts*), because renewing talks to Apple and reusing does not. **Check (2) BEFORE spending ten minutes on a build**: `ls ~/Library/Developer/Xcode/UserData/Provisioning\ Profiles/ \| wc -l` and `security find-identity -v -p codesigning`. ⚠️ **AND THE OWNER MUST TAP TRUST AFTERWARDS, EVERY TIME** — *Settings → General → VPN & Device Management* — because a new PROFILE requires it even when the certificate is unchanged. That is the 2026-09-27 correction and it is not optional. ⚠️ **A free personal team signs for seven days**, so this row will have a successor, and the 2026-10-13 reading below needs the last one to land inside the seven days ending on that date. ⚠️⚠️ **AND A THIRD PREREQUISITE WAS LEARNED ON 2026-09-27 BY `6a-ii-a`, WHICH BUILT SUCCESSFULLY AND COULD NOT INSTALL: THE PHONE HAS TO BE REACHABLE, AND THE ERROR FOR *not reachable* IS NOT THE ERROR FOR *locked*.** `devicectl` reads `unavailable` and every install answers **`com.apple.dt.CoreDeviceError 1011`** — *unable to locate a device matching the requested device identifier* — where the passcode answers `kAMDMobileImageMounterDeviceLocked` or `CoreDeviceError 3`. **A retry loop written for the lock spins on `1011` for ever**, which is what twenty attempts over five minutes demonstrated. ⚠️ **Check it BEFORE spending ten minutes on a build**: `xcrun devicectl list devices` must read `available (paired)`, and `ping iPhone-de-Bernie.coredevice.local` must answer | ⚠️⚠️ **THE APP STOPS LAUNCHING WHEN IT PASSES, AND HE IS USING IT DAILY.** ⚠️ The data container survives a re-install — proved three times — so the cost is the trust tap and ten minutes, not his session | ☐ |
| **2026-10-13** | ⚠️⚠️ **`5a-iv-d` day-30 reading — ON ONE INSTRUMENT NOW, NOT TWO, AND THE OWNER TRADED THE OTHER ON 2026-09-22 KNOWING WHAT IT COST.** ***"Override anything related to the 30 day session check. I want to keep working from my device."*** **The iPhone half is spent**: he is using the app daily, so its session is refreshed on every open and it can no longer answer *how long does a session survive untouched*. ⚠️ **The reading is still worth taking and still free, because the second instrument was sealed for exactly this**: the AVD `wera-reading-5a-iv-d`, a **different Google account**, no provisioning clock, powered down since 2026-09-21 — which is why a second instrument existed at all. **A one-device reading is a weaker claim than a two-device one, and it is the claim this project now has.** ⚠️ The iPhone row above is no longer part of this measurement. ⚠️⚠️ **AND IT NO LONGER MEASURES THIRTY DAYS — SAY SO NOW RATHER THAN DISCOVER IT THEN.** The day-8 reading of 2026-09-21 refreshed both sessions by opening both apps, which is what that reading IS; so this one measures **22 days** from 2026-09-21, not 30 from day 0. ⚠️ **That is not a defect and the row is still worth taking** — C1.4's claim is unbounded, and 22 untouched days is a longer gap than 8 — but *"day 30"* is now a name rather than an interval, and a session reporting it as thirty days since sign-in would be stating something false | C1.4 claims persistence *"until an explicit log-out"*, which is unbounded; **eight days can only fail to disprove it.** Both devices are sealed already, so this costs a glance. ⚠️ **The iPhone half also needs the 2026-09-27 re-deploy to have been TRUSTED** — see the row above. ⚠️⚠️ **AND THE ANDROID HALF MAY REFUSE TO BOOT: the sealed AVD was hard-killed on 2026-09-21 and left `hardware-qemu.ini.lock` and `multiinstance.lock` behind** in `~/.android/avd/wera-reading-5a-iv-d.avd/`. A stale lock reads as *"another emulator instance is running"* on the next boot — **which is this date, the one day it is expensive.** ✅ **The fix is to delete those two files and boot again**; the app's data is on the disk image and is not affected. ⚠️ **Do NOT launch Wera to check — booting the emulator is safe, opening the app is the reading** | ☐ |

⚠️ **The ticked rows (2026-09-20, -21, -27) and this block's notes moved 2026-09-29 to the same
position-history archive.** A row leaves the table once its Done cell is written.

✅ **`8b` IS DONE, 2026-09-29 — `8c` IS THE NEXT TASK, AND IT IS UNGATED.** `docs/PLAN.md` went from
**5,573 lines / 830 KB to 420 / 73 KB**, `## Position` from **1,283 lines to 71** (`wc -lc`,
`plan-handover.sh`). **Nothing was edited, only moved** — every non-blank line of the old file is in
the live plan or one of three new archives (checked by line multiset, zero missing, no row doubled):
`steps-4.6-to-7.md` (the closed step prose and rows), `position-history-through-2026-09-29.md`
(rulings 1–45, the ticked dates, cuts 1–27) and `status-log-2026-09-28.md`. ⚠️ **2026-09-27 got no
append**: it was already whole in its archive. ⚠️ **One guard edited, not weakened**:
`4.6a-split-coverage-falsify.sh` copied `docs/PLAN.md` and mutated Step 4.6's text; it now copies the
corpus, and its eleven fixtures behave. ⚠️ **One decision parked** — which document guards to retire,
filed against `8d` (see the block).

✅ **`8a` IS DONE, 2026-09-29 — `8b` was next.** The handbook is **299 lines / 15.9 KB, from 1,229 / 265 KB** (`wc -lc`): what the app does, what is on his phone, the screens only he can judge, the day's jobs, the dates, both prompts verbatim. The old file moved **whole** to `docs/plan/archive/handbook/` (see the `8a` row for why a subfolder). `handbook-agreement.sh` 5 of 5 and its falsifier 11 of 11. Two struck 2026-09-27 headers went to that day's archive.

⚠️⚠️ **`8a` was the next task, AS OF 2026-09-29 — THE OWNER TURNED THE PROJECT FROM *BUILD* TO *BETA*,
AND 2026-09-29 IS A CLEANING DAY.** His words, after midnight: *"We have an Alpha already then, I want
to start improving the App design and the overall UI … to get to a beta and publish our MVP afterwards
both in iOS and Android"* — design work is booked for **Wednesday 2026-09-30**, and *"for this whole day
(September 29th) let's focus on cleaning our progress and leave everything ready for our next moves."*
⚠️ **`5P-c` IS DEFERRED BY HIM, NOT CANCELLED**: asked who keeps the pilot's hand tally, he answered
*"I'm not concerned on this at all. At this point my main interest is to improve the user experience."*
Its row keeps its size and gate; it simply stopped being next. ⚠️ **The plan for the day, the diagnosis
it rests on and the prompt he pastes are in `## Step 8`** — this entry is the pointer, not a copy.
✅ **Measured before writing, from the things that run:** `npm --prefix app test` **1,719 tests across 52
files**, green; `5R-f-schema-deployed.sh` **6 of 6** (41 migrations on the hosted project); the hosted
shop holds **24 sales, 10 deliveries, 2 write-offs, 28 products** (`supabase db query --linked`), so every
screen reads and writes the real database. ⚠️ **This entry also removed twenty blank lines** a
previous cut had left here.

## Steps 0 through 4.5 — closed, and moved out of this file ✅

⚠️ **ARCHIVED 2026-09-19 to [`docs/plan/archive/steps-0-to-4.5.md`](plan/archive/steps-0-to-4.5.md)** —
6,361 lines, unedited. Steps 0, 1, 2 (`✅` in their own headings), 3, 4 and 4.5
(densely `✅` throughout, 41 / 50 / 31 completion marks) were closed and still being
carried in a file that had grown past a context window at ~313k tokens.

⚠️ **EVERY PLAN CHECK STILL READS THOSE ROWS.** `docs/checks/plan-corpus.sh`
assembles this file plus the archive directory and hands the result to each check,
so archiving is invisible to all of them — the lookups are content-addressed
(`| **task** |`), never by line number. `bash docs/checks/plan-corpus.sh --list`
shows what it assembles.

⚠️ **THE ARCHIVE IS *CLOSED*, NOT *WRONG*.** It is not
`archive/power-platform/`, which describes a system nobody is building. Everything
in it describes this system. The file's own header says how to move a section back
if work genuinely reopens — **move it, never copy it**, or the split guards will
count the row twice, which is what they are for.

---

## Steps 4.6 to 7, and the closed rows of 5R and 5P — moved out of this file ✅

⚠️ **ARCHIVED 2026-09-29 by `8b` to [`docs/plan/archive/steps-4.6-to-7.md`](plan/archive/steps-4.6-to-7.md)**,
unedited: the ADR-disagreement gate of 2026-09-07 (resolved), all of Step 4.6, Step 5's prose
and its closed rows, Step 6 whole, and the rows `5R-f`, `5R-g`, `7a`, `7b`, `7d`, `5P-a`.
`plan-corpus.sh` reads it, so every guard resolves those rows as before.

---

## Step 5 — the client (§2.8): what is still live

Everything else in Step 5 is closed and archived (above). ⚠️ **The seven `5b-ii-b-2`/`5b.8`
rows are closed and stay here only because `handbook-agreement-falsify.sh` reads them from this
file** — see the guard decision in ⛔ DECISIONS OWED.

| Task | What it is | Size | Gate |
|---|---|---|---|
| **5b-ii-b-2** | ✅✅ **IS DONE AS OF 2026-09-18 — every one of its four deliverables is built and closed, and the loop the parent promised is shut.** **The redemption, the second actor, and the loop that closes.** **`redeem_invite`**, off the landing `5b-i` built, on a second person's phone: the token goes in, `0028` writes the membership and its location rows, and `guard.ts` sends them to Inicio the moment the read comes back — which is `5b-i`'s recorded rule that a screen never holds a second opinion about navigation. ⚠️⚠️ **AND THE SCREEN HAS TO TELL TWO CREDENTIALS APART (`P2`).** An invite token is **sixteen characters** of the *same* Crockford alphabet as the eight-character join code, and `hash_invite_token` normalises it through the *same* `normalize_workspace_code` — so the two are indistinguishable except by LENGTH, and the screen that takes the other one is `5b-iii`'s. ⚠️ **The refusals are already minted and have to reach a person in Spanish**: `TD003` for a code that expired or was replaced, `42501` for one that is not valid or is already spent, and the **idempotent** second tap that answers `already_redeemed` and is not an error at all. ⚠️ **A closed loop, and it is the one the parent promised**: an owner invites, a second person redeems, and there are two people in the shop ✅ **Shipped:** a fourth `src/api/` contract module (`redeem.ts`), which is the first in this app to carry a NORMALISER and the two lengths that decide which credential a person is holding; one wrapper and one hook; the second half of `(onboarding)/bienvenida.tsx`, one box below a rule; eleven new strings; **28 new Vitest assertions — 325 passing, up from 297**; and **`docs/checks/5b-ii-b-2-redeem-contract.sh`**, nine assertion groups over a reset database with three real people and two stores, wired into `db.yml` on the same commit that created it | `M` | ✅✅ **WAS TAKEABLE, AND IS CLOSED — SIZED `M` ON THE DAY IT WAS TAKEN AND THAT SIZE HELD, which is the first row in this file it has held for.** `0028` applied 2026-09-13; this shipped no migration, no schema and no policy. ⚠️ **It did NOT need the two devices this row predicted**: what the sizing called a second device is a second SESSION, and the contract check drives three of them over HTTP against one reset database — the instrument rules of `5a-iv-c` are for a RENDERING claim, and there is none here. ⚠️ **Three decisions were taken on the owner's behalf and none of them blocked the build**; one of them routes a second SQLSTATE overload into `5b-iii`, by analogy with his ruling of the same day. ⚠️ **The file list above is deliberately short of the sentinels the split guard reads** — the ELEVENTH instance of *never spell a check's sentinel in the file it reads.* `5b.8` must land next because that task edits the RPC this one wraps |
| **5b.8** | ⚠️⚠️ **SIZED `L` AND SPLIT THREE WAYS 2026-09-18, BEFORE A LINE WAS WRITTEN — THE PARENT ROW, AND IT IS NO LONGER TAKEABLE.** ~~It was first in line as of 2026-09-18, and it is struck in lower case deliberately: `plan-handover.sh` reads the shouted form as a MARKER, and a row quoting its own history in it claims to be the next task twice.~~ **Fourteen deliverables, all of which land in a child below.** **SHOW THE NAME, WHICH IS A MIGRATION AND AN ADR AMENDMENT.** A `display_name` column on `workspace_member` — the table a phone CAN read — written by **the shop-creation RPC `onboard_workspace`** and by **the redemption RPC `redeem_invite`** from the caller's own `raw_user_meta_data` — ⚠️⚠️ **AND BY THE TWO WRITERS THIS ROW NEVER NAMED, FOUND IN `0029` BY THE SIZING OF 2026-09-18: `request_access` (`R1`), whose `D7` fast path lets a pre-invited joiner straight in, and `approve_request` (`R2`), the approval `5b-iii` is built on. FOUR membership writers are applied, not two, and shipping two of them leaves the pull path joining nameless on the very next task** — plus a **backfill** for rows that already exist, with a pgTAP suite over the four writers and its falsifications, and ⚠️ **the write rule `R5` bakes into all four: the name is written on `insert`, and on `update` only where the stored value is null**, so a re-invite never overwrites a name a person has already corrected. ⚠️ **And `supabase/README.md`'s `0033` entry states that no human name exists anywhere in this schema (`R6`)**, which this migration makes false. Then the fourth identity case in `rosterFrom`, the column added to the roster's read via `MEMBER_COLUMNS`, and the contract check and harness extended to match. ⚠️⚠️ **AND IT IS THE TASK THAT RETIRES A RULING.** The 2026-09-14 ruling on how a member row is identified — and its twin about what an approver sees — are held as DELIVERABLES by two split guards and written into three rows. This task changes those sentinels; **until it does, they stay exactly as they are**, because a guard asserting a rule that is not yet true is worse than one asserting a rule that has been superseded on paper. ⚠️⚠️ **CORRECTED BY THE SIZING OF 2026-09-18 — THE TWO SENTENCES ARE IN TWO SECTIONS, NOT ONE, AND THE ADR WINS: §2.3's data-model table describes `workspace_member`'s columns (line 358), and `ADR-035 §2.7` is where `auth.users` is never exposed (line 1061).** ~~§2.7 describes `workspace_member`'s columns and says `auth.users` is never exposed.~~ Both sentences need amending, on the instruction given today, in the same task as the migration, the way `4.6a` did it. ✅✅ **AND A THIRD §2.7 SENTENCE WAS FOLDED IN BY THE OWNER'S RULING OF 2026-09-18 — *"fold it into 5b.8"*: §2.7's push paragraph says an owner or manager *"calls `create_invite(...)` under normal RLS"* and THE APPLIED FUNCTION IS `security definer`.** It has to be: `D3′` orders the creating RPC to supersede an expired pending row, that is an UPDATE, and `0002:594` grants `authenticated` select, insert and delete on `workspace_invite` and **not update** — so the invoker-rights spelling dies `42501` before any policy is consulted, and granting UPDATE to fix it makes the missing policy a silent no-op and returns `D3′`'s own bug wearing the costume of its cure. `0028`'s suite asserts both halves (checks `8.2`, `8.3`). ⚠️ **It was recorded at `4.6a-ii` on 2026-09-13 as the ninth stale copy and deliberately left**, because the ADR is amended by the owner's decision and a task is not one; it was parked as a decision by `5b-ii-b`'s sizing and ruled the same day. ⚠️ **It changes NO code and no client contract** — a non-manager is refused `42501` under either spelling — **so it is paperwork, and it is here because three amendments to one section are one deliberate pass and not three.** ⚠️⚠️ **PLUS A `security definer` RPC — `set_my_display_name` — SO A PERSON CAN FIX THEIR OWN NAME, AND THE OBVIOUS ALTERNATIVE IS A TRAP.** Measured, not assumed: `workspace_member_update` (`0001:532`) is `has_role(workspace_id, 'owner')` — **owner-only** — so a manager or a staff member cannot edit the row that describes them, and a Google account that arrived with one word can never be repaired. ⚠️⚠️ **A "you may update your own row" policy is NOT the fix and must not be written: RLS filters ROWS, NOT COLUMNS**, so it would also let that person change their own `role` — the tenancy wall opened to buy a text field. The RPC touches one column and nothing else, and the control lives on the sheet `5b-ii-a` built. ⚠️ **The `Dueño` fallback from `5b-ii-a` STAYS** as the last resort — it is what an account with empty metadata still gets | `M/L` | ✅✅ **WAS TAKEABLE, AND IS NOW A PARENT — SIZED `L` AND SPLIT THREE WAYS 2026-09-18, WHICH IS WHAT THE NEXT SENTENCE ASKED FOR.** ~~TAKEABLE AS OF 2026-09-18 — BOTH GATES ARE CLOSED.~~ Both gates closed that day: `5b.7` shipped the name into `raw_user_meta_data` on 2026-09-18 and `5b-ii-b-2` closed the same day, so the redemption RPC this task edits is now wrapped and asserted. ⚠️⚠️ **RE-SIZE IT FIRST AND EXPECT IT TO SPLIT: THIS ROW IS `M/L` AND HAS GROWN THREE TIMES SINCE THAT WAS WRITTEN**, twice on 2026-09-18 before it was taken. It carries a migration, a backfill, a pgTAP suite and its falsifications, a `security definer` self-edit RPC, a client change across two modules, two split guards whose sentinels it retires, THREE §2.7 amendments and a control on the Ajustes sheet. ⚠️ **`4e`, `4.6a`, `5a-iv`, `5a-iv-c`, `5b-ii` and `5b-ii-b` were every one of them sized smaller than they were and corrected on the day they were picked up** — this is the seventh, and the only one carrying a migration. ~~NOT TAKEABLE UNTIL `5b.7` AND `5b-ii-b` ARE CLOSED, AND IT MUST LAND BEFORE `5b-iii`.~~ After `5b.7` because backfilling from metadata nobody is collecting yet is a migration written against an empty column. After `5b-ii-b` because that task wraps the redemption RPC this one edits, and one pass over a settled flow beats two. **Before `5b-iii`**, because that screen is built against the ruling this task retires — building it first means building it twice. ⚠️⚠️ **RE-SIZE IT ON THE DAY IT IS TAKEN, AND IT GREW TWICE ON 2026-09-18 BEFORE IT WAS EVEN TAKEN** — the self-edit RPC and its control were not in this row when it was written, and they arrived from one grep of an applied policy; the third §2.7 amendment arrived the same day from the owner's ruling. ⚠️ **The third one is the cheap kind** — a sentence, in a section this task already has to open — **and it is named here so the re-size counts it rather than meeting it.** `4e` and `4.6a` both recorded that a deferred second half needs splitting when it is picked up, and this one carries a migration, a suite, a client change, two guards and an ADR |
| **5b.8-i** | ✅✅ **DONE 2026-09-18 — `0034` IS APPLIED AND EVERY WAY INTO A SHOP STORES A NAME.** ~~this was the next task, as of 2026-09-18~~ — ⚠️ **struck in lower case deliberately: `plan-handover.sh` reads the raw line and a strikethrough is only a rendering, so a row quoting its own history in the shouted form claims the marker it has just handed on.** **EVERY WAY INTO A SHOP STORES A NAME. NOTHING DISPLAYS IT YET.** One migration, the next free number — `0034` as the tree stands. A `display_name` column on `workspace_member` — the table a phone CAN read — and **all four applied membership writers** filling it from the caller's own `raw_user_meta_data`: `onboard_workspace` (`0027:422`), `redeem_invite` (`0028:525`), and ⚠️⚠️ **THE TWO THE PARENT ROW NEVER NAMED** — `request_access` (`0029:256`), the `D7` fast path where somebody already invited types the shop code instead of the token, and `approve_request` (`0029:455`), which is `5b-iii`'s own RPC and the reason this cannot wait for it. Plus the **backfill** for rows that already exist. ✅✅ **THE WRITE RULE IS RULED, NOT DECIDED HERE — THE OWNER SAID *"keep what they typed"* ON 2026-09-18** — and it is baked into four functions (`R5`): **the name is written on `insert`, and on `update` only where the stored value is null.** Three of the four writers take an `update` branch when the member row already exists, and refreshing the name there would silently replace a correction a person made about themselves with whatever Google sent — on an event she did not trigger and is not told about. ⚠️ **`R4`: `display_name` will mean the SHOP and the PERSON in one function body** — `onboard_workspace` already takes `p_display_name` for the shop — and the mitigation is a local variable named for the person, never a column rename. ⚠️ **The `Dueño` fallback from `5b-ii-a` STAYS**: an account with empty metadata still arrives with nothing, and that is the floor the identity ladder already handles. ✅ **The paperwork the schema makes false, in the same pass**: `ADR-035 §2.7`'s *"`auth.users` is never exposed to anyone"* and its `create_invite` *"under normal RLS"* spelling, §2.3's `workspace_member` columns row — ⚠️ **TWO SECTIONS, NOT ONE: this row said §2.7 described those columns and §2.3 does. The ADR won and this row was corrected on 2026-09-18; the same three sentences are amended either way, and all three were amended by `5b.8-i`**, and `supabase/README.md`'s `0033` claim that no human name exists anywhere in this schema (`R6`). ⚠️ **A pgTAP suite over the four writers and its falsifications is the evidence** — four paths in, four named members, no null left behind, and a person with empty metadata still admitted — and it needs no client at all | `M` | ✅✅ **TAKEABLE — BOTH OF `5b.8`'s GATES WERE CLOSED ON 2026-09-18 AND THIS CHILD INHERITS THEM.** `5b.7` shipped the name into `raw_user_meta_data`, and `5b-ii-b-2` wrapped the redemption RPC this task edits. ⚠️⚠️ **IT MUST LAND BEFORE `5b-iii`, AND `R2` IS WHY THE ORDERING IS NOW LOAD-BEARING RATHER THAN MERELY STATED**: `5b-iii` builds the approval screen on `approve_request`, so a column without that writer means every person who joins by the pull path arrives nameless and the repair is a second migration plus a second backfill. ⚠️ **It ships NO client code** — the display is `5b.8-ii` |
| **5b.8-ii** | ✅✅ **DONE 2026-09-18 — THE ROSTER SHOWS THE NAME.** ~~this was the next task, as of 2026-09-18~~ — ⚠️ **struck in lower case deliberately, the rule `5b.8-i`'s row records: `plan-handover.sh` reads the raw line, a strikethrough is only a rendering, and a row quoting its own history in the shouted form claims the marker it has just handed on.** ⚠️ **AND IT INHERITED ONE CORRECTION `5b.8-i` DELIBERATELY DID NOT MAKE**: `app/src/api/members.ts`'s comment says a staff caller *"can identify NOBODY"* on the roster. That is still true of `MEMBER_COLUMNS` and **no longer true of the policy** — `0034`'s section 7 measured a cashier reading every name in her shop. `5b.8-i` ships no client code and this is the file this task edits, so the sentence is corrected here rather than across the seam. **THE ROSTER SHOWS THE NAME, AND THE 2026-09-14 RULING FINALLY STOPS BEING TRUE.** The fourth identity case in `rosterFrom`, above the email and below *you*; the column added to the roster's read via `MEMBER_COLUMNS`; and the contract check and harness extended to match, which is where a claim about what a real database hands a real session is settled. ⚠️⚠️ **AND IT IS THE CHILD THAT RETIRES THE SENTINELS — the sentinels move HERE and not in the migration (`R3`).** Two split guards hold the 2026-09-14 EMAIL ruling as a DELIVERABLE — `5b-split-coverage.sh` routes *"identified by EMAIL"* to `5b-ii` and *"approver sees an EMAIL"* to `5b-iii`, and `5b-ii-split-coverage.sh` routes the first to `5b-ii-a` — and the parent's rule is *"until it does, they stay exactly as they are."* ⚠️ **A stored column changes nothing a person sees**, so retiring them when the column lands would leave both guards asserting a rule that is neither true nor superseded for as long as this task takes; **the ruling dies on the screen, which is here.** ⚠️ **Both harnesses move with their guards** — when an assertion changes, the thing that falsifies it changes in the same commit, which is the rule `conventions-gate-falsify.sh` spent a day dead to learn. ⚠️ **It ships NO migration**, which is exactly what makes it the safe place to move a sentinel two guards depend on | `M` | **BLOCKED ON `5b.8-i`** — a fourth identity case reading a column that does not exist is a client built against a guess, and the contract check would have nothing to assert against. ⚠️⚠️ **THIS IS THE CHILD THAT MUST LAND BEFORE `5b-iii`**, not merely the parent: `5b-iii`'s approval screen is built against the twin ruling this task retires, so building it first means building it twice |
| **5b.8-iii** | ⚠️⚠️ **SIZED `L` AND SPLIT IN TWO 2026-09-19, BEFORE A LINE WAS WRITTEN — THE PARENT ROW, AND NO LONGER TAKEABLE.** ~~this was the next task, as of 2026-09-18~~ ⚠️⚠️ **ITS OWN GATE CELL ORDERED THE RE-SIZE, AND THE RE-SIZE IS WHAT HAPPENED** — see the right-hand cell; `4e`, `4.6a` and `5b.8` itself all record that a deferred half arrives bigger than it left, and this one carries a migration. ⚠️ **It is taken ahead of `5b-iii` on two grounds and neither is the split's ordering**: `5b-iii` is BLOCKED by the decision parked on 2026-09-18, and this task closes a gap that is live from the moment `5b.8-ii` merged — a Google account that arrived as one word now shows that one word on the roster and nobody can fix it, because `workspace_member_update` is owner-only. **A PERSON FIXES THEIR OWN NAME, AND THE OBVIOUS ALTERNATIVE IS A TRAP.** `set_my_display_name` — a `security definer` RPC taking the next free number, touching ONE column and nothing else — and the control lives on the sheet `5b-ii-a` built. ⚠️⚠️ **MEASURED, NOT ASSUMED: `workspace_member_update` (`0001:532`) is `has_role(workspace_id, 'owner')`** — owner-only — so a manager or a staff member cannot edit the row that describes them, and a Google account that arrived as one word can never be repaired. ⚠️⚠️ **A *"you may update your own row"* POLICY IS NOT THE FIX AND MUST NOT BE WRITTEN: RLS FILTERS ROWS, NOT COLUMNS** — the sentence §2.7 already spends a paragraph on about `cost` — so it would also let that person change their own `role`, which is the tenancy wall opened to buy a text field by an edit that reads as a courtesy. ⚠️ **It is the half `5b.7` deliberately left here**: that row shipped on the promise that a one-word Google name is repaired by an editable own-name field rather than by a screen between the button and the shop, so deferring this makes `5b.7`'s closing argument false. ⚠️ **Its own pgTAP suite and falsifications** — a member edits their own row, a non-member is refused, a blank is refused, and the `role` column is provably untouched by the call | `L` (was `M`) | ⚠️ **THE BLOCK CLEARED**: `5b.8-i` closed 2026-09-18 and `0034` is applied, so the column exists to edit. ⚠️⚠️ **AND THE ROW WAS RE-SIZED THE DAY IT WAS TAKEN, WHICH IS WHAT THIS CELL ORDERED** — it carries a migration AND a screen, which is `5b.8-i` and `5b.8-ii` in one session. **Not takeable; take `5b.8-iii-a`.** ⚠️ **It does NOT block `5b-iii` and `5b-iii` does not block it**: the repair path touches no screen `5b-iii` builds, so it is the one child of the three that may legitimately be deferred past it. ⚠️⚠️ **IF IT IS DEFERRED, RE-SIZE IT ON THE DAY IT IS TAKEN** — `4e`, `4.6a` and `5b.8` itself all record that a deferred half arrives bigger than it left, and this one carries a migration |
| **5b.8-iii-a** | ✅✅ **DONE 2026-09-19 — `0035` IS APPLIED AND A PERSON CAN FIX HER OWN NAME.** ~~this was the next task, as of 2026-09-19~~ — ⚠️ **struck in lower case deliberately, the rule `5b.8-i`'s row records: `plan-handover.sh` reads the raw line, a strikethrough is only a rendering, and a row quoting its own history in the shouted form claims the marker it has just handed on.** **The repair path in the database, and nothing a person can see yet.** `set_my_display_name(p_workspace_id uuid, p_display_name text)` — a `security definer` RPC taking the next free number `0035`, writing ONE column of ONE row, the caller's own. ⚠️⚠️ **IT IS WORKSPACE-SCOPED, AND THAT IS A DECISION TAKEN ON THE OWNER'S BEHALF** — `my_workspaces()` returns `setof uuid` and its own comment says many-workspaces-per-user *"works from day one even though every real user has exactly one"* (`0001:317`), so an unscoped write would reach across a tenant boundary to save one argument. **Reversible: a scoped call can later fan out; an unscoped write that has already run cannot be un-run.** ⚠️⚠️ **A *"you may update your own row"* POLICY IS NOT THE FIX AND MUST NOT BE WRITTEN: RLS FILTERS ROWS, NOT COLUMNS** — it would also let a cashier set her own `role`. ⚠️ **The write rule `0034` baked in stands**: this RPC is the ONE writer that may overwrite a non-null name, because it is the person herself doing it. ⚠️ **Its own pgTAP suite and falsifications, under `set role authenticated`** — a member edits their own row, a non-member is refused, a blank is refused, another member's row is untouched, and the `role` column is provably untouched by the call. ⚠️ **`supabase/README.md`'s numbering entry** | `M` | ✅ **CLOSED 2026-09-19, AS SIZED.** Shipped: `supabase/migrations/0035_set_my_display_name.sql`, `supabase/tests/0035_set_my_display_name.sql` (38 checks, sixteen falsifications, fifteen red), the `supabase/README.md` numbering entry, an additive ADR-035 §2.3 amendment, and a note in `_cleanup.sql` recording that the suite added NO new helper shape. ⚠️ **Two falsifications changed the SUITE** — an unfalsifiable guard and an abort-instead-of-FAIL; see the status entry. ⚠️ **It ships no screen**, so nothing a person can see changed until `5b.8-iii-b` |
| **5b.8-iii-b** | ✅✅ **DONE 2026-09-19 — A PERSON CAN FIX HER OWN NAME, AND A CASHIER CAN TOO.** ~~this was the next task, as of 2026-09-19~~ — ⚠️ **struck in lower case deliberately, the rule `5b.8-i`'s row records: `plan-handover.sh` reads the raw line, a strikethrough is only a rendering, and a row quoting its own history in the shouted form claims the marker it has just handed on.** **The control a person fixes their own name with, and the only half anybody can see.** ⚠️ **No migration** — it calls what `5b.8-iii-a` applied. The control lives on the sheet `5b-ii-a` built, `app/src/app/ajustes.tsx`, as the caller's OWN row made editable — **not** a pencil against a roster row, which is the difference between fixing your own name and administering somebody else's, and the roster is manager-and-above while this is for everybody. ⚠️ **The call belongs in `src/api/` under `5b.5`'s conventions** (`R12`, `R13`): everything with a right answer in the module, nothing that talks. ⚠️ **The roster must re-read after the write**, or a person corrects her name and the list in front of her still shows the old one. ⚠️ **Its Spanish strings go in `app/src/strings.ts`**, and its contract check and harness join the pair `5b-ii-a` ships | `M` | ✅ **CLOSED 2026-09-19, AS SIZED.** Shipped: `app/src/api/displayName.ts` (the fifth `src/api/` module), the `setMyDisplayName` wrapper in `calls.ts`, `useMyDisplayName` and `useSetMyDisplayName` in `hooks.ts`, `nameOf`/`nonBlank` exported from `members.ts`, the `Tu nombre` section on `ajustes.tsx`, the `ES.myName` block, `app/test/api-display-name.test.ts` (28 assertions), and the pair `5b-ii-a` ships — `docs/checks/5b.8-iii-b-name-contract.sh` (8 groups) and its harness (10 fixtures), both wired into `db.yml`. ⚠️ **It shipped no migration, as promised.** ⚠️ **One defect found by the harness while the check was being written** — a request body inlined inside three levels of command substitution; see the status entry |
| **5a-iv-d** | **The eight-day reading**, and nothing else — C1.4's persistence, measured. ⚠️ **On the owner's iPhone 15** — the Android routing was withdrawn 2026-09-12; see the correction in the sizing section. ⚠️⚠️ **AND THE IPHONE HALF WAS TRADED AWAY BY THE OWNER ON 2026-09-22, WITH THE DAY-8 READING ALREADY IN HAND AND THE DAY-30 ONE STILL PENDING.** ***"Override anything related to the 30 day session check. I want to keep working from my device."*** He is using the app daily now, so that phone refreshes its session on every open and can no longer answer the question. **What survives is the sealed AVD** — a different Google account, no provisioning clock — **which is the whole reason a second instrument was sealed**; the 2026-10-13 row in the ⏳ block carries it. ⚠️ **The day-8 answer is unaffected and already recorded: the session survived eight days on both instruments.** | `XS` in effort, **longest lead time in step 5** | ⚠️⚠️ **A DATE, NOT WORK — it is not the next task, it is a diary entry.** ⚠️⚠️ **THE DATE IS SET BY A `5a-iv-a` BUILD: DAY 0 IS 2026-09-13, THE READING IS DUE 2026-09-21.** ✅ The `5a-iv-a` day-0 pre-check passed, so this is free. ⚠️⚠️ **The profile expires `2026-09-20T06:19:32Z` — BEFORE the reading.** Re-deploy first (`xcodebuild … -allowProvisioningUpdates`, then `devicectl install`), *then* open and look. **Do not open Wera before then.** ✅✅ **A SECOND, CLOCK-FREE INSTRUMENT WAS SEALED 2026-09-13 18:23 CST** — the AVD `wera-reading-5a-iv-d`, Google-signed-in on a **different account**, seal-tested and powered down. ⚠️ **Do not boot it; use `wera-android-36` for design and testing** — opening the app restarts the clock. ✅ **Session config READ (a report, not a measurement): time-box `0`, inactivity `0` — nothing expires a session**; reuse detection **On** at a `10s` interval, which is where the real risk now sits. ⚠️ **Day 8 is a CHECKPOINT, not the answer — look again on 2026-10-13 (day 30).** |
| **5f-iv** | ⚠️⚠️ **OUT OF THE PILOT — RULED 2026-09-24, AND THE ANSWER TO THE QUESTION THIS CHILD EXISTED TO ASK IS *NO*.** ~~gated on a decision the owner owes~~ — ⚠️ **struck in lower case deliberately, the rule `5b.8-i`'s row records.** *"Let's not do those discount controls part of the pilot yet, we will need to understand the interactions before creating anything like that. Any money 'knock-off' happens in her head and is out of the scope of the app for now."* ⚠️⚠️ **IT KILLED MORE THAN THE QUESTION ASKED, AND THE OWNER MAY NOT HAVE NOTICED — SO IT IS WRITTEN DOWN HERE RATHER THAN ACTED ON QUIETLY: C3.16's SETTING IS THE SAME AFFORDANCE.** *Reset-after-each-transaction* is a sale-only override expressed as a switch rather than as a tap, so *"any money knock-off happens in her head"* answers both, and **the discreet Home banner goes with it** — it existed only to announce that setting. ⚠️ **What survives untouched:** a price change persists, because there is now no other kind; `Editar` is where one is made; and C3.17's manager fence is unchanged. ⚠️⚠️ **THE ROW IS NOT DELETED, AND THAT IS `5d-iv-b`'s AND PROVEEDORES' REASON:** *"we will need to understand the interactions"* is a deferral with a condition on it, and the condition is watching the shop use Vender. **This row is what the answer comes back to**, and it opens by owing the word — the shape `Costos` already has. ⚠️ **Nothing is drawn for it**, and `5f-ii` draws no `...` rather than a dead one, because nobody has seen this affordance and there is nothing to preserve. **Deferred, not dropped.** ~~**The `...` quick actions: the price change and its persistence setting.** C3.15 — *prices are changed from the `...`, in two taps, at the counter, on both screens* — and **C3.16**, which is the half that reaches the shop rather than the screen: **a price change PERSISTS BY DEFAULT**, so the change made at the counter becomes the shop's price; a setting flips it to reset-after-each-transaction; and **while that setting is off, Inicio carries a discreet banner saying so**, because a shopkeeper who changed a price on Monday is otherwise surprised on Tuesday. ⚠️ **That banner is the SECOND thing Inicio has been asked to carry conditionally** — `5d-iv-b` already reserves room for the first — and two banners arguing about the top of one screen is the shape §2.8's Home ruling exists to prevent. ⚠️⚠️ **AND THE QUESTION THIS CHILD EXISTS TO ASK BEFORE IT DRAWS ANYTHING: does the `...` offer a cashier a price override FOR THIS SALE ONLY — one that never writes `price_list`?** The C3.17 ruling of 2026-09-23, *"leave the fence as is"*, settled who may change the SHOP's price and deliberately said nothing about a discount on one line. ⚠️ **A child that drew the control without asking would ship a button a cashier taps while nothing happens**, and not visibly: her PATCH is not refused, the row is simply invisible to her, so PostgREST answers **200 with an empty array** — measured by `5e-iii-a`, not inferred. ⚠️ **The write itself is already built and is not this child's**: `5e-iii-a`'s `editPlan` closes the row in force and opens the new one, in that order, because `price_list_no_overlap` allows no other. **It ships no migration** — widening the fence WOULD be one, and an append-only migration that merges automatically is exactly why this question was parked in front of the work rather than inside it~~ | `M` | ⏸️ **Deferred out of the pilot 2026-09-24** — it returns on the owner's word, after he has watched the shop use Vender |
| **5i** | ⚠️ **DEFERRED OUT OF `5a-iii` ON 2026-09-11 — THE v2 PILOT'S SIGN-IN.** **Facebook.** One `signInWithOAuth({provider:'facebook'})` on the shell `5a-iii` already built, **plus the `linkIdentity()` path for the accounts that exist by then** and `enable_manual_linking` (`supabase/config.toml:188`, `false` today). ⚠️ **The code is the smallest part of this task.** | `S` code, `M` everything else | ⚠️⚠️ **A PUBLIC `aviso de privacidad` PAGE.** Facebook Live mode needs it, Google publishing needs it, and LFPDPPP owes it regardless — **one page unblocks all three.** Plus the Facebook app and a Business portfolio ⚠️⚠️ **AND TWO PILOT-DAY INSTALL FINDINGS, PROMOTED FROM PROSE 2026-09-13 — neither is about sign-in, both block getting the app ONTO a pilot phone.** ⚠️ **Samsung's Auto Blocker can refuse a sideloaded install**, and C1.1 puts a Samsung among the four devices while there is no Play listing until this step — measured on a borrowed Galaxy Z Flip 8, where it also held the USB-debugging toggle shut. ⚠️ **The Release APK is signed with Expo's DEBUG keystore**; an app later signed with a real one cannot update an install made with this one — it must be uninstalled first, which costs a shop its local data. **Same family as the provisional bundle id: free now, not free once a pilot phone holds an outbox.** |

---

## Step 5R — the release path, and it is now a STEP (§2.11)

⚠️⚠️ **PROMOTED FROM PROSE TO TASKS ON 2026-09-21, ON THE OWNER'S INSTRUCTION, AND THE
TARGET CHANGED WITH IT.** §2.11 carries the release path as a paragraph and says *"it
is not a step because it blocks nothing"*. **That was true when the pilot's output was
a measurement. It is false now that the pilot's output is also a thing shown to
investors and partners** — the owner ruled on 2026-09-21 that the app ships to **both
public stores**, not to TestFlight and Play internal testing alone.

⚠️ **The recommendation on file was internal distribution only**, on the grounds that
App Store review sits inside §5's three-day observation window. **The owner overrode
it with a reason the recommendation had not weighed: a public listing is evidence to a
partner, and this pilot exists to raise money as well as to measure completeness.**
Recorded here rather than argued again.

⚠️ **§2.11's acceptance test survives the change and is not optional:** an over-the-air
JS-only fix shipped to a real device in under an hour, proven **before** pilot day.
Public review governs binaries; it does not govern OTA updates, so this is what keeps
a 48-hour review out of the observation window.

⚠️⚠️ **THE IDS ARE `5R-x` AND `5P-x` RATHER THAN `R1`/`P1`, AND THAT IS A CORRECTION MADE
THE SAME DAY.** They were first written `R1`–`R5` and `P1`–`P3`, and **every one of the
eight collided with a row that already existed** — `R1`–`R13` are `docs/CONVENTIONS.md`'s
RULE names (`R12` and `R13` are cited across the plan and read by
`conventions-gate.sh`), and `P1`–`P3` are falsification fixtures in the `5a-iv` tables.
⚠️ **A grep for `R3` returned a store gate and an empty-env-var fixture**, which is the
one-identifier-two-meanings defect this file has recorded several times. The `5` prefix
also says something true: §2.11 puts the release path *"running in parallel from 5a"*.

| Task | What it is | Size | Gate |
|---|---|---|---|
| **5R-a** | **The accounts, and the one-way door inside them.** Apple Developer Program enrolment and Google Play Console. ⚠️⚠️ **SUBMISSION IS WHAT MAKES THE BUNDLE ID PERMANENT** — `mx.bserafin.wera` has been provisional since `5a-iii-a` and stops being so the day a store accepts it. Anything about the name, the vendor prefix or the Spanish/English spelling is free today and a new app listing afterwards | `S` | ⚠️ **Nothing technical. Enrolment latency is outside our control, which is why it is first** |
| **5R-b** | **EAS Build, and the update channel proven end to end.** A cloud build replacing the local Xcode + free-provisioning path, installed on a phone that is not the owner's, plus §2.11's acceptance test: **a JS-only fix shipped over the air in under an hour**. ⚠️ **This also retires the 7-day provisioning treadmill** currently sitting in ⏳ DATES OWED | `M` | `5R-a` |
| **5R-c** | ⚠️⚠️ **ACCOUNT DELETION — A STORE GATE THAT EXISTS IN NO DOCUMENT AND NO LINE OF CODE.** Both stores require an app that creates accounts to offer in-app deletion; Google additionally requires a web-reachable request path. **Found 2026-09-21 by grepping for it and finding nothing.** ⚠️⚠️ **AND IT IS NOT A BUTTON: `sale.created_by` and `failed_write.reported_by` are `not null` references to `auth.users`, so a hard delete is REFUSED BY THE LEDGER.** The design question — anonymise the actor, transfer the workspace, or refuse deletion to an owner who still has a shop — is a real one and it touches the append-only ledger | `M/L` | ⚠️ **Needs a decision before code. Unsized until that decision; `M/L` is a placeholder** |
| **5R-d** | **The listing, and the law.** `aviso de privacidad` at a public URL (LFPDPPP, §2.2's cross-border disclosure), ⚠️⚠️ **and, since rulings 43–44 of 2026-09-28, the pilot's readings: `pilot_reading` (`0043`) stores what each named member did on Vender, Comprar and Desperdicio — times, taps and screens left — and the notice must say so before a shop the owner does not run carries a pilot build**, Apple privacy labels, Google Data Safety, screenshots, descriptions, age rating, test credentials for review. ⚠️ **One risk checked and probably already retired**: Apple requires *Sign in with Apple* only where an app uses third-party login **exclusively** — `5a-iii-a` shipped email sign-in beside Google, which is what should exempt us. **Verify against the current guideline before submitting rather than discovering it in review** | `M` | `5R-a` |
| **5R-e** | **Submit, survive review, and be listed in both stores.** | `S` | `5R-b`–`5R-d`, and a build worth reviewing |

---

## Step 6 — closed ✅

Every row (`6a`–`6d`) is done; the section moved whole to `steps-4.6-to-7.md`.

---

## Step 7 — Números, and the read the tier-2 business runs on

⚠️ **WRITTEN 2026-09-21. §3 carries step 7 as the single word *"Números"*.** It is the
surface the BI half of the business model is sold on, and every view it reads is
already applied: `0031` purchases and gross revenue, `0032` price over time, `0033`
the month export. ⚠️ **Área 9 settled its content on 2026-09-14** — *"charts and
tables about their transactions … it doesn't have to be very robust nor
sophisticated for now"* — so this is three questions, not thirty.

| Task | What it is | Size | Gate |
|---|---|---|---|
| **7c** | ⚠️⚠️ **WHAT AM I THROWING AWAY — and the honest half is QUANTITY.** §2.9 records the cost half as broken under C8.6: on a despiece the numerator reads a shortfall lot's cost of **zero** and the denominator is purchases of a product the shop buys whole, so **the headline is 0 over 0**. Quantity by product is sound and is what ships. ⚠️ **Pricing waste properly is its own modelling decision and is not folded in here** | `M` | ✅ **UNGATED as of 2026-09-27** — ~~`6a` — there is no waste data until that screen exists~~. ⚠️ **Re-pointed from `6a` to `6a-i` and then cleared, because `6a` split that day and *a gate naming a row nobody can take is a gate nobody can clear*** — the trap `5h`'s and `5h.5`'s splits both recorded. `6a-i` closed 2026-09-27, so the screen exists. ⚠️ **What it still wants is DATA rather than a row**: a pilot shop that has actually thrown things away for a while |
| **7e** | ⚠️⚠️ **WHAT IS AT RISK OF BECOMING WASTE — DERIVED, NOT TYPED IN. REWRITTEN 2026-09-21 WHEN THE OWNER RULED OUT CAPTURING EXPIRY DATES.** ~~stock inside its last days, read from a captured `expiry_date`~~. **Three numbers per variant, all of them computed from records the shop already produces:** **shelf age** (how long the stock on hand has been sitting — `stock_batch.received_at`, which is `not null` and always present, against `batch_balance`); **days of cover** (what is on hand ÷ recent daily velocity, over `product_velocity_daily`, which `0013`/`0014` already ship); and **observed time-to-waste** (for each variant, how many days typically pass between receiving and writing off — read from `waste` against the batches it consumed). ⚠️ **A variant with more days of cover than its own observed time-to-waste is the buy-it-now candidate**, and that is the tier-2 signal without a single new field. ⚠️⚠️ **WHAT IT COSTS, AND IT IS THE REASON THE DEFERRED DECISION IS NOT FREE: a derived shelf life NEEDS WEEKS OF WASTE RECORDS BEFORE IT SAYS ANYTHING.** A typed expiry date answers on day one; this answers once the pilot has run long enough to have thrown things away. **That is a pilot-duration cost, not an engineering one**, and it is the owner's deliberate trade — see ⛔ DECISIONS OWED, área 7 | `M` | ⚠️ **`6a-i` and `5g` — RE-POINTED 2026-09-27**, because `6a` split that day and a gate naming a split parent is one nobody can clear. ✅ **Both screens now exist** (`5g-ii` 2026-09-25, `6a-i` 2026-09-27). ⚠️⚠️ **What is left in this gate is TIME and it cannot be hurried**: a derived shelf life needs weeks of waste records, and the clock started 2026-09-27 |

---

## Step 5P — the pilot itself, instrumented

⚠️ **WRITTEN 2026-09-21.** §5 defines the pilot and binds it; what it has never had is
a task that BUILDS the instrument. ⚠️⚠️ **And the owner's pilot is not quite §5's
pilot** — §5 says *"one store, three days physically present"* and measures
completeness; the owner needs **retailer engagement across two or three shops** and a
waste-pattern read he can take to investors. Both are recorded, and they are not the
same instrument.

| Task | What it is | Size | Gate |
|---|---|---|---|
| **5P-b** | ⚠️⚠️ **ENGAGEMENT ACROSS SHOPS THE OWNER IS NOT STANDING IN — and it is a DECISION before it is a task.** §5's overlay works because the schema owner is in the room; two or three shops over weeks is a different question. ⚠️ **The cheap answer needs no telemetry at all**: recording *is* engagement, so `sale`, `purchase` and `waste` row counts per shop per day already measure it, from the server, with nothing added to the client and nothing to disclose. ⚠️⚠️ **Anything beyond that — screen opens, session length, feature taps — is behavioural telemetry on identified merchants and engages LFPDPPP and the `aviso de privacidad` `5R-d` ships.** The recommendation is the server-side read, and the decision is the owner's | `S` for the read; unsized if telemetry is wanted | `5h`, and a shop with rows |
| **5P-c** | ⏸ **DEFERRED BY THE OWNER 2026-09-29** — *"I'm not concerned on this at all"*; the project turned to the beta (`## Step 8`). ~~this is the next task, as of 2026-09-28~~ — ⚠️ **struck in lower case deliberately, the rule `5b.8-i`'s row records.** **Completeness, the number the pilot is graded on.** The manual-tally comparison §5 requires, and the daily read that shows it — *"five consecutive days within 5%"* is a query, and running it by hand each evening is how a bad day gets explained away | `S` | `5P-a` |

---

## Step 8 — from alpha to beta: the cleaning day (2026-09-29) and the design day (2026-09-30)

**Written 2026-09-29, after midnight, at the owner's request** — *"make a diagnosis of the current
status of the way you're progressing, the graph and any other thing we leverage. And establish a one
day plan for us to tidy it along with its own Cleaning Prompt."* The prompt is in `docs/HANDBOOK.md`,
beside the main prompt, because that is the file he reads. **This section is the plan; the handbook
holds only the prompt and the pointer.**

### The diagnosis — every number measured 2026-09-29 00:30 CST, and the tool that gave it

**What is healthy — the product.**
- `npm --prefix app test`: **1,719 tests across 52 files, all green.** The last 40 CI runs
  (`gh run list`) were all green except one `db` failure on the `5P-a` branch, fixed before merge.
- `5R-f-schema-deployed.sh`: **6 of 6** — all 41 migrations applied to the hosted project.
- The hosted shop (`supabase db query --linked`): **24 sales, 10 deliveries, 2 write-offs,
  1 supplier, 28 products.** Every screen reads and writes that database; no screen runs on sample
  data (checked by searching `app/src/app` for mock, fake, sample or TODO: none).
- **The owner calls it an alpha, and that is accurate.** Selling, buying, waste, catalog, suppliers,
  corrections, Números, Precios, the month export and offline selling are built and connected.

**What is unhealthy — the process has outgrown the product** ([[process-must-not-outgrow-product]]
in the assistant's memory says he trades rigor for speed when a guard protects a document, not a shop).
- **The documents** (`wc -lc`): `docs/PLAN.md` **5,517 lines / 821 KB** — about 200k tokens, more than
  a session can read; `## Position` was at **1,298 of its 1,400 cap**. The archive is **11 files /
  18,955 lines**. `docs/HANDBOOK.md` is **1,193 lines / 263 KB** for a reader who is not a developer,
  and its catch-up contradicts itself (§2 mentions *"one of the four parked decisions"*, §3 says there
  are none; *What you are building* still calls Desperdicio an empty tab). `CLAUDE.md` **35 KB** +
  `app/CLAUDE.md` **29 KB** load into sessions, and most of it is the history of corrections to its own
  numbers. The warning sign appears **994 times** in the plan, **186** in the handbook and **70** in
  `CLAUDE.md` (`grep -c`) — when everything is flagged, nothing is.
- **The checks**: **75 shell scripts, 27,177 lines** in `docs/checks/`, against **42,483** lines of
  app source and **18,554** of app tests. A large share hold documents in agreement with each other,
  and `split-coverage` with its falsifier takes about six minutes.
- **The graph** (`graphify-out/graph.json`): **4,349 nodes, 8,592 edges, every one `_origin: ast`**,
  current as of `8d8758c` (built the same minute it merged). **1,500 of the nodes are `docs/`** —
  headings of the plan, mostly noise for a code question. No semantic layer (no API key), so it answers
  *where*, never *what was decided*. **34 dated snapshot folders, 105 MB**, nothing reads them.
- **Git**: **198 remote branches** — squash-merged PR heads nobody deleted — and **9 stale local**.
- **The assistant's memory**: **85 files**. Some describe one-off instruments (the sealed emulator,
  the 8-day reading) that expire with the dates block.

**What actually stands between the alpha and a beta — distribution, not code.**
- The app is installed with a free Apple account: **it stops opening every 7 days** (next: 4 October,
  14:28 UTC) and only this Mac can reinstall it. A second person's phone cannot live like that.
  `5R-a` (Apple Developer Program + Play Console, **his** action) and `5R-b` (EAS / TestFlight) fix it.
- `5R-c` account deletion (a store requirement, still needs a decision) and `5R-d` the *aviso de
  privacidad* are the other two store gates. **No CI compiles the native app.**
- **Design readiness is unmeasured** — nobody has counted where colours, type sizes and animations
  live, or what the conventions gate will refuse when they change. That is `8e`.

### The day, in order — one row per session, the Cleaning Prompt takes the next one

⚠️ **Nothing a shopkeeper sees changes today**: no migration, no screen, no access rule. Each row
comes out **smaller** and says by how much. **Order matters**: `handbook-agreement.sh` looks up the
handbook's task rows in `docs/PLAN.md` itself, NOT in the corpus, so the handbook sheds its rows
before the plan archives them.

| Task | What it is | Size | Gate |
|---|---|---|---|
| **8a** | ✅ **DONE 2026-09-29** — 1,229 lines / 265 KB to 299 / 16 KB; the old file moved whole to `docs/plan/archive/handbook/handbook-through-2026-09-29.md` (a subfolder: in `docs/plan/archive/` itself `plan-corpus.sh` would read its task rows as second copies and `split-coverage` goes red — measured). **The handbook, rewritten for its reader.** One short file: what the app does today, what is on his phone, what is waiting on him, how a session goes (both prompts), the dates. The stale catch-up goes; the history moves to `docs/plan/archive/handbook-through-2026-09-29.md` — a MOVE. Keep `handbook-agreement.sh` green (its three sentinels stay, each exactly once). **Target: under 300 lines.** | `S/M` | — |
| **8b** | ✅ **DONE 2026-09-29** — 5,573 lines to 420, Position 1,283 to 71; see the status log. **The live plan, cut to what is live.** ⚠️ **The handbook still names `5b-ii-b-2`, `5b.8` and `5b.8-iii`** because `handbook-agreement-falsify.sh` hard-codes them, and `handbook-agreement.sh` looks them up in `docs/PLAN.md`, not the corpus — **archive those three rows and it goes red**; keep them, or make the retargeting of that falsifier part of the recommendation. Take the 2026-09-27 and 2026-09-28 status-log days out of `## Position` (APPEND to `status-log-2026-09-27.md`; open `status-log-2026-09-28.md`), and move closed step prose (4.6, the closed parts of 5, 5R-f/g, 6, 7a/b/d) to an archive file. Keep the two obligation blocks, every open row, Step 8 and the working agreement. `plan-corpus.sh`, `split-coverage.sh` and their falsifiers stay green. **Then list every guard that protects only a document from another document, with its runtime, and park ONE recommendation in ⛔ DECISIONS OWED about which to retire — retire nothing yet.** **Target: under 2,000 lines, Position under 600.** Update `CLAUDE.md`'s archive table by listing the directory | `M` | `8a` |
| **8c** | ⚠️⚠️ **THIS IS THE NEXT TASK, AS OF 2026-09-29.** **`CLAUDE.md` and `app/CLAUDE.md`, rules only.** Keep what a session must obey (the non-negotiables, migrations, deploy, merge rule, domain words, graphify rules) and the pointers; drop the story of each number's corrections. Numbers that decay are replaced by the one-liner that measures them. **Target: each under 12 KB.** | `S` | `8b` |
| **8d** | **Housekeeping outside the documents.** Delete remote branches whose PR is MERGED (from `gh pr list --state merged`, never a guess) and the stale local ones; prune `graphify-out/` snapshot folders; run `graphify update .` and record the node count; read the assistant's memory index and delete or correct memories that are no longer true. **List first, then delete only what was listed.** | `S` | `8c` |
| **8e** | **The design inventory for Wednesday — READ-ONLY.** Where every colour, font size, spacing value, radius and animation lives (`app/src/ui/` and every literal outside it), how many screens use each, what `conventions-gate.sh` refuses, light/dark handling, and a screenshot of every screen from the iOS Simulator. Published as a private page he can open on his phone. **It changes no code** — it is the map Wednesday starts from | `M` | `8d` |
| **8f** | **The design pass — Wednesday 2026-09-30, with the owner.** Colours, layout, animations and details, taken screen by screen from `8e`'s map. ⚠️ **What a shopkeeper sees is his call** — so the session walks him through the situations first, asks, then builds. **Sized by `8e`, not now** | **size it** | `8e` |

⚠️ **Not in the day, and on purpose**: `5R-a` is the owner's to do (enrolment), and the
**4 October re-deploy** in ⏳ DATES OWED still stands — with `5R-a`/`5R-b` done it disappears for good.

---

## The other edges — what the pilot must LEARN, and it builds nothing

⚠️⚠️ **WRITTEN 2026-09-21 BECAUSE IT WAS MISSING, AND THE OWNER HAD TO ASK TWICE.**
His brief of 2026-09-21 had five numbered points; the realignment earlier that day
answered four of them and **silently dropped 4.5** — *"understand the needs for the
other edges (Monitoring, Couriers, Restaurants) to ask for more funding."* He then
asked, in terms, whether the prompt had been read. It had not been read closely
enough. This section is that point, and it is also the answer to his point 1 —
*"the plan … doesn't have the focus of continuous integration for the other things I
mentioned."*

⚠️ **NOTHING HERE IS A TASK AND NOTHING HERE SHIPS.** It is a register: what the pilot
must **observe** so that the next round's engineering can be specified from evidence
instead of from imagination. Every answer below comes out of WhatsApp, a spreadsheet
and a notebook — **the owner already has the retailers and one courier**, so the
observations can start before the app can capture anything.

⚠️⚠️ **THE ONE ARCHITECTURAL FACT THAT SHOULD NOT ARRIVE AS A SURPRISE LATER: every
edge below is a SECOND TENANCY MODEL.** This schema has `staff`, `manager` and
`owner`, and all three live *inside one shop*; RLS is built so that one workspace can
never read another's rows, and there is a test suite whose only job is proving it. **A
courier who sees several shops' pickups, or a restaurant that sees a retailer's
surplus, is the exact inverse of that** — see §6's *"cross-workspace analytics schema"*
and *"collection-partner notifications"*, the two deferrals that touch this. **It is
not a screen on this app. It is the largest single decision the funding round buys**,
and the register below is what makes that decision cheap when it comes.

| Edge | What the pilot must come back with | Why it cannot be specified now |
|---|---|---|
| **Couriers** | Runs completed per day by one person; minutes per pickup and per drop; the route actually walked or driven; **cost per run against gross margin per run**; how often a pickup fails and why; whether anything needed cold chain; how the courier is paid and settled | **Capacity is the whole scaling model.** Every projection for 10 couriers multiplies a number nobody has measured once. One courier for three weeks produces it |
| **Restaurants** | What they will actually buy and what they refuse; **the discount that closes a sale**; how much lead time they need and by what hour of the day; typical order size; repeat rate across weeks; who in the kitchen decides; payment terms they expect | **A marketplace is worthless if the demand side is thin**, and nothing in the retailer's data can tell you what a chef will buy. Four or five relationships over a month answers it |
| **Retailers** *(supply side)* | The discount they will accept to move stock **before** it is waste; how much notice they need; whether they will hold something aside; **and the acquisition question — did the waste offer bring them in, and did they stay for the numbers?** | This is the hook's central claim and it is currently an assumption. The app measures whether they RECORD; only conversation measures whether they SELL |
| **Monitoring** | ⚠️ **AMBIGUOUS IN THE BRIEF AND DELIBERATELY NOT GUESSED AT.** Two readings: (a) the OPERATOR console — the owner watching which shops have surplus today, what moved, which runs happened; or (b) SYSTEM monitoring — uptime, failed writes, dead letters, whether a shop stopped recording. **Both are real needs and they are different products** | ⚠️ **Reading (b) partly exists already and nobody has said so:** §2.10 specifies a nightly check, `failed_write` is a vendor-side surface by §2.8, and `5c-iv`'s dead-letter banner is its merchant-facing half. **Reading (a) is the operator console and is genuinely unbuilt.** ⚠️⚠️ **This is a question for the owner, and it is NOT in ⛔ DECISIONS OWED because it blocks nothing today** — it blocks the funding ask, not the pilot |

**How to use this register.** Add to it as the pilot runs — one line per observation,
dated. ⚠️ **It is deliberately a REGISTER and not a status board**: nothing here has a
state, a size or a gate, because nothing here is being built. When the funding ask is
written, this section is the evidence; when the next architecture decision is taken,
this section is the input it was missing.

⚠️ **The honest sequencing point, repeated here because it is the one that decides
whether the money arrives:** three of the four rows above can be filled in **starting
this week**, with no app at all, and none of them gets faster by waiting for the build.
The engineering queue and the observation register should run in parallel, or the
three-to-four weeks of operating evidence lands *after* the software instead of
alongside it.

---

## Working agreement

One task per session. Before starting, estimate difficulty. Update this file when a
task closes — a plan that lags the code is the failure ADR-035 §9 names.

⚠️⚠️ **AMENDED BY THE OWNER 2026-09-24 — AN `M` OR AN `L` IS ONE SITTING NOW:**
*"we'll make an ammendment now that we have Claude Max, if a task is M or L, let's do
it at once, we have enough usage and space to do it."* **The old rule split anything
large; this one splits `XL` and above.**

⚠️ **THE PREMISE OF THE OLD RULE WAS A BUDGET AND IT HAS CHANGED, WHICH IS WHY THIS IS
AN AMENDMENT AND NOT A LOOSENING.** *"so the work survives a usage limit or a context
clear"* — the splitting was never about the work being clearer in halves, it was about
half-finished work being lost. A plan is a poor place to carry a subscription tier's
constraint after the tier has moved.

⚠️⚠️ **WHAT DOES NOT CHANGE, AND IT IS THE HALF THAT PAID FOR ITSELF: THE SIZING PASS
STAYS.** Sixteen of the seventeen splits in this project were preceded by an estimate
that **found something the row did not say**, and the finding — not the split — is what
those sessions were worth. `5f`'s sizing found the cart store §2.11 had already chosen,
the quantity control's contradiction with the ADR, and a commit payload that would have
hard-coded a gross/net identity. `5f-iii`'s, the same morning, found that the basket
sheet is the screen §2.5 rule 5 is written about. **None of those needed a split to be
worth taking; they needed somebody to look before writing.** So: estimate first, write
down what the estimate found, and then build the whole row.

⚠️⚠️ **AND A SPLIT MAY STILL HAPPEN AT `M` OR `L` — FOR A REASON THAT IS NOT SIZE, AND
IT MUST SAY SO IN ITS OWN WORDS.** Three survive the amendment, because none of them is
about how long a sitting is:

1. **A GATE.** Half the row is blocked on a decision the owner owes or an ADR amendment
   he has not made, and the other half is not. `5f-ii` was gated and `5f-i` was not;
   splitting is what let the unblocked half ship the same day.
2. **TWO FAILURE CLASSES IN ONE ROW, one of which nothing here can see.** This is
   `5c-iv`'s, `5d-iv`'s, `5e-iii`'s and `5f-iii`'s argument, and it is the strong one:
   when a row carries work whose mistakes cost a glance AND work whose mistakes are
   silent — the ledger, the queue — one row means **the invisible half rides in on the
   back of the visible one**, and it is reviewed as though somebody had looked at it.
3. **THE DEFERRAL TEST BELOW**, which already splits a row whose look-questions cannot
   be answered yet from the half that can be built today.

⚠️ **A size-only split at `M` or `L` is now the thing to refuse**, and a session that
wants one is asking for the old rule back. ⚠️ **`XL` still splits on size alone** —
`5f` listed twenty deliverables across a store, two screens and a question the owner
owed, and no premise about usage made that one row.

Every schema claim must be traceable to a migration CI has applied. A file is not
evidence; a green CI run is.

⚠️⚠️ **AND ITS COUNTERPART, RULED BY THE OWNER 2026-09-22: A ROW WHOSE ONLY
INSTRUMENT IS HIS EYES WAITS UNTIL THERE IS SOMETHING TO LOOK AT.**
*"If it's better for us to build something that needs to be looked at after we have
what's needed to actually look at it, let's keep it deferred."*

`R9` already routes a deliverable no check can see to the task that can see it. This
is the ordering half of the same sentence, and it was ruled the day `5c-iv-b`
demonstrated the gap: that task shipped a banner whose look is fenced out of every
suite by §2.11 — so the owner's phone is its whole instrument — **and nothing in this
app enqueues anything until `5f`, so the outbox is always empty and the banner never
draws.** It was reported as *"goes to the owner's phone"* when it could not.

**The test is two questions, and BOTH must be yes to defer:**

1. Is every judgement left in this row one no check here can make — rendering,
   navigation, layout (§2.11)?
2. Is the state it draws **unreachable today**, because the thing that produces that
   state has not been built?

⚠️ **One yes is not enough, and conflating them would stop the wrong work.** `5d` and
`5e` draw the catalog, which already exists: they answer *yes* to (1) and *no* to (2),
and they are takeable the moment they come up — the owner can open the app and look.
⚠️ **A row with real arithmetic in it is not deferred for the half that has a suite**;
`5c-iv-b`'s pricing was falsifiable here and 29 assertions read it. **What defers is
the part only an eye can settle.**

⚠️ **This is NOT a reason to revert `5c-iv-b`.** It is merged, green and correct, and
throwing away checked work buys nothing when the alternative is the same code written
later. **What it changes is where the look-questions are answered**: they move onto
`5f`'s row rather than being put to the owner blind, and they are listed there.
