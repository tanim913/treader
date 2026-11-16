// The bookmark shape shared by the browser store, the server actions and the lists.
import type { Range } from "@/lib/text";

export type Bookmark = Range & {
  id: string;
  /** missing only on bookmarks a guest saved before this field existed */
  chapterId?: string;
  bookId: string;
  bookTitle: string;
  cloth: string;
  chapterNumber: number;
  chapterTitle: string;
  href: string;          // the chapter's path
  quote: string;         // as written in the page (scrambled when k is set)
  k?: number;            // scramble key; the quote shows in the matching font
  note: string;
  createdAt: string;
  updatedAt: string;
};

/** What the reader knows when a passage is kept. */
export type NewBookmark = Omit<Bookmark, "id" | "createdAt" | "updatedAt"> & { chapterId: string };

/** Columns read for a signed-in reader's bookmarks (row-level security keeps them to their own). */
export const NOTE_SELECT =
  "id, chapter_id, book_id, start_p, start_o, end_p, end_o, quote, note, k, created_at, updated_at, " +
  "book:books(slug, title, cloth), chapter:chapters(number, title)";

export type NoteRow = {
  id: string; chapter_id: string; book_id: string;
  start_p: number; start_o: number; end_p: number; end_o: number;
  quote: string; note: string; k: number; created_at: string; updated_at: string;
  book: { slug: string; title: string; cloth: string } | null;
  chapter: { number: number; title: string } | null;
};

/** A database row as a bookmark, or null when its book or chapter is no longer visible. */
export function fromRow(r: NoteRow): Bookmark | null {
  if (!r.book || !r.chapter) return null;
  return {
    id: r.id,
    chapterId: r.chapter_id,
    bookId: r.book_id,
    bookTitle: r.book.title,
    cloth: r.book.cloth,
    chapterNumber: r.chapter.number,
    chapterTitle: r.chapter.title,
    href: `/b/${r.book.slug}/${r.chapter.number}`,
    start: { p: r.start_p, o: r.start_o },
    end: { p: r.end_p, o: r.end_o },
    quote: r.quote,
    k: r.k,
    note: r.note,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

/** Scrolls to a bookmark on the current page and makes it glow for a moment. */
export function jumpToBookmark(id: string): boolean {
  const first = document.getElementById(`bm-${id}`);
  if (!first) return false;
  first.scrollIntoView({ block: "center", behavior: "smooth" });
  const parts = document.querySelectorAll<HTMLElement>(`[data-bm="${id}"]`);
  parts.forEach((el) => el.setAttribute("data-flash", ""));
  window.setTimeout(() => parts.forEach((el) => el.removeAttribute("data-flash")), 2400);
  return true;
}
