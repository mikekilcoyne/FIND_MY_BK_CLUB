import { getConfiguredStore } from "./lib/blob-store.js";

const MIME_TYPES = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  avif: "image/avif",
};

export async function handler(event) {
  if (!["GET", "HEAD"].includes(event.httpMethod)) {
    return { statusCode: 405, body: "Method not allowed" };
  }

  const key = event.queryStringParameters?.key;
  if (!key) return { statusCode: 400, body: "key required" };

  try {
    const store = getConfiguredStore("bk-flyers", { consistency: "strong" });
    const data = await store.get(key, { type: "arrayBuffer" });
    if (!data) return { statusCode: 404, body: "Not found" };

    const ext = key.split(".").pop().toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    const headers = {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=604800, immutable",
    };
    if (event.queryStringParameters?.download === "1") {
      headers["Content-Disposition"] = `attachment; filename="${key}"`;
    }

    return {
      statusCode: 200,
      headers,
      body: Buffer.from(data).toString("base64"),
      isBase64Encoded: true,
    };
  } catch (err) {
    return { statusCode: 500, body: `Error: ${err.message}` };
  }
}
