#!/usr/bin/env node
// scripts/linting/logging-lint.js

const fs = require('fs');
const path = require('path');
const { findFiles } = require('../shared/file-helpers');

// === Exclude patterns (relative to project root) ===
const EXCLUDE_PATTERNS = [
  'src/utils/logger.js',
  // Add more patterns here as needed
];

// Helper: check if file matches any exclude pattern
function isExcluded(filePath) {
  const relPath = path.relative(process.cwd(), filePath).replace(/\\/g, '/');
  return EXCLUDE_PATTERNS.some(pattern => relPath === pattern);
}

// Regexes for logging patterns
const CONSOLE_REGEX = /console\.(log|error|warn|info|debug|trace)\s*\(/g;
const CHALK_REGEX = /chalk\.(\w+)/g;

// Scan a file for logging callsites and return detailed hits.
function scanFile(filePath) {
  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }
  const lines = content.split('\n');
  const hits = [];

  lines.forEach((line, idx) => {
    let match;
    while ((match = CONSOLE_REGEX.exec(line))) {
      hits.push({
        type: 'console',
        method: `console.${match[1]}`,
        line: idx + 1,
        code: line.trim(),
      });
    }
    while ((match = CHALK_REGEX.exec(line))) {
      hits.push({
        type: 'chalk',
        method: match[1],
        line: idx + 1,
        code: line.trim(),
      });
    }
  });

  // Mark hits to ignore based on inline comments
  hits.forEach(hit => {
    const lineContent = lines[hit.line - 1];
    const prevLine = lines[hit.line - 2] || '';
    hit.ignore =
      lineContent.includes('lint-disable-line logging') ||
      prevLine.includes('lint-disable-next-line logging');
  });

  return hits.length ? { file: filePath, hits } : null;
}

// Main lint logic
function main() {
  const fix = process.argv.includes('--fix');
  const rootDir = process.cwd();

  // The directories/files you want to check
  const TARGETS = [
    'src',
    '*.js',
    'test/e2e',
    'test/integration'
  ];

  // Gather all files to check
  let files = new Set();
  for (const target of TARGETS) {
    // If it's a glob pattern (e.g. '*.js'), expand in root dir
    if (target.includes('*')) {
      for (const file of findFiles(rootDir, {
        filter: name => name.endsWith('.js') || name.endsWith('.mjs')
      })) {
        if (path.basename(file).match(/\.js$/) && path.dirname(file) === rootDir) {
          files.add(file);
        }
      }
    } else {
      for (const file of findFiles(path.join(rootDir, target), {
        filter: name => name.endsWith('.js') || name.endsWith('.mjs')
      })) {
        files.add(file);
      }
    }
  }

  let found = false;

  for (const file of files) {
    if (isExcluded(file)) continue;
    const result = scanFile(file);
    if (!result) continue;

    for (const hit of result.hits) {
      if (hit.ignore) continue; // Skip ignored lines

      if (hit.type === 'console') {
        if (hit.method === 'console.log') {
          found = true;
          console.warn(`[lint:console] ${file}:${hit.line}  ${hit.code}`);
          if (fix) {
            // Remove the line from the file (very basic, line-based)
            const lines = fs.readFileSync(file, 'utf8').split('\n');
            lines.splice(hit.line - 1, 1);
            fs.writeFileSync(file, lines.join('\n'), 'utf8');
            console.log(`[lint:console] Stripped console.log from ${file}:${hit.line}`);
          }
        } else {
          // Warn for other console methods
          console.warn(`[lint:console] ${file}:${hit.line}  ${hit.code}`);
        }
      } else if (hit.type === 'chalk') {
        // Only warn if not inside a console call (could be improved with AST)
        console.warn(`[lint:chalk] ${file}:${hit.line}  ${hit.code}`);
      }
    }
  }

  if (found && !fix) {
    process.exitCode = 1; // Fail lint if any found and not fixing
  }
}

if (require.main === module) {
  main();
}

