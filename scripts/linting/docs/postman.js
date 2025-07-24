#!/usr/bin/env node
// scripts/linting/docs/postman.js

require('module-alias/register');

const fs = require('fs');
const path = require('path');
const { minimatch } = require('minimatch');
const {
  lintHelpersPath,
  lintingConfigPath,
  visualRenderersPath,
  fileDiscoveryPath,
  skipSystemPath,
  projectRoot,
  loggerPath
} = require('@paths');

const { parseCliArgs, loadLintSection } = require(lintHelpersPath);
const { renderLintOutput } = require(visualRenderersPath);
const { findFiles } = require(fileDiscoveryPath);
const logger = require(loggerPath);
const { shouldSkipFile } = require(skipSystemPath);

// Using centralized skip system - no more hardcoded constants needed

// File registry for fast lookup instead of repeated filesystem scans
class FileRegistry {
  constructor() {
    this.filesByBasename = new Map(); // basename -> [full paths]
    this.filesByPath = new Map();     // relative path -> full path
    this.built = false;
  }

  build(filetypes, rootDirs = ['.', 'src', 'plugins', 'scripts', 'test']) {
    if (this.built) return;

    const allFiles = findFiles({
      targets: rootDirs,
      fileFilter: name => filetypes.some(ext => name.endsWith(ext)),
    });

    for (const file of allFiles) {
      const relPath = path.relative(projectRoot, file).replace(/\\/g, '/');
      const basename = path.basename(relPath);

      // Index by basename
      if (!this.filesByBasename.has(basename)) {
        this.filesByBasename.set(basename, []);
      }
      this.filesByBasename.get(basename).push(file);

      // Index by relative path
      this.filesByPath.set(relPath, file);
    }

    this.built = true;
  }

  findCandidates(ref) {
    const normRef = ref.replace(/\\/g, '/');
    const candidates = new Set();

    // Check exact relative path match
    if (this.filesByPath.has(normRef)) {
      candidates.add(this.filesByPath.get(normRef));
    }

    // Check basename match
    const basename = path.basename(normRef);
    if (this.filesByBasename.has(basename)) {
      for (const file of this.filesByBasename.get(basename)) {
        const relPath = path.relative(projectRoot, file).replace(/\\/g, '/');
        if (relPath.endsWith(normRef)) {
          candidates.add(file);
        }
      }
    }

    return Array.from(candidates);
  }
}

// Global file registry instance
let fileRegistry = null;

// Cache remark imports to avoid repeated dynamic imports
let remarkModule = null;
let visitParentsModule = null;

// Initialize remark modules once
async function initializeRemark() {
  if (!remarkModule || !visitParentsModule) {
    const [{ remark }, { visitParents }] = await Promise.all([
      import('remark'),
      import('unist-util-visit-parents')
    ]);
    remarkModule = remark;
    visitParentsModule = visitParents;
  }
  return { remark: remarkModule, visitParents: visitParentsModule };
}

function isReferenceExcluded(ref, rules) {
  const rel = ref.replace(/\\/g, '/');
  const patterns = rules.excludes || [];
  return patterns.some(pattern => minimatch(rel, pattern));
}

function isAllowedExtension(ref, rules) {
  const allowed = rules.filetypes || [];
  return allowed.some(ext => ref.endsWith(ext));
}

function isSkipLink(ref, rules) {
  const patterns = rules.skip_link_patterns || [];
  return patterns.some(pattern => minimatch(ref, pattern));
}

function containsGlobPattern(ref) {
  return /[\][*?{}]/.test(ref);
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

function buildLinksEnabledMap(lines) {
  let enabled = true;
  return lines.map(line => {
    if (line.includes('lint-disable postman')) enabled = false;
    if (line.includes('lint-enable postman')) enabled = true;
    return enabled;
  });
}

function isLineAlreadyLinked(line, rel) {
  const linkRegex = /\[[^\]]*]\(([^)]+)\)/g;
  return [...line.matchAll(linkRegex)].some(m => {
    const target = m[1].replace(/\\/g, '/');
    return target === rel || target.endsWith('/' + path.basename(rel));
  });
}

async function probeMarkdownFile(mdFile, rules) {
  // Check if file should be skipped based on .skipignore files
  if (shouldSkipFile(mdFile, 'postman')) {
    return [];
  }

  const { remark, visitParents } = await initializeRemark();

  const content = fs.readFileSync(mdFile, 'utf8');
  const lines = content.split('\n');
  const linkStatus = buildLinksEnabledMap(lines);
  const tree = await remark().parse(content);

  const results = [];

  visitParents(tree, (node, ancestors) => {
    const lineNum = node.position?.start.line;
    const lineContent = lines[lineNum - 1] || '';
    const skip = !linkStatus[lineNum - 1];
    const inTable = ancestors.some(a => a.type?.startsWith('table'));
    const inCode = ancestors.some(a => a.type === 'code');

    if (skip || inTable || inCode) return;

    if (node.type === 'link') {
      const url = node.url.split('#')[0];
      if (!url || url.startsWith('http')) return;
      if (
        containsGlobPattern(url) ||
        isReferenceExcluded(url, rules) ||
        isSkipLink(url, rules)
      ) return;

      const resolved = resolveReference(mdFile, url, rules.filetypes);
      results.push({
        file: mdFile,
        line: lineNum,
        type: 'link',
        target: url,
        resolved: !!resolved,
        context: lineContent,
      });
    }

    if (node.type === 'inlineCode') {
      if (
        ancestors.some(a => a.type === 'link') ||
        node.value.includes(' ') ||
        containsGlobPattern(node.value) ||
        isReferenceExcluded(node.value, rules) ||
        isSkipLink(node.value, rules)
      ) return;

      const resolved = resolveReference(mdFile, node.value, rules.filetypes);
      results.push({
        file: mdFile,
        line: lineNum,
        type: 'inlineCode',
        target: node.value,
        resolved: !!resolved,
        context: lineContent,
      });
    }
  });

  return results;
}

async function runLinter(options = {}) {
  const {
    targets = [],
    fix = false,
    dryRun = false,
    debug = false,
    config = {}
  } = options;

  const rules = config;
  const sourceExts = ['.md', '.markdown'];

  // Build file registry once at startup
  if (!fileRegistry) {
    fileRegistry = new FileRegistry();
    fileRegistry.build(rules.filetypes || ['.js', '.md', '.json', '.yaml']);
  }

  const mdFiles = findFiles({
    targets: targets.length > 0 ? targets : (rules.targets || []),
    fileFilter: (filename) => sourceExts.some(ext => filename.endsWith(ext)),
    ignores: rules.excludes || [],
    respectDocignore: true,
    skipTag: 'lint-skip-file postman',
    debug: debug
  });

  const issues = [];
  let fixedCount = 0;

  for (const file of mdFiles) {
    const relFile = path.relative(projectRoot, file);
    const results = await probeMarkdownFile(file, rules);

    for (const r of results) {
      if (r.resolved) continue;

      if (!isAllowedExtension(r.target, rules)) continue;

      const candidates = fileRegistry.findCandidates(r.target);
      const relCandidates = candidates.map(c =>
        path.relative(path.dirname(file), c).replace(/\\/g, '/')
      );

      if (candidates.length === 1 && r.type === 'inlineCode') {
        const rel = relCandidates[0];
        const lines = fs.readFileSync(file, 'utf8').split('\n');
        const oldLine = lines[r.line - 1] || '';
        if (isLineAlreadyLinked(oldLine, rel)) continue;

        const replacement = oldLine.replace(
          '`' + r.target + '`',
          '[`' + r.target + '`](' + rel + ')'
        );

        if (fix) {
          if (!dryRun) {
            lines[r.line - 1] = replacement;
            fs.writeFileSync(file, lines.join('\n'), 'utf8');
          }
          fixedCount++;
        } else {
          issues.push({
            file: relFile,
            line: r.line,
            rule: 'fixable-link',
            severity: 1,
            message: `Resolvable reference: '${r.target}' → '${rel}'`,
          });
        }
        continue;
      }

      if (candidates.length > 1) {
        issues.push({
          file: relFile,
          line: r.line,
          rule: 'degenerate-link',
          severity: 2,
          message: `Degenerate match: '${r.target}' resolves to multiple files.`,
          candidates: relCandidates,
        });
        continue;
      }

      issues.push({
        file: relFile,
        line: r.line,
        rule: 'orphan-link',
        severity: 2,
        message: `Orphan reference: '${r.target}' not found.`,
      });
    }
  }

  const summary = {
    errorCount: issues.filter(i => i.severity === 2).length,
    warningCount: issues.filter(i => i.severity === 1).length,
    fixedCount: fixedCount
  };

  return { issues, summary, results: [] };
}

if (require.main === module) {
  (async () => {
    const { flags, targets } = parseCliArgs(process.argv.slice(2));

    // Set global debug mode
    logger.setDebugMode(!!flags.debug);

    const config = loadLintSection('doc-links', lintingConfigPath) || {};

    const { issues, summary } = await runLinter({
      targets: targets.length > 0 ? targets : config.targets,
      fix: !!flags.fix,
      dryRun: !!flags.dryRun,
      force: !!flags.force,
      debug: !!flags.debug,
      config,
    });

    renderLintOutput({ issues, summary, flags });

    process.exitCode = summary.errorCount > 0 ? 1 : 0;
  })();
}

module.exports = { runLinter };
