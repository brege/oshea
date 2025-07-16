#!/usr/bin/env node
// scripts/linting/code/strip-trailing-whitespace.js
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
  for (const file of findFilesArray('.', {
    filter: () => true,
    ignores,
  })) {
    if (patterns.some(pattern => minimatch(file, pattern))) {
      files.add(file);
    }
  }

  const issues = [];
  const changedFiles = new Set();

  for (const filePath of files) {
    const relPath = path.relative(process.cwd(), filePath);
    const original = fs.readFileSync(filePath, 'utf8');
    const cleaned = original.replace(/[ \t]+$/gm, '');

    if (original !== cleaned) {
      const lines = original.split('\n');
      lines.forEach((line, index) => {
        if (/[ \t]+$/.test(line)) {
          issues.push({
            file: relPath,
            line: index + 1,
            column: line.search(/[ \t]+$/) + 1,
            message: 'Trailing whitespace found.',
            rule: 'no-trailing-whitespace',
            severity: 1, // This is a warning.
          });
        }
      });

      if (fix && !dryRun) {
        fs.writeFileSync(filePath, cleaned, 'utf8');
        changedFiles.add(relPath);
      } else if (fix && dryRun) {
        changedFiles.add(relPath);
      }
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
        console.log(`✔ Fixed ${changedFiles.size} file(s).`);
      } else if (fix && dryRun) {
        console.log(`[dry-run] Would have fixed ${changedFiles.size} file(s).`);
      } else if (!fix){
        console.log('\nRun with --fix to automatically correct these issues.');
      }
    } else {
      console.log('✔ No trailing whitespace found.');
    }
  }

  if (json) {
    process.stdout.write(JSON.stringify({ issues }, null, 2) + '\n');
  }


  if (debug) {
    console.log(`[DEBUG] Scanned ${files.size} files.`);
  }

  const errorCount = issues.filter(issue => issue.severity === 2).length;
  process.exitCode = errorCount > 0 ? 1 : 0;

  return { issueCount: issues.length, fixedCount: changedFiles.size };
}

if (require.main === module) {
  const { flags, targets } = parseCliArgs(process.argv.slice(2));
  const config = loadLintSection('remove-ws', lintingConfigPath) || {};

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
