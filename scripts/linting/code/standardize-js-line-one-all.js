#!/usr/bin/env node
// scripts/linting/code/standardize-js-line-one-all.js

require('module-alias/register');

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { minimatch } = require('minimatch');
const { lintHelpersPath, lintingConfigPath } = require('@paths');
const {
  findFilesArray,
  parseCliArgs,
  getFirstDir,
  getPatternsFromArgs,
  getDefaultGlobIgnores,
  loadLintSection,
} = require(lintHelpersPath);

function runLinter({
  patterns = [],
  ignores = [],
  fix = false,
  quiet = false,
  json = false,
  debug = false,
  dryRun = false,
} = {}) {
  const files = new Set();
  const issues = [];
  const changedFiles = [];

  for (const file of findFilesArray('.', {
    filter: name => name.endsWith('.js') || name.endsWith('.mjs'),
    ignores,
  })) {
    if (patterns.some(pattern => minimatch(file, pattern))) {
      files.add(file);
    }
  }

  for (const filePath of files) {
    const relPath = path.relative(process.cwd(), filePath);
    const originalContent = fs.readFileSync(filePath, 'utf8');
    let lines = originalContent.split('\n');
    let changed = false;

    const expectedHeader = `// ${relPath}`;
    let headerLineIndex = 0;

    if (lines[0]?.startsWith('#!')) {
      headerLineIndex = 1;
    }

    const currentHeader = lines[headerLineIndex];
    const headerMatch = currentHeader?.match(/^\/\/\s*(.+)$/);
    const actualHeaderPath = headerMatch?.[1]?.trim() ?? '';
    const reportLine = headerLineIndex + 1;

    // Check if the header is missing
    if (!currentHeader || !currentHeader.startsWith('//')) {
      issues.push({
        file: relPath,
        line: reportLine,
        column: 1,
        message: 'Missing file header comment.',
        rule: 'file-header',
        severity: 2,
      });

      if (fix && !dryRun) {
        if (headerLineIndex === 1) {
          lines.splice(1, 0, expectedHeader);
        } else {
          lines.unshift(expectedHeader);
        }
        changed = true;
      }

    } else {
      // Header exists — check path mismatch
      if (actualHeaderPath !== relPath) {
        issues.push({
          file: relPath,
          line: reportLine,
          column: 1,
          message: `Incorrect header path. Expected: "${relPath}", Found: "${actualHeaderPath}"`,
          rule: 'file-header',
          severity: 2,
        });

        if (fix && !dryRun) {
          lines[headerLineIndex] = expectedHeader;
          changed = true;
        }
      }

      // Top-level dir mismatch
      const fileDir = getFirstDir(relPath);
      const headerDir = getFirstDir(actualHeaderPath);

      if (fileDir !== headerDir) {
        issues.push({
          file: relPath,
          line: reportLine,
          column: 1,
          message: `Top-level folder mismatch. File is in "${fileDir}" but header says "${headerDir}".`,
          rule: 'file-header',
          severity: 1,
        });
      }
    }

    if (changed) {
      const newContent = lines.join('\n');
      fs.writeFileSync(filePath, newContent, 'utf8');
      changedFiles.push(relPath);
    }
  }

  if (!quiet) {
    if (json) {
      process.stdout.write(JSON.stringify({ issues }, null, 2) + '\n');
    } else {
      if (issues.length > 0) {
        issues.forEach(issue => {
          const { file, line, column, message, rule, severity } = issue;
          const color = severity === 2 ? chalk.red : chalk.yellow;
          console.log(color(`  × ${file}:${line}:${column}  ${message} (${rule})`));
        });

        console.log(`\nFound ${issues.length} issue(s) in ${new Set(issues.map(i => i.file)).size} file(s).`);
        if (fix && !dryRun) {
          console.log(chalk.green(`✔ Fixed ${changedFiles.length} file(s).`));
        } else if (fix && dryRun) {
          console.log(chalk.gray(`[dry-run] Would have fixed ${changedFiles.length} file(s).`));
        } else {
          console.log(chalk.cyan('Run with --fix to automatically correct these issues.'));
        }
      } else {
        console.log(chalk.green('✔ All file headers are standardized.'));
      }
    }
  }

  if (debug) {
    console.log(`[DEBUG] Scanned ${files.size} files.`);
    if (dryRun) console.log('[DEBUG] Dry-run mode enabled — no files were written.');
  }

  process.exitCode = issues.length > 0 ? 1 : 0;
  return { issueCount: issues.length, fixedCount: changedFiles.length };
}

// CLI entry point
if (require.main === module) {
  const { flags, targets } = parseCliArgs(process.argv.slice(2));
  const config = loadLintSection('standardize-line-one', lintingConfigPath) || {};

  const patterns = targets.length > 0
    ? getPatternsFromArgs(targets)
    : (config.targets || []);

  const ignores = config.excludes || getDefaultGlobIgnores();

  runLinter({
    patterns,
    ignores,
    fix: !!flags.fix,
    quiet: !!flags.quiet,
    json: !!flags.json,
    debug: !!flags.debug,
    dryRun: !!flags.dryRun,
  });
}

module.exports = { runLinter };

