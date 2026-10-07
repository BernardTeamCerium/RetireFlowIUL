(function () {
  "use strict";

  // ---- Capture UTM / landing data into every lead form -------------------
  var params = new URLSearchParams(window.location.search);
  var utmKeys = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];
  var stored = {};
  try { stored = JSON.parse(sessionStorage.getItem("rf_utm") || "{}"); } catch (e) {}
  utmKeys.forEach(function (k) { if (params.get(k)) stored[k] = params.get(k); });
  if (!stored.landing_page) stored.landing_page = window.location.href;
  try { sessionStorage.setItem("rf_utm", JSON.stringify(stored)); } catch (e) {}

  document.querySelectorAll("form.js-lead-form").forEach(function (form) {
    Object.keys(stored).forEach(function (k) {
      var input = form.querySelector('input[name="' + k + '"]');
      if (input) input.value = stored[k];
    });
    form.addEventListener("submit", onSubmit);
  });

  // ---- Light phone formatting ---------------------------------------------
  var phone = document.getElementById("phone");
  if (phone) {
    phone.addEventListener("input", function () {
      var d = phone.value.replace(/\D/g, "").replace(/^1/, "").slice(0, 10);
      if (d.length > 6) phone.value = "(" + d.slice(0, 3) + ") " + d.slice(3, 6) + "-" + d.slice(6);
      else if (d.length > 3) phone.value = "(" + d.slice(0, 3) + ") " + d.slice(3);
      else phone.value = d;
    });
  }

  function errorEl(form) {
    return form.querySelector(".form-error") || (form.nextElementSibling && form.nextElementSibling.classList.contains("form-error") ? form.nextElementSibling : null);
  }

  function showError(form, msg) {
    var el = errorEl(form);
    if (el) { el.textContent = msg; el.classList.add("show"); }
  }

  function onSubmit(e) {
    var form = e.currentTarget;
    e.preventDefault();
    var err = errorEl(form);
    if (err) err.classList.remove("show");

    if (!form.checkValidity()) {
      var firstBad = form.querySelector(":invalid");
      var msg = "Please complete all required fields.";
      if (firstBad && firstBad.name === "email") msg = "Please enter a valid email address.";
      if (firstBad && firstBad.name === "phone") msg = "Please enter a valid 10-digit phone number.";
      if (firstBad && firstBad.name === "consent") msg = "Please check the consent box so a licensed professional can contact you.";
      showError(form, msg);
      if (firstBad) firstBad.focus();
      return;
    }

    var btn = form.querySelector('button[type="submit"]');
    var label = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Sending…";

    var data = new FormData(form);
    var body = new URLSearchParams(data).toString();
    try {
      sessionStorage.setItem("rf_first_name", data.get("first_name") || "");
      sessionStorage.setItem("rf_auto_download", "1"); // the next page starts the guide download
    } catch (e2) {}

    fetch("/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body
    })
      .then(function (res) {
        if (!res.ok) throw new Error("Status " + res.status);
        if (window.dataLayer) window.dataLayer.push({ event: "lead_submit", form_name: data.get("form-name") });
        window.location.href = form.getAttribute("action");
      })
      .catch(function () {
        btn.disabled = false;
        btn.textContent = label;
        showError(form, "Something went wrong sending your request. Please try again in a moment.");
      });
  }

  // ---- Reveal on scroll ---------------------------------------------------
  var reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px" });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("in"); });
  }

  // ---- Sticky mobile CTA (hidden while the main form is on screen) --------
  var mobileCta = document.querySelector(".mobile-cta");
  var formCard = document.getElementById("get-started");
  if (mobileCta && formCard && "IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      var formVisible = entries[0].isIntersecting;
      mobileCta.classList.toggle("show", !formVisible && window.scrollY > 400);
    }).observe(formCard);
    window.addEventListener("scroll", function () {
      var r = formCard.getBoundingClientRect();
      var formVisible = r.bottom > 0 && r.top < window.innerHeight;
      mobileCta.classList.toggle("show", !formVisible && window.scrollY > 400);
    }, { passive: true });
  }

  // ---- Personalize thank-you pages ----------------------------------------
  var nameSlot = document.querySelector("[data-first-name]");
  if (nameSlot) {
    var n = "";
    try { n = sessionStorage.getItem("rf_first_name") || ""; } catch (e3) {}
    if (n) nameSlot.textContent = ", " + n.trim().split(" ")[0];
  }

  // ---- Auto-download the guide right after an opt-in -----------------------
  var dl = document.querySelector("[data-auto-download]");
  if (dl) {
    var pending = false;
    try { pending = sessionStorage.getItem("rf_auto_download") === "1"; sessionStorage.removeItem("rf_auto_download"); } catch (e4) {}
    if (pending || new URLSearchParams(window.location.search).get("download") === "1") {
      document.querySelectorAll("[data-download-notice]").forEach(function (el) { el.hidden = false; });
      setTimeout(function () { dl.click(); }, 700);
    }
  }

  document.querySelectorAll("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });
})();
