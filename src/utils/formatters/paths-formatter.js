// src/utils/formatters/paths-formatter.js
// Rudimentary syntax highlighting for path-finder shell output

const chalk = require('chalk');

function formatLine(line) {
  if (!line || typeof line !== 'string') return line;

  // Highlight `require` keyword (cyan, bold)
  line = line.replace(/\brequire\b/g, chalk.cyan.bold('require'));

  // Highlight string literals (single quotes) in yellow
  line = line.replace(/'([^']+)'/g, (match) => chalk.yellow(match));

  // Highlight comments (start with //) in gray
  line = line.replace(/\/\/.*/g, (match) => chalk.gray(match));

  // Highlight destructuring variables in green, e.g. { var1, var2 }
  line = line.replace(/\{([^}]+)\}/g, (match) => chalk.green(match));

  return line;
}

function formatPathFinderOutput(level, message, meta = {}) {
  if (!message || typeof message !== 'string') return message;

  const highlightedOutput = message
    .split('\n')
    .map(line => formatLine(line))
    .join('\n');

  // Output without additional newline (similar to inline formatter)
  process.stdout.write(highlightedOutput);
}

module.exports = {
  formatLine,
  formatPathFinderOutput,
};

