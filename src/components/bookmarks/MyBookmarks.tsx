"use client";

import { useMemo } from "react";
import { clothOf } from "@/lib/cloth";
import { useBookmarks, type Bookmark } from "@/lib/bookmarks/local";
import { BookmarkList } from "./BookmarkList";
import s from "./MyBookmarks.module.css";

export function MyBookmarks() {
  const all = useBookmarks();
  const books = useMemo(() => {
    const map = new Map<string, Bookmark[]>();
    for (const b of all) map.set(b.bookId, [...(map.get(b.bookId) ?? []), b]);
    // most recently bookmarked book first
    return [...map.values()].sort((a, b) =>
      Math.max(...b.map((x) => Date.parse(x.createdAt))) - Math.max(...a.map((x) => Date.parse(x.createdAt))));
  }, [all]);

  if (!books.length) return <BookmarkList items={[]} />;

  return (
    <div className={s.books}>
      {books.map((items) => {
        const first = items[0];
        return (
          <section key={first.bookId} className={s.book} aria-labelledby={`b-${first.bookId}`}>
            <header className={s.head}>
              <span className={s.board} style={{ background: clothOf(first.cloth).cloth }} aria-hidden="true" />
              <div>
                <h2 id={`b-${first.bookId}`} className={s.title}>{first.bookTitle}</h2>
                <p className={s.count}>{items.length} {items.length === 1 ? "bookmark" : "bookmarks"}</p>
              </div>
            </header>
            <BookmarkList items={items} />
          </section>
        );
      })}
    </div>
  );
}
