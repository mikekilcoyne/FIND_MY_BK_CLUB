const FROM_EMAIL = "set@breakfastclubbing.com";
const FROM_NAME = "Breakfast Club HQ";
const REPLY_TO = "set@breakfastclubbing.com";

function json(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || "");
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildContextLines(context) {
  const lines = [];
  if (context.displayCity) lines.push(`Display city: ${context.displayCity}`);
  if (context.host) lines.push(`Host: ${context.host}`);
  if (context.venue) lines.push(`Venue: ${context.venue}`);
  if (context.day) lines.push(`Day: ${context.day}`);
  if (context.scheduleLabel) lines.push(`Schedule: ${context.scheduleLabel}`);
  if (context.eventTime) lines.push(`Time: ${context.eventTime}`);
  return lines;
}

function buildPlainText(ticket) {
  const contextLines = buildContextLines(ticket.context || {});
  return `Breakfast Club update request

Club: ${ticket.club}
Submitted by: ${ticket.email}
Submitted at: ${ticket.submittedAt}

SUGGESTED UPDATE

${ticket.notes}

CARD CONTEXT

${contextLines.length ? contextLines.join("\n") : "No card context captured."}
`;
}

function buildHtml(ticket) {
  const contextLines = buildContextLines(ticket.context || {});
  const contextHtml = contextLines.length
    ? contextLines
        .map((line) => `<div style="margin: 0 0 6px;">${escapeHtml(line)}</div>`)
        .join("")
    : `<div>No card context captured.</div>`;

  return `
<div style="font-family: Georgia, serif; max-width: 640px; margin: 0 auto; color: #1a1a1a; padding: 32px 24px;">
  <p style="font-size: 32px; line-height: 1.05; font-weight: 600; letter-spacing: -0.03em; text-transform: uppercase; margin: 0 0 22px; color: #5f4b1f;">
    Breakfast Club update request
  </p>

  <p style="font-size: 15px; line-height: 1.7; margin: 0 0 12px;"><strong>Club:</strong> ${escapeHtml(ticket.club)}</p>
  <p style="font-size: 15px; line-height: 1.7; margin: 0 0 12px;"><strong>Submitted by:</strong> <a href="mailto:${escapeHtml(ticket.email)}" style="color: #b07d3a;">${escapeHtml(ticket.email)}</a></p>
  <p style="font-size: 15px; line-height: 1.7; margin: 0 0 26px;"><strong>Submitted at:</strong> ${escapeHtml(ticket.submittedAt)}</p>

  <p style="font-size: 12px; line-height: 1.4; letter-spacing: 0.08em; text-transform: uppercase; color: #8a6522; margin: 0 0 10px;">
    Suggested update
  </p>
  <div style="font-size: 18px; line-height: 1.55; padding: 18px 18px; margin: 0 0 24px; background: #fffaf0; border: 1px solid #e4c987; border-radius: 14px; white-space: pre-wrap;">
    ${escapeHtml(ticket.notes)}
  </div>

  <p style="font-size: 12px; line-height: 1.4; letter-spacing: 0.08em; text-transform: uppercase; color: #8a6522; margin: 0 0 10px;">
    Card context
  </p>
  <div style="font-size: 15px; line-height: 1.65; color: #3d372b;">
    ${contextHtml}
  </div>
</div>
`;
}

async function sendUpdateEmail(ticket) {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) {
    throw new Error("SENDGRID_API_KEY is not set.");
  }

  const toEmail =
    process.env.CLUB_UPDATE_TEST_TO ||
    process.env.TEST_EMAIL_TO ||
    "mk@yellowsatinjacket.com";

  const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: toEmail }] }],
      from: { email: FROM_EMAIL, name: FROM_NAME },
      reply_to: { email: REPLY_TO },
      subject: "Breakfast Club update request",
      content: [
        { type: "text/plain", value: buildPlainText(ticket) },
        { type: "text/html", value: buildHtml(ticket) },
      ],
    }),
  });

  if (res.status !== 202) {
    const body = await res.text();
    throw new Error(`SendGrid send failed: ${res.status} ${body}`);
  }

  return { toEmail };
}

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Only POST is supported." });
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch (_error) {
    return json(400, { error: "Invalid JSON payload." });
  }

  const club = String(payload.club || "").trim();
  const notes = String(payload.notes || "").trim();
  const email = String(payload.email || "").trim();
  const submittedAt = String(payload.submittedAt || new Date().toISOString()).trim();

  if (!club) return json(400, { error: "Club is required." });
  if (!notes) return json(400, { error: "Tell us what needs updating." });
  if (!email || !isValidEmail(email)) {
    return json(400, { error: "A valid email is required." });
  }

  const ticket = {
    club,
    email,
    submittedAt,
    context: payload.context || {},
    notes,
    source: "site_modal",
  };

  try {
    const result = await sendUpdateEmail(ticket);
    return json(200, {
      success: true,
      toEmail: result.toEmail,
    });
  } catch (error) {
    return json(500, { error: error.message || "Could not send update." });
  }
}
