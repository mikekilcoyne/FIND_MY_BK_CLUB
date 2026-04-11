(function () {
  "use strict";

  var CLUBS_MAP_URL = "./data/clubs-map.json?v=20260409-1730";
  var CACHE_URL = "./data/wwta-substack-cache.json?v=20260409-1730";
  var RETURN_URL = "./";

  var CLUB_ALIASES = {
    "new york - hamptons": ["hamptons"],
    "new york - williamsburg": ["williamsburg", "williamsburg 3 11 26"],
    "new york - downtown brooklyn": ["downtown brooklyn", "dtbk", "db"],
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
    copenhagen: ["copenhagen", "cph"],
    london: ["london", "london, uk"],
    boston: ["boston"],
    "washington dc": ["washington dc", "dc"],
    manhattan: ["manhattan"],
    "panama city": ["panama city"],
    "los angeles": ["los angeles", "la west", "la"],
    "melbourne - fitzroy": ["melbourne"],
    "surf coast - torquay": ["torquay", "surf coast"],
  };

  var SUPPRESSED_CLUBS = {
    "new york - downtown brooklyn": true,
    "new york - hudson": true,
    "panama city": true,
    "portland, maine": true,
    "soma, nj, usa": true,
    "washington dc": true,
  };

  var PHOTO_RULES = {
    amsterdam: {
      dropClub: true,
    },
    biarritz: {
      dropClub: true,
    },
    burlington: {
      dropClub: true,
    },
    "downtown bk": {
      dropClub: true,
    },
    "downtown brooklyn": {
      dropClub: true,
    },
    hudson: {
      dropClub: true,
    },
    london: {
      exclude: [
        "https://substackcdn.com/image/fetch/$s_!Soxs!,w_1456,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F98a74e0a-ff65-4fcc-a84e-f4f94dcd3d16_800x600.jpeg",
      ],
    },
    maplewood: {
      dropClub: true,
    },
    "panama city": {
      dropClub: true,
    },
    "san francisco": {
      exclude: [
        "https://substackcdn.com/image/fetch/$s_!jOVN!,w_1456,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F7983bac7-8bbc-4a5a-9dec-fff1658508c5_800x1067.jpeg",
        "https://substackcdn.com/image/fetch/$s_!bRPa!,w_1456,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2Fda47a01f-efdc-40c0-a7dc-2c4e9dd1edc5_800x600.jpeg",
      ],
    },
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

  function loadJson(url) {
    return fetch(url).then(function (res) {
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.json();
    });
  }

  function cleanDisplayCity(club) {
    var display = club.displayCity || club.city || "";
    display = display.replace(/[—–]/g, "-");
    display = display.replace(/^New York\s+-\s+/i, "NY - ");
    display = display.replace(/,\s*[A-Z]{2,3}$/, "");
    return display.trim();
  }

  function isSuppressedClub(club) {
    return Boolean(club && SUPPRESSED_CLUBS[club.city]);
  }

  function buildPhotoUsageCounts(cacheCities) {
    var counts = {};
    Object.keys(cacheCities || {}).forEach(function (key) {
      var record = cacheCities[key] || {};
      var photos = Array.isArray(record.photos) ? record.photos : [];
      photos.forEach(function (photo) {
        if (!photo) return;
        counts[photo] = (counts[photo] || 0) + 1;
      });
    });
    return counts;
  }

  function isLikelyOriginalPhoto(photo) {
    if (!photo) return false;
    if (/^\.\/assets\//i.test(photo)) return true;
    if (/^assets\//i.test(photo)) return true;
    return /\.(jpe?g|png|heic)(?:$|\?)/i.test(photo);
  }

  function getOriginalRecordPhotos(record, photoUsageCounts) {
    var seen = {};
    var photos = Array.isArray(record && record.photos) ? record.photos : [];
    return photos.filter(function (photo) {
      if (!photo || seen[photo]) return false;
      seen[photo] = true;
      if (!isLikelyOriginalPhoto(photo)) return false;
      return !photoUsageCounts || photoUsageCounts[photo] === 1;
    });
  }

  function getPhotoRule(cityKey) {
    return PHOTO_RULES[normalizeCity(cityKey || "")] || null;
  }

  function applyPhotoRule(photos, cityKey) {
    var rule = getPhotoRule(cityKey);
    if (!rule || !photos.length) return photos.slice();
    if (rule.dropClub) return [];

    var filtered = photos.filter(function (photo) {
      return !(rule.exclude || []).includes(photo);
    });

    if (!filtered.length) return [];

    if (Number.isInteger(rule.heroPhotoIndex) && rule.heroPhotoIndex > 0 && rule.heroPhotoIndex < filtered.length) {
      var preferred = filtered[rule.heroPhotoIndex];
      filtered.splice(rule.heroPhotoIndex, 1);
      filtered.unshift(preferred);
    }

    return filtered;
  }

  function stripVenue(venue) {
    if (!venue) return "";
    if (/rotating/i.test(venue)) return "Rotating Location";
    var commaIndex = venue.indexOf(",");
    return commaIndex === -1 ? venue.trim() : venue.slice(0, commaIndex).trim();
  }

  function sourceDisplayCity(club) {
    return (club.displayCity || club.city || "")
      .replace(/[—–]/g, "-")
      .replace(/^New York\s+-\s+/i, "NY - ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function getPhotoRollBaseTitle(club) {
    var source = sourceDisplayCity(club);
    if (/^NY\s+-\s+/i.test(source)) return source;
    if (/\s+-\s+/.test(source)) return source.replace(/,\s*[A-Z]{2,3}$/, "").trim();

    var withoutShortCode = source.replace(/,\s*[A-Z]{2,3}$/, "").trim();
    var base = withoutShortCode.replace(/,\s+[A-Za-z][A-Za-z\s.'-]+$/, "").trim();
    return base || withoutShortCode || source;
  }

  function buildPhotoRollTitleCounts(entries) {
    var counts = {};
    entries.forEach(function (entry) {
      var key = normalizeCity(getPhotoRollBaseTitle(entry.club));
      if (!key) return;
      counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  }

  function formatPhotoRollTitle(club, titleCounts) {
    var source = sourceDisplayCity(club);
    var baseTitle = getPhotoRollBaseTitle(club);
    var baseKey = normalizeCity(baseTitle);

    if (titleCounts && titleCounts[baseKey] > 1) {
      return source;
    }

    return baseTitle;
  }

  function buildSpotlightRegistry(entries, titleCounts) {
    var registry = {};

    entries.forEach(function (entry) {
      var club = entry.club || {};
      var spotlight = entry.spotlight;
      var keys = [
        club.city,
        club.displayCity,
        cleanDisplayCity(club),
        formatPhotoRollTitle(club, titleCounts),
        spotlight && spotlight.displayName,
      ];

      keys
        .filter(Boolean)
        .map(normalizeCity)
        .forEach(function (key) {
          registry[key] = spotlight;
        });
    });

    window.WWTA_SPOTLIGHTS_BY_CITY = registry;
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

  function toIsoDate(date) {
    var year = date.getFullYear();
    var month = String(date.getMonth() + 1).padStart(2, "0");
    var day = String(date.getDate()).padStart(2, "0");
    return year + "-" + month + "-" + day;
  }

  function todayStart() {
    var now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
  }

  function weekdayToJs(weekday) {
    if (weekday === 7) return 0;
    return weekday || 0;
  }

  function resolveWeeklyUpcomingDate(weekday) {
    if (!weekday) return "";
    var base = todayStart();
    var target = weekdayToJs(weekday);
    var delta = (target - base.getDay() + 7) % 7;
    var next = new Date(base);
    next.setDate(base.getDate() + delta);
    return toIsoDate(next);
  }

  function nthWeekdayOfMonth(year, monthIndex, ordinal, weekday) {
    var target = weekdayToJs(weekday);
    var date = new Date(year, monthIndex, 1);
    var matches = 0;

    while (date.getMonth() === monthIndex) {
      if (date.getDay() === target) {
        matches += 1;
        if (matches === ordinal) {
          return new Date(date);
        }
      }
      date.setDate(date.getDate() + 1);
    }

    return null;
  }

  function resolveMonthlyUpcomingDate(ordinal, weekday) {
    if (!ordinal || !weekday) return "";
    var base = todayStart();
    var currentCandidate = nthWeekdayOfMonth(base.getFullYear(), base.getMonth(), ordinal, weekday);
    if (currentCandidate && currentCandidate >= base) {
      return toIsoDate(currentCandidate);
    }

    var nextMonth = new Date(base.getFullYear(), base.getMonth() + 1, 1);
    var nextCandidate = nthWeekdayOfMonth(nextMonth.getFullYear(), nextMonth.getMonth(), ordinal, weekday);
    return nextCandidate ? toIsoDate(nextCandidate) : "";
  }

  function resolveSpecificUpcomingDate(schedule) {
    if (!schedule || !Array.isArray(schedule.dates) || !schedule.dates.length) return "";
    var base = todayStart().getTime();
    var sorted = schedule.dates
      .slice()
      .filter(Boolean)
      .sort();
    var next = sorted.find(function (dateValue) {
      return new Date(dateValue).getTime() >= base;
    });
    return next || sorted[0] || "";
  }

  function resolveUpcomingDate(club) {
    if (club && club.upcoming_date) return club.upcoming_date;
    if (!club || !club.schedule || !club.schedule.type) return "";

    if (club.schedule.type === "specific") {
      return resolveSpecificUpcomingDate(club.schedule);
    }
    if (club.schedule.type === "weekly") {
      return resolveWeeklyUpcomingDate(club.schedule.weekday);
    }
    if (club.schedule.type === "monthly") {
      return resolveMonthlyUpcomingDate(club.schedule.ordinal, club.schedule.weekday);
    }

    return "";
  }

  function formatSchedule(schedule, override) {
    if (override && override.cadence) {
      if (/every now and again/i.test(override.cadence)) return "Every Now and Again";
      if (override.cadence === "Bi-Weekly" && schedule && schedule.weekday) {
        return "Every Other " + weekdayLabel(schedule.weekday);
      }
      if (override.cadence === "Weekly" && schedule && schedule.weekday) {
        return "Every " + weekdayLabel(schedule.weekday);
      }
      return override.cadence;
    }
    if (!schedule || !schedule.type || schedule.type === "unknown") return "Every Now and Again";
    if (schedule.type === "monthly") {
      var ordinal = ordinalLabel(schedule.ordinal);
      var weekday = weekdayLabel(schedule.weekday);
      return ordinal && weekday ? ordinal + " " + weekday : "Monthly";
    }
    if (schedule.type === "biweekly") return schedule.weekday ? "Every Other " + weekdayLabel(schedule.weekday) : "Bi-Weekly";
    if (schedule.type === "weekly") return schedule.weekday ? "Every " + weekdayLabel(schedule.weekday) : "Weekly";
    if (schedule.type === "specific") return "Every Now and Again";
    return "";
  }

  function normalizeSpotlightLookup(value) {
    var raw = (value || "")
      .replace(/[—–]/g, "-")
      .split(",")[0];

    return normalizeCity(raw)
      .replace(/^new york\s*-\s*/i, "")
      .replace(/^ny\s*-\s*/i, "")
      .trim();
  }

  function getSpotlightForKey(key) {
    if (!key) return null;

    var candidates = [
      normalizeCity(key),
      normalizeSpotlightLookup(key),
    ];
    var aliases = CLUB_ALIASES[key] || [];

    aliases.forEach(function (alias) {
      candidates.push(normalizeCity(alias));
      candidates.push(normalizeSpotlightLookup(alias));
    });

    candidates = Array.from(new Set(candidates.filter(Boolean)));

    var match = WC_SPOTLIGHTS.find(function (spotlight) {
      var spotlightKeys = [
        normalizeCity(spotlight.displayName),
        normalizeSpotlightLookup(spotlight.displayName),
      ];

      return candidates.some(function (candidate) {
        return spotlightKeys.includes(candidate);
      });
    });
    return match || null;
  }

  function mergeSpotlight(club, record, photoUsageCounts) {
    var spotlight = getSpotlightForKey(club.city) || getSpotlightForKey(cleanDisplayCity(club));
    var spotlightKey = normalizeCity(cleanDisplayCity(club));
    var isHamptonsClub =
      normalizeCity(club.city || "").indexOf("hamptons") !== -1 ||
      spotlightKey.indexOf("hamptons") !== -1;
    var originalPhotos = getOriginalRecordPhotos(record, photoUsageCounts);

    if (!spotlight) {
      spotlight = {
        displayName: cleanDisplayCity(club),
        region: club.region || null,
        topics: [],
      };
      WC_SPOTLIGHTS.push(spotlight);
    }

    if (record && record.topics && record.topics.length) {
      spotlight.topics = Array.from(new Set([].concat(record.topics, spotlight.topics || []))).slice(0, 16);
    }

    if (record && record.sourceDate && !spotlight.sourceDate) {
      spotlight.sourceDate = record.sourceDate;
    }

    if (originalPhotos.length && !isHamptonsClub) {
      spotlight.photos = applyPhotoRule(originalPhotos, spotlightKey).slice(0, 6);
      spotlight.photoTreatment = "polaroid-frame";
      spotlight.heroPhotoIndex = 0;
      delete spotlight.photo;
    }

    return spotlight;
  }

  function findRecordForClub(cacheCities, club) {
    var label = cleanDisplayCity(club);
    var candidates = [
      normalizeCity(club.city),
      normalizeCity(label.replace(/^NY\s+-\s+/i, "")),
      normalizeCity(label),
    ];
    var aliases = CLUB_ALIASES[club.city] || [];
    var match = null;

    aliases.forEach(function (alias) {
      candidates.push(normalizeCity(alias));
    });

    candidates.some(function (candidate) {
      if (candidate && cacheCities[candidate]) {
        match = cacheCities[candidate];
        return true;
      }
      return false;
    });

    return match;
  }

  function buildClubButtons(clubs, cache) {
    var container = document.getElementById("clubs-list");
    var cacheCities = (cache && cache.cities) || {};
    var photoUsageCounts = buildPhotoUsageCounts(cacheCities);
    var filtered = [];
    var deduped = new Map();

    clubs.forEach(function (club) {
      var override = (window.CLUB_OVERRIDES && window.CLUB_OVERRIDES[club.city]) || {};
      if (isSuppressedClub(club)) return;
      var record = findRecordForClub(cacheCities, club);
      if (!record) return;
      var spotlight = mergeSpotlight(Object.assign({}, club, override), record, photoUsageCounts);
      var hasVisual = Boolean(spotlight && spotlight.photos && spotlight.photos.length);
      if (!spotlight || !hasVisual) return;
      filtered.push({
        club: Object.assign({}, club, override),
        spotlight: spotlight,
        record: record,
      });
    });

    filtered.forEach(function (entry) {
      var key = normalizeCity(entry.club.city || cleanDisplayCity(entry.club));
      var existing = deduped.get(key);
      if (!existing) {
        deduped.set(key, entry);
        return;
      }

      var existingScore =
        ((existing.spotlight && existing.spotlight.photos && existing.spotlight.photos.length) || 0) +
        ((existing.spotlight && existing.spotlight.topics && existing.spotlight.topics.length) || 0);
      var nextScore =
        ((entry.spotlight && entry.spotlight.photos && entry.spotlight.photos.length) || 0) +
        ((entry.spotlight && entry.spotlight.topics && entry.spotlight.topics.length) || 0);

      if (nextScore > existingScore) {
        deduped.set(key, entry);
      }
    });

    filtered = Array.from(deduped.values());
    var titleCounts = buildPhotoRollTitleCounts(filtered);
    buildSpotlightRegistry(filtered, titleCounts);

    filtered.sort(function (a, b) {
      return formatPhotoRollTitle(a.club, titleCounts).localeCompare(formatPhotoRollTitle(b.club, titleCounts));
    });

    container.innerHTML = "";

    filtered.forEach(function (entry) {
      var button = document.createElement("button");
      var club = entry.club;
      var title = formatPhotoRollTitle(club, titleCounts);
      var scheduleLabel = formatSchedule(club.schedule, club);
      button.type = "button";
      button.className = "wc-topics-btn";
      button.dataset.city = club.city;
      button.dataset.displayCity = title;
      button.dataset.scheduleLabel = scheduleLabel;
      button.dataset.eventTime = club.eventTimeLabel || club.eventTime || "";
      button.dataset.upcomingDate = resolveUpcomingDate(club);
      button.dataset.venue = stripVenue(club.venue || "");
      button.textContent = title;
      container.appendChild(button);
    });

    return Array.from(container.querySelectorAll(".wc-topics-btn"));
  }

  function readRequestedCity() {
    var params = new URLSearchParams(window.location.search);
    return normalizeCity(params.get("city") || "");
  }

  function wireStandaloneBehavior(buttons) {
    var requestedCity = readRequestedCity();
    window.WWTA_RETURN_URL = RETURN_URL;
    var closeButton = document.getElementById("wc-overlay-close");
    if (closeButton) {
      closeButton.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopImmediatePropagation();
        window.location.href = RETURN_URL;
      }, true);
    }

    var target = buttons.find(function (button) {
      return normalizeCity(button.dataset.city) === requestedCity || normalizeCity(button.dataset.displayCity) === requestedCity;
    });

    if (!target) {
      target = buttons.find(function (button) {
        return normalizeCity(button.dataset.city).indexOf("biarritz") !== -1;
      }) || buttons.find(function (button) {
        return normalizeCity(button.dataset.city).indexOf("hamptons") !== -1;
      }) || buttons[0];
    }

    if (target) {
      setTimeout(function () {
        target.click();
      }, 240);
    }
  }

  window.addEventListener("load", function () {
    Promise.all([
      loadJson(CLUBS_MAP_URL),
      loadJson(CACHE_URL).catch(function () { return { cities: {} }; }),
    ]).then(function (results) {
      var clubs = results[0] || [];
      var cache = results[1] || { cities: {} };
      var buttons = buildClubButtons(clubs, cache);
      wireStandaloneBehavior(buttons);
    }).catch(function (error) {
      console.error("WWTA bootstrap error:", error);
    });
  });
})();
