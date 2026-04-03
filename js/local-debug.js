(function () {
  var isLocalHost = /^(localhost|127\.0\.0\.1)$/i.test(window.location.hostname);
  var config = window.BK_LOCAL_DEBUG;

  if (!isLocalHost || !config) return;

  var stamp = document.createElement("aside");
  stamp.className = "local-debug-stamp";
  stamp.innerHTML =
    '<strong>Local Debug</strong>' +
    '<span><b>Repo:</b> ' + escapeHtml(config.repoPath || "") + "</span>" +
    '<span><b>Branch:</b> ' + escapeHtml(config.branch || "") + "</span>" +
    '<span><b>Commit:</b> ' + escapeHtml(config.commit || "") + "</span>" +
    '<span><b>Live Check:</b> ' + escapeHtml(config.liveStatus || "") + "</span>";

  document.body.appendChild(stamp);

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
})();
