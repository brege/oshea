// src/commands/pluginCmd.js
const listCmd = require('./plugin/listCmd');
const createCmd = require('./plugin/createCmd');
const helpCmd = require('./plugin/helpCmd');
const enableCmd = require('./plugin/enableCmd'); // New
const disableCmd = require('./plugin/disableCmd'); // New

module.exports = {
  command: 'plugin <subcommand>',
  describe: 'Manage plugins.',
  builder: (yargs) => {
    return yargs
      .command(listCmd)
      .command(createCmd)
      .command(helpCmd)
      .command(enableCmd) // Added
      .command(disableCmd) // Added
      .demandCommand(1, 'You need to specify a plugin subcommand (e.g., list, create, help, enable, disable).')
      .strict();
  },
  handler: (argv) => {
    // This handler will likely not be called directly if subcommands are correctly defined.
  }
};
