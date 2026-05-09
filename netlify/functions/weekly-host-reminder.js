import { getConfiguredStore } from "./lib/blob-store.js";
import {
  HOST_REMINDER_LINKS,
  HOST_REMINDER_COPY,
  buildEmailBody,
  buildEmailHTML,
  buildSubject,
} from "./lib/host-reminder-email-template.mjs";

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
  { city: "Melbourne - CBD",            hostName: "Celeste Blewitt & Josh Gardiner",               emails: ["celeste@celesteblewitt.com", "josh@gardinercommunications.com"] },
  { city: "Melbourne - Richmond",       hostName: "Steph Clarke",                                  emails: ["steph@28thursdays.com"] },
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

function getReminderStore() {
  return getConfiguredStore(REMINDER_LOCK_STORE, { consistency: "strong" });
}

async function loadEmailConfig() {
  try {
    const store = getConfiguredStore("host-email-config", { consistency: "strong" });
    return (await store.get("config.json", { type: "json" })) || {};
  } catch (_) {
    return {};
  }
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
  const testTo = params.test_to ? params.test_to.split(",").map(e => e.trim()).filter(Boolean) : null;
  const targetSunday = getUpcomingSunday();
  const cycleDate = targetSunday.toISOString().split("T")[0];
  const correctionDate = params.correctionDate || new Date().toISOString().split("T")[0];
  const lockValue = mode === "correction" ? correctionDate : cycleDate;

  // Load admin-managed email config (copy overrides + links overrides + optional recipient list)
  const emailConfig = await loadEmailConfig();
  const activeCopy = { ...HOST_REMINDER_COPY, ...(emailConfig.copy || {}) };
  const activeLinks = { ...HOST_REMINDER_LINKS, ...(emailConfig.links || {}) };

  // Apply draft body text if set in admin
  if (emailConfig.draft?.bodyText?.trim()) {
    activeCopy.introParagraphs = emailConfig.draft.bodyText.split(/\n\n+/).map(p => p.trim()).filter(Boolean);
    activeCopy.introLinkedParagraph = "";
    activeCopy.introLinkURL = "";
  }
  if (emailConfig.draft?.signoff?.trim()) activeCopy.signoff = emailConfig.draft.signoff;
  if (emailConfig.draft?.questionsEmail?.trim()) activeCopy.questionsEmail = emailConfig.draft.questionsEmail;

  // Test mode — send only to specified addresses, skip all locking logic
  if (testTo) {
    const testRecipients = testTo.map(email => ({ email: email.toLowerCase(), cities: [], hostName: "" }));
    console.log(`Test send to: ${testTo.join(", ")}`);
    let sent = 0, failed = 0;
    for (const recipient of testRecipients) {
      const payload = {
        personalizations: [{ to: [{ email: recipient.email }] }],
        from: { email: FROM_EMAIL, name: FROM_NAME },
        reply_to: { email: REPLY_TO },
        subject: `[TEST] ${buildSubject([], { mode, copy: activeCopy })}`,
        content: [
          { type: "text/plain", value: buildEmailBody([], targetSunday, { mode, links: activeLinks, copy: activeCopy }) },
          { type: "text/html",  value: buildEmailHTML([], targetSunday, { mode, links: activeLinks, copy: activeCopy }) },
        ],
      };
      try {
        const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.status === 202) { sent++; console.log(`✓ Test sent to ${recipient.email}`); }
        else { const body = await res.text(); console.error(`✗ Test failed for ${recipient.email}: ${res.status} ${body}`); failed++; }
      } catch (err) {
        console.error(`✗ Test error for ${recipient.email}:`, err.message); failed++;
      }
    }
    return { statusCode: 200, body: JSON.stringify({ test: true, sent, failed }) };
  }

  // 1. Build recipient list — admin blob list takes priority, then sheet, then hardcoded fallback.
  let recipients;
  if (emailConfig.recipients?.length) {
    recipients = emailConfig.recipients.map(r => ({
      email: String(r.email).trim().toLowerCase(),
      city: r.city || "",
      hostName: r.name || "",
    })).filter(r => r.email.includes("@"));
    console.log(`Admin recipients list — ${recipients.length} recipients`);
  } else {
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
      subject: buildSubject(cities, { mode, copy: activeCopy }),
      content: [
        { type: "text/plain", value: buildEmailBody(cities, targetSunday, { mode, links: activeLinks, copy: activeCopy }) },
        { type: "text/html",  value: buildEmailHTML(cities, targetSunday, { mode, links: activeLinks, copy: activeCopy }) },
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
