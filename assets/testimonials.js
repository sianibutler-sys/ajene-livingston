(function () {
  "use strict";

  /* ---------- Share-a-testimonial form (share.html) ---------- */
  var form = document.getElementById("testimonial-form");
  if (form) {
    var MAX_BYTES = 5 * 1024 * 1024;
    var status = document.getElementById("t-status");
    var quote = document.getElementById("t-quote");
    var count = document.getElementById("t-quote-count");

    quote.addEventListener("input", function () {
      count.textContent = quote.value.length.toLocaleString("en-US") + " of 1,500 characters";
    });

    function setError(id, msg, field) {
      var err = document.getElementById(id);
      if (field) { if (msg) field.setAttribute("aria-invalid", "true"); else field.removeAttribute("aria-invalid"); }
      if (err) { err.textContent = msg || ""; err.hidden = !msg; }
    }

    function checkFile(input, errId) {
      var f = input.files && input.files[0];
      if (!f) { setError(errId, "", input); return true; }
      if (f.size > MAX_BYTES) { setError(errId, "This file is larger than 5 MB. Choose a smaller image.", input); return false; }
      if (!/^image\//.test(f.type)) { setError(errId, "Choose an image file (JPG, PNG, WebP, or SVG).", input); return false; }
      setError(errId, "", input); return true;
    }

    function validate() {
      var bad = [];
      var name = form.querySelector("#t-name");
      var email = form.querySelector("#t-email");
      var sig = form.querySelector("#t-signature");
      var consent = form.querySelector("#t-consent");
      var uses = form.querySelectorAll('input[name="uses"]:checked');

      if (!name.value.trim()) { setError("t-name-error", "Enter your full name.", name); bad.push(name); } else setError("t-name-error", "", name);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) { setError("t-email-error", "Enter an email address like name@organization.org.", email); bad.push(email); } else setError("t-email-error", "", email);
      if (quote.value.trim().length < 20) { setError("t-quote-error", "Write at least a sentence about working together.", quote); bad.push(quote); } else setError("t-quote-error", "", quote);
      if (!checkFile(form.querySelector("#t-photo"), "t-photo-error")) bad.push(form.querySelector("#t-photo"));
      if (!checkFile(form.querySelector("#t-logo"), "t-logo-error")) bad.push(form.querySelector("#t-logo"));
      if (!uses.length) { setError("t-uses-error", "Choose at least one place your words can be used."); bad.push(form.querySelector("#t-use-web")); } else setError("t-uses-error", "");
      if (!consent.checked) { setError("t-consent-error", "Check the box to give permission.", consent); bad.push(consent); } else setError("t-consent-error", "", consent);
      if (!sig.value.trim()) { setError("t-signature-error", "Type your full name to sign.", sig); bad.push(sig); } else setError("t-signature-error", "", sig);
      return bad;
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (form.querySelector("#t-website-check").value) return; /* bot */
      var bad = validate();
      status.hidden = false;
      if (bad.length) {
        status.setAttribute("data-state", "error");
        status.textContent = bad.length === 1 ? "One field needs attention before sending." : bad.length + " fields need attention before sending.";
        bad[0].focus();
        return;
      }
      var data = new FormData(form);
      data.append("consent_text", document.getElementById("consent-text").textContent.trim());
      var btn = document.getElementById("t-submit");
      btn.disabled = true;
      status.removeAttribute("data-state");
      status.textContent = "Sending…";

      fetch("/api/testimonial", { method: "POST", body: data })
        .then(function (res) { return res.json().catch(function () { return {}; }).then(function (body) { return { ok: res.ok, body: body }; }); })
        .then(function (r) {
          if (!r.ok) throw new Error(r.body && r.body.error ? r.body.error : "send failed");
          var first = form.querySelector("#t-name").value.trim().split(" ")[0];
          var thanks = document.createElement("div");
          thanks.className = "thanks";
          thanks.setAttribute("tabindex", "-1");
          var h = document.createElement("h2");
          h.textContent = "Thank you, " + first + ".";
          var p = document.createElement("p");
          p.textContent = "Your words reached me. I'll be in touch if I'd like to shorten anything, and nothing appears anywhere you didn't approve.";
          thanks.appendChild(h); thanks.appendChild(p);
          form.replaceWith(thanks);
          thanks.focus();
        })
        .catch(function (err) {
          btn.disabled = false;
          status.setAttribute("data-state", "error");
          status.textContent = /send failed|Failed to fetch|NetworkError|Load failed/i.test(err.message)
            ? "Your testimonial couldn't be sent right now. Please try again in a few minutes."
            : err.message;
          status.focus();
        });
    });
  }

  /* ---------- Published testimonials on the site ---------- */
  var mount = document.querySelector("[data-testimonials]");
  if (!mount) return;
  var page = mount.getAttribute("data-testimonials");

  var strict = mount.hasAttribute("data-strict");
  var section = mount.closest("[data-testimonials-section]");
  fetch("/api/testimonials?page=" + encodeURIComponent(page) + (strict ? "&strict=1" : ""))
    .then(function (res) { if (!res.ok) throw new Error(); return res.json(); })
    .then(function (data) {
      var items = (data && data.testimonials) || [];
      if (!items.length) return; /* keep the placeholder, or keep a strict section hidden */
      if (section) section.hidden = false;
      render(items);
    })
    .catch(function () { /* no API in preview: keep the placeholder */ });

  function render(items) {
    var i = 0;
    mount.innerHTML = "";
    var wrap = document.createElement("div");
    wrap.className = "t-slider";
    var slide = document.createElement("figure");
    slide.className = "t-slide";
    slide.style.margin = "0";
    slide.setAttribute("aria-live", "polite");
    wrap.appendChild(slide);

    function show(n) {
      var t = items[n];
      slide.innerHTML = "";
      if (t.photo) {
        var img = document.createElement("img");
        img.className = "t-slide__photo"; img.src = t.photo; img.alt = t.name ? "Photo of " + t.name : ""; img.width = 88; img.height = 88;
        slide.appendChild(img);
      }
      var body = document.createElement("div");
      var bq = document.createElement("blockquote");
      bq.style.margin = "0";
      bq.style.fontFamily = "var(--font-display)";
      bq.style.fontSize = t.quote.length > 320 ? "var(--step-1)" : t.quote.length > 160 ? "var(--step-2)" : "var(--step-3)";
      bq.style.lineHeight = "1.2";
      var q = document.createElement("p"); q.textContent = t.quote; q.style.maxWidth = "none";
      bq.appendChild(q);
      var cap = document.createElement("figcaption");
      cap.style.marginTop = "1rem"; cap.style.color = "var(--muted)";
      cap.textContent = t.attribution;
      body.appendChild(bq); body.appendChild(cap);
      if (t.logo) {
        var logo = document.createElement("img");
        logo.className = "t-slide__logo"; logo.src = t.logo; logo.alt = t.organization ? t.organization + " logo" : "";
        body.appendChild(logo);
      }
      slide.appendChild(body);
      if (counter) counter.textContent = (n + 1) + " of " + items.length;
    }

    var counter = null;
    if (items.length > 1) {
      var controls = document.createElement("div");
      controls.className = "t-controls";
      var prev = document.createElement("button"); prev.type = "button"; prev.setAttribute("aria-label", "Previous testimonial"); prev.textContent = "←";
      var next = document.createElement("button"); next.type = "button"; next.setAttribute("aria-label", "Next testimonial"); next.textContent = "→";
      counter = document.createElement("span"); counter.className = "t-count";
      prev.addEventListener("click", function () { i = (i - 1 + items.length) % items.length; show(i); });
      next.addEventListener("click", function () { i = (i + 1) % items.length; show(i); });
      controls.appendChild(prev); controls.appendChild(next); controls.appendChild(counter);
      wrap.appendChild(controls);
    }
    mount.appendChild(wrap);
    show(0);
  }
})();
