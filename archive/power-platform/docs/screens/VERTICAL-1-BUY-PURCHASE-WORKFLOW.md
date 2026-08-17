# Vertical 1 Purchase Workflow - V1-02 Screen Build Guide

**Date:** 2026-04-11  
**Focus:** V1-02 Buy Screen for Purchase Entry with Hybrid Provider Pricing Model  
**Build Time:** 60 minutes  

---

## Overview

**V1-02 Buy Screen Purpose:**
- User selects **Provider** (required, central to workflow)
- System shows **all ProductVariants** from global catalog (workspace-scoped, IsActive=true)
- User selects product → System **auto-populates last price** from ProviderProductPrice cache
- User enters quantity; can override price if new quote received
- User confirms purchase → Creates **PurchaseLine** + updates **ProviderProductPrice** cache + creates **StockBatch**

**Key Feature:** Provider-centric pricing with intelligent auto-fill

---

## Screen Layout Structure

```
┌────────────────────────────────────────────┐
│  Record Purchase                     Back  │ ← Header
├────────────────────────────────────────────┤
│  Workspace: Pilot Workspace                 │
├────────────────────────────────────────────┤
│  Buying From: [Dropdown: Provider]  *Req  │ ← Required first
├────────────────────────────────────────────┤
│  Product: [Dropdown: Products]             │ ← Disabled until provider selected
│  (Shows only IsActive=true)                 │
├────────────────────────────────────────────┤
│  Last Price: $0.50 | Edit below if new ►  │ ← Auto-filled info
├────────────────────────────────────────────┤
│  Quantity: [Input: Number]                  │
├────────────────────────────────────────────┤
│  Unit Price: [Input: Number, editable]     │ ← Can override
├────────────────────────────────────────────┤
│                         [Confirm Purchase] │ ← Submit button
├────────────────────────────────────────────┤
│ Settings | Back to Home                    │ ← Navigation
└────────────────────────────────────────────┘
```

---

## Step-by-Step Build

### **Step 1: Screen Setup + Header**

```powerapps
// Create new screen: scrV1Buy

// 1. Add header rectangle
Rectangle: Select for me to design
  Fill: ColorValue("#1F4E78")  // Dark blue
  Height: 60
  Width: Parent.Width
  X: 0, Y: 0

// 2. Add title
Text "Record Purchase"
  PaddingLeft: 20
  PaddingTop: 15
  FontSize: 24
  FontWeight: FontWeight.Bold
  Color: White

// 3. Add back button
Button "← Back"
  OnSelect: Navigate(scrV1Home, ScreenTransition.Fade)
  X: Parent.Width - 100
  Y: 15
  Fill: Transparent
  Color: White

// 4. Add workspace info
Text "Workspace: " & gblWorkspaceName
  Y: 70
  X: 20
  FontSize: 14
  Color: Gray
```

---

### **Step 2: Provider Selection Dropdown (FIRST)**

```powerapps
// Label
Label "Buying From: (Select Provider)*"
  Y: 110
  X: 20
  FontSize: 12
  FontWeight: FontWeight.Bold

// Dropdown: ddlProvider
Dropdown: ddlProvider
  Y: 135
  X: 20
  Width: Parent.Width - 40
  
  Items: Filter(Provider,
    Workspace.Value = gblWorkspaceId
  )
  
  Value displayed: Name
  
  OnChange:
    Set(selectedProvider, ddlProvider.Selected);
    Set(selectedProduct, Blank());
    Set(lastProviderPrice, Blank());
    Set(productPrice, 0);
    Set(qty, 0);
    Notify("Provider selected: " & selectedProvider.Name, NotificationType.Information)
```

**Test:** Run app → Select provider → Notification appears ✓

---

### **Step 3: Product Picker Dropdown (GLOBAL CATALOG)**

```powerapps
// Label
Label "Select Product:"
  Y: 180
  X: 20
  FontSize: 12
  FontWeight: FontWeight.Bold

// Dropdown: ddlProduct
Dropdown: ddlProduct
  Y: 205
  X: 20
  Width: Parent.Width - 40
  
  // ONLY enabled if provider selected
  DisplayMode: If(IsBlank(selectedProvider), DisplayMode.Disabled, DisplayMode.Edit)
  
  Items: Filter(ProductVariant,
    Workspace.Value = gblWorkspaceId &&
    IsActive = true
  )
  
  Value displayed: Name
  
  OnChange:
    Set(selectedProduct, ddlProduct.Selected);
    
    // KEY FORMULA: Look up last price for this provider-product combination
    Set(lastProviderPrice, 
      LookUp(ProviderProductPrice,
        Workspace.Value = gblWorkspaceId &&
        Provider.Value = selectedProvider.ID &&
        ProductVariant.Value = selectedProduct.ID
      ).LastPurchasePrice
    );
    
    // Auto-populate price field
    Set(productPrice, If(IsBlank(lastProviderPrice), 0, lastProviderPrice));
    
    If(IsBlank(lastProviderPrice),
      Notify("First time buying this product from this provider", NotificationType.Information),
      Notify("Last price: $" & lastProviderPrice, NotificationType.Information)
    )
```

**Test:** Select provider → product dropdown enabled → Select product → Price auto-fills ✓

---

### **Step 4: Display Last Price Info**

```powerapps
// Label: Show last price context
Label: lblLastPrice
  Y: 250
  X: 20
  Width: Parent.Width - 40
  
  Text: If(IsBlank(lastProviderPrice),
    "⚠ First time buying " & selectedProduct.Name & " from " & selectedProvider.Name,
    "✓ Last price: $" & Text(lastProviderPrice, "0.00") & " | Edit below if new quote"
  )
  
  Color: If(IsBlank(lastProviderPrice), Orange, Green)
  FontSize: 11
  Italic: true
```

---

### **Step 5: Quantity Input**

```powerapps
// Label
Label "Quantity:"
  Y: 290
  X: 20
  FontSize: 12
  FontWeight: FontWeight.Bold

// Text input: txtQty
TextInput: txtQty
  Y: 315
  X: 20
  Width: 150
  Format: Number
  Placeholder: "Enter quantity"
  
  OnChange:
    Set(qty, Value(txtQty.Value))
```

---

### **Step 6: Price Input (Editable, Auto-filled)**

```powerapps
// Label
Label "Unit Price (Override if new quote):"
  Y: 290
  X: 200
  FontSize: 12
  FontWeight: FontWeight.Bold

// Text input: txtPrice
TextInput: txtPrice
  Y: 315
  X: 200
  Width: 150
  Format: Number
  Default: productPrice
  Placeholder: "Price per unit"
  
  OnChange:
    Set(productPrice, Value(txtPrice.Value))
```

---

### **Step 7: Confirm Button (Main Action)**

```powerapps
// Button: btnConfirmPurchase
Button: btnConfirmPurchase
  Text: "✓ Confirm Purchase"
  Y: 380
  X: Parent.Width - 200
  Width: 180
  Height: 50
  FontSize: 18
  FontWeight: FontWeight.Bold
  Fill: ColorValue("#70AD47")  // Green
  
  OnSelect:
    // ============================================
    // 1. VALIDATE
    // ============================================
    If(IsBlank(selectedProvider),
      Notify("❌ Select a provider", NotificationType.Error);
      Return()
    );
    
    If(IsBlank(selectedProduct),
      Notify("❌ Select a product", NotificationType.Error);
      Return()
    );
    
    If(qty <= 0,
      Notify("❌ Qty must be > 0", NotificationType.Error);
      Return()
    );
    
    If(productPrice <= 0,
      Notify("❌ Price must be > 0", NotificationType.Error);
      Return()
    );
    
    // ============================================
    // 2. CREATE PURCHASE HEADER RECORD
    // ============================================
    Patch(Purchase, 
      Defaults(Purchase), 
      {
        Workspace: {Value: gblWorkspaceId},
        Provider: {Value: selectedProvider.ID},
        Date: Today(),
        Status: "Completed"
      }
    );
    
    // ============================================
    // 3. GET PURCHASE ID (just created)
    // ============================================
    Set(lastPurchaseId, 
      LookUp(Purchase,
        Workspace.Value = gblWorkspaceId &&
        Provider.Value = selectedProvider.ID &&
        Date = Today()
      ).ID
    );
    
    // ============================================
    // 4. CREATE PURCHASE LINE (transaction record)
    // ============================================
    Patch(PurchaseLine, 
      Defaults(PurchaseLine), 
      {
        Purchase: {Value: lastPurchaseId},
        ProductVariant: {Value: selectedProduct.ID},
        Qty: qty,
        Workspace: {Value: gblWorkspaceId}
      }
    );
    
    // ============================================
    // 5. UPDATE PURCHASE LINE WITH UNIT PRICE
    // ============================================
    Patch(PurchaseLine,
      LookUp(PurchaseLine,
        Purchase.Value = lastPurchaseId &&
        ProductVariant.Value = selectedProduct.ID
      ),
      {'Unit Price': productPrice}
    );
    
    // ============================================
    // 6. UPDATE PROVIDER PRODUCT PRICE CACHE
    // ============================================
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
        LastUpdatedDate: Now(),
        IsActive: true
      }
    );
    
    // ============================================
    // 7. CREATE STOCK BATCH (FIFO inventory)
    // ============================================
    Patch(StockBatch,
      Defaults(StockBatch),
      {
        ProductVariant: {Value: selectedProduct.ID},
        Qty: qty,
        BatchDate: Today(),
        Workspace: {Value: gblWorkspaceId}
      }
    );
    
    // ============================================
    // 8. SUCCESS MESSAGE + CLEAR FORM
    // ============================================
    Notify(
      "✓ Purchase recorded! | " & qty & " units of " & selectedProduct.Name & 
      " from " & selectedProvider.Name & " @ $" & productPrice & " each",
      NotificationType.Success
    );
    
    // Reset all fields
    Reset(txtQty);
    Reset(txtPrice);
    Set(selectedProvider, Blank());
    Set(selectedProduct, Blank());
    Set(lastProviderPrice, Blank());
    Set(productPrice, 0);
    Set(qty, 0);
    
    // Refresh dropdowns
    Refresh(Provider);
    Refresh(ProductVariant);
    Refresh(ProviderProductPrice)
```

---

### **Step 8: Screen OnVisible Setup**

```powerapps
// Screen.OnVisible

// Initialize global variables (first time screen loads)
Set(selectedProvider, Blank());
Set(selectedProduct, Blank());
Set(lastProviderPrice, Blank());
Set(productPrice, 0);
Set(qty, 0);

// Optional: Load workspace info
Set(gblWorkspaceName, 
  LookUp(Workspace, ID = gblWorkspaceId).Name
)
```

---

## Testing Checklist

### **Phase 1: UI Elements**
- [ ] Screen loads without errors
- [ ] Provider dropdown shows 2-3 providers (workspace-scoped)
- [ ] Product dropdown disabled initially (grayed out)
- [ ] After provider select: Product dropdown enabled
- [ ] Last price label shows context (green if history, orange if first time)

### **Phase 2: Auto-Population**
- [ ] Select Provider A + Product X → Price auto-fills if history exists
- [ ] Select same provider + same product → Same price shows
- [ ] Select Provider B + same Product X → Price blank (no history for B)
- [ ] Last price label updates dynamically

### **Phase 3: Purchase Confirmation**
- [ ] Enter qty + price → Click Confirm
- [ ] Notification appears: "✓ Purchase recorded!"
- [ ] Form clears
- [ ] Dropdowns reset to blank

### **Phase 4: Data Verification (Check Dataverse)**

**Purchase table:**
- [ ] 1 new record created
- [ ] Provider linked correctly
- [ ] Date = today
- [ ] Status = "Completed"

**PurchaseLine table:**
- [ ] 1 new record created
- [ ] Purchase linked to Purchase record above
- [ ] ProductVariant linked correctly
- [ ] Qty = what you entered
- [ ] UnitPrice = what you entered

**ProviderProductPrice table:**
- [ ] Record exists with (Workspace, Provider, ProductVariant) combination
- [ ] LastPurchasePrice = price you entered
- [ ] LastUpdatedDate = today
- [ ] IsActive = true

**StockBatch table:**
- [ ] New record created
- [ ] ProductVariant linked
- [ ] Qty = acquisition qty you entered
- [ ] BatchDate = today
- [ ] Workspace = your workspace

### **Phase 5: Repeat Purchase (Cache Working)**
- [ ] Immediately select same Provider + Product again
- [ ] Price field auto-fills with price you just entered ✓
- [ ] Enter different qty (e.g., 5 instead of 10)
- [ ] Enter new price if supplier quoted differently
- [ ] Confirm
- [ ] Check ProviderProductPrice: LastPurchasePrice updated to new price ✓

### **Phase 6: Cross-Provider Validation**
- [ ] Select different Provider + same Product
- [ ] Price blank (this provider has no history)
- [ ] Enter different price
- [ ] Confirm
- [ ] Check Dataverse:
  - [ ] Provider A still shows original price
  - [ ] Provider B shows new price
  - [ ] Both ProviderProductPrice records exist

---

## Common Issues + Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| Provider dropdown empty | No Provider records in workspace | Create 2-3 Provider records in Dataverse; set Workspace FK correctly |
| Product dropdown disabled even after selecting provider | DisplayMode formula broken | Check: `If(IsBlank(selectedProvider), DisplayMode.Disabled, DisplayMode.Edit)` |
| Price doesn't auto-fill | ProviderProductPrice lookup returns blank (normal first time) | This is expected! On second purchase from same provider, it will auto-fill |
| Confirm button does nothing | Formula error not visible | Open browser F12 → Console tab; look for red error; check each Patch separately |
| Data doesn't appear in Dataverse | Patch formula missing Workspace filter | Verify all Patch calls include `Workspace: {Value: gblWorkspaceId}` |
| Can see other workspace's data | Gallery not filtering by workspace | Check each Items formula has `Workspace.Value = gblWorkspaceId` |

---

## Success Criteria ✅

**After following this guide, you should have:**

- [ ] V1-02 Buy screen fully functional
- [ ] Provider selection (required, first step)
- [ ] Product picker (global catalog, workspace-scoped)
- [ ] Price auto-population (from ProviderProductPrice cache)
- [ ] Full purchase transaction creation (Purchase + PurchaseLine + StockBatch)
- [ ] ProviderProductPrice cache updated automatically
- [ ] Repeat purchases show cached price ✓
- [ ] Cross-workspace data properly scoped
- [ ] All data verified in Dataverse

**Time Required:** 60 minutes (including testing)

---

## Next: Complete V1 with Other Screens

Once V1-02 is working:
1. Ensure V1-01 Home works (workspace selector)
2. Add V1-03 Settings (toggle optional)
3. Add V1-04 Inventory (stock view)
4. Run full end-to-end test
5. Ready for Phase B (Sales vertical + flows)

---

## Reference: Related Documentation

- [ADR-034: Hybrid Provider Pricing Model](../adr/ADR-034-hybrid-provider-pricing-model.md)
- [VERTICAL-1-ASSEMBLY-PLAN.md](VERTICAL-1-ASSEMBLY-PLAN.md) (Original; now Purchase-focused)
- [PHASE-A-PRACTICAL-SETUP-GUIDE.md](../PHASE-A-PRACTICAL-SETUP-GUIDE.md) (Environment setup)
