# Migration Brief — Power Platform → React Native + Supabase

**Date:** 2026-04-21  
**Status:** Flag planted — revisit after alpha ships  
**Decision:** Adopt React Native (Expo) + Supabase as the post-alpha target stack  
**Audience:** AI-first multidisciplinary team

---

## Why This Matters Now (Even Though We're Not Migrating Yet)

The Power Platform alpha exists to prove the business logic and data model. The migration target shapes *how* we build the alpha — naming conventions, FK patterns, and data architecture that translate cleanly rather than requiring a redesign.

Plant the flag early. Build the alpha to be migration-forward.

---

## Target Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Mobile client | React Native (Expo) | iOS + Android from one codebase; large ecosystem; strong AI tooling |
| Backend / DB | Supabase (PostgreSQL) | Open source; RLS maps directly to workspace scoping; REST + realtime; self-hostable |
| Auth | Supabase Auth | Built-in; maps to current User/WorkspaceMember model |
| File storage | Supabase Storage | Product photos, receipts |
| Offline | TanStack Query + MMKV | Cache-first; retry on reconnect |

---

## Mapping: Power Platform → Target Stack

### Data Layer

| Power Platform | Supabase |
|----------------|---------|
| Dataverse table | PostgreSQL table |
| Workspace FK filter (every query) | Row-Level Security (RLS) policy on workspace_id |
| gblWorkspaceId | JWT claim `workspace_id` (set at login) |
| Patch() | `supabase.from('table').upsert({...})` |
| LookUp() | `.select('*, related_table(*)').eq('id', id)` |
| Filter(..., Workspace = x) | Automatic via RLS — no explicit filter needed |
| Choice field (PurchaseStatus) | `CHECK` constraint or enum type |
| Polymorphic owner (Organization) | Removed — ownership via workspace RLS |

### Application Logic

| Canvas App Pattern | React Native Equivalent |
|-------------------|------------------------|
| `colCatalogLines` (AddColumns) | Derived state via `useMemo` or Zustand selector |
| `colCartLines` (Filter view) | Same — `cart.filter(l => l.qty > 0)` |
| `ForAll(... As alias)` | `Promise.all(items.map(async item => {...}))` |
| Nested `With()` for sequential Patch | `await` chain: `const a = await patchA(); const b = await patchB(a.id)` |
| `gblWorkspace` cached record | Auth context / Zustand global store |
| `varCartBusy` | Loading state in Zustand or React Query mutation |
| Screen OnVisible | `useFocusEffect` (React Navigation) |
| App.OnStart | App-level auth/bootstrap effect |

### Component Architecture

| Component | React Native Equivalent |
|-----------|------------------------|
| `cmpGalleryCatalog` | `FlatList` with `CatalogRow` component |
| `cmpCartBottomBar` | Sticky bottom sheet (`@gorhom/bottom-sheet`) |
| `cmpQtyStepper` | Inline `StepperControl` component |
| Navigation (Navigate()) | React Navigation stack/tabs |

---

## Schema Design Principles (Migration-Forward)

Follow these in the Power Platform alpha so migration is a schema copy, not a redesign:

1. **Workspace as RLS boundary** — every table has `workspace_id` FK, no exceptions. In PostgreSQL this becomes a RLS policy: `USING (workspace_id = auth.jwt()->'workspace_id')`.

2. **Avoid polymorphic FKs** — the `Owner` polymorphic field in Dataverse caused pain. In Supabase, ownership is implicit via RLS. Remove it.

3. **Normalize choice fields early** — `PurchaseStatus` as an enum in Dataverse becomes a PostgreSQL enum or a lookup table. Decide names now, they carry over.

4. **Logical names = column names** — `crbc0_` prefixes are a Dataverse artifact. In PostgreSQL: `purchase_id`, `unit_price`, `quantity_received`. Document the mapping (done in TECHNICAL-REFERENCE.md).

5. **Transactions map directly** — `ForAll` with nested Patches = `BEGIN / INSERT / INSERT / COMMIT`. The data model is already relational; no restructuring needed.

---

## Migration Phases (Rough)

| Phase | Deliverable | When |
|-------|------------|------|
| 0 — Alpha | Complete Power Platform app, all 7 modules | Current |
| 1 — Schema port | PostgreSQL schema from Dataverse, RLS policies | After alpha exits |
| 2 — API layer | Supabase client in Expo, auth working | ~2 sprints |
| 3 — Screen by screen | Port each module, starting with Comprar + Vender | Rolling |
| 4 — Parallel run | Both apps live on same Supabase backend | Validation |
| 5 — Cutover | Deprecate Canvas App | When React Native parity confirmed |

---

## Things to Decide Before Migration Starts

- [ ] Android-first or iOS-first launch priority?
- [ ] Self-hosted Supabase vs Supabase Cloud?
- [ ] Offline-first requirement depth (full sync or just read cache)?
- [ ] Do we keep the component library pattern or adopt a design system (e.g., Tamagui, NativeBase)?
- [ ] State management: Zustand vs React Query vs TanStack Start?

---

## What the Alpha Buys Us

- **Validated data model** — every table, every FK, every edge case exercised by real operators
- **Business logic in formulas** — OnPayComplete, OnQtyChange, etc. are the spec for React hooks
- **UX patterns proven** — catalog+cart, provider context bar, pay slider commit — all battle-tested
- **Migration is a rewrite of the UI layer only** — data model and business rules are stable

The alpha is not throwaway work. It is the functional specification for the React Native app.