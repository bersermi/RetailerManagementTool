#!/usr/bin/env python3
"""Measure every pasted field in store/*.md against the limit written above it.

    python3 store/limits.py

A field is a fenced block that follows `<!-- max:N -->` (characters) or
`<!-- max-bytes:N -->` (UTF-8 bytes: App Store keywords). Exits 1 if one is
over. Not in CI: a console refuses an over-long field the moment it is pasted.
"""
import pathlib
import re
import sys

FIELD = re.compile(
    r"(?:\*\*([^*\n]+)\*\*[^\n]*\n\n)?<!-- (max|max-bytes):(\d+) -->\n```\n(.*?)\n```", re.S
)
over = 0
for path in sorted(pathlib.Path(__file__).parent.glob("*.md")):
    for label, kind, limit, body in FIELD.findall(path.read_text(encoding="utf-8")):
        size = len(body.encode("utf-8")) if kind == "max-bytes" else len(body)
        unit = "bytes" if kind == "max-bytes" else "chars"
        fits = size <= int(limit)
        over += not fits
        print(f"{'ok  ' if fits else 'OVER'} {path.name:15} {(label or '(notes)')[:22]:22} {size:5} of {limit:>5} {unit}")
sys.exit(1 if over else 0)
