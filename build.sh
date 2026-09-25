#!/usr/bin/env bash
# Bygger dist/ki-hjem-design.js av src/*.js (sortert på filnavn).
set -euo pipefail
cd "$(dirname "$0")"
OUT=dist/ki-hjem-design.js
{
  echo "/* KI Hjem Design – pikselkopi av Claude Design «Home Assistant sikkerhetspanel». Bygget $(date -u +%Y-%m-%dT%H:%MZ). */"
  for f in src/*.js; do
    echo ""
    echo "/* ===== $(basename "$f") ===== */"
    echo "try {"
    cat "$f"
    echo "} catch (e) { console.error('ki-hjem-design: $(basename "$f")', e); }"
  done
} > "$OUT"
node --check "$OUT"
echo "OK $OUT ($(wc -c < "$OUT") bytes)"
