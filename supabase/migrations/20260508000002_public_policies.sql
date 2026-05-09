-- Allow unauthenticated reads so the portal can be browsed without login.
-- Write operations are still gated by is_approved() / is_director().

create policy "Anyone can read profiles"
  on public.profiles for select
  to anon
  using (true);

create policy "Anyone can read channels"
  on public.channels for select
  to anon
  using (true);

create policy "Anyone can read posts"
  on public.posts for select
  to anon
  using (true);

create policy "Anyone can read comments"
  on public.comments for select
  to anon
  using (true);
