-- Add user_type (leaseholder or tenant) to profiles
alter table public.profiles
  add column if not exists user_type text not null default 'leaseholder'
  check (user_type in ('leaseholder', 'tenant'));

-- Add keyword tags to documents
alter table public.documents
  add column if not exists tags text[] not null default '{}';

-- Storage: allow directors to upload to the documents bucket
do $$ begin
  create policy "Directors can upload to documents bucket"
    on storage.objects for insert
    to authenticated
    with check (bucket_id = 'documents' and public.is_director());
exception when duplicate_object then null;
end $$;

-- Storage: allow approved users to read from documents bucket (for signed URL generation)
do $$ begin
  create policy "Approved users can read documents bucket"
    on storage.objects for select
    to authenticated
    using (bucket_id = 'documents' and public.is_approved());
exception when duplicate_object then null;
end $$;
