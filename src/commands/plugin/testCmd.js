const { handleValidationCommand } = require('../../plugin-contract');

module.exports = {
  command: 'test <pluginIdentifier>',
  describe: 'Run the in-situ E2E tests for a specific plugin.',
  builder: (yargs) => {
    yargs.positional('pluginIdentifier', {
      describe: 'The name or path of the plugin to test.',
      type: 'string',
    });
  },
  handler: async (argv) => {
    // Uses a new shared handler to run only the e2e test check
    await handleValidationCommand(argv.pluginIdentifier, { testOnly: true });
  },
};
