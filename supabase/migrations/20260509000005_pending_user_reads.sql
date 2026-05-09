-- Pending (and any other) authenticated users can read public content.
-- Channels, posts, and comments are publicly browsable — the anon policy
-- already covers unauthenticated visitors, but authenticated users go through
-- the authenticated role which previously required is_approved(). This adds
-- an open read policy for the authenticated role so pending users aren't 404'd.

create policy "Any authenticated user can read channels"
  on public.channels for select
  to authenticated
  using (true);

create policy "Any authenticated user can read posts"
  on public.posts for select
  to authenticated
  using (true);

create policy "Any authenticated user can read comments"
  on public.comments for select
  to authenticated
  using (true);
