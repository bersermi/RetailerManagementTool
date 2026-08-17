================================================================================
ANALYSIS: ISS-026 - DATAVERSE ODATA LOOKUP BINDING LIMITATIONS
PowerShell Direct API Approach; Decision to Use Manual UI + Power Automate
================================================================================

**Date:** 2026-04-10  
**Status:** ANALYSIS COMPLETE; DECISION MADE  
**Stakeholder:** Sergio (Developer)  
**Request:** Automate Provider creation via PowerShell OData API with workspace FK binding

---

## Issue Summary

**Goal:** Create Provider records programmatically via PowerShell with automatic workspace relationship binding.

**Problem:** Dataverse OData API rejects lookup field binding in Provider creation despite metadata indicating support.

---

## Analysis: Root Cause

### **Entity Schema Details**
- **Table:** crbc0_Provider  
- **Lookup Field:** crbc0_workspace (Type: lookup, single-select)
- **Metadata Flags:**
  - `ValidForCreateApi: 1` ✓ (indicates field is valid during creation)
  - `ValidForUpdateApi: 1` ✓ (field updatable)
  - **BUT:** `<LookupTypes />` is **empty** (metadata exposure issue)

### **Why It Fails**

Despite `ValidForCreateApi: 1`, the OData metadata doesn't expose the lookup as a navigable relationship during record creation. This causes Dataverse's OData deserializer to reject the `@odata.bind` syntax with:

```
Error: "An undeclared property 'crbc0_workspace' which only has property 
annotations in the payload but no property value was found"
```

---

## Attempts Tried

| Approach | Method | Result | Reason Failed |
|----------|--------|--------|---------------|
| **1** | Direct string value: `"crbc0_workspace": "TestWorkspace"` | ❌ Invalid property | Lookup fields require relationship syntax, not strings |
| **2** | Hashtable + `ConvertTo-Json` + `@odata.bind` | ❌ Undeclared property | JSON serialization mangled `@odata.bind` syntax |
| **3** | Manual JSON here-string with `@odata.bind` in POST body | ❌ Undeclared property | Lookup relationship not exposed in OData metadata (LookupTypes empty) |
| **4** | Two-step approach: CREATE then PATCH update | ❌ Resource doesn't support PATCH | Dataverse OData endpoint doesn't support native HTTP PATCH method |
| **5** | POST with `X-HTTP-Method: PATCH` header workaround | ❌ Resource doesn't support PATCH | Header workaround ineffective for this specific endpoint |

---

## Decision

**❌ DO NOT USE:** PowerShell direct OData API for multi-step record creation with lookups

**✅ USE INSTEAD:**

### **For Phase A (Immediate Need)**

**Option 1: Manual Dataverse UI (Recommended)**
- Time: 2-3 minutes per record
- Method: Navigate to Dataverse table → Create record → Fill form → Set relationship via picker
- Why: Zero code, zero API quirks, UI relationship picker is optimized for this
- Example workflow for Provider:
  1. Dataverse → crbc0_Provider table → + New
  2. Fill: Name, Address, Contact, Phone
  3. In "Workspace" lookup field → Search and select workspace
  4. Save

**Option 2: Power Automate Cloud Flow**
- Time: 5 minutes to build flow once; then 30 seconds to run
- Method: "Create a record" action handles relationship binding automatically
- Why: Power Automate's "Add record" action has proper lookup binding; much more reliable than direct OData
- Reusable: Can trigger for bulk operations later
- Recommended flow structure:
  ```
  Trigger: Manual trigger (button in Power Apps)
  Actions:
    1. Create a record (crbc0_Provider)
       - crbc0_name: [input]
       - crbc0_workspace: [select workspace]
       - [other fields]
    Result: Provider created with workspace relationship intact
  ```

### **For Phase B (SQL Migration)**

SQL INSERT statements avoid OData entirely; full control over relationships via direct database writes.

---

## Why NOT to Continue Troubleshooting OData

1. **Dataverse OData is not the primary interface** – it's for read-heavy scenarios
2. **Microsoft's recommendation** for complex writes: Use Power Automate or canvas app Patch operations
3. **Time cost-benefit:** 2 hours debugging API ≠ 3 minutes using UI
4. **Phase B exit strategy:** Direct SQL writes (Zero OData dependency)

---

## Recommendation

**Immediate Action (Phase A):**
- Delete PowerShell scripts attempting OData bind operations
- Create providers manually via Dataverse UI (fastest)
- For future bulk operations: Build Power Automate flow rather than PowerShell script

**Why This Is Practical:**
- Unblocks Vertical 1 development (no more API troubleshooting)
- Establishes pattern: UI for one-off data, Power Automate for bulk/recurring
- Leads naturally to Phase B SQL approach (same hands-on, direct-control mindset)

---

## Implementation Summary

**Files to Delete:**
- `prov-dataverse-scripts/write-providers-mexico.ps1`
- `prov-dataverse-scripts/write-purchase.ps1`
- `prov-dataverse-scripts/write-sale.ps1`
- `prov-dataverse-scripts/write-waste.ps1`
- `prov-dataverse-scripts/write-purchaseline.ps1`
- `prov-dataverse-scripts/write-saleline.ps1`
- `prov-dataverse-scripts/write-wasteline.ps1`

**Files to Keep:**
- `prov-dataverse-scripts/0-template-base.ps1` (reference pattern for simple POST operations without complex lookups)
- `prov-dataverse-scripts/README.md`

**Next Phase A Steps:**
1. Create 2 Provider records manually in Dataverse UI (2 min)
2. Create ProductFamily + ProductVariant records (5 min, UI)
3. Set up test purchases via Power Automate flow or manual UI (10 min)
4. Proceed to Vertical 1 app development (screens, logic)

---

## Lessons Learned

**For Future OData Work:**
- Empty `<LookupTypes />` in Entity.xml = relationship not exposed for creation binding
- Use PATCH via Power Automate "Update record" action, not direct HTTP PATCH
- `ConvertTo-Json` will serialize `@odata.bind` syntax incorrectly; use here-strings
- Manual UI or Power Automate > direct OData for relationship-heavy operations

**Architecture Implication:**
- Confirms design decision: Phase A uses UI/Power Automate; Phase B uses SQL
- Reduces technical debt: No custom PowerShell workarounds to maintain
- Improves maintainability: Team members understand UI-based data setup

---

## Status

✅ **RESOLVED:** Use manual Dataverse UI + Power Automate flows for Phase A data population  
✅ **DECISION RECORDED:** PowerShell OData not viable; practical alternatives documented  
✅ **ACTION ITEMS:** Delete PowerShell scripts; proceed to Phase A vertical development
