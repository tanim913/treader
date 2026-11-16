"use client";
// Bookmarks of a reader who isn't signed in, kept in this browser only.
// When they sign in, these move into their account and are cleared from the browser.
import type { Bookmark, NewBookmark } from "./shape";

const KEY = "treader-bookmarks";
const EMPTY: Bookmark[] = [];
let cache: Bookmark[] | null = null;
const listeners = new Set<() => void>();

export function readLocal(): Bookmark[] {
  if (cache) return cache;
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || "[]");
    cache = Array.isArray(parsed) ? (parsed as Bookmark[]) : EMPTY;
  } catch {
    cache = EMPTY;
  }
  return cache;
}

function write(next: Bookmark[]) {
  cache = next;
  try {
    if (next.length) localStorage.setItem(KEY, JSON.stringify(next));
    else localStorage.removeItem(KEY);
  } catch {}
  listeners.forEach((l) => l());
}

export function subscribeLocal(l: () => void) {
  listeners.add(l);
  const onStorage = (e: StorageEvent) => { if (e.key === KEY) { cache = null; l(); } };
  window.addEventListener("storage", onStorage);
  return () => { listeners.delete(l); window.removeEventListener("storage", onStorage); };
}

export function addLocal(b: NewBookmark): Bookmark {
  const now = new Date().toISOString();
  const full: Bookmark = { ...b, id: crypto.randomUUID(), createdAt: now, updatedAt: now };
  write([...readLocal(), full]);
  return full;
}

export function updateLocal(id: string, note: string) {
  write(readLocal().map((b) => (b.id === id ? { ...b, note, updatedAt: new Date().toISOString() } : b)));
}

export function removeLocal(id: string) {
  write(readLocal().filter((b) => b.id !== id));
}

export function clearLocal() {
  write(EMPTY);
}
