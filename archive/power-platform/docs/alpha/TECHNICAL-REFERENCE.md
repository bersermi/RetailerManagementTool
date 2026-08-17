# Technical Reference — Tienda Alpha

**Date:** 2026-04-21  
**Platform:** Power Apps Canvas App + Dataverse  
**Audience:** AI-first dev team — use this before writing any formula

This document captures what actually works in the live app. Treat it as ground truth over any older design doc.

---

## 1. Global Variables (App.OnStart)

| Variable | Type | Value | Purpose |
|----------|------|-------|---------|
| `gblWorkspaceId` | GUID | LookUp from WorkspaceMember | Workspace partition key — used in every filter |
| `gblWorkspace` | Record | LookUp(Workspaces, ...) | Cached workspace record for Patch calls |
| `gblWorkspaceName` | Text | LookUp result .Name | Display label |
| `gblCurrentUser` | Record | User() or LookUp(Users, ...) | Current user identity |

**Rule:** Never use `{Value: gblWorkspaceId}` for Dataverse FK fields. Use `gblWorkspace` (the full record) or `LookUp(Workspaces, 'Workspace (crbc0_workspaceid)' = gblWorkspaceId)`.

---

## 2. Confirmed Canvas Display Names

### Purchases Table

| Logical Name | Canvas Display Name | Notes |
|---|---|---|
| crbc0_name | Name | Auto or manual |
| crbc0_provider | Provider | Lookup → Providers |
| crbc0_workspace | Workspace | Lookup → Workspaces |
| crbc0_purchasedatetime | PurchaseDateTime | DateTime |
| crbc0_status | `'Status (crbc0_status)'` | Choice field — use `PurchaseStatus.Completed` |

### PurchaseLines Table

| Logical Name | Canvas Display Name |
|---|---|
| crbc0_purchase | Purchase |
| crbc0_productvariant | ProductVariant |
| crbc0_quantity | Quantity |
| crbc0_unitprice | UnitPrice |
| crbc0_linetotal | LineTotal |
| crbc0_workspace | Workspace |

### StockBatches Table

| Logical Name | Canvas Display Name |
|---|---|
| crbc0_productvariant | ProductVariant |
| crbc0_quantityreceived | QuantityReceived |
| crbc0_sourcepurchaseline | SourcePurchaseLine |
| crbc0_workspace | Workspace |

**Note:** StockBatches has no UnitCost column. Cost is tracked via the SourcePurchaseLine FK → UnitPrice on that record.

### ProductVariants Table

| Logical Name | Canvas Display Name |
|---|---|
| crbc0_productvariantid | (GUID — use `Text(crbc0_productvariantid)` when storing as Key) |
| crbc0_name | Name |
| crbc0_displayname | DisplayName |
| crbc0_lastsellunitprice | `'LastSellUnitPrice (Base)'` |
| crbc0_workspace | Workspace |
| crbc0_isactive | IsActive |

### Providers Table

| Logical Name | Canvas Display Name |
|---|---|
| crbc0_name | Name |
| crbc0_displayname | (use Name or DisplayName per schema) |
| crbc0_normalizedname | crbc0_normalizedname |
| crbc0_workspace | Workspace |

---

## 3. Collection Architecture (scrComprar)

### `colCatalogLines` — master collection, built on screen load

```
ClearCollect(
    colCatalogLines,
    AddColumns(
        SortByColumns(
            Filter(ProductVariants, Workspace.'Workspace (crbc0_workspaceid)' = gblWorkspaceId),
            "crbc0_name", SortOrder.Ascending
        ),
        Key,           Text(crbc0_productvariantid),   // Text — matches component Key type
        PrimaryText,   DisplayName,
        SecondaryText, "",
        UnitText,      Unit.Name,
        Qty,           0,
        UnitPrice,     'LastSellUnitPrice (Base)',
        Step,          1,
        MinQty,        0,
        MaxQtyEnabled, false,
        MaxQty,        Blank(),
        AllowStepper,  true,
        Disabled,      false,
        Photo,         Blank(),
        CurrencySymbol,"$"
    )
)
```

**Key insight:** `Key` is stored as `Text(crbc0_productvariantid)` because component event parameters pass Key as Text type. Comparing a Text Key to a GUID column fails — always convert at collection build time.

### `colCartLines` — derived view, not a separate ClearCollect

```
// Conceptually:
colCartLines = Filter(colCatalogLines, Qty > 0)
```

In practice, `colCartLines` is updated via `Collect` / `Patch` on the collection in `OnQtyChange`. It is NOT rebuilt from scratch on each qty change.

### `colProveedores` — small provider list

```
ClearCollect(colProveedores,
    Filter(Providers, Workspace.'Workspace (crbc0_workspaceid)' = gblWorkspaceId)
)
```

---

## 4. Component Real Contracts

### `cmpGalleryCatalog`

**Gallery template hardcodes these field names** — the field mapping properties on the component usage instance are vestigial declarations. The gallery always reads:

| Field | Type | Usage |
|-------|------|-------|
| `ThisItem.Key` | Text | Unique identifier per row |
| `ThisItem.PrimaryText` | Text | Main label |
| `ThisItem.SecondaryText` | Text | Subtitle |
| `ThisItem.UnitText` | Text | Unit label |
| `ThisItem.Qty` | Number | Current quantity |
| `ThisItem.UnitPrice` | Number | Price per unit |
| `ThisItem.AllowStepper` | Boolean | Show/hide stepper |
| `ThisItem.Disabled` | Boolean | Dim the row |
| `ThisItem.Step` | Number | Stepper increment |
| `ThisItem.MinQty` | Number | Stepper minimum |
| `ThisItem.MaxQtyEnabled` | Boolean | Whether MaxQty applies |
| `ThisItem.MaxQty` | Number | Upper bound |
| `ThisItem.Photo` | Image | Row image |
| `ThisItem.CurrencySymbol` | Text | Currency prefix |

**Component output events (parameters passed to host screen):**

| Event | Parameters |
|-------|-----------|
| OnQtyChange | `Key` (Text), `pNewQty` (Number) |
| OnSelectItem | `Key` (Text) |
| OnQuickActions | `Key` (Text) |

### `cmpCartBottomBar`

| Property | Wire to |
|----------|---------|
| `TotalAmount` | `varCartAmountTotal` |
| `PayEnabled` | `varCartLineCount > 0 && !varCartBusy` |
| `VisibleBar` | `varCartLineCount > 0` |
| `Busy` | `varCartBusy` |
| `SliderThreshold` | `92` (confirmed working) |
| `ResetNonce` | `varCartResetNonce` |
| `OnPayComplete` | → triggers purchase transaction |

**Pay slider reset bug (component-level fix):** `sldPay.OnChange` inside the component must call `Select(btnResetInternal)` AFTER `OnPayComplete()` fires. Without this, the slider stays at end position after a successful purchase.

---

## 5. Established Power Fx Patterns

### Sequential Patch dependencies — nested `With()`

When Patch B needs the result of Patch A as an FK:

```
With(
    { _a: Patch(TableA, Defaults(TableA), { ... }) },
    With(
        { _b: Patch(TableB, Defaults(TableB), { FK: _a, ... }) },
        Patch(TableC, Defaults(TableC), { FK: _b, ... })
    )
)
```

**Why nested, not same-level:** Power Fx evaluates all fields in a single `With` record simultaneously. `_b` cannot reference `_a` if both are in the same `With({_a: ..., _b: ...})`.

### ForAll with alias — scoped column access

```
ForAll(colCartLines As line,
    With({ _pv: LookUp(ProductVariants, crbc0_productvariantid = GUID(line.Key)) },
        ...
    )
)
```

`As line` is required when ForAll body references columns from the collection. Without it, Power Fx may fail to resolve column names inside nested expressions.

### Workspace FK in Patch

```
// WRONG — SharePoint syntax, fails on Dataverse
Workspace: {Value: gblWorkspaceId}

// CORRECT — use cached record
Workspace: gblWorkspace

// ALSO CORRECT — inline LookUp (slower, avoid in loops)
Workspace: LookUp(Workspaces, 'Workspace (crbc0_workspaceid)' = gblWorkspaceId)
```

### DropDown default value

```
// WRONG — tries to match full record
Default: =varProveedorSel

// CORRECT — must match Items.Value (text)
Default: =varProveedorSel.crbc0_displayname
OnChange: Set(varProveedorSel, Self.Selected)
```

### Choice field in Patch

```
// Choice fields use the enum directly, not a string
'Status (crbc0_status)': PurchaseStatus.Completed
```

---

## 6. scrComprar — OnPayComplete (Full, Confirmed Working)

```
=Set(varCartBusy, true);
Set(varErrorMsg, "");
Set(varNuevaCompra, Patch(Purchases, Defaults(Purchases), {
    Name: "CMP-" & Text(Now(), "yyyymmddhhmmss"),
    Provider: varProveedorSel,
    Workspace: LookUp(Workspaces, 'Workspace (crbc0_workspaceid)' = gblWorkspaceId),
    PurchaseDateTime: Now(),
    'Status (crbc0_status)': PurchaseStatus.Completed
}));
If(IsError(varNuevaCompra),
    Set(varCartBusy, false);
    Set(varErrorMsg, "Error al crear la compra — intenta de nuevo"),
    ForAll(colCartLines As line,
        With(
            { _pv: LookUp(ProductVariants, crbc0_productvariantid = GUID(line.Key)) },
            With(
                { _purchaseLine: Patch(PurchaseLines, Defaults(PurchaseLines), {
                    Name: varNuevaCompra.Name & "-" & line.Key,
                    Purchase: varNuevaCompra,
                    ProductVariant: _pv,
                    Workspace: gblWorkspace,
                    Quantity: line.Qty,
                    UnitPrice: line.UnitPrice,
                    LineTotal: line.DisplayLineTotal
                })},
                Patch(StockBatches, Defaults(StockBatches), {
                    Name: varNuevaCompra.Name & "-SB-" & line.Key,
                    ProductVariant: _pv,
                    Workspace: gblWorkspace,
                    QuantityReceived: line.Qty,
                    SourcePurchaseLine: _purchaseLine
                })
            )
        )
    );
    ClearCollect(colCatalogLines, AddColumns(
        SortByColumns(Filter(ProductVariants, Workspace.'Workspace (crbc0_workspaceid)' = gblWorkspaceId), "crbc0_name", SortOrder.Ascending),
        Key, Text(crbc0_productvariantid), PrimaryText, DisplayName,
        SecondaryText, "", UnitText, Unit.Name, Qty, 0,
        UnitPrice, 'LastSellUnitPrice (Base)', Step, 1, MinQty, 0,
        MaxQtyEnabled, false, MaxQty, Blank(), AllowStepper, true,
        Disabled, false, Photo, Blank(), CurrencySymbol, "$"
    ));
    Clear(colCartLines);
    Set(varCartAmountTotal, 0);
    Set(varCartLineCount, 0);
    Set(varCartOpen, false);
    Set(varCartBusy, false);
    Set(varCartResetNonce, varCartResetNonce + 1);
    Notify("Compra registrada", NotificationType.Success)
)
```

---

## 7. Dataverse Table Prefix Reference

| Prefix | Tables |
|--------|--------|
| `crbc0_` | All custom Tienda tables |
| `don_` | Modules table (navigation config) |
| System | Workspaces, Users (no prefix) |

---

## 8. Spanish UI Conventions

| Context | String |
|---------|--------|
| No expiry | "Sin vencimiento" |
| Future expiry | "Vence: dd/mm/yyyy" |
| Past expiry | "VENCIDO: dd/mm/yyyy" |
| Purchase success | "Compra registrada" |
| Sale success | "Venta registrada" |
| Waste success | "Desperdicio registrado" |
| Generic error | "Error — intenta de nuevo" |