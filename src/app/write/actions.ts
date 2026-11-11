"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import { CLOTHS } from "@/lib/cloth";
import { slugify, wordCount, type TNode } from "@/lib/doc";

export type Result = { error?: string; ok?: boolean };

async function me() {
  const sb = await supabaseServer();
  const { data } = await sb.auth.getClaims();
  const id = data?.claims?.sub;
  if (!id) redirect("/login?next=/write");
  return { sb, id };
}

const clean = (v: FormDataEntryValue | null, max: number) => String(v ?? "").trim().slice(0, max);

export async function createBook(_: Result, form: FormData): Promise<Result> {
  const { sb, id } = await me();
  const title = clean(form.get("title"), 160);
  const blurb = clean(form.get("blurb"), 2000);
  const cloth = String(form.get("cloth") ?? "oxblood");
  if (!title) return { error: "Give the book a title." };
  if (!(cloth in CLOTHS)) return { error: "Choose a cloth colour." };

  const base = slugify(title);
  for (let i = 0; i < 20; i++) {
    const slug = i === 0 ? base : `${base}-${i + 1}`;
    const { data, error } = await sb.from("books").insert({ author_id: id, slug, title, blurb, cloth }).select("id").single();
    if (!error) redirect(`/write/${data.id}`);
    if (error.code !== "23505") return { error: "Couldn't create the book. Please try again." };
  }
  return { error: "Couldn't find a free web address for this title. Try a slightly different title." };
}

export async function updateBook(bookId: string, _: Result, form: FormData): Promise<Result> {
  const { sb } = await me();
  const title = clean(form.get("title"), 160);
  const blurb = clean(form.get("blurb"), 2000);
  const cloth = String(form.get("cloth") ?? "oxblood");
  if (!title) return { error: "The book needs a title." };
  if (!(cloth in CLOTHS)) return { error: "Choose a cloth colour." };
  const { error } = await sb.from("books").update({ title, blurb, cloth }).eq("id", bookId);
  if (error) return { error: "Couldn't save. Please try again." };
  revalidatePath(`/write/${bookId}`);
  return { ok: true };
}

export async function setBookFlags(bookId: string, flags: { status?: "draft" | "published"; completed?: boolean; cover_url?: string | null }): Promise<Result> {
  const { sb } = await me();
  const { error } = await sb.from("books").update(flags).eq("id", bookId);
  if (error) return { error: "Couldn't save. Please try again." };
  revalidatePath(`/write/${bookId}`);
  revalidatePath("/write");
  return { ok: true };
}

export async function deleteBook(bookId: string): Promise<Result> {
  const { sb } = await me();
  const { error } = await sb.from("books").delete().eq("id", bookId);
  if (error) return { error: "Couldn't delete the book." };
  redirect("/write");
}

export async function createChapter(bookId: string): Promise<Result> {
  const { sb } = await me();
  const { data: last } = await sb.from("chapters").select("number").eq("book_id", bookId)
    .order("number", { ascending: false }).limit(1).maybeSingle();
  const number = (last?.number ?? 0) + 1;
  const { data, error } = await sb.from("chapters")
    .insert({ book_id: bookId, number, title: `Chapter ${number}` }).select("id").single();
  if (error) return { error: "Couldn't add a chapter." };
  const { error: bodyError } = await sb.from("chapter_bodies").insert({ chapter_id: data.id });
  if (bodyError) return { error: "Couldn't add a chapter." };
  redirect(`/write/${bookId}/${data.id}`);
}

export type ChapterSave = {
  title: string;
  number: number;
  content: TNode;
  publish: "draft" | "published" | "scheduled" | "keep";
  publishAt?: string | null; // ISO, for scheduled
};

export async function saveChapter(bookId: string, chapterId: string, s: ChapterSave): Promise<Result> {
  const { sb } = await me();
  const title = s.title.trim().slice(0, 200);
  if (!title) return { error: "The chapter needs a title." };
  if (!Number.isInteger(s.number) || s.number < 1) return { error: "Chapter number must be 1 or more." };

  const { error: bodyError } = await sb.from("chapter_bodies").update({ content: s.content }).eq("chapter_id", chapterId);
  if (bodyError) return { error: "Couldn't save the text. Please try again." };

  const patch: Record<string, unknown> = { title, number: s.number, word_count: wordCount(s.content) };
  if (s.publish === "draft") Object.assign(patch, { status: "draft", publish_at: null });
  if (s.publish === "published") Object.assign(patch, { status: "published", publish_at: new Date().toISOString() });
  if (s.publish === "scheduled") {
    const at = s.publishAt ? new Date(s.publishAt) : null;
    if (!at || Number.isNaN(at.getTime()) || at.getTime() < Date.now()) return { error: "Choose a date and time in the future." };
    Object.assign(patch, { status: "scheduled", publish_at: at.toISOString() });
  }
  const { error } = await sb.from("chapters").update(patch).eq("id", chapterId);
  if (error) {
    return { error: error.code === "23505" ? `Chapter ${s.number} already exists in this book.` : "Couldn't save. Please try again." };
  }
  revalidatePath(`/write/${bookId}`);
  return { ok: true };
}

export async function deleteChapter(bookId: string, chapterId: string): Promise<Result> {
  const { sb } = await me();
  const { error } = await sb.from("chapters").delete().eq("id", chapterId);
  if (error) return { error: "Couldn't delete the chapter." };
  redirect(`/write/${bookId}`);
}
