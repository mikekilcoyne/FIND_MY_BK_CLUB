import { getConfiguredStore } from "./lib/blob-store.js";

export async function handler(event) {
  if (!["GET", "HEAD"].includes(event.httpMethod)) {
    return { statusCode: 405, body: "Method not allowed" };
  }
  try {
    const store = getConfiguredStore("bk-flyers", { consistency: "eventual" });
    const index = (await store.get("index.json", { type: "json" })) || { items: [] };

    const params = event.queryStringParameters || {};
    const limit       = Math.min(parseInt(params.limit  || "200"), 500);
    const offset      = Math.max(parseInt(params.offset || "0"),   0);
    const excludeSubs = params.excludeSubstack === "1";

    // Dedupe by key, filter unknowns and optionally substack imports
    const seen = new Set();
    const all = (index.items || []).filter(f => {
      if (!f.key || !f.club || f.club === "Unknown") return false;
      if (excludeSubs && f.uploadedBy === "substack-import") return false;
      if (seen.has(f.key)) return false;
      seen.add(f.key);
      return true;
    });
    const page = all.slice(offset, offset + limit);

    const items = page.map(f => ({
      key:        f.key,
      club:       f.club,
      flyerDate:  f.flyerDate  || null,
      uploadedAt: f.uploadedAt || null,
      mimeType:   f.mimeType   || "image/jpeg",
    }));

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=60",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ items, total: all.length, offset, limit }),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
}
