#!/usr/bin/env node
// scripts/linting/code/strip-trailing-whitespace.js
require('module-alias/register');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { minimatch } = require('minimatch');
const { lintHelpersPath, lintingConfigPath } = require('@paths');
const {
  findFilesArray,
  parseCliArgs,
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
  for (const file of findFilesArray('.', {
    filter: () => true,
    ignores,
  })) {
    if (patterns.some(pattern => minimatch(file, pattern))) {
      files.add(file);
    }
  }

  const issues = [];
  const changedFiles = [];

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
            rule: 'no-trailing-whitespace'
          });
        }
      });

      if (fix && !dryRun) {
        fs.writeFileSync(filePath, cleaned, 'utf8');
        changedFiles.push(relPath);
      }
    }
  }

  if (!quiet) {
    if (json) {
      process.stdout.write(JSON.stringify({ issues }, null, 2) + '\n');
    } else {
      if (issues.length > 0) {
        issues.forEach(issue => {
          console.log(chalk.yellow(`  ✖ ${issue.file}:${issue.line}:${issue.column}  ${issue.message} (${issue.rule})`));
        });
        console.log(`\nFound ${issues.length} issue(s) in ${new Set(issues.map(i => i.file)).size} file(s).`);
        if (fix && !dryRun) {
          console.log(chalk.green(`✔ Fixed ${changedFiles.length} file(s).`));
        } else if (fix && dryRun) {
          console.log(chalk.gray(`[dry-run] Would have fixed ${new Set(issues.map(i => i.file)).size} file(s).`));
        } else {
          console.log(chalk.cyan('Run with --fix to automatically correct these issues.'));
        }
      } else {
        console.log(chalk.green('✔ No trailing whitespace found.'));
      }
    }
  }

  if (debug) {
    console.log(`[DEBUG] Scanned ${files.size} files.`);
  }

  //process.exitCode = changedFiles.length > 0 ? 1 : 0;
  if (issues.length > 0) {
    if (fix && !dryRun) {
      process.exitCode = 0;
    } else {
      process.exitCode = 1;
    }
  } else {
    process.exitCode = 0;
  }




  return { issueCount: issues.length, fixedCount: changedFiles.length };
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
