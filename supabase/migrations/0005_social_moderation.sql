-- 0005: likes on books, safer comments and reports, and resolving reports from /admin.
-- Chapter likes, comments and reports already exist (0001); this fills the gaps.
-- chapters and chapter_bodies are untouched.

-- ---------------------------------------------------------------- book likes
create table public.book_likes (
  user_id uuid not null references public.profiles (id) on delete cascade,
  book_id uuid not null references public.books (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, book_id)
);
create index book_likes_book_idx on public.book_likes (book_id);

alter table public.book_likes enable row level security;
revoke all on public.book_likes from anon, authenticated;
grant select on public.book_likes to anon, authenticated;
grant insert, delete on public.book_likes to authenticated;

create policy book_likes_read on public.book_likes for select using (true);
create policy book_likes_own on public.book_likes for insert to authenticated
  with check (user_id = auth.uid() and public.book_is_live(book_id) and not public.is_banned());
create policy book_likes_delete on public.book_likes for delete to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------- comments
create function public.profile_banned(u uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select banned from profiles where id = u), false)
$$;

-- a reply answers a top-level comment on the same chapter (one level of replies)
create function public.comment_parent_ok(parent uuid, chapter uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from comments where id = parent and chapter_id = chapter and parent_id is null)
$$;

revoke execute on function public.profile_banned(uuid), public.comment_parent_ok(uuid, uuid) from public;
grant execute on function public.profile_banned(uuid), public.comment_parent_ok(uuid, uuid) to anon, authenticated;

-- readers no longer see comments by banned accounts
drop policy comments_read on public.comments;
create policy comments_read on public.comments for select
  using ((not hidden_by_admin and public.chapter_is_live(chapter_id) and not public.profile_banned(user_id))
         or user_id = auth.uid() or public.is_admin());

drop policy comments_insert on public.comments;
create policy comments_insert on public.comments for insert to authenticated
  with check (user_id = auth.uid() and public.chapter_is_live(chapter_id) and not public.is_banned()
              and (parent_id is null or public.comment_parent_ok(parent_id, chapter_id)));

drop policy comments_update on public.comments;
create policy comments_update on public.comments for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid() and not public.is_banned());

-- ---------------------------------------------------------------- reports
-- one open report per person per thing; the queue reads newest first
create unique index reports_one_open on public.reports (reporter_id, target_type, target_id) where status = 'open';
create index reports_status_idx on public.reports (status, created_at desc);

drop policy reports_insert on public.reports;
create policy reports_insert on public.reports for insert to authenticated
  with check (reporter_id = auth.uid() and status = 'open' and not public.is_banned());

-- admins resolve or dismiss a report (or reopen it)
create function public.admin_resolve_report(r uuid, s public.report_status) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  update reports set status = s, resolved_at = case when s = 'open' then null else now() end where id = r;
end $$;

revoke execute on function public.admin_resolve_report(uuid, public.report_status) from public, anon;
grant execute on function public.admin_resolve_report(uuid, public.report_status) to authenticated;
