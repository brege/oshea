// test/shared/capture-logs.js
const logs = [];

function logMethod(level) {
  // Capture the message and the metadata object
  return (msg, meta) => logs.push({ level, msg, data: meta || null });
}

const logger = {
  info:    logMethod('info'),
  warn:    logMethod('warn'),
  error:   logMethod('error'),
  success: logMethod('success'),
  debug:   logMethod('debug'), // Changed from 'detail' to 'debug' as per migration guide
  fatal:   logMethod('fatal'), // Retain fatal if it's a critical level in your system
};

function clearLogs() {
  logs.length = 0;
}

module.exports = {
  logs,
  clearLogs,
  ...logger, // exports info, warn, error, etc. at top level
};
