# FTN Platform Website Version 1.0 — Technical Compliance Audit

**Status:** Engineering reference document. Prepared for the Founder and Chief Product Officer to
use while drafting the Version 1.0 Governance & Legal Framework.

**Scope:** This audit covers only the codebase at `FTN PLATFORM SITE` — the public FTN Platform
marketing/informational website. It does **not** cover Community Connect (a separate application
and repository), Mission Control (a separate application and repository), or any infrastructure
configuration outside this repository (Cloudflare Pages account settings, DNS, email hosting).
Where the website's own copy describes those other products, that is noted explicitly as
"described in copy, not implemented in this repository" — the distinction matters and is preserved
throughout.

**Method:** Every statement below is derived directly from the current committed source (commit
`49ab2dd` on `main`) via direct file inspection and pattern search across all `.html`/`.js`/`.css`
files in the repository. No statement in this document is an assumption, an inference about
intended future behavior, or a claim about a different repository. Where something does not exist,
that absence was verified by search, not assumed by omission.

This document contains no legal conclusions, no policy language, and no recommendations. It is a
factual inventory only.

---

## 1. Data Collection

### 1.1 What is currently collected

The website has exactly one interactive data-entry surface: the Contact form (`/contact/`,
`contact/index.html` lines 296–330). It collects four fields:

| Field | Input type | Required |
|---|---|---|
| Full name | `text`, `autocomplete="name"` | Yes |
| Email address | `email`, `autocomplete="email"` | Yes |
| Inquiry category | `select` (8 options: General Enquiries, Government & Public Sector, Commercial Partnerships, Investors, Media & Press, Artist & Creative Services, Technical Support, Careers) | Yes |
| Message | `textarea` | Yes |

**All four fields are mandatory.** There is no optional field on this form, and no other
data-collection form exists anywhere on the website.

**What happens to this data on submission:** Nothing is transmitted. `js/contact-form.js`
(58 lines total) calls `event.preventDefault()` on submit (line 26), performs only client-side
`required`/validity checks (lines 28–46), and — if valid — sets a status message in the DOM (line
56): *"This form is not yet connected to a backend, so this message was not sent. Please use the
direct contact details below instead."* There is no `fetch`, `XMLHttpRequest`, `action` attribute,
`mailto:` link, or third-party form-service integration anywhere in this file or this page. The
file's own header comment states: *"There is no backend to submit to yet... Replace this once a
real submission endpoint exists."* Submitted form data exists only transiently in the browser's DOM
for the duration of the page view and is discarded on navigation/reload — it is never written to
`localStorage`, never logged, and never leaves the visitor's device.

### 1.2 GPS / location behavior

**Not implemented.** No file in this repository calls `navigator.geolocation` (verified by search
across every `.js` file — zero matches). The website's Community Connect marketing page
(`community-connect/index.html` lines 271–272, 307, 427) describes the separate Community Connect
*application* as letting a user "pin the exact location" of a report — this is descriptive marketing
copy about a different product in a different repository. This website does not request, read, or
transmit device location in any way.

### 1.3 Photo / file handling

**Not implemented.** No `<input type="file">` element and no `FileReader` usage exist anywhere in
this repository (verified by search). The Community Connect marketing page shows five static
reference screenshots (pre-rendered `.webp` image assets under `assets/community/`, e.g.
`community-connect-screen-report-form.webp`) depicting the separate Community Connect app's own
photo-capture UI — these are static marketing images shipped as site assets, not a live upload
feature. This website has no capability for a visitor to upload, capture, or transmit a photo or
any other file.

### 1.4 Anonymous reporting behavior

**Not implemented on this website.** There is no reporting feature of any kind on this site.
Community Connect's marketing page states the separate app lets users "report many issues without
attaching your identity to them" (line 363) — this describes the other application's behavior, not
a capability present in this repository.

### 1.5 Metadata captured

None. No file in this repository writes visitor metadata (timestamps of visits, referrer strings,
click paths, etc.) to any persistent store, client-side or otherwise. The only timestamp-bearing
data is user-initiated and local (e.g., `savedAt` on a self-named Display Config layout the visitor
creates and saves themselves — see §2).

### 1.6 Browser information

Not read for collection/transmission purposes. `navigator.userAgent`, `navigator.platform`, and
`navigator.language` are not referenced anywhere in the codebase (verified by search). The site
does read `window.innerWidth`/`innerHeight` and uses CSS media queries / `matchMedia` for
responsive layout and to respect `prefers-reduced-motion` and `prefers-color-scheme` — this
information is used synchronously in the browser to render the page and is never transmitted
anywhere, logged, or stored.

### 1.7 Device information

Same as §1.6 — used transiently client-side for responsive rendering only (CSS breakpoints,
`matchMedia` checks in `js/reveal.js` and elsewhere for `prefers-reduced-motion`). Never collected,
stored, or transmitted.

### 1.8 IP address handling

No application code in this repository reads, logs, stores, or transmits an IP address — there is
no server-side code in this repository at all (see §5). Any IP-address handling that occurs happens
at the hosting-infrastructure level (Cloudflare Pages, per `VERSION.md`'s deployment record) as a
function of standard HTTP request routing, not as application behavior implemented in this
codebase. This document makes no claim about Cloudflare's own infrastructure-level logging, which
is outside this repository's scope.

### 1.9 Session information

None. No session identifier, session cookie, or server-side session store exists (see §3 —
confirmed zero cookies) or is created by any script in this repository.

---

## 2. Storage — every location where information is stored

### 2.1 Cookies

**None.** No file in this repository sets `document.cookie`, and there is no server-side code
capable of sending a `Set-Cookie` header. Verified by search across every `.html` and `.js` file
for `document.cookie`, `Set-Cookie`, and common cookie-consent library references — zero matches.

### 2.2 sessionStorage

**None.** Verified by search — no file in this repository calls `sessionStorage` in any form.

### 2.3 IndexedDB

**None.** Verified by search — no reference to `indexedDB` or the IndexedDB API anywhere in the
codebase.

### 2.4 Cache Storage / Service Worker caches

**None.** Verified by search — no `caches.open`, no `navigator.serviceWorker.register`, no
`manifest.json` (no PWA manifest exists in this repository), and no service worker file of any
kind.

### 2.5 Supabase

**None.** Verified by search — the string "supabase" (any case) does not appear anywhere in this
repository.

### 2.6 Server-side storage / database

**None.** This repository contains no server-side application code (no API routes, no database
client, no `package.json` with a server dependency, no backend language files). It is a fully
static site: HTML, CSS, and vanilla JavaScript files served as-is.

### 2.7 localStorage — complete key inventory

`js/storage.js` is a shared, generic try/catch wrapper (`getJSON`/`setJSON`/`remove`) around the
browser's `localStorage`. One file (`js/platform-mode.js`) calls `localStorage` directly rather than
through this wrapper. Every localStorage key in use by the site, found by searching both call
patterns, is listed below. There are no other client-side or server-side storage locations.

| Key | Written by | Contents | Active on |
|---|---|---|---|
| `ftn-platform-mode` | `js/platform-mode.js` | Single string: `"live"` or `"presentation"` | All 17 pages (script loads site-wide) |
| `ftn-presentation-control-position` | `js/presentation-control.js` | `{x, y}` pixel coordinates of the floating Presentation Mode control | All pages, only written while the control has been dragged |
| `ftn-display-config` | `js/display-config.js` | One object: venue, screen name, indicator count, density, category list, ad level, rotation behavior, rotation interval, save timestamp | Wherever the Display Config panel is mounted (Observatory) |
| `ftn-display-layouts` | `js/display-config.js` | Array of `{name, config, savedAt}` — visitor-named saved copies of the above | Same as above |
| `ftn-founder-disabled-indicators` | `js/founder-controls.js` | Array of indicator-ID strings hidden via the unauthenticated, local-only Founder Controls demo stub | Any page rendering that stub |
| `ftn-observatory-hidden-categories` | `js/observatory.js` | Array of category-name strings a visitor chose to hide from their own dashboard view | `/observatory/` (FTN Live) |

**None of these seven keys contain a visitor's name, email address, IP address, or any other
personally identifying data.** They are all browser-local UI/display preferences, readable only by
scripts running on the visitor's own device, and are not transmitted anywhere by any code in this
repository.

### 2.8 Temporary storage

The only transient, non-persisted data is form-field values held in the DOM during a single Contact
form page view (see §1.1) — discarded on navigation or reload, never written to any storage
mechanism.

---

## 3. Cookies

**The website currently creates no cookies of any kind.** This is stated plainly per §2.1: no
first-party cookie, no third-party cookie, no session cookie, no analytics cookie, no
consent-management cookie. There is nothing to list under "essential vs. optional" because no
cookie exists in either category.

---

## 4. Third-Party Services

Every external service the website's code actually connects to, verified by searching all
`.html`/`.js` files for external script tags, stylesheet links, and known third-party
service/vendor identifiers (analytics, tag managers, CDNs, maps, embeds):

| Service | Purpose | Data exchanged | User impact |
|---|---|---|---|
| **Google Fonts** (`fonts.googleapis.com`, `fonts.gstatic.com`) | Serves the Inter/Montserrat webfont files used site-wide | The visitor's browser makes a direct request to Google's font-serving domains to download font files; this is standard for any site using Google Fonts via `<link>` (as opposed to self-hosted fonts) | Google's servers receive the request (including the visitor's IP address as an inherent part of any HTTP request) as a function of the browser loading the font, independent of any code this site writes |

No other third-party service is connected anywhere in the codebase. Specifically, verified absent:
analytics or tag-manager scripts (Google Analytics/gtag, Google Tag Manager, Cloudflare Web
Analytics beacon, Plausible, Mixpanel, Segment, Hotjar, Sentry), map embeds (Google Maps, Mapbox,
Leaflet), any `<iframe>` element anywhere on the site, and any social-media embed widget. The site's
social links (footer, `contact/index.html`) are plain `<a href>` links to
`x.com/realityarttv`, `facebook.com/realityarttv`, `instagram.com/realityarttv`,
`youtube.com/realityarttv`, and `linkedin.com/company/realityarttv` — a visitor must click to
leave the site; nothing loads automatically from those domains.

**Hosting/CDN:** Per `VERSION.md`, the site is deployed via Cloudflare Pages at the custom domain
`ftnplatform.org`. This is infrastructure the repository is deployed to, not a service the
website's own code calls — it is noted here for completeness but is outside this audit's
code-level scope (see the Scope note at the top of this document).

---

## 5. External Requests

**The website's JavaScript makes zero outbound network requests of any kind.** Verified by
searching every `.js` file for `fetch(`, `XMLHttpRequest`, `axios`, and jQuery-style `.ajax(` —
the only match found (`js/source-registry.js` line 4) is inside a code comment explicitly stating
the registry does *not* fetch live data. Every `<script src="...">` tag across all 17 pages
references a local `/js/*.js` file; none reference an external script host.

The only requests a visitor's browser makes to a destination other than the site's own origin are:

- **Google Fonts** (`fonts.googleapis.com`, `fonts.gstatic.com`) — font files, triggered by
  `<link rel="preconnect">` and a stylesheet `<link>` in every page's `<head>`. No data beyond the
  standard HTTP request itself (including the requesting IP, inherent to any such request) is
  transmitted.
- **Social profile links** — only if a visitor deliberately clicks one, per §4.

There is no first-party API endpoint anywhere in this repository for a browser to call in the first
place.

---

## 6. User Submissions — exact current behavior per action

| Action | Where information goes today |
|---|---|
| **"Submits Community Connect"** | Not applicable to this repository. There is no submission flow on this website for Community Connect — the website only presents marketing copy, static reference screenshots, and "Coming Soon" download buttons for the App Store and Google Play (`community-connect/index.html` lines ~452–453; both buttons are `aria-disabled="true"` and non-functional). Community Connect's own in-app report-submission flow is implemented in a separate application and separate repository this project does not contain. |
| **Submits Contact** | Nowhere. Per §1.1, the form is fully inert client-side: validated, then a message is shown stating the submission was not sent. No network request occurs. |
| **Uploads media** | Not applicable — no upload capability exists anywhere on this website (§1.3). |
| **Shares content** | Not applicable — no share button, Web Share API call, or share-intent link exists anywhere on this website (verified by search for `navigator.share` and common share-URL patterns — zero matches). |
| **Changes Presentation Mode** (via `?mode=presentation` URL parameter) | `js/platform-mode.js` writes the string `"presentation"` to the `ftn-platform-mode` localStorage key on the visitor's own device, sets a `data-platform-mode` attribute on the page's root element, strips the `?mode=` parameter from the visible URL via `history.replaceState`, and dispatches a same-page `ftn:platform-mode-changed` browser event. Nothing is transmitted to any server — this is a 100% client-side, on-device state change. |
| **Switches to Live Mode** (via the floating control's "Exit to Live Mode" button, or `?mode=live`) | Identical mechanism in reverse: `js/platform-mode.js` writes `"live"` to the same localStorage key, updates the same DOM attribute, dispatches the same event type with the new mode, and (when triggered from the floating control specifically) the page then calls `location.reload()` to re-render cleanly. Nothing is transmitted to any server. |

---

## 7. Media

- **Photo storage:** Not implemented — no capability exists to store a visitor-provided photo (§1.3).
- **Upload handling:** Not implemented — no file input exists anywhere on the site (§1.3).
- **File limits / formats accepted:** Not applicable — there is no upload feature to place a limit on.
- **Previews:** Not applicable for the same reason. (The site does display pre-existing, static
  reference images — e.g., Community Connect app screenshots, Observatory/Mission Control preview
  screenshots — but these are fixed assets shipped with the codebase, not previews of
  visitor-supplied content.)
- **Deletion behavior:** Not applicable — there is no visitor-supplied media for any deletion
  mechanism to act on.

---

## 8. Presentation Mode / Live Mode — precise mechanics

- **How Presentation Mode works:** A single global flag (`FTN.PlatformMode`, defined in
  `js/platform-mode.js`) is read by every page on load. The flag's value (`"live"` by default, or
  `"presentation"`) is persisted in the visitor's own browser via `localStorage` under the key
  `ftn-platform-mode`. Entry into Presentation Mode requires a deliberate `?mode=presentation` URL
  parameter (there is no button or link anywhere on the site's normal navigation that switches
  Live Mode into Presentation Mode) — the parameter is read once, applied, and then stripped from
  the visible URL. While active, a floating on-page control (`js/presentation-control.js`,
  `css/components/presentation-control.css`) is rendered on every page: it is draggable (its
  position, once moved, is saved to `localStorage` under
  `ftn-presentation-control-position`), dismissible for the current page view only (it reappears
  on the next page navigated to), and contains one action — "Exit to Live Mode."
- **How Live Mode works:** The default state. No floating control is rendered. The flag reads
  `"live"` unless a visitor has previously and deliberately switched to Presentation Mode on that
  browser.
- **What differs between the two modes:** Only two things — (1) which data tier a page's JavaScript
  resolves through the mechanism described below, and (2) the presence or absence of the floating
  control. No page's HTML structure, navigation, CSS layout, or interactive behavior changes based
  on mode.
- **What remains identical:** Layout, navigation, page structure, all interactive workflows
  (Trust Cards, tabs, forms, search, etc.), and visual styling are pixel-identical between the two
  modes, verified directly by rendering representative pages in both states.
- **Current datasource behavior:** `js/data-source.js` provides a `register(key, tier, data)` /
  `resolve(key)` registry. `js/indicators-data.js`, `js/relationships-data.js`, and
  `js/mission-control-data.js` each register their built-in dataset under a `"presentation"` tier
  and then resolve that same key back into `global.FTN.indicators`, `global.FTN.Relationships`, and
  `global.FTN.MC` respectively. **No `"live"` tier is registered anywhere in this repository today.**
  Because `resolve()` falls back to the presentation tier whenever no live tier exists, Live Mode
  and Presentation Mode currently read the exact same underlying dataset — verified directly by
  comparing indicator counts, relationship counts, and Mission Control KPI counts between the two
  modes across all four data-driven pages (Observatory, News, Insights, Mission Control Demo); all
  counts were identical.
- **The seam already prepared for a future production engine:** Because every rendering file reads
  data exclusively through `global.FTN.indicators` / `global.FTN.Relationships` / `global.FTN.MC`
  (never a hardcoded literal), a future real data source can call
  `FTN.DataSource.register('indicators', 'live', <real data>)` (and the equivalent for
  relationships and Mission Control data) and Live Mode would immediately begin resolving to it,
  with Presentation Mode continuing to resolve to today's dataset — without any rendering code in
  any of the four data-driven pages needing to change. No such live-tier registration exists in
  this repository as of this audit.

---

## 9. Security

- **Current client-side protections:** Standard browser same-origin behavior; no custom security
  headers are set by this repository's own code (no server-side code exists in this repository to
  set them — see §5/§2.6). No `Content-Security-Policy` meta tag or header exists anywhere in the
  codebase (verified by search).
- **Current validation:** Client-side only, on the Contact form: `required` attribute checks plus
  `field.checkValidity()` (native HTML5 constraint validation, e.g. email format) in
  `js/contact-form.js`. This validation exists purely to give the visitor immediate feedback in the
  browser; because the form does not transmit data anywhere (§1.1), there is no corresponding
  server-side validation layer.
- **CSP (Content Security Policy):** Not present. No CSP is declared via meta tag in any HTML file
  and no server configuration in this repository sets one via header.
- **HTTPS assumptions:** Every canonical URL, Open Graph URL, and sitemap entry across the site
  uses `https://ftnplatform.org` (verified in `sitemap.xml`, `robots.txt`, and every page's
  `<head>`). Actual HTTPS enforcement (certificate provisioning, HTTP→HTTPS redirect) is a function
  of the Cloudflare Pages hosting platform, not application code in this repository.
- **Permissions requested from the browser:** None. Verified by search across all `.js` files for
  `navigator.geolocation`, `navigator.mediaDevices`, `Notification.requestPermission`,
  `navigator.clipboard`, and `navigator.share` — zero matches. The site never triggers a browser
  permission prompt of any kind.
- **Browser APIs used:** `localStorage` (§2.7), `IntersectionObserver` (used by `js/reveal.js` for
  a scroll-triggered fade-in, with a documented 1.2-second fallback timer and full functionality
  with JavaScript disabled or the API unsupported), `matchMedia` (responsive/reduced-motion
  checks), `CustomEvent` / `addEventListener` (the `ftn:platform-mode-changed` and
  `ftn:display-config-changed` events), `URLSearchParams` and `history.replaceState` (the
  `?mode=` entry parameter), `PointerEvent` (drag handling on the Presentation Mode control and
  elsewhere), and `Intl.DateTimeFormat` (timezone-correct local time display on Observatory,
  computed client-side from the visitor's own device clock — see `js/today-panel.js`).

---

## 10. Current Reality — feature-by-feature status

Status values used: **Implemented** (present and functional in this repository as described),
**Partially Implemented** (present but with a stated, deliberate gap), **Planned** (referenced in
project documentation but no code exists), **Not Implemented** (no code exists, and/or the
capability belongs to a different, separate repository).

| Feature | Status | Note |
|---|---|---|
| Indicator Engine (`js/indicators-data.js`) | Implemented | Demonstration/illustrative dataset, disclosed per-indicator via a classification field |
| Relationship Engine (`js/relationships-data.js`) | Implemented | Same disclosure model as above |
| Trust Card system (`js/trust-card.js`) | Implemented | Source/methodology/freshness/confidence disclosure modal |
| Source Registry (`js/source-registry.js`) | Implemented | Real external source URLs where genuinely supplied; no fabricated sources |
| Platform Mode / datasource seam (`js/platform-mode.js`, `js/data-source.js`) | Implemented | See §8. Presentation-tier only; no live tier registered |
| Presentation Mode floating control | Implemented | See §8 |
| Contact form — client-side validation | Implemented | |
| Contact form — actual message delivery to any destination | Not Implemented | See §1.1 |
| Community Connect app itself (report submission, GPS, photo capture, in-app account) | Not Implemented in this repository | Separate application/repository; this site only markets it |
| Community Connect download availability (App Store / Google Play) | Not Implemented | Buttons present, disabled, labeled "Coming Soon" |
| Mission Control (real, secure production application) | Not Implemented in this repository | Separate application/repository |
| Mission Control Interactive Demonstration (`/mission-control/demo/`) | Implemented | Explicitly disclosed as a public demonstration built on demonstration data, not the production application |
| FTN Live / National Observatory (`/observatory/`) | Implemented | Demonstration/illustrative indicator wall |
| Display Network (venue/kiosk display product) | Not Implemented in this repository | Exists only as a separate FTN Design Concepts prototype, outside this repository |
| Media Network | Not Implemented in this repository | Same as above |
| News (`/news/`) | Implemented | Built from real platform milestones and real Community-category indicator aggregates; no fabricated news content |
| Insights (`/insights/`) | Implemented | Reuses the Relationship Engine and What-Changed engine; no fabricated statistics |
| Cookie usage | Not Implemented | Confirmed none exist (§2.1, §3) |
| Analytics / tracking | Not Implemented | Confirmed none exist (§4) |
| Any backend / database / server-side storage | Not Implemented | Confirmed fully static site (§2.6, §5) |
| Privacy Policy / Terms of Service / Cookie Policy / Data Retention Policy | Not Implemented | All four pages are structural placeholder shells with agreed section headings and no drafted content; each carries an explicit on-page "not yet legally reviewed or approved" banner |

---

*End of Technical Compliance Audit. No legal conclusions, policy language, or recommendations are
contained in this document by design — it exists solely to establish verified engineering fact for
the Version 1.0 Governance & Legal Framework.*
