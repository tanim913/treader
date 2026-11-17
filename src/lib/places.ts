import "server-only";
import { supabaseServer } from "./supabase/server";

export type SavedPlace = { chapterId: string; chapterNumber: number; chapterTitle: string; paragraph: number };

/** The signed-in reader's place in one book (row-level security keeps it to their own), or null. */
export async function getPlace(bookId: string): Promise<SavedPlace | null> {
  const sb = await supabaseServer();
  const { data } = await sb
    .from("reading_progress")
    .select("chapter_id, paragraph, chapter:chapters(number, title)")
    .eq("book_id", bookId)
    .maybeSingle();
  const ch = data?.chapter as unknown as { number: number; title: string } | null;
  if (!data || !ch) return null;
  return { chapterId: data.chapter_id, chapterNumber: ch.number, chapterTitle: ch.title, paragraph: data.paragraph };
}

export type ShelfPlace = SavedPlace & {
  slug: string; title: string; cloth: string; coverUrl: string | null;
  /** who wrote it: the original author of a shared book, otherwise the uploader */
  author: string;
  uploader: string; authorHandle: string; originalAuthor: string | null;
  completed: boolean; chapters: number;
};

/** The books the signed-in reader is in the middle of, most recent first. */
export async function getMyPlaces(limit = 8): Promise<ShelfPlace[]> {
  const sb = await supabaseServer();
  const { data: claims } = await sb.auth.getClaims();
  if (!claims?.claims?.sub) return [];
  const { data } = await sb
    .from("reading_progress")
    .select("chapter_id, paragraph, updated_at, chapter:chapters(number, title), " +
      "book:books(slug, title, cloth, cover_url, completed, original_author, author:profiles!books_author_id_fkey(display_name, handle), chapters(count))")
    .order("updated_at", { ascending: false })
    .limit(limit);
  type Row = {
    chapter_id: string; paragraph: number;
    chapter: { number: number; title: string } | null;
    book: { slug: string; title: string; cloth: string; cover_url: string | null; completed: boolean; original_author: string | null;
      author: { display_name: string; handle: string } | null; chapters: { count: number }[] } | null;
  };
  return ((data ?? []) as unknown as Row[])
    .filter((r) => r.book && r.chapter)
    .map((r) => ({
      chapterId: r.chapter_id,
      chapterNumber: r.chapter!.number,
      chapterTitle: r.chapter!.title,
      paragraph: r.paragraph,
      slug: r.book!.slug,
      title: r.book!.title,
      cloth: r.book!.cloth,
      coverUrl: r.book!.cover_url,
      author: r.book!.original_author ?? r.book!.author?.display_name ?? "",
      uploader: r.book!.author?.display_name ?? "",
      authorHandle: r.book!.author?.handle ?? "",
      originalAuthor: r.book!.original_author,
      completed: r.book!.completed,
      chapters: r.book!.chapters?.[0]?.count ?? 0,
    }));
}
