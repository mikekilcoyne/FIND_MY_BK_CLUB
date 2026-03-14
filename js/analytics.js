(function analyticsBootstrap() {
  const measurementId = (window.BK_GA4_ID || "").trim();

  function noop() {}
  const analytics = {
    enabled: false,
    page: noop,
    track: noop,
  };

  if (!measurementId) {
    window.BKAnalytics = analytics;
    return;
  }

  window.dataLayer = window.dataLayer || [];
  function gtag() {
    window.dataLayer.push(arguments);
  }
  window.gtag = gtag;

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
  document.head.append(script);

  gtag("js", new Date());
  gtag("config", measurementId, {
    anonymize_ip: true,
  });

  analytics.enabled = true;
  analytics.page = function page(path, title) {
    gtag("event", "page_view", {
      page_path: path || window.location.pathname,
      page_title: title || document.title,
    });
  };
  analytics.track = function track(eventName, params) {
    if (!eventName) return;
    gtag("event", eventName, params || {});
  };

  window.BKAnalytics = analytics;
})();

(function sxswCallout() {
  if (window.location.pathname.endsWith("/calendar-view.html")) return;
  if (window.location.pathname.endsWith("/map-view.html")) return;

  const expireAtUtcMs = Date.parse("2026-03-15T17:00:00Z"); // 1:00 PM America/New_York
  if (Number.isNaN(expireAtUtcMs) || Date.now() >= expireAtUtcMs) return;

  const mainHeadline = document.querySelector("#main-headline");
  const topBar = document.querySelector(".top-bar");
  if (!mainHeadline || !topBar || !topBar.parentElement) return;

  const styleId = "sxsw-callout-style";
  if (!document.getElementById(styleId)) {
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      .sxsw-callout {
        display: flex;
        align-items: center;
        gap: 16px;
        margin: 0 0 12px;
        border: 1px solid #d6c68b;
        border-radius: 12px;
        background: #efe1ac;
        color: #171717;
        padding: 14px 16px;
        line-height: 1.35;
        overflow: hidden;
      }
      .sxsw-callout-body {
        flex: 1;
        min-width: 0;
      }
      .sxsw-callout-flyer {
        flex: 0 0 auto;
        width: 130px;
      }
      .sxsw-callout-flyer img {
        width: 100%;
        border-radius: 6px;
        display: block;
        cursor: pointer;
        box-shadow: 0 2px 10px rgba(0,0,0,0.18);
      }
      .sxsw-callout-label {
        margin: 0 0 4px;
        font-size: 14px;
        font-weight: 700;
        letter-spacing: 0.02em;
        text-transform: uppercase;
      }
      .sxsw-callout-title {
        margin: 0 0 6px;
        font-size: clamp(20px, 2.8vw, 32px);
        font-weight: 700;
        line-height: 1.05;
        text-transform: uppercase;
      }
      .sxsw-callout-copy {
        margin: 0 0 4px;
        font-size: clamp(13px, 1.6vw, 18px);
      }
      .sxsw-callout-meta {
        margin: 0 0 4px;
        font-size: clamp(13px, 1.6vw, 18px);
      }
      .sxsw-callout-host {
        margin: 0 0 10px;
        font-size: clamp(13px, 1.6vw, 18px);
      }
      .sxsw-callout-host a {
        color: inherit;
      }
      .sxsw-location-badge {
        display: inline-block;
        background: #ff5c00;
        color: #ffffff;
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        border-radius: 4px;
        padding: 2px 6px;
        vertical-align: middle;
      }
      .sxsw-callout-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 2px;
      }
      .sxsw-callout-btn {
        display: inline-flex;
        align-items: center;
        font-size: 12px;
        font-weight: 500;
        font-family: inherit;
        text-decoration: none;
        padding: 6px 14px;
        border: 1px solid #999;
        border-radius: 10px;
        background: #fff;
        color: #171717;
        cursor: pointer;
        line-height: 1.4;
      }
      .sxsw-callout-btn:hover {
        background: #171717;
        color: #fff;
        border-color: #171717;
      }
      .sxsw-callout-btn--primary {
        background: #171717;
        color: #fff;
        border-color: #171717;
      }
      .sxsw-callout-btn--primary:hover {
        background: #333;
        border-color: #333;
      }
      @media (max-width: 640px) {
        .sxsw-callout {
          margin-bottom: 10px;
          border-radius: 10px;
          padding: 12px;
        }
        .sxsw-callout-title {
          font-size: 20px;
        }
        .sxsw-callout-copy,
        .sxsw-callout-meta,
        .sxsw-callout-host {
          font-size: 11px;
          line-height: 1.3;
        }
        .sxsw-callout-flyer {
          width: 90px;
        }
      }
    `;
    document.head.append(style);
  }

  const callout = document.createElement("aside");
  callout.className = "sxsw-callout";
  callout.setAttribute("role", "status");
  callout.innerHTML = `
    <div class="sxsw-callout-body">
      <p class="sxsw-callout-label">Special Announcement · <span class="sxsw-location-badge">New Locaish</span></p>
      <h2 class="sxsw-callout-title">SXSW Pop-Up Breakfast Club</h2>
      <p class="sxsw-callout-copy">Announcing a pop-up BKFST CLUB in Austin during SXSW. Everyone's invited, especially you.</p>
      <p class="sxsw-callout-meta">Sunday, Mar 15, 8:30 AM CDT · Nate's Baked Goods &amp; Coffee, 401 W 18th St, Austin, TX</p>
      <p class="sxsw-callout-host">Host contact: <a href="https://www.instagram.com/erickorsh/" target="_blank" rel="noreferrer">Eric Korsh</a></p>
      <div class="sxsw-callout-actions">
        <a class="sxsw-callout-btn" href="https://www.google.com/maps/search/?api=1&query=Nate%27s+Baked+Goods+%26+Coffee%2C+401+W+18th+St%2C+Austin%2C+TX" target="_blank" rel="noreferrer">Google Maps</a>
        <button class="sxsw-callout-btn sxsw-callout-btn--primary" data-flyer-url="./assets/SXSW_2026-3-15.png" type="button">View Flyer</button>
      </div>
    </div>
  `;

  callout.querySelectorAll("[data-flyer-url]").forEach((el) => {
    el.addEventListener("click", () => {
      if (typeof window.openFlyerLightbox === "function") {
        window.openFlyerLightbox("./assets/SXSW_2026-3-15.png", "Austin");
      }
    });
  });
  // Always insert above the "X clubs worldwide" top bar in the main pane.
  // CSS handles sizing at each breakpoint — no JS matchMedia needed.
  topBar.parentElement.insertBefore(callout, topBar);
})();
