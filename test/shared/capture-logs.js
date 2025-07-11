// test/shared/capture-logs.js
const logs = [];

const testLogger = {
  info:    (msg, meta) => logs.push({ level: 'info',    msg, meta: meta || null }),
  warn:    (msg, meta) => logs.push({ level: 'warn',    msg, meta: meta || null }),
  error:   (msg, meta) => logs.push({ level: 'error',   msg, meta: meta || null }),
  success: (msg, meta) => logs.push({ level: 'success', msg, meta: meta || null }),
  detail:  (msg, meta) => logs.push({ level: 'detail',  msg, meta: meta || null }),
  fatal:   (msg, meta) => logs.push({ level: 'fatal',   msg, meta: meta || null }),
};

/**
 * Clears the logs array. To be used in a `beforeEach` hook.
 */
function clearLogs() {
  logs.length = 0;
}

module.exports = {
  logs,
  testLogger,
  clearLogs,
};

