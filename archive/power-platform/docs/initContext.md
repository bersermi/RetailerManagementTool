# Retail Ops Power Platform App — Dataverse Schema + Interaction Logic (Option B)

**Context date:** 2026-04-02  
**Goal:** Build a scalable Power Platform (Dataverse + Canvas App + Power Automate) system for small retail operators to manage:
- Providers (suppliers) and **provider-specific catalogs**
- Products with **families + variants** (multi-level specs like “Beans → Black beans → Premium”)
- Purchases that feed **stock**
- Sales with a **basket** experience + per-line price overrides (persisting last sell price)
- Inventory actions at any time (favorite, to-buy, out-of-stock, etc.)
- A **Waste module** with expiry per batch + later classification and backend suggestions
- Multi-tenant-in-one-environment (**Option B**) using `Workspace` as partition key for replication and later consolidation

This document captures: interaction logic, table design, flows, and the recommended solution/ALM approach.

---

## 1) Core UX and interaction logic (as designed)

### 1.1 Workspaces (Option B: multi-tenant in one environment)
- Each business/store is a **Workspace**.
- Users belong to one or more workspaces via **WorkspaceMember**.
- The Canvas app scopes all reads/writes to the current `Workspace`.

**App behavior**
- On app start: determine current Workspace (auto-pick if only one; otherwise workspace selector).
- Every list/gallery/filter: `Filter(<table>, Workspace = gblWorkspaceId)`.

---

### 1.2 Providers and Provider Catalogs
**User story**
- User creates a Provider.
- Each provider has a **catalog** (the set of products they can buy from that provider).
- When creating a new provider, user can **import** products from existing providers:
  - Import all products from another provider (bulk)
  - Import selected families/variants

**Key rule**
- Products are global within a Workspace (not per-provider).
- A provider’s catalog is a join table (no product duplication).

---

### 1.3 Products: Families + Variants + Units
**User story**
- Products have multiple levels of specification, but in the data model:
  - `ProductFamily` = the base family (e.g., “Beans”)
  - `ProductVariant` = each sellable/buyable item (e.g., “Black”, “Premium”, etc.)
- The app should allow creating a family + multiple variants **in one go**.
- Each variant has **one unit** (kg, g, can, piece, bag, etc.) to keep operations simple.

**User-defined units**
- Units are managed in a setup screen.
- Users can define “usual units” for faster selection (reduced taps).

**Search-first UX + duplicate avoidance**
- When creating a product or populating provider catalog:
  - Search existing products first across the workspace
  - Inspect features (unit, attributes, expiry settings, last sell price)
  - Import to provider catalog instead of duplicating
- Normalized naming supports detection and warnings.

---

### 1.4 Purchases → Stock (batches)
**User story**
- User registers a purchase:
  - Select Provider
  - Select products (preferably from ProviderCatalogItem)
  - Enter quantity + either total or unit price (the app computes the other)
- Completing a purchase creates stock in the form of **StockBatches**.
- Each purchase line typically becomes one stock batch.

**Expiry**
- Each batch may have an ExpiryDate:
  - Manual expiry set on the purchase line OR
  - Auto-calculated if the family has a DefaultLifespanDays

---

### 1.5 Sales: Basket + price overrides + last price
**User story**
- User sells by selecting product variant and quantity.
- App shows unit price and total; user can override price per line.
- Sale supports multiple lines and shows basket total.
- Completing the sale:
  - Decrements stock (FIFO across batches)
  - Updates `ProductVariant.LastSellUnitPrice` (last used sell price)
- If insufficient stock:
  - System allows sale completion and logs a **Pending** InventoryEvent to reconcile later.

---

### 1.6 Quick Actions (don’t force stock impact)
**Actions should be available anywhere** (provider view, inventory tab, sell tab):
- Favorite
- Add to “To buy” list
- Set Not Sellable / Out-of-stock-for-day (availability)
- Other future actions

**Design decision**
- Quick actions do **not** directly impact stock by default.
- Instead:
  - Availability changes go into `ProductAvailabilityOverride`
  - “I need to decide later” goes into `InventoryEvent` with `Status = Pending`

This supports real-world operations where the user may:
- stop selling an item immediately
- later decide whether it was expired, lost, miscounted, taken home, etc.

---

### 1.7 Pending tab: classify later (inventory events)
**User story**
- User sees pending inventory events and classifies them later:
  - Expired, Waste, Lost, Miscount, TookHome, Other
- Upon finalization, stock is adjusted accordingly (decrement from a batch or FIFO).

---

### 1.8 Waste tab (module)
**User story**
- Waste is a first-class module:
  - User creates a waste “session” (header)
  - Adds waste lines (variant, batch, qty, reason)
  - Completes waste

**Behavior**
- Completing Waste creates finalized InventoryEvents (or directly triggers adjustments via InventoryEvent Finalized flow).
- Batch expiry:
  - Waste screen can show “Expiring soon” and “Expired already” batches as shortcuts.

---

### 1.9 Suggestions (backend intelligence without noise)
**User story**
- Backend can suggest improvements (e.g., lifespan) based on observed behavior.
- User can enable/disable suggestion categories to avoid noise.

Example:
- When user marks a batch as expired:
  - System suggests DefaultLifespanDays = (ExpiredDate − PurchaseDate)
  - User can apply to family (and therefore impacts all providers that reference those products)

---

## 2) Dataverse schema (tables + key columns + intended use)

> Note: Each table has an automatic GUID primary key in Dataverse. The “Name” you define at table creation is the Primary Name column (Text). Don’t create a second Name column; use DisplayName if needed.

### 2.1 Workspace & membership

#### Workspace
- **Primary Name** (Text)
- DisplayName (Text, optional)
- IsActive (Yes/No)

Purpose:
- Partition key for all records in Option B (multi-tenant in one environment).

#### WorkspaceMember
- **Primary Name** (Text) — can be auto-filled later
- Workspace (Lookup → Workspace)
- User (Lookup → System User)
- Role (Choice: Owner/Manager/Staff/Viewer)
- IsActive (Yes/No)

Purpose:
- Controls which users can operate within each workspace.

Key recommendation:
- Alternate Key: (Workspace, User)

---

### 2.2 Providers and provider catalogs

#### Provider
- Workspace (Lookup)
- **Primary Name**
- DisplayName (Text, optional)
- NormalizedName (Text)
- IsActive (Yes/No)
- Notes (Multiline)

Location/contact (for future features):
- AddressLine1, Neighborhood, City, State, Country (Text)
- Latitude, Longitude (Decimal, optional)
- GoogleMapsLink (Text, optional)
- ContactName, Phone, WhatsApp (Text)

Purpose:
- Supplier entity used to create purchases and catalogs.

Recommended key:
- (Workspace, NormalizedName)

#### ProviderCatalogItem (join Provider ↔ ProductVariant)
- Workspace (Lookup)
- Provider (Lookup)
- ProductVariant (Lookup)
- IsActive (Yes/No)
- DisplayName (Text, optional)
- ProviderSKU (Text, optional)
- DefaultPurchaseUnitPrice (Currency, optional)
- LastPurchaseUnitPrice (Currency, optional)
- Preferred (Yes/No, optional)

Purpose:
- Defines what items a provider sells to the business.
- Enables catalog imports without duplicating products.

Recommended key:
- (Workspace, Provider, ProductVariant)

---

### 2.3 Units + user preferences

#### Unit
- Workspace (Lookup)
- **Primary Name**
- DisplayName (Text, optional)
- NormalizedName (Text)
- IsActive (Yes/No)

Purpose:
- Workspace-defined unit list for consistency (kg, g, can, piece, bag, cup, etc.)

Recommended key:
- (Workspace, NormalizedName)

#### UserUnitPreference
- Workspace (Lookup)
- User (Lookup → System User)
- Unit (Lookup → Unit)
- IsUsual (Yes/No)
- SortOrder (Number, optional)

Purpose:
- UX: show “usual units” first in pickers.

---

### 2.4 Products (families + variants + attributes)

#### ProductFamily
- Workspace (Lookup)
- **Primary Name**
- DisplayName (Text, optional)
- NormalizedName (Text)
- DefaultUnit (Lookup → Unit)
- DefaultLifespanDays (Number, nullable)
- TrackExpiry (Yes/No)
- IsActive (Yes/No)
- Notes (Multiline, optional)

Purpose:
- Shared settings across related products (unit default, expiry defaults, etc.)
- Supports applying changes across multiple variants/providers since variants are global within workspace.

Recommended key:
- (Workspace, NormalizedName)

#### ProductVariant
- Workspace (Lookup)
- ProductFamily (Lookup)
- VariantName (Text)
- DisplayName (Text) — recommended to store for UI
- NormalizedName (Text)
- Unit (Lookup → Unit)  *(single unit per variant)*
- UnitOverridden (Yes/No)
- LastSellUnitPrice (Currency, nullable)
- IsActive (Yes/No)
- Notes (Multiline, optional)

Purpose:
- Each sellable/buyable SKU-like record.
- Used everywhere: provider catalog, purchases, stock, sales, waste, events.

Recommended key:
- (Workspace, ProductFamily, NormalizedName)  *(or Workspace+NormalizedName if you prefer globally unique names)*

#### ProductVariantAttribute (optional)
- Workspace (Lookup)
- ProductVariant (Lookup)
- AttributeName (Text)
- AttributeValue (Text)
- DisplayName (Text, optional)

Purpose:
- Flexible multi-level specification (“Quality”, “Type”, “Cut”, etc.) without adding many fixed columns.

---

### 2.5 Purchases and stock batches

#### Purchase
- Workspace (Lookup)
- Provider (Lookup)
- PurchaseDateTime (DateTime)
- Status (Choice: Draft/Completed)
- TotalAmount (Currency, optional)
- Notes (Multiline)

Purpose:
- Purchase header; only Completed purchases impact stock.

#### PurchaseLine
- Workspace (Lookup)
- Purchase (Lookup)
- ProductVariant (Lookup)
- Qty (Decimal)
- Unit (Lookup → Unit)
- UnitPrice (Currency, nullable)
- LineTotal (Currency, nullable)
- ExpiryDateManual (Date, nullable)
- Notes (Multiline, optional)

Purpose:
- User can input either UnitPrice or LineTotal; app/flow computes the other.

#### StockBatch
- Workspace (Lookup)
- ProductVariant (Lookup)
- Provider (Lookup, optional but useful)
- SourcePurchaseLine (Lookup → PurchaseLine)
- ReceivedDateTime (DateTime)
- QtyReceived (Decimal)
- QtyRemaining (Decimal)
- Unit (Lookup → Unit)
- UnitCost (Currency, optional)
- ExpiryDate (Date, nullable)
- IsActive (Yes/No)
- DisplayName (Text, optional)

Purpose:
- Stock is managed as batches to support expiry, waste, and FIFO consumption.

---

### 2.6 Sales (basket)

#### Sale
- Workspace (Lookup)
- SaleDateTime (DateTime)
- Status (Choice: Draft/Completed)
- TotalAmount (Currency, optional)
- Notes (Multiline)

#### SaleLine
- Workspace (Lookup)
- Sale (Lookup)
- ProductVariant (Lookup)
- Qty (Decimal)
- Unit (Lookup → Unit)
- UnitPrice (Currency)
- LineTotal (Currency)

Purpose:
- Basket sales with per-line price override.
- Completing sale consumes StockBatches FIFO and updates last sell price.

---

### 2.7 Availability overrides, actions, and corrections

#### ProductAvailabilityOverride
- Workspace (Lookup)
- ProductVariant (Lookup)
- StartDateTime (DateTime)
- EndDateTime (DateTime, nullable)
- AvailabilityStatus (Choice: Sellable/NotSellable)
- ReasonNote (Text, optional)

Purpose:
- UX-level “don’t sell now” toggle without touching quantities.
- Enables out-of-stock-for-day workflows in Sell/Inventory screens.

#### InventoryEvent
- Workspace (Lookup)
- EventType (Choice; simple set to start)
- Status (Choice: Pending/Finalized)
- EventDateTime (DateTime)
- ProductVariant (Lookup, nullable for broader events)
- StockBatch (Lookup, nullable)
- Qty (Decimal, nullable)
- Unit (Lookup → Unit, nullable)
- Classification (Choice: Expired/Waste/Lost/Miscount/TookHome/Other, nullable)
- Notes (Multiline)
- RelatedPurchase (Lookup, nullable)
- RelatedSale (Lookup, nullable)
- (Optional) RelatedWaste (Lookup → Waste)

Purpose:
- Unified infrastructure for:
  - quick actions that become decisions later (Pending)
  - corrections (no editing of completed documents)
  - audit trail for why inventory changed (Expired vs Lost etc.)

---

### 2.8 Waste module (recommended)

#### Waste (header)
- Workspace (Lookup)
- WasteDateTime (DateTime)
- Status (Choice: Draft/Completed)
- Notes (Multiline)

#### WasteLine
- Workspace (Lookup)
- Waste (Lookup)
- ProductVariant (Lookup)
- StockBatch (Lookup, nullable but recommended)
- Qty (Decimal)
- Unit (Lookup → Unit)
- Reason (Choice: Expired/Spoiled/Damaged/PrepLoss/Other)
- Notes (Multiline)

Purpose:
- Waste is a first-class UX module and a clean reporting unit (“waste session”).

---

### 2.9 Suggestions (noise-controlled intelligence)

#### Suggestion
- Workspace (Lookup)
- SuggestionType (Choice)
- TargetFamily (Lookup → ProductFamily, nullable)
- TargetVariant (Lookup → ProductVariant, nullable)
- SuggestedNumber (Number, nullable)
- SuggestedText (Text, nullable)
- Confidence (Number 0–100 or Choice)
- Status (Choice: New/Accepted/Dismissed)
- Notes (Multiline)

#### SuggestionSetting
- Workspace (Lookup)
- User (Lookup → System User)
- SuggestionType (Choice)
- IsEnabled (Yes/No)

Purpose:
- Backend can propose settings (e.g., lifespan), but user can control visibility and adoption.

---

## 3) Integration logic: flows (Power Automate “engine”)

> The app is intentionally simple; flows implement most business logic to keep screens light and scalable.

### Flow A — Normalize Names (Search-first UX)
Trigger:
- On create/update of Provider, Unit, ProductFamily, ProductVariant

Actions:
- Set `NormalizedName` from Primary Name or DisplayName:
  - lower-case, trim, remove punctuation, collapse spaces

Outcome:
- Fast searching and consistent duplicate detection.

---

### Flow B — Purchase Completed → create StockBatches
Trigger:
- Purchase.Status changes to `Completed`

Actions per PurchaseLine:
- Compute missing price fields:
  - if UnitPrice blank and LineTotal exists → UnitPrice = LineTotal / Qty
  - if LineTotal blank and UnitPrice exists → LineTotal = UnitPrice * Qty
- Create StockBatch:
  - QtyReceived = QtyRemaining = Qty
  - ExpiryDate:
    - ExpiryDateManual if present
    - else if ProductFamily.DefaultLifespanDays present → ReceivedDate + lifespan
    - else null
- Optional: update ProviderCatalogItem.LastPurchaseUnitPrice

Outcome:
- Purchases reliably feed stock; expiry computed where possible.

---

### Flow C — Sale Completed → consume stock FIFO + update last sell price
Trigger:
- Sale.Status changes to `Completed`

Actions per SaleLine:
- Compute LineTotal if needed
- Consume StockBatch rows FIFO (oldest first) until Qty satisfied
- If insufficient stock:
  - Create InventoryEvent (EventType = ShortageDetected, Status = Pending, Qty = shortage, RelatedSale = Sale)
- Update ProductVariant.LastSellUnitPrice = SaleLine.UnitPrice

Outcome:
- Basket checkout decrements stock; shortages enter pending reconciliation.

---

### Flow D — InventoryEvent Finalized → apply stock change (correction system)
Trigger:
- InventoryEvent.Status changes to `Finalized`

Logic:
- If Classification indicates stock impact AND Qty is set:
  - If StockBatch specified: decrement that batch
  - Else: decrement FIFO across batches for the product variant
- If Classification = Expired and StockBatch present:
  - Create Suggestion to set ProductFamily.DefaultLifespanDays based on observed lifespan

Outcome:
- Users can act immediately and rationalize later without corrupting purchase/sale history.

---

### Flow E — Waste Completed → create InventoryEvents (if Waste module is used)
Trigger:
- Waste.Status changes to `Completed`

Actions:
- For each WasteLine:
  - Create InventoryEvent (Status = Finalized, Classification mapped from WasteLine.Reason)
- Flow D applies the stock decrement

Outcome:
- Waste is tracked as sessions, but inventory changes remain consistent via InventoryEvents.

---

## 4) App build guidance (scalable and replicable)

### 4.1 Use Solutions for ALM and replication
Recommended solution structure (DEV unmanaged; deploy managed to TEST/PROD):
- `Retail.Core` — tables, columns, relationships, choices, views, keys
- `Retail.Automation` — flows, environment variables, connection references
- `Retail.App` — Canvas app + (optional) component library

Key points:
- Solutions move schema and logic; they do **not** move operational data.
- Workspace onboarding is done via app/flow (creating workspace, membership, seeding units).

### 4.2 Workspace scoping rules (non-negotiable for Option B)
- Store `gblWorkspaceId` and use it on every query and create:
  - `Filter(Table, Workspace = gblWorkspaceId)`
  - on create: default Workspace lookup to gblWorkspaceId
- This is what makes multi-tenant scale within one environment.

### 4.3 Screen/module build order (prevents rework)
Phase 1:
1) Workspace selector / workspace context
2) Provider list + provider details
3) Provider catalog (ProviderCatalogItem) with search-first product import + bulk import
4) Product setup (family + create variants in bulk) + unit setup + usual units
5) Purchases (draft → complete) feeding stock batches
6) Inventory list (stock availability) + “not sellable” quick action
7) Sales (basket) + completion flow
8) Pending tab (InventoryEvents pending → finalize)
9) Waste tab (Waste + WasteLine) + complete

Phase 2:
- Suggestions panel + toggles
- Admin / onboarding tools
- Analytics pages (stock, waste rate, provider spend, margin proxies, etc.)

---

## 5) Operational rules captured (important decisions made)

1) **Option B chosen:** single environment, multi-tenant using Workspace.
2) **Dataverse IDs:** implicit GUID PK per table; relationships via lookup columns.
3) **DisplayName columns:** added where useful for UI.
4) **Quick actions do not directly change stock:** availability override + pending event → later classification.
5) **Provider location fields:** included now and extensible later.
6) **No “cancel edits” feature in UI yet:** future-ready via InventoryEvents (corrections rather than rewriting history).
7) **Search-first UX + NormalizedName:** primary anti-duplication strategy; import rather than recreate.

---

## 6) Next concrete build steps (immediate)
1) Ensure global Choices exist (DocumentStatus, EventStatus, InventoryClassification, AvailabilityStatus, WorkspaceRole, SuggestionStatus).
2) Add NormalizedName + DisplayName to Provider/Unit/ProductFamily/ProductVariant.
3) Create alternate keys:
   - WorkspaceMember: (Workspace, User)
   - ProviderCatalogItem: (Workspace, Provider, ProductVariant)
   - Unit/Provider/ProductFamily: (Workspace, NormalizedName)
   - ProductVariant: (Workspace, ProductFamily, NormalizedName)
4) Create Dataverse Views for app galleries:
   - ProductVariant Search, ProviderCatalog by Provider, Stock Available, Stock Expiring Soon, InventoryEvent Pending, Waste Recent.
5) Build the minimal flows:
   - Normalize names
   - Purchase Completed → StockBatch
   - Sale Completed → FIFO decrement + LastSellUnitPrice + shortage event
   - InventoryEvent Finalized → apply stock change + lifespan suggestion
   - Waste Completed → create finalized events (if Waste module is present)
6) Start Canvas app with Workspace context and enforce Workspace scoping everywhere.

---
