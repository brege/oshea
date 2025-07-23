// src/utils/formatters/inline-formatter.js
// Inline formatter with no newline (for prompts/results on same line)

const chalk = require('chalk');
const fs = require('fs');
const path = require('path');

// Ensure log directory exists
const logDir = path.join(process.cwd(), 'logs');
if (process.env.LOG_MODE === 'json' && !fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}
const logFilePath = path.join(logDir, 'app.log');

// Returns a colored string for the given level
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