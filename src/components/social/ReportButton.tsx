"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";
import sheet from "@/components/reader/SettingsSheet.module.css";
import s from "./social.module.css";

export type ReportTarget = "book" | "chapter" | "comment" | "profile";

const REASONS = [
  "Spam or advertising",
  "Copied without the author's permission",
  "Harassment or hate",
  "Sexual or violent content",
  "Something else",
];

/** "Report": a sheet with a reason, sent to the moderators. Guests are sent to sign in. */
export function ReportButton({ target, id, userId, what, className }: {
  target: ReportTarget;
  id: string;
  userId: string | null;
  /** what is being reported, e.g. "this chapter" */
  what: string;
  className?: string;
}) {
  const dlg = useRef<HTMLDialogElement>(null);
  const path = usePathname();
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [state, setState] = useState<"idle" | "sent" | "dupe" | "error">("idle");
  const [pending, start] = useTransition();

  if (!userId) {
    return <Link href={`/login?next=${encodeURIComponent(path)}`} className={`${s.report} ${className ?? ""}`}>Report</Link>;
  }

  const needDetails = reason === "Something else";
  const send = () => start(async () => {
    const text = (details.trim() ? `${reason}: ${details.trim()}` : reason).slice(0, 1000);
    const { error } = await supabaseBrowser().from("reports").insert({
      reporter_id: userId, target_type: target, target_id: id, reason: text,
    });
    setState(!error ? "sent" : error.code === "23505" ? "dupe" : "error");
  });
  const close = () => {
    dlg.current?.close();
    if (state !== "idle") { setState("idle"); setReason(""); setDetails(""); }
  };

  return (
    <>
      <button type="button" className={`${s.report} ${className ?? ""}`} data-ui onClick={() => dlg.current?.showModal()}>
        Report
      </button>
      <dialog ref={dlg} className={`${sheet.sheet} ${sheet.tall}`} aria-labelledby={`report-${id}`} data-ui
        onClick={(e) => { if (e.target === e.currentTarget) close(); }} onClose={close}>
        <div className={sheet.grip} aria-hidden="true" />
        <div className={sheet.headRow}>
          <h2 id={`report-${id}`}>Report {what}</h2>
          <button type="button" className={sheet.close} onClick={close} aria-label="Close">
            <X size={20} strokeWidth={1.6} />
          </button>
        </div>
        {state === "sent" || state === "dupe" ? (
          <div className={s.sheetBody}>
            <p>{state === "sent"
              ? "Thank you. The moderators will look at it. You won't be told who else reported it."
              : "You've already reported this, and it's waiting for the moderators."}</p>
            <button type="button" className={s.primaryBtn} onClick={close}>Done</button>
          </div>
        ) : (
          <div className={s.sheetBody}>
            <fieldset className={s.reasons}>
              <legend>What&rsquo;s wrong?</legend>
              {REASONS.map((r) => (
                <label key={r} className={s.reason}>
                  <input type="radio" name={`reason-${id}`} value={r} checked={reason === r} onChange={() => setReason(r)} />
                  <span>{r}</span>
                </label>
              ))}
            </fieldset>
            <label className={s.detailsLabel} htmlFor={`details-${id}`}>
              {needDetails ? "Tell us what's wrong" : "Anything else the moderators should know (optional)"}
            </label>
            <textarea id={`details-${id}`} className={s.textarea} rows={3} maxLength={800}
              value={details} onChange={(e) => setDetails(e.target.value)} />
            {state === "error" && <p className={s.problem} role="alert">Couldn&rsquo;t send the report. Try again.</p>}
            <button type="button" className={s.primaryBtn} onClick={send}
              disabled={pending || !reason || (needDetails && !details.trim())}>
              {pending ? "Sending…" : "Send report"}
            </button>
          </div>
        )}
      </dialog>
    </>
  );
}
