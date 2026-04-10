#!/usr/bin/env node
/**
 * Theme drift lint script.
 *
 * Flags raw hex colours and inline font-weight overrides in .tsx files
 * outside the allowlisted theme directories.  Intended to be run as
 *   npm run lint:theme
 *
 * Exit code 1 when violations are found (severity = error per project decision).
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, extname } from 'node:path';

const SRC = new URL('../src', import.meta.url).pathname;

/** Directories whose files are allowed to contain raw hex / font values. */
const ALLOWLIST_DIRS = ['theme'];

/** Files that are allowed exceptions (relative to src/). */
const ALLOWLIST_FILES = [
  'util/format.ts',                  // monogram hue palette
  'component/use-collaborative-editor.ts', // cursor colours
];

/** Test files are excluded. */
const isTestFile = (f) => /\.(test|spec)\.[jt]sx?$/.test(f);

// ── Rules ────────────────────────────────────────────────────────────

const HEX_RE = /['"]#[0-9a-fA-F]{3,8}['"]/g;
const FONT_WEIGHT_SX_RE = /fontWeight:\s*[0-9]+/g;

function collectFiles(dir) {
  const results = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectFiles(full));
    } else if (/\.[jt]sx?$/.test(entry.name)) {
      results.push(full);
    }
  }
  return results;
}

function isAllowlisted(absPath) {
  const rel = relative(SRC, absPath);
  if (ALLOWLIST_DIRS.some((d) => rel.startsWith(d + '/'))) return true;
  if (ALLOWLIST_FILES.includes(rel)) return true;
  if (isTestFile(rel)) return true;
  return false;
}

// ── Main ─────────────────────────────────────────────────────────────

let violations = 0;

for (const file of collectFiles(SRC)) {
  if (isAllowlisted(file)) continue;
  // Only lint .tsx files for hex (non-component .ts files rarely have colors)
  const isTsx = extname(file) === '.tsx';

  const content = readFileSync(file, 'utf8');
  const lines = content.split('\n');

  lines.forEach((line, idx) => {
    const lineNo = idx + 1;
    const rel = relative(SRC, file);

    // Skip import lines
    if (/^\s*import\s/.test(line)) return;
    // Skip comment-only lines
    if (/^\s*\/\//.test(line)) return;

    if (isTsx) {
      for (const match of line.matchAll(HEX_RE)) {
        // Allow common.white / common.black shorthand exceptions
        const val = match[0].slice(1, -1);
        if (val === '#fff' || val === '#000' || val === '#ffffff' || val === '#000000') continue;
        console.log(`error  ${rel}:${lineNo}  Raw hex colour ${match[0]}  (use theme token or status-colors)`);
        violations++;
      }
    }
  });
}

if (violations > 0) {
  console.log(`\n✘ ${violations} theme-drift violation${violations === 1 ? '' : 's'} found.`);
  process.exit(1);
} else {
  console.log('✔ No theme-drift violations found.');
}
