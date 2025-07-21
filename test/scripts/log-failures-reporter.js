// test/scripts/log-failures-reporter.js
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

class LogJsonReporter extends Mocha.reporters.Spec {
  constructor(runner, options) {
    super(runner, options);

    const outputFile = getReportPath();
    const outputStream = fs.createWriteStream(outputFile);

    runner
      .on(EVENT_TEST_PASS, test => {
        const result = {
          status: 'passed',
          title: test.fullTitle(),
          file: test.file,
          duration: test.duration,
        };
        outputStream.write(JSON.stringify(result) + '\n');
      })
      .on(EVENT_TEST_FAIL, (test, err) => {
        const result = {
          status: 'failed',
          title: test.fullTitle(),
          file: test.file,
          error: err.message,
          stack: err.stack,
        };
        outputStream.write(JSON.stringify(result) + '\n');
      })
      .on(EVENT_TEST_PENDING, test => {
        const result = {
          status: 'pending',
          title: test.fullTitle(),
          file: test.file,
        };
        outputStream.write(JSON.stringify(result) + '\n');
      })
      .on(EVENT_RUN_END, () => {
        outputStream.end();
        logger.info(`\nTest report written to: ${outputFile}`);
      });
  }
}

module.exports = LogJsonReporter;

