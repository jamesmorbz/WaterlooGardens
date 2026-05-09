-- email belongs in auth.users only, not in public.profiles.
-- The register action never inserted it, causing NOT NULL violations
-- that silently prevented profile rows from being created.
alter table public.profiles drop column if exists email;
