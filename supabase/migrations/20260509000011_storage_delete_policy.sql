-- Allow directors to delete files from the documents bucket.
-- Missing policy was causing storage.remove() to fail silently on document deletion.
create policy "Directors can delete from documents bucket"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'documents' and public.is_director());
