#!/usr/bin/env bash
# Phase 4d W0-SCHEMAS — schema-drift check.
#
# Runs once per release (manual until CI wiring lands in Phase 5).
# Fails (exits 1) if either consumer's `utils/schemas/` re-export shim
# stops being a thin re-export — i.e. someone reintroduced inline schema
# definitions on the web or mobile side that should have lived in
# `packages/shared-schemas/src/`.
#
# The contract:
#   - Web shim (`labbe/utils/schemas/createEventSchema.js`) must import
#     from `@halla/shared-schemas` and not redefine `z.object(...)`
#     bodies inline.
#   - Mobile shim (`halla-mobile/utils/schemas/createEventSchema.js`)
#     same.
#   - Same for the `updateEventSchema.js` shims.
#
# This is intentionally a coarse grep-based check rather than a deep
# diff — the goal is to keep the workspace as the single source of
# truth, not to assert byte-for-byte identity of the shims.
#
# Usage:
#   bash scripts/check-schema-drift.sh
#
# Exit codes:
#   0 = no drift
#   1 = drift detected (offending file paths printed to stderr)

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

shims=(
  "labbe/utils/schemas/createEventSchema.js"
  "labbe/utils/schemas/updateEventSchema.js"
  "halla-mobile/utils/schemas/createEventSchema.js"
  "halla-mobile/utils/schemas/updateEventSchema.js"
)

failed=0

for shim in "${shims[@]}"; do
  if [[ ! -f "$shim" ]]; then
    echo "ERROR: missing shim $shim" >&2
    failed=1
    continue
  fi

  if ! grep -q '@halla/shared-schemas' "$shim"; then
    echo "DRIFT: $shim does not import from @halla/shared-schemas" >&2
    failed=1
  fi

  # `z.object({` would indicate someone added a fresh schema definition
  # in the shim instead of in the workspace package.
  if grep -qE 'z\.object\s*\(\s*\{' "$shim"; then
    echo "DRIFT: $shim contains inline z.object(...) — schemas belong in packages/shared-schemas/src/" >&2
    failed=1
  fi
done

# Sanity-check the workspace package itself.
for src in \
  packages/shared-schemas/src/createEventSchema.js \
  packages/shared-schemas/src/updateEventSchema.js \
  packages/shared-schemas/index.js \
  packages/shared-schemas/package.json
do
  if [[ ! -f "$src" ]]; then
    echo "ERROR: workspace package missing $src" >&2
    failed=1
  fi
done

if [[ $failed -ne 0 ]]; then
  echo "" >&2
  echo "Phase 4d schema-drift check FAILED." >&2
  exit 1
fi

echo "Phase 4d schema-drift check: PASS"
