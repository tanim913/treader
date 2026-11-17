import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import s from "./not-found.module.css";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className={s.main}>
        <h1 className={s.h1}>This isn&rsquo;t on the shelf</h1>
        <p className={s.lede}>
          The book, chapter or profile at this address doesn&rsquo;t exist, or its writer has taken it down.
        </p>
        <Link href="/" className={s.back}>Back to the shelf</Link>
      </main>
      <SiteFooter />
    </>
  );
}
