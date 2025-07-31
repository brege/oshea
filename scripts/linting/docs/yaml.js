#!/usr/bin/env node
// scripts/linting/docs/yaml.js

require('module-alias/register');

const fs = require('fs');
const yaml = require('js-yaml');
const {
  fileHelpersPath,
  loggerPath,
  lintingConfigPath
} = require('@paths');

const logger = require(loggerPath);
const { findFilesArray, getDefaultGlobIgnores } = require(fileHelpersPath);

// Load field ordering configuration
const lintingConfig = yaml.load(fs.readFileSync(lintingConfigPath, 'utf8'));
const fieldOrder = lintingConfig.yaml?.field_order || {};

const inputs = process.argv.slice(2);
if (inputs.length === 0) {
  logger.error('Usage: node yaml.js <file-or-glob> [...]');
  process.exit(1);
}

// Helper to sort object keys by configured field order
function sortByFieldOrder(obj) {
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

// Process a single YAML file
function processFile(yamlFilePath) {
  try {
  // Read and parse the YAML file
    const yamlContent = fs.readFileSync(yamlFilePath, 'utf8');
    const documents = yaml.loadAll(yamlContent);

    // YAML dump options with controlled formatting
    const yamlOptions = {
      lineWidth: 80,        // 80 (caused >- folding style for long strings)
      noRefs: true,         // false (could create &ref anchors)
      quotingType: '"',     // "'" (single quotes by default)
      forceQuotes: false,   // false (only quote when necessary - good!)
      sortKeys: false,      // true (would alphabetize keys, breaking logical order)
      indent: 2             // 2 (this was fine)
    };

    // Apply field ordering and consistent formatting to each document
    const orderedDocuments = documents
      .filter(doc => doc) // Remove any null/undefined documents
      .map(doc => {
      // Apply field ordering recursively
        const orderedDoc = sortByFieldOrder(doc);

        // Also apply ordering to nested objects (like scenarios)
        if (orderedDoc.scenarios && Array.isArray(orderedDoc.scenarios)) {
          orderedDoc.scenarios = orderedDoc.scenarios.map(scenario =>
            typeof scenario === 'object' ? sortByFieldOrder(scenario) : scenario
          );
        }

        return orderedDoc;
      });

    // Convert back to YAML with controlled formatting
    const outputYaml = orderedDocuments
      .map(doc => yaml.dump(doc, yamlOptions).trim())
      .join('\n---\n');

    // Write back to file
    fs.writeFileSync(yamlFilePath, outputYaml + '\n');

    logger.info(`Processed ${yamlFilePath}`);

  } catch (error) {
    logger.error(`Error processing ${yamlFilePath}: ${error.message}`);
  }
}

const ignores = getDefaultGlobIgnores();
const files = findFilesArray(inputs, {
  filter: name => name.endsWith('.yaml'),
  ignores
});

files.forEach(processFile);
