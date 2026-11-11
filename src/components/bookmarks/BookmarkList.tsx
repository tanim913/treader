"use client";

import Link from "next/link";
import type { Bookmark } from "@/lib/bookmarks/local";
import s from "./BookmarkList.module.css";

const byPlace = (a: Bookmark, b: Bookmark) =>
  a.chapterNumber - b.chapterNumber || a.start.p - b.start.p || a.start.o - b.start.o;

export function BookmarkList({ items, onPick }: {
  items: Bookmark[];
  /** Called before navigating; return true to handle the jump yourself. */
  onPick?: (b: Bookmark) => boolean;
}) {
  if (!items.length) {
    return (
      <p className={s.empty}>
        No bookmarks yet. While reading, press and hold on a line (or drag across it with a mouse) to keep it here with a note.
      </p>
    );
  }
  return (
    <ul className={s.list}>
      {[...items].sort(byPlace).map((b) => (
        <li key={b.id} className={s.item}>
          <Link
            href={`${b.href}#bm-${b.id}`}
            className={s.link}
            onClick={(e) => { if (onPick?.(b)) e.preventDefault(); }}
          >
            <span className={s.where}>Chapter {b.chapterNumber} · {b.chapterTitle}</span>
            <blockquote className={s.quote}>{b.quote}</blockquote>
            {b.note && <p className={s.note}>{b.note}</p>}
          </Link>
        </li>
      ))}
    </ul>
  );
}
