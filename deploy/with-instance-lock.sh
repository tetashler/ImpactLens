#!/bin/sh
# Trusted local operator commands only. The lock inode must never be replaced.
set -eu
umask 077
state=${IMPACTLENS_STATE_DIRECTORY:-}
case "$state" in /*) ;; *) echo 'DEPLOYMENT_STATE_CONFIG' >&2; exit 78 ;; esac
if [ ! -d "$state" ] || [ -L "$state" ] || [ "$(CDPATH= cd "$state" && pwd -P)" != "$state" ]; then
 echo 'DEPLOYMENT_STATE_PATH' >&2; exit 78
fi
if [ "$#" -eq 0 ] || [ -L "$state/instance.lock" ] || { [ -e "$state/instance.lock" ] && [ ! -f "$state/instance.lock" ]; }; then
 echo 'DEPLOYMENT_LOCK_CONFIG' >&2; exit 78
fi
exec /usr/bin/flock --nonblock --no-fork --conflict-exit-code 73 "$state/instance.lock" "$@"
