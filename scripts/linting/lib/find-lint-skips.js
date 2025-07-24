#!/usr/bin/env node
// scripts/linting/lib/find-lint-skips.js
require('module-alias/register');

const fs = require('fs');
const path = require('path');
const {
  fileDiscoveryPath,
  loggerPath,
  skipSystemPath,
  projectRoot
} = require('@paths');

const { findFiles } = require(fileDiscoveryPath);
const logger = require(loggerPath);
const {
  getAllSkipPatterns,
  getLegacyMigrationMap,
  extractLinterFromMarker,
  isValidSkipMarker,
  loadLinterConfig
} = require(skipSystemPath);

// Use centralized config loader
const loadLintingConfig = loadLinterConfig;

function findSkipsInFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const skips = [];
    const skipPatterns = getAllSkipPatterns();

    lines.forEach((line, lineIndex) => {
      skipPatterns.forEach(pattern => {
        pattern.lastIndex = 0; // Reset regex
        let match;
        while ((match = pattern.exec(line)) !== null) {
          const linterKey = extractLinterFromMarker(match[0]);
          const isStandard = isValidSkipMarker(match[0]);

          skips.push({
            file: path.relative(projectRoot, filePath),
            line: lineIndex + 1,
            match: match[0],
            context: line.trim(),
            linterKey: linterKey || 'unknown',
            isStandard: isStandard,
            needsMigration: !isStandard
          });
        }
      });
    });

    return skips;
  } catch (error) {
    logger.error(`Failed to scan file ${filePath}: ${error.message}`);
    return [];
  }
}

function categorizeSkipsByLinter(skips, config) {
  const categorized = {};
  const migrationNeeded = [];

  // Initialize categories from config
  Object.keys(config).forEach(linterKey => {
    if (linterKey !== 'harness') {
      categorized[linterKey] = [];
    }
  });
  categorized['unknown'] = [];
  categorized['legacy'] = [];

  skips.forEach(skip => {
    if (skip.needsMigration) {
      migrationNeeded.push(skip);
      categorized['legacy'].push(skip);
    } else if (skip.linterKey && categorized[skip.linterKey]) {
      categorized[skip.linterKey].push(skip);
    } else {
      categorized['unknown'].push(skip);
    }
  });

  return { categorized, migrationNeeded };
}

function generateReport(result, config) {
  const { categorized, migrationNeeded } = result;
  const report = {
    summary: {},
    details: categorized,
    migrationNeeded: migrationNeeded,
    linterMapping: {}
  };

  // Build linter mapping from config
  Object.entries(config).forEach(([key, linterConfig]) => {
    if (linterConfig.group && linterConfig.alias) {
      report.linterMapping[key] = {
        group: linterConfig.group,
        alias: linterConfig.alias,
        label: linterConfig.label || key
      };
    }
  });

  // Generate summary statistics
  Object.entries(categorized).forEach(([linter, skips]) => {
    report.summary[linter] = {
      totalSkips: skips.length,
      uniqueFiles: new Set(skips.map(s => s.file)).size,
      skipTypes: new Set(skips.map(s => s.match)).size,
      needsMigration: skips.filter(s => s.needsMigration).length
    };
  });

  return report;
}

function displayReport(report) {
  logger.info('='.repeat(60));
  logger.info('LINT SKIP DISCOVERY REPORT');
  logger.info('='.repeat(60));

  // Summary
  logger.info('\nSUMMARY:');
  logger.info('-'.repeat(40));
  Object.entries(report.summary).forEach(([linter, stats]) => {
    const linterInfo = report.linterMapping[linter] || { group: 'unknown', alias: linter };
    const migrationNote = stats.needsMigration > 0 ? ` (${stats.needsMigration} need migration)` : '';
    logger.info(`${linter.padEnd(12)} (${linterInfo.group}): ${stats.totalSkips} skips in ${stats.uniqueFiles} files${migrationNote}`);
  });

  // Migration needed section
  if (report.migrationNeeded.length > 0) {
    logger.info('\nMIGRATION NEEDED:');
    logger.info('-'.repeat(40));
    logger.warn(`Found ${report.migrationNeeded.length} legacy skip markers that need standardization:`);

    const migrationMap = getLegacyMigrationMap();
    const byPattern = {};

    report.migrationNeeded.forEach(skip => {
      if (!byPattern[skip.match]) byPattern[skip.match] = [];
      byPattern[skip.match].push(skip);
    });

    Object.entries(byPattern).forEach(([pattern, skips]) => {
      const suggested = migrationMap[pattern] || `lint-skip-${pattern.replace(/lint-skip-|lint-disable-|lint-enable-/, '')}`;
      logger.info(`  "${pattern}" ✖ ${skips.length} occurrences`);
      logger.success(`    Suggested: "${suggested}"`);
    });
  }

  // Standard markers section
  logger.info('\nSTANDARD MARKERS:');
  logger.info('-'.repeat(40));

  Object.entries(report.details).forEach(([linter, skips]) => {
    if (skips.length === 0 || linter === 'legacy') return;

    const standardSkips = skips.filter(s => s.isStandard);
    if (standardSkips.length === 0) return;

    const linterInfo = report.linterMapping[linter] || { group: 'unknown', alias: linter };
    logger.info(`\n● ${linter.toUpperCase()} (${linterInfo.group}/${linterInfo.alias}): ${standardSkips.length} standard skips`);

    // Group by file
    const byFile = {};
    standardSkips.forEach(skip => {
      if (!byFile[skip.file]) byFile[skip.file] = [];
      byFile[skip.file].push(skip);
    });

    Object.entries(byFile).forEach(([file, fileSkips]) => {
      logger.detail(`  ${file}: ${fileSkips.length} skips`, { format: 'inline' });
      logger.detail('\n', { format: 'inline' });
    });
  });

  // Recommendations
  logger.info('\nRECOMMENDATIONS:');
  logger.info('-'.repeat(40));
  logger.info('● Run migration to standardize legacy skip markers');
  logger.info('● Use format: lint-skip-<linter-key> for file-level skips');
  logger.info('● Use format: lint-disable-line <linter-key> for line-level skips');
  logger.info('● Consider .skipignore files for permanent exclusions');
  logger.info('● Document skip reasons in comments');
}

function main() {
  logger.info('Discovering lint skip markers across codebase...\n');

  // Load configuration
  const config = loadLintingConfig();

  // Find all files to scan
  const allFiles = findFiles({
    targets: ['.'],
    filetypes: ['.js', '.md', '.yaml', '.json', '.sh'],
    ignores: ['node_modules/**', '.git/**', 'assets/**'],
    respectDocignore: false,
    debug: false
  }).filter(file => !file.endsWith('skip-system.js')); // Exclude pattern registry itself

  logger.info(`Scanning ${allFiles.length} files...`);

  // Scan all files for skip markers
  let allSkips = [];
  allFiles.forEach(file => {
    const skips = findSkipsInFile(file);
    allSkips = allSkips.concat(skips);
  });

  logger.info(`Found ${allSkips.length} skip markers\n`);

  // Categorize and report
  const categorizationResult = categorizeSkipsByLinter(allSkips, config);
  const report = generateReport(categorizationResult, config);

  displayReport(report);

  return report;
}

if (require.main === module) {
  main();
}

module.exports = { main, findSkipsInFile, categorizeSkipsByLinter };
