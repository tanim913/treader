"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play, RotateCcw, RotateCw, X } from "lucide-react";
import s from "./AudioBar.module.css";

const SPEEDS = [0.75, 1, 1.25, 1.5];
const fmt = (t: number) => {
  if (!Number.isFinite(t) || t < 0) t = 0;
  const m = Math.floor(t / 60);
  const sec = Math.floor(t % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
};
const KEY = (c: string) => `treader-listen:${c}`;

/** The chapter's narration: a flat bar at the foot of the page. Remembers where you were in it. */
export function AudioBar({ chapterId, duration, chapterTitle, bookTitle, author, coverUrl, lifted, onClose }: {
  chapterId: string;
  duration: number;
  chapterTitle: string;
  bookTitle: string;
  author: string;
  coverUrl: string | null;
  /** the reader's own bottom bar is showing: sit above it */
  lifted: boolean;
  onClose: () => void;
}) {
  const audio = useRef<HTMLAudioElement>(null);
  const [state, setState] = useState<"idle" | "loading" | "playing" | "paused" | "error">("idle");
  const [t, setT] = useState(0);
  const [len, setLen] = useState(duration);
  const [speed, setSpeed] = useState(1);
  const loaded = useRef(false);
  const [ready, setReady] = useState(false);

  const load = async () => {
    const el = audio.current;
    if (!el) return false;
    if (loaded.current) return true;
    setState("loading");
    try {
      const r = await fetch(`/api/audio?c=${chapterId}`, { cache: "no-store" });
      if (!r.ok) throw new Error(String(r.status));
      const { url } = (await r.json()) as { url: string };
      el.src = url;
      let start = 0;
      try { start = Number(localStorage.getItem(KEY(chapterId)) || 0); } catch {}
      if (start > 5 && start < (duration || Infinity) - 10) el.currentTime = start;
      loaded.current = true;
      setReady(true);
      return true;
    } catch {
      setState("error");
      return false;
    }
  };

  const play = async () => {
    if (!(await load())) return;
    try { await audio.current?.play(); } catch { setState("error"); }
  };
  const pause = () => audio.current?.pause();
  const skip = (d: number) => {
    const el = audio.current;
    if (el && loaded.current) el.currentTime = Math.max(0, Math.min((el.duration || len) - 1, el.currentTime + d));
  };

  // lock screen and headphone buttons
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: chapterTitle, artist: author, album: bookTitle,
      artwork: coverUrl ? [{ src: coverUrl, sizes: "512x768" }] : [],
    });
    navigator.mediaSession.setActionHandler("play", () => { void play(); });
    navigator.mediaSession.setActionHandler("pause", () => pause());
    navigator.mediaSession.setActionHandler("seekbackward", () => skip(-15));
    navigator.mediaSession.setActionHandler("seekforward", () => skip(15));
    return () => {
      for (const a of ["play", "pause", "seekbackward", "seekforward"] as const) navigator.mediaSession.setActionHandler(a, null);
    };
    // the handlers read refs; bind once per chapter
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapterId]);

  // stop when the bar closes or the chapter changes
  useEffect(() => () => { audio.current?.pause(); }, []);

  const save = (time: number) => { try { localStorage.setItem(KEY(chapterId), String(Math.floor(time))); } catch {} };

  return (
    <div className={`${s.bar} ${lifted ? s.lifted : ""}`} data-ui role="region" aria-label="Listen to this chapter">
      <audio
        ref={audio}
        preload="none"
        onPlay={() => setState("playing")}
        onPause={() => { setState((x) => (x === "error" ? x : "paused")); save(audio.current?.currentTime ?? 0); }}
        onWaiting={() => setState("loading")}
        onPlaying={() => setState("playing")}
        onLoadedMetadata={(e) => { if (Number.isFinite(e.currentTarget.duration)) setLen(e.currentTarget.duration); }}
        onTimeUpdate={(e) => { const c = e.currentTarget.currentTime; setT(c); if (Math.floor(c) % 10 === 0) save(c); }}
        onEnded={() => { save(0); setState("paused"); }}
        onError={() => { if (loaded.current) setState("error"); }}
      />
      <div className={s.inner}>
        <div className={s.row}>
          <button type="button" className={s.icon} onClick={() => skip(-15)} aria-label="Back 15 seconds" disabled={!ready}>
            <RotateCcw size={20} strokeWidth={1.6} />
          </button>
          <button type="button" className={s.play} onClick={() => (state === "playing" ? pause() : void play())}
            aria-label={state === "playing" ? "Pause" : "Play"}>
            {state === "playing" ? <Pause size={22} strokeWidth={1.8} /> : <Play size={22} strokeWidth={1.8} />}
          </button>
          <button type="button" className={s.icon} onClick={() => skip(15)} aria-label="Forward 15 seconds" disabled={!ready}>
            <RotateCw size={20} strokeWidth={1.6} />
          </button>
          <span className={s.time} aria-live="off">{fmt(t)} / {fmt(len)}</span>
          <button type="button" className={s.speed} aria-label={`Speed ${speed} times. Change speed`}
            onClick={() => {
              const next = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length];
              setSpeed(next);
              if (audio.current) audio.current.playbackRate = next;
            }}>
            {speed}&times;
          </button>
          <button type="button" className={s.icon} onClick={() => { pause(); onClose(); }} aria-label="Close the player">
            <X size={20} strokeWidth={1.6} />
          </button>
        </div>
        <input type="range" className={s.scrub} min={0} max={Math.max(1, Math.round(len))} step={1} value={Math.round(t)}
          aria-label="Position in the chapter" aria-valuetext={`${fmt(t)} of ${fmt(len)}`}
          onChange={(e) => { const v = Number(e.target.value); setT(v); if (audio.current && loaded.current) audio.current.currentTime = v; }} />
        {state === "error" && <p className={s.error} role="alert">The narration couldn&rsquo;t be played. Check your connection and try again.</p>}
        {state === "loading" && <p className={s.note} role="status">Loading…</p>}
      </div>
    </div>
  );
}
