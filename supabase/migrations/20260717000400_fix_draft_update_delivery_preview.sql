-- Task 2D forward-only repair for draft blog updates, private deliverables, and moderation previews.
-- Does not modify historical Task 2B/2C migrations or published content.

revoke update on public.blog_posts from authenticated;
grant update (slug, title, excerpt, category, body) on public.blog_posts to authenticated;

grant select on public.blog_posts to authenticated;
grant select on public.assets to authenticated;
grant select, insert, update on public.asset_deliverables to authenticated;

-- Keep creator delivery uploads ownership-safe and aligned with the app path: creator_id/asset_id/file.
drop policy if exists "creators upload own asset deliverables" on storage.objects;
create policy "creators upload own asset deliverables"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'asset-deliverables'
  and exists (
    select 1
    from public.assets
    join public.creators on creators.id = assets.creator_id
    where creators.id::text = (storage.foldername(name))[1]
      and assets.id::text = (storage.foldername(name))[2]
      and creators.profile_id = auth.uid()
      and creators.active = true
      and creators.application_status = 'approved'
      and assets.status in ('draft', 'rejected')
  )
);

drop policy if exists "creators update own asset deliverable files" on storage.objects;
create policy "creators update own asset deliverable files"
on storage.objects for update to authenticated
using (
  bucket_id = 'asset-deliverables'
  and exists (
    select 1 from public.assets
    join public.creators on creators.id = assets.creator_id
    where creators.id::text = (storage.foldername(name))[1]
      and assets.id::text = (storage.foldername(name))[2]
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
    where creators.id::text = (storage.foldername(name))[1]
      and assets.id::text = (storage.foldername(name))[2]
      and creators.profile_id = auth.uid()
      and creators.active = true
      and creators.application_status = 'approved'
      and assets.status in ('draft', 'rejected')
  )
);
