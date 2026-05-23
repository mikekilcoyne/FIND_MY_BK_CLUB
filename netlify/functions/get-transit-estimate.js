import { getConfiguredStore } from "./lib/blob-store.js";

function json(status, body) {
  return {
    statusCode: status,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Cache-Control": "public, max-age=86400" },
    body: JSON.stringify(body),
  };
}

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET" }, body: "" };
  }
  if (event.httpMethod !== "GET") return json(405, { error: "Method not allowed." });

  const { from, to } = event.queryStringParameters || {};
  if (!from || !to) return json(400, { error: "from and to required." });

  const cacheKey = `transit:${from.toLowerCase().trim()}:${to.toLowerCase().trim()}`;

  // Return cached result if available (30-day TTL baked into the stored timestamp)
  try {
    const store = getConfiguredStore("bk-transit-cache", { consistency: "eventual" });
    const cached = await store.get(cacheKey, { type: "json" });
    if (cached && cached.cachedAt && Date.now() - new Date(cached.cachedAt).getTime() < 30 * 24 * 60 * 60 * 1000) {
      return json(200, cached.result);
    }
  } catch (_) {}

  const apiKey = process.env.CLAUDE_BK_CLUB;
  if (!apiKey) return json(500, { error: "CLAUDE_BK_CLUB not configured." });

  const prompt = `Typical transit time by train/subway between:\nFrom: ${from}\nTo: ${to}\nReturn ONLY JSON: {"minutes":30,"mode":"subway","feasible":true}\nSet feasible:false if no reasonable rail connection (different continents, ocean, etc). minutes=null if infeasible.`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 128,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const raw = await res.json();
    if (raw.type === "error") return json(502, { error: raw.error?.message || raw.error?.type });

    const text = raw.content?.[0]?.text?.trim() || "{}";
    const match = text.match(/\{[\s\S]*\}/);
    const result = match ? JSON.parse(match[0]) : { feasible: false };

    // Cache the result
    try {
      const store = getConfiguredStore("bk-transit-cache", { consistency: "eventual" });
      await store.setJSON(cacheKey, { result, cachedAt: new Date().toISOString() });
    } catch (_) {}

    return json(200, result);
  } catch (err) {
    return json(500, { error: err.message });
  }
}
