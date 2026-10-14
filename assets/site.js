(function () {
  "use strict";
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Landing position: every page opens at its top, and a link to a section
     (impact.html#parks) opens exactly at that section, below the sticky header.
     scrollIntoView also moves any frame the site is shown inside, such as a preview window. */
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  function landingTarget() {
    var id = window.location.hash ? decodeURIComponent(window.location.hash.slice(1)) : "";
    return id ? document.getElementById(id) : null;
  }
  function land() {
    var target = landingTarget();
    if (target) {
      var closed = target.closest && target.closest("details:not([open])");
      if (closed) closed.open = true;
      target.scrollIntoView({ block: "start", behavior: "instant" });
    } else {
      document.body.scrollIntoView({ block: "start", behavior: "instant" });
      window.scrollTo(0, 0);
    }
  }
  land();
  /* Re-check after photos and fonts finish loading, in case the layout shifted */
  window.addEventListener("load", function () { if (landingTarget()) land(); });
  window.addEventListener("pageshow", function (e) { if (e.persisted) land(); });

  /* Opening screen (home page, once per visit) */
  var intro = document.getElementById("intro");
  if (intro && !intro.hidden) {
    var finished = false;
    var outTimer = null;
    function finish() {
      if (finished) return;
      finished = true;
      clearTimeout(outTimer);
      intro.classList.add("intro--out");
      document.documentElement.classList.remove("intro-on");
      setTimeout(function () { intro.hidden = true; }, reduceMotion ? 50 : 700);
      document.removeEventListener("keydown", finish);
      intro.removeEventListener("click", finish);
    }
    function go() {
      if (finished) return;
      intro.classList.add("intro--go");
      outTimer = setTimeout(finish, reduceMotion ? 900 : 1800);
    }
    document.addEventListener("keydown", finish);
    intro.addEventListener("click", finish);
    var started = false;
    function startOnce() { if (!started) { started = true; go(); } }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(startOnce);
    setTimeout(startOnce, 700);
  }

  /* Header: border once the page scrolls */
  var header = document.querySelector(".site-header");
  function onScroll() { if (header) header.classList.toggle("is-scrolled", window.scrollY > 8); }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* Mobile menu */
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.getElementById("site-nav");
  function setMenu(open) {
    if (!toggle || !nav) return;
    toggle.setAttribute("aria-expanded", String(open));
    nav.setAttribute("data-open", String(open));
    toggle.querySelector(".label").textContent = open ? "Close" : "Menu";
  }
  function syncMenuToWidth() {
    if (!nav) return;
    if (window.matchMedia("(max-width: 920px)").matches) {
      if (toggle.getAttribute("aria-expanded") !== "true") nav.setAttribute("data-open", "false");
    } else {
      nav.removeAttribute("data-open");
      toggle.setAttribute("aria-expanded", "false");
    }
  }
  if (toggle && nav) {
    toggle.addEventListener("click", function () { setMenu(toggle.getAttribute("aria-expanded") !== "true"); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") { setMenu(false); toggle.focus(); }
    });
    window.addEventListener("resize", syncMenuToWidth);
    syncMenuToWidth();
  }

  /* Tabs (WAI-ARIA pattern with arrow keys) */
  document.querySelectorAll("[data-tabs]").forEach(function (root) {
    var tabs = Array.prototype.slice.call(root.querySelectorAll('[role="tab"]'));
    function select(tab, focus) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute("aria-selected", String(on));
        t.tabIndex = on ? 0 : -1;
        var panel = document.getElementById(t.getAttribute("aria-controls"));
        if (panel) panel.hidden = !on;
      });
      if (focus) tab.focus();
    }
    tabs.forEach(function (tab, i) {
      tab.addEventListener("click", function () { select(tab, false); });
      tab.addEventListener("keydown", function (e) {
        var next = null;
        if (e.key === "ArrowDown" || e.key === "ArrowRight") next = tabs[(i + 1) % tabs.length];
        if (e.key === "ArrowUp" || e.key === "ArrowLeft") next = tabs[(i - 1 + tabs.length) % tabs.length];
        if (e.key === "Home") next = tabs[0];
        if (e.key === "End") next = tabs[tabs.length - 1];
        if (next) { e.preventDefault(); select(next, true); }
      });
    });
  });

  /* Count-up numbers. The final value is in the HTML, so the page reads correctly without script. */
  var counters = document.querySelectorAll("[data-count]");
  if (counters.length && !reduceMotion && "IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        io.unobserve(el);
        var target = parseFloat(el.getAttribute("data-count"));
        var suffix = el.getAttribute("data-suffix") || "";
        var prefix = el.getAttribute("data-prefix") || "";
        var start = null;
        function frame(ts) {
          if (start === null) start = ts;
          var p = Math.min((ts - start) / 1200, 1);
          var eased = 1 - Math.pow(1 - p, 3);
          el.textContent = prefix + Math.round(target * eased).toLocaleString("en-US") + suffix;
          if (p < 1) requestAnimationFrame(frame);
        }
        requestAnimationFrame(frame);
      });
    }, { threshold: 0.6 });
    counters.forEach(function (c) { io.observe(c); });
  }

  /* Work filters */
  var filterRoot = document.querySelector("[data-filters]");
  if (filterRoot) {
    var chips = Array.prototype.slice.call(filterRoot.querySelectorAll(".chip"));
    var items = Array.prototype.slice.call(document.querySelectorAll("[data-tags]"));
    var count = document.getElementById("result-count");
    function applyFilter(value) {
      var shown = 0;
      items.forEach(function (item) {
        var match = value === "all" || item.getAttribute("data-tags").split(" ").indexOf(value) !== -1;
        item.hidden = !match;
        if (match) shown++;
      });
      chips.forEach(function (c) { c.setAttribute("aria-pressed", String(c.getAttribute("data-filter") === value)); });
      if (count) count.textContent = "Showing " + shown + " of " + items.length + " projects";
    }
    chips.forEach(function (chip) {
      chip.addEventListener("click", function () { applyFilter(chip.getAttribute("data-filter")); });
    });
    applyFilter("all");
  }

  /* Copy buttons */
  document.querySelectorAll("[data-copy]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var source = document.getElementById(btn.getAttribute("data-copy"));
      var status = document.getElementById(btn.getAttribute("data-status"));
      if (!source) return;
      var text = source.innerText.trim();
      function done(msg) { if (status) status.textContent = msg; }
      function selectText() {
        var range = document.createRange();
        range.selectNodeContents(source);
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        done("Text selected. Press Ctrl+C or Cmd+C to copy.");
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () { done("Copied."); }, selectText);
      } else { selectText(); }
    });
  });

  /* Video placeholders */
  document.querySelectorAll("[data-video-placeholder]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var status = document.getElementById(btn.getAttribute("aria-describedby"));
      if (status) status.textContent = "Video coming soon. Captions will be included.";
    });
  });

  /* Contact form */
  var form = document.getElementById("contact-form");
  if (form) {
    var status = document.getElementById("form-status");
    function setError(field, msg) {
      var err = document.getElementById(field.id + "-error");
      if (msg) {
        field.setAttribute("aria-invalid", "true");
        if (err) { err.textContent = msg; err.hidden = false; }
      } else {
        field.removeAttribute("aria-invalid");
        if (err) { err.textContent = ""; err.hidden = true; }
      }
    }
    function validate() {
      var errors = [];
      var name = form.querySelector("#name");
      var email = form.querySelector("#email");
      var message = form.querySelector("#message");
      if (!name.value.trim()) { setError(name, "Enter your name."); errors.push(name); } else setError(name);
      if (!email.value.trim()) { setError(email, "Enter your email address."); errors.push(email); }
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) { setError(email, "Enter an email address like name@organization.org."); errors.push(email); }
      else setError(email);
      if (message.value.trim().length < 10) { setError(message, "Tell me a little about what you're working on (at least a sentence)."); errors.push(message); } else setError(message);
      return errors;
    }
    ["name", "email", "message"].forEach(function (id) {
      var el = form.querySelector("#" + id);
      el.addEventListener("blur", function () { if (el.getAttribute("aria-invalid") === "true") validate(); });
    });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var errors = validate();
      status.hidden = false;
      if (errors.length) {
        status.setAttribute("data-state", "error");
        status.textContent = errors.length === 1 ? "One field needs attention before sending." : errors.length + " fields need attention before sending.";
        errors[0].focus();
        return;
      }
      /* Launch: send FormData to the form endpoint (a Cloudflare Pages Function or a form service) here. */
      status.setAttribute("data-state", "success");
      var first = form.querySelector("#name").value.trim().split(" ")[0];
      status.textContent = "Thank you, " + first + ". Your message is ready. I reply within two business days.";
      form.reset();
      status.focus();
    });
  }

  /* Preselect an interest from a link like contact.html?topic=speaking */
  try {
    var topic = new URLSearchParams(window.location.search).get("topic");
    var box = topic && document.getElementById("interest-" + topic.replace(/[^a-z]/g, ""));
    if (box) box.checked = true;
  } catch (e) { /* no query string available */ }

  var year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());
})();
