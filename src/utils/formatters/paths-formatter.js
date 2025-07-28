// src/utils/formatters/paths-formatter.js
// Rudimentary syntax highlighting for path-finder shell output

const { colorThemePath } = require('@paths');
const { theme } = require(colorThemePath);

function formatLine(line) {
  if (!line || typeof line !== 'string') return line;

  // Highlight `require` keyword
  line = line.replace(/\brequire\b/g, theme.highlight('require'));

  // Highlight string literals (single quotes)
  line = line.replace(/'([^']+)'/g, (match) => theme.value(match));

  // Highlight comments (start with //)
  line = line.replace(/\/\/.*/g, (match) => theme.debug(match));

  // Highlight destructuring variables, e.g. { var1, var2 }
  line = line.replace(/\{([^}]+)\}/g, (match) => theme.success(match));

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

