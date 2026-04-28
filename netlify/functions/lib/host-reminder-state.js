import { getStore } from "@netlify/blobs";

const HOST_ACTIVITY_STORE = "host-reminder-state";
const RECENT_UPDATE_WINDOW_DAYS = 6;
const RECENT_EMAIL_WINDOW_DAYS = 6;
const INACTIVE_STALE_DAYS = 14;

function normalizeEmail(value = "") {
  const match = String(value).match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/);
  return match ? match[0].toLowerCase() : "";
}

function normalizeKeyPart(value = "") {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "unknown";
}

function getStoreRef() {
  const siteID =
    process.env.NETLIFY_BLOBS_SITE_ID ||
    process.env.NETLIFY_SITE_ID ||
    process.env.SITE_ID ||
    "";
  const token =
    process.env.NETLIFY_BLOBS_TOKEN ||
    process.env.NETLIFY_AUTH_TOKEN ||
    process.env.NETLIFY_TOKEN ||
    "";

  const options = { name: HOST_ACTIVITY_STORE, consistency: "strong" };
  if (siteID) options.siteID = siteID;
  if (token) options.token = token;

  return getStore(options);
}

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function daysSince(value, now = new Date()) {
  const date = parseDate(value);
  if (!date) return null;
  return Math.floor((now.getTime() - date.getTime()) / 86400000);
}

function isWithinDays(value, days, now = new Date()) {
  const elapsedDays = daysSince(value, now);
  return elapsedDays !== null && elapsedDays >= 0 && elapsedDays < days;
}

function reminderKey(email) {
  return `reminders/${normalizeEmail(email)}.json`;
}

function updateKey(email, club = "") {
  return `updates/${normalizeEmail(email)}/${normalizeKeyPart(club)}.json`;
}

async function getReminderState(email) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return null;
  return getStoreRef().get(reminderKey(normalizedEmail), { type: "json" });
}

async function markReminderSent({ email, cities = [], cycleDate, mode, sentAt = new Date().toISOString() }) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return;
  await getStoreRef().setJSON(reminderKey(normalizedEmail), {
    email: normalizedEmail,
    cities,
    cycleDate,
    mode,
    lastEmailSentAt: sentAt,
  });
}

async function markHostUpdate({ email, club = "", submittedAt = new Date().toISOString(), source = "unknown" }) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return;
  await getStoreRef().setJSON(updateKey(normalizedEmail, club), {
    email: normalizedEmail,
    club,
    submittedAt,
    source,
    lastUpdatedAt: submittedAt,
  });
}

async function hasRecentHostUpdate({ email, clubs = [], now = new Date(), windowDays = RECENT_UPDATE_WINDOW_DAYS }) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return false;

  const keys = new Set([updateKey(normalizedEmail, "")]);
  for (const club of clubs) keys.add(updateKey(normalizedEmail, club));

  const states = await Promise.all(
    [...keys].map((key) => getStoreRef().get(key, { type: "json" }))
  );

  return states.some((state) => isWithinDays(state?.lastUpdatedAt || state?.submittedAt, windowDays, now));
}

function getRecipientSkipReason({ reminderState, hasRecentUpdate, upcomingDate, now = new Date() }) {
  if (isWithinDays(reminderState?.lastEmailSentAt, RECENT_EMAIL_WINDOW_DAYS, now)) {
    return "recent-email";
  }

  if (hasRecentUpdate) {
    return "recent-update";
  }

  const inactiveDays = daysSince(upcomingDate, now);
  if (inactiveDays !== null && inactiveDays > INACTIVE_STALE_DAYS) {
    return null;
  }

  return null;
}

export {
  INACTIVE_STALE_DAYS,
  RECENT_EMAIL_WINDOW_DAYS,
  RECENT_UPDATE_WINDOW_DAYS,
  daysSince,
  getRecipientSkipReason,
  getReminderState,
  hasRecentHostUpdate,
  markHostUpdate,
  markReminderSent,
  normalizeEmail,
};
