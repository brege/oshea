// src/utils/logger-enhancer.js
// Enhanced debugging utilities extracted from logger.js

// Enhanced logging functions with improved caller detection
function getCallerInfo(_stackDepth = 3) {
  const stack = new Error().stack;
  const lines = stack.split('\n');

  // Skip internal logger/enhancer frames to find actual caller
  const skipPatterns = [
    /logger-enhancer\.js/,
    /logger\.js/,
    /formatters\//,
    /enhanceMessage/,
    /getCallerInfo/,
  ];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];

    // Skip frames that match our internal patterns
    if (skipPatterns.some((pattern) => pattern.test(line))) {
      continue;
    }

    // Try different stack trace formats
    let match = line.match(/at\s+(.+?)\s+\((.+?):(\d+):\d+\)/);
    if (!match) {
      // Try format without function name
      match = line.match(/at\s+(.+?):(\d+):\d+/);
      if (match) {
        const [, file, lineNum] = match;
        const shortFile = file.replace(process.cwd(), '.');
        return { function: 'anonymous', file: shortFile, line: lineNum };
      }
    } else {
      const [, func, file, lineNum] = match;
      const shortFile = file.replace(process.cwd(), '.');
      return { function: func, file: shortFile, line: lineNum };
    }
  }
  return { function: 'unknown', file: 'unknown', line: '0' };
}

// Built-in error patterns based on codebase analysis
const defaultErrorPatterns = {
  filesystem:
    /(?:Could not read|Failed to write|Failed to remove|directory|file|path|Permission denied|ENOENT|EACCES)/i,
  plugin:
    /(?:plugin|Plugin|bundled plugin|collection.*managed|validation failed|contract|registry)/i,
  config: /(?:configuration|config|yaml|json|CONFIG|settings|manifest)/i,
  network: /(?:fetch|download|git|url|connection|timeout|DNS|certificate)/i,
  validation: /(?:validation|validate|schema|invalid|missing.*field|required)/i,
  cli: /(?:command|argument|flag|option|CLI|usage)/i,
  fatal: /(?:FATAL|fatal|Fatal|critical|Critical)/i,
};

function categorizeError(message, customPatterns = {}) {
  // Combine default patterns with any custom ones
  const patterns = { ...defaultErrorPatterns, ...customPatterns };

  for (const [category, pattern] of Object.entries(patterns)) {
    if (pattern.test(message)) {
      return category;
    }
  }
  return 'general';
}

function enhanceMessage(
  message,
  _options = {},
  level = 'info',
  loggerConfig = {},
) {
  const enhanced = {};

  // Add caller information if enabled
  if (loggerConfig.showCaller) {
    const caller = getCallerInfo(loggerConfig.stackDepth);
    enhanced.caller = `${caller.file}:${caller.line}`;
  }

  // Add stack trace for errors if enabled
  if (loggerConfig.showStack && level === 'error') {
    const stack = new Error().stack;
    enhanced.stack = stack
      .split('\n')
      .slice(4, 4 + (loggerConfig.stackDepth || 3));
  }

  // Auto-categorize errors if enabled
  if (
    loggerConfig.enrichErrors &&
    (level === 'error' || level === 'warn' || level === 'fatal')
  ) {
    const category = categorizeError(message, {});
    enhanced.errorCategory = category;

    // Add category-specific debugging hints
    const hints = {
      filesystem:
        'Check file permissions, paths, and disk space. Use --debug for detailed file operations.',
      plugin:
        'Verify plugin contract, check registry, or run `oshea plugin validate`. Use --debug for plugin loading details.',
      config:
        'Validate YAML/JSON syntax, check required fields, or run `oshea config --pure` to inspect merged config.',
      network:
        'Check internet connection, git repository access, or proxy settings. Use --debug for network operations.',
      validation:
        'Review schema requirements, check field types, or run validation with --debug for detailed errors.',
      cli: 'Check command syntax with `oshea --help` or `oshea <command> --help`. Use --debug for argument parsing.',
      fatal:
        'Critical system error - check logs and consider filing a bug report with reproduction steps.',
      general: 'Use --debug flag for more detailed logging and stack traces.',
    };

    enhanced.hint = hints[category] || hints.general;

    // Add contextual information based on caller location
    if (enhanced.caller) {
      const callerFile = enhanced.caller.split(':')[0];
      if (callerFile.includes('/cli/') && category === 'plugin') {
        enhanced.hint +=
          ' CLI context detected - verify command arguments and plugin availability.';
      } else if (callerFile.includes('/config/') && category === 'config') {
        enhanced.hint +=
          ' Configuration loading context - check config file hierarchy and YAML syntax.';
      }
    }
  }

  return enhanced;
}

module.exports = {
  getCallerInfo,
  categorizeError,
  enhanceMessage,
  // Export patterns for testing/extension
  defaultErrorPatterns,
};
