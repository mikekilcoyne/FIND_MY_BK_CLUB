#!/usr/bin/env node
// Bulk-upload downloaded Substack flyers to Netlify Blobs.
// Resizes large images with macOS sips, detects city via Claude Haiku.
// Safe to re-run — skips keys already in the index.

import { readFileSync, readdirSync, existsSync, unlinkSync } from "fs";
import { spawnSync } from "child_process";
import { tmpdir } from "os";
import path from "path";
import { getStore } from "@netlify/blobs";

const SITE_ID  = "75fd9acb-ca00-45e3-bcb9-9e0906ea82b0";
const FLYERS_DIR = new URL("../downloads/substack-flyers", import.meta.url).pathname;
const MAX_PX   = 1200;
const BATCH_SIZE = 4;
const DELAY_MS = 700;

// ── Auth ─────────────────────────────────────────────────────────────────────

function getNetlifyToken() {
  const cfgPath = `${process.env.HOME}/Library/Preferences/netlify/config.json`;
  try {
    const cfg = JSON.parse(readFileSync(cfgPath, "utf8"));
    for (const u of Object.values(cfg.users || {})) {
      if (u?.auth?.token) return u.auth.token;
    }
  } catch (_) {}
  return process.env.NETLIFY_AUTH_TOKEN || "";
}

function getClaudeKey() {
  if (process.env.CLAUDE_BK_CLUB) return process.env.CLAUDE_BK_CLUB;
  const r = spawnSync("npx", ["netlify", "env:get", "CLAUDE_BK_CLUB"], { encoding: "utf8", timeout: 15000 });
  // Strip ANSI escape codes, bullet characters, and whitespace from CLI output
  return (r.stdout || "").replace(/\x1b\[[0-9;]*m/g, "").replace(/[›•\s]/g, "").trim();
}

// ── Image resize ──────────────────────────────────────────────────────────────

function resizeIfNeeded(inputPath) {
  const buf = readFileSync(inputPath);
  if (buf.length <= 700 * 1024) return { buf, isTemp: false, tmpPath: null };
  const tmpPath = path.join(tmpdir(), `bkflyer-${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`);
  spawnSync("sips", ["-Z", String(MAX_PX), "-s", "format", "jpeg",
    "-s", "formatOptions", "82", inputPath, "--out", tmpPath]);
  if (existsSync(tmpPath)) return { buf: readFileSync(tmpPath), isTemp: true, tmpPath };
  return { buf, isTemp: false, tmpPath: null };
}

// ── Claude city detection ─────────────────────────────────────────────────────

async function detectCity(base64Data, claudeKey) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": claudeKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 48,
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: "image/jpeg", data: base64Data } },
          { type: "text", text: 'Breakfast Club event flyer. What city is this in? Reply with ONLY the city name (e.g. "Berlin", "Sydney", "New York"). If unclear, reply "Unknown".' },
        ],
      }],
    }),
  });
  const json = await res.json();
  if (json.type === "error") throw new Error(json.error?.message || json.error?.type || "Claude error");
  return (json.content?.[0]?.text || "Unknown").trim().replace(/['".,!]/g, "");
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseDateFromFilename(filename) {
  const m = filename.match(/^(\d{4}-\d{2}-\d{2})_/);
  return m ? m[1] : null;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const netlifyToken = getNetlifyToken();
  if (!netlifyToken) { console.error("No Netlify token. Run: npx netlify login"); process.exit(1); }

  const claudeKey = getClaudeKey();
  if (!claudeKey) { console.error("No CLAUDE_BK_CLUB key found"); process.exit(1); }

  console.log("Connecting to Netlify Blobs…");
  const store = getStore({ name: "bk-flyers", siteID: SITE_ID, token: netlifyToken });

  let index = { items: [] };
  try {
    index = (await store.get("index.json", { type: "json" })) || { items: [] };
    console.log(`Existing index: ${index.items.length} items`);
  } catch (_) {
    console.log("Starting fresh index");
  }

  const existingKeys = new Set(index.items.map(i => i.key));

  const files = readdirSync(FLYERS_DIR)
    .filter(f => /\.(jpg|jpeg|png|gif|webp)$/i.test(f))
    .sort();

  console.log(`Processing ${files.length} files (batch ${BATCH_SIZE})…\n`);

  let uploaded = 0, skipped = 0, failed = 0;
  const tempFiles = [];
  let quotaHit = false;

  const MIME = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", gif: "image/gif", webp: "image/webp" };

  for (let i = 0; i < files.length; i += BATCH_SIZE) {
    if (quotaHit) {
      // Still upload remaining files without city detection
    }
    const batch = files.slice(i, Math.min(i + BATCH_SIZE, files.length));

    const results = await Promise.allSettled(batch.map(async (filename) => {
      const rawExt = filename.split(".").pop().toLowerCase();
      const ext = rawExt === "jpeg" ? "jpg" : rawExt;
      const blobKey = `substack-${filename.replace(/\.(jpg|jpeg|png|gif|webp)$/i, "")}.${ext}`;

      if (existingKeys.has(blobKey)) return { status: "skip" };

      const inputPath = path.join(FLYERS_DIR, filename);
      const { buf, isTemp, tmpPath } = resizeIfNeeded(inputPath);
      if (isTemp && tmpPath) tempFiles.push(tmpPath);

      const mediaType = MIME[rawExt] || "image/jpeg";
      const base64Data = buf.toString("base64");

      let city = "Unknown";
      if (!quotaHit) {
        try {
          city = await detectCity(base64Data, claudeKey);
        } catch (err) {
          if (/quota|429|rate_limit|overload|529/i.test(err.message)) {
            quotaHit = true;
            console.error(`\n⚠  Rate limit hit — remaining uploaded without city`);
          } else {
            console.error(`\n  Claude error for ${filename}: ${err.message}`);
          }
        }
      }

      await store.set(blobKey, buf, {
        metadata: { mimeType: mediaType, club: city, uploadedAt: new Date().toISOString() },
      });

      const entry = {
        key: blobKey,
        club: city,
        mimeType: mediaType,
        uploadedAt: new Date().toISOString(),
        uploadedBy: "substack-import",
      };
      const flyerDate = parseDateFromFilename(filename);
      if (flyerDate) entry.flyerDate = flyerDate;

      index.items.unshift(entry);
      existingKeys.add(blobKey);
      return { status: "ok", city };
    }));

    for (const r of results) {
      if (r.status === "fulfilled") {
        if (r.value?.status === "skip") { process.stdout.write("s"); skipped++; }
        else { process.stdout.write("."); uploaded++; }
      } else {
        process.stdout.write("✗"); failed++;
      }
    }

    // Save index checkpoint every 20 uploads
    if (uploaded > 0 && uploaded % 20 === 0) {
      await store.setJSON("index.json", { items: index.items });
      process.stdout.write("[✓]");
    }

    if (i + BATCH_SIZE < files.length) {
      await new Promise(r => setTimeout(r, DELAY_MS));
    }
  }

  // Final save — retry up to 4× with backoff in case of transient 401/429
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      await store.setJSON("index.json", { items: index.items });
      process.stdout.write("[✓ index saved]");
      break;
    } catch (err) {
      if (attempt < 3) {
        const wait = (attempt + 1) * 3000;
        console.error(`\nIndex save failed (${err.message}), retrying in ${wait / 1000}s…`);
        await new Promise(r => setTimeout(r, wait));
      } else {
        console.error(`\nCould not save final index: ${err.message}`);
      }
    }
  }

  for (const f of tempFiles) { try { unlinkSync(f); } catch (_) {} }

  console.log(`\n\nDone — ${uploaded} uploaded, ${skipped} skipped, ${failed} failed`);
  console.log(`Total in index: ${index.items.length}`);
  if (quotaHit) console.log("⚠  Some flyers uploaded without city — re-run admin Re-detect to fix.");
}

main().catch(err => { console.error(err); process.exit(1); });
