#!/usr/bin/env node
// Does the Master Sheet still line up with the curated overlay?
//
// scripts/import-master-sheet.mjs keys lib/club-preview-data.json by SOURCE ROW
// NUMBER (csv index + 2), and the curated values OVERRIDE the sheet for city,
// region, latitude, longitude, time_zone, venue_name, start_time, frequency and
// poster_url. So if the sheet has been sorted, or a row inserted or deleted,
// since that file was generated, curated data silently lands on the wrong club
// — wrong coordinates, wrong map pin, and a wrong tzLookup timezone with it.
//
// This compares the two and prints a report. It writes nothing and touches no
// database.
//
//   node check-sheet-alignment.mjs <master-sheet.csv> [club-preview-data.json]

import { readFile } from "node:fs/promises";

// Dependency-free so this runs from anywhere, including outside the app repo.
// Handles quoted fields, escaped quotes and newlines inside quotes.
function parseCsv(text) {
  const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const rows = [];
  let row = [], field = "", quoted = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') { field += '"'; i++; } else quoted = false;
      } else field += ch;
      continue;
    }
    if (ch === '"') { quoted = true; continue; }
    if (ch === ",") { row.push(field); field = ""; continue; }
    if (ch === "\r") continue;
    if (ch === "\n") { row.push(field); rows.push(row); row = []; field = ""; continue; }
    field += ch;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  const [header, ...body] = rows;
  if (!header) return [];
  return body
    .filter((r) => r.some((c) => String(c).trim() !== ""))
    .map((r) => Object.fromEntries(header.map((h, i) => [h.trim(), r[i] ?? ""])));
}

const [csvPath, curatedPath = "../../breakfast-club-rebuild/lib/club-preview-data.json"] =
  process.argv.slice(2);
if (!csvPath) {
  console.error("Usage: node check-sheet-alignment.mjs <master-sheet.csv> [club-preview-data.json]");
  process.exit(2);
}

const rows = parseCsv(await readFile(csvPath, "utf8"));
const curated = JSON.parse(await readFile(new URL(curatedPath, import.meta.url), "utf8"));

// Same coordinate parsing as the importer, so a mismatch here is real.
const coord = (value) => {
  const str = String(value ?? "").trim();
  if (!str) return null;
  const n = Number.parseFloat(str);
  if (!Number.isFinite(n)) return null;
  return /[SW]\b/i.test(str) ? -Math.abs(n) : /[NE]\b/i.test(str) ? Math.abs(n) : n;
};

const km = (a, b, c, d) => {
  if ([a, b, c, d].some((v) => v === null || v === undefined)) return null;
  const R = 6371, r = Math.PI / 180;
  const dLat = (c - a) * r, dLon = (d - b) * r;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a * r) * Math.cos(c * r) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

const tokens = (s) =>
  new Set(
    String(s ?? "")
      .toLowerCase()
      .normalize("NFKD")
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length > 2),
  );
const shareAToken = (a, b) => {
  const x = tokens(a), y = tokens(b);
  for (const t of x) if (y.has(t)) return true;
  return x.size === 0 || y.size === 0;
};

const DRIFT_KM = 50;
const suspect = [], ok = [], missing = [], corrected = [];

for (const entry of curated.sort((a, b) => a.source_row - b.source_row)) {
  const row = rows[entry.source_row - 2];
  if (!row) {
    missing.push({ source_row: entry.source_row, curatedCity: entry.city });
    continue;
  }
  const d = km(coord(row.Latitude), coord(row.Longitude), entry.latitude, entry.longitude);
  const cityShares = shareAToken(row.City, entry.city);
  const drifted = d !== null && d > DRIFT_KM;
  const record = {
    source_row: entry.source_row,
    sheetCity: String(row.City ?? "").trim() || "(blank)",
    curatedCity: entry.city,
    distanceKm: d === null ? null : Math.round(d),
    active: String(row.Active ?? "").trim() || "(blank)",
  };
  // An entry carrying coordinate_note was deliberately fixed against a bad
  // sheet value, so a large distance there is the correction, not drift.
  if (drifted && entry.coordinate_note && cityShares) {
    corrected.push({ ...record, note: entry.coordinate_note });
  } else if (!cityShares || drifted) suspect.push(record);
  else ok.push(record);
}

const pad = (s, n) => String(s).padEnd(n).slice(0, n);
console.log(`\nSheet rows: ${rows.length}   Curated entries: ${curated.length}\n`);

if (missing.length) {
  console.log(`✗ ${missing.length} curated entries point past the end of the sheet:`);
  for (const m of missing) console.log(`    row ${m.source_row} → "${m.curatedCity}" (no such row)`);
  console.log("");
}

if (suspect.length) {
  console.log(`✗ ${suspect.length} rows look MISALIGNED — curated data would land on the wrong club:\n`);
  console.log(`    ${pad("row", 5)}${pad("sheet says", 30)}${pad("curated says", 30)}${pad("apart", 10)}active`);
  for (const r of suspect) {
    console.log(
      `    ${pad(r.source_row, 5)}${pad(r.sheetCity, 30)}${pad(r.curatedCity, 30)}` +
        `${pad(r.distanceKm === null ? "no coords" : r.distanceKm + " km", 10)}${r.active}`,
    );
  }
  console.log("");
}

if (corrected.length) {
  console.log(`⚑ ${corrected.length} rows differ because the overlay deliberately corrects the sheet:\n`);
  for (const r of corrected) {
    console.log(`    row ${r.source_row}  ${r.sheetCity} → ${r.curatedCity}  (${r.distanceKm} km)`);
    console.log(`           ${r.note}`);
  }
  console.log("    These are fine to import, but the sheet still holds the bad value.");
  console.log("    Fix it at source so the overlay stops being load-bearing.\n");
}

console.log(`✓ ${ok.length} rows line up.\n`);

if (suspect.length || missing.length) {
  console.log("DO NOT run the importer with --apply until this is clean.");
  console.log("Either restore the sheet's original row order, or regenerate");
  console.log("lib/club-preview-data.json against the sheet as it is now.\n");
  process.exit(1);
}
console.log("Safe to import.\n");
