================================================================================
ANALYSIS: PRODUCT MODEL REFACTORING
From Provider-Centric to General Catalog-First with Provider Pricing Layer
================================================================================

**Date:** 2026-04-11  
**Status:** Analysis & Design Recommendation (REVISED)  
**Prepared for:** Sergio  
**Scope:** Data model + transactional flows  

---

## User Requirements (Clarified)

✅ **Provider CENTRAL to purchase workflow** (user selects provider first)  
✅ **Global ProductVariant catalog** (products shared across workspace)  
✅ **Provider pricing history** (track price per provider-product over time)  
✅ **Auto-populate last price** (when selecting product from provider, show last price paid)  
✅ **Override capability** (user can change price inline)  
✅ **Provider Catalog management** (view/update provider prices; derived from purchase history)

---

## Current State (Provider-Centric Model)

### **Architecture**

```
ProductFamily (global defaults)
  └─ ProductVariant (items)
       └─ ProviderCatalogItem (which providers carry this)
            └─ Provider (source)

Transaction Flow:
  Purchase:
    - Select Provider
    - Provider's catalog appears (via ProviderCatalogItem filter)
    - User selects product from that provider's catalog
    - Purchase records which provider
```

### **Key Table Structure**

| Table | Role | Purpose |
|-------|------|---------|
| **ProductFamily** | Global | Shared defaults (unit, lifespan, notes) |
| **ProductVariant** | Global | Sellable/buyable items |
| **ProviderCatalogItem** | Join/Config | Maps Provider → ProductVariant; stores provider-specific price |
| **Purchase** | Transaction | Header; links to Provider |
| **PurchaseLine** | Transaction | Links to ProductVariant + Purchase |
| **SaleLine** | Transaction | Links to ProductVariant directly (no provider ref) |

### **Data Flow Diagram**

```
Provider Selection
   ↓
Load Provider's Catalog (ProviderCatalogItem where Provider = X)
   ↓
Display Products (ProductVariant where ID in catalog items)
   ↓
Purchase records product + provider source
```

### **Problems with Current Model**

1. **Catalog must be pre-populated per provider**
   - Adding a new product requires deciding which providers carry it
   - Requires manual ProviderCatalogItem creation
   - Slows down new product onboarding

2. **Hard to view "all available products"**
   - Must check: Is this in any provider's catalog?
   - Harder to deduplicate across providers

3. **Purchase requires knowing provider first**
   - User must select provider → then products appear
   - Doesn't support "buy from any provider" workflows
   - Can't easily switch providers mid-purchase (want cheaper option?)

4. **Generic purchases awkward**
   - If user buys without a provider registration (e.g., spot purchase), requires setup overhead
   - Special "Unknown Provider" or null handling needed

5. **Pricing fragmented**
   - ProviderCatalogItem.DefaultPurchasePrice per provider
   - Hard to see price variance across providers
   - Last purchase price tracking per provider + product = complex

---

## Proposed State (General Catalog-First Model)

### **New Architecture**

```
ProductFamily (global defaults)
  └─ ProductVariant (core global catalog)
       
Transaction References ProductVariant directly:
  Purchase:
    - Select Product (any/all in catalog)
    - Select Provider (optional; can be null/"General")
    - Override price if needed (stored in PurchaseLine)
    
Sale:
    - Select Product
    - (No provider logic; can sell regardless of where we bought it)

Pricing Layer:
    - ProductVariant.LastSellPrice (global last price)
    - ProductVariant.BasePrice (base cost/selling price)
    - ProviderProductPrice (optional; overrides if set)
    - [Or just store price history in transactions]
```

### **Key Changes**

#### **1. Simplify ProviderCatalogItem (or Remove)**

**Current:** Join table required to use a product

**New Option A: Remove entirely**
- ProductVariant exists globally; any product can be purchased from any provider
- Provider becomes truly optional on Purchase
- Pro: Simpler, more flexible
- Con: Need way to track which products a provider *usually* carries (optional ProviderCatalogItem can remain as metadata, not a restriction)

**New Option B: Keep as Optional Reference (Recommended)**
- Keep ProviderCatalogItem but don't use it as a filter
- Use it only for:
  - Provider's preferred price for a product
  - Tracking which products a provider *can* supply (informational)
- Allow Purchase to link to any ProductVariant, regardless of ProviderCatalogItem
- Pro: Backward compatible; still useful for provider metadata
- Con: Slightly more tables to manage, but optional in transactions

**Recommendation:** Start with Option A (remove filtering logic from ProviderCatalogItem). Easier to execute. Can add structured pricing later if needed.

---

#### **1. Pricing Architecture (Central to New Design)**

**ProviderProductPrice Table (NEW)** ← KEY addition

Purpose: Track the last price each provider charged for each product

```
Columns:
  - Provider (FK, required)
  - ProductVariant (FK, required)
  - Workspace (FK, required)
  - LastPurchasePrice (decimal) ← Product price from this provider (last paid)
  - LastUpdatedDate (datetime) ← When we last bought from this provider
  - IsActive (bool, default: true) ← Allow marking products as "no longer carry"

Unique Key: (Workspace, Provider, ProductVariant)

When to Update:
  1. After purchase: When PurchaseLine recorded, auto-update LastPurchasePrice
  2. Manual override: User can edit via "Provider Catalog" UI (future feature)
```

**Example:**
```
Provider: "Distribuidora Central CDMX"
Product: "Bananas"  
LastPurchasePrice: $0.50 per unit
LastUpdatedDate: 2026-04-10

Next Purchase:
  User selects this provider + product
  → Auto-populates with $0.50
  → User can change to $0.52 if new quote
  → Record $0.52 in PurchaseLine
  → Update ProviderProductPrice.LastPurchasePrice to $0.52
```

---

#### **2. Product Selection Flow (Transactions)**

**Purchase Entry (Updated with Pricing)**

```
Flow:
  1. User selects Provider (dropdown, required)
  2. Load ProductVariant catalog (workspace, global, all products)
  3. User selects product
  4. Lookup ProviderProductPrice → Fetch LastPurchasePrice
  5. Auto-fill price field with LastPurchasePrice (or blank if new product)
  6. User enters quantity
  7. User can override price if needed
  8. Confirm:
     → Create PurchaseLine (qty + actual price paid)
     → Update ProviderProductPrice.LastPurchasePrice (new price)
     → Update ProviderProductPrice.LastUpdatedDate (today)
     → Create StockBatch

Result: Prices tracked per provider; auto-populated on re-purchase; easily overridable
```

**Sale Entry (Unchanged)**
```
Flow:
  1. Load ALL ProductVariants (workspace scoped)
  2. User selects product
  3. User enters quantity + price (defaults to last sell price if toggle ON)
  4. Create SaleLine + decrement StockBatch

Result: Sales from inventory; no provider logic
```

---

#### **3. Provider Catalog View (UI Component)**

**New Screen/Panel: "Provider Catalog" (Future)**

```
Purpose: View/update prices for products this provider carries

UI:
  Input: Provider (dropdown)
  
  Table Display:
    | Product | Family | Unit | Last Price | Last Updated | Action |
    |---------|--------|------|------------|--------------|--------|
    | Bananas | Produce| kg   | $0.50      | 2026-04-10   | Edit   |
    | Apples  | Produce| kg   | $0.75      | 2026-04-08   | Edit   |
    /selling price for the product
    
UNCHANGED:
  - Workspace (FK) - still scoped per workspace
  - ProductFamily (FK) - grouping
```

#### **Purchase**
```
MODIFY:
  - Provider (FK, NOT optional/nullable) ← REQUIRED for new model
    Reason: User always selects provider first
    When: At purchase entry
    
UNCHANGED:
  - Workspace (FK)
  - Date, Status, Notes
```

#### **PurchaseLine**
```
UNCHANGED:
  - ProductVariant (FK, required) → Global product from catalog
  - Qty (required)
  - ActualPrice (required) → What we actually paid for this item
  
REFERENCE: This stores the transaction record
```

#### **ProviderProductPrice** (NEW TABLE) ← KEY ADDITION

```
Purpose: Cache last price per (Provider, ProductVariant) pair

Columns:
  - ProviderProductPriceId (PK, GUID)
  - Provider (FK, required) → crbc0_Provider
  - ProductVariant (FK, required)
  - Workspace (FK, required)
  - LastPurchasePrice (Decimal, optional) → Price from last purchase (or manual edit)
  - LastUpdatedDate (DateTime) → When this price was last set
  - IsActive (Choice: Yes/No, default: Yes) → Can mark product as "no longer carry"
  - CreatedOn, ModifiedOn (system fields)

Unique Constraint (Alternate Key):
  (Workspace, Provider, ProductVariant)

When Updated:
  1. After PurchaseLine created → Flow updates LastPurchasePrice + LastUpdatedDate
  2. Manual: User edits via Provider Catalog UI (v2 feature)
  
Foreign Keys:
  - Provider → crbc0_Provider (multi-tenancy: must match Workspace)
  - ProductVariant → ProductVariant
  - Workspace → Workspace
```

#### **ProviderCatalogItem** (DEPRECATED)

```
Status: Keep table but DEPRECATE
  - Do not use for filtering in v1
  - Mark records as inactive
  - Archive in 30 days

Reason: ProviderProductPrice replaces it with pricing capability
```

---

### **Removed from Design**

❌ **ProviderCatalogItem filtering logic** — No longer needed; buy any product from any provider  
❌ **"General" provider concept** — Provider always required  
❌ **Optional provider** — User always specifies provider

---

## Data Model Changes Summary

| Table | Before | After | Impact |
|-------|--------|-------|--------|
| ProductVariant | Catalog item | Global catalog (workspace-scoped) | More flexible; shared across transactions |
| Provider | Required on Purchase | Required on Purchase | UNCHANGED |
| Purchase | Filters to provider catalog | No filtering; all products available | SIMPLER |
| PurchaseLine | Stores price | Stores actual price paid | UNCHANGED |
| ProviderProductPrice | N/A (doesn't exist) | NEW; stores last price per provider-product | AUTO-POPULATE next purchase |
| ProviderCatalogItem | DEPRECATED | DEPRECATED | Archive; no longer filters transactions |

*PurchaseLine** | Add: `ProviderProductPrice` (lookup, optional FK) | Link to standard price if available |

---

#### **4. Scoping Rules (Workspace Isolation)**

**Current:** Workspace scoped on ProductFamily, ProductVariant, ProviderCatalogItem, Provider

**New:** 
- **ProductVariant:** Workspace-scoped (each workspace has its own product set)
- **Provider:** Workspace-scoped 
- **ProviderCatalogItem:** If kept, workspace-scoped
- **ProviderProductPrice:** If added, workspace-scoped

**Key:** Users in Workspace-A cannot see Workspace-B's products or providers. But within their workspace, can buy any product from any provider (or "General").

---

## Table Modifications Summary

### **Tables to Modify**

#### **ProductVariant**
```
ADD:
  - IsActive (Choice: Yes/No, default: Yes)
    Reason: Mark products as discontinued without deleting
  
  - BasePrice (Optional, Decimal)
    Reason: Reference price for the product (sales baseline)
```

#### **Purchase**
```
MODIFY:
  - Provider (change to: Lookup, optional, nullable)
    Currently: Required or assumed
    Reason: Support "General" purchases with no provider
    
ADD:
  - PurchaseSouCreate New Table in Dataverse (ProviderProductPrice)**

**To Execute:**

1. **Create Table: ProviderProductPrice**
   ```
   Dataverse → Maker Portal → Tables → + New Table
   
   Name: ProviderProductPrice
   
   Columns:
     - Provider (Lookup to crbc0_Provider, required)
     - ProductVariant (Lookup to ProductVariant, required)
     - Workspace (Lookup to Workspace, required)
     - LastPurchasePrice (Currency, optional)
     - LastUpdatedDate (DateTime, default: Today())
     - IsActive (Choice: Yes/No, default: Yes)
   
   Alternate Key:
     Name: ProviderProductKey
     Columns: Workspace, Provider, ProductVariant
     Reason: Ensure one price per provider-product per workspace
   ```

2. **Update ProductVariant table**
   ```
   ADD column: IsActive
   - Type: Choice
   - Options: Yes, No
   - Default: Yes
   
   ADD column: BasePrice (optional)
   - Type: Currency
   - Use for: Reference/selling price
   ```

3. **Verify Purchase table**
   ```
   Provider column should be:
   - Type: Lookup to Provider
   - Required: Yes (NOT optional)
   - Allow null: No
   ```

**Time: 20 minutes**

---

### **Phase 2: Update Canvas App - V1-02 Buy Screen**

**Canvas Formula Changes:**

```powerapps
// Screen OnVisible: Load provider list
Set(selectedProvider, Blank());
Set(selectedProduct, Blank());
Set(productPrice, 0)

// Dropdown 1: Select Provider (REQUIRED)
ddlProvider:
  Items: Filter(Provider, Workspace = gblWorkspaceId)
  OnChange: 
    Set(selectedProvider, ddlProvider.Selected);
    Set(selectedProduct, Blank());  // Reset product when provider changes
    Set(productPrice, 0)

// Dropdown 2: Select Product (shows ALL products in workspace)
ddlProduct:
  Items: Filter(ProductVariant, 
    Workspace = gblWorkspaceId && 
    IsActive = true
  )
  OnChange:
    Set(selectedProduct, ddlProduct.Selected);
    
    // KEY: Look up last price for this provider-product combination
    Set(lastProviderPrice, 
      LookUp(ProviderProductPrice,
        Workspace.Value = gblWorkspaceId &&
        Provider.Value = selectedProvider.ID &&
        ProductVariant.Value = selectedProduct.ID
      ).LastPurchasePrice
    );
    
    // Auto-populate price (or leave for user to enter if no history)
    Set(productPrice, If(IsBlank(lastProviderPrice), 0, lastProviderPrice))

// Text Input: Quantity
txtQty: (unchanged)

// Text Display: Price (auto-populated, editable)
txtPrice:
  Default: productPrice
  OnChange: Set(productPrice, Value(txtPrice.Value))
  Hint: "Last price: {lastProviderPrice}" (show history)

// Confirm Button: Record Purchase
btnConfirmSale:
  OnSelect:
    // 1. Validate
    If(IsBlank(selectedProvider),
      Notify("Select a provider", NotificationType.Error);
      Return()
    );
    If(IsBlank(selectedProduct),
      Notify("Select a product", NotificationType.Error);
      Return()
    );
    If(qty <= 0,
      Notify("Qty must be > 0", NotificationType.Error);
      Return()
    );
    
    // 2. Create Purchase header
    Patch(Purchase, Defaults(Purchase), {
      Workspace: {Value: gblWorkspaceId},
      Provider: {Value: selectedProvider.ID},
      Date: Today(),
      Status: "Completed"
    });
    
    // 3. Get Purchase ID (just created)
    Set(lastPurchaseId, LookUp(Purchase,
      Workspace.Value = gblWorkspaceId &&
      Provider.Value = selectedProvider.ID &&
      Date = Today()
    ).ID);
    
    // 4. Create PurchaseLine (transaction record)
    Patch(PurchaseLine, Defaults(PurchaseLine), {
      Purchase: {Value: lastPurchaseId},
      ProductVariant: {Value: selectedProduct.ID},
      Qty: qty,
      'Unit Price': productPrice,  // Actual price paid
      Workspace: {Value: gblWorkspaceId}
    });
    
    // 5. Update ProviderProductPrice (cache for next time)
    Patch(ProviderProductPrice, 
      LookUp(ProviderProductPrice,
        Workspace.Value = gblWorkspaceId &&
        Provider.Value = selectedProvider.ID &&
        ProductVariant.Value = selectedProduct.ID
      ) ?? Defaults(ProviderProductPrice),
      {
        Workspace: {Value: gblWorkspaceId},
        Provider: {Value: selectedProvider.ID},
        ProductVariant: {Value: selectedProduct.ID},
        LastPurchasePrice: productPrice,
        LastUpdatedDate: Now()
      }
    );
    
    // 6. Create StockBatch (via flow or direct patch)
    Patch(StockBatch, Defaults(StockBatch), {
      ProductVariant: {Value: selectedProduct.ID},
      Qty: qty,
      BatchDate: Today(),
      Workspace: {Value: gblWorkspaceId}
    });
    
    // 7. Success + Clear form
    Notify("Purchase recorded ✓ | $" & productPrice & " per unit", NotificationType.Success);
    Reset(txtQty);
    Reset(txtPrice);
    Set(selectedProvider, Blank());
    Set(selectedProduct, Blank());
    Set(productPrice, 0)
```

**Time: 45 minutes**

---

### **Phase 3: Auto-Update Flow (Cloud Flow)**

**Optional Cloud Flow: "Update Provider Price on Purchase"**

```
Trigger: When a row is added (PurchaseLine)

Actions:
  1. Get PurchaseLine row
  2. Get related Purchase (to extract Provider)
  3. Get ProductVariant
  4. Update ProviderProductPrice:
     - If EXISTS (where Provider + ProductVariant + Workspace match):
       → Update LastPurchasePrice = PurchaseLine.UnitPrice
       → Update LastUpdatedDate = Now()
     - If NOT EXISTS:
       → Create new ProviderProductPrice record
  5. Update ProductVariant.CurrentStockLevel (sum StockBatches)

Note: Steps 1-4 can be done via Canvas Patch (Phase 2 code above)
      This flow is OPTIONAL (adds resilience; handles late updates)
```

**Time: Optional; 15 minutes if adding**

---

### **Phase 4: Provider Catalog View (Future UI)**

**New Screen/Component: "Manage Provider Pricing" (v2)**

```powerapps
// Screen: scrProviderCatalog

// Input: Provider dropdown
ddlProviderCatalog:
  Items: Filter(Provider, Workspace = gblWorkspaceId)
  OnChange: Set(selectedProviderForCatalog, ddlProviderCatalog.Selected)

// Gallery: Show all products for this provider + prices
galProviderCatalog:
  Items: Filter(ProviderProductPrice,
    Workspace = gblWorkspaceId &&
    Provider.Value = selectedProviderForCatalog.ID
  )
  
// Gallery Items:
  Title: [ProductVariant Name]
  Subtitle: "[Family] | [Unit]"
  Price Display (editable):
    Default: ThisItem.LastPurchasePrice
    OnChange:
      Patch(ProviderProductPrice, ThisItem, {
        LastPurchasePrice: Value(ThisItem.Text),
        LastUpdatedDate: Now()
      })
  Last Updated: Format(ThisItem.LastUpdatedDate, "MMM d, YYYY")
  Action: Delete → Remove from catalog (set IsActive = false)
```

**Time: Not needed for v1; defer to v2**

---

### **Phase 5: Testing**

**New Test Scenarios:**

1. **First Purchase from Provider** ← NEW
   - Select Provider A + Product X
   - Price field blank (no  (Hybrid Model)

3. **Switch Provider** ← IMPORTANT
   - Select Provider B + Product X
   - Price field blank (Provider B has no history with Product X)
   - Enter price $0.95
   - Confirm → ProviderProductPrice created for Provider B + Product X
   - Verify: Provider A still shows $1.05; Provider B shows $0.95

4. **Price Variance Over Time** ← ANALYTICS
   - Record 5 purchases of same product from same provider at different prices
   - View transaction history in PurchaseLine
   - View current price in ProviderProductPrice (should be latest)
   - Verify both layers correct

5. **Workspace Scoping** ← MULTI-TENANT
   - Create 2 workspaces; 2 providers (same name, different workspace)
   - Buy from Provider A in Workspace-1
   - Verify price only appears for that workspace
   - Switch workspace → Provider A shows no history (clean slate)

**Time: 30 minutes**

---

## Architecture Diagram (Revised Model)

```
┌─────────────────────────────────────────────────┐
│   ProductFamily (Global, Workspace-Scoped)      │
│   ├─ Name, Unit, Lifespan                       │
└──────────────┬────────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────┐
│   ProductVariant (Global Catalog)               │
│   ├─ Name, Family (FK)                          │
│   ├─ IsActive, BasePrice                        │
│   ├─ LastSellPrice (sales toggle)               │
│   ├─ CurrentStockLevel (calculated)             │
│   └─ Workspace (FK)                             │
└──────────────┬──────────────────────────────────┘
               │
     ┌─────────┴──────────┬────────────────┐
     │                    │                │
┌────▼────────┐   ┌──────▼─────┐   ┌─────▼─────────────────────┐
│ Purchase    │   │  SaleLine   │   │ ProviderProductPrice      │
│ (header)    │   │ (Sale txn)  │   │ (Price Cache per Provider)│
│ ├─Provider  │   │ ├─Qty       │   │ ├─Provider (FK)          │
│ ├─Date      │   │ ├─Price     │   │ ├─ProductVariant (FK)    │
│ └─Workspace │   │ ├─CreatedOn │   │ ├─LastPurchasePrice      │
└────┬────────┘   │ └─Workspace │   │ ├─LastUpdatedDate        │
     │            └─────────────┘   │ └─IsActive               │
     │                              └─────┬────────────────────┘
     │                                    │
┌────▼──────────────┐                     │
│ PurchaseLine      │                     │
│ (Purchase txn)    │                     │
│ ├─ProductVariant  │◄────────────────────┘
││ ├─Qty            │   [Link by Provider + ProductVariant]
│ ├─ActualPrice     │   User selects Provider
│ ├─UnitPrice       │   Then selects Product
│ └─Workspace       │   Price auto-populates from ProviderProductPrice
└────┬──────────────┘   User confirms
     │                  PurchaseLine created
┌────▼──────────────┐   ProviderProductPrice updated (new last price)
│ StockBatch        │
│ (FIFO Ledger)     │
└───────────────────┘

    ┌──────────────────────────────────────────┐
    │  Provider Table (Optional for Purchase)  │
    │  Used to populate Provider dropdown      │
    │  Workspace-scoped; no other role         │
    └──────────────────────────────────────────┘
```

---

## Benefits of New Approach (Hybrid Model)

| Aspect | Before | After |
|--------|--------|-------|
| **Provider Role** | Optional; could buy "General" | CENTRAL; required for every purchase |
| **Product Selection** | Provider → Filtered Catalog | Global Catalog (all products available) |
| **Pricing** | No per-provider history | **ProviderProductPrice stores last price** |
| **Auto-Populate** | No | **YES: Last price from this provider auto-fills** |
| **Override** | Manual entry in transaction | **YES: User can change in-line** |
| **Provider Catalog View** | Requires ProviderCatalogItem query | **ProviderProductPrice table; sortable, filterable** |
| **Price History** | PurchaseLine transactions only | **PurchaseLine (transactions) + ProviderProductPrice (cache)** |
| **Workspace Scoping** | Same (multi-tenant safe) | Same (multi-tenant safe) |
| **Workflow** | Select Provider → See Products | Select Provider → See ALL Products → Price Pre-filled |

---

## Risk Assessment (Revised)

| Risk | Likelihood | Mitigation |
|------|------------|-----------|
| **ProviderProductPrice row not found on first purchase** | Medium | Use Patch with Defaults(); creates new record automatically |
| **Price mismatch (PurchaseLine vs ProviderProductPrice)** | Low | Both updated in same transaction; use flow as redundancy |
| **Provider required but dropdown empty** | Low | Ensure provider records exist for workspace first |
| **Cross-workspace price contamination** | Very Low | Workspace FK on all tables; queries filtered by workspace |
| **Historical prices lost** | None | PurchaseLine stores ALL prices; ProviderProductPrice stores LATEST |

---

## Implementation Roadmap (Revised)

### **Week 1 (This Week) - Phase 1 & 2**
- [ ] Create ProviderProductPrice table in Dataverse (20 min)
- [ ] Add IsActive field to ProductVariant (5 min)
- [ ] Verify Provider field is required on Purchase (5 min)
- [ ] Update V1-02 Buy screen with auto-populate logic (45 min)

### **Week 1 (Continued) - Phase 3 & 4**
- [ ] Test: First purchase scenario (5 min)
- [ ] Test: Auto-populate on re-purchase (10 min)
- [ ] Test: Switch provider (10 min)
- [ ] Test: Price variance across providers (5 min)

### **Week 1 Done: Ready for Phase A**
- [ ] Provider Catalog view (v2 feature; skip for now)
- [ ] Cloud flow redundancy (optional; Phase 2 code handles it)

### **Before Phase A Completion**
- [ ] Archive ProviderCatalogItem (if exists)
- [ ] Document new workflow in ADRs
- [ ] Update team on Provider-First + Auto-Populate pattern

---

## Recommendation

✅ **Proceed with this REVISED approach immediately.**

This hybrid model is:
- **Provider-Centric** (user picks provider first; matches manual workflow)
- **Globally Integrated** (products shared; no per-provider duplication)
- **Price-Tracked** (automatic history; cached for convenience)
- **Flexible** (user can override anytime)
- **Audit-Ready** (transactions logged in PurchaseLine; latest prices in ProviderProductPrice)

**Start Today:**
1. Create ProviderProductPrice table (20 min)
2. Update V1-02 formulas (45 min)
3. Test auto-populate scenario (15 min)
4. **Total: 1.5 hours. Ready to build Vertical 1 tomorrow.**

---

## Files to Update (After Implementation)

- [ ] VERTICAL-1-ASSEMBLY-PLAN.md → V1-02 formulas (new price lookup logic)
- [ ] PHASE-A-PRACTICAL-SETUP-GUIDE.md → Seed ProviderProductPrice table
- [ ] ADR-009 (ProviderCatalog) → Update to reflect ProviderProductPrice role
- [ ] Create ADR-034 (Hybrid: Provider-Centric + Global Catalog + Pricing Layer)
Architecture Diagram (New Model)

```
┌─────────────────────────────────┐
│   ProductFamily (Global)        │
│   ├─ Name, Unit, Lifespan       │
└──────────────┬──────────────────┘
               │
┌──────────────▼──────────────────┐
│   ProductVariant (Global Catalog) │
│   ├─ Name, Family (FK)          │
│   ├─ IsActive, BasePrice        │
│   ├─ LastSellPrice              │
│   ├─ CurrentStockLevel (calc)   │
│   └─ Workspace (FK)             │
└──────────────┬──────────────────┘
               │
        ┌──────┴──────────┐
        │                 │
   ┌────▼────┐    ┌──────▼─────┐
   │Purchase │    │  SaleLine  │
   │├─ Qty   │    │ ├─ Qty     │
   │├─ Price │    │ ├─ Price   │
   │└─Prov FK│    │ └─ Date    │
   │ (opt)   │    │            │
   └────┬────┘    └────────────┘
        │
   ┌────▼──────────┐
   │PurchaseLine   │
   │├─ ActualPrice │
   │├─ Qty         │
   └────┬──────────┘
        │
   ┌────▼──────────┐
   │ StockBatch    │
   │ (FIFO Ledger) │
   └───────────────┘

Provider Table (Optional Reference):
  - Used for Purchase.Provider (optional lookup)
  - NOT required in transactions
  - Useful for reporting/analysis
```

---

## Benefits of New Approach

| Aspect | Before | After |
|--------|--------|-------|
| **Product Selection** | Provider-first; limited by catalog membership | Global catalog; all products available |
| **New Product Onboarding** | Add to ProductFamily → Add to each Provider's Catalog | Add to ProductFamily; instantly available everywhere |
| **Pricing Flexibility** | One price per provider | Track actual price per transaction; can override inline |
| **"General" Purchases** | Requires null handling; awkward | First-class; "- General -" option available |
| **Workflow** | Select Provider → See Products | See Products → [Optional Select Provider] |
| **Workspace Scoping** | Same (multi-tenant safe) | Same (multi-tenant safe) |
| **Transaction Simplicity** | ProductVariant + Provider combo | ProductVariant directly; Provider optional |

---

## Risk Assessment

| Risk | Likelihood | Mitigation |
|------|------------|-----------|
| **Existing ProviderCatalogItem data lost** | Low (v1, test data only) | Keep table; mark records inactive; archive 30 days |
| **Provider field becomes null unexpectedly** | Low | UI defaults to "General" not blank; test required |
| **Products appear in wrong workspace** | Very Low | Workspace.ID filter already in place |
| **Pricing logic breaks** | Medium | Store price in PurchaseLine.ActualPrice (already doing); no complex lookup needed |

---

## Implementation Roadmap

### **Week 1 (This Week) - Phase 1 & 2**
- [ ] Update ProductVariant table (IsActive field)
- [ ] Update Purchase table (Provider nullable)
- [ ] Update V1-02 Buy screen (new product picker logic)
- [ ] Add provider dropdown to Buy screen

### **Week 1 (Continued) - Phase 3 & 4**
- [ ] Update flows (no changes likely needed)
- [ ] Test: Buy without provider scenario
- [ ] Test: Buy with provider scenario
- [ ] Verify StockBatch creation

### **Before Phase A Completion**
- [ ] Archive/delete ProviderCatalogItem (after confirming no impact)
- [ ] Document new transaction flow in ADRs
- [ ] Update PHASE-A-PRACTICAL-SETUP-GUIDE (remove provider catalog prep step)

---

## Recommendation

✅ **Proceed with this refactoring BEFORE building V1-02 Buy screen.**

This approach is:
- **Simpler** (fewer tables; simpler filtering)
- **More Flexible** (supports any purchase scenario)
- **More Maintainable** (global catalog = single source of truth)
- **Backward Compatible** (transactions still store provider reference; just optional)

**Start:** Update Dataverse tables today. Rebuild V1-02 screen with new logic tomorrow.

**Impact on Current Plan:** Add 1-2 hours to Vertical 1 assembly. Worth it for cleaner architecture.

---

## Questions for Clarification

1. **Do you want to keep ProviderCatalogItem for future pricing features?**
   - Recommendation: No; use PurchaseLine.ActualPrice for now; add pricing table in v2 if needed

2. **Should "General" provider be a real database record or just UI concept?**
   - Recommendation: Just UI; use null in Purchase.Provider field; show "- General -" in dropdown

3. **Should ProductVariant.BasePrice be required or optional?**
   - Recommendation: Optional; use if you want a default; otherwise always override per transaction

---

## Files to Update (After Implementation)

- [ ] PHASE-A-PRACTICAL-SETUP-GUIDE.md → Remove "create provider catalogs" step
- [ ] VERTICAL-1-ASSEMBLY-PLAN.md → Update V1-02 Buy screen formulas
- [ ] ADR-009 (ProviderCatalog) → Update to reflect new optional role
- [ ] Create ADR-034 (General Catalog-First Product Model)
