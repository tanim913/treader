import type { ComponentType } from "react";
import { Bookmark, BookOpen, Headphones, MessageCircle, PenLine, UserPlus } from "lucide-react";
import s from "./benefits.module.css";

type Icon = ComponentType<{ size?: number; strokeWidth?: number; "aria-hidden"?: boolean }>;

/** What a free account adds. Every line is a feature that exists; keep it that way. */
const ITEMS: { icon: Icon; title: string; detail: string }[] = [
  { icon: Bookmark, title: "Bookmarks and notes that stay yours", detail: "Keep any passage with a note, private to you, on every device." },
  { icon: BookOpen, title: "Carry on where you stopped", detail: "Your place in every book, on your phone and your computer." },
  { icon: UserPlus, title: "Follow writers", detail: "Their new chapters show up on your home page." },
  { icon: MessageCircle, title: "Like and comment", detail: "Heart the books and chapters you love, and talk about them at the end of each chapter." },
  { icon: Headphones, title: "Ask for audio", detail: "Request narration of a chapter or a whole book, and see when it's ready." },
  { icon: PenLine, title: "Publish your own writing", detail: "Write chapter by chapter, from drafts to a book with its own link." },
];

export function AccountBenefits({ columns = false }: { columns?: boolean }) {
  return (
    <ul className={`${s.list} ${columns ? s.columns : ""}`}>
      {ITEMS.map(({ icon: I, title, detail }) => (
        <li key={title} className={s.item}>
          <span className={s.icon}><I size={20} strokeWidth={1.6} aria-hidden /></span>
          <span className={s.text}>
            <span className={s.title}>{title}</span>
            <span className={s.detail}>{detail}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
