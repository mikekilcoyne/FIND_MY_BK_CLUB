#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "Running BreakfastClubbing release smoke checks..."

# Pick a PCRE-capable matcher once, up front.
#
# This used to call `rg -q --pcre2` directly. ripgrep is not installed on this
# machine, and because `set -e` is on and every check exits 1 on failure, the
# whole script died on check #1 with "[fail] Home view still renders featured
# badges" -- a message that reads exactly like a real regression. The gate had
# effectively been reporting a false failure rather than running.
#
# Order matters: ripgrep when it is there (fastest), then GNU grep -P, then
# perl, which is on every macOS box. If none match, say so loudly instead of
# pretending 19 checks passed.
if command -v rg >/dev/null 2>&1; then
  MATCHER="rg"
elif echo "x" | grep -qP 'x' 2>/dev/null; then
  MATCHER="grep"
elif command -v perl >/dev/null 2>&1; then
  MATCHER="perl"
else
  echo "No PCRE-capable matcher found (tried: rg, grep -P, perl)." >&2
  echo "Install ripgrep (brew install ripgrep) and re-run." >&2
  exit 2
fi

matches() {
  local pattern="$1"
  local file="$2"
  case "$MATCHER" in
    rg)   rg -q --pcre2 "$pattern" "$file" ;;
    grep) grep -qP "$pattern" "$file" ;;
    perl) perl -e 'my ($p, $f) = @ARGV; open my $fh, "<", $f or exit 1;
                   while (<$fh>) { exit 0 if /$p/ } exit 1' "$pattern" "$file" 2>/dev/null ;;
  esac
}

check() {
  local file="$1"
  local pattern="$2"
  local message="$3"

  if matches "$pattern" "$file"; then
    echo "[pass] $message"
  else
    echo "[fail] $message"
    echo "       Missing pattern in $file"
    exit 1
  fi
}

check "js/script.js" 'badge-featured' "Home view still renders featured badges"
check "js/script.js" 'region-pill-new' "Home view still supports the New clubs filter"
check "js/script.js" 'social-icon-link' "Home view still includes social link rendering"
check "js/script.js" 'return club && club.isKnownHost \? "Update your event" : "\?";' "Home view still includes the ? update trigger"
check "js/calendar-view.js" 'nightBadge\.textContent = "Night"' "Calendar view still marks night events"
check "js/calendar-view.js" 'trigger\.textContent = "\?";' "Calendar view still includes the ? update trigger"
check "css/club-card.css" '\.badge-featured' "Club card featured styling exists"
check "css/club-card.css" '\.social-icon-link' "Club card social icon styling exists"
check "css/club-card.css" '\.card-update-link' "Club card update trigger styling exists"
check "css/styles.css" '\.featured-strip' "Featured strip styles exist"
check "css/styles.css" '\.club-update-modal' "Club update modal styles exist"
check "index.html" 'new-feature-badge' "Homepage keeps the NEW badge marker"
check "index.html" 'id="club-update-modal"' "Homepage includes the club update modal"
check "netlify/functions/weekly-host-reminder.js" 'mode === "correction"' "Weekly host reminder still supports correction mode"
check "scripts/send-test-email.mjs" 'TEST_MODE === "correction"' "Test mailer still supports correction mode"
check "netlify/functions/submit-club-update.js" 'subject: "Breakfast Club update request"' "Club update submission function exists"
check "netlify/functions/receive-club-update-email.js" 'applyApprovedLiveUpdate' "Email intake can apply approved live updates"
check "netlify/functions/live-club-overrides.js" 'Only GET and HEAD are supported' "Public live overrides endpoint exists"
check "js/club-data.js" 'loadLiveClubOverrides' "Frontend can load live club overrides"

echo "All release smoke checks passed."
