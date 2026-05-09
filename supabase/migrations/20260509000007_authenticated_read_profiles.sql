-- Authenticated users (any status) can read all profiles.
-- This is needed to display author names and flat numbers on posts/comments.
-- Anon already had this via the public_policies migration; authenticated users
-- previously could only read their own profile, making author names invisible
-- in channels for non-director users.
create policy "Any authenticated user can read all profiles"
  on public.profiles for select
  to authenticated
  using (true);
