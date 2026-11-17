"use client";

import { useSyncExternalStore } from "react";
import { getServerPlaces, readLocalPlaces, subscribeLocalPlaces } from "@/lib/progress";

/** A pencil tick beside a chapter the reader has read: every chapter before the one they are on. */
export function ReadTick({ bookId, number, saved, signedIn }: {
  bookId: string;
  number: number;
  /** the chapter the signed-in reader is on; guests' comes from this browser */
  saved: number | null;
  signedIn: boolean;
}) {
  const local = useSyncExternalStore(subscribeLocalPlaces, readLocalPlaces, getServerPlaces);
  const on = signedIn ? saved : local.find((p) => p.bookId === bookId)?.chapterNumber ?? null;
  if (on === null || number >= on) return null;
  return (
    <span className="tick">
      <svg width="16" height="12" viewBox="0 0 16 12" aria-hidden="true">
        <path d="M1.5 6.8 C3 7.6 4.4 9 5.6 10.4 C7.6 6.9 10.6 3.4 14.6 1.2" fill="none" stroke="currentColor"
          strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="sr-only">Read</span>
    </span>
  );
}
