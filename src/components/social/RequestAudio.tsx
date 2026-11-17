"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { usePathname } from "next/navigation";
import { Headphones } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";
import s from "./social.module.css";

/** "Ask for audio": one request per reader per chapter (or for the whole book when chapterId is null). */
export function RequestAudio({ bookId, chapterId, userId, initial, className }: {
  bookId: string;
  chapterId: string | null;
  userId: string | null;
  initial: boolean;
  className?: string;
}) {
  const [asked, setAsked] = useState(initial);
  const [failed, setFailed] = useState(false);
  const [pending, start] = useTransition();
  const path = usePathname();
  const label = chapterId ? (asked ? "Audio requested" : "Ask for audio of this chapter") : (asked ? "Audiobook requested" : "Ask for the audiobook");

  if (!userId) {
    return (
      <Link href={`/login?next=${encodeURIComponent(path)}`} className={`${s.request} ${className ?? ""}`}>
        <Headphones size={17} strokeWidth={1.6} aria-hidden="true" /> {label}
      </Link>
    );
  }
  const toggle = () => {
    const next = !asked;
    setAsked(next);
    setFailed(false);
    start(async () => {
      const sb = supabaseBrowser();
      let error;
      if (next) {
        ({ error } = await sb.from("audio_requests").insert({ user_id: userId, book_id: bookId, chapter_id: chapterId }));
        if (error?.code === "23505") error = null;
      } else {
        let q = sb.from("audio_requests").delete().eq("user_id", userId).eq("book_id", bookId);
        q = chapterId ? q.eq("chapter_id", chapterId) : q.is("chapter_id", null);
        ({ error } = await q);
      }
      if (error) { setAsked(!next); setFailed(true); }
    });
  };
  return (
    <>
      <button type="button" className={`${s.request} ${className ?? ""}`} aria-pressed={asked} disabled={pending} onClick={toggle}
        title={asked ? "Tap to withdraw your request" : undefined}>
        <Headphones size={17} strokeWidth={1.6} aria-hidden="true" /> {label}
      </button>
      {failed && <span className={s.problem} role="status">Couldn&rsquo;t save. Try again.</span>}
    </>
  );
}
