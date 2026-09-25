# Status log — the 2026-09-25 working day, first cut

⚠️⚠️ **ARCHIVED 2026-09-25 FROM `docs/PLAN.md`'s `## Position`, WHICH STOOD AT 1,357
LINES AGAINST ITS 1,400 CEILING WITH NOTHING WRITTEN YET** — `plan-handover.sh`
assertion 7, and the remedy is the one that check names in its own failure. Every
line below is **MOVED, not copied**: two homes for one claim is the defect this
repository has recorded six of, and `split-coverage.sh` fails on *"row appears 2
times"* because it reads the corpus, which includes this file.

⚠️⚠️ **THIS IS THE THIRD FILE EVER OPENED FOR A DAY THAT WAS STILL RUNNING, AND THE
REASON IS THE ONE `status-log-2026-09-22.md` AND `status-log-2026-09-24.md` BOTH
GIVE: THERE IS NO OLDER DAY LEFT TO TAKE.** ⚠️ **A LATER SESSION APPENDS TO THIS FILE
RATHER THAN MAKING A SECOND ONE FOR THE SAME DATE** — one working day per file, and a
`status-log-2026-09-25b.md` would break it. ⚠️ **And it is never renamed to absorb a
later cut**: the plan's own history names these files, and renaming for tidiness
makes a recorded statement false.

⚠️⚠️ **IT WAS TAKEN PRE-EMPTIVELY, AS THE 2026-09-24 FILE WAS, AND FOR A SHARPER
VERSION OF THE SAME REASON: 43 LINES OF HEADROOM IS ENOUGH TO PASS AND NOT ENOUGH FOR
ONE ENTRY.** `5g-iii` closed with a `L`-sized entry to write; taking the cut first is
the difference between archiving deliberately and archiving because a guard went red
with the work already done. ⚠️ **Thirteen of the seventeen cuts have now been taken by
a session that wanted to be writing something else**, which is the argument assertion
7 makes in its own failure text.

⚠️⚠️ **AND 2026-09-25 IS THE BUSIEST DAY THIS PROJECT HAS HAD.** Four status-log
entries, four owner rulings — the twenty-third through the twenty-sixth — a migration
that widened a cost fence for the first time in this schema, and the day `Comprar`
shipped. **All four entries below are from it.**

⚠️ **To search the whole plan, live and archived, in one command:**

```
grep -n '<task-id>' "$(bash docs/checks/plan-corpus.sh)"
```

---


✅✅✅ **`5g-ii-b` IS DONE AS OF 2026-09-25 — `0040` IS APPLIED, AND IT IS THE FIRST MIGRATION IN THIS
SCHEMA EVER TO WIDEN A COST FENCE. `5g-iii` IS STILL THE NEXT TASK.** Two `alter policy` statements,
**24 new behavioural checks**, **seven assertions in six existing files inverted**, and an ADR
amendment — all off one letter of instruction.

⚠️⚠️ **THE SIZING WAS RIGHT ABOUT WHERE THE COST WAS AND WRONG ABOUT HOW MUCH OF IT A GREP WOULD
FIND, WHICH IS THE FINDING WORTH KEEPING.** The row predicted two places — `05_location_isolation_reads.sql`
and the purchase contract check — and a `grep` for `purchase_select` found three more in
`supabase/checks/`. ⚠️⚠️ **FIVE MORE WERE FOUND ONLY BY RUNNING THE SUITES AND THE CHECKS**, because they assert
BEHAVIOUR and never name a policy — and **the fifth was not a test at all but a defect** (see below): `0008`'s own suite (*"a STAFF member at loc_a1 sees zero rows"*),
`0031` (*"a cashier reads ZERO purchase rows"*), `0032` (*"ZERO rows of the purchases view"*) and
`0033` (*"1 040 ROWS OF ONE KIND"*). **A grep finds none of them, and each one went red the first time
the migration was applied** — which is the best argument for behavioural checks this project has
produced, and it is the reason the estimate's *"the invisible half"* was the right call even though
it under-counted.

⚠️⚠️⚠️ **AND CI FOUND THE REAL DEFECT, WHICH WAS NOT A TEST TO FLIP: `product_waste_daily` BEGAN
TELLING AN EMPLEADA THE SHOP WASTES NOTHING.** `0011`'s view takes its numerator from
`stock_movement` (still manager-gated) and its denominator from `purchase_line` (now member-level),
so `security_invoker` inheritance started failing **OPEN**. ⚠️ **Measured on a reset database as the
seed's cashier: 468 rows, `waste_cost_net` summing to 0 and `purchases_net` to $260,423.43** — the
app stating that the shop bought a quarter of a million pesos of stock and threw away none of it.
**A false sentence assembled from two true halves.**

⚠️⚠️ **`0011` HAD WRITTEN DOWN WHY IT NEEDED NO PREDICATE, AND `0040` INVALIDATED THAT PREMISE IN ONE
LINE:** *"NO `has_role` PREDICATE, AND THAT IS A DECISION, NOT AN OMISSION… Both aggregates here are
gated at the source."* ✅ **So `0040` gives the view the predicate `0009` carries**, and it is in
`0040` rather than in an `0041` **deliberately: splitting them would create a schema state in which
that sentence is what the view says.** ⚠️ **The owner's ruling is untouched** — he traded the cost of
a DELIVERY, not the cost of waste — and **a cashier read zero rows of this view before `0040` and
reads zero after it.** What was repaired is a row that should never have appeared.

⚠️⚠️ **THE BODY IS READ OUT OF THE CATALOG AND NOT RE-TYPED.** `0011`'s definition is eighty lines of
two CTEs, a full outer join and twelve coalesced columns; a `create or replace view` that retyped it
would be the transcription risk this repository names on every `create or replace`. **`pg_get_viewdef`
is fetched and WRAPPED**, which makes the column names, order and types byte-identical by construction
and means the migration cannot silently alter the arithmetic it is fencing.

⚠️⚠️ **AND `0009` PREDICTED THE FIRST DRAFT'S FAILURE A MONTH IN ADVANCE, IN WRITING.** Section 4
shipped at first with `has_role` alone and **`0011` went from 3 failures to 23**, because that file
reads the view as `postgres` for all of its arithmetic. `0009`'s own margin view carries a second
clause and explains it at length: *"`row_security_active` is false exactly for the callers RLS does not
filter: the superuser, and `service_role`… gating them on `has_role` would only make the view LIE TO
THEM… and every check in `supabase/checks/`, which runs as the superuser."* ✅ **The answer was already
in the repository and was found by reading it rather than by reasoning it out twice.**
⚠️ **`0011`'s three access checks and its `_waste_half_gated` fixture are inverted with it** — the
fixture now demonstrates the gated-numerator shape, **which is the shape the view itself had for the
minutes between section 1 and section 4**, and the numbers in it are the ones measured then.

⚠️ **THE MIGRATION IS `alter policy` AND NOT `drop`+`create`**, which cannot change the command or the
roles by accident — asserted anyway (`1.6`), because *"it cannot"* is a claim about a statement I did
not write. ⚠️ **The location wall is KEPT on both policies** and that is the half a careless `alter`
would have dropped: a cashier reads **her own store's** deliveries. ⚠️ **`0003`'s table comment said
*"which is why its RLS policy is manager-and-above"*, and the clause after the comma is now false** —
replaced, because `\d+` shows it and a comment explaining a fence that no longer exists is the
stale-copy defect this repository has recorded ten of.

⚠️⚠️ **AND THE CHANGE MADE A TEST SUITE STRONGER, WHICH NOBODY ASKED FOR.**
`05_location_isolation_reads.sql` stated flatly that *"there is no actor in the schema who is
simultaneously manager-enough to read a purchase and location-restricted enough to be refused one."*
✅ **There is now**, and the store wall on a delivery is measured directly for the first time — in
`0003`'s inverted RLS block, in `0040`'s section 3, and as the difference between **11 and 12** in
`0008`'s checks 34 and 35, where the one pair a cashier cannot see is the one at the other store.
⚠️⚠️ **THE SUITE NEEDED NO EDIT AT ALL AND ITS PROSE NEEDED A REWRITE**: `role_gated` is derived from
`p.qual like '%has_role%'` and the plan is computed, so `purchase` and `purchase_line` reclassified
themselves from 5/5 to **7/3** and picked up four assertions each instead of two. **Verified against
the applied catalog rather than assumed.** **Nothing checks prose, which is why that was the expensive
half.**

⚠️ **WHAT HE DID NOT TRADE, ASSERTED AND NOT ASSUMED:** `stock_batch` and `stock_movement` keep their
gate (cost on the SHELF), `waste_line` keeps its (the cost of waste), `failed_write` is still
owner-only, and **`product_margin_daily` states its own predicate INSIDE the view** — so margin
reporting could not be reached by a policy change and `0032` now asserts her margin read is still
zero rows. ⚠️ **One consequence worth naming because it is concrete: the unfenced-export
counterfactual in `0033` went from 1 040 rows of one kind to 1 508 of two.** The document she can
actually open is unchanged — `transaction_export` states its own fence — but **an unfenced export
would now leak deliveries as well as sales, and still not waste**. The check's numbers moved and its
conclusion did not.

⚠️⚠️ **AND A HARNESS WOULD HAVE SILENTLY RE-NARROWED THE DATABASE.**
`5g-i-purchase-contract-falsify.sh` kept **hardcoded copies of `0002` and `0003`'s policies** to
restore after each fixture. That was safe for a month and stopped being safe today: **it would have
put the manager-only policies back on any machine that ran it, with nothing to say so.** ⚠️ **It is
worse than the `P2`/`P3` staleness of an hour earlier** — that one went red, this one would not have.
✅ **The restores now read `pg_policies` and build the `create policy` from the catalog**, and the
harness **refuses to mutate a policy it cannot read back** rather than risking a `drop` with no
`create` after it.

⚠️ **AND ONE CHECK READ ANOTHER CHECK'S LABEL.** `0033`'s check 17 matched
`'%FENCED view gives her nothing%'`; re-wording that label to *"STILL gives her nothing"* made it
match nothing and the check went red over something perfectly fine. **The fifth instance today of
*never spell a sentinel in the text it reads*, and the first one inside a single SQL file.**

⚠️⚠️ **VERIFIED AGAINST A REAL DATABASE, NOT A FILE.** `supabase db reset` applies `0040` from
scratch and every seed still loads. **25 behavioural suites: all green** — `0040` **24/24**, `0003`
**41/41**, `0008` **46/46**. **Three seed checks green** — `0031` 48, `0032` 48, `0033` 42.
`05_location_isolation_reads.sql` **88 assertions, no failures**, with the 7/3 split confirmed by
querying `pg_policies` afterwards. ⚠️⚠️ **AND THE LIVE-HTTP HALF SAYS IT IN ONE LINE:** *"a cashier
reads 2 providers, **1 memory row(s)**, WRITES a delivery and reads **3** back (0040)"* — where it read
*0 memories, reads 0 back* this morning. **Its falsifier's eleven fixtures all behave, with `P9`
inverted from widening to NARROWING** — because the widening is the shipped state now, and the thing
worth catching is the migration being undone.

⚠️ **Vitest 1,107**; typecheck clean; `conventions-gate.sh` 16 groups over 75 source and 38 test
files. ⚠️ **`canReadMemory` answers `true` for every KNOWN role and still refuses `null`**, so
`memoryState`'s `unreadable` is now unreachable — **named as dead rather than deleted**, because the
fence is one `alter policy` away in either direction and `MemoryState` is the type that would have to
grow it back.


✅✅ **`5g-ii-c` IS DONE AS OF 2026-09-25 — THREE CONTROLS OFF THE OWNER'S OWN ROUND ON HIS OWN
PHONE, AND IT IS THE FIRST PILOT-SHAPED FEEDBACK THIS PROJECT HAS HAD. `5g-iii` IS THE NEXT TASK
AGAIN — `5g-ii-b` CAME OUT OF THE SAME MESSAGE AND IS GATED ON AN ADR AMENDMENT, SO THE MARKER GOES
BACK TO `Costos`.** Sixteen new assertions (**1,107 over 38 files**, up from 1,091), one new data function,
**no migration.**

⚠️⚠️ **(1) A TAP ON THE SLIDE NO LONGER CLOSES THE CARRITO, AND IT NOW ANSWERS INSTEAD.** *"When a
carrito is open both in Vender and Comprar and someone taps in the slider to finish the
transaction, do not close the carrito. In both cases make a small animation, showing that the
slider was touched sliding a bit and bouncing."* ⚠️ **What shipped on 2026-09-24 was
`onOpen={onClose}` inside the sheet** — a tap on the track dismissed the review screen — which is
the literal reading of *a tap opens the basket* applied on the surface where the basket is already
open. ✅ **`Deslizador` now nudges on every tap** (`timing` out a third of the thumb, `spring`
back, `translateX` only, `useNativeDriver`) **and `onTap` is OPTIONAL**: the bar passes a handler
and opens, the sheet passes none and only nudges. ⚠️⚠️ **IT IS ONE CHANGE FOR BOTH SCREENS AND FOUR
CONTROLS, WHICH IS THE `src/ui/` EXTRACTION PAYING FOR ITSELF IN ITS FIRST WEEK** — `5g-ii` was
five days old when a ruling landed on the slide, and the alternative was the same edit in two
files with nothing to keep them the same. ⚠️ **The screen-reader sentence had to fork**: the
in-sheet label drops *o toca para ver el carrito*, because that is exactly the promise the ruling
withdrew and a blind user is the one person who cannot see that it no longer holds (C12.1).

⚠️⚠️ **(2) COMPRAR OPENS ON THE PICKER, THE HEADER IS A DROP-DOWN, AND THE LIST HAS PILLS.**
*"When opening Comprar, show a small menu that let's you pick the Proveedor… a small window with a
scrim… make it look more like a drop-down control… small pill sorters at the top, the preselected
sorter is Recientes but you can also pick A-Z. These sorters are hidden when typing to search."*
✅ **All four, as stated.** ⚠️ **The picker moved from a bottom sheet to a CENTRED window** and is
`maxHeight` rather than `height` — *"the list can be short or long so adapt it"* — which makes it
**the one card in this app that is deliberately NOT fixed**, the opposite of the basket sheet's
ruling and for the opposite reason: nothing in it is a control a thumb reaches for blind.
⚠️⚠️ **TWO DECISIONS TAKEN ON HIS BEHALF AND BOTH ARE ONE CONDITION TO REVERSE.** **(a) It does NOT
ask when a delivery is already half-keyed** — §2.11 persists the buy basket, and re-asking *who are
you buying from* over a basket already priced against an answer either discards her work or asks a
question whose only safe answer is the one already given. **(b) On the way IN there is no way out
but an answer** — no `Cerrar`, and the scrim does not dismiss — because tapping past it would land
on a catalog priced against a provider nobody picked. **Reopened from the drop-down, both come
back.**

⚠️ **`Recientes` NEEDED NO NEW READ AND THAT WAS THE FIND.** `provider_price_memory` has derived
`last_purchased_at` since `0008` — *"so a manager asking 'why is it offering me this?' can be
answered with a row"* — and this app had simply never asked for the column. ⚠️⚠️ **THE WART IS
NAMED RATHER THAN DISCOVERED: it is THIS PROVIDER's recency, so on a brand-new provider every row
ties and the pill looks inert.** The alternative is the shop's recency across every provider; it
costs a wider memory read and gives up the rule `memoryKey` exists for — one cache key per
provider, so no provider's prices can be served to another. **Not taken, and `5g-ii-c`'s row
records it for a one-sentence reversal.** ⚠️ **`A-Z` sorts on the FOLDED name and not on
`localeCompare`**, which is `R10` and not a preference: `Intl.Collator` is on the gate's banned
list — *"a function on Android and unasked on iOS"* — and `localeCompare` is the same machinery
behind a friendlier name. `searchTerm` already strips the accent, so **`Ávila` sorts where a
Spanish reader expects it with no ICU on the path.**

⚠️⚠️ **(3) THE NUMBER PAD HAS A WAY OUT, AND VENDER HAD NONE AT ALL.** *"The numerical Keypad isn't
easy to hide when you're done typing. Can we replace it with one that has the 'Hide' or 'Done'
control?"* ⚠️ **`keyboardType="decimal-pad"` DRAWS NO RETURN KEY ON EITHER PLATFORM** — `nuevo.tsx`
measured that — **so the `returnKeyType="done"` Vender has always carried was inert and
`onSubmitEditing` could never fire.** The only exits were a tap elsewhere or the keyboard's own
dismiss, on the screen he opens four hundred times a day. ⚠️⚠️ **AND THE FIX ALREADY EXISTED AND WAS
NOT CONNECTED: `TecladoListo` shipped with `5g-ii` and was wired to COMPRAR ONLY.** A primitive
built and left unattached is the shape this repository refuses by name, and it took a person
holding the phone to notice.

⚠️⚠️ **VERIFIED, AND A FALSIFICATION CAUGHT A COMMENT CLAIMING A BUG THAT CANNOT HAPPEN.** Seven
mutations of `@/api/providers`: A-Z on the raw name → **2 red**; `Recientes` reversed → **1 red**; a
dateless row keyed empty rather than dropped → **1 red**; the column dropped from `MEMORY_COLUMNS`
→ **1 red**; sorting the caller's array in place → **6 red**; control green at 58. ⚠️⚠️ **AND ONE
MUTATION STAYED GREEN, WHICH IS THE USEFUL ONE.** Replacing the `undefined` branches with
`aw ?? ''` changed nothing, because **under a descending compare an empty string is the oldest
instant and sinks anyway** — so the comment claiming *"`'' < '2026-…'` would put every unbought
product FIRST"* was **false**, and the assertion written to catch it cannot. ✅ **Both the code
comment and the test's comment now say what is actually true and what the assertion actually
holds.** **A green mutation is a finding, not a gap** — and it is the second time in two days that
running the falsifier rather than the guard corrected this repository about itself.

⚠️⚠️ **AND CI CAUGHT A SECOND DEAD FIXTURE OF EXACTLY THE `F4` SHAPE, ONE DAY AFTER `5g-ii` RECORDED
THE LESSON — THIS ONE IN THE HARNESS THIS MACHINE COULD NOT RUN.** `5g-i-purchase-contract-falsify.sh`'s
`P2` and `P3` both anchored on `MEMORY_COLUMNS` **ending** in `,last_qty_display_unit';`, and adding
`last_purchased_at` for the `Recientes` pill moved the end of that string. ⚠️ **The CONTRACT stayed
green** — assertion 5 read the new constant off the file and the database answered it — **and only the
falsifier went red, which is the check doing its job on its author**: `mutate` compares the mutated
copy against the original and refuses a fixture that edited nothing.
⚠️⚠️ **WHY IT WAS NOT CAUGHT LOCALLY IS THE PART WORTH KEEPING: I RAN EVERY FALSIFIER I COULD AND NOT
THE ONE THAT NEEDED A DATABASE.** The app-side four were green before the commit; this one drives real
HTTP, so it went to CI unrun. ✅ **A local Supabase stack was already up and the run took under a
minute** — so the honest correction is not *CI caught it* but **I did not look where looking was
cheap.** ✅ **Re-verified locally after the fix: control green, seven contract mutations and three
database mutations red, each for its named reason.**
✅ **BOTH FIXTURES ARE NOW POSITION-INDEPENDENT** — `P2` anchors on the `::text` CAST, which is the
thing it is about, and `P3` on the column NAME wherever it sits. ⚠️⚠️ **THAT IS THE THIRD INSTANCE IN
TWO DAYS OF ONE RULE, AND THE THIRD DIFFERENT DISGUISE:** a fixture pinned to a JSX literal another
task owned (`F4`), an archive cut bounded by *what comes next*, and now a fixture pinned to a
constant's LAST element. **A bound derived from something another task may move has an expiry date
nobody wrote down.**

⚠️⚠️ **AND A HARNESS REFUSED FOUR DRAFTS OF ONE SENTENCE WHILE TELLING ME THE ROW DID NOT EXIST.**
`handbook-agreement-falsify.sh` locates the waiting-on-you row with `**…waiting on YOU**` and needs
the **bold span to END at the pronoun**; every draft that wrote *"**One thing is waiting on YOU, and
it does not stop the next job.**"* was invisible to it, and the failure read *"no waiting-on-you row
in docs/HANDBOOK.md"* — **which is false and is the misleading half.** ✅ **The message now names the
shape it needs and prints how many lines DO contain the phrase**, so the next writer is told the
difference between *missing* and *wrongly punctuated*. ⚠️⚠️ **THE GUARD WAS NOT LOOSENED** — it still
demands the exact anchor, because that anchor is what `H5`–`H7` mutate. **A check whose failure
describes the wrong defect costs more than a check that is strict**, and this one cost four drafts in
one day before anybody wrote the shape down.

⚠️ **THREE TIMES IN ONE DAY A SENTINEL RULE FIRED ON ME**: the ⛔ block's *Blocks* cell naming the
next task (assertion 7c, the `4.6b` defect), `docs/HANDBOOK.md` spelling *waiting on YOU* in a
second row, and this. **All three were the SENTENCE and not the check** — which is the cheaper half
of *never spell a check's sentinel in the file it reads*, and the half that keeps being forgotten
because nothing enforces it but reading the failure.

⚠️ **`conventions-gate.sh` 16 groups over 75 source and 38 test files**; typecheck clean;
**Vitest 1,107**.


✅✅ **`5g-ii-a` IS DONE AS OF 2026-09-25 — THE TWENTY-FOURTH RULING CLOSED A ROW AND MADE A
SHIPPED LINE FALSE IN THE SAME SENTENCE. `5g-iii` IS STILL THE NEXT TASK.** Five new
assertions (**1,096 over 38 files**), one module function, **no migration and no fence added.**

⚠️⚠️ **THE RULING: *"Comprar should be for any role for now."*** The row asked two things — what
an Empleada is TOLD when her price memory comes back empty, and underneath it whether Comprar
should be manager-and-above at all. **He ruled the second and the first fell out of it in the
opposite direction from the one that shipped.**

⚠️⚠️ **WHY THAT IS A CORRECTION AND NOT A PREFERENCE.** `5g-ii` drew `unreadable` with the SAME
sentence as a genuinely new pairing — *Primera vez con este proveedor* — and its argument was
that she must type the cost either way, so nothing on screen would be false. ⚠️ **That argument
depended on her not being there.** `provider_price_memory` is manager-and-above (`0003:558`), so
once she may use the screen her read is **empty on every row, including the ones this shop buys
weekly** — and the sentence is then **false on most of the screen.** ✅ **`unreadable` is now
SILENT**: the box stays empty and required, which is the one thing that IS true for her — *the
app cannot tell her what this cost.*

⚠️ **AND IT DOES NOT EXPLAIN THE FENCE TO HER EITHER.** *"No puedes ver los precios anteriores"*
is a role boundary she did not ask about and cannot change ([[users-dont-do-bookkeeping]]) — and
it would be wrong on the rows that really are new, which nothing on the screen can distinguish.
**Silence is the only rendering accurate for both halves of a state the screen cannot resolve.**

⚠️⚠️ **THE RULE MOVED OUT OF THE SCREEN, AND THAT IS THE HALF WORTH KEEPING.** It shipped as a
ternary inside a 1,733-line `.tsx`, which `R2` puts beyond every instrument in this repository —
**so a ruling this consequential was held by nothing.** ✅ **`costNote(state, remembered)` now
lives in `@/api/providers`** and returns a KEY (`'last-paid' | 'new-pairing' | null`), never
Spanish — the shape `src/auth/errors.ts` established — and **five assertions in
`app/test/api-providers.test.ts` pin it**, including *says nothing at all when the memory is
fenced rather than absent.*

⚠️⚠️ **WHAT HE DID NOT SETTLE IS NOW THE ONLY ROW IN THE BLOCK FROM THIS SIDE: WIDEN THE VIEW OR
NOT.** *Any role may use Comprar* is not *any role may read what we paid.* ⚠️ **Widening
`provider_price_memory` means widening the selects under it** — `purchase` and `purchase_line` —
**which puts every cost this shop has ever paid in front of a cashier, and cost history is
margin.** ✅ **Recommended: leave it for the pilot.** Re-keying a figure she is holding on paper
costs minutes a week; **taking a read back from somebody already using it is the harder
direction**, which is `canWriteCatalog`'s own recorded argument. ⚠️ **And the shop is the
instrument**: if she complains about re-typing prices, that is the signal, and §5 puts the schema
owner in the shop for three days.

⚠️⚠️ **VERIFIED, AND NOT BY A TICK. THE TWO NEW ASSERTIONS WERE FALSIFIED BEFORE THEY WERE
TRUSTED**, which matters more here than usual because the thing they hold is a ruling rather than
an arithmetic: `costNote` reverted to speaking on `unreadable` → **1 red**, on the assertion that
names the ruling; a `remembered` state claiming *last-paid* with nothing to show → **1 red**;
control green at 47. **Vitest 1,096 / 1,096**, typecheck clean, `conventions-gate.sh` 16 groups
over 75 source and 38 test files.

⚠️⚠️ **AND THE BUILD ON HIS PHONE WAS CHECKED FOR THE CODE RATHER THAN FOR `BUILD SUCCEEDED`.**
`main.jsbundle` is 3,929,704 bytes, written 39 seconds before it was read — and every string
`5g-ii` minted is in it, **in Hermes' own split**: `Comprando a:`, `Registrar`, `Antes `,
`Primera vez con este proveedor`, `Falta el costo` and `Compra registrada` as 1-byte strings,
`¿Cuánto?` as **UTF-16LE** ([[hermes-bundle-stores-accents-utf16]]). ⚠️ **`Genérico` is absent
from the bundle and that is correct** — it comes from the database, not from `ES`. ⚠️ **The
profile did NOT move, measured off the built bundle's `embedded.mobileprovision` rather than
assumed: still `2026-09-27T14:22:11Z`.** `-allowProvisioningUpdates` reuses a valid profile, so
**this is the fourth re-deploy to buy zero extra days** and the ⏳ row's date stands exactly
where it was.


✅✅✅ **`5g-ii` IS DONE AS OF 2026-09-25 — THIS APP CAN RECEIVE A DELIVERY, AND
`src/ui/` EXISTS AT LAST. `5g-iii` IS THE NEXT TASK: `Costos`.** One screen of 1,733
lines, **six primitives not one of which was invented**, `nine new assertions (1,091 over
38 files, up from 1,082)`, and **no migration**, as the row promised.

⚠️⚠️ **THE ESTIMATE SAID `L`, ONE SITTING, AND REFUSED A SPLIT ON THE RECORD — which is
what the amended agreement asks a session to do rather than reach for size.** `5g.split`
had already cut the seam that matters: `5g-i` TOOK the invisible half (the fence, the read,
the payload), so **everything left here is one failure class and a person can look at all
of it.** The row's own words are the argument — *"every judgement left in this child is
rendering, navigation or layout"* — and a screen with nothing hiding behind it does not
split.

⚠️⚠️ **WHAT THE ESTIMATE FOUND, AND ONE OF THE FOUR IS A DISAGREEMENT WITH ADR-035 ON THE
EXACT TASK BEING TAKEN.**

**(1) §2.8's Comprar row still says *optional expiry*, and the owner ruled expiry out on
2026-09-21.** *"We will not capture expiry date for now"* — he intends to DERIVE shelf life,
and `7e` was rewritten for it. ⚠️ **The Home cell one row above was struck for the same
ruling's sibling on 2026-09-22 and this one was not touched**, so the file `CLAUDE.md` says
wins asks for a control he refused four days earlier. ⚠️ **It is not a schema gap and that
was checked rather than assumed**: `purchase_line.expiry_date` is applied (`0003:197`) and
`record_purchase` carries a three-tier policy for it (`0018:112`), tier 1 being the typed
date. **Sending nothing takes tier 2/3, which is the automated default** — so Comprar is
built without it, under the ruling, and **the one-line amendment is parked rather than
taken**: the ADR is amended by decision (`docs/HANDBOOK.md`), and a session that quietly
edited it would be doing the thing this repository refuses.

**(2) `memoryState` took a boolean nothing in the app supplied.** `5g-i` built the
distinction — *is this pairing new, or is this a fence you cannot see* — and left the caller
to say which, because a ROLE is not a provider read. ⚠️ **So `canReadMemory` landed in
`@/api/providers` and not in a ternary inside the screen** (`R3`): it is a claim about
`0003:558`, and `app/test/api-providers.test.ts` is what reads a claim.

**(3) THE ROW'S OWN EXTRACTION CONTRADICTED A SENTENCE `vender.tsx` SHIPPED.** The row says
the third drawing of a search box *"makes the extraction due here rather than a tidy-up"*;
`vender.tsx`'s header said *"a session that folds these into `src/ui/` before `5h` closes is
taking that row's decision for it."* ⚠️ **Three things settle it and all three agree**:
`5h.5`'s row owns the CONVENTIONS and says `src/ui/` is built *"across `5d`–`5h`"*; the
owner ruled that in those words on 2026-09-13; and §2.11 says the primitives should exist
*"before step 6 rather than being extracted from Vender afterwards by someone who did not
write it."* **The sentence in `vender.tsx` is corrected rather than left to disagree.**

**(4) `app/src/ui/` DID NOT EXIST, SO THIS TASK MINTS IT — AND `R8` APPLIES THE MOMENT IT
DOES.** The gate exempts `src/app/**` and nothing else, so every file there needs a header
saying why it exists; `R2` means the suite can never load one. **Which is why the extraction
moved markup only and every decision stayed in a `.ts` module.**

⚠️⚠️ **SIX PRIMITIVES, AND THE CASE FOR EACH ONE WAS MEASURED RATHER THAN ARGUED.**
`Buscador`, `Cantidad` (§2.11's `QtyInput`), `Deslizador` (its `PrimaryAction`),
`Separador`, `TecladoListo` and `Vacio` (its `Empty`). **Productos' and Vender's search
boxes were identical character for character**, differing only in their comments;
`Separador` likewise; `TecladoListo` had two copies differing by a `nativeID` and a string
key that held the same word. ⚠️⚠️ **AND `Vacio`'s THREE COPIES HAD ALREADY DRIFTED: two
centred their text and Vender's did not.** Nobody decided that, nothing could see it, and it
is a state a person only reaches when something has gone quiet — which is `R11`'s own
argument about what a retrofit misses. **The centred one won, two files against one.**
⚠️ **The owner's 2026-09-13 refusal is honoured rather than worked around**: he refused *"ten
primitives guessed at against screens nobody has drawn"*, and every one of these had been
drawn two or more times first. ⚠️ `vender.tsx` went **1,792 → 1,330 lines** and draws none of
it twice.

⚠️ **`ES.sell` SPLIT THREE WAYS, WHICH IS THE SAME EXTRACTION APPLIED TO THE WORDS.**
`ES.counter` holds what both counters say identically — the total, the basket sheet, the
emptying question, `Vaciar carrito` — and `ES.sell`/`ES.buy` hold only what genuinely
differs: the verb on the slide, the confirmation after it, and **what an unpriced row MEANS
on each side**, which is two sentences and not one because C3.13 blocks and C3.14 does not.

⚠️⚠️ **THE ONE PIECE OF SUBTLE STATE IN THE SCREEN, AND THE ALTERNATIVE WAS REFUSED FOR A
REASON.** The store holds what `record_purchase` will be SENT and the box reads it back, so
a prefill has to be **materialised into the store** rather than merged under the typed map at
commit time. ⚠️ **Merging is the obvious design and it is wrong: an emptied box would
silently commit the remembered figure** — §2.8's *"a wrong prefill answers one nobody
asked"* arriving through the cart store instead of through a fallback. So it is seeded once
per **(line, provider)**, and the ref holds a provider id rather than a boolean because
three cases depend on it: a cleared box stays cleared; **changing provider re-seeds, which is
the half of C3.11 that would have been left out**; and a memory that lands AFTER the line was
created still arrives, because `unknown` returns early **without marking the row seeded**. A
boolean would have lost that third one silently, and only on a slow connection.

⚠️⚠️ **THE FOURTH PRICE STATE IS DRAWN AS THE SECOND AND NO SENTENCE WAS INVENTED FOR IT.**
`5g-i` measured that a cashier's memory read is **200 and an empty array** — identical on the
wire to a pairing that really is new. **Comprar renders the two the same and adds nothing**:
she types the cost off the note, the delivery records, and nothing on screen tells her
anything false. ⚠️ **What she should be TOLD is the owner's to rule and it is parked**, which
is the row's own instruction — *put the question, do not answer it.*

⚠️⚠️ **VERIFIED, AND NOT BY A TICK.** `conventions-gate.sh`: **all 16 assertion groups over
75 source and 38 test files**, including `R8` over the six new modules and `R4` over the
split strings. Vitest **1,091 / 1,091**; typecheck clean. ⚠️⚠️ **AND THE NINE NEW ASSERTIONS
WERE FALSIFIED RATHER THAN TRUSTED** — three mutations of `@/api/providers`, each run
against the suite: `costShown` at scale 6 instead of 2 → **3 red**; `canReadMemory` rewritten
as `role !== 'staff'` → **1 red**; an empty box returning C3.12's dash → **1 red**; control
green at 42. ⚠️⚠️ **AND THE SECOND FALSIFICATION EXPOSED AN ASSERTION CLAIMING MORE THAN IT
CHECKED.** A test called *"is a threshold and not a not-staff test"* survived the mutation,
because the two spellings agree on all three roles that exist and `Role` is a union no test
may add a fourth to. **It was reworded to what it actually holds and the unreachable half was
written into the function's header** — `R9`'s convention, applied to a test rather than to a
screen.

⚠️⚠️ **AND A FALSIFIER FIXTURE HAD GONE QUIET WITHOUT FAILING — `conventions-gate-falsify.sh`'s
`F4`.** It mutated `<Pendiente what={ES.tabs.comprar} />`, the scaffold that stood behind the
Comprar tab, and **this task deleted that line** — so the `sed` matched nothing and the run
reported `⚠️ FIXTURE EDITED NOTHING — proves nothing`. ⚠️ **The gate itself never moved**: `R4`
was correct throughout, and `conventions-gate.sh` was green over the same tree. **A green gate
with a dead fixture behind it is a claim nobody is checking any more**, and the only thing that
surfaced it was running the falsifier after editing what it reads
([[run-the-falsifier-after-editing-what-it-reads]]). ⚠️ **It is re-anchored on a string this
task owns**, and the lesson generalises the one `5b.8-i`'s row recorded about line numbers: a
fixture pinned to markup ANOTHER task owns has an expiry date nobody wrote down.

⚠️ **`handbook-agreement-falsify.sh` refused this session's own wording too, and it was right
to.** Its anchor is `**…waiting on YOU**` with the bold span ending at the pronoun; the first
draft read *"**Two things are waiting on YOU, and neither of them stops the next job.**"* and the
harness could not find the row at all. ⚠️⚠️ **And the draft before THAT struck the old sentence
instead of deleting it** — `~~Nothing is waiting on YOU~~` — which the check reads as raw text,
so the handbook would have told it nothing was owed while the row asked two questions. **That is
the fourteenth instance of *a strikethrough is only a rendering* and the first one in
`docs/HANDBOOK.md`**; the phrase is REMOVED there rather than struck, and the row says why.

⚠️⚠️ **AND ONE DEFECT WAS FOUND BY READING, NOT BY A CHECK: `docs/CONVENTIONS.md` SAID
*"there is no `app/src/ui/`."*** The gate went green over it — all 16 groups — because no
assertion there compares that sentence to the filesystem. **It is the tenth stale-copy defect
recorded in this repository and the first one in that file**, and it is corrected with the
distinction it had collapsed: **the directory exists and the conventions are still owed at
`5h.5`**, which used to be one sentence and is now two.


