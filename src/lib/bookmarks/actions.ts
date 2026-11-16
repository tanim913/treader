"use server";
// Saving bookmarks runs on the server: the browser only says where the passage is,
// and the server takes the quote from the chapter text and stores it scrambled.

import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { toBlocks, type TNode } from "@/lib/doc";
import { quoteOf, type Block, type Range } from "@/lib/text";
import { randomKey, scrambleText } from "@/lib/cipher";
import { fromRow, NOTE_SELECT, type Bookmark, type NoteRow } from "./shape";

const QUOTE_MAX = 1200;
const NOTE_MAX = 2000;
const IMPORT_MAX = 500;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const isInt = (n: unknown): n is number => Number.isInteger(n) && (n as number) >= 0 && (n as number) < 1e7;

/** A range that fits inside these blocks, or null. */
function checkRange(blocks: Block[], r: unknown): Range | null {
  const x = r as Range | null;
  if (!x?.start || !x?.end || ![x.start.p, x.start.o, x.end.p, x.end.o].every(isInt)) return null;
  const { start, end } = x;
  if (start.p > end.p || (start.p === end.p && start.o >= end.o)) return null;
  const a = blocks[start.p];
  const b = blocks[end.p];
  if (a?.type !== "p" || b?.type !== "p") return null;
  const len = (blk: Extract<Block, { type: "p" }>) => blk.runs.reduce((n, run) => n + run.t.length, 0);
  if (start.o >= len(a) || end.o > len(b)) return null;
  return { start: { p: start.p, o: start.o }, end: { p: end.p, o: end.o } };
}

function scrambledQuote(blocks: Block[], r: Range) {
  let q = quoteOf(blocks, r);
  if (q.length > QUOTE_MAX) q = q.slice(0, QUOTE_MAX - 1).trimEnd() + "…";
  const k = randomKey();
  return { quote: scrambleText(q, k), k };
}

async function bodies(chapterIds: string[]): Promise<Map<string, Block[]>> {
  const { data } = await supabaseAdmin().from("chapter_bodies").select("chapter_id, content").in("chapter_id", chapterIds);
  return new Map((data ?? []).map((b) => [b.chapter_id as string, toBlocks(b.content as TNode)]));
}

async function signedIn() {
  const sb = await supabaseServer();
  const { data } = await sb.auth.getClaims();
  return { sb, id: data?.claims?.sub ?? null };
}

export type AddResult = { ok: true; bookmark: Bookmark } | { ok: false; error: string };

/** Keeps a passage for the signed-in reader. */
export async function saveBookmark(chapterId: string, range: Range, note: string): Promise<AddResult> {
  const { sb, id } = await signedIn();
  if (!id) return { ok: false, error: "Sign in to keep bookmarks." };
  if (!UUID.test(chapterId)) return { ok: false, error: "That chapter wasn't found." };

  // row-level security: only chapters this reader may see
  const { data: ch } = await sb.from("chapters").select("id, book_id").eq("id", chapterId).maybeSingle();
  if (!ch) return { ok: false, error: "That chapter wasn't found." };
  const blocks = (await bodies([chapterId])).get(chapterId) ?? [];
  const r = checkRange(blocks, range);
  if (!r) return { ok: false, error: "That passage couldn't be found. Reload the chapter and try again." };

  const { data, error } = await sb
    .from("notes")
    .insert({
      user_id: id, book_id: ch.book_id, chapter_id: chapterId,
      start_p: r.start.p, start_o: r.start.o, end_p: r.end.p, end_o: r.end.o,
      ...scrambledQuote(blocks, r),
      note: String(note ?? "").trim().slice(0, NOTE_MAX),
    })
    .select(NOTE_SELECT)
    .single();
  const saved = data && fromRow(data as unknown as NoteRow);
  if (error || !saved) {
    return { ok: false, error: "Couldn't save the bookmark. Bookmarks can be kept on published chapters." };
  }
  return { ok: true, bookmark: saved };
}

type GuestPlace = { bookId: string; chapterId: string; paragraph: number; updatedAt?: string };

/** Moves what a guest kept in this browser into the account they just signed in to. */
export async function importGuestData(marks: Bookmark[], places: GuestPlace[]): Promise<{ ok: boolean; moved: number }> {
  const { sb, id } = await signedIn();
  if (!id) return { ok: false, moved: 0 };
  let moved = 0;

  const list = (Array.isArray(marks) ? marks : []).slice(0, IMPORT_MAX).filter((b) => UUID.test(String(b?.bookId)));
  if (list.length) {
    // older guest bookmarks have no chapter id: find chapters by book and number
    const bookIds = [...new Set(list.map((b) => b.bookId))];
    const { data: chs } = await sb.from("chapters").select("id, book_id, number").in("book_id", bookIds);
    const chapterOf = new Map((chs ?? []).map((c) => [`${c.book_id}:${c.number}`, c as { id: string; book_id: string }]));
    const byId = new Map((chs ?? []).map((c) => [c.id as string, c as { id: string; book_id: string }]));
    const found = list
      .map((b) => ({ b, ch: (b.chapterId && byId.get(b.chapterId)) || chapterOf.get(`${b.bookId}:${b.chapterNumber}`) }))
      .filter((x): x is { b: Bookmark; ch: { id: string; book_id: string } } => !!x.ch);

    const texts = await bodies([...new Set(found.map((x) => x.ch.id))]);
    const { data: have } = await sb.from("notes").select("chapter_id, start_p, start_o, end_p, end_o").eq("user_id", id);
    const seen = new Set((have ?? []).map((n) => `${n.chapter_id}:${n.start_p}:${n.start_o}:${n.end_p}:${n.end_o}`));

    const rows = [];
    for (const { b, ch } of found) {
      const blocks = texts.get(ch.id) ?? [];
      const r = checkRange(blocks, b);
      if (!r) continue;
      const key = `${ch.id}:${r.start.p}:${r.start.o}:${r.end.p}:${r.end.o}`;
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push({
        user_id: id, book_id: ch.book_id, chapter_id: ch.id,
        start_p: r.start.p, start_o: r.start.o, end_p: r.end.p, end_o: r.end.o,
        ...scrambledQuote(blocks, r),
        note: String(b.note ?? "").trim().slice(0, NOTE_MAX),
      });
    }
    // one at a time, so a chapter that is no longer published doesn't drop the rest
    for (const row of rows) {
      const { error } = await sb.from("notes").insert(row);
      if (!error) moved++;
    }
  }

  const ps = (Array.isArray(places) ? places : []).slice(0, 100)
    .filter((p) => UUID.test(String(p?.bookId)) && UUID.test(String(p?.chapterId)) && isInt(p?.paragraph));
  if (ps.length) {
    const { data: mine } = await sb.from("reading_progress").select("book_id").in("book_id", ps.map((p) => p.bookId));
    const already = new Set((mine ?? []).map((r) => r.book_id as string));
    // the account's own place wins; the browser's fills in books the account hasn't read
    for (const p of ps.filter((x) => !already.has(x.bookId))) {
      const { error } = await sb.from("reading_progress")
        .insert({ user_id: id, book_id: p.bookId, chapter_id: p.chapterId, paragraph: p.paragraph });
      if (!error) moved++;
    }
  }
  return { ok: true, moved };
}
