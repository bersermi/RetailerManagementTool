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

**What is here, oldest first as the plan had it.** The three entries that opened
2026-09-22, all of them step `5c`'s last day: the `5c-ii-b` sizing and the reading
that broke the connectivity tie; `5c-ii-b-2`, the flush trigger; and the `5c-iv`
sizing that split what a person sees in two. ⚠️ **And the later cuts, each named in
its own heading below** — `5c-iv-a`, `5c-iv-b`, and `5b.9`, the last row of step
`5b`, which was at the FOOT of `## Position` rather than its head and is therefore
the NEWEST entry in this file.

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

---

## Fourth cut — taken 2026-09-22 while `5e-ii` was being closed

⚠️ **ONE ENTRY, AND IT IS THE NEWEST OF THE SIX RATHER THAN THE OLDEST**, which
is why it is at the bottom: this file is **oldest first, as `## Position` had it**
reversed, and `5b.9` was the last row of step `5b` and the entry that stood at the
foot of Position after the three earlier cuts. `## Position` had reached **1,388
lines against its 1,400 ceiling** with the `5e-ii` entry added — twelve lines of
headroom, which is one session away from a red — so the cut was taken here rather
than left as a trap for the next session. `plan-handover.sh` assertion 7 names the
remedy in its own failure.

⚠️ **A MOVE AND NOT A COPY**, exactly as the three cuts above: the lines below are
gone from `docs/PLAN.md`, and `plan-corpus.sh` is what makes `| **5b.9** |` resolve
out of this file as it did out of that one.

✅✅ **`5b.9` IS DONE AS OF 2026-09-22 — `0038` IS APPLIED, `TD006` EXISTS, AND
THE JOIN BOX HAS STOPPED GUESSING WHO IS STANDING THERE. `5d` IS THE NEXT TASK,
AND IT IS THE FIRST SCREEN OF PRODUCTOS.** One migration, one raise site, one
deleted marker. **The last row of step 5b, and the only open row in step 5 that
shipped a migration.**

⚠️⚠️ **THE HONEST HEADLINE FIRST: NOTHING HERE IS NEW BEHAVIOUR, AND THE ONLY
PERSON WHO WILL EVER NOTICE IS THE ONE WHOSE SESSION LAPSED MID-SCREEN.** She
was being told to re-read eight characters that were fine; she is now told her
session ended, which is what happened. **That is the whole of the user-visible
change**, and it is why this blocked nothing for four days — the row said so
before it was taken and the measurement did not change it.

⚠️⚠️ **IT CLOSED BY TURNING *FIVE* STANDING CHECKS RED ON A CORRECT TREE, WHICH
IS FOUR MORE THAN THE ROW PREDICTED — AND EVERY ONE OF THEM WAS WRITTEN TO DO
EXACTLY THAT.** The row promised one: `docs/checks/5b-iii-b-request-contract.sh`
assertion 9, which asserts over real HTTP that the two meanings of `42501` are
still indistinguishable. Running the directory rather than the file found four
more, and that is the rule `0036` paid for:

| | What went red | What it had been asserting | Where it went |
|---|---|---|---|
| **1** | `docs/checks/5b-iii-b-request-contract.sh` **9** | the overload is REAL, over real HTTP | **replaced by its opposite** — they must now come back DIFFERENT |
| **2** | `supabase/tests/0029` **2.4** | a code nobody owns is refused `42501` | re-pointed to `TD006` |
| **3** | `supabase/tests/0029` **2.5** | a seven-character prefix is refused `42501` | re-pointed to `TD006` |
| **4** | `supabase/tests/0029` **2.8** | an INACTIVE workspace is refused identically | re-pointed to `TD006` — ⚠️ **and the identity is the point** |
| **5** | `supabase/tests/0036` **7.3** | *"TD006 is still free"* | **retired into `supabase/tests/0038` 7.2**, which now watches `TD007` |

⚠️ **`supabase/tests/0029` 2.7 DID NOT MOVE, AND IT IS THE HALF THAT MAKES THE
FIX A FIX.** It asserts an unauthenticated caller is refused `42501`. Before
`0038` it and 2.4 asserted the SAME state on the same function — **which is the
defect, written down in the suite of the migration that shipped it and never
read as one.** Them asserting different states is the cure, said by a file that
was already there.

**THE FIVE RULES THAT WOULD HAVE GONE IN WRONG SILENTLY, each now an assertion:**

| | The rule | What getting it wrong costs |
|---|---|---|
| **1** | ⚠️⚠️ **THE TRANSCRIPTION SOURCE IS `0034:409`, NOT `0029:158`** | `create or replace` needs the whole function, and `request_access` had been replaced once since `0029` — by `0034`, which added `display_name = coalesce(display_name, auth_full_name(…))` inside the `D7` branch so a person invited by email who types the SHOP code arrives NAMED. Transcribing `0029` reverts the owner's ruling of 2026-09-18 in one of the four places it lives, **and nothing in `0038`'s own suite would say so** — `supabase/tests/0034` 2.3b would, one sweep later. ✅ **The body was extracted mechanically and diffed against `0034`'s**: the only difference is the one `errcode` and its comment. Check 2.5 re-performs `0034`'s assertion here |
| **2** | ⚠️⚠️ **BOTH WAYS INTO THE BRANCH MOVE TOGETHER** | `0029`'s decision 4 refuses an INACTIVE workspace through the same raise site as an unknown code, identically and on purpose. A migration that moved only the `not found` half leaves the other on `42501` **and check 1.1 is still green.** Check 1.2 drives a shop that has been switched off — and nothing else in this repository builds one, so the fixture had to `update workspace set is_active = false` by hand and say that it did |
| **3** | ⚠️ **THE AUTHENTICATION GUARD KEEPS `insufficient_privilege`** | `0036` decision 3, repeated. Moving it too would retire the overload by EMPTYING the code, which is not the same as resolving it — and `42501` reaching this screen has to keep meaning *"sign in again"*, because that is what `@/api/errors` maps it to app-wide and what check 3.1 measures |
| **4** | ⚠️ **THE TWO `22023`s AND `approve_request`'s TWO `42501`s STAY** | A bad payload is one meaning reached two ways and a fence is a fence: `4d-i`'s reuse rule, not an overload. ⚠️ The `22023` for a phone-only account is **unreachable in v1** (C1.4 admits no phone auth) and is driven anyway, by a fixture with a NULL email — nothing else here reaches it, and a transcription that dropped it would be invisible |
| **5** | ⚠️⚠️ **THE THREE EXITS THAT ARE NOT REFUSALS ARE DRIVEN TOO** | `requested`, `already_requested`, `already_member` and `joined` are successes. A transcription that turned one into a raise leaves `TD006` correct and the function broken **for its ordinary caller** — and, through `_status`, a raise there records a FAIL instead of aborting the file under `ON_ERROR_STOP`, which is the shape `0035`, `0036` and `0037` each recorded printing no failures at all |

⚠️⚠️ **AND THE SUITE SHIPPED A DEFECT OF ITS OWN THAT ITS OWN OUTPUT CAUGHT, WHICH
IS WORTH MORE THAN THE MIGRATION.** `chk(label, condition, detail)` takes two
expressions, and the first writing of checks 2.6–2.10 called
`public._status('select public.request_access(…)')` **in both of them** — so the
RPC ran TWICE per check, and `request_access` WRITES. Check 2.6 was GREEN with
the detail `got already_requested`: the condition's call made the row, and the
detail's call found it. **The assertion was right and its evidence was a
different event.** Nothing would have failed; the next session to read that
detail would have been reading a lie about what this function does. ✅ Every
status is now taken once with `\gset` and asserted from the variable, and the
reason is written into the file rather than into this entry alone.

⚠️ **WHERE THE FREE-SLOT CLAIM LIVES WAS A DECISION, NOT A TIDY-UP.** `0036`'s
check 7.3 said *"TD006 is still free — if this ever goes red, somebody has
minted one without saying so"*. Somebody has, and said so. **Rewriting it in
place as *"TD006 is taken, by exactly one function"* would have been word for
word `0038`'s check 7.1** — two homes for one claim, which is the defect this
repository has recorded six of and which `split-coverage.sh` fails on by name.
**So it MOVED**: the frontier assertion belongs to the migration that moved the
frontier, and `0038` 7.2 now watches `TD007`. `0036`'s pinned count went 29 → 28
in the same edit, because a count that does not move with its file is the next
vacuous green.

**What shipped:**

| | |
|---|---|
| `supabase/migrations/0038_request_refusal_code.sql` | one `create or replace`, one `errcode`, one restated comment — no table, column, view, policy, trigger, grant or signature |
| `supabase/tests/0038_request_refusal_code.sql` | **28 behavioural checks**, and a fixture with a deactivated shop and a phone-only account |
| `supabase/tests/0029_request_path.sql` | three checks re-pointed, with the reason and the 2.7 contrast written in |
| `supabase/tests/0036_invite_refusal_codes.sql` | 7.3 retired with a pointer to where it went; the pinned count follows it |
| `supabase/tests/_cleanup.sql` | `_status(text)` dropped on the day its suite lands — `4f`'s rule, followed rather than re-learned |
| `app/src/api/requests.ts` | the marker constant DELETED, `REQUEST_REFUSALS` re-keyed onto `TD006`, and the argument rewritten as history rather than as a live guess |
| `app/test/api-requests.test.ts` | the pinned choice INVERTED — `TD006` is the shop, `42501` is the session — and both halves asserted |
| `docs/checks/5b-iii-b-request-contract.sh` | assertion 9 replaced by its opposite; the code now read off the app's own refusal MAP, not a constant |
| `docs/checks/…-falsify.sh` | `V5` re-anchored, `V7` INVERTED, and a new `V10` for the branch the rewrite grew |
| `.github/workflows/db.yml`, `supabase/README.md` | three stale comments, the step name, the `0038` row and `0036`'s count |
| `docs/PLAN.md`, `docs/HANDBOOK.md` | this entry, the two rows, and the next task |

⚠️ **THE VERIFICATION, NAMED.** `supabase db reset` applied `0038` from scratch,
then **every suite in `supabase/tests/` was run in name order** — 25 files,
**1,471 behavioural checks, all green**, which is how the three `0029` reds were
found at all. `supabase/tests/0038` is **28 of 28**.
`bash docs/checks/5b-iii-b-request-contract.sh` is **11 assertion groups green
over real HTTP**, and its line reads *"the overload is RETIRED and measured: no
session '42501', unknown code 'TD006'"* — the same instrument that said the
opposite yesterday, against a live database rather than a file.
`bash docs/checks/5b-iii-b-request-contract-falsify.sh` is **11 of 11 fixtures
red against a green control**, including the inverted `V7` and the new `V10`.
`npm run test --workspace @tienda/app` is **611 assertions over 28 files**,
`npm run typecheck` clean, `bash docs/checks/conventions-gate.sh` **16 groups
over 53 source and 28 test files**. ⚠️ **Not one of those numbers has seen a
pixel, and this task ships no screen at all.**

**DECISIONS TAKEN ON THE OWNER'S BEHALF — and one of them is a migration, so it
freezes on merge:**

| | Decision | Why | Reversal |
|---|---|---|---|
| **1** | ⚠️⚠️ **`TD006` covers an unknown code AND a shop that has been switched off** | `0029`'s decision 4 already made them one refusal with one message, deliberately. Minting for one alone would leave the other on `42501`, the client would still need `42501: 'noSuchShop'` in its table, **and the overload this task exists to retire would survive it** — which is exactly the argument `0036` decision 2 made about `redeem_invite`'s two dead tokens. Her next step is identical either way: re-read the eight characters | ⚠️ **A fix-forward migration, not an edit.** If you want *"that shop is closed"* told apart from *"that is not a code"*, it is a new small row |
| **2** | **`approve_request`'s two `42501`s are left alone** | A fence and a row you may not act on are what that code means everywhere else here, and `@/api/approvals` already leaves them to the app-wide sentence. Sweeping them up makes this migration two unrelated changes — the refusal the ruling's own wording avoided | One migration |
| **3** | **The marker constant is deleted rather than re-pointed to `TD006`** | A marker exists to name a GUESS, and there is no guess left to name. `@/api/redeem` has read this way since `0036` | One line |
| **4** | **`0036`'s free-slot check MOVED rather than being rewritten** | Two homes for one claim, and the newest migration is the right home for a frontier | One check |
| **5** | **The message is unchanged, word for word** | A migration that fixed the code AND reworded the sentence is indistinguishable from one that broke the sentence — and the suite matches on the message to prove the right branch fired | Nothing depends on it |

---

## Fifth cut — taken 2026-09-23, as `5e-ii` was reopened and closed again

⚠️ **ONE ENTRY, AND IT IS NOW THE OLDEST IN THIS FILE RATHER THAN THE NEWEST** —
the `5d` sizing, which opened step `5d`. It sat at the FOOT of `## Position` after
the fourth cut took `5b.9`, and `## Position` had reached **1,353 lines against its
1,400 ceiling** once the `5e-ii` reopening was recorded. **Forty-seven lines of
headroom is less than one status-log entry**, so the cut was taken here rather than
left as the next session's problem — the same reason the fourth was taken, and the
reason `plan-handover.sh` assertion 7 names its own remedy.

⚠️⚠️ **THE FILE IS NO LONGER STRICTLY OLDEST-FIRST, AND SAYING SO IS CHEAPER THAN
RE-SORTING IT.** The first three cuts came off the head of Position (the oldest work
of the day) and the fourth and fifth off its foot, so the reading order now runs:
the three that opened 2026-09-22, then `5c-iv-a`, `5c-iv-b`, `5b.9`, and this one —
which is older than all of them. **Each cut says which it is in its own heading**,
and a file re-sorted for tidiness would make the sentences the earlier cuts wrote
about themselves false.

⚠️ **A MOVE AND NOT A COPY**: the lines below are gone from `docs/PLAN.md`, and
`plan-corpus.sh` is what makes `| **5d** |` resolve out of this file as it did out
of that one.

⚠️⚠️ **`5d` WAS SIZED `L` AND SPLIT IN FOUR ON 2026-09-22, BEFORE A LINE OF IT WAS
WRITTEN, AND `5d-i` IS THE NEXT TASK — THE CATALOG READ, WITH NO SCREEN IN IT.** The row
told the next session to size it first and it was right to: **it described a screen that no
longer exists and left out one it owns.**

⚠️⚠️ **THE TWO FINDINGS THAT CHANGED THE SHAPE, AND NEITHER IS ABOUT SIZE.**
**(1) `Productos` has not been a grid of family tiles since 2026-09-15** — the owner made it
**variant-first** in área 13, C8.13 was annotated rather than rewritten, and the `5d` row
was never re-read against that. A session taking `5d` at face value would have built the
screen he replaced. **(2) Inicio is `5d`'s and the row never said so.** Two records outside
it do: the header of `app/src/app/(tabs)/index.tsx` names this task twice — *"`5d` builds
§2.8's real Inicio"* and *"`5d` builds that screen and places this properly"* — and área
13's decision table says *"Reversed by `5d`, which has to place it properly anyway."*
**A deliverable held only by two files that the split guard does not read is a deliverable
one context clear away from being lost**, which is the whole argument for this file's
tables and is why it is now nineteen rows in `docs/checks/specs/5d.split`.

**THE SEAM, IN ONE LINE: `5d-i` IS THE HALF A MACHINE CAN HOLD AND THE OTHER THREE ARE
THE HALF ONLY HIS EYE CAN.** §2.11 keeps rendering, navigation and layout out of scope, so
three of these four children end on the owner's phone (`R9`) and nothing here will ever say
they are wrong. That is an argument for a small first piece rather than a large one — the
sizing `5c-iv` made four days ago — and the first piece is therefore the one with a right
answer in it: four applied tables **no line in `app/` reads today**, the arithmetic that
turns `price_per_base` into `$35.00 / kg`, and a contract check over real HTTP.

⚠️ **WHAT WAS MEASURED RATHER THAN RECALLED, because three of these decide the split:**

| | Measured | Why it mattered here |
|---|---|---|
| **1** | `product_family_select`, `product_variant_select` and `price_list_select` are all **`workspace_id in (select my_workspaces())`** — any member reads the catalog AND the shelf price (`0002:490`, `507`, `542`) | §2.8 labels `Catálogo` **Manager+**, and that label is on **create/edit**: the INSERT and UPDATE policies are `has_role('manager')` and the SELECTs are not. So `5d` needs no fence at all, and `5e` needs one it already has |
| **2** | **`price_list` holds 390 seeded rows** and is a dated range table with a generated `valid_period` and a null `location_id` for the workspace default | *"Which price does a row show"* is a real decision, not a column read — and C1.5 makes the two scopes a preference rather than a picker |
| **3** | `record_purchase` (`0018:363`) seeds a batch's expiry from `product_family.default_lifespan_days` **only when `track_expiry` is true**, and it is `false` by default with nothing in C8.9's four-field create to turn it on | It is why the §2.8 question below is a real one and not a shrug: the 48-hour block has a data path and the pilot fills none of it |

⚠️⚠️ **AND IT FOUND A SECOND ADR DISAGREEMENT NOBODY WAS LOOKING FOR: §2.8 SAYS PERMANENT
FAILURES *"DO NOT APPEAR ON HOME AT ALL"*, AND `5c-iv-b`'s DEAD-LETTER BANNER — MERGED
YESTERDAY — OVERLAYS EVERY SCREEN INCLUDING INICIO.** Both halves are the same row of the
same table, so they are parked as **one decision and one amendment**. ⚠️ **It blocks
`5d-iv` alone**; the first three children never touch Inicio.

**What shipped, and it is documents only:**

| | |
|---|---|
| `docs/PLAN.md` | the `5d` parent rewritten as a split record, four child rows, this entry, and the decision above |
| `docs/checks/specs/5d.split` | **nineteen deliverables**, five required sentences, one statement every child must make |
| `docs/HANDBOOK.md` | the `5d` row rewritten as split, four plain-language rows, and the one question now waiting on the owner |

⚠️ **THE VERIFICATION, NAMED.** `bash docs/checks/split-coverage.sh docs/checks/specs/5d.split`
is **seven assertion groups green over nineteen deliverables**;
`bash docs/checks/split-coverage-falsify.sh` runs **every defect class against every
deliverable of every spec** and the `5d` ones are red-on-demand with a green control;
`bash docs/checks/plan-handover.sh` and `bash docs/checks/handbook-agreement.sh` are green
with the new next task and the now-open decision. ⚠️ **No code was written and no migration
exists to apply**, which is exactly what a sizing session should leave behind.

**DECISIONS TAKEN ON THE OWNER'S BEHALF:**

| | Decision | Why | Reversal |
|---|---|---|---|
| **1** | **Four children rather than three, with Inicio as the last** | The three screens are separately correctable on a phone and Inicio is the only one with a blocked half. Folding Inicio into `5d-ii` would have made the blocked half block a screen that is not blocked | One plan edit |
| **2** | ⚠️ **The catalog read goes first, before any screen** | It is the only piece with a right answer, `5b-i` set the precedent, and both remaining screens read it. The alternative — draw the list first against invented data — is what `R3` exists to refuse | One plan edit |
| **3** | ⚠️ **`Productos` is shown to EVERY member, not manager-and-above** | Measurement 1 above: the SELECT policies admit any member, and a cashier already sees every variant and its price on Vender (C3.1). Hiding the read would protect nothing and cost a fence to maintain | One condition in `5d-ii` |
| **4** | **The `5d-ii` door onto Inicio is temporary and says so in its own file** | `5d-iv` places it properly, and the placeholder-with-a-name-in-it shape is what `5a-ii` used and `5b-ii-a` cleaned up | One line |

---

## Sixth cut — taken 2026-09-23, before the session that wrote it cleared its context

⚠️⚠️ **THIS ONE WAS TAKEN FOR THE NEXT SESSION RATHER THAN FOR THIS FILE.** `##
Position` stood at **1,399 lines against its 1,400 ceiling** once the day's three
`5e-ii` entries were recorded — **one line of headroom, which the next session's first
status-log entry would have spent**, turning `plan-handover.sh` red on a tree with
nothing wrong with it. The owner asked whether it was safe to clear context; it was
not, and this is what made it so.

⚠️ **`5d-i` is the entry — the catalog READ, which opened the work `5e` writes
against.** It was the oldest left in the block after the fourth and fifth cuts took
`5b.9` and the `5d` sizing, and like both of those it came off the FOOT of Position
rather than its head.

⚠️ **A MOVE AND NOT A COPY**: the lines below are gone from `docs/PLAN.md`, and
`plan-corpus.sh` is what makes `| **5d-i** |` resolve out of this file as it did out
of that one.

✅✅ **`5d-i` IS DONE AS OF 2026-09-22 — THE APP CAN READ WHAT THE SHOP SELLS,
AND `5d-ii` IS THE NEXT TASK: THE FIRST SCREEN OF THE SHOP ITSELF.** Four applied
tables that no line in `app/` had ever read, one round trip, no screen and no
migration.

⚠️⚠️ **THE HONEST HEADLINE FIRST: NOTHING IS VISIBLE AND NOTHING WILL BE UNTIL
`5d-ii`.** This ships a module, a hook, a suite and a check. The owner cannot
look at any of it, which is exactly why it was split off from the three children
that end on his phone.

**THE FIVE RULES THAT WOULD HAVE GONE IN WRONG SILENTLY, each now an assertion:**

| | The rule | What getting it wrong costs |
|---|---|---|
| **1** | ⚠️⚠️ **EVERY NUMERIC IS ASKED FOR AS `::text`** | PostgREST sends a bare `numeric` as a JSON NUMBER and `JSON.parse` makes it a double: `0.035 * 1000` is `35.000000000000004` here. `@tienda/money`'s `parseDecimal` **refuses a number argument outright**, so the failure is not a wrong price — it is EVERY price becoming a dash, with the typecheck, the suite and the bundler all green. The contract check reads the JSON TYPE off the wire, which no string-matching check could do |
| **2** | ⚠️⚠️ **THE PRICE WINDOW LIVES IN THE QUERY AND NOWHERE ELSE** | `price_list` is a dated range table, so *"which price is today's"* is a predicate. A second copy in TypeScript would be a second answer; instead the check drives an EXPIRED row and a FUTURE row past a real PostgREST and asserts neither comes back. ⚠️ **And the obvious one-filter spelling does not work**: `valid_period=cs.<date>` on the generated `daterange` is `400 22P02 malformed range literal`, measured — a later session will try it, so the refusal is an assertion rather than a comment |
| **3** | ⚠️ **A PRICE IS CONVERTED WITH THE LEDGER'S OWN ARITHMETIC** | `price_per_base` is per BASE unit and a shopkeeper reads per PRICE unit (C3.10, and `0016`'s own *"quoted per 100 g is a §2.8 presentation concern"*). The conversion asks what one price unit weighs — the factor, at the scale every `qty_base` column holds — and prices a line of exactly that quantity with `lineAnchorCentavos`. Rounding in floats, or with `Math.round`, disagrees with Postgres on a tie |
| **4** | ⚠️⚠️ **`$0.00` AND A DASH ARE DIFFERENT FACTS** | C3.12 and C3.14: a zero is a price the owner set and sells at, a dash is a question nobody has answered. Rendering them alike is the Power Apps screen's own defect, named in the interview |
| **5** | ⚠️ **AN UNKNOWN UNIT IS A DASH, NEVER A GUESS OF `1`** | Reading `kg` as a gram divides a shelf price by a thousand and looks entirely plausible. Same shape as `5c-iv-b`'s rule about a line it cannot price |

⚠️⚠️ **AND IT FOUND A DISAGREEMENT BETWEEN TWO OF THE OWNER'S OWN CONSTRAINTS,
WHICH IS WORTH MORE THAN THE MODULE.** **C3.10 writes its examples as `$35.00 / kg`
and C12.2 says centavos are HIDDEN WHEN ZERO.** Both came out of the same
interview. The later, narrower rule wins — C12.2 is about how a number is
written, has a formatter and twenty-six assertions behind it, and C3.10's point
is that the UNIT is never absent — so the app renders **`$35 / kg`**, and
`$35.50 / kg` when there are centavos. ⚠️ **It is a shopkeeper-visible choice
taken on the owner's behalf and it is one line to reverse**; the suite pins both
spellings so the reversal cannot be silent.

**What shipped:**

| | |
|---|---|
| `app/src/api/catalog.ts` | the contract: four column lists, the composite-FK embed, the window filters, the price arithmetic, the initials, the search key |
| `app/test/api-catalog.test.ts` | **58 tests**, including C3.10's three examples and the accent-folding search |
| `app/src/api/calls.ts` | two reads — `catalogVariants` (one round trip) and `catalogUnits` |
| `app/src/api/hooks.ts` | `useCatalog(typed)`: three queries, the location rule, and its own stale times |
| `app/src/strings.ts` | `ES.units` — the ten codes as a shopkeeper reads them (`250g` is *250 gr*) — and `ES.catalog` |
| `docs/checks/5d-i-catalog-contract.sh` | **12 assertion groups over real HTTP**, with a real shop, a cashier and the shop next door |
| `docs/checks/5d-i-catalog-contract-falsify.sh` | **13 fixtures**, two of which narrow an applied POLICY and put it back |
| `.github/workflows/db.yml`, `docs/CONVENTIONS.md` | the two new steps, their `paths:` entries, and `R12`'s twelfth module |

⚠️ **THE VERIFICATION, NAMED.** `bash docs/checks/5d-i-catalog-contract.sh` is
**12 of 12 green against a reset local database** — the embed across the
composite FK, both numerics as JSON strings, the window with an expired and a
future row behind it, a variant with no price still in the list, both price
scopes on one read, `valid_period=cs.` still a 400, a **cashier reading all three
products and every shelf price**, the shop next door reading zero, ten units at
scale 6, and the order the database itself applies with accents in it.
`bash docs/checks/5d-i-catalog-contract-falsify.sh` is **13 of 13**, including
`H9`/`H10`, which NARROW `product_variant_select` and `price_list_select` to
manager and restore them. `npm run test --workspace @tienda/app` is **669 tests
over 29 files**, `npm run typecheck` clean, `bash docs/checks/conventions-gate.sh`
**16 groups over 54 source and 29 test files**, and its falsifier 30 fixtures.
⚠️ **Not one of those numbers has seen a pixel.**

**DECISIONS TAKEN ON THE OWNER'S BEHALF:**

| | Decision | Why | Reversal |
|---|---|---|---|
| **1** | ⚠️⚠️ **`$35 / kg` rather than `$35.00 / kg`** | C12.2 against C3.10, above. The number rule is the narrower and the better-instrumented of the two | One line in `priceLabel`, and the suite pins both |
| **2** | ⚠️ **The search folds accents; the KEY does not** | `0002` refuses to fold in `normalize_name` — *"Plátano and Platano being distinct is acceptable"* — and ends the same paragraph with **"search-time folding belongs in the query."** So typing `platano` finds `Plátano` and nothing about uniqueness moves. ⚠️ It folds with a seven-letter table rather than `String.normalize('NFD')`, because Hermes' Unicode surface is unmeasured here and the last assumed method crashed the app on the owner's phone | One function |
| **3** | ⚠️ **A store's own price beats the shop-wide one, and one location means that store** | `price_list` allows both scopes on purpose. C1.5 makes both pilot shops one location each, so this is exact today; with two stores the shop-wide price is used until something tells this phone which store it is in. ⚠️ **ADR-035 §3 STRUCK *"how the client resolves its location_id"*** rather than deferring it, so there is no task to route this to and the limit is written into the hook | One argument |
| **4** | **The window is the query's only home** | Rule 2 above. A defensive re-check in TypeScript is the two-homes defect this repository has recorded six of | One function |
| **5** | **Inactive variants are dropped in TypeScript, not in the query** | The policy does not filter, so it is a DECISION, and a decision belongs where the suite can read it — the arrangement `members.ts` already made for a deactivated colleague | One line |

---

## Seventh cut — taken 2026-09-23, with the sixth, so the NEXT session has room to work

⚠️⚠️ **THE SIXTH CUT BOUGHT ONE ENTRY OF HEADROOM AND THAT WAS NOT ENOUGH.** It left
`## Position` at 1,334 of 1,400 — about the size of one status-log entry, which means
the session after next would have hit the ceiling mid-task. **Two cuts were taken
together rather than one**, deliberately, because the lesson of this whole day is that
leaving a single entry of room is how a guard fires on somebody who has done nothing
wrong.

⚠️ **The entry is ADR-035 §2.8's Home row being amended in both halves** — the owner's
ruling of 2026-09-22 that Inicio shows no 48-hour expiry block and that the dead-letter
banner is *Home only*. ⚠️ **The RULINGS themselves are not archived with it**: they live
in the decisions block at the top of `## Position`, which is never archived, and in
ADR-035 §2.8 itself. What moved here is the record of the day they were applied.

⚠️ **A MOVE AND NOT A COPY**: the lines below are gone from `docs/PLAN.md`, and
`plan-corpus.sh` is what makes those rows resolve out of this file as before.

✅✅ **ADR-035 §2.8's HOME ROW IS AMENDED IN BOTH HALVES, RULED 2026-09-22, AND THE
SECOND HALF CHANGED SHIPPED CODE.** The question was parked that morning with `5d`'s
sizing and ruled the same day, in two answers.

**(a) *"Let's drop it for the pilot then."*** The 48-hour expiry block is **withdrawn**
from Inicio — `5d-iv`'s row says *withdrawn* rather than *deferred*, the shape ADR-035
§3 used when C1.5 killed the shared till. ⚠️ **The cost is unchanged by the ruling and
is the owner's, taken twice:** `7e`'s derived shelf life needs weeks of the shop's own
records before it says anything, where a typed date would have worked on day one.

**(b) *"Let's keep it Home Only."*** ⚠️⚠️ **THE THIRD ANSWER, AND NEITHER OF THE TWO
THE ADR's SENTENCE FRAMED.** §2.8 said permanent failures *"do not appear on Home at
all"*; `5c-iv-b` had shipped a banner on **every** screen; the ruling is **Inicio and
nowhere else.** ⚠️ **The reasoning of the old sentence survives and is why the amendment
is narrow**: what it refused was *"a list they cannot act on"*, and C11.9's banner is a
count, a value and *avísanos* — no list, no `error_code`, manager-and-above.

⚠️⚠️ **WHAT IT COST IN CODE: ONE CONDITION, AND THE FENCE MOVED IN FRONT OF THE READ.**
`onHome` and `readsQueue` are in `@/offline/deadLetters` where every other decision about
this banner lives (`R3`), `showsBanner` takes the route as a fourth argument, and the
component decides nothing — which it already said about itself. ⚠️ **A phone standing on
Vender no longer opens the outbox at all**, which is the same correctness argument the
role fence carried, now true of the route.

⚠️ **AND THE DISMISSAL STILL SURVIVES LEAVING HOME**, because the banner is mounted at
the ROOT rather than inside Inicio. Moving the mount into the screen would have been the
obvious way to do *Home only* and would have quietly undone the one rule `5c-iv-b`
argued hardest for: silence until the count changes, not until the next navigation.

⚠️⚠️ **WHAT THIS RULING DOES NOT DISCHARGE, SAID PLAINLY BECAUSE A BANNER MAKES IT FEEL
HANDLED: §8's alerting destination and its owner are still due before the pilot ends.**
§2.8's promise was that dead letters reach US, through §2.10's nightly check. During the
pilot the only thing standing in for that is the schema owner being in the shop (§5).

**What shipped:**

| | |
|---|---|
| `docs/adr/ADR-035…md` | a revision entry, the Home row, and the *"where failures surface"* paragraph — both halves, struck in place |
| `app/src/offline/deadLetters.ts` | `HOME_ROUTE`, `onHome`, `readsQueue`, and the fourth argument to `showsBanner` |
| `app/src/offline/DeadLetterBanner.tsx`, `app/src/app/_layout.tsx` | the route fence read before the queue, and two comments that claimed *every screen* |
| `app/test/offline-dead-letters.test.ts` | **four new assertions**: it draws on Inicio, on none of the five other routes, not on an unknown one, and does not open the queue anywhere else |
| `docs/PLAN.md`, `docs/HANDBOOK.md` | this entry, the empty decisions table, and four rows — `5d-iv`, `5c-iv-b`, `5f` and the handbook's |

⚠️ **THE VERIFICATION, NAMED.** `npm run test --workspace @tienda/app` is **673 tests over
29 files** (four new), `npm run typecheck` clean, `bash docs/checks/conventions-gate.sh`
**16 groups over 54 source and 29 test files**, `bash docs/checks/split-coverage.sh --all`
green over twelve specs, `plan-handover.sh` and `handbook-agreement.sh` green with the
table empty. ⚠️⚠️ **AND NOT ONE OF THOSE LOOKED AT A SCREEN.** §2.11 keeps rendering out
of scope, so *"the banner is on Inicio"* is held by `onHome`'s four assertions and by
nobody's eye — **and it cannot be looked at yet either**: nothing in this app enqueues
until `5f` exists, so the queue is empty on every phone today. `5f`'s row carries the two
look-questions that remain — size and words — and no longer carries placement.

---

## The EIGHTH cut, taken 2026-09-23 — `5d-ii`, and it came off the FOOT again

⚠️⚠️ **`## Position` STOOD AT 1,357 LINES OF ITS 1,400 CEILING with `5e-iii`'s
sizing entry in place, and `5e-iii-a`'s closing entry would have spent the rest.**
So the oldest entry left in that block — `5d-ii`, Productos — was moved here rather
than the next session paying for this one. ⚠️ **It is a MOVE and not a copy**, and
`plan-corpus.sh` reads this file, so every content-addressed lookup resolves it
exactly as before.

⚠️ **This is the fourth cut taken from the block's FOOT rather than its head**, and
the file's own heading above already says the archive stopped being strictly
oldest-first. **Ten entries of 2026-09-22 are now here, in eight cuts.**

✅✅ **`5d-ii` IS DONE AS OF 2026-09-22 — PRODUCTOS EXISTS.
`5d-iii` IS THE NEXT TASK, AND IT IS WHAT MAKES THESE ROWS TAPPABLE.** One route, a search box, a flat list of every variant, and a
temporary door on Inicio. **No migration, no primitive, and no `src/ui/`.**

⚠️⚠️ **THE HONEST HEADLINE FIRST: NOTHING IN THIS REPOSITORY CAN SAY WHETHER
THIS SCREEN LOOKS RIGHT, AND THAT WAS TRUE BEFORE A LINE OF IT WAS WRITTEN.**
§2.11 keeps rendering, navigation and layout out of scope; `R9` is the rule and
this row is its largest instance so far. **The instrument is the owner's phone**,
and what he is being asked to look at is named on the file's own header: whether
the list is legible across a counter, whether the search box is reachable with
one thumb, whether the initials tile reads as a product rather than a badge, and
whether *Letra grande* leaves room for a price beside a long name.

⚠️⚠️ **AND IT WAS NOT RENDERED HERE, WHICH IS WORTH RECORDING SO NOBODY REPEATS
THE DETOUR.** The design emulator (`wera-android-36` — never the sealed
`wera-reading-5a-iv-d`) was booted, the debug APK launched against Metro, and a
demo shop seeded in the LOCAL stack with eight variants, two families, an
accented name and one deliberately unpriced row. **Sign-in was refused as
*invalid credentials* even after `.env.local` was pointed at the local stack,
Metro restarted with `--clear`, `adb reverse tcp:54321` set and the app's data
cleared** — and the served bundle demonstrably carried `http://localhost:54321`
while the running app did not. ⚠️ **The error rules out the innocent reading**:
`authErrorKey` maps a fetch failure to *sin conexión*, so the app reached an
auth server and was told no — it was still running a bundle built against the
hosted project. **Pointing a dev-client build at the local stack needs more than
restarting Metro.** ✅ `app/.env.local` was restored **byte-identical** (`diff
-q`) and the emulator shut down.

**THE FIVE DECISIONS A SCREEN CAN GET WRONG SILENTLY, each written down because
nothing else here can hold them:**

| | The decision | What the alternative costs |
|---|---|---|
| **1** | ⚠️⚠️ **THE ROWS ARE NOT PRESSABLE, AND THEY DO NOT LOOK IT** | `5d-iii` is what opens a family. A row that looked tappable and did nothing is *"a control that looks live and refuses silently"* — that row's own rule, applied a task early. No chevron, no ripple, no `Pressable` |
| **2** | ⚠️⚠️ **A MISSING PRICE IS A DASH IN `tintaApagada`, NOT AMBER** | `atencion`'s ONE job is C3.17: a row whose missing price BLOCKS a sale, where the fix is one tap away. Nothing here can set a price — `Editar` is `5e` — so amber would be an alarm on a hundred rows nobody can silence, and a second job for the role. ⚠️ **This is the one to look at again when `5e` lands** |
| **3** | ⚠️ **THE SEARCH BOX DOES NOT SCROLL AWAY** | C3.1 puts it *above* a scrolling list. A box inside the list as a header means scrolling back to the top to search, and the shop with a hundred products is the shop that searches |
| **4** | ⚠️ **IT CLEARS WITH A WORD (*Limpiar*), NOT A CROSS** | `clearButtonMode` is iOS-only and C1.1 puts two Androids among the four pilot phones. C12.1 refuses an icon with no word, so the control that works on both is a labelled one |
| **5** | ⚠️ **A `FlatList` AND NOT A `ScrollView`** | C8.3 is ~100 products and C1.1 two low-end Androids; a ScrollView mounts every row at once. This is the scroll that stutters on exactly those phones and on nobody's development machine |

⚠️⚠️ **AND THE ONE DECISION WITH A RIGHT ANSWER WAS MOVED OUT OF THE SCREEN
BEFORE IT SHIPPED.** The three things an empty list can mean — *the read is out*,
*this shop has no products*, *nothing matches what you typed* — began as a
ternary in the component, which is a decision no instrument here can read. It is
`emptyLineKey` in `@/api/catalog` now, returning a KEY of `ES.catalog` and never
a sentence (`R3`, `R4`, the shape `@/api/errors` and `linesOf` already use), with
four assertions on it. ⚠️ **The two that must not collapse**: a shopkeeper with a
hundred products who mistypes a name must not be told her catalog is empty — she
is the merchant C8.2 describes, whose catalog is deliberately incomplete.

**What shipped:**

| | |
|---|---|
| `app/src/app/productos.tsx` | the route, the banda, the search box, the list, the row, the initials tile and the three empty states |
| `app/src/api/catalog.ts` | `emptyLineKey` — the one decision on the screen that has a right answer |
| `app/src/app/(tabs)/index.tsx` | the temporary door, with the comment that names `5d-iv` as the task that deletes it |
| `app/src/strings.ts` | `ES.catalog`'s seven new words, the units map staying where it is |
| `app/test/api-catalog.test.ts` | **four new assertions**, 677 tests in the app suite |

⚠️ **THE VERIFICATION, NAMED — AND WHAT IT DOES NOT COVER.**
`npm run test --workspace @tienda/app` is **677 tests over 29 files**,
`npm run typecheck` clean, `bash docs/checks/conventions-gate.sh` **16 groups
over 55 source and 29 test files** — which is where `R6` caught a literal
`height: 1` in the separator and it became a hairline border, the same spelling
every other file uses — and `bash docs/checks/5d-i-catalog-contract.sh` is still
**12 of 12** against the live database. ⚠️⚠️ **Not one of those looked at a
pixel, and no check in this repository ever will.**

**DECISIONS TAKEN ON THE OWNER'S BEHALF:** the five in the table above, plus
**Productos is NOT in `RESTORABLE_ROUTES`** — C1.3 reopens the screen a person
was WORKING on, and browsing the catalog is not work. Every one of them is one
line to reverse.

---

## The NINTH cut, taken 2026-09-23 — `5d-iii`, and the owner's ruling is what spent the line

⚠️⚠️ **`## Position` REACHED 1,413 OF ITS 1,400 CEILING** once the C3.17 ruling was
recorded — the eighth cut, taken an hour earlier, had left enough room for the
`5e-iii-a` closing entry and not for a ruling arriving the same evening. So `5d-iii`,
the oldest entry left in that block, was moved here. ⚠️ **It is a MOVE and not a copy**,
and `plan-corpus.sh` reads this file, so every content-addressed lookup resolves it
exactly as before.

⚠️ **Fifth cut from the block's foot; eleven entries of 2026-09-22 are now here, in nine
cuts.** ⚠️⚠️ **And the lesson is the eighth cut's, sharpened: a session that ships a
task AND takes a ruling on the same evening writes TWO entries, not one** — sizing the
archive for one of them is what put this block over the ceiling twice in an hour.

✅✅ **`5d-iii` IS DONE AS OF 2026-09-22 — THE FAMILY OPENS FROM A TAP, AND
`5d-iv` IS THE NEXT TASK: INICIO, THE REAL ONE.** One route, three pure
functions, twelve assertions and the rows of Productos becoming pressable at
last. **No migration, no primitive and no `src/ui/`.**

⚠️⚠️ **THE HONEST HEADLINE FIRST, AND IT IS THE SAME ONE `5d-ii` CARRIED:
NOTHING IN THIS REPOSITORY CAN SAY WHETHER THIS SCREEN LOOKS RIGHT.** §2.11
keeps rendering, navigation and layout out of scope and `R9` is the rule.
**The instrument is the owner's phone**, and the three questions it is being
asked are named in the file's own header: whether a green rule down one row's
edge reads as *this is the one you tapped* rather than as an alarm, whether
three dead buttons read as deliberate rather than broken, and whether a family
of six variants still fits above the three buttons at *Letra grande*.

⚠️⚠️ **THE RULING IT IMPLEMENTS IS ONE LINE LONG AND IT FORBIDS THE OBVIOUS
ANSWER.** Área 13, ruling 4, in the owner's words: *"the preselected variant
shows no legend."* So the mark cannot be a word — not *seleccionado*, not a
tick, not a badge. **And área 13's other surviving rule forbids the other
obvious answer**: the one thing direction C left behind when B was chosen is
*no state is ever announced by colour alone*. **What is left is colour AND a
border**, which is what shipped: a `accion` rule down the row's leading edge
and a heavier name. ⚠️ **The rule's WIDTH is constant and only its COLOUR
changes**, because a border that appeared only on the marked row would shove
that one name three pixels sideways — the single row that then fails to line up
with the others, which reads as a rendering fault rather than as a mark.

**THE SIX DECISIONS A SCREEN CAN GET WRONG SILENTLY, each written down because
nothing else here can hold them:**

| | The decision | What the alternative costs |
|---|---|---|
| **1** | ⚠️⚠️ **NOTHING IS MARKED WHEN THE ID IS NOT IN THIS FAMILY — NEVER A FALLBACK TO THE FIRST ROW** | The ruling took the legend away, so the mark is the ONLY thing on the screen saying *this is the one you came from*. Marking row one on a bad parameter puts that claim on a product she never touched, with nothing to correct it. `familyView` returns `null` and four assertions hold it |
| **2** | ⚠️⚠️ **THE VARIANT ROWS HERE ARE NOT PRESSABLE EITHER** | Nothing consumes the selection yet: `Costos` and `Editar` are `5e`. A row that highlighted under a thumb and changed nothing is the control this whole step refuses — the same rule `5d-ii` applied to itself one task early. ⚠️ **One `useState` and a `Pressable` to reverse, the day `5e` gives the mark a consumer** |
| **3** | ⚠️⚠️ **THE THREE AFFORDANCES ARE `View`s, NOT DISABLED `Pressable`s, AND THEY BORROW NO ACTION COLOUR** | `accion`/`accionSuave` mean *tappable at rest*, which is the claim these must not make, so they are `tintaApagada` on `fondo` inside a `linea` border. And a `View` has no handler to attach, so there is no press path to wire up wrong later |
| **4** | ⚠️ **ONE SENTENCE UNDER THEM, NOT A LABEL ON EACH** | `ES.family.notYet` is the `ES.approvals.notYet` shape `5b-iii-d-1` shipped and `5b-iii-d-2` deleted — the one place this app explains its own state to a shopkeeper, because the alternative is her deciding her phone is broken. ⚠️ **`5e` deletes it**, and its own comment says so |
| **5** | ⚠️ **NO INITIALS TILE ON THIS SCREEN, AND PRODUCTOS KEEPS ITS OWN** | C8.14's two letters stand in for a PHOTO among DIFFERENT products; a family is one product in several sizes, so six identical tiles is six copies of a picture nobody needs — and on Productos the tile is what now says *tappable*, which these rows are not |
| **6** | ⚠️ **A `ScrollView` HERE AND A `FlatList` THERE** | The opposite call from Productos on the same argument: ~100 rows on two low-end Androids is what virtualisation is for (C8.3, C1.1), and a family is a handful of sizes whose three buttons have to scroll WITH them rather than float over them |

⚠️⚠️ **AND THE AFFORDANCE ON PRODUCTOS WAS ALREADY DECIDED, BY THE TASK THAT
COULD NOT USE IT.** `5d-ii` drew the initials tile on `fondo` and wrote down
why — *`accionSuave`'s one job is the resting fill of an action, and these rows
are not tappable until `5d-iii`*. They are now, so the tile moved to
`accionSuave` and the rows became `Pressable`. ⚠️ **The alternative was a
chevron, and C12.1 refuses an icon with no word beside it** — which is why the
affordance had to be carried by HUE, the thing direction B was chosen over
direction A for.

⚠️ **THE ROUTE SHAPE IS A DECISION TOO: `/familia/<family_id>?variante=<id>`.**
The family is what the screen SHOWS and the variant only marks a row in it, so
one is the path and the other is a parameter — **and a link that lost the
parameter still opens the right family with nothing marked**, which is the
failure worth having. ⚠️ It is at the ROOT and in NO GROUP (`groupOf()` →
`null`), it is a PUSHED screen rather than a sheet — no `Stack.Screen` entry, so
no `presentation: 'modal'` — and it is **not** in `RESTORABLE_ROUTES`, which is
Productos' own call: C1.3 reopens the screen a person was WORKING on, and
reading a product is not work.

**What shipped:**

| | |
|---|---|
| `app/src/app/familia/[id].tsx` | the route, the banda, the marked row, the three dead affordances and the two empty states |
| `app/src/api/catalog.ts` | `familyView`, `familyTitle`, `familyLineKey` — the three decisions on this screen that have a right answer |
| `app/src/app/productos.tsx` | the row is a `Pressable`, the tile's ground is `accionSuave`, and the header paragraph that promised both is now the record that it happened |
| `app/src/strings.ts` | `ES.family`'s nine words, the three affordances in the owner's own spelling |
| `app/test/api-catalog.test.ts` | **twelve new assertions**, 689 tests in the app suite |

⚠️ **THE VERIFICATION, NAMED — AND WHAT IT DOES NOT COVER.**
`npm run test --workspace @tienda/app` is **689 tests over 29 files** (twelve
new, all of them over `familyView` / `familyTitle` / `familyLineKey`),
`npm run typecheck` clean **after expo-router's typed-route declarations were
regenerated** — which is itself the evidence that the router discovers the new
file, since the generator walked `src/app` and emitted `/familia/[id]` — and
`bash docs/checks/conventions-gate.sh` is **16 groups over 56 source and 29 test
files** (55 before). ⚠️⚠️ **`docs/checks/5d-i-catalog-contract.sh` WAS NOT RE-RUN BY
HAND AND CI RAN IT ANYWAY — WHICH THE SESSION GOT WRONG FIRST AND THE JOB LOG
CORRECTED.** A hand-run would have asserted nothing new: this task adds no
column, no filter and no string that goes over the wire. **But `db.yml`'s
`paths:` has watched `app/src/api/**` since `5b-i`** — because a module under it
is a CLAIM ABOUT THE APPLIED SCHEMA — and this task appended three functions to
`app/src/api/catalog.ts`, so the whole database workflow fired: **12 of 12
against a real reset database, with its thirteen fixtures still red.** ⚠️ **The
first draft of this paragraph said that workflow does not fire on an app edit.
It does, and its own filter comment says why** — which is the difference between
reading the job log and reading the tick. ⚠️⚠️ **And not one of those looked
at a pixel.**

**DECISIONS TAKEN ON THE OWNER'S BEHALF:** the six in the table above, plus the
route shape and the `RESTORABLE_ROUTES` omission. **Every one of them is one or
two lines to reverse**, and the two worth a second look on the phone are the
mark (decision 1's rule, and whether it reads as *you came from here*) and the
three dead buttons (decisions 3 and 4 — whether they read as deliberate).

## The TENTH cut, taken 2026-09-23 as `5e-iii-b` closed — the iPhone day, off the FOOT again

⚠️ **ONE ENTRY, AND IT IS THE OLDEST THAT WAS LEFT** — the day the owner took his
phone back, which is also the entry that armed the `5R-f` gap. `## Position` stood at
**1,404 lines against its 1,400 ceiling** with `5e-iii-b`'s entry in place, so this came
off the foot of the block rather than its head, exactly as the fourth, eighth and ninth
cuts did. ⚠️ **It is MOVED, not copied**, and `plan-corpus.sh` still resolves every
content-addressed lookup out of this file.

✅✅ **THE OWNER TOOK HIS PHONE BACK ON 2026-09-22, AND A BUILD FOR IT FOUND A
DEAD POD NOBODY COULD HAVE SEEN.** *"I'm working through my iPhone, deploy it
there for me to see. Override anything related to the 30 day session check. I
want to keep working from my device."*

⚠️⚠️ **WHAT THAT RULING COSTS, STATED PLAINLY BECAUSE IT IS NOT RECOVERABLE BY
TRYING HARDER LATER: THE IPHONE HALF OF THE DAY-30 READING IS SPENT.** Opening
the app refreshes the session, and he will be opening it daily — so that phone
can no longer answer *how long does a session survive untouched*. ✅ **The
reading itself survives, on the instrument sealed for exactly this**: the AVD
`wera-reading-5a-iv-d`, a different Google account and no provisioning clock,
powered down since 2026-09-21. **A one-device reading is a weaker claim than a
two-device one, and it is the claim this project now has.** ⚠️ **The day-8
answer is unaffected and already in hand** — the session survived eight days on
both instruments, `last_sign_in_at` unchanged on each.

⚠️ **THREE ROWS WERE AMENDED RATHER THAN DELETED**, because a withdrawn
obligation that simply vanishes is indistinguishable from one that was dropped:
the ⏳ **2026-09-27** row keeps its date and loses its reason — it now keeps a
WORKING APP alive rather than an instrument, and *"do not launch the app"* is
withdrawn — the ⏳ **2026-10-13** row is now one instrument rather than two, and
`5a-iv-d`'s task row records the trade.

⚠️⚠️ **AND THE DATE DID NOT MOVE, WHICH WAS MEASURED RATHER THAN ASSUMED.** The
re-deploy the 2026-09-27 row asks for was done **five days early** — but
`xcodebuild` **reused profile `4930c966` instead of minting a new one**, read
off the built bundle's own `embedded.mobileprovision`, so it bought **no extra
days**: the app stops launching in his hand at `2026-09-27T14:22:11Z` exactly as
that row said. **A re-deploy is not automatically a new seven days**, and a
session that assumed it was would have told him he had until October.

⚠️⚠️ **THE FINDING: THE FIRST iOS BUILD SINCE `5c-ii-b` FAILED, AND NOTHING IN
THIS REPOSITORY COULD HAVE GONE RED.** `5c-ii-b-2` replaced
`@react-native-community/netinfo` with `expo-network` on 2026-09-22 — the ADR
§2.11 stack-table row the owner ruled the same day — and the package left
`node_modules` while **`app/ios/Pods` kept a `react-native-netinfo` target
pointing at a path that no longer exists**: *"Build input file cannot be found:
…/netinfo/ios/RNCNetInfo.mm"*. ✅ One `pod install` fixed it. ⚠️⚠️ **WHY NOTHING
SAW IT: NO WORKFLOW IN THIS REPOSITORY COMPILES THE NATIVE APP.** `app.yml` is a
typecheck, a Vitest suite and the document guards; `app/ios/` is not even
committed. **So a native-dependency change is invisible until somebody builds on
a Mac** — and the phone had been carrying the day-0 build of 2026-09-13 since
before `5b-iii`, so nobody had. ⚠️ **This is `R9`'s shape one layer below the
screen**: not *no check can see how it looks*, but *no check can see whether it
still compiles for a device.* **It cost fifteen minutes today because the owner
asked for a build; the day it costs more is the day a deadline is on it.**

**What he has, and what it is:** a **Release** build — `main.jsbundle` embedded,
3.7 MB — so it runs **with no Mac and no Metro**, which is what *working through
my iPhone* requires. ⚠️ A Debug build asks Metro for its bundle and shows a red
screen without one; the runsheet has said so since `5a-iv-a` and it is why this
was built Release rather than with `expo run:ios`.

⚠️ **THE INSTALL IS ARMED RATHER THAN DONE, BECAUSE THE PHONE WAS OFFLINE TO THE
MAC ALL SESSION** — `devicectl` reported it `unavailable` throughout. The
built `.app` is signed and waiting; connecting the phone and running
`devicectl device install app` is a thirty-second step, and the next session
should check it landed rather than assume it.
