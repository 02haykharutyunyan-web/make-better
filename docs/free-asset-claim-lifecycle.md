# Free asset email claim lifecycle (Task 3)

## Lifecycle and security boundary

The public page exposes only published asset metadata. Its **Claim free asset** action asks an unauthenticated visitor only for an email address and calls Supabase passwordless OTP with a fixed same-origin callback (`/auth/free-claim?asset=<uuid>`). Supabase sends the link to that exact email. The callback accepts only a UUID asset intent, rejects auth errors, establishes the Supabase session, and calls `public.claim_free_asset(uuid)`.

The security-definer function derives the owner from `auth.uid()` and re-reads the asset in the database. It accepts only `status = 'published'`, `price_type = 'free'`, `is_free = true`, and `price = 0`. The existing `(user_id, asset_id)` unique constraint plus `INSERT ... ON CONFLICT DO NOTHING` makes refreshes and concurrent claims idempotent. Direct buyer claim inserts are removed; admin claim management remains governed by the existing admin RLS policy. Delivery metadata and the private Storage bucket remain inaccessible until the authenticated owner has an unlocked claim. A published-state check was added to buyer delivery authorization.

The callback clears its asset query after a confirmed claim and uses the slug returned by the trusted claim RPC to offer a return to that exact asset. It never accepts a browser-provided email, owner, price, status, delivery location, or destination URL as authorization. Paid assets continue to use the existing waitlist only; this work does not add checkout.

## Supabase configuration

Set local values (never service-role credentials) in `.env.local`:

```text
VITE_SUPABASE_URL=https://PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=PUBLIC_ANON_KEY
```

In **Authentication → URL Configuration**, set the correct Site URL and add every deployed/local callback origin explicitly, for example:

```text
http://localhost:8080/auth/free-claim
https://YOUR_APP_HOST/auth/free-claim
```

Keep email confirmations/passwordless email enabled and configure an SMTP provider appropriate for the environment. Do not use wildcard production redirect origins. Existing password login routes are unchanged.

## Migration and verification

Apply `supabase/migrations/20260725000100_secure_free_asset_claim.sql` first in a non-production project and run `supabase/audit/task_3_free_claim_verification.sql`; every returned boolean must be true. After that validation, production deployment is a deliberate operator action:

1. In the production Supabase SQL Editor, open a new query and paste the **complete, unchanged** contents of `supabase/migrations/20260725000100_secure_free_asset_claim.sql`. Confirm the selected project is production, then run it once. The migration is idempotent for functions/policies and does not rewrite claim data.
2. Open a second query, paste the complete contents of `supabase/audit/task_3_free_claim_verification.sql`, and run it. Stop rollout if any returned boolean is false; do not weaken RLS or make the bucket public to proceed.
3. Record `20260725000100_secure_free_asset_claim.sql` as applied in the team's migration ledger using the normal Supabase migration process. Do not run seed/demo SQL in production.
4. Confirm the production Auth Site URL and exact `/auth/free-claim` redirect allow-list entry, deploy the application commit, then run the protected **Production free-asset QA** GitHub workflow from the default branch.

The exact production SQL is the migration file itself rather than a copied excerpt in this document, preventing the operational instructions from drifting from the reviewed SQL.

For local checks:

```bash
npm run ci:check
git diff --check
```

Integration verification requires a disposable Supabase project with Auth email delivery and the migrations applied. Create users/assets through supported application or test APIs, not production fixtures.

## Manual QA checklist

- Open a published free asset signed out; confirm the CTA says **Claim free asset** and the dialog asks only for email.
- Validate malformed email, sending, sent confirmation, the 60-second resend cooldown, and a second send.
- Open valid, expired, malformed, and already-used links; confirm no success is shown before the claim RPC confirms.
- Confirm a new passwordless user receives a buyer profile from the existing auth trigger.
- Confirm first claim, refreshed callback, and reopened callback yield one ownership row and a clear claimed/already-claimed state; use **Return to asset** to reach the same asset detail page.
- Confirm paid, draft, pending, approved-but-unpublished, rejected, deleted, and missing-delivery assets fail safely.
- Confirm My Assets requires authentication, lists only the current user's claims, and handles empty/error/missing delivery states.
- Confirm the owner can open file/link/text delivery; signed-out and second-user attempts cannot read metadata or create a signed URL.
- Regression-check email/password login, creator submissions, admin moderation, blog routes, and paid waitlist behavior.

## Rollback and deferred verification

Rollback should be a new forward migration: revoke `claim_free_asset`, restore the prior `can_access_asset_delivery` definition if necessary, and restore a buyer insert policy only after a security review. Do not delete ownership rows: they are user data. If Auth/SMTP/non-production database credentials are unavailable, SQL execution, real email delivery, expiry behavior, Storage signed URLs, and cross-user RLS must remain explicitly unverified; static tests are not proof of the complete lifecycle.
