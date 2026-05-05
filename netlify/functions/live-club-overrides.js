import { getLiveOverridesSnapshot } from "./lib/live-club-overrides.js";

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
    body: JSON.stringify(body),
  };
}

export async function handler(event) {
  if (!["GET", "HEAD"].includes(event.httpMethod || "GET")) {
    return json(405, { error: "Only GET and HEAD are supported." });
  }

  try {
    const snapshot = await getLiveOverridesSnapshot();
    return json(200, snapshot);
  } catch (error) {
    return json(500, {
      error: "Could not load live club overrides.",
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}
