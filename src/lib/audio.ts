import "server-only";
import { supabaseAdmin } from "./supabase/admin";

/** Where a chapter's narration in one voice lives in the private "audio" bucket: one folder per book. */
export const audioPath = (bookId: string, chapterId: string, voice: string) => `${bookId}/${chapterId}-${voice}.mp3`;

/** Removes every narration file of one chapter (all voices, and the older single-voice name). */
export async function removeChapterAudio(bookId: string, chapterId: string) {
  const store = supabaseAdmin().storage.from("audio");
  const { data } = await store.list(bookId, { limit: 1000, search: chapterId });
  const names = (data ?? []).map((f) => f.name).filter((n) => n.startsWith(chapterId));
  if (names.length) await store.remove(names.map((n) => `${bookId}/${n}`));
}

/** The free plan's file storage, shared with covers and avatars; the meter measures audio against it. */
export const STORAGE_BUDGET_BYTES = 1024 * 1024 * 1024;

/** Removes a whole book's narration files (used when a book or account is deleted). */
export async function removeBookAudio(bookIds: string[]) {
  const store = supabaseAdmin().storage.from("audio");
  for (const id of bookIds) {
    const { data } = await store.list(id, { limit: 1000 });
    if (data?.length) await store.remove(data.map((f) => `${id}/${f.name}`));
  }
}
