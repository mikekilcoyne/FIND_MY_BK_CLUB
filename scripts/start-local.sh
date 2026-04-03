#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

PORT="${1:-8081}"
DEBUG_CONFIG_PATH="js/local-debug-config.js"

echo "BK Club local start check"
echo "Repo: $ROOT_DIR"
echo "Branch: $(git branch --show-current 2>/dev/null || echo unknown)"
echo "Commit: $(git rev-parse --short HEAD 2>/dev/null || echo unknown)"
echo

LIVE_INDEX="$(mktemp)"
LOCAL_INDEX="$(mktemp)"
trap 'rm -f "$LIVE_INDEX" "$LOCAL_INDEX"' EXIT

curl -fsSL "https://breakfastclubbing.com" -o "$LIVE_INDEX"
cp index.html "$LOCAL_INDEX"

LIVE_OVERRIDE_HASH="$(curl -fsSL "https://breakfastclubbing.com/js/club-overrides.js" | shasum | awk '{print $1}')"
LOCAL_OVERRIDE_HASH="$(shasum js/club-overrides.js | awk '{print $1}')"
LIVE_SCRIPT_HASH="$(curl -fsSL "https://breakfastclubbing.com/js/script.js" | shasum | awk '{print $1}')"
LOCAL_SCRIPT_HASH="$(shasum js/script.js | awk '{print $1}')"

echo "Live comparison"
LIVE_STATUS="mixed"
if [[ "$LIVE_OVERRIDE_HASH" == "$LOCAL_OVERRIDE_HASH" ]]; then
  echo "- club-overrides.js matches live"
else
  echo "- club-overrides.js differs from live"
fi

if [[ "$LIVE_SCRIPT_HASH" == "$LOCAL_SCRIPT_HASH" ]]; then
  echo "- js/script.js matches live"
else
  echo "- js/script.js differs from live"
fi

if git diff --quiet origin/main...HEAD 2>/dev/null; then
  echo "- git branch state matches origin/main"
else
  echo "- git branch state differs from origin/main"
fi

if [[ "$LIVE_OVERRIDE_HASH" == "$LOCAL_OVERRIDE_HASH" && "$LIVE_SCRIPT_HASH" == "$LOCAL_SCRIPT_HASH" ]]; then
  LIVE_STATUS="matches live JS"
else
  LIVE_STATUS="differs from live JS"
fi

cat > "$DEBUG_CONFIG_PATH" <<EOF
window.BK_LOCAL_DEBUG = {
  repoPath: $(printf '%s' "\"$ROOT_DIR\""),
  branch: $(printf '%s' "\"$(git branch --show-current 2>/dev/null || echo unknown)\""),
  commit: $(printf '%s' "\"$(git rev-parse --short HEAD 2>/dev/null || echo unknown)\""),
  liveStatus: $(printf '%s' "\"$LIVE_STATUS\"")
};
EOF

echo
read -r -p "Is this the most up-to-date one? Type yes to continue: " CONFIRM
if [[ "$CONFIRM" != "yes" ]]; then
  echo "Aborted."
  exit 1
fi

echo "Starting local server on http://127.0.0.1:${PORT}"
exec python3 -m http.server "$PORT"
