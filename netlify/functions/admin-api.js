import { upsertLiveClubOverride, getLiveOverridesSnapshot } from "./lib/live-club-overrides.js";
import { getConfiguredStore } from "./lib/blob-store.js";

const CREDS_STORE = "admin-credentials";
const WWTA_STORE = "wwta-admin-topics";
const POPUP_STORE = "bk-popups";
const EMAIL_CONFIG_STORE = "host-email-config";
const FROM_EMAIL = "set@breakfastclubbing.com";
const FROM_NAME = "Breakfast Club Admin";

async function sendConfirmEmail({ subject, text }) {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) return;
  const to = process.env.ADMIN_NOTIFY_EMAIL || process.env.TEST_EMAIL_TO || "mk@yellowsatinjacket.com";
  try {
    await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: FROM_EMAIL, name: FROM_NAME },
        subject,
        content: [{ type: "text/plain", value: text }],
      }),
    });
  } catch (_) {}
}

function json(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    body: JSON.stringify(body),
  };
}

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

function parseSheetHostsCSV(text) {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter(Boolean);
  const [headerLine, ...dataLines] = lines;
  const headers = parseCSVLine(headerLine).map(h => h.trim());
  const hosts = [];
  for (const line of dataLines) {
    const cells = parseCSVLine(line);
    const row = {};
    headers.forEach((h, i) => { row[h] = (cells[i] || "").trim(); });
    if (row.Active === "No" || !row.Emails) continue;
    const city = row.City || "";
    const name = row.Host_Name || city;
    for (const email of row.Emails.split(";").map(e => e.trim().toLowerCase()).filter(Boolean)) {
      if (email.includes("@")) hosts.push({ name, email, city });
    }
  }
  return hosts;
}

function normalizeKey(value = "") {
  return String(value)
    .toLowerCase()
    .replace(/[—–]/g, "-")
    .replace(/\s+/g, " ")
    .replace(/\s*-\s*/g, " - ")
    .trim();
}

async function getSession(authHeader) {
  const raw = String(authHeader || "").replace(/^Bearer\s+/i, "").trim();
  if (!raw) return null;

  const colonIdx = raw.lastIndexOf(":");
  if (colonIdx === -1) return null;
  const email = raw.slice(0, colonIdx).trim().toLowerCase();
  const pin = raw.slice(colonIdx + 1).trim();
  if (!email || !pin) return null;

  // hosts.json takes precedence — allows master to update their own PIN via UI
  try {
    const store = getConfiguredStore(CREDS_STORE, { consistency: "strong" });
    const hosts = (await store.get("hosts.json", { type: "json" })) || {};
    const entry = hosts[email];
    if (entry && entry.pin === pin) {
      const type = entry.master ? "master" : "host";
      return { type, name: entry.name, clubs: entry.master ? null : entry.clubs, email, fromEnv: false };
    }
  } catch (_) {}

  // Fall back to env-var master credentials
  const masterEmail = (process.env.ADMIN_EMAIL || "").toLowerCase();
  const masterPin = process.env.ADMIN_PIN || "";
  if (masterEmail && masterPin && email === masterEmail && pin === masterPin) {
    return { type: "master", name: "Admin", clubs: null, email: masterEmail, fromEnv: true };
  }

  return null;
}

function canWrite(session, clubKey) {
  if (!session) return false;
  if (session.type === "master") return true;
  return (session.clubs || []).map(normalizeKey).includes(normalizeKey(clubKey));
}

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Authorization, Content-Type", "Access-Control-Allow-Methods": "GET, POST, OPTIONS" }, body: "" };
  }

  const session = await getSession(event.headers?.authorization || event.headers?.Authorization);
  if (!session) return json(401, { error: "Unauthorized." });

  // ── GET ──────────────────────────────────────────────────────────────────
  if (event.httpMethod === "GET") {
    const action = event.queryStringParameters?.action || "session";

    if (action === "session") {
      const overrides = await getLiveOverridesSnapshot();
      return json(200, {
        session: { type: session.type, name: session.name, clubs: session.clubs },
        overrides: overrides.items || {},
      });
    }

    if (action === "credentials") {
      if (session.type !== "master") return json(403, { error: "Forbidden." });
      const store = getConfiguredStore(CREDS_STORE, { consistency: "strong" });
      const hosts = (await store.get("hosts.json", { type: "json" })) || {};
      return json(200, { hosts });
    }

    if (action === "wwta") {
      const store = getConfiguredStore(WWTA_STORE, { consistency: "strong" });
      const data = (await store.get("entries.json", { type: "json" })) || { entries: [] };
      const entries = session.type === "master"
        ? data.entries
        : data.entries.filter((e) => canWrite(session, e.clubKey));
      return json(200, { entries });
    }

    if (action === "list_popups") {
      const store = getConfiguredStore(POPUP_STORE, { consistency: "strong" });
      const data = (await store.get("items.json", { type: "json" })) || { items: [] };
      return json(200, { items: data.items || [] });
    }

    if (action === "email_config") {
      if (session.type !== "master") return json(403, { error: "Forbidden." });
      const store = getConfiguredStore(EMAIL_CONFIG_STORE, { consistency: "strong" });
      const config = (await store.get("config.json", { type: "json" })) || {};
      return json(200, { config });
    }

    if (action === "flyers") {
      const store = getConfiguredStore("bk-flyers", { consistency: "strong" });
      const index = (await store.get("index.json", { type: "json" })) || { items: [] };
      const items = session.type === "master"
        ? index.items
        : index.items.filter(f => canWrite(session, f.club));
      return json(200, { items });
    }

    if (action === "sheet_hosts") {
      if (session.type !== "master") return json(403, { error: "Forbidden." });
      const sheetUrl = process.env.SHEET_CSV_URL;
      if (!sheetUrl) return json(400, { error: "SHEET_CSV_URL not configured." });
      try {
        const res = await fetch(sheetUrl);
        if (!res.ok) throw new Error(`Sheet fetch failed: ${res.status}`);
        const csv = await res.text();
        const hosts = parseSheetHostsCSV(csv);
        return json(200, { hosts });
      } catch (err) {
        return json(500, { error: `Could not fetch sheet: ${err.message}` });
      }
    }

    return json(400, { error: "Unknown action." });
  }

  // ── POST ─────────────────────────────────────────────────────────────────
  if (event.httpMethod === "POST") {
    let payload;
    try { payload = JSON.parse(event.body || "{}"); }
    catch (_) { return json(400, { error: "Invalid JSON." }); }

    const { action } = payload;

    if (action === "update_club") {
      const { club, patch } = payload;
      if (!club) return json(400, { error: "club is required." });
      if (!patch || !Object.keys(patch).length) return json(400, { error: "patch is required." });
      if (!canWrite(session, normalizeKey(club))) return json(403, { error: "Not authorized for this club." });

      const record = await upsertLiveClubOverride({
        club,
        patch,
        email: session.name || "admin-ui",
        subject: "admin-ui",
        source: "admin_ui",
      });

      const fields = Object.entries(patch)
        .map(([k, v]) => `  ${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
        .join("\n");
      sendConfirmEmail({
        subject: `Admin update: ${club}`,
        text: `${session.name || "Admin"} updated ${club} via the admin panel.\n\nFields changed:\n${fields}\n\nUpdated at: ${new Date().toISOString()}`,
      });

      return json(200, { ok: true, record });
    }

    if (action === "add_wwta") {
      const { club, date, topics, photoURL, imageDataURLs } = payload;
      if (!club) return json(400, { error: "club is required." });
      if (!date) return json(400, { error: "date is required." });
      if (!topics?.length) return json(400, { error: "topics are required." });
      const clubKey = normalizeKey(club);
      if (!canWrite(session, clubKey)) return json(403, { error: "Not authorized for this club." });

      // Upload any attached photos to bk-flyers store under wwta- prefix
      const photoKeys = [];
      if (Array.isArray(imageDataURLs)) {
        const flyerStore = getConfiguredStore("bk-flyers", { consistency: "strong" });
        for (const dataURL of imageDataURLs.slice(0, 5)) {
          const imgMatch = dataURL?.match(/^data:(image\/[a-z+\-]+);base64,(.+)$/);
          if (!imgMatch) continue;
          const [, mimeType, b64] = imgMatch;
          const ext = mimeType.split("/")[1].replace("jpeg", "jpg");
          const photoKey = `wwta-${clubKey.replace(/[^a-z0-9-]/g, "-")}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
          try {
            await flyerStore.set(photoKey, Buffer.from(b64, "base64"), { metadata: { mimeType, club, uploadedAt: new Date().toISOString() } });
            photoKeys.push(photoKey);
          } catch (_) {}
        }
      }

      const store = getConfiguredStore(WWTA_STORE, { consistency: "strong" });
      const data = (await store.get("entries.json", { type: "json" })) || { entries: [] };
      const now = new Date().toISOString();

      const entry = {
        id: `${clubKey.replace(/[^a-z0-9]/g, "-")}-${date}-${Date.now()}`,
        club,
        clubKey,
        date,
        topics: Array.isArray(topics) ? topics.map((t) => String(t).trim()).filter(Boolean) : [],
        photoURL: String(photoURL || "").trim(),
        photoKeys,
        addedAt: now,
        addedBy: session.name || "admin",
      };

      data.entries.unshift(entry);
      data.updatedAt = now;
      await store.setJSON("entries.json", data);

      sendConfirmEmail({
        subject: `WWTA added: ${club} — ${date}`,
        text: `${session.name || "Admin"} added a "What We Talked About" entry.\n\nClub: ${club}\nDate: ${date}\nTopics: ${entry.topics.join(", ")}${entry.photoURL ? `\nPhoto: ${entry.photoURL}` : ""}\n\nAdded at: ${now}`,
      });

      return json(200, { ok: true, entry });
    }

    if (action === "delete_wwta") {
      const { id } = payload;
      if (!id) return json(400, { error: "id required." });
      const store = getConfiguredStore(WWTA_STORE, { consistency: "strong" });
      const data = (await store.get("entries.json", { type: "json" })) || { entries: [] };
      const entry = data.entries.find((e) => e.id === id);
      if (!entry) return json(404, { error: "Not found." });
      if (!canWrite(session, entry.clubKey)) return json(403, { error: "Not authorized." });
      data.entries = data.entries.filter((e) => e.id !== id);
      await store.setJSON("entries.json", data);
      return json(200, { ok: true });
    }

    if (action === "add_host") {
      if (session.type !== "master") return json(403, { error: "Forbidden." });
      const { email, pin, name, clubs } = payload;
      if (!email || !pin || !name) return json(400, { error: "email, pin, and name are required." });
      if (!/^\d{4}$/.test(pin)) return json(400, { error: "PIN must be exactly 4 digits." });
      const emailKey = email.trim().toLowerCase();
      if (emailKey === (process.env.ADMIN_EMAIL || "").toLowerCase()) {
        return json(400, { error: "Cannot override master credentials." });
      }

      const store = getConfiguredStore(CREDS_STORE, { consistency: "strong" });
      const hosts = (await store.get("hosts.json", { type: "json" })) || {};
      const entry = { name, email: emailKey, pin, clubs: Array.isArray(clubs) ? clubs : (clubs ? [clubs] : []) };
      if (payload.master) entry.master = true;
      hosts[emailKey] = entry;
      await store.setJSON("hosts.json", hosts);
      return json(200, { ok: true });
    }

    if (action === "remove_host") {
      if (session.type !== "master") return json(403, { error: "Forbidden." });
      const { email } = payload;
      if (!email) return json(400, { error: "email required." });
      const store = getConfiguredStore(CREDS_STORE, { consistency: "strong" });
      const hosts = (await store.get("hosts.json", { type: "json" })) || {};
      delete hosts[email.trim().toLowerCase()];
      await store.setJSON("hosts.json", hosts);
      return json(200, { ok: true });
    }

    if (action === "save_popup") {
      if (session.type !== "master") return json(403, { error: "Forbidden." });
      const { id, headline, subheadline, date, time, city, venue, mapsURL, host, hostInstagramURL, description, communityLink, flyerURL, status } = payload;
      if (!headline?.trim()) return json(400, { error: "headline is required." });
      if (!date) return json(400, { error: "date is required." });

      const store = getConfiguredStore(POPUP_STORE, { consistency: "strong" });
      const data = (await store.get("items.json", { type: "json" })) || { items: [] };
      const now = new Date().toISOString();

      const clean = (v) => String(v || "").trim();

      if (id) {
        const idx = data.items.findIndex((p) => p.id === id);
        if (idx === -1) return json(404, { error: "Pop-up not found." });
        data.items[idx] = {
          ...data.items[idx],
          headline: clean(headline),
          subheadline: clean(subheadline),
          date,
          time: clean(time),
          city: clean(city),
          venue: clean(venue),
          mapsURL: clean(mapsURL),
          host: clean(host),
          hostInstagramURL: clean(hostInstagramURL),
          description: clean(description),
          communityLink: clean(communityLink),
          flyerURL: clean(flyerURL),
          status: status === "draft" ? "draft" : "active",
          updatedAt: now,
        };
        data.updatedAt = now;
        await store.setJSON("items.json", data);
        return json(200, { ok: true, item: data.items[idx] });
      }

      const item = {
        id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
        headline: clean(headline),
        subheadline: clean(subheadline),
        date,
        time: clean(time),
        city: clean(city),
        venue: clean(venue),
        mapsURL: clean(mapsURL),
        host: clean(host),
        hostInstagramURL: clean(hostInstagramURL),
        description: clean(description),
        communityLink: clean(communityLink),
        flyerURL: clean(flyerURL),
        status: status === "draft" ? "draft" : "active",
        createdAt: now,
        createdBy: session.name || "admin",
        updatedAt: now,
      };
      data.items.unshift(item);
      data.updatedAt = now;
      await store.setJSON("items.json", data);
      return json(200, { ok: true, item });
    }

    if (action === "toggle_popup_status") {
      if (session.type !== "master") return json(403, { error: "Forbidden." });
      const { id } = payload;
      if (!id) return json(400, { error: "id required." });
      const store = getConfiguredStore(POPUP_STORE, { consistency: "strong" });
      const data = (await store.get("items.json", { type: "json" })) || { items: [] };
      const idx = data.items.findIndex((p) => p.id === id);
      if (idx === -1) return json(404, { error: "Pop-up not found." });
      data.items[idx].status = data.items[idx].status === "draft" ? "active" : "draft";
      data.items[idx].updatedAt = new Date().toISOString();
      data.updatedAt = data.items[idx].updatedAt;
      await store.setJSON("items.json", data);
      return json(200, { ok: true, item: data.items[idx] });
    }

    if (action === "save_email_config") {
      if (session.type !== "master") return json(403, { error: "Forbidden." });
      const store = getConfiguredStore(EMAIL_CONFIG_STORE, { consistency: "strong" });
      const current = (await store.get("config.json", { type: "json" })) || {};
      if (payload.draft !== undefined) current.draft = payload.draft;
      if (payload.copy !== undefined) current.copy = payload.copy;
      if (payload.links !== undefined) current.links = payload.links;
      if (payload.recipients !== undefined) current.recipients = payload.recipients;
      current.updatedAt = new Date().toISOString();
      await store.setJSON("config.json", current);
      return json(200, { ok: true });
    }

    if (action === "send_host_reminder") {
      if (session.type !== "master") return json(403, { error: "Forbidden." });
      const siteUrl = process.env.URL || process.env.DEPLOY_URL || "";
      if (!siteUrl) return json(500, { error: "URL env var not set." });
      try {
        await fetch(`${siteUrl}/.netlify/functions/send-host-reminder-background`, { method: "POST" });
      } catch (_) {}
      // Mark as sending in blob immediately — background function updates it when done
      const store = getConfiguredStore(EMAIL_CONFIG_STORE, { consistency: "strong" });
      const config = (await store.get("config.json", { type: "json" })) || {};
      config.lastSent = { at: new Date().toISOString(), bodyText: config.draft?.bodyText || "", result: { status: "sending" } };
      await store.setJSON("config.json", config);
      return json(200, { ok: true, status: "sending" });
    }

    if (action === "send_test_email") {
      if (session.type !== "master") return json(403, { error: "Forbidden." });
      const siteUrl = process.env.URL || process.env.DEPLOY_URL || "";
      if (!siteUrl) return json(500, { error: "URL env var not set." });
      const MASTER_EMAIL = "mk@yellowsatinjacket.com";
      const extra = (payload.extraTo || "").trim().toLowerCase();
      const testTo = [MASTER_EMAIL, ...(extra ? [extra] : [])].join(",");
      try {
        await fetch(`${siteUrl}/.netlify/functions/send-host-reminder-background?test_to=${encodeURIComponent(testTo)}`, { method: "POST" });
      } catch (_) {}
      return json(200, { ok: true, status: "sending" });
    }

    if (action === "upload_flyer") {
      const { club, dataURL, flyerDate, fileCreatedAt } = payload;
      if (!club) return json(400, { error: "club is required." });
      if (!dataURL) return json(400, { error: "dataURL is required." });
      if (!canWrite(session, normalizeKey(club))) return json(403, { error: "Not authorized for this club." });

      const match = dataURL.match(/^data:(image\/[a-z+\-]+);base64,(.+)$/);
      if (!match) return json(400, { error: "Invalid image data." });
      const [, mimeType, base64Data] = match;
      const ext = mimeType.split("/")[1].replace("jpeg", "jpg").replace("svg+xml", "svg");
      const safeClub = normalizeKey(club).replace(/[^a-z0-9-]/g, "-");
      const key = `${safeClub}-${Date.now()}.${ext}`;

      const store = getConfiguredStore("bk-flyers", { consistency: "strong" });
      await store.set(key, Buffer.from(base64Data, "base64"), { metadata: { mimeType, club, uploadedAt: new Date().toISOString() } });

      const flyerURL = `/.netlify/functions/get-flyer?key=${encodeURIComponent(key)}`;

      // Maintain listing index
      try {
        const index = (await store.get("index.json", { type: "json" })) || { items: [] };
        const entry = { key, club, mimeType, uploadedAt: new Date().toISOString(), uploadedBy: session.name || session.email };
        if (flyerDate) entry.flyerDate = flyerDate;
        if (fileCreatedAt && !flyerDate) entry.fileCreatedAt = fileCreatedAt;
        index.items.unshift(entry);
        if (index.items.length > 500) index.items = index.items.slice(0, 500);
        await store.setJSON("index.json", index);
      } catch (_) {}

      return json(200, { ok: true, flyerURL, key });
    }

    if (action === "patch_flyer") {
      if (session.type !== "master") return json(403, { error: "Forbidden." });
      const { key, club, flyerDate } = payload;
      if (!key) return json(400, { error: "key required." });
      try {
        const store = getConfiguredStore("bk-flyers", { consistency: "strong" });
        const index = (await store.get("index.json", { type: "json" })) || { items: [] };
        const item = index.items.find(f => f.key === key);
        if (!item) return json(404, { error: "Flyer not found." });
        if (club !== undefined) item.club = club;
        if (flyerDate !== undefined) item.flyerDate = flyerDate || null;
        await store.setJSON("index.json", index);
        return json(200, { ok: true });
      } catch (err) {
        return json(500, { error: err.message });
      }
    }

    if (action === "analyze_image") {
      const { dataURL, mode } = payload;
      if (!dataURL) return json(400, { error: "dataURL required." });
      const PROMPTS = {
        flyer_city: `What city is this Breakfast Club event flyer for, and what is the event date? Return ONLY valid JSON: {"city":"City Name","date":"YYYY-MM-DD"}. Use null for date if not visible. Use your best guess from any visible text, logos, or landmarks.`,
        popup_details: `Extract event details from this flyer. Return ONLY valid JSON (null for anything not found):\n{"headline":"EVENT TITLE","subheadline":null,"date":"YYYY-MM-DD","time":"8:00 AM","venue":"Venue Name and Address","city":"City, Country","host":"Host Name","description":"1-2 sentence description"}`,
        wwta_topics: `Look at this image (meeting notes, screenshot, whiteboard, chat, etc.) and extract topics or subjects discussed. Return ONLY valid JSON:\n{"topics":["topic 1","topic 2"],"date":"YYYY-MM-DD"}\nUse null for date if not visible. Keep topics concise (2-5 words).`,
        wwta_full: `This is a photo from a Breakfast Club event (a regular recurring breakfast meetup where people discuss ideas). Analyze it and return ONLY valid JSON:\n{"city":"City Name","date":"YYYY-MM-DD","topics":["topic 1","topic 2","topic 3"],"summary":"One sentence describing what happened."}\nCity: look for visual clues, venue signs, or any visible text. Date: look for date stamps, event materials, or any visible dates. Topics: what subjects, themes, or ideas came up — 2-5 word phrases, max 6. Use null for any field you cannot determine.`
      };
      const prompt = PROMPTS[mode];
      if (!prompt) return json(400, { error: "Invalid mode." });
      const apiKey = process.env.CLAUDE_BK_CLUB;
      if (!apiKey) return json(500, { error: "CLAUDE_BK_CLUB not configured." });
      const [header, base64Data] = dataURL.split(",");
      const mediaType = header?.match(/:(.*?);/)?.[1] || "image/jpeg";
      try {
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            model: "claude-haiku-4-5-20251001",
            max_tokens: 256,
            messages: [{
              role: "user",
              content: [
                { type: "image", source: { type: "base64", media_type: mediaType, data: base64Data } },
                { type: "text", text: prompt },
              ],
            }],
          }),
        });
        const result = await res.json();
        if (result.type === "error") return json(502, { error: `Claude error: ${result.error?.message || result.error?.type}` });
        const text = result.content?.[0]?.text?.trim() || "{}";
        const match = text.match(/\{[\s\S]*\}/);
        const data = match ? JSON.parse(match[0]) : {};
        return json(200, { ok: true, data });
      } catch (err) {
        return json(500, { error: `Analysis failed: ${err.message}` });
      }
    }

    if (action === "update_pin") {
      const { newPin } = payload;
      if (!/^\d{4}$/.test(newPin)) return json(400, { error: "PIN must be exactly 4 digits." });
      if (!session.email) return json(400, { error: "No email on this session." });
      const store = getConfiguredStore(CREDS_STORE, { consistency: "strong" });
      const hosts = (await store.get("hosts.json", { type: "json" })) || {};
      if (session.fromEnv && !hosts[session.email]) {
        // First-time PIN change: seed master record into hosts.json
        hosts[session.email] = { name: "Admin", email: session.email, pin: newPin, master: true };
      } else if (hosts[session.email]) {
        hosts[session.email].pin = newPin;
      } else {
        return json(404, { error: "Host record not found." });
      }
      await store.setJSON("hosts.json", hosts);
      return json(200, { ok: true });
    }

    if (action === "seed_from_sheet") {
      if (session.type !== "master") return json(403, { error: "Forbidden." });
      const sheetUrl = process.env.SHEET_CSV_URL ||
        "https://docs.google.com/spreadsheets/d/1_4MoIXgSHjERztj0LPPC-XAa7nzFlfrdcjEQdBeSqto/export?format=csv&gid=105813476";
      if (!sheetUrl) return json(400, { error: "SHEET_CSV_URL not configured." });
      try {
        const res = await fetch(sheetUrl);
        if (!res.ok) throw new Error(`Sheet fetch failed: ${res.status}`);
        const csv = await res.text();
        const sheetHosts = parseSheetHostsCSV(csv);
        const store = getConfiguredStore(CREDS_STORE, { consistency: "strong" });
        const hosts = (await store.get("hosts.json", { type: "json" })) || {};
        let added = 0;
        for (const { name, email, city } of sheetHosts) {
          const key = email.toLowerCase();
          if (!hosts[key]) {
            hosts[key] = { name, email: key, pin: "7391", clubs: city ? [city] : [] };
            added++;
          }
        }
        await store.setJSON("hosts.json", hosts);
        return json(200, { ok: true, added, total: sheetHosts.length });
      } catch (err) {
        return json(500, { error: `Seed failed: ${err.message}` });
      }
    }

    if (action === "delete_popup") {
      if (session.type !== "master") return json(403, { error: "Forbidden." });
      const { id } = payload;
      if (!id) return json(400, { error: "id required." });
      const store = getConfiguredStore(POPUP_STORE, { consistency: "strong" });
      const data = (await store.get("items.json", { type: "json" })) || { items: [] };
      if (!data.items.find((p) => p.id === id)) return json(404, { error: "Pop-up not found." });
      data.items = data.items.filter((p) => p.id !== id);
      data.updatedAt = new Date().toISOString();
      await store.setJSON("items.json", data);
      return json(200, { ok: true });
    }

    return json(400, { error: "Unknown action." });
  }

  return json(405, { error: "Method not allowed." });
}
