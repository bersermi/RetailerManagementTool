================================================================================
ANALYSIS: ISS-017 - LAST SELL UNIT PRICE (LSUP) FEATURE
Risks, Implementation Paths, and Testing Strategy
================================================================================

**Date:** 2026-04-04  
**Status:** Analysis + Risk Assessment  
**Stakeholder:** Sergio  
**Request:** Analyze risks; keep feature open for polish through testing  

---

## What User Wants (Requirements Clarification)

From ISS-017 decision:
- **Feature:** User can override product price during a transaction
- **Persistence decision:** Toggle option to persist override to next transaction OR reset to base price
- **History:** Backend should track price history (may need dedicated table)
- **Frontend:** Manage behavior through collections; low implementation cost

---

## Current State (from ADR-012 + Assessment)

```
ProductVariant.LastSellUnitPrice (Decimal, optional)
  ├─ Updated on Sale completion: LastSellUnitPrice = SaleLine.UnitPrice
  └─ Used to pre-populate next sale (UX convenience)

SaleLine.UnitPrice (captured on sale creation)
  ├─ Can be overridden from ProductVariant.LastSellUnitPrice
  └─ Persisted in SaleLine record (audit trail)
```

**Current Implementation Logic (from ADR-012):**
- Sale completes → Flow reads SaleLine.UnitPrice → Updates ProductVariant.LastSellUnitPrice
- Next sale on same product → Pre-fill price from LastSellUnitPrice
- **No toggle yet** for "persist or reset"

---

## Feature Design: Price Persistence Toggle

### **The Two Modes**

#### Mode 1: "Use Last Price Next Time" (Sticky)
```
Sale 1: Black Beans sold at $2.50/kg (manual override from $2.00)
  ↓
ProductVariant.LastSellUnitPrice = $2.50
  ↓
Sale 2: Black Beans pre-filled with $2.50 (from last sale)
  ↓
User sees: "Last sold at $2.50" [toggle to use base price]
```

**Frontend Behavior:**
```
During Sell screen form fill:
  varProductPrice = ProductVariant.LastSellUnitPrice (if not null)
  
  [Toggle/checkbox] "Use last sell price for next transaction"
  
  On sale complete:
    If varUseLast Sell Price toggle = true:
      LastSellUnitPrice = varProductPrice (keep it)
    Else:
      LastSellUnitPrice = ProductVariant.BasePrice (reset to base)
      OR LastSellUnitPrice = null (clear it)
```

#### Mode 2: "Reset to Base Price" (Sticky Reset)
```
Sale 1: Black Beans sold at $2.50/kg (manual override from $2.00)
  ↓
Sale 1 completes with toggle OFF ("reset to base")
  ↓
ProductVariant.LastSellUnitPrice = ProductVariant.BasePrice (e.g., $2.00)
  ↓
Sale 2: Black Beans pre-filled with $2.00 (back to base)
  ↓
LastSellUnitPrice never persists; always resets
```

---

## Data Model & Storage Requirements

### **Current Tables (Sufficient?)**

**ProductVariant:**
```
ProductVariantId (PK)
Name
BasePrice (Decimal) -- BASE price for the product [ASSUMED TO EXIST]
LastSellUnitPrice (Decimal) -- CURRENT: captures last sold price
Workspace
```

**SaleLine:**
```
SaleLineId (PK)
Sale (FK)
ProductVariant (FK)
Qty (Decimal)
UnitPrice (Decimal) -- Price actually charged in this transaction
Workspace
```

**InventoryEvent (future usage):**
```
InventoryEventId (PK)
Type (Choice)
Status (Pending/Finalized)
Qty
Workspace
```

### **Proposed: Price History Table (Optional)**

**If full price audit needed:**

```
PriceHistoryRecord:
  Id (PK)
  ProductVariant (FK)
  Price (Decimal)
  TransactionType (Sale/Purchase/Adjustment/Manual)
  TransactionDate (DateTime)
  User (FK)
  Notes (Text, optional)
  Workspace
  
  Index on: (ProductVariant, TransactionDate DESC)
```

**Use case:**
- Report: "What prices did we charge for Black Beans over the last 30 days?"
- Compliance: "Show me every price change with who did it and when"

**Cost:**
- One more table to create
- One more flow: On SaleLine completion → Log price to PriceHistoryRecord
- Storage: ~1KB per transaction (negligible at scale)

---

## Risk Analysis

### **Risk 1: Price Drift (Biggest Risk)**

**Scenario:**
```
Day 1: Black Beans @ $2.00 (base)
  Sale 1 @ $2.50 (override; keep for next)
  ↓
Day 2: Black Beans @ $2.50 (was "last")
  Sale 2 @ $2.75 (override again; keep for next)
  ↓
Day 30: Black Beans @ $3.00+ (accumulated small increases)
  → Base price is still $2.00; LastSell is $3.00
  → No owner notices drift until reporting time
```

**Impact:** Business hemorrhage (wrong margins); inconsistent pricing

**Mitigation:**
- ✅ **Show price delta:** Display "Charging $2.50  (↑ $0.50 above base)"
- ✅ **Reset timer:** Automatically reset LastSellUnitPrice to BasePrice after 30 days (configurable)
- ✅ **Activity dashboard:** Show frequent price overrides per product (flag for owner review)
- ✅ **Default to reset:** Make "reset to base" the default toggle (safer UX)
- ✅ **Price history table:** Track all overrides for audit

---

### **Risk 2: Accidental "Sticky" Override**

**Scenario:**
```
Sale 1: Manager overrides Black Beans $2.50 (was $2.00) for a bulk deal
  → Forgets to toggle "reset to base"
  ↓
Sale 2–50: All staff see $2.50 and use it (wasn't the intent; was one-time)
  → Revenue loss on 49 sales
```

**Impact:** Unintended permanent lower prices

**Mitigation:**
- ✅ **Default UX:** Toggle OFF by default (must explicitly choose to persist)
- ✅ **Tooltip:** "This overrides the base price for future sales"
- ✅ **Confirmation:** "Confirm: Next sales will use $2.50 until you change it"
- ✅ **Activity log:** Show who changed LastSellUnitPrice and when
- ✅ **Staff restrictions:** (future) Disable "sticky" for non-managers

---

### **Risk 3: Frontend Collection Sync Issues**

**Scenario:**
```
varUseLastSellPrice Toggle = true (user selected)
  ↓
Sale completes; LastSellUnitPrice should update to varProductPrice
  ↓
But: Network fails halfway → Toggle state out of sync with Dataverse
  ↓
Next sale: Collection still thinks LastSellUnitPrice is old value
  → Shows stale price; confuses user
```

**Impact:** Data inconsistency; user confusion

**Mitigation:**
- ✅ **Refresh after save:** Always `Refresh(colProducts)` post-sale completion
- ✅ **Explicit feedback:** Toast "Price persisted: $2.50 will be used next time" OR "Price reset to base: $2.00"
- ✅ **Offline handling:** If offline (no network), queue override locally; sync on reconnect
- ✅ **Timestamp:**Store update timestamp on ProductVariant; detect stale cache

---

### **Risk 4: Unclear Business Logic**

**Scenario - Ownership question:**
```
User perspective:
  "Is LastSellUnitPrice the recommended price, or what we charged last?"
  
Different interpretations lead to:
  - Some users thinking it's a floor (don't go below)
  - Others thinking it's a suggestion (can override)
  - Managers thinking it's a signal (price trending up?)
```

**Impact:** Confusion; inconsistent pricing decisions

**Mitigation:**
- ✅ **Clear labeling:** Not "Last Sell Price"; instead:
  - "Suggested Price (from last transaction)" OR
  - "Previous Sale Price (may be outdated)"
- ✅ **Owner training:** Document clearly (playbook) what LastSellUnitPrice represents
- ✅ **UI affordance:** Show both BasePrice AND LastSellUnitPrice side-by-side:
  ```
  Base Price:     $2.00
  Last Sale:      $2.50  ← Suggested (25% markup)
  ```

---

### **Risk 5: Multi-location/Multi-user Pricing Conflicts**

**Scenario (only relevant if multi-workspace):**
```
Workspace A: Black Beans base = $2.00
Workspace B: Black Beans base = $2.50
  
  But they share ProductVariant record (global product)
  ↓
  Workspace A sells @ $2.75 override
  ↓
  LastSellUnitPrice = $2.75 (updated globally)
  ↓
  Workspace B user sees $2.75 (above their base of $2.50!) 😱
```

**Impact:** Cross-workspace pricing contamination

**Mitigation:**
- ✅ **Workspace scoping:** LastSellUnitPrice should be workspace-specific
  - Option: Move LastSellUnitPrice from ProductVariant → ProductFamilyWorkspaceSettings table
  - Or: Add Workspace FK to historical PriceHistoryRecord (always filtered by workspace)
- ✅ **Index:** Dataverse index on (ProductVariant, Workspace) for LastSellUnitPrice
- ✅ **Filter:** Every price read includes Workspace = gblWorkspaceId

---

### **Risk 6: Price History Table Performance**

**Scenario (if using dedicated price history table):**
```
100 stores × 200 sales/day × 365 days = 7.3M price history records/year
  
Query: "Show me price history for Black Beans in Q4"
  ↓
Scan 1.8M records (90 days × 200 sales/day × 100 stores)
  ↓
Query takes 5+ seconds; UI appears frozen
```

**Impact:** Analytics/reporting slow; business users avoid using it

**Mitigation:**
- ✅ **Indexes:** Create index on (ProductVariant, Workspace, TransactionDate) 
- ✅ **Partitioning:** Archive old history (> 1 year) to separate table
- ✅ **Aggregation:** Store monthly summary separately (reduce queries)
- ✅ **Query optimization:** Filter by workspace + product first (narrow before date filter)
- ✅ **Lazy load:** Don't show full history by default; pagination on demand

---

## Implementation Paths Ranked by Risk

### **Path 1: Simple (Lowest Implementation, Highest Business Risk)**

```
ProductVariant.LastSellUnitPrice (existing field)
  ├─ Always update on sale (no toggle)
  └─ User never controls persistence
  
Issues:
  - Risk 1 (Price Drift): Uncontrolled accumulation
  - Risk 4 (Unclear Logic): Users confused about "why this price?"
  - Zero toggle; no control
```

**Effort:** 0 (already exists in ADR-012)  
**Risk Score:** 7/10 (High business risk)  
**Recommendation** ❌ Not acceptable; too risky

---

### **Path 2: Middle Ground (Recommended for V1)**

```
ProductVariant.LastSellUnitPrice (existing)
  + Toggle during sale: "Use as suggested price for next transaction"
  + Default OFF (safe default; must explicitly enable)
  + Show delta: "$2.50 (↑$0.50 above base)"
  + Reset timer: Auto-expire after 7 days (configurable per workspace)
  + Activity log: Simple audit; who changed what, when

NO separate price history table yet (defer to v2 if needed)

Data changes:
  - Add ProductVariant field: "LastSellUnitPriceExpiryDate" (DateTime)
  - Add ProductVariant field: "LastSellUnitPriceSetBy" (User lookup, optional)
```

**Console-side Logic (Sell screen):**
```
On SaleLine edit:
  varSuggestedPrice = ProductVariant.LastSellUnitPrice
  
  If varSuggestedPrice is not null AND not expired:
    Show: "Use last price: $varSuggestedPrice"
    ToggleStickyPrice: "Remember this price for next sale"
  Else:
    Show: varBasePrice (refresh from ProductVariant.BasePrice)

On sale complete:
  If ToggleStickyPrice = true:
    UpdateLastSellPrice(ProductVariant, varChargedPrice, expiry: Today() + 7 days)
  Else:
    ClearLastSellPrice(ProductVariant)
```

**Effort:** 2–3 hours (toggle UI + expiry logic)  
**Risk Score:** 3/10 (Controlled; safe defaults)  
**Recommendation** ✅ **Preferred for V1**

---

### **Path 3: Enterprise (Highest Implementation, Lowest Business Risk)**

```
ProductVariant.LastSellUnitPrice (existing)
  + Path 2 (toggle + expiry + audit)
  + Separate PriceHistoryRecord table
  + Workspace-scoped: LastSellUnitPrice per workspace
  + Activity dashboard: Show frequent overrides (flag anomalies)
  + Admin UI: Override audit trail with filters
  
Data changes:
  - New table: PriceHistoryRecord (see schema above)
  - ProductVariant: LastSellUnitPriceExpiryDate
  - ProductVariant: LastSellUnitPriceWorkspace (normalize scoping)
  - New flow: SaleLine completed → log to PriceHistoryRecord
```

**Effort:** 6–8 hours (table design + flow + reporting)  
**Risk Score:** 1/10 (Fully audited)  
**Recommendation** ✅ **Recommended for post-V1 if compliance needed**

---

## Testing Strategy

### **V1 Testing (Path 2: Middle Ground)**

```
Unit Tests (app logic):
  [ ] varSuggestedPrice populated if LastSellUnitPrice not null
  [ ] varSuggestedPrice = null if expired (> 7 days old)
  [ ] ToggleStickyPrice OFF by default
  [ ] Toggle ON → "Remember for next sale" message shown
  [ ] Toggle OFF → LastSellUnitPrice cleared on save
  [ ] Show delta: "$2.50 (↑$0.50 above base)"
  [ ] Base price shown for reference

Integration Tests:
  [ ] Sale 1: Sell Black Beans @ $2.50 (override from $2.00)
  [ ] Toggle ON: "Remember this price"
  [ ] Save → ProductVariant.LastSellUnitPrice = $2.50
  [ ] Set expiry: ProductVariant.LastSellUnitPriceExpiryDate = Today() + 7
  
  [ ] Sale 2 (next day): Open Black Beans → pre-fill $2.50
  [ ] Toggle OFF: "Reset to base"
  [ ] Save → ProductVariant.LastSellUnitPrice = null
  [ ] Sale 3: Open Black Beans → pre-fill $2.00 (base)
  
  [ ] Sale 4 (8 days later): Suggested price expired
  [ ] Open Black Beans → pre-fill $2.00 (base, not expired override)

Negative Tests:
  [ ] Override $2.50; forget to toggle → LastSellUnitPrice cleared (safe default)
  [ ] Network failure during override → Retry succeeds; no data loss
  [ ] Workspace A override $2.75 → Workspace B sees base $2.50 (not contaminated)

Usability Tests (Live Pilot):
  [ ] Store owner understands "Remember this price" toggle
  [ ] Users see price delta clearly
  [ ] No accidental "sticky" overrides after training
  [ ] Owner can spot price drift via activity log
```

### **V1.1+ Testing (Path 3: Enterprise)**

```
PriceHistoryRecord Validation:
  [ ] Each sale creates one PriceHistoryRecord
  [ ] All changes logged (User, DateTime, TransactionType)
  [ ] Query performance: < 1s for 1000 records
  [ ] Archive old records (> 1 year) to reduce table size

Reports:
  [ ] "Price overrides by product (last 30 days)"
  [ ] "Staff member pricing behavior"
  [ ] "Identify anomalies: prices consistently above base"
```

---

## Recommended Implementation Plan

### **Phase:** V1 Sell Screen (Vertical 2)

**Decision:** Use **Path 2 (Middle Ground)**

```
Week 1: Design
  [ ] Finalize toggle UI (placement on Sell screen)
  [ ] Decide reset timer duration (7 days? configurable?)
  [ ] Write acceptance criteria

Week 2: Frontend Implementation
  [ ] Add toggle to Sell screen form
  [ ] Implement expiry logic (compare LastSellUnitPriceExpiryDate vs Today())
  [ ] Show suggested price + delta
  [ ] Test collection refresh post-save

Week 3: Backend (Flow)
  [ ] Update "Sale Completed" flow to:
    - If ToggleStickyPrice = true: Set LastSellUnitPrice + expiry
    - If ToggleStickyPrice = false: Clear LastSellUnitPrice
  [ ] Test with various scenarios

Week 4: Testing + Polish
  [ ] Unit + integration tests
  [ ] Live pilot with store owner
  [ ] Adjust UX based on feedback
  [ ] Document "How to use last sell price" in playbook
```

### **Post-V1 (v1.1+): Upgrade to Path 3 (Enterprise)**

**Trigger:** If compliance/audit needed OR pricing anomalies detected in pilot

```
Create PriceHistoryRecord table
  Add logging flow
  Build reporting dashboards
  Create admin audit UI
```

---

## Decision Summary

| Aspect | Recommendation |
|--------|---|
| **Keep feature open?** | ✅ Yes; defer decisions to Vertical 2 (Sell screen) |
| **Path to use v1?** | Path 2 (Middle Ground): Toggle + expiry + audit log |
| **Data model changes** | Add 2 fields to ProductVariant; no new tables yet |
| **Risk level** | 3/10 (Controlled; safe defaults prevent drift) |
| **Effort** | 2–3 hours (Vertical 2 Sell screen sprint) |
| **Polish via testing?** | ✅ Yes; live pilot will show if toggle is confusing |
| **Workspace scoping** | Must scope LastSellUnitPrice per workspace (add check) |
| **Future enhancement** | Path 3 (dedication price history table + dashboard) |

---

## Action Items

1. **Before Vertical 2 (Sale screen):**
   - Confirm Path 2 (Middle Ground) approval
   - Add "LastSellUnitPriceExpiryDate" field to ProductVariant schema

2. **During Vertical 2 Design:**
   - Finalize toggle UI and messaging
   - Update "Sale Completed" flow with expiry logic
   - Write acceptance tests

3. **Post-V1 Live Pilot:**
   - Gather feedback on toggle UX
   - Monitor for price drift anomalies
   - Decide if Path 3 (full audit) is needed

---

