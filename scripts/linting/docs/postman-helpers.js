// scripts/linting/docs/postman-helpers.js
require('module-alias/register');
const fs = require('fs');
const path = require('path');
const { minimatch } = require('minimatch');

const {
  lintingConfigPath,
  fileHelpersPath,
  lintConfigLoaderPath
} = require('@paths');

const { loadLintSection } = require(lintConfigLoaderPath);
const { findFiles } = require(fileHelpersPath);

function loadPostmanRules(yamlPath = lintingConfigPath) {
  return loadLintSection('postman', yamlPath);
}

function getMarkdownFiles(rootDir, rules, userGlobs = [], excludeDirs = []) {
  const excludes = rules.excludes || [];
  let files = [];
  if (userGlobs.length) {
    const glob = require('glob');
    for (const pattern of userGlobs) {
      const matches = glob.sync(pattern, {
        cwd: process.cwd(),
        absolute: true,
        nodir: true,
        ignore: excludes,
      });
      for (const file of matches) {
        if (file.endsWith('.md')) files.push(file);
      }
    }
  } else {
    for (const file of findFiles(rootDir, {
      filter: name => name.endsWith('.md'),
      ignores: excludeDirs,
    })) {
      files.push(file);
    }
  }
  files = files.filter(file => {
    const rel = path.relative(process.cwd(), file).replace(/\\/g, '/');
    if (excludes.some(pattern => minimatch(rel, pattern))) return false;
    try {
      const content = fs.readFileSync(file, 'utf8');
      if (content.includes('lint-skip-index')) return false;
    } catch (e) {
      //
    }
    return true;
  });
  return files;
}

function isReferenceExcluded(ref, rules) {
  const rel = ref.replace(/\\/g, '/');
  const patterns = rules.excludes || [];
  return patterns.some(pattern => minimatch(rel, pattern));
}

function isAllowedExtension(ref, rules) {
  const allowed = rules.allowed_extensions || [];
  return allowed.some(ext => ref.endsWith(ext));
}

function isSkipLink(ref, rules) {
  const patterns = rules.skip_link_patterns || [];
  return patterns.some(pattern => minimatch(ref, pattern));
}

function resolveReference(mdFile, ref, allowedExts) {
  const mdDir = path.dirname(mdFile);
  let targetPath = path.resolve(mdDir, ref);
  if (!allowedExts.some(ext => ref.endsWith(ext))) {
    for (const ext of allowedExts) {
      if (fs.existsSync(targetPath + ext)) return targetPath + ext;
    }
  }
  if (fs.existsSync(targetPath)) return targetPath;
  return null;
}

function findCandidates(ref, allowedExts, rootDirs = ['.']) {
  const normRef = ref.replace(/\\/g, '/');
  const candidates = new Set();
  for (const root of rootDirs) {
    for (const file of findFiles(root, {
      filter: name => allowedExts.some(ext => name.endsWith(ext)),
    })) {
      const relFile = path.relative(process.cwd(), file).replace(/\\/g, '/');
      const base = path.basename(relFile);
      if (relFile.endsWith(normRef) || base === normRef) {
        candidates.add(file);
      }
    }
  }
  return Array.from(candidates);
}

module.exports = {
  loadPostmanRules,
  getMarkdownFiles,
  isReferenceExcluded,
  isAllowedExtension,
  isSkipLink,
  resolveReference,
  findCandidates
};

