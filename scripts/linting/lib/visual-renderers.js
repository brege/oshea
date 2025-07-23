// scripts/linting/lib/visual-renderers.js
// Visual formatting and console output functions
require('module-alias/register');
const { dataAdaptersPath, loggerPath } = require('@paths');
const logger = require(loggerPath);

const chalk = require('chalk');

function highlightMatch(line, matchedText) {
  if (!line || !matchedText) return line;
  // Escape any regex special chars in matchedText
  const safe = matchedText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return line.replace(
    new RegExp(safe, 'g'),
    chalk.bgYellow.black(matchedText)
  );
}

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

// Render structured lint data to console
function renderLintResults(structuredData) {
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
        output += '       ' + highlightMatch(msg.sourceLine.text, msg.sourceLine.highlight) + '\n';
      }
    }
  }

  // Render summary
  if (structuredData.summary.hasSummary) {
    const { totalErrors, totalWarnings, totalProblems } = structuredData.summary;
    output += '\n';
    const x = totalErrors > 0 ? chalk.red.bold('✖') : chalk.yellow.bold('✖');
    output += `${x} ${totalProblems} problem${totalProblems !== 1 ? 's' : ''} (${totalErrors} error${totalErrors !== 1 ? 's' : ''}, ${totalWarnings} warning${totalWarnings !== 1 ? 's' : ''})`;
  }

  return output.trim();
}


function renderLintOutput({ issues = [], summary = {}, results = [], flags = {} }, formatter = 'stylish') {
  // If called by harness but in debug mode, allow debug output to flow first
  if (process.env.CALLED_BY_HARNESS && !flags.debug) {
    console.log(JSON.stringify({ issues, summary, results }));
    return;
  } else if (process.env.CALLED_BY_HARNESS && flags.debug) {
    // In debug mode: show formatted output AND return JSON for harness
    // Let the debug output flow through below, then output JSON at the end
  }
  
  // If user explicitly requested JSON, output formatted JSON
  if (flags.json) {
    logger.writeInfo(JSON.stringify({ issues, summary, results }, null, 2) + '\n');
    return;
  }

  if (flags.quiet && summary.errorCount === 0) return;

  const { adaptRawIssuesToEslintFormat, transformToStructuredData } = require(dataAdaptersPath);
  const { success } = require(loggerPath);

  const adaptedIssues = adaptRawIssuesToEslintFormat(issues);
  const structuredData = transformToStructuredData(adaptedIssues);

  // When called by harness in debug mode, suppress summary to avoid duplicate summary output
  if (process.env.CALLED_BY_HARNESS && flags.debug) {
    structuredData.summary.hasSummary = false;
  }

  // Use unified logger interface with lint formatting
  logger.info(structuredData, { format: 'lint' });

  const { fixedCount = 0, errorCount = 0, warningCount = 0 } = summary;
  if (fixedCount > 0) {
    success(`✔ ${fixedCount} issue${fixedCount > 1 ? 's' : ''} auto-fixed.`);
  }

  const totalProblems = errorCount + warningCount;

  if (issues.length === 0 && fixedCount === 0) {
    success('✔ No problems found.');
  } else if (totalProblems === 0 && fixedCount > 0) {
    success('✔ All fixable issues addressed.');
  }
  
  // If called by harness in debug mode, output JSON for parsing after debug output
  if (process.env.CALLED_BY_HARNESS && flags.debug) {
    console.log(JSON.stringify({ issues, summary, results }));
  }
}

module.exports = {
  highlightMatch,
  applyStyle,
  renderLintResults,
  renderLintOutput
};
