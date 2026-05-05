import { getConfiguredStore } from "./blob-store.js";

const LIVE_OVERRIDES_STORE = "live-club-overrides";
const LIVE_OVERRIDES_KEY = "snapshot.json";

function normalizeClubKey(value = "") {
  return String(value)
    .toLowerCase()
    .replace(/[\u2014\u2013]/g, "-")
    .replace(/\s+/g, " ")
    .replace(/\s*-\s*/g, " - ")
    .trim();
}

function stripReplyPrefixes(value = "") {
  let text = String(value || "").trim();
  let previous = "";
  while (text && text !== previous) {
    previous = text;
    text = text.replace(/^(?:re|fw|fwd)\s*:\s*/i, "").trim();
  }
  return text;
}

function normalizeUrl(value = "") {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  if (/^(?:www\.)?[a-z0-9.-]+\.[a-z]{2,}\//i.test(raw) || /^(?:www\.)?[a-z0-9.-]+\.[a-z]{2,}$/i.test(raw)) {
    return `https://${raw}`;
  }
  return raw;
}

function extractFirstURL(value = "") {
  const match = String(value || "").match(/https?:\/\/[^\s)]+/i);
  return match ? match[0] : "";
}

function parseBoolean(value = "") {
  const normalized = String(value || "").trim().toLowerCase();
  if (["yes", "true", "1", "on"].includes(normalized)) return true;
  if (["no", "false", "0", "off"].includes(normalized)) return false;
  return undefined;
}

function parseSpecificDates(value = "") {
  return String(value || "")
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter((item) => /^\d{4}-\d{2}-\d{2}$/.test(item));
}

function dedupeSocials(items = []) {
  const seen = new Set();
  return items.filter((item) => {
    if (!item || !item.type || !item.url) return false;
    const key = `${String(item.type).toLowerCase()}|${String(item.url).replace(/\/$/, "")}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function mergeSocials(existing = [], incoming = []) {
  const merged = [...existing];

  incoming.forEach((nextItem) => {
    if (!nextItem || !nextItem.type || !nextItem.url) return;
    const titleKey = String(nextItem.title || "").trim().toLowerCase();
    if (titleKey) {
      const titledIndex = merged.findIndex((item) =>
        item &&
        String(item.type || "").toLowerCase() === String(nextItem.type || "").toLowerCase() &&
        String(item.title || "").trim().toLowerCase() === titleKey
      );
      if (titledIndex >= 0) {
        merged[titledIndex] = nextItem;
        return;
      }
    }
    merged.push(nextItem);
  });

  return dedupeSocials(merged);
}

function mergePatch(existing = {}, incoming = {}) {
  const next = { ...existing };

  Object.keys(incoming).forEach((key) => {
    if (key === "extraSocials") return;
    if (incoming[key] !== undefined) {
      next[key] = incoming[key];
    }
  });

  if (existing.extraSocials || incoming.extraSocials) {
    next.extraSocials = mergeSocials(
      Array.isArray(existing.extraSocials) ? existing.extraSocials : [],
      Array.isArray(incoming.extraSocials) ? incoming.extraSocials : [],
    );
  }

  return next;
}

function extractNamedSocialLabel(line = "", fallback = "Host") {
  const afterFor = String(line || "").match(/\bfor\s+([^()]+?)(?:\s*\(|$)/i);
  const name = afterFor ? afterFor[1].trim() : "";
  return name ? `${name} Instagram` : `${fallback} Instagram`;
}

function buildSocialPatch(lines = []) {
  const extraSocials = [];
  let linkedinURL = "";

  lines.forEach((line) => {
    const instagramURL = extractFirstURL(line);
    if (instagramURL && /instagram\.com/i.test(instagramURL)) {
      extraSocials.push({
        type: "instagram",
        url: instagramURL,
        title: extractNamedSocialLabel(line),
      });
      return;
    }

    const linkedInMatch = String(line || "").match(/https?:\/\/(?:www\.)?linkedin\.com\/[^\s)]+/i);
    if (linkedInMatch) {
      linkedinURL = linkedInMatch[0];
      extraSocials.push({
        type: "linkedin",
        url: linkedInMatch[0],
        title: "Host LinkedIn",
      });
    }
  });

  return {
    extraSocials: dedupeSocials(extraSocials),
    linkedinURL,
  };
}

function extractClubLabel({ subject = "", text = "", forwardedSubject = "", clubHint = "" } = {}) {
  const candidates = [
    stripReplyPrefixes(subject),
    stripReplyPrefixes(forwardedSubject),
  ];

  for (const candidate of candidates) {
    const match = String(candidate || "").match(/^site:\s*(.+)$/i);
    if (match) return match[1].trim();
  }

  const textMatch = String(text || "").match(/^\s*(?:club|city|display city)\s*:\s*(.+)$/im);
  if (textMatch) return textMatch[1].trim();

  return String(clubHint || "").trim();
}

export function parseStructuredSiteUpdate({
  subject = "",
  text = "",
  forwardedSubject = "",
  clubHint = "",
} = {}) {
  const notes = String(text || "").trim();
  const club = extractClubLabel({ subject, text: notes, forwardedSubject, clubHint });
  if (!notes || !club) return null;

  const patch = {};
  const lines = notes
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const socialPatch = buildSocialPatch(lines);
  if (socialPatch.extraSocials.length) patch.extraSocials = socialPatch.extraSocials;
  if (socialPatch.linkedinURL) patch.linkedinURL = socialPatch.linkedinURL;

  const fieldMap = {
    "display city": "displayCity",
    venue: "venue",
    "host display": "hostDisplay",
    cadence: "cadence",
    time: "time",
    "event time": "eventTime",
    "community link": "communityLink",
    whatsapp: "communityLink",
    "location note": "locationNote",
    "location note detail": "locationNoteDetail",
    "maps url": "mapsURL",
    "flyer url": "flyerURL",
  };

  lines.forEach((line) => {
    const match = line.match(/^([A-Za-z ]+)\s*:\s*(.+)$/);
    if (!match) return;
    const field = match[1].trim().toLowerCase();
    const value = match[2].trim();

    if (fieldMap[field]) {
      patch[fieldMap[field]] = field === "maps url" || field === "flyer url" || field === "community link" || field === "whatsapp"
        ? normalizeUrl(value)
        : value;
      return;
    }

    if (field === "featured") {
      const parsed = parseBoolean(value);
      if (parsed !== undefined) patch.featured = parsed;
      return;
    }

    if (field === "is new" || field === "new") {
      const parsed = parseBoolean(value);
      if (parsed !== undefined) patch.isNew = parsed;
      return;
    }

    if (field === "night" || field === "is night") {
      const parsed = parseBoolean(value);
      if (parsed !== undefined) patch.isNight = parsed;
      return;
    }

    if (field === "latitude" || field === "longitude") {
      const parsed = Number(value);
      if (!Number.isNaN(parsed)) patch[field] = parsed;
      return;
    }

    if (field === "specific dates") {
      const dates = parseSpecificDates(value);
      if (dates.length) patch.specificDates = dates;
    }
  });

  if (!Object.keys(patch).length) return null;

  return {
    club,
    clubKey: normalizeClubKey(club),
    patch,
  };
}

async function getStore() {
  return getConfiguredStore(LIVE_OVERRIDES_STORE, { consistency: "strong" });
}

export async function getLiveOverridesSnapshot() {
  const store = await getStore();
  return (await store.get(LIVE_OVERRIDES_KEY, { type: "json" })) || {
    updatedAt: "",
    items: {},
  };
}

export async function upsertLiveClubOverride({ club, patch, email = "", subject = "", source = "email_inbox" } = {}) {
  const clubKey = normalizeClubKey(club);
  if (!clubKey || !patch || !Object.keys(patch).length) return null;

  const store = await getStore();
  const snapshot = (await store.get(LIVE_OVERRIDES_KEY, { type: "json" })) || {
    updatedAt: "",
    items: {},
  };
  const now = new Date().toISOString();
  const existing = snapshot.items[clubKey] || {};
  const mergedPatch = mergePatch(existing.patch || {}, patch);

  snapshot.items[clubKey] = {
    club,
    clubKey,
    patch: mergedPatch,
    updatedAt: now,
    email,
    subject,
    source,
  };
  snapshot.updatedAt = now;

  await store.setJSON(LIVE_OVERRIDES_KEY, snapshot);
  return snapshot.items[clubKey];
}

export async function applyApprovedLiveUpdate(ticket = {}) {
  const structured = ticket.siteUpdate;
  if (!structured || !structured.club || !structured.patch || !Object.keys(structured.patch).length) {
    return null;
  }

  const record = await upsertLiveClubOverride({
    club: structured.club,
    patch: structured.patch,
    email: ticket.email || "",
    subject: ticket.subject || "",
    source: ticket.source || "email_inbox",
  });

  return record
    ? {
        applied: true,
        club: record.club,
        clubKey: record.clubKey,
        updatedAt: record.updatedAt,
        fields: Object.keys(record.patch || {}),
      }
    : null;
}
