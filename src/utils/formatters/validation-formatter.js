// src/utils/formatters/validation-formatter.js
// Plugin validation formatter - handles validation output with clean data contracts

const { colorThemePath } = require('@paths');
const { theme } = require(colorThemePath);

// Returns a colored string for the given level using gruvbox theme
function colorForLevel(level, message) {
  if (level === 'error' || level === 'fatal') return theme.error(message);
  if (level === 'warn') return theme.warn(message);
  if (level === 'success') return theme.success(message);
  if (level === 'info') return theme.info(message);
  if (level === 'validation') return theme.validation(message);
  if (level === 'detail') return theme.detail(message);
  if (level === 'debug') return theme.debug(message);
  return message;
}

// Format validation session header
function formatValidationHeader(level, message, meta = {}) {
  const { protocol, pluginName } = message;
  console.log(colorForLevel(level, `Starting ${protocol} plugin validation checks`));
}

// Format validation step progress (inline updates)
function formatValidationStep(level, message, meta = {}) {
  const { stepName, status, details = [] } = message;

  if (status === 'testing') {
    // Start of step - print step name and wait for result
    process.stdout.write(`  ${colorForLevel('info', `Checking ${stepName}...`)} `);
  } else if (status === 'passed') {
    // Step passed - complete the line and show details
    console.log(colorForLevel('success', '✓ OK'));
    details.forEach(detail => {
      if (detail.type === 'success') {
        console.log(`    ${colorForLevel('success', `✓ ${detail.message}`)}`);
      } else if (detail.type === 'info') {
        console.log(`    ${colorForLevel('info', `• ${detail.message}`)}`);
      } else if (detail.type === 'testOutput') {
        // Handle test output embedded in details
        console.log(`    ${detail.message}`);
      }
    });
  } else if (status === 'failed') {
    // Step failed - complete the line and show details
    console.log(colorForLevel('error', '✗ FAIL'));
    details.forEach(detail => {
      if (detail.type === 'error') {
        console.log(`    ${colorForLevel('error', `✗ ${detail.message}`)}`);
      } else if (detail.type === 'warn') {
        console.log(`    ${colorForLevel('warn', `○ ${detail.message}`)}`);
      }
    });
  } else if (status === 'warning') {
    // Step has warnings - complete the line and show details
    console.log(colorForLevel('warn', '○ WARN'));
    details.forEach(detail => {
      if (detail.type === 'warn') {
        console.log(`    ${colorForLevel('warn', `○ ${detail.message}`)}`);
      }
    });
  } else if (status === 'skipped') {
    // Step skipped - complete the line
    console.log(colorForLevel('debug', '○ SKIP'));
    details.forEach(detail => {
      if (detail.type === 'info') {
        console.log(`    ${colorForLevel('debug', `• ${detail.message}`)}`);
      }
    });
  }
}

// Format test output (mocha results)
function formatValidationTest(level, message, meta = {}) {
  const { testOutput } = message;
  // For now, pass through test output as-is since mocha has its own formatting
  // TODO: Could parse and reformat mocha output for consistency
  console.log(testOutput);
}

// Format validation summary and final result
function formatValidationSummary(level, message, meta = {}) {
  const {
    pluginName,
    isValid,
    errorCount = 0,
    warningCount = 0,
    errors = [],
    warnings = []
  } = message;

  console.log(colorForLevel(level, '--- Validation Summary ---'));

  if (isValid) {
    if (warningCount === 0) {
      console.log(colorForLevel('success', `✓ Plugin '${pluginName}' is VALID.`));
      console.log(colorForLevel('success', 'No warnings found.'));
    } else {
      console.log(colorForLevel('warn', `○ Plugin '${pluginName}' is VALID with ${warningCount} warning(s).`));
      warnings.forEach(warning => {
        console.log(colorForLevel('warn', `  ○ ${warning}`));
      });
    }
  } else {
    console.log(colorForLevel('error', `✗ Plugin '${pluginName}' is INVALID.`));
    console.log(colorForLevel('error', `Found ${errorCount} error(s) and ${warningCount} warning(s):`));

    errors.forEach(error => {
      console.log(colorForLevel('error', `  ✗ ${error}`));
    });

    if (warningCount > 0) {
      warnings.forEach(warning => {
        console.log(colorForLevel('warn', `  ○ ${warning}`));
      });
    }
  }
}

module.exports = {
  formatValidationHeader,
  formatValidationStep,
  formatValidationTest,
  formatValidationSummary
};
