(function () {
  const wall     = document.querySelector("#flyer-wall");
  const status   = document.querySelector("#flyer-wall-status");
  const jumpLink = document.querySelector(".flyer-page-jump");
  const API_URL  = "/.netlify/functions/get-public-flyers?limit=500";

  if (!wall || !status) return;

  const sizePattern = [
    "flyer-poster--hero",
    "flyer-poster--micro",
    "flyer-poster--wide",
    "flyer-poster--tall",
    "flyer-poster--micro",
  ];
  const TILTS = [-2.8, 1.6, -1.1, 2.3, -1.9, 0.9, -2.2, 1.4];

  // ── Single poster ─────────────────────────────────────────────────────────

  const SIZE_THUMB_W = {
    "flyer-poster--hero": 900,
    "flyer-poster--wide": 900,
    "flyer-poster--tall": 700,
    "flyer-poster--micro": 500,
  };

  function createPoster(f, galleryItems, index) {
    const sizeClass = sizePattern[index % sizePattern.length];
    const thumbW = SIZE_THUMB_W[sizeClass] || 480;
    const fullUrl = `/.netlify/functions/get-flyer?key=${encodeURIComponent(f.key)}`;
    const thumbUrl = `${fullUrl}&w=${thumbW}`;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = ["flyer-poster", sizeClass].join(" ");
    btn.style.setProperty("--poster-tilt", `${TILTS[index % TILTS.length]}deg`);
    btn.setAttribute("aria-label", `View flyer for ${f.club}`);

    const img = document.createElement("img");
    img.className = "flyer-poster__image";
    img.loading = "lazy";
    img.alt = `${f.club} flyer`;
    img.src = thumbUrl;
    img.srcset = `${thumbUrl} 1x, ${fullUrl}&w=${Math.min(thumbW * 2, 1600)} 2x`;
    img.addEventListener("error", function () { btn.style.display = "none"; });

    const label = document.createElement("span");
    label.className = "flyer-poster__button";
    label.setAttribute("aria-hidden", "true");
    label.textContent = "Full-screen";

    btn.append(img, label);
    btn.addEventListener("click", function () {
      if (typeof window.openFlyerLightbox === "function") {
        window.openFlyerLightbox(fullUrl, f.club, { items: galleryItems });
      }
    });

    return btn;
  }

  // ── Interleave flyers across cities so no city runs back-to-back ──────────

  function interleave(flyers) {
    // Group by city, sort each city newest-first
    const buckets = new Map();
    flyers.forEach(function (f) {
      const city = (f.club || "Unknown").trim();
      if (!buckets.has(city)) buckets.set(city, []);
      buckets.get(city).push(f);
    });

    // Unknown last; named cities alphabetical
    const named = [];
    let unknownBucket = null;
    buckets.forEach(function (items, city) {
      if (city.toLowerCase() === "unknown") unknownBucket = items;
      else named.push(items);
    });
    named.sort((a, b) => (a[0].club || "").localeCompare(b[0].club || ""));
    const allBuckets = unknownBucket ? named.concat([unknownBucket]) : named;

    // Round-robin across buckets
    const result = [];
    const ptrs = allBuckets.map(function () { return 0; });
    let remaining = true;
    while (remaining) {
      remaining = false;
      allBuckets.forEach(function (bucket, i) {
        if (ptrs[i] < bucket.length) {
          result.push(bucket[ptrs[i]++]);
          remaining = true;
        }
      });
    }
    return result;
  }

  // ── Render a block of posters into a strip grid ───────────────────────────

  function createBlock(flyers, galleryItems, indexOffset) {
    const section = document.createElement("section");
    section.className = "flyer-strip";

    const grid = document.createElement("div");
    grid.className = "flyer-strip__grid";

    flyers.forEach(function (f, i) {
      grid.append(createPoster(f, galleryItems, indexOffset + i));
    });

    const floor = document.createElement("div");
    floor.className = "flyer-strip__floor";
    section.append(grid, floor);
    return section;
  }

  // ── Reveal animation ──────────────────────────────────────────────────────

  function revealPosters() {
    const obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add("is-visible");
        obs.unobserve(e.target);
      });
    }, { threshold: 0.06 });
    wall.querySelectorAll(".flyer-poster:not(.is-visible)").forEach(function (p) {
      obs.observe(p);
    });
  }

  // ── Infinite scroll — append next page of the interleaved list ───────────

  function attachSentinel(interleaved, pageSize, offset) {
    const sentinel = document.createElement("div");
    sentinel.className = "flyer-loop-sentinel";
    wall.append(sentinel);

    const obs = new IntersectionObserver(function (entries) {
      if (!entries[0].isIntersecting) return;
      obs.disconnect();
      sentinel.remove();

      const loopOffset = offset >= interleaved.length ? 0 : offset;
      const page = interleaved.slice(loopOffset, loopOffset + pageSize);
      const block = createBlock(page, buildGalleryItems(interleaved), wall.querySelectorAll(".flyer-poster").length);
      block.querySelectorAll("img").forEach(function (img) {
        img.addEventListener("error", function () { img.closest(".flyer-poster").style.display = "none"; });
      });
      wall.append(block);

      revealPosters();
      attachSentinel(interleaved, pageSize, loopOffset + pageSize);
    }, { rootMargin: "600px" });

    obs.observe(sentinel);
  }

  function buildGalleryItems(flyers) {
    return flyers.map(function (f) {
      return {
        city: f.club,
        url: `/.netlify/functions/get-flyer?key=${encodeURIComponent(f.key)}`,
        venue: "",
        scheduleLabel: f.flyerDate || "",
        eventTime: "",
      };
    });
  }

  // ── Render ────────────────────────────────────────────────────────────────

  function renderWall(flyers) {
    wall.innerHTML = "";

    if (!flyers.length) {
      status.textContent = "No flyers yet";
      return;
    }

    // Sort newest first overall
    flyers.sort(function (a, b) {
      const da = a.flyerDate || a.uploadedAt || "0";
      const db = b.flyerDate || b.uploadedAt || "0";
      return db.localeCompare(da);
    });

    // Group into ~weekly buckets, interleave cities within each bucket
    const buckets = new Map();
    flyers.forEach(function (f) {
      const d = new Date(f.flyerDate || f.uploadedAt || 0);
      const week = isNaN(d) ? "0000-W00" : (function () {
        const jan1 = new Date(d.getFullYear(), 0, 1);
        const w = Math.ceil(((d - jan1) / 86400000 + jan1.getDay() + 1) / 7);
        return d.getFullYear() + "-W" + String(w).padStart(2, "0");
      })();
      if (!buckets.has(week)) buckets.set(week, []);
      buckets.get(week).push(f);
    });

    const weeksSorted = Array.from(buckets.keys()).sort().reverse();
    const interleaved = weeksSorted.flatMap(function (w) {
      return interleave(buckets.get(w));
    });
    const galleryItems = buildGalleryItems(interleaved);

    if (typeof window.setFlyerGalleryItems === "function") {
      window.setFlyerGalleryItems(galleryItems);
    }

    // First page: 60 posters
    const PAGE = 60;
    const first = createBlock(interleaved.slice(0, PAGE), galleryItems, 0);
    wall.append(first);

    const named = new Set(flyers.map(function (f) {
      const c = (f.club || "").trim().toLowerCase();
      return c && c !== "unknown" ? c : null;
    }).filter(Boolean));
    status.textContent = `${flyers.length} flyers · ${named.size} cities`;
    if (jumpLink) jumpLink.textContent = `${flyers.length} flyers`;

    revealPosters();
    attachSentinel(interleaved, PAGE, PAGE);
  }

  // ── Fetch & init ──────────────────────────────────────────────────────────

  async function init() {
    try {
      const res = await fetch(API_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const seen = new Set();
      const deduped = (data.items || []).filter(function (f) {
        if (!f.key || seen.has(f.key)) return false;
        seen.add(f.key);
        return true;
      });
      renderWall(deduped);
    } catch (_) {
      status.textContent = "Could not load flyers right now";
    }
  }

  init();
})();
