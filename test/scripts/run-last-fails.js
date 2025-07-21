// test/scripts/run-last-fails.js
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
  const xdgCacheHome = process.env.XDG_CACHE_HOME || path.join(os.homedir(), '.cache');
  return path.join(xdgCacheHome, 'md-to-pdf', 'logs', 'test-failures.json');
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
  const titles = content
    .trim()
    .split('\n')
    .map(line => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(test => test && test.status === 'failed')
    .map(test => escapeRegex(test.title));

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

