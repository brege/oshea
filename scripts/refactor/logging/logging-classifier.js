#!/usr/bin/env node
// scripts/refactor/logging/logging-classifier.js

const fs = require('fs');
const path = require('path');

// Use centralized path management
require('module-alias/register');
const { srcRoot } = require('@paths');

/**
 * Classifies logging "species" from probe results.
 * @param {Array} report - Array of per-file results from probe-logging.js
 * @returns {Object} speciesMap
 */
function classifyLogging(report) {
  const speciesMap = {};

  function getSpecies(hit) {
    // For console: e.g. console.log
    // For chalk: e.g. console.log(chalk.red)
    if (hit.type === 'console' && /chalk\.\w+/.test(hit.code)) {
      const chalkMatch = hit.code.match(/chalk\.(\w+)/);
      return `${hit.method}(chalk.${chalkMatch ? chalkMatch[1] : '???'})`;
    }
    return hit.method;
  }

  for (const fileReport of report) {
    for (const hit of fileReport.hits || []) {
      const species = getSpecies(hit);
      if (!speciesMap[species]) {
        speciesMap[species] = { count: 0, examples: [] };
      }
      speciesMap[species].count += 1;
      if (speciesMap[species].examples.length < 3) {
        speciesMap[species].examples.push({
          file: fileReport.file,
          line: hit.line,
          code: hit.code
        });
      }
    }
  }
  return speciesMap;
}

// Suggest canonical logger mapping for each species
function suggestLogger(species) {
  if (/console\.error/.test(species)) return 'logger.error';
  if (/console\.warn/.test(species)) return 'logger.warn';
  if (/chalk\.red/.test(species)) return 'logger.error';
  if (/chalk\.yellow/.test(species)) return 'logger.warn';
  if (/chalk\.gray/.test(species)) return 'logger.detail';
  if (/chalk\.blueBright/.test(species)) return 'logger.info';
  if (/chalk\.bold/.test(species)) return 'logger.info';
  return 'logger.info';
}

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);
  const reportPath = args[0]
    ? path.resolve(process.cwd(), args[0])
    : path.join(srcRoot, '..', 'logging-probe-report.json');
  let report;
  try {
    report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  } catch (e) {
    console.error('Could not read probe report:', reportPath);
    process.exit(1);
  }
  const speciesMap = classifyLogging(report);

  console.log('\n=== Logging Species Classifier ===\n');
  Object.entries(speciesMap)
    .sort((a, b) => b[1].count - a[1].count)
    .forEach(([species, { count, examples }]) => {
      console.log(`Species: ${species}`);
      console.log(`  Count: ${count}`);
      console.log(`  Suggested mapping: ${suggestLogger(species)}`);
      examples.forEach(ex =>
        console.log(`    Example: ${ex.file}:${ex.line}  ${ex.code}`)
      );
      console.log('');
    });

  // Write mapping JSON for batch replacement
  const mapping = {};
  for (const species in speciesMap) {
    mapping[species] = suggestLogger(species);
  }
  const mappingPath = path.join(path.dirname(reportPath), 'logging-species-mapping.json');
  fs.writeFileSync(mappingPath, JSON.stringify(mapping, null, 2));
  console.log(`Wrote: ${mappingPath}`);
}

module.exports = { classifyLogging, suggestLogger };

