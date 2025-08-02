#!/usr/bin/env node
// scripts/linting/docs/yaml.js
require('module-alias/register');

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const {
  lintHelpersPath,
  lintingConfigPath,
  visualRenderersPath,
  fileDiscoveryPath,
  projectRoot,
  loggerPath
} = require('@paths');

const logger = require(loggerPath);

const {
  loadLintSection,
  parseCliArgs,
} = require(lintHelpersPath);

const { findFiles } = require(fileDiscoveryPath);
const { renderLintOutput } = require(visualRenderersPath);

// Helper to sort object keys by configured field order
function sortByFieldOrder(obj, fieldOrder) {
  const ordered = {};

  // Sort by field order priority (lower numbers = higher priority)
  Object.keys(obj)
    .sort((a, b) => {
      const aOrder = fieldOrder[a] ?? 999; // Default to 999 if not configured
      const bOrder = fieldOrder[b] ?? 999;
      return aOrder - bOrder;
    })
    .forEach(key => {
      ordered[key] = obj[key];
    });

  return ordered;
}

// Process a single YAML file and return formatting issues
function processYamlFile(filePath, fieldOrder) {
  try {
    const original = fs.readFileSync(filePath, 'utf8');
    const documents = yaml.loadAll(original);

    // YAML dump options with controlled formatting
    const yamlOptions = {
      lineWidth: 80,
      noRefs: true,
      quotingType: '"',
      forceQuotes: false,
      sortKeys: false,
      indent: 2
    };

    // Apply field ordering and consistent formatting to each document
    const orderedDocuments = documents
      .filter(doc => doc) // Remove any null/undefined documents
      .map(doc => {
        // Apply field ordering recursively
        const orderedDoc = sortByFieldOrder(doc, fieldOrder);

        // Also apply ordering to nested objects (like scenarios)
        if (orderedDoc.scenarios && Array.isArray(orderedDoc.scenarios)) {
          orderedDoc.scenarios = orderedDoc.scenarios.map(scenario =>
            typeof scenario === 'object' ? sortByFieldOrder(scenario, fieldOrder) : scenario
          );
        }

        return orderedDoc;
      });

    // Convert back to YAML with controlled formatting
    const formatted = orderedDocuments
      .map(doc => yaml.dump(doc, yamlOptions).trim())
      .join('\n---\n') + '\n';

    return { original, formatted, error: null };

  } catch (error) {
    return { original: null, formatted: null, error: error.message };
  }
}

function runLinter(options = {}) {
  const {
    targets = [],
    ignores = [],
    fix = false,
    dryRun = false,
    debug = false,
    filetypes = undefined,
    fieldOrder = {}
  } = options;

  const files = findFiles({
    targets: targets,
    ignores: ignores,
    filetypes,
    debug: debug
  });

  const issues = [];
  const changedFiles = new Set();

  for (const filePath of files) {
    const relPath = path.relative(projectRoot, filePath);
    const result = processYamlFile(filePath, fieldOrder);

    if (result.error) {
      issues.push({
        file: relPath,
        line: 1,
        column: 1,
        message: `YAML parsing error: ${result.error}`,
        rule: 'yaml-format',
        severity: 2, // error
      });
    } else if (result.original !== result.formatted) {
      issues.push({
        file: relPath,
        line: 1,
        column: 1,
        message: 'YAML field ordering or formatting needs correction.',
        rule: 'yaml-format',
        severity: 1, // warning
      });

      if (fix) {
        if (!dryRun) {
          fs.writeFileSync(filePath, result.formatted, 'utf8');
        }
        changedFiles.add(relPath);
      }
    }
  }

  const summary = {
    errorCount: issues.filter(i => i.severity === 2).length,
    warningCount: issues.filter(i => i.severity === 1).length,
    fixedCount: changedFiles.size
  };

  return { issues, summary };
}

if (require.main === module) {
  const { flags, targets } = parseCliArgs(process.argv.slice(2));
  const config = loadLintSection('yaml', lintingConfigPath) || {};

  const finalTargets = targets.length > 0
    ? targets
    : (config.targets || []);
  const ignores = config.excludes || [];
  const filetypes = config.filetypes;
  const fieldOrder = config.field_order || {};

  if (!filetypes) {
    logger.warn('No filetypes specified! Using file-discovery safe defaults.', { context: 'YamlLinter' });
  }

  const { issues, summary } = runLinter({
    targets: finalTargets,
    ignores,
    fix: !!flags.fix,
    dryRun: !!flags.dryRun,
    debug: !!flags.debug,
    filetypes,
    fieldOrder
  });

  renderLintOutput({ issues, summary, flags });

  process.exitCode = summary.errorCount > 0 ? 1 : 0;
}

module.exports = { runLinter };