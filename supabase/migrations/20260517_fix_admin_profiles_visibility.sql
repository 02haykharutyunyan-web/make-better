-- Explicit production repair for /admin/users profile visibility.
-- Frontend reads from public.profiles only; auth.users remains server-only.
-- Non-admin users keep access only to their own profile through existing policies.

drop policy if exists "admins can read all profiles" on public.profiles;
create policy "admins can read all profiles"
on public.profiles for select
to authenticated
using (public.is_admin());

drop policy if exists "admins can update all profiles" on public.profiles;
create policy "admins can update all profiles"
on public.profiles for update
to authenticated
using (public.is_admin())
with check (public.is_admin());
