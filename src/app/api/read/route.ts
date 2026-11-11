import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { toBlocks, type TNode } from "@/lib/doc";

// Chapter text is never in the page source: the reader fetches it here.
// Row-level security decides whether this visitor may see the chapter (live, or their own).

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const hits = new Map<string, { n: number; t: number }>(); // rough per-instance rate limit
const LIMIT = 40; // chapters per minute per address

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
  const { data: ch } = await sb.from("chapters").select("id").eq("id", c).maybeSingle();
  if (!ch) return NextResponse.json({ error: "not found" }, { status: 404 });

  const { data: body } = await supabaseAdmin().from("chapter_bodies").select("content").eq("chapter_id", c).maybeSingle();
  void sb.rpc("record_read", { c });

  return NextResponse.json(
    { blocks: toBlocks((body?.content ?? null) as TNode | null) },
    { headers: { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex" } },
  );
}
