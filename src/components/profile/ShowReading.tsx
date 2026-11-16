"use client";

import { useState, useTransition } from "react";
import { Switch } from "@/components/write/Switch";
import { setShowReading } from "@/app/u/actions";
import s from "./profile.module.css";

/** The switch that puts "Currently reading" on this person's public profile. */
export function ShowReading({ initial }: { initial: boolean }) {
  const [on, setOn] = useState(initial);
  const [pending, start] = useTransition();
  return (
    <div className={s.switchRow}>
      <div>
        <p className={s.switchLabel} id="show-reading">Show what I&rsquo;m reading on my profile</p>
        <p className={s.switchHint}>Visitors see the books and the chapter you&rsquo;re on. Your bookmarks always stay private.</p>
      </div>
      <Switch checked={on} disabled={pending} label="Show what I'm reading on my profile"
        onChange={(v) => {
          setOn(v);
          start(async () => { const r = await setShowReading(v); if (!r.ok) setOn(!v); });
        }} />
    </div>
  );
}
