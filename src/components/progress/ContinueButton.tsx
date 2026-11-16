"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { getServerPlaces, readLocalPlaces, subscribeLocalPlaces } from "@/lib/progress";

type Place = { chapterNumber: number; paragraph: number };

/** "Start reading", or "Continue from chapter N" once the reader has a place in this book. */
export function ContinueButton({ slug, bookId, numbers, saved, signedIn, className }: {
  slug: string;
  bookId: string;
  /** the chapter numbers this visitor can open, in order */
  numbers: number[];
  /** the signed-in reader's place; guests' is read from this browser */
  saved: Place | null;
  signedIn: boolean;
  className?: string;
}) {
  const local = useSyncExternalStore(subscribeLocalPlaces, readLocalPlaces, getServerPlaces);
  const place = signedIn ? saved : local.find((p) => p.bookId === bookId) ?? null;
  if (place && numbers.includes(place.chapterNumber)) {
    const at = place.paragraph > 0 ? `#p-${place.paragraph}` : "";
    return <Link href={`/b/${slug}/${place.chapterNumber}${at}`} className={className}>Continue from chapter {place.chapterNumber}</Link>;
  }
  return <Link href={`/b/${slug}/${numbers[0]}`} className={className}>Start reading</Link>;
}
