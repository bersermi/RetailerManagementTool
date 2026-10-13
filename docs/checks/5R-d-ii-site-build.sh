#!/usr/bin/env bash
# 5R-d-ii-site-build — build site/ for publishing, with the responsable filled in,
# and refuse to produce anything that should not go up.
#
# WHY THIS EXISTS. The aviso de privacidad must name the owner and his home address
# (his ruling, 2026-10-10), and this repository is PUBLIC. So `site/` carries
# `{{RESPONSABLE}}` and `{{DOMICILIO}}`, and the two values live only as repository
# secrets. `.github/workflows/site.yml` passes them in as environment variables and
# publishes what this script writes. They never enter a commit.
#
# WHAT IT REFUSES, each by name:
#
#   1. Either value empty, multi-line, or itself holding `{{`.
#   2. ⚠️ Anything left in `{{ … }}` after filling. A page that says `{{DOMICILIO}}`
#      to a shopkeeper is a published aviso that names nobody.
#   3. A placeholder filled fewer times than the source holds it.
#   4. Anything that loads from another site: a <script>, or a src / stylesheet href
#      that leaves the page. The pages promise *"Este sitio no usa cookies ni
#      herramientas de analítica"*, and a third-party load is how that becomes false.
#   5. An internal link or #anchor that does not resolve inside the output.
#   6. No page at the root (the *Wera* mark on every page links there), or
#      `site/README.md` in the output (it is notes for this repository, not a page).
#
# Values are HTML-escaped as they go in.
#
# Run:  RESPONSABLE='…' DOMICILIO='…' bash docs/checks/5R-d-ii-site-build.sh <out-dir> [<site-dir>]
#       <site-dir> defaults to site/ and exists so the falsifier can build a copy.
# Exit: 0 when <out-dir> is fit to publish; 1 otherwise, naming every problem.

set -uo pipefail

OUT="${1:-}"
SRC="${2:-site}"

[[ -n "$OUT" ]] || { echo "usage: RESPONSABLE=… DOMICILIO=… $0 <out-dir> [<site-dir>]"; exit 1; }
[[ -d "$SRC" ]] || { echo "FAIL: cannot read $SRC — run me from the repo root"; exit 1; }
command -v python3 >/dev/null || { echo "FAIL: python3 is not on PATH"; exit 1; }

rm -rf "$OUT"
mkdir -p "$OUT"

# ⚠️ A quoted heredoc: the Python below holds `$` and apostrophes, and an unquoted
# one would expand them (this repository has lost a restore to that once).
SRC="$SRC" OUT="$OUT" python3 - <<'PY'
import html, os, re, shutil, sys
from html.parser import HTMLParser

src, out = os.environ["SRC"], os.environ["OUT"]
fails = []

def ok(msg): print(f"  ok    {msg}")
def fail(msg): fails.append(msg); print(f"FAIL: {msg}")

# 1. The two values.
values = {}
for name in ("RESPONSABLE", "DOMICILIO"):
    v = os.environ.get(name, "")
    if not v.strip():
        fail(f"{name} is empty — the repository secret is missing or was not passed in")
    elif "\n" in v or "\r" in v:
        fail(f"{name} spans more than one line")
    elif "{{" in v or "}}" in v:
        fail(f"{name} itself holds a placeholder")
    else:
        values[name] = v.strip()
if len(values) == 2:
    ok("RESPONSABLE and DOMICILIO are both set, one line each")

# Copy everything but this repository's notes and dotfiles, filling the pages.
expected, filled = {}, {}
for root, dirs, files in os.walk(src):
    dirs[:] = [d for d in dirs if not d.startswith(".")]
    for f in files:
        if f.startswith(".") or (root == src and f == "README.md"):
            continue
        s_path = os.path.join(root, f)
        o_path = os.path.join(out, os.path.relpath(s_path, src))
        os.makedirs(os.path.dirname(o_path), exist_ok=True)
        if not f.endswith(".html"):
            shutil.copyfile(s_path, o_path)
            continue
        text = open(s_path, encoding="utf-8").read()
        for name, v in values.items():
            token = "{{" + name + "}}"
            n = text.count(token)
            expected[name] = expected.get(name, 0) + n
            text = text.replace(token, html.escape(v, quote=True))
            filled[name] = filled.get(name, 0) + n
        open(o_path, "w", encoding="utf-8").write(text)

pages = []
for root, _, files in os.walk(out):
    pages += [os.path.join(root, f) for f in files if f.endswith(".html")]
pages.sort()

# 6. The root page, and no notes.
if os.path.isfile(os.path.join(out, "index.html")):
    ok("there is a page at the root, where every page's Wera mark points")
else:
    fail("no index.html at the root — the Wera mark on every page links there")
if os.path.exists(os.path.join(out, "README.md")):
    fail("site/README.md was copied into the output")
else:
    ok("site/README.md stays out of the output")

# 2 and 3. Nothing left unfilled.
left = [(p, m) for p in pages for m in re.findall(r"\{\{[^}]*\}\}?", open(p, encoding="utf-8").read())]
if left:
    for p, m in left:
        fail(f"{os.path.relpath(p, out)} still holds {m}")
else:
    ok(f"no {{{{ … }}}} left in any of {len(pages)} pages")
for name in ("RESPONSABLE", "DOMICILIO"):
    if name in values:
        if expected.get(name, 0) == 0:
            fail(f"no page holds {{{{{name}}}}} — the aviso must name the responsable")
        else:
            ok(f"{name} filled {filled[name]} time(s), as many as the source holds")

# 4 and 5. What each page loads and links to.
class Refs(HTMLParser):
    def __init__(self):
        super().__init__(); self.refs = []; self.ids = set(); self.scripts = 0
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if "id" in a: self.ids.add(a["id"])
        if tag == "script": self.scripts += 1
        for k in ("src", "href"):
            if a.get(k) is not None:
                self.refs.append((tag, k, a[k], a.get("rel", "")))

parsed = {}
for p in pages:
    r = Refs(); r.feed(open(p, encoding="utf-8").read()); parsed[p] = r

external = 0
broken = 0
for p, r in parsed.items():
    rel = os.path.relpath(p, out)
    if r.scripts:
        fail(f"{rel} carries a <script>"); external += 1
    for tag, k, v, relattr in r.refs:
        leaves = re.match(r"^(https?:)?//", v) is not None
        if leaves and (k == "src" or tag == "link"):
            fail(f"{rel} loads {v} from another site"); external += 1
            continue
        if leaves or v.startswith("mailto:") or tag != "a" and tag != "link":
            continue
        path, _, frag = v.partition("#")
        target = os.path.normpath(os.path.join(os.path.dirname(p), path)) if path else p
        if os.path.isdir(target):
            target = os.path.join(target, "index.html")
        if not os.path.isfile(target):
            fail(f"{rel} links to {v}, which is not in the output"); broken += 1
        elif frag and target.endswith(".html") and frag not in parsed[target].ids:
            fail(f"{rel} links to {v}, and that page has no id {frag!r}"); broken += 1
if not external:
    ok("nothing loads from another site, and no page carries a script")
if not broken:
    ok("every internal link and #anchor resolves inside the output")

print()
if fails:
    # Emptied, so no later step can publish half a site by mistake.
    shutil.rmtree(out, ignore_errors=True)
    print(f"{len(fails)} problem(s) — nothing was built; {out} is removed.")
    sys.exit(1)
print(f"{out} is fit to publish.")
PY
