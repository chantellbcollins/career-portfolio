// Lighthouse CI thresholds for .github/workflows/lighthouse.yml.
//
// Every run's real scores are written to the workflow's Job Summary panel
// (see lighthouse.yml's "Write score summary" step) - check there for
// privacy.html's numbers, which weren't in the original calibration sample.
//
// Calibrated from a real run's reports (2026-09), not guessed: index.html
// scored perf 0.93 / a11y 1.00 / best-practices 0.96 / seo 1.00, and
// design-system.html scored perf 1.00 / a11y 1.00 / best-practices 0.96 /
// seo 0.66. That low SEO score is expected, not a defect: design-system.html
// carries <meta name="robots" content="noindex, nofollow"> on purpose (it's
// not meant to be publicly indexed), and Lighthouse correctly penalizes a
// noindex page's SEO score for that. privacy.html wasn't in the sample; it
// shares index.html's template so is assumed to track similarly until a
// real run says otherwise.
//
// Thresholds sit a meaningful margin below the measured scores. Performance
// is back to 'error' (was 'warn' after a single-run 0.85 gate failed on
// shared-runner noise): numberOfRuns is now 3, so LHCI asserts against the
// median of three runs per URL instead of one, which is the standard fix
// for shared-CI-hardware noise (CPU contention in ephemeral containers can
// swing a single Lighthouse performance run 10-20 points, but rarely skews
// a median of three the same way). Revisit back to 'warn' if it still
// proves flaky after this.
module.exports = {
  ci: {
    collect: {
      staticDistDir: '.',
      url: ['/index.html', '/privacy.html', '/design-system.html'],
      numberOfRuns: 3,
    },
    assert: {
      assertMatrix: [
        {
          matchingUrlPattern: 'design-system\\.html',
          assertions: {
            'categories:performance': ['error', { minScore: 0.85 }],
            'categories:accessibility': ['error', { minScore: 0.95 }],
            'categories:best-practices': ['error', { minScore: 0.9 }],
            'categories:seo': ['off'],
          },
        },
        {
          matchingUrlPattern: '(index|privacy)\\.html',
          assertions: {
            'categories:performance': ['error', { minScore: 0.85 }],
            'categories:accessibility': ['error', { minScore: 0.95 }],
            'categories:best-practices': ['error', { minScore: 0.9 }],
            'categories:seo': ['error', { minScore: 0.9 }],
          },
        },
      ],
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
