#!/usr/bin/env node
// scripts/linting/code/logging-lint.js

require('module-alias/register');

const fs = require('fs');
const path = require('path');
const { minimatch } = require('minimatch');
const { fileHelpersPath, lintingConfigPath, lintConfigLoaderPath } = require('@paths');
const { findFiles } = require(fileHelpersPath);
const { loadLintSection } = require(lintConfigLoaderPath);

// Load linter config from YAML
const loggingConfig = loadLintSection('logging', lintingConfigPath);
const CONFIG_TARGETS = loggingConfig.targets || [];
const EXCLUDE_PATTERNS = loggingConfig.excludes || [];

// Helper: check if file matches any exclude pattern
function isExcluded(filePath) {
  const relPath = path.relative(process.cwd(), filePath).replace(/\\/g, '/');
  return EXCLUDE_PATTERNS.some(pattern => minimatch(relPath, pattern));
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
  const outputJson = process.argv.includes('--json');
  const rootDir = process.cwd();

  // CLI targets override config targets
  const cliTargets = process.argv.slice(2).filter(a => !a.startsWith('--'));
  const TARGETS = cliTargets.length ? cliTargets : CONFIG_TARGETS;

  let files = new Set();
  for (const target of TARGETS) {
    if (target.includes('*')) {
      for (const file of findFiles(rootDir, {
        filter: name => name.endsWith('.js') || name.endsWith('.mjs')
      })) {
        if (minimatch(path.relative(rootDir, file), target)) {
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
  const allHits = [];

  for (const file of files) {
    if (isExcluded(file)) continue;
    const result = scanFile(file);
    if (!result) continue;

    for (const hit of result.hits) {
      if (hit.ignore) continue;

      allHits.push({
        type: hit.type,
        method: hit.method,
        file,
        line: hit.line,
        code: hit.code
      });

      if (!outputJson) {
        if (hit.type === 'console') {
          if (hit.method === 'console.log') {
            found = true;
            console.warn(`[lint:console] ${file}:${hit.line}  ${hit.code}`);
            if (fix) {
              const lines = fs.readFileSync(file, 'utf8').split('\n');
              lines.splice(hit.line - 1, 1);
              fs.writeFileSync(file, lines.join('\n'), 'utf8');
              console.log(`[lint:console] Stripped console.log from ${file}:${hit.line}`);
            }
          } else {
            console.warn(`[lint:console] ${file}:${hit.line}  ${hit.code}`);
          }
        } else if (hit.type === 'chalk') {
          console.warn(`[lint:chalk] ${file}:${hit.line}  ${hit.code}`);
        }
      }
    }
  }

  if (outputJson) {
    process.stdout.write(JSON.stringify(allHits, null, 2) + '\n');
  }

  if (found && !fix && !outputJson) {
    process.exitCode = 1;
  }
}

if (require.main === module) {
  main();
}

