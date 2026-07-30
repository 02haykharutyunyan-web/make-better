# Production free-asset integration QA

The **Production free-asset QA** workflow is a manually dispatched, serialized check of the merged PR #14 production flow. It creates isolated records, authenticates through a generated magic link in Chromium, exercises claim and delivery authorization, uploads a sanitized result, and deletes everything created by that run.

## One-time configuration

Create a protected GitHub environment named `production-qa`. Restrict deployment branches to the trusted default branch and require appropriate reviewers for production access. Add these environment secrets (not repository variables):

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `VERCEL_AUTOMATION_BYPASS_SECRET`

The service-role credential must belong to the production Supabase project. The Vercel secret must be a Deployment Protection automation bypass secret for `makebetter.im`. Never put either value in workflow inputs, logs, artifacts, source files, or pull-request comments.

## Running the QA

1. Open **Actions → Production free-asset QA** on the trusted default branch.
2. Select **Run workflow** and approve the `production-qa` environment when prompted.
3. Review the job result and download its `production-free-asset-qa-…` artifact. The artifact contains only run IDs, check names, PASS/FAIL states, and a bounded sanitized failure message.

The workflow has only `workflow_dispatch`, read-only repository permission, a 20-minute timeout, and a global concurrency group. It never executes automatically for pushes, pull requests, or forks.

## Data isolation and cleanup

Every user email, creator slug, asset slug/title, tag, filename, and Storage object created by the test starts with `codex-qa-<run-id>-<attempt>`. IDs are written to a runner-local state file after each successful creation. The unconditional cleanup step removes only those recorded Storage paths, claims, deliverables, assets, creators, and Auth users. The state file is never uploaded.

Cleanup failure fails the workflow. Operators must then use the run ID shown in the sanitized report to identify only that run's `codex-qa-` records; they must not use broad deletion queries.

## Local validation

The non-production checks can be run without secrets:

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run build
```

Do not execute `scripts/production-free-asset-qa.mjs run` locally against production. Production execution belongs exclusively in the protected GitHub environment.
