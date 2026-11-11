import "server-only";
import { supabaseServer } from "./supabase/server";
import { supabaseAdmin } from "./supabase/admin";

export type LiveChapter = { id: string; number: number; title: string; word_count: number; draft: boolean };

const isLive = (c: { status: string; publish_at: string | null }) =>
  c.status === "published" || (c.status === "scheduled" && !!c.publish_at && Date.parse(c.publish_at) <= Date.now());

/** A book visible to this visitor (published, or their own), with its live chapters in order.
 *  The writer also sees their unpublished chapters, marked as drafts, so they can read them as readers will. */
export async function getBook(slug: string) {
  const sb = await supabaseServer();
  const { data: book } = await sb
    .from("books")
    .select("id, slug, title, blurb, cloth, cover_url, status, completed, author_id, profiles(display_name, handle)")
    .eq("slug", slug)
    .maybeSingle();
  if (!book) return null;
  const { data: rows } = await sb
    .from("chapters")
    .select("id, number, title, word_count, status, publish_at")
    .eq("book_id", book.id)
    .order("number");
  const { data: claims } = await sb.auth.getClaims();
  const own = claims?.claims?.sub === book.author_id;
  const chapters: LiveChapter[] = (rows ?? [])
    .filter((c) => own || isLive(c))
    .map((c) => ({ id: c.id, number: c.number, title: c.title, word_count: c.word_count, draft: !isLive(c) }));
  const author = (book.profiles as unknown as { display_name: string; handle: string } | null) ?? { display_name: "", handle: "" };
  return { ...book, author, chapters, own };
}

/** When the next scheduled chapter appears, if the writer has scheduled one. */
export async function nextScheduled(bookId: string): Promise<string | null> {
  const { data } = await supabaseAdmin()
    .from("chapters")
    .select("publish_at")
    .eq("book_id", bookId)
    .eq("status", "scheduled")
    .gt("publish_at", new Date().toISOString())
    .order("publish_at")
    .limit(1)
    .maybeSingle();
  return data?.publish_at ?? null;
}

export const fmtDay = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", timeZone: "Asia/Dhaka" }).format(new Date(iso));
