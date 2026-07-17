-- Task 2B enum preparation for creator-blog moderation states.
-- Split from the lifecycle migration because PostgreSQL enum values added with
-- ALTER TYPE cannot be used safely by later statements in the same transaction.

alter type public.publish_status add value if not exists 'pending_review';
alter type public.publish_status add value if not exists 'rejected';
