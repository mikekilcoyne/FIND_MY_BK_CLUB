import { getConfiguredStore } from "./lib/blob-store.js";

export async function handler() {
  try {
    const store = getConfiguredStore("wwta-admin-topics", { consistency: "eventual" });
    const data = (await store.get("entries.json", { type: "json" })) || { entries: [] };

    const cities = {};
    for (const entry of (data.entries || [])) {
      const key = (entry.clubKey || "").toLowerCase().trim();
      if (!key) continue;
      if (!cities[key]) cities[key] = { photos: [], latestDate: null, topics: [] };

      for (const photoKey of (entry.photoKeys || [])) {
        cities[key].photos.push(`/.netlify/functions/get-flyer?key=${encodeURIComponent(photoKey)}`);
      }
      if (entry.photoURL) cities[key].photos.push(entry.photoURL);

      if (!cities[key].latestDate || (entry.date && entry.date > cities[key].latestDate)) {
        cities[key].latestDate = entry.date;
      }
      for (const t of (entry.topics || [])) {
        if (!cities[key].topics.includes(t)) cities[key].topics.push(t);
      }
    }

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=300",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ cities }),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
}
