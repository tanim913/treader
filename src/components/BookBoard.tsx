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
    <Link href={book.href} className={s.board}>
      <BookCover title={book.title} author={book.author} cloth={book.cloth} coverUrl={book.coverUrl} />
      <div className={s.meta}>
        <span className={s.name}>{book.title}</span>
        <span>{book.chapters} {book.chapters === 1 ? "chapter" : "chapters"}</span>
        <span aria-hidden="true">·</span>
        <span>{book.completed ? "Complete" : "Ongoing"}</span>
      </div>
    </Link>
  );
}
