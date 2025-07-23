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

// Global debug mode state
let debugMode = false;

// Set debug mode globally
function setDebugMode(enabled) {
  debugMode = enabled;
}

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
  if (level === 'debug' && !debugMode) return;
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
  if (level === 'debug' && !debugMode) return;
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

// Aliases for each level with newline - enhanced to support format options
const info      = (msg, meta = {}) => meta.format ? logger(msg, { ...meta, level: 'info' }) : log('info', msg, meta);
const warn      = (msg, meta = {}) => meta.format ? logger(msg, { ...meta, level: 'warn' }) : log('warn', msg, meta);
const error     = (msg, meta = {}) => meta.format ? logger(msg, { ...meta, level: 'error' }) : log('error', msg, meta);
const success   = (msg, meta = {}) => meta.format ? logger(msg, { ...meta, level: 'success' }) : log('success', msg, meta);
const detail    = (msg, meta = {}) => meta.format ? logger(msg, { ...meta, level: 'detail' }) : log('detail', msg, meta);
const fatal     = (msg, meta = {}) => meta.format ? logger(msg, { ...meta, level: 'fatal' }) : log('fatal', msg, meta);
const debug     = (msg, meta = {}) => meta.format ? logger(msg, { ...meta, level: 'debug' }) : log('debug', msg, meta);
const validation= (msg, meta = {}) => meta.format ? logger(msg, { ...meta, level: 'validation' }) : log('validation', msg, meta);

// Aliases for each level, NO newline - enhanced to support format options
const writeInfo      = (msg, meta = {}) => meta.format ? logger(msg, { ...meta, level: 'info', format: 'inline' }) : write('info', msg, meta);
const writeWarn      = (msg, meta = {}) => meta.format ? logger(msg, { ...meta, level: 'warn', format: 'inline' }) : write('warn', msg, meta);
const writeError     = (msg, meta = {}) => meta.format ? logger(msg, { ...meta, level: 'error', format: 'inline' }) : write('error', msg, meta);
const writeSuccess   = (msg, meta = {}) => meta.format ? logger(msg, { ...meta, level: 'success', format: 'inline' }) : write('success', msg, meta);
const writeDetail    = (msg, meta = {}) => meta.format ? logger(msg, { ...meta, level: 'detail', format: 'inline' }) : write('detail', msg, meta);
const writeFatal     = (msg, meta = {}) => meta.format ? logger(msg, { ...meta, level: 'fatal', format: 'inline' }) : write('fatal', msg, meta);
const writeDebug     = (msg, meta = {}) => meta.format ? logger(msg, { ...meta, level: 'debug', format: 'inline' }) : write('debug', msg, meta);
const writeValidation= (msg, meta = {}) => meta.format ? logger(msg, { ...meta, level: 'validation', format: 'inline' }) : write('validation', msg, meta);

// Unified logger interface with CSS-like format parameter
// Usage examples:
//   logger('message')                                    // same as logger.info('message')  
//   logger('message', { level: 'debug' })                // same as logger.debug('message')
//   logger(lintData, { format: 'lint' })                 // lint formatting with info level
//   logger('debug msg', { level: 'debug', format: 'lint' }) // lint formatting with debug level
//   logger('inline', { format: 'inline' })               // no newline, same as writeInfo()
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
  // Debug mode control
  setDebugMode,
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

