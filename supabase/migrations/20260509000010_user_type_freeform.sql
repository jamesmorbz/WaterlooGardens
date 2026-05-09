-- Allow free-form user types beyond leaseholder/tenant (e.g. "Realtor", "Estate Agent").
-- Drop the enum-style check and replace with a simple non-empty constraint.
alter table public.profiles drop constraint if exists profiles_user_type_check;
alter table public.profiles add constraint profiles_user_type_nonempty
  check (length(trim(user_type)) > 0);
