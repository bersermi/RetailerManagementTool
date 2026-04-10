# Write to crbc0_Workspace table
# Creates a new workspace record

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

# Create workspace
$workspace = @{
    crbc0_displayname = "Pilot Location 1"
    crbc0_workspace   = "pilot-loc-1"
} | ConvertTo-Json

$uri = "$resource/api/data/v9.2/crbc0_workspaces"

Write-Host "Creating Workspace..." -ForegroundColor Green
$response = Invoke-RestMethod -Method Post -Uri $uri -Headers $headers -Body $workspace
Write-Host "Created: $($response.crbc0_workspaceid)" -ForegroundColor Green
