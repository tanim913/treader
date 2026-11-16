"use client";
// After sign-in, whatever a guest kept in this browser (bookmarks, places in books)
// moves into the account once and is cleared from the browser, so the next
// person who signs in here starts with an empty shelf.
import { clearLocal, readLocal } from "@/lib/bookmarks/local";
import { importGuestData } from "@/lib/bookmarks/actions";
import { clearLocalPlaces, readLocalPlaces } from "@/lib/progress";

let running: { user: string; done: Promise<number> } | null = null;

/** Resolves with how many items moved (0 when the browser held nothing). */
export function ensureImported(userId: string): Promise<number> {
  if (running?.user === userId) return running.done;
  const marks = readLocal();
  const places = readLocalPlaces();
  if (!marks.length && !places.length) return Promise.resolve(0);
  const done = importGuestData(
    marks,
    places.map((p) => ({ bookId: p.bookId, chapterId: p.chapterId, paragraph: p.paragraph })),
  )
    .then((r) => {
      if (!r.ok) return 0;
      clearLocal();
      clearLocalPlaces();
      return r.moved;
    })
    .catch(() => 0);
  running = { user: userId, done };
  return done;
}
