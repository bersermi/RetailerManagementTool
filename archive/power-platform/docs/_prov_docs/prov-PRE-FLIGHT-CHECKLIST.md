# Phase A Pre-Flight Checklist
**Execution Date:** 2026-04-07 (Tuesday)  
**Go-Live:** 2026-04-08 (Wednesday Phase A Day 1)  
**Owner:** Admin/Tech Lead  
**Status:** Ready for Execution  

---

## Overview

This checklist verifies Dataverse admin access, creates foundational test data, sets up environment variables, and validates app initialization logic before Phase A development begins. All items **must complete by EOD 2026-04-08** for Phase A Day 1 to proceed.

---

## GROUP 1: Permission Verification (30 min)
**Goal:** Confirm admin-level access to Dataverse and environment.

### ✅ 1.1 Verify Dataverse Admin Role
**Action:**
- Log in to Power Apps (https://make.powerapps.com)
- Select DEV environment
- Verify your user role:
  - Go to **Dataverse > Security Roles**
  - Search for your user account
  - Confirm role = **System Administrator** OR **Dataverse Administrator**

**Verification:**
```
Expected: Your user has one of these roles
If not: Contact Dataverse capacity owner; grant System Administrator role before proceeding
```

### ✅ 1.2 Verify Table Create/Update Permissions
**Action:**
- Still in Power Apps > DEV environment
- Go to **Tables**
- Verify you can see and open:
  - Workspace
  - WorkspaceMember
  - WorkspaceSetting
  - ProductVariant
  - ProductFamily
  - Purchase
  - InventoryEvent
  - SaleLine

**Verification:**
```
Expected: All tables visible; you can open each table's detail view
If not: Verify role has "Create", "Update", "Read" permissions on these tables
```

### ✅ 1.3 Verify Solution Create Permissions
**Action:**
- Go to **Solutions** in Power Apps
- Attempt to create a new solution (cancel after confirming dialog appears)

**Verification:**
```
Expected: "New Solution" button available; dialog opens on click
If not: Contact admin; you need solution authoring permissions
```

---

## GROUP 2: Environment Setup (45 min)
**Goal:** Create centralized configuration via environment variables.

### ✅ 2.1 Create Environment Variable 'DataverseURL'
**Action:**
- In Power Apps (DEV environment)
- Go to **Solutions > Default Solution**
- Click **New > More > Environment Variable**
- Fill in:
  ```
  Display Name:        DataverseURL
  Schema Name:         new_DataverseURL  (auto-generated)
  Data Type:           Text
  Default Value:       <leave blank for now>
  Current Value:       https://<yourorg>.crm.dynamics.com
  ```
  - Replace `<yourorg>` with your Dataverse org name
  - Example: `https://mycompany.crm.dynamics.com`
- Click **Save & Close**

**Verification:**
```
Expected: Environment variable created; appears in Solutions > Default Solution > All > Environment Variables
```

### ✅ 2.2 Document Environment Variable Details
**Action:**
- Copy the following info to reference file (e.g., `SETUP-REFERENCE.txt` or environment config doc):
  ```
  Environment Variable Name: DataverseURL
  Schema Name:               new_DataverseURL
  Current Value:             https://<yourorg>.crm.dynamics.com
  Retrieval in App Formula:  'DataverseURL'.Value
  
  DEV Instance:              https://<yourorg>.crm.dynamics.com
  Instance Region:           <e.g., US (Ohio)>
  Instance ID/Org ID:        <from Dataverse settings if needed for future migration>
  ```

**Verification:**
```
Reference file created and stored in project docs for handoff to dev team
```

---

## GROUP 3: Test Data Seeding (60 min)
**Goal:** Create minimal viable test data (Workspace, user membership, products, sample purchases).

### ✅ 3.1 Create Test Workspace Record
**Action:**
- In Power Apps, go to **Tables > Workspace**
- Click **Add a record** (or **+ New**)
- Fill in:
  ```
  Name:           Pilot Workspace (or "Test Store - ABC")
  Description:    Test workspace for Phase A pilot (15-20 users)
  Partition Key:  [Generate a GUID or use workspace code]
    (Suggestion: Use initials + date, e.g., "kabe_20260407" or generate GUID)
  ```
- Click **Save**
- **Copy the Workspace ID (GUID)** from URL or record header
  - Example: `550e8400-e29b-41d4-a716-446655440000`

**Verification:**
```
Expected: Record created with auto-generated ID
Store WorkspaceId:    <paste GUID here>
```

### ✅ 3.2 Add Yourself as WorkspaceMember (Owner)
**Action:**
- In the Workspace record from 3.1, scroll to **Related > WorkspaceMembers**
- Click **Add Workspace Member**
- Fill in:
  ```
  User (lookup):        <Your name / user account>
  Role:                 Owner
  Is Manager:          Yes (optional; set to true if you'll manage this workspace)
  Department:          Admin / Setup (optional)
  ```
- Click **Save & Close**

**Verification:**
```
Expected: Your user appears in WorkspaceMembers with Owner role for Pilot Workspace
```

### ✅ 3.3 Create WorkspaceSetting Record (LastSellUnitPrice Toggle)
**Action:**
- In Power Apps, go to **Tables > WorkspaceSetting**
- Click **Add a record**
- Fill in:
  ```
  Workspace (lookup):           Pilot Workspace (from 3.1)
  Use Last Sell Unit Price:     Off / No (default per ADR-031)
                                (Can toggle ON later for testing)
  ```
- Click **Save & Close**

**Verification:**
```
Expected: WorkspaceSetting record created for Pilot Workspace
Note: Later can change toggle to test LastSellUnitPrice update behavior
```

### ✅ 3.4 Create Pilot ProductFamily Records
**Action:**
- In Power Apps, go to **Tables > ProductFamily**
- Create 3-5 sample product families:
  ```
  Example 1:
    Name:           Fresh Produce
    Normalized Name: fresh_produce
    Description:    Fruits, vegetables, fresh items
  
  Example 2:
    Name:           Dairy & Eggs
    Normalized Name: dairy_eggs
    Description:    Milk, cheese, eggs, yogurt
  
  Example 3:
    Name:           Beverages
    Normalized Name: beverages
    Description:    Drinks, juices, water
  ```
- Each: Click **Save & Close**

**Verification:**
```
Expected: 3-5 ProductFamily records created
Families created: fresh_produce, dairy_eggs, beverages
```

### ✅ 3.5 Create Pilot ProductVariant Records (with Stock)
**Action:**
- In Power Apps, go to **Tables > ProductVariant**
- Create 5-10 sample product variants (varied by family):
  ```
  Example 1:
    Name:                     Bananas (1 lb bunch)
    Product Family:           Fresh Produce
    Workspace:                Pilot Workspace
    Unit of Measure:          lb (or units)
    Last Sell Unit Price:     0.79 (optional; will be populated by sales if toggle on)
    Current Stock Level:      0 (initially; will be set by purchases below)
  
  Example 2:
    Name:                     Whole Milk (1 gal)
    Product Family:           Dairy & Eggs
    Workspace:                Pilot Workspace
    Unit of Measure:          gal
    Last Sell Unit Price:     3.49
    Current Stock Level:      0
  
  ... create 3-10 more variants (varied prices, units)
  ```
- Each: Click **Save & Close**

**Verification:**
```
Expected: 5-10 ProductVariant records created in Pilot Workspace
Variants created: Bananas, Whole Milk, Orange Juice, Eggs, etc.
```

### ✅ 3.6 Create Pilot Purchase Orders (to establish stock)
**Action:**
- In Power Apps, go to **Tables > Purchase**
- Create 2-3 sample purchases to seed inventory:
  ```
  Example 1:
    Workspace:                Pilot Workspace
    Provider:                 [Leave empty for now; or create dummy provider if table exists]
    Purchase Date:            2026-04-01 (or recent date)
    Status:                   Received (or Completed)
    Line Items (PurchaseLine):
      - Product: Bananas
        Qty:     50 (units or lbs)
        Unit Cost: 0.50
        Total: 25.00
  
  Example 2:
    Same structure; add Whole Milk (20 gal @ $2.50 ea = $50)
  ```
- Note: StockBatch records auto-create from Purchases (via flow or manual creation if needed)

**Verification:**
```
Expected: 2-3 Purchase records created with line items
Initial stock established for testing (Bananas: 50, Milk: 20, etc.)
```

### ✅ 3.7 Capture Key IDs for Dev Team Handoff
**Action:**
- Create a reference document with all key IDs (in a new file or append to existing setup doc):
  ```
  ===== TEST DATA REFERENCE =====
  
  Workspace ID (gblWorkspaceId):   <GUID from 3.1>
  Workspace Name:                  Pilot Workspace
  Partition Key:                   <from 3.1>
  
  Admin User ID:                   <Your user ID if needed>
  Admin User Name:                 <Your name>
  
  Sample Product Variants:
    - Bananas (ID: <GUID>)
    - Whole Milk (ID: <GUID>)
    - Orange Juice (ID: <GUID>)
    [... capture IDs from 3.5]
  
  Initial Stock:
    - Bananas: 50
    - Whole Milk: 20
    [... from 3.6]
  
  Environment Variable:
    - Name: DataverseURL
    - Schema: new_DataverseURL
    - Value: https://<yourorg>.crm.dynamics.com
  ```
- Save this file in project root or `docs/SETUP-REFERENCE.md` for team access

**Verification:**
```
All key IDs captured and documented
Reference file committed/shared with Phase A dev team
```

---

## GROUP 4: Solution Setup (40 min)
**Goal:** Create managed solution container for app, flows, tables.

### ✅ 4.1 Create Solution 'Retail.Core'
**Action:**
- In Power Apps, go to **Solutions**
- Click **New Solution**
- Fill in:
  ```
  Display Name:          Retail.Core
  Name:                  retail_core (auto-generated; schema name)
  Publisher:             Default Publisher (or create custom if desired)
                         (Custom publisher: better practice for v1.1+)
  Version:               1.0.0.0
  ```
- Click **Create**

**Verification:**
```
Expected: Solution "Retail.Core" appears in Solutions list
Status: Any (unmanaged is fine for pilot)
```

### ✅ 4.2 Add Canvas App to Solution
**Action:**
- Go to **Solutions > Retail.Core**
- Click **Add existing > Apps > Canvas app**
- Select your Canvas app (if created yet; or skip if app not yet deployed)
- Click **Add**

**Verification:**
```
Expected: Canvas app appears in Retail.Core components
(Can be done later if app not yet created; this is pre-staging)
```

### ✅ 4.3 Document Solution Structure
**Action:**
- In the solution, take note of included components:
  - Tables (Workspace, WorkspaceMember, WorkspaceSetting, ProductVariant, etc.)
  - Canvas App
  - Flows (if any; Phase A may add flows later)
  - Connection References (if upgraded from env vars in Phase 2)
- Create a solution architecture doc:
  ```
  Retail.Core Solution (v1.0.0.0)
  ├─ Tables
  │  ├─ Workspace (core partition key)
  │  ├─ WorkspaceMember (user access)
  │  ├─ WorkspaceSetting (feature toggles)
  │  ├─ ProductVariant (sku data)
  │  ├─ Purchase (incoming stock)
  │  ├─ StockBatch (inventory ledger)
  │  ├─ InventoryEvent (adjustments/waste)
  │  └─ SaleLine (transaction record)
  ├─ Canvas App (Retail Sales App)
  ├─ Flows (Phase A: TBD; Phase C+: event handlers)
  └─ Environment Variable: DataverseURL (Phase 1)
  
  Phase 2 Upgrade: Replace env var with Connection Reference
  ```

**Verification:**
```
Solution structure documented
Handoff guide ready for dev team
```

---

## GROUP 5: Component Schema Review (20 min)
**Goal:** Validate all canvas components match interface contracts.

### ✅ 5.1 Review Component Input/Output Contracts
**Action:**
- If Canvas app is created, open it in edit mode
- For each component below, verify Input/Output properties:

| Component | Expected Inputs | Expected Outputs | Notes |
|-----------|---|---|---|
| **cmpQtyStepper** | Value, Min, Max, StepSize, AllowDecimals, Label, ReadOnly | OnChange event + updated Value | See ADR-009; ISS-009 |
| **cmpMoneyInput** | Value, CurrencySymbol, ReadOnly, Label | OnChange, OnBlur events + validated Value | ISS-010 |
| **cmpCartBottomBar** | CartItems, TotalPrice, UserRole | OnExpand event | ISS-011 coordination |
| **cmpCartPanel** | CartItems, IsExpanded, WorkspaceId | OnCartModified event | ISS-011 coordination |
| **cmpQuickActionsSheet** | Product, UserRole, OverrideStatus | OnToggleAvailability event | Optional in v1; ADR-032 |

**Verification:**
```
Expected: All components have input/output properties defined
Missing properties: Flag for Phase B/C work
```

### ✅ 5.2 Validate Environment Variable Reference in App
**Action:**
- In Canvas app formula bar, verify DataverseURL is called correctly:
  ```
  Example formula in screen or component:
    DataverseURL = 'DataverseURL'.Value
  
  Or in connection setup:
    Connector = Connection.Environment = 'DataverseURL'.Value
  ```

**Verification:**
```
Expected: Canvas app references 'DataverseURL'.Value (not hardcoded URL)
If missing: Add formula during Phase A Day 1 kick-off
```

---

## GROUP 6: Documentation & Playbooks (90 min)
**Goal:** Create operational playbooks for admin, dev team, and testing.

### ✅ 6.1 Admin Playbook (Workspace & Member Onboarding)
**Action:**
- Create file: `docs/ADMIN-PLAYBOOK-v1.md`
- Include step-by-step procedures for:
  1. Creating a new workspace
  2. Adding users as WorkspaceMember (with roles)
  3. Enabling/disabling LastSellUnitPrice toggle
  4. Resetting test data
  5. Troubleshooting common onboarding issues
- See separate document: **ADMIN-PLAYBOOK-v1.md** (created in this session)

**Verification:**
```
File created and reviewed
Ready for training new admins during pilot
```

### ✅ 6.2 Test Data Strategy
**Action:**
- Create file: `docs/TEST-DATA-STRATEGY.md`
- Include:
  1. Initial pilot data set (products, stock levels, pricing)
  2. How to refresh/reset test data between sprint cycles
  3. Scenario-based data (e.g., "test oversale scenario": qty > stock)
  4. Backup/restore strategy
  5. Performance test data (e.g., 50-100 products; 500+ sales)
- See separate document: **TEST-DATA-STRATEGY.md** (created in this session)

**Verification:**
```
File created
Test data ready for Week 1 pilot (manual creation if needed)
```

### ✅ 6.3 Phase A Launch Checklist (Dev Team)
**Action:**
- Create file: `docs/PHASE-A-LAUNCH-CHECKLIST.md`
- Include:
  1. Environment variable setup (was done pre-Phase A; verify)
  2. Solution structure validation
  3. App initialization logic (gblWorkspaceId setup)
  4. Component contract compliance
  5. Integration points (tables, flows, connections)
  6. Day 1 sign-off criteria
- See separate document: **PHASE-A-LAUNCH-CHECKLIST.md** (created in this session)

**Verification:**
```
File created and shared with Phase A dev team
Team reviews and signs off 1 day before Phase A Day 1
```

### ✅ 6.4 Go/No-Go Validation Checklist
**Action:**
- Create file: `docs/GO-NO-GO-VALIDATION.md`
- Include:
  1. **Go Criteria:** All checklist items above ✅ complete
  2. **No-Go Criteria:** Any critical blocker (e.g., no Dataverse admin access, solution creation failed)
  3. **Conditional Go:** Minor items can proceed if documented as Phase A/B follow-up
  4. **Sign-Off:** Formal approval from Tech Lead + Admin before Phase A Day 1 kickoff
- See separate document: **GO-NO-GO-VALIDATION.md** (created in this session)

**Verification:**
```
File created
Ready for sign-off meeting with stakeholders (EOD 2026-04-08)
```

---

## Delivery & Sign-Off

### 📋 Checklist Completion Status
```
✅ GROUP 1: Permission Verification
✅ GROUP 2: Environment Setup
✅ GROUP 3: Test Data Seeding
✅ GROUP 4: Solution Setup
✅ GROUP 5: Component Schema Review
✅ GROUP 6: Documentation & Playbooks
```

### 📄 Deliverables Created
- [x] PRE-FLIGHT-CHECKLIST.md (this file)
- [x] ADMIN-PLAYBOOK-v1.md
- [x] TEST-DATA-STRATEGY.md
- [x] PHASE-A-LAUNCH-CHECKLIST.md
- [x] GO-NO-GO-VALIDATION.md
- [x] SETUP-REFERENCE.md (with IDs and env var details)

### ✍️ Sign-Off

**Admin/Tech Lead:**
```
Name:              ___________________
Date:              ___________________
Signature:         ___________________

All checklist items complete and verified. Phase A cleared for launch.
```

**One-Line Summary for Stakeholder:**
```
✅ Pre-flight complete:
   - Dataverse admin access verified
   - Environment variables configured (DataverseURL)
   - Test workspace + pilot data seeded (Workspace ID: <GUID>)
   - Solution Retail.Core created
   - Component schemas validated
   - Admin playbooks + testing guides documented
   → Phase A Development ready to start 2026-04-08
```

---

## Quick Reference
| Item | Value | Note |
|------|-------|------|
| Workspace ID | <from 3.1> | Use as gblWorkspaceId in app |
| DataverseURL | `'DataverseURL'.Value` | Reference in app (not hardcoded) |
| Solution | Retail.Core | Contains app, tables, env var |
| Admin User | <your name> | Owner of Pilot Workspace |
| Test Products | Bananas, Milk, Juice, etc. | Initial 5-10 SKUs |
| Initial Stock | 50, 20, 30, etc. | Via Purchase records (3.6) |
| Phase A Start | 2026-04-08 | Day 1 kickoff |

---

**Document Version:** 1.0  
**Last Updated:** 2026-04-07  
**Owner:** Admin / Tech Lead  
**Next Review:** Post-Phase A (2026-04-12)
