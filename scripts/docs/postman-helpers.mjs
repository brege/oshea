import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { minimatch } from 'minimatch';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { findFiles } = require('../shared/file-helpers.js');

export function loadPostmanRules(yamlPath = './scripts/docs/postman-rules.yaml') {
  const raw = fs.readFileSync(yamlPath, 'utf8');
  return yaml.load(raw);
}

export function getMarkdownFiles(rootDir, rules, userGlobs = [], excludeDirs = []) {
  const excludes = rules.global_excludes || [];
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
  // Exclude by global_excludes and lint-skip-index
  files = files.filter(file => {
    const rel = path.relative(process.cwd(), file).replace(/\\/g, '/');
    if (excludes.some(pattern => minimatch(rel, pattern))) return false;
    try {
      const content = fs.readFileSync(file, 'utf8');
      if (content.includes('lint-skip-index')) return false;
    } catch (e) {
      // Ignore
    }
    return true;
  });
  return files;
}

export function isReferenceExcluded(ref, linkType, rules) {
  const rel = ref.replace(/\\/g, '/');
  const patterns = (rules.link_types?.[linkType]?.exclude) || [];
  return patterns.some(pattern => minimatch(rel, pattern));
}

export function isAllowedExtension(ref, linkType, rules) {
  const allowed = (rules.link_types?.[linkType]?.allow_extensions) || [];
  return allowed.some(ext => ref.endsWith(ext));
}

export function resolveReference(mdFile, ref, extensions = ['.md', '.js', '.mjs']) {
  const mdDir = path.dirname(mdFile);
  let targetPath = path.resolve(mdDir, ref);
  if (!extensions.some(ext => ref.endsWith(ext))) {
    for (const ext of extensions) {
      if (fs.existsSync(targetPath + ext)) return targetPath + ext;
    }
  }
  if (fs.existsSync(targetPath)) return targetPath;
  return null;
}

/**
 * Finds all possible candidate files for a reference.
 * @param {string} ref - The unresolved reference (e.g. "index.js" or "test/e2e/workflow-lifecycle.test.js")
 * @param {string[]} exts - Allowed extensions (e.g. [".js", ".mjs", ".md"])
 * @param {string[]} rootDirs - Directories to search (default: ['.'])
 * @returns {string[]} absolute paths to candidates
 */
export function findCandidates(ref, exts, rootDirs = ['.']) {
  // Normalize ref for matching (always use forward slashes)
  const normRef = ref.replace(/\\/g, '/');
  const candidates = new Set();
  for (const root of rootDirs) {
    for (const file of findFiles(root, {
      filter: name => exts.some(ext => name.endsWith(ext)),
    })) {
      // Normalize file path for matching
      const relFile = path.relative(process.cwd(), file).replace(/\\/g, '/');
      const base = path.basename(relFile);

      if (relFile.endsWith(normRef) || base === normRef) {
        candidates.add(file);
      }
    }
  }
  return Array.from(candidates);
}

