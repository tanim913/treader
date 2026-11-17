"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { usePathname } from "next/navigation";
import { Heart } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";
import s from "./social.module.css";

/** A heart with a count, for a book or a chapter. Guests are sent to sign in. */
export function LikeButton({ kind, id, userId, liked: likedAtFirst, count: countAtFirst, className }: {
  kind: "book" | "chapter";
  id: string;
  userId: string | null;
  liked: boolean;
  count: number;
  className?: string;
}) {
  const [v, setV] = useState({ liked: likedAtFirst, count: countAtFirst });
  const [failed, setFailed] = useState(false);
  const [pending, start] = useTransition();
  const path = usePathname();
  const label = `${v.count} ${v.count === 1 ? "like" : "likes"}`;

  if (!userId) {
    return (
      <Link href={`/login?next=${encodeURIComponent(path)}`} className={`${s.like} ${className ?? ""}`}
        aria-label={`Like this ${kind} (sign in). ${label}`}>
        <Heart size={19} strokeWidth={1.7} aria-hidden="true" />
        <span>{v.count}</span>
      </Link>
    );
  }

  const toggle = () => {
    const before = v;
    const next = { liked: !v.liked, count: Math.max(0, v.count + (v.liked ? -1 : 1)) };
    setV(next);
    setFailed(false);
    start(async () => {
      const sb = supabaseBrowser();
      const table = kind === "book" ? "book_likes" : "likes";
      const key = kind === "book" ? "book_id" : "chapter_id";
      const { error } = next.liked
        ? await sb.from(table).insert({ user_id: userId, [key]: id })
        : await sb.from(table).delete().eq("user_id", userId).eq(key, id);
      if (error && error.code !== "23505") { setV(before); setFailed(true); }
    });
  };

  return (
    <>
      <button type="button" className={`${s.like} ${className ?? ""}`} aria-pressed={v.liked} disabled={pending}
        aria-label={`${v.liked ? "Liked" : "Like"} this ${kind}. ${label}`} onClick={toggle}>
        <Heart size={19} strokeWidth={1.7} fill={v.liked ? "currentColor" : "none"} aria-hidden="true" />
        <span>{v.count}</span>
      </button>
      {failed && <span className={s.problem} role="status">Couldn&rsquo;t save. Try again.</span>}
    </>
  );
}
