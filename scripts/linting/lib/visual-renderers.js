// scripts/linting/lib/visual-renderers.js
// Visual formatting and console output functions
require('module-alias/register');
const { dataAdaptersPath, loggerPath } = require('@paths');

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

function printDebugResults(results = [], options = {}) {
  if (!options.debug || results.length === 0) return;

  const isMochaPattern = results[0] && 'pattern' in results[0];

  if (isMochaPattern) {
    console.log('\n[DEBUG] Validated patterns extracted from .mocharc.js:\n');
    for (const r of results) {
      const symbol = r.type === 'found' ? chalk.green('[✓]') : chalk.red('[✗]');
      const trail = r.count ? chalk.gray(`→ ${r.count} file(s) matched`) : (r.type === 'missing' ? chalk.gray('→ NOT FOUND') : '');
      console.log(`  ${symbol} ${r.pattern} ${trail}`);
    }
    return;
  }

  // Default output for paths-js-validator results
  console.log('\n[DEBUG] Validated registry entries:\n');
  const maxKeyLength = Math.max(...results.map(r => (r.name || '').length));
  for (const entry of results) {
    const symbol = entry.type === 'found' ? chalk.green('[✓]') : entry.type === 'missing' ? chalk.red('[✗]') : chalk.gray('[–]');
    const trail = entry.type === 'missing' ? chalk.gray('→ NOT FOUND') : (entry.type === 'ignored' ? chalk.gray('→ IGNORED') : '');
    console.log(`  ${symbol} ${(entry.name || '').padEnd(maxKeyLength)} → ${entry.filePath} ${trail}`);
  }
  console.log('');
}

function renderLintOutput({ issues = [], summary = {}, results = [], flags = {} }, formatter = 'stylish') {
  // Always output the full JSON blob first if requested, then exit.
  if (flags.json) {
    process.stdout.write(JSON.stringify({ issues, summary, results }, null, 2) + '\n');
    return;
  }

  if (flags.quiet && summary.errorCount === 0) return;

  const { adaptRawIssuesToEslintFormat, transformToStructuredData } = require(dataAdaptersPath);
  const logger = require(loggerPath);

  const adaptedIssues = adaptRawIssuesToEslintFormat(issues);
  const structuredData = transformToStructuredData(adaptedIssues);

  // Use logger's formatLint method
  logger.formatLint(structuredData);

  const { fixedCount = 0, errorCount = 0, warningCount = 0 } = summary;
  if (fixedCount > 0) {
    logger.success(`✔ ${fixedCount} issue${fixedCount > 1 ? 's' : ''} auto-fixed.`);
  }

  const totalProblems = errorCount + warningCount;

  if (issues.length === 0 && fixedCount === 0) {
    logger.success('✔ No problems found.');
  } else if (totalProblems === 0 && fixedCount > 0) {
    logger.success('✔ All fixable issues addressed.');
  }

  printDebugResults(results, flags);
}

module.exports = {
  highlightMatch,
  applyStyle,
  renderLintResults,
  printDebugResults,
  renderLintOutput
};
