# Vertical 1 — Live Build Log

**Vertical:** Purchase Workflow (scrComprar)
**Started:** 2026-04-19
**Goal:** Working end-to-end purchase → StockBatch
**Mode:** Coach-assisted build

---

## App.OnStart (Confirmed — Tests2 App)

```powerapps
// ── WORKSPACE CONTEXT ─────────────────────────────────────────────────────────
// Looks up the WorkspaceMember record whose primary name matches the current user's
// full name, then extracts the linked Workspace GUID.
// NOTE: This approach relies on the WorkspaceMember.Name (primary name) being set
// to the user's FullName during provisioning. Admin must set this correctly.
Set(
    gblWorkspaceId,
    LookUp(
        WorkspaceMembers,
        'WorkspaceMember (crbc0_workspacemember)' = User().FullName,
        Workspace.'Workspace (crbc0_workspaceid)'
    )
);

// Resolve the workspace display name from the GUID (used in screen headers).
Set(
    gblWorkspaceName,
    LookUp(
        Workspaces,
        'Workspace (crbc0_workspaceid)' = gblWorkspaceId,
        'Workspace (crbc0_workspace)'
    )
);

// ── NAV MENU ──────────────────────────────────────────────────────────────────
// colNavMenu drives cmpFlyoutMenu on every screen.
// Badge: number shows a count badge on the menu item; Blank() = no badge.
ClearCollect(
    colNavMenu,
    Table(
        { ItemKey: "scrHome",        ItemLabel: "Menu Principal", Badge: Blank() },
        { ItemKey: "scrComprar",     ItemLabel: "Comprar",        Badge: 2       },
        { ItemKey: "scrVender",      ItemLabel: "Vender",         Badge: Blank() },
        { ItemKey: "scrProductos",   ItemLabel: "Productos",      Badge: Blank() },
        { ItemKey: "scrProveedores", ItemLabel: "Proveedores",    Badge: Blank() }
    )
);

// ── GLOBAL UI STATE ───────────────────────────────────────────────────────────
Set(varMenuOpen,     false);
Set(varActiveMenuKey,"scrHome");
```

### What each block does

| Block | Variable(s) | Notes |
|-------|-------------|-------|
| Workspace lookup | `gblWorkspaceId` | GUID — every Filter/Patch in the app uses this |
| Workspace name | `gblWorkspaceName` | Text — shown in screen headers only |
| Nav menu | `colNavMenu` | Feeds `cmpFlyoutMenu_1.Items` on all screens |
| UI state | `varMenuOpen`, `varActiveMenuKey` | Reset on app start |

### ⚠ Known caveat — workspace lookup mechanism
The lookup matches `WorkspaceMember.Name = User().FullName`. This works for the pilot **only if** the WorkspaceMember primary name was set to the user's exact `User().FullName` during admin provisioning. If names don't match exactly, `gblWorkspaceId` will be `Blank()` and all screens will show empty data.

**Mitigation (V1 pilot):** Admin creates WorkspaceMember records with Name = the user's display name exactly as it appears in M365.

**Mitigation (V2):** Switch to `User lookup on WorkspaceMember → filter by SystemUser` once the user-linking is properly configured.

---

## Canvas App Data Sources (confirmed naming)

_Fill in as you confirm each one in the Data panel._

| Logical table | Canvas display name | Confirmed? |
|---------------|---------------------|------------|
| crbc0_Workspace | `Workspaces` | ✅ (used in OnStart) |
| crbc0_WorkspaceMember | `WorkspaceMembers` | ✅ (used in OnStart) |
| crbc0_Provider | `Providers` | ❓ |
| crbc0_ProductVariant | `Product Variants` | ❓ |
| crbc0_Purchase | `Purchases` | ❓ |
| crbc0_PurchaseLine | `Purchase Lines` | ❓ |
| crbc0_StockBatch | `Stock Batches` | ❓ |
| crbc0_WorkspaceSettings | `Workspace Settings` | ❓ |
| ProviderProductPrice | `Provider Product Prices` | ❌ Not in solution — add manually |

---

## Global Variables Reference

| Variable | Type | Source | Used by |
|----------|------|--------|---------|
| `gblWorkspaceId` | Text (GUID) | App.OnStart | Every Filter/Patch — workspace partition key |
| `gblWorkspaceName` | Text | App.OnStart | Screen headers |
| `colNavMenu` | Collection | App.OnStart | cmpFlyoutMenu on all screens |
| `varMenuOpen` | Boolean | App.OnStart + screens | cmpFlyoutMenu visibility |
| `varActiveMenuKey` | Text | App.OnStart + screens | cmpFlyoutMenu selected highlight |

---

## Screen Build Status

| Screen | Purpose | Status |
|--------|---------|--------|
| scrHome | Main menu — 4 module tiles | 🔨 Reviewed — 2 fixes pending |
| scrComprar | Purchase entry pipeline | 🔨 In progress |
| scrInventario | Stock batch view (read-only) | ⬜ Not started |
| scrOpciones | Workspace settings toggle | ⬜ Not started |

### scrHome — Confirmed Structure
- **Gallery7** (2-col, TemplateSize=405): 4 module tiles → Vender, Comprar, Productos, Proveedores
- **Gallery8** (horizontal, 3 items): Desperdicio, Numeros, Opciones (icon + label)
- **cmpHeader_1**: ShowMenu=true, OnBack=empty, TitleText="Menu Principal"
- **hdrSeparator**: Y=85, blue bar under header

### scrHome — Pending Fixes
- [ ] **Move `colMenu` + `colSmallMenu` to `App.OnStart`** — static collections, no reason to rebuild on every navigation back
- [ ] **Menu button**: either set `ShowMenu: =false` OR add `cmpFlyoutMenu` + `OnMenu: =Set(varMenuOpen, true)` — currently wired but non-functional

---

## scrComprar — Variable Map

| Variable | Type | Default | Purpose |
|----------|------|---------|---------|
| `varProveedorSel` | Record | Blank | Selected Provider row |
| `varProductoSel` | Record | Blank | Selected ProductVariant row |
| `varPrecioAnterior` | Number | 0 | Last price from colPrecios for this provider+product |
| `varCantidad` | Number | 1 | Quantity |
| `varPrecioUnit` | Number | 0 | Unit price (auto-filled or typed) |
| `varTotalLinea` | Number | 0 | qty × unitPrice |
| `varModoTotal` | Boolean | false | false = editing Unit Price, true = editing Total |
| `varVencimiento` | Date | Blank | Optional manual expiry |
| `varOcupado` | Boolean | false | Disables form during Patch |
| `varErrorMsg` | Text | "" | Validation / system errors |
| `varNuevaCompra` | Record | Blank | Purchase record returned from Patch (FK for PurchaseLine) |

## scrComprar — Collections

| Collection | Source | Loaded | Refreshed |
|------------|--------|--------|-----------|
| `colProveedores` | Providers filtered by workspace | OnVisible | Only on re-entry |
| `colProductos` | ProductVariants (IsActive) filtered by workspace | OnVisible | Only on re-entry |
| `colPrecios` | ProviderProductPrices filtered by workspace | OnVisible | After each successful purchase |

---

## Blockers

| # | Blocker | Status |
|---|---------|--------|
| B-01 | ProviderProductPrice not in solution export — needs manual add to Canvas data | ⬜ Open |
| B-02 | Status enum name for Purchases — verify `'Status (Purchases)'.Completed` in formula bar | ⬜ Open |
| B-03 | Canvas column display names for all tables — confirm as you wire each control | ⬜ Open |

---

## Decisions Made During Build

| # | Decision | Rationale |
|---|----------|-----------|
| D-01 | Load colProveedores / colProductos / colPrecios all on OnVisible | Small dataset; zero per-interaction Dataverse calls after load |
| D-02 | cmpQtyStepper step=1, AllowDecimal=true | Matches component interface; supports fractional units (kg, etc.) |
| D-03 | Dual price mode (Unit ↔ Total) via `varModoTotal` | User can enter whichever is easier per transaction |
| D-04 | `Patch(Purchase)` return value used as FK for PurchaseLine | Avoids secondary LookUp; cleaner |
| D-05 | Only colPrecios refreshed after success | Providers/Products stable within a session |
| D-06 | Workspace matched via `WorkspaceMember.Name = User().FullName` | Simplest pilot approach; admin provisions names manually |

---

## Session Notes

### 2026-04-19 — Session 1
- Tests2 app created
- App.OnStart confirmed and documented above
- scrComprar YAML pipeline written (`docs/screens/scrComprar.yaml`)
- Coaching mode active — update this log as build progresses
