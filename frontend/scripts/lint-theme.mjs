#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const FRONTEND_ROOT = resolve(SCRIPT_DIR, '..');
const SRC_ROOT = resolve(FRONTEND_ROOT, 'src');

const THEME_FILE_RE = /\.[jt]sx?$/;
const HEX_RE = /#[0-9a-fA-F]{3,8}\b/g;
const GRADIENT_RE = /\b(?:linear|radial)-gradient\(/g;
const RAW_FONT_FAMILY_RE = /fontFamily\s*[:=]\s*(['"`]).+?\1/g;
const RAW_BORDER_RADIUS_RE = /\bborderRadius\s*:\s*(\d+(?:\.\d+)?)\b/g;

const TOKENS_PREFIX = 'design-system/tokens/';
const THEME_PREFIX = 'design-system/theme/';
const LEGACY_PREFIXES = ['component/common/', 'component/auth/'];

const RAW_HEX_ALLOWLIST_FILES = new Set([
  'util/format.ts',
  'component/use-collaborative-editor.ts',
]);

const RAW_GRADIENT_ALLOWLIST_FILES = new Set([
  'design-system/tokens/effects.ts',
]);

const RAW_FONT_ALLOWLIST_FILES = new Set([
  'design-system/tokens/typography.ts',
  'design-system/theme/typography.ts',
]);

function isTestFile(relPath) {
  return /\.(test|spec)\.[jt]sx?$/.test(relPath);
}

function isImportLine(line) {
  return /^\s*import\s/.test(line);
}

function isCommentOnlyLine(line) {
  return /^\s*(\/\/|\/\*|\*|\*\/)/.test(line);
}

function shouldAllowHex(relPath) {
  return (
    relPath.startsWith(TOKENS_PREFIX)
    || relPath.startsWith(THEME_PREFIX)
    || RAW_HEX_ALLOWLIST_FILES.has(relPath)
    || isTestFile(relPath)
  );
}

function shouldAllowGradient(relPath) {
  return RAW_GRADIENT_ALLOWLIST_FILES.has(relPath) || isTestFile(relPath);
}

function shouldAllowFont(relPath) {
  return RAW_FONT_ALLOWLIST_FILES.has(relPath) || isTestFile(relPath);
}

function shouldAllowNumericBorderRadius(relPath) {
  return relPath.startsWith(TOKENS_PREFIX) || relPath.startsWith(THEME_PREFIX) || isTestFile(relPath);
}

function isLegacySharedPath(relPath) {
  return LEGACY_PREFIXES.some((prefix) => relPath.startsWith(prefix));
}

function normalizeGitPath(path) {
  return path.startsWith('src/') ? path.slice(4) : path;
}

function isAddedStatus(status) {
  return status === '??' || status.includes('A');
}

export function isPureReExportShim(content) {
  const meaningfulLines = content
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .filter((line) => !line.startsWith('//'))
    .filter((line) => !line.startsWith('/*'))
    .filter((line) => !line.startsWith('*'))
    .filter((line) => !line.startsWith('*/'));

  return meaningfulLines.length > 0
    && meaningfulLines.every((line) => /^export\s+(type\s+)?(?:\*|\{)/.test(line));
}

export function getAddedLegacyPaths(frontendRoot = FRONTEND_ROOT) {
  try {
    const output = execFileSync(
      'git',
      ['status', '--porcelain', '--', 'src/component/common', 'src/component/auth'],
      { cwd: frontendRoot, encoding: 'utf8' },
    );

    return new Set(
      output
        .split('\n')
        .map((line) => line.trimEnd())
        .filter(Boolean)
        .map((line) => {
          const status = line.slice(0, 2);
          const rawPath = line.slice(3).trim();
          return isAddedStatus(status) ? normalizeGitPath(rawPath) : null;
        })
        .filter(Boolean),
    );
  } catch {
    return new Set();
  }
}

function collectFiles(dir) {
  const results = [];

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      results.push(...collectFiles(fullPath));
    } else if (THEME_FILE_RE.test(entry.name)) {
      results.push(fullPath);
    }
  }

  return results;
}

function makeViolation(rule, relPath, line, message) {
  return { rule, relPath, line, message };
}

export function lintFileContent({ relPath, content, addedLegacyPaths = new Set() }) {
  const violations = [];
  const lines = content.split('\n');

  if (isLegacySharedPath(relPath) && addedLegacyPaths.has(relPath) && !isTestFile(relPath) && !isPureReExportShim(content)) {
    violations.push(
      makeViolation(
        'no-new-legacy-shared-ui',
        relPath,
        1,
        'New shared UI must not be added under legacy folders; add the source to design-system or make this file a re-export shim.',
      ),
    );
  }

  lines.forEach((line, index) => {
    const lineNumber = index + 1;

    if (isImportLine(line) || isCommentOnlyLine(line)) {
      return;
    }

    if (!shouldAllowHex(relPath)) {
      for (const match of line.matchAll(HEX_RE)) {
        violations.push(
          makeViolation(
            'no-raw-hex',
            relPath,
            lineNumber,
            `Raw hex color ${match[0]} is not allowed here; use design-system tokens or theme roles.`,
          ),
        );
      }
    }

    if (!shouldAllowGradient(relPath)) {
      for (const match of line.matchAll(GRADIENT_RE)) {
        violations.push(
          makeViolation(
            'no-raw-gradient',
            relPath,
            lineNumber,
            `Raw gradient ${match[0]} is not allowed here; use design-system gradient helpers.`,
          ),
        );
      }
    }

    if (!shouldAllowFont(relPath)) {
      for (const match of line.matchAll(RAW_FONT_FAMILY_RE)) {
        violations.push(
          makeViolation(
            'no-raw-font-family',
            relPath,
            lineNumber,
            `Raw fontFamily override ${match[0]} is not allowed here; use design-system typography tokens.`,
          ),
        );
      }
    }

    if (!shouldAllowNumericBorderRadius(relPath)) {
      for (const match of line.matchAll(RAW_BORDER_RADIUS_RE)) {
        if (match[1] === '0') {
          continue;
        }

        violations.push(
          makeViolation(
            'no-numeric-border-radius',
            relPath,
            lineNumber,
            `Numeric borderRadius ${match[1]} is not allowed here; use toRadiusPx(...), an explicit pixel string, or a percentage radius.`,
          ),
        );
      }
    }
  });

  return violations;
}

export function lintTheme({
  srcRoot = SRC_ROOT,
  frontendRoot = FRONTEND_ROOT,
  addedLegacyPaths = getAddedLegacyPaths(frontendRoot),
} = {}) {
  return collectFiles(srcRoot).flatMap((filePath) => {
    const relPath = relative(srcRoot, filePath);
    const content = readFileSync(filePath, 'utf8');
    return lintFileContent({ relPath, content, addedLegacyPaths });
  });
}

export function formatViolation(violation) {
  return `error  ${violation.relPath}:${violation.line}  ${violation.message}  (${violation.rule})`;
}

function isMainModule() {
  return Boolean(process.argv[1]) && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
}

if (isMainModule()) {
  const violations = lintTheme();

  if (violations.length > 0) {
    for (const violation of violations) {
      console.log(formatViolation(violation));
    }
    console.log(`\n✘ ${violations.length} theme-drift violation${violations.length === 1 ? '' : 's'} found.`);
    process.exit(1);
  }

  console.log('✔ No theme-drift violations found.');
}
