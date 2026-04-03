import { getStore } from "@netlify/blobs";
import { buildTicket, TRUSTED_APPROVERS } from "./lib/club-update-intake.js";

function json(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

function parseBody(event) {
  if (!event.body) return {};

  const contentType = String(
    event.headers?.["content-type"] || event.headers?.["Content-Type"] || ""
  ).toLowerCase();
  const rawBody = event.isBase64Encoded
    ? Buffer.from(event.body, "base64").toString("utf8")
    : event.body;

  if (contentType.includes("application/x-www-form-urlencoded")) {
    const params = new URLSearchParams(rawBody);
    const payload = {};
    for (const [key, value] of params.entries()) {
      payload[key] = value;
    }
    return payload;
  }

  try {
    return JSON.parse(rawBody);
  } catch (_error) {
    return {};
  }
}

async function persistTicket(ticket) {
  const store = getStore({ name: "club-update-intake", consistency: "strong" });
  await store.setJSON(`${ticket.status}/${ticket.id}.json`, ticket);
  await store.setJSON("latest.json", ticket);
}

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Only POST is supported." });
  }

  const payload = parseBody(event);
  const ticket = buildTicket(payload);

  if (!ticket.notes) {
    return json(400, { error: "Email body or notes are required." });
  }

  await persistTicket(ticket);

  return json(200, {
    ok: true,
    status: ticket.status,
    approvalReasons: ticket.approvalReasons,
    trustedApprovers: TRUSTED_APPROVERS,
    ticket,
  });
}
