#!/usr/bin/env node
// scripts/linting/docs/update-project-indices.js

require('module-alias/register');

const fs = require('fs');
const path = require('path');
const glob = require('glob');
const yaml = require('js-yaml');
const chalk = require('chalk');
const { lintingConfigPath, lintHelpersPath } = require('@paths');
const { parseCliArgs } = require(lintHelpersPath);

const START_MARKER = '<!-- uncategorized-start -->';
const END_MARKER = '<!-- uncategorized-end -->';
const LINT_SKIP_TAG = 'lint-skip-index';
const THIS_SCRIPT = path.resolve(__filename);

function getDocignoreDirs(root) {
  let ignoredDirs = [];
  function walk(dir) {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    if (entries.some(e => e.isFile() && e.name === '.docignore')) {
      ignoredDirs.push(path.resolve(dir));
      return;
    }
    for (const entry of entries) {
      if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== '.git') {
        walk(path.join(dir, entry.name));
      }
    }
  }
  walk(root);
  return ignoredDirs.map(absDir => path.relative(process.cwd(), absDir).replace(/\\/g, '/') + '/**');
}

function getExistingLinks(content, baseDir) {
  const linkRegex = /\[.*?\]\((.*?)\)/g;
  const links = new Set();
  const uncatLinks = new Set();

  const startIdx = content.indexOf(START_MARKER);
  const endIdx = content.indexOf(END_MARKER);
  const hasBlock = startIdx !== -1 && endIdx !== -1 && endIdx > startIdx;

  let match;
  while ((match = linkRegex.exec(content)) !== null) {
    const rawLink = match[1];
    if (!rawLink || rawLink.startsWith('http')) continue;
    try {
      const abs = path.resolve(baseDir, rawLink);
      const rel = path.relative(baseDir, abs).replace(/\\/g, '/');
      links.add(rel);

      if (hasBlock && match.index > startIdx && match.index < endIdx) {
        uncatLinks.add(rel);
      }
    } catch (_e) {
      // ignore
    }
  }

  return { allLinks: links, uncatLinks };
}

function fileHasLintSkip(file) {
  if (path.resolve(file) === THIS_SCRIPT) return false;
  try {
    return fs.readFileSync(file, 'utf8').includes(LINT_SKIP_TAG);
  } catch {
    return false;
  }
}

function scanGroup(groupName, groupConfig, opts = {}) {
  const {
    fix = false,
    dryRun = false,
    debug = false
  } = opts;

  const {
    indexFile,
    scanRoot,
    fileExtensions,
    excludePatterns = [],
    fix: configFix = false
  } = groupConfig;

  const allowFix = fix || configFix;
  const indexAbsPath = path.resolve(indexFile);
  const indexDir = path.dirname(indexAbsPath);

  if (!fs.existsSync(indexAbsPath)) {
    return [
      {
        file: indexFile,
        line: 1,
        message: `Index file not found for group: '${groupName}'`,
        rule: 'missing-index-file',
        severity: 2
      }
    ];
  }

  const content = fs.readFileSync(indexAbsPath, 'utf8');
  const lines = content.split('\n');
  const { allLinks, uncatLinks } = getExistingLinks(content, indexDir);

  const scanRoots = Array.isArray(scanRoot) ? scanRoot : [scanRoot];
  let allFiles = [];

  if (debug) {
    console.log(`[DEBUG] Group: ${groupName}`);
    console.log(`  indexFile: ${indexFile}`);
    console.log(`  scanRoots: ${scanRoots.join(', ')}`);
    console.log(`  extension(s): ${fileExtensions.join(', ')}`);
  }

  for (const root of scanRoots) {
    const extPattern = fileExtensions.length > 1
      ? `{${fileExtensions.map(e => e.replace(/^\./, '')).join(',')}}`
      : fileExtensions[0].replace(/^\./, '');
    const globPattern = `${root}/**/*.${extPattern}`;
    const docignore = getDocignoreDirs(root);
    const ignoreGlobs = [...excludePatterns, '**/node_modules/**', '**/.git/**', ...docignore];

    if (debug) {
      console.log(`  globPattern: ${globPattern}`);
      if (docignore.length) console.log(`  docignore: ${JSON.stringify(docignore)}`);
    }

    const matches = glob.sync(globPattern, {
      ignore: ignoreGlobs,
      nodir: true
    });

    allFiles = allFiles.concat(matches);
    if (debug) {
      console.log(`  matched files: ${matches.length}`);
    }
  }

  const filesToIndex = allFiles.filter(f => !fileHasLintSkip(f));
  const issues = [];

  for (const file of filesToIndex) {
    const rel = path.relative(indexDir, file).replace(/\\/g, '/');

    if (allLinks.has(rel)) {
      // fully tracked — nothing to report
    } else if (uncatLinks.has(rel)) {
      issues.push({
        file: path.relative(process.cwd(), indexAbsPath),
        line: 1,
        message: `File found under <!-- uncategorized --> but not formally grouped: '${rel}'`,
        rule: 'uncategorized-index-entry',
        severity: 1
      });
    } else {
      // missing from any form of index
      issues.push({
        file: path.relative(process.cwd(), indexAbsPath),
        line: 1,
        message: `Untracked file: '${rel}'`,
        rule: 'missing-index-entry',
        severity: 2
      });
    }
  }

  // fix logic only for full missing (both types)
  const missingRel = issues.filter(i => i.rule === 'missing-index-entry').map(i => {
    const match = /Untracked file: '(.*?)'/.exec(i.message);
    return match?.[1];
  }).filter(Boolean);

  if (allowFix && missingRel.length > 0) {
    const startIdx = lines.findIndex(l => l.trim() === START_MARKER);
    const endIdx = lines.findIndex(l => l.trim() === END_MARKER);

    let existingEntries = new Set();

    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
      for (let i = startIdx + 1; i < endIdx; i++) {
        const match = /^\s*-\s*\[.*\]\((.*?)\)/.exec(lines[i]);
        if (match) {
          existingEntries.add(match[1]);
        }
      }
    }

    const additions = new Set(missingRel.filter(p => !existingEntries.has(p)));
    if (additions.size > 0) {
      const newLines = Array.from(additions).map(p => `- [${path.basename(p)}](${p})`);

      let newContent;
      if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
        const before = lines.slice(0, startIdx + 1);
        const middle = lines.slice(startIdx + 1, endIdx);
        const after = lines.slice(endIdx);
        const updatedBlock = [...new Set([...middle, ...newLines])];
        newContent = [...before, ...updatedBlock, ...after].join('\n');
      } else {
        newContent = `${content}\n\n${START_MARKER}\n${newLines.join('\n')}\n${END_MARKER}`;
      }

      if (!dryRun) {
        fs.writeFileSync(indexAbsPath, newContent, 'utf8');
      }
    }
  }

  return issues;
}

async function runLibrarian({
  group = null,
  fix = false,
  quiet = false,
  json = false,
  debug = false,
  dryRun = false,
  force = false
} = {}) {
  const configYaml = fs.readFileSync(lintingConfigPath, 'utf8');
  const parsedConfig = yaml.load(configYaml);
  const groups = parsedConfig['update-indices'] || {};
  const targetGroups = group ? [group] : Object.keys(groups);
  const allIssues = [];

  for (const g of targetGroups) {
    const cfg = groups[g];
    if (!cfg) continue;
    const issues = scanGroup(g, cfg, { fix, dryRun, quiet, json, debug });
    allIssues.push(...issues);
  }

  if (json) {
    process.stdout.write(JSON.stringify({ issues: allIssues }, null, 2) + '\n');
  } else if (!quiet) {
    const missing = allIssues.filter(i => i.rule === 'missing-index-entry');
    const uncategorized = allIssues.filter(i => i.rule === 'uncategorized-index-entry');

    for (const issue of [...missing, ...uncategorized]) {
      const file = chalk.yellow(`${issue.file}:${issue.line}`);
      const rule = chalk.magenta(issue.rule);
      console.log(`${file} - ${rule}: ${issue.message}`);
    }

    if (missing.length === 0 && uncategorized.length > 0) {
      console.log(chalk.gray(`\nFound ${uncategorized.length} uncategorized but discoverable entry(ies).`));
      console.log(chalk.gray('\n  Tip: To suppress indexing:'));
      console.log(chalk.gray('    - Add \'lint-skip-index\' to the file'));
      console.log(chalk.gray('    - Use \'excludePatterns\' in config'));
      console.log(chalk.gray('    - Create a .docignore file in the directory'));
    }

    if (missing.length > 0 && !fix) {
      console.log(chalk.cyan('\nRun with --fix or set fix: true in config to insert missing entries.'));
    }
  }

  const blocking = allIssues.filter(i => i.rule === 'missing-index-entry').length;
  process.exitCode = blocking > 0 && !fix ? 1 : 0;

  return { issueCount: allIssues.length };
}

// Entry
if (require.main === module) {
  const { flags } = parseCliArgs(process.argv.slice(2));
  const groupFlag = Object.keys(flags).find(f => f.startsWith('group='));
  const group = groupFlag ? flags[groupFlag].split('=')[1] || groupFlag.split('=')[1] : null;

  runLibrarian({
    group,
    fix: !!flags.fix,
    quiet: !!flags.quiet,
    json: !!flags.json,
    debug: !!flags.debug,
    dryRun: !!flags.dryRun,
    force: !!flags.force
  });
}

module.exports = { runLibrarian };

