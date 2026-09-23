# Status log — the 2026-09-22 working day, first cut

⚠️⚠️ **ARCHIVED 2026-09-22 FROM `docs/PLAN.md`'s `## Position`, WHICH HAD REACHED
1,445 LINES AGAINST ITS 1,400 CEILING** — `plan-handover.sh` assertion 7, and the
remedy is the one that check names in its own failure. Every line below is
**MOVED, not copied**: two homes for one claim is the defect this repository has
recorded six of, and `split-coverage.sh` fails on *"row appears 2 times"* because
it reads the corpus, which includes this file.

⚠️⚠️ **THIS IS THE FIRST ARCHIVE OF A DAY THAT WAS STILL RUNNING**, and that is
why it says *first cut* rather than *the day*. Every previous archive was taken
after its day closed, because there was always an older day to cut; on 2026-09-22
there was not — `status-log-2026-09-21.md` had already been taken, and the whole
of `## Position` was that morning's work. ⚠️ **A LATER SESSION APPENDS TO THIS
FILE RATHER THAN MAKING A SECOND ONE FOR THE SAME DATE** — one working day per
file is the rule, and a `status-log-2026-09-22b.md` would break it. ⚠️ **And it
is never renamed to absorb a later cut**: the plan's own history names these
files, and renaming for tidiness makes a recorded statement false.

**What is here, oldest first as the plan had it — the three entries that opened
2026-09-22, all of them step `5c`'s last day:** the `5c-ii-b` sizing and the
reading that broke the connectivity tie; `5c-ii-b-2`, the flush trigger; and the
`5c-iv` sizing that split what a person sees in two.

⚠️ **`plan-corpus.sh` globs `docs/plan/archive/*.md`, so this file needed no
wiring and every content-addressed lookup — `| **task** |` — resolves out of it
exactly as it did before the cut.**

---

✅✅ **`5c-iv` WAS SIZED AND SPLIT IN TWO ON 2026-09-22, THE DAY IT WAS TAKEN AND
BEFORE A LINE OF IT WAS WRITTEN — AND THE SQLSTATE MINT WAS RULED THE SAME HOUR.
`5c-iv-a` IS THE NEXT TASK.** No migration, no product code, no screen: this entry
is a sizing, a ruling turned into a row, and the eleventh split spec.

⚠️⚠️ **THE RULING FIRST, BECAUSE IT EMPTIES THE BLOCK FOR THE THIRD TIME IN THIS
PROJECT'S LIFE.** *"Let's follow your recommendation"* — **yes, mint it, and as its
own small task after `5c-iv`**, which is the recommendation in full including the
ordering. It is now **`5b.9`**, sized `S`, shipping **`0038`** and minting **`TD006`**.
⚠️ **It is deliberately NOT marked next**, and the row says why it cannot be folded
into the task that is: `5c-iv-a` ships no migration at all, and *"one migration over
two unrelated functions is harder to falsify and harder to revert"* is this project's
own recorded refusal. ⚠️⚠️ **AND IT CLOSES BY TURNING A STANDING CHECK RED**:
`docs/checks/5b-iii-b-request-contract.sh` currently asserts the two meanings of
`42501` are **still indistinguishable on the wire**, so the fix breaks its own guard —
which is the cheapest possible evidence that it landed, and it was built that way on
purpose eleven days before anybody ruled.

**WHY `5c-iv` SPLIT, AND IT IS NOT A SIZE ARGUMENT ALONE.** The row read as one job —
*"the three things you actually see"* — and it is two, because **the two halves read
different things and share nothing but a place on the screen**:

| | `5c-iv-a` — the link | `5c-iv-b` — the queue |
|---|---|---|
| reads | the signal `5c-ii-b-2` shipped, through `subscribe()` — **which has never had a caller** | **this device's own outbox**, with no server read at all |
| renders | two states of one boolean: a quiet notice, a fading toast | one count and **one peso figure** |
| has arithmetic? | none | ⚠️ **yes, and it is the same arithmetic §2.10's nightly check runs on the server side** |
| has a fence? | none | **manager-and-above** (§2.7, 1.3a, C10.5) |
| a suite can hold | *"given the signal and where we are, what should be on screen?"* | **the pricing**, which is the half with a real instrument behind it |
| the owner's own priority | the thing a shopkeeper meets every day | C11.9: *"not a priority for the owner at this point"* |

⚠️⚠️ **AND NEITHER HALF CAN BE MEASURED HERE, WHICH MAKES THE SPLIT WORTH MORE THAN
USUAL RATHER THAN LESS.** §2.11 keeps rendering, navigation and layout out of scope,
so the instrument for both is the owner's phone (`R9`). **Two things he can look at and
correct separately beat one he has to take or leave** — and a screen decision that goes
in wrong has no check anywhere that would say so. Every previous split on this project
argued the opposite way round: *this one cannot be falsified, so keep it small.*

⚠️ **THE ORDER IS `-a` FIRST AND IT IS NOT ARBITRARY.** `-a` gives `subscribe()` its
first caller, so the seam shipped this morning is exercised while it is still fresh;
and C11.9 is the owner's own lowest priority in the whole offline design. ⚠️ **They are
independent** — `-b` waits on nothing from `-a` — so the order is a preference rather
than a gate, and a later session may swap them without breaking anything.

⚠️⚠️ **ONE THING `5c-iv-a` MUST NOT INVENT, AND IT IS ALREADY DECIDED: WHERE A
NON-ROUTE COMPONENT LIVES.** `src/scaffolding/Pendiente.tsx` is the precedent and its
header carries the reasoning: **not under `src/app/`**, because Expo Router makes every
file there a navigable URL nobody meant to ship; and ⚠️ **not `src/ui/` either** — §2.11's
ten primitives and `5h.5`'s conventions pass are scheduled for after there is a pattern
to describe, and `5d`–`5h` own that directory by ADR-035 §3's amendment of 2026-09-13.
**A `Banner` primitive built here would be the thing the owner refused on 2026-09-13**,
*"ten primitives guessed at against screens nobody has drawn"*, arriving four tasks early.

**What shipped, and it is three files and no code:**

| | |
|---|---|
| `docs/checks/specs/5c-iv.split` | the eleventh split spec — six deliverables, four required sentences, one positive *"ships NO migration"* |
| `docs/PLAN.md` | the ruling, `5b.9`, the sizing, the two child rows, this entry |
| `docs/HANDBOOK.md` | the parent described as split, two child rows in plain words, and the question retired |

✅✅ **`5c-ii-b-2` IS DONE AS OF 2026-09-22 — THE QUEUE HAS A TRIGGER, AND THE
APP'S ONE FLUSHER HAS ITS FIRST CALLER AFTER TWO DAYS WITH NONE.
`5c-iv` IS THE NEXT TASK, AND IT IS THE LAST CHILD OF `5c`.** No migration, no RPC, no screen —
but this is the commit where a sale rung up with no signal starts leaving the
phone on its own.

**WHAT THE READING DECIDED, AND WHAT IT LEFT FOR THE CODE.** `5c-ii-b-1` chose
`expo-network` and handed this task three findings no changelog would have
carried. Every one of them is now a line of code with an assertion over it:

| | The finding | What it became |
|---|---|---|
| **iOS listener untrustworthy** | announced the reconnect in one run of two; its READ was right within 5 s in both | **a listener PLUS a poll PLUS the app-state wake**, and the poll runs **only while offline** |
| **1 — the handover blip** | both libraries emit a spurious `isConnected: false` on wifi→cellular, `72–324 ms` long | `OFFLINE_SETTLE_MS = 2_000`, debouncing **down only** — up is taken immediately |
| **2 — repeated payloads** | the same `WIFI` event twice, `2.6 s` apart, twice in one run | an identical reading is not an event; it is the difference between one flush and two |
| **3 — `isInternetReachable: null`** | `null` for iOS's first `~120 ms` where `isConnected` was already `true` | the trigger keys on **`isConnected`**; reachability is advisory and is never read |

⚠️⚠️ **THE POLL'S ASYMMETRY IS THE READING'S OWN AND IT IS THE CHEAPEST THING
HERE.** The DROP was caught by both libraries on both platforms within **8 ms**,
so the listener is trusted going down; it is the way back up that it missed. So
the poll is armed **only while the signal says offline** — which is exactly when
it is needed and exactly when the app has nothing else to do. **Cost while
online: nothing at all.**

⚠️⚠️ **AND THE 90 SECONDS IS NOW A TABLE A CHECK READS, NOT A NUMBER IN A
COMMENT.** `5c.5` measured `auth-js` caching a failed refresh for 60 s and
serving it **without touching the network**, plus up to 30 s of in-call backoff.
So a flush fired the instant the link returns can be refused by an auth layer
that has not noticed the link returned. The ladder lands attempts at **0 s, 5 s,
20 s, 50 s and 110 s** after a reconnect — four inside the window the cooldown
owns, and one past it. `attemptSchedule` states that, the suite **drives the
same ladder through the machine** and asserts they agree, and a ladder edited to
give up at 50 s turns four assertions red rather than leaving a paragraph stale.

**What shipped, and the ADR row the owner ruled on this morning:**

| | |
|---|---|
| `app/src/api/connectivity.ts` | the eleventh `src/api/` module — a pure `(state, event, now)` machine: the debounce, the de-duplication, the wake, the ladder, and three selectors the timers are armed from |
| `app/src/lib/connectivityMonitor.ts` | ⚠️⚠️ **the only module in this app that imports a connectivity library** — two subscriptions, three timers, `subscribe()` for `5c-iv`, `queued()` for `5f`, and the first call of `flusher()` |
| `app/src/app/_layout.tsx` | a `Drain` sibling that renders nothing, the shape `Gate` already had |
| `app/test/api-connectivity.test.ts` | 33 assertions over every transition |
| `app/test/auth-errors.test.ts` | the *"exactly one caller"* block grows from two lists to five |
| `docs/adr/…ADR-035…md` | ⚠️ **§2.11's CONNECTIVITY row and its revision entry — the owner's ruling of 2026-09-22, folded in here** |
| `docs/CONVENTIONS.md` | `R12`'s module table at eleven, and the five pinned lists written down |

⚠️ **THE §2.11 ROW CARRIES THE BOUND AND NOT ONLY THE NAME**, which was the
ruling's explicit condition: the reading was taken on a **simulator whose network
is the host's**, so the losing library's failure to recover is a simulator
finding **a real iPhone may not reproduce**. A row stating the choice without its
evidence is the stale-copy shape recorded ten times in this file.

⚠️⚠️ **AND THE ONE-MODULE CONSTRAINT IS AN ASSERTION, NOT A PARAGRAPH — WHICH IS
THE ONLY REASON IT WILL SURVIVE.** `5c-iv` draws its notice from the same fact
this drains on; §2.11 keeps rendering out of scope, so nothing here could ever
see a banner and a drain disagree. `app/test/auth-errors.test.ts` now pins
**five** lists as equalities — `expo-network` to one importer, `@/api/connectivity`
to one driver, `AppState` to **two** owners (the session store's auto-refresh and
the monitor's wake: different subjects over one core API, so it is pinned at two
rather than argued down to one), `@/lib/flushRunner` to one caller, and the two
that were already there. **Each was falsified by grafting the import onto a module
that does not own it, and each turns exactly its own assertion red.**

⚠️⚠️ **A GAP WAS FOUND WHILE WRITING THIS AND IT WAS IN NOBODY'S ROW — THE
ONLINE PATH HAD NO TRIGGER AT ALL.** A reconnect drains and an app-state wake
drains; **a sale rung up on a working connection by a cashier who never leaves
the app had neither**, and would have sat in the queue until the link flapped or
the phone was pocketed. Nothing in `5c`'s fourteen deliverables assigns an
enqueue-triggered flush to any child — it fell between `5c-i`'s enqueue and this
task's trigger. ✅ **The trigger half is built here** (`queued()`, four
assertions), **and the one line that calls it is routed to `5f` by `R9`'s rule
rather than left to be noticed**: `queueWrite` returns a row rather than a
promise, so there is no screen to call it from today, and a function with no
caller is precisely what this task was written to stop being tolerated. See
`5f`'s row.

⚠️ **THE VERIFICATION, NAMED.** `npm run test --workspace @tienda/app` — **563
assertions over 26 files, up from 530 over 25** — plus `npm run typecheck` and
`bash docs/checks/conventions-gate.sh` (16 groups over 49 source and 26 test
files). ⚠️⚠️ **There is deliberately NO contract check over real HTTP here, and
that is stated rather than quietly skipped: this task ships no migration, calls
no RPC of its own and touches no schema**, so there is nothing for a database to
be asked. Eight hand-run falsification fixtures — four over the one-owner lists,
four over the machine — are what distinguish the green from a suite that stopped
looking.

**DECISIONS TAKEN ON THE OWNER'S BEHALF — no migration, no schema, and nothing
here is dearer to reverse later than it is today:**

| | Decision | Why | Reversal |
|---|---|---|---|
| **1** | **The poll runs only while the signal says offline** | The listener caught every drop within 8 ms on both platforms and missed only the recovery. Polling while online would buy nothing and cost a native call every five seconds all day, on two low-end Androids | One line in `polling()` |
| **2** | **The debounce is 2 s, and it debounces going DOWN only** | ~6× the worst blip measured. Being early about coming back is free — a flush into a dead link fails transiently and the ladder retries; being late is a queue nobody drains | One constant |
| **3** | **The ladder is 5/15/30/60 s then 120 s steady** | It is the shape that straddles the 90 s, not a preference. A shop's queue must not wait minutes because an auth cache has not lapsed | One table, with the suite asserting the straddle rather than the numbers |
| **4** | **`UNKNOWN` is a third state and is not `false`** | Two things fall out of it: the first good reading of a launch counts as a reconnect, so **an app killed holding a queue drains it on the way back in**; and `5c-iv` draws no offline notice for a shop nobody has looked at | Delete a `null` |
| **5** | **The drain is mounted as a session-gated `Drain` sibling in the root layout** | A drain with no session sends as an anonymous caller, gets `PGRST301`, and walks the whole ladder for nothing — and there is nothing in the queue before somebody signs in. The shape is `Gate`'s, which already renders nothing and lives for the app's lifetime | Delete a component |
| **6** | **A failed native read is NOT reported as an outage** | It is the module answering badly. Inventing a `false` there stops the drain and draws an offline notice on a working connection | One `catch` |
| **7** | **`busy` is not an outcome and does not advance the ladder** | `@/api/flush` is single-flight; the drain that is in flight reports its own stop. Scheduling here would double the ladder for one failure | One branch |

⚠️ **NOTHING ABOVE IS A ONE-WAY DOOR.** There is no migration, no seed and no
row shape in this task — every decision is a constant or a branch in client code,
and the phone-shaped risk that usually makes these expensive (a modelling choice
baked into a table) does not exist here.

✅✅ **`5c-ii-b` WAS SIZED AND SPLIT IN TWO ON 2026-09-22, AND ITS FIRST HALF CLOSED
THE SAME DAY. THE READING WAS TAKEN ON BOTH INSTRUMENTS AND IT DID NOT SPLIT THE TIE —
IT BROKE IT. `5c-ii-b-2` IS THE NEXT TASK.** No migration, no product code, no screen.
⚠️ **The only thing in the tree that a customer could ever reach is one line of
`app/package.json`**: `expo-network` in, `@react-native-community/netinfo` out.

**THE ANSWER, AND IT IS A DIFF RATHER THAN AN IMPRESSION.** Both libraries were armed
**in the same process at the same moment** — three channels each, so they could be
caught disagreeing: one read at arm time, every listener event, and a poll every five
seconds. The poll is what saved the reading, and the reason is the finding below.

| | `wera-android-36` | iOS 26.5 Simulator |
|---|---|---|
| link dropped, detected by | both, `8 ms` apart | both, `5 ms` apart |
| link restored, **listener** fired | both, netinfo first by `250–330 ms` | ⚠️⚠️ **NEITHER, in the run that was captured to disk** |
| link restored, **read** recovered | both | ⚠️⚠️ **`expo-network` YES within 5 s; NETINFO NEVER** |
| events over the same transitions | `expo-network` 8, netinfo 15 | `expo-network` 5, netinfo 9 |
| wifi from cellular | both report it; netinfo adds `isConnectionExpensive`, `carrier`, `cellularGeneration` | no cellular radio — out of reach by construction |

⚠️⚠️ **THE FINDING THAT DECIDED IT: ON THE iOS SIMULATOR, `@react-native-community/netinfo`
WENT OFFLINE AND STAYED OFFLINE.** The link came back at `68 s`; `expo-network`'s next
read was `WIFI / isConnected: true / isInternetReachable: true` at `75 s`, and **every
netinfo read from `75 s` to `130 s` — twelve consecutive polls, fifty-five seconds
after the link returned — still said `none / false / false`.** It fired no event
either. **A flush-on-reconnect built on that library would not have fired on iOS after
a real outage**, which is `5c-ii-b`'s own characteristic failure — *"the queue never
drains"* — arriving through the dependency rather than through the cadence.

⚠️ **AND THE BOUND ON IT IS STATED RATHER THAN DISCOVERED LATER.** This is the
**simulator**, which has no network of its own: the drop was the Mac's Wi-Fi going
down, so the interface *disappeared* rather than losing signal, and netinfo's iOS
implementation watches reachability. **A real iPhone may not do this.** The claim
here is bounded to what was seen and is not generalised — but it is enough to
choose on, because the other library did not do it under the identical event.

⚠️⚠️ **THE SECOND FINDING IS NOT ABOUT THE CHOICE AT ALL, AND IT CHANGED `5c-ii-b-2`
BEFORE IT WAS TAKEN: ON iOS THE LISTENER IS NOT TRUSTWORTHY.** `expo-network`
announced the reconnect in the FIRST iOS run (`66880 ms`) and **missed it in the
second**, where it emitted two duplicate `NONE` events as the link returned and then
never said `WIFI` — while its READ was right within five seconds in both. So the
signal `5c-ii-b-2` builds is a **listener plus a poll plus the app-state wake**, and a
subscription on its own is the shape that leaves a shop's queue full overnight. **No
changelog would have said this.**

**THREE SMALLER THINGS THE READING TURNED UP, all Android unless said:**

| | Finding | What it changes |
|---|---|---|
| **1** | ⚠️ **BOTH libraries emit a spurious `isConnected: false` during the wifi→cellular handover** — a `NONE` blip at `10341 ms` followed by `CELLULAR` `72–324 ms` later | `5c-iv` draws C10.1's *"Sin conexión a internet"* from this signal. **Un-debounced, a shop walking from the counter to the door flashes an offline notice.** Recorded on `5c-ii-b-2`'s deliverable, because the debounce belongs to the signal, not to the banner |
| **2** | ⚠️ **`expo-network` repeats identical events** — the same `WIFI` payload twice, `2.6 s` apart, twice in one run | The signal must compare payloads and not re-fire. Cheap, but it is the difference between one flush and two |
| **3** | ⚠️ **On iOS, netinfo reports `isInternetReachable: null` for its first `~120 ms`** where `expo-network` says `true` immediately | A trigger keyed on `=== true` would sit out the first fifth of a second of every launch. It is a reason to key on `isConnected` and treat reachability as advisory |

✅ **THE `"wifi versus cellular"` QUESTION IS ANSWERED, AND THE ANSWER IS NO FOR v1 —
SO THE OWNER'S PHONE IS NOT NEEDED.** Both libraries report the type, so the capability
was never in doubt; the question was whether the app should ACT on it. It should not:
a queued sale is a few hundred bytes, §2.6 already says flush on reconnect without
qualification, and a cadence that branches on connection type is a second code path
that no instrument in this repository can exercise. ⚠️ **What it costs is named: we
give up `isConnectionExpensive`, which only netinfo carries** — so if a pilot
shopkeeper ever complains about mobile data, that is the row to reopen, and reopening
it means changing the library, not adding a branch.

⚠️⚠️ **AND THE iOS SIMULATOR DID NOT BUILD, WHICH IS AN INSTRUMENT FINDING AND NOT A
CONNECTIVITY ONE.** The *"second iOS instrument"* recorded on 2026-09-21 could not
compile this app: `ld: symbol(s) not found`, `facebook::react::Sealable`, referenced
from `libRNScreens.a`, `libRNGestureHandler.a` and `libRNReanimated.a`. **Expo 57 links
a PREBUILT React Native core while those three community modules build from source**
(`[Expo-precompiled] … prebuilt tarball not found`), and the prebuilt core does not
export what they reference. ✅ **The fix is `RCT_USE_PREBUILT_RNCORE=0 RCT_USE_RN_DEP=0
pod install`**, which builds React Native from source and links clean. ⚠️ **It cost
three failed builds to find, and nothing in this repository would have said so** —
`app.yml` runs a typecheck and a Vitest suite, neither of which compiles a line of
native code. ⚠️ **It is not recorded as a task**: `ios/` is generated and gitignored,
so the remedy is an environment variable a future session needs to know, not a file to
commit. **That is what this paragraph is for.**

**What shipped, and it is four files and no code:**

| | |
|---|---|
| `docs/checks/specs/5c-ii-b.split` | the tenth split spec — six deliverables, two required sentences, one positive *"ships NO migration"* |
| `docs/PLAN.md` | the sizing, the two child rows, this entry |
| `docs/HANDBOOK.md` | the parent described as split, two child rows in plain words |
| `app/package.json` | ⚠️ **the only line that reaches a phone**: `expo-network` in, netinfo out |

---

⚠️⚠️ **SECOND CUT, APPENDED 2026-09-22 — THE SAME DAY, THE SAME FILE, AND THAT
IS THE RULE RATHER THAN AN EXCEPTION.** `## Position` reached **1,356 lines against
its 1,400 ceiling** while `5e` was being sized, which leaves the next session no room
to write its own entry. ⚠️ **The entry below is MOVED, not copied** — two homes
for one claim is the defect this repository has recorded six of, and
`split-coverage.sh` fails on *"row appears 2 times"* because it reads the corpus,
which includes this file. ⚠️ **This file was APPENDED TO rather than renamed or
twinned**: one working day per file, and a `status-log-2026-09-22b.md` would break
the rule this file's own header states.

**What this cut adds, keeping the oldest-first order above:** `5c-iv-a`, the quiet
offline notice and the reconnect toast — the first thing in this project a
shopkeeper can see about being offline.

✅✅ **`5c-iv-a` IS DONE AS OF 2026-09-22 — THE APP ADMITS IT QUIETLY, AND THE
SIGNAL SHIPPED THIS MORNING HAS ITS FIRST READER. `5c-iv-b` IS THE NEXT TASK, AND
IT IS THE LAST CHILD OF `5c`.** No migration. **The first thing in this project a
shopkeeper can actually see about being offline.**

⚠️⚠️ **THE HONEST HEADLINE FIRST: NOTHING IN THIS REPOSITORY CAN LOOK AT WHETHER
IT IS SMALL, QUIET OR OUT OF THE WAY.** §2.11 keeps rendering, navigation and
layout out of scope. What a suite CAN hold is every **rule** the two surfaces
obey, and that is why `@/offline/notice` is a pure `(state, event, now)` machine
and the `.tsx` beside it holds a `View`, a `Text` and an opacity with no judgement
in it. **The rest is `R9` and it goes to the owner's phone.**

**THE THREE RULES THAT WOULD HAVE GONE IN WRONG SILENTLY, each now an assertion:**

| | The rule | What getting it wrong costs |
|---|---|---|
| **1** | ⚠️⚠️ **A dismissal is keyed to the SCREEN it was made on and dies with it** — C10.1's *"surfacing on screen changes"*, which is five words and the whole design | A session-long dismissal is kinder for ten seconds and **wrong for the rest of the day**: a shop that brushed the notice away at 9am is not told it is offline at 4pm. **Four assertions**: it dies on navigation, it survives a re-render on the same screen, and it is **not carried into the next outage** |
| **2** | ⚠️⚠️ **The toast never fires at launch** — `null → true` is the first reading of a session, not a reconnect | *"Tus últimas operaciones ya se guardaron"* said to somebody who never saw them at risk, **on every single launch**. This is the whole of why `UNKNOWN` is a third state and not `false`; `5c-ii-b-2` took that decision for the drain and this is the half that pays for it |
| **3** | ⚠️ **An outage cancels a toast in flight** | By then the toast is lying: it says the last operations are saved and the next one will not be |

⚠️ **AND ONE DECISION THAT LOOKS LIKE TASTE AND IS NOT: THE NOTICE CARRIES NO
STATE COLOUR AT ALL.** §2.11's palette row fences `atencion` to C3.17 alone —
*falta precio* and a line priced `$0.00` — and `error` is what DESTROYS. **Being
offline is the pilot shop's ordinary condition** ([[pilot-store-is-offline-a-lot]]),
and a warning colour on a condition that holds half the day teaches a shopkeeper
to stop seeing warning colours. Muted ink on a surface with a line round it is
the quiet C10.1 asks for, and **minting a new palette role would have been an ADR
amendment for a notice whose entire requirement is to be unobtrusive.** ⚠️ *Never
colour alone* is satisfied by construction here rather than by care: the word is
doing all the work because the colour is doing none.

⚠️ **THE MOTION RULE IS OBEYED IN BOTH HALVES, AND THE SECOND HALF IS THE ONE
THAT IS USUALLY MISSED.** §2.11 says `transform` and `opacity` only — and
`useNativeDriver: true` is what actually keeps the fade off the JS thread. **An
opacity animation without it is the rule obeyed in the letter on the two low-end
Androids it was written for.**

⚠️⚠️ **IT TIGHTENED A GUARD THIS MORNING'S TASK SHIPPED, AND THE GUARD WAS RIGHT
TO FIRE.** `5c-ii-b-2` pinned *"one driver of the connectivity machine"* by
matching every import of `@/api/connectivity`. `@/offline/notice` needs the
`Online` type and nothing else, so it went red on `import type` — **a line
TypeScript erases, which cannot call `step`, cannot hold state and cannot
disagree with anything.** ✅ The assertion now reads **value imports only**, and
the word `type` must follow `import` directly so that `import { type Conn, step }`
still counts. **Falsified three ways** — a plain value import 🔴, an inline-type
import that also takes a value 🔴, an `import type` line 🟢. ⚠️ **The reason to
fix the guard rather than the file is that the cheap alternative was worse**: a
red on an erased line teaches the next person to loosen it, and the version they
reach for is the one that stops reading imports at all.

⚠️ **WHERE A NON-ROUTE COMPONENT LIVES WAS DECIDED RATHER THAN INVENTED.**
`src/offline/` — **not** under `src/app/` (Expo Router makes every file there a
navigable URL, the reason `Pendiente.tsx` already records) and **not** `src/ui/`
(§2.11's ten primitives and `5h.5`'s conventions pass come after there is a
pattern to describe, and ADR-035 §3 gives that directory to `5d`–`5h`). **A
`Banner` primitive built here would be the thing the owner refused on
2026-09-13 — *"ten primitives guessed at against screens nobody has drawn"* —
arriving four tasks early.**

**What shipped:**

| | |
|---|---|
| `app/src/offline/notice.ts` | the pure machine: the dismissal's lifetime, what counts as a reconnect, the toast's own, and the fade derived from it rather than stored beside it |
| `app/src/offline/OfflineSurfaces.tsx` | **the first non-route component in this app that is not scaffolding** — and `subscribe()`'s first caller |
| `app/src/app/_layout.tsx` | the `Stack` wrapped so the surfaces overlay every screen **without any screen knowing** — which is what "on screen changes" needs and what putting the notice inside each screen would have cost |
| `app/src/strings.ts` | two sentences, and ⚠️ **`offline.notice` is deliberately NOT `api.errors.offline`** — that one ends *"Intenta de nuevo en un momento"* and is an instruction to somebody waiting on a call; this one never blocks anything, so telling a shop to retry a sale that was never at risk would be wrong |
| `app/test/offline-notice.test.ts` | 15 assertions over every rule above |
| `app/test/auth-errors.test.ts` | the driver assertion tightened to value imports |

⚠️ **THE VERIFICATION, NAMED.** `npm run test --workspace @tienda/app` — **582
assertions over 27 files, up from 567 over 26** — plus `npm run typecheck` and
`bash docs/checks/conventions-gate.sh` (16 groups over **51** source and 27 test
files, up from 49/26). ⚠️⚠️ **And the thing a green run here does NOT mean is
written down rather than left to be assumed**: not one of those assertions has
seen a pixel. **The instrument for how this looks is the owner's phone.**

**DECISIONS TAKEN ON THE OWNER'S BEHALF — no migration, no schema:**

| | Decision | Why | Reversal |
|---|---|---|---|
| **1** | **The notice is a pill at the bottom, dismissed by tapping it anywhere** | C10.1 says *"easily dismissed"*; a close cross is a small target for an older thumb, and the whole pill is `scale.tapTarget` tall | One component |
| **2** | **No state colour on it** | See above — `atencion` is fenced, and a warning colour on a half-the-day condition stops being a warning | Two tokens |
| **3** | **The toast lives 4 s with a 400 ms fade each end** | Long enough to read eight words at arm's length in a bright shop, short enough to be gone before it is in the way. Asserted as a RATIO rather than a number, so the two cannot drift into a toast nobody can read | Two constants |
| **4** | **`Entendido` is the dismiss label, and it is only ever read by a screen reader** | The pill shows the sentence, not a button word; the label is what `accessibilityLabel` announces, so a person using VoiceOver is told it can be dismissed | One string |
| **5** | **The surfaces are mounted in the root layout, after the `Stack`** | A sibling earlier in the tree renders underneath it. Mounting per-screen means every screen has to remember — the same argument `Gate` and `Drain` already settled | Delete two lines |


---

## THIRD CUT, taken 2026-09-22 — `5c-iv-b`

⚠️⚠️ **THE THIRD CUT OF THIS DAY, AND THE SECOND TAKEN FROM A DAY STILL RUNNING.**
`## Position` reached **1,409 lines against its 1,400 ceiling** while recording the
owner's ruling that a product may be created with no price, and `plan-handover.sh`
assertion 7 names the remedy in its own failure. ⚠️ **Appended rather than given a
file of its own** — the rule `CLAUDE.md` states: one working day per file, and a
later session APPENDS. A `status-log-2026-09-22b.md` would make this day's history
live in two places, which is the defect `split-coverage.sh` fails on.

⚠️ **It is a MOVE and not a copy.** The entry below is gone from `docs/PLAN.md`;
`plan-corpus.sh` reassembles it, so a task-id lookup resolves exactly as before.

✅✅ **`5c-iv-b` IS DONE AS OF 2026-09-22 — THE QUEUE HAS A PRICE, AND `5c` IS
CLOSED.** ⚠️⚠️ **ONE THING IT SHIPPED WAS CHANGED THE SAME DAY BY A RULING, AND IT IS RECORDED HERE RATHER THAN LEFT IN THE DIFF: THE BANNER DREW ON EVERY SCREEN AND NOW DRAWS ON INICIO ONLY** (*"let's keep it Home Only"*). ⚠️ **The row below still describes what this task shipped, which is what a closed row is for** — the placement was one of the three look-questions it handed to `5f`, and this one was answered on paper before the screen existed, because ADR-035 §2.8 forbade the placement outright and a session building Inicio would have deleted the banner while obeying `CLAUDE.md`. **The rule lives in `onHome`; §2.8 carries the amendment.** ~~`5b.9` is the next task, and it is the only open row in step 5 that
ships a migration~~ — ⚠️ **struck in lower case deliberately, the rule `5b.8-i`'s
row records.** `5b.9` closed the same day; see the entry above.** No migration here. **The only number in this app priced on
the device that the server also prices.**

⚠️⚠️ **THE HONEST HEADLINE FIRST: THE COUNT IS NEVER LOSSY AND THE PESO FIGURE
CAN BE, AND SAYING SO IS THE WHOLE DESIGN.** A dead document is dead — that is
not a question a payload can fail to answer. What it was WORTH is, and a sum
that quietly omits a line it could not read is a smaller number **indistinguishable
on screen from a correct one**. So `QueueValue.complete` withholds the figure
instead, the count stands alone, and nothing is ever understated. §2.6's own
sentence about the downgrade — *"stock stays true; margin goes quiet"* — is the
same shape one layer up.

**THE FIVE RULES THAT WOULD HAVE GONE IN WRONG SILENTLY, each now an assertion:**

| | The rule | What getting it wrong costs |
|---|---|---|
| **1** | ⚠️⚠️ **A purchase line is NET and a sale line is GROSS** — §2.5 rule 2, *direction follows the document* | Reading a purchase through the sale key understates every dead purchase **by the IVA on it**, and nothing on the shelf looks wrong. The two keys are `unit_price_net_per_base` and `unit_price_gross_per_base`, and `0018` and `0016` are where they come from |
| **2** | ⚠️⚠️ **The quantity is converted AND ROUNDED to the thousandth before it is priced** — `round(qty_display * factor_to_base, 3)`, half-up away from zero | That is `0016`–`0020`'s own line, and Postgres's `round(numeric)` is the rule `Math.round` gets wrong on a negative tie. ⚠️ **Every factor `0001` seeds is a whole number, so this is a no-op on today's data and a skipped round would pass every realistic case** — the assertion uses a fractional factor the `numeric(14,6)` column permits, which is the only way to falsify it at all |
| **3** | ⚠️ **An absent `qty_display_unit` is the variant's BASE unit, factor exactly `1`** — `0001`'s `unit_base_is_identity`, and the `coalesce` every `record_*` does | It is the one case that is exact **with no map and no server read**, which is why the banner already prices something today rather than nothing |
| **4** | ⚠️⚠️ **An unreadable line poisons its whole document** rather than being skipped | Two readable lines out of three is the smaller-number failure above, arriving one level down |
| **5** | ⚠️ **A transfer is worth NOTHING and is KNOWN to be** | `0020` carries no price because moving stock between a shop's own locations is not a document with a value on it. *Priceless by design* and *could not be read* must not collapse into one answer — if they do, one dead transfer withholds the figure for every sale beside it |

⚠️⚠️ **AND THE ONE THING THIS TASK REFUSED TO BUILD IS THE ONE THAT LOOKED
CHEAPEST: A COPY OF `0001`'s TEN UNITS.** The unit table is closed — *"users
pick from this list; they never define their own factors"* — so hard-coding
`kg = 1000` here would work, forever, and would be the **sixth two-homes-for-one-claim
defect this repository has recorded.** `5f` must already hold those factors to
price a basket with no signal (§2.6, C10.3), so the app gets a second copy the
moment that screen exists. ✅ **The map is an ARGUMENT instead** (`R3`: a module
takes its world as an argument), `NO_UNIT_FACTORS` is empty today because
**nothing in this app enqueues yet**, and ⚠️ **the obligation to pass it is
written into `5f`'s row rather than left to be noticed** — `R9`, and the second
line that row now owes after `queued()`.

⚠️ **THE FENCE WAS RE-DERIVED RATHER THAN INHERITED, WHICH `5c`'s SIZING
EXPLICITLY ASKED FOR.** `0024`'s decision 8 fences the `failed_write` TABLE at
**`owner`**, because it hands over `payload`, which *"can carry COST for any
kind"* — and §2.7 makes cost **manager-and-above at the loosest**. This banner
hands over no payload at all: a count and one figure, no line, no variant, no
location, no `error_code`. **So the looser fence is the one §2.7 actually
names**, 1.3a's *"cost is manager-and-above; quantity is everyone"* settles the
figure, and C10.5 refuses to show a rejected write to the person at the counter
at all. ⚠️ **The fence is read BEFORE the queue is**: a cashier's phone never
opens the outbox for this banner.

⚠️⚠️ **THE DISMISSAL IS THE OPPOSITE OF `5c-iv-a`'s, DELIBERATELY, AND IT IS THE
ONLY REASON *"least invasive"* IS TRUE.** A dismissal there dies with the screen,
because being offline comes and goes and a shop that brushed the notice away at
9am must still be told at 4pm. **A dead letter does not go away on its own** —
recovery is ours, by hand, one row at a time (ruling of 2026-09-05) — so
re-offering it on every navigation nags a manager about something she has
already done everything she can about. **It is keyed to the COUNT: silence until
the number changes, and a fourth dead letter says it again.** ⚠️ A count that
FALLS does not re-arm it — a replay takes rows out of the queue, and nothing new
has happened to tell anybody about.

⚠️ **WHERE IT SITS WAS DECIDED RATHER THAN DEFAULTED.** `OfflineSurfaces` owns
the **bottom** of every screen; this owns the **top**, behind `insets.top`. **Two
absolutely-positioned strips at one edge is a collision no check in this
repository could ever see** — §2.11 keeps layout out of scope — so it is settled
here, in the file and in this entry, rather than discovered on a phone.

⚠️ **AND IT RE-READS ON A SCREEN CHANGE AND NOWHERE ELSE, WHICH IS A CHOICE.**
Nothing in this app announces *"a flush just dead-lettered a row"*, and adding
that signal belongs to `@/lib/connectivityMonitor`, whose one job `5c-ii-b-2`
deliberately kept to the link. C11.9 says the dead-letter control is *"not a
priority for the owner at this point"*, a manager navigates constantly, and a
poll would be a synchronous SQLite read on a timer for a row that is usually not
there.

**What shipped:**

| | |
|---|---|
| `app/src/offline/deadLetters.ts` | the pure module — which rows count, the two price keys, the unit conversion, the document sum, `complete`, the fence and the dismissal |
| `app/src/offline/DeadLetterBanner.tsx` | a `View`, a `Text` and no judgement — the second non-route component in this app, and the outbox's second reader |
| `app/src/app/_layout.tsx` | mounted after `OfflineSurfaces`, at the top of every screen, so no screen has to remember |
| `app/src/strings.ts` | three sentences, and ⚠️ **the one surface in this app that says HOW MANY** — which is not a contradiction of C10.2's toast and is written down as such in the file |
| `app/test/offline-dead-letters.test.ts` | 28 assertions over every rule above |
| `app/test/auth-errors.test.ts` | a **sixth** pinned list: the outbox has exactly two readers |
| `docs/PLAN.md`, `docs/HANDBOOK.md`, `docs/CONVENTIONS.md` | this entry, the two rows, `5f`'s second owed line, and `R12`'s list count |

⚠️ **THE VERIFICATION, NAMED.** `npm run test --workspace @tienda/app` — **611
assertions over 28 files, up from 582 over 27** — plus `npm run typecheck` and
`bash docs/checks/conventions-gate.sh` (16 groups over **53** source and 28 test
files, up from 51/27). **Eight hand-run falsification fixtures**: seven grafted
into the machine (a purchase read as gross, an unknown unit assumed to be base,
an unreadable line skipped, a transfer read as unpriceable, the quantity carried
in unrounded, the fence opened to everybody, the figure shown while incomplete)
and one grafted onto `src/api/errors.ts` to prove the new pinned list looks.
**Each turned exactly its own assertions red and nothing else.** ⚠️ **And the split of
`## Position` below was verified the way the two before it were**: the live file and
the new archive were reassembled and the result was **byte-identical** to the plan as
it stood before the cut. ⚠️⚠️ **There is
deliberately NO contract check over real HTTP: this task ships no migration,
calls no RPC and touches no schema** — and ⚠️ **not one of those 610 assertions
has seen a pixel. The instrument for how this looks is the owner's phone
(`R9`).**

**DECISIONS TAKEN ON THE OWNER'S BEHALF — no migration, no schema, and every one
of them is as cheap to reverse tomorrow as it is today:**

| | Decision | Why | Reversal |
|---|---|---|---|
| **1** | **The peso figure is withheld when any dead document could not be priced; the count is always shown** | An understated sum looks exactly like a correct one. [[users-dont-do-bookkeeping]]: she is never shown *"approximately"* and never shown our internal state | One predicate |
| **2** | **Every kind is priced by its own document's authoritative figure** — a sale and a waste at gross, a purchase at net, a transfer at nothing | §2.5 rule 2. The device holds no tax rate without a server read, so a purchase CANNOT be shown gross here — and the net is the figure printed on the supplier's invoice, which is the one the owner reads anyway | One table |
| **3** | **The dismissal is keyed to the count and is not remembered across launches** | See above. A fresh launch is a fresh chance to notice, and storing it would be a second thing on disk that can disagree with the queue | One condition |
| **4** | **No state colour, again** | §2.11 fences `atencion` to C3.17 and `error` to what DESTROYS. A dead letter has already happened and nothing is about to break because of it | Two tokens |
| **5** | **It sits at the top; the offline surfaces keep the bottom** | Two strips at one edge is a collision nothing here can see | Two lines |
| **6** | **`$0.00` is never shown** | A queue of dead transfers is worth exactly nothing, and `$0.00` reads as a broken screen — C3.17 gives that number a different meaning everywhere else in this app | One comparison |

