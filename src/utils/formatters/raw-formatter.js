// src/utils/formatters/raw-formatter.js
// Raw formatter with no coloring or formatting (for JSON/structured data)

const fs = require('fs');
const path = require('path');

// Ensure log directory exists
const logDir = path.join(process.cwd(), 'logs');
if (process.env.LOG_MODE === 'json' && !fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}
const logFilePath = path.join(logDir, 'app.log');

// Format with raw output (no coloring, no formatting)
function formatRaw(level, message, meta = {}) {
  if (process.env.LOG_MODE === 'json') {
    const entry = {
      level,
      type: 'raw-output',
      data: message,
      ...meta,
      timestamp: new Date().toISOString()
    };
    fs.appendFileSync(logFilePath, JSON.stringify(entry) + '\n');
    return;
  }

  process.stdout.write(message);

  if (level === 'fatal') {
    process.exit(1);
  }
}

module.exports = {
  formatRaw
};