// scripts/shared/formatters.js
const chalk = require('chalk');
const path = require('path');

function padRight(str = '', len) {
  return str + ' '.repeat(Math.max(0, len - str.length));
}

function formatProblem({ file, line = 1, column = 1, message, rule, severity = 'warning' }) {
  const loc = `${line}:${column}`;
  const color = severity === 'error' ? chalk.red : chalk.yellow;
  return `${chalk.gray(padRight(file, 36))} ${chalk.gray(padRight(loc, 6))} ${color(padRight(severity, 8))} ${padRight(message, 50)} ${chalk.dim(rule)}`;
}

function createLintResult(filePath, messages = []) {
  const errorCount = messages.filter(msg => msg.severity === 2).length;
  const warningCount = messages.filter(msg => msg.severity === 1).length;

  return {
    filePath: path.resolve(filePath),
    messages: messages.map(msg => ({
      ruleId: msg.rule || msg.ruleId || 'unknown',
      severity: msg.severity || (msg.level === 'error' ? 2 : 1),
      message: msg.message || '',
      line: msg.line || 1,
      column: msg.column || 1,
      nodeType: msg.nodeType || null,
      source: msg.source || null,
      fix: msg.fix || null
    })),
    errorCount,
    warningCount,
    source: null
  };
}

const formatters = {
  stylish: function(results) {
    let output = '';
    let totalErrors = 0;
    let totalWarnings = 0;

    results.forEach(result => {
      const { filePath, messages, errorCount, warningCount } = result;

      if (messages.length === 0) return;

      totalErrors += errorCount;
      totalWarnings += warningCount;

      output += `\n${chalk.underline(path.relative(process.cwd(), filePath))}\n`;

      messages.forEach(message => {
        const { line, column, severity, message: msg, ruleId } = message;
        const levelColor = severity === 2 ? chalk.red : chalk.yellow;
        const levelText = severity === 2 ? 'error' : 'warning';

        output += `  ${chalk.dim(`${line}:${column}`)}  `;
        output += `${levelColor(levelText)}  `;
        output += `${msg}  `;
        output += `${chalk.dim(ruleId || '')}\n`;
      });
    });

    if (totalErrors > 0 || totalWarnings > 0) {
      output += `\n${chalk.red('✖')} ${totalErrors + totalWarnings} problems `;
      output += `(${chalk.red(`${totalErrors} errors`)}, ${chalk.yellow(`${totalWarnings} warnings`)})`;
    }

    return output;
  },
};

function formatLintResults(results, formatter = 'stylish') {
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

function adaptRawIssuesToEslintFormat(rawIssues) {
  if (!rawIssues || rawIssues.length === 0) {
    return [];
  }

  const resultsByFile = {};

  rawIssues.forEach(issue => {
    const filePath = issue.file || 'unknown-file';
    if (!resultsByFile[filePath]) {
      resultsByFile[filePath] = [];
    }

    resultsByFile[filePath].push({
      ruleId: issue.rule || 'unknown-rule',
      severity: 2,
      message: issue.message || '',
      line: issue.line || 1,
      column: issue.column || 1,
    });
  });

  return Object.keys(resultsByFile).map(filePath =>
    createLintResult(filePath, resultsByFile[filePath])
  );
}

module.exports = {
  formatProblem,
  createLintResult,
  formatLintResults,
  formatters,
  adaptRawIssuesToEslintFormat
};
