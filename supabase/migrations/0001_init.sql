-- treader: initial schema with row-level security on every table.
-- Chapter text lives in chapter_bodies, which only its author can read;
-- readers get it from the app's protected read route (service key, server side).

-- handles and slugs are lowercase-only by their checks, so plain text is enough

-- ---------------------------------------------------------------- types
create type public.user_role as enum ('reader', 'admin');
create type public.book_status as enum ('draft', 'published');
create type public.chapter_status as enum ('draft', 'scheduled', 'published');
create type public.report_target as enum ('book', 'chapter', 'comment', 'profile');
create type public.report_status as enum ('open', 'resolved', 'dismissed');
create type public.note_kind as enum ('bookmark');

-- ---------------------------------------------------------------- tables
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  handle text not null unique check (handle ~ '^[a-z0-9_]{3,24}$'),
  handle_chosen boolean not null default false,
  display_name text not null check (char_length(display_name) between 1 and 60),
  bio text not null default '' check (char_length(bio) <= 400),
  avatar_url text,
  role public.user_role not null default 'reader',
  banned boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.reader_settings (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table public.books (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  title text not null check (char_length(title) between 1 and 160),
  blurb text not null default '' check (char_length(blurb) <= 2000),
  cloth text not null default 'oxblood'
    check (cloth in ('oxblood', 'bottle', 'indigo', 'ochre', 'slate', 'rust', 'plum', 'teal')),
  cover_url text,
  status public.book_status not null default 'draft',
  completed boolean not null default false,
  hidden_by_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index books_author_idx on public.books (author_id);

create table public.chapters (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books (id) on delete cascade,
  number int not null check (number > 0),
  title text not null check (char_length(title) between 1 and 200),
  status public.chapter_status not null default 'draft',
  publish_at timestamptz,
  word_count int not null default 0 check (word_count >= 0),
  hidden_by_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (book_id, number),
  check (status <> 'scheduled' or publish_at is not null)
);

create table public.chapter_bodies (
  chapter_id uuid primary key references public.chapters (id) on delete cascade,
  content jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  book_id uuid not null references public.books (id) on delete cascade,
  chapter_id uuid not null references public.chapters (id) on delete cascade,
  kind public.note_kind not null default 'bookmark',
  start_p int not null check (start_p >= 0),
  start_o int not null check (start_o >= 0),
  end_p int not null check (end_p >= 0),
  end_o int not null check (end_o >= 0),
  quote text not null check (char_length(quote) <= 1200),
  note text not null default '' check (char_length(note) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index notes_user_book_idx on public.notes (user_id, book_id);

create table public.reading_progress (
  user_id uuid not null references public.profiles (id) on delete cascade,
  book_id uuid not null references public.books (id) on delete cascade,
  chapter_id uuid not null references public.chapters (id) on delete cascade,
  paragraph int not null default 0 check (paragraph >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, book_id)
);

create table public.follows (
  follower_id uuid not null references public.profiles (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, author_id),
  check (follower_id <> author_id)
);
create index follows_author_idx on public.follows (author_id);

create table public.likes (
  user_id uuid not null references public.profiles (id) on delete cascade,
  chapter_id uuid not null references public.chapters (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, chapter_id)
);
create index likes_chapter_idx on public.likes (chapter_id);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  parent_id uuid references public.comments (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  hidden_by_admin boolean not null default false,
  created_at timestamptz not null default now(),
  edited_at timestamptz
);
create index comments_chapter_idx on public.comments (chapter_id, created_at);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  target_type public.report_target not null,
  target_id uuid not null,
  reason text not null check (char_length(reason) between 1 and 1000),
  status public.report_status not null default 'open',
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table public.chapter_stats (
  chapter_id uuid primary key references public.chapters (id) on delete cascade,
  reads bigint not null default 0
);

-- ---------------------------------------------------------------- helpers
-- security definer so policies can use them without recursive RLS checks
create function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin' and not banned)
$$;

create function public.is_banned() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select banned from profiles where id = auth.uid()), false)
$$;

create function public.is_book_author(b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from books where id = b and author_id = auth.uid())
$$;

create function public.is_chapter_author(c uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from chapters ch join books bk on bk.id = ch.book_id
    where ch.id = c and bk.author_id = auth.uid())
$$;

create function public.book_is_live(b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from books bk join profiles p on p.id = bk.author_id
    where bk.id = b and bk.status = 'published' and not bk.hidden_by_admin and not p.banned)
$$;

create function public.chapter_is_live(c uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from chapters ch
    where ch.id = c
      and not ch.hidden_by_admin
      and (ch.status = 'published' or (ch.status = 'scheduled' and ch.publish_at <= now()))
      and public.book_is_live(ch.book_id))
$$;

create function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger books_touch before update on public.books for each row execute function public.touch_updated_at();
create trigger chapters_touch before update on public.chapters for each row execute function public.touch_updated_at();
create trigger bodies_touch before update on public.chapter_bodies for each row execute function public.touch_updated_at();
create trigger notes_touch before update on public.notes for each row execute function public.touch_updated_at();
create trigger settings_touch before update on public.reader_settings for each row execute function public.touch_updated_at();

-- A profile for every new account, with a temporary handle the reader can change.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  base text := lower(regexp_replace(split_part(coalesce(new.email, 'reader'), '@', 1), '[^a-zA-Z0-9_]', '', 'g'));
  name text := coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), nullif(new.raw_user_meta_data ->> 'name', ''), base, 'Reader');
begin
  if char_length(base) < 3 then base := 'reader'; end if;
  insert into profiles (id, handle, display_name, avatar_url)
  values (new.id, left(base, 18) || '_' || substr(md5(random()::text), 1, 5), left(name, 60), new.raw_user_meta_data ->> 'avatar_url');
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- Counts a read; the app calls this once per chapter visit.
create function public.record_read(c uuid) returns void
language sql security definer set search_path = public as $$
  insert into chapter_stats (chapter_id, reads) select c, 1 where public.chapter_is_live(c)
  on conflict (chapter_id) do update set reads = chapter_stats.reads + 1
$$;

-- Moderation, for admins only.
create function public.admin_set_hidden(t public.report_target, target uuid, hide boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  if t = 'book' then update books set hidden_by_admin = hide where id = target;
  elsif t = 'chapter' then update chapters set hidden_by_admin = hide where id = target;
  elsif t = 'comment' then update comments set hidden_by_admin = hide where id = target;
  else raise exception 'use admin_set_banned for profiles';
  end if;
end $$;

create function public.admin_set_banned(target uuid, ban boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  if target = auth.uid() then raise exception 'cannot ban yourself'; end if;
  update profiles set banned = ban where id = target;
end $$;

-- ---------------------------------------------------------------- privileges
-- Start from nothing, then grant exactly what each role needs.
revoke all on all tables in schema public from anon, authenticated;
revoke execute on all functions in schema public from anon, authenticated, public;

grant select on public.profiles, public.books, public.chapters, public.follows, public.likes,
  public.comments, public.chapter_stats to anon, authenticated;

grant update (handle, handle_chosen, display_name, bio, avatar_url) on public.profiles to authenticated;
grant select, insert, update on public.reader_settings to authenticated;
grant insert, delete on public.books to authenticated;
grant update (slug, title, blurb, cloth, cover_url, status, completed) on public.books to authenticated;
grant insert, delete on public.chapters to authenticated;
grant update (number, title, status, publish_at, word_count) on public.chapters to authenticated;
grant select, insert, update, delete on public.chapter_bodies to authenticated;
grant select, insert, delete on public.notes to authenticated;
grant update (note) on public.notes to authenticated;
grant select, insert, update, delete on public.reading_progress to authenticated;
grant insert, delete on public.follows, public.likes to authenticated;
grant insert, delete on public.comments to authenticated;
grant update (body, edited_at) on public.comments to authenticated;
grant select, insert on public.reports to authenticated;

grant execute on function public.is_admin(), public.is_banned(), public.is_book_author(uuid),
  public.is_chapter_author(uuid), public.book_is_live(uuid), public.chapter_is_live(uuid)
  to anon, authenticated;
grant execute on function public.record_read(uuid) to anon, authenticated;
grant execute on function public.admin_set_hidden(public.report_target, uuid, boolean),
  public.admin_set_banned(uuid, boolean) to authenticated;

-- ---------------------------------------------------------------- row-level security
alter table public.profiles enable row level security;
alter table public.reader_settings enable row level security;
alter table public.books enable row level security;
alter table public.chapters enable row level security;
alter table public.chapter_bodies enable row level security;
alter table public.notes enable row level security;
alter table public.reading_progress enable row level security;
alter table public.follows enable row level security;
alter table public.likes enable row level security;
alter table public.comments enable row level security;
alter table public.reports enable row level security;
alter table public.chapter_stats enable row level security;

-- profiles: public; each person edits only their own
create policy profiles_read on public.profiles for select using (true);
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- reader settings: private
create policy settings_own on public.reader_settings for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- books: live ones are public; authors see and manage their own
create policy books_read on public.books for select
  using (public.book_is_live(id) or author_id = auth.uid() or public.is_admin());
create policy books_insert on public.books for insert to authenticated
  with check (author_id = auth.uid() and not public.is_banned());
create policy books_update on public.books for update to authenticated
  using (author_id = auth.uid()) with check (author_id = auth.uid() and not public.is_banned());
create policy books_delete on public.books for delete to authenticated using (author_id = auth.uid());

-- chapters: live ones are public; authors see and manage their own
create policy chapters_read on public.chapters for select
  using (public.chapter_is_live(id) or public.is_book_author(book_id) or public.is_admin());
create policy chapters_insert on public.chapters for insert to authenticated
  with check (public.is_book_author(book_id) and not public.is_banned());
create policy chapters_update on public.chapters for update to authenticated
  using (public.is_book_author(book_id)) with check (public.is_book_author(book_id) and not public.is_banned());
create policy chapters_delete on public.chapters for delete to authenticated
  using (public.is_book_author(book_id));

-- chapter text: the author only (readers go through the protected read route)
create policy bodies_author on public.chapter_bodies for all to authenticated
  using (public.is_chapter_author(chapter_id)) with check (public.is_chapter_author(chapter_id));

-- bookmarks and notes: private to their owner
create policy notes_own on public.notes for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and public.chapter_is_live(chapter_id));

-- reading progress: private
create policy progress_own on public.reading_progress for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- follows and likes: counts are public; each person manages their own
create policy follows_read on public.follows for select using (true);
create policy follows_own on public.follows for insert to authenticated
  with check (follower_id = auth.uid() and not public.is_banned());
create policy follows_delete on public.follows for delete to authenticated using (follower_id = auth.uid());

create policy likes_read on public.likes for select using (true);
create policy likes_own on public.likes for insert to authenticated
  with check (user_id = auth.uid() and public.chapter_is_live(chapter_id) and not public.is_banned());
create policy likes_delete on public.likes for delete to authenticated using (user_id = auth.uid());

-- comments: public on live chapters unless hidden; writers manage their own
create policy comments_read on public.comments for select
  using ((not hidden_by_admin and public.chapter_is_live(chapter_id)) or user_id = auth.uid() or public.is_admin());
create policy comments_insert on public.comments for insert to authenticated
  with check (user_id = auth.uid() and public.chapter_is_live(chapter_id) and not public.is_banned());
create policy comments_update on public.comments for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy comments_delete on public.comments for delete to authenticated
  using (user_id = auth.uid() or public.is_chapter_author(chapter_id));

-- reports: anyone signed in can report; only admins read them all
create policy reports_insert on public.reports for insert to authenticated
  with check (reporter_id = auth.uid());
create policy reports_read on public.reports for select to authenticated
  using (reporter_id = auth.uid() or public.is_admin());

-- read counts: public, written only through record_read
create policy stats_read on public.chapter_stats for select using (true);

-- ---------------------------------------------------------------- storage
insert into storage.buckets (id, name, public) values ('covers', 'covers', true), ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "own folder upload" on storage.objects for insert to authenticated
  with check (bucket_id in ('covers', 'avatars') and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own folder update" on storage.objects for update to authenticated
  using (bucket_id in ('covers', 'avatars') and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own folder delete" on storage.objects for delete to authenticated
  using (bucket_id in ('covers', 'avatars') and (storage.foldername(name))[1] = auth.uid()::text);
