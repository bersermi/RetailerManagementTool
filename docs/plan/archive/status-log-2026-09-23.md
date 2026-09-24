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
