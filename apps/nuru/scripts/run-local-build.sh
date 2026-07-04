#!/usr/bin/env bash
# CRLF-immune launcher for local-build.sh.
#
# local-build.sh lives in the Windows repo and may be checked out with CRLF
# line endings, which break bash (`set -euo pipefail\r`, etc). We pipe the
# script through `tr -d '\r'` into `bash -s` so it runs no matter how it
# landed on disk -- tr tolerates \r even if this launcher itself is CRLF is
# NOT relied upon; call the one-liner below directly and nothing on disk
# needs correct line endings.
#
# Preferred invocation (from Windows PowerShell), which does not depend on
# this file's own line endings at all:
#
#   wsl -d Ubuntu -- bash -c "tr -d '\r' < ~/nuru-build/scripts/local-build.sh | bash -s -- production"
#
# This wrapper is a convenience for when local-build.sh is already known-LF:
here="$(cd "$(dirname "$0")" && pwd)"
tr -d '\r' < "$here/local-build.sh" | exec bash -s -- "$@"
