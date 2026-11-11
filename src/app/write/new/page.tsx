import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ChevronLeft } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { requireMe } from "@/lib/session";
import { NewBookChooser } from "@/components/write/NewBookChooser";
import s from "@/components/write/write.module.css";

export const metadata: Metadata = { title: "New book" };

export default function NewBookPage() {
  return (
    <>
      <SiteHeader />
      <main className={s.main}>
        <Link href="/write" className={s.back}><ChevronLeft size={18} strokeWidth={1.6} /> Your books</Link>
        <h1 className={s.h1}>New book</h1>
        <p className={s.sub}>Write it here, or import an EPUB you already have. Nobody sees the book until you publish it.</p>
        <div style={{ height: 32 }} />
        <Suspense>
          <Guarded />
        </Suspense>
      </main>
    </>
  );
}

async function Guarded() {
  await requireMe("/write/new");
  return <NewBookChooser />;
}
