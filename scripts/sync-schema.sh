#!/usr/bin/env bash
set -euo pipefail

CANONICAL_SCHEMA="../offload/shared/schema.ts"
if [[ -f "$CANONICAL_SCHEMA" ]]; then
  cp "$CANONICAL_SCHEMA" shared/schema.ts
  echo "Synced shared/schema.ts from ../offload"
else
  # Render builds this repository alone, so ../offload is not present there.
  # The committed shared/schema.ts is the canonical copy produced by this script locally.
  echo "Using committed shared/schema.ts; ../offload/shared/schema.ts not present"
fi
