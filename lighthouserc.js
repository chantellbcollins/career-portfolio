// Lighthouse CI thresholds for .github/workflows/lighthouse.yml.
//
// These are a conservative starting floor, not a measured baseline: the
// PageSpeed Insights API's anonymous quota was exhausted and there's no
// local Node/Lighthouse in this dev environment to measure real scores
// first. Once the first real CI run reports actual numbers, tighten these
// to sit just below the real baseline rather than leaving them this loose.
module.exports = {
  ci: {
    collect: {
      staticDistDir: '.',
      url: ['/index.html', '/privacy.html', '/design-system.html'],
      numberOfRuns: 1,
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.7 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['error', { minScore: 0.8 }],
        'categories:seo': ['error', { minScore: 0.8 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
