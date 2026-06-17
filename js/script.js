const BKClubData = window.BKClubData || {};
const {
  normalize: sharedNormalize,
  shouldHideClub: sharedShouldHideClub,
  fetchSheetRows,
  createSheetAccess,
  getOverrideForCity,
  getVenue: sharedGetVenue,
  normalizeFlyer: sharedNormalizeFlyer,
  extractInstagramHandles: sharedExtractInstagramHandles,
  extractInstagramURL: sharedExtractInstagramURL,
  extractLinkedInURL: sharedExtractLinkedInURL,
  parseSheetUpcomingDate: sharedParseSheetUpcomingDate,
  loadLiveClubOverrides: sharedLoadLiveClubOverrides,
  loadLatestHappeningsRegistry: sharedLoadLatestHappeningsRegistry,
  clubHasLatestHappenings: sharedClubHasLatestHappenings,
  renderLatestHappeningsButton: sharedRenderLatestHappeningsButton,
} = BKClubData;
const GROWTH_TITLE_SUFFIX = "clubs worldwide and counting";
const CLUB_OVERRIDES = window.CLUB_OVERRIDES || {};
let growthTitleTimer = null;

const clubsList = document.querySelector("#clubs-list");
const statusText = document.querySelector("#status");
const searchInput = document.querySelector("#club-search");
const daysNav = document.querySelector("#days-nav");
const siteTitle = document.querySelector("#site-title");
const mainHeadline = document.querySelector("#main-headline");
const regionHeadline = document.querySelector("#region-headline");
const regionFilter = document.querySelector("#region-filter");
const flyerFeature = document.querySelector("#flyer-feature");
const flyerFeatureTitle = document.querySelector("#flyer-feature-title");
const flyerFeatureText = document.querySelector("#flyer-feature-text");
const flyerFeatureButton = document.querySelector("#flyer-feature-button");
const calendarViewLink = document.querySelector(".calendar-headline-link");
const mobileResourcesToggle = document.querySelector(".mobile-resources-toggle");
const mobileResourcesBody = document.querySelector("#mobile-resources-body");
const backToTopBtn = document.querySelector("#back-to-top");
const clubUpdateModal = document.querySelector("#club-update-modal");
const clubUpdateForm = document.querySelector("#club-update-form");
const clubUpdateCloseBtn = document.querySelector("#club-update-close");
const clubUpdateCityInput = document.querySelector("#club-update-city");
const clubUpdateNotesInput = document.querySelector("#club-update-notes");
const clubUpdateEmailInput = document.querySelector("#club-update-email");
const clubUpdateStatus = document.querySelector("#club-update-status");
let flyerGalleryItems = [];
const CLUB_UPDATE_ENDPOINT = "/.netlify/functions/submit-club-update";
let activeClubUpdateContext = null;
let flyerWallManifestPromise = null;

const REGION_ORDER = [
  "Northeast US",
  "Southeast US",
  "West Coast",
  "UK",
  "Europe",
  "Australia",
  "Other",
];

// Exact sheet city names (lowercase) → granular region
const CITY_REGION = {
  "amsterdam": "Europe",
  "atlanta": "Southeast US",
  "austin": "Southeast US",
  "austin, tx": "Southeast US",
  "barcelona": "Europe",
  "bassano del grappa": "Europe",
  "berlin": "Europe",
  "biarritz": "Europe",
  "boston": "Northeast US",
  "boulder": "Other",
  "brighton": "UK",
  "burlington, vt": "Northeast US",
  "burlington, vermont": "Northeast US",
  "cambridge, ma": "Northeast US",
  "chicago": "Other",
  "copenhagen": "Europe",
  "denver": "Other",
  "ibiza": "Europe",
  "london": "UK",
  "los angeles": "West Coast",
  "lugano": "Europe",
  "manila": "Other",
  "maplewood, nj": "Northeast US",
  "melbourne \u2014 fitzroy": "Australia",
  "melbourne \u2014 richmond": "Australia",
  "mexico city": "Other",
  "miami": "Southeast US",
  "milano": "Europe",
  "milan": "Europe",
  "new york \u2014 downtown brooklyn": "Northeast US",
  "new york \u2014 hamptons": "Northeast US",
  "new york \u2014 hudson": "Northeast US",
  "new york \u2014 kingston": "Northeast US",
  "new york \u2014 les": "Northeast US",
  "new york - upper west": "Northeast US",
  "new york \u2014 williamsburg": "Northeast US",
  "norwich": "UK",
  "panama city": "Other",
  "paris": "Europe",
  "perth": "Australia",
  "philadelphia": "Northeast US",
  "portland, me": "Northeast US",
  "portland, maine": "Northeast US",
  "portland, or": "West Coast",
  "san francisco": "West Coast",
  "seattle": "West Coast",
  "singapore": "Other",
  "torquay, au": "Australia",
  "surf coast - torquay": "Australia",
  "sydney": "Australia",
  "toronto": "Other",
  "las vegas": "Other",
  "vienna": "Europe",
  "washington dc": "Northeast US",
};

let activeRegion = "All";

const DEFAULT_COPY = {
  siteTitle: "Breakfast Club",
  mainHeadline: "Everyone's invited. Especially you.",
  hostCta:
    "Become a host. Download the Starter Kit.",
  searchPlaceholder: "search clubs",
};

let clubs = [];
const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Every now and again",
];

function shouldHideClub(city) {
  if (sharedShouldHideClub) return sharedShouldHideClub(city);
  return false;
}

function loadSiteCopy() {
  const copy = DEFAULT_COPY;
  if (siteTitle) siteTitle.textContent = copy.siteTitle;
  if (mainHeadline) mainHeadline.textContent = copy.mainHeadline;

  if (searchInput) searchInput.placeholder = copy.searchPlaceholder;
}

function parseCSVLine(line) {
  const out = [];
  let value = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        value += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      out.push(value.trim());
      value = "";
      continue;
    }

    value += char;
  }

  out.push(value.trim());
  return out;
}

function parseCSV(text) {
  if (BKClubData.parseCSV) return BKClubData.parseCSV(text);
  const lines = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .filter(Boolean);

  const rows = [];
  let current = "";
  let quoteCount = 0;

  for (const line of lines) {
    if (current) {
      current += "\n";
    }
    current += line;
    quoteCount += (line.match(/"/g) || []).length;

    if (quoteCount % 2 === 0) {
      rows.push(parseCSVLine(current));
      current = "";
      quoteCount = 0;
    }
  }

  return rows;
}

function getMapURL(city) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(city)}`;
}

function getClubUpdateLinkCopy(club) {
  return club && club.isKnownHost ? "Update your event" : "?";
}

function buildClubUpdateContext(club) {
  return {
    city: club.city || "",
    displayCity: getDisplayCity(club),
    host: club.hostDisplay || "",
    venue: club.venue || "",
    day: club.day || "",
    scheduleLabel: club.scheduleLabel || "",
    eventTime: club.eventTimeLabel || club.eventTime || "",
  };
}

function createLocationNoteBody(noteLabel, noteDetail) {
  const noteBody = document.createElement("p");
  noteBody.className = "host-note-body";
  const strong = document.createElement("strong");
  strong.textContent = `${noteLabel || "Update"}: `;
  noteBody.append(strong);
  noteBody.append(document.createTextNode(noteDetail || ""));
  return noteBody;
}

async function submitClubUpdate(payload) {
  const response = await fetch(CLUB_UPDATE_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  let data = {};
  try {
    data = await response.json();
  } catch (_error) {
    data = {};
  }

  if (!response.ok) {
    throw new Error(data.error || "Could not submit right now.");
  }

  return data;
}

function createClubUpdateModule(club) {
  const wrap = document.createElement("div");
  wrap.className = "card-update";

  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "card-update-link";
  trigger.textContent = getClubUpdateLinkCopy(club);
  trigger.setAttribute("aria-label", "Spotted something off? Submit an update.");
  trigger.title = "Spotted something off? Submit an update.";
  trigger.setAttribute("aria-expanded", "false");
  wrap.append(trigger);

  trigger.addEventListener("click", () => {
    openClubUpdateModal(club, trigger);
  });

  return wrap;
}

function resetClubUpdateModal() {
  if (!clubUpdateForm || !clubUpdateStatus) return;
  clubUpdateForm.reset();
  clubUpdateStatus.textContent = "";
  clubUpdateStatus.classList.remove("is-error");
  if (clubUpdateStatus) clubUpdateStatus.hidden = true;
  const submitBtn = clubUpdateForm.querySelector(".club-update-submit");
  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.textContent = "Send update";
  }
}

function openClubUpdateModal(club, triggerEl) {
  if (!clubUpdateModal || !clubUpdateCityInput || !clubUpdateNotesInput) return;
  activeClubUpdateContext = {
    club,
    triggerEl: triggerEl || null,
  };
  resetClubUpdateModal();
  clubUpdateCityInput.value = getDisplayCity(club);
  document.body.classList.add("club-update-modal-open");
  clubUpdateModal.showModal();
  if (triggerEl) triggerEl.setAttribute("aria-expanded", "true");
  requestAnimationFrame(() => {
    clubUpdateNotesInput.focus();
  });
}

function closeClubUpdateModal() {
  if (!clubUpdateModal || !clubUpdateModal.open) return;
  document.body.classList.remove("club-update-modal-open");
  clubUpdateModal.close();
  if (activeClubUpdateContext && activeClubUpdateContext.triggerEl) {
    activeClubUpdateContext.triggerEl.setAttribute("aria-expanded", "false");
  }
}

if (clubUpdateCloseBtn) {
  clubUpdateCloseBtn.addEventListener("click", closeClubUpdateModal);
}

if (clubUpdateModal) {
  clubUpdateModal.addEventListener("click", (event) => {
    const rect = clubUpdateModal.getBoundingClientRect();
    const inDialog =
      event.clientX >= rect.left &&
      event.clientX <= rect.right &&
      event.clientY >= rect.top &&
      event.clientY <= rect.bottom;
    if (!inDialog) closeClubUpdateModal();
  });

  clubUpdateModal.addEventListener("close", () => {
    document.body.classList.remove("club-update-modal-open");
    if (activeClubUpdateContext && activeClubUpdateContext.triggerEl) {
      activeClubUpdateContext.triggerEl.setAttribute("aria-expanded", "false");
      activeClubUpdateContext.triggerEl.focus();
    }
    activeClubUpdateContext = null;
  });
}

if (clubUpdateForm) {
  clubUpdateForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submitBtn = clubUpdateForm.querySelector(".club-update-submit");
    if (!clubUpdateStatus || !submitBtn) return;

    clubUpdateStatus.hidden = true;
    clubUpdateStatus.textContent = "";
    clubUpdateStatus.classList.remove("is-error");
    submitBtn.disabled = true;
    submitBtn.textContent = "Sending...";

    const club = activeClubUpdateContext && activeClubUpdateContext.club;

    try {
      await submitClubUpdate({
        club: clubUpdateCityInput.value.trim(),
        notes: clubUpdateNotesInput.value.trim(),
        email: clubUpdateEmailInput.value.trim(),
        submittedAt: new Date().toISOString(),
        context: club ? buildClubUpdateContext(club) : {},
      });

      clubUpdateStatus.textContent = "Got it. We'll review + update shortly.";
      clubUpdateStatus.hidden = false;
      submitBtn.textContent = "Sent";
      if (window.BKAnalytics) {
        window.BKAnalytics.track("club_update_submit", {
          city: clubUpdateCityInput.value.trim(),
          source: "club_card_modal",
        });
      }
    } catch (error) {
      clubUpdateStatus.textContent = error.message || "Could not submit right now.";
      clubUpdateStatus.hidden = false;
      clubUpdateStatus.classList.add("is-error");
      submitBtn.disabled = false;
      submitBtn.textContent = "Send update";
    }
  });
}

function cleanLocationValue(value) {
  if (BKClubData.cleanLocationValue) return BKClubData.cleanLocationValue(value);
  const raw = (value || "").replace(/\s+/g, " ").trim();
  if (!raw) return "";
  const lowered = normalize(raw);
  if (lowered === "tbd") return "";
  if (lowered.includes("looking for a home")) return "";
  if (lowered.includes("changing locations soon")) return "";
  if (lowered === "x") return "";
  return raw;
}

function getVenue(location, addressInfo) {
  if (sharedGetVenue) return sharedGetVenue(location, addressInfo);
  return cleanLocationValue(location) || cleanLocationValue(addressInfo) || "";
}

function normalizeFlyer(url) {
  if (sharedNormalizeFlyer) return sharedNormalizeFlyer(url);
  if (!url) return "";
  var match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (match) return "https://drive.google.com/uc?export=view&id=" + match[1];
  var match2 = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (match2) return "https://drive.google.com/uc?export=view&id=" + match2[1];
  return url;
}

function extractInstagramURL(value) {
  if (sharedExtractInstagramURL) return sharedExtractInstagramURL(value);
  const handles = extractInstagramHandles(value);
  if (!handles.length) return "";
  const handle = handles[0].replace(/^@/, "");
  if (!handle) return "";
  return `https://www.instagram.com/${handle}/`;
}

function extractInstagramHandles(value) {
  if (sharedExtractInstagramHandles) return sharedExtractInstagramHandles(value);
  const raw = (value || "").trim();
  if (!raw) return [];
  const matches = raw.match(/@[A-Za-z0-9._]+/g) || [];
  return [...new Set(matches)];
}

function formatHostDisplay(hostName, handles, overrideHostDisplay) {
  const cleanName = (hostName || "").trim();
  if (cleanName) {
    return cleanName
      .split(/\s*[,+]\s*|\s+and\s+/i)
      .map((s) => s.trim())
      .filter(Boolean)
      .join(" & ");
  }

  if (overrideHostDisplay) {
    const cleanedOverride = overrideHostDisplay
      .replace(/\([^)]*\)/g, " ")
      .replace(/@[A-Za-z0-9._]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (cleanedOverride) {
      return cleanedOverride
        .split(/\s*[,+|]\s*|\s+and\s+/i)
        .map((s) => s.trim())
        .filter(Boolean)
        .join(" & ");
    }
  }
  return handles.join(" | ");
}

function extractLinkedInURL(...values) {
  if (sharedExtractLinkedInURL) return sharedExtractLinkedInURL(...values);
  for (const value of values) {
    const raw = (value || "").trim();
    if (!raw) continue;

    const direct = raw.match(/https?:\/\/(?:www\.)?linkedin\.com\/[^\s,]+/i);
    if (direct) return direct[0];

    const noProtocol = raw.match(/(?:www\.)?linkedin\.com\/[^\s,]+/i);
    if (noProtocol) return `https://${noProtocol[0]}`;
  }

  return "";
}

function parseWeekday(value) {
  const text = normalize(value);
  if (text.includes("monday")) return "Monday";
  if (text.includes("tuesday")) return "Tuesday";
  if (text.includes("wednesday")) return "Wednesday";
  if (text.includes("thursday")) return "Thursday";
  if (text.includes("friday")) return "Friday";
  return "";
}

function hasRegularCadence(cadence, timeValue) {
  const text = normalize(`${cadence} ${timeValue}`);
  return /(weekly|bi-weekly|biweekly|monthly|first|second|third|fourth|every)/.test(
    text,
  );
}

function formatTimeLabel(value) {
  const text = (value || "").trim();
  if (!text) return "";
  const noPlaceholder = text
    .replace(/\bTIME\b/gi, "")
    .replace(/\s*,\s*$/, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  if (!noPlaceholder) return "";

  const normalized = noPlaceholder.replace(/\b830am\b/i, "8:30am");
  const ordinalWeekdayMatch = normalized.match(
    /\b(first|second|third|fourth|1st|2nd|3rd|4th|frist)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
  );
  if (ordinalWeekdayMatch) {
    const weekday = ordinalWeekdayMatch[2];
    if (!weekday.endsWith("s")) {
      return normalized.replace(
        ordinalWeekdayMatch[0],
        `${ordinalWeekdayMatch[1]} ${weekday}s`,
      );
    }
  }

  return normalized;
}

function compactText(value) {
  return (value || "").replace(/\s+/g, " ").trim();
}

function parseSheetUpcomingDate(value) {
  if (sharedParseSheetUpcomingDate) return sharedParseSheetUpcomingDate(value);
  const raw = compactText(value);
  if (!raw) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  return "";
}

function parseISODateAtNoon(value) {
  if (!value) return null;
  const parsed = new Date(`${value}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getCurrentWeekBounds() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function getCurrentWeekSpecificDates(club) {
  if (!club || !club.specificDates || !club.specificDates.length) return [];
  const { start, end } = getCurrentWeekBounds();
  return club.specificDates
    .map((value) => compactText(value))
    .filter(Boolean)
    .filter((dateStr) => {
      const date = parseISODateAtNoon(dateStr);
      return date && date >= start && date <= end;
    })
    .sort();
}

function isClubConfirmedThisWeek(club) {
  if (club && club.day && club.day !== "Every now and again" && getClubTimeLabel(club)) {
    return true;
  }
  return getCurrentWeekSpecificDates(club).length > 0;
}

function getDisplayDayForClub(club) {
  const currentWeekDates = getCurrentWeekSpecificDates(club);
  if (!currentWeekDates.length) {
    return club && club.day ? club.day : "Every now and again";
  }
  const date = parseISODateAtNoon(currentWeekDates[0]);
  return date
    ? date.toLocaleDateString("en-US", { weekday: "long" })
    : club && club.day ? club.day : "Every now and again";
}

function getClubTimeLabel(club) {
  return compactText(club && (club.eventTimeLabel || club.eventTime));
}

function getTimeSortValue(value) {
  const text = compactText(value).toLowerCase();
  if (!text) return Number.POSITIVE_INFINITY;

  const match = text.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)/i);
  if (!match) return Number.POSITIVE_INFINITY;

  let hours = Number(match[1]) || 0;
  const minutes = Number(match[2] || "0");
  const meridiem = match[3].replace(/\./g, "").toLowerCase();
  if (meridiem === "pm" && hours !== 12) hours += 12;
  if (meridiem === "am" && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

function getClubConfirmationNote(club) {
  if (club && club.day && club.day !== "Every now and again" && getClubTimeLabel(club)) {
    return "";
  }
  if (isClubConfirmedThisWeek(club)) return "";
  return "Time: typically once a month, but confirm with host.";
}

function getDay(cadence, timeValue) {
  const weekday = parseWeekday(timeValue) || parseWeekday(cadence);
  if (weekday && hasRegularCadence(cadence, timeValue)) {
    return weekday;
  }
  return "Every now and again";
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function extractScheduleLabel(cadence, timeValue) {
  const t = (timeValue || "").trim();
  const c = (cadence || "").trim();
  const lower = normalize(t);
  const lowerC = normalize(c);
  if (lower.includes("first thursday") || lowerC.includes("first thursday")) return "First Thursday";
  if (lower.includes("first wednesday") || lowerC.includes("first wednesday")) return "First Wednesday";
  if (lower.includes("first monday") || lowerC.includes("first monday")) return "First Monday";
  if (lower.includes("second friday") || lowerC.includes("second friday")) return "Second Friday";
  if (lower.includes("second monday") || lowerC.includes("second monday")) return "Second Monday";
  if (lower.includes("second thursday") || lowerC.includes("second thursday")) return "Second Thursday";
  if (lower.includes("third thursday") || lowerC.includes("third thursday")) return "Third Thursday";
  if (lower.includes("third friday") || lowerC.includes("third friday")) return "Third Friday";
  if (lower.includes("fourth friday") || lowerC.includes("fourth friday")) return "Fourth Friday";
  if (lower.includes("fourth thursday") || lowerC.includes("fourth thursday")) return "Fourth Thursday";
  if (lower.includes("fourth tuesday") || lowerC.includes("fourth tuesday")) return "Fourth Tuesday";
  if (lower.includes("wednesday") || lowerC.includes("wednesday")) return "Wednesday";
  if (lower.includes("thursday") || lowerC.includes("thursday")) return "Thursday";
  if (lower.includes("friday") || lowerC.includes("friday")) return "Friday";
  if (lower.includes("tuesday") || lowerC.includes("tuesday")) return "Tuesday";
  if (lower.includes("monday") || lowerC.includes("monday")) return "Monday";
  if (c) return c;
  return "First Thursday";
}

function isNightClub(timeValue, overrideIsNight) {
  if (typeof overrideIsNight === "boolean") return overrideIsNight;
  return /\b(pm|p\.m\.|night|evening)\b/.test(normalize(timeValue));
}

function getDisplayCity(club) {
  return club.displayCity || club.city;
}

function createSocialGlyph(type) {
  const glyph = document.createElement("span");
  glyph.className = `social-glyph social-glyph--${type}`;

  if (type === "maps") {
    glyph.innerHTML =
      '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
        '<path d="M12 21s-5.8-5.4-5.8-10.4a5.8 5.8 0 1 1 11.6 0C17.8 15.6 12 21 12 21Z"></path>' +
        '<circle cx="12" cy="10.6" r="2.3"></circle>' +
      "</svg>";
    return glyph;
  }

  if (type === "linkedin") {
    glyph.textContent = "in";
    return glyph;
  }

  glyph.innerHTML =
    '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
      '<rect x="3.25" y="3.25" width="17.5" height="17.5" rx="5.25"></rect>' +
      '<circle cx="12" cy="12" r="4.1"></circle>' +
      '<circle cx="17.35" cy="6.65" r="1.1" fill="currentColor" stroke="none"></circle>' +
    "</svg>";
  return glyph;
}

function renderSocialIcon(type, url, title) {
  const link = document.createElement("a");
  link.href = url;
  link.target = "_blank";
  link.rel = "noreferrer";
  link.title = title || "";
  link.className = `social-icon-link social-icon-link--${type} ${type === "linkedin" ? "li-icon-link" : "ig-icon-link"}`;
  link.append(createSocialGlyph(type));
  return link;
}

function renderMapIcon(url, title) {
  return renderSocialIcon("maps", url, title || "Open in Google Maps");
}

function dedupeSocialItems(items) {
  const seen = new Set();
  return items.filter((item) => {
    if (!item || !item.url) return false;
    const key = item.url.replace(/\/$/, "");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function splitHostNames(value) {
  const cleaned = (value || "")
    .replace(/\([^)]*\)/g, " ")
    .replace(/@[A-Za-z0-9._]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) return [];

  return cleaned
    .split(/\s*(?:,|&|\band\b|\+)\s*/i)
    .map((part) => part.trim())
    .filter(Boolean);
}

function extractLinkedInURLs(values = [], hostName = "") {
  const items = [];
  const hostNames = splitHostNames(hostName);

  values.forEach((value) => {
    const raw = (value || "").trim();
    if (!raw) return;

    const matches = raw.match(/https?:\/\/(?:www\.)?linkedin\.com\/[^\s,]+|(?:www\.)?linkedin\.com\/[^\s,]+/gi) || [];
    matches.forEach((match) => {
      const url = /^https?:\/\//i.test(match) ? match : `https://${match}`;
      items.push({
        url,
        title: "",
      });
    });
  });

  return dedupeSocialItems(items).map((item, index, deduped) => ({
    ...item,
    title:
      hostNames[index] ||
      (deduped.length === 1 ? hostNames[0] || "LinkedIn" : `LinkedIn ${index + 1}`),
  }));
}

function buildInstagramSocialItems(handles = [], extraSocials = []) {
  const fromHandles = handles.map((handle) => ({
    url: `https://www.instagram.com/${handle.replace(/^@/, "")}/`,
    title: handle,
  }));
  const fromOverrides = extraSocials
    .filter((item) => item && item.type === "instagram" && item.url)
    .map((item) => ({
      url: item.url,
      title: item.title || "Instagram",
    }));
  return dedupeSocialItems(fromHandles.concat(fromOverrides));
}

function buildLinkedInSocialItems(sheetValues = [], extraSocials = [], overrideURL = "", hostName = "") {
  const hostNames = splitHostNames(hostName);
  const fromSheet = extractLinkedInURLs(sheetValues, hostName);
  const fromOverride = overrideURL ? [{ url: overrideURL, title: hostNames[0] || "LinkedIn" }] : [];
  const fromExtras = extraSocials
    .filter((item) => item && item.type === "linkedin" && item.url)
    .map((item) => ({
      url: item.url,
      title: item.title || "LinkedIn",
    }));
  return dedupeSocialItems(fromSheet.concat(fromOverride, fromExtras));
}

function renderSocialMenu(type, items) {
  const details = document.createElement("details");
  details.className = "social-menu";

  const summary = document.createElement("summary");
  summary.className = "social-menu-trigger";
  summary.append(createSocialGlyph(type));
  const count = document.createElement("span");
  count.className = "social-count";
  count.textContent = `(${items.length})`;
  summary.append(count);
  details.append(summary);

  const panel = document.createElement("div");
  panel.className = "social-menu-panel";

  items.forEach((item, index) => {
    const link = document.createElement("a");
    link.href = item.url;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.className = "social-menu-link";
    link.textContent = item.title || `${type === "instagram" ? "Instagram" : "LinkedIn"} ${index + 1}`;
    panel.append(link);
  });

  details.append(panel);
  return details;
}

function buildFlyerGalleryItems(items = clubs, options = {}) {
  const { activeOnly = false } = options;
  const seen = new Set();
  return (items || [])
    .filter((club) => club && club.flyerURL && (!activeOnly || club.isActive !== false))
    .map((club) => ({
      city: getDisplayCity(club),
      url: club.flyerURL,
      venue: club.venue || "",
      scheduleLabel: club.scheduleLabel || "",
      eventTime: club.eventTime || "",
    }))
    .filter((item) => {
      const key = `${item.city}::${item.url}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function getFlyerGalleryItems() {
  return buildFlyerGalleryItems(clubs);
}

function getPreferredFlyerGalleryItems(items = clubs) {
  const activeItems = buildFlyerGalleryItems(items, { activeOnly: true });
  return activeItems.length ? activeItems : buildFlyerGalleryItems(items);
}

function isFlyerWallImage(url = "") {
  return /\.(png|jpe?g|gif|webp|avif)$/i.test(url);
}

function fetchFlyerWallManifestItems() {
  if (!flyerWallManifestPromise) {
    flyerWallManifestPromise = fetch("./data/flyer-wall.json")
      .then((response) => {
        if (!response.ok) throw new Error("manifest unavailable");
        return response.json();
      })
      .then((manifest) => (manifest.items || [])
        .filter((item) => item && item.url && item.city && isFlyerWallImage(item.url))
        .map((item) => {
          // Date can live in the JSON or be embedded in the filename
          // (e.g. Cph_2026-04-09.png) — a flyer is only "date agnostic"
          // if neither carries one, or it's explicitly flagged evergreen.
          const fileDate = ((item.sourceFile || item.url || "").match(/(\d{4}-\d{2}-\d{2})/) || [])[1] || "";
          return {
            city: compactText(item.city || ""),
            url: item.url,
            flyerDate: item.date || fileDate,
            evergreen: Boolean(item.evergreen),
          };
        }));
  }

  return flyerWallManifestPromise.catch(() => []);
}

function getFlyerPageHref(cityName = "") {
  const base = "./fly-er.html";
  const city = compactText(cityName);
  return city ? `${base}?city=${encodeURIComponent(city)}` : base;
}

function normalizeFlyerCityKey(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[—–]/g, "-")
    .split(",")[0]
    .replace(/\s+/g, " ")
    .trim();
}

// Give every club its latest wall flyer when the sheet doesn't set one,
// so cards like Biarritz get a Share Flyer button from data/flyer-wall.json.
//
// Sharability rule: only surface flyers that are DATE-AGNOSTIC (no event
// date) or dated TODAY/UPCOMING. An expired dated flyer is never shareable —
// better no Share button than sending a friend to yesterday's breakfast.
async function applyManifestFlyers(list) {
  // Admin-uploaded blob flyers merge in ahead of the static manifest, so an
  // /admin upload plugs straight into the card Share Flyer buttons too —
  // no redeploy needed. (Blob flyers carry flyerDate; the date-gate applies.)
  const [blobItems, staticItems] = await Promise.all([
    fetchBlobFlyerItems(),
    fetchFlyerWallManifestItems(),
  ]);
  const manifest = blobItems
    .map((f) => ({
      city: f.city,
      url: f.url,
      flyerDate: (String(f.flyerDate || "").match(/^\d{4}-\d{2}-\d{2}/) || [""])[0],
      evergreen: false,
    }))
    .concat(staticItems);
  if (!manifest.length) return;

  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const exactKey = (v) => String(v || "").toLowerCase().replace(/[—–]/g, "-").replace(/\s+/g, " ").trim();

  // Pick the best shareable flyer: soonest upcoming date first, then
  // evergreen / date-agnostic; expired dated flyers are excluded entirely.
  const pickShareable = (items) => {
    const upcoming = items
      .filter((i) => !i.evergreen && i.flyerDate && i.flyerDate >= todayKey)
      .sort((a, b) => a.flyerDate.localeCompare(b.flyerDate));
    if (upcoming.length) return upcoming[0];
    const agnostic = items.filter((i) => i.evergreen || !i.flyerDate);
    return agnostic.length ? agnostic[agnostic.length - 1] : null;
  };

  const byExact = new Map();
  const byLoose = new Map();
  const looseOwner = new Map(); // looseKey -> exactKey, to detect ambiguity (Portland ME vs OR)
  manifest.forEach((item) => {
    const ek = exactKey(item.city);
    const lk = normalizeFlyerCityKey(item.city);
    if (!ek) return;
    if (!byExact.has(ek)) byExact.set(ek, []);
    byExact.get(ek).push(item);
    if (!lk) return;
    if (looseOwner.has(lk) && looseOwner.get(lk) !== ek) {
      byLoose.delete(lk); // ambiguous across different cities — never guess
      looseOwner.set(lk, "__ambiguous__");
      return;
    }
    if (looseOwner.get(lk) !== "__ambiguous__") {
      looseOwner.set(lk, ek);
      if (!byLoose.has(lk)) byLoose.set(lk, []);
      byLoose.get(lk).push(item);
    }
  });

  list.forEach((club) => {
    if (!club || club.flyerURL) return;
    const buckets = [
      byExact.get(exactKey(getDisplayCity(club))),
      byExact.get(exactKey(club.city)),
      byLoose.get(normalizeFlyerCityKey(getDisplayCity(club))),
      byLoose.get(normalizeFlyerCityKey(club.city)),
    ];
    for (const bucket of buckets) {
      if (!bucket || !bucket.length) continue;
      const match = pickShareable(bucket);
      if (match) {
        club.flyerURL = match.url;
        return;
      }
      // bucket existed but everything in it is expired — keep checking
      // broader buckets, otherwise leave the club without a Share button.
    }
  });
}

function formatFlyerCitySummary(items) {
  const cities = Array.from(new Set((items || []).map((item) => item.city).filter(Boolean)));
  if (!cities.length) return "";
  if (cities.length === 1) return cities[0];
  if (cities.length === 2) return `${cities[0]} and ${cities[1]}`;
  return `${cities[0]}, ${cities[1]}, and more`;
}

function getFlyerFeatureCityLabel(value = "") {
  return compactText(value).replace(/,\s*[A-Z]{2,3}$/g, "");
}

function getFlyerFeatureLead(items = []) {
  return (items || [])[0] || null;
}

function getFlyerFeatureHeadline(items = []) {
  const cities = Array.from(
    new Set((items || []).map((item) => getFlyerFeatureCityLabel(item.city || "")).filter(Boolean))
  );
  if (!cities.length) return "Latest flyers from clubs worldwide.";
  if (cities.length === 1) return `Latest flyers from ${cities[0]}.`;
  if (cities.length === 2) return `Latest flyers from ${cities[0]}, ${cities[1]}, and more.`;
  return `Latest flyers from ${cities[0]}, ${cities[1]}, ${cities[2]}, and more.`;
}

function openFlyerCollection(items, selectedItem = null) {
  const nextItems = (items || []).filter((item) => item && item.url);
  if (!nextItems.length) return;
  const target = selectedItem || nextItems[0];
  // Always route through the shared lightbox (js/flyer-lightbox.js) — it owns
  // the Easy to Share bar. The legacy in-file lightbox below is fallback-only.
  window.openFlyerLightbox(target.url, target.city, { items: nextItems });
}

function renderHostText(text, instagramURL, linkedinURL) {
  const url = instagramURL || linkedinURL;
  if (url) {
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noreferrer";
    a.className = "card-host-link";
    a.textContent = text || "";
    return a;
  }
  return document.createTextNode(text || "");
}

function createTitleBadges(club) {
  const wrap = document.createElement("div");
  wrap.className = "title-badges";

  if (club.isNight) {
    const nightBadge = document.createElement("span");
    nightBadge.className = "badge badge-night";
    nightBadge.textContent = "Night";
    wrap.append(nightBadge);
  }

  if (club.featured) {
    const featuredBadge = document.createElement("span");
    featuredBadge.className = "badge badge-featured";
    featuredBadge.textContent = "Featured";
    wrap.append(featuredBadge);
  }

  if (club.statusBadge || club.isNew) {
    const statusBadge = document.createElement("span");
    const label = compactText(club.statusBadge) || "New";
    statusBadge.className = `badge ${label.toLowerCase() === "returning" ? "badge-returning" : "badge-new"}`;
    statusBadge.textContent = label;
    wrap.append(statusBadge);
  }

  return wrap.childNodes.length ? wrap : null;
}

function createVerifiedBadge(club) {
  if (!club || !club.isVerified) return null;
  const verifiedBadge = document.createElement("span");
  verifiedBadge.className = `badge badge-verified ${getVerifiedBadgeVariantClass(club)}`;
  verifiedBadge.title = "Verified, yo!";
  verifiedBadge.setAttribute("aria-label", "Verified, yo!");
  verifiedBadge.setAttribute("data-tooltip", "Verified, yo!");
  verifiedBadge.tabIndex = 0;
  verifiedBadge.innerHTML =
    '<img class="badge-verified-mark" src="./assets/hand-drawn-check-mark.png" alt="" aria-hidden="true">';
  verifiedBadge.addEventListener("click", handleVerifiedBadgeTap);
  return verifiedBadge;
}

function handleVerifiedBadgeTap(event) {
  const badge = event.currentTarget;
  if (!(badge instanceof HTMLElement)) return;
  const nextCount = Number(badge.dataset.tapCount || "0") + 1;
  badge.dataset.tapCount = String(nextCount);
  if (nextCount < 3) return;
  badge.dataset.tapCount = "0";
  badge.classList.remove("badge-verified--settled");
  badge.classList.remove("badge-verified--blam");
  window.requestAnimationFrame(() => {
    badge.classList.add("badge-verified--blam");
  });
  window.setTimeout(() => {
    badge.classList.remove("badge-verified--blam");
    badge.classList.add("badge-verified--settled");
  }, 520);
  window.setTimeout(() => {
    badge.classList.remove("badge-verified--settled");
  }, 1600);
}

function getVerifiedBadgeVariantClass(club) {
  const seed = (club && (club.displayCity || club.city || "")) || "";
  const total = seed.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const variants = [
    "badge-verified--seal",
    "badge-verified--stamp",
    "badge-verified--spark",
  ];
  return variants[total % variants.length];
}

function createTimetableModule(club) {
  const noteLabel = compactText(club && club.locationNote);
  const noteDetail = compactText(club && club.locationNoteDetail);
  const nextOccurrence = getNextOccurrenceLabel(club);
  const startLabel = getStartsAtLabel(club);
  const scheduleLabel = noteLabel || (nextOccurrence ? "Next occurrence >" : compactText(club && club.scheduleLabel));
  const detailText = noteDetail || nextOccurrence || startLabel;

  if (!scheduleLabel) return null;

  const wrap = document.createElement("div");
  wrap.className = "card-timetable";

  if (scheduleLabel) {
    const day = document.createElement("div");
    day.className = "card-timetable-day";
    day.textContent = scheduleLabel;
    wrap.append(day);
  }

  if (detailText) {
    const detail = document.createElement("div");
    detail.className = "card-timetable-detail";
    detail.textContent = detailText;
    wrap.append(detail);
  }

  return wrap;
}

function getNextOccurrenceLabel(club) {
  const dates = (club && club.specificDates) || [];
  if (!dates.length) return "";
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const next = dates
    .map((value) => parseISODateAtNoon(compactText(value)))
    .filter(Boolean)
    .find((date) => date >= today);

  if (!next) return "";

  return next.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function getStartsAtLabel(club) {
  if (!club || !club.isNight) return "";
  const timeLabel = getClubTimeLabel(club);
  return timeLabel ? `Starts @ ${timeLabel}` : "";
}

function createFlyerCallout(club) {
  if (!club || !club.flyerURL) return null;

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "card-flyer-callout";
  btn.setAttribute("aria-label", `Share the ${getDisplayCity(club)} flyer`);

  const copy = document.createElement("span");
  copy.className = "card-flyer-copy";

  const title = document.createElement("span");
  title.className = "card-flyer-title";
  title.textContent = "Share Flyer";

  copy.append(title);
  btn.append(copy);

  btn.addEventListener("click", async (event) => {
    event.stopPropagation();
    const mine = {
      city: getDisplayCity(club),
      url: club.flyerURL,
      venue: club.venue || "",
      scheduleLabel: club.scheduleLabel || "",
      eventTime: club.eventTime || "",
    };
    // Same feed as the Frequent Fly-Ers wall: full manifest, newest first,
    // with this club's flyer up front. Club-derived list is the fallback.
    let items = (await fetchFlyerWallManifestItems())
      .slice()
      .sort((a, b) => String(b.flyerDate || "").localeCompare(String(a.flyerDate || "")));
    if (!items.length) items = getPreferredFlyerGalleryItems();
    if (!items.some((item) => item.url === mine.url)) {
      items = [mine].concat(items);
    }
    openFlyerCollection(items, mine);
  });

  return btn;
}

async function fetchBlobFlyerItems() {
  try {
    const res = await fetch("/.netlify/functions/get-public-flyers?limit=60&excludeSubstack=1");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return (data.items || [])
      .filter((f) => f.key && f.club && f.club !== "Unknown")
      .map((f) => ({
        city: f.club,
        url: `/.netlify/functions/get-flyer?key=${encodeURIComponent(f.key)}`,
        key: f.key,
        flyerDate: f.flyerDate || f.uploadedAt || null,
      }));
  } catch (_) {
    return [];
  }
}

async function renderFlyerFeature(items) {
  if (!flyerFeature || !flyerFeatureTitle || !flyerFeatureText || !flyerFeatureButton) return;

  const [blobItems, wallItems] = await Promise.all([
    fetchBlobFlyerItems(),
    fetchFlyerWallManifestItems(),
  ]);
  const fallbackItems = getPreferredFlyerGalleryItems(items);
  const flyerItems = blobItems.length ? blobItems : (wallItems.length ? wallItems : fallbackItems);
  const featuredFlyer = getFlyerFeatureLead(flyerItems);

  flyerFeatureTitle.textContent = flyerItems.length
    ? getFlyerFeatureHeadline(flyerItems)
    : "Latest flyers from clubs worldwide.";
  flyerFeatureText.textContent = "";
  flyerFeatureText.hidden = true;
  flyerFeatureButton.textContent = "View Fly-er Wall";
  flyerFeatureButton.onclick = () => {
    window.location.href = getFlyerPageHref(featuredFlyer ? featuredFlyer.city : "");
  };
  flyerFeature.hidden = false;
}

function getLatestHappeningsHref(cityName = "") {
  const base = "./what-we-talked-about.html";
  const city = compactText(cityName);
  const params = new URLSearchParams();
  if (city) params.set("city", city);
  params.set("mode", "polaroid");
  return `${base}?${params.toString()}`;
}

async function loadLatestHappeningsRegistry() {
  if (sharedLoadLatestHappeningsRegistry) return sharedLoadLatestHappeningsRegistry();
  return new Set();
}

function clubHasLatestHappenings(club) {
  if (sharedClubHasLatestHappenings) return sharedClubHasLatestHappenings(club);
  return false;
}

function renderLatestHappeningsButton(club) {
  if (sharedRenderLatestHappeningsButton) return sharedRenderLatestHappeningsButton(club);
  const link = document.createElement("a");
  link.className = "card-latest-happenings-btn";
  link.href = getLatestHappeningsHref(getDisplayCity(club));
  link.innerHTML =
    '<span class="card-latest-happenings-btn__badge" aria-hidden="true">NEW</span>' +
    '<span class="card-latest-happenings-btn__label">Latest happenings...</span>';
  return link;
}

function renderDayNav(items) {
  const countByDay = new Map(DAYS.map((day) => [day, 0]));
  items.forEach((club) => {
    const displayDay = getDisplayDayForClub(club);
    countByDay.set(displayDay, (countByDay.get(displayDay) || 0) + 1);
  });

  if (daysNav) daysNav.innerHTML = "";

  DAYS.forEach((day) => {
    if ((countByDay.get(day) || 0) === 0) return;
    const dayLabel =
      day === "Every now and again" ? "Every now + again" : day.slice(0, 3);
    const fullLabel =
      day === "Every now and again"
        ? `Every now + again (${countByDay.get(day)})`
        : `${day} (${countByDay.get(day)})`;
    const railLink = document.createElement("a");
    railLink.href = `#day-${slugify(day)}`;
    railLink.className = "day-chip";
    railLink.textContent = `${dayLabel} (${countByDay.get(day)})`;
    if (daysNav) daysNav.append(railLink);
  });

  renderMobileResourcesMenu(countByDay);
}

function appendMobileMenuSection(title, items) {
  if (!mobileResourcesBody || !items.length) return;

  const section = document.createElement("div");
  section.className = "mobile-resources-section";

  const heading = document.createElement("p");
  heading.className = "mobile-resources-heading";
  heading.textContent = title;
  section.append(heading);

  items.forEach((item) => section.append(item));
  mobileResourcesBody.append(section);
}

function renderMobileResourcesMenu(countByDay) {
  if (!mobileResourcesBody) return;
  mobileResourcesBody.innerHTML = "";

  const dayItems = [];
  DAYS.forEach((day) => {
    const count = countByDay.get(day) || 0;
    if (!count) return;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "mobile-day-link";
    btn.dataset.dayTarget = `day-${slugify(day)}`;
    btn.textContent =
      day === "Every now and again"
        ? `Every now + again (${count})`
        : `${day} (${count})`;
    dayItems.push(btn);
  });
  appendMobileMenuSection("Pick a Day", dayItems);
}

function syncActiveDayLink() {
  const sections = Array.from(document.querySelectorAll(".day-section[id]"));
  if (!sections.length) return;

  const threshold = window.innerWidth <= 820 ? 120 : 140;
  let activeSection = sections[0];

  sections.forEach((section) => {
    if (section.getBoundingClientRect().top <= threshold) {
      activeSection = section;
    }
  });

  const activeHash = `#${activeSection.id}`;
  document
    .querySelectorAll('.day-chip, .mobile-day-link')
    .forEach((link) => {
      if (link instanceof HTMLAnchorElement) {
        link.classList.toggle("is-active", link.getAttribute("href") === activeHash);
        return;
      }
      if (link instanceof HTMLButtonElement) {
        link.classList.toggle("is-active", link.getAttribute("data-day-target") === activeHash.slice(1));
      }
    });
}

function createClubCard(club) {
  const card = document.createElement("article");
  card.className = "club-card";
  if (club.isNight) card.classList.add("night-edition");
  if (club.isActive === false) card.classList.add("inactive-card");

  const displayCity = getDisplayCity(club);
  card.dataset.city = (club.city || "").toLowerCase().trim();
  card.dataset.displayCity = displayCity;

  const isOriginal = normalize(club.city).replace(/[\u2014\u2013]/g, "-") === "new york - williamsburg";
  if (isOriginal) card.classList.add("flagship-card");

  card.append(createClubUpdateModule(club));

  const titleRow = document.createElement("div");
  titleRow.className = "card-title-row";

  if (club.isActive === false) {
    const inactiveBadge = document.createElement("span");
    inactiveBadge.className = "badge badge-inactive-sticker";
    inactiveBadge.textContent = "Inactive";
    inactiveBadge.setAttribute("aria-label", "Inactive");
    titleRow.append(inactiveBadge);
  }

  const verifiedBadge = createVerifiedBadge(club);
  if (verifiedBadge) titleRow.append(verifiedBadge);

  const cityEl = document.createElement("span");
  cityEl.className = "city-name";
  if (isOriginal) cityEl.classList.add("original-bc");
  cityEl.textContent = displayCity;
  titleRow.append(cityEl);

  const titleBadges = createTitleBadges(club);
  if (titleBadges) titleRow.append(titleBadges);

  card.append(titleRow);

  const timetable = createTimetableModule(club);
  if (timetable) card.append(timetable);

  const location = document.createElement("div");
  location.className = "card-location";
  location.textContent = club.venue || "Location TBD";
  card.append(location);

  if (club.hostDisplay) {
    const host = document.createElement("div");
    host.className = "card-host";
    host.append(document.createTextNode("Host: "));
    host.append(renderHostText(club.hostDisplay, club.instagramURL, club.linkedinURL));
    card.append(host);
  }

  const subline = document.createElement("div");
  subline.className = "card-subline";

  if (club.locationNote && !club.locationNoteDetail) {
    const locBadge = document.createElement("span");
    locBadge.className = "badge badge-location";
    locBadge.textContent = club.locationNote;
    subline.append(locBadge);
  }

  if (subline.childNodes.length) card.append(subline);

  const confirmationNote = getClubConfirmationNote(club);
  if (confirmationNote) {
    const note = document.createElement("p");
    note.className = "card-confirmation-note";
    note.textContent = confirmationNote;
    card.append(note);
  }

  if (club.locationNoteDetail && !club.locationNote) {
    card.append(createLocationNoteBody(club.locationNote, club.locationNoteDetail));
  }

  const util = document.createElement("div");
  util.className = "card-utility";

  if (clubHasLatestHappenings(club)) {
    util.append(renderLatestHappeningsButton(club));
  }

  if (club.venue) {
    util.append(renderMapIcon(
      getMapURL(`${club.venue}, ${club.city}`),
      `Open ${club.venue} in Google Maps`,
    ));
  }

  if (club.instagramItems && club.instagramItems.length > 1) {
    util.append(renderSocialMenu("instagram", club.instagramItems));
  } else if (club.instagramURL) {
    util.append(renderSocialIcon(
      "instagram",
      club.instagramURL,
      `Open ${club.city} on Instagram`,
    ));
  }

  if (club.linkedInItems && club.linkedInItems.length > 1) {
    util.append(renderSocialMenu("linkedin", club.linkedInItems));
  } else if (club.linkedinURL) {
    util.append(renderSocialIcon(
      "linkedin",
      club.linkedinURL,
      `Open ${club.city} host on LinkedIn`,
    ));
  }

  // Share Flyer sits at the right end of the utility row, same line as the
  // other buttons (sized as a chip via .card-utility .card-flyer-callout).
  const flyerCallout = createFlyerCallout(club);
  if (flyerCallout) util.append(flyerCallout);

  if (util.children.length) card.append(util);

  return card;
}

function render(items) {
  clubsList.innerHTML = "";
  void renderFlyerFeature(clubs);

  const activeItems = items.filter((club) => club.isActive !== false);
  const inactiveItems = items.filter((club) => club.isActive === false);

  if (!activeItems.length && !inactiveItems.length) {
    clubsList.innerHTML = "<p class='status'>No clubs match this search.</p>";
    daysNav.innerHTML = "";
    return;
  }

  renderDayNav(activeItems);

  DAYS.forEach((day) => {
    const dayItems = activeItems
      .filter((club) => getDisplayDayForClub(club) === day)
      .sort((a, b) => {
        if (isClubConfirmedThisWeek(a) !== isClubConfirmedThisWeek(b)) {
          return Number(isClubConfirmedThisWeek(b)) - Number(isClubConfirmedThisWeek(a));
        }
        const timeDelta = getTimeSortValue(getClubTimeLabel(a)) - getTimeSortValue(getClubTimeLabel(b));
        if (Number.isFinite(timeDelta) && timeDelta !== 0) return timeDelta;
        if (a.isVerified !== b.isVerified) return Number(b.isVerified) - Number(a.isVerified);
        return getDisplayCity(a).localeCompare(getDisplayCity(b));
      });
    if (!dayItems.length) return;

    const section = document.createElement("section");
    section.className = "day-section";
    if (day === "Every now and again") section.classList.add("day-section--wide");
    else section.classList.add("day-section--stacked-times");
    section.id = `day-${slugify(day)}`;

    const heading = document.createElement("h3");
    heading.textContent = day;
    section.append(heading);

    if (day === "Every now and again") {
      const dayGrid = document.createElement("div");
      dayGrid.className = "day-section-grid";
      dayItems.forEach((club) => dayGrid.append(createClubCard(club)));
      section.append(dayGrid);
      clubsList.append(section);
      return;
    }

    const slotMap = new Map();
    dayItems.forEach((club) => {
      const timeLabel = getClubTimeLabel(club) || "Time TBD";
      if (!slotMap.has(timeLabel)) slotMap.set(timeLabel, []);
      slotMap.get(timeLabel).push(club);
    });

    Array.from(slotMap.entries())
      .sort((a, b) => getTimeSortValue(a[0]) - getTimeSortValue(b[0]))
      .forEach(([timeLabel, slotItems]) => {
        const slotGroup = document.createElement("div");
        slotGroup.className = "time-slot-group";
        if (slotItems.length >= 3) slotGroup.classList.add("time-slot-group--wide");

        const slotHeading = document.createElement("h4");
        slotHeading.className = "time-slot-heading";
        slotHeading.textContent = timeLabel;
        slotGroup.append(slotHeading);

        const slotGrid = document.createElement("div");
        slotGrid.className = "day-section-grid";
        if (slotItems.length === 1) slotGrid.classList.add("day-section-grid--single");
        slotItems.forEach((club) => slotGrid.append(createClubCard(club)));
        slotGroup.append(slotGrid);
        section.append(slotGroup);
      });

    clubsList.append(section);
  });

  if (inactiveItems.length) {
    const inactiveSection = document.createElement("section");
    inactiveSection.className = "day-section inactive-section";
    inactiveSection.id = "inactive-clubs";

    const heading = document.createElement("h3");
    heading.textContent = "Inactive Clubs";
    inactiveSection.append(heading);

    const intro = document.createElement("p");
    intro.className = "inactive-section-copy";
    intro.textContent = "These clubs are marked inactive in the main sheet right now.";
    inactiveSection.append(intro);

    const grid = document.createElement("div");
    grid.className = "day-section-grid";
    inactiveItems
      .slice()
      .sort((a, b) => getDisplayCity(a).localeCompare(getDisplayCity(b)))
      .forEach((club) => grid.append(createClubCard(club)));
    inactiveSection.append(grid);
    clubsList.append(inactiveSection);
  }

  requestAnimationFrame(syncActiveDayLink);
}

function normalize(value) {
  if (sharedNormalize) return sharedNormalize(value || "");
  return value.toLowerCase().trim();
}

function isAffirmative(value) {
  return /^(yes|true|1)$/i.test((value || "").trim());
}

function animateGrowthTitle(clubCount, suffix = GROWTH_TITLE_SUFFIX) {
  const finalCount = Math.max(0, Number(clubCount) || 0);
  if (!siteTitle) return;

  if (growthTitleTimer) {
    cancelAnimationFrame(growthTitleTimer);
    growthTitleTimer = null;
  }

  let current = 1;
  const durationMs = 1200;
  const start = performance.now();

  siteTitle.classList.remove("growth-title");
  siteTitle.classList.add("counting");
  siteTitle.innerHTML = `<span class="growth-count">${current}</span> ${suffix}`;

  const tick = (now) => {
    const elapsed = now - start;
    const progress = Math.min(1, elapsed / durationMs);
    const eased = 1 - (1 - progress) * (1 - progress);
    const next = Math.max(1, Math.round(1 + (finalCount - 1) * eased));

    if (next !== current) {
      current = next;
      siteTitle.innerHTML = `<span class="growth-count">${current}</span> ${suffix}`;
    }

    if (progress < 1) {
      growthTitleTimer = requestAnimationFrame(tick);
      return;
    }

    siteTitle.classList.remove("counting");
    siteTitle.innerHTML = `<span class="growth-count">${finalCount}</span> ${suffix}`;
    growthTitleTimer = null;
  };

  growthTitleTimer = requestAnimationFrame(tick);
}

function setupMobileResourcesToggle() {
  if (!mobileResourcesToggle || !mobileResourcesBody) return;

  function closeAreaDropdown() {
    document.querySelectorAll(".region-mobile-dropdown").forEach((dropdown) => {
      if (dropdown instanceof HTMLDetailsElement) dropdown.open = false;
    });
  }

  function closeMobileDayPicker() {
    mobileResourcesToggle.setAttribute("aria-expanded", "false");
    mobileResourcesBody.hidden = true;
  }

  mobileResourcesToggle.addEventListener("click", () => {
    const expanded =
      mobileResourcesToggle.getAttribute("aria-expanded") === "true";
    if (!expanded) closeAreaDropdown();
    mobileResourcesToggle.setAttribute("aria-expanded", String(!expanded));
    mobileResourcesBody.hidden = expanded;
  });

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Node)) return;
    if (mobileResourcesToggle.contains(target) || mobileResourcesBody.contains(target)) return;
    closeMobileDayPicker();
  });
}

function setupDayJumpLinks() {
  function closeMobileDayPicker() {
    if (!mobileResourcesToggle || !mobileResourcesBody) return;
    mobileResourcesToggle.setAttribute("aria-expanded", "false");
    mobileResourcesBody.hidden = true;
  }

  function jumpToDaySection(target, targetId, shouldUpdateHash) {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const offset = window.innerWidth <= 960 ? 112 : 132;

    const performJump = () => {
      target.scrollIntoView({
        behavior: prefersReducedMotion ? "auto" : "smooth",
        block: "start",
      });

      window.setTimeout(() => {
        const targetTop = window.scrollY + target.getBoundingClientRect().top - offset;
        window.scrollTo({
          top: Math.max(0, targetTop),
          left: 0,
          behavior: prefersReducedMotion ? "auto" : "smooth",
        });
      }, prefersReducedMotion ? 0 : 40);

      window.setTimeout(() => {
        target.scrollIntoView({
          behavior: "auto",
          block: "start",
        });
        const targetTop = window.scrollY + target.getBoundingClientRect().top - offset;
        window.scrollTo(0, Math.max(0, targetTop));
        syncActiveDayLink();
      }, prefersReducedMotion ? 0 : 220);
    };

    if (shouldUpdateHash) {
      history.replaceState(null, "", `#${targetId}`);
    }
    requestAnimationFrame(() => {
      requestAnimationFrame(performJump);
    });
  }

  function handleDayJump(event) {
    const origin = event.target instanceof Element
      ? event.target.closest('[data-day-target], a[href^="#day-"]')
      : null;
    if (!(origin instanceof Element)) return;

    const targetId = origin instanceof HTMLAnchorElement
      ? (origin.getAttribute("href") || "").replace(/^#/, "")
      : origin.getAttribute("data-day-target") || "";
    if (!targetId) return;

    const target = document.getElementById(targetId);
    if (!target) return;

    event.preventDefault();
    if (mobileResourcesToggle && mobileResourcesBody && origin instanceof HTMLButtonElement) {
      closeMobileDayPicker();
    }
    jumpToDaySection(target, targetId, origin instanceof HTMLAnchorElement);
  }

  if (daysNav) {
    daysNav.addEventListener("click", handleDayJump);
  }

  if (mobileResourcesBody) {
    mobileResourcesBody.addEventListener("click", handleDayJump);
  }

  window.addEventListener("scroll", syncActiveDayLink, { passive: true });
  window.addEventListener("resize", syncActiveDayLink);
}

function setupBackToTop() {
  if (!backToTopBtn) return;

  function scrollToPageTop() {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, left: 0, behavior: prefersReducedMotion ? "auto" : "smooth" });

    window.setTimeout(() => {
      if (window.scrollY > 2) {
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
      }
    }, prefersReducedMotion ? 0 : 450);
  }

  function syncBackToTop() {
    const shouldShow = window.innerWidth <= 960 && window.scrollY > 240;
    backToTopBtn.hidden = !shouldShow;
    backToTopBtn.classList.toggle("is-visible", shouldShow);
  }

  backToTopBtn.addEventListener("click", () => {
    scrollToPageTop();
  });

  window.addEventListener("scroll", syncBackToTop, { passive: true });
  window.addEventListener("resize", syncBackToTop);
  syncBackToTop();
}

function getFilteredClubs() {
  const scoped =
    activeRegion === "All"
      ? clubs
      : activeRegion === "New"
        ? clubs.filter((c) => c.isNew)
        : clubs.filter((c) => c.region === activeRegion);

  return scoped;
}

const REGION_HEADLINES = {
  "All": "Coming up this week around the world",
  "New": "New clubs on the map",
  "Northeast US": "Coming up this week in the northeast",
  "Southeast US": "Coming up this week in the South (roughly)",
  "West Coast": "Coming up this week on the West Coast \uD83E\uDD18",
  "Australia": "Coming up this week in Aus (it's tomorrow, there!)",
  "UK": "Coming up this week in The UK (mate!)",
  "Other": "Coming up this week wherever else",
  "Europe": "Coming up in Europe (not including UK because... yeah)",
};

function setRegion(region) {
  activeRegion = region;
  document.querySelectorAll(".region-pill").forEach((pill) => {
    pill.classList.toggle("active", pill.dataset.region === region);
  });
  if (regionHeadline) {
    regionHeadline.textContent = window.innerWidth <= 960
      ? "Coming up This Week"
      : (REGION_HEADLINES[region] || `Coming up this week in ${region}`);
  }
  const filtered = getFilteredClubs();
  render(filtered);
  const suffix = activeRegion === "All"
    ? GROWTH_TITLE_SUFFIX
    : activeRegion === "New"
      ? "new clubs"
      : "clubs coming up this month";
  animateGrowthTitle(filtered.length, suffix);
  // Update word cloud topics to match selected region
  if (typeof window.updateWordCloud === "function") {
    window.updateWordCloud(region);
  }
}

function renderRegionFilter() {
  if (!regionFilter) return;
  regionFilter.innerHTML = "";

  if (window.innerWidth <= 960) {
    ["All", "New"].forEach((region) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "region-pill" + (region === activeRegion ? " active" : "");
      if (region === "New") btn.classList.add("region-pill-new");
      btn.dataset.region = region;
      btn.textContent = region === "New" ? "NEW" : region;
      btn.addEventListener("click", () => setRegion(region));
      regionFilter.append(btn);
    });

    const areaWrap = document.createElement("details");
    areaWrap.className = "region-mobile-dropdown";
    if (!["All", "New"].includes(activeRegion)) areaWrap.open = false;

    areaWrap.addEventListener("toggle", () => {
      if (!areaWrap.open) return;
      if (mobileResourcesToggle && mobileResourcesBody) {
        mobileResourcesToggle.setAttribute("aria-expanded", "false");
        mobileResourcesBody.hidden = true;
      }
      document.querySelectorAll(".region-mobile-dropdown").forEach((dropdown) => {
        if (dropdown !== areaWrap && dropdown instanceof HTMLDetailsElement) {
          dropdown.open = false;
        }
      });
    });

    const summary = document.createElement("summary");
    summary.className = "region-mobile-summary";
    summary.textContent = "By Area";
    areaWrap.append(summary);

    const menu = document.createElement("div");
    menu.className = "region-mobile-menu";

    REGION_ORDER.forEach((region) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "region-mobile-option" + (region === activeRegion ? " is-active" : "");
      btn.dataset.region = region;
      btn.textContent = region === "New" ? "NEW" : region;
      btn.addEventListener("click", () => {
        setRegion(region);
        areaWrap.open = false;
      });
      menu.append(btn);
    });

    areaWrap.append(menu);
    regionFilter.append(areaWrap);
    return;
  }

  ["All", "New", ...REGION_ORDER].forEach((region) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "region-pill" + (region === activeRegion ? " active" : "");
    if (region === "New") btn.classList.add("region-pill-new");
    btn.dataset.region = region;
    btn.textContent = region === "New" ? "NEW" : region;
    btn.addEventListener("click", () => setRegion(region));
    regionFilter.append(btn);
  });
}

async function loadClubs() {
  try {
    if (sharedLoadLiveClubOverrides) {
      await sharedLoadLiveClubOverrides();
    }
    await loadLatestHappeningsRegistry();
    const { rows, usedLocalSnapshot } = await fetchSheetRows();
    const { col } = createSheetAccess(rows);

    clubs = rows
      .slice(1)
      .map((cells) => {
        const city = col("city", cells);
        const override = getOverrideForCity(city);
        const isActive = (col("active", cells) || "yes").toLowerCase() !== "no";
        const cadence = override.cadence || (isActive ? col("frequency", cells) : "Every now and again") || "";
        const sheetUpcomingDate = parseSheetUpcomingDate(col("upcoming_date", cells));
        const rawTime = override.time || col("start_time", cells) || "";
        const time = formatTimeLabel(rawTime);
        const extraSocials = override.extraSocials || [];
        const igHandles = override.hideInstagram ? [] : extractInstagramHandles(col("host_instagram", cells));
        const instagramItems = override.hideInstagram ? [] : buildInstagramSocialItems(igHandles, extraSocials);
        const linkedInItems = buildLinkedInSocialItems(
          [col("host_linkedin", cells), col("host_linkedin_2", cells)],
          extraSocials,
          override.linkedinURL || "",
          col("host_name", cells) || override.hostDisplay || "",
        );

        return {
          city,
          region: CITY_REGION[city.toLowerCase().trim()] || "",
          displayCity: override.displayCity || city,
          isActive,
          featured: override.featured ?? isAffirmative(col("featured", cells)),
          isNew: override.isNew ?? isAffirmative(col("is_new", cells)),
          cadence,
          time,
          scheduleLabel: extractScheduleLabel(cadence, rawTime),
          venue: override.venue || getVenue(col("venue_name", cells), ""),
          day: getDay(cadence, rawTime),
          isNight: isNightClub(rawTime || time, override.isNight),
          specificDates: override.specificDates || (sheetUpcomingDate ? [sheetUpcomingDate] : []),
          isVerified: override.verified ?? Boolean((override.specificDates || (sheetUpcomingDate ? [sheetUpcomingDate] : [])).length),
          locationNote: override.locationNote || "",
          instagramURL: instagramItems[0]?.url || "",
          instagramItems,
          linkedinURL: linkedInItems[0]?.url || "",
          linkedInItems,
          flyerURL: override.flyerURL || normalizeFlyer(col("flyer_url", cells)),
          extraSocials: extraSocials.filter((item) => item && !["instagram", "linkedin"].includes(item.type)),
          hostDisplay: formatHostDisplay(
            col("host_name", cells),
            igHandles,
            override.hostDisplay || "",
          ),
          upcoming_date: sheetUpcomingDate || "",
          eventTime: override.eventTime || rawTime,
          eventTimeLabel: override.eventTimeLabel || "",
          communityLink: override.communityLink || col("whatsapp", cells) || "",
          locationNoteDetail: override.locationNoteDetail || "",
          isIncomplete:
            !getVenue(override.venue || col("venue_name", cells), "") ||
            (!extractInstagramURL(col("host_instagram", cells)) &&
              !(
                override.linkedinURL ||
                extractLinkedInURL(col("host_linkedin", cells), col("host_linkedin_2", cells))
              ) &&
              !(override.extraSocials || []).length),
        };
      })
      .filter((club) => club.city && !shouldHideClub(club.city));

    const staticEntries = (window.STATIC_CLUBS || [])
      .filter((s) => s.city && !shouldHideClub(s.city))
      .map((s) => {
        const extraSocials = s.extraSocials || [];
        const instagramItems = buildInstagramSocialItems([], extraSocials);
        const linkedInItems = buildLinkedInSocialItems([], extraSocials, s.linkedinURL || "", s.hostDisplay || "");
        return {
          ...s,
          isActive: true,
          featured: false,
          isVerified: Boolean((s.specificDates || []).length),
          scheduleLabel: s.cadence || "",
          day: "",
          locationNote: s.locationNote || "",
          instagramURL: instagramItems[0]?.url || "",
          instagramItems,
          linkedinURL: linkedInItems[0]?.url || s.linkedinURL || "",
          linkedInItems,
          extraSocials: extraSocials.filter((item) => item && !["instagram", "linkedin"].includes(item.type)),
          upcoming_date: (s.specificDates || [])[0] || "",
          eventTimeLabel: "",
          communityLink: "",
          locationNoteDetail: "",
          isIncomplete: false,
        };
      });
    clubs = clubs.concat(staticEntries);
    await applyManifestFlyers(clubs);

    statusText.textContent = usedLocalSnapshot ? "(local sheet snapshot)" : "";
    flyerGalleryItems = getFlyerGalleryItems();
    const filtered = getFilteredClubs();
    animateGrowthTitle(filtered.length);
    renderRegionFilter();
    render(filtered);
  } catch (error) {
    // Sheet unavailable — try static JSON fallback (useful for local dev)
    try {
      const fallbackRes = await fetch("./data/clubs-map.json");
      if (!fallbackRes.ok) throw new Error("fallback unavailable");
      const data = await fallbackRes.json();
      clubs = data
        .map((entry) => ({
          city:          entry.city || "",
          region:        entry.region || CITY_REGION[(entry.city || "").toLowerCase().trim()] || "",
          displayCity:   entry.displayCity || entry.city || "",
          cadence:       "",
          time:          "",
          scheduleLabel: "",
          venue:         entry.venue || "",
          day:           (["Monday","Tuesday","Wednesday","Thursday","Friday"][((entry.schedule || {}).weekday || 1) - 1]) || "Every now and again",
          isNight:       false,
          specificDates: [],
          isVerified: false,
          locationNote:  "",
          host:          entry.host || "",
          whatsapp:      "",
          mapURL:        entry.mapsURL || "",
          igHandles:     [],
          upcoming_date: entry.upcoming_date || "",
          eventTime:     "",
          eventTimeLabel:"",
          locationNoteDetail: "",
          flyer:         null,
        }))
        .filter((c) => c.city && !shouldHideClub(c.city));
      statusText.textContent = "(offline – showing cached data)";
      flyerGalleryItems = [];
      animateGrowthTitle(clubs.length);
      renderRegionFilter();
      render(clubs);
    } catch (_) {
      statusText.textContent = "Could not load clubs right now.";
      clubsList.innerHTML = "";
    }
  }
}

searchInput.addEventListener("input", () => {
  const term = normalize(searchInput.value);
  const base = getFilteredClubs();

  if (!term) {
    render(base);
    return;
  }

  const filtered = base.filter((club) => {
    return normalize(
      `${club.city} ${club.displayCity || ""} ${club.cadence} ${club.time} ${club.venue || ""}`,
    ).includes(term);
  });

  render(filtered);
});

// ── Featured event strip ──────────────────────────────────────────────────────

function renderFeaturedEvent(items) {
  const strip = document.querySelector("#featured-event");
  if (!strip) return;

  const featured = items.find((club) => {
    const override = getOverrideForCity(club.city);
    return override.featured;
  });
  if (!featured) return;

  const displayCity = getDisplayCity(featured);
  const dateStr = featured.specificDates && featured.specificDates[0]
    ? new Date(featured.specificDates[0] + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
    : "";

  strip.innerHTML = "";

  const info = document.createElement("div");
  info.className = "featured-info";

  const label = document.createElement("div");
  label.className = "featured-label";
  label.textContent = "This Weekend";
  info.append(label);

  const city = document.createElement("div");
  city.className = "featured-city";
  city.textContent = displayCity;
  info.append(city);

  if (featured.locationNote) {
    const badge = document.createElement("span");
    badge.className = "badge badge-location featured-badge";
    badge.textContent = featured.locationNote;
    info.append(badge);
  }

  if (dateStr || featured.time) {
    const when = document.createElement("div");
    when.className = "featured-meta";
    when.textContent = [dateStr, featured.time].filter(Boolean).join(" · ");
    info.append(when);
  }

  if (featured.venue) {
    const venue = document.createElement("div");
    venue.className = "featured-meta";
    venue.textContent = featured.venue;
    info.append(venue);
  }

  const actions = document.createElement("div");
  actions.className = "featured-actions";

  if (featured.venue) {
    const mapsBtn = document.createElement("a");
    mapsBtn.href = getMapURL(`${featured.venue}, ${featured.city}`);
    mapsBtn.target = "_blank";
    mapsBtn.rel = "noreferrer";
    mapsBtn.textContent = "Google Maps";
    mapsBtn.className = "featured-action-btn";
    actions.append(mapsBtn);
  }

  info.append(actions);
  strip.append(info);

  strip.hidden = false;
}

// Flyer overlay lives in js/flyer-lightbox.js (shared, with the Easy to Share
// bar). The legacy in-file lightbox was removed: a top-level `function
// openFlyerLightbox()` declaration overwrites the shared window global at
// load time (hoisting), which silently brought the old share-less modal back.

// ── Init ──────────────────────────────────────────────────────────────────────

loadSiteCopy();
setupMobileResourcesToggle();
setupDayJumpLinks();
setupBackToTop();
loadClubs();

if (calendarViewLink) {
  calendarViewLink.addEventListener("click", () => {
    if (window.BKAnalytics) {
      window.BKAnalytics.track("open_calendar_view", {
        source: "left_rail_link",
      });
    }
  });
}

// ── Pop-Up Strip ──────────────────────────────────────────────────────────────

(function () {
  const strip = document.getElementById("popup-strip");
  const grid = document.getElementById("popup-strip-cards");
  const backdrop = document.getElementById("popup-drawer-backdrop");
  const drawer = document.getElementById("popup-drawer");
  const drawerClose = document.getElementById("popup-drawer-close");

  if (!strip || !grid || !backdrop || !drawer) return;

  // ── Fetch ──────────────────────────────────────────────────────────────────

  async function loadPopups() {
    try {
      const res = await fetch("/.netlify/functions/get-popups");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const items = (data.items || []);
      if (!items.length) return;
      renderStrip(items);
    } catch (_) {
      // Local-dev fallback: blobs only exist behind Netlify functions, so when
      // the function is unreachable (e.g. plain http.server) render the sample
      // manifest so the strip is still previewable. Never fires in production.
      try {
        const res = await fetch("./data/popups-sample.json");
        if (!res.ok) return;
        const data = await res.json();
        const items = (data.items || []);
        if (items.length) renderStrip(items);
      } catch (_e) {}
    }
  }

  // ── Render strip ──────────────────────────────────────────────────────────

  function renderStrip(items) {
    grid.innerHTML = "";
    // Ascending by event date — soonest first
    const sorted = [...items].sort((a, b) => {
      if (!a.date && !b.date) return 0;
      if (!a.date) return 1;
      if (!b.date) return -1;
      return a.date.localeCompare(b.date);
    });
    sorted.forEach((item) => grid.append(createPopupCard(item)));
    strip.hidden = false;
  }

  function createPopupCard(item) {
    const card = document.createElement("article");
    card.className = "popup-card";
    card.setAttribute("tabindex", "0");
    card.setAttribute("role", "button");
    card.setAttribute("aria-label", `View details: ${item.headline}`);

    const headline = document.createElement("div");
    headline.className = "popup-card-headline";
    headline.textContent = item.headline;
    card.append(headline);

    if (item.subheadline) {
      const sub = document.createElement("div");
      sub.className = "popup-card-subheadline";
      sub.textContent = item.subheadline;
      card.append(sub);
    }

    const meta = document.createElement("div");
    meta.className = "popup-card-meta";
    const parts = [];
    if (item.date) {
      const dateSpan = document.createElement("span");
      dateSpan.className = "popup-card-date";
      dateSpan.textContent = formatPopupDate(item.date);
      meta.append(dateSpan);
      if (item.time) meta.append(document.createTextNode(" · " + item.time));
    }
    card.append(meta);

    if (item.venue) {
      const venue = document.createElement("div");
      venue.className = "popup-card-venue";
      venue.textContent = item.venue;
      card.append(venue);
    }

    const cta = document.createElement("div");
    cta.className = "popup-card-cta";
    cta.textContent = "View details →";
    card.append(cta);

    card.addEventListener("click", () => openDrawer(item));
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openDrawer(item); }
    });

    return card;
  }

  function createTransitConnector(from, to) {
    const el = document.createElement("div");
    el.className = "popup-transit-connector";

    const fromLoc = [from.venue, from.city].filter(Boolean).join(", ");
    const toLoc   = [to.venue,   to.city  ].filter(Boolean).join(", ");
    const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(fromLoc)}&destination=${encodeURIComponent(toLoc)}&travelmode=transit`;

    const icon = document.createElement("span");
    icon.className = "popup-transit-icon";
    icon.textContent = "🚆";

    const label = document.createElement("span");
    label.className = "popup-transit-label";
    label.textContent = "…";

    const link = document.createElement("a");
    link.className = "popup-transit-link";
    link.href = mapsUrl;
    link.target = "_blank";
    link.rel = "noopener";
    link.textContent = "directions →";

    el.append(icon, label, link);

    // Lazily fetch estimate so it doesn't block initial render
    if (fromLoc && toLoc) {
      fetch(`/.netlify/functions/get-transit-estimate?from=${encodeURIComponent(fromLoc)}&to=${encodeURIComponent(toLoc)}`)
        .then(r => r.json())
        .then(data => {
          if (!data.feasible) {
            label.textContent = "different cities";
          } else if (data.minutes) {
            const hrs = Math.floor(data.minutes / 60);
            const mins = data.minutes % 60;
            const time = hrs > 0 ? `${hrs}h ${mins > 0 ? mins + "m" : ""}`.trim() : `${mins}m`;
            label.textContent = `~${time} by ${data.mode || "transit"}`;
          } else {
            label.textContent = "transit available";
          }
        })
        .catch(() => { label.textContent = "transit"; });
    }

    return el;
  }

  // ── Drawer ────────────────────────────────────────────────────────────────

  function openDrawer(item) {
    document.getElementById("popup-drawer-headline").textContent = item.headline;

    const sub = document.getElementById("popup-drawer-subheadline");
    if (item.subheadline) { sub.textContent = item.subheadline; sub.hidden = false; }
    else sub.hidden = true;

    const fields = document.getElementById("popup-drawer-fields");
    fields.innerHTML = "";

    const addField = (label, value, href) => {
      if (!value) return;
      const wrap = document.createElement("div");
      wrap.className = "popup-drawer-field";
      const lbl = document.createElement("div");
      lbl.className = "popup-drawer-label";
      lbl.textContent = label;
      const val = document.createElement("div");
      val.className = "popup-drawer-value";
      if (href) {
        const a = document.createElement("a");
        a.href = href; a.target = "_blank"; a.rel = "noopener";
        a.textContent = value;
        val.append(a);
      } else {
        val.textContent = value;
      }
      wrap.append(lbl, val);
      fields.append(wrap);
    };

    const dateTime = [item.date ? formatPopupDate(item.date) : null, item.time].filter(Boolean).join(" · ");
    addField("When", dateTime);
    addField("Where", item.venue, item.mapsURL || null);
    if (!item.venue && item.city) addField("City", item.city);
    if (item.host) addField("Hosted by", item.host, item.hostInstagramURL || null);

    const desc = document.getElementById("popup-drawer-description");
    if (item.description) { desc.textContent = item.description; desc.hidden = false; }
    else desc.hidden = true;

    // ── Actions: green "Share Flyer" (when a flyer exists) + correct Host/RSVP ──
    const rsvp = document.getElementById("popup-drawer-rsvp");

    // Host / RSVP destination — label reflects where it actually goes, per club.
    const hostUrl = item.rsvpURL || item.hostInstagramURL || "";
    const hostLabel = (() => {
      const s = hostUrl.toLowerCase();
      if (s.includes("luma") || s.includes("lu.ma")) return "RSVP on Luma";
      if (s.includes("eventbrite")) return "RSVP on Eventbrite";
      if (s.includes("partiful")) return "RSVP on Partiful";
      if (s.includes("instagram.com")) return "Contact Host";
      if (hostUrl) return "RSVP";
      return "Contact Host";
    })();
    rsvp.onclick = null;
    if (hostUrl) {
      // Only show the Host/RSVP button when there's a real link for this club.
      rsvp.textContent = hostLabel;
      rsvp.href = hostUrl;
      rsvp.target = "_blank";
      rsvp.rel = "noopener";
      rsvp.hidden = false;
    } else {
      // No host/RSVP link -> hide it. Never fall back to a personal IG.
      rsvp.hidden = true;
    }

    // Green "Share Flyer" button — one reused node, placed above the Host/RSVP
    // button. Routes to the SAME shared lightbox / Easy-to-Share modal that every
    // other Share Flyer button uses (openFlyerCollection -> openFlyerLightbox).
    let shareBtn = document.getElementById("popup-drawer-share");
    if (!shareBtn) {
      shareBtn = document.createElement("a");
      shareBtn.id = "popup-drawer-share";
      shareBtn.className = "popup-drawer-rsvp popup-drawer-share";
      shareBtn.href = "#";
      rsvp.parentNode.insertBefore(shareBtn, rsvp);
    }
    shareBtn.hidden = true;
    shareBtn.onclick = null;
    (async () => {
      try {
        const manifest = await fetchFlyerWallManifestItems();
        const key = normalizeFlyerCityKey(item.city || "");
        let mine = null;
        if (item.flyerURL) {
          mine = manifest.find((f) => f.url === item.flyerURL) ||
                 { city: item.city, url: item.flyerURL };
        }
        if (!mine && key) {
          const matches = manifest
            .filter((f) => normalizeFlyerCityKey(f.city) === key)
            .sort((a, b) => String(b.flyerDate || "").localeCompare(String(a.flyerDate || "")));
          if (matches.length) mine = matches[0];
        }
        if (!mine) return; // no flyer for this pop-up -> Host/RSVP button stands alone
        shareBtn.textContent = "Share Flyer";
        shareBtn.hidden = false;
        shareBtn.onclick = (e) => {
          e.preventDefault();
          let items = manifest
            .slice()
            .sort((a, b) => String(b.flyerDate || "").localeCompare(String(a.flyerDate || "")));
          if (!items.some((it) => it.url === mine.url)) items = [mine].concat(items);
          // Drawer (z 1101) sits above the lightbox (z 1000); dismiss it instantly so
          // the share modal isn't trapped behind it. Lightbox manages body scroll.
          backdrop.classList.remove("open");
          drawer.classList.remove("open");
          drawer.hidden = true;
          openFlyerCollection(items, mine);
        };
      } catch (_) { /* Host/RSVP button stands alone */ }
    })();

    drawer.hidden = false;
    requestAnimationFrame(() => {
      backdrop.classList.add("open");
      drawer.classList.add("open");
    });
    drawer.focus();
    document.body.style.overflow = "hidden";
  }

  function closeDrawer() {
    backdrop.classList.remove("open");
    drawer.classList.remove("open");
    drawer.addEventListener("transitionend", () => {
      drawer.hidden = true;
      document.body.style.overflow = "";
    }, { once: true });
  }

  drawerClose.addEventListener("click", closeDrawer);
  backdrop.addEventListener("click", closeDrawer);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && drawer.classList.contains("open")) closeDrawer();
  });

  // ── Helpers ───────────────────────────────────────────────────────────────

  function formatPopupDate(iso) {
    if (!iso) return "";
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("en-US", {
      weekday: "short", month: "short", day: "numeric", year: "numeric",
    });
  }

  // kick it off
  loadPopups();
})();
