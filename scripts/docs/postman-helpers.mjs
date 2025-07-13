import fs from 'fs';
import path from 'path';
import { minimatch } from 'minimatch';
import { createRequire } from 'module';
import { loadLintSection } from '../shared/lint-config-loader.mjs';
const require = createRequire(import.meta.url);
const { findFiles } = require('../shared/file-helpers.js');

export function loadPostmanRules(yamlPath = 'scripts/linting/config.yaml') {
  return loadLintSection('postman', yamlPath);
}

export function getMarkdownFiles(rootDir, rules, userGlobs = [], excludeDirs = []) {
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
    // ignore
    }
    return true;
  });
  return files;
}

export function isReferenceExcluded(ref, rules) {
  const rel = ref.replace(/\\/g, '/');
  const patterns = rules.excludes || [];
  return patterns.some(pattern => minimatch(rel, pattern));
}

export function isAllowedExtension(ref, rules) {
  const allowed = rules.allowed_extensions || [];
  return allowed.some(ext => ref.endsWith(ext));
}

export function isSkipLink(ref, rules) {
  const patterns = rules.skip_link_patterns || [];
  return patterns.some(pattern => minimatch(ref, pattern));
}

export function resolveReference(mdFile, ref, allowedExts) {
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

export function findCandidates(ref, allowedExts, rootDirs = ['.']) {
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

