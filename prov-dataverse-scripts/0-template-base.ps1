# ============================================================================
# Dataverse Write Template
# Base pattern for writing records to any Dataverse table via Web API
# ============================================================================
# USAGE: Copy this template, modify the AUTH and BODY sections for your table
# ============================================================================

# AUTH SECTION (same for all scripts)
$tenantId      = "ba2f0bec-9a6d-479e-97a2-949b76e957eb"
$appId         = "e760e845-8cb5-43dd-9dfb-bce983be97e7"
$clientSecret  = "5-j8Q~tmCGfrG3Iq2T~qt-JYyriEI4tt6_Of3cQm"
$resource      = "https://orgf47c632c.crm.dynamics.com"

# Get OAuth token
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

# Prepare headers (same for all scripts)
$headers = @{
    Authorization  = "Bearer $token"
    "Content-Type" = "application/json"
}

# ============================================================================
# TABLE-SPECIFIC SECTION (modify this per table)
# ============================================================================

# Example 1: Workspace
$tableName   = "crbc0_workspaces"
$recordData = @{
    crbc0_displayname = "Test Workspace from PowerShell"
    crbc0_workspace   = "TestWorkspace"
}

# ============================================================================
# WRITE (same for all scripts)
# ============================================================================

$body = $recordData | ConvertTo-Json
$uri = "$resource/api/data/v9.2/$tableName"

Write-Host "Writing to: $uri"
Write-Host "Record: $(ConvertTo-Json $recordData -Depth 2)"

$response = Invoke-RestMethod -Method Post `
    -Uri $uri `
    -Headers $headers `
    -Body $body

Write-Host "Success! Record ID: $($response.crbc0_${tableName}id)"
