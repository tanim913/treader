import "server-only";
import { supabaseServer } from "./supabase/server";

export type Me = {
  id: string;
  handle: string;
  handleChosen: boolean;
  displayName: string;
  avatarUrl: string | null;
  role: "reader" | "admin";
};

/** The signed-in reader's profile, or null. Reads cookies: call it inside a Suspense boundary. */
export async function getMe(): Promise<Me | null> {
  const sb = await supabaseServer();
  const { data: claims } = await sb.auth.getClaims();
  const id = claims?.claims?.sub;
  if (!id) return null;
  const { data } = await sb
    .from("profiles")
    .select("id, handle, handle_chosen, display_name, avatar_url, role")
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  return {
    id: data.id,
    handle: data.handle,
    handleChosen: data.handle_chosen,
    displayName: data.display_name,
    avatarUrl: data.avatar_url,
    role: data.role,
  };
}

/** Only same-site paths are allowed as a return address after sign-in. */
export function safeNext(next: string | null | undefined): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}
