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
