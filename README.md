# ajenelivingston.com

Static site for Ajené Livingston, deployed on Cloudflare Pages.

- Pages: index, about, services, impact, speaking, contact, share (testimonial form)
- `functions/api/` holds the Pages Functions for the testimonial form (Airtable)
- Required environment variables in Cloudflare: `AIRTABLE_TOKEN`, `AIRTABLE_BASE`, `AIRTABLE_TABLE`

Cloudflare Pages settings: no framework, no build command, output directory `/`.
