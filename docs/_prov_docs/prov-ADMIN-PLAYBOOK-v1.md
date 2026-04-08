# Admin Playbook v1: User Onboarding & Workspace Management

**For:** Dataverse Administrators / Store Managers (Phase A Pilot)  
**Status:** Ready for Pilot Phase  
**Version:** 1.0  
**Last Updated:** 2026-04-07  

---

## Overview

This playbook provides step-by-step procedures for the admin to manage pilot user access, create workspaces, and troubleshoot onboarding issues. In v1, all workspace creation is **admin-initiated** (no self-service for pilot).

**Key Constraint (ADR-030):** Workspaces are created by admin; users are added manually. Self-service registration deferred to v2.

---

## Table of Contents
1. [Workspace Creation](#workspace-creation)
2. [Adding Users (WorkspaceMember)](#adding-users)
3. [Role Management & Permissions](#role-management)
4. [Troubleshooting Common Issues](#troubleshooting)
5. [Testing & Validation](#testing--validation)

---

## Workspace Creation

### Procedure: Create a New Workspace Record

**When:** Before pilot user needs app access  
**Time:** 5 minutes per workspace  
**Permissions Required:** Dataverse admin (System Administrator or Dataverse Administrator role)

### Steps

#### **Step 1: Open Workspace Table**

1. Log into Power Apps (https://make.powerapps.com)
2. Select **DEV** environment
3. Go to **Tables**
4. Search for and open **Workspace** table
5. Click **Add a record** (or **+ New**)

#### **Step 2: Fill Workspace Fields**

```
Display Name:     Name
Value:            [Store name or identifier]
Example:          "Kabe Imports Store - Main Branch"
```

```
Display Name:     Description (optional)
Value:            Purpose of workspace; store location; manager name
Example:          "Pilot test workspace for main store. Manager: Maria Santos"
```

```
Display Name:     Partition Key
Value:            Unique identifier for workspace data isolation
Recommendation:   Use format: [Store Code]_[Date]
Example:          "MAIN_20260407" or generate a GUID
NOTE:             This field ensures data isolation across workspaces (ADR-001)
```

#### **Step 3: Save & Capture ID**

1. Click **Save** (at bottom or **Ctrl+S**)
2. System auto-generates **Workspace ID** (GUID)
3. **Copy the GUID** from:
   - URL bar (last part after `/`)
   - Or record header (click on ID field)

**Example ID:** `550e8400-e29b-41d4-a716-446655440000`

#### **Step 4: Reference & Document**

- Save ID to `SETUP-REFERENCE.md`:
  ```
  Workspace: Kabe Imports - Main
  Workspace ID: 550e8400-e29b-41d4-a716-446655440000
  Partition Key: MAIN_20260407
  Created: 2026-04-07
  Admin User: [Your Name]
  ```

---

## Adding Users (WorkspaceMember)

### Procedure: Add a User to a Workspace

**When:** Before user logs into app for first time  
**Time:** 2 minutes per user  
**Permissions Required:** Dataverse admin; user already created in Azure AD / Office 365

### Steps

#### **Step 1: Open Workspace & Navigate to Members**

1. Go to **Tables > Workspace**
2. Open the workspace you created above (or find existing)
3. Scroll down to **Related** tab
4. Click **WorkspaceMembers** (or search section)
5. Click **Add Workspace Member**

#### **Step 2: Fill Member Fields**

```
Display Name:     User (lookup)
Value:            [Select user from dropdown]
How to find:      Start typing user's full name or email
Example:          "Maria Santos" or "maria.santos@company.com"
NOTE:             User must already exist in your Azure AD
```

```
Display Name:     Role
Value:            [Select from dropdown]
Options:          - Owner (full control; can manage members)
                  - Manager (can perform admin tasks; view reports)
                  - Staff (can enter sales/purchases; no admin)
                  - Viewer (read-only; no transaction entry)
Default:          Staff (for v1 pilot)
NOTE:             Roles are advisory in v1; enforced in v2 (ADR-030)
```

```
Display Name:     Is Manager (optional)
Value:            Yes or No
Recommendation:   Yes if user is store manager or admin
                  No for frontline staff
Effect:           Can be used for workflow logic; not enforced in v1 app UI
```

```
Display Name:     Department (optional)
Value:            Free text
Example:          "Sales", "Inventory", "Admin", etc.
Purpose:          For future role-based filtering; documentation
```

#### **Step 3: Save Member Record**

1. Click **Save & Close**
2. User is now added to workspace

#### **Step 4: Notify User (Manual Process in v1)**

Send user:
```
Subject: Your Retail Management App Access is Ready

Hi [User Name],

Your access to the Retail Management App has been set up. Here's what you need to know:

1. Log in to: https://apps.powerapps.com
2. Find the app: "Retail Sales App" (or whatever you named it)
3. You're assigned to workspace: [Workspace Name]
4. Your role: [Role] (e.g., Staff)

If you have questions or can't see the app, reach out to [Admin Name].

Thanks!
```

---

## Role Management & Permissions

### Role Matrix (v1 - Advisory)

| Role | Can Enter Sales | Can Create Purchases | Can Adjust Inventory | Can Manage Members | Can Access Settings |
|------|---|---|---|---|---|
| **Owner** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Manager** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Staff** | ✅ | ✅ | ⚠️ (basic edits only) | ❌ | ❌ |
| **Viewer** | ❌ | ❌ | ❌ | ❌ | ✅ (read-only) |

**Legend:**  
- ✅ Enabled (enforced or can perform)
- ⚠️ Partial (limited functionality; app advisory)
- ❌ Disabled (not allowed)

### Important Notes for v1:

- **Role enforcement is app-level only** (not backend flows/security roles yet)
- Staff members CAN see Manager/Owner UI buttons (honor system in v1)
- Backend data access is workspace-scoped (Dataverse row-level security in future v2)
- All users in same workspace see same data (no per-user filtering yet)

### Changing a User's Role (After Onboarding)

1. Open **Workspace**
2. Go to **Related > WorkspaceMembers**
3. Open the member record
4. Change **Role** dropdown
5. Click **Save & Close**

---

## Troubleshooting Common Issues

### Issue 1: "User not found in lookup"

**Symptom:** When adding a member, user doesn't appear in dropdown  
**Cause:** User not created in Azure AD / Office 365 yet  
**Solution:**
1. Ask IT or Office 365 admin to create user account
2. Wait 5-10 minutes for sync to Dataverse
3. Try lookup again

---

### Issue 2: "User can't see workspace in app"

**Symptom:** User logs into app but sees "No workspace access" or blank home screen  
**Cause:** User not added as WorkspaceMember, or member record not saved correctly  
**Solution:**
1. Verify user is in **WorkspaceMember** table:
   - Go to **Workspace** record
   - Check **Related > WorkspaceMembers**
   - Look for user's name
2. If not present:
   - Add them (see [Adding Users](#adding-users) above)
   - Wait 1-2 minutes for app to refresh
3. If present but still not seeing:
   - Clear app cache:
     - In app: **Settings > Clear app cache & data**
     - Or close app; wait 30 seconds; reopen
   - Verify `gblWorkspaceId` is set correctly (see Phase A tech validation)

---

### Issue 3: "Can't find user's workspace ID"

**Symptom:** Dev team needs workspace ID for app formula; you need to retrieve it  
**Solution:**
1. Go to **Tables > Workspace**
2. Open the workspace record (search by Name)
3. Look at the **URL bar**:
   ```
   Example: https://make.powerapps.com/...?entityid=550e8400-e29b-41d4-a716-446655440000
   ```
4. Copy the GUID (last segment after `=`)
5. Share with dev team for `gblWorkspaceId` setup

---

### Issue 4: "User has wrong role"

**Symptom:** Staff member accidentally created with "Owner" role; need to downgrade  
**Solution:**
1. Go to **Workspace > Related > WorkspaceMembers**
2. Open the member record
3. Change **Role** from "Owner" to "Staff" (or desired role)
4. Click **Save & Close**
5. Have user refresh app to see changed permissions

---

### Issue 5: "Can't create workspace (permission denied)"

**Symptom:** Error: "Insufficient permissions to create record"  
**Cause:** Your user account doesn't have admin role  
**Solution:**
1. Contact Dataverse capacity owner / tenant admin
2. Request **System Administrator** or **Dataverse Administrator** role for your user
3. Wait 5-10 minutes for role assignment to sync
4. Try again

---

## Testing & Validation

### Test Scenario: "Happy Path - New User Onboarding"

**Objective:** Verify a new user can log in and see workspace  
**Time:** 10 minutes  
**Prerequisites:** One workspace exists; one non-admin test user account available

#### Steps

1. **As Admin:**
   - Open Workspace table
   - Open test workspace
   - Add test user as WorkspaceMember (Staff role)
   - Note the **Workspace ID** (GUID)

2. **Notify Test User:**
   ```
   "Your app access is ready. Log in to https://apps.powerapps.com 
   and open 'Retail Sales App'. Let me know if you can see a workspace."
   ```

3. **As Test User:**
   - Log into https://apps.powerapps.com (with different account in separate browser)
   - Find and open "Retail Sales App"
   - Expected: **Home screen (V1-01)** shows workspace name in dropdown
   - Click workspace to select it

4. **Verification Checklist:**
   ```
   ✅ User sees app in app list
   ✅ User sees workspace name in home screen dropdown
   ✅ User can click workspace (loads without error)
   ✅ User sees "No workspace access" message if they select non-assigned workspace
   ✅ User can navigate to Sell/Purchase screens (basic navigation working)
   ```

5. **As Admin (Cleanup):**
   - If test successful, remove test user from workspace:
     - Open workspace
     - Go to **Related > WorkspaceMembers**
     - Click test user's record
     - Delete (if test only) or keep if reusing for testing

---

### Test Scenario: "Role Verification (Advisory in v1)"

**Objective:** Confirm role-based UI visibility (advisory level)  
**Time:** 5 minutes per role

#### For Each Role (Owner, Manager, Staff, Viewer):

1. Add test user as [Role]
2. Log in as test user
3. Check visibility:
   ```
   Staff role:   "Mark Unavailable" button in product card [might see but greyed out]
   Manager role: Can edit product batch info [if "Edit" screen exists]
   Owner role:   Can access Settings/Admin screens [if they exist]
   Viewer role:  Can see reports [if they exist]
   ```
4. **Note:** In v1, role enforcement is app-advisory only. Roles will be enforced in v2.

---

### Quick Check: Validate Workspace Setup

Run this checklist weekly (or before handing off to dev team):

```
□ Workspace record exists
□ Workspace has unique Partition Key (no duplicates)
□ At least one user added as WorkspaceMember (you, the admin)
□ WorkspaceSetting record exists for the workspace
□ Initial products exist (ProductVariant: 5-10 SKUs)
□ Initial stock > 0 (via Purchase records)
□ Environment Variable 'DataverseURL' accessible (Power Apps admin center)
```

---

## Environment Variable Management

### View Current DataverseURL

**When:** Share connection details with dev team; troubleshoot app connectivity  
**Steps:**
1. Go to **Solutions > Default Solution** (or Retail.Core solution)
2. Look for **Environment Variables** section
3. Find **DataverseURL**
4. Click to open
5. See **Current Value** = `https://<yourorg>.crm.dynamics.com`

**If you need to change it** (rare; usually only if org URL changes):
1. Open environment variable record
2. Update **Current Value** field
3. Save
4. **All users' apps automatically pick up new value** (no re-publish needed)

---

## Workspace Settings Toggle: LastSellUnitPrice

### Enable/Disable LastSellUnitPrice Persistence (Workspace-Level)

**When:** During testing or based on store manager request  
**Time:** 1 minute  

**Steps:**

1. Go to **Tables > WorkspaceSetting**
2. Open the record for your workspace (use Workspace lookup if multiple workspaces)
3. Toggle: **Use Last Sell Unit Price**
   - **OFF** (default): Prices do not persist between sales; each sale starts fresh
   - **ON**: Last price sold is stored; next sale pre-fills with that price
4. Save

**Effect:**
- When ON: ProductVariant.`LastSellUnitPrice` updates after each sale; appears in next sale form
- When OFF: No persistence; staff manually enters price each time
- **Workspace-wide:** All products in this workspace follow the same toggle (no per-product override in v1)

**Testing Toggle Behavior:**
1. Create a sale with product "Bananas" at price $0.79
2. Log in as different user in same workspace
3. If toggle ON: Next sale form for Bananas pre-fills $0.79
4. If toggle OFF: Next sale form for Bananas has no pre-fill

---

## Checklists for Phase A Pilot

### Pre-Pilot Readiness (Admin)

```
Date: ____________

□ Workspace created: [Name: ____________________] [ID: ____________________]
□ 15-20 pilot users added to WorkspaceMember table (all rolesvalid)
□ WorkspaceSetting toggle configured (LastSellUnitPrice: ON/OFF [circle one])
□ Initial products created (5-10 ProductVariant records)
□ Initial stock seeded (via Purchase records; stock > 0 for all)
□ Environment variable DataverseURL accessible
□ "Test workspace onboarding" successful (at least one user verified app access)

Admin Sign-Off: ____________________  Date: ____________
```

### Weekly During Pilot

```
Week of: ____________

□ No new user onboarding issues reported
□ All pilot users have active WorkspaceMember records
□ No duplicate workspaces created (verify via Workspace table count)
□ LastSellUnitPrice toggle working as expected (sales prices updating/static)
□ Initial stock remains adequate for pilot testing (no stock-outs unexpected)

Admin Notes: ___________________________________________________________________

Next Week Focus: _______________________________________________________________
```

---

## Appendix: Quick Reference

### Table Locations (Power Apps)
| Table | Path |
|-------|------|
| Workspace | Tables > Workspace |
| WorkspaceMember | Tables > WorkspaceMember (or Workspace > Related > WorkspaceMember) |
| WorkspaceSetting | Tables > WorkspaceSetting |
| ProductVariant | Tables > ProductVariant |
| Purchase | Tables > Purchase |

### Common URLs
| Resource | URL |
|----------|-----|
| Power Apps Admin | https://make.powerapps.com |
| Dataverse Tables | https://make.powerapps.com → Select Environment → Tables |
| DEV Environment | [Depends on org; ask IT] |

### Key Contacts
| Role | Name | Email |
|------|------|-------|
| Tech Lead | [TBD] | [TBD] |
| Dataverse Admin | [TBD] | [TBD] |
| Phase A Manager | [TBD] | [TBD] |

---

## Document History

| Version | Date | Author | Change |
|---------|------|--------|--------|
| 1.0 | 2026-04-07 | Admin/Tech Lead | Initial version for Phase A pilot |
| 1.1 | [TBD] | [TBD] | Post-pilot refinements (v1.1+ features) |

---

**Questions or Issues?** Contact [Tech Lead Name] or file an issue in `issues/ISSUES_TRACKER.md`.
