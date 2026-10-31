param([int]$Port=3200,[ValidateSet(50,100)][int]$Agents=50)
$ErrorActionPreference='Stop'
if($Port -lt 1024 -or $Port -gt 65535){throw 'Invalid task port'}
if(Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue){throw 'Port already owned by another process'}
$phase4eRoot=(Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$phase4eOutput=Join-Path $phase4eRoot 'tmp/phase4e1/desktop'
New-Item -ItemType Directory -Path $phase4eOutput -Force | Out-Null
# Local transparent PNG fixture. Never requires an external tile request.
$phase4eTile=Join-Path $phase4eOutput 'offline-tile.png'
if(-not (Test-Path -LiteralPath $phase4eTile)){[IO.File]::WriteAllBytes($phase4eTile,[Convert]::FromBase64String('iVBORw0KGgoAAAANSUhEUgAAAQAAAAEACAYAAABccqhmAAABFUlEQVR4nO3BMQEAAADCoPVP7WsIoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAeAMBPAABPO1TCQAAAABJRU5ErkJggg=='))}
# Process-only dummy keys take precedence over application dotenv loading. No credentials are read here.
$env:OPENROUTER_API_KEY='sk-or-v1-'+('0'*64)
$env:TAVILY_API_KEY='tvly-'+('0'*32)
$env:STAKEHOLDER_LIVE_ENABLED='true'
$env:SOCIAL_LLM_ENABLED='true'
$env:NODE_ENV='production'
$env:SOCIAL_SWARM_SIZE="$Agents"
$env:SOCIAL_ACTIVE_AGENTS="$Agents"
$env:SOCIAL_CONTROLLED_AGENTS=$(if($Agents -eq 50){'35'}else{'70'})
$env:SOCIAL_MAX_DECISIONS=$(if($Agents -eq 50){'350'}else{'700'})
$env:SOCIAL_PROVIDER_MAX_CALLS=$env:SOCIAL_MAX_DECISIONS
Remove-Item Env:SOCIAL_STORAGE_ROOT -ErrorAction SilentlyContinue
Remove-Item Env:IMPACTLENS_PHASE4D_LIVE_GUARD -ErrorAction SilentlyContinue
$env:IMPACTLENS_PHASE4E1_MOCK='true'
$phase4ePreload=([Uri](Join-Path $phase4eRoot 'scripts/testing/phase4e1-provider-preload.mjs')).AbsoluteUri
$env:NODE_OPTIONS="--import=$phase4ePreload"
$env:PORT="$Port"
$phase4eProcess=Start-Process -FilePath 'node' -ArgumentList @('scripts/testing/phase4e1-mock-server.mjs') -WorkingDirectory $phase4eRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $phase4eOutput 'server.stdout.log') -RedirectStandardError (Join-Path $phase4eOutput 'server.stderr.log') -PassThru
@{pid=$phase4eProcess.Id;port=$Port;root=$phase4eRoot;mode='network-blocked-fixtures';normalUserStorage=$true;agents=$Agents} | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $phase4eOutput 'server.json') -Encoding UTF8
Write-Output "Task-owned offline mock server PID $($phase4eProcess.Id), port $Port, agents $Agents"
