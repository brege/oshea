const { handleValidationCommand } = require('../../plugin-contract');

module.exports = {
  command: 'lint <pluginIdentifier>',
  describe: 'Validate a plugin\'s file structure and metadata.',
  builder: (yargs) => {
    yargs.positional('pluginIdentifier', {
      describe: 'The name or path of the plugin to lint.',
      type: 'string',
    });
  },
  handler: async (argv) => {
    // Uses a new shared handler to run only structural checks
    await handleValidationCommand(argv.pluginIdentifier, { structuralOnly: true });
  },
};
