param([Parameter(Mandatory)][string]$Archive, [Parameter(Mandatory)][string]$OutputPath)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
. "$PSScriptRoot\backup-windows-crypto.ps1"
if (Test-Path -LiteralPath $OutputPath) { throw 'Restore output already exists. Choose a new file; no existing files are overwritten.' }
$verified = Test-MealQEncryptedArchive -Path $Archive -RestorePath $OutputPath
Write-Output "Authenticated archive decrypted and SHA-256 verified: $($verified.Snapshot)"
