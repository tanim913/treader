"use server";
// Moderation. Every action runs as the signed-in person; the database functions
// refuse anyone who isn't an admin (is_admin()), so these pages add no power of their own.

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export type ModResult = { ok: boolean; error?: string };

const done = (error: { message: string } | null): ModResult => {
  revalidatePath("/admin");
  return error ? { ok: false, error: error.message === "not allowed" ? "Only admins can do that." : "That didn't work. Try again." } : { ok: true };
};

export async function setHidden(target: "book" | "chapter" | "comment", id: string, hide: boolean): Promise<ModResult> {
  if (!UUID.test(id) || !["book", "chapter", "comment"].includes(target)) return { ok: false, error: "Bad request." };
  const sb = await supabaseServer();
  const { error } = await sb.rpc("admin_set_hidden", { t: target, target: id, hide: !!hide });
  return done(error);
}

export async function setBanned(userId: string, ban: boolean): Promise<ModResult> {
  if (!UUID.test(userId)) return { ok: false, error: "Bad request." };
  const sb = await supabaseServer();
  const { error } = await sb.rpc("admin_set_banned", { target: userId, ban: !!ban });
  return done(error);
}

export async function resolveReport(reportId: string, status: "open" | "resolved" | "dismissed"): Promise<ModResult> {
  if (!UUID.test(reportId) || !["open", "resolved", "dismissed"].includes(status)) return { ok: false, error: "Bad request." };
  const sb = await supabaseServer();
  const { error } = await sb.rpc("admin_resolve_report", { r: reportId, s: status });
  return done(error);
}
