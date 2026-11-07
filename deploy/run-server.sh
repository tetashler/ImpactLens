#!/bin/sh
# Invoked under the instance lock, including preflight writes and HTTP draining.
set -eu
node=${IMPACTLENS_NODE_BINARY:-/usr/bin/node}
case "$node" in /*) ;; *) echo 'DEPLOYMENT_NODE' >&2; exit 78 ;; esac
if [ ! -x "$node" ]; then echo 'DEPLOYMENT_NODE' >&2; exit 78; fi
"$node" scripts/deployment-preflight.ts
exec "$node" node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port "${PORT:-3000}"
