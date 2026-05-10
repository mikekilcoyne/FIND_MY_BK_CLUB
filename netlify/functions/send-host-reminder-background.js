import { getConfiguredStore } from "./lib/blob-store.js";
import {
  HOST_REMINDER_LINKS,
  HOST_REMINDER_COPY,
  buildEmailBody,
  buildEmailHTML,
  buildSubject,
} from "./lib/host-reminder-email-template.mjs";

const SHEET_CSV_URL = process.env.SHEET_CSV_URL ||
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRMNG01d9e9EXWFE8p97q1HnUj1ikPttYoO1fP1kV-izueziGqw0oDEmDWp1ZukS3pSrnR4EBCQoKJu/pub?output=csv";

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
  { city: "Maplewood, NJ",              hostName: "James Friedman",                                emails: ["james.friedman@gmail.com"] },
  { city: "Torquay, AU",                hostName: "Steph Clarke",                                  emails: ["steph@28thursdays.com"] },
  { city: "Sydney",                     hostName: "Elisha Akhtar",                                 emails: ["eliakhtar89@gmail.com"] },
  { city: "Toronto",                    hostName: "Jared Gordon & Sarah Phillips",                 emails: ["jared@gordonintl.com", "phillips.a.sarah@gmail.com"] },
  { city: "Vienna",                     hostName: "Carla Moss & Laura Pana",                       emails: ["mariacarlamoss@gmail.com"] },
  { city: "Washington DC",              hostName: "Michael Hastings-Black",                        emails: ["michael@askmhb.com"] },
];

const FROM_EMAIL = "ben@breakfastclubbing.com";
const FROM_NAME  = "Breakfast Club HQ";
const REPLY_TO   = "ben@breakfastclubbing.com";
const EMAIL_CONFIG_STORE = "host-email-config";

function parseCSVLine(line) {
  const out = []; let value = ""; let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') { if (inQuotes && line[i+1] === '"') { value += '"'; i++; } else { inQuotes = !inQuotes; } continue; }
    if (char === "," && !inQuotes) { out.push(value.trim()); value = ""; continue; }
    value += char;
  }
  out.push(value.trim());
  return out;
}

function getUpcomingSunday(baseDate = new Date()) {
  const d = new Date(baseDate);
  const days = ((7 - d.getDay()) % 7) || 7;
  d.setDate(d.getDate() + days);
  return d;
}

async function loadEmailConfig() {
  try {
    const store = getConfiguredStore(EMAIL_CONFIG_STORE, { consistency: "strong" });
    return (await store.get("config.json", { type: "json" })) || {};
  } catch (_) { return {}; }
}

async function saveLastSent(result, bodyText) {
  try {
    const store = getConfiguredStore(EMAIL_CONFIG_STORE, { consistency: "strong" });
    const config = (await store.get("config.json", { type: "json" })) || {};
    config.lastSent = { at: new Date().toISOString(), bodyText, result };
    await store.setJSON("config.json", config);
  } catch (_) {}
}

export async function handler(event) {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) { console.error("SENDGRID_API_KEY not set"); return; }

  const params = event?.queryStringParameters || {};
  const testTo = params.test_to ? params.test_to.split(",").map(e => e.trim()).filter(Boolean) : null;
  const targetSunday = getUpcomingSunday();

  const emailConfig = await loadEmailConfig();
  const activeCopy = { ...HOST_REMINDER_COPY, ...(emailConfig.copy || {}) };
  const activeLinks = { ...HOST_REMINDER_LINKS, ...(emailConfig.links || {}) };

  if (emailConfig.draft?.bodyText?.trim()) {
    activeCopy.introParagraphs = emailConfig.draft.bodyText.split(/\n\n+/).map(p => p.trim()).filter(Boolean);
    activeCopy.introLinkedParagraph = "";
    activeCopy.introLinkURL = "";
  }
  if (emailConfig.draft?.signoff?.trim()) activeCopy.signoff = emailConfig.draft.signoff;
  if (emailConfig.draft?.questionsEmail?.trim()) activeCopy.questionsEmail = emailConfig.draft.questionsEmail;

  // Test mode — send only to specified addresses
  if (testTo) {
    let sent = 0, failed = 0;
    for (const email of testTo) {
      const payload = {
        personalizations: [{ to: [{ email }] }],
        from: { email: FROM_EMAIL, name: FROM_NAME },
        reply_to: { email: REPLY_TO },
        subject: `[TEST] ${buildSubject([], { copy: activeCopy })}`,
        content: [
          { type: "text/plain", value: buildEmailBody([], targetSunday, { links: activeLinks, copy: activeCopy }) },
          { type: "text/html",  value: buildEmailHTML([], targetSunday, { links: activeLinks, copy: activeCopy }) },
        ],
      };
      try {
        const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.status === 202) { sent++; console.log(`✓ Test sent to ${email}`); }
        else { const body = await res.text(); console.error(`✗ Test failed ${email}: ${res.status} ${body}`); failed++; }
      } catch (err) { console.error(`✗ Test error ${email}:`, err.message); failed++; }
    }
    console.log(`Test send complete — sent: ${sent}, failed: ${failed}`);
    return;
  }

  // Build recipient list — blob list → sheet → fallback
  let recipients;
  if (emailConfig.recipients?.length) {
    recipients = emailConfig.recipients
      .map(r => ({ email: String(r.email).trim().toLowerCase(), city: r.city || "", hostName: r.name || "" }))
      .filter(r => r.email.includes("@"));
  } else {
    try {
      const res = await fetch(SHEET_CSV_URL);
      if (!res.ok) throw new Error(`Sheet fetch failed: ${res.status}`);
      const csv = await res.text();
      const [headerLine, ...dataLines] = csv.replace(/\r\n/g, "\n").split("\n").filter(Boolean);
      const headers = parseCSVLine(headerLine).map(h => h.trim());
      recipients = dataLines
        .map(line => { const cells = parseCSVLine(line); const row = {}; headers.forEach((h, i) => { row[h] = (cells[i] || "").trim(); }); return row; })
        .filter(row => row.Active !== "No" && row.Emails)
        .flatMap(row => row.Emails.split(";").map(email => ({ email: email.trim().toLowerCase(), city: row.City || "", hostName: row.Host_Name || "" })))
        .filter(r => r.email && r.email.includes("@"));
    } catch (err) {
      console.error("Sheet failed, using fallback:", err.message);
      recipients = FALLBACK_HOSTS.flatMap(({ city, hostName, emails }) =>
        emails.map(email => ({ email: email.trim().toLowerCase(), city, hostName }))
      );
    }
  }

  // Dedupe
  const seen = new Map();
  for (const r of recipients) {
    if (!seen.has(r.email)) seen.set(r.email, { ...r, cities: r.city ? [r.city] : [] });
    else if (r.city && !seen.get(r.email).cities.includes(r.city)) seen.get(r.email).cities.push(r.city);
  }
  const dedupedRecipients = [...seen.values()];

  console.log(`Sending to ${dedupedRecipients.length} hosts`);
  let sent = 0, failed = 0;

  const CONCURRENCY = 8;
  let idx = 0;
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, dedupedRecipients.length) }, async () => {
    while (idx < dedupedRecipients.length) {
      const recipient = dedupedRecipients[idx++];
      const { email, cities = [] } = recipient;
      const payload = {
        personalizations: [{ to: [{ email }] }],
        from: { email: FROM_EMAIL, name: FROM_NAME },
        reply_to: { email: REPLY_TO },
        headers: {
          "List-Unsubscribe": `<mailto:ben@breakfastclubbing.com?subject=unsubscribe>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
        subject: buildSubject(cities, { copy: activeCopy }),
        content: [
          { type: "text/plain", value: buildEmailBody(cities, targetSunday, { links: activeLinks, copy: activeCopy }) },
          { type: "text/html",  value: buildEmailHTML(cities, targetSunday, { links: activeLinks, copy: activeCopy }) },
        ],
      };
      try {
        const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.status === 202) { sent++; console.log(`✓ Sent to ${email}`); }
        else { const body = await res.text(); console.error(`✗ Failed ${email}: ${res.status} ${body}`); failed++; }
      } catch (err) { console.error(`✗ Error ${email}:`, err.message); failed++; }
    }
  }));

  await saveLastSent({ sent, failed, total: dedupedRecipients.length }, emailConfig.draft?.bodyText || "");
  console.log(`Send complete — sent: ${sent}, failed: ${failed}`);
}
