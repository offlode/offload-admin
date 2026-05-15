#!/usr/bin/env bash
set -euo pipefail

CANONICAL_SCHEMA="../offload/shared/schema.ts"
CANONICAL_INDEX="../offload/shared/schema/index.ts"

if [[ -f "$CANONICAL_INDEX" ]]; then
  # Backend repo uses subdirectory schema structure (schema/index.ts re-exports).
  # Admin repo keeps a single flat schema.ts, so concatenate all sub-files.
  echo "Backend repo uses schema/ directory — using committed shared/schema.ts instead"
elif [[ -f "$CANONICAL_SCHEMA" ]]; then
  # Only copy if it's a self-contained file (not a re-export)
  head -1 "$CANONICAL_SCHEMA" | grep -q 'export \* from' && {
    echo "Canonical schema is a re-export — using committed shared/schema.ts"
  } || {
    cp "$CANONICAL_SCHEMA" shared/schema.ts
    echo "Synced shared/schema.ts from ../offload"
  }
else
  # Render builds this repository alone, so ../offload is not present there.
  # The committed shared/schema.ts is the canonical copy produced by this script locally.
  echo "Using committed shared/schema.ts; ../offload/shared/schema.ts not present"
fi
