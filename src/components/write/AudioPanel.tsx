"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import JSZip from "jszip";
import { supabaseBrowser } from "@/lib/supabase/client";
import { audioUploadUrl, narrationText, removeAudio, saveAudio, setAudioEnabled } from "@/app/write/audio-actions";
import { Switch } from "./Switch";
import s from "./write.module.css";

export type AudioChapter = { id: string; number: number; title: string; status: string; bytes: number | null; duration: number | null };

const MB = (b: number) => `${(b / 1024 / 1024).toFixed(b < 10 * 1024 * 1024 ? 1 : 0)} MB`;
const mins = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
const MAX_FILE = 50 * 1024 * 1024;

/** How long an MP3 runs, read in the browser before it is uploaded. */
function durationOf(file: File): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const a = new Audio();
    a.preload = "metadata";
    a.onloadedmetadata = () => { URL.revokeObjectURL(url); resolve(Number.isFinite(a.duration) ? a.duration : 0); };
    a.onerror = () => { URL.revokeObjectURL(url); resolve(0); };
    a.src = url;
  });
}

/** Admins only: switch narration on for a book, export text for the notebook, upload and remove MP3s. */
export function AudioPanel({ bookId, slug, enabled, chapters, totalBytes, budgetBytes }: {
  bookId: string;
  slug: string;
  enabled: boolean;
  chapters: AudioChapter[];
  /** audio across every book */
  totalBytes: number;
  budgetBytes: number;
}) {
  const router = useRouter();
  const [on, setOn] = useState(enabled);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [msg, setMsg] = useState<{ text: string; bad?: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [switching, start] = useTransition();

  const bookBytes = useMemo(() => chapters.reduce((a, c) => a + (c.bytes ?? 0), 0), [chapters]);
  const withAudio = chapters.filter((c) => c.bytes).length;
  const share = Math.min(100, (totalBytes / budgetBytes) * 100);
  const chosen = chapters.filter((c) => picked.has(c.id));
  const toggle = (id: string) => setPicked((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const download = async () => {
    setBusy(true); setMsg(null);
    const r = await narrationText(bookId, chosen.map((c) => c.id));
    if (!r.ok || !r.chapters) { setBusy(false); setMsg({ text: r.error ?? "Couldn't export the text.", bad: true }); return; }
    const zip = new JSZip();
    for (const c of r.chapters) zip.file(`ch${String(c.number).padStart(2, "0")}.txt`, `# ${c.number} | ${c.title}\n\n${c.text}\n`);
    const blob = await zip.generateAsync({ type: "blob" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${slug}-narration.zip`;
    a.click();
    URL.revokeObjectURL(a.href);
    setBusy(false);
    setMsg({ text: `Downloaded the text of ${r.chapters.length} ${r.chapters.length === 1 ? "chapter" : "chapters"}. Run it through the narration notebook, then upload the MP3s here.` });
  };

  const upload = async (files: FileList) => {
    setBusy(true); setMsg(null);
    const byNumber = new Map(chapters.map((c) => [c.number, c]));
    const done: number[] = [];
    const problems: string[] = [];
    for (const f of Array.from(files)) {
      const m = /ch0*(\d+)\.mp3$/i.exec(f.name);
      const ch = m ? byNumber.get(Number(m[1])) : undefined;
      if (!ch) { problems.push(`${f.name}: name it chNN.mp3 after its chapter number`); continue; }
      if (f.size > MAX_FILE) { problems.push(`${f.name}: over 50 MB`); continue; }
      setMsg({ text: `Uploading chapter ${ch.number}…` });
      const duration = await durationOf(f);
      const link = await audioUploadUrl(bookId, ch.id);
      if (!link.ok || !link.path || !link.token) { problems.push(`chapter ${ch.number}: ${link.error}`); continue; }
      const { error } = await supabaseBrowser().storage.from("audio")
        .uploadToSignedUrl(link.path, link.token, f, { contentType: "audio/mpeg", upsert: true });
      if (error) { problems.push(`chapter ${ch.number}: upload failed`); continue; }
      const saved = await saveAudio(bookId, ch.id, { duration, voice: "Kokoro" });
      if (!saved.ok) { problems.push(`chapter ${ch.number}: ${saved.error}`); continue; }
      done.push(ch.number);
    }
    setBusy(false);
    setMsg({
      text: [done.length ? `Added audio to chapter${done.length === 1 ? "" : "s"} ${done.join(", ")}.` : "", ...problems].filter(Boolean).join(" "),
      bad: problems.length > 0,
    });
    router.refresh();
  };

  const remove = async () => {
    const ids = chosen.filter((c) => c.bytes).map((c) => c.id);
    if (!ids.length) return;
    setBusy(true); setMsg(null);
    const r = await removeAudio(bookId, ids);
    setBusy(false);
    setMsg(r.ok ? { text: `Removed audio from ${ids.length} ${ids.length === 1 ? "chapter" : "chapters"}.` } : { text: r.error ?? "Couldn't remove it.", bad: true });
    setPicked(new Set());
    router.refresh();
  };

  return (
    <div className={s.form}>
      <div className={s.audioSwitch}>
        <div>
          <p className={s.audioLabel} id="audio-on">Audio narration for this book</p>
          <p className={s.hint}>
            {on ? "On: chapters with audio get a play button in the reader." : "Off: readers see no audio, even for chapters that have it."}
          </p>
        </div>
        <Switch checked={on} disabled={switching} label="Audio narration for this book"
          onChange={(v) => { setOn(v); start(async () => { const r = await setAudioEnabled(bookId, v); if (!r.ok) setOn(!v); router.refresh(); }); }} />
      </div>

      <div className={s.field}>
        <span className={s.legend}>Storage</span>
        <div className={s.meter} role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(share)}
          aria-label="Audio storage used across all books">
          <span style={{ width: `${share}%` }} />
        </div>
        <span className={s.hint}>
          All audio uses {MB(totalBytes)} of the {MB(budgetBytes)} free storage (shared with covers and photos).
          This book: {MB(bookBytes)}, {withAudio} of {chapters.length} chapters. Each play also counts against the free plan&rsquo;s monthly downloads.
        </span>
      </div>

      <div className={s.field}>
        <span className={s.legend}>Chapters</span>
        <div className={s.actions}>
          <button type="button" className={`${s.btn} ${s.quiet}`} onClick={() => setPicked(new Set(chapters.map((c) => c.id)))}>Select all</button>
          <button type="button" className={`${s.btn} ${s.quiet}`} onClick={() => setPicked(new Set(chapters.filter((c) => !c.bytes).map((c) => c.id)))}>Select those without audio</button>
          {picked.size > 0 && <button type="button" className={`${s.btn} ${s.quiet}`} onClick={() => setPicked(new Set())}>Clear</button>}
        </div>
        <ul className={s.audioList}>
          {chapters.map((c) => (
            <li key={c.id}>
              <label className={s.audioRow}>
                <input type="checkbox" checked={picked.has(c.id)} onChange={() => toggle(c.id)} />
                <span className={s.num}>{c.number}</span>
                <span className={s.audioTitle}>{c.title}{c.status !== "published" && <span className={s.pill}>{c.status === "draft" ? "Draft" : "Scheduled"}</span>}</span>
                <span className={s.audioState}>{c.bytes ? `${mins(c.duration ?? 0)} · ${MB(c.bytes)}` : "No audio"}</span>
              </label>
            </li>
          ))}
        </ul>
      </div>

      <div className={s.actions}>
        <button type="button" className={`${s.btn} ${s.primary}`} disabled={busy || !chosen.length} onClick={download}>
          Download text for narration{chosen.length ? ` (${chosen.length})` : ""}
        </button>
        <label className={`${s.btn} ${s.quiet} ${busy ? s.disabledLabel : ""}`}>
          Upload MP3s
          <input type="file" accept="audio/mpeg,.mp3" multiple hidden disabled={busy}
            onChange={(e) => { if (e.target.files?.length) void upload(e.target.files); e.target.value = ""; }} />
        </label>
        <button type="button" className={`${s.btn} ${s.danger}`} disabled={busy || !chosen.some((c) => c.bytes)} onClick={remove}>
          Remove audio
        </button>
      </div>
      <span className={s.hint}>
        Files are matched by name: ch04.mp3 goes to chapter 4. The narration notebook names them that way.
        See narration/README.md in the treader repository for the Kokoro steps.
      </span>
      {msg && <p className={msg.bad ? s.error : s.saved} role="status">{msg.text}</p>}
    </div>
  );
}
