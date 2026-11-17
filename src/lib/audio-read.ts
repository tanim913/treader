import "server-only";
import { supabaseServer } from "./supabase/server";

/** A chapter's narration as this visitor may see it (row-level security: live chapter, audio on). */
export async function chapterAudio(chapterId: string): Promise<{ duration: number } | null> {
  const sb = await supabaseServer();
  const { data } = await sb.from("chapter_audio").select("duration_s").eq("chapter_id", chapterId).maybeSingle();
  return data ? { duration: data.duration_s } : null;
}

/** Which of a book's chapters have narration this visitor may hear. */
export async function audioChapters(chapterIds: string[]): Promise<Set<string>> {
  if (!chapterIds.length) return new Set();
  const sb = await supabaseServer();
  const { data } = await sb.from("chapter_audio").select("chapter_id").in("chapter_id", chapterIds);
  return new Set((data ?? []).map((r) => r.chapter_id as string));
}
