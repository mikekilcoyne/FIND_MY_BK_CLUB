#!/usr/bin/env node
/* ===========================================================================
   SNAPSHOT-CLUBS — refresh data/clubs-sheet-local.csv from the Master Sheet.
   ---------------------------------------------------------------------------
   The snapshot is what the site falls back to when /.netlify/functions/get-clubs
   is unreachable: a Netlify outage, SHEET_CSV_URL unset, or any static preview
   where no functions run.

   It reuses stripEmails() from the function itself rather than reimplementing
   the stripping. Two copies of that logic would eventually disagree, and the
   way they would disagree is one of them publishing email addresses.

   Usage:
     SHEET_CSV_URL="https://docs.google.com/.../export?format=csv&gid=..." \
       node scripts/snapshot-clubs.mjs

   or pass the URL as the first argument. Re-run after meaningful Sheet edits;
   the snapshot only surfaces when the function is down, so it going a little
   stale is survivable, but months stale is not.
   =========================================================================== */

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const { stripEmails } = await import("../netlify/functions/get-clubs.js");

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = resolve(ROOT, "data/clubs-sheet-local.csv");

const url = process.argv[2] || process.env.SHEET_CSV_URL || "";
if (!url) {
  console.error("Need the Sheet CSV URL.\n");
  console.error('  SHEET_CSV_URL="https://docs.google.com/…/export?format=csv&gid=…" \\');
  console.error("    node scripts/snapshot-clubs.mjs\n");
  console.error("It is the same value as SHEET_CSV_URL in the Netlify env vars.");
  process.exit(2);
}

const res = await fetch(url);
if (!res.ok) {
  console.error(`Sheet request failed with ${res.status}.`);
  console.error("If this is 401/403, the Sheet is restricted — use an account that can read it.");
  process.exit(1);
}

const raw = await res.text();
if (/^\s*</.test(raw)) {
  console.error("Got HTML, not CSV — that is usually Google's sign-in page.");
  process.exit(1);
}

const { csv, dropped, redacted } = stripEmails(raw);

// Never write a snapshot that still has an address in it. Shipping this file
// is the whole risk the proxy exists to remove, so it fails loudly instead.
const leaked = csv.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g);
if (leaked) {
  console.error(`REFUSING TO WRITE: ${leaked.length} address(es) survived stripping.`);
  console.error(`First: ${leaked[0]}`);
  process.exit(1);
}

writeFileSync(OUT, csv.endsWith("\n") ? csv : csv + "\n", "utf8");

const rows = csv.split("\n").filter(Boolean).length - 1;
console.log(`Wrote data/clubs-sheet-local.csv — ${rows} clubs.`);
console.log(`Columns dropped: ${dropped.join(", ") || "none"}`);
if (redacted) console.log(`Addresses redacted from other columns: ${redacted}`);
console.log("No email addresses in the output.");
