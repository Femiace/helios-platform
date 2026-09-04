# Tests Dataverse column-level security as the HELIOS ALM Service Principal.
# The service principal must NOT hold System Administrator for this to mean anything.

$tenantId = 'e9ca2f7d-a4ad-47ec-9db0-89a64bdfae0e'
$clientId = '1070f820-8eb7-44fa-a135-f094d5c15310'
$orgUrl   = 'https://helios-dev.crm11.dynamics.com'

$clientSecret = $env:HELIOS_SPN_SECRET
if ([string]::IsNullOrWhiteSpace($clientSecret)) {
    Write-Error 'HELIOS_SPN_SECRET is not set in this PowerShell session. Open a new session or set it, then rerun.'
    exit 1
}

$tokenUri = 'https://login.microsoftonline.com/' + $tenantId + '/oauth2/v2.0/token'
$tokenBody = @{
    client_id     = $clientId
    client_secret = $clientSecret
    scope         = $orgUrl + '/.default'
    grant_type    = 'client_credentials'
}

try {
    $token = Invoke-RestMethod -Method Post -Uri $tokenUri -Body $tokenBody -ContentType 'application/x-www-form-urlencoded'
}
catch {
    Write-Error ('Token request failed: ' + $_.Exception.Message)
    exit 1
}

$headers = @{
    Authorization      = 'Bearer ' + $token.access_token
    Accept             = 'application/json'
    'OData-Version'    = '4.0'
    'OData-MaxVersion' = '4.0'
}

Write-Host ''
Write-Host '=== Identity ===' -ForegroundColor Cyan
$who = Invoke-RestMethod -Method Get -Uri ($orgUrl + '/api/data/v9.2/WhoAmI') -Headers $headers
Write-Host ('UserId: ' + $who.UserId)

Write-Host ''
Write-Host '=== Grid Asset: secured column and its base column ===' -ForegroundColor Cyan
$assetUri = $orgUrl + '/api/data/v9.2/hel_assets?$select=hel_serialnumber,hel_replacementcost,hel_replacementcost_base'
$assets = Invoke-RestMethod -Method Get -Uri $assetUri -Headers $headers
foreach ($a in $assets.value) {
    $secured = if ($a.PSObject.Properties.Name -contains 'hel_replacementcost') { $a.hel_replacementcost } else { 'ABSENT' }
    $baseCol = if ($a.PSObject.Properties.Name -contains 'hel_replacementcost_base') { $a.hel_replacementcost_base } else { 'ABSENT' }
    Write-Host ($a.hel_serialnumber + '  replacementcost=' + $secured + '  replacementcost_base=' + $baseCol)
}

Write-Host ''
Write-Host '=== Outage Event: secured column and its base column ===' -ForegroundColor Cyan
$outageUri = $orgUrl + '/api/data/v9.2/hel_outages?$select=hel_name,hel_compensationdue,hel_compensationdue_base'
$outages = Invoke-RestMethod -Method Get -Uri $outageUri -Headers $headers
foreach ($o in $outages.value) {
    $secured = if ($o.PSObject.Properties.Name -contains 'hel_compensationdue') { $o.hel_compensationdue } else { 'ABSENT' }
    $baseCol = if ($o.PSObject.Properties.Name -contains 'hel_compensationdue_base') { $o.hel_compensationdue_base } else { 'ABSENT' }
    Write-Host ($o.hel_name + '  compensationdue=' + $secured + '  compensationdue_base=' + $baseCol)
}

Write-Host ''
Write-Host 'ABSENT means Dataverse withheld the column. A value means it was returned.' -ForegroundColor Yellow