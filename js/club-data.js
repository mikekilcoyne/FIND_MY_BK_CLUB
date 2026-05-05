(function () {
  const SHEET_CSV_URL =
    "https://docs.google.com/spreadsheets/d/1_4MoIXgSHjERztj0LPPC-XAa7nzFlfrdcjEQdBeSqto/export?format=csv&gid=105813476";
  const LOCAL_SHEET_CSV_URL = "./data/clubs-sheet-local.csv";
  const LIVE_CLUB_OVERRIDES_URL = "/.netlify/functions/live-club-overrides";
  const LATEST_HAPPENINGS_MEDIA_URL = "./data/club-story-media.json";
  const LATEST_HAPPENINGS_CACHE_URL = "./data/wwta-substack-cache.json";
  const EXCLUDED_LATEST_HAPPENINGS_MEDIA = new Set([
    "./assets/photos/club_updates/las-vegas/00000109-photo-2026-03-23-15-27-10-e9119f81e9.jpg",
    "./assets/photos/club_updates/maplewood/00000001-photo-2026-03-13-11-02-58-c21e67f8b7.jpg",
    "./assets/photos/club_updates/maplewood/00000008-photo-2026-03-13-15-40-27-9f1e524f95.jpg",
    "./assets/photos/club_updates/milano/00000135-photo-2026-03-25-16-16-42-2495253451.jpg",
    "./assets/photos/club_updates/new-york-les/00000028-photo-2026-03-16-03-17-08-a48e5a826b.jpg",
    "https://substackcdn.com/image/fetch/$s_!OEM8!,w_1456,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F14777982-7368-4d8d-b1a2-51e020be826e.png",
  ]);
  let latestHappeningsLoadedPromise = null;
  let latestHappeningsCityKeys = new Set();
  let liveClubOverridesPromise = null;

  function normalize(value) {
    return (value || "").toLowerCase().trim();
  }

  function normalizeCityKey(value) {
    return normalize(value).replace(/[\u2014\u2013]/g, "-");
  }

  function shouldHideClub(city) {
    const key = normalize(city);
    return key === "";
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

  async function fetchSheetRows() {
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

    return {
      rows: parseCSV(csv),
      usedLocalSnapshot,
    };
  }

  function createSheetAccess(rows) {
    const headers = (rows[0] || []).map((h) => h.toLowerCase().replace(/[\s_]+/g, "_").trim());
    const colIdx = {};
    headers.forEach((h, i) => {
      colIdx[h] = i;
    });

    colIdx.start_time = colIdx.start_time ?? colIdx["start time"];
    colIdx.whatsapp = colIdx.whatsapp ?? colIdx.whatsapp_link ?? colIdx.community_link;
    colIdx.host_linkedin_2 = colIdx.host_linkedin_2 ?? colIdx["host_linkedin 2"];

    function col(name, cells) {
      return (cells[colIdx[name]] || "").trim();
    }

    return { headers, colIdx, col };
  }

  function getOverrideForCity(city) {
    const overrides = window.CLUB_OVERRIDES || {};
    return overrides[normalizeCityKey(city)] || {};
  }

  function dedupeSocialItems(items) {
    const seen = new Set();
    return (items || []).filter((item) => {
      if (!item || !item.type || !item.url) return false;
      const key = `${String(item.type).toLowerCase()}|${String(item.url).replace(/\/$/, "")}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function mergeSocialItems(existing, incoming) {
    const merged = [...(existing || [])];

    (incoming || []).forEach((nextItem) => {
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

    return dedupeSocialItems(merged);
  }

  function mergeRuntimePatch(base, patch) {
    const next = { ...(base || {}), ...(patch || {}) };
    if ((base && base.extraSocials) || (patch && patch.extraSocials)) {
      next.extraSocials = mergeSocialItems(
        (base && base.extraSocials) || [],
        (patch && patch.extraSocials) || [],
      );
    }
    return next;
  }

  function patchMatchesClubLabel(clubLabel, overrideKey, overrideValue) {
    const target = normalizeCityKey(clubLabel);
    if (!target) return false;
    return [
      normalizeCityKey(overrideKey),
      normalizeCityKey(overrideValue && overrideValue.displayCity),
      normalizeCityKey(overrideValue && overrideValue.city),
    ].includes(target);
  }

  function applyLiveOverrideItem(item) {
    if (!item || !item.club || !item.patch) return;

    const overrides = window.CLUB_OVERRIDES || (window.CLUB_OVERRIDES = {});
    let matchedOverride = false;

    Object.keys(overrides).forEach((overrideKey) => {
      const current = overrides[overrideKey] || {};
      if (!patchMatchesClubLabel(item.club, overrideKey, current)) return;
      overrides[overrideKey] = mergeRuntimePatch(current, item.patch);
      matchedOverride = true;
    });

    if (!matchedOverride) {
      const fallbackKey = normalizeCityKey(item.club);
      if (fallbackKey) {
        overrides[fallbackKey] = mergeRuntimePatch(overrides[fallbackKey] || {}, item.patch);
      }
    }

    if (Array.isArray(window.STATIC_CLUBS)) {
      window.STATIC_CLUBS = window.STATIC_CLUBS.map((club) => {
        if (!patchMatchesClubLabel(item.club, club && club.city, club)) return club;
        return mergeRuntimePatch(club, item.patch);
      });
    }
  }

  async function loadLiveClubOverrides() {
    if (liveClubOverridesPromise) return liveClubOverridesPromise;

    liveClubOverridesPromise = fetch(LIVE_CLUB_OVERRIDES_URL)
      .then((res) => {
        if (!res.ok) throw new Error(`live overrides HTTP ${res.status}`);
        return res.json();
      })
      .then((snapshot) => {
        Object.values((snapshot && snapshot.items) || {}).forEach(applyLiveOverrideItem);
        return snapshot;
      })
      .catch(() => ({ items: {} }));

    return liveClubOverridesPromise;
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
    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (match) return `https://drive.google.com/uc?export=view&id=${match[1]}`;
    const match2 = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (match2) return `https://drive.google.com/uc?export=view&id=${match2[1]}`;
    return url;
  }

  function extractInstagramHandles(value) {
    const raw = (value || "").trim();
    if (!raw) return [];
    const matches = raw.match(/@[A-Za-z0-9._]+/g) || [];
    return [...new Set(matches)];
  }

  function extractInstagramURL(value) {
    const handles = extractInstagramHandles(value);
    if (!handles.length) return "";
    const handle = handles[0].replace(/^@/, "");
    return handle ? `https://www.instagram.com/${handle}/` : "";
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

  function extractEmail(value) {
    const raw = (value || "").trim();
    if (!raw) return "";
    const match = raw.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/);
    return match ? match[0] : "";
  }

  function toISODate(year, monthIndex, day) {
    return `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  function parseSheetUpcomingDate(value) {
    const raw = (value || "").trim();
    if (!raw) return "";
    const currentYear = new Date().getFullYear();

    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      return raw;
    }

    const cleaned = raw.replace(/(\d)(st|nd|rd|th)\b/gi, "$1").replace(/\s+/g, " ").trim();

    const dayMonth = cleaned.match(/^(\d{1,2})\s+([A-Za-z]+)$/);
    if (dayMonth) {
      const parsed = new Date(`${dayMonth[2]} ${dayMonth[1]}, ${currentYear} 12:00:00`);
      if (!Number.isNaN(parsed.getTime())) {
        return toISODate(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
      }
    }

    const monthDay = cleaned.match(/^([A-Za-z]+)\s+(\d{1,2})(?:,\s*(\d{4}))?$/);
    if (monthDay) {
      const year = Number(monthDay[3]) || currentYear;
      const parsed = new Date(`${monthDay[1]} ${monthDay[2]}, ${year} 12:00:00`);
      if (!Number.isNaN(parsed.getTime())) {
        return toISODate(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
      }
    }

    const slashMonthDay = cleaned.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
    if (slashMonthDay) {
      let year = Number(slashMonthDay[3]) || currentYear;
      if (year < 100) year += 2000;
      const parsed = new Date(year, Number(slashMonthDay[1]) - 1, Number(slashMonthDay[2]), 12);
      if (!Number.isNaN(parsed.getTime())) {
        return toISODate(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
      }
    }

    const parsed = new Date(cleaned);
    if (!Number.isNaN(parsed.getTime())) {
      return toISODate(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
    }

    return "";
  }

  function buildLatestHappeningsKeys(value, options = {}) {
    const { loose = true } = options;
    const raw = normalize(value || "")
      .replace(/[\u2014\u2013]/g, "-")
      .replace(/\s+/g, " ")
      .replace(/\s*-\s*/g, " - ")
      .trim();
    if (!raw) return [];

    const keys = new Set();
    const addKey = (candidate) => {
      const normalized = normalize(candidate || "")
        .replace(/[\u2014\u2013]/g, "-")
        .replace(/\s+/g, " ")
        .replace(/\s*-\s*/g, " - ")
        .trim();
      if (normalized) keys.add(normalized);
    };
    const addCommaStripped = (candidate) => {
      addKey(candidate);
      if (loose) addKey(String(candidate || "").replace(/,\s*[a-z]{2,3}$/i, ""));
    };

    addCommaStripped(raw);

    if (/^[a-z0-9-]+$/.test(raw) && raw.includes("-")) {
      const spaced = raw.replace(/-/g, " ");
      addCommaStripped(spaced);

      if (raw.startsWith("new-york-")) {
        const tail = raw.replace(/^new-york-/, "").replace(/-/g, " ").trim();
        addCommaStripped(`new york - ${tail}`);
        addCommaStripped(`ny - ${tail}`);
        addCommaStripped(tail);
      }
    }

    if (raw.startsWith("new york - ")) {
      const tail = raw.replace(/^new york - /, "").trim();
      addCommaStripped(`ny - ${tail}`);
      addCommaStripped(tail);
    }

    if (raw.startsWith("ny - ")) {
      const tail = raw.replace(/^ny - /, "").trim();
      addCommaStripped(`new york - ${tail}`);
      addCommaStripped(tail);
    }

    return Array.from(keys);
  }

  function getApprovedLatestHappeningsMediaPhotos(club) {
    return (Array.isArray(club && club.photos) ? club.photos : []).filter(
      (photo) => photo && !EXCLUDED_LATEST_HAPPENINGS_MEDIA.has(photo),
    );
  }

  async function loadLatestHappeningsRegistry() {
    if (latestHappeningsLoadedPromise) return latestHappeningsLoadedPromise;

    latestHappeningsLoadedPromise = Promise.all([
      fetch(LATEST_HAPPENINGS_MEDIA_URL).then((res) => {
        if (!res.ok) throw new Error(`media HTTP ${res.status}`);
        return res.json();
      }).catch(() => ({ clubs: [] })),
      fetch(LATEST_HAPPENINGS_CACHE_URL).then((res) => {
        if (!res.ok) throw new Error(`cache HTTP ${res.status}`);
        return res.json();
      }).catch(() => ({ cities: {} })),
    ]).then(([mediaData, cacheData]) => {
      const nextKeys = new Set();

      (mediaData.clubs || []).forEach((club) => {
        const approvedPhotos = getApprovedLatestHappeningsMediaPhotos(club);
        if (!club || !approvedPhotos.length) return;
        buildLatestHappeningsKeys(club.slug).forEach((key) => nextKeys.add(key));
        buildLatestHappeningsKeys(club.displayName).forEach((key) => nextKeys.add(key));
      });

      Object.entries(cacheData.cities || {}).forEach(([cityKey, record]) => {
        if (!record || !Array.isArray(record.photos) || !record.photos.length) return;
        buildLatestHappeningsKeys(cityKey).forEach((key) => nextKeys.add(key));
      });

      latestHappeningsCityKeys = nextKeys;
      return latestHappeningsCityKeys;
    }).catch(() => {
      latestHappeningsCityKeys = new Set();
      return latestHappeningsCityKeys;
    });

    return latestHappeningsLoadedPromise;
  }

  function clubHasLatestHappenings(club) {
    const displayCity = (club && (club.displayCity || club.city)) || "";
    const city = (club && club.city) || "";
    const useLooseDisplayMatch = !/,/.test(displayCity);
    const useLooseCityMatch = !/,/.test(city);

    return buildLatestHappeningsKeys(displayCity, { loose: useLooseDisplayMatch }).some(
      (key) => latestHappeningsCityKeys.has(key),
    ) || buildLatestHappeningsKeys(city, { loose: useLooseCityMatch }).some(
      (key) => latestHappeningsCityKeys.has(key),
    );
  }

  function renderLatestHappeningsButton(club) {
    const link = document.createElement("a");
    const displayCity = (club && (club.displayCity || club.city)) || "";
    const cityParam = encodeURIComponent((club && (club.city || displayCity) || "").trim());
    link.href = `./what-we-talked-about.html?city=${cityParam}`;
    link.className = "card-latest-happenings-btn";
    link.setAttribute("aria-label", `Open Latest Happenings for ${displayCity}`);
    link.innerHTML =
      '<span class="card-latest-happenings-btn__badge" aria-hidden="true">NEW</span>' +
      '<span class="card-latest-happenings-btn__label">Latest happenings...</span>';
    return link;
  }

  window.BKClubData = {
    SHEET_CSV_URL,
    LOCAL_SHEET_CSV_URL,
    LATEST_HAPPENINGS_MEDIA_URL,
    LATEST_HAPPENINGS_CACHE_URL,
    normalize,
    normalizeCityKey,
    shouldHideClub,
    parseCSV,
    fetchSheetRows,
    createSheetAccess,
    getOverrideForCity,
    loadLiveClubOverrides,
    cleanLocationValue,
    getVenue,
    normalizeFlyer,
    extractInstagramHandles,
    extractInstagramURL,
    extractLinkedInURL,
    extractEmail,
    toISODate,
    parseSheetUpcomingDate,
    buildLatestHappeningsKeys,
    loadLatestHappeningsRegistry,
    clubHasLatestHappenings,
    renderLatestHappeningsButton,
  };
})();
