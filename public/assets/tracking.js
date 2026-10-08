/* ==========================================================================
   Meta (Facebook/Instagram) Pixel
   Paste your Pixel ID below (Meta Events Manager → Data sources → your
   dataset/pixel → the number under its name). Leave it empty to turn
   tracking off.
   ========================================================================== */
var RF_META_PIXEL_ID = "3830130423944375";

(function () {
  "use strict";

  // Remember Meta's click ID (fbclid) from ad clicks so the server-side
  // Conversions API can attribute the lead even if the pixel is blocked.
  try {
    var fbclid = new URLSearchParams(window.location.search).get("fbclid");
    if (fbclid) sessionStorage.setItem("rf_fbc", "fb.1." + Date.now() + "." + fbclid);
  } catch (e) {}

  window.rfTrack = function () {}; // no-op until the pixel is configured
  if (!RF_META_PIXEL_ID) return;

  /* Official Meta Pixel base code */
  !function (f, b, e, v, n, t, s) {
    if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
    if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = "2.0"; n.queue = [];
    t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
  }(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");

  window.fbq("init", RF_META_PIXEL_ID);
  window.fbq("track", "PageView");

  // Standard event with an eventID, so the matching server-side event
  // (sent from netlify/functions/submission-created.mjs) is de-duplicated.
  window.rfTrack = function (eventName, params, eventId) {
    window.fbq("track", eventName, params || {}, eventId ? { eventID: eventId } : undefined);
  };
})();
