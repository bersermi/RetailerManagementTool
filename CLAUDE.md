# Tienda — retail management tool

Multi-tenant retail operations for small Mexican retailers. Postgres (Supabase) +
React Native (Expo). MXN, IVA, LFPDPPP — not GDPR, CFDI out of scope.

**Read these before anything else:**

| File | Authority |
|------|-----------|
| [`docs/PLAN.md`](docs/PLAN.md) | Where the build is. Which step is next, what "done" means, what is unresolved. ⚠️ **Read `## Position` first — it holds the two blocks that carry live obligations**, and the status log for the current day sits there too |
| [`docs/adr/ADR-035`](docs/adr/ADR-035-target-architecture-postgres-react-native.md) | The architecture. **If anything disagrees with the ADR, the ADR wins and the other file is the bug** |
| [`docs/HANDBOOK.md`](docs/HANDBOOK.md) | ⚠️ **The file the OWNER reads** — so a task that closes usually edits it too. `docs/checks/handbook-agreement.sh` holds it in agreement with the plan on five things (done, split, next, and whether anything is waiting on him) and **never judges the plan.** A stale plan row is caught by the next session; a stale handbook row is caught by the owner, who has no way to know |

**Orient in one command.** It names the next task, prints the plan's size, and reports the
state of every live obligation — 11 assertions rather than a summary:

```
bash docs/checks/plan-handover.sh
```

⚠️⚠️ **NEVER WRITE THE NEXT TASK ID INTO THIS FILE.** `plan-handover.sh` refuses a second
status board, and a task id here is exactly that — it would be one more claim nothing checks
(see below), going stale the day the task closes.

## The plan is eleven files, and only one of them is live

⚠️ **`docs/PLAN.md` is the LIVE plan and the only one you edit.** On 2026-09-19 it had
reached 14,998 lines / ~313k tokens — **larger than a context window** — so closed work
moved to `docs/plan/archive/`, unedited and verified byte-identical on reconstruction.
⚠️ **This heading said *three files* until 2026-09-25, while the table under it listed
ten** — the same defect as the two missing rows below, in the line a cleared session
reads first:

| File | Status | Edit it? |
|---|---|---|
| `docs/PLAN.md` | **LIVE** — `## Position` (the two obligation blocks and the current day's status log), the ADR-disagreement gate, Step 4.6, **Step 5 — the client, which is the live step** — then 5R, 6, 7, 5P and *The other edges*, and the working agreement | Yes |
| `docs/plan/archive/steps-0-to-4.5.md` | Closed steps 0–4.5 | Only to move a section back |
| `docs/plan/archive/status-log-through-2026-09-18.md` | Status-log entries for 2026-09-18 and earlier | Only to move an entry back |
| `docs/plan/archive/status-log-2026-09-19.md` | The whole 2026-09-19 working day | Only to move an entry back |
| `docs/plan/archive/status-log-2026-09-20.md` | The whole 2026-09-20 working day | Only to move an entry back |
| `docs/plan/archive/status-log-2026-09-21.md` | The whole 2026-09-21 working day — the `5a-iv-d` day-8 reading | Only to move an entry back |
| `docs/plan/archive/status-log-2026-09-22.md` | **The 2026-09-22 working day, FIRST CUT** — ⚠️ the first archive taken from a day still running, because there was no older day left to take. **A later session APPENDS to it; never a second file for the same date** | Only to move an entry back, or to append a later cut of the same day |
| `docs/plan/archive/status-log-2026-09-23.md` | The whole 2026-09-23 working day | Only to move an entry back |
| `docs/plan/archive/status-log-2026-09-24.md` | **The 2026-09-24 working day** — the second file ever opened for a day still running, and the busiest day this project had had at the time (2026-09-25 has since passed it). ⚠️ **SEVEN cuts have been appended to it** — the seventh on 2026-09-25, when `5g-iii` found that `5g.5` and `5g-i` had been left in the live plan by all six earlier cuts, which is the rule above being obeyed | Only to move an entry back, or to append a later cut of the same day |
| `docs/plan/archive/status-log-2026-09-26.md` | **The 2026-09-26 working day, NOW WHOLE — three cuts.** ⚠️⚠️ **THIS ROW DID NOT EXIST UNTIL 2026-09-27 AND THE PARAGRAPH BELOW SAID IN WORDS THAT THE FILE DID NOT EITHER** — *"There is no `docs/plan/archive/status-log-2026-09-26.md` yet"* — true when written that evening and false by 02:41 the next morning. **`6a-ii-a` found it by listing the directory**, which is the third time this table has been corrected that way and is exactly what the warning under it asks for. The first cut held four entries, the second took `5h-ii-b` and `5g-iii-b`, and the third (`6a-ii-a`, 225 lines) took `5h.5` and `5h-ii-c` and emptied the day out of the live plan | Only to move an entry back, or to append a later cut of the same day |
| `docs/plan/archive/status-log-2026-09-27.md` | **The 2026-09-27 working day, FIRST CUT — the fifth file ever opened for a day still running.** Taken by `6a-ii-b` before it wrote a line, because `## Position` stood at **1,290 of 1,400** — *110 lines of headroom against an entry that runs 40–130*, which is enough to pass and not enough to write with. ⚠️ **It is `6a-ii-a`'s own note in this file being obeyed**: *the next session should expect to take a cut before it can write its own.* It holds the day's two oldest entries — `6a-ii`'s sizing and split, and `6a-i`'s closing entry — **263 lines**. ⚠️ **A later session APPENDS to it; never a second file for the same date.** ⚠️⚠️ **`6b` DID NOT APPEND, AND THAT IS RECORDED HERE SO THE NEXT SESSION KNOWS THE DAY IS STILL RUNNING IN THE LIVE PLAN**: it inherited 245 lines of headroom, spent 82, and left Position at **1,237 of 1,400** — 163 lines, which is enough to pass and probably not enough to write with. **The next cut appends to THIS file** | Only to move an entry back, or to append a later cut of the same day |
| `docs/plan/archive/status-log-2026-09-25.md` | **The 2026-09-25 working day, NOW WHOLE — two cuts.** The busiest day this project has had. The first cut held its first four entries and the 23rd–26th owner rulings, including the first migration to widen a cost fence and the day `Comprar` shipped. ✅✅ **THE SECOND CUT LANDED 2026-09-26, APPENDED, AND IT IS THIS TABLE'S OWN PREDICTION COMING TRUE**: the row used to warn that the day *"RAN ON PAST THE CUT"* and named `5g-iii-a`, the parked `R9` reading and the 27th and 28th rulings as still live. ⚠️ **It was right about the need and short by three blocks about the size** — `5f.5` and `5g-iii` closed that day too, so **six blocks / 415 lines** came out rather than three. ⚠️ **Appended, never a second file for one date** | Only to move an entry back, or to append a later cut of the same day |

⚠️⚠️ **THIS TABLE IS READ BY NO CHECK, AND ON 2026-09-25 IT WAS MISSING TWO FILES** —
`status-log-2026-09-23.md` and `status-log-2026-09-24.md`, both of which had existed for a
day. **`5g-ii` found it by listing the directory and comparing.** The rows are added above;
the lesson is that **the only thing keeping this table true is somebody looking**, so list
`docs/plan/archive/` when you cite it.

⚠️⚠️ **AND NOTHING CHECKS THIS FILE AT ALL — MEASURED 2026-09-25.** `CLAUDE.md` appears in
`docs/checks/` exactly three times and every one of them is inside a COMMENT or a failure
message; no check parses it, and no workflow `paths:` filter names it. **So every number in
this file decays silently.** That is why the counts below now say *when they were measured*
and name the one-liner that re-measures them — a stale number in the file every session
reads first is this repository's most-repeated defect.

⚠️ **The status log is archived ONE WORKING DAY PER FILE** and there will be more of
them. `plan-corpus.sh` globs `docs/plan/archive/*.md`, so a new one needs no wiring —
**never rename an existing archive to absorb a new cut**: the plan's own history names
these files, and renaming for tidiness makes a recorded statement false.

⚠️⚠️ **CLOSED IS NOT WRONG, AND THE TWO KINDS OF ARCHIVE ARE OPPOSITES.** `archive/power-platform/`
describes a system nobody is building and must never be cited as current.
`docs/plan/archive/` is **this** system's own history — every line was true when written,
and for several owner rulings about what a screen renders **it is the only record that
exists**, because §2.11 keeps rendering out of scope so there is no constraint, grant or
policy to hold them.

**To search the whole plan, live and archived, in one command:**

```
grep -n '<task-id>' "$(bash docs/checks/plan-corpus.sh)"
```

`plan-corpus.sh` assembles live + archive into one file, and it is what every split guard
already reads — so a task row resolves from the archive exactly as it did before the cut.
Every plan lookup here is **content-addressed** (`| **task** |`), never by line number,
which is the property that made archiving possible at all.

⚠️ **Moving something back is a MOVE, never a copy.** Two homes for one claim is the
defect this repository has had six of; `split-coverage.sh` fails on *"row appears 2
times"*, and it reads the corpus, so it sees both copies.

⚠️ **`plan-handover.sh` caps the size** — `docs/PLAN.md` at 6,000 lines and `## Position`
at 1,400 — and names the remedy in the failure. **Measured 2026-09-27 after `6b`: 5,446 lines
total, 1,237 in Position, all 11 assertion groups green** (`bash docs/checks/plan-handover.sh`
prints both numbers and the next task id). ⚠️⚠️ **THAT IS 163 LINES OF HEADROOM AGAINST AN ENTRY
THAT RUNS 40–130, SO THE NEXT SESSION SHOULD EXPECT TO TAKE A CUT BEFORE IT CAN WRITE ITS OWN** —
which is exactly the sentence `6a-ii-a` left here and `6a-ii-b` acted on. ⚠️ **`6b` did NOT cut**,
because the 245 lines it inherited were enough to write with; it spent 82 of them. **The cap is a
tripwire and the cheapest moment to trip it is the start of a session, not the middle of one.**
~~245 lines of headroom, the first time in four sessions this line has been able to say the next one
need not archive first.~~
⚠️⚠️ **THE PARAGRAPH THIS REPLACES SAID `status-log-2026-09-26.md` DID NOT EXIST, AND IT HAD
EXISTED SINCE 02:41 THAT MORNING** — the stale-claim defect in the file that spends its whole
length warning about it, which is why the table above now carries a row for that day.
Position reached 5,484 lines at one or two status-log entries per session, with nobody deciding
to; **cuts have now been taken across ELEVEN archive files** — `ls docs/plan/archive/*.md | wc -l`,
re-measured 2026-09-27 after `6b` and **still eleven, because `6b` took no cut** — **and the great
majority by a session that wanted to be writing something else.**
⚠️⚠️ **THE RUNNING TOTAL THAT USED TO SIT HERE IS DELIBERATELY GONE RATHER THAN BUMPED.** It said
*twenty-one across ten*, and the plan's own bookkeeping already named a TWENTY-FOURTH — **two counters
for one thing, and the one nothing checks was the one that was wrong.** The ordinal belongs to the
archive bookkeeping in `## Position`, which is where each cut writes itself down; the FILE count belongs
here because a one-liner re-measures it. ⚠️ **The cap is the SECOND assertion numbered 7 in that script** —
there are two, so `grep -n READABLE docs/checks/plan-handover.sh` finds it and the number
does not.

⚠️ **Never archive the `⛔ DECISIONS OWED` or `⏳ DATES OWED` blocks**: the same check
requires exactly one of each in the LIVE plan.

⚠️⚠️ **AND THE DECISIONS BLOCK CAN LOSE A QUESTION WITH NOTHING GOING RED — IT DID, ON
2026-09-25.** Área 6 (*Mistakes* — the undo) was struck out of its own table on 2026-09-21
with the words *"read it there, not here"* and was never written into the block; the block
then emptied for the thirteenth time and took the question with it. `plan-handover.sh`
asserts the block exists, is singular, and that every row names what it blocks — **there is
no check that a question which belongs in it is present, because there is no list of what
belongs.** ⚠️ **So a gate cell saying *see the decisions block* must be READ against the
block.** It was found by a session about to mark the gated task as next, which is the only
thing that has ever found it.

⚠️ **A *Blocks* cell is MACHINE-READ.** Assertion 7c pulls every `[0-9][0-9a-z.-]*` out of
it, so prose naming another task id in that cell makes the guard refuse a legitimate next
task — three instances so far, the third one a warning sentence committing the defect it
described. **Ids only in that column; the reasoning goes in the column no check parses.**

## What this is not

~~There is no React Native code yet~~ — ⚠️ **FALSE SINCE `5a-i`, CORRECTED 2026-09-22, AND
IT HAD GONE ON MISLEADING THE ONE FILE EVERY SESSION READS FIRST.** `app/` is a real Expo
app and the fourth workspace (`@tienda/app`). **Measured 2026-09-25:**

- ⚠️⚠️ **18 ROUTE SCREENS plus 2 `_layout.tsx` = 20 `.tsx` FILES under `app/src/app/`,
  measured 2026-09-27 after `6b`** (`find app/src/app -name '*.tsx' | wc -l`) — **`6b` added THREE
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
- **26 modules in `app/src/api/`** — the data layer, each one a claim about the applied
  schema (which is why `db.yml` watches it; see below). Measured 2026-09-27 after `6b`:
  `ls app/src/api | wc -l` (25 `.ts` plus `QueryProvider.tsx`). ⚠️⚠️ **THE NEWEST IS
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
- **A Vitest suite of 1,503 tests across 46 files** in `app/test/` — ⚠️ **that number
  is the RUNNER's** (`npm --prefix app test`, 2026-09-27, after `6b` added
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
DEFERS NOTHING FOR THE FIRST TIME SINCE IT EXISTED.** **NINE primitives as of 2026-09-27** — `Boton`, `Buscador`,
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
which no check parses, and it is reworded here anyway so nobody copies it back into one that is.** ⚠️⚠️ **`6b` CLOSED 2026-09-27 AND THE NEXT TASK IS NOW `6c` — THE PREBUILT CATALOG, AND IT IS
UNGATED.** ⚠️ **It is the LAST row in step 6**: `6a` is closed in all three parts and `6b` shipped
Proveedores that evening. ⚠️⚠️ **AND IT IS THE FIRST ROW IN A WHILE THAT MUST STOP AND ASK BEFORE
WRITING SQL** — it mints a marker column on `product_variant` saying where a product came from,
which is a one-way door the seed bakes in. **`0042` is next.** ⚠️ **It is the second time `6c` has
held the marker and the first time on its own merits**: it held it for four hours on 2026-09-24
while `5f-ii` was blocked. ~~`6a-ii-b` closed 2026-09-27 and the next task is now `6b` —
Proveedores, and it is ungated.~~
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

⚠️ ~~Neither CI workflow watches an app directory~~ — **THERE ARE THREE WORKFLOW FILES AND
`app.yml` SHIPPED WITH `5a-i`.** ⚠️⚠️ **AND AS OF 2026-09-27 THEY ARE **TEN** JOB DEFINITIONS
THAT RENDER AS **ELEVEN** NAMES IN THE LOG — WHICH IS WHAT *"confirm the checks by name in the
log"* NOW MEANS.** ⚠️ **`6b` ADDED THE TENTH — `db.yml`'s `providers`, *the provider directory, and
the manager fence on it* — AND IT IS A NEW JOB RATHER THAN TWO MORE STEPS, WHICH IS THE OPPOSITE OF
WHAT `6a-ii-a` AND `6a-ii-b` BOTH DID.** Both of those appended because they shared the IDENTICAL
fixture; this one shares no fixture with either candidate, and the two candidates fail for different
reasons: `catalog-write` (where the manager-fence precedent and `5g-i`'s provider fixture live) runs
**12-13 minutes against its own fifteen and was cancelled three times on `main`**, and
`recent-documents`' NAME already covers two unrelated things. ⚠️ **The count in this line is
re-measurable**: parse `jobs:` out of all three workflow files and multiply the matrixed one. `money.yml`'s single job is **matrixed**, so it appears twice, and a count
taken from `jobs:` keys alone is short by one. ⚠️ **`6a-i` added the ninth** — `db.yml`'s
`waste` — **as a new job rather than two more steps on `recent-documents`, which is the opposite of
what `5h-ii-b` did**: that row appended because a correction is *the thing you reach from the list*,
and this is a WRITE where that job is a READ. ⚠️⚠️ **AND `6a-ii-a` APPENDED TO THAT SAME JOB RATHER
THAN OPENING A TENTH, SO THE COUNT IS STILL NINE — RENAMING IT TO *the loss, the cause it is filed
under, and reading it back*.** ⚠️⚠️ **AND `6a-ii-b` DID IT A THIRD TIME ON THE SAME DAY, SO THE COUNT
IS STILL NINE AND THE NAME MOVED AGAIN — *the loss, the cause it is filed under, reading it back and
putting it right*.** Same argument, measured the same way: the two build the IDENTICAL fixture, and a
tenth job would re-pay `supabase start` + `db reset` — the dominant cost — to run **2.5s + 16s** of new
assertions. ⚠️ **The KEY is still `waste`**: the NAME has now moved twice and the key never has.
`6a-ii-a` is a READ, so `6a-i`'s own argument pointed at
`recent-documents`; **two measured things decided otherwise** — the two checks build the IDENTICAL
fixture (one subject, Desperdicio over the wire, where `recent-documents` never touches a cause), and
a tenth job would re-pay `supabase start` + `db reset`, the dominant cost, to run seconds of new
assertions. ⚠️ **The KEY stayed `waste`** and the NAME moved, which is `5h-ii-b`'s lesson: *a job
whose name describes half of what it runs is the stale-claim defect.*
⚠️⚠️ **THIS LINE SAID *SIX DEFINITIONS* AND ITS
OWN TABLE BELOW ADDED UP TO SEVEN — corrected 2026-09-26 by `5h-ii-a`, which added the
eighth.** 2 (`app.yml`) + **7** (`db.yml`) + 1 (`money.yml`) = **10**, and the table below is the
arithmetic. ⚠️ **It read `2 + 6 + 1 = 9` until `6b` opened the seventh `db.yml` job on 2026-09-27.** ⚠️⚠️ **AND NO SINGLE PR EVER SHOWS ALL NINE, WHICH IS THE PART THAT MAKES *"confirm the
checks by name in the log"* HARDER THAN IT SOUNDS.** Each workflow has its own `paths:`
filter, so a PR that does not touch `packages/**` renders **seven** names and `money.yml`'s
two are simply absent — not skipped, not failed, **absent**. `5h-ii-a`'s own PR (#222) is
exactly that shape: seven names, all seven green, and `money.yml` never fired. ⚠️ **`6b`'s own PR is
the same shape with one more name**, because it opened a `db.yml` job and touched no `packages/**`. ⚠️ **So the
count to check against a log is the count of jobs that COULD fire for the paths that
changed**, and a reader expecting nine on every run will read a normal PR as missing two.
The two `money.yml` names were last confirmed on the merge of #213 (runs `36172686917` /
`36172686952` / `36172687093`).

| Workflow | Fires on | Job names in the log |
|---|---|---|
| `app.yml` | `app/**`, `packages/money/**`, `docs/PLAN.md`, `docs/plan/archive/**`, `docs/CONVENTIONS.md`, `docs/HANDBOOK.md`, ADR-035, and each plan/handbook guard by name | `app (node 22)` — typecheck, Vitest, conventions gate — **and** `the documents still agree (plan + handbook)`. ⚠️⚠️ **SPLIT 2026-09-25 BECAUSE IT WAS TIMING OUT.** The seam is free because no document guard needs `node_modules`, and the two halves fail for different reasons: *the code is wrong* vs *the documents disagree with each other* |
| `db.yml` | `supabase/**`, **`app/src/api/`**, `app/src/auth/`, **`app/src/cart/cart.ts`** (new 2026-09-27 — `PRICE_KEY`, `MONEY_KIND` and `UNPRICED_WASTE` are claims about `0019` rather than about a basket, and it is the first file under `app/src/cart/` any workflow has watched), `packages/money/cases.json`, and every contract check and falsifier by name | **seven** (`providers` added by `6b` 2026-09-27, *the provider directory, and the manager fence on it* — **the first thing anywhere to WRITE a `provider` row**, applied since `0002` and never changed by this app; and `waste` added by `6a-i`, *the loss, and the cause it is filed under* — the first thing anywhere to call `record_waste`, applied and callerless for 22 days): `supabase db reset`, `the app's data layer against a real database`, `session survives a lost refresh reply`, `the catalog write, and the manager fence on it`, and **`the list every correction is reached from, and the correction`** (`5h-ii-a` 2026-09-26, ⚠️ **renamed the same day when `5h-ii-b` appended two steps rather than opening a sixth job** — the split precedent here is about the CAP and this job was measured well under it, but **a job whose name describes half of what it runs is the stale-claim defect**). ⚠️ **The biggest job was split by `5R-g`**, and the fifth was split off for the same measured reason: `catalog-write` runs 12-13 minutes against a 15-minute cap and had been cancelled three times on `main`, and ⚠️ **a cancelled job is neither a pass nor a failure.** ⚠️ **Its key is `recent-documents` and NOT `documents`**, because `app.yml` already has a job keyed `documents` meaning something unrelated. ⚠️ **The KEY did not move when the NAME did**, so nothing addressing this job by key broke |
| `money.yml` | `packages/**` | one job, matrixed: `packages/money (node 22)` and `(node 24)` |

⚠️⚠️ **`db.yml` IS NOT ONLY `supabase/**`**, because a module in `app/src/api/` is a claim
about the applied schema — which is why editing `app/src/api/catalog.ts` runs the live-HTTP
contract checks against a real database. ⚠️ **A red `db.yml` whose steps read `skipped`
after "Start Postgres" is a registry throttle and not a migration defect** — check that
before chasing the SQL.

⚠️⚠️ **WHAT NO WORKFLOW DOES IS COMPILE THE APP.** That gap is real, it cost this project a
day on 2026-09-22, and a native dependency swap stays green until a Mac builds it.

⚠️⚠️ **THE OTHER GAP FROM THAT DAY IS CLOSED BUT DELIBERATELY NOT AUTOMATED. `5R-f` (done
2026-09-24) SHIPPED A CHECK THAT IS IN NO WORKFLOW ON PURPOSE**: `supabase migration list
--linked` needs an **account-wide** access token — there is no project-scoped one — so a
repository secret would hand every workflow run the owner's whole Supabase account to guard
against a forgotten `db push`. **A person runs it, or nobody does:**

```
supabase db push                            # applies what the remote is missing
bash docs/checks/5R-f-schema-deployed.sh    # proves it actually landed
```

✅ **IT WAS RED FOR MOST OF 2026-09-25 AND IS NOW GREEN — 6 OF 6, AFTER THE OWNER SAID
*"deploy the two migrations"* THAT EVENING.** `0039` and `0040` had merged that day and
**were never applied** to `hweutzjhzvioswnjzqki`; the guard found it, `supabase db push`
applied both, and the check now reports *"carrying exactly the migrations this repository
has merged"*. ⚠️⚠️ **THE GAP IS CLOSED, THE HOLE IT CAME THROUGH IS NOT: nothing runs this
check automatically, so the next merged migration is undeployed until a person types the
two commands.** ⚠️ **And it compares VERSION NUMBERS, not schema** — green here means the
right migrations ran, never that the tables look right. ⚠️ **On counting: 36 of 38, and
this line said *"38 of 40"* for an hour.** The file count is **38** because `0006` and
`0007` are permanent holes, so *"38 files"* and *"numbered up to 0040"* are both true and
are not the same number. This is 2026-09-22's shape again — caught this time
by the guard instead of by him tapping Productos. **Do not reason about deployed behaviour
until those two commands have been run.**

`archive/power-platform/` holds a Power Apps Canvas + Dataverse era that stopped on
2026-08-14. **Nothing there describes the system being built**, four of its ADRs are
provably false, and it is excluded from the knowledge graph via `.graphifyignore`.
Never cite it as current. Read it only for history, and say so when you do.

## Rules that are not negotiable

- **A file is not evidence; a green CI run is.** Every schema claim must trace to a
  migration CI has applied (ADR-035 §9). This repo exists in its current form because
  the last one recorded decisions that were never deployed.
- ⚠️⚠️ **AND A GREEN CI RUN IS NOT A DEPLOY.** Every check builds its own Postgres,
  asserts against it and deletes it. The one database a phone talks to is reached only
  by `supabase db push`, by hand — see the two commands above, and `supabase/README.md`'s
  *Deploying* section. **Say which of the three you have evidence about: the schema, the
  code, or the shop.**
- **Migrations are append-only once applied.** Fix forward with a new numbered
  migration. Numbering is fixed in [`supabase/README.md`](supabase/README.md).
  **Measured 2026-09-27 after `6a-ii-a`: 39 files, `0041` the highest, so the next is `0042`** —
  `0006` and `0007` are permanent holes (`supabase/README.md` settles why), so never infer the
  count from the highest number (`ls supabase/migrations/*.sql | wc -l`).
  ⚠️⚠️ **AND `supabase/README.md`'s TABLE HAD NO ROW FOR `0040` FOR TWO DAYS — NOTHING CHECKS IT
  FOR COMPLETENESS.** `6a-ii-a` found it by listing the directory against the table, which is the
  same move that keeps the archive table above honest. **Both rows are written now, and every
  migration on disk has one.**
- **RLS is bypassed by the `postgres` superuser.** Any isolation check run as
  superuser passes vacuously. Test under `set role authenticated`.
- ⚠️⚠️ **A VIEW IS INVISIBLE TO THE RLS GUARD BY CONSTRUCTION** — `supabase/pgtap/01_rls_coverage.sql`
  joins `relkind = 'r'` — **and since `0041` one view in this schema is `security definer`**, so its
  `where` clause IS its policy and nothing in Postgres complains if it is missing. **Measured
  2026-09-27: SEVEN views in `public`, six `security_invoker = true` and `waste_reason_line` not**,
  and that count is the DATABASE's (`relkind = 'v'`) — a `grep` of the migrations answers fourteen
  because four were re-issued with `create or replace`. ⚠️ **ADR-035 §2.7 now keys the choice on
  WHERE the fence is** (columns → invoker; a ROW-level `has_role` → definer), and
  `supabase/tests/0041_waste_reason_line.sql` asserts `waste_reason_line` is the ONLY non-invoker
  one, so a second needs a ruling.
- ⚠️ **An RLS *UPDATE* refusal arrives as a 200 with zero rows**, not as a 403 — the row
  goes invisible rather than forbidden, and `.single()` is what surfaces it (PGRST116).
- **Never edit `graphify-out/`** — it is generated.

## Domain vocabulary

Spanish module names are the domain language, not a translation layer: Comprar
(buy), Vender (sell), Productos (catalog), Proveedores (providers), Desperdicio
(waste), Números (reports). `workspace` is the tenant; `location` is the store —
they are not the same thing, and conflating them is a one-way door (ADR-035 §2.3).

## Working agreement

One task per session, taken from `docs/PLAN.md`. **Estimate difficulty first and
write down what the estimate found** — that is the half that has repeatedly paid for
itself, and it is not the same thing as splitting. Update `docs/PLAN.md` when a task
closes.

⚠️⚠️ **AMENDED BY THE OWNER 2026-09-24 — AN `M` OR AN `L` IS ONE SITTING:** *"if a
task is M or L, let's do it at once, we have enough usage and space to do it."*
**`XL` still splits on size; `M` and `L` do not.** The old rule's stated reason was
*"so the work survives a context clear or a usage limit"* — a budget, and the budget
changed.

⚠️ **A split at `M` or `L` is now the exception and must name a reason that is NOT
size, in its own row:** (1) half the row is **gated** on a decision or an ADR
amendment the owner owes and the other half is not; (2) the row carries **two failure
classes** and one of them is invisible here — the ledger or the queue — so one row
would let the unseen half ride in on the back of the one a person can look at; or
(3) the plan's **deferral test** (both halves yes) separates look-questions that
cannot be answered yet. **Anything else is the old rule asking to come back.** The
full argument is in `docs/PLAN.md`'s `## Working agreement`.

**Merging is automated** (settled 2026-08-17, replacing the approval gate agreed
earlier the same day). Push the branch, open the PR, wait for CI, **read the job
log** — not the tick — and on green run `gh pr merge` without asking. This covers
migrations too; the owner took that trade knowing what it costs.

Two things did not change, and they are what the gate was really for:

- **Never merge red, and never merge on a green tick alone.** A tick is also what a
  silently skipped test step looks like. Confirm the checks by name in the log.
- **Report every decision made on the owner's behalf**, in the closing message of
  the session that made it and in the PR body. Removing the checkpoint removed the
  approval, not the obligation to say what was decided. It also made reversal
  dearer: a modelling choice questioned after the merge is a fix-forward migration,
  not an edit to an unmerged file. So flag the ones that are cheap now and expensive
  later — anything the seed will bake in — loudly and by name.

⚠️⚠️ **AND MERGING IS NOT DEPLOYING — THIS IS THE STEP THAT GETS DROPPED.** A migration
that merges green exists in CI's throwaway Postgres and nowhere else. **On 2026-09-25 two
merged migrations sat undeployed for a day** — the 2026-09-22 failure in miniature —
**and they were deployed that evening only because somebody ran the guard while editing a
document.**
So a session that merges a migration owes a `supabase db push` and a green
`docs/checks/5R-f-schema-deployed.sh` — or it owes the owner a sentence saying it did not
deploy and why.

Local database: `supabase start` then `supabase db reset`. Add
`-x realtime,storage-api,imgproxy,kong,mailpit,postgrest,postgres-meta,studio,edge-runtime,logflare,vector,supavisor`
to bring up only what a migration reset needs.

## graphify

This project has a knowledge graph at graphify-out/ over Markdown, SQL and shell, with
community structure and cross-file relationships. ⚠️ **Do not quote a node count from this
file** — it moves on every commit to `main`, it has been stale twice, and until 2026-09-25
this line said *"a thousand-odd nodes"* while the graph carried about three times that.
Read it from `graphify-out/graph.json` if it matters.

⚠️ **There are no god nodes and no semantic layer** — re-checked 2026-09-25:
`graphify-out/wiki/` still does not exist (the directory holds dated snapshots,
`graph.json`, `graph.html`, `GRAPH_REPORT.md` and a cache, and nothing else). Every node is
`_origin: ast`; the LLM extraction pass has never run because no `GEMINI_API_KEY` /
`GOOGLE_API_KEY` is set. Community *names* come from each cluster's hub node, not from a
model — `graphify label` would need a key. So treat the graph as a structural index, not a
summarised one: it reliably tells you **where** something is, and never tells you what it
means.

Rules:
- ⚠️⚠️ **`docs/plan/archive/` IS INDEXED; `archive/power-platform/` IS NOT.** The
  `.graphifyignore` rule is `/archive/` **with a leading slash** — without it, a bare
  `archive/` matches any directory of that name at any depth, and on 2026-09-19 it
  silently swallowed `docs/plan/archive/`, dropping ~9,200 lines of closed-but-true plan
  history out of the graph with nothing going red. An over-matching ignore rule produces
  a smaller graph, not an error. **A result's `src=` tells you which archive it came
  from — check it before citing anything as current.**
- ⚠️ **The graph is weak for "what did we DECIDE about X".** It is AST-only with no
  semantic layer, so it reliably finds *where* a file or symbol is and cannot tell you
  what a plan paragraph means. For decisions and rulings, search the corpus directly:
  `grep -n '<term>' "$(bash docs/checks/plan-corpus.sh)"`. Query the graph for code, SQL,
  scripts and file locations, where it is genuinely fast.
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost). Commits, merges and branch switches do this automatically on main/master via the git hooks; run it by hand for uncommitted work or on other branches.
- Every subagent prompt that involves code exploration must repeat these rules — subagents do not inherit them.
- **SQL IS indexed**: tables, functions, triggers, views and CTEs, each with a file
  and line.
- ⚠️ **`create policy` is still NOT indexed** — re-checked 2026-09-25: querying a policy
  name returns the falsifier that mutates it and the README section that describes the
  shape, never the policy. On this project that is the gap that matters: **41 policies** are
  the subject of most current work, and names like `sale_line_select` or `provider_update`
  resolve to nothing. **For RLS policy questions, read `supabase/migrations/**` directly, or
  ask the database.** ⚠️⚠️ **AND GREP CASE-INSENSITIVELY: all 41 are written lower-case, so
  `grep -rn 'CREATE POLICY' supabase/migrations/` returns ZERO** — a silent, confident
  *there are no policies here*. Everything else in SQL, query first.
