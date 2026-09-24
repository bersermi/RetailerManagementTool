# Status log — the 2026-09-23 working day, first cut

⚠️⚠️ **ARCHIVED 2026-09-24 FROM `docs/PLAN.md`'s `## Position`, WHICH HAD REACHED
1,403 LINES AGAINST ITS 1,400 CEILING** — `plan-handover.sh` assertion 7, and the
remedy is the one that check names in its own failure. Every line below is
**MOVED, not copied**: two homes for one claim is the defect this repository has
recorded six of, and `split-coverage.sh` fails on *"row appears 2 times"* because
it reads the corpus, which includes this file.

⚠️ **THIS IS THE FIRST FILE FOR 2026-09-23, AND IT SAYS *first cut* FOR THE REASON
`status-log-2026-09-22.md` DOES.** ⚠️⚠️ **A LATER SESSION APPENDS TO THIS FILE
RATHER THAN MAKING A SECOND ONE FOR THE SAME DATE** — one working day per file is
the rule, and a `status-log-2026-09-23b.md` would break it. ⚠️ **And it is never
renamed to absorb a later cut**: the plan's own history names these files, and
renaming for tidiness makes a recorded statement false.

⚠️ **It was taken in the same session that shipped `5f-iii-a`**, which is the
fourteenth of seventeen cuts taken by a session that wanted to be writing
something else — the argument assertion 7 makes in its own failure text.

**What is here, oldest first as the plan had it.** The oldest 2026-09-23 entry
left in `## Position`: `5e-ii` reopened and closed again, the owner holding the
form and replacing four of its decisions — including the reading taken between
two of his own sentences that disagree, which he may still want to overrule.

⚠️ **`plan-corpus.sh` globs `docs/plan/archive/*.md`, so this file needed no
wiring and every content-addressed lookup — `| **task** |` — resolves out of it
exactly as it did before the cut.**

## The FIRST cut, taken 2026-09-24 while `5f-iii-a` was shipping — off the FOOT

✅✅ **`5e-ii` WAS REOPENED AND CLOSED AGAIN ON 2026-09-23 — THE OWNER HELD THE
FORM AND REPLACED FOUR OF ITS DECISIONS.
`5e-iii` IS STILL THE NEXT TASK: `Editar`, AND THE PRICE CHANGE IS ITS SUBSTANCE.**
⚠️ **It ships no migration**, and it is the second time a `5e` child has been
reopened by a ruling on the day after it shipped — `5e-i`'s price was the first.

⚠️⚠️ **ONE SENTENCE COVERS ALL FOUR CHANGES, AND HE SAID IT TWICE IN ONE MESSAGE:
*a proposal must not look like a decision already made.*** He said it about the
family box and about the price box; the `Agregar` button was the same mistake one
screen over. **That is the whole ruling, and every edit below is a consequence.**

| | What he replaced | What it is now |
|---|---|---|
| **1** | ⚠️⚠️ **`Agregar` — DELETED** | Creation is reached by SEARCHING. He types a name; while anything matches he is reading what the shop already sells; only when nothing matches does the typed name become a row with *Crear Nuevo Producto* under it, and the form opens with that name prefilled. ⚠️ **The point is fewer partial duplicates, not fewer buttons** — a banda button is reachable without ever reading the list. ⚠️ **AND IT IS CLOSER TO C8.12 THAN THE BUTTON WAS**: that constraint's own words are *"From Productos → type the name"*, which is now literally the gesture |
| **2** | **The family MATCHED an existing one** | It **MIRRORS the typed product name**, drawn in hint ink. `suggestFamily` is deleted; its longest-word-run matching survives as **tier 1 of `searchFamilies`**, so the same behaviour is something he ASKS for instead of receives. ⚠️ His three scenarios are the three kinds of `FamilyChoice`, in his order: take the mirror, type a new family, or find the existing one |
| **3** | **The unit picker was NARROWED** | All ten units, always — and picking one the chosen family cannot hold **releases the family back to the mirror** and says why in a banner that fades. ⚠️ Picking an existing family **preselects its unit**. Same C8.5, enforced where a person can watch it happen rather than by six options quietly missing |
| **4** | **Two sentences after a save** | The form **pops back to Productos** with `?nuevo=<variant id>`; that screen scrolls the row into sight in its alphabetical place and **blinks its opacity three times**. ⚠️ *"Don't [add] any other indicator like a line or anything"* — so no rule, no badge, no colour, and §2.11's motion rule is satisfied because opacity is one of the two properties it allows |

⚠️⚠️ **AND HIS REWORDING OF THE NO-PRICE LINE FIXED A FACT, NOT JUST A PHRASE —
WHICH I CHECKED RATHER THAN ASSUMED.** The old sentence said *"cuando lo compres o
lo vendas"*; his says *"al momento de vender"*. **Comprar never needed this price:**
`price_list` is not read by a single function body in any migration — `from`/`join`
count is zero across all thirty-eight — `record_purchase` prices every line from the
`p_lines` the caller sends, and the only reader is `priceFor` in `@/api/catalog`,
prefilling a SELL price. **So naming Comprar was a promise about a screen that will
not stop him**, and the assertion that pinned both verbs went red for the right
reason and was rewritten to pin the claim instead of the words.

⚠️⚠️ **VERIFIED, AND NOT BY A TICK.** `5e-i-catalog-write-contract.sh` reports **16
of 16 green against a real database** with these edits in place — *A CASHIER IS
REFUSED* on all three tables — and its harness **17 of 17 fixtures**.
`conventions-gate.sh`: 16 groups over **61** source and **33** test files, its own
falsifier 30 of 30. Vitest: **865** assertions, up from 851, over 33 files.
`tsc --noEmit` clean. ⚠️ **Ten fixtures were driven through the new rules** and each
turned exactly its own red: the create row appearing when the search matched, a
cashier handed the create row, the mirror returning a family id, the mirror not
collapsing whitespace, the family search losing its ranking, a conflicting unit not
releasing the family, the release keyed on the exact unit instead of the dimension,
a family not preselecting its unit, the blink resting dimmed, and the banner fading
before it can be read. ⚠️ **An eleventh fixture was a DUD and is recorded as one**:
the first attempt at reverting the mirror changed nothing observable, so it passed —
a green fixture is a broken fixture, and it was rewritten until it bit.

⚠️⚠️ **ONE READING WAS TAKEN BETWEEN TWO OF HIS OWN SENTENCES THAT DISAGREE, AND IT
IS THE ONE THING HERE HE MAY WANT TO OVERRULE.** His banner says a family must have
*la misma unidad de medida*; **C8.5, from his own interview, says a family's variants
*"all share kg/gr"*** — which is two units and one DIMENSION. Taken literally the
banner would release the family the moment a shop priced `Menudencias` per `100g`
inside a `Pollo` family sold per `kg`, and that is a real pollería. **So the rule is
the dimension**: `250g` in a `kg` family is no conflict, `l` and `pza` are. His
sentence is kept verbatim because he wrote it.

## The SECOND cut, taken 2026-09-24 in the same session as the first — and the amendment is what spent the room

⚠️⚠️ **`5e-ii`'s SECOND ROUND OF THE OWNER'S NOTES, 2026-09-23** — five adjustments, one of
them a real bug, and the `5f` specification recorded rather than built.

⚠️ **What forced it:** the working-agreement amendment of 2026-09-24 — *an `M` or an `L` is
one sitting* — is a ruling, and a ruling gets an entry. `## Position` stood at **1,398 of
1,400** with that entry in place: **two lines of headroom**, which is less than a sentence.
⚠️⚠️ **The session that could see the number paid for its successor**, and this block has now
been cut twice in a sitting on two consecutive sittings.

✅✅ **`5e-ii` TOOK A SECOND ROUND OF THE OWNER'S NOTES ON 2026-09-23 — FIVE
ADJUSTMENTS, ONE OF THEM A REAL BUG I SHIPPED, AND ONE THING RECORDED RATHER THAN
BUILT. `5e-iii` IS STILL THE NEXT TASK: `Editar`, AND THE PRICE CHANGE IS ITS
SUBSTANCE.** ⚠️ **It ships no migration.**

⚠️⚠️ **THE BUG, AND IT IS THE INTERESTING ONE: *"the banner is not displaying."***
`flashReleased` called `setReleased(true)` and `Animated.sequence(...).start()` in
the SAME TICK — so the native driver was handed an opacity to animate on a view
**React had not mounted yet**, because the `{released && …}` branch only renders on
the next commit. ⚠️ **A native-driver animation against a node that does not exist
is dropped in silence**: no warning, no throw, no banner, and nothing in this
repository could have caught it — §2.11 keeps rendering out of every suite, and the
timing it pins was correct the whole time. **The animation now starts in an effect
keyed on `released`**, so the view is on screen before a frame is asked for.

⚠️⚠️ **AND HIS FIX FOR IT REVERSED AN ARGUMENT I HAD WRITTEN DOWN AS SETTLED.** I
set the banner's hold to 2600ms and argued it here: eight Spanish words at a counter
is two seconds of reading. **The argument was right and the design was wrong** — the
form is about to be saved and left, so no hold makes that sentence readable. His
answer moved the reading instead of lengthening it: *"show the banner for a second
in the form screen but it should persist in the catalog screen once we go back
there."* So the form's copy is a **one-second glimpse**, the fact travels with the
create as `?aviso=unidad`, and Productos shows the same sentence and **does not fade
it**. ⚠️ `@/theme/pulse` exports no timing for that one, and `app/test/pulse.test.ts`
asserts its whole export surface as an EQUALITY so a future `catalogBannerSequence`
turns red rather than quietly undoing the ruling.

| | What he asked for | What it is |
|---|---|---|
| **1** | The family list must close when the keyboard does | `keyboardDidHide` closes it. ⚠️ Safe rather than a race because `keyboardShouldPersistTaps="handled"` means tapping a row does not dismiss the keyboard — so this fires only on a deliberate dismissal, and *"either we have picked the option we wanted or we are sticking with the suggestion"* is true both ways |
| **2** | `Nombre`'s hint must read like `Familia`'s | `Pechuga sin hueso` → **`Escribe el nombre del producto`**. ⚠️ The old one taught C8.5's despiece and that was its problem: **a real product name in the box is indistinguishable from one somebody typed**, which is the complaint he made about the family and the price |
| **3** | The banner, fixed and moved | Above |
| **4** | A way off every keyboard | `returnKeyType="done"` + `onSubmitEditing` on the three text boxes — and the search key on Productos was `"search"`, which promised an action that **had already happened** on a live filter. ⚠️⚠️ **The price box is the one `returnKeyType` cannot reach**: `decimal-pad` draws no return key on either platform and is not optional (C12.2 puts the point in `35.50`). iOS gets an `InputAccessoryView` carrying *Listo*; **Android has no such API** and uses the platform's own dismiss control. ⚠️ Two routes to one outcome, which is worth knowing when he reports one platform and not the other — `R10`'s lesson about `formatToParts`, applied to a control |
| **5** | Leave the empty-catalog door alone | ✅ **RULED, AND IT CLOSES A LOOK-QUESTION I RAISED**: *"I'm not concerned about empty catalog/Crear Nuevo Producto behaviour since a default catalog will always be available."* ⚠️ **That is a fact about the pilot I did not have** — C8.1 has him building the catalog, and this says the app is never handed an empty one |

⚠️⚠️ **AND THE SIXTH ITEM IS A SPECIFICATION FOR `5f`, RECORDED RATHER THAN BUILT,
BECAUSE HE SAID SO: *"we're just making the Crear Producto… just make a very good
consideration about these things for the future parts."*** The quantity control on a
sale: *"$45/250gr… the stepper to go 250 → 500 → 750 → 1000. But he can also tap to
enter 288gr if needed."* ⚠️ **It needs NO migration and that was measured**:
`sale_line` (`0003:306`) carries `qty_base`, `qty_display` and `qty_display_unit` as
three columns, `record_sale` computes the base from the display and its unit, and
`unit_price_net_per_base` is `numeric(14,6)` — so 288g of a `$45/250g` product is
`$51.84` to the centavo with no fractional display quantity. **The step is
`unit.factor_to_base`, which is already on the phone.** ⚠️ **`5f`'s row now opens
with it and `5g`'s points at that row rather than restating it.** ⚠️ **The one thing
`5e-ii` had to get right for this is that the price is stored PER BASE UNIT — and it
is**, which is why nothing about `Agregar` has to change when the stepper is built.

⚠️ **VERIFIED:** Vitest **869** (was 865) over 33 files; `tsc --noEmit` clean;
`conventions-gate.sh` 16 groups over 61 source and 33 test files; every split spec
green; `plan-handover.sh` and `handbook-agreement.sh` green. ⚠️⚠️ **AND ONE
ASSERTION I WROTE IN THIS ROUND WAS A DUD AND WAS REPLACED**: it compared
`Object.keys` of an object literal, which is trivially true and tests nothing —
the same shape as the dud fixture recorded in the entry below. **It is now an
equality over `@/theme/pulse`'s real export surface.**

## The THIRD cut, taken 2026-09-24 — and the third in one sitting, which is a first

⚠️⚠️ **THE TWO BUGS FROM THE OWNER'S PHONE, 2026-09-23** — the keyboard that would not hide, the
catalog banner added and removed inside a day, and the follow-up he parked himself.

⚠️ **What forced it:** `5f-iii-a` was reopened and fixed the same day it shipped, and a reopening
that carries a parked decision is a long entry. `## Position` stood at **1,405 of 1,400** with it in
place. ⚠️⚠️ **This block has now been cut THREE TIMES IN ONE SITTING**, which has not happened
before — twice on 2026-09-24 morning and once in the afternoon. **The pattern is not the archiving;
it is that a session which both ships and takes a ruling writes two entries, and this one wrote
three.**

✅✅ **TWO BUGS FROM THE OWNER'S PHONE, FIXED 2026-09-23, AND ONE OF THEM WAS A
FEATURE ADDED THE SAME DAY AND REMOVED AGAIN.
`5e-iii` IS STILL THE NEXT TASK: `Editar`, AND THE PRICE CHANGE IS ITS SUBSTANCE.**
⚠️ **It ships no migration.**

⚠️⚠️ **BUG 1 — *"the keyboard is not hidding when redirecting to the Product
catalog"*, AND THE CAUSE WAS NOT THE DISMISSAL.** Both screens already called
`Keyboard.dismiss()`, the form on its way out and Productos on arrival, and the
keyboard came back anyway. **Productos' search box never lost FOCUS**: he types a
name there, taps the create row, and that screen stays MOUNTED under the pushed form
with its `TextInput` still the focused one — so when `dismissTo` pops back, iOS
restores the keyboard for it, after both dismissals have already run.
⚠️ **Dismissing a keyboard whose input is still focused is a keyboard that comes
back.** Fixed on both sides: the create row calls `Keyboard.dismiss()` before it
pushes, so nothing is focused while the form is open, and the arrival effect calls
`box.current?.blur()` as well — which also covers the path in from La Familia, where
Productos is further down the stack.

⚠️⚠️ **BUG 2 — THE BANNER ON THE CATALOG IS DELETED, ONE DAY AFTER IT WAS ADDED AND
BY THE SAME PERSON WHO ASKED FOR IT.** *"«Una familia de productos debe tener la
misma unidad de medida» is showing at the top of the catalog, don't know why, let's
get rid of it."* **It appeared when nothing had been released.** ⚠️ I could not prove
the mechanism from the source — whether `dismissTo` merges params into a screen
already in the stack is not something this repository can answer — **so it is
recorded as removed rather than as diagnosed.** ⚠️⚠️ **What IS certain is a defect I
can name: `avisoShown` was `useState(true)` and the arrival effect re-set it to
`true`, so dismissing it never stuck across a second create**, and a stale `aviso`
parameter would have been enough on its own. **Removing it removes the class**, and
that is the whole of the ruling.

⚠️⚠️ **AND THE FOLLOW-UP QUESTION IS PARKED BY THE OWNER RATHER THAN OPEN — *"let's
skip anything related to the banner for now"* (2026-09-23). A cleared session must not
pick this up**: it is not in the decisions block, it blocks nothing, and `5f`'s
confirmation animation is where a notice on a catalog is decided. ⚠️ The paragraph
below is kept because it records what the removal cost, not because anything is owed.

⚠️ **WHAT THE REMOVAL COSTS, SAID RATHER THAN HIDDEN: the one-second glimpse on the
form is now the ONLY copy of that sentence.** That was the hold he specified while a
persistent copy existed, and the reason he asked for the persistent copy in the first
place was that a second is not long enough to read eight Spanish words. ⚠️ **It is
one constant (`BANNER_HOLD_MS`) if he ever raises it** — ~~and it is worth asking~~,
**struck: he parked it the same day**, and a session that asks anyway is spending his
attention on the one thing he said to leave. ⚠️ **The question is NOT reopened on this screen**:
`5f`'s confirmation animation is where a persistent notice on a catalog belongs.

⚠️ **VERIFIED:** Vitest **866** — three fewer than the round above, because the three
`avisoLine` assertions went with the feature they described; `tsc --noEmit` clean;
`conventions-gate.sh` 16 groups over 61 source and 33 test files;
`5e-i-catalog-write-contract.sh` 16 of 16 green against a real database; every split
spec green; `plan-handover.sh` and `handbook-agreement.sh` green. ⚠️ **Nothing was
left dangling**: the route parameter, `AVISO_UNIT_RELEASED`, `avisoLine`,
`ES.catalog.avisoDismiss`, the `Aviso` component and the `everReleased` ref are all
gone, which the typecheck is what confirms.

## The FOURTH cut, taken 2026-09-24 — and it is the fourth in ONE sitting

⚠️⚠️ **THE `5e-iii` SIZING OF 2026-09-23** — the split that found the price change is a
contract with Postgres rather than a form detail, and the C3.17 contradiction that came with it.

⚠️ **What forced it:** `5f-iii-b` shipped the whole of an `M` in one sitting under the amended
working agreement, and a row carrying five owner rulings, a refused design and a finding routed
to another task is a long entry. `## Position` reached **1,467 of 1,400**.

⚠️⚠️ **FOUR CUTS IN ONE SITTING IS A RECORD, AND THE LEDGER SHOULD SAY WHAT IT MEANS RATHER
THAN JUST COUNT IT: THE AMENDMENT MADE SITTINGS BIGGER, AND A BIGGER SITTING WRITES A LONGER
ENTRY.** The ceiling did not move, so the archiving cadence is what absorbed the change. **If a
later session finds itself cutting twice per task, that is the number to look at — not this
block's ceiling.**

⚠️⚠️ **`5e-iii` WAS SIZED ON 2026-09-23 BEFORE A LINE OF IT WAS WRITTEN, IT IS AN
`M/L` AND NOT THE `M` THIS FILE CARRIED, AND IT SPLITS IN TWO.
`5e-iii-a` IS THE NEXT TASK: THE EDIT AS A CONTRACT WITH POSTGRES, NO SCREEN ON IT.**
⚠️ **Neither child ships a migration.** The ninth split in step 5 taken that way and
the ninth that found something.

⚠️ **THE SEAM IS `5e`'s OWN, ONE LEVEL DOWN — the move `5d-iv` made on 2026-09-22.**
`5e` divided on the argument that `5e-i` is the half a machine can hold and the other
two are the half only the owner's eye can. **`5e-iii`, alone of the three, still
carried both**: a form somebody has to look at, and a write whose rules are an
exclusion constraint, a range check and four `has_role(…, 'manager')` policies.
`5e-iii-a` is the second `5e-i` — `app/src/api/catalogEdit.ts`, a node suite, and
`docs/checks/5e-iii-a-catalog-edit-contract.sh` over real HTTP. `5e-iii-b` is
`Editar` itself, and `R9` is its whole instrument.

⚠️⚠️ **THE SIZING FOUND TWO THINGS THE ROW DID NOT SAY, AND THE FIRST IS THE WORST
PARTIAL FAILURE THIS APP HAS HAD SO FAR.** The row described the same-day branch and
stopped there. It never said the ordinary branch is **two calls whose order is
forced**: the row in force must be CLOSED at today before the new one is opened, or
both cover today and `price_list_no_overlap` refuses the second. ⚠️ **So there is a
gap between them, and a failure inside it leaves the product priced yesterday and
priceless today** — mid-morning, wearing C3.12's dash, done by a shopkeeper who was
CORRECTING a price rather than removing one. **`5e-i`'s three partial states were
invisible or harmless; this one is neither**, and it is now a named state with a
retry that re-opens rather than re-closing.

⚠️⚠️ **THE SECOND IS A CONTRADICTION BETWEEN THE OWNER'S OWN CONSTRAINT AND THE
APPLIED SCHEMA, AND NOTHING IN THIS REPOSITORY HAD NOTICED IT IN FOUR WEEKS. IT IS
PARKED IN THE DECISIONS BLOCK.** C3.17 says **any role may change a price, including
a cashier**, and closes with *"it is client-side only; no schema depends on it."*
⚠️ **That last sentence is false and has been since `0002` applied on 2026-08-26**:
`price_list_insert`, `price_list_update` and `price_list_delete` are every one of
them `has_role(workspace_id, 'manager')`. A cashier is refused by the database, in
silence, with a bare `42501` — the shape [[shift-cover-is-a-reassignment]] records.
⚠️ **It blocks `5e-iii-b` and `5f`, and it does NOT block `5e-iii-a`**: the module
describes the fence the database applies today, and a ruling that widens the fence is
a migration written against a module that already names it.

## The FIFTH cut, taken 2026-09-24 — and it is the fifth in one sitting

⚠️⚠️ **`5e-iii-a`'s CLOSING ENTRY, 2026-09-23** — the price change as a contract with Postgres,
the three-branch dated window, and the finding that a cashier's edit is not REFUSED but
INVISIBLE (HTTP 200 with an empty array).

⚠️ **Taken immediately after the fourth, for the reason the fourth wrote down**: `5f-iii-b`'s
entry is long because the sitting was large, and one cut did not clear the ceiling.
✅✅ **`5e-iii-a` IS DONE AS OF 2026-09-23 — THE APP KNOWS HOW TO CHANGE A PRICE, AND
THE UPDATE FENCE HAS AN INSTRUMENT FOR THE FIRST TIME.
~~`5f` is the next task: Vender, and its own row says to size it first.~~ — ⚠️ **struck
in lower case deliberately within the hour, by the C3.17 ruling above: `5e-iii-b` was
ungated the same evening it was gated, so it goes back in front of `5f`.**
One module, one hook, three calls, **50 new assertions**, a contract check over real
HTTP and **twenty falsification fixtures** — ten through the suite and ten through the
check. ⚠️ **It ships no migration**, as its row promised.

⚠️ **WHAT SHIPPED.** `app/src/api/catalogEdit.ts` — the three patches, the two typed
figures, the dated window's three branches, the retry and the refusals;
`variantPrices`, `patchVariant` and `changePrice` in `@/api/calls`; `useEditProduct`
in `@/api/hooks`; three new sentences and a new `ES.catalog.editIssues` block; and
`docs/checks/5e-iii-a-catalog-edit-contract.sh`, wired into `db.yml` beside `5e-i`'s.

⚠️⚠️ **THE FINDING, AND IT IS THE REASON THIS CHILD WAS WORTH A SESSION: THE FENCE ON
AN UPDATE IS NOT THE FENCE ON AN INSERT, AND A CASHIER'S EDIT IS NOT REFUSED AT ALL —
IT IS INVISIBLE.** Measured against a real database on 2026-09-23, not recalled.
`price_list_insert` is `with check`, so a cashier posting a price gets the `42501`
`5e-i` already records. Every UPDATE policy on these tables carries `using` as well,
and **a row a `using` clause excludes is a row PostgREST cannot see** — so her PATCH
matches nothing and comes back **HTTP 200 with `[]`**. No code, no message, no
refusal. ⚠️⚠️ **A screen that read that as success would tell her the price changed
while the shelf kept the old one** — [[shift-cover-is-a-reassignment]]'s silent
refusal, arriving this time through a 200. ✅ **`.single()` on every patch is what
turns it into a 406 `PGRST116`** — measured on both tables — and that code is now
mapped to the same sentence as `42501`. **It is a deliverable, not a style**, and it
is written down as one in the module and in the check.

⚠️⚠️ **AND THE ORDERING CLAIM IS DRIVEN RATHER THAN ASSERTED.** *Close before you
open* is not a preference: an overlapping insert answers **`23P01` on
`price_list_no_overlap`**, and closing a row that started today answers **`23514` on
`price_list_range_ordered`** — both read back off a real PostgREST, which is the only
way either sentence could be checked at all. **The second is why `priceChange` has a
third branch**, and a module with only the ordinary one would have worked all day and
failed the second time a shopkeeper corrected a price.

⚠️⚠️ **THREE DECISIONS WERE TAKEN ON THE OWNER'S BEHALF. NONE IS A MIGRATION AND NONE
IS BAKED INTO A SEED, so all three are an edit rather than a fix-forward.**

| | Decision | Why, and what the alternative was |
|---|---|---|
| **A** | ⚠️ **`PGRST116` IS READ AS THE FENCE**, and gets *"Solo el dueño o un gerente puede cambiar un producto."* | Zero rows on this path has one cause: the id comes from the catalog the phone just read, and **neither catalog table has a DELETE policy** — measured, `42501 permission denied for table product_variant` — so a row that vanished is not a state this app can produce. The alternative is `apiErrorMessage`'s *"algo salió mal"*, which is the honest nothing for a case that is never a mystery |
| **B** | **THE CHANGE EDITS THE SCOPE THE READ RESOLVED**, and never invents one | `priceFor` prefers a store's own row, so correcting a store price stays a store price and correcting the shop-wide one stays shop-wide. ⚠️ Only a product with NO price is priced shop-wide, which is `5e-i`'s decision **A** unchanged. The alternative — always pricing the store this phone is standing in — is identical in both pilot shops (C1.5) and silently splits a shop's price list the first morning one opens a second store |
| **C** | **AN UNTOUCHED BOX SENDS NO COLUMN**, and an identical price is no round trip at all | `0002` defaults `tax_rate` to 0 and `pack_size` to 1 for a shop selling basic groceries; sending those back explicitly looks identical in the row and is this app answering a question nobody asked — `VARIANT_INSERT_COLUMNS`' own argument. And closing and re-opening an unchanged price writes a change into the shop's price history that never happened, which `7`'s reports would eventually read as real |

⚠️⚠️ **AND THE PARTIAL FAILURE IS NAMED RATHER THAN DISCOVERED.** Close lands, open
does not, and the product is **priced yesterday and priceless today** — on the shelf,
mid-morning, put there by somebody who was CORRECTING a price. It is
`PriceChangeFailed.closed`, it has its own sentence (`ES.catalog.errors.priceGone`),
and `retryChange` re-opens rather than re-closing. ⚠️ **What `5e-iii-b` must not do
with it**: show *"no se pudo guardar"*, which would send a shopkeeper away believing
the old price still stands while the next customer is charged nothing at all.

⚠️⚠️ **VERIFIED, AND NOT BY A TICK.** `docs/checks/5e-iii-a-catalog-edit-contract.sh`
reports **9 of 9 assertion groups green against a real database** — *A CASHIER IS
REFUSED*, in both of its shapes, with the row read back afterwards and unchanged — and
its own harness reports **10 of 10 fixtures behaving**, two of which move the codes the
fence arrives as. Vitest: **916** over 34 files, up from 866 over 33, and **ten
fixtures were driven through the new assertions and each turned exactly its own red**:
the same-day branch removed, an identical price re-opened, the scope invented, the
retry re-closing, `checkEdit` refusing the product itself, the tax ceiling dropped, a
pack of zero allowed, the silent refusal unmapped, a half-done change wearing the
ordinary sentence, and an untouched settings box sent as the column default.
`tsc --noEmit`: clean. `conventions-gate.sh`: 16 groups over **62** source and **34**
test files, and its own 30 fixtures. `5d-i-catalog-contract.sh` 12/12 and
`5e-i-catalog-write-contract.sh` 16/16, both still green against the same database.
`split-coverage.sh --all`: 15 specs, and `--quick` falsification over all of them.
`plan-handover.sh` and `handbook-agreement.sh` green, the latter with **one** open
decision and the handbook saying so.

⚠️ **WHAT NO CHECK HERE CAN SEE (`R9`, §2.11), routed to `5e-iii-b` rather than
guessed:** every screen question, and one that is not obviously one — **whether a
shopkeeper should be told that a price change takes effect TODAY and not retroactively**.
The dated window is the whole design and nothing on the form says it exists.

## The SIXTH cut, taken 2026-09-24 while `5f-iii`'s round of the owner's notes was shipping

⚠️⚠️ **THE FIRST CUT THIS FILE HAS TAKEN THAT WAS NOT SPENT BY A CLOSING ENTRY.** The
five before it each came off the back of a task closing; this one came off a round of
the owner's notes on an app he already had in his hand — **five changes and no task
closed** — which is the shape the amended working agreement makes more of, not less.
⚠️ `## Position` stood at **1,410 of 1,400**, and `plan-handover.sh` assertion 7 named
the remedy in its own failure, as it has six times in this file.

⚠️ **TWO ENTRIES, OLDEST FIRST AS THE PLAN HAD THEM** — the ruling that unblocked
`5e-iii-b`, and `5e-iii-b` closing with it. ~~and with them 2026-09-23 is wholly out of
`## Position`~~ — ⚠️⚠️ **STRUCK: THAT WAS FALSE WHEN IT WAS WRITTEN.** Two more 2026-09-23
entries were still there and went in the SEVENTH cut below, minutes later. **See that
cut's heading for the count that should have been taken first.** ⚠️ **It is a MOVE and not a copy**: `split-coverage.sh` fails on *"row
appears 2 times"* and it reads the corpus, which includes this file.

✅✅ **THE C3.17 CONTRADICTION WAS RULED ON 2026-09-23, ABOUT TWO HOURS AFTER IT WAS
PARKED: *"leave the fence as is."*
`5e-iii-b` IS THE NEXT TASK: `Editar`, DRAWN MANAGER-ONLY.** ⚠️ **It ships no
migration**, and the ruling is why — the alternative was one.

⚠️⚠️ **WHAT WAS CORRECTED RATHER THAN MERELY ANSWERED.** C3.17 closed with *"it is
client-side only; no schema depends on it"*, and that sentence was **false from the day
`0002` applied** — `price_list_insert`, `price_list_update` and `price_list_delete` are
every one of them `has_role(workspace_id, 'manager')`. It is struck, with `5e-iii-a`'s
measurement beside it: a cashier's INSERT is a `42501` and **her UPDATE is not refused at
all**, because a `using` clause hides the row and PostgREST answers 200 with an empty
array. ⚠️ **The constraint's own claim that this was the cheapest thing in its section to
reverse is struck with it** — reversing it is an append-only migration that merges
automatically, which is the opposite of cheap.

✅ **WHAT IT DISCHARGES: `5e-iii-b` IS UNGATED**, `Editar` is drawn manager-only — the
`5e-ii` treatment of the create control applied to the edit one — **and the amber
question resolves with it.** *The fix is one tap away* is true for the people who can
make the tap, and a cashier who can never set a price must not be shown an alarm she
cannot silence. §2.11 fences `atención` to C3.17 alone, so that colour now has a rule
rather than a guess.

⚠️⚠️ **WHAT IT DOES NOT DISCHARGE, AND NO SESSION MAY ASSUME IT EITHER WAY:** whether
Vender offers a cashier a price override **for this sale only**, one that never writes
`price_list`. It is a different affordance from the one C3.17 describes, it is entangled
with **C3.16**'s *a price change persists by default*, and **`5f`'s row now owes the
word** — the `Costos` shape, deferred to the row that can answer it rather than dropped.
⚠️ `5f` is therefore no longer marked next and **its sizing instruction stands**.

✅✅ **`5e-iii-b` IS DONE AS OF 2026-09-23 — A SHOPKEEPER CAN CHANGE A PRODUCT ON A PHONE,
AND `5e` IS CLOSED. `5f` IS THE NEXT TASK: VENDER, AND ITS OWN ROW SAYS TO SIZE IT FIRST.**
One new route, one hook method, four new module exports, **20 new assertions (936 in the suite)**,
ten falsification fixtures through the suite and two more through the contract check — which is
now **10 of 10 green against a real database**, its harness **12 of 12**. ⚠️ **It ships no
migration**, as its row promised.

⚠️⚠️ **THE ROW'S OWN CLAIM WAS HALF WRONG, AND FINDING THAT IS MOST OF WHAT THE SESSION WAS
WORTH.** `5e-iii`'s split argued that the second child was *rendering, navigation and layout* and
nothing else. It is not: **`Editar` is FOUR WRITES BEHIND ONE BUTTON**, across two tables, with no
transaction between them — and *which goes first* and *what a failure leaves* are questions with
right answers that `5e-iii-a` never asked, because that child's subject was the price alone.
✅ **So `EDIT_ORDER`, `editPlan`, `editTouches` and `editLine` went into `@/api/catalogEdit`**,
where the suite and the check can read them, rather than into the form's JSX — which is `R3`, and
the seam this split exists to keep, held from the side nobody was watching.

⚠️ **The order is `name → settings → price`, and it stops at the first failure.** The name goes
first because it is the one that can be refused `23505` by a shop-wide unique index — stopping
there leaves the IVA untouched under a name he is about to abandon. The price goes last because it
is the only step that can HALF-happen, so **the worst state this app can reach is also the last
thing it can reach**, with nothing written after it. ⚠️⚠️ **AND THERE IS NO RETRY STATE, WHICH WAS
MEASURED RATHER THAN SKIPPED**: `useEditProduct` invalidates both reads on every path that touched
the database, so the next tap re-plans from fresh rows — a close that landed reads back as *no row
in force*, which is `priceChange`'s `open` branch, **exactly what `retryChange` answers**. And when
the refresh itself failed, the stale plan is still right: re-closing a closed row patches
`effective_to` to the value it holds and the insert has nothing left to overlap. Two paths, one
answer, no third function.

⚠️⚠️ **THE SECOND FINDING: THE IVA BOX WOULD HAVE BEEN BLIND.** `variantSettings` deliberately
sends no column for a box nobody typed into, so an empty form cannot overwrite anything — **and
that is only a choice if he can see what he is leaving alone.** `VARIANT_COLUMNS` in
`@/api/catalog` carries neither `tax_rate` nor `pack_size`, and widening it would pay for two
columns over ~100 products on every load of Productos (C8.3) to serve one screen. **So
`VARIANT_EDIT_COLUMNS` is a second read for ONE variant**, `PRICE_EDIT_COLUMNS`' own argument, and
the figure is printed BESIDE the box and never inside it. ⚠️ **Both columns are `::text`**, and the
contract check's new assertion is about the TYPE rather than the value: a bare `numeric` arrives as
a JSON double, `parseDecimal` refuses a number outright, and the screen would simply draw no line —
compiling, bundling and passing Vitest the whole way.

⚠️⚠️ **THE DASH IS ANSWERED, AND IT IS ANSWERED IN TWO PLACES WITH TWO DIFFERENT ANSWERS.** On **La
Familia** a missing price is now **amber for a manager and `tintaApagada` for a cashier** — C3.17's
*the fix is one tap away* is literally true there (the control is on the same screen) and false for
somebody the fence refuses, which is the C3.17 ruling's second half. **Productos keeps the quiet
dash on every row**, decided again rather than inherited: nothing on that screen sets a price, and
C8.2 has the owner seeding the catalog DELIBERATELY SHORT — so a flat list of ~100 products would
open amber on most of its rows for the pilot's first week, which is the alarm nobody can silence.

⚠️⚠️ **AND LA FAMILIA'S ROWS ARE PRESSABLE, WHICH `5d-iii` SAID THIS DAY WOULD BRING.** That
screen's header wrote: *the selection is a record of where you came from and nothing consumes it
yet — the day `Editar` acts on a variant is the day moving the mark means something.* It does, so a
tap moves the mark and the mark is what `Editar` opens. ⚠️ `Editar` is **absent when nothing is
marked** rather than disabled: every real door passes `?variante`, and *edit which one?* has no
answer until he taps.

⚠️⚠️ **ONE DECISION IS PARKED, AND IT IS A GAP RATHER THAN A QUESTION — THE SECOND OF THOSE IN ONE
DAY.** Retirement shipped (`is_active` false, never a DELETE, behind a confirmation), and
**nothing in this app can bring a product back**: `activePatch(true)` is the same call, but
`catalogFrom` drops inactive variants and no pilot screen lists them. **The undo exists in the
database with no door onto it.** The confirmation says so in its own words rather than implying the
tap is reversible, the recommendation is written out in the decisions block, and **it blocks
nothing** — including `5f`.

⚠️ **FIVE THINGS GO TO THE OWNER'S PHONE AND NOWHERE ELSE (`R9`, §2.11)**, and they are listed on
`5e-iii-b`'s row: whether *Actual: $35.00 / kg* beside an empty box reads as a fact or as a failed
load; whether one amber price among six reads as *price this* or as *something is broken*; whether
going back to La Familia is confirmation enough or wants the blink `Agregar` got; whether four
fields and a retire control fit one screen at *Letra grande*; and whether a row that highlights
under a thumb and goes nowhere reads as a selection or as a link that failed.

## The SEVENTH cut, taken 2026-09-24 minutes after the sixth — and it exists because the sixth CLAIMED something false

⚠️⚠️ **THE SIXTH CUT SAID 2026-09-23 WAS WHOLLY OUT OF `## Position`. IT WAS NOT, AND
THE SESSION THAT WROTE IT CHECKED AFTERWARDS RATHER THAN BEFORE.** Two 2026-09-23
status entries were still sitting there — the prebuilt-catalog ruling and the
correction the owner found on his phone within the hour. ⚠️ **This is the NINTH cut in
this repository's history to make that same claim wrongly**, and the remedy the
archive already records is the one used here: **the fix is not a better sentence, it
is `grep -c '2026-09-23' docs/PLAN.md` before writing one.** ✅ **The sixth cut's
sentence is corrected in place rather than deleted**, and so is the paragraph in
`## Position` that repeated it.

⚠️⚠️ **AND MOVING THEM TOGETHER REPAIRED A CROSS-REFERENCE RATHER THAN BREAKING ONE.**
The correction opens *"THE PREBUILT-CATALOG ANSWER ABOVE"* — and in `## Position`,
which runs newest-first, the ruling it corrects sat **below** it, so the word `ABOVE`
was already pointing at nothing. **This file runs oldest-first**, so the ruling now
genuinely precedes its correction and the sentence is true for the first time since it
was written.

⚠️ **What is left in `## Position` carrying that date is the DECISIONS-OWED block's
own rulings**, which are not status-log entries and must never be archived —
`plan-handover.sh` assertions 4 and 5 require exactly one of that block in the live
plan.

✅✅ **THE PREBUILT-CATALOG RULING, 2026-09-23 — AND IT NEEDS NOTHING BUILT NOW, WHICH
WAS MEASURED RATHER THAN HOPED. `5f` IS STILL THE NEXT TASK.** The owner ruled after
holding `5e-iii-b` on his phone: *"I took the decision to start working with prebuilt
catalogs. The user can still create new Familias and Productos and they can delete those
disappearing from the Product Catalog but persisting in the transactions and other
historical parts. But the default products cannot be deleted and it doesn't really make
sense at this point to disable them or anything else."* He asked whether it had to be
addressed now. **It does not, and the reason is a measurement rather than a judgement.**

⚠️⚠️ **HALF OF IT WAS ALREADY BUILT AND NOBODY HAD NOTICED — INCLUDING THE SESSION THAT
BUILT IT.** *"Delete… disappearing from the Product Catalog but persisting in the
transactions"* is **exactly** `5e-iii-b`'s retirement: `is_active` false, dropped by
`catalogFrom`, kept by every ledger read. His sentence describes the shipped behaviour
line for line, and `0002` gives neither catalog table a delete policy at all, so the
database **cannot** do the other thing. **It was parked as a decision and it was a
description.**

~~⚠️⚠️ **AND THE OTHER HALF IS VACUOUS TODAY, WHICH IS THE WHOLE ANSWER TO *do I need to
address this now*.**~~ ⚠️⚠️ **STRUCK 2026-09-23, WITHIN THE HOUR, BY THE OWNER ON HIS
PHONE — SEE THE ENTRY ABOVE. IT IS NOT VACUOUS AND IT WAS NOT THE ANSWER.** The paragraph
below is left standing because the measurement in it is correct and only the conclusion
drawn from it is not, which is the more useful thing to keep. Measured against the applied schema and every migration in the
repository: `product_family` and `product_variant` carry **no origin column**, and there
is **not one `insert into` either table anywhere in `supabase/migrations/`**. So **there
are no default products**, every product in every shop is one somebody made, and every
one of them is correctly deletable. **A fence drawn now would be a control with no rows
to apply to** — the scaffolding `5d` spent a step deleting.

⚠️⚠️ **THE ONE THING THAT IS CHEAP NOW AND DEAR LATER, NAMED LOUDLY BECAUSE MERGING IS
AUTOMATED: THE MARKER SHIPS IN THE MIGRATION THAT FIRST SEEDS A CATALOG, NEVER AFTER
IT.** A shop seeded before it exists has rows nothing can ever tell apart again, and
back-filling means guessing by name. **The exposure is zero today because no shop has
been seeded**, and it starts the day one is — which is why the sentence is in `6c`, in
`C8.2b` and in the ADR rather than in a session's head.

✅ **WHAT ACTUALLY CHANGED IN CODE: ONE STRING.** `ES.catalog.edit.retireOnce` read
*"Por ahora no se puede volver a activar desde la app."* — and *por ahora* describes a
gap waiting to be closed, which the ruling says it is not. It now reads **`Esto no se
puede deshacer.`** ⚠️ The sentence above it was already his own — *"Lo que ya vendiste no
se borra"* — and that pairing is what makes one-way deletion safe to offer at all.

✅ **WHAT CHANGED IN THE RECORD, WHICH IS MOST OF IT.** **C8.1** amended — a shop starts
from a prebuilt catalog, and its *no import, no bulk tool* half stands. **C8.2** still
true, for a second reason. **`C8.2b` is new** and carries the fence and its measurement.
**C8.4 pulled forward** from *later* to a row. **`6c` written**, sized *size it first*,
recommended after `5g` and explicitly the owner's to move ahead of `5f` if the pilot is
to open on a prebuilt catalog. **ADR-035's catalog section amended** — the fifth
amendment folded into the work that raised it — ⚠️ **including the sentence that keeps
it from reading as a reversal**: the rows are COPIED INTO a workspace and never shared
across tenants, because every line table's foreign key is composite on
`(id, workspace_id)`. **One catalog per workspace is untouched, and the catalog still
belongs to the merchant.**

⚠️ **ONE QUESTION GOES BACK TO HIM AND IT IS ONE WORD**: the control says
*Retirar del catálogo* and he calls the act **delete**. `Eliminar` is what a shopkeeper
would look for; `Retirar` was chosen because the thing survives in the ledger. **The
honesty is carried by the sentence underneath either way**, so this is his ear rather
than an argument — and he is holding the phone.

⚠️⚠️ **THE PREBUILT-CATALOG ANSWER ABOVE WAS WRONG ON ITS CENTRAL POINT, AND THE OWNER
FOUND IT ON HIS PHONE WITHIN THE HOUR — 2026-09-23.** *"But I said that the user can only
Retirar or Eliminar things he created, why am I still seeing the button for the already
existing products?"* ✅ **HE IS RIGHT, AND THE ERROR IS WORTH RECORDING BECAUSE OF ITS
SHAPE RATHER THAN ITS SIZE.**

⚠️⚠️ **WHAT WAS WRONG: A FACT ABOUT THE SCHEMA WAS ALLOWED TO STAND AS A FACT ABOUT HIS
SHOP.** The entry below says *"there are no default products, every product in every shop
is one somebody made, and every one of them is correctly deletable"*, and the evidence
offered for it was that no migration inserts a catalog row. **That evidence is true and
it does not support that conclusion.** A shop's products do not have to arrive through a
migration to exist — they arrive through the app, through the dashboard, through
whatever the owner does — and **he is looking at products he did not type in, with a
delete button on each one.** ⚠️ The grep was scoped to `supabase/migrations/` and the
claim was made about the world. ⚠️⚠️ **AND `supabase/seeds/00_skeleton.sql` BUILDS A
CATALOG, WHICH THAT GREP ALSO MISSED** — it seeds its own `ws_a`/`ws_b` and runs only on
`supabase db reset`, so it did not put these rows in his shop, **but a narrower search
that had found it would have stopped the wrong sentence being written.**

✅✅ **WHAT IS ACTUALLY TRUE, AND IT IS THE SAME SENTENCE FOR EVERY ORIGIN THOSE ROWS
COULD HAVE: `product_family` AND `product_variant` RECORD NOTHING ABOUT WHERE A ROW CAME
FROM.** There is no origin column on either table. So `Editar` **cannot tell** a product
that came with the catalog from one a shopkeeper typed in, and it was offering the
destructive control on all of them. **The rule he stated is not enforceable by any
amount of screen work** — it needs the database to know the answer.

✅ **SHIPPED IMMEDIATELY, AND IT IS ONE BLOCK OF JSX: THE RETIRE CONTROL IS DRAWN ON
NOTHING.** ⚠️⚠️ **THAT IS `canWriteCatalog`'s ARGUMENT APPLIED TO A ROW INSTEAD OF A
ROLE** — plainly absent beats looking live and doing the wrong thing, which is the shape
[[shift-cover-is-a-reassignment]] records and the one this app has now chosen four times.
While the screen cannot tell his products from the catalog's, **offering the control on
none of them is strictly better than offering it on all of them**: the cost is that he
cannot delete the ones he really did make, and the thing it buys is that he cannot delete
the ones he did not. ⚠️ **It is one block to put back**, and `ES.catalog.edit.retire*` is
kept in place for `6c` rather than deleted.

⚠️⚠️ **`6c` IS NOW THE ROW THAT RESTORES A CAPABILITY RATHER THAN ONE THAT ADDS A
FENCE**, which is a different row and is rewritten as one. ⚠️ **`5f` IS STILL MARKED
NEXT AND THAT IS A CALL, NOT AN OVERSIGHT**: the wrong button is gone, so nothing on the
phone is lying any more, and `6c` is no longer urgent — **but it now costs him deleting
anything at all, so if that matters more than Vender does, `6c` goes first and that is
his word to give.**

⚠️⚠️ **AND ONE QUESTION `6c` CANNOT ANSWER FROM THIS MACHINE — IT IS IN THE DECISIONS
BLOCK.** The marker is cheap; the BACKFILL is not, because it decides which of the rows
already in his shop become undeletable, and **an append-only migration is a poor place to
guess.** See the block.
