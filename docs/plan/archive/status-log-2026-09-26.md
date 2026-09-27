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
