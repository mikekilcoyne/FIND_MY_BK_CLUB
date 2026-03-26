(function () {
  "use strict";

  var CLUBS_MAP_URL = "./data/clubs-map.json";
  var CACHE_URL = "./data/wwta-substack-cache.json";

  var CLUB_ALIASES = {
    "new york - hamptons": ["hamptons", "downtown hamptons"],
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
      if (override.cadence === "Bi-Weekly" && schedule && schedule.weekday) {
        return "Every Other " + weekdayLabel(schedule.weekday);
      }
      if (override.cadence === "Weekly" && schedule && schedule.weekday) {
        return "Every " + weekdayLabel(schedule.weekday);
      }
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
    if (schedule.type === "specific") return "Pop-Up";
    return "";
  }

  function getSpotlightForKey(key) {
    var normalized = normalizeCity(key);
    var match = WC_SPOTLIGHTS.find(function (spotlight) {
      var spotlightKey = normalizeCity(spotlight.displayName);
      return spotlightKey === normalized || spotlightKey.indexOf(normalized) !== -1 || normalized.indexOf(spotlightKey) !== -1;
    });
    return match || null;
  }

  function mergeSpotlight(club, record) {
    var spotlight = getSpotlightForKey(club.city) || getSpotlightForKey(cleanDisplayCity(club));
    var spotlightKey = normalizeCity(cleanDisplayCity(club));

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

    if ((!spotlight.photos || !spotlight.photos.length) && record && record.photos && record.photos.length && spotlightKey !== "hamptons") {
      spotlight.photos = record.photos.slice(0, 6);
      spotlight.photoTreatment = "polaroid-frame";
    }

    return spotlight;
  }

  function findRecordForClub(cacheCities, club) {
    var candidates = [normalizeCity(club.city), normalizeCity(cleanDisplayCity(club))];
    var aliases = CLUB_ALIASES[club.city] || [];
    var match = null;

    aliases.forEach(function (alias) {
      candidates.push(normalizeCity(alias));
    });

    candidates.some(function (candidate) {
      if (cacheCities[candidate]) {
        match = cacheCities[candidate];
        return true;
      }
      var partial = Object.keys(cacheCities).find(function (key) {
        return key === candidate || key.indexOf(candidate) !== -1 || candidate.indexOf(key) !== -1;
      });
      if (partial) {
        match = cacheCities[partial];
        return true;
      }
      return false;
    });

    return match;
  }

  function buildClubButtons(clubs, cache) {
    var container = document.getElementById("clubs-list");
    var cacheCities = (cache && cache.cities) || {};
    var filtered = [];

    clubs.forEach(function (club) {
      var override = (window.CLUB_OVERRIDES && window.CLUB_OVERRIDES[club.city]) || {};
      var record = findRecordForClub(cacheCities, club);
      var spotlight = mergeSpotlight(Object.assign({}, club, override), record);
      if (!spotlight || !(spotlight.topics && spotlight.topics.length) && !(spotlight.photos && spotlight.photos.length)) return;
      filtered.push({
        club: Object.assign({}, club, override),
        spotlight: spotlight,
        record: record,
      });
    });

    filtered.sort(function (a, b) {
      if (normalizeCity(a.club.city).indexOf("hamptons") !== -1) return -1;
      if (normalizeCity(b.club.city).indexOf("hamptons") !== -1) return 1;
      return cleanDisplayCity(a.club).localeCompare(cleanDisplayCity(b.club));
    });

    container.innerHTML = "";

    filtered.forEach(function (entry) {
      var button = document.createElement("button");
      var club = entry.club;
      var scheduleLabel = formatSchedule(club.schedule, club);
      button.type = "button";
      button.className = "wc-topics-btn";
      button.dataset.city = club.city;
      button.dataset.displayCity = cleanDisplayCity(club);
      button.dataset.scheduleLabel = scheduleLabel;
      button.dataset.eventTime = club.eventTime || "";
      button.dataset.venue = stripVenue(club.venue || "");
      button.textContent = cleanDisplayCity(club);
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
    var closeButton = document.getElementById("wc-overlay-close");
    if (closeButton) {
      closeButton.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopImmediatePropagation();
        window.location.href = "./index.html";
      }, true);
    }

    var target = buttons.find(function (button) {
      return normalizeCity(button.dataset.city) === requestedCity || normalizeCity(button.dataset.displayCity) === requestedCity;
    });

    if (!target) {
      target = buttons.find(function (button) {
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
