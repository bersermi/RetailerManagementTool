# Dataverse Write Scripts

PowerShell scripts for writing records to Dataverse tables via Web API. Use these for Phase A data setup and testing.

## Quick Start

### 1. Create a Workspace
```powershell
.\write-workspace.ps1
```
Returns: `Workspace ID` (use in subsequent calls)

### 2. Create a Purchase (incoming stock)
```powershell
.\write-purchase.ps1
```
Returns: `Purchase ID` → use to add line items

### 3. Add items to Purchase
```powershell
.\write-purchaseline.ps1 `
  -PurchaseId "550e8400-e29b-41d4-a716-446655440000" `
  -ProductVariantId "12345678-1234-1234-1234-123456789012" `
  -Quantity 10 `
  -LineTotal 150 `
  -ExpiryDate "2026-12-31T00:00:00Z"
```

### 4. Create a Sale (outgoing transaction)
```powershell
.\write-sale.ps1
```
Returns: `Sale ID` → use to add line items

### 5. Add items to Sale
```powershell
.\write-saleline.ps1 `
  -SaleId "550e8400-e29b-41d4-a716-446655440000" `
  -ProductVariantId "12345678-1234-1234-1234-123456789012" `
  -Quantity 5 `
  -LineTotal 75
```

### 6. Create Waste Session
```powershell
.\write-waste.ps1
```
Returns: `Waste ID` → use to add waste lines

### 7. Add waste items
```powershell
.\write-wasteline.ps1 `
  -WasteId "550e8400-e29b-41d4-a716-446655440000" `
  -ProductVariantId "12345678-1234-1234-1234-123456789012" `
  -Quantity 3
```

## File Reference

| File | Purpose |
|------|---------|
| `0-template-base.ps1` | Reference template showing auth + write pattern |
| `write-workspace.ps1` | Create workspace (multi-tenant partition) |
| `write-purchase.ps1` | Create purchase header |
| `write-purchaseline.ps1` | Add line items to purchase (parameterized) |
| `write-sale.ps1` | Create sale header |
| `write-saleline.ps1` | Add line items to sale (parameterized) |
| `write-waste.ps1` | Create waste session |
| `write-wasteline.ps1` | Add waste line items (parameterized) |

## Pattern Details

### Authentication (all scripts)
- Uses OAuth2 client credentials flow
- Token: 60-min expiry (refresh if script takes >60m)
- No browser interaction needed

### DateTime Fields
- All transaction headers capture business time via `DateTime` field (not system CreatedOn)
- Format: ISO 8601 with timezone (e.g., `2026-04-10T14:30:00Z`)
- PowerShell: `Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ"`

### Relationships (via @odata.bind)
- Parent-child links use GUID binding syntax
- Example: `"crbc0_purchase@odata.bind" = "/crbc0_purchases(GUID)"`
- Replace GUID with actual record ID from parent creation

### Line Item Strategy
- Always create header record first → get back record ID → use ID in line items
- Line items inherit timing from parent (no separate datetime needed per line)

## Common Tasks

### Get a GUID from console output
```powershell
$result | Select-Object crbc0_*id | Format-List
```

### Test connectivity
```powershell
# Run any script with wrong URL to see auth working
.\write-workspace.ps1
```

### Bulk load test data
Create a CSV with columns: `ProductVariantId`, `Quantity`, `ExpiryDate`
```powershell
$csv = Import-Csv "test-data.csv"
foreach ($row in $csv) {
    .\write-purchaseline.ps1 -PurchaseId $purchaseId -ProductVariantId $row.ProductVariantId -Quantity $row.Quantity -ExpiryDate $row.ExpiryDate
}
```

## Notes

- **Credentials**: Hard-coded in each script for simplicity. Move to `$env:` variables for production.
- **Error Handling**: Minimal by design. Add try/catch as needed.
- **Rate Limits**: Dataverse allows ~500 requests/9 seconds per user. These scripts are single-threaded and won't hit limits.
- **Workspace Isolation**: All transactions within a workspace are isolated via the workspace ID field (multi-tenant pattern).
