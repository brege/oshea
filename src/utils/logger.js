// src/utils/logger.js
// lint-skip-logger
const chalk = require('chalk');
const fs = require('fs');
const path = require('path');
const { formattersIndexPath } = require('@paths');
const formatters = require(formattersIndexPath);

// Ensure log directory exists
const logDir = path.join(process.cwd(), 'logs');
if (process.env.LOG_MODE === 'json' && !fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}
const logFilePath = path.join(logDir, 'app.log');

// Returns a colored string for the given level.
function colorForLevel(level, message) {
  if (level === 'error' || level === 'fatal') return chalk.red(message);
  if (level === 'warn') return chalk.yellow(message);
  if (level === 'success') return chalk.green(message);
  if (level === 'info') return chalk.cyan(message);
  if (level === 'validation') return chalk.magentaBright(message); // custom validation color
  if (level === 'detail') return chalk.gray(message);
  if (level === 'debug') return chalk.magenta(message);
  return message;
}

// Normal logger
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
    console.log(colorForLevel(level, message));
  }
  if (level === 'fatal') {
    process.exit(1);
  }
}

// Logger with NO newline (for prompts/results on same line).
function write(level, message, meta = {}) {
  if (level === 'debug' && !process.env.MD2PDF_DEBUG) return;
  if (process.env.LOG_MODE === 'json') {
    const entry = {
      level,
      message,
      ...meta,
      timestamp: new Date().toISOString()
    };
    fs.appendFileSync(logFilePath, JSON.stringify(entry)); // no \n
  } else {
    process.stdout.write(colorForLevel(level, message));
  }
  if (level === 'fatal') {
    process.exit(1);
  }
}

// Aliases for each level with newline
const info      = (msg, meta) => log('info', msg, meta);
const warn      = (msg, meta) => log('warn', msg, meta);
const error     = (msg, meta) => log('error', msg, meta);
const success   = (msg, meta) => log('success', msg, meta);
const detail    = (msg, meta) => log('detail', msg, meta);
const fatal     = (msg, meta) => log('fatal', msg, meta);
const debug     = (msg, meta) => log('debug', msg, meta);
const validation= (msg, meta) => log('validation', msg, meta);

// Aliases for each level, NO newline
const writeInfo      = (msg, meta) => write('info', msg, meta);
const writeWarn      = (msg, meta) => write('warn', msg, meta);
const writeError     = (msg, meta) => write('error', msg, meta);
const writeSuccess   = (msg, meta) => write('success', msg, meta);
const writeDetail    = (msg, meta) => write('detail', msg, meta);
const writeFatal     = (msg, meta) => write('fatal', msg, meta);
const writeDebug     = (msg, meta) => write('debug', msg, meta);
const writeValidation= (msg, meta) => write('validation', msg, meta);

// Unified logger interface with CSS-like format parameter
function logger(message, options = {}) {
  const { format = 'default', level = 'info', meta = {} } = options;

  if (format === 'default') {
    // Standard logging behavior - just like logger.info(), etc.
    log(level, message, meta);
    return;
  }

  if (format === 'lint') {
    // Specialized lint formatting
    if (process.env.LOG_MODE === 'json') {
      const entry = {
        level: 'info',
        type: 'lint-output',
        data: message,
        ...meta,
        timestamp: new Date().toISOString()
      };
      fs.appendFileSync(logFilePath, JSON.stringify(entry) + '\n');
      return;
    }

    const formatted = formatters.lint(message);
    if (formatted) {
      console.log(formatted);
    }
    return;
  }

  if (format === 'inline') {
    // Inline writing (no newline) - for validators/smoke tests
    write(level, message, meta);
    return;
  }

  // Fallback to default if unknown format
  log(level, message, meta);
}

// Legacy specialized formatter methods (maintained for backward compatibility)
function formatLint(structuredData, meta = {}) {
  return logger(structuredData, { format: 'lint', meta });
}

module.exports = {
  // Unified interface
  logger,
  // Core logging functions
  log,
  write,
  info,
  warn,
  error,
  success,
  detail,
  fatal,
  debug,
  validation,
  writeInfo,
  writeWarn,
  writeError,
  writeSuccess,
  writeDetail,
  writeFatal,
  writeDebug,
  writeValidation,
  // Legacy specialized formatters (backward compatibility)
  formatLint
};

