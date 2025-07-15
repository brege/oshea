#!/usr/bin/env node
// scripts/linting/code/remove-auto-doc.js

require('module-alias/register');

const fs = require('fs');
const chalk = require('chalk');
const { lintHelpersPath, lintingConfigPath } = require('@paths');
const {
  loadLintSection,
  findFilesArray,
  isExcluded,
  parseCliArgs,
} = require(lintHelpersPath);

//const BLOCK_COMMENT_REGEX = /\/\*\*\s*(?:\*(?!\/)[\s\S]*?@[\s\S]*?)?\*\//g;
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

function printBlockInfo(file, startLine, endLine, blockText, dryRun = false) {
  const label = dryRun ? 'Would remove' : 'auto-doc';
  const header = `${chalk.gray('[')}${chalk.yellow(label)}${chalk.gray(']')} ${chalk.cyan(file)}:${chalk.green(`${startLine}-${endLine}`)}`;
  console.log(header);
  blockText.split('\n').forEach(line => {
    console.log(chalk.dim('  ' + line));
  });
  console.log();
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

  for (const target of targets) {
    for (const file of findFilesArray(target, {
      filter: name => name.endsWith('.js') || name.endsWith('.mjs'),
      ignores: excludeDirs,
    })) {
      files.add(file);
    }
  }

  let found = 0;
  const allBlocks = [];

  for (const file of files) {
    if (!force && isExcluded(file, excludes)) continue;
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

      if (!quiet && !json) {
        printBlockInfo(file, match.startLine, match.endLine, match.text, fix && dryRun);
      }
    }

    if (fix && result.matches.length) {
      let newContent = result.content;
      for (let i = result.matches.length - 1; i >= 0; i--) {
        const { start, end } = result.matches[i];
        newContent = newContent.slice(0, start) + newContent.slice(end);
      }

      if (!dryRun) {
        fs.writeFileSync(file, newContent, 'utf8');
        if (!quiet && !json) {
          console.log(
            chalk.gray('[') +
            chalk.yellow('auto-doc') +
            chalk.gray('] ') +
            chalk.cyan(file) +
            chalk.green(`  removed ${result.matches.length} block comment(s)`)
          );
        }
      } else if (!quiet && !json) {
        console.log(
          chalk.gray('[') +
          chalk.yellow('Would remove') +
          chalk.gray('] ') +
          chalk.cyan(file) +
          chalk.green(`  would remove ${result.matches.length} block comment(s)`)
        );
      }
    }
  }

  if (json) {
    process.stdout.write(JSON.stringify({
      blocks: allBlocks,
      summary: { count: found }
    }, null, 2) + '\n');
  }

  if (debug) {
    console.log('[DEBUG] Files checked:', Array.from(files));
    console.log('[DEBUG] Blocks found:', found);
    if (dryRun) {
      console.log('[DEBUG] Dry-run mode enabled — no files were written.');
    }
  }

  if (found && !fix && !json) {
    if (!quiet) {
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
    process.exitCode = 1;
  }

  return allBlocks;
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

  if (flags.debug) {
    console.log('[DEBUG] Targets:', finalTargets);
    console.log('[DEBUG] Excludes:', excludes);
    console.log('[DEBUG] ExcludeDirs:', excludeDirs);
    console.log('[DEBUG] Flags:', flags);
  }

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

