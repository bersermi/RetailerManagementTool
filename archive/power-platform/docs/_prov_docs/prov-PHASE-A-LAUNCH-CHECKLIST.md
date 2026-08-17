# Phase A Launch Checklist: Developer Team Coordination

**For:** Dev Team, Tech Lead, QA  
**Status:** Ready for Phase A Day 1 (2026-04-08)  
**Version:** 1.0  
**Last Updated:** 2026-04-07  

---

## Overview

This checklist guides the development team through Phase A launch tasks. It covers:
1. **Pre-Kickoff Verification** (Dataverse setup already done by admin)
2. **Canvas App Setup** (environment variable integration, app initialization)
3. **Integration Points** (workflow connections, table relationships)
4. **Component Validation** (canvas components, input/output contracts)
5. **Release Readiness** (build, publish, pilot deployment)

**Key Timeline:**
- **2026-04-07 (EOD):** Pre-flight checklist complete; admin ready
- **2026-04-08 (Day 1):** Dev team starts; this checklist executes
- **2026-04-08 (EOD):** App ready for Phase A pilot group

---

## TABLE OF CONTENTS
1. [Pre-Kickoff Verification](#pre-kickoff-verification)
2. [Canvas App Setup](#canvas-app-setup)
3. [Component Validation](#component-validation)
4. [Table & Flow Integration](#table--flow-integration)
5. [Publishing & Deployment](#publishing--deployment)
6. [Phase A Day 1 Sign-Off](#phase-a-day-1-sign-off)

---

## Pre-Kickoff Verification

### ✅ 1.1 Confirm Admin Pre-Work Complete

**Action:**
- Tech Lead / QA verifies admin completed PRE-FLIGHT-CHECKLIST.md
- Ask admin for sign-off +reference file (SETUP-REFERENCE.md)

**Verification Checklist:**
```
□ Dataverse admin access verified (admin has System Admin role)
□ Environment variable 'DataverseURL' created in DEV
  - Retrieve value from admin: https://<yourorg>.crm.dynamics.com
□ Test Workspace record created + ID captured
  - Workspace ID (gblWorkspaceId): _____________________
  - Partition Key: _____________________
□ Admin user added as WorkspaceMember (Owner role)
□ Test ProductVariant records created (5-10 SKUs)
□ Initial Purchase records created (stock > 0)
□ Solution 'Retail.Core' created and accessible
```

**If any item is missing:** STOP. Notify admin; don't proceed until complete.

---

### ✅ 1.2 Review Key Architectural Decisions

**Action:** Tech Lead / Lead Dev reviews these decision documents:
- ADR-030 (Workspace Onboarding + Environment Variables)
- ADR-031 (Sales Flow & Strictly Open approach)
- ADR-032 (Quick Actions - Optional Front-End)
- ISS-025 Clarification (Option B: Env Vars for Phase 1)

**Key Takeaways:**
```
ARCHITECTURE:
  - Single DEV environment; no TEST/PROD yet
  - Environment variables for config (Phase 1)
  - Workspace-scoped data isolation (gblWorkspaceId)
  - No role-based enforcement in v1 (advisory only)

BUSINESS LOGIC:
  - Sales: Strictly open (no inventory validation)
  - Timestamps: Collected for post-hoc analysis
  - LastSellUnitPrice: Workspace-level toggle (optional persistence)
  - Quick Actions: Optional front-end toggle (if included)

PHASE A SCOPE (Vertical 1):
  - Home Screen (V1-01): Workspace selector
  - Sell Screen (V1-02): Sale entry (no validation)
  - Purchase Screen (V1-03): Purchase entry
  - Settings (V1-04): LastSellUnitPrice toggle + user prefs
  - NO: Complex workflows, inventory validation, real-time alerts
```

**Questions?** Tech Lead clarifies with Sergio before proceeding.

---

## Canvas App Setup

### ✅ 2.1 Create/Open Canvas App in Solution

**Action:**

1. Go to **make.powerapps.com** → DEV environment
2. Create new Canvas app:
   - **Name:** "Retail Sales App v1" (or agreed upon name)
   - **Format:** Tablet (or Phone if mobile-first design)
   - Save to **Retail.Core** solution
3. Or: Open existing app if pre-created

**Verification:**
```
App Name: _________________________
Solution: Retail.Core
Format: Tablet / Phone
Created/Updated: 2026-04-08
```

---

### ✅ 2.2 Add Environment Variable Reference to App

**Action:**

1. In Canvas app, open a screen (e.g., Home or App startup screen)
2. In formula bar, add formula to retrieve DataverseURL:
   ```
   // On App Start (in OnStart property or screen OnVisible)
   Set(gblDataverseURL, 'DataverseURL'.Value)
   ```
3. Or in specific connector formula:
   ```
   // In Dataverse connector connection setup
   ConnectorURL = 'DataverseURL'.Value
   ```

**Verification:**
```
□ gblDataverseURL variable set on app start
□ Environment variable successfully referenced
□ No hardcoded URLs in app formulas
□ Test: Run app; check gblDataverseURL value = https://<yourorg>.crm.dynamics.com
```

---

### ✅ 2.3 Initialize gblWorkspaceId (Workspace Selection)

**Action:**

1. On Home screen (V1-01), add initialization logic:
   ```
   // On screen OnVisible or App OnStart
   Set(gblWorkspaceId, Blank())  // Initially empty
   
   // When user selects workspace from dropdown/list
   Set(gblWorkspaceId, SelectedWorkspace.WorkspaceId)
   
   // On all subsequent screens, filter queries by gblWorkspaceId
   Filter(SaleLine, Workspace.WorkspaceId = gblWorkspaceId)
   ```

2. Add error state for users with no workspace access:
   ```
   If(IsBlank(gblWorkspaceId),
     Label("You do not have access to any workspaces. Contact your admin."),
     { /* Normal home screen */ }
   )
   ```

**Verification:**
```
□ gblWorkspaceId variable declared (global scope)
□ Home screen error handling (no workspace access case)
□ User can select workspace from list
□ After selection, gblWorkspaceId = selected workspace GUID
□ Test: Log in as pilot user; verify workspace appears in dropdown
```

---

### ✅ 2.4 Add Workspace-Scoped Queries (ADR-022 Requirement)

**Action:**

For every gallery, form, or Dataverse query, filter by workspace:

```
Example: Sales Entry Modal (V1-02)
  /* Product picker */
  Filter(
    ProductVariant,
    Workspace.WorkspaceId = gblWorkspaceId
  )

Example: Sales History Gallery
  /* Show only sales from current workspace */
  Filter(
    SaleLine,
    Workspace.WorkspaceId = gblWorkspaceId
  )

Example: Inventory View
  /* Show only stock in current workspace */
  Filter(
    StockBatch,
    ProductVariant.Workspace.WorkspaceId = gblWorkspaceId
  )
```

**Code Review Checklist:**
```
□ Every Filter() call includes WHERE Workspace.WorkspaceId = gblWorkspaceId
□ Every LookUp() call includes workspace filter
□ No queries return cross-workspace data
□ Automated check feasible (grep for "Filter(.*SaleLine" patterns)
```

---

## Component Validation

### ✅ 3.1 Validate Component Input/Output Contracts

**Action:**

For each component, verify Expected vs. Actual properties:

#### **cmpQtyStepper**
(See ADR-009, ISS-009 for details)

| Contract Item | Expected | Actual | Status |
|---|---|---|---|
| Inputs | Value, Min, Max, StepSize, AllowDecimals, Label, ReadOnly | | ✓/❌ |
| Output Event | OnChange | | ✓/❌ |
| Behavior | Increment/decrement by StepSize; validate Min/Max | | ✓/❌ |
| Edge Case | AllowDecimals=false; round to nearest int | | ✓/❌ |

---

#### **cmpMoneyInput**
(See ISS-010 for details)

| Contract Item | Expected | Actual | Status |
|---|---|---|---|
| Inputs | Value, CurrencySymbol, ReadOnly, Label | | ✓/❌ |
| Output Events | OnChange, OnBlur | | ✓/❌ |
| Validation | Only numeric; 2 decimals; format $X.XX | | ✓/❌ |
| Edge Case | Null/0 handling; negative price reject | | ✓/❌ |

---

#### **cmpCartBottomBar**
(See ISS-011, ADR-027 for interaction with cmpCartPanel)

| Contract Item | Expected | Actual | Status |
|---|---|---|---|
| Inputs | CartItems, TotalPrice, UserRole | | ✓/❌ |
| Output Event | OnExpand (triggers cart panel toggle) | | ✓/❌ |
| Behavior | Shows summary (item count, total); expandable | | ✓/❌ |
| Sync with Panel | ResetNonce pattern or event emitter | | ✓/❌ |

---

#### **cmpCartPanel**
(See ISS-011, ADR-027)

| Contract Item | Expected | Actual | Status |
|---|---|---|---|
| Inputs | CartItems, IsExpanded, WorkspaceId | | ✓/❌ |
| Output Event | OnCartModified (item added/removed) | | ✓/❌ |
| Behavior | Shows detailed cart; edit qty; remove items | | ✓/❌ |
| Sync with Bar | Updates bottom bar on item change | | ✓/❌ |

---

#### **cmpQuickActionsSheet** (Optional if included)
(See ADR-032 for details)

| Contract Item | Expected | Actual | Status |
|---|---|---|---|
| Inputs | Product, UserRole, OverrideStatus | | ✓/❌ |
| Output Event | OnToggleAvailability | | ✓/❌ |
| Visibility | Show for Owner/Manager; hide for Staff | | ✓/❌ |
| Action | Toggle ProductAvailabilityOverride on/off | | ✓/❌ |

---

### ✅ 3.2 Component Input/Output Review Meeting

**Action:**

1. QA reviews component contracts vs. ADRs
2. Dev provides screenshots/demos of each component
3. Sign-off: All components match contracts (or document deferrals for Phase B)

**Sign-Off:**
```
Component Validation Review
Date: 2026-04-08
Reviewed By: [QA Lead Name]

All components match expected contracts / defer to Phase B:
  ✓ cmpQtyStepper
  ✓ cmpMoneyInput
  ✓ cmpCartBottomBar
  ✓ cmpCartPanel
  □ cmpQuickActionsSheet [optional; defer if needed]

Reviewer Signature: ____________________
```

---

## Table & Flow Integration

### ✅ 4.1 Verify Dataverse Table Connections

**Action:**

In Canvas app, add Dataverse connections for each table:

```
Tables to Connect (via Data Pane or Connector):
□ Workspace
□ WorkspaceMember
□ WorkspaceSetting
□ ProductVariant
□ ProductFamily
□ Purchase
□ PurchaseLine
□ StockBatch
□ InventoryEvent (if included in v1)
□ SaleLine
□ ProductAvailabilityOverride (if quick actions enabled)
```

**Verification:**
```
For each table:
  □ Added to Data sources in Power Apps
  □ Can read records (Filter test successful)
  □ Can create records (Patch test successful)
  □ Delegation warning resolved (if any)
  □ Workspace filter enforced (see 2.4)
```

---

### ✅ 4.2 Test Dataverse CRUD Operations

**Action:**

Create test cases for Create, Read, Update, Delete:

```
CREATE:
  - Create SaleLine record with Workspace = gblWorkspaceId
  - Verify: WorkspaceId saved correctly

READ:
  - Query ProductVariant filtered by Workspace
  - Verify: Only products from gblWorkspaceId returned

UPDATE:
  - Update ProductVariant.LastSellUnitPrice via sale
  - Verify: Field updates if toggle ON; stays same if toggle OFF

DELETE:
  - Delete InventoryEvent (Pending events only in v1)
  - Verify: Record removed; no orphaned data
```

**Expected Results:**
```
All CRUD operations succeed with correct workspace scoping
No errors; no timeout issues with test data (10-15 products, 3+ users)
```

---

### ✅ 4.3 Validate Flow Triggers (if applicable)

**Action:**

If Phase A includes Power Automate flows (e.g., create StockBatch from Purchase):

```
Flow: "Create StockBatch from Purchase"
  Trigger: When Purchase record created
  Action: Create StockBatch record
  Verification:
    □ Flow triggers on new Purchase
    □ StockBatch quantity = Purchase line quantity
    □ StockBatch workspace = Purchase workspace
    □ No errors in flow run history
```

---

## Publishing & Deployment

### ✅ 5.1 Build & Test in DEV

**Action:**

1. Save all app changes
2. Run app in preview mode:
   ```
   Test scenarios:
   □ User selects workspace (Home screen)
   □ Product list filtered to workspace
   □ Create sale entry (qty + price)
   □ Sale recorded in SaleLine + timestamp accurate
   □ No cross-workspace data visible
   □ Error handling (no workspace access)
   ```

3. QA performs smoke tests:
   ```
   □ App loads without errors
   □ Navigation works (Home → Sell → Purchase → Settings)
   □ Data persists (reload page; data still there)
   □ Multiple users (simultaneous logins; no conflicts)
   □ Mobile responsiveness (if tablet/phone app)
   ```

**Go/No-Go:**
```
If all tests pass: Proceed to publish
If any tests fail: Log issue; iterate before publishing
```

---

### ✅ 5.2 Publish App to DEV Environment

**Action:**

1. In Power Apps, click **Publish**
2. Confirm version number: v1.0.0 (or agreed version)
3. Wait for publish to complete (1-2 minutes)

**Verification:**
```
Published version appears in:
  - Power Apps → Apps (live list)
  - App name: "Retail Sales App v1" or agreed name
  - Environment: DEV
  - Last Modified: 2026-04-08 (today)
```

---

### ✅ 5.3 Add App to Solution Retail.Core

**Action:**

1. Go to **Solutions > Retail.Core**
2. Click **Edit**
3. Add Component: **Canvas App**
4. Select: "Retail Sales App v1"
5. Save solution

**Verification:**
```
Solution Retail.Core now includes:
  □ Canvas App: Retail Sales App v1
  □ Tables (auto-included or manual)
  □ Environment Variable: DataverseURL
  □ Flows (if applicable)
```

---

### ✅ 5.4 Deploy to Pilot User Group

**Action:**

1. Admin (or designated deployer) downloads app package from solution
2. Deploy methods:
   - **Option A (Simplest for Pilot):** Share app link with pilot users
     - URL: https://apps.powerapps.com → Search "Retail Sales App v1"
     - Users open + enjoy (no install needed)
   - **Option B (if managed distribution needed):** Use Azure AD group assignment

3. Send pilots deployment email:
   ```
   Subject: Retail Management App Now Live (Phase A Pilot)
   
   Hi [Pilot User Names],
   
   The Retail Management App is now available. You can access it here:
   https://apps.powerapps.com
   
   Steps:
   1. Log in with your work account
   2. Find "Retail Sales App v1" in your app list
   3. Open and select "Pilot Workspace" from the home screen
   4. You're ready! Try a test sale entry.
   
   Questions? Contact [Tech Lead].
   
   Thanks!
   ```

**Verification:**
```
□ All 15-20 pilot users can access app
□ Users see correct workspace in home screen
□ At least 5 users confirmed via reply / test sale created
```

---

## Phase A Day 1 Sign-Off

### ✅ 6.1 Final Pre-Launch Validation

**Before 3 PM on 2026-04-08, verify:**

```
SETUP COMPLETE:
  □ Admin completed all PRE-FLIGHT items (GROUP 1-6)
  □ Workspace ID + IDs captured
  □ Test data seeded (5-10 products; initial stock > 0)
  □ Environment variable DataverseURL accessible

APP COMPLETE:
  □ Canvas app created in Retail.Core solution
  □ Environment variable integrated (gblDataverseURL set)
  □ gblWorkspaceId initialization working
  □ All queries workspace-scoped (ADR-022)
  □ Component contracts validated
  □ App published to DEV
  □ Pilot user group can access app

TESTING COMPLETE:
  □ Smoke tests passed (load, navigate, create transaction)
  □ Workspace filtering verified (no cross-workspace data)
  □ Error handling tested (no workspace access scenario)
  □ At least 3 pilot users confirmed access + test sale

DOCUMENTATION COMPLETE:
  □ PRE-FLIGHT-CHECKLIST.md (admin: 10-item checklist)
  □ ADMIN-PLAYBOOK-v1.md (user onboarding guide)
  □ TEST-DATA-STRATEGY.md (data seeding + refresh)
  □ PHASE-A-LAUNCH-CHECKLIST.md (this doc: dev sign-off)
  □ GO-NO-GO-VALIDATION.md (stakeholder approval)
  □ SETUP-REFERENCE.md (IDs + env var)

STAKEHOLDER SIGN-OFF:
  □ Tech Lead approves architecture + component contracts
  □ Admin approves user setup + test data
  □ QA approves smoke tests + deployment
  □ Sergio (PM) approves scope + readiness
```

---

### ✅ 6.2 Go/No-Go Decision

**Tech Lead Decision (2026-04-08, EOD):**

**☑️ GO FOR PHASE A LAUNCH**
```
All checklist items complete. No blockers.
Phase A development ready for full team.
Pilot group can begin real usage starting 2026-04-09.
```

**OR**

**❌ NO-GO; DEFER TO 2026-04-09**
```
Outstanding items blocking launch:
1. [Specific blocker]
2. [Specific blocker]

Mitigation: [Plan to resolve]
New launch target: 2026-04-09 [time]
```

---

### 6.3 Formal Sign-Off

```
PHASE A LAUNCH SIGN-OFF
Date: 2026-04-08
Environment: DEV
App Version: 1.0.0

TECH LEAD:
  Name: ____________________________
  Signature: ____________________________
  Decision: ☑️ GO ❌ NO-GO

ADMIN:
  Name: ____________________________
  Signature: ____________________________
  Data Ready: ☑️ YES

QA LEAD:
  Name: ____________________________
  Signature: ____________________________
  Testing Complete: ☑️ YES

PROJECT MANAGER (Sergio):
  Name: ____________________________
  Signature: ____________________________
  Scope Approved: ☑️ YES

---

PHASE A PILOT LIVE: 2026-04-09 (Day 2)
15-20 users; 3-week pilot; DEV environment only
```

---

## Appendix: Troubleshooting

### "App won't load; blank screen"
**Diagnosis:**
1. Check gblDataverseURL = correct value
2. Verify 'DataverseURL' environment variable exists
3. Clear app cache (Settings > Clear Data)

**Resolution:** Restart app; verify Dataverse connection

---

### "Workspace dropdown empty (no workspaces)"
**Diagnosis:**
1. User not added to any WorkspaceMember records
2. Or WorkspaceMember workspace lookup is broken

**Resolution:** Admin verifies user in WorkspaceMember table; re-add if needed

---

### "Can see products from other workspaces"
**Diagnosis:**
1. Query missing workspace filter (see section 2.4)
2. gblWorkspaceId = Blank() or wrong GUID

**Resolution:** Add Filter() clause; log gblWorkspaceId value to debug

---

### "Sale not saving; timeout error"
**Diagnosis:**
1. Dataverse connection slow
2. Too much data in filter (performance issue)

**Resolution:**
1. Retry (network may be transient)
2. Check Dataverse admin center for degradation alerts
3. Optimize query (add more specific filters)

---

## Quick Reference Matrix

| Task | Owner | Time | Status |
|------|-------|------|--------|
| Verify Admin Pre-Work | Tech Lead | 15 min | ☑️ |
| Review ADRs | Tech Lead | 20 min | ☑️ |
| Setup Canvas App | Dev | 30 min | ☑️ |
| Add Env Var Reference | Dev | 15 min | ☑️ |
| Initialize gblWorkspaceId | Dev | 20 min | ☑️ |
| Test & Publish | QA | 45 min | ☑️ |
| Deploy to Pilot Users | Admin | 20 min | ☑️ |
| Final Validation | Tech Lead | 30 min | ☑️ |

**Total Time (Sequential):** ~3.5 hours (can parallelize Tasks 2-4)

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-04-07 | Tech Lead | Initial Phase A checklist |

---

**Contact:** Tech Lead or Sergio for clarification on items.  
**Next Review:** Post-Phase A (2026-04-12) for lessons learned.
