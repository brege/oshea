#!/usr/bin/env node
// scripts/linting/docs/update-project-indices.js

require('module-alias/register');

const fs = require('fs');
const path = require('path');
const glob = require('glob');
const yaml = require('js-yaml');
const {
  lintingConfigPath,
  lintHelpersPath,
  formattersPath,
  projectRoot
} = require('@paths');

const { parseCliArgs } = require(lintHelpersPath);
const { renderLintOutput } = require(formattersPath);

const START_MARKER = '<!-- uncategorized-start -->';
const END_MARKER = '<!-- uncategorized-end -->';

const LINT_SKIP_TAG = 'lint-skip-index';
const THIS_SCRIPT = path.resolve(__filename);

function getDocignoreDirs(root) {
  const ignoredDirs = [];
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
      if (entry.isDirectory() && !['node_modules', '.git'].includes(entry.name)) {
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
      void 0;
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

function scanGroup(name, config, opts = {}) {
  const {
    dryRun = false,
  } = opts;

  const {
    indexFile,
    scanRoot,
    fileExtensions,
    excludePatterns = [],
    fix: configFix = false
  } = config;

  const allowFix = configFix;
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
      severity: 2
    });
    return { issues, fixedCount };
  }

  const content = fs.readFileSync(indexAbsPath, 'utf8');
  const lines = content.split('\n');
  const { allLinks, uncatLinks } = getExistingLinks(content, indexDir);

  const roots = Array.isArray(scanRoot) ? scanRoot : [scanRoot];
  let collected = [];

  for (const root of roots) {
    const extPattern = fileExtensions.length > 1
      ? `{${fileExtensions.map(e => e.replace(/^\./, '')).join(',')}}`
      : fileExtensions[0].replace(/^\./, '');
    const globPattern = `${root}/**/*.${extPattern}`;
    const docignore = getDocignoreDirs(root);
    const ignoreGlobs = [...excludePatterns, '**/node_modules/**', '**/.git/**', ...docignore];
    const files = glob.sync(globPattern, { ignore: ignoreGlobs, nodir: true });
    collected = [...collected, ...files];
  }

  const filesToIndex = collected.filter(f => !fileHasLintSkip(f));
  const indexRelPath = path.relative(projectRoot, indexAbsPath);
  const missingEntries = [];

  for (const file of filesToIndex) {
    const rel = path.relative(indexDir, file).replace(/\\/g, '/');
    if (allLinks.has(rel)) continue;

    if (uncatLinks.has(rel)) {
      issues.push({
        file: indexRelPath,
        line: 1,
        severity: 1,
        rule: 'uncategorized-index-entry',
        message: `Uncategorized index entry: '${rel}'`
      });
    } else {
      issues.push({
        file: indexRelPath,
        line: 1,
        severity: 1,
        rule: 'missing-index-entry',
        message: `Untracked file: '${rel}'`
      });
      missingEntries.push(rel);
    }
  }

  if (allowFix && missingEntries.length > 0) {
    const startIdx = lines.findIndex(l => l.trim() === START_MARKER);
    const endIdx = lines.findIndex(l => l.trim() === END_MARKER);
    const additions = missingEntries.map(p => `- [${path.basename(p)}](${p})`);

    if (!dryRun) {
      const before = lines.slice(0, startIdx + 1);
      const after = lines.slice(endIdx);
      const block = [...new Set([...lines.slice(startIdx + 1, endIdx), ...additions])];
      const newContent = [...before, ...block.sort(), ...after].join('\n');
      fs.writeFileSync(indexAbsPath, newContent, 'utf8');
    }

    fixedCount = missingEntries.length;
    const fixedFiles = new Set(missingEntries);
    issues = issues.filter(issue => {
      if (issue.rule === 'missing-index-entry') {
        const fileName = issue.message.match(/'([^']+)'/)?.[1];
        return !fixedFiles.has(fileName);
      }
      return true;
    });
  }

  return { issues, fixedCount };
}

async function runLibrarian(options = {}) {
  const { group = null } = options;
  const configYaml = fs.readFileSync(lintingConfigPath, 'utf8');
  const parsedConfig = yaml.load(configYaml);
  const groups = parsedConfig['update-indices'] || {};
  const groupList = group ? [group] : Object.keys(groups);
  let allIssues = [];
  let totalFixed = 0;

  for (const g of groupList) {
    if (groups[g]) {
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
    const { flags } = parseCliArgs(process.argv.slice(2));
    const groupFlagKey = Object.keys(flags).find(k => k.startsWith('group='));
    const group = groupFlagKey ? groupFlagKey.split('=')[1] : null;

    const { issues, summary } = await runLibrarian({
      group,
      fix: !!flags.fix,
      dryRun: !!flags.dryRun
    });

    renderLintOutput({ issues, summary, flags });

    process.exitCode = summary.errorCount > 0 ? 1 : 0;
  })();
}

module.exports = { runLibrarian };
