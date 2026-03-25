(function () {
  "use strict";

  var CLUBS_MAP_URL = "./data/clubs-map.json";
  var MEDIA_MANIFEST_URL = "./data/wwta-media.json";
  var TOPICS_ENDPOINT = "/.netlify/functions/fetch-substack-topics";

  var statusEl = document.getElementById("wwta-status");
  var mediaEl = document.getElementById("wwta-media");
  var titleEl = document.getElementById("wwta-club-title");
  var metaEl = document.getElementById("wwta-meta");
  var sourceEl = document.getElementById("wwta-source");
  var topicsEl = document.getElementById("wwta-topics");
  var pillsEl = document.getElementById("wwta-club-pills");
  var counterEl = document.getElementById("wwta-counter");
  var prevBtn = document.getElementById("wwta-prev");
  var nextBtn = document.getElementById("wwta-next");

  var mediaManifest = { cities: {} };
  var liveTopics = {};
  var liveDates = {};
  var usingLiveTopics = false;
  var clubs = [];
  var activeIndex = 0;
  var photoTimer = null;
  var activePhotoIndex = 0;

  var REGION_TOPIC_FALLBACKS = {
    "Northeast US": ["side projects", "coffee", "real estate", "what's next", "remote work", "early risers"],
    "Southeast US": ["new friends", "beach mornings", "warm winters", "career moves", "building things", "creative energy"],
    "West Coast": ["venture capital", "surf before work", "product thinking", "startup pivots", "climate tech", "outdoor culture"],
    "UK": ["proper breakfast", "flat whites", "fintech", "pub culture", "creative agencies", "the housing crisis"],
    "Europe": ["design", "digital nomads", "proper coffee", "work-life balance", "slow mornings", "expat life"],
    "Australia": ["flat whites", "startup culture", "beach before work", "early risers", "housing market", "global pivot"],
    "Other": ["community", "new friends", "ambition", "what's next", "travel stories", "building things"],
  };

  function normalizeCity(value) {
    return (value || "")
      .toLowerCase()
      .replace(/\bme\b/g, "")
      .replace(/\bny\b/g, "")
      .replace(/\bnj\b/g, "")
      .replace(/[^a-z0-9\s\-]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function cleanDisplayCity(club) {
    var display = club.displayCity || club.city || "";
    return display.replace(/,\s*[A-Z]{2,3}$/, "").trim();
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

  function formatSchedule(schedule) {
    if (!schedule || !schedule.type) return "";
    if (schedule.type === "monthly") {
      var ordinal = ordinalLabel(schedule.ordinal);
      var weekday = weekdayLabel(schedule.weekday);
      if (ordinal && weekday) return ordinal + " " + weekday;
      return "Monthly";
    }
    if (schedule.type === "biweekly") {
      return schedule.weekday ? "Every other " + weekdayLabel(schedule.weekday) : "Every other week";
    }
    if (schedule.type === "weekly") {
      return schedule.weekday ? "Every " + weekdayLabel(schedule.weekday) : "Weekly";
    }
    if (schedule.type === "specific" && schedule.dates && schedule.dates.length) {
      return "Upcoming " + formatDate(schedule.dates[0], { month: "short", day: "numeric" });
    }
    return "";
  }

  function formatDate(value, options) {
    if (!value) return "";
    var date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString("en-US", options || { month: "short", day: "numeric", year: "numeric" });
  }

  function hashColorSeed(value) {
    var seed = 0;
    for (var i = 0; i < value.length; i += 1) {
      seed = (seed * 31 + value.charCodeAt(i)) % 360;
    }
    return seed;
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

  function fallbackTopicsForClub(club) {
    return REGION_TOPIC_FALLBACKS[club.region] || REGION_TOPIC_FALLBACKS.Other;
  }

  function stopPhotoCycle() {
    if (photoTimer) {
      clearInterval(photoTimer);
      photoTimer = null;
    }
  }

  function createMediaMarkup(club, media, photoIndex) {
    var displayCity = cleanDisplayCity(club);
    var photos = media && Array.isArray(media.photos) ? media.photos : [];
    var treatment = (media && media.photoTreatment) || "polaroid-frame";
    var placeholderQuery = buildPlaceholderQuery(club, media);
    var colorSeed = hashColorSeed(displayCity || club.city || "Breakfast Club");
    var accent = "hsla(" + colorSeed + ", 74%, 76%, 0.54)";
    var photoPosition = (media && media.photoPositionY) || "20%";

    if (photos.length) {
      var src = photos[photoIndex % photos.length];
      if (treatment === "native-polaroid") {
        return (
          '<div class="wwta-media-stage" style="--wwta-accent:' + accent + '; --wwta-photo-position:' + photoPosition + ';">' +
            '<div class="wwta-media-blur"></div>' +
            '<div class="wwta-media-card">' +
              '<img src="' + src + '" alt="Recap media for ' + displayCity + '">' +
              '<p class="wwta-media-caption">' + displayCity + '</p>' +
            "</div>" +
          "</div>"
        );
      }

      return (
        '<div class="wwta-media-stage" style="--wwta-accent:' + accent + '; --wwta-photo-position:' + photoPosition + ';">' +
          '<div class="wwta-media-blur"></div>' +
          '<div class="wwta-media-card">' +
            '<img src="' + src + '" alt="Recap media for ' + displayCity + '">' +
            '<p class="wwta-media-caption">' + displayCity + " · " + ((media && media.attribution) || "Photo treatment preview") + '</p>' +
          "</div>" +
        "</div>"
      );
    }

    return (
      '<div class="wwta-media-stage" style="--wwta-accent:' + accent + ';">' +
        '<div class="wwta-media-blur"></div>' +
        '<div class="wwta-media-card">' +
          '<div class="wwta-media-placeholder">' +
            '<div class="wwta-media-placeholder-copy">' +
              '<p class="wwta-media-kicker">Media Placeholder</p>' +
              '<p class="wwta-media-city">' + displayCity + '</p>' +
              '<p class="wwta-media-query">' + placeholderQuery + '</p>' +
            "</div>" +
          "</div>" +
        "</div>" +
      "</div>"
    );
  }

  function schedulePhotoCycle(media) {
    stopPhotoCycle();
    if (!media || !Array.isArray(media.photos) || media.photos.length <= 1) return;

    photoTimer = setInterval(function () {
      activePhotoIndex = (activePhotoIndex + 1) % media.photos.length;
      renderMedia();
    }, 7000);
  }

  function renderMedia() {
    var club = clubs[activeIndex];
    if (!club) return;
    var media = club.media || {};
    mediaEl.innerHTML = createMediaMarkup(club, media, activePhotoIndex);
    schedulePhotoCycle(media);
  }

  function renderTopics(club) {
    var topicList = club.topics && club.topics.length ? club.topics : fallbackTopicsForClub(club);
    topicsEl.innerHTML = "";
    topicList.slice(0, 10).forEach(function (topic) {
      var chip = document.createElement("span");
      chip.className = "wwta-topic";
      chip.textContent = topic;
      topicsEl.appendChild(chip);
    });
  }

  function renderPills() {
    pillsEl.innerHTML = "";
    clubs.forEach(function (club, index) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "wwta-club-pill" + (index === activeIndex ? " is-active" : "");
      button.textContent = cleanDisplayCity(club);
      button.addEventListener("click", function () {
        activeIndex = index;
        activePhotoIndex = 0;
        render();
      });
      pillsEl.appendChild(button);
    });
  }

  function render() {
    var club = clubs[activeIndex];
    if (!club) return;

    titleEl.textContent = "BK Club " + cleanDisplayCity(club);

    var metaParts = [];
    if (club.venue) metaParts.push(club.venue);
    var schedule = formatSchedule(club.schedule);
    if (schedule) metaParts.push(schedule);
    if (club.upcoming_date) metaParts.push(formatDate(club.upcoming_date));
    if (!metaParts.length && club.region) metaParts.push(club.region);
    metaEl.textContent = metaParts.join(" | ");

    if (club.liveDate) {
      sourceEl.textContent = "Latest recap source: " + formatDate(club.liveDate);
    } else if (usingLiveTopics) {
      sourceEl.textContent = "Live recap feed loaded. This club is using regional topic fallback for now.";
    } else {
      sourceEl.textContent = "Scaffold mode on latest site: regional topic placeholders until recap feed is wired here.";
    }

    counterEl.textContent = activeIndex + 1 + " of " + clubs.length;
    renderMedia();
    renderTopics(club);
    renderPills();
  }

  function readQueryParam() {
    var params = new URLSearchParams(window.location.search);
    var city = params.get("city");
    return city ? normalizeCity(city) : "";
  }

  function deriveClubRecord(club) {
    var displayKey = normalizeCity(club.displayCity);
    var cityKey = normalizeCity(club.city);
    var media = mediaManifest.cities[club.city] ||
      mediaManifest.cities[club.displayCity] ||
      mediaManifest.cities[cityKey] ||
      mediaManifest.cities[displayKey] ||
      {};
    var topics = liveTopics[cityKey] || liveTopics[displayKey] || [];
    var liveDate = liveDates[cityKey] || liveDates[displayKey] || "";

    return Object.assign({}, club, {
      media: media,
      topics: topics,
      liveDate: liveDate,
    });
  }

  function setStatus(message, isError) {
    statusEl.textContent = message;
    statusEl.classList.toggle("error", Boolean(isError));
  }

  function loadJson(url) {
    return fetch(url).then(function (res) {
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.json();
    });
  }

  function loadTopics() {
    return fetch(TOPICS_ENDPOINT)
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(function (payload) {
        usingLiveTopics = true;
        liveTopics = payload.cities || {};
        liveDates = payload.dates || {};
      })
      .catch(function () {
        usingLiveTopics = false;
        liveTopics = {};
        liveDates = {};
      });
  }

  function bindEvents() {
    prevBtn.addEventListener("click", function () {
      activeIndex = (activeIndex - 1 + clubs.length) % clubs.length;
      activePhotoIndex = 0;
      render();
    });

    nextBtn.addEventListener("click", function () {
      activeIndex = (activeIndex + 1) % clubs.length;
      activePhotoIndex = 0;
      render();
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "ArrowLeft") prevBtn.click();
      if (event.key === "ArrowRight") nextBtn.click();
    });
  }

  Promise.all([
    loadJson(CLUBS_MAP_URL),
    loadJson(MEDIA_MANIFEST_URL).catch(function () { return { cities: {} }; }),
    loadTopics(),
  ]).then(function (results) {
    var clubData = results[0];
    mediaManifest = results[1] || { cities: {} };

    clubs = (clubData || [])
      .slice()
      .sort(function (a, b) {
        return cleanDisplayCity(a).localeCompare(cleanDisplayCity(b));
      })
      .map(deriveClubRecord);

    if (!clubs.length) {
      setStatus("Could not load club data for recap scope.", true);
      return;
    }

    var requestedCity = readQueryParam();
    var requestedIndex = clubs.findIndex(function (club) {
      return normalizeCity(club.city) === requestedCity || normalizeCity(club.displayCity) === requestedCity;
    });
    var hamptonsIndex = clubs.findIndex(function (club) {
      return normalizeCity(club.city).indexOf("hamptons") !== -1;
    });

    if (requestedIndex >= 0) activeIndex = requestedIndex;
    else if (hamptonsIndex >= 0) activeIndex = hamptonsIndex;

    if (usingLiveTopics) {
      setStatus("Latest site scaffold · live recap topics loaded where available");
    } else {
      setStatus("Latest site scaffold · using club metadata + topic placeholders until recap feed is wired");
    }

    bindEvents();
    render();
  }).catch(function () {
    setStatus("Could not load the recap scope right now.", true);
  });
})();

