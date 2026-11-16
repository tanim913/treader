"use server";

import { supabaseServer } from "@/lib/supabase/server";
import { HANDLE } from "@/lib/paths";

export type ProfileState = { error?: string; ok?: boolean; handle?: string };

async function me() {
  const sb = await supabaseServer();
  const { data } = await sb.auth.getClaims();
  return { sb, id: data?.claims?.sub ?? null };
}

/** Saves the signed-in person's name, handle and bio. */
export async function updateProfile(_: ProfileState, form: FormData): Promise<ProfileState> {
  const { sb, id } = await me();
  if (!id) return { error: "Sign in again to edit your profile." };
  const name = String(form.get("name") ?? "").trim();
  const handle = String(form.get("handle") ?? "").trim().replace(/^@/, "").toLowerCase();
  const bio = String(form.get("bio") ?? "").trim().replace(/\r\n?/g, "\n");
  if (name.length < 1 || name.length > 60) return { error: "Your name needs 1 to 60 characters." };
  if (!HANDLE.test(handle)) return { error: "Use 3 to 24 lowercase letters, numbers or underscores for your handle." };
  if (bio.length > 400) return { error: "Keep your bio under 400 characters." };
  const { error } = await sb.from("profiles").update({ display_name: name, handle, bio, handle_chosen: true }).eq("id", id);
  if (error) return { error: error.code === "23505" ? "That handle is taken. Try another." : "Couldn't save. Please try again." };
  return { ok: true, handle };
}

/** Whether visitors see "Currently reading" on this person's profile. */
export async function setShowReading(show: boolean): Promise<{ ok: boolean }> {
  const { sb, id } = await me();
  if (!id) return { ok: false };
  const { error } = await sb.from("profiles").update({ show_reading: !!show }).eq("id", id);
  return { ok: !error };
}
