# Status log — the 2026-09-28 working day, whole

⚠️ **ARCHIVED 2026-09-29 by `8b` from `docs/PLAN.md`'s `## Position`, unedited** — `7a`,
`7d`, `7b` and `5P-a` closed that day, and rulings 35–45 were taken. **One file per day;
a later cut of the same day APPENDS here.**

⚠️⚠️ ~~**`5p-c` is the next task, as of 2026-09-28**~~ (deferred 2026-09-29, see above) **— COMPLETENESS, THE NUMBER THE PILOT IS GRADED ON,
AND IT IS UNGATED.** Its gate `5P-a` closed the same day, below. ⚠️ **What it inherits**: §5's
*five consecutive days within 5%* is a comparison against a MANUAL tally, so the first question in
its sizing is where that tally is typed and by whom — a shopkeeper question, to be walked through
with the owner before anything is designed. ⚠️ **Why not `7c`**: ungated by id and still wants DATA.

✅✅✅ **`5P-a` IS DONE, 2026-09-28 — THE PILOT'S INSTRUMENT: HOW FAST, HOW MANY TAPS, AND WHAT GETS
LEFT.** A build made with `EXPO_PUBLIC_PILOT` measures §5's four budgets and its abandonment on
Vender, Comprar and Desperdicio, files each reading to **`pilot_reading` (`0043`)**, and the OWNER
reads them back on a panel opened by a **long press on Ajustes' title** — *Hoy* or *Últimos 7 días*,
one block per screen, each measure against its budget as *Dentro*, *Fuera* or *Sin lecturas*. **A
build without the flag takes no reading at all.** ⚠️ **It ships a migration**, the first since `6c`.

⚠️⚠️ **WHAT THE ESTIMATE FOUND: `M` → `L`, ONE SITTING, AND FOUR QUESTIONS ASKED FIRST (rulings
42–45).** **(1) THE PILOT'S PHONES RUN RELEASE BUILDS**, so §5's *dev-build overlay* read as
`__DEV__` would be absent from every phone it exists for — the flag is a build-time variable
instead, and `R7` is amended to three. **(2) `R7` AND `auth-errors.test.ts` BOTH SHAPED WHERE THE
FLAG IS READ**: `lib/supabase.ts` has two pinned importers, so the flag lives in `lib/pilotFlag.ts`
and the gate names it. **(3) THE CONFIRMATION FIRES ON ENQUEUE** (`5f-iii-b`), so *commit →
confirmation* is a render budget with no network in it, stamped on the frame after the
confirmation mounts. **(4) THE ROUND TRIP HAS ONE HOME** — `flushRunner`'s `send`, timed only on a
reply that landed. **(5) A NEW POLICY MOVED A COUNT FOUR FILES PINNED** at 41 — two pgTAP suites and
two seed checks, all re-pinned at 42.

✅ **SHIPPED:** `supabase/migrations/0043_pilot_reading.sql` — one table, one owner-only SELECT
policy, one `security definer` function that stamps the member off `auth.uid()` and is idempotent on
the client's id; `app/src/pilot/readings.ts` (the pure half: kinds, budgets, nearest-rank
percentile, the visit machine that turns finger-downs into taps and abandonment, the panel's
summary), `recorder.ts` (the effects, a no-op on its first line without the flag, readings held on
the phone's disk until sent), `usePilotVisit.ts`, `Lecturas.tsx` (the panel); `app/src/api/pilot.ts`
(the contract); `lib/pilotFlag.ts`; two calls in `@/api/calls`, `usePilotReadings` in `@/api/hooks`,
`ES.pilot`; the three capture screens each gained the hook, a root `onTouchStart`, one line first in
`commit` and one effect. **No shopkeeper-visible change.**

⚠️ **DECIDED ON THE OWNER'S BEHALF, EACH CHEAP TO REVERSE:** **(a)** the slide counts as one of a
sale's taps — *a product and the slide* is two; **(b)** a visit with no commit is abandoned even at
zero taps, and the panel splits *started and left* from *passing through*; **(c)** the cold open is
filed only when nothing was touched before Vender drew — a launch through Inicio measures a person;
**(d)** a percentile is nearest-rank, never interpolated; **(e)** a send refused with a code is
DROPPED, the network is retried. ⚠️ **KNOWN LIMITS, written into `recorder.ts`'s header**: the cold
open starts at React Native's own mark and so slightly under-reports; a launch sent to the
background before Vender drew is not detected; the round trip does not know whether it was on wifi.

✅ **CHECKED BY:** `supabase/tests/0043_pilot_reading.sql` — **31 checks, 31 pass**, every read and
write under `set role authenticated`: owner reads 4, manager 0, cashier 0, another shop's owner 0; the
member stamped; a re-send lands 0; eleven refusals each by SQLSTATE. ⚠️ **Its first run was 5 red
with `42601`** — a stray parenthesis in the TEST, which a bare *did it raise* would have read as the
fence working; the assertions now record the state they got. **Falsified**: the policy widened to
manager turned 1.3 and 3.5 red. `app/test/pilot-readings.test.ts` (28) and `app/test/api-pilot.test.ts`
(22) — the kinds and screens read off `0043`'s CHECK constraints as text, the budgets off ADR §5, and
the wiring of all three screens, the flusher and Ajustes read as text; three source mutations each
turned one red. **1,719 tests across 52 files** green (the runner's tally). `docs/checks/conventions-gate.sh`
**18 of 18**, its R7 amendment falsified by a second variable in `pilotFlag.ts`, and its own falsifier
**35 fixtures as expected**. `supabase/checks/0032` (48) and `0033` (42) green over the seed at 42 policies.
⚠️⚠️ **THE FIRST CI RUN WAS RED AND IT WAS RIGHT: `02_rls_isolation_reads`' F7 — *every tenant table
held rows in BOTH workspaces* — named `pilot_reading`**, the third tenant table the seed leaves empty
(after `workspace_invite` and `failed_write`). **And the loop stops at the first red suite, so 03–07
and every `supabase/tests/` file had not run at all.** Both isolation suites now supply their own rows,
with F12 (02) and F10c (03) asserting the seed still holds none — `failed_write`'s pattern. **Measured
locally before the re-push**: pgTAP 01–06 at 97/118/159/43/88/99 ok, all 30 `supabase/tests/` suites
and all 11 `supabase/checks/` green. ⚠️ **The lesson is `failed_write`'s, re-learned: a new tenant
table is born invisible to the isolation suites until somebody gives it rows**, and only CI's F7 said so.
⚠️ **What no check can see is a person's to look at** — the handbook's catch-up names it: whether
taps inside the basket's `Modal` are counted, and whether *Abrir la app → Vender* agrees with a
stopwatch.

✅✅✅ **`7b` IS DONE, 2026-09-28 — PRECIOS: WHAT ONE PRODUCT SOLD FOR AND WHAT IT COST, DAY BY DAY,
AND HOW FAR EACH HAS MOVED.** Tap a product on Números (a new **›** on each product row) and `Precios`
draws **one chart, two lines, both with IVA** — the forty-first ruling, above — the latest price of
each side in words with its day, and área 9's six cards (*este mes, 1/3/6/9 meses, en el año*), each
*Sube x %*, *Baja x %*, *Sin cambio* or C3.12's dash. **It ships no migration.**

⚠️⚠️ **WHAT THE ESTIMATE FOUND: `M` → `L`, ONE SITTING, AND ONE QUESTION ASKED FIRST (ruling 41).**
**(1) `0040` already opened the purchase side to every role**, and `Costos` already opens for a
cashier, so *who sees cost* was settled rather than asked. **(2) `product_purchases_daily` has no
supplier column**, so ruling 34's *"a point may name a supplier Proveedores no longer lists"* never
arises on this chart — `Costos` is the per-supplier view and is unchanged. **(3) THE ONE THAT WOULD
HAVE SHIPPED GREEN AND DRAWN NOTHING: `*_price_last_gross` IS `numeric(14,6) × (1 + numeric(5,4))`, SO
IT ARRIVES AT SCALE 10, AND `parseDecimal` AT THE UNIT-PRICE SCALE THROWS ON IT** — every point dropped,
an empty chart, nothing red. `perBaseText` rounds once, half-up, to scale 6; the contract check asserts
the ten places off the wire. **(4) A SALE STORES A DERIVED NET** (`round(line_net / qty_base, 6)`,
`0016`), so its gross is rebuilt — and **measured**: $120.00/kg keyed with 16% IVA reads back exactly
$120.00. **(5) The chart extracts `Costos`' plot into `src/ui/Grafica.tsx`** — `R14`'s second drawing,
byte-for-byte, the eleventh primitive; nothing on `Costos` changed.

✅ **SHIPPED:** `app/src/api/prices.ts` (the **thirtieth** entry of `src/api/`, `ls app/src/api | wc -l`
= 30, `QueryProvider.tsx` among them) — the read contract, `perBaseText`, `pointsFrom`, `asOfDay`,
`changeOf` (in TENTHS of a percent, rounded once), `pricesFrom`, `plottedPrices`; `variantPriceHistory`
in `@/api/calls` (both sides side by side, paged at 500 over `(day, location_id)`, the WHOLE history
because a card's baseline is the last price before its window however old); `usePrices` in
`@/api/hooks` (not persisted); `app/src/app/precios/[id].tsx` (**route 20** — `find app/src/app -name
'*.tsx' | wc -l` = 22, less two layouts); the door in `numeros.tsx`; `ES.prices`, `ES.numbers.opens`.

⚠️ **FIVE THINGS DECIDED ON THE OWNER'S BEHALF, EACH ONE LINE TO REVERSE:** **(a)** a day's price is
the **last one typed**, not the day's average — `0032`'s own column comment calls that *the price as a
state*; **(b)** a card needs a price INSIDE its window and one on or before its baseline, else it is a
**dash, never *Sin cambio***; **(c)** the cards carry **words and no colour**, because up is good on one
side and bad on the other; **(d)** the chart spans exactly what the cards speak about (nine months or the
year, whichever reaches further), older prices feeding baselines only; **(e)** a **family row and a
retired product's row are not doors** — no single price, and no unit on the phone. ⚠️ **One known limit,
written into the module's header**: a day with sales AND a late void of an older sale keeps the last
line's price, which may be the voided one's — the view cannot say which line was the reversal.

✅ **CHECKED BY:** `app/test/api-prices.test.ts` — **47 tests**, and **1,669 across 50 files** green
(the runner's tally), falsified three ways by breaking the source — a percent scale, the baseline day
excluded, a missing unit read as *no trades* — each red. ⚠️⚠️ **Writing those tests found a DOUBLE
ROUNDING in the first draft**: basis points then tenths turned $11.00 → $12.60 (14.545…%) into *14.6*.
`docs/checks/7b-prices-contract.sh` — **11 groups** over live HTTP, ~2.7 s: ten decimals; $120.00/kg
rebuilt exactly and $92.80/kg bought; the LAST sale price ($3.50 after $3.00, not $3.1666…); the spine's
empty days AND a reversal-only day dropped, each proven present unfiltered; paging reassembles; **a
cashier reads the owner's rows on BOTH sides**; another shop reads none. Its falsifier — **6 fixtures**,
each red for its own reason, ~17 s. `docs/checks/conventions-gate.sh` — **18 of 18** (it caught
`Grafica.tsx` exporting its line type beside the component, `R15`). ⚠️ **Both checks are APPENDED to
`db.yml`'s `api-contracts` job**, which ran **9m35s of its 15** on `main` (run `36457025459`) — **so the
job count is unchanged: eight in `db.yml`, eleven definitions in all.**

✅✅ **AND THE INSTALL THAT HAD BEEN BLOCKED SINCE 2026-09-27 LANDED.** `devicectl` read the phone
**`available (paired)`** — although `networksetup` still says this Mac is on no Wi-Fi network, so the
blocker recorded below was not the whole story. `BUILD SUCCEEDED` from this branch, `main.jsbundle`
**4,264,937 bytes** carrying `Precios`' strings (accented ones as UTF-16LE), profile `ad8112ec` still
**2026-10-04T14:28:16Z** — reused, not renewed. `devicectl device info apps` lists Wera; the launch
was refused only because the phone was **locked**. **So every row from `6a-ii-a` to `7b` is on his
phone**, and the looks `7a`, `7d` and the catch-up list gathered need no rebuild.

⚠️⚠️ **WHAT ONLY HE CAN JUDGE (`R9`), AND NO REBUILD IS NEEDED:** whether two lines on a 160 pt plot
read as a margin or a tangle; whether *Compra con IVA* confuses someone who just typed the net into
Comprar; whether six cards of mostly dashes read as *not yet* or as *broken*.

~~`7b` is the next task, as of 2026-09-28 — how have my prices moved, and it is ungated.~~ — ⚠️
**struck in lower case deliberately, the rule `5b.8-i`'s row records.**

✅✅✅ **`7d` IS DONE, 2026-09-28 — A MONTH OF THE LEDGER LEAVES THE PHONE, AS A SPREADSHEET OR A
PAGE.** On Números, under the chart, a manager or the owner picks a month (‹ septiembre 2026 ›) and
taps **Hoja de cálculo (CSV)** or **PDF**; the phone's share sheet takes it from there. **It ships no
migration**: `0033`'s `transaction_export` has been applied since 2026-09-14 and this is its first
caller.

⚠️⚠️ **WHAT THE ESTIMATE FOUND: `S` → `M`, ONE SITTING, AND THREE QUESTIONS HAD TO BE ASKED FIRST.**
**(1) `0033` fences the view in its own BODY to `has_role('manager')`** — *"a partial export is worse
than no export"* — so a cashier reads ZERO rows, while ruling 31 had just put her into Números.
**(2) The format was never ruled**; `0033` was written for a CSV and the app's only file was a PDF.
**(3) Which month.** ✅ **ALL THREE ASKED BEFORE A LINE WAS BUILT, AND ANSWERED: THE THIRTY-FIFTH TO
THIRTY-SEVENTH RULINGS.** **(35) BOTH FORMATS** — against the recommendation of CSV alone. **(36) NO
DOWNLOAD FOR A CASHIER** — as recommended: the control is not drawn for her, `canExport` follows
`0033`'s applied fence, and widening it would be a migration he has not asked for. **(37) A SEPARATE
MONTH PICKER** — against the recommendation of *the month on screen*. ⚠️ **Reversing any of them** is
a component or a predicate — no migration, no data.

✅ **SHIPPED:** `app/src/api/monthExport.ts` (the **twenty-ninth** entry of `src/api/`, `ls app/src/api
| wc -l`) — the read contract, the month arithmetic, the parse, `canExport`, `whoOf`; `monthRows` in
`@/api/calls` (pages at 500 over a TOTAL order, `7a`'s reason) and `useMonthExport` in `@/api/hooks`
(nothing read until the tap; `exportKey` is not in `PERSISTED_KEYS`, so no month lands on the disk);
`app/src/export/monthFile.ts` — `monthCsv` and `monthHtml`, pure; `shareCsv` in `@/export/share`;
the `Descarga` section on `numeros.tsx`; `ES.monthExport`. ⚠️⚠️ **`expo-file-system` IS NOW A DECLARED
DEPENDENCY, AND TWO SENTENCES SAID IT WAS DELIBERATELY ABSENT** — `@/export/share`'s header and ADR-035
§2.11's Export row, both corrected here. **It adds no native code**: `expo` already depends on it and
`ExpoFileSystem` was in `Podfile.lock` before this row declared it — *measured* in that file, and still
no workflow compiles the app.

⚠️ **FOUR THINGS DECIDED ON THE OWNER'S BEHALF, EACH ONE LINE OR ONE CONSTANT TO REVERSE:** **(a)** the
file carries **no cost** (`unit_cost_net_per_base` is never asked for — área 9, waste is never a cost)
and **no per-base-unit price** (it is per GRAM on a kilo product); **(b)** the PDF's write-off section
shows **quantity and cause and no money**, while the CSV carries the figures the document stored;
**(c)** `created_by` becomes the member's NAME, a departed one included, never the uuid; **(d)** the
CSV opens with a **byte-order mark** (Excel reads every accent wrong without one), writes money as
plain `1234.50` so a spreadsheet can sum it, carries **no total row**, and prefixes a name starting
`=`, `+`, `-` or `@` with `'` so a product name cannot become a live formula in someone's copy.

✅ **CHECKED BY:** `app/test/api-month-export.test.ts` — **51 tests**, and **1,622 across 49 files**
green (the runner's tally), falsified three ways by breaking the source: formula guard off, BOM off,
money back on the write-off section — each red. ⚠️⚠️ **THE SECOND FALSIFICATION CAME BACK GREEN THE
FIRST TIME, AND THE FIXTURE WAS WHAT WAS BROKEN**: the file held the BOM as a literal invisible
character rather than the `\uFEFF` escape, so the `sed` matched nothing. The source now spells the
escape, and the mutation went red. `docs/checks/7d-month-export-contract.sh` — **10 groups** over
live HTTP, ~2.5 s: every column the app names exists and every figure is a string; the cost never
comes back; all three kinds in one month with the void flagged and negated, the supplier's accents and
comma intact, the cause the enum's own word; the neighbouring months read `[]`; paging reassembles;
**a cashier who reads her store's sales reads ZERO export rows**; another shop reads none. Its
falsifier — **5 fixtures**, each red for its own reason. `docs/checks/conventions-gate.sh` — **18 of
18**. ⚠️ **Both new checks are APPENDED to `db.yml`'s `api-contracts` job** beside `7a`'s — it ran
**10m08s of its 15** on `main` (run `36443364209`). **So the job count is unchanged: eight in `db.yml`,
eleven definitions in all.** ⚠️ **The root lockfile moved (one line), so `money.yml` fires on this PR
too** — twelve names in the log, not ten.

⚠️⚠️ **WHAT ONLY HE CAN JUDGE (`R9`), AND IT NEEDS A REBUILD FIRST:** that the share sheet offers the
CSV to WhatsApp, Files and a spreadsheet app, and it opens with its accents intact; that the PDF is
readable at a month's length; that ‹ › is findable. **Nothing here has been on a device.**

~~`7d` is the next task, as of 2026-09-28 — the raw rows, and it is `s`.~~ — ⚠️ **struck in lower
case deliberately, the rule `5b.8-i`'s row records.** `0033`'s month
export, handed over as a download from Números — the screen now exists for it to hang off. ⚠️ **Its
gate was `7a` alone, closed today.** ⚠️ **Why not `7b`, which sits above it**: `7b` is named in
⛔ DECISIONS OWED (*`Quitar proveedor` is one-way*) and `plan-handover.sh` refuses a blocked next
task — **and a chart naming a supplier Proveedores cannot show is exactly that row's question.** ✅ **THAT BLOCK CLEARED THE SAME DAY — the thirty-fourth ruling — so `7b` is takeable after `7d`.**
⚠️ **`7c` is ungated by id and still wants DATA** — a shop that has thrown things away for a while —
which is the prose half `7a`'s gate had and which `7a` could measure; `7c`'s cannot be yet.

✅✅✅ **`7a` IS DONE, 2026-09-28 — NÚMEROS EXISTS, AND IT ANSWERS THE FIRST OF §2.9's THREE
QUESTIONS.** *What am I selling, and what did it bring in*: a Día / Semana / Mes switch, one bar per
period of **gross** revenue, and under it the table for the tapped period — per product or per
family, each quantity in the unit the product is sold by. **Reached by a seventh row on Inicio, and
by every role** — the thirty-first and thirty-second rulings above. **It ships no migration.**

⚠️⚠️ **WHAT THE ESTIMATE FOUND: `M`, AND IT HELD — BUT THREE THINGS THE ROW DID NOT SAY DECIDED THE
SHAPE.** **(1) The view is a SPINE, not a list of sales**: `0014` gives every stocked product a row
for every day, sold or not, so an unfiltered six months is products × days of zeros. `line_count
> 0` is the filter, and it keeps a day whose only line is a void, which is what lets a void NET.
**(2) PostgREST truncates at `max_rows` (1000) WITHOUT AN ERROR**, and this is the first read in the
app that can exceed it — so `shopSales` pages at 500 over the view's own grain (`day, variant_id,
location_id`), a TOTAL order, and stops at the first short page. **(3) ADR-035 disagreed with itself
about who sees the screen** — asked, not decided (ruling 31). ⚠️ **And the prose half of the gate —
*"a shop with real rows in it"* — was MEASURED on the hosted project rather than assumed**: 22 sales
over 3 trading days (2026-09-24 → 2026-09-27), 13 products, read with `supabase db query --linked`.
Enough to look at; not enough to judge a trend on.

✅ **SHIPPED:** `app/src/api/sales.ts` (the **twenty-eighth** module of `src/api/`, `ls app/src/api |
wc -l`) — the read contract, Monday-first week bucketing, the bars and the table, all pure;
`shopSales` in `@/api/calls` and `useSales` in `@/api/hooks`; `app/src/app/numeros.tsx`; `ES.numbers`;
the door in `@/navigation/inicio`. ⚠️ **`src/ui/Interruptor` is the TENTH primitive** — `R14`, because
Números is the second file to need `Lo último`'s kind switch. **Extracted byte-for-byte, so `R16` had
no drift to settle and nothing on `Lo último` changed.**

✅ **CHECKED BY:** `app/test/api-sales.test.ts` — **26 tests**, and **1,571 across 48 files** green
(the runner's tally); `docs/checks/7a-sales-contract.sh` — **11 groups** over live HTTP, ~3 s: the
headline is gross (a taxed product keyed at $180.00 reads back $180.00), the unsold product is
filtered out AND is present unfiltered (so the filter did it), a same-day void nets, paging one row
at a time reassembles the read, a **cashier reads exactly the owner's rows**, and another shop reads
none; its falsifier — **4 fixtures**, each a copy of `sales.ts` with one constant broken, each red
for its own reason, ~10 s; `docs/checks/conventions-gate.sh` — **18 of 18**, R14 counting 10.
⚠️ **Both new checks are APPENDED to `db.yml`'s `api-contracts` job** beside the takings contract
rather than opening a ninth — its name already describes them, and it ran **9m31s of its 15** on
`main`'s last run. **So the job count is still eight in `db.yml` and eleven definitions in all.**

⚠️ **THREE SMALL DECISIONS TAKEN ON THE OWNER'S BEHALF, ALL ONE LINE TO REVERSE:** **(a)** the
screen opens on **Semana**, because Inicio already shows today's takings and *Día* would repeat it;
**(b)** a week starts on **Monday**, the Mexican calendar, which keeps a Saturday and a Sunday in
one bar; **(c)** no location filter — C1.5 puts each pilot shop at one store, the `Costos` argument.
⚠️ **And one fact the screen now shows that nothing showed before**: a sale voided the NEXT day is a
plus on one day's bar and a minus on the next, because `0021` stamps a reversal at the void moment.
Every week and month containing both is right; a lone day can read low. **That is the ledger's truth
and is drawn as it is.**

⚠️⚠️ **WHAT ONLY HE CAN JUDGE (`R9`), AND IT NEEDS A REBUILD FIRST:** whether fourteen day-bars read
as a fortnight or a comb; whether the tapped bar is findable with a thumb; whether Semana is the
right switch to open on; whether a family row reading a dash for quantity (C8.5 — kilos and pieces
in one family) is understood. **The build on his phone predates this and the install path is still
blocked on the Wi-Fi reachability recorded below.**


