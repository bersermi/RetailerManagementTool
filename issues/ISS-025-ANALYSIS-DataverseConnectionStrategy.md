================================================================================
ANALYSIS: ISS-025 - DATAVERSE CONNECTION STRATEGY
================================================================================

**Date:** 2026-04-04  
**Status:** Decision Required  
**Stakeholder:** Sergio  

---

## Context

Vertical 1 needs a connection to Dataverse. Question: Should the connection string/reference be:
- **Hardcoded** in the canvas app during development?
- **Configured via environment variables** from the start?
- **Use connection references** within a Power Platform solution?

This impacts: ALM (lifecycle management), replication (dev/test/prod), and team scaling.

---

## Three Options Compared

### **Option A: Hardcoded Connection (Simplest)**

**How it works:**
```
Canvas App → Direct Dataverse URL embedded in app
             (e.g., "https://myorg.crm.dynamics.com/api/...")
```

**Dev Setup:**
- Dev builds against dev environment
- No configuration needed; just point and play
- Fast to start (zero setup overhead)

**Deployment to Test/Prod:**
- Manual step: Open app in editor → change connection strings → re-publish
- OR: Export app; find-replace URLs; re-import
- Error-prone; easy to deploy to wrong environment

**Scaling Risk:**
- If team grows: who manages which app talks to which environment?
- Audit trail: hard to track which app versions hit which envs
- Accidental prod pushes: no guard rails

**Implications:**
- ✅ **Fastest to start** (best for v1 prototype)
- ✅ No infrastructure setup required
- ❌ **Not replicable** (different orgs/customers need different URLs)
- ❌ **Not repeatable** (manual steps creep in errors)
- ❌ **Risky post-pilot** (production use would be dangerous)

**ALM Score:** 2/10 (Not recommended for anything beyond quick prototyping)

---

### **Option B: Environment Variables (Good)**

**How it works:**
```
Canvas App powered by environment variable
↓
Power Apps Environment Variable: "DataverseURL" = "https://myorg.crm.dynamics.com"
↓
Dataverse
```

**Dev Setup:**
- In DEV environment, create environment variable: `DataverseURL = https://dev-org.crm.dynamics.com`
- In TEST environment, create environment variable: `DataverseURL = https://test-org.crm.dynamics.com`
- In PROD environment, create environment variable: `DataverseURL = https://prod-org.crm.dynamics.com`
- Canvas app references `'DataverseURL'.Value` (not hardcoded)
- Same app file deployed to all environments; variable value changes per env

**Dev Setup Complexity:**
- Slight overhead: must create env var in each Power Apps environment
- One-time per environment setup
- Can be scripted (Power Platform admin center or API)

**Deployment:**
- Export app from DEV (with solution)
- Import to TEST: env var is imported empty → manual set to test URL OR pre-configured
- Import to PROD: same
- OR: Use solution with managed configuration → auto-resolves env var (better)

**Scaling:**
- Hierarchical: Every team member's dev environment has its own URL variable
- Audit trail: All connections logged in Dataverse audit
- Safe: Each environment points to its own data; no cross-env leakage

**Implications:**
- ✅ **Scalable** (supports team growth)
- ✅ **One app file** deployed to multiple envs
- ✅ **Repeatable** (env vars configured consistently)
- ✅ **Audit-friendly** (leverages Dataverse audit)
- ⚠️ **Minor setup overhead** (create env var per environment)
- ⚠️ **Manual var config** (if not using managed solutions)

**ALM Score:** 7/10 (Recommended for managed ALM after pilot)

---

### **Option C: Connection References in Solution (Best)**

**How it works:**
```
Solution (Managed or Unmanaged)
  ├─ Canvas App (references ConnRef_DataverseConnection)
  ├─ Flows (reference ConnRef_DataverseConnection)
  └─ Connection Reference: "ConnRef_DataverseConnection"
       ├─ DEV: Points to dev dataverse instance
       ├─ TEST: Points to test dataverse instance
       └─ PROD: Points to prod dataverse instance
```

**Dev Setup:**
- Create solution in DEV environment
- Add canvas app + any flows to solution
- Create "Connection Reference" (security role + connection type specified)
- App/flows reference the connection ref, not direct URL
- Connection ref is environment-agnostic; points to user's current environment by default

**Deployment:**
- Export solution as **managed solution** (C → prod) or **unmanaged** (C → dev)
- Import to TEST: solution imports; connection ref auto-detects available Dataverse
- Import to PROD: same
- Teams configure connection ref once per environment; it persists
- **No hardcoding anywhere; no env vars needed**

**Scaling:**
- Enterprise-grade: Connection refs are discoverable in audit logs
- Security: Connection references allow role-based access control per reference
- Multi-tenant: If using Option B (Workspace partition), each tenant's workspace is scoped by security roles (not by env var)

**Implications:**
- ✅ **Enterprise standard** (Microsoft recommended)
- ✅ **Zero hardcoding** (full abstraction)
- ✅ **Replicable & repeatable** (solution handles it)
- ✅ **Audit-ready** (connection use is logged)
- ✅ **Security** (role-based; no raw credentials)
- ⚠️ **Slight complexity** (setup solution + connection ref upfront)
- ⚠️ **Learning curve** (new team members must understand connection refs)

**ALM Score:** 9/10 (Best practice for scalable, secure ALM)

---

## Comparison Table

| Aspect | A: Hardcoded | B: Env Vars | C: Connection Refs |
|--------|------|---------|--------|
| **Setup time** | 5 min | 15 min | 30 min |
| **Deployment effort** | Manual (risky) | Semi-auto (safe) | Fully integrated |
| **Audit trail** | None | App-level | Solution-level |
| **Scaling to 10 devs** | Chaos | Manageable | Controlled |
| **Scaling to prod** | Dangerous | Safe | Secure + Audited |
| **Cost** | Free | Free | Free (built-in) |
| **MSFTrecommendation** | ❌ | ✅ | ✅✅✅ |
| **v1 Pilot** | ✅ OK | ✅ Better | ✅✅ Best |
| **Post-Pilot Prod** | ❌ | ✅ | ✅✅✅ |

---

## Recommendation

### **For Vertical 1 (Pilot):**

**Start with Option C (Connection References)** with this rationale:

1. **Minimal extra effort** (30 min setup) buys you repeatable ALM infrastructure for future verticals
2. **Zero hardcoding** from the start is a good habit; prevents "technical debt" later
3. **Solution-based** approach aligns with ADR-021 (solution-first ALM)
4. **No refactoring needed** later; if you use Option A, v1.1 requires rework (costs more)
5. **Pilot replication** becomes trivial: export solution from DEV → import to TEST → set connection ref once → done

### **If you want dead-simple prototype (Option A):**

**Only if:**
- This is throwaway prototype (won't be used post-pilot)
- You plan to refactor before v1.1

**Then migrate to Option C before shipping to production.**

### **Why NOT Option B (Env Vars only):**

- Env vars work fine, but they don't integrate with the solution export framework
- You'd still need manual steps on import (set env var value)
- Connection References are purpose-built for this; superior abstraction

---

## Technical Setup for Option C (Step-by-Step)

### Step 1: Create Solution in DEV
```
Power Apps Admin Center
  → Solutions
  → "New Solution"
    Name: "Retail.Core"
    Display Name: "Retail Management Tool - Core"
    Publisher: Your org
```

### Step 2: Add Canvas App to Solution
```
Solution "Retail.Core"
  → Add Existing
    → Apps (Canvas)
    → Select "Tienda" (your app)
```

### Step 3: Create Connection Reference
```
Solution "Retail.Core"
  → New
    → Automation
    → Connection Reference
      Name: "ConnRef_Dataverse"
      Connector: "Dataverse"
      (Leave connection blank for now)
```

### Step 4: Update Canvas App to Use Reference
```
Canvas App Formula Bar:
  OLD: "https://myorg.crm.dynamics.com/api/..."
  NEW: 'ConnRef_DataverseConnection'.Value
       (or via connector reference in Power Fx)
```

### Step 5: Export Solution
```
Solution "Retail.Core"
  → Tools
    → Import/Export
    → Export
      → Managed (for TEST/PROD) 
         OR Unmanaged (for DEV branches)
```

### Step 6: Import to TEST/PROD
```
TEST Environment
  → Solutions
    → Import "Retail.Core_managed.zip"
      → Map Connection Reference to TEST Dataverse connection
      → Complete
```

---

## Implementation Timeline

| Timeline | Action | Owner |
|---|---|---|
| **Today (Vertical 1 Phase A)** | Set up solution + connection ref in DEV | DV Admin |
| **Phase A (Day 1)** | Add canvas app to solution | DV Admin |
| **Phase D (Day 6)** | Verify app uses connection ref (test export) | Dev |
| **Phase E (Day 10)** | Test solution import to TEST env | QA |
| **Post-V1** | Document connection ref setup; add to playbook | Tech Lead |

---

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Connection ref misconfigured (points to wrong env) | Test solution import before declaring done |
| Team member forgets to set connection ref after import | Document in onboarding checklist |
| Hardcoded URLs lingering in flows | Code review: grep for "crm.dynamics.com" |
| Multiple connection refs by accident | Naming convention: `ConnRef_DataverseSystemOfRecord` |

---

## Conclusion

**Use Option C (Connection References) from the start.**

- Minimal extra setup cost
- Aligns with solution-first ALM (ADR-021)
- Zero hardcoding from the beginning
- Enables replication to TEST/PROD without refactoring
- Supports team scaling and audit requirements for post-pilot

**If you want to sprint on Vertical 1 logic with zero infrastructure delay:**
- Use Option A (hardcoded) for today's sprint
- Migrate to Option C before Phase E completion
- **Cost:** 30 min refactor; much cheaper than doing it in Vertical 2

---

**Recommendation:** **Option C + timeline** (setup in Phase A Day 1; test in Phase E)

