# Performance, technical SEO, accessibility, and reliability audit

Audit date: 2026-07-31. Production domain: `https://www.makebetter.im/`.

## Scope and architecture baseline

MakeBetter is a React 18 + React Router application built by Vite and hosted with a Vercel catch-all rewrite. It is a client-rendered SPA: Vercel serves `index.html` for every application URL and React resolves the route after JavaScript starts. Public marketplace records are read from Supabase; no local or demo fallback was added. RLS and existing approval/status filters remain the authorization and publication boundaries.

Checks before implementation all passed (77 tests, 12 skipped). The original production build emitted one 741.09 kB (200.78 kB gzip) JavaScript entry chunk and warned that it exceeded 500 kB. The original HTML used one render-blocking Google Fonts request containing three families and eleven weights. Public list queries had no limits, homepage code fetched full published asset, collection, creator, and blog tables and sliced results in the browser, and all public, auth, creator, and admin route modules were eagerly imported.

## Confirmed issues and implemented fixes

### JavaScript, rendering, and data access

- Converted every route to a dynamic import behind one accessible `Suspense` fallback. Admin, creator dashboard, authentication, detail, and secondary public screens are no longer bundled eagerly into the public entry solely because their routes exist.
- Replaced the store's broad services barrel import with direct service imports to make tree-shaking boundaries explicit.
- Added server-side limits to public Supabase list functions. Homepage requests now ask for 6 assets, 6 collections, 3 creators, and 3 posts rather than downloading complete tables. General marketplace limits are intentionally above the expected launch inventory and preserve existing client filtering/load-more behavior. Detail-page supporting-content requests are also bounded.
- Preserved Supabase as the sole runtime source of truth and did not modify RLS, secrets, auth semantics, free email-only claims, approval workflows, or the paid purchase-intent flow.

### Core Web Vitals, fonts, and UI stability

- Reduced the font request to the one family actually used for the site's primary typography. It retains `display=swap`; removed Inter and JetBrains Mono network payloads while existing system fallbacks remain.
- Existing asset visuals are CSS-generated, have fixed aspect ratios, and therefore do not introduce image dimension CLS. No content `<img>` elements were found on the audited public routes.
- Existing grids and loading/empty cards reserve coherent page regions. Route loading now has a stable full-height fallback.
- Added a consistent high-contrast keyboard focus indicator.

### SEO and indexability

- Added a reusable client metadata component supporting unique title, description, canonical, robots, Open Graph, Twitter, content type, and JSON-LD values. Listing pages and public asset, collection, creator, and blog detail pages now set page-specific metadata.
- Added content-backed `CreativeWork`, `CollectionPage`, `ProfilePage`/`Organization`, and `BlogPosting` structured data without invented offers, ratings, reviews, inventory, or FAQ claims. Asset pages include a visible breadcrumb and matching `BreadcrumbList`.
- Added a stable first-party 1200x630 social fallback image and replaced the external preview-host image URL.
- Added a production-domain canonical and crawl directives to the base HTML. Search/tag parameter views are `noindex` and canonicalized to `/assets`; admin, auth, account, and dashboard paths are `noindex,nofollow` in the client.
- Expanded `robots.txt` to block private route families and advertise `sitemap.xml`; Vercel also emits `X-Robots-Tag` for private routes and baseline content/referrer/permissions security headers. Added a conservative sitemap containing stable public landing/trust routes. Dynamic Supabase slugs are intentionally not invented at build time.
- Invalid asset, collection, creator, blog, and catch-all URLs now retain the requested URL, show an explicit unavailable/not-found experience, and set `noindex` rather than silently redirecting to a listing.

### Accessibility and resilience

- Added accessible names to both marketplace search inputs and the sorting control, plus group semantics and pressed state for asset filters.
- Added initial focus, Escape dismissal, tab containment, and focus restoration to the free-claim/purchase-intent dialog. The email-only free claim remains unchanged.
- Existing semantic site header, navigation, main, footer, error boundary, modal labels, form labels, alert roles, and loading/error/empty states were retained.

## Measured result

The post-change build emits route-specific chunks. The shared entry measured 552.33 kB / 163.67 kB gzip before the final direct-import cleanup, versus 741.09 kB / 200.78 kB gzip at baseline: 25.5% less minified entry JavaScript and 18.5% less gzip. The bundler still reports that the shared entry exceeds 500 kB, so this is a material improvement rather than a claim that bundle work is complete. No synthetic Lighthouse score is reported because the local environment has no production Supabase configuration/content and such a score would not represent production LCP or network behavior.

## Indexation limitation and recommended infrastructure work

The SPA rewrite returns HTTP 200 with the generic HTML shell for every URL. Client metadata improves social navigation and Google can render it, but it does not provide deterministic HTML metadata/content to crawlers, true HTTP 404 responses, or dynamic sitemap discovery. A safe fix requires a deployment architecture decision, not an in-place client rewrite. Recommended next step:

1. Adopt framework-supported SSR/SSG (for example a React Router framework/server build or Next.js) for public routes while keeping Supabase as the only source of truth.
2. Render public status-filtered records on the server, use ISR/revalidation or cache tags, and emit real 404 responses for absent/unpublished slugs.
3. Generate sitemap indexes from approved/published Supabase assets, collections, creators, and posts during a trusted server/build job. Never expose the service-role key to the browser.
4. Extend the implemented private-route edge `X-Robots-Tag` rule to parameterized search responses if routing moves server-side.

Until then, the static sitemap intentionally lists stable landing pages only. Category landing routes do not exist in the current product; create indexable category pages only after there is enough approved content and server-rendered unique copy. Empty collection/creator pages should be excluded by the future sitemap job.

## Analytics and monitoring readiness

Existing privacy-conscious analytics calls a Supabase RPC and stores only a random session ID plus allow-listed metadata. It currently records asset views, free claim started/completed, delivery opened, creator asset submitted, admin asset reviewed, and bounded client-error messages. The database migration allow-lists those exact events, so new event names were not sent without an approved schema change.

Proposed additions (after a reviewed additive migration extends the allow-list):

| Event | Fire point | Safe properties |
| --- | --- | --- |
| `search_used` | Search submit/filter settle on home or assets | query length, results count, product type; never raw query/email |
| `collection_viewed` | Published collection load succeeds | collection UUID or slug |
| `creator_application_started` | First interaction on creator application | entry route only |
| `creator_application_submitted` | Supabase application write succeeds | resulting status |
| `paid_purchase_intent_clicked` | Paid detail CTA opens | asset UUID |
| `asset_download_started` | User requests an authorized delivery | asset UUID, delivery type |
| `asset_download_completed` | Browser handoff succeeds where observable | asset UUID, delivery type |

The existing React error boundary plus `window.error` and `unhandledrejection` handlers are appropriate integration points for a future error service. Web-vitals collection can be added in `main.tsx` after consent/retention decisions. Strip URLs, emails, form content, deliverable text, auth tokens, and Supabase error payloads before transmission; use sampling and do not invent a tracking ID.

## Files changed

- `src/App.tsx`: route splitting, route fallback, private/filter indexation defaults.
- `src/components/Seo.tsx`, `src/lib/seo.ts`: metadata, canonical, social, and schema foundation.
- `src/pages/Index.tsx`, `Assets.tsx`, `AssetPage.tsx`, `CollectionsPage.tsx`, `CollectionPage.tsx`, `CreatorsPage.tsx`, `CreatorPage.tsx`, `BlogPage.tsx`, `BlogPostPage.tsx`, `NotFound.tsx`: page metadata, not-found behavior, schemas, breadcrumb, and accessible search/filter controls.
- `src/components/GetAssetModal.tsx`, `src/index.css`: dialog focus management and visible focus styles.
- `src/services/assets.ts`, `content.ts`, `creators.ts`, `src/store/store.tsx`: bounded public queries and explicit module boundaries.
- `index.html`, `public/robots.txt`, `public/sitemap.xml`, `public/og-image.svg`, `vercel.json`: base crawl/social/font improvements and safe response headers.

## Validation record

Baseline and final validation used Node/npm already installed in the repository. Final handoff should record `npm run ci:check`, `git diff --check`, and a local HTTP smoke check. Production-dependent claim completion and Supabase-backed content cannot be truthfully completed without production credentials; no credentials or environment values were changed.
