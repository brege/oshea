#!/usr/bin/env node
// scripts/linting/code/remove-auto-doc.js

require('module-alias/register');

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { lintHelpersPath, lintingConfigPath } = require('@paths');
const {
  loadLintSection,
  findFilesArray,
  isExcluded,
  parseCliArgs,
} = require(lintHelpersPath);

const BLOCK_COMMENT_REGEX = /\/\*\*[\r\n][\s\S]*?\*\//g;

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

function runLinter({
  targets = [],
  excludes = [],
  excludeDirs = [],
  fix = false,
  quiet = false,
  json = false,
  force = false,
  debug = false,
  dryRun = false,
  config = {}
} = {}) {
  const files = new Set();
  const issues = [];
  let fixedFilesCount = 0;

  for (const target of targets) {
    for (const file of findFilesArray(target, {
      filter: name => name.endsWith('.js') || name.endsWith('.mjs'),
      ignores: excludeDirs,
    })) {
      files.add(file);
    }
  }

  for (const file of files) {
    if (!force && isExcluded(file, excludes)) continue;
    const result = scanFile(file);
    if (!result) continue;

    for (const match of result.matches) {
      const relPath = path.relative(process.cwd(), file);

      issues.push({
        file: relPath,
        line: match.startLine,
        column: 1,
        message: `Found auto-doc block comment spanning lines ${match.startLine}-${match.endLine}.`,
        rule: 'no-auto-doc',
        snippet: match.text
      });

      if (!quiet && !json) {
        const header = `[lint] ${relPath}:${match.startLine}-${match.endLine}`;
        console.log(chalk.yellow(header));

        const previewLines = match.text.split('\n');
        const preview = previewLines.slice(0, 5).map(line => chalk.dim('  ' + line));
        preview.forEach(line => console.log(line));

        if (previewLines.length > 5) {
          console.log(chalk.dim('  ...'));
        }

        if (fix && dryRun) {
          console.log(chalk.gray(`  [dry-run] Would remove block from ${relPath}`));
        }

        console.log('');
      }
    }

    if (fix && result.matches.length > 0) {
      let newContent = result.content;
      for (let i = result.matches.length - 1; i >= 0; i--) {
        const { start, end } = result.matches[i];
        newContent = newContent.slice(0, start) + newContent.slice(end);
      }

      if (!dryRun) {
        fs.writeFileSync(file, newContent, 'utf8');
        fixedFilesCount++;
      }
    }
  }

  if (!quiet) {
    if (json) {
      process.stdout.write(JSON.stringify({ issues }, null, 2) + '\n');
    } else {
      if (issues.length > 0) {
        console.log(`Found ${issues.length} auto-doc block(s) in ${new Set(issues.map(i => i.file)).size} file(s).`);

        if (fix && !dryRun) {
          console.log(`Fixed ${fixedFilesCount} file(s) by removing blocks.`);
        } else if (fix && dryRun) {
          console.log(`[dry-run] Would have fixed ${fixedFilesCount} file(s).`);
        } else {
          console.log('Run with --fix to automatically remove these blocks.');
        }

        console.log('');
      } else {
        console.log('No auto-doc blocks found.');
      }
    }
  }

  if (debug) {
    console.log('[DEBUG] Files checked:', Array.from(files));
    console.log('[DEBUG] Issues found:', issues.length);
    if (dryRun) {
      console.log('[DEBUG] Dry-run mode enabled — no files were written.');
    }
  }

  process.exitCode = issues.length > 0 && !fix ? 1 : 0;

  return { issueCount: issues.length, fixedCount: fixedFilesCount };
}

// CLI entry point
if (require.main === module) {
  const { flags, targets } = parseCliArgs(process.argv.slice(2));
  const config = loadLintSection('remove-auto-doc', lintingConfigPath) || {};
  const configTargets = config.targets || [];
  const configExcludes = config.excludes || [];
  const configExcludeDirs = config.excludeDirs || [];

  const finalTargets = targets.length ? targets : configTargets;
  const excludes = flags.force ? [] : configExcludes;
  const excludeDirs = flags.force ? [] : configExcludeDirs;

  runLinter({
    targets: finalTargets,
    excludes,
    excludeDirs,
    fix: !!flags.fix,
    quiet: !!flags.quiet,
    json: !!flags.json,
    force: !!flags.force,
    debug: !!flags.debug,
    dryRun: !!flags.dryRun,
    config,
  });
}

module.exports = { runLinter };

