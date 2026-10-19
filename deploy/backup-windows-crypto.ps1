# AES-256-CBC encrypt-then-HMAC-SHA256; DPAPI protects the random 64-byte key.
# Only ciphertext is written during backup. Requires Windows PowerShell 7+.
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$script:MealQBackupEntropy = [Text.Encoding]::UTF8.GetBytes('MealQ off-Pi backup v1')

function Protect-MealQArchive {
    param([Diagnostics.Process]$Process, [string]$Path, [hashtable]$Metadata)
    $keyMaterial = [Security.Cryptography.RandomNumberGenerator]::GetBytes(64)
    $aes = [Security.Cryptography.Aes]::Create()
    $aes.Key = $keyMaterial[0..31]
    $aes.GenerateIV()
    $Metadata.format = 'mealq-aes-cbc-hmac-sha256-dpapi-v1'
    $Metadata.key = [Convert]::ToBase64String([Security.Cryptography.ProtectedData]::Protect($keyMaterial, $script:MealQBackupEntropy, 'CurrentUser'))
    $Metadata.iv = [Convert]::ToBase64String($aes.IV)
    $header = [Text.Encoding]::UTF8.GetBytes(($Metadata | ConvertTo-Json -Compress))
    $file = [IO.File]::Open($Path, 'CreateNew', 'ReadWrite', 'None')
    $crypto = $null
    $hash = [Security.Cryptography.IncrementalHash]::CreateHash('SHA256')
    try {
        $file.Write([BitConverter]::GetBytes([int]$header.Length))
        $file.Write($header)
        $crypto = [Security.Cryptography.CryptoStream]::new($file, $aes.CreateEncryptor(), 'Write', $true)
        $buffer = [byte[]]::new(65536)
        $total = 0L
        while (($read = $Process.StandardOutput.BaseStream.Read($buffer, 0, $buffer.Length)) -gt 0) {
            $hash.AppendData($buffer, 0, $read)
            $crypto.Write($buffer, 0, $read)
            $total += $read
        }
        $Process.WaitForExit()
        if ($Process.ExitCode -ne 0) { throw 'SSH backup transfer failed. Incomplete ciphertext retained.' }
        $actualHash = [Convert]::ToHexString($hash.GetHashAndReset()).ToLowerInvariant()
        if ($actualHash -ne $Metadata.sha256 -or $total -ne [long]$Metadata.bytes) { throw 'Transferred backup checksum or size mismatch. Incomplete ciphertext retained.' }
        $crypto.FlushFinalBlock()
        $crypto.Dispose()
        $crypto = $null
        $file.Flush($true)
        $file.Position = 0
        $mac = [Security.Cryptography.HMACSHA256]::new([byte[]]$keyMaterial[32..63])
        try { $signature = $mac.ComputeHash($file) } finally { $mac.Dispose() }
        $file.Position = $file.Length
        $file.Write($signature)
        $file.Flush($true)
    } finally {
        if ($null -ne $crypto) { $crypto.Dispose() }
        $file.Dispose()
        $hash.Dispose()
        $aes.Dispose()
        [Array]::Clear($keyMaterial)
    }
}

function Test-MealQEncryptedArchive {
    param([string]$Path, [string]$RestorePath)
    $file = [IO.File]::OpenRead($Path)
    $keyMaterial = $null
    $aes = $null
    $plainDestination = $null
    $hashSink = $null
    $decryptSink = $null
    $sha = [Security.Cryptography.SHA256]::Create()
    try {
        $lengthBuffer = [byte[]]::new(4)
        $file.ReadExactly($lengthBuffer)
        $headerLength = [BitConverter]::ToInt32($lengthBuffer)
        if ($headerLength -lt 20 -or $headerLength -gt 65536 -or $file.Length -le (4 + $headerLength + 32)) { throw 'Invalid backup envelope.' }
        $headerBytes = [byte[]]::new($headerLength)
        $file.ReadExactly($headerBytes)
        $header = [Text.Encoding]::UTF8.GetString($headerBytes) | ConvertFrom-Json
        if ($header.format -ne 'mealq-aes-cbc-hmac-sha256-dpapi-v1') { throw 'Unsupported backup format.' }
        $keyMaterial = [Security.Cryptography.ProtectedData]::Unprotect([Convert]::FromBase64String($header.key), $script:MealQBackupEntropy, 'CurrentUser')
        if ($keyMaterial.Length -ne 64) { throw 'Invalid backup key.' }
        $cipherStart = $file.Position
        $authenticatedBytes = $file.Length - 32
        $file.Position = 0
        $mac = [Security.Cryptography.HMACSHA256]::new([byte[]]$keyMaterial[32..63])
        $buffer = [byte[]]::new(65536)
        try {
            $remaining = $authenticatedBytes
            while ($remaining -gt 0) {
                $read = $file.Read($buffer, 0, [int][Math]::Min($buffer.Length, $remaining))
                if ($read -le 0) { throw 'Truncated backup.' }
                $null = $mac.TransformBlock($buffer, 0, $read, $buffer, 0)
                $remaining -= $read
            }
            $null = $mac.TransformFinalBlock([byte[]]::new(0), 0, 0)
            $signature = [byte[]]::new(32)
            $file.ReadExactly($signature)
            if (-not [Security.Cryptography.CryptographicOperations]::FixedTimeEquals($signature, $mac.Hash)) { throw 'Backup authentication failed.' }
        } finally { $mac.Dispose() }
        if ($RestorePath) {
            # Explicit restore only. Refuse any existing destination; no overwrite/delete.
            $plainDestination = [IO.File]::Open($RestorePath, 'CreateNew', 'Write', 'None')
        } else { $plainDestination = [IO.Stream]::Null }
        $hashSink = [Security.Cryptography.CryptoStream]::new($plainDestination, $sha, 'Write', $true)
        $aes = [Security.Cryptography.Aes]::Create()
        $aes.Key = $keyMaterial[0..31]
        $aes.IV = [Convert]::FromBase64String($header.iv)
        $decryptSink = [Security.Cryptography.CryptoStream]::new($hashSink, $aes.CreateDecryptor(), 'Write', $true)
        $file.Position = $cipherStart
        $remaining = $authenticatedBytes - $cipherStart
        while ($remaining -gt 0) {
            $read = $file.Read($buffer, 0, [int][Math]::Min($buffer.Length, $remaining))
            if ($read -le 0) { throw 'Truncated ciphertext.' }
            $decryptSink.Write($buffer, 0, $read)
            $remaining -= $read
        }
        $decryptSink.FlushFinalBlock()
        if (-not $hashSink.HasFlushedFinalBlock) { $hashSink.FlushFinalBlock() }
        if ([Convert]::ToHexString($sha.Hash).ToLowerInvariant() -ne $header.sha256) { throw 'Decrypted archive checksum mismatch.' }
        if ($RestorePath -and $plainDestination.Length -ne [long]$header.bytes) { throw 'Restored archive size mismatch.' }
        return [pscustomobject]@{ Snapshot = $header.snapshot; Sha256 = $header.sha256; Bytes = [long]$header.bytes; Verified = $true }
    } finally {
        if ($null -ne $decryptSink) { $decryptSink.Dispose() }
        if ($null -ne $hashSink) { $hashSink.Dispose() }
        if ($null -ne $plainDestination -and $RestorePath) { $plainDestination.Dispose() }
        if ($null -ne $aes) { $aes.Dispose() }
        if ($null -ne $keyMaterial) { [Array]::Clear($keyMaterial) }
        $sha.Dispose()
        $file.Dispose()
    }
}
