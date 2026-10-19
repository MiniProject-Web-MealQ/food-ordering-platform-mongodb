param([string]$Destination = "$env:USERPROFILE\MealQBackups", [string]$Server = 'linapspi4@100.112.221.80')
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
. "$PSScriptRoot\backup-windows-crypto.ps1"
if ($Server -notmatch '^[a-zA-Z0-9_]+@[a-zA-Z0-9.:-]+$') { throw 'Invalid SSH server.' }
$null = New-Item -ItemType Directory -Path $Destination -Force
$mutex = [Threading.Mutex]::new($false, 'Local\MealQ-OffPi-Backup')
if (-not $mutex.WaitOne(0)) { $mutex.Dispose(); exit 0 }
try {
    $ssh = (Get-Command ssh.exe -ErrorAction Stop).Source
    $remoteRoot = '/home/linapspi4/mealq-app/shared/backups/daily'
    $info = & $ssh -o BatchMode=yes -o ConnectTimeout=10 -o ServerAliveInterval=15 -o ServerAliveCountMax=3 $Server "cd $remoteRoot/latest && cat COMPLETE && cat package.sha256 && stat -c %s package.tar.gz"
    if ($LASTEXITCODE -ne 0 -or $info.Count -ne 3) { throw 'Cannot read latest complete Pi backup over SSH.' }
    $snapshot = $info[0].Trim()
    $checksum = ($info[1] -split '\s+')[0]
    $bytes = 0L
    if ($snapshot -notmatch '^\d{8}T\d{6}[+-]\d{4}-\d+$' -or $checksum -notmatch '^[a-f0-9]{64}$' -or -not [long]::TryParse($info[2], [ref]$bytes) -or $bytes -le 0) { throw 'Invalid remote backup metadata.' }
    $target = Join-Path $Destination "$snapshot.mealq"
    if (-not (Test-Path -LiteralPath $target)) {
        $partial = "$target.$([guid]::NewGuid().ToString('N')).partial"
        $start = [Diagnostics.ProcessStartInfo]::new($ssh)
        $start.UseShellExecute = $false
        $start.CreateNoWindow = $true
        $start.RedirectStandardOutput = $true
        $start.RedirectStandardError = $true
        foreach ($arg in @('-o', 'BatchMode=yes', '-o', 'ConnectTimeout=10', '-o', 'ServerAliveInterval=15', '-o', 'ServerAliveCountMax=3', $Server, "cat $remoteRoot/$snapshot/package.tar.gz")) { $start.ArgumentList.Add($arg) }
        $process = [Diagnostics.Process]::new()
        $process.StartInfo = $start
        try {
            $null = $process.Start()
            $errorRead = $process.StandardError.ReadToEndAsync()
            Protect-MealQArchive -Process $process -Path $partial -Metadata @{snapshot=$snapshot; sha256=$checksum; bytes=$bytes; server=$Server; created_at=[DateTime]::UtcNow.ToString('o')}
            $null = $errorRead.GetAwaiter().GetResult()
            $verified = Test-MealQEncryptedArchive -Path $partial
            [IO.File]::Move($partial, $target)
        } finally { $process.Dispose() }
    }
    $verified = Test-MealQEncryptedArchive -Path $target
    $backupTime = [DateTimeOffset]::ParseExact($snapshot.Substring(0,20), "yyyyMMdd'T'HHmmsszzz", [Globalization.CultureInfo]::InvariantCulture)
    if (([DateTimeOffset]::UtcNow - $backupTime).TotalHours -gt 36) { throw 'The latest Pi backup is over 36 hours old. Encrypted copy retained; check the Pi backup cron log.' }
    $record = @{verified_at=[DateTime]::UtcNow.ToString('o'); snapshot=$verified.Snapshot; bytes=$verified.Bytes; sha256=$verified.Sha256; file=$target; result='verified'; retention='No automatic deletion'}
    # Append immutable records; do not overwrite the previous verification report.
    $report = Join-Path $Destination "sync-$([DateTime]::UtcNow.ToString('yyyyMMddTHHmmssfffffffZ')).json"
    [IO.File]::WriteAllText($report, ($record | ConvertTo-Json))
    Write-Output "Verified off-Pi encrypted backup: $($verified.Snapshot), $($verified.Bytes) bytes"
} catch {
    $failure = @{verified_at=[DateTime]::UtcNow.ToString('o'); result='failed'; message=$_.Exception.Message}
    $report = Join-Path $Destination "sync-failed-$([DateTime]::UtcNow.ToString('yyyyMMddTHHmmssfffffffZ')).json"
    [IO.File]::WriteAllText($report, ($failure | ConvertTo-Json))
    throw
} finally { $mutex.ReleaseMutex(); $mutex.Dispose() }
