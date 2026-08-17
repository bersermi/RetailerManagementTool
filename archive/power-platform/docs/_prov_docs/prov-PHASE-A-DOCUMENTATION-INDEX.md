# Phase A Pre-Flight Documentation Index

**Generated:** 2026-04-07  
**For:** RetailerManagementTool Project  
**Status:** ✅ All 7 Documents Ready for Execution  

---

## 📚 Document Index (Location: `docs/`)

### **1. PHASE-A-EXECUTION-SUMMARY.md** ⭐ START HERE
**Read First!** — High-level overview of all deliverables  
**Length:** 10 KB  
**Who Should Read:** Everyone (especially PM + Tech Lead)  
**Key Sections:**
- Mission accomplished summary
- 2-day execution timeline (printable)
- Quick execution checklist for each role
- Key architectural decisions reference
- What happens next (pilot timeline)

**Action:** Print or keep on screen during Phase A kickoff

---

### **2. PRE-FLIGHT-CHECKLIST.md** 
**For:** Admin (Primary Executor)  
**Length:** 8 KB  
**Duration:** 3.5 hours of execution  
**Key Sections:**
- ✅ GROUP 1: Permission Verification (30 min)
- ✅ GROUP 2: Environment Setup (45 min)
- ✅ GROUP 3: Test Data Seeding (60 min)
- ✅ GROUP 4: Solution Setup (40 min)
- ✅ GROUP 5: Component Schema Review (20 min)
- ✅ GROUP 6: Documentation & Playbooks (90 min)

**How to Use:** 
1. Open on phone/tablet
2. Work through each group sequentially
3. Check off items as you complete
4. Get sign-off signature at bottom
5. Hand off SETUP-REFERENCE.md to Dev Team

**Critical Output:** SETUP-REFERENCE.md (filled with all IDs)

---

### **3. ADMIN-PLAYBOOK-v1.md**
**For:** Dataverse Administrators (Ongoing Operations)  
**Length:** 12 KB  
**Use When:** You need to onboard a new pilot user, troubleshoot issues  
**Key Sections:**
- Workspace Creation (step-by-step procedure)
- Adding Users (WorkspaceMember roles)
- Role Management & Permissions Matrix
- Troubleshooting (7 common issues + solutions)
- Testing & Validation (happy path scenario)
- Environment Variable Management
- LastSellUnitPrice Settings Toggle

**Training Value:** Can be handed to a new admin for self-service training

**Real-World Example Scenarios:**
- "I need to add Maria Santos to the pilot group" → See Section 2
- "User can't see the workspace!" → See Troubleshooting Issue #2
- "What role should store managers have?" → See Role Management section

---

### **4. TEST-DATA-STRATEGY.md**
**For:** QA + Dev Team (Testing & Data Management)  
**Length:** 10 KB  
**Use When:** Need to set up test data, refresh between sprints, test edge cases  
**Key Sections:**
- Initial Pilot Data Set (Week 1): products, families, pricing, stock
  - 3-4 ProductFamilies
  - 10-15 ProductVariants (realistic SKUs)
  - ~275 units initial stock (~$190 cost)
- Data Refresh Procedures
  - Partial reset (between sprints; keep products, reset sales)
  - Full reset (clean slate; start over)
- Scenario-Specific Data
  - Oversale test (strictly open sales validation)
  - LastSellUnitPrice toggle behavior
  - Quick actions availability override
  - Multi-workspace isolation
- Performance Test Data (50-product catalog; 500+ sales)
- Backup & Restore Procedures

**Real-World Example:**
- "We finished Week 1 testing; how do we reset?" → See Partial Reset procedure
- "I need to test the oversale scenario" → See Scenario 1 setup
- "Performance test data for Phase E?" → See Performance Test Data section

---

### **5. PHASE-A-LAUNCH-CHECKLIST.md**
**For:** Dev Team + Tech Lead (Build & Deployment)  
**Length:** 11 KB  
**Duration:** 3.5 hours total (parallel execution possible)  
**Key Sections:**
- Pre-Kickoff Verification (1.5 hours planning)
- Canvas App Setup (env var integration, gblWorkspaceId)
- Component Validation (input/output contracts)
- Table & Flow Integration
- Publishing & Deployment
- Phase A Day 1 Sign-Off

**How to Use:**
1. Tech Lead reads all ADRs first (ADR-030, 031, 032)
2. Dev team executes sections 2-4 in parallel where possible
3. QA verifies app + workspace scoping
4. Get all sign-offs at bottom
5. Deploy app to pilot users

**Critical Verification:** Workspace scoping (ADR-022)
- Every query must filter by: `WHERE Workspace.WorkspaceId = gblWorkspaceId`
- Code review must confirm no cross-workspace data leaks

---

### **6. GO-NO-GO-VALIDATION.md**
**For:** Stakeholders + Approval Gate (Formal Sign-Off)  
**Length:** 12 KB  
**When:** EOD 2026-04-08, before pilot users get access  
**Key Sections:**
- TIER 1 Blockers (all must pass)
  - Access & admin permissions
  - Environment variable created
  - Test workspace + users seeded
  - App published + scoping enforced
  - Smoke tests passed
- TIER 2 High-Priority (should pass)
  - Component contracts validated
  - ADRs understood by team
- TIER 3 Documentation (all playbooks exist)
- Sign-Off Matrix (Tech Lead, Admin, QA, PM must approve)
- Rollback Plan (if NO-GO before launch)

**How to Use:**
1. Tech Lead collects sign-offs from Admin, QA, Dev
2. Review all TIER 1 items (no exceptions)
3. Document any TIER 2 deferrals (with justification)
4. PM (Sergio) makes final GO/NO-GO decision
5. File signed document in project archive

**Decision Framework:**
- ✅ GO: Proceed to launch (all TIER 1 + TIER 2 pass)
- ⚠️ CONDITIONAL GO: Proceed with documented deferrals (TIER 1 pass; TIER 2 minor deferrals)
- ❌ NO-GO: Defer launch (any TIER 1 blocker fails)

---

### **7. SETUP-REFERENCE.md**
**For:** Admin + Dev Team (Configuration Reference)  
**Length:** 10 KB  
**When:** Admin fills in during PRE-FLIGHT execution; hands to Dev Team  
**Key Sections:**
- Section 1: Dataverse instance details (URL, region, admin)
- Section 2: Workspace identification (ID, partition key)
- Section 3: Solution info (Retail.Core v1.0.0)
- Section 4: Admin user details
- Section 5: Pilot user group (15-20 names)
- Section 6: ProductFamily records
- Section 7: ProductVariant records (all SKU IDs)
- Section 8: Initial purchases & stock
- Section 9: Canvas app details
- Section 10: Workspace settings
- Section 11: Quick reference (copy-paste values)
- Section 12-13: Sign-offs + handoff + emergency reference

**How to Use:**
1. Admin prints or opens on screen
2. Fills in all 13 sections during PRE-FLIGHT execution
3. Hands to Dev Team AM of 2026-04-08
4. Dev Team references Section 2 (WorkspaceId) + Section 11 (URLs)
5. All subsequent team members can quick-lookup values from Section 11

**Example Quick Reference (from Admin to Dev Team):**
```
WORKSPACE ID (gblWorkspaceId):
550e8400-e29b-41d4-a716-446655440000

DATAVERSE URL:
https://yourcompany.crm.dynamics.com

PRODUCT IDs (for testing):
Bananas: bca12345-...
Milk: def67890-...
Juice: ghi11111-...
```

---

## 🗂️ Related Documentation (Already Exists)

**These were reviewed during pre-flight and are referenced by the deliverables:**

- [ADR-030: Workspace Onboarding & Environment Config (v1)](docs/adr/ADR-030-workspace-onboarding-and-environment-config-v1.md)
- [ADR-031: Sales Flow & Price Management (v1)](docs/adr/ADR-031-sales-flow-and-price-management-v1.md)
- [ADR-032: Quick Actions & Availability Overrides (v1)](docs/adr/ADR-032-quick-actions-and-availability-overrides-v1.md)
- [ISS-025 Clarification: Single DEV Environment (Env Vars → Phase 2 Conn Refs)](issues/ISS-025-CLARIFICATION-SingleDevEnvironment.md)
- [DECISIONS_SUMMARY.md](issues/DECISIONS_SUMMARY.md)
- [ISSUES_TRACKER.md](issues/ISSUES_TRACKER.md)

---

## 🎯 Quick Start: Role-Based Reading Guide

### **If you're the Admin:**
1. **Read:** PHASE-A-EXECUTION-SUMMARY.md (overview)
2. **Execute:** PRE-FLIGHT-CHECKLIST.md (start to finish)
3. **Fill:** SETUP-REFERENCE.md (capture all IDs)
4. **Keep:** ADMIN-PLAYBOOK-v1.md (for ops)
5. **Sign:** GO-NO-GO-VALIDATION.md (bottom section)

### **If you're the Dev Team:**
1. **Read:** PHASE-A-EXECUTION-SUMMARY.md (overview + timeline)
2. **Review:** ADRs (030, 031, 032) — understand constraints
3. **Execute:** PHASE-A-LAUNCH-CHECKLIST.md (build + publish)
4. **Reference:** SETUP-REFERENCE.md (WorkspaceId, env var, SKU IDs)
5. **Sign:** GO-NO-GO-VALIDATION.md (final approval)

### **If you're QA:**
1. **Read:** PHASE-A-EXECUTION-SUMMARY.md (overview)
2. **Study:** TEST-DATA-STRATEGY.md (pilot data set)
3. **Execute:** PHASE-A-LAUNCH-CHECKLIST.md (smoking tests section)
4. **Reference:** SETUP-REFERENCE.md (product IDs for test scenarios)
5. **Sign:** GO-NO-GO-VALIDATION.md (QA section)

### **If you're the PM (Sergio):**
1. **Read:** PHASE-A-EXECUTION-SUMMARY.md (high-level overview)
2. **Collect:** Sign-offs from Tech Lead, Admin, QA
3. **Review:** GO-NO-GO-VALIDATION.md (Tier 1 + 2 checklist)
4. **Decide:** GO or NO-GO (sign-off matrix)
5. **Communicate:** Launch email to pilot users (if GO)

### **If you're an Exec / Stakeholder:**
1. **Read:** PHASE-A-EXECUTION-SUMMARY.md (quick summary)
2. **Review:** GO-NO-GO-VALIDATION.md (approval gate + risks)

---

## 🔄 Execution Flow (Visual)

```
2026-04-07 (TODAY)
    ↓
Admin Executes PRE-FLIGHT-CHECKLIST.md
    ↓
Admin Fills SETUP-REFERENCE.md
    ↓
Admin Hands Off to Dev Team (EOD 2026-04-07)
    ↓
2026-04-08 (TOMORROW)
    ↓
Dev Team Executes PHASE-A-LAUNCH-CHECKLIST.md
    ↓
QA Validates using TEST-DATA-STRATEGY.md
    ↓
Tech Lead Collects Sign-Offs (GO-NO-GO-VALIDATION.md)
    ↓
PM (Sergio) Makes Final GO/NO-GO Decision
    ↓
2026-04-08 EOD: ✅ PHASE A LIVE
    ↓
2026-04-09: Pilot Users Begin (15-20 real users)
```

---

## 📋 Checklist: "Am I Ready?"

Before you start, verify:

```
☐ Have I read PHASE-A-EXECUTION-SUMMARY.md?
☐ Do I know my role? (Admin / Dev / QA / PM)
☐ Have I reviewed the relevant ADRs (030, 031, 032)?
☐ Do I understand the timeline (3.5 hours today + 3.5 hours tomorrow)?
☐ Am I ready to execute (or facilitate execution) of my role's checklist?

IF ALL YES → YOU'RE READY. START WITH YOUR ROLE'S DOCUMENT.
IF ANY NO → READ THE SUMMARY FIRST, THEN COMEBACK TO THIS CHECKLIST.
```

---

## 🔗 File Locations (In This Repo)

All documents are in: `c:\Users\berse\Kabe Imports\RetailerManagementTool\docs\`

```
docs/
├── PRE-FLIGHT-CHECKLIST.md
├── ADMIN-PLAYBOOK-v1.md
├── TEST-DATA-STRATEGY.md
├── PHASE-A-LAUNCH-CHECKLIST.md
├── GO-NO-GO-VALIDATION.md
├── SETUP-REFERENCE.md
├── PHASE-A-EXECUTION-SUMMARY.md (this summary)
├── PHASE-A-DOCUMENTATION-INDEX.md (this file)
├── adr/
│   ├── ADR-030-workspace-onboarding-and-environment-config-v1.md
│   ├── ADR-031-sales-flow-and-price-management-v1.md
│   ├── ADR-032-quick-actions-and-availability-overrides-v1.md
│   └── ... (other ADRs)
└── ... (other docs)
```

---

## 💡 Pro Tips

1. **Print the summary** — Keep PHASE-A-EXECUTION-SUMMARY.md printed or on your phone during execution
2. **Share the index** — Forward this document (PHASE-A-DOCUMENTATION-INDEX.md) to your team so everyone knows where to find what
3. **Use the quick ref** — SETUP-REFERENCE.md Section 11 has copy-paste values; bookmark it
4. **Track sign-offs** — Use GO-NO-GO-VALIDATION.md as formal approvals (archive when signed)
5. **Keep backups** — Save copies of all executed checklists (PRE-FLIGHT + PHASE-A-LAUNCH) for post-pilot review

---

## ✅ Success Criteria

You'll know Phase A is unblocked when:

```
✅ ADMIN completes PRE-FLIGHT-CHECKLIST.md + SETUP-REFERENCE.md (today EOD)
✅ DEV TEAM completes PHASE-A-LAUNCH-CHECKLIST.md + signs off (tomorrow ~noon)
✅ QA validates smoke tests + signs off (tomorrow ~3 PM)
✅ PM (SERGIO) reviews GO-NO-GO-VALIDATION.md + makes GO decision (tomorrow 5 PM)
✅ APP goes live to 15-20 pilot users (tomorrow ~6 PM)
✅ Pilot users begin real usage (next day 2026-04-09)
```

---

## 📞 Questions?

**"Which document should I read?"** → See **Role-Based Reading Guide** above  
**"What's the timeline?"** → See **2-Day Execution Sequence** in PHASE-A-EXECUTION-SUMMARY.md  
**"Am I ready to start?"** → Use the **Checklist: Am I Ready?** section  
**"Where do I find the Workspace ID?"** → SETUP-REFERENCE.md Section 2  
**"How do I onboard a new pilot user?"** → ADMIN-PLAYBOOK-v1.md Section 2  

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-04-07 | Tech Lead | Initial index + navigation guide |

---

**Last Updated:** 2026-04-07, EOD  
**Status:** ✅ COMPLETE & READY FOR PHASE A EXECUTION  
**Next Document To Open:** *Depends on your role — See Quick Start guide above*
