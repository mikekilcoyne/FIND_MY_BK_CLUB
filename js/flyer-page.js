(function () {
  const BKClubData = window.BKClubData || {};
  const wall = document.querySelector("#flyer-wall");
  const status = document.querySelector("#flyer-wall-status");
  const jumpLink = document.querySelector(".flyer-page-jump");
  const FLYER_MANIFEST_URL = "./data/flyer-wall.json";

  if (!wall || !status) return;

  const preferredOrder = [
    "Austin",
    "Mexico City",
    "New York - Upper West",
    "San Francisco",
    "Washington DC",
  ];
  const sizePattern = [
    "flyer-poster--hero",
    "flyer-poster--micro",
    "flyer-poster--wide",
    "flyer-poster--tall",
    "flyer-poster--micro",
  ];
  const stripRepeatCount = 5;

  function normalize(value) {
    if (BKClubData.normalize) return BKClubData.normalize(value);
    return (value || "").toLowerCase().trim();
  }

  function compactText(value) {
    return (value || "").replace(/\s+/g, " ").trim();
  }

  function getPosterItems(withFlyers) {
    const byCity = new Map();
    withFlyers.forEach(function (club) {
      byCity.set(normalize(club.city), club);
    });

    const ordered = [];
    preferredOrder.forEach(function (cityName) {
      const match = byCity.get(normalize(cityName));
      if (match && !ordered.includes(match)) ordered.push(match);
    });

    withFlyers.forEach(function (club) {
      if (!ordered.includes(club)) ordered.push(club);
    });

    return ordered;
  }

  function getDateLabel(club) {
    const nextDate = (club.specificDates || [])[0];
    if (!nextDate) return club.scheduleLabel || "";
    const date = new Date(nextDate + "T12:00:00");
    if (Number.isNaN(date.getTime())) return club.scheduleLabel || nextDate;
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  }

  function buildGalleryItems(items) {
    return items.map(function (club) {
      return {
        city: club.displayCity,
        url: club.flyerURL,
        venue: club.venue,
        scheduleLabel: getDateLabel(club),
        eventTime: club.eventTime,
      };
    });
  }

  function createPoster(club, galleryItems, index) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = ["flyer-poster", sizePattern[index % sizePattern.length]].join(" ");
    button.style.setProperty("--poster-tilt", `${index % 2 === 0 ? -2.2 : 1.8}deg`);
    button.setAttribute("aria-label", `View flyer for ${club.displayCity}`);

    const image = document.createElement("img");
    image.className = "flyer-poster__image";
    image.src = club.flyerURL;
    image.alt = `${club.displayCity} flyer`;

    const lightboxBtn = document.createElement("span");
    lightboxBtn.className = "flyer-poster__button";
    lightboxBtn.setAttribute("aria-hidden", "true");
    lightboxBtn.textContent = "Full-screen";

    button.append(image, lightboxBtn);
    button.addEventListener("click", function () {
      if (typeof window.openFlyerLightbox === "function") {
        window.openFlyerLightbox(club.flyerURL, club.displayCity, { items: galleryItems });
      }
    });

    return button;
  }

  function createStrip(stripClub, items, galleryItems, stripIndex) {
    const section = document.createElement("section");
    section.className = "flyer-strip";

    const grid = document.createElement("div");
    grid.className = "flyer-strip__grid";

    for (let repeat = 0; repeat < stripRepeatCount; repeat += 1) {
      items.forEach(function (club, itemIndex) {
        const renderIndex = stripIndex * (items.length * stripRepeatCount) + repeat * items.length + itemIndex;
        grid.append(createPoster(club, galleryItems, renderIndex));
      });
    }

    const floor = document.createElement("div");
    floor.className = "flyer-strip__floor";

    section.append(grid, floor);
    return section;
  }

  function revealPosters() {
    const observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.16 },
    );

    wall.querySelectorAll(".flyer-poster").forEach(function (poster) {
      observer.observe(poster);
    });
  }

  async function frequentFlyErs() {
    try {
      const response = await fetch(FLYER_MANIFEST_URL);
      if (!response.ok) throw new Error("manifest unavailable");
      const manifest = await response.json();
      const flyers = (manifest.items || []).map(function (item) {
        return {
          city: item.city || "",
          displayCity: item.city || "",
          flyerURL: item.url || "",
          venue: "",
          specificDates: [],
          scheduleLabel: "",
          eventTime: "",
          sourceFile: item.sourceFile || "",
        };
      }).filter(function (item) {
        return item.flyerURL;
      });

      const items = getPosterItems(flyers);
      const galleryItems = buildGalleryItems(items);

      wall.innerHTML = "";
      items.forEach(function (club, stripIndex) {
        wall.append(createStrip(club, items, galleryItems, stripIndex));
      });

      if (typeof window.setFlyerGalleryItems === "function") {
        window.setFlyerGalleryItems(galleryItems);
      }

      status.textContent = "BC Flyers 2026";

      if (jumpLink) {
        jumpLink.textContent = `${items.length} flyers`;
      }

      revealPosters();
    } catch (_error) {
      status.textContent = "Could not load flyers right now";
    }
  }

  frequentFlyErs();
})();
