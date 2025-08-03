#!/usr/bin/env node
// test/analytics/qa-analytics.js
// QA analytics tool for analyzing test brittleness and failure patterns

require('module-alias/register');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { loggerPath } = require('@paths');
const logger = require(loggerPath);

function getTestResultsPath() {
  const xdgDataHome = process.env.XDG_DATA_HOME || path.join(os.homedir(), '.local', 'share');
  return path.join(xdgDataHome, 'md-to-pdf', 'test-analytics', 'test-results.json');
}

function loadTestResults() {
  const resultsPath = getTestResultsPath();

  if (!fs.existsSync(resultsPath)) {
    logger.warn(`No test results data found at ${resultsPath}`);
    return {};
  }

  try {
    const content = fs.readFileSync(resultsPath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    logger.error(`Failed to load test results: ${error.message}`);
    return {};
  }
}

function calculateVolatility(testData) {
  const totalRuns = testData.success_count + testData.fail_count;
  if (totalRuns === 0) return 0;

  const failureRate = testData.fail_count / totalRuns;

  // Volatility classification based on failure rate
  if (failureRate === 0) return 0; // volatility0: stable
  if (failureRate < 0.1) return 1; // volatility1: occasionally flaky
  return 2; // volatility2: frequently unstable
}

function analyzeTestBrittleness(testResults) {
  const analysis = [];

  for (const [testKey, data] of Object.entries(testResults)) {
    const totalRuns = data.success_count + data.fail_count;
    if (totalRuns === 0) continue;

    const failureRate = data.fail_count / totalRuns;
    const volatility = calculateVolatility(data);
    const daysSinceFirstSeen = Math.floor(
      (new Date() - new Date(data.first_seen)) / (1000 * 60 * 60 * 24)
    );

    analysis.push({
      test_key: testKey,
      failure_rate: failureRate,
      volatility,
      total_runs: totalRuns,
      fail_count: data.fail_count,
      last_status: data.last_status,
      last_run: data.last_run,
      days_tracked: daysSinceFirstSeen,
      last_error: data.last_error || null
    });
  }

  return analysis.sort((a, b) => b.failure_rate - a.failure_rate);
}

function generateReport(analysis, options = {}) {
  const limit = options.limit || 20;
  const minRuns = options.minRuns || 5;

  logger.info('\n--- QA Analytics Report ---\n');

  // Filter and get top brittle tests
  const brittleTests = analysis
    .filter(test => test.total_runs >= minRuns)
    .slice(0, limit);

  if (brittleTests.length === 0) {
    logger.info('No test data available (minimum runs not met)');
    return;
  }

  logger.info(`Top ${brittleTests.length} Most Brittle Tests (min ${minRuns} runs):\n`);

  brittleTests.forEach((test, index) => {
    const volatilityLabels = ['stable', 'flaky', 'unstable'];
    const status = test.failure_rate > 0.5 ? '✖' :
      test.failure_rate > 0.1 ? '○' : '●';

    logger.info(`${index + 1}. ${status} ${test.test_key}`);
    logger.info(`   Failure Rate: ${(test.failure_rate * 100).toFixed(1)}% (${test.fail_count}/${test.total_runs})`);
    logger.info(`   Volatility: ${volatilityLabels[test.volatility]} (level ${test.volatility})`);
    logger.info(`   Last Status: ${test.last_status} | Tracked: ${test.days_tracked} days`);
    if (test.last_error) {
      logger.info(`   Last Error: ${test.last_error.substring(0, 80)}...`);
    }
    logger.info('');
  });

  // Summary statistics
  const totalTests = analysis.length;
  const stableTests = analysis.filter(t => t.volatility === 0).length;
  const flakyTests = analysis.filter(t => t.volatility === 1).length;
  const unstableTests = analysis.filter(t => t.volatility === 2).length;

  logger.info('--- Summary Statistics ---');
  logger.info(`Total tracked tests: ${totalTests}`);
  logger.info(`Stable (volatility0): ${stableTests} (${((stableTests/totalTests)*100).toFixed(1)}%)`);
  logger.info(`Flaky (volatility1): ${flakyTests} (${((flakyTests/totalTests)*100).toFixed(1)}%)`);
  logger.info(`Unstable (volatility2): ${unstableTests} (${((unstableTests/totalTests)*100).toFixed(1)}%)`);
}

function main() {
  const args = process.argv.slice(2);
  const options = {
    limit: 20,
    minRuns: 5
  };

  // Parse simple args
  const limitIndex = args.indexOf('--limit');
  if (limitIndex !== -1 && args[limitIndex + 1]) {
    options.limit = parseInt(args[limitIndex + 1], 10);
  }

  const minRunsIndex = args.indexOf('--min-runs');
  if (minRunsIndex !== -1 && args[minRunsIndex + 1]) {
    options.minRuns = parseInt(args[minRunsIndex + 1], 10);
  }

  if (args.includes('--help')) {
    logger.info('Usage: node test/scripts/qa-analytics.js [options]');
    logger.info('Options:');
    logger.info('  --limit N        Show top N brittle tests (default: 20)');
    logger.info('  --min-runs N     Minimum runs to include test (default: 5)');
    logger.info('  --help           Show this help');
    return;
  }

  try {
    const testResults = loadTestResults();
    const analysis = analyzeTestBrittleness(testResults);
    generateReport(analysis, options);
  } catch (error) {
    logger.error(`Analytics failed: ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  loadTestResults,
  calculateVolatility,
  analyzeTestBrittleness,
  generateReport
};
