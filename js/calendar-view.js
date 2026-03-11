const SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/1HTp01deXz7TjPxXtM-a6tXhtUi40XX0K9U_LyLL1aUk/export?format=csv&gid=0";
const CLUB_OVERRIDES = window.CLUB_OVERRIDES || {};

const statusText = document.querySelector("#status");
const monthLabel = document.querySelector("#month-label");
const monthSummary = document.querySelector("#month-summary");
const calendarGrid = document.querySelector("#calendar-grid");
const prevMonthBtn = document.querySelector("#prev-month");
const nextMonthBtn = document.querySelector("#next-month");
const todayBtn = document.querySelector("#jump-today");
const selectedDateLabel = document.querySelector("#selected-date-label");
const selectedDateSummary = document.querySelector("#selected-date-summary");
const selectedDateList = document.querySelector("#selected-date-list");

function trackEvent(name, params) {
  if (!window.BKAnalytics) return;
  window.BKAnalytics.track(name, params);
}

let clubs = [];
let currentMonthDate = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
let selectedDateISO = toISODate(
  new Date().getFullYear(),
  new Date().getMonth(),
  new Date().getDate(),
);

function normalize(value) {
  return (value || "").toLowerCase().trim();
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

function isNightClub(timeValue, overrideIsNight) {
  if (typeof overrideIsNight === "boolean") return overrideIsNight;
  return /\b(pm|p\.m\.|night|evening)\b/.test(normalize(timeValue));
}

function getDisplayCity(club) {
  return club.displayCity || club.city;
}

function isPopupEvent(club, isoDate) {
  if (!club || !isoDate) return false;
  const city = normalize(club.city || "");
  return city.includes("austin") && isoDate === "2026-03-15";
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

function getMapURL(place) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}`;
}

function compactText(value) {
  return (value || "").replace(/\s+/g, " ").trim();
}

function extractInstagramHandles(value) {
  const raw = (value || "").trim();
  if (!raw) return [];
  const matches = raw.match(/@[A-Za-z0-9._]+/g) || [];
  return [...new Set(matches)];
}

function extractInstagramHandleFromURL(value) {
  const raw = (value || "").trim();
  if (!raw) return "";
  const match = raw.match(/instagram\.com\/([A-Za-z0-9._]+)/i);
  return match && match[1] ? `@${match[1]}` : "";
}

function extractEmail(value) {
  const raw = (value || "").trim();
  if (!raw) return "";
  const match = raw.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/);
  return match ? match[0] : "";
}

function toContactParts(value) {
  const source = (value || "").trim();
  if (!source) return [];
  const matcher =
    /(https?:\/\/[^\s,;]+|www\.[^\s,;]+|[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/gi;
  const parts = [];
  let cursor = 0;
  let match;

  while ((match = matcher.exec(source)) !== null) {
    if (match.index > cursor) {
      parts.push({ type: "text", value: source.slice(cursor, match.index) });
    }
    const token = match[0];
    if (token.includes("@") && !token.startsWith("http")) {
      parts.push({ type: "link", label: token, href: `mailto:${token}` });
    } else {
      const href = token.startsWith("www.") ? `https://${token}` : token;
      parts.push({ type: "link", label: token, href });
    }
    cursor = match.index + token.length;
  }

  if (cursor < source.length) {
    parts.push({ type: "text", value: source.slice(cursor) });
  }

  return parts;
}

function appendContactLine(container, label, value) {
  const cleaned = compactText(value);
  if (!cleaned) return;

  const row = document.createElement("p");
  row.className = "detail-row";

  const rowLabel = document.createElement("span");
  rowLabel.className = "detail-label";
  rowLabel.textContent = `${label}: `;
  row.append(rowLabel);

  const parts = toContactParts(cleaned);
  if (!parts.length) {
    row.append(document.createTextNode(cleaned));
  } else {
    parts.forEach((part) => {
      if (part.type === "text") {
        row.append(document.createTextNode(part.value));
        return;
      }
      const link = document.createElement("a");
      link.href = part.href;
      link.target = "_blank";
      link.rel = "noreferrer";
      link.textContent = part.label;
      row.append(link);
    });
  }

  container.append(row);
}

function collectInstagramHandles(rawHandles, override = {}) {
  const fromSheet = extractInstagramHandles(rawHandles || "");
  const fromHostDisplay = extractInstagramHandles(override.hostDisplay || "");
  const fromExtras = (override.extraSocials || [])
    .filter((item) => item && item.type === "instagram" && item.url)
    .map((item) => extractInstagramHandleFromURL(item.url))
    .filter(Boolean);

  return [...new Set([...fromSheet, ...fromHostDisplay, ...fromExtras])];
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
    if (current) current += "\n";
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

function parseWeekday(value) {
  const text = normalize(value);
  if (text.includes("monday")) return 1;
  if (text.includes("tuesday")) return 2;
  if (text.includes("wednesday")) return 3;
  if (text.includes("thursday")) return 4;
  if (text.includes("friday")) return 5;
  if (text.includes("saturday")) return 6;
  if (text.includes("sunday")) return 0;
  return -1;
}

function extractOrdinal(value) {
  const text = normalize(value);
  if (/(first|1st|frist)/.test(text)) return 1;
  if (/(second|2nd)/.test(text)) return 2;
  if (/(third|3rd)/.test(text)) return 3;
  if (/(fourth|4th)/.test(text)) return 4;
  return 0;
}

function getScheduleRule(cadence, timeValue) {
  const cadenceText = normalize(cadence);
  const timeText = normalize(timeValue);
  const combined = `${cadenceText} ${timeText}`;
  const weekday = parseWeekday(combined);
  const ordinal = extractOrdinal(combined);

  if (weekday < 0) return { type: "unscheduled" };
  if (/(bi-weekly|biweekly|every other)/.test(combined)) {
    return { type: "biweekly", weekday };
  }
  if (/(monthly|month)/.test(cadenceText) || ordinal > 0) {
    return { type: "monthly", weekday, ordinal: ordinal || 1 };
  }
  return { type: "weekly", weekday };
}

function getDaysInMonth(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function toISODate(year, monthIndex, day) {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(
    2,
    "0",
  )}`;
}

function allWeekdayDatesInMonth(year, monthIndex, weekday) {
  const dates = [];
  const daysInMonth = getDaysInMonth(year, monthIndex);
  for (let day = 1; day <= daysInMonth; day += 1) {
    if (new Date(year, monthIndex, day).getDay() === weekday) {
      dates.push(day);
    }
  }
  return dates;
}

function monthlyDateForOrdinal(year, monthIndex, weekday, ordinal) {
  const matches = allWeekdayDatesInMonth(year, monthIndex, weekday);
  if (!matches.length) return 0;
  return matches[Math.min(ordinal, matches.length) - 1];
}

function datesForRule(rule, year, monthIndex) {
  if (!rule || rule.type === "unscheduled") return [];

  if (rule.type === "weekly") {
    return allWeekdayDatesInMonth(year, monthIndex, rule.weekday);
  }

  if (rule.type === "biweekly") {
    const weekdays = allWeekdayDatesInMonth(year, monthIndex, rule.weekday);
    return weekdays.filter((_, idx) => idx % 2 === 0);
  }

  if (rule.type === "monthly") {
    const day = monthlyDateForOrdinal(year, monthIndex, rule.weekday, rule.ordinal || 1);
    return day ? [day] : [];
  }

  return [];
}

function formatMonthTitle(year, monthIndex) {
  return new Date(year, monthIndex, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

function formatDateLabel(isoDate) {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function buildMonthEvents(year, monthIndex) {
  const byDate = new Map();

  clubs.forEach((club) => {
    const specificDates = (club.specificDates || []).filter((isoDate) => {
      const [eventYear, eventMonth] = isoDate.split("-").map(Number);
      return eventYear === year && eventMonth === monthIndex + 1;
    });
    const isoDates = specificDates.length
      ? specificDates
      : datesForRule(club.rule, year, monthIndex).map((day) =>
        toISODate(year, monthIndex, day)
      );

    isoDates.forEach((iso) => {
      if (!byDate.has(iso)) byDate.set(iso, []);
      byDate.get(iso).push(club);
    });
  });

  return byDate;
}

function renderDayDetails(isoDate, monthEvents) {
  const entries = monthEvents.get(isoDate) || [];
  selectedDateLabel.textContent = formatDateLabel(isoDate);
  selectedDateSummary.textContent =
    entries.length > 0
      ? `${entries.length} club${entries.length === 1 ? "" : "s"} scheduled.`
      : "No scheduled clubs on this date.";

  selectedDateList.innerHTML = "";
  if (!entries.length) return;

  entries
    .slice()
    .sort((a, b) => getDisplayCity(a).localeCompare(getDisplayCity(b)))
    .forEach((club) => {
      const card = document.createElement("article");
      card.className = "detail-card";
      if (club.isNight) {
        card.classList.add("night-edition");
      }

      const title = document.createElement("h4");
      title.textContent = getDisplayCity(club);
      card.append(title);

      if (club.isNight) {
        const nightChip = document.createElement("span");
        nightChip.className = "night-chip";
        nightChip.textContent = "At night";
        card.append(nightChip);
      }

      if (isPopupEvent(club, isoDate)) {
        const popupChip = document.createElement("span");
        popupChip.className = "popup-chip";
        popupChip.textContent = "Pop-Up";
        card.append(popupChip);
      }

      if (club.time || club.cadence) {
        const schedule = document.createElement("p");
        schedule.className = "detail-row";
        const scheduleLabel = club.time || club.cadence;
        schedule.textContent = scheduleLabel;
        card.append(schedule);
      }

      if (club.venue) {
        const venueRow = document.createElement("p");
        venueRow.className = "detail-row";

        const venueLabel = document.createElement("span");
        venueLabel.className = "detail-label";
        venueLabel.textContent = "Venue: ";

        const venueValue = document.createElement("span");
        venueValue.textContent = club.venue;

        venueRow.append(venueLabel, venueValue);
        card.append(venueRow);

        const mapLink = document.createElement("a");
        mapLink.className = "detail-action";
        mapLink.href = getMapURL(`${club.venue}, ${club.city}`);
        mapLink.target = "_blank";
        mapLink.rel = "noreferrer";
        mapLink.textContent = "Open in Google Maps";
        mapLink.addEventListener("click", () => {
          trackEvent("calendar_open_maps", {
            city: club.city,
            date: isoDate,
          });
        });
        card.append(mapLink);
      }

      appendContactLine(card, "Host", club.hostName);

      if (club.instagramHandles && club.instagramHandles.length) {
        const primary = document.createElement("p");
        primary.className = "detail-row";

        const label = document.createElement("span");
        label.className = "detail-label";
        label.textContent = "Primary Contact: ";
        primary.append(label);

        club.instagramHandles.forEach((handle, idx) => {
          if (idx > 0) primary.append(document.createTextNode(" + "));
          const igLink = document.createElement("a");
          igLink.href = `https://www.instagram.com/${handle.slice(1)}/`;
          igLink.target = "_blank";
          igLink.rel = "noreferrer";
          igLink.textContent = handle;
          primary.append(igLink);
        });
        card.append(primary);
      } else if (club.hostEmail) {
        appendContactLine(card, "Primary Contact", club.hostEmail);
      }

      selectedDateList.append(card);
    });
}

function renderCalendar() {
  const year = currentMonthDate.getFullYear();
  const monthIndex = currentMonthDate.getMonth();
  const monthEvents = buildMonthEvents(year, monthIndex);
  const daysInMonth = getDaysInMonth(year, monthIndex);
  const firstDay = new Date(year, monthIndex, 1).getDay();
  const mondayFirstOffset = (firstDay + 6) % 7;
  const todayIso = toISODate(
    new Date().getFullYear(),
    new Date().getMonth(),
    new Date().getDate(),
  );

  monthLabel.textContent = formatMonthTitle(year, monthIndex);
  const totalEvents = Array.from(monthEvents.values()).reduce(
    (sum, dayEntries) => sum + dayEntries.length,
    0,
  );
  monthSummary.textContent = `${totalEvents} scheduled meetup occurrences this month.`;

  calendarGrid.innerHTML = "";

  for (let i = 0; i < mondayFirstOffset; i += 1) {
    const empty = document.createElement("div");
    empty.className = "day-cell inactive";
    empty.setAttribute("aria-hidden", "true");
    calendarGrid.append(empty);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const iso = toISODate(year, monthIndex, day);
    const events = monthEvents.get(iso) || [];
    const hasNightEvents = events.some((event) => event.isNight);
    const hasPopupEvents = events.some((event) => isPopupEvent(event, iso));

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "day-cell";
    if (events.length) btn.classList.add("has-events");
    if (hasNightEvents) btn.classList.add("has-night-events");
    if (hasPopupEvents) btn.classList.add("has-popup-events");
    if (iso === selectedDateISO) btn.classList.add("selected");
    if (iso === todayIso) btn.classList.add("today");
    btn.setAttribute("aria-label", `${formatDateLabel(iso)}: ${events.length} clubs`);

    if (hasNightEvents || hasPopupEvents) {
      const pins = document.createElement("div");
      pins.className = "day-pins";
      if (hasNightEvents) {
        const nightPin = document.createElement("div");
        nightPin.className = "day-pin night-pin";
        nightPin.textContent = "AT NIGHT";
        pins.append(nightPin);
      }
      if (hasPopupEvents) {
        const popupPin = document.createElement("div");
        popupPin.className = "day-pin popup-pin";
        popupPin.textContent = "POP-UP";
        pins.append(popupPin);
      }
      btn.append(pins);
    }

    const dayNumber = document.createElement("div");
    dayNumber.className = "day-number";
    dayNumber.textContent = String(day);

    const dayCount = document.createElement("div");
    dayCount.className = "day-count";
    dayCount.textContent = events.length
      ? `${events.length} club${events.length === 1 ? "" : "s"}`
      : "No clubs";

    btn.append(dayNumber, dayCount);
    btn.addEventListener("click", () => {
      selectedDateISO = iso;
      trackEvent("calendar_select_day", {
        date: iso,
        clubs: events.length,
      });
      renderCalendar();
      renderDayDetails(iso, monthEvents);
    });
    calendarGrid.append(btn);
  }

  if (!selectedDateISO || !selectedDateISO.startsWith(`${year}-${String(monthIndex + 1).padStart(2, "0")}`)) {
    selectedDateISO = toISODate(year, monthIndex, 1);
  }
  renderDayDetails(selectedDateISO, monthEvents);
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
        const cadence = (override.cadence || cells[1] || "").trim();
        const time = formatTimeLabel(override.time || cells[2] || "");
        const instagramHandles = collectInstagramHandles(cells[5] || "", override);
        const hostEmail = extractEmail(cells[4] || "");
        return {
          city,
          displayCity: override.displayCity || city,
          cadence,
          time,
          isNight: isNightClub(time, override.isNight),
          venue: override.venue || getVenue(cells[8] || "", cells[9] || ""),
          hostName: override.hostDisplay || cells[3] || "",
          hostEmail,
          instagramHandles,
          specificDates: override.specificDates || [],
          rule: getScheduleRule(cadence, time),
        };
      })
      .filter((club) => club.city);

    statusText.textContent = `${clubs.length} clubs loaded.`;
    statusText.classList.remove("error");
    renderCalendar();
  } catch (_error) {
    statusText.textContent = "Could not load calendar data right now.";
    statusText.classList.add("error");
  }
}

prevMonthBtn.addEventListener("click", () => {
  trackEvent("calendar_month_prev", {
    month: currentMonthDate.toISOString().slice(0, 7),
  });
  currentMonthDate = new Date(
    currentMonthDate.getFullYear(),
    currentMonthDate.getMonth() - 1,
    1,
  );
  selectedDateISO = null;
  renderCalendar();
});

nextMonthBtn.addEventListener("click", () => {
  trackEvent("calendar_month_next", {
    month: currentMonthDate.toISOString().slice(0, 7),
  });
  currentMonthDate = new Date(
    currentMonthDate.getFullYear(),
    currentMonthDate.getMonth() + 1,
    1,
  );
  selectedDateISO = null;
  renderCalendar();
});

todayBtn.addEventListener("click", () => {
  trackEvent("calendar_jump_today", {});
  currentMonthDate = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  selectedDateISO = toISODate(
    new Date().getFullYear(),
    new Date().getMonth(),
    new Date().getDate(),
  );
  renderCalendar();
});

loadClubs();
