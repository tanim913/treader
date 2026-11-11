"use server";

import { redirect } from "next/navigation";
import { getMe } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";

export type DeleteState = { error?: string };

/** Permanently deletes the signed-in account. The database cascades from the auth user to everything they own. */
export async function deleteAccount(_: DeleteState, form: FormData): Promise<DeleteState> {
  const me = await getMe();
  if (!me) redirect("/login");
  const typed = String(form.get("confirm") ?? "").trim().replace(/^@/, "").toLowerCase();
  if (typed !== me.handle) return { error: `Type your handle, ${me.handle}, to confirm.` };

  const admin = supabaseAdmin();
  // uploaded images live in folders named after the user id
  for (const bucket of ["covers", "avatars"]) {
    const { data: files } = await admin.storage.from(bucket).list(me.id, { limit: 1000 });
    if (files?.length) await admin.storage.from(bucket).remove(files.map((f) => `${me.id}/${f.name}`));
  }
  const { error } = await admin.auth.admin.deleteUser(me.id);
  if (error) return { error: "Couldn't delete the account. Please try again, or email us." };

  const sb = await supabaseServer();
  await sb.auth.signOut();
  redirect("/?account=deleted");
}
