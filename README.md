# ajenelivingston.com

Static site for Ajené Livingston, deployed on Cloudflare Pages.

- Pages: index, about, services, impact, speaking, contact, share (testimonial form)
- `functions/api/` holds the Pages Functions: `testimonial` and `testimonials` (Testimonials table) and `contact` (Contact inquiries table, tblDjy4C0Y2ePr7sG), all in Airtable base appS94tDjvBK7LKPT
- Required environment variables in Cloudflare: `AIRTABLE_TOKEN` (data.records:read and write on the base), `AIRTABLE_BASE`, `AIRTABLE_TABLE` (Testimonials). Optional: `AIRTABLE_CONTACT_TABLE`; `RESEND_API_KEY` sends thank-you emails from hello@ajenelivingston.com (skipped when unset).
- Email: hello@ and ajene@ajenelivingston.com forward through Cloudflare Email Routing

Cloudflare Pages settings: no framework, no build command, output directory `/`.
