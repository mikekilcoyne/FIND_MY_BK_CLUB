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
  if (!mainHeadline || !mainHeadline.parentElement) return;

  const styleId = "sxsw-callout-style";
  if (!document.getElementById(styleId)) {
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      .sxsw-callout {
        margin: 0 0 12px;
        border: 1px solid #d6c68b;
        border-radius: 12px;
        background: #efe1ac;
        color: #171717;
        padding: 14px 16px;
        line-height: 1.35;
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
      .sxsw-callout-map {
        display: inline-block;
        text-decoration: none;
        border: 2px solid #7d7d7d;
        border-radius: 8px;
        color: #222222;
        background: #f3f3f3;
        padding: 6px 14px;
        font-size: 14px;
        line-height: 1;
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
        .sxsw-callout-map {
          font-size: 14px;
          padding: 6px 12px;
        }
      }
    `;
    document.head.append(style);
  }

  const callout = document.createElement("aside");
  callout.className = "sxsw-callout";
  callout.setAttribute("role", "status");
  callout.innerHTML = `
    <p class="sxsw-callout-label">Special Announcement</p>
    <h2 class="sxsw-callout-title">SXSW Pop-Up Breakfast Club</h2>
    <p class="sxsw-callout-copy">Announcing a pop-up BKFST CLUB in Austin during SXSW. Everyone's invited, especially you.</p>
    <p class="sxsw-callout-meta">Sunday, Mar 15, 8:30 AM CDT · The Better Half Bar, 406 Walsh St, Austin, TX</p>
    <p class="sxsw-callout-host">Host contact: <a href="https://www.instagram.com/kor.sh/" target="_blank" rel="noreferrer">Eric Korsh</a></p>
    <a class="sxsw-callout-map" href="https://www.google.com/maps/search/?api=1&query=The+Better+Half+Bar%2C+406+Walsh+St%2C+Austin%2C+TX" target="_blank" rel="noreferrer">Google Maps</a>
  `;
  mainHeadline.insertAdjacentElement("afterend", callout);
})();

(function removeDesktopHeaderCta() {
  if (window.location.pathname.endsWith("/calendar-view.html")) return;
  if (window.location.pathname.endsWith("/map-view.html")) return;
  const headerCta = document.querySelector(".top-bar .cta");
  if (headerCta) {
    headerCta.remove();
  }
})();
