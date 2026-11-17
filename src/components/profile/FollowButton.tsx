"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import s from "./profile.module.css";

/** Follow or unfollow a writer. Guests are sent to sign in, then back here. */
export function FollowButton({ authorId, authorName, userId, initial, className, quiet = false, label }: {
  authorId: string;
  authorName: string;
  userId: string | null;
  initial: boolean;
  className?: string;
  /** an outline button, for pages where another button is the main action */
  quiet?: boolean;
  /** what is followed, shown on the button ("Follow writer"); plain "Follow" when omitted */
  label?: string;
}) {
  const word = (on: boolean) => `${on ? "Following" : "Follow"}${label ? ` ${label}` : ""}`;
  const [on, setOn] = useState(initial);
  const [problem, setProblem] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();
  const path = usePathname();
  const cls = `${s.follow} ${on || quiet ? s.following : ""} ${className ?? ""}`;

  if (!userId) {
    return <Link href={`/login?next=${encodeURIComponent(path)}`} className={cls}>{word(false)}</Link>;
  }

  const toggle = () => {
    const next = !on;
    setOn(next);
    setProblem(false);
    start(async () => {
      const sb = supabaseBrowser();
      const { error } = next
        ? await sb.from("follows").insert({ follower_id: userId, author_id: authorId })
        : await sb.from("follows").delete().eq("follower_id", userId).eq("author_id", authorId);
      if (error && error.code !== "23505") { setOn(!next); setProblem(true); return; }
      router.refresh();
    });
  };

  return (
    <>
      <button type="button" className={cls} aria-pressed={on} disabled={pending} onClick={toggle}
        aria-label={on ? `Following ${authorName}. Tap to unfollow` : `Follow ${authorName}`}>
        {word(on)}
      </button>
      {problem && <span className={s.problem} role="status">Couldn&rsquo;t update. Try again.</span>}
    </>
  );
}
