// src/cli/commands/plugin/helpCmd.js
const { getHelpPath } = require('@paths');
const { displayPluginHelp } = require(getHelpPath);

module.exports = {
  command: 'help <pluginName>',
  describe: 'display detailed help for a plugin',
  builder: (yargs) => {
    yargs
      .positional('pluginName', {
        describe: 'name of plugin to display help for',
        type: 'string',
        completionKey: 'usablePlugins'
      })
  },
  handler: async (args) => {
    // This guard prevents the handler from running during any completion activity.
    if ('get-yargs-completions' in args) {
      return;
    }

    try {
      args.isLazyLoad = false;
      await displayPluginHelp(args.pluginName, args.manager, args);
    } catch (error) {
      console.error(`ERROR displaying help for plugin '${args.pluginName}': ${error.message}`);
      if (error.stack) console.error(error.stack);
      process.exit(1);
    }
  }
};
