<#
.SYNOPSIS
    Adds throwaway substations to HELIOS DEV so the Module 4 heatmap control has
    enough rows to page and sort, and removes them again on request.

.DESCRIPTION
    Module 4, Stage 7.

    Authenticates as the HELIOS ALM Service Principal with the client credentials
    flow, exactly as scripts/seed-verification-data.ps1 does, then creates 57
    substations named "HM-01 ..." to "HM-57 ..." across the existing North,
    Midlands and South regions. Together with the three Module 3 substations
    that gives 60 rows, which is more than one page in a model-driven view.

    This is a separate script rather than a change to seed-verification-data.ps1
    because that script refuses to run on top of existing rows, and a reset would
    recreate every Module 3 row with new IDs. The Module 3 IDs are referenced by
    form configuration, evidence files and notes, so they stay as they are.

    Run with -Remove to delete every substation whose name starts with "HM-",
    then exit. Nothing else is touched.

    Values are generated from a fixed random seed, so running the script twice
    produces the same names, customer counts and coordinates.

.PARAMETER EnvironmentUrl
    Dataverse environment URL with no trailing slash.

.PARAMETER TenantId
    Entra tenant id.

.PARAMETER ClientId
    Application (client) id of the HELIOS ALM Service Principal.

.PARAMETER Remove
    Deletes all HM- substations and exits.

.EXAMPLE
    .\scripts\seed-heatmap-substations.ps1
    .\scripts\seed-heatmap-substations.ps1 -Remove

.NOTES
    Requires HELIOS_SPN_SECRET to be set as a user environment variable and the
    terminal to have been opened after it was set.
    Retired by HeliosDataSeeder between Modules 4 and 5.
#>
[CmdletBinding()]
param(
    [string]$EnvironmentUrl = "https://helios-dev.crm11.dynamics.com",
    [string]$TenantId       = "e9ca2f7d-a4ad-47ec-9db0-89a64bdfae0e",
    [string]$ClientId       = "1070f820-8eb7-44fa-a135-f094d5c15310",
    [switch]$Remove
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
$baseHeaders = @{
    Authorization      = "Bearer $($tokenResponse.access_token)"
    "OData-MaxVersion" = "4.0"
    "OData-Version"    = "4.0"
    Accept             = "application/json"
}

function Invoke-Dv {
    param(
        [Parameter(Mandatory)][ValidateSet("GET", "POST", "DELETE")][string]$Method,
        [Parameter(Mandatory)][string]$Path,
        [hashtable]$Body
    )
    $uri     = "$api/$Path"
    $headers = $baseHeaders.Clone()
    try {
        if ($Method -eq "POST") {
            $headers["Prefer"] = "return=representation"
            $json = $Body | ConvertTo-Json -Depth 5 -Compress
            return Invoke-RestMethod -Method Post -Uri $uri -Headers $headers `
                -ContentType "application/json; charset=utf-8" -Body $json
        }
        return Invoke-RestMethod -Method $Method -Uri $uri -Headers $headers
    }
    catch {
        $detail = $_.ErrorDetails.Message
        if (-not $detail) { $detail = $_.Exception.Message }
        throw "Dataverse $Method $Path failed. $detail"
    }
}

# ---------------------------------------------------------------------------
# 2. Current state.
# ---------------------------------------------------------------------------
$countResp = Invoke-Dv GET "hel_substations?`$select=hel_substationid&`$top=1&`$count=true"
Write-Host ""
Write-Host ("Substations in DEV before this run: {0}" -f [int]$countResp.'@odata.count')

$existingHm = @((Invoke-Dv GET "hel_substations?`$select=hel_substationid,hel_name&`$filter=startswith(hel_name,'HM-')").value)
Write-Host ("HM- substations already present:    {0}" -f $existingHm.Count)

# ---------------------------------------------------------------------------
# 3. Remove.
# ---------------------------------------------------------------------------
if ($Remove) {
    foreach ($row in $existingHm) {
        Invoke-Dv DELETE "hel_substations($($row.hel_substationid))" | Out-Null
    }
    Write-Host ("Deleted {0} HM- substations." -f $existingHm.Count)
    return
}

if ($existingHm.Count -gt 0) {
    throw "HM- substations already exist. Run the script with -Remove first if you want to recreate them."
}

# ---------------------------------------------------------------------------
# 4. Region lookup binding. Read the navigation property from metadata rather
#    than guessing it, as the Module 3 script does.
# ---------------------------------------------------------------------------
$relQuery = "RelationshipDefinitions/Microsoft.Dynamics.CRM.OneToManyRelationshipMetadata" +
    "?`$select=ReferencingEntity,ReferencingAttribute,ReferencedEntity,ReferencingEntityNavigationPropertyName" +
    "&`$filter=ReferencingEntity eq 'hel_substation' and ReferencingAttribute eq 'hel_region'"
$rel = @((Invoke-Dv GET $relQuery).value)
if ($rel.Count -ne 1) { throw "Expected one hel_substation.hel_region relationship, found $($rel.Count)." }
$regionNav = $rel[0].ReferencingEntityNavigationPropertyName

$regions = @{}
foreach ($r in (Invoke-Dv GET "hel_regions?`$select=hel_regionid,hel_name").value) {
    $regions[$r.hel_name] = $r.hel_regionid
}
foreach ($name in @("North", "Midlands", "South")) {
    if (-not $regions.ContainsKey($name)) { throw "Region '$name' is missing. Run seed-verification-data.ps1 first." }
}

# ---------------------------------------------------------------------------
# 5. Generate 57 substations, 19 per region.
#    hel_voltagelevel: 100000000=400V  100000001=11kV  100000002=33kV  100000003=132kV
#    Customer counts are skewed so the heatmap has a few hot tiles and many
#    cool ones, which is what a real network looks like.
# ---------------------------------------------------------------------------
$towns = @{
    North    = @("Macclesfield", "Wilmslow", "Knutsford", "Congleton", "Stockport", "Buxton", "Glossop", "Altrincham", "Sale", "Northwich", "Warrington", "Widnes", "Runcorn", "Chester", "Nantwich", "Crewe", "Sandbach", "Leek", "Hyde")
    Midlands = @("Warwick", "Leamington Spa", "Stratford-upon-Avon", "Rugby", "Coventry", "Nuneaton", "Solihull", "Redditch", "Bromsgrove", "Kidderminster", "Worcester", "Evesham", "Banbury", "Daventry", "Northampton", "Lichfield", "Tamworth", "Burton upon Trent", "Hinckley")
    South    = @("Petworth", "Midhurst", "Haslemere", "Liphook", "Alton", "Farnham", "Godalming", "Guildford", "Horsham", "Billingshurst", "Pulborough", "Chichester", "Bognor Regis", "Havant", "Waterlooville", "Portsmouth", "Fareham", "Winchester", "Alresford")
}
$bounds = @{
    North    = @{ latMin = 53.10; latMax = 53.50; lonMin = -2.50; lonMax = -1.90 }
    Midlands = @{ latMin = 52.00; latMax = 52.70; lonMin = -2.30; lonMax = -0.90 }
    South    = @{ latMin = 50.80; latMax = 51.20; lonMin = -1.40; lonMax = -0.40 }
}
$kinds = @(
    @{ suffix = "Local";   voltage = 100000000; minCustomers = 800;   maxCustomers = 4000  },
    @{ suffix = "Primary"; voltage = 100000001; minCustomers = 4000;  maxCustomers = 20000 },
    @{ suffix = "Grid";    voltage = 100000002; minCustomers = 20000; maxCustomers = 60000 },
    @{ suffix = "BSP";     voltage = 100000003; minCustomers = 60000; maxCustomers = 95000 }
)
# Weighted so most substations are Local or Primary and only a few are BSP.
$kindPattern = @(0, 1, 0, 1, 2, 0, 1, 0, 2, 1, 0, 3, 1, 0, 2, 1, 0, 1, 3)

Get-Random -SetSeed 4 | Out-Null

$created = 0
$index = 0
foreach ($regionName in @("North", "Midlands", "South")) {
    $b = $bounds[$regionName]
    for ($i = 0; $i -lt 19; $i++) {
        $index++
        $kind = $kinds[$kindPattern[$i]]
        $customers = Get-Random -Minimum $kind.minCustomers -Maximum $kind.maxCustomers
        $lat = [math]::Round((Get-Random -Minimum ($b.latMin * 10000) -Maximum ($b.latMax * 10000)) / 10000, 4)
        $lon = [math]::Round((Get-Random -Minimum ($b.lonMin * 10000) -Maximum ($b.lonMax * 10000)) / 10000, 4)
        $name = "HM-{0:D2} {1} {2}" -f $index, $towns[$regionName][$i], $kind.suffix

        $body = @{
            hel_name                      = $name
            hel_voltagelevel              = $kind.voltage
            hel_customerscount            = [int]$customers
            hel_latitude                  = $lat
            hel_longitude                 = $lon
            "${regionNav}@odata.bind"     = "/hel_regions($($regions[$regionName]))"
        }
        $r = Invoke-Dv POST "hel_substations" $body
        $created++
        Write-Host ("Substation   {0,-40} {1,-9} customers {2,6}" -f $name, $regionName, $customers)
    }
}

$countAfter = Invoke-Dv GET "hel_substations?`$select=hel_substationid&`$top=1&`$count=true"
Write-Host ""
Write-Host ("Created {0} substations. Substations in DEV now: {1}" -f $created, [int]$countAfter.'@odata.count')
