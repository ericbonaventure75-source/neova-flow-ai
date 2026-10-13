# NEOVA Flow AI — GitHub + Render

This is the original version 5 design and content, migrated from Sites/Cloudflare to a standard Next.js Node server. Node 24 and pnpm 11.25.0 are required. No database, credentials, node_modules, or Linux dependency archive should be committed to GitHub.

## Local development

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

Copy `.env.example` to `.env.local` and configure the private relay settings to test real email delivery. Without them, requests are saved locally and explicitly reported as notification pending. No live email tests were performed during preparation.

## Deploy through GitHub and Render

1. Create a private GitHub repository and upload the contents of this directory, including hidden files. Keep `pnpm-lock.yaml`, `render.yaml`, and `.gitignore`. Do not upload the original export ZIP: it includes a hardcoded secret.
2. In Render, create a Blueprint from that repository. `render.yaml` creates a **paid Starter Node Web Service with a 1 GB persistent disk**. This prevents free-service sleeping and loss of stored form requests. Review Render's displayed price before creating it.
3. The existing Google Apps Script `/exec` deployment URL is already preserved in `render.yaml` and `.env.example`; confirm it is still the active deployment. Set `AUDIT_RELAY_KEY` privately to the current script's key. Never put the key in GitHub, browser code, or a `NEXT_PUBLIC_` variable.
4. The existing Apps Script remains compatible. The supplied `integration-google/Code.gs` is an optional safer replacement: it reads `AUDIT_RELAY_KEY` from Apps Script Project Settings > Script properties. Set that property before updating and redeploying the existing web app. Keep Execute as owner and the access required for anonymous server requests. Rotate the key in both systems if the original export was shared publicly.
5. Render commands are `corepack enable && pnpm install --frozen-lockfile && pnpm build` and `pnpm start`. The app listens on Render's supplied `PORT`; the health endpoint is `/api/health`.
6. Test the Render URL, all routes, mobile navigation, WhatsApp, solution preselection, and one clearly labelled real audit. Confirm its reference and email receipt in Gmail. Retry the same request if necessary: its UUID prevents duplicate database rows. Pending email is retried every minute while the server is running; review logs if it remains pending (100 scheduled attempts maximum, manual resubmission can retry). Google Apps Script's cache suppresses repeated notifications for six hours, not indefinitely.
7. Export any historical audit records from the original Cloudflare D1 database before retiring the old hosting. Those records are not part of the supplied source ZIP and have not been migrated. Import them securely into the new SQLite database with an explicit migration; never commit personal data to GitHub.

## Domain cutover without disrupting email

Keep Namecheap nameservers and your complete existing DNS zone. Save a copy before editing. In Render add **neovaflowai.com** as the primary custom domain: Render also configures `www` to redirect to the apex.

Only after the Render preview and forms pass:

- Replace the web records for `@` (currently `162.159.143.30` and `172.66.3.26`) with the exact apex target shown by Render.
- Replace Namecheap's `www` URL Redirect record with the CNAME target shown by Render. Its current web address is `162.255.119.103`, and HTTPS did not respond during the public checks.
- Review explicit AAAA records for these two web hosts and remove obsolete web-only AAAA records if present. The previous local resolver returned DNS64-synthesized IPv6 addresses; this does not establish that Namecheap actually has AAAA records. Use the DNS dashboard as the authority.
- Preserve all MX records, SPF/DKIM/DMARC TXT records, Google verification TXT, and mail-related host records. Do not delete or replace the DNS zone. Do not point a CNAME at the apex if it conflicts with MX/TXT records.
- Verify both domains in Render and wait for valid TLS certificates before declaring completion. Render handles HTTP-to-HTTPS; the app also permanently redirects `www` with its path and query preserved.
- Check all four variants using a nested page and a query string. All should end at `https://neovaflowai.com` with the same path/query. Keep the old deployment available for rollback until cutover verification passes. The previous `chatgpt.site` address requires a redirect on the old host or retirement there; this repository cannot redirect traffic it never receives.

## SEO verification after cutover

`robots.txt` permits public crawling, excludes `/api/`, and references the official sitemap. All 11 public pages use the official domain, page-specific canonicals, index/follow metadata, French language metadata, and social preview images. Service and organization structured data use the same domain. Unknown routes return a real 404. No fabricated reviews, addresses, or rankings are added.

In Google Search Console, verify the existing **Domain property**, run Live URL Inspection on the homepage and core services, submit `https://neovaflowai.com/sitemap.xml`, then request indexing. The public DNS TXT existed during the initial check, but account verification, Google's access, and indexing must be checked in Search Console after launch. Indexing is Google's decision and cannot be guaranteed by a code fix.

Confirm `200` for the homepage, robots and sitemap; confirm no `noindex` metadata or `X-Robots-Tag` on public pages. The health endpoint is intentionally `noindex`. The Render preview retains production canonical URLs; disable the default Render subdomain after the custom domain is proven if desired.

Legal and privacy pages preserve the existing company-information placeholders. The owner still needs to supply the real legal entity, registered address, applicable registration numbers and retention policy; these cannot be inferred from source code. Hosting text has been updated for Render.

## Validation

```sh
pnpm typecheck
pnpm test
pnpm build
pnpm start
```

SQLite is stored at `/var/data/audits.sqlite` on Render. Back it up using SQLite's backup API or a consistent disk/database snapshot. Protect backups and define a retention policy. This disk design uses a single server instance; use a shared database if you later scale horizontally.

Rate limiting uses the Cloudflare client address provided on Render public web services, with a forwarded-header fallback; verify distinct client addresses after deployment.

Official references: [Render Next.js](https://render.com/docs/deploy-nextjs-app), [custom domains](https://render.com/docs/custom-domains), [persistent disks](https://render.com/docs/disks).
