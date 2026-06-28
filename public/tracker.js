/*!
 * Vylora X analytics tracker — cookieless, privacy-first, < 3KB gzipped.
 * Embed:  <script defer data-site="SITE_ID" src="https://portal.vylorax.com/tracker.js"></script>
 *
 * Design goals:
 *  - Never break the host site: every path is wrapped so failures are silent.
 *  - No cookies, no localStorage identifiers; only a per-tab sessionStorage id.
 *  - SPA-aware: pushState/replaceState/popstate register as page views.
 *  - Reliable session duration via heartbeats + a sendBeacon on page hide.
 */
(function () {
  "use strict";
  try {
    var script = document.currentScript;
    if (!script) return;

    var siteId = script.getAttribute("data-site");
    if (!siteId) return;

    // Derive the ingestion endpoint from the script's own origin so the snippet
    // is copy-paste portable across hosts.
    var endpoint;
    try {
      endpoint = new URL(script.src).origin + "/api/collect";
    } catch (e) {
      return;
    }

    // Respect Do Not Track.
    if (navigator.doNotTrack === "1" || window.doNotTrack === "1") return;
    // Skip local development hosts.
    var host = location.hostname;
    if (host === "localhost" || host === "127.0.0.1" || host === "") {
      // still allow if explicitly opted in via data-track-localhost
      if (script.getAttribute("data-track-localhost") !== "true") return;
    }

    var SESSION_KEY = "vx_sid";
    var SESSION_TS_KEY = "vx_sid_ts";
    var SESSION_TTL = 30 * 60 * 1000; // 30 min inactivity window
    var startedAt = Date.now();
    var lastPath = null;

    function uid() {
      try {
        return (
          Date.now().toString(36) +
          Math.random().toString(36).slice(2, 10)
        );
      } catch (e) {
        return String(Date.now());
      }
    }

    // Per-tab session id stored in sessionStorage; rotates after 30 min idle.
    function sessionId() {
      try {
        var now = Date.now();
        var id = sessionStorage.getItem(SESSION_KEY);
        var ts = parseInt(sessionStorage.getItem(SESSION_TS_KEY) || "0", 10);
        if (!id || !ts || now - ts > SESSION_TTL) {
          id = uid();
          sessionStorage.setItem(SESSION_KEY, id);
          startedAt = now;
        }
        sessionStorage.setItem(SESSION_TS_KEY, String(now));
        return id;
      } catch (e) {
        // sessionStorage may be unavailable (privacy mode); fall back to memory.
        if (!window.__vx_mem_sid) window.__vx_mem_sid = uid();
        return window.__vx_mem_sid;
      }
    }

    function utm() {
      var p = {};
      try {
        var q = new URLSearchParams(location.search);
        p.utmSource = q.get("utm_source");
        p.utmMedium = q.get("utm_medium");
        p.utmCampaign = q.get("utm_campaign");
      } catch (e) {}
      return p;
    }

    function basePayload() {
      var u = utm();
      return {
        siteId: siteId,
        path: location.pathname || "/",
        referrer: document.referrer || null,
        utmSource: u.utmSource || null,
        utmMedium: u.utmMedium || null,
        utmCampaign: u.utmCampaign || null,
        screenWidth: window.screen ? window.screen.width : null,
        language: navigator.language || null,
        sessionId: sessionId(),
      };
    }

    function send(payload) {
      try {
        var body = JSON.stringify(payload);
        if (navigator.sendBeacon) {
          var blob = new Blob([body], { type: "application/json" });
          if (navigator.sendBeacon(endpoint, blob)) return;
        }
        // Fallback for browsers without sendBeacon or when it returns false.
        fetch(endpoint, {
          method: "POST",
          body: body,
          headers: { "Content-Type": "application/json" },
          keepalive: true,
          mode: "cors",
          credentials: "omit",
        }).catch(function () {});
      } catch (e) {}
    }

    function pageview() {
      // Avoid duplicate views for the same path (SPA frameworks often fire
      // multiple navigation events for one route change).
      if (location.pathname === lastPath) return;
      lastPath = location.pathname;
      startedAt = Date.now();
      var p = basePayload();
      p.type = "pageview";
      send(p);
    }

    function heartbeat() {
      var p = basePayload();
      p.type = "heartbeat";
      p.durationMs = Date.now() - startedAt;
      send(p);
    }

    function sessionEnd() {
      var p = basePayload();
      p.type = "session_end";
      p.durationMs = Date.now() - startedAt;
      send(p);
    }

    // --- SPA route change hooks ------------------------------------------
    function hook(name) {
      var orig = history[name];
      if (typeof orig !== "function") return;
      history[name] = function () {
        var ret = orig.apply(this, arguments);
        try {
          window.dispatchEvent(new Event("vx:locationchange"));
        } catch (e) {}
        return ret;
      };
    }
    hook("pushState");
    hook("replaceState");
    window.addEventListener("popstate", function () {
      window.dispatchEvent(new Event("vx:locationchange"));
    });
    window.addEventListener("vx:locationchange", function () {
      pageview();
    });

    // --- Session duration -------------------------------------------------
    var hbTimer = setInterval(heartbeat, 30 * 1000); // 30s heartbeats

    function onHide() {
      if (document.visibilityState === "hidden") sessionEnd();
    }
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", sessionEnd);

    // Clean up the interval when the tab is being unloaded.
    window.addEventListener("pagehide", function () {
      clearInterval(hbTimer);
    });

    // --- Error & component monitoring (RUM) -------------------------------
    // Surfaces real-user failures so the portal's Uptime page can show when the
    // site — or a third-party component it depends on — is misbehaving. Capped
    // per page so a broken dependency can't flood the ingestion endpoint.
    var MAX_ERRORS = 15;
    var errorsSent = 0;

    function hostOf(url) {
      try {
        return new URL(url, location.href).hostname || null;
      } catch (e) {
        return null;
      }
    }

    function reportError(kind, errHost, message) {
      try {
        if (errorsSent >= MAX_ERRORS) return;
        errorsSent++;
        var p = basePayload();
        p.type = "error";
        p.errorKind = kind;
        p.errorHost = errHost || null;
        p.errorMessage = message ? String(message).slice(0, 480) : null;
        send(p);
      } catch (e) {}
    }

    // Failed resource loads (img/script/link/...). Resource error events don't
    // bubble, so we listen in the capture phase.
    window.addEventListener(
      "error",
      function (e) {
        try {
          var t = e && e.target;
          if (t && t !== window && (t.src || t.href)) {
            var url = t.src || t.href;
            reportError(
              "resource",
              hostOf(url),
              (t.tagName || "resource") + " failed to load: " + url,
            );
          }
        } catch (err) {}
      },
      true,
    );

    // Uncaught JS errors and unhandled promise rejections.
    window.addEventListener("error", function (e) {
      try {
        if (e && e.message) reportError("js", null, e.message);
      } catch (err) {}
    });
    window.addEventListener("unhandledrejection", function (e) {
      try {
        var r = e && e.reason;
        reportError("js", null, r && r.message ? r.message : String(r));
      } catch (err) {}
    });

    // Wrap fetch to catch failed calls to the components the site relies on
    // (network errors or 5xx). Our own ingestion endpoint is never reported on,
    // so a failing beacon can't trigger a self-perpetuating loop.
    try {
      if (typeof window.fetch === "function") {
        var origFetch = window.fetch;
        window.fetch = function (input) {
          var url =
            typeof input === "string"
              ? input
              : input && input.url
                ? input.url
                : "";
          if (url && endpoint && url.indexOf(endpoint) === 0) {
            return origFetch.apply(this, arguments);
          }
          return origFetch.apply(this, arguments).then(
            function (res) {
              try {
                if (res && res.status >= 500) {
                  reportError("fetch", hostOf(url), "HTTP " + res.status + ": " + url);
                }
              } catch (e) {}
              return res;
            },
            function (err) {
              try {
                reportError("fetch", hostOf(url), "Network request failed: " + url);
              } catch (e) {}
              throw err;
            },
          );
        };
      }
    } catch (e) {}

    // --- Initial view -----------------------------------------------------
    pageview();
  } catch (e) {
    // Absolutely never throw into the host page.
  }
})();
