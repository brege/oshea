// test/shared/capture-logs.js
const logs = [];

function logMethod(level) {
  return (msg, meta) => logs.push({ level, msg, meta: meta || null });
}

const logger = {
  info:    logMethod('info'),
  warn:    logMethod('warn'),
  error:   logMethod('error'),
  success: logMethod('success'),
  detail:  logMethod('detail'),
  fatal:   logMethod('fatal'),
};

function clearLogs() {
  logs.length = 0;
}

module.exports = {
  logs,
  clearLogs,
  ...logger, // exports info, warn, error, etc. at top level
};

