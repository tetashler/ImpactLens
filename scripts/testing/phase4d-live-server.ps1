param([int]$Port=3198)
$ErrorActionPreference='Stop'
if($Port -lt 1024 -or $Port -gt 65535){throw 'Invalid task port'}
if(Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue){throw 'Port already in use'}
$phase4dLiveRoot=(Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$phase4dLiveOutput=Join-Path $phase4dLiveRoot 'tmp/phase4d-live'
New-Item -ItemType Directory -Path $phase4dLiveOutput -Force | Out-Null
Get-ChildItem Env: | Where-Object {$_.Name -match '^IMPACTLENS_.*(MOCK|GUARD|PREFLIGHT)' } | ForEach-Object {Remove-Item -LiteralPath ('Env:'+ $_.Name)}
Remove-Item Env:SOCIAL_STORAGE_ROOT -ErrorAction SilentlyContinue
$env:STAKEHOLDER_LIVE_ENABLED='true';$env:SOCIAL_LLM_ENABLED='true'
$env:SOCIAL_ACTIVE_AGENTS='24';$env:SOCIAL_CONTROLLED_AGENTS='4';$env:SOCIAL_MAX_DECISIONS='8'
$env:IMPACTLENS_PHASE4D_LIVE_GUARD='true';$env:IMPACTLENS_PHASE4D_LIVE_DIRECTORY=$phase4dLiveOutput
$env:PORT="$Port"
$phase4dLiveGuard=([Uri](Join-Path $phase4dLiveRoot 'scripts/testing/phase4d-live-guard.mjs')).AbsoluteUri
$env:NODE_OPTIONS="--import=$phase4dLiveGuard"
$phase4dLiveProcess=Start-Process -FilePath 'node' -ArgumentList @('scripts/testing/phase4d-live-server.mjs') -WorkingDirectory $phase4dLiveRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $phase4dLiveOutput 'server.stdout.log') -RedirectStandardError (Join-Path $phase4dLiveOutput 'server.stderr.log') -PassThru
@{pid=$phase4dLiveProcess.Id;port=$Port;root=$phase4dLiveRoot;mode='real-guarded'} | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $phase4dLiveOutput 'server.json') -Encoding UTF8
Write-Output "Task-owned real server PID $($phase4dLiveProcess.Id), port $Port"
