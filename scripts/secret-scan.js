#!/usr/bin/env node
// Scans files for phone numbers, emails, street addresses and key-like strings.
// Prints file, line and rule name only. It never prints the matched text,
// so CI logs cannot leak what the scan finds.
//
// Usage:
//   node scripts/secret-scan.js --base <git-ref>   scan files changed since <ref>
//   node scripts/secret-scan.js --all              scan every tracked file
//   node scripts/secret-scan.js file1 file2 ...    scan these files
//
// Intended public strings live in scripts/secret-scan-allowlist.json.

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const allow = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'secret-scan-allowlist.json'), 'utf8')
);
const allowedEmails = new Set(allow.emails.map((e) => e.toLowerCase()));
const allowedStrings = allow.strings || [];
const skipFiles = new Set(allow.skipFiles || []);

const BINARY_EXT = /\.(png|jpe?g|gif|webp|ico|woff2?|ttf|otf|mp4|webm|mp3|pdf|zip|gz)$/i;

const RULES = [
  // Phone numbers
  { name: 'phone-international', re: /(?<![\w.#\/-])(?:\+|00)[1-9]\d{0,2}[ .\-]?\(?\d{1,4}\)?(?:[ .\-]?\d{2,4}){2,4}(?![\w])/g },
  { name: 'phone-tel-link', re: /\btel:\s*[+\d(]/gi },
  { name: 'phone-local', re: /(?<![\w.#\/-])0\d{1,4}[ \/.\-]\d{3,}(?:[ .\-]?\d{2,}){0,2}(?![\w])/g,
    ok: (m) => m.replace(/\D/g, '').length < 9 }, // dates and timestamps have fewer digits
  { name: 'phone-us', re: /(?<![\w.#\/-])(?:\(\d{3}\)\s?|\d{3}[ .\-])\d{3}[ .\-]\d{4}(?![\w])/g },
  // Emails (checked against the allowlist below)
  { name: 'email', re: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g,
    ok: (m) => allowedEmails.has(m.toLowerCase()) },
  // Street addresses
  { name: 'address-de', re: /\b[A-ZÄÖÜ][\wäöüß.\-]*(?:straße|strasse|gasse|weg|platz|allee|ring|gürtel|zeile|lände)\.?\s+\d+[a-z]?\b/g },
  { name: 'address-en', re: /\b\d{1,5}[a-z]?\s+(?:[A-Z][a-z]+\s+){1,3}(?:Street|St|Road|Rd|Avenue|Ave|Lane|Ln|Drive|Dr|Boulevard|Blvd)\b\.?/g },
  { name: 'address-postcode', re: /\b[1-9]\d{3}\s+(?:Wien|Vienna)\b/g },
  // Key-like strings
  { name: 'key-private-block', re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/g },
  { name: 'key-aws', re: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g },
  { name: 'key-github', re: /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,})\b/g },
  { name: 'key-openai-anthropic', re: /\bsk-(?:ant-)?[A-Za-z0-9_\-]{20,}/g },
  { name: 'key-slack', re: /\bxox[abprs]-[A-Za-z0-9-]{10,}/g },
  { name: 'key-google', re: /\bAIza[0-9A-Za-z_\-]{35}\b/g },
  { name: 'key-stripe', re: /\b[sr]k_live_[0-9A-Za-z]{16,}/g },
  { name: 'key-jwt', re: /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g },
  { name: 'key-assignment', re: /\b(?:api[_-]?key|secret|token|passw(?:or)?d|auth)[\w-]*\s*[:=]\s*["'][A-Za-z0-9_\-+\/=.]{16,}["']/gi },
];

function git(args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8' })
    .split('\n').map((s) => s.trim()).filter(Boolean);
}

function pickFiles(argv) {
  const i = argv.indexOf('--base');
  if (i !== -1) return git(['diff', '--name-only', '--diff-filter=d', `${argv[i + 1]}...HEAD`]);
  if (argv.includes('--all')) return git(['ls-files']);
  const files = argv.filter((a) => !a.startsWith('--'));
  if (!files.length) {
    console.error('Usage: secret-scan.js --base <ref> | --all | <files...>');
    process.exit(2);
  }
  return files;
}

function scanFile(rel) {
  const abs = path.resolve(root, rel);
  if (!fs.existsSync(abs) || BINARY_EXT.test(rel)) return [];
  const buf = fs.readFileSync(abs);
  if (buf.includes(0)) return [];
  const hits = [];
  buf.toString('utf8').split(/\r?\n/).forEach((line, idx) => {
    let text = line;
    for (const s of allowedStrings) text = text.split(s).join(' ');
    for (const rule of RULES) {
      rule.re.lastIndex = 0;
      for (const m of text.matchAll(rule.re)) {
        if (rule.ok && rule.ok(m[0])) continue;
        hits.push({ file: rel, line: idx + 1, rule: rule.name });
      }
    }
  });
  return hits;
}

const started = Date.now();
const files = pickFiles(process.argv.slice(2))
  .map((f) => f.replace(/\\/g, '/'))
  .filter((f) => !skipFiles.has(f));
const hits = files.flatMap(scanFile);

for (const h of hits) console.log(`FAIL ${h.file}:${h.line} rule=${h.rule}`);
console.log(
  `Scanned ${files.length} file(s) in ${Date.now() - started} ms. ` +
  (hits.length ? `${hits.length} finding(s). Matched text is hidden on purpose.` : 'No findings.')
);
process.exit(hits.length ? 1 : 0);
