# Test Data Strategy v1: Seeding & Refresh Procedures

**For:** Admin, QA, Dev Team  
**Status:** Ready for Phase A Pilot  
**Version:** 1.0  
**Last Updated:** 2026-04-07  

---

## Overview

This document defines:
1. **Initial Pilot Data Set:** Products, suppliers, and stock for Phase A testing
2. **Data Refresh Procedures:** How to reset between test cycles
3. **Scenario-Specific Data:** Pre-built data sets for testing edge cases
4. **Performance Test Data:** Larger data sets for stress testing (Phase E)
5. **Backup & Restore:** Simple procedures to recover test data

**Key Principle (from ADR-031):** Test with realistic data (product variety, stock levels, pricing) to ensure pilot group can perform real transactions and surface actual operational constraints.

---

## Table of Contents
1. [Initial Pilot Data Set (Week 1)](#initial-pilot-data-set-week-1)
2. [Data Refresh Procedures](#data-refresh-procedures)
3. [Scenario-Specific Data](#scenario-specific-data)
4. [Performance Test Data (Phase E)](#performance-test-data-phase-e)
5. [Backup & Restore](#backup--restore)

---

## Initial Pilot Data Set (Week 1)

### Objective
Seed 15-20 pilot users with realistic product data (~10-15 SKUs), initial stock (~50-100 units per product), and pricing that reflects actual business (Spanish context: grocery/retail).

### ProductFamily Records

Create 3-4 product families:

```
1. Name: Fresh Produce
   Normalized Name: fresh_produce
   Description: Fruits, vegetables, fresh items
   
2. Name: Dairy & Eggs
   Normalized Name: dairy_eggs
   Description: Milk, cheese, eggs, yogurt, butter
   
3. Name: Beverages
   Normalized Name: beverages
   Description: Drinks, juices, water, soft drinks
   
4. Name: Pantry & Dry Goods
   Normalized Name: pantry_dry_goods
   Description: Rice, beans, pasta, canned items
```

### ProductVariant Records (10-15 SKUs)

| Product Name | Family | Unit | Initial Stock | Unit Cost | Est. Sell Price | Notes |
|---|---|---|---|---|---|---|
| Bananas (1 lb bunch) | Fresh Produce | lb | 60 | $0.40 | $0.79 | High turnover |
| Tomatoes (1 lb) | Fresh Produce | lb | 40 | $0.60 | $1.29 | Perishable; rotate weekly |
| Lettuce (1 head) | Fresh Produce | ea | 30 | $0.75 | $1.49 | Check expiry often |
| Whole Milk (1 gal) | Dairy & Eggs | gal | 20 | $2.00 | $3.49 | Core staple |
| Eggs (1 dozen) | Dairy & Eggs | ea | 25 | $1.80 | $3.29 | Fragile; check stock daily |
| Cheddar Cheese (1 lb) | Dairy & Eggs | lb | 10 | $3.00 | $5.99 | Lower turnover |
| Orange Juice (1 gal) | Beverages | gal | 30 | $1.50 | $3.99 | Popular item |
| Bottled Water (case of 24) | Beverages | ca | 15 | $2.50 | $5.99 | Bulky; space limited |
| Rice (5 lb bag) | Pantry & Dry Goods | ba | 20 | $1.20 | $2.49 | Stable shelf life |
| Beans (1 lb bag) | Pantry & Dry Goods | ba | 25 | $0.80 | $1.79 | Various types possible |

**How to Create:**
1. Go to **Tables > ProductVariant**
2. For each product above, click **Add a record**
3. Fill in Name, Family (lookup), Unit of Measure, and leave Current Stock Level = 0 (will be populated by Purchase records below)
4. Save each

**Total SKUs for Week 1:** 10-15 (scalable; can add more if pilot group provides feedback)

---

## Purchase Records (Stock Initialization)

### Initial Purchase Orders (Week 0, Before Pilot Starts)

Create 3 purchase orders to establish initial stock:

```
Purchase 1 (Fresh Produce Supplier):
  Workspace: Pilot Workspace
  Provider: [CreateTest Provider record or leave lookup empty for now]
  Purchase Date: 2026-04-06 (Friday before pilot)
  Status: Received
  
  Line Items:
    - Bananas: 60 @ $0.40 = $24.00
    - Tomatoes: 40 @ $0.60 = $24.00
    - Lettuce: 30 @ $0.75 = $22.50
    Subtotal: $70.50

Purchase 2 (Dairy Supplier):
  Purchase Date: 2026-04-04 (Wednesday)
  Status: Received
  
  Line Items:
    - Whole Milk: 20 @ $2.00 = $40.00
    - Eggs (dozen): 25 @ $1.80 = $45.00
    - Cheddar Cheese: 10 @ $3.00 = $30.00
    Subtotal: $115.00

Purchase 3 (Beverage & Pantry):
  Purchase Date: 2026-04-05 (Thursday)
  Status: Received
  
  Line Items:
    - Orange Juice: 30 @ $1.50 = $45.00
    - Bottled Water: 15 @ $2.50 = $37.50
    - Rice: 20 @ $1.20 = $24.00
    - Beans: 25 @ $0.80 = $20.00
    Subtotal: $126.50
```

**Result:** ~10 products with realistic stock levels (20-60 units each) to support Week 1 pilot sales volume.

**StockBatch Auto-Creation:**
- When Purchase records are created, StockBatch records auto-generate (via flow or manual entry if needed)
- Each StockBatch ties to ProductVariant + Purchase, forming the inventory ledger for FIFO tracking

---

## Data Refresh Procedures

### Procedure: Reset Test Data (Between Sprints)

**When:** After Week 1 testing; before Week 2 sprint starts  
**Time:** 20 minutes (partial reset) or 1 hour (full reset)  
**Permissions:** Dataverse admin

---

### Option A: **Partial Reset** (Recommended for Rapid Testing)

**Objective:** Keep product master data; reset sales & adjustments; keep stock levels  
**Use Case:** Pilot completed one sprint; want to re-test sales flow with fresh data

#### Steps

1. **Export Sales Data (for record-keeping):**
   - Go to **Tables > SaleLine**
   - Create a view: Filter by `Workspace = Pilot Workspace` AND `CreatedOn >= 2026-04-08` (today)
   - Select all rows → Export to Excel
   - Save as `SALES_WEEK1_BACKUP.xlsx` in project repo

2. **Delete SaleLine Records:**
   - In **SaleLine** view, select all records for this week
   - Click **Delete** (bulk action; confirm)
   - **Note:** This removes transaction history; timestamps preserved in export

3. **Delete InventoryEvent Records (if non-finalized):**
   - Go to **Tables > InventoryEvent**
   - Filter by `Workspace = Pilot Workspace` AND `Status = Pending`
   - Delete all Pending events
   - Keep Finalized events (they're historical)

4. **Reset Stock Levels (Re-quantify):**
   - Manually review actual physical inventory
   - Update ProductVariant.`Current Stock Level` to match physical count
   - Or: Recreate fresh Purchase order with current inventory snapshot

5. **Clear LastSellUnitPrice (if needed):**
   - Go to **Tables > ProductVariant**
   - Edit each product
   - Clear the `LastSellUnitPrice` field (set to 0 or null)
   - Save

**Result:** Sales history cleared; products + stock remain; ready for Week 2 testing

---

### Option B: **Full Reset** (Fresh Start)

**Objective:** Delete all test data and start over with seed data  
**Use Case:** Major schema change; need clean slate; or end of pilot

#### Steps

1. **Export Full Workspace Data (Backup):**
   - Export all tables related to workspace:
     - SaleLine, InventoryEvent, StockBatch, Purchase, ProductVariant, ProductFamily
   - Use Power Apps > Tables > Export Data feature or Power BI to query
   - Save backups in project repo (e.g., `BACKUP_WEEK1_FULL.csv` files)

2. **Delete in Order (Foreign Key Dependencies):**
   ```
   Order to delete:
   1. SaleLine records (depends on ProductVariant)
   2. InventoryEvent records (depends on StockBatch)
   3. StockBatch records (depends on Purchase & ProductVariant)
   4. Purchase records (depends on ProductVariant)
   5. ProductVariant records (user-created ones; keep if schema refresh needed)
   6. ProductFamily records (optional; keep if master data)
   ```

3. **Re-run Initial Seeding:**
   - Follow [Initial Pilot Data Set](#initial-pilot-data-set-week-1) section above
   - Re-create Purchase records
   - Verify StockBatch population

**Result:** Clean test environment; ready for new phase

---

## Scenario-Specific Data

### Scenario 1: "Oversale Test" (ADR-031 Strictly Open)

**Objective:** Verify app allows sale qty > stock (no validation)  
**Setup Time:** 5 minutes

1. Create ProductVariant: "Test Bananas - Oversale"
   - Stock Level: 20
2. Create Sale for same product: Qty 50 (exceeds stock by 30 units)
3. Expected: Sale succeeds; no warning or error
4. Verify: SaleLine record created with Qty=50; stock becomes -30 (negative)

**Test Data:**
```
Product: Bananas (Oversale Test)
Initial Stock: 20
Sale Qty: 50
Expected Result: Sale succeeds; no validation block; SaleLine created
Timestamp Recorded: Yes (for post-hoc analysis)
```

---

### Scenario 2: "LastSellUnitPrice Toggle" (ADR-031 Settings)

**Objective:** Verify price persistence toggle works across users

**Setup Time:** 10 minutes

1. Sale 1: User A sells Whole Milk at $3.99
2. If Toggle ON:
   - ProductVariant.`LastSellUnitPrice` updates to $3.99
   - Sale 2 (User B): Opens product; price pre-fills with $3.99
3. If Toggle OFF:
   - ProductVariant.`LastSellUnitPrice` NOT updated
   - Sale 2 (User B): Opens product; no pre-fill

**Test Data:**
```
Product: Whole Milk
Sale 1: User A, Qty 1, Price $3.99
Toggle Setting: ON / OFF (test both)
Sale 2: User B, check if price pre-fills
```

---

### Scenario 3: "Quick Actions - Availability Override" (ADR-032 Optional)

**Objective:** Verify product hides from seller when marked unavailable

**Setup Time:** 5 minutes (if quick actions implemented)

1. Product: Bananas (available)
2. Owner marks as "Unavailable"
3. Sale entry screen: Product picker should NOT list Bananas
4. Verify: Other products still visible

**Test Data:**
```
Product: Bananas (Quick Action Test)
Initial Status: Available (visible in picker)
Action: Mark Unavailable (create ProductAvailabilityOverride)
Result: Hidden from sale picker
User Role: Owner / Manager / Staff (test each)
```

---

### Scenario 4: "Multi-Workspace Isolation" (ADR-022 Workspace Scoping)

**Objective:** Verify sales in Workspace A don't leak to Workspace B

**Setup Time:** 20 minutes

1. Create Workspace B: "Second Test Store"
2. Add User C as member of Workspace B (different from Workspace A members)
3. User A (Workspace A) creates sale for Bananas
4. User C (Workspace B) views SaleLine list:
   - Should NOT see User A's sale
   - Should only see empty list (no sales in Workspace B yet)
5. User C creates sale for same product
6. User A views SaleLine list:
   - Should still only see their own sales (not User C's)

**Expected Query Filter (Dev Team):**
```
SaleLine where Workspace.WorkspaceId = gblWorkspaceId
(ensures workspace isolation)
```

---

## Performance Test Data (Phase E)

### Bulk Data Creation (for Testing Latency, Gallery Performance)

**When:** Phase E (Testing phase); simulate real-world data volume  
**Goals:** Gallery render time < 500ms; no UI jank with 50-100 products

### Dataset 1: **"50-Product Catalog"**

Goal: Test gallery performance; verify app scales to realistic store inventory

```
ProductVariant records: 50
ProductFamily records: 5 (varied)
Unit distribution: Mixed (ea, lb, gal, bag, case)
Price distribution: $0.50 to $50.00 (realistic range)
Stock distribution: 0-500 units (varied)
```

**How to create (bulk via script or manual):**
- Use Power Apps Formula:
  ```
  ForAll(Sequence(50), 
    Patch(ProductVariant, 
      {Name: "Product " & Text(Value), 
       UnitOfMeasure: Choose(Mod(Value,4)+1, "ea", "lb", "gal", "bag"),
       CurrentStockLevel: RandBetween(0, 100),
       EstSellPrice: RandBetween(50, 5000)/100
      }
    )
  )
  ```
- Or: Export 50 rows to CSV; bulk import via Dataverse

**Performance Metrics to Track:**
- Gallery load time (first render)
- Scroll smoothness (100 items)
- Filter/search response (search by product name)

---

### Dataset 2: **"500+ Sales Transactions"**

Goal: Test weekly analysis queries; verify timestamps enable post-hoc inventory flow analysis

```
SaleLine records: 500+ (simulated week of sales)
Date range: 2026-03-31 to 2026-04-07 (1 week)
Products involved: All 50 from Dataset 1
Per-product sales: 1-20 transactions
Quantities: 1-50 units per sale (realistic mix)
Prices: Varied per transaction (tests LastSellUnitPrice persistence)
```

**How to create:**
- Use Power Query or canvas app formula to generate
- Or: Manual entry of ~20-30 high-volume items; repeat for different users/days

**Analysis Queries to Test:**
```
/* Weekly Oversale Check */
SELECT ProductVariant.Name, 
       SUM(SaleLine.Qty) as TotalSold,
       MAX(StockBatch.Qty) as PeakStock,
       CASE WHEN SUM(SaleLine.Qty) > MAX(StockBatch.Qty) THEN 'YES' ELSE 'NO' END as Oversold
FROM SaleLine 
  LEFT JOIN StockBatch ON ...
WHERE CreatedOn BETWEEN '2026-03-31' AND '2026-04-07'
GROUP BY ProductVariant.Name
```

**Expected Output:** Identifies which products went negative; when (via timestamp analysis)

---

## Backup & Restore

### Simple Backup Procedure

**When:** Before major testing phase; after successful Week 1; or before full reset  
**Time:** 10 minutes per export

#### Steps

1. **Export via Power Apps:**
   - Go to **Solutions > Default Solution** (or Retail.Core)
   - Click **Export Solution** (or **Export Data**)
   - Save as: `Retail.Core_BACKUP_2026-04-07.zip`

2. **Export Individual Tables (CSV):**
   - Go to each table (ProductVariant, Purchase, SaleLine, etc.)
   - Click **Export to Excel** (or export to CSV via Power Query)
   - Save as: `ProductVariant_BACKUP_2026-04-07.csv`

3. **Document Backup Location:**
   ```
   Backup Location: c:\Kabe Imports\RetailerManagementTool\backups\
   
   Backup 1: Retail.Core_BACKUP_2026-04-07.zip (full solution)
   Backup 2: ProductVariant_2026-04-07.csv (master data)
   Backup 3: SaleLine_WEEK1_2026-04-01_to_2026-04-07.csv (transaction log)
   
   Created: 2026-04-07 by [Your Name]
   Purpose: Archive after Week 1 successful testing; restore if regression
   ```

---

### Restore Procedure

**When:** Need to recover from data corruption or rollback to known-good state  
**Time:** 15-30 minutes

#### Option A: Restore Full Solution

1. Go to **Solutions**
2. Click **Import Solution**
3. Select `Retail.Core_BACKUP_2026-04-07.zip`
4. Choose **Update** (overwrites current) or **Upgrade** (safer; parallel)
5. Click **Import**

---

#### Option B: Restore Individual Table Data

1. Go to **Tables > ProductVariant** (example)
2. Import CSV via **Get Data > Text/CSV**
3. Select `ProductVariant_BACKUP_2026-04-07.csv`
4. Verify column mapping
5. Click **Load**

---

## Test Data Checklist (Before Week 1 Pilot Starts)

```
Date: ____________  Verified By: ________________

DATA SEEDING
□ ProductFamily table has 3-4 families (fresh, dairy, beverages, pantry)
□ ProductVariant table has 10-15 products with realistic pricing
□ Purchase records created (3 orders); initial stock > 0 for all products
□ StockBatch records generated (auto or manually verified)

WORKSPACE & USERS
□ Pilot Workspace created and ID captured
□ 15-20 pilot users added as WorkspaceMember (various roles)
□ Own admin account = Owner role in Pilot Workspace
□ At least 1 user tested app access successfully

CONFIGURATION
□ WorkspaceSetting.UseLastSellUnitPrice = OFF (default; can toggle for testing)
□ Environment variable DataverseURL configured
□ Workspace filter on all tables verified (queries scoped by WorkspaceId)

BACKUP
□ System backup taken (if available)
□ Master data exported to CSV (products, families, initial purchases)
□ Backup files stored in project repo

SIGN-OFF
All checks complete. Test environment ready for Phase A pilot Week 1.
Checked By: ____________________  Date: ____________
```

---

## Appendix: Quick Reference

### Table Dependencies (Deletion Order)
```
SaleLine          (delete first; no dependencies)
  ↓
InventoryEvent
  ↓
StockBatch        (depends on Purchase & ProductVariant)
  ↓
Purchase          (depends on ProductVariant)
  ↓
ProductVariant    (depends on ProductFamily)
  ↓
ProductFamily     (delete last; least dependent)
```

### Initial Stock Totals (For Inventory Reconciliation)

```
Fresh Produce:     130 units (60 bananas + 40 tomatoes + 30 lettuce)
Dairy & Eggs:      55 units (20 milk + 25 eggs + 10 cheese)
Beverages:         45 units (30 juice + 15 water)
Pantry & Dry:      45 units (20 rice + 25 beans)

TOTAL:             275 units (~$190 cost)
```

### Contact for Data Issues

| Role | Name | Email |
|------|------|-------|
| Data Admin | [TBD] | [TBD] |
| QA Lead | [TBD] | [TBD] |
| Tech Lead | [TBD] | [TBD] |

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-04-07 | Initial version; Week 1 pilot data + reset procedures |
| 1.1 | [Post-Pilot] | Performance data + refresh learnings |

---

**Questions?** See ADMIN-PLAYBOOK-v1.md or contact Tech Lead.
