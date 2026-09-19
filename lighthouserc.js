// Lighthouse CI thresholds for .github/workflows/lighthouse.yml.
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
// Thresholds sit a meaningful margin below the measured scores (more for
// performance, which is the one category with real run-to-run timing
// variance at numberOfRuns:1) rather than right at them.
module.exports = {
  ci: {
    collect: {
      staticDistDir: '.',
      url: ['/index.html', '/privacy.html', '/design-system.html'],
      numberOfRuns: 1,
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
