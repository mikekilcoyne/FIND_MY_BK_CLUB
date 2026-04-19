// One-off test script — sends a preview email to one or more addresses.
// Usage:
//   set -a && source .env && set +a
//   TEST_EMAIL_TO="mk@yellowsatinjacket.com" node netlify/functions/send-test-email.mjs
// Source copy reference: docs/host-email-template.md

const TO_EMAILS  = (process.env.TEST_EMAIL_TO || "mk@yellowsatinjacket.com")
  .split(",")
  .map((email) => email.trim())
  .filter(Boolean);
const FROM_EMAIL = "ben@breakfastclubbing.com";
const SHEET_LINK = "https://docs.google.com/spreadsheets/d/1_4MoIXgSHjERztj0LPPC-XAa7nzFlfrdcjEQdBeSqto/edit";
const DRIVE_LINK = "https://drive.google.com/drive/folders/1RghGzP25aW2chs1aPGxAzE9fZgFHucRe";
const LATEST_HAPPENINGS_URL = process.env.TEST_LATEST_HAPPENINGS_URL || "https://breakfastclubbing.com/what-we-talked-about";
const TEST_CITY_LABEL = process.env.TEST_CITY_LABEL || "New York — Williamsburg";
const TEST_FLYER_EXAMPLE = process.env.TEST_FLYER_EXAMPLE || "NewYorkWilliamsburg_2026-03-23.jpg";
const TEST_MODE = process.env.TEST_MODE === "correction" ? "correction" : "scheduled";
const TEST_SUBJECT = process.env.TEST_SUBJECT || "BC reminder - update your club listing";

const apiKey = process.env.SENDGRID_API_KEY;
if (!apiKey) { console.error("Set SENDGRID_API_KEY env var"); process.exit(1); }

function buildTopNotice(mode) {
  if (mode !== "correction") return { text: "", html: "" };

  return {
    text: `Kilcoyne's working out some kinks. Sends his apologies for the annoying email spam yesterday.

What I meant to send below:
`,
    html: `
  <p style="font-size: 15px; line-height: 1.6;">
    Kilcoyne's working out some kinks. Sends his apologies for the annoying email spam yesterday.
  </p>
  <p style="font-size: 15px; line-height: 1.6; font-weight: 600;">
    What I meant to send below:
  </p>`,
  };
}

const { text: topNoticeText, html: topNoticeHtml } = buildTopNotice(TEST_MODE);

const plain = `Hey hosts,

${topNoticeText}

BC just hit 100 newsletters.

All I have to say to celebrate is this: From the beginning it's always been about creating maximum value with minimum effort. Show up at the same restaurant, same day, same hour, and commune with whoever walks in.

No RSVPs means nobody to keep track of; no theme means the shape is dynamic; no cost of entry means nobody has to worry about ticket sales; and no pitches means no complaining after the fact.

Thank you to all of you amazing hosts for turning this into a real, global community.

On that same note: For ${TEST_CITY_LABEL}, here's where to update:

──────────────────────────

→ Master Sheet (update your listing): ${SHEET_LINK}
→ Flyer Folder (upload this week's flyer): ${DRIVE_LINK}

Flyer naming: City_YYYY-MM-DD.jpg (e.g. ${TEST_FLYER_EXAMPLE})

If everything's good, you're good.

— Ben Dietz

Questions? ben@breakfastclubbing.com

p.s. — Any cool ideas for the site? Email mike@breakfastclubbing.com and he'll make it happen. Big thanks to Kilcoyne for making this happen.

---
Breakfast Club HQ · New York, NY
You're receiving this because you host a Breakfast Club location.
To stop receiving these emails, reply with "unsubscribe" and we'll remove you.`;

const html = `
<div style="font-family: Georgia, serif; max-width: 540px; margin: 0 auto; color: #1a1a1a; padding: 32px 24px;">
  <p style="font-size: 15px; line-height: 1.6;">Hey hosts,</p>
  ${topNoticeHtml}
  <p style="font-size: 15px; line-height: 1.6;">BC just hit 100 newsletters.</p>
  <p style="font-size: 15px; line-height: 1.6;">
    All I have to say to celebrate is this: From the beginning it's always been about creating maximum value with minimum effort. Show up at the same restaurant, same day, same hour, and commune with whoever walks in.
  </p>
  <p style="font-size: 15px; line-height: 1.6;">
    No RSVPs means nobody to keep track of; no theme means the shape is dynamic; no cost of entry means nobody has to worry about ticket sales; and no pitches means no complaining after the fact.
  </p>
  <p style="font-size: 15px; line-height: 1.6;">
    Thank you to all of you amazing hosts for turning this into a real, global community.
  </p>
  <p style="font-size: 15px; line-height: 1.6;">On that same note: For <strong>${TEST_CITY_LABEL}</strong>, here's where to update:</p>
  <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
  <p style="font-size: 15px; line-height: 1.8;">
    → <a href="${SHEET_LINK}" style="color: #b07d3a;">Master Sheet</a> (update your listing)<br>
    → <a href="${DRIVE_LINK}" style="color: #b07d3a;">Flyer Folder</a> (upload this week's flyer)
  </p>
  <p style="font-size: 13px; line-height: 1.6; color: #666;">
    Flyer naming: City_YYYY-MM-DD.jpg (e.g. <code>${TEST_FLYER_EXAMPLE}</code>)
  </p>
  <p style="font-size: 15px; line-height: 1.6;">If everything's good, you're good.</p>
  <p style="font-size: 15px; line-height: 1.6;">— Ben Dietz</p>
  <p style="font-size: 14px; line-height: 1.8; color: #666; margin-top: 32px;">
    Questions? <a href="mailto:ben@breakfastclubbing.com" style="color: #b07d3a;">ben@breakfastclubbing.com</a>
  </p>
  <p style="font-size: 14px; line-height: 1.6; color: #666;">
    p.s. — Any cool ideas for the site? Email <a href="mailto:mike@breakfastclubbing.com" style="color: #b07d3a;">mike@breakfastclubbing.com</a> and he'll make it happen. Big thanks to Kilcoyne for making this happen.
  </p>
  <p style="font-size: 12px; line-height: 1.6; color: #999; margin-top: 24px; border-top: 1px solid #eee; padding-top: 16px;">
    Breakfast Club HQ &middot; New York, NY<br>
    You're receiving this because you host a Breakfast Club location.<br>
    To stop receiving these emails, reply with "unsubscribe" and we'll remove you.
  </p>
</div>`;

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
    subject: TEST_MODE === "correction"
      ? "Sorry!"
      : TEST_SUBJECT,
    content: [
      { type: "text/plain", value: plain },
      { type: "text/html",  value: html },
    ],
  }),
});

console.log(res.status === 202 ? `✓ Sent to ${TO_EMAILS.join(", ")}` : `✗ Failed: ${res.status} ${await res.text()}`);
