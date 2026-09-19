// Writes real Lighthouse scores to GitHub's Job Summary panel (a static
// markdown panel, unlike the live log, which doesn't reliably render
// outside an authenticated browser session for this repo's tooling).
//
// There is no manifest.json in this LHCI version's .lighthouseci output
// (confirmed from a real run, not assumed): the real files are
// assertion-results.json (pass/fail per assertion, with the actual score)
// and one lhr-<timestamp>.json per individual run (raw Lighthouse Result,
// several per URL since numberOfRuns is 3). This reads both directly
// rather than a manifest that doesn't exist.
const fs = require('fs');
const path = require('path');

const DIR = '.lighthouseci';
const summaryPath = process.env.GITHUB_STEP_SUMMARY;
const out = [];

function section(title, fn) {
  out.push(`\n### ${title}\n`);
  try {
    fn();
  } catch (e) {
    out.push(`Error: ${e.message}`);
    out.push('```');
    out.push(e.stack || '');
    out.push('```');
  }
}

const files = fs.existsSync(DIR) ? fs.readdirSync(DIR) : [];
out.push(`Files in ${DIR}: ${files.join(', ') || '(none)'}`);

section('Assertion results (pass/fail, real score vs. threshold)', () => {
  const p = path.join(DIR, 'assertion-results.json');
  if (!fs.existsSync(p)) {
    out.push('No assertion-results.json found.');
    return;
  }
  const results = JSON.parse(fs.readFileSync(p, 'utf8'));
  let md = '| URL | Audit | Actual | Expected | Passed |\n|---|---|---|---|---|\n';
  for (const r of results) {
    md += `| ${r.url || 'n/a'} | ${r.auditProperty || r.name || 'n/a'} | ${r.actual ?? 'n/a'} | ${r.operator || ''} ${r.expected ?? ''} | ${r.passed ? '✅' : '❌'} |\n`;
  }
  out.push(md);
});

section('Per-run category scores (all runs, not just the median)', () => {
  const lhrFiles = files.filter((f) => /^lhr-.*\.json$/.test(f));
  if (lhrFiles.length === 0) {
    out.push('No lhr-*.json files found.');
    return;
  }
  const pct = (n) => (typeof n === 'number' ? Math.round(n * 100) : 'n/a');
  let md = '| URL | Performance | Accessibility | Best Practices | SEO |\n|---|---|---|---|---|\n';
  const rows = [];
  for (const f of lhrFiles) {
    const lhr = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'));
    const url = lhr.requestedUrl || lhr.finalDisplayedUrl || lhr.finalUrl || 'n/a';
    const c = lhr.categories || {};
    rows.push({
      url,
      performance: pct(c.performance && c.performance.score),
      accessibility: pct(c.accessibility && c.accessibility.score),
      bestPractices: pct(c['best-practices'] && c['best-practices'].score),
      seo: pct(c.seo && c.seo.score),
    });
  }
  rows.sort((a, b) => a.url.localeCompare(b.url));
  for (const r of rows) {
    md += `| ${r.url} | ${r.performance} | ${r.accessibility} | ${r.bestPractices} | ${r.seo} |\n`;
    // Also emit as a workflow annotation (GitHub's "Annotations" box), a
    // channel confirmed to render reliably for this repo's tooling, unlike
    // the Job Summary panel and the live log.
    console.log(`::notice::${r.url} - perf ${r.performance} a11y ${r.accessibility} bp ${r.bestPractices} seo ${r.seo}`);
  }
  out.push(md);
});

const text = out.join('\n') + '\n';
if (summaryPath) {
  fs.appendFileSync(summaryPath, text);
} else {
  console.log(text);
}
