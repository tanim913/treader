import { SiteHeader } from "@/components/SiteHeader";
import { Shelf } from "@/components/Shelf";
import { SAMPLE_BOOKS } from "@/lib/sample/books";
import { APP_TAGLINE } from "@/lib/brand";
import s from "./page.module.css";

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main className={s.main}>
        <div className={s.intro}>
          <h1>{APP_TAGLINE}</h1>
          <p>Follow a book as it is written. Keep your own notes in its margins.</p>
        </div>
        <section className={s.section} aria-labelledby="recent">
          <h2 id="recent">Recently updated</h2>
          <Shelf books={SAMPLE_BOOKS} />
        </section>
        <p className={s.note}>These are sample books for the design preview. Real books appear here once the database is connected.</p>
      </main>
    </>
  );
}
