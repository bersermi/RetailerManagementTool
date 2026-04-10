# ADR-033: Workspace Settings - Typed Columns vs. Key-Value Store

- **Status:** Accepted
- **Date:** 2026-04-10
- **Decision makers:** Sergio
- **Related to:** ISS-017 (Workspace Settings Toggle), ADR-031 (Sales Flow & Price Management)

---

## Context / Problem

Phase A requires a workspace-level settings mechanism to store configuration like `UseLastSellUnitPrice` toggle (from ISS-017). Two architectural approaches emerged:

1. **Key-Value Store Pattern** (flexible, EAV-style):
   - Single `WorkspaceSetting` table with columns: `Workspace (FK)`, `SettingKey (text)`, `SettingValue (text)`
   - New settings added by inserting rows (no schema changes)
   - Values stored as strings; parsed at application layer

2. **Typed Columns Pattern** (rigid, relational):
   - Single `WorkspaceSetting` table with columns: `Workspace (FK)`, `UseLastSellUnitPrice (bool)`, `NotificationLevel (int)`, etc.
   - New settings added by ALTER TABLE (requires schema change)
   - Native column types (bool, int, datetime); no parsing needed

**Challenge:** Choose an approach that balances flexibility, type safety, SQL migration readiness, and app simplicity for a pilot with ~5-10 known settings and future growth to 10-15 settings.

---

## Decision

**Adopt the Typed Columns approach for WorkspaceSetting table.**

Schema:

```sql
CREATE TABLE WorkspaceSetting (
  WorkspaceSettingId GUID PRIMARY KEY DEFAULT NEWID(),
  Workspace GUID FOREIGN KEY NOT NULL,           -- FK to Workspace
  UseLastSellUnitPrice BIT NOT NULL DEFAULT 1,  -- v1: Sales price persistence toggle
  NotificationLevel INT DEFAULT 2,               -- v1.1+: Notification tier (reserve for future)
  PriceRoundingDecimals INT DEFAULT 2,          -- v1.2+: Decimal precision for prices (reserve)
  CreatedOn DATETIME DEFAULT GETDATE(),
  ModifiedOn DATETIME,
  
  CONSTRAINT FK_WorkspaceSetting_Workspace FOREIGN KEY (Workspace) REFERENCES Workspace(WorkspaceId),
  CONSTRAINT UQ_WorkspaceSetting_Workspace UNIQUE (Workspace)
);
```

**In Power Apps (Dataverse):**

- Column: `UseLastSellUnitPrice` (Boolean, default: true)
- Future columns: `NotificationLevel`, `PriceRoundingDecimals` (as needed per ADR, not all at launch)
- Unique constraint: One settings record per Workspace

---

## Rationale

### Advantages of Typed Columns (Why We Choose This)

| Aspect | Benefit |
|--------|---------|
| **Type Safety** | Boolean/Int fields vs. string parsing; compiler catches type errors early |
| **SQL Migration** | Phase B migration: Direct 1:1 column mapping; no need to pivot key-value data |
| **App Logic** | `if (setting.UseLastSellUnitPrice)` vs. `if (settingValue == "true")`; cleaner, faster execution |
| **Performance** | Single row lookup by Workspace FK + direct column read; no key comparison loop |
| **Database Constraints** | NOT NULL, CHECK, computed columns, triggers all available at DB layer |
| **Self-Documenting** | Reading schema immediately shows: "These are the workspace settings we support" |
| **Future Growth** | For pilot + v1.x (~5-10 settings): ALTER TABLE 1-2x is acceptable burden vs. flexibility overhead |

### Disadvantages of Typed Columns (Acceptable Tradeoffs)

| Tradeoff | Cost |
|----------|------|
| **Schema Rigidity** | Each new setting requires ALTER TABLE (acceptable; settings don't change weekly; planned at sprint start) |
| **Sparse Columns** | All settings exist in every record (even if unused for some workspaces); mitigated by defaults + nullable design |
| **Schema Review** | Admin cannot add settings via SQL INSERT; must follow ALM process (good governance; prevents ad-hoc proliferation) |

### Why NOT Key-Value Store?

| Decision Factor | Impact |
|---|---|
| **String Parsing** | Every app read: `if (settingValue == "true")` → inefficient; type errors at runtime, not compile-time |
| **SQL Migration** | Phase B requires denormalization logic: `PIVOT` or application code to transform key-value rows to columns (extra work; fragile) |
| **Constraint Validation** | Cannot enforce `UseLastSellUnitPrice ∈ {0, 1}` at DB layer; must validate in app (more code; more bugs) |
| **Performance** | Lookup by composite key (Workspace, SettingKey); then string comparison; scales poorly if 100+ workspaces |
| **Scope Creep** | KEY-VALUE flexibility tempts unplanned settings; typed columns force discipline (necessary for audit/compliance) |

**Verdict:** For a controlled pilot with known settings, key-value is premature flexibility. Typed columns align with relational design + SQL readiness.

---

## Consequences

### Positive

- **App Code:** Power Apps logic is clearer; boolean assignments instead of string parsing
- **Type Safety:** Dataverse enforces data types; prevents "true" vs. "True" vs. "1" bugs
- **SQL Readiness:** Phase B migration is straightforward: `SELECT UseLastSellUnitPrice FROM WorkspaceSetting WHERE Workspace = @workspaceId`
- **Performance:** O(1) lookup by Workspace FK; no secondary search by key
- **Database Enforcement:** Database can guarantee `NOT NULL UseLastSellUnitPrice` and constraint violations caught at DB layer, not app
- **Consistency:** Schema acts as source of truth for what settings exist; no "hidden" settings in data

### Negative / Tradeoffs

- **Schema Evolution:** Adding new setting (e.g., v1.2) requires ALTER TABLE + code deploy (acceptable; planned; not frequent)
- **Pre-Release Design:** All future columns (NotificationLevel, PriceRoundingDecimals) defined upfront; may go unused if v1.2+ never ships
- **Workspace Onboarding:** When new workspace created, must either:
  - Trigger AUTO-INSERT of default WorkspaceSetting row (via flow, function, or script)
  - OR leave INSERT to first-access in app (risk: multiple writes if race condition)
- **Settings Discovery:** Dev cannot query "which settings exist in the system?" from schema itself; must write SELECT + column enumeration in docs

---

## Alternatives Considered

### Alternative 1: Key-Value Store (EAV Pattern)
```sql
CREATE TABLE WorkspaceSetting (
  WorkspaceSettingId GUID PRIMARY KEY,
  Workspace GUID FK,
  SettingKey NVARCHAR(100),     -- "UseLastSellUnitPrice", "NotificationLevel", etc.
  SettingValue NVARCHAR(MAX),   -- "true", "2", "2.5", etc.
  UNIQUE (Workspace, SettingKey)
);
```

**Pros:**
- Adds new settings without schema changes (INSERT rows)
- Scales to 50+ settings without ALTER TABLE

**Cons:**
- String parsing overhead in app
- Type validation only at app layer
- SQL migration requires PIVOT or ETL step
- No DB-level constraints (validity checks, ranges)
- Performance: Composite key lookup + string comparison

**Verdict:** Over-flexible for pilot scope; deferred to Phase B+ if settings proliferate beyond 15.

### Alternative 2: Hybrid (Typed + EAV)
```sql
-- Core typed settings
CREATE TABLE WorkspaceSetting (Workspace, UseLastSellUnitPrice, NotificationLevel, ...);

-- Extension table for custom/experimental settings
CREATE TABLE WorkspaceSettingExtension (Workspace, SettingKey, SettingValue);
```

**Pros:** Separates core (typed) from experimental (EAV)

**Cons:** Schema complexity; duplication of Workspace FK; confusing app logic (if-else checks which table)

**Verdict:** Premature optimization; rejected.

---

## Implementation Plan

### Phase A Launch (April 2026)

1. **Dataverse Schema:**
   - Create `WorkspaceSetting` table with columns: `Workspace (FK)`, `UseLastSellUnitPrice (bit)`, `CreatedOn`, `ModifiedOn`
   - Alternate key: `Workspace` (one record per workspace)
   - Default: `UseLastSellUnitPrice = 1` (ON by default, safer for pilot)

2. **Workspace Onboarding:**
   - When new workspace created: Trigger Power Automate flow to INSERT default `WorkspaceSetting` row
   - OR: Manual INSERT via PowerShell script after workspace creation

3. **Power Apps Logic:**
   - Settings Screen (V1-04): Bind toggle to `WorkspaceSetting.UseLastSellUnitPrice` (boolean property)
   - Buy Screen (V1-02): Read `gblUseLastSellUnitPrice` (loaded from WorkspaceSetting.UseLastSellUnitPrice on app start)

4. **Testing:**
   - Verify toggle ON/OFF updates WorkspaceSetting.UseLastSellUnitPrice
   - Verify Sale pre-fill respects toggle state
   - Verify multiple workspaces maintain independent settings

### Phase A+ (Post-Pilot Refinement)

5. **Evaluate Pilot Feedback:**
   - Do users want additional workspace settings? (e.g., PriceRoundingDecimals, NotificationLevel)
   - Frequency of requests?

6. **Decision Point (v1.2 Planning):**
   - If **< 3 new settings requested:** Continue typed columns; ALTER TABLE
   - If **> 5 new settings + rapid experimentation:** Consider migration to key-value extension table

### Phase B (SQL Migration, TBD)

7. **SQL Schema:**
   - Dataverse `WorkspaceSetting` table → SQL `WorkspaceSetting` table (direct copy)
   - No transformation needed (already typed, normalized)

---

## Related Decisions

- **ADR-031** (Sales Flow & Price Management v1): Workspace-level toggle governs LastSellUnitPrice persistence
- **ISS-017** (Workspace Settings Toggle): Application logic for toggle UI + data storage
- **ADR-022** (Workspace Scoping in App): Every record filtered by gblWorkspaceId; WorkspaceSetting follows same pattern

---

## Notes

- **Dataverse Considerations:** Power Apps doesn't enforce strong typing like SQL; rely on app logic + column data type (Boolean field) to prevent corruption
- **Auditing:** CreatedOn / ModifiedOn auto-fields track setting changes over time (useful for "when did workspace toggle UseLastSellUnitPrice?")
- **Backup Plan:** If we discover key-value is critical post-pilot, create `WorkspaceSettingExtension` table without breaking existing typed columns
- **Documentation:** Update initContext.md WorkspaceSetting section with schema + field descriptions
