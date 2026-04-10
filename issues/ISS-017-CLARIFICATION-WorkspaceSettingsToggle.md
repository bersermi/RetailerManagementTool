================================================================================
CLARIFICATION: ISS-017 - WORKSPACE SETTINGS TOGGLE
LastSellUnitPrice Persistence Approach
================================================================================

**Date:** 2026-04-04  
**Status:** Simplified Design (Workspace-Level Toggle)  
**Philosophy:** Extreme simplicity across all products on a given workspace  

---

## The Decision: Workspace Settings Toggle

**Your directive:**
> "We'll implement a Toggle in our Settings module. This Toggle should apply across all products on a given Workspace with extremely simple logic."
> "No delta display for now. No reset timer. Leave these as future possibilities."

**What this means:**

```
Settings Screen (V1-04 New):
  ┌─────────────────────────────────────────┐
  │ Workspace Settings                      │
  ├─────────────────────────────────────────┤
  │ [ ] Use Last Sell Unit Price            │
  │     (Apply to all products)             │
  │                                         │
  │ [Save]                      [Cancel]    │
  └─────────────────────────────────────────┘

Result:
  If toggle is ON:
    → Every subsequent sale PERSISTS its unit price as LastSellUnitPrice
    → Next sale pre-fills with that price (until user overrides)
    → Applies to ALL products uniformly per workspace

  If toggle is OFF:
    → No price persistence
    → Every sale starts fresh (no pre-fill)
    → Applies to ALL products uniformly per workspace
```

---

## Dataverse Schema (Minimal Change)

**ProductVariant table:**

```
Before:
  ├─ Name, DisplayName, NormalizedName
  ├─ ProductFamily (FK)
  ├─ Unit (FK)
  ├─ Workspace (FK)
  └─ [Other fields]

After (NO CHANGE TO ProductVariant):
  ├─ Name, DisplayName, NormalizedName
  ├─ ProductFamily (FK)
  ├─ Unit (FK)
  ├─ Workspace (FK)
  └─ [Other fields]
  
Note: LastSellUnitPrice is NOT scoped to a workspace column
      It's a single field across all workspaces (OK because the toggle controls behavior)
```

**NEW: WorkspaceSetting table (for workspace-level configuration):**

**REVISED APPROACH (Typed Columns):**

Instead of a key-value store pattern, use normalized typed columns for better type safety, SQL migration readiness, and cleaner app logic.

```
WorkspaceSetting (Typed Columns)
├─ WorkspaceSettingId (GUID, PK)
├─ Workspace (FK to Workspace, NOT NULL)
├─ UseLastSellUnitPrice (Boolean, default: true)
├─ NotificationLevel (Integer, default: 2, for future use)
├─ PriceRoundingDecimals (Integer, default: 2, for future use)
├─ CreatedOn (DateTime, auto)
└─ ModifiedOn (DateTime, auto)

Unique Constraint: (Workspace)
```

**Why Typed Columns (NOT Key-Value Store)?**
- ✅ Type safety: Boolean fields vs. string parsing ("true"/"false")
- ✅ SQL migration ready: Direct 1:1 column mapping to Phase B (no denormalization needed)
- ✅ Simpler app logic: `if (setting.UseLastSellUnitPrice)` vs. `if (settingValue = "true")`
- ✅ Performance: Single row lookup by Workspace FK, then direct column read (no key comparison)
- ✅ Self-documenting: Schema immediately shows which workspace settings exist
- ✅ Database constraints: Can enforce NOT NULL, CHECK constraints at DB level
- ⚠️ Trade-off: Requires ALTER TABLE to add new settings (acceptable; not changing weekly)

---

## Canvas App: Logic (Workspace-Level)

### **1. Load Setting on App Startup**

```
App.OnStart:
  
  // Initialize workspace from home screen
  Set(gblWorkspaceId, 'Home screen'.gblWorkspaceId);
  
  // Load workspace setting (typed column approach)
  Set(
    gblUseLastSellUnitPrice,
    LookUp(
      'WorkspaceSetting',
      Workspace = gblWorkspaceId
    ).UseLastSellUnitPrice
  );
  
  // Simpler than key-value: Direct boolean property instead of string parsing
```

### **2. In Sale Entry Screen (BUY / V1-02)**

**When user selects a product:**

```
cmpQtyStepper.OnChange:
  
  Set(varSelectedProduct, ThisComponent.Value);
  
  // Pre-fill price IF toggle is enabled
  If(
    gblUseLastSellUnitPrice,
    Set(varUnitPrice, varSelectedProduct.LastSellUnitPrice ?? 0),
    Set(varUnitPrice, 0)  // No pre-fill; leave blank
  );
```

**When user confirms sale:**

```
BtnCompleteSale.OnSelect:
  
  // Create Sale + SaleLine
  Patch(Sale, Defaults(Sale), {
    Name: "Sale_" & Now(),
    Workspace: gblWorkspaceId,
    SaleDate: Today(),
    Status: "Completed"
  });
  
  // Create SaleLine with user's unit price
  Patch(SaleLine, Defaults(SaleLine), {
    Name: "SaleLine_" & Now(),
    Sale: Last(Sale),
    ProductVariant: varSelectedProduct,
    Qty: varQty,
    UnitPrice: varUnitPrice,  // User's override OR pre-filled from toggle
    Workspace: gblWorkspaceId
  });
  
  // Update ProductVariant.LastSellUnitPrice IF toggle is enabled
  If(
    gblUseLastSellUnitPrice,
    Patch(ProductVariant, varSelectedProduct, {
      LastSellUnitPrice: varUnitPrice
    })
  );
  
  // Notify user
  ShowNotification("Venta registrada", "Success");
```

---

## Power Automate Flow: Simplest Integration

**No flow changes needed.**

The toggle decision happens in the Canvas app itself:

```
Canvas App (controls toggle behavior)
  → Creates SaleLine + updates productvariant.lastSellUnitPrice
  ↓
  (Only if toggle is ON)

Power Automate Flow (no changes)
  → Detects SaleLine creation
  → Creates InventoryEvent (if needed v2+)
  → Done
```

Rationale: Toggle logic is app-side (conditional update to LastSellUnitPrice)

---

## Settings Screen: V1-04 (New)

**Purpose:** Manage workspace-level configuration toggles

**Route:** Accessible from MainMenu → Settings

**Screen Layout:**

```
┌─────────────────────────────────────────────────┐
│  [Menu] Settings                          []    │ ← Header
├─────────────────────────────────────────────────┤
│                                                 │
│  Workspace Configuration                       │ ← Title
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │ [X] Use Last Sell Unit Price            │   │ ← Toggle
│  │     When enabled, the app will          │   │   (isCheked for setting)
│  │     remember the last price for each    │   │
│  │     product and use it as the default   │   │
│  │     for future sales.                   │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  [Save]  [Cancel]                              │ ← Actions
│                                                 │
└─────────────────────────────────────────────────┘
```

**State Management:**

```
varUseLastSellUnitPrice_Toggle: Boolean (user's current choice)

OnVisible:
  // Load current setting from Dataverse (typed column)
  Set(
    varUseLastSellUnitPrice_Toggle,
    LookUp(
      'WorkspaceSetting',
      Workspace = gblWorkspaceId
    ).UseLastSellUnitPrice
  );

BtnSave.OnSelect:
  // Update or create WorkspaceSetting (typed column approach)
  If(
    IsBlank(
      LookUp(
        'WorkspaceSetting',
        Workspace = gblWorkspaceId
      )
    ),
    // CREATE if doesn't exist
    Patch('WorkspaceSetting', Defaults('WorkspaceSetting'), {
      Workspace: gblWorkspaceId,
      UseLastSellUnitPrice: varUseLastSellUnitPrice_Toggle
    }),
    // UPDATE if exists
    Patch(
      'WorkspaceSetting',
      LookUp(
        'WorkspaceSetting',
        Workspace = gblWorkspaceId
      ),
      { UseLastSellUnitPrice: varUseLastSellUnitPrice_Toggle }
    )
  );
  
  // Reload global variable
  Set(
    gblUseLastSellUnitPrice,
    varUseLastSellUnitPrice_Toggle
  );
  
  ShowNotification("Configuración guardada", "Success");
  Back();
```

---

## Data Flow Diagram

```
Settings Screen (V1-04)
  │
  ├─ Toggle: ON / OFF
  │    └─→ Patch WorkspaceSetting (Dataverse)
  │
  └─→ Set gblUseLastSellUnitPrice (global variable)

          ↓
          
Buy Screen (V1-02)
  │
  ├─ Load product
  │    │
  │    └─→ Check gblUseLastSellUnitPrice
  │         ├─ If TRUE:  Pre-fill varUnitPrice = product.LastSellUnitPrice
  │         └─ If FALSE: Leave varUnitPrice blank
  │
  └─ User confirms sale
      │
      └─→ Create SaleLine + Update ProductVariant.LastSellUnitPrice
          (only if gblUseLastSellUnitPrice = TRUE)

              ↓
              
Dataverse workflow
  (no changes; flow operates regardless of toggle)
```

---

## What's NOT In V1 (Deferred)

| Feature | Why Deferred | Target Version |
|---------|------|---------|
| **Delta Display** | "We're not interested in showing the delta for now" | v1.1+ |
| **Reset Timer** | "We will not implement a reset timer" | v1.1+ |
| **Per-Product Toggle** | Complexity; workspace-level simpler | v1.2+ |
| **Price Decay** | Future; depends on pilot feedback | Post-pilot |

---

## Testing Checklist (V1-04 + V1-02)

### **Settings Screen (V1-04)**

| Scenario | Expected Outcome |
|----------|------------------|
| **Open Settings; toggle is OFF** | UI shows toggle unchecked |
| **Toggle ON; click Save** | WorkspaceSetting updated; gblUseLastSellUnitPrice = true |
| **Toggle OFF; click Save** | WorkspaceSetting updated; gblUseLastSellUnitPrice = false |
| **Navigate away; return to Settings** | Toggle state persists (matches Dataverse) |
| **Multiple users in same workspace** | Both see same toggle state (workspace-level) |
| **Different workspace (if multi-workspace)** | Toggle state isolated per workspace |

### **Buy Screen (V1-02) with Toggle ON**

| Scenario | Expected Outcome |
|----------|------------------|
| **Toggle ON; select product A (has LastSellUnitPrice = $10)** | varUnitPrice pre-fills = $10 |
| **User overrides to $12; confirms sale** | SaleLine.UnitPrice = $12; ProductA.LastSellUnitPrice updated to $12 |
| **Navigate back to Buy; select product A** | varUnitPrice pre-fills = $12 (new value) |
| **Select product B (no LastSellUnitPrice)** | varUnitPrice pre-fills = 0 (blank) |
| **User enters $8 for product B; confirms** | SaleLine.UnitPrice = $8; ProductB.LastSellUnitPrice = $8 |

### **Buy Screen (V1-02) with Toggle OFF**

| Scenario | Expected Outcome |
|----------|------------------|
| **Toggle OFF; select any product** | varUnitPrice stays blank (no pre-fill) |
| **User keeps blank; confirms** | SaleLine.UnitPrice = empty/null (error OR require input) |
| **User enters $15; confirms** | SaleLine.UnitPrice = $15; ProductVariant.LastSellUnitPrice NOT updated |
| **Navigate back; select same product** | varUnitPrice still blank (no persistence) |

---

## Extreme Simplicity: Why This Works

```
1. ONE toggle per workspace (not per product)
   → No product-specific logic
   → All products behave identically within that workspace

2. Toggle affects ONLY price pre-fill + persistence
   → Does NOT affect sales creation
   → Does NOT affect validation
   → Does NOT affect workflow

3. No UI chrome for toggle per transaction
   → No delta display (future)
   → No reset button (future)
   → No timer (future)
   → Just: "Use this price or override it"

4. Scales to multi-workspace
   → Workspace A: toggle ON → prices persist
   → Workspace B: toggle OFF → prices never persist
   → Same app code; different behavior

5. Future-proof
   → If you add delta/timer/per-product logic in v1.1+,
     this toggle is still the foundation
   → No breaking changes
```

---

## Implementation Effort

| Task | Effort | Notes |
|------|--------|-------|
| **Create WorkspaceSetting table** | 5 min | Simple; 5 columns |
| **Create Settings screen (V1-04)** | 30 min | Toggle + Save/Cancel |
| **Update Buy screen logic** | 20 min | Pre-fill + conditional update |
| **Update App.OnStart** | 5 min | Load gblUseLastSellUnitPrice |
| **Test all scenarios** | 30 min | 12 test cases |
| **TOTAL** | ~90 min | ~1.5 hours |

---

## Recommendations

1. **Implement this approach** — It's simple, scalable, and aligned with your "extreme simplicity" requirement
2. **Ship in Phase B** (Flows) — Can be done in parallel with purchase flow work
3. **Plan v1.1 enhancements** — Document delta display + reset timer as post-pilot refinements
4. **Gather pilot feedback** — After 2-3 weeks, ask users: "Do you want to see the delta? Do you want a reset?"

---

## Bottom Line

✅ **Workspace-level toggle** — Simple, applies uniformly to all products  
✅ **No delta/timer in V1** — Deferred to v1.1 based on pilot feedback  
✅ **Scales to multi-workspace** — Toggle behavior isolated per workspace  
✅ **Implemented in Canvas app** — No Power Automate changes needed  
✅ **Ready for Phase A integration** — Minimal Dataverse schema change  

🎯 **This is the right balance: pragmatic now, extensible later.**

