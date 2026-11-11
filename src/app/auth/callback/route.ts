import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { safeNext } from "@/lib/auth";

// Google sends the reader back here; we swap the code for a session.
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const next = safeNext(url.searchParams.get("next"));
  if (!code) {
    // Supabase reports provider failures as error / error_description; log them for the server output
    const why = url.searchParams.get("error_description") ?? url.searchParams.get("error");
    if (why) console.error("sign-in callback:", why);
    return NextResponse.redirect(new URL(`/login?error=${why ? "provider" : "missing-code"}`, url.origin));
  }

  const sb = await supabaseServer();
  const { data, error } = await sb.auth.exchangeCodeForSession(code);
  if (error || !data.user) return NextResponse.redirect(new URL("/login?error=sign-in-failed", url.origin));

  const { data: profile } = await sb.from("profiles").select("handle_chosen").eq("id", data.user.id).maybeSingle();
  const dest = profile && !profile.handle_chosen ? `/welcome?next=${encodeURIComponent(next)}` : next;
  return NextResponse.redirect(new URL(dest, url.origin));
}
