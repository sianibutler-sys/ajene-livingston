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

    /* ---------- Name preview, draft saving, and the confirmation screen ---------- */
    function val(id) { var el = form.querySelector(id); return el ? el.value.trim() : ""; }
    function stripHonorific(parts) { return parts.length > 1 && /^(dr|mr|mrs|ms|mx|rev|prof)\.?$/i.test(parts[0]) ? parts.slice(1) : parts; }
    function firstName(full) { var parts = stripHonorific(full.split(/\s+/)); return parts[0] || ""; }
    function attributionLine(display, name, title, org, relationship) {
      var parts = stripHonorific(name.split(/\s+/).filter(Boolean));
      var short = parts.length > 1 ? parts[0] + " " + parts[parts.length - 1][0] + "." : name;
      var join = function () { return Array.prototype.filter.call(arguments, Boolean).join(", "); };
      switch (display) {
        case "Full name and organization": return join(name, org);
        case "First name, last initial, and organization": return join(short, org);
        case "Title and organization only": return join(title, org) || "Your title and organization";
        case "Anonymous": return relationship || "Client";
        default: return join(name, title, org);
      }
    }
    function currentLine() {
      return attributionLine(val("#t-display"), val("#t-name"), val("#t-title"), val("#t-org"), val("#t-relationship"));
    }

    var preview = document.getElementById("t-display-preview");
    function updatePreview() { if (preview) preview.textContent = currentLine() || "Add your name above to see a preview."; }
    ["#t-display", "#t-name", "#t-title", "#t-org", "#t-relationship"].forEach(function (id) {
      var el = form.querySelector(id);
      if (el) { el.addEventListener("input", updatePreview); el.addEventListener("change", updatePreview); }
    });

    /* Save a draft in this browser so a long testimonial isn't lost. Files and the signature are never saved. */
    var DRAFT_KEY = "al-testimonial-draft";
    var SKIP = { headshot: 1, logo: 1, signature: 1, consent: 1, website_check: 1 };
    function saveDraft() {
      var d = {};
      Array.prototype.forEach.call(form.elements, function (el) {
        if (!el.name || SKIP[el.name] || el.type === "file") return;
        if (el.type === "checkbox") { (d[el.name] = d[el.name] || []); if (el.checked) d[el.name].push(el.value); }
        else d[el.name] = el.value;
      });
      try { localStorage.setItem(DRAFT_KEY, JSON.stringify(d)); } catch (e) {}
    }
    function clearDraft() { try { localStorage.removeItem(DRAFT_KEY); } catch (e) {} }
    function restoreDraft() {
      var d; try { d = JSON.parse(localStorage.getItem(DRAFT_KEY) || "null"); } catch (e) { d = null; }
      if (!d) return false;
      var any = false;
      Array.prototype.forEach.call(form.elements, function (el) {
        if (!el.name || SKIP[el.name] || el.type === "file" || !(el.name in d)) return;
        if (el.type === "checkbox") el.checked = d[el.name].indexOf(el.value) > -1;
        else { el.value = d[el.name]; if (d[el.name]) any = true; }
      });
      return any;
    }
    if (restoreDraft()) {
      var note = document.getElementById("t-draft-note");
      if (note) {
        note.hidden = false;
        var clear = note.querySelector("button");
        if (clear) clear.addEventListener("click", function () { clearDraft(); form.reset(); note.hidden = true; updatePreview(); quote.dispatchEvent(new Event("input")); });
      }
      quote.dispatchEvent(new Event("input"));
    }
    form.addEventListener("input", saveDraft);
    form.addEventListener("change", saveDraft);
    updatePreview();

    function snapshot() {
      var uses = Array.prototype.map.call(form.querySelectorAll('input[name="uses"]:checked'), function (el) { return el.value; });
      var photo = form.querySelector("#t-photo").files[0];
      var logo = form.querySelector("#t-logo").files[0];
      return {
        first: firstName(val("#t-name")),
        email: val("#t-email"),
        quote: quote.value.trim(),
        line: currentLine(),
        display: val("#t-display"),
        project: val("#t-project"),
        year: val("#t-year"),
        uses: uses,
        edit: form.querySelector("#t-edit").checked,
        photo: photo ? (form.querySelector("#t-show-photo").checked ? "Sent, and shown with your words" : "Sent, but kept private") : "None sent",
        logo: logo ? (form.querySelector("#t-show-logo").checked ? "Sent, and shown with your words" : "Sent, but kept private") : "None sent"
      };
    }

    function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }

    function buildThanks(t, emailed) {
      var box = el("div", "thanks-page");
      box.setAttribute("tabindex", "-1");
      var head = el("div", "thanks");
      head.appendChild(el("h2", null, "Thank you" + (t.first ? ", " + t.first : "") + "."));
      head.appendChild(el("p", null, emailed
        ? "Your words reached me. A copy of everything below is on its way to " + t.email + "."
        : "Your words reached me. Keep this page or save a copy for your records."));
      box.appendChild(head);

      var card = el("section", "receipt");
      card.setAttribute("aria-labelledby", "receipt-title");
      var h = el("h2", "receipt__title", "What you sent"); h.id = "receipt-title";
      card.appendChild(h);
      var fig = el("figure", "receipt__quote");
      var bq = el("blockquote"); bq.appendChild(el("p", null, t.quote));
      fig.appendChild(bq);
      fig.appendChild(el("figcaption", null, t.line));
      card.appendChild(fig);
      var dl = el("dl", "facts");
      function row(k, v) { var d = el("div"); d.appendChild(el("dt", null, k)); d.appendChild(el("dd", null, v)); dl.appendChild(d); }
      row("Your name", t.display);
      if (t.project || t.year) row("Project", [t.project, t.year].filter(Boolean).join(", "));
      row("Can be used on", t.uses.join(", "));
      row("Edits", t.edit ? "OK to shorten for length. Anything more comes back to you first." : "Used exactly as written.");
      row("Headshot", t.photo);
      row("Logo", t.logo);
      card.appendChild(dl);
      box.appendChild(card);

      var next = el("section", "receipt receipt--plain");
      next.appendChild(el("h2", "receipt__title", "What happens next"));
      var ol = el("ol", "next-steps");
      ["I read every testimonial myself. Nothing is published automatically.",
       "If I'd like to shorten anything beyond a trim, I'll check with you first.",
       "Your words appear only where you said yes, with your name shown the way you chose."].forEach(function (s) { var li = el("li"); li.appendChild(el("p", null, s)); ol.appendChild(li); });
      next.appendChild(ol);
      next.appendChild(el("h3", null, "Need to change something?"));
      var p = el("p");
      p.appendChild(document.createTextNode(emailed ? "Reply to the confirmation email, or write to " : "Write to "));
      var a = el("a", null, "hello@ajenelivingston.com");
      a.href = "mailto:hello@ajenelivingston.com?subject=" + encodeURIComponent("Change to my testimonial");
      p.appendChild(a);
      p.appendChild(document.createTextNode(" with the change you'd like: new wording, a different name display, a new photo, or fewer places to use it. You can also withdraw permission at any time, and your words come out of future use."));
      next.appendChild(p);
      var actions = el("div", "actions");
      var print = el("button", "btn btn--small btn--outline", "Print or save a copy"); print.type = "button";
      print.addEventListener("click", function () { window.print(); });
      var home = el("a", "btn btn--small", "Back to the site"); home.href = "index.html";
      actions.appendChild(print); actions.appendChild(home);
      next.appendChild(actions);
      box.appendChild(next);
      return box;
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
          var sent = snapshot();
          clearDraft();
          var thanks = buildThanks(sent, r.body && r.body.emailed);
          form.replaceWith(thanks);
          var aside = document.querySelector(".aside-card");
          if (aside) aside.hidden = true;
          thanks.scrollIntoView({ block: "start" });
          thanks.focus({ preventScroll: true });
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
    mount.innerHTML = "";
    var list = document.createElement("div");
    list.className = "t-wall " + (items.length === 1 ? "t-wall--one" : "t-wall--many");
    if (items.length > 1) { list.setAttribute("role", "list"); }
    items.forEach(function (t) {
      var fig = document.createElement("figure");
      fig.className = "t-card";
      if (items.length > 1) fig.setAttribute("role", "listitem");
      var mark = document.createElement("span");
      mark.className = "t-card__mark"; mark.setAttribute("aria-hidden", "true"); mark.textContent = "\u201C";
      var bq = document.createElement("blockquote");
      bq.className = "t-card__quote" + (t.quote.length > 340 ? " is-long" : t.quote.length > 180 ? " is-mid" : "");
      var q = document.createElement("p"); q.textContent = t.quote; bq.appendChild(q);
      var cap = document.createElement("figcaption");
      cap.className = "t-card__by";
      if (t.photo) {
        var img = document.createElement("img");
        img.className = "t-card__photo"; img.src = t.photo; img.alt = ""; img.width = 56; img.height = 56; img.loading = "lazy";
        cap.appendChild(img);
      }
      var who = document.createElement("span"); who.className = "t-card__who";
      var lead = document.createElement("span"); lead.className = "t-card__name"; lead.textContent = t.lead || t.attribution;
      who.appendChild(lead);
      if (t.detail) { var det = document.createElement("span"); det.className = "t-card__detail"; det.textContent = t.detail; who.appendChild(det); }
      cap.appendChild(who);
      if (t.logo) {
        var logo = document.createElement("img");
        logo.className = "t-card__logo"; logo.src = t.logo; logo.alt = t.organization ? t.organization + " logo" : ""; logo.loading = "lazy";
        cap.appendChild(logo);
      }
      fig.appendChild(mark); fig.appendChild(bq); fig.appendChild(cap);
      list.appendChild(fig);
    });
    mount.appendChild(list);
    var layout = mount.closest(".t-layout");
    if (layout) layout.classList.add(items.length === 1 ? "t-layout--one" : "t-layout--many");
  }
})();
