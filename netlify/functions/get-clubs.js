/* ===========================================================================
   GET-CLUBS — the club roster, with host email addresses removed.
   ---------------------------------------------------------------------------
   Why this exists.

   js/club-data.js used to fetch the Google Sheet CSV straight from the
   visitor's browser, which meant the Sheet URL was in public client-side
   source and the Sheet had to stay world-readable for the site to work. The
   Sheet's `Emails` column carries ~75 hosts' personal addresses, so that was
   the whole roster's contact details, downloadable by anyone who viewed source.

   This function moves the fetch server-side. The URL now lives in an env var
   and never reaches a browser; the Sheet can be set to Restricted; and the
   Emails column is removed before anything is returned.

   It deliberately returns CSV, not JSON. club-data.js already has a CSV parser
   and every downstream caller expects its output shape, so handing back the
   same format keeps the client change to a single URL and avoids a rewrite of
   code that is working.

   Setup: Netlify → Site settings → Environment variables →
     SHEET_CSV_URL = the Sheet's CSV export URL
   With it unset this returns 503 and the client falls back to its local
   snapshot, which is the same path as a Google outage.
   =========================================================================== */

const SHEET_CSV_URL = process.env.SHEET_CSV_URL || "";

// Any column whose name mentions e-mail goes. A list of exact names would miss
// a `Host_Email_2` added to the Sheet six months from now by someone who has
// never read this file -- and the failure mode of missing one is publishing
// personal data, so the rule errs toward dropping a column it did not need to.
const EMAIL_COLUMN = /e-?mail/i;

// Belt and braces for addresses typed into some other column -- a Host_Bio
// ending "reach me at x@y.com" would otherwise sail straight through. This
// redacts the address and leaves the surrounding text intact.
const EMAIL_IN_TEXT = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;

/* Line-based, quote-aware — a deliberate copy of parseCSVLine in
   js/club-data.js. That parser splits on newlines before it splits on commas,
   so a quoted cell containing a line break already breaks the site today. The
   proxy matches that behaviour exactly rather than being cleverer: if it
   parsed multi-line cells correctly it would hand the client rows the client
   then mangles, which is harder to diagnose than a format nobody is using. */
function parseCSVLine(line) {
  const out = [];
  let value = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') { value += '"'; i += 1; }
      else { inQuotes = !inQuotes; }
      continue;
    }
    if (char === "," && !inQuotes) { out.push(value); value = ""; continue; }
    value += char;
  }
  out.push(value);
  return out;
}

// Quote only when the value would otherwise change meaning. Over-quoting is
// safe for the client's parser but makes the response noisy to eyeball.
function toCSVValue(value) {
  const s = String(value ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function stripEmails(csvText) {
  const lines = String(csvText || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .filter(Boolean);

  if (!lines.length) return { csv: "", dropped: [], redacted: 0 };

  const header = parseCSVLine(lines[0]);
  const keep = [];
  const dropped = [];
  header.forEach((name, i) => {
    if (EMAIL_COLUMN.test(name.trim())) dropped.push(name.trim());
    else keep.push(i);
  });

  let redacted = 0;
  const out = lines.map((line, rowIndex) => {
    const cells = parseCSVLine(line);
    return keep
      .map((i) => {
        let cell = cells[i] ?? "";
        // Never scrub the header row: a column legitimately named with an @ is
        // not a leak, and mangling a header name breaks every lookup downstream.
        if (rowIndex > 0 && cell.includes("@")) {
          const cleaned = cell.replace(EMAIL_IN_TEXT, "[removed]");
          if (cleaned !== cell) redacted += 1;
          cell = cleaned;
        }
        return toCSVValue(cell);
      })
      .join(",");
  });

  return { csv: out.join("\n"), dropped, redacted };
}

export async function handler() {
  if (!SHEET_CSV_URL) {
    return {
      statusCode: 503,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
      body: JSON.stringify({
        error: "SHEET_CSV_URL is not configured.",
        hint: "Netlify → Site settings → Environment variables.",
      }),
    };
  }

  try {
    const res = await fetch(SHEET_CSV_URL);
    if (!res.ok) throw new Error(`Sheet request failed with ${res.status}`);
    const raw = await res.text();

    // A Sheet that is private to the service returns Google's HTML sign-in
    // page with a 200, not an error. Catch that here rather than handing the
    // client a CSV parse of a login screen.
    if (/^\s*</.test(raw)) {
      throw new Error("Sheet returned HTML, not CSV — check its sharing settings");
    }

    const { csv, dropped, redacted } = stripEmails(raw);
    if (redacted) {
      console.warn(`get-clubs: redacted ${redacted} address(es) found outside the email column(s)`);
    }

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        // Five minutes, matching get-wwta. Sheet edits show up within that;
        // Google sees one request per window rather than one per visitor.
        "Cache-Control": "public, max-age=300",
        "Access-Control-Allow-Origin": "*",
        "X-Columns-Dropped": dropped.join(",") || "none",
      },
      body: csv,
    };
  } catch (err) {
    // 502, so the client's existing catch falls through to its local snapshot.
    console.error("get-clubs:", err.message);
    return {
      statusCode: 502,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
      body: JSON.stringify({ error: err.message }),
    };
  }
}
