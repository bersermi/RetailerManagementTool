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
