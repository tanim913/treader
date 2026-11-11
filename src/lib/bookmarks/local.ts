"use client";
// Bookmarks kept in this browser until Supabase is connected (milestone 3);
// the same interface will then read and write the private `notes` table.
import { useSyncExternalStore } from "react";
import type { Range } from "@/lib/text";

export type Bookmark = Range & {
  id: string;
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

const KEY = "treader-bookmarks";
const EMPTY: Bookmark[] = [];
let cache: Bookmark[] | null = null;
const listeners = new Set<() => void>();

function read(): Bookmark[] {
  if (cache) return cache;
  try {
    cache = JSON.parse(localStorage.getItem(KEY) || "[]") as Bookmark[];
  } catch {
    cache = [];
  }
  return cache;
}

function write(next: Bookmark[]) {
  cache = next;
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  const onStorage = (e: StorageEvent) => { if (e.key === KEY) { cache = null; l(); } };
  window.addEventListener("storage", onStorage);
  return () => { listeners.delete(l); window.removeEventListener("storage", onStorage); };
}

export function useBookmarks(): Bookmark[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

export function addBookmark(b: Omit<Bookmark, "id" | "createdAt" | "updatedAt">): Bookmark {
  const now = new Date().toISOString();
  const full: Bookmark = { ...b, id: crypto.randomUUID(), createdAt: now, updatedAt: now };
  write([...read(), full]);
  return full;
}

export function updateNote(id: string, note: string) {
  write(read().map((b) => (b.id === id ? { ...b, note, updatedAt: new Date().toISOString() } : b)));
}

export function removeBookmark(id: string) {
  write(read().filter((b) => b.id !== id));
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
