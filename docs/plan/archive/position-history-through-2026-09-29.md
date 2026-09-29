# `## Position` history — through 2026-09-29

⚠️ **ARCHIVED 2026-09-29 by `8b` from `docs/PLAN.md`'s `## Position`, unedited.** Three
things, each a MOVE: the rulings and briefs that sat under the empty ⛔ DECISIONS OWED table
(rulings 1–45 and the block's own falsifications), the three ticked rows of ⏳ DATES OWED with
that block's notes, and the archive-cut bookkeeping (cuts 1–27). **The two blocks themselves
stay live** — `plan-handover.sh` requires exactly one of each in `docs/PLAN.md`. ⚠️ **For
several owner rulings about what a screen renders, this file is the only record.**

## ⛔ Decisions — ruled, with their briefs


⚠️⚠️ **THE MACHINERY EXISTS AND HAS NEVER BEEN CALLED. `void_transaction` (`0021`) has been applied since 2026-09-04** — it answers a void by INSERTING a mirror-image document rather than editing or deleting anything, both stand in the ledger, and `<kind>_one_reversal_idx` already makes a document reversible AT MOST ONCE. ⚠️⚠️ **AND THE CLAIM THAT USED TO SIT HERE WAS FALSE — CORRECTED 2026-09-26 BY `5h-i`, WHICH MEASURED IT.** ~~`5g-iii` measured something about it that changes the question: `purchase` and `purchase_line` carry a SELECT policy and NOTHING ELSE, and no function in this schema writes a reversal — so a void is not reachable through the API at all today, for any of the three kinds.~~ **`0021` BOTH WRITES THE REVERSAL AND GRANTS IT**: `0021:448` revokes from `public` and grants `execute` to `authenticated`, and `proacl` on the applied schema reads `authenticated=X/postgres`. ⚠️ **The narrower half was true and is worth keeping**: `purchase` and `purchase_line` carry a SELECT policy and nothing else, so no client INSERTs a reversal *directly* — the `security definer` RPC is the whole path, **and it is open.** ⚠️ **The cost of the error would have been a migration nobody needs**, written into the next sizing as a certainty.

⚠️⚠️ **WHAT IS ACTUALLY OWED IS FOUR THINGS, AND ONLY THE FIRST IS A PREFERENCE.** **(1)** ⚠️ **What the control is called and where it lives.** A sale has just been committed and the confirmation animation `5f-iii-b` shipped is on screen — is the undo *on* that confirmation, for the few seconds it is up, or is it somewhere a person goes back to? **The first is one tap and disappears; the second needs a list of today's documents, which is a screen nobody has scheduled.** **(2)** ⚠️⚠️ **THE FENCE IS A ROLE BOUNDARY AND NOT A DEADLINE, AND THE ROW ALREADY SAYS SO — but `0040` has just moved the neighbouring fence and he may want this one moved with it.** `workspace_setting.void_window_minutes` (`0001:561`) is read by the client *"to render correctly"*, so **hardcoding 15 is wrong the first time a shop changes it**; a cashier undoes her OWN document inside the window, a manager or owner undoes ANYTHING at any time with no window. **Is that still what he wants for an Empleada who may now read every purchase the shop has ever made?** **(3)** ⚠️⚠️ **AND THE ONE THAT IS NOT A UI QUESTION AT ALL: WHAT DOES SHE SEE AFTER THE UNDO?** A void is a SECOND document, so a shop that sells and undoes has **two rows and a net of zero** — `takingsFrom` already counts only the documents that STAND, so Inicio is right. **`Costos` is not**: `costsFrom` drops both halves, which is correct for a price series and means **a delivery she voided vanishes from the chart entirely rather than being shown as undone.** That is a rendering decision about a state nothing can currently produce, and it is his. **(4)** ⚠️ **`5g` HAS SHIPPED WITHOUT IT.** `void_transaction` takes `purchase`, `sale` and `waste`, and Comprar is live — so a shopkeeper can already record a delivery she cannot undo. **Whether that waits for `5h` or is a retrofit is a scheduling call rather than a design one, and it is cheap to make now.**

⚠️⚠️ **WHAT IT COSTS TO LEAVE PARKED, SAID PLAINLY: `5h` IS THE LAST OPEN TASK IN STEP 5 AND `5h.5` IS GATED ON IT.** `5h.5` owns `src/ui/`'s conventions and its own row says it is *"the last moment this is cheap"* — the directory now holds six primitives built across `5d`–`5g` with no written rule. **So this one question is in front of the end of step 5** — and as of 2026-09-25 it is the ONLY thing in front of it. ~~and `5f.5` is the only thing between here and it~~ — ⚠️ **struck in lower case deliberately, the rule `5b.8-i`'s row records.** ⚠️⚠️ **`5f.5` CLOSED THAT DAY, AND WITH IT STEP 5 RAN OUT OF UNGATED, SESSION-COMPLETABLE WORK.** What remains is the round that answers this question, the undo it gates, the `src/ui/` conventions the undo gates, one row ruled out of the pilot and one deferred to v2. **The cost of leaving this parked is no longer *a task waits*; it is *the build waits*.** ⚠️⚠️ **THE METHOD IS NOW RULED AND THE ANSWERS ARE STILL OWED, WHICH IS WHY THIS ROW STAYS OPEN RATHER THAN CLOSING — 2026-09-25:** *"Let's address Area 6 with a back and forth set of simulations to get to the best option for this pilot before we start 5h."* **So the four questions below are not answered from this brief; they are answered in `5h-i`, a simulation round**, and this row is what re-offers them until that round has run. ⚠️ **The recommendation below is kept as the SESSION'S opening position for that round rather than as a proposal awaiting a yes** — he has already said he wants to arrive at the answer by walking through the situations, and a recommendation presented as settled is the shape [[proposal-must-not-look-decided]] records him refusing. ⚠️ **RECOMMENDATION, because a menu is not what he wants: put the undo ON the confirmation, keep the role boundary exactly as `0021` fenced it, and make Comprar a retrofit inside `5h` rather than a later row.** The reason for the first is C3.14's own argument about where a fix belongs — *fast from where she already is* — and the reason for the third is that two rows for one affordance is how the second one never gets taken. ⚠️ **The one I would not decide for him is (3)**: whether a voided delivery disappears from `Costos` or is drawn struck through is a question about what a shopkeeper trusts a chart to tell her, and [[tienda-decisions-need-shop-truth]] is exactly this shape. |
✅✅ **THE TWENTY-FIFTH RULING — 2026-09-25, AND IT IS A *NO* TO THE AMENDMENT I ASKED FOR:
*"We'll leave the expiry input latent until we have some feedback from the pilot."*** ⚠️⚠️ **SO
§2.8's *optional expiry* IS NOT STRUCK — IT IS MARKED LATENT, WHICH IS A THIRD ANSWER AND NEITHER
OF THE TWO ON OFFER.** The brief asked *strike it or leave it deferred*, and recommended striking
because *"a deferral is the most perishable claim in this repository and this one has already gone
stale once."* ⚠️ **He kept the intention and dated it to an event rather than to a date**, which is
the shape `Costos` already had — *"we will need to understand the interactions"* — and it is the
answer that costs nothing if the pilot never asks for it. ✅ **ADR-035 §2.8's Comprar cell now says
so in his words**, so the trap the row existed for is gone: **a session reading it literally is
told not to build the box.** ⚠️ **What is still true and worth keeping: `purchase_line.expiry_date`
is applied (`0003:197`) and `record_purchase` carries ADR-017's three tiers (`0018:112`), so
sending nothing takes tier 2/3 and every delivery already gets a date where a family has a
lifespan.** **Nothing is owed it and no row inherits it.**

✅✅ **THE TWENTY-FOURTH RULING — 2026-09-25: *"Comprar should be for any role for now."***
⚠️⚠️ **HE ANSWERED THE BIG HALF AND IT MADE A SHIPPED LINE FALSE, WHICH IS THE FIRST TIME A
RULING IN THIS BLOCK HAS DONE THAT WITHIN HOURS OF THE MERGE.** The row asked two things: what
an Empleada is TOLD when her memory comes back empty, and — underneath it — whether Comprar
should be manager-and-above at all. **He ruled on the second: no fence, and none was added.**
⚠️ **And that is precisely what turned `5g-ii`'s rendering into a lie.** It drew `unreadable`
with the same sentence as a new pairing on the argument that nothing on screen would be false;
once she may use the screen, *Primera vez con este proveedor* **is false on every row her shop
buys weekly**, because her read is empty on all of them. ✅ **`unreadable` is now SILENT** — the
box stays empty and required, which IS true for her — and the rule moved into `costNote`
(`@/api/providers`) so `app/test/api-providers.test.ts` holds it instead of a ternary inside a
screen no instrument can read. ⚠️ **What he did NOT settle is in the table above**: whether to
widen the view so she gets a prefill at all, which is a migration and a one-way door.

✅✅ **THE FORTY-SECOND TO FORTY-FIFTH RULINGS — 2026-09-28, ASKED BY `5P-a` BEFORE A LINE WAS
BUILT, AND TWO OF THE FOUR TAKEN AGAINST THE RECOMMENDATION.** Asked rather than parked because the
working prompt names all of them as stop-and-ask: what a shopkeeper sees, a migration, and who may
see what. **(42) THE OVERLAY IS HIDDEN** — as recommended: no capture screen changes, and the owner
opens a readings panel by a long press on Ajustes' title. **(43) THE READINGS GO TO THE SERVER** —
**against** the recommendation to keep them on the phone; that is `0043` and a one-way door.
**(44) A READING NAMES THE MEMBER** — **against** the recommendation of the phone only. ⚠️⚠️ **What
he accepted, named in the question before he answered: it is behavioural data on a named employee,
so the *aviso de privacidad* `5R-d` ships must say so before a shop he does not run is
instrumented** — written into `5R-d`'s row. **(45) THE OWNER ALONE READS THEM BACK** — as
recommended; a manager reads zero rows. ⚠️ **ADR-035 §5's *"not with instrumentation shipped to
production"* is amended with a revision entry**: what still holds is that only a build made with
`EXPO_PUBLIC_PILOT` writes a reading. ⚠️ **Reversing (43)–(45) after the merge is a migration**; (42)
is one line in `ajustes.tsx`. **Never parked, so the block above stays empty.**

✅✅ **THE FORTY-FIRST RULING — 2026-09-28, ASKED BY `7b` BEFORE A LINE WAS BUILT, AND TAKEN AGAINST
THE RECOMMENDATION: *one chart, both lines with IVA*.** The brief recommended two panels — sale WITH
IVA as on the shelf, purchase WITHOUT as typed in Comprar and shown on `Costos` — so the gap between
two lines could not be read as margin plus tax. **He chose one axis**, reached by tapping a product on
Números. ⚠️ **What he accepted**: the same delivery reads ~16% higher on `Precios` than on `Costos`,
and `Precios` says so in a sentence. ⚠️ **Reversing it** is two constants in `@/api/prices` and a
panel split in one screen — no migration, no data. **Never parked, so the block above stays empty.**

✅✅ **THE FORTIETH RULING — 2026-09-28: *"Leave Lo último on Inicio as recommended."*** The row
`5h-ii-a` parked against `5P-a` is CLOSED and removed from the table above. `Lo último` stays a row
on Inicio between Productos and Proveedores — the only way into `Corregir` and `Eliminar` — and
ADR-035 §2.8's Home row now says ruled rather than parked. **Nothing changed in code.**
⚠️⚠️ **THE BLOCK ABOVE IS EMPTY** — five rulings in one day (33 and 34 that morning, then 38, 39 and 40)
cleared every row. ⚠️ **It stays, empty**: `plan-handover.sh` requires exactly
one, because the next question has to have somewhere to go. **`5P-a` and `5P-c` are no longer named
by any open decision.**

✅✅ **THE THIRTY-NINTH RULING — 2026-09-28: *"Leave Rosa seeing supplier phones as recommended."***
The row `6b` parked against `5R-d` is CLOSED and removed from the table above. **Both halves stand as
shipped**: an Empleada opens a supplier and reads `contact_name`, `phone` and `address_line1` — the
grant `provider_select` has given since `0002`, now exercised — and changes nothing; and **a list row
still carries a NAME only**, because putting the number on it means widening `PROVIDER_COLUMNS`, which
`docs/checks/5g-i-purchase-contract.sh` bans those columns from by name. ⚠️ **What he accepted**: every
cashier's phone can show every supplier's contact details, one tap at a time. **Nothing changed in
code.** ⚠️ **`5R-d` should still carry it**: the *aviso de privacidad* describes what reaches whose
phone, and this is now part of that. ~~only the `lo último` row (`5p-a`) is left open~~ — ⚠️ **closed the same day by the fortieth ruling.**

✅✅ **THE THIRTY-EIGHTH RULING — 2026-09-28: *"Leave the corrected sale price as recommended."***
The row `5h-ii-b` parked against `5P-c` is CLOSED and removed from the table above. **A corrected SALE
is re-priced at the shelf price in force when it is corrected**, which is what `quoteFor` does for
every sale Vender rings; a corrected DELIVERY keeps putting the stored price straight back, exactly.
⚠️ **What he accepted**: if a product's price changed between the sale and its correction, the
corrected sale is recorded at the NEW price and the customer paid the old one — so the manual tally
`5P-c` grades on can show that difference, and it is a known cause rather than a defect to explain
away. **Nothing changed in code**; the ruling confirms what `5h-ii-b` shipped. ⚠️ **`5P-c` is no
longer named by any open decision** — its gate is `5P-a` by id. ⚠️ **And since the fortieth ruling `5P-a` is not named by one either.**

✅✅ **THE THIRTY-FOURTH RULING — 2026-09-28: *"Leave Quitar proveedor one-way, as recommended."***
The row `6b` parked against `7b` is CLOSED and removed from the table above. A retired supplier leaves
the directory and the delivery picker, every purchase recorded against her keeps its counterparty,
and **nothing in the app switches her back on** — a regretted retirement is a support call during the
pilot, revisited on a real complaint. ⚠️ **What he accepted**: re-adding a seasonal supplier makes a
NEW row, so `provider_price_memory` starts empty and Comprar offers no prefill for her. ⚠️ **What it
settles for `7b`**, which that row's filing was about: a purchase-price point may name a supplier
Proveedores no longer lists, and that is drawn as history rather than hidden. **Nothing changed in
code.** ⚠️ **`7b` is now takeable**; `7d` stays the next task because it is `S` and the marker had
already moved — the choice between them is order, not a gate.

✅✅ **THE THIRTY-THIRD RULING — 2026-09-28: *"Leave the catalog unfenced, as recommended."*** The
row `6d` parked against `5P-c` is CLOSED and removed from the table above: a catalog restored from the
phone's disk has **no expiry** (`CACHE_MAX_AGE = Infinity` in `@/api/persist`), so a phone offline for
weeks sells at the last prices it saw rather than not selling at all. ⚠️ **What he accepted**: a stale
price becomes a row in the ledger, not only a wrong number on a screen, because `record_sale` stores the
figure it is given. ⚠️ **What was NOT ruled and is not owed**: the visible *precios del …* line — it
stays unbuilt, to be added only if he asks. **Nothing changed in code**; the ruling confirms what `6d`
shipped. ~~`5p-c` is still named by the corrected-sale row above, so that task stays gated on it~~ — ⚠️ **cleared the same day by the thirty-eighth ruling.**

✅✅ **THE THIRTY-FIRST AND THIRTY-SECOND RULINGS — 2026-09-28, ASKED BY `7a` BEFORE A LINE WAS
BUILT, AND BOTH TAKEN AS RECOMMENDED.** They were ASKED rather than parked because the working prompt
names both kinds as stop-and-ask: *a rule about who may see what*, and *what a shopkeeper sees*.
**(31) WHO SEES NÚMEROS: EVERY ROLE.** ⚠️⚠️ **ADR-035 DISAGREED WITH ITSELF**: §2.7's matrix said
*"See quantity sold and revenue (Números) — ● assigned locations"* for staff, and §2.8's screen table
said *"Números — Manager+"*. **The database already sided with the matrix** — `product_velocity_daily`
is `security_invoker` over `sale_line`, whose policy has no `has_role` (`0003`), and `0031`'s header
measured a cashier reading it — so a cashier sees her own stores' sales **by RLS**, the app carries
no role for it, and **§2.8's cell is corrected with a revision entry.** ⚠️ **Reversing it** is one
predicate on the door — a client fence over a grant the database hands out freely, which is the
shape the Proveedores row above argues against. **(32) WHERE THE DOOR GOES: A SEVENTH ROW ON INICIO,
LAST.** The tab bar is capped at four and full, and `app/test/inicio.test.ts` pinned six with the
comment *"a SEVENTH door is a decision"* — so the guard did its job a second time. ⚠️ **Reversing
it** is one row in `@/navigation/inicio`, one line in that suite and the ADR entry — no migration,
no data. ⚠️ **Neither was parked, so the open rows in the table above are unchanged.**

✅✅ **THE THIRTIETH RULING — 2026-09-27, AND IT ARRIVED IN FIVE WORDS THE SAME DAY THE QUESTION
WAS PARKED: *"Go with (a), and build it to my phone."*** ⚠️⚠️ **SO A CASHIER MAY SEE WHAT THE SHOP
LOST AND NOT WHAT IT COST, AND `6a-ii` IS UNBLOCKED.** The shape is reading **(a)**: a definer view
over `waste_line` carrying **reason, quantity, product, document and date — and never
`unit_cost_net_per_base`.**

⚠️ **It is the reading `0003:589` already promised** — *"the reason-and-quantity view for
Desperdicio ships with that screen"* — so the schema's own three-week-old intent is now an owner's
ruling rather than an inference, which is what `6a-i`'s split was waiting for.

⚠️⚠️ **THE COST HE ACCEPTED, NAMED IN THE BRIEF BEFORE HE ANSWERED AND REPEATED HERE BECAUSE IT IS
THE PART THAT CANNOT BE UNDONE LATER: she can infer roughly what things cost** by putting waste
quantities together with the delivery prices `0040` already lets her read. **That leak is real and
small, and it is the price of her being able to fix her own mistake.** ⚠️ **Reversing (a) after
`0041` merges is a `drop view` and a fix-forward migration, not an edit** — which is why it was
asked rather than taken.

⚠️ **What he did NOT rule, and it is not owed:** whether `waste_line_select` itself should widen.
It stays manager-and-above. **(a) works around that fence rather than opening it**, which is the
whole difference between reading (a) and reading (c) — and `6a-i-waste-contract.sh`'s tenth
assertion is what keeps the fence honest while the view exists beside it.

⚠️⚠️ **THIRTY decisions have now been parked here in total, and twenty-nine are closed.** ⚠️ **The
block is NOT empty**: `5P-a` and `5P-c` are still open and neither blocks the next task. ⚠️ **As of 2026-09-28 the block is EMPTY** — `5P-c`'s row was closed by the thirty-eighth ruling, `5R-d`'s by the thirty-ninth and `5P-a`'s by the fortieth.

✅✅ **THE TWENTY-NINTH RULING — 2026-09-26, AND IT IS THE FASTEST THIS BLOCK HAS EVER TURNED
ONE ROUND: *"fix the Costos date, and build it to my phone."*** The row was parked in `5h-ii-a`'s
closing message and ruled **within the hour**, as the recommendation rather than against it.
✅ **`5g-iii-b` shipped the same evening**: `costsFrom` calls `isoDay`, so the chart and the PDF
label a delivery with the day the shopkeeper was standing in.

⚠️⚠️ **AND THE FIX FOUND SOMETHING WORSE THAN THE BUG — THE WRONG ANSWER WAS WRITTEN DOWN IN
THREE PLACES, AND TWO OF THEM WERE TESTS DEFENDING IT.** `costs-pdf.test.ts` asserted that a
delivery keyed at **8pm on the 23rd** is labelled the **24th**, under a comment calling
`slice(0, 10)` *"a day Postgres already chose"*; `api-costs.test.ts` was blunter —
*"THE DAY IS THE ISO PREFIX AND NOT A `Date`'s LOCAL DAY, which is a **deliberate disagreement
with `today.ts`**"*. ⚠️⚠️ **POSTGRES CHOSE NO DAY**: `occurred_at` is a `timestamptz`, an
instant, so the *ISO prefix* is the UTC calendar day — a choice, and the wrong one after 18:00
in a UTC−6 shop. **That is why nothing went red for a day: the defect had two guards on its
side, and the disagreement was deliberate rather than accidental.** ✅ Both are rewritten to
assert the fix, **built from LOCAL instants** so they hold on this Mac and on CI without a
pinned `TZ`.

⚠️ **The cheapest lesson here is not about timezones.** A comment that says *this disagreement
is deliberate* is the strongest thing in a repository, and it was **wrong** — so a session
reading it would have left the bug alone twice over. ⚠️ **The remedy is the one this project
keeps arriving at: a claim about the database belongs to the database.** `occurred_at` being an
instant is readable from `0003` in ten seconds, and no amount of confident prose beats it.

⚠️ **ONE IS OWED AS OF 2026-09-26 AND IT DOES NOT BLOCK THE TASK MARKED NEXT** — see the table above: a decision `5h-ii-a` TOOK and is reporting, the sixth door on Inicio. ~~two are owed as of 2026-09-26, and neither blocks the task marked next — one of them is a defect in a screen he is holding (`Costos` naming the wrong day for an evening delivery), and the other is a decision `5h-ii-a` took and is reporting.~~ — ⚠️ **struck in lower case deliberately, the rule `5b.8-i`'s row records.** ✅ **The `Costos` half was RULED and SHIPPED the same evening** — see the twenty-ninth ruling below. ~~nothing is owed as of 2026-09-26, and the empty table above is deliberate — for the fourteenth time.~~ — ⚠️ **struck in lower case deliberately, the rule `5b.8-i`'s row records: `plan-handover.sh` reads the raw line and a strikethrough is only a rendering.** ⚠️ **It was true for a few hours and `5h-ii-a` ended it**, which is what this block is for. **TWENTY-NINE decisions have now been parked here in total, and twenty-eight are closed.** ⚠️⚠️ **THE ROW THAT STOOD HERE FOR ABOUT AN HOUR WAS NOT RULED, IT WAS *ACTIONED* — AND IT IS THE FIRST TIME THIS PROJECT HAS CHANGED LIVE SHOP DATA OUTSIDE A MIGRATION.** `workspace_setting.void_window_minutes` on `hweutzjhzvioswnjzqki` is **1440**, set 2026-09-26 20:46:24 UTC by the owner running the statement in-session. ⚠️ **Verified by reading it back rather than by the write's own output**: an `update` with no `returning` reports zero rows whether it matched or not, so the evidence is the row — `void_window_minutes = 1440` with `updated_at` seven seconds old, stamped by `workspace_setting_set_updated_at`. ⚠️⚠️ **THIS IS A CLAIM ABOUT THE SHOP AND NOT ABOUT THE SCHEMA OR THE CODE** — no migration, no deploy, nothing in this repository changed, and a second shop would still start at 15 because `0001`'s default is untouched (deliberately; it only matters at shop number two). ⚠️ **What it buys:** Rosa can undo her own document for 24 hours instead of 15 minutes, which is what *the next morning* needed. **What it costs is what he accepted:** the window is one number for all three kinds, so she also has 24 hours on her own SALES. **Reversing it is the same statement with 15.**

✅✅ **ÁREA 6 IS RULED, 2026-09-26 — `5h-i` RAN AS A SIMULATION ROUND WITH HIM IN THE ROOM AND ANSWERED ALL FOUR QUESTIONS.** *Where the control lives*: not on the confirmation — it is a list of recent documents you go to, and the confirmation was measured at **one second and `pointerEvents="none"`** besides. *Who may*: Rosa fixes her own, and the window stays one number for all three kinds at his instruction — **the value is what is left, and it is the row above**. *What `Costos` shows afterwards*: ***"Just one line, clean"***, which is what `costsFrom` already does, so that screen needs no change. *Whether Comprar is a retrofit*: **both screens, now** — ***"Mirror it for Vender… Make the functionality for both for now."*** ⚠️ **TWENTY-SEVEN decisions have now been parked and cleared in this block.** ⚠️⚠️ **AND THE ROW THIS ONE REPLACES WAS THE ONE THE BLOCK HAD LOST AND RE-FOUND** — parked 2026-09-21, gone by 2026-09-25, restored by `5g-iii` reading a gate cell against the block. **It is closed by being ANSWERED rather than by emptying, which is the first time that has happened to a row this block had already dropped once.**

~~One is owed as of 2026-09-25, it does not block the task marked next, and it is the first row
this block has ever carried that it had already lost. área 6 — *mistakes* — was moved here on 2026-09-21
by a session that struck it out of the third-round table with the words *"read it there, not here"*, and it
was not here. the block emptied for the thirteenth time later that week and took the question with it.
`plan-handover.sh` cannot see this and never could: it checks that the block exists, that there is
exactly one, and that every row names what it blocks — there is no check that a question belonging in it
is present, because there is no list of what belongs. the remedy is not a better check, it is the
one this repository keeps rediscovering: a gate cell that says *see the decisions block* must be read
against the block, and `5g-iii` only read it because it was about to mark `5h` next.~~ — ⚠️ **struck in lower case deliberately, the rule `5b.8-i`'s row records: `plan-handover.sh` reads the raw line and a strikethrough is only a rendering.** ⚠️ **It described a question that had gone MISSING from this block; that question has since been ANSWERED (above), so the paragraph is history rather than a live warning — but the lesson in its last sentence is not, and it is the reason `5h.5`'s gate was re-read against this block today.**

~~✅✅✅ nothing is owed as of 2026-09-25, and the empty table above is deliberate — for the
thirteenth time in this project's life.~~ — ⚠️ **struck in lower case deliberately, the rule `5b.8-i`'s row
records: `plan-handover.sh` reads the raw line and a strikethrough is only a rendering.** ⚠️ **TWENTY-SIX decisions have now been parked and cleared
here, and FOUR of them were parked and ruled on 2026-09-25 alone** — the busiest day this block has
had, because the owner was holding the phone and answering inside the hour.

✅✅ **THE TWENTY-SIXTH RULING — *"a"*. ONE LETTER, AND IT AMENDED ADR-035 §2.7's CAPABILITY MATRIX.**
⚠️⚠️ **IT IS THE FIRST RULING THAT EVER REVERSED A ROW OF THAT MATRIX, AND THE FIRST MIGRATION IN
THIS SCHEMA TO WIDEN A COST FENCE.** The question was how far *"Empleada should be able to see the
both the purchase records and the prices"* went: **(a)** the delivery documents and the prefill, or
**(b)** the prefill alone. **He took (a), the wide one, which is what his words plainly said** — and
the brief recommended (a) for the reason that (b) puts two ways of reading one table.
⚠️ **The one-way door was named to him before anything was written**: the policies can be
re-narrowed, what somebody has already read cannot be unread. **He ruled anyway, which is his to
do, and it is recorded here so nobody re-litigates it as an oversight.**
✅ **Shipped the same day as `0040`.** ⚠️ **What he did NOT trade, measured rather than asserted:**
`stock_batch` and `stock_movement` keep their gate (cost on the SHELF), `waste_line` keeps its (the
cost of waste), and `product_margin_daily` states its own predicate inside the view — **so margin
reporting never moved**, and `0032`'s seed check now asserts that her margin read is still zero rows.

~~⚠️⚠️ one is owed as of 2026-09-25, it does not block the task marked next, and it is the first
row this block has ever carried that is a disagreement with adr-035 itself — the file `claude.md`
says wins.~~ — ⚠️ **struck in lower case deliberately, the rule `5b.8-i`'s row records:
`plan-handover.sh` reads the raw line and a strikethrough is only a rendering.** ⚠️ **The two before it were against a migration (`Genérico`) and against a lagging ADR
cell (expiry); this one is against §2.7's capability matrix, which is a DECISION the ADR records
rather than a description that fell behind.** ⚠️⚠️ **AND IT IS THE FIRST TIME THE ANSWER TO A ROW
HERE OPENED A BIGGER ROW RATHER THAN CLOSING THE BLOCK:** the twenty-fourth ruling closed *what is
she told* and its consequence — *may she see the costs at all* — is larger than the question was.

⚠️ **TWENTY-FIVE decisions have now been parked and cleared here. The twenty-fifth is the first
that answered a question with a THIRD option in the register rather than by reversing a
recommendation** — *latent*, where the brief offered *struck* or *deferred*.** — the first was
`Genérico`, against a migration; this one is against **ADR-035 itself**, which is the file
`CLAUDE.md` says wins. ⚠️ **It is also the FIRST time a row here asks the owner to amend the
ADR to match a ruling he has already given**, rather than to make a new decision.

~~✅✅✅ nothing is owed as of 2026-09-24, and the empty table above is deliberate — for the
twelfth time in this project's life.~~ — ⚠️ **struck in lower case deliberately, the rule
`5b.8-i`'s row records: `plan-handover.sh` reads the raw line and a strikethrough is only a
rendering.** ⚠️ **TWENTY-THREE decisions have now been parked and
cleared here, and the twenty-second and twenty-third were parked and ruled inside about four
hours** — both out of `5g`'s sizing, both answered in one message, and **both reversing the
recommendation.**

✅✅ **THE TWENTY-SECOND RULING — WHAT `Costos` SHOWS, AND IT IS NOT ONE OF THE THREE OPTIONS AS
POSED: *"I'm picturing a small Costos History, that shows a small line chart with the time and
the price that each provider (colors) is charging you for that product. As a collapsable you can
get the matrix that shows this data. You can share the 'view' as a PDF."*** ⚠️⚠️ **HE TOOK THE
OPTION THE BRIEF RECOMMENDED DEFERRING AND FOLDED THE ONE IT RECOMMENDED SPLITTING OUT INTO IT.**
The brief offered **(a)** last price paid and to whom, **(b)** a per-provider comparison as its
own row, **(c)** a trailing series, *"deferred twice over — §2.9 already owns price over time and
a series over three deliveries is a chart that lies."* **The answer is (b) AND (c), as ONE
picture**: time on one axis, price on the other, **one colour per provider**. ⚠️ **He did not
dispute that it says little early — he decided the screen is worth having anyway**, which is a
different judgement from the one the brief made and is his to make. **So the thin and empty
states are most of the real work**, and that is written into the row rather than discovered.
⚠️⚠️ **AND TWO THINGS NOBODY HAD NAMED CAME WITH IT: A COLLAPSIBLE MATRIX OF THE SAME ROWS, AND
A PDF EXPORT.** ⚠️ **The export has no precedent anywhere in this app — nothing here has ever
produced a file** — so §2.11's stack table needs a row naming whatever library does it, and
**that row is a DELIVERABLE of `5g-iii` rather than a task of its own**: `5c-ii-b-2`'s
arrangement for `expo-network`, folded for its reason. ⚠️ **`5g-iii` is re-sized `S` → `L`**, and
it is **the fifth time a ruling in this block has answered a larger question than the one
asked.**

✅✅ **THE TWENTY-THIRD RULING — `Genérico`, AND IT IS THE FIRST ROW THIS BLOCK HAS EVER CARRIED
THAT WAS A DISAGREEMENT BETWEEN THIS PLAN AND A MIGRATION CI HAD APPLIED: *"Genérico is fine,
that means we don't have a Provider for that purchase so we buy it from a generic provider… It's
a way to allow the user to make purchases from a non-recurrent provider if he wants."*** ⚠️⚠️
**HE REVERSED THE RECOMMENDATION WITH A REASON THAT CHANGES WHAT THE WORD MEANS.** The brief
argued for `Compra directa` because it names WHAT SHE DID — she bought it directly, at the
market, this morning — while `Genérico` only names the row to whoever built the schema. **True,
and beside the point: the row is not a description of an act, it is the ABSENCE of a counterparty
made into something the ledger can point at.** ✅ **Shipped the same day as `0039` (`5g.5`)**,
seed and existing rows together. ⚠️ **One thing his words leave open and no session may assume
either way**: *non-recurrent provider* may mean the generic bucket, which exists — or **typing a
one-off supplier's name at the counter**, which is a different affordance, is not built, and
lands against `provider_insert`'s manager fence. **`5g-ii`'s row records the question.**
~~⚠️⚠️ two are owed as of 2026-09-24. both came out of `5g`'s sizing, neither blocks the task
marked next, and the second is the first row this block has ever carried that is a disagreement
between this plan and a migration CI has applied.~~ — ⚠️ **struck in lower case deliberately, the
rule `5b.8-i`'s row records: `plan-handover.sh` reads the raw line and a strikethrough is only a
rendering.**
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


## ⏳ Dates — the ticked rows, and the block's notes

| Due | What | Why it cannot simply be moved | Done |
|---|---|---|---|
| ~~**2026-09-20**~~ | ✅✅ **DONE 2026-09-20 — RE-DEPLOYED, AND THE APP WAS NOT OPENED.** Built with `-allowProvisioningUpdates` and installed with `devicectl device install`; the new profile `4930c966` runs to **2026-09-27T14:22:11Z**. ⚠️ **The profile had ALREADY expired** (`06:19:32Z`, ~8 hours before), so the app on the phone was unlaunchable when this was done — the row was right about the risk and right about the date. ⚠️⚠️ **THE MEASUREMENT IS INTACT, AND THAT WAS VERIFIED RATHER THAN HOPED**: `devicectl device info processes` shows **zero** Wera processes (it was never launched), and `devicectl device info files` shows `Documents/SQLite/ExpoSQLiteStorage` — the session store — still carrying its **13/09 00:54** timestamp, untouched by the re-install. ⚠️ **And the false-negative risk was ruled out**: `app/src/lib/supabase.ts` has **no commits since before day 0**, so the new binary reads the same store the day-0 build wrote. A storage-key change would have made tomorrow's reading say *"signed out"* for the wrong reason | **It expired BEFORE the reading it exists for.** An expired profile stops the app launching, which on day 8 returns a red screen instead of an answer. ⚠️ **Re-deploy does NOT open the app** — opening it is what restarts the measurement | ☑ |
| ~~**2026-09-21**~~ | ✅✅ **DONE 2026-09-21 — READ ON BOTH INSTRUMENTS, AND THE ANSWER IS YES: THE SESSION SURVIVES EIGHT DAYS.** Both were measured BEFORE and AFTER the launch, so the verdict is a diff rather than an impression. **iPhone 15** (`09bfc47e…`): access token had been dead **8 days 7 hours**; after launch the store held a new one valid an hour, the refresh token was **rotated**, and ⚠️⚠️ **`last_sign_in_at` was UNCHANGED at `2026-09-13T06:47:53Z` — which is the whole finding: nobody signed in again, the session was RESTORED.** **Sealed AVD** (`eb963741…`, a **different Google account**, so the two instruments are genuinely independent): identical pattern, `last_sign_in_at` unchanged at `2026-09-14T00:20:05Z`, and a **screenshot shows Inicio** with the tab bar — the one platform where the screen could be read directly. ⚠️ **The emulator's clock was checked against the host before the verdict** (equal to the second, `auto_time=1`), because a sealed VM resuming with a stale clock would answer this question wrongly and confidently. ⚠️ **The refresh token was deliberately NOT spent out-of-band**: reuse detection is on at a 10s interval, so testing it outside the app would have revoked the session family and signed the owner out — destroying the measurement it was meant to take | **It expired BEFORE the reading it exists for.** Day 0 was 2026-09-13. ⚠️ **Opening either app before this date restarts its clock** — `wera-android-36` is the emulator to use for design work, never the sealed one | ☑ |
| ~~**2026-09-27**~~ | ✅✅✅ **DONE 2026-09-27 — AND IT IS THE FIRST RE-DEPLOY IN EIGHT THAT ACTUALLY MOVED THIS DATE.** Profile **`ad8112ec`** runs to **2026-10-04T14:28:16Z**, read off the BUILT BUNDLE's own `embedded.mobileprovision` rather than assumed. ⚠️⚠️ **THE RULE THIS ROW HAS REPEATED SEVEN TIMES IS CONFIRMED AND ITS COROLLARY WAS THE EXPENSIVE HALF: a build ON or AFTER the expiry renews — and RENEWING NEEDS AN APPLE ID SIGNED INTO XCODE, WHICH REUSING NEVER DID.** A build at 14:23Z, ninety seconds past expiry, **FAILED**: *"No Accounts: Add a new account in Accounts settings"* and *"No profiles for `mx.bserafin.wera` were found"*. ⚠️ **The certificate was never the problem** — `Apple Development: bersermi@gmail.com`, sha1 `3F86C967…`, valid to 2027-09-13 — **and the profile store was EMPTY, mtime 14:23:50Z, the minute that build ran: Xcode deleted the expired profile while failing to replace it.** ⚠️⚠️ **SO SEVEN EARLY RE-DEPLOYS DID NOT MERELY BUY ZERO DAYS — THEY HID A MISSING PREREQUISITE, and the first build that genuinely had to renew is the first one that could discover it.** ✅ The owner signed in (*"Done"*) and Xcode minted the profile before the next build was even started. ⚠️⚠️ **AND ONE RECORDED CAUSE IN THIS ROW IS WRONG, CORRECTED HERE: THE TRUST DIALOGUE IS NOT ABOUT A NEW CERTIFICATE.** The launch was refused *"because it has an invalid code signature, inadequate entitlements or its profile has not been explicitly trusted by the user"* — with the **SAME certificate as the previous build, measured by sha1 on both sides.** **A new PROFILE alone requires re-trusting**, so *Settings → General → VPN & Device Management* is owed on EVERY renewal and not only when the certificate moves. ~~The 2026-09-20 re-deploy minted a new certificate and cost the day-8 reading its first attempt; this build reuses the trusted one, so it should not recur.~~ — ⚠️ **struck: it recurred, with the trusted certificate.** ✅ **Verified for the CODE rather than for `BUILD SUCCEEDED`**: `main.jsbundle` is **4,058,980 bytes** written minutes before it was read, and **all fourteen of Desperdicio's words are in it — seven as 1-byte strings and seven as UTF-16LE**, which is Hermes' own split ([[hermes-bundle-stores-accents-utf16]]). ✅ **The data container survived, checked rather than hoped**: `ExpoSQLiteStorage` (24 KB) and `wera-outbox.db` (16 KB) both intact, so he is still signed in and the queue still holds whatever it held. ✅ **Installed on the FIRST attempt** — the phone was awake, which is the whole of the thirty-attempt story this row used to tell. ⚠️ **No `pod install` was needed and none was run**: `6a-i` is pure TypeScript, and `git diff` over `package.json`, the `Podfile`, both lockfiles and `app.json` since the 26 September deploy is empty. ⚠️⚠️ **THE HISTORY BELOW IS KEPT AS THE RECORD OF WHY THIS TOOK EIGHT TRIES** — ⚠️⚠️ **RE-DEPLOY WERA TO THE IPHONE AGAIN — AND AS OF 2026-09-22 IT KEEPS A WORKING APP ALIVE RATHER THAN AN INSTRUMENT.** The owner ruled that day: ***"I'm working through my iPhone, deploy it there for me to see. Override anything related to the 30 day session check."*** So the phone stopped being a sealed instrument and became a tool in use, and **this row's deadline is unchanged while its reason is not**: profile `4930c966` still expires `2026-09-27T14:22:11Z`, and when it does **the app stops launching in his hand**. ⚠️ **The re-deploy asked for here was DONE EARLY, on 2026-09-22** — but it reused the SAME profile rather than minting a new one, **measured** off the built bundle's `embedded.mobileprovision`, so it bought no extra days and this date stands exactly where it was. ⚠️⚠️ **THE OLD INSTRUCTION *do not launch the app* IS WITHDRAWN BY THAT RULING** — launching it is now the point. ⚠️ If the phone refuses the app, it is the trust dialogue: **Settings → General → VPN & Device Management → trust the developer**. The 2026-09-20 re-deploy minted a new certificate and cost the day-8 reading its first attempt; this build reuses the trusted one, so it should not recur. ⚠️⚠️ **AND THEN THE OWNER MUST TAP TRUST, WHICH THIS ROW DID NOT SAY AND WHICH COST THE DAY-8 READING ITS FIRST ATTEMPT.** On 2026-09-21 the launch was REFUSED — *"Unable to launch mx.bserafin.wera because it has an invalid code signature, inadequate entitlements or its profile has not been explicitly trusted by the user"* — because the 2026-09-20 re-deploy minted a new signing certificate. **Settings → General → VPN & Device Management → trust the developer**, on the phone, by a person. ⚠️ **The refused launch is harmless to the measurement and that was verified rather than assumed**: it started no process and the session store kept its day-0 timestamp. ⚠️⚠️ **But a re-deploy that is never trusted is an instrument that cannot be read on 2026-10-13, and nothing would say so until the day** ⚠️⚠️ **AND IT HAPPENED A THIRD TIME ON 2026-09-24, ASKED FOR BY THE OWNER — *"Install the thing in my phone, both are connected to the same Wifi for me to validate what you're describing"* — AND THE PROFILE STILL DID NOT MOVE.** Built with `-allowProvisioningUpdates` against the device destination and installed over the network with `devicectl device install app`; **`embedded.mobileprovision` still reads `2026-09-27T14:22:11Z`**, measured off the built bundle rather than assumed. ⚠️ **So three re-deploys have now bought zero extra days between them, and the reason is worth keeping: `-allowProvisioningUpdates` RENEWS a profile that is expired or missing and REUSES one that is still valid.** The way to move this date is to re-deploy ON or AFTER it, not before — **a re-deploy taken early is not a re-deploy taken.** ✅ **⚠️⚠️ **AND A FOURTH TIME ON 2026-09-25, ASKED FOR BY THE OWNER — *"Build and Install it, I will look at it"* — CARRYING `5g-ii` AND `5g-ii-a`, AND THE PROFILE STILL DID NOT MOVE.** `embedded.mobileprovision`, read off the built bundle rather than assumed, still says **`2026-09-27T14:22:11Z`** — **so four re-deploys have now bought zero extra days between them**, and the rule holds: `-allowProvisioningUpdates` RENEWS an expired or missing profile and REUSES a valid one. ⚠️ **The way to move this date is to re-deploy ON or AFTER it.** ✅ **Verified for the CODE rather than for `BUILD SUCCEEDED`**: `main.jsbundle` is 3,929,704 bytes written 39 seconds before it was read, and `Comprando a:`, `Registrar`, `Falta el costo` and `Compra registrada` are in it as 1-byte strings with `¿Cuánto?` as **UTF-16LE** — Hermes' own split. ⚠️⚠️ **THE PHONE READ `unavailable` FOR THE FIRST TEN MINUTES AND THAT IS WORTH RECORDING: `devicectl` CANNOT SEE A LOCKED PHONE AT ALL.** It is not a pairing or a network fault and it looks exactly like one. ⚠️⚠️ **AND A FIFTH TIME ON 2026-09-25, ASKED FOR BY THE OWNER — *"Install it in my phone, I'll look at the PDF"* — CARRYING `5g-iii` AND ITS TWO NEW NATIVE MODULES, AND THE PROFILE STILL DID NOT MOVE.** `embedded.mobileprovision`, read off the built bundle rather than assumed, still says **`2026-09-27T14:22:11Z`** — **so five re-deploys have now bought zero extra days between them**, and the rule holds without exception: `-allowProvisioningUpdates` RENEWS an expired or missing profile and REUSES a valid one. ⚠️ **The way to move this date is to build ON or AFTER it.** ✅ **It is the first re-deploy to carry a NATIVE dependency change** — `expo-print` and `expo-sharing` — so `pod install` ran before `xcodebuild` ([[no-ci-compiles-the-native-app]]), and **`BUILD SUCCEEDED` with `ExpoPrint.framework` in the bundle**: the one thing no workflow in this repository can check. ⚠️⚠️ **THE INSTALL TOOK 68 ATTEMPTS OVER ELEVEN MINUTES AND THE REASON IS WORTH RECORDING, BECAUSE IT LOOKS LIKE TWO FAULTS AND IS ONE.** `devicectl list devices` reads **`available (paired)` even while the phone is locked** — the lock only surfaces when something tries to mount the developer disk image, as `kAMDMobileImageMounterDeviceLocked`. ⚠️ **And a phone that unlocks and then re-locks PART-WAY THROUGH the mount fails differently — `Failed to acquire assertion (com.apple.dt.CoreDeviceError error 3)`** — which reads like a tunnel or pairing fault and is not one. **Both mean *the passcode*, and the fix is to keep the screen awake for the ~30 seconds the mount takes**, not to re-pair anything. A retry loop that treats only the first message as transient gives up on the second. ✅ **The data container survived, checked rather than hoped**: `Documents/SQLite/ExpoSQLiteStorage` and `wera-outbox.db` both intact at their 2026-09-24 23:42 timestamps, so he is still signed in. ✅ **And the app is RUNNING rather than merely installed** — `devicectl device info processes` shows pid 78401 executing from `…/70FF0D38-96C9-45ED-A9B0-768C3EF3172B/Wera.app/Wera`, **the same bundle path the install reported**, which is what makes *the running app is the build I just made* a measurement instead of an assumption. ⚠️ **No trust dialogue** — the certificate from 2026-09-20 is still trusted. ⚠️ **The launch was then refused with reason `Locked` — NOT an invalid signature and NOT an untrusted profile**, which is the distinction that matters on this row: the 2026-09-21 refusal read similarly and needed a person to tap Trust, and **this one needs nobody.** ✅ **The data container survived the install, checked rather than hoped**: `Documents/SQLite/ExpoSQLiteStorage` and `wera-outbox.db` are both intact, so he is still signed in. ⚠️ **The app launched** (`devicectl device process launch`, no trust dialogue, the certificate from 2026-09-20 still trusted) and the build carries `5f-iii-a`: `Ver carrito`, `Vaciar carrito` and `Producto retirado` are in `main.jsbundle` as 1-byte strings and `Sí, vaciar` and `Ya no está en el catálogo` as UTF-16, which is Hermes' own split and the reason a plain grep for the accented ones returns nothing. ⚠️⚠️ **AND A SIXTH TIME ON 2026-09-26, ASKED FOR BY THE OWNER — *"fix the Costos date, and build it to my phone"* — CARRYING `5h-ii-a` AND `5g-iii-b`, AND THE PROFILE STILL DID NOT MOVE.** `embedded.mobileprovision`, read off the built bundle rather than assumed, still says **`2026-09-27T14:22:11Z`** — **so six re-deploys have now bought zero extra days between them**, and the rule holds without exception: `-allowProvisioningUpdates` RENEWS an expired or missing profile and REUSES a valid one. ⚠️⚠️ **THIS DATE IS THEREFORE STILL OPEN AND IS NOW TOMORROW** — the way to move it is to build **ON or AFTER 2026-09-27**, and a build taken the day before is not a build taken. ✅ **Verified for the CODE rather than for `BUILD SUCCEEDED`**: `main.jsbundle` is **4,007,676 bytes** written minutes before it was read, and all seven of the new screen's words are in it — `Compras`, `Ventas`, `Sin dato`, `Producto sin nombre` as 1-byte strings and `Lo último`, `Buscando…`, `Los últimos siete días` as **UTF-16LE**, which is Hermes' own split ([[hermes-bundle-stores-accents-utf16]]) and the reason a plain grep for the accented ones returns nothing. ⚠️ **No `pod install` was needed and none was run**: both tasks are pure TypeScript, so no native dependency moved. ⚠️⚠️ **THE INSTALL TOOK THIRTY ATTEMPTS OVER TEN MINUTES AND THE REASON IS THE ONE THIS ROW ALREADY RECORDS: `devicectl` READS `available (paired)` WHILE THE PHONE IS LOCKED, AND THE LOCK ONLY SURFACES AT MOUNT TIME.** Twenty-nine refusals, one `CoreDeviceError 4000` tunnel timeout in the middle that looks like a network fault and is not, and then it landed the moment the screen was awake. ✅ **The data container survived, checked rather than hoped**: `Documents/SQLite/ExpoSQLiteStorage` (24 KB) and `wera-outbox.db` (16 KB) both intact at their pre-install timestamps, so he is still signed in and the queue still holds whatever it held. ⚠️ **The LAUNCH was then refused with reason `Locked`** — *"Unable to launch mx.bserafin.wera because the device was not, or could not be, unlocked"*, `FBSOpenApplicationErrorDomain error 7`. **That is NOT an invalid signature and NOT an untrusted profile**, which is the distinction this row exists to keep: it needs nobody, and tapping the icon is the whole of it. **No trust dialogue** — the certificate from 2026-09-20 is still trusted. | ⚠️⚠️ **THIS ROW EXISTS BECAUSE THE FIX IS ONLY SEVEN DAYS LONG, AND THE READING IT PROTECTS IS SIXTEEN DAYS AWAY.** A free personal team signs for seven days; the day-30 reading is **2026-10-13**, so this phone needs re-deploying **at least twice more** before then and the last one must land inside the seven days ending 2026-10-13. ⚠️ **Each re-deploy is safe for the measurement and was proved so on 2026-09-20** — the data container survives and the session store is not touched — **but only if the app is never opened.** ⚠️ **The sealed AVD needs none of this**: it has no provisioning clock, which is why it was sealed as the second instrument. ⚠️⚠️ **A SEVENTH RE-DEPLOY LANDED 2026-09-26 19:34 CST CARRYING `5h-ii-b`, AND IT BOUGHT ZERO EXTRA DAYS TOO — SO THIS ROW IS STILL OPEN AND IS DELIBERATELY NOT TICKED.** `Corregir` and `Eliminar` are on his phone and launched clean; all twelve of the new strings are in `main.jsbundle` (4,022,730 bytes, written minutes before it was read — **six as 1-byte and six as UTF-16LE**, Hermes' own split). ⚠️ **`embedded.mobileprovision` READ OFF THE BUILT BUNDLE still says `2026-09-27T14:22:11Z`**, unmoved for the seventh time. **`-allowProvisioningUpdates` renews an EXPIRED or MISSING profile and REUSES a valid one**, and at 19:34 CST the profile had 12h48m left — so it was reused, exactly as the rule predicts. ⚠️⚠️ **WHAT THIS ROW STILL NEEDS IS A BUILD ON OR AFTER `2026-09-27T14:22:11Z` (08:22 CST)** — that one will renew, and only then does the expiry move. **Seven early re-deploys have now demonstrated the same thing; a re-deploy taken early is not a re-deploy taken.** ⚠️⚠️ **TICKED 2026-09-27 BY `6a-ii-a`, AND IT HAD BEEN LEFT UNTICKED WITH ITS OWN PROSE READING *DONE* — which is the shape this block exists to refuse.** `plan-handover.sh` fires on a due date strictly BEFORE today, so it was green all day and would have gone RED on 2026-09-28 and blocked every merge, over an obligation that had actually been met: profile `ad8112ec` runs to `2026-10-04T14:28:16Z`, read off the built bundle, and the successor row below carries the date. ⚠️ **The exit was always ten seconds — a tick and a sentence — and the reason it was missed is that the ROW was rewritten and the CELL was not.** | ☑ |


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

## Archive-cut bookkeeping — cuts 1 to 27

⚠️⚠️ **AND 2026-09-27 HAS NOW BEEN CUT FOUR TIMES AND IS WHOLE IN ITS ARCHIVE — THE TWENTY-SEVENTH CUT
OVERALL, APPENDED BY `7b` AFTER IT WROTE ITS ENTRY.** Position stood at **1,403 of 1,400** — over the
cap. **184 lines out**: `6d`'s closing entry, including the install block the cut below kept back on
purpose. ⚠️ **It could go this time because the test that cut wrote down now passes**: the install
LANDED on 2026-09-28 and `7b`'s entry above says so, and the handbook's catch-up indexes every
look-question in it. **2026-09-28 has no archive file yet; the next cut opens one.**

⚠️⚠️ **AND 2026-09-27 HAS NOW BEEN CUT THREE TIMES — THE TWENTY-SIXTH CUT OVERALL, APPENDED BY `6d`
AFTER IT WROTE ITS ENTRY.** `## Position` stood at **1,318 of 1,400** with the entry in: **82 lines of
headroom against an entry that runs 40–130**, which is BELOW the whole range rather than inside it —
so the next session could not have written at all. ⚠️ **The calibration either side of it**: `6b`
inherited 245 and spent 82 without cutting; `6c` cut at 163 and called it *enough to pass and not
enough to write with*. **82 is not a judgement call.** **200 lines out**, the day's two oldest
remaining closing entries taken oldest-first: `6c`'s with its deploy note, and `6b`'s with its
look-question. **Position stands at 1,118.**

⚠️⚠️ **AND THE RULE THE CUT ABOVE STATED WAS BROKEN AND REPAIRED INSIDE THIS ONE, RECORDED RATHER THAN
QUIETLY FIXED.** The first pass ran to a LINE boundary and swallowed the install block below — *the
build is made and signed and is NOT on his phone*, the `devicectl` `unavailable` / `CoreDeviceError
1011` finding and its correction. **That block is the only place the blocker is written down**, and
four rows of work are now queued behind one install; it was moved back before the archive file was
written, and the corpus carries exactly one copy of it. ⚠️⚠️ **A LINE RANGE IS NOT A SEMANTIC
BOUNDARY, AND NOTHING CHECKS THIS** — `plan-handover.sh` counts lines and blocks, and would have
passed either way. The cut above left the same block behind on purpose and said so in one sentence;
this one had to be told by re-reading that sentence. ⚠️ **`6b`'s look-question WAS taken and that is
not the same thing**: `docs/HANDBOOK.md`'s `## ⏸ THE CATCH-UP` indexes it, so archiving it does not
stop it being re-offered. **The install block has no such index — which is the test to apply before a
cut, not after it.**

⚠️⚠️ **AND 2026-09-27 HAS NOW BEEN CUT TWICE — THE TWENTY-FIFTH CUT OVERALL, APPENDED BY `6c`
BEFORE IT WROTE A LINE.** `## Position` stood at **1,237 of 1,400**: 163 lines of headroom against an
entry that runs 40–130, **enough to pass `plan-handover.sh` and not enough to write with**, which is the
arithmetic every file here was opened on. ⚠️ **`6b` did not cut** — it inherited 245 lines and spent 82,
and `CLAUDE.md` said in as many words that the next session should expect to. **206 lines out**, the
day's two oldest CLOSING entries taken oldest-first: `6a-ii-a`'s and `6a-ii-b`'s.

⚠️⚠️ **AND ONE BLOCK WAS DELIBERATELY LEFT BEHIND, WHICH IS A RULE THIS BOOKKEEPING HAS NOT HAD TO
STATE BEFORE: A CUT TAKES CLOSED HISTORY AND MUST NOT TAKE AN OPEN OBLIGATION.** The install block —
*the build is made and signed and is NOT on his phone* — sits between `6a-ii-a`'s entry and this
bookkeeping and is chronologically older than `6b`'s. **It stays live**, because it is the only place
the blocker is written down: the Mac's Wi-Fi, and **three rows of work now queued behind one install**.
Archiving it would have buried the one thing waiting on a person. ⚠️⚠️ **AND THE LINE THAT USED TO STATE `## Position`'s SIZE HERE IS DELIBERATELY GONE RATHER THAN
CORRECTED, BECAUSE IT CANNOT BE RIGHT.** It said *1,170*, the file was 1,171; corrected to 1,171 and the
correction made it 1,176. **A number describing the file it is written in is stale the moment it is
saved** — three times in one session, each time by the act of writing it. ✅ **What the figure was FOR
is the only thing worth keeping: does the next session have to archive before it can write? It does
not — there are well over two hundred lines of room.** ⚠️ **The exact figure is
`bash docs/checks/plan-handover.sh`'s, which measures it after the edit rather than before**, and that
is the one number here nobody has to maintain.

⚠️⚠️ **AND 2026-09-27 NOW HAS A FILE OF ITS OWN —
[`docs/plan/archive/status-log-2026-09-27.md`](plan/archive/status-log-2026-09-27.md), THE ELEVENTH,
AND THE FIFTH EVER OPENED FOR A DAY THAT WAS STILL RUNNING.** Taken by `6a-ii-b` **before it wrote a
line**, with `## Position` at **1,290 of 1,400**: 110 lines of headroom against an entry that runs
40–130, which is enough to pass and not enough to write with. ⚠️ **It is `6a-ii-a`'s note in
`CLAUDE.md` being obeyed rather than a ceiling being hit** — *the next session should expect to take a
cut before it can write its own.* **263 lines out**, the day's two oldest entries taken oldest-first:
`6a-ii`'s sizing and split, and `6a-i`'s closing entry. ⚠️ **`## Position` came back at 1,155 with this
row's entry in place, which is 245 lines of room — the first time in four sessions that the next one
does not open by archiving.**
⚠️⚠️ **AND THE RUNNING CUT ORDINAL IS THIS BLOCK'S AND `CLAUDE.md`'s NO LONGER.** That file carried
*twenty-one cuts* while the paragraphs below already named a twenty-fourth — **two counters for one
thing, and the one nothing checks was the wrong one.** It now states only the FILE count, which a
one-liner re-measures; the ordinal lives here, where each cut writes itself down.

⚠️⚠️ **AND 2026-09-26 HAS BEEN CUT TWICE — THE TENTH ARCHIVE FILE, AND THE TWENTIETH CUT
OVERALL LANDED 2026-09-27.** ⚠️ **The second cut is `6a-i`'s and it took the day's two oldest
remaining blocks, 182 lines** — `5h-ii-b` and `5g-iii-b` — **appended to the same file, never a
second one for one date.** `## Position` stood at **1,385 of 1,400 with `6a-i`'s closing entry
already written**, which is 15 lines of headroom against an entry that runs 40–130: **enough to
pass, and not enough for the next session to write with.** ⚠️⚠️ **THAT IS THE FIRST CUT'S OWN
PREDICTION COMING TRUE** — its header says *a later session APPENDS to this file* — and it is the
nineteenth cut's argument inherited rather than re-derived.

⚠️⚠️ **THE FIRST CUT — THE NINETEENTH OVERALL, TAKEN BY `5h.5` BEFORE IT WROTE A LINE.**
[`docs/plan/archive/status-log-2026-09-26.md`](plan/archive/status-log-2026-09-26.md) holds
the day's **two oldest blocks, 190 lines** — `5h-i` (área 6 ruled, in a simulation round with
the owner) and `5h-ii-a` (`Lo último`, and the finding that nothing records a document's line
order). ⚠️ **`## Position` stood at 1,331 of 1,400 with nothing written yet**, and an entry
here runs 40–130 lines: **enough to pass, and not enough to write with.** `5h-ii-c` measured
that the day before and left it deliberately — *the cheapest moment to trip a tripwire is the
start of a session, not the middle of one* — and this is the next session obeying it rather
than discovering it. **After the cut: 1,137; 1,257 once this session's own entry and this paragraph were
written — so the cut bought 194 lines of headroom and spent 120 of them on the spot.**
⚠️ **The FOURTH file ever opened for a day still running**, after 2026-09-22, 2026-09-24 and
2026-09-25, and for the reason all three record: **there is no older day left to take.**
⚠️ **A later session APPENDS to it; never a second file for one date.**
⚠️⚠️ **FOURTEEN OF THE NINETEEN CUTS HAVE NOW BEEN TAKEN BY A SESSION THAT WANTED TO BE WRITING
SOMETHING ELSE**, which is the argument assertion 7 makes in its own failure text.
⚠️⚠️ **AND 2026-09-26 HAS OVERTAKEN 2026-09-25 AS THE BUSIEST DAY THIS PROJECT HAS HAD**: six
entries, five build rows closed, the whole of `5h` and with it the last build row of step 5's
undo, the thirtieth owner ruling, and área 6 ruled. ⚠️ **The mover asserted what one entry is
before it moved anything** — no `##` heading, no task row, 40–200 lines — and **its first
spelling refused the cut for the wrong reason**: it read `| **1** |` inside `5h-ii-b`'s own
findings table as a plan task row. **A task id always carries a letter or a dot after its
digits**, and that is what it matches now.

⚠️⚠️ **AND THE 2026-09-25 FILE TOOK ITS SECOND CUT ON 2026-09-26, IN THE EIGHTEENTH CUT
OVERALL — APPENDED, NEVER A SECOND FILE FOR ONE DAY.**
[`docs/plan/archive/status-log-2026-09-25.md`](plan/archive/status-log-2026-09-25.md) now
holds the whole of that working day: **six blocks, 415 lines** — `5f.5`, `5g-iii-a`, the
two things the owner confirmed by looking, the 27th and 28th rulings, the área-6 method
ruling and `5g-iii`'s own closing entry. ⚠️ **`CLAUDE.md` PREDICTED THIS CUT IN WORDS** —
its archive table already said the day *"RAN ON PAST THE CUT"* and named three of the
blocks; it was right about the need and short by three blocks about the size, because
`5f.5` and `5g-iii` both closed that day too.
⚠️⚠️ **THE BOUND WAS TAKEN FROM THE ARCHIVE BOOKKEEPING AND NOT FROM *"the next entry
head"*, WHICH IS THE TRAP THIS BLOCK RECORDS THREE INSTANCES OF IN ONE DAY** — the last
entry in the region is `5g-iii`'s and what sits under it is this bookkeeping, so a mover
reaching for the next entry head walks into it. ✅ **Both ends were found by CONTENT, and
the first attempt — which hardcoded line numbers — asserted itself wrong and refused to
write.** `## Position` stood at **1,394 of 1,400** with two decisions-block rows still to
add, and the cut left it at **979**.
⚠️ **The fourteenth cut taken by a session that wanted to be writing something else.**

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
⚠️⚠️ **AND THE TWENTY-THIRD AND TWENTY-FOURTH WENT IN AS `5g-ii-b` CLOSED — `5R-f` AND `5R-g`, THE
TWO RELEASE-PATH ROWS.** `## Position` reached **1,468 of 1,400** on the fourth status-log entry of one
working day, and the twenty-third cleared it to 1,395 — **five lines, which is a rounding error rather
than headroom** — so the twenty-fourth followed immediately. ⚠️⚠️ **THE SIZE GUARD REFUSED THE FIRST
ATTEMPT AT THE TWENTY-THIRD TOO, WHICH IS THE THIRD TIME IN ONE DAY AND ALWAYS THE SAME SHAPE:** the
mover reaches for *"the next entry head"* as a bound, the entry being cut is the LAST in the region,
and the proposal runs into the archive bookkeeping — **297 lines, then 234, then 270.** ✅ **Each time
the fix was to name the entry's real last line, and each time the guard caught it in seconds.**
⚠️ **The rule generalises and is worth stating once: a bound derived from what comes AFTER cannot work
at the end of a list.** ⚠️ **SIX CUTS ON 2026-09-25** — four status-log entries and four rulings in one
day, because the owner was holding the phone and answering inside the hour. **The ceiling is sized for
one entry per session and the answer is to cut more often, not to raise it.**

⚠️⚠️ **THE TWENTY-FIRST AND TWENTY-SECOND WENT IN AS `5g-ii-c` CLOSED, AND THE TWENTY-FIRST WAS
ATTEMPTED DESTRUCTIVELY FIRST — WHICH IS THE ONLY REASON THIS PARAGRAPH IS LONG.** The mover bounded
the block by looking for the NEXT entry head; `5f-iii-b` was the last entry in the region, so there
was none, and it ran **297 lines** — out of `## Position` entirely, **taking `## Steps 0 through 4.5`
and the `## READ FIRST — THE PLAN DISAGREES WITH ADR-035` gate with it.** ⚠️⚠️ **`plan-handover.sh`
DID NOT CATCH IT AND COULD NOT:** the plan was still readable, still had exactly one next task and
one of each owed block — **a plan missing two headings does not contradict itself.** ✅ **The line
arithmetic is what caught it** — 297 lines removed against 143 off `## Position`, which can only mean
the cut left the section — and `git checkout` reverted both files before anything was committed.
✅ **The mover now ASSERTS what one entry is** (no `##` heading, no `| **task** |` row, 40–120 lines)
**because a bound derived from what comes next is a bound that fails at the end of the list.** That
is the sister of the rule three scripts here already record: *a check must bound the region it reads,
not trust the next heading.* ⚠️⚠️ **AND THE GUARD EARNED ITSELF ONE CUT LATER**: the twenty-second hit
the identical shape — `5f-iii`'s notes had become the last entry once `5f-iii-b` left — proposed
**234 lines**, and was refused by the size assertion instead of by arithmetic.

⚠️⚠️ **AND THE TWENTIETH WENT IN THE SAME SITTING, TO PAY FORWARD RATHER THAN TO FIT.** The
nineteenth left `## Position` at **1,391 of 1,400** — *nine lines of room, which is not room*: a
ceiling cleared that narrowly blocks the NEXT session's first entry, and that session then opens
by archiving instead of building. **`5f-iii-a`'s reopening went out** — the sheet that did not
render, the owner's photograph, and the three bar arrangements he asked to see.

⚠️ **AND THE NINETEENTH WENT IN AS `5g-ii-a` CLOSED, off the FOOT** — `## Position` hit **1,423
of 1,400** with the twenty-fourth ruling's entry in it, so the **working-agreement amendment of
2026-09-24** went to `status-log-2026-09-24.md`. ⚠️ **The RULE it recorded is still binding and
lives in three files**; what moved is the entry recording the day it was decided.

⚠️⚠️ **AND THE EIGHTEENTH WENT IN AS `5g-ii` CLOSED, AND IT IS THE FIRST CUT EVER TAKEN
FOR A REASON THAT IS NOT SIZE FIRST: IT REUNITED A STATUS-LOG ENTRY THAT HAD TWO HOMES.**
The sixteenth cut moved `5f`'s sizing HEADER to `status-log-2026-09-24.md` and left its
BODY — twenty deliverables, three findings and the verification — behind in this block. ⚠️ **It
was not a duplicate and that was checked rather than assumed**: the two halves share no
sentence, so `split-coverage.sh`'s *"row appears 2 times"* could never have seen it. **A split
entry is worse than a stale copy, because each half reads as complete.** ⚠️ The size argument
holds too — `## Position` was at **1,359 of 1,400** with `5g-ii`'s entry and two parked
decisions in it — and **the forty-two lines came out of the half that was already orphaned**,
which is the cheapest room in the file. **A MOVE, unedited.**

⚠️⚠️ **AND THE SEVENTEENTH WENT IN AS `5g.5` CLOSED — `5f-iii-a`'s ENTRY AND THE
`unitColumns` FIX IT CARRIED, 150 LINES. THREE CUTS IN ONE DAY, AND THE SECOND ONE PAID
FORWARD.** This block stood at **1,384 of 1,400** — not red, sixteen lines of headroom, and
less than one paragraph. ⚠️ **The session that can see the number pays for its successor**,
which is `5d-iv-b`'s argument and the only reason this block has ever been cut early.
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




