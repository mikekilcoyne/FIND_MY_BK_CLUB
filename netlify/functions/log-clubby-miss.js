import { getConfiguredStore } from "./lib/blob-store.js";

// Records Clubby inputs that matched no intent and no club, so real misses
// become new aliases/intents. One JSON-lines blob per day.

function json(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Only POST is supported." });
  }

  let payload = {};
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { error: "Invalid JSON." });
  }

  const q = String(payload.q || "").slice(0, 200).trim();
  if (!q) return json(400, { error: "Missing q." });

  try {
    const store = getConfiguredStore("clubby-misses");
    const day = new Date().toISOString().slice(0, 10);
    const key = `misses/${day}.jsonl`;
    const existing = (await store.get(key)) || "";
    const line = JSON.stringify({ q, ts: payload.ts || new Date().toISOString() });
    await store.set(key, existing + line + "\n");
    return json(200, { ok: true });
  } catch (error) {
    // Logging must never surface an error to the chat experience.
    return json(200, { ok: false, error: String(error && error.message) });
  }
};
