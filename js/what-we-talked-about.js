(function () {
  "use strict";

  var CLUBS_MAP_URL = "./data/clubs-map.json?v=20260409-1730";
  var CACHE_URL = "./data/wwta-substack-cache.json?v=20260409-1730";
  var MEDIA_URL = "./data/club-story-media.json?v=20260409-1730";
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
    "portland, maine": ["portland me", "portland"],
    vegas: ["las vegas", "las vegas nv"],
    "los angeles": ["los angeles", "la west", "la"],
    "melbourne - fitzroy": ["melbourne"],
    "surf coast - torquay": ["torquay", "surf coast"],
  };

  var SUPPRESSED_CLUBS = {};

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
    les: {
      exclude: [
        "./assets/photos/club_updates/new-york-les/00000028-photo-2026-03-16-03-17-08-a48e5a826b.jpg",
      ],
    },
    london: {
      exclude: [
        "https://substackcdn.com/image/fetch/$s_!Soxs!,w_1456,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F98a74e0a-ff65-4fcc-a84e-f4f94dcd3d16_800x600.jpeg",
      ],
    },
    "las vegas": {
      exclude: [
        "./assets/photos/club_updates/las-vegas/00000109-photo-2026-03-23-15-27-10-e9119f81e9.jpg",
      ],
    },
    hamptons: {
      heroPhotoIndex: 1,
    },
    maplewood: {
      dropClub: true,
    },
    milan: {
      exclude: [
        "./assets/photos/club_updates/milano/00000135-photo-2026-03-25-16-16-42-2495253451.jpg",
      ],
    },
    milano: {
      exclude: [
        "./assets/photos/club_updates/milano/00000135-photo-2026-03-25-16-16-42-2495253451.jpg",
      ],
    },
    "panama city": {
      exclude: [
        "https://substackcdn.com/image/fetch/$s_!OEM8!,w_1456,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F14777982-7368-4d8d-b1a2-51e020be826e.png",
      ],
    },
    "panama city panama": {
      exclude: [
        "https://substackcdn.com/image/fetch/$s_!OEM8!,w_1456,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F14777982-7368-4d8d-b1a2-51e020be826e.png",
      ],
    },
    "san francisco": {
      exclude: [
        "https://substackcdn.com/image/fetch/$s_!jOVN!,w_1456,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F7983bac7-8bbc-4a5a-9dec-fff1658508c5_800x1067.jpeg",
        "https://substackcdn.com/image/fetch/$s_!bRPa!,w_1456,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2Fda47a01f-efdc-40c0-a7dc-2c4e9dd1edc5_800x600.jpeg",
      ],
    },
    soma: {
      dropClub: true,
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
      .replace(/^\s*-\s*/g, "")
      .replace(/\s*-\s*$/g, "")
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

  function getMediaPhotos(entry) {
    var seen = {};
    var photos = Array.isArray(entry && entry.photos) ? entry.photos : [];
    return photos.filter(function (photo) {
      if (!photo || seen[photo]) return false;
      seen[photo] = true;
      return true;
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

  function buildMediaRegistry(mediaData) {
    var registry = {};

    (mediaData && mediaData.clubs || []).forEach(function (entry) {
      if (!entry) return;
      var filteredPhotos = applyPhotoRule(getMediaPhotos(entry), entry.slug || entry.displayName);
      var hasVisual = Boolean(entry.photo) || filteredPhotos.length > 0;
      if (!hasVisual) return;

      [entry.slug, entry.displayName].forEach(function (value) {
        getAliasCandidates(value).forEach(function (key) {
          if (!registry[key]) {
            registry[key] = entry;
          }
        });
      });
    });

    return registry;
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

  function getAliasCandidates(key) {
    var rawKey = String(key || "")
      .replace(/[—–]/g, "-")
      .replace(/\s+/g, " ")
      .trim();
    var rawVariants = [rawKey];
    var normalizedKey = normalizeCity(rawKey);
    var aliases = CLUB_ALIASES[rawKey] || CLUB_ALIASES[normalizedKey] || [];
    var candidates = [];

    if (/^[a-z0-9-]+$/i.test(rawKey) && rawKey.indexOf("-") !== -1) {
      rawVariants.push(rawKey.replace(/-/g, " "));
    }

    if (/^new york\s*-\s*/i.test(rawKey)) {
      var newYorkTail = rawKey.replace(/^new york\s*-\s*/i, "").trim();
      rawVariants.push("ny - " + newYorkTail);
      rawVariants.push(newYorkTail);
    }

    if (/^ny\s*-\s*/i.test(rawKey)) {
      var nyTail = rawKey.replace(/^ny\s*-\s*/i, "").trim();
      rawVariants.push("new york - " + nyTail);
      rawVariants.push(nyTail);
    }

    rawVariants.forEach(function (variant) {
      candidates.push(normalizeCity(variant));
      candidates.push(normalizeSpotlightLookup(variant));
    });

    aliases.forEach(function (alias) {
      candidates.push(normalizeCity(alias));
      candidates.push(normalizeSpotlightLookup(alias));
    });

    return Array.from(new Set(candidates.filter(Boolean)));
  }

  function getSpotlightForKey(key) {
    if (!key) return null;

    var candidates = getAliasCandidates(key);

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

  function mergeSpotlight(club, record, photoUsageCounts, mediaEntry) {
    var spotlight = getSpotlightForKey(club.city) || getSpotlightForKey(cleanDisplayCity(club));
    var spotlightKey = normalizeCity(cleanDisplayCity(club));
    var isHamptonsClub =
      normalizeCity(club.city || "").indexOf("hamptons") !== -1 ||
      spotlightKey.indexOf("hamptons") !== -1;
    var originalPhotos = getOriginalRecordPhotos(record, photoUsageCounts);
    var mediaPhotos = getMediaPhotos(mediaEntry);
    var mediaPhoto = mediaEntry && mediaEntry.photo ? mediaEntry.photo : "";

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

    if (mediaEntry && mediaEntry.sourceDate && !spotlight.sourceDate) {
      spotlight.sourceDate = mediaEntry.sourceDate;
    }

    if (mediaEntry && mediaEntry.updatedAt && !spotlight.sourceDate) {
      spotlight.sourceDate = mediaEntry.updatedAt;
    }

    if (mediaEntry && mediaEntry.attribution && !spotlight.attribution) {
      spotlight.attribution = mediaEntry.attribution;
    }

    if (mediaEntry && mediaEntry.region && !spotlight.region) {
      spotlight.region = mediaEntry.region;
    }

    if (mediaEntry && mediaEntry.topics && mediaEntry.topics.length && !(spotlight.topics && spotlight.topics.length)) {
      spotlight.topics = Array.from(new Set([].concat(mediaEntry.topics, spotlight.topics || []))).slice(0, 16);
    }

    if (originalPhotos.length && !isHamptonsClub) {
      spotlight.photos = applyPhotoRule(originalPhotos, spotlightKey).slice(0, 6);
      spotlight.photoTreatment = "polaroid-frame";
      spotlight.heroPhotoIndex = 0;
      delete spotlight.photo;
    } else if (mediaPhotos.length) {
      spotlight.photos = applyPhotoRule(mediaPhotos, spotlightKey).slice(0, 6);
      spotlight.photoTreatment = mediaEntry.photoTreatment || "polaroid-frame";
      spotlight.heroPhotoIndex = 0;
      delete spotlight.photo;
    } else if (mediaPhoto) {
      spotlight.photo = mediaPhoto;
      spotlight.photoTreatment = mediaEntry.photoTreatment || spotlight.photoTreatment || "";
      delete spotlight.photos;
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
    var match = null;

    getAliasCandidates(club.city).forEach(function (candidate) {
      candidates.push(candidate);
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

  function findMediaForClub(mediaRegistry, club) {
    var label = cleanDisplayCity(club);
    var rawCandidates = [
      club.city,
      club.displayCity,
      label,
      label.replace(/^NY\s+-\s+/i, ""),
    ];
    var match = null;

    rawCandidates.forEach(function (value) {
      getAliasCandidates(value).forEach(function (candidate) {
        if (!match && candidate && mediaRegistry[candidate]) {
          match = mediaRegistry[candidate];
        }
      });
    });

    return match;
  }

  function buildClubButtons(clubs, cache, mediaData) {
    var container = document.getElementById("clubs-list");
    var cacheCities = (cache && cache.cities) || {};
    var mediaRegistry = buildMediaRegistry(mediaData);
    var photoUsageCounts = buildPhotoUsageCounts(cacheCities);
    var filtered = [];
    var deduped = new Map();

    clubs.forEach(function (club) {
      var override = (window.CLUB_OVERRIDES && window.CLUB_OVERRIDES[club.city]) || {};
      if (isSuppressedClub(club)) return;
      var record = findRecordForClub(cacheCities, club);
      var mediaEntry = findMediaForClub(mediaRegistry, club);
      if (!record && !mediaEntry) return;
      var spotlight = mergeSpotlight(Object.assign({}, club, override), record, photoUsageCounts, mediaEntry);
      var hasVisual = Boolean(spotlight && spotlight.photos && spotlight.photos.length);
      if (!hasVisual && !(spotlight && spotlight.photo)) return;
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
      var heroPhoto = (entry.spotlight && entry.spotlight.photos && entry.spotlight.photos[0]) ||
                      (entry.spotlight && entry.spotlight.photo) || "";
      button.type = "button";
      button.className = "wc-topics-btn";
      button.dataset.city = club.city;
      button.dataset.displayCity = title;
      button.dataset.scheduleLabel = scheduleLabel;
      button.dataset.eventTime = club.eventTimeLabel || club.eventTime || "";
      button.dataset.upcomingDate = resolveUpcomingDate(club);
      button.dataset.venue = stripVenue(club.venue || "");
      button.dataset.region = club.region || "";
      button.dataset.heroPhoto = heroPhoto;
      button.textContent = title;
      container.appendChild(button);
    });

    var buttons = Array.from(container.querySelectorAll(".wc-topics-btn"));
    buildPickerPanels(filtered, titleCounts);
    return buttons;
  }

  var REGION_ORDER = [
    "Northeast US", "Southeast US", "West Coast",
    "UK", "Europe", "Australia", "Other",
  ];

  function buildPickerPanels(filtered, titleCounts) {
    buildListPicker(filtered, titleCounts);
    buildGridPicker(filtered, titleCounts);
  }

  function buildListPicker(filtered, titleCounts) {
    var container = document.getElementById("lh-list-picker-content");
    if (!container) return;
    container.innerHTML = "";

    // Group by region
    var grouped = {};
    filtered.forEach(function (entry) {
      var region = entry.club.region || "Other";
      if (!grouped[region]) grouped[region] = [];
      grouped[region].push(entry);
    });

    var orderedRegions = REGION_ORDER.filter(function (r) { return grouped[r]; })
      .concat(Object.keys(grouped).filter(function (r) { return REGION_ORDER.indexOf(r) === -1; }));

    orderedRegions.forEach(function (region) {
      var entries = grouped[region];
      var section = document.createElement("div");
      section.className = "lh-list-region";

      var row = document.createElement("div");
      row.className = "lh-list-row";

      var label = document.createElement("span");
      label.className = "lh-list-region-label";
      label.textContent = region;
      row.appendChild(label);

      var cities = document.createElement("div");
      cities.className = "lh-list-cities";

      entries.forEach(function (entry) {
        var title = formatPhotoRollTitle(entry.club, titleCounts);
        var btn = document.createElement("button");
        btn.className = "lh-list-city-btn";
        btn.dataset.city = entry.club.city;

        var nameSpan = document.createElement("span");
        nameSpan.textContent = title;
        btn.appendChild(nameSpan);

        cities.appendChild(btn);
      });

      row.appendChild(cities);
      section.appendChild(row);
      container.appendChild(section);
    });
  }

  function buildGridPicker(filtered, titleCounts) {
    var container = document.getElementById("lh-grid-picker-content");
    if (!container) return;
    container.innerHTML = "";

    filtered.forEach(function (entry) {
      var title = formatPhotoRollTitle(entry.club, titleCounts);
      var heroPhoto = (entry.spotlight && entry.spotlight.photos && entry.spotlight.photos[0]) ||
                      (entry.spotlight && entry.spotlight.photo) || "";
      var scheduleLabel = formatSchedule(entry.club.schedule, entry.club);

      var card = document.createElement("button");
      card.type = "button";
      card.className = "lh-city-card";
      card.dataset.city = entry.club.city;

      if (heroPhoto) {
        var img = document.createElement("img");
        img.className = "lh-city-card-img";
        img.src = heroPhoto;
        img.alt = "";
        img.setAttribute("aria-hidden", "true");
        card.appendChild(img);
      }

      var info = document.createElement("div");
      info.className = "lh-city-card-info";

      var name = document.createElement("span");
      name.className = "lh-city-card-name";
      name.textContent = title;
      info.appendChild(name);

      if (scheduleLabel) {
        var sched = document.createElement("span");
        sched.className = "lh-city-card-schedule";
        sched.textContent = scheduleLabel;
        info.appendChild(sched);
      }

      card.appendChild(info);
      container.appendChild(card);
    });
  }

  function wireViewPickers(buttons) {
    var listPicker = document.getElementById("lh-list-picker");
    var gridPicker = document.getElementById("lh-grid-picker");
    var shuffleBtn = document.getElementById("lh-shuffle");
    var listBtn    = document.getElementById("lh-list-view");
    var gridBtn    = document.getElementById("lh-grid-view");
    var listBack   = document.getElementById("lh-list-back");
    var gridBack   = document.getElementById("lh-grid-back");

    function closePickers() {
      if (listPicker) listPicker.classList.remove("is-open");
      if (gridPicker) gridPicker.classList.remove("is-open");
      if (listBtn) listBtn.classList.remove("is-active");
      if (gridBtn) gridBtn.classList.remove("is-active");
    }

    function openPicker(picker, activeBtn) {
      closePickers();
      if (picker) picker.classList.add("is-open");
      if (activeBtn) activeBtn.classList.add("is-active");
    }

    function pickCity(cityKey) {
      closePickers();
      var btn = buttons.find(function (b) { return b.dataset.city === cityKey; });
      if (btn) btn.click();
    }

    if (shuffleBtn) {
      shuffleBtn.addEventListener("click", function () {
        closePickers();
        // Use exposed random nav if available, otherwise click a random button
        if (typeof window.navigateOverlayRandom === "function") {
          window.navigateOverlayRandom();
        } else {
          var randomBtn = buttons[Math.floor(Math.random() * buttons.length)];
          if (randomBtn) randomBtn.click();
        }
      });
    }

    if (listBtn) listBtn.addEventListener("click", function () { openPicker(listPicker, listBtn); });
    if (gridBtn) gridBtn.addEventListener("click", function () { openPicker(gridPicker, gridBtn); });

    // Clicking the city name also opens the list picker (V3 pattern)
    var cityBtn = document.getElementById("wc-overlay-city");
    if (cityBtn) cityBtn.addEventListener("click", function () { openPicker(listPicker, listBtn); });
    if (listBack) listBack.addEventListener("click", closePickers);
    if (gridBack) gridBack.addEventListener("click", closePickers);

    // Delegate clicks inside list picker
    if (listPicker) {
      listPicker.addEventListener("click", function (e) {
        var btn = e.target.closest(".lh-list-city-btn");
        if (!btn) return;
        pickCity(btn.dataset.city);
      });
    }

    // Delegate clicks inside grid picker
    if (gridPicker) {
      gridPicker.addEventListener("click", function (e) {
        var card = e.target.closest(".lh-city-card");
        if (!card) return;
        pickCity(card.dataset.city);
      });
    }

    // Close pickers on Escape
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closePickers();
    });
  }

  function readRequestedCity() {
    var params = new URLSearchParams(window.location.search);
    return {
      raw: params.get("city") || "",
      normalized: normalizeCity(params.get("city") || ""),
    };
  }

  function readPreviewMode() {
    var params = new URLSearchParams(window.location.search);
    var rawMode = (params.get("mode") || params.get("view") || "").toLowerCase().trim();
    if (rawMode === "text" || rawMode === "text-only" || rawMode === "capture") {
      return "text-only";
    }
    if (rawMode === "polaroid" || rawMode === "photo" || rawMode === "hero") {
      return "polaroid";
    }
    return "";
  }

  function getButtonMatchCandidates(button) {
    var dataset = button.dataset || {};
    var rawValues = [
      dataset.city,
      dataset.displayCity,
      (dataset.displayCity || "").replace(/^NY\s+-\s+/i, ""),
    ].filter(Boolean);
    var candidates = [];

    rawValues.forEach(function (value) {
      candidates.push(normalizeCity(value));
      candidates.push(normalizeSpotlightLookup(value));
      getAliasCandidates(value).forEach(function (candidate) {
        candidates.push(candidate);
      });
    });

    return Array.from(new Set(candidates.filter(Boolean)));
  }

  function resolveRequestedButton(buttons, requestedCity) {
    if (!requestedCity || !requestedCity.normalized) return null;
    var requestedCandidates = getAliasCandidates(requestedCity.raw || requestedCity.normalized);

    return buttons.find(function (button) {
      var buttonCandidates = getButtonMatchCandidates(button);
      return requestedCandidates.some(function (candidate) {
        return buttonCandidates.includes(candidate);
      });
    }) || null;
  }

  function wireStandaloneBehavior(buttons) {
    var requestedCity = readRequestedCity();
    var previewMode = readPreviewMode();
    window.WWTA_RETURN_URL = RETURN_URL;
    if (document.body && previewMode) {
      document.body.dataset.wordCloudPreviewMode = previewMode;
    }
    var closeButton = document.getElementById("wc-overlay-close");
    if (closeButton) {
      closeButton.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopImmediatePropagation();
        window.location.href = RETURN_URL;
      }, true);
    }

    var target = resolveRequestedButton(buttons, requestedCity);
    var hasExplicitRequest = Boolean(requestedCity && requestedCity.normalized);

    if (!target && !hasExplicitRequest) {
      target = buttons.find(function (button) {
        return normalizeCity(button.dataset.city).indexOf("biarritz") !== -1;
      }) || buttons.find(function (button) {
        return normalizeCity(button.dataset.city).indexOf("hamptons") !== -1;
      }) || buttons[0];
    }

    wireViewPickers(buttons);

    if (target) {
      setTimeout(function () {
        target.click();
      }, 240);
    } else if (hasExplicitRequest) {
      console.warn("WWTA standalone route could not resolve requested city:", requestedCity.raw);
    }
  }

  // Merge admin-entered WWTA data (blob storage) into WC_SPOTLIGHTS
  function mergeAdminWwta(cities) {
    if (!cities || typeof cities !== "object") return;
    var newCityKeys = new Set();

    Object.entries(cities).forEach(function (pair) {
      var cityKey = pair[0];
      var record  = pair[1];
      if (!record) return;

      var adminTopics = Array.isArray(record.topics) ? record.topics : [];
      var adminPhotos = Array.isArray(record.photos) ? record.photos.filter(Boolean) : [];
      if (!adminTopics.length && !adminPhotos.length) return;

      newCityKeys.add(cityKey);

      // Find existing spotlight by key
      var spotlights = Array.isArray(window.WC_SPOTLIGHTS) ? window.WC_SPOTLIGHTS : [];
      var existing = spotlights.find(function (s) {
        return normalizeCity(s.displayName) === cityKey ||
               normalizeCity(s.displayName).indexOf(cityKey) !== -1 ||
               cityKey.indexOf(normalizeCity(s.displayName)) !== -1;
      });

      if (existing) {
        // Prepend admin topics (most recent / most authentic)
        if (adminTopics.length) {
          existing.topics = Array.from(new Set(adminTopics.concat(existing.topics || []))).slice(0, 20);
        }
        // Prepend admin photos
        if (adminPhotos.length) {
          existing.photos = adminPhotos.concat(existing.photos || []);
          existing.photoTreatment = existing.photoTreatment || "polaroid-frame";
          delete existing.photo;
        }
        // Update source date if more recent
        if (record.latestDate && (!existing.sourceDate || record.latestDate > existing.sourceDate)) {
          existing.sourceDate = record.latestDate;
        }
      } else {
        // New city from admin — add a spotlight entry
        var newSpotlight = {
          displayName: cityKey,
          topics: adminTopics,
          photos: adminPhotos,
          photoTreatment: "polaroid-frame",
          heroPhotoIndex: 0,
          sourceDate: record.latestDate || null,
        };
        if (Array.isArray(window.WC_SPOTLIGHTS)) {
          window.WC_SPOTLIGHTS.push(newSpotlight);
        }
      }
    });

    // Mark buttons for cities with fresh admin data
    window._wwtaAdminCityKeys = newCityKeys;
    document.querySelectorAll(".wc-topics-btn").forEach(function (btn) {
      var key = normalizeCity(btn.dataset.city || "");
      var hasAdmin = false;
      newCityKeys.forEach(function (k) {
        if (k === key || key.indexOf(k) !== -1 || k.indexOf(key) !== -1) hasAdmin = true;
      });
      if (hasAdmin) btn.dataset.hasAdminWwta = "1";
    });
  }

  // Build the set of city keys whose media update is recent (within
  // NEW_WINDOW_DAYS of the newest update across the dataset). Any freshly
  // added update — e.g. a new WhatsApp import — gets a NEW tag automatically.
  var NEW_WINDOW_DAYS = 30;
  function computeNewCityKeys(media) {
    var keys = new Set();
    var clubs = (media && media.clubs) || [];
    var stamp = function (c) { return Date.parse(c.updatedAt || c.sourceDate || "") || 0; };
    var newest = clubs.reduce(function (max, c) { return Math.max(max, stamp(c)); }, 0);
    if (!newest) return keys;
    var cutoff = newest - NEW_WINDOW_DAYS * 24 * 60 * 60 * 1000;
    clubs.forEach(function (c) {
      if (stamp(c) >= cutoff) {
        keys.add(normalizeCity(c.displayName || c.slug || ""));
        if (c.slug) keys.add(normalizeCity(c.slug.replace(/-/g, " ")));
      }
    });
    return keys;
  }

  // Show/hide NEW badge — true for admin WWTA cities or recently-updated ones
  function syncNewBadge(cityKey) {
    var badge = document.getElementById("lh-new-badge");
    if (!badge) return;
    var normalized = normalizeCity(cityKey || "");
    var matches = function (keys) {
      if (!keys || !keys.size) return false;
      var hit = false;
      keys.forEach(function (k) {
        if (k && (k === normalized || normalized.indexOf(k) !== -1 || k.indexOf(normalized) !== -1)) hit = true;
      });
      return hit;
    };
    var isNew = matches(window._wwtaAdminCityKeys) || matches(window._wwtaNewCityKeys);
    badge.style.display = isNew ? "" : "none";
  }

  window._wwtaSyncNewBadge = syncNewBadge;

  window.addEventListener("load", function () {
    Promise.all([
      loadJson(CLUBS_MAP_URL),
      loadJson(CACHE_URL).catch(function () { return { cities: {} }; }),
      loadJson(MEDIA_URL).catch(function () { return { clubs: [] }; }),
      fetch("/.netlify/functions/get-wwta")
        .then(function (r) { return r.ok ? r.json() : { cities: {} }; })
        .catch(function () { return { cities: {} }; }),
    ]).then(function (results) {
      var clubs     = results[0] || [];
      var cache     = results[1] || { cities: {} };
      var media     = results[2] || { clubs: [] };
      var adminWwta = results[3] || { cities: {} };
      var buttons   = buildClubButtons(clubs, cache, media);
      window._wwtaNewCityKeys = computeNewCityKeys(media);
      mergeAdminWwta(adminWwta.cities || {});
      // Hide NEW badge initially; it'll show when a city with admin data is opened
      var badge = document.getElementById("lh-new-badge");
      if (badge) badge.style.display = "none";
      wireStandaloneBehavior(buttons);
    }).catch(function (error) {
      console.error("WWTA bootstrap error:", error);
    });
  });
})();
