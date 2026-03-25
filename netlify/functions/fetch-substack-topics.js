// Fetches the Breakfast Industries Substack RSS feed, parses each post's
// per-club recap sections, and returns a map of city → topic array.
//
// Called by the front-end word cloud to get real "what we talked about" data
// instead of (or blended with) the static curated topics.
//
// Response shape:
//   {
//     cities: {
//       "denver":     ["the Oscars", "personal brand", "spinning up your own thing", ...],
//       "vienna":     ["books & authors", "viennese coffee culture", "being freelance", ...],
//       ...
//     },
//     postCount: 15,
//     updated: "2026-03-21T18:00:00.000Z"
//   }

const FEED_URL = "https://breakfastindustries.substack.com/feed";

// ── HTML / XML helpers ──────────────────────────────────────────────────────

function stripHtml(html) {
  return html
    .replace(/<br\s*\/?>/gi, "\n")          // <br> → newline before stripping
    .replace(/<\/p>/gi, "\n")               // </p> → newline
    .replace(/<\/li>/gi, "\n")              // </li> → newline
    .replace(/<[^>]+>/g, " ")              // strip all remaining tags
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#x27;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&#\d+;/g, "")
    .replace(/[ \t]+/g, " ")               // collapse inline whitespace
    .trim();
}

// Extract items as { date, html } pairs from the RSS feed
function extractItemBlocks(xml) {
  const items = [];
  const itemRe = /<item>([\s\S]*?)<\/item>/g;
  let m;
  while ((m = itemRe.exec(xml)) !== null) {
    const item = m[1];
    const dateMatch  = item.match(/<pubDate>([^<]+)<\/pubDate>/);
    const cdataMatch = item.match(/<content:encoded><!\[CDATA\[([\s\S]*?)\]\]><\/content:encoded>/);
    if (!cdataMatch) continue;
    items.push({
      date: dateMatch ? new Date(dateMatch[1].trim()) : null,
      html: cdataMatch[1],
    });
  }
  return items;
}

// ── City name normalisation ─────────────────────────────────────────────────

function normaliseCity(raw) {
  return raw
    .toLowerCase()
    .replace(/\bme\b/g, "")         // "Portland ME" → "portland"
    .replace(/\bny\b/g, "")         // "New York NY" → "new york"
    .replace(/\bnj\b/g, "")
    .replace(/[^a-z0-9\s\-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// ── Topic cleaning ──────────────────────────────────────────────────────────

const SKIP_WORDS = new Set([
  "etc", "and", "but", "or", "so", "as", "at", "in", "on", "by", "for",
  "with", "the", "a", "an", "to", "of", "it", "is", "was", "we", "our",
  "us", "all", "not", "that", "this", "from", "about", "just", "had",
  "have", "how", "what", "when", "where", "why", "who", "new", "more",
  "breakfast club", "breakfast clubbing", "bk club",
]);

// Known image-caption / boilerplate fragments to reject
const BOILERPLATE_RE = /activate to view|larger image|click to|read more|subscribe|sign up|unsubscribe|view in browser|lnkd\.in|linkedin\.com|instagram\.com|https?:\/\//i;

function cleanTopic(raw) {
  const t = raw
    .replace(/^(the|a|an)\s+/i, "")
    .replace(/\s+/g, " ")
    .replace(/[^\w\s\-&'.!]/g, "")
    .trim()
    .toLowerCase();

  if (t.length < 5 || t.length > 50) return null;
  if (SKIP_WORDS.has(t)) return null;
  if (/^\d+$/.test(t)) return null;
  if (BOILERPLATE_RE.test(t)) return null;
  // Skip fragments that contain URL-like tokens
  if (/https?|www\.|\.com|\.org|lnkd/i.test(t)) return null;
  // Must have at least one actual letter word (not all symbols/numbers)
  if (!/[a-z]{2}/.test(t)) return null;

  return t;
}

function splitTopicString(str) {
  // Split on commas, semicolons, " and " — but keep short compound phrases intact
  return str
    .split(/,\s*|;\s*|\band\b/i)
    .map((s) => cleanTopic(s.trim()))
    .filter(Boolean);
}

// ── Per-club section parsing ────────────────────────────────────────────────

function extractTopicsFromSection(text) {
  const topics = new Set();

  // Pattern 1: explicit "talked/chatted/spoke about: X, Y, Z"
  const explicitRe = /(?:talked|chatted|spoke|discussed|conversation about|we (?:talked|chatted))\s*(?:about\s*)?[:\-–]\s*([^\n.]{5,300})/gi;
  let m;
  while ((m = explicitRe.exec(text)) !== null) {
    splitTopicString(m[1]).forEach((t) => topics.add(t));
  }

  // Pattern 2: "We talked about the X, Y, Z" (no colon, inline sentence)
  const inlineRe = /\bwe (?:talked|chatted|spoke|discussed)\s+about\s+([^.!?\n]{5,300})/gi;
  while ((m = inlineRe.exec(text)) !== null) {
    splitTopicString(m[1]).forEach((t) => topics.add(t));
  }

  // Pattern 3: bullet-style short lines after a recap intro
  // Lines 4–30 chars that look like topic fragments (capitalised, not full sentences)
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  // Find a line that signals a list is coming
  const listTriggerIdx = lines.findIndex((l) =>
    /(?:we talked about|topics?:|discussed:|:$)/i.test(l)
  );
  if (listTriggerIdx !== -1) {
    const listLines = lines.slice(listTriggerIdx + 1, listTriggerIdx + 20);
    for (const line of listLines) {
      // Stop if line looks like a new section header or long sentence
      if (line.length > 60 || /^breakfast club|^bk club|^per \w/i.test(line)) break;
      const t = cleanTopic(line);
      if (t) topics.add(t);
    }
  }

  return [...topics];
}

// ── Main RSS parser ─────────────────────────────────────────────────────────

function parseTopicsFromFeed(xml) {
  const cityTopics = {};  // normalised city name → Set of topics
  const cityDates  = {};  // normalised city name → most recent post Date
  const items = extractItemBlocks(xml);

  for (const { date, html } of items) {
    const text = stripHtml(html);

    // Split text on "Breakfast Club " to get per-club sections.
    // Each chunk starts with "[CITY NAME] [DATE] ..."
    const chunks = text.split(/Breakfast Club\s+/i);

    for (const chunk of chunks.slice(1)) { // skip anything before the first "Breakfast Club"
      // Extract city: everything before the first date pattern (DD.M.YY or M.DD.YY)
      // or before "Report" keyword, or before a newline — whichever comes first
      const cityMatch = chunk.match(/^([A-Za-z\s\-—–]+?)(?:\s+\d+\.\d+\.\d+|\s+Report\b|\n|$)/i);
      if (!cityMatch) continue;

      const rawCity = cityMatch[1].trim();
      if (rawCity.length < 3 || rawCity.length > 32) continue;
      // Skip if the "city" is just a noise word or common phrase fragment
      if (/^(report|the|a|an|and|or|is|was|in|on|at)$/i.test(rawCity)) continue;
      // City names shouldn't contain lowercase function verbs — that means we've grabbed a sentence fragment
      if (/\b(takes|happens|is|are|has|have|was|were|will|can|do|does|did|went|goes)\b/.test(rawCity)) continue;
      // City names are 1–4 words max
      if (rawCity.split(/\s+/).length > 4) continue;
      // Must start with a capital letter (proper noun)
      if (!/^[A-Z]/.test(rawCity)) continue;

      const city = normaliseCity(rawCity);
      if (!city) continue;

      // The rest of the chunk is the recap content
      const recapText = chunk.slice(cityMatch[0].length);
      const topics = extractTopicsFromSection(recapText);

      if (!cityTopics[city]) cityTopics[city] = new Set();
      topics.forEach((t) => cityTopics[city].add(t));

      // Track most recent post date for this city
      if (date && (!cityDates[city] || date > cityDates[city])) {
        cityDates[city] = date;
      }
    }
  }

  // Convert Sets → deduplicated arrays, capped at 20 per city
  const result = {};
  const dates  = {};
  for (const [city, topicSet] of Object.entries(cityTopics)) {
    const arr = [...topicSet].slice(0, 20);
    if (arr.length > 0) {
      result[city] = arr;
      if (cityDates[city]) dates[city] = cityDates[city].toISOString();
    }
  }

  return { cities: result, dates, postCount: items.length };
}

// ── Netlify handler ─────────────────────────────────────────────────────────

exports.handler = async function (event) {
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const headers = {
    "Content-Type":                "application/json",
    "Access-Control-Allow-Origin": "*",
    "Cache-Control":               "public, max-age=3600, s-maxage=21600",
  };

  try {
    const res = await fetch(FEED_URL, {
      headers: { "User-Agent": "breakfastclubbing.com word-cloud/1.0" },
    });

    if (!res.ok) {
      throw new Error(`Feed returned ${res.status}`);
    }

    const xml = await res.text();
    const { cities, dates, postCount } = parseTopicsFromFeed(xml);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        cities,
        dates,
        postCount,
        updated: new Date().toISOString(),
      }),
    };
  } catch (err) {
    console.error("fetch-substack-topics error:", err.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message, cities: {}, postCount: 0 }),
    };
  }
};
