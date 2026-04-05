// Test-send endpoint — sends the host-reminder template to mk@yellowsatinjacket.com only.
// Trigger: GET or POST /.netlify/functions/send-test-to-mk
// Uses the same template as weekly-host-reminder.js with an apology header.

const TO_EMAIL   = "mk@yellowsatinjacket.com";
const FROM_EMAIL = "ben@breakfastclubbing.com";
const FROM_NAME  = "Breakfast Club HQ";

const SHEET_LINK = "https://docs.google.com/spreadsheets/d/1_4MoIXgSHjERztj0LPPC-XAa7nzFlfrdcjEQdBeSqto/edit";
const DRIVE_LINK = "https://drive.google.com/drive/folders/1RghGzP25aW2chs1aPGxAzE9fZgFHucRe";
const ARTICLE_URL = "https://www.nytimes.com/2026/03/23/t-magazine/nyc-creative-scenes.html";
const LATEST_HAPPENINGS_GIF_URL = "https://breakfastclubbing.com/assets/LATEST_HAPPENINS.gif";
const CITY_LABEL = "New York — Hamptons";

function getUpcomingSunday() {
  const d = new Date();
  const daysUntil = ((7 - d.getDay()) % 7) || 7;
  d.setDate(d.getDate() + daysUntil);
  return d;
}

const targetSunday = getUpcomingSunday();
const cycleDate = targetSunday.toISOString().split("T")[0];
const flyerExample = `NewYorkHamptons_${cycleDate}.jpg`;

const plain = `Hey hosts,

Kilcoyne's sorry for the email spam. Working out some kinks on the automated sends.

What I meant to send below:

Every week, I read something that reminds me that what we're building together as a BC community around the world is not only meaningful, but necessary.

This week, it was this piece in T Magazine: Have You Found Your Microscene? (${ARTICLE_URL})

Stoked that we're helping create those micro-scenes around the globe.

Newest micro-scene:
NYC - Upper West Side | Wednesdays @ 8:30 AM | Viand Cafe, 2130 Broadway

We're also getting close on a new site feature: 'Latest Happenings.'

Here's an early preview:
${LATEST_HAPPENINGS_GIF_URL}

It pulls imagery from the Breakfast Clubbing newsletter (which are in turn pulled from Linkedin), so as long as we've got those, you're golden.

Anywho, call for updates. For ${CITY_LABEL}, here's where to update:

──────────────────────────

→ Master Sheet (update your listing): ${SHEET_LINK}
→ Flyer Folder (upload this week's flyer): ${DRIVE_LINK}

Flyer naming: City_YYYY-MM-DD.jpg (e.g. ${flyerExample})

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
    Kilcoyne's sorry for the email spam. Working out some kinks on the automated sends.
  </p>
  <p style="font-size: 15px; line-height: 1.6; font-weight: 600;">
    What I meant to send below:
  </p>
  <p style="font-size: 15px; line-height: 1.6;">
    Every week, I read something that reminds me that what we're building together as a BC community around the world is not only meaningful, but necessary.
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
    It pulls imagery from the Breakfast Clubbing newsletter (which are in turn pulled from Linkedin), so as long as we've got those, you're golden.
  </p>
  <p style="font-size: 15px; line-height: 1.6;">Anywho, call for updates. For <strong>${CITY_LABEL}</strong>, here's where to update:</p>
  <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
  <p style="font-size: 15px; line-height: 1.8;">
    → <a href="${SHEET_LINK}" style="color: #b07d3a;">Master Sheet</a> (update your listing)<br>
    → <a href="${DRIVE_LINK}" style="color: #b07d3a;">Flyer Folder</a> (upload this week's flyer)
  </p>
  <p style="font-size: 13px; line-height: 1.6; color: #666;">
    Flyer naming: City_YYYY-MM-DD.jpg (e.g. <code>${flyerExample}</code>)
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

export default async (req) => {
  const apiKey = Netlify.env.get("SENDGRID_API_KEY");
  if (!apiKey) {
    return Response.json({ error: "SENDGRID_API_KEY not configured" }, { status: 500 });
  }

  const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: TO_EMAIL }] }],
      from: { email: FROM_EMAIL, name: FROM_NAME },
      reply_to: { email: "ben@breakfastclubbing.com" },
      headers: {
        "List-Unsubscribe": "<mailto:ben@breakfastclubbing.com?subject=unsubscribe>",
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
      subject: "Club Update",
      content: [
        { type: "text/plain", value: plain },
        { type: "text/html", value: html },
      ],
    }),
  });

  if (res.status === 202) {
    console.log(`✓ Test email sent to ${TO_EMAIL}`);
    return Response.json({ sent: true, to: TO_EMAIL });
  }

  const body = await res.text();
  console.error(`✗ SendGrid error: ${res.status} ${body}`);
  return Response.json({ sent: false, status: res.status, error: body }, { status: 502 });
};
