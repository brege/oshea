// src/commands/plugin/helpCmd.js
const { displayPluginHelp } = require('../../get_help'); // Adjusted path

module.exports = {
  command: 'help <pluginName>',
  describe: 'Display detailed help for a specific plugin.',
  builder: (yargs) => {
    yargs
      .positional('pluginName', {
        describe: 'Name of the plugin for which to display help.',
        type: 'string'
      });
  },
  handler: async (args) => {
    try {
      // Ensure isLazyLoad is false if displayPluginHelp or its dependencies (like ConfigResolver) use it.
      // displayPluginHelp itself passes args down, so this should be fine.
      args.isLazyLoad = false; 
      await displayPluginHelp(args.pluginName, args);
    } catch (error) {
      console.error(`ERROR displaying help for plugin '${args.pluginName}': ${error.message}`);
      if (error.stack) console.error(error.stack);
      process.exit(1);
    }
  }
};
