# Vertical 1: Complete Data Flow Architecture

**Project:** Retailer Management Tool - Purchase Vertical  
**Date:** 2026-04-11  
**Focus:** Understanding app state, screen navigation, and data lifecycle  
**Audience:** Developer building end-to-end flow  

---

## Part 1: Global Variables & Lifecycle

### **Global Variables: Where They Get Set (Not in App.OnStart)**

⚠️ **IMPORTANT:** Do NOT initialize global variables with `Blank()` in `App.OnStart`. This causes Power Apps type errors. Instead, let each variable be Set naturally where it's first used. Power Apps infers the type from the assigned value.

**Recommended Approach:** Leave `App.OnStart` empty (or use it only for non-global initialization). Each global is Set contextually where it's needed.

---

### **Global Variables Reference**

#### **WORKSPACE CONTEXT GLOBALS (Set once per session)**

```powerapps
// ============ gblWorkspaceId ============
// Holds: GUID of user's workspace (auto-assigned)
// Set on: App.OnStart (auto-detect current user's workspace)
//         Set(gblWorkspaceId, 
//           LookUp(WorkspaceMember, 
//             'User'.'User ID' = User().Email).Workspace.ID
//         );
// Used by: ALL screens (filters all data)
// Lifetime: Session
// Type: Text (GUID)
// NOTE: No manual selection needed - each user has one workspace

// ============ gblWorkspaceName ============
// Holds: Display name of workspace
// Set on: App.OnStart (auto-detect from current user's workspace)
//         Set(gblWorkspaceName, 
//           LookUp(WorkspaceMember, 
//             'User'.'User ID' = User().Email).Workspace.Name
//         );
// Used by: All screens for display (header label)
// Lifetime: Session
// Type: Text
// NOTE: Always matches gblWorkspaceId
```

#### **PURCHASE TRANSACTION GLOBALS (Set during purchase entry on V1-02)**

```powerapps
// ============ selectedProvider ============
// Holds: Provider record selected by user
// Set on: V1-02 ddlProvider.OnChange
//         Set(selectedProvider, ddlProvider.Selected);
// Used by: V1-02 to filter product dropdown, lookup pricing
// Reset on: After purchase confirmation
//          Set(selectedProvider, {});
// Lifetime: Single purchase transaction
// Type: Record

// ============ selectedProduct ============
// Holds: ProductVariant record selected by user
// Set on: V1-02 ddlProduct.OnChange
//         Set(selectedProduct, ddlProduct.Selected);
// Used by: V1-02 to display product info, lookup pricing cache
// Reset on: After purchase confirmation
//          Set(selectedProduct, {});
// Lifetime: Single purchase transaction
// Type: Record

// ============ lastProviderPrice ============
// Holds: Last price this provider had for selected product
// Fetched from: ProviderProductPrice table via LookUp
// Set on: V1-02 ddlProduct.OnChange
//         Set(lastProviderPrice, 
//           LookUp(ProviderProductPrice,
//             Workspace.Value = gblWorkspaceId &&
//             Provider.Value = selectedProvider.ID &&
//             ProductVariant.Value = selectedProduct.ID).LastPurchasePrice
//         );
// Used by: V1-02 to auto-fill price field (display only)
// Reset on: After purchase confirmation
//          Set(lastProviderPrice, 0);
// Lifetime: Single purchase transaction
// Type: Number

// ============ productPrice ============
// Holds: Unit price for purchase (auto-populated or user-entered)
// Set on (auto): V1-02 ddlProduct.OnChange
//                Set(productPrice, If(IsBlank(lastProviderPrice), 0, lastProviderPrice));
// Set on (user): V1-02 txtPrice.OnChange
//                Set(productPrice, Value(txtPrice.Text));
// Used by: V1-02 display + Purchase confirmation Patch
// Reset on: After purchase confirmation
//          Set(productPrice, 0);
// Lifetime: Single purchase transaction
// Type: Number

// ============ qty ============
// Holds: Quantity user wants to purchase
// Set on: V1-02 txtQty.OnChange
//         Set(qty, Value(txtQty.Text));
// Used by: V1-02 display + Purchase confirmation Patch
// Reset on: After purchase confirmation
//          Set(qty, 0);
// Lifetime: Single purchase transaction
// Type: Number

// ============ lastPurchaseId ============
// Holds: ID of Purchase header record just created
// Set on: After bgnConfirmPurchase (Purchase Patch succeeds)
//         Set(lastPurchaseId, LookUp(Purchase, <criteria>).ID);
// Used by: Link PurchaseLine FK to Purchase record
// Reset on: After purchase confirmation complete
//          Set(lastPurchaseId, "");
// Lifetime: Single purchase transaction
// Type: Text (GUID)
```

#### **OPTIONAL: WORKSPACE SETTINGS GLOBALS**

```powerapps
// ============ workspaceSetting ============
// Holds: Row from WorkspaceSetting table for current workspace
// Set on: V1-03 Settings screen OnVisible
//         Set(workspaceSetting, 
//           LookUp(WorkspaceSetting, Workspace.Value = gblWorkspaceId)
//         );
// Used by: V1-03 Settings toggle display
// Reset on: N/A (persisted in Dataverse, not client reset)
// Lifetime: Session
// Type: Record
```

---

### **App.OnStart: Auto-Detect User's Workspace**

```powerapps
// App.OnStart event (sets up workspace context for session)

// ============================================
// AUTO-DETECT CURRENT USER'S WORKSPACE
// ============================================

// Get WorkspaceMember record for current logged-in user
With(
  {currentUserEmail: User().Email},
  Set(gblWorkspaceId, 
    LookUp(WorkspaceMember, 
      'User'.'User ID' = currentUserEmail
    ).Workspace.ID
  );
  Set(gblWorkspaceName, 
    LookUp(WorkspaceMember, 
      'User'.'User ID' = currentUserEmail
    ).Workspace.Name
  )
);

// Result:
// - gblWorkspaceId = User's workspace GUID
// - gblWorkspaceName = User's workspace name
// - App then navigates directly to V1-02 Buy (skip Home)

// If user has no workspace membership:
// - Optionally show error: Notify("No workspace assigned", NotificationType.Error)
// - Or navigate to error screen
```

---

## Part 2: Screen Navigation Architecture

### **Navigation Flow Diagram**

```
┌─────────────────────────────────────────────────────────┐
│                                               │
│  ╔════════════════════════════════════╗      │
│  ║  APP STARTUP                       ║      │
│  ║  App.OnStart runs                  ║      │
│  ║  AUTO-DETECT USER'S WORKSPACE      ║      │
│  ║  - gblWorkspaceId set              ║      │
│  ║  - gblWorkspaceName set            ║      │
│  ║  - Navigate to V1-02 directly      ║      │
│  ╚════════════════════════════════════╝      │
│                    │                          │
│                    ▼                          │
│  ╔════════════════════════════════════╗      │
│  ║  V1-02 BUY (Launch Screen)         ║      │
│  ║  (Primary Entry Point)             ║      │
│  ║  - Workspace already set           ║      │
│  ║  - User can immediately:           ║      │
│  ║    > Select Provider               ║      │
│  ║    > Purchase                      ║      │
│  ╚════════════════════════════════════╝      │
│                    │                          │
│        ┌───────────┼───────────┐             │
│        │           │           │             │
│        ▼           ▼           ▼             │
│  ╔══════════╗ ╔══════════╗ ╔══════════╗    │
│  ║ V1-02    ║ ║ V1-03    ║ ║ V1-04    ║    │
│  ║ BUY      ║ ║SETTINGS  ║ ║INVENTORY ║    │
│  ║(Loop)    ║ ║(Optional)║ ║(View)    ║    │
│  ╚══════════╝ ╚══════════╝ ╚══════════╝    │
│        │           │           │             │
│        └───────────┼───────────┘             │
│              ↓     ↓                         │
│        Back to V1-02 (loop)                │
│                                            │
│  NOTE: No Home screen needed!
│  └──► Each user has one workspace
│  └──► Auto-assigned at app startup
│                                            │
└─────────────────────────────────────────────────────────┘
```

### **Navigation Code Snippets**

```powerapps
// ============================================
// APP STARTUP → V1-02 BUY (Auto-Detection)
// ============================================

// In App.OnStart:
With(
  {currentUserEmail: User().Email},
  Set(gblWorkspaceId, 
    LookUp(WorkspaceMember, 
      'User'.'User ID' = currentUserEmail
    ).Workspace.ID
  );
  Set(gblWorkspaceName, 
    LookUp(WorkspaceMember, 
      'User'.'User ID' = currentUserEmail
    ).Workspace.Name
  );
  Navigate(scrV1Buy, ScreenTransition.Fade)
);

// Result: App launches directly to purchase screen

// ============================================
// V1-02 BUY → V1-03 SETTINGS (Optional)
// ============================================

// Button on V1-02:
Button "⚙ Settings"
  OnSelect: Navigate(scrV1Settings, ScreenTransition.Fade)

// ============================================
// V1-02 BUY → V1-04 INVENTORY (Optional)
// ============================================

// Button on V1-02:
Button "📦 Inventory"
  OnSelect: Navigate(scrV1Inventory, ScreenTransition.Fade)

// ============================================
// ANY SCREEN → V1-02 BUY
// ============================================

// Button "Back to Purchase":
// On V1-03 Settings:
Button "← Back to Purchase"
  OnSelect: Navigate(scrV1Buy, ScreenTransition.Fade)

// On V1-04 Inventory:
Button "← Back to Purchase"
  OnSelect: Navigate(scrV1Buy, ScreenTransition.Fade)

// ============================================
// NO "HOME" BUTTON NEEDED
// ============================================

// Workspace is user-specific and set once per session
// User cannot change it (each user has exactly one workspace)
// If user needs different workspace: assigned by admin in WorkspaceMember table
```

---

## Part 3: Data State by Screen

### **Screen-by-Screen Data Availability**

#### **🏠 V1-01 HOME (DEPRECATED - No Longer Needed)**

**Status:** This screen is no longer needed.

**Reason:** Workspace is user-centric and auto-assigned at app startup via `App.OnStart`. The user cannot select a different workspace because each user is assigned to exactly one workspace by the administrator in the `WorkspaceMember` table.

**Flow Change:**
- **Old:** App.OnStart (blank) → V1-01 Home (select workspace) → V1-02 Buy
- **New:** App.OnStart (auto-detect workspace) → V1-02 Buy directly

**Remove:** You can delete V1-01 Home screen entirely, or keep it as a placeholder for future multi-workspace support.

---

#### **🛒 V1-02 BUY (Purchase Entry - PRIMARY LAUNCH SCREEN)**

```
ENTERING V1-02 (app startup):
├─ gblWorkspaceId: Set (from App.OnStart auto-detection)
├─ gblWorkspaceName: Set (from App.OnStart auto-detection)
├─ selectedProvider: Blank
├─ selectedProduct: Blank
├─ lastProviderPrice: Blank
├─ productPrice: 0
├─ qty: 0
└─ lastPurchaseId: Blank

SCREEN.OnVisible EVENT:
├─ Refresh/reload all tables:
│  ├─ Refresh(Provider)
│  ├─ Refresh(ProductVariant)
│  ├─ Refresh(ProviderProductPrice)
│  └─ Refresh(StockBatch)
└─ Reset all transaction globals to blank/0

DATA AVAILABLE ON SCREEN (Filtered by gblWorkspaceId):

1. ddlProvider.Items:
   └─ Filter(Provider, Workspace.Value = gblWorkspaceId)
   └─ Shows: All providers in your workspace

2. ddlProduct.Items (AFTER provider selected):
   └─ Filter(ProductVariant,
        Workspace.Value = gblWorkspaceId &&
        IsActive = true)
   └─ Shows: All active products in workspace (global catalog)

3. ProviderProductPrice (Lookup on product select):
   └─ LookUp(ProviderProductPrice,
        Workspace.Value = gblWorkspaceId &&
        Provider.Value = selectedProvider.ID &&
        ProductVariant.Value = selectedProduct.ID)
   └─ Returns: lastProviderPrice (or Blank if first time)

WORKFLOW: Provider → Product → Price → Qty → Confirm

Step 1: ddlProvider.OnChange
├─ Set(selectedProvider, ddlProvider.Selected)
├─ Set(selectedProduct, Blank())  ← Reset product
├─ Disable ddlProduct temporarily
└─ Show message: "Provider selected"

Step 2: ddlProduct.OnChange (after provider selected)
├─ Set(selectedProduct, ddlProduct.Selected)
├─ LookUp in ProviderProductPrice
│  └─ Set(lastProviderPrice, [result or Blank])
├─ Auto-fill price:
│  └─ Set(productPrice, If(IsBlank(lastProviderPrice), 0, lastProviderPrice))
└─ Show message: "Last price: $X" or "First time buying"

Step 3: Price/Qty Input
├─ txtPrice input linked to Set(productPrice, value)
├─ txtQty input linked to Set(qty, value)
└─ User can override auto-filled price

Step 4: btnConfirmPurchase.OnSelect
├─ Validate all fields
├─ Patch Purchase (create header)
├─ LookUp Purchase (get new ID)
├─ Patch PurchaseLine (create transaction line)
├─ Patch ProviderProductPrice (update cache)
├─ Patch StockBatch (add to inventory)
├─ Show success notification
├─ Reset ALL form fields and globals
└─ Ready for next purchase

EXITING V1-02 (After Confirm):
├─ All purchase transaction globals: Reset to blank/0
├─ All input fields: Cleared
├─ Purchase completed and logged in Dataverse
├─ Screen ready for next purchase
└─ User can:
   ├─ Enter another purchase (same provider)
   ├─ Enter purchase from different provider
   ├─ Navigate to Settings or Inventory
   └─ Go Home (change workspace)

EXITING V1-02 (Without Confirm):
├─ Navigate to Settings or Inventory
├─ Transaction globals preserved (user might go back)
├─ (Optional: could clear on exit if desired)
```

**Key State Transitions:**
```
                  [SELECT PROVIDER]
                          │
                          ▼
    ddlProduct = Disabled ──────► ddlProduct = Enabled
    productPrice = 0
    
                  [SELECT PRODUCT]
                          │
        ┌───────────────────┴────────────────────┐
        │                                        │
    [IF HISTORY]                           [IF NO HISTORY]
        │                                        │
        ▼                                        ▼
    productPrice = $0.50                   productPrice = 0
    lblLastPrice = Green                   lblLastPrice = Orange
    ("Last price")                           ("First time buying")
    
                  [ENTER QTY + PRICE]
                          │
                          ▼
                  [CLICK CONFIRM]
                          │
        ┌───────────────────┴────────────────────┐
        │                                        │
    [IF VALID]                              [IF INVALID]
        │                                        │
        ▼                                        ▼
    Create Purchase                       Notify Error
    Create PurchaseLine            Return (stay on screen)
    Update ProviderProductPrice
    Create StockBatch
        │
        ▼
    Show Success
    Reset ALL fields
    Ready for next
```

---

#### **⚙️ V1-03 SETTINGS (Optional Toggle)**

```
ENTERING V1-03:
├─ gblWorkspaceId: Set (from Home)
├─ gblWorkspaceName: Set (from Home)
├─ All transaction globals: May have residual values
└─ workspaceSetting: Blank

SCREEN.OnVisible EVENT:
├─ Load WorkspaceSetting for current workspace:
│  └─ Set(workspaceSetting,
│       LookUp(WorkspaceSetting, 
│         Workspace.Value = gblWorkspaceId))
└─ Bind toggle to workspaceSetting.UseLastSellUnitPrice

DATA AVAILABLE:
├─ One WorkspaceSetting record per workspace
├─ Toggle: UseLastSellUnitPrice (Yes/No)
└─ Other future settings (can extend)

ON TOGGLE CHANGE:
├─ If record exists:
│  └─ Patch(WorkspaceSetting, workspaceSetting, {UseLastSellUnitPrice: newValue})
├─ Else:
│  └─ Create new WorkspaceSetting record
└─ Show success notification

NOTE: Settings persist in Dataverse
└─ Impact: Future purchases will respect this toggle
```

---

#### **📦 V1-04 INVENTORY (Stock View - Reference)**

```
ENTERING V1-04:
├─ gblWorkspaceId: Set (from Home)
├─ gblWorkspaceName: Set (from Home)
└─ READ-ONLY screen (no data modified)

SCREEN.OnVisible EVENT:
├─ Refresh(StockBatch)
├─ Refresh(ProductVariant)
└─ Load inventory for display

DATA AVAILABLE (Read-Only):

1. ProductVariant table:
   └─ Filter(ProductVariant, Workspace.Value = gblWorkspaceId)
   └─ Shows: All products in workspace
   └─ Calculates: CurrentStockLevel = Sum(StockBatch quantities)

2. StockBatch table (grouped by ProductVariant):
   └─ Filter(StockBatch,
        ProductVariant.Value = ThisProductId &&
        Workspace.Value = gblWorkspaceId)
   └─ Shows: FIFO batches (batches with oldest date first)
   
DISPLAY:
├─ Main gallery: All products + current stock level
├─ Nested gallery: Batch details per product
│  ├─ BatchDate
│  ├─ Qty in batch
│  ├─ Days in inventory
│  └─ Status (available / near expiry / expired)
└─ No actions (view only in v1)

SCREEN.OnVisible (Optional):
├─ Can calculate:
│  ├─ Days in inventory per batch
│  ├─ Stock warnings (low qty)
│  └─ Expiry alerts (if using expiry dates)
└─ For reference/analytics
```

---

## Part 4: Complete Purchase Transaction Flow

### **Purchase Lifecycle: From Click to Dataverse**

```
┌─────────────────────────────────────────────────────────────┐
│  USER CLICKS: btnConfirmPurchase                            │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
      ┌───────────────────────────────────────┐
      │  VALIDATION LAYER                     │
      ├─ Is selectedProvider not blank?       │
      ├─ Is selectedProduct not blank?        │
      ├─ Is qty > 0?                          │
      └─ Is productPrice > 0?                 │
                          │
           ┌──────────────┴──────────────┐
           │                             │
      [INVALID]                      [VALID]
           │                             │
           ▼                             ▼
      Show Error              ┌──────────────────────┐
      Notify & Return         │  TRANSACTION START   │
      (Stay on screen)        │  (6 operations)      │
                              └──────────────────────┘
                                        │
        ┌─────────────────────────────────┼──────────────────────────────┐
        │                                 │                              │
        ▼                                 ▼                              ▼
    [1] Create Purchase             [2] Get Purchase ID          [3] Create PurchaseLine
        Header                          &LOOKUP                       Transaction
        ┌──────────────┐                 │                          ┌──────────────┐
        │ Patch to:    │                 ▼                          │ Patch to:    │
        │ Purchase     │                                            │ PurchaseLine │
        │ ├Workspace   │            [3] Create                     │ ├Purchase FK │
        │ ├Provider    │                PurchaseLine               │ ├ProductVar  │
        │ ├Date        │                 with Unit Price           │ ├Qty         │
        │ └Status      │                                            │ ├UnitPrice   │
        └──────────────┘                                            │ └Workspace   │
                                                                     └──────────────┘
        │                                                                 │
        └────────────────┬─────────────────────────────────────────────────┘
                         │
        ┌────────────────┴────────────────┐
        │                                 │
        ▼                                 ▼
    [4] Update Provider             [5] Create StockBatch
        ProductPrice Cache              FIFO Inventory
        ┌────────────────┐              ┌──────────────┐
        │ Patch to:      │              │ Patch to:    │
        │ ProviderProduct│              │ StockBatch   │
        │ Price          │              │ ├ProductVar  │
        │ ├Provider FK   │              │ ├Qty         │
        │ ├ProductVar    │              │ ├BatchDate   │
        │ ├LastPrice = $ │              │ └Workspace   │
        │ ├LastUpdated   │              └──────────────┘
        │ └IsActive      │                     │
        └────────────────┘                     │
                                               │
        ┌──────────────────────────────────────┘
        │
        ▼
    [6] SUCCESS & RESET
        ├─ Notify "Purchase recorded!"
        ├─ Reset txtQty (blank)
        ├─ Reset txtPrice (blank)
        ├─ Set(selectedProvider, Blank())
        ├─ Set(selectedProduct, Blank())
        ├─ Set(lastProviderPrice, Blank())
        ├─ Set(productPrice, 0)
        ├─ Set(qty, 0)
        └─ Set(lastPurchaseId, Blank())
                │
                ▼
        ┌──────────────────────────┐
        │ SCREEN READY FOR NEXT    │
        │ PURCHASE                 │
        │ ├ Dropdowns cleared      │
        │ ├ Globals reset          │
        │ ├ Form fields empty      │
        │ └ (Dataverse automated   │
        │    CreatedOn, ModifiedOn)│
        └──────────────────────────┘
```

### **Data Persistence Timeline**

```
TIMELINE: Before → During → After Purchase Confirmation

┌──────────────────────────────────────────────────────────────┐
│ BEFORE CONFIRM (User is filling form)                       │
├──────────────────────────────────────────────────────────────┤
│ Location: Power Apps Memory Only (Client-Side)              │
│                                                               │
│ selectedProvider = {ID: abc..., Name: "Supplier A"}         │
│ selectedProduct = {ID: def..., Name: "Bananas"}             │
│ lastProviderPrice = 0.50                                     │
│ productPrice = 0.52 (user changed)                          │
│ qty = 10                                                     │
│                                                               │
│ Dataverse Tables: NOT MODIFIED YET                          │
│ Persistence: Session memory only (lost if user closes app)  │
│                                                               │
│ Risk: If app crashes, user loses form data                  │
└──────────────────────────────────────────────────────────────┘
                            │
                            │ USER CLICKS CONFIRM
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
│ DURING CONFIRM (Patch operations execute)                   │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│ [Operation 1] Patch Purchase                                │
│   └─ Dataverse receives: Workspace, Provider, Date, Status  │
│   └─ Dataverse auto-generates: ID, CreatedOn               │
│   └─ Status: Committed to DB                               │
│                                                               │
│ [Operation 2] LookUp Purchase (get new ID)                 │
│   └─ Reads from Dataverse: Retrieves Purchase.ID           │
│   └─ Sets: lastPurchaseId = (new GUID)                     │
│                                                               │
│ [Operation 3-5] Patch PurchaseLine, ProviderProductPrice,  │
│                 StockBatch                                   │
│   └─ All reference Purchase.ID via FK                       │
│   └─ All include gblWorkspaceId for multi-tenancy          │
│   └─ Status: Committed to DB                               │
│                                                               │
│ Atomicity: All-or-nothing (if any fails, user sees error)  │
└──────────────────────────────────────────────────────────────┘
                            │
                            │ ALL OPERATIONS SUCCEED
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
│ AFTER CONFIRM (Dataverse + Client reset)                    │
├──────────────────────────────────────────────────────────────┤
│ Dataverse Tables: Transaction Recorded                      │
│                                                               │
│ Purchase Table:                                              │
│   ID: {new GUID}                                            │
│   Workspace: gblWorkspaceId                                 │
│   Provider: Supplier A                                      │
│   Date: 2026-04-11                                          │
│   Status: "Completed"                                       │
│   CreatedOn: 2026-04-11 14:32:45 (auto)                    │
│   ModifiedOn: 2026-04-11 14:32:45 (auto)                   │
│                                                               │
│ PurchaseLine Table:                                          │
│   ID: {new GUID}                                            │
│   Purchase: → Purchase.ID (FK)                              │
│   ProductVariant: → Bananas (FK)                           │
│   Qty: 10                                                   │
│   UnitPrice: 0.52                                           │
│   Workspace: gblWorkspaceId                                │
│   CreatedOn: 2026-04-11 14:32:46 (auto)                    │
│                                                               │
│ ProviderProductPrice Table:                                 │
│   Provider: → Supplier A (FK)                               │
│   ProductVariant: → Bananas (FK)                           │
│   Workspace: gblWorkspaceId                                │
│   LastPurchasePrice: 0.52 ◄───── UPDATED from 0.50        │
│   LastUpdatedDate: 2026-04-11 14:32:47                     │
│   IsActive: true                                            │
│   ModifiedOn: 2026-04-11 14:32:47 (auto)                    │
│                                                               │
│ StockBatch Table:                                            │
│   ID: {new GUID}                                            │
│   ProductVariant: → Bananas (FK)                           │
│   Qty: 10 ◄───── ADDED TO INVENTORY                         │
│   BatchDate: 2026-04-11                                     │
│   Workspace: gblWorkspaceId                                │
│   CreatedOn: 2026-04-11 14:32:47 (auto)                    │
│                                                               │
│ Client-Side (Power Apps Memory):                            │
│   selectedProvider = Blank() ← CLEARED                      │
│   selectedProduct = Blank() ← CLEARED                       │
│   productPrice = 0 ← RESET                                  │
│   qty = 0 ← RESET                                           │
│   lastProviderPrice = Blank() ← CLEARED                     │
│   lastPurchaseId = Blank() ← CLEARED                        │
│   Form fields: Empty ← CLEARED                              │
│                                                               │
│ Dataverse Persistence: PERMANENT                            │
│ └─ Data recoverable if app closes                          │
│ └─ Next user session sees same data                        │
│ └─ Available for reports/analytics                         │
└──────────────────────────────────────────────────────────────┘
```

---

## Part 5: Key Design Patterns

### **Pattern 1: Global Variable Scoping**

```
RULE: gblWorkspaceId FILTERS ALL QUERIES

Every data source query must include:
  Workspace.Value = gblWorkspaceId

❌ WRONG:
  Items: Filter(ProductVariant, IsActive = true)
  └─ Shows products from ALL workspaces!

✅ CORRECT:
  Items: Filter(ProductVariant, 
           Workspace.Value = gblWorkspaceId &&
           IsActive = true)
  └─ Shows only products from selected workspace
```

### **Pattern 2: Auto-Populate Pricing**

```
FLOW:
1. User selects provider → [selectedProvider set]
2. Product dropdown enabled
3. User selects product → [selectedProduct set]
4. Lookup ProviderProductPrice:
   LookUp(ProviderProductPrice,
     Workspace.Value = gblWorkspaceId &&      ← Multi-tenant
     Provider.Value = selectedProvider.ID &&   ← This provider
     ProductVariant.Value = selectedProduct.ID ← This product
   ).LastPurchasePrice
5. If result: Set(productPrice, result)
   Else: Set(productPrice, 0) ← User enters
```

### **Pattern 3: Transaction Atomicity**

```
All-or-nothing purchase:
├─ Must create Purchase first (gets ID)
├─ Must create PurchaseLine (links to Purchase)
├─ Must update ProviderProductPrice (cache)
├─ Must create StockBatch (inventory)
├─ If ANY step fails: Show error, user retries
└─ If ALL succeed: Show success, reset form

NO PARTIAL TRANSACTIONS:
└─ User sees purchase confirmed or error
└─ Dataverse shows complete transaction or nothing
```

### **Pattern 4: Form Reset After Success**

```
After successful purchase confirmation:
├─ Reset(txtQty) → Clears input field
├─ Reset(txtPrice) → Clears input field
├─ Set(selectedProvider, Blank()) → Re-enables fresh selection
├─ Set(selectedProduct, Blank()) → Ready for next
├─ Set(lastProviderPrice, Blank())
├─ Set(productPrice, 0)
├─ Set(qty, 0)
└─ Set(lastPurchaseId, Blank())

REASON: User can immediately enter another purchase
WITHOUT switching screens
```

---

## Part 6: Data Refresh Strategy

### **When Data Needs Refreshing**

```
SCREEN ENTRY (V1-02 OnVisible):
├─ Refresh(Provider) ← Get latest providers
├─ Refresh(ProductVariant) ← Get latest products
├─ Refresh(ProviderProductPrice) ← Get latest prices
└─ Refresh(StockBatch) ← Get latest inventory

REASON: Other users may have modified data
└─ Another manager added new suppliers
└─ Another manager added new products
└─ Prices may have changed
└─ Inventory levels may have changed

AFTER PURCHASE CONFIRM:
├─ Refresh(ProviderProductPrice) ← Cache just updated
├─ Refresh(StockBatch) ← Inventory just updated
└─ Notify user that form is ready for next purchase

OPTIONAL: Auto-refresh every 30 seconds
├─ Use Timer control
├─ Refresh data sources
└─ Keep displayed data current
```

---

## Part 7: Application State Diagram

```
Application State Machine:

┌─────────────────────────────┐
│  APP STARTUP                │
│  App.OnStart executes       │
│  AUTO-DETECT WORKSPACE      │
│ └ gblWorkspaceId: SET       │
│ └ gblWorkspaceName: SET     │
│ └ Navigate to V1-02         │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│ V1-02 BUY (Primary Screen)  │
│ State (OnVisible):          │
│ └gblWorkspaceId: SET        │  ◄─── Already set by App.OnStart
│ └gblWorkspaceName: SET      │
│ └selectedProvider: BLANK    │
│ └selectedProduct: BLANK     │
│ └productPrice: 0            │
│ └qty: 0                      │
└────────┬────────────────────┘
         │
    [USER ACTIONS]
         │
         ├─→ [SELECT PROVIDER]
         │   └─▶ selectedProvider: SET
         │       └─▶ ddlProduct: ENABLED
         │
         ├─→ [SELECT PRODUCT]
         │   └─▶ selectedProduct: SET
         │   └─▶ lastProviderPrice: SET or BLANK
         │   └─▶ productPrice: AUTO-FILLED or 0
         │
         ├─→ [CHANGE PROVIDER/PRODUCT]
         │   └─▶ Can restart anytime before confirm
         │
         ├─→ [CONFIRM PURCHASE] ◄─── MAIN ACTION
         │   │
         │   ├─→ [VALIDATION FAILS]
         │   │   └─▶ Error notification
         │   │   └─▶ Stay on screen
         │   │   └─▶ User can fix and retry
         │   │
         │   └─→ [VALIDATION SUCCEEDS]
         │       └─▶ Create 4 records in Dataverse
         │       └─▶ Update ProviderProductPrice cache
         │       └─→ Success notification
         │       └─▶ RESET ALL FORM FIELDS & GLOBALS
         │       └─▶ ┌──────────────────────┐
         │            │ V1-02 BUY (Ready)     │
         │            │ └All fields: BLANK    │  ◄─── Ready for next purchase
         │            │ └All globals: BLANK   │
         │            └──────────────────────┘
         │            │
         │            └─→ [NEXT PURCHASE] → Back to user actions
         │
         ├─→ [NAVIGATE TO SETTINGS]
         │   └─→ V1-03 SETTINGS
         │       └─▶ Can toggle settings
         │       └─▶ Settings persist in Dataverse
         │       └─▶ Back to V1-02 (state preserved)
         │
         ├─→ [NAVIGATE TO INVENTORY]
         │   └─→ V1-04 INVENTORY (read-only)
         │       └─▶ View stock levels
         │       └─▶ Back to V1-02 (state preserved)
         │
         └─→ NO HOME BUTTON
             └─▶ User is locked to assigned workspace
             └─▶ Workspace cannot be changed in app
             └─▶ Admin manages workspace in WorkspaceMember
```

---

## Summary: Data Flow Overview

```
APP ARCHITECTURE:
┌─────────────────────────────────────────┐
│  CLIENT LAYER (Power Apps)              │
│  ├─ Screens (V1-01, V1-02, V1-03, V1-04│
│  ├─ Global variables (gblWorkspaceId, │
│  │                    selectedProvider, │
│  │                    selectedProduct)  │
│  └─ Form validation + UX               │
├─────────────────────────────────────────┤
│  DATA LAYER (Dataverse)                 │
│  ├─ Purchase (header)                   │
│  ├─ PurchaseLine (transactions)         │
│  ├─ ProviderProductPrice (cache)        │
│  ├─ StockBatch (inventory)              │
│  ├─ ProductVariant (catalog)            │
│  ├─ Provider (suppliers)                │
│  └─ Workspace (multi-tenancy)           │
└─────────────────────────────────────────┘

DATA FLOW:
1. User selects workspace → gblWorkspaceId set
2. V1-02 loads → Filters all data by gblWorkspaceId
3. User selects provider → LookUp available products
4. User selects product → LookUp last price (auto-fill)
5. User confirms → Create 4 Dataverse records
6. ProviderProductPrice cache updated
7. Form reset → Ready for next purchase
8. Repeat from step 3
```

---

**Next Document:** Specific screen-building guide with copy-paste formulas ([VERTICAL-1-BUY-PURCHASE-WORKFLOW.md](VERTICAL-1-BUY-PURCHASE-WORKFLOW.md))
