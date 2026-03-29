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
const ARTICLE_URL = process.env.TEST_ARTICLE_URL || "https://www.nytimes.com/2026/03/23/t-magazine/nyc-creative-scenes.html";
const LATEST_HAPPENINGS_GIF_URL = process.env.TEST_GIF_URL || "https://69c91f509b35a6b3b3e908f2--luxury-toffee-ec4a34.netlify.app/LATEST_HAPPENINS.gif";
const TEST_CITY_LABEL = process.env.TEST_CITY_LABEL || "New York — Williamsburg";
const TEST_FLYER_EXAMPLE = process.env.TEST_FLYER_EXAMPLE || "NewYorkWilliamsburg_2026-03-23.jpg";

const apiKey = process.env.SENDGRID_API_KEY;
if (!apiKey) { console.error("Set SENDGRID_API_KEY env var"); process.exit(1); }

const plain = `Hey hosts,

Every week, I read something that reminds me what we're building together as a BC community around the world is not only meaningful, but necessary.

This week, it was this piece in T Magazine: Have You Found Your Microscene? (${ARTICLE_URL})

Stoked that we're helping create those micro-scenes around the globe.

Newest micro-scene:
NYC - Upper West Side | Wednesdays @ 8:30 AM | Viand Cafe, 2130 Broadway

We're also getting close on a new site feature: 'Latest Happenings.'

Here's an early preview:
${LATEST_HAPPENINGS_GIF_URL}

It pulls from the same Substack photos and recap updates already being shared, so as long as we've got those, you're golden.

Anywho, call for updates. For ${TEST_CITY_LABEL}, here's where to update:

──────────────────────────

→ Master Sheet (update your listing): ${SHEET_LINK}
→ Flyer Folder (upload this week's flyer): ${DRIVE_LINK}

Flyer naming: City_YYYY-MM-DD.jpg (e.g. ${TEST_FLYER_EXAMPLE})

If everything looks right, no action needed. See you at the table.

Questions? ben@breakfastclubbing.com

p.s. — Any cool ideas for the site? Email mike@breakfastclubbing.com and he'll make it happen. Big thanks to Kilcoyne for making this happen.

---
Breakfast Club HQ · New York, NY
You're receiving this because you host a Breakfast Club location.
To stop receiving these emails, reply with "unsubscribe" and we'll remove you.`;

const html = `
<div style="font-family: Georgia, serif; max-width: 540px; margin: 0 auto; color: #1a1a1a; padding: 32px 24px;">
  <p style="font-size: 15px; line-height: 1.6;">Hey hosts,</p>
  <p style="font-size: 15px; line-height: 1.6;">
    Every week, I read something that reminds me what we're building together as a BC community around the world is not only meaningful, but necessary.
  </p>
  <p style="font-size: 15px; line-height: 1.6;">
    This week, it was this piece in T Magazine:
    <a href="${ARTICLE_URL}" style="color: #b07d3a;">Have You Found Your Microscene?</a>
  </p>
  <p style="font-size: 15px; line-height: 1.6;">
    Stoked that we're helping create those micro-scenes around the globe.
  </p>
  <p style="font-size: 15px; line-height: 1.6;">
    <strong>Newest micro-scene:</strong><br>
    NYC - Upper West Side | Wednesdays @ 8:30 AM | Viand Cafe, 2130 Broadway
  </p>
  <p style="font-size: 15px; line-height: 1.6;">
    We're also getting close on a new site feature: <strong>'Latest Happenings.'</strong>
  </p>
  <p style="font-size: 15px; line-height: 1.6;">Here's an early preview:</p>
  <div style="margin: 24px 0; text-align: center;">
    <img src="${LATEST_HAPPENINGS_GIF_URL}" alt="Latest Happenings preview" style="display: block; width: 100%; max-width: 492px; height: auto; margin: 0 auto; border: 1px solid #eee;">
  </div>
  <p style="font-size: 15px; line-height: 1.6;">
    It pulls from the same Substack photos and recap updates already being shared, so as long as we've got those, you're golden.
  </p>
  <p style="font-size: 15px; line-height: 1.6;">Anywho, call for updates. For <strong>${TEST_CITY_LABEL}</strong>, here's where to update:</p>
  <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
  <p style="font-size: 15px; line-height: 1.8;">
    → <a href="${SHEET_LINK}" style="color: #b07d3a;">Master Sheet</a> (update your listing)<br>
    → <a href="${DRIVE_LINK}" style="color: #b07d3a;">Flyer Folder</a> (upload this week's flyer)
  </p>
  <p style="font-size: 13px; line-height: 1.6; color: #666;">
    Flyer naming: City_YYYY-MM-DD.jpg (e.g. <code>${TEST_FLYER_EXAMPLE}</code>)
  </p>
  <p style="font-size: 15px; line-height: 1.6;">
    If everything looks right, no action needed. See you at the table.
  </p>
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
    subject: `[TEST] Breakfast Club — ${TEST_CITY_LABEL} weekly update link`,
    content: [
      { type: "text/plain", value: plain },
      { type: "text/html",  value: html },
    ],
  }),
});

console.log(res.status === 202 ? `✓ Sent to ${TO_EMAILS.join(", ")}` : `✗ Failed: ${res.status} ${await res.text()}`);
