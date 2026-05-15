-- Add audience field to documents
alter table public.documents
  add column audience text not null default 'all'
    check (audience in ('all', 'leaseholders'));

-- Drop the blanket "approved users can read" policy
drop policy if exists "Approved users can read documents" on public.documents;

-- New read policy: directors always see all; approved leaseholders see all;
-- approved tenants/others only see audience='all' documents.
create policy "Users can read documents based on audience"
  on public.documents for select
  using (
    public.is_director() or (
      public.is_approved() and (
        audience = 'all' or
        exists (
          select 1 from public.profiles
          where id = auth.uid() and user_type = 'leaseholder'
        )
      )
    )
  );
