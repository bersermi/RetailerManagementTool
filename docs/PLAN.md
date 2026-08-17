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

Step 0 is complete locally. Step 1 is underway — task 1.1 done, 1.2 next.

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
§9 the local pass is not the bar — the green CI run is.** Not yet confirmed.

---

## Step 1 — migrations and seed script ⬅ next

Nineteen tables total (ADR-035 §2.3). `0001` delivered six; thirteen remain, plus
a seed. Migration numbering is fixed in [`supabase/README.md`](../supabase/README.md).

| # | Task | Size | Done when |
|---|------|------|-----------|
| ~~1.1~~ | ~~`0002` catalog~~ — **done** 2026-08-16. `db reset` green; zero cross-workspace leakage on all five tables under `set role authenticated`; generic provider undeletable and undemotable; price overlap, cross-dimension units and normalized-name duplicates all rejected | M | ✅ |
| 1.2 | `0003` transactions — `purchase`/`sale`/`waste` + line tables, all carrying `location_id` and `payload_hash` | M | `db reset` green; reversal self-FK and client-id idempotency hold |
| 1.3 | `0004` inventory — `stock_batch`, `stock_movement` (append-only), `batch_balance` + projection trigger, partial index per location | **L** | The §2.4 invariant holds on a hand-built fixture |
| 1.4 | Purchase-price view — last `purchase_line` per `(provider, variant)` | S | A voided delivery stops prefilling its price |
| 1.5 | Seed skeleton — two locations, ~300 products, mixed units, mixed tax, packs and weighed items | M | `db reset` runs `seed.sql` clean |
| 1.6 | Seed the ledger — three months of purchases, sales, waste, transfers, reversals | **L** | Invariant holds across every batch |
| 1.7 | Assert the invariant in CI | S | CI green with seed + invariant check |

Order is forced by foreign keys: 1.1 → 1.2 → 1.3; 1.4 after 1.2; 1.6 after 1.3 + 1.5.

### Traps in step 1

- **1.3 is the biggest piece.** `stock_movement` is the system of record;
  `batch_balance` is a disposable projection rebuildable from it. The transfer
  movement shape is fixed here even though the screen ships at step 6 — getting it
  wrong is the same class of error as omitting `location_id` (ADR-035 §2.4).
- **1.4 is small and easy to get wrong.** The view must exclude **both** reversal
  documents **and** the documents they reverse, or a voided delivery keeps
  prefilling forever.
- **No price fallback across providers.** A price learned from one provider never
  prefills another's. That is a fact about a relationship, not about a product.

### Open decision — blocks 1.6

The seed must write purchases, sales, waste, transfers and reversals. The RPCs that
do that are `0005`, which ADR-035 §3 places at **step 4** — three steps later. So
the seed writes the ledger directly and needs its own FEFO allocation.

The risk: step 2 is the design gate, where the schema is judged on whether
margin-by-product survives reversals, unit conversion and a location rollup. If the
seed allocates differently from how `record_sale` eventually will, the gate passes
on data the real system never produces.

| Option | Trade |
|--------|-------|
| **A. Pull the allocator into `0004`** — one `security definer` function, called by both the seed and the later RPCs | Reorders the ADR slightly; one implementation, no divergence. **Recommended** |
| B. Seed allocates naively | Fastest; risks validating the gate on fiction, since margin needs cost attribution |
| C. Move the seed after step 4 | Follows the ADR's letter; delays the design gate, which the ADR most wants early |

**Unresolved.** Decide before starting 1.6.

---

## Working agreement

One task per session. Before starting, estimate difficulty; if it is large, split it
here first so the work survives a usage limit or a context clear. Update this file
when a task closes — a plan that lags the code is the failure ADR-035 §9 names.

Every schema claim must be traceable to a migration CI has applied. A file is not
evidence; a green CI run is.
