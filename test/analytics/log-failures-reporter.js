// test/analytics/log-failures-reporter.js
// Mocha reporter that maintains smart test-failures.json logging
// Preserves existing results when running partial test groups
require('module-alias/register');
const Mocha = require('mocha');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { loggerPath } = require('@paths');
const logger = require(loggerPath);

const { EVENT_RUN_END, EVENT_TEST_FAIL, EVENT_TEST_PASS, EVENT_TEST_PENDING } =
  Mocha.Runner.constants;

function getReportPath() {
  if (process.env.MOCHA_JSON_REPORT_FILE) {
    return path.resolve(process.env.MOCHA_JSON_REPORT_FILE);
  }
  const xdgDataHome =
    process.env.XDG_DATA_HOME || path.join(os.homedir(), '.local', 'share');
  const reportDir = path.join(xdgDataHome, 'oshea', 'test-analytics');
  fs.mkdirSync(reportDir, { recursive: true });
  return path.join(reportDir, 'test-results.json');
}

function loadExistingResults(reportPath) {
  if (!fs.existsSync(reportPath)) {
    return new Map();
  }

  const resultMap = new Map();
  try {
    const content = fs.readFileSync(reportPath, 'utf8');

    // Handle both old NDJSON format and new JSON format
    if (content.trim().startsWith('{') && !content.includes('\n{')) {
      // New JSON format
      const data = JSON.parse(content);
      for (const [key, value] of Object.entries(data)) {
        resultMap.set(key, value);
      }
    } else {
      // Legacy NDJSON format - migrate to new structure
      const lines = content
        .trim()
        .split('\n')
        .filter((line) => line.trim());
      for (const line of lines) {
        try {
          const result = JSON.parse(line);
          if (result.title && result.file) {
            const key = `${result.file}::${result.title}`;
            const existing = resultMap.get(key) || {
              success_count: 0,
              fail_count: 0,
              first_seen: result.timestamp,
              last_run: result.timestamp,
              last_status: result.status,
              last_duration: result.duration || 0,
            };

            // Update counts based on status
            if (result.status === 'passed') {
              existing.success_count++;
            } else if (result.status === 'failed') {
              existing.fail_count++;
            }

            // Update temporal data if this entry is newer
            if (result.timestamp > existing.last_run) {
              existing.last_run = result.timestamp;
              existing.last_status = result.status;
              existing.last_duration = result.duration || 0;
            }

            resultMap.set(key, existing);
          }
        } catch {
          // Skip malformed lines
        }
      }
    }
  } catch {
    // If file is corrupted, start fresh
    logger.debug('Could not load existing test results, starting fresh');
  }

  return resultMap;
}

function writeResults(reportPath, resultMap) {
  const data = {};
  for (const [key, value] of resultMap.entries()) {
    data[key] = value;
  }

  fs.writeFileSync(reportPath, JSON.stringify(data, null, 2));
}

class LogJsonReporter extends Mocha.reporters.Spec {
  constructor(runner, options) {
    super(runner, options);

    const outputFile = getReportPath();

    // Load existing results to preserve data from other test groups
    const resultMap = loadExistingResults(outputFile);

    runner
      .on(EVENT_TEST_PASS, (test) => {
        const key = `${test.file}::${test.fullTitle()}`;
        const timestamp = new Date().toISOString();
        const existing = resultMap.get(key) || {
          success_count: 0,
          fail_count: 0,
          first_seen: timestamp,
          last_run: timestamp,
          last_status: 'passed',
          last_duration: test.duration || 0,
        };

        existing.success_count++;
        existing.last_run = timestamp;
        existing.last_status = 'passed';
        existing.last_duration = test.duration || 0;

        resultMap.set(key, existing);
      })
      .on(EVENT_TEST_FAIL, (test, err) => {
        const key = `${test.file}::${test.fullTitle()}`;
        const timestamp = new Date().toISOString();
        const existing = resultMap.get(key) || {
          success_count: 0,
          fail_count: 0,
          first_seen: timestamp,
          last_run: timestamp,
          last_status: 'failed',
          last_duration: test.duration || 0,
          last_error: err.message,
        };

        existing.fail_count++;
        existing.last_run = timestamp;
        existing.last_status = 'failed';
        existing.last_duration = test.duration || 0;
        existing.last_error = err.message;

        resultMap.set(key, existing);
      })
      .on(EVENT_TEST_PENDING, (test) => {
        const key = `${test.file}::${test.fullTitle()}`;
        const timestamp = new Date().toISOString();
        const existing = resultMap.get(key) || {
          success_count: 0,
          fail_count: 0,
          first_seen: timestamp,
          last_run: timestamp,
          last_status: 'pending',
          last_duration: 0,
        };

        existing.last_run = timestamp;
        existing.last_status = 'pending';
        existing.last_duration = 0;

        resultMap.set(key, existing);
      })
      .on(EVENT_RUN_END, () => {
        writeResults(outputFile, resultMap);
        logger.info(`\nTest report written to: ${outputFile}`);
        logger.debug(`Total results tracked: ${resultMap.size}`, {
          context: 'LogJsonReporter',
        });
      });
  }
}

module.exports = LogJsonReporter;
