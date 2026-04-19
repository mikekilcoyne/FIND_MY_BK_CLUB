(function () {
  if (window.openFlyerLightbox && window.setFlyerGalleryItems) return;

  var lightbox = null;
  var flyerGalleryItems = [];
  var activeFlyerIndex = 0;
  var flyerKeyHandler = null;
  var flyerTouchStartX = 0;
  var flyerTouchDeltaX = 0;
  var captionFadeTimer = null;

  function normalizeItem(item) {
    if (!item || !item.url) return null;
    return {
      city: item.city || "",
      url: item.url,
      venue: item.venue || "",
      scheduleLabel: item.scheduleLabel || "",
      eventTime: item.eventTime || "",
    };
  }

  function dedupeItems(items) {
    var seen = {};
    return (items || [])
      .map(normalizeItem)
      .filter(Boolean)
      .filter(function (item) {
        var key = (item.city || "") + "::" + item.url;
        if (seen[key]) return false;
        seen[key] = true;
        return true;
      });
  }

  function setFlyerGalleryItems(items) {
    flyerGalleryItems = dedupeItems(items);
  }

  function getWrappedFlyerIndex(index) {
    var count = flyerGalleryItems.length;
    if (!count) return 0;
    return (index + count) % count;
  }

  function jumpToFlyer(index) {
    if (!flyerGalleryItems.length) return;
    activeFlyerIndex = getWrappedFlyerIndex(index);
    renderActiveFlyer();
  }

  function stepFlyer(direction) {
    if (!flyerGalleryItems.length) return;
    jumpToFlyer(activeFlyerIndex + direction);
  }

  function randomizeFlyer() {
    if (flyerGalleryItems.length <= 1) return;
    var nextIndex = activeFlyerIndex;
    while (nextIndex === activeFlyerIndex) {
      nextIndex = Math.floor(Math.random() * flyerGalleryItems.length);
    }
    jumpToFlyer(nextIndex);
  }

  function buildMetaLine(item) {
    var parts = [];
    if (item.scheduleLabel) parts.push(item.scheduleLabel);
    if (item.eventTime) parts.push("Starts " + item.eventTime);
    if (item.venue) parts.push(item.venue);
    return parts.join("  ·  ");
  }

  function setCaptionFaded(isFaded) {
    if (!lightbox) return;
    var caption = lightbox.querySelector(".flyer-lightbox-caption");
    if (!caption) return;
    if (isFaded) {
      caption.classList.add("is-faded");
    } else {
      caption.classList.remove("is-faded");
    }
  }

  function scheduleCaptionFade() {
    if (captionFadeTimer) {
      window.clearTimeout(captionFadeTimer);
      captionFadeTimer = null;
    }
    setCaptionFaded(false);
    if (window.matchMedia && window.matchMedia("(hover: none)").matches) {
      captionFadeTimer = window.setTimeout(function () {
        setCaptionFaded(true);
      }, 1300);
    }
  }

  function buildFlyerOverlay() {
    lightbox = document.createElement("div");
    lightbox.className = "flyer-lightbox";
    lightbox.setAttribute("role", "dialog");
    lightbox.setAttribute("aria-modal", "true");
    lightbox.hidden = true;

    var backdrop = document.createElement("div");
    backdrop.className = "flyer-lightbox-backdrop";

    var panel = document.createElement("div");
    panel.className = "flyer-lightbox-panel";

    var topbar = document.createElement("div");
    topbar.className = "flyer-lightbox-topbar";

    var closeBtn = document.createElement("button");
    closeBtn.className = "flyer-lightbox-close";
    closeBtn.setAttribute("aria-label", "Close flyer gallery");
    closeBtn.textContent = "×";
    closeBtn.addEventListener("click", closeFlyerLightbox);

    var rouletteBtn = document.createElement("button");
    rouletteBtn.className = "flyer-lightbox-roulette";
    rouletteBtn.setAttribute("aria-label", "Jump to a random flyer");
    rouletteBtn.textContent = "Flyer Roulette";
    rouletteBtn.addEventListener("click", randomizeFlyer);

    topbar.append(rouletteBtn, closeBtn);

    var prevBtn = document.createElement("button");
    prevBtn.className = "flyer-lightbox-nav flyer-lightbox-nav--prev";
    prevBtn.setAttribute("aria-label", "Previous flyer");
    var prevIcon = document.createElement("img");
    prevIcon.className = "flyer-lightbox-nav-icon";
    prevIcon.src = "./assets/ui/handdrawn-arrows/arrow-right-drawn.png";
    prevIcon.alt = "";
    prevIcon.setAttribute("aria-hidden", "true");
    prevBtn.addEventListener("click", function () {
      stepFlyer(-1);
    });
    prevBtn.append(prevIcon);

    var nextBtn = document.createElement("button");
    nextBtn.className = "flyer-lightbox-nav flyer-lightbox-nav--next";
    nextBtn.setAttribute("aria-label", "Next flyer");
    var nextIcon = document.createElement("img");
    nextIcon.className = "flyer-lightbox-nav-icon";
    nextIcon.src = "./assets/ui/handdrawn-arrows/arrow-right-drawn.png";
    nextIcon.alt = "";
    nextIcon.setAttribute("aria-hidden", "true");
    nextBtn.addEventListener("click", function () {
      stepFlyer(1);
    });
    nextBtn.append(nextIcon);

    var stage = document.createElement("div");
    stage.className = "flyer-lightbox-stage";

    var figure = document.createElement("div");
    figure.className = "flyer-lightbox-figure";

    var img = document.createElement("img");
    img.className = "flyer-lightbox-img";
    img.alt = "";

    var caption = document.createElement("div");
    caption.className = "flyer-lightbox-caption";

    var captionCity = document.createElement("div");
    captionCity.className = "flyer-lightbox-caption-city";

    var captionMeta = document.createElement("div");
    captionMeta.className = "flyer-lightbox-caption-meta";

    caption.append(captionCity, captionMeta);
    figure.append(img, caption);
    stage.append(prevBtn, figure, nextBtn);

    var hint = document.createElement("div");
    hint.className = "flyer-lightbox-hint";
    hint.textContent = "Swipe or tap arrows";

    var gallery = document.createElement("div");
    gallery.className = "flyer-lightbox-gallery";

    panel.append(topbar, stage, hint, gallery);
    lightbox.append(backdrop, panel);

    lightbox.addEventListener("click", function (e) {
      if (e.target === lightbox || e.target === backdrop) closeFlyerLightbox();
    });

    stage.addEventListener("touchstart", function (e) {
      flyerTouchStartX = (e.touches[0] && e.touches[0].clientX) || 0;
      flyerTouchDeltaX = 0;
    }, { passive: true });

    stage.addEventListener("touchmove", function (e) {
      var currentX = (e.touches[0] && e.touches[0].clientX) || 0;
      flyerTouchDeltaX = currentX - flyerTouchStartX;
    }, { passive: true });

    stage.addEventListener("touchend", function () {
      if (Math.abs(flyerTouchDeltaX) < 45) return;
      stepFlyer(flyerTouchDeltaX < 0 ? 1 : -1);
    });

    figure.addEventListener("mouseenter", function () {
      setCaptionFaded(true);
    });
    figure.addEventListener("mouseleave", function () {
      setCaptionFaded(false);
    });

    document.body.append(lightbox);
  }

  function renderActiveFlyer() {
    if (!lightbox || !flyerGalleryItems.length) return;

    var item = flyerGalleryItems[activeFlyerIndex];
    var img = lightbox.querySelector(".flyer-lightbox-img");
    var prevBtn = lightbox.querySelector(".flyer-lightbox-nav--prev");
    var nextBtn = lightbox.querySelector(".flyer-lightbox-nav--next");
    var hint = lightbox.querySelector(".flyer-lightbox-hint");
    var gallery = lightbox.querySelector(".flyer-lightbox-gallery");
    var caption = lightbox.querySelector(".flyer-lightbox-caption");
    var captionCity = lightbox.querySelector(".flyer-lightbox-caption-city");
    var captionMeta = lightbox.querySelector(".flyer-lightbox-caption-meta");
    var rouletteBtn = lightbox.querySelector(".flyer-lightbox-roulette");

    img.src = item.url;
    img.alt = (item.city || "") + " flyer";

    var metaLine = buildMetaLine(item);
    captionCity.textContent = item.city || "Breakfast Club";
    captionCity.classList.remove("is-long", "is-xlong");
    if ((item.city || "").length > 18) {
      captionCity.classList.add("is-long");
    }
    if ((item.city || "").length > 24) {
      captionCity.classList.remove("is-long");
      captionCity.classList.add("is-xlong");
    }
    captionMeta.textContent = metaLine;
    caption.hidden = !item.city && !metaLine;
    scheduleCaptionFade();

    var multi = flyerGalleryItems.length > 1;
    prevBtn.hidden = !multi;
    nextBtn.hidden = !multi;
    hint.hidden = !multi;
    rouletteBtn.hidden = !multi;

    gallery.innerHTML = "";
    flyerGalleryItems.forEach(function (galleryItem, index) {
      var thumbBtn = document.createElement("button");
      thumbBtn.className = "flyer-gallery-thumb" + (index === activeFlyerIndex ? " active" : "");
      thumbBtn.setAttribute("aria-label", "View flyer for " + galleryItem.city);
      thumbBtn.addEventListener("click", function () {
        jumpToFlyer(index);
      });

      var thumbImg = document.createElement("img");
      thumbImg.className = "flyer-gallery-thumb-img";
      thumbImg.src = galleryItem.url;
      thumbImg.alt = galleryItem.city + " flyer thumbnail";

      var thumbLabel = document.createElement("span");
      thumbLabel.className = "flyer-gallery-thumb-label";
      thumbLabel.textContent = galleryItem.city;

      thumbBtn.append(thumbImg, thumbLabel);
      gallery.append(thumbBtn);
    });
  }

  function closeFlyerLightbox() {
    if (lightbox) lightbox.hidden = true;
    if (captionFadeTimer) {
      window.clearTimeout(captionFadeTimer);
      captionFadeTimer = null;
    }
    document.body.style.overflow = "";
    document.body.classList.remove("flyer-overlay-open");
    if (flyerKeyHandler) {
      document.removeEventListener("keydown", flyerKeyHandler);
      flyerKeyHandler = null;
    }
  }

  function openFlyerLightbox(url, cityName, options) {
    if (!lightbox) buildFlyerOverlay();

    if (Array.isArray(options)) {
      setFlyerGalleryItems(options);
    } else if (options && Array.isArray(options.items)) {
      setFlyerGalleryItems(options.items);
    }

    if (!flyerGalleryItems.length) {
      setFlyerGalleryItems([{ city: cityName, url: url }]);
    }

    var matchIndex = flyerGalleryItems.findIndex(function (item) {
      return item.url === url || item.city === cityName;
    });
    activeFlyerIndex = matchIndex >= 0 ? matchIndex : 0;

    renderActiveFlyer();

    lightbox.hidden = false;
    document.body.style.overflow = "hidden";
    document.body.classList.add("flyer-overlay-open");

    if (flyerKeyHandler) {
      document.removeEventListener("keydown", flyerKeyHandler);
    }

    flyerKeyHandler = function (e) {
      if (e.key === "Escape") closeFlyerLightbox();
      if (e.key === "ArrowLeft") stepFlyer(-1);
      if (e.key === "ArrowRight") stepFlyer(1);
    };
    document.addEventListener("keydown", flyerKeyHandler);
  }

  window.setFlyerGalleryItems = setFlyerGalleryItems;
  window.getFlyerGalleryItems = function () {
    return flyerGalleryItems.slice();
  };
  window.openFlyerLightbox = openFlyerLightbox;
})();
