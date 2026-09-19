// Writes real Lighthouse scores to GitHub's Job Summary panel (a static
// markdown panel, unlike the live log, which doesn't reliably render
// outside an authenticated browser session for this repo's tooling).
// Defensive on purpose: this is also the way to discover .lighthouseci's
// actual file/field structure if the table format below is ever wrong,
// rather than guessing at it again.
const fs = require('fs');
const path = require('path');

const DIR = '.lighthouseci';
const summaryPath = process.env.GITHUB_STEP_SUMMARY;
const out = [];

try {
  const files = fs.existsSync(DIR) ? fs.readdirSync(DIR) : [];
  out.push(`Files in ${DIR}: ${files.join(', ') || '(none)'}`);

  const manifestPath = path.join(DIR, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    out.push('No manifest.json found.');
  } else {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    out.push(`Manifest has ${manifest.length} entries.`);
    out.push('First entry (raw, for reference if the table below is wrong):');
    out.push('```json');
    out.push(JSON.stringify(manifest[0], null, 2).slice(0, 3000));
    out.push('```');

    const pct = (n) => (typeof n === 'number' ? Math.round(n * 100) : 'n/a');
    let md = '| URL | Performance | Accessibility | Best Practices | SEO |\n|---|---|---|---|---|\n';
    for (const entry of manifest) {
      const s = entry.summary || {};
      md += `| ${entry.url} | ${pct(s.performance)} | ${pct(s.accessibility)} | ${pct(s['best-practices'])} | ${pct(s.seo)} |\n`;
    }
    out.push('Score table (from entry.summary; may be blank if the field name above differs):');
    out.push(md);
  }
} catch (e) {
  out.push(`Error while reading Lighthouse results: ${e.message}`);
  out.push('```');
  out.push(e.stack || '');
  out.push('```');
}

if (summaryPath) {
  fs.appendFileSync(summaryPath, out.join('\n') + '\n');
} else {
  console.log(out.join('\n'));
}
