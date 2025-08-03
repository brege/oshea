// test/analytics/run-last-fails.js
require('module-alias/register');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');
const { mochaPath, loggerPath } = require('@paths');
const logger = require(loggerPath);

function getReportPath() {
  if (process.env.MOCHA_JSON_REPORT_FILE) {
    return path.resolve(process.env.MOCHA_JSON_REPORT_FILE);
  }
  const xdgDataHome = process.env.XDG_DATA_HOME || path.join(os.homedir(), '.local', 'share');
  return path.join(xdgDataHome, 'md-to-pdf', 'test-analytics', 'test-results.json');
}

function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function main() {
  const reportPath = getReportPath();
  if (!fs.existsSync(reportPath)) {
    logger.info('No test failure report found. Exiting.');
    return;
  }

  const content = fs.readFileSync(reportPath, 'utf8');
  let titles = [];

  try {
    const testData = JSON.parse(content);
    titles = Object.entries(testData)
      .filter(([key, data]) => data.last_status === 'failed')
      .map(([key, data]) => {
        // Extract title from key: "file::title" -> "title"
        const title = key.split('::').slice(1).join('::');
        return escapeRegex(title);
      });
  } catch (error) {
    logger.error(`Failed to parse test results: ${error.message}`);
    return;
  }

  if (titles.length === 0) {
    logger.info('No failures found in the last test run. Nothing to do.');
    return;
  }

  const grepPattern = titles.join('|');
  logger.info(`Re-running ${titles.length} failed test(s)...`);

  const mochaArgs = ['--grep', grepPattern];
  const mocha = spawn(mochaPath, mochaArgs, { stdio: 'inherit' });

  mocha.on('close', (code) => {
    process.exit(code);
  });
}

main();

