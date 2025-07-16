// scripts/shared/formatters.js

const chalk = require('chalk');
const path = require('path');

function padRight(str = '', len) {
  return str.length >= len ? str : str + ' '.repeat(len - str.length);
}

function createLintResult(filePath, messages = []) {
  const errorCount = messages.filter(msg => msg.severity === 2).length;
  const warningCount = messages.filter(msg => msg.severity === 1).length;

  return {
    filePath: path.resolve(filePath),
    messages: messages.map(msg => ({
      ruleId: msg.rule || msg.ruleId || 'unknown',
      severity: msg.severity === 2 ? 2 : 1,
      message: msg.message || '',
      line: msg.line || 1,
      column: msg.column || 1,
      nodeType: msg.nodeType || null,
      source: msg.source || null,
      fix: msg.fix || null,
    })),
    errorCount,
    warningCount,
    source: null,
  };
}

const formatters = {
  stylish(results) {
    let output = '';
    let totalErrors = 0;
    let totalWarnings = 0;

    for (const result of results) {
      const { filePath, messages, errorCount, warningCount } = result;
      if (messages.length === 0) continue;

      totalErrors += errorCount;
      totalWarnings += warningCount;

      const relPath = path.relative(process.cwd(), filePath);
      output += `\n${relPath}\n`;

      for (const msg of messages) {
        const location = `${msg.line}:${msg.column}`;
        const locationStr = chalk.gray(padRight(location, 8));

        const levelText = msg.severity === 2 ? 'error' : 'warning';
        const levelColor = msg.severity === 2 ? chalk.red : chalk.yellow;
        const levelStr = levelColor(padRight(levelText, 8));

        const message = padRight(msg.message.replace(/\.$/, ''), 45);
        const ruleId = chalk.dim(msg.ruleId || '');

        output += `  ${locationStr} ${levelStr} ${message} ${ruleId}\n`;
      }
    }

    const totalProblems = totalErrors + totalWarnings;
    if (totalProblems > 0) {
      output += '\n';
      const x = totalErrors > 0 ? chalk.red('✖') : chalk.yellow('✖');
      output += `${x} ${totalProblems} problem${totalProblems !== 1 ? 's' : ''} (${totalErrors} error${totalErrors !== 1 ? 's' : ''}, ${totalWarnings} warning${totalWarnings !== 1 ? 's' : ''})`;
    } else {
      output += chalk.green('\n✔ No problems');
    }

    return output.trim();
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
      severity: issue.severity === 2 ? 2 : 1,
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
  formatters,
  createLintResult,
  formatLintResults,
  adaptRawIssuesToEslintFormat,
};

