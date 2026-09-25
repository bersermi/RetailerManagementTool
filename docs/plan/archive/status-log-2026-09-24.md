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
