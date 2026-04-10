# Write to crbc0_Purchase table
# Creates a new purchase record (incoming stock from provider)

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

# Create purchase
# Note: Replace provider GUID with actual provider record ID
$purchase = @{
    crbc0_name            = "Purchase-2026-04-10-001"
    crbc0_purchasedatetime = Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ"
    "crbc0_provider@odata.bind" = "/crbc0_providers(00000000-0000-0000-0000-000000000001)"  # Replace with real provider ID
} | ConvertTo-Json

$uri = "$resource/api/data/v9.2/crbc0_purchases"

Write-Host "Creating Purchase..." -ForegroundColor Green
$response = Invoke-RestMethod -Method Post -Uri $uri -Headers $headers -Body $purchase
Write-Host "Created: $($response.crbc0_purchaseid)" -ForegroundColor Green
Write-Host "Next: Add lines via write-purchaseline.ps1 with this Purchase ID" -ForegroundColor Yellow
