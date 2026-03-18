// src/cli/plugin.command.js
const sharedHelpOptionKeys = [
  'config',
  'factory-defaults',
  'plugins-root',
  'debug',
  'stack',
];
const sharedHelpEpilogue =
  "See 'oshea --help' for global usage and shared options.";

function collapseSharedHelp(yargs) {
  for (const key of sharedHelpOptionKeys) {
    yargs.hide(key);
  }
  return yargs.epilogue(sharedHelpEpilogue);
}

function wrapPluginSubcommand(commandModule) {
  const originalBuilder = commandModule.builder;
  commandModule.builder = (yargs) => {
    const builtYargs =
      typeof originalBuilder === 'function'
        ? (originalBuilder(yargs) ?? yargs)
        : yargs;
    return collapseSharedHelp(builtYargs);
  };
  return commandModule;
}

module.exports = {
  command: 'plugin <command>',
  describe: 'manage plugins',
  builder: (yargs) => {
    return collapseSharedHelp(
      yargs.commandDir('plugin', {
        visit: (commandModule) => wrapPluginSubcommand(commandModule),
      }),
    );
  },
  handler: (_argv) => {},
};
