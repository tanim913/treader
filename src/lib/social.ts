import "server-only";
import { supabaseServer } from "./supabase/server";

/** How many people like a book or chapter, and whether this reader does. */
export async function likeState(kind: "book" | "chapter", id: string, userId: string | null) {
  const sb = await supabaseServer();
  const table = kind === "book" ? "book_likes" : "likes";
  const key = kind === "book" ? "book_id" : "chapter_id";
  const [all, mine] = await Promise.all([
    sb.from(table).select("user_id", { count: "exact", head: true }).eq(key, id),
    userId
      ? sb.from(table).select("user_id").eq(key, id).eq("user_id", userId).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  return { count: all.count ?? 0, liked: !!mine.data };
}
