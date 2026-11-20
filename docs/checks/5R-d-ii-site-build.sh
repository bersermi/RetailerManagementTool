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
# ⚠️ SINCE `5R-r` TWO MORE: the owner's WhatsApp on his page (`bernardo/index.html`),
# `{{WHATSAPP}}` — the digits `https://wa.me/` takes — and `{{WHATSAPP_TEXTO}}` — the
# number as the page shows it. His number is never in this public repository either:
# the repository secrets `WHATSAPP` and `WHATSAPP_TEXTO`, passed in the same way.
#
# WHAT IT REFUSES, each by name:
#
#   1. Any of the four values empty, multi-line, or itself holding `{{` — and since
#      `5R-r`, `WHATSAPP` that is not 10 to 15 digits (wa.me takes nothing else), or
#      `WHATSAPP_TEXTO` whose digits are not the end of `WHATSAPP`'s (the number shown
#      and the number dialled would differ).
#   2. ⚠️ Anything left in `{{ … }}` after filling. A page that says `{{DOMICILIO}}`
#      to a shopkeeper is a published aviso that names nobody.
#   3. A placeholder filled fewer times than the source holds it.
#   4. Anything that loads from another site: a <script src>, or a src / stylesheet
#      href that leaves the page. The pages promise *"Este sitio no usa cookies ni
#      herramientas de analítica"*, and a third-party load is how that becomes false.
#      ⚠️ Since `10.9c` ONE page may carry ONE inline script — `cocina/index.html`, a
#      kitchen's address, which reads her name from the link (G40: nothing is
#      readable without an account) — and that script may only read the address bar:
#      a request, storage, a cookie or writing HTML into the page is refused.
#   5. An internal link or #anchor that does not resolve inside the output.
#   6. No page at the root (the *Wera* mark on every page links there), or
#      `site/README.md` in the output (it is notes for this repository, not a page).
#   7. ⚠️ `10.9c`: the two files that hand a kitchen's address to Itacate —
#      `.well-known/apple-app-site-association` (no extension: the iPhone asks for
#      that name) and `.well-known/assetlinks.json` — missing from the output, or not
#      JSON of the shape each phone reads. `.well-known/` is the one dot-folder copied;
#      `site.yml` uploads it with `include-hidden-files`, which GitHub's upload drops
#      without.
#
# Values are HTML-escaped as they go in.
#
# Run:  RESPONSABLE='…' DOMICILIO='…' WHATSAPP='52…' WHATSAPP_TEXTO='…' \
#         bash docs/checks/5R-d-ii-site-build.sh <out-dir> [<site-dir>]
#       <site-dir> defaults to site/ and exists so the falsifier can build a copy.
# Exit: 0 when <out-dir> is fit to publish; 1 otherwise, naming every problem.

set -uo pipefail

OUT="${1:-}"
SRC="${2:-site}"

[[ -n "$OUT" ]] || { echo "usage: RESPONSABLE=… DOMICILIO=… WHATSAPP=… WHATSAPP_TEXTO=… $0 <out-dir> [<site-dir>]"; exit 1; }
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

# 1. The values. The first two name the responsable in both avisos; since `5R-r` the
#    last two are the owner's WhatsApp on his page.
NAMES = ("RESPONSABLE", "DOMICILIO", "WHATSAPP", "WHATSAPP_TEXTO")
values = {}
for name in NAMES:
    v = os.environ.get(name, "")
    if not v.strip():
        fail(f"{name} is empty — the repository secret is missing or was not passed in")
    elif "\n" in v or "\r" in v:
        fail(f"{name} spans more than one line")
    elif "{{" in v or "}}" in v:
        fail(f"{name} itself holds a placeholder")
    else:
        values[name] = v.strip()
if "WHATSAPP" in values and not re.fullmatch(r"[0-9]{10,15}", values["WHATSAPP"]):
    fail("WHATSAPP is not 10 to 15 digits — https://wa.me/ takes the country code and number, nothing else")
    del values["WHATSAPP"]
if "WHATSAPP" in values and "WHATSAPP_TEXTO" in values:
    shown = re.sub(r"[^0-9]", "", values["WHATSAPP_TEXTO"])
    if len(shown) < 10 or not values["WHATSAPP"].endswith(shown):
        fail("WHATSAPP_TEXTO's digits are not the end of WHATSAPP — the number shown would not be the one dialled")
        del values["WHATSAPP_TEXTO"]
if len(values) == len(NAMES):
    ok("RESPONSABLE, DOMICILIO, WHATSAPP and WHATSAPP_TEXTO are all set, one line each, the two numbers one number")

# Copy everything but this repository's notes and dotfiles, filling the pages.
expected, filled = {}, {}
for root, dirs, files in os.walk(src):
    # `.well-known/` alone of the dot-folders (7): the phones' association files.
    dirs[:] = [d for d in dirs if not d.startswith(".") or (root == src and d == ".well-known")]
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
WHERE = {"RESPONSABLE": "the aviso must name the responsable", "DOMICILIO": "the aviso must name the responsable",
         "WHATSAPP": "the owner's page links his WhatsApp", "WHATSAPP_TEXTO": "the owner's page shows his WhatsApp"}
for name in NAMES:
    if name in values:
        if expected.get(name, 0) == 0:
            fail(f"no page holds {{{{{name}}}}} — {WHERE[name]}")
        else:
            ok(f"{name} filled {filled[name]} time(s), as many as the source holds")

# 4 and 5. What each page loads and links to.
class Refs(HTMLParser):
    def __init__(self):
        super().__init__(); self.refs = []; self.ids = set(); self.scripts = 0; self.code = []; self._in = False
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if "id" in a: self.ids.add(a["id"])
        if tag == "script":
            self.scripts += 1; self._in = True
        for k in ("src", "href"):
            if a.get(k) is not None:
                self.refs.append((tag, k, a[k], a.get("rel", "")))
    def handle_endtag(self, tag):
        if tag == "script": self._in = False
    def handle_data(self, data):
        if self._in: self.code.append(data)

# 4. The one page that may carry a script, and what its script may never do.
SCRIPT_PAGES = {os.path.join("cocina", "index.html")}
FORBIDDEN_IN_SCRIPT = re.compile(
    r"\b(fetch|XMLHttpRequest|sendBeacon|WebSocket|EventSource|cookie|localStorage|sessionStorage|"
    r"indexedDB|caches|serviceWorker|import|eval|Function|innerHTML|outerHTML|insertAdjacentHTML|write|open|"
    r"postMessage|location\.(href|assign|replace))\b")

parsed = {}
for p in pages:
    r = Refs(); r.feed(open(p, encoding="utf-8").read()); parsed[p] = r

external = 0
broken = 0
for p, r in parsed.items():
    rel = os.path.relpath(p, out)
    if r.scripts and rel not in SCRIPT_PAGES:
        fail(f"{rel} carries a <script>"); external += 1
    elif r.scripts > 1:
        fail(f"{rel} carries {r.scripts} scripts — one at most"); external += 1
    elif r.scripts:
        bad = sorted(set(m.group(0) for m in FORBIDDEN_IN_SCRIPT.finditer("".join(r.code))))
        if bad:
            fail(f"{rel}'s script uses {', '.join(bad)} — it may only read the address bar"); external += 1
    for tag, k, v, relattr in r.refs:
        if tag == "script" and k == "src":
            fail(f"{rel} loads a script from {v} — the one script is inline"); external += 1
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
    ok("nothing loads from another site, and no page but cocina/ carries a script — its one reads only the address bar")
if not broken:
    ok("every internal link and #anchor resolves inside the output")

# 7. The phones' association files.
import json
aasa = os.path.join(out, ".well-known", "apple-app-site-association")
links = os.path.join(out, ".well-known", "assetlinks.json")
for path, name in ((aasa, "apple-app-site-association"), (links, "assetlinks.json")):
    if not os.path.isfile(path):
        fail(f".well-known/{name} is not in the output — a kitchen's address would open the browser, never Itacate")
try:
    d = json.load(open(aasa, encoding="utf-8")) if os.path.isfile(aasa) else None
    if d is not None:
        det = d["applinks"]["details"]
        assert det and all(x["appIDs"] and x["components"] for x in det)
        ok(f".well-known/apple-app-site-association is JSON with {sum(len(x['appIDs']) for x in det)} app id(s)")
except Exception as e:
    fail(f".well-known/apple-app-site-association is not what an iPhone reads: {e!r}")
try:
    d = json.load(open(links, encoding="utf-8")) if os.path.isfile(links) else None
    if d is not None:
        assert isinstance(d, list) and d
        fp = re.compile(r"^([0-9A-F]{2}:){31}[0-9A-F]{2}$")
        for x in d:
            t = x["target"]
            assert "delegate_permission/common.handle_all_urls" in x["relation"] and t["namespace"] == "android_app"
            assert t["package_name"] and t["sha256_cert_fingerprints"]
            assert all(fp.match(f) for f in t["sha256_cert_fingerprints"]), "a fingerprint is not 32 upper-case hex pairs"
        ok(f".well-known/assetlinks.json is JSON with {sum(len(x['target']['sha256_cert_fingerprints']) for x in d)} key(s)")
except Exception as e:
    fail(f".well-known/assetlinks.json is not what Android reads: {e!r}")

print()
if fails:
    # Emptied, so no later step can publish half a site by mistake.
    shutil.rmtree(out, ignore_errors=True)
    print(f"{len(fails)} problem(s) — nothing was built; {out} is removed.")
    sys.exit(1)
print(f"{out} is fit to publish.")
PY
