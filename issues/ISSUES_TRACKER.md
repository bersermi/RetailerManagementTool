# Retail Management Tool — Issues Tracker

**Version:** 1.0  
**Last Updated:** 2026-04-03  
**Status:** Active — Vertical 1 Pre-Implementation  

---

## Tracking Format & Resolution Workflow

### Issue Lifecycle
1. **Identified** → Logged with context and impact
2. **Discussed** → Stakeholder review; decision recommended
3. **Resolved** → Decision recorded; may produce ADR
4. **Verified** → Closure confirmed in Vertical 1 code review

### Severity Levels
- **CRITICAL** — Blocks Vertical 1 shipping; must resolve before code
- **HIGH** — Affects Vertical 1 UX/correctness; strongly recommended resolution
- **MEDIUM** — Affects clarity or Vertical 2+; can defer with documented reasoning
- **LOW** — Documentation/polish; can defer

### Resolution Types
- **ADR** — Becomes an Architecture Decision Record (append to ADR docs)
- **DECISION** — Quick decision recorded in this tracker
- **DEFERRED** — Pushed to Vertical 2 with explicit rationale
- **NO-ISSUE** — Clarification shows no action needed

---

## Issues List

| ID | Title | Severity | Category | Status | Assignee | Impact | Notes |
|--|--|--|--|--|--|--|--|
| ISS-001 | No end-to-end data flow diagram | HIGH | Architecture | Identified | Tech Lead | Dev clarity | Create swimlane: Purchase → StockBatch → Sale → Decrement |
| ISS-002 | InventoryEvent flow incomplete | CRITICAL | Core Logic | Identified | Tech Lead | Blocks waste/adjustments | Define: who triggers Finalize? Async or sync flow? UI location? |
| ISS-003 | Quick actions → availability logic undefined | CRITICAL | UX/Flows | **RESOLVED** | Product + Dev | Blocks sell screen | **DECISION A (Optional FE-only):** Optional feature toggle. Store owner control over worker sell permissions. Front-end only; no backend. Limited impl. |
| ISS-004 | Collection rebuild pattern not specified | HIGH | App Logic | **TESTING** | Tech Lead | Cart state bugs | **DECISION: Test & Decide Later.** Build V1 with pattern; measure performance. Goal: freshest data vs performance trade-off. Implement; compare patterns. |
| ISS-005 | Cart expansion/collapse UX missing from contract | HIGH | Components | Identified | UI/Product | Blocks cart panels | cmpCartBottomBar ↔ cmpCartPanel interaction sequence needed |
| ISS-006 | Search-first UX not detailed in flows | MEDIUM | Screens | Identified | Product | Affects Vertical 1+ | Design: "Search before create" UX step-by-step (screens/flows) |
| ISS-007 | Workspace onboarding undefined | HIGH | Onboarding | **RESOLVED** | Tech Lead | Blocks Home screen | **DECISION A (Admin-created):** Pilot user approach; setup during onboarding. Self-service deferred. Struct must tie up; infra/tools in place. |
| ISS-008 | Price override reset logic not detailed | LOW | Business Logic | Identified | Dev | Cart correctness | When/where do transaction-time price overrides reset? |
| ISS-009 | cmpQtyStepper schema not specified | CRITICAL | Components | Identified | UI Dev | Blocks purchase/sale | Inputs: Value, Min, Max, StepSize, AllowDecimals, Label, ReadOnly; OnChange event |
| ISS-010 | cmpMoneyInput contract undefined | CRITICAL | Components | Identified | UI Dev | Blocks purchase/sale | Inputs: Value, CurrencySymbol, ReadOnly, Label; OnChange, OnBlur events; validation rules |
| ISS-011 | Cart BottomBar +Panel coordination missing | MEDIUM | Components | Identified | UI/Dev | Deferred | How do components sync state? ResetNonce pattern not clear |
| ISS-012 | cmpQuickActionsSheet breakpoint not constant | MEDIUM | Components | Identified | UI Dev | Mobile UX | Define Min(Width,Height) breakpoint constant in app |
| ISS-013 | Component "no data" state undefined | MEDIUM | Components | Identified | UI Dev | Edge cases | Galleries with zero rows, empty catalogs, zero balance—define UX |
| ISS-014 | Sale completion stock decrement timing | CRITICAL | Core Logic | ✅ **RESOLVED** | Tech Lead | Sale flow | **DECISION (Strictly Open; No Validation/Flagging/Events):** Accept all sales without inventory check. NO validation. NO flagging oversales. NO Pending events in v1. Pure transaction recording; timestamps enable post-hoc analysis. Focus: Record sales + waste accurately. Notifications designed AFTER pilot data collected. Analysis via timestamps (purchases vs sales). Implementation: ~85 min (simple, fast entry). See `ISS-014-CLARIFICATION-StrictlyOpenApproach.md`. |
| ISS-015 | Shortage handling flow undefined | HIGH | Flows | Identified | Flow Dev | Error cases | Does sale shortage auto-create Pending InventoryEvent or block sale? |
| ISS-016 | Availability override state persistence | MEDIUM | Database | Identified | Tech Lead | Expiry/status | Override time-based (Start/End) or manual toggle? Polling logic? |
| ISS-017 | LastSellUnitPrice update timing | CRITICAL | Flows | ✅ **RESOLVED** | Tech Lead | Data consistency | **DECISION (Workspace Settings Toggle v1):** New WorkspaceSetting table; toggle applies workspace-wide to all products uniformly. When enabled, price persists per product. When disabled, no persistence. All users in workspace see same behavior. NO delta display; NO timer (deferred v1.1). Implementation: ~1.5 hours. See `ISS-017-CLARIFICATION-WorkspaceSettingsToggle.md`. |
| ISS-018 | InventoryEvent strategy field missing | MEDIUM | Database | Identified | DV Admin | Event logic | Event should specify batch vs FIFO decrement strategy; no field defined |
| ISS-019 | Product import workflow undefined | MEDIUM | UX/Flows | Identified | Product | Bulk/selective import scenario | Wizard, toggle filter, or multi-select? Step-by-step UX missing |
| ISS-020 | App startup initialization sequence missing | CRITICAL | App Logic | Identified | Tech Lead | Blocks Home screen | gblWorkspaceId set how? No WorkspaceMember error state? |
| ISS-021 | Error handling & retry strategy undefined | HIGH | App Logic | Identified | Tech Lead | Network resilience | Patch timeout → auto-retry or user manual? Exponential backoff? |
| ISS-022 | Security role enforcement in app undefined | MEDIUM | Security | **RESOLVED** | Tech Lead | Authorization | **DECISION C (NO ISSUE v1):** Users well-limited; no role differentiation needed now. Defer role-based UI/perms. Confirmed safe for V1. |
| ISS-023 | Workspace scoping code checklist missing | HIGH | Code Quality | Identified | Tech Lead | Data isolation | Create automated check: every query filters by workspace |
| ISS-024 | No ADR for first-vertical specific decisions | HIGH | Documentation | Identified | Tech Lead | Future reference | Workspace onboarding, sale shortage, quick action UX → ADRs |
| ISS-025 | Dataverse connection strategy (env vars vs hardcoded) | MEDIUM | DevOps | ✅ **RESOLVED** | Tech Lead | ALM/Replication | **CONSTRAINT:** Only DEV environment available (capacity limits). Max 15-20 users pilot. **DECISION (Two-Phase):** Phase 1 NOW: Option B (Environment Variables; 20 min setup). Phase 2 LATER (when TEST/PROD available): Upgrade to Option C (Connection References; 30 min migration). Simple NOW; enterprise governance later. Zero technical debt; documented upgrade path. See `ISS-025-CLARIFICATION-SingleDevEnvironment.md`. |
| ISS-026 | Expiry-null "No Expiry" UX not specified | LOW | UX | **RESOLVED** | UI Dev | Gallery display | **DECISION B (Spanish context):** Show "Sin vencimiento" ("No expiry" in Spanish). Plan language expansion later. Update UI strings. |
| ISS-027 | WorkspaceMember Primary Name limitation not addressed | MEDIUM | Database | Identified | DV Admin | Schema | Primary Name = text (not lookup); workaround or accept? |
| ISS-028 | Normalized name flow triggers undefined | MEDIUM | Flows | Identified | Flow Dev | Data consistency | When does normalization run? Create/update? All tables or subset? |
| ISS-029 | FIFO logic not specified for stock decrement | HIGH | Core Logic | Identified | Tech Lead | Inventory correctness | FIFO across batches of same product or date-based? Index strategy? |
| ISS-030 | No "happy path" user journey documented | MEDIUM | Documentation | Identified | Tech Lead | Dev reference | Single end-to-end example (Purchase → Stock → Sale) missing |

---

## Resolution Board

### Ready for Decision
- **ISS-007** (Workspace onboarding) → Decision: A/B/C options in assessment
- **ISS-014** (Sale shortage) → Decision: A/B/C options in assessment
- **ISS-004** (Collection rebuild) → Decision: A/B/C options in assessment
- **ISS-003** (Quick actions timing) → Decision: A/B/C options in assessment
- **ISS-017** (LastSellUnitPrice) → Decision: A/B options in assessment
- **ISS-022** (Role enforcement) → Decision: A/B/C options in assessment
- **ISS-025** (Env vars) → Decision: A/B/C options in assessment
- **ISS-026** (No Expiry UX) → Decision: A/B/C options in assessment

### Awaiting Clarification
- **ISS-002** (InventoryEvent flow) → Needs flow diagram from tech lead
- **ISS-006** (Search-first UX) → Needs product scope clarity
- **ISS-015** (Shortage handling) → Depends on ISS-014 decision
- **ISS-018** (Event strategy field) → Depends on ISS-002 clarification

### Assigned for Detail Design
- **ISS-009, ISS-010** (Component specs) → UI Dev (assigned to Vertical 1 Phase C)
- **ISS-020** (Startup sequence) → Tech Lead (assigned to Vertical 1 Phase D)
- **ISS-029** (FIFO logic) → Tech Lead + DV Admin (DB index design)

### Deferred (Soft Block on Vertical 2)
- **ISS-005** (Cart panel UX) → Deferred to Vertical 2 (Sale)
- **ISS-006** (Search-first UX) → Deferred to Vertical 2 (provider catalog setup)
- **ISS-008** (Price override reset) → Deferred to Vertical 2 (Sale)
- **ISS-011, ISS-012, ISS-013** (Component edge cases) → Deferred to polish phase

### Documentation
- **ISS-001** (Flow diagram) → Create as supporting doc (swimlane diagram)
- **ISS-023** (Scoping checklist) → Add to ADR-022 or create new ADR
- **ISS-024** (New ADRs) → Create: ADR-030 (Workspace onboarding), ADR-031 (Sale flow), ADR-032 (Quick actions)
- **ISS-030** (Happy path) → Append to initContext.md or create new example doc

---

## Decision Tracking

| Issue ID | Decision | Date | Owner | ADR/Note |
|--|--|--|--|--|
| ISS-009 | Component spec: See screen contracts below | Pending | UI Dev | Phase C deliverable |
| ISS-010 | Component spec: See screen contracts below | Pending | UI Dev | Phase C deliverable |
| ISS-020 | Home screen: Workspace init pattern | Pending | Tech Lead | Design phase |
| ISS-003 | Quick actions: [WAITING FOR STAKEHOLDER INPUT] | — | Product | Decision: A/B/C |
| ISS-007 | Workspace onboarding: [WAITING FOR STAKEHOLDER INPUT] | — | Product | Decision: A/B/C |
| ISS-014 | Sale shortage: [WAITING FOR STAKEHOLDER INPUT] | — | Product | Decision: A/B/C |

---

## Next Actions

- [ ] **Stakeholder Sync (1–2h):** Confirm decisions on ISS-003, ISS-007, ISS-014, ISS-017, ISS-022, ISS-025, ISS-026
- [ ] **Tech Lead:** Create flow diagram (ISS-001); detail InventoryEvent flow (ISS-002); design FIFO logic (ISS-029)
- [ ] **UI Dev:** Finalize cmpQtyStepper & cmpMoneyInput contracts (ISS-009, ISS-010)
- [ ] **DV Admin:** Address WorkspaceMember Primary Name issue (ISS-027); design name normalization triggers (ISS-028)
- [ ] **Update ADRs:** Create ADR-030, ADR-031, ADR-032 based on decisions above
- [ ] **Code Review Prep:** Update ADR-022 with scoping checklist (ISS-023)

---

**Tracker Revision History:**
- v1.0 (2026-04-03): Initial issues harvest from assessment phase
