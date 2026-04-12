# Vertical 1 Assembly Plan: Phase A Build Execution

**Project:** Retailer Management Tool - Phase A Vertical 1 (Home → Buy → Settings → Inventory)  
**Start Date:** 2026-04-11  
**Target:** Working end-to-end sale transaction by 2026-04-13  
**Audience:** Developer building for first time  

---

## Overview: What You're Building

**Goal:** Create 4 screens that allow a store manager to:
1. **V1-01 (Home)**: Select their workspace
2. **V1-02 (Buy)**: Record a sale (products + quantities)
3. **V1-03 (Settings)**: Toggle LastSellUnitPrice behavior per workspace
4. **V1-04 (Inventory)**: View current stock levels

**Architecture:** Canvas app connected to Dataverse; multi-workspace scoped via gblWorkspaceId

**Success Metric:** User can complete 1 full sale → verify data in Dataverse → repeat 5 times without errors

---

## Part 1: PRE-BUILD CHECKLIST (Before Opening Canvas App)

### ☐ **1.1 Dataverse Data Model Confirmed**

**Action:** Verify these tables exist + have required fields:

| Table | Required Fields | Status |
|-------|---|---|
| Workspace | Name, Partition Key, Description | ☐ Verify |
| WorkspaceMember | User (lookup), Workspace (lookup), Role, IsManager | ☐ Verify |
| ProductFamily | Name, Description | ☐ Verify |
| ProductVariant | Name, ProductFamily (lookup), UnitOfMeasure, CurrentStockLevel, LastSellUnitPrice, Workspace (lookup) | ☐ Verify |
| Purchase | Workspace (lookup), Date, Status, Notes | ☐ Verify |
| PurchaseLine | Purchase (lookup), ProductVariant (lookup), Qty, UnitPrice, Workspace (lookup) | ☐ Verify |
| SaleLine | Workspace (lookup), ProductVariant (lookup), Qty, UnitPrice, CreatedOn (auto) | ☐ Verify |
| StockBatch | ProductVariant (lookup), Qty, BatchDate, Workspace (lookup) | ☐ Verify |
| WorkspaceSetting | Workspace (lookup), UseLastSellUnitPrice (choice: Yes/No) | ☐ Verify |

**How to Verify:**
1. Power Apps → Solutions → Your solution
2. For each table, check columns exist (Power Apps will show warnings if missing)

---

### ☐ **1.2 Test Data Seeded**

**Action:** Create minimum test data in Dataverse (manual UI — fastest)

| Record | Where to Create | What to Create | Status |
|--------|---|---|---|
| Workspace | Dataverse → Workspace table | "Pilot Workspace" (copy GUID to notepad) | ☐ Done |
| WorkspaceMember | Related within Workspace | You logged in + Role=Owner | ☐ Done |
| ProductFamily | Dataverse → ProductFamily | "Fresh Produce", "Dairy", "Beverages" | ☐ Done |
| ProductVariant | Dataverse → ProductVariant | 5 products (e.g., Bananas, Milk, Eggs) with ProductFamily set | ☐ Done |
| StockBatch | Dataverse → StockBatch | Initial inventory: each product qty=50; ProductVariant + Workspace linked | ☐ Done |
| WorkspaceSetting | Dataverse → WorkspaceSetting | One record: Workspace + UseLastSellUnitPrice=No | ☐ Done |

**Time: ~15 minutes manual entry**

**Note:** If you want to automate, build a Power Automate flow instead (see PHASE-A-PRACTICAL-SETUP-GUIDE.md, Scenario 1, Option B)

---

### ☐ **1.3 Environment Variables + Connection Reference Set Up**

**Action:** Create in Power Apps

| Item | Name | Value | Status |
|------|------|-------|--------|
| Environment Variable | DataverseURL | https://yourorg.crm.dynamics.com | ☐ Create |
| Connection Reference | Dataverse Connection | [Select your Dataverse env] | ☐ Create |

**How to Create DataverseURL Env Var:**
1. Power Apps → Solutions → Your solution → + New → More → Environment Variable
2. Name: `DataverseURL`
3. Data Type: Text
4. Current Value: (from Dataverse Settings → Instance Details → your URL)
5. Save

**How to Create Connection Reference:**
1. Power Apps → Solutions → Your solution → + New → More → Connection Reference
2. Name: `Dataverse Connection Ref`
3. Connector: Dataverse
4. Connection: (select your dev environment)
5. Save

---

### ☐ **1.4 Canvas App Created + Connected**

**Action:** New canvas app in your solution

| Item | Action | Status |
|---|---|---|
| Create app | Power Apps → Solutions → + New → Canvas app | ☐ Create |
| Name it | `RetailerApp_v1` | ☐ Done |
| Size | Tablet (1366×768 optimal) | ☐ Done |
| Add data sources | Data → Add data → Dataverse (connect to 5 tables below) | ☐ Done |

**Tables to Connect (Add as Data Sources in Canvas App):**
- Workspace
- WorkspaceMember
- ProductVariant
- SaleLine
- WorkspaceSetting

---

## Part 2: BUILD SCREENS (In Order)

### **Screen Order:**
1. **V1-01 Home** (Workspace selector) ← Start here
2. **V1-02 Buy** (Enter sale)
3. **V1-03 Settings** (Toggle workspace behavior)
4. **V1-04 Inventory** (View stock)

---

## ☐ **BUILD 1: V1-01 Home Screen (Workspace Selector)**

**Spec Location:** [V1-01-HOME-WorkspaceSelector.txt](V1-01-HOME-WorkspaceSelector.txt)

**What This Screen Does:**
- Lists all workspaces for the logged-in user
- User selects one workspace
- Sets global variable: `gblWorkspaceId` (used by all screens for scoping)
- Navigates to V1-02 Buy screen

**Build Time: ~30 min**

### **Step 1.1: Create Screen + Add Title**

```powerapps
// In Canvas app, create new screen: Home
Screen name: scrV1Home

Add shapes:
  - Rectangle (full width, height 60px) → Fill color: Dark blue
  - Text "Retailer Management Tool" → White text, center, 20px font
  - Subtitle text: "Select Your Workspace" → Gray, 14px
```

### **Step 1.2: Add Workspace Gallery**

```powerapps
// Add Gallery control (name: galWorkspaces)

Gallery settings:
  - Data source: Workspace table
  - Filter: Linked via WorkspaceMember to current user
  - Items: Filter(Workspace, 
            CountRows(Filter(WorkspaceMember, 
              'User'.'User ID' = User().Email && 
              'crbc0_Workspace' = @item.crbc0_WorkspaceId)) > 0)

Layout:
  - Title → crbc0_name (workspace name)
  - Subtitle → CreatedOn (formatted date)
  - Image (optional) → Icon
```

### **Step 1.3: Add Selection + Navigation**

```powerapps
// On gallery item select (OnSelect event):

Set(gblWorkspaceId, ThisItem.crbc0_WorkspaceId);
Set(gblWorkspaceName, ThisItem.crbc0_name);
Navigate(scrV1Buy, ScreenTransition.Fade)

// These globals are used by all other screens for data scoping
```

### **Step 1.4: Test**

- [ ] Run app → Home screen visible
- [ ] Click workspace → both globals set (open browser dev tools → Application → LocalStorage to verify)
- [ ] Navigated to scrV1Buy (next screen)

**Reference Spec:** [V1-01-HOME-WorkspaceSelector.txt](V1-01-HOME-WorkspaceSelector.txt)

---

## ☐ **BUILD 2: V1-02 Buy Screen (Sale Entry)**

**Spec Location:** [V1-02-BUY-PurchaseEntry.txt](V1-02-BUY-PurchaseEntry.txt)

**What This Screen Does:**
- Displays product picker (filtered by workspace + available stock > 0)
- User enters quantity
- Shows unit price (either from ProductVariant base OR from LastSellUnitPrice if toggle is ON)
- User confirms sale → creates SaleLine in Dataverse
- Clears form; ready for next sale

**Build Time: ~60 min**

### **Step 2.1: Screen Layout + Header**

```powerapps
// Create screen: scrV1Buy

// Header:
Rectangle (blue bar) → Title "Record Sale"
Button "Back" → Set(gblWorkspaceId, Blank()); Navigate(scrV1Home)
Text "Workspace: {gblWorkspaceName}"
```

### **Step 2.2: Add Product Picker (Dropdown)**

```powerapps
// Dropdown control: ddlProduct

Items: Filter(ProductVariant,
  'crbc0_Workspace' = gblWorkspaceId &&
  'Current Stock Level' > 0
)

Value displayed: Name

Formula on change (OnChange):
  Set(selectedProduct, ddlProduct.Selected);
  Set(productPrice, selectedProduct.'Last Sell Unit Price' ?? selectedProduct.'Base Unit Price')
  
  // If LastSellUnitPrice toggle is OFF, use base price; else use last sell
```

### **Step 2.3: Add Quantity Input**

```powerapps
// Text input: txtQty

Input type: Number only

Placeholder: "Qty"

OnChange: Set(qty, Value(txQty.Value))
```

### **Step 2.4: Display Price**

```powerapps
// Text label: lblPrice

Text: "Unit Price: " & productPrice

Optional: Add button to override price (store manager can adjust)
```

### **Step 2.5: Add Confirm Button**

```powerapps
// Button: btnConfirmSale

OnSelect:
  // 1. Validate inputs
  If(IsBlank(selectedProduct),
    Notify("Select a product", NotificationType.Error);
    Return()
  )
  
  If(qty <= 0,
    Notify("Qty must be > 0", NotificationType.Error);
    Return()
  )
  
  // 2. Create SaleLine record
  Patch(SaleLine, 
    Defaults(SaleLine),
    {
      Workspace: {Value: gblWorkspaceId},
      'Product Variant': {Value: selectedProduct.crbc0_ProductVariantId},
      Qty: qty,
      'Unit Price': productPrice
    }
  )
  
  // 3. Update LastSellUnitPrice if toggle is ON
  If(workspaceSetting.UseLastSellUnitPrice = true,
    Patch(ProductVariant,
      selectedProduct,
      {'Last Sell Unit Price': productPrice}
    )
  )
  
  // 4. Clear form + show success
  Notify("Sale recorded ✓", NotificationType.Success);
  Reset(txtQty);
  Set(selectedProduct, Blank());
  Set(productPrice, 0)
```

### **Step 2.6: Load Workspace Settings (On Screen Visible)**

```powerapps
// OnVisible event:

Set(workspaceSetting, 
  LookUp(WorkspaceSetting, Workspace.Value = gblWorkspaceId)
)

// This controls whether LastSellUnitPrice is used
```

### **Step 2.7: Test**

- [ ] Navigate to Buy screen
- [ ] Dropdown shows products from your workspace (not others)
- [ ] Only products with stock > 0 shown
- [ ] Select product → price displays
- [ ] Enter qty → click Confirm → notification shows ✓
- [ ] Check Dataverse: SaleLine record created with correct values
- [ ] Form clears; ready for next sale

**Reference Spec:** [V1-02-BUY-PurchaseEntry.txt](V1-02-BUY-PurchaseEntry.txt)

---

## ☐ **BUILD 3: V1-03 Settings Screen (Workspace Toggle)**

**Spec Location:** (No detailed spec; simple screen)

**What This Screen Does:**
- Display current workspace
- Show toggle: "Use Last Sell Unit Price" (Yes/No)
- Save setting to WorkspaceSetting table

**Build Time: ~20 min**

### **Step 3.1: Screen Layout**

```powerapps
// Create screen: scrV1Settings

// Header:
Rectangle (blue bar) → Title "Settings"
Button "Back" → Navigate(scrV1Buy)
Text "Workspace: {gblWorkspaceName}"
```

### **Step 3.2: Add Settings Toggle**

```powerapps
// Toggle control: tglUseLastSellPrice

// Get current setting (OnVisible):
Set(workspaceSetting, 
  LookUp(WorkspaceSetting, Workspace.Value = gblWorkspaceId)
)

// Bind toggle to setting:
Toggle value: workspaceSetting.UseLastSellUnitPrice

// On change (OnChange):
If(IsNotEmpty(workspaceSetting),
  // Update existing record
  Patch(WorkspaceSetting, workspaceSetting, {UseLastSellUnitPrice: tglUseLastSellPrice.Value}),
  // Create new record (if doesn't exist)
  Patch(WorkspaceSetting, 
    Defaults(WorkspaceSetting),
    {Workspace: {Value: gblWorkspaceId}, UseLastSellUnitPrice: tglUseLastSellPrice.Value}
  )
)

Notify("Setting saved", NotificationType.Success)
```

### **Step 3.3: Test**

- [ ] Navigate to Settings screen
- [ ] Toggle ON/OFF → notification shows "Setting saved"
- [ ] Check Dataverse: WorkspaceSetting record updates
- [ ] Go to Buy screen → toggle next product → verify lastSellPrice used (if ON) or ignored (if OFF)

---

## ☐ **BUILD 4: V1-04 Inventory Screen (Stock View)**

**Spec Location:** [V1-03-INVENTORY-StockBatchList.txt](V1-03-INVENTORY-StockBatchList.txt)

**What This Screen Does:**
- Displays all products in workspace with current stock
- Shows StockBatch records (by product + batch date)
- Reference only (no edits in v1)

**Build Time: ~30 min**

### **Step 4.1: Screen Layout**

```powerapps
// Create screen: scrV1Inventory

// Header:
Rectangle (blue bar) → Title "Inventory"
Button "Back" → Navigate(scrV1Buy)
Text "Workspace: {gblWorkspaceName}"
```

### **Step 4.2: Add Product Gallery**

```powerapps
// Gallery: galProductsInventory

Items: Filter(ProductVariant, 
  Workspace.Value = gblWorkspaceId
)

// Card layout:
Title: Name
Subtitle: "Stock: {CurrentStockLevel}"
Details: "[Product Family] | [Unit of Measure]"
```

### **Step 4.3: Add Batch Details (Nested Gallery or Expand)**

```powerapps
// When user clicks product, show StockBatch records

// Nested gallery (optional): galBatches

Items: Filter(StockBatch,
  'Product Variant'.Value = galProductsInventory.Selected.crbc0_ProductVariantId &&
  Workspace.Value = gblWorkspaceId
)

// Card layout:
Batch Date: BatchDate
Qty Remaining: Qty
Notes: "Created on {CreatedOn}"
```

### **Step 4.4: Test**

- [ ] Navigate to Inventory screen
- [ ] See all products from your workspace
- [ ] Stock levels display correctly (sum of all batch quantities)
- [ ] Click product → StockBatch details shown (FIFO by date)
- [ ] Switch workspaces (go back Home → select different workspace) → Inventory shows only that workspace's products

---

## Part 3: INTEGRATION TESTING

### ☐ **3.1 End-to-End Flow Test**

**Scenario:** Complete 1 full workflow

```
1. Start app
2. Home screen: Select Pilot Workspace
3. Buy screen: 
   - Select product "Bananas"
   - Enter qty 3
   - Click Confirm
4. Verify SaleLine created in Dataverse
5. Go back to Home
6. Select same workspace
7. Go to Inventory
   - See Bananas stock decreased (if flow auto-decrement enabled)
   - Or manually verify in Dataverse
8. Go to Settings
   - Toggle LastSellUnitPrice ON
   - Go back to Buy
   - Select Bananas again → price should be the last one you sold
9. Repeat sale with different product
```

**Expected Outcomes:**
- ✅ All screens load without errors
- ✅ SaleLine records created (visible in Dataverse table)
- ✅ WorkspaceSetting toggle persists (close app → reopen → toggle remains)
- ✅ Stock levels accurate (manually verify; auto-decrement depends on flows)
- ✅ No data visible across workspaces (scoping working)

---

### ☐ **3.2 Data Validation**

Check Dataverse tables directly:

```
1. SaleLine table:
   - Count should = # of sales completed
   - Workspace.Value = gblWorkspaceId (yours)
   - ProductVariant, Qty, UnitPrice populated

2. WorkspaceSetting table:
   - 1 record per workspace
   - UseLastSellUnitPrice = your toggle choice

3. No cross-workspace data:
   - Open SaleLine table
   - Filter by different workspace
   - Should be empty (or belong to other user)
```

---

### ☐ **3.3 Performance Check**

- [ ] Product dropdown loads < 1 second
- [ ] Sale confirm completes < 2 seconds
- [ ] Navigation between screens smooth (no lag)

---

## Part 4: COMMON ISSUES + FIXES

### **Issue: "Product dropdown empty"**
- **Cause:** ProductVariant not linked to WorkspaceMember's workspace
- **Fix:** Check ProductVariant.Workspace = your Workspace GUID

### **Issue: "Sale confirm button does nothing"**
- **Cause:** Formula error or missing data source
- **Fix:** Check browser dev console (F12) for Power Apps errors
- **Alternative:** Add Notify() statement before/after Patch to see where it fails

### **Issue: "Settings toggle doesn't save"**
- **Cause:** WorkspaceSetting record doesn't exist
- **Fix:** Manually create WorkspaceSetting record in Dataverse (Workspace lookup + UseLastSellUnitPrice field)

### **Issue: "Can see other workspace's data"**
- **Cause:** Missing workspace filter in gallery/dropdown
- **Fix:** Add `Workspace.Value = gblWorkspaceId` to Items formula

---

## Success Criteria: Phase A Complete ✅

**By end of build:**
- [ ] All 4 screens built + tested
- [ ] User can record 5+ sales without errors
- [ ] SaleLine data accurate in Dataverse
- [ ] Workspace scoping working (no data leakage)
- [ ] LastSellUnitPrice toggle functional
- [ ] Performance acceptable (UI responsive)

**If ✅ all above:** Ready for Phase B (Flows + Inventory Management)

---

## Next Steps (Phase B)

Once V1 is working:

1. **Build Purchase flow:** Create PurchaseLine records → auto-create StockBatch
2. **Build Inventory flow:** Decrement stock on sale completion
3. **Build Waste flow:** Waste entry + stock decrement
4. **Add reporting:** Daily sales summary by product/workspace

---

## Reference Files

- [PHASE-A-PRACTICAL-SETUP-GUIDE.md](PHASE-A-PRACTICAL-SETUP-GUIDE.md) — Data model + environment setup
- [V1-01-HOME-WorkspaceSelector.txt](V1-01-HOME-WorkspaceSelector.txt) — Screen spec
- [V1-02-BUY-PurchaseEntry.txt](V1-02-BUY-PurchaseEntry.txt) — Screen spec
- [V1-03-INVENTORY-StockBatchList.txt](V1-03-INVENTORY-StockBatchList.txt) — Screen spec
- [ISS-026-ANALYSIS-DataverseODataLookupBinding.md](../issues/ISS-026-ANALYSIS-DataverseODataLookupBinding.md) — Why PowerShell didn't work (reference)

---

## Questions? Check Here

| Q | A |
|---|---|
| "How do I reference a global in a formula?" | Use `gblWorkspaceId` directly (no dollar sign needed) |
| "How do I filter by current user?" | `User().Email` or `User().FullName` in Power Apps |
| "How do I sum stock across batches?" | `Sum(Filter(StockBatch, ...), Qty)` |
| "How do I format a date?" | `Text(CreatedOn, "MMM d, YYYY")` |
| "How do I test before publishing?" | Press **F5** in Power Apps editor (play mode) |

---

**Good luck! You're building the bones of the system. Start with V1-01 Home → test → move to V1-02. Don't skip testing; catch bugs early.**
