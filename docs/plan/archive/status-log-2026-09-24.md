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
