# Content moderation lifecycle rollout (Task 2B)

No command in this task was executed against production Supabase. The SQL under `supabase/audit/` is SELECT-only and intended for a human operator to run manually.

## Implemented state machines

### Assets

`draft → pending_review → published`

`pending_review → rejected`

`rejected → draft` by creator content edit, then `draft/rejected → pending_review` by `submit_asset_for_review()`.

Admin may return `published` or `pending_review` assets to `draft` with `review_asset(..., 'draft', null)` when changes are required. The historical `approved` asset enum value remains for compatibility, but migration reclassifies existing `approved` assets to `pending_review`; new approvals publish directly.

### Creator blog posts

`draft → pending_review → published`

`pending_review → rejected`

`rejected → draft` by creator content edit, then `draft/rejected → pending_review` by `submit_blog_post_for_review()`.

Admin may return `published` or `pending_review` blog posts to `draft` with `review_blog_post(..., 'draft', null)`.

## Ownership and authorization rules

Only approved, active creators may create assets or creator blog drafts for their own creator row. Creator-owned direct updates are constrained to content columns and only while status is `draft` or `rejected`. Creators cannot directly set `published`, cannot edit `pending_review` or `published` rows, and cannot modify another creator's rows. Anonymous users can read only `published` content.

## RPC privilege model

Trusted `SECURITY DEFINER` functions use `set search_path = public`:

- `submit_asset_for_review(uuid)` — granted to `authenticated`; revoked from `PUBLIC` and `anon`.
- `submit_blog_post_for_review(uuid)` — granted to `authenticated`; revoked from `PUBLIC` and `anon`.
- `review_asset(uuid, public.asset_status, text)` — granted to `authenticated`; revoked from `PUBLIC` and `anon`; internally requires `is_admin()`.
- `review_blog_post(uuid, public.publish_status, text)` — granted to `authenticated`; revoked from `PUBLIC` and `anon`; internally requires `is_admin()`.

RPCs verify ownership, approved creator status, allowed current state, allowed target state, non-empty rejection reasons, and admin role where applicable.

## Existing-data classification

Published assets and blog posts remain published. Existing asset `approved` rows are not silently published; they become `pending_review`. Draft, pending-review, and rejected rows remain non-public. Rejected rows must have a rejection reason before the migration proceeds safely.

## Rollout procedure

1. Run `supabase/audit/task_2b_content_moderation_preflight.sql` in production. It returns one JSON value with `ready_for_migration` and instructions.
2. Stop if `ready_for_migration` is false or `manual_review_required` is true. Repair the data manually with an approved plan; do not replay migrations blindly.
3. During an approved low-traffic maintenance window, apply the forward-only migration `20260717000100_content_moderation_lifecycle.sql` using the team's normal migration deployment process.
4. Run `supabase/audit/task_2b_content_moderation_verification.sql` and require `verification_passed = true`.
5. QA creator and admin dashboards on 320, 360, 390, 430 px and desktop widths.

## Rollback / forward repair

Prefer forward repair. If verification fails, do not delete content or replay historical migrations. Add a new migration that restores missing grants, policies, indexes, constraints, or lifecycle columns. If a row was misclassified, update only the affected rows after manual review and preserve published rows unless a business owner explicitly requests unpublishing.

## Manual QA checklist

- Unapproved creator cannot create or submit assets/blog posts.
- Approved creator can create a draft and submit it for review.
- Pending-review and published content cannot be edited by the creator.
- Admin can approve/publish and reject with a meaningful reason.
- Rejection reason appears to the creator.
- Rejected content can be edited and resubmitted.
- Anonymous/public listings, detail pages, and sitemap sources expose only published content.
- Admin moderation queues are usable on 320, 360, 390, 430 px and desktop widths.
- Paid asset pricing and Stripe behavior are unchanged.
