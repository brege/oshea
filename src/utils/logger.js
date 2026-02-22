// src/utils/logger.js
// lint-skip-file no-console
// Slim routing layer - all formatting logic delegated to formatters/
const { formattersIndexPath, loggerEnhancerPath } = require('@paths');

// Lazy-loaded formatter cache
const formatterCache = {};
function getFormatter(name) {
  if (!formatterCache[name]) {
    const formatters = require(formattersIndexPath);
    formatterCache[name] = formatters[name];
    if (!formatterCache[name]) {
      throw new Error(`Unknown formatter: ${name}`);
    }
  }
  return formatterCache[name];
}

// Global debug mode state
let debugMode = false;

// Logger formatting configuration
const loggerConfig = {
  showContext: true,      // Show context in formatted output
  showTimestamp: false,   // Show timestamp in formatted output
  contextStyle: 'prefix', // 'prefix', 'suffix', 'none'
  // Enhanced debugging features
  showCaller: false,      // Show file:line caller info
  showStack: false,       // Show stack traces for errors
  enrichErrors: false,    // Auto-categorize errors and add hints
  stackDepth: 3           // Number of stack frames to show
};

// Error categorization is now handled in logger-enhancer.js with built-in patterns

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

// Import enhancement utilities
const { enhanceMessage } = require(loggerEnhancerPath);

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

  // Suppress context for user-facing commands unless debug mode
  if (!debugMode && (level === 'info' || level === 'success')) {
    meta.context = undefined; // Suppress context for clean user output
  } else {
    meta.context = context; // Preserve context for debug/warn/error levels
  }
  meta.config = loggerConfig;

  // Apply enhanced debugging if any enhancement features are enabled
  if (loggerConfig.showCaller || loggerConfig.showStack || loggerConfig.enrichErrors) {
    const enhanced = enhanceMessage(message, options, level, loggerConfig);
    Object.assign(meta, enhanced);
  }

  // Debug mode filtering
  if (level === 'debug' && !debugMode) return;

  // Route to appropriate formatter
  if (format === 'default') {
    return getFormatter('app')(level, message, meta);
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

    const formatted = getFormatter('lint')(message);
    if (formatted) {
      console.log(formatted);
    }
    return;
  }

  // For all other formatters, use lazy loading
  try {
    const formatter = getFormatter(format);
    return formatter(level, message, meta);
  } catch {
    // Fallback to default formatter if format not found
    return getFormatter('app')(level, message, meta);
  }
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

// Convenience method for pre-configured loggers with context
function createLoggerFor(context) {
  return {
    info: (msg, options = {}) => logger(msg, { ...options, level: 'info', context }),
    warn: (msg, options = {}) => logger(msg, { ...options, level: 'warn', context }),
    error: (msg, options = {}) => logger(msg, { ...options, level: 'error', context }),
    success: (msg, options = {}) => logger(msg, { ...options, level: 'success', context }),
    detail: (msg, options = {}) => logger(msg, { ...options, level: 'detail', context }),
    fatal: (msg, options = {}) => logger(msg, { ...options, level: 'fatal', context }),
    debug: (msg, options = {}) => logger(msg, { ...options, level: 'debug', context }),
    validation: (msg, options = {}) => logger(msg, { ...options, level: 'validation', context }),
    // Main logger with context pre-filled
    log: (msg, options = {}) => logger(msg, { ...options, context })
  };
}

module.exports = {
  // Debug mode control
  setDebugMode,
  // Logger configuration
  configureLogger,
  getLoggerConfig,
  // Main logger interface
  logger,
  // Convenience method for pre-configured loggers
  for: createLoggerFor,
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
