# scrProductos — Build Guide

**Date:** 2026-05-12 (completed)
**Module:** Productos (Product Management)
**Pattern:** Single screen — Header + Actions + SearchBar + Gallery + Modal overlays
**Reference:** scrComprar is the baseline for OnVisible structure, collection naming, Patch conventions
**Status:** COMPLETE ✅

---

## Purpose

Single screen for browsing, creating, and editing the product catalog. Two-level data: ProductFamily (category) → ProductVariant (SKU). Both can be created and edited from this screen via modal overlay.

**Writes:** ProductFamily, ProductVariant
**Reads:** ProductFamilies, ProductVariants, Units (for dropdowns in modal)

---

## Screen Layout

```
┌────────────────────────────────────┐
│  cmpHeader ("Productos")           │  ← standard header + menu
├────────────────────────────────────┤
│  [Agregar]                         │  ← opens createFamily modal
├────────────────────────────────────┤
│  cmpSearchBar                      │
├────────────────────────────────────┤
│                                    │
│  Gallery1 (direct Dataverse query) │  ← product variant list
│  Title:    VariantName             │
│  Subtitle: ProductFamily.Name      │
│  Sort:     LastTransactionDate ↓   │
│                                    │
├────────────────────────────────────┤
│  cmpFlyoutMenu (varMenuOpen)       │  ← standard
│  recProductosModalScrim            │  ← full-screen dark overlay
│  recProductosModalCard             │  ← centered card, mode-driven height
│  [modal content — see below]       │
└────────────────────────────────────┘
```

---

## Confirmed Dataverse Fields

### ProductVariant (`crbc0_ProductVariant`)

| Canvas Display Name | Logical Name | Type | Notes |
|---|---|---|---|
| `VariantName` | `crbc0_name` | Text | Primary name |
| `DisplayName` | `crbc0_displayname` | Text | Always set = VariantName |
| `NormalizedName` | `crbc0_normalizedname` | Text | Lower(Trim(VariantName)) |
| `Notes` | `crbc0_notes` | Text (multiline) | |
| `IsActive` | `crbc0_isactive` | Boolean | Default: true |
| `BaseSellPrice` | `crbc0_basesellprice` | Money | Writable — reference price set at creation |
| `BaseSellPrice (Base)` | `crbc0_basesellprice_base` | Money | Read-only calc — never reference |
| `LastSellPrice` | `crbc0_lastsellunitprice` | Money | Updated by sales flow (ADR-031) |
| `Ignore` | `crbc0_lastsellunitprice_base` | Money | System calc — never reference |
| `LastTransactionDate` | `crbc0_lasttransactiondate` | DateTime | Updated on every user interaction (browse/create/buy/sell) for sort |
| `ProductFamily` | `crbc0_productfamily` | Lookup → ProductFamily | Canvas name confirmed |
| `Unit` | `crbc0_unit` | Lookup → Unit | Canvas name confirmed |
| `Workspace` | `crbc0_workspace` | Lookup → Workspace | Always `gblWorkspace` |

### ProductFamily (`crbc0_ProductFamily`)

| Canvas Display Name | Logical Name | Type | Notes |
|---|---|---|---|
| `Name` | `crbc0_name` | Text | Primary name |
| `DisplayName` | `crbc0_displayname` | Text | Always set = Name |
| `NormalizedName` | `crbc0_normalizedname` | Text | Lower(Trim(Name)) |
| `Notes` | `crbc0_notes` | Text (multiline) | Shown as "Descripción" in UI |
| `IsActive` | `crbc0_isactive` | Boolean | Default: true |
| `DefaultLifespanDays` | `crbc0_defaultlifespandays` | Integer | Optional |
| `DefaultUnit` | `crbc0_defaultunit` | Lookup → Unit | Copied to standard variant Unit on create |
| `TrackExpiry` | `crbc0_trackexpiry` | Boolean | Default: false — future use |
| `Workspace` | `crbc0_workspace` | Lookup → Workspace | Always `gblWorkspace` |

---

## Variables

| Variable | Type | Purpose |
|---|---|---|
| `varModalOpen` | Boolean | Show/hide modal overlay |
| `varModalMode` | Text | `"inspect"` / `"createFamily"` / `"addVariant"` / `"editVariant"` |
| `varSelectedVariant` | Record | Variant selected in Gallery1 or being edited |
| `varSelectedFamily` | Record | Family for the current inspect/create context |
| `varCurrentMode` | Text | Captures `varModalMode` before Patch chain (used in post-Patch Notify) |
| `varModalBusy` | Boolean | Disable save button during Patch |
| `varModalErrorMsg` | Text | Validation or Patch error message |
| `varMenuOpen` | Boolean | FlyoutMenu state (standard) |
| `varQAOpen` | Boolean | Not used in current implementation |

### Modal Mode Reference

| `varModalMode` | Trigger | Card Height | Description |
|---|---|---|---|
| `"inspect"` | `Gallery1.OnSelect` | `Parent.Height/1.7` | Family header + horizontal variant gallery + 3 action buttons |
| `"createFamily"` | "Agregar" button | `300` | Input form: Name, DefaultUnit dropdown, Notes |
| `"addVariant"` | Inspect → "Agregar Variante" | `Parent.Height/2.4` | Family header frozen + variant name + price inputs |
| `"editVariant"` | Inspect → "Editar" | `Parent.Height/2.4` | Same as addVariant, pre-filled from `varSelectedVariant` |
| `"costos"` | Inspect → "Costos" | — | Placeholder (future) |

---

## Modal Group Architecture

Three control groups drive the modal content:

| Group | Modes | Description |
|---|---|---|
| `grpProductosInspect` | `"inspect"` | Family header display + galInspectVariants + 3 action buttons |
| `grpProductosCreate` | `"createFamily"` | Name/Unit/Notes inputs + Save/Cancel + error label |
| `grpProductosAddEditVariant` | `"addVariant"` \|\| `"editVariant"` | Shared group — family header (read-only) + variant name/price inputs + Save/Cancel |

`grpProductosAddEditVariant` is shared between add and edit. Key adaptive behaviors:
- `lblProductosModalProductAddVariantName.Text`: `=If(varModalMode = "addVariant", "Agregar Variante", "Editar Variante")`
- `txtProductosModalProductAddVariantName.Default`: `=If(varModalMode = "editVariant", varSelectedVariant.VariantName, "")`
- `txtProductosModalProductAddVariantPrice.Default`: `=If(varModalMode = "editVariant", Text(varSelectedVariant.BaseSellPrice, "#,##0.00"), "")`
- Save button branches on `varModalMode` for Patch target (Defaults vs LookUp)

---

## Collections (OnVisible)

```
// Units — for Unit dropdown in createFamily modal
ClearCollect(colUnits, SortByColumns(Units, "crbc0_name", SortOrder.Ascending));

// ProductFamilies — loaded but not actively consumed (no family picker)
ClearCollect(
    colProductFamilies,
    SortByColumns(
        Filter(ProductFamilies, Workspace.'Workspace (crbc0_workspaceid)' = gblWorkspaceId),
        "crbc0_name", SortOrder.Ascending
    )
);

// QuickActions — loaded but QuickActions sheet not used in current implementation
ClearCollect(colQuickActionsProductos, Table(
    { ActionKey: "edit",         Label: "Editar",             IconName: "edit",    IsEnabled: true, IsActive: false },
    { ActionKey: "toggleActive", Label: "Activar/Desactivar", IconName: "disable", IsEnabled: true, IsActive: false }
));
```

---

## OnVisible

```
=Set(varMenuOpen, false);
Set(varActiveMenuKey, "scrProductos");
Set(varLastAction, "");
Set(varModalOpen, false);
Set(varModalMode, "");
Set(varModalBusy, false);
Set(varModalErrorMsg, "");
Set(varQAOpen, false);

ClearCollect(colUnits, SortByColumns(Units, "crbc0_name", SortOrder.Ascending));
ClearCollect(
    colProductFamilies,
    SortByColumns(
        Filter(ProductFamilies, Workspace.'Workspace (crbc0_workspaceid)' = gblWorkspaceId),
        "crbc0_name", SortOrder.Ascending
    )
);
ClearCollect(colQuickActionsProductos, Table(
    { ActionKey: "edit",         Label: "Editar",             IconName: "edit",    IsEnabled: true, IsActive: false },
    { ActionKey: "toggleActive", Label: "Activar/Desactivar", IconName: "disable", IsEnabled: true, IsActive: false }
));
```

---

## Gallery1 — Main Variant List

**Items (delegates to Dataverse):**
```
=With(
    { q: Lower(Trim(cmpSearchbar_2.SearchTextOut)) },
    If(IsBlank(q),
        SortByColumns(
            Filter(ProductVariants, Workspace.'Workspace (crbc0_workspaceid)' = gblWorkspaceId),
            "crbc0_lasttransactiondate", SortOrder.Descending,
            "crbc0_name", SortOrder.Ascending
        ),
        Filter(
            SortByColumns(
                Filter(ProductVariants, Workspace.'Workspace (crbc0_workspaceid)' = gblWorkspaceId),
                "crbc0_lasttransactiondate", SortOrder.Descending,
                "crbc0_name", SortOrder.Ascending
            ),
            q in Lower(NormalizedName) || q in Lower(ProductFamily.NormalizedName)
        )
    )
)
```

Search filters simultaneously on variant name and family name via `NormalizedName` fields.
Sort: most recently interacted first, then alphabetical for ties/nulls.

**OnSelect:**
```
=Patch(ProductVariants, ThisItem, {LastTransactionDate: Now()});
Set(varSelectedVariant, ThisItem);
Set(varSelectedFamily, ThisItem.ProductFamily);
Set(varModalMode, "inspect");
Set(varModalErrorMsg, "");
Set(varModalOpen, true)
```

Note: Patch on every tap is intentional — `LastTransactionDate` tracks user interaction (browse + transactions) to drive sort order.

---

## galInspectVariants — Horizontal Variant Gallery (inspect mode)

```yaml
Items: =Sort(
    Filter(
        ProductVariants,
        ProductFamily.ProductFamily = varSelectedFamily.crbc0_productfamilyid,
        Workspace.'Workspace (crbc0_workspaceid)' = gblWorkspaceId
    ),
    LastTransactionDate, SortOrder.Descending
)
OnSelect: =Set(varSelectedVariant, ThisItem)
Visible:  =varModalMode = "inspect"
```

**Confirmed filter syntax:** `ProductFamily.ProductFamily = varSelectedFamily.crbc0_productfamilyid`
- Left side: GUID of the related family on each variant row
- Right side: GUID of the selected family from `varSelectedFamily`
- Alternative syntax `varSelectedFamily.ProductFamily` does NOT work — returns display name, not GUID

**Selection indicator (Rectangle1 — must be last child for Z-order):**
```
BorderColor: =If(
    ThisItem.crbc0_productvariantid = varSelectedVariant.crbc0_productvariantid,
    RGBA(56, 96, 178, 1),
    RGBA(0, 0, 0, 0)
)
```

**Subtitle (Subtitle5):**
```
Text: ="$" & Text(ThisItem.BaseSellPrice, "#,##0.00")
```

---

## Patch — Create ProductFamily + Standard Variant

`btnProductosModalCreateGuardar.OnSelect`:
```
=Set(varModalBusy, true);
Set(varModalErrorMsg, "");
If(IsBlank(txtProductosModalProductFamilyName.Text),
    Set(varModalErrorMsg, "El nombre es requerido");
    Set(varModalBusy, false),
    With({ _fam: Patch(ProductFamilies, Defaults(ProductFamilies), {
        Name:           txtProductosModalProductFamilyName.Text,
        DisplayName:    txtProductosModalProductFamilyName.Text,
        NormalizedName: Lower(Trim(txtProductosModalProductFamilyName.Text)),
        Notes:          txtProductosModalProductFamilyDescription.Text,
        DefaultUnit:    ddProductosModalUnit.Selected,
        IsActive:       true,
        Workspace:      gblWorkspace
    })},
        If(IsError(_fam),
            Set(varModalBusy, false);
            Set(varModalErrorMsg, "Error al crear producto"),
            With({ _var: Patch(ProductVariants, Defaults(ProductVariants), {
                VariantName:         _fam.Name,
                DisplayName:         _fam.Name,
                NormalizedName:      _fam.NormalizedName,
                ProductFamily:       _fam,
                Unit:                ddProductosModalUnit.Selected,
                BaseSellPrice:       0,
                LastTransactionDate: Now(),
                IsActive:            true,
                Workspace:           gblWorkspace
            })},
                If(IsError(_var),
                    Set(varModalBusy, false);
                    Set(varModalErrorMsg, "Producto creado, error en variante estándar"),
                    Reset(txtProductosModalProductFamilyName);
                    Reset(ddProductosModalUnit);
                    Reset(txtProductosModalProductFamilyDescription);
                    Set(varSelectedFamily, _fam);
                    Set(varSelectedVariant, _var);
                    Set(varModalMode, "inspect");
                    Set(varModalBusy, false);
                    Notify("Producto creado", NotificationType.Success)
                )
            )
        )
    )
)
```

Standard variant created with `BaseSellPrice: 0` — price is set when adding real variants via addVariant.

---

## Patch — Add Variant / Edit Variant (shared Save button)

`btnProductosModalProductAddVariantSave.OnSelect`:
```
=Set(varModalBusy, true);
Set(varModalErrorMsg, "");
Set(varCurrentMode, varModalMode);
If(IsBlank(txtProductosModalProductAddVariantName.Text),
    Set(varModalErrorMsg, "El nombre es requerido");
    Set(varModalBusy, false),
    If(IsBlank(txtProductosModalProductAddVariantPrice.Text),
        Set(varModalErrorMsg, "El precio es requerido");
        Set(varModalBusy, false),
        With({ _var:
            If(varModalMode = "addVariant",
                Patch(ProductVariants, Defaults(ProductVariants), {
                    VariantName:         txtProductosModalProductAddVariantName.Text,
                    DisplayName:         txtProductosModalProductAddVariantName.Text,
                    NormalizedName:      Lower(Trim(txtProductosModalProductAddVariantName.Text)),
                    ProductFamily:       varSelectedFamily,
                    Unit:                varSelectedFamily.DefaultUnit,
                    BaseSellPrice:       Value(txtProductosModalProductAddVariantPrice.Text),
                    LastTransactionDate: Now(),
                    IsActive:            true,
                    Workspace:           gblWorkspace
                }),
                Patch(ProductVariants,
                    LookUp(ProductVariants, crbc0_productvariantid = varSelectedVariant.crbc0_productvariantid),
                    {
                        VariantName:         txtProductosModalProductAddVariantName.Text,
                        DisplayName:         txtProductosModalProductAddVariantName.Text,
                        NormalizedName:      Lower(Trim(txtProductosModalProductAddVariantName.Text)),
                        BaseSellPrice:       Value(txtProductosModalProductAddVariantPrice.Text),
                        LastTransactionDate: Now(),
                        Workspace:           gblWorkspace
                    }
                )
            )
        },
            If(IsError(_var),
                Set(varModalBusy, false);
                Set(varModalErrorMsg, "Error al guardar — intenta de nuevo"),
                Reset(txtProductosModalProductAddVariantName);
                Reset(txtProductosModalProductAddVariantPrice);
                Set(varSelectedVariant, _var);
                Set(varModalMode, "inspect");
                Set(varModalBusy, false);
                Notify(
                    If(varCurrentMode = "addVariant", "Variante creada", "Variante actualizada"),
                    NotificationType.Success
                )
            )
        )
    )
)
```

**Key pattern — `varCurrentMode`:** `varModalMode` is captured before the Patch chain because by the time `Notify` fires, `varModalMode` has already been set to `"inspect"`. Always capture mode first when Notify message depends on it.

**editVariant does NOT patch:** `ProductFamily`, `Unit`, `IsActive` — those are not editable from this modal.

---

## btnAgregar — Open createFamily

```
=Reset(txtProductosModalProductFamilyName);
Reset(ddProductosModalUnit);
Reset(txtProductosModalProductFamilyDescription);
Set(varModalMode, "createFamily");
Set(varModalErrorMsg, "");
Set(varModalOpen, true)
```

Resets fire before opening to ensure clean form state.

## btnProductosModalEditarVariante — Open editVariant

```
=Reset(txtProductosModalProductAddVariantName);
Reset(txtProductosModalProductAddVariantPrice);
Set(varModalMode, "editVariant");
Set(varModalErrorMsg, "")
```

Resets required so Default property re-evaluates with current `varSelectedVariant`.

---

## Sorting — LastTransactionDate

`LastTransactionDate` (`crbc0_lasttransactiondate`) — DateTime, nullable — drives sort order on both galleries.

- **Gallery1**: `SortByColumns` with `"crbc0_lasttransactiondate"` delegates to Dataverse server-side. Null values sort last (oldest) in descending order.
- **galInspectVariants**: `Sort(..., LastTransactionDate, SortOrder.Descending)` — non-delegating but per-family counts are small.
- Updated on: Gallery1 tap (browse), createFamily, addVariant, editVariant, scrComprar purchase commit (pending), scrVender sale commit (pending).

**Known limitation of SortByColumns with AddColumns:** `SortByColumns` validates column names against Dataverse schema at design time — AddColumns-derived columns (e.g. `"SortKey"`) are rejected. Use nested `Sort()` calls for multi-key sorts on AddColumns results, or accept single-key sort.

---

## Pending Items (carry forward)

- [ ] **scrComprar field rename** — `colCatalogLines` AddColumns still references `LastSellUnitPrice (Base)` (now `Ignore`). Must refresh Dataverse connection and update to `LastSellPrice`.
- [ ] **scrComprar LastTransactionDate** — purchase commit should write `LastTransactionDate: Now()` to each purchased variant.
- [ ] **scrVender LastTransactionDate** — sale commit should write `LastTransactionDate: Now()` to each sold variant.
- [ ] **toggleActive** — removed from current design (no QuickActions). Can be added as 4th button on inspect action bar if needed.
- [ ] **Costos modal** — placeholder. Future: provider cost list per variant.
- [ ] **Responsive layout pass** — all controls have hardcoded positions; needs adaptation for different display sizes.
- [ ] **colProductFamilies / colQuickActionsProductos** — loaded in OnVisible but not consumed. Remove or wire when needed.

---

## Success Criteria

- [x] Gallery1 loads all workspace ProductVariants; Title = VariantName, Subtitle = ProductFamily.Name
- [x] Gallery sorted by LastTransactionDate descending (most recently interacted first)
- [x] Search filters by variant name and family name simultaneously
- [x] Tapping a row patches LastTransactionDate and opens inspect modal
- [x] Inspect: family header + horizontal variant gallery (sorted by LastTransactionDate) + 3 buttons
- [x] "+ Agregar" → fills family form → saves family + standard variant → shifts to inspect
- [x] Inspect → "Agregar Variante" → fills variant form (family frozen) → saves → back to inspect
- [x] Inspect → "Editar" → pre-fills variant form → saves changes → back to inspect
- [x] Inspect → "Costos" → placeholder (no crash)
- [x] Validation: name required in all create/edit flows; price required in add/edit variant
- [x] varCurrentMode pattern prevents stale Notify message after mode shift
- [x] All records workspace-scoped