#!/usr/bin/env node
// scripts/linting/docs/yaml.js
require('module-alias/register');

const fs = require('node:fs');
const path = require('node:path');
const YAML = require('yaml');
const {
  lintHelpersPath,
  lintingConfigPath,
  visualRenderersPath,
  fileDiscoveryPath,
  projectRoot,
  loggerPath,
} = require('@paths');

const logger = require(loggerPath);

const { loadLintSection, parseCliArgs } = require(lintHelpersPath);

const { findFiles } = require(fileDiscoveryPath);
const { renderLintOutput } = require(visualRenderersPath);

// Process a single YAML file and return formatting issues
function processYamlFile(filePath, fieldOrder, _yamlOptions = {}) {
  try {
    logger.debug(`Processing YAML file: ${filePath}`, {
      context: 'YamlLinter',
    });
    const original = fs.readFileSync(filePath, 'utf8');

    // Parse all documents while preserving comments and structure
    const docs = YAML.parseAllDocuments(original);
    logger.debug(`Parsed ${docs.length} YAML documents`, {
      context: 'YamlLinter',
    });

    // Default YAML formatting options (can be overridden by config)
    // eslint-disable-next-line no-unused-vars
    const _defaultYamlOptions = {
      lineWidth: 80,
      indent: 2,
      quotingType: '"',
      forceQuotes: false,
      blockQuote: 'literal',
      flowCollectionPadding: true,
      commentString: (comment) => comment.comment,
    };

    // Filter out empty documents that are just separators
    const validDocs = docs.filter((doc) => {
      // Check if document has actual content
      return (
        doc?.contents &&
        ((doc.contents.items && doc.contents.items.length > 0) ||
          (doc.contents.value !== null && doc.contents.value !== undefined))
      );
    });
    logger.debug(`Found ${validDocs.length} valid documents after filtering`, {
      context: 'YamlLinter',
    });

    // Process each valid document
    const processedDocs = validDocs.map((doc) => {
      try {
        // Apply field ordering by sorting existing items (preserves comments)
        if (doc.contents?.items && Object.keys(fieldOrder).length > 0) {
          logger.debug(
            `Applying field ordering to ${doc.contents.items.length} items`,
            { context: 'YamlLinter' },
          );
          doc.contents.items.sort((a, b) => {
            const aKey = a.key?.value;
            const bKey = b.key?.value;
            const aOrder = fieldOrder[aKey] ?? 999;
            const bOrder = fieldOrder[bKey] ?? 999;
            return aOrder - bOrder;
          });
        }

        // Strip unnecessary quotes from scalar values while preserving comments
        function stripQuotesFromNode(node) {
          if (node?.items) {
            // Handle maps and sequences
            node.items.forEach((item) => {
              if (item.key) stripQuotesFromNode(item.key);
              if (item.value) stripQuotesFromNode(item.value);
            });
          } else if (
            node?.type === 'QUOTE_DOUBLE' ||
            node?.type === 'QUOTE_SINGLE'
          ) {
            // Check if quotes are unnecessary
            const value = node.value;
            if (
              typeof value === 'string' &&
              /^[a-zA-Z0-9\-_./]+$/.test(value)
            ) {
              node.type = 'PLAIN';
            }
          }
        }

        stripQuotesFromNode(doc.contents);

        return doc;
      } catch (error) {
        logger.warn(
          `Failed to process document in ${filePath}: ${error.message}`,
        );
        return doc;
      }
    });

    // Convert back to YAML string preserving document structure
    let formatted;
    if (processedDocs.length === 1) {
      // Single document file - check if original had document separators
      const hasLeadingSeparator = original.trim().startsWith('---');
      const hasTrailingSeparator =
        original.includes('\n---') || original.includes('\n...');

      if (hasLeadingSeparator || hasTrailingSeparator) {
        // Original had separators, preserve them
        formatted = `---\n${processedDocs[0].toString()}`;
      } else {
        // No separators in original
        formatted = processedDocs[0].toString();
      }
    } else if (processedDocs.length > 1) {
      // Multi-document file - join documents with single separator
      formatted = processedDocs
        .map((doc, index) => {
          let docString = doc.toString().trim();
          // Remove leading --- from documents after the first (they already have it)
          if (index > 0 && docString.startsWith('---\n')) {
            docString = docString.substring(4); // Remove '---\n'
          }
          return docString;
        })
        .join('\n---\n');
    } else {
      // No valid documents
      formatted = '';
    }

    // Ensure file ends with newline
    if (!formatted.endsWith('\n')) {
      formatted += '\n';
    }

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
    fieldOrder = {},
    yamlOptions = {},
  } = options;

  const files = findFiles({
    targets: targets,
    ignores: ignores,
    filetypes,
    debug: debug,
  });

  const issues = [];
  const changedFiles = new Set();

  for (const filePath of files) {
    const relPath = path.relative(projectRoot, filePath);
    const result = processYamlFile(filePath, fieldOrder, yamlOptions);

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
    errorCount: issues.filter((i) => i.severity === 2).length,
    warningCount: issues.filter((i) => i.severity === 1).length,
    fixedCount: changedFiles.size,
  };

  return { issues, summary };
}

if (require.main === module) {
  const { flags, targets } = parseCliArgs(process.argv.slice(2));
  const config = loadLintSection('yaml', lintingConfigPath) || {};

  // Set global debug mode
  logger.setDebugMode(!!flags.debug);

  const finalTargets = targets.length > 0 ? targets : config.targets || [];
  const ignores = config.excludes || [];
  const filetypes = config.filetypes;
  const fieldOrder = config.field_order || {};
  const yamlOptions = config.yaml_options || {};

  if (!filetypes) {
    logger.warn('No filetypes specified! Using file-discovery safe defaults.', {
      context: 'YamlLinter',
    });
  }

  logger.debug(`YAML linter starting with ${finalTargets.length} targets`, {
    context: 'YamlLinter',
  });

  const { issues, summary } = runLinter({
    targets: finalTargets,
    ignores,
    fix: !!flags.fix,
    dryRun: !!flags.dryRun,
    debug: !!flags.debug,
    filetypes,
    fieldOrder,
    yamlOptions,
  });

  renderLintOutput({ issues, summary, flags });

  process.exitCode = summary.errorCount > 0 ? 1 : 0;
}

module.exports = { runLinter };
