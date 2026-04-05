================================================================================
ANALYSIS: ISS-014 - SALE COMPLETION STOCK DECREMENT TIMING
Tight vs Open Modes; Recommendations & Hybrid Approach
================================================================================

**Date:** 2026-04-04  
**Status:** Decision Analysis (Critical)  
**Stakeholder:** Sergio  
**Request:** Assess both paths; recommend one; determine if both can coexist  

---

## Core Question

When a sale is completed, how should the system handle stock decrement?

```
User clicks "Complete Sale" with items in cart
  ↓
  ??? ACTION ???
  ↓
  User sees success or error/warning
```

---

## The Two Philosophies

### **Tight Mode (Inventory-First, Fail-Safe)**

**Philosophy:** "System controls; business enforces accuracy upfront"

```
Sale completion flow:
  1. Check StockBatch availability (FIFO across batches for product)
  2. If sufficient stock:
     → Decrement StockBatch.QtyRemaining immediately
     → Create SaleLine with actual qty sold
     → Commit sale
  3. If insufficient stock:
     → OPTION A: Block sale (fail; show "Out of stock" error) 
     → OPTION B: Allow partial fulfillment (qty available only)
     → OPTION C: Allow oversale; create negative stock record
```

**Stock Status:** Always accurate (no surprises)

**Data Flow:**
```
Sale Complete
  ↓
[Backend Check]
  ├─ Query: Sum(StockBatch.QtyRemaining) where ProductVariant = X
  ├─ If >= SaleQty: Decrement batch FIFO; create SaleLine
  └─ If < SaleQty: Error/warning (block or partial fulfill)
  ↓
StockBatch.QtyRemaining updated immediately
  ↓
App refreshes; gallery shows new qty
  ↓
Inventory is "now accurate"
```

**Business Logic Implication:**
- Oversales prevented (or logged as exceptions)
- Staff sees "Out of Stock" error → must stop selling
- Exceptions (negative inventory) flagged for manager review
- Requires backend logic to handle edge cases

---

### **Open Mode (Audit-First, Flexible)**

**Philosophy:** "Business operates freely; system captures transactions for analysis"

```
Sale completion flow:
  1. Accept any qty (even if stock unavailable)
  2. Create SaleLine with requested qty (may exceed stock)
  3. On backend:
     → Do NOT immediately decrement StockBatch
     → Create InventoryEvent (Pending) if oversale detected
     → Flag for owner review
  4. Owner/Operations reviews pending events:
     → Confirm inventory was actually available (entry error)
     → Or mark batch as discovered-missing/miscount
     → Then finalize event → decrement stock
```

**Stock Status:** Loose; decoupled from sales until finalized

**Data Flow:**
```
Sale Complete
  ↓
[No validation check]
  └─ Accept qty as-is; create SaleLine
  ↓
Flow (async):
  ├─ Query: Sum(StockBatch.QtyRemaining) where ProductVariant = X
  ├─ If SaleQty > StockAvailable:
  │   └─ Create InventoryEvent (Pending; Classification: NeedsClarification)
  ├─ Do NOT decrement StockBatch yet
  └─ Notify owner: "Oversale detected; review pending events"
  ↓
StockBatch.QtyRemaining stays unchanged (until event finalized)
  ↓
Inventory is "provisionally accurate" (sales not yet confirmed)
  ↓
Owner reviews Pending tab:
  ├─ "Actually we had more stock" → Finalize event as Miscount
  └─ "We were out; shipped anyway" → Finalize as ShipmentOverride
  ↓
Event Finalized flow:
  └─ Decrement StockBatch (if needed)
  ↓
Inventory becomes "accurate after reconciliation"
```

**Business Logic Implication:**
- Sales always succeed (no blocking)
- Staff uninterrupted operations
- Owner has post-hoc audit trail
- Requires discipline to review pending events regularly

---

## Comparison Table: Tight vs Open

| Aspect | **Tight Mode** | **Open Mode** |
|--------|---|---|
| **Philosophy** | "Prevent errors upfront" | "Capture, then reconcile" |
| **Sale blocking** | YES (if insufficient stock) | NO (always accept) |
| **Stock accuracy** | Real-time; always correct | Loose; reconciled later |
| **UX friction** | Higher (oversales rejected) | Lower (always succeeds) |
| **Staff disruption** | "Out of stock" error → retry/reduce qty | None; sale completes |
| **Negative stock** | Prevented (or logged as error) | Possible (tracked as Pending event) |
| **Owner workload** | Low (prevents issues) | High (manual review of pending) |
| **Audit trail** | Sales + StockBatch events | Sales + SaleLine + InventoryEvent (detailed) |
| **Data reconciliation** | Continuous | After-the-fact (batch review) |
| **Failure mode** | Missed sale if user doesn't retry | Inventory discrepancy if no review |
| **Scaling issue** | More flow calls (validation every sale) | More Pending events to review |
| **Implementation** | ~30 lines backend logic | ~50 lines backend logic + UI for review |

---

## Detailed Scenarios

### **Scenario A: Oversale (Tight vs Open)**

**Situation:**
- Black Beans: 2 kg in stock
- Sale request: 3 kg

#### **Tight Mode:**
```
1. User tries to sell 3 kg
2. System checks: 2 kg available < 3 kg requested
3. Options:
   A. BLOCK: Error toast "Only 2 kg available; reduce qty"
      → User edits qty to 2; retry
   B. PARTIAL: Auto-cap to 2 kg "Sold 2 kg (3 requested; out of stock)"
      → User informed; sale completes with 2 kg
   C. NEGATIVE: Allow 3 kg; create "Oversale Exception" record
      → User alerted post-completion; manager reviews
```

**Best UX:** Option B (silent auto-cap; user prompted)
**Impact:** Staff may not realize business lost 1 kg sale; must check receipts

#### **Open Mode:**
```
1. User sells 3 kg (system doesn't block)
2. Sale created: SaleLine qty = 3 kg
3. Backend detects: 3 kg > 2 kg available
4. Creates InventoryEvent (Pending):
   Status: Pending
   Classification: "Shortage" (or TBD)
   Qty: 1 kg (shortfall)
   RelatedSale: SaleLine ID
5. Flow notifies owner: "1 kg overage detected; review pending"
6. Owner reviews:
   Option A: "We actually had more (system qty wrong)" → Finalize as Miscount; decrement 3
   Option B: "We shipped anyway (customer accepted)" → Finalize as ShipmentOverride
   Option C: "We couldn't deliver; issue refund" → Finalize as Cancellation
```

**Impact:** Complete audit trail; owner can make decision

**Tradeoff:**
- ✅ Sales never fail; staff flow uninterrupted
- ❌ Requires owner to review pending events (could forget)

---

### **Scenario B: Inventory Miscount (Tight vs Open)**

**Situation:**
- System shows: 5 kg Black Beans
- Actual count: 3 kg (2 kg missing/lost/miscounted)

#### **Tight Mode:**
```
Sale 1: Sell 4 kg
  → System says 5 kg available; allows it
  → StockBatch qty reduced: 5 → 1 kg
  
Sale 2: Sell 2 kg
  → System says 1 kg available; blocks it
  → User errors out; must reduce to 1 kg
  
Reality: Actual stock is 0 (not 1 kg)
  → System vs. reality diverges
  → Audit later finds discrepancy; hard to trace when it happened

Resolution:
  Owner uses manual adjustment flow to correct qty to 0
  → But when did it go wrong? After Sale 1 or before?
  → Forensics difficult
```

**Problem:** Stock diverges silently; hard to pinpoint error

#### **Open Mode:**
```
Sale 1: Sell 4 kg (system has 5 kg; accepts)
  → SaleLine created: 4 kg sold
  → StockBatch NOT decremented yet
  → No InventoryEvent created (4 < 5; sufficient)
  
Sale 2: Sell 2 kg (system has 5 kg; accepts)
  → SaleLine created: 2 kg sold
  → StockBatch NOT decremented yet
  → No InventoryEvent created (2 < 5; sufficient)
  
End of day: Pending reconciliation
  → Owner counts physical stock: 0 kg (not 5 kg)
  → Creates InventoryEvent manually: "Inventory Miscount" qty = 5 kg shortage
  → Finalizes event → decrements 5 kg
  → Investigates: 6 kg sold, 0 physical → 1 kg unaccounted
  
Audit trail:
  - SaleLine 1: 4 kg @ timestamp
  - SaleLine 2: 2 kg @ timestamp
  - InventoryEvent: 5 kg miscount @ timestamp NOW
  → Can see exact sale times + when miscount logged
```

**Advantage:** Clear audit trail; can correlate sales with inventory discovery

---

### **Scenario C: Staff Oversells (Intentional or Accidental) (Tight vs Open)**

**Situation:**
- Policy: Staff at location A should not oversell by more than 10%
- But location A doesn't have scales; estimates by eye
- Sales end up 20% over estimated stock

#### **Tight Mode:**
```
Sale blocked repeatedly: "Out of stock" errors
  → Staff frustrated; stops selling (conservative)
  → Business loses revenue (intentional protection, but high cost)
  
Workaround: Staff requests manager override
  → Manager has to grant exceptions constantly
  → Becomes administrative overhead
```

**Problem:** System too rigid for real operational constraints

#### **Open Mode:**
```
Sales always succeed
  → Staff sells what customers want
  → Pending events accumulate: "Oversale detected: 2 kg, 1.5 kg, ..."
  
End of day: Owner reviews pending tab
  → Sees pattern: Sales averaging 15% over stock
  → Decides: "Our estimates are wrong; order more" OR "Staff needs scales"
  → Approves pending events (ShipmentOverride or Reorder)
  → Analytics flag: "Systematic 15% oversale; investigate"
  
Next day: Owner improves process (scales, training, reorder policy)
```

**Advantage:** System adapts to real business; provides feedback for improvement

---

## Implementation Complexity Breakdown

### **Tight Mode (Estimated Effort)**

**Backend Flow (Sale Completed):**
```
Trigger: SaleLine created with parent Sale.Status = Completed

Actions:
  1. Get Sale + SaleLine details
  2. Get StockBatches for ProductVariant (sorted ExpiryDate asc for FIFO)
  3. Loop through batches:
     remaining_to_decrement = SaleLine.Qty
     for each batch:
       if batch.QtyRemaining >= remaining_to_decrement:
         Decrement batch by remaining_to_decrement
         Break
       else:
         Decrement batch to 0
         remaining_to_decrement -= batch.QtyRemaining
  4. If remaining_to_decrement > 0:
     Create "Oversale Exception" record (or InventoryEvent with Classification: Oversale)
  5. Update ProductVariant.LastSellUnitPrice
  6. Return success/error
```

**Effort:** ~4 hours (flow design + testing + edge cases)

**Edge Cases to Handle:**
- Batch expires during loop (skip it?)
- Multiple sales for same product (concurrent; needs locking)
- Partial fulfillment (which qty to charge customer?)
- Negative stock allowed or blocked? (adds complexity)

**Blocking UX Consequence:**
- Sale screen needs error toast + qty reducer
- Staff workflow: Enter qty → blocked error → reduce qty → retry
- Volume: Every oversale is 2–3 taps (friction)

---

### **Open Mode (Estimated Effort)**

**Backend Flow (Sale Completed):**
```
Trigger: SaleLine created with parent Sale.Status = Completed

Actions:
  1. Get Sale + SaleLine details
  2. Get StockBatches for ProductVariant (sum QtyRemaining)
  3. If SaleLine.Qty > SUM(batch.QtyRemaining):
     Create InventoryEvent (Pending):
       Type: Shortage
       Status: Pending
       Qty: SaleLine.Qty - SUM(batch.QtyRemaining)
       RelatedSale: SaleLine ID
       Classification: NeedsClarification (or Undecided)
  4. Do NOT decrement batches (deferred to event finalization)
  5. Update ProductVariant.LastSellUnitPrice
  6. Notify (async): Owner gets dashboard notification
  7. Return success
```

**Effort:** ~3 hours (simpler; no validation)

**Owner Review UX (New Screen: Pending Events):**
```
Screen: Inventory/PendingEvents
  Gallery: colPendingInventoryEvents (status = Pending)
    Card per event:
      Type: "Shortage" | "Waste" | "TBD"
      Qty: 1 kg
      Related: "Sale SL-001 @ 04/03 14:23"
      Classification (dropdown): 
        - Miscount (inventory was higher)
        - ShipmentOverride (shipped despite low stock)
        - Reorder (customer wants refund)
        - Other
      Button: "Finalize"
        OnSelect: Flow "InventoryEvent Finalized"
          → Decrement batches if needed
          → Close event
```

**Effort for Pending Tab:** ~2 hours (gallery + classify flow)

**Total Effort:** ~5 hours (simpler overall; distributed across multiple sprints)

---

## Risk Assessment

### **Tight Mode Risks**

| Risk | Likelihood | Impact | Mitigation |
|------|---|---|---|
| **Sales blocked; revenue loss** | HIGH | MEDIUM | Adjust qty; retry (friction) |
| **Negative stock edge case** | MEDIUM | HIGH | Decide: allow or block? |
| **Concurrent sales race condition** | MEDIUM | HIGH | DB locking needed |
| **Overcomplicated error handling** | MEDIUM | MEDIUM | Flow testing; edge cases |
| **Staff frustration** | HIGH | MEDIUM | Training on override process |

---

### **Open Mode Risks**

| Risk | Likelihood | Impact | Mitigation |
|------|---|---|---|
| **Owner ignores pending events** | MEDIUM | HIGH | Notification escalation; daily digest |
| **Inventory diverges (no surveillance)** | MEDIUM | HIGH | Daily reconciliation dashboard |
| **Accumulating pending backlog** | MEDIUM | MEDIUM | Alert if > N pending; priority flag |
| **Ambiguous event finalization logic** | MEDIUM | MEDIUM | Clear UI steps; training |
| **Reports confused by loose inventory** | MEDIUM | MEDIUM | Mark data as "provisional" in reports |

---

## Hybrid Approach (Best of Both?)

**Idea:** Start Open (Vertical 1); optionally enable Tight for specific products/locations

```
ProductFamily or ProviderCatalogItem:
  Add field: StockControlMode (Choice: Open / Tight)
  
Sale Completed Flow:
  if Product.StockControlMode = "Tight":
    → Execute Tight flow (validate + decrement + error if insufficient)
  else:
    → Execute Open flow (always accept; create pending if needed)
```

**Rationale:**
- Black Beans (cheap, plentiful): Use Open mode (flexible; review later)
- Expensive items / Critical supplies (rare): Use Tight mode (strict control)
- Per-location choice: Store A uses Open; Store B uses Tight

**Implementation Cost:** ~2 hours (add mode field + conditional flow logic)

**Testing:** Test both paths in Vertical 2; switch per product as needed

**Recommendation:** ✅ Pursue this (flexibility without over-engineering)

---

## Data Model Implications

### **Tight Mode Requires:**

```
StockBatch:
  ├─ QtyRemaining (Decimal) — must never go negative
  ├─ NegativeStockAllowed (Boolean, if allowing negatives)
  └─ LastAdjustmentDate (DateTime for audit)

OversaleException:
  ├─ SaleLine (FK)
  ├─ Qty (Decimal)
  ├─ Reason (Text)
  └─ ReviewedBy (User FK)
```

### **Open Mode Requires:**

```
StockBatch:
  ├─ QtyRemaining (Decimal) — may not reflect actual inventory
  └─ Note: "Provisional; pending events not yet finalized"

InventoryEvent:
  ├─ Status (Pending / Finalized)
  ├─ Classification (Shortage / Miscount / ShipmentOverride / etc.)
  ├─ RelatedSale (SaleLine FK, optional)
  └─ FinalizingUser (User FK)
```

**Hybrid Mode:** Use InventoryEvent (Open) + optional StockControlMode (per product; Tight behavior via flow logic)

---

## Recommendations by Scenario

### **For Retail Store (Small, Manual Counting)**

**Use: Open Mode**

- Staff counts inventory once/day (not continuous)
- Stock system loose; reconciles at day-end via pending events
- Prevents sales blocking; good UX for staff
- Owner reviews 5–10 pending events/day (manageable)
- Cost: 10 min/day owner review

---

### **For Subscription Box Service (High-Volume, Pre-Packed)**

**Use: Tight Mode**

- Stock counts must be accurate (pre-packed items)
- Blocking is acceptable; rare oversales
- Prevents shipping errors; critical for satisfaction
- Cost: Backend complexity; handling exceptions

---

### **For Mid-Market Chain (Multi-Location, Mixed Discipline)**

**Use: Hybrid Mode**

- High-value SKUs: Tight mode (prevent shrinkage)
- Common items: Open mode (flexible operations)
- By location: Store A (tight) vs Store B (open)
- Cost: Flexibility; allows progressive adoption

---

## Recommended Decision Path for Pilot

### **Vertical 1 (Purchase Only)**
- No sales yet; not applicable
- Use Open mode philosophy (accept purchase data as-is)

### **Vertical 2 (Sales; Recommended Approach)**

**Start: Open Mode**
```
Implement:
  1. Sale always succeeds (no validation)
  2. Create InventoryEvent if SaleQty > StockAvailable
  3. Owner reviews pending tab daily
  4. Finalize events (decide: miscount vs override vs refund)
```

**Effort:** ~5 hours

**Testing:** Pilot with store for 1–2 weeks
  - See if pending events accumulate
  - Ask owner: "Is manual review feasible?"
  - Measure: How many pending events/day?

### **Vertical 2.1 (Refinement)**

If pilot shows:
- ✅ Pending events manageable (< 5/day): **Keep Open mode**
- ❌ Excessive pending (> 20/day) OR owner complains: **Add Tight mode option**

```
If switching to Tight (or hybrid):
  - Add StockControlMode field to ProductFamily
  - Implement Tight flow logic
  - Update sale screen to show validation errors
  - Train staff on qty adjustment
```

**Effort to switch:** ~3 hours (minor refactor)

---

## Recommendation Summary

| Decision | Recommendation |
|---|---|
| **Best initial mode for pilot?** | **Open Mode** (v2 start; measure feedback) |
| **Production mode (long-term)?** | **Hybrid Mode** (per-product choice) |
| **Effort to implement both?** | ~7–8 hours total (Open now; Tight+Hybrid later) |
| **Risk if you choose wrong?** | Low (easy to switch during v2 sprint) |
| **Decision point?** | After 1–2 weeks pilot data (pending events volume) |

---

## Next Steps

1. **Vertical 2 Sprint Planning:**
   - Implement Open mode by default
   - Plan Tight mode as optional feature (accept in backlog; low priority)

2. **Pilot Phase (Week 2–3 of sales live):**
   - Measure: Daily pending events volume
   - Qualitative: Owner feedback ("Is manual review a burden?")

3. **Decision Gate (End of Pilot):**
   - If smooth: Keep Open mode; document as best practice
   - If chaotic: Add Tight mode; offer per-product choice

4. **v2.1 (Post-Pilot):**
   - If needed, implement Hybrid mode
   - Update backend flow + UI for mode selection
   - Retrain staff

---

**Bottom Line:**
Start Open (simple, flexible, user-friendly). Pilot data will tell you if Tight is needed. Keep the hard decision until you have evidence, not speculation.

