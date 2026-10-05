<#
.SYNOPSIS
    Exports HELIOS DEV substations to a CSV file that the PCF test harness can load.

.DESCRIPTION
    Module 4, Stage 9.

    The PCF test harness cannot talk to Dataverse. It takes a CSV file instead,
    and lets you bind each property-set in the manifest to one CSV column. This
    script pulls every substation from DEV with the Web API and writes the file
    the harness needs, so the harness shows the same 60 rows the model-driven
    view will show in Stage 11.

    Authenticates as the HELIOS ALM Service Principal with the client credentials
    flow, exactly as scripts/seed-heatmap-substations.ps1 does. Reads only.

    Choice and lookup columns are written as their labels (the voltage level
    label and the region name), because that is what a user sees and what the
    harness can display as text.

    The file is written as UTF-8 without a byte order mark. Windows PowerShell
    adds a mark when asked for utf8, and a mark would become part of the first
    column header in the harness.

.PARAMETER EnvironmentUrl
    Dataverse environment URL with no trailing slash.

.PARAMETER TenantId
    Entra tenant id.

.PARAMETER ClientId
    Application (client) id of the HELIOS ALM Service Principal.

.PARAMETER OutputPath
    Where to write the CSV. The folder is created if it does not exist.

.EXAMPLE
    .\scripts\export-harness-csv.ps1

.NOTES
    Requires HELIOS_SPN_SECRET to be set as a user environment variable and the
    terminal to have been opened after it was set.
#>
[CmdletBinding()]
param(
    [string]$EnvironmentUrl = "https://helios-dev.crm11.dynamics.com",
    [string]$TenantId       = "e9ca2f7d-a4ad-47ec-9db0-89a64bdfae0e",
    [string]$ClientId       = "1070f820-8eb7-44fa-a135-f094d5c15310",
    [string]$OutputPath     = ".\src\pcf\HeliosNetworkHeatmap\harness-data\substations.csv"
)

$ErrorActionPreference = "Stop"

# ---------------------------------------------------------------------------
# 1. Token. Client credentials flow, no user prompt.
# ---------------------------------------------------------------------------
$secret = $env:HELIOS_SPN_SECRET
if ([string]::IsNullOrWhiteSpace($secret)) {
    throw "HELIOS_SPN_SECRET is not visible in this session. Open a new terminal window and run the script again."
}

$tokenResponse = Invoke-RestMethod -Method Post `
    -Uri "https://login.microsoftonline.com/$TenantId/oauth2/v2.0/token" `
    -ContentType "application/x-www-form-urlencoded" `
    -Body @{
        client_id     = $ClientId
        client_secret = $secret
        scope         = "$EnvironmentUrl/.default"
        grant_type    = "client_credentials"
    }

$api = "$EnvironmentUrl/api/data/v9.2"
$headers = @{
    Authorization      = "Bearer $($tokenResponse.access_token)"
    "OData-MaxVersion" = "4.0"
    "OData-Version"    = "4.0"
    Accept             = "application/json"
    # Asks Dataverse to send labels next to raw values: the choice label for
    # hel_voltagelevel and the region name for the hel_region lookup.
    Prefer             = 'odata.include-annotations="OData.Community.Display.V1.FormattedValue"'
}

# ---------------------------------------------------------------------------
# 2. Read every substation, following @odata.nextLink if Dataverse pages the
#    result. 60 rows fit in one page, but the loop costs nothing.
# ---------------------------------------------------------------------------
$query = "hel_substations?`$select=hel_name,hel_customerscount,hel_voltagelevel,_hel_region_value,hel_latitude,hel_longitude&`$orderby=hel_name asc"
$uri = "$api/$query"
$rows = @()
while ($uri) {
    try {
        $page = Invoke-RestMethod -Method Get -Uri $uri -Headers $headers
    }
    catch {
        $detail = $_.ErrorDetails.Message
        if (-not $detail) { $detail = $_.Exception.Message }
        throw "Dataverse GET failed. $detail"
    }
    $rows += @($page.value)
    $uri = $page.'@odata.nextLink'
}

# ---------------------------------------------------------------------------
# 3. Shape the rows. Labels come from the FormattedValue annotations.
# ---------------------------------------------------------------------------
$formatted = 'OData.Community.Display.V1.FormattedValue'
$lines = New-Object System.Collections.Generic.List[string]
$lines.Add("hel_name,hel_customerscount,hel_voltagelevel,hel_region,hel_latitude,hel_longitude")

function Quote([object]$value) {
    if ($null -eq $value) { return '""' }
    $text = [string]$value
    return '"' + $text.Replace('"', '""') + '"'
}

foreach ($r in $rows) {
    $voltageLabel = $r."hel_voltagelevel@$formatted"
    $regionName   = $r."_hel_region_value@$formatted"
    $customers    = $r.hel_customerscount
    $lat          = $r.hel_latitude
    $lon          = $r.hel_longitude
    $line = (Quote $r.hel_name) + "," +
            $(if ($null -eq $customers) { "" } else { [string]$customers }) + "," +
            (Quote $voltageLabel) + "," +
            (Quote $regionName) + "," +
            $(if ($null -eq $lat) { "" } else { ([decimal]$lat).ToString([System.Globalization.CultureInfo]::InvariantCulture) }) + "," +
            $(if ($null -eq $lon) { "" } else { ([decimal]$lon).ToString([System.Globalization.CultureInfo]::InvariantCulture) })
    $lines.Add($line)
}

# ---------------------------------------------------------------------------
# 4. Write UTF-8 without a byte order mark.
# ---------------------------------------------------------------------------
$fullPath = [System.IO.Path]::GetFullPath((Join-Path (Get-Location) $OutputPath))
$folder = [System.IO.Path]::GetDirectoryName($fullPath)
if (-not (Test-Path $folder)) { New-Item -ItemType Directory -Path $folder | Out-Null }
[System.IO.File]::WriteAllLines($fullPath, $lines, (New-Object System.Text.UTF8Encoding($false)))

Write-Output ("Substations read from DEV: {0}" -f $rows.Count)
Write-Output ("Rows written (excluding header): {0}" -f ($lines.Count - 1))
Write-Output ("File: {0}" -f $fullPath)
Write-Output ("Bytes: {0}" -f (Get-Item $fullPath).Length)
Write-Output ""
Write-Output "First four lines:"
Get-Content $fullPath -TotalCount 4 | ForEach-Object { Write-Output ("  " + $_) }
