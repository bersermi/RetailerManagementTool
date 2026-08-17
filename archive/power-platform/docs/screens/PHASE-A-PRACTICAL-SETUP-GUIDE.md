# Phase A Setup: Practical Hands-On Guide (Non-Dev Friendly)

**For:** You (Learning Developer) + Your Team  
**Approach:** Lean, practical, actionable steps without governance overhead  
**Level:** Beginner-to-intermediate (non-experienced developer)  
**Date:** 2026-04-07  

---

## Your 6-Point Checklist: Detailed Answers

This guide directly answers each of your original 6 questions with code examples and step-by-step procedures.

---

## ✅ **1. Review & Update Data Model**

### **1.1 Review Existing Tables for Required Fields**

**What You Need to Do:**
1. Go to Power Apps → Dataverse → Tables
2. For EACH table, verify these fields exist:

| Table | Must-Have Fields | Notes |
|-------|---|---|
| **Workspace** | Name, Partition Key, Description | Core data isolation field |
| **WorkspaceMember** | User (lookup), Workspace (lookup), Role, Is Manager | Role = Owner/Manager/Staff/Viewer |
| **ProductVariant** | Name, Product Family (lookup), Unit of Measure, Current Stock Level, Last Sell Unit Price, Workspace (lookup) | Workspace FK ensures scoping |
| **Purchase** | Workspace (lookup), Date, Status, Provider (if applicable) | Line items in PurchaseLine table |
| **SaleLine** | Workspace (lookup), Product Variant (lookup), Qty, Unit Price, Timestamp (auto: CreatedOn) | CreatedOn auto-populates |
| **StockBatch** | Product Variant (lookup), Qty, Batch Date, Workspace (lookup) | Tracks inventory by batch/date |

**If Field Missing:** Go to table → + column → Name it → Choose data type → Save

---

### **1.2 Create WorkspaceSetting Table + Toggle Field**

**Why:** Store the LastSellUnitPrice toggle per workspace (ADR-031)

**Steps:**

1. **Create Table: `WorkspaceSetting`**
   - Go to Power Apps → Dataverse → + New Table
   - Name: `WorkspaceSetting`
   - Columns (add these):
     ```
     Column Name:              Workspace
     Type:                     Lookup
     Related Table:            Workspace
     (This ties settings to a specific workspace)
     ```
     ```
     Column Name:              Use Last Sell Unit Price
     Type:                     Choice
     Options:                  Yes / No
     Default Value:            No
     (Toggle for LastSellUnitPrice persistence)
     ```
   - Create table

2. **Create ONE record per workspace**
   - Go to Tables → WorkspaceSetting
   - Add record: Workspace = "Pilot Workspace" → Use Last Sell Unit Price = No
   - Save

---

### **1.3 Seed a Workspace Record**

**Option A: Manual UI (Simplest if you only have 1-2 workspaces)**

1. Go to Dataverse → Tables → Workspace
2. Click **+ New**
3. Fill in:
   ```
   Name:               Pilot Workspace
   Partition Key:      MAIN_20260407  (or your store code + date)
   Description:        Phase A pilot test workspace
   ```
4. Click **Save**
5. **COPY THE WORKSPACE ID (GUID)** from URL or header
   - Example: `550e8400-e29b-41d4-a716-446655440000`
   - **THIS IS gblWorkspaceId — save it; you'll need it**

**Option B: PowerShell Script (If you prefer automation)**

```powershell
# PowerShell Script to Create Workspace Record
# Requires: Microsoft.PowerApps.PowerShell module
# Install: Install-Module -Name Microsoft.PowerApps.PowerShell -AllowClobber

# Connect to Dataverse
$env:MSOLPS_HOME = 'C:\Program Files\Microsoft\Exchange\Web Services'
Connect-PnPOnline -Url "https://yourcompany.crm.dynamics.com" -Interactive

# Create Workspace Record
$workspace = @{
    'cr123_name' = 'Pilot Workspace'
    'cr123_partitionkey' = 'MAIN_20260407'
    'cr123_description' = 'Phase A pilot test workspace'
}

# This would require data tools or REST API calls
# Alternative (Easier): Use Power Automate instead of PowerShell (see below)
```

**SIMPLER ALTERNATIVE: Use Power Automate (No PowerShell Needed)**

1. Power Apps → Create cloud flow → Automated cloud flow
2. Trigger: Manual trigger
3. Action: Add "Create a record" action
   - Table: Workspace
   - Fields: Name, Partition Key, Description
4. Click **Save** → Click **Test** → Click **Run**

**Recommendation:** Use manual UI for pilot (1-2 workspaces are easy to create manually). If you have 50+ workspaces later, then automate with Power Automate.

---

### **1.4 Add Yourself as WorkspaceMember**

**How it Works:**
- WorkspaceMember is a JOIN table between User + Workspace
- User lookup = account name (not email, but Power Apps will search by name or email and find the user)
- Role = advisory level (enforced in v1.1; advisory in v1)

**Steps:**

1. Go to Dataverse → Tables → Workspace
2. Open your "Pilot Workspace" record
3. Scroll down → Find **Related** → Look for "Workspace Members" or similar
4. Click **+ New Workspace Member**
5. Fill in:
   ```
   User (lookup):        [Type YOUR name or email; Power Apps auto-finds it]
   Workspace:            Pilot Workspace (auto-fill; already linked)
   Role:                 Owner
   Is Manager:           Yes
   ```
6. Click **Save**

**If Lookup Doesn't Find You:**
- Admin may need to add your user to Azure AD first
- Ask: "Is my user account in Azure AD / Office 365?"
- If yes but not showing: Wait 5-10 min for sync, then refresh

**Email vs. Name:**
- Use email (e.g., `sergio@kabe.com` or `your-email@company.com`)
- Power Apps searchable lookup will find you
- You can also just type your name if you prefer

---

## ✅ **2. Environment Variable Setup**

### **What IS an Environment Variable?**

**Plain English:**
- It's a **centralized storage location** for configuration values
- Lives **in Dataverse** (your database)
- Accessed by your **canvas app** via a formula
- Used instead of hardcoding URLs (bad practice)

**In Plain Terms:**
```
Hard-coded (BAD):
  In your app formula:
    DataverseURL = "https://mycompany.crm.dynamics.com"  ← Hard to change

Environment Variable (GOOD):
  In Dataverse (one place):
    Name: DataverseURL
    Value: https://mycompany.crm.dynamics.com
  
  In your app formula:
    DataverseURL = 'DataverseURL'.Value  ← Pulls from Dataverse
```

**Why It Matters:**
- When you deploy to TEST/PROD later, you change value in *one place* (Dataverse)
- App code stays the same; just uses different URL per environment
- No re-publishing needed when you change the value

---

### **How to Create an Environment Variable**

**Step 1: Go to Power Apps Solution**

1. Open Power Apps → DEV environment
2. Go to **Solutions**
3. Open your solution (e.g., `Retail.Core`)

**Step 2: Add Environment Variable**

1. Click **New** → **More** → **Environment Variable**
2. Fill in:
   ```
   Display Name:        DataverseURL
   Name (Auto-gen):     new_DataverseURL  ← Auto-generated; don't change
   Data Type:           Text
   Default Value:       (Leave BLANK for now)
   Current Value:       https://yourcompany.crm.dynamics.com
                        ↑ Actual DEV URL from Dataverse settings
   ```
3. Click **Save & Close**

**Step 3: Find Your Dataverse URL**

- Go to Power Apps **Dataverse** → **Settings** → **Instance Details**
- Copy the **Instance Web API endpoint** or **Organization Unique Name**
- Example: `https://mycompany.crm.dynamics.com`

---

### **How to Use It in Your Canvas App**

**In Your App Formula:**

```
// On App Start, set global variable:
Set(gblDataverseURL, 'DataverseURL'.Value)

// Later, when you need the URL (e.g., in Dataverse connections):
'SaleLine'.DataverseURL = gblDataverseURL
```

**Readable Format:**
```
// If your env var name is: new_DataverseURL
// In app formula:          'new_DataverseURL'.Value

// The format is:           'SchemaName'.Value
// (Schema name = auto-generated by Power Apps when you create env var)
```

---

### **To Change the Value Later (e.g., when moving to TEST)**

1. Go to **Solutions** → your solution
2. Find **Environment Variable** → `DataverseURL`
3. Edit → Change **Current Value** to new URL
4. Save
5. **No app re-publish needed** — all users automatically use new URL

---

## ✅ **3. Component Status Review**

**Your Decision:** Skip this. You've tested components individually; validate during Vertical 1.

**Why This Makes Sense:**
- Real-world testing > theoretical contracts
- You'll discover gaps faster by building than by reviewing
- Adjust components as you build Vertical 1

**Action:** Move to #4.

---

## ✅ **4. Solution Structure & Inter-Table Communication**

### **The Core Question: How Do Tables "Talk" to Each Other?**

**There are 2 main approaches:**

#### **Approach A: Canvas App Patch Operations (Simplest for v1)**

When an action happens in your app, you use Power Apps formula to create/update records across tables.

**Example:** User creates a sale

```
Canvas App (V1-02 Sell Screen):
  User clicks "Complete Sale" button
    ↓
  Power Apps Formula (Patch):
    Patch(SaleLine, {
      Workspace: gblWorkspaceId,
      ProductVariant: SelectedProduct.ID,
      Qty: Value(txtQty.Value),
      UnitPrice: Value(txtPrice.Value)
    })
    ↓
  Result: SaleLine record created in Dataverse
```

**Pros:**
- Simple; logic lives in app (easy to debug)
- Works great for v1 (15-20 users; no complex workflows)
- Timestamps auto-populate (created by Power Apps)

**Cons:**
- Doesn't auto-cascade (if SaleLine needs StockBatch update, you handle it)

---

#### **Approach B: Power Automate Flows (For Complexity)**

When a record is created, a **flow** automatically handles side effects (cascading updates).

**Example:** When SaleLine is created, automatically create an InventoryEvent

```
Power Automate Flow:
  Trigger: When a record is CREATED (SaleLine)
    ↓
  Action:
    Create InventoryEvent:
      Qty: -1 × (SaleLine.Qty)  ← Decrement
      Type: "Sale"
  ↓
  Result: Auto-creates InventoryEvent when sale is recorded
```

**Pros:**
- Automatic cascading (less app logic; easier to maintain)
- Reusable (triggered by any app, not just your canvas app)

**Cons:**
- Requires flow experience (more complex to debug)
- Async (slight delay; events fire after record saved)
- Overkill for v1 (keep it simple)

---

### **What Should YOU Do in Phase A?**

**Recommendation: Use Approach A (Canvas App Patches) for v1**

**Why:**
- Aligns with "Strictly Open Sales" (ADR-031 — no validation, no event cascading)
- Simplest for learning developer
- No flows = fewer moving parts to debug
- Timestamps auto-populate (CreatedOn field)

**Example v1 Architecture:**

```
Canvas App (User clicks "Save Sale")
  ↓
  Patch(SaleLine, {...})  ← Creates sale record
  ↓
  Dataverse stores record with timestamp (CreatedOn auto-populates)
  ↓
  Owner queries SaleLine + StockBatch to analyze post-hoc
  ↓
  (No real-time inventory validation; no event cascades)
```

---

### **If You Need Cascading (e.g., Auto-Decrement Stock on Sale):**

Do this LATER (Phase C or v1.1). For now, v1 doesn't need it (ADR-031 = strictly open).

**When You Get There, Use Power Automate:**

```
FLOW: "Update Inventory on Sale"

Trigger: When a record is created (SaleLine table)

Actions:
  1. Get related StockBatch for this ProductVariant
  2. Decrement StockBatch.Qty = SaleLine.Qty
  3. Create InventoryEvent (optional; for audit trail)
```

**NOTE:** This flow would be created in Power Automate; NOT in the canvas app.

---

### **Solution Structure: What to Add Now**

Your solution (`Retail.Core`) should contain:

```
Retail.Core Solution
├─ Tables (all 7-8 you defined)
│  ├─ Workspace
│  ├─ WorkspaceMember
│  ├─ WorkspaceSetting
│  ├─ ProductVariant
│  ├─ ProductFamily
│  ├─ Purchase
│  ├─ SaleLine
│  └─ StockBatch
├─ Canvas App (Retail Sales App v1)
├─ Component Library (your components)
├─ Environment Variable (DataverseURL)
└─ [OPTIONAL] Power Automate Flows (if you add them later)
```

**To Check/Add Components to Solution:**

1. Go to **Solutions** → **Retail.Core** → **+ Add existing**
2. Choose: **Canvas app** → select your app → **Add**
3. Repeat for **Component Library**

**DON'T add yet:** Power Automate flows (not needed for v1)

---

## ✅ **5. Solution Playbook (Phase A Day 1 Coordination)**

### **What Is a Playbook?**

A checklist for "Day 1 of building" — to ensure you don't forget something.

**Your Phase A Playbook:**

```
MORNING (9 AM - 12 PM): Setup
  ☐ Open DEV Dataverse
  ☐ Verify all 8 tables exist + have required fields (Section 1.1)
  ☐ Create WorkspaceSetting table + toggle field (Section 1.2)
  ☐ Seed Pilot Workspace record (Section 1.3)
    ☐ Copy WorkspaceId → save to notepad
  ☐ Add yourself as WorkspaceMember + Owner (Section 1.4)
  ☐ Create environment variable DataverseURL (Section 2)
    ☐ Test: Go to Solutions → verify env var exists

AFTERNOON (1 PM - 5 PM): App Development
  ☐ Open Canvas App
  ☐ Set gblDataverseURL = 'DataverseURL'.Value (on app start)
  ☐ Set gblWorkspaceId = (user selects from dropdown on Home screen)
  ☐ Add Dataverse data sources to app:
    ☐ ProductVariant (filtered by gblWorkspaceId)
    ☐ SaleLine (filtered by gblWorkspaceId)
    ☐ Purchase (filtered by gblWorkspaceId)
  ☐ Set up Sell screen (V1-02):
    ☐ Product picker → Filter(ProductVariant, Workspace = gblWorkspaceId)
    ☐ Qty + Price inputs
    ☐ "Complete Sale" button → Patch(SaleLine, {...})
  ☐ Test: Create 1 test sale → check if record appears in Dataverse SaleLine table

✅ END OF DAY: App running + connected to Dataverse
```

**Quick Version (Copy This):**
1. Setup workspace + env var (morning)
2. Wire app to Dataverse (afternoon)
3. Test: Create 1 sale entry end-to-end

---

## ✅ **6. Test Data Planning: Manual UI + Power Automate (Recommended)**

### **Why NOT PowerShell Direct Scripts**

PowerShell OData API has fundamental limitations with Dataverse lookup field binding that make it unreliable for complex record creation. For details on what was tried and why it failed, see **[ISS-026-ANALYSIS-DataverseODataLookupBinding.md](../issues/ISS-026-ANALYSIS-DataverseODataLookupBinding.md)**.

**Takeaway:** Use manual UI or Power Automate flows instead — much more reliable, zero API quirks, and faster for Phase A pilot data.

---

### **How to Handle Test Data (4 Scenarios)**

You have **4 scenarios**. Here's how to approach each:

---

### **Scenario 1: Initial Seeding (Create Pilot Products + Stock)**

**Frequency:** Once at setup (today)  
**Method:** **Manual Dataverse UI (Recommended) or Power Automate Cloud Flow**

#### **Option A: Manual Dataverse UI (Fastest for Small Datasets)**

**Steps:**

1. **Create ProductFamily records** (manual):
   - Go to Dataverse → Tables → ProductFamily → + New
   - Create 3 records: Fresh Produce, Dairy, Beverages
   - Time: 2 min

2. **Create ProductVariant records** (manual):
   - Dataverse → Tables → ProductVariant → + New
   - Add 10-15 products (Bananas, Milk, Juice, Eggs, etc.)
   - Set initial stock = 0 (will be populated by purchases)
   - Time: 10 min

3. **Create Provider records** (manual):
   - Dataverse → Tables → crbc0_Provider → + New
   - Add 2-3 providers (distributors, suppliers)
   - **Set Workspace relationship** via the lookup picker in the form (no API needed)
   - Time: 5 min

4. **Create Purchase records** (manual or flow):
   - Dataverse → Tables → Purchase → + New
   - Create 3 purchases (Fresh delivery; Dairy delivery; Beverage delivery)
   - Add line items (PurchaseLine table)
   - This auto-creates StockBatch records (if you have flow set up)
   - Time: 10 min

**Total Manual Time: ~30 min for full pilot dataset**

---

#### **Option B: Power Automate Cloud Flow (For Bulk/Repeated Seeding)**

**Use this if you need to re-create test data often or seed large batches.**

1. **Create a flow triggered manually:**
   ```
   Trigger: Manual trigger (button in Power Apps)
   
   Actions:
     1. Create a record (ProductFamily): Fresh Produce
     2. Create a record (ProductFamily): Dairy
     3. Create a record (ProductVariant): Bananas
        - Product Family: [select from step 1]
        - Workspace: [select workspace]
     4. Create a record (crbc0_Provider): Provider 1
        - Workspace: [select workspace]  ← Lookup binding works here!
     5. Create a record (Purchase): Fresh delivery
        - Workspace: [select workspace]
     ...
   ```

2. **Benefits:**
   - Lookup binding is automatic in Power Automate "Add record" action
   - Repeatable: Run flow 5x to create 5 test datasets
   - No API quirks; UI-based actions

3. **Effort:** 10 min to build flow once; then 30 sec to run

**Recommendation for Phase A:** Use **Option A (manual UI)** for initial setup. Build **Option B (flow)** if you need to reset data weekly.

---

### **Scenario 2: Partial Data Reset (Between Sprints)**

**Frequency:** Weekly (after testing a feature)  
**What:** Delete sales transactions; keep products + stock  
**Method:** **Power Automate or SQL queries**

**Option A: Power Automate (Easier)**

```
Cloud Flow: "Weekly Data Cleanup"
Trigger: Daily (set to run Monday morning)

Actions:
  1. List records: SaleLine (filter by CreatedOn < 7 days ago)
  2. For each: Delete record
  3. Result: Old sales cleared; new week starts fresh
```

**Option B: SQL Query (If you know SQL)**

```sql
DELETE FROM SaleLine 
WHERE Workspace.WorkspaceId = '550e8400-e29b-41d4-a716-446655440000'
AND CreatedOn < DATEADD(day, -7, GETDATE())
```

**Recommendation:** Use Power Automate (no SQL knowledge needed).

---

### **Scenario 3: Full Reset** (Clean slate for new phase)

**Frequency:** End of phase (every 2-3 weeks)  
**What:** Delete everything; start over  
**Method:** **Dataverse Bulk Delete or SQL**

**Option A: Bulk Delete in Power Apps (UI)**

1. Dataverse → Tables → SaleLine
2. Select all records → **Delete** button
3. Repeat for Purchase, InventoryEvent, StockBatch, ProductVariant

**Option B: SQL Script**

```sql
-- Cleanup Phase A test data
DELETE FROM SaleLine WHERE Workspace.WorkspaceId = @workspaceId
DELETE FROM InventoryEvent WHERE Workspace.WorkspaceId = @workspaceId
DELETE FROM StockBatch WHERE Workspace.WorkspaceId = @workspaceId
DELETE FROM Purchase WHERE Workspace.WorkspaceId = @workspaceId
DELETE FROM ProductVariant WHERE Workspace.WorkspaceId = @workspaceId

-- Re-seed (run your initial seeding flow after this)
```

**Recommendation:** Manual UI delete for phase resets (easier to verify nothing breaks).

---

### **Scenario 4: Performance Test Data** (50 products + 500 sales)

**Frequency:** Once before Phase E (testing phase)  
**What:** Large data set to test app responsiveness  
**Method:** **SQL Bulk Insert or Power Automate loops**

**Option A: Power Automate with Loop**

```
Trigger: Manual

For i = 1 to 50:
  Create ProductVariant (i)
  Create 10 random SaleLine records for this product
  
Result: 50 products × 10 sales = 500 transactions
```

**Option B: SQL Script**

```sql
-- Insert 50 test products
INSERT INTO ProductVariant (Name, Qty, Price, Workspace)
SELECT 
  'Test Product ' + CAST(ROW_NUMBER() OVER (ORDER BY @@IDENTITY) AS VARCHAR(10)),
  RAND() * 100,
  RAND() * 50,
  @workspaceId
FROM master..spt_values a, master..spt_values b
WHERE a.type = 'P' AND b.type = 'P'

-- Insert 500 random sales
INSERT INTO SaleLine (ProductVariant, Qty, Price, Workspace)
SELECT TOP 500
  pv.ID,
  RAND() * 10,
  pv.Price,
  @workspaceId
FROM ProductVariant pv
CROSS JOIN (SELECT TOP 500 * FROM master..spt_values) x
```

**Recommendation:** Use Power Automate loop first (easier to debug).

---

### **What Replaces PowerShell Sandboxes?**

**PowerShell Sandboxes** (mentioned before) = Power Automate cloud flows

- **Sandbox:** Isolated execution environment
- **Cloud Flow:** Dataverse's equivalent (runs in isolated Power Automate environment)
- **Purpose:** Execute bulk operations without affecting live app

**In your context:**
- Use **Power Automate flows** instead of PowerShell scripts
- Trigger them **On Demand** (manual button)
- They run in a safe sandbox = won't crash your app

---

## 📋 Your Phase A Day 1 Action Items

**Today (2026-04-07), Do This:**

```
☐ Section 1.1: Verify all tables + fields exist
☐ Section 1.2: Create WorkspaceSetting table + toggle
☐ Section 1.3: Create Pilot Workspace record
  → Copy WorkspaceId to notepad
☐ Section 1.4: Add yourself as WorkspaceMember
☐ Section 2: Create environment variable DataverseURL
  → Test: Go to Solutions, verify it exists
☐ Section 4: Ensure solution contains all tables + your app
☐ Section 5: Review Phase A playbook (memorize the flow)

START Vertical 1 Building Tomorrow (2026-04-08)
  → Wire app to Dataverse (Section 4)
  → Create test sale (end-to-end test)
```

**Tomorrow (2026-04-08), Do This:**

```
☐ Open Canvas App
☐ Set gblDataverseURL + gblWorkspaceId
☐ Add Dataverse data sources (3 tables)
☐ Build Sell screen (V1-02)
  → Product picker, Qty input, Price input
  → "Complete Sale" button → Patch operation
☐ Test: Create 1 test sale in app
  → Verify SaleLine record appears in Dataverse
```

---

## 💡 Key Takeaways

| Topic | Answer |
|-------|--------|
| Workspace seeding | Manual Dataverse UI (recommended, 2 min); Power Automate flow if bulk needed |
| Provider creation with workspace | Manual UI lookup picker (5 min); Power Automate for automation (10 min to build) |
| Lookup field binding via PowerShell | ❌ Not viable (OData API limitations — see ISS-026 analysis); use manual UI or Power Automate |
| WorkspaceMember email vs. lookup | Use email in lookup field; Power Apps finds the user automatically |
| Environment variable "where it lives" | In Dataverse (your database); stored as a record you can edit |
| Inter-table communication | Use Canvas App Patch operations (v1); Power Automate flows (later, if needed) |
| Test data handling | Manual UI for seeding; Power Automate flows for bulk cleanup/resets |

---

## Need Help?

**If stuck on:**
- **"My environment variable isn't showing in my app formula"** → Verify the schema name (`new_DataverseURL`) in the formula
- **"Lookup field not finding my user"** → Check Azure AD; user must exist first
- **"Patch sent OK but no record created"** → Check Dataverse table permissions + workspace filter
- **"Flow won't trigger"** → Verify trigger condition (record created, not just saved)

**Quick Questions to Ask:**
- "Does my user exist in Azure AD?" (required for lookups to work)
- "What's my DEV Dataverse URL?" (needed for env var)
- "Do my table permissions allow Patch operations?" (check Dataverse security roles)

---

**Version:** 1.0 (Practical, Lean, Non-Dev Friendly)  
**Status:** Ready for your Phase A start (2026-04-08)  
**Next:** Execute Section 1.1 checklist today; start building tomorrow.
