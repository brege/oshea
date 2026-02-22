// src/utils/formatters/yaml-test.formatter.js
// YAML-based test result formatter - unified formatter for smoke tests and workflow tests
/* eslint-disable camelcase */

const { colorThemePath } = require('@paths');
const { theme } = require(colorThemePath);

// Format workflow test suite header
function formatWorkflowSuiteHeader(level, message, meta = {}) {
  const { suiteName } = message;
  console.log(colorForLevel(level, `${suiteName}...`));
}

// Format individual workflow step (inline progress with atomic numbering)
function formatWorkflowStep(level, message, meta = {}) {
  const { description, command, status, reason, test_id } = message;

  if (status === 'testing') {
    // Start of step - show test_id and description
    if (description) {
      if (test_id) {
        process.stdout.write(
          `      ${colorForLevel('success', `[${test_id}]`)} ${colorForLevel('detail', description)} ... `,
        );
      } else {
        process.stdout.write(
          `      ${colorForLevel('detail', description)} ... `,
        );
      }
    } else {
      // Fallback for legacy format
      process.stdout.write(
        `      ${colorForLevel('detail', `Testing: ${command}`)} ... `,
      );
    }
  } else if (status === 'passed') {
    // Step passed - complete the line
    console.log(colorForLevel('success', '✓ OK'));
  } else if (status === 'failed') {
    // Step failed - complete the line and show reason if available
    console.log(colorForLevel('error', '✗ FAIL'));
    if (reason) {
      console.log(`        ${colorForLevel('error', `Reason: ${reason}`)}`);
    }
  } else if (status === 'skipped') {
    // Step skipped - complete the line
    console.log(colorForLevel('warn', '○ SKIP'));
  }
}

// Format workflow session header
function formatWorkflowHeader(level, message, meta = {}) {
  const { title = 'YAML Tests' } = message;
  console.log(''); // spacing before header
  console.log(colorForLevel(level, '─'.repeat(60)));
  console.log(colorForLevel(level, title));
  console.log(colorForLevel(level, '─'.repeat(60)));
  console.log(''); // spacing after header
}

// Format workflow warnings (stderr output)
function formatWorkflowWarning(level, message, meta = {}) {
  const { stderr } = message;
  const stderrText = stderr ? stderr.trim() : 'No stderr provided';
  console.log(`    ${colorForLevel(level, `Warning (stderr): ${stderrText}`)}`);
}

// Format workflow test list (--list output)
function formatWorkflowList(level, message, meta = {}) {
  const { blocks } = message;

  console.log(''); // spacing before list
  console.log(colorForLevel('info', 'Available workflow test blocks:'));
  console.log(''); // spacing after header

  blocks.forEach((block, index) => {
    console.log(
      `  ${theme.success(`${index + 1}.`)} ${theme.info(block.name)}`,
    );
    console.log(
      `     ${theme.detail('Steps:')} ${theme.context(block.stepCount)}`,
    );

    if (block.tags && block.tags.length > 0) {
      console.log(
        `     ${theme.detail('Tags:')} ${theme.context(block.tags.join(', '))}`,
      );
    }

    console.log(''); // spacing between blocks
  });
}

// Format final workflow results summary
function formatWorkflowResults(level, message, meta = {}) {
  const { suiteCount, failedScenarios = [], allResults } = message;

  // Handle both data formats
  const actualSuiteCount =
    suiteCount !== undefined ? suiteCount : allResults ? allResults.length : 0;
  const actualFailedScenarios =
    failedScenarios.length > 0 ? failedScenarios : [];

  console.log(''); // spacing before results

  if (actualFailedScenarios.length > 0) {
    // Failed workflows
    console.log(colorForLevel('error', '--- Workflow Tests Failed ---'));
    console.log(
      colorForLevel(
        'error',
        `${actualFailedScenarios.length} scenario(s) failed across ${actualSuiteCount} test suite(s):`,
      ),
    );
    console.log(''); // spacing

    const failuresBySuite = {};
    actualFailedScenarios.forEach((failure) => {
      if (!failuresBySuite[failure.suite]) {
        failuresBySuite[failure.suite] = [];
      }
      failuresBySuite[failure.suite].push(failure);
    });

    Object.entries(failuresBySuite).forEach(([suiteName, failures]) => {
      console.log(
        colorForLevel('error', `${suiteName}: ${failures.length} failures`),
      );
      failures.forEach((failure) => {
        console.log(`  ${theme.context('- ')}${failure.scenario}`);
        console.log(
          `    ${theme.detail('Command:')} ${theme.path(failure.command)}`,
        );
        console.log(`    ${theme.detail('Reason:')} ${failure.reason}`);
      });
      console.log(''); // spacing between suites
    });

    process.exit(1);
  } else {
    // Success
    const suiteText = actualSuiteCount === 1 ? 'test suite' : 'test suites';
    console.log(
      colorForLevel(
        'success',
        `✓ All workflow tests passed (${actualSuiteCount} ${suiteText})`,
      ),
    );
  }
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

// ============================================================================
// ShowMode Formatters - Clean visual inspection mode with minimal headers
// ============================================================================

// Format session header once (Level 3/4 Tests)
function formatYamlShowSession(level, message, meta = {}) {
  const { title } = message;
  console.log(''); // spacing
  console.log('─'.repeat(60));
  console.log(title);
  console.log('─'.repeat(60));
}

// Format test suite name with minimal separator
function formatYamlShowSuite(level, message, meta = {}) {
  const { suiteName } = message;
  console.log(suiteName);
  console.log('─'.repeat(38)); // shorter separator
}

// Format scenario with grey command
function formatYamlShowScenario(level, message, meta = {}) {
  const { description, command, test_id } = message;

  // Show test_id and description
  if (test_id) {
    console.log(`${theme.success(`[${test_id}]`)} ${description}`);
  } else {
    console.log(description);
  }

  // Use theme.detail for grey command styling
  console.log(`Command: ${theme.detail(command)}`);
  console.log(''); // spacing before output
}

// Format separator between scenarios
function formatYamlShowSeparator(level, message, meta = {}) {
  console.log('─'.repeat(38));
}

// Format command output with preserved colors (no extra formatting)
function formatYamlShowOutput(level, message, meta = {}) {
  const { result } = message;
  if (result.stdout) {
    console.log(result.stdout); // lint-skip-line no-console
  }
  if (result.stderr) {
    console.warn('\nSTDERR:'); // lint-skip-line no-console
    console.log(result.stderr); // lint-skip-line no-console
  }
}

// Format error information cleanly
function formatYamlShowError(level, message, meta = {}) {
  const { error } = message;
  console.error(`Failed to execute: ${error.message}`); // lint-skip-line no-console
  if (error.stdout) {
    console.log(error.stdout); // lint-skip-line no-console
  }
  if (error.stderr) {
    console.warn('STDERR:'); // lint-skip-line no-console
    console.log(error.stderr); // lint-skip-line no-console
  }
}

module.exports = {
  formatWorkflowSuiteHeader,
  formatWorkflowStep,
  formatWorkflowHeader,
  formatWorkflowWarning,
  formatWorkflowList,
  formatWorkflowResults,
  formatYamlShowSession,
  formatYamlShowSuite,
  formatYamlShowScenario,
  formatYamlShowSeparator,
  formatYamlShowOutput,
  formatYamlShowError,
};
