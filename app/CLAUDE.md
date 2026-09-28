# `app/` — the Expo client

⚠️⚠️ **THIS FILE LOADS ONLY WHEN A SESSION TOUCHES `app/`, AND THAT IS WHY IT EXISTS.** It was
lifted out of the root `CLAUDE.md` on 2026-09-28 by `/doctor`: 26,908 characters — **62% of that
file** — were claims about this directory alone, and the root file is read in full by every
session including the ones that only touch `docs/` or `supabase/`.

⚠️ **NOTHING WAS REWORDED IN THE MOVE.** Every line below is the text the root file carried, so a
claim that was true there is true here and a stale one is stale in exactly the same way. ⚠️ **The
root `CLAUDE.md` keeps what is NOT app-only** — the CI workflow table, the migration rules, the
deploy commands, the working agreement and the graphify rules — because those govern
`supabase/`, `docs/` and `packages/` as much as they govern this directory.

⚠️⚠️ **AND NOTHING CHECKS THIS FILE EITHER**, which is the root file's own warning inherited
whole: no script in `docs/checks/` parses a `CLAUDE.md` and no workflow `paths:` filter names
one, so **every number below decays silently.** That is why the counts carry the one-liner that
re-measures them — take the command, never the number.

⚠️ **`app.yml` fires on `app/**`, so editing THIS file runs the app workflow.** That is a
consequence of where it now lives and not a decision anybody made.

---

~~There is no React Native code yet~~ — ⚠️ **FALSE SINCE `5a-i`, CORRECTED 2026-09-22, AND
IT HAD GONE ON MISLEADING THE ONE FILE EVERY SESSION READS FIRST.** `app/` is a real Expo
app and the fourth workspace (`@tienda/app`). **Measured 2026-09-25:**

- ⚠️⚠️ **20 ROUTE SCREENS plus 2 `_layout.tsx` = 22 `.tsx` FILES, MEASURED 2026-09-28 AFTER `7b`** —
  `7a` added `numeros.tsx` and `7b` added `precios/[id].tsx` (reached from Números, not Inicio).
  ~~18 ROUTE SCREENS plus 2 `_layout.tsx` = 20 `.tsx` FILES under `app/src/app/`,~~
  measured 2026-09-27 after `6c` AND STILL 20 — `6c` ADDED NO ROUTE**, it gave
  `producto/[id].tsx` back a control that had been drawn on nothing since 2026-09-23 (a filled
  placeholder adds no file, and neither does a restored button). ⚠️ **`app/src/ui/` is still NINE
  primitives too**: `Confirmacion` is the THIRD local copy of a confirmation box and was
  deliberately left in its route, with the count written on the page for the next `src/ui/` row.
  The count after `6b` (`find app/src/app -name '*.tsx' | wc -l`) — **`6b` added THREE
  routes at once**, which is the largest jump since `5d`: `proveedores.tsx` (the directory),
  `proveedor/nuevo.tsx` and `proveedor/[id]`. ⚠️ **A new route needs the typed-route declarations
  regenerated or the LOCAL typecheck rejects it while CI goes green**
  ([[new-route-needs-typed-route-regen]]) — and that regenerated file is also the only evidence in
  this repository that expo-router discovered the screen at all. ~~15 route screens plus 2
  `_layout.tsx` = 17 `.tsx` files, measured 2026-09-26~~ — `find app/src/app -name '*.tsx' | wc -l`, and the route count is
  that less the two layouts. ⚠️ **This entry said *16 screens* and ENUMERATED FOURTEEN**:
  the number counted the layouts as screens and the list did not, so neither half said
  what it was counting. **A layout is not a screen** — say which you mean.
  ⚠️⚠️ **MEASURED AGAIN 2026-09-27 AFTER `6a-i` AND AFTER `6a-ii-a`, AND IT IS STILL 17 BOTH
  TIMES** — `6a-i` turned `desperdicio.tsx` from a nine-line `Pendiente` into 1,079 lines (**filling
  a placeholder adds no file**), and `6a-ii-a` added a third TAB to `documentos.tsx` rather than a
  screen (**a switch inside one route is not a route**). `6a-i`'s own entry said *the eighteenth screen* before the command was run, which is
  the stale-count defect committed by the row correcting this very line.
  Four tabs (Inicio, Comprar, **Vender, and Desperdicio — a real screen since `6a-i`, 2026-09-27**) plus `productos.tsx`,
  `producto/[id]`, `producto/nuevo`, `familia/[id]`, `costos/[id]`, **`documentos.tsx`
  (`5h-ii-a`, *Lo último* — the recent-document list every correction is reached from)**,
  **`proveedores.tsx`, `proveedor/nuevo` and `proveedor/[id]` (`6b`, 2026-09-27 — Proveedores, and
  the row that makes Inicio's sixth door live)**, `ajustes`, `solicitudes`, `entrar`, `bienvenida`
  and `auth/callback`. ⚠️⚠️ **EVERY DOOR ON INICIO IS NOW OPEN**, so `ES.home.notYet` and the dead-door
  branch in `(tabs)/index.tsx` are **unreachable and deliberately kept** — the *dead, not wrong*
  argument `@/api/providers` makes about `MemoryState.unreadable`, and `inicio.test.ts`'s own
  assertion block was INVERTED rather than deleted.
- **30 entries in `app/src/api/`, measured 2026-09-28 after `7b`** (`ls app/src/api | wc -l` — `7a`'s
  `sales.ts`, `7d`'s `monthExport.ts`, `7b`'s `prices.ts`). ~~27 modules in `app/src/api/`~~ — the data layer, each one a claim about the applied
  schema (which is why `db.yml` watches it; see below). Measured 2026-09-27 after **`6d`**:
  `ls app/src/api | wc -l` (26 `.ts` plus `QueryProvider.tsx`). ⚠️⚠️ **THE NEWEST IS `persist.ts`
  (`6d`), AND IT IS THE FIRST MODULE HERE THAT MAKES NO CLAIM ABOUT THE SCHEMA AT ALL** — no RPC, no
  column list, no SQLSTATE. It is a POLICY module: the six query keys written to the phone's disk and
  the rule that admits them. ⚠️ **So `db.yml` fires on it for nothing** — the `paths:` filter names
  `app/src/api/`, and 12-13 minutes of contract checks run against a file with no wire in it. **A
  green `db.yml` on that PR is evidence about the schema and not about this module.**
  ⚠️⚠️ **THE THREE FINDINGS IN IT A SESSION WILL OTHERWISE RE-DISCOVER: (1) WITHOUT IT A COLD START
  WITH NO SIGNAL COULD NOT RING UP A SALE AT ALL** — `useCatalog` resolves `locationId` from
  `LOCATIONS_KEY` alone, `draftOf` refuses a null location with `no-location`, so `canCommit` was
  FALSE and the commit slider was not drawn on Vender, Comprar or Desperdicio; `useWorkspace()` was
  `null` so `basketful` was too. **The outbox `5c` built was reachable only by an app already running
  when the signal died.** **(2) `gcTime` EVICTS A QUERY FROM THE CACHE AND ONLY WHAT IS IN THE CACHE IS
  WRITTEN TO DISK** — TanStack's default is five minutes, so a catalog browsed and left is written
  once and silently written back out; the failure is invisible unless the phone sits for ten minutes
  first. **(3) THE BUSTER CANNOT BE THE PERSON SIGNED IN** — `PersistQueryClientProvider` restores
  once per mount and freezes its options before `AuthProvider` has read the stored session — **and
  clearing on `session === null` would wipe the catalog on a failed token refresh, which is exactly
  what a shop with no signal has all day.** So the buster is a SHAPE version and `forgetCache` is
  called from `signOut` alone, pinned by `api-persist.test.ts`. ⚠️ **`6c` ADDED NO MODULE** — it
  widened `catalogEdit.ts` with `is_prebuilt` on `VARIANT_EDIT_COLUMNS`, `canRetireProduct` and the
  `23001` mapping, which is asserted here rather than left to be recounted. ⚠️⚠️ **THE NEWEST IS
  `providerDirectory.ts` (`6b`), AND IT IS THE FIRST MODULE HERE THAT WRITES A `provider` ROW** —
  that table has been applied since `0002` (2026-09-02) and nothing in `app/` had ever changed one.
  ⚠️⚠️ **THE THREE FINDINGS IN IT A SESSION WILL OTHERWISE RE-DISCOVER, all measured against a real
  PostgREST: (1) A CASHIER IS REFUSED TWO DIFFERENT WAYS AND ONLY ONE OF THEM IS AN ERROR** —
  `provider_insert` gives her **403 `42501`** and `provider_update` makes the row **invisible**, so
  her PATCH is **200 with `[]`** and `.select().single()` is the only thing that turns it into
  something an app can act on; **(2) `normalize_name` FOLDS CASE AND WHITESPACE AND NOT ACCENTS**,
  so `Abarrotes Pena` beside `Abarrotes Peña` is two legal rows and `checkProvider` is deliberately
  **stricter than its own schema**; and **(3) THE GENERIC ROW CAN BE DEACTIVATED** —
  `provider_protect_generic` refuses a DELETE and a demotion and **stops there**, so `canRetire` in
  the client is the only thing between a mis-tap and a shop that opens Comprar with no default at
  all. ⚠️ **It has NO directory read of its own and that is the structural decision**: the list is
  `useProviders(null)`'s, so the directory and Comprar's picker cannot disagree about which
  suppliers exist. ⚠️ **`6a-ii-a` ADDED NO MODULE** — it widened `documents.ts`,
  `corrections.ts` and `unsent.ts` — ⚠️⚠️ **NOR DID
  `6a-ii-b`, WHICH WIDENED THE SAME THREE PLUS `@/cart/cart` AND `@/cart/store`.** ⚠️ **The
  finding in it worth inheriting: `@/api/documents` RENDERS A WASTE CAUSE THROUGH `reasonLabel`,
  WHICH IS A ONE-WAY DOOR BY CONSTRUCTION — so until that row the app held no cause it could
  send BACK.** `record_waste` takes the enum member and a shopkeeper reads the capitalised word;
  they differ by one letter, both are strings, and **no typecheck or Vitest fixture can tell
  them apart** — only a real `record_waste` refusing the word (HTTP 400 `22P02`) can.
  `DocumentLine.reasonValue` and `ShopDocument.causeValue` are the wire value beside the word,
  the pair `counterparty`/`providerId` already is. ⚠️ **`@/cart/store`'s `load` takes ONE
  OBJECT (`Loaded`) since that row and not four arguments**, because the fifth would have been
  `reason` beside `providerId`: both nullable, both strings, adjacent, and swapping them
  typechecks. ⚠️⚠️ **The newest is
  `waste.ts` (`6a-i`), and it is the first CONTRACT module here that calls nothing** (⚠️ **it is
    called now — `documents.ts` reads `isWasteReason` and `reasonLabel` off it as of `6a-ii-a`, so
    *calls nothing* describes the day it shipped and not today**) — the five
  causes of `public.waste_reason` and the payload key `0019` reads them under, because
  `record_waste` has been in `RECORD_RPC` since `5c-ii-a` and what was missing was the
  vocabulary. ⚠️⚠️ **THE THREE FINDINGS IN IT A SESSION WILL OTHERWISE RE-DISCOVER, all measured
  against a real PostgREST: (1) an ENUM SORTS BY DECLARATION AND NOT ALPHABETICALLY**, so the
  picker's order and a reason breakdown's are the same order or nothing can see that they differ;
  **(2) `record_waste` DEDUPES NOTHING** — the same variant twice under the same cause is two
  rows and a 200, which is what settled *one cause per document*; and **(3)
  `unit_price_gross_per_base` IS REQUIRED**, so a product with no shelf price is written off at an
  explicit ZERO rather than at nothing (`UNPRICED_WASTE` in `@/cart/cart`), because a loss not
  recorded destroys the only record of it. ⚠️ **`app/src/cart/` gained a third scope for it** —
  `Scope` is `sell | buy | waste` and is NOT `@tienda/money`'s `Kind`, which names two directions
  of tax; `CART_KEY` is `v3`. ⚠️ The one before it is
  `corrections.ts` (`5h-ii-b`), the first module in this app that CANCELS
  anything — `Corregir` and `Eliminar` over `void_transaction` (`0021`), applied and
  granted since 2026-09-04 and **never once called** until that row. ⚠️⚠️ **THE FINDING IN
  IT A SESSION WILL OTHERWISE RE-DISCOVER: `0021` MEASURES ITS WINDOW FROM `recorded_at` ON
  AN OFFLINE WRITE AND `occurred_at` OTHERWISE, so the clock starts when a document LANDS,
  never when the delivery happened** — measured, by a cashier voiding her own five-hour-old
  delivery against a fifteen-minute window and getting a 200. **So the client renders only
  the half of the fence that involves no clock, and the database answers the rest as
  `TD003` — which arrives on an HTTP 400 and NOT a 403**, because a custom SQLSTATE is not a
  privilege error to PostgREST. ⚠️ The one before it is **`documents.ts` (`5h-ii-a`)**, the
  first read in this app to start at a
  DOCUMENT and ask for its LINES — **a to-many embed over a composite foreign key**,
  where every other embed here is to-one and read from the line. ⚠️⚠️ **Its four wire
  claims are 200-and-wrong rather than red** and only
  `docs/checks/5h-ii-a-documents-contract.sh` can see any of them; the sharpest is that
  **nothing in this schema records the order a shopkeeper keyed a document's lines in** —
  no ordinal column, and `created_at` is identical across every line — so the order is
  `product_variant(name)`, sorted by the database through a NESTED embedded column.
- A palette and a density scale in `app/src/theme/`, a cart in `app/src/cart/`, an outbox
  in `app/src/offline/`, and **a PDF this app hands a shopkeeper** in `app/src/export/`.
  ⚠️ **`app/src/offline/` is SIX modules as of 2026-09-26** (`ls app/src/offline | wc -l`), and
  the two newest are `5h-ii-c`'s: **`unsent.ts`, which turns a write still in the device's
  SQLite queue into the same `ShopDocument` `Lo último` already draws, and `useUnsent.ts`,
  which opens the queue and takes a row out of it.** ⚠️⚠️ **THE FINDING IN THEM WORTH
  INHERITING: A QUEUED NOTE HAS NO ROW IN POSTGRES, SO `Lo último` SHOWED NOTHING AT ALL
  OFFLINE** — `useDocuments` asks the server, the read fails, and `documentsLine` answers the
  `ES.api` failure sentence — **and a shopkeeper who cannot find the delivery she just keyed
  keys it again.** Two client ids, both land, and `record_purchase`'s idempotency cannot help
  because they are genuinely two documents. ⚠️ **Dropping a queued write is NOT a void**: it
  reaches no server, leaves nothing in the ledger, and has no cache to invalidate — the fence
  is one SQL predicate in `@/lib/outboxDb`'s `drop`, bound to `DROPPABLE_STATE`, and **the
  delete's own `changes` count is the evidence** because a read-then-delete has a window the
  drain walks through. ⚠️ **The queue now has FOUR reader modules and `auth-errors.test.ts`
  pins that none of them is a screen** — that assertion has now directed three designs.
- **A Vitest suite of 1,669 tests across 50 files, the runner's tally 2026-09-28 after `7b`**
  (`api-prices.test.ts`, 47). ~~A Vitest suite of 1,542 tests across 47 files~~ in `app/test/` — ⚠️ **that number
  is the RUNNER's** (`npm --prefix app test`, 2026-09-27, after `6d` added
  `api-persist.test.ts` (29) and **inverted nothing and widened nothing** — the first new suite in a
  week that only added. ⚠️ **Its last block reads `QueryProvider.tsx` as TEXT**, because `R2` and
  `vitest.config.ts` both keep that file out of the suite and the binding is otherwise invisible:
  every policy assertion stays green while the predicate is reimplemented inline. **Eight
  falsifications, and F6 came back GREEN because the FIXTURE was broken** — a `sed` pattern with a
  trailing comma against a line ending in a brace, so the mutation never applied. It was 1,503 across
  46 after `6b` added
  `api-provider-directory.test.ts` (64) and **INVERTED a whole `describe` block in
  `inicio.test.ts`** — *"has exactly one door with no route, and it is Proveedores"* became *"has no
  door with no route"*, which is that block's own comment coming true: it ended **"The day `6b`
  ships, this whole assertion goes with it."** ⚠️ It was inverted rather than deleted, because *no
  door is dead* is worth holding for the next unbuilt door somebody adds to that table.
  It was 1,439 across 45 after `6a-ii-b` added a
  `a write-off, as a cart` block to `api-corrections.test.ts`, **the first tests `load` has
  ever had** to `cart.test.ts`, and the word-versus-value pair to `api-documents.test.ts` and
  `unsent.test.ts` — ⚠️ **INVERTING one guard that was right when it was written**: *"is NOT
  yet built for a write-off"* pinned `CORRECTABLE.waste` at `false` for the one day between
  `6a-ii-a` and that row. ⚠️ **It added NO file**, which is why the file count is unchanged and
  is asserted here rather than left to be recounted. It was 1,424 across 45 after `6a-ii-a` took
  `api-documents.test.ts` and `unsent.test.ts` up and **INVERTED two guards and NARROWED a
  third** — the narrowed one is a finding: *"sends the document kind and never the cart kind"*
  asserted `p_kind !== CART_KIND[kind]` of every kind, which held only because `buy ≠ purchase`
  and `sell ≠ sale`; **a write-off's cart scope IS `'waste'`**, so the blanket form was asserting
  something FALSE of the third member. It was 1,394 across 45 after `6a-i` added
  `api-waste.test.ts` (30) and a waste section to `cart.test.ts`; **the one red in that run was the
  guard pinning `CART_KEY` at `v2`**, which is how the version bump was found to be owed at all.
  It was 1,358 across 44 the day before, after `5h-ii-c` added
  `unsent.test.ts` (27) and took `offline-dead-letters.test.ts` from 32 to 37 to pin an
  extracted function directly; it was 1,326 across 43 earlier the same day, after `5h-ii-b` added
  `api-corrections.test.ts` and INVERTED two guards that had pinned the opposite claim, and
  1,288 across 42 and 1,219 across 41 before that), and the one before those (1,189 across 40) came out of CI run
  `36176282598` after correcting a count taken by grepping the files an hour earlier
  (1,119). **A count off a file is a claim about the file.** ⚠️ This entry said
  *"nearly 700 assertions"* until 2026-09-25.

⚠️ **`app/ios/` exists too and is NOT committed** — it is generated by `expo prebuild` and
gitignored, which is why no workflow compiles it.

⚠️ **What is still true and still matters:** `docs/CONVENTIONS.md` governs how a file in
`app/` is written, and `R2` keeps the suite in `app/test/` as `.ts` reaching no component.
⚠️⚠️ **`app/src/ui/` NOW HAS RULES — `5h.5` WROTE THEM ON 2026-09-26, AND `docs/CONVENTIONS.md`
DEFERS NOTHING FOR THE FIRST TIME SINCE IT EXISTED.** **ELEVEN primitives as of 2026-09-28** — `7a` extracted `Interruptor` and `7b` `Grafica` (the gate printed
11). ~~NINE primitives as of 2026-09-27~~ — `Boton`, `Buscador`,
`Cantidad`, `Deslizador`, **`Destello`**, `Frase`, `Separador`, `TecladoListo`, `Vacio`
(`bash docs/checks/conventions-gate.sh` prints the count its `R14` counted, which is the number to
take — a `ls` answers a different question) — and three rules over them:
⚠️⚠️ **`Destello` IS `6b`'s AND IT IS THE RULE BEING OBEYED RATHER THAN A TIDY-UP**: the blink that
says *this one is new* was inline in `productos.tsx` from `5d-ii`, and it moved the day
`proveedores.tsx` became the SECOND file to draw it. ⚠️ **`6b` also turned `Buscador`'s placeholder
into a REQUIRED prop with no default** — it spelled `ES.catalog.search` inside itself, which was
true while every caller searched the catalog and false the moment one searched suppliers (`R16`), and
a default would have been the stale-word defect with nothing able to see it. **`R14`** a component moves there only once a SECOND file
draws it (checked as *reached from two or more modules*, because *already drawn twice* is a fact
about the past that nothing can check); **`R15`** one component per file, named after the file,
never `export default`; **`R16`** the difference between the copies becomes a PROP, and the
difference nobody decided becomes a DECISION — settled by a count and written into the closing
message, because making it configurable moves the drift rather than ending it. ⚠️⚠️ **THE FINDING
WORTH INHERITING: `R14`'s FIRST SPELLING WAS A SEVENTH SHAPE OF MISLEADING GREEN AND IT DEPENDED ON
FILE SIZE.** `code "$f" | grep -q` under `set -o pipefail` — `grep -q` exits on the first match,
`code`'s grep dies of SIGPIPE, and pipefail hands the pipeline that failure — so a caller counted
only in files small enough for `code` to finish writing: `documentos.tsx` (750 lines) yes,
`vender.tsx` and `comprar.tsx` (~1,900) no. **`grep -c` reads to EOF.** ⚠️ **And closing the last
deferral WEAKENED two assertions**: 0b's *empty on both sides* is a legitimate pass, and 0c's *the
ADR names the task* half is disarmed outright — **the next row that writes a rule must put the
deferral heading back in the shape 0b greps for**, or nobody is watching. ~~Six primitives were
built across `5d`–`5g` **with no written rule**, and `5h.5` is the row that writes one.~~ ~~it is gated on `5h-ii-c` —
re-pointed twice in two days as `5h` and then `5h-ii` were each split, because a gate naming a row
nobody can take is a gate nobody can clear.~~ ⚠️⚠️ **THAT STRUCK SENTENCE CARRIED
`handbook-agreement.sh`'s SPLIT SENTINEL VERBATIM UNTIL 2026-09-26, AND IN `docs/PLAN.md` THE SAME
WORDING BROKE THE GUARD** — assertion 3 greps a plan row for it to decide a task was split, so
prose about one task's gate made another read as a split parent. **It is harmless in this file,
which no check parses, and it is reworded here anyway so nobody copies it back into one that is.** ⚠️⚠️ **`7b` CLOSED 2026-09-28 AND THE NEXT TASK IS `5P-a` — the dev-build overlay, ungated.** `7a`, `7d`
and `7b` all closed that day; `bash docs/checks/plan-handover.sh` names it and is the authority, not
this line. ~~`6d` closed 2026-09-27 and the next task is now `7a` — NÚMEROS, AND IT IS THE FIRST TIME THE
MARKER HAS LEFT STEP 6.~~ Step 6 has no takeable row left: `6a` and `6a-ii` are split parents and the
other six are closed. ⚠️ **`7a`'s gate `5h` closed 2026-09-26, so it is ungated by id** — the other
half of that Gate cell is prose and is the thing to weigh: *"and a shop with real rows in it"*.
⚠️ **`product_velocity_daily` has existed since `0013`/`0014` and NO module in `app/src/api/` queries
it** — the only mention under `app/src/` is a comment in `@/api/today`, which is a sentence and not a
read. ⚠️⚠️ **AND `6d` LEFT ONE THING THIS FILE SHOULD CARRY: `app/src/api/QueryProvider.tsx` IS NO
LONGER A PLAIN `QueryClient`.** It mounts `PersistQueryClientProvider` over the device's key-value
store — the same store the Supabase session lives in, deliberately — and **six query keys survive the
app being killed** while everything derived from the ledger is refused by name.
~~`6c` closed 2026-09-27 and the next task is now `6d` — the catalog that survives a cold start,
and it is ungated~~ ⚠️⚠️ **`6d` IS A ROW THAT DID NOT EXIST THIS MORNING**: it is `6c`'s
Finding 2, and `6c`'s own row had promised it one — *"it is a separate concern from the marker and
may want a row of its own."* `QueryProvider.tsx` builds a plain `QueryClient` with **no persister**,
so a shop that opens the app with no signal sees **no catalog at all**, which is the other half of
the owner's *"a set of products that he can also look at offline"*. **It ships no migration.**
~~`6b` closed 2026-09-27 and the next task is now `6c` — the prebuilt catalog, and it is ungated~~
⚠️ **`6c` was the second time that row held the marker and the first time on its own merits**: it
held it for four hours on 2026-09-24 while `5f-ii` was blocked. ⚠️⚠️ **AND THE THING IT ASKED
BEFORE WRITING SQL WAS ANSWERED THE SAME DAY: the marker is a BOOLEAN `is_prebuilt` and not the
`origin` ENUM this file and the plan had both called it since 2026-09-23.** The owner ruled it on a
measured argument two days old — an enum crossing the wire as a LABEL is a bug no typecheck and no
Vitest fixture can see (`6a-ii-b`'s `reasonLabel`) — and it matches `provider.is_generic`. ⚠️⚠️
**THE THREE FINDINGS IN `0042` A SESSION WILL OTHERWISE RE-DISCOVER: (1) FENCING BOTH DIRECTIONS OF
THE MARKER MAKES IT UNSETTABLE AFTER INSERT** — not by the seed, a fixture, a `service_role` job or
a later migration — and the defect is invisible in the one case anybody tests, an import that
INSERTS its rows; `provider_protect_generic`'s asymmetry (refuse a demotion, permit a promotion) is
the answer. **(2) `restrict_violation` IS AN HTTP 400 WITH CODE `23001`**, not a 403 and not a 409,
and it maps to a sentence that is deliberately NOT `notAllowedEdit` because the same manager may
rename and reprice the product he cannot remove. **(3) A READ IN THE SAME STATEMENT AS THE WRITE
SEES THE PRE-STATEMENT SNAPSHOT** — a pgTAP `chk` holding `_try(update …)` and `select is_active`
together reports a working fence as broken. ⚠️ **And `0042`'s backfill is recorded in
`pg_attribute.attmissingval` rather than in any row**, because the file writes no `update`: an
`update` would stamp `updated_at` on every row in every shop. ~~`6a-ii-b` closed 2026-09-27 and the
next task is now `6b` — Proveedores, and it is ungated.~~
~~`6a-ii-a` closed 2026-09-27 and the next task is now `6a-ii-b` — the two controls on a
write-off, and it is ungated.~~ ~~`6a-i` closed 2026-09-27 and the next task is now `6b` —
Proveedores.~~ ⚠️ **That was true for the hour between `6a-i` merging and `6a-ii` being sized**;
`6a-ii` then split `XL` into `6a-ii-a` and `6a-ii-b`, the first shipped the same day, and the marker
is the sibling's. ⚠️⚠️ **`6a-ii` SPLIT ON SIZE, WHICH IS THE FIRST TIME SINCE THE 2026-09-24
AMENDMENT THAT A SPLIT'S REASON HAS PLAINLY BEEN SIZE** — the agreement allows it for exactly one
letter, and the calibration is `5h-ii`: that row did this same work for `purchase` and `sale` and
was split THREE ways. ⚠️⚠️ **`6a` SPLIT
IN TWO ON THE DAY IT WAS TAKEN, AND THE REASON IS THAT APPLIED SQL PUT A MIGRATION IN THAT ROW AND
THE PLAN NEVER CARRIED IT** — `0003:589` (*"the reason-and-quantity view for Desperdicio ships with
that screen"*) and `0011:68` (*"it belongs with the Desperdicio screen (step 6)"*). **`6a-i` is the
capture screen and it shipped; `6a-ii` is the view and the list, and it is BLOCKED** on a question
in ⛔ DECISIONS OWED about what a cashier may see. ⚠️ **So `6c`'s claim to be *the first thing in
step 6 that ships a migration* is false and is struck in the plan.** ~~`5h.5` closed 2026-09-26 and
the next task is now `6a` — Desperdicio — which is the first time the marker has left step 5.~~
⚠️ **The marker leaving step 5 happened on 2026-09-26 and that part stands.** Step 5 has no takeable build row left (`5f-iv` out of
the pilot, `5i` deferred to v2, three split parents, and **`5P-a` and `5P-c` both named in
⛔ DECISIONS OWED**, which assertion 7c reads); `6a`'s own gate was `5f`, closed 2026-09-25, and
the owner reordered it ahead of its step on 2026-09-21. ~~nothing stands between here and `5h.5`
any more — it is the next task and it is ungated, as of 2026-09-26.~~ Área 6 was RULED that day by `5h-i`, a simulation round run with
the owner, and then **all three children of `5h-ii` closed on the same date** — `5h-ii-a` the
list, `5h-ii-b` the two controls, `5h-ii-c` the note that has not been sent. ~~as of
2026-09-26 it is one row: `5h-ii-a` and `5h-ii-b` both closed that day, leaving
`5h-ii-c`.~~ ⚠️⚠️ **AND TAKING `5h.5` NEEDED TWO `Blocks` CELLS RE-POINTED FIRST**: both open
decisions had been filed against it as a convenience, with the words *it blocks nothing
takeable* — which expired the instant it became takeable, because `plan-handover.sh`'s
assertion 7c reads that column and refuses a next task named in it. ⚠️⚠️ **`5h-ii-b`'s FOUR LOCAL COMPONENTS ARE NOW TWO PRIMITIVES AND ONE LOCAL, AND `5h.5` FOUND A THIRD DRAWING THE PLAN HAD NOT SEEN.** `Boton` and `Control` collapsed into `src/ui/Boton.tsx` **together with `vender.tsx`'s `Vaciar carrito` confirm, which was byte-identical in style** — three drawings across two files, and that third one is what made the extraction legal under `R14`, since two components in ONE route would have failed it. `Frase` is `src/ui/Frase.tsx`; **`Confirmacion` has one caller and stays in its route**, which is `R14`'s corollary. ⚠️ **Three shapes are still un-extracted ON PURPOSE with their counts on the page** — the filled button (**9 drawings, 8 files, seven with a border and two without**), the scrim (**7 across 3**) and the chosen pill (**5 across 3**) — because each decides what a shopkeeper sees on six-plus screens at once. ⚠️⚠️ **THOSE THREE NUMBERS ARE `5h.5`'s AND ARE NOW STALE, AND THEY ARE LEFT ALONE DELIBERATELY RATHER THAN GUESSED AT.** `6a-i` (2026-09-27) added **one** drawing of the filled button and **one** of the scrim in `desperdicio.tsx`, so the totals have moved — **but `5h.5` counted a SHAPE (a fill, a border, a weight) and not a palette token**, and this session could not reproduce that predicate: a plain `grep -c PALETTE.velo` answers *4 files* where the page says 3, and `PALETTE.accionSuave` answers *14 files* where the page says 8, because both tokens do more than one job. ⚠️ **Re-measuring them with the page's own predicate is the next `src/ui/` row's**, and a number derived a different way and written here would be the exact defect this file spends its length warning about. **`desperdicio.tsx` names what it added in its own `Pregunta` comment.** ⚠️ **Every session that
ships a primitive before it adds to a directory whose conventions nobody has written**, and
`5h.5`'s own row calls itself *"the last moment this is cheap"*.
