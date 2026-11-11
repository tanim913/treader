import { BookBoard, type BookCard } from "./BookBoard";
import s from "./Shelf.module.css";

export function Shelf({ books }: { books: BookCard[] }) {
  return (
    <ul className={s.shelf}>
      {books.map((b) => (
        <li key={b.href}>
          <BookBoard book={b} />
        </li>
      ))}
    </ul>
  );
}
