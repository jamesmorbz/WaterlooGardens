-- Enable RLS on all tables
alter table public.profiles  enable row level security;
alter table public.channels  enable row level security;
alter table public.posts     enable row level security;
alter table public.comments  enable row level security;
alter table public.documents enable row level security;

-- profiles
create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Directors can read all profiles"
  on public.profiles for select
  using (public.is_director());

create policy "Users can insert own profile on registration"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Directors can update any profile"
  on public.profiles for update
  using (public.is_director());

-- channels (readable by all approved users)
create policy "Approved users can read channels"
  on public.channels for select
  using (public.is_approved());

-- posts
create policy "Approved users can read posts"
  on public.posts for select
  using (public.is_approved());

create policy "Residents can post in resident channels"
  on public.posts for insert
  with check (
    public.is_approved() and
    exists (
      select 1 from public.channels
      where id = channel_id and post_role = 'resident'
    )
  );

create policy "Directors can post in any channel"
  on public.posts for insert
  with check (public.is_director());

create policy "Directors can update posts (pin/unpin)"
  on public.posts for update
  using (public.is_director());

create policy "Directors can delete any post"
  on public.posts for delete
  using (public.is_director());

create policy "Authors can delete own posts"
  on public.posts for delete
  using (auth.uid() = author_id);

-- comments
create policy "Approved users can read comments"
  on public.comments for select
  using (public.is_approved());

create policy "Approved users can create comments"
  on public.comments for insert
  with check (public.is_approved());

create policy "Directors can delete any comment"
  on public.comments for delete
  using (public.is_director());

create policy "Authors can delete own comments"
  on public.comments for delete
  using (auth.uid() = author_id);

-- documents (read-only from the app; directors manage via Supabase dashboard)
create policy "Approved users can read documents"
  on public.documents for select
  using (public.is_approved());
