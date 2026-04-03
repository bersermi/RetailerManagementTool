
# Power Platform Catalog System – Architecture Summary
*(Dataverse-backed, Component-driven, Screen-Owned State)*

---

## 1. Project Context

We are building a **Dataverse-backed catalog and transaction system** in Power Platform for small store owners.

The application handles:

- Providers
- Product / Product Variants
- Units
- Purchases
- Sales
- Inventory / Stock
- Waste
- Reporting

The backend (Dataverse schema) is the **single source of truth**, and the frontend (Canvas app) follows a **view-model normalization pattern** to keep UI flexible and reusable.

Scalability and maintainability are primary goals.

---

## 2. Architectural Principles

### A. Backend‑First Design (Dataverse‑Centric)

Dataverse contains:

- Product
- ProductVariant
- Unit (with `AllowStepper`)
- Workspace
- *(Future)* Cart / CartLine entities

The UI:

- Does not assume direct schema usage
- Consumes normalized collections
- Treats Dataverse as authoritative storage

---

### B. Screen Owns State, Components Emit Events

Due to Power Apps limitations:

- Canvas Components cannot be children of Gallery (PA2122)
- Component events cannot reliably pass Record parameters
- Components should not Patch Dataverse directly

Therefore we use the pattern:

Component → Emits primitive events (Key, NewQty)  
Screen → Updates local collection  
Screen → Later persists to Dataverse

Benefits:

- Reusable components
- Centralized data writes
- Predictable behavior
- Backend integrity preserved

---

### C. Normalized View Model Pattern

Every gallery consumes a screen collection like:

`colCatalogLines`

Unified schema:

| Field | Purpose |
|------|--------|
| Key (Text) | Unique row identifier |
| PrimaryText | Product Name |
| SecondaryText | Subtitle / Provider / Description |
| UnitText | Unit name |
| Qty | Selected quantity |
| AllowStepper | From Unit.AllowStepper |
| Step | Increment step |
| MinQty | Minimum allowed |
| Disabled | Row state |
| Optional | Price, StockAvailable, Photo |

Benefits:

- Same UI component used for purchase, sell, cart, history
- Different data sources mapped to the same contract

---

## 3. `cmpGalleryCatalog` Component

### Responsibilities

Render:

- Primary text (dynamic sizing)
- Secondary text
- Unit label
- Quick actions icon
- Quantity stepper (icons + input)

Emit events:

- `OnSelectItem(Key)`
- `OnQuickActions(Key)`
- `OnQtyChange(Key, NewQty)`

Component **does not**:

- Patch Dataverse
- Own application state

---

### Stepper Design

Stepper consists of:

- `icoGalMinus`
- `txtQty`
- `icoGalPlus`

Rules:

- Always visible
- Enabled/disabled using:

```
ThisItem.Disabled
ThisItem.AllowStepper
ThisItem.MinQty
```

Manual entry allowed.  
All changes emit `OnQtyChange`.

---

## 4. Important Bug and Solution

### Problem

Clicking the second row updated the first row.

### Cause

```
LookUp(colCatalogLines, Key = Key)
```

Ambiguous scope: record `Key` vs event parameter `Key`.

### Solution

```
With(
    { k: Key, q: NewQty },
    Patch(
        colCatalogLines,
        LookUp(colCatalogLines, Key = k),
        { Qty: q }
    )
)
```

This forces Power Fx to use the event parameter instead of the record field.

---

## 5. Quick Actions Architecture

Schema:

```
Table(
  { ActionKey, Label, IconName, IsEnabled, IsActive }
)
```

Component emits:

`OnQuickActions(Key)`

Screen handles logic:

```
Switch(ActionKey, ...)
```

This allows:

- Context-aware actions
- Dynamic enable/disable
- Easy extension later

---

## 6. Backend Integration Strategy

### During User Interaction

Only update the screen collection (`colCatalogLines`).

Advantages:

- Instant UI response
- No Dataverse latency
- No partial transactions

---

### When Completing Transaction

Persist to Dataverse:

1. Create Cart record
2. Create CartLine records
3. Apply stock or purchase updates
4. Commit transaction

---

## 7. Unit System Strategy

Unit table contains:

- Name
- AllowStepper (Yes/No)
- *(Recommended)* StepSize
- *(Recommended)* AllowDecimal

UI behavior derives from Unit metadata rather than hardcoded logic.

Benefits:

- Adding units requires no UI changes
- Behavior controlled in backend

---

## 8. UX Decisions

- RowHeight = 100
- Two‑line primary text block
- Quick actions top‑right
- Stepper + unit bottom‑right
- Icons instead of buttons
- Minimum touch target 40x40

---

## 9. Current Stable Elements

- cmpGalleryCatalog geometry
- Stepper behavior
- Scope-safe patch logic
- Quick actions structure
- Screen-owned state model
- Backend-first architecture

---

## 10. Next Development Targets

Possible directions:

1. Additional gallery variations (Sell vs Purchase vs Cart)
2. Docked cart synchronization
3. Dataverse Cart + CartLine entities
4. Inventory integration (stock limits)
5. Performance tuning and UX improvements

---

## 11. Core Architectural Philosophy

Backend‑Driven, View‑Model Normalized, Event‑Driven UI.

- Dataverse → Source of truth
- Screen collections → UI state
- Components → Stateless renderers
- Transactions → Explicit and controlled

This architecture keeps the system scalable and maintainable.