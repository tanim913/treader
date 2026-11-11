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

export function BookBoard({ book }: { book: BookCard }) {
  const cloth = clothOf(book.cloth);
  return (
    <Link href={book.href} className={s.board} style={{ "--cloth": cloth.cloth } as CSSProperties}>
      <div className={s.cover}>
        {book.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={book.coverUrl} alt="" />
        ) : (
          <div className={`${s.panel} ${cloth.stamp === "gilt" ? s.gilt : s.blind}`}>
            <span className={s.title}>{book.title}</span>
            <span className={s.author}>{book.author}</span>
          </div>
        )}
      </div>
      <div className={s.meta}>
        <span className={s.name}>{book.title}</span>
        <span>{book.chapters} {book.chapters === 1 ? "chapter" : "chapters"}</span>
        <span aria-hidden="true">·</span>
        <span>{book.completed ? "Complete" : "Ongoing"}</span>
      </div>
    </Link>
  );
}
