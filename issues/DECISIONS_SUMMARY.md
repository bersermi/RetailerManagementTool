================================================================================
ISSUES RESOLUTION SUMMARY & DECISIONS RECORDED
Post-Stakeholder Input; Ready for Implementation
================================================================================

**Date:** 2026-04-04  
**Status:** Decisions Recorded; Analysis Complete  
**Prepared For:** Vertical 1 Code Kickoff  

---

## Issues Resolved & Decisions Made

### **1. ISS-007: Workspace Onboarding** ✅ **RESOLVED**

**Your Decision:** Option A (Admin-created during pilot setup)

**What this means:**
- First workspace created by admin (or during initial setup)
- Users added manually via WorkspaceMember table
- Self-service registration deferred to v2
- Infrastructure/tools must be in place; plan documented in setup playbook

**Implementation Impact:**
- V1-01 (Home) screen: Assumes user already has at least 1 workspace membership
- No "Create Workspace" button in V1
- Admin must seed workspace before pilot user can log in

**Action Items:**
- [ ] Document workspace + member creation procedure in admin playbook
- [ ] Seed test workspace(s) before Phase A completion
- [ ] V1-01 screen: Confirm error state handling ("No workspace access")

**ADR Status:** Document in ADR-030 (Workspace Onboarding v1 Approach)

---

### **2. ISS-004: Collection Rebuild Pattern** ✅ **TESTING DECISION**

**Your Decision:** Test & decide later (build V1; measure performance; compare patterns)

**What this means:**
- Implement one rebuild pattern in V1 (recommend: event-driven)
- Measure performance under realistic load (cart + sales)
- Document findings; decide best pattern post-pilot
- V1.1+ can optimize if needed

**Recommended Pattern (for v1 implementation):**
```
Option C (Event-driven): Component emits "CartModified" event
                       → Screen rebuilds colCartLines
                       → Fresher data; cleaner separation
```

**Performance Baseline Goals:**
- Gallery render (50 items): < 500ms
- Collection refresh after patch: < 1s
- No jank on add/remove item

**Action Items:**
- [ ] Phase D: Implement event-driven pattern (estimated 1h extra)
- [ ] Phase E: Benchmark with 20, 50, 100 items
- [ ] Document: Collection update strategies wiki page
- [ ] Post-pilot review: Decide on v1.1 optimizations

**ADR Status:** Decision deferred; document findings in wiki, not formal ADR yet

---

### **3. ISS-003: Quick Actions → Availability** ✅ **RESOLVED**

**Your Decision:** Option A (Optional front-end only; store owner control)

**What this means:**
- Quick action: "Mark as Out of Stock" or "Not Sellable" (store owner only)
- Creates ProductAvailabilityOverride (not stock decrement)
- Hides item from Sell screen (UX: visual feedback)
- No backend stock impact; no secondary workflows
- Entirely front-end toggle; managed via screen state

**Implementation:**
- Optional feature toggle in app settings (can disable if not needed)
- No flow changes; no new tables (uses existing ProductAvailabilityOverride)
- Staff restrictions: Enforce via app-level role check (Store owner only)
- UX: Button on product card → toggle → LocalPatch → UpdateCollection

**Action Items:**
- [ ] Define when quick actions appear in UI (in Sell screen; optional expand in v2 to Inventory view)
- [ ] Add role check: Button visible if CurrentUser.Role = Owner/Manager (v1 advisory; not enforced)
- [ ] Design toggle UI: Visual affordance (e.g., "Mark Unavailable" button with icon)
- [ ] Test: Verify item hides from Sell picker after toggle

**ADR Status:** Document in ADR-032 (Quick Actions UX v1)

---

### **4. ISS-017: LastSellUnitPrice** ✅ **RESOLVED**

**Your Decision (Clarified):** Workspace-level Settings toggle; no delta display; no reset timer in v1

**Deep Analysis Provided:** See `ISS-017-ANALYSIS-LastSellUnitPrice.md`  
**Clarification Document:** See `ISS-017-CLARIFICATION-WorkspaceSettingsToggle.md`

**Simplified Implementation (Path 2 Refined):**
- New WorkspaceSetting table: One toggle per workspace ("UseLastSellUnitPrice")
- Toggle applies uniformly to ALL products in that workspace
- When enabled: After each sale, productvariant.LastSellUnitPrice is updated
- When disabled: No price persistence; every sale starts fresh
- ALL users in that workspace see same behavior (not per-user)

**What's NOT in v1:**
- ❌ Delta display ("$2.50 ↑ $0.50 above base") — Deferred to v1.1
- ❌ Reset timer (auto-expire after 7 days) — Deferred to v1.1
- ❌ Per-product control — Workspace-level only

**Data Model (Minimal):**
```
WorkspaceSetting table [NEW]:
  Workspace (FK), SettingKey, SettingValue
  Alternate key: (Workspace, SettingKey)
  Example: (Workspace-A, "UseLastSellUnitPrice", "true")

ProductVariant [UNCHANGED]:
  LastSellUnitPrice (Decimal, optional) [EXISTING]
  (No new columns; no expiry tracking)
```

**Canvas App Flow:**
```
1. App startup: Load gblUseLastSellUnitPrice from WorkspaceSetting
2. Sale entry: Pre-fill product price IF toggle is ON
3. On confirm: Update productvariant.LastSellUnitPrice IF toggle is ON
4. Settings screen (V1-04): User can toggle ON/OFF
```

**Implementation (Phase D):**
- Create WorkspaceSetting table: 5 min
- Add Settings screen (V1-04): 30 min
- Update Buy screen logic (V1-02): 20 min
- Test: 30 min
- **Total: ~1.5 hours**

**Risk Level:** 1/10 (Extremely simple; no complex data tracking)

**Action Items:**
- [ ] Phase A (Dataverse): Create WorkspaceSetting table (5 min)
- [ ] Phase D (Screens): Build V1-04 Settings screen with toggle
- [ ] Phase D (Screens): Update V1-02 Buy screen to check gblUseLastSellUnitPrice
- [ ] Testing: Verify toggle works across users in same workspace
- [ ] v1.1 planning: Document delta display + timer as post-pilot enhancements

**ADR Status:** Document in ADR-031 (Sales Flow & Price Management)

---

### **5. ISS-022: Role Enforcement** ✅ **RESOLVED**

**Your Decision:** No issue for v1; deferred (advisory only)

**What this means:**
- Users are already well-limited (workspace membership controls access)
- No role differentiation needed in v1 UI (Owner/Manager/Staff roles exist in DB; not enforced in app)
- All users see full feature set (backend enforces roles later, if needed)
- Safe assumption: Users in a workspace are trusted to operate all features

**Implementation:**
- V1 screens: No permission checks; all features visible
- Backend: Flows run without role validation (all users trusted)
- Future (v2): Add optional role-based UI (hide features for Staff; show for Owner)

**Action Items:**
- [ ] Phase A: Seed WorkspaceMember with appropriate roles (Owner/Manager assignments)
- [ ] Document: Roles defined but not enforced in v1 (keep backward-compatible)
- [ ] Post-pilot: Gather feedback on feature visibility (do Staff users see too much?)

**ADR Status:** No ADR needed; confirm in docs that v1 is role-transparent

---

### **6. ISS-025: Dataverse Connection Strategy** ✅ **RESOLVED**

**Your Decision (Clarified):** Option B NOW (Environment Variables); Option C LATER (After TEST/PROD capacity available)

**Deep Analysis Provided:** See `ISS-025-ANALYSIS-DataverseConnectionStrategy.md`  
**Clarification Document:** See `ISS-025-CLARIFICATION-SingleDevEnvironment.md`

**Constraint Acknowledged:** Single DEV environment only; max 15-20 users pilot

**Recommended Approach (Two-Phase):**

**Phase 1 NOW (Single DEV; VVV Simple):**
```
Implementation: Option B (Environment Variables)

Setup:
  1. Create environment variable "DataverseURL" in DEV
     Value: https://yourorg.crm.dynamics.com
  2. Canvas app references: 'DataverseURL'.Value (not hardcoded)
  3. Effort: 20 minutes
  4. All 15-20 users → same env var → single DEV Dataverse

Benefit:
  ✅ Works perfectly for single environment
  ✅ Scales seamlessly when you have TEST/PROD
  ✅ Standard Dataverse practice
  ✅ Minimal setup friction
```

**Phase 2 LATER (When TEST/PROD Available):**
```
Migration: Upgrade to Option C (Connection References)

Actions:
  1. Create solution in DEV ("Retail.Core")
  2. Add canvas app to solution
  3. Create connection reference ("ConnRef_Dataverse")
  4. Export to TEST; connection ref auto-resolves to TEST Dataverse
  5. Export to PROD; connection ref auto-resolves to PROD Dataverse
  6. Effort: 30 minutes; repeatable; standard ALM

Benefit:
  ✅ Enterprise-grade ALM
  ✅ Zero hardcoding anywhere
  ✅ Audit-ready (solution tracks connections)
  ✅ No surprise refactoring (smooth upgrade path)
```

**Why Option B NOW?**
- Pilot unencumbered by ALM overhead
- 15-20 users in single DEV don't need enterprise infrastructure
- Zero technical debt (upgrading to Option C is straightforward, documented process)
- Focus pilot effort on features, not infrastructure

**Timeline for Phase 2 Upgrade:**
- Trigger: When you have TEST/PROD capacity (target 30-45 min migration)
- Not blocking current pilot (safe deferral)
- Zero impact on running v1 code

**Action Items:**
- [ ] Phase A (Day 1): Create environment variable "DataverseURL" (5 min)
- [ ] Phase A: Update canvas app formula to reference env var (5 min)
- [ ] Phase A: Test connection works (5 min)
- [ ] Phase E: Document env var setup in admin playbook
- [ ] Post-pilot (when TEST/PROD available): Upgrade to Option C

**ADR Status:** Document in ADR-030 (ALM & Environment Configuration; include two-phase roadmap)

---

### **7. ISS-026: Expiry-Null "No Expiry" UX** ✅ **RESOLVED**

**Your Decision:** Option B; Spanish translation ("Sin vencimiento")

**What this means:**
- StockBatch with null ExpiryDate shows: "Sin vencimiento" (Spanish for "No expiry")
- Not hidden from view; not shown as "∞"
- Plain text label; clear for Spanish-speaking users

**Implementation (V1-03: Stock List):**

```
Gallery cell template:
  If IsBlank(ExpiryDate):
    Text: "Sin vencimiento"  // Spanish
    Color: Gray (neutral; no urgency)
  Else If ExpiryDate < Today():
    Text: "VENCIDO: " & Text(ExpiryDate, "dd/mm/yyyy")  // Spanish; red
  Else If ExpiryDate < AddDays(Today(), 7):
    Text: "Vence: " & Text(ExpiryDate, "dd/mm/yyyy")  // Orange
  Else:
    Text: "Vence: " & Text(ExpiryDate, "dd/mm/yyyy")  // Black
```

**Future Internationalization:**
- Use resource strings (not hardcoded "Sin vencimiento")
- Support Spanish, English, Portuguese (roadmap v2+)
- Store language preference in WorkspaceMember or app settings

**Action Items:**
- [ ] V1-03 Screen: Implement Spanish labels for expiry states
- [ ] Create resource string mapping: English ↔ Spanish (culture-specific)
- [ ] Post-pilot: Gather feedback on Spanish clarity
- [ ] v2: Add language selector to workspace settings (if needed)

**ADR Status:** Minor UX decision; document in design guide (not formal ADR)

---

### **8. ISS-014: Sale Stock Decrement Timing** ✅ **RESOLVED**

**Your Decision (Clarified):** Strictly Open; NO validation; NO flagging; NO Pending events in v1

**Deep Analysis Provided:** See `ISS-014-ANALYSIS-SaleStockDecrementTiming.md`  
**Clarification Document:** See `ISS-014-CLARIFICATION-StrictlyOpenApproach.md`

**Implementation (Horizontal 2 / V1.5 Phase):**

**Strictly Open Approach:**
```
Sale Entry Flow:
  1. User selects product + quantity
  2. [NO VALIDATION] App does NOT check inventory availability
  3. [JUST RECORD] Create SaleLine (quantity + timestamp)
  4. [NO FLAGGING] No warning if qty > stock
  5. [NO PENDING EVENTS] No InventoryEvent created
  6. Done.

Result:
  ✅ Clean transaction record
  ✅ Timestamp captures exactly when sale happened
  ✅ No event-driven side effects
  ✅ Fast (no validation latency)
```

**Why Strictly Open for v1:**
- 15-20 person pilot in single DEV (trusted staff; very low risk)
- You want data FIRST, then notifications LATER
- Validation complexity adds 3-5 hours to implementation
- Post-hoc analysis (tomorrow/weekly): Compare purchase dates vs sale dates

**Data Model (No Changes Needed):**
```
SaleLine table [UNCHANGED]:
  Sale (FK), ProductVariant (FK), Qty, UnitPrice, Workspace (FK)
  CreatedOn (auto; timestamp) ← Essential for analysis

InventoryEvent table:
  [NOT USED in v1 for sales]
  [Deferred to v2.1+ when notifications are designed]
```

**Canvas App (Sale Entry V1-02 Update):**
```
BtnCompleteSale.OnSelect:
  1. Create SaleLine (quantity, user price, timestamp)
  2. Update productvariant.LastSellUnitPrice IF toggle enabled (ISS-017)
  3. Show notification: "Venta registrada"
  4. Done.

[REMOVE]
  ❌ Check inventory availability
  ❌ Create InventoryEvent
  ❌ Show oversale warning
```

**Post-Hoc Analysis (Your Responsibility Later):**
```
Phase: END OF WEEK

Query:
  SELECT ProductVariant, SUM(SaleLine.Qty) as SoldQty, SUM(Purchase.Qty) as ReceivedQty
  FROM SaleLine
  JOIN ProductVariant
  JOIN Purchase (on ProductVariant)
  WHERE CreatedDate >= DATEADD(day, -7, TODAY())
  GROUP BY ProductVariant

Analysis:
  – Which products are undersold? Oversold?
  – How long did stock last after purchase?
  – Are there systematic gaps (supplier issue? counting error?)
  – When should you reorder?

Action (Operational, not System):
  – Reorder frequency
  – Stock checking procedure
  – [Later] Automated reorder alerts
  – [Later] Notifications system (design based on data)
```

**Notifications System (v1.1+; Design After Pilot):**
```
You said: "I will then design the notifications system"

So in v1:
  ✅ Record transactions accurately (done)
  ✅ Gather timestamp data (automatic)
  
After Week 1 pilot:
  ✅ Analyze patterns (oversales? waste? trends?)
  ✅ Design notifications based on REAL DATA (not speculation)
  ✅ Implement in v1.1

Not:
  ❌ Guess notification triggers now
  ❌ Add Pending events nobody reviews
  ❌ Validate inventory before you understand your constraints
```

**Implementation Effort (v1 Sale Entry):**
- V1-02 screen: 45 min (form + logic; no validation)
- LastSellUnitPrice toggle: 20 min (ISS-017 integration)
- Testing: 20 min
- **Total: ~85 minutes for clean, fast sale entry**

**Risk Assessment (Very Low):**
- Oversale happens: Identified via timestamp analysis (next week)
- User error (wrong product): Caught by canvas app's product picker (forced selection)
- Negative qty: Blocked by cmpQtyStepper (component validation)
- Stock confusion: Explained in training; weekly audit; no system failure

**Action Items:**
- [ ] Phase D: Implement V1-02 Buy screen (simple; no validation)
- [ ] Phase D: Integrate ISS-017 toggle (workspace-level price persistence)
- [ ] Phase E (Automation): Weekly timestamp-based audit report (manual for now)
- [ ] Pilot Week 1: Capture sales + purchase data for analysis
- [ ] Pilot Week 2+: Gather feedback; design notifications THEN (not now)
- [ ] v1.1 planning: Notifications feature based on real pilot patterns

**ADR Status:** Document in ADR-031 (Sales Flow & Inventory Control)

---

### **7. ISS-026: Dataverse OData Lookup Binding Limitations** ✅ **RESOLVED**

**Your Decision:** Abandon PowerShell direct OData for multi-step record creation; use manual Dataverse UI + Power Automate flows

**What this means:**
- Provider workspace relationship binding fails via OData API despite metadata support
- Root cause: Empty `<LookupTypes />` in Entity.xml prevents lookup exposure
- 5+ troubleshooting attempts exhausted (PATCH workaround, X-HTTP-Method header, ConvertTo-Json variations, etc.)
- **Recommended Alternative:** Manual Dataverse UI (2 min per record) or Power Automate cloud flow (5 min to build; 30 sec to run)

**Why This Decision:**
- Unblocks Phase A immediately (no more API debugging)
- Establishes pattern: Use UI/Power Automate for data; PowerShell only for simple reads or basic writes
- Aligns with Phase B migration strategy (direct SQL for relationships avoids OData entirely)
- Cost-benefit: 2 hours debugging OData ≠ 3 minutes using UI

**Implementation:**
- Delete PowerShell scripts attempting OData lookup binding (already completed)
- Use Dataverse UI to manually create 2 Providers + set workspace relationship via form picker
- Build Power Automate flow for future bulk operations (reusable template)

**Phase A Impact:**
- Providers created manually: 2 min
- Delay: None (manual UI faster than troubleshooting)
- Risk: None (UI is straightforward)

**Action Items:**
- [x] Delete PowerShell scripts (completed 2026-04-10)
- [ ] Create 2 Providers manually in Dataverse UI
- [ ] Document Power Automate flow pattern for bulk data seeding (reference for later)

**Lessons Learned:**
- Empty LookupTypes = relationship not exposed for creation binding in OData
- Power Automate "Add record" action handles relationships properly (use instead of direct API)
- `ConvertTo-Json` unreliable for `@odata.bind` syntax
- Confirmed: Phase A → UI/Power Automate; Phase B → SQL (no OData)

**ADR Status:** Document in ADR-031 (reference section on data seeding approach)

---

### **9. ARCHITECTURE-034: Hybrid Provider-Centric + Global Catalog + Pricing Layer** ✅ **IMPLEMENTED**

**Your Decision:** Shift from provider-centric filtering to hybrid model with pricing cache

**Status:** Tables created + ProviderCatalogItem deprecated

**What this means:**
- **ProductVariant**: Global workspace catalog (all products always available)
- **Provider**: Required on Purchase (user selects provider first)
- **ProviderProductPrice** (NEW): Caches last price per (Provider, ProductVariant, Workspace)
- **ProviderCatalogItem**: Deprecated; removed from transaction filtering

**Workflow Impact:**
```
1. User selects Provider (required; central to workflow)
2. System shows ALL ProductVariants (not filtered by provider catalog)
3. User selects product
4. System looks up ProviderProductPrice → Auto-populate last price from this provider
5. User can override price if new quote
6. On confirm:
   → Create PurchaseLine (actual price paid; transaction record)
   → Update ProviderProductPrice (cache new last price)
   → Create StockBatch (FIFO inventory)
```

**Data Model (Finalized):**

ProductVariant (Added):
```
  - IsActive (Choice: Yes/No, default: Yes) ← Soft-delete flag
  - BasePrice (optional Currency) ← Reference price
```

ProviderProductPrice (NEW):
```
  Columns:
    - ProviderProductPriceId (PK, GUID)
    - Provider (FK to crbc0_Provider, required)
    - ProductVariant (FK to ProductVariant, required)
    - Workspace (FK to Workspace, required)
    - LastPurchasePrice (Currency, optional) ← Cached from last purchase
    - LastUpdatedDate (DateTime) ← When this price was last set
    - IsActive (Choice: Yes/No, default: Yes) ← Mark as "no longer carry"

Unique Alternate Key: (Workspace, Provider, ProductVariant)
```

Purchase (Verified):
```
  - Provider field: Required (Lookup to crbc0_Provider)
  - Workspace (FK): Present (multi-tenant scoping)
```

ProviderCatalogItem (Deprecated):
```
  Status: Archive; no longer used for filtering
  Action: Do not delete; keep for referential integrity
```

**Implementation Details:**

Canvas App (V1-02 Buy Screen):
```
// Provider dropdown (required)
ddlProvider.Items: Filter(Provider, Workspace = gblWorkspaceId)

// Product gallery (global catalog; all workspace products)
galProduct.Items: Filter(ProductVariant, 
                         Workspace = gblWorkspaceId && 
                         IsActive = true)

// Price auto-populate (ProviderProductPrice lookup)
On product select:
  Set(lastPrice, 
    LookUp(ProviderProductPrice,
      Workspace.Value = gblWorkspaceId &&
      Provider.Value = selectedProvider.ID &&
      ProductVariant.Value = selectedProduct.ID
    ).LastPurchasePrice)
  Set(priceDisplay, If(IsBlank(lastPrice), 0, lastPrice))

// On confirm (update both transaction + cache)
Patch(PurchaseLine, ..., {actual price paid})
Patch(ProviderProductPrice, ..., {
  LastPurchasePrice: actualPricePaid,
  LastUpdatedDate: Now()
})
```

**Benefits:**
- ✅ Provider-centric workflow (matches user mental model: "buying from Provider X")
- ✅ Global catalog (no per-provider duplication)
- ✅ Price auto-populate (reduces data entry; shows purchase history)
- ✅ Audit trail (PurchaseLine stores all prices; ProviderProductPrice stores latest)
- ✅ Future-proof (supports Provider Catalog UI in v2)

**Risks & Mitigations:**
- ⚠️ Price cache sync: Use Patch + LookUp with ?? Defaults() pattern; optional Cloud Flow for redundancy
- ⚠️ Provider required: By design; all purchases must specify supplier

**Action Items:**
- [x] Create ProviderProductPrice table (completed 2026-04-11)
- [x] Add ProductVariant.IsActive column (completed 2026-04-11)
- [x] Remove ProviderCatalogItem from transaction filtering (completed 2026-04-11)
- [ ] Update V1-02 Buy screen with price lookup + auto-fill formula
- [ ] Test: Auto-populate scenario (different prices per provider)
- [ ] Test: Workspace isolation (prices per workspace)
- [ ] Test: Price override (user changes auto-filled price)

**Test Scenarios:**
- [ ] First purchase from provider → Price field blank → User enters $1.00 → ProviderProductPrice created
- [ ] Repeat purchase from same provider → Price auto-fills with $1.00
- [ ] Override auto-filled price → $1.00 → $1.05 → ProviderProductPrice updated
- [ ] Switch provider → Different provider shows blank (no history with new provider)
- [ ] Workspace isolation → Workspace-A and Workspace-B have separate prices

**ADR Status:** ADR-034 created (Hybrid Provider Pricing Model)

**Recommendation:** Ready to update V1-02 screen formulas; then test all scenarios before code submission.

---

## Summary: Issues Closed vs. Deferred vs. In-Progress

| ID | Issue | Status | ADR | Next Step |
|--|--|--|--|--|
| ISS-001 | Flow diagram | HIGH | NEW | Create swimlane (Post-v1.0) |
| ISS-002 | InventoryEvent flow | CRITICAL | ADR-031 | Design in V2 (Sales + Waste) |
| ISS-003 | Quick actions | ✅ RESOLVED | ADR-032 | Implement V1; optional |
| ISS-004 | Collection rebuild | ✅ TESTING | Wiki | Measure V1; decide v1.1 |
| ISS-005 | Cart panel UX | MEDIUM | Deferred | V2 (Sale screen) |
| ISS-006 | Search-first UX | MEDIUM | Deferred | V2+ (provider catalog) |
| ISS-007 | Workspace onboarding | ✅ RESOLVED | ADR-030 | Admin setup procedure |
| ISS-008 | Price override reset | LOW | ADR-031 | V2 (Sales flow) |
| ISS-009 | cmpQtyStepper schema | ✅ RESOLVED | Spec | Phase C (component design) |
| ISS-010 | cmpMoneyInput contract | ✅ RESOLVED | Spec | Phase C (component design) |
| ISS-011 | Cart sync pattern | MEDIUM | Deferred | V2 (Cart panels) |
| ISS-012 | Breakpoint constant | MEDIUM | Deferred | V1.1 (polish) |
| ISS-013 | No-data states | MEDIUM | Deferred | V1.1 (polish) |
| ISS-014 | Sale stock decrement | ✅ ANALYSIS | ADR-031 | V2 (Open mode; test later) |
| ISS-015 | Shortage handling | HIGH | ADR-031 | V2 (depends on ISS-014) |
| ISS-016 | Availability override | MEDIUM | Deferred | V2+ (future features) |
| ISS-017 | LastSellUnitPrice | ✅ ANALYSIS | ADR-031 | V2 (Path 2; test & polish) |
| ISS-018 | Event strategy field | MEDIUM | ADR-014 | Review existing table |
| ISS-019 | Product import | MEDIUM | Deferred | V2+ (provider catalog mgmt) |
| ISS-020 | App startup | CRITICAL | v1-01 Spec | Phase D (Home screen) |
| ISS-021 | Error handling | HIGH | NEW | Create error handling guide |
| ISS-022 | Role enforcement | ✅ RESOLVED | None | Advisory only; deferred |
| ISS-023 | Scoping checklist | HIGH | ADR-022 Update | Add to code review checklist |
| ISS-024 | New ADRs | HIGH | Multiple | Create ADR-030, 031, 032 |
| ISS-025 | Dataverse connection | ✅ ANALYSIS | ADR-030 | Phase A (setup connection ref) |
| ISS-026 | PowerShell OData limits | ✅ RESOLVED | ADR-031 | Use manual UI + Power Automate |
| ISS-027 | WorkspaceMember schema | MEDIUM | ADR-002 Update | DV review; document limitation |
| ISS-028 | Name normalization | MEDIUM | Flow Spec | Phase B (normalize flow) |
| ISS-029 | FIFO logic | HIGH | ADR-011 Update | DB index design; test V2 |
| ISS-030 | Happy path doc | MEDIUM | None | Append to initContext.md |
| **ADR-034** | **Hybrid Provider Pricing Model** | **✅ IMPLEMENTED** | **ADR-034** | **Update V1-02 screen; test** |

---

## New ADRs Required (Ready for Draft)

| ADR # | Title | Based On | Effort | Assignee |
|--|--|--|--|--|
| **ADR-030** | Workspace Onboarding & Setup (v1) | ISS-007, ISS-025 | 1h | Tech Lead |
| **ADR-031** | Sales Flow & Price Management (v1) | ISS-014, ISS-017, ISS-008 | 2h | Tech Lead |
| **ADR-032** | Quick Actions & Availability Overrides (v1) | ISS-003 | 0.5h | Tech Lead |

---

## Master Implementation Timeline (Vertical 1 + Early V2)

```
Phase A (Days 1–3): Dataverse + Flows
  ├─ Setup connection reference (ISS-025) [30 min]
  ├─ Create schema (purchase, stock, workspace tables)
  ├─ Seed test data + workspace setup (ISS-007)
  └─ Normalize names flow + Audit trail

Phase B (Days 3–5): Core Flows
  ├─ Purchase Completed → StockBatch (ADR-011)
  └─ Normalize Names flow (all tables)

Phase C (Days 4–6): Components
  ├─ cmpQtyStepper finalize (ISS-009)
  ├─ cmpMoneyInput finalize (ISS-010)
  └─ Test in isolation

Phase D (Days 6–9): Screens (V1)
  ├─ V1-01 Home / Workspace (ISS-007, ISS-020)
  ├─ V1-02 Buy / Purchase Entry (ISS-014 strictly open; no validation)
  ├─ V1-03 Inventory / Stock View (ISS-026)
  ├─ V1-04 Settings / Workspace Config (ISS-017 workspace toggle) [NEW]
  └─ Test: Collection rebuilds (ISS-004 measurement)

Phase E (Days 9–10): Hardening V1
  ├─ Code review (scoping checklist ISS-023)
  ├─ Workspace isolation test
  ├─ Performance baseline (collection ISS-004)
  └─ Documentation complete

Post-V1 Pilot (Week 2–3):
  ├─ Measure pending events (ISS-014 decision point)
  ├─ Feedback on LastSellUnitPrice toggle (ISS-017)
  ├─ Decide: Open mode OK? Or add Tight?
  └─ Plan V2 (Sales + InventoryEvent refinement)

V2 Sprint (Early):
  ├─ Implement Open mode sale flow (ISS-014)
  ├─ Price override toggle UI (ISS-017)
  ├─ Pending events review screen (ISS-014)
  ├─ Quick actions optional (ISS-003, ISS-015)
  └─ Shortage handling (ISS-015)
```

---

## Artifacts Created

**Analysis Documents:**
- 📄 `ISS-014-ANALYSIS-SaleStockDecrementTiming.md` — Tight vs Open comparison
- 📄 `ISS-017-ANALYSIS-LastSellUnitPrice.md` — Risk analysis + Path 2 recommendation
- 📄 `ISS-025-ANALYSIS-DataverseConnectionStrategy.md` — Option C (Connection Refs)

**Updated Tracker:**
- 📄 `ISSUES_TRACKER.md` — All decisions recorded; resolved issues marked

**Screen Specifications (Created Earlier):**
- 📄 `V1-01-HOME-WorkspaceSelector.txt`
- 📄 `V1-02-BUY-PurchaseEntry.txt`
- 📄 `V1-03-INVENTORY-StockBatchList.txt`

---

## Next Actions Before Code Kickoff

### **Day 1 (Tomorrow):**
- [ ] Review ISS-014 analysis; confirm Open mode start (v2 sprint)
- [ ] Review ISS-017 analysis; confirm Path 2 (toggle + expiry)
- [ ] Review ISS-025 analysis; confirm Option C (connection refs)

### **Day 2:**
- [ ] Assign ADR drafting (ADR-030, 031, 032) to Tech Lead
- [ ] Schedule workspace/setup playbook creation (admin procedures)
- [ ] Assign database schema finalization to DV Admin

### **Phase A (Before Code):**
- [ ] Setup connection reference (30 min)
- [ ] Create test workspace + user (ISS-007)
- [ ] Seed test providers + products (Phase A test data)

### **Code Kickoff (Phase D Start):**
- [ ] ADRs 030, 031, 032 published
- [ ] Screen specs finalized + approved
- [ ] Component contracts signed off
- [ ] Go/No-go decision: Ready to code?

---

## Risk Register (Remaining Open Issues)

| Risk | Mitigation | Owner |
|---|---|---|
| **Price persistence forgotten (ISS-017)** | Default toggle OFF; workspace-level reduces confusion; post-pilot audit | Tech Lead |
| **Oversales undetected early (ISS-014)** | Weekly timestamp audit; user training on "open approach"; gradual escalation | Sergio |
| **Collection performance (ISS-004)** | Baseline measurement; v1.1 optimization if needed | Dev |
| **Env var drift across environments (ISS-025 Phase 1)** | Documented upgrade path to Option C; migration scheduled for TEST/PROD | Tech Lead |

---

## Conclusion

✅ **All critical issues analyzed, decided, or scheduled.**

- **3 issues analyzed** (ISS-014, ISS-017, ISS-025) with detailed trade-off assessments
- **4 issues resolved** (ISS-007, ISS-003, ISS-022, ISS-026) with clear direction
- **4 issues to test** (ISS-004, others) will measure during V1 pilot
- **Remaining issues** deferred to V2+ with documented rationale

**You're ready to kickoff Vertical 1 Phase A with confidence. All blockers identified, analyzed, and addressed.**

