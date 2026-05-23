#!/usr/bin/env node
// Pulls flyer images from Ben's Substack RSS feed (last ~year).
// Skips wide banner/header images; keeps portrait/square ones.
// Dedupes by S3 image UUID so the same flyer isn't saved twice.

import { createWriteStream, mkdirSync, existsSync } from "fs";
import { pipeline } from "stream/promises";
import path from "path";

const FEED_URL = "https://breakfastindustries.substack.com/feed";
const OUTPUT_DIR = new URL("../downloads/substack-flyers", import.meta.url).pathname;
const CUTOFF = new Date(Date.now() - 370 * 24 * 60 * 60 * 1000); // ~1 year ago

mkdirSync(OUTPUT_DIR, { recursive: true });

// ── Fetch RSS ─────────────────────────────────────────────────────────────────
console.log("Fetching feed…");
const xml = await fetch(FEED_URL).then(r => r.text());

// ── Parse items ───────────────────────────────────────────────────────────────
const itemPattern = /<item>([\s\S]*?)<\/item>/g;
const datePattern = /<pubDate>([^<]+)<\/pubDate>/;
const items = [];
let m;
while ((m = itemPattern.exec(xml)) !== null) {
  const block = m[1];
  const dateMatch = block.match(datePattern);
  if (!dateMatch) continue;
  const date = new Date(dateMatch[1]);
  if (date < CUTOFF) continue;
  items.push({ date, block });
}
console.log(`Found ${items.length} posts within the last year.`);

// ── Extract unique S3 image URLs ──────────────────────────────────────────────
// Format inside RSS: https://substackcdn.com/.../https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F{UUID}_{W}x{H}.{ext}
const s3Pattern = /https%3A%2F%2Fsubstack-post-media\.s3\.amazonaws\.com%2Fpublic%2Fimages%2F([a-f0-9\-]+)_(\d+)x(\d+)\.(jpe?g|png|gif|webp)/gi;

const seen = new Set(); // dedupe by UUID
const toDownload = [];

for (const { date, block } of items) {
  let img;
  while ((img = s3Pattern.exec(block)) !== null) {
    const [, uuid, wStr, hStr, ext] = img;
    const w = parseInt(wStr), h = parseInt(hStr);
    const ratio = w / h;

    // Skip wide banners (ratio > 1.6) and tiny thumbnails (< 200px)
    if (ratio > 1.6 || Math.min(w, h) < 200) continue;

    if (seen.has(uuid)) continue;
    seen.add(uuid);

    // Decode the S3 URL and fetch at full resolution
    const s3Url = `https://substack-post-media.s3.amazonaws.com/public/images/${uuid}_${w}x${h}.${ext}`;
    const dateStr = date.toISOString().split("T")[0];
    const filename = `${dateStr}_${uuid.slice(0, 8)}.${ext === "jpeg" ? "jpg" : ext}`;
    toDownload.push({ s3Url, filename, date: dateStr, w, h });
  }
}

console.log(`Found ${toDownload.length} unique flyer-shaped images to download.`);

// ── Download ──────────────────────────────────────────────────────────────────
let ok = 0, skip = 0, fail = 0;

for (const { s3Url, filename, date, w, h } of toDownload) {
  const dest = path.join(OUTPUT_DIR, filename);
  if (existsSync(dest)) { skip++; continue; }

  try {
    const res = await fetch(s3Url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    await pipeline(res.body, createWriteStream(dest));
    console.log(`  ✓ ${filename}  (${w}×${h})`);
    ok++;
  } catch (err) {
    console.error(`  ✗ ${filename}: ${err.message}`);
    fail++;
  }
}

console.log(`\nDone — ${ok} downloaded, ${skip} already existed, ${fail} failed.`);
console.log(`Saved to: ${OUTPUT_DIR}`);
