import "server-only";
import { supabaseServer } from "./supabase/server";
import type { AudioChapter } from "@/components/write/AudioPanel";

/** Everything the audio panel needs for one book. Call only for admins (row-level security lets them read it all). */
export async function loadAudioPanel(bookId: string) {
  const sb = await supabaseServer();
  const [{ data: book }, { data: chapters }, { data: all }] = await Promise.all([
    sb.from("books").select("id, slug, title, audio_enabled").eq("id", bookId).maybeSingle(),
    sb.from("chapters").select("id, number, title, status").eq("book_id", bookId).order("number"),
    sb.from("chapter_audio").select("chapter_id, voice, bytes, duration_s"),
  ]);
  if (!book) return null;
  const byChapter = new Map<string, AudioChapter["voices"]>();
  for (const r of all ?? []) {
    const list = byChapter.get(r.chapter_id) ?? [];
    list.push({ voice: r.voice, bytes: r.bytes, duration: r.duration_s });
    byChapter.set(r.chapter_id, list);
  }
  return {
    book,
    totalBytes: (all ?? []).reduce((a, r) => a + (r.bytes ?? 0), 0),
    chapters: (chapters ?? []).map((c) => ({
      id: c.id, number: c.number, title: c.title, status: c.status, voices: byChapter.get(c.id) ?? [],
    })) as AudioChapter[],
  };
}
