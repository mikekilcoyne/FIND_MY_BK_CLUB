(function () {
  "use strict";

  // ── Config ─────────────────────────────────────────────────────────────────

  const SPOTLIGHT_FIRST_DELAY = 9000;  // ms before first spotlight fires
  const SPOTLIGHT_INTERVAL    = 22000; // ms between spotlights
  const SPOTLIGHT_DURATION    = 4600;  // ms spotlight animation plays

  // Brand palette — used to colour words; mostly near-ink with accent greens
  const WORD_COLORS = [
    "#111111", "#111111", "#111111", // weighted toward ink
    "#173157",                        // night-sky navy
    "#0d6e43",                        // brand green
  ];

  // ── Config ─────────────────────────────────────────────────────────────────

  const PHOTO_CYCLE_INTERVAL = 9000; // ms between polaroid shuffles in photo-bg mode

  // ── State ──────────────────────────────────────────────────────────────────

  let currentRegion  = "All";
  let isRendering    = false;
  let spotlightTimer = null;
  let spotlightQueue = [];   // shuffled deck of spotlight indices
  let liveTopicsLoaded = false;
  let photoCycleTimer  = null; // interval handle for polaroid cycling
  let overlayTypeTimers = [];
  const liveDates = {}; // normalised city key → ISO date string from Substack recap

  // ── Helpers ────────────────────────────────────────────────────────────────

  function randBetween(min, max) {
    return min + Math.random() * (max - min);
  }

  function randInt(min, max) {
    return Math.floor(randBetween(min, max));
  }

  function shuffleArray(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = randInt(0, i + 1);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function pickColor() {
    return WORD_COLORS[randInt(0, WORD_COLORS.length)];
  }

  function clearOverlayTyping() {
    overlayTypeTimers.forEach(clearTimeout);
    overlayTypeTimers = [];

    const preambleEl = document.getElementById("wc-overlay-preamble");
    if (preambleEl) {
      preambleEl.classList.remove("wc-overlay-preamble--typing");
      preambleEl.classList.remove("wc-overlay-preamble--active");
    }
  }

  function typeOverlayPreamble(text) {
    const preambleEl = document.getElementById("wc-overlay-preamble");
    const preambleTextEl = document.getElementById("wc-overlay-preamble-text");
    if (!preambleEl || !preambleTextEl) return;

    clearOverlayTyping();
    preambleTextEl.textContent = "";
    preambleEl.classList.add("wc-overlay-preamble--active");
    preambleEl.classList.add("wc-overlay-preamble--typing");

    let delay = 220;
    for (let i = 0; i < text.length; i += 1) {
      const nextDelay = delay;
      overlayTypeTimers.push(setTimeout(function () {
        preambleTextEl.textContent = text.slice(0, i + 1);
        if (i === text.length - 1) {
          preambleEl.classList.remove("wc-overlay-preamble--typing");
        }
      }, nextDelay));

      const ch = text.charAt(i);
      delay += ch === "." ? 180 : ch === " " ? 60 : 85;
    }
  }

  function typeOverlayWordsSequentially(wordSpans) {
    if (!wordSpans || wordSpans.length === 0) return;

    let totalDelay = 360;

    wordSpans.forEach((span) => {
      const fullText = span.dataset.fullText || "";
      span.textContent = "";

      overlayTypeTimers.push(setTimeout(function () {
        span.classList.add("wc-overlay-word--visible");
      }, totalDelay));

      for (let i = 0; i < fullText.length; i += 1) {
        const nextDelay = totalDelay;
        overlayTypeTimers.push(setTimeout(function () {
          span.textContent = fullText.slice(0, i + 1);
        }, nextDelay));

        const ch = fullText.charAt(i);
        totalDelay += ch === " " ? 18 : ch === "-" ? 28 : 34;
      }

      totalDelay += 95;
    });
  }

  // ── Photo cycling (scatter-bg mode) ────────────────────────────────────────

  function startPhotoCycle(photos) {
    stopPhotoCycle();
    if (!photos || photos.length <= 1) return;

    let idx = 0;

    photoCycleTimer = setInterval(function () {
      idx = (idx + 1) % photos.length;
      const img = document.querySelector(".wc-overlay-bg-photo");
      if (!img || !img.parentNode) return;

      img.style.transition = "opacity 0.8s ease";
      img.style.opacity    = "0";
      setTimeout(function () {
        if (img.parentNode) {
          img.classList.remove("wc-overlay-bg-photo--push");
          img.src           = photos[idx];
          img.style.opacity = "1";
          void img.offsetWidth;
          img.classList.add("wc-overlay-bg-photo--push");
        }
      }, 820);
    }, PHOTO_CYCLE_INTERVAL);
  }

  function stopPhotoCycle() {
    if (photoCycleTimer) {
      clearInterval(photoCycleTimer);
      photoCycleTimer = null;
    }
  }

  // ── Topic building ─────────────────────────────────────────────────────────

  function getTopicsForRegion(region) {
    const primary = WC_TOPICS[region] || [];
    const fallback = WC_TOPICS["All"] || [];

    if (region === "All") return fallback;

    // Blend region-specific topics with attenuated global topics
    const combined = [...primary];
    fallback.forEach(([word, wt]) => {
      if (!combined.find(([w]) => w === word)) {
        combined.push([word, Math.max(2, Math.floor(wt * 0.35))]);
      }
    });
    return combined;
  }

  // ── Word cloud render ──────────────────────────────────────────────────────

  function renderCloud(region) {
    if (typeof WordCloud === "undefined") return;

    const stage = document.getElementById("word-cloud-stage");
    if (!stage) return;

    if (isRendering) return;
    isRendering = true;

    // Fade out, clear, then re-render
    stage.classList.remove("wc-ready");
    stage.classList.add("wc-fading");

    setTimeout(() => {
      stage.innerHTML = "";
      stage.classList.remove("wc-fading");

      const list   = getTopicsForRegion(region);
      const stageW = stage.offsetWidth  || 800;
      const stageH = stage.offsetHeight || 600;

      WordCloud(stage, {
        list,
        fontFamily:   '"Helvetica Neue", Helvetica, Arial, sans-serif',
        fontWeight:   "300",
        color:        pickColor,
        rotateRatio:  0,               // all horizontal — cleaner look
        backgroundColor: "transparent",
        gridSize:     Math.max(8, Math.round(stageW / 55)),
        weightFactor: function (size) {
          // Scale so largest words reach ~32px, smallest ~10px
          const scale = stageW / 900;
          return Math.max(10, Math.round(size * 2.6 * scale));
        },
        drawOutOfBound: false,
        shrinkToFit:  true,
        origin:       [stageW / 2, stageH / 2],
      });

      stage.addEventListener("wordcloudstop", function onStop() {
        stage.removeEventListener("wordcloudstop", onStop);
        postProcessWords(stage);
        stage.classList.add("wc-ready");
        isRendering = false;
      }, { once: true });

    }, 300);
  }

  // After WordCloud2 renders, tag each span with our class + drift CSS vars
  function postProcessWords(stage) {
    // WordCloud2 in DOM mode creates spans with inline position styles
    stage.querySelectorAll("span[style]").forEach((span) => {
      span.classList.add("wc-word");

      // Unique drift path per word
      span.style.setProperty("--wc-dx1", `${randInt(-14, 14)}px`);
      span.style.setProperty("--wc-dy1", `${randInt(-18,  4)}px`);
      span.style.setProperty("--wc-dx2", `${randInt(-10, 10)}px`);
      span.style.setProperty("--wc-dy2", `${randInt(-28, -6)}px`);
      span.style.setProperty("--wc-dx3", `${randInt(-14, 14)}px`);
      span.style.setProperty("--wc-dy3", `${randInt(-16,  6)}px`);

      span.style.animationDuration = `${randBetween(18, 38)}s`;
      span.style.animationDelay    = `${randBetween(-35, 0)}s`; // offset so they're all mid-cycle
    });
  }

  // ── Spotlight cycle ────────────────────────────────────────────────────────

  function buildSpotlightQueue() {
    // Rebuild a shuffled deck of all WC_SPOTLIGHTS indices
    spotlightQueue = shuffleArray(
      WC_SPOTLIGHTS.map((_, i) => i)
    );
  }

  function nextSpotlightIndex() {
    if (spotlightQueue.length === 0) buildSpotlightQueue();
    return spotlightQueue.pop();
  }

  function candidateSpotlights(region) {
    if (region === "All") return WC_SPOTLIGHTS;
    return WC_SPOTLIGHTS.filter((s) => s.region === region);
  }

  function fireSpotlight() {
    let pool = candidateSpotlights(currentRegion);
    if (pool.length === 0) pool = WC_SPOTLIGHTS; // fallback to all

    const spotlight = pool[randInt(0, pool.length)];
    showSpotlight(spotlight);
  }

  function showSpotlight(spotlight) {
    // Remove any lingering cards
    document.querySelectorAll(".wc-spotlight-card").forEach((el) => el.remove());

    const card = document.createElement("div");
    card.className = "wc-spotlight-card";

    // Badge: use real recap date if available, else a generic label
    const spotKey = normaliseCity(spotlight.displayName);
    const dateISO = liveDates[spotKey];
    const badgeText = dateISO
      ? new Date(dateISO).toLocaleDateString("en-US", { month: "short", day: "numeric" })
      : "Recently";

    card.innerHTML =
      `<span class="wc-spotlight-card-badge">${badgeText}</span>` +
      `<span class="wc-spotlight-card-city">BK Club ${spotlight.displayName}</span>` +
      `<button class="wc-spotlight-card-cta">See what we talked about&nbsp;&rarr;</button>` +
      `<button class="wc-spotlight-card-close" aria-label="Dismiss">&times;</button>`;

    document.body.appendChild(card);

    // Illuminate matching words in the background cloud
    lightWords(spotlight.topics);

    function dismiss() {
      card.classList.add("wc-spotlight-card--out");
      setTimeout(() => { card.remove(); dimWords(); }, 350);
    }

    // CTA: find matching club button for full data, then open overlay
    card.querySelector(".wc-spotlight-card-cta").addEventListener("click", () => {
      card.remove();
      dimWords();
      const btns = Array.from(document.querySelectorAll("#clubs-list .wc-topics-btn"));
      const sKey = normaliseCity(spotlight.displayName);
      const btn = btns.find((b) => {
        const bKey = normaliseCity(b.dataset.city || "");
        return bKey.includes(sKey) || sKey.includes(bKey.split(" ")[0]);
      });
      overlayClubButtons = btns;
      if (btn) {
        overlayCurrentIdx = btns.indexOf(btn);
        openOverlay(btn.dataset.city, btn.dataset.displayCity,
                    btn.dataset.scheduleLabel, btn.dataset.eventTime, btn.dataset.venue);
      } else {
        overlayCurrentIdx = 0;
        openOverlay(spotlight.displayName.toLowerCase(), spotlight.displayName, "", "", "");
      }
    });

    // Close button
    card.querySelector(".wc-spotlight-card-close").addEventListener("click", dismiss);

    // Auto-dismiss
    setTimeout(() => { if (card.parentNode) dismiss(); }, SPOTLIGHT_DURATION);
  }

  function lightWords(topics) {
    const stage = document.getElementById("word-cloud-stage");
    if (!stage) return;

    const lowerTopics = topics.map((t) => t.toLowerCase());

    stage.querySelectorAll(".wc-word").forEach((span) => {
      const text = span.textContent.trim().toLowerCase();
      // Match exact phrase or first significant word
      const isMatch = lowerTopics.some((t) => {
        return t === text || text.includes(t.split(" ")[0]) || t.includes(text.split(" ")[0]);
      });
      if (isMatch) span.classList.add("wc-word--lit");
    });
  }

  function dimWords() {
    document.querySelectorAll(".wc-word--lit").forEach((s) =>
      s.classList.remove("wc-word--lit")
    );
  }

  function startSpotlightCycle() {
    buildSpotlightQueue();

    // First spotlight after initial delay
    setTimeout(fireSpotlight, SPOTLIGHT_FIRST_DELAY);

    // Recurring cycle
    spotlightTimer = setInterval(fireSpotlight, SPOTLIGHT_INTERVAL);
  }

  // ── Club overlay ───────────────────────────────────────────────────────────

  // Navigation state — list of all visible club buttons, current index
  let overlayClubButtons = [];
  let overlayCurrentIdx  = 0;

  // Word colors for light/cream background: ink, navy, green
  const OVERLAY_COLORS = [
    "#111111", "#111111", "#111111",  // ink — most words
    "#173157",                         // night-sky navy
    "#0d6e43",                         // brand green
    "#4a4a4a",                         // mid-grey
  ];
  const PHOTO_OVERLAY_COLORS = [
    "#ffffff", "#ffffff", "#f7f0e3",
    "#d9f2de", "#f4dfb6",
  ];
  const OVERLAY_ZONE_NAMES = [
    "top-left", "top", "top-right",
    "left", "right",
    "bottom-left", "bottom", "bottom-right",
  ];

  function overlayPickColor(usePhotoPalette) {
    const palette = usePhotoPalette ? PHOTO_OVERLAY_COLORS : OVERLAY_COLORS;
    return palette[randInt(0, palette.length)];
  }

  // Short-name aliases: sheet city key → spotlight displayName for tricky matches
  const CITY_ALIASES = {
    "maplewood, nj":        "SOMa",
    "soma":                 "SOMa",
    "dtbk":                 "Brooklyn",
    "new york — downtown brooklyn": "Brooklyn",
    "new york — williamsburg":      "Brooklyn",
    "new york - hamptons":  "Hamptons",
    "new york — hamptons":  "Hamptons",
  };

  function getSpotlightForCity(cityKey) {
    if (!cityKey) return null;
    const key = normaliseCity(cityKey);
    const aliasValue = CITY_ALIASES[cityKey.toLowerCase().trim()] || CITY_ALIASES[key] || "";
    const aliased = aliasValue ? normaliseCity(aliasValue) : "";
    const candidates = WC_SPOTLIGHTS.map((spotlight) => ({
      spotlight,
      sKey: normaliseCity(spotlight.displayName),
    }));

    const exactMatch = candidates.find(({ sKey }) => sKey === key || (aliased && sKey === aliased));
    if (exactMatch) return exactMatch.spotlight;

    const partialMatches = candidates
      .filter(({ sKey }) =>
        key.includes(sKey) ||
        sKey.includes(key) ||
        sKey.split(" ")[0] === key.split(" ")[0] ||
        (aliased && (aliased.includes(sKey) || sKey.includes(aliased)))
      )
      .sort((a, b) => b.sKey.length - a.sKey.length);

    return partialMatches.length > 0 ? partialMatches[0].spotlight : null;
  }

  function getTopicsForCity(cityKey) {
    if (!cityKey) return [];
    const key = normaliseCity(cityKey);
    const match = getSpotlightForCity(cityKey);
    if (match && match.topics.length > 0) return match.topics;

    // Fall back to regional topics for that city's region
    const region = (typeof CITY_REGION !== "undefined" && CITY_REGION[key]) || null;
    if (region && WC_TOPICS[region]) {
      return WC_TOPICS[region].slice(0, 12).map(([w]) => w);
    }

    return WC_TOPICS["All"].slice(0, 10).map(([w]) => w);
  }

  function getOverlayZoneOrder(width) {
    if (width <= 540) return ["top"];
    if (width <= 860) return ["top", "left", "right", "bottom", "top-left", "top-right"];
    return ["top", "left", "right", "bottom", "top-left", "top-right", "bottom-left", "bottom-right"];
  }

  function getOverlayChipMax(zoneName, stageWidth) {
    if (zoneName === "top" || zoneName === "bottom") {
      return Math.min(320, Math.max(220, Math.round(stageWidth * 0.26)));
    }
    return Math.min(280, Math.max(170, Math.round(stageWidth * 0.19)));
  }

  function renderOverlayWords(stage, wordList, usePhotoPalette) {
    const stageWidth = stage.offsetWidth || window.innerWidth || 900;
    const zoneOrder = getOverlayZoneOrder(stageWidth);
    const zoneBuckets = new Map(OVERLAY_ZONE_NAMES.map((name) => [name, []]));
    const sizeScale = stageWidth <= 540 ? 0.84 : stageWidth <= 860 ? 0.94 : 1.08;
    const typingSpans = [];

    wordList.forEach((item, index) => {
      const zoneName = zoneOrder[index % zoneOrder.length];
      zoneBuckets.get(zoneName).push({ ...item, index, zoneName });
    });

    stage.innerHTML = "";
    stage.classList.add("wc-overlay-stage--zones");

    OVERLAY_ZONE_NAMES.forEach((zoneName) => {
      const zone = document.createElement("div");
      zone.className = `wc-overlay-zone wc-overlay-zone--${zoneName}`;

      const items = zoneBuckets.get(zoneName) || [];
      items.forEach(({ text, weight, index }) => {
        const px = Math.min(30, Math.max(14, Math.round(weight * 2.15 * sizeScale)));
        const span = document.createElement("span");
        span.dataset.fullText = text.toUpperCase();
        span.dataset.typingIndex = String(index);
        span.className = "wc-overlay-word";
        span.style.fontSize = px + "px";
        span.style.color = overlayPickColor(usePhotoPalette);
        span.style.setProperty("--wc-chip-max", `${getOverlayChipMax(zoneName, stageWidth)}px`);
        span.style.setProperty("--wc-target-opacity", String(randBetween(0.8, 0.96)));
        span.style.setProperty("--wc-dx1", `${randInt(-6, 6)}px`);
        span.style.setProperty("--wc-dy1", `${randInt(-12, 4)}px`);
        span.style.setProperty("--wc-dx2", `${randInt(-8, 8)}px`);
        span.style.setProperty("--wc-dy2", `${randInt(-18, -4)}px`);
        span.style.setProperty("--wc-dx3", `${randInt(-6, 6)}px`);
        span.style.setProperty("--wc-dy3", `${randInt(-10, 6)}px`);
        span.style.animationDuration = `${randBetween(18, 32)}s`;
        span.style.animationDelay = `${randBetween(-18, 0)}s`;
        zone.appendChild(span);
        typingSpans.push(span);
      });

      stage.appendChild(zone);
    });

    typingSpans.sort((a, b) => Number(a.dataset.typingIndex) - Number(b.dataset.typingIndex));
    typeOverlayWordsSequentially(typingSpans);
  }

  function openOverlay(cityKey, displayCity, scheduleLabel, eventTime, venue) {
    const overlay       = document.getElementById("wc-overlay");
    const stage         = document.getElementById("wc-overlay-stage");
    const cityLabel     = document.getElementById("wc-overlay-city");
    const metaEl        = document.getElementById("wc-overlay-meta");
    const sourceDateEl  = document.getElementById("wc-overlay-source-date");
    const attributionEl = document.getElementById("wc-overlay-attribution");
    const artEl         = document.getElementById("wc-overlay-art");
    const photoEl       = document.getElementById("wc-overlay-photo");
    if (!overlay || !stage) return;

    // Set title — strip country suffix for cleaner look (e.g. "Amsterdam, NL" → "Amsterdam")
    const cleanCity = (displayCity || cityKey || "").replace(/,\s*[A-Z]{2}$/, "").trim();
    cityLabel.textContent = "BK Club " + cleanCity;

    // Set meta line: "Artie's  |  Weekly  |  9:15 AM"
    if (metaEl) {
      const parts = [];
      if (venue) {
        // Show just the venue name (before the first comma)
        const commaIdx = venue.indexOf(",");
        parts.push(commaIdx > -1 ? venue.slice(0, commaIdx).trim() : venue);
      }
      if (scheduleLabel) parts.push(scheduleLabel);
      if (eventTime)     parts.push(eventTime);
      metaEl.textContent = parts.join("  |  ");
    }

    // Look up spotlight data (photo/photos, attribution, topics)
    const spotlight    = getSpotlightForCity(cityKey);
    const photos       = spotlight && spotlight.photos && spotlight.photos.length > 0
                           ? spotlight.photos : null;
    const photoURL     = !photos && spotlight && spotlight.photo ? spotlight.photo : null;
    const attribution  = spotlight && spotlight.attribution ? spotlight.attribution : null;
    const usePhotoMode = Boolean(photos);

    typeOverlayPreamble("What we talked about...");

    // ── Scatter-photo background ──
    // When spotlight has a `photos` array, scatter polaroids as full-bg; otherwise remove.
    stopPhotoCycle();
    let bgPhotosEl = overlay.querySelector(".wc-overlay-bg-photos");
    if (photos) {
      overlay.classList.add("wc-overlay--photo-bg");
      if (!bgPhotosEl) {
        bgPhotosEl = document.createElement("div");
        bgPhotosEl.className = "wc-overlay-bg-photos";
        bgPhotosEl.setAttribute("aria-hidden", "true");
        overlay.insertBefore(bgPhotosEl, overlay.firstChild);
      }
      bgPhotosEl.innerHTML = '<img class="wc-overlay-bg-photo wc-overlay-bg-photo--push" src="' + photos[0] + '" alt="" aria-hidden="true">';
      startPhotoCycle(photos);
    } else {
      overlay.classList.remove("wc-overlay--photo-bg");
      if (bgPhotosEl) { bgPhotosEl.remove(); }
    }

    // Source date flag: "from March 10, 2026 recap"
    if (sourceDateEl) {
      const spotKey = spotlight ? normaliseCity(spotlight.displayName) : null;
      const dateISO = (spotKey && liveDates[spotKey]) ||
                      liveDates[normaliseCity(cityKey)] ||
                      liveDates[normaliseCity(cleanCity)];
      if (dateISO) {
        const d = new Date(dateISO);
        const formatted = d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
        sourceDateEl.textContent = "from " + formatted + " recap";
        sourceDateEl.removeAttribute("hidden");
      } else {
        sourceDateEl.textContent = "";
        sourceDateEl.setAttribute("hidden", "");
      }
    }

    if (photoEl) {
      if (photoURL) {
        photoEl.src = photoURL;
        photoEl.removeAttribute("hidden");
        if (artEl) artEl.removeAttribute("hidden");
      } else {
        photoEl.src = "";
        photoEl.setAttribute("hidden", "");
        if (artEl) artEl.setAttribute("hidden", "");
      }
    }

    if (attributionEl) {
      if (attribution) {
        attributionEl.textContent = attribution;
        attributionEl.removeAttribute("hidden");
      } else {
        attributionEl.textContent = "";
        attributionEl.setAttribute("hidden", "");
      }
    }

    // Build weighted word list from topics
    const topics = getTopicsForCity(cityKey);
    const rawTopics = topics.length > 0
      ? topics
      : WC_TOPICS["All"].slice(0, 18).map(([w]) => w);

    const topicCount = rawTopics.length;
    const fewTopics  = topicCount <= 10;

    const wordList = fewTopics
      ? rawTopics.map((t) => [t, 8])
      : rawTopics.map((t, i) => [t, Math.max(4, 10 - Math.floor(i / 3))]);

    // Clear and render
    stage.innerHTML = "";
    stage.classList.remove("wc-overlay-stage--zones");
    overlay.removeAttribute("hidden");
    overlay.classList.remove("wc-overlay--closing");

    // Sort by weight descending so biggest words are at the top of each column
    const sorted = [...wordList].sort((a, b) => b[1] - a[1]);
    renderOverlayWords(stage, sorted.map(([text, weight]) => ({ text, weight })), usePhotoMode);

    // Trap Escape key
    document.addEventListener("keydown", onOverlayKeydown);
  }

  function closeOverlay() {
    const overlay = document.getElementById("wc-overlay");
    if (!overlay || overlay.hidden) return;

    stopPhotoCycle();
    clearOverlayTyping();
    overlay.classList.add("wc-overlay--closing");
    document.removeEventListener("keydown", onOverlayKeydown);

    setTimeout(() => {
      overlay.setAttribute("hidden", "");
      overlay.classList.remove("wc-overlay--closing");
      overlay.classList.remove("wc-overlay--photo-bg");
      const bgPhotosEl    = overlay.querySelector(".wc-overlay-bg-photos");
      if (bgPhotosEl) bgPhotosEl.remove();
      const stage         = document.getElementById("wc-overlay-stage");
      if (stage) stage.innerHTML = "";
      const photoEl       = document.getElementById("wc-overlay-photo");
      if (photoEl) { photoEl.src = ""; photoEl.setAttribute("hidden", ""); }
      const artEl         = document.getElementById("wc-overlay-art");
      if (artEl) artEl.setAttribute("hidden", "");
      const attributionEl = document.getElementById("wc-overlay-attribution");
      if (attributionEl) { attributionEl.setAttribute("hidden", ""); }
      const sourceDateEl  = document.getElementById("wc-overlay-source-date");
      if (sourceDateEl) { sourceDateEl.setAttribute("hidden", ""); }
    }, 220);
  }

  function navigateOverlay(delta) {
    if (overlayClubButtons.length === 0) return;
    overlayCurrentIdx = (overlayCurrentIdx + delta + overlayClubButtons.length) % overlayClubButtons.length;
    const btn = overlayClubButtons[overlayCurrentIdx];
    // Fade stage briefly, then re-render for the new club
    const stage = document.getElementById("wc-overlay-stage");
    if (stage) {
      stage.style.transition = "opacity 200ms";
      stage.style.opacity    = "0";
      setTimeout(() => {
        openOverlay(btn.dataset.city, btn.dataset.displayCity,
                    btn.dataset.scheduleLabel, btn.dataset.eventTime, btn.dataset.venue);
        stage.style.opacity = "1";
        setTimeout(() => { stage.style.transition = ""; }, 200);
      }, 200);
    } else {
      openOverlay(btn.dataset.city, btn.dataset.displayCity,
                  btn.dataset.scheduleLabel, btn.dataset.eventTime, btn.dataset.venue);
    }
  }

  function onOverlayKeydown(e) {
    if (e.key === "Escape")     closeOverlay();
    if (e.key === "ArrowRight") navigateOverlay(+1);
    if (e.key === "ArrowLeft")  navigateOverlay(-1);
  }

  function initOverlayListeners() {
    // Close button
    const closeBtn = document.getElementById("wc-overlay-close");
    if (closeBtn) closeBtn.addEventListener("click", closeOverlay);

    // Prev / Next nav buttons
    const prevBtn = document.getElementById("wc-overlay-prev");
    const nextBtn = document.getElementById("wc-overlay-next");
    if (prevBtn) prevBtn.addEventListener("click", () => navigateOverlay(-1));
    if (nextBtn) nextBtn.addEventListener("click", () => navigateOverlay(+1));

    // Click on overlay backdrop (not on words) → close
    const overlay = document.getElementById("wc-overlay");
    if (overlay) {
      overlay.addEventListener("click", function (e) {
        if (
          e.target === overlay ||
          e.target.id === "wc-overlay-stage" ||
          (e.target.classList && e.target.classList.contains("wc-overlay-zone"))
        ) closeOverlay();
      });

      // Touch swipe: left/right to navigate, up to close
      let touchStartX = 0;
      let touchStartY = 0;
      overlay.addEventListener("touchstart", function (e) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
      }, { passive: true });
      overlay.addEventListener("touchend", function (e) {
        const dx = e.changedTouches[0].clientX - touchStartX;
        const dy = e.changedTouches[0].clientY - touchStartY;
        if (Math.abs(dy) > Math.abs(dx) && dy < -60) {
          closeOverlay();        // swipe up → close
        } else if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
          navigateOverlay(dx < 0 ? +1 : -1);  // swipe left → next, right → prev
        }
      }, { passive: true });
    }

    // Event delegation: "What we talked about" buttons on club cards
    const clubsList = document.getElementById("clubs-list");
    if (clubsList) {
      clubsList.addEventListener("click", function (e) {
        const btn = e.target.closest(".wc-topics-btn");
        if (!btn) return;
        e.stopPropagation();
        // Snapshot all visible club buttons for navigation
        overlayClubButtons = Array.from(
          document.querySelectorAll("#clubs-list .wc-topics-btn")
        );
        overlayCurrentIdx = overlayClubButtons.indexOf(btn);
        openOverlay(btn.dataset.city, btn.dataset.displayCity,
                    btn.dataset.scheduleLabel, btn.dataset.eventTime, btn.dataset.venue);
      });
    }
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Called from script.js whenever the region filter changes.
   * Re-renders the word cloud with region-appropriate topics.
   */
  window.updateWordCloud = function (region) {
    currentRegion = region;
    renderCloud(region);
  };
  window.openWordCloudOverlay = openOverlay;
  window.closeWordCloudOverlay = closeOverlay;

  // ── Live topics from Substack ───────────────────────────────────────────────

  // Normalise a city string the same way the Netlify function does
  function normaliseCity(raw) {
    return raw
      .toLowerCase()
      .replace(/\bme\b/g, "")
      .replace(/\bny\b/g, "")
      .replace(/\bnj\b/g, "")
      .replace(/[^a-z0-9\s\-]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  async function fetchLiveTopics() {
    try {
      const res = await fetch("/.netlify/functions/fetch-substack-topics");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      mergeLiveTopics(data.cities || {}, data.dates || {});
      liveTopicsLoaded = true;
    } catch (_) {
      // Silently fall back to curated topics — expected in local dev
    }
  }

  function mergeLiveTopics(cities, dates) {
    // Update WC_SPOTLIGHTS with real topics from the Substack recaps.
    // Also inject new spotlight entries for cities that appear in the feed
    // but aren't in the curated list yet.
    const existingNames = new Set(
      WC_SPOTLIGHTS.map((s) => normaliseCity(s.displayName))
    );

    for (const [city, topics] of Object.entries(cities)) {
      if (topics.length === 0) continue;

      // Try to match an existing spotlight
      const existing = WC_SPOTLIGHTS.find(
        (s) => normaliseCity(s.displayName) === city ||
               city.includes(normaliseCity(s.displayName)) ||
               normaliseCity(s.displayName).includes(city)
      );

      if (existing) {
        // Prepend live topics (they're most recent / most authentic)
        const merged = [...new Set([...topics, ...existing.topics])];
        existing.topics = merged.slice(0, 20);
      } else if (!existingNames.has(city)) {
        // New city from the feed — add a spotlight entry
        const displayName = city
          .split(" ")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ");
        WC_SPOTLIGHTS.push({
          displayName,
          region: null,  // unknown; spotlight will still fire globally
          topics: topics.slice(0, 12),
        });
        existingNames.add(city);
      }

      // Store the recap date for this city
      const dateKey = existing ? normaliseCity(existing.displayName) : city;
      if (dates[city]) liveDates[dateKey] = dates[city];
    }

    // Also surface live topics in the "All" word cloud list so they appear
    // as floating background words
    const allTopics = WC_TOPICS["All"];
    const existingWords = new Set(allTopics.map(([w]) => w.toLowerCase()));
    for (const topics of Object.values(cities)) {
      for (const topic of topics) {
        if (!existingWords.has(topic) && topic.length > 3) {
          allTopics.push([topic, 4]);
          existingWords.add(topic);
        }
      }
    }
  }

  // ── Init ───────────────────────────────────────────────────────────────────

  document.addEventListener("DOMContentLoaded", function () {
    // Wait briefly for live topics from the Netlify function.
    // On prod: function responds ~300-500ms, topics load before first render.
    // Locally: fetch fails instantly (no function server), falls back to curated data.
    const MAX_LIVE_WAIT = 1500;
    const isPreviewMode = document.body && document.body.dataset.wordCloudPreview === "true";
    const previewConfig = window.WORD_CLOUD_PREVIEW || null;

    initOverlayListeners();

    Promise.race([
      fetchLiveTopics(),
      new Promise((resolve) => setTimeout(resolve, MAX_LIVE_WAIT)),
    ]).then(function () {
      // Small layout-settle delay before measuring stage dimensions
      setTimeout(function () {
        if (!isPreviewMode) {
          renderCloud("All");
          startSpotlightCycle();
        }
        if (previewConfig) {
          openOverlay(
            previewConfig.cityKey,
            previewConfig.displayCity,
            previewConfig.scheduleLabel || "",
            previewConfig.eventTime || "",
            previewConfig.venue || "",
          );
        }
      }, 200);
    });
  });

})();
