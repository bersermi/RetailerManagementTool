# Build plan

The live status of the build. Update this file as steps close — it is the one
place that answers "where are we?" after a context clear.

**Architecture:** [`docs/adr/ADR-035`](adr/ADR-035-target-architecture-postgres-react-native.md).
Where this file and the ADR disagree, the ADR wins and this file is the bug.

**New here, or not a developer?** [`docs/HANDBOOK.md`](HANDBOOK.md) explains the
tooling, the working loop, and where Claude is likely to be wrong.

**Stack:** Postgres (Supabase) + React Native (Expo). Mexico-based small retailers,
MXN, IVA. Spanish module names are the domain vocabulary: Comprar (buy), Vender
(sell), Productos (catalog), Proveedores (providers), Desperdicio (waste),
Números (reports).

**Not the stack:** Power Apps Canvas + Dataverse. That era stopped 2026-08-14 and
lives in [`archive/power-platform/`](../archive/power-platform/README.md), excluded
from the knowledge graph. Nothing there describes the system being built.

---

## Position

### ⛔ DECISIONS OWED BY THE OWNER

⚠️ **THIS BLOCK EXISTS SO NOBODY HAS TO REMEMBER ANYTHING.** Every session reads
`## Position` first, and the working prompt ends by asking what decision is needed — so a
decision parked here is re-offered **every session, automatically**, until it is ruled on.
⚠️ **It is the ONE home for open owner decisions**, and `docs/checks/plan-handover.sh`
refuses a second one, refuses a row that does not say what it blocks, and ⚠️⚠️ **refuses to
let a blocked task be marked as the next task.**

| Decision | Blocks | The brief, already written |
|---|---|---|
| ⚠️⚠️ **WHAT DOES `Costos` SHOW?** The ruling of 2026-09-22 was *"leave Costos dead until `5g`"* — **it said WHEN and it never said WHAT**, and this is the task that was charged with coming back for the word. ⚠️ **It is a deferral only if a row owes the answer**; this is that row, and this is that answer being asked for | `5g-iii`, and that child alone. ⚠️ **Neither of the other two children of that split waits on it**, and the one marked next is one of them | ⚠️⚠️ **THREE SCREENS FIT THE WORD AND THEY ARE NOT VARIANTS OF EACH OTHER.** ✅ **(a) THE LAST PRICE PAID AND TO WHOM** — one line per variant, straight off `provider_price_memory`, which is the read `5g-i` builds anyway. **Cheapest, and it answers *what does this cost me* the way a shopkeeper asks it.** ⚠️ **(b) A PER-PROVIDER COMPARISON** — the same variant across every provider who has ever delivered it, which is the question *am I buying this in the right place*. **It is the only one of the three that could change where she shops**, and it needs no new table either. ⚠️ **(c) A TRAILING SERIES** — what this has cost over time, which is `0032`'s `price_over_time` territory and is the one that says nothing until the pilot has weeks of deliveries in it. ⚠️⚠️ **MY RECOMMENDATION IS (a) NOW AND (b) NAMED AS A ROW, AND THE REASON IS NOT SIZE** — (a) is true on the first delivery and (b) is true on the second one from a second provider, so (a) is the only one that is not blank on the day the pilot starts. **(c) is worth deferring twice over**: §2.9 already owns *price over time* and a series over three deliveries is a chart that lies. ⚠️ **What no session can settle: whether `Costos` is a SHEET on La Familia or a screen of its own.** §2.11 fences that out of every suite here and he has the app in his hand |
| ⚠️ **IS THE GENERIC PROVIDER CALLED `Compra directa` OR `Genérico`?** ⚠️⚠️ **THIS IS NOT A GAP — IT IS A DISAGREEMENT BETWEEN THIS PLAN AND THE APPLIED SCHEMA, FOUND BY `5g`'s SIZING AND MEASURED LIVE ON 2026-09-24.** F6 says *"a provider named `Genérico` must be seeded in every workspace"*; `onboard_workspace` has seeded one since `0002` on 2026-08-26, carried forward unchanged through `0027` and `0034`, **and it is named `Compra directa`** | The header string on Comprar — **and nothing in the tables below, which is the point.** The screen renders whatever the row is called, so **no code waits on this and it goes quietly wrong instead.** ⚠️ **This cell names no task on purpose**: it is machine-read, and `4.6b` spent a day red because a *Blocks* cell wrote reassurance into it | ⚠️⚠️ **IT IS FREE TODAY AND IT IS A MIGRATION TOMORROW, WHICH IS WHY IT IS BEING ASKED NOW RATHER THAN WHEN SOMEBODY NOTICES.** The seed lives inside an applied `security definer` function, so changing it later is a fix-forward migration **plus** an `update` over live rows — and by then a shop's deliveries point at a provider called something the header no longer says. ⚠️ **The substance of F6 is already satisfied** and no child of `5g` owns it: `purchase.provider_id` is `not null` and `record_purchase` raises *"a delivery has a counterparty"* without one, so what F6 really requires is that the ROW exist — and it does. **What is in dispute is a string a shopkeeper reads in `Comprando a:` every time she records a delivery.** ⚠️⚠️ **MY RECOMMENDATION IS `Compra directa`, and the argument is not inertia.** `Genérico` is a category name — it describes the ROW to whoever built the schema. `Compra directa` describes **what she did**: she bought it directly, at the market, this morning. `0002`'s own comment is that sentence (*"I bought this at the market this morning"*), so the applied schema is already the more careful of the two and **F6 is the stale copy, not the database.** ⚠️ **Either way this block gets the answer and the plan stops carrying both** |
⚠️⚠️ **TWO ARE OWED AS OF 2026-09-24. BOTH CAME OUT OF `5g`'s SIZING, NEITHER BLOCKS THE TASK
MARKED NEXT, AND THE SECOND IS THE FIRST ROW THIS BLOCK HAS EVER CARRIED THAT IS A DISAGREEMENT
BETWEEN THIS PLAN AND A MIGRATION CI HAS APPLIED** rather than a choice between two things a
session could build. ⚠️ **The first is not new work either — it is the word `5g` was charged
with coming back for on 2026-09-22**, arriving on schedule, which is the whole shape a deferral
is supposed to have.
~~✅✅✅ nothing is owed as of 2026-09-24, and the empty table above is deliberate — for the
eleventh time in this project's life.~~ — ⚠️ **struck in lower case deliberately, the rule
`5b.8-i`'s row records: `plan-handover.sh` reads the raw line and a strikethrough is only a
rendering.** ⚠️ **TWENTY-ONE decisions have now been parked and
cleared here, and the twenty-first spent about two hours in the table** — the first one the
OWNER ASKED FOR rather than one a session parked, and the first answered with a list rather
than a sentence.

✅✅ **THE TWENTY-FIRST RULING, IN FULL, BECAUSE THE TABLE IT WAS IN IS NOW EMPTY —
2026-09-24: *"We'll go with Option A with the barra."*** **And four more things with it, every
one of them from him looking at the running app rather than at a description.**

⚠️⚠️ **(1) THE BAR IS ARRANGEMENT A, AND HE ADDED A BEHAVIOUR THE PROPOSAL DID NOT HAVE:**
*"when the user slides to complete the transaction, make the slider fill along with the finger
swipe."* **The fill is what turns a knob that moves into a gesture with a state** — at any
moment the amount of green is how much of the sale has been agreed to. ⚠️ **It is drawn as a
`translateX` under `overflow: hidden`, never as a growing `width`**, because a width is a
LAYOUT change every frame and §2.11's motion rule exists for the two low-end Androids in C1.1.
**The picture is identical and the frame cost is not.**

✅ **(2) THE DISTINCTION BETWEEN PRODUCTS AND UNITS IS RIGHT AS SHIPPED** — *"your logic right
now is good at showing not the item number but the distinct item number."* `ES.sell.lines`
counts LINES, so eight huevos and three kilos read as *2 productos*. **Nothing changed; it is
recorded because a confirmation is evidence and the next session should not re-litigate it.**

⚠️⚠️ **(3) THE EMPTYING CONFIRMATION IS A CENTRED BOX WITH ITS OWN SCRIM, AND THE INLINE STRIP
`5f-iii-a` SHIPPED IS REFUSED:** *"is should be a separate box in the center of the screen with
it's scrim with a confirmation message '¿Seguro de que quieres vaciar el carrito? Si, vaciar /
Cancelar'. If the person confirms, the confirmation message and animation should be shown
there… If the person hits Cancelar in that confirmation screen then we just roll back that
message and scrim and show the Carrito as previously."* ✅ **All three halves are built as
stated**, and the animation he liked is unchanged — *"it is very nice how it looks in the
current animation and fast enough, just show it there."* ⚠️ **It is a sibling of the sheet
inside ONE `Modal`, not a second one**: nested modals on iOS animate against each other and the
inner one owns the whole screen.

⚠️⚠️ **(4) THE SHEET'S HEIGHT IS FIXED:** *"let's just make the height of the carrito fixed and
we just display the items there regardless of the number of items."* ⚠️ **The reason it is
better is muscle memory rather than tidiness, and it is worth writing down**: with a fixed card
`Vaciar carrito` and the slide are in the SAME PLACE on every sale, so the thumb that reaches
for them at a counter does not have to look first. **The cost he took is a mostly-empty card on
a one-line basket.**

⚠️⚠️ **(5) THE SLIDE IS IN THE SHEET TOO:** *"The slide bar should also be present in the check
out if we open the Carrito, to the right of the Vaciar Carrito option, of course it will be
shorter than the big one in the default version but it should also show there to confirm the
transaction."* ✅ **The same `Deslizador`, narrower** — one control and one answer to *how far
is far enough*, which is what `COMMIT_AT` is for. **It makes the review screen a step in the
sale rather than a detour from it**, which is the half of §2.8's *review before commit* the
first drawing missed.

⚠️ **What the ruling did NOT settle, and no session may assume it either way:** whether 168 pt
of bar is too much of the list on a real morning's catalog. **He has the app in front of him
and did not say**, which is not an answer and is not a gap — it is a question that gets asked
again the first time a shop's catalog is long.
~~✅✅✅ nothing is owed as of 2026-09-24, and the empty table above is deliberate — for the
tenth time in this project's life.~~ — ⚠️ **struck in lower case deliberately, the rule
`5b.8-i`'s row records: `plan-handover.sh` reads the raw line and a strikethrough is only a
rendering.** ⚠️ **TWENTY decisions had been parked and cleared
here, and the twentieth spent about half an hour in the table.**

✅✅ **THE TWENTIETH RULING, IN FULL, BECAUSE THE TABLE IT WAS IN IS NOW EMPTY — 2026-09-24:
*"Fix the form and delete and remake them."*** **Both halves of the recommendation, taken as
recommended: `unitColumns` writes the dimension's base, and the rows already in his shop are
deleted rather than repaired by a migration.** ⚠️⚠️ **IT IS THE SECOND DECISION IN THIS BLOCK
ABOUT LIVE DATA RATHER THAN A DESIGN, and like the first it was cheaper than it looked for a
reason only he could supply** — the rows are *"merely indicative"*, so deleting them costs
nothing and a backfill migration would have been an expensive answer to a cheap problem
([[tienda-decisions-need-shop-truth]]).

⚠️⚠️ **WHAT THE RULING DOES NOT SETTLE, AND IT IS NAMED HERE RATHER THAN ASSUMED: HE CANNOT
DELETE THEM IN THE APP.** `Editar`'s retire control is drawn on nothing until `6c` mints the
origin marker, so *delete and remake* has no affordance behind it — the deletion ships as
`docs/runbooks/delete-unsellable-products.sql`, pasted into the Supabase SQL editor, ending in
`rollback` until he changes one line. ⚠️ **It is NOT a migration and its header says why**: it
repairs one shop's accident once, and `supabase/migrations/` describes the schema.
~~⚠️⚠️ one is owed as of 2026-09-24. it came out of the owner looking at `5f-ii` on his own
phone, it is the second decision in this block that is about live data rather than a design,
and it does not block the task marked next.~~ — ⚠️ **struck in lower case deliberately, the
rule `5b.8-i`'s row records: `plan-handover.sh` reads the raw line and a strikethrough is only a
rendering.** ⚠️ **NINETEEN decisions have now been parked and cleared
in this block, and the eighteenth and nineteenth were parked and ruled inside four hours** —
both out of `5f`'s sizing, both answered in one message.

✅✅ **THE TWO RULINGS, IN FULL, BECAUSE THE TABLE THEY WERE IN IS NOW EMPTY — 2026-09-24.**

⚠️⚠️ **(1) THE QUANTITY CONTROL: *"Amend it to say both, this should be easily switchable and
configurable. The step for the stepper and essentially any product qty can be set by keypad.
If a user wants to sell 15 manojos of cilantro, he shouldn't have to click the stepper 14
times."*** **ADR-035 §2.8 and §2.11 are amended** — the control is not a switch, every product
carries a stepper AND a keypad. ⚠️⚠️ **AND HE REVERSED THE HALF OF THE RECOMMENDATION THAT HAD
BEEN CALLED SAFE, WHICH IS THE FOURTH TIME A RULING HERE HAS ANSWERED A LARGER QUESTION THAN
THE ONE ASKED.** The brief argued *nothing is lost — a discrete unit gets no keypad, because
there is no 288th of a `pza`.* **True, and beside the point: a keypad is about MAGNITUDE.**
Fifteen manojos of cilantro is fifteen taps, and the tap budget §2.8 exists to protect was
about to be spent on the one product shape the brief had reasoned its way past. ⚠️ **The
ambiguity in *configurable* is recorded rather than resolved on his behalf**: the step IS the
price unit's factor and he already picks that unit per product, so *configurable* needs no new
affordance — **a step set INDEPENDENTLY of the price unit is a different thing and `5f-ii`'s
row says it is not being built.**

⚠️⚠️ **(2) THE COUNTER DISCOUNT: *"Let's not do those discount controls part of the pilot yet,
we will need to understand the interactions before creating anything like that. Any money
'knock-off' happens in her head and is out of the scope of the app for now."*** **The answer is
NO and `5f-iv` is deferred out of the pilot.** ⚠️⚠️ **IT KILLED MORE THAN THE QUESTION ASKED AND
THAT IS FLAGGED RATHER THAN ABSORBED: C3.16's *reset-after-each-transaction* SETTING IS THE SAME
AFFORDANCE**, a sale-only override expressed as a switch rather than as a tap — so the ruling
strikes it, and the discreet Home banner that existed only to announce it. **If he meant to keep
the setting and refuse only the per-tap control, that is one sentence and it comes back.**
⚠️ **What survives untouched:** a price change persists, `Editar` is where one is made, and
C3.17's manager fence is unchanged. ⚠️ **The row is deferred and NOT deleted**, because *"we
will need to understand the interactions"* is a deferral with a condition on it — the shape
`Costos` already has.
~~✅✅✅ nothing is owed as of 2026-09-24, and the empty table above is deliberate — for the
eighth time in this project's life.~~ — ⚠️ **struck in lower case deliberately, the rule
`5b.8-i`'s row records: `plan-handover.sh` reads the raw line and a strikethrough is only a
rendering.** ⚠️ **SEVENTEEN decisions have now been parked and
cleared in this block, and the seventeenth spent about an hour in the table.**

✅✅ **THE BACKFILL RULING, IN FULL, BECAUSE THE TABLE IT WAS IN IS NOW EMPTY — 2026-09-24:
*"Let's follow your recommendation."*** **Everything that exists in a shop when the marker
ships is NOT the shopkeeper's and cannot be deleted; everything created through `Agregar`
afterwards is his and can be.** ⚠️⚠️ **AND HE GAVE THE REASON THE QUESTION WAS CHEAPER THAN
IT LOOKED, WHICH NO SESSION COULD HAVE KNOWN FROM THIS MACHINE:** *"this part here is merely
indicative for us to keep progressing on our Front End."* **The rows in his shop today are
scaffolding for looking at screens, not a shop's real catalog** — so the conservative
backfill costs him nothing at all, and the decision that read as *which of your products do
you lose* was really *none of them matter yet*. ⚠️ **That is the third time a shop fact has
changed the weight of a decision this repository had sized correctly on its own terms**
([[tienda-decisions-need-shop-truth]]).

⚠️⚠️ **WHAT HE WAS ACTUALLY ASKING FOR, AND IT IS A DIFFERENT AND LARGER THING THAN THE
BACKFILL:** *"What I wanted to be sure is we can effectively distinguish between default
products and those each user creates."* **He was not asking for the fence to be built — he
was asking whether the design can express the distinction at all.** ✅ **It can, it is
additive, and nothing in the applied schema stands in its way**; what it needs is written
into `6c` and the two things that would have gone in wrong are written there with it.

~~one is owed as of 2026-09-23 — the backfill above — and it blocks only half of one
row.~~ — ⚠️ **struck in lower case deliberately, the rule `5b.8-i`'s row records.** It came out of the owner finding a wrong button on his phone an hour after the
ruling that created it, and ⚠️⚠️ **IT IS THE FIRST DECISION IN THIS BLOCK THAT IS ABOUT
LIVE DATA RATHER THAN ABOUT A DESIGN.** Every one of the sixteen before it chose between
two things a session could have built; this one chooses what happens to rows that already
exist in a shop somebody is using, and it cannot be looked up because nothing recorded it.
~~nothing is owed as of 2026-09-23, and the empty table above is deliberate — for the
eighth time in this project's life.~~ — ⚠️ **struck in lower case deliberately, the rule
`5b.8-i`'s row records.** ~~✅✅✅ **NOTHING IS OWED AS OF 2026-09-23, AND THE EMPTY TABLE ABOVE IS DELIBERATE — FOR THE
EIGHTH TIME IN THIS PROJECT'S LIFE.**~~ ⚠️ **SIXTEEN decisions have now been parked and cleared in
this block, and the sixteenth spent about ninety minutes in the table** — parked by `5e-iii-b`'s
retirement control and answered the same evening, on the phone it shipped to.

✅✅ **THE SIXTEENTH RULING, IN FULL, BECAUSE THE TABLE IT WAS IN IS NOW EMPTY — 2026-09-23.**
Asked: *a retired product cannot be brought back from anywhere in the app. Should it be able to
be, and is that even a thing a shop does?* ⚠️⚠️ **HE ANSWERED A LARGER QUESTION THAN THE ONE
ASKED, WHICH IS THE THIRD TIME THAT HAS HAPPENED ON THIS PROJECT AND THE SECOND THIS WEEK.**
*"I took the decision to start working with prebuilt catalogs. The user can still create new
Familias and Productos and they can delete those disappearing from the Product Catalog but
persisting in the transactions and other historical parts. But the default products cannot be
deleted and it doesn't really make sense at this point to disable them or anything else."*
⚠️ **SO THE HOLE IS NOT A HOLE: deletion is ONE-WAY BY DESIGN**, and the answer to *should it
come back* is no. The recommendation this block carried — surface a retired product in the search
with *Reactivar* — **is withdrawn rather than deferred**; nothing is owed it and no row inherits
it. ✅ **What shipped needed one string**: `ES.catalog.edit.retireOnce` said *"Por ahora no se
puede volver a activar desde la app"*, and *por ahora* described a gap waiting to be closed. It
now says **`Esto no se puede deshacer.`** ⚠️⚠️ **AND THE HALF THAT IS NOT YET BUILDABLE IS
`C8.2b` AND `6c`, NOT THIS BLOCK**: *default products cannot be deleted* is unenforceable today
because nothing marks one and no migration seeds one, so it is a row with a size on it rather
than a question with a date. ⚠️ **ADR-035's catalog section carries the rule**, which is the
fifth ADR amendment folded into the work that raised it.
~~nothing is owed as of 2026-09-23, and the empty table above is deliberate — for the
seventh time in this project's life.~~ — ⚠️ **struck in lower case deliberately, the rule
`5b.8-i`'s row records.** ~~✅✅✅ **NOTHING IS OWED AS OF 2026-09-23, AND THE EMPTY TABLE ABOVE IS DELIBERATE — FOR THE
SEVENTH TIME IN THIS PROJECT'S LIFE.**~~ ⚠️ **FIFTEEN decisions have now been parked and cleared in
this block, and the fifteenth spent about two hours in the table** — parked by `5e-iii`'s sizing
and ruled the same evening. ⚠️⚠️ **IT WAS THE FIRST ONE HERE THAT WAS A CONTRADICTION RATHER
THAN A QUESTION**, and that is worth keeping: the other fourteen asked the owner to choose, and
this one told him two things he had already written down disagreed.
~~one is owed as of 2026-09-23, it came out of `5e-iii`'s sizing, and it is the first
one here that is a contradiction rather than a question — the owner's own C3.17 against the
schema that has been applied since 2026-08-26. it does NOT block the task marked next.~~
— ⚠️ **struck in lower case deliberately, the rule `5b.8-i`'s row records.**

✅✅ **THE C3.17 RULING, IN FULL, BECAUSE THE TABLE IT WAS IN IS NOW EMPTY — 2026-09-23:
*"leave the fence as is."*** **The database stays manager-and-above on all three
`price_list` policies and on `product_variant_update`, and C3.17 has been corrected rather
than left standing**: its closing sentence claimed *"it is client-side only; no schema depends
on it"*, which was false from the day `0002` applied and is now struck, with the measurement
beside it. ⚠️⚠️ **WHAT IT DISCHARGED: `5e-iii-b` WAS UNGATED BY IT, SHIPPED THE SAME DAY,
AND IT UNBLOCKED `5f` — ⚠️⚠️ **CORRECTED TWICE ON 2026-09-24, AND THE SECOND CORRECTION
IS THE ONE WORTH KEEPING: THIS SENTENCE NO LONGER SPELLS THE MARKER AT ALL.** It said
`5f` carried it; `5f` was sized and split four ways that morning, so it said `5f-i`
instead; `5f-i` shipped the same day. ⚠️ **A prose line that names whichever row is
first in the queue goes stale every time the queue moves — and `plan-handover.sh` reads
the FIRST line in this file that spells its sentinel, so this paragraph was answering a
question about the status log.** ✅ **The tables below are the one place that says which
row is next, which is what that check exists to guarantee.** `Editar`
is drawn manager-only, which is `5e-ii`'s treatment of the create control applied to the edit
one, and the amber question resolved the same way — *the fix is one tap away* is true for the
people who can make the tap, so the dash on La Familia is **amber for a manager and quiet for a
cashier**, and Productos keeps the quiet one on every row. ⚠️⚠️ **WHAT IT DOES NOT DISCHARGE, AND NO SESSION MAY ASSUME IT
EITHER WAY:** whether Vender offers a cashier a price override **for this sale only**, one
that never writes `price_list`. That is a different affordance, it is entangled with C3.16's
*a price change persists by default*, and **`5f`'s row is what owes it** — the same shape as
`Costos` being *deferred to the row that can answer it* rather than dropped.
~~nothing is owed as of 2026-09-22, and the empty table above is deliberate — for the
sixth time in this project's life.~~ — ⚠️ **struck in lower case deliberately, the rule
`5b.8-i`'s row records: `plan-handover.sh` reads the raw line and a strikethrough is only a
rendering.** ⚠️ **FOURTEEN decisions have now been parked and cleared in
this block, and the fourteenth spent about half an hour in the table** — parked by `5e`'s sizing and
ruled the same evening. ~~one is owed as of 2026-09-22, it came out of `5e`'s sizing, and it blocks the
last of that split's three children and nothing else.~~ — ⚠️ **struck in lower case deliberately,
the rule `5b.8-i`'s row records: `plan-handover.sh` reads the raw line and a strikethrough is only a
rendering.**

✅✅ **`Costos` — RULED 2026-09-22: *"Leave Costos dead until 5g."*** **The recommendation in
full, including the ordering.** ⚠️⚠️ **WHAT IT DISCHARGES AND WHAT IT DOES NOT.** It
unblocks `5e-iii`, which is now ungated. It does **not** make `Costos` disappear: the button
`5d-iii` shipped stays on La Familia, drawn dead, with `ES.family.notYet` under it — **the
alternative was deleting it, and that was refused for `5d-iv-b`'s Proveedores reason**, a shop
that has seen an affordance and then seen it vanish has been told its app is shrinking.
⚠️ **The owner did NOT say what `Costos` shows, and that is not a gap — it is the ruling's
shape.** *Until `5g`* means the question is re-asked when purchase cost exists to answer it, by
the task that creates it. **`5g` is now the row that owes the word**, and its own cell says so,
which is the whole difference between a deferral and a drop. ⚠️ **THIRTEEN decisions have now been parked and cleared in this block, and the thirteenth was parked and ruled inside the same hour** — the owner ran `supabase login` himself, confirmed the ref, and pushed: ***"done, it's the right project."*** **`0001`–`0038` are applied to `hweutzjhzvioswnjzqki` and `supabase migration list` shows local and remote identical, row for row.** ~~⚠️⚠️ one is owed as of 2026-09-22, it came out of the owner's own phone, and it blocks no row in the tables below — it blocks him seeing anything.~~ — ⚠️ **struck in lower case deliberately, the rule `5b.8-i`'s row records.** The table above was empty for the fourth time this morning and it is not any more: Productos hung on *Cargando productos…* on his phone, and the read behind it cannot succeed because **the hosted project has no schema at all**. ⚠️ **THIRTEEN decisions have now been parked in this block.** ~~✅✅✅ nothing is owed as of 2026-09-22, and the empty table above is deliberate — for the fourth time in this project's life.~~ — ⚠️ **struck in lower case deliberately, the rule `5b.8-i`'s row records.** ⚠️ **TWELVE decisions have now been parked and cleared in
this block**, and the twelfth — ADR-035 §2.8's Home row — **was parked and ruled inside the same
day, in two halves, the second of them after the owner asked what the implications were.**
~~one is owed as of 2026-09-22, it arrived with `5d`'s sizing, and it blocks only the last of that
split's four children.~~ ~~nothing is owed as of 2026-09-22, and the empty table above is
deliberate — for the third time in this project's life.~~ — ⚠️ **struck in lower case
deliberately, the rule `5b.8-i`'s row records.**

✅✅ **THE §2.8 RULING, IN FULL, BECAUSE THE TABLE IT WAS IN IS NOW EMPTY.** **(a) *"Let's drop it
for the pilot then."*** — Inicio shows nothing expiring within 48 hours; `7e` derives shelf life
later from records the shop already produces, and the cost of that (weeks of records before it
says anything) is the owner's, taken twice. **(b) *"Let's keep it Home Only."*** — ⚠️⚠️ **the
third answer, and neither of the two the ADR's sentence framed.** §2.8 said permanent failures
*"do not appear on Home at all"*; `5c-iv-b` had shipped a banner on EVERY screen; the ruling is
**Inicio and nowhere else** — the screen somebody opens between customers, rather than the three
that are in use mid-sale. ⚠️ **It changed shipped code**: `onHome` in `@/offline/deadLetters`,
four assertions, and ADR-035 §2.8 amended in both halves. ⚠️ **What it does NOT discharge is
§8's alerting destination and its owner**, still due before the pilot ends — a banner on Home
makes a vendor-side gap feel handled, and during the pilot the only thing standing in for it is
the schema owner being in the shop.

✅ **THE SQLSTATE MINT — RULED 2026-09-22: *"Let's follow your recommendation."***
**Yes, mint it, and as its own small task AFTER `5c-iv`** — which is the recommendation
in full, including the ordering. ⚠️⚠️ **IT IS NOW A TASK RATHER THAN A QUESTION: `5b.9`,
below**, sized `S`, shipping **`0038`** — the fourth migration of step 5 and the second
that mints nothing but codes. ⚠️ **It is deliberately NOT marked next and must not be
folded into anything**: `5c-iv-a` ships no migration at all, and *"one migration over two
unrelated functions is harder to falsify and harder to revert"* is this project's own
recorded refusal — the reason the row gave for not folding it into `5b-iii-c` either.
⚠️ **The precedent is exact and it is eleven days old**: `0036` minted `TD004`/`TD005` for
the identical arrangement `5b-ii-b-2` shipped, on the same reasoning the owner gave on
2026-09-18 — **cheap now, dearer once a second caller depends on it.** ⚠️ **And the guard
that goes red the day it is fixed already exists**, in `docs/checks/5b-iii-b-request-contract.sh`,
which asserts the overload is still indistinguishable — so `5b.9` closes by turning a
standing check from green to red and rewriting it, rather than by adding one.

✅✅✅ **ALL THREE OF THE ROUND-THREE QUESTIONS ARE NOW RULED — the last on 2026-09-22 —
AND THE TABLE IS BACK TO THE ONE DECISION THAT BLOCKS NOTHING.** Fourteen days unasked,
then three rulings in two days, which is the whole argument for the block they were
moved into.

✅ **ADR-035 §2.11's CONNECTIVITY ROW — RULED 2026-09-22, THE SAME DAY IT WAS RAISED:
*"Let's follow your recommendation."*** **§2.11's stack table gains a row naming
`expo-network`, and it is a DELIVERABLE of `5c-ii-b-2` rather than a task.** ⚠️ **The
fold is the ruling's substance, not a detail** — the row describes a module that task
builds, so writing both in one sitting is what makes the sentence checkable;
[[process-must-not-outgrow-product]] is why it was not given a session. ⚠️⚠️ **AND
THE ROW MUST CARRY THE BOUND, NOT ONLY THE NAME**: the reading that chose
`expo-network` was taken on a SIMULATOR whose network is the host's, so *"netinfo never
recovered"* is a simulator finding and a real iPhone may not do it. **A stack-table row
that states the choice without its evidence is the stale-copy shape this repository has
recorded eight times.** ⚠️ **This is the FOURTH ADR amendment folded into the task that
raised it** — after §2.9, §3's `5h.5` and §2.7's sentence — and the third ruled
inside a day.

✅ **ÁREA 6 — RULED 2026-09-22: *"Let's follow your advice."*** **The undo is built.**
⚠️ **Two contract details a screen must not invent, both verified against the applied
schema on 2026-09-22:** the window is `workspace_setting.void_window_minutes` — `not
null default 15`, constrained `between 0 and 1440`, **owner-writable** — and `0001:561`
says in terms that *"the client reads `void_window_minutes` to render correctly"*, so
**a screen that hardcodes 15 is wrong the first time a shop changes it.** And
`void_transaction(p_kind, …)` accepts **`purchase`, `sale` AND `waste`**, so this is
one affordance serving three screens rather than a Vender feature — `5h` builds it and
`5g`/`6a` reuse it. ⚠️ **The fence is a ROLE BOUNDARY, not a deadline**, which is what
the first wording got wrong: a cashier may undo their own document inside the window; a
manager or owner may undo anything, at any time, with no window at all.

✅ **ÁREA 5 — RULED: *"Do not display anything yet, we can implement the change
calculation later."*** No receipt, no customer-facing screen, and ⚠️ **change
calculation is DEFERRED rather than refused** — the recommendation argued for it and
the owner took the smaller thing, which is the third time that has happened on this
project. ⚠️⚠️ **AND HE REPLACED IT WITH SOMETHING THE QUESTION NEVER ASKED ABOUT:**
*"a simple confirmation animation if the sale is done and another one if we empty the
carrito."* **That is now a deliverable of `5f`** — see its row, and the two
constraints that are NOT negotiable: §2.11's motion rule (**`transform` and `opacity`
only**, because C1.1 puts two low-end Androids among the pilot's phones), and
⚠️⚠️ **the confirmation fires on ENQUEUE, never on the server's reply** — C10.3, which
`5c-i` made structural by having `queueWrite` return a row rather than a promise. **An
animation that waits for Postgres is the offline path looking different, which is the
one thing that whole design exists to prevent.**

✅ **ÁREA 7 — RULED: *"We will not capture expiry date for now"***, because the owner
intends to **derive** shelf life from the pilot's own records instead. ⚠️⚠️ **THIS
CHANGED A TASK RATHER THAN JUST CLOSING A QUESTION: `7e` was written to READ a captured
`expiry_date` and has been rewritten to derive the same answer from shelf age, sale
velocity and observed time-to-waste** — none of which needs a new field. See `7e`.
⚠️ **The cost is named on that row: a derived shelf life needs WEEKS of waste records
before it says anything**, where a typed date would have worked on day one.

⚠️ **ONE REMAINS OWED AS OF 2026-09-22 AND IT BLOCKS NOTHING** — the SQLSTATE mint,
above. ~~two are owed as of 2026-09-22 and neither blocks anything~~ — the ADR §2.11
connectivity row `5c-ii-b-1` raised was **ruled the same day it was raised** and is now a
deliverable of `5c-ii-b-2`, not a question. ⚠️ **TEN decisions have now been parked and
cleared in this block**, and this one spent under an hour in the table. ~~one remains owed
as of 2026-09-22 and it blocks nothing~~ — struck in lower case deliberately, the rule
`5b.8-i`'s row records. ~~two remain owed, and one of them still blocks the pilot's most important
screen~~ ~~four are owed as of 2026-09-21, and three of them block the pilot's two most
important screens~~ — struck in lower case deliberately, the rule `5b.8-i`'s row
records. ~~one is owed as of 2026-09-19, and it blocks nothing~~ — struck
in lower case deliberately, the rule `5b.8-i`'s row records. ⚠️⚠️ **THE THREE NEW ROWS
ARE NOT NEW QUESTIONS. They were raised on 2026-09-07 by the UI/UX grill, recorded in
a round-three table near the bottom of Step 5, and left there** — outside the one
block this file guarantees is re-offered every session. They sat unasked for fourteen
days while the work that depends on them got closer. ⚠️ **That table has now gone
stale in a second way too**: its área 9 row still says *"GATES `4.6c`"*, and área 9 was
answered on 2026-09-14 and `4.6c` shipped `0031`–`0033`. **A question parked outside
this block is a question nobody is re-offered — which is the block's entire argument,
demonstrated against the block itself.** ~~✅✅✅ NOTHING IS OWED AS OF 2026-09-19, AND THE EMPTY TABLE ABOVE IS DELIBERATE.~~ **The 2026-09-19 ruling below stands and is unaffected.**

✅✅✅ ~~**NOTHING IS OWED AS OF 2026-09-19, AND THE EMPTY TABLE ABOVE IS DELIBERATE.**~~ The row parked on 2026-09-18 — *does the approver see the requester's NAME?* — **was RULED on 2026-09-19: *"Show the Email as a Header and the Name as a subtitle of the request."*** ⚠️ **NINE decisions have now been parked and cleared in this block within four days**, and this is the second time the table has emptied twice. ⚠️⚠️ **AND THIS ONE IS THE BLOCK'S OWN ARGUMENT, MADE IN ONE MOVE.** `5b.8-ii` was charged by its own row with retiring TWO sentinels. It measured the second instead of retiring it by analogy, found the outcome still true on a dead premise, and **parked the question rather than taking it** — which is the whole difference between a decision the owner made and a consequence a session assumed on his behalf. It was ruled the next day, and the ruling **reversed** what a session would have concluded either way: not *"leave it as email"* and not *"replace it with the name"*, but **both, in a stated order.** ~~ONE IS OWED AS OF 2026-09-18, AND IT DOES NOT BLOCK THE TASK MARKED NEXT.~~ ~~NOTHING IS OWED AS OF 2026-09-18, AND THE EMPTY TABLE ABOVE IS DELIBERATE.~~ The last row — *what are the Números questions?* — **was RULED on 2026-09-18 and the table is empty for the second time in this project's life.** ⚠️ **EIGHT decisions have now been parked and cleared in this block within three days.** ~~ONE IS OWED AS OF 2026-09-18, AND IT DOES NOT BLOCK THE NEXT TASK.~~ ~~TWO ARE OWED AS OF 2026-09-18, AND NEITHER BLOCKS THE NEXT TASK.~~ **The second — the ADR §2.7 amendment `5b-ii-b`'s sizing raised — was parked on 2026-09-18 and RULED THE SAME DAY: *"fold it into 5b.8."* It is now a DELIVERABLE of that task's row and no longer a question, which is the third §2.7 sentence `5b.8` owes. ⚠️ SEVEN decisions have now been parked and cleared in this block within two days.** ~~TWO ARE OWED AS OF 2026-09-18.~~ **The second — the ADR §3 amendment `5b.5` raised — was parked on 2026-09-18 and RULED THE SAME DAY: *"amend ADR-035 §3 to say 5h.5"*. ⚠️ SIX decisions have now been parked and cleared in this block within two days**, which is what it is for. ~~TWO ARE OWED AS OF 2026-09-17, AND NEITHER BLOCKS THE NEXT TASK.~~ **The `Quitar` undo was parked on 2026-09-16 and RULED ON 2026-09-17 — no undo. See *"NO UNDO, AND THE QUESTION HAD BEEN PARKED AGAINST THE WRONG TASK"* below.** The one that remains came out of the aesthetic round too, and it is recorded here rather than in the model's memory, which is the entire point of this block. ~~NOTHING IS OWED AS OF 2026-09-14, AND THE EMPTY TABLE IS DELIBERATE.~~ ~~ONE IS OWED, AND IT ARRIVED WITH `5b`'S SIZING.~~ **The member-identity question that `5b`'s split raised was parked here and RULED THE SAME DAY — see *"THE MEMBER SCREEN SHOWS AN EMAIL"* below. ⚠️ FIVE decisions have now been parked and cleared in this block on one date.** ~~ONE IS OWED, AND IT ARRIVED WITH `0030`.~~ **The dead-letter read that `4.6b` The last row — *what are the Números questions?* — **was RULED on 2026-09-18 and the table is empty for the second time in this project's life.** ⚠️ **EIGHT decisions have now been parked and cleared in this block within three days.** ~~ONE IS OWED AS OF 2026-09-18, AND IT DOES NOT BLOCK THE NEXT TASK.~~ ~~TWO ARE OWED AS OF 2026-09-18, AND NEITHER BLOCKS THE NEXT TASK.~~ **The second — the ADR §2.7 amendment `5b-ii-b`'s sizing raised — was parked on 2026-09-18 and RULED THE SAME DAY: *"fold it into 5b.8."* It is now a DELIVERABLE of that task's row and no longer a question, which is the third §2.7 sentence `5b.8` owes. ⚠️ SEVEN decisions have now been parked and cleared in this block within two days.** ~~TWO ARE OWED AS OF 2026-09-18.~~ **The second — the ADR §3 amendment `5b.5` raised — was parked on 2026-09-18 and RULED THE SAME DAY: *"amend ADR-035 §3 to say 5h.5"*. ⚠️ SIX decisions have now been parked and cleared in this block within two days**, which is what it is for. ~~TWO ARE OWED AS OF 2026-09-17, AND NEITHER BLOCKS THE NEXT TASK.~~ **The `Quitar` undo was parked on 2026-09-16 and RULED ON 2026-09-17 — no undo. See *"NO UNDO, AND THE QUESTION HAD BEEN PARKED AGAINST THE WRONG TASK"* below.** The one that remains came out of the aesthetic round too, and it is recorded here rather than in the model's memory, which is the entire point of this block. ~~NOTHING IS OWED AS OF 2026-09-14, AND THE EMPTY TABLE IS DELIBERATE.~~ ~~ONE IS OWED, AND IT ARRIVED WITH `5b`'S SIZING.~~ **The member-identity question that `5b`'s split raised was parked here and RULED THE SAME DAY — see *"THE MEMBER SCREEN SHOWS AN EMAIL"* below. ⚠️ FIVE decisions have now been parked and cleared in this block on one date.** ~~ONE IS OWED, AND IT ARRIVED WITH `0030`.~~ **The dead-letter read that `4.6b`
raised was parked here and RULED THE SAME DAY — see *"THE DEVICE REMEMBERS ITS OWN
FAILURE"* below.** ⚠️ **Four decisions have now been parked and cleared in this block on one
date**, which is what it is for. The three
decisions parked here that morning — gross-or-net revenue, whether a cashier sees revenue,
and the ADR amendment §2.9 needed — were all ruled the same day: **gross, leave it, amend it.**
⚠️ **The block STAYS when it empties**: `plan-handover.sh` says in its own comment that zero
open decisions is *"a legitimate and desirable state"* and that deleting the block is what it
refuses, because the block is the only thing that guarantees the next one gets re-offered.

✅ **AND THE EMPTIED BLOCK WAS PROVED TO STILL GUARD, NOT MERELY TO STILL PASS.** An empty
region is exactly where a check goes vacuous, so a copy of this file was given one row naming
the next task and `plan-handover.sh` went **red** — *"4.6b is marked as the next task, and the
decisions-owed block says it is blocked"*. **Zero rows is a state, not a disarmed assertion.**

**Four falsifications over the block itself** (`plan-handover.sh`, assertions 7a–7c):

| Fixture | The edit | Result |
|---|---|---|
| **V1** | The block deleted | 🔴 *"it is the one place an open owner decision is guaranteed to be re-offered"* |
| **V2** | A second block added elsewhere | 🔴 *"a second home is how one of them goes stale"* |
| **V3** | A row stops naming what it blocks | 🔴 — a decision nobody is waiting on is how *"later"* becomes *"never"* |
| **V4** | ⚠️⚠️ **`4.6a` marked as the next task while register #9 is open** | 🔴 *"taking it writes code against a guess — and if it is a migration, an automated merge deploys that guess"* |
| **W1** | ⚠️⚠️ **A REAL open decision naming the next task**, added 2026-09-13 when the one above stopped being real | 🔴 — same message, now from the table it is supposed to read |
| **W2** | A decision blocking a *different* task | 🟢 — it must not fire on every open decision, only on one that names the next task |

⚠️⚠️ **AND ON 2026-09-13 IT STOPPED THE WRONG WORK. THE GUARD READ THIS VERY TABLE.**
`plan-handover.sh` collected the decisions block's rows by taking every line starting with
`|` until the next `##` heading — which swept up **the falsification table you are reading**,
whose `V4` row spells the blocked task's name because describing it is the row's entire job.
So the moment register #9 was **ruled** and that task legitimately became next, assertion 7c
found the name in a *Result* cell it had mistaken for a *Blocks* cell, and refused it.
⚠️ **The script's own comment already described the correct behaviour** — *"the block's table
runs from its heading to the first blank line after the rows begin"* — **and the code did
something else.** ✅ **Fixed: the reader now stops at the first non-`|` line once rows have
begun**, falsified by `W1`/`W2` above. ⚠️⚠️ **It was dormant and wrong from the day it was
written and surfaced exactly when it would do damage** — a false red on the one task it
exists to protect, on the day that task was unblocked. **The cheap "fix" was to move the
marker back, which would have left the task unstartable for good and looked like the guard
working.** ⚠️ **This is the FOURTH time here that prose about a check became input to that
check**, and the rule those three taught — *never spell a check's sentinel in the file it
reads* — **did not cover it.** The rule this one adds: **a check must BOUND the region it
reads, not trust the next heading.**

⚠️⚠️ **V4 IS THE ONE THAT CAN STOP WORK RATHER THAN DESCRIBE IT.** This file has said
*"do not start `4.6a`"* in prose since 2026-09-07. **Prose is not a gate**, and `4.6a` is
a migration: append-only, merged automatically, so a session that starts it early does
not produce a reviewable mistake — it produces a deployed one.

⚠️ **A decision here is not a task and is not sized.** It costs the owner minutes and it
freezes when the migration behind it merges — which is the whole reason it is parked in
front of the work instead of inside it.

### ⏳ DATES OWED — what a calendar owes, and no person is holding

⚠️⚠️ **THIS BLOCK EXISTS BECAUSE THE DECISIONS BLOCK DID NOT COVER DATES, AND ON 2026-09-13
THERE WERE THREE LIVE ONES HELD ONLY BY PROSE.** A decision waits until someone rules; **a
date passes whether or not anyone looked**, and a missed reading is not recoverable by
trying harder afterwards — it is recoverable only by starting the clock again.

⚠️ **A DATE IS NOT A TASK.** It carries no next-task marker, it is not sized, and it must
never be what a cleared session "takes" — the next task is always in the tables below.

⚠️⚠️ **AND THIS BLOCK HAS TEETH THE DECISIONS BLOCK DOES NOT: `plan-handover.sh` FAILS once
a due date is in the PAST and its row is not ticked.** A red here blocks every merge, which
is deliberate and is the only reason a date survives a context clear — **and the exit is ten
seconds: tick the box and write what was read.** ⚠️ It fires only on dates **strictly
before** today (UTC), so a due-today row is never a false red on a timezone.

| Due | What | Why it cannot simply be moved | Done |
|---|---|---|---|
| ~~**2026-09-20**~~ | ✅✅ **DONE 2026-09-20 — RE-DEPLOYED, AND THE APP WAS NOT OPENED.** Built with `-allowProvisioningUpdates` and installed with `devicectl device install`; the new profile `4930c966` runs to **2026-09-27T14:22:11Z**. ⚠️ **The profile had ALREADY expired** (`06:19:32Z`, ~8 hours before), so the app on the phone was unlaunchable when this was done — the row was right about the risk and right about the date. ⚠️⚠️ **THE MEASUREMENT IS INTACT, AND THAT WAS VERIFIED RATHER THAN HOPED**: `devicectl device info processes` shows **zero** Wera processes (it was never launched), and `devicectl device info files` shows `Documents/SQLite/ExpoSQLiteStorage` — the session store — still carrying its **13/09 00:54** timestamp, untouched by the re-install. ⚠️ **And the false-negative risk was ruled out**: `app/src/lib/supabase.ts` has **no commits since before day 0**, so the new binary reads the same store the day-0 build wrote. A storage-key change would have made tomorrow's reading say *"signed out"* for the wrong reason | **It expired BEFORE the reading it exists for.** An expired profile stops the app launching, which on day 8 returns a red screen instead of an answer. ⚠️ **Re-deploy does NOT open the app** — opening it is what restarts the measurement | ☑ |
| ~~**2026-09-21**~~ | ✅✅ **DONE 2026-09-21 — READ ON BOTH INSTRUMENTS, AND THE ANSWER IS YES: THE SESSION SURVIVES EIGHT DAYS.** Both were measured BEFORE and AFTER the launch, so the verdict is a diff rather than an impression. **iPhone 15** (`09bfc47e…`): access token had been dead **8 days 7 hours**; after launch the store held a new one valid an hour, the refresh token was **rotated**, and ⚠️⚠️ **`last_sign_in_at` was UNCHANGED at `2026-09-13T06:47:53Z` — which is the whole finding: nobody signed in again, the session was RESTORED.** **Sealed AVD** (`eb963741…`, a **different Google account**, so the two instruments are genuinely independent): identical pattern, `last_sign_in_at` unchanged at `2026-09-14T00:20:05Z`, and a **screenshot shows Inicio** with the tab bar — the one platform where the screen could be read directly. ⚠️ **The emulator's clock was checked against the host before the verdict** (equal to the second, `auto_time=1`), because a sealed VM resuming with a stale clock would answer this question wrongly and confidently. ⚠️ **The refresh token was deliberately NOT spent out-of-band**: reuse detection is on at a 10s interval, so testing it outside the app would have revoked the session family and signed the owner out — destroying the measurement it was meant to take | **It expired BEFORE the reading it exists for.** Day 0 was 2026-09-13. ⚠️ **Opening either app before this date restarts its clock** — `wera-android-36` is the emulator to use for design work, never the sealed one | ☑ |
| **2026-09-27** | ⚠️⚠️ **RE-DEPLOY WERA TO THE IPHONE AGAIN — AND AS OF 2026-09-22 IT KEEPS A WORKING APP ALIVE RATHER THAN AN INSTRUMENT.** The owner ruled that day: ***"I'm working through my iPhone, deploy it there for me to see. Override anything related to the 30 day session check."*** So the phone stopped being a sealed instrument and became a tool in use, and **this row's deadline is unchanged while its reason is not**: profile `4930c966` still expires `2026-09-27T14:22:11Z`, and when it does **the app stops launching in his hand**. ⚠️ **The re-deploy asked for here was DONE EARLY, on 2026-09-22** — but it reused the SAME profile rather than minting a new one, **measured** off the built bundle's `embedded.mobileprovision`, so it bought no extra days and this date stands exactly where it was. ⚠️⚠️ **THE OLD INSTRUCTION *do not launch the app* IS WITHDRAWN BY THAT RULING** — launching it is now the point. ⚠️ If the phone refuses the app, it is the trust dialogue: **Settings → General → VPN & Device Management → trust the developer**. The 2026-09-20 re-deploy minted a new certificate and cost the day-8 reading its first attempt; this build reuses the trusted one, so it should not recur. ⚠️⚠️ **AND THEN THE OWNER MUST TAP TRUST, WHICH THIS ROW DID NOT SAY AND WHICH COST THE DAY-8 READING ITS FIRST ATTEMPT.** On 2026-09-21 the launch was REFUSED — *"Unable to launch mx.bserafin.wera because it has an invalid code signature, inadequate entitlements or its profile has not been explicitly trusted by the user"* — because the 2026-09-20 re-deploy minted a new signing certificate. **Settings → General → VPN & Device Management → trust the developer**, on the phone, by a person. ⚠️ **The refused launch is harmless to the measurement and that was verified rather than assumed**: it started no process and the session store kept its day-0 timestamp. ⚠️⚠️ **But a re-deploy that is never trusted is an instrument that cannot be read on 2026-10-13, and nothing would say so until the day** ⚠️⚠️ **AND IT HAPPENED A THIRD TIME ON 2026-09-24, ASKED FOR BY THE OWNER — *"Install the thing in my phone, both are connected to the same Wifi for me to validate what you're describing"* — AND THE PROFILE STILL DID NOT MOVE.** Built with `-allowProvisioningUpdates` against the device destination and installed over the network with `devicectl device install app`; **`embedded.mobileprovision` still reads `2026-09-27T14:22:11Z`**, measured off the built bundle rather than assumed. ⚠️ **So three re-deploys have now bought zero extra days between them, and the reason is worth keeping: `-allowProvisioningUpdates` RENEWS a profile that is expired or missing and REUSES one that is still valid.** The way to move this date is to re-deploy ON or AFTER it, not before — **a re-deploy taken early is not a re-deploy taken.** ✅ **The app launched** (`devicectl device process launch`, no trust dialogue, the certificate from 2026-09-20 still trusted) and the build carries `5f-iii-a`: `Ver carrito`, `Vaciar carrito` and `Producto retirado` are in `main.jsbundle` as 1-byte strings and `Sí, vaciar` and `Ya no está en el catálogo` as UTF-16, which is Hermes' own split and the reason a plain grep for the accented ones returns nothing. | ⚠️⚠️ **THIS ROW EXISTS BECAUSE THE FIX IS ONLY SEVEN DAYS LONG, AND THE READING IT PROTECTS IS SIXTEEN DAYS AWAY.** A free personal team signs for seven days; the day-30 reading is **2026-10-13**, so this phone needs re-deploying **at least twice more** before then and the last one must land inside the seven days ending 2026-10-13. ⚠️ **Each re-deploy is safe for the measurement and was proved so on 2026-09-20** — the data container survives and the session store is not touched — **but only if the app is never opened.** ⚠️ **The sealed AVD needs none of this**: it has no provisioning clock, which is why it was sealed as the second instrument | ☐ |
| **2026-10-13** | ⚠️⚠️ **`5a-iv-d` day-30 reading — ON ONE INSTRUMENT NOW, NOT TWO, AND THE OWNER TRADED THE OTHER ON 2026-09-22 KNOWING WHAT IT COST.** ***"Override anything related to the 30 day session check. I want to keep working from my device."*** **The iPhone half is spent**: he is using the app daily, so its session is refreshed on every open and it can no longer answer *how long does a session survive untouched*. ⚠️ **The reading is still worth taking and still free, because the second instrument was sealed for exactly this**: the AVD `wera-reading-5a-iv-d`, a **different Google account**, no provisioning clock, powered down since 2026-09-21 — which is why a second instrument existed at all. **A one-device reading is a weaker claim than a two-device one, and it is the claim this project now has.** ⚠️ The iPhone row above is no longer part of this measurement. ⚠️⚠️ **AND IT NO LONGER MEASURES THIRTY DAYS — SAY SO NOW RATHER THAN DISCOVER IT THEN.** The day-8 reading of 2026-09-21 refreshed both sessions by opening both apps, which is what that reading IS; so this one measures **22 days** from 2026-09-21, not 30 from day 0. ⚠️ **That is not a defect and the row is still worth taking** — C1.4's claim is unbounded, and 22 untouched days is a longer gap than 8 — but *"day 30"* is now a name rather than an interval, and a session reporting it as thirty days since sign-in would be stating something false | C1.4 claims persistence *"until an explicit log-out"*, which is unbounded; **eight days can only fail to disprove it.** Both devices are sealed already, so this costs a glance. ⚠️ **The iPhone half also needs the 2026-09-27 re-deploy to have been TRUSTED** — see the row above. ⚠️⚠️ **AND THE ANDROID HALF MAY REFUSE TO BOOT: the sealed AVD was hard-killed on 2026-09-21 and left `hardware-qemu.ini.lock` and `multiinstance.lock` behind** in `~/.android/avd/wera-reading-5a-iv-d.avd/`. A stale lock reads as *"another emulator instance is running"* on the next boot — **which is this date, the one day it is expensive.** ✅ **The fix is to delete those two files and boot again**; the app's data is on the disk image and is not affected. ⚠️ **Do NOT launch Wera to check — booting the emulator is safe, opening the app is the reading** | ☐ |

**Three falsifications over this block** (`plan-handover.sh`, assertions 9a–9c):

| Fixture | The edit | Result |
|---|---|---|
| **X1** | ⚠️⚠️ **A due date moved into the past, row left unticked** | 🔴 *"a dated obligation came due and nothing says whether it was met"* |
| **X2** | The same row ticked | 🟢 — the exit is a tick and a sentence, not a negotiation |
| **X3** | The block deleted | 🔴 — the same argument as `V1`: a date nobody is re-offered is a date nobody takes |

⚠️⚠️ **AND IT FIRED AGAIN ON 2026-09-14, ON THE ROW ABOVE, FOR THE FIFTH TIME — THE FIRST
ONE THAT WAS PURELY SELF-INFLICTED AND THE EASIEST TO FIX.** `4.6b`'s decision row named the
next task in its *Blocks* cell, in a sentence whose whole purpose was to say the decision
does **not** block it — *"NOT the next task: `4.6c-i` is unaffected"* — and assertion 7c read
the name and refused the task. **The check was right and the prose was wrong**: a *Blocks*
cell is machine-read, so it is not a place to write reassurance. ✅ The cell now says what it
blocks and describes the next task without naming it. ⚠️ **The four earlier instances all
needed the CHECK changed; this one needed the SENTENCE changed**, which is the cheaper half
of the rule *never spell a check's sentinel in the file it reads* and the half that keeps
being forgotten because nothing enforces it but reading the failure.

⚠️ **The region this block occupies is BOUNDED by the reader** — it stops at the first
non-table line after the rows begin, rather than running to the next heading. That is not
caution, it is the defect assertion 7c shipped with: the unbounded version swallowed the
falsification table beneath it and refused a legitimate task. **Every table-reading
assertion in this file now bounds its region.**


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















⚠️⚠️ **AND 2026-09-24 NOW HAS ITS OWN FILE TOO —
[`docs/plan/archive/status-log-2026-09-24.md`](plan/archive/status-log-2026-09-24.md)**,
opened on 2026-09-24 while `5R-g` was shipping, with the backfill ruling and its two
findings. ⚠️⚠️ **IT IS THE SECOND FILE EVER OPENED FOR A DAY STILL RUNNING, AND FOR
`status-log-2026-09-22.md`'s REASON: THERE IS NO OLDER DAY LEFT TO TAKE.** 2026-09-23
went out entirely in the sixth and seventh cuts earlier the same day.
⚠️⚠️ **AND IT IS THE FIRST CUT EVER TAKEN PRE-EMPTIVELY.** Every one before it was
taken after a check had already gone red; this block still had **33 lines of headroom**
— enough to pass, and **not enough for the next session's first entry.** ⚠️ **Leaving it
would have handed a cleared session a red on its opening move, for a ceiling it had no
part in spending.** **The remedy costs the session already holding the context and costs
the next one a cold start**, which is the whole argument for paying it early.
⚠️ **A later session APPENDS to that file; never a second one for the same date.**

⚠️⚠️ **AND 2026-09-23 NOW HAS ITS OWN FILE —
[`docs/plan/archive/status-log-2026-09-23.md`](plan/archive/status-log-2026-09-23.md)**,
opened on 2026-09-24 in the same session that shipped `5f-iii-a` **and cut SIX TIMES in it**, which has not happened before —
`5e-ii` reopened and closed again, then `5e-ii`'s second round of the owner's notes, the
second because the working-agreement amendment left this block **two lines** of headroom, the third because `5f-iii-a` was reopened and fixed the same afternoon, and the fourth because `5f-iii-b` then shipped a whole `M` in one sitting under the amended agreement — **which is the lesson: the amendment made sittings bigger, and a bigger sitting writes a longer entry.** ⚠️ `## Position` stood at **1,403 of
1,400** with that task's closing entry in place — **the fifth time a closing entry has spent
the last of the headroom, and the second time in one day this block has been cut.** ⚠️ **A
later session APPENDS to that file; never a second one for the same date.**
⚠️⚠️ **THE SIXTH CUT WENT IN ON 2026-09-24 WHILE `5f-iii`'s ROUND OF THE OWNER'S NOTES
WAS SHIPPING** — the C3.17 ruling and `5e-iii-b` closing, the two oldest. ⚠️ **It is the
first cut this file has taken that a CLOSING ENTRY did not spend**: five changes to a
screen the owner already had in his hand, no task closed, and `## Position` still
reached **1,410 of 1,400**. **That is the amended working agreement's own arithmetic** —
bigger sittings write longer entries — and it is written here because the remedy will be
needed again sooner than the five-cut rhythm above suggests.

~~and with it there is no 2026-09-23 entry left in this block~~ — ⚠️⚠️ **STRUCK THE SAME
HOUR, BECAUSE IT WAS FALSE WHEN IT WAS WRITTEN AND THE SESSION THAT WROTE IT CHECKED
AFTERWARDS RATHER THAN BEFORE.** Two 2026-09-23 entries were still here — the
prebuilt-catalog ruling and the correction the owner found on his phone within the hour —
and they went in the **SEVENTH** cut minutes later, on the same `5R-f` sitting. ⚠️ **It is
the NINTH time that claim has been made wrongly in this repository**, and the remedy the
archive already records is not a better sentence: it is `grep -c '2026-09-23' docs/PLAN.md`
**before** writing one. ✅ **Now true, and checked this time.** ⚠️⚠️ **AND THE SEVENTH CUT
REPAIRED A CROSS-REFERENCE RATHER THAN BREAKING ONE** — the correction opens *"THE
PREBUILT-CATALOG ANSWER ABOVE"*, and in this block, which runs newest-first, the ruling it
corrects sat BELOW it. The archive runs oldest-first, so that word is true there for the
first time since it was written. ⚠️ **What still carries the date here is the
DECISIONS-OWED block's own rulings**, which are not status entries and must never be
archived.

⚠️⚠️ **TWENTY-FOUR ENTRIES OF 2026-09-22 ARE ARCHIVED, IN SIXTEEN CUTS, TO
[`docs/plan/archive/status-log-2026-09-22.md`](plan/archive/status-log-2026-09-22.md)**
— the `5c-ii-b` sizing and its connectivity reading, `5c-ii-b-2`'s flush trigger,
the `5c-iv` sizing, **`5c-iv-a`, moved in the second cut while `5e` was being
sized**, **`5c-iv-b`, moved in the third while `5e-i`'s price ruling was being
recorded**, and ⚠️ **`5b.9`, moved in the FOURTH as `5e-ii` closed — the only one
of the six taken from the FOOT of this block rather than its head**, because it was
the oldest entry left and `## Position` stood at **1,388 lines against its 1,400
ceiling** with `5e-ii`'s entry in place. **Twelve lines of headroom is one session
away from a red, and leaving it there would have made the next session pay for this
one.** ⚠️ **And `5d`'s own sizing went in the FIFTH, on 2026-09-23**, once the
`5e-ii` reopening left this block forty-seven lines of headroom — which is less than
one entry. `## Position` had reached **1,445 lines** before the first cut, and
`plan-handover.sh` assertion 7 names the remedy in its own failure. ⚠️ **And `5d-i`'s went in the SIXTH, on 2026-09-23, because this block had reached
1,399 of 1,400 and the next session's first entry would have spent the last line** —
with §2.8's Home amendment in a SEVENTH taken the same minute, because one entry of
headroom is how a guard fires on somebody who has done nothing wrong.
⚠️ **And `5d-ii`'s went in the EIGHTH, on 2026-09-23, because `5e-iii`'s sizing entry
left this block forty-three lines of headroom** — and a closing entry is longer than
that, so the session that wrote the sizing paid for its own successor rather than
handing it a red.
⚠️ **And `5d-iii`'s went in the NINTH, an hour after the eighth, because the C3.17
ruling arrived the same evening `5e-iii-a` closed and this block reached 1,413** —
⚠️⚠️ **a session that ships a task AND takes a ruling writes TWO entries, and sizing the
archive for one of them is what put it over the ceiling twice in one hour.**
⚠️ **And the iPhone-day entry went in the TENTH, on 2026-09-23 as `5e-iii-b` closed,
off the FOOT again** — this block stood at **1,404 of 1,400** with that task's entry in
place, which is the fourth time a closing entry has spent the last of the headroom.
⚠️ **And the two that opened that afternoon — the schema deployment and the Productos
failure that found it — went in the ELEVENTH, on 2026-09-23 with the prebuilt-catalog
ruling, off the FOOT again**: this block stood at **1,390 of 1,400**, ten lines of
headroom, which is less than one paragraph.
⚠️ **And `5d-iii`'s R9 look went in the TWELFTH, on 2026-09-24 with the backfill ruling,
off the FOOT again** — 1,410 of 1,400 with that entry in place.
⚠️⚠️ **And `5d-iv-a` AND THE `5d-iv` SIZING WENT IN THE THIRTEENTH, on 2026-09-24 while
`5f` was being sized, off the FOOT again — AND THIS ONE WAS PAID FORWARD RATHER THAN
FORCED.** This block stood at **1,373 of 1,400 with nothing written yet**: twenty-seven
lines, and an `XL` sizing entry is longer than that, so the choice was to cut first or to
go red on a document while the work being reported was fine. ⚠️ **Twelve of the thirteen
cuts have now been taken by a session that wanted to be writing something else**, which
is the argument assertion 7 makes in its own failure text.
⚠️⚠️ **AND THE SIXTEENTH WENT IN THE SAME SITTING, AS `5g-i` CLOSED — `5f-ii`'s ENTRY AND
THE TWO RULINGS IT CARRIED, 145 LINES.** This block stood at **1,440 of 1,400** with the
closing entry written. ⚠️ **Two cuts in one session is a first, and the reason is not that
the entries got longer**: it is that this sitting wrote TWO of them — a sizing and a close —
which is what the amended working agreement makes an ordinary day.
⚠️⚠️ **AND THE FIFTEENTH WENT IN ON 2026-09-24 WHILE `5g` WAS BEING SIZED, OFF THE FOOT
AGAIN — `5f-i`'s CLOSING ENTRY AND THE `5f` SIZING THAT PRECEDED IT, 63 LINES.** This block
stood at **1,429 of 1,400** with the `5g` sizing entry written, which is the second time an
`XL` sizing has spent more headroom than existed — **and the remedy is the one assertion 7
names in its own failure text, taken without argument.** ⚠️ **Thirteen of the fifteen cuts
have now been taken by a session that wanted to be writing something else.**
⚠️⚠️ **And `5d-iv-b` WENT IN THE FOURTEENTH, in the same sitting as the thirteenth and
for the reason the thirteenth wrote down.** That cut bought ninety-three lines and the
`5f` sizing entry spent fifty-one of them, leaving **1,349 of 1,400 — less than one
closing entry.** ⚠️ **The session that could see the number paid for its successor**,
and it is the first time this block has been cut twice in one sitting. ~~there is no 2026-09-22 entry left in `## Position`: that day is now wholly in its
own file.~~ ⚠️⚠️ **THAT SENTENCE WAS FALSE WHEN IT WAS WRITTEN AND IS STRUCK — FIVE
2026-09-22 ENTRIES WERE STILL HERE**, and they went in the FIFTEENTH cut that evening:
the price ruling, the confirmation-surface ruling, `5e-i`, the `Costos` ruling and the
`5e` sizing. **The claim was made from the shape of the work rather than from the
file** — the eighth instance of that defect in this repository, and the first committed
by a session whose job that hour was archiving. ⚠️ **Nothing would have gone red:**
`plan-corpus.sh` resolves every row either way. **What a false sentence about where the
history lives actually costs is the next session believing the day was closed and
opening a second file for it**, which the one-day-per-file rule exists to prevent. ✅ It
is corrected here rather than deleted, and the day IS now wholly in its own file.
⚠️⚠️ **And `5e-ii`'s CLOSING ENTRY WENT IN THE SIXTEENTH, on 2026-09-24 while `5f-iii`
was being sized, off the FOOT again — AND IT FALSIFIED THE FIFTEENTH CUT'S OWN
CORRECTION.** The fifteenth struck *"there is no 2026-09-22 entry left"* and wrote
**"the day IS now wholly in its own file"** in its place; that sentence was false too, by
one entry of **eighty-six lines**, and `5e-ii` closed on 2026-09-22. ⚠️ **The ninth
instance of a claim made from the shape of the work rather than from the file, and the
second in a row committed by a session whose job that hour was archiving.** ✅ **The
remedy is not a better sentence, it is `grep -c '2026-09-22' docs/PLAN.md`** — four
seconds, and it would have caught both. ⚠️ `## Position` stood at **1,413 of 1,400** with
the `5f-iii` sizing entry in place; the cut left it at **1,327**.

⚠️⚠️ **The archive is no longer strictly oldest-first and its own headings say so**:
three cuts came off this block's head and twelve off its foot.
⚠️ **This is the first cut taken from a day that was still running** — every
earlier one waited for the day to close, because there was always an older day to
take; today there was not. **A later session APPENDS to that file rather than
making a second one for the same date.** ⚠️ It is a MOVE and not a copy, and
`plan-corpus.sh` reads it, so every guard resolves those rows exactly as before.



## Steps 0 through 4.5 — closed, and moved out of this file ✅

⚠️ **ARCHIVED 2026-09-19 to [`docs/plan/archive/steps-0-to-4.5.md`](plan/archive/steps-0-to-4.5.md)** —
6,361 lines, unedited. Steps 0, 1, 2 (`✅` in their own headings), 3, 4 and 4.5
(densely `✅` throughout, 41 / 50 / 31 completion marks) were closed and still being
carried in a file that had grown past a context window at ~313k tokens.

⚠️ **EVERY PLAN CHECK STILL READS THOSE ROWS.** `docs/checks/plan-corpus.sh`
assembles this file plus the archive directory and hands the result to each check,
so archiving is invisible to all of them — the lookups are content-addressed
(`| **task** |`), never by line number. `bash docs/checks/plan-corpus.sh --list`
shows what it assembles.

⚠️ **THE ARCHIVE IS *CLOSED*, NOT *WRONG*.** It is not
`archive/power-platform/`, which describes a system nobody is building. Everything
in it describes this system. The file's own header says how to move a section back
if work genuinely reopens — **move it, never copy it**, or the split guards will
count the row twice, which is what they are for.

---

## ⚠️⚠️ READ FIRST — THE PLAN NOW DISAGREES WITH ADR-035, AND `CLAUDE.md` SAYS THE ADR WINS

**Do not start `4.6a` until the owner has amended the ADR.** `CLAUDE.md` instructs a
fresh session that *"if anything disagrees with the ADR, the ADR wins and the other
file is the bug."* After the grill-me of 2026-09-07 **that rule now points the wrong
way in four places**, and a session obeying it literally would undo the interview.
⚠️⚠️ **TWO OF THE FOUR WERE FOUND ON 2026-09-07 WHILE SIZING `5a`, NOT DURING EITHER
GRILL ROUND, AND THEY ARE THE TWO THAT BLOCK IT.** The first two below are the owner's
own changes of mind; the last two are places this file drifted from the ADR without
anyone deciding to.

| ADR-035 | Says | The owner said, 2026-09-07 |
|---|---|---|
| **Decision register #9** (§1424) — *Staff invitation flow* | `workspace_invite` + `redeem_invite`, **token by WhatsApp**. Owner-initiated push | **C11.5 / C11.6** — the joiner enters a **workspace code**, **requests** access, and is **approved**; an owner's invite counts as *a request that arrives pre-approved*. **Both paths, not one** |
| **Decision register #13** (§1424) — *Android* | *"Defer the release path, keep the code honest. Emulator smoke test at the end of 5a"* | **C1.1** — the pilot is **iPhone 11, iPhone 15, Oppo and Samsung**. **iOS is not optional**, and the 5a smoke test has two platforms |
| ✅ **§2.11's stack table** — *Client tests* | ~~*"Skipped, except `packages/money`"*~~ → **CLOSED BY THE OWNER 2026-09-07.** ADR amended: a unit test is allowed where it **pins a value a customer sees or the ledger stores**, refused over rendering, navigation and layout | This file's `5a` definition of done stands. `app.yml` runs typecheck **and** tests, and `5a-i` shipped it |
| ✅ **§3's build-order step `5a`** — *Foundation* | The `expo-sqlite` **outbox**, **`src/api/`** wrapping every RPC, the **`src/ui/` primitives**, **`CONVENTIONS.md`**, session persistence **on a shared till device**, and **how the client resolves its `location_id`** | **CLOSED BY THE OWNER 2026-09-13.** `CONVENTIONS.md` shipped at `5a-iv-b`, inside `5a` as §3 asked. The outbox stays in `5c`; C1.5/C1.1 already answered the last two (two workspaces, **personal phones — there is no shared till**). ✅ **`src/api/` and `src/ui/` stay spread across `5d`–`5h`** — *"do the second pass after 5b"* — and §3's *"arrive to a pattern"* argument is honoured by **`5b.5`** rather than by building ten primitives against undrawn screens |

⚠️ **§1400's checklist is NOT the problem and was never wrong**: it carries
`workspace_invite` + `create_invite` + `redeem_invite` as an **unticked box**, which is
exactly right — they were never built. The conflict is in the **decision register**,
which records *how* the flow should work, and that is the half the owner changed.

✅ **The first two do not block `5a`.** Decision #13 only widens the smoke test;
decision #9 is `4.6a`'s subject matter.

✅✅ **THE THIRD ONE IS CLOSED. The owner ruled on 2026-09-07 — *"amend §2.11 to allow
unit tests"* — and ADR-035 now carries the amendment** (§2.10 and §2.11, revision entry
dated 2026-09-07). The paragraphs below are kept as written, struck only here, because
they are the argument the ruling accepted and a later session may need to see it.

~~**THE THIRD ONE BLOCKS `5a-i`, AND IT BLOCKS IT ON ITS DEFINITION OF DONE RATHER
THAN ON A DETAIL.**~~ `5a-i` ships two things: an Expo project and the workflow that
watches it. **§2.11 says the second one should not run tests.** So the disagreement is
not about how to build the task — it is about what the task is for, and it cannot be
deferred to a later letter, because a `paths:` filter is retroactively wrong for every
commit that merged before it existed.

⚠️ **The reading that would dissolve it, offered rather than assumed.** §2.10's *prose*
says *"**broad** client-side testing is skipped for v1: a suite over a thin UI is a poor
use of a small team's attention when correctness sits one layer below it."* §2.11's
table row compresses that to one word — *"Skipped"* — and cites §2.10 as its authority.
A four-case suite over `formatMXN` and the density scale is **not a suite over a thin
UI**: it is pure functions, it is what `5a-ii` produces first, and it is the only thing
that would make `app.yml`'s green mean anything. **But the prose governing the table is
an argument, not a ruling, and the ADR is amended by decision** — so it is put to the
owner instead of taken.

✅✅ **THE FOURTH IS CLOSED. The owner ruled on 2026-09-13 — *"keep it in docs/, and do
the second pass after 5b."*** Both halves, in one sentence:

- **`CONVENTIONS.md` shipped at `5a-iv-b`**, inside `5a` as §3 asked, at
  `docs/CONVENTIONS.md` — **the path is now settled and may be cited.**
- **`src/api/` and `src/ui/` stay spread across `5d`–`5h`.** §3's reason for putting
  them in `5a` — *"step 6's four screens are supposed to arrive to a pattern"* —
  **survives, and is honoured by `5b.5`** rather than by inventing ten primitives
  against screens nobody has drawn. ⚠️ **`5b.5` is therefore load-bearing, not a
  tidy-up**: if it is skipped, §3's argument is the thing that was dropped.

~~It needs the owner's eye, not a silent fix here.~~ It got it.

**What is owed, as of 2026-09-13 — ONE amendment, and one line of ADR text that lags a
ruling:**

- ✅✅ **CLOSED, AND THE LINE BELOW WAS STALE FOR PART OF 2026-09-13: decision
  register #9**, the membership flow. ⚠️ **This bullet still read *"STILL OWED AND
  STILL BLOCKING"* when `4.6a-i` was taken**, while ADR-035 had already carried
  C11.5/C11.6 since the second revision entry of that date — so the file telling a
  cleared session *"do not start `4.6a`"* disagreed with the file `CLAUDE.md` says
  wins, and with this plan's own `4.6a-i` row calling itself the next task. **The ADR
  won, as the rule says.** It is the EIGHTH stale-copy defect recorded here and the
  first where the stale copy was a GATE: a session obeying it literally would have
  downed tools on an unblocked task and waited for a ruling already given.
  ⚠️ **No guard reads this block** — `4.6a-split-coverage.sh` checks the table rows
  and the three files' agreement on the split, not this prose — which is exactly how
  it survived. The paragraph below is kept because it is still the clearest one-line
  statement of what the amendment was.
  ⚠️ **Re-described for the owner on 2026-09-13, who asked what it was.** In one
  sentence: **the ADR says the owner pushes an invite, and the owner said the joiner
  pulls with a code — and he wants both.** The register records `create_invite(email,
  role, location_ids)` → token → WhatsApp → `redeem_invite`; C11.5 asks for a joiner who
  signs up, **types a workspace code, requests a role, and is approved**, with an
  owner's invite counting as *a request that arrives pre-approved*. ⚠️ **The modelling
  consequence is one column**: `workspace_invite.invited_by` is `not null` today and a
  self-request has nobody to put there. ⚠️ **And `workspace` has no code column at all**
  (`0001:110`) — the `id` cannot serve, because nobody reads a uuid over WhatsApp, and
  C11.6 is explicit that workspaces are **never listed**. The full write-up is `4.6a`'s
  section below.
- ✅ **§2.11 is amended** (2026-09-07) and `5a-i` shipped under it.
- ✅✅ **§3's build-order row IS NOW REWRITTEN — the owner instructed the amendment on
  2026-09-13 and ADR-035 carries it** (revision entry dated 2026-09-13; §3's step `5a`
  and §2.10's closing paragraph). **There is no longer any gap between the two files
  for a literal reading of *"the ADR wins"* to fall into.** ⚠️ **It was not a one-line
  tidy in the end**: `src/api/` and `src/ui/` moved to `5d`–`5h` with `5b.5` carrying
  their obligation, the outbox moved to `5c`, and **two deliverables were STRUCK rather
  than moved** — *"session persistence on a shared till device"* and *"how the client
  resolves its `location_id`"* both rest on a shared till, and C1.5/C1.1 established the
  pilot has none. **A deliverable whose premise is false is withdrawn, not deferred.**

✅✅ **AND THE AMENDMENT CREATED A THIRD COPY OF THE `5b.5` DEFERRAL, SO IT IS GUARDED.**
`conventions-gate.sh` already cross-checked `docs/CONVENTIONS.md` against the plan's
`5b.5` row; ADR-035 §3 now states the same deferral in its own words, and **the copy
nobody checks is the copy that goes stale** — six times in this repository's history.
A tenth assertion group asserts the ADR carries `5b.5` **and** that §3's step `5a`
deliverable list no longer claims `src/api` or `src/ui`.

| Fixture | The edit | Result |
|---|---|---|
| **U1** | The amendment note deleted and `5a`'s list reverted to naming `src/api` | 🔴 *"step 5a claims src/api or src/ui again"* |
| **U2** | `5b.5` renamed out of the ADR entirely | 🔴 *"ADR-035 does not mention 5b.5 … the ADR reads as though step 5a still owes them"* |
| **U3** | ⚠️ **Only the amendment marker removed, the list left clean** — the anti-vacuity case | 🔴 — otherwise deleting the amendment wholesale would make the first assertion pass by having nothing to read |
| **U0** | ✅ Control | 🟢 |

⚠️⚠️ **The assertion's FIRST spelling fired on the amendment note itself** — it grepped
step `5a`'s whole block for `src/api`, and the sentence recording that `src/api` **moved
out** contains those words. **That is the fourth time in one day** a guard in this
repository reported a defect by reading the prose that explains the fix, after
`conventions-gate.sh`'s own comment-stripping trap and the two row-pattern traps in the
plan scripts. ✅ **The claim was narrowed to the deliverable list — everything above the
amendment marker — rather than the guard being loosened.**
⚠️ **And two of the four fixtures were briefly red for the WRONG REASON**, which is worth
as much as the check: the throwaway mutation helper opened each file for writing before
reading it, so it silently emptied the file instead of editing it. **A fixture that is red
for the wrong reason is not a falsification, it is a coincidence** — the results above are
from the corrected helper, and the count of `5b.5` in each fixture was printed and read
rather than assumed.

The ADR is amended only by deliberate decision (`docs/HANDBOOK.md`), and this file does
not get to overrule it by describing something else loudly — which is exactly why the
third bullet names the lag instead of quietly acting on it.

---

## Step 4.6 — what the grill reopened (§2.7, §2.5, §3)

⚠️⚠️ **THIS STEP DID NOT EXIST BEFORE 2026-09-07, AND ITS EXISTENCE IS THE MAIN
RESULT OF THE UI/UX GRILL-ME.** This file said *"the database is complete as of
2026-09-05"* and *"steps 5–7 ship no migration at all."* **Both sentences were
false**, and asking the owner about controls is what proved it — not a test, not CI,
and not a review of the schema against itself.

⚠️ **It is numbered 4.6 rather than folded into step 5 deliberately.** Step 5 ships
no migration; that property is worth keeping, because it is what makes a screen cheap
to get wrong. Three migrations in the middle of the client build would quietly delete
it.

| Task | Migration | What it is | Size | Blocks |
|---|---|---|---|---|
| **4.6a** | ✅✅ **`0027`–`0029`, three files, ALL APPLIED 2026-09-13/14** | **Membership — THE PARENT ROW, AND IT IS NO LONGER TAKEABLE.** Sized `L` and SPLIT three ways 2026-09-13, before a line was written, exactly as this row demanded. `workspace` join code; `create_invite` / `redeem_invite`, **which were assigned to `0005` and never written**; the join-request path `request_access` and its approval `approve_request`, plus the joiner's status read `my_access_requests`. Register #9's eight rulings, all of which land somewhere below: **`D1`** `source`, **`D2`** nullable `token_hash`, **`D3′`** supersede the expired pending row, **`D4`** `invited_by` → `decided_by`, **`D5`** the 8-character Crockford code, **`D6`** resolve the whole code with no scan policy, **`D7`** a request absorbs a pending invite, **`D8`** locations required at approval | `L` — **split, three `M`s** | Blocks **half of `5b`** |
| **4.6a-i** | `0027` | **The table, and the column nobody has.** `workspace.code` with its generator and its input normaliser (**`D5`**); `workspace_invite` re-shaped — `source` (**`D1`**), nullable `token_hash` (**`D2`**), `invited_by` → `decided_by` (**`D4`**) — with ONE check constraint holding the first two together; and the **`D3′`** supersede helper that both creating RPCs call, written once here rather than twice downstream. ⚠️ **It re-signs `02`, `03` and `04`**, which each insert an invite fixture naming the renamed column. Suite: `supabase/tests/0027_membership_shape.sql` | `M` | ✅✅ **DONE 2026-09-13** — `0027` applied, 64 behavioural checks, eleven falsifications. `4.6a-ii` and `4.6a-iii` are unblocked |
| **4.6a-ii** | `0028` | **The PUSH path — the flow the ADR always described and never shipped.** `create_invite(workspace_id, email, role, location_ids)` — ⚠️ **the workspace is an argument, not a derivation** — returning a one-time token shown once, and `redeem_invite(token)` writing the membership and its `member_location` rows. Both `security definer`; the creating half supersedes the stale pending row through `0027`'s helper. Suite: `supabase/tests/0028_invite_path.sql` | `M` | ✅✅ **DONE 2026-09-13** — `0028` applied, 77 behavioural checks, eleven falsifications. The invite screen in `5b` is unblocked |
| **4.6a-iii** | `0029` | **The PULL path C11.5 asked for.** `request_access(code)` — resolves the WHOLE code through a `security definer` RPC with no scan policy behind it (**`D6`**), takes no email argument but reads the caller's own, and **absorbs** a pending invite instead of erroring (**`D7`**) — plus `approve_request(id, location_ids)`, which refuses an empty array when the role is `staff` (**`D8`**), and `my_access_requests()` — **ruled in by the owner 2026-09-13** — so the joiner can see a row no policy can ever show them. Suite: `supabase/tests/0029_request_path.sql` | `M` | ✅✅ **DONE 2026-09-14** — `0029` applied, 67 behavioural checks, thirteen falsifications. ⚠️ It also adds `requested_by` and re-signs `0027`'s and `0028`'s suites. The join screen in `5b` is unblocked |
| **4.6b** | ✅ **`0030`, APPLIED 2026-09-14** — was `0028`, renumbered by the `4.6a` split, 2026-09-13 | **`replay_failed_write` fenced at `manager`, not `owner`** — a `create or replace`, one notch. ⚠️⚠️ **ONE NOTCH MEANT ONE NOTCH: `failed_write_select` IS UNTOUCHED, so a manager may now replay a dead letter she cannot SELECT** — pinned by three checks, not prose, and parked as an owner decision against `5c` | `S` | ✅✅ **DONE 2026-09-14** — 18 behavioural checks in `supabase/tests/0030_replay_manager_fence.sql`, `0026`'s re-signed to 88, ten falsifications. The replay control in `5c` is unblocked |
| **4.6c** | ⚠️ `0031`–`0033` — **`0031` was `0029`, renumbered by the `4.6a` split, 2026-09-13** | ⚠️⚠️ **RE-SCOPED AND SPLIT 2026-09-14, BEFORE A LINE WAS WRITTEN. THE PARENT ROW, AND IT IS NO LONGER TAKEABLE.** ~~The family margin view~~ — **cancelled by the owner's `A3` ruling**, *"we won't derive the profit so let's ignore margins for now"*. What replaces it is Números as he described it: **purchases as a read**, **price over time**, and **the month export** | `L` — **split, three `M`s** | the Números screens in `5d` ⚠️⚠️ **AND THEY CARRY ONE CONSTRAINT OUT OF ÁREA 9's CLOSURE, 2026-09-18: WASTE IS SHOWN AS QUANTITY, NEVER AS COST AND NEVER AS A RATE.** `product_waste_daily` (`0011`/`0012`) costs waste off the movement's `unit_cost_net_per_base`, which is **zero for a shortfall lot** — so under C8.6, the pilot's main product line, throwing away `Pechuga` costs **$0** and the rate is **0 over 0**. Question 1 was retired by `A3` (*we do not derive profit*); **question 2 was never separately ruled on and is still broken.** ⚠️ *"Enhance it later"* works on a number that is MISSING and does not work on one a shopkeeper has already believed. Quantity is intact for `0013`'s stated reason — *"there is no cost column for it to fail open on"* |
| **4.6c-i** | `0031` | **Purchases as a first-class read** — `product_purchases_daily`, per variant and family per day — plus **revenue made GROSS on `product_velocity_daily`** (`tax_collected`, `revenue_gross`, `trailing_revenue_gross`), **the C8.6 honesty comment on `0009`**, and `0030`'s stale `comment on function`. ⚠️⚠️ ~~*the tax it needs lives today only in the manager-only `product_margin_daily`, so reaching it without widening that fence is this task's first design problem*~~ — **FALSE, AND MEASURED FALSE**: `sale_line.tax_amount` is member-level (`0003`), so the cashier already reads every peso of it. The fence was on 0009's COPY of the number, never on the column | `M` | ✅✅ **DONE 2026-09-14** — `0031` applied, 47 behavioural checks, `0011`'s re-signed 56 → 57, twelve falsifications. ✅ **And the one decision it took on the owner's behalf was RULED the same day — *"leave gross revenue on the velocity view"***, which ADR-035 §2.9 had already said. The Números charts in `5d` are unblocked |
| **4.6c-ii** | `0032` | **Price over time**: purchase and sale unit prices per variant, read from the LEDGER rather than from ~~the empty~~ `price_list`. Daily grain; the %-change windows are the client's. ⚠️⚠️ **BOTH OF THE THINGS THIS ROW SAID `0031` SETTLED WERE HALF WRONG.** `product_purchases_daily` is not a *precedent to match*, it is **where the purchase price belongs** — so `0032` ships **no new view at all**, only four appended columns on each of the two views that already own each side of the ledger. And it is not *the* fence: a purchase price is cost (manager) and a sale price is revenue ÷ quantity (staff, §2.7), so **each price inherits its own fence and the migration writes no predicate**. ⚠️ ~~the empty `price_list`~~ — **it holds 390 rows and is a dated range table**; §2.9's reason for reading the ledger is that it holds the INTENDED price, and the two disagree in 1 050 of 2 139 buckets | `M` | ✅✅ **DONE 2026-09-14** — `0032` applied, 48 behavioural checks, twelve falsifications. ⚠️ **It re-cut four applied checks, three of which would have stayed GREEN while their claims died.** The price card in `5d` is unblocked |
| **4.6c-iii** | `0033` | **The month export**: transactions and waste, flat, one shape and one fence. ⚠️⚠️ **"THREE DIFFERENT RLS FENCES" WAS AN UNDERSTATEMENT — THERE ARE THREE DIFFERENT COMBINATIONS**, and the `waste` HEADER is member-level while `waste_line` is not. So *"one fence"* could not be inherited: it is written into the view's body, `0009`-style, and **a staff caller reads zero rows rather than a silent third of the file** | `M` | ✅✅ **DONE 2026-09-14** — `0033` applied, 41 behavioural checks, ten falsifications. ⚠️ **It re-signs three applied check files**, one of which held an owner's ruling as a count and had to be re-cut rather than bumped. **The download in `5d` is unblocked, and step 4.6 is CLOSED** |

### ⚠️⚠️ Sized 2026-09-13 — `4.6a` IS AN `L`, IT SPLITS THREE WAYS, AND THE SPLIT COSTS A RENUMBERING

**Sized and split before a line of SQL was written**, which is what the parent row demanded
in terms. ⚠️ **`0027` DOES NOT EXIST YET.** Nothing in `supabase/migrations/` moved in this
session; this section, the table above and one new guard are the whole of it. That is
deliberate: `0027` is append-only and merges automatically, so the cheapest moment to be
wrong about its shape is now, in a file, rather than after it has applied.

**Why it is an `L` and not the `M` a single table change would be.** Counting what has to
exist before the request screen in `5b` can call anything: **two new columns**
(`workspace.code`, `workspace_invite.source`), **one rename** — the first in this schema's
history — **two dropped `not null`s**, **one check constraint** carrying `D1` and `D2`
together, **one unique index**, **three helper functions** (generate a code, normalise a
typed one, supersede an expired pending row), **`onboard_workspace` replaced a third time**
so a new workspace is born with a code, **a backfill** for the workspaces that already
exist, **four RPCs** that have never existed — **five** counting the joiner's status read, which
`S3` below is why — and **a re-signing of three applied pgTAP suites**. Every step-4 task
that was one function was an `M`; this is five functions and a table change.

#### The seam: the two ways in, with the schema landing alone

| | Takes | Why the line is here |
|---|---|---|
| `4.6a-i` | `0027` — the table, the code column, the three helpers, the backfill | **Both paths need all of it and neither path can be written without it.** It is also the only piece that touches an applied test suite, and the only one that cannot be done as a `create or replace` if it turns out wrong |
| `4.6a-ii` | `0028` — `create_invite`, `redeem_invite` | The flow **ADR-035 has described since it was written and this database has never had** (`0002:362` sends them to `0005`; `0005` is the allocator). It is a closed loop on its own: an owner can invite and an invitee can redeem with nothing from `4.6a-iii` present |
| `4.6a-iii` | `0029` — `request_access`, `approve_request`, the joiner's status read | C11.5's **pull**, which is the half the owner changed his mind about. It depends on `0027`'s columns and on **nothing in `0028`** — `D7`'s absorb reads an invite ROW, not `redeem_invite` |

⚠️ **`D7` is the only coupling between the two paths, and it points at the table rather
than at the function** — which is why the pull path can be third and still be finishable.

**Three alternative seams were considered and refused:**

- **One migration, three sessions.** Refused by the append-only rule and by automated
  merging: each session merges on its own green run, so three tasks cannot share one
  unapplied file. This is 4d's argument exactly, and 4d is where it cost a renumbering too.
- **Two ways — the table, then all four RPCs.** Refused because "all four RPCs" is one
  session writing four `security definer` functions with four failure vocabularies, which
  is the shape 4e was split to avoid. The second piece would be an `L` again.
- **Push path first, including the table.** Refused because `0027`'s check constraint,
  `source` column and code generator are all there for the PULL path; folding them into the
  invite migration means the invite task ships the request path's schema and cannot test
  half of what it adds.

#### The renumbering, and it is the third in this repository

⚠️ **`4.6b` becomes `0030` and `4.6c` becomes `0031`.** `4d` and `4e` both moved numbers for
the same reason and `4.5` did not; the rule that decides it is whether the split's pieces
each ship a migration. Here all three do. **`supabase/README.md` is the authority on
numbering and now carries `0027`–`0031`** — see the finding below, because it did not carry
step 4.6 at all.

**The overflow seam is pre-committed**, as `4e` and `4.5` did it: if any of the three
overflows a session, the overflow is **test breadth and ships NO migration** (`4.6a-i-b`,
`4.6a-ii-b`, `4.6a-iii-b`), so a fourth task never renumbers a fifth.

#### ⚠️⚠️ Four things found by opening applied SQL instead of the record of it, and the first turns three GREEN suites RED

**`S1` — `D4`'s rename breaks `02`, `03` and `04`, all of which are green today.** Three
pgTAP suites insert their own `workspace_invite` fixture and every one of them names the
column being renamed: `02_rls_isolation_reads.sql:106`, `03_rls_isolation_writes.sql:256`,
`04_rls_isolation_writes_inserts.sql:363`. The rename does not break a test's *claim*; it
breaks the INSERT, so all three fail in setup. ⚠️ **`4c-ii` recorded what that looks like:
a suite that dies in `beforeAll` reports zero failing tests.** So re-signing the three
suites is **inside `4.6a-i`**, named in its row, and not a surprise for whoever runs
`supabase db reset` next.

**`S2` — the seed must NOT be given invite rows, and two earlier findings point the other
way.** `3.2a` found `workspace_invite` is the one tenant table the seed leaves empty, and
`4.5b` found that the isolation suites go red on an empty tenant table — so "seed it" looks
like the fix. ⚠️⚠️ **It is not: `02`'s own `F9` asserts the table was empty in the seed**,
and says in terms that a future seed populating it *"turns red and someone decides whether
the fixture is still wanted."* The suite already writes one invite per workspace inside a
transaction it rolls back. **So `0027` touches no seed file**, and `F9` stays the guard on
that decision rather than becoming its casualty.

**`S3` — a requester cannot read the row they just created, and no policy will ever let
them.** `workspace_invite_select` is `has_role(workspace_id, 'manager')` (`0002:563`), and a
non-member's `my_role()` is null, so `has_role` is false — the joiner is invisible to
themselves. `workspace_select` is `id in (select my_workspaces())`, so they cannot read the
workspace either, which is `D6` working as designed. ⚠️ **`5b`'s join screen therefore has
nothing to render after the tap**, and the cheapest-looking fix a later session would reach
for is a select policy — the exact thing `D6` forbids. **`4.6a-iii` ships the status read
as a `security definer` RPC keyed on the caller's own email.**

**`S4` — `D7` is a privilege-escalation path in two ways, and both are closed by how the
RPC is signed, not by a check.** *"Entering the code accepts a pending invite for that
email"* is safe only if the joiner cannot choose the email and cannot choose the role.
⚠️⚠️ **If `request_access` took an email argument, anyone could absorb anyone's pending
invite — including one issued for `manager` or `owner`.** And if the absorb honoured the
*requested* role rather than the invite's, requesting `owner` while holding a `staff` invite
would be a promotion nobody approved. **So: no email argument — the RPC reads
`auth.users.email` for `auth.uid()` inside the definer body — and the absorbed invite's own
role wins, silently** (§2.8: we do the bookkeeping, not the shopkeeper).

#### ⚠️ Seven decisions taken on the owner's behalf in the sizing, and all seven are cheap only until `0027` merges

| | Decision | Why it was taken rather than asked |
|---|---|---|
| **1** | **The seam above**: schema alone, then push, then pull | A sizing judgement, which is the session's job. The alternatives and why they lose are written out above |
| **2** | **The renumbering**: `4.6b` → `0030`, `4.6c` → `0031` | Mechanical once the split has three migrations. `4d` and `4e` set the precedent |
| **3** | **`source` defaults to `'invite'`** | It keeps the three applied suite fixtures valid under `D1`'s check with no `source` column in their INSERT, and it needs no backfill of existing rows. ⚠️ The alternative — no default — makes `S1`'s re-signing bigger for no gain |
| **4** | **No seed rows for `workspace_invite`** (`S2`) | `02`'s `F9` asserts the opposite of what the instinct suggests, and it asserts it deliberately |
| **5** | **`request_access` takes no email argument** (`S4`) | The version that takes one is a way to claim somebody else's invite. This is a security property, not a signature preference |
| **6** | **The absorbed invite's role wins over the requested one** (`S4`) | The other way round is an unapproved promotion |
| **7** | ✅✅ **RULED BY THE OWNER 2026-09-13, NOT TAKEN ON HIS BEHALF AFTER ALL — *"keep the status read"*.** `4.6a-iii` ships `my_access_requests()` (`S3`) | Without it `5b` cannot draw the screen, and the obvious alternative is the select policy `D6` rules out. ⚠️ **It was offered back because it was the one an owner might cut** — the client could have remembered *"I asked for X"* locally and shown nothing from the server. **He kept it**, so the joiner learns their request's state from the database that holds it |

✅✅ **DECISION 7 IS CLOSED — the owner ruled *"keep the status read"* on 2026-09-13, within
hours of the split merging and before `0029` existed.** ⚠️ **That is the cheapest a decision
of this kind ever gets**: a granted function in an unwritten migration, rather than a
fix-forward afterwards. ✅ **The function is now named — `my_access_requests()` — in the
parent row and in `4.6a-iii`'s row, and `4.6a-split-coverage.sh` counts it as the THIRTEENTH
deliverable.** ⚠️⚠️ **A ruled deliverable that only prose remembers is the shape of six of
this repository's seven stale-copy defects**, and it would have been the seventh kind: a
decision the owner made, recorded in a paragraph, and lost between two child tasks that each
assumed the other had it.

#### The split's own guard, and the eight fixtures it was falsified against

`docs/checks/4.6a-split-coverage.sh`, wired into `app.yml` beside the other two plan guards
— and ⚠️ **its eight fixtures are wired in too, as
`docs/checks/4.6a-split-coverage-falsify.sh`, which is the first time this repository has
run a guard's falsifications in CI rather than only the guard.** The other two plan checks
are machine-run; the fixtures proving they can still FAIL are not, so an edit that loosened
one into a check that passes on everything would be green twice over.
⚠️ **It reads THREE files as of the ADR amendment** — the plan, `supabase/README.md` and
ADR-035 — and **eleven fixtures** hold it. It asserts the **thirteen** deliverables of
`4.6a` — twelve from the split, plus the status read the owner ruled in — each land in
**exactly one** child row and the right one; that each child row exists **exactly once** in the file; that the five migration
numbers are claimed once each; and that **`supabase/README.md` agrees** — the cross-file
half, because the numbering authority is a second copy of the claim and this repository has
six recorded stale-copy defects.

| Fixture | The edit | Result |
|---|---|---|
| **Z0** | Control, unedited | 🟢 |
| **Z1** | `4.6a-iii`'s row deleted | 🔴 *"no table row for 4.6a-iii"* |
| **Z2** | **`D8`** moved from `4.6a-iii` into `4.6a-ii` | 🔴 — landed in the wrong child, which is how two tasks each assume the other has it |
| **Z3** | **`D3′`** struck from `4.6a-i`'s row | 🔴 — in the parent and in no child: dropped by the split |
| **Z4** | The parent row stops naming `request_access` | 🔴 — the coverage claim would be vacuous for it |
| **Z5** | `4.6c` left claiming `0029` | 🔴 — two rows claiming one migration number, which is the renumbering going stale in the file that hands the numbers out |
| **Z6** | `supabase/README.md`'s *"last migration of the database build"* left uncorrected | 🔴 — the numbering authority still says the schema is finished |
| **Z7** | A second copy of `4.6a-i`'s row added 200 lines away | 🔴 — the shape of THREE of this repository's six stale-copy defects |
| **Z8** | ⚠️ **`my_access_requests` struck from `4.6a-iii`** — added 2026-09-13 with the thirteenth deliverable | 🔴 — an atom added to a coverage list and never falsified is an atom nobody has shown the guard can see |
| **Z9** | ⚠️ **ADR-035 §2.7's superseded sentence restored** — the rulings freeze at `0027` again | 🔴 *"freeze when 0027 merges"* — and this is the file `CLAUDE.md` tells a cleared session to obey over every other, so the sentence is an instruction and not a note |
| **Z10** | ⚠️⚠️ **`4.6a-iii` struck out of §2.7's amendment TABLE** — the anti-vacuity case | 🔴 **only after the assertion was fixed.** It was GREEN first: the guard matched the same pair 1,500 lines away in §8's checklist. **A fixture caught the guard measuring the wrong copy** |

### ✅✅ `4.6a-iii` IS DONE AS OF 2026-09-14 — `0029` applied, `4.6a` is complete, and three green checks had stopped measuring their own claim

**`0029_request_path.sql` is applied and green.** `request_access(text)`,
`approve_request(uuid, uuid[])`, `my_access_requests()`, and one column —
`workspace_invite.requested_by`. Suite: `supabase/tests/0029_request_path.sql`, **67
behavioural checks**, **thirteen falsifications** against a **green control**.

⚠️ **`D6`, `D7` and `D8` are frozen as of this merge**, which closes register #9 entirely:
`D1`/`D2`/`D4`/`D5` froze at `0027`, `D3′`'s helper at `0027` with its two callers in `0028`
and `0029`, and these three here. §2.7's amendment table said they would stay cheap for two
migrations longer than the rest, and they did.

#### ⚠️⚠️ IT ADDS A COLUMN, AND THE SPLIT ASSIGNED THE SHAPE TO `0027`

`requested_by` — nullable, referencing `auth.users`, present exactly on the request path,
under a CHECK that says so from both sides. It is here rather than in `0027` because it is
the **pull path's own**, and `0027` shipped what both paths need.

⚠️ **It is not a convenience.** `D4` says `accepted_by` is *"who actually joined"*, and on the
invite path that is `auth.uid()` of whoever redeemed. A request row identifies its person by
**email** — so without this column, `approve_request` has to run
`select id from auth.users where email = wi.email`, which is a **second identity mechanism
for one column** and fails outright if the person changed their address between asking and
being approved. **`D4` was renamed precisely because one column meaning two things reads as
correct until somebody asks who a row is about.**

It also decides the status read: `my_access_requests()` is keyed on
`requested_by = auth.uid()`, which nothing can move. Keyed on the caller's address — which is
how `S3` sketched it — an email change in Supabase auth moves it.

#### ⚠️⚠️ THE RE-SIGNING FOUND A WORSE DEFECT THAN THE BREAKAGE IT WAS FOR

The new CHECK breaks any `source = 'request'` fixture written before it. **Two went red** —
`0027`'s `6.4` and `6.7`, plus one in `0028` — which is `S1`'s shape, predicted in this
migration's header rather than discovered afterwards.

⚠️⚠️ **THREE MORE STAYED GREEN AND SILENTLY STOPPED TESTING WHAT THEY CLAIM.** `0027`'s `6.5`,
`6.6` and `6.8` are `chk_raises … '23514'`, and a request row with no `requested_by` **still
raises `23514` — from the NEW constraint, not from `workspace_invite_source_consistent`, which
is what each of them is about.** Left alone, three checks written for `D1` and `D2` would have
reported PASS for ever while asserting nothing.

✅ **All five fixtures were re-signed, not the two that failed.** And the fix is *verified*
rather than assumed: with `requested_by`'s constraint dropped from the shipped migration,
`0027` still passes 64/64 — which is what says the constraint refusing `6.5`, `6.6` and `6.8`
is the one they were written for.

⚠️ **This is the THIRD time here that a check was found measuring something adjacent to its
claim** — after `4.6a`'s split guard matching the wrong copy of the ADR, and `plan-handover.sh`
reading a falsification table as a decisions table. **It is the first where a MIGRATION did it
to a suite that was already green**, and the rule it adds is narrow and cheap:
⚠️ **a new constraint that shares a SQLSTATE with an existing one silently inherits every
`chk_raises` aimed at the old one — so re-sign every fixture the new constraint can touch, not
the ones that turned red.**

#### ⚠️ A local harness said `exit=0` for a suite that had just failed

The battery script written for this session printed `exit=0` for every suite while `0027` was
failing two checks. What caught it was the **absence of the `all N checks passed` line**, not
the exit code. Same shape as `3.6a`'s *"a green tick is also what a step that ran nothing looks
like"*, arriving in a scratch script rather than in CI — and the reason the scratch script is
worth a paragraph is that **falsification is this project's working method**, so a harness that
cannot tell red from green quietly disarms every mutation run through it. **The count line is
what a suite's run means.** CI already knows this: `db.yml` greps for `not ok` rather than
trusting pgTAP's exit code, for exactly this reason.

#### ⚠️ Nine decisions taken on the owner's behalf

| | Decision | Why it was taken rather than asked |
|---|---|---|
| **1** | ⚠️⚠️ **The `requested_by` column** (above) | The alternative resolves an email string into an account at approval time, which is a second identity mechanism for `accepted_by` and breaks on an address change. **Cheap only until this merges** |
| **2** | **`request_access` takes the code and nothing else — no email, and NO ROLE** | The email is `S4`'s security property, already written up: an email argument is a way to claim somebody else's pending invite, a `manager` or `owner` one included. ⚠️ The role is the same argument one step further, and it makes `D7`'s *"the absorbed invite's role wins over the requested one"* **true by construction** rather than by a branch somebody could delete. A request is created at the table's default, `staff`; an owner who wants a manager uses the push path |
| **3** | ⚠️ **The result carries the workspace's NAME** | The one place the oracle returns more than yes. `C11.6` forbids LISTING workspaces; naming the single one whose code the caller already holds is not a listing — and without it a joiner cannot tell they have joined the wrong shop, which is a mistake nobody discovers until they are looking at somebody else's takings |
| **4** | **An inactive workspace is refused exactly as an unknown code is** | Same message, same SQLSTATE. *"That shop has been switched off"* is a fact about a workspace, told to somebody who is not a member of it |
| **5** | **A second ask is idempotent, not `23505`** | The person repeating it is a joiner on a bad connection, or somebody asking again the next morning because nothing has happened. They get their own pending row back |
| **6** | ⚠️⚠️ **`approve_request` is fenced at `owner`, asymmetric with `create_invite`'s `manager`** | Each follows the table it writes. `0028` writes `workspace_invite`, whose insert policy is manager-and-above (`0002:567`) and whose prose in §2.7 names *"an owner or manager"*. This writes `workspace_member` and `member_location`, and **both of those insert policies are owner-only** (`0001`) — which is also what §2.7's capability table says, giving members, settings and roles to the owner alone |
| **7** | **`D8` is enforced on the ROW's role, not on a constant** | Every request is `staff` today (decision 2), so the two spellings behave identically — but the ruling is written about the role, and spelling it that way is what keeps it correct if a non-staff request ever exists |
| **8** | **Approval sets `decided_by` to the approver and `accepted_by` to the requester** | This is the whole of what `D4` renamed the column for, on the only path where approving and joining are separate acts by separate people. `0027`'s CHECK makes the pair mandatory. **Check `6.4` is the first assertion in this repository that could ever have been written** |
| **9** | **`my_access_requests()` returns REQUESTS, not invites addressed to the caller** | An invite is delivered by WhatsApp and redeemed with a token; there is no screen on which a pending invite is something its recipient can see before they hold it. Widening it later is a `create or replace`; a client that has learned to expect invites is what would make it dearer |

#### Thirteen falsifications, run by hand before `0029` was committed

⚠️ **Each mutates the SHIPPED migration, runs `supabase db reset` from scratch, and re-runs
the suite.**

| Fixture | The edit to `0029` | Result |
|---|---|---|
| **G0** | Control, unedited, fresh reset | 🟢 all 67 |
| **G1** | ⚠️ The resolver accepts a **prefix** (`like v_code \|\| '%'`) — `D6` | 🔴 `2.5`, the seven-eighths-of-a-code case |
| **G2** | An inactive workspace becomes joinable (decision 4) | 🔴 `2.8` — **and `8.1`, which is how the second bug in the suite itself was found**, see below |
| **G3** | `D7` removed: a pending invite is no longer absorbed | 🔴 aborts at `4.1` with `23505` — **the two paths colliding on the one-pending index**, which is exactly the collision `D7` exists to resolve |
| **G4** | ⚠️ `D7`'s escalation half: the invite's role stops winning | 🔴 `4.2`, `4.5` — the manager the owner chose arrives as a staff member |
| **G5** | `D3′` unwired on the pull path | 🔴 aborts at `4.7` with `23505` — a lapsed invite holding the slot **against the person it was issued to** |
| **G6** | Approval fenced at `manager` (decision 6) | 🔴 `5.2` and eight more: the manager's approval lands, and everything downstream measures a membership nobody with the right to grant it granted |
| **G7** | `D8` removed | 🔴 `5.7` |
| **G8** | ⚠️⚠️ `accepted_by` becomes the **approver** — the overload `D4` was renamed to end | 🔴 `6.4`, alone and exactly |
| **G9** | Approval writes no `member_location` rows | 🔴 `6.1`, `6.3`, `6.6` — `my_locations()` returns 0 of 2 for a member whose row looks right |
| **G10** | ⚠️ The status read stops being the caller's own | 🔴 `8.1`, `8.3`, `8.5`, `8.7` — **after the suite was fixed twice**, see below |
| **G11** | The status read stops being `security definer` | 🔴 `1.5` and all five of section 8 — **this is `S3` itself**: under RLS the joiner sees zero rows, because no policy can ever show them their own request |
| **G12** | `requested_by`'s CHECK dropped | 🔴 `1.7`, `9.4`, `9.5` |
| **G13** | Approval stops being idempotent and re-decides an approved request | 🔴 `6.8`, `6.9` |

#### ⚠️⚠️ AND TWO OF THE FIXTURES FOUND BUGS IN THE SUITE RATHER THAN IN THE MIGRATION

**`G2` and `G10` both killed the file on *"more than one row returned by a subquery used as an
expression"*, three sections below the check written for them.** Four checks in section 8 read
`my_access_requests()` as a **scalar** — `(select status from public.my_access_requests())` —
which is correct only while the caller has exactly one row, and every mutation that gives them
a second one aborts the run instead of failing the assertion. ⚠️ **A check that dies cannot
name what it caught**, and the checks that would have named these were `2.8`, `8.1`, `8.3`,
`8.5` and `8.7` — every one of them a claim about who may see what.

✅ **All four now key on a named `request_id`, and `8.3` is spelled as two existence claims**
(*"they see one row and it is theirs"* and *"they do not see the other person's"*), because
only the second of those fails when the `where requested_by = auth.uid()` is removed. **Both
fixtures were re-run after the fix and both now report by name.**

### ✅✅ `4.6a-ii` IS DONE AS OF 2026-09-13 — `0028` applied, and §2.7's sentence about it is the stale copy

**`0028_invite_path.sql` is applied and green.** `create_invite(workspace_id, email, role,
location_ids)` and `redeem_invite(token)`, plus two helpers nobody may call —
`generate_invite_token()` and `hash_invite_token(text)`. Suite:
`supabase/tests/0028_invite_path.sql`, **77 behavioural checks**, and **eleven
falsifications** against a **green control**.

⚠️ **It adds no column, no policy, and no ruling of register #9.** `D1`, `D2`, `D4` and
`D5` are `0027`'s columns and this writes rows under them; **`D3′` is `0027`'s helper and
this is its first caller**; `D6`, `D7` and `D8` are `0029`'s and stay there. The only place
this file touches the pull path is the branch that REFUSES to absorb a live request.

#### ⚠️⚠️ §2.7 SAYS THIS FUNCTION RUNS "UNDER NORMAL RLS" AND IT CANNOT

**Found by trying to write the supersede call, not by reading the sentence.** §2.7's push
paragraph predates its own amendment; `D3′` arrived later and contradicts it:

| | Says |
|---|---|
| **§2.7, push paragraph** | *"An owner or manager calls `create_invite(...)` **under normal RLS**"* |
| **`D3′`** | *"the creating RPC must **SUPERSEDE** any expired pending row"* |

⚠️ **Superseding is an UPDATE, and `0002:576` says in terms that there is no update policy
on `workspace_invite`** — *"redemption is written by `redeem_invite()`, which is security
definer. An invite is never edited by hand."*

⚠️⚠️ **AND THE DATABASE ANSWERED HARDER THAN THIS SESSION'S FIRST DRAFT OF THE MIGRATION
CLAIMED.** The draft said the UPDATE would match zero rows and say nothing. It does not even
get that far: **`0002:594` grants `authenticated` select, insert and delete on that table and
NOT update**, so the statement is refused `42501` before any policy is consulted. The
invoker-rights spelling would therefore have **died** on the supersede — and the obvious fix
for that error is to grant UPDATE, at which point the missing policy makes it the silent
no-op, the INSERT collides with `workspace_invite_one_pending_idx`, and **`D3′`'s bug returns
wearing the costume of its own cure.** ✅ **Both halves are asserted rather than argued:
check `8.2` is the missing policy, check `8.3` performs the refused UPDATE under
`set role authenticated` as an OWNER of the workspace.**

✅ **So `create_invite` is `security definer` with the fence in the body** — `has_role(ws,
'manager')`, the same predicate `workspace_invite_insert` carries — which is where `0021`,
`0022`, `0025` and `0026` already keep theirs. ⚠️ **`0027`'s own grant comment already named
this function as one of the definer bodies that call `supersede_expired_invite`**, so the
applied schema and the ADR sentence had already disagreed and nobody had said so.
⚠️ **It is named here rather than edited into the ADR**: the ADR is amended by the owner's
deliberate decision and a task is not one. **It is the ninth stale copy recorded here, and
the second inside ADR-035 itself.**

#### ⚠️ Six decisions taken on the owner's behalf, and the fifth is the one offered back

| | Decision | Why it was taken rather than asked |
|---|---|---|
| **1** | **`security definer`, fence in the body** (above) | `D3′` cannot be obeyed any other way, and the alternative — a definer `supersede_expired_invite` — is the one `0027` refused in writing, because a definer helper reachable on its own retires somebody else's pending invite |
| **2** | ⚠️ **`create_invite` takes `p_workspace_id`**, which this file's own sketch of the signature did not | Deriving it is *"the one workspace this caller manages"*, and §2.7 refuses that in advance: *"many workspaces per user works from day one … retrofitting that later would touch every screen."* Every other fenced RPC here is NAMED its scope by the caller; this one has no row to read it off |
| **3** | **The token is 16 Crockford characters (80 bits), and normalisation lives INSIDE the hash** | Same alphabet as `D5`'s code because it is delivered the same way — §2.7: *"the owner sends the code over WhatsApp"*. 16 rather than 8 because `redeem_invite` is an oracle by construction and this token IS the approval, where the join code admits a caller to nothing until an owner acts. Normalising inside `hash_invite_token` is what makes *"the creating and redeeming halves disagree about what a token is"* unwriteable — a defect that would present as *"the code the owner is reading aloud does not work"* with nothing in the schema looking wrong |
| **4** | ⚠️ **A `staff` invite must name at least one location; a `manager` or `owner` invite stores `'{}'` whatever was passed** | **`D8`'s ARGUMENT, not `D8`** — which is `0029`'s and stays there. Its reasoning is about `member_location`, not about which RPC wrote it: an approved joiner with no locations opens the app and **every write is refused by RLS with no message**, which looks exactly like the app being broken. The converse is `0002:377`: those roles get every location by role, and a row here would outlive a demotion |
| **5** | ✅✅ **RULED BY THE OWNER 2026-09-13, NOT TAKEN ON HIS BEHALF AFTER ALL — *"do what you recommend"*.** Redemption does NOT require the caller's signed-in address to match the invite's | It was offered back because it was the one an owner might cut: an address check is a real second factor. He kept the recommendation, so the token is the credential — `5a-iv-c-3` signs the shopkeeper in with Google, whose address is not necessarily the one the owner typed, and refusing that is silent from the joiner's side. `accepted_by` records who actually joined, so nothing is lost. ⚠️ **The behaviour is unchanged from what `0028` merged with**, so the ruling cost no migration. Checks `6.9` and `6.10` are the only thing holding it; falsification `F11` |
| **6** | **A LIVE pending invite is replaced; a LIVE pending REQUEST is refused** | *"I sent it, they never got it, send it again"* is what a shop does, and refusing costs a human step — the owner's tie-break is the option that adds none. But inviting someone who has already ASKED is an **approval**, and approval carries `D8`, which is `0029`'s: absorbing it here is the `Z2` fixture's shape exactly, two tasks each assuming the other owns a ruling |

⚠️ **A seventh call is inside decision 6's family and is worth its own line: a returning
member is REACTIVATED and the invite's locations REPLACE what was there.**
`workspace_member_unique` makes re-joining an UPDATE rather than an INSERT, and the
alternative is `23505` in front of a shop re-hiring last summer's cashier. ⚠️ **The
replacement is also what stops a second `23505`** — falsification `F7` removed it and the
suite went red on a `member_location_pkey` collision, not on the check written for it: an
existing member re-invited to a store they already hold collides with themselves.

#### ⚠️ Three things found by asking the database rather than reading the file

**`H1` — `authenticated` HAS NO UPDATE GRANT ON `workspace_invite` AT ALL**, which is
stronger than the missing policy and makes decision 1 unavoidable rather than merely wise.
Written up above; check `8.3`.

**`H2` — `proconfig` SPELLS THE EMPTY SEARCH PATH `search_path=""`, WITH THE QUOTES.** The
first spelling of check `1.7` asserted `search_path=` and went red against four functions
that all carry it correctly. ⚠️ **Had it been written the other way round — asserting a
prefix that always matches — it would have passed on a function with NO `search_path` at
all**, which is the vacuous green this repository keeps finding. Check `1.7`.

**`H3` — `workspace_invite_expiry_future` REFUSES A ROW WHOSE EXPIRY PRECEDES ITS CREATION**
(`0002:387`), so *"make this invite old"* is **two columns, not one**. The constraint caught
the first spelling of check `6.7`, which moved `expires_at` into the past and left
`created_at` at `now()`. Nothing in the migration changed; the suite did.

#### Eleven falsifications, run by hand before `0028` was committed

⚠️ **Each mutates the SHIPPED migration, runs `supabase db reset` from scratch, and re-runs
the suite** — so every row below is a claim about the file that merges. The control was
**green on its first run**, unlike `0027`'s: the harness pipes `_cleanup.sql` and the suite
into the container over stdin rather than copying them in, so the container recreation that
cost `4.6a-i` an hour cannot happen here.

| Fixture | The edit to `0028` | Result |
|---|---|---|
| **F0** | Control, unedited, fresh reset | 🟢 all 77 |
| **F1** | ⚠️⚠️ `create_invite` stops calling `supersede_expired_invite` — **`D3′` unwired** | 🔴 aborts at `4.2` with `23505` on `workspace_invite_one_pending_idx` — the lapsed row holding the slot forever, which is the bug `D3′` exists for |
| **F2** | The live pending invite is no longer replaced (decision 6) | 🔴 aborts at `4.5` with the same `23505`, one section later |
| **F3** | `hash_invite_token` stops normalising (decision 3) | 🔴 `2.7`, `6.11`, `6.12` — and `6.11` is the end-to-end one: a token typed in lower case and in groups is *"not valid"* |
| **F4** | `hash_invite_token` granted to `authenticated` | 🔴 `1.4` — the offline oracle, which is what 80 bits is defending |
| **F5** | A `staff` invite may name no location (decision 4) | 🔴 `3.9`, and **not the way it was expected to**: `23502`, not acceptance — with the guard gone, `array_agg` over an empty array returns NULL and the not-null column refuses it. The check asserts the SQLSTATE, which is why it caught a wrong error rather than passing on any error |
| **F6** | A manager may mint an owner (decision 9 of the migration) | 🔴 `3.6` — *"no exception raised"* |
| **F7** | The old `member_location` rows are merged, not replaced | 🔴 `7.3`, **and `6.9`/`6.10` with a `member_location_pkey` collision** — see above |
| **F8** | The membership is written and the `member_location` rows are not | 🔴 `5.3`, `5.7`, `5.8` — **`5.7` is the one that matters**: `my_locations()` returns 0 of the workspace's 2 stores for a joiner whose row looks fine |
| **F9** | Expiry stops being checked at redemption | 🔴 `6.7` |
| **F10** | A spent token becomes reusable by anybody | 🔴 `6.6` |
| **F11** | ⚠️⚠️ **The 2026-09-13 ruling REVERSED** — the caller's address must match the invite's | 🔴 `6.9`, `6.10`, and `4.7`/`6.7`/`6.8` as collateral, because the added comparison sits ahead of the expiry branch and answers `42501` where the suite wants `TD003`. ⚠️ **RE-RUN AFTER THE RULING, AND THE FIRST RUN WAS WORSE THAN IT LOOKED**: it aborted at `5.9` — whose manager invite was addressed to somebody other than the user who redeems it — so the suite died three sections before the check that NAMES the ruling and said nothing about whose decision was being undone. ✅ **`3.18`'s fixture is re-signed to that user's own address**, and the reversal now lands where it is documented |

#### ⚠️ What `0028` deliberately does NOT do

- **No `request_access`, no `approve_request`, no `my_access_requests`.** They are `0029`
  (`4.6a-iii`) and `D6`/`D7`/`D8` freeze when it merges.
- **No policy, on any table.** Checks `8.1`, `8.2`, `8.4` and `8.5` say so structurally —
  including that `workspace` still has exactly its two policies from `0001`, because the
  cheapest-looking way to make `5b`'s join screen work is a SELECT policy there and `D6`
  rules it out.
- **No seed rows.** `02`'s `F9` asserts `workspace_invite` is empty in the seed on purpose,
  which `4.6a-i` recorded as `S2`; `0028` touches no seed file either.
- **No `source = 'request'` handling in `redeem_invite`, and none is needed.** `0027`'s
  `workspace_invite_source_consistent` makes `token_hash` NULL on that path, and a null
  cannot equal a hash — **the constraint is the check**, so there is no branch to get wrong.

### ✅✅ `4.6a-i` IS DONE AS OF 2026-09-13 — `0027` applied, and two of the eight rulings could not both be true

**`0027_membership_shape.sql` is applied and green.** `workspace.code` with its
generator and normaliser (**`D5`**), `workspace_invite` re-shaped — `source` (**`D1`**),
nullable `token_hash` (**`D2`**), `invited_by` → `decided_by` (**`D4`**, the first rename
in this schema) — under ONE check constraint, the **`D3′`** supersede helper, the
backfill, `onboard_workspace` replaced a third time, and `02`/`03`/`04` re-signed
exactly as `S1` predicted. Suite: `supabase/tests/0027_membership_shape.sql`, **64
behavioural checks**, and **eleven falsifications** against a **green control**.

#### ⚠️⚠️ `D1` AND `D4` CANNOT BOTH BE TRUE AS WRITTEN, AND THIS IS THE DECISION OF THE SESSION

**Found by trying to write the check constraint, not by reading the ruling.** ADR-035
§2.7 carries both, ten lines apart, and they contradict each other:

| | Says |
|---|---|
| **`D1`** | `decided_by` is *"present **exactly when** `source = 'invite'`"* |
| **`D4`** | `decided_by` is *"set at creation for an invite **and at approval for a request**"* |

⚠️ **An approved request has a decider on a `source = 'request'` row.** `D1`'s CHECK
forbids precisely the row `D4` requires, so no constraint satisfies both and the
migration had to choose one.

✅ **It chose `D4`, and `D1`'s own reason survives intact.** `D1` exists because *"a
self-request has nobody to put there"* — a statement about the row **at creation**, not
for all time. A CHECK cannot say *"at creation"*, so the invariant is expressed as the
state that means the same thing:

```
invite   → decided_by is not null                              (a decider from the start)
request  → (decided_by is not null) = (accepted_at is not null) (a decider once decided)
```

⚠️⚠️ **Taking `D1` literally instead would have left `D4` renaming a column for a
question it can no longer answer.** `D4`'s entire argument is that *"who approved this
membership"* must have an answer in the schema — and the request path is the **only**
path where approval is a separate act by a separate person. A literal `D1` empties
`decided_by` on exactly those rows.

⚠️ **This is reported rather than assumed, and it is cheap only until `0028` builds on
the column.** It is the one call here the owner might make differently — the other way
is a second column, which is what `D4` was written to avoid. **Checks `6.6` and `6.7`
are the pair that holds it**, and falsification **`F2`** is the literal reading: it
turns `6.7` and `6.8` red, and `6.8` red means the schema permits an approved
membership whose approver is nobody.

#### ⚠️⚠️ Three things found by asking the database instead of reading the file, and the first is a security defect in this session's own first draft

**`G1` — `revoke all … from anon, authenticated` LEFT EXECUTE GRANTED TO PUBLIC.** The
first spelling of `0027` revoked the two Supabase roles from all three helpers, which
reads as tighter than the repository's idiom and is strictly weaker: **EXECUTE on a new
function is granted to `PUBLIC` by default**, and `proacl` still read `=X/postgres`
after the revoke. ⚠️ **`supersede_expired_invite` was reachable by any authenticated
caller** — a way to retire somebody else's pending invite. `0001:595` and `0002:596`
already had it right (`from public`); the tighter-looking line was the wrong one.
✅ **Caught by `\d`-ing `pg_proc.proacl` rather than re-reading the migration**, which
is the same move that found `5a-iv-a`'s four blockers and register #9's three extra
collisions. **Four for four.** Checks `9.1`–`9.4`; falsification **`F7`**.

**`G2` — A COLUMN RENAME DOES NOT RENAME ITS CONSTRAINTS.** After `D4`, the foreign key
was still called `workspace_invite_invited_by_fkey` — a copy of the old name living in
the catalog, which is the place a later session reads when a constraint fires and the
error names it. ✅ **Renamed in the same migration**, since after `0027` merges it is a
fix-forward. Check `7.3`; falsification **`F10`**.

**`G3` — ⚠️⚠️ THE BACKFILL RUNS OVER ZERO ROWS IN CI, AND THE PILOT WORKSPACE IS THE
ROW IT EXISTS FOR.** `supabase db reset` applies every migration **before** the seed,
and the seed creates its workspaces afterwards through `onboard_workspace` — so the
green run that proves `0027` applies **never executes its backfill loop against a
single row.** This is not a defect in the migration; it is a **hole in what a green
db.yml can mean**, and it is the same shape as `3.6a`'s *"a green tick is also what a
step that ran nothing looks like."* ✅ **Section 5 of the suite re-performs the loop's
guarantee** — 50 rows written one at a time into `public.workspace`, distinct and valid
— and **says in its own header that it did not watch the migration's `do` block run.**
⚠️ **It is written as inserts into the real table on purpose**: `generate_workspace_code`
tests collisions against `public.workspace`, so a version writing to a temp table would
pass against a generator with no collision check at all.

#### ⚠️ Four decisions taken on the owner's behalf, and the first is the only expensive one

| | Decision | Why it was taken rather than asked |
|---|---|---|
| **1** | ⚠️⚠️ **`D1` resolved in `D4`'s favour** (above) | Neither ruling can be dropped without the other losing its purpose, and no constraint satisfies both. **Cheap until `0028`; a fix-forward migration after.** Flagged by name for exactly that reason |
| **2** | **`D3′` needs a column: `superseded_at`, and the partial index re-cut to read it** | A function can free the one-pending slot only by DELETING the row or changing a column the predicate reads. `0002:403` calls these rows *"an audit trail"*, and stamping `accepted_at` instead would record a membership that does not exist. It is a timestamp, not a boolean, because *"when did this lapse"* is what an approval queue gets asked |
| **3** | **The code is generated from `gen_random_bytes`, not `random()`** | `D6` makes the resolving RPC an enumeration oracle and says the length is the only thing defending it. A caller who can predict the PRNG does not need to guess. pgcrypto was already installed |
| **4** | **`source` is text-with-a-CHECK, not a seventh enum** | Follows `failed_write.kind` (`0024:205`), the most recent precedent and the closest in shape. The six enums here are domain vocabulary; this is a two-valued discriminator §2.7 spells as two string literals |

#### Eleven falsifications, run by hand before `0027` was committed

⚠️ **Each mutates the SHIPPED migration, resets from scratch, and re-runs the suite** —
so every row below is a claim about the file that merges, not about a hand-edited
database. ⚠️⚠️ **The control was RED on its first run and it was the harness, not the
schema**: `supabase db reset` recreates the container, so the `_cleanup.sql` copied into
`/tmp` beforehand had vanished and the seed's two workspaces survived into the suite
(`4.2` and `5.2` counted five workspaces, not three). **A fixture red for the wrong
reason is a coincidence, not a falsification** — `5a-iv`'s mutation helper made the same
class of mistake — so the table below is from the corrected harness, with the failing
check names read out of each run rather than assumed.

| Fixture | The edit to `0027` | Result |
|---|---|---|
| **F0** | Control, unedited | 🟢 all 64 |
| **F2** | ⚠️ **`D1` read LITERALLY** — a request may never name a decider | 🔴 `6.7`, `6.8` — and `6.8` is the one that matters: the schema now permits an approved membership with no approver |
| **F3** | **`D4` alone** — nothing constrains `decided_by` on a request | 🔴 `6.6`, `6.8` |
| **F4** | The partial index left as `0002` wrote it | 🔴 `8.1`, `8.4` — the fix stops working, and `8.2` still passes, which is the point of the pair |
| **F5** | `supersede_expired_invite` forgets it is about EXPIRED rows | 🔴 `8.6`, `8.7`, `8.8` |
| **F6** | It ignores the `workspace_id` it was given | 🔴 `8.8` |
| **F7** | ⚠️ **`G1`'s original spelling restored** — revoke from `anon, authenticated` | 🔴 `9.1`–`9.4` |
| **F8** | A 36-character alphabet — `I`, `L`, `O`, `U` back in | 🔴 **AT RESET**, on `workspace_code_shape`: the seed's own `onboard_workspace` cannot write a code. Confirmed by reading the constraint name out of the failure, not by assuming |
| **F9** | The normaliser stops mapping Crockford's excluded letters | 🔴 `3.2`, `3.3`, `3.4` |
| **F10** | **`G2`'s rename skipped** — the FK keeps the old column's name | 🔴 `7.3` |
| **F11** | ⚠️ **A whole section of the SUITE deleted** (section 10) — the anti-vacuity case | 🔴 `11.1`, the count guard |
| **F12** | The code shape check relaxed to `code is not null` | 🔴 `1.5`–`1.11`, plus `3.10`, `4.2`, `5.2` downstream |

#### What `0027` deliberately does NOT do

- **No RPC.** `create_invite` / `redeem_invite` are `0028`; `request_access` /
  `approve_request` / `my_access_requests` are `0029`. Asserting anything about the flow
  here would be asserting it about a function nobody has written.
- **No seed rows** (`S2`). `02`'s `F9` asserts `workspace_invite` was empty in the seed
  and says a future seed populating it *"turns red and someone decides whether the
  fixture is still wanted."* No seed file was touched.
- **No policy.** `D6` forbids a scan of `workspace` by code, and the cheapest-looking way
  to make `0029`'s join screen work is exactly the SELECT policy it rules out. Checks
  `10.1` and `10.2` assert `workspace` still has only its two policies from `0001` and
  that the SELECT one is still membership-scoped.

### ⚠️⚠️ 4.6a — the membership flow has no functions, and the owner wants the inverse of the one it was designed for

**Two separate facts, and the second is worse than the first.**

**(1) `create_invite` and `redeem_invite` do not exist.** `workspace_invite` is a
table only — `0002:362` says in terms *"create_invite() and redeem_invite() are 0005,
because redeem_invite is `security definer` and belongs with the other RPCs"* — and
`0005` is the **allocation** migration. ADR-035's own checklist (§1400) still carries
`workspace_invite` + `create_invite` + `redeem_invite` as an **unticked box**, and
§1424 lists the staff invitation flow as a shipped decision. **The row shipped; the
flow never did.** Nothing caught it because a table with no callers breaks no test:
`01_rls_coverage` computes its plan structurally and passes on the policies alone.

**(2) The owner's flow is the inverse of the table's.** (C11.5)

| | Built for | Asked for |
|---|---|---|
| Who starts it | **The owner.** `create_invite(email, role, location_ids)` → token → WhatsApp | **The joiner.** He signs up, enters a code, requests a role |
| What the other party does | Redeems a token | **Approves** — the owner, or us as admins |
| `invited_by` | `not null` | has no value at request time |

⚠️ **Both are wanted, not one instead of the other**: *"if our owner sends an invite
that counts as a pre-approval for the request, but the user should also be able to
request access to a workspace on his own."* So an invite is **a request that arrives
pre-approved**, which is the framing that lets one table serve both — and it is the
one modelling decision in 4.6a worth arguing about before it is written, because
`workspace_invite.invited_by` is `not null` today and a self-request has nobody to put
there.

**And it needs a column that does not exist: `workspace` has no code** (`0001:110` —
`id`, `display_name`, `currency`, `prices_include_tax`, `is_active`). The `id` cannot
serve; nobody reads a uuid over WhatsApp. Unique, short, transcribable, and **never
listed** — C11.6 is explicit that workspaces are not browsable.

### ✅✅ Decision register #9 — RULED 2026-09-13. All eight taken as recommended, and three of the eight did not exist when the brief was written

⚠️⚠️ **CLOSED. `4.6a` IS UNBLOCKED AND ADR-035 CARRIES THE RULING** (§2.7 and decision
register #9, revision entry dated 2026-09-13). **The brief below is kept as written**,
because it is the argument the ruling accepted — but **`D3` was AMENDED and `D7`/`D8` were
added** after the table was opened again on the day of the ruling. See *"The three that
were not in the brief"* beneath it.

### ⚠️⚠️ Decision register #9 — THE BRIEF. Four collisions, not one, and three were found by reading the table

**Prepared 2026-09-13 so the owner is RULING, NOT DESIGNING.** Each row below has a
recommendation and its reasoning; the intended answer is *yes* or *no*, not a design.

⚠️⚠️ **THE WRITE-UP ABOVE NAMED ONE COLLISION. `0002_catalog.sql:370` HAS FOUR.** The
other three were found by opening the migration instead of trusting the summary of it —
the same move that found `5a-iv-a`'s four blockers and this session's missing JDK.
**`token_hash`, `expires_at` and `accepted_by` appeared nowhere in this file before now.**

| # | The collision | Recommendation | Why |
|---|---|---|---|
| **D1** | `invited_by uuid **not null** references auth.users` — a self-request has nobody to put there | ✅ **Add `source` (`'invite'` / `'request'`), make the column nullable, and CHECK that it is present exactly when `source = 'invite'`** | Keeps one table, which is what *"an invite is a request that arrives pre-approved"* asks for, and makes the invariant the **database's** job rather than a rule the app remembers |
| **D2** | `token_hash text **not null** unique` — ⚠️ **named nowhere before today** | ✅ **Nullable, under the same CHECK as D1** | A self-request has no token **as a matter of concept, not of timing**. A dummy token to satisfy `not null` would be a unique, never-redeemable secret stored for no reason |
| **D3** | `expires_at not null default (now() + 7 days)` — does an unanswered *request* expire? | ✅ **Keep it, unchanged, for both paths** | A request that goes stale after a week keeps the owner's approval queue short and costs the joiner one tap to re-ask. ⚠️ **It is a real choice and nobody had made it** — the default was written for invites and would have been inherited silently |
| **D4** | ⚠️⚠️ **`accepted_by` MEANS TWO DIFFERENT PEOPLE.** For an invite it is the **invitee**, accepting. For a request it is the **owner**, approving | ⚠️ **THE ONE WORTH ARGUING ABOUT.** Rename `invited_by` → **`decided_by`** (nullable; set at creation for an invite, set at approval for a request), and keep `accepted_by` for **who actually joined** | The two facts are *who approved this* and *who joined*. One column carrying both **reads as fine** until someone asks who approved a membership — and then the answer is not in the schema. This is the one that is cheap today and a fix-forward migration after `0027` |

**And the column that does not exist at all.** `workspace` has `id`, `display_name`,
`currency`, `prices_include_tax`, `is_active`, `created_at`, `updated_at` — **no code**,
and ✅ **no later migration adds one** (checked across `supabase/migrations/**`, 2026-09-13).

| # | | Recommendation | Why |
|---|---|---|---|
| **D5** | The join code's shape | ✅ **8 characters, Crockford base32 (no `I`, `L`, `O`, `U`), normalised case-insensitively on input, `unique`, generated with retry-on-collision** | It is read aloud over WhatsApp and typed by someone standing up. The excluded letters are the ones misread as `1` and `0`; 8 characters is ~10¹² codes, so collisions are a retry and not a design |
| **D6** | How a code is looked up, given C11.6's *"workspaces are NEVER listed"* | ✅ **A `security definer` RPC taking the WHOLE code. No policy that permits a scan** | ⚠️ **Such an RPC is an enumeration oracle by construction** — it answers *does this code exist*. 8 Crockford characters make guessing impractical; **a 4- or 5-character code would not**, which is the real reason for the length |

⚠️ **D1 and D2 share one CHECK; D4 is a rename plus a nullable column; D5/D6 are one column
and one function.** None of it is large. **All of it is frozen the moment `0027` merges**,
which is why it is a brief and not a task.

#### ⚠️⚠️ The three that were not in the brief — found on the day of the ruling, by opening the table again

**The brief was verified before it was put, and the verification found more.** `0002_
catalog.sql:370` was read line by line rather than trusted; all four collisions were
confirmed exactly as described, **and one recommendation turned out to rest on something
false.**

| # | | Ruling | Why |
|---|---|---|---|
| **D3′** | ⚠️⚠️ **`D3`'s REASONING WAS WRONG, AND THE RULING CORRECTS IT.** The brief said an expired request *"costs the joiner one tap to re-ask."* **It costs them everything: they can never ask again.** `workspace_invite_one_pending_idx` is partial on `accepted_at is null`, and **an expired row still has `accepted_at is null`** — so it holds the slot permanently and a second row for that `(workspace_id, email)` is refused. The same bug blocks re-inviting anyone whose invite lapsed | ✅ **Keep the 7-day expiry for both paths, and make the creating RPC SUPERSEDE any expired pending row first** | ⚠️ **It cannot be fixed in the index.** `now()` is not `immutable`, so `where accepted_at is null and expires_at > now()` is not a legal index predicate. The fix has to live in the function |
| **D7** | **The two paths can collide on one person.** The owner invites Alice; Alice also types the join code. The unique index rejects her insert and she is shown a database error for doing the thing she was asked to do | ✅ **The request path ABSORBS the invite rather than erroring**: a pending invite for that email is **accepted** by entering the code | *"An invite is a request that arrives pre-approved"* — so someone already invited who then uses the code should simply be let in, **and told none of it** (§2.8: we do the bookkeeping, not them) |
| **D8** | ⚠️⚠️ **AN APPROVED STAFF MEMBER WITH NO LOCATIONS CANNOT DO ANYTHING, AND IS NEVER TOLD.** Staff write only where `member_location` puts them, enforced by **RLS** (`location_id in (select my_locations())`). On the invite path the owner picks `location_ids` up front; **on the request path nobody has picked them** | ✅ **The approval RPC takes `location_ids` and refuses an empty array when `role = 'staff'`** | The failure is **silent** — the joiner opens the app and every write is refused with no message. That is indistinguishable, to them, from the app being broken |

⚠️ **`D3′` is the one to notice.** It is not a new requirement; it is a **defect in the
brief's own reasoning**, found because the migration was opened instead of the summary of
it. The same move found `5a-iv-a`'s four blockers, `5a-iv-c-1`'s missing JDK, and the four
collisions this brief is built on. **Three for three.**

### ✅✅ ÁREA 9 IS RULED, 2026-09-14 — and the answer RETIRES the question `4.6c` was written to fix

**The owner answered all six of Part A in his own words.** The brief was built to decide
*which* of two broken margin questions `4.6c` would repair. ⚠️⚠️ **His answer was neither:
`A3` — *"we won't derive the profit so let's ignore margins for now. I'd rather just show
total revenue"*.** So `4.6c` as scoped — *"the family margin view: purchases-in against
sales-out, per family, per period"* — **is cancelled, not re-sized.** `B2`, `B3` and `B4`
were recommendations about a view nobody is building.

⚠️ **This is the grill-me rule earning its keep.** Part A carried **no recommendations on
purpose**, and a session that had proposed the obvious answer would have proposed the
margin view — the thing the owner does not want — and been agreed with, because it was the
only option on the table. **The brief's own sentence was "CI can prove a view is consistent;
it can never prove it is the number a shopkeeper wanted."**

#### The rulings, in his words

| | Ruling |
|---|---|
| **A1** | Números is *"charts and tables about their transactions … doesn't have to be very robust nor sophisticated for now"*: **how much was bought this week/month**, **how much are we selling per day, per product / product family**, and **how prices have changed for purchases/selling**. Plus a **download of the transactions breakdown** — all transactions and waste for a given month. More complex questions and user-chosen tiles come later |
| **A2** | **Daily / Weekly / Monthly, switchable.** *"Make a good guess for this initial version, we will improve it afterwards"* |
| **A3** | ⚠️⚠️ **No profit, no margin.** *"I'd rather just show total revenue"*, displayable **per product family AND per product variant** |
| **A4** | **Waste sits in a different visual**, not inside any profit number |
| **A5** | Today he checks with **a notebook and a feeling** |
| **A6** | The three: **1.** quantity sold, in pieces, kg or whatever unit. **2.** revenue earned. **3.** **price changes per product over time**, purchases and sales, with a small card of the **% change** over the current month, 1, 3, 6, 9 months and **YTD** |

#### ⚠️ What the applied schema ALREADY answers, measured rather than assumed

**Asked of the database on 2026-09-14, against the seed, under `set role authenticated`:**

| Read | Staff | Manager |
|---|---|---|
| `product_velocity_daily` — `qty_base_sold`, `revenue_net`, per variant per day, **carrying `family_id` and `family_name` on every row** | ✅ **15,099 rows, $65,549** | ✅ 28,433 rows |
| `product_margin_daily` — cost, COGS, margin | 🚫 **0 rows** | ✅ 1,608 rows |
| `product_waste_daily` — waste cost **and `purchases_qty_base` / `purchases_net`** | 🚫 **0 rows** | ✅ 954 rows |

✅✅ **So `A6`'s first two numbers are ALREADY IN THE SCHEMA and already reach a cashier.**
`0013`/`0014`'s velocity view is quantity-and-revenue with no cost in it — which is exactly
why `F2`'s twin did not break it — and it carries the family on every row, so *"per family
and per variant"* is a `group by`, not a migration.

⚠️ **The cost fence is real and was verified, not trusted.** `0009` carries
`has_role(..., 'manager')` **in the view body**; `product_waste_daily` does **not**, and
does not need it — every base table it reads (`stock_movement`, `purchase`, `purchase_line`)
carries `has_role(workspace_id, 'manager')` in its own SELECT policy, so a staff caller gets
zero rows by RLS. **Both were checked by asking the database, after one of them was wrongly
suspected of leaking.**

#### ⚠️⚠️ THREE THINGS THE RULING NEEDS THAT THE SCHEMA DOES NOT HAVE

| | What | Where it stands |
|---|---|---|
| **N1** | **Revenue in the currency the shopkeeper recognises.** `revenue_net` is net of IVA; `workspace.prices_include_tax` defaults **true**, so the shelf label already includes the tax and *"revenue earned"* almost certainly means **gross**. ~~The only column carrying tax is `product_margin_daily.tax_collected` — **manager-only**, so the staff-readable view cannot reach it~~ | ✅✅ **RULED 2026-09-14: GROSS, net beside it.** ⚠️⚠️ **AND THE STRUCK HALF WAS WRONG — `4.6c-i` MEASURED IT.** `tax_collected` is a VIEW COLUMN over `sale_line.tax_amount`, which is member-level (`0003`, no `has_role`): the cashier reads $4 826.96 of it and 0 rows of `product_margin_daily`. **A fence on a view was read as a fence on the column under it.** No fence moved |
| **N2** | **Purchases as a first-class read.** *"How much was bought this week/month"* exists only as `purchases_qty_base` / `purchases_net` **inside `product_waste_daily`** — a view named for waste, which is not where anyone will look, and whose grain is a variant-day | Needs a view |
| **N3** | **Price over time, both sides, with the % windows.** Nothing in the schema answers it. `provider_price_memory` (`0008`) is the **last** purchase price only, not a history; `price_list` is the *intended* sale price and ~~**is EMPTY in the seed (0 rows)**~~ — ⚠️⚠️ **FALSE, AND MEASURED FALSE BY `4.6c-ii`: 390 rows over 341 variants, with `effective_from`/`effective_to` and a no-overlap constraint — structurally a price history, covering every sale bucket in the seed.** §2.9's reason is the one that holds: it is the INTENDED price, and it disagrees with what the till charged in **1 050 of 2 139 buckets**. The real history is in the ledger — `purchase_line` and `sale_line` unit prices, dated | ~~Needs a view, and it is the largest piece~~ ⚠️⚠️ **IT NEEDED NO VIEW.** True when written on 2026-09-13; `0031` created `product_purchases_daily` on 2026-09-14 and the claim died with it. **Four appended columns on each of two existing views** |

⚠️ **The export (`A1`'s download) is a fourth, and it is not a chart**: all transactions and
waste for a month, flat. Three tables with three different shapes, and the client should not
be unioning them itself under three different RLS fences.

#### ⚠️⚠️ `4.6c` IS RE-SCOPED AND SPLIT THREE WAYS, BEFORE A LINE OF IT IS WRITTEN

The old `4.6c` was an `M` for one view. What the ruling asks for is **`N2` + `N3` + the
export**, which is an `L` by the same measure that sized `4.6a`. **The seam is the same one
that worked there: one migration each, so each merges on its own green run.**

| Piece | Migration | What, and why it is first |
|---|---|---|
| **`4.6c-i`** | `0031` | ✅✅ **DONE 2026-09-14.** **Purchases as a read** (`N2`), per variant and family per day, beside the revenue that already exists — plus **`B8`'s honesty comment on `0009`**. ⚠️ **`B8` earned its keep on a case the seed actually holds**: one bucket reports **100 % margin with `cost_attributed` TRUE**, because the movements exist and merely cost nothing — **the one case 0009's own honesty column cannot see**. ~~Blocked on `N1`~~ — ruled, and gross landed on `product_velocity_daily` rather than in a new view |
| **`4.6c-ii`** | `0032` | ✅✅ **DONE 2026-09-14.** **Price over time** (`N3`), purchase and sale unit prices per variant, from the **ledger** rather than from `price_list`. ⚠️ **Daily grain, and the % windows are the CLIENT's** — `B5`'s argument, and `A2` is precisely the answer that changes after a pilot: *"1, 3, 6, 9 months and YTD"* baked into SQL is a migration every time he wants a different card. ⚠️⚠️ **It shipped NO VIEW**: `0031` created `product_purchases_daily` the day before, and between it and `product_velocity_daily` every column a price needs except the price was already at the right grain — so the price landed on both by `create or replace`, and §2.7's manager/staff split fell out without a predicate |
| **`4.6c-iii`** | `0033` | ✅✅ **DONE 2026-09-14, AND IT CLOSES STEP 4.6.** **The month export** — transactions and waste, flat, one shape, one fence. ⚠️ **The fence is in the view's BODY**, because the three kinds sit behind three different RLS combinations and inheritance alone hands a cashier the sales and silently drops every delivery and every write-off — measured at 1 040 rows of one kind |

⚠️ **`4.6b` still comes first**: it is an `S`, it is unblocked, and `4.6c-i` is waiting on
`N1` in any case.

#### ⚠️ And re-scoping `4.6c` broke a GUARD'S FALSIFICATION, which is a thing only its own fixtures could report

`4.6a-split-coverage.sh` stayed green through the rewrite — correctly, since `4.6c` still
claims `0031`. But `4.6a-split-coverage-falsify.sh`, the file that proves that guard can
still FAIL, anchors its `Z5` fixture on the literal text of `4.6c`'s row, and that row was
rewritten. **`mutate` could no longer find what it edits and refused.**

⚠️⚠️ **A fixture that cannot be APPLIED is not a fixture that passed** — it is a guard whose
falsification quietly stopped running, while both scripts still exit 0 in CI. That is the
exact failure this repository added the falsify script to prevent, arriving from the one
direction nobody watches: **not an edit to the check, but an edit to the FILE THE CHECK
READS.** ✅ **`Z5`'s anchor is now the shortest thing still true of that row — its name and
its first migration number — and all eleven fixtures behave again.**

#### The Part B recommendations, settled against the ruling

| | Was | Now |
|---|---|---|
| **B1** | A new view, leave `0009` alone | ✅ **Stands** — and `0009` is now *orphaned but applied*, which is what makes `B8` urgent rather than tidy |
| **B2** | Purchases-in against sales-out, per family, per period | ❌ **CANCELLED by `A3`.** There is no margin number |
| **B3** | Do not call it margin | ✅ **Stands, and is now free** — nothing in the new scope is a margin, so nothing can be mistaken for one |
| **B4** | One view answers waste too | ❌ **CANCELLED by `A4`** — waste is its own visual, and `product_waste_daily` already exists for it |
| **B5** | Daily grain, client sums | ✅✅ **Confirmed by `A2` and doubly by `A6`'s % windows** |
| **B6** | Net of IVA on both sides | ⚠️ **Reopened as `N1`** — it was the right answer for a margin, where both sides must match. For revenue alone the question is *"which number does he recognise"*, and that is his |
| **B7** | Manager and above | ⚠️ **Split.** The revenue read is **already staff-visible** and changing that is a decision, not a default (parked). `N2` and `N3` carry cost, so they are manager-and-above like every cost read here |
| **B8** | Comment `0009`'s C8.6 limit | ✅✅ **Stands, SHIPPED in `0031`, and stronger than when it was written** — the seed holds a bucket at 100 % margin with `cost_attributed` TRUE, so the flag 0009 already carries is demonstrably not enough |

### ⚠️⚠️ Área 9 — THE BRIEF. Two of the three Números questions are broken, not one

**Prepared 2026-09-13, at the owner's request.** ⚠️⚠️ **THIS BRIEF HAS TWO HALVES AND THEY
TAKE DIFFERENT KINDS OF ANSWER, WHICH IS THE ONE THING TO READ BEFORE THE REST.**

- **Part A is SHOP TRUTH and carries NO RECOMMENDATIONS, deliberately.** The grill-me rule
  is *ask, do not propose*, and it exists because a proposal here is a guess about a shop
  nobody in this repository stands in. **CI can prove a view is consistent; it can never
  prove it is the number a shopkeeper wanted.** Answer these in your own words.
- **Part B is ENGINEERING and carries a recommendation each**, in register #9's shape —
  the intended answer is *yes* or *no*.

#### ⚠️⚠️ The finding, and it re-scopes `4.6c`: F2 has a twin

`F2` recorded that **question 1** is broken under **C8.6**. Reading the other two views on
2026-09-13 — rather than trusting that record — found that **question 2 is broken the same
way and nobody had written it down.**

| | The question (§2.9) | The view | Under C8.6 (`Pollo entero` in, pieces out) |
|---|---|---|---|
| **1** | *What made me money?* | `product_margin_daily` (`0009`) | ⚠️⚠️ **Broken.** `Pechuga` sells from a **zero-cost shortfall lot** → **100 % margin**; `Pollo entero` is bought and never sold → **its cost never enters COGS at all.** Rolling up by family does not rescue it: the family's COGS is still zero |
| **2** | *What am I throwing away?* | `product_waste_daily` (`0011` / `0012`) | ⚠️⚠️ **BROKEN THE SAME WAY, AND UNRECORDED UNTIL NOW.** Waste cost is `qty × unit_cost_net_per_base` **off the movement**, which for a shortfall lot is **zero** — so throwing away `Pechuga` costs **$0**. And the rate's **denominator** is purchases *of that product*, which for `Pechuga` is also zero, because you buy birds. **The headline number is 0 over 0** |
| **3** | *What stopped selling?* | velocity (`0013` / `0014`) | ✅ **Intact, and for a stated reason.** It is **quantity only** — `0013`'s own header says *"there is no cost column for it to fail open on."* **One of the three survives** |

⚠️⚠️ **SO `4.6c` WAS SCOPED TO FIX ONE OF TWO.** It is sized `M` as *"the family margin
view"*. If question 2 is to be fixed too — and it is broken for the pilot's **main product
line** — then either one view answers both or there are two migrations. **That is a sizing
question the owner's Part A answers decide**, and it is why this brief exists before the
task rather than inside it.

#### Part A — shop truth. No recommendations, on purpose

| # | The question | Why it cannot be answered here |
|---|---|---|
| **A1** | **When you open Números, what are you about to decide?** Reorder more or less? Change a price? Stop carrying something? Or just check nothing is wrong? | The measure follows the decision. A number nobody acts on is a number that should not be built |
| **A2** | **Over what period do you think?** A day, a week, *"since the last delivery"*, a month? | ⚠️ **Purchases-in against sales-out only means anything over a period long enough to absorb the lag** — you buy today and sell over three days. Too short and the number is noise; the length is a fact about your shop |
| **A3** | **For the chicken, is the number you want per FAMILY (`Pollo`) or per PIECE (`Pechuga`)?** | **C8.6 says the app cannot attribute a piece's cost**, so per-piece profit is not merely missing — it is **not derivable from anything the ledger stores.** If you need it per piece, the answer is a different conversation about modelling the despiece, not a view |
| **A4** | **Should what you threw away be inside the profit number, or beside it?** | Both are defensible and they are different numbers. Inside, one figure tells you whether the week worked; beside, you can see *why* it did not |
| **A5** | ⚠️ **What do you check TODAY, without the app?** A notebook, the till, a feeling at closing time? | ADR-035 §4's own risk row says it plainly: *"Owner doesn't open Números unprompted in week two → the three questions are the wrong three. **Ask what they checked instead.**"* This is that question, asked before the pilot rather than after |
| **A6** | **If you could have only three numbers, which three?** | *"Three numbers, not thirty"* is your sentence. §2.9's three were written in August, before the grill-me and before C8.6 — **they are a proposal, not your answer** |

#### Part B — the schema consequences. Recommendation each, yes or no

| # | | Recommendation | Why |
|---|---|---|---|
| **B1** | Fix `0009`, or add a new view beside it? | ✅ **A NEW view; leave `0009` applied and untouched** | Migrations are append-only, and `0009` is **correct for everything that is not a despiece** — a shop selling tins has no shortfall lot. Replacing it would break a working answer to fix a different one |
| **B2** | The basis for the new view | ✅ **Purchases-in against sales-out, per family, per period** — the owner's own 8.4 description | It is **the only basis that survives C8.6**, because it never needs per-piece cost attribution: the bird's cost enters as a purchase and the pieces' revenue leaves as sales, whatever the despiece did in between |
| **B3** | ⚠️⚠️ What it is CALLED | ✅ **Do not call it margin.** Name it a **period contribution** — `family_contribution_period` or similar | **It is not a margin and the difference will bite.** Margin matches a sale to *that sale's* cost; this matches a period's purchases to a period's sales, so stock movement between periods moves the number. Calling both "margin" invites someone to compare them, find they disagree, and conclude the **ledger** is wrong |
| **B4** | Does the same view answer question 2? | ✅ **Yes — one view, both questions**, *if* `A4` says waste belongs inside | Purchases-in **already contains** the cost of everything wasted, so waste is the gap between what you bought and what you sold. ⚠️ **Blocked on `A4`**, and it is the answer that decides whether `4.6c` stays an `M` |
| **B5** | The period grain in SQL | ✅ **Expose a DAILY grain and let the client sum** | `0009` and `0011` are already daily, so it matches. ⚠️ **Baking "week" into a view means a migration to change your mind**, and `A2` is exactly the kind of answer that changes after a pilot |
| **B6** | Tax | ✅ **Net of IVA on both sides** | §2.9 says *"net of tax"*, and purchases and sales must be on the same basis or the number is meaningless rather than merely wrong |
| **B7** | Who may read it | ✅ **Manager and above**, matching §2.11's Números row and the existing cost fences | ⚠️ **A cost view that fails open is a cashier reading the shop's margins** — `0013`'s header already records that trap, and this view is nothing but cost and revenue |
| **B8** | `0009`'s own honesty | ✅ **Add a comment to `0009` naming its C8.6 limit** — a `comment on view`, in the same migration | Today it returns **100 % margin** on a despiece line and says nothing about why. ⚠️ **A number that is confidently wrong is worse than a missing one**, and the next person to read it will not have this brief |

⚠️ **`B1`, `B2`, `B3`, `B5`, `B6`, `B7` and `B8` stand regardless of Part A.** **`B4` waits on
`A4`**, and **`A3` can invalidate `B2` entirely** — if the answer is *per piece*, no view
solves it and the conversation becomes whether to model the despiece at all, which is a
much larger decision than `4.6c`.
⚠️⚠️ **All of it freezes when `0029` merges.**

### ✅✅ 4.6c-i — DONE 2026-09-14. The gate it was blocked on had nothing behind it

⚠️⚠️ **THE ARGUMENT, THE DECISIONS TAKEN ON THE OWNER'S BEHALF AND THE FINDINGS ARE IN THE
STATUS LOG AT THE TOP OF THIS FILE AND ARE NOT RESTATED HERE.** Two long copies of one
account is how the ninth stale-copy defect happened. This section carries only what the
status entry does not: the shape of what shipped, and what was measured against it.

**What `0031` contains — four objects, no table, no policy, no function, no new column:**

| Object | What |
|---|---|
| `product_purchases_daily` | **NEW view**, `security_invoker`. `workspace_id, location_id, variant_id, day`, the catalog names and `family_id`/`family_name`, then `purchases_qty_base`, `purchases_net`, `tax_paid`, `purchases_gross`, `purchase_line_count`. Manager-and-above **by inheritance** — both base tables are manager-gated, so it fails CLOSED and states no `has_role` of its own, which `0011` can do and `0009` cannot |
| `product_velocity_daily` | **Replaced.** 0014's body verbatim plus four hunks: `sum(sl.tax_amount)` in `sold`, its coalesce in `daily`, three APPENDED columns (`create or replace view` cannot reorder), one appended window sum. ✅✅ **That this is where gross revenue lives was RULED by the owner on 2026-09-14** — *"leave gross revenue on the velocity view"* — confirming both the call the session made and ADR-035 §2.9's table, which had already said so |
| `product_margin_daily` | **`comment on view` only.** `B1` stands and the body is untouched |
| `replay_failed_write` | **`comment on function` only.** `0030`'s file is not edited — a function comment is applied schema |

**What was measured, not argued:**

- **The reconciliations.** Purchases agree with `purchase_line` on qty, net, tax and line
  count to the centavo; gross revenue agrees with `sum(line_net + tax_amount)` over
  `sale_line` at **$147 581.88**; `revenue_net` is **unchanged at $138 673.24** over the
  same **30 472 rows**, so the replace moved neither a peso nor a row of what 0013/0014
  already returned
- ⚠️ **The anti-vacuity one, which the others would have passed without.** A `revenue_gross`
  that was a copy of `revenue_net` reconciles perfectly in a shop that sells only IVA-exempt
  goods. **964 selling buckets differ and 1 175 legitimately do not** — the second number is
  the Mexican basic-groceries basket, and it is asserted so that a check which only ever saw
  zero-rated goods cannot pass while measuring nothing
- ⚠️ **The new view agrees ROW FOR ROW with the copy of itself inside `product_waste_daily`**,
  both directions, which is an assertion that exists only because the column names were kept
  identical instead of improved
- ⚠️ **Voided deliveries do not cancel inside a day.** `0009`'s *"a reversal cancels itself in
  the sum"* is a claim about a RANGE. A sale is voided within 15 minutes; the seed's three
  purchase reversals are **2, 2 and 9 days** after the documents they cancel, so **23 buckets
  are negative** and a daily chart shows bars below zero. In the view's own comment, and
  pinned
- **The fence, under `set role authenticated`, three callers.** Cashier: **0** purchase rows
  — zero rows, not rows summing to zero — while reading **$70 376.39 gross** at her own store.
  Manager: **863** rows across both stores, **$562 630.18**. The other workspace's owner:
  **185** rows and **none** of Doña Lupe's. 863 + 185 = 1 048

**Twelve falsifications against a green control** (`F0`/`F10b`), each mutating the SHIPPED
object and confirming the check that names the claim goes red:

| | The mutation | Result |
|---|---|---|
| **F1** | `purchases_gross` drops the tax | 🔴 the row-arithmetic and manager-total checks |
| **F2** | `tax_paid` is always zero | 🔴 the ledger reconciliation and the IVA-exempt split |
| **F3** | ⚠️ `revenue_gross` is a copy of `revenue_net` | 🔴 — **the anti-vacuity check is the one that catches it**, and it is the only one that would |
| **F4** | the purchases view states a `has_role` of its own | 🔴 |
| **F5** | the day boundary is hardcoded again | 🔴 in `0031` … |
| **F5b** | … **and in `0011`'s timezone guard**, which now sees a fourth view | 🔴 |
| **F6** | voided deliveries excluded instead of summed | 🔴 the reconciliation and the waste-view agreement |
| **F7** | the trailing window attached to net and labelled gross | 🔴 the independent recomputation |
| **F8** | `0009` keeps its pre-`0031` comment | 🔴 |
| **F9** | `0030`'s stale clause left standing | 🔴 |
| **F10** | ⚠️⚠️ **a FIFTH analytics view lands and nobody adds it to `0011`'s list** | 🔴 — the assertion that comment claimed to make since 2.3 and did not |
| **F10b** | the fifth view dropped again | 🟢 — it must not be permanently red |
| **F11** | the view granted to `anon` as well | 🔴 |

⚠️ **Two fixtures were green for the wrong reason first, and are reported from the corrected
run.** `F8` and `F9`'s first attempt ran under `zsh`, which does not word-split an unquoted
command held in a variable, so the mutation never reached the database and both came back
green. **A fixture that did not run is not a fixture that passed** — the same lesson the
`4.6a` split recorded about a mutation helper that emptied the files it meant to edit.

---

### ✅✅ 4.6b — DONE 2026-09-14. One notch, `0026` predicted it, and the half it did not do is now a decision

~~`replay_failed_write` is fenced at **owner** (`0026:317`)~~ — **it is fenced at
`manager` as of `0030`.** `0026`'s header already named the exit: *"Loosening this to
`manager` is a `create or replace` in a new migration."* C11.4 asked for exactly that, and
**C11.2 is what made one notch enough** — the family member is a manager, not staff, so
§2.6's argument for the fence (the replayer has reviewed the dead-letter and can carry cost
for any kind) survives intact rather than being overridden. ⚠️ **The recorders' own
`manager` fence is untouched**, and so is `0025`'s replay marker: the two fences are now
EQUAL, which is the shape `0025` decision 3 wrote before `0026` chose to be tighter.

**What shipped:** `supabase/migrations/0030_replay_manager_fence.sql`, one
`create or replace` whose body is `0026`'s copied verbatim — the diff is two hunks, the
`create` keyword and the fence. 18 behavioural checks in
`supabase/tests/0030_replay_manager_fence.sql`; `0026`'s suite re-signed from 86 to 88.

⚠️⚠️ **AND THE THING IT DID NOT DO IS THE THING WORTH READING: A MANAGER MAY NOW REPLAY A
DEAD LETTER SHE CANNOT SEE.** `failed_write_select` is still `owner`-only (`0024`
decision 8). ~~It is parked as an owner decision against `5c`.~~ ✅✅ **RULED THE SAME DAY,
AND THE ANSWER WAS NEITHER OPTION: the device remembers its own failure** — `failed_write.id`
IS the client uuid, so `5c`'s banner needs no server read and **the blindness blocks
nothing.** The full ruling, and why both parked options lost, is in *"THE DEVICE REMEMBERS
ITS OWN FAILURE"* at the top of this file.

⚠️ **SO THE THREE CHECKS HOLDING IT CHANGED MEANING WITHOUT CHANGING A LINE OF SQL.** `0030`
2.1 and 3.3 and `0026` 2.2b were written as *"expected to go red one day"*, a placeholder
waiting on a decision; **they now hold the decision**, and their labels name it. ⚠️⚠️ **A
later session widening `failed_write_select` is undoing the owner's ruling of 2026-09-14,
not hardening a fence** — and nothing but these checks can say so, because the ruling is that
a policy STAYS as it is, and a change that is not made has no constraint, grant or policy to
live in. **Same shape as `0028`'s `6.9`/`6.10` for the redemption ruling.**

#### The ten falsifications, run by hand before this was committed

⚠️ **Each fixture is checked for having APPLIED, and each red is checked for naming the
right assertion.** `4.6c`'s re-scope recorded why: *"a fixture that cannot be applied is not
a fixture that passed"*, and `0027`'s session recorded the other half — *"a fixture that is
red for the wrong reason is not a falsification, it is a coincidence"*. **Two of these were
red for the wrong reason on the first attempt and were re-cut**, which is the only reason
the table below is worth anything.

| Fixture | The edit | `0030` | `0026` |
|---|---|---|---|
| **F0** | ✅ Control | 🟢 | 🟢 |
| **F1** | `0030` undone — the fence back at `owner` | 🔴 1.3, 3.2, 3.4, 3.5 | 🔴 2.2, 2.3, 2.8 |
| **F2** | ⚠️ **An OVERLOAD instead of a replacement**, carrying the old owner fence | 🔴 1.1, 1.2, 1.3 | 🔴 (dies in setup — the overload makes its own call ambiguous) |
| **F3** | `security definer` → `security invoker` | 🔴 1.4, and all of §3 | 🔴 (dies in setup — its fixture needs the definer) |
| **F4** | The ACL reset to Postgres's default `EXECUTE` to `PUBLIC` | 🔴 1.5 | 🔴 1.2 |
| **F5** | The comment left saying *"OWNER only"* | 🔴 1.6 | 🟢 — correctly; `0026` makes no claim about the comment |
| **F6** | ⚠️ The blindness sentence stripped from the comment, everything else correct | 🔴 1.7 | 🟢 |
| **F7** | ⚠️⚠️ **`failed_write_select` loosened to `manager`** — the change this task refused to make | 🔴 2.1, 3.3 | 🔴 2.2b, 14.1 |
| **F8** | A role fence grown on `record_failed_write` | 🔴 2.2 | 🟢 |
| **F9** | ⚠️⚠️ **The fence moved BELOW the already-replayed branch** — a cashier gets `already_replayed: true` on any recovered row | 🟢 — **stated, not hidden**: the behavioural ladder lives in `0026` | 🔴 2.3b |
| **F10** | The fence loosened one notch too far, to `staff` | 🔴 1.3, 3.1 | 🔴 2.1, 2.3b |

⚠️ **F2 AND F8 WERE RE-CUT AFTER THEIR FIRST SPELLING PROVED NOTHING.** F8's first version
fenced `record_failed_write` at `manager`, which killed the suite's own fixture — the
cashier could no longer report a dead letter — so it went red **in setup**, which
`4c-ii` already recorded as the failure that reports zero failing tests. Re-cut at `staff`,
the fixture builds and 2.2 fires on the catalog read, which is the claim. F2's first version
gave the overload a DEFAULT, which made the one-argument call ambiguous and aborted the file
before 1.1 — **and fixing that is what found the `_src` defect described in the status log.**

⚠️ **F9 IS RECORDED AS A GAP RATHER THAN CLOSED BY DUPLICATION.** `0030`'s suite stays green
on it by design: the behavioural ladder is `0026`'s and copying it here would make two suites
over one claim, which is the drift this repository keeps recording. **The division is stated
in `0030`'s header** so a later reader does not mistake the green for coverage.

### ✅✅ 4.6c — THE INTERVIEW HAPPENED 2026-09-14, AND IT CANCELLED THIS TASK'S SUBJECT

~~F2 under step 5: `product_margin_daily` (`0009`) is COGS-from-the-lot-consumed, so
under C8.6 the pieces sell against a zero-cost shortfall lot at **100 % margin** while
the whole bird's cost never enters COGS at all. What the owner described is
**purchases-in against sales-out, per family, per period**. ⚠️ **Do not write this
until area 9 has been asked**~~ — **asked and answered on 2026-09-14, and the answer was
neither of the two margin questions the brief was written to choose between:** *"we won't
derive the profit so let's ignore margins for now. I'd rather just show total revenue."*

⚠️⚠️ **The gate did exactly what it was for.** A view built against a guess would have been
the family margin view — consistent, tested, green, and **not a number the owner wants to
look at**. The re-scope, the three-way split and the rulings in his own words are in
*"ÁREA 9 IS RULED"* above. ⚠️ **`0009` is now orphaned but applied**, which is why the
comment naming its C8.6 limit moved from *tidy* to *urgent*: nothing will replace it, and it
goes on returning 100 % margin on a despiece to whoever reads it next.

---

## Step 5 — the client (§2.8)

⚠️⚠️ **THIS SECTION OPENED WITH *"THE DATABASE IS COMPLETE AS OF 2026-09-05, AND
STEPS 5–7 SHIP NO MIGRATION AT ALL."* BOTH HALVES WERE FALSE AND THE GRILL-ME IS WHAT
PROVED IT** — see **step 4.6**, three owed migrations, one of which blocks `5b`. The
sentence is kept here, struck, because it is the assumption every plan makes at the
end of a database build and the reason this file requires the interview to happen
before the code.

**Step 5 itself still ships no migration** — that is why 4.6 is its own step — and
that remains the thing that makes everything below cheap to get wrong: a screen is a
rewrite, not a fix-forward.

### ✅✅ THE UI/UX GRILL-ME HAPPENED 2026-09-07, IN TWO ROUNDS. EIGHT AREAS ARE ANSWERED; FOUR ARE NOT

The session the owner called for on 2026-09-05 ran on 2026-09-07 under his rules —
**ask, do not propose; every question about a control or a display; assume nothing
about literacy or numeracy.** **Round one** took **areas 3 (the price) and 8 (the
catalog)**, the two named as able to sink the pilot. **Round two**, run the same day
rather than starting `5a`, took **areas 1, 10, 11 and 12** — the four the foundation
rests on. **Four areas remain unasked and are listed with the sizing at the end of
this section.**

The owner also supplied **five screenshots of the Power Apps era's Comprar and
Productos screens** as the starting shape. They are the only place that era is
current: it is being read for its *controls*, not for its architecture, and nothing
in `archive/power-platform/` is otherwise cited.

⚠️ **These are CONSTRAINTS, not suggestions.** Each traces to the question number it
came from, so a later disagreement can be taken back to the answer rather than
re-litigated from scratch.

#### The transaction screens — Comprar and Vender (area 3)

- **C3.1 — one flat list of VARIANTS, and the same list for both screens.** Not
  families, not tiles: a scrolling list where every row is a variant (`Pollo entero`,
  `Pechuga`, `Pechuga sin hueso`), with a search box above it. Comprar and Vender
  show the **same catalog**; there are no buy-only or sell-only subsets. *"Vender and
  Comprar are much simpler to prioritise the user agility at transaction moment."*
  (8.8, 8.11)
- **C3.2 — the row is the whole control.** Each row carries: the variant name, the
  family beneath it, `Precio` **with its unit**, a numeric quantity field, a `−`/`+`
  stepper, and a `...` quick-actions menu. (3.1, screenshots)
- **C3.3 — quantity > 0 IS the basket line.** There is no "add to basket" step and no
  product-detail screen between the list and the line. (3.1, screenshots)
- **C3.4 — a sticky bar shows `Total` and the commit control**; the line total is
  **not** shown on the row. It appears only in the basket sheet and in the sticky
  `Total`. (3.16)
- **C3.5 — the basket sheet** lists only rows with a quantity, each with the same
  qty field and stepper plus a per-line delete, and a `Vaciar` for the lot. (3.1)
- **C3.6 — commit is a SLIDE, not a tap.** The button becomes a slider and the
  gesture commits. (3.1)
- **C3.7 — tapping the quantity field opens a numeric keypad** for direct entry.
  (3.1)

#### The quantity control, and the unit it speaks in

- **C3.8 — ⚠️ THE STEPPER'S STEP IS `price_unit_code`, AND THE FIELD DISPLAYS THE
  PRICE UNIT'S DIMENSION.** Priced *por cuarto*, three taps of `+` read
  **`250`, `500`, `750`** with `gr` beside the field — grams, not "cuartos". Priced
  *por kilo*, the same product is entered as `0.250 kg`. (3.12, 3.14)
  ✅✅ **AND THE ADR NOW AGREES WITH IT — AMENDED 2026-09-24, WHICH IS WHAT `5f`'s
  SIZING WAS FOR.** ADR-035 §2.8 said *"stepper for discrete units, decimal keypad for
  weight and volume… **never the same control for both**"* and §2.11 named `QtyInput`
  as the **switch** between them. **This constraint had contradicted both since the
  área 3 interview and nothing had looked**; the owner ruled *"amend it to say both"*
  and both sections are amended. ⚠️⚠️ **HE WENT FURTHER THAN THE QUESTION AND REVERSED
  THE RECOMMENDATION'S OWN SAFE HALF — EVERY PRODUCT GETS A KEYPAD, COUNTS INCLUDED:**
  *"The step for the stepper and essentially any product qty can be set by keypad. If a
  user wants to sell 15 manojos of cilantro, he shouldn't have to click the stepper 14
  times."* **A keypad is not about precision, it is about MAGNITUDE.** The brief argued
  that a discrete unit needs none because there is no 288th of a `pza` — true, and
  beside the point. ⚠️ **And *switchable and configurable* needs no new affordance for
  the step**: the step IS `price_unit_code`'s factor and a shopkeeper picks that unit in
  `Agregar` and `Editar`, so pricing *por cuarto* sets a 250 g step. **A step set
  INDEPENDENTLY of the price unit is a different thing, is not read into this ruling,
  and `5f-ii`'s row records that rather than building it.**
- **C3.9 — precision is the shop's, not ours.** A dispatcher marking 2 kg when the
  scale says 2.050 is **correct behaviour, not an error to catch**. Nothing rounds,
  warns or reconciles against a scale. (3.8)
- **C3.10 — the price is never shown without its unit**: `$35.00 / kg`,
  `$9.00 / 250 gr`, `$2.00 / pza`. `Precio: $2.00` alone is meaningless once the
  price unit and the sell unit differ, and the Power Apps screen showed exactly that.
  (3.16)

#### Where the number on screen comes from — the question step 4 refused to answer

- **C3.11 — Comprar prefills the LAST PRICE PAID TO THAT PROVIDER.** The provider is
  chosen first, in the header (`Comprando a:`); **changing the provider re-prices
  every row already on screen.** (3.5)
- **C3.12 — no memory renders as a DASH, never as `$0.00`.** (3.9) ✅ This is
  `0008`'s own instruction obeyed — see F5 below — and it overrides the Power Apps
  screenshot, which showed `Precio: $0.00` on never-bought rows.
- **C3.13 — a purchase CANNOT be committed while any row has no price.** A banner
  says so, the slide is blocked, and setting the missing price must be fast from
  where the shopkeeper already is. (3.9)
- **C3.14 — a SALE at `$0.00` IS allowed, and is highlighted rather than blocked.**
  A missing price still blocks; an explicit zero goes through, loudly. *"Impossible
  to concrete a transaction without a price, nevertheless it is possible to complete
  a sale at price 0, we need to highlight it."* (3.10)
- **C3.15 — prices are changed from the `...` quick actions, in two taps, at the
  counter**, on both screens. (3.2)
  ⚠️⚠️ **OUT OF THE PILOT — RULED 2026-09-24.** *"Let's not do those discount controls
  part of the pilot yet, we will need to understand the interactions before creating
  anything like that. Any money 'knock-off' happens in her head and is out of the scope
  of the app for now."* **The constraint is not deleted and is not wrong** — it is what
  the interview said and it is what this affordance will be when it is built. It is
  **deferred**, and `5f-iv` is the row that carries it.
- **C3.16 — ⚠️ A PRICE CHANGE PERSISTS BY DEFAULT.** The change made at the counter
  becomes the shop's price. ~~A setting flips it to reset-after-each-transaction, and
  when it is off **the Home screen carries a discreet banner** saying so, because a
  shopkeeper who changed a price on Monday will otherwise be surprised on Tuesday.~~
  (3.2, 3.6)
  ⚠️⚠️ **THE SETTING IS STRUCK BY THE RULING OF 2026-09-24, AND NOT AS A SIDE EFFECT:
  *reset-after-each-transaction* IS THE SALE-ONLY OVERRIDE, EXPRESSED AS A SWITCH
  RATHER THAN AS A TAP.** The question put to the owner was whether a cashier could
  knock money off one sale without touching the price list; **this setting is that same
  affordance made global**, so *"any money knock-off happens in her head"* answers both.
  ⚠️ **The Home banner goes with it** — it existed only to say *the setting is off*, and
  a banner announcing a setting that does not exist is furniture on the one screen §2.8
  keeps single-purpose. ⚠️ **What SURVIVES untouched is the first sentence**: a price
  change persists, because there is no other kind. `5e-iii-b`'s `Editar` is where one is
  made, and C3.17's fence — manager and above — is unchanged.
- **C3.17 — ⚠️ ANY ROLE MAY CHANGE A PRICE, INCLUDING A CASHIER**, and with C3.16 that
  means **a cashier's counter discount permanently rewrites the shop's price list.**
  The owner was shown that consequence by name and took it: *"We'll perfectionate on
  the role capabilities, for now let's allow anyone to change the price."* (3.11,
  3.15) ~~**This is the cheapest thing in this section to reverse and the likeliest to
  need reversing** — it is client-side only; no schema depends on it.~~
  ⚠️⚠️ **STRUCK 2026-09-23, AND IT WAS NOT A WORDING ERROR — IT WAS FALSE ABOUT THE
  DATABASE AND HAD BEEN FOR FOUR WEEKS.** `0002` applied `price_list_insert`,
  `price_list_update` and `price_list_delete` on 2026-08-26 and **every one of them is
  `has_role(workspace_id, 'manager')`**. So a schema does depend on it, this is
  **not** the cheapest thing here to reverse — reversing it is an append-only
  migration that merges automatically — and a cashier is refused today.
  ⚠️⚠️ **MEASURED, NOT INFERRED (`5e-iii-a`, 2026-09-23):** her INSERT is a `42501`;
  her UPDATE is **not refused at all** — a `using` clause hides the row, so PostgREST
  answers **200 with an empty array** and the tap does nothing, visibly or otherwise.
  ✅✅ **RULED BY THE OWNER 2026-09-23: *"leave the fence as is."*** **The database
  stays manager-and-above, and this constraint no longer claims otherwise.**
  ⚠️ **WHAT THE RULING DOES NOT SETTLE, and it is `5f`'s to raise:** whether Vender
  offers a cashier a price override **for THIS SALE ONLY** — one that never writes
  `price_list`. That is a different affordance from the one this constraint describes,
  it is entangled with **C3.16**'s *a price change persists by default*, and no
  session may assume it either way. **`5f`'s row carries it.**
  ⚠️ **AND §2.11 FENCES THE `atención` COLOUR TO THIS CONSTRAINT ALONE**, so what
  *the fix is one tap away* now means depends on who is holding the phone —
  `5e-iii-b`'s own row is where that lands.

#### The catalog (area 8)

- **C8.1 — ⚠️ AREA 8 IS DE-RISKED: THE OWNER BUILDS THE PILOT'S CATALOG HIMSELF.**
  No import, no spreadsheet, no photo-OCR, no bulk tool in the pilot. *"For the first
  pilot I'll make the catalog myself."* The likeliest week-one death is bought off
  with the owner's own time. (8.5)
  ⚠️⚠️ **AMENDED 2026-09-23 — A SHOP NOW STARTS FROM A PREBUILT CATALOG, WHICH IS
  C8.4 PULLED FORWARD BY THE OWNER.** *"I took the decision to start working with
  prebuilt catalogs."* **C8.1's second sentence still stands for the pilot** — there
  is still no import, no spreadsheet and no bulk tool on any screen, and the
  onboarding that IMPORTS one is explicitly polish for after the app is whole, in his
  own words. What changed is where the first rows come from, not what a shopkeeper
  can do at a counter.
- **C8.2 — but he seeds it DELIBERATELY INCOMPLETE**, *"to encourage him to create
  some on his own"*. So **`Agregar` is pilot-critical after all**, and the create
  flow is not deferrable. (8.6)
  ⚠️ **STILL TRUE AND NOW TRUE FOR A SECOND REASON, 2026-09-23.** The prebuilt
  catalog does not close the create flow: *"the user can still create new Familias and
  Productos."* An incomplete start is the same argument whether the incompleteness is
  the owner's doing or the template's.
- **C8.2b — ⚠️⚠️ NEW 2026-09-23, AND IT IS THE HALF THAT COSTS SOMETHING: A DEFAULT
  PRODUCT CANNOT BE DELETED, AND IS NOT DISABLED EITHER.** The owner's words, in full:
  *"they can delete those disappearing from the Product Catalog but persisting in the
  transactions and other historical parts. But the default products cannot be deleted
  and it doesn't really make sense at this point to disable them or anything else."*
  ✅ **The first half is ALREADY SHIPPED and needed nothing**: `5e-iii-b`'s retirement
  is `is_active` false, `catalogFrom` drops it from Productos and every ledger read
  keeps it — his sentence describes the built behaviour exactly, and neither catalog
  table has a delete policy at all, so the database cannot do the other thing.
  ⚠️⚠️ **The second half is UNENFORCEABLE AND VACUOUS TODAY, measured rather than
  assumed on 2026-09-23**: `product_family` and `product_variant` carry **no origin
  column**, and **no migration inserts a single catalog row anywhere** — so there are
  no default products, every product in every shop is one somebody made, and every one
  of them is correctly deletable. **Drawing the fence now would be a control with no
  rows to apply to.** ⚠️ **It goes in with the seeding and never after it**: a shop
  seeded before the marker exists has rows nothing can ever tell apart. **`6c` owns
  it**, and ADR-035's catalog section carries the rule.
- **C8.3 — the pilot is ~100 products** across four store types — **pollería,
  carnicería, cremería/salchichonería, recaudería** — with overlap between them.
  (8.1)
- **C8.4 — later, catalogs are SHARED to onboard new merchants**, maintained by us.
  Not pilot scope; it is why C8.1 is affordable. (8.5)
  ⚠️⚠️ **PULLED FORWARD 2026-09-23 — *later* NOW HAS A ROW, `6c`.** This constraint
  is the one the owner's ruling promotes, and it had been sitting here as the reason
  another constraint was affordable rather than as work. ⚠️ **What it still does NOT
  become is the onboarding IMPORT** — *"once we wrap up the full app we will polish
  many parts, one of them is the onboarding to import a catalog"* — so a merchant
  loading his own spreadsheet stays where C8.1 put it, and only the maintained
  template moves.

#### The despiece — how a pollería is representable at all

- **C8.5 — one family, many variants, ONE dimension.** `Pollo` is a family; `Pollo
  entero`, `Pechuga`, `Pechuga sin hueso`, `Muslo` are variants of it, and **they all
  share kg/gr**. The jaba is discarded as a unit *"since it can weigh differently"*,
  and the pieza is discarded because the merchant thinks in average weight anyway.
  **Constraining every variant of a family to one dimension is what keeps the
  arithmetic honest.** (8.8)
- **C8.6 — ⚠️ THE APP DOES NOT MODEL THE DESPIECE AND DOES NOT NEED TO.** He touches
  the phone twice: at purchase, and at sale. Twelve jabas of 10 kg is **`120` typed
  into `Pollo entero`** — the arithmetic happens in his head, as it does today in the
  notebook. *"He's anyhow doing the calculations now."* (8.2, 8.9)
- **C8.7 — ⚠️⚠️ STOCK IS NEVER SHOWN ON A TRANSACTION SCREEN.** Not at purchase, not
  at sale. *"He's only concerned on the operations."* Stock is indicative and exists
  for analytics; a number is earned in Números later, never asserted at the counter.
  (8.3)
- **C8.8 — ⚠️⚠️ ENFORCEMENT MUST STAY OFF, AND THIS IS NOW A HARD PILOT
  CONSTRAINT.** C8.6 guarantees permanent drift in both directions — `Pollo entero`
  accumulates forever, `Pechuga` goes negative forever. `workspace_setting
  .enforce_stock_default` is `false` in `0001` and `product_variant.enforce_stock` is
  null everywhere, so **nothing needs changing — but turning either on breaks the
  pollería at the counter, in front of a customer.** No pilot screen may expose that
  switch.

#### Creating a product, which the merchant will actually do

- **C8.9 — the shortest form that produces a usable product: a NAME, a FAMILY, ONE
  UNIT, ONE PRICE.** Nothing else. Everything else lives behind `Editar`. (8.12)
- **C8.10 — ⚠️ THE CLIENT WRITES THAT ONE UNIT INTO ALL FOUR UNIT COLUMNS.**
  `product_variant` demands `base_unit_code`, `purchase_unit_code`, `sell_unit_code`
  and `price_unit_code` all `not null` with no defaults (F7). **A shopkeeper is never
  asked four unit questions.** (8.12)
- **C8.11 — the family is SUGGESTED from the typed name, and overridable by a
  gesture.** He types `Queso Oaxaca`; the app proposes a family from what already
  exists; he can override and create his own family in place. Creating a variant is
  **always** through a family. (8.13)
- **C8.12 — three entry points, and the family behaves differently in one of them.**
  From `Productos` or from a Comprar/Vender `...` quick action → type the name, get a
  family suggestion. From **inside an opened family** → the new variant belongs to
  that family, no question asked. (8.13)

#### Productos, and the photos

- **C8.13 — `Productos` is family-first and photo-first**: a grid of family tiles;
  tapping one opens the **family with its variants at sight**, each variant showing
  its price, plus `Agregar Variante` / `Costos` / `Editar`. This is the one screen
  where the family/variant structure is visible — the transaction screens flatten it
  (C3.1). (8.11, screenshots)
  - ⚠️⚠️ **CHANGED BY THE OWNER 2026-09-15, IN ÁREA 13 — `Productos` IS VARIANT-FIRST.**
    *"The list of products displayed in Productos should be all the product variants;
    once one taps a product, the full product family opens with the tapped variant
    preselected."* **The grid of family tiles is gone**; the flat list of variants
    replaces it. ✅ **The second half of the constraint SURVIVES UNCHANGED** — the
    family with its variants at sight, each with its price, plus the three actions —
    it is simply reached by tapping a variant rather than a tile. ⚠️ **And the app is
    now flat everywhere**: C3.1 already flattened the transaction screens, so the
    family structure appears in exactly one surface, on purpose. **Annotated rather
    than rewritten, because the bullet above is the record of what was asked for in
    the interview and this is the record of what he settled on.**
- **C8.14 — ⚠️ PHOTOS ARE AN ADMIN CHORE, NOT A USER TASK, AND NOT PILOT-BLOCKING.**
  A merchant-created product shows **initials** and is transactable immediately. We
  assign the picture afterwards as maintenance. The merchant is **not** shown a
  "pending photo" state — an un-pictured product must not look unfinished. (8.7,
  8.10)
- **C8.15 — ⚠️⚠️ OWED, AND IT IS NOT A SCREEN: there is no image column, no storage
  bucket** (the local stack excludes `storage-api` outright) **and no channel that
  tells us a merchant created a product.** C8.14 is an operational loop with no
  infrastructure behind it. It blocks nothing in the pilot because initials ship
  first, and it is written up here so it is not discovered later as a surprise.

#### Reading the screen at all

- **C3.18 — ⚠️ TWO DENSITY MODES, and the owner chose both rather than a compromise.**
  *"Many users are old; we want to prioritise the visibility of essential things big
  and at a glance."* A normal mode and an elder mode with taller rows, *"compromising
  a bit more on the aesthetics"* — fewer rows on screen, leaning harder on search.
  (3.18) ⚠️ This is a **theming/scale decision taken before the first screen is
  written**, which is the cheap moment; retrofitting a second density onto finished
  screens is not.

### ⚠️ ONE DECISION WAS MADE ON THE OWNER'S BEHALF IN THIS SESSION

**3.17 — what the "highlight" for a missing or zero price actually is.** The owner
offered the choice (*"let's consider them and make your choice"*). Taken:

- A row with **no price** turns **amber in place**, and the sticky `Total` carries a
  **count badge** of how many rows are unpriced. **The slide is blocked** while the
  count is above zero. **No modal at commit.**
- A row priced **`$0.00`** turns amber the same way but **does not block**; the slide
  goes through.

**Why:** the row is where the fix is made, so the warning belongs on the row. A modal
fired at commit tells a hurrying shopkeeper that *something* is wrong and then makes
him hunt for which line it meant. The badge exists so the amber is discoverable when
the offending row has scrolled off. ⚠️ **Client-side only; reversing it costs one
screen.**

### ✅✅ ROUND TWO, 2026-09-07 — AREAS 1, 10, 11 AND 12, AND IT REOPENED THE SCHEMA

Run the same day, on the model's recommendation and the owner's instruction, **before
`5a` was written.** The argument for asking rather than building was that `5a` is the
task **most** exposed to the unasked areas, not the least — auth rests on areas 1 and
11, the offline client stub rests entirely on area 10, and the density scale rests on
area 12. ⚠️ **The round-one sizing said `5a` "rests on nothing that was asked and
nothing that was not." That was wrong and backwards**, and the correction is why this
round happened first.

⚠️⚠️ **IT WAS THE RIGHT CALL AND THE PROOF IS THAT IT PRODUCED THREE OWED MIGRATIONS,
ONE OF WHICH BLOCKS HALF OF `5a`.** They are step 4.6, above. Building `5a` first
would have built a sign-in screen on top of a membership flow that does not exist.

#### The counter and the devices (area 1)

- **C1.1 — TWO pilot shops, TWO phones each, and BOTH platforms.** iPhone 11 and
  iPhone 15; Oppo and Samsung on Android. ⚠️ **These are the users' OWN devices** and
  they install the app themselves — *"not me to take their devices anywhere."* The
  round-one assumption of an Android-only pilot is dead. (1.1)
- **C1.2 — build for anything released after 2020.** (12.1)
- **C1.3 — the app opens on the LAST SCREEN THEY WERE ON.** Not a dashboard, not a
  menu. (1.2)
- **C1.4 — sign-in is OAUTH: Google, Facebook, or email. NO phone-number auth.** The
  session persists indefinitely; **only an explicit log-out requires logging back
  in.** Nobody logs out at 9 p.m.; the phone is simply put down. (1.2)
- **C1.5 — the two pilot shops are TWO WORKSPACES, two different owners** — not one
  owner with two locations. ⚠️ **So `5a` needs no location picker**: the shop is the
  one thing the phone knows. The multi-location back end stays unused and unforeclosed,
  which is exactly what ADR-035 §2.3 built it for. (1.3)
- **C1.6 — DISTRIBUTION IS DEFERRED AND DEVELOPMENT IS LOCAL.** The paid tier is
  bought *"only when the complete pilot is in place"*; until then it is built and run
  on the owner's own iPhone from his own Mac. ⚠️ **This is a schedule dependency, not
  a screen**: Apple Developer Program is **$99/yr** and is unavoidable for the two
  iPhones, Google Play Console is **$25 one-time**, EAS Build has a usable free tier,
  and local builds are free. **~$124 the first year.** Expo Go was considered and
  rejected — four non-technical users on their own devices would generate more than
  $124 of the owner's time in support calls, and *"I can't find the app"* is a
  week-one pilot death. (1.4)

#### Roles, and the membership flow that does not exist (area 11)

- **C11.1 — each shop is TWO PEOPLE: the owner and a family member or friend**, and
  **either can be alone in the shop** while the other runs errands. **The lone
  employee is the design case, not the exception.** (11.1)
- **C11.2 — the employee is a MANAGER**, and the owner explicitly wants the role
  system kept for businesses with a real hierarchy later. (11.4)
- **C11.3 — the employee CAN record deliveries**, and the app adds no fence of its
  own. The database already permits it — every recorder is fenced by the **location
  wall alone**, with no role check at all — so this is a decision **not** to write a
  client-side fence that the schema never asked for. ⚠️ **This does NOT contradict
  [[who-accepts-deliveries]]**, which says receiving is manager-or-owner and Comprar
  needs no staff path: **C11.2 makes the employee a manager**, so both hold at once.
  What it does mean is that **the fence lives in the role assignment, not in the
  screen** — give someone `staff` in a later shop and Comprar is still open to them,
  because nothing in the database or the client will stop it. (11.2)
- **C11.4 — ⚠️⚠️ THE PERSON STANDING THERE MUST BE ABLE TO FIX A FAILED WRITE**, and
  `replay_failed_write` is fenced at **owner** (`0026:317`). **This is migration
  4.6b.** It loosens one notch to `manager`, which is the fence `0026`'s own header
  named as the cheap direction, and C11.2 is what makes one notch enough. (11.3)
- **C11.5 — ⚠️⚠️ TWO MEMBERSHIP PATHS, AND NEITHER EXISTS.** *"Every person goes
  through the auth process to begin with. If our owner sends an invite that counts as
  a pre-approval for the request, but the user should also be able to request access
  to a workspace on his own."* So: **an invite is a pre-approved request**, and a
  self-request waits for approval by **the owner or by us as admins**. **This is
  migration 4.6a.** (11.4)
- **C11.6 — the workspace has a CODE, and workspaces are NEVER LISTED.** The owner
  shares a code; the joiner types it. ⚠️ `workspace` has no such column (`0001:110`)
  and the `id` cannot serve — no shopkeeper reads a uuid over WhatsApp. **Part of
  4.6a.** (11.7)
- **C11.7 — a SHARE button that hands the code to WhatsApp**, living in
  **Configuración → members**, alongside a member-management list. *"Not a
  protagonist at all in our UI."* (11.8)
- **C11.8 — a NOTIFICATIONS ICON ON HOME with a badge**, and membership requests
  surface there. ✅✅ **The owner sees the requester's EMAIL AS THE HEADER, their NAME
  BENEATH IT, and the role asked for** — enough not to approve the wrong Juan. (11.6)
  ⚠️⚠️ **SUPERSEDED 2026-09-19, AND THIS BULLET WAS THE SIXTH STALE COPY OF THE OLD
  RULING — found on 2026-09-19 while sizing `5b-iii-d`, the row that renders it.** The
  build rows, the handbook, the status log and `5b-split-coverage.sh`'s own comment had
  all been updated; **this one had not**, and it is the copy a session reads when it goes
  looking for what the constraint actually SAYS. ~~The owner sees the requester's
  **name**, **email and the role asked for**.~~ ~~THE NAME IS STRUCK BY THE OWNER'S
  RULING OF 2026-09-14, NOT BY AN OVERSIGHT: `5b`'s sizing measured that no table in this
  schema carries a human name — `workspace_member` holds `user_id`, `role` and
  `is_active`; §2.7 never exposes `auth.users` — so one of the three was never buildable
  without a migration. He ruled email only, and against the migration that would have
  added a name.~~ ⚠️⚠️ **BOTH HALVES OF THAT ARE NOW FALSE, AND BY BUILT CODE RATHER
  THAN BY A CHANGE OF MIND ALONE.** `T1`'s premise died on 2026-09-18 — `5b.7` stores the
  name a person types at sign-up and `0034` copies it onto `workspace_member` — and the
  migration he ruled against **has shipped**: `0037` returns the requester's name through
  `public.auth_full_name`, which is reachable only from a definer body. ⚠️ **The ORDER is
  the ruling**, his words being *"Show the Email as a Header and the Name as a subtitle of
  the request"* — the INVERSE of the roster, where the name is the title, because on an
  approval you are matching a stranger against an address somebody read out to you.
  ⚠️ **The name can be ABSENT** — the metadata is nullable — and then the row is the
  address with nothing under it, handled silently. **It is still carried as two
  deliverables in `5b-split-coverage.sh` because nothing else can hold a decision about
  what a screen renders**, and §2.11 bans the suite that would otherwise notice. See `T1`
  and `T2` in `5b`'s sizing for the dead premise, and `5b-iii-d`'s sizing for the split
  that found this bullet.
- **C11.9 — the dead-letter control is the LEAST INVASIVE THING THAT WORKS**, and it
  is *"not a priority for the owner at this point."* A banner, not a screen. (11.5)

#### Offline (area 10)

- **C10.1 — the app admits it QUIETLY.** A small icon, intermittent, somewhere
  non-invasive, with *"Sin conexión a internet"* — surfacing on screen changes and
  **easily dismissed**. It never blocks and never interrupts. (10.1)
- **C10.2 — ON RECONNECT, ONE FADING TOAST: *"Tus últimas operaciones ya se
  guardaron."*** It fades on its own, needs no acknowledgement, and **does not say how
  many.** (10.1, 10.5)
- **C10.3 — ⚠️ THE SLIDE LOOKS IDENTICAL OFFLINE.** Same confirmation as online, no
  "pending" state, no second wording. *The vendor cannot reach the pile*, applied
  exactly. The sale is safe; saying so would be the app talking about itself. (10.2)
- **C10.4 — the 72-hour clamp is ACCEPTED AND NOT DESIGNED FOR.** A write recorded
  offline has `occurred_at` clamped to `[now() − 72h, now()]`, so a queue older than
  three days is silently re-dated. The owner does not expect either shop to go 72
  hours without signal and has deferred the edge. ⚠️ **Recorded because
  [[pilot-store-is-offline-a-lot]] says the opposite is worth watching for**, and this
  is the one accepted risk in the offline design. (10.3)
- **C10.5 — ⚠️⚠️ A REJECTED QUEUED WRITE IS NEVER SHOWN TO THE SHOPKEEPER.**
  `0024` downgrades a rejected `sale` or `waste` to a stock adjustment — the goods
  still leave the shelf, but the sale is not a sale. *"It must stay in our side for
  analytics."* This is [[users-dont-do-bookkeeping]] taken to its conclusion, and it
  means **the ledger can differ from what the shopkeeper typed, silently, by design.**
  (10.4)

#### Reading it (area 12)

- **C12.1 — ICONS PLUS THE SPANISH WORD**, always, everywhere. Never icons alone.
  (12.2)
  - ⚠️ **RESOLVED 2026-09-15, IN ÁREA 13 — THE TAB BAR IS CAPPED AT FOUR.** Drawing
    `Productos` as a fifth tab showed the tension in the hand: five icon-plus-word
    tabs across 390 px gives each 78 px, and one of the words is *Desperdicio*.
    ✅ **`Productos` and `Proveedores` are entered from Inicio instead**, so the
    constraint is kept rather than quietly bent. ⚠️ **`app/src/navigation/lastScreen.ts`
    anticipated that fifth tab in a comment** — *"a fifth tab added in `5d`"* — and
    that expectation is now wrong; the comment was corrected in the same commit.
- **C12.2 — `$1,234.50`** — comma thousands, point decimals. **Centavos are hidden
  when zero**; when there are decimals at all, **exactly two** are shown. (12.3)
- **C12.3 — ⚠️ THE 50-CENTAVO CEILING IS A DISPLAY RULE ON ONE NUMBER, AND THAT IS
  THE WHOLE OF IT.** The basket total on **Vender** is rounded **up to the next
  multiple of 50 centavos** (`10.20 → 10.50`, `88.72 → 89.00`). **Unit prices and
  individual line totals are shown exactly, to two decimals**, and **Comprar is not
  rounded at all** — *"here the user can look at the things as the ledger will record
  them."* (12.3, 12.4, 12.5, 12.6)
  - ✅ **This is why it costs nothing.** ADR-035's decision register #3 — *"Integer
    centavos; gross authoritative; per line; tax as residual; document = sum of
    rounded lines; half-up"* — is implemented **twice**, in `packages/money/src/
    money.ts` and in SQL, cross-proved by `packages/money/cases.json`, which `db.yml`
    names as a workflow input precisely so a change to it re-runs the pgTAP half. A
    **ledger** rule would have changed rules 3–6, both implementations and the case
    table. **A display rule changes one label. Decision #3 stands untouched.**
  - ⚠️ **The accepted consequence, recorded so nobody "fixes" it later: the drawer and
    the ledger will permanently disagree by up to 49 centavos per sale.** He collects
    `$23.00`; the ledger records `$22.75`. The owner's ruling: *"due to the size of
    each business, this won't affect the economics."*

#### One screen the ADR had already written and nobody had scheduled

- **C1.7 — the IVA question SHIPS IN ONBOARDING.** `workspace.prices_include_tax`
  (`0001:117`) is commented *"asked once at onboarding (**¿Tus precios ya incluyen
  IVA?**), never surfaced at the counter"* — the ADR wrote the wording. It decides how
  every recorder splits net from tax, so **getting it wrong at onboarding is wrong
  forever**, and it is one question asked of someone who does not do book-keeping.
  (1.5)

### 🔍 FIVE THINGS THE GRILL FOUND IN APPLIED SQL, NOT IN THE INTERVIEW

Read out of migrations during the session, because three of the owner's answers
turned on facts the database had already settled.

- **F1 — ✅ `allocate_fefo` ALLOCATES A SHORTFALL RATHER THAN RAISING (`0005:220`),
  AND THAT IS THE ONLY REASON THE POLLERÍA WORKS.** Selling `Pechuga` that was never
  purchased as `Pechuga` does not fail: it finds the last lot ever received for that
  variant and overdraws it, or, if the variant was never stocked at that location,
  **opens a lot at cost 0** to hold the discrepancy. **C8.6 needs no new operation.**
  Had the allocator raised, the despiece would have been a step-4 shaped hole
  discovered in the pilot's first week.
- **F2 — ⚠️⚠️ `product_margin_daily` (`0009`) DOES NOT COMPUTE THE MARGIN THE OWNER
  DESCRIBED, AND NOTHING YET DOES.** `0009` is COGS-**from-the-lot-consumed**, per
  variant. Under C8.6 that gives: `Pechuga` sells against a zero-cost shortfall lot →
  **100 % margin**; `Pollo entero` is purchased and never sold → **its cost never
  enters COGS at all**. Rolling up by family does not rescue it — the family's COGS
  is still zero. What the owner asked for in 8.4 is **purchases-in against sales-out
  per family over a period**, which is a different query that **does not exist**.
  ⚠️ ~~**This is Números' problem (área 9) and it is OWED.**~~ **NO LONGER OWED — área 9 closed
  2026-09-18, and `A3` retired this view rather than commissioning it.** It is a view, so
  it is a migration — the first thing since 2026-09-05 that would reopen the schema.
  ⚠️⚠️ **AND F2 HAS A TWIN, FOUND 2026-09-13 WHILE WRITING ÁREA 9's BRIEF: QUESTION 2 IS
  BROKEN THE SAME WAY.** `product_waste_daily` (`0011`/`0012`) costs waste from
  `unit_cost_net_per_base` **on the movement** — zero for a shortfall lot — so throwing
  away `Pechuga` costs **$0**, and the rate's denominator is purchases *of that product*,
  which is also zero because you buy birds. **The headline number is 0 over 0.**
  ✅ **Question 3 survives and says why**: velocity is quantity only, and `0013`'s header
  already states *"there is no cost column for it to fail open on."*
  ⚠️⚠️ **So `4.6c` was scoped to fix one of two.** Whether one view answers both is
  `B4` in the brief and it waits on `A4`.
- **F3 — ✅ `price_unit_code` HAD NO CONSUMER ANYWHERE AND THE CLIENT IS ITS FIRST.**
  Declared `not null` at `0002:132`, dimension-checked at `0002:191`, and read by no
  RPC, no view and no other line of the ADR. C3.8 is the column finally doing the job
  its own comment describes (*"how it is quoted (per 100g)"*). ⚠️ The model's first
  instinct was to derive the step from the unit's **dimension** instead — which would
  have invented a second rule beside a column already built for it.
- **F4 — ⚠️ `purchase_unit_code` AND `pack_size` NOW HAVE NO CONSUMER, BY DECISION.**
  They exist for exactly the case C8.6 rejects: *"a case of 24 pieces is `pack_size`
  24 with both units `pza`"*, so that he taps `1 jaba` and the app records 10 kg. The
  owner was shown this and chose the merchant's own arithmetic (8.9), on the ground
  that a jaba's weight varies and a fixed `pack_size` would be a lie. **The columns
  stay; the pilot writes the same unit into all four (C8.10) and never reads these
  two.**
- **F5 — ✅ `provider_price_memory` (`0008`) ALREADY SPECIFIED C3.12, IN PROSE.** Its
  header requires an absent (provider, variant) memory be rendered *"as a distinct
  empty state, not as a zero"*. The Power Apps screen violated it. The owner
  independently chose the dash.
- **F6 — ⚠️ A PROVIDER NAMED `Genérico` MUST BE SEEDED IN EVERY WORKSPACE.**
  `purchase.provider_id` is `not null` (`0003:80`) and `record_purchase` raises
  *"a delivery has a provider"* if it is missing (`0018:200`). The screenshot's
  `Comprando a: Genérico` is therefore **not a blank default — it is a row**, and
  onboarding has to create it or Comprar cannot commit at all.
- **F7 — `product_variant`'s four unit codes are all `not null` with no defaults**,
  which is what forces C8.10.

### ⚠️⚠️ Re-sized after round two, 2026-09-07 — STILL `XL`, NOW EIGHT TASKS, AND THE LETTERS MOVED

⚠️ **This supersedes the sizing written earlier the same day, after areas 3 and 8 and
before areas 1, 10, 11 and 12.** That version had six tasks and claimed `5a` *"rests
on nothing that was asked and nothing that was not."* **It was wrong in the one
direction that mattered** — `5a` is the foundation (auth model, offline architecture,
theme scale), and those are the three things in a client that are cheapest to decide
now and dearest to change later. Round two moved four areas out of "unasked" and
produced step 4.6.

✅ **Re-lettering costs NOTHING here, and that is worth saying once.** Steps 1–4.5 could
not renumber a migration after CI applied it — 4e cost two renumberings and
pre-committed a seam to avoid a third. **No app code exists.** The letters below are
free today and stay free until the first task merges.

| Task | What it is | Size | Gate |
|---|---|---|---|
| **5a** | ⚠️ **SPLIT FOUR WAYS 2026-09-07 — see the sizing below; `5a-i` is what gets taken.** **The shell.** Expo project for **iOS and Android** (C1.1), OAuth sign-in — Google / email, **no phone auth** (C1.4) — ⚠️ **Facebook was promised here and moved to `5i` by decision on 2026-09-11, not dropped** — persistent session with last-screen restore (C1.3), the two density modes as a theme scale (C3.18), `$1,234.50` formatting with centavos hidden at zero (C12.2), icons-plus-words navigation (C12.1). Built and run locally on the owner's own iPhone (C1.6). ⚠️ **Plus `.github/workflows/app.yml` and the workspace entry — see below; they are part of "done", not a later tidy-up.** | `L` | — |
| **5b** | ⚠️⚠️ **SIZED `L` AND SPLIT THREE WAYS 2026-09-14, BEFORE A LINE WAS WRITTEN — THE PARENT ROW, AND IT IS NO LONGER TAKEABLE.** **Onboarding and membership.** Fifteen deliverables, all of which land in a child below: **`onboard_workspace`**; **the IVA question** (**C1.7**); **the no-workspace landing** for a signed-in person who belongs to none; **`src/api/`**, the app's first real data layer; **Ajustes**, its first non-tab surface; the join code and its WhatsApp share (**C11.7**); **member management**; **`create_invite`**; **`redeem_invite`**; **`request_access`** with **`my_access_requests`**; **`approve_request`** and its location picker; and the Home notifications icon and badge (**C11.8**). ✅ **Plus the two halves of the ruling of 2026-09-14 — and on 2026-09-18 THEY STOPPED HAVING THE SAME ANSWER**: a member row ~~identified by EMAIL and never by a name~~, **SUPERSEDED — the member row is now identified by the NAME on the membership** (`0034` stores it, `5b.8-ii` reads it); and an approval row where ~~the approver sees an EMAIL and never a name~~, **SUPERSEDED 2026-09-19 — the approval row shows the **EMAIL as the header** and the **NAME** beneath it** (*"Show the Email as a Header and the Name as a subtitle of the request"*). ⚠️ **It survived the 18th by being MEASURED rather than retired by analogy** — the person asking has no `workspace_member` row until `approve_request` writes one, so nothing carried their name — **and that measurement is what turned it into a question the owner could answer rather than a consequence a session assumed.** ⚠️ **Everything the server half needs EXISTS** — `0027`–`0029`, which is what the gate was waiting for. **Nothing below ships a migration** | `L` — **split, an `M` and two `M/L`s** | ✅ **`4.6a` IS DONE** — `0027`–`0029` applied 2026-09-13/14, and the database build has no open task |
| **5b-i** | ✅✅ **IS DONE AS OF 2026-09-14 — `0033` was the last migration and this task shipped none.** **A shop that exists, and the layer everything else calls through.** `onboard_workspace(display_name, prices_include_tax, location_name)`; the IVA question **C1.7** — *¿Tus precios ya incluyen IVA?*, the ADR wrote the wording, and **getting it wrong at onboarding is wrong for ever**; the **no-workspace landing**, which is a navigation state `guard.ts` does not have today; and **`src/api/`**, the first typed call surface in this app. ⚠️ **A closed loop on its own**: install, sign in, create the shop, land on Home. ⚠️ **It is also the piece that CREATES the pattern `5b.5` describes**, which is why that row now gates on this one. ✅ **Shipped:** `src/api/` in five modules over one impure boundary, TanStack Query as the server-state layer ADR-035 §2.11 names, a third route group `(onboarding)`, and **`docs/checks/5b-i-api-contract.sh`** — a real HTTP round trip against a reset database, because a wrong argument name is a 404 that the typecheck, the suite and the bundler all pass over | `M` | ✅ **Was unblocked, and is closed.** `5b.5` is now takeable, and so is everything below |
| **5b-ii** | ⚠️⚠️ **SIZED `L` AND SPLIT IN TWO 2026-09-18, BEFORE A LINE WAS WRITTEN — THE PARENT ROW, AND IT IS NO LONGER TAKEABLE.** **Ajustes, the code, and the PUSH path.** Eight deliverables, all of which land in a child below: the **Ajustes** sheet — §2.8 fixed it as a sheet and not a tab, and it is the app's first non-tab surface; the **join code** with its WhatsApp share (**C11.7**); **member management**; the **density** switch and its persistence, parked on this sheet by `5a-iii-b` and carried in no list until the sizing (`N2`); **`create_invite`** returning a token shown **once**; the location **a staff invite must name**, which `0028` refuses to do without (`N1`); and **`redeem_invite`**. ✅✅ **RULED 2026-09-14 AND SUPERSEDED 2026-09-18 — the member row is identified by the NAME on the membership, with the caller's own row still labelled *Tú*.** ~~Ruled 2026-09-14: identified by EMAIL, recovered from `workspace_invite`, no name rendered, because no table carries one (`T1`) and no migration is added to make one.~~ ⚠️ **`T1` was the whole premise and it died**: `5b.7` put the name a person types at sign-up into `raw_user_meta_data`, `5b.8-i` (`0034`) copied it onto `workspace_member` from all four writers, and `5b.8-ii` put it on the screen. ⚠️ **The email and the role are NOT dead code** — the column is nullable on purpose, so an account whose metadata was empty still falls through to them. ⚠️⚠️ **And the sizing measured a THIRD case the ruling does not cover (`N3`): the invite table is readable by managers and above only, so a staff caller recovers no identity at all.** ⚠️ **A closed loop across the two children**: an owner invites, a second person redeems, and there are two people in the shop | `L` — **split, two `M`s** | ✅ **Was takeable and is now a parent.** Both things inserted ahead of it are closed — `5b.6` shipped the palette 2026-09-17 and `5b.5` wrote the data-layer conventions 2026-09-18 — and the split is the only thing between here and the sheet. ⚠️ **The data layer is named in `5b-i`'s row and in the parent's, and deliberately not here**: a row spelling a deliverable it does not own is what turned the `5b` guard red while that sentence was being written, which is the seventh instance of *never spell a check's sentinel in the file it reads.* The decision that was open against this row was ruled on the day it was parked |
| **5b-ii-a** | ✅✅ **IS DONE AS OF 2026-09-18 — every one of its five deliverables is built and closed.** **The sheet, and everything on it that only reads.** The **Ajustes** sheet itself — the app's first non-tab surface, and the first screen of any kind to adopt `5b.6`'s palette under `R11`; its entry point from a Home screen that is still scaffolding; **member management**, the roster; the **join code** and its WhatsApp share (**C11.7**); and the **density** switch finally persisted, which `5a-iii-b` deferred to this surface and no list has carried since. ✅✅ **RULED 2026-09-14 AND SUPERSEDED 2026-09-18 — the member row is identified by the NAME on the membership, with the caller's own row still labelled *Tú*.** ~~Ruled 2026-09-14: identified by EMAIL, with no name anywhere.~~ ⚠️ **This row's own code is where it changed**: `5b.8-ii` added the fourth rung to `rosterFrom` and `display_name` to `MEMBER_COLUMNS`, both in the module this task shipped. ✅✅ **RULED BY THE OWNER 2026-09-18 — the roster is MANAGER-AND-ABOVE.** It was taken on his behalf in the sizing that morning and confirmed the same day, so it is a ruling and no longer a call awaiting a look. `workspace_invite` is readable at `manager` (`0002:563`), `workspace_member` by any member (`0001:524`), so a staff caller would get a list of rows it cannot identify; the sheet shows them the shop and their own settings instead. ⚠️ **It ships NO membership write** — that is the seam, and it is what the guard asserts. ⚠️ **Two reads and a client-side join**: no foreign key links the two tables and neither may embed the other (`N4`). ⚠️ **A closed loop**: an owner opens the sheet, sees who is in the shop, shares the code, and sets his own text size. ✅ **Shipped:** the sheet as the app's first `presentation: 'modal'` route and the first consumer of the palette; a second `src/api/` contract module carrying both column lists and the join PostgREST refuses; three hooks; the per-phone storage module for the text-size choice; `src/lib/store.ts`, one device store where there were about to be two; 42 new Vitest assertions; and **`docs/checks/5b-ii-a-roster-contract.sh`**, which asks a real database whether the ruling is still the right ruling. ⚠️ **Inicio's two temporary blocks are deleted**, which `5a-ii` named this task to do. ⚠️ **The file list is deliberately NOT spelled out in this row** — it is machine-read for eight sentinels, and a paragraph naming them a second time is what disarmed fixture `Z3` while this sentence was first being written: the NINTH instance of *never spell a check's sentinel in the file it reads*, caught in seconds by the harness rather than in days by a person | `M` | ✅ **WAS TAKEABLE, AND IS CLOSED.** `5b-i` built the data layer it calls through, `5b.6` built the palette it is the first consumer of, and `5b.5` wrote the pattern it is the first consumer of. Nothing is waiting on the owner |
| **5b-ii-b** | ⚠️⚠️ **SIZED `L` AND SPLIT IN TWO 2026-09-18, BEFORE A LINE WAS WRITTEN — THE PARENT ROW, AND IT IS NO LONGER TAKEABLE.** ~~It was first in line as of 2026-09-18, and `5b.7` closed the same day it was inserted ahead of it.~~ **Both membership writes, and both actors.** Eight deliverables, all of which land in a child below: **`create_invite`** — four arguments, a manager fence in the body, and a token **shown once** and stored only as a hash, so the screen that renders it is the only place it will ever exist; the location **a staff invite must name**, which `0028:291` refuses to do without and which the split of 2026-09-14 had left with the other child (`N1`); the **`location_select`** read that picker needs, which **no line in `app/` performs today** (`P1`); the **`replaced_pending`** answer, which is the app's only chance to say that a code somebody is already holding has just been killed (`P3`); the **date formatter** the token's expiry needs and this app does not have (`P4`); and **`redeem_invite`**, off the landing `5b-i` built, on a second person's phone, where a token is **sixteen characters** of the same alphabet the join code uses and only its length tells the two apart (`P2`). ⚠️ **`D8`'s ARGUMENT, not `D8`** — the approval path's own picker stays where it is, and whether the two are one component is `5h.5`'s question rather than this task's. ✅ **Nothing is asked when a shop has one location** — C1.5 says both pilot shops are exactly that, so the picker appears only above one, and refuses to be empty when it does. ⚠️ **A closed loop across the two children**: an owner invites, a second person redeems, and there are two people in the shop | `L` — **split, two `M`s** | ✅ **WAS FIRST IN LINE AND IS NOW A PARENT, AND ITS FIRST CHILD IS CLOSED (2026-09-18).** ⚠️ **Nothing in `5b.7` or `5b.8` changes this task's shape** — the token flow and the argument names are untouched by a column added elsewhere. `0028` has been applied since 2026-09-13 and ships nothing here. ⚠️⚠️ **The re-size found FOUR things this row did not own** (`P1`–`P4`), one of which had been named in `N1`'s prose six days ago and never became a deliverable — see the sizing in the status log |
| **5b-ii-b-1** | ✅✅ **IS DONE AS OF 2026-09-18 — every one of its six deliverables is built and closed.** **The push, and everything the person doing the inviting touches.** **`create_invite`** — four arguments (`p_workspace_id`, `p_email`, `p_role`, `p_location_ids`), the manager fence `0028` keeps in the BODY rather than in a policy, and a token **shown once** and stored only as a hash, so the screen that renders it is the only place it will ever exist. Plus the location **a staff invite must name** (`N1`) and therefore the picker; the **`location_select`** read behind it (`P1`), a fourth table for this app, whose policy is `id in (select public.my_locations())` — scoped by LOCATION and not by workspace like every other read here — **measured, not assumed: `0001:332` returns every ACTIVE location when `wm.role >= 'manager'`**; the **`replaced_pending`** answer (`P3`), because re-inviting one address deliberately kills the live code somebody is already holding; and the **date formatter** the expiry needs (`P4`), which landed beside `mxn.ts` and touches no `Intl` at all. ⚠️ **It lands on the surface `5b-ii-a` built and invents none of its own.** ✅ **Shipped:** a third `src/api/` contract module; `src/format/date.ts`; two wrappers and two hooks; the form, the picker and the token card on the sheet; **71 new Vitest assertions (297 passing, up from 226)**; and **`docs/checks/5b-ii-b-1-invite-contract.sh`** with its nine fixtures, which asks a real database whether the token is anywhere in it | `M` | ✅✅ **WAS TAKEABLE, AND IS CLOSED.** `0028` applied 2026-09-13; this shipped no migration, no schema and no policy. ⚠️ **Three decisions were taken on the owner's behalf and none of them blocked the build** — each is named in the status log with what reversing it costs. ⚠️ **The file list is deliberately NOT spelled out in this row**: it is machine-read for eight sentinels, and a paragraph naming them a second time is the TENTH instance of *never spell a check's sentinel in the file it reads* |
| **5b-ii-b-2** | ✅✅ **IS DONE AS OF 2026-09-18 — every one of its four deliverables is built and closed, and the loop the parent promised is shut.** **The redemption, the second actor, and the loop that closes.** **`redeem_invite`**, off the landing `5b-i` built, on a second person's phone: the token goes in, `0028` writes the membership and its location rows, and `guard.ts` sends them to Inicio the moment the read comes back — which is `5b-i`'s recorded rule that a screen never holds a second opinion about navigation. ⚠️⚠️ **AND THE SCREEN HAS TO TELL TWO CREDENTIALS APART (`P2`).** An invite token is **sixteen characters** of the *same* Crockford alphabet as the eight-character join code, and `hash_invite_token` normalises it through the *same* `normalize_workspace_code` — so the two are indistinguishable except by LENGTH, and the screen that takes the other one is `5b-iii`'s. ⚠️ **The refusals are already minted and have to reach a person in Spanish**: `TD003` for a code that expired or was replaced, `42501` for one that is not valid or is already spent, and the **idempotent** second tap that answers `already_redeemed` and is not an error at all. ⚠️ **A closed loop, and it is the one the parent promised**: an owner invites, a second person redeems, and there are two people in the shop ✅ **Shipped:** a fourth `src/api/` contract module (`redeem.ts`), which is the first in this app to carry a NORMALISER and the two lengths that decide which credential a person is holding; one wrapper and one hook; the second half of `(onboarding)/bienvenida.tsx`, one box below a rule; eleven new strings; **28 new Vitest assertions — 325 passing, up from 297**; and **`docs/checks/5b-ii-b-2-redeem-contract.sh`**, nine assertion groups over a reset database with three real people and two stores, wired into `db.yml` on the same commit that created it | `M` | ✅✅ **WAS TAKEABLE, AND IS CLOSED — SIZED `M` ON THE DAY IT WAS TAKEN AND THAT SIZE HELD, which is the first row in this file it has held for.** `0028` applied 2026-09-13; this shipped no migration, no schema and no policy. ⚠️ **It did NOT need the two devices this row predicted**: what the sizing called a second device is a second SESSION, and the contract check drives three of them over HTTP against one reset database — the instrument rules of `5a-iv-c` are for a RENDERING claim, and there is none here. ⚠️ **Three decisions were taken on the owner's behalf and none of them blocked the build**; one of them routes a second SQLSTATE overload into `5b-iii`, by analogy with his ruling of the same day. ⚠️ **The file list above is deliberately short of the sentinels the split guard reads** — the ELEVENTH instance of *never spell a check's sentinel in the file it reads.* `5b.8` must land next because that task edits the RPC this one wraps |
| **5b-iii** | ⚠️⚠️ **SIZED `XL` AND SPLIT FOUR WAYS 2026-09-19, BEFORE A LINE OF IT WAS WRITTEN — THE PARENT ROW, AND IT IS NO LONGER TAKEABLE.** ~~this was the next task, as of 2026-09-19~~ — ⚠️ **struck in lower case deliberately, the rule `5b.8-i`'s row records: `plan-handover.sh` reads the raw line, a strikethrough is only a rendering, and a row quoting its own history in the shouted form claims the marker it has just handed on.** **Twelve deliverables, all of which land in a child below.** **The PULL path and the badge.** Join-by-code → **`request_access`** → the joiner's pending state through **`my_access_requests`** (`S3`: no policy can ever show them their own row); the Home **notifications icon and badge** (**C11.8**); and **`approve_request`** with the **location picker** `D8` refuses to leave empty for `staff`. ⚠️ **A closed loop**: someone asks, the owner sees a badge, approves, they are in — and the silent failure `D8` exists to prevent is a staff member who can open the app and write nothing. ✅✅ **RULED BY THE OWNER 2026-09-19 — THE APPROVAL ROW SHOWS THE **EMAIL AS THE HEADER** AND THE **NAME** BENEATH IT.** His words: *"Show the Email as a Header and the Name as a subtitle of the request."* ~~Ruled 2026-09-14: the approver sees an EMAIL and a role, never a name.~~ ⚠️⚠️ **THE ORDER IS THE RULING AND IT IS THE INVERSE OF THE ROSTER ONE SCREEN OVER**, where the name is the title and the role the subtitle. **That is not an inconsistency.** On the roster you already know everybody and are looking them up by name; on an approval you are matching a stranger against an address somebody read out to you — so the **email is the thing being verified** and the name is what stops you approving the wrong one. ⚠️⚠️ **THIS ROW OWES A READ IT DOES NOT HAVE YET, AND THAT IS WHAT THE RULING COSTS.** The email is already reachable — a manager may select the request row (`0002:563`) — but the NAME is not: the person asking has **no `workspace_member` row at all** until the approval RPC writes one (`0029:455`), so there is nothing joined to a membership to read. ✅ **RECOMMENDED SHAPE, for the sizing session and not decided here: a `security definer` read returning the name through `public.auth_full_name(requested_by)`** (`0034:122`), which is the shape `request_access` already uses to return the shop's own name. ⚠️ **The alternative — a name column on the request row — is worse for a reason this repository has recorded twice**: that table also holds push-path invites, whose invitee may not have an account at all, so the column would mean one thing for `source = 'request'` and nothing for `source = 'invite'`. **A column whose meaning depends on another column is the shape that goes wrong.** ⚠️ **A definer read also stays current** if that person later corrects their own name. ⚠️ **AND THE NAME CAN BE ABSENT** — the metadata is nullable by design — in which case the row is the email and nothing under it. That is the identity ladder's own floor and it is handled silently, never explained to a shopkeeper. ⚠️⚠️ **THE TRADE THE OWNER TOOK, RECORDED SO IT IS NOT REDISCOVERED AS A SURPRISE: a person's name now reaches somebody who has NOT admitted them to the shop**, on the strength of them having typed the code. That was the argument against it and he ruled anyway. ⚠️ **That requirement is named ONCE in this row and this is not it** — spelling it twice is what made fixture `Y2` ambiguous while this sentence was first being written, the TENTH instance of *never spell a check's sentinel in the file it reads*, caught in seconds by the harness. ⚠️ **The constraint is named once in this row and once only**: a row that spells a sentinel it does not own is what `Y8` exists to catch, and a row that spells one twice makes `Y2` ambiguous — which is how this sentence was found ⚠️⚠️ **AND IT NOW CARRIES A MIGRATION, RULED BY THE OWNER 2026-09-18 — *"put the SQLSTATE fix in 5b-iii."* `0028` RAISES `22023` FOR FIVE DIFFERENT REFUSALS AND ONE OF THEM NEEDS ITS OWN SENTENCE.** The push path's creating RPC answers `22023` for a blank address, a malformed address, a location that is not this shop's, a staff invite naming none — and for *"has already requested access — approve the request instead"*. ⚠️ **The first four are refused on the phone before a call is made; the fifth cannot be**, because only the database knows, and it is the one refusal whose next step is a screen — **this one**. ⚠️ **Until the code exists the app matches a MARKER IN THE SERVER'S PROSE**, which is safe only because `docs/checks/5b-ii-b-1-invite-contract.sh` drives that refusal for real and goes red if the wording moves — see `ALREADY_REQUESTED_MARKER` in `@/api/invites`. ✅ **The fix is a SQLSTATE of its own, in the shape `TD001` and `TD003` were minted**, plus the marker and its assertion retired in the same pass. ⚠️ **It lands HERE because this task owns the approval the message points at** — one pass over that flow instead of two — **and it is cheap now and dearer once a second caller depends on the prose.** ⚠️⚠️ **AND A SECOND OVERLOAD FOLLOWED IT IN ON 2026-09-18, FOUND BY `5b-ii-b-2` AND ROUTED HERE BY ANALOGY RATHER THAN BY A RULING — REVERSED BY ONE PLAN EDIT.** **the redemption RPC — `5b-ii-b-2`'s, named in `5b-ii`'s row and deliberately not spelled here** — refuses an invalid or already-spent token with **`42501`**, and `42501` is ALSO what an absent session looks like from PostgREST — `@/api/errors` maps it app-wide to *"tu sesión se cerró"*. ⚠️ **`@/api/redeem` reads it as the CODE on the landing screen**, because `/bienvenida` is behind `guard.ts` and a caller there has a session; the wrong guess costs a confusing sentence and the next launch corrects it, and the other way round leaves her signing in again to retype a dead code forever. ⚠️ **`docs/checks/5b-ii-b-2-redeem-contract.sh` asserts the overload is REAL** — assertion 9 drives an anonymous caller and gets the same code — so the screen-local reading is a measured judgement rather than somebody not having noticed. ✅ **Same fix, same pass: a SQLSTATE of its own for "this token is not valid", and the screen-local mapping and its assertion retired together.** | `XL` | ⚠️⚠️ **RE-SIZED AND SPLIT ON 2026-09-19, AND THIS CELL IS WHAT ORDERED IT — IT WAS RIGHT.** The four children below are what gets taken; this row is not takeable. ✅ **UNBLOCKED — `5b-i` closed 2026-09-14, AND THE DECISION PARKED AGAINST THIS ROW ON 2026-09-18 WAS RULED ON 2026-09-19.** ⚠️⚠️ **RE-SIZE IT ON THE DAY IT IS TAKEN — IT GREW ON 2026-09-18 AND AGAIN ON 2026-09-19, BOTH TIMES BEFORE IT WAS TAKEN.** The second growth is the ruling above: the approval read must return a name that is on no table this caller may select, which is a `security definer` function with its own suite and falsifications on top of everything below.** The `22023` SQLSTATE was ruled into this row that day, and it is a MIGRATION with a suite and its falsifications, which this row did not carry when its `M/L` was written. `4e`, `4.6a` and `5b.8` all record that a deferred half needs re-sizing when it is picked up; this one now carries a migration, two screens, a badge and a client change. |
| **5b-iii-a** | ✅✅ **DONE 2026-09-19 — `0036` IS APPLIED, `TD004` AND `TD005` EXIST, AND NEITHER `@/api/invites` NOR `@/api/redeem` READS A SERVER'S PROSE ANY MORE.** **Two refusals that had no code of their own, and no screen in the room.** ONE migration taking the next free number, minting TWO application SQLSTATEs in the shape `TD001` and `TD003` were minted: one for ***"has already requested access — approve the request instead"***, which `0028` raises today as `22023` alongside four refusals the phone catches before a call is ever made; and one for ***"this token is not valid"***, which the redemption RPC raises today as `42501` — the same code PostgREST returns for a caller with no session at all. ⚠️ **EACH ONE RETIRES A MARKER IN THE SERVER'S PROSE THAT THE CLIENT MATCHES ON TODAY**: `ALREADY_REQUESTED_MARKER` in `@/api/invites`, and the screen-local reading in `@/api/redeem` that `5b-ii-b-2` measured rather than assumed. ⚠️⚠️ **A MARKER AND THE ASSERTION THAT DRIVES IT RETIRE IN THE SAME PASS** — `docs/checks/5b-ii-b-1-invite-contract.sh` and `docs/checks/5b-ii-b-2-redeem-contract.sh` each drive one of those refusals for real, and a marker deleted while its assertion stands leaves a check asserting a rule that is no longer true: red on a correct tree, and deleted by whoever meets it next. ⚠️ **IT SHIPS NO SCREEN.** Every claim in it is falsifiable by a pgTAP suite and two contract checks with no client in the room, which is the argument for taking it first — it is the only one of the four that nothing else in this split waits on. | `M` | ✅ **CLOSED. `TD004` and `TD005` were confirmed free against `supabase/README.md` AND against the applied catalog** (`0036`'s checks 7.1–7.4 read `pg_proc.prosrc`, because the README is a file and §9 says a file is not evidence), and the migration took `0036`, the next free number, on the day. ⚠️⚠️ **THEY ARE APPEND-ONLY NOW.** ⚠️ **ONE DECISION WAS TAKEN ON THE OWNER'S BEHALF AND IT IS THE EXPENSIVE ONE: `TD005` COVERS BOTH TOKEN REFUSALS, not just the one this row named** — see the session entry above. |
| **5b-iii-b** | ✅✅ **IS DONE AS OF 2026-09-19 — every one of its three deliverables is built and closed, and the half loop is on screen exactly as this row promised.** **The joiner asks, and can see that she asked.** The **join-by-code** screen on the landing `5b-i` built, the `request_access` wrapper in `src/api/` under `R12`, and the pending state read back through **`my_access_requests`** — `S3`, and it is the reason that function exists: `workspace_invite_select` is manager-and-above and somebody who has just asked has no role at all, so **no policy can ever show them their own row**, and the cheapest-looking fix is exactly the select policy `D6` rules out. ⚠️ **A second ask is idempotent by construction** (`0029`'s decision 5): she taps twice on a bad connection, or asks again the next morning because nothing has happened, and gets her own pending row back rather than an error. ⚠️ **It ships NO migration** — every function it calls was applied and frozen when `0029` merged. ⚠️⚠️ **IT IS A HALF LOOP AND THAT IS NAMED RATHER THAN HIDDEN**: she asks, she sees a pending state, and nothing lets anybody admit her until the two rows below ship. The same trade `5b.8-i` took and `5b.7` before it. | `M` | ✅✅ **WAS TAKEABLE, AND IS CLOSED — SIZED `M` ON THE DAY IT WAS TAKEN AND THAT SIZE HELD**, which is the second row in this file it has held for. `0029` applied 2026-09-14; this shipped no migration, no schema and no policy. ⚠️ **ONE DECISION WAS TAKEN ON THE OWNER'S BEHALF and it blocks nothing** — the `42501` reading, parked in the decisions block with a recommendation and named in the status log with what reversing it costs. ⚠️ **It also RETIRED a client refusal and the assertion that pinned it**, which is the arrangement `5b-ii-b-2` wrote down for this task by name. ⚠️ **The file list is deliberately NOT spelled out in this row** — the TWELFTH instance of *never spell a check's sentinel in the file it reads* |
| **5b-iii-c** | ✅✅ **DONE 2026-09-19 — `0037` IS APPLIED, AND THE APPROVER CAN READ A NAME THAT IS ON NO TABLE HE MAY SELECT.** ~~this was the next task, as of 2026-09-19~~ — ⚠️ **struck in lower case deliberately, the rule `5b.8-i`'s row records: `plan-handover.sh` reads the raw line, a strikethrough is only a rendering, and a row quoting its own history in the shouted form claims the marker it has just handed on.** ⚠️⚠️ **TWO DECISIONS WERE TAKEN ON THE OWNER'S BEHALF AND BOTH ARE FROZEN NOW: the read is fenced at `owner` rather than `manager`, and a non-owner reads ZERO ROWS rather than being refused** — the second because `42501` already carries two meanings on this path and a refusing read would have made it a fourth. See the status entry above for both, and the bill each one buys. **The name the approver is owed, and it is on no table he may select.** ONE migration taking the next free number: a `security definer` read that returns a pending request's requester NAME through **`public.auth_full_name(requested_by)`** (`0034:122`) — the shape the code-resolving RPC already uses to hand back the shop's own name. ⚠️⚠️ **THE EMAIL IS ALREADY REACHABLE AND THE NAME IS NOT**: a manager may select the request row (`0002:563`), but the person asking has **no `workspace_member` row at all** until the approval RPC writes one (`0029:455`), so there is nothing joined to a membership to read. ⚠️ **THE ALTERNATIVE — A NAME COLUMN ON THE REQUEST ROW — IS REFUSED**, and the reason is recorded twice in this repository already: that table also holds push-path invites whose invitee may have no account at all, so the column would mean one thing for `source = 'request'` and nothing for `source = 'invite'`, and **a column whose meaning depends on another column is the shape that goes wrong**. ⚠️ **A definer read also stays current** if that person later corrects her own name, which a copied column would not. ⚠️ **AND THE NAME CAN BE ABSENT** — the metadata is nullable by design — so it returns null and the screen says nothing under the header, which is the identity ladder's own floor and is handled silently, never explained to a shopkeeper. ⚠️ **It ships NO screen.** | `M` | ⚠️ **UNBLOCKED, and it is the one to take before the screen that renders what it returns.** ⚠️⚠️ **THE TRADE THE OWNER TOOK ON 2026-09-19 FREEZES WHEN THIS MERGES: a person's name reaches somebody who has NOT admitted her to the shop**, on the strength of her having typed the code. That was the argument against the ruling and he ruled anyway — recorded here so it is not rediscovered as a surprise. ⚠️ **Re-read the applied helper before writing this**: `auth_full_name` is `0034`'s, and this would be its second caller. |
| **5b-iii-d** | ⚠️⚠️ **SIZED `L` AND SPLIT IN TWO 2026-09-19, ON THE DAY IT WAS TAKEN AND BEFORE A LINE OF IT WAS WRITTEN — THE PARENT ROW, AND IT IS NO LONGER TAKEABLE.** ~~this was the next task, as of 2026-09-19~~ — ⚠️ **struck in lower case deliberately, the rule `5b.8-i`'s row records: `plan-handover.sh` reads the raw line, a strikethrough is only a rendering, and a row quoting its own history in the shouted form claims the marker it has just handed on.** ⚠️⚠️ **THE GATE CELL BELOW ORDERED THE RE-SIZE AND WAS RIGHT** — it named *a badge, a list and a picker*, and measured against the house ruler that is **~2,500 insertions where the largest client session this repository has shipped is 1,782**, because both of those edited a screen that already existed and this one has none to edit. **Four deliverables, all of which land in a child below.** **What the owner sees, and what he does about it — the row that shuts the pull loop.** The Home **notifications icon and badge** (**C11.8**), the approval screen it opens, and **`approve_request`** with the **location picker** `D8` refuses to leave empty for `staff`. ✅✅ **THE APPROVAL ROW SHOWS THE EMAIL AS THE HEADER AND THE NAME BENEATH IT** — the owner's ruling of 2026-09-19, *"Show the Email as a Header and the Name as a subtitle of the request"* — and **the order is the ruling**: it is the INVERSE of the roster one screen over, where the name is the title, because on an approval you are matching a stranger against an address somebody read out to you, so the address is the thing being verified. ⚠️⚠️ **`D8` IS THE SILENT ONE: AN APPROVED STAFF MEMBER WITH NO LOCATION WRITES NOTHING, SILENTLY** — RLS refuses every write with no message, which on a phone looks exactly like the app being broken, so the picker refuses to be empty rather than quietly defaulting. ⚠️ **The fence is `owner` and not `manager`** (`0029`'s decision 6), asymmetric with the push path on purpose: this writes `workspace_member` and `member_location`, whose insert policies are both owner-only. ⚠️ **It ships NO migration** — every function it calls is applied. | `L` — **split, two `M`s** | ✅ **UNBLOCKED — `5b-iii-c` CLOSED 2026-09-19 and `0037` IS APPLIED.** The two children below are what gets taken; this row is not takeable. |
| **5b-iii-d-1** | ✅✅ **DONE 2026-09-20 — THE BELL RINGS, THE QUEUE HAS FACES ON IT, AND NOT ONE ROW IN THE DATABASE CHANGED.** ~~this was the next task, as of 2026-09-19~~ — ⚠️ **struck in lower case deliberately, the rule `5b.8-i`'s row records: `plan-handover.sh` reads the raw line, a strikethrough is only a rendering, and a row quoting its own history in the shouted form claims the marker it has just handed on.** ⚠️⚠️ **ONE DECISION WAS TAKEN ON THE OWNER'S BEHALF AND IT IS THE ONE TO LOOK AT: the ORDER OF THE TWO LINES IS NOW A PURE FUNCTION (`linesOf`) RATHER THAN JSX**, so his ruling of 2026-09-19 is pinned by three assertions in `app/test/api-approvals.test.ts` instead of by a paragraph — §2.11 keeps rendering out of scope, and this is the first time a screen ruling in this repository has had an instrument. It changes nothing a person sees and is reversed by inlining two fields. **Evidence: 12 assertion groups over real HTTP against a reset database with seven people and two shops, all green; 13 falsification fixtures (12 red, 1 control); 417 Vitest assertions over 22 files; the conventions gate and its 30 fixtures.** **The bell, and the queue behind it — and it changes not one row in the database.** The Home **notifications icon and badge** (**C11.8**) over a count of live pending requests, the surface it opens, and the list `pending_access_requests` already returns: one entry per person waiting, **THE EMAIL AS THE HEADER AND THE NAME BENEATH IT** — the owner's ruling of 2026-09-19, *"Show the Email as a Header and the Name as a subtitle of the request"* — plus the role asked for and how long it has been waiting. ⚠️⚠️ **THE ORDER IS THE RULING AND IT IS THE INVERSE OF THE ROSTER**, where the name is the title: on an approval you are matching a stranger against an address somebody read out to you, so the address is the thing being verified and the name is what stops you admitting the wrong Juan. ⚠️ **THE NAME CAN BE ABSENT** — the metadata is nullable by design — and then the entry is an address with nothing under it, handled silently and never explained to a shopkeeper. ⚠️ **IT IS DELIBERATELY HALF A LOOP AND THE ROW SAYS SO**: he can see who is waiting and he cannot yet let them in. That is the same shape `5b-iii-b`, `5b.8-i` and `5b.8-iii-a` each shipped, and it is what keeps a sitting reviewable. ⚠️ **C12.1 APPLIES TO THE BELL** — an icon never appears without its word, and `(tabs)/index.tsx` already records that a header-corner icon was refused for exactly that reason, so this one lands in the body of Inicio and not in the navigator's header. ⚠️ **THE BADGE IS FENCED AT `owner`** and reads empty for everybody else, which is not a refusal but `0037`'s decision 2 working as designed — a manager gets an empty queue, not an error. ⚠️ **It ships NO migration and makes NO write** — `pending_access_requests` is applied (`0037`) and every claim in this row is falsifiable by one contract check over real HTTP. | `M` | ✅ **UNBLOCKED — `5b-iii-c` CLOSED 2026-09-19**, and the read this renders is applied. Nothing in the decisions-owed block bears on it. |
| **5b-iii-d-2** | ✅✅ **DONE 2026-09-20 — THE OWNER CAN LET HER IN, AND THE PICKER REFUSES TO BE EMPTY.** ~~this was the next task, as of 2026-09-20~~ — ⚠️ **struck in lower case deliberately, the rule `5b.8-i`'s row records: `plan-handover.sh` reads the raw line and a strikethrough is only a rendering.** **The act, and the one refusal no instrument here can see.** **`approve_request`** wired to the entry `5b-iii-d-1` draws, with the **location picker** `D8` refuses to leave empty for `staff`, and the three refusals it can answer with — `TD003` for a request that expired or was replaced, `42501` for one that is not this caller's to approve, `22023` for a location that is not this shop's. ⚠️⚠️ **`D8` IS THE SILENT ONE: AN APPROVED STAFF MEMBER WITH NO LOCATION WRITES NOTHING, SILENTLY** — RLS refuses every write with no message, which on a phone looks exactly like the app being broken, so the control refuses to be empty rather than quietly defaulting. ⚠️⚠️ **AND THAT IS THE WHOLE REASON THIS IS ITS OWN SITTING**: §2.11 keeps rendering out of scope, so **no suite in this repository can see a control that quietly defaults**, and a session that shipped it alongside a badge and a list would have nothing able to go red. The server raises `22023` for it (`0029:415`) and this half exists to say so in Spanish before the call is made. ⚠️ **The fence is `owner` and not `manager`** (`0029`'s decision 6), asymmetric with the push path on purpose: this writes `workspace_member` and `member_location`, whose insert policies are both owner-only. ⚠️ **IT IS IDEMPOTENT ON THE SERVER** — a second approve returns `already_approved` rather than raising (`0029:381`) — so a double tap on the pilot store's connection is safe, and the screen must not invent a refusal the database does not have. ⚠️ **It ships NO migration** — every function it calls is applied. | `M` | ✅✅ **CLOSED. The `M` was right** — ~2,050 insertions over 11 files, against the ~1,780 of the two largest client sessions on file, and the picker came in cheaper than sized because `useLocations`, `LocationOption` and `resolveLocations` already existed from the invite path. ⚠️ **`5b-iii` AND `5b` ARE NOW CLOSED IN FULL.** ~~UNBLOCKED — `5b-iii-d-1` CLOSED 2026-09-20~~ — the reason it was blocked was that building the control first means building it against a list that does not exist. ⚠️ Nothing in the decisions-owed block bears on it: the `request_access` SQLSTATE parked there is a different function on a different screen, and this task ships no migration to fold it into. |
| **5b.7** | ✅✅ **DONE AS OF 2026-09-18.** **ASK FOR A PERSON'S NAME WHEN THEY CREATE THEIR ACCOUNT, AND STORE IT. NOTHING DISPLAYS IT YET.** ✅ **Instructed by the owner 2026-09-18** — *"let's include the Name at Sign-in: Nombre y Apellido"*, which **supersedes the no-name half of his ruling of 2026-09-14**, taken when the finding was that no table carries a name and nobody had noticed Google hands us one. ⚠️⚠️ **TWO REQUIRED FIELDS — `Nombre` AND `Apellido` — on the sign-up half of `(auth)/entrar.tsx` only, and NEVER on sign-in**, where nobody types their name to come back. ✅ **Two boxes and not a word count** (owner, 2026-09-18): neither may be blank, and nothing else is asserted about either. A rule about SPACES in one box is a rule about how a name is shaped, and Spanish routinely carries two surnames — `María del Carmen Rodríguez Gómez` breaks every split anyone would write. ⚠️ **Stored as ONE joined string**, because that is the shape the other way in already delivers: one column, one reader, one display. `checkCredentials`' third and fourth rules; `supabase.auth.signUp({ options: { data: { full_name } } })`, **the key Google's provider already writes**, so one reader serves both ways in; the Spanish for both. ⚠️ **IT SHIPS NO MIGRATION, NO SCHEMA AND NO LIST** — the display is `5b.8`, and separating them is the whole point of the split. ⚠️⚠️ **AND THE OTHER WAY IN IS TAKEN AS-IS, WITH NO GATE.** Google hands over ONE STRING and there is no form to validate; **an account with no surname is legitimate** — that field is optional in most locales — so `Ana` can arrive and must be accepted. The correction is not a screen between the button and the shop: it is an editable own-name field on the sheet `5b-ii-a` built, and it is `5b.8`'s. ⚠️ **The identity ladder already handles the floor**: a person with no name at all still falls through to their address and then to their role, which is what `5b-ii-a`'s `Dueño` case is for. ⚠️ **A round trip is the evidence, not the file**: that the metadata survives `signUp` is a claim about somebody else's system, and §9 says a green CI run is what settles those | `S` | ✅✅ **DONE — AND THE IRRECOVERABLE DEADLINE IS CLOSED.** It was not a date but an EVENT: the pilot's first email sign-up. From this commit a sign-up sends `Nombre` and `Apellido` joined into `raw_user_meta_data.full_name`, and `docs/checks/5b.7-signup-name-contract.sh` asserts on a live round trip that it is still there on a LATER sign-in — the claim `5b.8`'s backfill depends on. ⚠️ **Google remains the documented default and is still NOT measured on this project**; one glance at `user_metadata` on the next real Google sign-in on the phone settles it, and it is a look rather than a task. ⚠️ **The screen gained a MODE** — see the status-log entry's decision 1 |
| **5b.8** | ⚠️⚠️ **SIZED `L` AND SPLIT THREE WAYS 2026-09-18, BEFORE A LINE WAS WRITTEN — THE PARENT ROW, AND IT IS NO LONGER TAKEABLE.** ~~It was first in line as of 2026-09-18, and it is struck in lower case deliberately: `plan-handover.sh` reads the shouted form as a MARKER, and a row quoting its own history in it claims to be the next task twice.~~ **Fourteen deliverables, all of which land in a child below.** **SHOW THE NAME, WHICH IS A MIGRATION AND AN ADR AMENDMENT.** A `display_name` column on `workspace_member` — the table a phone CAN read — written by **the shop-creation RPC `onboard_workspace`** and by **the redemption RPC `redeem_invite`** from the caller's own `raw_user_meta_data` — ⚠️⚠️ **AND BY THE TWO WRITERS THIS ROW NEVER NAMED, FOUND IN `0029` BY THE SIZING OF 2026-09-18: `request_access` (`R1`), whose `D7` fast path lets a pre-invited joiner straight in, and `approve_request` (`R2`), the approval `5b-iii` is built on. FOUR membership writers are applied, not two, and shipping two of them leaves the pull path joining nameless on the very next task** — plus a **backfill** for rows that already exist, with a pgTAP suite over the four writers and its falsifications, and ⚠️ **the write rule `R5` bakes into all four: the name is written on `insert`, and on `update` only where the stored value is null**, so a re-invite never overwrites a name a person has already corrected. ⚠️ **And `supabase/README.md`'s `0033` entry states that no human name exists anywhere in this schema (`R6`)**, which this migration makes false. Then the fourth identity case in `rosterFrom`, the column added to the roster's read via `MEMBER_COLUMNS`, and the contract check and harness extended to match. ⚠️⚠️ **AND IT IS THE TASK THAT RETIRES A RULING.** The 2026-09-14 ruling on how a member row is identified — and its twin about what an approver sees — are held as DELIVERABLES by two split guards and written into three rows. This task changes those sentinels; **until it does, they stay exactly as they are**, because a guard asserting a rule that is not yet true is worse than one asserting a rule that has been superseded on paper. ⚠️⚠️ **CORRECTED BY THE SIZING OF 2026-09-18 — THE TWO SENTENCES ARE IN TWO SECTIONS, NOT ONE, AND THE ADR WINS: §2.3's data-model table describes `workspace_member`'s columns (line 358), and `ADR-035 §2.7` is where `auth.users` is never exposed (line 1061).** ~~§2.7 describes `workspace_member`'s columns and says `auth.users` is never exposed.~~ Both sentences need amending, on the instruction given today, in the same task as the migration, the way `4.6a` did it. ✅✅ **AND A THIRD §2.7 SENTENCE WAS FOLDED IN BY THE OWNER'S RULING OF 2026-09-18 — *"fold it into 5b.8"*: §2.7's push paragraph says an owner or manager *"calls `create_invite(...)` under normal RLS"* and THE APPLIED FUNCTION IS `security definer`.** It has to be: `D3′` orders the creating RPC to supersede an expired pending row, that is an UPDATE, and `0002:594` grants `authenticated` select, insert and delete on `workspace_invite` and **not update** — so the invoker-rights spelling dies `42501` before any policy is consulted, and granting UPDATE to fix it makes the missing policy a silent no-op and returns `D3′`'s own bug wearing the costume of its cure. `0028`'s suite asserts both halves (checks `8.2`, `8.3`). ⚠️ **It was recorded at `4.6a-ii` on 2026-09-13 as the ninth stale copy and deliberately left**, because the ADR is amended by the owner's decision and a task is not one; it was parked as a decision by `5b-ii-b`'s sizing and ruled the same day. ⚠️ **It changes NO code and no client contract** — a non-manager is refused `42501` under either spelling — **so it is paperwork, and it is here because three amendments to one section are one deliberate pass and not three.** ⚠️⚠️ **PLUS A `security definer` RPC — `set_my_display_name` — SO A PERSON CAN FIX THEIR OWN NAME, AND THE OBVIOUS ALTERNATIVE IS A TRAP.** Measured, not assumed: `workspace_member_update` (`0001:532`) is `has_role(workspace_id, 'owner')` — **owner-only** — so a manager or a staff member cannot edit the row that describes them, and a Google account that arrived with one word can never be repaired. ⚠️⚠️ **A "you may update your own row" policy is NOT the fix and must not be written: RLS filters ROWS, NOT COLUMNS**, so it would also let that person change their own `role` — the tenancy wall opened to buy a text field. The RPC touches one column and nothing else, and the control lives on the sheet `5b-ii-a` built. ⚠️ **The `Dueño` fallback from `5b-ii-a` STAYS** as the last resort — it is what an account with empty metadata still gets | `M/L` | ✅✅ **WAS TAKEABLE, AND IS NOW A PARENT — SIZED `L` AND SPLIT THREE WAYS 2026-09-18, WHICH IS WHAT THE NEXT SENTENCE ASKED FOR.** ~~TAKEABLE AS OF 2026-09-18 — BOTH GATES ARE CLOSED.~~ Both gates closed that day: `5b.7` shipped the name into `raw_user_meta_data` on 2026-09-18 and `5b-ii-b-2` closed the same day, so the redemption RPC this task edits is now wrapped and asserted. ⚠️⚠️ **RE-SIZE IT FIRST AND EXPECT IT TO SPLIT: THIS ROW IS `M/L` AND HAS GROWN THREE TIMES SINCE THAT WAS WRITTEN**, twice on 2026-09-18 before it was taken. It carries a migration, a backfill, a pgTAP suite and its falsifications, a `security definer` self-edit RPC, a client change across two modules, two split guards whose sentinels it retires, THREE §2.7 amendments and a control on the Ajustes sheet. ⚠️ **`4e`, `4.6a`, `5a-iv`, `5a-iv-c`, `5b-ii` and `5b-ii-b` were every one of them sized smaller than they were and corrected on the day they were picked up** — this is the seventh, and the only one carrying a migration. ~~NOT TAKEABLE UNTIL `5b.7` AND `5b-ii-b` ARE CLOSED, AND IT MUST LAND BEFORE `5b-iii`.~~ After `5b.7` because backfilling from metadata nobody is collecting yet is a migration written against an empty column. After `5b-ii-b` because that task wraps the redemption RPC this one edits, and one pass over a settled flow beats two. **Before `5b-iii`**, because that screen is built against the ruling this task retires — building it first means building it twice. ⚠️⚠️ **RE-SIZE IT ON THE DAY IT IS TAKEN, AND IT GREW TWICE ON 2026-09-18 BEFORE IT WAS EVEN TAKEN** — the self-edit RPC and its control were not in this row when it was written, and they arrived from one grep of an applied policy; the third §2.7 amendment arrived the same day from the owner's ruling. ⚠️ **The third one is the cheap kind** — a sentence, in a section this task already has to open — **and it is named here so the re-size counts it rather than meeting it.** `4e` and `4.6a` both recorded that a deferred second half needs splitting when it is picked up, and this one carries a migration, a suite, a client change, two guards and an ADR |
| **5b.8-i** | ✅✅ **DONE 2026-09-18 — `0034` IS APPLIED AND EVERY WAY INTO A SHOP STORES A NAME.** ~~this was the next task, as of 2026-09-18~~ — ⚠️ **struck in lower case deliberately: `plan-handover.sh` reads the raw line and a strikethrough is only a rendering, so a row quoting its own history in the shouted form claims the marker it has just handed on.** **EVERY WAY INTO A SHOP STORES A NAME. NOTHING DISPLAYS IT YET.** One migration, the next free number — `0034` as the tree stands. A `display_name` column on `workspace_member` — the table a phone CAN read — and **all four applied membership writers** filling it from the caller's own `raw_user_meta_data`: `onboard_workspace` (`0027:422`), `redeem_invite` (`0028:525`), and ⚠️⚠️ **THE TWO THE PARENT ROW NEVER NAMED** — `request_access` (`0029:256`), the `D7` fast path where somebody already invited types the shop code instead of the token, and `approve_request` (`0029:455`), which is `5b-iii`'s own RPC and the reason this cannot wait for it. Plus the **backfill** for rows that already exist. ✅✅ **THE WRITE RULE IS RULED, NOT DECIDED HERE — THE OWNER SAID *"keep what they typed"* ON 2026-09-18** — and it is baked into four functions (`R5`): **the name is written on `insert`, and on `update` only where the stored value is null.** Three of the four writers take an `update` branch when the member row already exists, and refreshing the name there would silently replace a correction a person made about themselves with whatever Google sent — on an event she did not trigger and is not told about. ⚠️ **`R4`: `display_name` will mean the SHOP and the PERSON in one function body** — `onboard_workspace` already takes `p_display_name` for the shop — and the mitigation is a local variable named for the person, never a column rename. ⚠️ **The `Dueño` fallback from `5b-ii-a` STAYS**: an account with empty metadata still arrives with nothing, and that is the floor the identity ladder already handles. ✅ **The paperwork the schema makes false, in the same pass**: `ADR-035 §2.7`'s *"`auth.users` is never exposed to anyone"* and its `create_invite` *"under normal RLS"* spelling, §2.3's `workspace_member` columns row — ⚠️ **TWO SECTIONS, NOT ONE: this row said §2.7 described those columns and §2.3 does. The ADR won and this row was corrected on 2026-09-18; the same three sentences are amended either way, and all three were amended by `5b.8-i`**, and `supabase/README.md`'s `0033` claim that no human name exists anywhere in this schema (`R6`). ⚠️ **A pgTAP suite over the four writers and its falsifications is the evidence** — four paths in, four named members, no null left behind, and a person with empty metadata still admitted — and it needs no client at all | `M` | ✅✅ **TAKEABLE — BOTH OF `5b.8`'s GATES WERE CLOSED ON 2026-09-18 AND THIS CHILD INHERITS THEM.** `5b.7` shipped the name into `raw_user_meta_data`, and `5b-ii-b-2` wrapped the redemption RPC this task edits. ⚠️⚠️ **IT MUST LAND BEFORE `5b-iii`, AND `R2` IS WHY THE ORDERING IS NOW LOAD-BEARING RATHER THAN MERELY STATED**: `5b-iii` builds the approval screen on `approve_request`, so a column without that writer means every person who joins by the pull path arrives nameless and the repair is a second migration plus a second backfill. ⚠️ **It ships NO client code** — the display is `5b.8-ii` |
| **5b.8-ii** | ✅✅ **DONE 2026-09-18 — THE ROSTER SHOWS THE NAME.** ~~this was the next task, as of 2026-09-18~~ — ⚠️ **struck in lower case deliberately, the rule `5b.8-i`'s row records: `plan-handover.sh` reads the raw line, a strikethrough is only a rendering, and a row quoting its own history in the shouted form claims the marker it has just handed on.** ⚠️ **AND IT INHERITED ONE CORRECTION `5b.8-i` DELIBERATELY DID NOT MAKE**: `app/src/api/members.ts`'s comment says a staff caller *"can identify NOBODY"* on the roster. That is still true of `MEMBER_COLUMNS` and **no longer true of the policy** — `0034`'s section 7 measured a cashier reading every name in her shop. `5b.8-i` ships no client code and this is the file this task edits, so the sentence is corrected here rather than across the seam. **THE ROSTER SHOWS THE NAME, AND THE 2026-09-14 RULING FINALLY STOPS BEING TRUE.** The fourth identity case in `rosterFrom`, above the email and below *you*; the column added to the roster's read via `MEMBER_COLUMNS`; and the contract check and harness extended to match, which is where a claim about what a real database hands a real session is settled. ⚠️⚠️ **AND IT IS THE CHILD THAT RETIRES THE SENTINELS — the sentinels move HERE and not in the migration (`R3`).** Two split guards hold the 2026-09-14 EMAIL ruling as a DELIVERABLE — `5b-split-coverage.sh` routes *"identified by EMAIL"* to `5b-ii` and *"approver sees an EMAIL"* to `5b-iii`, and `5b-ii-split-coverage.sh` routes the first to `5b-ii-a` — and the parent's rule is *"until it does, they stay exactly as they are."* ⚠️ **A stored column changes nothing a person sees**, so retiring them when the column lands would leave both guards asserting a rule that is neither true nor superseded for as long as this task takes; **the ruling dies on the screen, which is here.** ⚠️ **Both harnesses move with their guards** — when an assertion changes, the thing that falsifies it changes in the same commit, which is the rule `conventions-gate-falsify.sh` spent a day dead to learn. ⚠️ **It ships NO migration**, which is exactly what makes it the safe place to move a sentinel two guards depend on | `M` | **BLOCKED ON `5b.8-i`** — a fourth identity case reading a column that does not exist is a client built against a guess, and the contract check would have nothing to assert against. ⚠️⚠️ **THIS IS THE CHILD THAT MUST LAND BEFORE `5b-iii`**, not merely the parent: `5b-iii`'s approval screen is built against the twin ruling this task retires, so building it first means building it twice |
| **5b.8-iii** | ⚠️⚠️ **SIZED `L` AND SPLIT IN TWO 2026-09-19, BEFORE A LINE WAS WRITTEN — THE PARENT ROW, AND NO LONGER TAKEABLE.** ~~this was the next task, as of 2026-09-18~~ ⚠️⚠️ **ITS OWN GATE CELL ORDERED THE RE-SIZE, AND THE RE-SIZE IS WHAT HAPPENED** — see the right-hand cell; `4e`, `4.6a` and `5b.8` itself all record that a deferred half arrives bigger than it left, and this one carries a migration. ⚠️ **It is taken ahead of `5b-iii` on two grounds and neither is the split's ordering**: `5b-iii` is BLOCKED by the decision parked on 2026-09-18, and this task closes a gap that is live from the moment `5b.8-ii` merged — a Google account that arrived as one word now shows that one word on the roster and nobody can fix it, because `workspace_member_update` is owner-only. **A PERSON FIXES THEIR OWN NAME, AND THE OBVIOUS ALTERNATIVE IS A TRAP.** `set_my_display_name` — a `security definer` RPC taking the next free number, touching ONE column and nothing else — and the control lives on the sheet `5b-ii-a` built. ⚠️⚠️ **MEASURED, NOT ASSUMED: `workspace_member_update` (`0001:532`) is `has_role(workspace_id, 'owner')`** — owner-only — so a manager or a staff member cannot edit the row that describes them, and a Google account that arrived as one word can never be repaired. ⚠️⚠️ **A *"you may update your own row"* POLICY IS NOT THE FIX AND MUST NOT BE WRITTEN: RLS FILTERS ROWS, NOT COLUMNS** — the sentence §2.7 already spends a paragraph on about `cost` — so it would also let that person change their own `role`, which is the tenancy wall opened to buy a text field by an edit that reads as a courtesy. ⚠️ **It is the half `5b.7` deliberately left here**: that row shipped on the promise that a one-word Google name is repaired by an editable own-name field rather than by a screen between the button and the shop, so deferring this makes `5b.7`'s closing argument false. ⚠️ **Its own pgTAP suite and falsifications** — a member edits their own row, a non-member is refused, a blank is refused, and the `role` column is provably untouched by the call | `L` (was `M`) | ⚠️ **THE BLOCK CLEARED**: `5b.8-i` closed 2026-09-18 and `0034` is applied, so the column exists to edit. ⚠️⚠️ **AND THE ROW WAS RE-SIZED THE DAY IT WAS TAKEN, WHICH IS WHAT THIS CELL ORDERED** — it carries a migration AND a screen, which is `5b.8-i` and `5b.8-ii` in one session. **Not takeable; take `5b.8-iii-a`.** ⚠️ **It does NOT block `5b-iii` and `5b-iii` does not block it**: the repair path touches no screen `5b-iii` builds, so it is the one child of the three that may legitimately be deferred past it. ⚠️⚠️ **IF IT IS DEFERRED, RE-SIZE IT ON THE DAY IT IS TAKEN** — `4e`, `4.6a` and `5b.8` itself all record that a deferred half arrives bigger than it left, and this one carries a migration |
| **5b.8-iii-a** | ✅✅ **DONE 2026-09-19 — `0035` IS APPLIED AND A PERSON CAN FIX HER OWN NAME.** ~~this was the next task, as of 2026-09-19~~ — ⚠️ **struck in lower case deliberately, the rule `5b.8-i`'s row records: `plan-handover.sh` reads the raw line, a strikethrough is only a rendering, and a row quoting its own history in the shouted form claims the marker it has just handed on.** **The repair path in the database, and nothing a person can see yet.** `set_my_display_name(p_workspace_id uuid, p_display_name text)` — a `security definer` RPC taking the next free number `0035`, writing ONE column of ONE row, the caller's own. ⚠️⚠️ **IT IS WORKSPACE-SCOPED, AND THAT IS A DECISION TAKEN ON THE OWNER'S BEHALF** — `my_workspaces()` returns `setof uuid` and its own comment says many-workspaces-per-user *"works from day one even though every real user has exactly one"* (`0001:317`), so an unscoped write would reach across a tenant boundary to save one argument. **Reversible: a scoped call can later fan out; an unscoped write that has already run cannot be un-run.** ⚠️⚠️ **A *"you may update your own row"* POLICY IS NOT THE FIX AND MUST NOT BE WRITTEN: RLS FILTERS ROWS, NOT COLUMNS** — it would also let a cashier set her own `role`. ⚠️ **The write rule `0034` baked in stands**: this RPC is the ONE writer that may overwrite a non-null name, because it is the person herself doing it. ⚠️ **Its own pgTAP suite and falsifications, under `set role authenticated`** — a member edits their own row, a non-member is refused, a blank is refused, another member's row is untouched, and the `role` column is provably untouched by the call. ⚠️ **`supabase/README.md`'s numbering entry** | `M` | ✅ **CLOSED 2026-09-19, AS SIZED.** Shipped: `supabase/migrations/0035_set_my_display_name.sql`, `supabase/tests/0035_set_my_display_name.sql` (38 checks, sixteen falsifications, fifteen red), the `supabase/README.md` numbering entry, an additive ADR-035 §2.3 amendment, and a note in `_cleanup.sql` recording that the suite added NO new helper shape. ⚠️ **Two falsifications changed the SUITE** — an unfalsifiable guard and an abort-instead-of-FAIL; see the status entry. ⚠️ **It ships no screen**, so nothing a person can see changed until `5b.8-iii-b` |
| **5b.8-iii-b** | ✅✅ **DONE 2026-09-19 — A PERSON CAN FIX HER OWN NAME, AND A CASHIER CAN TOO.** ~~this was the next task, as of 2026-09-19~~ — ⚠️ **struck in lower case deliberately, the rule `5b.8-i`'s row records: `plan-handover.sh` reads the raw line, a strikethrough is only a rendering, and a row quoting its own history in the shouted form claims the marker it has just handed on.** **The control a person fixes their own name with, and the only half anybody can see.** ⚠️ **No migration** — it calls what `5b.8-iii-a` applied. The control lives on the sheet `5b-ii-a` built, `app/src/app/ajustes.tsx`, as the caller's OWN row made editable — **not** a pencil against a roster row, which is the difference between fixing your own name and administering somebody else's, and the roster is manager-and-above while this is for everybody. ⚠️ **The call belongs in `src/api/` under `5b.5`'s conventions** (`R12`, `R13`): everything with a right answer in the module, nothing that talks. ⚠️ **The roster must re-read after the write**, or a person corrects her name and the list in front of her still shows the old one. ⚠️ **Its Spanish strings go in `app/src/strings.ts`**, and its contract check and harness join the pair `5b-ii-a` ships | `M` | ✅ **CLOSED 2026-09-19, AS SIZED.** Shipped: `app/src/api/displayName.ts` (the fifth `src/api/` module), the `setMyDisplayName` wrapper in `calls.ts`, `useMyDisplayName` and `useSetMyDisplayName` in `hooks.ts`, `nameOf`/`nonBlank` exported from `members.ts`, the `Tu nombre` section on `ajustes.tsx`, the `ES.myName` block, `app/test/api-display-name.test.ts` (28 assertions), and the pair `5b-ii-a` ships — `docs/checks/5b.8-iii-b-name-contract.sh` (8 groups) and its harness (10 fixtures), both wired into `db.yml`. ⚠️ **It shipped no migration, as promised.** ⚠️ **One defect found by the harness while the check was being written** — a request body inlined inside three levels of command substitution; see the status entry |
| **5b.5** | ✅✅ **IS DONE AS OF 2026-09-18 — the `src/api/` half is written; the `src/ui/` half moved to `5h.5`, which is the decision this task's closing message flags first. `CONVENTIONS.md`, SECOND PASS — RULED BY THE OWNER 2026-09-13.** The page shipped at `5a-iv-b` describes **no `src/api/` and no `src/ui/` conventions, because none exist yet**. §3 put both in `5a` so that *"step 6's four screens arrive to a pattern"*; this plan spread them across `5d`–`5h`, and the owner ruled that **the re-sequencing stands and the pattern is described once `5b` has produced a real one** — rather than ten primitives guessed at against screens nobody has drawn. Numbered `5b.5` in the shape of `4.5`/`4.6`: an interstitial obligation, not a build step. ⚠️ **It is the LAST moment this is cheap** — `5d` is the first of the screens §3 was talking about. | `S` | ⚠️⚠️ **RE-POINTED AT `5b-i` CLOSING, 2026-09-14, WHEN `5b` WAS SPLIT** — a decision taken on the owner's behalf and named in the closing message. `5b-i` is the task that CREATES `src/api/`; `5b-ii` and `5b-iii` are its first two consumers. Describing the pattern after `5b-i` is §3's own argument (*"step 6's four screens arrive to a pattern"*) applied one level down, and it is cheaper — one consumer to reconcile instead of three, each having invented its own. ⚠️ **His ruling of 2026-09-13 is UPHELD, not bent**: it said the pattern is described *"once `5b` has produced a real one"*, and `5b-i` is where a real one appears. `docs/checks/conventions-gate.sh` fails if this row and the page's own second-pass note disagree. ⚠️⚠️ **AND IT NOW ALSO WAITS ON `5b.6`, DECIDED 2026-09-17 — the second re-point of this row, and named as a decision taken on the owner's behalf.** `5b.6` creates `palette.ts`; describing `src/api/` now and the palette later means opening this page twice. **His ruling of 2026-09-13 is upheld again rather than bent** — *"described once `5b` has produced a real one"* — it just waits for the second real one. **Reversed by one plan edit** ⚠️⚠️ **AND BOTH THINGS IT WAITED FOR NOW EXIST, SO IT IS TAKEABLE — TAKEN AS A DECISION ON THE OWNER'S BEHALF 2026-09-17, NOT AS A RULING.** `5b-i` built `src/api/` and `5b.6` built the palette; the row's own gate argues for going now rather than later — *"one consumer to reconcile instead of three, each having invented its own"* — and `5b-ii` and `5b-iii` are the two that would otherwise become the other two. ⚠️ **The alternative was to resume the interrupted order and build the Ajustes sheet first**, which is defensible and costs a page written against two consumers instead of one. **Reversed by one plan edit** ✅ **CLOSED 2026-09-18.** Shipped: `R12` and `R13` on the page and in `docs/checks/conventions-gate.sh`, a row added to `R3`, a second instance named in `R4`, `src/api/` added to the file-layout tree, five new fixtures (`F22`–`F26`), `F10` re-anchored, and assertion `0b` rewritten to READ the deferred task id instead of carrying `5b.5` as a literal — which is what would have let this very edit pass unnoticed |
| **5b.9** | ✅✅ **DONE 2026-09-22 — `0038` IS APPLIED, `TD006` EXISTS, AND THE JOIN BOX HAS STOPPED GUESSING WHO IS STANDING THERE. ⚠️⚠️ IT CLOSED BY TURNING *FIVE* STANDING CHECKS RED ON A CORRECT TREE, WHICH IS FOUR MORE THAN THIS ROW PREDICTED** — `5b-iii-b`'s contract check assertion 9 (replaced by its opposite), `supabase/tests/0029` 2.4, 2.5 and 2.8 (re-pointed), and `supabase/tests/0036` 7.3, *"TD006 is still free"* (retired into `0038` 7.2, which now watches `TD007`). **Every one of the five was written to do exactly that**, and four of them were found only by running the DIRECTORY rather than the file this task touched — which is the rule `0036` paid for. ⚠️ **`supabase/tests/0029` 2.7 did NOT move, and that is the half that makes the fix a fix**: it asserts an unauthenticated caller is refused `42501`, and before `0038` it and 2.4 asserted the SAME state on the same function. **That was the defect, sitting in the suite of the migration that shipped it.** ⚠️ **One decision on the owner's behalf freezes on merge and is named in the entry above**: `TD006` covers an unknown code AND a shop that has been switched off, because `0029`'s decision 4 already made them one refusal with one message and minting for one alone would have left the overload standing. ~~this was the next task, as of 2026-09-22~~ — ⚠️ **struck in lower case deliberately, the rule `5b.8-i`'s row records.** ~~mint a SQLSTATE for `request_access`'s unknown code — ruled 2026-09-22, *"let's follow your recommendation"*, and deliberately not next.~~ `0029` refuses an unknown workspace code with **`42501`**, and `@/api/errors` maps `42501` app-wide to *"tu sesión se cerró"* — so the join box must guess, and `@/api/requests`'s `UNKNOWN_CODE` guesses *"the code"* because `/bienvenida` sits behind `guard.ts`. ⚠️ **It guesses right almost always and wrong in one case**: a person whose session expired mid-screen is told to re-read a code that was fine, and her next launch corrects it. **That is the whole exposure, which is why this blocked nothing for four days.** ⚠️⚠️ **THE PRECEDENT IS EXACT AND ELEVEN DAYS OLD: `0036` minted `TD004`/`TD005`** for the identical arrangement `5b-ii-b-2` shipped, on the reasoning the owner gave on 2026-09-18 — **cheap now, dearer once a second caller depends on it.** This is **`TD006`** in **`0038`**, and `0036`'s own distinction is the argument: **reuse is one meaning reached from two places; an overload is two meanings wearing one code**, and the difference is whether a client can branch on it. ⚠️⚠️ **IT MUST NOT BE FOLDED INTO ANYTHING, and that is the ruling's own wording**: *"as its own small task after `5c-iv`"*. `5c-iv-a` and `5c-iv-b` ship **no migration at all**, so folding it there would mean giving a screen task a migration it does not otherwise have — and *"one migration over two unrelated functions is harder to falsify and harder to revert"* is this project's recorded refusal. ⚠️ **THE GUARD THAT PROVES IT ALREADY EXISTS AND IS CURRENTLY GREEN ON THE DEFECT**: `docs/checks/5b-iii-b-request-contract.sh` asserts the two meanings of `42501` are **still indistinguishable on the wire**. So this task closes by turning a standing check RED and rewriting it — not by adding one, which is the cheapest possible evidence that the fix landed. ⚠️ **`0037` MADE THE CASE SHARPER RATHER THAN SOFTER**: its decision 2 chose an EMPTY LIST over a `42501` refusal precisely so this overload would not become a fourth, and wrote that reason into the applied function's comment. **The next module that needs to refuse on this path will not have that exit.** ⚠️ **It ships a migration — `0038` — and it is the only open row in step 5 that does** | `S` | ✅✅ **UNGATED, AND THE QUEUE IT WAS BEHIND IS NOW EMPTY.** ~~ungated, and deliberately queued behind `5c-iv`~~ by the ruling of 2026-09-22 — ⚠️ **struck in lower case deliberately, the rule `5b.8-i`'s row records.** `5c-iv-b` closed on 2026-09-22 and `5c` with it, so the ordering the ruling asked for is satisfied |
| **5b.6** | ✅✅ **IS DONE AS OF 2026-09-17 — the palette exists, `R11` reads it, and twenty-one fixtures say `R11` can fail. THE PALETTE, AND THE ONE GUARD THAT CAN HOLD IT.** `app/src/theme/palette.ts` — **eleven named roles, each with one job**, beside `density.ts` and in the same shape: a typed record, no component adopting it yet. Plus **`R11` in `docs/checks/conventions-gate.sh`** — *every colour a person sees comes from the palette, never a literal* — **with its fixtures in `conventions-gate-falsify.sh`**, which is the half that makes a new rule evidence rather than a claim. ⚠️ **The palette is the ONLY part of área 13 a machine can check**; §2.11 bans rendering suites, so everything else about how the app looks is held by prose and a canvas. ⚠️ **Tokens only, and deliberately no screen retrofitted** — `5b-ii` is the first consumer and `5d` is the deadline. **Ships no migration and no screen.** | `S/M` | ✅ **CLOSED 2026-09-17.** Shipped as sized: `app/src/theme/palette.ts` (eleven roles), `app/test/palette.test.ts` (7 assertions, no hex spelled twice), `R11` + assertion `0d` in the gate, fixtures `F17`–`F21`, and `F10`/`F12` repaired after both went stale on this task. **No migration, no screen, no component adopting it** |
| **5c** | ⚠️⚠️ **SIZED `XL` AND SPLIT FOUR WAYS 2026-09-20, BEFORE A LINE WAS WRITTEN — THE PARENT ROW, AND IT IS NO LONGER TAKEABLE.** ~~this was the next task, as of 2026-09-20, and this file carried it as an `L`~~ — ⚠️ **struck in lower case deliberately, the rule `5b.8-i`'s row records: `plan-handover.sh` reads the raw line and a strikethrough is only a rendering.** ⚠️ **`5c.5` closed first and handed the split a number to design against: a dropped connection costs up to 90 seconds before the app tries again, which is exactly the expiry margin.** **Offline.** **Fourteen deliverables, all of which land in a child below:** the **outbox table** in `expo-sqlite` and its three states — **pending**, **flushing**, **dead** (§2.6); **client-generated document uuids** for §2.6 idempotency; the **enqueue** every write goes through; the **identical-offline slide** (C10.3); the **flush on reconnect**; `recorded_offline`; **transient** against permanent; `record_failed_write` and the downgrade it runs for `sale` and `waste` only; the quiet dismissible *"Sin conexión a internet"* (C10.1); the fading reconnect toast (C10.2); and the least-invasive dead-letter banner (C11.9). ⚠️⚠️ **THE BANNER READS THE DEVICE'S OWN OUTBOX AND MAKES NO SERVER READ — ruled 2026-09-14.** `failed_write.id` IS the client uuid (`0024` decision 7), so the device that failed already holds what `replay_failed_write` needs. **It shows a COUNT and a PESO FIGURE, never a list, never an `error_code`** — C10.5 and §2.8 both survive intact. ⚠️ **The uuids are therefore load-bearing twice**: §2.6 idempotency and this. ⚠️ **What it cannot cover — a reinstall, or a failure on the other person's phone — falls back to HAND RECOVERY BY US** (ruling of 2026-09-05), and §2.10's nightly check is what says whether that is enough | `XL` | ✅ **4.6b is DONE** — the replay control is unblocked, and the read it seemed to need was ruled away |
| **5c-i** | ✅✅ **DONE 2026-09-20 — THE QUEUE EXISTS AND NOTHING IN IT TALKS.** ~~this was the next task, as of 2026-09-20~~ — ⚠️ **struck in lower case deliberately, the rule `5b.8-i`'s row records: `plan-handover.sh` reads the raw line and a strikethrough is only a rendering, so a row quoting its own history in the shouted form claims the marker it has just handed on.** **The outbox, and nothing in it talks.** The **outbox table** in `expo-sqlite` — a real table, not another key in the `localStorage` shim `5b-ii-a` built — carrying the client uuid, the kind, the payload as JSON, the attempt count and the state; its three states **pending**, **flushing** and **dead** as ONE transition function rather than a column somebody sets; **client-generated document uuids** for §2.6 idempotency; and the **enqueue** every write in this app will go through, behind `@/api/` where §2.11 puts it. ⚠️⚠️ **IT HAS NO CALLER AND THAT IS THE POINT** — `5f`–`5h` are the screens that will write, and a screen that learns to `await` an RPC first is a screen rewritten later. ⚠️⚠️ **C10.3, the identical-offline slide, IS DISCHARGED HERE BY CONSTRUCTION RATHER THAN BY A SCREEN**: if enqueuing is the only write path then the confirmation **NEVER WAITS FOR THE NETWORK** and cannot look different offline, because the screen is never told which it was. ⚠️ **§2.11 names the outbox state machine as testable by decision**, so this is the one child of the split a Vitest suite can hold end to end. ⚠️ **It ships NO migration** — step 5's property, and `0024`–`0026` have been applied since 2026-09-05 | `M` | — |
| **5c-ii** | ⚠️⚠️ **SIZED `M/L` AND SPLIT IN TWO 2026-09-20, ON THE DAY IT WAS TAKEN AND BEFORE A LINE OF IT WAS WRITTEN — THE PARENT ROW, AND IT IS NO LONGER TAKEABLE.** ~~this was the next task, as of 2026-09-20~~ — ⚠️ **struck in lower case deliberately, the rule `5b.8-i`'s row records: `plan-handover.sh` reads the raw line and a strikethrough is only a rendering.** **The flush, and the retries the uuid makes free.** **Eight deliverables, all of which land in a child below:** Connectivity as ONE signal the whole app reads; the **flush on reconnect**; the cadence designed against the **90 seconds** `5c.5` measured a lost reply costs before the client tries again — *"`EXPIRY_MARGIN_MS` is exactly 90 seconds. The margin has zero slack."*; the drain that takes the queue **oldest-first**; **single-flight**, so two flushes can never claim one row; a re-send under the SAME uuid, which §2.6 makes a success carrying `already_recorded` rather than a duplicate sale; and `recorded_offline`, ⚠️⚠️ **SET WHEN A WRITE WAS NOT COMMITTED ON ITS FIRST attempt** rather than from a connectivity guess — it decides which day a sale counts on in Números. ⚠️ **It renders nothing**: the signal it produces is what the last child draws, and the half that talks is measured by a contract check over real HTTP against `record_sale`, which `0016` has had applied since long before any screen existed. ⚠️⚠️ **WHY IT SPLIT, AND IT IS NOT A SIZE ARGUMENT ALONE: ONE HALF IS FALSIFIABLE WITHOUT LEAVING THIS MACHINE AND THE OTHER CANNOT BE MEASURED TODAY AT ALL.** The connectivity source is a native call whose answer is a READING on two devices, and **both iOS instruments are unavailable**: there is no iOS Simulator on this Mac (Command Line Tools only — `xcrun simctl` is not installed) and the owner's iPhone is holding the `5a-iv-d` day-8 reading due 2026-09-21, which opening the app restarts. ⚠️ **BOTH HALVES OF THAT SENTENCE STOPPED BEING TRUE ON 2026-09-21 — left standing because it is the RECORD of why this row split, and it was true on the day it was written; see the struck bullet under *Sized 2026-09-20* for the correction.** **A session that took this whole row today would have had to either guess the dependency off two changelogs or spend tomorrow's reading on it.** ⚠️ **It ships NO migration** | `M/L` | ✅ **`5c-i` is DONE** — the queue exists, so there is something to drain |
| **5c-ii-a** | ✅✅ **DONE 2026-09-20 — A QUEUED SALE CAN BE SENT, AND SENDING IT TWICE IS STILL ONE SALE.** ~~this was the next task, as of 2026-09-20~~ — ⚠️ **struck in lower case deliberately, the rule `5b.8-i`'s row records: `plan-handover.sh` reads the raw line and a strikethrough is only a rendering.** **The drain, and the retries the uuid makes free.** What a flush DOES once something has decided to run one: the queue taken **oldest-first**, **single-flight** so two of them can never claim one row, `claim` → send → settle through `advance`, and a re-send under the SAME uuid, which §2.6 makes a success carrying `already_recorded` rather than a duplicate sale. And `recorded_offline`, ⚠️⚠️ **SET WHEN A WRITE WAS NOT COMMITTED ON ITS FIRST attempt** rather than from a connectivity guess — it decides which day a sale counts on in Números, and `0025`'s `record_sale` is the function that acts on it. ⚠️⚠️ **IT NEVER DECIDES WHEN IT RUNS, AND THAT IS THE SEAM** — no timer, no listener, no native import; the trigger is the sibling below, and a drain that grows one has taken that task back into a sitting where nothing in this repository could measure it. ⚠️ **Every claim in it is falsifiable without leaving this machine**: a Vitest suite over the decision, and a contract check over real HTTP that sends one uuid to `record_sale` twice. ⚠️ **It ships NO migration** | `M` | ✅ **`5c-i` is DONE** — the queue exists, so there is something to drain. ⚠️ **And it still has no caller**: nothing in this app enqueues a sale yet, so the drain ships with nothing to drain on the owner's phone |
| **5c-ii-b** | ⚠️⚠️ **SIZED `M` AND SPLIT IN TWO 2026-09-22, ON THE DAY ITS GATE CLEARED AND BEFORE A LINE OF IT WAS WRITTEN — THE PARENT ROW, AND IT IS NO LONGER TAKEABLE.** ~~this was the next task, as of 2026-09-20, and its gate was discharged on 2026-09-21~~ — ⚠️ **struck in lower case deliberately, the rule `5b.8-i`'s row records: `plan-handover.sh` reads the raw line and a strikethrough is only a rendering.** **When a flush runs, and the one call nothing in this repository can answer.** Connectivity as ONE signal the whole app reads — ⚠️⚠️ **`expo-network` against `@react-native-community/netinfo`, AND THE ANSWER IS A READING RATHER THAN A CHOICE BETWEEN TWO CHANGELOGS: MEASURED ON BOTH INSTRUMENTS** before a line of it is written, because iOS and Android have already disagreed three ways in one day on this project — and whether *"wifi versus cellular"* is a distinction this app needs at all. Then the **flush on reconnect**, the app-state wake, and the cadence designed against the **90 seconds** `5c.5` measured a lost reply costs before the client tries again. ⚠️ **It renders nothing**: the signal it produces is what `5c-iv` draws. ⚠️ **It ships NO migration** | `M` | ✅✅ **UNGATED AS OF 2026-09-21 — BOTH INSTRUMENTS ARE FREE**, and the split below is what that ungating bought: the reading and the code it decides are two rows, because the second cannot be written honestly until the first is in |
| **5c-ii-b-1** | ✅✅ **DONE 2026-09-22 — THE READING IS TAKEN ON BOTH INSTRUMENTS, AND IT DID NOT SPLIT THE TIE, IT BROKE IT: ON iOS `@react-native-community/netinfo` NEVER CAME BACK.** ~~this is the next task, as of 2026-09-22~~ — ⚠️ **struck in lower case deliberately, the rule `5b.8-i`'s row records: `plan-handover.sh` reads the raw line and a strikethrough is only a rendering.** **The reading, and the dependency it chooses.** `expo-network` against `@react-native-community/netinfo`, **MEASURED ON BOTH INSTRUMENTS** — the `wera-android-36` emulator and the iOS 26.5 Simulator — with the link actually dropped rather than described, and the loser deleted from `package.json` in the same commit that keeps the winner. ⚠️⚠️ **AND IT ANSWERS THE QUESTION THE SIMULATOR CANNOT: whether *"wifi versus cellular"* is a distinction this app needs**, which ADR-035 §2.6 makes live by calling mobile data *"a fallback whose 1–2 minute figure is background flush cadence, not single-write latency"*. **The answer is NO for v1 and the reason is recorded below**, so the owner's phone is NOT needed and the bound is written down rather than assumed. ⚠️ **It writes NO product code** — no signal module, no listener, no timer — and ⚠️ **it ships NO migration** | `S/M` | ✅ **Was ungated — both instruments came free on 2026-09-21** |
| **5c-ii-b-2** | ✅✅ **DONE 2026-09-22 — THE QUEUE HAS A TRIGGER, AND `@/lib/flushRunner` HAS ITS FIRST CALLER AFTER TWO DAYS WITH NONE.** ~~this was the next task, as of 2026-09-22, and `5c-ii-b-1` changed its shape before it was taken~~ — ⚠️ **struck in lower case deliberately, the rule `5b.8-i`'s row records: `plan-handover.sh` reads the raw line and a strikethrough is only a rendering.** **The trigger, written against a measured dependency rather than a chosen one.** Connectivity as ONE signal the whole app reads — ⚠️⚠️ **ONE module owns the native import and every other file READS THE SIGNAL, NEVER THE LIBRARY**, which is what makes `5c-iv`'s notice and this task's drain the same fact rather than two subscriptions that can disagree with nothing here able to see it. Then the **flush on reconnect**, the app-state wake, and the cadence designed against the **90 seconds** `5c.5` measured a lost reply costs before the client tries again — ⚠️ **a flush fired the instant the link returns can still be refused by an auth layer serving a cached failure**, which is why that number is the one to design against rather than a round figure. ⚠️⚠️ **AND THE READING ADDED A CONSTRAINT NO CHANGELOG WOULD HAVE: THE LISTENER IS NOT TRUSTWORTHY ON iOS.** `expo-network`'s listener announced the reconnect in one run of two and missed it in the other, while its READ was correct within five seconds both times — so the signal is a listener **plus a poll plus the app-state wake**, and a subscription alone is the shape that leaves a shop's queue full. ⚠️⚠️ **AND IT OWES ADR-035 §2.11 A ROW, BY THE OWNER'S RULING OF 2026-09-22 — *"let's follow your recommendation"*: ADR-035 §2.11 GAINS A CONNECTIVITY ROW naming `expo-network`, folded in here rather than given a session.** ⚠️ **It must carry the BOUND and not only the name** — the reading was taken on a simulator sharing the host's network, so the losing library's failure to recover is a simulator finding a real iPhone may not reproduce. §2.11 fixes every other app-wide choice so nobody invents a second one; a row stating this one without its evidence is the stale copy this file has recorded eight times. ⚠️ **It renders nothing**: the signal it produces is what `5c-iv` draws. ⚠️ **It ships NO migration** ✅ **Shipped:** `app/src/api/connectivity.ts`, the eleventh `src/api/` module and a machine that is a pure function of `(state, event, now)` — the 2 s debounce over the handover blip, the de-duplication of a repeated payload, the app-state wake, and the retry ladder; `app/src/lib/connectivityMonitor.ts`, **the only module in this app that imports a connectivity library**, three timers armed from pure selectors and nothing else; a `Drain` sibling in `_layout.tsx` that renders nothing and is gated on a session; **38 new Vitest assertions — 567 passing over 26 files, up from 530 over 25**; ADR-035 §2.11's new row and its revision entry; and `docs/CONVENTIONS.md`'s `R12` table grown to eleven. ⚠️⚠️ **THE LADDER IS THE 90 SECONDS MADE CHECKABLE RATHER THAN RESTATED:** attempts land at **0 s, 5 s, 20 s, 50 s and 110 s** after a reconnect — four inside the window the auth cooldown owns and one past it — and `attemptSchedule` is driven through the machine by the suite, so a ladder edited to give up early goes red rather than leaving a comment stale. ⚠️⚠️ **AND THE POLL RUNS ONLY WHILE OFFLINE, WHICH IS THE READING'S OWN ASYMMETRY**: the DROP was seen by both libraries on both platforms within 8 ms, so the listener is trusted going down; it is the way back up it missed. Cost while online: nothing. ⚠️ **The one-module constraint is not a paragraph**: `app/test/auth-errors.test.ts`'s *"exactly one caller"* block now pins five lists, and each was falsified by grafting the import onto a module that does not own it | `M` | ✅ **Ungated — `5c-ii-b-1` closed 2026-09-22 and the dependency is in the tree** |
| **5c-iii** | ✅✅ **DONE 2026-09-20 — A WRITE THAT CAN NEVER LAND NOW LEAVES THE QUEUE, AND THE SHELF FOLLOWS IT.** ~~this was the next task, as of 2026-09-20~~ — ⚠️ **struck in lower case deliberately, the rule `5b.8-i`'s row records: `plan-handover.sh` reads the raw line and a strikethrough is only a rendering.** **The writes that will never land, and the only half that changes the ledger.** **Transient** against permanent — the classification, and the whole of this task's risk sits in it: a permanent failure retried forever is a sale that never lands, and a passing one dead-lettered is a sale downgraded that would have arrived on its own. Then `record_failed_write` (`0024`, applied and unused since 2026-09-05), the `dead` state it puts the row in, and the auto-downgrade the server runs **for `sale` and `waste` only** — `purchase` and `transfer` dead-letter without one, because the stock is still on the shelf and an upgrade would double it. ⚠️⚠️ **C10.5 IS WHAT THIS HALF COSTS AND IT IS DELIBERATE: THE LEDGER CAN DIFFER FROM WHAT THE SHOPKEEPER TYPED, SILENTLY.** A downgrade reconciles quantity and carries no revenue, no tax split and no batch attribution — *"stock stays true; margin goes quiet"* (§2.6) — and nobody in the shop is told. ⚠️ **`replay_failed_write` is not built here and needs no screen**: `4.6b` shipped its manager fence and running it is ours, by hand, one row at a time. ⚠️ **It ships NO migration** ✅ **Shipped:** `app/src/api/deadletter.ts`, the eleventh `src/api/` module — an ALLOW-LIST of permanent codes with everything else retrying; a fifth flush port, `record_failed_write`, reported BEFORE the row is rejected; a `workspace_id` on the queue and the first walk of `5c-i`'s `PRAGMA user_version` path; **37 new Vitest assertions — 530 passing over 25 files, up from 493 over 24**; and **`docs/checks/5c-iii-dead-letter-contract.sh`**, nine assertion groups over real HTTP, with eleven fixtures, wired into `db.yml` on the same commit. ⚠️⚠️ **AND TWO CODES WERE MEASURED RATHER THAN REASONED ABOUT, BOTH OF WHICH A CAREFUL SESSION WOULD HAVE GOT WRONG**: `TD002` *"not enough stock"* is cleared by the very next retry, because `0017` skips enforcement on any write the flush has already marked as made without a signal; and an expired session is `PGRST301` and never reaches the function body, which is the only thing that makes `42501` safe to dead-letter. ⚠️ **The flag is deliberately NOT named here: it is `5c-ii`'s deliverable, and `split-coverage.sh` caught this row spelling it — the recorded rule, met again** | `M` | ✅ **UNBLOCKED 2026-09-20 — `5c-ii-a` shipped the send.** A write only becomes permanent after something has tried it, and now something does. ⚠️⚠️ **AND IT IS WHAT UNBLOCKS THE QUEUE ITSELF**: the drain stops at the first failure, so until this half can dead-letter a permanent one, a poison row holds every write behind it |
| **5c-iv** | ⚠️⚠️ **SIZED `M/L` AND SPLIT IN TWO 2026-09-22, ON THE DAY IT WAS TAKEN AND BEFORE A LINE OF IT WAS WRITTEN — THE PARENT ROW, AND IT IS NO LONGER TAKEABLE.** ~~this was the next task, as of 2026-09-22, and it is the last child of `5c`~~ — ⚠️ **struck in lower case deliberately, the rule `5b.8-i`'s row records: `plan-handover.sh` reads the raw line and a strikethrough is only a rendering.** ⚠️⚠️ **WHY IT SPLIT, AND IT IS NOT A SIZE ARGUMENT ALONE: THE TWO HALVES READ DIFFERENT THINGS AND SHARE NOTHING BUT A PLACE ON THE SCREEN.** One draws **the link** — the signal `5c-ii-b-2` shipped, whose `subscribe()` still has no caller. The other draws **the queue** — a count and a peso figure priced on the device out of `failed_write` payloads, behind a role fence, with no server read at all. ⚠️ **The second half is the one with arithmetic in it**, and it is the same arithmetic §2.10's nightly check runs on the server side, so getting it wrong is a number that disagrees with the ledger rather than a banner that looks odd. ⚠️ **The first half is the one a shopkeeper meets every day**; C11.9 says in the owner's own words that the dead-letter control is *"not a priority for the owner at this point."* ⚠️⚠️ **AND NEITHER HALF CAN BE MEASURED HERE, WHICH IS WHY SMALL MATTERS MORE THAN USUAL**: §2.11 keeps rendering out of scope, so the instrument for both is the owner's own phone (`R9`). **Two things he can look at separately beat one he has to take or leave.** **What a person sees, and the only half nothing in this repository can measure.** The quiet dismissible *"Sin conexión a internet"* (C10.1) — an icon, intermittent, surfacing on screen changes, never blocking and never interrupting; the fading reconnect toast (C10.2), *"Tus últimas operaciones ya se guardaron."*, which fades on its own and **does not say how many**; and the least-invasive dead-letter banner (C11.9), **a banner and not a screen**, reading this device's own queue and making no server read. ⚠️⚠️ **IT SHOWS A COUNT AND A PESO FIGURE, NEVER A LIST, NEVER AN `error_code`** — the peso figure priced on the device by `@tienda/money`, the same arithmetic §2.10's nightly check uses on the server side. ⚠️⚠️ **AND THE BANNER IS MANAGER-AND-ABOVE, decided in the sizing rather than asked**: §2.7 fences unrecorded revenue there, *"cost is manager-and-above; quantity is everyone"* was settled in 1.3a, and C10.5 refuses to show a rejected write to the person at the counter at all. ⚠️ **§2.11 keeps rendering, navigation and layout out of scope, so no suite here can see any of this** — this row and the owner's own phone (`R9`) are the whole instrument, which is why it is last and alone rather than riding along with code that can be measured. ⚠️ **It ships NO migration** | `M/L` | ✅✅ **UNGATED AS OF 2026-09-22 — BOTH THINGS IT DRAWS NOW EXIST.** ~~blocked on the dead-letter half — the banner counts rows only that child can create~~ — ⚠️ **struck in lower case deliberately, the rule `5b.8-i`'s row records.** `5c-iii` shipped the `dead` rows the banner counts on 2026-09-20, and `5c-ii-b-2` shipped the signal the notice and the toast are drawn from on 2026-09-22. ⚠️⚠️ **IT READS THE SIGNAL AND NEVER THE LIBRARY** — `subscribe()` in `@/lib/connectivityMonitor` is the whole of its connectivity import, and a second `expo-network` import turns `app/test/auth-errors.test.ts` red |
| **5c-iv-a** | ✅✅ **DONE 2026-09-22 — THE APP ADMITS IT QUIETLY, AND `subscribe()` HAS A CALLER.** ~~this was the next task, as of 2026-09-22~~ — ⚠️ **struck in lower case deliberately, the rule `5b.8-i`'s row records.** **The link, drawn — and the first caller `subscribe()` has ever had.** The quiet dismissible *"Sin conexión a internet"* (C10.1): **an icon, intermittent, surfacing on screen changes, never blocking and never interrupting**, and easily dismissed. Then the fading reconnect toast (**C10.2**), *"Tus últimas operaciones ya se guardaron."*, which fades on its own, needs no acknowledgement and ⚠️ **does not say how many** — a count here is the app talking about its own plumbing, which is the whole of what C10.3 refuses on the slide. ⚠️⚠️ **IT READS THE SIGNAL, NEVER THE LIBRARY.** `@/lib/connectivityMonitor`'s `subscribe()` is its entire connectivity import; a second `expo-network` import turns `app/test/auth-errors.test.ts` red, which is the only instrument either half of this constraint has. ⚠️⚠️ **AND THE MOTION RULE IS NOT TASTE HERE, IT IS §2.11: `transform` AND `opacity` ONLY.** C1.1 puts **two low-end Androids** among the pilot's four phones, and those two properties are the ones that run on the compositor — animating layout, colour, shadow or blur does not. A toast that fades by animating a background colour is the rule broken in the one place nobody would look. ⚠️ **The dismissal is a rule, not a preference**: C10.1 says the notice surfaces **on screen changes**, so a dismissal lasts until the next screen rather than for the session — dismissing it forever is how a shop stops being told it is offline on the day that matters. ⚠️ **Nothing here can be measured by any check in this repository** — §2.11 keeps rendering, navigation and layout out of scope — so what a suite CAN hold is the pure decision *"given the signal and where we are, what should be on screen?"*, and that is where every rule above is written down. **The rest is `R9`: it goes to the owner's phone.** ⚠️ **It ships NO migration** ✅ **Shipped:** `app/src/offline/notice.ts`, a pure `(state, event, now)` machine holding every rule; `app/src/offline/OfflineSurfaces.tsx`, the first non-route component in this app that is not scaffolding — a `View`, a `Text` and an `opacity`, with no judgement in it; the `Stack` wrapped in `_layout.tsx` so the two surfaces overlay every screen without any screen knowing; two strings; and **15 new assertions — 582 passing over 27 files, up from 567 over 26**. ⚠️⚠️ **THE RULE MOST LIKELY TO HAVE GONE IN WRONG AND SILENTLY IS THE DISMISSAL, AND IT IS NOW FOUR ASSERTIONS**: a dismissal is keyed to the SCREEN it was made on, dies with it, is not re-armed by a re-render on that same screen, and **is not carried into the next outage**. A session-long dismissal is kinder for ten seconds and wrong for the rest of the day. ⚠️⚠️ **AND THE TOAST NEVER FIRES AT LAUNCH**, which is the whole of why `UNKNOWN` is a third state: `null → true` is the first reading of a session, not a reconnect a person lived through, and toasting there tells somebody her operations are saved when she never saw them at risk. **An outage arriving mid-toast cancels it**, because by then it is lying. ⚠️ **The notice carries NO state colour, decided rather than defaulted**: `atencion` is fenced by §2.11 to C3.17 alone and `error` is what destroys — being offline is the pilot shop's ordinary condition, and a warning colour on a condition that holds half the day teaches a shopkeeper to stop seeing warning colours. ⚠️ **It also tightened a guard `5c-ii-b-2` shipped this morning**: *one driver of the connectivity machine* now reads **value imports only**, because a type-only import is erased and cannot step anything — falsified three ways | `S/M` | ✅ **Ungated — `5c-ii-b-2` shipped the signal on 2026-09-22** |
| **5c-iv-b** | ✅✅ **DONE 2026-09-22 — THE QUEUE HAS A PRICE, AND `5c` IS CLOSED.** ~~this was the next task, as of 2026-09-22, and it is the last child of `5c`~~ — ⚠️ **struck in lower case deliberately, the rule `5b.8-i`'s row records.** **The queue, counted — and the only number in this app priced on the device that the server also prices.** The least-invasive dead-letter banner (**C11.9**), **a banner and not a screen**, reading **this device's own outbox** and ⚠️⚠️ **MAKING NO SERVER READ** — `failed_write.id` IS the client uuid (`0024` decision 7), so the phone that failed already holds everything the banner needs. ⚠️⚠️ **IT SHOWS A COUNT AND A PESO FIGURE, NEVER A LIST, NEVER AN `error_code`** — the ruling of 2026-09-14, and C10.5 and §2.8 both: a list is the vendor's pile handed to the merchant. ⚠️ **The peso figure is priced on the device by `@tienda/money`, the same arithmetic §2.10's nightly check uses on the server side**, which is why this half is the one with a real suite behind it: a number that disagrees with the ledger is worse than a banner that looks odd. ⚠️⚠️ **AND THE BANNER IS MANAGER-AND-ABOVE, decided in `5c`'s sizing rather than asked**: §2.7 fences unrecorded revenue there, *"cost is manager-and-above; quantity is everyone"* was settled in 1.3a, and C10.5 refuses to show a rejected write to the person at the counter at all. `useMyRole()` already exists and is the fence. ⚠️ **`replay_failed_write` is not built here and needs no screen**: `4.6b` shipped its manager fence and running it is ours, by hand, one row at a time. ⚠️ **It ships NO migration** ✅ **Shipped:** `app/src/offline/deadLetters.ts`, a pure module holding which rows count, what a document is worth and who may be told; `app/src/offline/DeadLetterBanner.tsx`, a `View`, a `Text` and no judgement, mounted at the TOP of the root layout because `OfflineSurfaces` owns the bottom; three strings; **29 new assertions — 611 passing over 28 files, up from 582 over 27** — and a **sixth pinned list** in `app/test/auth-errors.test.ts`: the outbox has exactly two readers, the flusher and this banner. ⚠⚠ **THE PESO FIGURE CAN BE WITHHELD AND THE COUNT NEVER CAN, WHICH IS THE ONE DECISION HERE THAT WOULD HAVE GONE IN WRONG SILENTLY:** a sum that quietly omits a line it could not read is a smaller number indistinguishable from a correct one, so `QueueValue.complete` withholds the figure instead and the count — which is never lossy — stands alone. ⚠️ **`## Position` WAS CUT A THIRD TIME IN THIS SESSION — 1,423 lines against its 1,400 ceiling — and the whole 2026-09-20 working day moved to `docs/plan/archive/status-log-2026-09-20.md`, one day per file as before.** ⚠️ **The unit factors are an ARGUMENT rather than a copy of `0001`'s ten rows**, and the obligation to pass them is written into `5f`'s row, which must hold them anyway to price a basket offline. **Eight hand-run falsification fixtures** — seven over the machine, one over the pinned list — are what distinguish the green from a suite that stopped looking | `M` | ✅ **Ungated — `5c-iii` shipped the `dead` rows it counts on 2026-09-20.** ⚠️ Independent of `5c-iv-a`: it reads the queue, not the link |
| **5c.5** | ✅✅ **DONE 2026-09-20 — READ, AND THE ANSWER IS YES: THE SESSION SURVIVES. ⚠️ THE WORRY THAT CREATED THIS ROW WAS WRONG, AND THE REASON IS NOT THE ONE IT NAMED.** ~~this was the next task, as of 2026-09-20, reordered ahead of `5c` by the owner~~ — ⚠️ **struck in lower case deliberately, the rule `5b.8-i`'s row records.** ⚠️⚠️ **THE REFRESH-UNDER-LOSS READING — PROMOTED FROM PROSE 2026-09-13.** Does a session survive a refresh whose REPLY is lost? Drop the connection after the request and before the response, let the client retry, and see whether the person is still signed in. | `S` | ✅✅ **CLOSED — the `S` was right**, one sitting, and what it produced is an answer plus a standing guard rather than a screen. ⚠️ **Ungated, and it needs NO calendar** — unlike `5a-iv-d`. ⚠️⚠️ **This is where C1.4's real risk moved on 2026-09-13**: the project time-boxes nothing and has no inactivity timeout, but **reuse detection is ON with a 10s interval**, so a replayed refresh token revokes the whole session family. `auth-js` single-flights refreshes, so the in-app race is handled; **a lost response is not**. ⚠️ **The pilot store is offline a lot** — see `5c`'s own reason for existing |
| **5d** | ⚠️⚠️ **SIZED `L` AND SPLIT IN FOUR 2026-09-22, ON THE DAY IT WAS TAKEN AND BEFORE A LINE OF IT WAS WRITTEN — THE PARENT ROW, AND IT IS NO LONGER TAKEABLE.** ~~this was the next task, as of 2026-09-22, and it is the first screen of the shop itself~~ — ⚠️ **struck in lower case deliberately, the rule `5b.8-i`'s row records: `plan-handover.sh` reads the raw line and a strikethrough is only a rendering.** ⚠️⚠️ **WHY IT SPLIT, AND SIZE IS THE SMALLER HALF OF THE ARGUMENT: THE ROW DESCRIBED A SCREEN THAT NO LONGER EXISTS AND OMITTED ONE IT OWNS.** *Family grid, initials tiles, family sheet* was written before 2026-09-15, when the owner made Productos **VARIANT-FIRST** — the grid of family tiles is gone — and Inicio, which two records outside this row hand to `5d`, was never named in it at all. **Nineteen deliverables, all of which land in exactly one child below:** the **CATALOG READ** itself — `product_variant`, `product_family`, `price_list` and `unit`, four applied tables **no line in `app/` reads today**; the peso figure converted out of **`price_per_base`** into the variant's price unit; **C3.10**, a price never shown without its unit; **C3.12**, a missing price as a dash and never `$0.00`; the **INITIALS, COMPUTED** from a name; the search key that folds the way `normalize_name` does; **`docs/checks/5d-i-catalog-contract.sh`**, the only instrument any of this gets; **C8.13** as amended — the flat list of every variant — with its **search box** and its **initials tile**; the way in, which is a row on Inicio because **C12.1** caps the tab bar at four; the family opened with the tapped variant preselected and **no legend**, its variants **at sight** with their prices, and **`Agregar Variante`** / `Costos` / `Editar` inert until `5e`; and Inicio itself — today's takings and count **above anything tappable**, the **48-hour** expiry block, Vender/Comprar/Desperdicio **as cards**, the rows to Productos and **Proveedores**, and **the bell** and Ajustes placed at last. ⚠️⚠️ **AND IT IS THE FIRST TASK IN THIS PROJECT WHOSE SUBJECT IS A SCREEN AND NOTHING ELSE**: §2.11 keeps rendering, navigation and layout out of scope, so **no check in this repository can look at whether it is right** and the instrument is the owner's phone (`R9`). That was an argument for a SMALLER first piece, and it is why the first child ships **no screen at all** — the half a machine can still hold. ⚠️ **`5h.5` owns the `src/ui/` conventions and comes later**, so a primitive invented here is the thing the owner refused on 2026-09-13, arriving early | `L` — **split, two `M`s, an `S/M` and an `M`** | ✅ **UNGATED when it was taken.** ⚠️ **One of the four children is not: `5d-iv` is blocked on the ADR §2.8 amendment parked in the decisions block on 2026-09-22** |
| **5d-i** | ✅✅ **DONE 2026-09-22 — THE APP CAN READ WHAT THE SHOP SELLS, AND TWELVE ASSERTION GROUPS OVER REAL HTTP SAY THE DATABASE AGREES.** ~~this was the next task, as of 2026-09-22, and it is the half of `5d` a check can look at~~ — ⚠️ **struck in lower case deliberately, the rule `5b.8-i`'s row records.** **The CATALOG READ, as a contract with Postgres, and nothing on screen.** `product_variant`, `product_family`, `price_list` and `unit` — four applied tables that **no line in `app/` reads today** — behind `src/api/catalog.ts` and one hook (`R12`, `R13`). Everything it decides is pure and is read by `app/test/api-catalog.test.ts`: the four **named** column lists, never `select('*')`, which on `price_list` would ship a shop's whole price history to a phone; **which price is today's**, out of a dated range table whose `valid_period` is a generated `daterange` and whose `location_id` is null for the workspace default (C1.5: one location per pilot shop, so the two scopes are a preference and not a picker); the peso figure itself, converted out of **`price_per_base`** — a `numeric(14,6)` per BASE unit — into the variant's `price_unit_code` and into integer centavos through `@tienda/money` (`R5`); **C3.10**, *a price is never shown without its unit* — `$35.00 / kg`, `$9.00 / 250 gr`; **C3.12**, a variant with no price row rendering as a DASH and never as `$0.00`, which is `0008`'s own instruction and the opposite of what the Power Apps screen did; the **INITIALS, COMPUTED** from a variant's name, for the un-pictured product that must still look finished; and the search key, which has to fold exactly the way `0002`'s **`normalize_name`** does, or the list disagrees with the uniqueness rule the database itself enforces. ⚠️⚠️ **NO SCREEN, NO COMPONENT AND NO PRIMITIVE** — `5h.5` owns `src/ui/`, and a primitive invented here is what the owner refused on 2026-09-13, arriving early. ⚠️ **The instrument is `docs/checks/5d-i-catalog-contract.sh` and its falsifier: a real HTTP round trip against a reset database**, because no typecheck has ever read `0002`, and PostgREST answers a wrong column name with a 400 that the bundler, the suite and the typecheck all pass straight over. ⚠️ **It ships no migration.** | `M` | ✅ **UNGATED.** Nothing is owed that touches it: the one decision parked on 2026-09-22 is about Inicio, and it names the child it blocks |
| **5d-ii** | ✅✅ **DONE 2026-09-22 — THE SHOP CAN SEE WHAT IT SELLS, AND NOTHING IN THIS REPOSITORY CAN SAY WHETHER IT LOOKS RIGHT.** ~~this was the next task, as of 2026-09-22, and it is the first screen of the shop itself~~ — ⚠️ **struck in lower case deliberately, the rule `5b.8-i`'s row records.** **Productos, the flat list.** ⚠️⚠️ **C8.13 AS THE OWNER AMENDED IT ON 2026-09-15 — PRODUCTOS IS VARIANT-FIRST.** *"The list of products displayed in Productos should be all the product variants"* — **the grid of family tiles the old `5d` row promised is gone**, and this row is where that is recorded, because the constraint's own bullet was annotated rather than rewritten. One row per variant: the name, its family under it, the price sentence `5d-i` computes beside it, and a **search box** above the list — the shape C3.1 already fixed for the transaction screens, which is why this app is flat everywhere on purpose. Plus the **initials tile** an un-pictured product carries, with no *pending photo* state anywhere near it: a merchant-created product is finished and transactable, and the picture is our maintenance chore, not his (C8.14). ⚠️ **The way in is a ROW ON INICIO rather than a fifth tab** — **C12.1** caps the bar at four, and five icon-plus-word tabs across 390 px is where that was measured. ⚠️ **Its door is temporary and must say so in the file**: it goes beside the two rows `index.tsx` already draws, and `5d-iv` places it properly — the arrangement `5a-ii`'s two placeholder blocks used, comment included, before `5b-ii-a` deleted them. ⚠️ **No check in this repository can see any of this** (`R9`, §2.11): the instrument is the owner's phone. ⚠️ **It ships no migration.** | `M` | ✅ **UNGATED — `5d-i` shipped the read it draws on 2026-09-22.** ⚠️ The one decision parked that day is about Inicio and blocks a different child |
| **5d-iii** | ✅✅ **DONE 2026-09-22 — THE FAMILY OPENS, THE MARK CARRIES NO WORD, AND THE THREE BUTTONS ARE PLAINLY DEAD.** ~~this was the next task, as of 2026-09-22~~ — ⚠️ **struck in lower case deliberately, the rule `5b.8-i`'s row records.** **La Familia — the one surface in this app where the family/variant structure is visible at all.** It is **reached by tapping a variant**, and it opens with that variant preselected and **no legend** on it — ruling 4 of área 13, in the owner's words, and the half of the catalog constraint that survived the 2026-09-15 amendment untouched. The family's variants are **at sight**, each with its price, and three affordances sit with them: **`Agregar Variante`**, `Costos` and `Editar`. ⚠️⚠️ **ALL THREE ARE INERT HERE, AND THAT IS WHAT `5d` BEING *read* MEANS.** Every one of them writes; `product_variant_insert` and `product_family_insert` are both `has_role(…, 'manager')` (`0002`), and `5e` is the row that builds them. A control that looks live and refuses silently is worse than one that is plainly not built yet. ⚠️ **No check here can look at it** (`R9`, §2.11): the instrument is the owner's phone. ⚠️ **It ships no migration.** ⚠️⚠️ **WHAT IT SHIPPED AND WHERE THE RULING LANDED:** `app/src/app/familia/[id].tsx` — the family in the PATH and the tapped variant as a QUERY PARAMETER, which is what each one is; `familyView`, `familyTitle` and `familyLineKey` in `@/api/catalog`, where **twelve new assertions** read them; `ES.family`'s nine words; and Productos' rows becoming `Pressable` at last, with the two letters on each row moving from `fondo` to **`accionSuave`** — the affordance carried in HUE, which is what direction B was chosen for, rather than a chevron the icon-needs-a-word rule forbids outright. ⚠️ **The mark on the preselected variant is a green left rule and a heavier name and NO WORD**: ruling 4 forbids the legend, and área 13's surviving rule from direction C forbids colour alone, so it is colour AND a border — with `accessibilityState.selected` as the one telling that is not a legend. ⚠️⚠️ **AND IT MARKS NOTHING RATHER THAN FALLING BACK TO THE FIRST ROW** when the id does not belong to the family: with no legend on the screen, a wrong mark is a claim a shopkeeper cannot check. | `S/M` | ✅ **CLOSED 2026-09-22.** Shipped as sized: one route, three pure functions, twelve assertions, no migration, no `src/ui/` |
| **5d-iv** | ⚠️⚠️ **SIZED `M/L` AND SPLIT IN TWO 2026-09-22, ON THE DAY IT WAS TAKEN AND BEFORE A LINE OF IT WAS WRITTEN — THE PARENT ROW, AND IT IS NO LONGER TAKEABLE.** ~~this was the next task, as of 2026-09-22, and it is the last child of `5d`~~ — ⚠️ **struck in lower case deliberately, the rule `5b.8-i`'s row records: `plan-handover.sh` reads the raw line and a strikethrough is only a rendering.** ⚠️⚠️ **WHY IT SPLIT, AND THE ROW ASKED FOR IT IN ITS OWN WORDS BEFORE ANY SESSION DID: *“SIZE IT AGAIN WHEN IT IS TAKEN — the takings and the count are a read NOTHING IN THIS APP PERFORMS.”*** **Sized again on 2026-09-22 and the answer is `M/L`, because that sentence turned out to be an understatement: it is not one read, it is a read plus the arithmetic that decides WHICH ROWS ARE TODAY'S, and that arithmetic has a right answer the database already commits to.** ⚠️⚠️ **AND THE SEAM IS `5d`'S OWN, APPLIED ONE LEVEL DOWN: THE HALF A MACHINE CAN HOLD, AND THE HALF ONLY AN EYE CAN.** `5d` split in four on exactly this argument — *“`5d-i` is the half a machine can hold and the other three are the half only the owner's eye can”* — and this row, alone among the four, still carries BOTH. **`5d-iv-a` is the second `5d-i`**: a module, a contract check over real HTTP, and no screen at all. **`5d-iv-b` is Inicio**, whose whole instrument is a phone (`R9`, §2.11). **THE INVENTORY, so that neither child can quietly drop a piece of it:** — **THE TAKINGS READ** itself, four applied columns no line in `app/` reads today; the **trading day**, which `0012` made a property of the LOCATION and not of the device holding the phone; gross of IVA, which is `total_net` and `total_tax` ADDED and never one column read; what a `reversal_of` row does to the figure and to the count; **`docs/checks/5d-iv-a-takings-contract.sh`**, the only instrument this half gets — then **STATE COMES FIRST**, the takings and the count **above anything tappable**, which is the half of §2.8's Home row the 2026-09-17 amendment deliberately kept; **room at the top for the dead-letter banner**, ruled Home-only on 2026-09-22 and a layout constraint this split inherits rather than builds; the **48-hour** expiry block, **WITHDRAWN and not deferred**; Vender, Comprar and Desperdicio **as cards**; the rows to Productos and **Proveedores**; **the bell** and Ajustes placed at last; and the three **TEMPORARY BLOCKS** on that screen, deleted by the task their own comments name. ⚠️ **It ships no migration**, and every column both children read has been applied since `0003`. | `M/L` — **split, an `M` and an `M`** | ✅✅ **UNGATED AS OF 2026-09-22 — BOTH HALVES OF THE §2.8 QUESTION WERE RULED THE SAME DAY.** The expiry block is withdrawn, and Home carries the dead-letter banner and is the only screen that does (`onHome`, shipped with the ruling). ⚠️ It wants `5d-ii` built first, since the row it places points at Productos |
| **5d-iv-a** | ✅✅ **DONE 2026-09-22 — THE APP CAN ASK WHAT THE SHOP TOOK TODAY, AND ELEVEN ASSERTION GROUPS OVER REAL HTTP SAY THE DATABASE AGREES.** ~~this was the next task, as of 2026-09-22~~ — ⚠️ **struck in lower case deliberately, the rule `5b.8-i`'s row records: `plan-handover.sh` reads the raw line and a strikethrough is only a rendering.** **THE TAKINGS READ — AND IT SHIPS NO SCREEN AND NO COMPONENT, WHICH IS THE WHOLE REASON IT IS A ROW OF ITS OWN.** §2.8's Inicio opens with a peso figure and a number of sales, and **nothing in this app has ever asked a database for either.** This child is that question, asked properly, and stops before anything is drawn. ⚠️⚠️ **THE ONE THING IT WOULD GET WRONG SILENTLY IS *WHEN IS TODAY*, AND `0012` ALREADY ANSWERED IT: A **trading day** IS LOCAL, AND THE SHOP IS WHAT MAKES IT LOCAL.** The timezone is a column on `location`, put there on 2026-08-20 rather than left as a constant, and the server's own `product_margin_daily` buckets on `(s.occurred_at at time zone l.timezone)::date`. **A phone that asks its own clock what day it is agrees with that view in Guadalajara and disagrees with it in Hermosillo** — and ⚠️ **`0012`'s own header records that NOTHING ARITHMETIC COULD SEE THE DRIFT** the last time these two bucketings diverged: every reconciliation stayed green and only a literal-comparison guard caught it. **So the device reads the column.** ⚠️ **`occurred_at` AND NEVER `recorded_at`**: the pilot store is offline half the day (`5c`'s reason for existing), so a sale rung up at 17:00 and synced at 21:00 belongs to 17:00 — and `0003` says `occurred_at` is the client's value clamped to a 72-hour window for exactly this. ⚠️ **GROSS OF IVA, WHICH IS TWO COLUMNS ADDED AND NOT ONE COLUMN READ** — `total_net` plus `total_tax`, the ruling of 2026-09-14 (*“gross, net beside it”*), on the ground that `prices_include_tax` defaults true so gross is what reconciles against the cash in the till. **And no role fence**: the same day ruled *“a cashier keeps seeing quantity and revenue”*, and `sale_select` (`0003`) is member-level at your own locations already. ⚠️⚠️ **AND A VOID IS TWO ROWS, NOT A DELETED ONE.** `0021` writes a second `sale` with negated totals and `reversal_of` set — so the PESO FIGURE self-corrects by summing and **the COUNT does not**, and a screen that says *2 ventas* after one sale was rung up and undone is the app doing bookkeeping at a shopkeeper. **Decided here, named in the row, and reversible for nothing because it is client arithmetic.** ⚠️ **`docs/checks/5d-iv-a-takings-contract.sh`, over a real HTTP round trip**, wired into `db.yml` on the same commit — the shape `5d-i` established and the only instrument this half gets: no typecheck has ever read `0003`, and PostgREST answers a wrong column name with a 400 the bundler, the suite and the typecheck all pass straight over. **It has to MAKE the sales it counts** (`record_sale`, `0016`), because `5f` is unbuilt and no shop has one. ⚠️ **NO SCREEN AND NO COMPONENT and no `src/ui/` primitive** — `5h.5` owns that and comes later. ⚠️ **It ships no migration.** ✅ **Shipped:** `app/src/api/today.ts`, the twelfth `src/api/` module — a column list, a day boundary and one pure function, and nothing that talks; `todaySales` in `calls.ts` and `useToday` in `hooks.ts`; **33 new Vitest assertions — 729 passing over 30 files, up from 696 over 29**; and **`docs/checks/5d-iv-a-takings-contract.sh`**, eleven assertion groups over real HTTP with its own eleven fixtures, wired into `db.yml` on the same commit. ⚠️⚠️ **THE DESIGN THE SIZING ASKED FOR TURNED OUT TO BE FORBIDDEN, AND BY THIS REPOSITORY'S OWN RULES RATHER THAN BY TASTE — WHICH IS THE FINDING.** Converting `location.timezone` into an instant needs `Intl.DateTimeFormat`; `R5` allows NO `Intl.` outside `src/format/mxn.ts` and `R10` is an allow-list of `format` and `resolvedOptions`, with `DateTimeFormat` recorded as *"a function on Android and unasked on iOS"* — **the exact state `formatToParts` was in on 2026-09-13 when it terminated this app on the splash screen of the owner's own iPhone.** So the device's own midnight is used, which is the call `catalog.ts`'s `isoDay` had already made four hours earlier for the price window, on the same ground: **the phone is in the shop.** **The cost is written into the module's header rather than discovered** — a phone outside its shop's zone buckets differently from `product_velocity_daily`, which is zero shops today and a MEASUREMENT before a code change the day it is not. ⚠️⚠️ **AND THE BOUNDARY FIXTURE WAS FOUND TO BE MACHINE-DEPENDENT AND FIXED, WHICH NEARLY WENT THE OTHER WAY.** `F1` — the UTC-shaped day — went red on the owner's Mac at UTC−6 and would have been **green on a UTC runner**, because there local midnight and UTC midnight are the same instant. `process.env.TZ` was measured to be re-read by node per `Date`, so the block now pins `America/Mexico_City` — `0012`'s own default — and asserts the zone took before asserting anything in it. **A boundary suite that only falsifies on one of the two machines that matter is the shape `5a-split-coverage.sh` recorded about `mapfile`.** ⚠️ **Nine hand-run fixtures over the module and eleven over the check** are what distinguish the green from a suite that stopped looking | `M` | ✅ **Ungated — every column it reads has been applied since `0003`, and `0012` added the one that decides the day on 2026-08-20.** ⚠️ **It is the falsifiable half of `5d-iv` and is deliberately NOT deferred behind `5f`**: the rule of 2026-09-22 defers a row whose only instrument is the owner's eye, and this one's instrument is a contract check |
| **5d-iv-b** | ✅✅✅ **DONE 2026-09-22 — INICIO IS THE SCREEN §2.8 DESCRIBES, THE FIXTURE IS OFF THE OWNER'S PHONE, AND `5d` IS CLOSED.** ~~this was the next task, as of 2026-09-22~~ — ⚠️ **struck in lower case deliberately, the rule `5b.8-i`'s row records: `plan-handover.sh` reads the raw line and a strikethrough is only a rendering.** ⚠️⚠️ **WHAT IT SHIPPED THAT A MACHINE CAN SEE IS THE ORDER, AS A TABLE.** `app/src/navigation/inicio.ts` holds the four bands and the five doors as DATA and `app/test/inicio.test.ts` reads them, because §2.11 refuses suites over layout and *state comes first* written as a sequence of JSX children ships green the day somebody moves the cards above the figure — `tabs.ts`'s trade, made a second time for C12.1's own reason. ⚠️⚠️ **AND THE BANNER'S GEOMETRY MOVED INTO `@/offline/deadLetters`** (`bannerTop`, `bannerMinHeight`, `bannerRoom`): it is absolutely positioned over THIS screen alone since *“let's keep it Home Only”*, and two copies of *how tall is the banner* would have gone stale by hiding the takings figure. The room is reserved unconditionally and the screen SCROLLS, which is what makes the room a floor rather than a promise. ⚠️ **Four decisions on the owner's behalf are named in the entry above and in the PR body**, and the loudest is that **Proveedores is drawn and drawn dead** — `route: null`, disabled, with `ES.home.notYet` under it — rather than given a placeholder route, because `5d` is the step that DELETES scaffolding. `6b` deletes the sentence. **INICIO, THE REAL ONE — AND IT IS IN THIS SPLIT BECAUSE TWO RECORDS OUTSIDE THE `5d` ROW ALREADY PUT IT HERE**: the header of `app/src/app/(tabs)/index.tsx`, which names this task twice, and área 13's decision table (*“Reversed by `5d`, which has to place it properly anyway”*). §2.8's Home row as amended 2026-09-17: **STATE COMES FIRST** — today's takings and today's count **above anything tappable**, the half of the original sentence the amendment deliberately kept — then Vender, Comprar and Desperdicio **as cards**, then the rows to Productos and **Proveedores**, and **the bell** and Ajustes placed at last rather than floating in the middle of a placeholder. ⚠️⚠️ **AND IT IS THE ONE SCREEN THAT CARRIES THE DEAD-LETTER BANNER** — ruled 2026-09-22, *“let's keep it Home Only”* — which is a layout constraint this row inherits rather than a thing it builds: the banner is mounted at the root and `onHome` decides, so what this row owes is **room at the top** for it, above anything tappable and not underneath the takings. ⚠️⚠️ **THE 48-hour EXPIRY BLOCK §2.8 ASKS FOR IS WITHDRAWN, NOT DEFERRED — RULED 2026-09-22: *“Let's drop it for the pilot then.”*** It had a data path and the pilot fills none of it (`0018`'s tier 2 needs `track_expiry`, which C8.9's four-field create never turns on), and `7e` was already rewritten to DERIVE the same answer. **A deliverable whose premise is false is withdrawn** — the shape ADR-035 §3 used when C1.5 killed the shared till. ⚠️ **This row draws no expiry panel, and an always-empty one is the thing the ruling refused.** ⚠️ **IT DELETES THE THREE TEMPORARY BLOCKS ON THAT SCREEN, AND ALL THREE SAY SO IN THEIR OWN COMMENTS** — the Productos door `5d-ii` put there a task early, the bell `5b-iii-d-1` left in the body, and the Ajustes button sitting alone in the centre. ⚠️ **And the placeholder figure goes with them**: `placeholderGrossCentavos()` renders **$11.60 out of `cases.json`** on the owner's phone today, which is a test fixture presented to a shopkeeper as her takings. ⚠️⚠️ **NO CHECK HERE CAN LOOK AT IT** (`R9`, §2.11) — **the owner's phone is the whole instrument**, and the questions it is asked go in this row before it ships. ⚠️⚠️ **AND ONE OF THEM CANNOT BE ANSWERED YET AND IS ROUTED RATHER THAN ASKED BLIND:** `5f` is unbuilt, nothing in this app writes a sale, so the figure at the top reads **$0.00 and 0 ventas** on every phone until Vender ships. *Does a zero at the top of Inicio read as a quiet morning or as a broken app?* is a `5f` question, and asking it now would be the `5c-iv-b` mistake the ruling of 2026-09-22 named. ⚠️ **It ships no migration.** | `M` | ✅ **Ungated, and it wants `5d-iv-a` first** — the read it puts at the top is that child's whole deliverable, and a screen written against a read that does not exist yet is a screen written against a guess. ⚠️ **It stays TAKEABLE rather than deferred behind `5f`, and that was decided rather than assumed**: the 2026-09-22 rule needs BOTH tests yes, and only one is — the cards, the rows, the placement and the banner's room are all reachable on his phone today, and the figure's own look-question is routed to `5f` above |
| **5e** | ⚠️⚠️ **SIZED `M/L` AND SPLIT IN THREE 2026-09-22, ON THE DAY IT WAS TAKEN AND BEFORE A LINE OF IT WAS WRITTEN — THE PARENT ROW, AND IT IS NO LONGER TAKEABLE.** ~~this was the next task, as of 2026-09-22, and it is the first task in step 5 that writes to the catalog~~ — ⚠️ **struck in lower case deliberately, the rule `5b.8-i`'s row records: `plan-handover.sh` reads the raw line and a strikethrough is only a rendering.** **Productos, write.** ⚠️⚠️ **WHY IT SPLIT, AND THE SEAM IS `5d`'s OWN ONE STEP ON: the first child ships NO SCREEN, AND IT IS THE ONLY CHILD ANY INSTRUMENT IN THIS REPOSITORY CAN LOOK AT.** §2.11 keeps rendering out of scope, so the two forms are judged on the owner's phone (`R9`) and nothing here will ever say they are wrong — but the WRITE is a contract with Postgres, and the fence on it is a policy a real database either applies or does not. ⚠️ **The fence is not a detail**: `product_variant_insert` and `product_family_insert` are both `has_role(…, 'manager')` in `0002`, and a cashier shown a control she will be refused silently is the shape [[shift-cover-is-a-reassignment]] records. **Sixteen deliverables, each landing in exactly one child below:** the four-field create turned into **three rows** a database will accept; **C8.10** — one unit written into all four unit columns, because `product_variant` demands four `not null` codes and a shopkeeper is asked one question; the typed peso figure written back as **`price_per_base`**, the inverse of the arithmetic `5d-i` shipped; the family **SUGGESTED FROM THE TYPED NAME**, folded the way `normalize_name` folds; the ORDER of the three writes and what a **partial failure** leaves, because PostgREST has no transaction to offer; the two refusals a shopkeeper can actually hit — **`23505`** on a name the shop already uses, `42501` on the fence — as sentences rather than codes; **`docs/checks/5e-i-catalog-write-contract.sh`**, the only instrument the fence ever gets; **C8.9**'s four fields and nothing else; the suggestion overridable by a **gesture**, and a family created in place; the three entry points **C8.12** names; the fence DRAWN, so a cashier is **never shown the control**; **`Editar`** and everything the four-field form pushed behind it; the price change and the **dated window** it has to respect; **`tax_rate`** and `pack_size`, set once and never guessed; deactivation by **`is_active`** rather than deletion, because neither catalog table has a delete policy; and what becomes of **`Costos`**, the third button `5d-iii` shipped dead. ⚠️⚠️ **TWO OF THE SIXTEEN WERE NOT IN THIS ROW WHEN IT WAS TAKEN, AND FINDING THEM IS MOST OF WHAT THE SIZING WAS WORTH.** `Costos` is `5e`'s by `5d-iii`'s row and by nothing here — the same shape as `5d`'s Inicio, a deliverable held only by a row this row does not read. And `Editar` was one word: its real subject is `tax_rate`, `pack_size` and deactivation, none of which this row listed, and one of which C8.8 forbids outright. | `M/L` — **split, three `M`s** | ✅ **UNGATED when it was taken, and ALL THREE CHILDREN ARE UNGATED AS OF 2026-09-22.** ~~one of the three is not: `5e-iii` is blocked on the `Costos` decision parked in the decisions block~~ — **ruled the same evening**, *"leave Costos dead until `5g`"* |
| **5e-i** | ✅✅ **DONE 2026-09-22.** ~~this was the next task, as of 2026-09-22~~ — ⚠️ **struck in lower case deliberately, the rule `5b.8-i`'s row records: `plan-handover.sh` reads the raw line and a strikethrough is only a rendering.** **The catalog write, as a contract with Postgres — and the only child of `5e` an instrument in this repository can look at.** ⚠️ **NO SCREEN, NO COMPONENT AND NO PRIMITIVE**: `5h.5` owns `src/ui/` and comes after the screens that would justify a primitive, and everything here has a right answer a node suite can read. It turns the four-field create into **three rows** — a family when one is being made, the variant, the price — with **C8.10** fanning the one chosen unit into all four `not null` unit columns, and the typed peso figure written back as **`price_per_base`**, the exact inverse of the arithmetic `5d-i` shipped. The family is **SUGGESTED FROM THE TYPED NAME** here, folded through the same `searchKey` that already copies `normalize_name`, so the app never proposes a family the database will then refuse. ⚠️⚠️ **THE ORDER OF THE THREE WRITES IS A DELIVERABLE AND NOT AN IMPLEMENTATION DETAIL, BECAUSE POSTGREST HAS NO TRANSACTION TO OFFER.** Family, then variant, then price: a **partial failure** then leaves a family nobody can see — Productos is variant-first since 2026-09-15 — or a variant wearing C3.12's dash, and never a price pointing at a variant that does not exist. ⚠️ **The two refusals a shopkeeper can actually reach become sentences rather than codes:** **`23505`** on `product_variant_name_unique`, which is `(workspace_id, normalized_name)` and therefore SHOP-WIDE rather than per family — so `Pierna` under Pollo refuses `Pierna` under Cerdo, and `normalize_name` folds case and spaces but NOT accents — and `42501` on the fence. `searchKey`'s own doc-comment in `@/api/catalog` already names this task as the one that inherits that confusion. ⚠️⚠️ **`docs/checks/5e-i-catalog-write-contract.sh` IS THE ONLY INSTRUMENT THE FENCE EVER GETS, AND ITS CENTRAL ASSERTION IS THAT A CASHIER IS REFUSED.** No typecheck, suite or bundler has ever read a policy, and `CREATE POLICY` is not even in the knowledge graph; RLS is bypassed by `postgres`, so the run is `set role authenticated` over real HTTP with a real owner and a real cashier — the `5d-i` shape, pointed at the write side, with a falsifier beside it. ⚠️ **It ships no migration**: `0002` applied these three tables and their six write policies on 2026-08-26, and nothing here reopens the schema. ✅✅ **SHIPPED: `app/src/api/catalogWrite.ts`** — `WRITE_ORDER`, the three insert column lists and row builders, `unitColumns`, `parsePesos`/`pricePerBase`, `suggestFamily`/`familiesFrom`, `checkProduct`, `CATALOG_WRITE_REFUSALS`/`catalogWriteErrorMessage`, `retryDraft`/`createLine` — with `createProduct` in `@/api/calls`, `useCreateProduct` in `@/api/hooks`, `ES.catalog.issues` and `ES.catalog.errors`, and **44 assertions** in `app/test/api-catalog-write.test.ts`. ✅✅ **THE CHECK IS GREEN AND ITS HARNESS PROVES IT CAN STILL FAIL**: 15 assertion groups against a real database, 15 fixtures behind it, **five of which move the applied schema and put it back** because no client-side edit can make a policy admit a cashier. ⚠️⚠️ **REOPENED AND CLOSED AGAIN THE SAME DAY BY A RULING: *"allow the user to create a product without a sell nor purchasing price, but highlight he's doing so."* THE PRICE IS NO LONGER REQUIRED** — `checkProduct` lets an empty box through, `createProduct` posts **two rows** and never a `price_list` row of zero (C3.12: `$0.00` is a price the owner SET and the dash is a question nobody answered), `priceOmitted` tells an EMPTY box from an UNREADABLE one, and `noPriceNoticeKey` hands `5e-ii` the sentence **and the moment it appears** — it stays quiet until the rest of the draft is acceptable, because the price box starts empty. ⚠️ **`ES.catalog.confirm`/`priceConfirmKey` were renamed to `notice`/`noPriceNoticeKey` the same afternoon**, when the owner ruled the surface is a line and not a confirmation: a name that describes the thing he ruled against is a name that misleads the screen which renders it. The check gained a sixteenth group — the two-row create is on `5d-i`'s own read wearing an empty array — and the harness a seventeenth fixture, `G12`, which mutates the READ module to `!inner` and confirms the check notices when every priceless product would vanish. ⚠️ **THREE DECISIONS WERE TAKEN ON THE OWNER'S BEHALF** — a new product's price is SHOP-WIDE (`location_id` null), ~~the price is REQUIRED~~ **overruled the same day, above**, and `effective_from` is the device's local day — all three recorded in the status log above and in the PR body, and **the second was re-asked and RULED the same day**, which is what that routing was for. | `M` | ✅ **Closed** — ~~ungated~~ |
| **5e-ii** | ✅✅ **DONE 2026-09-22, REOPENED AND CLOSED AGAIN 2026-09-23 BY A RULING — A SHOPKEEPER CAN MAKE A PRODUCT ON A PHONE, AND THE MANAGER FENCE IS NOW DRAWN AS WELL AS APPLIED.** ~~this was the next task, as of 2026-09-22~~ — ⚠️ **struck in lower case deliberately, the rule `5b.8-i`'s row records: `plan-handover.sh` reads the raw line and a strikethrough is only a rendering.** **`Agregar` — the shortest form that produces a usable product.** **C8.9**'s four fields and nothing else: a name, a family, one unit, one price. ⚠️⚠️ **IT IS PILOT-CRITICAL RATHER THAN A NICETY, AND C8.2 IS WHY**: the owner seeds the catalog himself but seeds it DELIBERATELY INCOMPLETE, *"to encourage him to create some on his own"* — so the first product this shop makes is made on this form, by a shopkeeper, with nobody watching. The family the child before it proposes is overridable by a **gesture**, and a family the shop does not have yet is created in place, which is what keeps *creating a variant is always through a family* true. ⚠️⚠️ **THE FENCE IS DRAWN RATHER THAN DISCOVERED: a cashier is never shown the control at all**, which is the `5d-iii` treatment of a button that writes — plainly absent beats looking live and refusing silently, and the refusal here is an RLS `42501` with no sentence of its own. ⚠️ **The three entry points **C8.12** names, and only two of them have a screen to hang on yet:** from Productos, and from inside an opened family where no family question is asked at all. **The Comprar/Vender `...` quick action is ROUTED to `5f` and `5g`** — they build the screens it opens from, and a door with no room behind it is the scaffolding `5d` spent a step deleting. ⚠️ **No check here can look at any of it** (`R9`, §2.11): the instrument is the owner's phone, and the questions it is asked go in this row before it ships. ⚠️ **It ships no migration.** ✅✅ **BOTH PRICE QUESTIONS ARE RULED AND THIS ROW OWES NEITHER.** ~~is the price required?~~ ~~and where does the message go?~~ — answered on 2026-09-22, in that order: **a product may be created with none**, and the sentence is **a line under the empty price box with NO EXTRA TAP**, never a confirmation he dismisses ([[prefer-the-option-that-adds-no-human-step]]). `5e-i` shipped the write, the sentence (`ES.catalog.notice.noPrice`) and **when it appears** — `noPriceNoticeKey` stays quiet until the rest of the draft is one the database would accept, because the price box starts empty and a notice keyed on emptiness alone would be on screen before a character is typed. ⚠️ **SO THIS ROW RENDERS AND DECIDES NOTHING**, which is the seam `5e`'s split exists for. ⚠️ **What is still the owner's eye and not a check (`R9`)**: whether that line reads well at a counter — where it sits and how quiet it is. ✅✅ **SHIPPED: `app/src/app/producto/nuevo.tsx`** — the four fields, the suggestion with `Cambiar` beside it, a family created in place, the unit chips, the no-price line, the one refusal slot and the confirmation — with **two doors into it**: `Agregar` in the Productos banda, and `Agregar Variante` on La Familia now live and passing `?familia=<id>` so **no family question is asked** (C8.12). ⚠️ **`ES.family.notYet` WAS REWORDED RATHER THAN DELETED** — it named three dead buttons and one of them opened a form, so the sentence was false while still rendering green; the other two stay drawn dead, and `5e-iii` and `5g` delete the halves they finish. ⚠️ **The two words those buttons carry are deliberately not spelled in this row** — they belong to the child below, and *never spell a check's sentinel in the file it reads* is the rule `split-coverage.sh` caught this row breaking. ⚠️⚠️ **AND DRAWING IT MOVED FIVE DECISIONS INTO `@/api/catalogWrite` (`R3`), WHICH THIS ROW HAD SAID IT WOULD NOT HAVE**: `canWriteCatalog` (the fence, so a cashier is **never shown the control**), `resolveFamily` (which family answer wins when the suggestion is overridden by a **gesture**), `unitOptions` + `unitChoice` (**C8.5**, and the finding below), and `savedLine`. **21 new assertions** in `app/test/api-catalog-write.test.ts`, seven falsification fixtures behind them, and **851** in the suite. ⚠️⚠️ **THE FINDING: NOTHING IN THE DATABASE APPLIES C8.5 ACROSS VARIANTS.** `product_variant_units_same_dimension_trg` (`0002:204`) counts dimensions across the four unit columns of ONE row, and the fan-out `5e-i` shipped writes the same code into all four — so the trigger can never fire from this app and nothing compares a new variant against its SIBLINGS. *One family, one dimension* was a promise **nothing in this system kept**, and a picker offering all ten units inside a family measured in kilos would have had Postgres accept a litre of chicken. ⚠️⚠️ **REOPENED THE NEXT MORNING BY THE OWNER, WHO HELD IT AND REPLACED FOUR OF ITS DECISIONS — AND ONE SENTENCE COVERS ALL FOUR: *a proposal must not look like a decision already made.*** **(1) `Agregar` IS DELETED.** Creation is reached by SEARCHING: he types a name, and only when nothing matches does the typed name become a row with *Crear Nuevo Producto* under it — *"this allows us to discard partially duplicate product creation"*, and it is **closer to C8.12 than the button was**, because that constraint says *from Productos, type the name*. **(2) THE FAMILY MIRRORS THE VARIANT** and no longer matches an existing family behind his back — the matching survives as tier 1 of a ranked family SEARCH, which is the third of the three scenarios he ranked. **(3) THE UNIT AND THE FAMILY POLICE EACH OTHER**: picking an existing family preselects its unit, and picking a unit that family cannot hold RELEASES the family and says why in a banner that fades. ⚠️ That replaced the narrowed picker — *six options quietly missing is the app deciding again* — and it is the same C8.5 kept where a person can watch it happen. **(4) THE CONFIRMATION MOVED TO THE CATALOG**: the form pops back to Productos with `?nuevo=`, which scrolls the new product into sight in its alphabetical place and blinks its opacity three times, *"don't [add] any other indicator like a line or anything"*. ⚠️ **All three fields now carry a HINT and not a value**, and the no-price line is his own rewording. | `M` | ✅ **Closed** — reopened 2026-09-23 and closed the same day — ~~ungated, and `5e-i` is DONE~~ — ~~it wants `5e-i` first~~; the rows it posts and the suggestion it draws are that child's whole deliverable, and they exist now: `useCreateProduct`, `suggestFamily`, `checkProduct` and `createLine` |
| **5e-iii** | ⚠️⚠️ **SIZED `M/L` AND SPLIT IN TWO 2026-09-23, ON THE DAY IT WAS TAKEN AND BEFORE A LINE OF IT WAS WRITTEN — THE PARENT ROW, AND IT IS NO LONGER TAKEABLE.** ~~this is the next task, as of 2026-09-22~~ — ⚠️ **struck in lower case deliberately, the rule `5b.8-i`'s row records: `plan-handover.sh` reads the raw line and a strikethrough is only a rendering.** **`Editar`, and everything the four-field form pushed behind it.** The rename; the price change and the **dated window** it has to respect; **`tax_rate`** and `pack_size`, set once here and never guessed at a till; and deactivation by **`is_active`** rather than deletion, because neither catalog table has a delete policy and a product with ledger history behind it must not be removable. ⚠️⚠️ **THE PRICE CHANGE IS THE SUBSTANCE, AND IT HAS A BRANCH NOTHING ELSE IN THIS APP HAS.** `price_list` is a dated range table under an exclusion constraint, so the ordinary change closes the row in force at today and opens a new one — but a SECOND change on the SAME DAY cannot, because `price_list_range_ordered` refuses a zero-length range, and it must update the row in force instead. **A screen that knew only the first branch would work all day and fail the second time a shopkeeper corrected a price**, which is precisely the moment he is watching it. ⚠️⚠️ **`enforce_stock` IS NEVER ON THIS FORM AND THAT IS A HARD PILOT CONSTRAINT**: C8.8 says no pilot screen may expose it, C8.6 guarantees permanent drift in both directions, and this is the one screen that would ever have been tempted to offer it. ⚠️⚠️ **AND WHAT BECOMES OF `Costos` IS RULED RATHER THAN CARRIED: *"Leave Costos dead until `5g`"* (2026-09-22).** The third button `5d-iii` shipped dead beside `Agregar Variante` was assigned to `5e` by that row and by no other record in this file, and **nothing in this app writes a purchase until `5g`** — so a costs view built here would show an empty list on every product in the shop, forever, which is the premise problem the Inicio ruling of the same day named. ⚠️ **SO THIS ROW BUILDS NOTHING FOR IT AND DELETES NOTHING EITHER**: the button stays drawn dead with `ES.family.notYet` under it, which is `5d-iv-b`'s Proveedores treatment and refused for its reason — an affordance a shop has seen and then seen vanish reads as an app getting smaller. ⚠️ **`5g` is the row that owes the word**, and its own cell says so. ⚠️ **It ships no migration.** ⚠️⚠️ **AND `5e-ii` LEFT IT ONE THING ITS OWN ROW DID NOT LIST: THE DASH ON LA FAMILIA IS STILL `tintaApagada` AND NOT AMBER, AND THIS IS THE TASK THAT MAKES THAT A REAL QUESTION.** `5d-iii` wrote *look at this again when `5e` lands*; `5e-ii` looked and left it, because `Agregar` can CREATE a priceless product and nothing anywhere can yet PRICE one — so C3.17's *the fix is one tap away* was still false and amber would still be an alarm nobody can silence. **This row is where it becomes true.** ⚠️⚠️ **WHY IT SPLIT, AND IT IS `5e`'s OWN SEAM ONE LEVEL DOWN — THE SAME MOVE `5d-iv` MADE ON 2026-09-22.** `5e` divided on the argument that `5e-i` is the half a machine can hold and the other two are the half only the owner's eye can; this child, alone of the three, still carried **both**. The price change is not a form detail, it is **three branches of a contract with Postgres under an exclusion constraint**, and the UPDATE fence on four policies is a thing no typecheck, suite or bundler has ever read. The rest — what the form looks like, which door opens it, whether the dash turns amber — is rendering, and §2.11 keeps rendering out of every instrument in this repository. ⚠️⚠️ **AND THE SIZING FOUND TWO THINGS THE ROW ABOVE DOES NOT SAY, WHICH IS MOST OF WHAT IT WAS WORTH.** **(1) THE CLOSE-AND-OPEN HAS A PARTIAL FAILURE `5e-i`'s NEVER HAD, AND IT IS THE WORST ONE IN THE APP SO FAR**: the old row must be closed BEFORE the new one is opened, or the two overlap and `price_list_no_overlap` refuses both — and if the second call then fails, the product is left **priced yesterday and priceless today**, mid-morning, by a shopkeeper who was correcting a price. **`docs/checks/5e-iii-a-catalog-edit-contract.sh`** is the instrument that half gets, and it asserts on UPDATE what `5e-i`'s asserted on INSERT. **(2) C3.17 AND THE APPLIED SCHEMA CONTRADICT EACH OTHER AND NOBODY HAD NOTICED**; it is parked in the decisions block and it blocks the second child, not the first | `M/L` — **split, two `M`s** | ✅ **UNGATED as of 2026-09-22** — ~~blocked on the `Costos` decision parked that morning~~, **ruled the same evening**, and the ruling is recorded in the decisions block and in this row. ⚠️ **It still wants `5e-i` first** — the price branch above is that child's arithmetic and that child's check. ⚠️ ~~`5e-iii-a` is ungated; `5e-iii-b` is NOT~~ — **both were ungated on 2026-09-23 and BOTH ARE DONE**, the second on the same day the C3.17 question that gated it was ruled. ⚠️⚠️ **AND THE SPLIT'S OWN CLAIM WAS HALF WRONG, WHICH IS WORTH KEEPING**: this row said the second child was all rendering, and it was not — the ORDER of `Editar`'s four writes and what a failure leaves are right answers, and they went into `5e-iii-a`'s module rather than into a form, with ten falsification fixtures behind them |
| **5e-iii-a** | ✅✅ **DONE 2026-09-23 — THE APP KNOWS HOW TO CHANGE A PRICE, AND THE UPDATE FENCE HAS AN INSTRUMENT FOR THE FIRST TIME.** ~~this is the next task, as of 2026-09-23~~ — ⚠️ **struck in lower case deliberately, the rule `5b.8-i`'s row records: `plan-handover.sh` reads the raw line and a strikethrough is only a rendering.** ⚠️⚠️ **THE FINDING: A CASHIER'S EDIT IS NOT REFUSED, IT IS INVISIBLE.** Every UPDATE policy here carries `using`, and a row a `using` clause excludes is a row PostgREST cannot see — so her PATCH matches nothing and comes back **200 with `[]`**, measured 2026-09-23. `.single()` on every patch is what turns that into a `PGRST116` an app can act on, and it is mapped to the same sentence as `42501`. ✅ **SHIPPED:** `app/src/api/catalogEdit.ts`, `variantPrices`/`patchVariant`/`changePrice` in `@/api/calls`, `useEditProduct`, `ES.catalog.editIssues` and three new refusal sentences, **50 assertions** with ten falsification fixtures, and `docs/checks/5e-iii-a-catalog-edit-contract.sh` — **9 of 9 green against a real database**, its own harness 10 of 10, wired into `db.yml`. **The edit as a contract with Postgres, and it ships NO SCREEN AND NO COMPONENT.** The `5e-i` shape and the `5d-iv-a` shape: `app/src/api/catalogEdit.ts`, a node suite over it, and **`docs/checks/5e-iii-a-catalog-edit-contract.sh`** over a real HTTP round trip against a real database. ⚠️⚠️ **THE PRICE CHANGE IS THE SUBSTANCE AND THE DATED WINDOW IT HAS TO RESPECT IS THREE BRANCHES, NOT ONE.** `price_list` is a dated range table under an exclusion constraint. **(1)** No row in force — the product wears C3.12's dash, which `5e-i` made a legitimate state — so one insert, `[today, ∞)`. **(2)** A row in force that started EARLIER — close it at today and open a new one. **(3)** A row in force that started TODAY — it cannot be closed, because `price_list_range_ordered` **refuses a zero-length range**, so its `price_per_base` is updated in place. **A module that knew only branch 2 would work all day and fail the second time a shopkeeper corrected a price.** ⚠️⚠️ **AND THE ORDER IS A DELIVERABLE, NOT AN IMPLEMENTATION DETAIL — CLOSE BEFORE YOU OPEN.** Opening `[today, ∞)` while the old row is still open makes two rows cover today, and `price_list_no_overlap` refuses the second — so the sequence is forced, exactly as `WRITE_ORDER` is forced in the child that created the product. ⚠️⚠️ **WHICH MEANS A PARTIAL FAILURE THIS APP HAS NEVER HAD: close succeeds, open fails, and the product is PRICELESS MID-DAY** — priced yesterday, dashed today, by a shopkeeper who was fixing a price rather than removing one. **`5e-i`'s partial states were all invisible or harmless; this one is neither**, so the outcome carries what landed and the retry re-opens rather than re-closing. ⚠️ **All three are the same dated window, read the way `5d-i` reads it**, and none of them is a preference. ⚠️ **The scope is the one the READ resolved and is never invented**: `priceFor` prefers a store's own row over the shop-wide one, so the change edits the row the shopkeeper is looking at — and a product with no price at all is priced shop-wide, `location_id` null, which is `5e-i`'s decision **A** unchanged. ⚠️ **`tax_rate` and `pack_size` are typed figures turned into `numeric(5,4)` and `numeric(14,3)`** — `0.1600` and not `16`, refused at 1.0 by `product_variant_tax_rate_sane` and at zero by `product_variant_pack_size_positive` — and `enforce_stock` is not in any column list this child writes. ⚠️ **Retirement is `is_active` false and never a DELETE**: `product_family` and `product_variant` have no delete policy at all, so a DELETE is a `42501` rather than a mistake somebody could make. ⚠️⚠️ **AND THE CHECK IS THE ONLY INSTRUMENT THE UPDATE FENCE WILL EVER GET.** `product_variant_update`, `product_family_update`, `price_list_update` and `price_list_insert` are all `has_role(…, 'manager')` in `0002`; nothing in TypeScript has ever read a policy, `CREATE POLICY` is not in the knowledge graph, and RLS is bypassed by `postgres` — so the central assertion is again **A CASHIER IS REFUSED**, this time on UPDATE, which `5e-i`'s check never touched. ⚠️ **It ships no migration.** | `M` | ✅ **UNGATED** — `5e-i` shipped the arithmetic this inverts and the harness this check is built from. ⚠️ **The C3.17 question parked in the decisions block does NOT block it**: the module describes the fence the database applies today, and a ruling that widens the fence is a migration against a module that already names it |
| **5e-iii-b** | ✅✅ **DONE 2026-09-23 — A SHOPKEEPER CAN CHANGE A PRODUCT ON A PHONE, AND THE AMBER QUESTION `5d-iii` LEFT OPEN IS ANSWERED ON THE SCREEN THAT CAN ACT ON IT.** ~~this is the next task, as of 2026-09-23~~ — ⚠️ **struck in lower case deliberately, the rule `5b.8-i`'s row records: `plan-handover.sh` reads the raw line and a strikethrough is only a rendering.** ⚠️⚠️ **THE SCREEN — and the owner's phone is the whole instrument (`R9`, §2.11).** **`Editar` — everything the four-field form pushed behind it**, drawn: the rename, the price box, the tax rate and the pack size set once and never at a till, and retiring a product the shop has stopped selling. ⚠️ **Every judgement left in this child is rendering, navigation or layout, and no check in this repository will ever say it is wrong** — which is the same sentence `5d-iv-b` carries and the reason the two halves were separated. ⚠️⚠️ **AND THAT SENTENCE WAS THE ONE THING THIS ROW GOT WRONG, WHICH IS WHAT TAKING IT WAS WORTH.** `Editar` is **FOUR WRITES BEHIND ONE BUTTON** across two tables with no transaction between them, and *which goes first* and *what a failure leaves* are questions with right answers that `5e-iii-a` never asked. **So `EDIT_ORDER`, `editPlan`, `editTouches` and `editLine` went into `@/api/catalogEdit` rather than into the form's JSX** — `R3`, and the seam this split exists to keep, held from the other side. ⚠️ **The order is `name → settings → price` and it stops at the first failure**: the name is the one that can be refused `23505`, so stopping there leaves the IVA untouched under a name he is about to abandon; the price is the only step that can HALF-happen, so the worst state this app can reach is also the last thing it can reach. ⚠️⚠️ **AND THERE IS NO RETRY STATE, WHICH WAS MEASURED RATHER THAN OMITTED** — `retryDraft` has one and this deliberately does not: `useEditProduct` invalidates both reads on every path that touched the database, so the next tap re-plans from fresh rows and a close that landed reads back as *no row in force*, which is `priceChange`'s `open` branch — exactly what `retryChange` answers. ⚠️⚠️ **THE SECOND FINDING: THE IVA BOX WOULD HAVE BEEN BLIND.** `variantSettings` sends no column for a box nobody typed into, so an empty form cannot overwrite anything — and *what is the IVA right now* is a question `VARIANT_COLUMNS` cannot answer, because the catalog read carries neither column and is paid for over ~100 products on every load of Productos (C8.3). **So `VARIANT_EDIT_COLUMNS` is a second read for ONE variant** — `PRICE_EDIT_COLUMNS`' own argument — and the figure is printed BESIDE the box, never in it. ⚠️⚠️ **EVERY BOX STARTS EMPTY EXCEPT THE NAME, AND THAT IS THE OWNER'S RULING OF 2026-09-23 APPLIED TO AN EDIT**: *a proposal must not look like a decision already made*, and on a form that CHANGES things a prefilled box is worse than a proposal — *leave it alone* would be indistinguishable from *set it to this*, and a save made for one field would rewrite the others. ⚠️⚠️ **`enforce_stock` IS NEVER DRAWN AND THAT IS C8.8, A HARD PILOT CONSTRAINT** — C8.6 guarantees permanent drift in both directions, and this is the one screen in the pilot that would ever have been tempted to offer the switch; it is in no column list in `@/api/catalogEdit` either, which is what makes it a control the form cannot draw by accident. ⚠️⚠️ **AND WHAT BECOMES OF `Costos` IS RULED RATHER THAN CARRIED: *"Leave Costos dead until `5g`"* (2026-09-22)** — so this child **built nothing for it and deleted nothing either**; the button stays drawn dead with `ES.family.notYet` under it, `5d-iv-b`'s Proveedores treatment, and `5g` is the row that owes the word. ⚠️ **`ES.family.notYet` WAS REWORDED A SECOND TIME**, because it named two dead buttons and one of them now works — the same defect `5e-ii` fixed in the other half, and `5g` deletes what is left. ⚠️⚠️ **THE DASH ON LA FAMILIA IS THIS CHILD'S REAL QUESTION AND IT IS NOW ANSWERED: AMBER FOR A MANAGER, QUIET FOR A CASHIER.** `5d-iii` drew a missing price in `tintaApagada` and wrote *look at this again when `5e` lands*; `5e-ii` looked and left it. **This child is where it became answerable**, and the C3.17 ruling is the half that decided it: *the fix is one tap away* is true for the people who can make the tap, so `atencion` fires only when `canWriteCatalog` does. ⚠️⚠️ **PRODUCTOS KEEPS THE QUIET DASH, DECIDED AGAIN RATHER THAN INHERITED**: nothing on that screen sets a price (it is two taps away through La Familia), and C8.2 has the owner seeding the catalog DELIBERATELY SHORT — so a flat list of ~100 products would open amber on most of its rows for the pilot's first week, which is the alarm nobody can silence, one screen out. ⚠️ **It ships no migration.** ✅✅ **SHIPPED: `app/src/app/producto/[id].tsx`** — four fields, the current figure beside each box, one refusal slot, and a retirement behind a question — plus **`VARIANT_EDIT_COLUMNS` / `variantSettingsRow` / `taxPercentOf` / `packSizeOf` / `EDIT_ORDER` / `editPlan` / `editTouches` / `editLine`** in `@/api/catalogEdit`, `save()` on `useEditProduct`, `locationId` returned from `useCatalog`, `ES.catalog.edit`, and La Familia's rows made pressable so the mark is what `Editar` opens — which is what `5d-iii`'s own header said this day would bring. **20 new assertions (936 in the suite), ten falsification fixtures through the suite, and the contract check extended to 10 of 10 green against a real database** with its harness at 12 of 12. ⚠️⚠️ **RETIREMENT SHIPPED WITH A CONFIRMATION AND WITH A GAP THE OWNER NOW OWES A WORD ON**: `activePatch(true)` would bring a product back, but `catalogFrom` drops inactive variants and no pilot screen lists them — **so the undo exists in the database and has no door.** The confirmation says so in its own second sentence rather than implying the tap is reversible, and the question is parked in the decisions block. ⚠️⚠️ **AND FIVE THINGS ARE FOR THE OWNER'S PHONE AND NOTHING ELSE (`R9`, §2.11):** **(a)** does *Actual: $35.00 / kg* beside an EMPTY box read as *this is what it is now*, or as a value that failed to load? **(b)** does one amber price among six read as *price this* or as *something is broken*? **(c)** is going back to La Familia confirmation enough, or does the edited row want the blink `Agregar` got? **(d)** do four fields and a retire control fit one screen at *Letra grande*? **(e)** does a row that highlights under a thumb and goes nowhere read as a selection, or as a link that failed? | `M` | ✅ **Closed** — ungated the same evening it was gated, by the C3.17 ruling: *"leave the fence as is."* So `Editar` is drawn manager-only — `5e-ii`'s treatment of the create control, applied to the edit one — and **the amber question resolved with it**. ⚠️ **`5e-iii-a` WAS DONE FIRST**, and every rule this screen draws a box around is that child's module |
| **5f** | ⚠️⚠️ **SIZED `XL` AND SPLIT FOUR WAYS 2026-09-24, ON THE DAY IT WAS TAKEN AND BEFORE A LINE OF IT WAS WRITTEN — THE PARENT ROW, AND IT IS NO LONGER TAKEABLE.** ~~this is the next task, as of 2026-09-23~~ — ⚠️ **struck in lower case deliberately, the rule `5b.8-i`'s row records: `plan-handover.sh` reads the raw line and a strikethrough is only a rendering.** `5e` is closed, all three children of it and both children of `5e-iii`. ⚠️⚠️ **SIZE IT BEFORE BUILDING ANY OF IT** — this row lists a screen, a stepper, a basket, a slide-to-commit, a price change and a persistence setting, which is not one sitting. ✅ **THE ROW ASKED FOR THAT ITSELF AND IT WAS RIGHT: twenty deliverables, all of which land in a child below**, and the sizing found three things the row did not say — see the `####` section under this table. ⚠️⚠️ **AND IT OWES A WORD THE C3.17 RULING DELIBERATELY DID NOT GIVE: does the `...` offer a cashier a price override FOR THIS SALE ONLY — one that never writes `price_list`?** The owner ruled on 2026-09-23 *"leave the fence as is"*, so the shop's price list is manager-and-above and a cashier's PATCH of it does nothing at all — **measured, and it does not even fail loudly** (`5e-iii-a`). **That settles who may change the SHOP's price and says nothing about a discount on one line**, which is entangled with C3.16's *a price change persists by default*. ⚠️ **This row is where that question is asked**, and a child that drew the control without asking would ship a button a cashier taps and nothing happens. ⚠️⚠️ **THE QUANTITY CONTROL IS SPECIFIED BY THE OWNER AS OF 2026-09-23, AND IT IS THE FIRST THING TO READ ON THIS ROW.** *"$45/250gr, when selling he can use the stepper to go 250 → 500 → 750 → 1000. But he can also tap to enter 288gr if needed."* **So the stepper's step is the PRICE UNIT and free entry is the BASE unit, and both go in the same line.** ⚠️⚠️ **IT NEEDS NO MIGRATION AND THAT WAS MEASURED RATHER THAN HOPED (2026-09-23):** `sale_line` (`0003:306`) carries **`qty_base numeric(14,3)`, `qty_display numeric(14,3)` AND `qty_display_unit`** as three separate columns, and `record_sale` (`0016`) takes `qty_display` with an optional `qty_display_unit`, computing `qty_base = round(qty_display * factor_to_base, 3)`. So `250 → 500 → 750` is `qty_display` 1, 2, 3 in `250g`, **and 288g is `qty_display: 288, qty_display_unit: 'g'` — exact, with no fractional display quantity and no schema change.** `unit_price_net_per_base` is `numeric(14,6)`, so `$45/250g` is `0.18/g` and 288g is `$51.84` to the centavo. ⚠️ **THE STEP IS `unit.factor_to_base` AND NOT A NUMBER THIS SCREEN PICKS** — the map is already on the phone (`unitFactorsFrom`, `5d-i`) and `@/offline/deadLetters` takes it as an ARGUMENT for the same reason: two answers to *how many grams in a kilo* is one too many. ⚠️ **AND `5e-ii` DELIBERATELY BUILT NONE OF IT.** `Agregar` writes `price_per_base` and one `price_unit_code`; the owner's words were *"we're just making the Crear Producto… just make a very good consideration about these things for the future parts"*, so this row is the consideration and the code is this row's. **The one thing `5e-ii` had to get right for it is that the price is stored PER BASE UNIT**, which it is — the inverse arithmetic `5d-i` shipped — so a product created at `$45/250g` can be sold in grams without anything being re-derived. **The transaction screen, shared.** Flat variant list and search, the row, the `price_unit_code` stepper and keypad, quantity-is-the-line, sticky `Total`, basket sheet, slide-to-commit, the amber/badge rule, the `...` price change and its persistence setting. **The highest-traffic surface in the app.** ⚠️⚠️ **THREE THINGS THE SIZING OF 2026-09-24 HAD TO ADD TO THIS LIST, BECAUSE THE ROW NAMED A SCREEN AND NOT THE THINGS UNDER IT.** ⚠️ **(1) THE CART IS STATE BEFORE IT IS A SHEET, AND §2.11 ALREADY CHOSE WHERE IT LIVES: *"Zustand, cart only, persisted to `expo-sqlite`"*, with one rule — if it came from Postgres it lives in Query, if it is not committed yet it lives in the cart store, and nothing lives in both.** The dependency is not installed today, this is the first task that needs it, and *"basket sheet"* above is the sheet over that store rather than the store itself. ⚠️ **(2) *the row* IN THAT LIST MEANS C3.2 — the row is the whole control**: the variant name, the family beneath it, `Precio` never without its unit (C3.10), the quantity field, the `−`/`+` stepper and the `...` menu, with **the LINE total deliberately absent from it** (C3.4). ⚠️ **(3) THE COMMIT PAYLOAD IS A DECISION AND NOT A TRANSCRIPTION: `record_sale` TAKES `unit_price_gross_per_base` WHILE `price_list` STORES `price_per_base`**, and those are the same number only while `workspace.prices_include_tax` is true — §2.5 rule 2 makes the GROSS unit price authoritative on a sale and the NET on a purchase. ✅✅ **RULED 2026-09-17: `Quitar` REMOVES A LINE IMMEDIATELY — no undo, no confirmation.** The recovery is re-adding the item, two taps on the list behind the sheet. A timed *Deshacer* fails the users C3.18 exists for; a dialog on every removal is book-keeping handed to a shopkeeper. ⚠️ **`Vaciar carrito` is the exception and KEEPS its confirmation** — emptying the basket is a different act from removing one line. ⚠️ **This ruling was parked against `5h` by mistake and belongs here**, which is where *basket sheet* is listed. ⚠️ **And área 13 drew this screen**: the row opens in place, the stepper reduces, `Quitar` is a labelled control and never a swipe — see the canvas link in área 13's entry. ⚠️⚠️ **AND TWO CONFIRMATION ANIMATIONS, ADDED BY THE OWNER 2026-09-21 IN PLACE OF THE CHANGE CALCULATION HE DEFERRED** — *"a simple confirmation animation if the sale is done and another one if we empty the carrito."* ⚠️ **Two constraints on them and neither is taste:** §2.11's motion rule is **`transform` and `opacity` ONLY** — a performance rule, because C1.1 puts two low-end Androids among the pilot's four phones and animating layout, colour or shadow does not run on the compositor. ⚠️⚠️ **And the sale confirmation fires on ENQUEUE, never on the server's reply**: C10.3 says the slide looks identical offline, and `5c-i` made that structural by having `queueWrite` return a row rather than a promise. **An animation that awaits Postgres is the offline path looking different — the one thing that design exists to prevent, undone in the one place nobody would test it.** ⚠️⚠️ **AND IT OWES ONE LINE THAT NOTHING HERE CAN SEE UNTIL IT IS WRITTEN: THE SLIDE MUST CALL `queued()` FROM `@/lib/connectivityMonitor` AFTER `queueWrite`.** `5c-ii-b-2` built the trigger and shipped that function with **no caller**, deliberately and for the reason `R9` exists: there is no screen to call it from yet. ⚠️ **Without the call, the ONLINE path is the worse of the two** — a reconnect drains and an app-state wake drains, but a sale rung up on a working connection by a cashier who never leaves the app has nothing to trigger it, and would sit in the queue until the link flapped. ⚠️ `queueWrite` returns a ROW rather than a promise (C10.3), so the trigger has to be TOLD rather than awaited; calling it offline or before the monitor starts is a safe no-op, so the screen never has to ask. ⚠️⚠️ **AND IT OWES A SECOND LINE NOTHING HERE CAN SEE, ADDED BY `5c-iv-b` ON 2026-09-22: THE UNIT FACTORS THIS SCREEN ALREADY NEEDS MUST BE HANDED TO `@/offline/deadLetters` TOO.** This screen has to price a basket with no signal (§2.6, C10.3), so it already holds `unit.factor_to_base` for every display unit a shop sells in; `5c-iv-b` takes that map as an ARGUMENT (`NO_UNIT_FACTORS`, empty today) rather than hard-coding `0001`'s ten rows, precisely so this app never grows a second answer to *how many grams in a kilo*. ⚠️ **Until the map is passed, the dead-letter banner prices only a line quoted in its variant's own base unit** — factor exactly `1` by `0001`'s `unit_base_is_identity` — **and withholds the peso figure for the rest rather than understating it**, which is what `QueueValue.complete` is for. **Nothing goes wrong quietly; the count is still right and the figure is simply absent**. ⚠️⚠️ **AND IT OWES A THIRD THING, WHICH IS NOT CODE: THE FIRST LOOK AT `5c-iv-b`'s BANNER.** Ruled by the owner on 2026-09-22 — see the working agreement at the foot of this file. That banner draws only when the outbox holds a `dead` row, and **nothing in this app enqueues anything until this screen exists**, so it has never been on a screen and could not be. **The three questions it left open are look-questions and they are answered HERE, with the app in a hand, not before:** ✅ **(a) placement — ANSWERED 2026-09-22 AND NO LONGER A LOOK-QUESTION.** ~~it sits at the TOP of every screen because `OfflineSurfaces` owns the bottom; *on Inicio only* is the alternative, and it is one condition either way.~~ The owner ruled **Inicio only**, which is the alternative that row named, and it shipped as `onHome`. ⚠️ **It was settled on paper rather than on a phone because ADR-035 §2.8 forbade the shipped placement outright** — a disagreement a session building Inicio would have resolved by deleting the banner. **Two look-questions remain here, not three.** ⚠️ **(b) size and weight** — three lines of `bodySize` in a pill, no state colour. ⚠️⚠️ **AND AS OF `5d-iv-b` THIS IS NO LONGER ONLY THE BANNER'S QUESTION: INICIO NOW RESERVES ROOM FOR IT UNCONDITIONALLY** (`bannerRoom`), so the same look answers two things at once — whether the pill is the right weight, and whether the gap it sits in reads as deliberate or as a hole at the top of Home on every phone that never dead-letters anything. ⚠️ **`bannerRoom` clears the pill's MINIMUM and no more**, so a three-line banner in `Letra grande` may overlap the takings until a short scroll — that is the case to look at, and it is the one no check here can reach. ⚠️ **(c) the words** — *"N operaciones no se guardaron"*, *"Valor: $X"*, *"Avísanos para recuperarlas."* ⚠️ **The cheapest way to ask all three is to ring up a sale with the phone in airplane mode against a shop code that no longer resolves**, which is the one path that puts a `dead` row on a device without a migration or a fixture. ⚠️ **None of this blocks this row** — it is a review that rides along with it | `XL` | — |
| **5f-i** | ✅✅ **DONE 2026-09-24 — THE APP CAN HOLD A BASKET AND PRICE IT, AND A GUARD REFUSED THE FIRST DESIGN.** ~~this is the next task, as of 2026-09-24~~ — ⚠️ **struck in lower case deliberately, the rule `5b.8-i`'s row records: `plan-handover.sh` reads the raw line and a strikethrough is only a rendering.** **51 new assertions in `app/test/cart.test.ts` (1,030 over 35 files, up from 979), eighteen falsification fixtures behind them, and `zustand` is the app's thirty-third dependency and its only store.** ⚠️⚠️ **THE FINDING, AND IT COST THE SESSION ITS FIRST DESIGN: `5d-i`'s CONTRACT CHECK REFUSED A WIDENING OF THE CATALOG READ AND WAS RIGHT.** This child first added `tax_rate::text` to `VARIANT_COLUMNS`, because the sale payload needs a rate whenever `prices_include_tax` is false. `docs/checks/5d-i-catalog-contract.sh` went red **by name** — it bans `enforce_stock`, `tax_rate` and `pack_size` from the list read on C8.8's argument, *"a column the app never asks for is a column that never reaches a phone"* — and `5e-iii-a` already reads the two set-once figures per variant for exactly that reason. **A rate is needed only on the branch no shop takes, so every phone would have carried a column on every catalog read for it.** ✅ The rate is an ARGUMENT now, and `quoted` returns `null` rather than defaulting it to zero: **loud and stuck beats quiet and short by the IVA on every line for ever.** ⚠️⚠️ **AND THE SECOND FINDING CAME OUT OF THE FIRST: A PURCHASE MUST NOT FALL BACK TO THE SHELF PRICE.** `quoteFor` hands the buy side `null` until `5g` passes a figure — §2.8 is explicit that a supplier price is *"a fact about a relationship, not about a product"*, and a delivery quietly recorded at retail is plausible, syntactically perfect and wrong in the margin for ever. **The one column that WAS added is `base_unit_code`**, which is what a keyed `288` is sent in. ⚠️ **What it did NOT do is call Postgres** — see below, it is named rather than assumed. **The cart, and the arithmetic that prices it — and the only child of `5f` an instrument in this repository can look at.** ⚠️ **NO SCREEN AND NO COMPONENT**: `5h.5` owns `src/ui/` and comes after the screens that would justify a primitive. That is `5e-i`'s shape, `5d-iv-a`'s and `5e-iii-a`'s, taken here for their reason — everything in this child has a right answer a node suite can read, and `R3` is what puts it in a module rather than in JSX. ⚠️⚠️ **THE STORE FIRST, BECAUSE ADR-035 §2.11 ALREADY DECIDED IT AND THIS ROW HAD NOT NOTICED: *"Zustand, cart only, persisted to `expo-sqlite`"*, with one rule — if it came from Postgres it lives in Query, if it is not committed yet it lives in the cart store, and nothing lives in both.** ⚠️ **`zustand` IS NOT A DEPENDENCY OF `@tienda/app` TODAY** — measured 2026-09-24 against `app/package.json`, and this is the first task in the build that needs one. **It is pure JS, so it costs no `pod install` and no native build**, which is the one thing that would otherwise make it expensive here: nothing in CI compiles this app. ⚠️ **The store is what makes quantity-is-the-line true** (C3.3): a line EXISTS because a quantity is greater than zero, removing it is setting it to zero, and there is no add-to-basket step to model at all. **And it must survive the app being backgrounded mid-sale**, which is exactly why §2.11 persists it — a shop's phone rings. ⚠️⚠️ **THE STEP IS `unit.factor_to_base` AND THE FREE ENTRY IS THE BASE UNIT** — the owner's specification of 2026-09-23 and C3.8 both: `qty_display` 1, 2, 3 in `250g` when he taps `+`, and `{ qty_display: 288, qty_display_unit: 'g' }` when he keys it, exact to the centavo because `unit_price_net_per_base` is `numeric(14,6)`. The map is read through `unitFactorsFrom` (`5d-i`) and is never a number this module picks. **The DRAWN control is the next child's and it is gated; this arithmetic is not.** ⚠️⚠️ **AND THE ONE REAL DECISION IS THE COMMIT PAYLOAD: `record_sale` TAKES `unit_price_gross_per_base`, `price_list` STORES `price_per_base`, AND THEY ARE THE SAME NUMBER ONLY WHILE `prices_include_tax` IS TRUE.** §2.5 rule 2 anchors a SALE on gross and a PURCHASE on net; `0001` defaults the flag true, `useWorkspace` already reads it (`WORKSPACE_COLUMNS`), and `@tienda/money` already has both anchors in `priceSellLine` and `priceBuyLine`. ⚠️ **So this module READS the flag rather than assuming it** — a till that hard-codes the identity understates IVA the first time a shop answers *no* to *¿Tus precios ya incluyen IVA?*, and nothing anywhere would go red. ⚠️ **What it does NOT do is call the RPC.** `5h` owns `record_sale` and `5g` owns `record_purchase`, so this child builds the payload and the `WriteDraft` that `queueWrite` accepts, and **the live round trip that proves Postgres agrees with the shape is named on `5h` rather than assumed here** — the one claim in this child a node suite cannot settle, said out loud rather than left to be discovered. ⚠️ **AND IT DISCHARGES THE SECOND LINE `5f` OWES: the unit factors are handed to `@/offline/deadLetters`**, whose `NO_UNIT_FACTORS` has been an empty argument since 2026-09-22 waiting for the screen that holds the real map. **It ships no migration** — `sale_line` has carried `qty_base`, `qty_display` and `qty_display_unit` since `0003`, measured rather than hoped | `M` | — |
| **5f-ii** | ✅✅ **DONE 2026-09-24 — THE COUNTER CAN BE RUNG UP, AND NOTHING IN THIS REPOSITORY CAN SAY WHETHER IT LOOKS RIGHT.** ~~this is the next task, as of 2026-09-24 — ungated the same day it was gated, and the amendment is applied~~ — ⚠️ **struck in lower case deliberately, the rule `5b.8-i`'s row records.** ~~gated on an ADR amendment the owner owes~~ — ⚠️ **struck in lower case deliberately, the rule `5b.8-i`'s row records.** ✅✅ **RULED: *"Amend it to say both, this should be easily switchable and configurable."*** ADR-035 §2.8 and §2.11 are amended and C3.8 carries the ruling. ⚠️⚠️ **AND HE WENT FURTHER THAN THE QUESTION: EVERY PRODUCT GETS A KEYPAD, COUNTS INCLUDED** — *"if a user wants to sell 15 manojos of cilantro, he shouldn't have to click the stepper 14 times"* — **which reverses the half of the recommendation that had been called safe.** A keypad is about MAGNITUDE and not precision; *there is no 288th of a `pza`* was true and beside the point. **So this child draws a stepper AND a keypad on every row, one tap apart, and never a switch between them.** ⚠️ **THE STEP NEEDS NO NEW AFFORDANCE AND THIS ROW OWNS SAYING SO:** the step is `price_unit_code`'s factor, which a shopkeeper already chooses in `Agregar` and `Editar`, so *configurable* is satisfied by the unit picker. **A step set INDEPENDENTLY of the price unit is a different thing, is not read into the ruling, and is not built here** — if that is what was meant it is one sentence to say so. ⚠️⚠️ **AND THE `...` IS NOT DRAWN AT ALL, BECAUSE `5f-iv` IS OUT OF THE PILOT** (ruled the same day). ~~the `...` button **drawn dead** until the last child fills it~~ — **absent, not dead**: `Costos` is drawn dead because a shopkeeper had already SEEN it and a vanished affordance reads as the app shrinking; nobody has ever seen a `...` on this screen, so there is nothing to preserve and a permanently dead button is furniture on the highest-traffic surface in the app. **The list and the row, drawn — with nothing committed and nothing written.** ⚠️ **The owner's phone is the whole instrument** (`R9`, §2.11): every judgement left in this child is rendering, navigation or layout, and no check in this repository will ever say it is wrong. **Flat variant list and search**, and the SAME list on both screens (C3.1) — *"there are no buy-only or sell-only subsets"* — which is `5d-ii`'s list read in a second place rather than a second list: `catalogFrom`, `search` and `matches` shipped with `5d-i`. ⚠️⚠️ **And *the row is the whole control* (C3.2), which is the sentence that makes this a screen and not a list**: the variant name, the family beneath it, `Precio` **never without its unit** (C3.10 — `$35.00 / kg`, `$9.00 / 250 gr`, `$2.00 / pza`), the quantity field, the `−`/`+` control and **no `...` at all** — see the head of this row. ⚠️ **The line total is deliberately absent from the row** (C3.4) — it appears in the sheet and in the **sticky** bar and nowhere else, **and the number in that bar is `5f-i`'s arithmetic**, not this child's. ⚠️⚠️ **THE `price_unit_code` stepper and keypad IS WHAT THE GATE IS ABOUT, and it is the only thing here that cannot be drawn either way**: §2.8 and §2.11 make it a SWITCH — one control or the other — the owner has specified BOTH on one weighed line twice, and drawing it before the amendment lands writes the disagreement into shipped code where the next session reads it as a settled fact. ⚠️ **The amber/badge rule**: §2.11 fences the `atención` colour to C3.17's unpriced row and nothing else, and **no state is ever announced by colour alone** — colour AND a word, always, which is `R11` and is enforced. ⚠️ **What stays OUT of this child, named so nobody assumes it:** what the app DOES about an unpriced row — a purchase blocked (C3.13), a sale allowed and loud (C3.14) — belongs to `5g` and `5h`, because the two screens answer it differently and this one is shared by both. **It ships no migration** ✅ **Shipped:** `app/src/app/(tabs)/vender.tsx`, which replaces the `Pendiente` placeholder — the search, the flat variant list, C3.2's row, the stepper-and-keypad and C3.4's sticky `Total`; `app/src/cart/quantity.ts`, the pure half of the quantity control; an `ES.sell` block; and `app/test/cart-quantity.test.ts` — **19 new assertions, 1,006 passing over 36 files, up from 987 over 35.** ⚠⚠ **C3.8 GIVES TWO EXAMPLES AND NEEDED A RULE BETWEEN THEM, WHICH IS THE ONE DECISION HERE THAT WOULD HAVE GONE IN WRONG SILENTLY:** *250, 500, 750 with `gr`* priced *por cuarto* and *0.250 kg* priced *por kilo* cannot both come from one uniform rule, and **`0001`'s `unit` table records nothing that separates `kg` from `250g`** — measured, not assumed. `MEASURED_IN` is that decision written down: a unit the shop MEASURES in reads directly, a denomination it PRICES in reads in the base unit, and a code nobody listed reads in the base unit too. ⚠️ **AND THE AMBER SETTLED AN ARGUMENT `5d-ii` LOOKED LIKE IT WAS HAVING WITH THIS ROW:** Productos refuses to paint its dash amber because *"an alarm on a hundred rows is the alarm nobody can silence"*, and §2.11 fences `atención` to C3.17's unpriced row. **Both hold, and the condition separates them — the row goes amber when it has a QUANTITY on it**, which is one row at a time and is silenced by either of the two things she would do anyway | `M/L` | ✅ **Ungated 2026-09-24** — the amendment landed, and `5f-i` is done |
| **5f-iii** | ⚠️⚠️ **SIZED `M/L` AND SPLIT IN TWO 2026-09-24, ON THE DAY IT WAS TAKEN AND BEFORE A LINE OF IT WAS WRITTEN — THE PARENT ROW, AND IT IS NO LONGER TAKEABLE.** ~~this is the next task, as of 2026-09-24, ungated the moment `5f-ii` closed~~ — ⚠️ **struck in lower case deliberately, the rule `5b.8-i`'s row records: `plan-handover.sh` reads the raw line and a strikethrough is only a rendering.** ⚠️⚠️ **IT IS THE FIRST TASK IN THIS PROJECT THAT WRITES FROM A SCREEN.** **The basket sheet and the slide-to-commit — the first write this app has ever put in the queue.** ⚠️⚠️ **THAT IS NOT A FLOURISH: `5c`'s FOUR CHILDREN HAVE NEVER HAD A CALLER.** Nothing in this app enqueues anything today, so the outbox, the flush, the dead-letter path and the banner have all been built against fixtures — and this child is where they first meet a shopkeeper. **The basket sheet** (C3.5): only rows carrying a quantity, the same field and control as the list behind it, a per-line removal and a `Vaciar` for the lot. ⚠️⚠️ **AND THE SHEET IS THE SCREEN §2.5 RULE 5 IS WRITTEN ABOUT — *"the displayed lines fail to sum to the displayed total on the review screen, which is the one screen where a customer is checking the arithmetic by hand"* — WHICH THE SIZING OF 2026-09-24 FOUND AND THIS ROW HAD NOT SAID:** `basketOf` returns a total and a COUNT of lines, never the lines themselves, so the rows and the figure above them come out of ONE function or they are two arithmetics over one basket. ✅ **`Quitar` removes a line IMMEDIATELY — no undo, no confirmation** (ruled 2026-09-17). The recovery is re-adding the item, two taps on the list behind the sheet; a timed *Deshacer* fails the users C3.18 exists for, and a dialog on every removal is book-keeping handed to a shopkeeper. ⚠️ **`Vaciar carrito` KEEPS its confirmation** — emptying is a different act from removing one line. ⚠️⚠️ **THE SLIDE (C3.6) MUST CALL `queued()` FROM `@/lib/connectivityMonitor` AFTER `queueWrite`, AND THIS IS THE LINE `5f` SAID NOTHING COULD SEE UNTIL IT WAS WRITTEN.** `5c-ii-b-2` shipped that function with **no caller**, deliberately, because there was no screen to call it from. ⚠️ **Without the call the ONLINE path is the worse of the two**: a reconnect drains and an app-state wake drains, but a sale rung up on a working connection by a cashier who never leaves the app has nothing to trigger a drain and would sit in the queue until the link flapped. ⚠️ `queueWrite` returns a ROW rather than a promise (C10.3), so the trigger is TOLD rather than awaited, and calling it offline or before the monitor starts is a safe no-op — the screen never has to ask. ⚠️⚠️ **AND THE TWO CONFIRMATION ANIMATIONS, ADDED BY THE OWNER 2026-09-21 IN PLACE OF THE CHANGE CALCULATION HE DEFERRED** — *"a simple confirmation animation if the sale is done and another one if we empty the carrito."* **Two constraints and neither is taste:** §2.11's motion rule is `transform` and `opacity` ONLY, a performance rule because C1.1 puts two low-end Androids among the pilot's four phones and animating layout, colour or shadow does not run on the compositor; **and the sale confirmation fires on ENQUEUE, never on the server's reply** — an animation that awaits Postgres is the offline path looking different, undone in the one place nobody would test it. ⚠️ **It is started in an effect and not in the handler that mounts the view**, which on the native driver fails silently. ⚠️⚠️ **AND IT CARRIES THE FIRST LOOK AT `5c-iv-b`'s DEAD-LETTER BANNER, which is a review riding along rather than code**: **(b) its size and weight** — three lines of `bodySize` in a pill, no state colour — against the room Inicio now reserves for it unconditionally (`bannerRoom`, which clears the pill's MINIMUM and no more, so three lines in `Letra grande` may overlap the takings until a short scroll); and **(c) the words**. ⚠️ **The cheapest way to ask both is to ring up a sale in airplane mode against a shop code that no longer resolves** — the one path that puts a `dead` row on a device without a migration or a fixture, **and it does not exist until this child ships**. **It ships no migration** | `M/L` | ✅ **Ungated 2026-09-24** — `5f-i` and `5f-ii` are both done |
| **5f-iii-a** | ✅✅ **DONE 2026-09-24 — THE SHOP CAN READ ITS OWN BASKET BACK, AND THE SHEET AND THE BAR ARE ONE ARITHMETIC BY CONSTRUCTION.** ~~this is the next task, as of 2026-09-24 — the review surface~~ — ⚠️ **struck in lower case deliberately, the rule `5b.8-i`'s row records: `plan-handover.sh` reads the raw line and a strikethrough is only a rendering.** ⚠️⚠️ **IT STILL COMMITS NOTHING.** **The basket sheet (C3.5):** only the rows carrying a quantity, each with the same field and the same control as the list behind it, a per-line removal and a `Vaciar` for the lot. ⚠️⚠️ **WHAT THE SIZING FOUND, AND IT IS WHY THIS CHILD IS NOT A PURE RENDERING TASK: THE SHEET IS THE ONE SCREEN A CUSTOMER CHECKS THE ARITHMETIC ON BY HAND.** §2.5 rule 5 is written about exactly this surface — *"the displayed lines fail to sum to the displayed total on the review screen"* — and `basketOf` (`5f-i`) returns a TOTAL AND NO LINES AT ALL, so a sheet that priced its own rows would be a **second arithmetic over one basket**, agreeing in the pilot and disagreeing by a centavo the first time a rate rounds. **One function returns both**, the total being the sum of the very figures the rows draw, and a node suite reads that identity rather than a person hoping for it. ✅ **`Quitar` removes a line IMMEDIATELY — no undo, no confirmation** (ruled 2026-09-17). The recovery is re-adding the item, two taps on the list behind the sheet; a timed *Deshacer* fails the users C3.18 exists for, and a dialog on every removal is book-keeping handed to a shopkeeper. ⚠️ **`Vaciar carrito` KEEPS its confirmation** — emptying is a different act from removing one line. ⚠️⚠️ **AND IT OWES THE FIRST OF THE OWNER'S TWO ANIMATIONS, the one he asked for on 2026-09-21** — *"another one if we empty the carrito"* — under §2.11's motion rule, `transform` and `opacity` ONLY, which is a performance rule and not a taste one because C1.1 puts two low-end Androids among the pilot's four phones. ⚠️ **It is started in an effect and not in the handler that mounts the view**, which on the native driver fails silently. ⚠️⚠️ **THE SLIDE, THE ENQUEUE AND THE SALE'S OWN CONFIRMATION ARE `5f-iii-b`'s, AND THAT IS THE SPLIT RATHER THAN AN OMISSION** — this child draws no commit control, so C3.4's sticky bar still commits nothing and this app still writes nothing. ⚠️ **Above the arithmetic, the owner's phone is the whole instrument** (`R9`, §2.11). **It ships no migration** | `M` | ✅ **Ungated 2026-09-24** — `5f-i` and `5f-ii` are both done |
| **5f-iii-b** | ✅✅✅ **DONE 2026-09-24 — THIS APP HAS WRITTEN ITS FIRST SALE, AND `5f-iii` IS CLOSED.** ~~gated on the bar arrangement the owner asked for proposals on~~ — ⚠️ **struck in lower case deliberately, the rule `5b.8-i`'s row records.** **THE SLIDE-TO-COMMIT, AND THE FIRST WRITE THIS APP HAS EVER PUT IN THE QUEUE.** **Commit is a gesture and not a tap (C3.6):** the control in C3.4's sticky bar becomes the slide-to-commit and the gesture commits. ⚠️⚠️ **THAT IS NOT A FLOURISH: `5c`'s FOUR CHILDREN HAVE NEVER HAD A CALLER.** Nothing in this app enqueues anything today, so the outbox, the flush, the dead-letter path and the banner have all been built against fixtures — and this child is where they first meet a shopkeeper. ⚠️⚠️ **THE SLIDE MUST CALL `queued()` FROM `@/lib/connectivityMonitor` AFTER `queueWrite`, AND THIS IS THE LINE `5f` SAID NOTHING COULD SEE UNTIL IT WAS WRITTEN.** `5c-ii-b-2` shipped that function with **no caller**, deliberately, because there was no screen to call it from. ⚠️ **Without the call the ONLINE path is the worse of the two**: a reconnect drains and an app-state wake drains, but a sale rung up on a working connection by a cashier who never leaves the app has nothing to trigger a drain and would sit in the queue until the link flapped. ⚠️ `queueWrite` returns a ROW rather than a promise (C10.3), so the trigger is TOLD rather than awaited, and calling it offline or before the monitor starts is a safe no-op — the screen never has to ask. ⚠️⚠️ **AND THE SECOND OF THE OWNER'S TWO ANIMATIONS — *"a simple confirmation animation if the sale is done"* — WHOSE ONE HARD RULE IS THAT IT fires on ENQUEUE, never on the server's reply**: an animation that awaits Postgres is the offline path looking different, undone in the one place nobody would test it. ⚠️ Same motion rule as its sibling — `transform` and `opacity` only, started in an effect. ⚠️⚠️ **AND IT CARRIES THE FIRST LOOK AT `5c-iv-b`'s DEAD-LETTER BANNER, which is a review riding along rather than code**: **(b) its size and weight** — three lines of `bodySize` in a pill, no state colour — against the room Inicio now reserves for it unconditionally (`bannerRoom`, which clears the pill's MINIMUM and no more, so three lines in `Letra grande` may overlap the takings until a short scroll); and **(c) the words**. ⚠️ **The cheapest way to ask both is to ring up a sale in airplane mode against a shop code that no longer resolves** — the one path that puts a `dead` row on a device without a migration or a fixture, **and it does not exist until this child ships**. **It ships no migration** | `M` | ✅ **Ungated and closed 2026-09-24** — the ruling arrived and the whole row shipped in one sitting, which is the amended working agreement's first outing |
| **5f-iv** | ⚠️⚠️ **OUT OF THE PILOT — RULED 2026-09-24, AND THE ANSWER TO THE QUESTION THIS CHILD EXISTED TO ASK IS *NO*.** ~~gated on a decision the owner owes~~ — ⚠️ **struck in lower case deliberately, the rule `5b.8-i`'s row records.** *"Let's not do those discount controls part of the pilot yet, we will need to understand the interactions before creating anything like that. Any money 'knock-off' happens in her head and is out of the scope of the app for now."* ⚠️⚠️ **IT KILLED MORE THAN THE QUESTION ASKED, AND THE OWNER MAY NOT HAVE NOTICED — SO IT IS WRITTEN DOWN HERE RATHER THAN ACTED ON QUIETLY: C3.16's SETTING IS THE SAME AFFORDANCE.** *Reset-after-each-transaction* is a sale-only override expressed as a switch rather than as a tap, so *"any money knock-off happens in her head"* answers both, and **the discreet Home banner goes with it** — it existed only to announce that setting. ⚠️ **What survives untouched:** a price change persists, because there is now no other kind; `Editar` is where one is made; and C3.17's manager fence is unchanged. ⚠️⚠️ **THE ROW IS NOT DELETED, AND THAT IS `5d-iv-b`'s AND PROVEEDORES' REASON:** *"we will need to understand the interactions"* is a deferral with a condition on it, and the condition is watching the shop use Vender. **This row is what the answer comes back to**, and it opens by owing the word — the shape `Costos` already has. ⚠️ **Nothing is drawn for it**, and `5f-ii` draws no `...` rather than a dead one, because nobody has seen this affordance and there is nothing to preserve. **Deferred, not dropped.** ~~**The `...` quick actions: the price change and its persistence setting.** C3.15 — *prices are changed from the `...`, in two taps, at the counter, on both screens* — and **C3.16**, which is the half that reaches the shop rather than the screen: **a price change PERSISTS BY DEFAULT**, so the change made at the counter becomes the shop's price; a setting flips it to reset-after-each-transaction; and **while that setting is off, Inicio carries a discreet banner saying so**, because a shopkeeper who changed a price on Monday is otherwise surprised on Tuesday. ⚠️ **That banner is the SECOND thing Inicio has been asked to carry conditionally** — `5d-iv-b` already reserves room for the first — and two banners arguing about the top of one screen is the shape §2.8's Home ruling exists to prevent. ⚠️⚠️ **AND THE QUESTION THIS CHILD EXISTS TO ASK BEFORE IT DRAWS ANYTHING: does the `...` offer a cashier a price override FOR THIS SALE ONLY — one that never writes `price_list`?** The C3.17 ruling of 2026-09-23, *"leave the fence as is"*, settled who may change the SHOP's price and deliberately said nothing about a discount on one line. ⚠️ **A child that drew the control without asking would ship a button a cashier taps while nothing happens**, and not visibly: her PATCH is not refused, the row is simply invisible to her, so PostgREST answers **200 with an empty array** — measured by `5e-iii-a`, not inferred. ⚠️ **The write itself is already built and is not this child's**: `5e-iii-a`'s `editPlan` closes the row in force and opens the new one, in that order, because `price_list_no_overlap` allows no other. **It ships no migration** — widening the fence WOULD be one, and an append-only migration that merges automatically is exactly why this question was parked in front of the work rather than inside it~~ | `M` | ⏸️ **Deferred out of the pilot 2026-09-24** — it returns on the owner's word, after he has watched the shop use Vender |
| **5f.5** | ⚠️⚠️ **PROMOTED OUT OF THE ADR ON 2026-09-24 BY `5f`'s SIZING, BECAUSE §2.8 REQUIRES IT AND NO ROW IN THIS FILE HELD IT.** ADR-035 §2.8's *Error prevention* names **three** guards on the capture screens, *"none blocking"*: unit-aware input, review before commit — the sheet and the slide — and ⚠️⚠️ **the MAGNITUDE WARNING: *"flag any quantity or unit price beyond ~3× the trailing median for that product"*, WHICH APPEARS NOWHERE IN THIS PLAN.** Measured 2026-09-24: the phrase and its wording return nothing from the plan corpus and nothing from `app/src/`, and §6 does not defer it either. ⚠️ **What that search bounds is the PLAN and this app's modules — not the shop** — but the guard is a client behaviour, so those two are the whole of where it could have lived. ⚠️⚠️ **AND IT SITS AFTER `5g` FOR A REASON THAT IS NOT ORDERING TASTE: §2.8 seeds it from PURCHASE history *"so it works from day one"*, and nothing in this app has ever read a purchase.** `record_purchase` has no caller, `purchase_line` has no client read, and a median over an empty table warns about everything or about nothing. **`5g` is the row that creates the history this one reads** — the same shape as `Costos` being deferred to the row that can answer it rather than dropped. ⚠️ **The error it prevents is the expensive one and the ADR states it in full**: *"a cashier meaning 1.5 kg who types 15 produces a transaction that is syntactically perfect, prices plausibly, and silently corrupts stock, margin and waste analytics."* ⚠️ **It is a WARNING and never a block** — §2.8 says so, and C3.9 is why: *"precision is the shop's, not ours"*, so 2 kg on a scale reading 2.050 is correct behaviour and nothing may reconcile it. **It ships no migration**; the median is a read | `S/M` | `5g` |
| **5g** | ⚠️⚠️ **SIZED `XL` AND SPLIT THREE WAYS 2026-09-24, ON THE DAY IT WAS TAKEN AND BEFORE A LINE OF IT WAS WRITTEN — THE PARENT ROW, AND IT IS NO LONGER TAKEABLE.** ~~this was the next task, as of 2026-09-24, and this file carried it as an `M`~~ — ⚠️ **struck in lower case deliberately, the rule `5b.8-i`'s row records: `plan-handover.sh` reads the raw line and a strikethrough is only a rendering.** **Comprar.** ⚠️⚠️ **THE ROW NAMED SEVEN DELIVERABLES; THE SIZING FOUND EIGHTEEN, AND THE THREE IT DID NOT NAME ARE THE THREE THAT CHANGE WHAT GETS BUILT.** **Eighteen deliverables, all of which land in exactly one child below:** the **provider list read**, an applied table no line in `app/` touches; the **price memory read** over `provider_price_memory` (`0008`), per (provider, variant) and never across providers; the prefill that is stored per BASE and read **per PRICE UNIT**, which is arithmetic and not a rename; **`last_qty_display_unit`**, the denomination she typed last time and which need not be the variant's price unit today; the **provider on the purchase payload** — `draftOf` builds `location_id` and `lines` and nothing else, while `record_purchase` raises on a null **`p_provider_id`**; the **typed price, persisted with the basket**, because a purchase price is entered rather than looked up and §2.11 persists the basket it belongs to; **the live round trip** that proves Postgres accepts a purchase, which nothing in this repository has ever performed; the **cashier asymmetry**, measured rather than inferred; **`Comprando a:`** — the provider chosen FIRST, in the header (C3.11); **changing the provider re-prices every row** already on screen (C3.11); the **three price states** §2.8 requires to look different, the middle one *empty and required* and visibly not a prefill; **C3.12**'s dash, never `$0.00`; **C3.13** — the slide blocked while any row has no price, and the banner that says so; setting that missing price **fast from where** the shopkeeper already is; the sheet, the slide and the confirmation, **the shape 5f-iii shipped**; **no 50-centavo rounding here** (**C12.3**); **what Costos shows**, the word deferred onto this row on 2026-09-22; and the button `5d-iii` **drew dead on La Familia**, which is the surface that word lands on | `XL` — **split, an `M`, an `M/L` and an `S`** | ✅ **UNGATED when it was taken.** ⚠️ **One of the three children is not: `5g-iii` is blocked on the word the owner owes, and it is the only one that is** |
| **5g-i** | ✅✅ **DONE 2026-09-24 — THIS APP HAS RECORDED ITS FIRST DELIVERY, AND A GUARD REFUSED THE FIRST DESIGN OF ITS OWN CHECK.** ~~this is the next task, as of 2026-09-24~~ — ⚠️ **struck in lower case deliberately, the rule `5b.8-i`'s row records: `plan-handover.sh` reads the raw line and a strikethrough is only a rendering.** **It is the half of `5g` a machine can hold.** **Everything Comprar needs from Postgres, and NO SCREEN.** The **provider list read** — `provider`'s named columns behind `src/api/providers.ts` and one hook (`R12`, `R13`), the generic row first, because F6 makes it the default and it is a ROW rather than a blank. The **price memory read** over `provider_price_memory` (`0008`), per (provider, variant), **never across providers**: §2.8's middle state exists because a supplier price is a fact about a relationship, and a prefill borrowed from another provider is a guess wearing a memory's clothes. ⚠️⚠️ **THE FIGURE IS STORED PER BASE AND THE SHOPKEEPER READS IT per PRICE UNIT** — a `numeric(14,6)` per base against `$8.50 / kg` — which is the conversion `priceCentavos` already makes in the other direction, made once here rather than twice on a screen. ⚠️ **And `last_qty_display_unit` is the denomination she typed LAST TIME, which need not be the variant's price unit today**, so it is offered and never assumed. The **provider on the purchase payload**: `draftOf` builds `location_id` and `lines` today, and `record_purchase` raises `22023` on a null **`p_provider_id`** (`0018:200`) — so the buy side cannot commit at all until this lands, which is a change to SHIPPED code and not a new module. The **typed price, persisted with the basket** — `Quotes` is the map `5f-i` built and nothing fills, and §2.11 persists the basket for the same reason a half-keyed delivery must not lose the figures somebody has already read off a note. ⚠️⚠️ **THE INSTRUMENT IS `docs/checks/5g-i-purchase-contract.sh` AND ITS FALSIFIER: the live round trip, over real HTTP against a reset database.** `5f-i`'s row named it as this one's, and nothing in this repository has ever sent `record_purchase` anything. ⚠️⚠️ **IT ALSO PINS THE cashier asymmetry, MEASURED 2026-09-24 AND NOT INFERRED**: a cashier reads the provider list (200, one row), reads **zero** rows of the memory (200 and an empty array, never a 403), **records a delivery successfully** (200 — the RPC carries the location wall and no role fence at all) and then reads **zero** purchases back. ⚠️ **It ships no migration.** | `M` | ✅ **UNGATED** |
| **5g-ii** | ⚠️⚠️ **THIS IS THE NEXT TASK, AS OF 2026-09-24.** **Comprar itself, and nothing in this repository can say whether it looks right.** **`Comprando a:`** in the header — the provider is chosen FIRST and the screen is about a relationship before it is about products (C3.11) — and **changing the provider re-prices every row** already on screen, which is the half of C3.11 a session would leave out because the basket looks unchanged. The **three price states** §2.8 requires to look different, and **the middle one is the one that matters**: *you have bought this, but never from THIS provider* renders **empty and required**, visibly not a prefill — *"an empty required field asks a question; a wrong prefill answers one nobody asked"*. **C3.12**'s dash for no memory, never `$0.00`. **C3.13** — the slide is BLOCKED while any row has no price, a banner says so, and setting the missing price is **fast from where** she already is, which is the opposite of Vender's C3.14 and is the owner's own rule. The search, the row, the quantity control, the sticky bar, the sheet, the slide and the two confirmation animations are **the shape 5f-iii shipped**, and this is the THIRD drawing of a search box — §2.8's *"three capture screens sharing one engine underneath"* is the sentence that makes the extraction due here rather than a tidy-up, and `src/ui/` is built across `5d`–`5h` while `5h.5` writes its conventions after. ⚠️ **No 50-centavo rounding here** (**C12.3**): it is a selling convenience and a delivery is paid to the centavo. ⚠️⚠️ **`R9` AND §2.11: THE OWNER'S PHONE IS THE WHOLE INSTRUMENT.** Every judgement left in this child is rendering, navigation or layout, and no check here will ever say it is wrong. ⚠️ **It ships no migration.** | `M/L` | ✅ **UNGATED** — `5g-i` is closed and nothing is owed that touches this row. ⚠️ **It inherits one question to PUT to the owner rather than to answer**: what a cashier is told when her price memory comes back empty because she may not read one |
| **5g-iii** | ⚠️⚠️ **GATED ON THE WORD THE OWNER OWES, AND THAT IS THIS CHILD'S WHOLE REASON FOR EXISTING.** **`Costos` — the button `5d-iii` drew dead on La Familia and this is what wakes it.** Ruled 2026-09-22: *"Leave Costos dead until `5g`"* — a deferral with a condition on it, and the condition is met the moment `5g-i` can read a purchase price. ⚠️ **But *until `5g`* said WHEN, not WHAT**, so **what Costos shows** is still owed and a session must not pick: last price paid and to whom, a per-provider comparison, and a trailing series are three different screens over the same rows, and §2.11 fences every one of them out of this repository's suites. ⚠️⚠️ **IT IS SPLIT OFF FOR REASON 1 OF THE WORKING AGREEMENT AND NOT FOR SIZE** — half the row is blocked on a decision and the other half is not, which is exactly the arrangement that let `5f-i` ship the day `5f-ii` was gated. ⚠️ **And the screen it lands on is not Comprar**: `familia/[id].tsx` is where the dead button is, so this child touches a file the other two never open. ⚠️ **It ships no migration.** | `S` | ⛔ **BLOCKED — the owner owes one word.** It is parked in ⛔ DECISIONS OWED and it blocks this child alone |
| **5h** | **Vender.** `price_list` prefill, the `$0.00` amber path, the **50-centavo ceiling on the basket total and nowhere else** (C12.3), `record_sale`. ⚠️⚠️ **AND THE UNDO, RULED BY THE OWNER 2026-09-22.** One *undo* on the document just committed, over `void_transaction` (`0021`) — applied since 2026-09-04 and **never called by anything**. ⚠️ **Nothing is edited or deleted**: a mirror-image document cancels the first, both stand in the ledger, and `<kind>_one_reversal_idx` already makes a document reversible AT MOST ONCE. ⚠️⚠️ **TWO THINGS A SCREEN MUST NOT INVENT:** the window is read from `workspace_setting.void_window_minutes` (`0001:561` — *"the client reads it to render correctly"*), so **hardcoding 15 is wrong the first time a shop changes it**; and the fence is a **role boundary, not a deadline** — a cashier undoes their OWN document inside the window, a manager or owner undoes ANYTHING at any time with no window. ⚠️ `void_transaction` takes `purchase`, `sale` and `waste`, so this is one affordance for three screens: `5h` builds it, `5g` and `6a` reuse it | `M` | ⚠️ **areas 5 and 6** |
| **5h.5** | ⚠️⚠️ **THE `src/ui/` HALF OF THE CONVENTIONS, RE-HOMED HERE 2026-09-18 WHEN `5b.5` CLOSED — a decision taken on the owner's behalf, named in that session's closing message and in its PR.** `CONVENTIONS.md`, third pass: the shared-component conventions, written once `5d`–`5h` have produced real primitives. ⚠️ **`5b.5` could not write them and did not pretend to** — there is no `app/src/ui/` and there was none on the day it ran; the only shared component in the app is `src/scaffolding/Pendiente.tsx`, which exists to say a screen is not built yet. Describing primitives that do not exist is precisely what the owner refused on 2026-09-13 (*"rather than ten primitives guessed at against screens nobody has drawn"*), and ADR-035 §2.10 says the claim is **order relative to step 6**, not the letter of the task. ⚠️ **This row owes `docs/CONVENTIONS.md` a pass, and `docs/checks/conventions-gate.sh` reads that sentence** — the page names this task in its own heading and the gate compares the two, so neither copy can go quiet alone. Numbered in the shape of `4.5`/`5b.5`: an interstitial obligation, not a build step. ✅✅ **AND ADR-035 §3 NAMES IT, AS OF THE OWNER'S RULING OF 2026-09-18** — *"amend ADR-035 §3 to say 5h.5"* — so this row is no longer the only place the third pass exists, and `docs/checks/conventions-gate.sh` asserts the ADR still names it. | `S` | ⚠️⚠️ **GATED ON `5h` CLOSING, AND IT IS THE LAST MOMENT THIS IS CHEAP.** `src/ui/` is built across `5d`–`5h` (ADR-035 §2.11 names ~10 primitives; §3 requires them before step 6), so this is the first day a real pattern exists and the last day before step 6's four screens arrive to one. ⚠️ **If step 6 is reached with this row open, the four screens arrive to nothing** — which is the outcome §2.10 and §3 were both written to prevent, and the reason `5b.5` existed at all |
| **5i** | ⚠️ **DEFERRED OUT OF `5a-iii` ON 2026-09-11 — THE v2 PILOT'S SIGN-IN.** **Facebook.** One `signInWithOAuth({provider:'facebook'})` on the shell `5a-iii` already built, **plus the `linkIdentity()` path for the accounts that exist by then** and `enable_manual_linking` (`supabase/config.toml:188`, `false` today). ⚠️ **The code is the smallest part of this task.** | `S` code, `M` everything else | ⚠️⚠️ **A PUBLIC `aviso de privacidad` PAGE.** Facebook Live mode needs it, Google publishing needs it, and LFPDPPP owes it regardless — **one page unblocks all three.** Plus the Facebook app and a Business portfolio ⚠️⚠️ **AND TWO PILOT-DAY INSTALL FINDINGS, PROMOTED FROM PROSE 2026-09-13 — neither is about sign-in, both block getting the app ONTO a pilot phone.** ⚠️ **Samsung's Auto Blocker can refuse a sideloaded install**, and C1.1 puts a Samsung among the four devices while there is no Play listing until this step — measured on a borrowed Galaxy Z Flip 8, where it also held the USB-debugging toggle shut. ⚠️ **The Release APK is signed with Expo's DEBUG keystore**; an app later signed with a real one cannot update an install made with this one — it must be uninstalled first, which costs a shop its local data. **Same family as the provisional bundle id: free now, not free once a pilot phone holds an outbox.** |

#### ⚠️⚠️ Sized 2026-09-24 — `5g` IS AN `XL` AND IT SPLITS THREE WAYS, AND SIZE IS THE WEAKEST OF THE THREE REASONS

⚠️⚠️ **THE ROW SAID `M`, AND AN `M` IS ONE SITTING UNDER THE AGREEMENT THE OWNER
AMENDED THE SAME DAY. SO THIS SECTION HAS TO CARRY ITS ARGUMENT AND NOT JUST ITS
CONCLUSION** — *"a size-only split at `M` or `L` is now the thing to refuse, and a
session that wants one is asking for the old rule back."* **All three of the
agreement's surviving reasons apply here independently, and they are given in the
order of their strength rather than the order they were found.**

##### Reason 2 — two failure classes, and one of them is invisible here

⚠️⚠️ **THIS IS THE STRONG ONE, AND IT WAS MEASURED ON 2026-09-24 AGAINST A RESET
DATABASE RATHER THAN ARGUED FROM THE MIGRATIONS.** Three fences, and no two of them
agree:

| Surface | Who may | Where it is written |
|---|---|---|
| `provider` — the list Comprar's header chooses from | **any member**, cashier included | `provider_select`, `0002:522` — `my_workspaces()` and nothing else |
| `provider_price_memory` — the prefill | **manager and above** | inherited, not restated: the view is `security_invoker`, so `purchase` and `purchase_line`'s own policies apply (`0003:558`) |
| `record_purchase` — the write | **any member who may act in that store** | `0018:165` — `security definer`, §2.6's location wall, and **no role check at all** |

⚠️⚠️ **WHAT THAT PRODUCES ON A CASHIER'S PHONE, DRIVEN OVER REAL HTTP WITH A
PUBLISHABLE KEY:** she reads the provider list (**200, one row**); she reads **zero**
rows of the memory (**200 and an empty array — never a 403**); she records a delivery
and it **succeeds** (**200**); and she then reads **zero** purchases back.

⚠️⚠️ **AND THE REASON THIS IS A SPLIT ARGUMENT RATHER THAN A BUG REPORT: EVERY
SYMPTOM OF THE BROKEN CASE IS A DESIGNED STATE OF THE WORKING ONE.** §2.8 requires
*new pairing* to render **empty and required** — so an empty memory is CORRECT
rendering, and it is exactly what a fence she cannot see also produces. **A screen
cannot tell them apart and a person looking at the screen cannot either.** Put the
read and the screen in one row and the half nothing can see is reviewed as though
somebody had looked at it — which is `5c-iv`'s, `5d-iv`'s, `5e-iii`'s and `5f-iii`'s
argument, made a fifth time by the sharpest instance of it yet.

⚠️ **The fences are NOT being changed here and no child proposes a migration.**
Whether Comprar should be manager-fenced in the app is a shop question — the memory
this project keeps says a cashier never accepts a delivery — **and it is `5g-ii`'s to
raise once there is a screen to raise it about.** What this sizing owes is that
nobody discovers it by accident.

##### Reason 1 — the gate

⚠️ **`5g-iii` is blocked on a word the owner owes and the other two are not.** The
ruling of 2026-09-22 was *"leave Costos dead until `5g`"*, which said **when** and
never **what** — and *last price paid*, *a per-provider comparison* and *a trailing
series* are three different screens over the same rows. **This is `5f-i`/`5f-ii`'s
arrangement one split later**, and splitting is what lets the unblocked work ship
while the question sits in the block that re-offers it every session.

##### Reason 3 — and only now, size

| | | |
|---|---|---|
| **Comprar is Vender PLUS four things** | a provider in the header, an **editable price per line**, three price states that must look different, and a commit that **BLOCKS** | none of the four has any precedent in this app |
| **Vender took four sessions** | `5f-i`, `5f-ii`, `5f-iii-a`, `5f-iii-b` | `app/src/app/(tabs)/vender.tsx` is **1,792 lines** |
| **And `5g` adds a data layer Vender never needed** | a new `src/api/` module, a read of two applied surfaces no line in `app/` touches, and the first live round trip against `record_purchase` | `5d-i` was an `M` on its own for less than this |

##### ⚠️⚠️ What the sizing found, and none of the three was in the row

| | The finding | Why it changes the work |
|---|---|---|
| **1** | ⚠️⚠️ **THE PURCHASE PAYLOAD HAS NO PROVIDER IN IT** | `draftOf` builds `location_id` and `lines`. `record_purchase` raises `22023` — *"record_purchase: provider_id is required — a delivery has a counterparty"* — on a null one (`0018:200`). **So the buy side of a module that already SHIPPED cannot commit at all**, and the row read as though Comprar were only a screen |
| **2** | ⚠️⚠️ **A TYPED PURCHASE PRICE HAS NOWHERE TO LIVE** | C3.13 makes the price something a person **enters**, and `Quotes` is the map `5f-i` built for exactly this and left empty. §2.11 persists the basket because a phone rings mid-sale — **and a delivery note's figures are worse to re-key than a basket, because she has to find the note again** |
| **3** | ⚠️⚠️ **THE PREFILL IS STORED PER BASE AND READ PER PRICE UNIT** | `provider_price_memory.unit_price_net_per_base` is a `numeric(14,6)` per BASE unit; she reads `$8.50 / kg`. And `last_qty_display_unit` is the denomination she typed **last time**, which need not be the variant's `price_unit_code` today. That is arithmetic, and none of it exists in `app/` |

⚠️⚠️ **AND A FOURTH THAT IS NOT A DELIVERABLE BUT A DISAGREEMENT WITH AN APPLIED
MIGRATION.** F6 requires *"a provider named `Genérico` … in every workspace"*.
`onboard_workspace` has seeded one since `0002` on 2026-08-26, carried through `0027`
and `0034` untouched, **and it is named `Compra directa`** — read off a live database
rather than off the file. ⚠️ **F6's SUBSTANCE is satisfied**, which is why no child
owns it: what F6 actually requires is that the ROW exist, because
`purchase.provider_id` is `not null`. **What is in dispute is a string a shopkeeper
reads in `Comprando a:` on every delivery she records**, and it is parked in the
decisions block because it is free to choose today and a fix-forward migration plus
an `update` over live rows once a shop has bought anything.

⚠️ **One more measurement, recorded so the next session does not re-take it:**
`unit_price_net_per_base` comes off the wire as a **JSON number** (`0.018000`), which
is a double — and `@tienda/money`'s `parseDecimal` refuses a number argument outright.
**The read must cast `::text`**, exactly as `PRICE_COLUMNS` already does one table
over, and assertion 4 of `5d-i`'s check is the precedent for asserting it off the wire
rather than off the column string.

##### The seam

| child | what it is | what can look at it |
|---|---|---|
| `5g-i` | the provider read, the price memory, the payload's provider, the persisted typed price | a node suite **and a live round trip** — the first this repository has ever run against `record_purchase` |
| `5g-ii` | Comprar itself: the header, the three price states, the block, the sheet and the slide | the owner's phone (`R9`, §2.11), and nothing here |
| `5g-iii` | `Costos`, on La Familia | **his word first**, then his phone |

⚠️ **`5g-iii` opens a file the other two never touch** — `app/src/app/familia/[id].tsx`
— which is the cheapest available check that this seam is real rather than
administrative.

#### ⚠️⚠️ Sized 2026-09-24 — `5f` IS AN `XL` AND IT SPLITS FOUR WAYS, AND THE ROW ASKED FOR THAT ITSELF

Sized on the day it was taken and before a line of it was written, under the
working agreement — the same discipline that split `5a` four ways, `5a-iii` two,
`5b.8` three, `5b-iii` four, `5b-iii-d` two, `5c` four, `5c-ii` two, `5c-ii-b`
two, `5c-iv` two, `5d` four, `5d-iv` two, `5e` three and `5e-iii` two. ⚠️ **This
row is the only one that asked in its own text**: *"SIZE IT BEFORE BUILDING ANY OF
IT — this row lists a screen, a stepper, a basket, a slide-to-commit, a price
change and a persistence setting, which is not one sitting."*

**Why one sitting was wrong, in one line:** it is not one sitting and it is not
even one KIND of work. Twenty deliverables, and they divide into a store and its
arithmetic, two screens, and a question the owner owes.

##### The seam — `5d`'s and `5e`'s, applied to a row that carried three kinds of thing

`5d` split on the argument that `5d-i` is the half a machine can hold and the rest
is the half only the owner's eye can; `5e` split the same way, and `5e-iii` again
one level down. **`5f` carries that seam and a second one.** So:

| child | what it is | what can look at it |
|---|---|---|
| 5f-i | the cart store, the quantity arithmetic, the commit payload | a node suite, and nothing else — no screen, no component |
| 5f-ii | the list and the row, drawn, committing nothing | the owner's phone (`R9`, §2.11) |
| 5f-iii | the sheet, the slide, and the first thing this app has ever enqueued | his phone for the look, **the queue for the rest** |
| 5f-iv | the `...` price change and its persistence setting | his ruling first, then his phone |

⚠️⚠️ **AND THE ARGUMENT IS A FAILURE ARGUMENT BEFORE IT IS A SIZE ONE, which is
what `5c-iv` and `5d-iv` established: the four halves FAIL DIFFERENTLY.** `5f-i`'s
mistakes are silent and land in the ledger — a gross-for-net confusion understates
IVA on every line and nothing anywhere goes red. `5f-ii`'s cost a glance. `5f-iii`'s
belong to the queue, the one part of this app whose failures are invisible by
design. `5f-iv`'s is a fence the owner has already ruled on once. **Putting them in
one row means the one nothing can see rides in on the back of the one only a person
can.**

⚠️ **`5f-iii` is a child rather than a paragraph of `5f-ii` for a reason that is not
size either: it WRITES.** Nothing in this app has ever enqueued anything, so `5c`'s
four children — the outbox, the flush, the dead-letter path and the banner — have
been built entirely against fixtures. The first real caller is worth its own row.

##### ⚠️⚠️ What the sizing found, and none of the three was in the row

| | The finding | Why it changes the work |
|---|---|---|
| **1** | ⚠️⚠️ **THE CART IS STATE BEFORE IT IS A SHEET, AND §2.11 HAD ALREADY DECIDED WHERE IT LIVES** | *"Zustand, cart only, persisted to `expo-sqlite`"*, with the rule that **nothing lives in both Query and the cart store**. The row said *basket sheet* and named no store at all — and **`zustand` is not a dependency of `@tienda/app`**, measured against `app/package.json`. It is pure JS, so it costs no `pod install`, which is the one thing that would have made it expensive: nothing in CI compiles this app |
| **2** | ⚠️⚠️ **THE QUANTITY CONTROL CONTRADICTS THE ADR, AND THE ADR WINS** | §2.8: *"stepper for discrete units, decimal keypad for weight and volume… **Never the same control for both**"*, and §2.11 names the primitive **`QtyInput` — the stepper/keypad SWITCH**. **C3.8 and the owner's specification of 2026-09-23 both put BOTH on one weighed line.** Parked as an **ADR amendment**, which is why `5f-ii` is gated and `5f-i` is not — the arrangement C3.17 produced one split earlier |
| **3** | ⚠️⚠️ **THE COMMIT PAYLOAD IS A DECISION AND NOT A TRANSCRIPTION** | `record_sale` takes `unit_price_gross_per_base`; `price_list` stores `price_per_base`; **§2.5 rule 2 anchors a SALE on gross and a PURCHASE on net**. They are the same number only while `workspace.prices_include_tax` is true. Every shop has it true by `0001`'s default, **so the pilot never sees the branch and nothing would go red** — which is exactly why the identity must not be hard-coded |

⚠️ **And a fourth, which is a boundary rather than a finding:** `5f-i` cannot prove
Postgres accepts the payload it builds. `record_sale` is `5h`'s and
`record_purchase` is `5g`'s, so **the live round trip is named on `5h` rather than
implied here** — a file is not evidence, and a child that asserted a shape and let
it read as a database agreeing would be this repository's own oldest defect.

##### ⚠️⚠️ And one thing §2.8 requires that NO row in this file held — it is now `5f.5`

ADR-035 §2.8's *Error prevention* names **three** guards, *"none blocking"*:
unit-aware input (`5f-ii`), review before commit (`5f-iii`'s sheet and slide), and
**the magnitude warning — *"flag any quantity or unit price beyond ~3× the trailing
median for that product"*.** ⚠️ **It appears nowhere in this plan**: the phrase and
its wording return nothing from the plan corpus and nothing from `app/src/`, and §6
does not defer it either. **What that search bounds is the plan and this app's
modules, not the shop** — but the guard is client behaviour, so those two are the
whole of where it could have lived.

⚠️ **It is `5f.5` and it is gated on `5g`, and that is not ordering taste**: §2.8
seeds the median from **purchase** history *"so it works from day one"*, and nothing
in this app has ever read a purchase. `5g` is the row that creates the history this
one reads — the shape `Costos` already has.

##### ⚠️ Decisions taken on the owner's behalf in this sizing

| | The decision | The alternative, and what it costs |
|---|---|---|
| **1** | **Four children rather than three** — the write got its own row | Folding the sheet and the slide into `5f-ii` makes the first enqueue this app has ever performed a paragraph inside a rendering task. Reversible for nothing: no code exists |
| **2** | **`5f.5` exists rather than §2.8 being quietly narrowed** | The alternative is amending the ADR to two guards, which is HIS to make, not a session's. The row costs nothing until `5g` closes and can be struck in one line |
| **3** | **`5f-i` reads `prices_include_tax` rather than assuming it** | Assuming it is one fewer read and is right for every shop today. It is wrong silently, in the ledger, for the first shop that answers *no* — and `useWorkspace` already carries the flag, so the read is free |

##### The split's own guard

`docs/checks/specs/5f.split` is the **sixteenth** split spec — **twenty
deliverables over four children**, twelve required sentences and one every child
must carry (*it ships no migration*, asserted positively because merging is
automated). The falsifier derives its fixtures from the spec, so nothing was wired
by hand.


#### ⚠️⚠️ Sized 2026-09-24 — `5f-iii` SPLITS IN TWO, AND THE SEAM IS THE COMMIT ITSELF

Sized on the day it was taken and before a line of it was written, under the
working agreement — the seventeenth split, and the same discipline that split
`5a` four ways, `5a-iii` two, `5b.8` three, `5b-iii` four, `5b-iii-d` two, `5c`
four, `5c-ii` two, `5c-ii-b` two, `5c-iv` two, `5d` four, `5d-iv` two, `5e`
three, `5e-iii` two and `5f` itself four. ⚠️ **Every `M/L` row in this project
has been split, and this one is an `M/L`.**

**Why one sitting was wrong, in one line:** it is a screen that shows a basket
and a gesture that commits one, and **only the second of those writes** — so
putting them in one row means the app's first-ever enqueue is a paragraph inside
a rendering task.

##### The seam — `5f`'s own seam, one level down

`5f` divided on the argument that `5f-i` is the half a machine can hold and the
rest is the half only the owner's eye can, **and `5f-iii` alone of the four still
carried both.** So:

| child | what it is | what can look at it | what it fails as |
|---|---|---|---|
| 5f-iii-a | the sheet, its arithmetic, `Quitar`, `Vaciar` and the emptying animation | a node suite for the arithmetic, his phone for the rest | a wrong row, a missing confirmation — **it costs a glance** |
| 5f-iii-b | the slide, the enqueue, the sale animation and the banner's first look | his phone for the look, **the queue for the rest** | a sale that never enqueues, or enqueues twice, or never triggers a drain — **invisible by design** |

⚠️⚠️ **AND THE ARGUMENT IS A FAILURE ARGUMENT BEFORE IT IS A SIZE ONE, which is
what `5c-iv`, `5d-iv` and `5f` each established.** `5f-iii-a`'s mistakes are the
kind a shopkeeper reports in a sentence. `5f-iii-b`'s belong to the queue, the one
part of this app whose failures are silent on purpose — and a cashier does not
report a sale she watched an animation confirm.

⚠️ **The order is not taste either.** §2.8's *Error prevention* names **review
before commit** as one of its three guards, and the review is the sheet. Building
the slide first ships a commit with nothing in front of it, on the screen that
takes a customer's money.

##### ⚠️⚠️ What the sizing found, and it was not in the row

| | The finding | Why it changes the work |
|---|---|---|
| **1** | ⚠️⚠️ **THE SHEET IS THE SCREEN §2.5 RULE 5 IS WRITTEN ABOUT, AND `5f-i` BUILT NO LINES FOR IT** | Rule 5: *"the displayed lines fail to sum to the displayed total on the review screen, which is the one screen where a customer is checking the arithmetic by hand."* `basketOf` returns `{centavos, lines, complete}` — **a count, not the lines** — so the sheet has nothing to draw a row from and the obvious move is for it to price its own. That is **two arithmetics over one basket**: they agree for every shop today, because `prices_include_tax` is true and `NO_TAX_RATES` is empty, and they part by a centavo the first time a rate rounds. **One function returns the lines AND the total, the total being their sum**, and the identity becomes a thing a suite reads instead of a thing a reviewer hopes for. ⚠️ **It makes `5f-iii-a` a checkable child rather than a rendering one — which is the lesson `5e-iii.split` wrote down in its own postscript: a "pure rendering" child is a claim to check on the day it is taken, not on the day it is sized** |
| **2** | ⚠️ **THE TWO ANIMATIONS BELONG TO DIFFERENT CHILDREN, AND THE ROW HAD THEM AS ONE DELIVERABLE** | *"a simple confirmation animation if the sale is done and another one if we empty the carrito"* (2026-09-21). The emptying one fires from `Vaciar carrito`, which is the sheet's; the sale one fires from the slide, which is not. `5f.split` carries them as a single `CONFIRMATION ANIMATIONS` deliverable — **here they are two**, so that `5f-iii-a` cannot ship a `Vaciar` whose confirmation is orphaned in its sibling |
| **3** | ✅ **THE GESTURE COSTS NO `pod install`, AND THAT WAS MEASURED RATHER THAN HOPED** | `react-native-gesture-handler` (`~2.32.0`), `react-native-reanimated` (`4.5.1`) and `react-native-worklets` (`0.10.1`) are already dependencies of `@tienda/app` — read off `app/package.json` on 2026-09-24. ⚠️ **It matters because no CI compiles this app**: a native dependency added in step 5 goes green all the way to a Mac. The slide is drawable from what is installed |

##### ⚠️ Decisions taken on the owner's behalf in this sizing

| | The decision | The alternative, and what it costs |
|---|---|---|
| **1** | **Two children rather than one sitting, with the sheet first** | Folding them makes the first enqueue a paragraph inside a rendering task, and ships a commit control with no review in front of it. Reversible for nothing: no code exists |
| **2** | **The sheet's rows and the sticky `Total` come out of ONE function** | The alternative is the sheet pricing its own rows, which is one fewer function and is right for every shop today. It is wrong silently, in front of a customer doing the sum by hand, for the first shop whose rate rounds |

##### The split's own guard

`docs/checks/specs/5f-iii.split` is the **seventeenth** split spec — **nine
deliverables over two children**, six required sentences and one every child must
carry (*it ships no migration*, asserted positively because merging is automated).
⚠️ **Six of the nine are also `5f.split`'s deliverables on the parent**, which
is deliberate and not a second home: there they must land in `5f-iii`, here in
exactly one of its children — the arrangement `5c-iv.split`, `5d-iv.split` and
`5e-iii.split` already stand in.

#### ⚠️⚠️ Sized 2026-09-22 — `5c-ii-b` SPLITS IN TWO, AND THE SEAM IS THE READING

Sized on the day its gate cleared and before a line of it was written, under the
working agreement — the same discipline that split `5a` four ways, `5a-iii` two,
`5b.8` three, `5b-iii` four, `5b-iii-d` two, `5c` four and `5c-ii` two. ✅ **Nothing
gates the first half**: both instruments came free on 2026-09-21.

**Why one sitting was wrong, in one line:** the row reads as one subject — *"when a
flush runs"* — and is actually **a READING taken on two devices** and **the CODE that
reading decides**, ⚠️⚠️ **and the second cannot be written honestly until the
first is in.**

| Task | What it is | Size | Blocked on |
|---|---|---|---|
| `5c-ii-b-1` | The reading — two libraries, two instruments, the link actually dropped, the loser deleted | `S/M` | — |
| `5c-ii-b-2` | The trigger — one signal, the reconnect, the wake, the cadence | `M` | `5c-ii-b-1` |

**Where the seam is, and why it is NOT "install it" and "use it".**

| | Its characteristic failure | Who would notice | The instrument |
|---|---|---|---|
| `5c-ii-b-1` | The wrong library is chosen — or the right one is chosen for a reason nobody measured, and the phone then reports something no changelog mentioned | nobody, until a pilot shop quietly stops flushing | ⚠️⚠️ **two devices and a dropped link, and nothing else.** No node process can ask either library anything |
| `5c-ii-b-2` | The queue never drains, or drains so eagerly it burns a phone's battery between customers | the pilot shopkeeper, as *"the app is slow"* | a Vitest suite over the cadence **policy**, which is writable only once the signal's shape is known |

⚠️⚠️ **AND THE SECOND HALF'S SHAPE IS AN OUTPUT OF THE FIRST, WHICH IS WHAT MAKES
THIS A SEAM RATHER THAN A PAUSE.** The open question is not only *which library* but
**what the signal carries**. ADR-035 §2.6 calls mobile data *"a fallback whose 1–2
minute figure is background flush cadence, not single-write latency"* — so a cadence
that varies by connection type is a live possibility rather than a hypothetical, and
⚠️ **the simulator cannot answer it**: it shares the host's network stack and has
no cellular radio. **If the answer is yes, `5c-ii-b-2` reads a signal with a TYPE on
it; if no, it reads a boolean.** Writing that module first means writing it twice.

**DECISIONS TAKEN IN THIS SIZING — no migration, no product code, both cheap to
reverse:**

| | Decision | Why | Reversal |
|---|---|---|---|
| **1** | **`5c-ii-b` splits in two rather than staying one `M` sitting** | ⚠️ **The honest counter-argument first, because this is the THIRD split-shaped session in three days and this project's process is already heavy.** It is not process for its own sake: the first half installs a **native** dependency, which on this app means a fresh prebuild and a full Gradle and `xcodebuild` cycle on two platforms before a single value can be read — and a session that runs out mid-build loses the reading *and* the code. **The split costs one spec file the generic engine already runs**, and it buys a reading that survives a context clear | Merge the two rows; delete `docs/checks/specs/5c-ii-b.split` |
| **2** | ⚠️ **The seam is THE READING / THE CODE IT DECIDES, not "install" and "use"** | An install seam would put the dependency *choice* in the first half and the *reason* for it in the second — the arrangement this project has refused twice, where a choice is defended by a green run that never asked the question. The reading half ends with two tables of observed values and a **deleted** dependency, not with an import | Move the install into `5c-ii-b-2`; it is one `npm i` and one prebuild |

#### ⚠️⚠️ Sized 2026-09-20 — `5c-ii` SPLITS IN TWO, AND THE SECOND HALF CANNOT BE MEASURED TODAY

Sized on the day it was taken and before a line of it was written, under the working
agreement — the same discipline that split `5a` four ways, `5a-iii` two, `5b.8` three,
`5b-iii` four, `5b-iii-d` two and `5c` four yesterday. ✅ **Nothing gates the first
half**: `5c-i` shipped the queue this morning, so there is something to drain.

**Why one sitting was wrong, in one line:** the row reads as one subject — *"the
flush"* — and is actually **what a flush DOES** and **WHEN one runs**, which are not
two sections of one job but two jobs with different instruments, ⚠️⚠️ **and one of
them has no instrument available today.**

| Task | What it is | Size | Blocked on |
|---|---|---|---|
| `5c-ii-a` | The drain — oldest-first, single-flight, and the retries the uuid makes free | `M` | — |
| `5c-ii-b` | When it runs — the connectivity signal, the reconnect, the cadence | `M` | ⚠️ an instrument, not code |

**Where the seam is, and why it is there rather than at "the code" and "the wiring".**

| | Its characteristic failure | Who would notice | The instrument |
|---|---|---|---|
| `5c-ii-a` | A sale is sent **twice**, or is claimed and then sits in the queue forever because nothing settled it | Números, days later | a Vitest suite over the decision, **plus a round trip over real HTTP that sends one uuid to `record_sale` twice** |
| `5c-ii-b` | The queue never drains, or drains so eagerly it burns a phone's battery between customers | the pilot shopkeeper, as *"the app is slow"* | ⚠️⚠️ **two devices, and nothing else.** No node process can ask `expo-network` anything |

⚠️⚠️ **AND THE SECOND ROW OF THAT TABLE IS NOT AVAILABLE ON 2026-09-20, WHICH IS
WHAT TURNED A SIZING JUDGEMENT INTO A MEASUREMENT.** The sizing of `5c` deliberately
left one thing undecided and said so — *"which connectivity source `5c-ii` reads …
that is `5c-ii`'s call, on the evidence of what the two actually report on both
instruments"*. Taking that call today needs an iOS reading, and **there is no iOS
instrument free to take one**:

* ~~**This Mac has no iOS Simulator.** `xcode-select -p` is `/Library/Developer/CommandLineTools` and `xcrun simctl` is not installed — *"unable to find utility simctl, not a developer tool or in PATH"*. Checked, not assumed.~~ ⚠️⚠️ **NO LONGER TRUE AS OF 2026-09-21, AND THIS IS THE TENTH STALE COPY RECORDED IN THIS REPOSITORY — THE FIRST CAUSED BY THE MACHINE CHANGING UNDER A TRUE SENTENCE RATHER THAN BY A COPY DRIFTING.** **Xcode 26.6 (17F113) is installed**, with an **iOS 26.5 runtime and eleven simulated devices**; `iPhone 17` was booted to prove it and shut down again. ⚠️ **`xcrun simctl` still fails**, which is why this was nearly missed twice: `xcode-select -p` STILL points at `/Library/Developer/CommandLineTools`, so every `xcrun` call misses Xcode entirely. The binaries are at `/Applications/Xcode.app/Contents/Developer/usr/bin/` and must be called by full path, or `xcode-select -s` run once. ⚠️⚠️ **THE SENTENCE WAS TRUE WHEN WRITTEN ON 2026-09-20 AND IS STRUCK RATHER THAN DELETED**, because the sizing decision below rests on it and a record that quietly rewrites its own premise cannot be audited. **What it changes is HOW the iOS half of `5c-ii-b` is measured, not whether `5c-ii-b` is gated** — that gate was the day-8 reading, and it is now discharged.
* **The owner's iPhone is an instrument in use.** It is holding the `5a-iv-d` day-8 reading due **2026-09-21**, and the ⏳ block says in terms that opening the app restarts the clock. A connectivity reading means launching a build.

**So the whole row, taken today, forces one of two bad moves**: choose the dependency
from two changelogs — which is exactly what [[measure-both-platforms-not-one]] exists
to stop, after iOS and Android disagreed three ways in one day — or spend tomorrow's
reading on it. ⚠️ **Splitting costs neither.** `5c-ii-a` needs no device at all, and
`5c-ii-b` becomes takeable the moment the day-8 reading is in.

⚠️ **THE TRIGGER IS THE PART THAT WANTS TO RIDE ALONG**, which is `5c-iv`'s argument
one level down, reused rather than invented: the cheapest thing a session writing the
drain can do is add the listener while the file is already open — and then the native
dependency has been chosen inside a task whose green CI run says nothing about it. The
spec holds `5c-ii-a`'s row to *"NEVER DECIDES WHEN IT RUNS"* for that reason.

**DECISIONS TAKEN IN THIS SIZING — no migration, no product code, both cheap to
reverse:**

| | Decision | Why | Reversal |
|---|---|---|---|
| **1** | **`5c-ii` splits in two rather than staying one `M/L` sitting** | Eight deliverables over two layers, one of which is unmeasurable today. ⚠️ **The honest counter-argument, recorded rather than skipped:** this project's process is already heavy, and a second split-shaped session in two days is process outgrowing product. It is not one — **the split and its first half ship together**, in this session, so the sizing costs the build nothing | Merge the two rows; delete `docs/checks/specs/5c-ii.split` |
| **2** | ⚠️ **The seam is WHAT A FLUSH DOES / WHEN ONE RUNS, not "logic and wiring"** | The two halves fail differently and are read by different instruments — and putting `recorded_offline` in the first half is what makes the *"not committed on its first attempt"* rule falsifiable over HTTP instead of being a sentence about a device | Move the trigger into `5c-ii-a`; it is one module |

⚠️ **The split is a SPEC, not a guard** — `docs/checks/specs/5c-ii.split`, the second
written under the procedure `docs/HANDBOOK.md` records and the ninth split in the
repository. `app.yml` already matches `docs/checks/specs/**`, so there is nothing to
wire.

#### ⚠️⚠️ Sized 2026-09-20 — `5c` IS AN `XL`, NOT THE `L` THIS FILE CARRIED, AND IT SPLITS FOUR WAYS

Sized before a line of it was written, under the working agreement — the same
discipline that split `5a` four ways, `5a-iii` two, `5b.8` three, `5b-iii` four and
`5b-iii-d` two. ✅ **Nothing gates it**: `4.6b` unblocked the replay control on
2026-09-14, and `5c.5` closed on 2026-09-20 with the one measurement this whole
design rests on. The split is the only thing between here and offline code.

**Why the `L` was wrong, in one line:** the row reads as one subject — *"offline"* —
and is actually **fourteen deliverables across four layers that fail in four
unrelated ways**: a durable queue on a phone, a transport, a failure path that
writes to the ledger, and three pieces of chrome. ⚠️ **Three of the four are
falsifiable end to end and the fourth is not**, which is the tell that a row is
really four tasks rather than one with sections.

| Task | What it is | Size | Blocked on |
|---|---|---|---|
| `5c-i` | The outbox, and nothing in it talks — the table, the three states, the uuid, the enqueue | `M` | — |
| `5c-ii` | The flush, and the retries the uuid makes free | `M/L` | `5c-i` |
| `5c-iii` | The writes that will never land, and the only half that changes the ledger | `M` | `5c-ii` |
| `5c-iv` | What a person sees | `M` | `5c-iii` |

**Where the seams are, and why they are there rather than at "the queue" and "the
UI".** Each child fails in a way the others cannot:

| | Its characteristic failure | Who would notice | The instrument |
|---|---|---|---|
| `5c-i` | A sale is accepted by the screen and never reaches the queue — **lost on the device, silently** | nobody, ever | a Vitest suite. §2.11 names the outbox state machine as a thing a unit test may pin |
| `5c-ii` | A sale is sent **twice**, or sits in the queue while the app believes it flushed | Números, days later | a contract check over real HTTP against `record_sale` — `0016` has been applied since long before any screen |
| `5c-iii` | A transient failure is dead-lettered, or a permanent one is retried forever. **The ledger moves either way** | §2.10's nightly check, or nobody | the same contract check, driving `0024` and reading `stock_movement.failed_write_id` back |
| `5c-iv` | A person is told the wrong thing, or told nothing | the owner, on his own phone | ⚠️ **nothing here.** §2.11 keeps rendering out of scope; the plan row and `R9` are the whole instrument |

⚠️⚠️ **THE FOURTH LINE OF THAT TABLE IS THE REASON FOR A FOURTH CHILD RATHER THAN
THREE.** The cheapest thing a session building the flush can do is draw the offline
icon while the file is already open — and then the one half nothing can measure has
ridden along inside a task whose green CI run says nothing about it. `5b-iii-d`'s
split was made on this argument eleven days into the client build and its row still
carries it; this is the same argument, applied to the same hazard.

⚠️ **AND THE SEAM IS NOT "ONLINE" / "OFFLINE".** Every child works with no signal —
that is the subject. It is **storage / transport / the failure path / the chrome**,
which is also the order in which each one becomes possible: there is nothing to
drain until the queue exists, nothing is permanently rejected until something tried
to send it, and there is nothing to count in a banner until something dead-letters.

**DECISIONS TAKEN IN THE SIZING — no migration, no product code, all cheap to
reverse, and the last two are the ones worth reading:**

| | Decision | Why | Reversal |
|---|---|---|---|
| **1** | **`5c` is re-sized `L` → `XL`** | Fourteen deliverables, four failure modes, a new npm dependency, and a write surface with no caller yet. `5a-iii` and `5a-iv` were both re-sized upward on the day they were taken, and both were right to be | One letter |
| **2** | ⚠️⚠️ **`recorded_offline` IS DECIDED AT FLUSH — a write carries it when it was NOT committed on its first attempt** — rather than from what the device believed about connectivity when the shopkeeper slid | It decides whether the server overrides `occurred_at`, and therefore **which day a sale counts on in Números**. A connectivity guess is wrong in the expensive direction: a phone that thinks it has signal and does not marks the write online, and the server then stamps `now()` at flush — re-dating a 09:00 sale to 14:00, which is the precise harm §2.6's clamp exists to bound. The first-attempt rule needs no connectivity oracle and degrades safely: a blip at 09:00:05 flags a write offline, the client's own time is accepted, clamped, and nothing is wrong | Move the flag's decision point back to enqueue; it is one condition, and it is client code |
| **3** | ⚠️⚠️ **C10.3 IS DISCHARGED BY `5c-i`'s CONSTRUCTION, NOT BY A SCREEN** | *"The slide looks identical offline"* reads like a rendering rule, and §2.11 guarantees nothing here can hold a rendering rule. It is not one: **if enqueuing is the only write path, the screen is never told which it was**, so there is no second wording for anybody to add. Turning a promise about a screen into a property of the write path is the same move `5b-iii-d-1` made when it put a row's line order into a pure function | Let a screen `await` the RPC. ⚠️ Which is why the row says the confirmation NEVER WAITS FOR THE NETWORK, and why a check reads that sentence |
| **4** | **The outbox is a REAL SQLite table, not another key in the `localStorage` shim** | `@/lib/store.ts` is a key-value store over `expo-sqlite/localStorage`, and its own header says what is kept there is *"a per-phone preference"* whose loss must cost a tap. **A queued sale is not a preference**: it needs rows, an oldest-first order, an attempt count and a state, and losing one is losing money off the shelf | It is a new module beside the existing one; nothing already shipped moves |
| **5** | ⚠️ **THE DEAD-LETTER BANNER IS MANAGER-AND-ABOVE, and this was derived rather than asked** | Three settled statements already answer it and none of them is about this banner: §2.7 fences unrecorded revenue at the manager role, *"cost is manager-and-above; quantity is everyone"* was settled in 1.3a, and **C10.5 refuses to show a rejected write to the person at the counter at all**. A cashier can do nothing about a dead letter and is the one person the requirement names. ⚠️ **Recorded here rather than parked**, because a question three documents already answer is not a decision the owner owes. ⚠️⚠️ **AND `5c-iv` MUST WEIGH `owner` AGAINST `manager` ONCE MORE BEFORE IT DRAWS ANYTHING, because a precedent exists and it went TIGHTER:** `0024`'s decision 8 fences the `failed_write` TABLE at `owner` rather than `manager`, on the grounds that *"`payload` can carry COST for any kind"*. **It is a different surface** — the banner reads this device's own queue and shows no payload, only a count and a figure — so the looser fence is defensible, **but it is the REASONING that has to be repeated, not this answer** | One condition in the banner |

⚠️⚠️ **WHAT THE SPLIT DID NOT DECIDE, NAMED SO THE NEXT SESSION DOES NOT ASSUME IT
WAS:** which connectivity source `5c-ii` reads. `expo-network` is in the SDK and
needs no config plugin; `@react-native-community/netinfo` is the React Native
default and is a new dependency with one. **That is `5c-ii`'s call, on the evidence
of what the two actually report on both instruments** — and
[[measure-both-platforms-not-one]] is the reason it is not being taken today from a
reading of two changelogs.

⚠️⚠️ **AND THE THING A CLEARED SESSION IS MOST LIKELY TO GET WRONG HERE: `5c-i` HAS
NO CALLER, AND IT IS SUPPOSED TO.** Nothing in this app writes a sale, a purchase or
a waste — `5f`, `5g` and `5h` are those screens and none of them is built. The queue
is therefore built **ahead of** the screens that will use it, deliberately: §2.6 puts
every client write behind it, and a screen that learns to `await supabase.rpc` first
is a screen rewritten when the queue arrives. ⚠️ **The consequence is real and the
owner should hear it rather than discover it:** `5c-i` through `5c-iii` change
nothing he can see on his phone. The first visible thing in this step is `5c-iv`.

#### ⚠️⚠️ Sized 2026-09-11 — `5a-iii` IS AN `L`, NOT THE `M/L` THIS FILE CARRIED, AND IT SPLITS IN TWO

Sized before a line of it was written, under the working agreement — the same
discipline that split `5a` four ways, `4b` two and `4.5` three. ✅ **The gate cleared
the same day**, so the split is the only thing standing between here and auth code.

**Why the `M/L` was wrong, in one line:** the row reads as one subject — *"auth and
session"* — and is actually **eleven deliverables across four surfaces that fail in four
unrelated ways**: an app-identity block that is permanent at submission, a storage
choice that decides where a session lives, a redirect round trip with a half in somebody
else's dashboard, and navigation state. ⚠️ **Two of those are one-way doors and two are
not**, which is the tell that a row is really two tasks.

| Task | What it is | Size | Gate |
|---|---|---|---|
| **`5a-iii-a`** | **The client, the session, and the way in that needs no deep link.** `app.json`'s identity (**Wera**, `mx.bserafin.wera`, the scheme), `.env.example`, the Supabase client and where the session is **stored**, `AppState` refresh, the signed-in/signed-out route guard, **email sign-in, sign-up and explicit log-out** (C1.4). | `M` | ✅ **DONE 2026-09-11** — 90 assertions, 15 falsifications, and the key that bypasses RLS now refused in both spellings |
| **`5a-iii-b`** | **Google, and the last screen.** The OAuth round trip and **C1.3's last-screen restore**. | `M` | ✅ **DONE 2026-09-11** — 132 assertions, 15 falsifications, PKCE instead of the library default, and one gate assertion written, measured and deleted. ✅ **The dashboard edit was closed by the owner 2026-09-12** — reported, not measurable; `5a-iv-a` is the first instrument |

**Where the seam is, and why it is there rather than at "auth" / "session":** everything
in `a` works with the network off and the browser closed. Everything in `b` leaves the
app and has to be let back in. ⚠️ **That is also the failure-mode boundary**: `a` fails
visibly on the screen in front of you, and `b`'s characteristic failure is *the browser
opens and never comes back*, which looks identical to a hang.

##### ⚠️ DECIDED IN THE SIZING — THE SESSION LIVES IN `expo-sqlite`, NOT IN ASYNCSTORAGE

Supabase's React Native quickstart shows **two different storage adapters** and the one
most tutorials show is `@react-native-async-storage/async-storage`. **Expo's own current
quickstart uses `expo-sqlite/localStorage/install` instead**, and that is the one taken.

⚠️ **The reason is ADR-035 §2.11, which already chose `expo-sqlite`** — *"Local state:
Zustand, cart only, persisted to `expo-sqlite`"* — and `5c`'s offline outbox is built on
it. Adding AsyncStorage would put **two storage engines in one app** before the second
screen exists: two things to reason about when a session or a queued sale goes missing,
two things to clear, and a junior arriving in step 6 with no way to know which is which.
**The ADR picked a local store; a session is local state.**

⚠️ **What it costs, said plainly:** AsyncStorage is the better-documented path and the
one every blog post shows, so a future search will return advice that does not match
this repository. Reversing is one import and one option in a single file, and the
session is re-created by signing in again — **cheap today, and cheap in a year.**

##### ⚠️ Found in the sizing — THE ENV VAR IS NAMED FOR A KEY THAT NO LONGER EXISTS

`app/.env.local` carries `EXPO_PUBLIC_SUPABASE_ANON_KEY`, and **the value in it is a
`sb_publishable_…` key** — Supabase replaced the legacy `anon` JWT with publishable keys,
and the project was created after the change. The name is ours, nothing consumes it yet,
and it is wrong in the direction that matters: **`anon` is also half the name of
`service_role`'s counterpart**, so a future reader reconciling *"the anon key"* against a
dashboard that has no anon key is one plausible step from reaching for the secret one.
✅ **Renamed to `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`** while exactly zero lines of code
read it — `.env.local` on 2026-09-11, and the committed `.env.example` in `5a-iii-a`.
⚠️ **`docs/checks/5a-iii-gate.sh` caught the mismatch on its first run**, which is a
small thing that says something: the rename was already decided, written into this file,
and not yet done — and the plan cannot tell the difference between the two.

##### ✅ `docs/checks/5a-iii-gate.sh` — the instrument that cleared the gate, kept

⚠️ **The assertions that closed `5a-iii`'s gate existed only in a chat transcript**, and
they are the ones that found Google unwired on the Supabase side and confirmations still
on. A check that catches two real defects and is then thrown away is the shape of a
lesson this repository keeps re-learning, so it is committed.

⚠️⚠️ **IT CANNOT RUN IN CI, AND THAT IS STATED IN ITS OWN HEADER RATHER THAN LEFT TO BE
DISCOVERED.** It needs `app/.env.local`, which is gitignored, and it needs the network.
So it is **not** evidence in the sense §9 means. It is the local instrument for a surface
that lives in **someone else's dashboard and has no file to read** — and the rule it
obeys is the one underneath §9: *do not believe a report when you can measure.*

It asserts thirteen things and prints no value: the variable names (including **the
`NEXT_PUBLIC_` trap the owner actually hit** — Supabase's Connect dialog defaults to the
Next.js spelling, which Expo does not inline, so it is not a wrong value but **no**
value), the URL's shape, that **the key is not a `service_role`/`sb_secret_` one** —
which would hand every phone a key that bypasses RLS — and then the live provider matrix
against **the plan's** expectations, not the project's. ⚠️ **Facebook is asserted
`false`**, so enabling it in the dashboard without doing `5i` turns this red.

**Seven falsifications, all red**, the working tree committed first: J1 missing file · J2
the `NEXT_PUBLIC_` prefix · J3 a secret key in the client file · J4 a project that does
not exist · J5 a trailing slash · **J6 the expectation flipped to `facebook: true`**,
which proves the matrix is genuinely read rather than hardcoded to agree · **J7 every
assertion silently skipped**, which the anti-vacuity guard catches at *"only 7 ran,
expected at least 12"* — rule 4, and the fifth suite in this repository to carry one.

##### ⚠️⚠️ WHAT `5a-iii-b` CAN AND CANNOT PROVE, WRITTEN BEFORE IT IS BUILT

C1.3 — *"the app opens on the LAST SCREEN THEY WERE ON"* — is **navigation state**, which
is the category §2.11 refuses suites over. This is the **third** deliverable in `5a` to
hit that wall, after C12.1's tab labels and C1.4's *"session persists until an explicit
log-out"*, and it is written down **before** the task rather than discovered in its
falsification batch.

✅ **The half that is testable is the one that decides:** *which route should we restore
to, given a stored value and a session?* — a pure function over `(storedRoute, session)`
returning a route, with the rules that a route the user may no longer reach is refused,
an unknown route falls back, and a signed-out user restores to nothing. **That is a value
the app acts on**, and §2.11 admits it.

⚠️ **The half that is not: that the router actually lands there on a cold start.** No
unit test in this repository's rules can see it, and `5a-iv` — the owner's own phone —
is the instrument, exactly as it now is for C12.1. ⚠️ **`5a-iv` is accumulating
deliverables that rest on it alone**, which the four-way sizing did not know when it
called that task *"the only one no CI can verify"* as though that were a footnote.

##### Five falsifications over the sub-split, run by hand before it was committed

The unmodified file is confirmed green first, so a red is known to come from the break;
every fixture is diffed against the original before the check runs on it.

| | Break | Result |
|---|---|---|
| **H1** | The `5a-iii-b` row deleted | 🔴 *"no table row for 5a-iii-b"* |
| **H2** | C1.3 moved out of `5a-iii-b`, **parent untouched** | 🔴 *"the parent 5a-iii row still naming it is NOT the same claim"* |
| **H3** | C1.4 claimed by both halves | 🔴 *"owned by neither half"* |
| **H4** | Email sign-in silently leaves `5a-iii-a` | 🔴 *"C1.4 is not in 5a-iii-a"* |
| **H5** | Pointed at `docs/HANDBOOK.md`, which has no sizing table | 🔴 — it does not pass vacuously |

⚠️⚠️ **H2 IS THE ONE THE GUARD WAS WRITTEN FOR, AND IT WAS GREEN BEFORE THE GUARD
EXISTED.** The ten-deliverable loop scans `5a-i`..`5a-iv` only, so C1.3 was matched
against the **parent** `5a-iii` row and nothing looked at which half carried it — moving
last-screen restore into `5a-iv` would have left this file reading `10/10`. **That is the
same defect found hours earlier with C1.4 and Facebook, one level further down**, and it
is recorded because writing *"a deliverable is only as visible as the coarsest row that
names it"* and then not applying it to the next split would be the same bug with better
documentation.

#### ⚠️⚠️ Decided by the owner 2026-09-11 — FACEBOOK IS DEFERRED TO `5i`, AND THE v1 PILOT SIGNS IN WITH GOOGLE OR EMAIL

**The owner's call, taken while configuring the consoles**: *"How about if we only do
the auth for Google and leave Facebook for later?"* and then *"is there a way to defer
this to a v2 Pilot, having a fully developed one with only google and then enable it for
Facebook?"* ✅ **Both answers are yes**, and the reasoning is recorded here because the
thing that makes it safe is **not** the deferral itself.

**Why it is cheap, unlike the email-only version of the same trade that was refused two
days earlier.** Facebook's gate is heavier than Google's — Development mode needs each
tester to *accept an invitation on Facebook*, plus a Business portfolio, plus the
privacy-policy URL to go Live — while the marginal **code** is one call on a shell
`5a-iii` builds anyway. The deep link, the session, the storage adapter and the redirect
handling are the risky half, they are written once, and Facebook inherits all of them.
⚠️ **Cutting email instead would have removed a provider and kept every obligation**:
the `aviso de privacidad` page is owed to LFPDPPP whether or not Facebook ships.

**Who signs in with what, in the v1 pilot.** C1.5's two shops are two workspaces and two
different owners. **Merchant A's two phones are Google** (the owner's own count) and
never touch this. **Merchant B's two are the exposure, and they are the whole of it:**
two accounts, one shop.

##### ⚠️ THE RISK IS EMAIL ADDRESSES, NOT TIMING — and `linkIdentity()` is why the answer is still yes

Supabase Auth **automatically links** a new OAuth identity to an existing user when the
email matches and is **verified**, which is what makes "enable Facebook in v2" sound
free. It is free in exactly one case and not in two:

| | What happens in v2 |
|---|---|
| Facebook carries the **same** email as the v1 account | ✅ Linked automatically. Same user, same workspace, nothing to do |
| Facebook carries a **different** email | ⚠️ **A SECOND ACCOUNT.** Their workspace stays on the first one |
| ⚠️⚠️ **Facebook returns NO email** | ⚠️ **A SECOND ACCOUNT.** Phone-registered Facebook accounts are ordinary, and the user can decline the email permission — Supabase ships a provider-specific *"allow users without an email"* switch for Facebook precisely because of this |

✅ **SO `5i` SHIPS FACEBOOK AS TWO THINGS WEARING ONE NAME**, and the second is the one
that matters:

- **A new user** gets a sign-in button. Automatic linking, ordinary path.
- **An account that already exists** gets **`conectar Facebook`** — an action taken
  *while already signed in*, which calls **`linkIdentity()`** and attaches the identity
  to **the account the user is currently in, regardless of what email Facebook
  returns.** The email question does not arise.

⚠️ **This is [[prefer-the-option-that-adds-no-human-step]] applied to a trap that would
otherwise be sprung months later.** The obvious alternative — *"tell merchant B to sign
up in v1 using the email their Facebook account uses"* — is a human step, asked once, of
someone who will not remember it, and it fails silently a quarter later in a way that
looks like the app losing their shop. **It requires `enable_manual_linking`**, which is
`false` at `supabase/config.toml:188` today; flipping it is `5i`'s, not `5a-iii`'s.

##### ⚠️⚠️ Found in this decision — `C1.4` NAMES THREE PROVIDERS AND THE COVERAGE CHECK COUNTED IT AS ONE ATOM

**`docs/checks/5a-split-coverage.sh` stayed GREEN — 10/10 — across the edit that moved
Facebook out of `5a-iii`.** The regex `C1\.4` still matched the parent row and still
matched exactly one sub-task, so *"covered by exactly one sub-task each"* remained true
of a deliverable **one third of which had changed tasks.**

⚠️ **This is the failure the check was written to catch, in the one form its own
granularity hid.** The list of ten deliverables was assembled from the parent row's
wording, and the parent row compresses three providers into one decision reference — so
**a deliverable that is a list is only as visible as its coarsest name.** Nothing about
the check was wrong; its resolution was, and the split's F6 fixture (*one deliverable
claimed by two sub-tasks*) cannot see a third of one leaving.

✅ **Closed by asserting the deferral itself**, four claims rather than one mention: `5i`
exists and its **deliverable cell** is Facebook; `5i` carries a **real gate**, not an
em-dash; **no `5a-*` sub-task** names Facebook unless it says *deferred*; and the parent
`5a` row still **records the move** rather than deleting the promise.

⚠️ **The third of those is the load-bearing one.** A later session re-reading C1.4 and
"tidying" Facebook back into `5a-iii` is the realistic failure here — it looks like
fixing an inconsistency, and it would put an ungated task back on the critical path.

##### Six falsifications, run by hand before this was committed

Fixtures are copies of `docs/PLAN.md` with one thing broken, each diffed against the
original before the check runs on it, and the unmodified file is confirmed green first
so a red is known to come from the break.

| | Break | Result |
|---|---|---|
| **G1** | The `5i` row deleted entirely | 🔴 *"no table row for 5i whose deliverable is Facebook"* |
| **G2** | `5i` keeps its row but loses its gate | 🔴 *"a deferred task nobody is waiting on is how 'later' becomes 'never'"* |
| **G3** | Facebook quietly folded back into `5a-iii` | 🔴 *"either it has been folded back in without re-sizing, or two tasks now each assume the other owns it"* |
| **G4** | The parent `5a` row drops the promise instead of recording the move | 🔴 *"a coverage claim made true by forgetting"* — F4's lesson, held |
| **G5** | `5i` renamed away from Facebook, gate untouched | ⚠️🟢 **GREEN, then closed** — see below |
| **G6** | `5i`'s deliverable cell emptied, gate untouched | 🔴 after G5's fix |

⚠️ **G5 IS THE SECOND TIME IN THREE SESSIONS THAT A GUARD ASSERTED OVER THE WRONG UNIT.**
The first spelling grepped the **whole row** for *"Facebook"* — and `5i`'s **gate** cell
legitimately says *"Facebook Live mode"*, because that is what blocks the task. So a
fixture that renamed the task itself stayed green on a word surviving in a cell about
something else. **A row is not one string.** Fixed by reading the deliverable cell
(`awk -F'|' '{print $3}'`) and nothing else.

✅ It is the same shape as `5a-ii`'s F9 — *an assertion that ran, passed, and could not
distinguish the defect its own comment named* — which is now **twice**, and both times
the tell was a claim phrased about a specific thing while the code looked at a container
holding that thing among others.

##### ⚠️ What this does NOT defer, and it is the only real cost

**One public `aviso de privacidad` page, hosted on a domain the owner controls.**
Facebook needs it to leave Development mode. **Google needs the same page to publish**,
and Google's *Publish* button is disabled without it — which is what the owner hit on
2026-09-11 and what started this decision. LFPDPPP owes it regardless of both.

✅ **It does not block `5a-iii`, `5a-iv`, or any code**: Google's consent screen works in
*Testing* status for accounts listed as test users, up to 100 of them, and the pilot is
four. ⚠️ **It blocks PILOT DAY**, and it is written down here because it is currently
owed to two consoles and one law and was recorded in none of them.

⚠️ **Two things to measure on the owner's own phone in `5a-iv`, not to assume:**

- **Google's *"unverified app"* interstitial.** It is documented as tied to *sensitive
  or restricted* scopes, and this app requests only `email`, `profile`, `openid` — so it
  most likely never appears. **Most likely is not a result.** A shopkeeper asked to tap
  *"Advanced → go to Tienda (unsafe)"* is a week-one pilot death.
- **C1.4's *"session persists until an explicit log-out"* against Google's 7-day
  test-user token expiry.** The reading is that the expiry applies to Google's token and
  not to the Supabase session, which after first sign-in is its own JWT plus refresh
  token and never consults Google again. ⚠️ **That is an assumption about somebody
  else's system.** Sign in, put the phone down for eight days, open it.

#### ⚠️⚠️ Re-sized 2026-09-11 — `5a-iv` IS AN `L`, NOT THE `S/M` THIS FILE CARRIED, AND IT SPLITS FOUR WAYS

Sized before a line of it was attempted, under the working agreement — the same
discipline that split `5a` four ways, `5a-iii` two, `4b` two and `4.5` three. ⚠️ **This
is the first re-size in this project prompted by the task GROWING rather than by reading
it more carefully.** `5a-iv` was written on 2026-09-07 as *"a device build, a
nice-to-have before juniors arrive"* and carried one deliverable it alone could verify.
It now carries **eleven**, and nine of them arrived from three other tasks that each
discovered, separately, that what they had built could not be checked by a machine.

**Why the `S/M` was wrong, in one line:** it was sized as *an errand* — plug in a phone,
watch it launch — and it is **the only instrument this project has for an entire
category of claim**, which is a different kind of work with a different way of failing.

##### ⚠️⚠️ CORRECTED 2026-09-12 — THE CLOCKS ARE REAL, THE CONCLUSION DRAWN FROM THEM WAS NOT

⚠️ **The section below is kept as written and is WRONG in its conclusion.** It is not
rewritten because the error is the interesting part: **the two clocks are real and the
Android detour it prescribed was not.** What follows here supersedes it.

**What survives.** Google expires test-user refresh tokens at 7 days. A free Apple ID
signs an app with a 7-day provisioning profile. The reading is at day 8. Both facts hold.

**The sharper statement of the problem, which the section below did not reach.** It is
not *"three candidate causes"* — it is that **the 7-day ceiling sits below the 8-day
floor.** Refreshing the profile at day 7 means **launching the app**, and launching it is
precisely what restarts the measurement: `startAutoRefresh` fires, the token refreshes,
and the untouched window is gone. The reading does not fit inside the instrument's
lifetime *that way*.

✅ **AND THERE IS ANOTHER WAY, WHICH THE SECTION BELOW NEVER LOOKED FOR.** An expired
profile stops the app **LAUNCHING**. It does not touch the SQLite file the session lives
in. So: sign in on day 0, leave it, and on day 8 plug into the Mac, re-deploy, launch,
and look. The re-deploy is a confound **only if it wipes the app's data container** — and
an upgrade install over the same bundle id normally preserves it.

⚠️⚠️ **"NORMALLY PRESERVES IT" IS A CLAIM ABOUT APPLE'S SYSTEM, SO IT IS MEASURED.** The
day-0 pre-check, and it is `5a-iv-a`'s first step, before any clock starts:

1. Sign in.
2. Kill the app; re-deploy (`npx expo run:ios --device`).
3. Open it. **Still signed in?**

✅ **If yes, the whole of `5a-iv` runs on the owner's own iPhone 15 for nothing**, and
`5a-iv-d` needs no second device. ⚠️ **If no, THAT is what the $99 buys** — a one-year
profile — and the purchase becomes a measured necessity rather than a guess.

##### ⚠️⚠️ THE TWO ERRORS IN THE ORIGINAL CALL, NAMED, BECAUSE ONE OF THEM SHIPPED

**Both were mine, taken on the owner's behalf, and merged in `#72` before either was
caught.** The plan carried them for a matter of hours.

- ⚠️ **IT GATED THE PROJECT'S LONGEST-LEAD-TIME READING ON HARDWARE THE PLAN NEVER
  RECORDS THE OWNER OWNING.** C1.1's Oppo and Samsung are **the users' own** —
  *"not me to take their devices anywhere"* — and C1.6 records an iPhone and a Mac and
  no Android at all. The sizing flagged *"a scheduling unknown"* on `5a-iv-c` **and then
  made `5a-iv-d` depend on it anyway**, which is the more interesting half of the
  mistake: the risk was written down one row above the decision that ignored it.
- ⚠️ **IT TREATED A CEILING AS FATAL WITHOUT MEASURING WHETHER IT IS.** *"Do not believe
  a report when you can measure"* is the rule underneath §9 and the reason
  `5a-iii-gate.sh` exists — and this call reasoned its way to a $99 decision from two
  documented numbers without asking the five-minute question that settles it.

✅ **What the guard learned.** `docs/checks/5a-split-coverage.sh`'s N2 asserted that
`5a-iv-d`'s gate names `5a-iv-c`. **It was green on a wrong plan** — a guard can only
pin the decision it was given, and pinning a bad one makes it harder to move. It now
asserts the corrected routing **and refuses `5a-iv-c` by name**, so the detour cannot
come back quietly. ⚠️ **This is the shape to remember: a check does not make a decision
right, it makes it sticky.**

##### ⚠️⚠️ AND THE CORRECTION FOUND A THIRD THING, WHICH IS WORSE THAN THE FIRST TWO: A STALE DUPLICATE ROW THE GUARD COULD NOT SEE

Applying the correction above turned `docs/checks/5a-split-coverage.sh` red on an
assertion that should have passed — and the reason is the finding.

⚠️ **`docs/PLAN.md` STATES THE `5a-iv` SUB-SPLIT TWICE.** Once in this sizing section
(sub-task names in backticks) and once in the build-order table further down (names
bare). The check's row reader is `grep -m1 -F "| **$1** |"` — **the bare form, first hit
only** — so:

- The correction was applied to the **sizing** table.
- The guard read the **build-order** table, which still said *"On Android"* and still
  gated `5a-iv-d` on `5a-iv-c`.
- ⚠️ **For the length of one session the plan asserted both things at once**, and the
  check reported success on the copy nobody had edited.

✅ **THE INVARIANT WAS WRONG, NOT THE VALUE.** It was *"the claim appears somewhere"*; it
is now **"every copy of the claim agrees."** `rows_all()` returns both spellings of every
row, the gate assertions loop over **each copy independently**, and **the number of copies
is itself asserted** — because a check that tolerated one copy would tolerate the next
silent divergence just as happily.

⚠️ **THIS IS THE SAME FAMILY AS C1.4-AND-FACEBOOK AND C1.3-IN-THE-SUB-SPLIT, AND IT IS
THE FIRST TIME THE DUPLICATE WAS A WHOLE ROW RATHER THAN A PHRASE.** The three now read
as one rule: **a claim is only as true as the copy the check happens to read.** Twice it
was a phrase inside a row (Facebook inside `C1.4`; `C1.3` in a parent row), and this time
it was the row itself, in a second table, forty lines away.

##### ⚠️ What this says about the `N` falsifications merged in `#72`

**All six were red, and all six were red against a plan that was wrong.** They proved the
guard could detect edits to the routing; they could not detect that **the routing itself
was a bad call**, and N2 actively pinned it. That is not a flaw in the fixtures — it is
the boundary of what a falsification can do, and it is worth stating once: **a
falsification proves a check has teeth. It says nothing about whether the check is biting
the right thing.** The gate script's deleted assertion from `5a-iii-b` is the same
lesson from the other side.

##### Five falsifications over the correction, run by hand before it was committed

The original is confirmed green first and again after; every fixture is diffed against it
before the check runs, and one that edits nothing is reported as proving nothing.

| | Break | Result |
|---|---|---|
| **P1** | ⚠️ The **build-order** copy of `5a-iv-d` reverted to Android — *the exact defect found above* | 🔴 *"a 5a-iv-d gate does not name 5a-iv-a"* |
| **P2** | ⚠️⚠️ The **sizing** copy reverted, build-order copy left correct — **the direction that was invisible before `rows_all()`** | 🔴 — same assertion, other copy |
| **P3** | The day-0 pre-check dropped from one copy of `5a-iv-a` only | 🔴 *"a 5a-iv-a row does not name the day-0 re-deploy pre-check"* |
| **P4** | One copy of `5a-iv-a` deleted, leaving a single unchecked copy | 🔴 — the copy count is asserted |
| **P5** | `5a-iv-d`'s gate emptied in one copy | 🔴 *"a 5a-iv-d row has no gate"* |

⚠️ **P2 IS THE ONE THAT MATTERS AND IT IS THE ONE THAT WOULD HAVE BEEN GREEN THIS MORNING.**

##### ✅ `docs/checks/plan-handover.sh` — added 2026-09-12, after the SAME DEFECT APPEARED A THIRD TIME

`5a-iii-b`'s gate — *"Redirect URLs must gain `mx.bserafin.wera://**`"* — **was closed by
the owner on 2026-09-12, and this file still recorded it as OWED in FOUR places**: the
status-log block, the *"what it did NOT do"* bullet, and the gate cell of **both** sizing
tables. A cleared session reading any one of them would have re-raised a closed gate as
a blocker.

⚠️ **THAT IS THREE INSTANCES IN TWO DAYS**, and they are one rule:

| | The duplicate was | Copies |
|---|---|---|
| Facebook inside `C1.4` (2026-09-11) | a **phrase** inside a row | 1 read, 1 not |
| The `5a-iv` sub-split (2026-09-12) | a whole **row**, in a second table | 2 |
| This one (2026-09-12) | a **status claim**, in prose and in two tables | 4 |

✅ **`5a-split-coverage.sh` now enforces "every copy agrees" for `5a`'s deliverables.
What it does not look at is the two things a HANDOVER depends on**, so those are their
own file: **the next task is named exactly once**, and **the header's claim and the
table's claim agree**. Plus the one that fired for real — *a row marked DONE may not also
carry an open obligation* — and a dirty-tree check, because **a cleared session inherits
the filesystem and not the conversation.**

⚠️ **Five falsifications, all red** (below). ⚠️ **AND IT HIT A TRAP THIS REPOSITORY HAD
ALREADY WRITTEN DOWN:** the first spelling used `mapfile`, which is bash 4, and died on
the owner's Mac — **the same bash-3.2 trap `5a-split-coverage.sh` records for
`declare -A`, hit again by the very next script written.** A note in a file's header is
not a guard; it is a note.

| | Break | Result |
|---|---|---|
| **Q1** | Two rows both claim to be the next task | 🔴 *"2 table rows claim to be the next task"* |
| **Q2** | No row claims to be the next task | 🔴 *"a cleared session has nothing to take"* |
| **Q3** | ⚠️ The header names a different task from the table | 🔴 *"two copies of one claim, disagreeing"* — **the cross-check** |
| **Q4** | A `DONE` row carries *"STILL OWED"* — *the defect that prompted the file* | 🔴 *"a row marked DONE also carries an open obligation"* |
| **Q5** | Pointed at `docs/HANDBOOK.md`, which has no sizing table | 🔴 — it does not pass vacuously |

⚠️ **Q5 IS RED FOR THE RIGHT REASON BUT NOT A PRECISE ONE** — it fails at *"no table row
is marked the next task"*, which is also what Q2 says. That is honest rather than ideal:
the file is a plan-shaped-document check, and *"this is not a plan"* and *"this plan has
no next task"* are genuinely the same failure to it. Recorded so nobody later reads Q5 as
proving more than it does.

##### ⚠️ SUPERSEDED — the original sizing note, kept for the reasoning it got wrong

C1.4's persistence check is *"sign in, put the phone down for eight days, open it"*, and
eight was chosen to clear **Google's 7-day refresh-token expiry for test users** — the
open question being whether that expiry touches the Supabase session at all, which is an
assumption about somebody else's system and is therefore measured rather than believed.

⚠️ **There is a SECOND seven-day clock, and the sizing found it: a free Apple ID signs
an app with a 7-DAY PROVISIONING PROFILE.** The Developer Program gives a year. C1.6
defers the paid tier until *"the complete pilot is in place"* and says local builds are
free — **which is true, and the free build expires on day 7.**

⚠️⚠️ **SO A FAILED READING ON A FREE-SIGNED IPHONE IS UNINTERPRETABLE.** On day 8 the app
does not open, or opens signed out, and there are three candidate causes — Google's
token, Apple's profile, and the thing actually being tested — with **no way to tell them
apart.** The instrument would invalidate the measurement. That is worse than not
measuring: it produces a result that looks like an answer.

⚠️ **NOT MEASURED HERE.** Apple's 7-day free-provisioning limit is widely documented and
is a claim about somebody else's system, which this repository does not assume — see
`credentials.ts`'s note on email normalisation for the same refusal. **It is a question
for `5a-iv-a`, answered on the Mac, before the clock is started.**

✅ **THE RECOMMENDED WAY OUT COSTS NOTHING AND IS WHY `5a-iv-d` HANGS OFF ANDROID:** take
the eight-day reading on the **Android** device instead. An Android development build
has no expiry, so **one clock is live instead of two**, and the code under test —
supabase-js's refresh loop over the `expo-sqlite` store — is the same JavaScript on both
platforms. ⚠️ **This is a decision for the owner** (below), and the alternative is
bringing the $99 forward to buy an iPhone build that outlives the measurement.

##### The split, and where the seams are

| Task | What it is | Size | Gate |
|---|---|---|---|
| **`5a-iv-a`** | **iOS, and the round trip.** A local dev build on the owner's own **iPhone 15** (C1.6), then everything that can be seen in one sitting with the phone in hand: Google sign-in walked end to end — **the Supabase redirect allow-list, the PKCE exchange, and Google's *"unverified app"* interstitial** — the guard redirecting rather than hanging on a splash, **C1.3**'s restore actually landing, **C12.1**'s words drawn under the icons, and **C3.18**'s numbers looked at by someone who is not twenty-five. ⚠️⚠️ **ITS FIRST STEP IS THE DAY-0 RE-DEPLOY PRE-CHECK** — sign in, re-deploy, open, *still signed in?* — because that single answer decides whether `5a-iv-d` is free or costs $99. See the corrected finding above. | `M` | ⚠️⚠️ **ONE THING BLOCKS IT AND IT IS NOT THE HARDWARE: THE MAC HOLDS NO CODE-SIGNING IDENTITY AND NO APPLE ID** — measured 2026-09-12, along with three other things *"nothing else blocks it"* had not looked at. The other three were cleared the same day. ✅ **Run `docs/checks/5a-iv-a-preflight.sh` first** |
| **`5a-iv-b`** | **`CONVENTIONS.md`.** One page (§3). ⚠️ **Deliberately the one piece that needs NO hardware**, so it runs while `5a-iv-d`'s clock ticks rather than competing with a device for the owner's evening. | `S` | ✅ **DONE 2026-09-12** — `docs/CONVENTIONS.md`, nine rules, seven of them read by `docs/checks/conventions-gate.sh` in `app.yml`. ⚠️ **Taken OUT OF ORDER, ahead of `5a-iv-a`**, because `5a-iv-a` needs an Apple ID only the owner can type and this needs nothing. See the write-up below |
| **`5a-iv-c`** | ⚠️⚠️ **RE-SIZED AND SPLIT THREE WAYS 2026-09-13, BEFORE IT WAS TAKEN — see the sub-split below; `5a-iv-c-1` is what gets taken.** **Android, on real hardware.** Decision register #13 asked for an emulator smoke test; **C1.1 widened it to the pilot's actual Oppo and Samsung**. ✅ **A relative's Android is available for ONE EVENING** (confirmed by the owner 2026-09-12) — the pilot's own devices are the users' (*"not me to take their devices anywhere"*). ⚠️⚠️ **SO THE TOOLCHAIN IS INSTALLED AND A BUILD PRODUCED *BEFORE* THAT EVENING, ON THE EMULATOR** — Android Studio, the SDK and `adb` are hours of setup, and spending a borrowed evening on them is spending the one resource this task cannot re-book. ✅ **That is register #13's emulator, rehabilitated as a TOOLCHAIN REHEARSAL and not as a verification** — it still cannot answer one of the six readings. ⚠️ **It is on no critical path**: nothing else in `5a` waits for it. | `L` — **not the `S/M` this table carried** | ⚠️ **One evening with a borrowed Android**, prepared for in advance — ⚠️⚠️ **and that gate binds `5a-iv-c-3` ALONE.** The other two pieces are ungated, which is the whole reason this row was split rather than scheduled |
| **`5a-iv-d`** | **The eight-day reading, and nothing else.** C1.4's *"the session persists until an explicit log-out"*, measured. ⚠️ **On the owner's iPhone 15** — see the correction above; the Android detour was mine and it was wrong. | `XS` **in effort, and the longest lead time in step 5** | ⚠️⚠️ **A DATE, not a task, AND IT IS NOW FIXED.** ✅ The `5a-iv-a` day-0 pre-check PASSED on 2026-09-13, so this is free — no $99. **Day 0 is 2026-09-13; the reading is due 2026-09-21.** ⚠️⚠️ **The free profile expires `2026-09-20T06:19:32Z`, which is BEFORE the reading** — re-deploy (`xcodebuild … -allowProvisioningUpdates`, then `devicectl install`) and only THEN open and look. **Do not open Wera in between; launching it restarts the measurement.** ✅✅ **A SECOND, CLOCK-FREE INSTRUMENT WAS SEALED 2026-09-13 18:23 CST** — the AVD `wera-reading-5a-iv-d`, Google-signed-in on a **different account**, seal-tested and powered down. ⚠️ **Do not boot it; use `wera-android-36` for design and testing** — opening the app restarts the clock. ✅ **Session config READ (a report, not a measurement): time-box `0`, inactivity `0` — nothing expires a session**; reuse detection **On** at a `10s` interval, which is where the real risk now sits. ⚠️ **Day 8 is a CHECKPOINT, not the answer — look again on 2026-10-13 (day 30).** |

**Why `a` is one task and not three.** The build, the round trip and the four
look-at-it deliverables all happen **with the phone in your hand, in one sitting**.
Splitting them means building twice, and the second build is the expensive part.

**Why `d` is its own task despite being the smallest thing in this file.** It is the
only task in this project gated on a **calendar** rather than on another task. Folded
into anything else, it makes that thing an eight-day task — and a task that cannot close
for eight days is a task whose other deliverables sit unmerged behind it. ⚠️ **`XS` and
`longest lead time` are not in tension; they are the reason it is separate.**

**Why `b` is placed where it is.** §3 says a conventions page written before `src/ui`
and `src/api` exist is a guess at what the conventions will be, and the close of
`5a-iv-a` is the first moment there is a pattern to describe. It needs no hardware, so
it is the thing to do **during** the wait rather than after it.

##### ⚠️⚠️ Re-sized 2026-09-13 — `5a-iv-c` IS AN `L`, NOT THE `S/M` THIS FILE CARRIED, AND IT SPLITS THREE WAYS

⚠️ **The `S/M` was written on 2026-09-11 by someone who had not run `which adb`.** It is
the same defect `5a-iv-a`'s Mac half found in its own gate cell a day later — *"nothing
else blocks it"*, written without looking at the machine — and the correction here is the
same one: **measure the machine, then size.**

**Measured on the owner's Mac, 2026-09-13** (`arm64`, macOS 25.5, 223 GB free, Homebrew 6.0.22):

| Thing the `S/M` assumed | What is actually there |
|---|---|
| Android Studio | ⚠️ absent — `/Applications/Android Studio.app` does not exist |
| The SDK | ⚠️ absent — `~/Library/Android/sdk` does not exist |
| `adb` | ⚠️ absent — not on `PATH`; `ANDROID_HOME`/`ANDROID_SDK_ROOT` unset |
| A JDK | ⚠️⚠️ **absent, and NOBODY HAD COUNTED IT.** `java -version` → *"Unable to locate a Java Runtime."* `@react-native/gradle-plugin` pins AGP `8.12.0` / Kotlin `2.1.20`, so the floor is **JDK 17** |
| An emulator image | ⚠️ absent, and on `arm64` it must be an `arm64-v8a` system image — an `x86_64` one boots under emulation slowly enough to be useless |

✅ **Four independent installers plus a system image is roughly 4–5 GB of download**, then
a **cold Gradle build**, which on a first run resolves a dependency cache of its own. The
`S/M` was a description of the *outcome* — "a build on an emulator" — not of the work.

**The split, and where the seams are**

| Task | What it is | Size | Gate |
|---|---|---|---|
| **`5a-iv-c-1`** | **The toolchain, and an emulator that boots.** JDK 17, the Android SDK (command-line tools, `platform-tools`, a platform, build-tools), the emulator, an `arm64-v8a` system image, an AVD, and the licences accepted. ⚠️ **Nothing from this repository is involved** — no `prebuild`, no Gradle, no app. That is the seam: this piece can only be wrong about **the machine**. ✅ Ends at `adb devices` listing a booted emulator, and a check that says so. | `M` | ✅✅ **DONE 2026-09-13.** It was **ungated**, as sized. `docs/checks/5a-iv-c-toolchain.sh` reads 14/14, three of them over a *booted* `arm64-v8a` emulator. ⚠️ **Its own first spelling was misleading green** — see the log |
| **`5a-iv-c-2`** | **The Release rehearsal.** `expo prebuild -p android` (the folder is generated, not committed — `/android` is already in `app/.gitignore`), a **Release** APK, installed on the AVD and launched. ⚠️ **This is decision register #13's emulator smoke test**, discharged literally. ⚠️⚠️ **It is also the first instrument that can look at `R10` on the SECOND runtime** — every `Intl` measurement behind that rule was taken on iOS Hermes, and Android Hermes backs ECMA-402 differently. | `M` | ✅✅ **DONE 2026-09-13.** It was **ungated**, as sized. `docs/checks/5a-iv-c-2-rehearsal.sh` reads 15/15, six falsifications, and the app rendered. ⚠️⚠️ **Its finding inverts the prediction in this row: `formatToParts` EXISTS on Android** — see the log |
| **`5a-iv-c-3`** | **The borrowed evening.** C1.1's actual Oppo and Samsung — the widening that made this task more than an emulator run. A relative's Android for ONE EVENING (confirmed by the owner 2026-09-12). | `S` | ✅✅ **DONE 2026-09-13 — the evening was HELD A DAY EARLY, on a Galaxy Z Flip 8. All six readings taken; one defect found, fixed and re-verified before the phone went back.** ⚠️ **Arranged with a relative (owner, 2026-09-13).** ⚠️⚠️ **THE DATE IS A REFERENCE, NOT A GATE — it may happen TODAY, and 2026-09-14 is only the expectation.** ⚠️⚠️ **THE REAL GATE IS `5a-iv-c-2`, AND IT IS A HARD ONE: if the evening arrives before the Release APK exists, the evening is a setup and should be SPENT LATER RATHER THAN SPENT BADLY.** That is the whole argument the three-way split was built on. ⚠️ **A human step is owed on the DEVICE and it is not the owner's own**: USB debugging, via Developer Options. ✅ **Run sheet: `docs/checks/5a-iv-c-3-runsheet.md`** |

**Why `1` and `2` are separate, when `5a-iv-a` argued the opposite.** `5a-iv-a` was kept
whole because its pieces all needed *the phone in your hand at the same moment*. These two
need nothing in the room. What they have instead is **a sharp boundary of blame**: if the
emulator will not boot, that is `1` and it is about this Mac; if the APK will not launch on
it, that is `2` and it is about the app. ⚠️ **Merged, a red screen is ambiguous between
them**, and an ambiguous failure on a multi-gigabyte install is the kind that gets
re-diagnosed from scratch after a context clear.

**Why `3` stayed a row rather than becoming the parent's gate.** It is the only piece the
evening blocks. Left inside a single `5a-iv-c`, the ungated 90% of the task inherits a gate
it does not have — which is exactly how a task with a scheduling dependency stops being
worked on at all.

**Eight falsifications, run by hand before this split was committed.**
`5a-split-coverage.sh` grew a `5a-iv-c` block; a check that has never been red is a
check that asserts nothing, which is this repository's rule 4.

| Fixture | The edit | Result |
|---|---|---|
| **Q1** | ⚠️⚠️ **The borrowed evening re-attached to `5a-iv-c-1`'s gate** — the exact defect the split exists to fix | 🔴 *"re-attaches a scheduling dependency to the piece that needs NO hardware"* |
| **Q2** | The JDK softened to *"a Java runtime"* in `5a-iv-c-1` | 🔴 *"no longer names the JDK … the reason this row is an L"* |
| **Q3** | The build-order copy of `5a-iv-c-2` deleted | 🔴 *"no table row for 5a-iv-c-2"* |
| **Q4** | ⚠️ **Only the SIZING copy of `5a-iv-c-2` deleted, leaving one** — the 2026-09-12 stale-duplicate shape | 🔴 *"has 1 row(s) … BOTH are read"* |
| **Q5** | `arm64-v8a` claimed by the rehearsal as well as the toolchain | 🔴 *"appears in 5a-iv-c-1 5a-iv-c-2 — owned by neither"* |
| **Q6** | `5a-iv-c-3`'s gate reworded so it no longer names the evening | 🔴 *"the only piece the scheduling dependency binds — unnamed … 'later' becomes 'never'"* |
| **Q7** | Every `5a-iv-c-1` row removed | 🔴 *"no table row for 5a-iv-c-1"* |
| **Q8** | ✅ **A benign prose edit inside this section** | 🟢 — it does not fire on any change to the file |

⚠️ **Q5 was not a fixture first; it was a real defect in the first draft of these rows,
caught by the check's first run.** `register #13`'s smoke test was claimed by both the
rehearsal and the borrowed evening, which is the *"owned by neither"* shape three levels
of this split have now produced. **The row was corrected, not the check.**

##### ✅✅ `5a-iv-c-2` closed 2026-09-13 — the APK, the check, and the finding that went the other way

| | |
|---|---|
| Native project | `expo prebuild -p android`, Expo SDK 57 / RN 0.86.3, `newArchEnabled=true`, `hermesEnabled=true`. ⚠️ **Generated and untracked** — `git ls-files app/android` is empty, asserted |
| Build | `./gradlew assembleRelease`, **cold: 10m51s**, 571 tasks. 107 MB universal APK, four ABIs |
| Bundle | `assets/index.android.bundle`, **Hermes bytecode**, HBC version 98, 3.0 MB |
| Signing | ⚠️ **the DEBUG keystore** — Expo's template default for `release`. Fine sideloaded; not what a Play listing takes. Belongs with `5i` |
| Installed | API-36 emulator, `pm path` resolved on the device rather than trusting `adb install`'s *Success* |
| Copy for the evening | `~/wera-release-2026-09-13.apk` — outside the build tree, so regenerating `android/` cannot eat it |

**What the check asserts, and why those two lines are the load-bearing ones.**
`docs/checks/5a-iv-c-2-rehearsal.sh`, 15 assertions. ⚠️⚠️ **`am start` PRINTS
`Status: ok` FOR AN APP THAT DIES ON ITS FIRST FRAME** — it reports that
ActivityManager started an activity, which is a claim about Android and not about
the app, and `5a-iv-a`'s crash happened *after* a successful start. So the two
that carry the weight are **the process still being alive eight seconds later**
and **a string `src/strings.ts` owns coming back out of `uiautomator dump`**.
⚠️ The expected string is `ES.auth.google` — *"Entrar con Google"* — and **not**
`ES.auth.title`, which is `Wera`: the title is also the application label, so a
node the SYSTEM drew could satisfy it and the assertion would pass on an app that
rendered nothing. ⚠️ It is **read out of `src/strings.ts`** rather than typed into
the script, so a reworded screen cannot leave the check measuring its own memory.
✅ **`R10`'s premise is measured too**: the eight magic bytes of Hermes bytecode
are read off the bundle inside the APK, because `hermesEnabled=true` is a file and
a bytecode header is an engine.

**Six falsifications.**

| Fixture | The edit | Result |
|---|---|---|
| **C1** | ⚠️⚠️ **A module-load use of a name that is ABSENT ON ANDROID** — `new Intl.PluralRules('es-MX')` in `mxn.ts`, the Android twin of what `formatToParts` was on iOS | 🔴 three red at once: *still running*, *no JS exception* (`JavascriptException: TypeError: undefined cannot be used as a constructor`), *React rendered*. ⚠️ **`am start` still said `Status: ok`** |
| **C2** | A source file touched after the build | 🔴 *"no app source is newer than the APK"* — every other assertion describes a binary nobody has |
| **C3** | An APK with `assets/index.android.bundle` removed — **what a Debug APK is** in the one respect that matters | 🔴 *"a Debug APK has none, it asks Metro"* |
| **C4** | The bundle replaced with plain JavaScript — `hermesEnabled=false`'s shape | 🔴 magic reads `76 61 72 20…` (`var __r=`) |
| **C5** | ⚠️ **HOME pressed five seconds after launch** — a live pid with nothing on screen | 🔴 *React rendered* alone, while *still running* stayed 🟢. **Proof the two are independent**, which is the whole reason the second one exists |
| **C6** | ✅ Nothing edited | 🟢 15/15 |

⚠️ **C7 was run and is not in the table as a fixture, because it needed a real
build**: `debuggable true` in the `release` block → 🔴 *"the APK is NOT
debuggable"*. Worth naming — a debuggable Release APK is the shape that still
needs a Mac in the room, which is `#75`'s defect wearing Android clothes.

⚠️⚠️ **AND ONE DEFECT IN THE CHECK ITSELF, FOUND BY RUNNING IT.** The Hermes
assertion first expected `c6 1f bc 03 c1 03 bc 1f`, written from memory; the real
header is **`c6 1f bc 03 c1 03 19 1f`**. It was **red against a correct bundle** —
an assertion wrong about its own expected value, which is the kind of red that
gets resolved by deleting the check. The constant is now read off the artefact and
carries a note saying so.

##### ✅✅ `5a-iv-c-1` closed 2026-09-13 — what was installed, and the check that looked at it

| | |
|---|---|
| JDK | **17.0.20.1**, Homebrew `openjdk@17`, keg-only. ⚠️ The sudo symlink into `/Library/Java/JavaVirtualMachines` is **deliberately not done** — Gradle reads `JAVA_HOME` |
| SDK root | `~/Library/Android/sdk` — **not** a Homebrew prefix, so 4.3 GB of system images survive a package upgrade and Android Studio adopts this SDK rather than downloading a second one |
| Packages | `platform-tools` (adb 37.0.1), `platforms;android-36`, `build-tools;36.1.0`, `emulator`, `system-images;android-36;google_apis;arm64-v8a` |
| AVD | `wera-android-36`, Pixel 7 profile, **`arm64-v8a`** |
| Environment | `~/.zshenv` — see the log for why not `~/.zshrc` |

**Six falsifications over `docs/checks/5a-iv-c-toolchain.sh`.**

| Fixture | The edit | Result |
|---|---|---|
| **T1** | ⚠️⚠️ **Every shell startup file hidden behind an empty `ZDOTDIR`** | 🟢 **GREEN — AND THAT WAS THE DEFECT.** The assertion spawned a child shell, which *inherits* its parent's environment, so it read the value the script already held. ✅ Fixed with `env -u`; 🔴 after |
| **T2** | `JAVA_HOME` pointed at a JDK that is not there | 🔴 *"does not export JAVA_HOME at a runnable JDK"* + the AGP-floor assertion |
| **T3** | The AVD renamed out from under the check | 🔴 *"no loadable AVD named …"* |
| **T4** | ⚠️ **`arm64-v8a` swapped for `x86_64` against the RUNNING arm64 device** | 🔴 *"the running device reports ABI 'arm64-v8a', wanted x86_64"* — proof the ABI is measured, not read off a package name |
| **T5** | Four assertions deleted outright | 🔴 *"only 8 assertions ran, fewer than the 11 this file contains"* |
| **T6** | `--no-boot` | 🟢 by design, and it **refuses to print the full claim** — *"the packages are present and NOT that this Mac can run them"* |

⚠️⚠️ **T1 is the one worth keeping.** The check's sentence was *"a shell nobody configured
can find the SDK"*, and what it actually measured was *"this script's own environment has
the variable"* — two claims that agree for exactly one person, whoever is still in the shell
that ran the installer, and diverge for everyone opening a terminal tomorrow. **It is the
seventh shape of misleading green recorded here**, and the closest relative of `#75`'s
`14/14 — this Mac can build, sign and install`, which rested on a build for the simulator.
⚠️ **Both were caught by falsifying, not by reading**, and in both cases the number printed
was the number the author wanted to see.

##### ⚠️ C1.4 IS THE THIRD DELIVERABLE IN THIS FILE THAT IS A LIST, AND THE FIRST TWO BOTH DREW BLOOD

`C1.4` is **built** in `5a-iii-a` (email sign-in, sign-up, log-out), **extended** in
`5a-iii-b` (Google), **deferred in part** to `5i` (Facebook), and **read** in
`5a-iv-d` (persistence). ⚠️ **Four tasks, one identifier**, and the coverage check
matches it as one atom.

This is the same shape that has now cost this repository twice: `C1.4`-and-Facebook,
where the check printed `10/10` across an edit that moved a third of a deliverable to
another task; and `C1.3` in the `5a-iii` sub-split, where the parent row's mention
satisfied a claim about the halves. **A deliverable that is a list is only as visible as
its coarsest name**, and writing that down a third time without acting on it would be
the defect with better documentation.

✅ **So the sub-split guard below asserts over the READINGS BY NAME** — *the allow-list*,
*the interstitial*, *the eight-day reading* — and not over `C1\.4`. The identifier is
not the unit; the thing someone will move is.

##### The six things no CI can see, each now owned by exactly one sub-task

| | Reading | Owner |
|---|---|---|
| 1 | **C12.1** — the tab bar actually draws its words | `5a-iv-a` |
| 2 | **C3.18's numbers** — whether 76pt reads as "big" to someone old | `5a-iv-a` |
| 3 | The guard redirects, and the app is not stuck on a splash | `5a-iv-a` |
| 4 | ⚠️ **The Supabase redirect allow-list** — unmeasurable from outside a browser | `5a-iv-a` |
| 5 | Google's *"unverified app"* interstitial, if it appears at all | `5a-iv-a` |
| 6 | ⚠️ **C1.4's persistence** — the eight-day reading | `5a-iv-d` |

⚠️ **Five of six land in `5a-iv-a`, and that is not a failure of the split** — it is the
measurement that the device sitting in front of a person is one instrument, used once.
What the split buys is that the **sixth** cannot hide inside it, because the sixth is
the one with a calendar attached and the one that would quietly never happen.

##### Decisions taken on the owner's behalf in this sizing

| | Call | Why, and what reversing costs |
|---|---|---|
| **1** | ⚠️⚠️ ~~**THE EIGHT-DAY READING MOVES TO ANDROID**~~ — **WITHDRAWN AND CORRECTED 2026-09-12, SEE ABOVE.** `5a-iv-d` gates on **`5a-iv-a`**, the owner's iPhone 15 | The original reasoning was that two 7-day clocks make a failed reading uninterpretable. ⚠️ **It was wrong twice**: it gated the project's longest-lead-time reading on hardware the plan never records the owner owning, and it treated a ceiling as fatal without measuring whether it is. **The day-0 pre-check costs five minutes and settles it.** ⚠️ **Reversing THIS costs $99** — and only if the pre-check fails |
| **2** | **`5a-iv` splits four ways rather than two** | Six failure modes — build-time, sign-in, by-eye, a second toolchain, a calendar, and a document nobody writes. The `S/M` assumed one |
| **3** | **`CONVENTIONS.md` stays in the split rather than moving to `5b`** | §3 gates hiring on it and the close of `5a-iv-a` is the first moment there is a pattern to describe. ⚠️ Moving it to `5b` puts it behind onboarding, membership and the IVA question — **which is how a page that blocks hiring waits a month** |
| **4** | **Register #13's emulator smoke test stays retired** | C1.1 already widened it to real hardware and this file recorded that; the sizing did not reopen it. ⚠️ **An emulator cannot answer any of the six readings above** — not the interstitial, not the deep link, and certainly not whether 76pt reads as big |

##### Six falsifications over the sub-split, run by hand before it was committed

`docs/checks/5a-split-coverage.sh` gained a `5a-iv` section. The unmodified file is
confirmed green first, every fixture is diffed against the original before the check runs
on it, and **a fixture that edits nothing is reported as proving nothing** rather than
counted as a pass.

| | Break | Result |
|---|---|---|
| **N1** | The `5a-iv-d` row deleted entirely | 🔴 *"no table row for 5a-iv-d"* |
| **N2** | ⚠️⚠️ **The eight-day reading tidied back onto the iPhone build** | 🔴 *"5a-iv-d's gate does not name 5a-iv-c"* |
| **N3** | `5a-iv-d` keeps its row but loses its gate | 🔴 *"the only task in this project gated on a DATE — unnamed, it is the one that never happens"* |
| **N4** | The allow-list reading silently drops out of `5a-iv-a` | 🔴 *"owned by no half of 5a-iv"* |
| **N5** | `CONVENTIONS.md` claimed by two halves | 🔴 *"appears in 5a-iv-b 5a-iv-c — owned by neither"* |
| **N6** | Pointed at `docs/HANDBOOK.md`, which has no sizing table | 🔴 — it does not pass vacuously |

⚠️⚠️ **N2 IS THE ONE THIS GUARD EXISTS FOR, AND IT IS THE THIRD TIME THIS SHAPE HAS BEEN
WRITTEN DOWN.** Moving `5a-iv-d` back onto the iPhone build **looks like fixing an
inconsistency** — the device task is `5a-iv-a`, so why would the reading hang off `-c`? —
and it silently restores a confound that makes the measurement worthless. The reason
lives in a paragraph; the guard makes it live in a check. Same role as `5i`'s G5 and the
`5a-iii` split's H2.

⚠️ **What this sizing did NOT do:** it took no hardware decision. Whether the $99 comes
forward is the owner's, it is decision 1 above, and **Android was chosen precisely so
that it does not have to be answered today.**


##### ⚠️⚠️ Prepared 2026-09-12, before the sitting — *"NOTHING ELSE BLOCKS IT"* WAS FALSE IN FOUR MEASURED WAYS

`5a-iv-a`'s gate cell read **"the owner's Mac and his own iPhone 15. Nothing else
blocks it."** ⚠️ **That sentence was written without looking at the Mac.** It was looked
at on 2026-09-12, and it is the same shape as everything else this plan keeps finding: a
claim that was true of nothing in particular, believed because nobody had run the two
commands that settle it.

| | What the gate assumed | What the Mac held, measured | Cleared |
|---|---|---|---|
| 1 | Xcode is the toolchain | `xcode-select -p` → `/Library/Developer/CommandLineTools`. **Xcode 26.6 is installed and was not being used** — no `xcodebuild`, no iOS SDK, no device path | ✅ without sudo, via `DEVELOPER_DIR` |
| 2 | CocoaPods is present | It is not. ⚠️ **And `gem install` is the wrong fix** — this Mac's system Ruby is 2.6, below what current CocoaPods supports | ✅ `brew install cocoapods` → 1.17.0 |
| 3 | There is something to build | There was no native project at all. `app/ios/` is gitignored (`/ios`) because this is a Continuous Native Generation project, so it is a **build product a fresh clone does not have** | ✅ `npx expo prebuild -p ios` |
| 4 | ⚠️⚠️ Signing is a detail | **ZERO code-signing identities. No Apple ID in Xcode. No provisioning profiles directory.** | 🔴 **THE OWNER'S, AND NOTHING ELSE CAN DO IT** |

✅ **The phone is not one of the four.** `xcrun devicectl list devices` already knows
`iPhone de Bernie`, model `iPhone15,4` — it reports `unavailable`, which means *not
plugged in right now* and not *unknown*. **C1.6's hardware is real and paired.**

⚠️ **ROW 4 RAISES A DATE QUESTION AND DOES NOT ANSWER IT.** A free personal team's
**provisioning profile** expires seven days after it is created, and it is created when
Xcode signs a build — while the **certificate** is created earlier, when the Apple ID is
added. ⚠️⚠️ **WHICH OF THE TWO IS THE SEVEN-DAY CLOCK WAS NOT MEASURED HERE**, because
this machine held neither, and this file does not assume claims about Apple's system —
see `credentials.ts` on email normalisation for the same refusal. ✅ **It does not change
the instruction either way**: sign-in and first build are minutes apart in one sitting, so
the day-0 pre-check belongs in that same sitting rather than the following evening, and
the run sheet puts it there. ⚠️ **An earlier draft of this section asserted the Apple ID
was the start. That was reasoning, not measurement, and it is the error this plan spends
most of its pages on** — it is corrected here rather than deleted.

##### ⚠️⚠️ AND THE PREPARATION FOUND THE ONE THAT WOULD HAVE VOIDED `5a-iv-d` WITHOUT SAYING SO

**`npx expo run:ios` defaults to the `Debug` configuration, and a Debug build does not
contain its own JavaScript.** Both halves measured rather than recalled:

- `npx expo run:ios --help` prints, verbatim: *"`--configuration <configuration>`  Xcode
  configuration to use. Debug or Release. **Default: Debug**"*.
- `app/ios/Wera/AppDelegate.swift:62–68` forks on it: under `#if DEBUG` it returns
  `RCTBundleURLProvider.sharedSettings().jsBundleURL(…)` — **a URL pointing at Metro, on
  the Mac** — and only the `#else` branch reads an embedded `main.jsbundle`.

⚠️⚠️ **SO THE OBVIOUS COMMAND PRODUCES AN APP THAT CANNOT LAUNCH WITHOUT THE LAPTOP, AND
THAT IS FATAL TO BOTH HALVES OF THE PERSISTENCE MEASUREMENT.** The day-0 pre-check
re-deploys and re-opens; `5a-iv-d` opens the app eight days later with the Mac somewhere
else entirely. A Debug build on day 8 shows a red screen about a development server —
and **the reading that comes back is not "signed out", it is nothing at all, from an
instrument that never reached the question.**

⚠️ **This is the sizing's own error committed a second time, in a different currency.**
The correction of 2026-09-11 was about not reasoning from two documented numbers to a $99
decision. This one would have started an eight-day clock on an instrument that was never
able to answer — **and the failure would have arrived looking exactly like a genuine
result.** ✅ **`--configuration Release` is therefore not a preference in the run sheet;
it is the thing the run sheet is for.**

##### ✅ The rehearsal build — what it is evidence of, and what it is not

```
xcodebuild -workspace ios/Wera.xcworkspace -scheme Wera \
  -configuration Release -sdk iphonesimulator \
  -derivedDataPath ios/build CODE_SIGNING_ALLOWED=NO build
```

**`** BUILD SUCCEEDED **`**, and the product at
`ios/build/Build/Products/Release-iphonesimulator/Wera.app/` carries a **3,396,248-byte
`main.jsbundle`**.

✅ **What that IS evidence of.** Every pod compiles — forty-odd Expo modules, Reanimated
4.5, the React Compiler, `expo-glass-effect`, `@expo/ui` — and the *"Bundle React Native
code and images"* phase ran and produced an embedded bundle. That phase is gated on the
**configuration**, not on the platform, so a device Release build will embed one too.
⚠️ **This is the first time any machine has compiled this app's native side**, and it
needed no Apple ID to find out.

⚠️ **What it is NOT.** It is a **rehearsal, not a verification** — `5a-iv-c`'s emulator
argument in the other platform's words, and it is held to the same standard. **It cannot
take one of the five readings**: no Google interstitial, no deep link back from Safari,
no opinion about whether 76pt reads as big to someone over fifty. Simulator ≠ signed, and
a simulator has no keychain, no Safari sign-in sheet and no eyes.

##### ✅ `docs/checks/5a-iv-a-preflight.sh` — fourteen assertions, and the only one that is red is the owner's

Same standing as `docs/checks/5a-iii-gate.sh`: ⚠️ **it cannot run in CI and saying so is
the point.** It reads one laptop's Xcode, keychain, paired devices and gitignored
`.env.local`. It is **not evidence in the sense of ADR-035 §9** — it is the local
instrument for a surface with no file in this repository, and it obeys the rule
underneath §9 instead: *do not believe a report when you can measure.*

**13 of 14 green on 2026-09-12.** The red one is the Apple ID, and its failure message is
the four lines of Xcode clicking that clear it. ⚠️ **It prints no key and no certificate**
— it counts signing identities and never names one, and it asserts `.env.local`'s two
names are non-empty without echoing either.

⚠️ **The assertion that earns its place is the Debug/Release fork**, which pins the
*reason* rather than the command: if a future React Native moves that `#if DEBUG`, the
justification for `--configuration Release` has moved with it, and this is where that
surfaces — **not on day 8.**

✅ **`docs/checks/5a-iv-a-runsheet.md` is the human half**, and it is a form with boxes
rather than a description. ⚠️ **Four of the six readings are OPINIONS** — *did an
interstitial appear*, *does that read as big* — and an opinion not written down at the
time becomes a memory of an opinion. It also carries the two steps that are not in any
command and that everyone forgets: **Developer Mode on the phone** (Settings → Privacy &
Security), which reboots it, and **trusting the developer profile** after the first
install refuses.

##### Seven falsifications over the preflight, run by hand before it was committed

⚠️ **THE BASELINE IS NOT GREEN ON THIS MACHINE, AND THAT IS WHY THE HARNESS DOES NOT READ
THE EXIT CODE.** The signing assertion is red before any fixture is applied, so a
falsification that only checked *"still non-zero"* would have passed all seven
**vacuously** — the same family as 4b-i's third way a failing suite exits 0. Each fixture
is instead diffed against an unmodified one, and must add a **named failure the baseline
did not already have**.

| | Break | Result |
|---|---|---|
| **R1** | The native project never generated | 🔴 *"the native project exists: …/Wera.xcworkspace"* |
| **R2** | ⚠️⚠️ **The `#if DEBUG` Metro fork deleted from `AppDelegate.swift`** — *the reason for `Release` quietly moving* | 🔴 *"AppDelegate still forks on DEBUG"* |
| **R3** | `EXPO_PUBLIC_SUPABASE_URL` present but **empty** — builds, installs, launches, dead | 🔴 *"both EXPO_PUBLIC_ names are present and non-empty"* |
| **R4** | ⚠️ The `NEXT_PUBLIC_` spelling — **the one the owner actually pasted on 2026-09-11** | 🔴 *"no NEXT_PUBLIC_ spelling … Expo inlines neither the name nor a warning"* |
| **R5** | ⚠️⚠️ A Release `.app` with **no embedded `main.jsbundle`** — *the day-8 shape exactly* | 🔴 *"the rehearsal build embedded its JavaScript"* |
| **R6** | `.env.local` deleted, so two assertions have no subject | 🔴 **two failures, not two skips** — and the count still reads 14 |
| **R7** | Pointed at `docs/`, which is not an app directory | 🔴 7 of 14 — **it does not pass vacuously** |

⚠️ **R6 IS THE ONE ABOUT THIS FILE RATHER THAN ABOUT THE MAC.** The two `.env.local`
assertions began life nested inside an `if [[ -r … ]]`, which is the fifth shape of
misleading green in this repository — *a check that never runs.* They now **fail** when
the file is missing rather than vanishing, so the assertion count is 14 whatever the
filesystem looks like, and the anti-vacuity floor is not doing a second job badly.

##### Decisions taken on the owner's behalf in this preparation

| | Call | Why, and what reversing costs |
|---|---|---|
| **1** | **CocoaPods installed with Homebrew** (1.17.0), not with `gem` | The system Ruby is 2.6 and current CocoaPods needs newer. ⚠️ **It writes outside this repository** — `brew uninstall cocoapods` reverses it, and nothing here depends on the version |
| **2** | ⚠️ **`app/package.json`'s `ios`/`android` scripts now say `expo run:*`, not `expo start --*`** | **`expo prebuild` rewrote them itself**, and it is right: once a project has a custom scheme and native modules, `expo start --ios` means Expo Go, which cannot run this app's OAuth redirect at all. ⚠️ **Cheap to reverse today**, and it is the kind of line nobody re-reads later — so it is named here rather than left in a diff |
| **3** | **`DEVELOPER_DIR` rather than `sudo xcode-select -s`** | A check should not ask for a password. ⚠️ **The consequence is that `npx expo run:ios` still needs the export**, which the run sheet carries. The one-line permanent fix is the owner's and is in the preflight's failure message |
| **4** | **The rehearsal build is Release-on-simulator, not Debug** | Debug would have compiled the same pods and proved **nothing about the bundle**, which is the half that decides whether `5a-iv-d` can happen. ⚠️ Costs a few minutes more and answers a second question |

⚠️ **What this preparation did NOT do: it took no reading.** All five of `5a-iv-a`'s
readings and the pre-check are still owed, `5a-iv-a` is still open, and it is still the
next task. **What changed is that the evening is now a sitting rather than a setup.**


#### ✅✅ `5a-iv-b` IS DONE AS OF 2026-09-12 — the conventions page, and the fifth stale copy was the front door

⚠️ **TAKEN OUT OF ORDER, AND THE REASON IS THE GATE.** `5a-iv-a` is still the next
task and is still open; it is blocked on **an Apple ID typed into Xcode**, which
nothing but the owner can do. `5a-iv-b` was placed in this split precisely as *"the
one piece that needs no hardware"*, so a session that cannot start `a` takes `b`
rather than stopping. **No part of `5a-iv-a` was attempted or consumed.**

**What shipped:**

- **`docs/CONVENTIONS.md`** — §3's one page. Nine rules, `R1`–`R9`, every one of them
  **read out of `app/src` rather than proposed for it**: the `@/` alias, the test
  boundary, the decides/acts seam, one strings file, integer centavos, no hardcoded
  sizes, two `EXPO_PUBLIC_` variables, a header on every module, and *"a deliverable
  no check can see is written down as such."*
- **`docs/checks/conventions-gate.sh`** — 10 assertion groups, **7 of the 9 rules
  enforced** over 22 source and 11 test files. 15 falsifications, 14 red and one that
  had to stay green. ⚠️ **The tenth group was added 2026-09-13** and is a cross-check
  against `docs/PLAN.md` — see `5b.5`.
- **`.github/workflows/app.yml`** — the gate as a fourth step, and `docs/CONVENTIONS.md`,
  the script itself and (from 2026-09-13) **`docs/PLAN.md`** added to the `paths:`
  filter, so an edit to any one of the three re-runs the check that reads them.

##### ⚠️⚠️ THE FINDING — README.md HAS SAID *"THE CLIENT DOES NOT EXIST YET"* SINCE KICK-OFF, AND IT IS THE FIFTH INSTANCE IN THREE DAYS

`#76` corrected `docs/HANDBOOK.md`'s nine-day-stale *"no app yet"* and recorded it as
the fourth instance of **a claim is only as true as the copy the reader happens to
open.** ⚠️ **It did not look at `README.md`, which said the same thing, had said it
since `7fbd1b0`, and is the FIRST FILE ANYBODY OPENS.** `git log -- README.md` returns
three commits, the newest of them the kick-off.

✅ **Corrected, and corrected in the shape `#76` chose rather than a fifth copy of the
status:** the README now says where the build is **and deliberately does not name the
next task**, deferring to `docs/PLAN.md` — which `plan-handover.sh` exists to keep
singular. `app/README.md`'s *"nothing in `src/app/` today"* was stale the same way and
went with it.

⚠️ **THIS IS WHY THE PAGE HAS A GUARD AT ALL.** A conventions page is the worst
possible host for this defect. A stale status line is merely believed; **a stale
convention is COPIED INTO THE CODE by the next person**, which is the accident §3
names in terms — *"a junior arriving before it does will write the conventions
themselves, by accident, in four places."* So `R1`–`R9` are numbered, and the check
asserts that the page and the script **name the same nine rules and agree about which
two a machine cannot read.**

##### ⚠️⚠️ AND WRITING THE RULES DOWN FOUND THE FIRST ONE ALREADY BROKEN

**`R1` was false when it was written.** Five test files imported `../src/theme/density`,
`../src/wiring`, `../src/format/mxn`, `../src/navigation/tabs` and `../src/strings`,
while the six written since `5a-iii` used `@/`. **The same module, `tabs`, was imported
both ways in two different suites.** The alias was added to `app/vitest.config.ts`
during `5a-ii` and the files written before it were never brought across — chronological
drift, not a decision, and invisible because both spellings work.

✅ **Normalised, 132 assertions still green.** ⚠️ **This is what a conventions page is
FOR, and it is worth naming**: the drift was three days old, in eleven files, and
nobody would ever have found it by reading. It was found by trying to state the rule.

##### ⚠️⚠️ THE TRAP IN THE CHECK ITSELF — A GUARD THAT READS THE WARNING REPORTS THE DEFECT

The first spelling of `conventions-gate.sh` was **red on the files that got it right.**

This codebase documents its traps in prose *next to the code that avoids them*:
`src/lib/env.ts` contains the string `NEXT_PUBLIC_` in a comment explaining why
`NEXT_PUBLIC_` must never appear, and `src/format/mxn.ts` contains `centavos / 100` in
a comment explaining why nothing divides by 100. A grep for the banned token finds the
warning first.

⚠️ **THE FAILURE MODE IS NOT THE FALSE POSITIVE, IT IS WHAT THE FALSE POSITIVE
TEACHES.** A check that fires on the explanation makes deleting the explanation the
cheapest way to green — so the guard would, over time, strip this repository of exactly
the comments that make it legible. ✅ Full-line comments are stripped before any rule is
applied, and **`F13` is a falsification in the other direction**: a fixture that adds a
comment naming *every* banned token at once, which must stay **green**.

##### Decisions taken on the owner's behalf in `5a-iv-b`

| | Call | Why, and what reversing costs |
|---|---|---|
| **1** | **The page is at `docs/CONVENTIONS.md`**, not the repository root | §3 names the file and no directory. `docs/` is where this project's prose already lives — `PLAN.md`, `HANDBOOK.md`, `adr/`. ✅✅ **CONFIRMED BY THE OWNER 2026-09-13 — *"keep it in docs/"*. Closed; do not re-open it.** The path may now be cited freely |
| **2** | **It ships with a check, which §3 did not ask for** | *"A file is not evidence; a green CI run is"* is non-negotiable in `CLAUDE.md`, and this is a file made entirely of claims about other files. A page of rules nothing can falsify is the artifact this repository exists to prevent. Reversing is deleting one script and one step |
| **3** | **Scoped to `app/` only.** It does not restate the migration rules, the RLS rule or the evidence rule | Those live in `CLAUDE.md` and `supabase/README.md` and are **correct there**. Copying them here would create the sixth instance of the defect this very page is guarding against. The page links instead |
| **4** | **Seven rules enforced, two declared unenforceable — and the split is itself asserted** | `R3` (the decides/acts seam) and `R9` (name what no check can see) are about judgement. ⚠️ **A rule quietly moving from "checked" to "stated" is the same stale-copy defect**, so assertion 0 reads each rule's own `**Checked by:**` line and fails if it disagrees with the script |
| **5** | **Five test imports rewritten to `@/`** | See above. ⚠️ It is app code changed by a documentation task, which is why it is named here — but the alternative was publishing `R1` already false |
| **6** | **The gate runs LAST in `app.yml`, after typecheck and the suite** | Those assert correctness; this asserts form. A red form check ahead of a red correctness check hides it and costs a round trip. Reversing is moving four lines |

##### Sixteen falsifications — and ⚠️ **THIS IS THE ONE HARNESS IN THIS REPOSITORY THAT IS COMMITTED**

⚠️⚠️ **`docs/checks/conventions-gate-falsify.sh`, added 2026-09-13 with the owner's
agreement, and it is a deliberate break with precedent.** Every task from `4a` onwards
falsified its checks by hand, recorded the fixtures as a table here, and threw the
harness away — right for a pgTAP suite, which is falsified once and then finished.
**`conventions-gate.sh` is not finished**: `R10` was added the same day after
`formatToParts` crashed the app, and `R11` is already expected at `5b.5`. Every such
edit needs the gate re-proved, and re-deriving sixteen fixtures from a table of prose
costs more than keeping them. ⚠️ **The gate's own header now says so**, so a session
adding `R11` is told to re-falsify rather than left to decide.

⚠️ **Porting it out of the scratchpad found two defects in it**: it carried a hardcoded
home directory, and `sed -i ''` is BSD-only — **the fourth script here to hit the
two-machine trap**, after `declare -A`, `mapfile` and a multibyte bracket expression.

Every fixture is a copy of the tree with one thing broken, **diffed against the original
before the check runs** — the trap `5a-i` recorded, where a fixture that edited nothing
reported success. The original copy is confirmed green first.

| | Break | Result |
|---|---|---|
| **F1** | One test import reverted to `../src/` — *the defect this task actually found* | 🔴 *"1 import(s) climb out of their directory"* |
| **F2** | A test file placed beside the source under `src/` | 🔴 *"a test file under app/src/"* |
| **F3** | A test import changed to one that **resolves** to a `.tsx` | 🔴 *"imports '@/theme/DensityProvider', which resolves to a .tsx"* |
| **F4** | A Spanish sentence typed straight into a route | 🔴 *"1 Spanish literal(s) outside src/strings.ts"* |
| **F5** | `toFixed` added **inside `src/format/mxn.ts`** — the file exempt from the division rule and not from this one | 🔴 *"a peso-valued float could be made"* |
| **F6** | `/ 100` in `src/wiring.ts` | 🔴 — same assertion, other spelling |
| **F7** | `fontSize: 32` hardcoded on the one screen that has a size | 🔴 *"elder mode cannot change these"* |
| **F8** | A second module reading `process.env` | 🔴 *"reading the environment outside the one module that may"* |
| **F9** | A module's `// =====` header deleted | 🔴 *"1 module(s) with no header"* |
| **F10** | An `R10` added to the page and not to the script | 🔴 *"the page and this script disagree about which rules exist"* |
| **F11** | ⚠️⚠️ `R3`'s page claim flipped to *"enforced"*, script untouched | 🔴 *"R3: the page says it is enforced, this script stated it"* |
| **F12** | Twenty source files removed, so every loop goes quiet | 🔴 *"only 2 source and 11 test files were read"* — the anti-vacuity guard |
| **F13** | ⚠️⚠️ **THE REVERSE ONE.** A comment naming `NEXT_PUBLIC_`, `process.env`, `toFixed(2)`, `/ 100`, `fontSize: 16` and a Spanish sentence, all at once | ✅ **GREEN** — and it was RED before the comment stripping |
| **F14** | ⚠️ **Added 2026-09-13 with the `5b.5` cross-check.** The `5b.5` row marked `DONE` in the plan, the page still deferring to it | 🔴 *"the page says the second pass is owed at 5b.5, but docs/PLAN.md has no open 5b.5 row"* |
| **F15** | The page's deferral section deleted while `5b.5` is still open | 🔴 *"the page now reads as complete when it is not"* |

⚠️ **F11 AND F13 ARE THE TWO THAT MATTER.** F11 is the stale-copy family caught in its
newest form — not a duplicated row, but a page and a script disagreeing about *whether a
claim is checked at all*. F13 is the only falsification in this repository whose expected
result is green, and it is the one that keeps the guard from eating the comments.

##### ⚠️ What `5a-iv-b` did NOT do

- **It took no reading.** All six of `5a-iv-a`'s readings and the day-0 pre-check are
  still owed, and `5a-iv-a` is still the next task.
- ~~**It did not settle §3's `src/api/` and `src/ui/` question**~~ ✅✅ **RULED BY THE
  OWNER 2026-09-13, the day after this merged — *"do the second pass after 5b."*** The
  re-sequencing stands; `CONVENTIONS.md` describes no API-wrapper or primitive
  conventions because there are none, and it gets a second pass at **`5b.5`**, once
  `5b` has produced a pattern rather than a guess at one. ⚠️ **The page says so itself,
  and `conventions-gate.sh` asserts that the page and the `5b.5` row agree** — a
  deferral that goes stale is the defect this whole task was about.
- **It added no rule the code did not already keep.** Every one of `R1`–`R9` was read
  out of `app/src`; the only edit to app code was the five imports in `F1`'s family.

---

#### ✅✅ `5a-iii-b` IS DONE AS OF 2026-09-11 — Google, the last screen, and a check that was written and then deleted

**The suite grew from 90 assertions to 132, and the gate from 13 to 15.** What shipped:

- **`app/src/auth/oauth.ts`** — the round trip as the half that decides. The redirect
  URI as a constant, and the callback URL read into exactly three outcomes: a code, a
  cancellation, a named failure. Imports nothing from `expo-*` or supabase-js, which is
  what makes it loadable by a node suite at all.
- **`app/src/lib/supabase.ts`** — ⚠️ **`flowType: 'pkce'`, one line, and the default is
  `implicit`.** See below; it is the security decision of this task.
- **`app/src/auth/AuthProvider.tsx`** — `signInWithGoogle`, three impure steps over
  `oauth.ts`'s rules, and a log-out that now also forgets the last screen.
- **`app/src/navigation/lastScreen.ts`** — C1.3, as an allow-list plus a pure
  `restoreTarget()` plus three total storage functions.
- **`app/src/app/_layout.tsx`** — the `Gate` now does three things in a fixed order:
  guard, restore once, record.
- **`app/src/app/(auth)/entrar.tsx`** + **`app/src/strings.ts`** — the button and its
  two Spanish sentences.
- **`docs/checks/5a-iii-gate.sh`** — two new live assertions, and one **deliberately
  absent** one with the measurement that settled it written where it would have gone.

##### ⚠️⚠️ THE ONE THAT MATTERS: `flowType` DEFAULTS TO `implicit`, AND IMPLICIT PUTS A NON-EXPIRING REFRESH TOKEN IN A URL

supabase-js defaults to the **implicit** flow (`GoTrueClient.js`, `flowType: 'implicit'`).
Under it, GoTrue completes the round trip by redirecting to the callback with **the
access and refresh tokens themselves in the URL** — and this app's callback is a custom
scheme, `mx.bserafin.wera://`, which **any app on the phone may also register**. A
refresh token does not expire. Handing one to the operating system's URL router is the
same class of mistake as the `service_role` key `env.ts` refuses, and it has the same
property that would let it ship: **it works.** Sign-in succeeds. Nothing errors.

✅ **PKCE instead** — the callback carries a one-time `code`, worthless without the
verifier this client kept in its own storage. RFC 8252 is not ambiguous about which one
a native app uses, and Supabase's own guidance for React Native agrees.

⚠️ **It changes nothing for email.** `signInWithPassword` does not consult the flow
type, and confirmations are off on this project, so there is no magic link to affect.
The email suite from `5a-iii-a` is green unchanged.

⚠️ **AND IT IS GUARDED TWICE, ON PURPOSE.** `parseOAuthReturn` reports tokens in the
callback as a named failure — that catches the line being removed, but only at runtime,
on a phone, after a real sign-in. `app/test/oauth.test.ts` reads the line out of the
source, which catches it **in CI, on the pull request that removes it**. L1 and L2 are
the two falsifications.

##### ⚠️⚠️ A CHECK FOR THE DASHBOARD REDIRECT LIST WAS WRITTEN, MEASURED, AND DELETED

This task's gate was *"one dashboard edit, taken DURING the task — Redirect URLs must
gain `mx.bserafin.wera://**`"*, and the obvious move was to assert it the way `5a-iii`'s
gate asserts the provider matrix: ask the live project. **It does not work, and finding
out took one command:**

| `GET /auth/v1/authorize?provider=google&redirect_to=…` | Answer |
|---|---|
| `mx.bserafin.wera://auth/callback` | `302` → `accounts.google.com/...` |
| `https://evil.example.com/steal` | ⚠️ **`302` → `accounts.google.com/...`, byte-for-byte the same shape** |

⚠️ **GoTrue does not validate `redirect_to` at the authorize step.** It validates at the
**callback**, after the provider returns — and a disallowed redirect is **not an error**
there either: the browser is quietly sent to the project's Site URL instead. Which is
precisely 5a-iii-b's named failure mode, *the browser opens and never comes back*,
arriving with no signal any machine outside that browser can read.

✅ **So the assertion was deleted and the measurement written into the gate where it
would have stood.** A check that returns the same 302 for the right answer and for
`evil.example.com` is this repository's most-repeated defect — **it runs, it passes, and
it has looked at nothing** — and shipping it would have been worse than shipping
nothing, because the next reader would have believed the allow-list was covered.

##### ✅ WHAT *IS* MEASURABLE IS THE OTHER CONSOLE, AND IT WAS NOT BEING WATCHED

The gate's founding finding was **Google built in the Google Cloud console but not
enabled on the Supabase side** — two halves, one done. The inverse half had no check at
all: the Cloud console's *Authorized redirect URIs* must contain
`https://<ref>.supabase.co/auth/v1/callback`, and if it does not, Google answers the
authorize request with **`Error 400: redirect_uri_mismatch`**. That is observable from a
terminal, so the gate now follows the redirect to Google and reads the answer.

| New gate assertion | What it catches |
|---|---|
| `/auth/v1/authorize` hands the phone to `accounts.google.com` | Google disabled or misconfigured on the Supabase side |
| Google accepts the client and its `redirect_uri` | ⚠️ The **Cloud console** half — a wrong or missing redirect URI, a bad client id/secret, a changed project ref |

**Three falsifications over the gate, all red**, the original confirmed green before and
after: **M1** the followed URL's `redirect_uri` mangled → *"Google refused the authorize
request"*; **M2** the provider changed to one that does not exist → *"did not redirect to
Google"*; **M3** every assertion silently skipped → the anti-vacuity guard at *"only 1
assertions ran, expected at least 14"*, which is the sixth suite in this repository to
carry one.

##### ⚠️ Found while measuring — THE SCOPE LIST IN THIS FILE WAS WRONG, AND IN THE HARMLESS DIRECTION

The Facebook-deferral note says the app *"requests only `email`, `profile`, `openid`"*
while reasoning about Google's *"unverified app"* interstitial. **The live authorize URL
requests `scope=email profile`** — no `openid`. The conclusion is unchanged and slightly
strengthened (fewer scopes, all of them non-sensitive), but it was a claim about a value
nobody had read, in a paragraph whose whole point was that *most likely is not a result*.
⚠️ **The interstitial is still `5a-iv`'s to measure on the phone.**

##### C1.3, and the rule that matters more than restoring

The plan wrote down before the task that C1.3's testable half is *"a pure function over
`(storedRoute, session)` returning a route"*. It is `restoreTarget()`, and it took **six**
refusals rather than the three the plan predicted:

| Rule | Why, in one line |
|---|---|
| Not until `ready` | `guard.ts`'s K5, verbatim: on a cold start `hasSession: false` only means nobody has asked |
| Nothing for a signed-out person | The plan's own wording, and it stops a restore racing the guard |
| ⚠️ **Once per launch, and this one is the important one** | Without it the effect re-decides on every navigation and drags a shopkeeper who just tapped Comprar back to Vender. **The app fighting the person holding it is a worse bug than never restoring at all** |
| Nothing stored → nothing | First launch |
| Not restorable → nothing | Junk, `/entrar`, or a route deleted between versions |
| Already there → nothing | A `replace` to the screen already showing is a wasted frame and a flicker |

⚠️ **`RESTORABLE_ROUTES` IS AN ALLOW-LIST AND NOT `anything except /entrar`.** Whatever
is in storage was written by an **earlier version of this app**; `5d` and `5e` add
routes and will eventually remove one. A deny-list restores a shopkeeper in October to a
screen deleted in September. **The list is tied to `TABS` by a test, not derived from it
at runtime** — so a fifth tab nobody can be returned to is a red test (L9) rather than a
silent, partial C1.3, which is the shape of a bug nobody ever reports.

##### ⚠️ AND `5a-iv` NOW CARRIES SIX, NOT FOUR — but two of the four got smaller

The table in `5a-iii-a` said four. This task adds two and **shrinks two others**, which
is worth separating because the second half is the only good news in this section.

| | Deliverable no CI can verify | Since |
|---|---|---|
| 1 | **C12.1** — the tab bar actually draws its words | `5a-ii` |
| 2 | **C3.18's numbers** — whether 76pt reads as "big" to someone old | `5a-ii` |
| 3 | The guard actually redirects, and the app is not stuck on a splash | `5a-iii-a` |
| 4 | **C1.4's persistence** — sign in, put the phone down for eight days, open it | `5a-iii-a` |
| 5 | ⚠️⚠️ **THE SUPABASE REDIRECT ALLOW-LIST** — and it is the highest-risk item in step 5a. See above: *unmeasurable from outside the browser*, and its failure looks exactly like a hang | `5a-iii-b` |
| 6 | **Google's *"unverified app"* interstitial**, if it appears at all | `5a-iii-b` |

✅ **What got smaller:** items 3 and 5's *"the effect was simply dropped"* half is now
readable in CI. `app/test/last-screen.test.ts` asserts that `_layout.tsx` still calls
`restoreTarget` and `rememberLastScreen`, and that `signOut` forgets before it signs out
(L13, L14). ⚠️ **That does not prove the router lands anywhere** — it cannot, and
`5a-iv` is still the instrument. It proves the call has not disappeared, which is the
specific regression the plan named as staying green.

##### Decisions taken on the owner's behalf in `5a-iii-b`

| | Call | Why, and what reversing costs |
|---|---|---|
| **1** | ⚠️⚠️ **PKCE, NOT THE LIBRARY DEFAULT** | See above. One line. ⚠️ **Reversing is cheap in code and expensive in what it means** — a non-expiring refresh token through a scheme any app may claim. `oauth.ts` refuses tokens in the callback and `oauth.test.ts` reads the line, so it cannot go quietly |
| **2** | ⚠️ **`expo-auth-session` NOT ADDED, AND THE SIZING ROW NAMED IT** | Its one contribution would have been `makeRedirectUri()`, which returns **a different string depending on how the app was started** — and the other copy of that string was typed into a web page once. A constant is what a test can hold against `app.json`. `expo-web-browser` was already a dependency; no dependency was added by this task. Reversing is one import |
| **3** | **The redirect is `mx.bserafin.wera://auth/callback`**, a path and not a bare scheme | A bare `mx.bserafin.wera://` gives a later reader nowhere to hang a second callback (`5i`'s Facebook, a password reset in `5b`). ⚠️ **The dashboard entry `mx.bserafin.wera://**` covers both, so this costs nothing today and is a rename plus a dashboard edit later |
| **4** | ⚠️ **An explicit log-out FORGETS the last screen; an expired session does not** | Logging out is the one deliberate *"I am done"* act in this app, and the realistic next person to hold the phone is a different one. A session that merely expired is not that, and they reopen where they were. Reversing is one line in `AuthProvider.signOut` |
| **5** | **A cancelled round trip shows NO message at all** | Closing the browser, and Google's `access_denied`, are the same act by different routes. The person knows what they did; a sentence about it is the bookkeeping the owner's rule refuses to hand over |
| **6** | **A failed round trip names the button — *"…o entra con tu correo"*** | `algo salió mal` does not tell a shopkeeper that the other way in still works. ⚠️ **The technical detail goes to `console.warn` and never to the screen**: a missing Redirect URL is a developer's sentence and a developer is the only person who can act on it |
| **7** | ⚠️ **An error in the callback BEATS a code when both are present** | Exchanging a code that arrived beside an error report is acting on half a message. ⚠️ **Found by this suite asserting the opposite** — the fixture was what was wrong, and the rule is now written down rather than being whatever the order of two `if`s produced |
| **8** | **The last screen lives in the same `expo-sqlite` store as the session** | §2.11's local-state row is about the **cart** (*"Zustand, cart only"*), and a route is neither server state nor an uncommitted sale — it is a device setting, the same category `5a-ii` put the density mode in. ⚠️ **This is the second non-cart value in that store**, and `5c` brings the third plus Zustand. Worth a look then; not worth a second storage engine now |

##### Fifteen falsifications, all red, run by hand before this was pushed

The working tree was committed first, **every fixture was diffed against the original
before the suite ran on it, and a fixture that edited nothing is reported as proving
nothing** rather than counted as a pass. The unmodified tree was green before and after.

| | Break | Result |
|---|---|---|
| **L1** | ⚠️ `flowType: 'pkce'` removed — tokens through a custom scheme | 🔴 *"keeps the client in PKCE mode"* |
| **L2** | Tokens in the callback silently accepted | 🔴 *"refuses tokens in the callback"* |
| **L3** | A decline reported to the shopkeeper as a failure | 🔴 *"treats Google's access_denied as a cancellation"* |
| **L4** | The deep-link scheme "tidied" to `wera` | 🔴 *"builds the callback from app.json's own scheme"* |
| **L5** | The fragment no longer parsed — a real error becomes *"no code"* | 🔴 *"reads a failure reported after the hash"* |
| **L6** | ⚠️ The restore re-decides on every render | 🔴 *"restores once per launch and then leaves them alone"* |
| **L7** | The restore acts before the session has been looked for | 🔴 *"moves nobody until the stored session has been looked for"* |
| **L8** | The allow-list swapped for *"anything but `/entrar`"* | 🔴 *"covers exactly the tab bar"* |
| **L9** | ⚠️ A fifth tab added, `RESTORABLE_ROUTES` not updated | 🔴 *"covers exactly the tab bar, in the same order"* — and four of `5a-ii`'s C12.1 assertions besides |
| **L10** | A full disk on a phone becomes an exception | 🔴 *"survives a store that throws on every call"* |
| **L11** | `openAuthSessionAsync` swapped for a plain browser | 🔴 *"returns through an auth session and not a plain browser"* |
| **L12** | `/entrar` written into storage | 🔴 *"does not store what it would refuse to restore"* |
| **L13** | The log-out stops forgetting the last screen | 🔴 *"forgets the last screen when the session is ended on purpose"* |
| **L14** | The restore effect dropped from the root layout | 🔴 *"decides the restore in the root layout"* |
| **L15** | An error beside a code no longer wins | 🔴 *"lets an error beat a code when a malformed callback carries both"* |

⚠️ **L11'S FIRST SPELLING WAS `not.toContain('openBrowserAsync')`, AND IT WENT RED
AGAINST A COMMENT** — the one in `AuthProvider` explaining why that function is *not*
used. **This is the third time in four sessions that a guard asserted over the wrong
unit**, after `5i`'s G5 (a row grepped whole when the claim was about one cell) and
`5a-ii`'s F9. The tell is identical every time: **a claim phrased about a specific thing
while the code looks at a container holding that thing among others.** Fixed by matching
a call — `/WebBrowser\.openBrowserAsync\s*\(/` — rather than a word.

##### What `5a-iii-b` did NOT do, deliberately

- ✅ **The Supabase dashboard edit — CLOSED BY THE OWNER 2026-09-12**, the day after
  this task shipped. Redirect URLs now carry `mx.bserafin.wera://**`. ⚠️⚠️ **IT IS A
  REPORT AND NOT A MEASUREMENT, AND THAT DISTINCTION IS THE WHOLE POINT OF THIS
  PARAGRAPH** — no check in this repository can confirm it (see the deleted assertion
  above), and the gate script was re-run afterwards and still read 15/15 without
  noticing. **This repository exists because the last one recorded decisions no machine
  had checked**, so: the first instrument that can tell is `5a-iv-a`, on the phone. If
  Google sign-in there opens a browser that never comes back, THIS ROW IS THE FIRST
  THING TO DOUBT.
- **No Facebook.** `5i`'s, and the deferral's four coverage claims still hold.
- **No `linkIdentity()`**, and `enable_manual_linking` is still `false` at
  `supabase/config.toml:188`. `5i`'s.
- **The density mode is still not persisted** — the store now holds two things and could
  hold a third, but the surface that sets the mode is still the temporary block on Inicio
  that `5b`'s Ajustes deletes. Writing from a file that gets deleted is how a setting
  loses its owner.
- **No `expo-auth-session`, and no new dependency of any kind.**

#### ✅✅ `5a-iii-a` IS DONE AS OF 2026-09-11 — the client, the session, and the way in that needs no deep link

**The first task in this repository whose subject is a value the app HOLDS rather than
computes, and the suite grew from 48 assertions to 90.** What shipped:

- **`app/app.json`** — the identity. **Wera**, `mx.bserafin.wera` on both platforms, and
  the scheme. ⚠️ **The scheme is set to the bundle id itself** — see the decisions below.
- **`app/.env.example`** — committed, the names and no values, carrying the
  `EXPO_PUBLIC_` / `NEXT_PUBLIC_` warning and the secret-key one.
- **`app/src/lib/env.ts`** — the two values `createClient` is built from, **as a pure
  function over a record**, and the refusal that is the point of the file.
- **`app/src/lib/supabase.ts`** — the one client, on `expo-sqlite` storage, with the
  `AppState` refresh loop registered once at module scope.
- **`app/src/auth/guard.ts`** — C1.4's route rule as a pure function; the effect that
  acts on it is four lines in `_layout.tsx`.
- **`app/src/auth/errors.ts`** — every failure as a Spanish sentence, and **nothing
  supabase-js said ever reaches a screen**.
- **`app/src/auth/credentials.ts`** — what is checked before the network is asked.
- **`app/src/auth/AuthProvider.tsx`** + **`app/src/app/(auth)/entrar.tsx`** — the
  session in context, and email sign-in / sign-up / log-out over it.

##### ⚠️⚠️ THE ONE THAT MATTERS: A `service_role` KEY IN THE CLIENT IS NOT A BUG THAT FAILS, IT IS ONE THAT WORKS

Every isolation guarantee this repository has proved since step 3 — forty-one policies,
the RLS and location-isolation pgTAP suites, every green `db.yml` run since — is enforced
by Postgres **against the key the request arrives with**. Hand the phone the secret key
and the whole of it evaluates to nothing, silently, on a device in somebody else's shop.
⚠️ **And the wrong key does not error. It works better** — nothing is filtered — which is
exactly the property that would let it ship.

✅ **So `readSupabaseEnv()` refuses to build a client with one**, and it refuses **both
spellings**: the current `sb_secret_…` prefix and the **legacy `service_role` JWT** that
projects created before the key change still carry. ⚠️ **The second is the one a grep
cannot see.** A JWT's claims are base64url, so the words `service_role` appear nowhere in
the token text — a guard that searched the string would run, pass, and have looked at
nothing, which is this repository's sixth shape of misleading green wearing a new hat.
The payload is therefore **decoded and read**, with a hand-rolled twelve-line base64url
decoder rather than `atob`, because the same code runs under Hermes on the phone and node
in CI and a guard that silently stops guarding on the runtime nobody tested is the defect
it exists to prevent. **K1 proves it: the fixture's token contains no such word, and
removing the decode turns the suite red.**

⚠️ **`docs/checks/5a-iii-gate.sh` ASSERTS THE SAME THING AND THIS IS NOT A DUPLICATE.**
The gate reads `app/.env.local` — gitignored, network-dependent, **cannot run in CI**. It
answers *"is the owner's laptop configured correctly today"*. `app/test/env.test.ts` runs
on every pull request and answers *"does the app still refuse the wrong key"*. The first
is an instrument; the second is evidence in §9's sense.

##### ✅ F9's DEFECT IS NOW IMPOSSIBLE BY CONSTRUCTION, NOT CAUGHT BY A TEST

`5a-ii` found an assertion that ran, passed, and could not distinguish the defect its own
comment named: `label: 'Vender'` typed in place and `label: ES.tabs.vender` are **the same
string** once the module has loaded, so a value assertion cannot tell centralised from
decentralised. It was closed there with a check that reads the source text.

✅ **`errors.ts` closes it a level earlier: the map's values are KEYS of `ES.auth.errors`,
not sentences.** A Spanish sentence typed in place is not a key, and the compiler says so
— **K8 is `error TS2322`, not a failing assertion.** ⚠️ **This is worth generalising, and
it is the finding of this task:** where a table points at centralised text, point at it
**by key**. The type system then enforces what `5a-ii` needed a source-text guard for.

⚠️ **The source-text guard is still here, because there is a defect no type can see:** a
second component importing the client and handling its own failures in English.
`app/test/auth-errors.test.ts` asserts that **`supabase.auth` is touched in exactly two
files** and the client imported in exactly one — §2.11's *"juniors never call
`supabase.rpc` directly"* asserted one step early, for auth. **K11 adds a second caller
and it goes red; K12 points the same check at a tree with no client in it and it goes red
rather than passing vacuously** (the split's F1, held).

##### ⚠️⚠️ C1.4's REAL FAILURE MODE IS NOT "THE SESSION IS LOST" — IT IS "THE SESSION IS NOT LOOKED FOR YET"

Reading the stored session out of `expo-sqlite` is **asynchronous**, so for the first
frames of **every** cold start — including a signed-in one — *"no session"* and *"nobody
has asked"* are the same value. A guard that acts on it sends a shopkeeper who never
logged out back to the sign-in screen **every morning**, and the symptom is identical to
C1.4 being broken outright.

✅ **So `redirectFor()` takes `ready` as well as `hasSession`, and moves nobody until the
question has been asked.** K5 removes that early return and the suite goes red. ⚠️ **This
is the kind of defect that would have been found on the phone in `5a-iv` and blamed on
the session store** — a whole afternoon's debugging of the wrong component.

##### ⚠️ WHAT NO CHECK IN THIS REPOSITORY CAN SEE — `5a-iv` NOW CARRIES FOUR

⚠️ **SUPERSEDED BY `5a-iii-b`, WHICH TOOK IT TO SIX AND SHRANK TWO OF THESE FOUR.** The
table below is the state as `5a-iii-a` closed; the current list is in `5a-iii-b`'s
write-up above.

The plan wrote this up **before** the task, for `5a-iii-b`, and it applies verbatim here:
the testable half is the one that **decides** — a pure function returning a route — and
the half no suite can see is **whether the router actually lands there**. `_layout.tsx`
could drop the effect or hand it the wrong segments and all 90 assertions stay green.

| | Deliverable no CI can verify | Since |
|---|---|---|
| 1 | **C12.1** — the tab bar actually draws its words | `5a-ii` |
| 2 | **C3.18's numbers** — whether 76pt reads as "big" to someone old | `5a-ii` |
| 3 | ⚠️ **The guard actually redirects** — and that the app is not stuck on a splash | `5a-iii-a` |
| 4 | ⚠️ **C1.4's persistence** — sign in, put the phone down for eight days, open it | `5a-iii-a` |

⚠️⚠️ **`5a-iv` WAS SIZED `S/M` AS "A DEVICE BUILD, A NICE-TO-HAVE BEFORE JUNIORS
ARRIVE".** It is now the sole instrument for six deliverables across four tasks, and
**it should be re-sized before it is taken**, not during. That is a call for the owner:
it is the only task in step 5 that needs his Mac and his hardware in the room.

##### Decisions taken on the owner's behalf in `5a-iii-a`

| | Call | Why, and what reversing costs |
|---|---|---|
| **1** | ⚠️⚠️ **THE DEEP-LINK SCHEME IS THE BUNDLE ID ITSELF — `mx.bserafin.wera://`**, not `wera://` | ⚠️ **CHEAP TODAY, DEAR THE MOMENT `5a-iii-b` PASTES IT INTO THE SUPABASE DASHBOARD**, because the other copy of this string lives in an allow-list no file here can read. One value to keep in step instead of two, and a reverse-DNS scheme cannot collide with another app's `wera://`. `app/test/identity.test.ts` ties the two together (K13). Reversing today is one line and one dashboard row; after `5a-iii-b` it is a sign-in where the browser opens and never comes back |
| **2** | **`slug` moved from `tienda` to `wera`** | The slug is what EAS names the project. ⚠️ **Free only until an EAS project exists** — C1.6 defers that until the pilot is in place, so the window is open now and closes at the first build. Reversing after that re-points a project |
| **3** | ⚠️ **The route is `/entrar`, and the groups are `(auth)` and `(tabs)`** | Spanish for the route a person could conceivably see; English for the groups, which are structure and appear in no URL a shopkeeper reads. `groupOf()` is the one place the strings are matched. Reversing is a directory rename |
| **4** | **`react-native-url-polyfill` added, a third new dependency** | Supabase's own current Expo quickstart ships it. ⚠️ **Not measured on this RN version** — Hermes' `URL` may well be sufficient at 0.86, and the honest statement is that following the vendor's quickstart was preferred to discovering the answer on a phone in a shop. Removing it is one import |
| **5** | **The log-out sits temporarily on Inicio**, beside 5a-ii's density switch | It belongs in Ajustes (`5b`, §2.8). It is here because **C1.4's persistence cannot be demonstrated without it**: the only way to tell a session that survived from one that was never asked for is to end one deliberately and be asked again. ⚠️ **WHOEVER BUILDS AJUSTES DELETES BOTH BLOCKS** |
| **6** | **A six-character password minimum, mirrored from Supabase's default** | ⚠️ **Mirrored, not owned.** The server stays the authority and `errors.ts` carries `passwordShort` for the case where it refuses something this let through. The value of checking early is a Spanish sentence instead of a round trip from a shop with no signal |
| **7** | **Wrong password and unknown account are ONE message** | Telling them apart tells a stranger holding the phone whether an address has an account here. Reversing is one line in `errors.ts` |
| **8** | **The address is lowercased and trimmed; the password is not touched** | ⚠️ **Whether Supabase would also normalise the address is UNMEASURED and is not assumed** — it is widely said to, that is a claim about somebody else's system, and normalising here costs one line and makes the answer not matter. The password is deliberately the opposite call: a space may have been chosen, and stripping it means the password that was set is not the password that is sent |
| **9** | **The env misconfiguration messages are English and not in `ES`** | Every one is a build-time fault in a build the owner made on his own Mac; it fails identically on the first launch of every device and the reader is always a developer. §2.11's one-strings-file rule is about what the app SAYS TO A SHOPKEEPER, and a shopkeeper cannot reach these |

##### ⚠️ Found in this task — `process.env` CANNOT BE PASSED AS AN OBJECT, AND IT TYPECHECKS

Expo's babel plugin **inlines `process.env.EXPO_PUBLIC_FOO` as a literal where it is
written**. It does not build a populated `process.env` for the bundle. So
`readSupabaseEnv(process.env)` compiles, passes every test in node, and hands the app **an
empty object on a device** — a client built from `undefined`, failing later as a network
error reported by whichever screen asked first. ⚠️ **No check in this repository can see
it**, which is why the two member expressions are written out in full in `supabase.ts`
with the reason beside them.

⚠️ **The same shape as the `NEXT_PUBLIC_` trap, and it is worth saying once: the
bundler's view of this file is not node's.** `app.yml` runs node. Both traps are invisible
to it, and both are caught only by the gate script or by the phone.

##### Fifteen falsifications, all red, run by hand before this was pushed

**The working tree was committed first** (5a-i's `git checkout` finding) and **every
fixture was diffed against the original before the check ran on it** (the split's F1 — a
`sed` that edited nothing, a check that read an unmodified file, and a green that measured
nothing). The unmodified tree was confirmed green first and green again after.

| | Break | Result |
|---|---|---|
| **K1** | A legacy `service_role` **JWT** accepted — the token text contains no such word | 🔴 *"refuses a legacy service_role JWT"* |
| **K2** | The `sb_secret_` prefix no longer refused | 🔴 *"refuses an sb_secret_ key"* |
| **K3** | A trailing slash on the URL allowed | 🔴 — supabase-js would append `/auth/v1` to it |
| **K4** | `http://` allowed | 🔴 *"refuses http://, which would carry the session in clear"* |
| **K5** | The guard acts **before** the stored session has been looked for | 🔴 *"stays put on a cold start, signed in or not"* |
| **K6** | A signed-out person redirected while already at the way in | 🔴 *"no redirect loop"* |
| **K7** | supabase-js's **English** message put on the screen | 🔴 *"answers every known code with one of the Spanish sentences"* |
| **K8** | A Spanish sentence typed in place instead of a key | 🔴 **`error TS2322`** — F9's defect, now a compile failure |
| **K9** | The address no longer lowercased | 🔴 *"lowercases and trims"* |
| **K10** | The password trimmed | 🔴 *"leaves the password exactly as typed"* |
| **K11** | A second component calls `supabase.auth` directly | 🔴 *"touches supabase.auth in AuthProvider and nowhere else"* |
| **K12** | That source-text check pointed at a tree with no client in it | 🔴 — it does not pass vacuously |
| **K13** | ⚠️ The deep-link scheme quietly "tidied" to `wera` | 🔴 *"uses the bundle identifier as the deep-link scheme"* |
| **K14** | The iOS bundle identifier dropped | 🔴 *"carries the same bundle identifier on both platforms"* |
| **K15** | The app renamed away from `Wera` | 🔴 *"is named Wera where a person can read it"* |

##### What `5a-iii-a` did NOT do, deliberately

- ⚠️ **No Google button.** `5a-iii-b`'s, and the seam held: **everything shipped here
  works with the network down and the browser closed.**
- ⚠️ **No last-screen restore (C1.3).** `5a-iii-b`'s, and the guard is written so it has
  nothing to fight — a signed-in person on any route inside the app is left where they are.
- ⚠️ **The density mode is still not persisted.** The sizing note said storage arrives with
  `5a-iii`, and the storage engine now exists — but the mode is a **device** setting (5a-ii's
  decision 4) and the surface that sets it is `5b`'s Ajustes. Persisting it behind a
  placeholder switch would put the write in the file that gets deleted.
- **No `onboard_workspace`, no membership, no location.** `5b`'s, and C1.5 already removed
  the location picker.

##### ⚠️ Untouched and worth a line: the Expo SDK has drifted since `5a-i`

`npx expo install --check` reports **thirteen packages** a patch or two behind what SDK 57
now expects (`expo@57.0.20` against `~57.0.22`, and so on), all of it accumulated since
`5a-i` on 2026-09-07. ⚠️ **Not bundled into this task**: a thirteen-package bump is its own
change with its own verification, and hiding it inside an auth commit is how a regression
arrives attributed to the wrong thing. **`expo-sqlite@57.0.3` — the one dependency this
task added from the SDK — is already the expected version**, so nothing here is behind.

#### ✅✅ `5a-ii` IS DONE AS OF 2026-09-07 — the scale, the formatter, and the first client rule a machine can read

**The first app code with anything to assert, and `app.yml`'s test half earned its
place: 48 assertions over four files, up from 5a-i's three.** What shipped:

- **`app/src/theme/density.ts`** — C3.18's two modes as ten sized tokens, both typed
  `DensityScale`, so a token added to one mode and forgotten in the other **fails the
  typecheck** (falsification F13). Elder rows are 76pt against normal's 56.
- **`app/src/theme/DensityProvider.tsx`** — one context, `useDensity()`. The rule for
  every screen from `5d` on: *a size a person looks at comes from the scale, never
  from a literal.*
- **`app/src/format/mxn.ts`** — C12.2. `$1,234.50`, `$1,234`, `-$0.05`.
- **`app/src/navigation/tabs.ts` + `app/src/app/(tabs)/`** — C12.1's shell: four tabs,
  each an icon **and** a Spanish word, sized from the scale.
- **`app/src/strings.ts`** — §2.11's *"hardcoded Spanish, centralised in one file"*,
  which was owed by the stack table and named by no task.

##### ⚠️⚠️ THE FINDING: C12.1's OTHER HALF IS THE FIRST DELIVERABLE IN THIS REPOSITORY THAT NO CHECK CAN SEE, AND THE ADR IS WHY

**Falsification F14 set `tabBarShowLabel: false` — the one line that turns *icons plus
words* into *icons alone*, the thing C12.1 forbids in terms — and NOTHING TURNED RED.**
Typecheck green, 48 assertions green, `app.yml` would have merged it.

⚠️ **It is not a hole in the suite. It is the boundary the owner drew on 2026-09-07
working as specified**: §2.11 allows a test that pins a value and **refuses suites over
rendering, navigation and layout**, and *"the label is on the screen"* is a rendering
claim. Closing F14 needs a mounted component, which is the thing the amendment refuses.

✅ **What was done instead: move as much of C12.1 as possible out of JSX and into
data.** The tabs are a table in `src/navigation/tabs.ts`, and `app/test/tabs.test.ts`
asserts over its values — every tab has a word, the word is one of the four in the
strings file, the word is **Spanish** (F10), the glyph name exists in the shipped
MaterialCommunityIcons map (F11), no two tabs look alike. Thirteen assertions, no
component mounted, no rendering asserted. **A tab with no word is now red; a tab bar
told not to draw the words is still green.**

⚠️ **SO `5a-iv` IS LOAD-BEARING IN A WAY THE SIZING DID NOT KNOW.** It was written up as
*"the only task in this step no CI can verify"* — a device build, a nice-to-have before
juniors arrive. It is now **the only check that will ever look at C12.1**, and the
owner holding the phone is the instrument. If `5a-iv` slips, that deliverable ships
unverified.

##### ⚠️ Found in `5a-ii` — F9 WAS GREEN, AND THE ASSERTION THAT MISSED IT WAS THE ONE WHOSE COMMENT CLAIMED IT

`label: 'Vender'` typed straight into the tab table and `label: ES.tabs.vender` are
**the same string once the module has loaded**, so the value assertion — *"the label is
one of the words in `ES.tabs`"* — passes on both. Its comment claimed it caught *"a tab
label typed in place, not centralised"*. It could not. And centralisation is precisely
what §2.11's one-strings-file row is for: a second copy drifts silently, and the first
copy always looks harmless.

✅ **Closed with a check that reads the source text** — the same shape as
`docs/checks/5a-split-coverage.sh` reading Markdown, and for the same reason: some
claims are about the text, not about the values. ✅ **And it carries a guard on the
guard** — F16 pointed it at a file with no `label:` lines and it went red rather than
passing vacuously, which is the lesson of the split's own F1.

⚠️ **This is a new shape of misleading green, and it is the sixth**: not a suite that
ran nothing (3.3, 3.6a, the split's F1), not a report block that miscounted (4b-i), not
a stale symlink (5a-i) — **an assertion that ran, passed, and could not distinguish the
defect its own comment named.** The others are caught by counting; this one is only
caught by falsifying the specific sentence in the comment.

##### Sixteen falsifications, run by hand before `5a-ii` was pushed

Fifteen red, one green, no broken fixtures. **Every fixture was diffed against the
original before the check ran on it** (the split's F1), and **the working tree was
committed first** (5a-i's `git checkout` finding).

| | Break | Result |
|---|---|---|
| **F1** | `mxn.ts` hardcodes a comma decimal separator | 🔴 *"renders the decision register entry verbatim: $1,234.50"* |
| **F2** | Centavos are never hidden at zero | 🔴 *"hides the centavos when they are zero"* |
| **F3** | The centavo pair is not zero-padded — `$0.5` | 🔴 *"shows exactly two centavos when there are any"* |
| **F4** | The integer guard removed, so a peso renders as a centavo | 🔴 *"throws on a fractional argument rather than rendering a tenth of it"* |
| **F5** | The peso count is formatted without grouping | 🔴 *"$1,234.50"* |
| **F6** | One elder token left equal to normal's | 🔴 *"elder.rowGap (8) is not larger than normal.rowGap (8)"* |
| **F7** | Normal mode drops below the platform touch floor | 🔴 *"normal tap target is below the floor"* |
| **F8** | A tab ships with an icon and no word | 🔴 *"comprar has a Spanish word from the strings file"* |
| **F9** | A label typed in place instead of centralised | ⚠️🟢 **GREEN — see above.** 🔴 after the source-text check |
| **F10** | The strings file is anglicised (`Sell`) | 🔴 *"names the modules in the domain vocabulary, not in English"* |
| **F11** | A glyph name mistyped, at runtime | 🔴 *"'cash-registerr' is not a MaterialCommunityIcons glyph"* |
| **F12** | A glyph name mistyped, at the typecheck | 🔴 `TS2820` |
| **F13** | A density token defined in one mode only | 🔴 `TS2741: Property 'tabBarHeight' is missing` |
| **F14** | **`tabBarShowLabel: false` — C12.1 broken outright** | ⚠️🟢 **GREEN. The finding of this task** |
| **F15** | The tab table emptied | 🔴 `TS1005` |
| **F16** | The new source-text guard pointed at a file with no labels | 🔴 — it does not pass vacuously |

##### ✅ Measured, not assumed — the float path and the case table

⚠️ **The obvious spelling of this formatter is `format(centavos / 100)`, and it is not
wrong at shop scale.** Said plainly because the measurement was made rather than the
argument assumed: **600 000 probes** — 400 000 across the whole safe-integer range plus
200 000 at shop size — found **zero** values where the naive float path disagrees with
`mxn.ts`'s integer path. The integer arithmetic is discipline, and the one place the
two genuinely part company is past 2^53, where `formatMXN` throws (F4's sibling
assertion). ⚠️ **`packages/money`'s header makes the same kind of admission about
`cases.json` and rule 1**, and for the same reason: a green that reads as evidence for
something it never tested is how this repository loses.

✅ **The formatter is checked against `cases.json`, not against itself.** All seventeen
line cases, three fields each: strip the locale's decoration and what is left must be
the `numeric(12,2)` string `packages/money` computed. A formatter that dropped a
thousands group, rounded to pesos or lost a trailing zero survives none of it — and the
expectations are the **one data file** §2.10 requires, not a second copy.

##### Decisions taken on the owner's behalf in `5a-ii`

| | Call | Why, and what reversing costs |
|---|---|---|
| **1** | ⚠️ **FOUR TABS, not §2.8's eight: Inicio, Vender, Comprar, Desperdicio** | These four **need no role**. Catálogo, Proveedores and Números are manager+, and **there is no session yet that knows who is holding the phone** (`5a-iii`) — a tab shown to a cashier who may not open it is worse than a tab not yet placed. Ajustes is a sheet, §2.8 said so. Reversing is one row in `src/navigation/tabs.ts` and one route file |
| **2** | ⚠️ **`formatMXN` lives in `app/`, not `packages/money`** | §2.11's *"money on screen"* row is client architecture, and `packages/money` is deliberately locale-free and exports no peso-valued anything. §2.10's argument for the third ownership line is about **the rounding rule**, which this does not touch: it takes integer centavos in and returns a string nothing parses back. ⚠️ **It does mean a junior owns the file that decides what a price looks like.** Reversing is a file move and one import |
| **3** | **The scale's actual numbers** — 56→76pt rows, 16→20pt body, 20→30pt money | C3.18 fixed the *shape* (*"big and at a glance"*, *"fewer rows on screen"*), never the values. Elder is 25–50% larger on every token, floor-checked at 48 (Apple's 44, Android's 48 — the larger wins, for **both** modes). ⚠️ **These are a guess until someone old looks at them**, which is `5a-iv`. Reversing is one file, no migration, no screens |
| **4** | ⚠️ **The density mode will be a DEVICE setting, not a workspace one** | Not yet persisted — storage is `5a-iii` — but the seam is written down now because it is the cheap moment. An elder shopkeeper and their twenty-year-old nephew share a workspace and do not share a pair of eyes (C1.5: personal phones, no shared till). ⚠️ **If it were a workspace column it would be a migration, and `5a-iii` would inherit one** |
| **5** | **`@expo/vector-icons` (MaterialCommunityIcons) added as the icon set** | SDK 57 no longer ships it inside `expo`, and the alternatives fail C1.1: `expo-symbols` is SF Symbols, iOS only. Glyph choices carry their reasoning in `tabs.ts` — `cash-register` for Vender, `truck-delivery` for Comprar because **receiving is a manager's job, not a shopper's cart** |
| **6** | ⚠️ **A temporary density switch sits on Inicio** | It belongs in Ajustes (`5b`) and in storage (`5a-iii`), and it is on the placeholder Home so that `5a-iv` can **look at elder mode on the actual phone**. An elder mode the owner cannot switch to is an elder mode he cannot judge. **Whoever builds Ajustes deletes the block** |
| **7** | **A zero total renders `$0`, not `$0.00`** | C12.2 read literally — centavos hidden when zero, and zero is a zero. ⚠️ **`5f`'s sticky basket total starts at `$0`**; if that reads wrong in the shop it is one line here, not a rule change |
| **8** | **Vitest needs the `@/` alias spelled a second time** (`app/vitest.config.ts`) | Metro reads the mapping from `tsconfig.json`; Vitest does not, so the first non-relative source module imported by a suite failed to **load**, not to compile. The two spellings can drift — but a wrong alias resolves to nothing and fails loudly |

##### What `5a-ii` did NOT do, deliberately

- ⚠️ **No `src/ui/` primitives.** §2.11's ten (`Money`, `ListRow`, `Field`…) are the
  live ADR conflict recorded above and are not this task's to grab. The placeholder
  three tabs share `src/scaffolding/Pendiente.tsx`, named so nobody mistakes it for a
  pattern, and each screen task deletes its own use of it.
- ⚠️ **No C12.3.** The 50-centavo ceiling is a display rule on **one number on one
  screen** — `5h`'s basket total — and `formatMXN` must not know about it. Unit prices
  and line totals are exact everywhere, and Comprar is not rounded at all.
- **No colours, no fonts.** Density is size. A palette would make "elder" a second
  theme and force every screen to choose between them.

#### ✅ `5a-i` IS DONE AS OF 2026-09-07 — the fourth workspace, and the third workflow

**The first app code in this repository, and the first CI run that ever looked at it.**
`app/` is an Expo **SDK 57** project (`expo@57.0.20`, `expo-router@57.0.19`, React Native
0.86, React 19.2), registered as `@tienda/app`, the fourth entry in the root manifest
beside `packages/*` and `supabase/vitest`.

⚠️ **The SDK version was read from the registry, not recalled.** `context7` was
installed before `5a` for precisely this and it earned its place on the first task: the
model's knowledge cutoff predates SDK 57, the current template flag is
`--template default@sdk-57`, and SDK 52+ **auto-detects a monorepo** — the manual
`metro.config.js` with `watchFolders` and `nodeModulesPaths` that every older guide
shows is documented as *pre-SDK 52* and is **not** in this project. A recalled answer
would have added a config file that does nothing, and it would have looked right.

**What is in `app/`, and it is deliberately almost nothing:** a `Stack` layout, one
placeholder route, and `src/wiring.ts`. The template's twenty-odd demo files — `explore`,
the themed components, the animated icons, the tab bar, the parallax header — were
**deleted rather than kept for reference**, along with nine unused image assets and the
`web` config block. `platforms` is `["ios","android"]` (C1.1), and the template's own
`CLAUDE.md`/`AGENTS.md` generation was suppressed (`--no-agents-md`): a second
instruction file inside `app/` would quietly become a second authority in a repository
whose working agreement lives in the root one.

##### The suite, and why `5a-i` has one at all

⚠️ **A workspace entry is a CLAIM, and `app/test/wiring.test.ts` is the measurement.**
It resolves `@tienda/money/cases.json` through `require.resolve` — **not** a relative
path, which would read the file through the filesystem and pass whether or not npm ever
linked anything — and asserts case `M1` (*16 % inclusive, one item at $11.60*) prices to
`11.60 / 10.00 / 1.60` across the workspace edge, plus `net + tax === gross`. **Three
assertions, no component rendered**, which is the boundary §2.11 was amended to draw.

⚠️ **The expectations are read from `cases.json`, never typed in.** §2.10 requires one
data file with two readers; a hardcoded `'11.60'` here would have made the app a third
copy of the expectations, which is the exact drift that section exists to prevent.

##### Eight falsifications, run by hand before `5a-i` was committed

| | Break | Result |
|---|---|---|
| **F1** | Case `M1` renamed in `cases.json` | 🔴 *"case M1 is missing from packages/money/cases.json"* — the vacuity guard fires **before** the value assertions, which would otherwise have run against `undefined?.expect` |
| **F2a** | `@tienda/money` renamed in `app/package.json`, `node_modules` left alone | ⚠️⚠️ **🟢 GREEN — see below** |
| **F2b** | The workspace genuinely unlinked (symlink removed) | 🔴 typecheck `TS2307`, suite *"Cannot find package '@tienda/money'"* |
| **F3** | `placeholderTotal` returns the literal `'11.61'` | 🔴 *"expected '11.61' to be '11.60'"* |
| **F4** | The whole suite deleted | 🔴 *"No test files found, exiting with code 1"* — the shape that would otherwise be silent |
| **F5** | The fourth workspace entry removed from the root manifest | 🔴 `npm error No workspaces found: --workspace=@tienda/app` — the **typecheck step** catches it, so the entry is asserted by the run |
| **F6** | Unit price scaled at `SCALE.money` instead of `SCALE.unitPrice` | 🔴 assertion failure — a real client bug shape, not a synthetic one |
| **F7** | `npm ci --dry-run` with F2a's renamed dependency | 🔴 `E404 @tienda/money-typo` — **what CI does, on the fixture that was green locally** |

##### ⚠️⚠️ Found in 5a-i — A STALE `node_modules` MAKES THE WIRING ASSERTION VACUOUS, AND IT IS THE FIFTH SHAPE OF MISLEADING GREEN

**F2a is the finding of this task.** Rename `@tienda/money` to a package that does not
exist in `app/package.json`, change nothing else, and **both the typecheck and the suite
stay green** — because the `node_modules/@tienda/money` symlink from the previous install
is still on disk and resolution never consults the manifest. The one thing `5a-i` exists
to prove is the thing a local green cannot see.

✅ **CI is not fooled, and F7 is the proof rather than the assurance**: `npm ci` reads the
manifest against the lockfile and dies with `E404` before a test runs. The workflow uses
`npm ci` and not `npm install` — the lockfile-is-the-pinned-input argument `money.yml`
inherited from `db.yml` — and that choice is now load-bearing for a second reason nobody
had written down.

⚠️ **The rule this leaves behind: a green `npm run test` on a developer's machine is not
evidence about wiring, only about code.** It joins 3.3's disarmed pgTAP exception,
3.6a's empty Vitest workspace, 4b-i's `where not passed`, and the sizing session's own
no-op fixture. **Four of the five were found by falsification and the fifth was found by
falsifying a falsification.**

##### ⚠️ Found in 5a-i — `git checkout` CANNOT RESTORE AN UNTRACKED FILE, AND THE HARNESS ATE THE WORK IT WAS CHECKING

The first falsification run reverted each fixture with `git checkout -- <path>`. `app/`
was **untracked at the time**, so every restore silently failed — and on
`package.json`, which *is* tracked, the restore succeeded all the way back to `HEAD`
and **removed the fourth workspace entry this task had just added**. The control run at
the end of the batch was red for that reason and not for any reason about the code.
✅ **Fixed by committing the working state before falsifying**, which is what the batch
should have done from the start and what the later runs did.

##### Decisions taken on the owner's behalf in `5a-i`, all cheap to reverse

| | Call | Why, and what reversing costs |
|---|---|---|
| **1** | **`app/` at the repository root**, not `apps/app` | ADR-035 §2.10's ownership table names `app/**` by name. Expo's own monorepo guide says `apps/*`; **the ADR wins a layout question about this repository.** Reversing is a `git mv` and one `paths:` filter |
| **2** | **The template's demo content deleted, not kept** | `5a-ii` would have opened by deleting it, and a reference implementation nobody chose is how four screens end up in four dialects (§2.10). Reversing costs one `create-expo-app` |
| **3** | **One Node version in `app.yml`, against `money.yml`'s two** | `money.yml` matrixes 22 and 24 because its subject is arithmetic that *"should not"* depend on the engine. That measurement exists; this workflow calls the same functions and would not add to it. Reversing is two lines |
| **4** | **`packages/money/**` is in `app.yml`'s `paths:` filter** | The app imports it, so a money change can break **this** workspace's typecheck while `money.yml` stays green on its own suite. Two workflows, different assertions, same edit |
| **5** | **The Expo template's `CLAUDE.md`/`AGENTS.md` suppressed** | `--no-agents-md`. A generated instruction file inside `app/` becomes a second authority next to the root `CLAUDE.md`, and nobody would have decided that |
| **6** | **TypeScript 6.0 in `app/`, 5.9 in `packages/money`** | Two majors in one tree, which npm resolves per workspace (verified: `app` gets 6.0.3 nested, `money` and root get 5.9.3). Taken because `expo/tsconfig.base` targets the template's own version and pinning it back to 5.9 to buy tidiness is the kind of fight §2.11 refuses with UI kits. ⚠️ **Worth a look if money's typecheck ever behaves oddly** |

#### ⚠️⚠️ Sized 2026-09-07 — `5a` IS AN `L`, IT SPLITS FOUR WAYS, AND THE SEAM IS THE CI HOLE BELOW

Sized before a line of it was written, under the working agreement — the same
discipline that split `4.5` three ways and `4b` two. ✅ **The letters are still free**
(no app code has merged), so these are `5a-i`–`5a-iv` in the `4b-i` / `4.5c-ii` shape
rather than a re-lettering of `5b`–`5h`.

**Why an `L` is too big for one session here, in one line:** the shell touches an app
framework, a workspace manifest, a CI workflow, three OAuth providers, a session store,
a theme scale and a money formatter — **seven surfaces, no two of which fail the same
way** — and three of them (the `paths:` filter, the OAuth redirect, the density scale)
are cheap today and dear once a screen rests on them.

| Task | What it is | Size | Gate |
|---|---|---|---|
| **5a-i** | **The workspace, and the machine that watches it.** The Expo project at **`app/`** — §2.10's ownership table names `app/**`, so it is **not** `packages/app` — configured for **iOS and Android from creation** (C1.1; a platform added later is a config change nobody reviews), Expo Router (§2.11), TypeScript, the **fourth entry** in the root manifest beside `packages/*` and `supabase/vitest`, and **`.github/workflows/app.yml`** on a `paths:` filter naming it. Nothing user-facing. | `M` | ✅ **CLEARED 2026-09-07** — the ADR was amended. **DONE 2026-09-07** |
| **5a-ii** | **The scale and the formatter.** The two density modes as a theme scale (C3.18), `$1,234.50` with centavos hidden at zero and exactly two when present (C12.2) over `Intl.NumberFormat('es-MX')` **for rendering only** (§2.11), the icons-plus-words tab shell (C12.1). ⚠️ **The first app code with anything to assert**, so it is where `app.yml`'s test half either earns its place or is admitted to be absent. | `M` | ✅ **DONE 2026-09-07** — 48 assertions, and one deliverable no check can see |
| **5a-iii** | ⚠️ **SPLIT IN TWO 2026-09-11 — see the sizing below; `5a-iii-a` is what gets taken.** **Auth and session.** The Supabase client, OAuth — **Google and email, ⚠️ FACEBOOK DEFERRED TO `5i`**, **no phone auth** (C1.4) — a session that persists until an explicit log-out, and last-screen restore (C1.3). ✅ **No location picker** (C1.5). | `L` — **not the `M/L` this table carried** | ✅✅ **CLEARED 2026-09-11.** Google live-checked on, email on, Facebook and phone off, confirmations off; `app/.env.local` valid against the project; the app is named **Wera** and the bundle id is `mx.bserafin.wera` |
| **5a-iii-a** | **The client, the session, and the way in that needs no deep link.** The app's identity in `app.json` (**Wera**, `mx.bserafin.wera`, the scheme), `.env.example`, the Supabase client and **where the session is stored**, `AppState` refresh, the signed-in/signed-out route guard, and **email sign-in, sign-up and the explicit log-out** (C1.4). ⚠️ **The first task in this repository whose subject is a value the app HOLDS rather than computes.** | `M` | ✅ **DONE 2026-09-11** — see the write-up below |
| **5a-iii-b** | **Google, and the last screen.** The OAuth round trip — ⚠️ **`expo-auth-session` was NOT used, see the decisions** — and **C1.3's last-screen restore**. ⚠️ **The deep link was the whole risk and it still is**: it is the only thing in `5a` whose failure mode is *the browser opens and never comes back*, and the half in the Supabase dashboard turned out to be **unmeasurable from outside a browser**, not merely unread. | `M` | ✅ **DONE 2026-09-11** — see the write-up below. ✅ **The dashboard edit was closed by the owner 2026-09-12**: Redirect URLs carry `mx.bserafin.wera://**`. ⚠️ **Reported, not measurable** — no check here can see it, and `5a-iv-a` is the first thing that can |
| **5a-iv** | ⚠️ **RE-SIZED AND SPLIT FOUR WAYS 2026-09-11 — see the sizing below; `5a-iv-a` is what gets taken.** **On the owner's own devices**, plus **`CONVENTIONS.md`**. A local dev build on his iPhone (C1.6) and the Android run decision register #13 asked for as an emulator smoke test, now on real hardware (C1.1). ⚠️ **The only task in this step no CI can verify**, and the only one that needs the owner's Mac in the room. ⚠️⚠️ **IT IS THE SOLE INSTRUMENT FOR SIX READINGS ACROSS FOUR TASKS**, which is what the re-size was for. | `L` — **not the `S/M` this table carried** | ⚠️ **The owner's hardware, and the ~$124/yr of C1.6 — a schedule dependency, not a code one** |
| **5a-iv-a** | **iOS, and the round trip.** The dev build on his own iPhone (C1.6), then everything visible in one sitting: Google sign-in end to end — **the redirect allow-list, the PKCE exchange, the *"unverified app"* interstitial** — the guard redirecting rather than hanging, **C1.3**'s restore landing, **C12.1**'s words, **C3.18**'s numbers. ⚠️⚠️ **ITS FIRST STEP IS THE DAY-0 RE-DEPLOY PRE-CHECK** — sign in, re-deploy, open, *still signed in?* — which answers the free-provisioning question before any clock is started and decides whether `5a-iv-d` is free or costs $99. | `M` | ✅✅ **DONE 2026-09-13, AND FULLY CLOSED — ALL SIX READINGS TAKEN.** ✅ **C3.18's opinion half was answered by the owner later the same day** — *"the letter sizes are big enough"* — so the density scale stands as built. ✅✅ **THE PRE-CHECK PASSED — `5a-iv-d` IS FREE, NO $99.** ⚠️⚠️ **It found a CRASH: `formatToParts` is absent on Hermes and took the app down on launch, with 26 green assertions over it.** |
| **5a-iv-b** | **`CONVENTIONS.md`** — one page (§3). ⚠️ **The one piece that needs no hardware**, placed to run while `5a-iv-d`'s clock ticks. | `S` | ✅ **DONE 2026-09-12** — `docs/CONVENTIONS.md` + `docs/checks/conventions-gate.sh`, wired into `app.yml`. ⚠️ **Taken out of order**, ahead of `5a-iv-a`, which needs the owner's Apple ID |
| **5a-iv-c** | ⚠️ **RE-SIZED AND SPLIT THREE WAYS 2026-09-13 — see the sizing below; `5a-iv-c-1` is what gets taken.** **Android, on real hardware.** C1.1's Oppo and Samsung, widening register #13's emulator smoke test. ✅ **A relative's Android for ONE EVENING** (confirmed 2026-09-12), so ⚠️ **the toolchain is installed and a build produced BEFORE it, on the emulator** — register #13's emulator rehabilitated as a toolchain rehearsal, not a verification. ⚠️ **On no critical path.** | `L` — **not the `S/M` this table carried** | ⚠️ **One evening with a borrowed Android** — ⚠️⚠️ **a SCHEDULING gate that binds `5a-iv-c-3` ALONE.** The first two pieces are ungated. The `S/M` was written without running `which adb`; measured, this Mac has no SDK, no `adb` and **no JDK at all** |
| **5a-iv-c-1** | **The toolchain, and an emulator that boots.** JDK 17 (AGP `8.12.0` / Kotlin `2.1.20` set the floor), the Android SDK command-line tools, `platform-tools`, a platform, build-tools, the emulator, an **`arm64-v8a`** system image, an AVD, licences accepted. ⚠️ **Nothing from this repository is involved**, which is the seam: this piece can only be wrong about the machine. | `M` | ✅✅ **DONE 2026-09-13 — 14/14.** It was **ungated**, as sized. `docs/checks/5a-iv-c-toolchain.sh` ends on a *booted* emulator whose ABI is read with `getprop`, not inferred from the package name |
| **5a-iv-c-2** | **The Release rehearsal.** `expo prebuild -p android` (generated, not committed — `/android` is already ignored), a **Release** APK, installed on the AVD and launched. ⚠️ **Decision register #13's emulator smoke test, discharged literally.** ⚠️⚠️ **And the first instrument that can look at `R10` on the SECOND runtime** — every `Intl` measurement behind that rule was taken on iOS Hermes, and Android Hermes backs ECMA-402 differently. | `M` | ✅✅ **DONE 2026-09-13** — `docs/checks/5a-iv-c-2-rehearsal.sh` 15/15, six falsifications. ⚠️⚠️ **`formatToParts` IS PRESENT on Android Hermes**, so `R10` is now an INTERSECTION of platforms |
| **5a-iv-c-3** | **The borrowed evening.** C1.1's actual Oppo and Samsung — the widening that made this task more than an emulator run. | `S` | ✅✅ **DONE 2026-09-13 — the evening was held A DAY EARLY**, on a Galaxy Z Flip 8 (Android 17 / One UI 9). **Six readings, six answers**; `docs/checks/5a-iv-c-3-runsheet.md` is now the filled-in record. ⚠️⚠️ **A5 found a real defect and it was fixed and re-verified on the same phone** — see the log |
| **5a-iv-d** | **The eight-day reading**, and nothing else — C1.4's persistence, measured. ⚠️ **On the owner's iPhone 15** — the Android routing was withdrawn 2026-09-12; see the correction in the sizing section. ⚠️⚠️ **AND THE IPHONE HALF WAS TRADED AWAY BY THE OWNER ON 2026-09-22, WITH THE DAY-8 READING ALREADY IN HAND AND THE DAY-30 ONE STILL PENDING.** ***"Override anything related to the 30 day session check. I want to keep working from my device."*** He is using the app daily now, so that phone refreshes its session on every open and can no longer answer the question. **What survives is the sealed AVD** — a different Google account, no provisioning clock — **which is the whole reason a second instrument was sealed**; the 2026-10-13 row in the ⏳ block carries it. ⚠️ **The day-8 answer is unaffected and already recorded: the session survived eight days on both instruments.** | `XS` in effort, **longest lead time in step 5** | ⚠️⚠️ **A DATE, NOT WORK — it is not the next task, it is a diary entry.** ⚠️⚠️ **THE DATE IS SET BY A `5a-iv-a` BUILD: DAY 0 IS 2026-09-13, THE READING IS DUE 2026-09-21.** ✅ The `5a-iv-a` day-0 pre-check passed, so this is free. ⚠️⚠️ **The profile expires `2026-09-20T06:19:32Z` — BEFORE the reading.** Re-deploy first (`xcodebuild … -allowProvisioningUpdates`, then `devicectl install`), *then* open and look. **Do not open Wera before then.** ✅✅ **A SECOND, CLOCK-FREE INSTRUMENT WAS SEALED 2026-09-13 18:23 CST** — the AVD `wera-reading-5a-iv-d`, Google-signed-in on a **different account**, seal-tested and powered down. ⚠️ **Do not boot it; use `wera-android-36` for design and testing** — opening the app restarts the clock. ✅ **Session config READ (a report, not a measurement): time-box `0`, inactivity `0` — nothing expires a session**; reuse detection **On** at a `10s` interval, which is where the real risk now sits. ⚠️ **Day 8 is a CHECKPOINT, not the answer — look again on 2026-10-13 (day 30).** |

✅ **Nothing in `5a`'s row was dropped in the split.** Its ten deliverables — the Expo
project, both platforms, OAuth, the persistent session, last-screen restore, the density
scale, the money formatting, icons-plus-words navigation, the local device run, and
`.github/workflows/app.yml` plus the workspace entry — land in **exactly one** sub-task
each. ⚠️ **That is checked rather than asserted** (`docs/checks/5a-split-coverage.sh`),
and the check earned its keep on the commit that introduced it: it caught **three
defects in this split** before anyone read it — `iOS and Android` promised by `5a` and
carried by no sub-task, `app.yml` claimed by two, and a **miscount that made the
coverage read eleven-of-eleven when the parent names ten**. ⚠️ **"Exactly one" is the
point, not "at least one":** a deliverable that appears in two rows is owned by neither,
which is the shape a dropped line takes when two tasks each assume the other has it.

⚠️ **`5a-i` is deliberately the smallest thing a machine can review, and folding it
into `5a-ii` is the mistake to avoid.** The pull is real — a scaffold gives a reviewer
nothing to look at, so it feels like a commit worth combining. That is the trade the
section below already refused once: the workflow has to exist on **the first app
commit**, not the first interesting one, because **a `paths:` filter added later was
wrong for every commit that merged before it** — and this repository exists because the
last one recorded decisions no machine had checked.

⚠️ **`CONVENTIONS.md` is owed, was in no version of this file's `5a`, and is now in
`5a-iv`.** §3 names it in terms — *"Plus `CONVENTIONS.md` — one page. Hiring gates on
that file existing, because a junior arriving before it does will write the conventions
themselves, by accident, in four places."* It is **not** put in `5a-i`: a conventions
page written before `src/ui` and `src/api` exist is a guess at what the conventions will
be. The close of `5a-iv` is the first moment there is a pattern to describe. ⚠️ **It is
listed in the conflict table above rather than quietly inserted**, because §3 also
assigns `src/api/` and the `src/ui/` primitives to `5a`, and this file put them in
`5d`–`5h` without saying so.

#### Six falsifications, run by hand before the `5a` split was committed

`docs/checks/5a-split-coverage.sh` is the first check in this repository that reads a
Markdown file rather than a database, and the rule does not change: **a guard nothing
can turn red is not evidence.** Each fixture is a copy of `docs/PLAN.md` with one thing
broken; all six turn it red, with the failure naming the deliverable.

| | Break | Result |
|---|---|---|
| **F1** | `C3.18` deleted from the `5a-ii` row, parent untouched | 🔴 *"is in 5a and in NO sub-task — dropped by the split"* |
| **F2** | `C1.3` moved from `5a-iii` to `5a-iv` | 🔴 *"landed in 5a-iv, this split assigned it to 5a-iii"* |
| **F3** | The whole `5a-iii` row removed | 🔴 *"no table row for 5a-iii"* |
| **F4** | The **parent** `5a` row quietly shrunk | 🔴 *"no longer named in the parent 5a row"* — the coverage claim cannot be made true by deleting the promise |
| **F5** | Pointed at `docs/HANDBOOK.md`, which has no sizing table | 🔴 *"no table row for 5a-i"* — it does not pass vacuously on a file with nothing to check |
| **F6** | One deliverable claimed by two sub-tasks | 🔴 *"appears in 5a-ii 5a-iv — owned by neither"* |

⚠️⚠️ **F1'S FIRST FIXTURE WAS GREEN, AND THE FIXTURE WAS THE BUG.** A `sed` expression
with one escape wrong edited nothing, the check read an unmodified file and correctly
reported `10/10` — **a green that measured nothing, which is the fourth shape of it this
repository has hit**, after 3.3's disarmed pgTAP exception, 3.6a's empty Vitest
workspace and 4b-i's `where not passed`. It is recorded because the first three were in
suites and this one was in the *falsification of a suite*: the step that exists to
prove a guard works can itself assert nothing, and it looks exactly like success. **The
fixture is now diffed against the original before the check runs on it.**

#### ✅ Tooling settled 2026-09-07, before `5a` — one installed, one deferred, two unidentified

Reviewed because `5a` is the first task in this repository to write client code, and
the owner had four candidates carried over from setup. **Nothing was installed at the
time of the review — no MCP servers configured, no plugins enabled.**

- ✅ **`context7` INSTALLED** (HTTP, `https://mcp.context7.com/mcp`, keyless, verified
  connected). ⚠️ It is the only one with a clear case, and the case is this project's
  own named failure mode: **Expo's interfaces move faster than the model's knowledge
  cutoff**, and confidently-wrong code against a library that changed last month is
  indistinguishable, in tone, from code that is right. The endpoint was **read from
  the vendor's own repository rather than recalled** — which is the same discipline.
- ⏸️ **`superpowers` DEFERRED TO `5f`, not rejected.** A real MIT-licensed skills
  framework (Jesse Vincent / Prime Radiant) adding TDD, systematic debugging, planning
  and worktrees, auto-activating via hooks. ⚠️ **The reason to wait is that this
  repository's method is stricter than the one it brings**: falsification — break the
  guard, confirm something turns red — is what found **six separate shapes of
  misleading green**, several of them holes in the suites rather than in the code.
  Generic TDD finds none of those. ⚠️ **And two auto-activating workflow authorities
  compete**: `CLAUDE.md`'s *one task per session, sized and split in the plan first* is
  the rule that makes this build survive a context clear, and a planning skill that
  fires on its own is what erodes it. **`5f` is where it would earn its place** — the
  first task whose own structure is a risk. Telemetry is on by default
  (`SUPERPOWERS_DISABLE_TELEMETRY`).
- ❓ **`Headroom` and `ECC` remain unidentified**, as `docs/HANDBOOK.md` has said since
  setup. **They stay unidentified rather than guessed at.**

#### ⚠️⚠️ STEP 5 SHIPS CODE THAT NO CI COVERS, AND THAT IS A HOLE IN THE PROJECT'S FOUNDING RULE

Found while reconciling `docs/HANDBOOK.md` on 2026-09-07, not during either grill
round. **`db.yml` fires on `supabase/**`; `money.yml` fires on `packages/**`. Neither
matches an app directory.** So *"a file is not evidence; a green CI run is"* — the rule
this repository exists to enforce, and the rule the previous era died for want of —
**stops applying at exactly the point the codebase starts growing fastest.**

⚠️ The HANDBOOK's main prompt tells the owner to verify with *"`supabase db reset` and
CI"*. For every task in step 5 **that verifies nothing**: no migration runs, and no
workflow watches the files that changed. A green tick on `5a` would mean the two
existing workflows correctly decided they had nothing to do.

**Therefore, part of `5a`'s definition of done:**

- **`.github/workflows/app.yml`** — typecheck and unit tests over the app workspace,
  on a `paths:` filter that names it. Same shape as `money.yml`.
- **The app registered as a workspace** in the root manifest, which already declares
  `packages/*` and `supabase/vitest`. A fourth entry fits the existing shape rather
  than inventing one.

⚠️ **This is deliberately NOT its own task.** A separate "add CI" task can slip, and
the one commit it must exist for is the first app commit. `5a` is not done until a
machine other than the author has looked at its code.

⚠️ **`5f` is still an `XL` inside an `XL`, and its seam stays pre-committed**:
`5f-i` is the list, the row and the quantity control; `5f-ii` is the basket, the
slide, the amber rule and the price-change menu.

#### ⚠️ What changed in the sizing, and why

- **`5a` shed the offline stub and gained a platform.** Offline is now its own task
  (`5c`) because C10.1–C10.5 describe a **write queue with idempotent replay**, not a
  retry wrapper — and the failure path it drives is `0024`–`0026`, built and unused.
  ✅ **`5a` also LOST the location picker**: C1.5 makes the two shops two workspaces,
  so the phone knows one store and never asks.
- **`5b` is new and it is the blocked one.** Round one had no membership task at all,
  because the plan assumed `create_invite`/`redeem_invite` existed. **They do not.**
- **`5h` is the only task behind the screen-level gate now.** Areas 5 (finishing a
  sale) and 6 (mistakes, and `0021`'s void has no screen) are still unasked.

#### ⚠️ THE THIRD ROUND — ~~FOUR AREAS STILL UNASKED~~ THREE, AND THEY NOW LIVE IN ⛔ DECISIONS OWED

⚠️⚠️ **THIS TABLE IS A SNAPSHOT AND IT STOPPED BEING TRUE.** On 2026-09-21 it still
carried área 9 as an open gate on `4.6c` — seven days after it was answered and after
`4.6c` shipped three migrations. The three genuinely open rows were moved into
**⛔ DECISIONS OWED**, which is the one region of this file guaranteed to be re-offered
to every session, and the table is kept as the record of where they came from.

Areas 1, 3, 8, 10, 11 and 12 are struck. **Three remain open, and all three now gate
work on the pilot's critical path:**

| # | Area | Status |
|---|------|--------|
| 2 | Vender — finding the product | ✅ **Effectively answered** by C3.1 and C8.11 — flat variant list, search, same list both screens. Open only as a refinement: favourites, ordering, whether 100 rows at elder density is navigable |
| 4 | Vender — quantity and units | ✅ **Answered** by C3.8 and C3.9. Closed |
| 5 | **Finishing a sale** | ⚠️⚠️ **MOVED TO ⛔ DECISIONS OWED 2026-09-21 — read it there, not here.** Receipt or nothing, change calculation, whether the customer sees the screen. Still gates `5h` |
| 6 | **Mistakes** | ⚠️⚠️ **MOVED TO ⛔ DECISIONS OWED 2026-09-21 — read it there, not here.** `0021`'s 15-minute self-service void exists, is fenced at staff, and has no screen. Still gates `5h` |
| 7 | Comprar — receiving | ⚠️⚠️ **MOVED TO ⛔ DECISIONS OWED 2026-09-21 — read it there, not here.** Expiry per line, `track_expiry`, ADR-017's FEFO policy. ⚠️ **Re-weighted on 2026-09-21: it now gates the tier-2 waste read**, which did not exist as a requirement when this row was written |
| 9 | **Números** | ✅✅ **CLOSED — and this row was STALE for seven days.** ~~GATES `4.6c` — "three numbers, not thirty", and F2 means the answer decides a migration~~. **Área 9 was asked and answered 2026-09-14**, and `4.6c` shipped `0031`–`0033`. ⚠️ **Found 2026-09-21 while realigning for the pilot, and it is the argument for the move above**: a question parked outside ⛔ DECISIONS OWED is one nobody re-reads, so nobody notices when it is answered EITHER |

**Where the build starts: `5a`.** It is the only task with no gate above it and
nothing owed beneath it, and every other task needs it underneath.

---

## Step 5R — the release path, and it is now a STEP (§2.11)

⚠️⚠️ **PROMOTED FROM PROSE TO TASKS ON 2026-09-21, ON THE OWNER'S INSTRUCTION, AND THE
TARGET CHANGED WITH IT.** §2.11 carries the release path as a paragraph and says *"it
is not a step because it blocks nothing"*. **That was true when the pilot's output was
a measurement. It is false now that the pilot's output is also a thing shown to
investors and partners** — the owner ruled on 2026-09-21 that the app ships to **both
public stores**, not to TestFlight and Play internal testing alone.

⚠️ **The recommendation on file was internal distribution only**, on the grounds that
App Store review sits inside §5's three-day observation window. **The owner overrode
it with a reason the recommendation had not weighed: a public listing is evidence to a
partner, and this pilot exists to raise money as well as to measure completeness.**
Recorded here rather than argued again.

⚠️ **§2.11's acceptance test survives the change and is not optional:** an over-the-air
JS-only fix shipped to a real device in under an hour, proven **before** pilot day.
Public review governs binaries; it does not govern OTA updates, so this is what keeps
a 48-hour review out of the observation window.

⚠️⚠️ **THE IDS ARE `5R-x` AND `5P-x` RATHER THAN `R1`/`P1`, AND THAT IS A CORRECTION MADE
THE SAME DAY.** They were first written `R1`–`R5` and `P1`–`P3`, and **every one of the
eight collided with a row that already existed** — `R1`–`R13` are `docs/CONVENTIONS.md`'s
RULE names (`R12` and `R13` are cited across the plan and read by
`conventions-gate.sh`), and `P1`–`P3` are falsification fixtures in the `5a-iv` tables.
⚠️ **A grep for `R3` returned a store gate and an empty-env-var fixture**, which is the
one-identifier-two-meanings defect this file has recorded several times. The `5` prefix
also says something true: §2.11 puts the release path *"running in parallel from 5a"*.

| Task | What it is | Size | Gate |
|---|---|---|---|
| **5R-a** | **The accounts, and the one-way door inside them.** Apple Developer Program enrolment and Google Play Console. ⚠️⚠️ **SUBMISSION IS WHAT MAKES THE BUNDLE ID PERMANENT** — `mx.bserafin.wera` has been provisional since `5a-iii-a` and stops being so the day a store accepts it. Anything about the name, the vendor prefix or the Spanish/English spelling is free today and a new app listing afterwards | `S` | ⚠️ **Nothing technical. Enrolment latency is outside our control, which is why it is first** |
| **5R-b** | **EAS Build, and the update channel proven end to end.** A cloud build replacing the local Xcode + free-provisioning path, installed on a phone that is not the owner's, plus §2.11's acceptance test: **a JS-only fix shipped over the air in under an hour**. ⚠️ **This also retires the 7-day provisioning treadmill** currently sitting in ⏳ DATES OWED | `M` | `5R-a` |
| **5R-c** | ⚠️⚠️ **ACCOUNT DELETION — A STORE GATE THAT EXISTS IN NO DOCUMENT AND NO LINE OF CODE.** Both stores require an app that creates accounts to offer in-app deletion; Google additionally requires a web-reachable request path. **Found 2026-09-21 by grepping for it and finding nothing.** ⚠️⚠️ **AND IT IS NOT A BUTTON: `sale.created_by` and `failed_write.reported_by` are `not null` references to `auth.users`, so a hard delete is REFUSED BY THE LEDGER.** The design question — anonymise the actor, transfer the workspace, or refuse deletion to an owner who still has a shop — is a real one and it touches the append-only ledger | `M/L` | ⚠️ **Needs a decision before code. Unsized until that decision; `M/L` is a placeholder** |
| **5R-d** | **The listing, and the law.** `aviso de privacidad` at a public URL (LFPDPPP, §2.2's cross-border disclosure), Apple privacy labels, Google Data Safety, screenshots, descriptions, age rating, test credentials for review. ⚠️ **One risk checked and probably already retired**: Apple requires *Sign in with Apple* only where an app uses third-party login **exclusively** — `5a-iii-a` shipped email sign-in beside Google, which is what should exempt us. **Verify against the current guideline before submitting rather than discovering it in review** | `M` | `5R-a` |
| **5R-e** | **Submit, survive review, and be listed in both stores.** | `S` | `5R-b`–`5R-d`, and a build worth reviewing |
| **5R-f** | ✅✅ **DONE 2026-09-24 — `docs/checks/5R-f-schema-deployed.sh` CAN ASK THE HOSTED DATABASE WHETHER IT IS CARRYING THE SCHEMA, AND IT ANSWERED: ALL 36 MIGRATIONS APPLIED TO `hweutzjhzvioswnjzqki`.** ~~this was the next task, as of 2026-09-24~~ — ⚠️ **struck in lower case deliberately, the rule `5b.8-i`'s row records: `plan-handover.sh` reads the raw line and a strikethrough is only a rendering.** ⚠️⚠️ **THE DECISION THE ROW SAID TO MAKE FIRST WAS MADE ON THE OWNER'S BEHALF AND IS REVERSIBLE IN ONE SENTENCE: IT IS A LOCAL CHECK, NOT A REPOSITORY SECRET.** A Supabase access token is ACCOUNT-WIDE — there is no project-scoped one — so a secret would hand every workflow run the whole account to guard against a forgotten `db push`. ⚠️ **And its answer depends on the WORLD rather than on the diff**: once a migration merges it is red until a person deploys, so in CI it would redden pull requests that neither caused it nor can fix it — which is the argument `5R-g`'s own row makes about a red that is not yours. ⚠️⚠️ **AND IT PINS THE PROJECT REF, WHICH NOTHING COMMITTED TO THIS REPOSITORY DID BEFORE**: `supabase/.temp/` is gitignored, so a check that did not compare the link against `supabase/README.md`'s named target would pass vacuously against whatever project a laptop happened to be linked to. ⚠️ **Ten fixtures, and one of them found a real bug in the guard** — a tab-delimited empty field collapsed under IFS whitespace and a hand-run migration read as an undeployed one; both are red, so only the fixture asserting the REASON caught it. ⚠️ **It compares version numbers, not schema**, and append-only is what holds the rest. **THE SCHEMA DEPLOY PATH, AND THE GUARD THAT WOULD HAVE CAUGHT 2026-09-22.** On that day the hosted project the owner's phone signs in to was found to have **no schema at all** — thirty-eight migrations applied in CI's throwaway Postgres and nowhere else — and it was found by **him tapping Productos**, not by any check. ⚠️ **The migrations are innocent and the contract checks are not wrong**: every one of them builds its own database, asserts against it and deletes it, which is the right design for proving a migration APPLIES and says nothing about whether it WAS applied. **What this row builds is the other half:** a check that reads `supabase migration list` — local against remote, one command, **no password and no service key** — and goes red when they diverge, plus the one paragraph in `supabase/README.md` naming the hosted project as the deploy target and `supabase db push` as how it gets there. ⚠️⚠️ **IT CANNOT LIVE IN `db.yml` AS THE OTHER CHECKS DO**: CI has no access token for the owner's account, so this is either a local check a session runs, or it needs a repository secret — **and deciding which is the first thing this row does.** ⚠️ **It ships no migration.** | `S` | ✅ **UNGATED.** ⚠️ Nothing is waiting on the owner for it — the deploy itself is already done |
| **5R-g** | ✅✅ **DONE 2026-09-24 — `db.yml`'s BIGGEST JOB IS SPLIT AND THE STOPGAP CAP IS GONE.** ~~this was the next task, as of 2026-09-24~~ — ⚠️ **struck in lower case deliberately, the rule `5b.8-i`'s row records: `plan-handover.sh` reads the raw line and a strikethrough is only a rendering.** ⚠️⚠️ **THE ORDER WAS RULED BY THE OWNER — *"take 5R-g next"* — CONFIRMING WHAT WAS ALREADY MARKED.** The thirteen `app/src/api/**` contract checks and their harnesses moved to a new `api-contracts` job; `setup-node` and `npm ci` did NOT go with them, because **measured rather than assumed**, not one of the thirteen uses node — the two scripts that mention it do so in a comment. ⚠️⚠️ **AND THE SPLIT SAVES WALL-CLOCK RATHER THAN COSTING NONE, WHICH IS MORE THAN THIS ROW CLAIMED**: measured on run `36050875005` the job was **941s (15m41s)** against a 15-minute cap — the contract block **397s** of it — so the halves come out ~9m04s and ~9m50s and `db` finishes in about ten minutes instead of nearly sixteen. ✅ **Both caps are 15 again and the number is a measurement**: ~1.65x and ~1.5x headroom where the cancelled runs had 1.0x. ⚠️ **The row said ELEVEN contract checks and there are THIRTEEN** — the second count in two sittings the plan carried slightly wrong, which is a pattern rather than a slip. ⚠️ **Verified locally in the new job's exact shape before it was pushed** — reduced service list, `db reset`, the thirteen checks with nothing in between, all green — because a check depending on state the seed steps left behind would not have shown in the diff. ⚠️ **The step multiset was diffed before and after**, so nothing was lost or duplicated by a 353-line move. **THE `db` WORKFLOW'S BIGGEST JOB RAN AT ITS OWN TIMEOUT AND WAS BEING CANCELLED AT IT — FOUND 2026-09-22 BY `5e-i`'s CI, AND IT HAD BEEN HAPPENING ON `main` FOR HOURS.** Run `35813212086`: **every step succeeded** and `supabase db reset` was killed 15m07s into a `timeout-minutes: 15` cap with the last falsifier about 23 seconds from finishing. Three runs on `main` the same day went the same way (`35802822473`, `35792354993`, `35783706860`); two others landed at 12m01s and 13m22s. ⚠️⚠️ **A CANCELLED JOB IS NEITHER A PASS NOR A FAILURE, AND THE WORKING AGREEMENT SAYS NEVER MERGE ON ONE** — so a cap firing on a healthy job turns *wait for CI* into a coin flip, and the cheap way out of a coin flip is to stop reading the result. ⚠️ **The cap is raised to 25 as a stopgap and that is NOT the fix**: the number will need raising again every few tasks, because the job does ~5m12s of seed checks and then runs **eleven contract checks with their harnesses back to back**, and every one is an `app/src/api/**` claim of exactly the shape `5e-i` gave its own job. ⚠️ **The fix is the split this file already argues for twice** — `auth-session`'s header and now `catalog-write`'s: jobs run in parallel, so moving the contract block out costs wall-clock nothing and takes the seed checks off the same clock as the app's contracts. ⚠️ **It ships no migration and touches no app code.** | `S` | ✅ **Ungated** |

---

## Step 6 — the screens the architecture left after Vender

⚠️ **WRITTEN 2026-09-21. This step has existed in ADR-035 §3 as one line since the
beginning and has never had task rows.** §3 lists *"Comprar, Desperdicio, Catálogo,
Proveedores"*; the plan since moved **Comprar to `5g`** and **Catálogo to `5d`/`5e`**,
so what genuinely remains here is two screens.

⚠️⚠️ **AND A THIRD ROW AS OF 2026-09-23, WHICH IS NOT A SCREEN: `6c`, THE PREBUILT
CATALOG.** It arrived as an owner's ruling rather than out of §3, it is C8.4 promoted
from *later* to a row, and it is **the first thing in step 6 that ships a migration**.
It is placed here rather than in step 5 because `5e` is closed and because a catalog
nothing can sell through is one nobody can test — ⚠️ **but that placement is a
recommendation and the owner's to overrule**: if the pilot is to open on a prebuilt
catalog, it goes ahead of `5f`.

| Task | What it is | Size | Gate |
|---|---|---|---|
| **6a** | ⚠️⚠️ **DESPERDICIO, AND IT IS REORDERED AHEAD OF ITS STEP ON THE OWNER'S INSTRUCTION, 2026-09-21.** `record_waste` (`0019`) has been applied and callerless since 2026-09-05 and `desperdicio.tsx` is a NINE-LINE placeholder. **The reorder is a business decision, not an engineering one:** waste is the acquisition hook, and until this screen exists the tier-2 investigation has no input at all. It reuses `5f`'s shared surface, so taken straight after `5f` it is cheap; taken in step order it is the last thing built before Números needs its data | `M` | `5f` — the shared transaction surface |
| **6b** | **Proveedores.** The provider list and its editing, behind `5g`'s selector and `provider_price_memory`'s prefill | `M` | `5g` |
| **6c** | ⚠️⚠️ **IT HELD THE MARKER FOR ABOUT FOUR HOURS ON 2026-09-24 AND HANDED IT STRAIGHT BACK, WHICH IS THE HOLDING MOVE WORKING RATHER THAN FAILING.** ~~this is the next task, as of 2026-09-24~~ — ⚠️ **struck in lower case deliberately, the rule `5b.8-i`'s row records.** The row that took it said *the moment the quantity control is ruled on, `5f-ii` is next again*; it was ruled that evening and **`5f-ii` is next again**. ⚠️ **What the four hours bought is recorded rather than shrugged off**: the marker moved because `plan-handover.sh` refuses to let a blocked task be next, so the plan could not quietly sit on a row nobody could start — **the check turned a stall into a visible question**, and the question was answered. ⚠️ **SIZE IT FIRST** when it IS taken, as its own cell below asks. ⚠️⚠️ **WHERE A PRODUCT CAME FROM, AND THE DELETE THAT DEPENDS ON IT — NEW 2026-09-23, REWRITTEN TWICE THE SAME DAY.** *"The user can only Retirar or Eliminar things he created"*, then *"why am I still seeing the button for the already existing products?"*, then the ruling that settled it. ⚠️⚠️ **THE OWNER'S PURPOSE, IN HIS OWN WORDS, AND IT IS WHAT THIS ROW IS FOR: *"when we start developing that onboarding step where each user can select the nature of his shop and therefore import a set of products that he can also look at offline we need to make that distinction to avoid them from deleting a product they didn't create."*** So the distinction is not a tidiness — **it is the thing that makes an imported catalog safe to hand somebody**, and C8.3's four store types (pollería, carnicería, cremería/salchichonería, recaudería) are what *the nature of his shop* selects between. ⚠️⚠️ **THIS ROW RESTORES A CAPABILITY RATHER THAN ADDING A FENCE.** `Editar`'s retire control is **drawn on nothing** as of 2026-09-23, because `product_family` and `product_variant` record no origin and the screen could not tell one kind of row from the other. Drawn-on-none was the honest interim; **this is what gives deleting back, on his own rows only.** ⚠️ **THE BACKFILL IS RULED (2026-09-24): everything present when the marker ships is NOT the shopkeeper's; everything created through `Agregar` afterwards is.** It costs nothing today — the rows in his shop are *"merely indicative for us to keep progressing on our Front End"*. ⚠️⚠️ **FINDING 1, AND IT IS THE ONE THAT WOULD HAVE SHIPPED WRONG: THE FENCE IS ON DEACTIVATION, NOT ON UPDATE.** The obvious move is to add `origin = 'shop'` to `product_variant_update`'s predicate — **and that would stop him PRICING and RENAMING an imported product, which is the entire reason for importing one.** He must be able to set his own prices on our catalog; he must not be able to remove it. A `using` clause cannot say *this column may not change in this direction*, so it is a **trigger** on `is_active` going true→false, the shape `product_variant_units_same_dimension_trg` already establishes in `0002`. ⚠️ A policy predicate here is a migration that looks right, merges automatically and breaks the catalog it was written to protect. ⚠️⚠️ **FINDING 2, AND IT IS THE HALF OF *look at it offline* NOTHING OWNS YET: THE QUERY CACHE DOES NOT SURVIVE A COLD START.** `app/src/api/QueryProvider.tsx` builds a plain `QueryClient` with **no persister** — measured 2026-09-24 — so the catalog lives in memory only. **A shop that imports a catalog, kills the app and reopens it with no signal sees no catalog at all**, which is precisely the condition §2.6 and C10.3 exist for and precisely what he asked for. ⚠️ It is a separate concern from the marker and may want a row of its own; it is recorded HERE because this is the row whose sentence promises it. ⚠️ **THE MARKER'S SHAPE:** on BOTH catalog tables — he creates Familias as well as Productos — with a DEFAULT meaning *the shop made this*, so `5e-i`'s `VARIANT_INSERT_COLUMNS` needs no new column and every product made through `Agregar` is correctly his without the app saying so. ⚠️ **The rows are COPIED INTO a workspace and never shared across tenants** — every line table's foreign key is composite on `(id, workspace_id)`. ADR-035's catalog section carries the rule. ⚠️⚠️ **WHAT THIS ROW IS NOT: THE ONBOARDING ITSELF.** *"Once we wrap up the full app we will polish many parts, one of them is the onboarding to import a catalog."* The shop-type question, the import and the screens around it are that later job; **what is here is the marker, the fence and the restored delete**, which is what the app needs before any of it can be safe. Splitting them is the difference between a migration that can be reviewed and one that cannot. ⚠️ **Size it before building it.** | **size it** | ✅ **UNGATED as of 2026-09-24** — the backfill was the only open word and it is ruled. ⚠️ **Recommended after `5g`**, and the owner has said this part is indicative and not to hold up the front end — **but he cannot delete anything at all until it ships**, so it moves on his word |

---

## Step 7 — Números, and the read the tier-2 business runs on

⚠️ **WRITTEN 2026-09-21. §3 carries step 7 as the single word *"Números"*.** It is the
surface the BI half of the business model is sold on, and every view it reads is
already applied: `0031` purchases and gross revenue, `0032` price over time, `0033`
the month export. ⚠️ **Área 9 settled its content on 2026-09-14** — *"charts and
tables about their transactions … it doesn't have to be very robust nor
sophisticated for now"* — so this is three questions, not thirty.

| Task | What it is | Size | Gate |
|---|---|---|---|
| **7a** | **What am I selling, and what did it bring in.** Quantity in the variant's own unit and **GROSS** revenue, per variant and per family, over `product_velocity_daily`. Daily grain with the client rolling up to the Daily/Weekly/Monthly switch | `M` | `5h`, and a shop with real rows in it |
| **7b** | **How have my prices moved.** Purchase and sale unit price per variant over `0032`, with the %-change cards over the month, 1/3/6/9 months and YTD | `M` | `7a` |
| **7c** | ⚠️⚠️ **WHAT AM I THROWING AWAY — and the honest half is QUANTITY.** §2.9 records the cost half as broken under C8.6: on a despiece the numerator reads a shortfall lot's cost of **zero** and the denominator is purchases of a product the shop buys whole, so **the headline is 0 over 0**. Quantity by product is sound and is what ships. ⚠️ **Pricing waste properly is its own modelling decision and is not folded in here** | `M` | `6a` — there is no waste data until that screen exists |
| **7d** | **The raw rows.** `0033`'s month export, handed over as a download — often the thing that convinces a shopkeeper the numbers are his | `S` | `7a` |
| **7e** | ⚠️⚠️ **WHAT IS AT RISK OF BECOMING WASTE — DERIVED, NOT TYPED IN. REWRITTEN 2026-09-21 WHEN THE OWNER RULED OUT CAPTURING EXPIRY DATES.** ~~stock inside its last days, read from a captured `expiry_date`~~. **Three numbers per variant, all of them computed from records the shop already produces:** **shelf age** (how long the stock on hand has been sitting — `stock_batch.received_at`, which is `not null` and always present, against `batch_balance`); **days of cover** (what is on hand ÷ recent daily velocity, over `product_velocity_daily`, which `0013`/`0014` already ship); and **observed time-to-waste** (for each variant, how many days typically pass between receiving and writing off — read from `waste` against the batches it consumed). ⚠️ **A variant with more days of cover than its own observed time-to-waste is the buy-it-now candidate**, and that is the tier-2 signal without a single new field. ⚠️⚠️ **WHAT IT COSTS, AND IT IS THE REASON THE DEFERRED DECISION IS NOT FREE: a derived shelf life NEEDS WEEKS OF WASTE RECORDS BEFORE IT SAYS ANYTHING.** A typed expiry date answers on day one; this answers once the pilot has run long enough to have thrown things away. **That is a pilot-duration cost, not an engineering one**, and it is the owner's deliberate trade — see ⛔ DECISIONS OWED, área 7 | `M` | `6a` and `5g` — it reads waste and purchases, so both screens must exist and have run for a while |

---

## Step 5P — the pilot itself, instrumented

⚠️ **WRITTEN 2026-09-21.** §5 defines the pilot and binds it; what it has never had is
a task that BUILDS the instrument. ⚠️⚠️ **And the owner's pilot is not quite §5's
pilot** — §5 says *"one store, three days physically present"* and measures
completeness; the owner needs **retailer engagement across two or three shops** and a
waste-pattern read he can take to investors. Both are recorded, and they are not the
same instrument.

| Task | What it is | Size | Gate |
|---|---|---|---|
| **5P-a** | **The dev-build overlay §5 specifies**: p95 commit-gesture-to-confirmation against a **300 ms** budget, p95 `record_sale` round trip against **1 s**, p95 cold-open-to-Vender against **2 s**, taps per transaction against a ceiling of **5**, and **abandonment** — capture screens opened with no commit, the silent non-use detector. ⚠️ **§5 says measured with a dev-build overlay, NOT with instrumentation shipped to production**, which is also the answer that costs no privacy notice | `M` | `5h` |
| **5P-b** | ⚠️⚠️ **ENGAGEMENT ACROSS SHOPS THE OWNER IS NOT STANDING IN — and it is a DECISION before it is a task.** §5's overlay works because the schema owner is in the room; two or three shops over weeks is a different question. ⚠️ **The cheap answer needs no telemetry at all**: recording *is* engagement, so `sale`, `purchase` and `waste` row counts per shop per day already measure it, from the server, with nothing added to the client and nothing to disclose. ⚠️⚠️ **Anything beyond that — screen opens, session length, feature taps — is behavioural telemetry on identified merchants and engages LFPDPPP and the `aviso de privacidad` `5R-d` ships.** The recommendation is the server-side read, and the decision is the owner's | `S` for the read; unsized if telemetry is wanted | `5h`, and a shop with rows |
| **5P-c** | **Completeness, the number the pilot is graded on.** The manual-tally comparison §5 requires, and the daily read that shows it — *"five consecutive days within 5%"* is a query, and running it by hand each evening is how a bad day gets explained away | `S` | `5P-a` |

---

## The other edges — what the pilot must LEARN, and it builds nothing

⚠️⚠️ **WRITTEN 2026-09-21 BECAUSE IT WAS MISSING, AND THE OWNER HAD TO ASK TWICE.**
His brief of 2026-09-21 had five numbered points; the realignment earlier that day
answered four of them and **silently dropped 4.5** — *"understand the needs for the
other edges (Monitoring, Couriers, Restaurants) to ask for more funding."* He then
asked, in terms, whether the prompt had been read. It had not been read closely
enough. This section is that point, and it is also the answer to his point 1 —
*"the plan … doesn't have the focus of continuous integration for the other things I
mentioned."*

⚠️ **NOTHING HERE IS A TASK AND NOTHING HERE SHIPS.** It is a register: what the pilot
must **observe** so that the next round's engineering can be specified from evidence
instead of from imagination. Every answer below comes out of WhatsApp, a spreadsheet
and a notebook — **the owner already has the retailers and one courier**, so the
observations can start before the app can capture anything.

⚠️⚠️ **THE ONE ARCHITECTURAL FACT THAT SHOULD NOT ARRIVE AS A SURPRISE LATER: every
edge below is a SECOND TENANCY MODEL.** This schema has `staff`, `manager` and
`owner`, and all three live *inside one shop*; RLS is built so that one workspace can
never read another's rows, and there is a test suite whose only job is proving it. **A
courier who sees several shops' pickups, or a restaurant that sees a retailer's
surplus, is the exact inverse of that** — see §6's *"cross-workspace analytics schema"*
and *"collection-partner notifications"*, the two deferrals that touch this. **It is
not a screen on this app. It is the largest single decision the funding round buys**,
and the register below is what makes that decision cheap when it comes.

| Edge | What the pilot must come back with | Why it cannot be specified now |
|---|---|---|
| **Couriers** | Runs completed per day by one person; minutes per pickup and per drop; the route actually walked or driven; **cost per run against gross margin per run**; how often a pickup fails and why; whether anything needed cold chain; how the courier is paid and settled | **Capacity is the whole scaling model.** Every projection for 10 couriers multiplies a number nobody has measured once. One courier for three weeks produces it |
| **Restaurants** | What they will actually buy and what they refuse; **the discount that closes a sale**; how much lead time they need and by what hour of the day; typical order size; repeat rate across weeks; who in the kitchen decides; payment terms they expect | **A marketplace is worthless if the demand side is thin**, and nothing in the retailer's data can tell you what a chef will buy. Four or five relationships over a month answers it |
| **Retailers** *(supply side)* | The discount they will accept to move stock **before** it is waste; how much notice they need; whether they will hold something aside; **and the acquisition question — did the waste offer bring them in, and did they stay for the numbers?** | This is the hook's central claim and it is currently an assumption. The app measures whether they RECORD; only conversation measures whether they SELL |
| **Monitoring** | ⚠️ **AMBIGUOUS IN THE BRIEF AND DELIBERATELY NOT GUESSED AT.** Two readings: (a) the OPERATOR console — the owner watching which shops have surplus today, what moved, which runs happened; or (b) SYSTEM monitoring — uptime, failed writes, dead letters, whether a shop stopped recording. **Both are real needs and they are different products** | ⚠️ **Reading (b) partly exists already and nobody has said so:** §2.10 specifies a nightly check, `failed_write` is a vendor-side surface by §2.8, and `5c-iv`'s dead-letter banner is its merchant-facing half. **Reading (a) is the operator console and is genuinely unbuilt.** ⚠️⚠️ **This is a question for the owner, and it is NOT in ⛔ DECISIONS OWED because it blocks nothing today** — it blocks the funding ask, not the pilot |

**How to use this register.** Add to it as the pilot runs — one line per observation,
dated. ⚠️ **It is deliberately a REGISTER and not a status board**: nothing here has a
state, a size or a gate, because nothing here is being built. When the funding ask is
written, this section is the evidence; when the next architecture decision is taken,
this section is the input it was missing.

⚠️ **The honest sequencing point, repeated here because it is the one that decides
whether the money arrives:** three of the four rows above can be filled in **starting
this week**, with no app at all, and none of them gets faster by waiting for the build.
The engineering queue and the observation register should run in parallel, or the
three-to-four weeks of operating evidence lands *after* the software instead of
alongside it.

---

## Working agreement

One task per session. Before starting, estimate difficulty. Update this file when a
task closes — a plan that lags the code is the failure ADR-035 §9 names.

⚠️⚠️ **AMENDED BY THE OWNER 2026-09-24 — AN `M` OR AN `L` IS ONE SITTING NOW:**
*"we'll make an ammendment now that we have Claude Max, if a task is M or L, let's do
it at once, we have enough usage and space to do it."* **The old rule split anything
large; this one splits `XL` and above.**

⚠️ **THE PREMISE OF THE OLD RULE WAS A BUDGET AND IT HAS CHANGED, WHICH IS WHY THIS IS
AN AMENDMENT AND NOT A LOOSENING.** *"so the work survives a usage limit or a context
clear"* — the splitting was never about the work being clearer in halves, it was about
half-finished work being lost. A plan is a poor place to carry a subscription tier's
constraint after the tier has moved.

⚠️⚠️ **WHAT DOES NOT CHANGE, AND IT IS THE HALF THAT PAID FOR ITSELF: THE SIZING PASS
STAYS.** Sixteen of the seventeen splits in this project were preceded by an estimate
that **found something the row did not say**, and the finding — not the split — is what
those sessions were worth. `5f`'s sizing found the cart store §2.11 had already chosen,
the quantity control's contradiction with the ADR, and a commit payload that would have
hard-coded a gross/net identity. `5f-iii`'s, the same morning, found that the basket
sheet is the screen §2.5 rule 5 is written about. **None of those needed a split to be
worth taking; they needed somebody to look before writing.** So: estimate first, write
down what the estimate found, and then build the whole row.

⚠️⚠️ **AND A SPLIT MAY STILL HAPPEN AT `M` OR `L` — FOR A REASON THAT IS NOT SIZE, AND
IT MUST SAY SO IN ITS OWN WORDS.** Three survive the amendment, because none of them is
about how long a sitting is:

1. **A GATE.** Half the row is blocked on a decision the owner owes or an ADR amendment
   he has not made, and the other half is not. `5f-ii` was gated and `5f-i` was not;
   splitting is what let the unblocked half ship the same day.
2. **TWO FAILURE CLASSES IN ONE ROW, one of which nothing here can see.** This is
   `5c-iv`'s, `5d-iv`'s, `5e-iii`'s and `5f-iii`'s argument, and it is the strong one:
   when a row carries work whose mistakes cost a glance AND work whose mistakes are
   silent — the ledger, the queue — one row means **the invisible half rides in on the
   back of the visible one**, and it is reviewed as though somebody had looked at it.
3. **THE DEFERRAL TEST BELOW**, which already splits a row whose look-questions cannot
   be answered yet from the half that can be built today.

⚠️ **A size-only split at `M` or `L` is now the thing to refuse**, and a session that
wants one is asking for the old rule back. ⚠️ **`XL` still splits on size alone** —
`5f` listed twenty deliverables across a store, two screens and a question the owner
owed, and no premise about usage made that one row.

Every schema claim must be traceable to a migration CI has applied. A file is not
evidence; a green CI run is.

⚠️⚠️ **AND ITS COUNTERPART, RULED BY THE OWNER 2026-09-22: A ROW WHOSE ONLY
INSTRUMENT IS HIS EYES WAITS UNTIL THERE IS SOMETHING TO LOOK AT.**
*"If it's better for us to build something that needs to be looked at after we have
what's needed to actually look at it, let's keep it deferred."*

`R9` already routes a deliverable no check can see to the task that can see it. This
is the ordering half of the same sentence, and it was ruled the day `5c-iv-b`
demonstrated the gap: that task shipped a banner whose look is fenced out of every
suite by §2.11 — so the owner's phone is its whole instrument — **and nothing in this
app enqueues anything until `5f`, so the outbox is always empty and the banner never
draws.** It was reported as *"goes to the owner's phone"* when it could not.

**The test is two questions, and BOTH must be yes to defer:**

1. Is every judgement left in this row one no check here can make — rendering,
   navigation, layout (§2.11)?
2. Is the state it draws **unreachable today**, because the thing that produces that
   state has not been built?

⚠️ **One yes is not enough, and conflating them would stop the wrong work.** `5d` and
`5e` draw the catalog, which already exists: they answer *yes* to (1) and *no* to (2),
and they are takeable the moment they come up — the owner can open the app and look.
⚠️ **A row with real arithmetic in it is not deferred for the half that has a suite**;
`5c-iv-b`'s pricing was falsifiable here and 29 assertions read it. **What defers is
the part only an eye can settle.**

⚠️ **This is NOT a reason to revert `5c-iv-b`.** It is merged, green and correct, and
throwing away checked work buys nothing when the alternative is the same code written
later. **What it changes is where the look-questions are answered**: they move onto
`5f`'s row rather than being put to the owner blind, and they are listed there.
