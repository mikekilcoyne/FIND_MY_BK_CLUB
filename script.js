const SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/1HTp01deXz7TjPxXtM-a6tXhtUi40XX0K9U_LyLL1aUk/export?format=csv&gid=0";

const clubsList = document.querySelector("#clubs-list");
const statusText = document.querySelector("#status");
const searchInput = document.querySelector("#club-search");
const daysNav = document.querySelector("#days-nav");
const siteTitle = document.querySelector("#site-title");
const mainHeadline = document.querySelector("#main-headline");
const hostCta = document.querySelector("#host-cta");

const COPY_KEY = "bkClubSiteCopy";
const DEFAULT_COPY = {
  siteTitle: "Breakfast Club",
  mainHeadline: "Find My Breakfast Club",
  hostCta: "become a host",
  searchPlaceholder: "search clubs"
};

const CLUB_OVERRIDES = {
  "portland, or": {
    cadence: "Weekly",
    time: "Tuesdays, 9:00am",
    venue: "It's Just a Feeling"
  },
  "toronto": {
    cadence: "Weekly",
    time: "Wednesdays, 8:30am",
    venue: "Boxcar Social Laneway"
  },
  "mexico city": {
    cadence: "Weekly",
    time: "Wednesdays, 8:30am",
    venue: "Mendl"
  },
  "miami": {
    cadence: "Weekly",
    time: "Wednesdays, 9:00am",
    venue: "Novela Cafe Social"
  },
  "san francisco, ca": {
    cadence: "Weekly",
    time: "Wednesdays, 8:30am",
    venue: "Tereene at One Hotel"
  },
  "new york - williamsburg": {
    cadence: "Weekly",
    time: "Wednesdays, 8:30am",
    venue: "Le Crocodile",
    linkedinURL: "https://www.linkedin.com/in/dietznutz",
    hostDisplay: "Ben Dietz (@bendietz)"
  },
  "new york - hamptons": {
    cadence: "Weekly",
    time: "Wednesdays, 8:30am",
    venue: "Tutto Cafe",
    extraSocials: [
      { type: "instagram", url: "https://www.instagram.com/themichaelkilcoyne/", title: "Host Instagram" },
      { type: "linkedin", url: "https://www.linkedin.com/in/mikekilcoyne/", title: "Host LinkedIn" },
      { type: "instagram", url: "https://www.instagram.com/adamh929/", title: "Co-host Instagram" }
    ],
    hostDisplay: "@themichaelkilcoyne + @adamh929"
  },
  "new york - downtown brooklyn": {
    cadence: "Weekly",
    time: "Thursdays, 8:30am",
    venue: "Ace Hotel Downtown Brooklyn (Lobby)"
  },
  "new york - les": {
    cadence: "Weekly",
    time: "Thursdays, 9:00am",
    venue: "Rule 257, 234 Eldridge"
  },
  "washington dc": {
    cadence: "Bi-Weekly",
    time: "Thursdays, 8:30am",
    venue: "Line Hotel, Adams Morgan"
  },
  "soma, nj, usa": {
    cadence: "Weekly",
    time: "Fridays, 9:15am",
    venue: "Arties"
  }
};

let clubs = [];
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Every now and again"];

function loadSiteCopy() {
  let copy = { ...DEFAULT_COPY };
  try {
    const raw = localStorage.getItem(COPY_KEY);
    if (raw) {
      copy = { ...copy, ...JSON.parse(raw) };
    }
  } catch (_error) {
    copy = { ...DEFAULT_COPY };
  }

  if (siteTitle) siteTitle.textContent = copy.siteTitle;
  if (mainHeadline) mainHeadline.textContent = copy.mainHeadline;
  if (hostCta) hostCta.textContent = copy.hostCta;
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
  return /(weekly|bi-weekly|biweekly|monthly|first|second|third|fourth|every)/.test(text);
}

function formatTimeLabel(value) {
  const text = (value || "").trim();
  if (!text) return "";
  return text.replace(/\b830am\b/i, "8:30am");
}

function getDay(cadence, timeValue) {
  const weekday = parseWeekday(timeValue);
  if (weekday && hasRegularCadence(cadence, timeValue)) {
    return weekday;
  }
  return "Every now and again";
}

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
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
      fragment.append(document.createTextNode(value.slice(cursor, match.index)));
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
    const dayLabel = day === "Every now and again" ? "Every now + again" : day.slice(0, 3);
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
      const row = document.createElement("article");
      row.className = "club-row";

      let city;
      if (club.venue) {
        city = document.createElement("a");
        city.href = getMapURL(`${club.venue}, ${club.city}`);
        city.target = "_blank";
        city.rel = "noreferrer";
      } else {
        city = document.createElement("span");
      }
      city.className = "club-name";
      city.textContent = club.city;
      if (normalize(club.city) === "new york - williamsburg") {
        city.classList.add("original-bc");
      }

      const schedule = document.createElement("span");
      schedule.className = "meta";
      schedule.textContent = club.scheduleLabel ? ` (${club.scheduleLabel})` : "";

      const venue = document.createElement("span");
      venue.className = "venue-meta";
      venue.textContent = club.venue ? ` - ${club.venue}` : " - TBD";

      let map;
      if (club.venue) {
        map = document.createElement("a");
        map.href = getMapURL(`${club.venue}, ${club.city}`);
        map.target = "_blank";
        map.rel = "noreferrer";
        map.className = "google-maps-link";
        map.textContent = "Google Maps";
        map.title = `Open ${club.venue} in Google Maps`;
      } else {
        map = document.createElement("span");
        map.className = "map-tbd";
        map.textContent = "TBD";
      }

      row.append(city, schedule, venue, map);

      if (club.instagramURL) {
        const ig = renderSocialIcon("instagram", club.instagramURL, `Open ${club.city} on Instagram`);
        row.append(ig);
      }

      if (club.linkedinURL) {
        const linkedin = renderSocialIcon("linkedin", club.linkedinURL, `Open ${club.city} host on LinkedIn`);
        row.append(linkedin);
      }

      if (club.extraSocials && club.extraSocials.length) {
        club.extraSocials.forEach((item) => {
          if (!item || !item.url) return;
          row.append(renderSocialIcon(item.type, item.url, item.title || ""));
        });
      }

      if (club.hostDisplay) {
        const host = document.createElement("div");
        host.className = "host-note";
        host.append(document.createTextNode("HOST: "));
        host.append(renderTextWithInstagramLinks(club.hostDisplay));
        row.append(host);
      }

      if (club.isIncomplete) {
        const note = document.createElement("span");
        note.className = "contact-note";
        note.textContent = "Contact host for more info";
        row.append(note);
      }

      section.append(row);
    }

    clubsList.append(section);
  });
}

function normalize(value) {
  return value.toLowerCase().trim();
}

async function loadClubs() {
  try {
    const res = await fetch(SHEET_CSV_URL);
    if (!res.ok) {
      throw new Error(`Request failed with ${res.status}`);
    }

    const csv = await res.text();
    const rows = parseCSV(csv);

    clubs = rows
      .slice(1)
      .map((cells) => {
        const city = (cells[0] || "").trim();
        const override = CLUB_OVERRIDES[normalize(city)] || {};
        const cadence = override.cadence || (cells[1] || "");
        const time = formatTimeLabel(override.time || (cells[2] || ""));
        const igHandles = extractInstagramHandles(cells[5] || "");

        return {
          city,
          cadence,
          time,
          scheduleLabel: extractScheduleLabel(cadence, time),
          venue: override.venue || getVenue(cells[8] || "", cells[9] || ""),
          day: getDay(cadence, time),
          instagramURL: extractInstagramURL(cells[5] || ""),
          linkedinURL: override.linkedinURL || extractLinkedInURL(cells[4] || "", cells[7] || ""),
          extraSocials: override.extraSocials || [],
          hostDisplay: formatHostDisplay(cells[3] || "", igHandles, override.hostDisplay || ""),
          isIncomplete:
            !getVenue(override.venue || cells[8] || "", cells[9] || "") ||
            (!extractInstagramURL(cells[5] || "") &&
              !(override.linkedinURL || extractLinkedInURL(cells[4] || "", cells[7] || "")) &&
              !(override.extraSocials || []).length)
        };
      })
      .filter((club) => club.city);

    statusText.textContent = `${clubs.length} clubs loaded.`;
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
    return normalize(`${club.city} ${club.cadence} ${club.time}`).includes(term);
  });

  render(filtered);
});

loadSiteCopy();
loadClubs();
