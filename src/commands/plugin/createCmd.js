// src/commands/plugin/createCmd.js
const { scaffoldPlugin } = require('../../plugin_scaffolder'); // Adjusted path

module.exports = {
  command: 'create <pluginName>',
  describe: 'Create a new plugin boilerplate.',
  builder: (yargs) => {
    yargs
      .positional('pluginName', {
        describe: 'Name for the new plugin.',
        type: 'string'
      })
      .option('dir', {
        describe: 'Directory to create the plugin in. Defaults to current directory.',
        type: 'string',
        normalize: true // Ensures path is normalized
      })
      .option('force', {
        describe: 'Overwrite existing plugin directory if it exists.',
        type: 'boolean',
        default: false
      });
  },
  handler: async (args) => {
    try {
      const success = await scaffoldPlugin(args.pluginName, args.dir, args.force);
      if (!success) {
        // scaffoldPlugin already logs errors, so we might not need to repeat.
        // If scaffoldPlugin throws on error, this process.exit might not be reached
        // unless we catch specific errors from it.
        // For now, assuming scaffoldPlugin handles its own error logging sufficiently.
        process.exit(1); // Exit with error if scaffolding indicated failure
      }
    } catch (error) {
      console.error(`ERROR during 'plugin create ${args.pluginName}': ${error.message}`);
      if (error.stack) console.error(error.stack);
      process.exit(1);
    }
  }
};
