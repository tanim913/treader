"""Publish Without Papers chapters that are drafts on treader. Only after the user says yes.

From the bookforge root:
  .venv/bin/python -I ~/Desktop/treader/scripts/publish_bookforge_chapters.py 12 13
Reads the secret key from ~/Desktop/treader/.env.local; never prints it.
"""
import json, os, sys, urllib.request
from datetime import datetime, timezone

ENV = os.path.expanduser("~/Desktop/treader/.env.local")
env = dict(l.split("=", 1) for l in open(ENV).read().splitlines() if "=" in l and not l.startswith("#"))
URL, KEY = env["NEXT_PUBLIC_SUPABASE_URL"], env["SUPABASE_SECRET_KEY"]
BOOK = "75f85045-42f1-406b-8f9a-1b8bcba9ea70"  # Without Papers, slug without-papers


def main(nums):
    now = datetime.now(timezone.utc).isoformat(timespec="seconds")
    for n in nums:
        req = urllib.request.Request(
            URL + "/rest/v1/chapters?book_id=eq.%s&number=eq.%d&status=eq.draft" % (BOOK, n), method="PATCH",
            data=json.dumps({"status": "published", "publish_at": now}).encode(),
            headers={"apikey": KEY, "Authorization": "Bearer " + KEY, "Content-Type": "application/json",
                     "Prefer": "return=representation"})
        rows = json.load(urllib.request.urlopen(req))
        print("%d %s" % (n, "published: https://treader-ashy.vercel.app/b/without-papers/%d" % n if rows
                         else "not changed (no draft with that number)"))


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    main([int(a) for a in sys.argv[1:]])
