const SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/1_4MoIXgSHjERztj0LPPC-XAa7nzFlfrdcjEQdBeSqto/export?format=csv&gid=105813476";
const GROWTH_TITLE_SUFFIX = "clubs worldwide (and counting)";
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
  if (!handles.length) return cleanName;
  const names = cleanName
    ? cleanName
        .split(/\s*[,+]\s*|\s+and\s+/i)
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
  if (names.length) {
    return `${names.join(" & ")} (${handles.join(" | ")})`;
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

function renderSocialIcon(type, url, title) {
  const link = document.createElement("a");
  link.href = url;
  link.target = "_blank";
  link.rel = "noreferrer";
  link.title = title || "";
  if (type === "linkedin") {
    link.className = "li-icon-link";
    link.textContent = "in";
  } else {
    link.className = "ig-icon-link";
    link.textContent = "📷";
  }
  return link;
}

function renderTextWithInstagramLinks(text) {
  const fragment = document.createDocumentFragment();
  const value = text || "";
  const regex = /@[A-Za-z0-9._]+/g;
  let cursor = 0;
  let match;

  while ((match = regex.exec(value)) !== null) {
    if (match.index > cursor) {
      fragment.append(
        document.createTextNode(value.slice(cursor, match.index)),
      );
    }
    const handle = match[0];
    const handleLink = document.createElement("a");
    handleLink.href = `https://www.instagram.com/${handle.slice(1)}/`;
    handleLink.target = "_blank";
    handleLink.rel = "noreferrer";
    handleLink.className = "host-instagram-link";
    handleLink.textContent = handle;
    fragment.append(handleLink);
    cursor = match.index + handle.length;
  }

  if (cursor < value.length) {
    fragment.append(document.createTextNode(value.slice(cursor)));
  }

  return fragment;
}

function renderDayNav(items) {
  if (!daysNav) return;

  const countByDay = new Map(DAYS.map((day) => [day, 0]));
  items.forEach((club) => {
    countByDay.set(club.day, (countByDay.get(club.day) || 0) + 1);
  });

  daysNav.innerHTML = "";
  DAYS.forEach((day) => {
    if ((countByDay.get(day) || 0) === 0) return;
    const link = document.createElement("a");
    link.href = `#day-${slugify(day)}`;
    link.className = "day-chip";
    const dayLabel =
      day === "Every now and again" ? "Every now + again" : day.slice(0, 3);
    link.textContent = `${dayLabel} (${countByDay.get(day)})`;
    daysNav.append(link);
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
    const dayItems = items.filter((club) => club.day === day);
    if (!dayItems.length) return;

    const section = document.createElement("section");
    section.className = "day-section";
    section.id = `day-${slugify(day)}`;

    const heading = document.createElement("h3");
    heading.textContent = day;
    section.append(heading);

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
      card.append(cityEl);

      // 2. Subline: frequency, venue, status badges
      const subline = document.createElement("div");
      subline.className = "card-subline";

      if (club.scheduleLabel) {
        const freq = document.createElement("span");
        freq.textContent = club.scheduleLabel;
        subline.append(freq);
      }

      if (club.eventTime) {
        const sep = document.createElement("span");
        sep.className = "subline-sep";
        sep.textContent = "|";
        subline.append(sep);
        const timeEl = document.createElement("span");
        timeEl.className = "card-time";
        timeEl.textContent = `Starts at ${club.eventTime}`;
        subline.append(timeEl);
      }

      const isLongVenue = club.venue && club.venue.length > 55;

      if (club.venue && !isLongVenue) {
        const sep = document.createElement("span");
        sep.className = "subline-sep";
        sep.textContent = "|";
        subline.append(sep);
        const venueEl = document.createElement("span");
        venueEl.textContent = club.venue;
        subline.append(venueEl);
      } else if (!club.venue) {
        const tbd = document.createElement("span");
        tbd.className = "badge badge-tbd";
        tbd.textContent = "TBD";
        subline.append(tbd);
      }

      if (club.locationNote) {
        const locBadge = document.createElement("span");
        locBadge.className = "badge badge-location";
        locBadge.textContent = club.locationNote;
        subline.append(locBadge);
      }

      if (club.isNight) {
        const nightBadge = document.createElement("span");
        nightBadge.className = "badge badge-night";
        nightBadge.textContent = "Night";
        subline.append(nightBadge);
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
        host.append(renderTextWithInstagramLinks(club.hostDisplay));
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

      if (club.instagramURL) {
        util.append(renderSocialIcon(
          "instagram",
          club.instagramURL,
          `Open ${club.city} on Instagram`,
        ));
      }

      if (club.linkedinURL) {
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

      if (club.flyerURL) {
        const flyerBtn = document.createElement("button");
        flyerBtn.className = "flyer-btn";
        flyerBtn.textContent = "View Flyer";
        flyerBtn.addEventListener("click", () => openFlyerLightbox(club.flyerURL, getDisplayCity(club)));
        util.append(flyerBtn);
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

      // Word cloud topics trigger
      const topicsBtn = document.createElement("button");
      topicsBtn.className = "wc-topics-btn";
      topicsBtn.textContent = "What we talked about";
      topicsBtn.dataset.city = card.dataset.city;
      topicsBtn.dataset.displayCity = card.dataset.displayCity;
      if (club.scheduleLabel) topicsBtn.dataset.scheduleLabel = club.scheduleLabel;
      if (club.eventTime)     topicsBtn.dataset.eventTime     = club.eventTime;
      if (club.venue)         topicsBtn.dataset.venue         = club.venue;
      card.append(topicsBtn);

      section.append(card);
    }

    clubsList.append(section);
  });
}

function normalize(value) {
  return value.toLowerCase().trim();
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

  mobileResourcesToggle.addEventListener("click", () => {
    const expanded =
      mobileResourcesToggle.getAttribute("aria-expanded") === "true";
    mobileResourcesToggle.setAttribute("aria-expanded", String(!expanded));
    mobileResourcesBody.hidden = expanded;
  });
}

function getFilteredClubs() {
  if (activeRegion === "All") return clubs;
  return clubs.filter((c) => c.region === activeRegion);
}

const REGION_HEADLINES = {
  "All": "Coming up this week around the world",
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
  ["All", ...REGION_ORDER].forEach((region) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "region-pill" + (region === activeRegion ? " active" : "");
    btn.dataset.region = region;
    btn.textContent = region;
    btn.addEventListener("click", () => setRegion(region));
    regionFilter.append(btn);
  });
}

async function loadClubs() {
  try {
    const sheetRes = await fetch(SHEET_CSV_URL);
    if (!sheetRes.ok) throw new Error(`Sheet request failed with ${sheetRes.status}`);
    const csv = await sheetRes.text();

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
        const igHandles = override.hideInstagram ? [] : extractInstagramHandles(col("host_instagram", cells));

        return {
          city,
          region: CITY_REGION[city.toLowerCase().trim()] || "",
          displayCity: override.displayCity || city,
          cadence,
          time,
          scheduleLabel: extractScheduleLabel(cadence, time),
          venue: override.venue || getVenue(col("venue_name", cells), ""),
          day: getDay(cadence, time),
          isNight: isNightClub(time, override.isNight),
          specificDates: override.specificDates || [],
          locationNote: override.locationNote || "",
          instagramURL: override.hideInstagram ? "" : extractInstagramURL(col("host_instagram", cells)),
          linkedinURL:
            override.linkedinURL ||
            extractLinkedInURL(col("host_linkedin", cells), col("host_linkedin_2", cells)),
          flyerURL: override.flyerURL || normalizeFlyer(col("flyer_url", cells)),
          extraSocials: override.extraSocials || [],
          hostDisplay: formatHostDisplay(
            col("host_name", cells),
            igHandles,
            override.hostDisplay || "",
          ),
          eventTime: override.eventTime || col("start_time", cells),
          communityLink: override.communityLink || col("whatsapp", cells) || club.whatsapp || "",
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
      .filter((club) => club.city);

    statusText.textContent = "";
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
          flyer:         null,
        }))
        .filter((c) => c.city);
      statusText.textContent = "(offline – showing cached data)";
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

  if (featured.flyerURL) {
    const flyerBtn = document.createElement("button");
    flyerBtn.textContent = "View Flyer";
    flyerBtn.className = "featured-action-btn featured-action-btn--primary";
    flyerBtn.addEventListener("click", () => openFlyerLightbox(featured.flyerURL, displayCity));
    actions.append(flyerBtn);
  }

  info.append(actions);
  strip.append(info);

  if (featured.flyerURL) {
    const thumb = document.createElement("div");
    thumb.className = "featured-thumb";
    const img = document.createElement("img");
    img.src = featured.flyerURL;
    img.alt = `${displayCity} flyer`;
    img.className = "featured-thumb-img";
    img.addEventListener("click", () => openFlyerLightbox(featured.flyerURL, displayCity));
    thumb.append(img);
    strip.append(thumb);
  }

  strip.hidden = false;
}

// ── Flyer lightbox ────────────────────────────────────────────────────────────

let lightbox = null;

function openFlyerLightbox(url, cityName) {
  if (!lightbox) {
    lightbox = document.createElement("div");
    lightbox.className = "flyer-lightbox";
    lightbox.setAttribute("role", "dialog");
    lightbox.setAttribute("aria-modal", "true");

    const img = document.createElement("img");
    img.className = "flyer-lightbox-img";
    img.alt = "";

    const closeBtn = document.createElement("button");
    closeBtn.className = "flyer-lightbox-close";
    closeBtn.setAttribute("aria-label", "Close flyer");
    closeBtn.textContent = "✕";
    closeBtn.addEventListener("click", closeFlyerLightbox);

    lightbox.append(closeBtn, img);
    lightbox.addEventListener("click", (e) => {
      if (e.target === lightbox) closeFlyerLightbox();
    });

    document.body.append(lightbox);
  }

  lightbox.querySelector(".flyer-lightbox-img").src = url;
  lightbox.querySelector(".flyer-lightbox-img").alt = `${cityName} flyer`;
  lightbox.hidden = false;
  document.body.style.overflow = "hidden";

  const onKey = (e) => {
    if (e.key === "Escape") { closeFlyerLightbox(); document.removeEventListener("keydown", onKey); }
  };
  document.addEventListener("keydown", onKey);
}

function closeFlyerLightbox() {
  if (lightbox) lightbox.hidden = true;
  document.body.style.overflow = "";
}

window.openFlyerLightbox = openFlyerLightbox;

// ── Init ──────────────────────────────────────────────────────────────────────

loadSiteCopy();
setupMobileResourcesToggle();
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
