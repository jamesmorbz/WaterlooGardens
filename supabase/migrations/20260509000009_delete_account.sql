-- Allows a user to delete their own account.
-- Runs as postgres (security definer) so it can delete from auth.users.
-- The cascade on profiles.id → auth.users.id removes the profile row.
-- Posts and comments keep their content but have author_id set to null.
create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;
