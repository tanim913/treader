"use client";

import { useSyncExternalStore } from "react";
import { Shelf } from "@/components/Shelf";
import { getServerPlaces, readLocalPlaces, subscribeLocalPlaces } from "@/lib/progress";

/** A guest's Continue reading shelf, from the places kept in this browser. */
export function GuestShelf({ heading, className }: { heading: React.ReactNode; className?: string }) {
  const places = useSyncExternalStore(subscribeLocalPlaces, readLocalPlaces, getServerPlaces);
  if (!places.length) return null;
  return (
    <section className={className} aria-labelledby="continue">
      {heading}
      <Shelf books={places.slice(0, 8).map((p) => ({
        href: `/b/${p.slug}/${p.chapterNumber}${p.paragraph > 0 ? `#p-${p.paragraph}` : ""}`,
        title: p.bookTitle,
        author: p.author,
        cloth: p.cloth,
        coverUrl: p.coverUrl,
        chapters: 0,
        completed: false,
        note: `Chapter ${p.chapterNumber}`,
      }))} />
    </section>
  );
}
