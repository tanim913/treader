import "server-only";
import { supabaseServer } from "./supabase/server";
import { HANDLE } from "./paths";

export type Profile = {
  id: string;
  handle: string;
  displayName: string;
  bio: string;
  avatarUrl: string | null;
  banned: boolean;
  showReading: boolean;
};

export async function getProfile(handle: string): Promise<Profile | null> {
  const h = decodeURIComponent(handle).replace(/^@/, "").toLowerCase();
  if (!HANDLE.test(h)) return null;
  const sb = await supabaseServer();
  const { data } = await sb
    .from("profiles")
    .select("id, handle, display_name, bio, avatar_url, banned, show_reading")
    .eq("handle", h)
    .maybeSingle();
  if (!data) return null;
  return {
    id: data.id, handle: data.handle, displayName: data.display_name, bio: data.bio,
    avatarUrl: data.avatar_url, banned: data.banned, showReading: data.show_reading,
  };
}

/** How many follow this person, and how many they follow. */
export async function followCounts(id: string) {
  const sb = await supabaseServer();
  const [a, b] = await Promise.all([
    sb.from("follows").select("author_id", { count: "exact", head: true }).eq("author_id", id),
    sb.from("follows").select("follower_id", { count: "exact", head: true }).eq("follower_id", id),
  ]);
  return { followers: a.count ?? 0, following: b.count ?? 0 };
}

export async function isFollowing(followerId: string, authorId: string): Promise<boolean> {
  const sb = await supabaseServer();
  const { data } = await sb.from("follows").select("author_id")
    .eq("follower_id", followerId).eq("author_id", authorId).maybeSingle();
  return !!data;
}

export type ShelfBook = {
  slug: string; title: string; cloth: string; coverUrl: string | null; completed: boolean; chapters: number;
};

/** A person's published books, newest activity first. */
export async function booksBy(id: string): Promise<ShelfBook[]> {
  const sb = await supabaseServer();
  const { data } = await sb
    .from("books")
    .select("slug, title, cloth, cover_url, completed, chapters(count)")
    .eq("author_id", id)
    .eq("status", "published")
    .eq("hidden_by_admin", false)
    .order("updated_at", { ascending: false });
  return (data ?? []).map((b) => ({
    slug: b.slug, title: b.title, cloth: b.cloth, coverUrl: b.cover_url, completed: b.completed,
    chapters: (b.chapters as { count: number }[] | null)?.[0]?.count ?? 0,
  }));
}

export type Person = { handle: string; displayName: string; avatarUrl: string | null; bio: string };

/** Who follows this person ("followers") or whom they follow ("following"), most recent first. */
export async function followList(id: string, tab: "followers" | "following"): Promise<Person[]> {
  const sb = await supabaseServer();
  const q = tab === "followers"
    ? sb.from("follows").select("created_at, p:profiles!follows_follower_id_fkey(handle, display_name, avatar_url, bio, banned)").eq("author_id", id)
    : sb.from("follows").select("created_at, p:profiles!follows_author_id_fkey(handle, display_name, avatar_url, bio, banned)").eq("follower_id", id);
  const { data } = await q.order("created_at", { ascending: false }).limit(500);
  type Row = { p: { handle: string; display_name: string; avatar_url: string | null; bio: string; banned: boolean } | null };
  return ((data ?? []) as unknown as Row[])
    .filter((r) => r.p && !r.p.banned)
    .map((r) => ({ handle: r.p!.handle, displayName: r.p!.display_name, avatarUrl: r.p!.avatar_url, bio: r.p!.bio }));
}

export type ReadingNow = {
  slug: string; title: string; cloth: string; coverUrl: string | null; author: string; authorHandle: string;
  completed: boolean; chapterNumber: number;
};

/** What this person is reading, if they chose to show it on their profile. */
export async function publicReading(id: string): Promise<ReadingNow[]> {
  const sb = await supabaseServer();
  const { data } = await sb.rpc("public_reading", { p: id });
  type Row = { slug: string; title: string; cloth: string; cover_url: string | null; author: string; author_handle: string; completed: boolean; chapter_number: number };
  return ((data ?? []) as Row[]).map((r) => ({
    slug: r.slug, title: r.title, cloth: r.cloth, coverUrl: r.cover_url, author: r.author, authorHandle: r.author_handle,
    completed: r.completed, chapterNumber: r.chapter_number,
  }));
}

export type NewChapter = {
  href: string; number: number; title: string; at: string | null;
  bookTitle: string; cloth: string; author: string; authorHandle: string;
};

/** The latest chapters from writers this reader follows. */
export async function newFromFollowed(userId: string, limit = 8): Promise<NewChapter[]> {
  const sb = await supabaseServer();
  const { data: f } = await sb.from("follows").select("author_id").eq("follower_id", userId);
  const ids = (f ?? []).map((x) => x.author_id as string);
  if (!ids.length) return [];
  const { data } = await sb
    .from("chapters")
    .select("number, title, publish_at, book:books!inner(slug, title, cloth, author_id, author:profiles!books_author_id_fkey(display_name, handle))")
    .in("book.author_id", ids)
    .order("publish_at", { ascending: false, nullsFirst: false })
    .limit(limit);
  type Row = {
    number: number; title: string; publish_at: string | null;
    book: { slug: string; title: string; cloth: string; author: { display_name: string; handle: string } | null } | null;
  };
  return ((data ?? []) as unknown as Row[]).filter((r) => r.book).map((r) => ({
    href: `/b/${r.book!.slug}/${r.number}`,
    number: r.number,
    title: r.title,
    at: r.publish_at,
    bookTitle: r.book!.title,
    cloth: r.book!.cloth,
    author: r.book!.author?.display_name ?? "",
    authorHandle: r.book!.author?.handle ?? "",
  }));
}
