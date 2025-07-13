#!/usr/bin/env node
// scripts/linting/code/remove-auto-doc.js

require('module-alias/register');

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { minimatch } = require('minimatch');
const { fileHelpersPath, lintingConfigPath, lintConfigLoaderPath } = require('@paths');
const { findFiles } = require(fileHelpersPath);
const { loadLintSection } = require(lintConfigLoaderPath);

// Load config for this linter
const autoDocConfig = loadLintSection('autoDoc', lintingConfigPath) || {};
const CONFIG_TARGETS = autoDocConfig.targets || [
  'cli.js',
  'index.js',
  'src',
  'test/e2e',
  'test/integration'
];
const EXCLUDE_PATTERNS = autoDocConfig.excludes || [
  '.mocharc.js',
  'test/scripts/**',
  'scripts/**'
];
const EXCLUDE_DIRS = autoDocConfig.excludeDirs || [
  'test/scripts',
  'scripts'
];

// Helper: check if file matches any exclude pattern (glob)
function isExcluded(filePath) {
  const relPath = path.relative(process.cwd(), filePath).replace(/\\/g, '/');
  return EXCLUDE_PATTERNS.some(pattern => minimatch(relPath, pattern));
}

// Regex to match /** ... */ block comments (greedy, multiline)
const BLOCK_COMMENT_REGEX = /\/\*\*[\s\S]*?\*\//g;

// Find all block comments, their start/end lines, and text
function scanFile(filePath) {
  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }
  const matches = [];
  let match;
  while ((match = BLOCK_COMMENT_REGEX.exec(content)) !== null) {
    // Find the line number where this block starts and ends
    const before = content.slice(0, match.index);
    const startLine = before.split('\n').length;
    const blockLines = match[0].split('\n').length;
    const endLine = startLine + blockLines - 1;
    matches.push({
      startLine,
      endLine,
      text: match[0],
      start: match.index,
      end: match.index + match[0].length,
    });
  }
  return matches.length ? { file: filePath, matches, content } : null;
}

function printBlockInfo(file, startLine, endLine, blockText) {
  const header = `${chalk.gray('[')}${chalk.yellow('auto-doc')}${chalk.gray(']')} ${chalk.cyan(file)}:${chalk.green(`${startLine}-${endLine}`)}`;
  console.log(header);
  // Print block with indentation and dim color
  const blockLines = blockText.split('\n');
  blockLines.forEach(line => {
    console.log(chalk.dim('  ' + line));
  });
  console.log(); // blank line after each block
}

function main() {
  const fix = process.argv.includes('--fix');
  const quiet = process.argv.includes('--quiet');
  const outputJson = process.argv.includes('--json');
  // Only treat non-flag arguments as targets
  const userArgs = process.argv.slice(2).filter(arg => !arg.startsWith('--'));
  const targets = userArgs.length ? userArgs : CONFIG_TARGETS;

  // Gather all files to check (files, dirs, globs)
  let files = new Set();
  for (const target of targets) {
    // If the target looks like a glob, expand it
    if (target.includes('*')) {
      // Use findFiles for consistency with registry pattern
      for (const file of findFiles(process.cwd(), {
        filter: name => minimatch(name, target) && (name.endsWith('.js') || name.endsWith('.mjs')),
        ignores: EXCLUDE_DIRS,
      })) {
        files.add(file);
      }
      continue;
    }

    const absTarget = path.isAbsolute(target) ? target : path.join(process.cwd(), target);
    let stat;
    try {
      stat = fs.statSync(absTarget);
    } catch {
      if (!quiet) {
        console.warn(chalk.red('Warning: ') + `Target not found: ${target}`);
      }
      continue;
    }
    if (stat.isFile()) {
      if ((absTarget.endsWith('.js') || absTarget.endsWith('.mjs'))) {
        files.add(absTarget);
      }
    } else if (stat.isDirectory()) {
      for (const file of findFiles(absTarget, {
        filter: name => name.endsWith('.js') || name.endsWith('.mjs'),
        ignores: EXCLUDE_DIRS,
      })) {
        files.add(file);
      }
    }
  }

  let found = 0;
  const allBlocks = [];

  for (const file of files) {
    if (isExcluded(file)) continue;
    const result = scanFile(file);
    if (!result) continue;

    for (const match of result.matches) {
      found++;
      allBlocks.push({
        file,
        startLine: match.startLine,
        endLine: match.endLine,
        block: match.text
      });
      // Only print if not fixing, or if not quiet, and not JSON
      if (!fix && !quiet && !outputJson) {
        printBlockInfo(file, match.startLine, match.endLine, match.text);
      }
    }

    if (fix && result.matches.length) {
      // Remove all block comments in reverse order (to not mess up indices)
      let newContent = result.content;
      for (let i = result.matches.length - 1; i >= 0; i--) {
        const { start, end } = result.matches[i];
        newContent = newContent.slice(0, start) + newContent.slice(end);
      }
      fs.writeFileSync(file, newContent, 'utf8');
      if (!quiet && !outputJson) {
        console.log(
          chalk.gray('[') +
          chalk.yellow('auto-doc') +
          chalk.gray('] ') +
          chalk.cyan(file) +
          chalk.green(`  removed ${result.matches.length} block comment(s)`)
        );
      }
    }
  }

  if (outputJson) {
    process.stdout.write(JSON.stringify(allBlocks, null, 2) + '\n');
  }

  // For orchestrator: only print if a block was found and not fixing
  if (quiet && !fix && found && !outputJson) {
    console.warn('auto-doc block(s) found');
  }

  // Print warning summary if any found and not fixing
  if (found && !fix && !outputJson) {
    console.log(
      chalk.red.bold('✖ ') +
      chalk.yellow.bold(`  ${found} warning(s) found (auto-doc blocks)`)
    );
    console.log(
      chalk.gray('  Run with ') +
      chalk.cyan('--fix') +
      chalk.gray(' to remove all auto-doc blocks.')
    );
  }

  // Always exit 0 (warn only)
}

if (require.main === module) {
  main();
}

