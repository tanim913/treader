-- 0002: bookmarks and reading progress saved per account.
-- Only adds a column and a trigger. chapters and chapter_bodies are untouched.

-- A bookmark's quote is stored scrambled with one of the server's cipher keys
-- (the server writes it; plain chapter text never reaches the browser or the API).
-- k says which key, so the reader draws the quote with the matching font.
alter table public.notes
  add column k smallint not null default 0 check (k between 0 and 63);

-- Progress gets its time from the database clock, not the reader's device.
create trigger progress_touch before update on public.reading_progress
  for each row execute function public.touch_updated_at();
