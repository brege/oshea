// src/utils/formatters/inline-formatter.js
// Inline formatter with no newline (for prompts/results on same line)

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

// Format with inline output (no newline)
function formatInline(level, message, meta = {}) {
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

module.exports = {
  formatInline,
  colorForLevel
};
