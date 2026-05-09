-- Directors can insert document rows via the Director Panel upload UI
create policy "Directors can insert documents"
  on public.documents for insert
  with check (public.is_director());

-- Directors can delete documents
create policy "Directors can delete documents"
  on public.documents for delete
  using (public.is_director());
