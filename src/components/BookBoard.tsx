import Link from "next/link";
import type { CSSProperties } from "react";
import { clothOf } from "@/lib/cloth";
import s from "./BookBoard.module.css";

export type BookCard = {
  href: string;
  title: string;
  author: string;
  cloth: string;
  coverUrl?: string | null;
  chapters: number;
  completed: boolean;
  /** replaces the chapter count and status, e.g. "Chapter 5" on the Continue reading shelf */
  note?: string;
  /** the writer's profile; shows a "by Name" link under the title */
  authorHref?: string;
};

/** The cloth board (or uploaded cover) on its own. */
export function BookCover({ title, author, cloth: clothId, coverUrl }: { title: string; author: string; cloth: string; coverUrl?: string | null }) {
  const cloth = clothOf(clothId);
  return (
    <div className={s.cover} style={{ "--cloth": cloth.cloth } as CSSProperties}>
      {coverUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={coverUrl} alt="" />
      ) : (
        <div className={`${s.panel} ${cloth.stamp === "gilt" ? s.gilt : s.blind}`}>
          <span className={s.title}>{title}</span>
          <span className={s.author}>{author}</span>
        </div>
      )}
    </div>
  );
}

export function BookBoard({ book }: { book: BookCard }) {
  return (
    <div className={s.board}>
      <Link href={book.href} className={s.open}>
        <BookCover title={book.title} author={book.author} cloth={book.cloth} coverUrl={book.coverUrl} />
        <span className={s.name}>{book.title}</span>
      </Link>
      <div className={s.meta}>
        {book.authorHref && book.author && (
          <Link href={book.authorHref} className={s.by}>by {book.author}</Link>
        )}
        {book.note ? (
          <span>{book.note}</span>
        ) : (
          <>
            <span>{book.chapters} {book.chapters === 1 ? "chapter" : "chapters"}</span>
            <span aria-hidden="true">·</span>
            <span>{book.completed ? "Complete" : "Ongoing"}</span>
          </>
        )}
      </div>
    </div>
  );
}
