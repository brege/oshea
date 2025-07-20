// scripts/linting/lib/file-discovery.js
require('module-alias/register');

const fs = require('fs');
const path = require('path');
const glob = require('glob');
const chalk = require('chalk');
const { minimatch } = require('minimatch');
const { projectRoot, fileHelpersPath } = require('@paths');
const { isGlobPattern } = require(fileHelpersPath);

function getDocignorePatterns(root) {
  const ignoredDirs = [];
  function walk(dir) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      if (entries.some(e => e.isFile() && e.name === '.docignore')) {
        ignoredDirs.push(path.resolve(dir));
        return;
      }
      for (const entry of entries) {
        if (entry.isDirectory() && !['node_modules', '.git'].includes(entry.name)) {
          walk(path.join(dir, entry.name));
        }
      }
    } catch {
      // Ignore errors
    }
  }
  walk(root);
  return ignoredDirs.map(absDir => path.join(path.relative(projectRoot, absDir), '**').replace(/\\/g, '/'));
}

function fileHasSkipTag(filePath, skipTag) {
  if (!skipTag) return false;
  try {
    return fs.readFileSync(filePath, 'utf8').includes(skipTag);
  } catch {
    return false;
  }
}

function* walkDir(dir, options) {
  const { ignores = [], fileFilter = () => true } = options;
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.resolve(dir, entry.name);
      const relPath = path.relative(projectRoot, fullPath).replace(/\\/g, '/');
      if (ignores.some(pattern => minimatch(relPath, pattern))) {
        continue;
      }
      if (entry.isDirectory()) {
        yield* walkDir(fullPath, options);
      } else if (entry.isFile() && fileFilter(fullPath)) {
        yield fullPath;
      }
    }
  } catch {
    // Suppress errors
  }
}


function findFiles(options = {}) {
  const {
    targets,
    ignores = [],
    fileFilter = () => true,
    respectDocignore = false,
    docignoreRoot = projectRoot,
    skipTag = null,
    debug = false,
  } = options;

  if (debug) console.log(chalk.yellowBright(`\n[findFiles:Debug] Received targets: ${JSON.stringify(targets)}`));

  const combinedIgnores = [...ignores];
  if (respectDocignore) {
    const docIgnores = getDocignorePatterns(docignoreRoot);
    if (debug && docIgnores.length > 0) {
      console.log(chalk.gray(`[findFiles:Debug] Applying .docignore patterns: ${JSON.stringify(docIgnores)}`));
    }
    combinedIgnores.push(...docIgnores);
  }
  if (debug) console.log(chalk.gray(`[findFiles:Debug] Using combined ignore patterns: ${JSON.stringify(combinedIgnores)}`));

  const matchedFiles = new Set();
  const allTargets = Array.isArray(targets) ? targets : [targets];

  for (const target of allTargets) {
    if (isGlobPattern(target)) {
      if (debug) console.log(chalk.cyan(`[findFiles:Debug] Processing '${target}' as a glob pattern.`));
      const matches = glob.sync(target, { cwd: projectRoot, absolute: true, nodir: true, ignore: combinedIgnores, dot: true });
      matches.forEach(m => matchedFiles.add(m));
    } else if (fs.existsSync(target) && fs.statSync(target).isDirectory()) {
      if (debug) console.log(chalk.cyan(`[findFiles:Debug] Processing '${target}' as a directory.`));
      for (const file of walkDir(target, { ignores: combinedIgnores, fileFilter })) {
        matchedFiles.add(file);
      }
    } else if (fs.existsSync(target)) {
      if (debug) console.log(chalk.cyan(`[findFiles:Debug] Processing '${target}' as a direct file path.`));
      matchedFiles.add(path.resolve(target));
    } else if (debug) {
      console.log(chalk.red(`[findFiles:Debug] Target '${target}' does not exist and is not a valid glob. Skipping.`));
    }
  }
  if (debug) console.log(chalk.cyan(`[findFiles:Debug] Total unique paths found: ${matchedFiles.size}`));

  const finalFiles = [];
  for (const file of matchedFiles) {
    const relPath = path.relative(projectRoot, file);
    if (ignores.some(pattern => minimatch(relPath, pattern))) {
      if (debug) console.log(chalk.magenta(`[findFiles:Debug] Skipping file matching ignore pattern: ${relPath}`));
      continue;
    }
    if (skipTag && fileHasSkipTag(file, skipTag)) {
      if (debug) console.log(chalk.magenta(`[findFiles:Debug] Skipping file with tag '${skipTag}': ${relPath}`));
      continue;
    }
    if(fileFilter(file)) {
      finalFiles.push(file);
    }
  }

  if (debug) console.log(chalk.green(`[findFiles:Debug] Returning ${finalFiles.length} files after all filtering.`));
  return finalFiles;
}

function findCandidates(ref, allowedExts, rootDirs = ['.']) {
  const normRef = ref.replace(/\\/g, '/');
  const candidates = new Set();
  const allFiles = findFiles({
    targets: rootDirs,
    fileFilter: name => allowedExts.some(ext => name.endsWith(ext)),
  });

  for (const file of allFiles) {
    const relFile = path.relative(projectRoot, file).replace(/\\/g, '/');
    const base = path.basename(relFile);
    if (relFile.endsWith(normRef) || base === normRef) {
      candidates.add(file);
    }
  }
  return Array.from(candidates);
}

module.exports = { findFiles, findCandidates };
