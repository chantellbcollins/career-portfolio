#!/usr/bin/env bash
# Syncs a fixed set of "should always mirror index.html" values into
# design-system.html: type scale (H1/H2 size+line-height), the eyebrow
# tier's line-height, and two specimen copy snippets. Deliberately narrow
# scope - it does not touch spacing-scale usage or the prose captions
# describing component behavior, both of which need human/AI judgment,
# not mechanical extraction.
#
# Usage: scripts/sync-design-system.sh
# Run from the repo root, or anywhere - it cd's to its own parent/.. first.
# Exits 0 whether or not anything changed; check `git diff --stat design-system.html`
# afterward to see if a commit is warranted.

set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

SRC="index.html"
DS="design-system.html"
CSS="styles.css"

for f in "$SRC" "$DS" "$CSS"; do
  if [ ! -f "$f" ]; then echo "sync-design-system: missing $f" >&2; exit 1; fi
done

fail() { echo "sync-design-system: $1" >&2; exit 1; }

# --- 1. Extract from index.html / styles.css -------------------------------

H1_SIZE=$(grep -oP '<h1 class="font-serif font-bold text-\[\K[0-9]+(?=px\] leading-\[)' "$SRC" | head -1)
H1_LH=$(grep -oP '<h1 class="font-serif font-bold text-\[[0-9]+px\] leading-\[\K[0-9]+(?=px\])' "$SRC" | head -1)
[ -n "${H1_SIZE:-}" ] && [ -n "${H1_LH:-}" ] || fail "could not find H1 size/line-height in $SRC"

H2_SIZE=$(grep -oP '<h2 class="font-serif font-bold text-\[\K[0-9]+(?=px\] leading-\[)' "$SRC" | head -1)
H2_LH=$(grep -oP '<h2 class="font-serif font-bold text-\[[0-9]+px\] leading-\[\K[0-9]+(?=px\])' "$SRC" | head -1)
[ -n "${H2_SIZE:-}" ] && [ -n "${H2_LH:-}" ] || fail "could not find H2 size/line-height in $SRC"

EYEBROW_SIZE=$(grep -oP '\.eyebrow\{font-size:\K[0-9]+(?=px)' "$CSS" | head -1)
EYEBROW_LH=$(grep -oP '\.eyebrow\{[^}]*line-height:\K[0-9]+(?=px)' "$CSS" | head -1)
[ -n "${EYEBROW_SIZE:-}" ] || fail "could not find compiled .eyebrow font-size in $CSS"
[ -n "${EYEBROW_LH:-}" ] || fail "could not find compiled .eyebrow line-height in $CSS"

BODY_TEXT=$(perl -0777 -ne 'print $1 if /<section id="trajectory"[^>]*>.*?<h2[^>]*>Trajectory<\/h2>\s*<p[^>]*>(.*?)<\/p>/s' "$SRC")
[ -n "${BODY_TEXT:-}" ] || fail "could not find Trajectory intro paragraph in $SRC"

EYEBROW_TEXT_RAW=$(perl -ne 'print $1 if /<div class="eyebrow text-ink mb-6">(.*?)<\/div>/' "$SRC")
[ -n "${EYEBROW_TEXT_RAW:-}" ] || fail "could not find hero eyebrow div in $SRC"
# design-system's specimen writes the middot as plain text, not wrapped in a span
EYEBROW_TEXT=$(printf '%s' "$EYEBROW_TEXT_RAW" | perl -pe 's/<span class="text-terracotta">(&middot;)<\/span>/$1/g')

# --- 2. Patch design-system.html -------------------------------------------

perl -pi -e "s/\\.s-h1\\{font-size:[0-9]+px;line-height:[0-9]+px\\}/.s-h1{font-size:${H1_SIZE}px;line-height:${H1_LH}px}/" "$DS"
perl -pi -e "s/\\.hero h1\\{font-size:[0-9]+px;line-height:[0-9]+px;margin-top:8px\\}/.hero h1{font-size:${H1_SIZE}px;line-height:${H1_LH}px;margin-top:8px}/" "$DS"
perl -pi -e "s/(H1 &middot; hero name<\\/span><b>Merriweather Bold \\(700\\) &middot; )[0-9]+px \\/ [0-9]+px/\${1}${H1_SIZE}px \\/ ${H1_LH}px/" "$DS"

perl -pi -e "s/\\.s-h2\\{font-size:[0-9]+px;line-height:[0-9]+px\\}/.s-h2{font-size:${H2_SIZE}px;line-height:${H2_LH}px}/" "$DS"
perl -pi -e "s/section\\.doc h2\\{font-size:[0-9]+px;line-height:[0-9]+px;margin-top:8px\\}/section.doc h2{font-size:${H2_SIZE}px;line-height:${H2_LH}px;margin-top:8px}/" "$DS"
perl -pi -e "s/(H2 &middot; section headers<\\/span><b>Merriweather Bold \\(700\\) &middot; )[0-9]+px \\/ [0-9]+px/\${1}${H2_SIZE}px \\/ ${H2_LH}px/" "$DS"

perl -pi -e "s/\\.eyebrow\\{font-size:[0-9]+px;line-height:[0-9]+px;/.eyebrow{font-size:${EYEBROW_SIZE}px;line-height:${EYEBROW_LH}px;/" "$DS"
perl -pi -e "s/\\.s-eyebrow\\{font-size:[0-9]+px;line-height:[0-9]+px;/.s-eyebrow{font-size:${EYEBROW_SIZE}px;line-height:${EYEBROW_LH}px;/" "$DS"
perl -pi -e "s/(Eyebrow &middot; captions, labels, badges<\\/span><b>Inter Medium \\(500\\) &middot; )[0-9]+px \\/ [0-9]+px(, uppercase)/\${1}${EYEBROW_SIZE}px \\/ ${EYEBROW_LH}px\${2}/" "$DS"

BODY_TEXT_ESC=$(printf '%s' "$BODY_TEXT" | sed 's/[\/&]/\\&/g')
perl -pi -e "s/<div class=\"s-body\">.*?<\\/div>/<div class=\"s-body\">${BODY_TEXT_ESC}<\\/div>/" "$DS"

EYEBROW_TEXT_ESC=$(printf '%s' "$EYEBROW_TEXT" | sed 's/[\/&]/\\&/g')
perl -pi -e "s/<div class=\"s-eyebrow\">.*?<\\/div>/<div class=\"s-eyebrow\">${EYEBROW_TEXT_ESC}<\\/div>/" "$DS"

echo "sync-design-system: done"
git diff --stat -- "$DS" || true
