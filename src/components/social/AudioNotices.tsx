"use client";

import Link from "next/link";
import { useState } from "react";
import { Headphones, X } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { AudioNotice } from "@/lib/requests";
import s from "./social.module.css";

/** "Now with audio": answered requests, until the reader dismisses or opens them. */
export function AudioNotices({ items }: { items: AudioNotice[] }) {
  const [left, setLeft] = useState(items);
  const seen = (id: string) => {
    setLeft((l) => l.filter((x) => x.id !== id));
    void supabaseBrowser().from("audio_requests").update({ seen_at: new Date().toISOString() }).eq("id", id);
  };
  if (!left.length) return null;
  return (
    <section className={s.notices} aria-labelledby="now-audio">
      <h2 id="now-audio" className={s.noticesHead}><Headphones size={18} strokeWidth={1.6} aria-hidden="true" /> Now with audio</h2>
      <ul>
        {left.map((n) => (
          <li key={n.id} className={s.notice}>
            <Link href={n.href} onClick={() => seen(n.id)}>{n.text}</Link>
            <span className={s.noticeNote}>You asked for this.</span>
            <button type="button" className={s.noticeX} aria-label={`Dismiss: ${n.text}`} onClick={() => seen(n.id)}>
              <X size={16} strokeWidth={1.6} />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
