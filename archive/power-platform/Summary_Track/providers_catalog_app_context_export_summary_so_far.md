# Providers Catalog App (Power Platform / Dataverse)

This document summarizes the project state so far so a new chat can continue without losing context. It **excludes the component currently under active development** (the docked cart / expandable cart component).

---

## 1) Project goal
Build a simple, scalable Power Apps Canvas app (Dataverse backend) for small retail operations that:
- Manage **Providers** (suppliers)
- Maintain a **provider-specific catalog** of products
- Register **Purchases** → feed **Stock**
- Register **Sales** using a fast “basket/cart” flow
- Manage **Waste / Expiry** (batch-level expiration)
- Support quick operational decisions (out-of-stock now, classify later)
- Support analytics/dashboards later

App is meant for non-technical users; minimal taps; consistent UI across modules.

---

## 2) Multi-tenant model decision
We chose **Option B**:
- Single environment, multi-tenant within Dataverse
- All business data is partitioned by **Workspace** (one Workspace = one store/business instance)
- Users belong to workspaces via **WorkspaceMember**

Dataverse note: the first column of any table is the **Primary Name** (Text) and cannot be a lookup.

---

## 3) Dataverse schema (high-level)
### Core partitioning
- **Workspace**
- **WorkspaceMember**
  - Lookups: Workspace, System User
  - Alternate key recommended: (Workspace, User)

### Providers and catalogs
- **Provider** (Workspace-scoped)
  - Includes location/contact fields (AddressLine1, City, Neighborhood, etc.; extensible)
  - Name uses the Primary Name field; do not create a second “Name” column
- **ProviderCatalogItem**
  - Join: Provider ↔ ProductVariant
  - Alternate key recommended: (Workspace, Provider, ProductVariant)

### Units
- **Unit** (Workspace-scoped)
- **UserUnitPreference**

### Products
- **ProductFamily** (e.g., “Beans”)
- **ProductVariant** (sellable/buyable item; e.g., “Beans – Black”)
  - One unit per variant (simple model)
  - Optional flexible attributes via **ProductVariantAttribute**

### Transactions
- **Purchase** (header)
- **PurchaseLine** (lines)
- **StockBatch** (created on Purchase Completed)
  - batch-level QtyReceived/QtyRemaining
  - ExpiryDate derived from lifespan or manual entry

- **Sale** (header)
- **SaleLine** (lines)
  - On sale completion, stock is decremented FIFO
  - Update ProductVariant.LastSellUnitPrice

### Inventory events (operational + corrections)
- **InventoryEvent**
  - Used for “pending classification” workflows (out-of-stock now, classify later)
  - Can represent adjustments (expired/lost/took home/miscount/etc.)

### Waste module (recommended UX)
- **Waste** (header)
- **WasteLine** (lines)
  - Completing Waste creates finalized InventoryEvents which decrement batches

### Suggestions (optional intelligence control)
- **Suggestion**
- **SuggestionSetting**

#### Search-first UX + duplicate prevention
For Provider/Unit/ProductFamily/ProductVariant:
- `DisplayName` (optional)
- `NormalizedName` (text)
- Alternate keys recommended: (Workspace, NormalizedName)

---

## 4) Operational logic (flows overview)
Power Automate flows (minimal engine):
1) **Normalize names** on create/update (Provider/Unit/ProductFamily/ProductVariant)
2) **Purchase Completed → StockBatch creation**
   - compute unit price / line total if one missing
   - create batches
   - set expiry date if lifespan exists or manual expiry entered
3) **Sale Completed → FIFO decrement + shortage event + last sell price update**
4) **InventoryEvent Finalized → apply stock change**
   - if batch specified: decrement that batch
   - else FIFO across batches
   - if Expired with batch: generate Suggestion for lifespan
5) **Waste Completed → create InventoryEvents** (if Waste header/lines implemented)

Note: “Cancelled edits” are future-ready but not implemented in UI; corrections are done via InventoryEvents.

---

## 5) App architecture decisions
### Modules (Home → module screens)
- Inventory
- Sell
- Providers/Buy
- Waste
- Settings
- Dashboards (later)

### Layout and navigation
- Top-left reserved for back button
- Top-right uses a **Flyout menu** (not bottom navigation)
- Use overlay patterns for confirmations/details; postponed the generalized modal design because variability is high

### Performance/cost principles
- Keep connectors minimal (Dataverse-centric)
- Screen owns state; components render + emit events

---

## 6) Component library: completed/active components
### Built/working
1) **cmpHeader**
   - Back button + title + menu button
   - In component, avoid `Parent.Width` for root sizing; use a fixed default Width for design-time (e.g., 360) and set instance width to Parent.Width on screens

2) **cmpFlyoutMenu**
   - Right-side slide-in menu
   - Uses a gallery with items table: `ItemKey`, `ItemLabel`, `Badge`
   - The “current screen” indicator is driven by screen-owned `varActiveMenuKey` passed via `SelectedKey`

3) **cmpQtyStepper**
   - Plus/minus buttons
   - Supports optional formatting with trailing “.0” when decimals disabled
   - Dynamic label font size based on `Len(Self.Text)`

4) **cmpMoneyInput**
   - Text input + currency label
   - No unsupported functions (no `Rept`)
   - Optional right-aligned numeric entry + font size reduction based on length

5) **cmpToast**
   - Implemented with the rule: component root width/height are numeric defaults; screen instance sets width/height to fill screen

6) **cmpQuickActions** (list UI)
   - Vertical actions list (gallery)
   - Items schema: `ActionKey`, `Label`, `IconName`, `IsEnabled`, `IsActive`
   - Uses output key + event pattern (screen handles logic)

7) **cmpQuickActionsSheet** (overlay wrapper)
   - Built as **independent** component (cannot nest components in this environment)
   - Provides scrim + panel
   - Responsive behavior:
     - **Phone** (Min(width,height) < breakpoint): bottom sheet
     - **Larger screens**: right-side panel
   - Breakpoint recommendation: use `Min(Width,Height) < PhoneBreakpoint` (robust for landscape phones)

### Removed
- `cmpSearchbar` was removed in favor of using default Text Input with built-in clear functionality.

---

## 7) Navigation: final mechanism that works (fix for “one click behind”)
The flyout menu initially had “selection lag” where the indicator updated but navigation lagged. The fix:
- Do **not** rely on `galMenu.Selected.ItemKey` timing.
- Use **parameterized event** to pass the clicked key directly.

### Pattern
- In component gallery: `OnSelect = OnSelectItem(ThisItem.ItemKey)`
- On screen: `OnSelectItem(ItemKey)` uses `Switch(ItemKey, ...)` to navigate

### Required screen variables
- `varMenuOpen` (Boolean)
- `varActiveMenuKey` (Text)
- `colMenu` collection created in App.OnStart

### Important tap forwarding
In the gallery template, set `OnSelect = Select(Parent)` on labels/rectangles/icons so taps always trigger the gallery selection and the event.

---

## 8) Environment constraints discovered
These constraints matter for implementation decisions:
- Locale uses **commas** in Power Fx argument separation.
- `UpdateContext()` is recognized but **not supported** inside components.
- `Rept()` is **not available**.
- `AbsoluteX/AbsoluteY` are **not available**.
- Gallery does not expose `ScrollTop`.
- In this environment, **components cannot be nested inside other components** (so overlay components must be self-contained).

These constraints drove:
- Parameterized events to avoid selection timing issues
- Bottom-sheet/right-panel overlays rather than anchored popovers

---

## 9) Standard screen state variables used so far
- `varMenuOpen` (flyout open/close)
- `varActiveMenuKey` (highlight in menu)
- Quick actions sheet:
  - `varQAOpen`, `varQAItem`

---

## 10) What is next (high level)
- Assemble module screens using the existing shell (header + flyout)
- Build screen-level collections for cart/purchase/waste draft items
- Implement “complete” flows to create Sale/Purchase/Waste records and mark Completed
- Add core views for Inventory (available, expiring soon, pending events)

*(The docked cart / expandable cart overlay component is the current in-progress work and is intentionally excluded from this export.)*

