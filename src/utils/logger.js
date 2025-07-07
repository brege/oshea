// src/utils/logger.js
// A centralized logger module to standardize console output.
// This is the initial scaffolding and will be expanded upon.

const chalk = require('chalk');

function log(level, message) {
  // This will be expanded to handle different log levels and formats.
  console.log(message);
}

module.exports = {
  info: (msg) => log('info', msg),
  warn: (msg) => log('warn', chalk.yellow(msg)),
  error: (msg) => log('error', chalk.red(msg)),
  success: (msg) => log('success', chalk.green(msg)),
  detail: (msg) => log('detail', chalk.gray(msg)),
  fatal: (msg) => {
    log('fatal', chalk.red.bold(msg));
    process.exit(1);
  },
};
