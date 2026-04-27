#!/usr/bin/env node

import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif", ".heic"]);

function toPosixRelative(from, to) {
  return "./" + path.relative(from, to).split(path.sep).join("/");
}

async function walkFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await walkFiles(fullPath));
      continue;
    }
    if (entry.isFile() && IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      const stat = await fs.stat(fullPath);
      files.push({ path: fullPath, mtimeMs: stat.mtimeMs, name: entry.name });
    }
  }
  return files;
}

function parseArgs(argv) {
  const flags = new Set(argv.filter((arg) => arg.startsWith("--")));
  const values = argv.filter((arg) => !arg.startsWith("--"));
  return {
    sourceDir: values[0] || "",
    dryRun: flags.has("--dry-run"),
  };
}

async function main() {
  const { sourceDir, dryRun } = parseArgs(process.argv.slice(2));
  if (!sourceDir) {
    console.error("Usage: node scripts/sync-latest-happenings-folder.mjs <source-folder> [--dry-run]");
    process.exit(1);
  }

  const repoRoot = process.cwd();
  const resolvedSourceDir = path.resolve(repoRoot, sourceDir);
  const dataPath = path.join(repoRoot, "data", "club-story-media.json");
  const assetsRoot = path.join(repoRoot, "assets", "photos", "club_updates");

  const sourceStat = await fs.stat(resolvedSourceDir).catch(() => null);
  if (!sourceStat || !sourceStat.isDirectory()) {
    console.error(`Source folder not found: ${resolvedSourceDir}`);
    process.exit(1);
  }

  const media = JSON.parse(await fs.readFile(dataPath, "utf8"));
  const clubsBySlug = new Map((media.clubs || []).map((club) => [club.slug, club]));
  const sourceEntries = await fs.readdir(resolvedSourceDir, { withFileTypes: true });

  const summary = [];
  const nowIso = new Date().toISOString();

  for (const entry of sourceEntries) {
    if (!entry.isDirectory()) continue;
    const slug = entry.name;
    const club = clubsBySlug.get(slug);
    if (!club) {
      summary.push({ slug, skipped: true, reason: "No matching slug in data/club-story-media.json" });
      continue;
    }

    const sourceClubDir = path.join(resolvedSourceDir, slug);
    const files = (await walkFiles(sourceClubDir)).sort((a, b) => a.mtimeMs - b.mtimeMs || a.name.localeCompare(b.name));
    if (!files.length) {
      summary.push({ slug, added: 0, copied: 0, skipped: false });
      continue;
    }

    const destClubDir = path.join(assetsRoot, slug);
    const currentPhotos = Array.isArray(club.photos) ? [...club.photos] : [];
    let copied = 0;
    let added = 0;

    if (!dryRun) {
      await fs.mkdir(destClubDir, { recursive: true });
    }

    for (const file of files) {
      const destPath = path.join(destClubDir, path.basename(file.path));
      const relPath = toPosixRelative(repoRoot, destPath);

      if (path.resolve(file.path) !== path.resolve(destPath) && !dryRun) {
        await fs.copyFile(file.path, destPath);
        copied += 1;
      } else if (path.resolve(file.path) !== path.resolve(destPath)) {
        copied += 1;
      }

      if (!currentPhotos.includes(relPath)) {
        currentPhotos.push(relPath);
        added += 1;
      }
    }

    if (added > 0 || copied > 0) {
      club.photos = currentPhotos;
      club.photoTreatment = club.photoTreatment || "polaroid-frame";
      club.updatedAt = nowIso;
      if (!club.source || club.source === "whatsapp") {
        club.source = "drive";
      }
    }

    summary.push({ slug, added, copied, skipped: false });
  }

  if (!dryRun) {
    media.generatedAt = nowIso;
    await fs.writeFile(dataPath, JSON.stringify(media, null, 2) + "\n");
  }

  const lines = summary.map((item) => {
    if (item.skipped) return `skip ${item.slug}: ${item.reason}`;
    return `${dryRun ? "would sync" : "synced"} ${item.slug}: +${item.added} media refs, ${item.copied} file copies`;
  });

  if (!lines.length) {
    console.log("No club folders found in source directory.");
    return;
  }

  console.log(lines.join("\n"));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
