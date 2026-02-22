// src/utils/formatters/lint.formatter.js
// Lint-specific formatting logic

const chalkImport = require('chalk');
const chalk = chalkImport.default || chalkImport;
if (typeof chalkImport.level === 'number') {
  chalk.level = chalkImport.level;
}
const { colorThemePath } = require('@paths');
const { theme } = require(colorThemePath);

// Apply style formatting to text
function applyStyle(text, style, severity = null) {
  switch (style) {
    case 'dim':
      return theme.debug(text);
    case 'underline':
      return chalk.underline(text);
    case 'bold':
      return chalk.bold(text);
    default:
      if (severity !== null) {
        return severity === 2 ? theme.error(text) : theme.warn(text);
      }
      return text;
  }
}

// Process highlight markers in text using placeholders
function processHighlights(text) {
  if (!text || typeof text !== 'string') return text;
  return text.replace(
    /<<HIGHLIGHT>>(.*?)<<ENDHIGHLIGHT>>/g,
    (_match, content) => {
      return chalk.bgYellow.black(content);
    },
  );
}

// Highlight matched text using regex replacement (for direct text highlighting)
function highlightMatch(line, matchedText) {
  if (!line || !matchedText) return line;
  // Escape any regex special chars in matchedText
  const safe = matchedText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return line.replace(new RegExp(safe, 'g'), chalk.bgYellow.black(matchedText));
}

// Format structured lint data for console output
function formatLint(structuredData) {
  if (structuredData.type === 'empty') {
    return '';
  }

  let output = '';

  // Render sections
  for (const section of structuredData.sections) {
    output += `\n${applyStyle(section.header.text, section.header.style)}\n`;

    for (const msg of section.messages) {
      const locationStr = applyStyle(msg.location.text, msg.location.style);
      const levelStr = applyStyle(msg.level.text, null, msg.level.severity);
      const ruleStr = applyStyle(msg.rule.text, msg.rule.style);

      output += `  ${locationStr} ${levelStr} ${msg.message} ${ruleStr}\n`;

      if (msg.sourceLine) {
        const sourceText = msg.sourceLine.text || msg.sourceLine;
        const highlight = msg.sourceLine.highlight;
        // Support both placeholder-based highlights and direct text highlighting
        if (highlight && typeof highlight === 'string') {
          // Direct text highlighting (used by visual-renderers)
          output += `       ${highlightMatch(sourceText, highlight)}\n`;
        } else if (highlight) {
          // Placeholder-based highlighting
          output += `       ${processHighlights(sourceText)}\n`;
        } else {
          output += `       ${sourceText}\n`;
        }
      }
    }
  }

  // Render summary
  if (structuredData.summary?.hasSummary) {
    const { totalErrors, totalWarnings, totalProblems } =
      structuredData.summary;
    output += '\n';
    const x = totalErrors > 0 ? theme.error('✖') : theme.warn('✖');
    output += `${x} ${totalProblems} problem${totalProblems !== 1 ? 's' : ''} (${totalErrors} error${totalErrors !== 1 ? 's' : ''}, ${totalWarnings} warning${totalWarnings !== 1 ? 's' : ''})`;
  }

  return output.trim();
}

module.exports = {
  formatLint,
  applyStyle,
  highlightMatch,
  processHighlights,
};
