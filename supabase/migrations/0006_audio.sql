-- 0006: chapter audio, chosen book by book. Off for every book until an admin switches it on.
-- Files live in a private Storage bucket and are played through short-lived signed links.
-- Only the app's server (service key, after checking the admin role) writes any of this.
-- chapters and chapter_bodies are untouched.

alter table public.books
  add column audio_enabled boolean not null default false;
-- no update grant: writers can't switch it on themselves

create table public.chapter_audio (
  chapter_id uuid primary key references public.chapters (id) on delete cascade,
  path text not null,
  bytes int not null check (bytes > 0),
  duration_s int not null check (duration_s >= 0),
  voice text not null default '' check (char_length(voice) <= 60),
  created_at timestamptz not null default now()
);

alter table public.chapter_audio enable row level security;
revoke all on public.chapter_audio from anon, authenticated;
grant select on public.chapter_audio to anon, authenticated;

-- readers see that a chapter has audio only when it is live and its book has audio switched on
create policy chapter_audio_read on public.chapter_audio for select
  using (
    (public.chapter_is_live(chapter_id) and exists (
      select 1 from public.chapters c join public.books b on b.id = c.book_id
      where c.id = chapter_id and b.audio_enabled))
    or public.is_admin()
  );

-- private bucket: MP3 only, 50 MB a file; no storage policies, so only the service key reaches it
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('audio', 'audio', false, 52428800, array['audio/mpeg'])
on conflict (id) do nothing;
