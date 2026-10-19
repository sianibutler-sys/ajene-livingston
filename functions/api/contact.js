// Cloudflare Pages Function: POST /api/contact
// Saves a "Start a conversation" message to the Contact inquiries table in Airtable.
// Uses the same AIRTABLE_TOKEN and AIRTABLE_BASE as the testimonial form.
// Optional: AIRTABLE_CONTACT_TABLE (defaults to the Contact inquiries table id below).

const CONTACT_TABLE = "tblDjy4C0Y2ePr7sG";
const INTERESTS = ["Partnerships and resource development", "Board and leadership support", "Community engagement and facilitation", "Speaking or emceeing", "Arts and cultural programming", "Small-business mentorship"];
const TIMELINES = ["As soon as possible", "In the next three months", "Later this year", "Just exploring"];

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const text = (v, max = 500) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export async function onRequestPost({ request, env }) {
  let form;
  try { form = await request.formData(); } catch { return json({ error: "The form couldn't be read. Please try again." }, 400); }

  if (text(form.get("website_check"))) return json({ ok: true }); // spam trap

  const name = text(form.get("name"), 120);
  const email = text(form.get("email"), 200);
  const message = text(form.get("message"), 5000);
  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || message.length < 10) {
    return json({ error: "Some required details are missing. Check the highlighted fields and try again." }, 400);
  }

  const interests = form.getAll("interest").filter((i) => INTERESTS.includes(i));
  const timeline = TIMELINES.includes(form.get("timeline")) ? form.get("timeline") : undefined;

  const fields = {
    "Name": name,
    "Email": email,
    "Organization": text(form.get("organization"), 160) || undefined,
    "Role": text(form.get("role"), 160) || undefined,
    "Interested in": interests.length ? interests : undefined,
    "Timeline": timeline,
    "Message": message,
    "Status": "New",
    "Submitted": new Date().toISOString(),
  };

  const table = env.AIRTABLE_CONTACT_TABLE || CONTACT_TABLE;
  const res = await fetch(`https://api.airtable.com/v0/${env.AIRTABLE_BASE}/${table}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${env.AIRTABLE_TOKEN}`, "content-type": "application/json" },
    body: JSON.stringify({ fields, typecast: false }),
  });
  if (!res.ok) {
    console.log("contact save failed", res.status, await res.text());
    return json({ error: "send failed" }, 502);
  }
  return json({ ok: true });
}
