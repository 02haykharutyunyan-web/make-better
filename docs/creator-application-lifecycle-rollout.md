# Creator application lifecycle rollout (Task 2A)

## Scope

This change introduces explicit creator application states (`pending`, `approved`, and `rejected`), an admin review queue, an applicant reapplication flow, route guards, and RLS enforcement for creator asset/blog submissions.

It does **not** enable Stripe or paid listings. Paid listings remain a later task and will require the separate 3 approved blogs + 3 approved free assets eligibility rule.

## Security model

- New creator accounts start as `pending`.
- Only the security-definer `review_creator_application` RPC may approve or reject an application.
- The RPC checks the caller is an admin, locks the row, accepts only pending applications, requires a rejection reason, and prevents self-review.
- Rejected applicants resubmit only through `reapply_creator_application`.
- Browser clients cannot directly update creator review/system fields.
- Approved and active creators alone can enter submission pages and pass asset/blog RLS policies.
- Featured status is changed through a separate admin-only RPC.

## Existing creator backfill

The migration intentionally preserves established marketplace content:

- unlinked legacy/seed creators are approved;
- creators with already-published assets or blog posts are approved;
- linked creators without published content enter `pending`.

The preflight reports how many linked creators would enter review. If this count is greater than zero, stop and manually classify those creator rows before migration rather than accepting an accidental status change.

## Required production order

1. Merge the PR only after CI and preview QA pass.
2. Do **not** rely on Vercel deployment to apply Supabase SQL.
3. In Supabase SQL Editor, run `supabase/audit/task_2a_creator_lifecycle_preflight.sql`.
4. Continue only when `ready_for_migration = true`.
5. Run the exact migration `supabase/migrations/20260716000200_creator_application_lifecycle.sql` once, during an approved low-traffic maintenance window.
6. Run `supabase/audit/task_2a_creator_lifecycle_verification.sql`.
7. Require `verification_passed = true`.
8. Perform the manual QA below.

Because production migration history is not yet baselined, do not use `supabase db push`, migration replay, repair, reset, or mark-applied commands.

## Manual QA

### Pending applicant

- Sign up as a creator.
- Confirm the dashboard shows pending.
- Direct navigation to submit/edit routes returns to the dashboard.
- Asset/blog insert attempts are rejected by RLS.

### Admin review

- Confirm the application appears in the pending queue.
- Reject cannot run without a reason.
- Approve/reject asks for confirmation.
- A stale second review fails because only pending rows are reviewable.
- An admin cannot review their own linked creator application.

### Rejected applicant

- Confirm the rejection reason is visible only to the applicant/admin.
- Edit allowed profile fields.
- Resubmit once.
- Confirm status becomes pending and the previous reason clears.

### Approved creator

- Confirm submit/edit routes open.
- Confirm asset and creator-blog draft submissions work.
- Confirm profile edits do not change application status.

### Existing content

- Confirm existing public creator, asset, and blog pages remain visible.
- Confirm legacy creators with published content remain approved.

## Rollback and recovery

Do not attempt destructive down migrations in production. If verification fails, stop application rollout, keep the evidence, and prepare a reviewed forward-only repair. Never rerun the migration blindly.

## Mobile acceptance

Admin queue and applicant states must be usable at 320, 360, 390, and 430 px widths with no horizontal scrolling, readable rejection reasons, and touch targets of at least 44 px.
