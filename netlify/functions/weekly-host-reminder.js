import { getConfiguredStore } from "./lib/blob-store.js";

// Runs every Sunday at 16:30 UTC (12:30pm ET)
// Fetches active host emails from the Google Sheet and sends a weekly reminder via SendGrid.
// Source copy reference: docs/host-email-template.md
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
const REMINDER_LOCK_STORE = "weekly-host-reminder";
const REMINDER_RUN_KEY_PREFIX = "run-summary";
const RECIPIENT_LOCK_KEY_PREFIX = "recipient-send";
const SEND_CONCURRENCY = 8;

const SHEET_LINK = "https://docs.google.com/spreadsheets/d/1_4MoIXgSHjERztj0LPPC-XAa7nzFlfrdcjEQdBeSqto/edit";
const DRIVE_LINK = "https://drive.google.com/drive/folders/1RghGzP25aW2chs1aPGxAzE9fZgFHucRe";
const LATEST_HAPPENINGS_URL = "https://breakfastclubbing.com/what-we-talked-about";

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

function getUpcomingSunday(baseDate = new Date()) {
  const nextSunday = new Date(baseDate);
  const daysUntilNextSunday = ((7 - nextSunday.getDay()) % 7) || 7;
  nextSunday.setDate(nextSunday.getDate() + daysUntilNextSunday);
  return nextSunday;
}

function sanitizeCityForFlyer(city) {
  return city.replace(/[^a-zA-Z]/g, "") || "City";
}

function dedupeRecipients(recipients) {
  const deduped = new Map();

  for (const { email, city, hostName } of recipients) {
    if (!deduped.has(email)) {
      deduped.set(email, {
        email,
        cities: [],
        hostNames: [],
      });
    }

    const recipient = deduped.get(email);
    if (city && !recipient.cities.includes(city)) recipient.cities.push(city);
    if (hostName && !recipient.hostNames.includes(hostName)) recipient.hostNames.push(hostName);
  }

  return [...deduped.values()].map(recipient => ({
    ...recipient,
    hostName: recipient.hostNames[0] || "",
  }));
}

function parseEmailList(value = "") {
  return new Set(
    String(value)
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean)
  );
}

function buildTopNotice(mode) {
  if (mode !== "correction") {
    return { text: "", html: "" };
  }

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

function getReminderStore() {
  return getConfiguredStore(REMINDER_LOCK_STORE, { consistency: "strong" });
}

function buildRecipientLockKey(mode, lockValue, email) {
  const safeEmail = Buffer.from(String(email).trim().toLowerCase()).toString("base64url");
  return `${RECIPIENT_LOCK_KEY_PREFIX}/${mode}/${lockValue}/${safeEmail}.json`;
}

async function assertReminderStoreReady(store) {
  const healthcheckKey = `${REMINDER_RUN_KEY_PREFIX}/healthcheck-${Date.now()}-${Math.random().toString(36).slice(2)}.json`;
  await store.setJSON(healthcheckKey, { checkedAt: new Date().toISOString() }, { onlyIfNew: true });
  await store.delete(healthcheckKey);
}

async function claimRecipientSend(store, mode, lockValue, email, cities, force = false) {
  const key = buildRecipientLockKey(mode, lockValue, email);

  if (force) {
    return { claimed: true, key };
  }

  const { modified } = await store.setJSON(
    key,
    {
      status: "in_progress",
      mode,
      lockValue,
      email,
      cities,
      claimedAt: new Date().toISOString(),
    },
    { onlyIfNew: true }
  );

  return { claimed: modified, key };
}

async function completeRecipientSend(store, key, summary, force = false) {
  if (!store || !key || force) return;

  await store.setJSON(key, {
    status: "completed",
    completedAt: new Date().toISOString(),
    ...summary,
  });
}

async function releaseRecipientSend(store, key, force = false) {
  if (!store || !key || force) return;
  await store.delete(key);
}

async function recordReminderRun(store, mode, lockValue, summary) {
  if (!store) return;

  const key = `${REMINDER_RUN_KEY_PREFIX}/${mode}/${lockValue}-${Date.now()}.json`;
  await store.setJSON(key, {
    createdAt: new Date().toISOString(),
    ...summary,
  });
}

// ── Email builder ─────────────────────────────────────────────────────────────

function buildUpdateBlock(cities, targetSunday) {
  const cycleDate = targetSunday.toISOString().split("T")[0];
  const flyerExamples = cities.map(city => `${city}: ${sanitizeCityForFlyer(city)}_${cycleDate}.jpg`);

  if (cities.length <= 1) {
    const city = cities[0] || "your club";
    return {
      text: `For ${city}, here's where to update:

→ Master Sheet (update your listing): ${SHEET_LINK}
→ Flyer Folder (upload this week's flyer): ${DRIVE_LINK}

Flyer naming: City_YYYY-MM-DD.jpg (e.g. ${sanitizeCityForFlyer(city)}_${cycleDate}.jpg)`,
      html: `
  <p style="font-size: 15px; line-height: 1.6;">
    For <strong>${city}</strong>, here's where to update:
  </p>
  <p style="font-size: 15px; line-height: 1.8;">
    → <a href="${SHEET_LINK}" style="color: #b07d3a;">Master Sheet</a> (update your listing)<br>
    → <a href="${DRIVE_LINK}" style="color: #b07d3a;">Flyer Folder</a> (upload this week's flyer)
  </p>
  <p style="font-size: 13px; line-height: 1.6; color: #666;">
    Flyer naming: City_YYYY-MM-DD.jpg (e.g. <code>${sanitizeCityForFlyer(city)}_${cycleDate}.jpg</code>)
  </p>`,
    };
  }

  return {
    text: `For your clubs, here's where to update:

Clubs on your list: ${cities.join(", ")}

→ Master Sheet (update your listings): ${SHEET_LINK}
→ Flyer Folder (upload this week's flyers): ${DRIVE_LINK}

Flyer naming: City_YYYY-MM-DD.jpg
${flyerExamples.map(example => `- ${example}`).join("\n")}`,
    html: `
  <p style="font-size: 15px; line-height: 1.6;">
    For your clubs, here's where to update:
  </p>
  <p style="font-size: 15px; line-height: 1.6;">
    <strong>Clubs on your list:</strong> ${cities.join(", ")}
  </p>
  <p style="font-size: 15px; line-height: 1.8;">
    → <a href="${SHEET_LINK}" style="color: #b07d3a;">Master Sheet</a> (update your listings)<br>
    → <a href="${DRIVE_LINK}" style="color: #b07d3a;">Flyer Folder</a> (upload this week's flyers)
  </p>
  <p style="font-size: 13px; line-height: 1.6; color: #666;">
    Flyer naming: City_YYYY-MM-DD.jpg<br>
    ${flyerExamples.map(example => `<span style="display: block;">- <code>${example}</code></span>`).join("")}
  </p>`,
  };
}

function buildEmailBody(cities, targetSunday, mode = "scheduled") {
  const { text: updateBlock } = buildUpdateBlock(cities, targetSunday);
  const { text: topNotice } = buildTopNotice(mode);
  const cityLead = cities.length <= 1
    ? `For ${cities[0] || "your club"}, here's where to update:`
    : "For your clubs, here's where to update:";

  return `Hey hosts,

${topNotice}

BC just hit 100 newsletters.

All I have to say to celebrate is this: From the beginning it's always been about creating maximum value with minimum effort. Show up at the same restaurant, same day, same hour, and commune with whoever walks in.

No RSVPs means nobody to keep track of; no theme means the shape is dynamic; no cost of entry means nobody has to worry about ticket sales; and no pitches means no complaining after the fact.

Thank you to all of you amazing hosts for turning this into a real, global community.

On that same note: ${cityLead}

──────────────────────────

${updateBlock}

If everything's good, you're good.

— Ben Dietz

Questions? ben@breakfastclubbing.com

p.s. — Any cool ideas for the site? Email mike@breakfastclubbing.com and he'll make it happen. Big thanks to Kilcoyne for making this happen.

---
Breakfast Club HQ · New York, NY
You're receiving this because you host a Breakfast Club location.
To stop receiving these emails, reply with "unsubscribe" and we'll remove you.`;
}

function buildEmailHTML(cities, targetSunday, mode = "scheduled") {
  const { html: updateBlock } = buildUpdateBlock(cities, targetSunday);
  const { html: topNotice } = buildTopNotice(mode);
  const cityLead = cities.length <= 1
    ? `For <strong>${cities[0] || "your club"}</strong>, here's where to update:`
    : "For your clubs, here's where to update:";

  return `
<div style="font-family: Georgia, serif; max-width: 540px; margin: 0 auto; color: #1a1a1a; padding: 32px 24px;">
  <p style="font-size: 15px; line-height: 1.6;">Hey hosts,</p>
  ${topNotice}
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
  <p style="font-size: 15px; line-height: 1.6;">On that same note: ${cityLead}</p>
  <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
  ${updateBlock}
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
}

function buildSubject(cities, mode = "scheduled") {
  if (mode === "correction") {
    return "Sorry!";
  }

  if (cities.length <= 1) {
    return `BC reminder - update your ${cities[0] || "club"} listing`;
  }

  return "BC reminder - update your club listings";
}

// ── Main handler ──────────────────────────────────────────────────────────────

export async function handler(event) {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) {
    console.error("SENDGRID_API_KEY not set");
    return { statusCode: 500, body: "Missing SENDGRID_API_KEY" };
  }

  const params = event?.queryStringParameters || {};
  const force = params.force === "1";
  const dryRun = params.dry === "1";
  const mode = params.mode === "correction" ? "correction" : "scheduled";
  const excludedEmails = parseEmailList(params.exclude);
  const targetSunday = getUpcomingSunday();
  const cycleDate = targetSunday.toISOString().split("T")[0];
  const correctionDate = params.correctionDate || new Date().toISOString().split("T")[0];
  const lockValue = mode === "correction" ? correctionDate : cycleDate;

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

  const dedupedRecipients = dedupeRecipients(recipients);
  const mergedCount = recipients.length - dedupedRecipients.length;
  if (mergedCount > 0) {
    console.log(`Merged ${mergedCount} duplicate recipient record(s)`);
  }
  const filteredRecipients = dedupedRecipients.filter(({ email }) => !excludedEmails.has(String(email).toLowerCase()));

  if (!filteredRecipients.length) {
    console.log("No recipients left after exclusions");
    return {
      statusCode: 200,
      body: JSON.stringify({ skipped: true, reason: "no-recipients-after-exclusions", excludedEmails: [...excludedEmails] }),
    };
  }

  let reminderStore;
  try {
    reminderStore = getReminderStore();
    await assertReminderStoreReady(reminderStore);
  } catch (err) {
    console.error(`Unable to initialize reminder store for ${lockValue}:`, err.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Unable to initialize reminder store", mode, lockValue }),
    };
  }

  if (dryRun) {
    console.log(`Dry run ready for ${lockValue} — ${filteredRecipients.length} unique host inboxes`);
    return {
      statusCode: 200,
      body: JSON.stringify({
        dryRun: true,
        mode,
        lockValue,
        recipients: filteredRecipients.length,
        excludedEmails: [...excludedEmails],
      }),
    };
  }

  if (force) {
    console.warn(`Force send requested for ${lockValue} — bypassing recipient locks`);
  }

  console.log(`Sending to ${filteredRecipients.length} unique host inboxes with concurrency ${SEND_CONCURRENCY}`);

  // 3. Send via SendGrid
  let sent = 0;
  let failed = 0;
  let skipped = 0;
  let nextRecipientIndex = 0;

  async function sendReminder(recipient) {
    const { email, cities } = recipient;
    let recipientLock;

    try {
      recipientLock = await claimRecipientSend(reminderStore, mode, lockValue, email, cities, force);
    } catch (err) {
      console.error(`Unable to claim recipient lock for ${email}:`, err.message);
      failed++;
      return;
    }

    if (!recipientLock.claimed) {
      skipped++;
      console.log(`↷ Skipped ${email} (${cities.join(", ") || "no city"}) — already sent for ${lockValue}`);
      return;
    }

    const payload = {
      personalizations: [{ to: [{ email }] }],
      from: { email: FROM_EMAIL, name: FROM_NAME },
      reply_to: { email: REPLY_TO },
      headers: {
        "List-Unsubscribe": `<mailto:ben@breakfastclubbing.com?subject=unsubscribe>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
      subject: buildSubject(cities, mode),
      content: [
        { type: "text/plain", value: buildEmailBody(cities, targetSunday, mode) },
        { type: "text/html",  value: buildEmailHTML(cities, targetSunday, mode) },
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
        await completeRecipientSend(reminderStore, recipientLock.key, {
          email,
          cities,
          cycleDate,
          lockValue,
          mode,
        }, force);
        sent++;
        console.log(`✓ Sent to ${email} (${cities.join(", ") || "no city"})`);
      } else {
        const body = await res.text();
        console.error(`✗ Failed for ${email}: ${res.status} ${body}`);
        await releaseRecipientSend(reminderStore, recipientLock.key, force);
        failed++;
      }
    } catch (err) {
      console.error(`✗ Error sending to ${email}:`, err.message);
      await releaseRecipientSend(reminderStore, recipientLock.key, force);
      failed++;
    }
  }

  const workerCount = Math.min(SEND_CONCURRENCY, filteredRecipients.length);
  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (nextRecipientIndex < filteredRecipients.length) {
        const currentIndex = nextRecipientIndex++;
        const recipient = filteredRecipients[currentIndex];
        if (!recipient) return;
        await sendReminder(recipient);
      }
    })
  );

  await recordReminderRun(reminderStore, mode, lockValue, {
    cycleDate,
    mode,
    lockValue,
    sent,
    failed,
    skipped,
    recipients: filteredRecipients.length,
    excludedEmails: [...excludedEmails],
  });

  return {
    statusCode: 200,
    body: JSON.stringify({
      sent,
      failed,
      skipped,
      recipients: filteredRecipients.length,
      cycleDate,
      mode,
      lockValue,
      excludedEmails: [...excludedEmails],
    }),
  };
}
