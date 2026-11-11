import "server-only";
import { redirect } from "next/navigation";
import { getMe } from "./auth";

/** The signed-in writer, or a redirect to sign in (then back to `next`). */
export async function requireMe(next: string) {
  const me = await getMe();
  if (!me) redirect(`/login?next=${encodeURIComponent(next)}`);
  if (!me.handleChosen) redirect(`/welcome?next=${encodeURIComponent(next)}`);
  return me;
}
