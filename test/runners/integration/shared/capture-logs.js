// test/runners/integration/shared/capture-logs.js
const logs = [];

function logMethod(level) {
  return (msg, meta) => logs.push({ level, msg, data: meta || null });
}

const logger = {
  info:    logMethod('info'),
  warn:    logMethod('warn'),
  error:   logMethod('error'),
  success: logMethod('success'),
  debug:   logMethod('debug'),
  fatal:   logMethod('fatal'),
};

function clearLogs() {
  logs.length = 0;
}

module.exports = {
  logs,
  clearLogs,
  ...logger,
};
