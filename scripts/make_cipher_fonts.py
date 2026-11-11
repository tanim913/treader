"""Builds the scrambled reading fonts and their keys.

Each key is a shuffle of a-z, A-Z and 0-9 (each class among itself). The server
writes chapter text with the shuffled letters; the matching font draws each
shuffled letter as the real one, so the page reads normally while the text in
the page, the network and the clipboard is gibberish.

Usage (dev only, fonts are committed):
  python -m venv venv && venv/bin/pip install fonttools brotli
  npm install --no-save @fontsource/literata @fontsource/atkinson-hyperlegible
  venv/bin/python scripts/make_cipher_fonts.py <node_modules dir> [keys]
Fonts: Literata and Atkinson Hyperlegible, SIL Open Font License.
"""
import json, os, secrets, string, sys
from fontTools.ttLib import TTFont

NM = sys.argv[1]
KEYS = int(sys.argv[2]) if len(sys.argv) > 2 else 8
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "public", "f")
CLASSES = [string.ascii_lowercase, string.ascii_uppercase, string.digits]
SOURCES = {
    "s": "@fontsource/literata/files/literata-latin-{w}-{st}.woff2",
    "a": "@fontsource/atkinson-hyperlegible/files/atkinson-hyperlegible-latin-{w}-{st}.woff2",
}
STYLES = [("400", "normal", "r"), ("400", "italic", "i"), ("700", "normal", "b"), ("700", "italic", "bi")]

def shuffled(chars):
    out = list(chars)
    for i in range(len(out) - 1, 0, -1):
        j = secrets.randbelow(i + 1)
        out[i], out[j] = out[j], out[i]
    return "".join(out)

os.makedirs(OUT, exist_ok=True)
keys = []
for k in range(KEYS):
    enc = {}
    for cls in CLASSES:
        for a, b in zip(cls, shuffled(cls)):
            enc[a] = b                       # real letter -> letter written in the page
    keys.append("".join(enc[c] for cls in CLASSES for c in cls))
    for fam, pattern in SOURCES.items():
        for w, st, tag in STYLES:
            font = TTFont(os.path.join(NM, pattern.format(w=w, st=st)))
            # Read the real mapping once: the cmap subtables can share one dict,
            # and editing them one by one would apply the shuffle twice.
            base = dict(font.getBestCmap())
            remapped = dict(base)
            for real, written in enc.items():
                if ord(real) in base:
                    remapped[ord(written)] = base[ord(real)]
            for table in font["cmap"].tables:
                if table.isUnicode():
                    table.cmap = dict(remapped)
            font.flavor = "woff2"
            font.save(os.path.join(OUT, f"{k}{fam}{tag}.woff2"))
    print("key", k, "done")

alphabet = "".join(CLASSES)
json.dump({"alphabet": alphabet, "keys": keys}, open(os.path.join(ROOT, "src", "lib", "cipher", "keys.json"), "w"))
print("wrote", len(keys), "keys and", len(os.listdir(OUT)), "fonts")
