// src/utils/formatters/workflow-test-formatter.js
// Workflow test result formatter - extends smoke-test-formatter for Level 4 sequential workflows

const { colorThemePath } = require('@paths');
const { theme } = require(colorThemePath);

// Format workflow test suite header
function formatWorkflowSuiteHeader(level, message, meta = {}) {
  const { suiteName } = message;
  console.log(colorForLevel(level, `Smoke Test: ${suiteName}...`));
}

// Format individual workflow step (inline progress with atomic numbering)
function formatWorkflowStep(level, message, meta = {}) {
  const { description, command, status, reason } = message;

  if (status === 'testing') {
    // Start of step - show atomic number and description
    if (description) {
      process.stdout.write(`      ${colorForLevel('detail', description)} ... `);
    } else {
      // Fallback for legacy format
      process.stdout.write(`      ${colorForLevel('detail', `Testing: ${command}`)} ... `);
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
  }
}

// Format workflow session header
function formatWorkflowHeader(level, message, meta = {}) {
  console.log(''); // spacing before header
  console.log(colorForLevel(level, '─'.repeat(60)));
  console.log(colorForLevel(level, 'Level 4 Workflow Tests'));
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
    console.log(`  ${theme.success(`${index + 1}.`)} ${theme.info(block.name)}`);
    console.log(`     ${theme.detail('Steps:')} ${theme.context(block.stepCount)}`);

    if (block.tags && block.tags.length > 0) {
      console.log(`     ${theme.detail('Tags:')} ${theme.context(block.tags.join(', '))}`);
    }

    console.log(''); // spacing between blocks
  });
}

// Format final workflow results summary
function formatWorkflowResults(level, message, meta = {}) {
  const { suiteCount, failedScenarios = [] } = message;

  console.log(''); // spacing before results

  if (failedScenarios.length > 0) {
    // Failed workflows
    console.log(colorForLevel('error', '--- Workflow Tests Failed ---'));
    console.log(colorForLevel('error', `${failedScenarios.length} scenario(s) failed across ${suiteCount} test suite(s):`));
    console.log(''); // spacing

    const failuresBySuite = {};
    failedScenarios.forEach(failure => {
      if (!failuresBySuite[failure.suite]) {
        failuresBySuite[failure.suite] = [];
      }
      failuresBySuite[failure.suite].push(failure);
    });

    Object.entries(failuresBySuite).forEach(([suiteName, failures]) => {
      console.log(colorForLevel('error', `${suiteName}: ${failures.length} failures`));
      failures.forEach(failure => {
        console.log(`  ${theme.context('- ')}${failure.scenario}`);
        console.log(`    ${theme.detail('Command:')} ${theme.path(failure.command)}`);
        console.log(`    ${theme.detail('Reason:')} ${failure.reason}`);
      });
      console.log(''); // spacing between suites
    });

    process.exit(1);
  } else {
    // Success
    console.log(colorForLevel('success', `✓ All workflow tests passed (${suiteCount} test suite(s))`));
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

module.exports = {
  formatWorkflowSuiteHeader,
  formatWorkflowStep,
  formatWorkflowHeader,
  formatWorkflowWarning,
  formatWorkflowList,
  formatWorkflowResults
};