(function () {
  const SHEET_CSV_URL =
    "https://docs.google.com/spreadsheets/d/1_4MoIXgSHjERztj0LPPC-XAa7nzFlfrdcjEQdBeSqto/export?format=csv&gid=105813476";
  const LOCAL_SHEET_CSV_URL = "./data/clubs-sheet-local.csv";

  function normalize(value) {
    return (value || "").toLowerCase().trim();
  }

  function normalizeCityKey(value) {
    return normalize(value).replace(/[\u2014\u2013]/g, "-");
  }

  function shouldHideClub(city) {
    const key = normalize(city);
    return key === "austin" || key === "austin, tx";
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

    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      return raw;
    }

    const monthDay = raw.match(/^(\d{1,2})\s+([A-Za-z]+)$/);
    if (monthDay) {
      const currentYear = new Date().getFullYear();
      const parsed = new Date(`${monthDay[2]} ${monthDay[1]}, ${currentYear} 12:00:00`);
      if (!Number.isNaN(parsed.getTime())) {
        return toISODate(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
      }
    }

    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) {
      return toISODate(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
    }

    return "";
  }

  window.BKClubData = {
    SHEET_CSV_URL,
    LOCAL_SHEET_CSV_URL,
    normalize,
    normalizeCityKey,
    shouldHideClub,
    parseCSV,
    fetchSheetRows,
    createSheetAccess,
    getOverrideForCity,
    cleanLocationValue,
    getVenue,
    normalizeFlyer,
    extractInstagramHandles,
    extractInstagramURL,
    extractLinkedInURL,
    extractEmail,
    toISODate,
    parseSheetUpcomingDate,
  };
})();
