import sharp from "sharp";
import { getConfiguredStore } from "./lib/blob-store.js";

export async function handler(event) {
  if (!["GET", "HEAD"].includes(event.httpMethod)) {
    return { statusCode: 405, body: "Method not allowed" };
  }

  const key = event.queryStringParameters?.key;
  if (!key) return { statusCode: 400, body: "key required" };

  const w = parseInt(event.queryStringParameters?.w || "0");

  try {
    const store = getConfiguredStore("bk-flyers", { consistency: "strong" });
    const data = await store.get(key, { type: "arrayBuffer" });
    if (!data) return { statusCode: 404, body: "Not found" };

    const buf = Buffer.from(data);

    // Thumbnail mode: resize to requested width, serve as JPEG
    if (w > 0 && w <= 1600) {
      const thumb = await sharp(buf)
        .resize(w, null, { withoutEnlargement: true })
        .jpeg({ quality: 90, progressive: true, mozjpeg: true })
        .toBuffer();
      return {
        statusCode: 200,
        headers: {
          "Content-Type": "image/jpeg",
          "Cache-Control": "public, max-age=2592000, immutable",
        },
        body: thumb.toString("base64"),
        isBase64Encoded: true,
      };
    }

    const ext = key.split(".").pop().toLowerCase();
    const MIME = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", gif: "image/gif", webp: "image/webp", avif: "image/avif" };
    const headers = {
      "Content-Type": MIME[ext] || "application/octet-stream",
      "Cache-Control": "public, max-age=604800, immutable",
    };
    if (event.queryStringParameters?.download === "1") {
      headers["Content-Disposition"] = `attachment; filename="${key}"`;
    }

    return { statusCode: 200, headers, body: buf.toString("base64"), isBase64Encoded: true };
  } catch (err) {
    return { statusCode: 500, body: `Error: ${err.message}` };
  }
}
