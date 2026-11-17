"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { resolveReport, setBanned, setHidden, type ModResult } from "@/app/admin/actions";
import s from "./admin.module.css";

type Act =
  | { kind: "hide"; target: "book" | "chapter" | "comment"; id: string; hide: boolean }
  | { kind: "ban"; userId: string; ban: boolean }
  | { kind: "report"; reportId: string; status: "open" | "resolved" | "dismissed" };

/** One moderation action. Banning asks once more before it goes. */
export function ModButton({ act, label, tone = "plain" }: { act: Act; label: string; tone?: "plain" | "danger" | "primary" }) {
  const [pending, start] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();
  const needsConfirm = act.kind === "ban" && act.ban;

  const run = () => start(async () => {
    setMsg(null);
    let r: ModResult;
    if (act.kind === "hide") r = await setHidden(act.target, act.id, act.hide);
    else if (act.kind === "ban") r = await setBanned(act.userId, act.ban);
    else r = await resolveReport(act.reportId, act.status);
    setConfirming(false);
    if (!r.ok) setMsg(r.error ?? "That didn't work.");
    else router.refresh();
  });

  if (confirming) {
    return (
      <span className={s.confirm}>
        <span>Ban this account? Their books and comments disappear for readers.</span>
        <button type="button" className={`${s.btn} ${s.danger}`} disabled={pending} onClick={run}>{pending ? "Banning…" : "Ban"}</button>
        <button type="button" className={s.btn} onClick={() => setConfirming(false)}>Cancel</button>
      </span>
    );
  }
  return (
    <>
      <button type="button" className={`${s.btn} ${tone === "danger" ? s.danger : tone === "primary" ? s.primary : ""}`}
        disabled={pending} onClick={() => (needsConfirm ? setConfirming(true) : run())}>
        {pending ? "Working…" : label}
      </button>
      {msg && <span className={s.error} role="alert">{msg}</span>}
    </>
  );
}
