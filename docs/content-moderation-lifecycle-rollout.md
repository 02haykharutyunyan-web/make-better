# Content moderation lifecycle rollout (Task 2B)

No command in this task was executed against production Supabase. The SQL under `supabase/audit/` is SELECT-only and intended for a human operator to run manually.

## Implemented state machines

### Assets

`draft → pending_review → published`

`pending_review → rejected`

`rejected → draft` by creator content edit, then `draft/rejected → pending_review` by `submit_asset_for_review()`.

Admin may return `published` or `pending_review` assets to `draft` with `review_asset(..., 'draft', null)` when changes are required. The historical `approved` asset enum value remains only for compatibility and existing-data review; Task 2B does not silently publish or unpublish approved rows.

### Creator blog posts

`draft → pending_review → published`

`pending_review → rejected`

`rejected → draft` by creator content edit, then `draft/rejected → pending_review` by `submit_blog_post_for_review()`.

Admin may return `published` or `pending_review` blog posts to `draft` with `review_blog_post(..., 'draft', null)`.

## Ownership and authorization rules

Each submit RPC and creator INSERT/UPDATE policy explicitly checks both ownership and approval:

- the content row's `creator_id` must match a row in `public.creators`;
- that creator row must have `profile_id = auth.uid()`;
- that creator row must be `active = true`;
- that creator row must have `application_status = 'approved'`.

Creator-owned direct updates are constrained to content columns and only while status is `draft` or `rejected`. Creators cannot directly set `published`, cannot edit `pending_review` or `published` rows, and cannot modify another creator's rows. Anonymous users can read only `published` content.

## RPC privilege model

Trusted `SECURITY DEFINER` functions use `set search_path = public` and row locks for target content rows:

- `submit_asset_for_review(uuid)` — granted to `authenticated`; revoked from `PUBLIC` and `anon`; verifies owner + active approved creator and `draft/rejected` current state.
- `submit_blog_post_for_review(uuid)` — granted to `authenticated`; revoked from `PUBLIC` and `anon`; verifies owner + active approved creator and `draft/rejected` current state.
- `review_asset(uuid, public.asset_status, text)` — granted to `authenticated`; revoked from `PUBLIC` and `anon`; internally requires `is_admin()`; approves/rejects only `pending_review`, returns only `published/pending_review` to draft, and requires rejection reason.
- `review_blog_post(uuid, public.publish_status, text)` — granted to `authenticated`; revoked from `PUBLIC` and `anon`; internally requires `is_admin()`; approves/rejects only `pending_review`, returns only `published/pending_review` to draft, and requires rejection reason.
- `set_asset_featured(uuid, boolean)` — granted to `authenticated`; revoked from `PUBLIC` and `anon`; internally requires `is_admin()` and is the only browser-safe way to toggle asset featured status.

No client-executable helper is required for creator editability; policies inline their state/ownership checks.

## Existing-data classification

Published assets and blog posts remain published. Draft, pending-review, rejected, and approved asset rows remain non-public unless an operator makes an explicit classification decision. If any `approved` assets exist, preflight returns `ready_for_migration = false` and `manual_review_required = true` so operators can choose one of these safe paths before migration:

1. keep `approved` temporarily for compatibility and schedule a follow-up classification migration;
2. return selected rows to `draft` for creator changes;
3. move selected rows to `pending_review` for admin review.

Do not silently publish or unpublish approved assets. Rejected rows must have rejection reasons before rollout.

## Enum transaction safety

PostgreSQL does not safely allow newly added enum values to be used by later statements in the same transaction. Supabase migrations are commonly applied transactionally, so Task 2B is split into two forward-only migrations: first add `publish_status` enum values, then use those values in the lifecycle migration. No `BEGIN`/`COMMIT` workaround is used inside migration files.

## Preflight → migration → verification procedure

1. Run `supabase/audit/task_2b_content_moderation_preflight.sql` in production. It returns one JSON value with `ready_for_migration`, aggregate `baseline_counts`, and `verification_operator_inputs`.
2. Save the JSON output as the operator baseline. It contains only aggregate counts and exposes no emails, secrets, private content, or customer rows.
3. Stop if `ready_for_migration` is false or `manual_review_required` is true. Repair/classify data manually with an approved plan; do not replay migrations blindly.
4. During an approved low-traffic maintenance window, apply `20260717000100_content_moderation_blog_status_enum.sql`, then `20260717000200_content_moderation_lifecycle.sql` using the team's normal migration deployment process.
5. Run `supabase/audit/task_2b_content_moderation_verification.sql` and require `verification_passed = true`.
6. Compare `published_content_counts_after` to the saved preflight baseline. Published counts must not decrease, and any increase must match explicit admin approvals during the rollout window.
7. QA creator and admin dashboards on 320, 360, 390, 430 px and desktop widths.

## Rollback / forward repair

Prefer forward repair. If verification fails, do not delete content or replay historical migrations. Add a new migration that restores missing grants, policies, indexes, constraints, enum values, or lifecycle columns. If a row was misclassified, update only the affected rows after manual review and preserve published rows unless a business owner explicitly requests unpublishing.

## Manual QA checklist

- Unapproved creator cannot create or submit assets/blog posts.
- Approved creator can save asset/blog drafts and explicitly submit them for review.
- Delivery upload failures keep asset drafts out of review until the creator fixes delivery and submits again.
- Pending-review and published content cannot be edited by the creator.
- Admin can approve/publish and reject with a meaningful reason.
- Admin can return published/pending content to draft with confirmation.
- Admin can feature/unfeature assets through trusted RPC-backed controls.
- Rejection reason appears to the creator.
- Rejected content can be edited and resubmitted.
- Anonymous/public listings, detail pages, and sitemap sources expose only published content.
- Admin moderation queues are usable on 320, 360, 390, 430 px and desktop widths.
- Paid asset pricing and Stripe behavior are unchanged.
