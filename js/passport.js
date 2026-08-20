/* ────────────────────────────────────────────────────────────────────────────
   PASSPORT — P0 prototype.

   One card per fly-er (per morning, not per club). Stamps are device-local:
   nothing is sent anywhere yet. The stored object is shaped so P1 can POST it
   straight up to a blob store without a migration.

   Deep link (this is what an NFC tag or a printed QR points at):
     /passport?stamp=williamsburg              → newest card nearest today
     /passport?stamp=williamsburg&date=2026-08-27
     /passport?stamp=<cardId>                  → that exact card
     /passport?city=williamsburg               → filter the deck to one city
   ──────────────────────────────────────────────────────────────────────────── */

(function () {
  "use strict";

  const deck        = document.querySelector("#passport-deck");
  const statusEl    = document.querySelector("#passport-status");
  const tallyCities = document.querySelector("#tally-cities");
  const tallyMorns  = document.querySelector("#tally-mornings");
  const holderBtn   = document.querySelector("#passport-holder");
  const serialEl    = document.querySelector("#passport-serial");
  const shareBar    = document.querySelector("#passport-share");
  const resetBtn    = document.querySelector("#passport-reset");
  const filterBtns  = Array.from(document.querySelectorAll(".passport-filter"));

  if (!deck) return;

  const FLYER_API = "/.netlify/functions/get-public-flyers?limit=500";
  const WWTA_API  = "/.netlify/functions/get-wwta";
  const WALL_URL  = "./data/flyer-wall.json";
  const CLUBS_URL = "./data/clubs-map.json";
  const WWTA_URL  = "./data/wwta-substack-cache.json";
  const STORAGE_KEY = "bkPassport";

  const BK = window.BKClubData || {};
  let cards  = [];
  let filter = "all";
  let cityFilter = "";

  // ── Passport store ────────────────────────────────────────────────────────

  function newPassportId() {
    const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
    const time = Date.now().toString(36).slice(-4).toUpperCase();
    return "BKP-" + rand + time;
  }

  function blankPassport() {
    return { v: 1, id: newPassportId(), createdAt: new Date().toISOString(), holder: "", stamps: [] };
  }

  function loadPassport() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.stamps)) return parsed;
      }
    } catch (_e) {}
    return blankPassport();
  }

  let passport = loadPassport();

  function savePassport() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(passport));
    } catch (_e) {}
  }

  function isStamped(cardId) {
    return passport.stamps.some(function (s) { return s.cardId === cardId; });
  }

  // ── City keys ─────────────────────────────────────────────────────────────

  // ── Launch scope ──────────────────────────────────────────────────────────
  // Passport is launching in the Northeast only, on the clubs that actually run
  // every week. Roster spelling, matched loosely. Empty the array to open the
  // passport up to every club on the roster.
  const LAUNCH_CLUBS = [
    "NY - Hamptons",            // weekly, Wed — the original club
    "NY - Williamsburg",        // weekly, Wed
    "NY - Downtown Brooklyn",   // weekly, Thu
    "NY - LES",                 // weekly, Thu
    "NY - UWS",                 // weekly, Wed
    "Maplewood, NJ",            // weekly, Fri — most fly-ers of any club
  ];

  // The roster and the fly-er filenames name the same place differently.
  // Declared here, never parsed — same rule as Clubby's GEO table. A club that
  // shows up locked when it shouldn't needs a row in here.
  const CITY_ALIASES = {
    "ny - lower east side": "ny - les",
    "hudson, ny": "ny - hudson",
    "kingston, ny": "ny - kingston",
    "williamsburg, ny": "ny - williamsburg",
    "hamptons, ny": "ny - hamptons",
    "panama city, pa": "panama city, panama",  // PA here is Panama, not Pennsylvania
    // Admin-uploaded blob flyers use short names that don't match the roster.
    // "New York" on its own is deliberately NOT aliased — too ambiguous to guess.
    "williamsburg": "ny - williamsburg",
    "new york - les": "ny - les",
    "les": "ny - les",
    "hamptons": "ny - hamptons",
    "downtown brooklyn": "ny - downtown brooklyn",
    "brooklyn": "ny - downtown brooklyn",
    "uws": "ny - uws",
    "upper west side": "ny - uws",
    "kingston": "ny - kingston",
    "hudson": "ny - hudson",
    "maplewood": "maplewood, nj",
    "soma": "maplewood, nj",
  };

  function norm(value) {
    return BK.normalizeCityKey
      ? BK.normalizeCityKey(value)
      : String(value || "").toLowerCase().replace(/[—–]/g, "-").trim();
  }

  function canonical(value) {
    const key = norm(value);
    return CITY_ALIASES[key] || key;
  }

  // Drop a trailing country/state code: "amsterdam, nl" → "amsterdam".
  function loose(value) {
    return canonical(value).replace(/,\s*[a-z]{2,3}$/, "").trim();
  }

  let launchSet = null;
  function inLaunchScope(city) {
    if (!LAUNCH_CLUBS.length) return true;
    if (!launchSet) launchSet = new Set(LAUNCH_CLUBS.map(loose));
    return launchSet.has(loose(city));
  }

  function slug(value) {
    return loose(value).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  }

  // ── Dates ─────────────────────────────────────────────────────────────────

  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  function parseISO(value) {
    const m = String(value || "").match(/(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return null;
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12);
  }

  function shortDate(value) {
    const d = parseISO(value);
    if (!d) return "";
    return d.getDate() + " " + MONTHS[d.getMonth()].toUpperCase();
  }

  function longDate(value) {
    const d = parseISO(value);
    if (!d) return "Date unknown";
    return d.getDate() + " " + MONTHS[d.getMonth()] + " " + d.getFullYear();
  }

  // ── Load the three sources ────────────────────────────────────────────────

  // Same dual-source pattern as the fly-er wall: live blob index when the
  // Netlify function answers, static manifest when it doesn't (local dev).
  async function loadBlobFlyers() {
    const res = await fetch(FLYER_API);
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    const seen = new Set();
    return (data.items || [])
      .filter(function (f) {
        if (!f.key || !f.club || f.club === "Unknown" || seen.has(f.key)) return false;
        seen.add(f.key);
        return true;
      })
      .map(function (f) {
        const full = "/.netlify/functions/get-flyer?key=" + encodeURIComponent(f.key);
        return { key: f.key, city: f.club, date: f.flyerDate || "", url: full, thumb: full + "&w=600" };
      });
  }

  async function loadStaticFlyers() {
    const res = await fetch(WALL_URL);
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    return (data.items || []).map(function (item) {
      const m = (item.date || item.sourceFile || "").match(/(\d{4}-\d{2}-\d{2})/);
      return {
        key: item.sourceFile || item.url,
        city: item.city || "Unknown",
        date: item.date || (m ? m[1] : ""),
        url: item.url,
        thumb: item.url,
      };
    });
  }

  // Merge, don't fall back. The blob index is what /admin has uploaded; the
  // static manifest is the older archive, and it still holds mornings the blob
  // never got (every Hamptons fly-er, for one). A passport is a record of what
  // happened, so it wants both. Blob wins on a collision — it's the one an
  // admin curated most recently.
  async function loadFlyers() {
    const results = await Promise.allSettled([loadBlobFlyers(), loadStaticFlyers()]);
    const blob = results[0].status === "fulfilled" ? results[0].value : [];
    const stat = results[1].status === "fulfilled" ? results[1].value : [];
    if (!blob.length && !stat.length) throw new Error("no fly-er source available");

    const all = blob.concat(stat);

    // Undated blob uploads are the same mornings the manifest already has, just
    // dumped through /admin without a date — and a card with no date can't be a
    // morning anyway. Drop them where the city has dated fly-ers; keep them
    // where they're all a club has, so nobody gets locked out over metadata.
    const datedCities = new Set();
    all.forEach(function (f) { if (f.date) datedCities.add(loose(f.city)); });

    const seen = new Set();
    return all.filter(function (f) {
      if (!f.date && datedCities.has(loose(f.city))) return false;
      const key = loose(f.city) + "|" + (f.date || f.key);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  async function loadClubs() {
    try {
      const res = await fetch(CLUBS_URL);
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (_e) {
      return [];
    }
  }

  async function loadTopics() {
    for (const url of [WWTA_API, WWTA_URL]) {
      try {
        const res = await fetch(url);
        if (!res.ok) continue;
        const data = await res.json();
        if (data && data.cities) return data.cities;
      } catch (_e) {}
    }
    return {};
  }

  // ── Indexes ───────────────────────────────────────────────────────────────

  function indexClubs(clubs) {
    const exact = new Map();
    const byLoose = new Map();
    const ambiguous = new Set();

    clubs.forEach(function (club) {
      const label = club.displayCity || club.city || "";
      if (!label) return;
      const exactKey = canonical(label);
      if (!exact.has(exactKey)) exact.set(exactKey, club);
      const looseKey = loose(label);
      if (byLoose.has(looseKey) && byLoose.get(looseKey) !== club) ambiguous.add(looseKey);
      else byLoose.set(looseKey, club);
    });

    return function findClub(city) {
      const exactHit = exact.get(canonical(city));
      if (exactHit) return exactHit;
      const looseKey = loose(city);
      if (ambiguous.has(looseKey)) return null;
      return byLoose.get(looseKey) || null;
    };
  }

  function indexTopics(cities) {
    const keys = new Map();
    Object.keys(cities || {}).forEach(function (key) {
      const record = cities[key];
      if (!record || !Array.isArray(record.topics) || !record.topics.length) return;
      keys.set(norm(key), record.topics);
      keys.set(loose(key), record.topics);
    });

    return function findTopics(city) {
      const candidates = BK.buildLatestHappeningsKeys
        ? BK.buildLatestHappeningsKeys(city)
        : [norm(city)];
      const all = candidates.concat([norm(city), loose(city)]);
      for (const candidate of all) {
        const hit = keys.get(norm(candidate));
        if (hit) return hit;
      }
      return [];
    };
  }

  // ── Build the deck ────────────────────────────────────────────────────────

  function buildCards(flyers, clubs, topicCities) {
    const findClub   = indexClubs(clubs);
    const findTopics = indexTopics(topicCities);
    const usedIds = new Set();
    const citiesWithFlyers = new Set();

    const flyerCards = flyers.filter(function (f) {
      return inLaunchScope(f.city);
    }).map(function (f) {
      let id = slug(f.city) + "__" + (f.date || slug(f.key) || "undated");
      let n = 2;
      while (usedIds.has(id)) id = slug(f.city) + "__" + (f.date || "undated") + "-" + n++;
      usedIds.add(id);
      citiesWithFlyers.add(loose(f.city));

      const club = findClub(f.city);
      return {
        id: id,
        locked: false,
        city: (club && (club.displayCity || club.city)) || f.city,
        date: f.date,
        url: f.url,
        thumb: f.thumb,
        club: club,
        topics: findTopics(f.city),
      };
    });

    // Newest first; undated fall to the back.
    flyerCards.sort(function (a, b) {
      return (b.date || "0").localeCompare(a.date || "0");
    });

    // A club with no fly-er at all gets a locked card. This is the nudge:
    // no fly-er, no cards, no reason for anyone to collect your city.
    const lockedCards = clubs
      .filter(function (club) {
        const label = club.displayCity || club.city || "";
        if (!label) return false;
        if (BK.shouldHideClub && BK.shouldHideClub(club.city)) return false;
        if (!inLaunchScope(label)) return false;
        return !citiesWithFlyers.has(loose(label));
      })
      .map(function (club) {
        const label = club.displayCity || club.city;
        return {
          id: "locked__" + slug(label),
          locked: true,
          city: label,
          date: "",
          club: club,
          topics: [],
        };
      })
      .sort(function (a, b) { return a.city.localeCompare(b.city); });

    flyerCards.forEach(function (card, i) { card.page = i + 1; });
    return flyerCards.concat(lockedCards);
  }

  // ── Render one card ───────────────────────────────────────────────────────

  function buildFront(card) {
    const front = document.createElement("button");
    front.type = "button";
    front.className = "pcard__face pcard__face--front";
    front.setAttribute("aria-label", "Details for " + card.city + (card.date ? ", " + longDate(card.date) : ""));

    // The fly-er sits behind the type, ghosted — flavour, not subject.
    if (!card.locked && card.thumb) {
      const backdrop = document.createElement("div");
      backdrop.className = "pcard__backdrop";
      const img = document.createElement("img");
      img.className = "pcard__backdrop-img";
      img.src = card.thumb;
      img.alt = "";
      img.setAttribute("aria-hidden", "true");
      img.loading = "lazy";
      img.addEventListener("error", function () { backdrop.remove(); });
      backdrop.append(img);
      front.append(backdrop);
    }

    const body = document.createElement("div");
    body.className = "pcard__front-body";

    const page = document.createElement("span");
    page.className = "pcard__page";
    page.textContent = card.locked ? "Not issued" : "No. " + String(card.page).padStart(2, "0");

    const city = document.createElement("h2");
    city.className = "pcard__city";
    city.textContent = card.city;

    const rule = document.createElement("div");
    rule.className = "pcard__rule";

    const date = document.createElement("span");
    date.className = card.locked ? "pcard__locked-note" : "pcard__date";
    date.textContent = card.locked
      ? "No fly-er yet"
      : (card.date ? longDate(card.date).toUpperCase() : "Date unknown");

    body.append(page, city, rule, date);

    const stamp = document.createElement("div");
    stamp.className = "pcard__stamp";
    const stampMark = document.createElement("span");
    stampMark.className = "pcard__stamp-mark";
    stampMark.textContent = "Was Here";
    const stampDate = document.createElement("span");
    stampDate.className = "pcard__stamp-date";
    stampDate.textContent = shortDate(card.date) || "BC";
    stamp.append(stampMark, stampDate);

    front.append(body, stamp);
    return front;
  }

  function fact(label, value) {
    const wrap = document.createElement("div");
    const tag = document.createElement("span");
    tag.className = "pcard__fact-label";
    tag.textContent = label;
    const body = document.createElement("span");
    body.className = "pcard__fact-value";
    body.textContent = value;
    wrap.append(tag, body);
    return wrap;
  }

  function buildBack(card, el) {
    const back = document.createElement("div");
    back.className = "pcard__face pcard__face--back";

    const city = document.createElement("h2");
    city.className = "pcard__back-city";
    city.textContent = card.city;

    const date = document.createElement("p");
    date.className = "pcard__back-date";
    date.textContent = card.locked ? "No fly-er on file" : longDate(card.date);

    const facts = document.createElement("div");
    facts.className = "pcard__facts";

    const club = card.club || {};
    const hostName = String(club.host || "").replace(/\s*\(@[^)]*\)\s*$/, "").trim();
    if (hostName) facts.append(fact("Host", hostName));
    if (club.venue) facts.append(fact("Table", club.venue));
    if (card.topics && card.topics.length) {
      facts.append(fact("At the table", card.topics.slice(0, 3).join(" · ")));
    }

    const actions = document.createElement("div");
    actions.className = "pcard__back-actions";

    if (card.locked) {
      const ask = document.createElement("a");
      ask.className = "pcard__btn pcard__btn--stamp";
      ask.textContent = "Ask for a fly-er";
      if (club.email) {
        const subject = encodeURIComponent("A fly-er for Breakfast Club " + card.city);
        const body = encodeURIComponent(
          "Hi" + (club.host ? " " + String(club.host).split(" ")[0] : "") + " — " +
          "Breakfast Club " + card.city + " doesn't have a fly-er yet, so it can't be collected in the passport. " +
          "Any chance you could make one?"
        );
        ask.href = "mailto:" + club.email + "?subject=" + subject + "&body=" + body;
      } else {
        ask.href = "./fly-er.html";
      }
      actions.append(ask);
    } else {
      const stampBtn = document.createElement("button");
      stampBtn.type = "button";
      stampBtn.className = "pcard__btn pcard__btn--stamp";
      stampBtn.addEventListener("click", function () { toggleStamp(card, el); });
      actions.append(stampBtn);


    }

    const foot = document.createElement("div");
    foot.className = "pcard__foot";

    const flipBack = document.createElement("button");
    flipBack.type = "button";
    flipBack.className = "pcard__flip-hint";
    flipBack.textContent = "← Flip";
    flipBack.addEventListener("click", function () { setFlipped(el, false); });
    foot.append(flipBack);

    if (!card.locked && card.url) {
      const view = document.createElement("a");
      view.className = "pcard__link";
      view.href = card.url;
      view.target = "_blank";
      view.rel = "noopener";
      view.textContent = "The fly-er ↗";
      foot.append(view);
    }

    back.append(city, date, facts, actions, foot);
    return back;
  }

  function setFlipped(el, flipped) {
    el.classList.toggle("is-flipped", flipped);
    el.querySelectorAll(".pcard__face--front").forEach(function (node) {
      node.tabIndex = flipped ? -1 : 0;
    });
    el.querySelectorAll(".pcard__face--back button, .pcard__face--back a").forEach(function (node) {
      node.tabIndex = flipped ? 0 : -1;
    });
  }

  function syncStampUI(card, el) {
    const stamped = isStamped(card.id);
    el.classList.toggle("is-stamped", stamped);
    const btn = el.querySelector(".pcard__btn--stamp");
    if (btn && !card.locked) {
      btn.textContent = stamped ? "Stamped — undo" : "I was here";
      btn.classList.toggle("pcard__btn--undo", stamped);
    }
  }

  function toggleStamp(card, el) {
    if (isStamped(card.id)) {
      passport.stamps = passport.stamps.filter(function (s) { return s.cardId !== card.id; });
    } else {
      passport.stamps.push({
        cardId: card.id,
        city: card.city,
        date: card.date || "",
        stampedAt: new Date().toISOString(),
        source: "self",
      });
    }
    savePassport();
    syncStampUI(card, el);
    renderTally();
    applyFilter();
  }

  function buildCard(card) {
    const el = document.createElement("article");
    el.className = "pcard" + (card.locked ? " pcard--locked" : "");
    el.dataset.cardId = card.id;
    el.dataset.city = loose(card.city);

    const inner = document.createElement("div");
    inner.className = "pcard__inner";

    const front = buildFront(card);
    front.addEventListener("click", function () { setFlipped(el, true); });

    inner.append(front, buildBack(card, el));
    el.append(inner);

    setFlipped(el, false);
    syncStampUI(card, el);
    card.el = el;
    return el;
  }

  // ── Tally, serial, share ──────────────────────────────────────────────────

  function cityCount() {
    return new Set(passport.stamps.map(function (s) { return loose(s.city); })).size;
  }

  function renderTally() {
    const cities = cityCount();
    const mornings = passport.stamps.length;
    tallyCities.textContent = cities;
    tallyMorns.textContent = mornings;

    const since = parseISO(passport.createdAt) || new Date();
    serialEl.textContent = mornings
      ? "No. " + passport.id + " · Opened " + MONTHS[since.getMonth()] + " " + since.getFullYear()
      : "No. — · Nothing stamped yet";

    shareBar.hidden = mornings === 0;
    if (mornings) updateShareTargets();
  }

  function renderHolder() {
    const named = (passport.holder || "").trim();
    holderBtn.textContent = named || "Add your name";
    holderBtn.classList.toggle("is-empty", !named);
  }

  function shareText() {
    const cities = cityCount();
    const mornings = passport.stamps.length;
    const who = (passport.holder || "").trim();
    const owner = who ? who + "'s" : "My";
    return (
      owner + " Breakfast Club passport: " +
      cities + (cities === 1 ? " city" : " cities") + ", " +
      mornings + (mornings === 1 ? " morning" : " mornings") + ". " +
      "Everyone's invited. Especially you."
    );
  }

  function shareUrl() {
    const url = new URL(window.location.href);
    url.search = "";
    url.hash = "";
    return url.href;
  }

  function updateShareTargets() {
    const payload = encodeURIComponent(shareText() + "\n" + shareUrl());
    const wa = document.querySelector("#share-whatsapp");
    const sms = document.querySelector("#share-sms");
    if (wa) wa.href = "https://wa.me/?text=" + payload;
    if (sms) sms.href = "sms:?&body=" + payload;
  }

  function wireShare() {
    const nativeBtn = document.querySelector("#share-native");
    const copyBtn = document.querySelector("#share-copy");

    if (nativeBtn && navigator.share) {
      nativeBtn.hidden = false;
      nativeBtn.addEventListener("click", function () {
        navigator.share({ text: shareText(), url: shareUrl() }).catch(function () {});
      });
    }

    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        const payload = shareText() + "\n" + shareUrl();
        const done = function () {
          copyBtn.textContent = "Copied!";
          copyBtn.classList.add("is-copied");
          window.setTimeout(function () {
            copyBtn.textContent = "Copy Link";
            copyBtn.classList.remove("is-copied");
          }, 1600);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(payload).then(done, done);
        } else {
          const ta = document.createElement("textarea");
          ta.value = payload;
          document.body.append(ta);
          ta.select();
          document.execCommand("copy");
          ta.remove();
          done();
        }
      });
    }
  }

  // ── Filters ───────────────────────────────────────────────────────────────

  function applyFilter() {
    let shown = 0;
    cards.forEach(function (card) {
      if (!card.el) return;
      const stamped = isStamped(card.id);
      let visible =
        filter === "all" ? true :
        filter === "stamped" ? stamped :
        card.locked;
      if (visible && cityFilter) visible = loose(card.city) === cityFilter;
      card.el.hidden = !visible;
      if (visible) shown++;
    });

    const existing = deck.querySelector(".passport-empty");
    if (existing) existing.remove();

    if (!shown) {
      const empty = document.createElement("p");
      empty.className = "passport-empty";
      empty.textContent =
        filter === "stamped"
          ? "Nothing stamped yet. Open a card from a morning you were actually at."
          : filter === "locked"
            ? "Every club on the roster has a fly-er. Genuinely remarkable."
            : "No cards match.";
      deck.append(empty);
    }

    renderStatus(shown);
  }

  function renderStatus(shown) {
    const total = cards.length;
    const locked = cards.filter(function (c) { return c.locked; }).length;
    const parts = [shown + " of " + total + " cards"];
    if (cityFilter) parts.push(cityFilter.replace(/-/g, " "));
    if (locked && filter === "all" && !cityFilter) parts.push(locked + " clubs still need a fly-er");
    statusEl.textContent = parts.join(" · ");
  }

  function wireFilters() {
    filterBtns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        filter = btn.dataset.filter;
        filterBtns.forEach(function (b) { b.classList.toggle("is-active", b === btn); });
        applyFilter();
      });
    });
  }

  // ── Toast ─────────────────────────────────────────────────────────────────

  let toastEl = null;
  let toastTimer = null;

  function toast(message) {
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.className = "passport-toast";
      toastEl.setAttribute("role", "status");
      document.body.append(toastEl);
    }
    toastEl.textContent = message;
    window.requestAnimationFrame(function () { toastEl.classList.add("is-visible"); });
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () { toastEl.classList.remove("is-visible"); }, 4200);
  }

  // ── Tap-to-stamp arrival (NFC tag / QR / shared link) ─────────────────────

  function resolveStampTarget(value, dateParam) {
    const wanted = String(value || "").trim();
    if (!wanted) return null;

    const byId = cards.find(function (c) { return c.id === wanted; });
    if (byId) return byId;

    const key = loose(wanted.replace(/-/g, " "));
    const inCity = cards.filter(function (c) { return !c.locked && loose(c.city) === key; });

    if (!inCity.length) {
      const lockedHit = cards.find(function (c) { return c.locked && loose(c.city) === key; });
      return lockedHit || null;
    }

    if (dateParam) {
      const exact = inCity.find(function (c) { return c.date === dateParam; });
      if (exact) return exact;
    }

    // A tag stuck on a table gets reused every month, so resolve to the card
    // closest to today rather than simply the newest.
    const today = new Date();
    let best = inCity[0];
    let bestGap = Infinity;
    inCity.forEach(function (c) {
      const d = parseISO(c.date);
      const gap = d ? Math.abs(d - today) : Infinity;
      if (gap < bestGap) { bestGap = gap; best = c; }
    });
    return best;
  }

  function handleArrival() {
    const params = new URLSearchParams(window.location.search);
    const stampParam = params.get("stamp");

    cityFilter = loose((params.get("city") || "").replace(/-/g, " "));

    if (!stampParam) return;

    const card = resolveStampTarget(stampParam, params.get("date"));

    if (!card) {
      toast("Couldn't find a card for that one.");
      return;
    }

    if (card.locked) {
      toast(card.city + " hasn't made a fly-er yet — no card to stamp.");
      return;
    }

    const already = isStamped(card.id);
    if (!already) {
      passport.stamps.push({
        cardId: card.id,
        city: card.city,
        date: card.date || "",
        stampedAt: new Date().toISOString(),
        source: params.get("via") || "tap",
      });
      savePassport();
      syncStampUI(card, card.el);
      renderTally();
    }

    // Don't re-fire the stamp on refresh or when the link gets shared onward.
    const clean = new URL(window.location.href);
    clean.searchParams.delete("stamp");
    clean.searchParams.delete("date");
    clean.searchParams.delete("via");
    window.history.replaceState({}, "", clean.pathname + clean.search + clean.hash);

    if (card.el) {
      card.el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    toast(
      already
        ? "Already stamped — " + card.city + (card.date ? ", " + longDate(card.date) : "")
        : "Stamped — " + card.city + (card.date ? ", " + longDate(card.date) : "")
    );
  }

  // ── Holder + reset ────────────────────────────────────────────────────────

  function wireHolder() {
    holderBtn.addEventListener("click", function () {
      const next = window.prompt("Whose passport is this?", passport.holder || "");
      if (next === null) return;
      passport.holder = next.trim().slice(0, 40);
      savePassport();
      renderHolder();
      renderTally();
    });
  }

  function wireReset() {
    resetBtn.addEventListener("click", function () {
      if (!window.confirm("Clear every stamp and start a fresh passport?")) return;
      passport = blankPassport();
      savePassport();
      cards.forEach(function (card) { if (card.el) syncStampUI(card, card.el); });
      renderHolder();
      renderTally();
      applyFilter();
    });
  }

  // ── Init ──────────────────────────────────────────────────────────────────

  async function init() {
    wireFilters();
    wireShare();
    wireHolder();
    wireReset();
    renderHolder();
    renderTally();

    let flyers = [];
    let clubs = [];
    let topics = {};

    try {
      const results = await Promise.all([loadFlyers(), loadClubs(), loadTopics()]);
      flyers = results[0];
      clubs = results[1];
      topics = results[2];
    } catch (_e) {
      statusEl.textContent = "Could not load the cards right now";
      return;
    }

    cards = buildCards(flyers, clubs, topics);

    const frag = document.createDocumentFragment();
    cards.forEach(function (card) { frag.append(buildCard(card)); });
    deck.append(frag);

    handleArrival();
    applyFilter();
    renderTally();
  }

  document.addEventListener("keydown", function (event) {
    if (event.key !== "Escape") return;
    deck.querySelectorAll(".pcard.is-flipped").forEach(function (el) { setFlipped(el, false); });
  });

  init();
})();
