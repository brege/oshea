// test/runners/e2e/test-runner-factory.js
require('module-alias/register');
const { e2eHarness } = require('@paths');
const { expect } = require('chai');
const { TestHarness } = require(e2eHarness);


function createE2eTestRunner(commandName, manifestPath, options = {}) {
  const { timeout = 15000 } = options;
  const testManifest = require(manifestPath);

  const commandSourceMap = {
    'collection add': 'src/cli/commands/collection/add.command.js',
    'collection list': 'src/cli/commands/collection/list.command.js',
    'collection remove': 'src/cli/commands/collection/remove.command.js',
    'collection update': 'src/cli/commands/collection/update.command.js',
    'config': 'src/cli/commands/config.command.js',
    'convert': 'src/cli/commands/convert.command.js',
    'generate': 'src/cli/commands/generate.command.js',
    'global flags': 'cli.js',
    'plugin add': 'src/cli/commands/plugin/add.command.js',
    'plugin create': 'src/cli/commands/plugin/create.command.js',
    'plugin disable': 'src/cli/commands/plugin/disable.command.js',
    'plugin enable': 'src/cli/commands/plugin/enable.command.js',
    'plugin list': 'src/cli/commands/plugin/list.command.js',
    'plugin validate': 'src/cli/commands/plugin/validate.command.js',
  };

  const sourcePath = commandSourceMap[commandName] || 'cli.js';
  const testType = 'End-to-End Test';
  const describeTitle = `${commandName} (${testType}) ${sourcePath}`;

  describe(describeTitle, function() {
    this.timeout(timeout);

    testManifest.forEach(testCase => {
      const it_ = testCase.skip ? it.skip : it;

      it_(testCase.describe, async () => {
        const harness = new TestHarness();
        try {
          const sandboxDir = await harness.createSandbox();

          if (testCase.setup) {
            await testCase.setup(sandboxDir, harness);
          }

          const args = testCase.args(sandboxDir);
          const cliOptions = { useFactoryDefaults: testCase.useFactoryDefaults !== false };
          const result = await harness.runCli(args, cliOptions);

          await testCase.assert(result, sandboxDir, expect);
        } finally {
          await harness.cleanup();
        }
      });
    });
  });
}

module.exports = { createE2eTestRunner };
