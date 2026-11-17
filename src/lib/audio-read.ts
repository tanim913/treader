import "server-only";
import { supabaseServer } from "./supabase/server";

export type ChapterVoice = { voice: string; duration: number };

/** A chapter's narration voices as this visitor may see them (row-level security: live chapter, audio on; admins see all). */
export async function chapterAudio(chapterId: string): Promise<ChapterVoice[] | null> {
  const sb = await supabaseServer();
  const { data } = await sb.from("chapter_audio").select("voice, duration_s").eq("chapter_id", chapterId).order("voice", { ascending: false });
  return data?.length ? data.map((r) => ({ voice: r.voice as string, duration: r.duration_s as number })) : null;
}

/** Which of a book's chapters have narration this visitor may hear. */
export async function audioChapters(chapterIds: string[]): Promise<Set<string>> {
  if (!chapterIds.length) return new Set();
  const sb = await supabaseServer();
  const { data } = await sb.from("chapter_audio").select("chapter_id").in("chapter_id", chapterIds);
  return new Set((data ?? []).map((r) => r.chapter_id as string));
}
