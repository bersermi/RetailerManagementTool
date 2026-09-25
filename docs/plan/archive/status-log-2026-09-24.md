# Status log — the 2026-09-24 working day, first cut

⚠️⚠️ **ARCHIVED 2026-09-24 FROM `docs/PLAN.md`'s `## Position`, WHICH HAD REACHED
1,367 LINES AGAINST ITS 1,400 CEILING** — `plan-handover.sh` assertion 7, and the
remedy is the one that check names in its own failure. Every line below is
**MOVED, not copied**: two homes for one claim is the defect this repository has
recorded six of, and `split-coverage.sh` fails on *"row appears 2 times"* because
it reads the corpus, which includes this file.

⚠️⚠️ **THIS IS THE SECOND FILE EVER OPENED FOR A DAY THAT WAS STILL RUNNING, AND
THE REASON IS THE SAME ONE `status-log-2026-09-22.md` GIVES: THERE IS NO OLDER DAY
LEFT TO TAKE.** 2026-09-23 went out entirely in the sixth and seventh cuts earlier
today, so the oldest status entry in the live plan is now from today. ⚠️ **A LATER
SESSION APPENDS TO THIS FILE RATHER THAN MAKING A SECOND ONE FOR THE SAME DATE** —
one working day per file, and a `status-log-2026-09-24b.md` would break it. ⚠️ **And
it is never renamed to absorb a later cut**: the plan's own history names these
files, and renaming for tidiness makes a recorded statement false.

⚠️⚠️ **IT WAS TAKEN PRE-EMPTIVELY, WHICH IS NEW.** Every cut before this one was
taken because a check had already gone red. This one was taken while `5R-g` was
shipping and `## Position` still had 33 lines of headroom — **enough to pass, and
not enough for the next session's first entry.** ⚠️ **Leaving it would have handed a
cleared session a red on its opening move**, for a ceiling it had no part in
spending. **That is the cheapest possible moment to pay it and the argument is worth
keeping**: the remedy costs the session that is already holding the context, and
costs the next one a cold start.

**What is here, oldest first as the plan had it.**

## The FIRST cut, taken 2026-09-24 while `5R-g` was shipping — off the FOOT

The oldest 2026-09-24 entry left in `## Position`: the backfill ruling, the shop
fact that made it cheap, and the two findings that came out of it — including the
one that would have shipped a wrong migration.

✅✅ **THE BACKFILL IS RULED, 2026-09-24 — *"Let's follow your recommendation"* — AND THE
QUESTION BEHIND IT TURNED OUT TO BE LARGER AND EASIER THAN THE ONE ASKED. `5f` IS STILL THE
NEXT TASK.** Everything present in a shop when the marker ships is **not** the shopkeeper's
and cannot be deleted; everything created through `Agregar` afterwards is his and can be.

⚠️⚠️ **THE SHOP FACT THAT MADE IT CHEAP, AND NO SESSION COULD HAVE KNOWN IT FROM THIS
MACHINE:** *"this part here is merely indicative for us to keep progressing on our Front
End."* **The rows in his shop are scaffolding for looking at screens, not a catalog anybody
trades on** — so the conservative backfill costs nothing, and a decision framed as *which of
your products do you lose* was really *none of them matter yet*. ⚠️ This block sized the
question correctly on its own terms and still could not price it; pricing it needed him
([[tienda-decisions-need-shop-truth]]).

⚠️⚠️ **AND WHAT HE WAS ACTUALLY ASKING WAS NOT *build the fence*, IT WAS *CAN WE EXPRESS THE
DISTINCTION AT ALL*:** *"What I wanted to be sure is we can effectively distinguish between
default products and those each user creates… when we start developing that onboarding step
where each user can select the nature of his shop and therefore import a set of products that
he can also look at offline we need to make that distinction to avoid them from deleting a
product they didn't create."* ✅ **The answer is yes, additively, and nothing in the applied
schema stands in the way.** `6c` now carries his sentence, and **C8.3's four store types are
what *the nature of his shop* selects between.**

⚠️⚠️ **FINDING 1 — THE ONE THAT WOULD HAVE SHIPPED WRONG, AND IT IS A MIGRATION, SO IT WOULD
HAVE SHIPPED IRREVERSIBLY.** The obvious implementation is to add `origin = 'shop'` to
`product_variant_update`'s policy predicate. **That would stop a shopkeeper PRICING OR
RENAMING an imported product — which is the entire reason for importing one.** He must be
able to put his own prices on our catalog and must not be able to remove it, and an RLS
`using` clause cannot say *this column may not change in this direction*. **So it is a TRIGGER
on `is_active` going true→false**, the shape `product_variant_units_same_dimension_trg`
already establishes in `0002`. ⚠️ A policy predicate here looks right, merges automatically
and breaks the catalog it was written to protect.

⚠️⚠️ **FINDING 2 — THE HALF OF *look at it offline* THAT NOTHING OWNS, MEASURED 2026-09-24.**
`app/src/api/QueryProvider.tsx` builds a plain `QueryClient` with **no persister**, so the
catalog lives in memory only. **A shop that imports a catalog, kills the app and reopens it
with no signal sees no catalog at all** — which is the pilot store's ordinary condition, the
thing §2.6 and C10.3 exist for, and exactly what his sentence promises. ⚠️ It is a separate
concern from the marker and may want a row of its own; it is recorded on `6c` because that is
the row whose sentence promises it.

⚠️ **Nothing was built.** The decisions block is empty for the eighth time, `6c` is ungated,
and the owner's instruction was to keep the front end moving — so `5f` stays next and `6c`
moves only on his word.


---

## Appended 2026-09-24 — the fifteenth cut, taken while `5g` was being sized

⚠️ **`## Position` reached 1,429 of 1,400 with the `5g` sizing entry in place**, so the two
oldest entries left in the block — `5f-i`'s closing entry and the `5f` sizing that preceded
it — were moved here off the FOOT, unedited. ⚠️ **A MOVE and never a copy**: `split-coverage.sh`
reads the corpus and fails on *"row appears 2 times"*, so two homes for one claim is the
defect rather than the backup. ⚠️ **Appended to the file for their own day** rather than given
a new one, which is the rule `status-log-2026-09-22.md` established.

✅✅ **`5f-i` IS DONE AS OF 2026-09-24 — THE APP CAN HOLD A BASKET AND PRICE IT, AND
A GUARD REFUSED THE FIRST DESIGN OF IT. `6c` IS THE NEXT TASK, AND THAT IS A HOLDING
MOVE: EVERY REMAINING CHILD OF `5f` IS BLOCKED ON THE OWNER.** 51 new assertions
(**1,030 over 35 files**, up from 979), **eighteen falsification fixtures**, one new
dependency — `zustand`, §2.11's own choice and this app's only store — and **no
migration**, as the row promised.

⚠️⚠️ **THE FINDING, AND IT COST THE SESSION ITS FIRST DESIGN: `5d-i`'s CONTRACT CHECK
REFUSED A WIDENING OF THE CATALOG READ, BY NAME, AND WAS RIGHT.** The sale payload needs
a tax rate whenever `prices_include_tax` is false, so this child added `tax_rate::text`
to `VARIANT_COLUMNS`. **`docs/checks/5d-i-catalog-contract.sh` went red on the assertion
that exists for it** — `enforce_stock`, `tax_rate` and `pack_size` are banned from the
list read on C8.8's argument, *"a column the app never asks for is a column that never
reaches a phone"* — and `5e-iii-a` already reads those two per variant. ⚠️ **The tempting
move was to teach the check about `::text` casts. That would have been weakening a guard
to fit a change**, and the guard was making the better argument: **a rate is needed only
on the branch no shop takes**, so every phone would have carried a column on every
catalog read for a case none of them reaches. ✅ **The rate is an ARGUMENT now**, and
`quoted` returns `null` rather than defaulting it to zero — **loud and stuck beats quiet
and short by the IVA on every line for ever.**

⚠️⚠️ **AND THE SECOND FINDING FELL OUT OF THE FIRST, WHICH IS WHY IT IS WORTH RECORDING:
A PURCHASE MUST NOT FALL BACK TO THE SHELF PRICE.** Once the quote was a parameter, the
buy side had a default — and §2.8 is explicit that a supplier price is *"a fact about a
relationship, not about a product"* (C3.11). **A delivery quietly recorded at retail is
plausible, syntactically perfect and wrong in the margin for ever**, so `quoteFor` hands
the buy side `null` until `5g` passes a figure. ⚠️ **The one column that WAS added is
`base_unit_code`** — what a keyed `288` is sent in — and the live check is green on it.

⚠️ **WHAT IT DOES NOT PROVE, SAID RATHER THAN IMPLIED:** nothing here has asked Postgres
whether it accepts this payload. `record_sale` is `5h`'s and `record_purchase` is `5g`'s,
so the round trip is named on those rows. **A node suite read every rule; no database
read any of them.**

⚠️⚠️ **VERIFIED, AND NOT BY A TICK.** `docs/checks/5d-i-catalog-contract.sh` reports **12
assertion groups over real HTTP**, including *C8.8's switch does not reach the phone,
measured off the wire* — the assertion that refused this session's first design.
`conventions-gate.sh` passes **16 groups over 65 source and 35 test files**. The suite is
**1,030 assertions**, the typecheck is clean, and **eighteen falsifications were run by
hand and each restored**: a quote that ignores the flag, a missing rate defaulted to zero,
a purchase falling back to the shelf, the step picked rather than read, a keyed fourth
decimal rounded away, a zero line kept, an unpriced line counted as nothing, figures sent
as JSON numbers, the wrong price key, a self-stamped `occurred_at`, a draft with no
location, a step-down that clamps, one cart shared by both screens, a restored basket
thrown away, a shop change that keeps the old basket, and `Vaciar` emptying both sides.
**Rule 4: these assertions were confirmed capable of failing before they were believed.**

⚠️⚠️ **WHY THE MARKER MOVED TO `6c`, AND IT IS THE FIRST TIME IT HAS MOVED BECAUSE THE
FRONT END RAN OUT OF UNGATED WORK.** `5f-ii` is blocked on the ADR amendment, `5f-iii` on
`5f-ii`, and `5f-iv` on the sale-only override — so `plan-handover.sh`'s rule that a
blocked task may not be next leaves one ungated row worth taking. **It is a holding move
and the row says so: one sentence about the quantity control and `5f-ii` is next again.**
⚠️ `6c` is a migration and the owner asked to keep the front end moving, **so if he would
rather the front end waited for nothing, the ruling is the cheaper of the two things he
could send.**


⚠️⚠️ **`5f` WAS SIZED ON 2026-09-24, THE DAY IT WAS TAKEN AND BEFORE A LINE OF IT WAS
WRITTEN, AND IT SPLIT FOUR WAYS. `5f-i` IS THE NEXT TASK: THE CART AND THE ARITHMETIC
THAT PRICES IT, WITH NO SCREEN ON IT.** No code, no migration: this entry is a sizing,
two questions parked, one row promoted out of the ADR, and the sixteenth split spec.
**The full argument is under Step 5, in *"Sized 2026-09-24"*, where it survives this
block being archived.**


---

## Appended 2026-09-24 — the sixteenth cut, taken as `5g-i` closed

⚠️ **`## Position` reached 1,440 of 1,400 with `5g-i`'s closing entry in place**, so the
oldest entry left in the block — `5f-ii`'s, and the two rulings it carried — was moved here
off the FOOT, unedited. ⚠️ **A MOVE and never a copy.** ⚠️ **This is the second cut of the
day and both were taken by a session that wanted to be writing something else**, which is
the argument `plan-handover.sh` assertion 7 makes in its own failure text.

✅✅ **`5f-ii` IS DONE AS OF 2026-09-24 — VENDER IS A SCREEN.**
**`5f-iii` IS THE NEXT TASK.** The `Pendiente` placeholder that has stood behind the Vender tab since `5a-ii` is
gone. **The search, the flat variant list, C3.2's row, the stepper-and-keypad on every
product and C3.4's sticky `Total`** — with **nothing committed and nothing written**, which
is the split and not an omission: the sheet, the slide and the first call `queueWrite` has
ever had are `5f-iii`.

⚠️ **Shipped:** `app/src/app/(tabs)/vender.tsx`; `app/src/cart/quantity.ts`, the pure half
of the quantity control; an `ES.sell` block; and `app/test/cart-quantity.test.ts` —
**19 new assertions, 1,006 passing over 36 files, up from 987 over 35.** No migration, and
`5f.split`'s `EACH_CHILD_SAYS` asserts that positively on all four rows.

⚠️⚠️ **THE ONE THING THAT WOULD HAVE GONE IN WRONG SILENTLY: C3.8 GIVES TWO EXAMPLES AND
THEY NEED A RULE BETWEEN THEM, AND `0001` DOES NOT HOLD IT.** The constraint says *"priced
por cuarto, three taps read `250`, `500`, `750` with `gr` beside the field — grams, not
cuartos"* and *"priced por kilo, the same product is entered as `0.250 kg`"*. **No uniform
rule satisfies both**: always-the-price-unit gives *3 cuartos*, which C3.8 refuses by name,
and always-the-base-unit makes a kilo of chicken read `1000 gr`. ⚠️ **So the price unit
decides, and what separates the two examples is what KIND of unit it is** — `kg` is a thing
a shop weighs in, `250g` is a denomination a shop prices in. ⚠️⚠️ **AND THE `unit` TABLE
RECORDS NOTHING THAT SEPARATES THEM — MEASURED, NOT ASSUMED:** `code`, `dimension`,
`base_code`, `factor_to_base` and `display_order`, and the only column that happens to sort
them is `display_order`, which means *where this unit goes in a picker*. **Leaning on it
would be a rule derived from a column that does not mean it.**

⚠️ **SO IT IS A DECISION AND IT IS WRITTEN DOWN AS ONE** — `MEASURED_IN` in
`@/cart/quantity`, five codes out of `0001`'s ten, with the five packs named as absent and a
**base-unit fallback for a code nobody listed**, which fails as a bigger number rather than
as a wrong one. ⚠️ **The precedent for a per-code fact living in the app is `ES.units`**,
which already maps `250g` to *250 gr* keyed by code with a fallback; this is that shape,
one file over, and it is a two-line edit if the owner reads the line differently.

⚠️⚠️ **AND THE AMBER SETTLED AN ARGUMENT `5d-ii` LOOKED LIKE IT WAS HAVING WITH `5f-ii`.**
§2.11 fences the `atención` colour to C3.17's unpriced row; `productos.tsx` refuses to paint
its dash amber and its reason is good — C8.2 has the owner seeding the catalog
**deliberately short**, so a flat list of ~100 products would open amber on most of its rows
for the pilot's first week, and *"an alarm on a hundred rows is the alarm nobody can
silence"*. ✅ **Both hold, and the CONDITION separates them: a priceless product nobody is
selling is not a problem, and the same product with a quantity on it is about to be sold for
nothing.** So the row goes amber the moment it becomes a line and not before — one row at a
time, exactly C3.17's *the fix is one tap away*, silenced by either of the two things she
would do anyway. ⚠️ **Never by colour alone** (`R11`): `ES.sell.noPrice` rides with the hue
on the row and `ES.sell.someUnpriced` beside the total.

⚠️⚠️ **WHAT THE SCREEN DOES ABOUT AN UNPRICED ROW IS DELIBERATELY STILL NOT DECIDED** — a
purchase blocked (C3.13), a sale allowed and loud (C3.14). Two answers to one basket, owned
by `5g` and `5h`, and this list is shared by both.

⚠️ **THREE THINGS THAT WOULD HAVE BEEN EASY TO GET WRONG AND WERE NOT, EACH FOR A REASON
ALREADY WRITTEN DOWN IN THIS REPOSITORY.** ⚠️ **(1) The basket is priced against the WHOLE
catalog and not the filtered one.** `useCatalog(typed)` returns the rows that MATCH, so
pricing the basket off it would make the `Total` fall every time she typed a different
product's name. ⚠️ **(2) `openShop` is called only once a shop is KNOWN.** `useWorkspace`
answers `null` while its read is in flight — every cold start — and `openShop(null)` on a
store restored from disk means *the shop changed* and drops the basket, on exactly the
launch §2.11 persisted it for. ⚠️ **(3) The total is withheld rather than guessed while the
shop is unknown**, because `?? true` for `prices_include_tax` is the identity `5f-i` refused
to hard-code and a screen is not the place to reintroduce it.

⚠️ **THE `...` IS ABSENT AND NOT DRAWN DEAD**, which is the opposite of `Costos` on La
Familia and is `5f-ii`'s own row: `Costos` is dead because a shopkeeper had already SEEN it,
and nobody has ever seen a `...` here. **The initials tile is absent too** — C3.2 does not
list one, and this row carries a `−`, a box and a `+` that Productos' row does not.

⚠️ **THE SEARCH BOX AND THE EMPTY STATES ARE COPIED FROM `productos.tsx`, DELIBERATELY.**
`5h.5` owns `src/ui/`, §3 requires the primitives before step 6, and the owner refused *"ten
primitives guessed at against screens nobody has drawn"* on 2026-09-13. **This is the second
drawing of a search box and the first of a sticky bar — the real pattern `5h.5` extracts.**

⚠️ **THE GATE CAUGHT ONE THING AND IT IS WORTH KEEPING:** `R6` refused `height: 1` on the
separator. A height is a size a person looks at, and `1` would have been the one measurement
on this screen *Letra grande* could not change — the same refusal `productos.tsx` already
records, made a second time by a second file and caught by the check rather than by a
reader.

⚠️ **VERIFIED BY:** `npm run typecheck --workspace @tienda/app`; the Vitest suite
(**1,006 assertions over 36 files**, the 19 new ones in `app/test/cart-quantity.test.ts`);
`docs/checks/conventions-gate.sh` (**16 groups over 66 source and 36 test files**) and its
falsifier `conventions-gate-falsify.sh` (**30 fixtures, 29 red and 1 deliberately green**);
`plan-handover.sh`; and `split-coverage.sh --all`. ⚠️⚠️ **AND WHAT NONE OF THEM LOOKED AT IS
MOST OF THIS TASK** — §2.11 keeps rendering, navigation and layout out of scope, so whether
the row is legible across a counter, whether the `−`, the box and the `+` are reachable with
one thumb, and whether the sticky bar leaves room for a price in *Letra grande* are `R9` and
**the owner's phone is the whole instrument.**

✅✅ **BOTH QUESTIONS WERE RULED ON 2026-09-24, ABOUT FOUR HOURS AFTER THEY WERE PARKED,
AND THE FIRST IS AN ADR AMENDMENT THAT IS NOW APPLIED. `5f-ii` IS THE NEXT TASK AGAIN.**
No code: this entry is two rulings, two amended ADR sections, two amended constraints, a
deferred child and a marker handed back. **The decisions block is empty for the ninth
time in this project's life.**

⚠️⚠️ **RULING 1 — THE QUANTITY CONTROL, AND HE REVERSED THE HALF OF THE RECOMMENDATION
THAT HAD BEEN CALLED SAFE.** *"Amend it to say both, this should be easily switchable and
configurable. The step for the stepper and essentially any product qty can be set by
keypad. If a user wants to sell 15 manojos of cilantro, he shouldn't have to click the
stepper 14 times."* ✅ **ADR-035 §2.8's *Unit-aware input* row and §2.11's `QtyInput` are
amended**, with a revision entry, and C3.8 carries the ruling. **The control is not a
switch: every product has a stepper AND a keypad, one tap apart.**

⚠️⚠️ **THE BRIEF SAID *nothing is lost — a discrete unit gets no keypad, because there is
no 288th of a `pza`*. THAT WAS TRUE AND BESIDE THE POINT.** A keypad is not about
precision, it is about **magnitude**: fifteen manojos of cilantro is fifteen taps, and the
tap budget §2.8 exists to protect was about to be spent on the one product shape the
recommendation had reasoned its way past. ⚠️ **It is the fourth ruling in this block to
answer a larger question than the one asked**, and the first to correct the
recommendation's own reasoning rather than choose between its options.

⚠️ **ONE AMBIGUITY IS RECORDED RATHER THAN RESOLVED ON HIS BEHALF.** *"The step for the
stepper … can be set by keypad"* has a reading in which the STEP SIZE is itself typed in.
**The step is already configurable without any new affordance** — it is `price_unit_code`'s
factor, and he picks that unit per product in `Agregar` and `Editar`, so pricing *por
cuarto* sets a 250 g step. **A step set independently of the price unit is a different
thing, `5f-ii`'s row says it is not being built, and one sentence brings it back.**

⚠️⚠️ **RULING 2 — NO COUNTER DISCOUNTS IN THE PILOT, AND IT KILLED MORE THAN THE QUESTION
ASKED.** *"Let's not do those discount controls part of the pilot yet, we will need to
understand the interactions before creating anything like that. Any money 'knock-off'
happens in her head and is out of the scope of the app for now."* **The answer is NO and
`5f-iv` is deferred out of the pilot.**

⚠️⚠️ **WHAT IT ALSO KILLED, FLAGGED RATHER THAN ABSORBED: C3.16's *reset-after-each-
transaction* SETTING IS THE SAME AFFORDANCE.** The question was whether a cashier can knock
money off ONE sale without touching the price list; **that setting is exactly that, made
global instead of per-tap** — so the ruling strikes it, and with it the discreet Home
banner that existed only to announce it. ⚠️ **If he meant to keep the setting and refuse
only the per-tap control, that is one sentence and it comes back.** ⚠️ **What survives
untouched:** a price change persists, because there is now no other kind; `Editar` is where
one is made; C3.17's manager fence is unchanged.

⚠️ **AND `5f-ii` DRAWS NO `...` AT ALL RATHER THAN A DEAD ONE**, which is the opposite of
what `Costos` gets and for the reason that makes `Costos` right: a button a shopkeeper has
already SEEN and then cannot find reads as the app shrinking, **and nobody has ever seen a
`...` on this screen.** Nothing to preserve, so nothing to draw.

⚠️ **`6c` HELD THE MARKER FOR ABOUT FOUR HOURS AND HANDED IT BACK**, exactly as its row
said it would. ⚠️ **What the detour bought is worth keeping:** `plan-handover.sh` refuses
to let a blocked task be marked next, so the plan could not quietly sit on a row nobody
could start — **the check turned a stall into a visible question**, and the question was
answered the same evening.

⚠️ **VERIFIED, AND NOT BY A TICK.** `split-coverage.sh` on `5f.split` still reports
**20/20 deliverables in exactly one child** and all twelve required sentences after both
rows were rewritten; `plan-handover.sh` passes eleven groups with an empty decisions block;
`handbook-agreement.sh` agrees on the next task and on nothing being owed. **No code
changed, so no suite could have.**


---

## Appended 2026-09-24 — the seventeenth cut, taken as `5g.5` closed

⚠️ **`## Position` stood at 1,384 of 1,400 with `5g.5`'s entry and two rulings in place** —
sixteen lines, which is less than one paragraph — so the oldest entry left in the block,
`5f-iii-a`'s and the `unitColumns` fix it carried, was moved here off the FOOT, unedited.
⚠️ **A MOVE and never a copy.** ⚠️⚠️ **THIS IS THE THIRD CUT OF ONE DAY AND THE SECOND PAID
FORWARD RATHER THAN FORCED**: the block was not yet red, and leaving sixteen lines would have
made the next session pay for this one — which is the argument `5d-iv-b`'s cut wrote down.

✅✅ **`5f-iii-a` IS DONE AS OF 2026-09-24 — THE SHOP CAN READ ITS OWN BASKET BACK.
`5f-iii-b` IS THE NEXT TASK: THE SLIDE, AND THE FIRST WRITE THIS APP HAS EVER PUT IN THE
QUEUE.** C3.5's sheet is drawn — only the rows carrying a quantity, the same field and
stepper as the list behind it, `Quitar` on every line and `Vaciar carrito` with its
confirmation and the owner's animation. ⚠️ **It still commits nothing**, which is the split.

⚠️⚠️ **THE HALF A MACHINE CAN SEE, AND IT IS THE HALF THE SIZING WENT LOOKING FOR:
`reviewOf` RETURNS THE ROWS **AND** THE TOTAL THEY SUM TO.** §2.5 rule 5 is written about
this screen by name, `basketOf` returned a total and a COUNT of lines and never the lines,
and a sheet drawing its own rows would have been a second arithmetic over one basket —
agreeing on every phone in the pilot and parting by a centavo the first time a rate rounds.
✅ **`basketOf` now delegates to it**, so the bar's number IS the sum of the figures the
sheet draws and the two cannot be written twice.

⚠️⚠️ **AND THE ONE JUDGEMENT IN THAT FUNCTION WAS NOT IN THE ROW EITHER: A LINE WHOSE
PRODUCT HAS LEFT THE CATALOG IS DRAWN, NOT HIDDEN.** A manager retires a product on another
phone while a basket is open; `draftOf` then refuses **the whole basket** with
`variant-not-in-catalog`, and the list behind the sheet is the catalog, which no longer has
the row — **so this sheet is the only surface in the app that can remove it.** A sheet that
hid what it could not name would leave a shopkeeper with a commit that refuses and nothing
on screen to act on, which is C3.18's users handed a piece of book-keeping. It appears
unnamed, unpriced, with the `Quitar` every other row has.

⚠️⚠️ **AND THE BUG THIS SESSION WROTE AND CAUGHT IS WORTH MORE THAN THE FEATURE, BECAUSE
NOTHING IN THIS REPOSITORY WOULD HAVE SEEN IT.** The first writing closed the sheet on
`cart.length === 0` — one tidy-looking effect — and **`Vaciar` empties the basket**, so it
unmounted the `Modal` in the same commit that started the owner's confirmation animation.
**The animation would have played on nothing, silently, on the one path it exists for.**
§2.11 bans the suite that would render it and no gate reads an effect's dependencies; it was
found by reading the two states against each other. ✅ **The sheet no longer closes itself at
all**: `Vaciar` closes on the animation's own completion, `Quitar` on the last line leaves the
empty state and `Cerrar`. ⚠️ **The refusal is recorded IN the file, beside the animation**,
because that is where a later session would re-add it.

⚠️ **A TWELFTH PALETTE ROLE, `velo` — the screen a sheet is laid over, dimmed.** `R11`
forbids a translucent literal in a screen by name, and its whole argument is that an
invented hex is *"a twelfth role nobody named"*. ✅ So it is named: the hue is a role and
the translucency is an `opacity`, laid on a separate view because `opacity` on a parent
would dim the sheet too. ⚠️ **It is in neither `INK_ROLES` nor `GROUND_ROLES` deliberately** —
nothing is ever written on it, which is `linea`'s own reason for being absent.

⚠️⚠️ **VERIFIED, AND NOT BY A TICK.** `app/test/cart.test.ts` — **8 new assertions, 1,020
over 36 files, up from 1,012** — and **two falsifications run by hand**: making the total
drift from the rows by one centavo turns **4 assertions red** (two of them `5f-i`'s own,
which is the identity working), and skipping the vanished-variant row turns its assertion
red. `conventions-gate.sh` **16/16 over 66 source files** with its falsifier's **30 fixtures**
(29 red, 1 deliberately green); `split-coverage.sh` **7/7 on the new `5f-iii.split`** and
green over all seventeen, with `split-coverage-falsify.sh`'s **943 fixtures**. ⚠️ **The gate
fired on this session once and it was right**: a comment explaining the `velo` decision
QUOTED the literal `R11` bans, and a guard that reads this file cannot tell an explanation
from an instance — *never spell a sentinel in the file it reads*, caught by the guard it
describes.

⚠️⚠️ **AND FOUR THINGS ARE ROUTED TO HIS PHONE RATHER THAN GUESSED (`R9`, §2.11).** Is `Ver
carrito` on the bar findable mid-sale, or does the thumb go looking for a button? Does the
emptying animation read as *done* at 420 ms, or as a flicker? Is `Quitar` in `error` red on
every line too loud for a ten-line basket — the palette's own sentence names `Quitar` first,
but it has never been drawn ten times? And does the sheet at *Letra grande* still leave the
line total readable beside the stepper, which is four things on one row?

⚠️ **Shipped:** `reviewOf`, `Review` and `ReviewRow` in `@/cart/cart` with `basketOf`
delegating; the sheet, its rows, `Vaciar` and the animation in
`app/src/app/(tabs)/vender.tsx`; an `ES.sell.cart` block; `velo` in `@/theme/palette`.
**No migration, and `5f-iii.split`'s `EACH_CHILD_SAYS` asserts that positively on both rows.**

⚠️⚠️ **`5f-iii` IS SIZED AND SPLIT IN TWO, 2026-09-24 — ON THE DAY IT WAS TAKEN AND BEFORE A
LINE OF IT WAS WRITTEN. `5f-iii-a` IS THE NEXT TASK: THE BASKET SHEET, AND IT COMMITS NOTHING.**

**The seam is the commit itself** — `5f-iii` is a screen that SHOWS a basket and a gesture that
COMMITS one, and only the second of those writes. It is `5f`'s own seam one level down, and the
seventeenth split in this project. ⚠️ **Every `M/L` row here has been split and this was an
`M/L`.**

⚠️⚠️ **THE FAILURE ARGUMENT, WHICH IS THE ONE THAT MATTERS:** the sheet's mistakes cost a glance
and a shopkeeper reports them in a sentence; the slide's belong to **the queue, the one part of
this app whose failures are silent by design** — a sale that never enqueues, one that enqueues
twice, one that never triggers a drain. **Nobody reports a sale they watched an animation
confirm.** One row would have let the invisible half ride in on the back of the visible one.
⚠️ **The order is not taste either:** §2.8 names *review before commit* as one of its three
guards, and the review IS the sheet — building the slide first ships a commit with nothing in
front of it, on the screen that takes a customer's money.

⚠️⚠️ **WHAT THE SIZING FOUND, AND IT WAS NOT IN THE ROW: THE SHEET IS THE SCREEN §2.5 RULE 5 IS
WRITTEN ABOUT, AND `5f-i` BUILT NO LINES FOR IT.** Rule 5 is *"the displayed lines fail to sum
to the displayed total on the review screen, which is the one screen where a customer is
checking the arithmetic by hand."* `basketOf` returns `centavos`, a **count** of lines and a
`complete` flag — **no lines at all** — so the sheet has nothing to draw a row from and the
obvious move is for it to price its own. **That is two arithmetics over one basket**, agreeing
for every shop today (`prices_include_tax` true, `NO_TAX_RATES` empty) and parting by a centavo
the first time a rate rounds. ✅ **One function returns the lines AND the total, the total being
their sum** — which is also what makes `5f-iii-a` a checkable child rather than a rendering one,
**the lesson `5e-iii.split` wrote into its own postscript.**

⚠️ **And two smaller ones.** The owner's two animations belong to **different children** — the
emptying one fires from `Vaciar carrito` and the sale one from the slide — so `5f.split`'s single
`CONFIRMATION ANIMATIONS` deliverable is **two** here, and a `Vaciar` cannot ship with its
confirmation orphaned in its sibling. ✅ And **the gesture costs no `pod install`**, measured
against `app/package.json`: `react-native-gesture-handler`, `react-native-reanimated` and
`react-native-worklets` are already dependencies — which matters because **no CI compiles this
app**.

⚠️ **Shipped:** the split in `docs/PLAN.md` and `docs/checks/specs/5f-iii.split`, the
**seventeenth** split spec — nine deliverables over two children, six required sentences and
one every child carries. **No migration, and no application code: this entry is the sizing.**

⚠️⚠️ **`5e-i` IS REOPENED AND FIXED FORWARD, 2026-09-24 — EVERY PRODUCT `Agregar` HAD EVER
MADE WAS UNSELLABLE, AND `5f-ii` ON A PHONE IS THE ONLY REASON ANYBODY KNOWS.** `5f-iii` is
still the next task.

⚠️ **The chain, because it is the argument for `R9` and for the whole of step 5's shape.** The
owner opened Vender, stepped `+` on a product priced per 250 g, and read `1, 2, 3` where C3.8
says `250, 500, 750`. **That is a rendering complaint.** It was a display bug for about ten
minutes — `shownUnitOf` trusting `entry.baseUnit` — and then the question *why does the variant
say it is stored in `250g`* had an answer: `unitColumns` writes the picked unit into **all four**
unit columns, and `record_sale` (`0016:217`), `record_purchase` (`0018:265`) and
`record_transfer` (`0020:355`) each refuse a line where `u.base_code <> pv.base_unit_code`.

⚠️⚠️ **SO A ONE-GLANCE DEFECT ON THE HIGHEST-TRAFFIC SCREEN WAS SITTING ON TOP OF A LEDGER
DEFECT THAT NOTHING IN THIS REPOSITORY COULD SEE.** 1,006 assertions, sixteen conventions
groups, forty-four live contract assertions over a real database, and every one of them green —
because **no constraint in the database catches it either**, which was measured rather than
assumed: the new assertion 17 posts both shapes and the wrong one is accepted. ⚠️ **`5e-i`'s
own contract could not have caught it**, and the reason is exact: every variant it posts is
`kg kg kg kg`, and for a unit that is already its dimension's base the bug is invisible. **It
had been creating the broken shape itself, 296 rows of it, for three weeks.**

✅ **Fixed, on the owner's ruling of the same day — *"Fix the form and delete and remake them"*:**
`unitColumns(unitCode, bases)` writes `unit.base_code` into `base_unit_code` and the picked unit
into the other three; `variantRow` and `createProduct` thread the map from the units read they
already make. ⚠️ **The price arithmetic needed NO change and that was checked rather than hoped**
— `pricePerBase` divides by `factor_to_base` of the PRICE unit, so `price_per_base` has always
been per gram and never read `base_unit_code` at all. **The column was the only thing disagreeing
with the arithmetic around it.**

⚠️ **The trigger stays unreachable.** `product_variant_units_same_dimension_trg` fires only on
codes spanning two DIMENSIONS, and `unit.base_code` is by construction in the unit's own
dimension — so the four may now differ and still never span two. There is still no Spanish
sentence for that `23514` and still no need of one.

⚠️ **Shipped:** the `unitColumns` fix; `docs/runbooks/delete-unsellable-products.sql`, which is
**not a migration and says so** — it repairs one shop's accident once, ends in `rollback`, and
**was run against the local database as written**: 311 broken variants found, 137 prices and 109
emptied families deleted, rolled back, count unchanged. **1,012 assertions over 36 files**, and
**assertion 17 of `5e-i-catalog-write-contract.sh`** — which posts a pack-priced variant and
reads `unit.base_code` off the wire — with its falsifier's **17 fixtures** re-run.

⚠️⚠️ **AND THE HALF THE OWNER MUST DO HIMSELF, NAMED RATHER THAN QUIETLY LEFT: HE CANNOT DELETE
A PRODUCT IN THE APP.** `Editar`'s retire control is drawn on nothing until `6c`, so the runbook
is the affordance. **`6c` is where that comes back.**


---

## Appended 2026-09-25 — the eighteenth cut, and it REUNITES a split entry

⚠️⚠️ **THIS CUT IS NOT ABOUT SIZE FIRST, WHICH MAKES IT THE FIRST ONE THAT IS NOT.**
The sixteenth cut moved `5f`'s SIZING HEADER into this file on 2026-09-24 and left its
BODY — the twenty deliverables, the three findings and the verification — behind in
`## Position`. **So one status-log entry had two homes**, which is the defect shape this
repository has recorded ten of, arriving through an archive cut rather than through a
copy-paste.

⚠️ **It was not a duplicate and that was checked rather than assumed**: the two halves
share no sentence, `split-coverage.sh`'s *"row appears 2 times"* could never have seen
it, and the header in the fifteenth cut above points at Step 5's own section rather than
at this prose. **A split entry is not a stale copy — it is worse, because each half reads
as complete.**

⚠️ **The size argument is real too**: `## Position` stood at **1,359 of 1,400** with
`5g-ii`'s closing entry and two newly parked decisions in it, so the room had to come
from somewhere. **Taking it from the half that was already orphaned is the cheapest
forty-two lines in the file.** ⚠️ **A MOVE and never a copy**, unedited.

⚠️⚠️ **THE ROW ASKED FOR THE SIZING IN ITS OWN WORDS AND IT WAS RIGHT: TWENTY
DELIVERABLES.** *"This row lists a screen, a stepper, a basket, a slide-to-commit, a
price change and a persistence setting, which is not one sitting."* **The seam is `5d`'s
and `5e`'s** — the half a machine can hold goes first, alone — **plus a second one the
earlier splits did not need: `5f-iii` WRITES.** Nothing in this app has ever enqueued
anything, so all four of `5c`'s children have been built against fixtures and the first
real caller is worth its own row.

⚠️⚠️ **THREE THINGS THE SIZING FOUND, AND NONE OF THEM WAS IN THE ROW.**

| | The finding | Why it changes the work |
|---|---|---|
| **1** | **THE CART IS STATE BEFORE IT IS A SHEET, and §2.11 had already chosen where it lives** | *"Zustand, cart only, persisted to `expo-sqlite`"* — and **`zustand` is not a dependency of this app**, measured against `app/package.json`. The row said *basket sheet* and named no store at all |
| **2** | ⚠️⚠️ **THE QUANTITY CONTROL CONTRADICTS THE ADR, AND THE ADR WINS** | §2.8 says *"never the same control for both"* and §2.11 names `QtyInput` as the stepper/keypad **switch**. C3.8 and the owner's own words of 2026-09-23 put **both** on one weighed line. **Parked as an ADR amendment** |
| **3** | **THE COMMIT PAYLOAD IS A DECISION** | `record_sale` takes `unit_price_gross_per_base`, `price_list` stores `price_per_base`, and §2.5 rule 2 anchors a sale on GROSS and a purchase on NET. They agree only while `prices_include_tax` is true — true for every shop today, **so the branch is invisible until the day it is wrong** |

⚠️⚠️ **TWO ARE PARKED IN THE DECISIONS BLOCK AND NEITHER BLOCKS THE TASK MARKED NEXT.**
Finding 2 blocks `5f-ii`, because drawing the control either way writes the
disagreement into shipped code. **And the price-override question `5f` has owed since
the C3.17 ruling now sits on `5f-iv`**, the child that draws the `...` — a cashier's
PATCH of `price_list` is not refused, it is invisible, so the control drawn without
that answer is a button she taps while nothing happens.

⚠️⚠️ **AND ONE THING ADR-035 §2.8 REQUIRES THAT NO ROW IN THIS FILE HELD — IT IS NOW
`5f.5`, GATED ON `5g`.** §2.8 names **three** error-prevention guards; the third, the
**magnitude warning** (*"beyond ~3× the trailing median"*), appears nowhere in this
plan and nowhere in `app/src/`, and §6 does not defer it. ⚠️ **It is after `5g` because
§2.8 seeds it from PURCHASE history and nothing in this app has ever read a purchase** —
a median over an empty table warns about everything or about nothing.

⚠️ **VERIFIED, AND NOT BY A TICK.** `docs/checks/split-coverage.sh` on the new spec
reports **20/20 deliverables landing in exactly one child, the assigned one**, twelve
required sentences surviving and every child carrying *it ships no migration*; `--all`
is green over all sixteen specs; `plan-handover.sh` passes all eleven groups, including
*the next task is not blocked by any open decision* with two now open. ⚠️ **The spec's
first run was RED on a required sentence** — a capital `T` in the row against a lower
case one in the phrase — **which is the check doing precisely its job on its author.**

⚠️ **AND THE THIRTEENTH ARCHIVE CUT WAS TAKEN FIRST, BEFORE ANY OF THIS WAS WRITTEN.**
`## Position` stood at **1,373 of 1,400** with nothing added yet, and an `XL` sizing
entry is longer than twenty-seven lines — so `5d-iv-a` and the `5d-iv` sizing went to
`status-log-2026-09-22.md`, the file for their own day, appended rather than replaced.


---

## Appended 2026-09-25 — the nineteenth cut, off the FOOT as `5g-ii-a` closed

⚠️ **`## Position` reached 1,423 of 1,400** with the twenty-fourth ruling's entry in it, so the
oldest entry left in the block went out — **the working-agreement amendment of 2026-09-24, the
ruling that made an `M` or an `L` one sitting.** ⚠️ **A MOVE and never a copy**, unedited.

⚠️⚠️ **IT IS ARCHIVED AND IT IS STILL BINDING, WHICH IS WORTH ONE LINE BECAUSE THE TWO ARE EASY
TO CONFUSE.** The RULE lives in `docs/PLAN.md`'s `## Working agreement`, in `CLAUDE.md` and in
`docs/HANDBOOK.md`'s working prompt — all three still carry it. **What moved here is the entry
recording the day it was decided**, which is history and belongs in a status log.

✅✅ **THE WORKING AGREEMENT IS AMENDED BY THE OWNER, 2026-09-24 — AN `M` OR AN `L` IS ONE
SITTING NOW.** *"we'll make an ammendment now that we have Claude Max, if a task is M or L,
let's do it at once, we have enough usage and space to do it."* ⚠️ **It is the TWENTY-FIRST
owner ruling recorded in this project and the first one that changes how the work is
organised rather than what gets built.** **`XL` still splits on size; `M` and `L` do not.**

⚠️⚠️ **THE OLD RULE'S PREMISE WAS A BUDGET, AND IT SAID SO IN ITS OWN TEXT** — *"so the work
survives a usage limit or a context clear."* The splitting was never an argument that work is
clearer in halves; it was insurance against losing half of it. **A plan is a poor place to
carry a subscription tier's constraint after the tier has moved**, and this is the first time
anything in these documents has been retired because its reason expired rather than because
it was wrong.

⚠️⚠️ **WHAT WAS FLAGGED BACK, AND THE AMENDMENT KEEPS IT: THE SIZING PASS IS NOT THE SPLIT.**
Sixteen of the seventeen splits were preceded by an estimate that **found something the row
did not say**, and in most of them the finding was worth more than the division. `5f`'s
sizing found the cart store §2.11 had already chosen, the quantity control contradicting the
ADR, and a commit payload about to hard-code a gross/net identity; `5f-iii`'s, that same
morning, found the basket sheet is the screen §2.5 rule 5 is written about. **None of those
needed a split to be worth taking.** ✅ So the agreement now reads *estimate first, write down
what the estimate found, then build the whole row* — and `docs/HANDBOOK.md`'s working prompt
says it in the owner's own words.

⚠️⚠️ **AND THREE SPLITS SURVIVE AT `M` AND `L`, because none of the three is about how long a
sitting is.** **(1) A GATE** — half the row blocked on a decision or an ADR amendment the
owner owes and the other half not, which is what let `5f-i` ship on the morning `5f-ii` was
stuck. **(2) TWO FAILURE CLASSES, one of them invisible here** — the ledger or the queue
sharing a row with something a person can look at, which is `5c-iv`'s, `5d-iv`'s, `5e-iii`'s
and `5f-iii`'s argument and the strong one: **one row means the unseen half is reviewed as
though somebody had looked at it.** **(3) THE DEFERRAL TEST** already in this section.
⚠️ **A size-only split at `M` or `L` is now the thing to refuse**, and a session asking for
one is asking for the old rule back.

⚠️ **Changed in three files, because the rule lived in three:** `docs/PLAN.md`'s
`## Working agreement`, `CLAUDE.md`'s, and the working prompt in `docs/HANDBOOK.md` — which
is the one the owner actually pastes, and the only one of the three that was telling a
session to *"take only the first piece."*


---

## Appended 2026-09-25 — the twentieth cut, taken to PAY FORWARD rather than to fit

⚠️⚠️ **THE NINETEENTH CUT LEFT `## Position` AT 1,391 OF 1,400 — nine lines of room, which is
not room.** A ceiling cleared by nine lines blocks the next session's first status-log entry, and
that session then spends its opening minutes archiving instead of building. ⚠️ **So this one is
taken with nothing pressing**, which is the arrangement the fifteenth cut recorded as *the first
ever taken pre-emptively* and the one `plan-handover.sh` assertion 7 argues for in its own failure
text.

**What moved:** `5f-iii-a`'s reopening — the sheet that did not render, the owner's photograph,
and the three bar arrangements he asked to see. ⚠️ **A MOVE and never a copy**, unedited.

⚠️⚠️ **`5f-iii-a` WAS REOPENED AND FIXED THE SAME DAY — THE SHEET DID NOT RENDER, AND THE OWNER
FOUND IT ON HIS PHONE WITHIN THE HOUR. `5R-f` IS THE NEXT TASK, BECAUSE `5f-iii-b` IS NOW GATED.**
*"The cart/basket is not rendering properly, it is all churned at the bottom and I can't see the
controls nor the items properly."* ⚠️ **He also refused to judge it in that state — *"I wouldn't
want to answer anything related to that before looking at it well rendered"* — which is the right
call and is why this session stopped guessing.**

⚠️⚠️ **TWO BUGS, BOTH ARITHMETIC, AND NEITHER VISIBLE TO ANY CHECK IN THIS REPOSITORY.**
**(1) THE SHEET HAD NO BOUNDED HEIGHT.** The `KeyboardAvoidingView` wrapping the card carried no
style, so it was CONTENT-SIZED — which made the card's `maxHeight: '85%'` a percentage against a
parent with no definite height. **Yoga cannot resolve that and drops the constraint**; the
`FlatList` then had no bound either, rendered its whole content, and pushed `Vaciar` off the bottom
of the screen. ✅ The sizing now lives on the `KeyboardAvoidingView` (`flex: 1`) and the list is
`flexGrow: 0 / flexShrink: 1`, so a short basket still leaves a short sheet.
**(2) THE ROW PUT FOUR THINGS ON ONE LINE.** Measured at `Letra grande` on his 393 pt iPhone 15:
stepper 222 + line total 90 + removal 60 + gaps 36 + padding 32 = **440 pt before the product name
gets anything at all.** The name is `flex: 1`, so it collapsed to nothing and the row overflowed.
✅ Three lines now — name and total, family, then the stepper with `Quitar` — and the removal is a
WORD, because an icon plus its word does not fit beside the stepper at that density either.

⚠️⚠️ **AND THE REAL DELIVERABLE OF THIS SESSION IS THAT A SCREEN WAS LOOKED AT BY A MACHINE HERE
FOR THE FIRST TIME.** §2.11 bans rendering suites and `R9` routes every look-question to the
owner's phone — which is correct and is also why he found this rather than a check. ✅ **The app
was built for the iOS Simulator, signed in, driven onto Vender and photographed, WITHOUT touching
the hosted project and without weakening anything.** The chain, because it is reusable and every
link was a refusal handled rather than bypassed: the app's **https-only guard** (`src/lib/env.ts`)
correctly refuses a plain-`http` local Supabase, **so a local TLS terminator was put in front of it
and its certificate added to the simulator's keychain** rather than the guard being loosened;
sign-in was done by **minting a real session against the local stack and planting it in the app's
own `expo-sqlite` store** under supabase-js's `sb-127-auth-token`; and navigation used **C1.3's
`wera.lastScreen` key**, because `osascript` is not permitted to send keystrokes on this Mac and
`simctl` cannot tap. ⚠️ **The one thing that WAS instrumented is named rather than hidden**: the
sheet's `open` state was defaulted true for one build to photograph it, and reverted before commit.
⚠️⚠️ **This does not make rendering checkable and must not be read as that** — it makes a screen
*photographable by a session*, which is the difference between shipping a guess to his phone and
shipping something that was seen.

✅ **What the photograph settled that no assertion could:** the sheet renders, and **§2.5 rule 5
holds on a device** — `$135 + $10.50 + $64 = $209.50`, and `$209.50` is what the bar says.

⚠️⚠️ **ONE DECISION IS PARKED AND IT IS THE FIRST HE ASKED FOR RATHER THAN ONE A SESSION FOUND.**
*"Show me your proposals."* Three bar arrangements, each measured at `Letra grande` on 393 pt, with
**A recommended** — and the argument is arithmetic: in B the slide gets whatever is left after the
total, so **the gesture gets shorter as the sale gets bigger** (154 pt at `$12,345.60`, of which the
thumb eats 54), and in C the total is printed inside the track, so **the thumb crosses the one
number a customer is reading.** ⚠️ **It blocks `5f-iii-b` and the marker has moved to `5R-f`** —
`S`, ungated, waiting on nobody, and it guards the failure that cost this project a day on
2026-09-22.

⚠️ **Shipped:** the two layout fixes in `app/src/app/(tabs)/vender.tsx`. **1,020 assertions over 36
files unchanged** (the bugs were layout, which no suite here reads), typecheck clean,
`conventions-gate.sh` 16/16. **No migration.**


---

## Appended 2026-09-25 — the twenty-first cut, off the FOOT as `5g-ii-c` closed

⚠️ **`## Position` reached 1,440 of 1,400** with the owner's three-control round in it — the third
status-log entry of one working day, which is what a day of live feedback looks like. **The oldest
entry left in the block went out: `5f-iii-b`, the first sale this app ever wrote.** ⚠️ **A MOVE and
never a copy**, unedited.

⚠️⚠️ **AND THE FIRST ATTEMPT AT THIS CUT WAS DESTRUCTIVE, WHICH IS RECORDED HERE BECAUSE IT IS THE
ONLY COPY OF THE LESSON.** The mover looked for the NEXT entry head to bound the block; `5f-iii-b`
is the last entry in the region, so there was none, and it ran **297 lines** — past the end of the
status log, through the archive-bookkeeping section, and **out of `## Position` entirely, taking
`## Steps 0 through 4.5` and the `## READ FIRST — THE PLAN DISAGREES WITH ADR-035` gate with it.**
⚠️ **`plan-handover.sh` did not catch it and could not**: the plan was still readable, still had one
next task and one of each owed block — **a plan with two headings missing is not a plan that
contradicts itself.** ✅ **It was caught by the line arithmetic not adding up** — 297 lines removed
against 143 off `## Position`, which can only mean the cut left the section — **and reverted with
`git checkout` before anything was committed.**

✅ **THE MOVER NOW ASSERTS WHAT A SINGLE ENTRY IS, rather than inferring it**: the block may contain
no `##` heading, no `| **task** |` row, and must be between 40 and 120 lines. **A bound derived from
what comes next is a bound that fails at the end of the list**, which is the sister of the rule three
scripts here already record — *a check must bound the region it reads, not trust the next heading.*

✅✅✅ **`5f-iii-b` IS DONE AS OF 2026-09-24 — THIS APP HAS WRITTEN ITS FIRST SALE, AND `5f-iii`
IS CLOSED. `5R-f` IS THE NEXT TASK.** ⚠️⚠️ **`5c`'s FOUR CHILDREN HAVE A CALLER FOR THE FIRST
TIME.** The outbox, the flush, the dead-letter path and the banner have been built entirely
against fixtures since 2026-09-20; today a gesture put a row in the queue.

⚠️⚠️ **AND IT IS THE AMENDED WORKING AGREEMENT'S FIRST OUTING: AN `M` DONE IN ONE SITTING.**
Under the old rule the bar, the slide, the sheet's slide and the enqueue would have been two
or three rows. The ruling cleared the gate and the whole row shipped.

✅ **The owner's five rulings, each built as stated** — the bar is **Arrangement A**, the
slider **fills behind the thumb**, the count logic was confirmed rather than changed, the
emptying confirmation is a **centred box with its own scrim**, the sheet's height is **fixed**,
and the sheet has **its own shorter slide** beside `Vaciar carrito`. The full ruling is in the
decisions block above.

⚠️⚠️ **A GUARD REFUSED THE FIRST DESIGN OF THE WRITE, AND IT WAS RIGHT — THE SECOND TIME THAT
HAS HAPPENED TO `5f`.** `vender.tsx` called `enqueue(outboxDb())` itself; `app/test/auth-
errors.test.ts` went red naming the reason in its own comment — *"a third entry is the failure
§2.6 cannot survive: the outbox is the only write path, so a route that opened it for itself
would be a sale written by a file that never learned about `pending`, `flushing` or `dead`."*
✅ **So `@/lib/commitRunner` exists**, and the queue now has three modules which are three
verbs: `flushRunner` DRAINS it, `DeadLetterBanner` COUNTS it, `commitRunner` FILLS it. ⚠️ **The
property that assertion actually pins was never *two* — it is that none of them is a screen**,
and the guard's text now says so.

⚠️⚠️ **THE FILL IS A `translateX` AND NEVER A `width`, WHICH IS §2.11 HONOURED RATHER THAN
BENT.** The owner asked for the track to fill with the finger; a fill animated by growing its
width is a LAYOUT change every frame on the two low-end Androids C1.1 puts in the pilot. **A
full-width block slid in from the left under `overflow: hidden` is a transform, and transforms
composite — the picture is identical and the frame cost is not.** ⚠️ **What IS conceded and
named: the drag is JS-driven**, because a native-driven value cannot be `setValue`d from JS and
a `PanResponder` gesture has no native event to map. Only the release animations use the native
driver. **§2.11's rule is about which properties are animated, and both paths animate
`transform` only.**

⚠️ **AND THE SLIDE IS CORE REACT NATIVE, WHICH WAS A MEASUREMENT RATHER THAN A PREFERENCE.**
`react-native-gesture-handler` and `react-native-reanimated` are installed — and imported by
**nothing** in `src/`. Adding them means a babel plugin, a root view and a native surface this
app has never exercised, **on a build no CI compiles**. `PanResponder` and `Animated` cost a
JS-driven drag and no new wiring.

⚠️⚠️ **WHAT THE LOOK FOUND THAT NO SUITE COULD: THE SLIDE'S LABEL WAS CLIPPED ABOVE THE
TRACK.** A plain child of the track is a FLEX SIBLING of the thumb, so the two stacked in a
column instead of overlaying. **It was caught on the simulator before it reached his phone**,
which is what the harness built earlier today is for.

⚠️⚠️ **AND ONE THING IS FOUND AND NOT FIXED, BECAUSE IT IS `5h`'s TO FIX: AN UNPRICED LINE NOW
BLOCKS THE WHOLE SALE, AND C3.14 SAYS IT SHOULD NOT.** C3.13 blocks a PURCHASE on a missing
price and **C3.14 lets a SALE through loudly** — but `draftOf` refuses `line-cannot-be-priced`
for both, so `canCommit` is false and **the slide is simply absent**. ⚠️ **It was seen on the
simulator with `Servilletas` in the basket**: the bar says `Falta un precio`, and the commit
control is gone with nothing connecting the two. ⚠️ **It is not a regression** — `5f-i` has
refused that basket since it shipped, and nothing had a commit control to hide until today.
**`5h` owns C3.14 and its row is where this belongs**; naming it here is `R9`'s shape applied
to a rule rather than to a look.

⚠️⚠️ **VERIFIED, AND NOT BY A TICK.** `app/test/cart-commit.test.ts` — **16 new assertions,
1,036 over 37 files, up from 1,020** — and the one it exists for is `canCommit` agreeing with
`commitOf` on every refusal, **from both ends**: a disagreement there is a slide a thumb can
complete over a sale that silently does not happen, and nothing anywhere would go red.
`conventions-gate.sh` **16/16 over 67 source files** — ⚠️ **it fired once and was right**, on a
`maxWidth: 420` in the new dialog: a cap in points is a size `Letra grande` cannot change
(`R6`). **Four screens photographed on the simulator** before anything reached his phone.

⚠️ **Shipped:** `@/cart/commit` (the composition, and what `canCommit` answers), `@/lib/
commitRunner` (the effect, and the order), the slide, Arrangement A, the centred question and
the fixed-height sheet in `vender.tsx`, an `ES.sell.slide` block and `ES.sell.sold`. **No
migration.**


---

## Appended 2026-09-25 — the twenty-second cut, taken to PAY FORWARD

⚠️ **The twenty-first left `## Position` at 1,373 of 1,400 — twenty-seven lines, which is not room**
for the next session's first entry. **So `5f-iii`'s round of the owner's notes goes out too**, with
nothing pressing — the arrangement the fifteenth cut recorded as *the first ever taken pre-emptively.*
⚠️ **A MOVE and never a copy**, unedited.

⚠️⚠️ **AND THE GUARD ADDED BY THE TWENTY-FIRST CUT REFUSED THIS ONE'S FIRST ATTEMPT, WITHIN THE
MINUTE.** The mover again bounded the block by the next entry head — and `5f-iii`'s notes had BECOME
the last entry in the region when `5f-iii-b` left it — so it proposed **234 lines** and the new
size assertion stopped it cold. ✅ **That is the whole value of writing the guard into the mover
rather than into a comment**: the same defect, the same shape, one cut later, caught by a machine
instead of by arithmetic.

⚠️ **Four cuts on 2026-09-25.** Three status-log entries and three rulings landed in one day because
the owner was holding the phone and answering inside the hour — **the ceiling is sized for a slower
cadence than a live feedback day**, which is worth knowing rather than fixing: the corpus is still
one file to `grep` (`docs/checks/plan-corpus.sh`).

✅✅ **`5f-iii` TOOK A ROUND OF THE OWNER'S NOTES ON HIS OWN PHONE, 2026-09-24 — FIVE CHANGES,
AND ONE OF THEM OVERRULES AN ARGUMENT THIS FILE HAD WRITTEN DOWN AS SETTLED. `5R-f` IS STILL
THE NEXT TASK.** ⚠️ **It ships no migration.**

⚠️⚠️ **(1) THE SEARCH BOX WAS TOO LOW, AND THE SAFE AREA WAS BEING COUNTED TWICE.** *"The
search bar is too low and we have a lot of dead space above the product catalog."* The tab
navigator draws a header (`title: tab.label`) which already sits below the notch, and
`vender.tsx` then added `paddingTop: insets.top` on top of it. ✅ **Removed.** ⚠️ **What found
it was the comparison, not the screenshot**: `productos.tsx` never had that padding, which is
why only this screen had the gap — and the same defect would be invisible on any screen the
navigator did not put a header on.

⚠️⚠️ **(2) A TAP ON THE TRACK OPENS THE BASKET** — *"Let's make the carrito able to open by
tapping the slider as well."* ⚠️⚠️ **THE FIRST DESIGN OF IT WAS WRONG AND IS RECORDED RATHER
THAN QUIETLY REPLACED**: it wrapped the track in a `Pressable` and spread `panHandlers` onto
it. **`Pressable` installs its own responder handlers on the underlying view**, so the two
fight over one touch and which one wins is not something the file gets to decide. ✅ **One
responder, two readings**: the pan claims the touch, and a release whose `dx` is within
`TAP_SLOP` is a tap. ⚠️ **`app/test/cart-commit.test.ts` pins that one release can never be
read as BOTH**, which is what keeps the ordering in the handler a belt rather than the only
brace.

⚠️⚠️ **(3) THE LEGEND IS `Cobrar` IN BOTH TRACKS, AND THE ARGUMENT AGAINST IT IS MOOT RATHER
THAN OVERRULED.** `ES.sell.slide` said *Desliza para cobrar* / *Desliza* because **a verb alone
reads as a button, and a button is what C3.6 refused** — a thumb that brushes one has committed
a sale. ✅ **In the same message he made the track tappable**, so the control is now honestly
both and the word no longer has to carry the instruction. ⚠️ **What still stops a brush
committing a sale is `COMMIT_AT`, not the wording**, and that has not changed.

⚠️⚠️ **(4) `Vaciar carrito` IS ON THE CLOSED BAR TOO, WITH THE SAME QUESTION** — *"Include
Vaciar carrito in the closed Carrito as well, with the confirmation message also displaying
when tapped there."* ✅ **The bar's second row is now the sheet's foot**: the same two controls
in the same order, so the thumb that learns one has learned the other. ⚠️⚠️ **THE STATE MOVED
UP TO THE SCREEN RATHER THAN BEING COPIED** — `asking`, `emptied` and the animation's value all
live in `Vender`, and one `Confirmacion` is rendered inside the sheet's `Modal` when the basket
is open and over the screen when it is not, made mutually exclusive by `cartOpen`. **Two copies
would be two questions that drift apart**, which is the defect this repository has recorded six
of. ⚠️ **The alternative was a second `Modal` over the first**, and nested modals on iOS animate
against each other. ⚠️ `Vaciar carrito` is drawn **even when the sale cannot be committed** — a
basket with an unpriced line still has to be emptiable, and that is the case where a shopkeeper
is most likely to want to.

⚠️⚠️ **(5) THE SCRIM CLOSES THE SHEET, AND THIS ONE IS A REVERSAL OF A DECISION TAKEN ON HIS
BEHALF.** *"Make the Carrito close if the user taps in the scrim outside the carrito, not only
in the Cerrar button."* **`5f-iii-a` made the velo deliberately inert** and wrote down why: a
thumb reaching past the sheet for a row it can still see would dismiss it. ✅ **He has the app
in his hand and took the trade** — tap-outside is what a sheet does, and `Cerrar` is still
there. ⚠️ **The refusal is struck in the file rather than deleted**, because the reasoning is
still the reason to think twice on the next sheet.

⚠️ **Verified:** `app/test/cart-commit.test.ts` **+2 assertions, 1,038 over 37 files**;
typecheck clean; `conventions-gate.sh` **16/16 over 68 source files**. **Photographed on the
simulator before it reached his phone**, which is how (1), (3) and (4) were confirmed and how
the `Pressable` mistake in (2) was caught by reading rather than by him finding it.


---

## Appended 2026-09-25 — the twenty-third cut, off the FOOT as `5g-ii-b` closed

⚠️ **`## Position` reached 1,468 of 1,400** with the fourth status-log entry of one working day in it.
**`5R-f` went out** — the schema-deploy guard, the row that first taught this repository to ask the
hosted database what it is carrying. ⚠️ **A MOVE and never a copy**, unedited.

⚠️⚠️ **THE GUARD ADDED BY THE TWENTY-FIRST CUT REFUSED THIS ONE'S FIRST ATTEMPT TOO — THE THIRD TIME
IN ONE DAY, AND ALWAYS THE SAME SHAPE.** The mover keeps reaching for *"the next entry head"* as a
bound, and the entry being cut keeps being the LAST one in the region, so the proposal runs into the
archive-bookkeeping section: **297 lines, then 234, then 270**, each one refused. ✅ **Each time the fix
was to name the entry's real last line.** ⚠️ **The lesson is not that the mover is wrong — it is that a
bound derived from what comes AFTER cannot work at the end of a list, and three refusals in a day is
the guard earning its place three times over.**

⚠️ **Five cuts on 2026-09-25.** Four status-log entries and four rulings in one day, because the owner
was holding the phone and answering inside the hour. **The 1,400 ceiling is sized for one entry per
session**; the honest response is to cut more often rather than raise it, because the ceiling is what
keeps `## Position` readable by a cleared session.

✅✅✅ **`5R-f` IS DONE AS OF 2026-09-24 — THIS REPOSITORY CAN NOW ASK THE HOSTED DATABASE
WHETHER IT IS CARRYING THE SCHEMA, AND `5R-g` IS THE NEXT TASK.** ⚠️ **It ships no migration**
and it is in **no workflow**, which was the first thing the row said to decide.

⚠️⚠️ **THE ESTIMATE, WRITTEN BEFORE THE WORK AND WHAT IT FOUND.** Sized `S` on the row and
`S` is right — one sitting, two files and a paragraph. **Four measurements changed the shape
of it, and every one was cheaper to take than to reason about:**

**(1) `supabase migration list --linked` works from this machine with NO PASSWORD AND NO
SERVICE KEY**, exactly as the row hoped, **and it emits JSON on a non-TTY** — so the guard
parses a payload instead of scraping a table. ⚠️ **The pooler URL's password still does not
work and nothing here needs it.**

**(2) THE HOSTED PROJECT IS CURRENTLY IN SYNC — ALL 36 MIGRATIONS APPLIED.** ⚠️⚠️ **That is
the finding that decided how this task was built.** A guard whose real answer is green today
and green every time anybody runs it has never been tested by running it. **So the harness is
not an extra here, it is the only evidence the thing works**, and it is the larger half of the
diff.

**(3) THE PLAN SAYS "THIRTY-EIGHT MIGRATIONS" AND THERE ARE 36 FILES.** Numbering reaches
`0038` and `0006`/`0007` have never existed. **Not a defect and nothing is corrected** — but a
check that trusted the high number instead of counting files would report a phantom
divergence forever, so it counts files.

**(4) ⚠️⚠️ THE PROJECT REF LIVES ONLY IN `supabase/.temp/`, WHICH IS GITIGNORED.** So until
this task, **nothing committed to this repository said which database the schema belongs to** —
the ref appears in this plan and in a status archive, and nowhere a tool would look. **A check
that did not pin it would pass vacuously against whatever project a laptop happened to be
linked to**, which is the same shape as running an isolation test as `postgres`: green, and
about nothing. ✅ `supabase/README.md` now names it, and assertion 2 compares the two.

⚠️⚠️ **THE DECISION THE ROW SAID TO MAKE FIRST — LOCAL CHECK, NOT A REPOSITORY SECRET — AND
IT WAS TAKEN ON THE OWNER'S BEHALF, SO IT IS NAMED HERE AND IN THE PR BODY.** Two reasons,
and the second is this repository's own history rather than a general principle:

**(a) A Supabase access token is ACCOUNT-WIDE; there is no project-scoped one.** A repository
secret would hand every workflow run the owner's whole Supabase account in order to guard
against a forgotten `db push` — **a blast radius far larger than the thing being guarded.**

**(b) ⚠️⚠️ THIS CHECK'S ANSWER DEPENDS ON THE WORLD, NOT ON THE DIFF.** Once a migration
merges it is red **until a person deploys** — so in CI it would redden pull requests that
neither caused it nor can fix it. **`5R-g`'s row already records what that does**: a red that
is not yours is how people learn to stop reading the result, and *read the job log by name* is
the one habit the automated-merge agreement rests on. ⚠️ **If the owner would rather have it
in CI, that is one sentence and a secret** — the guard itself needs no change.

⚠️⚠️ **AND THE HARNESS EARNED ITS KEEP INSIDE THE HOUR — IT FOUND A REAL BUG IN THE GUARD,
AND THE EXIT CODE HAD HIDDEN IT.** The normalised rows were tab-delimited, **a tab is IFS
whitespace, and bash collapses a run of IFS whitespace into one delimiter** — so a
remote-only row, whose middle field is empty, arrived as two fields and was read as an
*undeployed* migration instead of a *hand-run* one. ⚠️ **Both are red, so `D2` passed on exit
code and failed on REASON**, which is the only assertion that could have caught it. ✅ The
delimiter is `|`. ⚠️ **This is the same family as [[bash-cannot-hold-a-nul-sentinel]]: the
error named the wrong column.**

⚠️ **`D8` is the fixture that justifies an assertion rather than testing one.** It hands back
a listing that is **internally consistent** — every row it mentions is applied — while
silently omitting a migration that is on disk. Groups 5 and 6 walk the CLI's rows, so **both
pass while looking at almost nothing**; only the group that walks the DISK catches it.
**Delete assertion 4 and that fixture goes green.**

⚠️ **Verified, and named rather than ticked:** `5R-f-schema-deployed.sh` **6/6 against the
real hosted project** (`hweutzjhzvioswnjzqki`, 36 rows), and
`5R-f-schema-deployed-falsify.sh` **10/10** — the guard goes red on a remote that is behind,
a remote that is ahead, a partial listing, a failed command, a wrong link, an unlinked copy,
an undocumented target and unparseable output. ⚠️ **The stub is on PATH and the guard has no
env var or flag that reads a file instead of the network**, so the harness leaves no backdoor
in the thing it tests.

⚠️ **What it does NOT do, said plainly: it compares VERSION NUMBERS, not schema.** A migration
edited after it was applied would list as present on both sides. **Migrations are append-only
once applied**, so that is the rule holding it rather than this check — and `supabase db push`
would not re-apply it either.


---

## Appended 2026-09-25 — the twenty-fourth cut, taken to PAY FORWARD

⚠️ **The twenty-third left `## Position` at 1,395 of 1,400 — five lines**, which is not headroom, it is
a rounding error. **`5R-g` goes out with its measurement paragraph** — `db.yml`'s biggest job split in
two, and the cap turned back into a number somebody had measured. ⚠️ **A MOVE and never a copy**,
unedited.

⚠️ **Six cuts on 2026-09-25**, and the pattern across them is worth one line: **every forced cut this
day was followed by a pre-emptive one**, because clearing a ceiling by single digits hands the next
session a red on its opening move for a ceiling it had no part in spending. That argument is written
out in full in the fifteenth cut above and it held four more times today.

✅✅✅ **`5R-g` IS DONE AS OF 2026-09-24 — `db.yml`'s BIGGEST JOB IS SPLIT, THE STOPGAP CAP IS
GONE, AND THE WHOLE WORKFLOW NOW FINISHES IN ABOUT TEN MINUTES INSTEAD OF NEARLY SIXTEEN.
`5g` IS THE NEXT TASK: COMPRAR.** ⚠️ **It ships no migration and touches no app code.**

⚠️⚠️ **THE OWNER RULED ON `5R-f`'s OPEN QUESTION THE SAME DAY — *"keep it local"* — AND ON
THE ORDER WITH IT: *"take 5R-g next."*** **Both confirmed what was already built and marked**,
so nothing changed; it is recorded because a confirmation is evidence and the next session
should not re-litigate either.

⚠️⚠️ **THE ESTIMATE, WRITTEN BEFORE THE WORK. Sized `S` and `S` is right** — one workflow
file. **Four measurements, and the first one is why this was not guesswork:**

**(1) THE JOB WAS MEASURED STEP BY STEP RATHER THAN ESTIMATED** (run `36050875005`): **941s
total, 15m41s.** Setup 171s · the seed and schema block **322s** · node and the two-connection
suite 28s · `Stop` 23s · **and the contract block 397s (6m37s)**. ⚠️ **That is what made the
cap meaningless**: the job was doing 15m41s of work against a 15-minute cap, so whether it
passed depended on runner weather.

**(2) ⚠️⚠️ THE SPLIT DOES NOT COST WALL-CLOCK, IT SAVES IT — AND THE ROW UNDERSTATED ITS OWN
CASE.** The row argued the move was *free* because jobs run in parallel. **It is better than
free: the two halves come out near-equal** — `reset` ~544s (9m04s) and `api-contracts` ~590s
(9m50s) — so `db` finishes in about **ten minutes instead of nearly sixteen**. **A split is
usually neutral; this one is a speed-up because the block that moved was almost half the job.**

**(3) THE ROW SAYS "ELEVEN CONTRACT CHECKS" AND THERE ARE THIRTEEN.** Counted, not assumed:
twenty-six steps, thirteen checks and thirteen harnesses. ⚠️ **Nothing is corrected upstream
and nothing depended on the number** — but it is the SECOND count in two sittings that the
plan carried slightly wrong (`5R-f` found "thirty-eight migrations" against 36 files), and
**two is a pattern rather than a slip: a number written in prose is not re-counted when the
thing it counts grows.**

**(4) ⚠️⚠️ THE CONTRACT BLOCK NEEDS NO NODE AND NO `npm ci`, WHICH WAS MEASURED RATHER THAN
ASSUMED.** Every one of the thirteen is bash driving live HTTP. **Two of the scripts mention
`node` — and both mentions are in a COMMENT** explaining why they cannot use it
(`@/lib/outboxDb` imports a native module). ✅ **So `setup-node` and `npm ci` stayed behind in
`reset`, where the two-connection Vitest suite genuinely needs them.** ⚠️ **A copy-paste of
the job would have carried them across and nothing would ever have gone red** — 22s a run,
for ever, for nothing.

✅ **THE CAP IS 15 AGAIN ON BOTH JOBS, AND THE NUMBER IS NOW A MEASUREMENT.** ~9m04s and
~9m50s against 15 is about **1.65x and 1.5x headroom, where the cancelled runs had 1.0x**.
⚠️ **A cap still catches a HANG, which is what a cap is for; it no longer catches a job doing
its work.**

⚠️⚠️ **VERIFIED LOCALLY IN THE NEW JOB'S EXACT SHAPE BEFORE IT WAS PUSHED, BECAUSE THE REAL
RISK WAS INVISIBLE IN THE DIFF.** A contract check that quietly depended on state the seed
steps left behind would have split green and failed later, or worse, passed for the wrong
reason. **So the shape was reproduced on this machine** — `supabase start` with the reduced
service list, `db reset`, then the thirteen checks with nothing in between — **and all
thirteen passed**, followed by the thirteen harnesses. ⚠️ **The exclusion list is
`catalog-write`'s and is unchanged**: these checks sign people up through GoTrue and post rows
through PostgREST, both via Kong, and every excluded container is one none of them touches.

⚠️ **THE STEP MULTISET WAS DIFFED BEFORE AND AFTER**, which is the check that no contract step
was lost or silently duplicated by a 353-line move: **every `Contract —` step count is
identical**, and the only differences are the five setup steps the new job legitimately adds
(checkout, CLI, start, reset, `Stop`).

✅✅ **MEASURED AFTER THE SPLIT, AND THE PREDICTION WAS RIGHT ON ONE HALF AND PESSIMISTIC ON
THE OTHER.** Predicted ~9m04s and ~9m50s; **actual `reset` 9.5m and `api-contracts` 7.2m.**
⚠️ **The new job came in 2.6 minutes under** because the reduced service list starts faster
than `reset`'s full `supabase start` — a saving the estimate did not think to claim.
⚠️⚠️ **THE WORKFLOW'S WALL-CLOCK IS NOW SET BY `auth-session` AT 10.4m, NOT BY `reset`**, so
`db` finishes in about **ten and a half minutes against nearly sixteen** — and the next
minute saved is in a job this task did not touch. ✅ **Both split halves sit at 1.6x and 2.1x
headroom against their 15-minute cap**, which is the property that was missing.

⚠️⚠️ **AND CI CAUGHT THE ONE THING THIS SESSION DID NOT — THE HANDBOOK'S NEXT-WORK MARKER,
SPELLED WITH THE FULL STOP INSIDE THE BOLD RUN.** `handbook-agreement.sh` was GREEN, because
it greps the sentence; `handbook-agreement-falsify.sh` went red on **four fixtures at once**,
every one reporting *"anchor not present in the 5g row"*. ⚠️⚠️ **THE SAME DEFECT, FROM THE
SAME CAUSE, HAPPENED ON 2026-09-23 IN `5e-ii` — AND THE HARNESS ITSELF CARRIES THE PARAGRAPH
SAYING SO.** ⚠️ **A harness that cannot find the row it is supposed to break reads exactly
like a guard that has lost its teeth**, which is why it is red rather than quiet. ✅ **Nothing
was loosened**: the handbook sentence was reworded so the period sits outside the bold, which
is what that paragraph says to do and is the cheaper half of *never spell a check's sentinel
differently in the file it reads*. ⚠️ **The lesson is the one already written down and not
followed here — run the FALSIFIER after editing what it reads, not just the guard.**

⚠️ **TWO COMMENTS ELSEWHERE IN THE FILE WENT STALE AND WERE AMENDED RATHER THAN REWRITTEN.**
`auth-session`'s header and `catalog-write`'s both argue *do not bolt this onto `reset`* and
cite its 12-13 minute runtime. ⚠️⚠️ **That paragraph made this task's case twice before
anybody acted on it**, so the reasoning is kept verbatim and dated instead of being restated
in the past tense.


---

## Seventh cut — appended 2026-09-25, as `5g-iii` closed

⚠️⚠️ **TWO ENTRIES OF THIS DAY WERE STILL IN THE LIVE PLAN AFTER SIX CUTS, AND
NOBODY HAD NOTICED.** `5g.5` and `5g-i` both closed on 2026-09-24 and both were left
behind by every cut taken that day — legitimately, because each cut took what it
needed and stopped, but the effect was a day that read as closed while 182 of its
lines were still in `## Position`. ⚠️ **It was found the way `5g-ii` found the
`CLAUDE.md` table's two missing rows: by listing the region and comparing, rather
than by any check.** `grep -c '2026-09-24' docs/PLAN.md` is the four-second version,
and this is the second time that exact remedy has been the answer.

⚠️ **This is an APPEND and not a second file**, which is the rule
`status-log-2026-09-22.md` established and this file has now obeyed seven times.

---


✅✅ **`5g.5` IS DONE AS OF 2026-09-24 — `0039` IS APPLIED, EVERY SHOP'S CATCH-ALL PROVIDER IS
CALLED `Genérico`, AND BOTH OF THE DAY'S PARKED QUESTIONS ARE RULED. `5g-ii` IS STILL THE NEXT
TASK.** One migration, **18 behavioural checks**, and two rulings recorded — **both of which
reversed the recommendation.**

⚠️⚠️ **THE RULING THAT SHIPPED CODE: *"Genérico is fine, that means we don't have a Provider for
that purchase so we buy it from a generic provider."*** **The brief argued for `Compra directa`
because it names WHAT SHE DID. That was true and beside the point** — the row is not a
description of an act, it is the **ABSENCE of a counterparty** made into something the ledger can
point at, and his own next sentence is the case that proves it: *"a way to allow the user to make
purchases from a non-recurrent provider if he wants."* ⚠️ **`0039` does BOTH halves**: the seed
inside `onboard_workspace`, and an `update` over rows that already exist — **the half that could
only get dearer**, because a seed changed alone leaves every shop created before today pointing
its deliveries at a word the header no longer says and nothing anywhere would disagree.
⚠️⚠️ **TWO DECISIONS IN THE MIGRATION AND BOTH ARE ABOUT NOT TAKING A DEPLOYMENT DOWN.** It is
scoped by **`is_generic` and not by the old name**, so a shop that had renamed its own row is
brought into line too; and it **skips any workspace where a NAMED supplier already holds the
word**, because `provider_name_unique` is `(workspace_id, normalized_name)` over a generated
column and would raise — **and a migration that fails on one tenant's data stops the deployment
for everybody.** Those shops are listed by a `notice` rather than guessed a second name for.

⚠️⚠️ **AND `5g.split` PREDICTED THIS ROW IN WRITING, WHICH IS THE CHEAPEST EVIDENCE A GUARD'S
DESIGN HAS EVER GIVEN ON THIS PROJECT.** That spec asserts *it ships no migration* of all three
children **positively**, and said why: *"it is the thing the `Genérico` ruling would change,
which is exactly why that question is parked in front of this split rather than inside it."* **So
the rename could not quietly become a deliverable of `5g-ii`** — it had to be its own row, and
`5g.5` is that row.

⚠️ **THE OTHER RULING SHIPPED NO CODE AND RE-SIZED A ROW: `Costos` IS `S` → `L`.** *"A small line
chart with the time and the price that each provider (colors) is charging you… as a collapsable
you can get the matrix… you can share the 'view' as a PDF."* ⚠️⚠️ **It is NONE of the three
options as posed** — it takes the one the brief recommended **deferring** and folds the one it
recommended **splitting out** into it, as one picture, then adds a matrix and an export nobody
had named. ⚠️ **The PDF has no precedent in this app**, so §2.11's stack table gains a row naming
whatever library does it, **as a deliverable of `5g-iii`** rather than a task of its own.

⚠️⚠️ **VERIFIED, AND NOT BY A TICK.** `supabase/tests/0039_generic_provider_name.sql` reports
**18 checks**, seven of them a transcription guard over what did NOT move — including *the owner
still arrives NAMED*, which is the rule `0036` wrote down after shipping its opposite. ⚠️ **Two
of its own checks were RED on the first run and both were the test's fault rather than the
migration's**: one asserted *every* generic provider carries the word and contradicted its
neighbour, which proves the shop the migration deliberately skips; **a check that contradicts its
neighbour has not decided what it is asserting.** `5g-i`'s contract check is green with assertion
3 now pinning `Genérico`, and its falsifier's eleven fixtures all still behave — **the assertion
was KEPT rather than retired with the question**, because it is the only thing in this repository
that reads the word a shopkeeper sees.


✅✅✅ **`5g-i` IS DONE AS OF 2026-09-24 — THIS APP HAS RECORDED ITS FIRST DELIVERY, AND
A GUARD REFUSED THE FIRST DESIGN OF ITS OWN CHECK. `5g-ii` IS THE NEXT TASK: COMPRAR
ITSELF.** 33 new assertions (**1,082 over 38 files**, up from 1,049), a new contract check of
**10 assertion groups over real HTTP** with **eleven falsification fixtures**, and **no
migration**, as the row promised.

⚠️⚠️ **THE FINDING, AND IT IS A DISAGREEMENT WITH ADR-035 IN SHIPPED CODE: `quoted` READ
`prices_include_tax` ON BOTH SIDES OF THE COUNTER, AND §2.5 RULE 2 SCOPES IT TO THE SALE IN
ITS OWN PARENTHESIS** — *"`prices_include_tax` is a workspace flag, so the earlier wording
read as though it governed deliveries too; it does not."* ⚠️ **`0018`'s header is binding on
the same point and has been since 2026-08-26**: *"a shelf price is agreed gross and a supplier
invoice is quoted net"*, and the payload key it reads is `unit_price_net_per_base` — **the
INVOICE net**. ⚠️⚠️ **WHAT IT COST, AND IT IS NOT WHAT IT LOOKED LIKE: THE FLAG IS TRUE BY
`0001`'s DEFAULT AND TRUE IN EVERY SHOP THAT EXISTS, SO THE BUY SIDE COULD NEVER BE PRICED AT
ALL.** `5f-i` recorded that as *"the buy side is priceless until `5g` hands a figure in"* —
**the figure was never the missing half.** ✅ A purchase quote is now sent verbatim, and the
two assertions that pinned the old reading were REWRITTEN rather than deleted, with the
parenthesis quoted above them.

⚠️⚠️ **AND THE FALSIFIER FOUND TWO HOLES IN THIS SESSION'S OWN CHECK, WHICH IS THE WHOLE
REASON RULE 4 EXISTS.** ⚠️ **(1) `P6` walked straight past the banned-column assertion**,
because the first version compared the response to the columns the app had ASKED for — so a
contract that asked for `phone` was consistent with itself and green. **It was measuring the
wrong thing**: the question is not whether the read got what it wanted, it is whether a column
Comprar never draws reached a phone. It now carries a named BANNED list and reads it off the
wire, which is `5d-i`'s `enforce_stock` assertion one table over. ⚠️⚠️ **(2) `P9` was GREEN on
a widened fence, and the reason is worth keeping: `provider_price_memory` JOINS `purchase_line`
to `purchase` and the view is `security_invoker`, so BOTH tables apply their own policy.**
Widening one leaves the join empty and the fixture proves nothing while looking like it proved
something. **The memory is fenced twice, and that is now measured rather than assumed.**

⚠️⚠️ **THE CASHIER ASYMMETRY IS NOW A STANDING CHECK RATHER THAN A PARAGRAPH.** Driven against
a reset database with a publishable key: she reads **2** providers, **0** rows of the memory
(**200 and an empty array, never a 403**), **records a delivery that SUCCEEDS**, and reads
**0** purchases back. ⚠️ **`memoryState` is this app's answer**: it takes what the caller
already knows — *may this person read a purchase at all* — and names which of the two states
this is, rather than guessing from `length === 0`. **None of its four values is a Spanish
sentence** (`R4`), because what a cashier is TOLD is a screen decision the owner has not been
asked for, and `5g-ii` is the row that asks.

⚠️ **THREE DECISIONS TAKEN ON THE OWNER'S BEHALF, ALL CHEAP TO REVERSE AND ALL NAMED HERE.**
⚠️ **(1) The generic provider is kept in the picker even when `is_active` is false** —
`provider_protect_generic` refuses a DELETE and a DEMOTION and stops there, so one editable
boolean would otherwise leave a shop with no default and `record_purchase` refusing every
delivery. ⚠️ **(2) Changing the provider clears the typed prices and KEEPS the lines**, which
is C3.11 read exactly — what arrived is what arrived, whoever it came from. ⚠️ **(3)
`CART_KEY` moved to `v2`**, which is the store's own rule obeyed rather than a version bump: a
`v1` blob restored into the new shape leaves `typed` undefined and every reducer throws on the
first tap. **A shape change strands the old basket.** ⚠️ **The cost is a basket half-rung when
this ships, and that is seconds.**

⚠️⚠️ **VERIFIED, AND NOT BY A TICK.** `docs/checks/5g-i-purchase-contract.sh` reports **10
assertion groups over real HTTP**, including *record_purchase accepts the payload draftOf
builds*, *the invoice net is stored verbatim and the quantity re-derives to 3000 g*, *the
memory offers it back as a JSON STRING*, *two providers, one variant, two prices — and neither
read sees the other's*, and *a cashier reads 2 providers, 0 memories, WRITES a delivery, reads
0 back*. Its falsifier runs **eleven fixtures — a green control, seven mutated contracts and
three that move applied SQL and put it back** — and every one is red for the reason it is named
for. `conventions-gate.sh` passes **16 groups over 69 source and 38 test files** and its
falsifier **30 fixtures**. The suite is **1,082 assertions**, the typecheck is clean, and
`5d-i`'s own check is still green on the shared module. ⚠️ **`db.yml` now watches both new
files**, because a check edited to loosen an assertion must re-run itself.

⚠️ **WHAT IT DOES NOT PROVE, SAID RATHER THAN IMPLIED:** nothing here has been looked at. There
is no screen, `§2.11` fences every judgement about one out of this repository, and **the row
that draws `Comprando a:` is `5g-ii`.**


⚠️⚠️ **`5g` WAS SIZED ON 2026-09-24, THE DAY IT WAS TAKEN AND BEFORE A LINE OF IT WAS
WRITTEN, AND IT SPLIT THREE WAYS. `5g-i` IS THE NEXT TASK: EVERYTHING COMPRAR NEEDS FROM
POSTGRES, WITH NO SCREEN ON IT.** The row said `M`; it is an `XL`. **This entry is a sizing,
three findings the row did not carry, one measurement taken against a live database, two
questions parked and the seventeenth split spec.**

⚠️⚠️ **THE SIZE IS THE WEAKEST OF THE THREE REASONS IT SPLIT, AND IT IS NAMED LAST ON PURPOSE.**
The working agreement was amended by the owner the same day — an `M` or an `L` is one sitting —
so a session reaching for a size argument at `M` is asking for the old rule back. **All three of
the agreement's surviving reasons apply here independently**, and the strong one is reason 2.

⚠️⚠️ **REASON 2, AND IT WAS MEASURED RATHER THAN ARGUED: A CASHIER'S COMPRAR IS BROKEN AND
LOOKS EXACTLY LIKE A WORKING ONE.** `provider_select` admits any member (`0002:522`);
`provider_price_memory` is manager-and-above, inherited through `security_invoker` from
`purchase` and `purchase_line`; and **`record_purchase` fences neither** — it is `security
definer` carrying §2.6's location wall and no role check at all. Driven against a reset database
on 2026-09-24 with a publishable key: **she reads the provider list (200, one row), reads ZERO
rows of the memory (200 and an empty array, NEVER a 403), records a delivery that SUCCEEDS
(200), and then reads ZERO purchases back.** ⚠️⚠️ **Every symptom of the broken case is a
DESIGNED state of the working one** — §2.8's *new pairing: empty and required* is what an empty
memory renders as, and it is the correct rendering when the pairing really is new. **Nothing on
that screen can tell the two apart, and the screen is not the instrument for either.**

⚠️ **REASON 1 IS THE GATE:** `5g-iii` is blocked on a word the owner owes and the other two are
not — the `5f-i`/`5f-ii` arrangement, one split later. ⚠️ **Reason 3 is size, and it is real
too**: Comprar is Vender plus a provider in the header, an editable price per line, three price
states that must look different and a commit that BLOCKS. `vender.tsx` is **1,792 lines** and
took four sessions.

⚠️⚠️ **THREE THINGS WERE NOT IN THE ROW, AND ALL THREE CHANGE WHAT GETS BUILT.**

| | The finding | Why it changes the work |
|---|---|---|
| **1** | **THE PURCHASE PAYLOAD HAS NO PROVIDER IN IT** | `draftOf` builds `location_id` and `lines`; `record_purchase` raises `22023` — *"a delivery has a counterparty"* — without one (`0018:200`). **The buy side of a module that already SHIPPED cannot commit at all**, so this is a change to live code and not a new screen's problem |
| **2** | **A TYPED PURCHASE PRICE HAS NOWHERE TO LIVE** | C3.13 makes the price something a person ENTERS, and `Quotes` is the map `5f-i` built for it and left empty. §2.11 persists the basket because a phone rings mid-sale — **and a delivery note's figures are worse to re-key than a basket, because she has to find the note again** |
| **3** | **THE PREFILL IS STORED PER BASE AND READ PER PRICE UNIT** | `unit_price_net_per_base` is a `numeric(14,6)` per base; she reads `$8.50 / kg`. And `last_qty_display_unit` is the denomination she typed **last time**, which need not be the variant's `price_unit_code` today. That is arithmetic, and none of it is in `app/` |

⚠️⚠️ **AND ONE DISAGREEMENT WITH A MIGRATION CI HAS APPLIED, WHICH IS A FIRST FOR THE DECISIONS
BLOCK.** F6 requires a provider named **`Genérico`** in every workspace. `onboard_workspace` has
seeded one since `0002` on 2026-08-26 — carried through `0027` and `0034` untouched — **and it
is named `Compra directa`.** ⚠️ **F6's SUBSTANCE is satisfied and no child owns it**: what F6
really requires is that the ROW exist, because `purchase.provider_id` is `not null`. **What is in
dispute is a string she reads in `Comprando a:` on every delivery**, and it is free to choose
today and a fix-forward migration plus an `update` over live rows tomorrow. **Parked, with a
recommendation: keep `Compra directa`, because `Genérico` names the row and `Compra directa`
names what she did.**

⚠️ **ONE MORE MEASUREMENT, RECORDED SO IT IS NOT RE-DISCOVERED:** `unit_price_net_per_base`
comes off the wire as a **JSON number** (`0.018000`), which is a double, and `parseDecimal`
refuses a number argument outright — so the read must cast `::text`, exactly as `PRICE_COLUMNS`
already does one table over.

⚠️ **VERIFIED, AND NOT BY A TICK.** `docs/checks/split-coverage.sh` on the new spec reports
**18/18 deliverables landing in exactly one child, the assigned one**, eleven required sentences
surviving and every child carrying *it ships no migration*; `--all` is green over all seventeen
specs; `plan-handover.sh` passes eleven groups with **two** open decisions, including *the next
task is not blocked by any open decision*; `handbook-agreement.sh` agrees on `5g-i` and on two
being owed. **No app code changed in the sizing itself, so no suite could have.**








