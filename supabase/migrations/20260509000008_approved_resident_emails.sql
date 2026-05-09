-- Returns the emails of all approved residents.
-- Runs as postgres (security definer) so it can access auth.users.
-- The is_director() guard ensures only directors can get results.
create or replace function public.get_approved_resident_emails()
returns text[]
language sql
security definer
set search_path = public
as $$
  select array_agg(u.email)
  from auth.users u
  join public.profiles p on p.id = u.id
  where p.status = 'approved'
    and public.is_director()
$$;
