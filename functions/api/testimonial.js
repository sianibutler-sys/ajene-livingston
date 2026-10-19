// Cloudflare Pages Function: POST /api/testimonial
// Saves a testimonial submission to Airtable, then uploads the headshot and logo.
// Environment variables (set in Cloudflare Pages > Settings > Variables):
//   AIRTABLE_TOKEN  personal access token with data.records:write on the base
//   AIRTABLE_BASE   appS94tDjvBK7LKPT
//   AIRTABLE_TABLE  tblj1EFi7nbSdH70q

const MAX_BYTES = 5 * 1024 * 1024;
const USES = ["Website", "Social media", "Proposals and grant applications", "Presentations and print materials", "Email and newsletters"];
const DISPLAY = ["Full name, title, and organization", "Full name and organization", "First name, last initial, and organization", "Title and organization only", "Anonymous"];
const RELATIONSHIPS = ["Client", "Community partner", "Board or committee member", "Program participant", "Colleague", "Event host or audience member", "Other"];

// Thank-you email from hello@ajenelivingston.com, sent through Resend.
// Needs RESEND_API_KEY in Cloudflare. Without it, the form still works and no email is sent.
function firstName(full) {
  const parts = String(full || "").trim().split(/\s+/);
  if (parts.length > 1 && /^(dr|mr|mrs|ms|rev|prof)\.?$/i.test(parts[0])) return parts[1];
  return parts[0] || "there";
}
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
async function sendThanks(env, to, subject, paragraphs) {
  if (!env.RESEND_API_KEY || !to) return;
  const sig = ["Ajené Livingston", "ajenelivingston.com"];
  const text = paragraphs.join("\n\n") + "\n\n" + sig.join("\n");
  const html = `<div style="font-family:Georgia,serif;font-size:16px;line-height:1.6;color:#3B2418;max-width:560px">${paragraphs.map((p) => `<p>${esc(p)}</p>`).join("")}<p>${sig.map(esc).join("<br>")}</p></div>`;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({ from: "Ajené Livingston <hello@ajenelivingston.com>", to: [to], reply_to: "hello@ajenelivingston.com", subject, text, html }),
  });
  if (!res.ok) console.log("thank-you email failed", res.status, await res.text());
}

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

const text = (v, max = 500) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const url = (v) => { const t = text(v, 500); return /^https?:\/\/\S+$/i.test(t) ? t : ""; };

function toBase64(buffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

async function upload(env, recordId, field, file) {
  if (!file || typeof file === "string" || !file.size) return;
  if (file.size > MAX_BYTES || !/^image\//.test(file.type)) return;
  const res = await fetch(`https://content.airtable.com/v0/${env.AIRTABLE_BASE}/${recordId}/${encodeURIComponent(field)}/uploadAttachment`, {
    method: "POST",
    headers: { Authorization: `Bearer ${env.AIRTABLE_TOKEN}`, "content-type": "application/json" },
    body: JSON.stringify({ contentType: file.type, filename: file.name || "image", file: toBase64(await file.arrayBuffer()) }),
  });
  if (!res.ok) console.log("attachment upload failed", field, res.status, await res.text());
}

export async function onRequestPost({ request, env, waitUntil }) {
  let form;
  try { form = await request.formData(); } catch { return json({ error: "The form couldn't be read. Please try again." }, 400); }

  if (text(form.get("website_check"))) return json({ ok: true }); // spam trap

  const name = text(form.get("full_name"), 120);
  const email = text(form.get("email"), 200);
  const testimonial = text(form.get("testimonial"), 1500);
  const signature = text(form.get("signature"), 120);
  const uses = form.getAll("uses").filter((u) => USES.includes(u));
  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || testimonial.length < 20 || !signature || form.get("consent") !== "yes" || !uses.length) {
    return json({ error: "Some required details are missing. Check the highlighted fields and try again." }, 400);
  }

  const display = DISPLAY.includes(form.get("display_as")) ? form.get("display_as") : DISPLAY[0];
  const relationship = RELATIONSHIPS.includes(form.get("relationship")) ? form.get("relationship") : undefined;

  const fields = {
    "Full name": name,
    "Email": email,
    "Title or role": text(form.get("title"), 160),
    "Organization": text(form.get("organization"), 160),
    "Organization website": url(form.get("organization_website")) || undefined,
    "LinkedIn": url(form.get("linkedin")) || undefined,
    "How we worked together": relationship,
    "Project or program": text(form.get("project"), 200),
    "Year": text(form.get("year"), 20),
    "Testimonial": testimonial,
    "Display name as": display,
    "Show my photo": form.get("show_photo") === "yes",
    "Show organization logo": form.get("show_logo") === "yes",
    "Approved uses": uses,
    "OK to edit for length": form.get("ok_to_edit") === "yes",
    "Permission granted": true,
    "Signature": signature,
    "Consent statement": text(form.get("consent_text"), 1000) + `\n\nAgreed ${new Date().toISOString()}`,
    "Status": "New",
  };
  Object.keys(fields).forEach((k) => fields[k] === undefined && delete fields[k]);

  const res = await fetch(`https://api.airtable.com/v0/${env.AIRTABLE_BASE}/${env.AIRTABLE_TABLE}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${env.AIRTABLE_TOKEN}`, "content-type": "application/json" },
    body: JSON.stringify({ records: [{ fields }] }),
  });
  if (!res.ok) {
    console.log("airtable create failed", res.status, await res.text());
    return json({ error: "Your testimonial couldn't be saved right now. Please try again in a few minutes." }, 502);
  }
  const recordId = (await res.json()).records[0].id;

  await upload(env, recordId, "Headshot", form.get("headshot"));
  await upload(env, recordId, "Organization logo", form.get("logo"));

  const thanks = sendThanks(env, email, "Thank you for sharing your words", [
    `Hi ${firstName(name)},`,
    "Thank you for taking the time to share your experience. It means a great deal.",
    "Here's what happens next. Your testimonial comes straight to me, and nothing is published automatically. It will appear only in the places you approved, with your name shown the way you chose. If I'd like to shorten anything beyond a light trim, I'll check with you first.",
    "To change how your words are used at any point, reply to this email.",
  ]);
  if (waitUntil) waitUntil(thanks); else await thanks;

  return json({ ok: true });
}
