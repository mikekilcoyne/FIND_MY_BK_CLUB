import { getStore } from "@netlify/blobs";

function json(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

export async function handler() {
  const siteID =
    process.env.NETLIFY_BLOBS_SITE_ID ||
    process.env.NETLIFY_SITE_ID ||
    process.env.SITE_ID ||
    "";
  const token =
    process.env.NETLIFY_BLOBS_TOKEN ||
    process.env.NETLIFY_AUTH_TOKEN ||
    process.env.NETLIFY_TOKEN ||
    "";

  const result = {
    hasSiteId: Boolean(siteID),
    hasToken: Boolean(token),
    siteIdSuffix: siteID ? siteID.slice(-6) : null,
    storeOpen: false,
    writeTest: false,
    error: null,
  };

  try {
    const store = getStore({
      name: "host-reminder-state",
      consistency: "strong",
      ...(siteID ? { siteID } : {}),
      ...(token ? { token } : {}),
    });
    result.storeOpen = true;
    await store.setJSON("debug/ping.json", { ok: true, at: new Date().toISOString() });
    result.writeTest = true;
  } catch (error) {
    result.error = error?.message || String(error);
  }

  return json(200, result);
}
