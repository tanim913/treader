"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { updateProfile, type ProfileState } from "@/app/u/actions";
import { profileHref } from "@/lib/paths";
import sheet from "@/components/reader/SettingsSheet.module.css";
import f from "@/components/auth/auth.module.css";
import s from "./profile.module.css";

/** "Edit profile": a bottom sheet with name, handle and bio. */
export function EditProfile({ name, handle, bio }: { name: string; handle: string; bio: string }) {
  const dlg = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const [state, action, pending] = useActionState<ProfileState, FormData>(updateProfile, {});

  useEffect(() => {
    if (!state.ok || !state.handle) return;
    dlg.current?.close();
    // a new handle is a new address
    if (state.handle !== handle) router.replace(profileHref(state.handle));
    else router.refresh();
  }, [state, handle, router]);

  return (
    <>
      <button type="button" className={s.follow} onClick={() => dlg.current?.showModal()}>Edit profile</button>
      <dialog ref={dlg} className={`${sheet.sheet} ${sheet.tall}`} aria-labelledby="edit-profile"
        onClick={(e) => { if (e.target === e.currentTarget) dlg.current?.close(); }}>
        <div className={sheet.grip} aria-hidden="true" />
        <div className={sheet.headRow}>
          <h2 id="edit-profile">Edit profile</h2>
          <button type="button" className={sheet.close} onClick={() => dlg.current?.close()} aria-label="Close">
            <X size={20} strokeWidth={1.6} />
          </button>
        </div>
        <form action={action} className={`${f.form} ${s.editForm}`}>
          <div className={f.field}>
            <label htmlFor="pf-name">Name</label>
            <input id="pf-name" name="name" defaultValue={name} maxLength={60} required autoComplete="name" />
            <span className={f.hint}>Shown on your profile, your books and your comments.</span>
          </div>
          <div className={f.field}>
            <label htmlFor="pf-handle">Handle</label>
            <div className={f.prefix}>
              @<input id="pf-handle" name="handle" defaultValue={handle} maxLength={24} required
                pattern="[a-z0-9_]{3,24}" autoCapitalize="none" autoCorrect="off" spellCheck={false} />
            </div>
            <span className={f.hint}>Your profile address. Changing it changes your link.</span>
          </div>
          <div className={f.field}>
            <label htmlFor="pf-bio">Bio</label>
            <textarea id="pf-bio" name="bio" defaultValue={bio} maxLength={400} rows={4} className={s.bioInput} />
            <span className={f.hint}>A line or two about you. Up to 400 characters.</span>
          </div>
          {state.error && <p className={f.error} role="alert">{state.error}</p>}
          <button className={f.submit} disabled={pending}>{pending ? "Saving…" : "Save"}</button>
        </form>
      </dialog>
    </>
  );
}
