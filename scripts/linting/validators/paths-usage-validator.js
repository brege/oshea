#!/usr/bin/env node
// scripts/linting/validators/paths-usage-validator.js

require('module-alias/register');

const fs = require('fs');
const path = require('path');
const acorn = require('acorn');
const walk = require('acorn-walk');

const {
  lintHelpersPath,
  lintingConfigPath,
  formattersPath,
  projectRoot,
} = require('@paths');

const paths = require('@paths');
const { loadLintSection, findFilesArray, parseCliArgs } = require(lintHelpersPath);
const { renderLintOutput } = require(formattersPath);

const pathsPath = (() => {
  try {
    if (typeof require('@paths').pathsPath === 'string') return require('@paths').pathsPath;
  } catch (_e) {
    void 0;
  }
  return path.join(projectRoot, 'paths.js');
})();

const REQUIRE_REGEX = /const\s+(\w+)\s*=\s*require\(['"](.+?)['"]\)/g;

/**
 * Recursively build dependency graph for all nested registries required by entryPath.
 * @param {string} entryPath Absolute path to a registry file (e.g. paths.js)
 * @param {Set<string>} seenFiles Tracks processed files to avoid cycles
 * @returns {Map<string, string[]>} Map: variable name -> array of dependent variable names
 */
function buildFullDependencyGraph(entryPath, seenFiles = new Set()) {
  if (seenFiles.has(entryPath)) return new Map();
  seenFiles.add(entryPath);

  const source = fs.readFileSync(entryPath, 'utf8');
  const ast = acorn.parse(source, { ecmaVersion: 2020, sourceType: 'module' });

  const depGraph = new Map();

  const nestedRegistryFiles = [];

  let m;
  while ((m = REQUIRE_REGEX.exec(source)) !== null) {
    const [, varName, relPath] = m;
    if (!relPath.startsWith('.') && !relPath.startsWith('/')) {
      continue;
    }
    const importedFile = path.resolve(path.dirname(entryPath), relPath);
    let importedFileResolved = importedFile;
    if (!fs.existsSync(importedFile) && fs.existsSync(importedFile + '.js')) {
      importedFileResolved = importedFile + '.js';
    }
    if (fs.existsSync(importedFileResolved)) {
      nestedRegistryFiles.push(importedFileResolved);
    }
  }

  walk.simple(ast, {
    VariableDeclaration(node) {
      for (const decl of node.declarations) {
        if (!decl.id || !decl.init) continue;
        if (decl.id.type !== 'Identifier') continue;
        const varName = decl.id.name;

        if (
          decl.init.type === 'CallExpression' &&
          decl.init.callee.type === 'MemberExpression' &&
          decl.init.callee.object.name === 'path' &&
          decl.init.callee.property.name === 'join'
        ) {
          const deps = decl.init.arguments
            .filter(arg => arg.type === 'Identifier')
            .map(arg => arg.name);
          depGraph.set(varName, deps);
          continue;
        }

        depGraph.set(varName, []);
      }
    }
  });

  for (const nestedFile of nestedRegistryFiles) {
    const nestedDepGraph = buildFullDependencyGraph(nestedFile, seenFiles);
    for (const [key, deps] of nestedDepGraph.entries()) {
      if (depGraph.has(key)) continue;
      depGraph.set(key, deps);
    }
  }

  return depGraph;
}

/** Checks if a string is a valid JS identifier */
function isValidImportKey(key) {
  return /^[$A-Z_][0-9A-Z_$]*$/i.test(key);
}

/**
 * Propagate used keys *backwards* through dependency graph.
 * If key A depends on B, usage of A implies usage of B too.
 * @param {Set<string>} usedKeys
 * @param {Map<string, string[]>} depGraph
 */
function propagateUsage(usedKeys, depGraph) {
  const stack = [...usedKeys];
  while (stack.length) {
    const key = stack.pop();
    for (const [parentKey, deps] of depGraph.entries()) {
      if (deps.includes(key) && !usedKeys.has(parentKey)) {
        usedKeys.add(parentKey);
        stack.push(parentKey);
      }
    }
  }
}

function* walkRegistry(obj, prefix = '') {
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      yield* walkRegistry(value, fullKey);
    } else {
      yield fullKey;
    }
  }
}

function runValidator(options = {}) {
  const {
    targets = [],
    excludes = [],
    debug = false,
  } = options;

  const allKeys = new Set([...walkRegistry(paths)]);

  if (debug) {
    console.log(`[DEBUG] Found ${allKeys.size} exported keys in @paths.`);
  }

  const depGraph = buildFullDependencyGraph(pathsPath);

  if (debug) {
    console.log(`[DEBUG] Built dependency graph with ${depGraph.size} entries.`);
  }

  const filesToScan = findFilesArray(targets.length ? targets : ['src', 'scripts', '*.js'], {
    ignores: excludes,
    debug,
  });

  if (debug) {
    console.log(`[DEBUG] Scanning ${filesToScan.length} files for imports of @paths.`);
  }

  const usedKeys = new Set();
  const invalidImports = [];

  const requireRegex = /(?:const|let|var)\s*{([^}]+)}\s*=\s*require\(['"]@paths['"]\)/g;
  const importRegex = /import\s*{([^}]+)}\s*from\s*['"]@paths['"]/g;

  for (const file of filesToScan) {
    let content;
    try {
      content = fs.readFileSync(file, 'utf8');
    } catch (e) {
      if (debug) console.warn(`[DEBUG] Failed to read ${file}: ${e.message}`);
      continue;
    }
    const matches = [];
    let m;
    while ((m = requireRegex.exec(content)) !== null) matches.push(m[1]);
    while ((m = importRegex.exec(content)) !== null) matches.push(m[1]);

    for (const match of matches) {
      const keys = match
        .split(',')
        .map(k => k.trim())
        .filter(k => k && isValidImportKey(k));
      for (const key of keys) {
        if (!allKeys.has(key)) {
          invalidImports.push({ file, key });
          if (debug) console.log(`[DEBUG] Invalid import '${key}' in ${file}`);
        } else {
          usedKeys.add(key);
          if (debug) console.log(`[DEBUG] Valid import '${key}' in ${file}`);
        }
      }
    }
  }

  propagateUsage(usedKeys, depGraph);

  const unusedKeys = [...allKeys].filter(k => !usedKeys.has(k));

  const issues = [];
  const results = [];

  for (const { file, key } of invalidImports) {
    issues.push({
      file,
      message: `Invalid @paths import: '${key}' is not exported in paths.js or nested registries.`,
      rule: 'invalid-paths-import',
      severity: 2,
    });
  }

  for (const key of unusedKeys) {
    issues.push({
      file: 'paths.js',
      message: `Unused exported path: '${key}' is defined but never used or imported anywhere.`,
      rule: 'unused-path-export',
      severity: 1,
    });
  }

  const summary = {
    errorCount: issues.filter(i => i.severity === 2).length,
    warningCount: issues.filter(i => i.severity === 1).length,
    fixedCount: 0,
  };

  return { summary, issues, results };
}

if (require.main === module) {
  const { flags, targets } = parseCliArgs(process.argv.slice(2));
  const config = loadLintSection('validate-paths-usage', lintingConfigPath) || {};
  const excludes = flags.force ? [] : (config.ignores || []);

  const { summary, issues, results } = runValidator({
    targets,
    excludes,
    config,
    debug: flags.debug,
  });

  renderLintOutput({ summary, issues, results, flags });

  process.exitCode = summary.errorCount > 0 ? 1 : 0;
}

module.exports = { runValidator };
