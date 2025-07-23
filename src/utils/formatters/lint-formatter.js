// src/utils/formatters/lint-formatter.js
// Lint-specific formatting logic

const chalk = require('chalk');

// Apply style formatting to text
function applyStyle(text, style, severity = null) {
  switch (style) {
  case 'dim':
    return chalk.gray(text);
  case 'underline':
    return chalk.underline(text);
  case 'bold':
    return chalk.bold(text);
  default:
    if (severity !== null) {
      return severity === 2 ? chalk.red(text) : chalk.yellow(text);
    }
    return text;
  }
}

// Process highlight markers in text
function processHighlights(text) {
  if (!text || typeof text !== 'string') return text;
  return text.replace(/<<HIGHLIGHT>>(.*?)<<ENDHIGHLIGHT>>/g, (match, content) => {
    return chalk.bgYellow.black(content);
  });
}

// Format structured lint data for console output
function formatLint(structuredData) {
  if (structuredData.type === 'empty') {
    return '';
  }

  let output = '';

  // Render sections
  for (const section of structuredData.sections) {
    output += '\n' + applyStyle(section.header.text, section.header.style) + '\n';

    for (const msg of section.messages) {
      const locationStr = applyStyle(msg.location.text, msg.location.style);
      const levelStr = applyStyle(msg.level.text, null, msg.level.severity);
      const ruleStr = applyStyle(msg.rule.text, msg.rule.style);

      output += `  ${locationStr} ${levelStr} ${msg.message} ${ruleStr}\n`;

      if (msg.sourceLine) {
        const sourceText = msg.sourceLine.text || msg.sourceLine;
        const highlight = msg.sourceLine.highlight;
        output += '       ' + (highlight ? processHighlights(sourceText) : sourceText) + '\n';
      }
    }
  }

  // Render summary
  if (structuredData.summary && structuredData.summary.hasSummary) {
    const { totalErrors, totalWarnings, totalProblems } = structuredData.summary;
    output += '\n';
    const x = totalErrors > 0 ? chalk.red.bold('✖') : chalk.yellow.bold('✖');
    output += `${x} ${totalProblems} problem${totalProblems !== 1 ? 's' : ''} (${totalErrors} error${totalErrors !== 1 ? 's' : ''}, ${totalWarnings} warning${totalWarnings !== 1 ? 's' : ''})`;
  }

  return output.trim();
}

module.exports = {
  formatLint
};