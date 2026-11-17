import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { AudioPanel } from "@/components/write/AudioPanel";
import { getMe } from "@/lib/auth";
import { STORAGE_BUDGET_BYTES } from "@/lib/audio";
import { loadAudioPanel } from "@/lib/audio-admin";
import s from "@/components/write/write.module.css";

export const metadata: Metadata = { title: "Audio narration", robots: { index: false } };

/** Narration for any book (admins only), e.g. to answer readers' audio requests for another writer's book. */
export default function AdminAudioPage({ params }: PageProps<"/admin/audio/[bookId]">) {
  return (
    <>
      <SiteHeader />
      <main className={s.main}>
        <Link href="/admin?tab=audio" className={s.back}><ChevronLeft size={18} strokeWidth={1.6} /> Audio requests</Link>
        <Suspense fallback={<p className={s.sub}>Loading…</p>}>
          <Panel params={params} />
        </Suspense>
      </main>
    </>
  );
}

async function Panel({ params }: { params: PageProps<"/admin/audio/[bookId]">["params"] }) {
  const me = await getMe();
  if (!me || me.role !== "admin") notFound();
  const { bookId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(bookId)) notFound();
  const data = await loadAudioPanel(bookId);
  if (!data) notFound();
  return (
    <>
      <h1 className={s.h1}>{data.book.title}</h1>
      <p className={s.sub}>Audio narration · <Link href={`/b/${data.book.slug}`}>Open the book</Link></p>
      <section className={s.section} aria-label="Audio narration">
        <AudioPanel bookId={data.book.id} slug={data.book.slug} enabled={data.book.audio_enabled}
          totalBytes={data.totalBytes} budgetBytes={STORAGE_BUDGET_BYTES} chapters={data.chapters} />
      </section>
    </>
  );
}
