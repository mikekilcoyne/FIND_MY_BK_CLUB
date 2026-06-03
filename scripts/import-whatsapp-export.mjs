#!/usr/bin/env node

// Imports a WhatsApp chat export (the "Export Chat" .zip or its unzipped folder)
// and stages its media + text into the site's data files.
//
//   node scripts/import-whatsapp-export.mjs <export.zip | export-folder> [--apply]
//
// What it does:
//   1. Parses _chat.txt into structured messages (timestamp, sender, text, attachment).
//   2. Detects the club/city each attachment + recap belongs to (matched against
//      data/clubs-map.json plus a small alias table).
//   3. Classifies each attached image as: flyer | recap | other (with a confidence).
//   4. Always writes a full review file to downloads/whatsapp-parse/<runId>/review.json
//      and copies every attachment into that same staging folder.
//   5. Only with --apply does it touch live data, and only for HIGH-confidence items:
//         flyers  -> assets/flyers/<year>/ + data/flyer-wall.json
//         recaps  -> assets/photos/club_updates/<slug>/ + data/club-story-media.json
//      Everything ambiguous stays in review.json for a human to promote. This makes a
//      bad auto-classification impossible to silently push to the live wall.
//
// Idempotent: re-running skips anything already staged (deduped by source filename).

import { promises as fs } from "node:fs";
import { createReadStream } from "node:fs";
import path from "node:path";
import os from "node:os";
import process from "node:process";
import { spawnSync } from "node:child_process";

const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif", ".heic"]);

// ── arg parsing ──────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const flags = new Set(argv.filter((a) => a.startsWith("--")));
  const positional = argv.filter((a) => !a.startsWith("--"));
  return { source: positional[0] || "", apply: flags.has("--apply") };
}

// ── unzip if needed (uses system `unzip`, already present on macOS) ──────────
async function resolveExportDir(source) {
  const stat = await fs.stat(source).catch(() => null);
  if (!stat) throw new Error(`Export not found: ${source}`);
  if (stat.isDirectory()) return { dir: source, cleanup: null };

  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "wa-export-"));
  const res = spawnSync("unzip", ["-o", source, "-d", tmp], { stdio: "ignore" });
  if (res.status !== 0) throw new Error(`Failed to unzip: ${source}`);
  return { dir: tmp, cleanup: () => fs.rm(tmp, { recursive: true, force: true }) };
}

// ── chat parsing ─────────────────────────────────────────────────────────────
// Line shape: ‎[3/12/26, 4:37:03 PM] ~ David: caption text ‎<attached: FILE>
const LINE_RE = /^‎?\[(\d{1,2})\/(\d{1,2})\/(\d{2,4}),\s*([\d:apmAPM\s]+)\]\s*([^:]+):\s*([\s\S]*)$/;
const ATTACH_RE = /<attached:\s*([^>]+)>/;

function parseChat(text) {
  const lines = text.split(/\r?\n/);
  const messages = [];
  let cur = null;
  for (const raw of lines) {
    const m = raw.match(LINE_RE);
    if (m) {
      if (cur) messages.push(cur);
      const [, mm, dd, yy, , sender, body] = m;
      const year = yy.length === 2 ? 2000 + Number(yy) : Number(yy);
      const iso = `${year}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
      const attach = body.match(ATTACH_RE);
      cur = {
        date: iso,
        sender: sender.replace(/^~\s*/, "").trim(),
        text: body.replace(ATTACH_RE, "").replace(/‎/g, "").trim(),
        attachment: attach ? attach[1].trim() : null,
      };
    } else if (cur) {
      cur.text = (cur.text + "\n" + raw.replace(/‎/g, "")).trim();
    }
  }
  if (cur) messages.push(cur);
  return messages;
}

// ── city detection ───────────────────────────────────────────────────────────
const CITY_ALIASES = {
  "nyc": "new york", "la": "los angeles", "sf": "san francisco",
  "dc": "washington dc", "cph": "copenhagen", "el hamptons": "hamptons",
  "soma": "maplewood", "wmsburg": "williamsburg", "melb": "melbourne",
  "ams": "amsterdam", "dtbk": "new york — downtown brooklyn", "les": "new york — les",
  "cdmx": "mexico city",
};

function titleCase(s) {
  return s.replace(/\b\w/g, (ch) => ch.toUpperCase());
}

function buildCityVocab(clubs) {
  // token -> canonical display city
  const vocab = [];
  const coreToDisplay = new Map();
  for (const c of clubs) {
    const display = c.displayCity || c.city || "";
    const core = String(c.city || "").split(",")[0].split(" - ").pop().trim().toLowerCase();
    if (core.length > 2) { vocab.push({ token: core, display }); coreToDisplay.set(core, display); }
    const dcore = display.split(",")[0].split("—").pop().trim().toLowerCase();
    if (dcore.length > 2 && dcore !== core) {
      vocab.push({ token: dcore, display });
      if (!coreToDisplay.has(dcore)) coreToDisplay.set(dcore, display);
    }
  }
  for (const [alias, target] of Object.entries(CITY_ALIASES)) {
    // resolve the alias to a real club's display name when one exists
    const display = coreToDisplay.get(target) || titleCase(target);
    vocab.push({ token: alias, display });
  }
  return vocab.sort((a, b) => b.token.length - a.token.length);
}

function detectCity(text, vocab) {
  const hay = " " + text.toLowerCase() + " ";
  for (const { token, display } of vocab) {
    const re = new RegExp(`(^|[^a-z])${token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z]|$)`);
    if (re.test(hay)) return display;
  }
  return null;
}

// ── flyer vs recap classification (text-heuristic, conservative) ─────────────
const FLYER_HINTS = [
  /\bjoin us\b/i, /\brsvp\b/i, /\bsign ?up\b/i, /\bregister\b/i, /\bnew (poster|flyer)\b/i,
  /\bthis (friday|thursday|wednesday|tuesday|monday|saturday|sunday)\b/i,
  /\b(first|second|third|fourth|last|every)\s+(friday|thursday|wednesday|tuesday|monday)\b/i,
  /\b\d{1,2}(:\d{2})?\s*(am|pm)\b/i, /\bnew venue\b/i, /\bkicking off\b/i, /\blaunch/i,
];
const RECAP_HINTS = [
  /\b(today|this morning|yesterday)\b/i, /\bgreat (crew|group|turnout|morning|time)\b/i,
  /\b\d{1,2}\s+(people|folks|attendees|humans|showed up)\b/i, /\bhad (a|our|\d)/i,
  /\bregulars\b/i, /\bnewbies\b/i, /\bwe (talked|discussed|had|hosted)\b/i, /\bwas (good|great|magic)\b/i,
];

function classify(message) {
  const t = message.text || "";
  if (!message.attachment) return { kind: "text-only", confidence: 0 };
  const ext = path.extname(message.attachment).toLowerCase();
  if (!IMAGE_EXT.has(ext)) return { kind: "other", confidence: 0.2 };

  const flyer = FLYER_HINTS.filter((re) => re.test(t)).length;
  const recap = RECAP_HINTS.filter((re) => re.test(t)).length;

  if (flyer > recap && flyer >= 1) {
    return { kind: "flyer", confidence: Math.min(0.6 + 0.15 * flyer, 0.95) };
  }
  if (recap >= 1) {
    return { kind: "recap", confidence: Math.min(0.55 + 0.15 * recap, 0.95) };
  }
  // attached image, no strong textual signal -> needs human eyes
  return { kind: "other", confidence: 0.3 };
}

// ── recap-text detection (no attachment, but a club update worth keeping) ────
function isClubNews(message) {
  const t = message.text || "";
  return /\b(first|new) breakfast club\b/i.test(t) ||
         /\bjust took place\b/i.test(t) ||
         /\bhosting (again|for the first time)\b/i.test(t) ||
         /\bnew (club|chapter|city|venue)\b/i.test(t);
}

function slugify(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

// Strip the trailing state/country segment ("Mexico City, MX" -> "mexico-city")
// so recap slugs reconcile with the bare-city slugs already in club-story-media.json.
function citySlug(city) {
  return slugify(String(city).split(",")[0]);
}

// ── main ─────────────────────────────────────────────────────────────────────
async function main() {
  const { source, apply } = parseArgs(process.argv.slice(2));
  if (!source) {
    console.error("Usage: node scripts/import-whatsapp-export.mjs <export.zip|folder> [--apply]");
    process.exit(1);
  }
  const repoRoot = process.cwd();
  const { dir: exportDir, cleanup } = await resolveExportDir(path.resolve(repoRoot, source));

  try {
    const chatPath = path.join(exportDir, "_chat.txt");
    const chatText = await fs.readFile(chatPath, "utf8").catch(() => {
      throw new Error(`_chat.txt not found in export at ${exportDir}`);
    });
    const messages = parseChat(chatText);

    const clubs = JSON.parse(await fs.readFile(path.join(repoRoot, "data", "clubs-map.json"), "utf8"));
    const vocab = buildCityVocab(clubs);

    const runId = new Date().toISOString().slice(0, 10);
    const stageDir = path.join(repoRoot, "downloads", "whatsapp-parse", runId);
    await fs.mkdir(stageDir, { recursive: true });

    const review = { generatedAt: new Date().toISOString(), source, counts: {}, items: [] };

    for (const msg of messages) {
      const cls = classify(msg);
      const city = detectCity(msg.text, vocab) ||
        (msg.attachment ? detectCity(msg.attachment, vocab) : null);

      if (msg.attachment) {
        const srcFile = path.join(exportDir, msg.attachment);
        const exists = await fs.stat(srcFile).then(() => true).catch(() => false);
        if (exists && IMAGE_EXT.has(path.extname(msg.attachment).toLowerCase())) {
          await fs.copyFile(srcFile, path.join(stageDir, path.basename(msg.attachment))).catch(() => {});
        }
        review.items.push({
          date: msg.date, sender: msg.sender, caption: msg.text,
          file: msg.attachment, city, kind: cls.kind, confidence: cls.confidence,
          fileAvailable: exists,
        });
      } else if (isClubNews(msg)) {
        review.items.push({
          date: msg.date, sender: msg.sender, caption: msg.text,
          file: null, city, kind: "club-news", confidence: 0.5,
        });
      }
    }

    // counts by kind
    for (const it of review.items) review.counts[it.kind] = (review.counts[it.kind] || 0) + 1;

    const reviewPath = path.join(stageDir, "review.json");
    await fs.writeFile(reviewPath, JSON.stringify(review, null, 2) + "\n");

    // ── apply: only HIGH-confidence flyers + recaps touch live data ───────────
    let staged = { flyers: 0, recaps: 0, skipped: 0 };
    if (apply) {
      const year = new Date().getFullYear();
      const flyerWallPath = path.join(repoRoot, "data", "flyer-wall.json");
      const flyerWall = JSON.parse(await fs.readFile(flyerWallPath, "utf8"));
      const flyerDir = path.join(repoRoot, "assets", "flyers", String(year));
      await fs.mkdir(flyerDir, { recursive: true });
      const haveSource = new Set(flyerWall.items.map((i) => i.sourceFile));

      const storyPath = path.join(repoRoot, "data", "club-story-media.json");
      const story = JSON.parse(await fs.readFile(storyPath, "utf8"));
      const storyBySlug = new Map((story.clubs || []).map((c) => [c.slug, c]));

      for (const it of review.items) {
        if (!it.fileAvailable) continue;

        if (it.kind === "flyer" && it.confidence >= 0.7 && it.city) {
          const dest = path.basename(it.file);
          if (haveSource.has(dest)) { staged.skipped++; continue; }
          await fs.copyFile(path.join(stageDir, dest), path.join(flyerDir, dest));
          flyerWall.items.push({
            city: it.city,
            url: `./assets/flyers/${year}/${dest}`,
            sourceFile: dest,
          });
          haveSource.add(dest);
          staged.flyers++;
        } else if (it.kind === "recap" && it.confidence >= 0.7 && it.city) {
          const slug = citySlug(it.city);
          let club = storyBySlug.get(slug);
          if (!club) {
            club = { slug, displayName: it.city, photos: [], photoTreatment: "polaroid-frame", source: "whatsapp" };
            (story.clubs ||= []).push(club);
            storyBySlug.set(slug, club);
          }
          const destDir = path.join(repoRoot, "assets", "photos", "club_updates", slug);
          await fs.mkdir(destDir, { recursive: true });
          const dest = path.basename(it.file);
          const rel = `./assets/photos/club_updates/${slug}/${dest}`;
          club.photos ||= [];
          if (club.photos.includes(rel)) { staged.skipped++; continue; }
          await fs.copyFile(path.join(stageDir, dest), path.join(destDir, dest));
          club.photos.push(rel);
          club.updatedAt = new Date().toISOString();
          staged.recaps++;
        }
      }

      flyerWall.items.sort((a, b) => a.city.localeCompare(b.city));
      await fs.writeFile(flyerWallPath, JSON.stringify(flyerWall, null, 2) + "\n");
      story.generatedAt = new Date().toISOString();
      await fs.writeFile(storyPath, JSON.stringify(story, null, 2) + "\n");
    }

    // ── report ────────────────────────────────────────────────────────────────
    console.log(`Parsed ${messages.length} messages.`);
    console.log("By kind:", JSON.stringify(review.counts));
    console.log(`Review + staged media: ${path.relative(repoRoot, stageDir)}/`);
    if (apply) {
      console.log(`Applied: ${staged.flyers} flyers, ${staged.recaps} recap photos, ${staged.skipped} already present.`);
    } else {
      console.log("Preview only. Re-run with --apply to stage high-confidence flyers + recaps into live data.");
    }
  } finally {
    if (cleanup) await cleanup();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
