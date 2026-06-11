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

  function getShareUrl(item) {
    // Absolute URL to the flyer image so the link unfurls with the artwork.
    return new URL(item.url, window.location.href).href;
  }

  function flyerFileMeta(item) {
    var name = decodeURIComponent((item.url.split("/").pop() || "flyer").split("?")[0]);
    var ext = (name.indexOf(".") >= 0 ? name.split(".").pop() : "").toLowerCase();
    var types = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", pdf: "application/pdf" };
    if (!types[ext]) {
      ext = "jpg";
      name += ".jpg";
    }
    return {
      name: name,
      type: types[ext],
      label: ext === "pdf" ? "PDF" : ext === "png" ? "PNG" : "JPG",
    };
  }

  function canShareFlyerFiles() {
    if (!navigator.canShare || typeof window.File !== "function") return false;
    try {
      return navigator.canShare({ files: [new File([new Blob()], "flyer.jpg", { type: "image/jpeg" })] });
    } catch (_e) {
      return false;
    }
  }

  // Share the actual JPG/PDF through the native share sheet (WhatsApp,
  // Messages, Mail, AirDrop...). Falls back to a WhatsApp text+link.
  function shareFlyerFile(item, btn) {
    var meta = flyerFileMeta(item);
    var original = "Share the Flyer (" + meta.label + ")";
    btn.textContent = "Preparing...";
    fetch(item.url)
      .then(function (res) {
        if (!res.ok) throw new Error("fetch failed");
        return res.blob();
      })
      .then(function (blob) {
        var file = new File([blob], meta.name, { type: blob.type || meta.type });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          return navigator.share({ files: [file], text: buildShareText(item) });
        }
        throw new Error("file share unsupported");
      })
      .catch(function (err) {
        if (!err || err.name !== "AbortError") {
          window.open(
            "https://wa.me/?text=" + encodeURIComponent(buildShareText(item) + "\n" + getShareUrl(item)),
            "_blank",
            "noopener",
          );
        }
      })
      .then(function () {
        btn.textContent = original;
      });
  }

  function buildShareText(item) {
    var line = "Breakfast Club" + (item.city ? " " + item.city : "");
    var meta = buildMetaLine(item);
    if (meta) line += " — " + meta;
    line += ". Everyone's invited. Especially you.";
    return line;
  }

  function updateShareTargets(item) {
    if (!lightbox || !item) return;
    var meta = flyerFileMeta(item);
    var payload = encodeURIComponent(buildShareText(item) + "\n" + getShareUrl(item));
    var nativeBtn = lightbox.querySelector(".flyer-share__btn--native");
    if (nativeBtn && !nativeBtn.hidden) {
      nativeBtn.textContent = "Share the Flyer (" + meta.label + ")";
    }
    var wa = lightbox.querySelector(".flyer-share__btn--whatsapp:not(.flyer-share__btn--native)");
    if (wa) wa.href = "https://wa.me/?text=" + payload;
    var sms = lightbox.querySelector(".flyer-share__btn--sms");
    if (sms) sms.href = "sms:?&body=" + payload;
    var dl = lightbox.querySelector(".flyer-share__btn--download");
    if (dl) {
      dl.href = item.url;
      dl.setAttribute("download", meta.name);
      dl.textContent = "Download " + meta.label;
    }
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

    // ── Easy to Share bar ────────────────────────────────────────────────
    var shareBar = document.createElement("div");
    shareBar.className = "flyer-share";

    var shareEyebrow = document.createElement("span");
    shareEyebrow.className = "flyer-share__eyebrow";
    shareEyebrow.textContent = "Easy to Share";

    var fileShareSupported = canShareFlyerFiles();

    // Primary: share the actual JPG/PDF via the native sheet (mobile et al.)
    var shareNative = document.createElement("button");
    shareNative.type = "button";
    shareNative.className = "flyer-share__btn flyer-share__btn--whatsapp flyer-share__btn--native";
    shareNative.textContent = "Share the Flyer (JPG)";
    shareNative.hidden = !fileShareSupported;
    shareNative.addEventListener("click", function () {
      var item = flyerGalleryItems[activeFlyerIndex];
      if (item) shareFlyerFile(item, shareNative);
    });

    // Fallbacks for browsers that can't share files: text + link
    var shareWhatsApp = document.createElement("a");
    shareWhatsApp.className = "flyer-share__btn flyer-share__btn--whatsapp";
    shareWhatsApp.target = "_blank";
    shareWhatsApp.rel = "noopener";
    shareWhatsApp.textContent = "Send to a Friend on WhatsApp";
    shareWhatsApp.hidden = fileShareSupported;

    var shareSms = document.createElement("a");
    shareSms.className = "flyer-share__btn flyer-share__btn--sms";
    shareSms.textContent = "Text It";
    shareSms.hidden = fileShareSupported;

    // Always available: grab the file itself
    var shareDownload = document.createElement("a");
    shareDownload.className = "flyer-share__btn flyer-share__btn--download";
    shareDownload.textContent = "Download";

    var shareCopy = document.createElement("button");
    shareCopy.type = "button";
    shareCopy.className = "flyer-share__btn flyer-share__btn--copy";
    shareCopy.textContent = "Copy Link";
    shareCopy.addEventListener("click", function () {
      var item = flyerGalleryItems[activeFlyerIndex];
      if (!item) return;
      var payload = buildShareText(item) + "\n" + getShareUrl(item);
      var done = function () {
        shareCopy.textContent = "Copied!";
        shareCopy.classList.add("is-copied");
        window.setTimeout(function () {
          shareCopy.textContent = "Copy Link";
          shareCopy.classList.remove("is-copied");
        }, 1600);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(payload).then(done, done);
      } else {
        var ta = document.createElement("textarea");
        ta.value = payload;
        document.body.append(ta);
        ta.select();
        document.execCommand("copy");
        ta.remove();
        done();
      }
    });

    shareBar.append(shareEyebrow, shareNative, shareWhatsApp, shareSms, shareDownload, shareCopy);

    var gallery = document.createElement("div");
    gallery.className = "flyer-lightbox-gallery";

    panel.append(topbar, stage, hint, shareBar, gallery);
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
    updateShareTargets(item);
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
