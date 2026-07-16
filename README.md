# Make Better

## Supported runtime

- Node.js: 20.x (`package.json` enforces `>=20 <21`).
- npm: 10 or newer.
- Install dependencies with `npm ci` for repeatable lockfile-based installs.

## Local setup

1. Install Node 20 and npm 10+.
2. Run `npm ci`.
3. Optional local Supabase values may be placed in `.env.local` for manual development. CI and repository validation do not require production Supabase secrets and must not connect to production.
4. Run `npm run dev` for local development.

## Required validation commands

Before opening or updating a PR, run:

```sh
npm run audit:safety
npm run validate:migrations
npm run typecheck
npm run lint
npm test
npm run build
npm audit --omit=dev --audit-level=high
```

`npm run ci:check` runs the repository-owned gates in the same order: audit safety, migration validation, typecheck, lint, tests, and build. Production dependency audit remains an explicit separate command so its high/critical vulnerability policy is visible in CI logs.

## CI quality gates

GitHub Actions runs on pull requests and pushes to `main` with read-only repository permissions, npm caching through `actions/setup-node`, and concurrency cancellation for superseded runs. The workflow uses Node 20, installs with `npm ci`, runs `npm run ci:check`, and then runs `npm audit --omit=dev --audit-level=high`.

The workflow does not define Supabase environment variables, does not require production secrets, does not run linked-project commands, and does not connect to production Supabase.


## Dependency audit baseline

GitHub Quality gates for PR #6 produced the actionable baseline after the local environment could not reach the npm advisory endpoint:

- Full install audit: 19 vulnerabilities total — 6 moderate, 12 high, and 1 critical.
- Production audit (`npm audit --omit=dev`): 10 vulnerabilities total — 3 moderate and 7 high.
- Reported production paths included `@remix-run/router` through `react-router`/`react-router-dom`, plus build-tooling packages that were incorrectly classified as production-reachable because `tailwindcss-animate` was listed as an application dependency: `glob`, `minimatch`, `brace-expansion`, `picomatch`, `postcss`, and `yaml`.

After this update, `tailwindcss-animate` is classified as a development dependency because it is only loaded by `tailwind.config.ts` during CSS generation, not by browser runtime code. This moves the Tailwind/PostCSS toolchain out of the production dependency graph while preserving the build and generated UI behavior. The production audit gate remains enabled in CI and must pass before merge.

## Dependency update policy

- Inspect `package.json` and `package-lock.json` before dependency changes.
- Use `npm audit` and `npm audit --omit=dev` to separate development-only and production vulnerabilities.
- Prefer the smallest compatible patch or minor upgrades that resolve known high/critical production vulnerabilities.
- Do not use `npm audit fix --force`.
- Do not blindly upgrade every package to latest.
- Avoid major-version upgrades unless required to resolve a production vulnerability and compatibility is verified with the full validation suite.

## Vulnerability exception policy

If a vulnerability cannot be safely removed in the same task, document the package, dependency path, severity, production reachability, available fix, reason for deferral, and a concrete follow-up task. High/critical production vulnerabilities must either be resolved or have an explicit documented exception before merge.
