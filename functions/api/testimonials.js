// Cloudflare Pages Function: GET /api/testimonials?page=home
// Returns testimonials that are Published, have permission, and allow Website use.
// If any are tagged for this page under "Featured on", only those are returned.
// With strict=1 (service pages), only tagged testimonials are returned, even if that is none.
// With no page, every published testimonial is returned with its "Featured on" tags, so the site can fill
// every spot on a page from one request. Order: "Lead on testimonials page" first, then "Display order", then newest.
// Needs AIRTABLE_TOKEN with data.records:read, plus AIRTABLE_BASE and AIRTABLE_TABLE.

const PAGES = ["Home", "About", "Impact", "Work", "Services", "Speaking", "Partnerships", "Leadership", "Community", "Tastes of Coatesville", "Ruth Legacy Project", "Juneteenth", "Cultural Society", "Business on Board", "America250"];

function attribution(r) {
  const f = r.fields;
  const name = f["Full name"] || "";
  let parts = name.split(/\s+/);
  if (parts.length > 2 && /^(dr|mr|mrs|ms|mx|rev|prof)\.?$/i.test(parts[0])) parts = parts.slice(1);
  const short = parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0]}.` : name;
  const title = f["Title or role"] || "";
  const org = f["Organization"] || "";
  const join = (...xs) => xs.filter(Boolean).join(", ");
  switch (f["Display name as"]) {
    case "Full name and organization": return { name, line: join(name, org), lead: name, detail: org };
    case "First name, last initial, and organization": return { name: short, line: join(short, org), lead: short, detail: org };
    case "Title and organization only": return { name: "", line: join(title, org), lead: title || org, detail: title ? org : "" };
    case "Anonymous": { const rel = f["How we worked together"] || "Client"; return { name: "", line: rel, lead: rel, detail: "" }; }
    default: return { name, line: join(name, title, org), lead: name, detail: join(title, org) };
  }
}

export async function onRequestGet({ request, env }) {
  const params = new URL(request.url).searchParams;
  const pageParam = params.get("page") || "";
  const strict = params.get("strict") === "1";
  const page = PAGES.find((p) => p.toLowerCase() === pageParam.toLowerCase());

  const formula = "AND({Status}='Published',{Permission granted},FIND('Website',ARRAYJOIN({Approved uses})))";
  const api = `https://api.airtable.com/v0/${env.AIRTABLE_BASE}/${env.AIRTABLE_TABLE}?filterByFormula=${encodeURIComponent(formula)}&sort%5B0%5D%5Bfield%5D=Submitted&sort%5B0%5D%5Bdirection%5D=desc`;
  const res = await fetch(api, { headers: { Authorization: `Bearer ${env.AIRTABLE_TOKEN}` } });
  if (!res.ok) return new Response(JSON.stringify({ testimonials: [] }), { status: 200, headers: { "content-type": "application/json" } });

  let records = (await res.json()).records || [];
  {
    // Lead letter first, then the hand-set Display order, then newest first.
    const order = (r) => (typeof r.fields["Display order"] === "number" ? r.fields["Display order"] : 9999);
    records = records
      .map((r, i) => ({ r, i }))
      .sort((a, b) => (b.r.fields["Lead on testimonials page"] ? 1 : 0) - (a.r.fields["Lead on testimonials page"] ? 1 : 0) || order(a.r) - order(b.r) || a.i - b.i)
      .map((x) => x.r);
  }
  if (page) {
    const tagged = records.filter((r) => (r.fields["Featured on"] || []).includes(page));
    if (tagged.length || strict) records = tagged;
  }

  const testimonials = records.map((r) => {
    const f = r.fields;
    const a = attribution(r);
    const override = (f["Byline override"] || "").trim();
    if (override && f["Display name as"] !== "Anonymous") { a.detail = override; a.line = [a.lead, override].filter(Boolean).join(", "); }
    const quote = (f["OK to edit for length"] && f["Edited quote"]) ? f["Edited quote"] : f["Testimonial"];
    const anonymous = f["Display name as"] === "Anonymous";
    return {
      quote,
      name: a.name,
      attribution: a.line,
      lead: a.lead,
      detail: a.detail,
      featured: Boolean(f["Lead on testimonials page"]),
      pages: f["Featured on"] || [],
      pull: (f["Pull line"] || "").trim(),
      room: f["Room"] || "",
      organization: anonymous || override ? "" : (f["Organization"] || ""),
      photo: !anonymous && f["Show my photo"] && f["Headshot"] && f["Headshot"][0] ? f["Headshot"][0].url : "",
      logo: !anonymous && f["Show organization logo"] && f["Organization logo"] && f["Organization logo"][0] ? f["Organization logo"][0].url : "",
    };
  });

  return new Response(JSON.stringify({ testimonials }), {
    headers: { "content-type": "application/json", "cache-control": "public, max-age=300" },
  });
}
