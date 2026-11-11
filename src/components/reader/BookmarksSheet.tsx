"use client";

import { forwardRef } from "react";
import { X } from "lucide-react";
import { jumpToBookmark, type Bookmark } from "@/lib/bookmarks/local";
import { BookmarkList } from "@/components/bookmarks/BookmarkList";
import s from "./SettingsSheet.module.css";

export const BookmarksSheet = forwardRef<HTMLDialogElement, { bookTitle: string; items: Bookmark[]; chapterHref: string }>(
  function BookmarksSheet({ bookTitle, items, chapterHref }, ref) {
    const dlg = () => (ref as React.RefObject<HTMLDialogElement>)?.current;
    return (
      <dialog
        ref={ref}
        className={`${s.sheet} ${s.tall}`}
        aria-labelledby="bookmarks-title"
        onClick={(e) => { if (e.target === e.currentTarget) dlg()?.close(); }}
      >
        <div className={s.grip} aria-hidden="true" />
        <div className={s.headRow}>
          <h2 id="bookmarks-title">Bookmarks in {bookTitle}</h2>
          <button className={s.close} onClick={() => dlg()?.close()} aria-label="Close bookmarks">
            <X size={20} strokeWidth={1.6} />
          </button>
        </div>
        <BookmarkList
          items={items}
          onPick={(b) => {
            if (b.href !== chapterHref) return false; // another chapter: navigate
            dlg()?.close();
            jumpToBookmark(b.id);
            return true;
          }}
        />
      </dialog>
    );
  },
);
