#!/usr/bin/env node
// scripts/linting/docs/update-project-indices.js

const fs = require('fs');
const path = require('path');
const glob = require('glob');
const yaml = require('js-yaml');

const CONFIG_PATH = path.resolve(process.cwd(), '.index-config.yaml');
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
    } catch (e) {
      return;
    }
    if (entries.some(e => e.isFile() && e.name === '.docignore')) {
      ignoredDirs.push(path.resolve(dir));
      return; // Don't descend further
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
      continue; // Ignore links inside the uncategorized block
    }

    const rawLink = match[1];
    if (!rawLink || rawLink.startsWith('http')) continue;

    try {
      const abs = path.resolve(baseDir, rawLink);
      const rel = path.relative(baseDir, abs).replace(/\\/g, '/');
      links.add(rel);
    } catch {
      // Ignore errors from invalid links
    }
  }
  return links;
}

function fileHasLintSkip(file) {
  if (path.resolve(file) === THIS_SCRIPT) return false; // never skip this script itself
  try {
    const content = fs.readFileSync(file, 'utf8');
    return content.includes(LINT_SKIP_TAG);
  } catch {
    return false;
  }
}

function updateIndexFile(groupName, groupConfig, opts = {}) {
  const { indexFile, scanRoot, fileExtensions, excludePatterns } = groupConfig;
  const { quiet = false } = opts;

  const INDEX_FILE_PATH = path.resolve(process.cwd(), indexFile);
  if (!fs.existsSync(INDEX_FILE_PATH)) {
    console.error(`ERROR: Index file for group '${groupName}' not found at ${INDEX_FILE_PATH}`);
    process.exitCode = 1;
    return;
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

    if (!quiet) {
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

    if (!quiet) {
      console.log(`  Found ${found.length} total files in scan root(s).`);
    }
  }

  // Filter out files that contain the lint-skip flag (quietly, no warning)
  const filesToIndex = allFiles.filter(file => !fileHasLintSkip(file));

  const existingLinks = getExistingLinks(content, INDEX_DIR);
  if (!quiet) {
    console.log(`  Found ${existingLinks.size} existing links in ${indexFile}`);
  }

  const untrackedFiles = filesToIndex.filter(file => {
    const relPath = path.relative(INDEX_DIR, file).replace(/\\/g, '/');
    return !existingLinks.has(relPath);
  });

  if (untrackedFiles.length === 0) {
    if (!quiet) {
      console.log(`[librarian] ${groupName}: ${indexFile} ✔ No new uncategorized files.`);
    }
    return;
  }

  // Always print this block if files are added (even in quiet)
  console.warn(`[librarian] ${groupName}: ${indexFile} ✚ Adding ${untrackedFiles.length} untracked file(s):`);
  untrackedFiles.forEach(file => {
    const relPath = path.relative(INDEX_DIR, file).replace(/\\/g, '/');
    console.warn(`    - ${relPath}`);
  });

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
    if (!quiet) {
      console.warn(`WARN: Markers not found in ${indexFile}. Appending list to the end.`);
    }
    finalContent = `${content}\n\n${START_MARKER}\n${newUncatLines.join('\n')}\n${END_MARKER}\n`;
  }

  fs.writeFileSync(INDEX_FILE_PATH, finalContent, 'utf8');
  console.warn(`[librarian] ${groupName}: ${indexFile} ✚ Updated with ${newUncatLines.length} untracked file(s).`);
}

function main() {
  if (!fs.existsSync(CONFIG_PATH)) {
    console.error(`ERROR: Configuration file not found at ${CONFIG_PATH}`);
    process.exit(1);
  }

  const configs = yaml.load(fs.readFileSync(CONFIG_PATH, 'utf8'));
  const args = process.argv.slice(2);
  const groupArg = args.find(arg => arg.startsWith('--group='));
  const specificGroup = groupArg ? groupArg.split('=')[1] : null;
  const quiet = args.includes('--quiet') || args.includes('--warn-only');

  let hadError = false;

  if (specificGroup) {
    const groupConfig = configs[specificGroup];
    if (groupConfig) {
      updateIndexFile(specificGroup, groupConfig, { quiet });
    } else {
      console.error(`ERROR: Group '${specificGroup}' not found in configuration.`);
      hadError = true;
    }
  } else {
    for (const groupName in configs) {
      if (Object.hasOwnProperty.call(configs, groupName)) {
        updateIndexFile(groupName, configs[groupName], { quiet });
      }
    }
  }

  if (hadError || process.exitCode === 1) {
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

