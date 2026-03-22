// Runs every Sunday at 16:30 UTC (12:30pm ET)
// Fetches active host emails from the Google Sheet and sends a weekly reminder via SendGrid.
//
// Required env vars (set in Netlify Dashboard → Site settings → Environment variables):
//   SENDGRID_API_KEY   — from the existing SendGrid account
//   SHEET_CSV_URL      — Google Sheet CSV export URL (same as in script.js)

const SHEET_CSV_URL = process.env.SHEET_CSV_URL ||
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRMNG01d9e9EXWFE8p97q1HnUj1ikPttYoO1fP1kV-izueziGqw0oDEmDWp1ZukS3pSrnR4EBCQoKJu/pub?output=csv";

// Fallback host list — used if the sheet fetch fails.
// Each entry: { city, hostName, emails: ["a@b.com", ...] }
const FALLBACK_HOSTS = [
  { city: "Amsterdam",                  hostName: "Sheila Guo",                                    emails: ["sheilaguo42@gmail.com"] },
  { city: "Barcelona",                  hostName: "Nicole Ingra & Kevin Maguire",                  emails: ["hello@nicoleingra.com", "kevmaguire@gmail.com"] },
  { city: "Bassano del Grappa",         hostName: "Charla Caponi & Amy Rich",                      emails: ["charlanoelcaponi@gmail.com"] },
  { city: "Biarritz",                   hostName: "Maggie Spicer",                                 emails: ["maggie@whisksf.com"] },
  { city: "Boulder",                    hostName: "Joy Shure",                                     emails: ["joy.s@skratchlabs.com"] },
  { city: "Copenhagen",                 hostName: "Denize Maaloe, Diego Marini & team",            emails: ["denize@yummycolours.com"] },
  { city: "Denver",                     hostName: "Kate Gagnon",                                   emails: ["Kate.gagnon@gmail.com"] },
  { city: "London",                     hostName: "Victoria Gates Fleming",                        emails: ["victoria.gatesfleming@gmail.com"] },
  { city: "Lugano",                     hostName: "Camilla Finocchiaro Aprile & Elettra Fiumi",   emails: ["camillandreaprile@gmail.com", "elettra.fiumi@gmail.com"] },
  { city: "Melbourne — Fitzroy",        hostName: "Celeste Blewitt & Josh Gardiner",               emails: ["celeste@celesteblewitt.com", "josh@gardinercommunications.com"] },
  { city: "Melbourne — Richmond",       hostName: "Steph Clarke",                                  emails: ["steph@28thursdays.com"] },
  { city: "Mexico City",                hostName: "Steve Bryant",                                  emails: ["steev@thisisdelightful.com"] },
  { city: "Milano",                     hostName: "Charla Caponi, Moritz Gaudlitz & Giorgio Bartoli", emails: ["charlanoelcaponi@gmail.com", "giorgio@golabagency.com", "mg@cultureshifts.net"] },
  { city: "New York — Downtown Brooklyn", hostName: "Kat Popiel & Lynn Juang",                    emails: ["Kat.popiel@gmail.com"] },
  { city: "New York — Hamptons",        hostName: "Michael Kilcoyne & Adam H.",                    emails: ["mk@yellowsatinjacket.com"] },
  { city: "New York — LES",             hostName: "Heidi Hartwig",                                 emails: ["Heidi@friendsfromnewyork.com"] },
  { city: "New York — Williamsburg",    hostName: "Ben Dietz",                                     emails: ["ben.dietz@gmail.com"] },
  { city: "Norwich",                    hostName: "Rusty Nash & Emily Delva",                      emails: ["rusty@opalescent.com", "emily@opalescent.com"] },
  { city: "Panama City",                hostName: "Carla Batista, Jacob Larrinaga & Daniela Jované", emails: ["cbatistajf@gmail.com", "crecer@academiadespierta.com", "djovaner@gmail.com"] },
  { city: "Paris",                      hostName: "Lisa Ono, Karla Rodriguez & Sarah Garcia Delporte", emails: ["lisaonocreate@icloud.com", "sarah_garciadelporte@yahoo.fr", "karlarodriguezcespedes@gmail.com"] },
  { city: "Philadelphia",               hostName: "Julie Gerstein",                                emails: ["julie.gerstein@gmail.com"] },
  { city: "Portland, ME",               hostName: "Michele Martin & Lydia Wagner",                 emails: ["michelemartin207@gmail.com", "wagnerlk@gmail.com"] },
  { city: "Portland, OR",               hostName: "Nina Sers & Chelsea Place",                     emails: ["Ninasers@gmail.com"] },
  { city: "San Francisco",              hostName: "Chris Gillespie",                               emails: ["chris@fenwick.media"] },
  { city: "Seattle",                    hostName: "Mike Burlin",                                   emails: ["michael.burlin@gmail.com"] },
  { city: "Singapore",                  hostName: "Seraphina Woon",                                emails: ["seraphina.woon@gmail.com"] },
  { city: "Maplewood, NJ",             hostName: "James Friedman",                                emails: ["james.friedman@gmail.com"] },
  { city: "Torquay, AU",               hostName: "Steph Clarke",                                  emails: ["steph@28thursdays.com"] },
  { city: "Sydney",                     hostName: "Elisha Akhtar",                                 emails: ["eliakhtar89@gmail.com"] },
  { city: "Toronto",                    hostName: "Jared Gordon & Sarah Phillips",                 emails: ["jared@gordonintl.com", "phillips.a.sarah@gmail.com"] },
  { city: "Vienna",                     hostName: "Carla Moss & Laura Pana",                       emails: ["mariacarlamoss@gmail.com"] },
  { city: "Washington DC",             hostName: "Michael Hastings-Black",                        emails: ["michael@askmhb.com"] },
];

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

  return `Hey hosts —

Recently got this article forwarded from CDMX's host Steve, called "The Great Friendship Flattening" — https://www.theatlantic.com/family/2025/10/social-media-relationships-parasocial/684551/?gift=j9r7avb6p-KY8zdjhsiSZ606rXO3GbWdg9lVmnLOvJg

Quick thought from my end: We breakfast for the people (familiar and new), the conversation (pointed and arcane) and especially for the vibes (positive, collaborative, forward-looking). Because it's fun. And we can all use a little more of that.

You can read the full article here: https://www.theatlantic.com/family/2025/10/social-media-relationships-parasocial/684551/?gift=j9r7avb6p-KY8zdjhsiSZ606rXO3GbWdg9lVmnLOvJg

Anywho, call for updates (I'm gonna aim to make these more dynamic).

──────────────────────────

For ${city}, here's where to update:

→ Master Sheet (update your listing): ${SHEET_LINK}
→ Flyer Folder (upload this week's flyer): ${DRIVE_LINK}

Flyer naming: City_YYYY-MM-DD.jpg (e.g. ${city.replace(/[^a-zA-Z]/g, "")}_${nextSunday.toISOString().split("T")[0]}.jpg)

If everything looks right, no action needed. See you at the table.

Questions? ben@breakfastclubbing.com

p.s. — Any cool ideas for the site? Email mike@breakfastclubbing.com and he'll make it happen. Big thanks to Kilcoyne for making this happen.

p.p.s. — Kilcoyne's working on a 'Word Cloud' feature that was inspired by another BC International host. It's gonna be super sick, so I encourage you to share your 'What We Talked About' posts and make sure they're in your updates.

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
  <p style="font-size: 15px; line-height: 1.6;">Hey hosts —</p>
  <p style="font-size: 15px; line-height: 1.6;">
    Recently got this article forwarded from CDMX's host Steve, called <a href="https://www.theatlantic.com/family/2025/10/social-media-relationships-parasocial/684551/?gift=j9r7avb6p-KY8zdjhsiSZ606rXO3GbWdg9lVmnLOvJg" style="color: #b07d3a;">"The Great Friendship Flattening"</a>.
  </p>
  <p style="font-size: 15px; line-height: 1.6;">
    Quick thought from my end: We breakfast for the people (familiar and new), the conversation (pointed and arcane) and especially for the vibes (positive, collaborative, forward-looking). Because it's fun. And we can all use a little more of that.
  </p>
  <p style="font-size: 15px; line-height: 1.6;">
    You can read the full article <a href="https://www.theatlantic.com/family/2025/10/social-media-relationships-parasocial/684551/?gift=j9r7avb6p-KY8zdjhsiSZ606rXO3GbWdg9lVmnLOvJg" style="color: #b07d3a;">here</a>.
  </p>
  <p style="font-size: 15px; line-height: 1.6;">Anywho, call for updates (I'm gonna aim to make these more dynamic).</p>
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
  <p style="font-size: 14px; line-height: 1.6; color: #666;">
    p.p.s. — Kilcoyne's working on a 'Word Cloud' feature that was inspired by another BC International host. It's gonna be super sick, so I encourage you to share your 'What We Talked About' posts and make sure they're in your updates.
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

  // 1. Fetch sheet (fall back to hardcoded list on any error)
  let recipients;
  try {
    const res = await fetch(SHEET_CSV_URL);
    if (!res.ok) throw new Error(`Sheet fetch failed: ${res.status}`);
    const csv = await res.text();
    const rows = parseCSV(csv);
    recipients = rows
      .filter(row => row.Active !== "No" && row.Emails)
      .flatMap(row => {
        const city     = row.City || "";
        const hostName = row.Host_Name || "";
        return row.Emails.split(";").map(email => ({
          email: email.trim().toLowerCase(),
          city,
          hostName,
        }));
      })
      .filter(r => r.email && r.email.includes("@"));
    console.log(`Sheet fetched — ${recipients.length} recipients`);
  } catch (err) {
    console.error("Failed to fetch sheet, using fallback list:", err.message);
    recipients = FALLBACK_HOSTS.flatMap(({ city, hostName, emails }) =>
      emails.map(email => ({ email: email.trim().toLowerCase(), city, hostName }))
    );
    console.log(`Fallback list — ${recipients.length} recipients`);
  }

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
