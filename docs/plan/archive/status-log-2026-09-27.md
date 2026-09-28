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
