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
