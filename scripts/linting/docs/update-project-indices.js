#!/usr/bin/env node
// scripts/linting/docs/update-project-indices.js

require('module-alias/register');

const fs = require('fs');
const path = require('path');
const glob = require('glob');
const yaml = require('js-yaml');
const chalk = require('chalk');
const {
  lintingConfigPath,
  lintHelpersPath,
  formattersPath,
  projectRoot
} = require('@paths');

const { parseCliArgs } = require(lintHelpersPath);
const { adaptRawIssuesToEslintFormat, formatLintResults } = require(formattersPath);

const START_MARKER = '<!-- uncategorized-start -->';
const END_MARKER = '<!-- uncategorized-end -->';
const LINT_SKIP_TAG = 'lint-skip-index';
const THIS_SCRIPT = path.resolve(__filename);

function padRight(str = '', len = 20) {
  return str + ' '.repeat(Math.max(0, len - str.length));
}

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
    } catch {
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
  } = config;

  const allowFix = fix || configFix;
  const indexAbsPath = path.resolve(indexFile);
  const indexDir = path.dirname(indexAbsPath);

  let issues = [];

  if (!fs.existsSync(indexAbsPath)) {
    issues.push({
      file: path.relative(process.cwd(), indexFile),
      line: 1,
      message: `Index file not found for group: '${name}'`,
      rule: 'missing-index-file',
      severity: 1
    });
    return issues;
  }

  const content = fs.readFileSync(indexAbsPath, 'utf8');
  const lines = content.split('\n');
  const { allLinks, uncatLinks } = getExistingLinks(content, indexDir);

  const roots = Array.isArray(scanRoot) ? scanRoot : [scanRoot];
  let collected = [];

  if (debug) {
    console.log(`\n[DEBUG] Group: ${name}`);
    console.log(`  ${padRight('Index file')}: ${indexFile}`);
    console.log(`  ${padRight('Scan roots')}: ${roots.join(', ')}`);
    console.log(`  ${padRight('Extensions')}: ${fileExtensions.join(', ')}`);
  }

  for (const root of roots) {
    const extPattern = fileExtensions.length > 1
      ? `{${fileExtensions.map(e => e.replace(/^\./, '')).join(',')}}`
      : fileExtensions[0].replace(/^\./, '');
    const globPattern = `${root}/**/*.${extPattern}`;
    const docignore = getDocignoreDirs(root);
    const ignoreGlobs = [...excludePatterns, '**/node_modules/**', '**/.git/**', ...docignore];

    const files = glob.sync(globPattern, { ignore: ignoreGlobs, nodir: true });
    collected = [...collected, ...files];

    if (debug) {
      const entryPad = '    - ';
      console.log(`${entryPad}${globPattern.padEnd(48)} → ${files.length} file(s)`);
      if (docignore.length) {
        console.log(`  ${padRight('  .docignore')}: [${docignore.join(', ')}]`);
      }
    }
  }

  const filesToIndex = collected.filter(f => !fileHasLintSkip(f));

  const indexRelPath = path.relative(projectRoot, indexAbsPath);
  const missingEntries = [];

  for (const file of filesToIndex) {
    const rel = path.relative(indexDir, file).replace(/\\/g, '/');

    if (allLinks.has(rel)) {
      continue;
    } else if (uncatLinks.has(rel)) {
      issues.push({
        file: indexRelPath,
        line: 1,
        severity: 1, // warning
        rule: 'uncategorized-index-entry',
        message: `Uncategorized index entry: '${rel}'`
      });
    } else {
      issues.push({
        file: indexRelPath,
        line: 1,
        severity: 2, // error
        rule: 'missing-index-entry',
        message: `Untracked file: '${rel}'`
      });
      missingEntries.push(rel);
    }
  }

  // Around line 100-140 in scanGroup function, replace the end of the function with:

  if (allowFix && missingEntries.length > 0) {
    const startIdx = lines.findIndex(l => l.trim() === START_MARKER);
    const endIdx = lines.findIndex(l => l.trim() === END_MARKER);

    const additions = missingEntries.map(p => `- [${path.basename(p)}](${p})`);
    const before = lines.slice(0, startIdx + 1);
    const after = lines.slice(endIdx);
    const block = [...new Set([...lines.slice(startIdx + 1, endIdx), ...additions])];

    const newContent = startIdx !== -1 && endIdx !== -1
      ? [...before, ...block, ...after].join('\n')
      : `${content}\n\n${START_MARKER}\n${additions.join('\n')}\n${END_MARKER}`;

    if (!dryRun) {
      fs.writeFileSync(indexAbsPath, newContent, 'utf8');
      // After successfully fixing, remove the missing-index-entry errors from issues
      const fixedFiles = new Set(missingEntries);
      issues = issues.filter(issue => {
        if (issue.rule === 'missing-index-entry') {
          const fileName = issue.message.match(/'([^']+)'/)?.[1];
          return !fixedFiles.has(fileName);
        }
        return true;
      });
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
  dryRun = false
} = {}) {
  const configYaml = fs.readFileSync(lintingConfigPath, 'utf8');
  const parsedConfig = yaml.load(configYaml);
  const groups = parsedConfig['update-indices'] || {};
  const groupList = group ? [group] : Object.keys(groups);
  const allIssues = [];

  for (const g of groupList) {
    const cfg = groups[g];
    if (cfg) {
      const groupIssues = scanGroup(g, cfg, { fix, dryRun, debug });
      allIssues.push(...groupIssues);
    }
  }

  const formatted = formatLintResults(adaptRawIssuesToEslintFormat(allIssues));

  if (json) {
    process.stdout.write(JSON.stringify({ issues: allIssues }, null, 2) + '\n');
  } else if (!quiet) {
    if (formatted) {
      console.log('\n' + formatted);
    } else {
      console.log(chalk.green('\n✔ All index files are up to date.'));
    }

    const uncategorized = allIssues.filter(i => i.rule === 'uncategorized-index-entry');
    const missing = allIssues.filter(i => i.rule === 'missing-index-entry');

    if (uncategorized.length > 0 && missing.length === 0) {
      console.log(chalk.gray('\nℹ Uncategorized but discoverable files:'));
      uncategorized.forEach(i => {
        console.log(`  • ${i.message.match(/'([^']+)'/)?.[1] || '?'}`);
      });

      console.log('\nTo suppress indexing warnings, you may:');
      console.log('  • Add `lint-skip-index` to the file');
      console.log('  • Use `excludePatterns` in your config');
      console.log('  • Create a `.docignore` file in the directory');
    }

    if (missing.length > 0 && !fix) {
      console.log('\nRun with --fix or set fix: true in config to insert missing entries.');
    }
  }

  const exitCode = allIssues.some(i => i.severity === 2) ? 1 : 0;
  process.exitCode = exitCode;

  return { issueCount: allIssues.length };
}

// CLI Entry
if (require.main === module) {
  const { flags } = parseCliArgs(process.argv.slice(2));
  const groupFlagKey = Object.keys(flags).find(k => k.startsWith('group='));
  const group = groupFlagKey ? groupFlagKey.split('=')[1] : null;

  runLibrarian({
    group,
    fix: !!flags.fix,
    quiet: !!flags.quiet,
    json: !!flags.json,
    debug: !!flags.debug,
    dryRun: !!flags.dryRun
  });
}

module.exports = { runLibrarian };

