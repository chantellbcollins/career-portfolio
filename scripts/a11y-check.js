// Runs axe-core (WCAG 2.0/2.1/2.2 A+AA rules) against every page of the live
// build and fails (non-zero exit) if any page has a violation. Invoked by
// .github/workflows/a11y-check.yml against a local static server; can also be
// pointed at any other origin via A11Y_BASE_URL for a manual spot check.
const { chromium } = require('playwright');
const fs = require('fs');

const BASE = process.env.A11Y_BASE_URL || 'http://localhost:8080';
const PAGES = ['/', '/privacy.html', '/design-system.html'];
const axeSource = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

(async () => {
  const browser = await chromium.launch();
  let hadViolations = false;

  for (const p of PAGES) {
    const page = await browser.newPage();
    await page.goto(BASE + p, { waitUntil: 'networkidle' });
    await page.addScriptTag({ content: axeSource });
    const results = await page.evaluate(() =>
      window.axe.run(document, {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] }
      })
    );

    console.log(`\n=== ${p} ===`);
    if (results.violations.length === 0) {
      console.log('No violations.');
    } else {
      hadViolations = true;
      for (const v of results.violations) {
        console.log(`- [${v.impact}] ${v.id}: ${v.help} (${v.nodes.length} node${v.nodes.length > 1 ? 's' : ''})`);
        for (const n of v.nodes) {
          console.log(`    ${n.target.join(' ')}`);
        }
      }
    }
    await page.close();
  }

  await browser.close();
  if (hadViolations) {
    console.error('\nAccessibility violations found above. Failing the build.');
    process.exitCode = 1;
  } else {
    console.log('\nAll pages passed.');
  }
})();
