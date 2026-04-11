(function () {
  "use strict";

  // ── Config ─────────────────────────────────────────────────────────────────

  const SPOTLIGHT_FIRST_DELAY = 9000;  // ms before first spotlight fires
  const SPOTLIGHT_INTERVAL    = 22000; // ms between spotlights
  const SPOTLIGHT_DURATION    = 4600;  // ms spotlight animation plays

  // Brand palette — used to colour words; mostly near-ink with accent greens
  const WORD_COLORS = [
    "#111111", "#111111", "#111111", // weighted toward ink
    "#173157",                        // night-sky navy
    "#0d6e43",                        // brand green
  ];

  // ── Config ─────────────────────────────────────────────────────────────────

  const PHOTO_CYCLE_INTERVAL = 14000; // ms between photo changes in photo-bg mode
  const SHARED_POLAROID_BACKDROP =
    "https://substackcdn.com/image/fetch/$s_!f4ZK!,w_1456,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2Fd8abd7d7-bb85-4bf3-895b-17bad8f0ab9d_5712x4284.jpeg";
  const FRAME_VARIANTS = ["auto", "black", "red", "orange", "white"];
  const FRAME_TEXTURES = {
    black: "./assets/polaroid-backdrops/polaroid-backdrop-08-blank-dark.png",
    red: "./assets/polaroid-backdrops/polaroid-backdrop-04.png",
    orange: "./assets/polaroid-backdrops/polaroid-backdrop-04.png",
    white: "./assets/polaroid-backdrops/polaroid-backdrop-07-white.png",
  };

  // ── State ──────────────────────────────────────────────────────────────────

  let currentRegion  = "All";
  let isRendering    = false;
  let spotlightTimer = null;
  let spotlightQueue = [];   // shuffled deck of spotlight indices
  let liveTopicsLoaded = false;
  let photoCycleTimer  = null; // interval handle for polaroid cycling
  let overlayTypeTimers = [];
  let overlayFrameVariantIndex = 0;
  let overlayPreambleHasTyped = false;
  const DEFAULT_OVERLAY_CLEAN_BACKGROUND = true;
  let overlayUseCleanBackground = DEFAULT_OVERLAY_CLEAN_BACKGROUND;
  const liveDates = {}; // normalised city key → ISO date string from Substack recap

  // ── Helpers ────────────────────────────────────────────────────────────────

  function randBetween(min, max) {
    return min + Math.random() * (max - min);
  }

  function randInt(min, max) {
    return Math.floor(randBetween(min, max));
  }

  function shuffleArray(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = randInt(0, i + 1);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function pickColor() {
    return WORD_COLORS[randInt(0, WORD_COLORS.length)];
  }

  function clearOverlayTyping() {
    overlayTypeTimers.forEach(clearTimeout);
    overlayTypeTimers = [];

    const preambleEl = document.getElementById("wc-overlay-preamble");
    if (preambleEl) {
      preambleEl.classList.remove("wc-overlay-preamble--typing");
      preambleEl.classList.remove("wc-overlay-preamble--active");
    }
  }

  function getOverlayPreambleCharDelay(ch, deleting) {
    if (deleting) return ch === "." ? 72 : ch === " " ? 34 : 48;
    return ch === "." ? 240 : ch === " " ? 80 : 105;
  }

  function formatOverlayDate(dateValue) {
    if (!dateValue) return "";
    const parsed = new Date(dateValue);
    if (Number.isNaN(parsed.getTime())) return "";
    return parsed.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }

  function getFrameVariantLabel(value) {
    if (value === "black") return "Black";
    if (value === "red") return "Red";
    if (value === "orange") return "Orange";
    if (value === "white") return "White";
    return "Auto";
  }

  function getOverlayFrameShell() {
    return document.querySelector("#wc-overlay [data-overlay-frame-shell]");
  }

  function getOverlayFrameSwapButton() {
    return document.querySelector("#wc-overlay [data-overlay-frame-swap]");
  }

  function getOverlayCleanBackgroundButton() {
    return document.getElementById("wc-overlay-clean-bg");
  }

  function getOverlayClubSwapButtons() {
    return Array.from(document.querySelectorAll("#wc-overlay-city, #wc-overlay-swap-club-prev, #wc-overlay-swap-club-next"));
  }

  function useMatchedPhotoBackdrop() {
    const body = document.body;
    return Boolean(
      (body && body.dataset && body.dataset.wwtaBackdropMode === "match-photo") ||
      (typeof window !== "undefined" && window.WWTA_BACKDROP_MODE === "match-photo")
    );
  }

  function setOverlayWordFade(active) {
    const stage = document.getElementById("wc-overlay-stage");
    if (!stage) return;
    stage.classList.toggle("wc-overlay-stage--frame-shifting", active);
  }

  function syncOverlayFrameControls(visible) {
    const button = getOverlayFrameSwapButton();
    if (!button) return;
    button.hidden = !visible;
    button.title = "Change Frame (" + getFrameVariantLabel(FRAME_VARIANTS[overlayFrameVariantIndex]) + ")";
    button.setAttribute(
      "aria-label",
      "Change frame. Current frame " + getFrameVariantLabel(FRAME_VARIANTS[overlayFrameVariantIndex])
    );
  }

  function setOverlayCleanBackground(active) {
    const overlay = document.getElementById("wc-overlay");
    const button = getOverlayCleanBackgroundButton();
    overlayUseCleanBackground = Boolean(active);
    if (overlay) {
      overlay.classList.toggle("wc-overlay--clean-backdrop", overlayUseCleanBackground);
    }
    if (button) {
      button.setAttribute("aria-pressed", overlayUseCleanBackground ? "true" : "false");
      button.classList.toggle("is-active", overlayUseCleanBackground);
    }
  }

  function syncOverlayCleanBackgroundControl(visible) {
    const button = getOverlayCleanBackgroundButton();
    if (!button) return;
    button.hidden = !visible;
    if (!visible) {
      setOverlayCleanBackground(DEFAULT_OVERLAY_CLEAN_BACKGROUND);
    } else {
      setOverlayCleanBackground(overlayUseCleanBackground);
    }
  }

  function applyOverlayFrameTexture(shell) {
    if (!shell) return;
    const frameEl = shell.querySelector(".wc-overlay-bg-photo-frame");
    const frameSwapImg = shell.querySelector(".wc-overlay-frame-script-img");
    if (!frameEl) return;

    const explicitVariant = shell.getAttribute("data-overlay-frame-explicit");
    const resolvedVariant = explicitVariant && explicitVariant !== "auto"
      ? explicitVariant
      : (shell.getAttribute("data-overlay-frame-variant") || "black");
    const texturePath = FRAME_TEXTURES[resolvedVariant] || FRAME_TEXTURES.black;

    frameEl.style.setProperty("--wc-frame-texture", 'url("' + texturePath + '")');

    if (frameSwapImg) {
      frameSwapImg.src = resolvedVariant === "white"
        ? "./assets/ui/change-frame-script-black.png?v=2"
        : "./assets/ui/change-frame-script-white.png";
    }
  }

  function setOverlayFrameVariant(value, options) {
    const opts = options || {};
    const shell = getOverlayFrameShell();
    if (!shell) return;

    const nextValue = FRAME_VARIANTS.includes(value) ? value : "auto";
    overlayFrameVariantIndex = FRAME_VARIANTS.indexOf(nextValue);
    shell.setAttribute("data-overlay-frame-explicit", nextValue);

    if (nextValue === "auto") {
      refreshOverlayFrameVariant(shell);
    } else {
      shell.setAttribute("data-overlay-frame-variant", nextValue);
      applyOverlayFrameTexture(shell);
    }

    syncOverlayFrameControls(true);

  }

  function cycleOverlayFrame(delta) {
    const nextIndex = (overlayFrameVariantIndex + delta + FRAME_VARIANTS.length) % FRAME_VARIANTS.length;
    setOverlayFrameVariant(FRAME_VARIANTS[nextIndex]);
  }

  function restartOverlayPhotoMotion(node) {
    if (!node) return;
    node.classList.remove("wc-overlay-bg-photo--push");
    void node.offsetWidth;
    node.classList.add("wc-overlay-bg-photo--push");
  }

  function setOverlayPhotoSource(scope, src) {
    if (!scope) return;
    scope.querySelectorAll("[data-overlay-photo-role]").forEach(function (node) {
      node.src = src;
      restartOverlayPhotoMotion(node);
    });
    refreshOverlayFrameVariant(scope);
  }

  function getOverlayExposureProfile(cityKey) {
    const key = normaliseCity(cityKey || "");
    if (key.includes("soma") || key.includes("maplewood")) {
      return {
        blurBrightness: 0.96,
        blurOpacity: 0.92,
        blurRadius: "24px",
        blurRadiusPortrait: "20px",
        bgPhotoPositionY: "50%",
        framePhotoPositionY: "52%",
      };
    }
    if (key.includes("torquay")) {
      return {
        blurBrightness: 0.9,
        blurOpacity: 0.9,
        bgPhotoPositionY: "54%",
        framePhotoPositionY: "56%",
      };
    }
    return null;
  }

  function applyOverlayExposureProfile(scope, cityKey) {
    if (!scope) return;
    const shell = scope.matches("[data-overlay-frame-shell]")
      ? scope
      : scope.querySelector("[data-overlay-frame-shell]");
    if (!shell) return;

    const profile = getOverlayExposureProfile(cityKey);
    if (!profile) {
      shell.style.removeProperty("--wc-blur-brightness");
      shell.style.removeProperty("--wc-blur-opacity");
      shell.style.removeProperty("--wc-blur-radius");
      shell.style.removeProperty("--wc-blur-radius-portrait");
      shell.style.removeProperty("--wc-frame-photo-brightness");
      shell.style.removeProperty("--wc-bg-photo-position-x");
      shell.style.removeProperty("--wc-bg-photo-position-y");
      shell.style.removeProperty("--wc-bg-photo-scale");
      shell.style.removeProperty("--wc-frame-photo-position-x");
      shell.style.removeProperty("--wc-frame-photo-position-y");
      shell.style.removeProperty("--wc-frame-photo-scale");
      return;
    }

    shell.style.setProperty("--wc-blur-brightness", String(profile.blurBrightness));
    shell.style.setProperty("--wc-blur-opacity", String(profile.blurOpacity));
    if (profile.blurRadius) shell.style.setProperty("--wc-blur-radius", profile.blurRadius);
    if (profile.blurRadiusPortrait) shell.style.setProperty("--wc-blur-radius-portrait", profile.blurRadiusPortrait);
    shell.style.setProperty("--wc-frame-photo-brightness", String(profile.framePhotoBrightness));
    if (profile.bgPhotoPositionX) shell.style.setProperty("--wc-bg-photo-position-x", profile.bgPhotoPositionX);
    if (profile.bgPhotoPositionY) shell.style.setProperty("--wc-bg-photo-position-y", profile.bgPhotoPositionY);
    if (profile.bgPhotoScale) shell.style.setProperty("--wc-bg-photo-scale", String(profile.bgPhotoScale));
    if (profile.framePhotoPositionX) shell.style.setProperty("--wc-frame-photo-position-x", profile.framePhotoPositionX);
    if (profile.framePhotoPositionY) shell.style.setProperty("--wc-frame-photo-position-y", profile.framePhotoPositionY);
    if (profile.framePhotoScale) shell.style.setProperty("--wc-frame-photo-scale", String(profile.framePhotoScale));
  }

  function setOverlayFramedPhotoSource(scope, src) {
    if (!scope) return;
    const framedNode = scope.querySelector('.wc-overlay-bg-photo-framed.is-visible') ||
      scope.querySelector('[data-overlay-photo-role="framed"]');
    if (!framedNode) return;
    framedNode.src = src;
    restartOverlayPhotoMotion(framedNode);
    refreshOverlayFrameVariant(scope);
  }

  function detectOverlayFrameVariant(imageEl) {
    return "black";
  }

  function refreshOverlayFrameVariant(scope) {
    if (!scope) return;

    const shell = scope.matches("[data-overlay-frame-shell]")
      ? scope
      : scope.querySelector("[data-overlay-frame-shell]");
    if (!shell) return;

    const explicitVariant = shell.getAttribute("data-overlay-frame-explicit");
    if (explicitVariant && explicitVariant !== "auto") {
      shell.setAttribute("data-overlay-frame-variant", explicitVariant);
      applyOverlayFrameTexture(shell);
      return;
    }

    const imageEl = shell.querySelector('.wc-overlay-bg-photo-framed.is-visible') ||
      shell.querySelector('[data-overlay-photo-role="framed"]');
    if (!imageEl) return;

    const applyVariant = function () {
      const aspectRatio = imageEl.naturalWidth
        ? imageEl.naturalHeight / imageEl.naturalWidth
        : 1;
      shell.setAttribute("data-overlay-photo-shape", aspectRatio > 1.18 ? "portrait" : "landscape");
      shell.setAttribute("data-overlay-frame-variant", detectOverlayFrameVariant(imageEl));
      applyOverlayFrameTexture(shell);
    };

    if (imageEl.complete && imageEl.naturalWidth) {
      applyVariant();
      return;
    }

    imageEl.addEventListener("load", applyVariant, { once: true });
  }

  function buildOverlayPhotoMarkup(src, treatment, frameVariant, backdropSrc) {
    if (treatment === "polaroid-frame") {
      const variant = frameVariant || "auto";
      const backdrop = useMatchedPhotoBackdrop()
        ? src
        : (backdropSrc || SHARED_POLAROID_BACKDROP || src);
      return (
        '<div class="wc-overlay-bg-photo-shell wc-overlay-bg-photo-shell--framed" data-overlay-frame-shell data-overlay-frame-explicit="' + variant + '" data-overlay-frame-variant="' + variant + '">' +
          '<img class="wc-overlay-bg-photo-blur wc-overlay-bg-photo--push" data-overlay-photo-role="blur" src="' + backdrop + '" alt="" aria-hidden="true">' +
          '<div class="wc-overlay-bg-photo-frame">' +
            '<div class="wc-overlay-bg-photo-frame-inner">' +
              '<img class="wc-overlay-bg-photo-framed wc-overlay-bg-photo--push is-visible" data-overlay-photo-role="framed" src="' + src + '" alt="" aria-hidden="true">' +
              '<img class="wc-overlay-bg-photo-framed is-swapping" data-overlay-photo-role="framed" src="' + src + '" alt="" aria-hidden="true">' +
            "</div>" +
            '<button class="wc-overlay-frame-script" data-overlay-frame-swap type="button" aria-label="Change frame">' +
              '<img class="wc-overlay-frame-script-img" src="./assets/ui/change-frame-script-white.png" alt="Change Frame">' +
            "</button>" +
          "</div>" +
        "</div>"
      );
    }

    return '<img class="wc-overlay-bg-photo wc-overlay-bg-photo--push is-active" data-overlay-photo-role="main" src="' + src + '" alt="" aria-hidden="true">' +
      '<img class="wc-overlay-bg-photo" data-overlay-photo-role="main" src="' + src + '" alt="" aria-hidden="true">';
  }

  function typeOverlayPreamble(text, options) {
    const opts = options || {};
    const preambleEl = document.getElementById("wc-overlay-preamble");
    const preambleTextEl = document.getElementById("wc-overlay-preamble-text");
    if (!preambleEl || !preambleTextEl) return;

    clearOverlayTyping();
    preambleEl.classList.add("wc-overlay-preamble--active");
    preambleEl.classList.add("wc-overlay-preamble--typing");

    const startingText = opts.deleteFirst ? (preambleTextEl.textContent || "") : "";
    preambleTextEl.textContent = startingText;

    let delay = opts.deleteFirst ? 0 : 300;

    if (opts.deleteFirst && startingText) {
      for (let i = startingText.length - 1; i >= 0; i -= 1) {
        const nextDelay = delay;
        overlayTypeTimers.push(setTimeout(function () {
          preambleTextEl.textContent = startingText.slice(0, i);
        }, nextDelay));
        delay += getOverlayPreambleCharDelay(startingText.charAt(i), true);
      }
      delay += 180;
    }

    for (let i = 0; i < text.length; i += 1) {
      const nextDelay = delay;
      overlayTypeTimers.push(setTimeout(function () {
        preambleTextEl.textContent = text.slice(0, i + 1);
        if (i === text.length - 1) {
          preambleEl.classList.remove("wc-overlay-preamble--typing");
          if (typeof opts.onComplete === "function") {
            opts.onComplete();
          }
        }
      }, nextDelay));

      delay += getOverlayPreambleCharDelay(text.charAt(i), false);
    }
  }

  function showOverlayPreamble(text) {
    const preambleEl = document.getElementById("wc-overlay-preamble");
    const preambleTextEl = document.getElementById("wc-overlay-preamble-text");
    if (!preambleEl || !preambleTextEl) return;

    clearOverlayTyping();
    preambleTextEl.textContent = text;
    preambleEl.classList.add("wc-overlay-preamble--active");
  }

  function typeOverlayWordsSequentially(wordSpans) {
    if (!wordSpans || wordSpans.length === 0) return;

    let totalDelay = 560;

    wordSpans.forEach((span) => {
      const fullText = span.dataset.fullText || "";
      span.textContent = "";

      overlayTypeTimers.push(setTimeout(function () {
        span.classList.add("wc-overlay-word--visible");
      }, totalDelay));

      for (let i = 0; i < fullText.length; i += 1) {
        const nextDelay = totalDelay;
        overlayTypeTimers.push(setTimeout(function () {
          span.textContent = fullText.slice(0, i + 1);
        }, nextDelay));

        const ch = fullText.charAt(i);
        totalDelay += ch === " " ? 34 : ch === "-" ? 52 : 60;
      }

      totalDelay += 220;
    });
  }

  // ── Photo cycling (scatter-bg mode) ────────────────────────────────────────

  function startPhotoCycle(photos, startingIndex) {
    stopPhotoCycle();
    if (!photos || photos.length <= 1) return;

    let idx = Number.isInteger(startingIndex) ? startingIndex : 0;

    photoCycleTimer = setInterval(function () {
      idx = (idx + 1) % photos.length;
      const shell = document.querySelector(".wc-overlay-bg-photos");
      if (!shell) return;
      const photoShell = shell.querySelector(".wc-overlay-bg-photo-shell");

      if (photoShell) {
        const framedNodes = Array.from(photoShell.querySelectorAll('[data-overlay-photo-role="framed"]'));
        if (framedNodes.length < 2) return;
        const outgoing = framedNodes.find(function (node) {
          return node.classList.contains("is-visible");
        }) || framedNodes[0];
        const incoming = framedNodes.find(function (node) {
          return node !== outgoing;
        });
        if (!incoming) return;

        // Preload next image, then do a simultaneous crossfade
        const nextSrc = photos[idx];
        const preload = new Image();
        preload.onload = function () {
          if (!photoShell.parentNode) return;

          // Stage incoming behind outgoing (hidden)
          incoming.classList.add("is-swapping");
          incoming.src = nextSrc;
          restartOverlayPhotoMotion(incoming);
          void incoming.offsetWidth;

          // Simultaneous crossfade: outgoing fades out, incoming fades in
          incoming.classList.remove("is-swapping");
          incoming.classList.add("is-visible");
          outgoing.classList.add("is-swapping");
          outgoing.classList.remove("is-visible");

          // Also cross-fade the blur layer to match the new photo
          const blurNode = photoShell.querySelector('[data-overlay-photo-role="blur"]');
          if (blurNode) {
            blurNode.style.transition = "opacity 2.2s cubic-bezier(0.22, 1, 0.36, 1)";
            blurNode.style.opacity = "0";
            setTimeout(function () {
              blurNode.src = nextSrc;
              blurNode.style.opacity = "";
              setTimeout(function () { blurNode.style.transition = ""; }, 2200);
            }, 600);
          }

          refreshOverlayFrameVariant(photoShell);
        };
        preload.onerror = function () {
          // If preload fails, fall back to direct swap
          if (!photoShell.parentNode) return;
          incoming.classList.add("is-swapping");
          incoming.src = nextSrc;
          void incoming.offsetWidth;
          incoming.classList.remove("is-swapping");
          incoming.classList.add("is-visible");
          outgoing.classList.add("is-swapping");
          outgoing.classList.remove("is-visible");
          refreshOverlayFrameVariant(photoShell);
        };
        preload.src = nextSrc;
        return;
      }

      const photoNodes = Array.from(shell.querySelectorAll(".wc-overlay-bg-photo"));
      if (photoNodes.length < 2) return;

      const active = photoNodes.find(function (node) {
        return node.classList.contains("is-active");
      }) || photoNodes[0];
      const incoming = photoNodes.find(function (node) {
        return node !== active;
      });
      if (!incoming) return;

      incoming.src = photos[idx];
      restartOverlayPhotoMotion(incoming);
      incoming.classList.add("is-active");
      active.classList.remove("is-active");
    }, PHOTO_CYCLE_INTERVAL);
  }

  function stopPhotoCycle() {
    if (photoCycleTimer) {
      clearInterval(photoCycleTimer);
      photoCycleTimer = null;
    }
  }

  function syncOverlayPhotoDots() {
    const dots = document.getElementById("wc-overlay-photo-dots");
    if (!dots) return;
    if (overlayPhotos.length <= 1) {
      dots.hidden = true;
      return;
    }
    dots.hidden = false;
    dots.innerHTML = "";
    overlayPhotos.forEach(function (_, i) {
      const dot = document.createElement("span");
      dot.className = "wc-overlay-photo-dot" + (i === overlayPhotoIdx ? " is-active" : "");
      dots.appendChild(dot);
    });
  }

  function syncOverlayCarouselGhosts() {
    const prevGhost = document.getElementById("wc-carousel-ghost-prev");
    const nextGhost = document.getElementById("wc-carousel-ghost-next");
    const prevImg   = document.getElementById("wc-carousel-prev-img");
    const nextImg   = document.getElementById("wc-carousel-next-img");
    if (!prevGhost || !nextGhost) return;
    if (overlayPhotos.length <= 1) {
      prevGhost.hidden = true;
      nextGhost.hidden = true;
      return;
    }
    const n = overlayPhotos.length;
    const prevIdx = (overlayPhotoIdx - 1 + n) % n;
    const nextIdx = (overlayPhotoIdx + 1) % n;
    if (prevImg) prevImg.src = overlayPhotos[prevIdx];
    if (nextImg) nextImg.src = overlayPhotos[nextIdx];
    prevGhost.dataset.photoIndex = String(prevIdx);
    nextGhost.dataset.photoIndex = String(nextIdx);
    prevGhost.hidden = false;
    nextGhost.hidden = false;
  }

  function syncOverlayCitySizing() {
    const overlay = document.getElementById("wc-overlay");
    const cityLabel = document.getElementById("wc-overlay-city");
    if (!overlay || overlay.hidden || !cityLabel) return;

    cityLabel.style.fontSize = "";
    cityLabel.classList.remove("wc-overlay-city--fit-tight", "wc-overlay-city--fit-ultra");

    requestAnimationFrame(function () {
      if (!cityLabel.clientWidth) return;

      let fontSize = parseFloat(window.getComputedStyle(cityLabel).fontSize);
      const isMobile = window.matchMedia && window.matchMedia("(max-width: 540px)").matches;
      const minFontSize = isMobile ? 13 : 14;
      let steps = 0;

      while (cityLabel.scrollWidth > cityLabel.clientWidth + 1 && fontSize > minFontSize && steps < 30) {
        fontSize -= 0.5;
        cityLabel.style.fontSize = fontSize + "px";
        steps += 1;
      }

      if (fontSize <= 22) cityLabel.classList.add("wc-overlay-city--fit-tight");
      if (fontSize <= 18) cityLabel.classList.add("wc-overlay-city--fit-ultra");
      syncOverlayFrameCenter();
    });
  }

  function syncOverlayFrameCenter() {
    const overlay = document.getElementById("wc-overlay");
    if (!overlay) return;

    const isMobile = window.matchMedia && window.matchMedia("(max-width: 540px)").matches;
    if (!isMobile) {
      overlay.style.removeProperty("--wc-frame-center-x");
      return;
    }

    const cityButton = document.getElementById("wc-overlay-city");
    if (!cityButton) {
      overlay.style.setProperty("--wc-frame-center-x", "50vw");
      return;
    }

    const buttonRect = cityButton.getBoundingClientRect();
    const overlayRect = overlay.getBoundingClientRect();
    const centerX = buttonRect.left - overlayRect.left + (buttonRect.width / 2);
    overlay.style.setProperty("--wc-frame-center-x", centerX + "px");
  }

  function syncOverlayPhotoNav() {
    const prevBtn = document.getElementById("wc-overlay-prev");
    const nextBtn = document.getElementById("wc-overlay-next");
    const hasMultiplePhotos = overlayPhotos.length > 1;
    if (prevBtn) prevBtn.hidden = !hasMultiplePhotos;
    if (nextBtn) nextBtn.hidden = !hasMultiplePhotos;
    syncOverlayPhotoDots();
    syncOverlayCarouselGhosts();
  }

  function syncOverlayClubSwapControl() {
    const canSwap = overlayClubButtons.length > 1;
    const cityButton = document.getElementById("wc-overlay-city");
    const prevButton = document.getElementById("wc-overlay-swap-club-prev");
    const nextButton = document.getElementById("wc-overlay-swap-club-next");
    if (prevButton) prevButton.hidden = !canSwap;
    if (nextButton) nextButton.hidden = !canSwap;
    if (cityButton) cityButton.disabled = !canSwap;
  }

  function getOverlayClubButtonKey(button, fallbackIndex) {
    if (!button) return String(fallbackIndex ?? "");
    return normaliseCity(
      button.dataset.city ||
      button.dataset.displayCity ||
      String(fallbackIndex ?? "")
    );
  }

  function rememberOverlayClubVisit() {
    if (!overlayClubButtons.length || overlayCurrentIdx < 0 || overlayCurrentIdx >= overlayClubButtons.length) return;
    const key = getOverlayClubButtonKey(overlayClubButtons[overlayCurrentIdx], overlayCurrentIdx);
    if (!key) return;
    overlayRecentClubKeys = overlayRecentClubKeys.filter((seenKey) => seenKey !== key);
    overlayRecentClubKeys.push(key);
    if (overlayRecentClubKeys.length > OVERLAY_RECENT_CLUB_LIMIT) {
      overlayRecentClubKeys = overlayRecentClubKeys.slice(-OVERLAY_RECENT_CLUB_LIMIT);
    }
  }

  function transitionOverlayPhoto(nextIndex) {
    if (!overlayPhotos || overlayPhotos.length <= 1 || overlayPhotoTransitioning) return;

    const normalizedIndex = (nextIndex + overlayPhotos.length) % overlayPhotos.length;
    if (normalizedIndex === overlayPhotoIdx) return;

    const shell = document.querySelector(".wc-overlay-bg-photos");
    if (!shell) return;

    const nextSrc = overlayPhotos[normalizedIndex];
    overlayPhotoTransitioning = true;

    const finishTransition = function () {
      overlayPhotoIdx = normalizedIndex;
      overlayPhotoTransitioning = false;
      syncOverlayPhotoDots();
      syncOverlayCarouselGhosts();
    };

    const photoShell = shell.querySelector(".wc-overlay-bg-photo-shell");
    if (photoShell) {
      const framedNodes = Array.from(photoShell.querySelectorAll('[data-overlay-photo-role="framed"]'));
      if (framedNodes.length < 2) {
        overlayPhotoTransitioning = false;
        return;
      }
      const outgoing = framedNodes.find(function (node) {
        return node.classList.contains("is-visible");
      }) || framedNodes[0];
      const incoming = framedNodes.find(function (node) {
        return node !== outgoing;
      });
      if (!incoming) {
        overlayPhotoTransitioning = false;
        return;
      }

      const preload = new Image();
      preload.onload = function () {
        if (!photoShell.parentNode) {
          overlayPhotoTransitioning = false;
          return;
        }

        incoming.classList.add("is-swapping");
        incoming.src = nextSrc;
        restartOverlayPhotoMotion(incoming);
        void incoming.offsetWidth;

        incoming.classList.remove("is-swapping");
        incoming.classList.add("is-visible");
        outgoing.classList.add("is-swapping");
        outgoing.classList.remove("is-visible");

        const blurNode = photoShell.querySelector('[data-overlay-photo-role="blur"]');
        if (blurNode) {
          blurNode.style.transition = "opacity 2.2s cubic-bezier(0.22, 1, 0.36, 1)";
          blurNode.style.opacity = "0";
          setTimeout(function () {
            blurNode.src = nextSrc;
            blurNode.style.opacity = "";
            setTimeout(function () { blurNode.style.transition = ""; }, 2200);
          }, 600);
        }

        refreshOverlayFrameVariant(photoShell);
        setTimeout(finishTransition, 240);
      };

      preload.onerror = function () {
        if (!photoShell.parentNode) {
          overlayPhotoTransitioning = false;
          return;
        }
        incoming.classList.add("is-swapping");
        incoming.src = nextSrc;
        void incoming.offsetWidth;
        incoming.classList.remove("is-swapping");
        incoming.classList.add("is-visible");
        outgoing.classList.add("is-swapping");
        outgoing.classList.remove("is-visible");
        refreshOverlayFrameVariant(photoShell);
        setTimeout(finishTransition, 240);
      };

      preload.src = nextSrc;
      return;
    }

    const photoNodes = Array.from(shell.querySelectorAll(".wc-overlay-bg-photo"));
    if (photoNodes.length < 2) {
      overlayPhotoTransitioning = false;
      return;
    }

    const active = photoNodes.find(function (node) {
      return node.classList.contains("is-active");
    }) || photoNodes[0];
    const incoming = photoNodes.find(function (node) {
      return node !== active;
    });
    if (!incoming) {
      overlayPhotoTransitioning = false;
      return;
    }

    incoming.src = nextSrc;
    restartOverlayPhotoMotion(incoming);
    incoming.classList.add("is-active");
    active.classList.remove("is-active");
    finishTransition();
  }

  function navigateOverlayPhoto(delta) {
    if (!overlayPhotos || overlayPhotos.length <= 1) return;
    transitionOverlayPhoto(overlayPhotoIdx + delta);
  }

  // ── Topic building ─────────────────────────────────────────────────────────

  function getTopicsForRegion(region) {
    const primary = WC_TOPICS[region] || [];
    const fallback = WC_TOPICS["All"] || [];

    if (region === "All") return fallback;

    // Blend region-specific topics with attenuated global topics
    const combined = [...primary];
    fallback.forEach(([word, wt]) => {
      if (!combined.find(([w]) => w === word)) {
        combined.push([word, Math.max(2, Math.floor(wt * 0.35))]);
      }
    });
    return combined;
  }

  // ── Word cloud render ──────────────────────────────────────────────────────

  function renderCloud(region) {
    if (typeof WordCloud === "undefined") return;

    const stage = document.getElementById("word-cloud-stage");
    if (!stage) return;

    if (isRendering) return;
    isRendering = true;

    // Fade out, clear, then re-render
    stage.classList.remove("wc-ready");
    stage.classList.add("wc-fading");

    setTimeout(() => {
      stage.innerHTML = "";
      stage.classList.remove("wc-fading");

      const list   = getTopicsForRegion(region);
      const stageW = stage.offsetWidth  || 800;
      const stageH = stage.offsetHeight || 600;

      WordCloud(stage, {
        list,
        fontFamily:   '"Helvetica Neue", Helvetica, Arial, sans-serif',
        fontWeight:   "300",
        color:        pickColor,
        rotateRatio:  0,               // all horizontal — cleaner look
        backgroundColor: "transparent",
        gridSize:     Math.max(8, Math.round(stageW / 55)),
        weightFactor: function (size) {
          // Scale so largest words reach ~32px, smallest ~10px
          const scale = stageW / 900;
          return Math.max(10, Math.round(size * 2.6 * scale));
        },
        drawOutOfBound: false,
        shrinkToFit:  true,
        origin:       [stageW / 2, stageH / 2],
      });

      stage.addEventListener("wordcloudstop", function onStop() {
        stage.removeEventListener("wordcloudstop", onStop);
        postProcessWords(stage);
        stage.classList.add("wc-ready");
        isRendering = false;
      }, { once: true });

    }, 300);
  }

  // After WordCloud2 renders, tag each span with our class + drift CSS vars
  function postProcessWords(stage) {
    // WordCloud2 in DOM mode creates spans with inline position styles
    stage.querySelectorAll("span[style]").forEach((span) => {
      span.classList.add("wc-word");

      // Unique drift path per word
      span.style.setProperty("--wc-dx1", `${randInt(-14, 14)}px`);
      span.style.setProperty("--wc-dy1", `${randInt(-18,  4)}px`);
      span.style.setProperty("--wc-dx2", `${randInt(-10, 10)}px`);
      span.style.setProperty("--wc-dy2", `${randInt(-28, -6)}px`);
      span.style.setProperty("--wc-dx3", `${randInt(-14, 14)}px`);
      span.style.setProperty("--wc-dy3", `${randInt(-16,  6)}px`);

      span.style.animationDuration = `${randBetween(18, 38)}s`;
      span.style.animationDelay    = `${randBetween(-35, 0)}s`; // offset so they're all mid-cycle
    });
  }

  // ── Spotlight cycle ────────────────────────────────────────────────────────

  function buildSpotlightQueue() {
    // Rebuild a shuffled deck of all WC_SPOTLIGHTS indices
    spotlightQueue = shuffleArray(
      WC_SPOTLIGHTS.map((_, i) => i)
    );
  }

  function nextSpotlightIndex() {
    if (spotlightQueue.length === 0) buildSpotlightQueue();
    return spotlightQueue.pop();
  }

  function candidateSpotlights(region) {
    if (region === "All") return WC_SPOTLIGHTS;
    return WC_SPOTLIGHTS.filter((s) => s.region === region);
  }

  function fireSpotlight() {
    let pool = candidateSpotlights(currentRegion);
    if (pool.length === 0) pool = WC_SPOTLIGHTS; // fallback to all

    const spotlight = pool[randInt(0, pool.length)];
    showSpotlight(spotlight);
  }

  function showSpotlight(spotlight) {
    // Remove any lingering cards
    document.querySelectorAll(".wc-spotlight-card").forEach((el) => el.remove());

    const card = document.createElement("div");
    card.className = "wc-spotlight-card";

    // Badge: use real recap date if available, else a generic label
    const spotKey = normaliseCity(spotlight.displayName);
    const dateISO = liveDates[spotKey];
    const badgeText = dateISO
      ? new Date(dateISO).toLocaleDateString("en-US", { month: "short", day: "numeric" })
      : "Recently";

    card.innerHTML =
      `<span class="wc-spotlight-card-badge">${badgeText}</span>` +
      `<span class="wc-spotlight-card-city">BK Club ${spotlight.displayName}</span>` +
      `<button class="wc-spotlight-card-cta">See what we talked about&nbsp;&rarr;</button>` +
      `<button class="wc-spotlight-card-close" aria-label="Dismiss">&times;</button>`;

    document.body.appendChild(card);

    // Illuminate matching words in the background cloud
    lightWords(spotlight.topics);

    function dismiss() {
      card.classList.add("wc-spotlight-card--out");
      setTimeout(() => { card.remove(); dimWords(); }, 350);
    }

    // CTA: find matching club button for full data, then open overlay
    card.querySelector(".wc-spotlight-card-cta").addEventListener("click", () => {
      card.remove();
      dimWords();
      const btns = Array.from(document.querySelectorAll("#clubs-list .wc-topics-btn"));
      const sKey = normaliseCity(spotlight.displayName);
      const btn = btns.find((b) => {
        const bKey = normaliseCity(b.dataset.city || "");
        return bKey.includes(sKey) || sKey.includes(bKey.split(" ")[0]);
      });
      overlayClubButtons = btns;
      if (btn) {
        overlayCurrentIdx = btns.indexOf(btn);
        openOverlay(btn.dataset.city, btn.dataset.displayCity,
                    btn.dataset.scheduleLabel, btn.dataset.eventTime, btn.dataset.venue, btn.dataset.upcomingDate);
      } else {
        overlayCurrentIdx = 0;
        openOverlay(spotlight.displayName.toLowerCase(), spotlight.displayName, "", "", "");
      }
    });

    // Close button
    card.querySelector(".wc-spotlight-card-close").addEventListener("click", dismiss);

    // Auto-dismiss
    setTimeout(() => { if (card.parentNode) dismiss(); }, SPOTLIGHT_DURATION);
  }

  function lightWords(topics) {
    const stage = document.getElementById("word-cloud-stage");
    if (!stage) return;

    const lowerTopics = topics.map((t) => t.toLowerCase());

    stage.querySelectorAll(".wc-word").forEach((span) => {
      const text = span.textContent.trim().toLowerCase();
      // Match exact phrase or first significant word
      const isMatch = lowerTopics.some((t) => {
        return t === text || text.includes(t.split(" ")[0]) || t.includes(text.split(" ")[0]);
      });
      if (isMatch) span.classList.add("wc-word--lit");
    });
  }

  function dimWords() {
    document.querySelectorAll(".wc-word--lit").forEach((s) =>
      s.classList.remove("wc-word--lit")
    );
  }

  function startSpotlightCycle() {
    buildSpotlightQueue();

    // First spotlight after initial delay
    setTimeout(fireSpotlight, SPOTLIGHT_FIRST_DELAY);

    // Recurring cycle
    spotlightTimer = setInterval(fireSpotlight, SPOTLIGHT_INTERVAL);
  }

  // ── Club overlay ───────────────────────────────────────────────────────────

  // Navigation state — list of all visible club buttons, current index
  let overlayClubButtons = [];
  let overlayCurrentIdx  = 0;
  let overlayPhotos = [];
  let overlayPhotoIdx = 0;
  let overlayPhotoTransitioning = false;
  let overlayRecentClubKeys = [];
  const OVERLAY_RECENT_CLUB_LIMIT = 5;

  // Word colors for light/cream background: ink, navy, green
  const OVERLAY_COLORS = [
    "#111111", "#111111", "#111111",  // ink — most words
    "#173157",                         // night-sky navy
    "#0d6e43",                         // brand green
    "#4a4a4a",                         // mid-grey
  ];
  const PHOTO_OVERLAY_COLORS = [
    "#ffffff", "#ffffff", "#f7f0e3",
    "#d9f2de", "#f4dfb6",
  ];
  const OVERLAY_ZONE_NAMES = [
    "top-left", "top", "top-right",
    "left", "right",
    "bottom-left", "bottom", "bottom-right",
  ];

  function overlayPickColor(usePhotoPalette) {
    const palette = usePhotoPalette ? PHOTO_OVERLAY_COLORS : OVERLAY_COLORS;
    return palette[randInt(0, palette.length)];
  }

  // Short-name aliases: sheet city key → spotlight displayName for tricky matches
  const CITY_ALIASES = {
    "maplewood, nj":        "SOMa",
    "soma":                 "SOMa",
    "dtbk":                 "Brooklyn",
    "new york — downtown brooklyn": "Brooklyn",
    "new york — williamsburg":      "Brooklyn",
    "new york - hamptons":  "Hamptons",
    "new york — hamptons":  "Hamptons",
  };

  function normaliseSpotlightLookup(raw) {
    const base = String(raw || "")
      .replace(/[—–]/g, "-")
      .split(",")[0];

    return normaliseCity(base)
      .replace(/^new york\s*-\s*/i, "")
      .replace(/^ny\s*-\s*/i, "")
      .trim();
  }

  function getRuntimeSpotlight(cityKey) {
    if (
      typeof window === "undefined" ||
      !window.WWTA_SPOTLIGHTS_BY_CITY ||
      !cityKey
    ) {
      return null;
    }

    const registry = window.WWTA_SPOTLIGHTS_BY_CITY;
    const candidates = [
      normaliseCity(cityKey),
      normaliseSpotlightLookup(cityKey),
    ].filter(Boolean);

    for (const candidate of candidates) {
      if (registry[candidate]) return registry[candidate];
    }

    return null;
  }

  function getSpotlightForCity(cityKey) {
    if (!cityKey) return null;
    const runtimeSpotlight = getRuntimeSpotlight(cityKey);
    if (runtimeSpotlight) return runtimeSpotlight;

    const rawKey = cityKey.toLowerCase().trim();
    const key = normaliseCity(cityKey);
    const aliasValue = CITY_ALIASES[rawKey] || CITY_ALIASES[key] || "";
    const candidates = [
      normaliseCity(cityKey),
      normaliseSpotlightLookup(cityKey),
    ];

    if (aliasValue) {
      candidates.push(normaliseCity(aliasValue));
      candidates.push(normaliseSpotlightLookup(aliasValue));
    }

    const dedupedCandidates = Array.from(new Set(candidates.filter(Boolean)));
    const exactMatch = WC_SPOTLIGHTS.find((spotlight) => {
      const spotlightKeys = [
        normaliseCity(spotlight.displayName),
        normaliseSpotlightLookup(spotlight.displayName),
      ];

      return dedupedCandidates.some((candidate) => spotlightKeys.includes(candidate));
    });

    return exactMatch || null;
  }

  function getTopicsForCity(cityKey) {
    if (!cityKey) return [];
    const key = normaliseCity(cityKey);
    const match = getSpotlightForCity(cityKey);
    if (match && match.topics.length > 0) return match.topics;

    // Fall back to regional topics for that city's region
    const region = (typeof CITY_REGION !== "undefined" && CITY_REGION[key]) || null;
    if (region && WC_TOPICS[region]) {
      return WC_TOPICS[region].slice(0, 12).map(([w]) => w);
    }

    return WC_TOPICS["All"].slice(0, 10).map(([w]) => w);
  }

  function getOverlayZoneOrder(width, surroundPhoto) {
    if (surroundPhoto) {
      if (width <= 540) return ["top", "left", "right", "bottom"];
      if (width <= 860) return ["top-left", "top-right", "left", "right", "bottom-left", "bottom-right"];
      return ["top-left", "top-right", "left", "right", "bottom-left", "bottom-right"];
    }

    if (width <= 540) return ["top"];
    if (width <= 860) return ["top", "left", "right", "bottom", "top-left", "top-right"];
    return ["top", "left", "right", "bottom", "top-left", "top-right", "bottom-left", "bottom-right"];
  }

  function getOverlayChipMax(zoneName, stageWidth) {
    if (zoneName === "top" || zoneName === "bottom") {
      return Math.min(320, Math.max(220, Math.round(stageWidth * 0.26)));
    }
    return Math.min(280, Math.max(170, Math.round(stageWidth * 0.19)));
  }

  function renderOverlayWords(stage, wordList, usePhotoPalette) {
    const stageWidth = stage.offsetWidth || window.innerWidth || 900;
    const surroundPhoto = document.getElementById("wc-overlay") &&
      document.getElementById("wc-overlay").classList.contains("wc-overlay--photo-frame");
    const zoneOrder = getOverlayZoneOrder(stageWidth, surroundPhoto);
    const zoneBuckets = new Map(OVERLAY_ZONE_NAMES.map((name) => [name, []]));
    const sizeScale = stageWidth <= 540 ? 0.84 : stageWidth <= 860 ? 0.94 : 1.08;
    const typingSpans = [];

    wordList.forEach((item, index) => {
      const zoneName = zoneOrder[index % zoneOrder.length];
      zoneBuckets.get(zoneName).push({ ...item, index, zoneName });
    });

    stage.innerHTML = "";
    stage.classList.add("wc-overlay-stage--zones");

    OVERLAY_ZONE_NAMES.forEach((zoneName) => {
      const zone = document.createElement("div");
      zone.className = `wc-overlay-zone wc-overlay-zone--${zoneName}`;

      const items = zoneBuckets.get(zoneName) || [];
      items.forEach(({ text, weight, index }) => {
        const px = Math.min(30, Math.max(14, Math.round(weight * 2.15 * sizeScale)));
        const span = document.createElement("span");
        span.dataset.fullText = text.toUpperCase();
        span.dataset.typingIndex = String(index);
        span.className = "wc-overlay-word";
        span.style.fontSize = px + "px";
        span.style.color = overlayPickColor(usePhotoPalette);
        span.style.setProperty("--wc-chip-max", `${getOverlayChipMax(zoneName, stageWidth)}px`);
        span.style.setProperty("--wc-target-opacity", String(randBetween(0.8, 0.96)));
        span.style.setProperty("--wc-dx1", `${randInt(-6, 6)}px`);
        span.style.setProperty("--wc-dy1", `${randInt(-12, 4)}px`);
        span.style.setProperty("--wc-dx2", `${randInt(-8, 8)}px`);
        span.style.setProperty("--wc-dy2", `${randInt(-18, -4)}px`);
        span.style.setProperty("--wc-dx3", `${randInt(-6, 6)}px`);
        span.style.setProperty("--wc-dy3", `${randInt(-10, 6)}px`);
        span.style.animationDuration = `${randBetween(18, 32)}s`;
        span.style.animationDelay = `${randBetween(-18, 0)}s`;
        zone.appendChild(span);
        typingSpans.push(span);
      });

      stage.appendChild(zone);
    });

    typingSpans.sort((a, b) => Number(a.dataset.typingIndex) - Number(b.dataset.typingIndex));
    typeOverlayWordsSequentially(typingSpans);
  }

  function openOverlay(cityKey, displayCity, scheduleLabel, eventTime, venue, upcomingDate) {
    const overlay       = document.getElementById("wc-overlay");
    const stage         = document.getElementById("wc-overlay-stage");
    const cityButton    = document.getElementById("wc-overlay-city");
    const cityLabel     = document.getElementById("wc-overlay-city-label");
    const metaEl        = document.getElementById("wc-overlay-meta");
    const sourceDateEl  = document.getElementById("wc-overlay-source-date");
    const attributionEl = document.getElementById("wc-overlay-attribution");
    const artEl         = document.getElementById("wc-overlay-art");
    const photoEl       = document.getElementById("wc-overlay-photo");
    if (!overlay || !stage) return;

    // Set title — strip country suffix for cleaner look (e.g. "Amsterdam, NL" → "Amsterdam")
    const resolvedCityLabel = (displayCity || cityKey || "").trim();
    if (cityLabel) {
      cityLabel.textContent = resolvedCityLabel;
    }
    if (cityButton) {
      cityButton.style.fontSize = "";
      cityButton.classList.remove("wc-overlay-city--compact", "wc-overlay-city--ultra-compact", "wc-overlay-city--fit-tight", "wc-overlay-city--fit-ultra");
      if (resolvedCityLabel.length > 15) cityButton.classList.add("wc-overlay-city--compact");
      if (resolvedCityLabel.length > 19) cityButton.classList.add("wc-overlay-city--ultra-compact");
    }

    // Look up spotlight data (photo/photos, attribution, topics)
    const spotlight    = getSpotlightForCity(cityKey);
    const photos       = spotlight && spotlight.photos && spotlight.photos.length > 0
                           ? Array.from(new Set(spotlight.photos.filter(Boolean))) : null;
    const photoURL     = !photos && spotlight && spotlight.photo ? spotlight.photo : null;
    const attribution  = spotlight && spotlight.attribution ? spotlight.attribution : null;
    const photoTreatment = spotlight && spotlight.photoTreatment
      ? spotlight.photoTreatment
      : (photos ? "polaroid-frame" : "");
    const frameVariant = spotlight && spotlight.frameVariant
      ? spotlight.frameVariant
      : "black";
    const heroPhotoIndex = spotlight && Number.isInteger(spotlight.heroPhotoIndex)
      ? Math.max(0, Math.min(spotlight.heroPhotoIndex, photos ? photos.length - 1 : 0))
      : 0;
    const heroPhoto = photos && photos.length ? photos[heroPhotoIndex] : null;
    overlayPhotos = photos ? photos.slice() : [];
    overlayPhotoIdx = overlayPhotos.length ? heroPhotoIndex : 0;
    overlayPhotoTransitioning = false;
    rememberOverlayClubVisit();
    if (metaEl) {
      const venueLine = venue
        ? (venue.indexOf(",") > -1 ? venue.slice(0, venue.indexOf(",")).trim() : venue.trim())
        : "";
      const scheduleLine = [scheduleLabel, eventTime].filter(Boolean).join(" ");
      metaEl.textContent = "";
      if (venueLine) {
        const venueSpan = document.createElement("span");
        venueSpan.className = "wc-overlay-meta-line wc-overlay-meta-line--venue";
        venueSpan.textContent = venueLine;
        metaEl.appendChild(venueSpan);
      }
      if (scheduleLine) {
        const scheduleSpan = document.createElement("span");
        scheduleSpan.className = "wc-overlay-meta-line wc-overlay-meta-line--schedule";
        scheduleSpan.textContent = scheduleLine;
        metaEl.appendChild(scheduleSpan);
      }
    }

    if (!overlayPreambleHasTyped) {
      typeOverlayPreamble("Latest happenings from...");
      overlayPreambleHasTyped = true;
    } else {
      showOverlayPreamble("Latest happenings from...");
    }

    stopPhotoCycle();
    let bgPhotosEl = overlay.querySelector(".wc-overlay-bg-photos");
    if (photos) {
      overlay.classList.add("wc-overlay--recap-simple");
      overlay.classList.add("wc-overlay--photo-bg");
      syncOverlayCleanBackgroundControl(true);
      if (!bgPhotosEl) {
        bgPhotosEl = document.createElement("div");
        bgPhotosEl.className = "wc-overlay-bg-photos";
        bgPhotosEl.setAttribute("aria-hidden", "true");
        overlay.insertBefore(bgPhotosEl, overlay.firstChild);
      }
      overlay.classList.toggle("wc-overlay--photo-frame", photoTreatment === "polaroid-frame");
      bgPhotosEl.innerHTML = buildOverlayPhotoMarkup(heroPhoto || photos[0], photoTreatment, frameVariant, heroPhoto || photos[0]);
      applyOverlayExposureProfile(bgPhotosEl, cityKey);
      refreshOverlayFrameVariant(bgPhotosEl);
      overlayFrameVariantIndex = FRAME_VARIANTS.indexOf(FRAME_VARIANTS.includes(frameVariant) ? frameVariant : "black");
      syncOverlayFrameControls(photoTreatment === "polaroid-frame");
      if (photoTreatment === "polaroid-frame") {
        setOverlayFrameVariant(frameVariant, { skipWordFade: true });
      }
    } else {
      overlay.classList.add("wc-overlay--recap-simple");
      overlay.classList.remove("wc-overlay--photo-bg");
      overlay.classList.remove("wc-overlay--photo-frame");
      syncOverlayFrameControls(false);
      syncOverlayCleanBackgroundControl(false);
      if (bgPhotosEl) { bgPhotosEl.remove(); }
    }
    syncOverlayPhotoNav();
    syncOverlayClubSwapControl();

    // Source date flag: "from March 10, 2026 recap"
    if (sourceDateEl) {
      sourceDateEl.textContent = "";
      sourceDateEl.setAttribute("hidden", "");
    }

    if (photoEl) {
      if (photoURL) {
        photoEl.src = photoURL;
        photoEl.removeAttribute("hidden");
        if (artEl) artEl.removeAttribute("hidden");
      } else {
        photoEl.src = "";
        photoEl.setAttribute("hidden", "");
        if (artEl) artEl.setAttribute("hidden", "");
      }
    }

    if (attributionEl) {
      if (attribution) {
        attributionEl.textContent = attribution;
        attributionEl.removeAttribute("hidden");
      } else {
        attributionEl.textContent = "";
        attributionEl.setAttribute("hidden", "");
      }
    }

    stage.innerHTML = "";
    stage.classList.remove("wc-overlay-stage--zones");
    overlay.removeAttribute("hidden");
    overlay.classList.remove("wc-overlay--closing");
    syncOverlayCitySizing();
    syncOverlayFrameCenter();

    // Trap Escape key
    document.addEventListener("keydown", onOverlayKeydown);
  }

  function closeOverlay() {
    const overlay = document.getElementById("wc-overlay");
    if (!overlay || overlay.hidden) return;

    if (
      document.body &&
      document.body.dataset &&
      document.body.dataset.wordCloudPreview === "true" &&
      typeof window !== "undefined" &&
      window.WWTA_RETURN_URL
    ) {
      window.location.href = window.WWTA_RETURN_URL;
      return;
    }

    stopPhotoCycle();
    clearOverlayTyping();
    overlay.classList.add("wc-overlay--closing");
    document.removeEventListener("keydown", onOverlayKeydown);

    setTimeout(() => {
      overlay.setAttribute("hidden", "");
      overlay.classList.remove("wc-overlay--closing");
      overlay.classList.remove("wc-overlay--recap-simple");
      overlay.classList.remove("wc-overlay--photo-bg");
      overlay.classList.remove("wc-overlay--clean-backdrop");
      overlay.classList.remove("wc-overlay--photo-frame");
      const bgPhotosEl    = overlay.querySelector(".wc-overlay-bg-photos");
      if (bgPhotosEl) bgPhotosEl.remove();
      const stage         = document.getElementById("wc-overlay-stage");
      if (stage) stage.innerHTML = "";
      const photoEl       = document.getElementById("wc-overlay-photo");
      if (photoEl) { photoEl.src = ""; photoEl.setAttribute("hidden", ""); }
      const artEl         = document.getElementById("wc-overlay-art");
      if (artEl) artEl.setAttribute("hidden", "");
      const attributionEl = document.getElementById("wc-overlay-attribution");
      if (attributionEl) { attributionEl.setAttribute("hidden", ""); }
      const sourceDateEl  = document.getElementById("wc-overlay-source-date");
      if (sourceDateEl) { sourceDateEl.setAttribute("hidden", ""); }
      syncOverlayFrameControls(false);
      syncOverlayCleanBackgroundControl(false);
    }, 220);
  }

  function openOverlayForButton(btn) {
    if (!btn) return;
    const stage = document.getElementById("wc-overlay-stage");
    if (stage) {
      stage.style.transition = "opacity 320ms cubic-bezier(0.22, 1, 0.36, 1)";
      stage.style.opacity    = "0";
      setTimeout(() => {
        openOverlay(
          btn.dataset.city,
          btn.dataset.displayCity,
          btn.dataset.scheduleLabel,
          btn.dataset.eventTime,
          btn.dataset.venue,
          btn.dataset.upcomingDate
        );
        stage.style.opacity = "1";
        setTimeout(() => { stage.style.transition = ""; }, 320);
      }, 320);
    } else {
      openOverlay(
        btn.dataset.city,
        btn.dataset.displayCity,
        btn.dataset.scheduleLabel,
        btn.dataset.eventTime,
        btn.dataset.venue,
        btn.dataset.upcomingDate
      );
    }
  }

  function navigateOverlay(delta) {
    if (overlayClubButtons.length === 0) return;
    overlayCurrentIdx = (overlayCurrentIdx + delta + overlayClubButtons.length) % overlayClubButtons.length;
    openOverlayForButton(overlayClubButtons[overlayCurrentIdx]);
  }

  function navigateOverlayRandom() {
    if (overlayClubButtons.length <= 1) return;
    const candidates = overlayClubButtons
      .map((btn, index) => ({ btn, index, key: getOverlayClubButtonKey(btn, index) }))
      .filter(({ index }) => index !== overlayCurrentIdx);
    if (!candidates.length) return;

    const freshCandidates = candidates.filter(({ key }) => !overlayRecentClubKeys.includes(key));
    const pool = freshCandidates.length ? freshCandidates : candidates;
    const nextIdx = pool[Math.floor(Math.random() * pool.length)].index;
    overlayCurrentIdx = nextIdx;
    openOverlayForButton(overlayClubButtons[overlayCurrentIdx]);
  }

  function onOverlayKeydown(e) {
    if (e.key === "ArrowRight") navigateOverlayPhoto(+1);
    if (e.key === "ArrowLeft")  navigateOverlayPhoto(-1);
  }

  function initOverlayListeners() {
    // Close button
    const closeBtn = document.getElementById("wc-overlay-close");
    if (closeBtn) closeBtn.addEventListener("click", closeOverlay);

    const cleanBgBtn = getOverlayCleanBackgroundButton();
    if (cleanBgBtn) {
      cleanBgBtn.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopPropagation();
        setOverlayCleanBackground(!overlayUseCleanBackground);
      });
    }

    // Prev / Next nav buttons
    const prevBtn = document.getElementById("wc-overlay-prev");
    const nextBtn = document.getElementById("wc-overlay-next");
    if (prevBtn) prevBtn.addEventListener("click", () => navigateOverlayPhoto(-1));
    if (nextBtn) nextBtn.addEventListener("click", () => navigateOverlayPhoto(+1));
    const prevGhost = document.getElementById("wc-carousel-ghost-prev");
    const nextGhost = document.getElementById("wc-carousel-ghost-next");
    if (prevGhost) {
      prevGhost.addEventListener("click", function () {
        const idx = Number(prevGhost.dataset.photoIndex);
        if (Number.isFinite(idx)) transitionOverlayPhoto(idx);
      });
    }
    if (nextGhost) {
      nextGhost.addEventListener("click", function () {
        const idx = Number(nextGhost.dataset.photoIndex);
        if (Number.isFinite(idx)) transitionOverlayPhoto(idx);
      });
    }
    getOverlayClubSwapButtons().forEach((swapBtn) => {
      swapBtn.addEventListener("click", navigateOverlayRandom);
    });
    window.addEventListener("resize", function () {
      const overlay = document.getElementById("wc-overlay");
      if (overlay && !overlay.hidden) {
        syncOverlayCitySizing();
        syncOverlayFrameCenter();
      }
    });

    // Click on overlay backdrop (not on words) → close
    const overlay = document.getElementById("wc-overlay");
    if (overlay) {
      overlay.addEventListener("click", function (e) {
        const frameSwap = e.target.closest && e.target.closest("[data-overlay-frame-swap]");
        if (frameSwap) {
          e.preventDefault();
          e.stopPropagation();
          cycleOverlayFrame(+1);
          return;
        }
      });

      // Touch swipe: left/right to browse photos
      let touchStartX = 0;
      let touchStartY = 0;
      overlay.addEventListener("touchstart", function (e) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
      }, { passive: true });
      overlay.addEventListener("touchend", function (e) {
        const dx = e.changedTouches[0].clientX - touchStartX;
        const dy = e.changedTouches[0].clientY - touchStartY;
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
          navigateOverlayPhoto(dx < 0 ? +1 : -1);
        }
      }, { passive: true });
    }

    // Event delegation: "What we talked about" buttons on club cards
    const clubsList = document.getElementById("clubs-list");
    if (clubsList) {
      clubsList.addEventListener("click", function (e) {
        const btn = e.target.closest(".wc-topics-btn");
        if (!btn) return;
        e.stopPropagation();
        // Snapshot all visible club buttons for navigation
        overlayClubButtons = Array.from(
          document.querySelectorAll("#clubs-list .wc-topics-btn")
        );
        overlayCurrentIdx = overlayClubButtons.indexOf(btn);
        openOverlay(btn.dataset.city, btn.dataset.displayCity,
                    btn.dataset.scheduleLabel, btn.dataset.eventTime, btn.dataset.venue, btn.dataset.upcomingDate);
      });
    }
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Called from script.js whenever the region filter changes.
   * Re-renders the word cloud with region-appropriate topics.
   */
  window.updateWordCloud = function (region) {
    currentRegion = region;
    renderCloud(region);
  };
  window.openWordCloudOverlay = openOverlay;
  window.closeWordCloudOverlay = closeOverlay;

  // ── Live topics from Substack ───────────────────────────────────────────────

  // Normalise a city string the same way the Netlify function does
  function normaliseCity(raw) {
    return raw
      .toLowerCase()
      .replace(/\bme\b/g, "")
      .replace(/\bny\b/g, "")
      .replace(/\bnj\b/g, "")
      .replace(/[^a-z0-9\s\-]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  async function fetchLiveTopics() {
    try {
      const res = await fetch("/.netlify/functions/fetch-substack-topics");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      mergeLiveTopics(data.cities || {}, data.dates || {});
      liveTopicsLoaded = true;
    } catch (_) {
      // Silently fall back to curated topics — expected in local dev
    }
  }

  function mergeLiveTopics(cities, dates) {
    // Update WC_SPOTLIGHTS with real topics from the Substack recaps.
    // Also inject new spotlight entries for cities that appear in the feed
    // but aren't in the curated list yet.
    const existingNames = new Set(
      WC_SPOTLIGHTS.map((s) => normaliseCity(s.displayName))
    );

    for (const [city, topics] of Object.entries(cities)) {
      if (topics.length === 0) continue;

      // Try to match an existing spotlight
      const existing = WC_SPOTLIGHTS.find(
        (s) => normaliseCity(s.displayName) === city ||
               city.includes(normaliseCity(s.displayName)) ||
               normaliseCity(s.displayName).includes(city)
      );

      if (existing) {
        // Prepend live topics (they're most recent / most authentic)
        const merged = [...new Set([...topics, ...existing.topics])];
        existing.topics = merged.slice(0, 20);
      } else if (!existingNames.has(city)) {
        // New city from the feed — add a spotlight entry
        const displayName = city
          .split(" ")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ");
        WC_SPOTLIGHTS.push({
          displayName,
          region: null,  // unknown; spotlight will still fire globally
          topics: topics.slice(0, 12),
        });
        existingNames.add(city);
      }

      // Store the recap date for this city
      const dateKey = existing ? normaliseCity(existing.displayName) : city;
      if (dates[city]) liveDates[dateKey] = dates[city];
    }

    // Also surface live topics in the "All" word cloud list so they appear
    // as floating background words
    const allTopics = WC_TOPICS["All"];
    const existingWords = new Set(allTopics.map(([w]) => w.toLowerCase()));
    for (const topics of Object.values(cities)) {
      for (const topic of topics) {
        if (!existingWords.has(topic) && topic.length > 3) {
          allTopics.push([topic, 4]);
          existingWords.add(topic);
        }
      }
    }
  }

  // ── Init ───────────────────────────────────────────────────────────────────

  document.addEventListener("DOMContentLoaded", function () {
    // Wait briefly for live topics from the Netlify function.
    // On prod: function responds ~300-500ms, topics load before first render.
    // Locally: fetch fails instantly (no function server), falls back to curated data.
    const MAX_LIVE_WAIT = 1500;
    const isPreviewMode = document.body && document.body.dataset.wordCloudPreview === "true";
    const previewConfig = window.WORD_CLOUD_PREVIEW || null;

    initOverlayListeners();

    Promise.race([
      fetchLiveTopics(),
      new Promise((resolve) => setTimeout(resolve, MAX_LIVE_WAIT)),
    ]).then(function () {
      // Small layout-settle delay before measuring stage dimensions
      setTimeout(function () {
        if (!isPreviewMode) {
          renderCloud("All");
          startSpotlightCycle();
        }
        if (previewConfig) {
          openOverlay(
            previewConfig.cityKey,
            previewConfig.displayCity,
            previewConfig.scheduleLabel || "",
            previewConfig.eventTime || "",
            previewConfig.venue || "",
            previewConfig.upcomingDate || "",
          );
        }
      }, 200);
    });
  });

})();
