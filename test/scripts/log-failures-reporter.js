// test/scripts/log-failures-reporter.js
// Mocha reporter that maintains smart test-failures.json logging
// Preserves existing results when running partial test groups
require('module-alias/register');
const Mocha = require('mocha');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { loggerPath } = require('@paths');
const logger = require(loggerPath);

const {
  EVENT_RUN_END,
  EVENT_TEST_FAIL,
  EVENT_TEST_PASS,
  EVENT_TEST_PENDING
} = Mocha.Runner.constants;

function getReportPath() {
  if (process.env.MOCHA_JSON_REPORT_FILE) {
    return path.resolve(process.env.MOCHA_JSON_REPORT_FILE);
  }
  const xdgCacheHome = process.env.XDG_CACHE_HOME || path.join(os.homedir(), '.cache');
  const reportDir = path.join(xdgCacheHome, 'md-to-pdf', 'logs');
  fs.mkdirSync(reportDir, { recursive: true });
  return path.join(reportDir, 'test-failures.json');
}

function loadExistingResults(reportPath) {
  if (!fs.existsSync(reportPath)) {
    return new Map();
  }

  const resultMap = new Map();
  try {
    const content = fs.readFileSync(reportPath, 'utf8');
    const lines = content.trim().split('\n').filter(line => line.trim());

    for (const line of lines) {
      try {
        const result = JSON.parse(line);
        if (result.title && result.file) {
          const key = `${result.file}::${result.title}`;
          resultMap.set(key, result);
        }
      } catch {
        // Skip malformed lines
      }
    }
  } catch {
    // If file is corrupted, start fresh
    logger.debug('Could not load existing test results, starting fresh');
  }

  return resultMap;
}

function writeResults(reportPath, resultMap) {
  const lines = Array.from(resultMap.values())
    .map(result => JSON.stringify(result))
    .join('\n');

  fs.writeFileSync(reportPath, lines + '\n');
}

class LogJsonReporter extends Mocha.reporters.Spec {
  constructor(runner, options) {
    super(runner, options);

    const outputFile = getReportPath();

    // Load existing results to preserve data from other test groups
    const resultMap = loadExistingResults(outputFile);

    runner
      .on(EVENT_TEST_PASS, test => {
        const result = {
          status: 'passed',
          title: test.fullTitle(),
          file: test.file,
          duration: test.duration,
          timestamp: new Date().toISOString()
        };
        const key = `${test.file}::${test.fullTitle()}`;
        resultMap.set(key, result);
      })
      .on(EVENT_TEST_FAIL, (test, err) => {
        const result = {
          status: 'failed',
          title: test.fullTitle(),
          file: test.file,
          error: err.message,
          stack: err.stack,
          timestamp: new Date().toISOString()
        };
        const key = `${test.file}::${test.fullTitle()}`;
        resultMap.set(key, result);
      })
      .on(EVENT_TEST_PENDING, test => {
        const result = {
          status: 'pending',
          title: test.fullTitle(),
          file: test.file,
          timestamp: new Date().toISOString()
        };
        const key = `${test.file}::${test.fullTitle()}`;
        resultMap.set(key, result);
      })
      .on(EVENT_RUN_END, () => {
        writeResults(outputFile, resultMap);
        logger.info(`\nTest report written to: ${outputFile}`);
        logger.debug(`Total results tracked: ${resultMap.size}`, {
          context: 'LogJsonReporter'
        });
      });
  }
}

module.exports = LogJsonReporter;

