-- Task 2D forward-only privilege and private-delivery repair.
-- This migration changes grants and policies only; it never rewrites content rows.

-- A table-level UPDATE grant includes every column. Remove every browser grant first,
-- then restore only the creator-editable draft fields. SECURITY DEFINER functions
-- retain their owner privileges and are therefore unaffected by these revokes.
revoke update on public.blog_posts from public, anon, authenticated;
grant update (slug, title, excerpt, category, body)
on public.blog_posts to authenticated;

drop policy if exists "approved creators can update own editable blog posts" on public.blog_posts;
create policy "approved creators can update own editable blog posts"
on public.blog_posts for update to authenticated
using (
  status in ('draft', 'rejected')
  and exists (
    select 1 from public.creators
    where creators.id = blog_posts.creator_id
      and creators.profile_id = auth.uid()
      and creators.active = true
      and creators.application_status = 'approved'
  )
)
with check (
  status in ('draft', 'rejected')
  and exists (
    select 1 from public.creators
    where creators.id = blog_posts.creator_id
      and creators.profile_id = auth.uid()
      and creators.active = true
      and creators.application_status = 'approved'
  )
);

-- Existing grants are harmless: GRANT is idempotent and normalizes both states.
grant insert, update on public.asset_deliverables to authenticated;

drop policy if exists "creators can create own deliverables" on public.asset_deliverables;
create policy "creators can create own deliverables"
on public.asset_deliverables for insert to authenticated
with check (
  public.is_admin()
  or exists (
    select 1 from public.assets
    join public.creators on creators.id = assets.creator_id
    where assets.id = asset_deliverables.asset_id
      and assets.status in ('draft', 'rejected')
      and creators.profile_id = auth.uid()
      and creators.active = true
      and creators.application_status = 'approved'
  )
);

drop policy if exists "creators can update own deliverables" on public.asset_deliverables;
create policy "creators can update own deliverables"
on public.asset_deliverables for update to authenticated
using (
  public.is_admin()
  or exists (
    select 1 from public.assets
    join public.creators on creators.id = assets.creator_id
    where assets.id = asset_deliverables.asset_id
      and assets.status in ('draft', 'rejected')
      and creators.profile_id = auth.uid()
      and creators.active = true
      and creators.application_status = 'approved'
  )
)
with check (
  public.is_admin()
  or exists (
    select 1 from public.assets
    join public.creators on creators.id = assets.creator_id
    where assets.id = asset_deliverables.asset_id
      and assets.status in ('draft', 'rejected')
      and creators.profile_id = auth.uid()
      and creators.active = true
      and creators.application_status = 'approved'
  )
);

-- A creator may write only beneath creator-id/asset-id, and only while that
-- referenced asset is an editable draft/rejected asset they own.
drop policy if exists "creators upload own asset deliverables" on storage.objects;
create policy "creators upload own editable asset deliverables"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'asset-deliverables'
  and exists (
    select 1 from public.assets
    join public.creators on creators.id = assets.creator_id
    where creators.id::text = (storage.foldername(storage.objects.name))[1]
      and assets.id::text = (storage.foldername(storage.objects.name))[2]
      and assets.status in ('draft', 'rejected')
      and creators.profile_id = auth.uid()
      and creators.active = true
      and creators.application_status = 'approved'
  )
);

drop policy if exists "creators update own asset deliverable files" on storage.objects;
create policy "creators update own editable asset deliverables"
on storage.objects for update to authenticated
using (
  bucket_id = 'asset-deliverables'
  and exists (
    select 1 from public.assets
    join public.creators on creators.id = assets.creator_id
    where creators.id::text = (storage.foldername(storage.objects.name))[1]
      and assets.id::text = (storage.foldername(storage.objects.name))[2]
      and assets.status in ('draft', 'rejected')
      and creators.profile_id = auth.uid()
      and creators.active = true
      and creators.application_status = 'approved'
  )
)
with check (
  bucket_id = 'asset-deliverables'
  and exists (
    select 1 from public.assets
    join public.creators on creators.id = assets.creator_id
    where creators.id::text = (storage.foldername(storage.objects.name))[1]
      and assets.id::text = (storage.foldername(storage.objects.name))[2]
      and assets.status in ('draft', 'rejected')
      and creators.profile_id = auth.uid()
      and creators.active = true
      and creators.application_status = 'approved'
  )
);
