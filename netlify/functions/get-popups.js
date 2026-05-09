import { getConfiguredStore } from "./lib/blob-store.js";

const POPUP_STORE = "bk-popups";

function json(statusCode, body, headers = {}) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  };
}

export async function handler(event) {
  if (!["GET", "HEAD"].includes(event.httpMethod)) {
    return json(405, { error: "Method not allowed." });
  }

  try {
    const store = getConfiguredStore(POPUP_STORE, { consistency: "strong" });
    const data = (await store.get("items.json", { type: "json" })) || { items: [] };

    const active = (data.items || []).filter((p) => p.status === "active");

    return json(200, { items: active }, {
      "Cache-Control": "s-maxage=60, stale-while-revalidate=300",
    });
  } catch (error) {
    return json(500, { error: "Could not load pop-ups." });
  }
}
