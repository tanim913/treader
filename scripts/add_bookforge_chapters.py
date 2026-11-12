"""Adds finished Without Papers chapters from BookForge to treader as DRAFTS.

Usage, from the bookforge repo root:
  .venv/bin/python -I ~/Desktop/treader/scripts/add_bookforge_chapters.py 8 9
Then ask the user before publishing (their standing rule). Reads the secret key
from ~/Desktop/treader/.env.local; never prints it.
"""
import glob, json, os, re, sys, urllib.request

BOOK_SLUG = "without-papers"
B = "projects/without_papers/"
ENV = os.path.expanduser("~/Desktop/treader/.env.local")
env = dict(l.split("=", 1) for l in open(ENV).read().splitlines() if "=" in l and not l.startswith("#"))
URL, KEY = env["NEXT_PUBLIC_SUPABASE_URL"], env["SUPABASE_SECRET_KEY"]

def api(method, path, body=None, prefer="return=representation"):
    req = urllib.request.Request(URL + "/rest/v1/" + path, method=method,
        data=None if body is None else json.dumps(body).encode(),
        headers={"apikey": KEY, "Authorization": "Bearer " + KEY, "Content-Type": "application/json", "Prefer": prefer})
    with urllib.request.urlopen(req) as r:
        t = r.read().decode()
        return json.loads(t) if t else None

numbers = [int(a) for a in sys.argv[1:]]
if not numbers:
    sys.exit("give chapter numbers, e.g. 8 9")
book = api("GET", "books?slug=eq.%s&select=id" % BOOK_SLUG)[0]
state = json.load(open(B + "state.json", encoding="utf-8"))["scenes"]
cards = [json.load(open(f, encoding="utf-8")) for f in sorted(glob.glob(B + "outline/cards/*.json"))]
titles = dict((int(n), t.strip()) for n, t in re.findall(r"^## (\d+)\. ([^(\n]*)", open(B + "outline/chapters.md", encoding="utf-8").read(), re.M))

for n in numbers:
    if api("GET", "chapters?book_id=eq.%s&number=eq.%d&select=id" % (book["id"], n)):
        print(n, "already in treader, skipped"); continue
    scenes = [c for c in cards if c["chapter"] == n]
    if not all(state.get(c["id"], {}).get("final") for c in scenes):
        print(n, "not finished in BookForge, skipped"); continue
    content, words = [], 0
    for i, c in enumerate(scenes):
        if i:
            content.append({"type": "horizontalRule"})
        for para in re.split(r"\n\s*\n", open(B + "scenes/" + state[c["id"]]["final"], encoding="utf-8").read().strip()):
            para = " ".join(para.split())
            if para:
                content.append({"type": "paragraph", "content": [{"type": "text", "text": para}]})
                words += len(para.split())
    ch = api("POST", "chapters", {"book_id": book["id"], "number": n, "title": titles[n], "status": "draft", "word_count": words})[0]
    api("POST", "chapter_bodies", {"chapter_id": ch["id"], "content": {"type": "doc", "content": content}}, prefer="return=minimal")
    print(n, titles[n], words, "words, added as a draft")
