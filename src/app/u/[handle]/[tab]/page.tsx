import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Avatar } from "@/components/profile/Avatar";
import { profileHref } from "@/lib/paths";
import { followCounts, followList, getProfile } from "@/lib/profiles";
import s from "@/components/profile/profile.module.css";

const TABS = ["followers", "following"] as const;
type Tab = (typeof TABS)[number];
const isTab = (t: string): t is Tab => (TABS as readonly string[]).includes(t);

export async function generateMetadata({ params }: PageProps<"/u/[handle]/[tab]">): Promise<Metadata> {
  const { handle, tab } = await params;
  const p = await getProfile(handle);
  if (!p || !isTab(tab)) return { title: "Not found" };
  return { title: `${tab === "followers" ? "Followers of" : "Followed by"} ${p.displayName}` };
}

export default function FollowsPage({ params }: PageProps<"/u/[handle]/[tab]">) {
  return (
    <>
      <SiteHeader />
      <main className={s.main}>
        <Suspense fallback={<p className={s.loading}>Opening the list…</p>}>
          <Follows params={params} />
        </Suspense>
      </main>
      <SiteFooter />
    </>
  );
}

async function Follows({ params }: { params: PageProps<"/u/[handle]/[tab]">["params"] }) {
  const { handle, tab } = await params;
  if (!isTab(tab)) notFound();
  const p = await getProfile(handle);
  if (!p) notFound();
  const [people, counts] = await Promise.all([followList(p.id, tab), followCounts(p.id)]);
  const base = profileHref(p.handle);

  return (
    <>
      <Link href={base} className={s.back}><ChevronLeft size={18} strokeWidth={1.6} aria-hidden="true" />{p.displayName}</Link>
      <h1 className={s.name}>{tab === "followers" ? "Followers" : "Following"}</h1>
      <nav className={s.tabs} aria-label="Followers and following">
        <Link href={`${base}/followers`} className={s.tab} aria-current={tab === "followers" ? "page" : undefined}>
          {counts.followers} {counts.followers === 1 ? "follower" : "followers"}
        </Link>
        <Link href={`${base}/following`} className={s.tab} aria-current={tab === "following" ? "page" : undefined}>
          {counts.following} following
        </Link>
      </nav>
      {people.length ? (
        <ul className={s.people}>
          {people.map((x) => (
            <li key={x.handle}>
              <Link href={profileHref(x.handle)} className={s.person}>
                <Avatar name={x.displayName} url={x.avatarUrl} size={44} />
                <span className={s.personText}>
                  <span className={s.personName}>{x.displayName}</span>
                  <span className={s.personHandle}>@{x.handle}</span>
                  {x.bio && <span className={s.personBio}>{x.bio}</span>}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className={s.empty}>
          {tab === "followers" ? `Nobody follows ${p.displayName} yet.` : `${p.displayName} doesn’t follow anyone yet.`}
        </p>
      )}
    </>
  );
}
