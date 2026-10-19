param([string]$Destination = "$env:USERPROFILE\MealQBackups")
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
if (-not $IsWindows -or $PSVersionTable.PSVersion.Major -lt 7) { throw 'Requires Windows PowerShell 7+.' }
$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$null = New-Item -ItemType Directory -Path $Destination -Force
$operations = Join-Path $Destination 'operations'
$safety = Join-Path $Destination "installation-history\$([DateTime]::Now.ToString('yyyyMMddTHHmmssfffffff'))"
$null = New-Item -ItemType Directory -Path $operations, $safety -Force
# Restrict backup ciphertext, logs and operations to this account, SYSTEM and administrators.
$directory = [IO.DirectoryInfo]::new($Destination)
$acl = [IO.FileSystemAclExtensions]::GetAccessControl($directory, [Security.AccessControl.AccessControlSections]::Access)
$aclBefore = $acl.GetSecurityDescriptorSddlForm([Security.AccessControl.AccessControlSections]::Access)
[IO.File]::WriteAllText((Join-Path $safety 'previous-directory-acl.txt'), $aclBefore)
$acl.SetAccessRuleProtection($true, $false)
foreach ($rule in @($acl.GetAccessRules($true, $true, [Security.Principal.SecurityIdentifier]))) { $null = $acl.RemoveAccessRuleSpecific($rule) }
foreach ($sid in @($identity.User, [Security.Principal.SecurityIdentifier]::new('S-1-5-18'), [Security.Principal.SecurityIdentifier]::new('S-1-5-32-544'))) {
    $acl.AddAccessRule([Security.AccessControl.FileSystemAccessRule]::new($sid, 'FullControl', 'ContainerInherit, ObjectInherit', 'None', 'Allow'))
}
$aclAfter = $acl.GetSecurityDescriptorSddlForm([Security.AccessControl.AccessControlSections]::Access)
if ($aclBefore -ne $aclAfter) { [IO.FileSystemAclExtensions]::SetAccessControl($directory, $acl) }
foreach ($script in @('backup-sync-windows.ps1', 'backup-windows-crypto.ps1', 'backup-decrypt-windows.ps1')) {
    $existing = Join-Path $operations $script
    if (Test-Path -LiteralPath $existing) { Copy-Item -LiteralPath $existing -Destination (Join-Path $safety $script) }
    Copy-Item -LiteralPath (Join-Path $PSScriptRoot $script) -Destination $existing
}
$taskName = 'MealQ-OffPi-Backup'
$existingTask = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($null -ne $existingTask) { Export-ScheduledTask -TaskName $taskName | Set-Content -LiteralPath (Join-Path $safety 'previous-task.xml') -Encoding utf8 }
$pwsh = (Get-Command pwsh.exe).Source
$sync = Join-Path $operations 'backup-sync-windows.ps1'
$action = New-ScheduledTaskAction -Execute $pwsh -Argument "-NoLogo -NoProfile -NonInteractive -File `"$sync`" -Destination `"$Destination`""
$trigger = New-ScheduledTaskTrigger -Daily -At '04:10'
$principal = New-ScheduledTaskPrincipal -UserId $identity.Name -LogonType Interactive -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Minutes 30) -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 5) -MultipleInstances IgnoreNew
$description = 'Copies the latest verified MealQ backup over SSH/Tailscale to a DPAPI/AES encrypted local archive. Runs while this user is signed in; catches up missed runs. No automatic deletion.'
$null = Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Description $description -Force
Write-Output "Installed $taskName daily at 04:10 Windows local time; encrypted backups: $Destination"
