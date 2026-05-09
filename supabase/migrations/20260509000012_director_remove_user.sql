-- Allows a director to delete any resident's account.
-- Runs as postgres (security definer) so it can delete from auth.users.
-- Guards: caller must be an approved director; cannot delete themselves.
create or replace function public.director_remove_user(target_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_director() then
    raise exception 'Not authorised';
  end if;
  if target_id = auth.uid() then
    raise exception 'Cannot remove your own account via this function';
  end if;
  delete from auth.users where id = target_id;
end;
$$;
