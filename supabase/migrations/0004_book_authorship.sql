-- 0004: a book is either the uploader's own writing, or someone else's that they share.
-- original_author is null for the uploader's own writing (every existing book, Without Papers included).
-- A shared book needs the uploader's confirmation that they have permission or it is in the public domain.
-- chapters and chapter_bodies are untouched.

alter table public.books
  add column original_author text
    check (original_author is null or char_length(btrim(original_author)) between 1 and 120),
  add column rights_confirmed_at timestamptz,
  add constraint books_shared_needs_rights
    check (original_author is null or rights_confirmed_at is not null);

grant update (original_author, rights_confirmed_at) on public.books to authenticated;

-- public_reading (0003) now also says who wrote a shared book.
drop function public.public_reading(uuid);

create function public.public_reading(p uuid)
returns table (slug text, title text, cloth text, cover_url text, author text, author_handle text,
               original_author text, completed boolean, chapter_number int, updated_at timestamptz)
language sql stable security definer set search_path = public as $$
  select bk.slug, bk.title, bk.cloth, bk.cover_url, au.display_name, au.handle,
         bk.original_author, bk.completed, ch.number, rp.updated_at
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
