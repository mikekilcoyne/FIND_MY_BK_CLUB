const SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/1HTp01deXz7TjPxXtM-a6tXhtUi40XX0K9U_LyLL1aUk/export?format=csv&gid=0";
const GROWTH_TITLE_SUFFIX = "clubs worldwide (and counting)";
const CLUB_OVERRIDES = window.CLUB_OVERRIDES || {};
let growthTitleTimer = null;

const clubsList = document.querySelector("#clubs-list");
const statusText = document.querySelector("#status");
const searchInput = document.querySelector("#club-search");
const daysNav = document.querySelector("#days-nav");
const siteTitle = document.querySelector("#site-title");
const mainHeadline = document.querySelector("#main-headline");
const calendarViewLink = document.querySelector(".calendar-headline-link");
const mobileResourcesToggle = document.querySelector(".mobile-resources-toggle");
const mobileResourcesBody = document.querySelector("#mobile-resources-body");

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
  if (!handles.length) return "";
  const cleanName = (hostName || "").trim();
  if (cleanName) {
    return `${cleanName} (${handles.join(", ")})`;
  }
  return handles.join(", ");
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
  const weekday = parseWeekday(timeValue);
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
  if (lower.includes("first thursday")) return "First Thursday";
  if (lower.includes("first wednesday")) return "First Wednesday";
  if (lower.includes("second monday")) return "Second Monday";
  if (lower.includes("second thursday")) return "Second Thursday";
  if (lower.includes("third friday")) return "Third Friday";
  if (lower.includes("wednesday")) return "Wednesday";
  if (lower.includes("thursday")) return "Thursday";
  if (lower.includes("friday")) return "Friday";
  if (lower.includes("tuesday")) return "Tuesday";
  if (lower.includes("monday")) return "Monday";
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
      const isOriginal = normalize(club.city) === "new york - williamsburg";
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

      if (club.venue) {
        const venueEl = document.createElement("span");
        venueEl.textContent = club.venue;
        subline.append(venueEl);
      } else {
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

      // 3. Host line
      if (club.hostDisplay) {
        const host = document.createElement("div");
        host.className = "card-host";
        host.append(document.createTextNode("HOST: "));
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

      if (util.children.length) card.append(util);

      section.append(card);
    }

    clubsList.append(section);
  });
}

function normalize(value) {
  return value.toLowerCase().trim();
}

function animateGrowthTitle(clubCount) {
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
  siteTitle.innerHTML = `<span class="growth-count">${current}</span> ${GROWTH_TITLE_SUFFIX}`;

  const tick = (now) => {
    const elapsed = now - start;
    const progress = Math.min(1, elapsed / durationMs);
    const eased = 1 - (1 - progress) * (1 - progress);
    const next = Math.max(1, Math.round(1 + (finalCount - 1) * eased));

    if (next !== current) {
      current = next;
      siteTitle.innerHTML = `<span class="growth-count">${current}</span> ${GROWTH_TITLE_SUFFIX}`;
    }

    if (progress < 1) {
      growthTitleTimer = requestAnimationFrame(tick);
      return;
    }

    siteTitle.classList.remove("counting");
    siteTitle.innerHTML = `<span class="growth-count">${finalCount}</span> ${GROWTH_TITLE_SUFFIX}`;
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

async function loadClubs() {
  try {
    const sheetRes = await fetch(SHEET_CSV_URL);
    if (!sheetRes.ok) {
      throw new Error(`Sheet request failed with ${sheetRes.status}`);
    }
    const csv = await sheetRes.text();

    const rows = parseCSV(csv);

    clubs = rows
      .slice(1)
      .map((cells) => {
        const city = (cells[0] || "").trim();
        const override = CLUB_OVERRIDES[normalize(city)] || {};
        const cadence = override.cadence || cells[1] || "";
        const time = formatTimeLabel(override.time || cells[2] || "");
        const igHandles = extractInstagramHandles(cells[5] || "");

        return {
          city,
          displayCity: override.displayCity || city,
          cadence,
          time,
          scheduleLabel: extractScheduleLabel(cadence, time),
          venue: override.venue || getVenue(cells[8] || "", cells[9] || ""),
          day: getDay(cadence, time),
          isNight: isNightClub(time, override.isNight),
          specificDates: override.specificDates || [],
          locationNote: override.locationNote || "",
          instagramURL: extractInstagramURL(cells[5] || ""),
          linkedinURL:
            override.linkedinURL ||
            extractLinkedInURL(cells[4] || "", cells[7] || ""),
          flyerURL: override.flyerURL || (cells[11] || "").trim(),
          extraSocials: override.extraSocials || [],
          hostDisplay: formatHostDisplay(
            cells[3] || "",
            igHandles,
            override.hostDisplay || "",
          ),
          isIncomplete:
            !getVenue(override.venue || cells[8] || "", cells[9] || "") ||
            (!extractInstagramURL(cells[5] || "") &&
              !(
                override.linkedinURL ||
                extractLinkedInURL(cells[4] || "", cells[7] || "")
              ) &&
              !(override.extraSocials || []).length),
        };
      })
      .filter((club) => club.city);

    statusText.textContent = "";
    animateGrowthTitle(clubs.length);
    render(clubs);
  } catch (error) {
    statusText.textContent = "Could not load clubs from the sheet right now.";
    clubsList.innerHTML = "";
  }
}

searchInput.addEventListener("input", () => {
  const term = normalize(searchInput.value);

  if (!term) {
    render(clubs);
    return;
  }

  const filtered = clubs.filter((club) => {
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
