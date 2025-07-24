// src/utils/logger.js
// lint-skip-file logging
// Slim routing layer - all formatting logic delegated to formatters/
const { formattersIndexPath } = require('@paths');
const formatters = require(formattersIndexPath);

// Global debug mode state
let debugMode = false;

// Logger formatting configuration
const loggerConfig = {
  showContext: true,      // Show context in formatted output
  showTimestamp: false,   // Show timestamp in formatted output
  contextStyle: 'prefix'  // 'prefix', 'suffix', 'none'
};

// Configure logger formatting
function configureLogger(config = {}) {
  Object.assign(loggerConfig, config);
}

// Get current logger configuration
function getLoggerConfig() {
  return { ...loggerConfig };
}

// Set debug mode globally
function setDebugMode(enabled) {
  debugMode = enabled;
}

// Unified logger interface with CSS-like format parameter
// Pure routing - delegates all formatting to formatters/
// Usage examples:
//   logger('message')                                    // same as logger.info('message')
//   logger('message', { level: 'debug' })                // same as logger.debug('message')
//   logger(lintData, { format: 'lint' })                 // lint formatting with info level
//   logger('debug msg', { level: 'debug', format: 'lint' }) // lint formatting with debug level
//   logger('inline', { format: 'inline' })               // no newline, same as writeInfo()
function logger(message, options = {}) {
  const { format = 'default', level = 'info', context, meta = {} } = options;

  // Enrich meta with context and config
  meta.context = context;
  meta.config = loggerConfig;

  // Debug mode filtering
  if (level === 'debug' && !debugMode) return;

  // Route to appropriate formatter
  if (format === 'default') {
    return formatters.app(level, message, meta);
  }

  if (format === 'lint') {
    // Special handling for lint format with JSON mode support
    if (process.env.LOG_MODE === 'json') {
      const fs = require('fs');
      const path = require('path');
      const logFilePath = path.join(process.cwd(), 'logs', 'app.log');
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
    return formatters.inline(level, message, meta);
  }

  if (format === 'raw') {
    return formatters.raw(level, message, meta);
  }

  if (format === 'paths') {
    return formatters.paths(level, message, meta);
  }

  // Fallback to default formatter
  return formatters.app(level, message, meta);
}

// Convenience aliases for each level (backward compatibility)
// Now support context: logger.info('message', { context: 'MyContext' })
const info      = (msg, options = {}) => logger(msg, { ...options, level: 'info' });
const warn      = (msg, options = {}) => logger(msg, { ...options, level: 'warn' });
const error     = (msg, options = {}) => logger(msg, { ...options, level: 'error' });
const success   = (msg, options = {}) => logger(msg, { ...options, level: 'success' });
const detail    = (msg, options = {}) => logger(msg, { ...options, level: 'detail' });
const fatal     = (msg, options = {}) => logger(msg, { ...options, level: 'fatal' });
const debug     = (msg, options = {}) => logger(msg, { ...options, level: 'debug' });
const validation= (msg, options = {}) => logger(msg, { ...options, level: 'validation' });

// writeFunction aliases removed - all migrated to { format: 'inline' } pattern

// Legacy specialized formatter methods (maintained for backward compatibility)
function formatLint(structuredData, meta = {}) {
  return logger(structuredData, { format: 'lint', meta });
}

module.exports = {
  // Debug mode control
  setDebugMode,
  // Logger configuration
  configureLogger,
  getLoggerConfig,
  // Main logger interface
  logger,
  // Convenience aliases for each level (backward compatibility)
  info,
  warn,
  error,
  success,
  detail,
  fatal,
  debug,
  validation,
  // Legacy specialized formatters (backward compatibility)
  formatLint
};

