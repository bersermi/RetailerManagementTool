================================================================================
CLARIFICATION: ISS-014 - SALE STOCK DECREMENT TIMING
Strictly Open Approach (No Validation, No Flagging, No Pending Events)
================================================================================

**Date:** 2026-04-04  
**Status:** Simplified Decision (Timestamp-Based Analysis)  
**Philosophy:** Record transactions accurately; analyze patterns post-hoc  

---

## The Decision: Strictly Open (No Validation)

**Your directive:**
> "We will proceed with a strictly open approach. We don't need to validate availability or flag amounts above QtyRemaining."
> "I can start analyzing this only with the time stamps of the purchases vs sales."
> "To begin with, I want the app to record sales and waste; I will then design the notifications system."

**What this means:**

```
Sale Entry Flow:
┌──────────────────────────────────────┐
│ User selects product + quantity       │
├──────────────────────────────────────┤
│ [NO VALIDATION]                      │
│ App does NOT check if qty             │
│   is available in stock               │
│                                       │
│ [JUST RECORD]                        │
│ → Create SaleLine                     │
│ → Record timestamp                    │
│ → Update LastSellUnitPrice (if toggle)│
│                                       │
│ [NO FLAGGING]                        │
│ App does NOT create warning           │
│   if qty > qtyRemaining               │
│                                       │
│ [NO PENDING EVENTS]                  │
│ App does NOT create InventoryEvent    │
│ "quantity exceeds stock"              │
└──────────────────────────────────────┘
              ↓
         Dataverse records:
         - SaleLine (quantity, timestamp)
         - No flags, no warnings
         - Clean transaction trail
              ↓
      Post-Hoc Analysis (Tomorrow/Weekly):
      - Compare Purchase dates vs Sale dates
      - Identify patterns (oversales by time)
      - Design notifications based on data
```

---

## Why Strictly Open Works for You

### **1. 15-20 User Pilot in Single DEV Environment**

```
User count:   15-20 people
Discipline:   High (controlled pilot group)
Risk:         Very low (not 10,000 concurrent users)
Nature of use: Trusted staff, not adversarial
→ No inventory validation needed yet
→ Trust the transaction history
```

### **2. You Want Data Before Building Notifications**

```
Current:  "Sort this problem as simple as possible"
Goal:     Understand sales patterns via timestamps
Future:   "I will then design the notifications system"

Logic:
  Phase 1: Record transactions (sales + waste) cleanly
  Phase 2: Analyze timestamps (purchases vs sales over time)
  Phase 3: Design notifications based on patterns you see

You're not designing notifications blind.
You're gathering data first, then building alerts.
```

### **3. Oversales in Small Pilot ≠ Systems Failure**

```
If someone sells 100 units and you only have 50:
  – Not a system failure
  – It's a data point: "Stock ran out; sales continued"
  – Timestamp tells you WHEN it happened
  – You can analyze WHY (supply gap? stock counting error? normal variance?)

Action != Forced prevention
You can address it operationally (re-order faster) before building automation.
```

### **4. Simplicity Enables Speed**

```
WITHOUT validation:
  Buy screen:
    1. Select product
    2. Enter quantity
    3. Confirm
    4. Done (50 ms)

WITH validation:
  Buy screen:
    1. Select product
    2. Fetch inventory from Dataverse
    3. Check if qty available
    4. IF not: show error + block OR show warning
    5. Enter quantity
    6. THEN confirm
    7. Done (500 ms + network latency)

× 15-20 users × 10 sales/day = 150-200 extra network calls
= Friction in early pilot
= Users annoyed, not because it's wrong, but because it's slow
```

---

## What "Strictly Open" Means Operationally

### **Create Sale / SaleLine (Immediate)**

```
User completes sale:
  1. App creates SaleLine immediately
     ├─ SaleLine.Sale = [sale record]
     ├─ SaleLine.ProductVariant = [product]
     ├─ SaleLine.Qty = [user input]
     ├─ SaleLine.UnitPrice = [user input OR toggle value]
     ├─ SaleLine.Workspace = gblWorkspaceId
     └─ SaleLine.CreatedOn = NOW() [auto; timestamp]

  2. Payment/waste is recorded separately (later feature)
  
  3. NO InventoryEvent created
  4. NO check against ProductVariant.QtyRemaining
  5. NO warning popup
  6. Clean transaction = clean audit trail
```

### **Update ProductVariant.LastSellUnitPrice (If Toggle Enabled)**

```
User completes sale WITH toggle ON:
  1. Patch ProductVariant.LastSellUnitPrice = SaleLine.UnitPrice
     (This happens for ALL sales, regardless of QtyRemaining)

User completes sale WITH toggle OFF:
  1. Do nothing (use defaults)
```

### **No Post-Sale Inventory Actions**

```
What does NOT happen:
  ❌ Check: Is QtyRemaining >= SaleLine.Qty?
  ❌ Create: InventoryEvent with status "Pending"
  ❌ Flag: "Stock level exceeded"
  ❌ Notify: "You sold 100 but only have 50"
  
Clean flow = no event-driven logic = no side effects to debug
```

---

## Dataverse Schema (No Changes Needed)

**SaleLine table (unchanged):**

```
SaleLine
├─ Name (text)
├─ Sale (FK)
├─ ProductVariant (FK)
├─ Qty (decimal, positive)
├─ UnitPrice (decimal, can be overridden by user)
├─ Workspace (FK)
├─ LineTotal (computed: Qty × UnitPrice)
└─ CreatedOn (datetime, auto; timestamp)

InventoryEvent table:
  [NOT USED in V1 for sales]
  [Deferred to v1.1+ for waste + notifications]
```

**No new columns. No Pending/Finalized logic. Just clean transaction recording.**

---

## Power Automate Flows (Part of Phase B)

### **Flow 1: Normalize Names (Unchanged)**

```
Trigger: Create/update on Provider, Unit, ProductFamily, ProductVariant
Action: Populate NormalizedName
(No changes for sales)
```

### **Flow 2: Purchase Completed → StockBatch (Unchanged)**

```
Trigger: PurchaseLine created + Purchase.Status = "Completed"
Actions:
  1. Compute ExpiryDate (manual > lifespan > null)
  2. Create StockBatch (QtyReceived, QtyRemaining, ReceivedDateTime, ExpiryDate)
(No changes; inbound flow only)
```

### **Flow 3: Sale Completed → Record Transaction (NEW; Ultra-Simple)**

```
Trigger: SaleLine created + Sale.Status = "Completed"

Actions (in order):
  1. [NO CHECK] Do NOT fetch StockBatch inventory
  2. [NO VALIDATION] Do NOT compare SaleLine.Qty vs QtyRemaining
  3. [NO EVENT] Do NOT create InventoryEvent
  4. [SIMPLE LOGGING] Optionally log sale to audit table (future)
     (Timestamp already exists on SaleLine.CreatedOn)

Result:
  ✓ SaleLine is recorded
  ✓ Timestamp is captured
  ✓ No side effects
  ✓ Done
```

**Rationale:** SaleLine creation IS the transaction. No flow needed for v1. (Add logging flow in v1.1 if needed for compliance.)

---

## Canvas App: Sale Entry Screen (V1-02 Update)

### **What Changes from Earlier Spec**

**Before (Assuming validation):**
```
BtnCompleteSale.OnSelect:
  // Check inventory
  LookUp(StockBatch, ProductVariant = varSelectedProduct, Workspace = gblWorkspaceId);
  
  If available qty >= sale qty:
    Create SaleLine
  Else:
    ShowNotification("Not enough stock")
```

**After (Strictly Open):**
```
BtnCompleteSale.OnSelect:
  // Just record the sale
  Patch(SaleLine, Defaults(SaleLine), {
    Name: "SaleLine_" & Now(),
    Sale: varCurrentSale,
    ProductVariant: varSelectedProduct,
    Qty: varQty,
    UnitPrice: varUnitPrice,
    Workspace: gblWorkspaceId
  });
  
  // Update LastSellUnitPrice IF toggle enabled (ISS-017)
  If(gblUseLastSellUnitPrice,
    Patch(ProductVariant, varSelectedProduct, {
      LastSellUnitPrice: varUnitPrice
    })
  );
  
  ShowNotification("Venta registrada", "Success");
```

**No inventory check. No error condition. Just record it.**

---

## How You'll Analyze Oversales (Post-Hoc)

### **Week 1 Analysis (Manual SQL or Canvas Report)**

```
Query:
  Sales where Sale.CreatedOn > DATEADD(day, -7, GETDATE())
  Join to Purchases via ProductVariant
  Grouped by ProductVariant, SUM(SaleLine.Qty) vs SUM(StockBatch.QtyReceived)

Result (Example):
  Laptop:
    Received: 100 units (Purchase date: 2024-04-01)
    Sold:     120 units (Sale dates: 2024-04-02 to 2024-04-05)
    Oversale: 20 units
    Timeline: Bought on Monday, oversold by Friday

Action:
  1. Review stock counting process (was the lot really 100?)
  2. Increase purchase order frequency
  3. Add reorder point alert (for v1.1)
```

### **Weekly Dashboard (Future: v1.1+)**

```
Metrics to track:
  • Daily sales by product
  • Stock level trends
  • Oversale frequency (duration + magnitude)
  • Days-on-hand (how long stock lasts)
  
Built in:
  • Canvas Power BI integration
  • Timestamp-based visualizations
  • No real-time validation needed

Decision point:
  If oversales are rare + small → Keep open approach
  If oversales are frequent + large → Add validation in v1.2
```

---

## Risk Assessment: Is Strictly Open Safe for Pilot?

### **Risk: Oversales Create Accounting Confusion**

**Likelihood:** Low (15-20 trusted staff)  
**Mitigation:** Weekly audit of sales vs purchases (timestamp-based)  
**Impact if happens:** Manual reconciliation (1-2 hours); no system failure  
→ **Acceptable for V1**

### **Risk: Users Sell Products That Don't Exist**

**Likelihood:** Low (app forces product selection from inventory list)  
**Mitigation:** ProductVariant list only shows items in purchases  
**Impact if happens:** Manual correction in Dataverse  
→ **Acceptable for V1**

### **Risk: Users Enter Negative or Zero Quantities**

**Likelihood:** Low (cmpQtyStepper enforces Min > 0)  
**Mitigation:** Component validation; form validation  
**Impact if happens:** App blocks submission  
→ **Blocked by UX control, OK**

### **Risk: System Looks Broken if Stock Is Negative**

**Likelihood:** Medium (conceptually confusing if Qty Remaining goes negative)  
**Mitigation:** Explain in docs: "Stock can go negative; analyze via timestamps"  
**Impact if happens:** Users understand it's by design (not a bug)  
→ **Acceptable if communicated**

### **Overall:** Strictly open is safe for a 15-20 person pilot in dev environment with weekly audits.

---

## What "Recording Sales + Waste" Means (V1 + V2)

### **V1: Record Sales**

```
✓ Sales screen (V1-02): Quantity + Unit Price
✓ Creates SaleLine with timestamp
✓ Updates LastSellUnitPrice (if toggle)
✓ No validation, no flagging
```

### **V2: Record Waste** (Deferred)

```
? Waste screen (V2-??): Similar to sales
  ├─ Select product
  ├─ Enter quantity (removed from inventory)
  ├─ Reason (optional: expired, damaged, eaten, other)
  └─ Creates WasteEvent with timestamp

? Waste added to analysis
  ├─ Compare stock received vs sales + waste
  ├─ Identify unaccounted inventory (shrinkage)
  └─ Trigger waste notifications if patterns emerge
```

---

## Notifications System: Future Design (v1.1+)

**Based on timestamp analysis, you'll design:**

```
Example triggers (not in v1):
  • "Stock for [Product] ended 3 days ago, but sales continued"
  • "Oversale trend detected for [Product]: averaging 15% over stock"
  • "Waste increased 20% over last 30 days (vs purchases)"
  
These are designed AFTER you see the data.
Not designed blind today.
```

---

## Implementation: V1 Sale Entry

| Task | Effort | Notes |
|------|--------|-------|
| **Create Sale setup flow** | 15 min | Initialize varCurrentSale |
| **Sale form screen** | 45 min | Product select, qty, price inputs |
| **SaleLine creation logic** | 15 min | Simple patch; no validation |
| **Update ProductVariant price** | 10 min | ISS-017 toggle logic |
| **Notifications (success/error)** | 10 min | Toast messaging |
| **Test (happy path only)** | 20 min | Product → qty → confirm → success |
| **TOTAL** | ~115 min | ~2 hours |

---

## Testing Checklist: Strictly Open Sale Entry

| Scenario | Expected Behavior |
|----------|------------------|
| **Create sale with product (10 in stock)** | SaleLine created; "Venta registrada" |
| **Create sale with qty > stock (sell 50, have 10)** | SaleLine created (NO error); timestamp recorded |
| **Select product with no price** | User can enter price (no default) |
| **Toggle ON and sell** | LastSellUnitPrice updated |
| **Toggle OFF and sell** | LastSellUnitPrice NOT updated |
| **Oversale (qty = 0, still have stock)** | SaleLine created; QtyRemaining still accurate until DB updates |

---

## Why This Approach Works Best for You

| Aspect | Strictly Open | With Validation |
|--------|---|---|
| **Setup time** | 2 hours | 5+ hours (+ error handling) |
| **User experience** | Fast, frictionless | Slower (validation latency) |
| **Pilot feedback** | "Just works" | "System keeps blocking me" |
| **Data collection** | Accurate timestamps | Prevents real-world scenarios |
| **Scaling to v2** | Build notifications from data | Retro-fit validation after user pain |
| **Risk (15-20 users)** | Very low | Not justified |

---

## Bottom Line

✅ **Strictly open approach** — No validation, no flagging, no Pending events  
✅ **Pure transaction recording** — SaleLine = audit trail; timestamp captures everything  
✅ **Data-driven notifications** — Analyze patterns first; build alerts second  
✅ **Pragmatic for pilot** — Trust your 15-20 users; validate when you scale  
✅ **Simplified code** — 2 hours to implement vs 5+ hours with validation  

🎯 **Record transactions; analyze later. Trust your team.**

