import s from "./profile.module.css";

/** A round portrait, or the first letter of the name on ink. */
export function Avatar({ name, url, size = 44 }: { name: string; url: string | null; size?: number }) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <span className={s.avatar} style={{ width: size, height: size, fontSize: size * 0.42 }} aria-hidden="true">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" referrerPolicy="no-referrer" />
      ) : initial}
    </span>
  );
}
