// src/commands/plugin/helpCmd.js
const { displayPluginHelp } = require('../../get_help');

module.exports = {
  command: 'help <pluginName>',
  describe: 'display detailed help for a plugin',
  builder: (yargs) => {
    yargs
      .positional('pluginName', {
        describe: 'name of plugin to display help for',
        type: 'string'
      });
  },
  handler: async (args) => {
    try {
      args.isLazyLoad = false; 
      await displayPluginHelp(args.pluginName, args);
    } catch (error) {
      console.error(`ERROR displaying help for plugin '${args.pluginName}': ${error.message}`);
      if (error.stack) console.error(error.stack);
      process.exit(1);
    }
  }
};
