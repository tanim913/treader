-- 0003: public profiles. A reader may choose to show what they are reading;
-- bookmarks and notes always stay private. chapters and chapter_bodies are untouched.

alter table public.profiles
  add column show_reading boolean not null default false;

grant update (show_reading) on public.profiles to authenticated;

-- The books someone is reading, for their public profile, only when they have chosen to show it.
-- Reading progress itself stays private (its row-level security is unchanged).
create function public.public_reading(p uuid)
returns table (slug text, title text, cloth text, cover_url text, author text, author_handle text,
               completed boolean, chapter_number int, updated_at timestamptz)
language sql stable security definer set search_path = public as $$
  select bk.slug, bk.title, bk.cloth, bk.cover_url, au.display_name, au.handle,
         bk.completed, ch.number, rp.updated_at
  from reading_progress rp
  join profiles reader on reader.id = rp.user_id and reader.show_reading and not reader.banned
  join books bk on bk.id = rp.book_id
  join profiles au on au.id = bk.author_id
  join chapters ch on ch.id = rp.chapter_id
  where rp.user_id = p
    and public.book_is_live(bk.id)
    and public.chapter_is_live(ch.id)
  order by rp.updated_at desc
  limit 12
$$;

revoke execute on function public.public_reading(uuid) from public;
grant execute on function public.public_reading(uuid) to anon, authenticated;
