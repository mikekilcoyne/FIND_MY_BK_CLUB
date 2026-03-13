// Shared flyer lightbox — used by map-view, calendar-view, and main index.
(function () {
  if (window.openFlyerLightbox) return; // already loaded by script.js on main page

  var lightbox = null;

  function closeFlyerLightbox() {
    if (lightbox) lightbox.hidden = true;
    document.body.style.overflow = "";
  }

  function ensureStyles() {
    if (document.getElementById("flyer-lightbox-styles")) return;
    var style = document.createElement("style");
    style.id = "flyer-lightbox-styles";
    style.textContent =
      ".flyer-lightbox{position:fixed;inset:0;background:rgba(0,0,0,.88);display:flex;align-items:center;justify-content:center;z-index:1000;padding:24px}" +
      ".flyer-lightbox[hidden]{display:none}" +
      ".flyer-lightbox-img{max-width:min(480px,100%);max-height:90vh;border-radius:8px;box-shadow:0 12px 48px rgba(0,0,0,.6);display:block;object-fit:contain}" +
      ".flyer-lightbox-close{position:absolute;top:16px;right:16px;width:44px;height:44px;background:rgba(255,255,255,.12);border:1.5px solid rgba(255,255,255,.5);border-radius:50%;color:#fff;font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-family:inherit;line-height:1}" +
      ".flyer-lightbox-close:hover{background:rgba(255,255,255,.28)}";
    document.head.append(style);
  }

  window.openFlyerLightbox = function (url, cityName) {
    ensureStyles();

    if (!lightbox) {
      lightbox = document.createElement("div");
      lightbox.className = "flyer-lightbox";
      lightbox.setAttribute("role", "dialog");
      lightbox.setAttribute("aria-modal", "true");

      var img = document.createElement("img");
      img.className = "flyer-lightbox-img";
      img.alt = "";

      var closeBtn = document.createElement("button");
      closeBtn.className = "flyer-lightbox-close";
      closeBtn.setAttribute("aria-label", "Close flyer");
      closeBtn.textContent = "\u2715";
      closeBtn.addEventListener("click", closeFlyerLightbox);

      lightbox.append(closeBtn, img);
      lightbox.addEventListener("click", function (e) {
        if (e.target === lightbox) closeFlyerLightbox();
      });

      document.body.append(lightbox);
    }

    lightbox.querySelector(".flyer-lightbox-img").src = url;
    lightbox.querySelector(".flyer-lightbox-img").alt = (cityName || "") + " flyer";
    lightbox.hidden = false;
    document.body.style.overflow = "hidden";

    var onKey = function (e) {
      if (e.key === "Escape") {
        closeFlyerLightbox();
        document.removeEventListener("keydown", onKey);
      }
    };
    document.addEventListener("keydown", onKey);
  };
})();
