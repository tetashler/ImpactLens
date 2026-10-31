param([int]$Port=3201)
$ErrorActionPreference='Stop'
if($Port -lt 1024 -or $Port -gt 65535){throw 'Invalid task port'}
if(Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue){throw 'Task port already owned'}
$phase4e2Root=(Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$phase4e2Output=Join-Path $phase4e2Root 'tmp/phase4e2-live'
New-Item -ItemType Directory -Path $phase4e2Output -Force | Out-Null
# Credentials are loaded privately by Next from existing server configuration. Never inspect or replace them here.
$env:STAKEHOLDER_LIVE_ENABLED='true'
$env:SOCIAL_LLM_ENABLED='true'
$env:NODE_ENV='production'
$env:SOCIAL_SWARM_SIZE='50'
$env:SOCIAL_ACTIVE_AGENTS='50'
$env:SOCIAL_MAX_DECISIONS='350'
$env:SOCIAL_PROVIDER_MAX_CALLS='350'
$env:SOCIAL_PROVIDER_TOKEN_LIMIT='16000000'
$env:SOCIAL_PROVIDER_COST_USD='1'
$env:SOCIAL_PROVIDER_DEADLINE_MS=([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()+5400000).ToString()
Remove-Item Env:SOCIAL_STORAGE_ROOT -ErrorAction SilentlyContinue
Remove-Item Env:IMPACTLENS_PHASE4E2_MOCK -ErrorAction SilentlyContinue
Remove-Item Env:IMPACTLENS_PHASE4E_MOCK -ErrorAction SilentlyContinue
Remove-Item Env:IMPACTLENS_PHASE4D_LIVE_GUARD -ErrorAction SilentlyContinue
$env:IMPACTLENS_PHASE4E2_LIVE_GUARD='true'
$phase4e2Guard=([Uri](Join-Path $phase4e2Root 'scripts/testing/phase4e2-live-guard.mjs')).AbsoluteUri
$env:NODE_OPTIONS="--import=$phase4e2Guard"
$env:PORT="$Port"
$phase4e2Server=Start-Process -FilePath 'node' -ArgumentList @('scripts/testing/phase4e2-live-server.mjs') -WorkingDirectory $phase4e2Root -WindowStyle Hidden -RedirectStandardOutput (Join-Path $phase4e2Output 'server.stdout.log') -RedirectStandardError (Join-Path $phase4e2Output 'server.stderr.log') -PassThru
@{pid=$phase4e2Server.Id;port=$Port;root=$phase4e2Root;mode='real-provider-guarded'} | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $phase4e2Output 'server.json') -Encoding UTF8
Write-Output "Task-owned guarded real-provider server PID $($phase4e2Server.Id), port $Port"
