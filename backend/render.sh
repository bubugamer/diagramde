#!/usr/bin/env bash
set -euo pipefail

VERSION="${1:-}"
INPUT="${2:-}"
FORMAT="${3:-svg}"

if [[ -z "$VERSION" || -z "$INPUT" ]]; then
  echo "usage: ./render.sh <version> <input-file> [format]" >&2
  exit 1
fi

JAR="$(cd "$(dirname "$0")" && pwd)/versions/${VERSION}/plantuml.jar"
if [[ ! -f "$JAR" ]]; then
  echo "missing jar for version ${VERSION} at $JAR" >&2
  exit 2
fi

OUTDIR="$(mktemp -d)"
outfile="${OUTDIR}/output.${FORMAT}"

timeout 5s java -Xmx256m -Djava.awt.headless=true -jar "$JAR" "-t${FORMAT}" "$INPUT" -o "$OUTDIR"
cat "$outfile"
rm -rf "$OUTDIR"
