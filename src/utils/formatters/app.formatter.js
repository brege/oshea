// src/utils/formatters/app.formatter.js
// Default app theme formatter with colored output
// lint-skip-file no-console

const fs = require('fs');
const path = require('path');
const { colorThemePath } = require('@paths');
const { theme } = require(colorThemePath);

// Ensure log directory exists
const logDir = path.join(process.cwd(), 'logs');
if (process.env.LOG_MODE === 'json' && !fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}
const logFilePath = path.join(logDir, 'app.log');

// Returns a colored string for the given level using gruvbox theme
function colorForLevel(level, message) {
  if (level === 'error' || level === 'fatal') return theme.error(message);
  if (level === 'warn') return theme.warn(message);
  if (level === 'success') return theme.success(message);
  if (level === 'info') return theme.info(message);
  if (level === 'validation') return theme.validation(message);
  if (level === 'detail') return theme.detail(message);
  if (level === 'debug') return theme.debug(message);
  return message;
}

// Format context prefix based on configuration
function formatContext(context, config = {}) {
  if (!context || !config.showContext) return '';

  const timestamp = config.showTimestamp ? ` ${new Date().toISOString()}` : '';

  if (config.contextStyle === 'prefix') {
    return `[${context}${timestamp}] `;
  } else if (config.contextStyle === 'suffix') {
    return ` [${context}${timestamp}]`;
  }

  return '';
}

// Format with default app theme (newline)
function formatApp(level, message, meta = {}) {
  const { context, config = {}, caller, stack, errorCategory, hint } = meta;

  if (process.env.LOG_MODE === 'json') {
    const entry = {
      level,
      message,
      ...meta,
      timestamp: new Date().toISOString(),
    };
    fs.appendFileSync(logFilePath, JSON.stringify(entry) + '\n');
  } else {
    const contextPrefix = formatContext(context, config);
    let formattedMessage =
      config.contextStyle === 'suffix'
        ? message + formatContext(context, config)
        : contextPrefix + message;

    // Add enhanced debugging information
    if (caller) {
      formattedMessage += theme.debug(` (${caller})`);
    }

    if (errorCategory && errorCategory !== 'general') {
      formattedMessage += theme.info(` [${errorCategory}]`);
    }

    console.log(colorForLevel(level, formattedMessage));

    // Display hint on next line if available
    if (hint) {
      console.log(theme.debug(`  Hint: ${hint}`));
    }

    // Display stack trace if available
    if (stack && Array.isArray(stack)) {
      console.log(theme.debug('  Stack trace:'));
      stack.forEach((line) => {
        console.log(theme.debug(`    ${line.trim()}`));
      });
    }
  }

  if (level === 'fatal') {
    process.exit(1);
  }
}

module.exports = {
  formatApp,
  colorForLevel,
};
