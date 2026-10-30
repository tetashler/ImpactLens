param([int]$Port=3196,[switch]$DefaultStorage,[switch]$StorageRepair)
$ErrorActionPreference='Stop'
if ($Port -lt 1024 -or $Port -gt 65535) { throw 'Invalid task port' }
if (Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue) { throw 'Port already owned by another process' }
$phase4dRoot=(Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$phase4dOut=Join-Path $phase4dRoot $(if($StorageRepair){'tmp/phase4d-storage'}else{'tmp/phase4d'})
New-Item -ItemType Directory -Path $phase4dOut -Force | Out-Null
# Dummy process-only values. The preload blocks all external dispatch and returns explicit fixtures.
$env:OPENROUTER_API_KEY='sk-or-v1-'+('0'*64)
$env:TAVILY_API_KEY='tvly-'+('0'*32)
$env:STAKEHOLDER_LIVE_ENABLED='true'
$env:SOCIAL_LLM_ENABLED='true'
$env:SOCIAL_MAX_DECISIONS='8'
$env:SOCIAL_CONTROLLED_AGENTS='4'
$env:SOCIAL_ACTIVE_AGENTS='24'
if($DefaultStorage){Remove-Item Env:SOCIAL_STORAGE_ROOT -ErrorAction SilentlyContinue}else{$env:SOCIAL_STORAGE_ROOT=Join-Path $phase4dOut 'private-server'}
if($StorageRepair){$env:IMPACTLENS_STORAGE_REPAIR_MOCK='true'}else{Remove-Item Env:IMPACTLENS_STORAGE_REPAIR_MOCK -ErrorAction SilentlyContinue}
$env:IMPACTLENS_PHASE2B_MOCK='true'
$env:IMPACTLENS_SOCIAL_MOCK='true'
$env:IMPACTLENS_PHASE4C_MOCK='true'
$env:IMPACTLENS_PHASE4D_MOCK='true'
$phase4dGuard=([Uri](Join-Path $phase4dRoot 'scripts/testing/offline-network.mjs')).AbsoluteUri
$phase4dPreload=([Uri](Join-Path $phase4dRoot 'scripts/testing/dynamic-provider-preload.mjs')).AbsoluteUri
$env:NODE_OPTIONS="--import=$phase4dGuard --import=$phase4dPreload"
$phase4dProcess=Start-Process -FilePath 'node' -ArgumentList @('node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port',"$Port") -WorkingDirectory $phase4dRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $phase4dOut 'server.stdout.log') -RedirectStandardError (Join-Path $phase4dOut 'server.stderr.log') -PassThru
@{pid=$phase4dProcess.Id;port=$Port;root=$phase4dRoot;mode='network-blocked-mock';defaultStorage=[bool]$DefaultStorage} | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $phase4dOut 'server.json') -Encoding UTF8
Write-Output "Task-owned mock server PID $($phase4dProcess.Id), port $Port"
