# Retail Management Tool (Tienda)

A Power Platform Canvas App for small retail operators to manage purchases, sales, products, providers, waste, and analytics — backed by Dataverse, targeting React Native + Supabase post-alpha.

## Overview

Tienda is a multi-tenant retail operations app built for a 15–20 user pilot. It uses Dataverse as the source of truth and a Canvas App as the UI. Each user belongs to exactly one workspace; all data is isolated by workspace partition key (`gblWorkspaceId`).

**Current status:** Alpha in progress — Comprar (V1) complete, 6 modules remaining.

## Technology Stack

| Layer | Current | Post-Alpha Target |
|-------|---------|------------------|
| UI | Power Apps Canvas App | React Native (Expo) |
| Data | Microsoft Dataverse | Supabase (PostgreSQL) |
| Auth | Power Platform | Supabase Auth |
| Automation | Power Automate | Supabase Edge Functions |

See [docs/migration/MIGRATION-BRIEF.md](docs/migration/MIGRATION-BRIEF.md) for the full migration plan.

## App Modules

| Module | Screen | Status |
|--------|--------|--------|
| Comprar (Purchase Entry) | scrComprar | ✅ Complete |
| Vender (Sales Entry) | scrVender | 🔲 Next |
| Productos (Product CRUD) | scrProductos | 🔲 |
| Proveedores (Provider CRUD) | scrProveedores | 🔲 |
| Desperdicio (Waste Recording) | scrDesperdicio | 🔲 |
| Numeros (Simple Analytics) | scrNumeros | 🔲 |
| Opciones (User Settings) | scrOpciones | 🔲 |

See [docs/alpha/ALPHA-SCOPE.md](docs/alpha/ALPHA-SCOPE.md) for module descriptions, dependencies, and alpha exit criteria.

## Project Structure

```
RetailerManagementTool/
├── README.md
├── DataverseExports.txt              # pac CLI export/unpack commands
│
├── docs/
│   ├── initContext.md                # Original project brief and requirements
│   ├── SETUP-REFERENCE.md           # Environment setup reference
│   │
│   ├── alpha/                        # Alpha milestone documentation
│   │   ├── ALPHA-SCOPE.md           # 7 modules, status, exit criteria, build order
│   │   └── TECHNICAL-REFERENCE.md   # Confirmed display names, component contracts, formulas
│   │
│   ├── migration/                    # Post-alpha migration planning
│   │   └── MIGRATION-BRIEF.md       # React Native + Supabase target, equivalence map
│   │
│   ├── adr/                          # Architecture Decision Records (34 decisions)
│   │   ├── ADR-001 … ADR-029        # Foundation decisions (data model, UX, components)
│   │   ├── ADR-030-workspace-onboarding-and-environment-config-v1.md
│   │   ├── ADR-031-sales-flow-and-price-management-v1.md
│   │   ├── ADR-032-quick-actions-and-availability-overrides-v1.md
│   │   ├── ADR-033-workspace-settings-typed-columns.md
│   │   └── ADR-034-hybrid-provider-pricing-model.md
│   │
│   ├── components/                   # Canvas component YAML specs
│   │   ├── cmpCartBottomBar.yaml    # Pay slider commit bar
│   │   ├── cmpCartPanel.yaml
│   │   ├── cmpDockedCart.yaml
│   │   ├── cmpFlyoutMenu.yaml
│   │   ├── cmpGalleryCatalog.yaml   # Catalog browse gallery (stepper per row)
│   │   ├── cmpHeader.yaml
│   │   ├── cmpModalConfirm.yaml
│   │   ├── cmpMoneyInput.yaml
│   │   ├── cmpQtyStepper.yaml
│   │   ├── cmpQuickActions.yaml
│   │   ├── cmpQuickActionsSheet.yaml
│   │   ├── cmpSearchBar.yaml
│   │   └── cmpToast.yaml
│   │
│   ├── dataverse/
│   │   └── Tienda_src/              # Unpacked solution (pac solution unpack)
│   │
│   ├── screens/                      # Screen specs and build guides
│   │   ├── scrComprar.yaml          # Purchase screen reference spec
│   │   ├── VERTICAL-1-BUY-PURCHASE-WORKFLOW.md
│   │   ├── VERTICAL-1-ASSEMBLY-PLAN.md
│   │   ├── PHASE-A-PRACTICAL-SETUP-GUIDE.md
│   │   └── prov-VERTICAL-1-DATAFLOW-ARCHITECTURE.md
│   │
│   └── _prov_docs/                  # Provisional/working docs (archive after alpha)
│       ├── prov-V1-BUILD-LOG.md
│       ├── prov-PHASE-A-EXECUTION-SUMMARY.md
│       ├── prov-PHASE-A-DOCUMENTATION-INDEX.md
│       ├── prov-PHASE-A-LAUNCH-CHECKLIST.md
│       ├── prov-GO-NO-GO-VALIDATION.md
│       ├── prov-PRE-FLIGHT-CHECKLIST.md
│       ├── prov-TEST-DATA-STRATEGY.md
│       ├── prov-ADMIN-PLAYBOOK-v1.md
│       └── prov-ADR-034-ANALYSIS-GeneralCatalogRefactor.md
│
├── issues/                           # Issue analysis and clarifications
│   ├── ISSUES_TRACKER.md
│   ├── DECISIONS_SUMMARY.md
│   ├── ISS-014-*                    # Sale stock decrement timing (strictly open)
│   ├── ISS-017-*                    # LastSellUnitPrice toggle
│   ├── ISS-025-*                    # Dataverse connection strategy
│   └── ISS-026-*                    # OData lookup binding
│
├── prov-dataverse-scripts/           # Provisional Dataverse setup scripts
│   ├── README.md
│   └── 0-template-base.ps1
│
└── Summary_Track/                    # Early architecture iteration notes
    └── power_platform_catalog_architecture*.md
```

## Core Concepts

### Workspace Partitioning
Every data operation filters by `gblWorkspaceId`. Every Patch includes `Workspace: gblWorkspace` (full cached record). No exceptions (ADR-022).

### Catalog + Cart Pattern
Transaction screens (Comprar, Vender) use:
- `colCatalogLines` — master collection built from Dataverse via `AddColumns`
- `colCartLines` — derived `Filter(colCatalogLines, Qty > 0)` — not a separate collection
- `cmpGalleryCatalog` for browse, `cmpCartBottomBar` for commit

### Sequential Patch Dependencies
When one Patch result is needed as an FK in the next, use nested `With()`:
```
With({ _a: Patch(TableA, ...) },
    With({ _b: Patch(TableB, ..., FK: _a) },
        Patch(TableC, ..., FK: _b)
    )
)
```

### Component Contracts
Canvas component field mapping properties are declarations only — gallery templates hardcode field names like `ThisItem.PrimaryText`, `ThisItem.Key`, etc. See [docs/alpha/TECHNICAL-REFERENCE.md](docs/alpha/TECHNICAL-REFERENCE.md) for confirmed contracts.

### No Stock Validation on Sales
Sales are recorded regardless of current stock level (ISS-014). Data collection comes first; validation rules are designed from observed patterns.

## Getting Started

### Prerequisites
- Microsoft Power Platform environment access
- Power Apps Studio or Power Apps CLI (`pac`)
- Git

### Exporting & Unpacking the Solution

```powershell
pac solution export --name Tienda --path "./docs/dataverse"
pac solution unpack --zipfile "./docs/dataverse/Tienda.zip" --folder "./docs/dataverse/Tienda_src"
pac canvas list
```

### Where to Start

| Goal | Go to |
|------|-------|
| Understand the project | [docs/initContext.md](docs/initContext.md) |
| Build the next module | [docs/alpha/ALPHA-SCOPE.md](docs/alpha/ALPHA-SCOPE.md) |
| Look up a display name or formula | [docs/alpha/TECHNICAL-REFERENCE.md](docs/alpha/TECHNICAL-REFERENCE.md) |
| Understand a design choice | [docs/adr/](docs/adr/) |
| Read about post-alpha migration | [docs/migration/MIGRATION-BRIEF.md](docs/migration/MIGRATION-BRIEF.md) |
| Track open issues | [issues/ISSUES_TRACKER.md](issues/ISSUES_TRACKER.md) |

## Architecture Decision Records (34)

ADRs document every non-obvious design choice. Key decisions:

| ADR | Decision |
|-----|---------|
| ADR-001 | Workspace as partition key |
| ADR-022 | Workspace scoping enforced in every query and Patch |
| ADR-024 | Dataverse is source of truth; collections are working cache |
| ADR-025 | Screen owns state; components are stateless |
| ADR-026 | `colCatalogLines` authoritative; `colCartLines` is a projection |
| ADR-034 | Hybrid provider pricing model (ProviderProductPrice cache) |

See [docs/adr/](docs/adr/) for the full list.

## Contributing

1. Every non-obvious decision → new ADR in `docs/adr/`
2. Every confirmed display name or formula → update `docs/alpha/TECHNICAL-REFERENCE.md`
3. Workspace scope every read and write — no exceptions
4. Components are stateless; screen owns all variables
5. Follow the catalog+cart pattern for transaction screens

---

**Project Status:** Alpha — Vertical 1 (Comprar) complete  
**Last Updated:** April 2026  
**Stack:** Power Platform → React Native + Supabase (post-alpha)