"use server";

import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { safeNext } from "@/lib/auth";

export type WelcomeState = { error?: string };

export async function saveWelcome(_: WelcomeState, form: FormData): Promise<WelcomeState> {
  const handle = String(form.get("handle") ?? "").trim().toLowerCase();
  const name = String(form.get("name") ?? "").trim();
  const next = safeNext(String(form.get("next") ?? "/"));

  if (!/^[a-z0-9_]{3,24}$/.test(handle)) {
    return { error: "Use 3 to 24 lowercase letters, numbers or underscores for your handle." };
  }
  if (name.length < 1 || name.length > 60) return { error: "Your name needs 1 to 60 characters." };

  const sb = await supabaseServer();
  const { data: claims } = await sb.auth.getClaims();
  const id = claims?.claims?.sub;
  if (!id) redirect("/login");

  const { error } = await sb.from("profiles").update({ handle, display_name: name, handle_chosen: true }).eq("id", id);
  if (error) {
    return { error: error.code === "23505" ? "That handle is taken. Try another." : "Couldn't save. Please try again." };
  }
  redirect(next);
}
