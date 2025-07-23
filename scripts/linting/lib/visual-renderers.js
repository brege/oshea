// scripts/linting/lib/visual-renderers.js
// Visual formatting and console output functions
require('module-alias/register');
const { dataAdaptersPath, loggerPath } = require('@paths');
const logger = require(loggerPath);


function renderLintOutput({ issues = [], summary = {}, results = [], flags = {} }, formatter = 'stylish') {
  // If called by harness but in debug mode, allow debug output to flow first
  if (process.env.CALLED_BY_HARNESS && !flags.debug) {
    logger.info(JSON.stringify({ issues, summary, results }), { format: 'raw' });
    return;
  } else if (process.env.CALLED_BY_HARNESS && flags.debug) {
    // In debug mode: show formatted output AND return JSON for harness
    // Let the debug output flow through below, then output JSON at the end
  }

  // If user explicitly requested JSON, output formatted JSON
  if (flags.json) {
    logger.info(JSON.stringify({ issues, summary, results }, null, 2) + '\n', { format: 'inline' });
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
    logger.info(JSON.stringify({ issues, summary, results }), { format: 'raw' });
  }
}

module.exports = {
  renderLintOutput
};
