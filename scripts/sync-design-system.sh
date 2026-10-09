#!/usr/bin/env bash
# Syncs a fixed set of "should always mirror index.html" values into
# design-system.html: type scale (H1/H2 size+line-height) and the capability tab labels. Deliberately narrow
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

# --- 2. Patch design-system.html -------------------------------------------

perl -pi -e "s/\\.s-h1\\{font-size:[0-9]+px;line-height:[0-9]+px\\}/.s-h1{font-size:${H1_SIZE}px;line-height:${H1_LH}px}/" "$DS"
perl -pi -e "s/\\.hero h1\\{font-size:[0-9]+px;line-height:[0-9]+px;margin-top:8px\\}/.hero h1{font-size:${H1_SIZE}px;line-height:${H1_LH}px;margin-top:8px}/" "$DS"
perl -pi -e "s/(<b>H1:<\\/b> hero name<\\/span><b>Merriweather Bold \\(700\\), )[0-9]+px \\/ [0-9]+px/\${1}${H1_SIZE}px \\/ ${H1_LH}px/" "$DS"

perl -pi -e "s/\\.s-h2\\{font-size:[0-9]+px;line-height:[0-9]+px\\}/.s-h2{font-size:${H2_SIZE}px;line-height:${H2_LH}px}/" "$DS"
perl -pi -e "s/section\\.doc h2\\{font-size:[0-9]+px;line-height:[0-9]+px\\}/section.doc h2{font-size:${H2_SIZE}px;line-height:${H2_LH}px}/" "$DS"
perl -pi -e "s/(<b>H2:<\\/b> section headers<\\/span><b>Merriweather Bold \\(700\\), )[0-9]+px \\/ [0-9]+px/\${1}${H2_SIZE}px \\/ ${H2_LH}px/" "$DS"

# --- 2b. Keep index.html <title> and meta description in step with the hero ----
# Title is "<H1 text>: <first hero pill>"; description is the two hero pills.

H1_TEXT=$(perl -0777 -ne 'print $1 if /<h1[^>]*>(.*?)<\/h1>/s' "$SRC" | perl -pe 's/<[^>]+>//g')
PILL1=$(perl -0777 -ne '@m=/<span class="[^"]*rounded-full border border-border text-ink[^"]*">([^<]*)<\/span>/g; print $m[0]' "$SRC")
PILL2=$(perl -0777 -ne '@m=/<span class="[^"]*rounded-full border border-border text-ink[^"]*">([^<]*)<\/span>/g; print $m[1]' "$SRC")
[ -n "${H1_TEXT:-}" ] && [ -n "${PILL1:-}" ] && [ -n "${PILL2:-}" ] || fail "could not find hero H1 and pills in $SRC"
META_TITLE="${H1_TEXT}: ${PILL1}" META_DESC="${PILL1}. ${PILL2}." \
  perl -0777 -pi -e 's|<title>.*?</title>|<title>$ENV{META_TITLE}</title>|s; s|(<meta name="description" content=")[^"]*(")|$1$ENV{META_DESC}$2|' "$SRC"
# --- 3. Cache-bust styles.css on every page that links it -------------------
# design-system.html has its own inline <style>, so only index.html and
# privacy.html need this. Re-run whenever styles.css changes so returning
# visitors' browsers fetch the new file instead of serving a stale cached copy.
CSS_HASH=$(sha256sum "$CSS" | cut -c1-8)
for f in "$SRC" "privacy.html"; do
  perl -pi -e "s/href=\"styles\.css(\\?v=[0-9a-f]+)?\"/href=\"styles.css?v=${CSS_HASH}\"/" "$f"
done

echo "sync-design-system: done"
git diff --stat -- "$DS" "$SRC" privacy.html || true
