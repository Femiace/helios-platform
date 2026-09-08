<#
.SYNOPSIS
    Seeds a small throwaway verification data set into HELIOS DEV for Module 3.

.DESCRIPTION
    Version 3.

    Authenticates as the HELIOS ALM Service Principal using the OAuth 2.0 client
    credentials flow, prints a row-count report for the tables it cares about,
    then creates rows through the Dataverse Web API in dependency order:
    substations, grid assets, engineer profiles, outages, work orders and
    inspections. Regions are reused if rows named North, Midlands and South
    already exist, and created only if they are missing.

    Run with -Reset to delete every row in the six seeded tables plus any field
    notes, then exit. Regions, SLA definitions and compliance rules are never
    deleted by this script.

    This is not HeliosDataSeeder. That console app arrives between Modules 4
    and 5, uses CreateMultipleRequest, and targets the volumes in document 04
    Section 3. This script exists only so Module 3 forms, views, subgrids and
    scripts have something to prove against.

.PARAMETER EnvironmentUrl
    Dataverse environment URL with no trailing slash.

.PARAMETER TenantId
    Entra tenant id. Taken from the Module 1 notes. If the token call fails
    with AADSTS90002, correct this value from scripts/export-all.ps1.

.PARAMETER ClientId
    Application (client) id of the HELIOS ALM Service Principal.

.PARAMETER OwnerUserId
    systemuserid of HELIOS Admin. User-owned rows are assigned to this user so
    they show up in owner-scoped views and so the application user does not
    end up owning business data.

.PARAMETER Reset
    Deletes all rows from the six seeded tables and from Field Notes, in
    reverse dependency order, then exits. Creates nothing.

.EXAMPLE
    .\scripts\seed-verification-data.ps1
    .\scripts\seed-verification-data.ps1 -Reset

.NOTES
    Module 3, Stage 2a.
    Requires HELIOS_SPN_SECRET to be set as a user environment variable and the
    terminal to have been opened after it was set.

    Changes from version 2:
    - Reads DateTimeBehavior for every date column on the seeded tables at
      startup and prints it. A column with DateOnly behaviour is typed
      Edm.Date by the Web API and only accepts YYYY-MM-DD. The other two
      behaviours accept the full YYYY-MM-DDTHH:MM:SSZ form. Version 2 sent
      the long form everywhere and failed on hel_asset.hel_installdate.

    Changes from version 1:
    - Prints a row-count report before doing anything.
    - Never deletes regions. hel_sladefinition has a Restrict Delete
      relationship to hel_region, so a region with SLA definitions cannot be
      deleted and the version 1 reset stopped on error 0x80040227.
    - Reuses existing regions by name instead of creating duplicates.
    - The guard checks the six seeded tables, not regions.
    - Reset clears field notes first so Stage 4 timeline rows never block it.
#>
[CmdletBinding()]
param(
    [string]$EnvironmentUrl = "https://helios-dev.crm11.dynamics.com",
    [string]$TenantId       = "e9ca2f7d-a4ad-47ec-9db0-89a64bdfae0e",
    [string]$ClientId       = "1070f820-8eb7-44fa-a135-f094d5c15310",
    [string]$OwnerUserId    = "831d957f-fd92-f111-b8db-6045bd0b8dbe",
    [switch]$Reset
)

$ErrorActionPreference = "Stop"

# ---------------------------------------------------------------------------
# 1. Token.
#    OAuth 2.0 client credentials flow against the Entra v2.0 endpoint.
#    No user is involved, so there is no sign-in prompt. The scope is the
#    environment URL plus /.default, which means "every permission this app
#    has already been granted on that resource". Dataverse maps the
#    application id to the application user created in Module 1 and applies
#    that user's security roles to every call.
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
            # Without this header a create returns 204 and only an OData-EntityId
            # header. With it, Dataverse returns 201 and the full created row,
            # which is how the autonumber values get printed below.
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
# 2. Lookup binding map.
#    A lookup is set on create with a property named
#    "<navigation property>@odata.bind" whose value is "/<entity set>(<id>)".
#    For custom lookups the navigation property name is case sensitive and is
#    not reliably the same as the column logical name. The only authoritative
#    source is ReferencingEntityNavigationPropertyName on the one-to-many
#    relationship, so read it from metadata once instead of guessing.
# ---------------------------------------------------------------------------
$entitySets = @{
    hel_region          = "hel_regions"
    hel_substation      = "hel_substations"
    hel_asset           = "hel_assets"
    hel_outage          = "hel_outages"
    hel_engineerprofile = "hel_engineerprofiles"
    systemuser          = "systemusers"
}

$relQuery = "RelationshipDefinitions/Microsoft.Dynamics.CRM.OneToManyRelationshipMetadata" +
    "?`$select=ReferencingEntity,ReferencingAttribute,ReferencedEntity,ReferencingEntityNavigationPropertyName" +
    "&`$filter=ReferencingEntity eq 'hel_substation' or ReferencingEntity eq 'hel_asset'" +
    " or ReferencingEntity eq 'hel_engineerprofile' or ReferencingEntity eq 'hel_outage'" +
    " or ReferencingEntity eq 'hel_workorder' or ReferencingEntity eq 'hel_inspection'"

$navMap = @{}
foreach ($rel in (Invoke-Dv GET $relQuery).value) {
    $navMap["$($rel.ReferencingEntity).$($rel.ReferencingAttribute)"] = @{
        nav    = $rel.ReferencingEntityNavigationPropertyName
        target = $rel.ReferencedEntity
    }
}

function Add-Lookup {
    param(
        [hashtable]$Body,
        [string]$Entity,
        [string]$Attribute,
        [string]$TargetId
    )
    $key = "$Entity.$Attribute"
    if (-not $navMap.ContainsKey($key)) { throw "No one-to-many relationship found for $key" }
    $m = $navMap[$key]
    if (-not $entitySets.ContainsKey($m.target)) { throw "Add an entity set mapping for $($m.target) before binding $key" }
    $Body["$($m.nav)@odata.bind"] = "/$($entitySets[$m.target])($TargetId)"
}

# ---------------------------------------------------------------------------
# 3. Date behaviour map.
#    Every date column has a DateTimeBehavior of UserLocal, DateOnly or
#    TimeZoneIndependent. DateOnly columns are typed Edm.Date by the Web API
#    and accept only YYYY-MM-DD. The other two accept the full ISO form with
#    a time and a Z. Read the behaviour once and format each value to match.
# ---------------------------------------------------------------------------
$dateBehaviors = @{}
foreach ($entity in @("hel_asset", "hel_engineerprofile", "hel_outage", "hel_workorder", "hel_inspection")) {
    $q = "EntityDefinitions(LogicalName='$entity')/Attributes/Microsoft.Dynamics.CRM.DateTimeAttributeMetadata?`$select=LogicalName,Format,DateTimeBehavior"
    foreach ($col in (Invoke-Dv GET $q).value) {
        $dateBehaviors["$entity.$($col.LogicalName)"] = $col.DateTimeBehavior.Value
    }
}

function Add-Date {
    param(
        [hashtable]$Body,
        [string]$Entity,
        [string]$Attribute,
        [string]$Value
    )
    if (-not $Value) { return }
    $key = "$Entity.$Attribute"
    if (-not $dateBehaviors.ContainsKey($key)) { throw "No date column metadata found for $key" }
    if ($dateBehaviors[$key] -eq "DateOnly") {
        $Body[$Attribute] = $Value.Substring(0, 10)
    }
    else {
        $Body[$Attribute] = $Value
    }
}

# ---------------------------------------------------------------------------
# 4. State report. Always runs. Shows what is in DEV before anything happens.
#    $count=true asks Dataverse to include the total matching row count in
#    the response as @odata.count, independent of how many rows come back.
# ---------------------------------------------------------------------------
$stateTables = @(
    @{ set = "hel_regions";          id = "hel_regionid" },
    @{ set = "hel_sladefinitions";   id = "hel_sladefinitionid" },
    @{ set = "hel_compliancerules";  id = "hel_complianceruleid" },
    @{ set = "hel_substations";      id = "hel_substationid" },
    @{ set = "hel_assets";           id = "hel_assetid" },
    @{ set = "hel_engineerprofiles"; id = "hel_engineerprofileid" },
    @{ set = "hel_outages";          id = "hel_outageid" },
    @{ set = "hel_workorders";       id = "hel_workorderid" },
    @{ set = "hel_inspections";      id = "hel_inspectionid" },
    @{ set = "hel_fieldnotes";       id = "activityid" }
)

Write-Host ""
Write-Host "Current row counts in DEV:"
$counts = @{}
foreach ($t in $stateTables) {
    $resp = Invoke-Dv GET "$($t.set)?`$select=$($t.id)&`$top=1&`$count=true"
    $counts[$t.set] = [int]$resp.'@odata.count'
    Write-Host ("  {0,-22} {1,4}" -f $t.set, $counts[$t.set])
}

$regionRows = @((Invoke-Dv GET "hel_regions?`$select=hel_regionid,hel_name").value)
if ($regionRows.Count -gt 0) {
    Write-Host ("  Existing regions:     " + (($regionRows | ForEach-Object { $_.hel_name }) -join ", "))
}

Write-Host ""
Write-Host "Date column behaviours:"
foreach ($key in ($dateBehaviors.Keys | Where-Object { $_ -like "*.hel_*" } | Sort-Object)) {
    Write-Host ("  {0,-44} {1}" -f $key, $dateBehaviors[$key])
}
Write-Host ""

# ---------------------------------------------------------------------------
# 5. Reset. Deletes in reverse dependency order so no lookup blocks a delete.
#    Field notes go first because they can be regarding an outage or a work
#    order. Regions are never deleted: hel_sladefinition restricts that.
# ---------------------------------------------------------------------------
$resetOrder = @(
    "hel_fieldnotes",
    "hel_workorders",
    "hel_inspections",
    "hel_outages",
    "hel_engineerprofiles",
    "hel_assets",
    "hel_substations"
)

if ($Reset) {
    foreach ($set in $resetOrder) {
        $idName = ($stateTables | Where-Object { $_.set -eq $set }).id
        $rows   = @((Invoke-Dv GET "$($set)?`$select=$idName").value)
        foreach ($row in $rows) {
            Invoke-Dv DELETE "$($set)($($row.$idName))" | Out-Null
        }
        Write-Host ("Deleted {0} rows from {1}" -f $rows.Count, $set)
    }
    Write-Host ""
    Write-Host "Reset complete. Regions, SLA definitions and compliance rules were left in place."
    return
}

# ---------------------------------------------------------------------------
# 6. Guard. Refuse to seed on top of existing data in the seeded tables.
# ---------------------------------------------------------------------------
$dirty = @($resetOrder | Where-Object { $counts[$_] -gt 0 })
if ($dirty.Count -gt 0) {
    throw ("These tables already have rows: {0}. Run the script with -Reset first." -f ($dirty -join ", "))
}

$ownerBind = "/systemusers($OwnerUserId)"

# ---------------------------------------------------------------------------
# 7. Regions. Reuse by name, create only what is missing.
#    Hashtable keys are case insensitive, so "north" matches "North".
# ---------------------------------------------------------------------------
$regions = @{}
foreach ($existing in $regionRows) {
    $regions[$existing.hel_name] = $existing.hel_regionid
}
foreach ($name in @("North", "Midlands", "South")) {
    if ($regions.ContainsKey($name)) {
        Write-Host "Region       $name  (existing, reused)"
        continue
    }
    $r = Invoke-Dv POST "hel_regions" @{ hel_name = $name }
    $regions[$name] = $r.hel_regionid
    Write-Host "Region       $name  (created)"
}

# ---------------------------------------------------------------------------
# 8. Substations
#    hel_voltagelevel: 100000000=400V  100000001=11kV  100000002=33kV  100000003=132kV
# ---------------------------------------------------------------------------
$substations = @{}
$substationData = @(
    @{ name = "Alderley Edge Primary"; region = "North";    voltage = 100000003; customers = 42000; lat = 53.30; lon = -2.24 },
    @{ name = "Kenilworth Grid";       region = "Midlands"; voltage = 100000002; customers = 28000; lat = 52.34; lon = -1.58 },
    @{ name = "Petersfield Main";      region = "South";    voltage = 100000001; customers = 15000; lat = 51.00; lon = -0.94 }
)
foreach ($s in $substationData) {
    $body = @{
        hel_name           = $s.name
        hel_voltagelevel   = $s.voltage
        hel_customerscount = $s.customers
        hel_latitude       = $s.lat
        hel_longitude      = $s.lon
    }
    Add-Lookup $body "hel_substation" "hel_region" $regions[$s.region]
    $r = Invoke-Dv POST "hel_substations" $body
    $substations[$s.name] = $r.hel_substationid
    Write-Host "Substation   $($s.name)"
}

# ---------------------------------------------------------------------------
# 9. Grid assets
#    hel_assettype:   100000000=Transformer  100000001=Switchgear  100000002=Circuit Breaker
#                     100000003=Cable Section  100000004=Protection Relay
#    hel_criticality: 100000000=Low  100000001=Medium  100000002=High  100000003=Critical
#    hel_status:      100000000=In Service  100000001=Under Maintenance  100000002=Faulted  100000003=Retired
#    hel_serialnumber is the alternate key, so every serial must be unique.
#    TX-N-0001 is Faulted and carries the open Critical outage.
#    PR-S-0006 is Retired so Stage 8 can prove addCustomFilter excludes it.
# ---------------------------------------------------------------------------
$assets = @{}
$assetData = @(
    @{ serial = "TX-N-0001"; name = "Alderley T1 33/11kV Transformer";    sub = "Alderley Edge Primary"; type = 100000000; crit = 100000003; health = 42.5; status = 100000002; cost = 485000;  installed = "2004-06-15T00:00:00Z" },
    @{ serial = "SG-N-0002"; name = "Alderley 11kV Switchboard";          sub = "Alderley Edge Primary"; type = 100000001; crit = 100000002; health = 71.0; status = 100000000; cost = 120000;  installed = "2011-03-02T00:00:00Z" },
    @{ serial = "CB-M-0003"; name = "Kenilworth Feeder 3 Breaker";        sub = "Kenilworth Grid";       type = 100000002; crit = 100000001; health = 88.0; status = 100000000; cost = 35000;   installed = "2016-09-20T00:00:00Z" },
    @{ serial = "TX-M-0004"; name = "Kenilworth T2 132/33kV Transformer"; sub = "Kenilworth Grid";       type = 100000000; crit = 100000003; health = 55.0; status = 100000001; cost = 1250000; installed = "1998-11-30T00:00:00Z" },
    @{ serial = "CS-S-0005"; name = "Petersfield Cable Section 7";        sub = "Petersfield Main";      type = 100000003; crit = 100000000; health = 93.0; status = 100000000; cost = 18000;   installed = "2020-01-10T00:00:00Z" },
    @{ serial = "PR-S-0006"; name = "Petersfield Protection Relay 2";     sub = "Petersfield Main";      type = 100000004; crit = 100000001; health = 64.0; status = 100000003; cost = 9500;    installed = "2008-05-05T00:00:00Z" }
)
foreach ($a in $assetData) {
    $body = @{
        hel_name            = $a.name
        hel_serialnumber    = $a.serial
        hel_assettype       = $a.type
        hel_criticality     = $a.crit
        hel_healthindex     = $a.health
        hel_status          = $a.status
        hel_replacementcost = $a.cost
    }
    Add-Date   $body "hel_asset" "hel_installdate" $a.installed
    Add-Lookup $body "hel_asset" "hel_substation"  $substations[$a.sub]
    $r = Invoke-Dv POST "hel_assets" $body
    $assets[$a.serial] = $r.hel_assetid
    Write-Host "Asset        $($a.serial)  $($a.name)"
}

# ---------------------------------------------------------------------------
# 10. Engineer profiles
#     All three bind hel_systemuser to HELIOS Admin because it is the only human
#     user in the tenant. The profile name is what the Dispatch Board shows.
#     hel_skills (global): 100000000=HV Switching  100000001=LV Switching  100000002=Cable Jointing
#                          100000003=Transformer Maintenance  100000004=Protection Systems
#                          100000005=Overhead Lines  100000006=Confined Space
#     A multi-select choice goes over the wire as one comma separated string.
#     Chloe Marsh is unavailable so the Dispatch Board has something to filter out.
# ---------------------------------------------------------------------------
$engineers = @{}
$engineerData = @(
    @{ name = "Amara Okafor";  region = "North";    skills = "100000000,100000003";           available = $true;  cert = "2027-08-31T00:00:00Z" },
    @{ name = "Ben Whitfield"; region = "Midlands"; skills = "100000000,100000001,100000004"; available = $true;  cert = "2026-11-30T00:00:00Z" },
    @{ name = "Chloe Marsh";   region = "South";    skills = "100000002,100000005,100000006"; available = $false; cert = "2027-03-15T00:00:00Z" }
)
foreach ($e in $engineerData) {
    $body = @{
        hel_name             = $e.name
        hel_skills           = $e.skills
        hel_available        = $e.available
        "ownerid@odata.bind" = $ownerBind
    }
    Add-Date   $body "hel_engineerprofile" "hel_certificationexpiry" $e.cert
    Add-Lookup $body "hel_engineerprofile" "hel_region"              $regions[$e.region]
    Add-Lookup $body "hel_engineerprofile" "hel_systemuser"          $OwnerUserId
    $r = Invoke-Dv POST "hel_engineerprofiles" $body
    $engineers[$e.name] = $r.hel_engineerprofileid
    Write-Host "Engineer     $($e.name)"
}

# ---------------------------------------------------------------------------
# 11. Outages
#     hel_name is autonumber OUT-{SEQNUM:6}, so it is deliberately not set.
#     hel_severity (global): 100000000=Minor  100000001=Moderate  100000002=Major  100000003=Critical
#     hel_cause:             100000000=Equipment Failure  100000001=Weather  100000002=Third Party Damage
#                            100000003=Planned Maintenance  100000004=Unknown
#     O1 is the open Critical outage that Stage 9 and Stage 10 act on.
#     O2 is closed, SLA breached, with compensation, so the secured column has a value.
# ---------------------------------------------------------------------------
$outages = @{}
$outageData = @(
    @{ key = "O1"; asset = "TX-N-0001"; start = "2026-09-07T06:12:00Z"; est = "2026-09-08T18:00:00Z"; actual = $null;                   cause = 100000000; sev = 100000003; customers = 38500; sla = $false; comp = 0 },
    @{ key = "O2"; asset = "TX-M-0004"; start = "2026-09-06T14:40:00Z"; est = "2026-09-07T02:00:00Z"; actual = "2026-09-07T03:25:00Z"; cause = 100000001; sev = 100000002; customers = 12000; sla = $true;  comp = 18750 },
    @{ key = "O3"; asset = "CB-M-0003"; start = "2026-09-05T22:05:00Z"; est = "2026-09-06T01:00:00Z"; actual = "2026-09-06T00:40:00Z"; cause = 100000002; sev = 100000001; customers = 1800;  sla = $false; comp = 0 },
    @{ key = "O4"; asset = "CS-S-0005"; start = "2026-09-08T09:00:00Z"; est = "2026-09-08T12:00:00Z"; actual = $null;                   cause = 100000003; sev = 100000000; customers = 240;   sla = $false; comp = 0 }
)
foreach ($o in $outageData) {
    $body = @{
        hel_cause             = $o.cause
        hel_severity          = $o.sev
        hel_customersaffected = $o.customers
        hel_slabreached       = $o.sla
        hel_compensationdue   = $o.comp
        "ownerid@odata.bind"  = $ownerBind
    }
    Add-Date   $body "hel_outage" "hel_starttime"            $o.start
    Add-Date   $body "hel_outage" "hel_estimatedrestoration" $o.est
    Add-Date   $body "hel_outage" "hel_actualrestoration"    $o.actual
    Add-Lookup $body "hel_outage" "hel_asset"                $assets[$o.asset]
    $r = Invoke-Dv POST "hel_outages" $body
    $outages[$o.key] = $r.hel_outageid
    Write-Host "Outage       $($r.hel_name)  ($($o.key) on $($o.asset))"
}

# ---------------------------------------------------------------------------
# 12. Work orders
#     hel_name is autonumber WO-{SEQNUM:6}, so it is deliberately not set.
#     hel_priority: 100000000=Low  100000001=Normal  100000002=High  100000003=Emergency
#     hel_status:   100000000=Draft  100000001=Scheduled  100000002=In Progress  100000003=Complete  100000004=Cancelled
#     hel_engineer binds to whichever table the lookup actually targets. The
#     script reads that from metadata and prints it, rather than assuming.
#     The sixth work order has no outage so the null lookup case exists.
# ---------------------------------------------------------------------------
$engineerTarget = $navMap["hel_workorder.hel_engineer"].target
Write-Host "hel_workorder.hel_engineer targets: $engineerTarget"
$assignedEngineerId = if ($engineerTarget -eq "systemuser") { $OwnerUserId } else { $engineers["Amara Okafor"] }

$workOrderData = @(
    @{ outage = "O1";  asset = "TX-N-0001"; sched = "2026-09-07T08:00:00Z"; pri = 100000003; status = 100000002; safe = $true;  assign = $true  },
    @{ outage = "O1";  asset = "SG-N-0002"; sched = "2026-09-07T10:00:00Z"; pri = 100000002; status = 100000001; safe = $false; assign = $true  },
    @{ outage = "O1";  asset = "TX-N-0001"; sched = "2026-09-08T07:00:00Z"; pri = 100000002; status = 100000000; safe = $false; assign = $false },
    @{ outage = "O2";  asset = "TX-M-0004"; sched = "2026-09-06T16:00:00Z"; pri = 100000002; status = 100000003; safe = $true;  assign = $true  },
    @{ outage = "O3";  asset = "CB-M-0003"; sched = "2026-09-05T23:00:00Z"; pri = 100000001; status = 100000003; safe = $true;  assign = $true  },
    @{ outage = $null; asset = "PR-S-0006"; sched = "2026-09-10T09:00:00Z"; pri = 100000000; status = 100000004; safe = $false; assign = $false }
)
foreach ($w in $workOrderData) {
    $body = @{
        hel_priority         = $w.pri
        hel_status           = $w.status
        hel_safetyclearance  = $w.safe
        "ownerid@odata.bind" = $ownerBind
    }
    Add-Date   $body "hel_workorder" "hel_scheduledstart" $w.sched
    Add-Lookup $body "hel_workorder" "hel_asset"          $assets[$w.asset]
    if ($w.outage) { Add-Lookup $body "hel_workorder" "hel_outage"   $outages[$w.outage] }
    if ($w.assign) { Add-Lookup $body "hel_workorder" "hel_engineer" $assignedEngineerId }
    $r = Invoke-Dv POST "hel_workorders" $body
    Write-Host "Work order   $($r.hel_name)  ($($w.asset))"
}

# ---------------------------------------------------------------------------
# 13. Inspections
# ---------------------------------------------------------------------------
$inspectionData = @(
    @{ name = "INS-2026-0451"; asset = "TX-N-0001"; date = "2026-08-20T00:00:00Z"; findings = "Dissolved gas analysis elevated. Bushing 2 shows discolouration. Recommend load reduction."; health = 44.0 },
    @{ name = "INS-2026-0452"; asset = "TX-M-0004"; date = "2026-08-28T00:00:00Z"; findings = "Tap changer contacts worn beyond tolerance. Maintenance window booked.";                 health = 55.0 },
    @{ name = "INS-2026-0453"; asset = "CS-S-0005"; date = "2026-09-01T00:00:00Z"; findings = "No defects found. Sheath integrity good.";                                              health = 93.0 }
)
foreach ($i in $inspectionData) {
    $body = @{
        hel_name                 = $i.name
        hel_findings             = $i.findings
        hel_resultinghealthindex = $i.health
        "ownerid@odata.bind"     = $ownerBind
    }
    Add-Date   $body "hel_inspection" "hel_inspectiondate" $i.date
    Add-Lookup $body "hel_inspection" "hel_asset"          $assets[$i.asset]
    $r = Invoke-Dv POST "hel_inspections" $body
    Write-Host "Inspection   $($i.name)"
}

Write-Host ""
Write-Host "Seed complete. 25 rows created: 3 substations, 6 assets, 3 engineer profiles, 4 outages, 6 work orders, 3 inspections, plus any regions that were missing."
