// src/utils/logger-enhancer.js
// Enhanced debugging utilities extracted from logger.js

// Enhanced logging functions
function getCallerInfo(stackDepth = 3) {
  const stack = new Error().stack;
  const lines = stack.split('\n');

  // Skip: Error, getCallerInfo, enhanceMessage, the actual logger method, find real caller
  for (let i = 4; i < lines.length && i < 4 + stackDepth; i++) {
    const line = lines[i];
    const match = line.match(/at\s+(.+?)\s+\((.+?):(\d+):\d+\)/);
    if (match) {
      const [, func, file, lineNum] = match;
      const shortFile = file.replace(process.cwd(), '.');
      return { function: func, file: shortFile, line: lineNum };
    }
  }
  return { function: 'unknown', file: 'unknown', line: '0' };
}

function categorizeError(message, errorPatterns = {}) {
  for (const [category, pattern] of Object.entries(errorPatterns)) {
    if (pattern.test(message)) {
      return category;
    }
  }
  return 'general';
}

function enhanceMessage(message, options = {}, level = 'info', loggerConfig = {}) {
  const enhanced = {};

  // Add caller information if enabled
  if (loggerConfig.showCaller) {
    const caller = getCallerInfo(loggerConfig.stackDepth);
    enhanced.caller = `${caller.file}:${caller.line}`;
  }

  // Add stack trace for errors if enabled
  if (loggerConfig.showStack && level === 'error') {
    const stack = new Error().stack;
    enhanced.stack = stack.split('\n').slice(4, 4 + (loggerConfig.stackDepth || 3));
  }

  // Auto-categorize errors if enabled
  if (loggerConfig.enrichErrors && (level === 'error' || level === 'warn')) {
    // TODO: Use path-based error registry from paths/paths-config.yaml
    const category = categorizeError(message, {});
    enhanced.errorCategory = category;

    // Add category-specific debugging hints
    if (category === 'filesystem' && !options.file) {
      enhanced.hint = 'Consider checking file permissions and paths';
    } else if (category === 'plugin' && !options.plugin) {
      enhanced.hint = 'Check plugin contract validation and registry';
    } else if (category === 'config' && !options.config) {
      enhanced.hint = 'Verify configuration format and required fields';
    }
  }

  return enhanced;
}

module.exports = {
  getCallerInfo,
  categorizeError,
  enhanceMessage
};