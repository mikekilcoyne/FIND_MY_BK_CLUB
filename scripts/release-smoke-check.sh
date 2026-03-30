#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "Running BreakfastClubbing release smoke checks..."

check() {
  local file="$1"
  local pattern="$2"
  local message="$3"

  if rg -q --pcre2 "$pattern" "$file"; then
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
check "netlify/functions/send-test-email.mjs" 'TEST_MODE === "correction"' "Test mailer still supports correction mode"
check "netlify/functions/submit-club-update.js" 'subject: "Breakfast Club update request"' "Club update submission function exists"

echo "All release smoke checks passed."
