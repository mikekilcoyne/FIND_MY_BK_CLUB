(function () {
  "use strict";

  var CLUBS_MAP_URL = "./data/clubs-map.json";
  var MEDIA_MANIFEST_URL = "./data/wwta-media.json";
  var TOPICS_ENDPOINT = "/.netlify/functions/fetch-substack-topics";
  var TOPICS_CACHE_URL = "./data/wwta-substack-cache.json";

  var PHOTO_CYCLE_INTERVAL = 9000;
  var ZONE_NAMES = ["top-left", "top", "top-right", "left", "right", "bottom-left", "bottom", "bottom-right"];
  var WORD_COLORS = ["#ffffff", "#f3ede1", "#f7ddb0", "#d9e7cf"];

  var CLUB_ALIASES = {
    "new york - hamptons": ["hamptons"],
    "new york - williamsburg": ["williamsburg"],
    "new york - downtown brooklyn": ["downtown brooklyn", "dtbk"],
    "new york - hudson": ["hudson"],
    "portland, or": ["portland or", "portland", "pdx"],
    "mexico city": ["mexico city", "cdmx"],
    "san francisco, ca": ["san francisco", "sf"],
    "soma, nj, usa": ["soma", "maplewood"],
    "milan": ["milan", "milano"],
    toronto: ["toronto"],
    "cambridge, ma": ["cambridge"],
    miami: ["miami"],
    "paris, france": ["paris"],
    copenhagen: ["copenhagen"],
    boston: ["boston"],
    "washington dc": ["washington dc", "dc"],
    manhattan: ["manhattan"],
    "panama city": ["panama city"],
    "los angeles": ["los angeles", "la west", "la"],
  };

  var statusEl = document.getElementById("wwta-status");
  var photoLayerEl = document.getElementById("wwta-photo-layer");
  var preambleEl = document.getElementById("wwta-preamble");
  var preambleTextEl = document.getElementById("wwta-preamble-text");
  var titleEl = document.getElementById("wwta-club-title");
  var metaEl = document.getElementById("wwta-meta");
  var sourceDateEl = document.getElementById("wwta-source-date");
  var sourceLinkEl = document.getElementById("wwta-source-link");
  var stageEl = document.getElementById("wwta-stage");
  var pillsEl = document.getElementById("wwta-club-pills");
  var counterEl = document.getElementById("wwta-counter");
  var prevBtn = document.getElementById("wwta-prev");
  var nextBtn = document.getElementById("wwta-next");

  var mediaManifest = { cities: {} };
  var livePayload = { cities: {} };
  var usingLiveTopics = false;
  var usingCachedTopics = false;
  var clubs = [];
  var activeIndex = 0;
  var photoCycleTimer = null;
  var photoIndex = 0;
  var typeTimers = [];

  var REGION_TOPIC_FALLBACKS = {
    "Northeast US": ["side projects", "coffee", "real estate", "what's next", "remote work", "early risers"],
    "Southeast US": ["new friends", "beach mornings", "warm winters", "career moves", "building things", "creative energy"],
    "West Coast": ["venture capital", "surf before work", "product thinking", "startup pivots", "climate tech", "outdoor culture"],
    UK: ["proper breakfast", "flat whites", "fintech", "pub culture", "creative agencies", "the housing crisis"],
    Europe: ["design", "digital nomads", "proper coffee", "work-life balance", "slow mornings", "expat life"],
    Australia: ["flat whites", "startup culture", "beach before work", "early risers", "housing market", "global pivot"],
    Other: ["community", "new friends", "ambition", "what's next", "travel stories", "building things"],
  };

  function normalizeCity(value) {
    return (value || "")
      .replace(/[—–]/g, "-")
      .toLowerCase()
      .replace(/\bme\b/g, "")
      .replace(/\bnj\b/g, "")
      .replace(/\bny\b/g, "")
      .replace(/\bca\b/g, "")
      .replace(/\buk\b/g, "")
      .replace(/\bfr\b/g, "")
      .replace(/\bit\b/g, "")
      .replace(/\bdk\b/g, "")
      .replace(/\bon\b/g, "")
      .replace(/[^a-z0-9\s-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function cleanDisplayCity(club) {
    var display = club.displayCity || club.city || "";
    display = display.replace(/^New York\s+[—-]\s+/i, "");
    display = display.replace(/,\s*[A-Z]{2,3}$/, "");
    return display.trim();
  }

  function stripVenue(venue) {
    if (!venue) return "";
    var commaIndex = venue.indexOf(",");
    return commaIndex === -1 ? venue.trim() : venue.slice(0, commaIndex).trim();
  }

  function ordinalLabel(value) {
    if (value === 1) return "1st";
    if (value === 2) return "2nd";
    if (value === 3) return "3rd";
    if (value === 4) return "4th";
    return value ? value + "th" : "";
  }

  function weekdayLabel(value) {
    var labels = {
      1: "Monday",
      2: "Tuesday",
      3: "Wednesday",
      4: "Thursday",
      5: "Friday",
      6: "Saturday",
      7: "Sunday",
    };
    return labels[value] || "";
  }

  function formatSchedule(schedule, override) {
    if (override && override.cadence) {
      if (override.cadence === "Bi-Weekly") return "Every Other " + weekdayLabel(schedule && schedule.weekday);
      if (override.cadence === "Weekly" && schedule && schedule.weekday) return "Every " + weekdayLabel(schedule.weekday);
      return override.cadence;
    }
    if (!schedule || !schedule.type) return "";
    if (schedule.type === "monthly") {
      var ordinal = ordinalLabel(schedule.ordinal);
      var weekday = weekdayLabel(schedule.weekday);
      return ordinal && weekday ? ordinal + " " + weekday : "Monthly";
    }
    if (schedule.type === "biweekly") return schedule.weekday ? "Every Other " + weekdayLabel(schedule.weekday) : "Bi-Weekly";
    if (schedule.type === "weekly") return schedule.weekday ? "Every " + weekdayLabel(schedule.weekday) : "Weekly";
    if (schedule.type === "specific" && schedule.dates && schedule.dates.length) return "Pop-Up";
    return "";
  }

  function fallbackTopicsForClub(club) {
    return REGION_TOPIC_FALLBACKS[club.region] || REGION_TOPIC_FALLBACKS.Other;
  }

  function buildPlaceholderQuery(club, media) {
    if (media && media.placeholderQuery) return media.placeholderQuery;
    var city = cleanDisplayCity(club).toLowerCase();
    var region = (club.region || "").toLowerCase();
    if (region === "europe") return city + " cafe morning";
    if (region === "uk") return city + " breakfast coffee";
    if (region === "australia") return city + " cafe sunrise";
    if (region.indexOf("us") !== -1) return city + " breakfast club gathering";
    return city + " morning coffee";
  }

  function randBetween(min, max) {
    return min + Math.random() * (max - min);
  }

  function randInt(min, max) {
    return Math.floor(randBetween(min, max));
  }

  function pickWordColor() {
    return WORD_COLORS[randInt(0, WORD_COLORS.length)];
  }

  function setStatus(message, isError) {
    statusEl.textContent = message;
    statusEl.style.color = isError ? "#f7c5c5" : "";
  }

  function loadJson(url) {
    return fetch(url).then(function (res) {
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.json();
    });
  }

  function normalizeMediaManifest(manifest) {
    var normalized = { cities: {} };
    Object.keys((manifest && manifest.cities) || {}).forEach(function (key) {
      normalized.cities[normalizeCity(key)] = manifest.cities[key];
    });
    return normalized;
  }

  function loadTopicsPayload() {
    return fetch(TOPICS_ENDPOINT)
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(function (payload) {
        usingLiveTopics = true;
        usingCachedTopics = false;
        livePayload = payload || { cities: {} };
      })
      .catch(function () {
        return loadJson(TOPICS_CACHE_URL).then(function (payload) {
          usingLiveTopics = false;
          usingCachedTopics = true;
          livePayload = payload || { cities: {} };
        }).catch(function () {
          usingLiveTopics = false;
          usingCachedTopics = false;
          livePayload = { cities: {} };
        });
      });
  }

  function getClubCandidates(club) {
    var normalizedCity = normalizeCity(club.city);
    var normalizedDisplay = normalizeCity(cleanDisplayCity(club));
    var candidates = [normalizedCity, normalizedDisplay];
    var aliases = CLUB_ALIASES[club.city] || [];

    if (normalizedCity.indexOf("new york - ") === 0) {
      candidates.push(normalizedCity.replace("new york - ", ""));
    }

    aliases.forEach(function (alias) {
      candidates.push(normalizeCity(alias));
    });

    return Array.from(new Set(candidates.filter(Boolean)));
  }

  function findLiveRecord(club) {
    var cities = livePayload.cities || {};
    var keys = Object.keys(cities);
    var candidates = getClubCandidates(club);
    var matchKey = "";

    candidates.some(function (candidate) {
      if (cities[candidate]) {
        matchKey = candidate;
        return true;
      }
      var partial = keys.find(function (key) {
        return key === candidate || key.indexOf(candidate) !== -1 || candidate.indexOf(key) !== -1;
      });
      if (partial) {
        matchKey = partial;
        return true;
      }
      return false;
    });

    return matchKey ? { key: matchKey, record: cities[matchKey] } : null;
  }

  function mergeMedia(club, liveRecord) {
    var candidates = getClubCandidates(club);
    var media = {};

    candidates.some(function (candidate) {
      if (mediaManifest.cities[candidate]) {
        media = mediaManifest.cities[candidate];
        return true;
      }
      return false;
    });

    var live = liveRecord && liveRecord.record ? liveRecord.record : {};
    var merged = Object.assign({}, media);
    if (live.photos && live.photos.length) merged.photos = live.photos.slice();
    if (live.photoTreatment && !merged.photoTreatment) merged.photoTreatment = live.photoTreatment;
    if (live.attribution && !merged.attribution) merged.attribution = live.attribution;
    if (!merged.photoTreatment) merged.photoTreatment = live.photos && live.photos.length ? "polaroid-frame" : "polaroid-frame";
    return merged;
  }

  function buildClubRecord(club) {
    var override = (window.CLUB_OVERRIDES && (window.CLUB_OVERRIDES[club.city] || window.CLUB_OVERRIDES[normalizeCity(club.city)])) || {};
    var live = findLiveRecord(club);
    var media = mergeMedia(club, live);
    var topics = live && live.record && live.record.topics && live.record.topics.length ? live.record.topics : fallbackTopicsForClub(club);

    return Object.assign({}, club, override, {
      liveKey: live ? live.key : "",
      liveRecord: live ? live.record : null,
      media: media,
      topics: topics,
      hasLiveContent: Boolean(live && live.record && ((live.record.topics && live.record.topics.length) || (live.record.photos && live.record.photos.length))),
    });
  }

  function clearTyping() {
    typeTimers.forEach(clearTimeout);
    typeTimers = [];
    preambleEl.classList.remove("wwta-preamble--active");
  }

  function typePreamble(text) {
    clearTyping();
    preambleTextEl.textContent = "";
    preambleEl.classList.add("wwta-preamble--active");

    var delay = 220;
    for (var i = 0; i < text.length; i += 1) {
      (function (index, nextDelay) {
        typeTimers.push(setTimeout(function () {
          preambleTextEl.textContent = text.slice(0, index + 1);
        }, nextDelay));
      })(i, delay);

      var ch = text.charAt(i);
      delay += ch === "." ? 180 : ch === " " ? 60 : 85;
    }
  }

  function typeWordsSequentially(spans) {
    if (!spans.length) return;
    var totalDelay = 360;

    spans.forEach(function (span) {
      var fullText = span.dataset.fullText || "";
      span.textContent = "";

      typeTimers.push(setTimeout(function () {
        span.classList.add("wwta-word--visible");
      }, totalDelay));

      for (var i = 0; i < fullText.length; i += 1) {
        (function (index, nextDelay) {
          typeTimers.push(setTimeout(function () {
            span.textContent = fullText.slice(0, index + 1);
          }, nextDelay));
        })(i, totalDelay);

        var ch = fullText.charAt(i);
        totalDelay += ch === " " ? 18 : ch === "-" ? 28 : 34;
      }

      totalDelay += 95;
    });
  }

  function getZoneOrder(width) {
    if (width <= 540) return ["top"];
    if (width <= 860) return ["top", "left", "right", "bottom", "top-left", "top-right"];
    return ["top", "left", "right", "bottom", "top-left", "top-right", "bottom-left", "bottom-right"];
  }

  function getChipMax(zoneName, stageWidth) {
    if (zoneName === "top" || zoneName === "bottom") return Math.min(320, Math.max(220, Math.round(stageWidth * 0.26)));
    return Math.min(280, Math.max(170, Math.round(stageWidth * 0.19)));
  }

  function renderWords(topicList) {
    var stageWidth = stageEl.offsetWidth || window.innerWidth || 900;
    var zoneOrder = getZoneOrder(stageWidth);
    var sizeScale = stageWidth <= 540 ? 0.84 : stageWidth <= 860 ? 0.94 : 1.08;
    var zoneBuckets = {};
    var typingSpans = [];

    ZONE_NAMES.forEach(function (name) {
      zoneBuckets[name] = [];
    });

    topicList.forEach(function (item, index) {
      var zoneName = zoneOrder[index % zoneOrder.length];
      zoneBuckets[zoneName].push({ text: item.text, weight: item.weight, index: index, zoneName: zoneName });
    });

    stageEl.innerHTML = "";
    stageEl.className = "wwta-stage wwta-stage--zones";

    ZONE_NAMES.forEach(function (zoneName) {
      var zone = document.createElement("div");
      zone.className = "wwta-zone wwta-zone--" + zoneName;

      (zoneBuckets[zoneName] || []).forEach(function (item) {
        var span = document.createElement("span");
        var px = Math.min(30, Math.max(14, Math.round(item.weight * 2.1 * sizeScale)));
        span.className = "wwta-word";
        span.dataset.fullText = (item.text || "").toUpperCase();
        span.dataset.typingIndex = String(item.index);
        span.style.fontSize = px + "px";
        span.style.color = pickWordColor();
        span.style.setProperty("--wwta-chip-max", getChipMax(zoneName, stageWidth) + "px");
        span.style.setProperty("--wwta-target-opacity", String(randBetween(0.82, 0.96)));
        span.style.setProperty("--wwta-dx1", randInt(-6, 6) + "px");
        span.style.setProperty("--wwta-dy1", randInt(-12, 4) + "px");
        span.style.setProperty("--wwta-dx2", randInt(-8, 8) + "px");
        span.style.setProperty("--wwta-dy2", randInt(-18, -4) + "px");
        span.style.setProperty("--wwta-dx3", randInt(-6, 6) + "px");
        span.style.setProperty("--wwta-dy3", randInt(-10, 6) + "px");
        span.style.animationDuration = randBetween(18, 32) + "s";
        span.style.animationDelay = randBetween(-18, 0) + "s";
        zone.appendChild(span);
        typingSpans.push(span);
      });

      stageEl.appendChild(zone);
    });

    typingSpans.sort(function (a, b) {
      return Number(a.dataset.typingIndex) - Number(b.dataset.typingIndex);
    });
    typeWordsSequentially(typingSpans);
  }

  function stopPhotoCycle() {
    if (photoCycleTimer) {
      clearInterval(photoCycleTimer);
      photoCycleTimer = null;
    }
  }

  function restartPhotoMotion(nodes) {
    nodes.forEach(function (node) {
      node.classList.remove("wwta-photo-push");
      void node.offsetWidth;
      node.classList.add("wwta-photo-push");
    });
  }

  function setPhotoSource(container, src) {
    Array.prototype.slice.call(container.querySelectorAll("[data-wwta-photo-role]")).forEach(function (node) {
      node.src = src;
    });
    restartPhotoMotion(Array.prototype.slice.call(container.querySelectorAll("[data-wwta-photo-role]")));
  }

  function buildPhotoMarkup(src, media) {
    var treatment = (media && media.photoTreatment) || "polaroid-frame";
    var photoPosition = (media && media.photoPositionY) || "22%";
    if (treatment === "full-bleed") {
      return '<div class="wwta-photo-shell" style="--wwta-photo-position-y:' + photoPosition + ';">' +
        '<img class="wwta-photo-main wwta-photo-push" data-wwta-photo-role="main" src="' + src + '" alt="" aria-hidden="true">' +
      "</div>";
    }

    return '<div class="wwta-photo-shell" style="--wwta-photo-position-y:' + photoPosition + ';">' +
      '<img class="wwta-photo-blur wwta-photo-push" data-wwta-photo-role="blur" src="' + src + '" alt="" aria-hidden="true">' +
      '<div class="wwta-photo-frame">' +
        '<img class="wwta-photo-push" data-wwta-photo-role="framed" src="' + src + '" alt="" aria-hidden="true">' +
      "</div>" +
    "</div>";
  }

  function buildPlaceholderMarkup(club, media) {
    return '<div class="wwta-photo-placeholder"></div>' +
      '<div class="wwta-photo-placeholder-card">' +
        '<div class="wwta-photo-placeholder-copy">' +
          '<p class="wwta-photo-placeholder-kicker">Media Placeholder</p>' +
          '<p class="wwta-photo-placeholder-city">' + cleanDisplayCity(club) + '</p>' +
          '<p class="wwta-photo-placeholder-query">' + buildPlaceholderQuery(club, media) + '</p>' +
        "</div>" +
      "</div>";
  }

  function renderPhotoStage(club) {
    var media = club.media || {};
    var photos = Array.isArray(media.photos) ? media.photos : [];
    if (!photos.length) {
      photoLayerEl.innerHTML = buildPlaceholderMarkup(club, media);
      stopPhotoCycle();
      return;
    }

    photoLayerEl.innerHTML = buildPhotoMarkup(photos[photoIndex % photos.length], media);
    stopPhotoCycle();
    if (photos.length <= 1) return;

    photoCycleTimer = setInterval(function () {
      photoIndex = (photoIndex + 1) % photos.length;
      var shell = photoLayerEl.querySelector(".wwta-photo-shell");
      if (!shell) return;
      shell.classList.add("wwta-photo-shell--fading");
      setTimeout(function () {
        if (!shell.parentNode) return;
        setPhotoSource(shell, photos[photoIndex]);
        shell.classList.remove("wwta-photo-shell--fading");
      }, 820);
    }, PHOTO_CYCLE_INTERVAL);
  }

  function updateFooter() {
    pillsEl.innerHTML = "";
    clubs.forEach(function (club, index) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "wwta-club-pill" + (index === activeIndex ? " is-active" : "");
      button.textContent = cleanDisplayCity(club);
      button.addEventListener("click", function () {
        activeIndex = index;
        photoIndex = 0;
        render();
      });
      pillsEl.appendChild(button);
    });

    counterEl.textContent = clubs.length ? activeIndex + 1 + " of " + clubs.length : "";
  }

  function updateQueryString(club) {
    var params = new URLSearchParams(window.location.search);
    params.set("city", normalizeCity(club.city));
    var nextUrl = window.location.pathname + "?" + params.toString();
    window.history.replaceState({}, "", nextUrl);
  }

  function render() {
    var club = clubs[activeIndex];
    if (!club) return;

    clearTyping();
    typePreamble("What we talked about...");

    titleEl.textContent = "BK Club " + cleanDisplayCity(club);

    var metaParts = [];
    var scheduleLabel = formatSchedule(club.schedule, club);
    if (club.venue) metaParts.push(stripVenue(club.venue));
    if (scheduleLabel) metaParts.push(scheduleLabel);
    if (club.eventTime) metaParts.push(club.eventTime);
    metaEl.textContent = metaParts.join(" | ");

    if (club.liveRecord && club.liveRecord.sourceDate) {
      var formattedDate = new Date(club.liveRecord.sourceDate).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
      sourceDateEl.textContent = "from " + formattedDate + " recap";
      sourceDateEl.removeAttribute("hidden");
    } else {
      sourceDateEl.textContent = "";
      sourceDateEl.setAttribute("hidden", "");
    }

    if (club.liveRecord && club.liveRecord.sourceUrl) {
      sourceLinkEl.href = club.liveRecord.sourceUrl;
      sourceLinkEl.removeAttribute("hidden");
    } else {
      sourceLinkEl.setAttribute("hidden", "");
    }

    var topics = (club.topics || []).slice(0, 10).map(function (topic, index) {
      return {
        text: topic,
        weight: Math.max(4, 10 - Math.floor(index / 3)),
      };
    });
    renderWords(topics);
    renderPhotoStage(club);
    updateFooter();
    updateQueryString(club);
  }

  function bindEvents() {
    prevBtn.addEventListener("click", function () {
      activeIndex = (activeIndex - 1 + clubs.length) % clubs.length;
      photoIndex = 0;
      render();
    });

    nextBtn.addEventListener("click", function () {
      activeIndex = (activeIndex + 1) % clubs.length;
      photoIndex = 0;
      render();
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "ArrowLeft") prevBtn.click();
      if (event.key === "ArrowRight") nextBtn.click();
    });

    window.addEventListener("resize", function () {
      clearTyping();
      render();
    });
  }

  function readRequestedCity() {
    var params = new URLSearchParams(window.location.search);
    return normalizeCity(params.get("city") || "");
  }

  Promise.all([
    loadJson(CLUBS_MAP_URL),
    loadJson(MEDIA_MANIFEST_URL).catch(function () { return { cities: {} }; }),
    loadTopicsPayload(),
  ]).then(function (results) {
    var clubData = results[0] || [];
    mediaManifest = normalizeMediaManifest(results[1] || { cities: {} });

    clubs = clubData
      .map(buildClubRecord)
      .filter(function (club) { return club.hasLiveContent; })
      .sort(function (a, b) {
        var aDate = a.liveRecord && a.liveRecord.sourceDate ? new Date(a.liveRecord.sourceDate).getTime() : 0;
        var bDate = b.liveRecord && b.liveRecord.sourceDate ? new Date(b.liveRecord.sourceDate).getTime() : 0;
        if (aDate !== bDate) return bDate - aDate;
        return cleanDisplayCity(a).localeCompare(cleanDisplayCity(b));
      });

    if (!clubs.length) {
      clubs = clubData
        .map(buildClubRecord)
        .filter(function (club) { return mediaManifest.cities[normalizeCity(club.city)] || normalizeCity(club.city) === "new york - hamptons"; })
        .sort(function (a, b) {
          return cleanDisplayCity(a).localeCompare(cleanDisplayCity(b));
        });
    }

    if (!clubs.length) {
      setStatus("Could not load club recap data right now.", true);
      return;
    }

    var requestedCity = readRequestedCity();
    var requestedIndex = clubs.findIndex(function (club) {
      return normalizeCity(club.city) === requestedCity || normalizeCity(cleanDisplayCity(club)) === requestedCity;
    });
    var hamptonsIndex = clubs.findIndex(function (club) {
      return normalizeCity(club.city).indexOf("hamptons") !== -1;
    });

    if (requestedIndex >= 0) activeIndex = requestedIndex;
    else if (hamptonsIndex >= 0) activeIndex = hamptonsIndex;

    if (usingLiveTopics) {
      setStatus("Live Substack recap feed loaded");
    } else if (usingCachedTopics) {
      setStatus("Using cached Substack recap snapshot for local preview");
    } else {
      setStatus("Recap feed unavailable; showing fallback club view", true);
    }

    bindEvents();
    render();
  }).catch(function (error) {
    console.error(error);
    setStatus("Could not load the recap view right now.", true);
  });
})();
