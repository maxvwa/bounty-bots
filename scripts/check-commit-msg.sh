#!/usr/bin/env bash
# Validates commit message format: "<PREFIX>-<number> - <description>" or "FIX <description>".
# Override prefix via TEMPLATE_TICKET_PREFIX (default: PROJ).
set -euo pipefail

ticket_prefix="${TEMPLATE_TICKET_PREFIX:-PROJ}"
msg="$(head -1 "$1")"

if echo "$msg" | grep -qE "^(${ticket_prefix}-[0-9]+ - .+|FIX .+)$"; then
    exit 0
fi

echo "ERROR: Commit message must match one of:"
echo "  ${ticket_prefix}-<number> - <description>   (e.g. \"${ticket_prefix}-42 - Add user authentication\")"
echo '  FIX <description>              (e.g. "FIX null pointer in session handler")'
echo ""
echo "Got: $msg"
exit 1
