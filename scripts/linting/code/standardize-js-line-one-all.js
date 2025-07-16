#!/usr/bin/env node
// scripts/linting/code/standardize-js-line-one-all.js

require('module-alias/register');

const fs = require('fs');
const path = require('path');
const { minimatch } = require('minimatch');
const { lintHelpersPath, lintingConfigPath, formattersPath } = require('@paths');
const {
  findFilesArray,
  parseCliArgs,
  getPatternsFromArgs,
  getDefaultGlobIgnores,
  loadLintSection,
} = require(lintHelpersPath);
const { formatLintResults, adaptRawIssuesToEslintFormat } = require(formattersPath);

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

    if (!currentHeader || !currentHeader.startsWith('//')) {
      issues.push({
        file: relPath,
        line: reportLine,
        column: 1,
        message: 'Missing file header comment.',
        rule: 'file-header',
        severity: 1, // Warning
      });

      if (fix && !dryRun) {
        lines.splice(headerLineIndex, 0, expectedHeader);
        changed = true;
      }

    } else {
      if (actualHeaderPath !== relPath) {
        issues.push({
          file: relPath,
          line: reportLine,
          column: 1,
          message: `Incorrect header path. Expected: "${relPath}", Found: "${actualHeaderPath}"`,
          rule: 'file-header',
          severity: 1, // Warning
        });

        if (fix && !dryRun) {
          lines[headerLineIndex] = expectedHeader;
          changed = true;
        }
      }
    }

    if (changed) {
      const newContent = lines.join('\n');
      fs.writeFileSync(filePath, newContent, 'utf8');
      changedFiles.push(relPath);
    }
  }

  if (!quiet) {
    const eslintResults = adaptRawIssuesToEslintFormat(issues);
    const formattedOutput = formatLintResults(eslintResults, 'stylish');

    if (formattedOutput) {
      console.log(formattedOutput);
    }

    if (issues.length > 0) {
      if (fix && !dryRun) {
        console.log(`✔ Fixed ${changedFiles.length} file(s).`);
      } else if (fix && dryRun) {
        console.log(`[dry-run] Would have fixed ${changedFiles.length} file(s).`);
      } else if (!fix){
        console.log('\nRun with --fix to automatically correct these issues.');
      }
    } else {
      console.log('✔ All file headers are standardized.');
    }
  }

  if (json) {
    process.stdout.write(JSON.stringify({ issues }, null, 2) + '\n');
  }

  if (debug) {
    console.log(`[DEBUG] Scanned ${files.size} files.`);
    if (dryRun) console.log('[DEBUG] Dry-run mode enabled — no files were written.');
  }

  const errorCount = issues.filter(issue => issue.severity === 2).length;
  process.exitCode = errorCount > 0 ? 1 : 0;

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
