# Write to crbc0_PurchaseLine table
# Creates a line item in a purchase record

param(
    [Parameter(Mandatory=$true)]
    [string]$PurchaseId,
    
    [Parameter(Mandatory=$true)]
    [string]$ProductVariantId,
    
    [Parameter(Mandatory=$true)]
    [decimal]$Quantity,
    
    [Parameter(Mandatory=$false)]
    [decimal]$LineTotal = 0,
    
    [Parameter(Mandatory=$false)]
    [string]$ExpiryDate = $null
)

$tenantId      = "ba2f0bec-9a6d-479e-97a2-949b76e957eb"
$appId         = "e760e845-8cb5-43dd-9dfb-bce983be97e7"
$clientSecret  = "5-j8Q~tmCGfrG3Iq2T~qt-JYyriEI4tt6_Of3cQm"
$resource      = "https://orgf47c632c.crm.dynamics.com"

# Get token
$authBody = @{
    client_id     = $appId
    client_secret = $clientSecret
    scope         = "$resource/.default"
    grant_type    = "client_credentials"
}

$tokenResponse = Invoke-RestMethod -Method Post `
    -Uri "https://login.microsoftonline.com/$tenantId/oauth2/v2.0/token" `
    -Body $authBody

$token = $tokenResponse.access_token

$headers = @{
    Authorization  = "Bearer $token"
    "Content-Type" = "application/json"
}

# Create purchase line
$lineData = @{
    crbc0_name = "Line-$ProductVariantId"
    crbc0_quantity = $Quantity
    crbc0_linetotal = $LineTotal
    "crbc0_purchase@odata.bind" = "/crbc0_purchases($PurchaseId)"
    "crbc0_productvariant@odata.bind" = "/crbc0_productvariants($ProductVariantId)"
}

if ($ExpiryDate) {
    $lineData.crbc0_expirydatemanual = $ExpiryDate
}

$body = $lineData | ConvertTo-Json

$uri = "$resource/api/data/v9.2/crbc0_purchaselines"

Write-Host "Creating PurchaseLine..." -ForegroundColor Green
Write-Host "Purchase: $PurchaseId | Product: $ProductVariantId | Qty: $Quantity"
$response = Invoke-RestMethod -Method Post -Uri $uri -Headers $headers -Body $body
Write-Host "Created: $($response.crbc0_purchaselineid)" -ForegroundColor Green

# USAGE:
# .\write-purchaseline.ps1 -PurchaseId "550e8400-e29b-41d4-a716-446655440000" `
#                          -ProductVariantId "12345678-1234-1234-1234-123456789012" `
#                          -Quantity 10 `
#                          -LineTotal 150 `
#                          -ExpiryDate "2026-12-31T00:00:00Z"
