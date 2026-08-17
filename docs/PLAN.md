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

Step 0 is complete locally. Step 1 is underway — tasks 1.1 and 1.2 done, 1.3a next.
Both open decisions in this file were resolved 2026-08-17; none is outstanding.

| Step | What | Status |
|------|------|--------|
| 0 | A Postgres you can actually run | **Done** — CI unverified |
| 1 | Migrations and seed script | **Next** |
| 2 | The three Insight queries — *the design gate* | Not started |
| 3 | Test suites (pgTAP, Vitest) | Not started |
| 4 | RPCs — the ten functions of §2.6 | Not started |
| 4.5 | The failure path | Not started |
| 5a | Client foundation — **hiring gate** | Not started |
| 5b | Vender and Home | Not started |
| 6 | Comprar, Desperdicio, Catálogo, Proveedores | Not started |
| 7 | Números | Not started |

Steps 0–4.5 are the whole system; 5–7 are windows onto it (ADR-035 §3).

---

## Step 0 — a Postgres you can actually run ✅

OrbStack + Supabase CLI 2.114.0. `supabase db reset` applies `0001` clean.
All six confirmations in [`supabase/README.md`](../supabase/README.md) pass,
including RLS isolation run under `set role authenticated` — the `postgres`
superuser bypasses RLS and would pass vacuously.

CI gate: [`.github/workflows/db.yml`](../.github/workflows/db.yml). **Per ADR-035
§9 the local pass is not the bar — the green CI run is.** Not yet confirmed: the
workflow has never run, on any migration. As of 1.2 it also runs every file in
`supabase/tests/` after the reset, so it asserts behaviour and not just that the DDL
parses — but an unrun gate is not evidence, and step 0 stays open until it is green
on a pull request.

---

## Step 1 — migrations and seed script ⬅ next

Nineteen tables total (ADR-035 §2.3). `0001` delivered six; thirteen remain, plus
a seed. Migration numbering is fixed in [`supabase/README.md`](../supabase/README.md).

| # | Task | Size | Done when |
|---|------|------|-----------|
| ~~1.1~~ | ~~`0002` catalog~~ — **done** 2026-08-16. `db reset` green; zero cross-workspace leakage on all five tables under `set role authenticated`; generic provider undeletable and undemotable; price overlap, cross-dimension units and normalized-name duplicates all rejected | M | ✅ |
| ~~1.2~~ | ~~`0003` transactions~~ — **done** 2026-08-17. `db reset` green; 39 behavioural checks pass in `supabase/tests/0003_transactions.sql`, now wired into the CI gate. Reversal self-FK rejects a void across a store or a tenant, a self-reversal and a second void of the same document; `on conflict (id) do nothing` leaves the committed totals alone; documents are append-only even to the superuser; staff read no cost; `waste_reason` is a closed vocabulary | M | ✅ |
| 1.3a | `0004` inventory — `stock_batch`, `stock_movement` (append-only), `batch_balance` + projection trigger, partial index per location, RLS, grants | M | `db reset` green; the §2.4 invariant holds on a hand-built fixture including a reversal; `batch_balance` rebuilt from `stock_movement` alone reproduces every row exactly |
| 1.3b | `0005` allocation — `allocate_fefo()` and the transfer movement shape | M | FEFO order proven (expiry asc, `received_at` as tiebreak, NULL expiry last); allocation is location-scoped; two concurrent allocations cannot oversell one batch; a transfer carries cost and expiry forward and never updates `stock_batch.location_id` |
| 1.4 | `0008` purchase-price view — last `purchase_line` per `(provider, variant)` | S | A voided delivery stops prefilling its price; `explain` confirms the two-index plan (see below) |
| 1.5 | Seed skeleton — two locations, ~300 products, mixed units, mixed tax, packs and weighed items | M | `db reset` runs `seed.sql` clean |
| 1.6 | Seed the ledger — three months of purchases, sales, waste, transfers, reversals, all allocated through `allocate_fefo()` | **L** | Invariant holds across every batch |
| 1.7 | Assert the invariant in CI | S | CI green with seed + invariant check |

Order is forced by foreign keys: 1.1 → 1.2 → 1.3a → 1.3b; 1.4 after 1.2; 1.6 after
1.3b + 1.5.

**1.3 was split on 2026-08-17.** It was the one **L** task in the schema half of
step 1, and it grew a second time when the allocator moved into it (decision below).
The split is by migration file, so each half is separately reviewable and separately
verified — which is the same reason every migration header in this repo starts by
narrowing its own scope.

### Traps in step 1

- **1.3a and 1.3b are the biggest piece.** `stock_movement` is the system of record;
  `batch_balance` is a disposable projection rebuildable from it. The transfer
  movement shape is fixed in 1.3b even though the screen ships at step 6 — getting it
  wrong is the same class of error as omitting `location_id` (ADR-035 §2.4).
- **1.4 is small and easy to get wrong.** The view must exclude **both** reversal
  documents **and** the documents they reverse, or a voided delivery keeps
  prefilling forever.
- **No price fallback across providers.** A price learned from one provider never
  prefills another's. That is a fact about a relationship, not about a product.

### Settled in 1.2, and binding on what comes after

- **A document is reversed at most once**, by a partial unique index on
  `reversal_of`. `void_transaction` (0006) must therefore treat a double tap as an
  idempotent no-op and not as a second compensating document.
- **Documents are append-only, enforced by trigger** on all six tables, not only by
  the missing grant. Every RPC in 0006 is `security definer` and so is outside RLS
  and grants; the trigger is what stops one of them "correcting" a committed sale.
  If an RPC ever needs to update a document, that is a design error to raise, not a
  trigger to drop.
- **`purchase`, `purchase_line` and `waste_line` are manager-only reads**, per
  ADR-035 §2.7. The staff-facing `security_invoker` views without the cost columns
  are owed by whichever screen needs them first — Comprar and Desperdicio, step 6.
- **`tax_rate` is snapshotted on every line.** Reports never re-derive tax from the
  variant's current rate, so correcting a product does not restate last quarter.
- **The purchase-price index in ADR-035 §2.3 is not creatable as written.**
  `(workspace_id, provider_id, variant_id, occurred_at desc)` spans two tables —
  `provider_id` and `occurred_at` are on the header, `variant_id` is on the line.
  `0003` ships the two-index equivalent instead; **1.4 must confirm it against a real
  `explain`** rather than assume it. Denormalising the header columns onto the line
  was rejected: it buys an index and sells the guarantee that they agree.

### Decided 2026-08-17 — the waste vocabulary

`waste_line.reason` is a Postgres enum, `public.waste_reason`, shipped in `0003`:

    caducado · dañado · merma de preparación · robo o faltante · error de captura

Free text does not survive contact with the analytics asset — three cashiers spell
*caducado* four ways and "why are we losing stock" becomes worthless. The enum is
global rather than a per-workspace reference table, because comparing loss causes
across shops is the point of the asset and a list each shop edits makes that
comparison meaningless.

`robo o faltante` is deliberately **one** value: a count cannot tell theft from a
miscount, and asking the operator to choose produces a fiction that reads as data.

Adding a value later is a one-line migration; removing one is not. The list is short
on purpose, and each entry names a cause an owner would act on differently. The
owner's call, 2026-08-17: adequate, and changeable either way in future.

### Decided 2026-08-17 — the seed's FEFO allocation (was: blocks 1.6)

**Option A. One allocator, `allocate_fefo()`, owned by the ledger.** It lands in
`0005` — its own migration rather than inside `0004`, so each half of the old 1.3
stays reviewable — and both the seed (1.6) and `record_sale` / `record_waste` /
`record_transfer` (0006) call it. Nothing allocates stock by hand, anywhere.

The alternatives and why they lose:

| Option | Trade |
|--------|-------|
| **A. One allocator in `0005`**, called by the seed and later by the RPCs | Inserts a migration and shifts `0005`–`0007` down by one. One implementation, no divergence. **Chosen** |
| B. Seed allocates naively | Fastest; validates the design gate on fiction, since margin is cost attribution and cost attribution *is* the allocation |
| C. Move the seed after step 4 | Follows the ADR's letter; delays the design gate, which the ADR most wants early |

The deciding argument is step 2. It is the design gate, and it turns on whether
margin-by-product survives reversals, unit conversion and a location rollup. Margin
is produced by which batches a sale consumed — so if the seed picks batches
differently from `record_sale`, the gate passes on data the real system never
produces, and the schema is judged on a fiction in exactly the week the ADR wanted it
judged honestly.

This is also the reading most faithful to the ADR rather than least: ADR-035 §2.4
already fixes the *transfer movement shape* in the ledger migration even though the
screen ships at step 6, on the grounds that ledger mechanics belong with the ledger.
FEFO allocation is the same kind of thing. What stays in `0006` is what genuinely
belongs to the RPCs — location validation, the tax split, idempotency, the dormant
availability check.

**Cost, recorded honestly:** `0005`–`0007` shift down by one, and `0002` — already
applied, therefore not edited — still calls the RPC migration `0005` in two comments.
[`supabase/README.md`](../supabase/README.md) is the authority on numbering.

---

## Working agreement

One task per session. Before starting, estimate difficulty; if it is large, split it
here first so the work survives a usage limit or a context clear. Update this file
when a task closes — a plan that lags the code is the failure ADR-035 §9 names.

Every schema claim must be traceable to a migration CI has applied. A file is not
evidence; a green CI run is.
