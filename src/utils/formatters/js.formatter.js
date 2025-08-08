// src/utils/formatters/js.formatter.js
// General JavaScript code output formatter for scripts and tools
const { colorThemePath } = require('@paths');
const { theme } = require(colorThemePath);
const chalk = require('chalk');

// JavaScript-specific theme extensions using simpler chalk colors
const jsTheme = {
  keyword: chalk.blue,
  string: chalk.green,
  property: chalk.yellow,
  number: chalk.magenta,
  comment: chalk.gray,
  import: chalk.cyan,
  dim: chalk.dim
};

// Format JavaScript code with syntax highlighting
function formatJs(level, message, meta = {}) {
  try {
    if (typeof message !== 'string') {
      // If message is not a string, stringify it
      message = typeof message === 'object' ? JSON.stringify(message, null, 2) : String(message);
    }

    // Apply JavaScript syntax highlighting
    let formatted = message
    // Highlight JavaScript keywords
      .replace(/\b(const|let|var|function|return|if|else|for|while|class|import|export|require|module\.exports)\b/g,
        match => jsTheme.keyword(match))

    // Highlight strings (single and double quotes)
      .replace(/(['"])(?:(?=(\\?))\2.)*?\1/g, match => jsTheme.string(match))

    // Highlight object keys and properties
      .replace(/(\b\w+)(\s*:)/g, (_, key, colon) => jsTheme.property(key) + colon)

    // Highlight numbers
      .replace(/\b\d+(\.\d+)?\b/g, match => jsTheme.number(match))

    // Highlight comments
      .replace(/(\/\/.*$|\/\*[\s\S]*?\*\/)/gm, match => jsTheme.comment(match))

    // Highlight file paths (for path-finder output)
      .replace(/(\/[^\s]*\.js[^\s]*)/g, match => theme.path(match))

    // Highlight require/import statements
      .replace(/(require\(['"][@\w\-./]+['"]\))/g, match => jsTheme.import(match))
      .replace(/(import\s+.*?\s+from\s+['"][@\w\-./]+['"])/g, match => jsTheme.import(match));

    // Handle different log levels with appropriate colors
    switch (level) {
    case 'error':
    case 'fatal':
      console.error(formatted);
      break;
    case 'warn':
      console.warn(formatted);
      break;
    case 'debug':
      if (meta.config && !meta.config.debugMode) return;
      console.log(jsTheme.dim(formatted));
      break;
    default:
      console.log(formatted);
    }
  } catch (error) {
    // Fallback to plain console output on error
    console.log(`[JS formatter error: ${error.message}] ${message}`);
  }
}

module.exports = {
  formatJs
};
