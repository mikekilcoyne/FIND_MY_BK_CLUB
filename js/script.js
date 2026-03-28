const SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/1_4MoIXgSHjERztj0LPPC-XAa7nzFlfrdcjEQdBeSqto/export?format=csv&gid=105813476";
const LOCAL_SHEET_CSV_URL = "./data/clubs-sheet-local.csv";
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
const calendarViewLink = document.querySelector(".calendar-headline-link");
const mobileResourcesToggle = document.querySelector(".mobile-resources-toggle");
const mobileResourcesBody = document.querySelector("#mobile-resources-body");
const backToTopBtn = document.querySelector("#back-to-top");
let flyerGalleryItems = [];

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
  return normalize(city || "") === "austin" || normalize(city || "") === "austin, tx";
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

function cleanLocationValue(value) {
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
  return cleanLocationValue(location) || cleanLocationValue(addressInfo) || "";
}

function normalizeFlyer(url) {
  if (!url) return "";
  var match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (match) return "https://drive.google.com/uc?export=view&id=" + match[1];
  var match2 = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (match2) return "https://drive.google.com/uc?export=view&id=" + match2[1];
  return url;
}

function extractInstagramURL(value) {
  const handles = extractInstagramHandles(value);
  if (!handles.length) return "";
  const handle = handles[0].replace(/^@/, "");
  if (!handle) return "";
  return `https://www.instagram.com/${handle}/`;
}

function extractInstagramHandles(value) {
  const raw = (value || "").trim();
  if (!raw) return [];
  const matches = raw.match(/@[A-Za-z0-9._]+/g) || [];
  return [...new Set(matches)];
}

function formatHostDisplay(hostName, handles, overrideHostDisplay) {
  if (overrideHostDisplay) return overrideHostDisplay;
  const cleanName = (hostName || "").trim();
  if (cleanName) {
    return cleanName
      .split(/\s*[,+]\s*|\s+and\s+/i)
      .map((s) => s.trim())
      .filter(Boolean)
      .join(" & ");
  }
  return handles.join(" | ");
}

function extractLinkedInURL(...values) {
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
  if (lower.includes("second monday") || lowerC.includes("second monday")) return "Second Monday";
  if (lower.includes("second thursday") || lowerC.includes("second thursday")) return "Second Thursday";
  if (lower.includes("third friday") || lowerC.includes("third friday")) return "Third Friday";
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

function getFlyerGalleryItems() {
  const seen = new Set();
  return clubs
    .filter((club) => club && club.flyerURL)
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

function renderHostText(text) {
  return document.createTextNode(text || "");
}

function renderDayNav(items) {
  const countByDay = new Map(DAYS.map((day) => [day, 0]));
  items.forEach((club) => {
    countByDay.set(club.day, (countByDay.get(club.day) || 0) + 1);
  });

  if (daysNav) daysNav.innerHTML = "";
  if (mobileResourcesBody) mobileResourcesBody.innerHTML = "";

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

    if (mobileResourcesBody) {
      const mobileLink = document.createElement("button");
      mobileLink.type = "button";
      mobileLink.className = "mobile-day-link";
      mobileLink.dataset.dayTarget = `day-${slugify(day)}`;
      mobileLink.textContent = fullLabel;
      mobileResourcesBody.append(mobileLink);
    }
  });
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
      if (!(link instanceof HTMLAnchorElement)) return;
      link.classList.toggle("is-active", link.getAttribute("href") === activeHash);
    });
}

function render(items) {
  clubsList.innerHTML = "";

  if (!items.length) {
    clubsList.innerHTML = "<p class='status'>No clubs match this search.</p>";
    daysNav.innerHTML = "";
    return;
  }

  renderDayNav(items);

  DAYS.forEach((day) => {
    const dayItems = items
      .filter((club) => club.day === day)
      .sort((a, b) => {
        if (a.featured !== b.featured) return Number(b.featured) - Number(a.featured);
        if (a.isNew !== b.isNew) return Number(b.isNew) - Number(a.isNew);
        return getDisplayCity(a).localeCompare(getDisplayCity(b));
      });
    if (!dayItems.length) return;

    const section = document.createElement("section");
    section.className = "day-section";
    if (day === "Every now and again") section.classList.add("day-section--wide");
    section.id = `day-${slugify(day)}`;

    const heading = document.createElement("h3");
    heading.textContent = day;
    section.append(heading);

    const dayGrid = document.createElement("div");
    dayGrid.className = "day-section-grid";

    for (const club of dayItems) {
      const card = document.createElement("article");
      card.className = "club-card";
      if (club.isNight) card.classList.add("night-edition");

      const displayCity = getDisplayCity(club);
      // Word cloud overlay: store city keys so JS can look up topics
      card.dataset.city = (club.city || "").toLowerCase().trim();
      card.dataset.displayCity = displayCity;
      const isOriginal = normalize(club.city).replace(/[\u2014\u2013]/g, "-") === "new york - williamsburg";
      if (isOriginal) card.classList.add("flagship-card");

      // 1. City name (primary headline)
      const titleRow = document.createElement("div");
      titleRow.className = "card-title-row";

      const cityEl = club.venue
        ? document.createElement("a")
        : document.createElement("span");
      if (club.venue) {
        cityEl.href = getMapURL(`${club.venue}, ${club.city}`);
        cityEl.target = "_blank";
        cityEl.rel = "noreferrer";
      }
      cityEl.className = "city-name";
      if (isOriginal) cityEl.classList.add("original-bc");
      cityEl.textContent = displayCity;
      titleRow.append(cityEl);

      const titleBadges = document.createElement("span");
      titleBadges.className = "title-badges";

      if (club.featured) {
        const featuredBadge = document.createElement("span");
        featuredBadge.className = "badge badge-featured";
        featuredBadge.textContent = "Featured";
        titleBadges.append(featuredBadge);
      }

      if (club.isNew) {
        const newBadge = document.createElement("span");
        newBadge.className = "badge badge-new";
        newBadge.textContent = "New";
        titleBadges.append(newBadge);
      }

      if (club.isNight) {
        const nightBadge = document.createElement("span");
        nightBadge.className = "badge badge-night";
        nightBadge.textContent = "Night";
        titleBadges.append(nightBadge);
      }

      if (club.locationNote && /\bpop[\s-]?up\b/i.test(club.locationNote)) {
        const popupBadge = document.createElement("span");
        popupBadge.className = "badge badge-popup";
        popupBadge.textContent = club.locationNote;
        titleBadges.append(popupBadge);
      }

      if (titleBadges.children.length) {
        titleRow.append(titleBadges);
      }

      card.append(titleRow);

      // 2. Subline: frequency, venue, status badges
      const subline = document.createElement("div");
      subline.className = "card-subline";
      const sublineMain = document.createElement("span");
      sublineMain.className = "card-subline-main";

      if (club.scheduleLabel) {
        const freq = document.createElement("span");
        freq.textContent = club.scheduleLabel;
        sublineMain.append(freq);
      }

      if (club.eventTime) {
        const sep = document.createElement("span");
        sep.className = "subline-sep";
        sep.textContent = "|";
        if (sublineMain.children.length) sublineMain.append(sep);
        const timeEl = document.createElement("span");
        timeEl.className = "card-time";
        timeEl.textContent = `Starts ${club.eventTimeLabel || club.eventTime}`;
        sublineMain.append(timeEl);
      }

      const isLongVenue = club.venue && club.venue.length > 55;

      if (club.venue && !isLongVenue) {
        const sep = document.createElement("span");
        sep.className = "subline-sep";
        sep.textContent = "|";
        if (sublineMain.children.length) sublineMain.append(sep);
        const venueEl = document.createElement("span");
        venueEl.textContent = club.venue;
        sublineMain.append(venueEl);
      } else if (!club.venue) {
        const tbd = document.createElement("span");
        tbd.className = "badge badge-tbd";
        tbd.textContent = "TBD";
        sublineMain.append(tbd);
      }

      if (sublineMain.children.length) {
        subline.append(sublineMain);
      }

      if (club.locationNote && !/\bpop[\s-]?up\b/i.test(club.locationNote)) {
        const locBadge = document.createElement("span");
        locBadge.className = "badge badge-location";
        locBadge.textContent = club.locationNote;
        subline.append(locBadge);
      }

      if (subline.children.length) card.append(subline);

      // note body element (referenced by utility row button below)
      let noteBody = null;
      if (isLongVenue) {
        noteBody = document.createElement("p");
        noteBody.className = "host-note-body";
        noteBody.textContent = club.venue;
        noteBody.hidden = true;
      }

      // 3. Host line
      if (club.hostDisplay) {
        const host = document.createElement("div");
        host.className = "card-host";
        host.append(document.createTextNode("Host: "));
        host.append(renderHostText(club.hostDisplay));
        card.append(host);
      }

      if (club.isIncomplete) {
        const note = document.createElement("div");
        note.className = "card-host";
        note.textContent = "Contact host for more info";
        card.append(note);
      }

      // 4. Utility row: maps, socials
      const util = document.createElement("div");
      util.className = "card-utility";

      if (club.venue) {
        const mapsBtn = document.createElement("a");
        mapsBtn.href = getMapURL(`${club.venue}, ${club.city}`);
        mapsBtn.target = "_blank";
        mapsBtn.rel = "noreferrer";
        mapsBtn.title = `Open ${club.venue} in Google Maps`;
        mapsBtn.textContent = "Google Maps";
        util.append(mapsBtn);
      }

      if (club.communityLink && club.communityLink.startsWith("http")) {
        const chatBtn = document.createElement("a");
        chatBtn.href = club.communityLink;
        chatBtn.target = "_blank";
        chatBtn.rel = "noreferrer";
        chatBtn.className = "community-link-btn";
        chatBtn.textContent = "Join the Chat";
        util.append(chatBtn);
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

      if (club.extraSocials && club.extraSocials.length) {
        club.extraSocials.forEach((item) => {
          if (!item || !item.url) return;
          util.append(renderSocialIcon(item.type, item.url, item.title || ""));
        });
      }

      if (noteBody) {
        const noteBtn = document.createElement("button");
        noteBtn.className = "note-icon-btn";
        noteBtn.title = "Note from host";
        noteBtn.textContent = "✎";
        noteBtn.addEventListener("click", () => {
          const expanded = !noteBody.hidden;
          noteBody.hidden = expanded;
          noteBtn.classList.toggle("open", !expanded);
        });
        util.append(noteBtn);
      }

      if (util.children.length) card.append(util);

      if (noteBody) card.append(noteBody);

      dayGrid.append(card);
    }

    section.append(dayGrid);
    clubsList.append(section);
  });

  requestAnimationFrame(syncActiveDayLink);
}

function normalize(value) {
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

  function closeMobileDayPicker() {
    mobileResourcesToggle.setAttribute("aria-expanded", "false");
    mobileResourcesBody.hidden = true;
  }

  mobileResourcesToggle.addEventListener("click", () => {
    const expanded =
      mobileResourcesToggle.getAttribute("aria-expanded") === "true";
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
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    history.replaceState(null, "", `#${targetId}`);
    if (mobileResourcesToggle && mobileResourcesBody && origin instanceof HTMLButtonElement) {
      mobileResourcesToggle.setAttribute("aria-expanded", "false");
      mobileResourcesBody.hidden = true;
    }
    requestAnimationFrame(syncActiveDayLink);
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
  if (activeRegion === "All") return clubs;
  if (activeRegion === "New") return clubs.filter((c) => c.isNew);
  return clubs.filter((c) => c.region === activeRegion);
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
    regionHeadline.textContent = REGION_HEADLINES[region] || `Coming up this week in ${region}`;
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
  ["All", "New", ...REGION_ORDER].forEach((region) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "region-pill" + (region === activeRegion ? " active" : "");
    if (region === "New") btn.classList.add("region-pill-new");
    btn.dataset.region = region;
    btn.textContent = region;
    btn.addEventListener("click", () => setRegion(region));
    regionFilter.append(btn);
  });
}

async function loadClubs() {
  try {
    let csv = "";
    let usedLocalSnapshot = false;

    try {
      const sheetRes = await fetch(SHEET_CSV_URL);
      if (!sheetRes.ok) throw new Error(`Sheet request failed with ${sheetRes.status}`);
      csv = await sheetRes.text();
    } catch (_error) {
      const localRes = await fetch(LOCAL_SHEET_CSV_URL);
      if (!localRes.ok) throw new Error("local sheet snapshot unavailable");
      csv = await localRes.text();
      usedLocalSnapshot = true;
    }

    const rows = parseCSV(csv);

    // Build a header → index map so column moves never break lookups.
    const headers = (rows[0] || []).map((h) => h.toLowerCase().replace(/[\s_]+/g, "_").trim());
    const colIdx = {};
    headers.forEach((h, i) => { colIdx[h] = i; });
    const col = (name, cells) => (cells[colIdx[name]] || "").trim();
    // Aliases for columns whose names have spaces in the sheet
    colIdx["start_time"] = colIdx["start_time"] ?? colIdx["start time"];
    colIdx["whatsapp"] = colIdx["whatsapp"] ?? colIdx["whatsapp_link"] ?? colIdx["community_link"];
    colIdx["host_linkedin_2"] = colIdx["host_linkedin_2"] ?? colIdx["host_linkedin 2"];

    clubs = rows
      .slice(1)
      .map((cells) => {
        const city = col("city", cells);
        const override = CLUB_OVERRIDES[normalize(city).replace(/[\u2014\u2013]/g, "-")] || {};
        const isActive = (col("active", cells) || "yes").toLowerCase() !== "no";
        const cadence = override.cadence || (isActive ? col("frequency", cells) : "Every now and again") || "";
        const time = formatTimeLabel(override.time || "");
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
          featured: override.featured ?? isAffirmative(col("featured", cells)),
          isNew: override.isNew ?? isAffirmative(col("is_new", cells)),
          cadence,
          time,
          scheduleLabel: extractScheduleLabel(cadence, time),
          venue: override.venue || getVenue(col("venue_name", cells), ""),
          day: getDay(cadence, time),
          isNight: isNightClub(time, override.isNight),
          specificDates: override.specificDates || [],
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
          eventTime: override.eventTime || col("start_time", cells),
          eventTimeLabel: override.eventTimeLabel || "",
          communityLink: override.communityLink || col("whatsapp", cells) || "",
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

    statusText.textContent = usedLocalSnapshot ? "(local sheet snapshot)" : "";
    flyerGalleryItems = getFlyerGalleryItems();
    animateGrowthTitle(clubs.length);
    renderRegionFilter();
    render(clubs);
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
          locationNote:  "",
          host:          entry.host || "",
          whatsapp:      "",
          mapURL:        entry.mapsURL || "",
          igHandles:     [],
          upcoming_date: entry.upcoming_date || "",
          eventTime:     "",
          eventTimeLabel:"",
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
    const override = CLUB_OVERRIDES[normalize(club.city)] || {};
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

// ── Flyer overlay ─────────────────────────────────────────────────────────────

let lightbox = null;
let activeFlyerIndex = 0;
let flyerKeyHandler = null;
let flyerTouchStartX = 0;
let flyerTouchDeltaX = 0;

function getWrappedFlyerIndex(index) {
  const count = flyerGalleryItems.length;
  if (!count) return 0;
  return (index + count) % count;
}

function jumpToFlyer(index) {
  if (!flyerGalleryItems.length) return;
  activeFlyerIndex = getWrappedFlyerIndex(index);
  renderActiveFlyer();
}

function randomizeFlyer() {
  if (flyerGalleryItems.length <= 1) return;
  let nextIndex = activeFlyerIndex;
  while (nextIndex === activeFlyerIndex) {
    nextIndex = Math.floor(Math.random() * flyerGalleryItems.length);
  }
  jumpToFlyer(nextIndex);
}

function buildFlyerOverlay() {
  lightbox = document.createElement("div");
  lightbox.className = "flyer-lightbox";
  lightbox.setAttribute("role", "dialog");
  lightbox.setAttribute("aria-modal", "true");
  lightbox.hidden = true;

  const backdrop = document.createElement("div");
  backdrop.className = "flyer-lightbox-backdrop";

  const panel = document.createElement("div");
  panel.className = "flyer-lightbox-panel";

  const topbar = document.createElement("div");
  topbar.className = "flyer-lightbox-topbar";

  const closeBtn = document.createElement("button");
  closeBtn.className = "flyer-lightbox-close";
  closeBtn.setAttribute("aria-label", "Close flyer gallery");
  closeBtn.textContent = "Close";
  closeBtn.addEventListener("click", closeFlyerLightbox);

  const rouletteBtn = document.createElement("button");
  rouletteBtn.className = "flyer-lightbox-roulette";
  rouletteBtn.setAttribute("aria-label", "Jump to a random flyer");
  rouletteBtn.textContent = "Flyer Roulette";
  rouletteBtn.addEventListener("click", randomizeFlyer);

  topbar.append(rouletteBtn, closeBtn);

  const prevBtn = document.createElement("button");
  prevBtn.className = "flyer-lightbox-nav flyer-lightbox-nav--prev";
  prevBtn.setAttribute("aria-label", "Previous flyer");
  prevBtn.textContent = "←";
  prevBtn.addEventListener("click", () => stepFlyer(-1));

  const nextBtn = document.createElement("button");
  nextBtn.className = "flyer-lightbox-nav flyer-lightbox-nav--next";
  nextBtn.setAttribute("aria-label", "Next flyer");
  nextBtn.textContent = "→";
  nextBtn.addEventListener("click", () => stepFlyer(1));

  const stage = document.createElement("div");
  stage.className = "flyer-lightbox-stage";

  const img = document.createElement("img");
  img.className = "flyer-lightbox-img";
  img.alt = "";
  stage.append(prevBtn, img, nextBtn);

  const hint = document.createElement("div");
  hint.className = "flyer-lightbox-hint";
  hint.textContent = "Swipe or tap arrows";

  const gallery = document.createElement("div");
  gallery.className = "flyer-lightbox-gallery";

  panel.append(topbar, stage, hint, gallery);
  lightbox.append(backdrop, panel);

  lightbox.addEventListener("click", (e) => {
    if (e.target === lightbox || e.target === backdrop) closeFlyerLightbox();
  });

  stage.addEventListener("touchstart", (e) => {
    flyerTouchStartX = e.touches[0]?.clientX || 0;
    flyerTouchDeltaX = 0;
  }, { passive: true });

  stage.addEventListener("touchmove", (e) => {
    const currentX = e.touches[0]?.clientX || 0;
    flyerTouchDeltaX = currentX - flyerTouchStartX;
  }, { passive: true });

  stage.addEventListener("touchend", () => {
    if (Math.abs(flyerTouchDeltaX) < 45) return;
    stepFlyer(flyerTouchDeltaX < 0 ? 1 : -1);
  });

  document.body.append(lightbox);
}

function renderActiveFlyer() {
  if (!lightbox || !flyerGalleryItems.length) return;
  const item = flyerGalleryItems[activeFlyerIndex];
  const img = lightbox.querySelector(".flyer-lightbox-img");
  const prevBtn = lightbox.querySelector(".flyer-lightbox-nav--prev");
  const nextBtn = lightbox.querySelector(".flyer-lightbox-nav--next");
  const hint = lightbox.querySelector(".flyer-lightbox-hint");
  const gallery = lightbox.querySelector(".flyer-lightbox-gallery");

  img.src = item.url;
  img.alt = `${item.city} flyer`;

  const multi = flyerGalleryItems.length > 1;
  prevBtn.hidden = !multi;
  nextBtn.hidden = !multi;
  hint.hidden = !multi;

  gallery.innerHTML = "";
  flyerGalleryItems.forEach((galleryItem, index) => {
    const thumbBtn = document.createElement("button");
    thumbBtn.className = "flyer-gallery-thumb" + (index === activeFlyerIndex ? " active" : "");
    thumbBtn.setAttribute("aria-label", `View flyer for ${galleryItem.city}`);
    thumbBtn.addEventListener("click", () => jumpToFlyer(index));

    const thumbImg = document.createElement("img");
    thumbImg.className = "flyer-gallery-thumb-img";
    thumbImg.src = galleryItem.url;
    thumbImg.alt = `${galleryItem.city} flyer thumbnail`;

    const thumbLabel = document.createElement("span");
    thumbLabel.className = "flyer-gallery-thumb-label";
    thumbLabel.textContent = galleryItem.city;

    thumbBtn.append(thumbImg, thumbLabel);
    gallery.append(thumbBtn);
  });
}

function stepFlyer(direction) {
  if (!flyerGalleryItems.length) return;
  jumpToFlyer(activeFlyerIndex + direction);
}

function openFlyerLightbox(url, cityName) {
  if (!lightbox) buildFlyerOverlay();

  if (!flyerGalleryItems.length) {
    flyerGalleryItems = [{ city: cityName, url, venue: "", scheduleLabel: "", eventTime: "" }];
  }

  const matchIndex = flyerGalleryItems.findIndex((item) => item.url === url || item.city === cityName);
  activeFlyerIndex = matchIndex >= 0 ? matchIndex : 0;
  renderActiveFlyer();

  lightbox.hidden = false;
  document.body.style.overflow = "hidden";
  document.body.classList.add("flyer-overlay-open");

  if (flyerKeyHandler) {
    document.removeEventListener("keydown", flyerKeyHandler);
  }

  flyerKeyHandler = (e) => {
    if (e.key === "Escape") closeFlyerLightbox();
    if (e.key === "ArrowLeft") stepFlyer(-1);
    if (e.key === "ArrowRight") stepFlyer(1);
  };
  document.addEventListener("keydown", flyerKeyHandler);
}

function closeFlyerLightbox() {
  if (lightbox) lightbox.hidden = true;
  document.body.style.overflow = "";
  document.body.classList.remove("flyer-overlay-open");
  if (flyerKeyHandler) {
    document.removeEventListener("keydown", flyerKeyHandler);
    flyerKeyHandler = null;
  }
}

window.openFlyerLightbox = openFlyerLightbox;

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
