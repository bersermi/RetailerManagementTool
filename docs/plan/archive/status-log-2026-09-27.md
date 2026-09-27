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
