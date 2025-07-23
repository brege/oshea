// scripts/linting/lib/formatters.js
// Backward compatibility layer - delegates to split architecture

const { 
  padRight, 
  createLintResult, 
  adaptRawIssuesToEslintFormat, 
  transformToStructuredData 
} = require('./data-adapters');

const { 
  highlightMatch, 
  renderLintResults, 
  renderLintOutput 
} = require('./visual-renderers');

// Legacy formatters object for backward compatibility
const formatters = {
  stylish(results) {
    const structuredData = transformToStructuredData(results);
    return renderLintResults(structuredData);
  }
};

function formatLintResults(results, formatter = 'stylish') {
  if (results.length === 0) {
    return '';
  }
  if (typeof formatter === 'string') {
    if (!formatters[formatter]) {
      throw new Error(`Unknown formatter: ${formatter}`);
    }
    return formatters[formatter](results);
  }
  if (typeof formatter === 'function') {
    return formatter(results);
  }
  throw new Error('Formatter must be a string or function');
}

// Re-export everything for backward compatibility
module.exports = {
  formatters,
  createLintResult,
  formatLintResults,
  renderLintOutput,
  adaptRawIssuesToEslintFormat,
  padRight,
  highlightMatch
};