// src/utils/formatters/smoke-test-formatter.js
// Smoke test result formatter - handles OK/Fail display with clean data contracts

const { colorThemePath } = require('@paths');
const { theme } = require(colorThemePath);

// Format smoke test suite header
function formatSuiteHeader(level, message, meta = {}) {
  const { suiteName } = message;
  console.log(colorForLevel(level, `Smoke Test: ${suiteName}...`));
}

// Format individual scenario testing (inline progress)
function formatScenarioProgress(level, message, meta = {}) {
  const { command, status } = message;

  if (status === 'testing') {
    // Start of test - print command and wait for result
    process.stdout.write(`  ${colorForLevel('detail', `Testing: ${command}`)} ... `);
  } else if (status === 'passed') {
    // Test passed - complete the line
    console.log(colorForLevel('success', '✓ OK'));
  } else if (status === 'failed') {
    // Test failed - complete the line
    console.log(colorForLevel('error', '✗ FAIL'));
  }
}

// Format warnings (stderr output)
function formatScenarioWarning(level, message, meta = {}) {
  const { stderr } = message;
  const stderrText = stderr ? stderr.trim() : 'No stderr provided';
  console.log(`    ${colorForLevel(level, `Warning (stderr): ${stderrText}`)}`);
}

// Format final smoke test results summary
function formatSmokeResults(level, message, meta = {}) {
  const { allResults = [], totalFailed = 0 } = message;

  console.log(''); // spacing before results

  if (totalFailed > 0) {
    // Failed results
    console.log(colorForLevel('error', '--- Smoke Tests Failed ---'));
    console.log(colorForLevel('error', `${totalFailed} scenario(s) failed across ${allResults.length} test suites:`));

    allResults.forEach(result => {
      if (result.failedCount > 0) {
        console.log(''); // spacing between suites
        console.log(colorForLevel('error', `${result.suiteName}: ${result.failedCount} failures`));

        result.failedScenarios.forEach(({ scenario, command, reason, stderr }) => {
          console.log(`  ${theme.context('-')} ${scenario}`);
          console.log(`    ${theme.detail('Command:')} ${theme.path(command)}`);
          console.log(`    ${theme.detail('Reason:')} ${reason}`);
          if (stderr) {
            const stderrText = typeof stderr === 'string' ? stderr.trim() : String(stderr);
            console.log(`    ${theme.detail('Stderr:')} ${stderrText}`);
          }
        });
      }
    });
  } else {
    // Success results
    const totalScenarios = allResults.reduce((sum, r) => sum + r.results.length, 0);
    console.log(colorForLevel('success', `✓ All Smoke Tests Passed: ${totalScenarios} scenarios across ${allResults.length} test suites executed successfully.`));
  }

  console.log(''); // spacing after results
}

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

// Format overall smoke test session header
function formatSmokeHeader(level, message, meta = {}) {
  console.log(colorForLevel(level, '='.repeat(60)));
  console.log(colorForLevel(level, 'CLI Smoke Tests'));
  console.log(colorForLevel(level, '='.repeat(60)));
  console.log(''); // spacing after header
}

module.exports = {
  formatSuiteHeader,
  formatScenarioProgress,
  formatScenarioWarning,
  formatSmokeResults,
  formatSmokeHeader
};