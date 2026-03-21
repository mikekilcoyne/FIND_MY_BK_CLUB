// One-off test script — sends a preview email to a single address.
// Usage: SENDGRID_API_KEY=your_key node netlify/functions/send-test-email.mjs

const TO_EMAILS  = ["ben@breakfastclubbing.com"];
const FROM_EMAIL = "ben@breakfastclubbing.com";
const SHEET_LINK = "https://docs.google.com/spreadsheets/d/1_4MoIXgSHjERztj0LPPC-XAa7nzFlfrdcjEQdBeSqto/edit";
const DRIVE_LINK = "https://drive.google.com/drive/folders/1RghGzP25aW2chs1aPGxAzE9fZgFHucRe";
const ARTICLE_URL = "https://www.theatlantic.com/family/2025/10/social-media-relationships-parasocial/684551/?gift=j9r7avb6p-KY8zdjhsiSZ606rXO3GbWdg9lVmnLOvJg";

const apiKey = process.env.SENDGRID_API_KEY;
if (!apiKey) { console.error("Set SENDGRID_API_KEY env var"); process.exit(1); }

const plain = `Hey hosts —

Recently got this article forwarded from CDMX's host Steve, called "The Great Friendship Flattening" — ${ARTICLE_URL}

Quick thought from my end: We breakfast for the people (familiar and new), the conversation (pointed and arcane) and especially for the vibes (positive, collaborative, forward-looking). Because it's fun. And we can all use a little more of that.

You can read the full article here: ${ARTICLE_URL}

Anywho, call for updates (I'm gonna aim to make these more dynamic).

──────────────────────────

For New York — Williamsburg, here's where to update:

→ Master Sheet (update your listing): ${SHEET_LINK}
→ Flyer Folder (upload this week's flyer): ${DRIVE_LINK}

Flyer naming: City_YYYY-MM-DD.jpg (e.g. NewYorkWilliamsburg_2026-03-23.jpg)

If everything looks right, no action needed. See you at the table.

Questions? ben@breakfastclubbing.com

p.s. — Any cool ideas for the site? Email mike@breakfastclubbing.com and he'll make it happen. Big thanks to Kilcoyne for making this happen.

p.p.s. — We're working on making the site more dynamic, including figuring out cool ways to display flyers on the site, and a 'Word Cloud' feature. So save your "What we talked about" convos.

---
Breakfast Club HQ · New York, NY
You're receiving this because you host a Breakfast Club location.
To stop receiving these emails, reply with "unsubscribe" and we'll remove you.`;

const html = `
<div style="font-family: Georgia, serif; max-width: 540px; margin: 0 auto; color: #1a1a1a; padding: 32px 24px;">
  <p style="font-size: 15px; line-height: 1.6;">Hey hosts —</p>
  <p style="font-size: 15px; line-height: 1.6;">
    Recently got this article forwarded from CDMX's host Steve, called <a href="${ARTICLE_URL}" style="color: #b07d3a;">"The Great Friendship Flattening"</a>.
  </p>
  <p style="font-size: 15px; line-height: 1.6;">
    Quick thought from my end: We breakfast for the people (familiar and new), the conversation (pointed and arcane) and especially for the vibes (positive, collaborative, forward-looking). Because it's fun. And we can all use a little more of that.
  </p>
  <p style="font-size: 15px; line-height: 1.6;">
    You can read the full article <a href="${ARTICLE_URL}" style="color: #b07d3a;">here</a>.
  </p>
  <p style="font-size: 15px; line-height: 1.6;">Anywho, call for updates (I'm gonna aim to make these more dynamic).</p>
  <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
  <p style="font-size: 15px; line-height: 1.6;">
    For <strong>New York — Williamsburg</strong>, here's where to update:
  </p>
  <p style="font-size: 15px; line-height: 1.8;">
    → <a href="${SHEET_LINK}" style="color: #b07d3a;">Master Sheet</a> (update your listing)<br>
    → <a href="${DRIVE_LINK}" style="color: #b07d3a;">Flyer Folder</a> (upload this week's flyer)
  </p>
  <p style="font-size: 13px; line-height: 1.6; color: #666;">
    Flyer naming: City_YYYY-MM-DD.jpg (e.g. <code>NewYorkWilliamsburg_2026-03-23.jpg</code>)
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
  <p style="font-size: 14px; line-height: 1.6; color: #666;">
    p.p.s. — We're working on making the site more dynamic, including figuring out cool ways to display flyers on the site, and a 'Word Cloud' feature. So save your "What we talked about" convos.
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
    subject: "[TEST] Breakfast Club — your weekly update link",
    content: [
      { type: "text/plain", value: plain },
      { type: "text/html",  value: html },
    ],
  }),
});

console.log(res.status === 202 ? `✓ Sent to ${TO_EMAILS.join(", ")}` : `✗ Failed: ${res.status} ${await res.text()}`);
