-- 0007: more than one narration voice per chapter, and readers asking for audio.
-- chapters and chapter_bodies are untouched.

-- ---------------------------------------------------------------- one row per chapter per voice
alter table public.chapter_audio drop constraint chapter_audio_pkey;
update public.chapter_audio set voice = 'bm_george' where voice in ('', 'Kokoro', 'Kokoro bm_george');
alter table public.chapter_audio alter column voice drop default;
alter table public.chapter_audio add constraint chapter_audio_voice_name check (voice ~ '^[a-z]{2}_[a-z]+$');
alter table public.chapter_audio add primary key (chapter_id, voice);

-- ---------------------------------------------------------------- audio requests
-- A signed-in reader asks for a chapter's audio, or the whole book's (chapter_id null).
-- One request per person per chapter or book. Only the reader and admins see requests.
create table public.audio_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  book_id uuid not null references public.books (id) on delete cascade,
  chapter_id uuid references public.chapters (id) on delete cascade,
  created_at timestamptz not null default now(),
  seen_at timestamptz -- when the reader dismissed the "now with audio" notice
);
create unique index audio_requests_one on public.audio_requests
  (user_id, book_id, coalesce(chapter_id, '00000000-0000-0000-0000-000000000000'::uuid));
create index audio_requests_book_idx on public.audio_requests (book_id);

alter table public.audio_requests enable row level security;
revoke all on public.audio_requests from anon, authenticated;
grant select, insert, delete on public.audio_requests to authenticated;
grant update (seen_at) on public.audio_requests to authenticated;

create policy audio_requests_read on public.audio_requests for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

create policy audio_requests_insert on public.audio_requests for insert to authenticated
  with check (
    user_id = auth.uid() and not public.is_banned() and seen_at is null
    and public.book_is_live(book_id)
    and (chapter_id is null or exists (
      select 1 from public.chapters c
      where c.id = audio_requests.chapter_id and c.book_id = audio_requests.book_id
        and public.chapter_is_live(c.id)))
  );

create policy audio_requests_update on public.audio_requests for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy audio_requests_delete on public.audio_requests for delete to authenticated
  using (user_id = auth.uid() or public.is_admin());
