// src/utils/logger.js
const chalk = require('chalk');
const fs = require('fs');
const path = require('path');

// Ensure log directory exists
const logDir = path.join(process.cwd(), 'logs');
if (process.env.LOG_MODE === 'json' && !fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}
const logFilePath = path.join(logDir, 'app.log');

function log(level, message, meta = {}) {
  if (level === 'debug' && !process.env.MD2PDF_DEBUG) return;
  if (process.env.LOG_MODE === 'json') {
    const entry = {
      level,
      message,
      ...meta,
      timestamp: new Date().toISOString()
    };
    fs.appendFileSync(logFilePath, JSON.stringify(entry) + '\n');
  } else {
    let output = message;
    if (level === 'error' || level === 'fatal') output = chalk.red(message);
    else if (level === 'warn') output = chalk.yellow(message);
    else if (level === 'success') output = chalk.green(message);
    else if (level === 'info') output = chalk.blueBright(message);
    else if (level === 'detail') output = chalk.gray(message);
    else if (level === 'debug') output = chalk.magenta(message);
    console.log(output);
  }

  if (level === 'fatal') {
    process.exit(1);
  }
}

module.exports = {
  info: (msg, meta) => log('info', msg, meta),
  warn: (msg, meta) => log('warn', msg, meta),
  error: (msg, meta) => log('error', msg, meta),
  success: (msg, meta) => log('success', msg, meta),
  detail: (msg, meta) => log('detail', msg, meta),
  fatal: (msg, meta) => log('fatal', msg, meta),
  debug: (msg, meta) => log('debug', msg, meta)
};
