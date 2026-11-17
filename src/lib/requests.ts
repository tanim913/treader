import "server-only";
import { supabaseServer } from "./supabase/server";
import { audioChapters } from "./audio-read";

/** What this reader has already asked for in one book: the whole book, and which chapters. */
export async function myAudioRequests(bookId: string, userId: string | null) {
  if (!userId) return { book: false, chapters: new Set<string>() };
  const sb = await supabaseServer();
  const { data } = await sb.from("audio_requests").select("chapter_id").eq("book_id", bookId).eq("user_id", userId);
  return {
    book: (data ?? []).some((r) => !r.chapter_id),
    chapters: new Set((data ?? []).filter((r) => r.chapter_id).map((r) => r.chapter_id as string)),
  };
}

export type AudioNotice = { id: string; href: string; text: string };

/** Requests of this reader that have been answered (audio they can now hear) and not yet dismissed. */
export async function audioNotices(userId: string): Promise<AudioNotice[]> {
  const sb = await supabaseServer();
  const { data } = await sb
    .from("audio_requests")
    .select("id, book_id, chapter_id, book:books(slug, title), chapter:chapters(number, title)")
    .eq("user_id", userId)
    .is("seen_at", null)
    .limit(50);
  type R = { id: string; book_id: string; chapter_id: string | null; book: { slug: string; title: string } | null; chapter: { number: number; title: string } | null };
  const rows = ((data ?? []) as unknown as R[]).filter((r) => r.book);
  if (!rows.length) return [];
  const bookIds = [...new Set(rows.map((r) => r.book_id))];
  const { data: live } = await sb.from("chapters").select("id, book_id").in("book_id", bookIds);
  const heard = await audioChapters((live ?? []).map((c) => c.id as string));
  const out: AudioNotice[] = [];
  for (const r of rows) {
    if (r.chapter_id && r.chapter) {
      if (heard.has(r.chapter_id)) out.push({ id: r.id, href: `/b/${r.book!.slug}/${r.chapter.number}`, text: `${r.book!.title}, chapter ${r.chapter.number}` });
    } else if (!r.chapter_id) {
      const ids = (live ?? []).filter((c) => c.book_id === r.book_id).map((c) => c.id as string);
      if (ids.length && ids.every((id) => heard.has(id))) out.push({ id: r.id, href: `/b/${r.book!.slug}`, text: `${r.book!.title}, the whole book` });
    }
  }
  return out;
}
