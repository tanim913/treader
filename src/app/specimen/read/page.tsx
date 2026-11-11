import type { Metadata } from "next";
import { Suspense } from "react";
import { Reader } from "@/components/reader/Reader";
import { SAMPLE_CHAPTER } from "@/lib/sample/chapters";

export const metadata: Metadata = { title: "Sample chapter" };

// Design preview with sample text. The real reader (milestone 5) loads chapters from the protected route.
export default function SpecimenRead({ searchParams }: PageProps<"/specimen/read">) {
  return (
    <Suspense>
      <Specimen searchParams={searchParams} />
    </Suspense>
  );
}

async function Specimen({ searchParams }: { searchParams: PageProps<"/specimen/read">["searchParams"] }) {
  const sp = await searchParams;
  const finished = sp.end === "1";
  return (
    <Reader
      bookId={finished ? "sample-house" : "sample-ledger"}
      bookTitle={finished ? "A House With No Stairs" : "The Salt Ledger"}
      bookHref="/"
      cloth={finished ? "bottle" : "oxblood"}
      chapterHref={finished ? "/specimen/read?end=1" : "/specimen/read"}
      chapterNumber={finished ? 22 : 7}
      chapterCount={finished ? 22 : 7}
      chapterTitle={finished ? "The Last Room" : "What the Ledger Kept"}
      minutesLeft={9}
      prevHref="/specimen/read"
      nextHref={null}
      ending={finished ? { kind: "end" } : { kind: "soon", date: "on 20 November" }}
      blocks={SAMPLE_CHAPTER}
    />
  );
}
