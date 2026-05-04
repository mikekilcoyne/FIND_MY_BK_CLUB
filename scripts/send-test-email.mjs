// One-off test script — sends a preview email to one or more addresses.
// Usage:
//   set -a && source .env && set +a
//   TEST_EMAIL_TO="mk@yellowsatinjacket.com" node netlify/functions/send-test-email.mjs
// Source copy reference: docs/host-email-template.md

import {
  HOST_REMINDER_LINKS,
  buildEmailBody,
  buildEmailHTML,
  buildSubject,
} from "../netlify/functions/lib/host-reminder-email-template.mjs";

const TO_EMAILS  = (process.env.TEST_EMAIL_TO || "mk@yellowsatinjacket.com")
  .split(",")
  .map((email) => email.trim())
  .filter(Boolean);
const FROM_EMAIL = "ben@breakfastclubbing.com";
const TEST_CITY_LABEL = process.env.TEST_CITY_LABEL || "New York — Williamsburg";
const TEST_FLYER_EXAMPLE = process.env.TEST_FLYER_EXAMPLE || "NewYorkWilliamsburg_2026-03-23.jpg";
const TEST_MODE = process.env.TEST_MODE === "correction" ? "correction" : "scheduled";
const TEST_SUBJECT = process.env.TEST_SUBJECT || "BC reminder - update your club listing";

const apiKey = process.env.SENDGRID_API_KEY;
if (!apiKey) { console.error("Set SENDGRID_API_KEY env var"); process.exit(1); }
const TEST_LINKS = {
  ...HOST_REMINDER_LINKS,
  latestHappenings: process.env.TEST_LATEST_HAPPENINGS_URL || HOST_REMINDER_LINKS.latestHappenings,
};
const TEST_TARGET_SUNDAY = new Date("2026-03-22T12:00:00Z");
const TEST_CITIES = [TEST_CITY_LABEL];
const plain = buildEmailBody(TEST_CITIES, TEST_TARGET_SUNDAY, { mode: TEST_MODE, links: TEST_LINKS })
  .replace(/City_[Y]{4}-MM-DD\.jpg \(e\.g\. [^)]+\)/, `City_YYYY-MM-DD.jpg (e.g. ${TEST_FLYER_EXAMPLE})`);
const html = buildEmailHTML(TEST_CITIES, TEST_TARGET_SUNDAY, { mode: TEST_MODE, links: TEST_LINKS })
  .replace(/City_YYYY-MM-DD\.jpg \(e\.g\. <code>[^<]+<\/code>\)/, `City_YYYY-MM-DD.jpg (e.g. <code>${TEST_FLYER_EXAMPLE}</code>)`);

const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
  method: "POST",
  headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
  body: JSON.stringify({
    personalizations: [{ to: TO_EMAILS.map(email => ({ email })) }],
    from: { email: FROM_EMAIL, name: "Breakfast Club HQ" },
    reply_to: { email: "ben@breakfastclubbing.com" },
    headers: {
      "List-Unsubscribe": `<mailto:ben@breakfastclubbing.com?subject=unsubscribe>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
    subject: buildSubject(TEST_CITIES, {
      mode: TEST_MODE,
      singleClubSubject: TEST_SUBJECT,
    }),
    content: [
      { type: "text/plain", value: plain },
      { type: "text/html",  value: html },
    ],
  }),
});

console.log(res.status === 202 ? `✓ Sent to ${TO_EMAILS.join(", ")}` : `✗ Failed: ${res.status} ${await res.text()}`);
