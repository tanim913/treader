import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

// A chapter's narration is in a private bucket. Row-level security decides whether this
// visitor may hear it (live chapter, audio switched on for the book); then they get a link
// that works for an hour.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const hits = new Map<string, { n: number; t: number }>();
const LIMIT = 30; // links per minute per address
const TTL = 3600;

export async function GET(request: NextRequest) {
  const c = request.nextUrl.searchParams.get("c") ?? "";
  if (!UUID.test(c)) return NextResponse.json({ error: "bad request" }, { status: 400 });

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const now = Date.now();
  const h = hits.get(ip);
  if (h && now - h.t < 60_000) {
    if (++h.n > LIMIT) return NextResponse.json({ error: "slow down" }, { status: 429 });
  } else hits.set(ip, { n: 1, t: now });

  const sb = await supabaseServer();
  const { data: row } = await sb.from("chapter_audio").select("path").eq("chapter_id", c).maybeSingle();
  if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });

  const { data, error } = await supabaseAdmin().storage.from("audio").createSignedUrl(row.path, TTL);
  if (error || !data) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  return NextResponse.json(
    { url: data.signedUrl, expiresIn: TTL },
    { headers: { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex" } },
  );
}
