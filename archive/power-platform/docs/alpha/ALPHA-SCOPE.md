# Alpha Milestone — Tienda App Scope

**Date:** 2026-04-21  
**Status:** In progress — Comprar (V1) complete, 6 modules remaining  
**Platform:** Power Apps Canvas + Dataverse  
**Audience:** AI-first multidisciplinary team (economists, developers, analysts)

---

## What Alpha Means Here

Alpha = a complete, working app for a single retail operator workspace (15–20 users). Every module is functional end-to-end. No polish required. No analytics dashboards. No automated flows. The bar is: a user can walk in, open the app, and record a real business transaction without assistance.

---

## Module Map

| # | Module | Screen | Status | Priority |
|---|--------|--------|--------|----------|
| 1 | **Comprar** | scrComprar | ✅ DONE | Critical path |
| 2 | **Vender** | scrVender | 🔲 Next | Critical path |
| 3 | **Productos** | scrProductos | 🔲 | Needed before Vender |
| 4 | **Proveedores** | scrProveedores | 🔲 | Needed before Comprar test |
| 5 | **Desperdicio** | scrDesperdicio | 🔲 | Standalone |
| 6 | **Numeros** | scrNumeros | 🔲 | Standalone |
| 7 | **Opciones** | scrOpciones | 🔲 | Needed for Vender (price toggle) |

---

## Module Descriptions

### 1. Comprar (Purchase Entry) — ✅ DONE

Provider context bar (persistent, selectable) → Catalog gallery → Cart accumulation → Pay slider commit.

**Writes:** Purchase (header) → PurchaseLine × N → StockBatch × N  
**Reads:** Providers, ProductVariants, (ProviderProductPrice for future price caching)  
**Key pattern:** catalog+cart; quantity stepper per item; single OnPayComplete transaction

---

### 2. Vender (Sales Entry)

Same catalog+cart pattern as Comprar — no provider context bar. User browses workspace product catalog, adds items to cart, confirms sale.

**Writes:** Sale (header) → SaleLine × N  
**Reads:** ProductVariants  
**Key behavior:** If `UseLastSellUnitPrice` toggle is ON (from Opciones), update `ProductVariant.LastSellUnitPrice` after each sale line.  
**No stock validation.** Record the transaction regardless of current stock level.  
**Dependency:** Opciones must expose the `UseLastSellUnitPrice` toggle before Vender is fully tested.

---

### 3. Productos (Product Management)

CRUD for product catalog. Two levels: ProductFamily (category grouping) and ProductVariant (SKU-level item with price, unit, active flag).

**Writes:** ProductFamily, ProductVariant  
**Key behavior:**
- List view — filter by family, show IsActive toggle per item
- Detail/edit view — name, unit, last sell price, active flag
- Create variant — must assign to a family

**Dependency:** Must exist before Vender can be meaningfully tested with real catalog.

---

### 4. Proveedores (Provider Management)

CRUD for providers. Single-level entity.

**Writes:** Provider  
**Key behavior:**
- List view — show name, normalized name, active status
- Detail/edit view — name, contact info (optional at alpha), active toggle
- Create provider

**Dependency:** Must exist so Comprar can be tested with real providers vs seed data.

---

### 5. Desperdicio (Waste Recording)

Records waste events. Two flows: (a) immediate waste (item expired/damaged now), (b) expiry schedule (set a future expiry date on a stock batch for proactive tracking).

**Writes:** WasteEvent (or similar)  
**Reads:** ProductVariants, StockBatches  
**Key behavior:**
- Select product → enter qty wasted → record reason (expired, damaged, other)
- Expiry schedule: select batch → set expiry date → system flags when date passes
- Business intel goal: show waste trends per product so operator can order smaller quantities

**Standalone** — no blocking dependencies.

---

### 6. Numeros (Simple Analytics)

Lightweight summary view for the app user. Not a full analytical suite. Answers three questions: How much did I sell? How much did I buy? How much did I waste? — in a given time range.

**Reads:** Sales, Purchases, WasteEvents (aggregated)  
**Key behavior:**
- Date range picker (this week / this month / custom)
- Three KPI cards: Total Sales, Total Purchases, Total Waste
- Per-product breakdown table (optional at alpha)

**Standalone** — pure read, no writes.

---

### 7. Opciones (User Settings)

User-facing settings panel. Manages workspace-level toggles stored in WorkspaceSetting table.

**Writes:** WorkspaceSetting  
**Key behavior:**
- `UseLastSellUnitPrice` toggle — when ON, Vender updates `ProductVariant.LastSellUnitPrice` after each sale
- Future: notification preferences, display preferences

**Dependency:** Vender reads this toggle at screen load. Must be settable before Vender is fully correct.

---

## Inter-Module Dependency Graph

```
Opciones ──────────────────────────────────► Vender
                                              ▲
Productos ────────────────────────────────────┤
                                              │
Proveedores ──────────────► Comprar ──────────┤
                                              │
Desperdicio ──────── (standalone) ────────────┤
                                              │
Numeros ──────────── (standalone, reads all) ─┘
```

**Build order recommendation:**
1. Opciones (unblocks Vender)
2. Proveedores (unblocks real Comprar testing)
3. Productos (unblocks Vender + Comprar catalog validation)
4. Vender
5. Desperdicio
6. Numeros

---

## Alpha Exit Criteria

- [ ] All 7 screens navigable from scrHome without errors
- [ ] Comprar: full purchase recorded to Dataverse (Purchase + PurchaseLines + StockBatches)
- [ ] Vender: full sale recorded to Dataverse (Sale + SaleLines)
- [ ] Productos: create a new ProductVariant from within the app
- [ ] Proveedores: create a new Provider from within the app
- [ ] Desperdicio: record a waste event
- [ ] Numeros: view total sales + purchases for current month
- [ ] Opciones: toggle UseLastSellUnitPrice and verify Vender behavior changes
- [ ] All screens workspace-scoped (no data leakage between workspaces)
- [ ] End-to-end flow: add product → buy it → sell it → view in Numeros

---

## Out of Scope for Alpha

- Power Automate flows (notifications, scheduled reports)
- Multi-workspace admin view
- User role management
- Offline mode
- Export / reporting beyond Numeros basic view
- React Native / Supabase migration (tracked separately in `docs/migration/`)