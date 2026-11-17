import { profileHref } from "./paths";

/** How a book is credited on a card: its writer, or the original author plus who shared it. */
export function credit(uploader: { display_name: string; handle: string } | null | undefined, originalAuthor: string | null | undefined) {
  const name = uploader?.display_name ?? "";
  const href = uploader ? profileHref(uploader.handle) : undefined;
  return originalAuthor
    ? { author: originalAuthor, sharedBy: { name, href } }
    : { author: name, authorHref: href };
}
