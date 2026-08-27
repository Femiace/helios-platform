# HELIOS solution export and unpack
# Publishes customizations, exports each solution as unmanaged and managed,
# then unpacks both into source. Run from anywhere.
#
# Order is DEV dependency order by convention only. Export order has no
# technical significance; import order does.

$ErrorActionPreference = "Stop"

$root      = "C:\dev\helios-platform"
$profile   = "HELIOS-DEV-SPN"
$solutions = @("HELIOSCore","HELIOSLogic","HELIOSAutomation","HELIOSAgent","HELIOSExperience")

Set-Location $root
New-Item -Path (Join-Path $root "artifacts") -ItemType Directory -Force | Out-Null

Write-Host ""
Write-Host "Selecting auth profile: $profile" -ForegroundColor Cyan
pac auth select --name $profile
if ($LASTEXITCODE -ne 0) {
    Write-Host "AUTH SELECT FAILED: $profile" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Publishing all customizations" -ForegroundColor Cyan
pac solution publish
if ($LASTEXITCODE -ne 0) {
    Write-Host "PUBLISH FAILED" -ForegroundColor Red
    exit 1
}

foreach ($s in $solutions) {
    Write-Host ""
    Write-Host "=== $s ===" -ForegroundColor Cyan

    $unmanagedZip = Join-Path $root "artifacts\$s.zip"
    $managedZip   = Join-Path $root "artifacts\$($s)_managed.zip"
    $folder       = Join-Path $root "solutions\$s"

    pac solution export --name $s --path $unmanagedZip --overwrite
    if ($LASTEXITCODE -ne 0) {
        Write-Host "EXPORT UNMANAGED FAILED: $s" -ForegroundColor Red
        exit 1
    }

    pac solution export --name $s --path $managedZip --managed --overwrite
    if ($LASTEXITCODE -ne 0) {
        Write-Host "EXPORT MANAGED FAILED: $s" -ForegroundColor Red
        exit 1
    }

    pac solution unpack --zipfile $unmanagedZip --folder $folder --packagetype Both --allowWrite --allowDelete --clobber
    if ($LASTEXITCODE -ne 0) {
        Write-Host "UNPACK FAILED: $s" -ForegroundColor Red
        exit 1
    }

    Write-Host "OK: $s" -ForegroundColor Green
}

Write-Host ""
Write-Host "All $($solutions.Count) solutions exported and unpacked." -ForegroundColor Green
Write-Host "Next: git status, read the diff, then commit." -ForegroundColor Yellow
exit 0
