# HELIOS solution export and unpack
# Exports each solution as unmanaged and managed, then unpacks both into source.
# Run from the repository root with HELIOS-DEV-SPN selected.

$root = "C:\dev\helios-platform"
$solutions = @("HELIOSCore","HELIOSLogic","HELIOSAutomation","HELIOSAgent","HELIOSExperience")

Set-Location $root
New-Item -Path (Join-Path $root "artifacts") -ItemType Directory -Force | Out-Null

foreach ($s in $solutions) {
    Write-Host ""
    Write-Host "=== $s ===" -ForegroundColor Cyan

    $unmanagedZip = Join-Path $root "artifacts\$s.zip"
    $managedZip   = Join-Path $root "artifacts\$($s)_managed.zip"
    $folder       = Join-Path $root "solutions\$s"

    pac solution export --name $s --path $unmanagedZip --overwrite
    if ($LASTEXITCODE -ne 0) { Write-Host "EXPORT UNMANAGED FAILED: $s" -ForegroundColor Red; break }

    pac solution export --name $s --path $managedZip --managed --overwrite
    if ($LASTEXITCODE -ne 0) { Write-Host "EXPORT MANAGED FAILED: $s" -ForegroundColor Red; break }

    pac solution unpack --zipfile $unmanagedZip --folder $folder --packagetype Both --allowWrite --allowDelete --clobber
    if ($LASTEXITCODE -ne 0) { Write-Host "UNPACK FAILED: $s" -ForegroundColor Red; break }

    Write-Host "OK: $s" -ForegroundColor Green
}
