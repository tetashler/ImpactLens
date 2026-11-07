#!/bin/sh
set -eu
umask 077
project=$(CDPATH= cd "$(dirname "$0")/.." && pwd -P)
cd "$project"
exec /bin/sh deploy/with-instance-lock.sh /bin/sh deploy/run-server.sh
