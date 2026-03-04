#!/usr/bin/env bash
set -euo pipefail

SHEET_ID="1HTp01deXz7TjPxXtM-a6tXhtUi40XX0K9U_LyLL1aUk"
GID="0"
URL="https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${GID}"
OUT_FILE="data.csv"
TMP_FILE="$(mktemp)"

cleanup() {
  rm -f "$TMP_FILE"
}
trap cleanup EXIT

curl -fsSL "$URL" -o "$TMP_FILE"

# Basic sanity check to avoid committing a broken/HTML response.
if ! head -n 1 "$TMP_FILE" | grep -qi "city"; then
  echo "Unexpected CSV header. Aborting sync." >&2
  exit 1
fi

if [ -f "$OUT_FILE" ] && cmp -s "$TMP_FILE" "$OUT_FILE"; then
  echo "No sheet changes detected."
  exit 0
fi

mv "$TMP_FILE" "$OUT_FILE"
echo "Updated ${OUT_FILE} from Google Sheet."
