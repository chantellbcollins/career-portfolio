// Lighthouse CI thresholds for .github/workflows/lighthouse.yml.
//
// Every run's real scores are visible as ::notice:: annotations on the
// workflow run (see lighthouse.yml's "Write score summary" step, backed by
// scripts/lighthouse-summary.js) - a channel confirmed to render reliably
// for this repo, unlike the Job Summary panel or the live log.
//
// Calibrated from real runs (2026-09), not guessed, all three pages now
// confirmed (privacy.html included, via 35471954945):
//   index.html:         perf 92/100/100, a11y 100, best-practices 96, seo 100
//   privacy.html:       perf 79/91/91,   a11y 100, best-practices 96, seo 100
//   design-system.html: perf 100/100/100, a11y 100, best-practices 96, seo 66
// design-system.html's low SEO score is expected, not a defect: it carries
// <meta name="robots" content="noindex, nofollow"> on purpose (it's not
// meant to be publicly indexed), and Lighthouse correctly penalizes a
// noindex page's SEO score for that.
//
// Performance thresholds sit below the worst individual run observed so
// far (79), not just the median, since a median-of-3 assertion can still
// fail if two of three runs land low on a noisy day. accessibility/
// best-practices/seo are rock solid across every run so their gates sit
// closer to the measured floor.
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
            'categories:performance': ['error', { minScore: 0.7 }],
            'categories:accessibility': ['error', { minScore: 0.95 }],
            'categories:best-practices': ['error', { minScore: 0.9 }],
            'categories:seo': ['off'],
          },
        },
        {
          matchingUrlPattern: '(index|privacy)\\.html',
          assertions: {
            'categories:performance': ['error', { minScore: 0.7 }],
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
