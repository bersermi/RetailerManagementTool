# Retail Management Tool (Tienda)

A comprehensive Power Platform solution for small retail operators to manage suppliers, products, inventory, and sales operations with a modern canvas application backed by Dataverse.

## Overview

The Retail Management Tool is a multi-tenant, scalable system built on Microsoft Power Platform designed to streamline retail operations across workspaces (multiple stores/businesses). The solution combines Dataverse for data management, Canvas Apps for user interface, and Power Automate for business logic automation.

## Technology Stack

- **Microsoft Dataverse** – Multi-tenant data storage with workspace-based partitioning
- **Power Apps Canvas App** – Modern, responsive user interface (Tienda)
- **Power Automate** – Workflow automation and business logic
- **Power Platform Solutions** – ALM and deployment approach

## Key Features

### 1. **Workspace Management**
- Multi-tenant architecture with workspace-based partitioning
- Workspace-specific data isolation and user membership
- Support for multiple stores/businesses in a single environment

### 2. **Provider Catalog System**
- Manage suppliers/providers and their product catalogs
- Bulk import and selective product catalog imports from other providers
- provider-specific pricing and catalog management

### 3. **Product Management**
- Three-level product hierarchy: **ProductFamily** → **ProductVariant** → **Units**
- Flexible product specifications (e.g., "Beans → Black beans → Premium")
- User-defined unit system (kg, g, can, piece, bag, etc.)
- One unit per variant for operational simplicity

### 4. **Purchase & Stock Management**
- Purchase orders that automatically feed into stock batches
- Stock batch tracking with linked inventory events
- Inventory actions (favorite, to-buy, out-of-stock, etc.)

### 5. **Sales & Basket Experience**
- Shopping basket with real-time calculations
- Per-line price overrides with transaction-time pricing
- Last-sell price tracking for quick pricing decisions
- Cart bottom bar and panel UI options

### 6. **Inventory Management**
- Stock availability overrides
- Inventory event tracking (pending and finalized states)
- Inventory validation and quick actions

### 7. **Waste Module**
- Per-batch expiry tracking and computation
- Waste classification and backend suggestions
- Integration points for external waste management systems

### 8. **Advanced Features**
- Search-first UX with duplicate prevention
- Price override persistence across transactions
- UI quick actions with state management constraints
- Alternate key uniqueness enforcement
- Dataverse as the source of truth with working collections

## Project Structure

```
RetailerManagementTool/
├── README.md                          # This file
├── DataverseExports.txt              # Power Platform export commands
├── docs/
│   ├── initContext.md                # Initial project context and requirements
│   ├── adr/                          # Architecture Decision Records (ADRs)
│   │   ├── ADR-001-workspace-partition-key.md
│   │   ├── ADR-002-workspace-membership.md
│   │   ├── ADR-003-dataverse-ids-and-lookups.md
│   │   ├── ADR-004-naming-displayname-normalizedname.md
│   │   ├── ADR-005-search-first-ux-duplicate-prevention.md
│   │   ├── ADR-006-productfamily-productvariant.md
│   │   ├── ADR-007-units-and-user-preferences.md
│   │   ├── ADR-008-one-unit-per-variant.md
│   │   ├── ADR-009-provider-catalog-join-table.md
│   │   ├── ADR-010-purchases-pricing-input.md
│   │   ├── ADR-011-stockbatch-from-purchases.md
│   │   ├── ADR-012-sales-basket-last-price.md
│   │   ├── ADR-013-availability-overrides.md
│   │   ├── ADR-014-inventoryevent-pending-finalized.md
│   │   ├── ADR-015-no-hybrid-quick-actions.md
│   │   ├── ADR-016-waste-module-and-integration.md
│   │   ├── ADR-017-expiry-computation-policy.md
│   │   ├── ADR-018-suggestions-and-noise-controls.md
│   │   ├── ADR-019-provider-location-fields.md
│   │   ├── ADR-020-no-cancelled-ui-corrections-via-events.md
│   │   ├── ADR-021-solution-alm-approach.md
│   │   ├── ADR-022-workspace-scoping-in-app.md
│   │   ├── ADR-023-alternate-keys-uniqueness.md
│   │   ├── ADR-024-dataverse-source-of-truth-working-collections.md
│   │   ├── ADR-025-screen-owns-state-components-stateless.md
│   │   ├── ADR-026-colcataloglines-authoritative-colcartlines-projection.md
│   │   ├── ADR-027-cart-bottom-bar-vs-cart-panel.md
│   │   ├── ADR-028-transaction-time-price-overrides.md
│   │   └── ADR-029-canvas-component-composition-constraints.md
│   ├── architecture/                 # Architecture documentation
│   ├── components/                   # Canvas app components documentation
│   ├── dataverse/                    # Dataverse schema and entities
│   ├── flows/                        # Power Automate flows
│   └── screens/                      # Canvas app screens
└── Summary_Track/                    # Project tracking and summary documents
```

## Core Concepts

### Workspace Partitioning
The solution uses **Workspace** as a partition key for logical data isolation. All app operations filter by the active workspace, ensuring users only see their store's data. This design supports future consolidation across multiple environments.

### Multi-Level Product Specification
Products support a hierarchical structure:
- **ProductFamily** – Base product category
- **ProductVariant** – Specific variants with distinct specs
- **Unit** – Single unit measurement per variant

**Example**: "Beans" (family) → "Black Beans" (variant) → "Premium" (variant) with "kg" units

### Provider Catalog Join Pattern
Providers are mapped to products through a join table (ProviderCatalog), preventing product duplication while allowing flexible provider-specific product imports.

### Basket & Transaction Pricing
Sales transactions support immediate price overrides at line level with persistence. The system tracks the last sell price per product for quick pricing decisions.

### Inventory Event Tracking
All inventory changes produce events marked as either:
- **Pending** – Awaiting finalization
- **Finalized** – Committed to stock

This two-state model supports audit trails and transaction reversibility.

## Getting Started

### Prerequisites
- Microsoft Power Platform environment access
- Power Apps Studio or Power Apps CLI for development
- Git for version control (solution packed in `docs/dataverse/`)

### Exporting & Importing Solutions

**Export the solution:**
```powershell
pac solution export --name Tienda --path "path/to/export"
```

**Unpack the solution:**
```powershell
pac solution unpack --zipfile "Tienda.zip" --folder "Tienda_src"
```

**List canvas apps:**
```powershell
pac canvas list
```

### How to Navigate

1. **Start Here**: Read [docs/initContext.md](docs/initContext.md) for the complete project brief and requirements.
2. **Understand Design Decisions**: Review the ADRs in [docs/adr/](docs/adr/) to understand why specific patterns were chosen.
3. **Explore Implementation**:
   - [Components](docs/components/) – Reusable canvas components (buttons, inputs, menus, etc.)
   - [Dataverse Schema](docs/dataverse/) – Database entities and relationships
   - [Flows](docs/flows/) – Automated business processes
   - [Screens](docs/screens/) – App screens and navigation flow

## Architecture Highlights

### Multi-Tenancy Strategy
Option B: Multi-tenant-in-one-environment with Workspace as the partition key. This approach:
- Reduces environment sprawl
- Simplifies user management
- Supports future data consolidation
- Maintains data isolation through application logic

### Stateless Components
Canvas components are designed stateless with props passed from parent screens. This ensures:
- Reusability across screens
- Predictable behavior
- Easier testing and debugging
- Clear data flow

### Source of Truth
Dataverse is the authoritative source. Working collections cache data locally within the app but always defer to Dataverse for persistence and calculations.

### ALM & Solution Management
The solution uses Power Platform's managed/unmanaged solution approach for deployment across environments (dev → test → production).

---

## Documentation Reference

| Document | Purpose |
|----------|---------|
| [docs/initContext.md](docs/initContext.md) | Project overview, context, and requirements |
| [docs/adr/](docs/adr/) | Architecture Decision Records (29 decisions) |
| [docs/architecture/](docs/architecture/) | System architecture documentation |
| [docs/components/](docs/components/) | Component specifications and usage |
| [docs/dataverse/](docs/dataverse/) | Dataverse entities, tables, and schemas |
| [docs/flows/](docs/flows/) | Power Automate workflow definitions |
| [docs/screens/](docs/screens/) | Canvas app screens and layouts |

## Key Decision Points

The solution includes 29 Architecture Decision Records (ADRs) that document critical design choices:

- **Data Model**: Workspace partitioning, product hierarchy, provider catalogs
- **User Experience**: Search-first design, cart UI patterns, quick actions
- **Integration**: Waste module integration, inventory events, backend suggestions
- **Quality**: Naming conventions, alternate keys, component constraints

See [docs/adr/](docs/adr/) for the full list.

## Project Tracking

Reference [Summary_Track/](Summary_Track/) for:
- Progress notes and architecture iterations
- Design discussions and decisions
- Platform-specific documentation

## Contributing

When adding features:
1. Document design decisions as an ADR
2. Update relevant component/screen documentation
3. Ensure workspace scoping on all reads/writes
4. Follow the stateless component pattern
5. Update this README if adding new major features

## Support & Questions

For questions about specific design decisions, refer to the corresponding ADR. For implementation guidance, check the component and screen documentation.

---

**Project Status**: Active Development  
**Last Updated**: April 2026  
**Technology**: Microsoft Power Platform (Dataverse, Canvas Apps, Power Automate)
