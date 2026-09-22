# Archived status log — the 2026-09-20 working day

⚠️ **THIS IS PART OF THE PLAN, NOT A BACKUP OF IT**, and it is **closed, not wrong**
— the same distinction as [`steps-0-to-4.5.md`](steps-0-to-4.5.md),
[`status-log-through-2026-09-18.md`](status-log-through-2026-09-18.md) and
[`status-log-2026-09-19.md`](status-log-2026-09-19.md), and the opposite of
`archive/power-platform/`, which describes a system nobody is building. Every entry
here was true when it was written and still describes this system.

Cut out of `## Position` in `docs/PLAN.md` on 2026-09-22, the **third** cut of that
section. **Nothing was edited, summarised or reordered** — these are the original
lines in their original order, and the split was verified by rebuilding the source
file and confirming it came back **byte-identical**.

⚠️⚠️ **IT WAS NOT APPENDED TO `status-log-2026-09-19.md`, AND THAT FILE WAS NOT
RENAMED TO SWALLOW IT.** One working day per file is the rule `docs/plan/archive/`
already follows, and the plan's own history names these files by name — renaming for
tidiness makes a recorded statement false. ⚠️ `plan-corpus.sh` globs
`docs/plan/archive/*.md`, so a new file needs **no wiring at all**.

⚠️ **THE CEILING CALLED THIS CUT RATHER THAN ANYBODY NOTICING**, for the second time:
`plan-handover.sh` assertion 11 failed at **1,423 lines** against its 1,400 ceiling
while `5c-iv-b` was closing. **This is the check working as designed.**

---

✅✅ **`5c-iii` IS DONE AS OF 2026-09-20 — A WRITE THAT CAN NEVER LAND NOW
LEAVES THE QUEUE, AND THE SHELF FOLLOWS IT. `5c-ii-b` IS THE NEXT TASK, AND IT
CANNOT BE STARTED UNTIL TOMORROW.** No migration, no screen, and still nothing a
person can see — but this is the first half of `5c` that **changes the ledger**.

**The next task first, because it is the part that changes what a cleared
session does.** `5c-iv` became takeable the moment this closed, and it is NOT
marked next: it DRAWS the connectivity signal `5c-ii-b` produces, so taking the
chrome first is the exact ordering the split's own argument refuses. `5c-ii-b`
is therefore next and ⚠️ **it is gated on an instrument, not on code** — the
`5a-iv-d` day-8 reading due **2026-09-21**, already in the ⏳ DATES OWED block,
and opening the app before it restarts the measurement. **It is takeable the
moment that reading is in**, which is tomorrow.

**What shipped, four files plus two checks:**

| | |
|---|---|
| `app/src/api/deadletter.ts` | the eleventh `src/api/` module — the classification, `record_failed_write`'s name and its seven `p_` arguments, the payload handed over UNTOUCHED, and which kinds the server downgrades |
| `app/test/api-deadletter.test.ts` | 26 assertions over the classification and the two readers |
| `app/src/api/flush.ts` | a fifth port and one branch: report, then reject, then **carry on draining** |
| `app/src/api/outbox.ts`, `app/src/lib/outboxDb.ts` | `workspaceId` on a queued write, and SQLite schema **version 2** — the first walk of the migration path `5c-i` built before anything needed it |
| `docs/checks/5c-iii-dead-letter-contract.sh` | 9 assertion groups over REAL HTTP against a real shop, as a real signed-in owner |
| `docs/checks/5c-iii-dead-letter-contract-falsify.sh` | 11 fixtures — six drift a NAME and meet a 404, five drift a JUDGEMENT and meet a database that disagrees |

⚠️⚠️ **TWO CODES WERE MEASURED RATHER THAN REASONED ABOUT, AND A CAREFUL SESSION
WOULD HAVE GOT BOTH WRONG. THEY ARE THE TASK.**

**The first: `TD002` — *"not enough stock"* — is the most permanent-looking
refusal in the schema and it is CLEARED BY THE VERY NEXT RETRY.** `0017` and
`0020` both guard the availability check with `if v_enforce and not v_offline`,
and the flush sets `recorded_offline` from `attempts > 1`. So the second attempt
skips the very check that raised. ⚠️ **Measured, not argued**: the same uuid
with the same lines was refused `TD002` online and came back `200` with a
`sale_id` offline, seconds apart. Dead-lettering it would have downgraded a sale
that was about to be recorded IN FULL — the stock reconciled and the money gone
from Números, silently.

**The second: `42501` is §2.6's own example of a PERMANENT failure and is also
what an expired session looks like app-wide** (`@/api/errors` maps it to *"tu
sesión se cerró"*). Dead-lettering the second reading is a whole queue
downgraded the first time a token goes stale in a shop with no signal. ⚠️ **They
are distinguishable and that was measured**: a refusal raised inside the
function is `42501`/403; an unusable token is `PGRST301`/401 and never reaches
the body. Assertion 5 drives both and reads the codes back, so the day that
stops being true, the reason the entry exists goes red instead of going quiet.

⚠️ **AND THE SHELL TRAP FROM THIS MORNING BIT AGAIN, IN THE SAME SHAPE AND IN A
NEW FILE.** A JSON body written inline inside a nested `$( )` brace-expands into
two arguments and PostgREST answers `PGRST102`. The check's first run therefore
reported that *"a deleted variant raises PGRST102, which the app retries"* — a
shell bug wearing a schema bug's clothes, and one that, believed, would have put
`PGRST102` on the permanent list as a real code. **Every body is now built into
a variable first**, and the comment saying why is in the file.

**DECISIONS TAKEN ON THE OWNER'S BEHALF — no migration, no seed, all client-side
and all cheap to reverse. ⚠️ The first three are the ones worth his eye:**

| | Decision | Why | Reversal |
|---|---|---|---|
| **1** | ⚠️⚠️ **THE CLASSIFICATION IS AN ALLOW-LIST OF PERMANENT CODES — AN UNRECOGNISED FAILURE RETRIES** | The two ways to be wrong are not symmetrical. A transient failure dead-lettered is a sale downgraded that would have arrived on its own: the ledger moves, the margin goes quiet, and nobody is told. A permanent one retried forever is a sale that never lands and, with the drain stopping at the first transient failure, everything behind it blocked — bad, **and lossless**: the row is still on the phone in full, and `5c-iv`'s banner is about to count it. ⚠️ It is `landedFrom`'s own rule one level out: an unreadable reply is a retry there, an unrecognised refusal is a retry here | One `default:` branch |
| **2** | ⚠️⚠️ **THERE IS NO ATTEMPT CEILING, AND ITS ABSENCE IS THE DECISION** | *"Dead-letter after N tries"* is the obvious way to stop an unrecognised failure blocking the queue forever, and on **this** shop it is the wrong one: [[pilot-store-is-offline-a-lot]], offline is the normal write path (§2.6), and a ceiling counts a week of no signal as a permanent rejection — downgrading a shelf that is perfectly fine because the wifi was out. **It turns the commonest condition in the shop into the rarest and most expensive outcome** | Add a counter |
| **3** | ⚠️⚠️ **A QUEUED WRITE CARRIES ITS OWN `workspace_id`, WHICH IS A NEW SQLITE COLUMN** — rather than the flush reading whatever shop is open | `record_failed_write` is the ONLY function on this path that takes a workspace, and it validates it; no `record_*` takes one at all. `0001:317` admits many shops per person from day one, so *"the current shop"* files a sale queued in shop A against shop B **and downgrades B's shelf for a sale that never happened there**. ⚠️ Nothing on any phone is lost: the queue is provably empty today, because no screen enqueues anything until `5f`–`5h` | A fifth port and one `alter table` |
| **4** | **REPORT FIRST, REJECT SECOND — a failed report is an ordinary retry** | `dead` is terminal from the device (§2.6: replay is manual), so a row marked dead before the server confirmed is a sale that exists nowhere: off the queue, off the ledger, with no `failed_write` row for §2.10's nightly check to find. **The only outcome in the whole queue that loses a sale outright** | Swap two statements |
| **5** | **A dead-lettered row does NOT stop the drain** | It has LEFT the queue, so there is nothing behind it to block. `5c-ii-a`'s decision 1 named the cost of stopping — *"a row that can never succeed blocks every write behind it"* — and this is the half that removes the row rather than the half that loosens the rule | One `return` instead of a `continue` |
| **6** | ⚠️ **`reportedFrom` THROWS where `landedFrom` RETURNS**, on a reply it cannot read | Opposite choices for opposite failures. An unreadable reply from `record_sale` read as *"did not land"* costs a free retry; the same reply from `record_failed_write` read as *"filed"* marks the row `dead` with nothing holding it | One branch |
| **7** | **The dead letter names its store explicitly, and for a transfer that is the ORIGIN** | `record_failed_write` defaults the location out of `payload->>'location_id'`, which a transfer's payload does not have (`0020` takes `from_`/`to_`). A dead-lettered transfer would land with a NULL location, and §2.10's nightly check reads `failed_write` by workspace and kind to price unrecorded revenue: a row it cannot attribute to a store is a row nobody can act on | One key in a list |
| **8** | **`PGRST202` and `XX000` are TRANSIENT, deliberately** | Both are OURS — an app/schema disagreement and a *"should be impossible"* raise — and both are fixed by a deploy or a migration, at which point the retry works. Dead-lettering them converts one bad release into a silently downgraded ledger **in every shop at once**, and `record_failed_write` may be equally unreachable anyway | Two entries |

⚠️ **WHAT NO CHECK HERE LOOKED AT, NAMED RATHER THAN LEFT TO BE FOUND:** the
SQLite half again. `@/lib/outboxDb` imports a native module, so no node process
loads it — the `alter table`, the `user_version` bump and the dropped row with
no workspace are asserted by nothing and argued in the file instead. ⚠️ **The
first thing that will exercise them is a device**, and the earliest that can
happen is the re-deploy already dated **2026-09-27**. ⚠️⚠️ **AND THE APP WAS NOT
OPENED ON EITHER INSTRUMENT** — the dated obligations above are a reading, and
opening the app restarts the measurement.

**Evidence: 530 Vitest assertions over 25 files (was 493 over 24), of which 26
are the new classification and 11 the new drain branch;
`docs/checks/5c-iii-dead-letter-contract.sh` — 9 assertion groups over real HTTP
against a live database, with its own anti-vacuity floor;
`5c-iii-dead-letter-contract-falsify.sh` — 11 fixtures, ten red for the stated
reason and one deliberately green; `conventions-gate.sh`'s 16 groups over 47
source and 25 test files (was 46 and 24) plus its own 30 fixtures;
`handbook-agreement.sh`'s 5 groups and `plan-handover.sh`'s 11, both re-run
because this session edited both files they read; `split-coverage.sh` over nine
specs; a typecheck of the whole workspace.**

✅✅ **`5c-ii` WAS SPLIT IN TWO AND `5c-ii-a` IS DONE, BOTH ON 2026-09-20 — A
QUEUED SALE CAN NOW BE SENT, AND SENDING IT TWICE IS STILL ONE SALE. `5c-iii` IS
THE NEXT TASK.** No migration, no screen, and still nothing a person can see.

**The split first, because it is the part that changes what the next session
takes.** `5c-ii` was an `M/L` covering two jobs — **what a flush DOES** and
**WHEN one runs** — and the second could not be started at all on 2026-09-20.
Choosing between `expo-network` and `@react-native-community/netinfo` is a
reading on two devices (the sizing of `5c` said so in terms), and **both iOS
instruments were unavailable**: `xcrun simctl` is not installed on this Mac
(Command Line Tools only, checked rather than assumed) and the owner's iPhone is
holding the `5a-iv-d` day-8 reading due **2026-09-21**, which opening the app
restarts. ⚠️ **Taking the whole row today meant either guessing the dependency
off two changelogs or spending tomorrow's reading on it.** The split costs
neither: `5c-ii-a` needs no device, and `5c-ii-b` is takeable the moment the
day-8 reading is in.

**What shipped, four files plus two checks:**

| | |
|---|---|
| `app/src/api/flush.ts` | the tenth `src/api/` module: the drain order, single-flight, `recorded_offline`, the `occurred_at` fallback, the RPC per kind, and the whole loop over four injected ports |
| `app/test/api-flush.test.ts` | 31 assertions over that loop — §2.11 names the outbox state machine as a thing a client unit test may pin, and the drain is that machine being driven |
| `app/src/api/calls.ts` | one new wrapper, `sendQueuedWrite` — four `record_*` functions behind one call, because a flush does not know its kind until it reads the row |
| `app/src/lib/flushRunner.ts` | the only module that binds the four ports to the real queue and the real client, and the app's ONE flusher |
| `docs/checks/5c-ii-a-flush-contract.sh` | 9 assertion groups over REAL HTTP against a real shop, as a real signed-in owner |
| `docs/checks/5c-ii-a-flush-contract-falsify.sh` | 9 fixtures, every one of which drifts a name in `@/api/flush` and demands the check meet the 404 a shop would |

⚠️⚠️ **THE FINDING THAT WOULD HAVE COST A DAY IN NÚMEROS AND NOTHING ANYWHERE
ELSE: AN OFFLINE WRITE WITH NO `occurred_at` IS SILENTLY RE-DATED TO THE MOMENT
OF THE FLUSH.** `0025`'s offline branch is `greatest(least(coalesce(p_occurred_at,
v_now), v_now), v_now - interval '72 hours')` — so the *omission* of a time is
not refused, it is **defaulted to `now()`**, and a sale rung up at 09:00 without
signal and drained at 14:00 counts on the wrong day with nothing raising on
either side. The queue already holds the answer (`queuedAt`, written by
`queueWrite` from the device's clock), so the flush sends it whenever the payload
carries none. ⚠️ **It is measured rather than argued** — assertion 7 of the
contract check drives the null case and reads `now()` back, so the day this stops
being true, the reason the fallback exists goes red instead of going quiet.

⚠️ **AND THE `p_` PREFIX IS THE CONTRACT, WHICH IS NEW HERE.** Every other
`src/api/` module writes its argument names out as literals. This one builds them
— `p_` plus the payload's own keys — because `0024` decision 5 stores the payload
keyed by argument name with **no prefix** and `0026` reads it that way. So a
single character decides every argument at once, and assertion 4 sends the bare
`location_id` on purpose to prove the prefixed one is not merely a habit: the
bare name is `PGRST202`.

**DECISIONS TAKEN ON THE OWNER'S BEHALF — no migration, no seed, all client-side
and all cheap to reverse. ⚠️ The first two are the ones worth his eye:**

| | Decision | Why | Reversal |
|---|---|---|---|
| **1** | ⚠️⚠️ **THE DRAIN STOPS AT THE FIRST FAILURE** rather than trying every row | The overwhelmingly common failure is no signal, where every later row fails identically — and stopping keeps the ledger's order the shop's order, which oldest-first exists for (a sale allocates FEFO against the shelf, so the order writes land in is the order cost is attributed in). ⚠️ **WHAT IT COSTS, NAMED RATHER THAN HIDDEN: a row that can never succeed blocks every write behind it.** That is exactly what `5c-iii` fixes, and it is why `5c-iii` is now marked next rather than `5c-ii-b` | One `continue` instead of a `return` |
| **2** | ⚠️ **`5c-iii` IS THE NEXT TASK, NOT `5c-ii-b`** — a re-ordering inside today's own split | `5c-ii-b` cannot be finished before tomorrow's reading, and `5c-iii` became takeable the moment the send existed. It is also the half that un-blocks the queue, per decision 1 | Swap the marker; neither task has been started |
| **3** | **A row left `flushing` by a process that died is RE-QUEUED at the start of the next flush** | The app is killed mid-send and the row stays claimed forever — a sale lost on the device with nobody to notice. Re-sending is free even if it already landed: the uuid answers `already_recorded`. ⚠️ Safe only inside the single-flight gate, where a `flushing` row provably belongs to nobody — and `advance` needed no new event, because `retry` already says exactly this | Drop the `stale()` pass |
| **4** | **`p_replay_of_failed_write_id` is stripped from every payload, by name** | `0025` fences it at `manager` and exempts the write it marks from BOTH the 72-hour clamp and the 15-minute void window. A flush that forwarded one out of a payload would hand a cashier both. ⚠️ Assertion 9 proves the argument is real and WOULD be accepted, so the exclusion is a decision rather than a no-op | One name in a list |
| **5** | **An unreadable reply is a RETRY, not a success** | If the server committed, the re-send answers `already_recorded`; if it did not, the write finally lands. Reading an unrecognisable object as a success is the only version of this that can lose a sale | One branch in `landedFrom` |
| **6** | **One wrapper for all four `record_*`, not four** | A flush does not know which kind it holds until it reads the row, so four wrappers would need a fifth thing to choose between them — which is the mapping `RECORD_RPC` already is, in a module the suite can read (`R13`) | Four wrappers and a switch |

⚠️ **WHAT NO CHECK HERE LOOKED AT, NAMED RATHER THAN LEFT TO BE FOUND:** the SQL
in `@/lib/outboxDb` and the binding in `@/lib/flushRunner`. Both import native
modules, so no node process loads either; the suite drives fakes and the contract
check drives real HTTP with no SQLite anywhere. ⚠️ **The first thing that will
exercise the two together is a real device, and that is `5c-ii-b`'s business.**
⚠️⚠️ **AND THE APP WAS NOT OPENED ON EITHER INSTRUMENT** — the dated obligations
above are a reading, and opening the app restarts the measurement.

**Evidence: 493 Vitest assertions over 24 files (was 462 over 23), of which 31
are the new drain; `docs/checks/5c-ii-a-flush-contract.sh` — 9 assertion groups
over real HTTP against a reset database, with its own anti-vacuity floor, which
caught itself expecting 10 groups and running 9 on its first run;
`5c-ii-a-flush-contract-falsify.sh` — 9 fixtures, all red for the stated reason
and one deliberately green; `conventions-gate.sh`'s 16 groups over 46 source and
24 test files (was 44 and 23) plus its own 30 fixtures; `split-coverage.sh` over
NINE specs including the new `5c-ii.split`, and `split-coverage-falsify.sh` at
451 fixtures (was 409), 41 of them generated for this split; a typecheck of the
whole workspace.**

⚠️⚠️ **TWO DEFECTS IN THE NEW CHECK WERE FOUND BY ITS OWN HARNESS, AND BOTH WERE
THE SAME SHAPE `5b-i`'s HARNESS FOUND IN ITS SISTER: RED FOR THE WRONG REASON.**
The check read the argument names by grepping for the spellings it expected — so
renaming one in the app made it report *"could not read the contract"* instead of
meeting the 404. A check that greps for the name it expects can only ever say
*"not found"*, and the defect it exists for is a name that CHANGED. Every name is
now read as a spelling and every request is built from what was read, so all nine
fixtures go red through the database. ⚠️ A third defect was a shell one: a JSON
object written inline inside a nested `$( )` loses its quoting and bash
BRACE-EXPANDS it into two arguments, which PostgREST answers `PGRST102 Empty or
invalid json` — a shell bug that reads exactly like a schema bug.

✅✅ **`5c-i` IS DONE AS OF 2026-09-20 — THE QUEUE EXISTS, AND NOTHING IN IT
TALKS. `5c-ii` IS THE NEXT TASK.** No migration, no screen, and **nothing a
person can see** — which the split said in advance and is worth reading as a
prediction that held rather than as an apology.

A sale can now be written down on the phone the instant it is made, with its own
permanent uuid, and left there. Nothing sends it yet.

**What shipped, seven files:**

| | |
|---|---|
| `app/src/api/outbox.ts` | the ninth `src/api/` module and **the first whose subject is not an RPC** — the four kinds `0024` allows, the three states §2.6 names, `queueWrite`, and `advance`, the transition function |
| `app/src/lib/outboxDb.ts` | the only module that opens the queue's SQLite file — the table, a `PRAGMA user_version` migration path, `insert or ignore`, and a read that drops a row it cannot parse |
| `app/src/lib/ids.ts` | three lines, alone, because `expo-crypto` is native and one import of it would make every suite that touches the outbox unloadable |
| `app/test/api-outbox.test.ts` | 20 assertions over the state machine — **§2.11 names it, by decision, as a thing a client unit test may pin** |
| `app/test/auth-errors.test.ts` | one new assertion: **expo-sqlite has exactly two openers** |
| `app/package.json`, `docs/CONVENTIONS.md` | the dependency, and the three new rows on `R12`'s boundary table |

⚠️⚠️ **THE FINDING THAT WOULD HAVE COST A WHOLE TASK TO DISCOVER LATER: THE
PAYLOAD SHAPE WAS NEVER OURS TO CHOOSE.** `0024`'s decision 5 says
`failed_write.payload` is *"the original call's arguments, KEYED BY ARGUMENT
NAME"*, and `0026` reads that object directly — `payload->'lines'`,
`payload->>'occurred_at'`, `payload->>'recorded_offline'`,
`payload->>'provider_id'`, `payload->>'from_location_id'`. ⚠️ **Note what is
not there: the `p_` prefix.** So a queued write stores arguments in `0026`'s
spelling, `5c-iii` hands the object to `record_failed_write` untouched, and
replay works. ⚠️⚠️ **Storing `p_`-keyed arguments instead — which is what `R13`
reads like at a glance, because every other module in this directory owns `p_`
names — would typecheck, store, flush and dead-letter perfectly, and be
discovered on the day somebody first tried to REPLAY one.** Both migrations are
applied and append-only, so the fix would have been a migration, not an edit.

⚠️ **C10.3 IS NOW STRUCTURAL RATHER THAN PROMISED, AND A TEST READS IT.** The
split argued that *"the slide looks identical offline"* is discharged by the
write path, not by a screen. It survives only while `queueWrite` returns a ROW
instead of a promise: the moment it can be awaited, a screen can wait for it,
and there is an offline path that looks different. §2.11 means no suite here
could ever see that on a screen — so the assertion sits where it is structural,
and it is the one place in this repository where a C-number is pinned by a type.

**DECISIONS TAKEN ON THE OWNER'S BEHALF — no migration, no seed, all cheap to
reverse:**

| | Decision | Why | Reversal |
|---|---|---|---|
| **1** | ⚠️ **One new dependency — `expo-crypto`** (`~57.0.2`, the SDK-matched version), for `randomUUID` | React Native ships no `crypto` global — **checked on 0.86.3, not assumed** — so there was nothing to fall back to. ⚠️ **And the reason is not secrecy**: this uuid is a primary key in two Postgres tables across every phone in every shop, and a collision is not a failed write, it is `on conflict (id) do nothing` deciding somebody else's sale is this one and answering `already_recorded: true`. A `Math.random` uuid is the cheap version of exactly that risk | Remove the import; it has one caller |
| **2** | **A separate SQLite FILE for the queue**, not a table beside the session's store | Clearing a session must never be the thing that drops a queued sale, and a corrupt session and a corrupt queue should be two accidents rather than one | One constant |
| **3** | ⚠️ **A `PRAGMA user_version` migration path from version 1**, before anything needs it | The app is already installed on the owner's phone. `5c-ii` and `5c-iii` will each want a column, and inventing a schema-change path against a device that is already holding sales is the expensive version of ten lines | Delete the function |
| **4** | **A row the reader cannot parse is SKIPPED, not thrown on** — and it stays in the table | Throwing would let one unreadable sale stop every other sale on the phone from ever being sent. Nothing is destroyed, so `5c-iii` can still find it. Same choice `@/api/approvals` made for a server row it could not read | One `continue` |
| **5** | ⚠️ **`dead` is terminal from the device** | §2.6: *"replay is manual, never automatic"*, by a person who has seen the peso figure first. A device that can re-queue its own dead letter is that ruling undone in the one place nobody is looking | One branch in `advance` |

⚠️ **WHAT NO CHECK HERE LOOKED AT, NAMED RATHER THAN LEFT TO BE FOUND:** the
SQL. `@/lib/outboxDb` imports `expo-sqlite`, so no node process can load it —
the table, the `insert or ignore` and the skipped row are asserted by nothing
and are argued in the file instead. ⚠️ **The first thing that will exercise
them is `5c-ii`**, and that is the task that should decide whether this half
earns an instrument of its own. ⚠️ **AND THE APP WAS NOT OPENED ON EITHER
INSTRUMENT** — the dated obligations above are a reading, and opening the app
restarts the measurement, so `expo-crypto` is in the manifest and has never run
on a device. The next re-deploy, already dated 2026-09-27, is the first build
that will carry it.

**Evidence: 462 Vitest assertions over 23 files (was 441 over 22), of which 20
are the new state machine; `conventions-gate.sh`'s 16 groups over 44 source and
23 test files (was 41 and 22) and its own 30 fixtures; a typecheck that also
proves the workspace still resolves `expo-crypto`. ⚠️ AND THE ONE NEW BOUNDARY
ASSERTION WAS FALSIFIED BY HAND rather than trusted: an `import 'expo-sqlite'`
added to `lib/env.ts` turned it red naming the third opener, and was removed.**

✅✅ **`5c` IS SIZED `XL` AND SPLIT FOUR WAYS AS OF 2026-09-20, BEFORE A LINE OF IT
WAS WRITTEN. `5c-i` IS THE NEXT TASK.** No migration, no product code, no screen —
the session's whole output is a split, a spec and this entry.

⚠️ **The file carried `5c` as an `L` and it is an `XL`.** Fourteen deliverables
across four layers that fail in four unrelated ways: a durable queue on a phone, a
transport, a failure path that writes to the ledger, and three pieces of chrome.
**Three of the four are falsifiable end to end and the fourth is not**, which is
what says a row is four tasks rather than one with sections. The full argument, the
seam and the failure-mode table are in *"Sized 2026-09-20"* under Step 5.

| | | Size |
|---|---|---|
| `5c-i` | The outbox, and nothing in it talks — the table, the three states, the uuid, the enqueue | `M` |
| `5c-ii` | The flush, and the retries the uuid makes free | `M/L` |
| `5c-iii` | The writes that will never land, and the only half that changes the ledger | `M` |
| `5c-iv` | What a person sees | `M` |

⚠️ **The split is a SPEC, not a guard** — `docs/checks/specs/5c.split`, ~65 lines of
data, under the procedure `docs/HANDBOOK.md` records and the one most likely to
regress because the old way was done seven times. `app.yml` already matches
`specs/**`, so there was nothing to wire.

⚠️⚠️ **AND THE FALSIFIER CAUGHT A DEFECT IN THE SPEC ON ITS FIRST RUN, WHICH IS WHAT
IT IS FOR AND WHICH ADDS A RULE.** The classification deliverable was written
`[Tt]ransient` against a row that said *"**Transient** against permanent … and a
**transient** one dead-lettered"*. Fixture `S5` strips **the first match's literal
text** out of the owner's row — `Transient` — and the lower-case spelling survived,
so **the engine went GREEN on a deliverable the fixture had just deleted**, and `S7`
went red for the shallower reason. ⚠️ The rule already written down is *use a bracket
class, never an alternation*; the one this adds is **a case-tolerant class must not
match two different spellings inside one row**. ⚠️ **Nothing but the falsifier could
have seen it** — `split-coverage.sh` itself was green on the broken spec, which is
the exact shape of a guard that reads as working.

**DECISIONS TAKEN ON THE OWNER'S BEHALF — all client-side, all cheap to reverse, and
two of them are worth his eye:**

| | Decision | Reversal |
|---|---|---|
| **1** | **`5c` re-sized `L` → `XL`**, four children rather than three, the fourth being the chrome nothing here can measure | One letter |
| **2** | ⚠️⚠️ **`recorded_offline` is decided AT FLUSH** — a write carries it when it was not committed on its first attempt, rather than from what the device believed about connectivity. **It decides which day a sale counts on in Números** | One condition, client code |
| **3** | ⚠️ **C10.3 is discharged by the write path, not by a screen.** If enqueuing is the only way to write, the screen is never told whether it was offline, so there is no second wording to add | Let a screen await the RPC |
| **4** | **The outbox is a real SQLite table**, not another key in the `localStorage` shim — a queued sale is not a per-phone preference | A new module beside the old one |
| **5** | ⚠️ **The dead-letter banner is manager-and-above**, derived from §2.7, the 1.3a cost rule and C10.5 rather than parked as a question | One condition |

⚠️⚠️ **AND ONE STALE SENTENCE WAS FIXED INSIDE ADR-035 ITSELF — THE NINTH STALE COPY
RECORDED HERE AND THE FIRST IN THE FILE EVERY OTHER FILE DEFERS TO.** §2.6 still
said the outbox *"is a named deliverable of build step 5a"*, while §3 has said since
the amendment of 2026-09-13 that it **moves to `5c`**. `CLAUDE.md` tells a cleared
session the ADR wins — so the ADR was telling it to build the outbox in a step that
closed on 2026-09-12. ⚠️ **This is not a new amendment and was not treated as one**:
the decision was the owner's, on 2026-09-13, and §2.6's sentence was simply missed in
that pass. It now points at `5c` and says which revision moved it.

⚠️ **WHAT A CLEARED SESSION IS MOST LIKELY TO GET WRONG, AND THE OWNER SHOULD HEAR
IT RATHER THAN DISCOVER IT: `5c-i` HAS NO CALLER AND IS SUPPOSED TO.** Nothing in
this app writes a sale, a purchase or a waste yet — `5f`–`5h` are those screens.
**So `5c-i` through `5c-iii` change nothing on his phone**; the first visible thing
in this step is `5c-iv`.

**Evidence: `split-coverage.sh` over the new spec — 7 assertion groups, 14/14
deliverables in exactly one child each, 4 required sentences, every child stating it
ships no migration; `split-coverage-falsify.sh` generating its fixtures from that
spec; all 8 specs green together; `plan-handover.sh` 11 groups and
`handbook-agreement.sh` 5 groups, both re-run because this session edited both files
they read.** ⚠️ **No product code changed, so no app suite could have been affected,
and the app was NOT opened on either instrument** — the dated obligations above are
a reading, and opening the app restarts the measurement.

✅✅ **`## Position` WAS CUT A SECOND TIME, 1,241 LINES TO 465 — 2026-09-20. `5c` REMAINS
THE NEXT TASK.** No product code, no migration, nothing about the app changed. ⚠️ **The
ceiling called this, not a person**: `plan-handover.sh` assertion 11 trips at 1,400 and
Position had reached **1,241 three sessions after the first cut** — 83% of the ceiling in
two days, which is the same growth rate that took it to 5,484 last time. **Caught early
instead of late, which is the whole reason the number exists.**

⚠️ **THE RULE WAS ALREADY WRITTEN AND WAS SIMPLY APPLIED AGAIN** — keep the two blocks that
carry live obligations plus the most recent working day, archive the rest. The whole
**2026-09-19** working day moved to `docs/plan/archive/status-log-2026-09-19.md`: 790 lines,
unedited, **verified byte-identical by rebuilding `docs/PLAN.md` from the two halves and
comparing against its pre-cut state.**

| | Before | After, this entry included |
|---|---|---|
| `docs/PLAN.md` | 4,606 lines | **3,874** |
| `## Position` | 1,241 | **509** (36% of the 1,400 ceiling) |

⚠️ **The "after" column counts THIS ENTRY**, which is 45 of those lines. The cut itself
removed 790; a status log that did not describe its own cut would be the one kind of
entry this section cannot afford to be missing.

⚠️⚠️ **ONE DECISION TAKEN ON THE OWNER'S BEHALF, AND IT IS THE ONLY ONE: A SECOND ARCHIVE
FILE RATHER THAN A RENAMED FIRST ONE.** The tidier shelf was to append these entries to
`status-log-through-2026-09-18.md` and rename it `…-through-2026-09-19.md`. That name is
referenced in five places, and **one of them is a historical statement that renaming would
make false** — this file records that the first cut moved *"4,576 lines to
`status-log-through-2026-09-18.md`"*, which was true. **Tidying the shelf would have meant
editing the record of what happened**, which is the same rule that left the out-of-order
2026-09-17 entry alone. ⚠️ The scheme going forward is **one file per cut, named for the
working day it holds**. ⚠️ **It needed no wiring**: `plan-corpus.sh` globs
`docs/plan/archive/*.md`, and all seven split specs were re-run to prove a row still
resolves from the new file. **Reversal is a `cat` and a `git mv`.**

⚠️ **AND THE THING MOST LIKELY TO GO WRONG HERE DID NOT, BECAUSE IT WAS CHECKED RATHER THAN
ASSUMED.** `.graphifyignore` says `/archive/` **with a leading slash** — the fix from
2026-09-19, after a bare `archive/` silently swallowed `docs/plan/archive/` and dropped
~9,200 lines out of the graph with nothing going red. The new file is indexed; the graph was
rebuilt and asked for it.

**Evidence: reconstruction is byte-identical (sha256 of the rebuilt file equals the pre-cut
file); `plan-handover.sh` 11 groups; `handbook-agreement.sh` 5 groups; all 7 split specs
green against the corpus, which now assembles three files instead of two.**


✅✅ **`5c.5` IS DONE AS OF 2026-09-20 — A REFRESH WHOSE REPLY IS LOST DOES NOT SIGN A
SHOPKEEPER OUT. `5c` IS THE NEXT TASK.** No migration, no product code, no screen. ⚠️ **Taken
out of order on the owner's ruling of 2026-09-20** — a one-sitting measurement of the risk
`5c` is built around, ahead of another sizing session.

⚠️⚠️ **THE WORRY THAT CREATED THIS ROW IS WRONG, AND IT IS WRONG FOR A REASON NOBODY HAD
GUESSED.** The archived prose of 2026-09-13 said: *"Inside 10s that is forgiven; outside it,
the session is revoked and the person is signed out for no reason they can see."* **The
ten-second interval never enters into the lost-reply case at all.** ⚠️ The archived sentence
is left exactly as written — closed is not wrong, it was true as a fear when written, and
`docs/plan/archive/` is moved from, never edited. This entry is what supersedes it.

**What actually decides it, measured rather than read:** GoTrue refuses a spent refresh token
only when the chain has moved **past** it — that is, when its child has **itself been used**.
A lost reply by definition never uses the child, so the spent token keeps working and keeps
handing back **the same child**. Measured at 13s directly and at 88.6s end to end; two
exploratory probes put it at 30s and 90s with no change.

**Three independent layers, any one of which would be enough:**

| | Layer | Measured |
|---|---|---|
| 1 | **GoTrue** returns the same unused child to a spent token, for as long as the child stays unused | assertion 7, and assertion 8 proves it still refuses a *genuine* replay — so this is a distinction, not a server that says yes to everything |
| 2 | **`auth-js`** does not tear down a session when a refresh fails for a network reason; it keeps the OLD token in storage | assertion 4 |
| 3 | Even a **detected** replay does not sign anybody out on the spot — the newest token still works and the access token lasts to its own expiry | exploratory probe, recorded here rather than asserted |

⚠️⚠️ **AND THE READING FOUND A COST NOBODY HAD WRITTEN DOWN, WHICH IS THE PART `5c` NEEDS.**
`auth-js` caches a failed refresh for `REFRESH_FAILURE_COOLDOWN_MS` — **60 seconds**, keyed on
the refresh token — and serves that cached failure to every caller **without touching the
network**. So the signal coming back is *not* when the app recovers; the cooldown lapsing is.
⚠️ **Stacked with the in-call retry budget (up to 30s of exponential backoff, bounded by
`AUTO_REFRESH_TICK_DURATION_MS`), a dropped connection costs up to 90 SECONDS before the next
real attempt — and `EXPIRY_MARGIN_MS` is exactly 90 seconds.** The margin has zero slack. That
is not a defect and nothing here is broken by it: the session survives regardless, because the
token stays valid. But it is the number `5c` should design the outbox against, and it was
invisible until something ran.

**What shipped, four files:**

| | |
|---|---|
| `docs/checks/lib/5c-5-refresh-under-loss.mjs` | the instrument — a proxy that reads the upstream reply **to completion** (so the rotation commits) and then destroys the socket, driving a real `@supabase/supabase-js` client |
| `docs/checks/5c-5-refresh-under-loss.sh` | 8 assertion groups over that reading plus two direct HTTP probes of the mechanism |
| its falsifier | 9 fixtures |
| `.github/workflows/db.yml` | a NEW parallel job, `auth-session` |

⚠️ **THE INSTRUMENT'S CENTRAL DESIGN IS ONE LINE AND FIXTURE `Y7` IS WHAT DEFENDS IT.** The
proxy must read the upstream response fully **before** killing the socket, or the server never
rotates and the whole thing measures a lost **request** — the easy case nobody was worried
about. `Y7` mutates exactly that and the check must go red.

**DECISIONS TAKEN ON THE OWNER'S BEHALF — no migration, no product code:**

| | Decision | Why | Reversal |
|---|---|---|---|
| **1** | **The reading became a standing CI guard, not a paragraph** | The answer is load-bearing for the whole of `5c`, and it is a claim about GoTrue and `auth-js` rather than about our code — so **nothing else here would notice a version bump changing it**, and the first symptom would be a pilot shopkeeper signed out mid-sale | Delete two steps |
| **2** | ⚠️ **It runs in its OWN parallel job** (`auth-session`) rather than in `reset` | Measured, not guessed: `reset` already runs **12m27s against a 15-minute cap**, and this reading takes ~2 minutes because the cooldown cannot be hurried. Bolting it on lands at ~14.5 min, and this repository has already had a harness **CANCELLED** at the cap — neither a pass nor a failure. Jobs run in parallel, so it costs wall-clock nothing | Move the steps |
| **3** | **Most falsifier fixtures feed a CRAFTED reading rather than re-running the instrument** | Nine real runs is twenty minutes. What those fixtures falsify is the **judge**, which is the half that rots quietly — and `Y7` still mutates the real instrument, because whether it is honest about what it dropped is the one thing a stub cannot test. ⚠️ Stated in the harness header rather than glossed | Swap the stub for the real path |

⚠️⚠️ **THE BOUNDARY OF THIS READING, NAMED SO IT IS NOT QUIETLY WIDENED LATER: IT IS ABOUT THE
LOCAL STACK.** Pinned and printed on every run — **gotrue `v2.195.0`, `supabase-js` 2.116.0,
`auth-js` 2.116.0, rotation on, reuse interval 10s**, read from the RUNNING CONTAINER rather
than from `config.toml`, because a config file is a request and the container's environment is
what is enforced. ⚠️ **The hosted project's settings remain a REPORT the owner read off the
dashboard on 2026-09-13, exactly as the plan already says — this does not upgrade them to a
measurement**, and the hosted GoTrue version is not known to match.

⚠️ **AND THE TICKER WAS DELIBERATELY OFF.** The instrument sets `autoRefreshToken: false` so
the 30-second ticker cannot fire a refresh the script did not ask for. The app runs it **true**
(`app/src/lib/supabase.ts`, with an `AppState` listener), which only makes recovery *more*
automatic than what was measured. **This is the stricter case, not a laxer one.**

**Evidence: 8 assertion groups, all green, end to end through a real client against real
GoTrue; 9 falsification fixtures — 8 red with the message naming the defect, 1 control green.
⚠️ No product code changed, so no app suite could have been affected; `plan-handover.sh` and
`handbook-agreement.sh` were re-run because this session edited both files they read.**


✅✅ **`5b-iii-d-2` IS DONE AS OF 2026-09-20 — THE OWNER CAN LET HER IN, THE PICKER REFUSES
TO BE EMPTY, AND `5b-iii` AND `5b` ARE CLOSED IN FULL. `5c` IS THE NEXT TASK.** No migration.
The loop that opened on 2026-09-19 with a join code is shut.

An owner opens the bell, taps `Dejar entrar` beside a stranger's address, is asked which
store she will work in **only if his shop has more than one**, taps again, and she is gone
from the queue and inside the shop. She opens the app and reads exactly that store — not
the other one.

**What shipped, eleven files:**

| | |
|---|---|
| `app/src/api/approvals.ts` | the act, below the queue in the same module: `APPROVE_REQUEST`, two `p_` names, `checkApproval`, `approvedFrom`, and the two refusal codes |
| `app/src/api/invites.ts` | `D8`'s predicate EXTRACTED to one home — `checkLocations`, now asked by `checkInvite` and `checkApproval` both; `resolveLocations` widened to a `LocationChoice` |
| `app/src/api/calls.ts`, `hooks.ts` | one wrapper, one hook — `useApproveRequest`, returning `admit` / `busy` |
| `app/src/app/solicitudes.tsx` | the confirm step, the picker, the two refusal slots; `ES.approvals.notYet` deleted |
| `app/src/app/ajustes.tsx` | one call site, for the widened signature |
| `app/src/strings.ts` | the block, and `notYet` gone |
| `docs/checks/5b-iii-d-2-approve-contract.sh` + its falsifier | 14 assertion groups over real HTTP, 17 fixtures |
| `.github/workflows/db.yml` | the two steps and the path filter, `invites.ts` included |

⚠️⚠️ **`D8` IS NOW ASSERTED FROM BOTH SIDES AND ON THE PERSON IT PROTECTS, WHICH IS WHAT
THIS SITTING WAS SPLIT OFF TO MAKE POSSIBLE.** The sizing of 2026-09-19 said a session
shipping this control beside a badge and a list would have *"nothing able to go red"*. Three
instruments now look at it: `checkApproval` is a pure function the Vitest suite reads (client
half); assertion 3 of the contract check drives the real RPC with an empty array and demands
`22023` (server half); and ⚠️ **assertion 4 SIGNS IN AS THE APPROVED STAFF MEMBER** and
demands she read exactly the store she was given and not the other — which is the first time
anything here has measured `D8`'s consequence rather than its refusal. `location_select`
(`0001:506`) is `id in (select my_locations())`, so an approval with no store would have left
her inside the shop reading nothing, refused on every write, with no message.

⚠️⚠️ **THE CHECK FOUND A DEFECT IN ITSELF ON ITS FIRST RUN, AND THE FIX IS THE MORE USEFUL
HALF.** The original assertion 9 approved a `manager`-role request and demanded
`location_count = 0` (`0029:434`). It went red — **because there is no such thing.**
`request_access` takes NO role argument (`0029`'s `S4`: a role argument is a way to claim
somebody else's invite) and inserts without naming the column, so `workspace_invite.role`'s
default of `'staff'` (`0002:374`) decides. ⚠️ **EVERY REQUEST THIS SCREEN CAN EVER SHOW IS
`staff`** — so `D8`'s picker is unskippable on this path, and `approveArgs`' non-staff branch
is currently DEAD CODE, kept only because `0029:434` keeps the mirror of it. The assertion now
states that invariant, and goes red the day `request_access` gains a role — which is the day
the branch stops being dead. ⚠️ **A consequence the owner may want to change: an owner cannot
admit somebody as a MANAGER through this screen. He invites her instead.**

⚠️⚠️ **AND THE FALSIFIER FOUND A SECOND ONE, RED FOR THE SHALLOWER REASON — the failure mode
this repository has now recorded twice.** Fixtures `W2`/`W3` rename a `p_` argument and the
check went red saying *"could not read the approval contract"* rather than meeting the
`PGRST202` it exists to meet: it was discovering the two names by looking for `request` and
`location` INSIDE them. ⚠️ **Red for the shallower reason looks exactly like red**, and a
harness that only asks *"did it fail?"* would have banked it. The names are now read off
`approveArgs`' returned literal — the key assigned the request id, the key assigned the
locations — so the probe sends **whatever the app sends**, which is the only version that
catches a rename the app made consistently.

**DECISIONS TAKEN ON THE OWNER'S BEHALF — no migration, no seed, all cheap to reverse:**

| | Decision | Why | Reversal |
|---|---|---|---|
| **1** | ⚠️ **`D8`'s predicate moved to ONE home and both screens ask it** — `checkLocations` in `@/api/invites`, asked by `checkInvite` and `checkApproval` | `D8` is a `member_location` rule, not an invite rule, and `create_invite` and `approve_request` are its two writers. A second copy is the defect this repository has six of | Inline it back into each; one function, two callers |
| **2** | ⚠️⚠️ **THE APPROVAL IS TWO TAPS, NOT ONE** — `Dejar entrar` opens a confirm step even when nothing needs asking | The owner's standing tie-break is the option that adds no human step, and it is why a one-store shop is never asked WHICH store. This is not a question with no right answer, it is a guard against the wrong ROW: admitting somebody writes a `workspace_member` row, there is no `Quitar` yet, and a mis-tap in elder mode puts a stranger in the shop with nothing in this app able to remove her. ⚠️ It also makes the button ONE behaviour — without it a manager row would approve on the first tap and a staff row would open a picker, on rows that look alike | Render `Boton` straight onto `onConfirm`; ~8 lines |
| **3** | ⚠️⚠️ **`42501` IS LEFT TO THE APP-WIDE SENTENCE HERE, AND THIS SHARPENS THE DECISION PARKED ABOVE RATHER THAN DEEPENING IT** | `0029` raises `42501` twice — a request that is not the caller's to approve, and no session at all — and **the first is unreachable from this screen**: `0037` hands a non-owner an EMPTY LIST, so there is no row to tap, and `canApprove` never opens the queue for one. What is left really is the session, so *"tu sesión se cerró"* is correct rather than a guess. ⚠️ **So the cost the parked row predicted — *"a second client path starts reading `42501`, and then it is two modules guessing instead of one"* — DID NOT MATERIALISE.** `/bienvenida` is still the only module guessing | One entry in `approveErrorMessage` |
| **4** | **`TD003`'s two branches get ONE sentence** — expired and superseded | One act for the shopkeeper: the row is stale, and what fixes it is the person asking again. Telling her which of our two bookkeeping states she is in is bookkeeping we do, not her | Split the string; one key |

⚠️ **WHAT NO CHECK HERE LOOKED AT, NAMED RATHER THAN LEFT TO BE FOUND:** that the confirm
step reads as a confirmation and not as a second unrelated button, that the ticked store is
legible in elder mode, and that the picker does not push the button below the fold on a row
with a long address. Those are the owner's phone (`R9`). ⚠️ **AND THE APP HAS NOT BEEN RUN ON
A DEVICE THIS SESSION** — the dated obligations above are a re-deploy and a reading, and
opening the app is what restarts the measurement, so nothing here touched either instrument.

**Evidence: 14 assertion groups over real HTTP against a reset database with eight people,
two shops and two stores, all green; 17 falsification fixtures — 16 red with the message
naming the defect, 1 control green; 441 Vitest assertions over 22 files (was 417);
`conventions-gate.sh`'s 16 groups over 41 source and 22 test files. ⚠️ AND THE THREE CHECKS
MY EDITS COULD HAVE BROKEN WERE RE-RUN, not assumed: `5b-i-api-contract.sh` (6 groups),
`5b-ii-b-1-invite-contract.sh` (9 groups — the one at risk from the `resolveLocations`
refactor) and `5b-iii-d-1-approvals-contract.sh` (12 groups), all green.**


✅✅ **`5b-iii-d-1` IS DONE AS OF 2026-09-20 — THE BELL RINGS, THE QUEUE HAS FACES ON IT,
AND NOT ONE ROW IN THE DATABASE CHANGED. `5b-iii-d-2` IS THE NEXT TASK.** No migration, no
write, and the first product session since the consolidation.

An owner opening Inicio now sees a row with a bell on it and a count beside its word; it
opens `solicitudes`, which lists everybody waiting to be let into his shop — **the address
as the header, the name beneath it**, the role she asked for, and how long she has been
waiting. A manager, a cashier and a stranger see no bell at all.

**What shipped, twelve files:**

| | |
|---|---|
| `app/src/api/approvals.ts` | the sixth contract module — one RPC name, one `p_` argument, the six columns `0037` returns, the `owner` fence, and the parser that drops a row it cannot read |
| `app/src/api/calls.ts`, `hooks.ts` | one wrapper, one hook — `usePendingRequests`, returning `visible` / `loading` / `entries` / `count` |
| `app/src/app/solicitudes.tsx` | the surface, a modal sheet at the root in no group, `ajustes`' shape |
| `app/src/app/(tabs)/index.tsx` | the bell and the badge, plus a row component the two doors on that screen now share instead of duplicating |
| `app/src/format/date.ts` | `formatWaiting` — `Pidió hoy` / `Pidió ayer` / `Pidió hace 3 días` |
| `app/src/strings.ts` | the block, and the three waiting phrases |
| `docs/checks/5b-iii-d-1-approvals-contract.sh` + its falsifier | 12 assertion groups over real HTTP, 13 fixtures |
| `.github/workflows/db.yml`, `docs/CONVENTIONS.md` | both wired in the same pass |

⚠️⚠️ **ONE DECISION TAKEN ON THE OWNER'S BEHALF, AND IT IS THE ONE THIS ENTRY EXISTS FOR:
THE ORDER OF THE TWO LINES IS A PURE FUNCTION NOW, NOT JSX.** His ruling of 2026-09-19 —
*"Show the Email as a Header and the Name as a subtitle of the request"* — would ordinarily
have lived in a `<Text>` above another `<Text>`, where §2.11 guarantees nothing can see it.
This plan says in several places that a screen ruling has nowhere to live but a paragraph.
It has somewhere now: `linesOf(entry)` returns `{ header, subtitle }`, and three assertions
in `app/test/api-approvals.test.ts` fail if anybody swaps them. ⚠️ **It changes nothing a
person sees, and it is reversed by inlining two fields.** ⚠️ **It is not a repeal of §2.11**
— the suite still reads no component, and everything about WHERE the bell sits, what the
badge looks like and whether a manager sees one is still the owner's own phone (`R9`).

⚠️ **AND THE HALF-LOOP IS ON THE SCREEN IN WORDS.** `ES.approvals.notYet` — *"Por ahora
solo puedes ver quién está esperando"* — renders only when somebody is actually waiting.
A shopkeeper looking at a stranger's name with no way to admit her would otherwise conclude
the button is broken, and this repository's own rule is that **we do the bookkeeping, not
them**. It is deleted by `5b-iii-d-2`, and its own comment says so.

⚠️ **THE `owner` FENCE IS A CLIENT-SIDE DECISION AND HAS TO BE, which is worth restating
because it looks like belt and braces and is not.** `0037`'s decision 2 answers a non-owner
with an EMPTY LIST rather than `42501` — taken so this path would not acquire a **third**
meaning for a SQLSTATE already carrying two, which is the very overload parked in the
decisions block above. The cost of that choice lands here: **"you may not see this" and
"nobody is waiting" arrive as the same answer**, and only `canApprove`, asked before the
call, can tell them apart. Assertion 6 of the contract check measures the pair — an owner's
two rows against a manager's, a cashier's, a stranger's and **the requester's own** zero,
over one workspace holding the same two requests. Either half alone is vacuous.

⚠️⚠️ **THE CHECK ASSERTS A COLUMN LIST, AND THAT IS NEW TO THIS DIRECTORY.** Six contract
checks before it asserted RPC names and `p_` arguments. This one also demands that the six
fields `PendingRequestRow` names are **exactly** what `0037` returns, both directions — and
fixture `V4` is why: a column the app reads that the function does not return is invisible
to the typecheck (the field is `unknown`), to the suite (its fixtures are hand-written
objects) and to the bundler. What reaches a person is a **blank where a stranger's address
should be**, on the one screen whose entire job is to identify her.

⚠️ **THE WAITING LINE USES THE PHONE'S CLOCK, AND THAT IS ARGUED RATHER THAN ASSUMED.**
`0027` refuses a client-side deadline and `formatExpiry` renders a timestamp the database
chose; this computes. The difference is that **nothing is decided by this string** — the row
is in the queue or absent on the server's clock, and a phone a day out makes a sentence a
day wrong, never makes an approval fail. It counts **calendar days in the device's own
timezone**, so a request made at 23:50 is *ayer* at 00:10, which is what a person standing
in the shop means; and a clock behind the server reads as *hoy* rather than as
`hace -1 días`.

**Evidence: 12 assertion groups over real HTTP against a reset database with seven people
and two shops, all green; 13 falsification fixtures — 12 red with the message naming the
defect, 1 control green; 417 Vitest assertions over 22 files; `conventions-gate.sh`'s 16
groups over 41 source and 22 test files, and its own 30 fixtures.** ⚠️ **The contract check
carries an anti-vacuity floor** (`EXPECTED_GROUPS`), which `5b-split-coverage.sh` went 24
days without and which fixture `V7` is what proves fires.

⚠️ **WHAT NO CHECK HERE LOOKED AT, NAMED RATHER THAN LEFT TO BE FOUND:** that the bell is
in the body of Inicio and not in the navigator's header, that the badge is legible beside
its word in elder mode, and that a manager really sees nothing. Those are the owner's phone.
⚠️ **AND THE APP HAS NOT BEEN RUN ON A DEVICE THIS SESSION** — the dated obligations above
are a re-deploy and a reading, and opening the app is what restarts the measurement, so
nothing here touched either instrument.

✅✅ **`## Position` WAS CUT FROM 5,484 LINES TO 933, AND THE PLAN NOW HAS A SIZE CHECK —
2026-09-20. `5b-iii-d-1` REMAINS THE WORK IN FRONT.** ⚠️ **No product code, no migration.**
Second and final pass of the consolidation the owner ordered on 2026-09-19.

⚠️⚠️ **THE RULE CHANGED FROM THE ONE PROPOSED, AND THE REASON IS THE MEASUREMENT.** The
proposal was *"move the struck-through prior states to a decisions ledger"*. That was wrong
about where the mass was: the strikethrough lives in a 68-line block, while **the status log
was 5,300 lines** — forty reverse-chronological narrative entries, one per closed task. The
rule actually applied is **keep the two blocks that carry live obligations plus the most
recent working day (2026-09-19), archive the rest**, which is the whole of `5b-iii` and
`5b.8-iii` kept — the lineage the next task sits in.

| | Before | After |
|---|---|---|
| `docs/PLAN.md` | 8,849 lines | **4,298** (~108k tokens; it was ~313k two days ago) |
| `## Position` | 5,484 lines — larger than the whole of Step 5 | **933** |

⚠️ **LOSSLESS AGAIN, PROVED THE SAME WAY.** 4,576 lines moved to
`docs/plan/archive/status-log-through-2026-09-18.md` unedited; the source file was rebuilt
from the two halves and diffed against its pre-cut state — **byte-identical**.

⚠️⚠️ **AND THE CEILING IS NOW CHECKED RATHER THAN REMEMBERED — `plan-handover.sh`
ASSERTION 7.** It fails when `docs/PLAN.md` passes **6,000** lines or `## Position` passes
**1,400**, and names the remedy in the failure. ⚠️ **This is the assertion that matters
most, because nobody ever decided to let Position reach 5,484** — it arrived at one or two
entries a session, under a working agreement that says to update the plan when a task
closes and never said to shrink it. Falsified four ways: padded Position goes red, a padded
whole plan goes red, the real plan stays green, and the decisions block is confirmed to
exist exactly once in the live plan.

⚠️⚠️ **A SILENT GRAPH DEFECT WAS FOUND AND FIXED, AND IT WAS INTRODUCED BY THE PREVIOUS
SESSION.** `.graphifyignore` said `archive/` with **no leading slash**, which in
gitignore semantics matches a directory of that name **at any depth**. So when
`docs/plan/archive/` was created on 2026-09-19, the rule written for
`archive/power-platform/` silently swallowed it: **0 nodes indexed, ~9,200 lines of
closed-but-true plan history invisible to `graphify query`** — the first navigation tool
every session is told to use. ⚠️ **Nothing went red, and nothing could have**: an
over-matching ignore rule produces a smaller graph, not an error. Anchored to `/archive/`;
the archive now contributes **305 nodes** and `archive/power-platform/` still contributes
**0**. ⚠️ **The two archives mean opposite things** — one is a system nobody is building,
the other is this system's own closed history, and for several screen rulings **the plan is
the only record that exists**. A query result carries its `source_file`, so it is
self-labelling; `CLAUDE.md` now says to check it.

⚠️ **THE WORKING PROMPT IS UNCHANGED.** Every assumption it makes still holds: `docs/PLAN.md`
is readable again, `## Position` still carries both gate blocks, the ADR still wins, and a
session still names the check that looked at its work. Nothing to relearn.

⚠️⚠️ **WHAT DID CHANGE IS THE SPLITTING PROCEDURE, AND IT IS THE MOST LIKELY THING TO
REGRESS** — the old way was done seven times and reads like the house style. A split is now
**one ~30-line spec** in `docs/checks/specs/`, not a ~290-line guard plus a ~265-line
harness; `app.yml` already matches `specs/**`, so there is nothing to wire. **If a session
starts writing `<task>-split-coverage.sh`, that is the bug.** Recorded in `docs/HANDBOOK.md`
under *"When a task is too big, add a SPEC"*.

**DECISIONS TAKEN ON THE OWNER'S BEHALF, all cheap to reverse — no migration, no seed:**

| Decision | Why | Reversal |
|---|---|---|
| Cut at the **working-day** boundary, not the struck-through prose | The mass was the status log, not the strikethrough; the proposed rule would have saved ~68 lines | Move entries back from the archive |
| Kept **all of 2026-09-19** rather than only `5b-iii` | `5b-iii-d-1` renders a name that `5b.8`'s lineage put there; keeping `5b.8-iii` keeps that reasoning live | — |
| Ceilings set at **6,000 / 1,400** | Roughly 1.4× today's sizes — room for a week of sessions before it asks | One number each |
| `docs/plan/archive/` **indexed** by graphify, power-platform still not | Closed is not wrong, and results are self-labelling by `source_file` | One line in `.graphifyignore` |

⚠️ **ONE PRE-EXISTING WART LEFT ALONE, AND NAMED:** the status log is reverse-chronological
except for one 2026-09-17 entry sitting between two 2026-09-18 ones. It is in the archived
range now. Re-ordering it would have meant editing the owner's record for tidiness, which is
not a reason.


### 📦 Older status-log entries — 2026-09-19 and back, moved out of this file ✅

⚠️ **THE STATUS LOG IS NOW ARCHIVED ONE WORKING DAY PER FILE, AND THERE ARE TWO:**

| File | Holds | Cut on |
|---|---|---|
| [`status-log-through-2026-09-18.md`](plan/archive/status-log-through-2026-09-18.md) | everything up to and including 2026-09-18 — 4,576 lines, forty entries | 2026-09-20 |
| [`status-log-2026-09-19.md`](plan/archive/status-log-2026-09-19.md) | the whole 2026-09-19 working day — the plan split, `5b-iii-d`'s sizing, `5b-iii-a/b/c`, `5b.8-iii` and its two halves | 2026-09-20, later the same day |

Both are unedited and both were verified **byte-identical on reconstruction**.

⚠️⚠️ **THE 2026-09-18 FILE WAS NOT RENAMED TO SWALLOW THE SECOND CUT, AND THE REASON IS
WORTH KEEPING.** Appending and renaming to `…-through-2026-09-19.md` was the tidier shelf,
and it would have made a **historical statement false**: the entry above records that the
first cut moved *"4,576 lines to `status-log-through-2026-09-18.md`"*. That was true.
**Renaming for tidiness means editing the record of what happened**, which is the same
rule that left one out-of-order 2026-09-17 entry where it was. ⚠️ `plan-corpus.sh` globs
`docs/plan/archive/*.md`, so a new file needs **no wiring at all** — every split guard
picks it up the moment it exists.

**What stays, and the rule — unchanged since the first cut:** the two blocks that carry
live obligations (`⛔ DECISIONS OWED`, `⏳ DATES OWED`) and the most recent working day's
entries. ⚠️ **The blocks must never be archived**: `plan-handover.sh` requires exactly one
of each **in the live plan**, and a second copy is a second home for one claim.

⚠️⚠️ **AND THE CEILING IS WHAT CALLED THIS CUT RATHER THAN ANYBODY NOTICING.**
`plan-handover.sh` assertion 11 fails when `## Position` passes **1,400 lines**. It reached
**1,241** three sessions after the first cut — 83% of the ceiling in two days — which is the
growth rate that took it to 5,484 last time, caught early instead of late. **This is the
check working as designed, and the answer is a cut, not a bigger number.**

To find an archived entry: `graphify query` first, then search the whole plan — live and
both archives — in one command:

```
grep -n '<task-id>' "$(bash docs/checks/plan-corpus.sh)"
```

