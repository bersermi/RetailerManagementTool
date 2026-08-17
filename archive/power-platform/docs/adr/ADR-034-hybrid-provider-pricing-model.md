# ADR-034: Hybrid Provider-Centric + Global Catalog + Pricing Layer Model

- **Status:** Accepted
- **Date:** 2026-04-11
- **Decision makers:** Sergio
- **Supersedes:** ADR-009 (ProviderCatalogItem filtering logic)
- **Related:** ADR-006 (ProductFamily/ProductVariant), ADR-028 (Transaction pricing)

---

## Context / Problem

**Previous Model (ADR-009):**
- ProductVariant availability filtered via ProviderCatalogItem join table
- Users select provider first → see only that provider's products
- Pricing stored on ProviderCatalogItem.DefaultPurchasePrice (static per provider)
- Actual prices paid stored only in PurchaseLine (transactions)
- No easy view of "what did we last pay Provider X for Product Y?"

**Issues with Previous Model:**
1. **Provider selection locks product visibility** - Can't easily see all available products across providers
2. **Pricing fragmented** - Last price for a provider-product combination buried in transaction history
3. **Adding new products tedious** - Must decide which providers carry it; adds per-provider ProviderCatalogItem rows
4. **No pricing cache** - Next purchase from same provider requires manual lookup in history
5. **ProviderCatalogItem duplication** - Static fields repeated; hard to keep consistent

**User Workflow Requirement:**
- User picks **Provider first** (central to purchasing; want consistency from one provider)
- Then sees **all products** available globally (not filtered by provider catalog)
- System auto-populates **last price** this provider had for the product
- User can **override** price if new quote received
- Next purchase **auto-fills** with new price

---

## Decision

1. **Keep global ProductVariant catalog** (workspace-scoped, all products available)
2. **Require Provider on Purchase** (user always selects provider; no "General" option)
3. **Create ProviderProductPrice table** (new; tracks last price per provider-product-workspace trio)
4. **Remove ProviderCatalogItem from transaction filtering** (deprecate; archive table)
5. **Store actual prices in PurchaseLine** (unchanged; audit trail)

### **ProviderProductPrice Table Schema**

```
- ProviderProductPriceId (PK, GUID)
- Provider (FK to crbc0_Provider, required)
- ProductVariant (FK to ProductVariant, required)
- Workspace (FK to Workspace, required)
- LastPurchasePrice (Currency, optional) ← Auto-updated from PurchaseLine.UnitPrice
- LastUpdatedDate (DateTime) ← Set to Now() on record update
- IsActive (Choice: Yes/No, default: Yes) ← Mark products as "no longer carry"
- CreatedOn, ModifiedOn (system fields)

Unique Alternate Key: (Workspace, Provider, ProductVariant)
```

### **Purchase Transaction Flow (New)**

```
1. User selects Provider (required, workspace-scoped)
2. User selects ProductVariant (global catalog; all products available)
3. System looks up: LookUp(ProviderProductPrice, 
                          Workspace.Value = gblWorkspaceId &&
                          Provider.Value = selectedProvider.ID &&
                          ProductVariant.Value = selectedProduct.ID)
4. Auto-populate price field with LastPurchasePrice (or blank if new)
5. User enters quantity; can override price
6. On confirm:
   → Create PurchaseLine (actual price paid)
   → Update/Create ProviderProductPrice record (cache new price)
   → Create StockBatch
```

### **Canvas App Changes (V1-02 Buy Screen)**

- **Provider dropdown**: Select from all workspace providers (required)
- **Product gallery**: Filter ProductVariant by `Workspace && IsActive = true` (all products, not filtered by provider)
- **Price field**: Auto-populated via ProviderProductPrice lookup; user can override
- **On confirm**: Patch both PurchaseLine and ProviderProductPrice in same transaction

---

## Rationale

### **Why This Over Previous Model?**

1. **Provider-Centric Workflow** ✓
   - User's mental model: "I'm buying from Provider X"
   - Matches manual purchasing process (fax quote, delivery from single vendor)
   - All transactions flow through chosen provider first

2. **Global Product Catalog** ✓
   - ProductVariant is single source of truth (no duplication)
   - New products instantly available; no per-provider ProviderCatalogItem setup
   - Easier analytics (deduplicated products across workspace)

3. **Pricing Cache Layer** ✓
   - ProviderProductPrice auto-populates next purchase (UX win)
   - Audit trail: PurchaseLine stores every price paid; ProviderProductPrice stores latest
   - Supports future "Provider Catalog" UI (view/edit prices per provider)

4. **Workspace Multi-Tenancy** ✓
   - Workspace FK on all tables; prices isolated per workspace
   - Provider X in Workspace-A has different prices than Provider X in Workspace-B

5. **Flexibility** ✓
   - User can always override price (don't need to renegotiate in-app)
   - Can buy from different providers without duplication
   - Price history preserved (audit trail + analytics)

---

## Consequences

### **Positive**

- ✅ **Simpler UX**: Provider first, then all products (no hidden filtering)
- ✅ **Faster onboarding**: New products available immediately; no per-provider setup
- ✅ **Price awareness**: Auto-populate shows what we paid last (reduces typos; enables quick price comparisons)
- ✅ **Audit trail**: Both transaction prices (PurchaseLine) and current prices (ProviderProductPrice) preserved
- ✅ **Future-proof**: ProviderProductPrice can support manual price editing (Provider Catalog UI in v2)
- ✅ **Workspace-safe**: Multi-tenant isolation maintained; prices per provider per workspace

### **Negative / Tradeoffs**

- ⚠️ **More tables**: Added ProviderProductPrice (slight data model complexity)
- ⚠️ **Cache sync**: If PurchaseLine price not reflected in ProviderProductPrice, needs monitoring
  - **Mitigation:** Use Patch + LookUp with ?? Defaults() pattern; optional Cloud Flow for redundancy
- ⚠️ **Provider always required**: Can't do "General" or ad-hoc purchases without provider record
  - **Accepted by-design:** Workflow requires knowing who we're buying from for profitability analysis

---

## Implementation Details

### **Data Migration**

- **ProviderCatalogItem**: Deprecated table
  - Archive (don't delete yet; keeps referential integrity)
  - Mark all records as inactive after v1 validation
  - Remove FK references from Purchase/PurchaseLine
 
- **ProductVariant**: Added IsActive column
  - Default: Yes (all existing products active)
  - Used for future discontinuation (soft delete alternative)

- **Purchase**: Provider field already required (unchanged)
  - Verified: Type = Lookup to crbc0_Provider
  - Required: Yes
  - Multi-tenancy: Verified Workspace FK on Purchase

### **Canvas App Changes**

- **V1-02 Buy screen**: Refactored
  - Provider dropdown (shows workspace-scoped providers)
  - Product gallery: Filter(ProductVariant, Workspace = gblWorkspaceId && IsActive = true)
  - Price lookup: LookUp(ProviderProductPrice, ...) with auto-fill
  - Patch both PurchaseLine and ProviderProductPrice on confirm

### **Cloud Flows** (Optional)

- **"Update Provider Price on Purchase" (v2 feature)**:
  - Trigger: PurchaseLine created
  - Action: Update ProviderProductPrice.LastPurchasePrice if different from PurchaseLine.UnitPrice
  - Benefit: Redundancy if Canvas Patch fails

---

## Test Scenarios (Validation Checklist)

- [ ] **First purchase from provider**: Select Provider A + Product X → No price history → User enters $1.00 → ProviderProductPrice created
- [ ] **Repeat purchase (auto-populate)**: Select Provider A + Product X again → Price field auto-fills with $1.00
- [ ] **Price override**: Auto-populated price $1.00 → User changes to $1.05 → Confirm → ProviderProductPrice updated to $1.05
- [ ] **Switch provider**: Select Provider B + Product X → No history for B → User enters $0.95 → Separate ProviderProductPrice for Provider B
- [ ] **Price variance tracking**: 5 purchases from Provider A at different prices → PurchaseLine shows all; ProviderProductPrice shows latest
- [ ] **Workspace isolation**: Create 2 workspaces → Buy from Provider A in Workspace-1 → Switch to Workspace-2 → Provider A shows no history (clean slate)
- [ ] **IsActive flag**: Set ProductVariant.IsActive = false → Verify not in purchase gallery

---

## Alternatives Considered

### **Option A: Keep ProviderCatalogItem as filtering mechanism**
- ❌ **Rejected**: Doesn't solve pricing cache problem; new product onboarding still tedious

### **Option B: Remove Provider requirement entirely (fully General Catalog model)**
- ❌ **Rejected**: User feedback: Provider is CENTRAL to purchasing workflow; can't be optional

### **Option C: Add pricing table but keep ProviderCatalogItem filtering**
- ❌ **Rejected**: Over-engineering; ProviderProductPrice replaces ProviderCatalogItem's role

### **Option D (Selected): Hybrid model with ProviderProductPrice + global catalog**
- ✅ **Accepted**: Meets all user requirements; balance complexity vs flexibility

---

## Follow-ups / Future Work

1. **Provider Catalog UI (v2)**
   - Screen: Select provider → Gallery of ProviderProductPrice records → Manual price edit
   - Supports bulk price update; negotiation tracking

2. **Price comparison view (Analytics)**
   - Query ProviderProductPrice: Compare prices for same product across providers
   - Identify suppliers with best rates per category

3. **Historical pricing dashboard**
   - Month-over-month price trends per provider
   - Supplier negotiation success metrics

4. **Archive ProviderCatalogItem (30 days post-v1)**
   - Confirm no FK dependencies remain
   - Move to history table if audit trail needed
   - Delete if not needed

---

## Related Decisions

- **ADR-009** (ProviderCatalog join table): Superseded by this decision; ProviderCatalogItem deprecated
- **ADR-006** (ProductFamily/ProductVariant): Unchanged; ProductVariant remains global
- **ADR-028** (Transaction pricing): Complementary; Actual prices still stored in PurchaseLine
- **ADR-022** (Workspace scoping): Maintained; Workspace FK on ProviderProductPrice

---

## Sign-off

- **Decision**: Hybrid Provider-Centric + Global Catalog + Pricing Layer
- **Implementation Date**: 2026-04-11
- **Go-Live Ready**: Yes (Phase A, Vertical 1)
- **Approved by**: Sergio
