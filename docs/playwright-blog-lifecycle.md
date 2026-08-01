# Blog lifecycle Playwright tests

The Playwright suite exercises a real, non-production Supabase environment through the browser. Never point it at production: the test creates, publishes, and deletes records.

## Test accounts

Create two dedicated accounts in the QA Supabase project:

- an **approved, active creator** profile that can create creator-blog drafts;
- an **active admin** profile that can access the blog moderation queue.

Copy `.env.example` to an ignored local environment file or export the variables in your shell. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to the QA project public values, then set `E2E_CREATOR_EMAIL`, `E2E_CREATOR_PASSWORD`, `E2E_ADMIN_EMAIL`, and `E2E_ADMIN_PASSWORD`. Do not use a service-role key. Do not commit the populated file.

`E2E_BASE_URL` is optional. When omitted, Playwright starts Vite at `http://127.0.0.1:4173`. When supplied, the suite tests that already-running deployment and does not start a local server.

## Install and run

```sh
npm ci
npm run test:e2e:install
npm run test:e2e
```

Use `npm run test:e2e:headed` to watch Chromium, or `npm run test:e2e:ui` for Playwright UI mode. The config retains a screenshot, video, and trace for failed tests; open the generated report with `npx playwright show-report`.

The lifecycle test generates a timestamped `QA Blog` title and `qa-blog-*` slug on every run. Its `finally` block attempts to delete exactly that record through the authenticated admin UI. If a browser or backend failure prevents cleanup, search the QA moderation queue for the unique title printed in the test artifacts and delete only that QA record manually.

Missing account credentials cause the lifecycle test to skip rather than fall back to embedded credentials. The suite does not modify seeded or production content.
