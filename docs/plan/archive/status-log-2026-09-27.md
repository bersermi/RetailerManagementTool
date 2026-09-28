# Status log — the 2026-09-27 working day, first cut

⚠️⚠️ **ARCHIVED 2026-09-27 FROM `docs/PLAN.md`'s `## Position`, WHICH STOOD AT 1,290
LINES AGAINST ITS 1,400 CEILING WITH NOTHING WRITTEN YET** — `plan-handover.sh`
assertion 7, and the remedy is the one that check names in its own failure. **110 lines
of headroom against an entry that runs 40–130** is the same arithmetic every file here
was opened on: enough to pass, and not enough to write with. ⚠️ `6a-ii-a` measured it
the day before and left the note in `CLAUDE.md` — *the next session should expect to take
a cut before it can write its own* — and this is `6a-ii-b` obeying it.

⚠️⚠️ **EVERY LINE BELOW IS MOVED, NOT COPIED.** Two homes for one claim is the defect
this repository has recorded ten of, and `split-coverage.sh` fails on *"row appears 2
times"* because it reads the corpus, which includes this file.

⚠️⚠️ **THIS IS THE FIFTH FILE EVER OPENED FOR A DAY THAT WAS STILL RUNNING, AND THE
REASON IS THE ONE THE 2026-09-22, 2026-09-24, 2026-09-25 AND 2026-09-26 FILES ALL GIVE:
THERE IS NO OLDER DAY LEFT TO TAKE.** ⚠️ **A LATER SESSION APPENDS TO THIS FILE RATHER
THAN MAKING A SECOND ONE FOR THE SAME DATE** — one working day per file, and a
`status-log-2026-09-27b.md` would break it. ⚠️ **And it is never renamed to absorb a
later cut**: the plan's own history names these files, and renaming for tidiness makes a
recorded statement false.

⚠️⚠️ **2026-09-27 IS THE DAY STEP 6 STARTED AND THE DAY IT NEARLY FINISHED ITS FIRST
ROW.** `6a` was taken, split, and both halves of `6a-i` and `6a-ii-a` shipped before this
cut was taken — plus `0041`, the first `security definer` view this schema has ever
carried, and the eighth re-deploy to the owner's phone, which is the first in eight that
actually moved the expiry date. ⚠️ **The two entries below are the day's OLDEST two**,
which is the cut taken oldest-first as every cut here is: `6a-ii`'s sizing and split, and
`6a-i`'s own closing entry.

---

⚠️⚠️ **`6a-ii` IS SIZED `XL` AND SPLIT IN TWO, 2026-09-27 — AND THE SPLIT IS ON SIZE, WHICH THE
WORKING AGREEMENT ALLOWS FOR EXACTLY ONE LETTER.** The row carried the estimate `S/M, size it
again`, made while it was still blocked; re-sized on the day it was taken it is **`M` + `M`** and
the seam is `5h-ii`'s own, applied a second time: **the view and the list first, the two controls
second.** ⚠️ **`5h-ii` did this work for `purchase` and `sale` and was split THREE ways** — the
list, the controls, the note still in the queue — **so one row for waste's equivalent PLUS a
migration PLUS a pgTAP suite is three of those children in one sitting.** ⚠️ **The amended
agreement is honoured rather than dodged**: `M` and `L` are one sitting, **`XL` still splits on
size**, and this is the first row since the amendment to split for that reason alone.

⚠️ **The plan's own objection was read and is satisfied by ORDER rather than overruled.** The row
said the two *"are not split again"* because *"half an undo on the one screen with no history is a
button that cancels something she cannot see."* **That forbids shipping the controls WITHOUT the
view; it does not forbid shipping the view without the controls** — which is precisely what
`5h-ii-a` did, and what the owner then judged on his phone. `6a-ii-b` is gated on `6a-ii-a` in its
own gate cell, so the order is held by the plan and not by a memory.

⚠️⚠️ **AND THE ESTIMATE WAS THE MEASUREMENT AGAIN: FOUR PROBES AGAINST A REAL POSTGREST AND A REAL
POSTGRES, AND THEY ANSWERED EVERY DESIGN QUESTION THE ROW HAD LEFT OPEN — INCLUDING TWO IT DID NOT
KNOW IT HAD.**

**(1) THE `security_invoker` TRAP IS REAL, AND NOW IT IS A NUMBER.** One workspace, one cashier
holding `staff` at her own location, one write-off she recorded herself. Read under
`set role authenticated`:

| Reader | `waste_line` | a `security_invoker = true` view | a **definer** view stating its own predicate |
|---|---|---|---|
| the cashier | 0 rows | **0 rows** | **1 row** |
| the owner | 1 | 1 | 1 |
| a second workspace's owner | — | — | **0 rows** |

**So the invoker view is empty for the person it exists for, the definer view answers her, and the
tenancy wall still holds against an outsider.** ⚠️ That last row is the one that makes the first
two safe to act on: a definer view bypasses RLS on every table it touches, so *it works* and
*it does not leak* are two claims and both had to be driven.

⚠️⚠️ **(2) AND THE ROW DESCRIBED `0009` WRONGLY — CORRECTED HERE.** It called
`product_margin_daily` *"a definer view stating its own predicate"*. **It is
`security_invoker = true`** (`0009:118`) with `has_role(…, 'manager')` inside the body as a FLOOR,
which is the opposite mechanism: that view narrows what a MANAGER can be shown, where this one has
to reach around a fence a CASHIER is on the wrong side of. **Every one of the SIX views in this schema is
`security_invoker = true`**, so `0041` is the seventh view and the first definer one this project
has ever shipped. ⚠️⚠️ **THAT NUMBER WAS *fourteen* FOR AN HOUR AND THE SOURCE OF THE ERROR IS THE
ONE THIS REPOSITORY NAMES MOST OFTEN**: `grep -c 'security_invoker' supabase/migrations/` counts each
`create or replace` again, and four of the six were re-issued. **The six is the DATABASE's** —
`relkind = 'v'` in `public` — and the suite asserts it rather than quoting it ([[counts-belong-to-the-runner]]). The half of the row that was right — *state
your own predicate* — is `0009`'s and is kept.

⚠️⚠️ **(3) THE ORDERING QUESTION THE ROW LEFT UNMEASURED IS ANSWERED YES, AND NON-VACUOUSLY.** It
asked whether PostgREST can order a to-many embed on TWO keys. One document, four lines, the same
product twice under two causes, driven over HTTP:

| Spelling | What came back |
|---|---|
| no order | `Zanahoria/dañado, Aguacate/robo, Aguacate/caducado, Yogurt/caducado` — heap |
| `…order=variant_name.asc,reason.asc` | `Aguacate/caducado, Aguacate/robo, Yogurt, Zanahoria` |
| `…order=variant_name.desc,reason.desc` | exactly inverted |

⚠️ **The third row is what makes the second one evidence rather than a coincidence** — heap order
happened to differ from both, and the reversed spelling MOVED the result, so the parameter is doing
the work ([[assert-against-a-calendar-not-the-array]]).

⚠️⚠️ **(4) AND A FOURTH PROBE CHANGED THE VIEW'S SHAPE: THE PRODUCT'S NAME IS A **COLUMN** ON THE
VIEW AND NOT A NESTED EMBED, EVEN THOUGH THE EMBED WORKS.** Both spellings answered 200 — `waste`
embedding the view, and the view embedding `product_variant(name)` inside it. The name is
denormalised anyway for three measured reasons: a nested embed is a SECOND read with its own fence,
and the one thing this row exists to prevent is a cashier's read coming back empty; the two-key
order above needs the name to be the view's own column; and **it grants her nothing new** —
`product_variant_select` is `workspace_id in my_workspaces()` (`0002:507`), which is the workspace
half of the view's own predicate, so she could already read every one of those names.

⚠️⚠️ **ONE DECISION IS TAKEN ON THE OWNER'S BEHALF BY THE SPLIT ITSELF AND IT IS NAMED IN
`6a-ii-a`'s ROW: ADR-035 §2.7 HAS TO BE AMENDED, BECAUSE HIS OWN RULING MADE ONE OF ITS SENTENCES
FALSE.** §2.7 says *"the views are `security_invoker = true` so RLS still governs rows."* Reading
(a) cannot be. **It is reported, not asked, because he ruled on the substance this morning** —
*"Go with (a)"*, where (a) was put to him as a definer view — and re-asking a settled question is
not a gate. See that row for what reversing it costs.


✅✅✅ **`6a-i` IS DONE, 2026-09-27 — THIS APP CAN RECORD A LOSS, AND `record_waste` HAD BEEN
APPLIED AND CALLERLESS FOR TWENTY-TWO DAYS.** `app/src/app/(tabs)/desperdicio.tsx` is **nine lines
of `Pendiente` become 1,079**, over **`app/src/api/waste.ts`, the twenty-fifth module of
`src/api/`** — `ls app/src/api | wc -l`, 24 before. ⚠️⚠️ **AND IT ADDS NO SCREEN, WHICH THE FIRST
WRITING OF THIS ENTRY GOT WRONG BY CALLING IT *the eighteenth*.** The route has existed since
`5a-ii` as a `Pendiente` placeholder, so `find app/src/app -name '*.tsx' | wc -l` reads **17 before
and after** — 15 routes and 2 layouts, and `CLAUDE.md` is explicit that a layout is not a screen.
**A count off a file is a claim about the file** ([[counts-belong-to-the-runner]]), and this one was
caught by running the command rather than by reading the last entry that quoted one. `0019` was applied on 2026-09-05 with 67 behavioural checks and
ten falsifications against it, and **nothing in `app/` had ever called it.** Everything the write
needed was already here: `WRITE_KINDS` has held `waste` since `5c-i`, `RECORD_RPC` has named the
function since `5c-ii-a`, and `classify` has known how to dead-letter it since `5c-iii`. **What was
missing was a basket, a cause and a screen.** ⚠️ **It ships no migration.**

⚠️⚠️ **`6a` SPLIT IN TWO ON THE DAY IT WAS TAKEN, AND THE REASON IS NOT SIZE — IT IS THAT APPLIED
SQL PUT A MIGRATION IN THAT ROW AND THE PLAN NEVER CARRIED IT.** Two comments, both in migrations
CI has applied: **`0003:589`** — *"the reason-and-quantity view for Desperdicio **ships with that
screen**"* — and **`0011:68`** — *"a reason breakdown is a second view over `waste_line` alone…
**it belongs with the Desperdicio screen (step 6)**"*. ⚠️ **Neither is in `docs/PLAN.md`, and `6c`'s
row still claimed to be *"the first thing in step 6 that ships a migration"* — corrected in this
PR.** So the seam is **exception (1) of the working agreement**: the capture screen needs no
migration and no ruling, and the view is both.

⚠️⚠️ ~~`6a-ii` is the next task, and it was unblocked the same day it was blocked~~ — ⚠️ **struck in
lower case deliberately, the rule `5b.8-i`'s row records. `6a-ii` was sized `XL` and split in two the
next morning; the marker is `6a-ii-a`'s.** **THE THIRTIETH RULING STANDS, IN FIVE WORDS:
*"Go with (a), and build it to my phone."*** The view carries reason,
quantity, product, document and date, and **never `unit_cost_net_per_base`**; `waste_line_select`
stays manager-and-above, so (a) works AROUND the fence rather than opening it.

~~⚠️⚠️ `6b` — Proveedores — is the next task, and it is ungated. `6a-ii` cannot be, because it is
named in ⛔ DECISIONS OWED and assertion 7c refuses a next task named in that column.~~ — ⚠️ **struck
in lower case deliberately, the rule `5b.8-i`'s row records.** ⚠️⚠️ **IT WAS TRUE FOR ABOUT AN HOUR
AND THE RULING ENDED IT**, which is the holding move working rather than failing — `6c` recorded the
same shape on 2026-09-24. **`6b` is untouched and still ungated**: its gate was `5g` and `5g` closed
on 2026-09-25. ⚠️ **`6c` is the other ungated row in step 6 and it is
left where the owner put it** — he has said the prebuilt catalog is indicative and not to hold up the
front end, and *"he cannot delete anything at all until it ships"* is the sentence that moves it, on
his word rather than on a session's.

~~⚠️⚠️ `6a` — Desperdicio — is the next task, and the marker has left step 5 for the first time.~~ —
⚠️ **struck in lower case deliberately, the rule `5b.8-i`'s row records: `plan-handover.sh` reads the
raw line for `IS THE NEXT TASK` and a strikethrough is only a rendering.**

⚠️⚠️ **AND TWO GATE CELLS WERE RE-POINTED BEFORE THIS ROW COULD CLOSE, WHICH IS THE TRAP `5h` AND
`5h.5` BOTH RECORDED, ARRIVING A THIRD TIME.** `7c` (*what am I throwing away*) and `7e` (*what is at
risk of becoming waste*) were both gated on **`6a`** — now a split parent, so **a gate naming a row
nobody can take is a gate nobody can clear.** `7c`'s is CLEARED (the screen exists) and `7e`'s is
re-pointed to `6a-i` and now contains only time: **a derived shelf life needs weeks of waste
records, and that clock started today.**

⚠️⚠️ **THE ESTIMATE WAS THE MEASUREMENT AGAIN AND IT RAN TWELVE PROBES AGAINST A REAL POSTGREST
BEFORE A LINE WAS WRITTEN. Three of the twelve changed the design; two of those three were
200-and-wrong rather than red.**

| # | The question | What the database said |
|---|---|---|
| **1** | ⚠️⚠️ **Can an Empleada read back the loss she just recorded?** | **NO — and it is an HTTP 200 with `"waste_line": []`.** A header with no products, not a refusal. `waste_select` admits every member and `waste_line_select` carries `has_role(…, 'manager')` (`0003:596`), because the LINE holds `unit_cost_net_per_base`. ⚠️ **The only asymmetric pair in this schema**, and `0040` kept it closed BY NAME while widening `purchase`. **This one assertion is the whole reason `6a-ii` exists and is blocked** |
| **2** | ⚠️⚠️ **Does the same variant twice, under two causes, collapse?** | **NO — two rows, 200. And under the SAME cause it is also two rows.** `record_waste` dedupes nothing, and neither does `record_sale`; the existing cart's `variantId` key is the only thing preventing it there. **So the cart must key on something, and this is what settled *one cause per document*** — the alternative is a `(variantId, reason)` line identity through `@/cart`'s whole surface |
| **3** | ⚠️⚠️ **Is `unit_price_gross_per_base` optional?** | **NO — omitting it is 400 / `22023`, *"unit_price_gross_per_base is required"*.** So for a product with no shelf price the options are a zero, a guess, or no row at all. ⚠️ **An explicit `"0"` is accepted and stores `line_net` of `0.00`** — which is what `UNPRICED_WASTE` is |
| **4** | What does an invalid cause look like? | **400 / `22P02`, and the message leaks a Postgres type name** — *invalid input value for enum public.waste_reason*. It must never reach a shopkeeper, which is what `isWasteReason` guards a restored basket against |
| **5** | A line with no cause? | **400 / `22023`, with a sentence quoting §2.8.** So *reason-first* has a server-side lock and the client's two are braces, not the only thing holding it |
| **6** | ⚠️ **What is the default `qty_display_unit`?** | **The SELL unit, as `0019` documents — and the cart holds BASE units.** `qty_display: 500` with no unit against a `g`-based, `kg`-sold variant stored **`qty_base: 500000` — five hundred KILOS.** Nothing was wrong; the point is that the client must send the unit every time, which `qtySent` already does |
| **7** | ⚠️ **What order does the enum sort in?** | **DECLARATION order, not alphabetical.** `?order=reason` returns `caducado, dañado, merma de preparación, robo o faltante, error de captura`. **So the picker's order and a reason breakdown's must be the same order, and nothing else in this repository could see them differ** |
| **8** | Can a cashier void her own write-off? | **YES, 200, on a one-hour-old document against a fifteen-minute window** — `5h-ii-b`'s finding a third time: `0021` measures the window from `recorded_at` on an offline write. **So `Eliminar` would work for her today; `Corregir` needs the lines and therefore the view** |
| **9** | Waste beyond what the shelf holds? | **200, recorded, and the shelf goes negative** — the owner's ruling of 2026-09-04 holding. ⚠️ **And `unit_cost_net_per_base` comes back `0` for the shortfall**, which is C8.6 live and is why área 9's ruling exists |
| **10** | Accents through the round trip? | **Verbatim.** `dañado` and `merma de preparación` are two of the five, so the vocabulary assertion is a UTF-8 one as well |

⚠️⚠️ **FOUR DECISIONS TAKEN ON THE OWNER'S BEHALF, AND THEY ARE IN THE PR BODY TOO. THE FIRST TWO
CHANGE WHAT A SHOPKEEPER SEES.**

**(1) ONE CAUSE PER DOCUMENT, CHOSEN BEFORE THE CATALOG IS SHOWN.** §2.8's whole row for this
module is six words — *"Reason-first waste entry | Feeds the analytics asset"* — and the shape that
sentence describes is `Comprando a:` with a cause in it. The schema permits a mixed-cause document
(finding 2) and the screen does not produce one; **two shapes of loss are two documents, which is
also the honest shape at a bin.** **Reversing it is a `reason` on `CartLine` and a composite line
key — no migration, because the schema already allows both.**

**(2) NO PESO TOTAL ANYWHERE ON THE SCREEN.** This is **área 9's ruling of 2026-09-14 applied**, and
it names this screen: *"Números and Desperdicio SHOW WASTE AS QUANTITY AND NOT AS COST OR AS A RATE,
until something fixes `0011`."* The sticky bar counts products where Vender's sums pesos, and the
sheet's rows carry no line total. ⚠️ **C8.2's deliberately short catalog is what makes the
alternative wrong**: a peso figure here would read `$0.00` for exactly the products most likely to
spoil, which the ruling calls the one thing worse than a number that is missing. **The retail value
is still recorded in `waste.total_net`.** ⚠️⚠️ **AND IT IS WHAT MAKES DECISION (3) INVISIBLE TO A
SHOPKEEPER RATHER THAN SOMETHING SHE HAS TO UNDERSTAND.**

**(3) AN UNPRICED PRODUCT'S LOSS IS SENT AT ZERO RATHER THAN REFUSED** — `UNPRICED_WASTE`, and it is
**the opposite of what Vender and Comprar do.** Finding 3 removed *say nothing* from the table; the
remaining choice is a zero or no row, and **a sale not rung costs the shop nothing while a loss not
recorded destroys the only record of it** — which is `record_waste`'s own argument, owner-ruled on
2026-09-04 about the availability check. ⚠️ **What is SENT and what is SHOWN are deliberately
different**: `reviewOf` still answers `centavos: null`, so C3.12's dash survives and nothing tells
her the thing was worth nothing. **Reversing it is one constant and one branch in `lineSent`; the
rows already written keep their zero.**

**(4) THE CAUSE IS FORGOTTEN ON COMMIT AND KEPT ON `Vaciar carrito`** — a pair that is the opposite
way round from copying either screen. A cause left standing after a commit **is the default `0019`
refuses**, created by the screen instead of by the schema; emptying the basket is *I keyed the wrong
products*, and re-asking there is the one thing `5g-ii`'s picker was measured not to do.

⚠️⚠️ **AND A FIFTH THING WAS FOUND AND NOT FIXED, BECAUSE IT IS ANOTHER SCREEN'S: C3.14 HAS NO
OWNER ANY MORE.** `5f-iii-b`'s entry recorded *"an unpriced line now blocks the whole sale, and
C3.14 says it should not"* and routed it to **`5h`, which was then narrowed to the undo and closed**
— so the deliverable went with the narrowing. ⚠️ **Still live, verified rather than assumed:
`draftOf` refuses `line-cannot-be-priced` on a sale, so Vender's slide is absent on a basket holding
`Servilletas`.** It is NOT fixed here — Desperdicio's answer is scoped to waste by one condition and
`cart.test.ts` pins that a sale and a purchase are still refused — **and it wants a row of its own
rather than a session's guess about what C3.14 means now.**

⚠️⚠️ **TWO INSTRUMENTS WERE STRENGTHENED AND ONE OF THEM HAD BEEN DISARMED BY THIS VERY TASK.**
`conventions-gate.sh`'s `R4` gained its **second exemption in its life** — `WASTE_REASONS`, because
`public.waste_reason` is the one enum in this schema whose values are Spanish (`0003:419` argues it,
`0004:49` records the exception) and they are wire values rather than words. ⚠️ **It is bounded to
that ONE declaration and not to the file**: the gate counts accented literals in `waste.ts` against
accented literals inside the declaration, so a Spanish sentence anywhere else in it still fails.
**Two fixtures say so** — `F4a` a sentence elsewhere in the same file, `F4b` the declaration renamed
— and both are red. ⚠️⚠️ **AND `F31` WENT GREEN WHILE CLAIMING RED**: it deleted `Boton`'s import
from `documentos.tsx` to leave one caller, and `desperdicio.tsx` is now a third caller, so removing
one left TWO. **A fixture that SUBTRACTS a caller has an expiry date nobody wrote down — the next
screen to draw that primitive** — and it now ADDS a primitive with zero callers instead, which no
screen anybody writes later can satisfy. **The fifth stale mechanism in that harness and the second
of exactly that shape.**

⚠️ **The harness itself had a bug worth recording: `local a="$1" b="$2" c="$(basename "$b")"` does
NOT see `b`.** Bash expands every word on the line before `local` assigns anything, so under `set
-u` the substitution ran with the variable unset, printed *unbound variable* from the subshell and
yielded the empty string. **Ten fixtures still went red for the right reasons, by luck**, because
each label kept the paths distinct — and the next two fixtures to share a label prefix would have
shared a file.

⚠️⚠️ **AND CI CAUGHT A THIRD ONE THAT NO LOCAL RUN DID — `6a.split`'s REQUIRED STATEMENT WAS A
SENTINEL THE FALSIFIER COULD NOT REMOVE.** `EACH_CHILD_SAYS` was spelled `Desperdicio`, and
`split-coverage-falsify.sh`'s `S9` fixture went **green while expecting red**: mode `I` matches
case-insensitively, `6a-i`'s row says `desperdicio.tsx` twice, and stripping the one capitalised
`Desperdicio` left the check passing. ⚠️ **`split-coverage.sh` itself was green the whole time and
was never wrong** — the claim was simply not load-bearing, and only the 1,142-fixture harness could
see that. ✅ **The sentinel is now `waste_line_select`, which is unique in both rows AND is the
fence that caused the split**: `6a-i` must say why it reads nothing back and `6a-ii` must say what
it is working around, **so a session holding either row alone knows the other exists and why.**
⚠️ **A required statement whose phrase also occurs inside a filename is a statement nothing can
prove is load-bearing** — the same shape as `F31` above, one layer further out.

⚠️⚠️ **AND A FOURTH, ALSO CI's AND ALSO A HARNESS RATHER THAN A GUARD: THE HANDBOOK'S NEXT-WORK
MARKER WAS WRITTEN IN A SHAPE `handbook-agreement-falsify.sh` COULD NOT ANCHOR ON.** This row wrote
it as `**…next piece of work is, and nothing is waiting on you for it.**`, with the whole sentence
inside the bold run. `handbook-agreement.sh` was **green — it greps the sentence and not the
markup** — and the harness failed on THREE fixtures: `H3` and `H8` died at setup with the bare
message *"fixture setup failed"*, and **`H9`'s first mutation silently did nothing so its second
ADDED a marker**, which made the run report *"2 handbook rows say where the next piece of work is"*
— a failure about the handbook's CONTENT when the cause was the harness's anchor.
⚠️⚠️ **THAT FILE ALREADY DOCUMENTED THIS EXACT TRAP FOR ITS OTHER ANCHOR** — *"the anchor needs the
BOLD SPAN TO END AT THE PRONOUN"* — **so the rule was written down and the MESSAGE was not.**
✅ **The handbook sentence is reworded (nothing loosened) AND `MARK_ANCHOR` now has the same
explanatory guard `WAIT_ANCHOR` has**, naming the shape it wants and the two spellings it refuses.
**A guard that knows what it wants and will not say so is the expensive kind, and this one cost an
hour twice in four days.**

⚠️⚠️ **VERIFIED, AND NOT BY A TICK.** **`docs/checks/6a-i-waste-contract.sh` — 17 assertion groups
over live HTTP against a reset database**, and its falsifier **10 fixtures, two green controls and
eight red**, the eighth of which **drops `waste_line_select`'s role gate and is restored from
`pg_policies` in a `trap` on every exit path**, with a second control proving the restore. `F2`
sorts the vocabulary alphabetically — every cause still legal, every write still landing, and the
only thing wrong is an order the database will never sort into. **`npm --prefix app test`: 1,394
over 45 files, up from 1,358 over 44** — `api-waste.test.ts` (30) plus a waste section in
`cart.test.ts`. **`conventions-gate.sh` 18/18 over 88 source and 45 test files**, and its falsifier
**35 fixtures, 34 red and `F13` deliberately green**, up from 33. ⚠️ **`db.yml` gains a SIXTH job**
— *the loss, and the cause it is filed under* — **a new job rather than two steps on
`recent-documents`, which is the opposite of what `5h-ii-b` did**: that one appended because a
correction is *the thing you reach from the list*, and this is a WRITE where that job is a READ.
⚠️ **And `app/src/cart/cart.ts` is now in a `paths:` filter for the first time**, because
`PRICE_KEY`, `MONEY_KIND` and `UNPRICED_WASTE` are claims about `0019` rather than about a basket.

⚠️⚠️ **WHAT ONLY HE CAN JUDGE (`R9`, §2.11), AND IT IS THE OPENING QUESTION.** Whether **`¿Qué
pasó?`** in a window with no way out reads as *the app is helping* or as *the app is in the way* —
it is the only modal in this app a thumb cannot dismiss on first open, and `0019` is why. Whether
**`Motivo:`** is the right word over the drop-down (it was chosen over any verb about a bin because
two of the five causes are not things thrown away). Whether **a bar that counts products and shows
no money** reads as a screen that is finished. And whether **the cause going away after each commit**
is right or is one tap too many when she is clearing a whole shelf. **The build on his phone has to
be rebuilt before he can open this.**

---

## ⚠️⚠️ SECOND CUT — APPENDED 2026-09-27 BY `6c`, AND IT IS THE TWENTY-FIFTH CUT OVERALL

⚠️⚠️ **TAKEN BEFORE A LINE OF `6c` WAS WRITTEN, FOR THE REASON EVERY CUT HERE IS TAKEN:
`## Position` STOOD AT 1,237 OF 1,400.** That is **163 lines of headroom against an entry
that runs 40–130** — enough to pass `plan-handover.sh` assertion 7 and not enough to write
with, which is the same arithmetic the first cut of this file was opened on. ⚠️ **`6b` did
not cut**, because the 245 lines it inherited were enough; it spent 82 and left the tripwire
for this session, and `CLAUDE.md` said so in as many words.

⚠️⚠️ **EVERY LINE BELOW IS MOVED, NOT COPIED.** `split-coverage.sh` reads the corpus, which
includes this file, and fails on *"row appears 2 times"*.

⚠️⚠️ **WHAT IT TOOK, AND ONE BLOCK WAS DELIBERATELY LEFT BEHIND.** The two blocks below are
the day's oldest two **closing entries** — `6a-ii-b` and `6a-ii-a`. ⚠️ **The install block that
sat between `6a-ii-a`'s entry and the archive bookkeeping — *the build is made and signed and
is NOT on his phone* — STAYS IN `## Position` ON PURPOSE**, because it is the only place a live
obligation is written down: the Mac's Wi-Fi is the blocker, the R9 looks of three separate rows
are queued behind one install, and archiving it would bury the one thing waiting on a person.
**A cut takes closed history; it must not take an open obligation.**

⚠️ **The entries are in the order they stood in `## Position`, newest first within the cut** —
`6a-ii-b` then `6a-ii-a` — which is this file's own convention and not a global sort across cuts.

✅✅✅ **`6a-ii-b` IS DONE, 2026-09-27 — A CASHIER CAN PUT HER OWN WRITE-OFF RIGHT, AND
`void_transaction` HAD TAKEN `'waste'` FOR TWENTY-THREE DAYS WITH NOBODY EVER SENDING IT.**
`Corregir` and `Eliminar` now draw on a write-off in `Lo último`, and `Corregir` is a void plus a
re-record that carries the CAUSE back to Desperdicio along with the products. ~~this is the next
task, as of 2026-09-27~~ — ⚠️ **struck in lower case deliberately, the rule `5b.8-i`'s row
records.**

⚠️⚠️ **WHAT THE ESTIMATE FOUND, AND IT IS NOT WHAT THE ROW PREDICTED. The row called flipping
`CORRECTABLE.waste` *"deliberately the smallest part"* and it was right; what it did NOT name is
that the app had no way to send a cause back at all.** `@/api/documents` renders a write-off's
cause through `reasonLabel` — **a one-way door by construction**, and `R4`'s whole point — so the
only cause this app held was the WORD a shopkeeper reads. `record_waste` takes the enum member.
**They differ by one capital letter, they are both strings, and nothing in TypeScript could have
told them apart.** ✅ So `DocumentLine` and `ShopDocument` gained the wire value beside the word —
`reasonValue` and `causeValue` — which is exactly the pair `counterparty`/`providerId` already is
on a delivery: one is read by a person, the other is written back to the database. **Sized `M`,
built in one sitting, no migration.**

⚠️⚠️ **AND THE ESTIMATE FOUND A LIVE DEFECT IN `5h-ii-b`'s SCREEN THAT NOTHING COULD SEE.**
`documentos.tsx` chose which basket to warn about with `CART_KIND[kind] === 'buy' ? buy : sell` —
**a two-way ternary over a three-member union, which typechecks and reads the SELL cart for a
write-off.** So a shopkeeper correcting a write-off with a half-rung sale open was warned she would
lose work she was not about to lose, and one with a half-keyed bin round was warned of nothing at
all. ✅ It is a `Record<Scope, Cart>` now, so a fourth scope is a build error.

⚠️⚠️ **THE THIRD THING THE BUILD FOUND, AND IT IS THE ONE A PERSON WOULD HAVE REPORTED AS *the app
forgot*: DESPERDICIO IS A **TAB**, AND ITS PICKER STATE WAS READ ONCE AT MOUNT.** `picking` was
`useState(() => reason === null)`, which was right while the only thing that could set a cause was
the picker on that screen. `Corregir` sets it from another screen — and that tab may have been
mounted for an hour. **The two failures are opposite and both bad**: she arrives at a picker asking
a question the correction already answered, or at a header reading *pickFirst* with no window open,
one tap from a commit the schema refuses. ✅ `picking` follows the cause now, and
`chooseReason`'s own `setPicking(false)` stays — `openReason` is a no-op on an unchanged value, so
re-choosing the cause already standing would otherwise leave the window open.

⚠️ **`load` TAKES ONE OBJECT NOW AND NOT FOUR ARGUMENTS** (`Loaded`, `@/cart/cart`). The fifth
field would have been `reason` sitting beside `providerId`: **both nullable, both strings at
runtime, adjacent** — `load(scope, lines, quotes, null, reason)` and
`load(scope, lines, quotes, reason, null)` both typecheck, and the symptom is a delivery filed
against no supplier. One object has no order. ⚠️ **And the store writes the cause on the waste side
ONLY**, which is `providerId`'s own rule a second time: a corrected delivery must not blank the
cause standing over a bin round somebody walked away from.

⚠️⚠️ **THE DECISION TAKEN ON THE OWNER'S BEHALF, AND IT IS CHEAP TO REVERSE: A WRITE-OFF WHOSE
LINES DISAGREE IS CORRECTED WITH **NO** CAUSE, AND SHE IS ASKED AGAIN.** The schema puts `reason`
on the LINE, so a document mixing two causes is legal and measured — but a cart holds ONE cause, so
there is nothing faithful to prefill. **The two alternatives are both worse.** Taking the first
line's cause *silently refiles every other line under it, in the ledger, where she cannot see it
happen*. Hiding `Corregir` on such a document *hides a control she is allowed to press*, which is
`5d-iii`'s own ruling read backwards. ⚠️ **Nothing in this app can write a mixed document** —
Desperdicio sends one cause — so this is the branch for what an import or another client could
leave behind. **Reversing it is one line in `prefillOf` and one test; no migration, no data.**

⚠️⚠️ **VERIFIED, AND NOT BY A TICK.** ✅ **`docs/checks/6a-ii-b-waste-correction-contract.sh` — 15
assertion groups over live HTTP against a real PostgREST**, and two of them exist nowhere else.
**A cashier voided her OWN write-off and got a 200** — the kind `0021` had never been sent, and it
matters more here than on the other two because she cannot read her own waste LINES at all, so a
void that touched them would have refused her. And **the cause round trip, with its negative
control**: the view hands back `caducado`, `record_waste` refuses `Caducado` with **HTTP 400
`22P02`**, and the value read off the wire re-records cleanly. ⚠️ **Without that refusal the
positive half proves nothing** — it is the only instrument anywhere that can tell `cause` from
`causeValue`.

✅ **Also measured in that run and worth inheriting: the void reported `2` compensating movements**
— a write-off put right puts the stock back — **and the replay's body is genuinely SHORTER**, four
keys against six (`already_recorded, kind, void_id, voided` against those plus `lines, movements`),
which is the claim `voidedFrom` is built on. ✅ **A cashier voiding somebody else's write-off is
`TD003` on an HTTP 400 and not a 403**, and the refused void left no mirror behind.

✅ **`docs/checks/6a-ii-b-waste-correction-contract-falsify.sh` — 8 fixtures, all behaved**: two
green controls, five mutated copies of the app's contract modules, and one that revokes `execute` on
`void_transaction` from `authenticated`. ⚠️ **`F5` is the one it exists for** — the cause dropped
from the line list, which stays a 200 with every quantity right while `causeValue` goes `null` on
every write-off. ⚠️ **`D1` is the other**: `0021:448` grants that execute, the plan spent a day
believing no path to a void existed, and **no pgTAP suite asserts a function's ACL.** The grant is
restored from `pg_proc` rather than remembered, in a `trap` on every exit path, and re-proved by a
second control.

✅ **`npm --prefix app test` — 1,439 tests across 45 files, the RUNNER's own tally**, up from 1,424.
`api-corrections.test.ts` gained a `a write-off, as a cart` block, `cart.test.ts` gained the first
tests `load` has ever had, and `api-documents.test.ts` and `unsent.test.ts` gained the
word-versus-value pair on both the landed and the queued path. ⚠️ **One guard was INVERTED and it
was right when it was written**: `is NOT yet built for a write-off` pinned `CORRECTABLE.waste` at
`false` for the one day between `6a-ii-a` and this row.
✅ **`docs/checks/conventions-gate.sh` — 18 groups over 88 source and 45 test files.**

⚠️ **THE HARNESS BUG WORTH INHERITING, because it is green here and red on CI or the reverse:
BSD `sed` HAS NO `\|`.** The first spelling of this check read `CORRECTABLE.waste` with
`s/^  waste: \(true\|false\),.*/\1/p`, which matches nothing on the owner's Mac and everything on
Ubuntu — **a check that is green in one place and red in the other, which is worse than either.**
`\([a-z]*\)` is portable and says the same thing.

⚠️⚠️ **WHAT ONLY HE CAN JUDGE (`R9`, §2.11), AND THE PHONE MUST BE REBUILT FIRST.** Whether
`Corregir` on a write-off landing back on Desperdicio **with the cause already filled in** reads as
the app remembering or as the app having decided something; whether two buttons under a write-off
are one control too many on a screen where the row carries no money; and whether *¿Corregir esta
nota?* is the right question for a loss rather than for a delivery — the sentences are shared with
`purchase` and `sale` on purpose, and that is a choice rather than an accident.

✅✅✅ **`6a-ii-a` IS DONE, 2026-09-27 — A CASHIER CAN READ BACK THE WRITE-OFF SHE RECORDED, AND
`0041` IS THE FIRST `security definer` VIEW THIS SCHEMA HAS EVER HAD.** `Lo último` has a third
button and a write-off reads like a delivery does: the day, the CAUSE where a supplier's name sits,
then the products and how much of each. ~~this is the next task, as of 2026-09-27~~ — ⚠️ **struck in
lower case deliberately, the rule `5b.8-i`'s row records.**

⚠️⚠️ **WHAT WAS ACTUALLY BROKEN, MEASURED RATHER THAN INFERRED: HER OWN WRITE-OFF CAME BACK AS AN
HTTP 200 WITH `"waste_line": []`.** A document with no products, not a refusal —
[[embed-on-a-fenced-table-is-a-200-with-an-empty-array]] — because `waste_line_select` carries
`has_role(…, 'manager')` where `waste_select` does not, the only asymmetric pair in this schema.
**`0041` reaches AROUND that fence and does not open it**: `waste_line_select` is untouched and
`supabase/tests/0041_waste_reason_line.sql` assertion 2.1 is what says so.

⚠️⚠️ **THE DECISION TAKEN ON THE OWNER'S BEHALF, AND IT IS THE LOUDEST THING IN THIS ENTRY:
ADR-035 §2.7's COST PARAGRAPH IS AMENDED, BECAUSE HIS OWN RULING MADE ITS MECHANISM SENTENCE
FALSE.** It said *"Staff hold `select` on views only, never on the base tables carrying cost; the
views are `security_invoker = true` so RLS still governs rows."* ⚠️ **Both halves were measured
wrong.** Staff and managers are **the same Postgres role** (`authenticated`) and `0003:620` grants
it `select` on `waste_line` — **there is no grant to withhold and never was**, the role boundary
lives entirely inside the RLS predicate. And an invoker view over a row-gated table answers the
person it exists for **zero rows**. ✅ **§2.7 now carries a two-row table keyed on WHERE the fence
is** — columns-only stays invoker with an optional `has_role` floor (`0009`); a ROW-level role gate
takes a definer view stating its own predicate — **and the bound is a CHECK rather than a sentence**:
the suite asserts `waste_reason_line` is the ONLY non-invoker view in `public`, so a second one
needs a ruling. ⚠️ **It was reported rather than asked because he ruled the substance this morning**
— *"Go with (a)"*, where (a) was put to him as a definer view — and re-asking a settled question is
not a gate. **Reversing it costs a `drop view` and a fix-forward migration, not an edit.**

⚠️⚠️ **AND THE PLAN'S OWN DESCRIPTION OF THE SHAPE WAS WRONG, WHICH THE SIZING CAUGHT: `0009` IS NOT
A DEFINER VIEW.** The row called `product_margin_daily` *"a definer view stating its own predicate"*;
it is `security_invoker = true` with `has_role` inside the body as a FLOOR, which is the opposite
mechanism. **The half that was right — *state your own predicate* — is kept and credited.**

⚠️⚠️ **THERE IS NO PESO FIGURE ON A WRITE-OFF, AND IT IS A DECISION TAKEN ON HIS BEHALF TOO —
ÁREA 9's RULING OF 2026-09-14 REACHING A THIRD SCREEN.** That ruling names *Números and
Desperdicio*; `Lo último` is neither. **The ruling's REASON carries over exactly**: `UNPRICED_WASTE`
sends a zero for a product with no shelf price, so `waste.total_net` is genuinely `0.00` for the
products a shop throws away most, and `$0.00` beside twenty kilos of tomatoes on the screen she
opened to check her own work is what that ruling refuses. ⚠️ **The app does not even ASK for the
column** — `DOCUMENTS_WASTE_HEAD_COLUMNS` — and the contract check's fifteenth group is what holds
it. **Reversing it is one constant and one branch.**

⚠️⚠️ **THE CLIENT COST ONE ROW IN EACH OF SIX CONSTANTS AND NOT A SECOND MODULE, WHICH IS
`5h-ii-a`'s OWN PREDICTION COMING TRUE** — *"a `Record` over this union precisely so `6a` adds a kind
and not a module."* ⚠️ **What that prediction got wrong is the interesting half**: it said waste
*"carries the identical header quartet"*. The header COLUMNS are identical and almost nothing else
is — the lines come off a VIEW, carry a cause nothing else has and carry **no money at all** — so
`DOCUMENTS_WASTE_LINE_COLUMNS`, `DOCUMENTS_WASTE_HEAD_COLUMNS` and `DOCUMENTS_WASTE_LINE_ORDER` are
their own constants beside the shared ones. **Two reads that genuinely differ want two spellings.**

⚠️⚠️ **AND THE GAP `5h-ii-c` NAMED CLOSED WITH NO EDIT TO THE MODULE THAT HAD IT.** Its own words:
*"a queued waste is therefore invisible here… it closes when `6a` gets a list of its own."*
`DocumentKind` gained a member and `unsentDocuments`' kind filter admitted it — **because that line
is a COMPARISON rather than a guard**, which is exactly the property its comment claimed was
load-bearing. `transfer` is still excluded by the same one comparison, and a test pins it.

⚠️⚠️ **TWO GUARDS WERE INVERTED AND ONE NARROWED, WHICH IS THE `5h-ii-b` SHAPE AGAIN — AND THE
NARROWED ONE IS A REAL FINDING.** `api-corrections`' *"sends the document kind and never the cart
kind"* asserted `p_kind !== CART_KIND[kind]` of every kind; that held only because `buy ≠ purchase`
and `sell ≠ sale`. **A write-off's cart scope IS `'waste'`, the same word as its document kind**, so
the blanket form was asserting something FALSE of the third member. It now names the two
discriminating pairs and pins the coincidence as a coincidence. ⚠️ **The same discovery corrected a
TYPE**: `CART_KIND` was annotated `Record<DocumentKind, Kind>` — `@tienda/money`'s two directions of
TAX — where what it answers is `Scope`, the cart's. **The two coincided on their first two members,
so nothing could see the difference until there was a third.**

⚠️ **THE OTHER TWO INVERSIONS ARE HONEST WIDENINGS, NOT LOOSENINGS**: the money-cast loop now runs
over the two PRICED kinds and the claim it used to make of waste is made in the OPPOSITE direction
two tests below — *no money column at all, on the header or on the line* — and `PRICED_KINDS` is
DERIVED from `DOCUMENT_KINDS` so a fourth kind joins the money assertions by default.

⚠️⚠️ **VERIFIED, AND NOT BY A TICK.** **`supabase/tests/0041_waste_reason_line.sql` — 33 behavioural
checks, every read in section 3 under `set role authenticated`** (as `postgres` they pass without the
predicate existing), and **eight falsifications**, of which two are worth inheriting. **`F1` removed
the `my_workspaces()` predicate and only ONE assertion went red — the structural one** — because
`my_locations()` already implies membership, exactly as `0003`'s own comment says; **the comment on
assertion 3.15 had claimed more than that and is corrected in the file**
([[a-test-can-defend-a-bug]]). **`F6` dropped a column and produced ZERO `FAIL` lines with
`EXIT=3`** — `ON_ERROR_STOP` aborts before the report prints — **so the verdict on that file is its
exit code and never a count of `FAIL` lines**, and the suite now says so in its header.
✅ **`docs/checks/6a-ii-a-waste-list-contract.sh` — 21 assertion groups over live HTTP**, plus an
**eleven-fixture falsifier (2 green controls, 9 red)** whose `D1` is the whole row: the view flipped
to `security_invoker = true`, which is the edit a reader makes to bring it *"into line with §2.7"*.
✅ **`app/test/api-documents.test.ts`, `api-corrections.test.ts` and `unsent.test.ts` — 1,424 tests
over 45 files, up from 1,394**, the RUNNER's tally. ✅ **All 28 SQL suites green together** (1,570
checks), **`conventions-gate.sh` 18 groups over 88 source and 45 test files**, and the two
neighbouring contract checks re-run because this row edited the modules they read: `5h-ii-a` 16
groups, `5h-ii-b` 21.

⚠️⚠️ **THE TWO MEASUREMENTS THAT WOULD OTHERWISE BE RE-DISCOVERED.** **(1) A TO-MANY EMBED CAN BE
ORDERED ON TWO KEYS**, which the row listed as unmeasured: two `.order()` calls naming the same
`referencedTable` APPEND to one parameter, and the `desc,desc` spelling inverts a four-line document
where heap order equals neither — **the reversed read is what makes the sorted read evidence**
([[assert-against-a-calendar-not-the-array]]). **(2) AN UNENCODED `+00:00` IN A QUERY STRING IS AN
HTTP 400 `22007`** — *invalid input syntax for type timestamp with time zone* — because `+` is an
encoded space. It reads exactly like a bad column and cost this session one run;
`5h-ii-a-documents-contract.sh` already did `.replace("+00:00", "Z")` and did not say why.

⚠️ **TWO STALE CLAIMS FIXED IN THE SAME PR, BOTH FOUND BY LISTING A DIRECTORY AGAINST A TABLE.**
**(a) `supabase/README.md` HAD NO ROW FOR `0040`** — a migration that had been applied for two days
— found because this row needed to know whether the waste fence had moved with the purchase one.
**Nothing checks that table for completeness**, which is `CLAUDE.md`'s archive-table lesson in a
second file; both rows are written now and every migration on disk has one. **(b) The count *"all
fourteen views are `security_invoker`"* was a `grep` of the migrations and the database says
**six**, because four of the six were re-issued with `create or replace`
([[counts-belong-to-the-runner]]). It was wrong in three files for about an hour.

---

## ⚠️⚠️ THIRD CUT — APPENDED 2026-09-27 BY `6d`, AND IT IS THE TWENTY-SIXTH CUT OVERALL

⚠️⚠️ **APPENDED, NEVER A SECOND FILE FOR ONE DATE.** This is the same working day the two
cuts above hold; one working day per file is the rule, and a `status-log-2026-09-27b.md`
would break it. **This is the third time one date has been cut three times.**

⚠️⚠️ **TAKEN BECAUSE `## Position` STOOD AT 1,318 OF 1,400 ONCE `6d` HAD WRITTEN ITS
ENTRY — 82 LINES OF HEADROOM AGAINST AN ENTRY THAT RUNS 40–130.** That is below the whole
range rather than merely inside it, so the next session could not have written at all.
⚠️ The calibration either side of it: `6b` inherited 245 and spent 82 without cutting;
`6c` cut at 163 and called it *enough to pass and not enough to write with*. **82 is not a
judgement call.** **200 lines out**, the day's two oldest remaining closing entries taken
oldest-first: `6c`'s (with its deploy note) and `6b`'s (with its look-question).

⚠️⚠️ **EVERY LINE BELOW IS MOVED, NOT COPIED.** `split-coverage.sh` reads the corpus,
which includes this file, and fails on *"row appears 2 times"*.

⚠️⚠️ **AND THE RULE THE SECOND CUT STATED WAS BROKEN AND REPAIRED INSIDE THIS ONE, WHICH
IS WHY IT IS WRITTEN DOWN RATHER THAN QUIETLY FIXED: A CUT TAKES CLOSED HISTORY AND MUST
NOT TAKE AN OPEN OBLIGATION.** The first pass of this cut ran to a line boundary and
swallowed the **install block** — *the build is made and signed and is NOT on his phone*,
the `devicectl` `unavailable` / `CoreDeviceError 1011` finding, and the correction under
it. That block is the ONLY place the blocker is written down, and **four rows of work are
now queued behind one install**. It was moved back into `## Position` before this file was
written. ⚠️ **The second cut left it behind deliberately and said so in one sentence; this
one had to be told by re-reading that sentence.** A line range is not a semantic boundary,
and the check that would have caught it does not exist.

⚠️ **`6b`'s LOOK-QUESTION IS TAKEN AND THAT IS NOT THE SAME THING**: `docs/HANDBOOK.md`'s
`## ⏸ THE CATCH-UP` indexes it, along with the other seven closed rows' looks, so
archiving the entry does not stop it being re-offered. The install block has no such index.

✅✅✅ **`6c` IS DONE, 2026-09-27 — THE SHOPKEEPER CAN DELETE A PRODUCT AGAIN, AND `Editar`'s RETIRE
CONTROL HAD BEEN DRAWN ON NOTHING SINCE 2026-09-23.** `0042` mints `is_prebuilt` on `product_family`
and `product_variant`, `catalog_prebuilt_stays()` fences the one transition that matters, and
`producto/[id].tsx` draws the control on his own rows only. **Step 6's last planned row is closed and
step 6 has a new one.**

⚠️⚠️ **WHAT THE ESTIMATE FOUND: `L`, ONE SITTING — AND THE CLIENT HALF IS SMALLER THAN THE ROW
IMPLIED.** Three measurements the row did not carry. **(1) THERE IS NO FAMILY EDIT SCREEN AT ALL** —
`familia/[id]`'s `Editar` pushes to `producto/[id]` — so the marker goes on BOTH tables because the
FENCE has to, and exactly ONE screen gains a control. **(2) THE RETIRE MACHINERY ALREADY EXISTED AND
HAD NEVER BEEN CALLED**: `activePatch` and `ACTIVE_PATCH_COLUMNS` have been in `@/api/catalogEdit` and
pinned in `api-catalog-edit.test.ts:352` since `5e-iii-a`, with zero callers — the `void_transaction`
shape again. **(3) THE STRINGS ALREADY EXISTED**, kept for this row by `5e-iii-b` in as many words.

⚠️⚠️ **THE MARKER'S SHAPE WAS ASKED AND RULED THE SAME DAY: A BOOLEAN `is_prebuilt`, NOT THE `origin`
ENUM THE PLAN HAD CALLED IT SINCE 2026-09-23.** Both were put to him with their costs, and the boolean
won on a measured argument two days old — **an enum crossing the wire as a LABEL rather than as its
member is a bug no typecheck and no Vitest fixture can see**, which is what `6a-ii-b` found in
`reasonLabel` and paid for in `DocumentLine.reasonValue`. A boolean has no label to get wrong, and it
matches `provider.is_generic`, this schema's existing answer to the same question. ⚠️ **What it costs
was named before he chose**: a third provenance is a new nullable column later, not an
`alter type … add value`.

⚠️⚠️ **FINDING 1 HELD, AND IT IS NOW A FIXTURE RATHER THAN A WARNING.** The fence is a trigger on
`is_active` going true→false; **no policy in this schema moved**, and `supabase/tests/0042` §3.4
asserts that neither update policy so much as mentions the column. The falsifier's `D1` **is** the
policy-predicate version of `0042` — and it goes red on *"RENAMING A PREBUILT PRODUCT WAS REFUSED"*,
which is exactly the damage the row predicted a year of reading could not have proved.

⚠️⚠️ **THREE THINGS ONLY DRIVING IT COULD HAVE FOUND, AND THE FIRST IS A REAL DEFECT IN THE FIRST
WRITING OF `0042`.** **(1) FENCING BOTH DIRECTIONS OF THE MARKER MAKES IT UNSETTABLE AFTER INSERT** —
not by the seed, not by a fixture, not by a `service_role` job, not by a later migration without
disabling the trigger. ⚠️ **The defect is invisible in the one case anybody tests**, an import that
INSERTS its rows, and a shopkeeper could never reveal it. The fix is `provider_protect_generic`'s own
asymmetry: refuse a demotion, permit a promotion. **(2) `restrict_violation` IS AN HTTP 400 WITH CODE
`23001`** — measured off a real PostgREST, and neither a 403 nor a 409 ([[custom-sqlstate-arrives-as-400]]).
`catalogEditErrorMessage` now maps it to a sentence that is **not** `notAllowedEdit`, because the same
manager may rename and reprice this product: *"Este producto vino con la app, así que no se puede
quitar. Sí puedes cambiarle el nombre y el precio."* **(3) A READ IN THE SAME STATEMENT AS THE WRITE
SEES THE PRE-STATEMENT SNAPSHOT** — the pgTAP suite's first writing had `_try(update …)` and
`select is_active` inside one `chk` call and **reported a working fence as broken**; read-backs are now
separate statements and say so.

⚠️⚠️ **AND THE FALSIFIER CAUGHT A DEFECT IN ITSELF, WHICH IS THE ONLY THING THAT COULD HAVE.** Its
restore fed `pg_get_functiondef`'s output through an UNQUOTED heredoc, where `$function$` expands to a
bare `$`: psql failed, `-v ON_ERROR_STOP=1` **aborted before the `create trigger` on the next line**,
and `D3` then measured a database with no trigger at all — **red for the wrong reason, and it said so.**
Every write in that restore had its output sent to `/dev/null`. It now pipes the body, issues each
statement through its own `ask`, and **verifies the function and both triggers are back**, stopping the
whole harness if they are not: a restore that puts the database back WRONG accuses the next fixture.

⚠️⚠️ **VERIFIED, AND NOT BY A TICK.** **`supabase/tests/0042_catalog_origin.sql` — 25 behavioural
checks**, every write in §4 under `set local role authenticated`. ⚠️ **Its §2 is the only place the
owner's backfill ruling of 2026-09-24 is visible**: `0042` writes no `update` — an `update` reaches the
same state and stamps `updated_at` on every row in every shop, destroying the only record of when a
product was last really edited — so no ROW in a fresh database witnesses it and
**`pg_attribute.attmissingval` is what records it**, `{t}` on both tables. ✅
**`docs/checks/6c-catalog-origin-contract.sh` — 12 assertion groups over live HTTP**, plus its
**7-fixture falsifier, all behaving**. ✅ **`app/test/api-catalog-edit.test.ts` — 1,513 tests across 46
files**, the runner's tally (`npm --prefix app test`), +10 and **no new file**; the one red in the first
run was the guard pinning `VARIANT_EDIT_COLUMNS` to three columns, **which was right when it was
written** and is widened to an exact ordered list of four rather than relaxed. ✅ Typecheck clean,
`conventions-gate.sh` 18 of 18 over 93 source and 46 test files, `handbook-agreement.sh` 5 of 5.

⚠️ **`db.yml` GAINS AN EIGHTH JOB — `catalog-origin`, *the prebuilt catalog, and the delete that depends
on it*.** ⚠️⚠️ **A NEW JOB AND NOT TWO STEPS ON `catalog-write`, WHICH IS THE RIGHT HOME ON EVERY OTHER
TEST THIS WORKFLOW USES**: that job already runs `5e-iii-a-catalog-edit-contract.sh` against the very
file `6c` widens and builds the identical fixture. **It runs 12-13 minutes against its own
`timeout-minutes: 15` and was cancelled three times on `main` before `5R-g` split it**, and a cancelled
job is neither a pass nor a failure ([[a-cancelled-ci-job-is-not-a-failed-assertion]]). So the seam is
the CAP, not the subject. ⚠️ **The SQL suite is deliberately NOT in that job**: the `reset` job's
*Behavioural checks* step runs the whole of `supabase/tests/` in name order, so a new suite costs no
workflow edit — running it twice would re-pay `supabase start` plus two resets to assert what the same
run already asserts. **That makes 11 job definitions across three workflows, rendering as 12 names** — and ⚠️ **this PR
renders TEN of them, counted off `gh pr checks 236` rather than derived**: it touches no `packages/**`,
so `money.yml`'s two are absent, and **the PR body said NINE before the log was read.** 2 (`app.yml`)
+ 8 (`db.yml`) is the sum, and `CLAUDE.md`'s own figure for this — *seven* — had been stale since
`db.yml` had five jobs.

⚠️ **ONE RENAME WITH A REASON RATHER THAN A TIDY-UP**: `producto/[id]`'s local filled button is now
`Guardar`, because the file imports the OUTLINE `Boton` from `@/ui/Boton` for the retire control and two
different buttons under one name in one file is a typecheck error at best. **`proveedor/[id].tsx`
reached the identical arrangement and picked the identical name on 2026-09-27**, so this is the second
file to agree rather than a new spelling.

⚠️⚠️ **AND `Confirmacion` IS THE THIRD LOCAL COPY OF A CONFIRMATION BOX AND IS DELIBERATELY NOT
EXTRACTED — THE COUNT IS ON THE PAGE SO THE NEXT `src/ui/` ROW INHERITS A NUMBER RATHER THAN A HUNCH.**
`documentos.tsx` takes a SHAPE (two acts), `proveedor/[id]` takes a BOOLEAN with two sentences, this
takes a boolean with THREE — and the third sentence is load-bearing, because dropping `retireWhy`
leaves *this cannot be undone* attached to a word a shopkeeper reads as *my sales are gone*. ⚠️ `R14`
reads *reached from two or more modules* and a local component is reached from one, so the gate is green
either way; **`R16`'s *the difference nobody decided becomes a DECISION* is not a call to make inside a
migration row**, and `5h.5` left `Confirmacion` in its route for exactly this reason when there was one
copy.

⚠️⚠️ **THE DECISION TAKEN ON THE OWNER'S BEHALF, AND IT IS CHEAP TO REVERSE: A PREBUILT PRODUCT GETS NO
SENTENCE, NO DISABLED BUTTON AND NO EXPLANATION — THE CONTROL IS SIMPLY ABSENT.** It is what he asked
for in his own words — *"why am I still seeing the button for the already existing products?"* — and
where a row came from is ours to know ([[users-dont-do-bookkeeping]]). ⚠️ **The one place
`ES.catalog.errors.notYours` can ever appear is the stale-read window inside `retire`**, which is why it
is mapped at all. Reversing it is a line of JSX.

✅✅ **DEPLOYED THE SAME SESSION, AND THE SHOP WAS READ RATHER THAN ASSUMED.** `supabase db push`
applied `0042` to `hweutzjhzvioswnjzqki` and `docs/checks/5R-f-schema-deployed.sh` is **6 of 6 over 40
migrations**. ⚠️ **That guard compares VERSION NUMBERS and never schema**, so two things were asked of
the real database directly: **both triggers are standing** (`catalog_prebuilt_stays_trg` on
`product_family` and on `product_variant`, out of `pg_trigger`), and **the backfill landed exactly as
he ruled — all 11 families and all 28 variants in his shop are marked OURS.** ⚠️⚠️ **SO THE NUMBER HE
WILL SEE IS ZERO: the red *Retirar del catálogo* appears on none of the 28 products he has**, and the
first place it can appear is a product he adds through `Agregar` after the phone is rebuilt. That is
his own ruling arriving on a screen, and it is stated as a count because *merely indicative* was the
reason he gave for it costing nothing.

⚠️⚠️ **WHAT ONLY HE CAN JUDGE (`R9`, §2.11), AND IT IS SHORT: NOTHING IN HIS SHOP TODAY CAN BE RETIRED.**
That is his own backfill ruling arriving on a screen — every one of those rows is marked ours — so the
capability is only visible on a product he adds through `Agregar` after the build lands. ⚠️ **The two
things to look at are whether a red *Retirar del catálogo* under *Guardar cambios* reads as dangerous
enough, and whether three stacked sentences in the confirmation is one too many on a small phone.**
⚠️⚠️ **AND NONE OF IT CAN BE LOOKED AT UNTIL THE INSTALL LANDS — THIS IS THE THIRD ROW OF DESPERDICIO-ERA
WORK QUEUED BEHIND ONE.** The blocker is this Mac's Wi-Fi, not the phone.


✅✅✅ **`6b` IS DONE, 2026-09-27 — PROVEEDORES IS A ROOM, AND `provider` HAD BEEN IN THIS SCHEMA SINCE
`0002` WITH NOTHING IN `app/` EVER WRITING A ROW TO IT.** Twenty-five days of a table this app could read
and not change. Three routes shipped — `/proveedores` (the directory), `/proveedor/nuevo`, `/proveedor/[id]`
— **and Inicio's sixth door is live**, which deletes the `route: null` sentence `5d-iv-b` shipped on purpose.

⚠️⚠️ **WHAT THE ESTIMATE FOUND: `M` → `L`, AND THE THREE THINGS THE ROW CALLED UNMEASURED ALL CAME BACK
BIGGER.** `L` is one sitting under the 2026-09-24 amendment and it held. **(1)** The directory needs
`contact_name`, `phone` and `address_line1` — and **`docs/checks/5g-i-purchase-contract.sh` bans all three
from reaching a phone, by name, off the wire.** **(2)** `providersFrom` DROPS retired suppliers, so a
directory could not reuse it blindly and could not ignore it either. **(3)** *Whether provider editing
needs its own fence* turned out to be **two** fences with **two different wire shapes**.

⚠️⚠️ **THE DECISION THAT SHRANK IT BACK, AND IT IS A CORRECTNESS PROPERTY RATHER THAN A SAVING: THE LIST IS
`useProviders(null)`'s READ AND NOT A DIRECTORY QUERY OF ITS OWN.** The obvious shape was `provider` with
every column ordered by name. A second query with a filter of its own would be **two answers to *which
suppliers exist*** — a supplier the directory hides and Comprar still offers, or the reverse — **and nothing
in this repository could see the disagreement.** So the screen draws `PROVIDERS_KEY`, the same cache the
delivery picker holds, and opening Proveedores after Comprar costs **no round trip at all**.

⚠️⚠️ **THE BOUNDARY IS THE FINDING WORTH INHERITING, AND `5g-i`'s OWN COMMENT PREDICTED IT.** That check
says the three directory columns *"belong to Proveedores, which is step 6's own screen"* — so this row is the
**other side** of that assertion rather than an exception to it. They arrive through `DETAIL_COLUMNS`, on ONE
supplier, on a screen reached by tapping her. ✅ **`6b`'s own check asserts BOTH halves in one place**: the
three must be on the detail read and must NOT be on `PROVIDER_COLUMNS`, so a session widening the list read
to put a phone number on a row goes red in two checks rather than shipping a decision about who sees what.

⚠️⚠️ **AND THE ONE THE DATABASE DOES NOT HOLD, NOW MEASURED: THE GENERIC ROW CAN BE DEACTIVATED, AND
`provider_protect_generic` DOES NOTHING ABOUT IT.** That trigger refuses a DELETE and refuses a demotion and
**stops there.** A shop whose catch-all supplier was switched off opens Comprar **with no default at all** and
`record_purchase` refuses every delivery for want of a counterparty — produced by one editable boolean.
`providersFrom` compensates on the read side, so the damage would be a row the directory hides and the picker
still offers. **`canRetire` is the only fence there is**, the check drives the deactivation against a real
PostgREST to prove so, and puts the row straight back.

⚠️ **THE OTHER TWO WIRE FINDINGS, both measured 2026-09-27.** **A cashier is refused TWO different ways and
only one of them is an error**: `provider_insert` gives her **HTTP 403 `42501`**, and `provider_update` makes
the row **invisible** — **200 with `[]`** — so `.select().single()` is the only thing that turns it into
something an app can act on ([[rls-update-refusal-is-a-200]]). And **`normalize_name` folds case and
whitespace and NOT accents**: `bodega   DEL centro` is refused `23505`, `Abarrotes Pena` beside
`Abarrotes Peña` is **accepted**. That second half is why `checkProvider` is deliberately **stricter than its
own schema** — wider is the safe direction, because refusing with a sentence beats a `23505` on a name the
screen had just shown as available.

⚠️⚠️ **AND THE HARNESS FOUND TWO OF ITS OWN FIXTURES UNCATCHABLE ON ITS FIRST RUN, WHICH IS RULE 4 WORKING
RATHER THAN FAILING.** One added `is_generic` to the insert body — Postgres accepts `false` happily, so no
wire assertion can see it. One made `optional()` return `''` instead of `null` — **no shell script can call a
TypeScript function.** ✅ Both claims are `app/test/api-provider-directory.test.ts`'s, the check gained an
assertion about the **consequence** of the second (Postgres keeps `''` and `null` apart on `contact_name`, so
the decision matters), and the two replacements break something on the wire. ⚠️ **The division is written into
both files**, because a fixture the check cannot catch is a gap in the fixture and not always a gap in the check
— and finding out which is the whole reason the harness exists.

⚠️ **ONE PRIMITIVE AND ONE PROP, both `R14`/`R16` rather than tidying.** `@/ui/Destello` is the ninth component
in `src/ui/` — the blink that says *this one is new*, inline in `productos.tsx` since `5d-ii`, extracted the day
`proveedores.tsx` became the second file to draw it. And **`Buscador` spelled `ES.catalog.search` inside
itself**, which was true while every caller searched the catalog and false the moment one searched suppliers:
`placeholder` is now a **required** prop with no default, at five call sites. ⚠️ `Campo`, `Caja` and `Iniciales`
are drawn again here and **deliberately NOT extracted** — their counts are on the page for the next `src/ui/` row.

✅ **VERIFIED BY NAME.** `docs/checks/6b-provider-directory-contract.sh` — **23 of 23 against a real local
PostgREST**; its harness `…-falsify.sh` — **10 of 10 fixtures, both controls green**;
`npm --prefix app test` — **1,503 tests across 46 files** (the runner's tally, not a grep);
`npm --prefix app run typecheck` — clean after the typed-route regeneration;
`bash docs/checks/conventions-gate.sh` — **18 of 18 over 93 source and 46 test files**. ⚠️ **`R4` and `R8`
were RED first**: a JSX comment quoting the seeded generic name tripped the Spanish-literal rule
([[jsx-comments-are-code-to-the-gate]]) and `Destello.tsx` shipped without a header.

⚠️ **NO MIGRATION, so nothing is owed a `supabase db push`** — every column, policy and trigger this row needs
has been applied since `0002`. `docs/checks/5R-f-schema-deployed.sh` was green 6 of 6 at the start of the
session and this row does not move it.

⚠️⚠️ **WHAT ONLY A PHONE CAN JUDGE (`R9`, §2.11): whether a list of BARE NAMES reads as a directory or as an
unfinished screen.** A row carries a name and nothing else — the phone number is one tap away, on the detail
page — and that is the deliberate consequence of not widening Comprar's read. **It is the first thing likely to
be asked for and it is parked in ⛔ DECISIONS OWED with its cost attached**, because doing it quietly would
amend `5g-i`'s assertion about who sees what.


## ⚠️⚠️ FOURTH CUT — APPENDED 2026-09-28 BY `7b`, AND IT IS THE TWENTY-SEVENTH CUT OVERALL

⚠️⚠️ **TAKEN AT THE END OF `7b`, AFTER ITS ENTRY WAS WRITTEN — `6d`'s ORDER, FOR `6d`'s REASON.**
`## Position` stood at **1,403 of 1,400** with the entry in: over the cap, not merely short of room.
**184 lines out: `6d`'s whole closing entry**, the last 2026-09-27 entry in the live plan, so **this
day is now WHOLE in this file.** ⚠️⚠️ **IT CARRIES THE INSTALL BLOCK THE THIRD CUT DELIBERATELY LEFT
BEHIND, AND THAT IS NOW RIGHT RATHER THAN A REPEAT OF ITS MISTAKE**: the test that cut wrote down — *is
this block indexed anywhere else?* — now answers yes twice. `7b` installed the build on 2026-09-28
(`devicectl` read the phone `available (paired)`), its own entry in the live plan records that, and
`docs/HANDBOOK.md`'s catch-up section 1 says it is done. **The look-questions below are indexed by the
same handbook section 2.**

✅✅✅ **`6d` IS DONE, 2026-09-27 — THE CATALOG SURVIVES A COLD START, AND THE ROW TURNED OUT TO BE
ABOUT SELLING RATHER THAN ABOUT LOOKING.** `app/src/api/persist.ts` is the **twenty-seventh module of
`src/api/`** (`ls app/src/api | wc -l`) and it decides six things; `QueryProvider.tsx` binds them, and
`AuthProvider.signOut` forgets them. **Step 6 is out of takeable rows.**

⚠️⚠️ **WHAT THE ESTIMATE FOUND: `L`, ONE SITTING — AND THE ROW UNDERSTATED ITS OWN SUBJECT BY A LONG
WAY. WITHOUT THIS, A COLD START WITH NO SIGNAL COULD NOT RING UP A SALE AT ALL.** The row was written
as a READ problem — *"a shop that opens the app with no signal sees no catalog"*. Traced through
before a line was written, it is a WRITE problem too, and the write side is the half everybody
believes is finished:

- `useCatalog` resolves `locationId` out of `LOCATIONS_KEY` alone. With no signal that read fails,
  `locationsFrom(undefined)` is `[]`, and `locationId` is `null`.
- `draftOf` answers a null location with `no-location` (`@/cart/cart:790`), so **`canCommit` is false
  and the commit slider is not drawn** — on Vender, Comprar **and** Desperdicio.
- `useWorkspace()` reads `MY_WORKSPACES_KEY`; with no signal it is `null`, and every capture screen
  builds `basketful` as `null`, so there is nothing to commit even if the slider were there.

⚠️⚠️ **SO THE SQLITE OUTBOX `5c` BUILT, THE DRAIN `5c-ii` BUILT AND THE QUEUED-NOTE LIST `5h-ii-c`
BUILT WERE ALL REACHABLE ONLY BY AN APP THAT WAS ALREADY RUNNING WHEN THE SIGNAL DIED.** A phone put
down at 9 p.m. and picked up at 7 a.m. in a shop with no signal was a phone that could not sell — and
**nothing in this repository could see it**: no suite mounts a screen, and every contract check has a
database. [[pilot-store-is-offline-a-lot]] makes that the normal path, not the edge.

⚠️ **THAT is why the allow-list is six keys and not `['catalog', …]`.** Four are what the COMMIT
needs — `['workspace','mine']`, `['workspace','locations']`, `['catalog','variants']`,
`['catalog','units']` — and two are what Comprar needs: `['providers','list']` and
`['providers','memory']`, without which every row is C3.12's dash and C3.13 blocks the delivery.

⚠️⚠️ **THE RULE THE ALLOW-LIST ENCODES, BECAUSE A SEVENTH ENTRY WILL BE PROPOSED: A READ IS PERSISTED
WHEN A STALE ANSWER BEATS NO ANSWER, AND REFUSED WHEN A STALE ANSWER IS A FALSE STATEMENT.** Persisting
the whole cache is this library's default shape and it is wrong here, because half of what this app
reads is money that moved today. **Refused, each for its own reason:** `['today','takings']` — a figure
labelled *today* restored from yesterday's disk is not stale, it is false; `['documents','recent',…]` —
`5h-ii-c` already gave `Lo último` an offline answer that is TRUE, and a restored server list beside a
live queue is two sources disagreeing about what this shop recorded; `['costs','history',…]` and
`['magnitude','typical']` — both derived from the ledger, and `@/api/costs` already calls a borrowed
series *"a lie that looks exactly like a fact"*; the four `workspace`/request keys — they answer *who
may do what*, and the real fence is RLS on a server this phone cannot reach; and `['catalog','prices']`
and `['catalog','settings']` — `Editar` has no outbox, so it could not save offline anyway.
**Nothing derived from the ledger is persisted** is the sentence to hold.

⚠️⚠️ **FINDING 1, AND IT WOULD HAVE SHIPPED GREEN AND DONE NOTHING: `gcTime` EVICTS A QUERY FROM THE
CACHE, AND ONLY WHAT IS IN THE CACHE IS EVER WRITTEN TO DISK.** Dehydration walks the LIVE cache, and
TanStack's default `gcTime` is **five minutes** — so a catalog browsed and then left is collected, and
the next save writes a cache with no catalog in it. ⚠️ **The failure is invisible in the only way a
person would test it**: kill the app straight after browsing Productos and it works; put the phone
down for ten minutes first and the catalog is gone. `withPersistedDefaults` sets `gcTime` on the six
**from the same list the dehydrate predicate reads**, because two hand-maintained lists is how the
seventh key gets added to one of them.

⚠️⚠️ **FINDING 2, AND IT IS THE ONE THAT DECIDED THE WHOLE IDENTITY DESIGN: THE OBVIOUS USE OF
`buster` DOES NOT WORK, AND THE OBVIOUS FIX FOR IT WOULD DESTROY THIS ROW.** Stamping the signed-in
user's id as the buster is the documented way to keep one shopkeeper's rows off the next one's screen.
It cannot work here, and the reason is in `PersistQueryClientProvider`'s own source: `didRestore` is a
ref, so the restore runs **once per mount** and the save options are frozen the moment restoring
finishes — at which point `AuthProvider` is still reading the stored session and `session` is `null`.
**The buster would be captured as the signed-out value and every save would carry it.** ⚠️⚠️ **And
clearing on `session === null` is worse than useless: `onAuthStateChange` nulls the session on a FAILED
TOKEN REFRESH as well as on a log-out, and a failed refresh is what a shop with no signal has all day —
the cache would be wiped at the precise moment it is the only catalog there is.** ✅ **So `buster` is a
SHAPE VERSION** — `@/lib/outboxDb`'s `PRAGMA user_version` argument, for the same reason — and identity
is handled by `forgetCache` in `AuthProvider.signOut`, beside `forgetLastScreen`, which is the one
deliberate *"I am done"* act in this app and is not reached by an expiry.

⚠️ **ONE PRE-EXISTING GAP IS NAMED RATHER THAN WIDENED OR FIXED:** the `QueryClient` is mounted once
for the app's life, so **a sign-out has never cleared the in-memory cache** — `QueryProvider`'s own
header argues for one client per mount and the mount outlives the sign-out. Every query is
`enabled: session !== null`, so nothing refetches while signed out; the exposure is the frames between
the next sign-in and the first refetch. It is older than this row, it is not made worse by it, and
fixing it is a decision about where a `client.clear()` belongs rather than a line to slip in here.

⚠️⚠️ **ONE DECISION TAKEN ON THE OWNER'S BEHALF AND PARKED IN ⛔ DECISIONS OWED AGAINST `5P-c`:
THERE IS NO STALENESS FENCE — `CACHE_MAX_AGE` IS `Infinity`.** ✅ **RULED 2026-09-28, AS RECOMMENDED — the thirty-third ruling; the row is closed.** The row's own text said to park this
rather than ask. ⚠️ **The library's default is 24 hours**, measured in `persistQueryClientRestore`
(`maxAge = 864e5`), **and taking it would have made this row pointless**: a shop that closes on
Saturday and opens on Monday with no signal would find the catalog gone. **Reversing it is one
constant — no migration, no data.**

⚠️ **TWO SMALLER DECISIONS, REPORTED BECAUSE NOTHING ELSE WOULD SAY THEM.** **(1) The cache shares the
device's key-value store with the Supabase session** rather than opening a third SQLite file: the queue
keeps its own file because losing a queued sale is unrecoverable, and **losing this cache costs a
refetch** — which is the whole reason it may live beside something that matters more. A third store
would be the trade `@/lib/supabase` refused by name when it declined AsyncStorage. **(2)
`createSyncStoragePersister` is marked `@deprecated`** by the library in favour of the async one, and
it is still the right call: `@/lib/store` is synchronous by construction, so promises would move no
work off the JS thread and would buy a second storage abstraction to keep in step. `CACHE_THROTTLE_MS`
is **3 s** rather than the library's 1 s, because `persistQueryClientSubscribe` fires on every cache
event and each fire is a `JSON.stringify` plus a synchronous SQLite write — C1.1 puts two low-end
Androids in this pilot.

⚠️ **VERIFIED:** `app/test/api-persist.test.ts` — **29 assertions**, and **1,542 tests across 47 files**
from the runner (`npm --prefix app test`), +6 files' worth of nothing: **one new file, no guard
inverted, none widened.** ⚠️⚠️ **EIGHT FALSIFICATIONS, AND ONE OF THEM CAUGHT A BROKEN FIXTURE RATHER
THAN A BROKEN CHECK** — F6 came back GREEN and the reason was a `sed` pattern with a trailing comma
against a line ending in a brace, so **the mutation never applied**; re-cut, it turns exactly its own
assertion red ([[a-green-guard-with-a-red-harness-is-your-anchor]]). The other seven: a renamed root
(red), `gcTime` below `maxAge` (red), the status check dropped (red), an empty root added (red, nine
assertions), the `gcTime` loop deleted (red), a second `forgetCache` caller (red) — and **F8, the
control: the same call written inside a COMMENT must leave it GREEN, and does**, which is what the
comment-stripper in that block exists for.

⚠️⚠️ **THE LAST BLOCK OF THAT SUITE READS `QueryProvider.tsx` AS TEXT, AND IT IS THERE BECAUSE NOTHING
ELSE IN THIS REPOSITORY CAN SEE THE WIRING.** `R2` and `vitest.config.ts` both keep that file out of
the suite, so every policy assertion would stay green while the binding reimplemented the predicate
inline or dropped the `gcTime` loop — **and nothing would be written to the phone.** It asserts the
consequence it can reach (the binding NAMES the policy) and leaves the behaviour to a phone in
airplane mode ([[a-shell-check-cannot-see-a-pure-function]], applied to a suite).

⚠️ **NO CONTRACT CHECK AND NO WORKFLOW JOB, AND THAT IS NOT AN OMISSION: THERE IS NOTHING OVER THE
WIRE IN THIS ROW.** No migration, no RPC, no column, no policy. `db.yml` fires anyway because its
`paths:` filter names `app/src/api/`, and every contract check passes unchanged — **which is a real
cost (12-13 minutes) paid for a file that makes no schema claim**, and is worth knowing before
somebody reads the run as evidence about this row. **No job is added.** ⚠️⚠️ **AND RE-MEASURING THAT COUNT FOUND `CLAUDE.md` STALE BY ONE, FIXED IN THIS
PR: it said *ten job definitions rendering as eleven names* and the workflow files hold **ELEVEN**
definitions and **TWELVE** names** — `db.yml` has eight jobs, not seven; the line went stale the
moment `6c` opened `catalog-origin` and the table beneath it disagreed with the prose above it.
⚠️⚠️ **AND THIS PR FALSIFIED A SECOND CLAIM IN THAT SAME PARAGRAPH, OFF ITS OWN LOG: *no single PR
ever shows all twelve*. `gh pr checks 240` printed TWELVE.** `money.yml`'s `paths:` filter is not only
`packages/**` — it names **`package.json` and `package-lock.json` at the ROOT**, and this row added two
dependencies. **Adding a dependency is one of the paths**, which is the rule the flat sentence hid.

⚠️⚠️ **WHAT ONLY A PERSON CAN JUDGE, AND IT NEEDS A REBUILD FIRST:** open Wera with signal, tap
Productos so the catalog loads, **wait more than five minutes** (that is Finding 1 — a shorter wait
tests nothing), force-quit, put the phone in **airplane mode**, and reopen. Productos should list the
catalog, and **Vender's commit slider should be there and complete**. Before this row it was a screen
that could not sell.

⚠️⚠️ **THE BUILD IS MADE AND SIGNED AND IS **NOT** ON HIS PHONE, BECAUSE THE PHONE IS NOT
REACHABLE FROM THIS MAC — AND THAT IS A DIFFERENT FAILURE FROM THE ONE THIS PROJECT HAS ON RECORD.**
`BUILD SUCCEEDED`, `main.jsbundle` is **4,060,902 bytes** written at 11:10 and **all fourteen of the
new screen's words are in it — nine as 1-byte strings and five as UTF-16LE**, Hermes' own split
([[hermes-bundle-stores-accents-utf16]]). The bundle carries profile `ad8112ec` to
**2026-10-04T14:28:16Z**, read off `embedded.mobileprovision` — **reused, not renewed, exactly as
the rule predicts for a build before the expiry.**
⚠️⚠️ **`devicectl` ANSWERS `unavailable` AND EVERY INSTALL IS `com.apple.dt.CoreDeviceError 1011` —
*CoreDeviceService was unable to locate a device matching the requested device identifier* — AND
THAT IS **REACHABILITY** RATHER THAN THE PASSCODE.** Twenty attempts over five minutes, no change;
`iPhone-de-Bernie.coredevice.local` does not answer a ping; the phone is not on USB; and this Mac's
Wi-Fi is powered on but **associated with no network** (`networksetup -getairportnetwork en0`).
⚠️ **The lesson already on record is the OTHER one** — `kAMDMobileImageMounterDeviceLocked` and
`CoreDeviceError 3`, which mean *the screen is locked* and are fixed by keeping it awake. **`1011`
with `unavailable` means the Mac cannot see the phone at all**, and a retry loop written for the
lock will spin on it for ever. ⚠️ **The earlier note that *`unavailable` was read for the first ten
minutes* on 2026-09-25 describes a transient; this was not one.**
⚠️ **WHAT HE HAS TO DO, AND IT IS THE ONLY THING WAITING ON A PERSON HERE:** get the phone and this
Mac onto the same network (or plug the phone in), and say so. ⚠️ **`docs/checks/5a-iv-a-runsheet.md`
§2 steps 2 and 3 are the install commands**, and the built app is at
`~/Library/Developer/Xcode/DerivedData/Wera-*/Build/Products/Release-iphoneos/Wera.app`.

⚠️⚠️ **AND THE SENTENCE THIS REPLACES IS ALREADY STALE — CORRECTED BY `6a-ii-b` THE SAME DAY.**
~~the build is already made, so the install is two commands and about a minute~~. **That build is
`6a-ii-a`'s**, and `6a-ii-b` shipped after it: installing it now would hand him a phone carrying the
write-off LIST and not the two controls on it, **which is precisely the state the `6a-ii-a` row above
describes as deliberate and which is no longer true.** ✅ **So the order is REBUILD, then install** —
one more command in front of the two, and the runsheet's step 1 is it. ⚠️ **Re-measured 2026-09-27
after `6a-ii-b`: nothing has changed on the machine side.** `devicectl list devices` still reads
**`unavailable`**, the hostname still does not resolve, and `networksetup -getairportnetwork en0`
still answers *"You are not associated with an AirPort network"* — **so the blocker is this Mac's
Wi-Fi rather than the phone**, and no retry loop can fix it.

⚠️⚠️ **AND THE WHOLE `R9` BACKLOG IS NOW ASSEMBLED IN ONE PLACE — `docs/HANDBOOK.md`'s
`## ⏸ THE CATCH-UP`, WRITTEN 2026-09-27 BECAUSE THE OWNER ASKED FOR IT BEFORE A CONTEXT CLEAR.** It is
an INDEX and not a second copy: the install prerequisites, the five screens to open with the specific
question on each, a pointer at ⛔ DECISIONS OWED, and the two dated obligations. ⚠️ **It gathers the
looks of EIGHT closed rows** — `5h-ii-a`, `5h-ii-b`, `5h-ii-c`, `6a-i`, `6a-ii-a`, `6a-ii-b`, `6b`,
`6c` — **which had spread across this file and four archive files with nothing collecting them.**

⚠️⚠️ **AND ASSEMBLING IT FOUND A STALE CLAIM THE ARCHIVE WILL KEEP CARRYING, SO IT IS RECORDED HERE
RATHER THAN EDITED THERE.** The `5h-ii-*` and `6a-i` entries each end *"the build on his phone has to
be rebuilt before he can open this"* — **true when written and FALSE since the 2026-09-27 re-deploy**,
which landed everything up to and including `6a-i`. ⚠️ **They are NOT corrected in
`docs/plan/archive/`**, because that directory is this system's history and every line there was true
when written; the correction belongs where it is actionable. ✅ **Checked against the commit order
rather than assumed**: the re-deploy (#231) sits between `6a-i` (#229) and `6a-ii-a` (#232), so **two of
the five screens are already on his phone and four rows' worth of work is not** — `6a-ii-a`,
`6a-ii-b`, `6b` and `6c`.

⚠️⚠️ **WHAT ONLY HE CAN JUDGE (`R9`, §2.11), AND IT IS A SHORT LIST THIS TIME.** Whether **three
buttons fit on one row** — *Desperdicio* is eleven characters where *Compras* is seven. Whether a
write-off row **with no peso figure at all** reads as finished or as broken. And whether the cause
belongs **under the date**, where a supplier's name sits on a delivery, or on each line.
**None of it can be looked at until the install lands.** ⚠️⚠️ **AND `6a-ii-b` HAS ADDED TO THAT
LIST RATHER THAN CLEARING IT** — two rows of Desperdicio work are now waiting on one install.
