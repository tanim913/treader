"use client";
// Where a reader stopped in each book. Signed-in readers save to their account
// (reading_progress, private to them); guests keep it in this browser until they sign in.
import { supabaseBrowser } from "@/lib/supabase/client";

export type Place = { chapterId: string; chapterNumber: number; paragraph: number };

/** A guest's place in one book, with what the home shelf needs to draw the book. */
export type LocalPlace = Place & {
  bookId: string;
  slug: string;
  bookTitle: string;
  cloth: string;
  coverUrl: string | null;
  author: string;
  chapterTitle: string;
  updatedAt: string;
};

const KEY = "treader-progress";
const EMPTY: LocalPlace[] = [];
let cache: LocalPlace[] | null = null;
const listeners = new Set<() => void>();

export function readLocalPlaces(): LocalPlace[] {
  if (cache) return cache;
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || "[]");
    cache = Array.isArray(parsed) ? (parsed as LocalPlace[]) : EMPTY;
  } catch {
    cache = EMPTY;
  }
  return cache;
}

function write(next: LocalPlace[]) {
  cache = next;
  try {
    if (next.length) localStorage.setItem(KEY, JSON.stringify(next));
    else localStorage.removeItem(KEY);
  } catch {}
  listeners.forEach((l) => l());
}

export function subscribeLocalPlaces(l: () => void) {
  listeners.add(l);
  const onStorage = (e: StorageEvent) => { if (e.key === KEY) { cache = null; l(); } };
  window.addEventListener("storage", onStorage);
  return () => { listeners.delete(l); window.removeEventListener("storage", onStorage); };
}

export const getServerPlaces = () => EMPTY;

export function clearLocalPlaces() {
  write(EMPTY);
}

let last = "";

/** Saves the reader's place. Repeats of the same place are skipped. */
export async function savePlace(userId: string | null, place: LocalPlace): Promise<void> {
  const sig = `${userId}|${place.bookId}|${place.chapterId}|${place.paragraph}`;
  if (sig === last) return;
  last = sig;
  if (!userId) {
    const rest = readLocalPlaces().filter((p) => p.bookId !== place.bookId);
    write([{ ...place, updatedAt: new Date().toISOString() }, ...rest].slice(0, 50));
    return;
  }
  const { error } = await supabaseBrowser()
    .from("reading_progress")
    .upsert(
      { user_id: userId, book_id: place.bookId, chapter_id: place.chapterId, paragraph: place.paragraph },
      { onConflict: "user_id,book_id" },
    );
  if (error) last = ""; // try again on the next save
}
