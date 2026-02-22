// scripts/linting/lib/data-adapters.js
// Pure data transformation functions - no styling, no console output

const path = require('node:path');

function padRight(str = '', len) {
  return str.length >= len ? str : str + ' '.repeat(len - str.length);
}

function createLintResult(filePath, messages = []) {
  const errorCount = messages.filter((msg) => msg.severity === 2).length;
  const warningCount = messages.filter((msg) => msg.severity === 1).length;

  return {
    filePath: path.resolve(filePath),
    messages: messages.map((msg) => ({
      ruleId: msg.rule || msg.ruleId || 'unknown',
      severity: msg.severity === 2 ? 2 : 1,
      message: msg.message || '',
      line: msg.line || 1,
      column: msg.column || 1,
      nodeType: msg.nodeType || null,
      source: msg.source || null,
      fix: msg.fix || null,
      // pass through highlighting fields if present
      matchedText: msg.matchedText,
      sourceLine: msg.sourceLine,
    })),
    errorCount,
    warningCount,
    source: null,
  };
}

function adaptRawIssuesToEslintFormat(rawIssues) {
  if (
    Array.isArray(rawIssues) &&
    rawIssues.every((item) => item && typeof item.filePath === 'string')
  ) {
    return rawIssues;
  }
  if (!rawIssues || rawIssues.length === 0) {
    return [];
  }

  const resultsByFile = {};

  rawIssues.forEach((issue) => {
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
      matchedText: issue.matchedText,
      sourceLine: issue.sourceLine,
    });
  });

  return Object.keys(resultsByFile).map((filePath) =>
    createLintResult(filePath, resultsByFile[filePath]),
  );
}

// Transform ESLint results into structured data for rendering
function transformToStructuredData(results) {
  if (results.length === 0) {
    return {
      type: 'empty',
      sections: [],
      summary: { totalErrors: 0, totalWarnings: 0, totalProblems: 0 },
    };
  }

  let totalErrors = 0;
  let totalWarnings = 0;
  const sections = [];

  for (const result of results) {
    const { filePath, messages, errorCount, warningCount } = result;
    if (messages.length === 0) continue;

    totalErrors += errorCount;
    totalWarnings += warningCount;

    const relPath = path.relative(process.cwd(), filePath);

    const section = {
      header: {
        text: relPath,
        style: 'underline',
      },
      messages: [],
    };

    for (const msg of messages) {
      const location = `${msg.line}:${msg.column}`;
      const levelText = msg.severity === 2 ? 'error' : 'warning';
      const message = padRight(msg.message.replace(/\.$/, ''), 45);

      const formattedMessage = {
        location: {
          text: padRight(location, 8),
          style: 'dim',
        },
        level: {
          text: padRight(levelText, 8),
          severity: msg.severity,
        },
        message: message,
        rule: {
          text: msg.ruleId || '',
          style: 'dim',
        },
      };

      if (msg.sourceLine && msg.matchedText) {
        formattedMessage.sourceLine = {
          text: msg.sourceLine,
          highlight: msg.matchedText,
        };
      }

      section.messages.push(formattedMessage);
    }

    sections.push(section);
  }

  const totalProblems = totalErrors + totalWarnings;

  return {
    type: 'stylish',
    sections,
    summary: {
      totalErrors,
      totalWarnings,
      totalProblems,
      hasSummary: totalProblems > 0,
    },
  };
}

module.exports = {
  padRight,
  createLintResult,
  adaptRawIssuesToEslintFormat,
  transformToStructuredData,
};
