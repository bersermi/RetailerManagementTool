# Write to crbc0_Waste table
# Creates a new waste session record

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

# Create waste
$waste = @{
    crbc0_name          = "Waste-2026-04-10-001"
    crbc0_wastedatetime = Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ"
    crbc0_status        = "1"  # Pending (adjust per your option set values)
} | ConvertTo-Json

$uri = "$resource/api/data/v9.2/crbc0_wastes"

Write-Host "Creating Waste..." -ForegroundColor Green
$response = Invoke-RestMethod -Method Post -Uri $uri -Headers $headers -Body $waste
Write-Host "Created: $($response.crbc0_wasteid)" -ForegroundColor Green
Write-Host "Next: Add waste lines via write-wasteline.ps1 with this Waste ID" -ForegroundColor Yellow
