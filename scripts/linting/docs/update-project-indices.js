#!/usr/bin/env node
// scripts/linting/docs/update-project-indices.js

require('module-alias/register');

const fs = require('fs');
const path = require('path');
const glob = require('glob');
const yaml = require('js-yaml');
const { lintHelpersPath, lintingConfigPath } = require('@paths');
const { parseCliArgs } = require(lintHelpersPath);

const CONFIG_PATH = lintingConfigPath;

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
    } catch (_e) {
      // ignore
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
  let match;

  const startIdx = content.indexOf(START_MARKER);
  const endIdx = content.indexOf(END_MARKER);
  const hasUncatBlock = startIdx !== -1 && endIdx !== -1 && endIdx > startIdx;

  while ((match = linkRegex.exec(content)) !== null) {
    if (hasUncatBlock && match.index > startIdx && match.index < endIdx) {
      continue;
    }
    const rawLink = match[1];
    if (!rawLink || rawLink.startsWith('http')) continue;
    try {
      const abs = path.resolve(baseDir, rawLink);
      const rel = path.relative(baseDir, abs).replace(/\\/g, '/');
      links.add(rel);
    } catch (_e) {
      // ignore
    }
  }
  return links;
}

function fileHasLintSkip(file) {
  if (path.resolve(file) === THIS_SCRIPT) return false;
  try {
    const content = fs.readFileSync(file, 'utf8');
    return content.includes(LINT_SKIP_TAG);
  } catch {
    return false;
  }
}

function updateIndexFile(groupName, groupConfig, opts = {}) {
  const { indexFile, scanRoot, fileExtensions, excludePatterns } = groupConfig;
  const { quiet = false, fix = false, json = false, debug = false, dryRun = false } = opts;

  const INDEX_FILE_PATH = path.resolve(process.cwd(), indexFile);
  if (!fs.existsSync(INDEX_FILE_PATH)) {
    const msg = `ERROR: Index file for group '${groupName}' not found at ${INDEX_FILE_PATH}`;
    if (!quiet && !json) console.error(msg);
    return { group: groupName, error: msg, updated: false, added: 0, files: [] };
  }

  const INDEX_DIR = path.dirname(INDEX_FILE_PATH);
  const content = fs.readFileSync(INDEX_FILE_PATH, 'utf8');
  const lines = content.split('\n');

  const startIdx = lines.findIndex(line => line.trim() === START_MARKER);
  const endIdx = lines.findIndex(line => line.trim() === END_MARKER);

  const scanRoots = Array.isArray(scanRoot) ? scanRoot : [scanRoot];
  let allFiles = [];
  for (const root of scanRoots) {
    const extPattern = fileExtensions.length > 1
      ? `{${fileExtensions.map(e => e.replace(/^\./, '')).join(',')}}`
      : fileExtensions[0].replace(/^\./, '');
    const globPattern = `${root}/**/*.${extPattern}`;
    const docignorePatterns = getDocignoreDirs(root);

    if (debug && !json) {
      console.log(`[librarian] ${groupName}: ${indexFile}`);
      console.log(`  Scanning with glob pattern: ${globPattern}`);
      if (docignorePatterns.length > 0) {
        console.log('  Skipping directories with .docignore:', docignorePatterns);
      }
    }

    const found = glob.sync(globPattern, {
      ignore: [
        ...(excludePatterns || []),
        '**/node_modules/**',
        '**/.git/**',
        ...docignorePatterns,
      ],
      nodir: true,
    });
    allFiles = allFiles.concat(found);

    if (debug && !json) {
      console.log(`  Found ${found.length} total files in scan root(s).`);
    }
  }

  const filesToIndex = allFiles.filter(file => !fileHasLintSkip(file));
  const existingLinks = getExistingLinks(content, INDEX_DIR);

  const untrackedFiles = filesToIndex.filter(file => {
    const relPath = path.relative(INDEX_DIR, file).replace(/\\/g, '/');
    return !existingLinks.has(relPath);
  });

  if (untrackedFiles.length === 0) {
    if (!quiet && !json) {
      console.log(`[librarian] ${groupName}: ${indexFile} ✔ No new uncategorized files.`);
    }
    return { group: groupName, updated: false, added: 0, files: [] };
  }

  if (!quiet && !json) {
    console.warn(`[librarian] ${groupName}: ${indexFile} ✚ ${dryRun ? 'Would add' : 'Adding'} ${untrackedFiles.length} untracked file(s):`);
    untrackedFiles.forEach(file => {
      const relPath = path.relative(INDEX_DIR, file).replace(/\\/g, '/');
      console.warn(`    - ${relPath}`);
    });
  }

  const newUncatLines = untrackedFiles.map(file => {
    const relPath = path.relative(INDEX_DIR, file).replace(/\\/g, '/');
    return `- [${path.basename(file)}](${relPath})`;
  });

  let finalContent;
  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    const before = lines.slice(0, startIdx + 1).join('\n');
    const after = lines.slice(endIdx).join('\n');
    finalContent = `${before}\n${newUncatLines.join('\n')}\n${after}`;
  } else {
    if (!quiet && !json) {
      console.warn(`WARN: Markers not found in ${indexFile}. Appending list to the end.`);
    }
    finalContent = `${content}\n\n${START_MARKER}\n${newUncatLines.join('\n')}\n${END_MARKER}\n`;
  }

  if (fix && !dryRun) {
    fs.writeFileSync(INDEX_FILE_PATH, finalContent, 'utf8');
    if (!quiet && !json) {
      console.warn(`[librarian] ${groupName}: ${indexFile} ✚ Updated with ${newUncatLines.length} untracked file(s).`);
    }
  } else if (dryRun && !quiet && !json) {
    console.warn(`[librarian] ${groupName}: ${indexFile} ✎ Would update index (dry-run mode).`);
  }

  return {
    group: groupName,
    updated: fix && !dryRun,
    added: untrackedFiles.length,
    files: untrackedFiles.map(f => path.relative(INDEX_DIR, f).replace(/\\/g, '/'))
  };
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
  if (!fs.existsSync(CONFIG_PATH)) {
    const msg = `ERROR: Configuration file not found at ${CONFIG_PATH}`;
    if (!quiet && !json) console.error(msg);
    if (json) process.stdout.write(JSON.stringify({ error: msg }, null, 2) + '\n');
    process.exitCode = 1;
    return { error: msg };
  }

  const allConfigs = yaml.load(fs.readFileSync(CONFIG_PATH, 'utf8'));
  //const configs = allConfigs.update-indices || {};
  // can't use hyphens with js dots
  const configs = allConfigs['update-indices'] || {};
  const results = [];

  if (group) {
    const groupConfig = configs[group];
    if (groupConfig) {
      const res = updateIndexFile(group, groupConfig, { fix, quiet, json, debug, dryRun });
      results.push(res);
    } else {
      const msg = `ERROR: Group '${group}' not found in configuration.`;
      if (!quiet && !json) console.error(msg);
      if (json) process.stdout.write(JSON.stringify({ error: msg }, null, 2) + '\n');
    }
  } else {
    for (const groupName in configs) {
      if (Object.hasOwnProperty.call(configs, groupName)) {
        const res = updateIndexFile(groupName, configs[groupName], { fix, quiet, json, debug, dryRun });
        results.push(res);
      }
    }
  }

  const anyError = results.some(r => r && r.error);

  if (json) {
    process.stdout.write(JSON.stringify({ results }, null, 2) + '\n');
  }

  if (debug && dryRun) {
    console.log('[DEBUG] Dry-run mode enabled — no files were written.');
  }

  process.exitCode = anyError ? 1 : 0;
  return { results };
}

// CLI entry
if (require.main === module) {
  (async () => {
    const { flags } = parseCliArgs(process.argv.slice(2));
    const groupFlag = Object.keys(flags).find(f => f.startsWith('group='));
    const group = groupFlag ? flags[groupFlag] || groupFlag.split('=')[1] : null;

    await runLibrarian({
      group,
      fix: !!flags.fix,
      quiet: !!flags.quiet,
      json: !!flags.json,
      debug: !!flags.debug,
      dryRun: !!flags.dryRun,
      force: !!flags.force,
    });
  })();
}

module.exports = { runLibrarian };

