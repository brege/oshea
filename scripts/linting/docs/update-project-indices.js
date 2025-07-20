#!/usr/bin/env node
// scripts/linting/docs/update-project-indices.js

require('module-alias/register');

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const chalk = require('chalk');
const {
  lintingConfigPath,
  lintHelpersPath,
  formattersPath,
  projectRoot
} = require('@paths');

const { findFiles } = require('../lib/file-discovery');
const { parseCliArgs } = require(lintHelpersPath);
const { renderLintOutput } = require(formattersPath);

const START_MARKER = 'uncategorized-start';
const END_MARKER = 'uncategorized-end';

const LINT_SKIP_TAG = 'lint-skip-index';
const THIS_SCRIPT = path.resolve(__filename);

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
      void 0;
    }
  }

  return { allLinks: links, uncatLinks };
}

function scanGroup(name, config, opts = {}) {
  const {
    dryRun = false,
    fix = false,
    debug = false,
    targets = [],
    force = false,
  } = opts;

  if (debug) console.log(chalk.blue(`\nScanning group: '${name}'`));

  const {
    indexFile,
    scanRoot,
    fileExtensions,
    excludePatterns = [],
    fix: configFix = false
  } = config;

  if (typeof indexFile !== 'string' || !indexFile) {
    if (debug) console.log(chalk.red(`[Debug] Skipping group '${name}': 'indexFile' not configured.`));
    return { issues: [], fixedCount: 0 };
  }

  const allowFix = configFix || fix;
  const indexAbsPath = path.resolve(indexFile);
  const indexDir = path.dirname(indexAbsPath);
  let issues = [];
  let fixedCount = 0;

  if (!fs.existsSync(indexAbsPath)) {
    issues.push({
      file: path.relative(projectRoot, indexFile),
      line: 1,
      message: `Index file not found for group: '${name}'`,
      rule: 'missing-index-file',
      severity: 1
    });
    return { issues, fixedCount };
  }

  if (debug) console.log(chalk.gray(`[Debug] Reading index file: ${path.relative(projectRoot, indexAbsPath)}`));

  const content = fs.readFileSync(indexAbsPath, 'utf8');
  const lines = content.split('\n');
  const { allLinks, uncatLinks } = getExistingLinks(content, indexDir);

  let filesToIndex;

  if (targets.length > 0 && !force) {
    if (debug) console.log(chalk.cyan(`[Debug] Using CLI target '${targets[0]}' to generate specific glob.`));
    const target = targets[0];
    const extPattern = fileExtensions.length > 1
      ? `{${fileExtensions.map(e => e.replace(/^\./, '')).join(',')}}`
      : fileExtensions[0].replace(/^\./, '');

    const globTarget = fs.existsSync(target) && fs.statSync(target).isDirectory()
      ? `${target}/**/*.${extPattern}`
      : target;

    filesToIndex = findFiles({
      targets: [globTarget],
      ignores: [...excludePatterns, '**/node_modules/**', '**/.git/**'],
      respectDocignore: true,
      docignoreRoot: projectRoot,
      skipTag: LINT_SKIP_TAG,
      debug,
    });

  } else {
    const globRoots = (force && targets.length > 0) ? targets : (Array.isArray(scanRoot) ? scanRoot : [scanRoot]);
    let globTargets = [];
    for (const root of globRoots) {
      if (!root) continue;
      const extPattern = fileExtensions.length > 1
        ? `{${fileExtensions.map(e => e.replace(/^\./, '')).join(',')}}`
        : fileExtensions[0].replace(/^\./, '');
      globTargets.push(`${root}/**/*.${extPattern}`);
    }
    filesToIndex = findFiles({
      targets: globTargets,
      ignores: [...excludePatterns, '**/node_modules/**', '**/.git/**'],
      respectDocignore: true,
      docignoreRoot: projectRoot,
      skipTag: LINT_SKIP_TAG,
      debug,
    });
  }

  const indexRelPath = path.relative(projectRoot, indexAbsPath);

  for (const rel of uncatLinks) {
    issues.push({
      file: indexRelPath,
      line: 1,
      severity: 1,
      rule: 'uncategorized-index-entry',
      message: `Uncategorized index entry: '${rel}'`
    });
  }

  const missingInIndex = [];
  for (const file of filesToIndex) {
    if (path.resolve(file) === THIS_SCRIPT) continue;
    const rel = path.relative(indexDir, file).replace(/\\/g, '/');
    if (!allLinks.has(rel) && !uncatLinks.has(rel)) {
      missingInIndex.push(rel);
    }
  }

  if (debug && missingInIndex.length > 0) {
    console.log(chalk.yellow(`[Debug] Found ${missingInIndex.length} files missing from the index for group '${name}'.`));
  }

  for (const rel of missingInIndex) {
    issues.push({
      file: indexRelPath,
      line: 1,
      severity: 1,
      rule: 'missing-index-entry',
      message: `Untracked file: '${rel}'`
    });
  }

  if (allowFix && missingInIndex.length > 0) {
    const startIdx = lines.findIndex(l => l.trim().includes(START_MARKER));
    const endIdx = lines.findIndex(l => l.trim().includes(END_MARKER));

    if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) {
      issues.push({
        file: indexRelPath,
        line: 1,
        severity: 2,
        rule: 'uncategorized-block-missing',
        message: 'Uncategorized block missing in index file.'
      });
      return { issues, fixedCount };
    }

    const previousBlockLines = lines.slice(startIdx + 1, endIdx);
    const existingEntries = new Set(previousBlockLines
      .map(line => {
        const match = line.match(/\[.*?\]\((.*?)\)/);
        return match ? match[1] : null;
      })
      .filter(Boolean)
    );

    const additions = missingInIndex
      .filter(p => !existingEntries.has(p))
      .map(p => `\n- [${path.basename(p)}](${p})`);

    if (additions.length > 0) {
      if (!dryRun) {
        const before = lines.slice(0, startIdx + 1);
        const after = lines.slice(endIdx);
        const newBlock = [...previousBlockLines, ...additions].sort();
        const newContent = [...before, ...newBlock, ...after].join('\n');
        fs.writeFileSync(indexAbsPath, newContent, 'utf8');
      }
      fixedCount = additions.length;
    }
  }

  return { issues, fixedCount };
}

async function runLibrarian(options = {}) {
  const { group = null, debug = false, targets = [], force = false } = options;
  const configYaml = fs.readFileSync(lintingConfigPath, 'utf8');
  const parsedConfig = yaml.load(configYaml);
  const groups = parsedConfig['update-indices'] || {};
  let allIssues = [];
  let totalFixed = 0;

  if (debug) console.log(chalk.bold.yellowBright('--- Running Librarian in Debug Mode ---'));

  let groupsToRun = [];

  if (targets.length > 0) {
    if (debug) console.log(chalk.cyan(`[Debug] CLI targets provided. Determining relevant group(s)...`));
    const targetPath = path.resolve(targets[0]);
    for (const [groupName, groupConfig] of Object.entries(groups)) {
      if (typeof groupConfig !== 'object' || !groupConfig.scanRoot) continue;
      const scanRoots = Array.isArray(groupConfig.scanRoot) ? groupConfig.scanRoot : [groupConfig.scanRoot];
      if (scanRoots.some(root => root && targetPath.startsWith(path.resolve(root)))) {
        groupsToRun.push(groupName);
        if (debug) console.log(chalk.green(`[Debug] Target '${targets[0]}' matches scan root for group '${groupName}'.`));
      }
    }
    if (groupsToRun.length === 0 && debug) {
      console.log(chalk.red(`[Debug] No matching group found for target '${targets[0]}'.`));
    }
  } else {
    groupsToRun = group ? [group] : Object.keys(groups);
  }

  for (const g of groupsToRun) {
    if (groups[g] && typeof groups[g] === 'object') {
      const { issues, fixedCount } = scanGroup(g, groups[g], options);
      allIssues.push(...issues);
      totalFixed += fixedCount;
    }
  }

  const summary = {
    errorCount: allIssues.filter(i => i.severity === 2).length,
    warningCount: allIssues.filter(i => i.severity === 1).length,
    fixedCount: totalFixed
  };

  return { issues: allIssues, summary, results: [] };
}

if (require.main === module) {
  (async () => {
    const { flags, targets } = parseCliArgs(process.argv.slice(2));
    const group = flags.group || null;

    await runLibrarian({
      group,
      targets,
      fix: !!flags.fix,
      dryRun: !!flags.dryRun,
      debug: !!flags.debug,
      force: !!flags.force,
    }).then(({ issues, summary }) => {
        renderLintOutput({ issues, summary, flags });
        process.exitCode = summary.errorCount > 0 ? 1 : 0;
    }).catch(error => {
        console.error(chalk.red.bold('\n--- LIBRARIAN CRASHED ---'));
        console.error(error);
        process.exit(1);
    });
  })();
}

module.exports = { runLibrarian };
