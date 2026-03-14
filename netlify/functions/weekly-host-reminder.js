// Runs every Sunday at 12:00 UTC (8am ET)
// Fetches active host emails from the Google Sheet and sends a weekly reminder via SendGrid.
//
// Required env vars (set in Netlify Dashboard → Site settings → Environment variables):
//   SENDGRID_API_KEY   — from the existing SendGrid account
//   SHEET_CSV_URL      — Google Sheet CSV export URL (same as in script.js)

const SHEET_CSV_URL = process.env.SHEET_CSV_URL ||
  "https://docs.google.com/spreadsheets/d/1_4MoIXgSHjERztj0LPPC-XAa7nzFlfrdcjEQdBeSqto/export?format=csv&gid=0";

const FROM_EMAIL = "ben@breakfastclubbing.com";
const FROM_NAME  = "Breakfast Club HQ";
const REPLY_TO   = "ben@breakfastclubbing.com";

const SHEET_LINK = "https://docs.google.com/spreadsheets/d/1_4MoIXgSHjERztj0LPPC-XAa7nzFlfrdcjEQdBeSqto/edit";
const DRIVE_LINK = "https://drive.google.com/drive/folders/1RghGzP25aW2chs1aPGxAzE9fZgFHucRe";

// ── CSV parser ────────────────────────────────────────────────────────────────

function parseCSVLine(line) {
  const out = [];
  let value = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') { value += '"'; i++; }
      else { inQuotes = !inQuotes; }
      continue;
    }
    if (char === "," && !inQuotes) { out.push(value.trim()); value = ""; continue; }
    value += char;
  }
  out.push(value.trim());
  return out;
}

function parseCSV(text) {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter(Boolean);
  const [headerLine, ...dataLines] = lines;
  const headers = parseCSVLine(headerLine).map(h => h.trim());

  return dataLines.map(line => {
    const cells = parseCSVLine(line);
    const row = {};
    headers.forEach((h, i) => { row[h] = (cells[i] || "").trim(); });
    return row;
  });
}

// ── Email builder ─────────────────────────────────────────────────────────────

function buildEmailBody(hostName, city) {
  const firstName = (hostName || "").split(" ")[0] || "there";
  const nextSunday = new Date();
  nextSunday.setDate(nextSunday.getDate() + (7 - nextSunday.getDay()) % 7 || 7);
  const dateStr = nextSunday.toLocaleDateString("en-US", { month: "long", day: "numeric" });

  return `Hey y'all —

We're working on automating this whole thing so your listings get automagically updated on breakfastclubbing.com. You'll see one email from me every week asking for updates.

The site pulls directly from the doc + the flyers folder — so keeping both up to date is all you have to do.

──────────────────────────

For ${city}, here's where to update:

→ Master Sheet (update your listing): ${SHEET_LINK}
→ Flyer Folder (upload this week's flyer): ${DRIVE_LINK}

Flyer naming: City_YYYY-MM-DD.jpg (e.g. ${city.replace(/[^a-zA-Z]/g, "")}_${nextSunday.toISOString().split("T")[0]}.jpg)

If everything looks right, no action needed. See you at the table.

Questions? ben@breakfastclubbing.com

p.s. — Any cool ideas for the site? Email mike@breakfastclubbing.com and he'll make it happen. Big thanks to Kilcoyne for making this happen.

---
Breakfast Club HQ · New York, NY
You're receiving this because you host a Breakfast Club location.
To stop receiving these emails, reply with "unsubscribe" and we'll remove you.`;
}

function buildEmailHTML(hostName, city) {
  const firstName = (hostName || "").split(" ")[0] || "there";
  const nextSunday = new Date();
  nextSunday.setDate(nextSunday.getDate() + (7 - nextSunday.getDay()) % 7 || 7);
  const flyerName = `${city.replace(/[^a-zA-Z]/g, "")}_${nextSunday.toISOString().split("T")[0]}.jpg`;

  return `
<div style="font-family: Georgia, serif; max-width: 540px; margin: 0 auto; color: #1a1a1a; padding: 32px 24px;">
  <p style="font-size: 15px; line-height: 1.6;">Hey y'all —</p>
  <p style="font-size: 15px; line-height: 1.6;">
    We're working on automating this whole thing so your listings get <strong>automagically</strong> updated on <a href="https://breakfastclubbing.com" style="color: #b07d3a;">breakfastclubbing.com</a>. You'll see one email from me every week asking for updates.
  </p>
  <p style="font-size: 15px; line-height: 1.6;">
    The site pulls directly from the doc + the flyers folder — so keeping both up to date is all you have to do.
  </p>
  <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
  <p style="font-size: 15px; line-height: 1.6;">
    For <strong>${city}</strong>, here's where to update:
  </p>
  <p style="font-size: 15px; line-height: 1.8;">
    → <a href="${SHEET_LINK}" style="color: #b07d3a;">Master Sheet</a> (update your listing)<br>
    → <a href="${DRIVE_LINK}" style="color: #b07d3a;">Flyer Folder</a> (upload this week's flyer)
  </p>
  <p style="font-size: 13px; line-height: 1.6; color: #666;">
    Flyer naming: City_YYYY-MM-DD.jpg (e.g. <code>${flyerName}</code>)
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
}

// ── Main handler ──────────────────────────────────────────────────────────────

export async function handler() {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) {
    console.error("SENDGRID_API_KEY not set");
    return { statusCode: 500, body: "Missing SENDGRID_API_KEY" };
  }

  // 1. Fetch sheet
  let rows;
  try {
    const res = await fetch(SHEET_CSV_URL);
    if (!res.ok) throw new Error(`Sheet fetch failed: ${res.status}`);
    const csv = await res.text();
    rows = parseCSV(csv);
  } catch (err) {
    console.error("Failed to fetch sheet:", err.message);
    return { statusCode: 500, body: "Sheet fetch failed" };
  }

  // 2. Filter active hosts with emails
  const recipients = rows
    .filter(row => row.Active !== "No" && row.Host_Email)
    .flatMap(row => {
      const city      = row.City || "";
      const hostName  = row.Host_Name || "";
      return row.Host_Email.split(";").map(email => ({
        email: email.trim().toLowerCase(),
        city,
        hostName,
      }));
    })
    .filter(r => r.email && r.email.includes("@"));

  if (!recipients.length) {
    console.log("No recipients found — check Host_Email column in sheet");
    return { statusCode: 200, body: "No recipients" };
  }

  console.log(`Sending to ${recipients.length} hosts`);

  // 3. Send via SendGrid
  let sent = 0;
  let failed = 0;

  for (const { email, city, hostName } of recipients) {
    const payload = {
      personalizations: [{ to: [{ email }] }],
      from: { email: FROM_EMAIL, name: FROM_NAME },
      reply_to: { email: REPLY_TO },
      headers: {
        "List-Unsubscribe": `<mailto:ben@breakfastclubbing.com?subject=unsubscribe>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
      subject: `Breakfast Club reminder — update your ${city} listing`,
      content: [
        { type: "text/plain", value: buildEmailBody(hostName, city) },
        { type: "text/html",  value: buildEmailHTML(hostName, city) },
      ],
    };

    try {
      const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (res.status === 202) {
        sent++;
        console.log(`✓ Sent to ${email} (${city})`);
      } else {
        const body = await res.text();
        console.error(`✗ Failed for ${email}: ${res.status} ${body}`);
        failed++;
      }
    } catch (err) {
      console.error(`✗ Error sending to ${email}:`, err.message);
      failed++;
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ sent, failed }),
  };
}
