# Status log — the 2026-09-26 working day, first cut

⚠️⚠️ **ARCHIVED 2026-09-26 FROM `docs/PLAN.md`'s `## Position`, WHICH STOOD AT 1,331
LINES AGAINST ITS 1,400 CEILING WITH NOTHING WRITTEN YET** — `plan-handover.sh`
assertion 7, and the remedy is the one that check names in its own failure. **69 lines
of headroom against an entry that runs 40–130** is the same arithmetic the 2026-09-24
and 2026-09-25 files were opened on: enough to pass, and not enough to write with.
⚠️ `5h-ii-c` measured it the day before and left it deliberately — *the cheapest moment
to trip a tripwire is the start of a session, not the middle of one* — and this is that
session obeying it.

⚠️⚠️ **EVERY LINE BELOW IS MOVED, NOT COPIED.** Two homes for one claim is the defect
this repository has recorded ten of, and `split-coverage.sh` fails on *"row appears 2
times"* because it reads the corpus, which includes this file.

⚠️⚠️ **THIS IS THE FOURTH FILE EVER OPENED FOR A DAY THAT WAS STILL RUNNING, AND THE
REASON IS THE ONE THE 2026-09-22, 2026-09-24 AND 2026-09-25 FILES ALL GIVE: THERE IS NO
OLDER DAY LEFT TO TAKE.** ⚠️ **A LATER SESSION APPENDS TO THIS FILE RATHER THAN MAKING A
SECOND ONE FOR THE SAME DATE** — one working day per file, and a
`status-log-2026-09-26b.md` would break it. ⚠️ **And it is never renamed to absorb a
later cut**: the plan's own history names these files, and renaming for tidiness makes a
recorded statement false.

⚠️⚠️ **AND 2026-09-26 HAS OVERTAKEN 2026-09-25 AS THE BUSIEST DAY THIS PROJECT HAS HAD.**
Six status-log entries before this cut — `5h-i`, `5h-ii-a`, `5g-iii-b`, `5h-ii-b`,
`5h-ii-c` and `5h.5`'s own — five build rows closed, **the whole of `5h` and with it the
last build row of step 5's undo**, the thirtieth owner ruling, and área 6 ruled in a
simulation round. ⚠️ **The two entries below are the day's OLDEST two**, which is the
cut taken oldest-first as every cut here is.

⚠️⚠️ **WHAT THE TWO BELOW ARE STILL THE ONLY RECORD OF.** `5h-i` holds the four área 6
rulings and the owner's own words behind each — where *undo* lives, who may undo what,
what `Costos` shows afterwards, and that Vender is mirrored — and §2.11 keeps rendering
out of scope, so **there is no constraint, grant or policy that holds them.** `5h-ii-a`
holds the finding that nothing in this schema records the order a shopkeeper keyed a
document's lines in. **Read them here, and cite this file when you do.**

---

✅✅✅ **`5h-ii-a` IS DONE, 2026-09-26 — THIS APP CAN SHOW A SHOPKEEPER WHAT SHE BOUGHT AND SOLD
LATELY, WHICH IT HAS NEVER BEEN ABLE TO DO. It writes nothing, and that was the point of taking it
first.** `Lo último` is `app/src/app/documentos.tsx` (the seventeenth screen) over
`app/src/api/documents.ts` (the **twenty-third** module of `src/api/`), reached from a new row on
Inicio. **It ships no migration.**

⚠️⚠️ **THE ESTIMATE WAS THE MEASUREMENT, AND IT FOUND FOUR THINGS ABOUT THE WIRE AND THREE ABOUT THE
SCHEMA — ALL SEVEN DRIVEN AGAINST A REAL POSTGREST BEFORE A LINE OF THE MODULE WAS WRITTEN.** Sized
`M/L`, one sitting, no split. Every one of these is a claim that would have been **200 and wrong**
rather than red:

| | What was asked | What the database said |
|---|---|---|
| **1** | Does a **to-many** embed over a **composite** foreign key resolve at all? | **200.** Every embed in this app until now is to-ONE and read FROM the line (`purchase!inner(…)`, `family(…)`); this one starts at the DOCUMENT over `purchase_line_header_fk` = `(purchase_id, workspace_id, location_id)`. A 400 about an ambiguous relationship was the likelier answer |
| **2** | Does `::text` survive **inside** that embed? | **Yes** — every money and quantity field arrives as a JSON string. ⚠️ Nothing in this app had read a cast column out of a nested array, and on `qty_display` the failure is **nearly invisible**: the double `3` renders as `3 kg` and only a fractional quantity gives it away |
| **3** | Does a parent `limit` truncate the lines? | **No — it counts DOCUMENTS.** `limit=1` over a three-line delivery answers one document carrying all three. The other reading would have `DOCUMENTS_LIMIT` rendering a delivery with some of its lines, which is the one failure here a shopkeeper would act on and could not detect |
| **4** | ⚠️⚠️ **What order do the lines come back in?** | **THE ONE THAT CHANGED THE DESIGN.** **Nothing in this schema records the order she keyed them in**: there is no ordinal column and `created_at` is **identical across every line of one document** (one statement, one `now()` — measured: three lines, one microsecond). Unordered they come back in heap order, which today *happens* to equal the keyed order and is guaranteed by nothing. ✅ **PostgREST will sort a to-many embed by a NESTED column** — `purchase_line.order=product_variant(name).asc` answers 200, alphabetical — so the order is the database's, meaningful, and needs no second sort in Hermes |
| **5** | — | **`record_sale` takes `unit_price_gross_per_base`**, not the NET spelling `record_purchase` takes (`0016:59`). The fixture reused the wrong one and got `400 / 22023` |
| **6** | — | ⚠️⚠️ **`0018:222` CLAMPS `occurred_at` TO SEVENTY-TWO HOURS.** A fixture keyed as *nine days old* lands at three days — **inside** a seven-day window, with a 200 and no complaint. **Nothing this app writes is ever outside `DOCUMENTS_DAYS` on the day it is written**, so the window is falsified with a NARROW read instead |
| **7** | — | ⚠️ **`0021:316` stamps a reversal at the moment of the VOID**, not of the document it cancels — so the newest `purchase` in a shop is the void written seconds ago. The check asserted the 2-hour delivery and **went red on correct behaviour** |

⚠️⚠️ **THE `{ referencedTable }` SPELLING `COSTS_ORDER` DOCUMENTS AS A TRAP IS THE CORRECT ONE HERE,
AND THE TWO FILES NOW USE OPPOSITE SPELLINGS ON PURPOSE.** That constant's paragraph is right: the
option form sets `<table>.order`, sorts the embedded rows *inside* each parent, and **on a to-one
embed is a silent no-op.** This embed is to-MANY, and sorting inside each parent is exactly the job.
✅ The document order, meanwhile, is a **plain column** — this read starts at the document, so
`COSTS_ORDER`'s ceremony would be a 400. **Both shapes are asserted, and asserted to be opposite**,
because a reader who has just learned one lesson would apply it in the wrong place.

⚠️ **WHAT IT DELIBERATELY DOES NOT ASK FOR, AND ALL THREE ABSENCES ARE DECISIONS PINNED BY THE
SUITE:** `unit_price_net_per_base` (**`5h-ii-b` adds it** to prefill a re-record; this row renders a
line total, and a 10× price error shows in it), `created_by` (the fence is *a cashier undoes her
OWN document*, so **`5h-ii-b` gets to argue for showing it** — `today.ts` refuses it for §2.7's
reason) and `recorded_offline` (an internal state, [[users-dont-do-bookkeeping]]). **A tidying pass
that adds any of them turns a test red and has to say why.**

⚠️⚠️ **AND IT FOUND A DEFECT IN A SHIPPED SCREEN THAT IS NOT THIS ROW'S TO FIX: `Costos` AND INICIO
DISAGREE ABOUT WHAT DAY IT IS.** `today.ts`'s own header says this app must not have *"two answers
to what day is it"* and settles the principle — **the phone is in the shop, so the device's day is
the shop's day** — because turning `location.timezone` into an instant needs `Intl.DateTimeFormat`,
which `R10` does not admit. **`costsFrom` buckets on `doc.occurred_at.slice(0, 10)`, the UTC date.**
Measured rather than inferred: `2026-09-26T01:30:00+00:00` slices to `2026-09-26` and is local
`2026-09-25`, so in this UTC−6 shop **a delivery keyed at 19:30 is labelled the NEXT DAY on the
chart and the PDF.** ✅ `dayOf` in the new module takes the device's day, which is the side
`today.ts` argues for. ⚠️ **It is parked in ⛔ DECISIONS OWED and given its own row (`5g-iii-b`)
rather than fixed here**, because the fix silently moves every date on a chart and a document he is
holding — see that block.

✅ **CHECKED BY `docs/checks/5h-ii-a-documents-contract.sh` — 16 assertion groups, live HTTP against
a real PostgREST** with a real shop, a real catalog, two unit dimensions, five documents, a void and
three real people — **its falsifier (10 fixtures: a green control, eight mutated contracts and one
that puts `0040`'s manager gate back, 18.7 s measured)**, and **`app/test/api-documents.test.ts`,
65 of the suite's 1,285 tests.** ⚠️ Both numbers are the RUNNER's: `npm --prefix app test` says
**1,285 across 42 files** (was 1,219 across 41), and the check prints its own group count.

⚠️⚠️ **THREE DECISIONS TAKEN ON HIS BEHALF, AND THE FIRST IS THE ONLY ONE THAT COSTS ANYTHING TO
REVERSE.** **(1)** ⚠️ **A SIXTH DOOR ON INICIO, AND ADR-035 §2.8's HOME ROW ENUMERATED FIVE.** A
screen reached from nowhere cannot be judged on a phone, and judging it is `R9`'s whole arrangement
— so the row ships, §2.8 carries a revision entry saying six, and **the placement is parked in
⛔ DECISIONS OWED** so he is re-offered it every session. ⚠️ `app/test/inicio.test.ts` pinned the
count at five *"because a sixth door is a decision about what Inicio is for, not a tidy-up"* — **so
the guard worked**, and it now pins six and says a SEVENTH is a decision. **Reversing it is three
deletions: a table row, a test line and an ADR entry.** **(2)** **One kind at a time, with a
switch**, rather than one interleaved list — and the reason is arithmetic rather than taste: a shop
rings far more sales than it takes deliveries, so sixty documents of a busy week are sixty sales and
Tuesday's mis-keyed delivery sits below all of them. **Reversing it is an edit to one screen.**
**(3)** `DOCUMENTS_DAYS` = 7 (his *"last week/couple of days"*, the wider of the two) and
`DOCUMENTS_LIMIT` = 60 — **ADR-035 §7 lists thresholds of this shape under Reversible**, and both
are one-line edits.

⚠️ **THE JOB IS ITS OWN, WHICH IS THE THIRD TIME `db.yml` HAS SPLIT RATHER THAN APPEND.** These two
steps were written into `catalog-write` and taken back out: that job runs 12-13 minutes against a
15-minute cap by its own header and was cancelled three times on `main` before `5R-g` split it, and
⚠️ **a cancelled job is neither a pass nor a failure**
([[a-cancelled-ci-job-is-not-a-failed-assertion]]). ⚠️⚠️ **`db.yml` NOW RENDERS FIVE JOB NAMES, NOT
FOUR** — `CLAUDE.md`'s workflow table is corrected in this PR, and so is its screen count (16 → 17),
its module count (22 → 23) and its test tally.

⚠️⚠️ **WHAT ONLY HE CAN JUDGE, AND IT IS THE WHOLE OF THE INTERFACE (`R9`, §2.11).** Whether a
delivery reads at a glance as *that one*; whether the lines under a document earn their room or want
collapsing; whether the switch is discoverable at *Letra grande*; whether seven days is the window
he expects when he scrolls to the bottom and stops. ⚠️ **He bounded all of it himself** — *"if we
can add these functionalities easily reachable and usable let's do so. We'll polish the interface
later"* — and `5h.5` is where the polish lands. **The build on his phone has to be rebuilt before he
can open this.**

⚠️⚠️ **`5h-ii-b` IS THE NEXT TASK, AND IT IS UNGATED** — the gate was *there is nothing to correct
from until there is a list to correct from*, and the list is shipped. ⚠️ It inherits every
measurement above rather than re-taking any of it, and what it must WIDEN is named in its own row:
two column strings, plus a re-run of this row's contract check and its falsifier, whose `F7` fixture
asserts `created_by` is absent today and will need inverting.

✅✅✅ **`5h-i` IS DONE, 2026-09-26 — ÁREA 6 IS RULED, AND THE ROUND CHANGED THE ANSWER THE WAY
BOTH EARLIER ROUNDS DID. `5h-ii` IS RE-SCOPED AND SPLIT THREE WAYS.** ~~and `5h-ii-a` is the next
task~~ — ⚠️ **struck in lower case deliberately, the rule `5b.8-i`'s row records: a strikethrough
is only a rendering, and `plan-handover.sh` reads the raw line. `5h-ii-a` closed the same day; the
marker is on `5h-ii-b`.**
The owner asked for this round in his own words — *"Let's address Area 6 with a back and forth set
of simulations to get to the best option for this pilot before we start 5h"* — and it ran with him
in the room. ⚠️ **It built nothing, which was the deliverable.**

⚠️⚠️ **THE OPENING RECOMMENDATION WAS RETIRED BY THE FIRST SITUATION, AND THE THIRD INTERVIEW ROUND
IS NOW THREE FOR THREE ON REVERSING ONE.** The brief's position was *put the undo ON the
confirmation*. Situation 1 — a cashier rings the wrong product with three people waiting — got this:
***"She fixes the money by hand and never touches the app. We won't want to add more noise to the
app now, it's a small error in the overall flow that won't have material consequences."*** ✅ **So
the undo is not for the common case at all**, and an affordance on the confirmation would have been
a cost paid on every correct sale to catch one she will not use.

⚠️ **AND A MEASUREMENT KILLED IT INDEPENDENTLY, WHICH IS WORTH RECORDING BECAUSE THE BRIEF ASSUMED
OTHERWISE.** `Vendido` and `Registrada` are on screen for **one second** — 260 ms in, a 520 ms hold,
220 ms out — and both carry `pointerEvents="none"`. **The confirmation is a flash, not a control.**
Hanging an undo on it was never a small addition; it meant holding every capture screen open longer
after every commit.

⚠️⚠️ **WHERE THE AFFORDANCE ACTUALLY GOES, IN HIS WORDS: *"My priority here is to make the
Purchasing and Selling processes as efficient and comprehensive as possible… Ventas is much more
difficult to do, but Compras is completely addressable due to the volume and criticality of it."***
Situation 2 put a 10× cost error into Comprar with nobody waiting. **He finds it by looking**:
*"Most likely the user will realize if he looks at his purchase history for the last week/couple of
days."* ⚠️⚠️ **THAT IS A SCREEN THAT DOES NOT EXIST.** `Costos` is per PRODUCT; nothing in this app
lists recent DOCUMENTS. **It is the one real build in all of this**, and it is why `5h-ii-a` is a
read and a list before anything can be undone.

⚠️⚠️ **HE ASKED FOR *CORRECT*, NOT *UNDO*, AND THEN FOR *DELETE* AS WELL.** *"We should be able to
adjust that, correct the amount or price."* — and, asked whether a duplicate needs removing too,
*"yes, delete for a duplicate."* ✅ **So `5h-ii` ships TWO affordances, `Corregir` and `Eliminar`**,
and `Corregir` is `void_transaction` followed by a re-record with the old lines prefilled. ⚠️ **The
shopkeeper never sees the word cancel** — [[users-dont-do-bookkeeping]], and the ledger keeps all
three documents. He confirmed the audit half unprompted: *"Of course we will have a history of any
of these changes for audit reasons."* ⚠️ **`0021` already stores `reversal_reason`, so the trail
says WHY and not only WHAT.**

⚠️⚠️ **AND A CLAIM THIS BLOCK CARRIED SINCE YESTERDAY IS FALSE — CORRECTED HERE.** `5g-iii` wrote
that *"no function in this schema writes a reversal — so a void is not reachable through the API at
all today, for any of the three kinds."* **`0021` both writes the reversal and grants it.** Measured
against the applied schema on 2026-09-26, not read off a file:
`void_transaction(p_kind text, p_id uuid, p_reason text)` carries `authenticated=X/postgres` in
`proacl`, over `revoke all … from public; grant execute … to authenticated` at `0021:448`. ⚠️ **What
was true is the narrower half**: `purchase` and `purchase_line` carry a SELECT policy and nothing
else, so no client can INSERT a reversal *directly* — the `security definer` RPC is the whole path,
and it is open. ⚠️⚠️ **THE COST OF THIS ERROR WOULD HAVE BEEN A MIGRATION NOBODY NEEDED**, written
into the next session's sizing as a certainty.

⚠️⚠️ **THE THIRD QUESTION ANSWERED ITSELF AND THE ANSWER IS *THE CODE ALREADY DOES IT*.** Asked what
a corrected delivery should look like a week later, he said ***"Just one line, clean"*** — no
*corregido* mark, no struck-through pair. ✅ **`costsFrom` already drops BOTH halves of a
reversal**, so `Costos` shows only the corrected price and needs **no change at all**. ⚠️ This was
the one the brief said it would not decide for him ([[tienda-decisions-need-shop-truth]]), and the
shop truth turned out to match the shipped behaviour exactly.

⚠️⚠️ **THE ROLE FENCE MOVED, AND THEN THE MIGRATION THAT WOULD HAVE CARRIED IT WAS REFUSED.**
Situation 4 put Rosa in front of her own mis-keyed delivery sixteen hours later, where `0021` refuses
her — *staff void their own document inside `void_window_minutes`*, and the window is 15. He ruled:
***"Rosa should be able to fix her own the next morning."*** ⚠️ **The session then found and reported
the coupling**: `void_window_minutes` is **one number for all three kinds**, lives on
`workspace_setting`, is capped at 1440 by `workspace_setting_void_window_sane`, and is **owner-writable
today** — so widening it for purchases also gives a cashier 24 hours to cancel her own SALES, which
is the one case where a short window is a theft control rather than an inconvenience. **The
recommendation was to split the window per kind — a migration.** ⚠️⚠️ **HE REFUSED IT:** *"It's fine
to keep both things tied together for now in our back end."* ✅ **So no migration**, and the
outstanding item is the VALUE — see ⛔ DECISIONS OWED, where it is parked because his two rulings
cannot both hold at 15 minutes.

⚠️⚠️ **AND VENDER GETS THE SAME THING AFTER ALL, WHICH REVERSES WHAT SITUATION 1 IMPLIED:** *"Mirror
it for Vender… Make the functionality for both for now, amend it and then I'll polish it both in
terms of roles/permissions and interface."* ⚠️ **That is not a contradiction of situation 1 and the
distinction is worth keeping**: Rosa will not reach for a correction mid-queue, and the shopkeeper
reviewing yesterday will. **The affordance lives on a list you go to, not on the counter.** ✅
Measured rather than assumed: `sale` and `purchase` carry the identical `reversal_of`,
`reversal_reason`, `created_by`, `recorded_offline` quartet, and `sale_select` / `sale_line_select`
admit **any member at their own location with no role gate** — so mirroring is genuinely the same
build and not a second one.

⚠️ **AND HE SET THE BAR FOR THE INTERFACE DELIBERATELY LOW, WHICH IS A SCOPE INSTRUCTION AND IS
RECORDED AS ONE:** *"if we can add these functionalities easily reachable and usable let's do so.
We'll polish the interface later."* **So `5h-ii` is charged with reachable and correct, not
finished** — and `5h.5`, which writes `src/ui/`'s conventions, is where the polish lands.

⚠️⚠️ **ONE QUESTION WAS PUT TWICE AND NOT ANSWERED, SO THE SPLIT CARRIES IT RATHER THAN GUESSING: a
document still in the OUTBOX has nothing to cancel.** The pilot store is offline half the day
([[pilot-store-is-offline-a-lot]]); a delivery keyed with no signal is a queued write with a
client-generated id and **no row in the database**, so `void_transaction` has nothing to take. ⚠️
**That is a second failure class and it is invisible from the screen** — which is the working
agreement's split reason (2), not size, and it is why `5h-ii-c` exists as its own row.

⚠️ **THE MARKER GOES TO `5h-ii-a`** — the read and the list, which is ungated and is the only one of
the three a session can finish without the others. ⚠️ **`5h.5`'s gate is re-pointed from `5h-ii` to
`5h-ii-c`**, because `5h-ii` is now a split parent and *a gate naming a row that is no longer
takeable is a gate nobody can clear* — the trap `5h`'s own split recorded one day earlier.

---

## The 2026-09-26 working day — SECOND CUT, appended 2026-09-27

⚠️⚠️ **APPENDED AND NOT A SECOND FILE FOR ONE DATE, WHICH IS THIS DIRECTORY'S OWN RULE** —
`CLAUDE.md` states it for the 2026-09-22 and 2026-09-24 rows, and `plan-corpus.sh` globs
`*.md` so a new file would need no wiring and would still be wrong: the plan's own history
names these files, and two files for one day makes a recorded statement false.

⚠️⚠️ **THE TWENTIETH CUT OVERALL, TAKEN BY `6a-i` — AND IT IS THE FIRST ONE THIS FILE'S OWN
PREDICTION CALLED FOR.** The first cut's header said *a later session APPENDS to this file*,
and this is that session. ⚠️ **`## Position` stood at 1,385 of 1,400 with `6a-i`'s closing
entry already written** — **15 lines of headroom against an entry that runs 40–130** — so
this is a cut taken to make the file writable for the NEXT session rather than to make this
one pass. **That is the nineteenth cut's argument inherited**: the remedy costs the session
already holding the context, and costs the next one a cold start.

⚠️ **182 lines, the day's two oldest remaining blocks** — `5h-ii-b` (`Corregir` and
`Eliminar`, the first write in this app that cancels anything) and `5g-iii-b` (the `Costos`
date, ruled and shipped within the hour it was parked). ⚠️⚠️ **`5h-ii-b`'s block carries the
finding `6a-i` then confirmed a third time**: `0021` measures its void window from
`recorded_at` on an offline write, so a cashier can void her own hours-old document — and
`6a-i` measured the same thing about a WASTE.

⚠️⚠️ **EVERY LINE BELOW IS MOVED, NOT COPIED.** Two homes for one claim is the defect this
repository has recorded ten of, and `split-coverage.sh` fails on *"row appears 2 times"*
because it reads the corpus, which includes this file.

✅✅✅ **`5h-ii-b` IS DONE, 2026-09-26 — THIS APP CAN CANCEL A DOCUMENT, AND IT HAD NEVER
CANCELLED ANYTHING.** `Corregir` and `Eliminar` sit under every standing row of `Lo último`, over
`void_transaction` (`0021`), on both kinds at the owner's instruction — *"Mirror it for Vender…
Make the functionality for both for now."* `app/src/api/corrections.ts` is the **twenty-fourth**
module of `src/api/`. **It ships no migration**, exactly as the row promised: the RPC has been
applied since 2026-09-04 and granted to `authenticated` all along.

⚠️⚠️ **THE SIZING WAS THE MEASUREMENT AGAIN, AND IT REVERSED HALF OF WHAT THE ROW PREDICTED.** The
row named two columns to widen and an argument for showing `created_by`; six probes against a real
PostgREST changed the shape of the whole fence. **Every one of these was driven before a line of
the module was written:**

| # | The question | What the database said |
|---|---|---|
| **1** | Do `qty_base::text` and `unit_price_net_per_base::text` survive inside the to-many embed? | **200, both as JSON strings.** `5h-ii-a` had proved the cast survives for the columns it asked for; this is the same claim for two more, and it is what `prefillOf` stands on |
| **2** | ⚠️⚠️ **What does `TD003` look like from the client?** | **HTTP 400, `{"code":"TD003"}`** — **not a 403.** A custom SQLSTATE is not a privilege error to PostgREST, so it would have fallen straight through to `unknown` and told a cashier *algo salió mal*. **She taps again.** This one assertion is what `@/api/errors`' new entry rests on |
| **3** | ⚠️⚠️ **Can a cashier void her own five-hour-old delivery against a fifteen-minute window?** | **YES, 200 — AND THE ROW HAD ASSUMED NO.** `0021` measures the window from `recorded_at` on an offline write and `occurred_at` otherwise (§2.6, amended 2026-09-04), and `record_purchase` stamps `occurred_at := now()` on an ONLINE write (`0018:221`). **So the clock starts when the document LANDS, never when the delivery happened**, and the window can only bite as real time passes |
| **4** | What does a replay answer? | **A SHORTER BODY.** A first void carries `{kind, voided, void_id, lines, movements, already_recorded}`; a replay carries four of the six. A parser requiring the counts would turn the idempotent success into a failure **on exactly the tap somebody makes when the first response was lost** |
| **5** | Does re-recording a voided delivery collide on `payload_hash`? | **No — `record_purchase` is idempotent on the CLIENT-GENERATED id** (`0018:455`), and the hash only guards that id. A correction mints a fresh one. ⚠️ **If this had been a `TD001`, `Corregir` would have cancelled a delivery and refused to put it back**, and nothing in the suite or the typecheck could have seen it |
| **6** | Does a cashier read `workspace_setting`? | **Yes** — `workspace_setting_select` admits every member (`0001:563`), and its own comment says the client reads `void_window_minutes` *"to render correctly"*. ⚠️ **The row then decided the client should NOT.** See below |

⚠️⚠️ **FINDING 3 IS THE ONE THAT DECIDED THE DESIGN, AND IT ARGUES AGAINST THE SCHEMA'S OWN
COMMENT.** To draw the window on this side the client needs `recorded_at`, `recorded_offline`, the
shop's setting **and a TypeScript copy of `0021`'s basis rule** — a second answer to *may she void
this*, in the one place where a wrong answer **hides a button she is allowed to press**, which is
undiagnosable from a shop floor. ✅ **So `mayCorrect` answers only the half that involves no clock**
— *is this person a manager, or is this her own document* — and the database answers the rest as
`TD003`, rendered as a sentence. ⚠️ **And it fails OPEN**: a role still in flight, a failed
membership read or an absent `created_by` all answer *yes*, into a `security definer` fence that
fails closed. A screen that hid its buttons whenever a second query was slow would be 2026-09-22's
`Cargando productos…` wearing a permission badge.

⚠️ **`created_by` WAS ADDED AS THE ROW PREDICTED AND NOTHING RENDERS IT**, which is the opposite of
the argument the row made for it — the argument is the FENCE rather than the display, so
`today.ts`'s §2.7 refusal is untouched. ⚠️ **`qty_base` is a THIRD column the row did not name**: a
cart line is `{ variantId, base }` where `base` is an integer in THOUSANDTHS of a base unit, and
deriving it from `qty_display` × `factor_to_base` would be a second answer to a quantity the
database already holds, in the one place a wrong answer re-writes the ledger.

⚠️⚠️ **TWO GUARDS WENT RED AND BOTH WERE WORKING.** `api-documents.test.ts` pinned *asks for
neither `created_by` nor `recorded_offline`* and `api-errors.test.ts` pinned the exact set of codes
the map knows. **Both are INVERTED rather than deleted**, and each says what changed and why:
`created_by` is now required and never rendered, `recorded_at` joins `recorded_offline` on the
banned list with the basis rule as its reason, and `TD003` is named as the only entry in that map
that means *you may not* rather than *something broke*. ⚠️ `5h-ii-a`'s falsifier fixture `F7` moved
from adding `created_by` to adding `recorded_offline` — **a column a check stops banning must start
being required**, or the assertion quietly becomes *anything goes*.

⚠️⚠️ **AND THE FALSIFIER CAUGHT A NON-FALSIFICATION IN ITS OWN FIRST RUN, WHICH IS THE CHEAPEST
LESSON HERE.** `F4` mutated `reasonDeleted` in `src/strings.ts` and the check went **GREEN** —
correctly, because the check READS that file to build its payload, so both halves of the comparison
moved together. **Output compared against its own input is self-consistent and blind**
([[assert-against-a-calendar-not-the-array]]). ✅ `F4` is now a trigger that strips accents from
`reversal_reason` on the way in, so what the assertion really holds — **that the audit trail
survives the transport byte for byte** — is the thing that can be broken. The claim it *used* to
pretend to hold (that the app sends what `src/strings.ts` says) lives in
`app/test/api-corrections.test.ts`, which is its right home.

✅ **CHECKED BY `docs/checks/5h-ii-b-corrections-contract.sh` — 21 assertion groups, live HTTP
against a real PostgREST** with a real shop, a real catalog, a supplier, an owner and an Empleada:
the RPC's three `p_` names, `TD003` on a 400, the idempotent replay and its shorter body, the fence
in **all four** of its cases (so a client fence drawn too WIDE goes red as loudly as one drawn too
narrow), ⚠️⚠️ **the window narrowed to 0 and widened back to 15 on the same document and the same
cashier — the one assertion the app cannot make, because the app never reads that table** — the
re-record with no hash collision, and a final read through the app's own column list showing *"just
one line, clean"* with the prefill columns round-tripping to the digit. **Its falsifier: 9 fixtures,
all behaving** — a green control, five contract mutations and three schema-level ones, each restored
in a `trap` on every exit path. ⚠️ **`5h-ii-a`'s check and falsifier were both re-run because
`documents.ts` changed: 16 groups and 10/10.** ⚠️ **The suite is 1,326 tests across 43 files**
(the runner's, `npm --prefix app test`, up from 1,291), of which `api-corrections.test.ts` is 35;
`conventions-gate.sh` is **16 groups over 83 source and 43 test files**.

⚠️ **THREE DECISIONS TAKEN ON THE OWNER'S BEHALF, ALL CHEAP TO REVERSE AND NONE OF THEM A
MIGRATION.** **(1)** ⚠️ **A CORRECTED SALE IS RE-PRICED AT THE SHELF.** `sale_line` stores the NET
while `record_sale` takes the **GROSS** (`0016:59`), and `quoted` reads a typed sell quote as gross
whenever `prices_include_tax` — true by `0001`'s default and true in every shop that exists — so
handing the stored figure back would undercharge by the IVA. Recovering the gross needs `tax_rate`
and `grossFromNet`, a third answer to *what is this sale worth*. `quoteFor` already falls back to
the catalog's own price for a sale, which is what Vender does every time it rings one. **The cost is
a shelf price that moved between the sale and the correction; the reversal is one column and one
function call.** ⚠️ The buy side is exact and unaffected. **(2)** ⚠️⚠️ **`Corregir` VOIDS FIRST AND
LOADS THE CART AFTER.** The alternative — prefill, and void when she commits — has two writes to
keep together and the second goes through the OUTBOX, so a correction keyed with no signal would
queue a fresh delivery while the wrong one still stood. **That is a DUPLICATE rather than a
correction**, and it is `5h-ii-c`'s territory; this ordering is what kept the queue out of this row.
⚠️ **What it costs: an abandoned correction leaves the document gone.** She asked for that and the
question said it would happen, `Lo último` shows it removed, and she can key it again — **nothing
is silently wrong, the ledger says exactly what she asserted.** **(3)** **The cart is REPLACED and
not merged**, with a second line on the question when the cart it is about to replace is not empty.
Two documents in one cart is not a thing anybody asked for, and the only work this can lose is a
delivery she started and never committed — **so she is told before it happens rather than after.**

⚠️⚠️ **AND ONE DEFECT THIS ROW WROTE AND THEN FOUND, BEFORE CI FINISHED — WORTH RECORDING
BECAUSE NOTHING IN THIS REPOSITORY COULD HAVE CAUGHT IT.** TanStack keeps a mutation's `error`
until the **next** `mutate`, and the confirmation box renders the refusal whenever `failed` is
non-null. So a `TD003` on one document was still set when the shopkeeper opened the question on
the NEXT one: **she would have read *pídele a un gerente* where the question belongs, about a
document nobody had refused her** — and `Sí, corregir` would not have been on screen at all.
✅ The hook now exports `forget` (`mutation.reset`) and the screen routes **every** open and close
through one `ask()` so no path can be the one that forgets. ⚠️ **`R2` keeps the suite off
components, so no test in `app/test/` can see this, and the contract checks are about the wire** —
it was found by re-reading the screen's state lifecycle, which is the only instrument there is.
**`5h.5` owns `src/ui/` and this is an argument for a single confirmation primitive** rather than a
fourth local copy of one.

⚠️ **ONE THING FIXED IN PASSING, AND IT WAS A PRE-EXISTING BUG THIS ROW WOULD HAVE TRIPPED OVER.**
Comprar's price-memory effect seeds a line's price from `provider_price_memory` unless a ref says it
already did — **and that ref lives on the SCREEN, so it is empty on every mount.** A prefilled cart
would have had its prices overwritten by the supplier's memory before they were ever seen. ✅ The
effect now leaves a line alone when it already carries a typed quote, **which also fixes the case
nobody had noticed: a persisted cart restored across an app restart had its typed prices silently
replaced.**

⚠️⚠️ **WHAT ONLY HE CAN JUDGE, AND IT IS THE WHOLE OF THE INTERFACE (`R9`, §2.11).** Whether two
buttons under every row is the right weight or too much furniture; whether *¿Corregir esta nota? Se
va a borrar y la vuelves a capturar* says what actually happens; whether landing on Comprar with the
cart already full is a relief or a surprise; and whether `Eliminar` in red is enough to keep a thumb
off it. **The build on his phone has to be rebuilt before he can open this.**

~~⚠️ `5h.5` is the next task, and it is ungated as of 2026-09-26 — its gate was `5h` closing,
and `5h-ii-c` closed the last row of it. ⚠️ Its own row calls it *"the last moment this is
cheap"*, and it is now right: `src/ui/` holds six primitives built across `5d`–`5g` with no written
rule, `5h-ii-b` added four more that are LOCAL to `documentos.tsx` (`Boton`, `Confirmacion`, `Frase`,
`Control`), and the last of those is a full-width button that is *nearly* the first. ⚠️ Step 6's
four screens are what arrive to one convention or to none. ⚠️ Two `Blocks` cells were re-pointed
away from it the same day so it would be takeable at all — see ⛔ DECISIONS OWED, and `5h-ii-c`'s
entry for the reasoning.~~ — ⚠️ **struck in lower case deliberately, the rule
`5b.8-i`'s row records.** ✅ **`5h.5` CLOSED THE SAME DAY — see the entry above, and the
marker is now on `6a`.**

~~⚠️⚠️ `5h-ii-c` is the next task, and it is ungated — the gate was `5h-ii-b`, and it is shipped.
⚠️ it inherits `prefillOf`, `mayCorrect`, `staleAfterVoid`, the two buttons and the confirmation
box, and its first job is still to ask the question `5h-i` put to the owner twice and never got an
answer to: *should she be able to fix a delivery while it is still queued, or wait until it lands?*
that is cheap to answer now, because there is finally something on screen to look at.~~ — ⚠️ **struck
in lower case deliberately, the rule `5b.8-i`'s row records: `plan-handover.sh` reads the raw line
and a strikethrough is only a rendering.** ✅ **The question was asked and RULED on 2026-09-26, and it
was the row's first act** — she fixes it now; see the entry above.

✅✅ **`5g-iii-b` IS DONE, 2026-09-26 — THE `Costos` DATE IS FIXED, RULED AND SHIPPED WITHIN THE
HOUR IT WAS PARKED: *"fix the Costos date, and build it to my phone."*** `costsFrom` calls
**`isoDay`** (`@/api/catalog`), so the chart and the PDF name the day the shopkeeper was standing
in. **It ships no migration.**

⚠️⚠️ **AND THE FIX FOUND SOMETHING WORSE THAN THE BUG: THE WRONG ANSWER WAS WRITTEN DOWN IN THREE
PLACES AND TWO OF THEM WERE TESTS DEFENDING IT.** `costs-pdf.test.ts` asserted that a delivery
keyed at **8pm on the 23rd** is labelled the **24th**, under a comment calling `slice(0, 10)` *"a
day Postgres already chose"*. `api-costs.test.ts` was blunter: *"THE DAY IS THE ISO PREFIX AND NOT
A `Date`'s LOCAL DAY, which is a **deliberate disagreement with `today.ts`**."*

⚠️⚠️ **POSTGRES CHOSE NO DAY.** `purchase.occurred_at` is a `timestamptz` — an INSTANT — so the
*ISO prefix* is the UTC calendar day, which is a choice and is the wrong one after 18:00 in a UTC−6
shop. ✅ **So this was not an oversight; it was a decision, recorded three times, and that is
exactly why nothing went red for a day.** The lesson is not about timezones: **a comment saying *this
disagreement is deliberate* is the strongest thing in a repository, and this one was wrong** — a
session reading it would have left the bug alone twice over. **A claim about the database belongs to
the database**, and `occurred_at` being an instant is readable from `0003` in ten seconds.

✅ **Both fixtures are rewritten to assert the fix, and BUILT FROM LOCAL INSTANTS** so they hold on
this Mac (UTC−6) and on CI (UTC) without a pinned `TZ` — the old comment's TZ worry was real and is
now answered by construction rather than by a slice. ⚠️ **The other day-bearing fixtures in those
files are UTC strings at 09:00–23:30Z, every one inside its own day under BOTH readings**, so they
agree either way and were deliberately left alone; a note in the file says a NEW day fixture must be
built locally.

✅ **AND `@/api/documents`' OWN `dayOf` WAS COLLAPSED INTO `isoDay` IN THE SAME PASS**, hours after
`5h-ii-a` wrote it. It had padded the parts by hand — a second SPELLING — and shipping that while
fixing a second ANSWER would have been the same defect one layer down. **`isoDay` is now the one
answer to *what day is it*, used by `catalog.ts`, `today.ts`, `costs.ts` and `documents.ts`.**

✅ **A PARSE GUARD IS NEW AND IS ASSERTED IN BOTH SUITES.** `slice(0, 10)` never cared whether the
value was an instant; `isoDay(new Date(…))` would render `NaN-NaN-NaN` as a chart label, so a point
whose instant cannot be read is dropped.

✅ **VERIFIED, AND NAMED:** `npm --prefix app run typecheck` clean; **1,288 tests across 42 files**
(the runner's, up from 1,285); `conventions-gate.sh` **16 groups over 82 source and 42 test files**;
`docs/checks/5g-iii-costs-contract.sh` **11 groups against a real PostgREST** — unaffected, because
it asserts the wire and the ORDER rather than the label — and its falsifier **10/10**;
`5h-ii-a-documents-contract.sh` **16 groups** and its falsifier **10/10**, both re-run because
`documents.ts` changed. ⚠️ **What no check can see is the picture**: the x-axis labels and the PDF
headings now read one day earlier for evening deliveries, and only his phone says whether that looks
right (`R9`).


---

## ⚠️⚠️ THIRD CUT — APPENDED 2026-09-27 BY `6a-ii-a`, AND IT TOOK THE WHOLE OF WHAT 2026-09-26 HAD LEFT

⚠️⚠️ **`## Position` STOOD AT 1,294 OF 1,400 WITH NOTHING WRITTEN YET, AND `CLAUDE.md`
PREDICTED THIS CUT BY NAME** — *"the next session should expect to take an archive cut
before it can write its own."* **106 lines of headroom against an entry that runs 40–130**
is the same arithmetic the first cut was taken on, one day later. ⚠️ **It is the
TWENTY-FIRST cut overall and the FIFTEENTH taken by a session that wanted to be writing
something else.**

⚠️⚠️ **AND IT EMPTIES 2026-09-26 OUT OF THE LIVE PLAN ENTIRELY — the two blocks below are
the day's last two, so this file is now WHOLE at three cuts.** The first cut held four
entries, the second took `5h-ii-b` and `5g-iii-b` (182 lines), and this one takes `5h.5`
and `5h-ii-c` (**225 lines**). ⚠️ **`CLAUDE.md`'s archive table had NO ROW FOR THIS FILE
and said in words that it did not exist** — *"There is no `docs/plan/archive/status-log-2026-09-26.md`
yet"* — **which was true when written on 2026-09-26 and false by 02:41 the next morning.**
The row is added in the same PR, and the lesson is the one that file spends its length on:
**nothing checks `CLAUDE.md`, so list `docs/plan/archive/` when you cite it.**

⚠️⚠️ **EVERY LINE BELOW IS MOVED, NOT COPIED.** `split-coverage.sh` reads the corpus, which
includes this file, and fails on *"row appears 2 times"*.

✅✅✅ **`5h.5` IS DONE, 2026-09-26 — `app/src/ui/` HAS RULES, AND THE ROW WAS POINTED AT A
DUPLICATE THAT TURNED OUT TO BE A TRIPLE.** `R14`, `R15` and `R16` are in
[`docs/CONVENTIONS.md`](CONVENTIONS.md) — *when a component moves there*, *what the file looks
like*, *what to do with the differences between the copies* — and **the page now defers nothing
for the first time since it was written at `5a-iv-b`.** `conventions-gate.sh` reads the first two
(**18 assertion groups over 87 source and 44 test files**, up from 16 groups over the 85 source
files that existed before this row added two — ⚠️ **the *82 and 42* in `5g-iii-b`'s entry was true
when it was written and went stale the same afternoon**, when `5h-ii-b` and `5h-ii-c` landed after
it; this pair is the runner's, taken from the run above rather than from the last entry that quoted
one) and its falsifier runs **33 fixtures, 32 red
and `F13` deliberately green**, up from 30. **It ships no
migration and touches no schema.**

⚠️⚠️ **`6a` — DESPERDICIO — IS THE NEXT TASK, AND THE MARKER HAS LEFT STEP 5 FOR THE FIRST TIME.**
Step 5 has no takeable build row left: `5f-iv` is out of the pilot, `5i` is deferred to v2,
`5a`/`5b.8-iii`/`5h-ii` are split parents, and **`5P-a` and `5P-c` are both named in ⛔ DECISIONS
OWED** — which assertion 7c reads, so neither could be marked next even if it were ready. `6a`'s
own gate was `5f` and `5f` closed on 2026-09-25. ⚠️ **It is reordered ahead of its step on the
owner's own instruction of 2026-09-21** — waste is the acquisition hook — so this is his sequencing
being obeyed rather than a session choosing what to do next.

~~⚠️⚠️ `5h.5` is the next task, and it is ungated as of 2026-09-26 — its gate was `5h` closing, and
`5h-ii-c` closed the last row of it.~~ — ⚠️ **struck in lower case deliberately, the rule `5b.8-i`'s
row records: `plan-handover.sh` reads the raw line for `IS THE NEXT TASK` and a strikethrough is only
a rendering.**

⚠️⚠️ **THE ESTIMATE HELD AT `S` AND FOUND FOUR THINGS, AND THE FIRST ONE WOULD HAVE MADE THE ROW
BREAK ITS OWN RULE ON THE DAY IT WROTE IT.**

| # | What the estimate went looking for | What it found |
|---|---|---|
| **1** | ⚠️⚠️ **Is the `Boton`/`Control` pair really the duplicate the row names?** | **It is a TRIPLE, and the third drawing is in another file.** `vender.tsx`'s `Vaciar carrito` confirm is **byte-identical in style** to `documentos.tsx`'s `Control` — which `Boton`'s own doc comment had half-noticed (*"which is `Vaciar carrito`'s own arrangement one screen over"*) without following up. ⚠️ **It matters because the machine-readable form of *already drawn twice* is *reached from two or more modules*, and two components in ONE route file fail it.** Found by grepping for the shape, not by reading the row |
| **2** | What do the copies actually disagree about? | **A corner radius nobody decided.** `Boton` rounded by `scale.rowGap` (8 / 12) and the other two by `scale.space / 2` (6 / 8). ⚠️ **`scale.space / 2` is 42 of the 61 `borderRadius` spellings under `src/app/` and `src/ui/`, in 12 of the 13 route files**; `scale.rowGap` appears three times and all three are in `documentos.tsx`, the newest file. **This is `Vacio`'s centring one task later, with a bigger count behind it** |
| **3** | ⚠️⚠️ **Can the rules be the ones ADR-035 §2.11 implies?** | **No — two of them would have been FALSE of the code.** *`src/ui/` reaches no data layer* and *`src/ui/` holds no words* both read well and are both wrong: `Cantidad` imports `@/api/catalog` (a type) and `Buscador` and `Cantidad` import `@/strings`. **The page's own standard is *every rule below is already true of `app/` today*, so the rules are the three that are** |
| **4** | What does closing the last deferral do to the instruments? | **It weakens two of them, and one silently.** 0b's *empty on both sides* is a legitimate pass, so a fourth pass this page forgets to announce is no longer caught; **0c's *the ADR names the task* half is DISARMED outright** (`if [[ -n "$PAGE_OWES" ]]`). ⚠️ **And it broke four fixtures at once** — see below |

⚠️⚠️ **AND R14's FIRST SPELLING WAS A SEVENTH SHAPE OF MISLEADING GREEN IN THIS REPOSITORY — THE
FIRST ONE THAT DEPENDED ON HOW LONG A FILE IS.** The count used `code "$g" | grep -q`, and this
script runs under `set -o pipefail`: `grep -q` exits the instant it matches, `code`'s own grep dies
of SIGPIPE with 141, and **pipefail hands the pipeline that failure** — so a caller was counted only
when the file was small enough for `code` to finish writing first. `documentos.tsx` (750 lines)
counted; **`vender.tsx` and `comprar.tsx` (~1,900) did not**, and R14 reported *"reached from 0
modules"* about two imports sitting in plain sight. ⚠️ **It reads as a bad RULE rather than a bad
pipeline, which is what makes it worth recording**: the obvious next move is to weaken the rule to
one caller. **`grep -c` reads to EOF and has no early exit.** ✅ **The regression fixture is the
BASELINE itself** — `Cantidad`'s only two callers are both big files, so the unbroken tree goes red
if this ever comes back, and the harness refuses to run at all on a red baseline.

⚠️⚠️ **FOUR FIXTURES WERE RE-ANCHORED BECAUSE CLOSING THE DEFERRAL LEFT THEM EDITING NOTHING.**
`F14`, `F15` and `F27` all worked by BREAKING a live deferral; with none left, their `sed`s matched a
row that had changed, a heading that was gone and a phrase that no longer existed — **three
`FIXTURE EDITED NOTHING` reports at once, and the gate was never wrong.** They now BUILD a deferral
instead, one side at a time, through two helpers — **a shape that survives the next pass too**, since
a task writing `R17` will simply be adding what the helpers already add. ⚠️ **`F28` had to arm 0b's
agreement first**, because the half of 0c it falsifies is the half that goes quiet when nothing is
deferred. ⚠️ **`owe_row` appends a row rather than editing `5h.5`'s**, so no fixture is pinned to
that row's wording — which is the expiry date that had just fired, for the fourth time in this file.

✅ **SHIPPED:** `app/src/ui/Boton.tsx` and `app/src/ui/Frase.tsx` — the **seventh and eighth**
primitives, each with two callers; four local components removed from `documentos.tsx` (`Boton`,
`Control` and `Frase` collapsed into two, with `Confirmacion` staying put because it has one caller,
which is `R14`'s corollary); `vender.tsx`'s `Pregunta` rewired to both; `R14`/`R15`/`R16` and a
rewritten closing section on the page; two assertion groups and three fixtures.
⚠️ **The suite is unchanged at 1,358 tests across 44 files** — the runner's number, and `R2` is why:
the suite is `.ts` and reaches no component, so **nothing in `app/test/` can see any of this.**

⚠️⚠️ **THREE DECISIONS TAKEN ON THE OWNER'S BEHALF, ALL CHEAP, AND THE FIRST ONE IS THE ONLY THING
HERE A PERSON CAN SEE.**
**(1) The corner radius is settled at `scale.space / 2`, so the `Corregir` and `Eliminar` buttons
under a document lose 2 px of corner** (6 instead of 8 normally, 8 instead of 12 in *Letra grande*).
Decided by count rather than taste, per the rule it was used to write. **Reversing it is one line in
`src/ui/Boton.tsx`.**
**(2) Three shapes were deliberately NOT extracted, with their counts written onto the page** so the
next session argues with a number: the **filled button** (9 drawings across 8 files, **seven with a
border and two without** — already drifted), the **scrim** (7 across 3) and the **chosen pill** (5
across 3, and one of the five spells the prop `isChosen`). **Each one decides what a shopkeeper sees
on six-plus screens at once, which is a row of its own and not a footnote to an `S`.**
**(3) `R16` is declared unenforceable rather than given a weak check.** A machine that could tell a
decided difference from an accidental one would be a machine that knows what the screen is for; the
page names *a person, at extraction* and *the status-log entry of the task that extracted it* as its
instrument — which is this paragraph.

⚠️ **WHAT NO CHECK CAN SEE (`R9`), AND IT IS SMALL FOR ONCE:** the 2 px above, and the fact that
`vender.tsx`'s confirm button should look **exactly** as it did — the swap was style-for-style
identical, so anything different there is a defect rather than a decision.

⚠️⚠️ **THREE STALE CLAIMS FOUND AND FIXED IN THE SAME PR, ALL IN FILES THAT EXIST TO PREVENT STALE
CLAIMS.** **(a)** `conventions-gate.sh`'s header said the harness had *"twenty-six fixtures,
twenty-five of which"* — it ran **thirty**, and had been decaying since `F27`; the count is now
deleted rather than corrected, pointing at `EXPECTED_FIXTURES`, which is the same move assertion 0d
made on the page's English count. **(b)** The page said `src/ui/` held **five** components in one
sentence and **six** in the next-but-one, having already been corrected from *"there is no
`app/src/ui/`"*. **(c)** `CLAUDE.md` said `5h.5` was next and ungated, and that `src/ui/` was built
*"with no written rule"* — both true when written that morning and both false now.




✅✅✅ **`5h-ii-c` IS DONE, 2026-09-26 — AND WITH IT `5h-ii`, `5h` AND THE LAST BUILD ROW OF
STEP 5's UNDO.** A note still sitting on the phone now appears in `Lo último` under *Sin enviar*
with the same two controls, and **`Corregir` and `Eliminar` on one of those are not voids at all** —
they are a delete on this device. `app/src/offline/unsent.ts` is the pure half and
`app/src/offline/useUnsent.ts` the half that opens SQLite. ⚠️ **It ships no migration and it makes
no server call whatsoever**, which is the first row in this project true of.

⚠️⚠️ **THE OWNER RULED THE QUESTION `5h-i` PUT TO HIM TWICE AND NEVER GOT AN ANSWER TO — 2026-09-26,
AND IT IS THE THIRTIETH RULING.** *Should she be able to fix a delivery while it is still queued, or
wait until it lands?* **She fixes it now**, and the second question of the same breath — who may,
given that the outbox records no author — **anybody signed in on the phone the row is sitting on.**
Both were taken as recommended, after being walked through the five situations rather than shown a
design.

⚠️⚠️ **THE ESTIMATE FOUND THAT THE ROW WAS DESCRIBING THE SMALLER HALF OF THE DEFECT.** The row said
the two buttons *"would refuse or, worse, appear to work"* on a queued note. **Measured: there was
no queued note on the screen at all, and neither was anything else.** `useDocuments` asks the
server, the read fails with no signal, and `documentsLine` answers the `ES.api` failure sentence —
so offline, the one screen built for finding a mistake was a spinner over *could not connect*. ⚠️ **And
the second-order failure is the expensive one**: she cannot find the delivery she just keyed, so she
keys it again. Two rows in the queue with two client ids, both land, and the shop has two
deliveries — **`record_purchase`'s idempotency is by ID and cannot help, because these are genuinely
two documents.** *The invisibility manufactured the duplicate.*

⚠️⚠️ **AND THE OTHER HALF OF THE ESTIMATE IS WHY THIS WAS AN `M` AND NOT MORE: THE ARITHMETIC WAS
ALREADY BUILT AND ALREADY UNDER TEST.** `writeCentavos` and `lineCentavos` (`@/offline/deadLetters`,
`5c-iv-b`) already price a queued payload to the centavo with the server's own half-up-away-from-zero
rounding — built for the dead-letter banner, two tasks before anything could enqueue. **So the peso
figure on an unsent note needed no new money path at all**, which is the cost this row looked like it
carried.

⚠️ **ONE FUNCTION WAS EXTRACTED RATHER THAN RE-SPELLED, AND THAT WAS THE WHOLE OF THE REFACTOR.**
`baseUnits` came out of `lineCentavos`: the money path needs `round(qty_display * factor_to_base, 3)`
to anchor a price on and the correction path needs the same integer to rebuild a `CartLine`, and
**two spellings of that conversion is the defect this repository has recorded ten times.** The half
that would have gone wrong is invisible — a cart rebuilt a thousandth out records a delivery that
disagrees with the one it replaced in the third decimal.

⚠️⚠️ **THE DESIGN DECISION THAT MADE THE ROW SMALL: AN UNSENT NOTE IS A `ShopDocument`.** A queued
write and a landed one are the same document seen from two sides, so `unsentDocuments` hands the
screen the type it already draws — and three things followed that would each otherwise have been a
second implementation. **`Documento` renders an unsent row with no new branch. `prefillOf` rebuilds
the cart from one UNCHANGED**, prices included, because the queue stores the very string
`record_purchase` takes. **And `mayCorrect` answers `true` by construction** — `createdBy` is `null`
and that function fails open on an author it does not know — ⚠️ **so the owner's ruling about who may
is held by the DATA rather than by a branch**, and `app/test/unsent.test.ts` pins it so a later
tightening of `mayCorrect` cannot quietly fence this list.

⚠️⚠️ **THE FENCE IS ONE SQL PREDICATE AND THE CLIENT'S OPINION IS NOT ALLOWED TO BE THE THING THAT
DECIDES.** `drop` is `delete from queued_write where id = ? and state = ?`, bound to
`DROPPABLE_STATE` — a new constant in `@/api/outbox`, where the states already mean something — and
**the delete's own `changes` count is the evidence.** A read-then-delete has a window the drain walks
through: this app's drain runs on a reconnect nobody asked for, and deleting a `flushing` row would
destroy the phone's only record of a write whose RPC is in the air and **may already have
succeeded** — so she would be told her delivery was removed while it landed. ⚠️ `dead` is refused by
the same predicate, which is §2.6's *"replay is manual, never automatic"* kept rather than re-argued.
⚠️ **And the word lives in ONE place**: two spellings of `pending`, one in a SQL string and one in a
component, is a fence that opens the day somebody renames a state.

⚠️ **THREE THINGS THIS PATH DOES **NOT** HAVE, EACH NAMED SO NOBODY LOOKS FOR THEM.** No cache to
invalidate — `staleAfterVoid` exists because a void changes what the server would answer, and a drop
changes nothing on it. No `working` state — the delete is synchronous SQLite with no network in it,
so there is nothing to be pending. And **no trace afterwards**: a void leaves two documents in the
ledger for ever, a dropped note leaves nothing. ⚠️ **That last one was put to the owner before he
ruled** rather than discovered later — it is correct rather than a loss, because as far as the shop is
concerned the note never happened, exactly like backing out of the cart before sliding.

⚠️⚠️ **AND THE SUITE CAUGHT A REAL BUG THAT NOTHING ELSE IN THIS REPOSITORY COULD HAVE SEEN.** The
first draft of `unsentDocuments` NARROWED the kind and never COMPARED it — `isDocumentKind(write.kind)`
where it needed `write.kind !== input.kind` — so **`Compras` listed queued sales and `Ventas` listed
queued deliveries.** It typechecked perfectly, the conventions gate was green, and there is no server
read to disagree with it. ✅ The guard is now ONE comparison doing both jobs, with a comment saying so:
it keeps each kind to its tab **and** excludes `waste` and `transfer` by construction, because neither
can ever equal a `DocumentKind` — and a separate guard for the second job would be a branch nothing
could reach.

✅ **CHECKED BY `app/test/unsent.test.ts` — 27 tests, the RUNNER's number, and it is the ONLY
instrument these rules will ever have.** Every claim in this row is about a write that exists solely on a phone with no
signal, so there is no wire to drive, no fixture a database can hold and **no live contract check
that is even possible** — which is the exact opposite of `5h-ii-a` and `5h-ii-b`, whose every claim
was about the wire. ⚠️ **The one wire claim this row could have made is already asserted**: that the
scale-6 price string the queue stores round-trips into `purchase_line` to the digit, which
`5h-ii-b`'s check drives for a string of identical shape (`formatDecimal(price, SCALE.unitPrice)` and
a `numeric(14,6)::text` are the same spelling). **Saying that is cheaper than a sixth `db.yml` job
asserting it twice.**

⚠️ **The suite is 1,358 tests across 44 files** (the runner's, `npm --prefix app test`, up from 1,326
across 43), of which `unsent.test.ts` is **27** and `offline-dead-letters.test.ts` went from 32 to **37** to pin
the extracted `baseUnits` directly — all three numbers off the runner, not off a grep
([[counts-belong-to-the-runner]]).
`conventions-gate.sh` is **16 groups over 85 source and 44 test files**. ⚠️⚠️ **AND
`auth-errors.test.ts`'s OUTBOX-READERS ASSERTION WENT RED ON THE WAY, WHICH IS THE THIRD TIME IT HAS
DIRECTED A DESIGN.** Its comment says the property is not *how many* but that **none of the entries
is a screen** — so the queue read and the delete were put in a module and `documentos.tsx` was given
a hook. **The queue now has four verbs**: `commitRunner` FILLS it, `flushRunner` DRAINS it,
`DeadLetterBanner` COUNTS it, `useUnsent` SHOWS it. The assertion now also asserts the property
directly rather than only by the equality.

⚠️ **AND `R4` WENT RED FOR THE REASON IT ALWAYS DOES** ([[jsx-comments-are-code-to-the-gate]]): a
`{/* */}` comment quoting a Spanish sentence is a Spanish literal to the gate, which reads the file
and not the AST. The comment now NAMES `ES.documents.subtitle` instead of quoting it, and says why.

⚠️⚠️ **TWO `Blocks` CELLS WERE RE-POINTED AND IT IS A DECISION TAKEN ON THE OWNER'S BEHALF —
REPORTED HERE AND IN THE PR.** Both open decisions were filed against `5h.5` with the words *"it
blocks nothing takeable… because that is the last row of `5h`"*, and **that premise expired the
instant this row closed and made `5h.5` the next task.** Assertion 7c pulls every id out of that
column and refuses a next task named in it, so the plan would have refused the one row `CLAUDE.md`
calls *"the last moment this is cheap"*. ✅ **They are re-pointed at rows they genuinely stand in
front of rather than at a new convenience**: the corrected-sale price to **`5P-c`**, the tally the
pilot is graded on, because a sale recorded at a price the customer did not pay is exactly a
discrepancy that tally surfaces; and `Lo último`'s placement to **`5P-a`**, because §5's overlay
counts taps per transaction and abandonment against a fixed inventory of doors and a sixth one
changes what is being measured. **Reversing either is one word in one cell.**

⚠️⚠️ **WHAT ONLY HE CAN JUDGE (`R9`, §2.11), AND IT IS THE PLACEMENT RATHER THAN THE BEHAVIOUR.**
Whether a heading and one line above the seven-day list is enough to tell an unsent note from a sent
one **once she has scrolled** — there is no per-row mark, deliberately, because a redundant label is
furniture and `5h.5` is where one would land. Whether *Sin enviar* is the right word over *Todavía
están en este teléfono*. And whether landing on Comprar with a re-keyed queued delivery already in
the cart reads the same as it does for a landed one. **The build on his phone has to be rebuilt
before he can open this.**

⚠️⚠️ **ONE GAP NAMED RATHER THAN LEFT TO BE FOUND: A QUEUED **WASTE** IS STILL INVISIBLE.**
`WriteKind` has four members and this list has two — Desperdicio is `6a` and has no document list at
all — so a waste keyed with no signal is in the outbox and on no screen. **That is the same gap `5g`
had for its undo**, it is not a regression, and it closes when `6a` gets a list of its own.

