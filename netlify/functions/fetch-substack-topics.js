const FEED_URL = "https://breakfastindustries.substack.com/feed";

function decodeHtml(value) {
  return (value || "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#x27;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&#8217;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&#8211;/g, "-")
    .replace(/&#8212;/g, "-")
    .replace(/&#8230;/g, "...")
    .replace(/&#\d+;/g, " ");
}

function stripHtml(html) {
  return decodeHtml(
    (html || "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<\/li>/gi, "\n")
      .replace(/<li[^>]*>/gi, "- ")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeCity(value) {
  return (value || "")
    .replace(/[—–]/g, "-")
    .toLowerCase()
    .replace(/\bme\b/g, "")
    .replace(/\bnj\b/g, "")
    .replace(/\bny\b/g, "")
    .replace(/\bca\b/g, "")
    .replace(/\buk\b/g, "")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const CITY_ALIASES = {
  dtbk: "downtown brooklyn",
  "downtown brooklyn": "downtown brooklyn",
  "hamptons": "hamptons",
  "williamsburg": "williamsburg",
  "hudson ny": "hudson",
  "hudson": "hudson",
  "portland or": "portland or",
  "pdx": "portland or",
  "sf": "san francisco",
  "san francisco": "san francisco",
  "cdmx": "mexico city",
  "mexico city": "mexico city",
  "dc": "washington dc",
  "washington dc": "washington dc",
  "soma": "soma",
  "soma new jersey": "soma",
  "milan": "milan",
  "milano": "milan",
  "manhattan": "manhattan",
  "miami": "miami",
  "cambridge": "cambridge",
  "toronto": "toronto",
  "paris": "paris",
  "copenhagen": "copenhagen",
  "boston": "boston",
  "panama city": "panama city",
  "los angeles": "los angeles",
  "la west": "los angeles",
  "la": "los angeles",
};

const SKIP_WORDS = new Set([
  "etc", "and", "but", "or", "so", "as", "at", "in", "on", "by", "for",
  "with", "the", "a", "an", "to", "of", "it", "is", "was", "we", "our",
  "us", "all", "not", "that", "this", "from", "about", "just", "had",
  "have", "how", "what", "when", "where", "why", "who", "new", "more",
  "breakfast club", "breakfast clubbing", "bk club",
]);

const BOILERPLATE_RE = /activate to view|larger image|click to|read more|subscribe|sign up|unsubscribe|view in browser|lnkd\.in|linkedin\.com|instagram\.com|https?:\/\//i;

function cleanTopic(raw) {
  const topic = decodeHtml(raw || "")
    .replace(/^(the|a|an)\s+/i, "")
    .replace(/\s+/g, " ")
    .replace(/[^\w\s\-&'.!?]/g, "")
    .trim()
    .toLowerCase();

  if (topic.length < 4 || topic.length > 64) return null;
  if (SKIP_WORDS.has(topic)) return null;
  if (/^\d+$/.test(topic)) return null;
  if (BOILERPLATE_RE.test(topic)) return null;
  if (/https?|www\.|\.com|\.org|lnkd/i.test(topic)) return null;
  if (!/[a-z]{2}/.test(topic)) return null;
  return topic;
}

function splitTopicString(value) {
  return decodeHtml(value || "")
    .split(/,\s*|;\s*|\band\b/gi)
    .map((part) => cleanTopic(part))
    .filter(Boolean);
}

function extractItemBlocks(xml) {
  const items = [];
  const itemRe = /<item>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRe.exec(xml)) !== null) {
    const item = match[1];
    const titleMatch = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/);
    const linkMatch = item.match(/<link>(.*?)<\/link>/);
    const dateMatch = item.match(/<pubDate>(.*?)<\/pubDate>/);
    const descriptionMatch = item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/);
    const htmlMatch = item.match(/<content:encoded><!\[CDATA\[([\s\S]*?)\]\]><\/content:encoded>/);
    if (!htmlMatch) continue;
    items.push({
      title: titleMatch ? decodeHtml(titleMatch[1]) : "",
      link: linkMatch ? linkMatch[1].trim() : "",
      description: descriptionMatch ? decodeHtml(descriptionMatch[1]) : "",
      date: dateMatch ? new Date(dateMatch[1].trim()) : null,
      html: htmlMatch[1],
    });
  }
  return items;
}

function resolveCityKey(rawCity) {
  const normalized = normalizeCity(rawCity);
  return CITY_ALIASES[normalized] || normalized;
}

function extractReportSections(html) {
  const sections = [];
  const headingRe = /<h[34][^>]*>([\s\S]*?)<\/h[34]>/gi;
  let match;
  while ((match = headingRe.exec(html)) !== null) {
    const headingText = stripHtml(match[1]).replace(/\s+/g, " ").trim();
    const cityMatch = headingText.match(/^Breakfast Club\s+(.+?)\s+(?:Report|Happy Hour)\b/i);
    if (!cityMatch) continue;
    sections.push({
      rawCity: decodeHtml(cityMatch[1]).replace(/\([^)]*\)/g, " ").trim(),
      headingIndex: match.index,
      bodyStart: headingRe.lastIndex,
    });
  }

  return sections.map((section, index) => {
    const endIndex = index + 1 < sections.length ? sections[index + 1].headingIndex : html.length;
    return {
      rawCity: section.rawCity,
      html: html.slice(section.bodyStart, endIndex),
    };
  });
}

function extractImageUrls(sectionHtml) {
  const urls = [];
  const imageRe = /<img[^>]+src="([^"]+)"/gi;
  let match;
  while ((match = imageRe.exec(sectionHtml)) !== null) {
    const url = decodeHtml(match[1]).trim();
    if (url && urls.indexOf(url) === -1) urls.push(url);
    if (urls.length >= 6) break;
  }
  return urls;
}

function extractTopicsFromSection(text) {
  const topics = new Set();
  const patterns = [
    /(?:talked|chatted|spoke|discussed)\s*(?:about)?\s*[:\-–]\s*([^\n.]{5,400})/gi,
    /\bwe (?:talked|chatted|spoke|discussed)\s+about\s+([^.!?\n]{5,400})/gi,
    /(?:including|included|covering|covered, including|ground was covered, including)\s*[:\-–]\s*([^\n]{5,500})/gi,
    /(?:topics?|highlights?)\s*[:\-–]\s*([^\n]{5,500})/gi,
  ];

  patterns.forEach((pattern) => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      splitTopicString(match[1]).forEach((topic) => topics.add(topic));
    }
  });

  const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
  const listTriggerIdx = lines.findIndex((line) => /(?:including|topics?:|discussed:|covered:|talked about)/i.test(line));
  if (listTriggerIdx !== -1) {
    const listLines = lines.slice(listTriggerIdx + 1, listTriggerIdx + 10);
    listLines.forEach((line) => {
      if (line.length > 70) return;
      const cleaned = cleanTopic(line.replace(/^-+\s*/, ""));
      if (cleaned) topics.add(cleaned);
    });
  }

  return Array.from(topics).slice(0, 16);
}

function parseFeed(xml) {
  const result = {};
  const items = extractItemBlocks(xml);

  items.forEach((item) => {
    extractReportSections(item.html).forEach((section) => {
      const key = resolveCityKey(section.rawCity);
      if (!key) return;

      const text = stripHtml(section.html);
      const topics = extractTopicsFromSection(text);
      const photos = extractImageUrls(section.html);

      if (!result[key]) {
        result[key] = {
          topics: [],
          photos: [],
          sourceDate: item.date ? item.date.toISOString() : "",
          sourceUrl: item.link,
          sourceTitle: item.title,
          sourceType: "substack",
          photoTreatment: "polaroid-frame",
        };
      }

      topics.forEach((topic) => {
        if (result[key].topics.indexOf(topic) === -1 && result[key].topics.length < 16) {
          result[key].topics.push(topic);
        }
      });

      photos.forEach((photo) => {
        if (result[key].photos.indexOf(photo) === -1 && result[key].photos.length < 6) {
          result[key].photos.push(photo);
        }
      });

      if (item.date && (!result[key].sourceDate || new Date(item.date) > new Date(result[key].sourceDate))) {
        result[key].sourceDate = item.date.toISOString();
        result[key].sourceUrl = item.link;
        result[key].sourceTitle = item.title;
      }
    });
  });

  return {
    updated: new Date().toISOString(),
    postCount: items.length,
    cities: result,
  };
}

exports.handler = async function (event) {
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "public, max-age=3600, s-maxage=21600",
  };

  try {
    const response = await fetch(FEED_URL, {
      headers: { "User-Agent": "breakfastclubbing.com wwta/1.0" },
    });

    if (!response.ok) {
      throw new Error("Feed returned " + response.status);
    }

    const xml = await response.text();
    return {
      statusCode: 200,
      headers: headers,
      body: JSON.stringify(parseFeed(xml)),
    };
  } catch (error) {
    console.error("fetch-substack-topics error:", error.message);
    return {
      statusCode: 500,
      headers: headers,
      body: JSON.stringify({ error: error.message, cities: {}, postCount: 0 }),
    };
  }
};
