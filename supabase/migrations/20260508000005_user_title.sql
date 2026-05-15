-- Purple Signals — add optional job title to users (UI alignment pass)
-- The sidebar user card shows "Name / Title · Org" per the screenshot mocks.
-- Title is nullable; nothing breaks if it's not set.

ALTER TABLE public.users
  ADD COLUMN title TEXT;
