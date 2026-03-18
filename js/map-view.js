(function () {
  "use strict";

  var SHEET_CSV_URL =
    "https://docs.google.com/spreadsheets/d/1_4MoIXgSHjERztj0LPPC-XAa7nzFlfrdcjEQdBeSqto/export?format=csv&gid=105813476";

  // ── CSV parsing (same pipeline as home + calendar) ────

  function normCity(str) {
    return (str || "").toLowerCase().trim();
  }

  function parseCSVLine(line) {
    var out = [];
    var value = "";
    var inQuotes = false;
    for (var i = 0; i < line.length; i++) {
      var ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { value += '"'; i++; }
        else { inQuotes = !inQuotes; }
        continue;
      }
      if (ch === "," && !inQuotes) { out.push(value.trim()); value = ""; continue; }
      value += ch;
    }
    out.push(value.trim());
    return out;
  }

  function parseCSV(text) {
    var lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter(Boolean);
    var rows = [];
    var current = "";
    var quoteCount = 0;
    for (var i = 0; i < lines.length; i++) {
      if (current) current += "\n";
      current += lines[i];
      quoteCount += (lines[i].match(/"/g) || []).length;
      if (quoteCount % 2 === 0) {
        rows.push(parseCSVLine(current));
        current = "";
        quoteCount = 0;
      }
    }
    return rows;
  }

  function cleanCell(value) {
    var raw = (value || "").replace(/\s+/g, " ").trim();
    if (!raw) return "";
    var low = raw.toLowerCase();
    if (low === "tbd" || low === "x") return "";
    if (low.includes("looking for a home") || low.includes("changing locations soon")) return "";
    return raw;
  }

  function getVenueFromCells(loc, addr) {
    return cleanCell(loc) || cleanCell(addr) || "";
  }

  function normalizeFlyer(url) {
    if (!url) return "";
    var match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (match) return "https://drive.google.com/uc?export=view&id=" + match[1];
    var match2 = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (match2) return "https://drive.google.com/uc?export=view&id=" + match2[1];
    return url;
  }

  function extractInstagramURL(value) {
    var raw = (value || "").trim();
    var matches = raw.match(/@[A-Za-z0-9._]+/g) || [];
    if (!matches.length) return "";
    var handle = matches[0].replace(/^@/, "");
    return handle ? "https://www.instagram.com/" + handle + "/" : "";
  }

  function extractLinkedInURL(contactCell, linkedinCell) {
    var vals = [contactCell, linkedinCell];
    for (var i = 0; i < vals.length; i++) {
      var raw = (vals[i] || "").trim();
      if (!raw) continue;
      var direct = raw.match(/https?:\/\/(?:www\.)?linkedin\.com\/[^\s,]+/i);
      if (direct) return direct[0];
      var noProto = raw.match(/(?:www\.)?linkedin\.com\/[^\s,]+/i);
      if (noProto) return "https://" + noProto[0];
    }
    return "";
  }

  // ── Merge CSV onto geo club objects ───────────────────

  function mergeCSV(geoClubs, csvRows) {
    var OVERRIDES = window.CLUB_OVERRIDES || {};

    // Build header → index map so column moves never break lookups.
    var headers = (csvRows[0] || []).map(function (h) {
      return h.toLowerCase().replace(/[\s_]+/g, "_").trim();
    });
    var colIdx = {};
    headers.forEach(function (h, i) { colIdx[h] = i; });
    colIdx["host_linkedin_2"] = colIdx["host_linkedin_2"] != null ? colIdx["host_linkedin_2"] : colIdx["host_linkedin 2"];
    colIdx["whatsapp"] = colIdx["whatsapp"] != null ? colIdx["whatsapp"] : (colIdx["whatsapp_link"] != null ? colIdx["whatsapp_link"] : colIdx["community_link"]);
    function col(name, cells) { return (cells[colIdx[name]] || "").trim(); }

    var byCity = {};
    csvRows.slice(1).forEach(function (cells) {
      var key = normCity(col("city", cells));
      if (key) byCity[key] = cells;
    });

    return geoClubs.map(function (club) {
      var key = normCity(club.city);
      var override = OVERRIDES[key] || {};
      var cells = byCity[key] || [];
      return Object.assign({}, club, {
        displayCity: override.displayCity || club.displayCity || club.city,
        host: override.hostDisplay || cleanCell(col("host_name", cells)) || club.host || "",
        venue: override.venue || cleanCell(col("venue_name", cells)) || club.venue || "",
        linkedinURL: override.linkedinURL || extractLinkedInURL(col("host_linkedin", cells), col("host_linkedin_2", cells)) || club.linkedinURL || "",
        instagramURL: override.instagramURL || extractInstagramURL(col("host_instagram", cells)) || "",
        flyerURL: override.flyerURL || normalizeFlyer(col("flyer_url", cells)) || "",
        communityLink: override.communityLink || col("whatsapp", cells) || "",
      });
    });
  }

  var REGION_BOUNDS = {
    "Northeast US": [[38, -80], [47, -66]],
    "Southeast US": [[24, -92], [38, -75]],
    "West Coast":   [[32, -125], [49, -114]],
    "Europe":       [[35, -10],  [60, 30]],
    "UK":           [[49, -8],   [59, 2]],
    "Australia":    [[-44, 113], [-10, 154]],
    "Other":        null,
  };

  var REGION_ORDER = [
    "Northeast US",
    "Southeast US",
    "West Coast",
    "UK",
    "Europe",
    "Australia",
    "Other",
  ];

  var MAP_GREEN = "#0d6e43";

  var map;
  var markerLayer;
  var tripLayer = null;
  var allClubs = [];
  var activeRegion = "All";
  var tripActive = false;
  var suppressMapClose = false;

  // ── Map init ──────────────────────────────────────────

  function initMap() {
    map = L.map("map", {
      center: [30, 10],
      zoom: 2,
      zoomControl: true,
      attributionControl: true,
    });

    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
      {
        attribution:
          '&copy; <a href="https://carto.com/" target="_blank">CARTO</a> ' +
          '&copy; <a href="https://openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>',
        subdomains: "abcd",
        maxZoom: 19,
      }
    ).addTo(map);

    markerLayer = L.markerClusterGroup({
      maxClusterRadius: 50,
      showCoverageOnHover: false,
      spiderfyOnMaxZoom: true,
      iconCreateFunction: function (cluster) {
        return L.divIcon({
          html: '<div class="cluster-marker">' + cluster.getChildCount() + "</div>",
          className: "",
          iconSize: [34, 34],
          iconAnchor: [17, 17],
        });
      },
    });

    map.addLayer(markerLayer);

    map.on("click", function () {
      if (suppressMapClose) return;
      closeCard();
    });
  }

  // ── Markers ───────────────────────────────────────────

  function createPinIcon(matched) {
    var color = matched ? MAP_GREEN : "#111111";
    var size = matched ? 16 : 14;
    var half = size / 2;
    return L.divIcon({
      html: '<div class="pin-marker" style="background:' + color + ';width:' + size + 'px;height:' + size + 'px;"></div>',
      className: "",
      iconSize: [size, size],
      iconAnchor: [half, half],
    });
  }

  function renderMarkers(clubs) {
    markerLayer.clearLayers();
    clubs.forEach(function (club) {
      var marker = L.marker([club.latitude, club.longitude], {
        icon: createPinIcon(false),
        title: club.displayCity || club.city,
      });
      marker.on("click", function (e) {
        L.DomEvent.stopPropagation(e);
        openCard(club);
        if (window.BKAnalytics) {
          window.BKAnalytics.track("map_marker_click", {
            city: club.displayCity || club.city,
          });
        }
      });
      club._marker = marker;
      markerLayer.addLayer(marker);
    });
  }

  // ── Region filter ─────────────────────────────────────

  function renderRegionPills(presentRegions) {
    var nav = document.getElementById("region-nav");
    nav.appendChild(createPill("All", true));
    presentRegions.forEach(function (region) {
      nav.appendChild(createPill(region, false));
    });
  }

  function createPill(label, active) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "region-pill" + (active ? " active" : "");
    btn.textContent = label;
    btn.addEventListener("click", function () {
      setRegion(label);
    });
    return btn;
  }

  function setRegion(region) {
    if (tripActive) clearTripMode();
    activeRegion = region;

    document.querySelectorAll(".region-pill").forEach(function (pill) {
      pill.classList.toggle("active", pill.textContent === region);
    });

    var filtered =
      region === "All"
        ? allClubs
        : allClubs.filter(function (c) { return c.region === region; });

    renderMarkers(filtered);

    if (region !== "All" && REGION_BOUNDS[region]) {
      map.flyToBounds(REGION_BOUNDS[region], { duration: 1.2, padding: [40, 40] });
    } else if (region === "All") {
      map.flyTo([30, 10], 2, { duration: 1.2 });
    }

    closeCard();

    if (window.BKAnalytics) {
      window.BKAnalytics.track("map_region_filter", { region: region });
    }
  }

  // ── City card ─────────────────────────────────────────

  function openCard(club) {
    closeTripPanel();
    var card = document.getElementById("city-card");
    var cityEl = document.getElementById("card-city");
    var hostEl = document.getElementById("card-host");
    var venueEl = document.getElementById("card-venue");
    var dateEl = document.getElementById("card-date");
    var mapsBtn = document.getElementById("card-maps-btn");
    var linkedinBtn = document.getElementById("card-linkedin-btn");
    var instagramBtn = document.getElementById("card-instagram-btn");
    var siteLink = document.getElementById("card-site-link");

    cityEl.textContent = club.displayCity || club.city;
    hostEl.textContent = club.host || "";
    hostEl.style.display = club.host ? "" : "none";
    venueEl.textContent = club.venue || "";
    venueEl.style.display = club.venue ? "" : "none";

    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var storedDate = null;
    if (club.upcoming_date) {
      var sp = club.upcoming_date.split("-").map(Number);
      storedDate = new Date(sp[0], sp[1] - 1, sp[2]);
    }
    var nextDate = (storedDate && storedDate >= today) ? storedDate : computeNextDate(club.schedule);
    if (nextDate) {
      dateEl.textContent = "Next up: " + formatDate(nextDate);
      dateEl.style.display = "";
    } else {
      dateEl.style.display = "none";
    }

    var mapsURL =
      club.mapsURL ||
      "https://maps.google.com/?q=Breakfast+Club+" +
        encodeURIComponent(club.displayCity || club.city);

    var newMapsBtn = mapsBtn.cloneNode(true);
    newMapsBtn.href = mapsURL;
    newMapsBtn.addEventListener("click", function () {
      if (window.BKAnalytics) {
        window.BKAnalytics.track("map_open_in_maps", {
          city: club.displayCity || club.city,
        });
      }
    });
    mapsBtn.parentNode.replaceChild(newMapsBtn, mapsBtn);

    // siteLink handled in init() — zooms out to world view

    if (club.linkedinURL) {
      linkedinBtn.href = club.linkedinURL;
      linkedinBtn.hidden = false;
    } else {
      linkedinBtn.href = "#";
      linkedinBtn.hidden = true;
    }

    if (club.instagramURL) {
      instagramBtn.href = club.instagramURL;
      instagramBtn.hidden = false;
    } else {
      instagramBtn.href = "#";
      instagramBtn.hidden = true;
    }

    suppressMapClose = true;
    card.classList.add("open");
    setTimeout(function () { suppressMapClose = false; }, 50);

    if (window.innerWidth <= 960 && map) {
      // Keep selected pin visible above the bottom sheet on mobile.
      map.panTo([club.latitude, club.longitude], { animate: true, duration: 0.35 });
      setTimeout(function () {
        map.panBy([0, -120], { animate: true, duration: 0.35 });
      }, 120);
    }
  }

  function closeCard() {
    var card = document.getElementById("city-card");
    if (card) card.classList.remove("open");
  }

  function formatDate(d) {
    if (!d) return "";
    return d.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  }

  function computeNextDate(schedule) {
    if (!schedule || schedule.type === "unknown" || schedule.type === "biweekly") return null;
    var today = new Date();
    today.setHours(0, 0, 0, 0);

    if (schedule.type === "specific") {
      if (!schedule.dates || !schedule.dates.length) return null;
      for (var i = 0; i < schedule.dates.length; i++) {
        var p = schedule.dates[i].split("-").map(Number);
        var d = new Date(p[0], p[1] - 1, p[2]);
        if (d >= today) return d;
      }
      return null;
    }

    if (schedule.type === "weekly") {
      var diff = (schedule.weekday - today.getDay() + 7) % 7;
      var next = new Date(today);
      next.setDate(next.getDate() + diff);
      return next;
    }

    if (schedule.type === "monthly") {
      for (var offset = 0; offset <= 2; offset++) {
        var raw = today.getMonth() + offset;
        var y = today.getFullYear() + Math.floor(raw / 12);
        var m = raw % 12;
        var result = nthWeekdayOfMonth(y, m, schedule.ordinal, schedule.weekday);
        if (result && result >= today) return result;
      }
      return null;
    }

    return null;
  }

  // ── Trip planner: date logic ──────────────────────────

  function nthWeekdayOfMonth(year, month, n, weekday) {
    var first = new Date(year, month, 1);
    var offset = (weekday - first.getDay() + 7) % 7;
    var day = 1 + offset + (n - 1) * 7;
    var lastDay = new Date(year, month + 1, 0).getDate();
    if (day > lastDay) return null;
    return new Date(year, month, day);
  }

  function getMatchingDates(club, start, end) {
    var s = club.schedule;

    if (!s || s.type === "unknown") {
      return { dates: [], note: "Check schedule for exact dates" };
    }
    if (s.type === "biweekly") {
      return { dates: [], note: "Meets bi-weekly — check schedule" };
    }

    var results = [];

    if (s.type === "weekly") {
      var d = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      var diff = (s.weekday - d.getDay() + 7) % 7;
      d.setDate(d.getDate() + diff);
      while (d <= end) {
        results.push(new Date(d));
        d.setDate(d.getDate() + 7);
      }
    }

    if (s.type === "monthly") {
      var y = start.getFullYear();
      var m = start.getMonth();
      var endY = end.getFullYear();
      var endM = end.getMonth();
      while (y < endY || (y === endY && m <= endM)) {
        var date = nthWeekdayOfMonth(y, m, s.ordinal, s.weekday);
        if (date && date >= start && date <= end) {
          results.push(date);
        }
        m++;
        if (m > 11) { m = 0; y++; }
      }
    }

    return { dates: results, note: "" };
  }

  function formatShortDate(d) {
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }

  function formatISODate(d) {
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, "0");
    var day = String(d.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + day;
  }

  // ── Trip planner: wizard state ────────────────────────

  var tripState = { date: null, region: null, days: null };
  var currentStep = 1;

  function goToStep(n) {
    var goingBack = n < currentStep;
    currentStep = n;

    [1, 2, 3].forEach(function (i) {
      var step = document.getElementById("trip-step-" + i);
      if (!step) return;
      if (i === n) {
        step.removeAttribute("hidden");
        step.classList.remove("slide-back");
        if (goingBack) step.classList.add("slide-back");
        // Remove animation class after it fires so re-entering works
        step.addEventListener("animationend", function handler() {
          step.classList.remove("slide-back");
          step.removeEventListener("animationend", handler);
        });
      } else {
        step.setAttribute("hidden", "");
      }
    });

    [1, 2, 3].forEach(function (i) {
      var seg = document.getElementById("trip-seg-" + i);
      if (seg) seg.classList.toggle("filled", i <= n);
    });
    document.getElementById("trip-step-label").textContent = "Step " + n + " of 3";
    document.getElementById("trip-back-step").hidden = (n === 1);
    document.getElementById("trip-wizard").hidden = false;
    document.getElementById("trip-results").hidden = true;
  }

  function setDefaultDates() {
    var today = new Date();
    document.getElementById("trip-from").value = formatISODate(today);
  }

  function openTripPlanner() {
    closeCard();
    tripState = { date: null, region: null, days: null };
    currentStep = 0; // reset so goToStep(1) treats it as forward
    document.getElementById("trip-error").hidden = true;
    document.getElementById("trip-panel").classList.add("open");
    goToStep(1);
  }

  function closeTripPanel() {
    var panel = document.getElementById("trip-panel");
    if (panel) panel.classList.remove("open");
    if (tripActive) clearTripMode();
  }

  function buildRegionPills() {
    var container = document.getElementById("trip-region-pills");
    container.innerHTML = "";
    var regions = ["Anywhere"].concat(REGION_ORDER);
    regions.forEach(function (region) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "trip-option-pill";
      btn.textContent = region;
      btn.addEventListener("click", function () {
        container.querySelectorAll(".trip-option-pill").forEach(function (p) {
          p.classList.remove("active");
        });
        btn.classList.add("active");
        tripState.region = region === "Anywhere" ? null : region;
      });
      container.appendChild(btn);
    });
  }

  function runTripSearch() {
    var fromStr = document.getElementById("trip-from").value;
    var fromParts = fromStr.split("-").map(Number);
    var start = new Date(fromParts[0], fromParts[1] - 1, fromParts[2]);
    var days = tripState.days !== null ? tripState.days : 7;
    var noReturnFlight = days === 0;
    var searchDays = noReturnFlight ? 30 : days;
    var end = new Date(start);
    end.setDate(end.getDate() + searchDays - 1);

    var clubsToSearch = tripState.region
      ? allClubs.filter(function (c) { return c.region === tripState.region; })
      : allClubs;

    var results = [];
    clubsToSearch.forEach(function (club) {
      var match = getMatchingDates(club, start, end);
      if (match.dates.length > 0 || match.note) {
        results.push({ club: club, dates: match.dates, note: match.note });
      }
    });

    results.sort(function (a, b) {
      var aT = a.dates[0] ? a.dates[0].getTime() : Infinity;
      var bT = b.dates[0] ? b.dates[0].getTime() : Infinity;
      return aT - bT;
    });

    setTripMode(results, tripState.region);
    renderTripResults(results, noReturnFlight);

    if (window.BKAnalytics) {
      window.BKAnalytics.track("map_trip_search", {
        days: noReturnFlight ? "no_return" : days,
        region: tripState.region || "anywhere",
      });
    }
  }

  function setTripMode(results, region) {
    tripActive = true;
    var confirmed = results.filter(function (r) { return r.dates.length > 0; });
    var matchedCities = confirmed.map(function (r) { return r.club.city; });

    map.removeLayer(markerLayer);

    if (tripLayer) {
      tripLayer.clearLayers();
    } else {
      tripLayer = L.layerGroup();
    }
    tripLayer.addTo(map);

    confirmed.forEach(function (result) {
      var club = result.club;
      var marker = L.marker([club.latitude, club.longitude], {
        icon: createPinIcon(true),
        title: club.displayCity || club.city,
      });
      marker.on("click", function (e) {
        L.DomEvent.stopPropagation(e);
        openCard(club);
        if (window.BKAnalytics) {
          window.BKAnalytics.track("map_trip_result_click", {
            city: club.displayCity || club.city,
          });
        }
      });
      tripLayer.addLayer(marker);
    });

    if (confirmed.length > 0) {
      var latlngs = confirmed.map(function (r) {
        return [r.club.latitude, r.club.longitude];
      });
      map.flyToBounds(latlngs, { duration: 1.2, padding: [60, 60] });
    } else if (region && REGION_BOUNDS[region]) {
      map.flyToBounds(REGION_BOUNDS[region], { duration: 1.2, padding: [40, 40] });
    }
  }

  function clearTripMode() {
    tripActive = false;
    if (tripLayer) {
      tripLayer.clearLayers();
      map.removeLayer(tripLayer);
    }
    map.addLayer(markerLayer);
    var filtered = activeRegion === "All"
      ? allClubs
      : allClubs.filter(function (c) { return c.region === activeRegion; });
    renderMarkers(filtered);
  }

  function renderTripResults(results, noReturnFlight) {
    document.getElementById("trip-wizard").hidden = true;
    document.getElementById("trip-results").hidden = false;

    var summaryEl = document.getElementById("trip-results-summary");
    var listEl = document.getElementById("trip-results-list");
    var confirmed = results.filter(function (r) { return r.dates.length > 0; });
    var needsCheck = results.filter(function (r) { return r.note && r.dates.length === 0; });

    if (results.length === 0) {
      summaryEl.textContent = "No clubs found for those dates.";
      listEl.innerHTML = "<li class='trip-no-results'>Try a different start date or longer trip.</li>";
      return;
    }

    var confirmText;
    if (noReturnFlight) {
      confirmText = confirmed.length + " club" + (confirmed.length !== 1 ? "s" : "") + " — no return ticket needed";
    } else {
      confirmText = confirmed.length + " club" + (confirmed.length !== 1 ? "s" : "") + " during your trip";
    }
    summaryEl.textContent = confirmText;

    listEl.innerHTML = "";

    // Confirmed clubs — full result rows with dates
    confirmed.forEach(function (result) {
      var li = document.createElement("li");
      li.className = "trip-result-item";

      var dateStr = result.dates.map(formatShortDate).join(", ");

      li.innerHTML =
        '<div class="trip-result-main">' +
          '<span class="trip-result-date">' + dateStr + '</span>' +
          '<span class="trip-result-city">' + (result.club.displayCity || result.club.city) + '</span>' +
          (result.club.venue ? '<span class="trip-result-venue">' + result.club.venue + '</span>' : '') +
        '</div>' +
        '<button class="trip-result-go" type="button" aria-label="View on map">→</button>';

      li.querySelector(".trip-result-go").addEventListener("click", function () {
        map.flyTo([result.club.latitude, result.club.longitude], 13, { duration: 1 });
        openCard(result.club);
      });

      listEl.appendChild(li);
    });

    // Uncertain clubs — collapsed into a single footer note
    if (needsCheck.length > 0) {
      var otherLi = document.createElement("li");
      otherLi.className = "trip-others";
      var cityNames = needsCheck.map(function (r) {
        return r.club.displayCity || r.club.city;
      }).join(", ");
      otherLi.innerHTML =
        '<span class="trip-others-label">' +
          needsCheck.length + ' other BC' + (needsCheck.length !== 1 ? "s" : "") +
          ' that might be happening during your trip:' +
        '</span>' +
        '<span class="trip-others-cities">' + cityNames + '</span>';
      listEl.appendChild(otherLi);
    }
  }

  // ── Init ──────────────────────────────────────────────

  function init() {
    initMap();

    Promise.all([
      fetch("./data/clubs-map.json").then(function (res) {
        if (!res.ok) throw new Error("Failed to load map data");
        return res.json();
      }),
      fetch(SHEET_CSV_URL)
        .then(function (res) { return res.ok ? res.text() : ""; })
        .then(function (text) { return text ? parseCSV(text) : [[]]; })
        .catch(function () { return [[]]; }),
    ])
      .then(function (results) {
        var clubs = mergeCSV(results[0], results[1]);
        allClubs = clubs;
        renderMarkers(clubs);

        var presentRegions = REGION_ORDER.filter(function (r) {
          return clubs.some(function (c) { return c.region === r; });
        });
        renderRegionPills(presentRegions);
        setDefaultDates();

        var statusEl = document.getElementById("status");
        if (statusEl) statusEl.textContent = clubs.length + " clubs worldwide";
      })
      .catch(function (err) {
        console.error(err);
        var statusEl = document.getElementById("status");
        if (statusEl) statusEl.textContent = "Could not load map data.";
      });

    document.getElementById("card-close").addEventListener("click", function (e) {
      L.DomEvent.stopPropagation(e);
      closeCard();
    });

    document.getElementById("card-site-link").addEventListener("click", function (e) {
      e.preventDefault();
      closeCard();
      setRegion("All");
      map.flyTo([30, 10], 2, { duration: 1.2 });
    });

    document.getElementById("trip-planner-btn").addEventListener("click", function () {
      openTripPlanner();
    });

    document.getElementById("trip-close").addEventListener("click", function () {
      closeTripPanel();
    });

    // Back button (shared across steps)
    document.getElementById("trip-back-step").addEventListener("click", function () {
      if (currentStep > 1) goToStep(currentStep - 1);
    });

    // Step 1 → 2
    document.getElementById("trip-next-1").addEventListener("click", function () {
      var fromStr = document.getElementById("trip-from").value;
      var errorEl = document.getElementById("trip-error");
      if (!fromStr) {
        errorEl.textContent = "Pick a start date first.";
        errorEl.hidden = false;
        return;
      }
      errorEl.hidden = true;
      tripState.date = fromStr;
      buildRegionPills();
      goToStep(2);
    });

    // Step 2 → 3
    document.getElementById("trip-next-2").addEventListener("click", function () {
      goToStep(3);
    });

    // Duration pills → select only
    document.getElementById("trip-duration-pills").addEventListener("click", function (e) {
      var pill = e.target.closest(".trip-option-pill[data-days]");
      if (!pill) return;
      document.querySelectorAll("#trip-duration-pills .trip-option-pill").forEach(function (p) {
        p.classList.remove("active");
      });
      pill.classList.add("active");
      tripState.days = parseInt(pill.getAttribute("data-days"), 10);
      var carmenEl = document.getElementById("carmen-text");
      if (carmenEl) carmenEl.hidden = (tripState.days !== 0);
    });

    // Step 3 → search (auto-shows results)
    document.getElementById("trip-go").addEventListener("click", function () {
      if (tripState.days === null) tripState.days = 7;
      runTripSearch();
    });

    // Results → new search
    document.getElementById("trip-back-results").addEventListener("click", function () {
      clearTripMode();
      tripState = { date: null, region: null, days: null };
      openTripPlanner();
    });

  }

  document.addEventListener("DOMContentLoaded", init);
})();
