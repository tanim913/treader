"use client";
// One bookmark store for the whole app. Signed in: the reader's own rows in `notes`.
// Guest: this browser only (./local.ts), moved into the account at sign-in.
import { useCallback, useEffect, useSyncExternalStore } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { ensureImported } from "@/lib/guest-import";
import { addLocal, readLocal, removeLocal, subscribeLocal, updateLocal } from "./local";
import { saveBookmark } from "./actions";
import { fromRow, NOTE_SELECT, type Bookmark, type NewBookmark, type NoteRow } from "./shape";

export type BookmarkState = { items: Bookmark[]; ready: boolean };

const NOT_READY: BookmarkState = { items: [], ready: false };

// ---- signed in
let owner: string | null = null;
let remote: BookmarkState = NOT_READY;
const listeners = new Set<() => void>();
const setRemote = (items: Bookmark[]) => { remote = { items, ready: true }; listeners.forEach((l) => l()); };
const subscribeRemote = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };

async function load(userId: string) {
  owner = userId;
  remote = NOT_READY;
  await ensureImported(userId);
  const { data, error } = await supabaseBrowser().from("notes").select(NOTE_SELECT).order("created_at");
  if (owner !== userId) return;
  if (error) { remote = { items: [], ready: true }; listeners.forEach((l) => l()); return; }
  setRemote(((data ?? []) as unknown as NoteRow[]).map(fromRow).filter((b): b is Bookmark => !!b));
}

// ---- guest
let localItems: Bookmark[] | null = null;
let localState: BookmarkState = NOT_READY;
const getLocal = () => {
  const items = readLocal();
  if (items !== localItems) { localItems = items; localState = { items, ready: true }; }
  return localState;
};

const getServer = () => NOT_READY;

/** Every bookmark of the reader: their account's when signed in, this browser's otherwise. */
export function useBookmarkState(userId: string | null): BookmarkState {
  useEffect(() => {
    if (userId && owner !== userId) void load(userId);
  }, [userId]);
  // Whose rows are loaded is checked when React reads the store, not when the page first drew:
  // the load starts after the first render, and its result must still reach this component.
  const getRemoteFor = useCallback(() => (owner === userId ? remote : NOT_READY), [userId]);
  return useSyncExternalStore(
    userId ? subscribeRemote : subscribeLocal,
    userId ? getRemoteFor : getLocal,
    getServer,
  );
}

/** Keeps a passage. Shows at once; returns an error message if the account couldn't save it. */
export async function addBookmark(userId: string | null, b: NewBookmark): Promise<string | null> {
  if (!userId) { addLocal(b); return null; }
  const now = new Date().toISOString();
  const temp: Bookmark = { ...b, id: `tmp-${crypto.randomUUID()}`, createdAt: now, updatedAt: now };
  setRemote([...remote.items, temp]);
  const r = await saveBookmark(b.chapterId, { start: b.start, end: b.end }, b.note).catch(() => null);
  if (!r?.ok) {
    setRemote(remote.items.filter((x) => x.id !== temp.id));
    return r?.error ?? "Couldn't save the bookmark. Check your connection and try again.";
  }
  setRemote(remote.items.map((x) => (x.id === temp.id ? r.bookmark : x)));
  return null;
}

export async function updateNote(userId: string | null, id: string, note: string): Promise<string | null> {
  if (!userId) { updateLocal(id, note); return null; }
  if (id.startsWith("tmp-")) return null;
  const before = remote.items;
  setRemote(before.map((b) => (b.id === id ? { ...b, note } : b)));
  const { error } = await supabaseBrowser().from("notes").update({ note }).eq("id", id);
  if (error) { setRemote(before); return "Couldn't save the note. Check your connection and try again."; }
  return null;
}

export async function removeBookmark(userId: string | null, id: string): Promise<string | null> {
  if (!userId) { removeLocal(id); return null; }
  if (id.startsWith("tmp-")) return null;
  const before = remote.items;
  setRemote(before.filter((b) => b.id !== id));
  const { error } = await supabaseBrowser().from("notes").delete().eq("id", id);
  if (error) { setRemote(before); return "Couldn't delete the bookmark. Check your connection and try again."; }
  return null;
}
