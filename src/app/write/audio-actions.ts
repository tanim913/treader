"use server";
// Chapter audio. Admins only: storage is limited, so narration is switched on book by book.
// Everything here runs with the service key after checking the signed-in person's role.

import { revalidatePath } from "next/cache";
import { getMe } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { audioPath } from "@/lib/audio";
import { toBlocks, type TNode } from "@/lib/doc";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export type AudioResult = { ok: boolean; error?: string };

async function admin() {
  const me = await getMe();
  if (!me || me.role !== "admin") return null;
  return supabaseAdmin();
}

/** The chapter, if it belongs to this book. */
async function chapterOf(db: ReturnType<typeof supabaseAdmin>, bookId: string, chapterId: string) {
  if (!UUID.test(bookId) || !UUID.test(chapterId)) return null;
  const { data } = await db.from("chapters").select("id, number").eq("id", chapterId).eq("book_id", bookId).maybeSingle();
  return data;
}

export async function setAudioEnabled(bookId: string, on: boolean): Promise<AudioResult> {
  const db = await admin();
  if (!db) return { ok: false, error: "Only admins can switch audio on." };
  if (!UUID.test(bookId)) return { ok: false, error: "Bad request." };
  const { error } = await db.from("books").update({ audio_enabled: !!on }).eq("id", bookId);
  revalidatePath(`/write/${bookId}`);
  return error ? { ok: false, error: "Couldn't save. Try again." } : { ok: true };
}

export type NarrationChapter = { number: number; title: string; text: string };

/** Plain text of the chosen chapters, for the narration notebook. Scene breaks become "* * *". */
export async function narrationText(bookId: string, chapterIds: string[]): Promise<{ ok: boolean; error?: string; chapters?: NarrationChapter[] }> {
  const db = await admin();
  if (!db) return { ok: false, error: "Only admins can export text for narration." };
  const ids = (Array.isArray(chapterIds) ? chapterIds : []).filter((x) => UUID.test(x)).slice(0, 200);
  if (!UUID.test(bookId) || !ids.length) return { ok: false, error: "Choose at least one chapter." };
  const { data: chs } = await db.from("chapters").select("id, number, title").eq("book_id", bookId).in("id", ids).order("number");
  const { data: bodies } = await db.from("chapter_bodies").select("chapter_id, content").in("chapter_id", ids);
  const byId = new Map((bodies ?? []).map((b) => [b.chapter_id as string, b.content as TNode]));
  const chapters = (chs ?? []).map((c) => ({
    number: c.number,
    title: c.title,
    text: toBlocks(byId.get(c.id) ?? null)
      .map((b) => (b.type === "hr" ? "* * *" : b.runs.map((r) => r.t).join("").replace(/\s+/g, " ").trim()))
      .filter(Boolean)
      .join("\n\n"),
  }));
  return { ok: true, chapters };
}

/** A one-time link the browser uploads one chapter's MP3 to, straight into the private bucket. */
export async function audioUploadUrl(bookId: string, chapterId: string): Promise<{ ok: boolean; error?: string; path?: string; token?: string }> {
  const db = await admin();
  if (!db) return { ok: false, error: "Only admins can upload audio." };
  if (!(await chapterOf(db, bookId, chapterId))) return { ok: false, error: "That chapter isn't in this book." };
  const path = audioPath(bookId, chapterId);
  const { data, error } = await db.storage.from("audio").createSignedUploadUrl(path, { upsert: true });
  if (error || !data) return { ok: false, error: "Couldn't start the upload. Try again." };
  return { ok: true, path: data.path, token: data.token };
}

/** Records an uploaded MP3 against its chapter. */
export async function saveAudio(bookId: string, chapterId: string, info: { duration: number; voice: string }): Promise<AudioResult> {
  const db = await admin();
  if (!db) return { ok: false, error: "Only admins can upload audio." };
  if (!(await chapterOf(db, bookId, chapterId))) return { ok: false, error: "That chapter isn't in this book." };
  const path = audioPath(bookId, chapterId);
  // the size comes from storage itself, not from the browser
  const { data: files } = await db.storage.from("audio").list(bookId, { search: `${chapterId}.mp3`, limit: 1 });
  const file = files?.find((f) => f.name === `${chapterId}.mp3`);
  const bytes = Number((file?.metadata as { size?: number } | undefined)?.size ?? 0);
  if (!file || bytes <= 0) return { ok: false, error: "The upload didn't arrive. Try again." };
  const { error } = await db.from("chapter_audio").upsert({
    chapter_id: chapterId, path, bytes,
    duration_s: Math.max(0, Math.round(Number(info?.duration) || 0)),
    voice: String(info?.voice ?? "").slice(0, 60),
  });
  revalidatePath(`/write/${bookId}`);
  return error ? { ok: false, error: "Couldn't save the audio. Try again." } : { ok: true };
}

export async function removeAudio(bookId: string, chapterIds: string[]): Promise<AudioResult> {
  const db = await admin();
  if (!db) return { ok: false, error: "Only admins can remove audio." };
  const ids = (Array.isArray(chapterIds) ? chapterIds : []).filter((x) => UUID.test(x));
  if (!UUID.test(bookId) || !ids.length) return { ok: false, error: "Bad request." };
  const { data: mine } = await db.from("chapters").select("id").eq("book_id", bookId).in("id", ids);
  const ok = (mine ?? []).map((c) => c.id as string);
  if (!ok.length) return { ok: false, error: "Those chapters aren't in this book." };
  await db.storage.from("audio").remove(ok.map((id) => audioPath(bookId, id)));
  const { error } = await db.from("chapter_audio").delete().in("chapter_id", ok);
  revalidatePath(`/write/${bookId}`);
  return error ? { ok: false, error: "Couldn't remove it. Try again." } : { ok: true };
}
