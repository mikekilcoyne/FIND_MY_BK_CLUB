#!/usr/bin/env node
// Minimal static file server for local preview only.
import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = Number(process.env.PORT) || 8083;

const TYPES = {
  ".html": "text/html", ".css": "text/css", ".js": "text/javascript",
  ".mjs": "text/javascript", ".json": "application/json", ".svg": "image/svg+xml",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".gif": "image/gif", ".webp": "image/webp", ".mp4": "video/mp4",
};

http.createServer(async (req, res) => {
  try {
    let rel = decodeURIComponent(new URL(req.url, "http://x").pathname);
    if (rel.endsWith("/")) rel += "index.html";
    let full = path.join(ROOT, rel);
    if (!full.startsWith(ROOT)) { res.writeHead(403).end("Forbidden"); return; }
    // Match Netlify's clean URLs locally: /passport serves passport.html.
    if (!path.extname(full)) {
      try { await readFile(full); } catch { full += ".html"; }
    }
    const body = await readFile(full);
    res.writeHead(200, { "Content-Type": TYPES[path.extname(full)] || "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404).end("Not found");
  }
}).listen(PORT, () => console.log(`Preview on http://127.0.0.1:${PORT}`));
