# Setup Reference: Phase A Key Identifiers & Configuration

**Created:** 2026-04-07  
**Updated:** 2026-04-08 (Admin to fill in; hand off to Dev Team)  
**Owner:** Admin  
**Status:** Ready for Pre-Flight Execution  

---

## Purpose

This document captures all key IDs, URLs, and configuration values needed during Phase A execution. **Admin fills this in during pre-flight; Dev Team uses to configure app.**

> ⚠️ **KEEP SECURE:** This file contains Dataverse URLs and system identifiers. Store in project repo with restricted access.

---

## SECTION 1: ENVIRONMENT CONFIGURATION

### Dataverse Instance Details

```
Organization Name:           _________________________________
Instance URL (DataverseURL): _________________________________
                             Example: https://mycompany.crm.dynamics.com

DEV Environment Name:        _________________________________
DEV Environment ID:          _________________________________
                             (Get from Power Platform Admin Center)

Instance Region:             _________________________________
                             Example: US (Ohio)

Admin User (You):            _________________________________
Admin Email:                 _________________________________
Admin Role:                  ☑️ System Administrator
                             ☑️ Dataverse Administrator
                             ❌ Other (if so, what? _________)
```

### Environment Variable

```
Variable Name:               DataverseURL
Schema Name:                 new_DataverseURL
Data Type:                   Text
Current Value:               https://<yourorg>.crm.dynamics.com
                             
Creation Date:               _________________________________
Created By:                  _________________________________

✅ VERIFICATION: Environment variable accessible in Power Apps
                 Go to: Solutions > Default Solution > Environment Variables
                 ☑️ DataverseURL listed and has Current Value set
```

---

## SECTION 2: WORKSPACE IDENTIFICATION

### Primary Pilot Workspace

```
Workspace Name:              _________________________________
                             Suggestion: "Pilot Workspace" or store name
                             Example: "Kabe Imports - Main"

Workspace ID (GUID):         _________________________________
                             ⭐ THIS IS gblWorkspaceId — USE IN APP
                             Example: 550e8400-e29b-41d4-a716-446655440000

Partition Key:               _________________________________
                             Example: MAIN_20260407 or GUID

Description:                 _________________________________
                             Example: "Phase A pilot test workspace"

Created Date:                _________________________________
Created By (Admin):          _________________________________ 
```

### Additional Workspaces (if any secondary test workspaces)

```
Secondary Workspace 1:
  Name:                      _________________________________
  ID:                        _________________________________

Secondary Workspace 2:
  Name:                      _________________________________
  ID:                        _________________________________
```

---

## SECTION 3: SOLUTION INFORMATION

### Retail.Core Solution

```
Solution Name:               Retail.Core
Solution Type:               ☑️ Unmanaged (for pilot)
                             ☎ Managed (if pre-configured)

Solution Version:            1.0.0.0

Publisher:                   _________________________________
                             Default Publisher or Custom

Solution ID (GUID):          _________________________________

Components Included:
  ☑️ Tables (auto-included):
     - Workspace
     - WorkspaceMember
     - WorkspaceSetting
     - ProductVariant
     - ProductFamily
     - Purchase
     - PurchaseLine
     - StockBatch
     - InventoryEvent
     - SaleLine
     - ProductAvailabilityOverride
  
  ☑️ Canvas App:
     Name: _______________________________
     Version: ______________________________

  ☑️ Environment Variable:
     DataverseURL (see Section 1)

  ☐ Flows (Phase A: Add if applicable)
  
  ☐ Connection References (Phase 2 upgrade; not Phase 1)

Solution Created Date:       _________________________________
Created By:                  _________________________________
```

---

## SECTION 4: ADMIN USER DETAILS

### Primary Admin Account

```
Admin Name:                  _________________________________
Admin Email:                 _________________________________
User ID (ObjectId):          _________________________________
                             (Get from Azure AD if needed)

Admin WorkspaceMember Record:
  - Workspace:               [From Section 2]
  - Role:                    Owner
  - Is Manager:              ☑️ Yes
  - WorkspaceMember ID:      _________________________________

Secondary Admin / Support:
  Name:                      _________________________________
  Email:                     _________________________________
  Role in Workspace:         Manager / Staff (circle one)
```

---

## SECTION 5: PILOT USER GROUP

### Pilot Users Added to Workspace

**25-user template; fill in actual names from pilot group**

```
Pilot User 1:
  Name:                      _________________________________
  Email:                     _________________________________
  Role:                      ☑️ Owner ☑️ Manager ☑️ Staff ☑️ Viewer
  Is Manager:                ☑️ Yes ☑️ No
  Department:                _________________________________
  Verified Access:           ☑️ Yes ☑️ No (Test: have user log in)

Pilot User 2:
  Name:                      _________________________________
  Email:                     _________________________________
  Role:                      ☑️ Owner ☑️ Manager ☑️ Staff ☑️ Viewer
  Is Manager:                ☑️ Yes ☑️ No
  Department:                _________________________________
  Verified Access:           ☑️ Yes ☑️ No

[... Continue for all 15-20 users ...]

TOTAL USERS:                 _________ / 15-20 (target)
USERS VERIFIED ACCESS:       _________ / total
```

---

## SECTION 6: PRODUCT MASTER DATA

### ProductFamily Records

```
ProductFamily 1:
  Name:                      _________________________________
  Normalized Name:           _________________________________
  Description:               _________________________________

ProductFamily 2:
  Name:                      _________________________________
  Normalized Name:           _________________________________
  Description:               _________________________________

ProductFamily 3:
  Name:                      _________________________________
  Normalized Name:           _________________________________
  Description:               _________________________________

ProductFamily 4 (optional):
  Name:                      _________________________________
  Normalized Name:           _________________________________
  Description:               _________________________________

TOTAL FAMILIES:              _________
```

### ProductVariant Records (Pilot SKU List)

**Create one row per product; fill in actual values**

| # | Product Name | Family | Unit | Product ID (GUID) | Initial Stock | Est. Sell Price | Notes |
|---|---|---|---|---|---|---|---|
| 1 | | | | | | | |
| 2 | | | | | | | |
| 3 | | | | | | | |
| 4 | | | | | | | |
| 5 | | | | | | | |
| 6 | | | | | | | |
| 7 | | | | | | | |
| 8 | | | | | | | |
| 9 | | | | | | | |
| 10 | | | | | | | |

**TOTALS:**
```
Total SKUs Created:          _________
Total Initial Stock (units): _________
Total Inventory Value:       $_________ (approximate cost)
```

---

## SECTION 7: INITIAL PURCHASES & STOCK

### Purchase Orders (For Stock Seeding)

```
Purchase 1:
  Purchase Date:             _________________________________
  Provider (if applicable):  _________________________________
  Status:                    ☑️ Received ☑️ Pending
  Purchase ID:               _________________________________
  Total Amount:              $_________________________________

Purchase 2:
  Purchase Date:             _________________________________
  Provider (if applicable):  _________________________________
  Status:                    ☑️ Received ☑️ Pending
  Purchase ID:               _________________________________
  Total Amount:              $_________________________________

Purchase 3:
  Purchase Date:             _________________________________
  Provider (if applicable):  _________________________________
  Status:                    ☑️ Received ☑️ Pending
  Purchase ID:               _________________________________
  Total Amount:              $_________________________________

TOTAL PURCHASES:             _________
TOTAL STOCK VALUE:           $_________________________________
```

### StockBatch Auto-Creation Verification

```
StockBatch records auto-created from Purchases?
  ☑️ Yes (Verified; queried StockBatch table)
  ☑️ Manual creation needed (explain): ________________________

Number of StockBatch records:  _________________________
```

---

## SECTION 8: WORKSPACE SETTINGS

### WorkspaceSetting Records

```
Workspace:                   [Pilot Workspace from Section 2]

UseLastSellUnitPrice Toggle:
  Current Setting:           ☑️ OFF (default) ☑️ ON
  WorkspaceSetting ID:       _________________________________
  Created Date:              _________________________________

Purpose:
  When ON:  After each sale, ProductVariant.LastSellUnitPrice updates
            Next sale pre-fills with that price
  When OFF: No price persistence; every sale starts fresh
```

---

## SECTION 9: CANVAS APP DETAILS

### App Information

```
App Name:                    _________________________________
                             Example: "Retail Sales App v1"

App ID:                      _________________________________

Solution Included:           Retail.Core

Published Version:           1.0.0

Last Modified:               _________________________________

Publish Date:                _________________________________

Published By:                _________________________________

App URL (Share Link):        _________________________________
                             (share link for pilot users)

Dataverse Connection Status: ☑️ Connected
                             ☑️ Untested
                             ❌ Failed (issue: ______________)
```

### Canvas App Formulas & Configuration

```
gblDataverseURL Setup:
  ☑️ Implemented: Set(gblDataverseURL, 'DataverseURL'.Value)
  ☑️ Not yet (defer to: _______________________)

gblWorkspaceId Initialization:
  ☑️ Implemented: User selects workspace on Home screen
  ☑️ Workspace filter enforced on all queries
  ☑️ Error state for users with no workspace access
  ☑️ Not yet (defer to: _______________________)

Workspace Scoping (ADR-022):
  ☑️ All queries include WHERE Workspace = gblWorkspaceId
  ☑️ Code review completed (reviewer: ___________________)
  ☐ Deferred items (list): ____________________________
```

---

## SECTION 10: LAUNCH READINESS

### Pre-Flight Checklist Status

```
GROUP 1: Permission Verification
  ☑️ Dataverse admin access verified
  ☑️ Table create/update permissions confirmed
  ☑️ Solution create permissions confirmed

GROUP 2: Environment Setup
  ☑️ Environment variable 'DataverseURL' created
  ☑️ Environment variable documented

GROUP 3: Test Data Seeding
  ☑️ Workspace created + ID captured
  ☑️ Admin added as WorkspaceMember
  ☑️ WorkspaceSetting created
  ☑️ ProductFamily records created (3-4)
  ☑️ ProductVariant records created (5-10)
  ☑️ Initial Purchase records created
  ☑️ Key IDs captured & documented

GROUP 4: Solution Setup
  ☑️ Solution 'Retail.Core' created
  ☑️ Canvas app added to solution
  ☑️ Solution structure documented

GROUP 5: Component Schema Review
  ☑️ Component contracts reviewed
  ☑️ Environment variable reference validated

GROUP 6: Documentation & Playbooks
  ☑️ ADMIN-PLAYBOOK-v1.md created
  ☑️ TEST-DATA-STRATEGY.md created
  ☑️ PHASE-A-LAUNCH-CHECKLIST.md created
  ☑️ GO-NO-GO-VALIDATION.md created
  ☑️ SETUP-REFERENCE.md (this file) completed
```

---

## SECTION 11: QUICK REFERENCE SUMMARY

### Copy-Paste URLs & IDs

```
DATAVERSE URL:
https://<yourorg>.crm.dynamics.com

WORKSPACE ID (gblWorkspaceId):
[From Section 2]

ENVIRONMENT VARIABLE VALUE:
'DataverseURL'.Value

SPACE-SEPARATED SKU IDs (for quick lookup):
[List all ProductVariant IDs here]

SOLUTION NAME:
Retail.Core

APP NAME:
[Canvas app name from Section 9]
```

---

## SECTION 12: SIGN-OFF & HANDOFF

### Pre-Flight Completion

```
Pre-Flight Executed By:      _________________________________
                             Admin Name

Date Completed:              _________________________________

All items verified & accurate?
  ☑️ YES (proceed to Phase A)
  ❌ NO (issues remaining; see below)

Outstanding Issues (if any):
  1. ___________________________________________________________________
  2. ___________________________________________________________________
  3. ___________________________________________________________________

Recovery Plan:               ___________________________________
Target Resolution Date:      _________________________________

Admin Signature:             _________________________________
```

### Handoff to Dev Team

```
Handed Off To:               _________________________________
                             Tech Lead or Lead Developer

Date Handed Off:             _________________________________

Dev Team Acknowledgment:
  "I have received and reviewed SETUP-REFERENCE.md.
   I understand the WorkspaceId, env var, and app requirements."

Dev Lead Signature:          _________________________________

Date Acknowledged:           _________________________________
```

### Handoff to QA Team

```
Handed Off To:               _________________________________
                             QA Lead

Date Handed Off:             _________________________________

QA Acknowledgment:
  "I have received SETUP-REFERENCE.md and TEST-DATA-STRATEGY.md.
   I understand the test data and smoke test requirements."

QA Lead Signature:           _________________________________

Date Acknowledged:           _________________________________
```

---

## SECTION 13: IMPORTANT NOTES & ASSUMPTIONS

```
Notes for Team:
  1. DataverseURL environment variable created on 2026-04-07
     Value will NOT change during Phase A pilot
     (Changes only if org URL changes; unlikely)

2. gblWorkspaceId must be set before user navigates to Sell/Purchase screens
   (Otherwise queries fail; test on Day 1)

3. ProductVariant master data is stable during pilot
   (No schema changes expected; new products can be added)

4. Passwords & sensitive credentials NOT stored in this file
   (Use Azure Key Vault / managed identities for production)

5. DEV environment is single source of truth during pilot
   (No backup/restore needed unless data corruption occurs)

Assumptions:
  □ All 15-20 pilot users can access DEV environment (no region restrictions)
  □ Dataverse capacity for 20 users + test data: ~100 MB (confirmed sufficient)
  □ Canvas app works in web & mobile browsers (tested on Phase A Day 1)
  □ No custom security roles needed (advisory roles only in v1)
```

---

## APPENDIX A: Emergency Reference

**If something goes wrong during pilot, use this quick lookup:**

```
App Won't Load?
  → Check: gblDataverseURL value (Section 1)
  → Check: User has DEV environment access

Can't See Workspace?
  → Check: User in WorkspaceMember table (Section 5)
  → Check: Workspace ID in SECTION 2

Can't Create Sale?
  → Check: gblWorkspaceId is set (not Blank)
  → Check: Products exist (Section 6)
  → Check: Dataverse connection working

Need to Reset Data?
  → See: TEST-DATA-STRATEGY.md (Section 2: Data Refresh Procedures)

Need to Onboard New User?
  → See: ADMIN-PLAYBOOK-v1.md (Section 2: Adding Users)
```

---

## APPENDIX B: Post-Pilot Archival

**After Phase A completes (2026-04-28+), archive this document:**

```
Archive Location:  c:\Kabe Imports\RetailerManagementTool\backups\
Archive Filename:  SETUP-REFERENCE_PHASE-A-COMPLETE_2026-04-28.md
Archive Contents:  This file + all associated reference IDs + lessons learned
```

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-04-07 | Admin | Initial template |
| 1.1 | 2026-04-08 | Admin | Filled in all IDs & configs |
| 1.2 | [Post-Pilot] | Tech Lead | Archival + lessons learned |

---

**Questions?** Contact Admin or Tech Lead.  
**Next Step:** Share this file with Dev Team on 2026-04-08 AM before coding starts.
